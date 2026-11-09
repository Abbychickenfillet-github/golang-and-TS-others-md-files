# next-one JWT Session 審查（lib/jwt-session.js）

審查日期：2026-10-30
相關筆記：[[JWT_TOKEN_EXPLANATION]]、[[3-Session與JWT-有狀態與無狀態驗證-過期機制與Base64url]]、[[1-Cookie-與-Session]]

## 做對的

| 項目 | 說明 |
|---|---|
| 套件 | `jose`，維護中，Edge runtime 也能跑 |
| 驗證 | `jwtVerify` 明確指定 `algorithms: ['HS256']`，擋掉 `alg: none` 與演算法混淆 |
| Cookie | `httpOnly`，JS 讀不到，擋 XSS 偷 token |
| 隔離 | `import 'server-only'`，不會被打包進前端 |
| 期限 | 登入 3 天，有 `iat` 與 `exp` |
| 金鑰強度 | base64 32 bytes，長度足夠 |

## 問題（依嚴重度）

### P0：secret 寫死在 public repo

- `config/server.config.js` 的 `jwt.secret` 是明碼字串
- repo 是 PUBLIC，secret 從初始 commit `d6c6c8f` 就在 git history
- `.env.example` 的 `SESSION_SECRET` 填了同一組值
- 任何人可偽造 `{ userId: 任意數字 }` 的 token，直接冒充任何使用者
- 同檔案的 `ironSession.password`、`otp.secret` 也是明碼，一併外洩
- 刪檔或改 history 不能讓外洩的值恢復安全，只能換新值

處理順序：
1. 產生新 secret：`openssl rand -base64 32`
2. 放環境變數（Vercel / Zeabur / `.env.local`），程式讀 `process.env.JWT_SECRET`
3. 沒設就直接 throw，不要 fallback 到預設值
4. 舊值全部視為作廢（jwt、iron、otp 三組）
5. `.env.example` 只放佔位字串
6. 換 secret 後所有人的 token 失效，需重新登入

### P1：`updateSession` 不但沒用還有害

- 專案內沒有任何地方呼叫（只有定義）
- 只延長 cookie 的 `expires`，JWT 內的 `exp` 不變，token 到期照樣驗證失敗
- `secure: false` 寫死，與 `createSession` 不一致
- 建議：刪除；要滑動過期就重新簽一顆新 token

### P1：`secure` 判斷依賴 `NEXT_PUBLIC_BASE_URL`

- 該變數沒設或設錯，正式環境 cookie 會是 `secure: false`
- 改用 `process.env.NODE_ENV === 'production'`（`ironSession` 已用 `env !== 'development'`）

### P2：細節

| 項目 | 現況 | 建議 |
|---|---|---|
| 過期時間 | `createSession` 自己用 switch 換算一次，`encrypt` 又交給 jose 解析一次，兩套邏輯 | 簽完用 `decodeJwt(session).exp` 算 cookie `expires` |
| payload | 塞 `expiresAt`（Date），與 `exp` 重複 | 移除 |
| `decrypt` | 沒帶 cookie 也 `console.log('Failed to verify session')`，log 會很吵 | 先判斷 `if (!session) return null`，只在驗證失敗時記錄 |
| 回傳值 | 失敗回 `undefined`，成功回整包 `{ payload, protectedHeader }` | 統一回 payload 或 `null` |
| claims | 沒有 `iss` / `aud` | 加上，`jwtVerify` 一併驗證 |
| 註解 | `sameSite: 'lax'` 寫「最鬆散」，實際最鬆散是 `none` | 改註解 |
| 重複程式 | 約 20 個 route 各自 `cookies().get` + `decrypt` | 抽 `getSessionUserId()` helper |
| middleware | 專案沒有 `middleware.js`，保護邏輯分散在各 route | 視需求集中 |

### 無法避免的限制（JWT 本質）

- 登出只刪 cookie，被偷的 token 在 3 天內仍有效
- 要能立刻失效需黑名單或 token version（見 [[BLACKLIST_TOKEN_MANAGEMENT_GUIDE]]）

## 建議的 createSession 結構

```js
export async function createSession(payload, exp = '3d', cookieName = 'ACCESS_TOKEN') {
  const session = await encrypt(payload, exp)
  const { exp: expSec } = decodeJwt(session)
  const cookieStore = await cookies()

  cookieStore.set(cookieName, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expSec * 1000),
    path: '/',
  })
}
```

## 查證範圍

- 已讀：`lib/jwt-session.js`、`config/server.config.js`、`auth/check`、`auth/local/login`、`updateSession` 全專案搜尋、git history
- 未查證：`auth/google`、`auth/line` 登入路由的 cookie 設定、各 route 是否都有檢查 `userId` 歸屬
