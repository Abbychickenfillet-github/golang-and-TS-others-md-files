---
title: Refresh Token 與 Token Endpoint — 雙 Token 機制與 JWT 的關係
type: topic-note
source: Gemini
tags: [gemini, backend, auth, jwt, refresh-token, oauth, 資安]
sources:
  - https://gemini.google.com/app/43646f99d7215cb6
updated: 2026-08-27
---

# Refresh Token 與 Token Endpoint — 雙 Token 機制與 JWT 的關係

本篇重點 a–l，共 12 個

## 重點整理

### 一、兩個名詞根本是不同種類的東西

a. <mark style="background: #FF5582;">最容易混淆的點</mark>：Refresh Token 是「一串資料」，Token Endpoint 是「一個網址」。它們的關係像<mark style="background: #FFF3A3;">鑰匙與門</mark>，或是<mark style="background: #FFF3A3;">會員卡與櫃檯窗口</mark>：你把會員卡（Refresh Token）交給櫃檯（Token Endpoint），換取今日入場券（新的 Access Token）。

b. <mark style="background: #ADCCFF;">Refresh Token（更新憑證）</mark>：性質是憑證字串。作用是當 Access Token 過期時，前端拿它向伺服器證明「我已經登入過了，請發給我新的 Access Token」。效期較長（例如 7 天或 30 天），儲存在前端的 HttpOnly Cookie 或安全儲存區。

c. <mark style="background: #ADCCFF;">Token Endpoint（權杖端點）</mark>：性質是伺服器提供的一個 API 網址，例如 `/api/auth/refresh`、`/api/v1/auth/refresh` 或 OAuth 標準的 `/oauth/token`。它是負責處理 token 交換或核發的「窗口」。

| 項目 | Refresh Token | Token Endpoint |
| --- | --- | --- |
| 是什麼 | 憑證（資料） | API 網址（服務入口） |
| 扮演角色 | 證明身分的長期通行證 | 處理與核發 token 的伺服器接口 |
| 口語比喻 | 會員卡／身分證 | 櫃檯窗口 |

### 二、實際的 HTTP 長相

d. 前端發送請求給 Token Endpoint：

```http
POST /api/auth/refresh HTTP/1.1
Host: example.com
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1Ni..."
}
```

<mark style="background: #BBFABB;">更安全的做法是把 Refresh Token 放在 HttpOnly Cookie 中發送</mark>，讓 JavaScript 讀不到它，可以擋掉 XSS 竊取。

e. Token Endpoint（後端）驗證並回應：

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1Ni...(新的短效 Token)",
  "expires_in": 900
}
```

`expires_in: 900` 的單位是秒，代表這張新的 Access Token 只有 15 分鐘壽命。

### 三、無感更新（Silent Refresh）流程

f. <mark style="background: #FFF3A3;">標準的自動更新五步驟</mark>：
   1. Access Token 過期，前端發 API 請求收到 <mark style="background: #FFB8EB;">401 Unauthorized</mark>。
   2. 前端攔截器（例如 Axios Interceptor）自動捕捉這個錯誤。
   3. 攔截器在背景帶著 Refresh Token 打 Token Endpoint。
   4. 後端驗證 Refresh Token 沒問題，發回新的 Access Token。
   5. 前端拿到新 token 後「重試」剛剛失敗的那個請求。使用者完全不會感覺到過期，也不必重新輸入帳密。

### 四、為什麼不乾脆把 Access Token 效期設長一點

g. 這是<mark style="background: #ADCCFF;">安全性與使用者體驗的權衡（Trade-off）</mark>。只用長期 Access Token 的話，一旦 token 被竊取，攻擊者可以長時間冒充使用者，而且 JWT 是無狀態的、後端很難主動撤銷。

h. 雙 Token 機制的兩個好處：
   - Access Token 效期短（15 分鐘到 1 小時），被攔截的危害有限。
   - Refresh Token 只在更新時才送出（頻率低），曝露風險小；而且伺服器可以在資料庫記錄它的狀態（黑名單／停用），需要時能強制使用者登出。

### 五、JWT 有沒有內建 Refresh Token（Abby 的專案疑問）

i. <mark style="background: #FF5582;">沒有</mark>。<mark style="background: #ADCCFF;">JWT（JSON Web Token）</mark>只是一個「資料格式標準」（RFC 7519），它定義如何把資料包成經過簽章的字串，並沒有規定你的系統必須有什麼登入邏輯。<mark style="background: #FFF3A3;">JWT ≠ Refresh Token，JWT 只是裝 token 資料的容器</mark>。

j. <mark style="background: #BBFABB;">如果專案只實作「登入給一串 JWT，之後每個請求都帶這串 JWT」，那就是標準的單一 JWT 架構，沒有漏掉任何隱藏功能</mark>。很多輕量專案、內部系統或 MVP 都這樣做：登入後核發一串 JWT 當 Access Token、把 `exp` 設很長（7 天、30 天）、前端存進 localStorage、每次請求帶在 Header。缺點是 token 被竊取時在過期前無法主動撤銷。

k. <mark style="background: #BBFABB;">怎麼檢查自己的專案到底有沒有 Refresh Token</mark>（三個檢查點）：
   1. 把 token 貼到 jwt.io 解開 Payload，如果只有 `sub`、`iat`、`exp` 等基本欄位、沒有 `type: "access"` 之類的標示，通常是單一 token。
   2. 搜尋後端路由有沒有 `/auth/refresh`、`/token/refresh` 這類端點；完全沒有就代表沒有這個機制。
   3. 打開 DevTools 的 Application 頁籤，看登入後是拿到一個還是兩個 token（雙 token 通常一個在 localStorage、一個在 HttpOnly Cookie）。

l. <mark style="background: #D2B3FF;">面試可延伸的一句話</mark>：Refresh Token 需要開發者額外設計「儲存機制、發放邏輯、驗證與黑名單控制」四件事，這也是為什麼很多小專案選擇先不做。

## 關聯筆記（附關聯原因）

- [[JWT_TOKEN_EXPLANATION]] — 那篇講 JWT 的結構（Header、Payload、Signature）與簽章原理，本篇 (i) 正好接著回答「這個結構裡有沒有內建更新機制」。
- [[BLACKLIST_TOKEN_MANAGEMENT_GUIDE]] — 本篇 (h) 提到伺服器可以用黑名單強制登出，那篇就是這件事的實作細節。
- [[LOGOUT_AND_LOGIN_EXPLANATION]] — 登出流程要不要一併作廢 Refresh Token，是本篇雙 token 機制的直接後果。
- [[OAuth與RESTful-Firebase登入-彈窗vs重定向]] — OAuth 標準的 `/oauth/token` 就是本篇 (c) 說的 Token Endpoint，那篇是同一個端點在第三方登入情境下的用法。
- [[Cookie-與-Session]] — 本篇 (d) 建議把 Refresh Token 放 HttpOnly Cookie，那篇解釋 Cookie 的屬性與 Session 的差別。

## 各對話來源（原文）

### Refresh Token 與 Token Endpoint 差異（2026-08-27）— https://gemini.google.com/app/43646f99d7215cb6

使用者：Refresh token、token endpoint 差在哪

Gemini：這兩者的關係就像是「鑰匙」與「門／窗口」的差別。1. Refresh Token（憑證／鑰匙）：性質是一串資料／憑證字串（Token）；作用是當 Access Token 過期時，前端可以使用這把 Refresh Token 向伺服器證明「我已經登入過了，請發給我新的 Access Token」；通常效期較長（例如 7 天或 30 天），並且儲存在前端（如 HttpOnly Cookie 或安全儲存區）。2. Token Endpoint（API 端點／服務窗口）：性質是伺服器提供的一個 API 網址（Endpoint），例如 `/api/v1/auth/refresh` 或 `/oauth/token`；這是負責處理 Token 交換或核發的「窗口」；前端發送 HTTP POST 請求到這個 Token Endpoint，並在請求內容中帶著 Refresh Token，伺服器驗證無誤後回傳新的 Access Token。口語比喻：Refresh Token 是你的會員卡／身分證，Token Endpoint 是櫃檯窗口。

使用者：所以通常會用 refresh token 更新 Access Token 嗎？

Gemini：是的，完全正確，這正是 Refresh Token 最主要的設計目的與核心用途。Access Token 的特點：效期短（15 分鐘到 1 小時）；為了安全，如果被盜，攻擊者能使用的時間非常有限；用於請求一般 API 資源。自動無感更新流程：當 Access Token 過期時，前端發送 API 請求會收到 401 Unauthorized 錯誤；前端攔截器（例如 Axios Interceptor）會自動捕捉這個錯誤，並在背景帶著 Refresh Token 發送請求到 Token Endpoint；後端驗證 Refresh Token 沒問題後，會發回一個新的 Access Token；前端拿到新 Access Token 後，重試剛剛失敗的請求；使用者完全不會感覺到過期。那為什麼不直接把 Access Token 效期設長一點？這是一種安全性與使用者體驗之間的權衡：如果只用長期 Access Token，只要 Token 被竊取，攻擊者就可以在很長一段時間內冒充使用者，且後端很難主動撤銷該 JWT；雙 Token 機制下，Access Token 效期短、被攔截危害較小，Refresh Token 只在更新 Token 時才發送（頻率低），減少曝露風險，且伺服器可以在資料庫記錄 Refresh Token 的狀態（如黑名單／禁用），需要時能隨時強制使用者登出。

使用者：當 Access Token 過期時，前端可以使用這把 Refresh Token 向伺服器（也就是 token endpoint？）證明「我已經登入過了，請發給我新的 Access Token」

Gemini：完全正確，你的理解非常精準。把角色標記出來：「這把 Refresh Token」＝帶在請求內容裡的資料／憑證；「向伺服器（也就是 Token Endpoint）」＝接收請求的特定 API 網址（例如 `/api/auth/refresh`）；「證明我已經登入過了，請發給我新的 Access Token」＝這個 API 請求的目的與動作。一個標準的 HTTP 請求範例：前端發送 `POST /api/auth/refresh HTTP/1.1`，Content-Type 為 application/json，body 帶 `{"refresh_token": "eyJhbGciOiJIUzI1Ni..."}`（註：Refresh Token 也常放在 HttpOnly Cookie 中發送，更為安全）。Token Endpoint（後端）驗證並回應 `HTTP/1.1 200 OK`，body 為 `{"access_token": "...(新的短效 Token)", "expires_in": 900}`。拿到新的 Access Token 後，前端就可以繼續用它去呼叫其他業務 API。

使用者：JWT 有內建 refresh token 嗎？像我就只有用 access token，會不會其實 refresh token 在我的專案內是有的，重點是我不知道

Gemini：沒有，JWT 規範本身並沒有「內建」或「自動附帶」Refresh Token。JWT（JSON Web Token）只是一個資料格式的標準（RFC 7519），它定義了如何把數據包裝成加密／簽名的字串，但並沒有規定你的系統必須包含什麼邏輯。如果你在專案中只實作了「登入給一串 JWT，之後每個請求都帶這串 JWT」，那麼你的專案很大概率真的沒有 Refresh Token。在許多輕量專案、內部系統或早期 MVP 中，為了簡化架構，開發者常採用單一 JWT 模式：登入後後端核發一串 JWT（作為 Access Token）；將這串 JWT 的效期（exp）設得很長；前端拿到後存進 localStorage，每次 Request 帶在 Header 發送。這種做法完全不需要 Refresh Token 就能運作，但缺點是如果 Token 被竊取，在過期前無法主動撤銷。如何檢查你的專案到底有沒有 Refresh Token：（1）把你的 Token 貼到 jwt.io 解析，查看欄位，如果裡面只有 sub、iat、exp 等基本資訊，沒有標示 type: "access"，通常代表它是單一 Token；（2）查看後端路由（Router），搜尋有沒有 `/auth/refresh`、`/token/refresh` 或類似的 Endpoint；（3）開啟瀏覽器 DevTools 的 Application 頁籤，看看登入後是不是只拿到一個 Token。總結：JWT 不等於 Refresh Token；Refresh Token 需要開發者額外設計；如果專案目前運作正常且只有單一 Token，那就是標準的單 JWT 架構，你並沒有漏掉或忽視什麼隱藏功能。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/43646f99d7215cb6 | 2026-08-27 擷取 |
| RFC 7519 — JSON Web Token (JWT) | https://datatracker.ietf.org/doc/html/rfc7519 | 2015-05 發布，2026-08-27 查證 |
| RFC 6749 — OAuth 2.0 Authorization Framework（第 6 節 Refreshing an Access Token、第 3.2 節 Token Endpoint） | https://datatracker.ietf.org/doc/html/rfc6749#section-6 | 2012-10 發布，2026-08-27 查證 |
| OWASP — JSON Web Token for Java Cheat Sheet（token 撤銷與黑名單建議） | https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html | 2026-08-27 查證 |
| MDN — Set-Cookie 的 HttpOnly 屬性 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie | 2026-08-27 查證 |
