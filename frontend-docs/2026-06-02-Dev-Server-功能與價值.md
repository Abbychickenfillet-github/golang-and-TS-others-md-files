---
title: Dev Server 功能與價值
date: 2026-06-02
source: Gemini
url: https://gemini.google.com/app/01e723c8b8fc1856
tags: [gemini, vite, frontend, npm, react, vector-db, ai-memory]
---

# Dev Server 功能與價值

## 摘要重點

這串對話從 Vite 專案初始化一路延伸到 AI 記憶系統,核心知識點如下:

**1. Scaffolding(專案腳手架)**
腳手架是「自動產生專案初始結構、基礎程式碼與標準配置」的工具/行為,幫你省去手動建目錄、配置依賴、寫樣板的重複工作。`npm create vite` / `npm init @vitejs` 就是典型腳手架工具。它通常會建立標準目錄(`src/`、`public/`)、配置檔(`package.json`、`vite.config.js`、`.gitignore`)和樣板入口檔(`index.html`、`main.jsx`)。

**2. 兩種 package.json 的差異**
- 手動 `npm init` 產生的:只有 `name`、`version`、`author`、`license` 等「套件元數據」,**沒有** `scripts` 和 `devDependencies`。
- Vite 腳手架產生的:含 `scripts`(`dev`/`build`/`serve`)和 `devDependencies`(`vite`),才是可用的 Vite 專案。
- 若你的 package.json 還停在第一種,代表還沒跑 Vite 專屬初始化腳本。

**3. `npm create vite@latest` vs `npm init @vitejs`**
兩者功能等效,都在啟動 `create-vite` 腳手架。
- `npm init @vitejs` → 舊式/簡寫,NPM 自動解析為 `@vitejs/create-app`。
- `npm create vite@latest` → 新式標準寫法,等同 `npx create-vite@latest`(`create-*` 慣例)。
- `-- --template react`:`--` 用來分隔 npm 本身參數與要傳給底層腳手架的參數;`--template react` 直接跳過互動式「選框架」步驟。
- 建議用新寫法:`npm create vite@latest 專案名 -- --template react`。

**4. 缺 main.tsx / src/ 代表腳手架沒建成功**
正常成功會有 `src/`、`index.html`、`main.jsx`/`main.tsx`。若只剩手動建的 package.json,通常是腳手架被中斷或無法寫入(常因之前手動 `npm init` 造成衝突)。解法:到乾淨的空資料夾重跑 `npm create vite@latest ... -- --template react`,再 `cd` 進去執行 `npm install`(腳手架只建檔,不裝依賴)。

**5. 如何判斷建立成功**
終端機出現 `Scaffolding project with React` + `VITE vX ready in ...ms`(Dev Server 啟動)即成功。Windows 上的 `npm WARN ... EBUSY: resource busy or locked` 是檔案鎖定的**非致命警告**(防毒/VS Code/另一個終端機鎖住了目錄),Dev Server 有起來就可忽略;真要清乾淨就關掉所有 VS Code 與終端機再重跑 `npm install`。

**6. react-scripts**
是 Create React App(CRA)的核心引擎,實現「零配置」開發體驗,把底層工具封裝起來:打包器 Webpack、轉譯器 Babel、Linter ESLint、測試 Jest。提供 `start`/`build`/`test`/`eject` 四個腳本(`eject` 會把所有封裝的配置暴露出來,單向不可逆)。對比 Vite:CRA 開發時必須先用 Webpack 全量打包(專案越大越慢);Vite 用瀏覽器原生 ESM,啟動與 HMR 不受專案規模影響(生產用 Rollup,依賴預打包用 esbuild)。

**7. Encode(編碼)≠ Encryption(加密)**
編碼是把資料從一種格式翻譯成另一種,目的是相容與傳輸,規則公開、誰都能 decode;加密是為了保密,需要金鑰。常見編碼:UTF-8(字元編碼)、URL/Percent-encoding(處理網址特殊字元,如中文→`%E4%BD%A0`)、Base64(二進位轉文字,常用於 Data URL 把圖塞行程式碼)、HTML Entity(`<`→`&lt;`,防 XSS 誤渲染)。

**8. Mem0 的五大工廠(Factory Pattern)**
AI 記憶框架 Mem0 用五個工廠達到高擴充性/解耦:
- LLM Factory:產生大語言模型實例(可切 OpenAI/Anthropic/Ollama)。
- Embedder Factory:產生向量嵌入模型實例。
- Vector Store Factory:產生向量資料庫實例(Qdrant/Chroma/Pinecone)。
- Graph Store Factory:產生知識圖譜資料庫實例(Neo4j),存實體間關係。
- Memory Factory:大總管,組裝以上四者,負責記憶的儲存、檢索、自動更新。
工廠模式的好處是換底層(例如 Qdrant→Pinecone)只要改一個工廠設定,不用動記憶邏輯。(另註:memU 是更進階概念,強調「記憶即 Agent」,會在背景主動運作更新。)

**9. 向量資料庫優缺點**
- 優點:語義搜尋(比對語義而非關鍵字,「汪星人」≈「狗狗」)、能處理非結構化資料(圖片/音訊/長文)、是 RAG 與 AI 記憶的最佳拍檔(減少幻覺)、擅長高維度檢索。
- 缺點:多用 ANN(近似最近鄰)為了速度,結果不保證 100% 精確;為求極速需把索引載入 RAM,成本高;插入新資料要重算與重平衡索引,不適合超高頻即時讀寫;換 Embedding 模型時舊資料全部要 re-index。
- 對比:傳統 SQL 是精確匹配、結果是/否、擅長帳務訂單;向量 DB 是相似度匹配、回傳 0~1 相似度分數、擅長 AI 聊天/圖片檢索/推薦。

## 完整原文

**使用者:** scaffolding project是什麼意思

**Gemini:** scaffolding project 常被翻譯為「專案腳手架/鷹架」。
- 定義:腳手架是一種自動化工具或程序,用於快速生成新專案的初始結構、基礎程式碼和標準配置,幫開發者避免從零開始的重複設置工作。
- 實際內容:標準目錄結構(`src/`、`public/`、`assets/`)、配置文件(`package.json`、`vite.config.js`、`.gitignore`)、樣板程式碼(`index.html`、`main.js`/`App.vue`)。
- 與 `npm init @vitejs` 的關係:該指令執行 `@vitejs/create-app`,引導你選框架並自動搭建初始結構。Project Scaffolding 是建立基礎結構的「行為」,`npm init @vitejs` 是執行此行為的「工具」。

**使用者:** 為什麼我的(白色背景)跟他的不一樣?我少做了什麼?除了我是用react他是用原生JS

**Gemini:** 差異與選 React/原生 JS 無關,而是初始化指令不同。
- 你的(白底):由手動 `npm init` 產生,只有 `name/version/description/main/keywords/author/license` 等套件元數據,沒有 Vite 依賴與運行腳本。
- 作者的(黑底):由 `npm init @vitejs/app` 腳手架產生,含 `scripts`(`dev`/`build`/`serve`)和 `devDependencies`(`vite`)。
- 你少做的關鍵步驟:執行 Vite 專屬初始化腳本。需在專案根目錄執行 `npm init @vitejs/app .`(末尾 `.` 表示在當前目錄建立),再 `npm install`,package.json 才會出現 scripts 與 devDependencies。

**使用者:** `npm create vite@latest vite-react-project -- --template react` 跟 `npm init @vitejs` 差在哪

**Gemini:** 兩者功能等效,都用於啟動 Vite 腳手架(`create-vite`)。
- `npm init @vitejs`:舊式/簡寫,NPM 自動解析為 `@vitejs/create-app`。
- `npm create vite@latest`:新式標準寫法,等同 `npx create-vite@latest`(`create-*` 慣例)。
- 參數:`vite-react-project` 是新專案名;`--template react` 直接指定 react 模板、跳過互動問答;`--` 用來分隔 npm 指令參數與傳給底層 `create-vite` 的參數(標準命令行慣例)。
- 建議使用新指令:`npm create vite@latest 你的專案名稱 -- --template react`(更符合現代慣例、更快)。

**使用者:** 我用後者初始化專案,我的專案中沒有自動出現main.tsx這些入口檔案是不是代表沒有建立成功

**Gemini:** 是的,缺少 `main.tsx` 或 `src/` 等入口檔案代表腳手架沒完全成功。
- 若資料夾內只有手動建的 `package.json`,而沒有 `src/`、`index.html`、`main.jsx`/`main.tsx`,幾乎可確定腳手架被中斷或無法寫入(常因之前手動 `npm init` 造成檔案衝突)。
- 解決方案:在全新乾淨資料夾重跑。步驟一:回上層、`npm create vite@latest vite-react-app -- --template react`。步驟二:`cd vite-react-app` 後 `npm install`(腳手架只建檔不裝依賴,裝完才算就緒)。
- 成功結構範例:`node_modules/`、`public/vite.svg`、`src/`(含 `assets/`、`App.jsx`、`main.jsx`)、`index.html`、`package.json`。

**使用者:** 那我這樣有建立成功嗎

**Gemini:** 專案骨架建立成功,`npm install` 過程有小錯誤但 Dev Server 最終成功啟動。
- 成功訊號:終端機顯示 `Scaffolding project with React`;檔案結構完整(`node_modules/`、`public/`、`src/`、`index.html`、`package.json`、`tsconfig.json` 表示選了 TypeScript variant);Dev Server 啟動(`Starting dev server...`、`VITE v2.2.2 ready in 900 ms`)。
- 遇到的錯誤:`npm WARN cleanup Failed to remove some directories [Error: EBUSY: resource busy or locked, rmdir '.../node_modules/@esbuild/win32-x64']` — 典型 Windows 檔案鎖定錯誤(Defender/防毒/其他終端機鎖住目錄),通常非致命。Dev Server 有起來代表核心依賴已裝好。
- 建議:瀏覽器訪問 `http://localhost:5173/` 確認;忽略 EBUSY,真要修就關掉所有 VS Code 與終端機後重跑 `npm install`。

**使用者:** react-scripts是什麼套件

**Gemini:** `react-scripts` 是 NPM 套件,是 Create React App(CRA)的核心引擎,負責 React 應用的建構、開發、測試配置。
- 核心價值:零配置,把底層工具抽象隱藏 —— 打包器 Webpack、轉譯器 Babel(JSX/ES6+ 轉換)、Linter ESLint、測試 Jest。
- 提供四個命令:`start`(Webpack Dev Server + HMR)、`build`(生產環境打包,minify/tree-shaking)、`test`(單元測試)、`eject`(把所有封裝配置暴露出來手動修改,單向操作)。
- 與 Vite 的時代差異:CRA 開發時必須先用 Webpack 完整打包,專案越大啟動越慢、HMR 越慢,底層 Webpack;Vite 用瀏覽器原生 ESM,啟動極速、HMR 與規模無關,底層 Rollup(生產)/esbuild(依賴預打包)。結論:Vite 繞過了 Webpack 開發階段全量打包的瓶頸。

**使用者:** Encode是啥

**Gemini:** Encode(編碼)是將資訊從一種格式「翻譯」成另一種格式的過程,核心目的是確保資料能被正確傳輸、儲存或處理而不被誤解。
- 字元編碼:UTF-8 是全球最通用標準(選錯如用 Big5 開 UTF-8 會亂碼)。
- URL 編碼(Percent-encoding):處理網址中的空格/中文等特殊字元,如「你好」→ `%E4%BD%A0%E5%A5%BD`。
- Base64:把圖片二進位轉成一長串文字,方便在純文字環境(CSS/HTML)傳輸二進位檔。
- HTML Entity 編碼:`<`→`&lt;`、`>`→`&gt;`,防止瀏覽器誤把字串當標籤渲染(防 XSS 基本手段)。
- 重要區別:Encode ≠ Encryption。編碼為相容與傳輸、規則公開、誰都能 decode;加密為保密、需要金鑰(AES/RSA)才能 decrypt。

**使用者:** Memu 的五大工廠 是什麼

**Gemini:** 「Memu」很可能指 AI Agent 記憶框架 Mem0,其核心設計透過「五大工廠模式(Factory Pattern)」達成高擴充性:
- LLM Factory:生產大語言模型實例,統一不同模型呼叫介面(OpenAI/Anthropic/Ollama)。
- Embedder Factory:生產向量嵌入模型實例(決定用 OpenAI text-embedding-3 或 HuggingFace 等)。
- Vector Store Factory:生產向量資料庫實例(Qdrant/Chroma/Pinecone 或本地)。
- Graph Store Factory:生產知識圖譜資料庫實例(Neo4j),能存實體間關係,是 Mem0 特色。
- Memory Factory:大總管,把上述四個工廠的零件組裝起來,協調記憶儲存、檢索、自動更新,是開發者直接互動的入口。
工廠模式好處是「解耦」:換資料庫(Qdrant→Pinecone)只要在對應工廠改設定,不用動記憶邏輯。另註:memU 是更進階概念,強調「記憶即 Agent」,記憶會在背景主動運作更新。

**使用者:** 向量資料庫的優缺點

**Gemini:**
- 核心概念:與傳統資料庫(MySQL)不同,向量 DB 比對的是「語義」而非「關鍵字」,把文字/圖片/音訊轉成高維度向量,計算空間中的距離(相似度)。
- 優點:① 語義搜尋(「汪星人」能理解與「狗狗」相近);② 處理非結構化數據(圖片/音訊/長文向量化後統一管理);③ RAG 與 AI 記憶最佳拍檔(提供背景資訊,減少幻覺);④ 高維度檢索能力(數百~數千維優化)。
- 缺點:① 準確性與召回率平衡 —— 多用 ANN(近似最近鄰)追求速度,結果不一定 100% 精確;② 資源消耗高 —— 索引需載入 RAM,成本貴;③ 索引更新較慢 —— 插入新資料要重算重平衡,不適合超高頻即時讀寫;④ 維護複雜 —— 換 Embedding 模型後舊資料全要 Re-index。
- 對比:傳統 SQL = 精確匹配/結果是或否/擅長帳務訂單;向量 DB = 相似度匹配/回傳 0~1 相似度分數/擅長 AI 聊天、圖片檢索、推薦系統。

**使用者:** 幫我把以上對話做成簡報

**Gemini:** 產生了一份技術簡報「現代前端開發與 AI 記憶系統全解析」(Canvas,6月2日 下午4:13),涵蓋前端架構選擇、專案腳手架配置到 AI 記憶系統與向量資料庫核心概念。
