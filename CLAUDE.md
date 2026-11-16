---
title: "CLAUDE"
---


## 📒 Abby-notes 筆記工作守則（Claude 每次回應都要遵守）
每次 user 問問題，Claude 在回答的「同時」，要到 `C:\coding\futuresign\Abby-notes` 找一個最適合的位置把內容存下來：
- 開一個新資料夾或新檔案，**或**直接寫進最適合的「既有資料夾／檔案／章節」（不一定要新開）。
- 資料夾與檔名用「簡單好懂、有重點」的名稱（中英皆可），讓人一看就知道內容。
- 寫入時要先觀察是否有相關的既有檔案可以互相補充，並用 Obsidian 的 `[[wikilink]]` 互相連結（之後可能整個放進 Obsidian）。
- 範例：前端 JavaScript 的「日期物件」問題 → 開一個「日期物件」資料夾，裡面放重點筆記。
- 目的：把跟 Claude 的問答沉澱成可長期累積、可互相連結的個人知識庫。
- 表格比文字好，如果能用表格對照的觀念，用表格。不要列點。譬如Babel跟SWC的優缺用表格，除非段落很常那可以頭部先出現表格，用WIKILINK連接到下面Section的單一詞語的長解釋(介紹)
- 不要過度再次重點整理，第二次重點整理其實不必要。

### 📌 重點標號規則（a–z）
- 這仍然算是有序編號，我記得最外層我要用阿拉伯數字1、2、3、如果它是有順序性的譬如要先知道1才來了解2。
- 如果是沒有順序性的就不要用數字才用小寫字母。因為數字會給人「優先順序」的錯覺，很多重點其實只是並排、沒有先後；字母只表位置與數量。
- 在標題或開頭放一行索引（例：「本篇重點 a–s，共 19 個」），讓 Abby 看任一 section 都能立刻知道「我在全篇的哪裡、總共有幾個重點」。
- 若重點超過 26 個，代表該拆筆記或該精簡；優先精簡到 ≤ z。

### 📌 表格內不要放 wikilink
- Markdown 表格用 `|` 分欄；`[[筆記\|別名]]` 的別名 pipe 會被當成欄位分隔，**把表格拆壞**。所以**表格儲存格一律用純文字／純路徑**（如 `` `/usr/bin/bash` ``），要連結就寫在表格外的內文。（真的要在表格放 wikilink 時，只能用無別名的 `[[筆記]]` 或把 pipe 跳脫成 `\|`。）

### 📌 來源引用規則（找資料必附出處）
- **只要有查資料**（web 搜尋、抓網頁、從 Gemini/ChatGPT 對話萃取），就要在筆記裡附上**實際參考的網址**，並標出該來源的**版本／更新時間／查證日期**，讓 Abby 能判斷新舊、也能核對我沒有引用過時資料或憑空杜撰。
- 格式：文末開「## 資料來源（含查證時間）」表格：主題 ｜ 連結 ｜ 版本／時間。
- 從 Gemini/ChatGPT 用下來的內容：frontmatter `sources` 要放該對話 URL；若對話中引用外部事實，另補該事實的原始出處。
- **查核**：若發現 AI（Gemini/ChatGPT）講錯或可疑，於筆記中標註「⚠️ 存疑／更正」並在回報時告知 Abby，不要照抄錯誤。
- **來源寫在筆記「內」**：Sources 一定要落在 .md 檔裡（文末表格），不要只寫在對話裡——對話不一定會再翻回來。

### 📌 個人偏好（從 Claude Desktop 設定同步過來，方便版本控管、也讓排程／各 session 都讀得到）
> 注意：Claude Desktop「設定裡的記憶」是**全域、app 層級**的偏好，跟這個 vault 的 CLAUDE.md **不會自動同步**；以下是手動鏡射，兩邊若有衝突以 Abby 當下指示為準。
你是那个这个有时候上次- **回應精簡直接**：少廢話、能刪的字就刪。
- **問問題就寫筆記**：回答的同時寫進 `Abby-notes` 最適合的位置，做**精美 JS 互動 HTML**（表格一律使用共用元件 `assets/compare-table.js`，`notes.js` 會自動載入它，沒有引入 `notes.js` 的頁面要在 `</body>` 前自己加 `<script src>`；除了一般的chart, graph我希望你更重視流程圖：又稱程式方塊圖是表示演算法、工作流或流程的一種方塊圖表示，它以不同類型的框代表不同種類的步驟，每兩個步驟之間則以箭頭連接。這種表示方法便於說明解決已知問題的方法。流程圖在分析、設計、記錄及操控許多領域的流程或程式都有廣泛應用。更顯專業https://zh.wikipedia.org/zh-tw/%E6%B5%81%E7%A8%8B%E5%9B%BE。
- 點擊填空、切換顯示/隱藏答案、是非題、申論題，方便自己考自己）。
- **愛關聯**：多用 `[[wikilink]]` 互連，但要兼顧obsidian跟ithome還有github.io的github pages能否使用連結；不要吝嗇**截圖**（例如問到 Cookie/Session 就去截 F12 的 Cookie），能用美麗圖表或截圖展示的就做。
- **程式碼示範**：把 `.html/.js/.css/.go/.py` 這類檔案跟它的筆記 `.md` 放在**同一個資料夾**。
- 引用的官方文件連結直接嵌入到筆記的關鍵字中不需要太長的字元顯示
- **要貼到 Obsidian**：善用外掛 HTML reader、highlightr（螢光筆配色）、excalidraw。HTML Reader 預設模式（`BalanceMode`）會移除 `<script>`，互動頁在 Obsidian 裡不會動，要切到 Unrestricted Mode 才行。
- **名詞、縮寫、圖上標籤的 hover 說明，一律用筆記庫的 `.term`，不要用瀏覽器原生 `title` 屬性**。（2026-11 Abby 指示）
  - 語法：`<span class="term" tabindex="0" data-def="說明">詞</span>`；說明裡要放連結就加 `data-link` 與 `data-link-text`；詞在 `overflow:hidden` 的容器裡（例如時間軸方塊）或由 JS 動態產生，就加 `data-float`，改由浮動卡片顯示，才不會被切掉。
  - 樣式與行為由 `assets/notes.css`、`assets/notes.js` 提供，互動 HTML 要引入這兩個檔；寫新 hover 前先看這兩個檔開頭的說明，不要自己另做一套。
- **互動 HTML 的卡片不要硬寫白底（`#fff`）**：底色用該頁自己的 CSS 變數（例如 `--panel`、`--panel2`），深色主題的頁面出現白底卡片會很刺眼。新增的顏色用 `oklch()`。（2026-11 Abby 指示）
- **視覺設計先找範本再動工**：做表格互動、配色、圖表或版面之前，先到 Pinterest 用關鍵字搜尋（例如 `table highlighter excel`、`comparison table design`、`work report infographic`），挑 1–2 張專業範本當依據，並在回報時說明參考了哪一張、借用了哪個做法，不要憑感覺配色。（2026-11 Abby 指示）
  - 配色以**單一主色的深淺**為主（例如 Abby 給的綠色 WORK REPORT 範本：同一個綠色系做標題、底色、強調）。
  - **同一種意思只用一種顏色**：例如比較表「標整列」和「標整欄」都是「我在看這裡」，就用同一個標示色，不要列一色、欄一色、單格又一色。
  - 比較表共用元件是 `assets/compare-table.js`：螢光筆效果（點格子標單格並淡淡標出所在列與欄，點列標題標整列，點欄標題標整欄），只用螢光黃一個色相的深淺，不要七彩；整個 vault 的表格都會自動套用。
- **筆記是寫給一般讀者看的**：內文不要出現「Abby 的說法」「Abby 自己的說法」「Abby 實測」這類個人稱呼，直接寫成中性的知識內容（例如標題寫「簽章怎麼保護 payload」就好）。（2026-11 Abby 指示）
- **共用互動元件**（都在 `assets/`，`notes.js` 會自動載入；沒有引入 `notes.js` 的頁面要自己在 `</body>` 前加 `<script src>`）：（2026-11 Abby 指示）
  - `compare-table.js`：所有兩欄以上的表格自動套用螢光筆效果。不要套用的表格加 `data-no-compare`。
  - `term-cards.js`：名詞、單字介紹做成卡片（`<div class="term-cards"><article class="term-card"><h4 class="tc-term">…`），點擊會放大約 1.8 倍。桌機版面很寬，名詞介紹優先用卡片，不要用長串列點。
  - `link-lines.js`：文字裡出現「第 2 組」「圖中的 tag」這種抽象指代時，被指的地方加 `id`，指代文字包成 `<span class="ll-src" data-link-to="#id">`，點一下會畫一條線連過去，約 1 秒後淡出，不擋住其他文字。
- **程式碼一律要有註解**：筆記裡的範例程式、`assets/*.js` 這類共用腳本、專案程式碼都一樣，每個函式上方寫 JSDoc 區塊（`/** 一句功能說明 @param {型別} 名稱 中文說明 @returns {型別} 說明 */`），關鍵行加中文 inline 註解說明「為什麼這樣做」；檔頭的說明（例如顏色、用法）改了程式就要一起改，不能讓註解跟程式對不上。（2026-11 Abby 指示）
- **一篇筆記一張主軸圖**：每個主題的互動 HTML 筆記，盡量固定用**同一張圖／動畫**當主軸（例如 `return-清理記憶體-stack-frame與閉包例外.html` 的 Stack/Heap 分欄動畫）。同主題後續追問，優先**擴充或指回這張圖裡的特定位置**（某個步驟、某個方框、某個標籤），不要每次都另開新章節——視覺定位比純文字更好記，Abby 可以直接「指回剛剛那個位子」。
- **術語統一：一律用「transpile（轉譯）」**：中文的「轉」、英文的「transform」若指的是「原始碼→原始碼（JSX/TS→JS）」這件事，全部統一寫成 **transpile**，不要混用「轉／transform 類」等不對稱說法。（2026-09 Abby 指示）
- **補內容用「融合」不「另開區塊」**：對既有筆記補充時，優先**把新內容融合進最相關的既有段落／表格**，不要動不動就新開一個 `##`／`###` 區塊。（2026-09 Abby 指示）
- <mark style="background: #FFF3A3A6;">**寫工具／流程：動詞—受詞—拋接關係都要寫清楚，別只用「＋」號連名詞**</mark>：寫成完整句子「**誰 用什麼 做什麼、產物是什麼、再拋給誰**」（例：<mark style="background: #BBFABBA6;">bundler 用 acorn 把原始碼 parse 成 AST → 讀出 import 的 specifier → 交給 enhanced-resolve resolve 成實際檔路徑</mark>）。工具屬性用**小字／顏色括號註在名稱右邊**（例：`acorn`（輕量 parser））。把散落各處講同一件事的內容**統整在一起**。（2026-09 Abby 指示）
- 寫句子的時候主詞動詞受詞謂語都要寫清楚成完整的一句話。不要同一個表格內用不同名詞去講同一件事情，像是transpile就叫transpile不要突然用transoform來說。
- 筆記同一段要善用5H1W，如果是上一句話的解釋要記得Enter以後再一個tab縮排表示是上一句的內層！
每次修改前請先解釋使用什麼語法，每次撰寫JS檔案請你每一行都寫上註解，因為我程度很差，我需要知道每一個變數跟每一個function傳參的意義。
---

## 作系統 人員資料表
user資料表是後台系統方的管理員名單，
member資料表才是真正註冊的主辦單位|攤販|消費者
我們這次專案中是official_website是前台的前端系統，frontend是後台的前端畫面系統。
backend是統一的


## commit
commit前請先npm run lint + docker compose up --build確認無編譯錯誤以及lint風格問題
### 請勿在協助COMMIT的時候直接把自己當成CO-AUTHOR，
如："🤖 Generated with Claude Code"
  ### 同一個分支如果已經開立PR切勿再PUSH以免增加CICD費用
TEST:
Commit以及PR前保持良好習慣前後端皆須建立單元測試
前端用Vitest
- [ ] Added or updated unit tests for all changes


## 🛠️ 疑難排解紀錄 (Troubleshooting Log)

### 2026-06-22 — 終端機 `claude` 殼有了但跑不起來
- **現象**：在 PowerShell 打 `claude` 沒反應 / 跑不出來。
- **診斷**：`Get-Command claude` 回傳的是 `ExternalScript claude.ps1`(npm 全域安裝在 Windows 上會放 `claude`、`claude.cmd`、`claude.ps1` 三個殼)。代表**有裝、也在 PATH**,問題是「殼在但底層跑不起來」,不是「找不到」。
- **可能病根**：① PowerShell ExecutionPolicy 擋 `.ps1`(同一個開關也會讓 venv 的 `Activate.ps1` 啟用失敗)；② Node 不在 PATH；③ 底層安裝損毀。
- **✅ 最後解法**：重新安裝即修好。
  ```powershell
  npm install -g @anthropic-ai/claude-code
  claude --version   # 確認版本有出來
  ```
- 若改 ExecutionPolicy 路線:`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` → `Y` → 重開終端機。
- 相關筆記:[[where-vs-get-command]]、[[Claude-Code-Bash環境說明]]、[[plugin-marketplace-vs-install]]
