---
title: Vite 開發模式的 HMR 機制與 Rollup 打包原理
type: topic-note
source: Gemini
tags: [gemini, vite, hmr, rollup, esbuild, frontend]
related:
  - "[[Vite環境變數與API-BaseURL連接前後端]]"
  - "[[前端開發工具-打包編譯Lint與Parser]]"
sources:
  - https://gemini.google.com/app/645397a8aa918a79
updated: 2026-08-06
---

# Vite 開發模式的 ESM、HMR 機制與生產模式 Rollup 打包原理

> 本篇重點 (a)–(h)，共 8 個。與 [[Vite環境變數與API-BaseURL連接前後端]]、[[前端開發工具-打包編譯Lint與Parser]] 互為延伸：前者談環境變數與跨服務串接，這篇談「為什麼開發階段不用打包」與「HMR 壞掉時為何整頁空白」的底層原理。

## 重點整理

### (a) Vite 開發階段「免打包」的原理

<mark style="background: #ADCCFFA6;">Vite 在開發階段（`vite dev`）確實是不用打包的開發伺服器</mark>，原理是利用瀏覽器本身對 <mark style="background: #FFF3A3A6;">Native ES Module</mark> 的支援：

1. Vite 伺服器收到瀏覽器對模組（`import X from './X.js'`）的請求。
2. 伺服器即時把該檔案做**轉換**（Transform）：`.vue` 轉 JS、Sass 轉 CSS、TypeScript 轉 JavaScript。
3. 轉換後的檔案以標準 ES Module 形式回傳給瀏覽器。

優勢：<mark style="background: #BBFABBA6;">省去傳統 Webpack 等工具啟動時「整包打包」的時間</mark>，因此有極快的啟動速度與即時的請求處理。

### (b) 「只能在開發階段使用」是誤解

<mark style="background: #FF5582A6;">正確認知：Vite 的免打包機制只適用於開發階段，但 Vite 本身並非只能在開發階段使用的工具</mark>——它是完整的建置系統，生產環境（`vite build`）仍會用 **Rollup** 執行傳統打包（優化、Tree Shaking、Code Splitting），生成可部署的靜態檔案。

### (c) HMR 的定義

<mark style="background: #ADCCFFA6;">HMR（Hot Module Replacement）</mark>的目標是**替換程式碼的局部模組**，不必刷新整個頁面、也不丟失應用程式狀態。Vite 利用 ES Module 的依賴圖譜，檔案被修改時只把該檔案及其依賴樹上的相關模組推送給瀏覽器替換。

### (d) 畫面空白／HMR 降級的兩種成因

<mark style="background: #FF5582A6;">「壞掉就整頁空白」不代表 HMR 失敗，而是降級為 Full Reload 的保護機制</mark>：

1. **致命編譯錯誤**（語法錯誤、找不到模組）：Vite 伺服器無法完成轉換，或瀏覽器無法解析收到的模組 → Vite 執行 <mark style="background: #FFF3A3A6;">Full Reload（整頁刷新）</mark>，並把錯誤覆蓋在畫面上以確保執行環境乾淨。
2. **根組件或核心程式碼發生錯誤**：若修改的是應用程式的根組件（Root Component）或全域狀態（Global State）初始化邏輯，即使 HMR 成功替換模組，應用程式狀態可能已壞到無法恢復，導致頁面崩潰或無法渲染。

### (e) 與 Next.js／其他框架的 HMR 品質差異

- Next.js（或部分 Webpack 架構）可能提供更精細的 <mark style="background: #ADCCFFA6;">Error Boundary（錯誤邊界）</mark>處理，讓非核心組件的錯誤不致整頁崩潰。
- HMR 的實際品質高度依賴**所使用的框架**（如 React Fast Refresh vs. Vue HMR API）及其錯誤處理機制；畫面空白多半是 HMR 機制無法安全替換模組，或錯誤過於嚴重而降級為 Full Reload。

### (f) Rollup 是什麼

<mark style="background: #ADCCFFA6;">Rollup</mark> 是專門針對 JavaScript 模組（尤其是 ES Modules）設計的模組打包工具，由 Svelte 創辦人 <mark style="background: #FFF3A3A6;">Rich Harris</mark> 開發，是 JS 生態系中最早引入 <mark style="background: #FFF3A3A6;">Tree Shaking</mark>（剔除未使用程式碼）技術的打包器。核心特性：

- Tree Shaking：透過靜態分析 ES Module 的 import/export，精準剔除沒被實際呼叫的函式或變數，把打包檔案體積降到最低。
- 乾淨的輸出（Scope Hoisting）：不像 Webpack 會注入大量模組載入器與膠水程式碼，Rollup 傾向把模組串聯提升在同一層級，產出程式碼乾淨易讀，近似手寫原始碼。
- 多格式輸出：支援同時打包成 ESM、CJS、UMD、IIFE 等多種模組格式。

### (g) Rollup vs Webpack 的定位差異

| | Rollup | Webpack |
|---|---|---|
| 適合場景 | 開發 npm 套件與函式庫 | 大型 Web 應用程式 |
| 代表使用者 | React、Vue、D3 等主流庫內部打包 | 需要完整 Loader 機制、複雜資源處理（圖片/字型）、動態載入、HMR 的應用專案 |
| 輸出風格 | 檔案極小、乾淨、多格式 | 功能完整但相對笨重 |

### (h) Vite 為什麼生產環境選 Rollup

<mark style="background: #BBFABBA6;">Vite 開發環境用 esbuild 做預打包與檔案轉換，追求極致啟動速度；生產環境改用 Rollup 做最終打包</mark>，原因是 Rollup 在 CSS 處理、靜態資源優化、程式碼分割（Code Splitting）以及套件生態系（Plugin API）上非常成熟，能確保輸出最適合線上環境運行的檔案。

## 各對話來源

### Vite 開發模式與 HMR 探討（2026-08-05）— https://gemini.google.com/app/645397a8aa918a79

使用者：vite可以說是不用打包只能在開發階段使用的dev server嗎，因為直接跟ES module溝通所以免去了打包的時間並且有HMR的功能，但是壞掉的話也是整個畫面空白這樣算HMR嗎這樣我覺得還比NEXT差

Gemini：Vite 開發階段確實不用打包，是關鍵優勢，但說它「只能在開發階段使用」不準確，因為生產環境仍用 Rollup 打包。原理是利用瀏覽器對 Native ES Module 的支援，即時轉換檔案後回傳，省去整包打包時間。HMR 的定義是替換局部模組不刷新整頁；畫面空白通常是「致命編譯錯誤」或「根組件/全域狀態被破壞」導致降級為 Full Reload，HMR 實際品質也高度依賴框架實作（React Fast Refresh vs Vue HMR API）。

使用者：Rollup是什麼

Gemini：Rollup 是 Rich Harris（Svelte 創辦人）開發的 JS 模組打包工具，最早引入 Tree Shaking 技術，特色是乾淨輸出（Scope Hoisting）與多格式輸出（ESM/CJS/UMD/IIFE）。定位上 Rollup 適合開發函式庫（React/Vue/D3 底層都用它打包），Webpack 適合大型應用程式（完整 Loader、資源處理、動態載入、HMR）。Vite 生產環境選用 Rollup，因其在 CSS 處理、資源優化、Code Splitting 與 Plugin 生態上成熟。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/645397a8aa918a79 | 對話日期 2026-08-05，筆記整理 2026-08-06 |
| Vite 官方文件（Dev Server / Why Vite 原理） | https://vite.dev/guide/why | 建議之後直接查證官方文件版本以核對本篇描述是否過時 |
| Rollup 官方介紹與 Tree Shaking | https://rollupjs.org | 建議之後直接查證官方文件版本以核對本篇描述是否過時 |
