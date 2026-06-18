---
title: 剪貼簿劫持攻擊（ClickFix）與網站惡意注入排查
type: topic-note
source: Gemini
tags: [gemini, 資安, security, XSS, supply-chain, clickfix, zeabur]
sources:
  - https://gemini.google.com/app/ff3bce18ba7ea75c
updated: 2026-06-15
---

# 剪貼簿劫持攻擊（ClickFix）與網站惡意注入排查

> [!danger] 一句話原則
> 看到網頁要求你按下任何<mark style="background: #FF5582A6;">系統組合鍵（Win+X、Win+R）</mark>或<mark style="background: #FF5582A6;">複製貼上指令到終端機</mark>，100% 是詐騙與惡意攻擊。真正的 Cloudflare／CAPTCHA 驗證絕對不需要你的系統權限。

## 重點整理

### 攻擊手法：剪貼簿劫持（Clipboard Hijacking / ClickFix）

偽裝成 Cloudflare 驗證的彈窗，引導使用者按 `Win+X` → `Ctrl+V` → `Enter`。背後原理：

1. 進入網頁的瞬間，前端 JS 已偷偷把惡意 PowerShell 指令寫進剪貼簿：
   ```javascript
   navigator.clipboard.writeText("惡意 PowerShell 指令");
   ```
2. `Win+X`／`Win+R`：開啟進階選單或「執行」視窗（網頁<mark style="background: #ADCCFFA6;">沒有權限自己按，所以要騙你動手</mark>）。
3. `Ctrl+V`：把剪貼簿裡的惡意指令貼進終端機。
4. `Enter`：執行 → PowerShell 從遠端 C2 伺服器下載並執行木馬（竊取 Cookie / 密碼 / Token 的 Stealer）。

> [!info] 為什麼能繞過防毒？
> 這是<mark style="background: #FFF3A3A6;">無檔案惡意軟體（fileless malware）</mark>攻擊：不下載 .exe，而是利用系統內建的合法工具（PowerShell）執行，防毒容易誤判成使用者本人的合法操作。

### 從 Console 日誌判讀惡意注入（鐵證）

Abby 的部署網站 `insightful-timestamp.zeabur.app` 被注入惡意碼，console 三大疑點：

1. <mark style="background: #FF5582A6;">惡意網域請求（被 CORS 擋下）</mark>
   ```text
   Access to fetch at 'https://stroinnetsata.biz/ccheck?k=...' from origin
   'https://insightful-timestamp.zeabur.app' has been blocked by CORS policy:
   ... contains multiple values '*, *', but only one is allowed.
   ```
   隱藏 JS 一打開就 fetch 陌生網域 `stroinnetsata.biz`（隨機生成的 C2 / 釣魚伺服器），目的是拉惡意彈窗程式碼。幸好駭客把 CORS header 寫錯（重複 `*, *`），瀏覽器拒絕載入。
2. **鋪天蓋地的 link preload 警告**：腳本試圖在毫秒內瘋狂預載大量外部惡意資源，但因 CORS 被擋而 `not used`，噴出滿滿效能警告。
3. **正常的前端日誌**（`use-auth.js` 檢查 ACCESS_TOKEN）：證明原專案功能還在，但已被「寄生」。

### 惡意碼可能的入侵管道

- <mark style="background: #FFF3A3A6;">依賴套件中毒（Supply Chain Attack）</mark>：裝到被劫持的 npm 套件，或打錯字裝到釣魚套件（如把 `axios` 裝成 `axois`）。
- **原始碼／GitHub 被污染**：Token 外洩，駭客直接 commit 惡意碼到 `index.html` / `layout.js`。
- **Zeabur 部署環境洩漏**：帳密或 API Key 被拿到，注入惡意 scripts。

### 重新部署前的標準安全檢查清單

> [!warning] 別在找出原因前就重新 Push，否則幾秒後彈窗又出現。

- [ ] 編輯器全域搜尋 `stroinnetsata`、`ccheck`、`biz`，刪掉藏網址的程式碼行。
- [ ] 檢查 `package.json` 有無不認識／最近剛裝的套件 → `npm uninstall`；跑 `npm audit`。
- [ ] 檢查 GitHub commits 有無不是自己推的程式碼。
- [ ] 本地 `npm run dev` 確認 Console 完全沒有 `stroinnetsata.biz` 報錯，再 Push 讓 Zeabur 重建。

### 網域要不要換？

<mark style="background: #BBFABBA6;">原則上不需要換網域</mark>——問題在「程式碼被污染」，不是網域所有權被奪。清乾淨重新部署，舊網域 `insightful-timestamp.zeabur.app` 可繼續用。但兩種情況例外：

- **情況 A：Zeabur 後台帳號被盜** → 立刻換密碼、確認網域仍綁在自己專案上。
- **情況 B：網域被瀏覽器／防毒列入黑名單** → 清乾淨後用無痕或其他裝置測試。若噴紅色詐騙警告：到 Google Search Console 提交審查（1~3 天解除），或最快直接在 Zeabur 刪掉舊子網域、重新生成一個新的 `.zeabur.app` 子網域避開黑名單。

## 各對話來源
### 警惕惡意程式碼夾帶攻擊（2026-06）— https://gemini.google.com/app/ff3bce18ba7ea75c

使用者：這個怎麼用掉...呀 https://insightful-timestamp.zeabur.app/ → Gemini：警告！這是偽裝成 Cloudflare 驗證、要你按 Win+X/Ctrl+V/Enter 的剪貼簿劫持（Clipboard/PowerShell Hijacking）攻擊。網頁已把惡意 PowerShell 指令寫入剪貼簿，照做會被遠端控制。立刻關分頁、複製無害文字覆蓋剪貼簿；若已照做則斷網、換密碼開 2FA、全機掃毒。

使用者：你怎麼知道被駭客入侵 → Gemini：(1) 真 Cloudflare 跑在瀏覽器沙盒內，不需系統權限，無法自己按 Win+X，所以才騙你按。(2) 訪問瞬間前端用 `navigator.clipboard.writeText()` 劫持剪貼簿。(3) 這是無檔案惡意軟體攻擊鏈：寫剪貼簿→騙開終端機→貼上→Enter 執行，利用內建 PowerShell 繞過防毒。

使用者：（貼上 console 日誌）→ Gemini：鐵證！(1) fetch `stroinnetsata.biz/ccheck`（C2 伺服器）被 CORS 擋（header 重複 `*, *`）。(2) 大量 link preload 警告＝瘋狂預載惡意資源未執行。(3) `use-auth.js` 日誌正常＝原專案被寄生。入侵管道：供應鏈套件中毒 / GitHub Token 外洩 / Zeabur 環境洩漏。檢查清單：全域搜尋惡意網址、npm audit、檢查 commits、本地驗證後再部署。

使用者：重新部署那我的網域要換掉嗎？ → Gemini：原則上不用換，問題在程式碼非網域所有權。例外：Zeabur 帳號被盜（換密碼）、網域被列黑名單（Search Console 申訴或重新生成子網域）。
