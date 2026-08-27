---
title: ClickFix 社交工程攻擊｜假驗證碼誘騙貼上 PowerShell，以及網站被注入時的處置
type: topic-note
source: Gemini
tags: [gemini, 資安, security, clickfix, 社交工程, powershell, infostealer, csp, 供應鏈攻擊, 釣魚網站]
sources:
  - https://gemini.google.com/app/273cae514f4faa1c
  - https://gemini.google.com/app/e397528b3a33c92b
updated: 2026-08-25
---

# ClickFix 社交工程攻擊｜假驗證碼誘騙貼上 PowerShell，以及網站被注入時的處置

> [!danger] 一句話結論
> <mark style="background: #FF5582A6;">任何網頁叫你「複製一段指令貼到終端機或 Win+R 執行以完成驗證」，一律是攻擊，沒有例外。</mark>正常的 reCAPTCHA 從來不需要你離開瀏覽器。

> [!info] 本篇重點 a–t，共 20 個
> 兩場對話合併：一場是網站上跳出假驗證視窗要求貼上一長串 Base64 PowerShell，一場是判斷 `c1ph3r.site` 這個網址安不安全。共通主軸是<mark style="background: #FFF3A3A6;">「怎麼在點下去之前就判斷出這是攻擊」，以及「身為網站開發者，發現自己的站在對訪客做這件事時該怎麼辦」</mark>。
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[CSRF-與-Antiforgery-Cookie]]</mark> 與 <mark style="background: #ADCCFFA6;">[[Cookie-與-Session]]</mark> 講的是「攻擊者怎麼偷用你的身分」，這篇講的是更前面一步——攻擊者怎麼騙你親手把後門裝起來；<mark style="background: #ADCCFFA6;">[[SonarLint憑證警告-CaptivePortal攔截與MITM誤判]]</mark> 是同一批對話裡的另一件事，那篇談的是<mark style="background: #BBFABBA6;">誤判</mark>的 MITM 警告，這篇談的是<mark style="background: #FF5582A6;">真的</mark>攻擊，兩篇對照著看可以練出「哪種警告該怕」的判斷力。

---

## 重點整理

## 第一部分：ClickFix 攻擊本身

### 一. 這是什麼

(a) <mark style="background: #ADCCFFA6;">ClickFix（也叫 Fake CAPTCHA、Paste-and-Run）</mark>：一種社交工程攻擊。<mark style="background: #FFB8EBA6;">最早的公開回報是 2024 年 3 月，2025 年 3 月 18 日被正式收錄為 MITRE ATT&CK 的 T1204.004（User Execution: Malicious Copy and Paste）</mark>，已知被 Latrodectus、Lumma Stealer、NetSupport RAT 等惡意程式家族當作主要感染途徑。網頁彈出假的「我不是機器人」或「修復顯示問題」視窗，指示使用者按 `Win + R`、貼上一段已經在剪貼簿裡的指令、按 Enter。

(b) <mark style="background: #FFF3A3A6;">為什麼有效：它繞過了所有技術防線。</mark>沒有下載檔案、沒有可疑附件、沒有觸發瀏覽器的下載警告——是使用者自己在自己的電腦上手動執行的。防毒軟體很難擋一個「使用者主動輸入的指令」。

(c) <mark style="background: #FF5582A6;">重要澄清：看到這個彈窗，不代表你的網站被駭。</mark>你可能只是造訪了一個被植入惡意腳本的網站，也可能是自己的瀏覽器擴充功能被劫持。要分清楚「我是受害者」還是「我的站在害別人」。

### 二. 那段惡意腳本在做什麼

> [!note] 為什麼這裡不貼原始碼
> 原始的攻擊 payload 是一長串 Base64，本篇<mark style="background: #FF5582A6;">刻意不完整收錄</mark>，避免以後不小心複製到。原文可回對話連結查看。以下只記錄它的行為特徵，這才是能拿來辨識下一次攻擊的東西。

(d) **多層混淆與加密**：同時用 <mark style="background: #ADCCFFA6;">Base64 編碼</mark>與 <mark style="background: #ADCCFFA6;">Caesar Cipher（凱撒位移密碼）</mark>字母替換來藏住真實內容，目的是規避防毒軟體的靜態特徵比對。

(e) **下載並執行外部檔案**：解碼後的腳本會用 `WinHttp.WinHttpRequest` 這類 COM 物件向遠端伺服器發 HTTP 請求，偷偷把惡意程式抓下來。

(f) **背景隱蔽執行**：透過 `ProcessStartInfo` 啟動處理程序，並把 <mark style="background: #FF5582A6;">`CreateNoWindow` 設為 true、`WindowStyle` 設為 Hidden</mark>，讓你完全看不到有東西在跑。

(g) **竊密**：抓下來的通常是 <mark style="background: #ADCCFFA6;">InfoStealer（資訊竊取程式）</mark>，目標是瀏覽器存的密碼、信用卡號、加密貨幣錢包，並在登錄檔（Registry）留後門讓自己開機自動執行。

(h) <mark style="background: #FFF3A3A6;">辨識特徵懶人包，看到以下任一組合就是它：</mark>

| 特徵 | 為什麼可疑 |
| --- | --- |
| `FromBase64String` + `Invoke-Command` / `IEX` | 把編碼過的字串直接當程式執行，正常維運腳本不會這樣寫 |
| `[scriptblock]::Create(...)` | 動態產生程式碼，典型的混淆手法 |
| `-WindowStyle Hidden` / `CreateNoWindow` | 刻意不讓你看到 |
| `-EncodedCommand` / `-enc` | 傳一段 Base64 給 PowerShell 直接跑 |
| `DownloadString` / `WinHttpRequest` 接著執行 | 下載即執行 |
| 網頁上出現 `Verification Steps`、`Verification ID`、`powershell` | 假驗證碼的痕跡 |

### 三. 已經貼上去了怎麼辦

(i) <mark style="background: #FF5582A6;">立即斷網</mark>：拔網路線或關 Wi-Fi，阻止資料繼續上傳。

(j) <mark style="background: #FF5582A6;">完整病毒掃描</mark>：Windows Defender 離線掃描或第三方防毒的全盤掃描。

(k) <mark style="background: #FF5582A6;">在另一台乾淨的裝置上</mark>更換所有重要帳號密碼（Email、社群、銀行、GitHub、雲端），並啟用 2FA。<mark style="background: #FF5582A6;">重點是「另一台」</mark>——在已被感染的機器上改密碼等於直接送給對方。

(l) <mark style="background: #D2B3FFA6;">補充 Gemini 沒講的：InfoStealer 也會偷 session cookie，所以光改密碼不夠，要在各服務後台執行「登出所有裝置」把既有 session 作廢。</mark>另外開發者要特別檢查 `.env`、`~/.aws/credentials`、`~/.ssh/`、瀏覽器存的 GitHub token。

## 第二部分：身為網站開發者的處置

### 四. 應急止血

(m) **下架或設維護模式**：正式環境先切到維護頁或備份頁，避免訪客持續受騙。

(n) **清 CDN 與前端快取**：Cloudflare 或其他 CDN 要清全站快取，否則被污染的靜態資源會繼續被讀。

### 五. 找感染源

(o) **前端注入點**：開 DevTools 檢視原始碼，搜尋 `Verification Steps`、`reCAPTCHA Verification ID`、`powershell`、`FromBase64String` 這些關鍵字。檢查 `index.html` 或打包進入點有沒有引入不可信的外連腳本。

(p) <mark style="background: #FF5582A6;">**第三方套件與供應鏈攻擊（Supply Chain Attack）**</mark>：檢查 npm 依賴、Analytics、客服插件、廣告聯播網的 script 有沒有被串改。這是近年最常見的入口——你自己的程式碼一行沒改，但某個小套件被接管了。

(q) **後端與資料庫注入**：檢查資料庫（WordPress 的 `wp_posts`、`wp_options` 等）有沒有被寫入 `<script>` 或隱藏 DOM。用 `git status` / `git diff` 比對伺服器上的檔案有沒有未授權異動。

(r) 檢查瀏覽器儲存也是排查的一環——被注入的腳本常會塞新的 cookie 或 localStorage 項目來記錄「這個訪客已經看過彈窗」：

![DevTools 的 Application 分頁：左側 Storage 樹可以逐一檢視 Local storage、Session storage、IndexedDB 與 Cookies，右側列出該來源的所有 cookie 與 HttpOnly、SameSite 等屬性。排查注入時就是在這裡逐項比對有沒有自己沒設過的項目。](../obsidian-attachment/%E8%9E%A2%E5%B9%95%E6%93%B7%E5%8F%96%E7%95%AB%E9%9D%A2%202026-08-25%20150028.png)

> [!tip] 上圖的判讀重點
> 這張是自家 TimeLog 專案 `localhost:3001` 的正常狀態：只有一個 `ACCESS_TOKEN`（JWT），<mark style="background: #BBFABBA6;">HttpOnly 打勾、SameSite 為 Lax</mark>。<mark style="background: #FFF3A3A6;">排查被注入的站時，就是拿這種「我知道每一項是什麼」的乾淨基準，去比對出多出來的陌生項目。</mark>平常就留一張正常狀態的截圖，出事時比對會快很多。

### 六. 強化

(s) <mark style="background: #BBFABBA6;">**設定 CSP（Content Security Policy，內容安全政策）**</mark>：在 HTTP 回應標頭中限制只能載入哪些來源的腳本。

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted-cdn.com;
```

逐段拆解：`default-src 'self'` 是預設規則，所有資源只能來自本站；`script-src` 單獨覆寫腳本規則，只允許本站與指定的 CDN。<mark style="background: #FF5582A6;">注意這份設定沒有寫 `'unsafe-inline'`，所以頁面內嵌的 `<script>...</script>` 也會被擋掉</mark>——這正是它能防注入的原因，但也代表你的專案得先把 inline script 清乾淨才能上這條規則。<mark style="background: #D2B3FFA6;">建議先用 `Content-Security-Policy-Report-Only` 跑一陣子收報告，確認不會誤殺再切成正式模式。</mark>

(t) **輪換所有憑證**：重新產生 SSH 部署金鑰、資料庫密碼、API Keys，檢查伺服器有沒有被建立異常帳號，審查 CI/CD 的 Secrets 有沒有外洩。

## 第三部分：怎麼判斷一個陌生網址

以 `c1ph3r.site` 為例（<mark style="background: #FF5582A6;">請勿造訪</mark>）：

- **名稱混淆**：`Cipher`（加密）這種技術味的詞常被拿來包裝成看似專業的網站，降低戒心。<mark style="background: #FFB8EBA6;">加上 leetspeak 數字替換（i→1、e→3）本身就是可疑訊號。</mark>
- **頂級域名（TLD）屬性**：`.site` 是低門檻便宜域名，常被用於短期釣魚站。<mark style="background: #D2B3FFA6;">這只是統計上的風險偏高，不是判罪依據，正當網站也會用。</mark>
- **取得管道決定風險**：陌生人在社群或交友軟體推薦的投資平台、通訊軟體不明群組的連結、聲稱帳號有問題的郵件——這三種來源的連結一律不點。
- **驗證工具**：用 <mark style="background: #BBFABBA6;">VirusTotal</mark> 或 <mark style="background: #BBFABBA6;">Trend Micro Site Safety Center</mark> 掃網址，不要自己開來看。
- 若已點開：不要輸入任何資料，關閉並掃描系統。

---

## 練習題

資安觀念沒有 LeetCode 直接對應，但底層的編碼與字串處理有：

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 1720 | [Decode XORed Array](https://leetcode.com/problems/decode-xored-array/) | 攻擊腳本裡的 `-bxor` 混淆就是這個運算 |
| 2325 | [Decode the Message](https://leetcode.com/problems/decode-the-message/) | 字元替換式密碼，Caesar Cipher 的親戚 |
| 848 | [Shifting Letters](https://leetcode.com/problems/shifting-letters/) | 字母位移，就是這段 payload 用的凱撒位移手法 |
| 393 | [UTF-8 Validation](https://leetcode.com/problems/utf-8-validation/) | 理解 Base64／編碼層的位元操作 |

---

## 各對話來源（原文）

### 識別並防範 PowerShell 惡意腳本攻擊（2026-08）— https://gemini.google.com/app/273cae514f4faa1c

**使用者：** 我的網站好像被駭了，他要我貼上這串 `Invoke-Command -ScriptBlock ([scriptblock]::Create([System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('...（省略約 4000 字元的 Base64 payload，本筆記刻意不完整收錄）...'))))` 到我的終端機，我該怎麼辦

**Gemini：** 千萬不要貼上！這是極為危險的惡意腳本攻擊（ClickFix 詐騙／ClickFix Attack）。你的網站並沒有被駭，而是你目前瀏覽的網頁遭到了惡意篡改或植入了假冒的「驗證碼（reCAPTCHA）」彈出視窗。這是一種新型態的社交工程攻擊，意圖誘騙使用者將惡意指令複製並貼到電腦的 PowerShell／終端機執行。
腳本惡意行為分析：經過多層混淆與加密（Base64 編碼與 Caesar Cipher 字母替換法，試圖規避防毒軟體偵測）；下載並執行外部惡意檔案（解碼後的腳本會向遠端伺服器發送 HTTP 請求，秘密下載惡意程式）；背景隱蔽執行（透過 PowerShell 啟動處理程序，並將視窗設為隱藏 `createNoWindow` / `windowStyle`）；系統破壞與竊密（下載的程式通常為資訊竊取程式 InfoStealer，會竊取瀏覽器儲存的密碼、信用卡號、加密貨幣錢包，甚至在登錄檔註冊後門）。
建議處理步驟：直接關閉該網頁；清理瀏覽器快取與 Cookie，並檢查瀏覽器擴充功能是否有異常安裝；若已不幸執行該指令，立即斷網、完整病毒掃描、在安全的裝置上更換所有重要帳戶密碼並啟用 2FA。

**使用者：** 我本人是網站開發者，我怎麼處理這個問題呢

**Gemini：** 當網站出現此類 ClickFix 惡意程式碼彈窗時，代表攻擊者已成功取得網站的注入權限（通常是前端資源、套件或 CMS 漏洞）。
一、應急處置（止血）：下架或暫停服務，若為正式環境建議先設定維護模式或將 DNS 切換至備份頁面；清理 CDN／前端快取。
二、感染源排查：檢查前端注入點（打開 DevTools 或檢視原始碼，搜尋彈窗關鍵字如 `Verification Steps`、`reCAPTCHA Verification ID` 或 `powershell`）；檢查第三方套件（npm/CDN）是否引入了外連的不可信腳本，或 npm dependency 遭供應鏈攻擊；檢查 Analytics、客服插件、廣告聯播網的 script 是否遭串改；檢視後端與資料庫注入（如 WordPress 的 `wp_posts`、`wp_options`）；檢查 Server 端程式碼異動歷史（`git status` 或 `git diff`）。
三、伺服器安全性強化：設定內容安全策略 CSP；替換權限與憑證（重新產生部署金鑰 SSH Keys、資料庫密碼與 API Keys，檢查是否有異常後門帳號，審查 CI/CD Secrets）。

### 警惕可疑網址 c1ph3r.site（2026-08）— https://gemini.google.com/app/e397528b3a33c92b

**使用者：** `https://c1ph3r.site/` 這個是有毒的網址嗎？

**Gemini：** 根據現有的安全分析和社群回饋，對於 `c1ph3r.site` 這個網址，建議保持高度警覺。
1. 潛在風險分析：詐騙嫌疑（在相關的安全社群如 Reddit 的 CryptoScams 版塊中，有使用者指出類似名稱或性質的網站與詐騙活動有關，這類網站常被用於加密貨幣詐騙）；網域名稱屬性（`.site` 是低門檻的頂級域名，常被用於架設短期、成本低廉的釣魚網站）；名稱混淆（「Cipher」一詞常被技術或安全愛好者使用，但也常被惡意份子用來包裝成看似專業、實則危險的網站）。
2. 安全建議：如果這個網址是透過社群媒體或交友軟體、通訊軟體不明群組、不明郵件獲得的，請務必不要點擊或輸入個人資訊。
3. 如何自保：切勿輸入資料；關閉網頁並掃描系統；檢查網址完整性；建議使用 VirusTotal 或 Trend Micro Site Safety Center 等線上工具進行即時掃描。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話：PowerShell 惡意腳本 | https://gemini.google.com/app/273cae514f4faa1c | 2026-08，本次歸檔 2026-08-25 |
| Gemini 對話：可疑網址判斷 | https://gemini.google.com/app/e397528b3a33c92b | 2026-08，本次歸檔 2026-08-25 |
| MITRE ATT&CK T1204.004 User Execution: Malicious Copy and Paste | https://attack.mitre.org/techniques/T1204/004/ | 該子技術於 2025-03-18 正式加入 ATT&CK 框架，查證 2026-08-25 |
| Microsoft：PowerShell 執行原則與安全 | https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies | 查證 2026-08-25 |
| MDN：Content Security Policy | https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP | 查證 2026-08-25 |
| MDN：CSP `script-src` | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src | 查證 2026-08-25 |
| OWASP：供應鏈安全 | https://owasp.org/www-project-top-ten/ | 查證 2026-08-25 |
| VirusTotal | https://www.virustotal.com/ | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 更正
> 1. Gemini 說「<mark style="background: #FF5582A6;">你的網站並沒有被駭</mark>」——這句話下得太快。當時它還不知道使用者是這個站的開發者，也不知道彈窗出現在哪。<mark style="background: #FF5582A6;">彈窗可能來自被入侵的自家站、被劫持的瀏覽器擴充、或只是造訪了別人的惡意站，這三種情況的處置完全不同</mark>，不能一句話帶過。第二輪回答有修正回來。
> 2. Gemini 提到的惡意網域與 `c1ph3r.site` 的風險判斷，<mark style="background: #FF5582A6;">是根據當時的社群回饋，不是權威威脅情資</mark>。網域的信譽會變動，實際判斷請以 VirusTotal 等即時掃描結果為準，本筆記只保留「判斷方法」不保留「結論」。
> 3. Gemini 沒有提到 <mark style="background: #FF5582A6;">session cookie 也會被偷、光改密碼不夠</mark>（見 (l)），也沒有提醒 CSP 應該先用 Report-Only 模式試跑（見 (s)）。這兩點是本篇補上的。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
