# JWT Session：從登入到驗證（next-one 逐行）

本篇重點 a–j，共 10 個
實驗日期：2026-11-05，`jose` 5.10.0，程式在 `lib/jwt-session.js`
相關筆記：[[6-next-one-jwt-session-review]]（找問題）、[[JWT_TOKEN_EXPLANATION]]、[[3-Session與JWT-有狀態與無狀態驗證-過期機制與Base64url]]、[[1-Cookie-與-Session]]、[[5-Refresh-Token與Token-Endpoint-雙Token機制與JWT關係]]

## 先看全局：一次登入到一次驗證

1. 前端 POST `/api/auth/local/login`，帶帳密
2. 伺服器驗帳密成功 → `createSession({ userId }, '3d')`
3. `encrypt` 用 `SESSION_SECRET` 簽出 JWT 字串
4. `cookieStore.set('ACCESS_TOKEN', jwt, {...})` → 回應多一行 `Set-Cookie`
5. 瀏覽器存下 cookie，之後每個同網域請求自動帶 `Cookie: ACCESS_TOKEN=...`
6. 伺服器 route 用 `cookies().get('ACCESS_TOKEN')` 取出 → `decrypt` 驗簽名與 `exp`
7. 通過 → `result.payload.userId` 就是登入者，再查 DB
8. 登出 → `deleteSession` 刪 cookie

## a. JWT 是三段 base64url，用 `.` 接起來

| 段 | 內容（實測） | 說明 |
|---|---|---|
| header | `{"alg":"HS256"}` | 簽名演算法 |
| payload | `{"userId":7,"iat":1793881987,"exp":1794141187}` | 資料 + 時間 claim |
| signature | `T8ajNS5V...` | 前兩段用 secret 做 HMAC-SHA256 |

- payload 只是 base64url 編碼，任何人可解開看。不放密碼、個資
- 簽名保證「沒被改過」，不保證「看不到」
- 函式名 `encrypt` 其實是「簽名 sign」，不是加密。`jwtVerify` 驗的也是簽名

## b. 為什麼叫 session：用 JWT 當登入狀態

| | 傳統 Session | JWT Session（本專案） |
|---|---|---|
| 狀態存哪 | 伺服器（記憶體 / Redis） | 瀏覽器 cookie 裡的 token 本身 |
| cookie 內容 | 隨機 session id | 整包簽名後的資料 |
| 驗證 | 用 id 去伺服器查 | 驗簽名 + exp，不用查 |
| 優點 | 可立刻踢人 | 伺服器無狀態，好擴展 |
| 缺點 | 要存資料、要共享 | 簽出去就收不回，只能等過期 |

## c. `createSession` 做三件事

| 步驟 | 程式 | 作用 |
|---|---|---|
| 1 | `encrypt({...payload, expiresAt}, exp)` | 簽 JWT |
| 2 | `cookies()` | 取得 Next.js 的 cookie store（Next 15 要 `await`） |
| 3 | `cookieStore.set(name, jwt, options)` | 寫入 `Set-Cookie` |

`'3d'` 實測 `exp - iat = 259200` 秒 = 3 天。

jose 的時間字串由單位決定：`s`、`m`、`h`、`d`、`w`、`y`。

## d. `encrypt` 的鏈式寫法

```js
new SignJWT(payload)                          // 要簽的資料
  .setProtectedHeader({ alg: 'HS256' })       // 寫 header
  .setIssuedAt()                              // 自動加 iat（現在秒數）
  .setExpirationTime('3d')                    // 自動加 exp（現在 + 3 天）
  .sign(encodedKey)                           // 用 secret 簽，回傳字串
```

| claim | 全名 | 單位 | 用途 |
|---|---|---|---|
| `iat` | issued at | 秒（不是毫秒） | 簽發時間 |
| `exp` | expiration | 秒 | 過期時間，`jwtVerify` 自動檢查 |
| `userId` | 自訂 | - | 登入者是誰 |

- `secret` 要先 `new TextEncoder().encode(secret)` 轉成 `Uint8Array`，jose 才收
- HS256 是對稱式：簽與驗用同一把 secret，洩漏等於任何人都能偽造

## e. cookie 選項各防什麼

| 選項 | 值 | 防什麼 |
|---|---|---|
| `httpOnly` | `true` | `document.cookie` 讀不到，XSS 偷不走 |
| `secure` | https 才 `true` | cookie 只走 HTTPS，不被中間人看到 |
| `sameSite` | `lax` | 跨站 POST / fetch / iframe 不帶 cookie，擋 CSRF |
| `expires` | 現在 + 3 天 | 瀏覽器到期自動刪 |
| `path` | `/` | 全站都帶 |

- `lax` 不是「最鬆散」，最鬆散是 `none`（需搭配 `secure`）。`lax` 仍會在跨站「點連結進來」的 GET 帶 cookie
- cookie 的 `expires` 與 JWT 的 `exp` 是兩個獨立的期限，要一致：任一邊先到期都算失效

## f. `decrypt` 驗三件事

`jwtVerify(token, key, { algorithms: ['HS256'] })`

| 驗什麼 | 失敗時 jose 錯誤碼（實測） |
|---|---|
| 簽名對不對（內容被改過） | `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` |
| `exp` 過了沒 | `ERR_JWT_EXPIRED` |
| header 的 alg 是否在白名單 | 不在白名單即拒絕（擋 `alg: none`） |

- 成功回傳 `{ payload, protectedHeader }`，所以 route 要寫 `session.payload.userId`
- 失敗在本專案被 `catch` 吃掉，回傳 `undefined`，所以 route 用 `session?.payload?.userId` 判斷

## g. 驗證的三個位置：誰負責擋

| 位置 | 目前 |
|---|---|
| middleware 集中擋 | 沒有 `middleware.js` |
| 每個 route 自己擋 | 約 20 個 route 各寫一次 `cookies().get` + `decrypt` |
| 前端頁面 | `useAuthGet()` 呼叫 `/api/auth/check` 得知登入狀態，僅作 UI 用，不是安全邊界 |

- 前端判斷登入只是為了畫面，真正的權限一定在伺服器 route 檢查
- 檢查完 `userId` 還要確認「這筆資料屬於這個 userId」，否則 A 可以改 B 的資料

## h. JWT 的本質限制

| 情境 | 結果 |
|---|---|
| 使用者按登出 | 只刪瀏覽器的 cookie，被偷走的 token 3 天內仍有效 |
| 想立刻踢人 / 改密碼後失效 | 需要黑名單或 token version（見 [[BLACKLIST_TOKEN_MANAGEMENT_GUIDE]]） |
| 想短期有效又不頻繁登入 | Access token 短命 + Refresh token（見 [[5-Refresh-Token與Token-Endpoint-雙Token機制與JWT關係]]） |
| secret 洩漏 | 全部 token 可偽造，必須換 secret（見 [[6-next-one-jwt-session-review]] P0） |

## i. 自我檢查：用了 session？JWS？是最新的嗎？

| 問題 | 答案 | 依據 |
|---|---|---|
| 有用 session 嗎 | 有，但是「無狀態的 JWT session」：登入狀態整包放在 cookie，伺服器不存任何東西 | `createSession` 只寫 cookie，沒有 DB / Redis |
| 有伺服器端 session 嗎 | `ACCESS_TOKEN` 沒有。另有 `lib/iron-session.js`，只用在 LINE 登入流程的暫存狀態（`LINE_LOGIN` cookie） | `line-login.js` 呼叫 `getSession` / `setSession` / `deleteSession` |
| 有用 JWS 嗎 | 有。`SignJWT(...).sign(key)` 產出的就是 JWS Compact Serialization（`header.payload.signature`） | 實測 header 為 `{"alg":"HS256"}` |
| 有用 JWE（加密）嗎 | 沒有。payload 是明文，只是簽名防竄改 | 沒用 `EncryptJWT` |
| 是最新 JWT 機制嗎 | JWT / JWS 沒有「新版」，規範是 RFC 7519 / RFC 7515；用的是仍在維護的 `jose`，做法與 Next.js 官方 session 範例同型。演算法 HS256 合格但屬對稱式 | 見下表 |
| `Access Token` 名實相符嗎 | 不完全。只有一顆 3 天的 token，沒有 refresh token，實際是 session token | 註解寫 Access Token，程式無 refresh 流程 |

JWT 與 JWS、JWE 的關係：

| 名詞 | 是什麼 |
|---|---|
| JWT | 「一包 claims（`userId`、`exp`…）」的資料格式 |
| JWS | 把 JWT 「簽名」的封裝方式，三段 `.` 分隔，本專案使用 |
| JWE | 把 JWT 「加密」的封裝方式，五段，本專案未用 |

現況與較新做法對照：

| 項目 | 目前 | 較新 / 較嚴謹的做法 |
|---|---|---|
| 套件 | `jose` | 同，已是現行主流 |
| 演算法 | HS256（簽與驗同一把 secret） | 只有單一服務驗證時 HS256 足夠；多服務驗證改 ES256 / EdDSA（私鑰簽、公鑰驗） |
| 演算法白名單 | 有 `algorithms: ['HS256']` | 同，這點符合 RFC 8725 建議 |
| `iss` / `aud` 驗證 | 無 | 加上並在 `jwtVerify` 驗 |
| 短命 access + refresh | 無，單顆 3 天 | 見 [[5-Refresh-Token與Token-Endpoint-雙Token機制與JWT關係]] |
| 立刻失效 | 無 | token version 或黑名單 |

未查證：「與 Next.js 官方 session 範例同型」與 RFC 8725 建議內容依記憶，未重新對照原文；iron-session 的加密細節未讀其原始碼。

## j. iron-session 與「一般 session」、JWT 的差別

實驗：`iron-session` 8.0.4，`sealData` 後得到 `Fe26.2*1*4b78...`（265 字元），無法直接讀出內容。

| | 一般 session（伺服器端） | iron-session（本專案 LINE 登入、LINE Pay、OTP 用） | JWT（本專案 `ACCESS_TOKEN`） |
|---|---|---|---|
| cookie 內容 | 隨機 session id | 整包資料「加密 + 簽名」後的字串 | 整包資料「只簽名」的字串 |
| 資料存哪 | 伺服器（記憶體 / Redis / DB） | cookie 裡 | cookie 裡 |
| 瀏覽器看得到資料嗎 | 看不到（只有 id） | 看不到（加密） | 看得到（base64url 可解碼） |
| 伺服器要存狀態嗎 | 要 | 不用 | 不用 |
| 立刻踢人 | 可以，刪伺服器那筆 | 不行，只能等 ttl | 不行，只能等 `exp` |
| 容量 | 無限制 | cookie 約 4KB 上限 | cookie 約 4KB 上限 |
| 適合放 | 任何登入狀態 | 暫存狀態（state、nonce、訂單暫存） | 登入身份（userId） |

隨機 id 不是加密：

| | 隨機 id | 加密 |
|---|---|---|
| 裡面有資料嗎 | 沒有，id 本身不含任何使用者資訊 | 有，原資料被轉成密文 |
| 能還原嗎 | 不能，沒有東西可還原 | 有金鑰就能還原成原資料 |
| 資料在哪 | 伺服器用 id 當索引去查 | 資料就在密文裡 |
| 安全靠什麼 | id 夠長夠隨機、猜不到 | 金鑰不外洩 |
| 比喻 | 衣物寄存的號碼牌 | 上鎖的行李箱 |

- 隨機 id 被偷 = 別人拿到號碼牌就能領走你的登入狀態（所以 session cookie 一樣要 `httpOnly`）
- 上表「加密後的字串」那格是 iron-session 欄，不是隨機 id 欄

- iron-session 與「一般 session」的差別：資料在 cookie 不在伺服器，所以 config 裡的註解「一般的session」不準確
- iron-session 與 JWT 的差別：iron 會加密，JWT（JWS）不會；JWT 有標準格式可交給別的服務驗證，iron 的格式只有 iron-session 自己讀得懂
- 用錯誤密碼 `unsealData` 時實測沒有丟出例外（回傳內容未檢查），所以不能靠 try/catch 判斷 cookie 有沒有被改過，要檢查取出的欄位是否存在
- 未查證：`auth/otp/generate` 存的內容只看到 import `setSession`，未逐行讀

iron-session 文件在哪：

| 資源 | 連結 |
|---|---|
| 官方文件與線上範例 | [get-iron-session.vercel.app](https://get-iron-session.vercel.app) |
| README（選項、預設值、密碼輪替） | [github.com/vvo/iron-session](https://github.com/vvo/iron-session) |
| 底層加密實作 | `@hapi/iron`，後來有 Web API 版 `iron-webcrypto`（README 的 Credits） |
| 你的版本 | 8.0.4；最新 README 已是 v9（需 Node 22.13+、ESM-only），舊 Node 用 `iron-session@8` |

- README 只寫「signed and encrypted」，沒寫具體演算法，要確切演算法得看 `iron-webcrypto` 原始碼
- 官方確認：`password` 至少 32 字元；`ttl` 預設約 14 天；cookie 的 `maxAge` 是 `ttl` 減 60 秒；`ttl: 0` 無法撤銷，不要用在登入

我有把 iron-session 和 JWT 搭配嗎：有放在同一個登入流程，但是接力，不是合成同一個 token。

| 階段 | 用什麼 | 存什麼 | 位置 |
|---|---|---|---|
| 1 登入前：產生 LINE 授權網址 | iron-session，cookie `LINE_LOGIN` | `line_login_state`、`line_login_nonce` | `lib/line-login.js` 的 `getAuthUrl` |
| 2 LINE 導回：驗證 | iron-session 取回，與網址上的 `state` 比對 | - | `callback` |
| 3 驗證完 | `deleteSession('LINE_LOGIN')` 刪除暫存 | - | `callback` |
| 4 登入成功：發登入身份 | JWT，cookie `ACCESS_TOKEN` | `userId` | `auth/line/callback` 的 `createSession` |
| 另：驗 LINE 回傳的 id_token | `jsonwebtoken`（第三套 JWT 用法，與 `jose` 不同套件） | LINE 簽的 claims | `callback` 內 `jwt.verify` |

- iron-session 管「登入過程中」的短暫狀態，JWT 管「登入之後」的身份
- 專案裡 JWT 有兩個套件：`jose`（自己簽 `ACCESS_TOKEN`）與 `jsonwebtoken`（驗 LINE 的 id_token）
- 疑點：`callback` 的 `catch` 裡寫 `Promise.reject(new Error(...))`，沒有 `throw` 或 `return`，id_token 或 nonce 驗證失敗只會 log，流程仍往下走。未實際執行驗證

專案裡 iron-session 的實際用途：

| 檔案 | 存什麼 | 該活多久 |
|---|---|---|
| `lib/line-login.js` | `LINE_LOGIN` cookie：`line_login_state`、`line_login_nonce` | 幾分鐘（登入來回而已） |
| `services/line-pay.service.js` | `LINE_PAY` cookie：`reservation` | 幾分鐘到付款完成 |
| `auth/otp/generate` | OTP 暫存 | 10 分鐘（`otp.expire`） |

`server.config.js` 要改的地方：

| 順序 | 問題 | 改法 |
|---|---|---|
| 1 | `ironSession.password`、`jwt.secret`、`otp.secret` 明碼寫在 public repo | 三組全部換新，放環境變數（`process.env.XXX`），沒設就 throw；舊值視為已外洩 |
| 2 | `ttl` 與 `cookieOptions` 設了但沒生效：`lib/iron-session.js` 呼叫 `getIronSession` 只傳 `password` 與 `cookieName`，全專案搜不到 `ironSession.ttl` 或 `cookieOptions` 的使用 | 把 `ttl`、`cookieOptions` 傳進去，或刪掉設定避免誤以為 7 天 |
| 3 | 實際生效的是套件預設：ttl 14 天、`secure: true`、`httpOnly`、`sameSite: 'lax'`、`path: '/'` | 暫存狀態改短，例如 `ttl: 600`（10 分鐘） |
| 4 | 註解寫「一般的session」 | 改成「iron-session（加密 cookie，無伺服器狀態）」 |
| 5 | `getSession` / `setSession` 的 `catch` 直接 `return null`，密碼太短（少於 32 字元）也靜默失敗 | 至少在 `catch` 裡記 log |
| 6 | `.env.example` 的 `SESSION_SECRET` 填了真實值 | 改成佔位字串 |
| 7 | 三個密鑰共用同一份強度規則 | 各自獨立產生，不可共用；iron-session 的 `password` 至少 32 字元（實測 `short` 會報錯） |

- 換 `ironSession.password` 的影響：進行中的 LINE 登入與付款流程會失敗，使用者重試即可，不影響 `ACCESS_TOKEN`
- 換 `jwt.secret` 的影響：所有人的 `ACCESS_TOKEN` 失效，需重新登入
- iron-session 支援密碼輪替：`password` 可傳 `{ 2: '新的', 1: '舊的' }`，數字最大的用來加密新 cookie，舊 cookie 仍可解開（README 確認，未實測）

## 自我測驗

1. 為什麼 payload 不能放密碼？
2. `exp` 單位是秒還是毫秒？
3. `httpOnly` 防的是 XSS 還是 CSRF？`sameSite` 呢？
4. 使用者登出後，舊 token 還能用嗎？為什麼？
5. 只把 cookie 的 `expires` 延長，JWT 能續命嗎？（提示：`updateSession` 的問題）

答案：1 任何人可解碼 payload；2 秒；3 httpOnly→XSS，sameSite→CSRF；4 能，到 `exp` 前簽名仍有效，只是瀏覽器沒帶；5 不能，`exp` 在 token 內，要重簽新 token。

## 資料來源（含查證時間）

| 主題 | 來源 | 查證 |
|---|---|---|
| 簽發、驗證、錯誤碼、`exp - iat` | 本機執行 `jose` 5.10.0 | 2026-11-05 |
| 專案流程 | `lib/jwt-session.js`、`auth/local/login`、`auth/check` | 2026-11-05 |
| iron-session 選項、預設值、密碼輪替、文件位置 | [github.com/vvo/iron-session](https://github.com/vvo/iron-session)（README 現為 v9） | 2026-11-06 查證 |
| iron-session 預設 ttl 14 天、cookie 預設值 | 本機 `node_modules/iron-session` 8.0.4 原始碼 | 2026-11-05 |
| LINE 登入與 iron / JWT 接力 | `lib/line-login.js`、`auth/line/callback` | 2026-11-06 |

未查證：`sameSite=lax` 跨站行為依瀏覽器預設規範記憶，未對照 MDN 最新版。
