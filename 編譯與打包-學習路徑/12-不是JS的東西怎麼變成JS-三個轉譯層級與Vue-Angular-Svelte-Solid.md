---
title: "不是 JS 的東西怎麼變成 JS：三個轉譯層級與 Vue / Angular / Svelte / Solid"
type: topic-note
source: Claude
category: 技術
tags: [transpile, compiler, vue, sfc, angular, ivy, svelte, solid, jsx, tsx, build-time, runtime, tokenize]
related:
  - "[[05-JSX轉譯機制-createElement與jsx-runtime-Babel與SWC三步驟]]"
  - "[[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】]]"
  - "[[04-V8引擎完整管線-Parse到Deoptimization-【編譯runtime】]]"
  - "[[script載入方式+前因後果]]"
  - "[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]"
updated: 2026-09-10
---

# 不是 JS 的東西怎麼變成 JS

> 本篇重點 a–n，共 14 個。
> 承接 [[05-JSX轉譯機制-createElement與jsx-runtime-Babel與SWC三步驟]]：那篇講 JSX 一種，本篇把「所有非標準 JS 的東西」一次盤點，並提出一個**三層級分類**去看現代函式庫與 JS 的關係。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | build-time 與 run-time 都有 tokenize，差在哪？ | 目的不同：build-time 是 **source → source**（為了改寫）；run-time 是 **source → executable**（為了執行） | §0 |
| Q2 | `.vue` 會變成 JS 嗎？ | **會，而且是徹底變成 JS**。官方定義：`.vue` 對外就是一個 ES module，default export 一個 component object | §2 |
| Q3 | Angular 呢？ | 更徹底。template 被編譯成 **Ivy instruction 呼叫**，AOT 是預設；JIT 只剩開發／測試用 | §3 |
| Q4 | 那 Svelte 跟 Solid 有什麼不同？ | 它們把 **framework runtime 本身編譯掉了**，產物直接是 DOM 操作 | §4 |
| Q5 | `.scss`、`.png`、`.json` 也會變 JS 嗎？ | CSS 不會；但 `.png` / `.json` 會被包成 **JS 模組**，因為 bundler 的相依圖只認 JS 模組 | §5、§6 |

---

## 0. 先確認：兩次 tokenize 的目的不同

- (a) 你說對了 — 同一份原始碼確實被 tokenize 兩次，但**目的完全不同**：

| | build-time 的 tokenize | run-time 的 tokenize |
|---|---|---|
| 誰做 | esbuild / SWC / Babel / acorn / tsc | **V8**（或 SpiderMonkey、JavaScriptCore） |
| 本質 | **source → source** | **source → executable** |
| 目的 | 為了**改寫**：分析相依、去型別、展開 JSX、tree shaking、改名壓縮 | 為了**執行**：產生可以跑的 bytecode |
| 產物 | 還是**純文字 JS** | AST →（丟掉）→ bytecode → 熱點才變機器碼 |
| AST 留不留 | **丟掉**，只留輸出的字串 | AST 用完即丟，**bytecode 留著**（還能 code cache） |
| 做幾次 | 一次（開發者／CI） | 每個使用者各一次 |

- (b) 一句話：**build-time 的 parser 是「翻譯機的前端」，run-time 的 parser 是「執行引擎的前端」。** 它們用的是同一套編譯原理術語，但服務的是兩個完全不同的下游。

---

## 1. 主軸：三個轉譯層級（本篇的分類骨架）

不是所有「轉譯」野心都一樣。依「產物需不需要 framework runtime」可以分三層：

| 層級 | 名稱 | 在做什麼 | 產物需要 framework runtime 嗎 | 代表 |
|---|---|---|---|---|
| **Level 1** | 語法糖轉換（syntax-only） | 一對一映射，**不改變執行模型** | 不需要 | TS 去型別、新語法降級、`??` / `?.` |
| **Level 2** | 產生 runtime 呼叫（framework-aware） | 把宣告式模板翻成**呼叫 framework API 的 JS** | **需要**，缺了就跑不動 | JSX → `_jsx()`、Vue template → render function、Angular template → Ivy instructions |
| **Level 3** | 編譯掉 runtime（compile-away） | 直接產出**命令式 DOM 操作** | 幾乎不需要 | Svelte、Solid、Vue Vapor Mode |

- (c) ★ **這個軸就是「JS 與現代函式庫的關係」的answer**：越往 Level 3，函式庫在 run-time 的存在感越低，工作全被搬到 build-time。
- (d) 為什麼要搬？因為 [[script載入方式+前因後果]] (b) 那條公理：**主執行緒只有一條**。build-time 的 CPU 是開發者的、做一次；run-time 的 CPU 是每個使用者的、各做一次。**能搬去 build 做的都先搬**，是所有框架的共同動機。

---

## 2. Vue：`.vue` 徹底變成 JS

- (e) **官方定義**（Vue 官方 Glossary）：`.vue` 檔看起來不像 component object，但 SFC compiler 會把它轉成一個物件當作該檔的 default export。**從外部看，`.vue` 就是一個 ES module。**

### 2-1. `@vue/compiler-sfc` 的拆解流程

```text
Button.vue
   ↓ ① parse：把 SFC 拆成三個 block
   ├── <template> ──→ @vue/compiler-dom ──→ render() 函式（JS）
   ├── <script setup> ─→ compileScript() ──→ 一般的 setup() 函式（JS）
   └── <style scoped> ─→ 加上 data-v-xxxxxxx 雜湊 ──→ 獨立的 .css
   ↓ ② 組裝
export default { render, setup, __scopeId: "data-v-xxxxxxx" }   ← 純 JS 模組
```

- (f) `<style scoped>` 的原理沒有魔法：編譯器給該元件所有元素加一個 `data-v-<hash>` 屬性，再把 CSS 選擇器改寫成 `.btn[data-v-<hash>]`。**scoped 是屬性選擇器，不是真的樣式隔離**（不像 Shadow DOM）。
- (g) `defineProps()` / `defineEmits()` 這些叫 **compiler macro（編譯器巨集）**。它們長得像函式，但**根本不是函式** —— 編譯器看到這個字串就替換掉。所以不能取別名：`const dp = defineProps` 會直接報錯。

### 2-2. Vue 的獨門：compiler-informed virtual DOM

這是 Vue 3 最值得學的設計 —— **編譯器把情報交給 runtime，讓 diff 可以偷懶**：

| 優化 | 做什麼 | 效果 |
|---|---|---|
| **PatchFlags** | 編譯器在 vnode 尾巴標一個數字，說「這個節點只有 class 會變」 | runtime 用**位元運算**判斷，跳過所有靜態屬性的比對 |
| **Static Hoisting** | 靜態元素提到 render function **外面**，只建立一次 | 重新渲染時直接重用同一個 vnode；連續多個靜態元素會被壓成一段 `innerHTML` |
| **Block Tree（樹扁平化）** | 把所有「有 patch flag 的節點」收集成一個**扁平陣列** | diff 只走那個陣列，**不遞迴整棵樹** |

編譯產物長這樣：

```js
createElementVNode("div", {
  class: _normalizeClass({ active: _ctx.active })
}, null, 2 /* CLASS */)      // ← 這個 2 就是 PatchFlag
```

- (h) ★ 這是「**build-time 幫 run-time 省工**」最漂亮的範例。React 做不到同樣的事，因為 **JSX 是完整的 JavaScript**，編譯器無法靜態分析出「哪些節點永遠不變」；Vue template 是**受限的語法**，反而換來可分析性。**限制即優化空間。**

### 2-3. 例外：Vue 也可以在 run-time 編譯

- (i) ⚠️ Vue 有兩種 build 產物：

| 產物 | 內含 | 何時編譯 template |
|---|---|---|
| `vue.runtime.esm-bundler.js`（預設） | 只有 runtime | **build-time**（vue-loader／`@vitejs/plugin-vue`） |
| `vue.esm-bundler.js` / CDN 完整版 | runtime ＋ compiler | **run-time**，在瀏覽器裡編譯 template 字串 |

  完整版體積多約 14 KB，而且因為用 `new Function()` 產生 render function，**會被嚴格的 CSP（Content Security Policy）擋掉**。
  → 這正好是 [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]] §3-b 說的「轉譯與 parse 沒有固定先後」的實例：**編譯這件事可以發生在 build-time，也可以發生在 run-time，取決於你選哪個產物。**

- (j) 📌 待查證：Vue 3.6 的 **Vapor Mode**（不產生 virtual DOM、直接編譯成 DOM 操作，屬於 Level 3）在 2026 年中被多家技術部落格報導為 feature-complete／RC，但**官方 Glossary 目前還沒有這個詞條**。引用前請先核對 vuejs/core 的 release notes。

---

## 3. Angular：連裝飾器都在編譯期被吃掉

- (k) Angular 是三者中**編譯期做最多事**的。Angular 9 之後的引擎叫 **Ivy**，編譯器叫 **ngtsc**（一個 TypeScript compiler 的外掛），**AOT（Ahead-of-Time，預先編譯）是預設**。

```text
button.component.ts  ＋  button.component.html  ＋  button.component.css
   ↓ ngtsc（AOT）
@Component({...}) 裝飾器 ──→ 被吃掉，變成 class 上的靜態欄位 ɵcmp、ɵfac
<template> HTML       ──→ 變成 Ivy instruction 呼叫：
                            ɵɵelementStart / ɵɵtext / ɵɵadvance / ɵɵproperty …
   ↓ tsc
純 JS
```

| | AOT（Ahead-of-Time） | JIT（Just-in-Time） |
|---|---|---|
| 何時編譯 template | build-time | run-time，在瀏覽器裡 |
| 需要帶 `@angular/compiler` 到瀏覽器嗎 | 不需要 | 需要，bundle 大很多 |
| 模板錯誤何時發現 | **build 就爆** | 使用者打開才爆 |
| 現況 | **預設，正式環境唯一選擇** | 只剩開發／測試場景 |

- (l) Angular 17 之後的新控制流語法 `@if` / `@for` / `@switch` 也是**純編譯期語法** —— 它們不是 JS，也不是 HTML，是 Angular 模板編譯器自己的語法，編譯後變成 instruction 呼叫。

---

## 4. Level 3：Svelte 與 Solid 把 runtime 編譯掉

| | Svelte | Solid |
|---|---|---|
| 輸入 | `.svelte`（HTML-like ＋ `<script>` ＋ `<style>`） | `.jsx`（看起來跟 React 一樣） |
| 編譯器 | Svelte compiler | `babel-plugin-jsx-dom-expressions` |
| 產物 | **命令式 DOM 操作**：`document.createElement`、精準的 `set_data()` | **細粒度 reactive 的 DOM 操作**，不是 `createElement` 樹 |
| 有 virtual DOM 嗎 | ❌ 沒有 | ❌ 沒有 |
| 需要帶 framework runtime 嗎 | 極少（只有少量 helper） | 少（reactive system） |

- (m) ⚠️ **同樣是 JSX，React 的 JSX 和 Solid 的 JSX 編譯結果完全不同。** React 的 `<div>` 變成 `_jsx("div", …)`（建一個描述物件，交給 runtime diff）；Solid 的 `<div>` 直接變成建立真 DOM 節點的程式碼 ＋ 只更新會變的那一格。**JSX 只是語法，語意由編譯器決定。**

---

## 5. 完整對照：各種副檔名怎麼變成 JS

| 原始格式 | 誰轉 | 產物 | 層級 |
|---|---|---|---|
| `.ts` | tsc / SWC / esbuild | 刪掉型別的 JS（**type erasure**，型別不影響執行期行為） | L1 |
| `.tsx` / `.jsx`（React） | Babel / SWC / esbuild | `_jsx("div", {...})` 函式呼叫 | L2 |
| `.jsx`（Solid） | babel-plugin-jsx-dom-expressions | 直接的 DOM 建立與細粒度更新 | L3 |
| `.vue` | `@vue/compiler-sfc` | ES module：render function ＋ setup ＋ 獨立 CSS | L2 |
| Angular template | ngtsc（Ivy AOT） | `ɵɵelementStart` 等 instruction 呼叫 | L2 |
| `.svelte` | Svelte compiler | 命令式 DOM 操作 | L3 |
| `.astro` | Astro compiler | 伺服器端 render function ＋ islands | L2/L3 混合 |
| `.mdx` | MDX compiler | Markdown → JSX → JS | L2 |
| `.scss` / `.less` / `.styl` | sass / less / stylus | **CSS，不是 JS** | — |
| CSS Modules | css-loader | 一個 JS 物件（class 名對照表）＋ CSS | — |
| Tailwind | PostCSS | **CSS**（掃描字串產生，不轉 JS） | — |
| `.json` | JSON module | JS 物件 | — |
| `.png` / `.svg` | asset module | 一個 export URL 字串的 **JS 模組**（或 base64 data URI） | — |
| `.svg`（SVGR） | SVGR | 一個 React 元件（JS） | L2 |
| `.graphql` | graphql-codegen | TS 型別 ＋ hooks | — |
| `.wasm` | 不轉成 JS | 二進位，但需要 JS glue code 載入 | — |

---

## 6. 為什麼連 `.png` 都要變成 JS 模組

- (n) 因為 **bundler 的相依圖只認得 JS 模組**。`import logo from './logo.png'` 這行要能被靜態分析、要能進相依圖、要能被 tree shaking 判斷有沒有被用到 —— 唯一的辦法就是讓 `logo.png` 也「假裝」是一個 JS 模組：

```js
// webpack / vite 實際產生的東西（概念版）
export default "/assets/logo.a1b2c3.png";     // 大檔：輸出 URL
export default "data:image/png;base64,iVBO…"; // 小檔：內嵌 data URI
```

這個設計哲學叫 **"everything is a module"**。副作用是：**bundler 的 loader／plugin 生態，本質上都是「把某種格式翻譯成 JS 模組」的翻譯機。**

---

## 相關筆記（含關聯理由）

- [[05-JSX轉譯機制-createElement與jsx-runtime-Babel與SWC三步驟]]
  **理由**：那篇是本篇 Level 2 的單一案例深挖（JSX 一種），本篇是把所有格式攤開來做橫向比較。先讀那篇懂機制，再讀本篇看全景。
- [[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】]]
  **理由**：那篇講「誰在做轉譯」（Babel／SWC／esbuild 的工具選型），本篇講「轉譯的野心分幾級」。工具 × 層級是兩個正交的軸。
- [[04-V8引擎完整管線-Parse到Deoptimization-【編譯runtime】]]
  **理由**：本篇 §0 那張表的右半欄（run-time tokenize）整條管線在那篇。
- [[script載入方式+前因後果]]
  **理由**：本篇 (d) 的動機「能搬去 build 做的都先搬」，源頭是那篇 (b)「主執行緒只有一條」。本篇等於是那條公理在框架設計上的推論。
- [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]
  **理由**：本篇 §2-3（Vue 完整版可以在瀏覽器編譯 template）是那篇 §3-b「轉譯與 HTML Parsing 沒有固定先後」的實例。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| `.vue` 對外就是 ES module、compiler macro 定義 | https://vuejs.org/glossary/ | 官方文件，2026-09-10 查證 |
| SFC 語法規格（三個 block 的定義） | https://vuejs.org/api/sfc-spec.html | 官方文件，2026-09-10 查證 |
| PatchFlags、Static Hoisting、Block Tree | https://vuejs.org/guide/extras/rendering-mechanism.html | 官方文件，2026-09-10 查證 |
| `@vue/compiler-sfc` 原始碼（compileScript） | https://github.com/vuejs/core/tree/main/packages/compiler-sfc | 2026-09-10 查證 |
| Angular ngtsc 編譯器說明 | https://dev.to/ajitsinghkaler/angular-compiler-ngtsc-271l | 二手來源，2026-09-10 查證 |
| Angular AOT vs JIT 實務比較 | https://dev.to/abanoubkerols/angular-aot-vs-jit-the-complete-guide-with-practical-example-v20-g9p | 二手來源，2026-09-10 查證 |
| ⚠️ Vue 3.6 Vapor Mode 狀態（**待官方核對**） | https://blog.imseankim.com/vue-3-6-beta-vapor-mode-virtual-dom-solidjs-svelte-feature-complete-2026/ | 二手部落格，2026-09-10 查證；官方 Glossary 尚無此詞條 |
