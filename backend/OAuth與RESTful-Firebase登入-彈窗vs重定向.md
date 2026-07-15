---
title: OAuth 與 RESTful、Firebase 登入（彈窗 vs 重定向）與登入狀態維持
type: topic-note
source: ChatGPT
tags: [chatgpt, backend, 身分驗證, oauth, restful, firebase, cookie, session]
sources:
  - https://chatgpt.com/c/66ff7921-585c-8002-802f-65f908fe4d41
  - https://chatgpt.com/c/6711a446-aed4-8002-95ac-6b81a6d9dc1e
updated: 2026-06-25
---

# OAuth 與 RESTful、Firebase 登入（彈窗 vs 重定向）與登入狀態維持

> 互動考題版：[[OAuth與RESTful-Firebase登入-彈窗vs重定向.html|點我做題（填空／是非／申論）]]
> 相關筆記：[[Cookie-與-Session]]、[[session]]、[[JWT_TOKEN_EXPLANATION]]、[[GOOGLE_OAUTH_SETUP]]、[[LOGOUT_AND_LOGIN_EXPLANATION]]

## 重點整理

- OAuth 跟 RESTful API <mark style="background: #BBFABBA6;">有關係但分工不同</mark>：<mark style="background: #ADCCFFA6;">OAuth 2.0 負責「授權（authorization）」</mark>——讓第三方 App 安全地拿到存取使用者資源的許可，<mark style="background: #FFF3A3A6;">不必把帳號密碼交給 App</mark>；而 <mark style="background: #FFB8EBA6;">RESTful API 是「實際操作資源」的方式</mark>，透過 HTTP 通訊。呼叫 Google 的 API（Gmail、Drive…）前，通常要先過 OAuth 拿到授權，再用 REST 風格的 HTTP 請求去操作資源。
- 口訣：<mark style="background: #FF5582A6;">OAuth 給「通行證」，REST 是「拿通行證去辦事」。</mark>
- Firebase Google 登入有兩種方式：
  - `signInWithPopup`：開**彈出式視窗**登入。缺點是視窗可能「閃一下就不見」（被瀏覽器擋掉或關閉）。
  - `signInWithRedirect`：直接把使用者**重定向**到 Google 登入頁，登入完再導回來。<mark style="background: #ADCCFFA6;">回來後要用 `getRedirectResult()` 接結果</mark>。
- <mark style="background: #FF5582A6;">`getRedirectResult()` 只在重定向回來後的「那一次」回傳結果</mark>；如果頁面重新載入卻沒正確處理，登入結果就接不到（常見「沒效」原因）。
- 重定向登入「沒效」的排查清單：
  1. Firebase Console → Authentication → Sign-in method 是否**已啟用 Google 登入**。
  2. 你的網域是否已加入 Firebase 的**授權網域（authorized domains）白名單**。
  3. 打開 F12 → Console / Network 看有沒有錯誤訊息。
- 登入狀態能維持多久，取決於憑證與裝置設定，<mark style="background: #FFF3A3A6;">不是「關機就一定登出」</mark>。會被中斷的情況：手動登出、清除 cookies／App 資料、安全性驗證（異地登入）、憑證過期（長期沒活動）。
- 想關機後仍保持登入，可勾選「自動登入 / Log me in automatically」。要登出特定裝置則用帳號的裝置管理功能。

## DevTools 觀察（搭配你的 F12 習慣）

查登入是否真的用 cookie 維持：**F12 → Application → Cookies**，看是否有 session 類 cookie（如 `sessionid`、`connect.sid`、各家自訂名），以及它的 `Expires / Max-Age`（決定關機後是否還在）與 `HttpOnly`、`Secure`、`SameSite` 旗標。
> 想要的話我可以開你的瀏覽器，到實際登入的網站截一張 F12 Cookies 面板的真實截圖補進這份筆記。

## 🔁 對照與補遺（跟既有筆記交叉比對）

兩邊看過後的整理：這份是「概念＋Firebase 前端做法」，跟你 vault 既有的「本專案實作」剛好互補，重點在**同樣是 OAuth 2.0，但流程位置不同**。

### 1. 兩種 Google 登入流程（最重要的對照）

| | 本筆記：Firebase 前端流程 | 專案實作：後端 Authorization Code 流程 |
|---|---|---|
| 主導方 | <mark style="background: #ADCCFFA6;">瀏覽器端 SDK</mark>（`signInWithPopup/Redirect`） | <mark style="background: #BBFABBA6;">後端</mark>（`fastapi-sso`） |
| 流程 | 前端直接跟 Google 互動，拿到結果 | `/auth/google/login` → Google → `/auth/google/callback` |
| 最後拿到什麼 | Firebase 的使用者憑證 | 後端核發**自家 JWT**，重定向回前端 `?token=xxx` |
| 對應筆記 | （本篇） | [[GOOGLE_OAUTH_SETUP]] |

> 關鍵體會：你問 ChatGPT 的是「前端 Firebase 怎麼登入」，而專案真正用的是「後端 code flow，最後發 JWT」。兩者都叫 OAuth，但 token 落在哪、誰跟 Google 對話不同。Authorization Code（後端）較安全，client secret 不外洩。

### 2. 補上既有筆記沒明寫的觀念

- **Session（有狀態）vs JWT（無狀態）** — vault 裡 [[Cookie-與-Session]] 講 session、[[JWT_TOKEN_EXPLANATION]] 講 token，但沒並排比較：

  | | Session（有狀態） | JWT（無狀態） |
  |---|---|---|
  | 狀態存哪 | 伺服器（記憶體/DB） | <mark style="background: #FFF3A3A6;">token 自己帶</mark>，伺服器不存 |
  | 登出/撤銷 | 刪伺服器那筆即可 | 難主動撤銷 → 才需要 [[LOGOUT_AND_LOGIN_EXPLANATION|黑名單 jti]] |
  | 水平擴展 | 要共享 session store | 容易（無狀態） |

- **Cookie 安全旗標**（[[Cookie-與-Session]] 可補）：`HttpOnly`（JS 讀不到，防 XSS 偷 cookie）、`Secure`（只走 HTTPS）、`SameSite`（防 CSRF，搭配 [[CSRF-與-Antiforgery-Cookie]]）、`Expires/Max-Age`（決定關機後是否還在）。
- **「session」在你 vault 有三個意思**，別混：① 身分驗證 session（[[Cookie-與-Session]]）；② 資料庫 ORM session（[[session]]，SQLModel 的交易窗口）；③ OAuth 登入 session（本篇登入狀態維持）。
- **OAuth 是授權不是認證**：純 OAuth 解決「准你存取資源」；要「證明你是誰」是 OpenID Connect（OIDC）疊在 OAuth 之上——既有筆記都沒提到這層。

## 各對話來源

### Google OAuth 與 RESTful API（2024-10-04）— https://chatgpt.com/c/66ff7921-585c-8002-802f-65f908fe4d41

**使用者：** Google 的 OAuth 跟 RESTful API 有關係嗎？後段延伸到 Firebase Google 登入，想改用重定向（不要彈窗），但「沒效」。

**ChatGPT：** OAuth 2.0 是授權框架、REST API 是操作資源的方式，兩者相關但分工不同。Firebase 可用 `signInWithRedirect` 取代 `signInWithPopup`，回來要用 `getRedirectResult()` 接結果；沒效常因未啟用 Google 登入、網域未列入授權白名單，或重定向結果未被處理。

### LINE 登入狀態維持（2024-10-17）— https://chatgpt.com/c/6711a446-aed4-8002-95ac-6b81a6d9dc1e

**使用者：** LINE 的登入可以維持多久？電腦關機就會登出嗎？

**ChatGPT：** 取決於設定與憑證。手動登出、清除 cookies/App 資料、安全驗證、憑證過期都會中斷登入；開啟自動登入則關機後仍可保持。
