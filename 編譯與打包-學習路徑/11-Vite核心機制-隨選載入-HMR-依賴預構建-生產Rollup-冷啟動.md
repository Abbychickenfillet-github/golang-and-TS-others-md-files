---
title: 11-Vite 核心機制：隨選載入 · HMR · 依賴預構建 · 生產 Rollup · 冷啟動
aliases: [Vite核心機制, Vite面試重點, Vite dev HMR 預構建 冷啟動]
type: topic-note
category: 技術
tags:
  - vite
  - hmr
  - esm
  - esbuild
  - rollup
  - rolldown
  - buildtime
  - 面試
related:
  - "[[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】]]"
  - "[[script載入方式+前因後果]]"
  - "[[ESM模組作用域-為何不需要IIFE-與傳統Script對比]]"
  - "[[07-前端專案建立與打包選型-Vite與createVue與NextJS與npm鎖版本]]"
updated: 2026-09-10
---

# 11｜Vite 核心機制（面試複習用）

> **一句話總綱**：<mark style="background: #BBFABBA6;">Vite 把工作切成兩半——**依賴（少變）在 dev 啟動時用 esbuild/Rolldown 預構建一次**、**你的原始碼（常變）在瀏覽器用 native ESM 隨選載入、逐檔即時 transpile**；到了**生產**再用 Rollup／Rolldown 完整打包成高度優化的靜態檔。</mark>
>
> ⚠️ 全篇最容易考錯的一條線：<mark style="background: #FF5582A6;">**HMR、隨選載入、依賴預構建、冷啟動 全部是「開發階段（`vite dev`）」的機制；生產（`vite build`）沒有 dev server、沒有 HMR，只有一次打包後的靜態檔。**</mark>

## 🎯 面試速查總表（先背這張）

| 概念 | 屬於哪個階段 | 一句話（誰做什麼→產物） | 官方文件 |
|---|---|---|---|
| 隨選載入（on-demand） | <mark style="background: #ADCCFFA6;">**僅 dev**</mark> | 瀏覽器用 native ESM 對每個 `import` 發請求，Vite 才**即時逐檔 transpile 並回傳**當下這頁要的檔 | why |
| Lightning Fast HMR | <mark style="background: #ADCCFFA6;">**僅 dev**</mark> | 改一檔只失效「該模組→最近 HMR 邊界」那一小段，**毫秒級、與專案大小無關** | why / features |
| 依賴預構建 | <mark style="background: #ADCCFFA6;">**僅 dev**</mark> | esbuild（≤v7）/ Rolldown（v8）把 CJS/UMD 轉 ESM＋把一包幾百個內部模組併成一支 → 少發 HTTP 請求 | dep-pre-bundling |
| 冷啟動 | <mark style="background: #ADCCFFA6;">**僅 dev**</mark> | 首次啟動只做「預構建依賴一次」，原始碼不預打包 → 啟動快且**不隨專案線性變慢** | why |
| 生產打包 | <mark style="background: #FFF3A3A6;">**僅 build**</mark> | Rollup（v8：Rolldown）做 tree-shaking／code-splitting／壓縮 → 高度優化的 `dist/` 靜態檔 | build / why |
| 開箱即用 | 兩者皆是 | TS／JSX／CSS／JSON／WASM 免手動配 loader，預設就會處理 | features |

---

## 1. 開發階段（`vite dev`）與 HMR

### a. 為什麼能「隨選載入」（需要時才即時載入）
瀏覽器早已原生支援 ESM，所以 <mark style="background: #BBFABBA6;">Vite 把「決定載入順序」這件事交還給瀏覽器</mark>：dev server 不預先把你的原始碼打包，瀏覽器遇到一個 `import` 才發 HTTP 請求，Vite **當下**把那一支檔 transpile 成瀏覽器能吃的 ESM 回傳。**只載入當前頁面需要的模組**，所以啟動不必等整包做完。

### b. 傳統 HMR 為什麼會「線性變慢」
傳統 bundler-based 的 HMR：改一個檔，得沿著相依鏈重建一段 bundle；<mark style="background: #FF5582A6;">相依鏈越長、專案越大，更新速度就線性下降（update speed degrading linearly）</mark>——編輯單一檔案卻牽動一大片 codebase。

### c. Vite 基於 ESM 的 HMR：精確更新、毫秒級（這是否專指 dev？）
<mark style="background: #BBFABBA6;">**是，專指 `vite dev`。**</mark> HMR 本來就是 dev server 的功能。Vite 的 HMR 走 native ESM：改一檔時，只**精確失效「被改的模組」到「最近一個 HMR 邊界」之間那一小段**，其餘照用瀏覽器快取，所以<mark style="background: #FFF3A3A6;">不管專案多大都維持毫秒級</mark>。

### d. 「Lightning Fast HMR」在生產也有嗎？—— 沒有，講清楚
| | 開發 `vite dev` | 生產 `vite build` → 部署 |
|---|---|---|
| 有沒有 dev server／HMR | <mark style="background: #BBFABBA6;">有，HMR 是這階段專屬</mark> | <mark style="background: #FF5582A6;">**沒有**。產物是一批靜態檔，使用者拿到的是「打包後結果」，不會熱更新</mark> |
| 改了程式碼會怎樣 | 存檔→瀏覽器毫秒級局部更新 | 要**重新 `vite build` 再部署**一次 |

---

## 2. 生產環境構建（`vite build`）

### a. 用什麼打包
`vite build` 用 <mark style="background: #ADCCFFA6;">**Rollup**（Vite v8 起改 **Rolldown**）</mark>做打包，輸出**高度優化**的靜態資源（highly optimized static assets），設定已預先調好、開箱可用。

### b. 為什麼 dev 不用 bundle，生產卻仍要打包？
<mark style="background: #FF5582A6;">因為「不打包的原生 ESM」直接上生產會有大量巢狀 import 造成的網路來回（round trips），即使有 HTTP/2 也不理想。</mark>生產仍需要打包來做這些**只有打包才給得起的最佳化**：<mark style="background: #FFF3A3A6;">code splitting（切塊）、tree shaking（砍死碼）、compression（壓縮）</mark>，以求最佳載入效能。

### c. 內建預先配置（不用你手動設）
CSS code splitting、非同步 chunk 載入最佳化（async chunk loading optimization，讓被切出去的塊在需要時才載且不互相卡）、大量模組載入優化，以及**動態 import 的 polyfill 自動補全**。

---

## 3. 依賴預構建（Dependency Pre-Bundling）— 僅 dev

> ⚠️ 這是 **dev 專屬**機制（`node_modules/.vite` 內有快取）；生產不走這條，生產的 CJS 轉換交給 `@rollup/plugin-commonjs`。

### a. 解決什麼問題（為何需要）
兩個痛點：
- <mark style="background: #ADCCFFA6;">**格式問題**</mark>：不少 npm 套件只出 **CommonJS／UMD**，但 dev server 要餵瀏覽器的是 **ESM**——格式不合。
- <mark style="background: #ADCCFFA6;">**請求數災難**</mark>：有些套件把 ESM 拆成幾百個彼此 import 的小檔（<mark style="background: #FFF3A3A6;">例如 `lodash-es` 有 600+ 個內部模組</mark>），若讓瀏覽器直接對每個檔發請求，一次 `import { debounce } from 'lodash-es'` 就會噴 **600+ 個 HTTP 請求**。

### b. Vite 怎麼做
<mark style="background: #BBFABBA6;">用 **esbuild（≤v7）／Rolldown（v8）** 在 dev 啟動時把依賴預構建一次</mark>：把 CJS／UMD **轉成 ESM**，並把一個套件的多個內部模組**合併成一支**，讓瀏覽器對每個依賴只需**一個**請求，載入更快。esbuild 用 Go 寫、比 JS 打包器快 10–100 倍，這也是冷啟動快的關鍵。

### c. 為何是「開發階段」的機制
因為它服務的是「dev server 用 native ESM 餵瀏覽器」這個情境——生產是一次打包好、不靠瀏覽器逐檔請求，所以生產不需要它。

---

## 4. 開箱即用（Out-of-the-box Support）

### a. 「Out of the box」是什麼意思
<mark style="background: #BBFABBA6;">**裝好、用預設值就能直接用，不必自己額外裝／設定 loader 或 transpile 工具。**</mark>（相對於 Webpack 動輒要配一堆 `*-loader`／plugin。）

### b. 原生支援哪些
| 型別 | Vite 預設怎麼處理 | 面試提醒 |
|---|---|---|
| **TypeScript** | esbuild 只做 transpile（把型別剝掉），比 `tsc` 快約 20–30× | <mark style="background: #FF5582A6;">**只轉譯、不做型別檢查**！型別錯誤要靠 `tsc --noEmit`／IDE／CI 另外把關</mark> |
| **JSX／TSX** | 一樣交 esbuild 轉譯，開箱即用 | 非 React 專案可設 `esbuild.jsxFactory` 等 |
| **CSS** | `import './x.css'` 會把內容用 `<style>` 注入、支援 HMR、`@import`、CSS Modules、code splitting | — |
| **JSON** | 可直接 `import`，也支援具名匯入（named import） | — |
| **WASM** | 可 `import` 預編譯的 `.wasm`（要控制實例化用 `?init`） | — |

**共同點**：<mark style="background: #FFF3A3A6;">No loader configuration needed</mark>——這些都不用你手動配 loader。

---

## 5. 冷啟動（Cold Start）— 原本筆記漏的部分，補上

### a. 什麼是冷啟動
指「**第一次啟動 dev server（或快取不存在時）到能在瀏覽器看到畫面**」的那段時間。

### b. 傳統工具的冷啟動為何慢
傳統 bundler 會<mark style="background: #FF5582A6;">在服務任何東西之前，先把整個 app 打包一遍</mark>——app 越大，冷啟動等越久（原文：a large project might take Webpack 30 seconds to start）。

### c. Vite 的冷啟動為何快又「不隨規模變慢」
<mark style="background: #BBFABBA6;">兩段策略：①依賴用 esbuild／Rolldown（Go／Rust）預構建**一次**；②原始碼**完全不預打包**，交給瀏覽器 native ESM 隨選載入。</mark>所以冷啟動時間主要只花在「預構建依賴」那一次，而**原始碼量不進冷啟動成本**——這就是為什麼大型專案 Webpack 要 30 秒、Vite 只要約 300 毫秒。

### d. 冷 vs 熱：第二次更快
預構建結果會被快取在 `node_modules/.vite`，並對瀏覽器下**強快取標頭**；<mark style="background: #FFF3A3A6;">只要依賴沒變（`package.json`／lockfile／config 沒動），下次啟動就直接用快取、跳過重新預構建</mark>，這就是「熱啟動」比冷啟動更快的原因。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間（查證：2026-09-10） |
| --- | --- | --- |
| Why Vite：native ESM、隨選載入、冷啟動、生產為何仍要打包 | https://vite.dev/guide/why | Vite 官方 guide（v8 線）|
| Features：TS／JSX／CSS／JSON／WASM 開箱即用、HMR、TS 只轉譯不檢查 | https://vite.dev/guide/features | Vite 官方 features |
| 依賴預構建：CJS/UMD→ESM、lodash-es 600+ 模組、esbuild/Rolldown、dev-only、生產用 @rollup/plugin-commonjs | https://vite.dev/guide/dep-pre-bundling | Vite 官方 dep-pre-bundling |
| 生產打包 Rollup/Rolldown 與內建優化（CSS 切分、async chunk、preload、polyfill） | https://vite.dev/guide/build | Vite 官方 build |
| Vite 8 起預構建改用 Rolldown | https://vite.dev/blog/announcing-vite8 | Vite 8 發佈公告 |
