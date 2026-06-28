---
title: 前端開發工具總覽:打包、編譯、Lint 與 Parser
type: topic-note
source: Gemini
category: 技術
tags: [gemini, frontend, 打包工具, webpack, vite, eslint, prettier, parser, compiler]
sources:
  - https://gemini.google.com/app/60eb0e34d9fc653b
updated: 2026-06-25
---

# 前端開發工具總覽:打包、編譯、Lint 與 Parser

## 重點整理

一條故事線串起整個開發流程:<mark style="background: #ADCCFFA6;">Parser 先讀懂程式碼 → Compiler 翻譯 → ESLint/Prettier 把關品質與風格 → 上線時打包工具做編譯壓縮打包 → React DevTools 協助偵錯</mark>。

### 1. Parser 與 Compiler(最基礎)

- <mark style="background: #ADCCFFA6;">**Parser(解析器)**</mark>:把程式碼文字拆解成電腦能理解的結構,也就是 <mark style="background: #FFF3A3A6;">AST(抽象語法樹)</mark>。像把句子拆成主詞、動詞、受詞。例如讀到 `SELECT g.*, u.name FROM group`,會辨認 `SELECT` 是關鍵字、`g.*` 是欄位、`FROM` 後面是資料表,生成語法樹。
- <mark style="background: #ADCCFFA6;">**Compiler(編譯器)**</mark>:把某語言轉成另一語言或機器碼。第一步通常就用 Parser 解析,再把結果轉成目標格式(機器碼、JavaScript、Bytecode)。

### 2. 打包工具(Bundling Tools)

為什麼需要?開發時的程式碼含偵錯工具、未壓縮、好讀的註解;為了上線快又穩,用打包工具做<mark style="background: #FFF3A3A6;">「生產(production)打包」</mark>。三大任務:

1. <mark style="background: #BBFABBA6;">**編譯 Compilation**</mark>:把現代 JS(JSX / TypeScript)轉成所有瀏覽器都懂的標準 JS。
2. <mark style="background: #BBFABBA6;">**壓縮 Minification**</mark>:移除註解、空格、換行,縮短變數名,縮小檔案。
3. <mark style="background: #BBFABBA6;">**打包 Bundling**</mark>:把多個檔案合併成一兩個,減少瀏覽器請求次數。

> [!note] 看到「This page is using the production build of React」就代表:這網頁用的是經打包工具優化後的 React,已準備好上線,而非開發模式。

| 工具 | 語言 | 特點 |
|---|---|---|
| **Webpack** | JS | 歷史悠久、生態成熟穩定;但每次變動可能重編大部分模組,大型專案 <mark style="background: #FF5582A6;">HMR 熱更新較慢</mark>;需大量 Loaders/Plugins;適用所有前端框架 |
| **Turbopack** | Rust | Vercel 開發,<mark style="background: #BBFABBA6;">增量編譯只重編有變動的部分,更快</mark>;專為 Next.js 打造,Next.js 13 後為預設;指令如 `next dev --turbo` |
| **Vite** | — | 現代開發伺服器 + 打包,常見的快速選擇 |

### 3. ESLint vs Prettier(程式碼品質工具)

兩者解決的問題完全不同,常一起使用:

- <mark style="background: #ADCCFFA6;">**ESLint(靜態分析 Linting)**</mark> = 文法老師。關注程式碼<mark style="background: #FFF3A3A6;">「品質」與潛在問題</mark>:語法錯誤、bad practice、潛在 bug、未使用變數等。規則高度可客製。
- <mark style="background: #ADCCFFA6;">**Prettier(格式化 Formatting)**</mark> = 美妝師。只關注<mark style="background: #FFF3A3A6;">「外觀」</mark>:縮排、換行、括號、分號、單雙引號。規則極少、幾乎免設定、一鍵格式化。

`.eslintrc.json` 是 ESLint 的設定檔,定義風格(分號、引號)、潛在錯誤規則、執行環境(瀏覽器 / Node)。<mark style="background: #D2B3FFA6;">**rc = Run Commands**</mark>,源自 Unix/Linux(如 `.bashrc`):程式啟動時自動讀取並執行此檔的設定。

### 4. React Developer Tools

瀏覽器擴充功能,像 React 網站的「X 光機」:

- **偵測網站**:若是 React 寫的,圖示會亮起。
- **元件檢查器**:以樹狀查看由哪些 React 元件組成,點任一元件可檢查 <mark style="background: #FFB8EBA6;">props 與 state</mark>(偵錯核心)。
- **Profiler 效能分析**:記錄特定操作的渲染效能,找出渲染較差的元件來優化。

### 5. Parser「名牌」整理

**JS/TS 四大名牌:**

- <mark style="background: #FFF3A3A6;">**Acorn(橡實)**</mark>:JS 界最流行的輕量解析器,Webpack、Rollup、ESLint 底層預設都用它,快又小。
- **@babel/parser(原 Babylon)**:Babel 團隊維護,寫 JSX 或實驗階段語法一定用到,基於 Acorn 改寫。
- **Esprima**:經典老牌,早期工具基石(早期 ESLint),教科書級。
- **SWC / Biome(Rust)**:現代為求極速用 Rust 重寫,SWC 為代表,Next.js 內部使用。

**資料格式內建款:** `JSON.parse()`(JS 內建 JSON 解析器);V8 / SpiderMonkey(瀏覽器內建 HTML/CSS Parser)。

**解析器產生器(Parser Generator)** — 給語法規則就自動生 Parser:<mark style="background: #D2B3FFA6;">ANTLR(跨語言頂級,常用於 SQL/搜尋指令)</mark>、Bison / Yacc(C/C++ 編譯器課祖師爺)。

> [!tip] 你寫的 React 程式碼交給 Acorn / Babel 拆解;後端那條 `SELECT … FROM group` SQL 則常交給 ANTLR 寫出來的 SQL Parser 處理。

## 各對話來源

### 前端開發工具筆記整理 (2026-06) — https://gemini.google.com/app/60eb0e34d9fc653b

**使用者:** (貼上自己關於 Parser / Compiler / 打包工具 / React DevTools / ESLint vs Prettier 的零散筆記) 你覺得我這些筆記要怎麼整理比較好?

**Gemini:** 建議分四個區塊有系統地整理:① 編譯與解析核心(Parser=讀懂拆解、Compiler=翻譯,第一步用 Parser);② 深入打包工具(為何需要、編譯/壓縮/打包三任務、Webpack vs Turbopack);③ 開發工具功用(React DevTools 像 X 光機:元件檢查器看 props/state、Profiler 分析渲染效能);④ 程式碼品質工具區別(ESLint 文法老師管品質、Prettier 美妝師管格式)。一句話故事:Parser 讀懂 → Compiler 翻譯 → ESLint/Prettier 把關 → 打包工具上線優化 → DevTools 偵錯。

**使用者:** `.eslintrc.json` 是什麼樣的文件?rc 代表什麼?

**Gemini:** 它是 ESLint 的設定檔,定義風格(分號、單雙引號)、潛在錯誤(禁未使用變數)、執行環境(瀏覽器/Node)。rc = Run Commands(執行指令),源自 Unix/Linux(如 .bashrc):程式啟動時自動讀取執行此檔設定。

**使用者:** 解析器有哪些「牌子」?

**Gemini:** 技術上稱套件/工具/引擎。JS/TS 四大:Acorn(最流行輕量,Webpack/Rollup/ESLint 底層)、@babel/parser(JSX/實驗語法,基於 Acorn)、Esprima(經典老牌)、SWC/Biome(Rust 重寫求速,Next.js 用 SWC)。資料格式:JSON.parse()、瀏覽器內建 V8/SpiderMonkey。解析器產生器:ANTLR(跨語言頂級,SQL 常用)、Bison/Yacc(C/C++ 祖師爺)。
