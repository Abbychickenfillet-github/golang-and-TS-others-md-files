---
title: "Session 與 JWT：有狀態 vs 無狀態驗證、過期機制、Base64url"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, backend, session, jwt, stateless, cookie, base64url, owasp]
sources:
  - https://gemini.google.com/app/9118a11b50bbd667
  - https://gemini.google.com/app/287b2caf42deb314
  - https://gemini.google.com/app/fba7a832cdf298fe
  - https://gemini.google.com/app/b2a539467cfc9322
  - https://gemini.google.com/app/5e31f473f93dbfee
  - https://gemini.google.com/app/b6db47e361e8b160
updated: 2026-11-15
---

# Session 與 JWT：有狀態 vs 無狀態驗證、過期機制、Base64url

> 本篇重點 a–u ，共 21 個。
> 前置概念見 [[1-Cookie-與-Session]]（Cookie 與 Session 基本運作）與 [[8-XSS竊取Cookie原理與Next-cookies-API-HttpOnly防線]]（HttpOnly 為何能擋 XSS）。關聯原因：本篇是把前兩篇的 Session ID 放進「有狀態／無狀態」這條主軸上比較。

## 一張主軸：四種做法比較（Session／JWT／JWS／iron-session）

互動版可以點表格上螢光（元件：`assets/compare-table.js`）。

| 比較面向 | Session-based | JWT-based（JWS 簽章版） | JWS-based（通用簽章格式） | iron-session |
| --- | --- | --- | --- | --- |
| 資料存在哪 | 伺服器的 session store | 客戶端的 token | 不規定，通常是一次性訊息 | 客戶端的 cookie |
| 客戶端拿到什麼 | 隨機 Session ID | header.payload.signature | header.payload.signature | Fe26.2 開頭的 8 段字串 |
| 伺服器怎麼驗 | 拿 ID 查表 | 重算 HMAC 或用公鑰驗，再檢查 exp | 驗簽章，claims 要自己加 | 驗 HMAC 再用 password 解密 |
| 看得到內容嗎 | 看不到 | 看得到（只有 Base64url） | 看得到 | 看不到（AES-256-CBC） |
| 防竄改靠什麼 | 資料不離開伺服器 | 簽章（HMAC 或數位簽章） | 簽章 | HMAC-SHA256 |
| 有沒有加密 | 不需要 | 沒有，要藏就用 JWE | 沒有 | 有 |
| 格式 | 隨機字串 | 3 段，全部 Base64url | 3 段，b64:false 時 payload 不編碼 | 8 段，用 * 分隔 |
| 是不是標準 | 常見做法（cookie 依 RFC 6265） | RFC 7519 | RFC 7515、RFC 7797 | 不是 RFC（hapi Iron 格式） |
| 能不能立即撤銷 | 可以 | 不行，等 exp 或黑名單 | 一次性訊息，不需要 | 不行，等 ttl |
| 大小限制 | 不受 cookie 限制 | 放 cookie 時約 4KB | 依傳輸方式 | 約 4KB，加密後更大 |
| 多台伺服器 | 要共用 store（Redis） | 有金鑰就能驗 | 有金鑰就能驗 | 共用 password 就能解 |
| 適合用在 | 傳統網站、需要即時踢人 | 跨服務 API、行動 App | API 請求簽章、webhook | 自己發自己讀的暫存資料 |
| 在 TimeLog 專案 | 還沒用（Issue #12 Phase 3） | 登入狀態 lib/jwt-session.js | 沒有用 | LINE Login、OTP、LINE Pay 暫存 |
| Node.js 套件 | express-session、connect-redis | jose（SignJWT） | jose（CompactSign） | iron-session |

- JWT 是拿 JWS 當外殼裝 claims 的用法，RFC 7797 規定 JWT 不得用 b64:false。見 [[4-jwt-signing-algorithms-and-access-refresh-flow]] 第 1 節。
- iron-session 的效果接近 JWE（藏起來＋防竄改），格式比較見 [[4-jwt-signing-algorithms-and-access-refresh-flow]] 第 5 節。

## 重點整理

**a.** <mark style="background: #ADCCFFA6;">HTTP 是無狀態（Stateless）協定</mark>：它沒有內建機制把前後兩個獨立請求關聯起來。所以網站要記住「這個人已登入」就得額外做 Session 管理。

**b.** Session 驗證流程（Abby 自己的說法，Gemini 判定正確）：
1. 使用者登入送出 credentials。
2. 伺服器 authenticate 是否 valid。
3. 伺服器建立 Session，把 Session ID 存進 session store。
4. 伺服器把 Session ID 用 Set-Cookie 發給瀏覽器。
5. 之後每個請求瀏覽器自動夾帶這個 Cookie ，伺服器拿 ID 查表確認身分。

**c.** <mark style="background: #BBFABBA6;">OWASP 的建議：架構允許時優先選集中式 Session</mark>，Session ID 放 Cookie 並設 Secure 與 HttpOnly ，搭配 SameSite（Lax 或 Strict）擋 CSRF ，並使用成熟框架而不是自己實作。

**d.** 兩種攻擊與防禦：
1. Session 劫持（Hijacking）：攻擊者用 MITM 或 XSS 偷走 Session ID。防禦是全站 HTTPS 加 HttpOnly。
2. Session 固定（Fixation）：攻擊者預先指定 Session ID 騙使用者登入。防禦是 <mark style="background: #FFF3A3A6;">每次登入都重新產生新的 Session ID 並作廢舊的</mark>。

**e.** Session 過期有兩層，缺一不可：
1. Cookie 層：省略 Expires 與 Max-Age 就是 Session Cookie ，關瀏覽器即刪（OWASP 預設建議）。設了就變 Persistent Cookie ，例如「記住我 30 天」。
2. 伺服器層：<mark style="background: #FF5582A6;">只靠前端清 Cookie 不算登出</mark> ，伺服器沒刪 Session 就等於沒收回權限。

**f.** 伺服器端三種逾期機制：閒置逾期（Idle ，例如 20 分鐘沒請求）、絕對逾期（Absolute ，例如登入後 8 小時）、更新逾期（Renewal ，定期換發新 ID 並作廢舊 ID ）。

**g.** 有狀態的優點：隨時可控（刪一筆就踢人）、機敏資料留在伺服器、請求只帶短 ID 。缺點：流量大時要共用 store ，伺服器負擔重。

**h.** 無狀態的 JWT 把狀態打包成「伺服器簽章過的物件」交給客戶端，資源伺服器驗得出簽章就不必回頭查發行端，適合分散式微服務。缺點是體積較大與難以即時作廢。

**i.** 補救 JWT 難作廢的做法：Access Token（短效期）加 Refresh Token（長效期），由 Refresh Endpoint 集中決定要不要繼續發新 Access Token 。

**j.** <mark style="background: #FFF3A3A6;">JWT 被改過 exp 無法登入</mark>：JWT 由 Header、Payload、Signature 三段組成，Signature 是伺服器用密鑰對前兩段運算出來的。你可以輕易解碼並修改 Payload（它只是 Base64url 編碼，不是加密），但改完後簽章與內容對不上；你沒有密鑰就無法重新產生正確簽章，後端驗證失敗回 401 Unauthorized 。

**k.** 後端驗證 JWT 的步驟：後端用自己的密鑰，對收到的 Header 與 Payload 重新做簽章運算，算出結果與第三段比對，不一致就拒絕。

**l.** ⚠️ 補充（Gemini 沒講）：JWT 的 Payload 「可被任何人讀」，所以不要放密碼等機敏資料。簽章保證的是「沒被改」，不是「看不到」。

**m.** URL-safe 的意思：資料編碼後只含不會破壞 URL 結構的字元。標準 URL 的保留字元（? & / =）與不安全字元（空格 + # < >）若混在資料裡，會被誤判為網址結構。

**n.** <mark style="background: #ADCCFFA6;">Base64url 與標準 Base64 的差異</mark>：
1. 把 + 換成 - 。
2. 把 / 換成 _ 。
3. 通常省略結尾補齊用的 = 。
這是 JWT 被稱為「compact, URL-safe」的原因（RFC 7519）。

![[base64用btoa去測試轉換出來的字元_2026-11-15 141442.png]]
實測：`btoa('{"')` 得到 `eyI=`。btoa＝binary to ASCII，用 Base64 把 bytes 轉成 ASCII 字元。接上更多內容後第 3 個字元才變成 `J`（`eyJ`）。

**o.** JWT 確實會出現在網址中（Email 驗證連結、密碼重設連結、OAuth／OIDC 轉址、臨時下載連結），但即使它主要放在 Authorization Header ，採用 Base64url 也讓同一套編碼能同時用在 Header 與 URL 。

> [!info] o-1. 什麼時候會用到 Base64url：token 為什麼會放進網址
> 1. **Base64url 是為了網址傳輸設計的**：token 有時要夾在網址參數裡傳遞，用 Base64url 編碼可以確保它在路由或解析時不會因為特殊字元而壞掉。
>     Base64url 是**換一套字母表**，而不是轉義：`+` 換成 `-`、`/` 換成 `_`、拿掉結尾的 `=`，編碼出來的字元都是網址可以直接出現的字元，所以放進網址時不需要再做百分比編碼。
> 2. **為什麼 token 要放在網址**：有些情境下網址是唯一能帶資料的地方。
>     - Email 驗證連結、重設密碼連結：使用者點下去時可能已經不在原本的登入狀態，或換了瀏覽器，沒有 cookie 可以帶，所以把 token 放進網址完成一次性的身分確認。
>     - OAuth／OIDC 登入跳轉：瀏覽器跳回來時只能透過網址帶資料（`?code=…&state=…`）。
>     - WebSocket、EventSource：瀏覽器原生 API 不能設 `Authorization` header。
>     - 臨時下載連結：AWS S3 presigned URL。
> 3. **重設密碼連結能放 token，靠的是「能收到這封信」，而不是「本來就有密碼」**：token 證明的是「你控制這個 email」。網址會留在瀏覽器紀錄、伺服器 log 與 `Referer` 裡，所以這類 token 要隨機且夠長、只能用一次、很快過期。很多系統用的是存在資料庫的隨機字串，不一定是 JWT。
> 4. **Instagram 分享連結**：貼文網址 `/p/短碼/` 的字元集是 `A-Z a-z 0-9 - _`，跟 Base64url 相同，一般認為是把貼文數字 ID 換算成 64 進位字元。分享時帶的 `igsh=` 是分享識別碼，Instagram 沒有公開編碼方式，「記錄了分享人」屬於推測。

**p.** ⚠️ 存疑／更正：Gemini 把「JWT 放在 URL query」講得像常態做法，沒有提到風險。Token 放在網址會進入瀏覽器歷史、伺服器 access log 與 Referer 標頭而外洩，一般建議 Access Token 放 Header 或 HttpOnly Cookie ，網址上只適合「單次、短效期」的連結。另外 OIDC 的 implicit flow（把 id_token 放在 # fragment 回傳）已不被建議，現行建議用 Authorization Code Flow 加 PKCE 。

**q.** `create session` 譯成「建立工作階段」或「建立會話」，不要譯成「創造一個對話」。session 在後端指伺服器與客戶端之間的一段互動期間，不是 ChatGPT 那種聊天 Chat。情境對照：一般網路架構譯「建立工作階段」，登入認證譯「建立登入狀態」，資料庫或網路連線譯「建立連線」。

**r.** 純 JWT 不含傳統的 Session ID。伺服器不在資料庫存狀態（Stateless），使用者身分、權限、過期時間都打包在 Header.Payload.Signature 裡，伺服器用密鑰驗簽章就能信任內容。常見混合用法：在 Payload 放 `jti`（JWT ID，token 識別碼）做黑名單，或搭配存在資料庫的 Refresh Token，此時 Refresh Token 的運作就很像 Session。

**s.** 簽 JWT 用 EdDSA 時，header 正確寫法是 `{ alg: 'EdDSA' }`，沒有 `EdDSA256` 這個名稱。ES256、ES384、ES512 帶數字，是因為 ECDSA 可搭 P-256、P-384、P-521 多種曲線；EdDSA 在 RFC 8037 預設搭 Ed25519 曲線，演算法名稱就叫 `EdDSA`。

**t.** 非對稱金鑰不是字串，也不是像 HS256 那樣直接傳 `'my-secret-key'`。流程是：PEM 文字（DER 二進位經 Base64 編碼、再加 `-----BEGIN ...-----` 頭尾）→ 用 jose 的 `importPKCS8`（私鑰）或 `importSPKI`（公鑰）轉成金鑰物件 → 交給 `.sign()` 或 `jwtVerify()`。私鑰常見格式是 PKCS#8，公鑰是 SPKI；舊版 RSA 私鑰標頭是 `BEGIN RSA PRIVATE KEY`（PKCS#1）。多行 PEM 放進 `.env` 時，換行要寫成 `\n` 或用引號包住多行。

```javascript
import { generateKeyPair, SignJWT, jwtVerify } from 'jose'

// 1. 在記憶體產生 Ed25519（EdDSA）公私鑰對
const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' })

// 2. 用私鑰簽發 JWT（protected header 的 alg 寫 'EdDSA'）
const jwt = await new SignJWT({ userId: 'user_123', role: 'engineer' })
  .setProtectedHeader({ alg: 'EdDSA' })
  .setIssuedAt()
  .setExpirationTime('2h')
  .sign(privateKey)

// 3. 用公鑰驗證，並限定只接受 EdDSA
const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['EdDSA'] })
```

**u.** ⚠️ 存疑／更正：(1) Gemini 說 `KeyLike` 可以是 JWK 物件，但 JWK 通常要先用 `importJWK` 轉成金鑰物件，且 jose 新版（v6）已移除 `KeyLike` 型別，改用 `CryptoKey`、`KeyObject`、`Uint8Array` 表示，實際型別請以你安裝版本的官方文件為準（本次未重新抓取）。(2) Gemini 示範的 PEM 內容（如 `MC4CAQAwBQYDK2VwBCIEIJ...`）是示意字串，不是可用金鑰，不能直接拿去驗證。

## 各對話來源（原文摘錄）

### Session 驗證機制（2026-10）— https://gemini.google.com/app/9118a11b50bbd667

使用者：在 session based 的驗證的話，使用者登入後會得到一個 credentials 。然後 server 去做驗證，去 authenticate 是否 valid 。然後會把這個 session ID 存在 session store ，我這樣說對嗎？

Gemini：對的，你的理解完全正確。在伺服器建立 Session 後，會將 Session ID 設定在瀏覽器的 Cookie 中，之後客戶端的後續請求都會夾帶這個 Cookie ，讓伺服器驗證身分狀態。

### Understanding Stateless HTTP（2026-10-29）— https://gemini.google.com/app/287b2caf42deb314

使用者：有狀態的做法是什麼 → 翻譯一下這一頁（使用者開著 OWASP Session management 頁面）→ session 可以設定過期時間嗎

Gemini：（重點已整合進 d～g 、 c 、 e 、 f ，包含集中式 Session 、Session 劫持與固定、三種逾期、Cookie 的 Expires 與 Max-Age 。）

### JWT 過期竄改驗證— https://gemini.google.com/app/fba7a832cdf298fe

使用者：JWT 如果過期時間被竄改過他還有辦法登入嗎

Gemini：不行。竄改 exp 會讓簽章失效，後端用密鑰重算簽章比對失敗，回 401 。（整合進 j 、 k 。）

### URL-safe 意義解析— https://gemini.google.com/app/b2a539467cfc9322

使用者：說明一下： URL-safe means → 可是 JSON Web Token 又不會出現在網址

Gemini：說明 Base64url 與標準 Base64 差異；並舉 Email 連結、OAuth／OIDC 轉址、臨時下載連結三種 JWT 出現在網址的情境。（整合進 m 、 n 、 o ，並於 p 標注存疑。）

### Create Session 翻譯解析（2026-11-15 擷取） — https://gemini.google.com/app/5e31f473f93dbfee

使用者：create session 可以翻譯成創造一個對話？→ 這邊 jwt 也是包含 session ID？（使用者開著 YouTube 影片「Session Vs JWT: The Differences You May Not Know!」）

Gemini：建議譯「建立工作階段／會話」，不是「創造一個對話」；純 JWT 無傳統 Session ID，混用時用 jti 或 Refresh Token。（整合進 q、r。）

### JWT 演算法設定（2026-11-15 擷取） — https://gemini.google.com/app/b6db47e361e8b160

使用者：setProtectedHeader 應寫 EdDSA256 還是有縮寫？cryptoKey 或 KeyLike 也是字串嗎？長怎樣、用什麼編碼？→ 示範 Ed25519 → PEM 長怎樣

Gemini：正確寫法 `alg: 'EdDSA'`；金鑰是 PEM（DER 經 Base64）轉成的物件，示範 generateKeyPair 簽發與驗證。（整合進 s、t、u，並於 u 標注存疑。）

## 練習題（LeetCode／NeetCode）

此主題為後端驗證概念，無直接對應的演算法題。相關基礎可練習雜湊表：[1. Two Sum](https://leetcode.com/problems/two-sum/) ，因為 session store 的本質就是 key（Session ID）對 value（使用者狀態）的查表。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 原始對話（6 則） | 見 frontmatter sources | 對話擷取於 2026-10-30 |
| OWASP Session Management Cheat Sheet（對話中使用者開啟並請 Gemini 翻譯的頁面） | https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | 官方持續更新，本次未重新抓取，僅依對話內容整理，請以最新版為準 |
| RFC 7519 JSON Web Token | https://www.rfc-editor.org/rfc/rfc7519 | 2015-05 發布 |
| RFC 4648 §5 Base64url | https://www.rfc-editor.org/rfc/rfc4648#section-5 | 2006-10 發布 |
| MDN Set-Cookie（Expires、Max-Age） | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie | MDN ，本次未重新抓取 |
| jose 官方文件（generateKeyPair、importPKCS8、importSPKI、金鑰型別） | https://github.com/panva/jose | 本次未重新抓取，版本差異請查你安裝版本的文件 |
| RFC 8037 EdDSA 於 JOSE | https://www.rfc-editor.org/rfc/rfc8037 | 2017-01 發布 |
