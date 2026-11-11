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
updated: 2026-10-30
---

# Session 與 JWT：有狀態 vs 無狀態驗證、過期機制、Base64url

> 本篇重點 a–p ，共 16 個。
> 前置概念見 [[1-Cookie-與-Session]]（Cookie 與 Session 基本運作）與 [[8-XSS竊取Cookie原理與Next-cookies-API-HttpOnly防線]]（HttpOnly 為何能擋 XSS）。關聯原因：本篇是把前兩篇的 Session ID 放進「有狀態／無狀態」這條主軸上比較。

## 一張主軸：有狀態（Session）vs 無狀態（JWT）

| 比較面向 | 有狀態：集中式 Session | 無狀態：JWT（JSON Web Token） |
| --- | --- | --- |
| 狀態存在哪 | 伺服器（記憶體／Redis／MySQL）的 session store | 客戶端手上的 Token 本身 |
| 客戶端拿到什麼 | 一個短短的 Session ID（通常放 Cookie） | 一包 Header.Payload.Signature |
| 伺服器怎麼驗 | 拿 Session ID 去 session store 查表 | 用密鑰重算簽章再比對 |
| 要強制踢人 | 刪掉該筆 Session 即時失效 | 很難即時作廢（Revocation） |
| 擴展性 | 多台伺服器要共用 store（例如 Redis Cluster） | 資源伺服器只要能驗簽章就不必共用 store |

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

**o.** JWT 確實會出現在網址中（Email 驗證連結、密碼重設連結、OAuth／OIDC 轉址、臨時下載連結），但即使它主要放在 Authorization Header ，採用 Base64url 也讓同一套編碼能同時用在 Header 與 URL 。

**p.** ⚠️ 存疑／更正：Gemini 把「JWT 放在 URL query」講得像常態做法，沒有提到風險。Token 放在網址會進入瀏覽器歷史、伺服器 access log 與 Referer 標頭而外洩，一般建議 Access Token 放 Header 或 HttpOnly Cookie ，網址上只適合「單次、短效期」的連結。另外 OIDC 的 implicit flow（把 id_token 放在 # fragment 回傳）已不被建議，現行建議用 Authorization Code Flow 加 PKCE 。

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

## 練習題（LeetCode／NeetCode）

此主題為後端驗證概念，無直接對應的演算法題。相關基礎可練習雜湊表：[1. Two Sum](https://leetcode.com/problems/two-sum/) ，因為 session store 的本質就是 key（Session ID）對 value（使用者狀態）的查表。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 原始對話（4 則） | 見 frontmatter sources | 對話擷取於 2026-10-30 |
| OWASP Session Management Cheat Sheet（對話中使用者開啟並請 Gemini 翻譯的頁面） | https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | 官方持續更新，本次未重新抓取，僅依對話內容整理，請以最新版為準 |
| RFC 7519 JSON Web Token | https://www.rfc-editor.org/rfc/rfc7519 | 2015-05 發布 |
| RFC 4648 §5 Base64url | https://www.rfc-editor.org/rfc/rfc4648#section-5 | 2006-10 發布 |
| MDN Set-Cookie（Expires、Max-Age） | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie | MDN ，本次未重新抓取 |
