# 在 next-one 加入 Refresh Token

本篇重點：步驟 1–7，重點 a–f，共 6 個
設計日期：2026-11-05，只是設計與範例程式，尚未寫進專案
相關筆記：[[jwt-session-login-to-verify-walkthrough]]、[[5-Refresh-Token與Token-Endpoint-雙Token機制與JWT關係]]、[[6-next-one-jwt-session-review]]、[[BLACKLIST_TOKEN_MANAGEMENT_GUIDE]]

## a. 要改成什麼樣

| | 現在 | 加入後 |
|---|---|---|
| `ACCESS_TOKEN` | JWT，3 天 | JWT，15 分鐘 |
| `REFRESH_TOKEN` | 無 | 隨機字串（不是 JWT），30 天，DB 只存雜湊 |
| 過期後 | 重新登入 | 前端打 `/api/auth/refresh` 換新，不用重新登入 |
| 登出 | 只刪 cookie | 刪 cookie + DB 撤銷 refresh token |
| 被偷的 token | 3 天內有效 | access 最多 15 分鐘；refresh 被重用時整組作廢 |

## b. 為什麼 refresh token 用隨機字串、存 DB

| 項目 | access token | refresh token |
|---|---|---|
| 形式 | JWT（JWS，簽名） | 32 bytes 隨機字串 |
| 驗證方式 | 驗簽名 + `exp`，不查 DB | 雜湊後查 DB |
| 存在哪 | cookie `ACCESS_TOKEN` | cookie `REFRESH_TOKEN` + DB 一筆（只存 sha256 雜湊） |
| 可否立刻撤銷 | 不行，等過期 | 可以，改 DB 的 `revokedAt` |
| DB 外洩時 | 無影響 | 只有雜湊，拿不到可用的 token |

- 現有 `User.refreshToken`、`iat`、`exp` 欄位，程式裡只有 `schema.prisma` 出現，沒被使用
- 不要沿用：單一欄位只能記一個裝置，換裝置登入會踢掉前一個，而且是明文
- 另開 `RefreshToken` 資料表，一個使用者可有多筆（多裝置）

## 步驟 1：Prisma 資料表

```prisma
model RefreshToken {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  tokenHash  String    @unique @map("token_hash")
  familyId   String    @map("family_id") @db.Uuid
  expiresAt  DateTime  @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  userAgent  String?   @map("user_agent")
  createdAt  DateTime  @default(now()) @map("created_at")
  user       User      @relation(fields: [userId], references: [user_id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
}
```

- `User` 模型加一行 `refreshTokens RefreshToken[]`
- `familyId`：同一次登入換出來的整串 token 共用，偵測到盜用時整組作廢
- 執行 `npx prisma migrate dev --name add-refresh-token`

## 步驟 2：發行與撤銷（新檔 `lib/refresh-token.js`）

```js
import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export const REFRESH_COOKIE = 'REFRESH_TOKEN'
const REFRESH_DAYS = 30

export const hashToken = (t) =>
  crypto.createHash('sha256').update(t).digest('hex')

// 發行：產生隨機字串 → 存雜湊進 DB → 明文寫進 cookie
export async function issueRefreshToken(userId, { familyId, userAgent } = {}) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      familyId: familyId ?? crypto.randomUUID(),
      expiresAt,
      userAgent,
    },
  })

  ;(await cookies()).set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api', // 只有打 API 才帶，頁面導覽不帶
    expires: expiresAt,
  })
}

// 登出：撤銷這顆 + 刪 cookie
export async function revokeRefreshToken() {
  const cookieStore = await cookies()
  const token = cookieStore.get(REFRESH_COOKIE)?.value
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  cookieStore.set(REFRESH_COOKIE, '', { path: '/api', maxAge: 0 })
}
```

## 步驟 3：換發 API（新檔 `app/(api)/api/auth/refresh/route.js`）

```js
import { NextResponse as res } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { createSession } from '@/lib/jwt-session'
import { REFRESH_COOKIE, hashToken, issueRefreshToken } from '@/lib/refresh-token'

const fail = (message) => res.json({ status: 'error', message }, { status: 401 })

export async function POST() {
  const token = (await cookies()).get(REFRESH_COOKIE)?.value
  if (!token) return fail('沒有 refresh token')

  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })
  if (!row || row.expiresAt < new Date()) return fail('refresh token 無效或過期')

  // 已被用過的 token 又出現 = 可能被偷，整個 family 作廢
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: row.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return fail('refresh token 已被使用，請重新登入')
  }

  // 原子撤銷舊的：兩個請求同時進來，只有一個 count 會是 1
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: row.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (count !== 1) return fail('refresh token 已被使用')

  await createSession({ userId: row.userId }, '15m', 'ACCESS_TOKEN')
  await issueRefreshToken(row.userId, { familyId: row.familyId })
  return res.json({ status: 'success' })
}
```

- 這支用 `POST`，加上 `sameSite: 'lax'`，跨站請求不會帶 cookie，不需要另外的 CSRF token
- 這支要走 Node runtime（用到 Prisma），不要放進 Edge middleware

## 步驟 4：登入改成同時發兩顆

3 個登入 route 目前都是 `createSession(payload, '3d', 'ACCESS_TOKEN')`：
`auth/local/login`、`auth/google/login`、`auth/line/callback`

```js
// lib/auth-session.js（新檔，三個登入 route 共用）
import { createSession } from '@/lib/jwt-session'
import { issueRefreshToken } from '@/lib/refresh-token'

export async function startLoginSession(userId, userAgent) {
  await createSession({ userId }, '15m', 'ACCESS_TOKEN')
  await issueRefreshToken(userId, { userAgent })
}
```

- 三個 route 的那一行換成 `await startLoginSession(userId, request.headers.get('user-agent'))`

## 步驟 5：登出改成同時撤銷

4 個登出 route 目前只呼叫 `deleteSession('ACCESS_TOKEN')`：
`auth/local/logout`、`auth/line/logout`、`logout`（兩處以上）

- 每處 `deleteSession` 後面加 `await revokeRefreshToken()`

## 步驟 6：讓後端真的回 401（容易漏）

| 現況 | 問題 |
|---|---|
| `errorResponse(res, error, status = 200)` 預設狀態碼是 200 | 授權失敗也回 HTTP 200 |
| `fetcher` 只做 `res.json()`，不看 `res.status` | 前端分不出「沒登入」與「成功」 |

- `auth/check` 的授權失敗那行改成 `errorResponse(res, error, 401)`
- 其他需要登入的 route 同理，授權失敗回 401，找不到資料才用其他狀態碼

## 步驟 7：前端攔 401 → 換發 → 重打（`services/rest-client/use-fetcher.js`）

```js
// 同一時間只打一次 refresh，避免多個請求同時用同一顆 refresh token
let refreshing = null
const refreshOnce = () =>
  (refreshing ??= fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then((r) => r.ok)
    .finally(() => {
      refreshing = null
    }))

export const fetcher = async (url) => {
  const doFetch = () =>
    fetch(url, {
      credentials: 'include',
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })

  let response = await doFetch()
  if (response.status === 401 && (await refreshOnce())) {
    response = await doFetch()
  }
  return response.json()
}
```

- `mutateFetcher` 的 `fetch(...)` 同樣包一層：401 → `refreshOnce()` → 重打一次
- refresh 自己回 401 就不要再重試，直接當作未登入

## c. 整個流程

1. 登入 → 發 `ACCESS_TOKEN`（15 分）+ `REFRESH_TOKEN`（30 天）
2. 15 分鐘內：請求只驗 access JWT，不查 DB
3. access 過期，瀏覽器刪掉該 cookie → 請求回 401
4. 前端自動打 `POST /api/auth/refresh`
5. 後端：雜湊 → 查 DB → 撤銷舊的 → 發新 access + 新 refresh（輪替）
6. 前端重打原本的請求，使用者無感
7. refresh 也過期或被撤銷 → 回 401 → 導向登入頁

## d. 輪替與盜用偵測

| 情境 | 結果 |
|---|---|
| 正常使用 | 每次 refresh 都換新的，舊的標 `revokedAt` |
| 攻擊者拿舊 token 來換 | 該 token 已 `revokedAt`，視為重用，整個 family 作廢，兩邊都被登出 |
| 兩個分頁同時 refresh | 第二個會被誤判為重用。同一分頁已用 `refreshOnce` 擋住；跨分頁需要寬限期 |

- 寬限期做法：重用發生在撤銷後 10 秒內不整組作廢，只回 401 讓前端重打 `/api/auth/check`
- 沒做寬限期的後果：偶爾被登出，但不影響安全性

## e. 設定值怎麼選

| 項目 | 建議 | 理由 |
|---|---|---|
| access 壽命 | 5–15 分鐘 | 被偷的最大傷害時間 |
| refresh 壽命 | 7–30 天 | 使用者多久不來才需重新登入 |
| 輪替 | 每次 refresh 都換 | 才能偵測盜用 |
| 清理 | 排程刪 `expiresAt` 已過的列 | 專案已有 cron（commit `crons`），可加一支 |

## f. 實作順序與影響範圍

| 順序 | 動作 | 風險 |
|---|---|---|
| 1 | migration + `lib/refresh-token.js` | 低，不影響現有登入 |
| 2 | `refresh` route | 低 |
| 3 | 前端 fetcher 加 401 處理 + 後端回 401 | 中，先確認沒有程式依賴「授權失敗也是 200」 |
| 4 | 登入 3 處、登出 4 處切換 | 中，切換後 access 變 15 分鐘 |
| 5 | 部署時機 | 現有使用者的 3 天 token 到期前仍可用，到期後需登入一次取得 refresh token |

- 只想先拉短 access 壽命而不做 DB：不可行，沒有 refresh 使用者每 15 分鐘就要重登
- 想要更簡單：refresh 也用 JWT（不查 DB），但無法撤銷，等於把 3 天換成 30 天，不建議

未查證：輪替與重用偵測的做法依 OAuth 2.0 安全最佳實務（RFC 9700）的記憶整理，未重新對照原文；範例程式未在專案實際執行；`auth/line/logout`、`logout` 的完整分支未逐行讀。
