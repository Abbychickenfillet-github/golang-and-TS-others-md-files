---
title: Cookie 與 Session(Web 身分驗證與狀態管理)
type: 2026-06-01T00:00:00
source: Gemini
tags:
  - gemini
  - web
  - cookie
  - session
  - auth
  - http
  - express
sources:
  - https://gemini.google.com/app/cc5b875ac137a823
updated: 2026-06-10
---

# Cookie 與 Session

## 重點整理

**為什麼需要 Cookie / Session?** 
因為HTTP 協定本身是**無狀態的(Stateless)**——伺服器不記得你是誰。
為了維持登入狀態,才需要 Cookie 和 Session。

**Cookie(客戶端儲存)**
- 一小段文字資料,由伺服器發送、儲存在使用者瀏覽器中。
- 瀏覽器在<mark style="background: #D2B3FFA6;">後續</mark><mark style="background: #FFF3A3A6;">每次請求</mark>會<mark style="background: #FFB86CA6;">自動</mark><mark style="background: #FF5582A6;">把 Cookie 帶回給伺服器(放在請求標頭)</mark>。
- 特點:存在使用者端,**容易被竄改或竊取,不適合放敏感資料**。
- 運作流程:登入後伺服器發 `Set-Cookie` → 瀏覽器寫入本地 → 之後每次請求標頭都帶上 Cookie。

**Session(伺服器端儲存)**
- 資料存在**伺服器端**(記憶體或資料庫)。
- 伺服器給使用者一張「身分證」`session_id`,這個 ID 透過 Cookie 傳給瀏覽器。
- 下次請求帶上 `session_id`,伺服器比對後就能識別使用者狀態。
- 特點:**安全性較高**,因為使用者只看得到 Session ID,看不到實際內容。
- 運作流程:登入後伺服器建立一塊 Session 資料 →<mark style="background: #FFF3A3A6;"> 發 `session_id` 給瀏覽器(通常也存在 Cookie 裡)→ 下次請求帶上 `session_id` 比對識別。</mark>

**實作**:Node.js + Express 通常用 `express-session` 中介軟體來管理 Session。

> 補充:原對話的完整 Express 範例程式碼放在 Gemini 的 Canvas 檔(`web_auth_example.js`)裡,本筆記未含逐行程式碼;核心是用 `express-session` 設定 session,登入後把使用者資訊存進 `req.session`,後續請求由中介軟體依 cookie 裡的 session id 還原。

## 各對話來源

### Cookie 與 Session 概念與範例(2026-06-02)— https://gemini.google.com/app/cc5b875ac137a823

**使用者:** 教我 cookie 跟 session 並且帶上範例程式碼。

**Gemini:** 了解 Cookie 和 Session 是掌握 Web 開發身分驗證與狀態管理的基礎。因為 HTTP 協定本身是「無狀態的(Stateless)」,伺服器不記得你是誰,所以需要 Cookie 和 Session 來維持登入狀態。
- **Cookie(客戶端儲存)**:一小段文字資料,由伺服器發送、儲存在使用者瀏覽器中;瀏覽器在後續請求會自動帶回給伺服器。特點:存在使用者端,容易被竄改或竊取,不適合放敏感資料。
- **Session(伺服器端儲存)**:資料存在伺服器端;伺服器給使用者一個「身分證」(Session ID),透過 Cookie 傳給瀏覽器;再次請求時伺服器透過這個 ID 查詢對應 Session 資料。特點:安全性較高,使用者只看得到 Session ID。
- 附上「Cookie 與 Session 實作指南」與 Node.js (Express) 範例 `web_auth_example.js`(用 `express-session` 中介軟體管理 Session)。
- 指南內容:① Cookie 運作流程——登入後伺服器發 `Set-Cookie`,瀏覽器寫入本地,之後每次請求標頭帶上 Cookie。② Session 運作流程——登入後伺服器在記憶體或資料庫建立 Session 資料,發一個 `session_id` 給瀏覽器(通常存在 Cookie 裡),下次請求帶上 `session_id`,伺服器比對後識別使用者狀態。
