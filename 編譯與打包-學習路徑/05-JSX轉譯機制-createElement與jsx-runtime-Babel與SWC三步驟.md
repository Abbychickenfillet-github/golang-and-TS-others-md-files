---
title: JSX 轉譯機制 — createElement、jsx-runtime 與 Babel／SWC 的三個步驟
type: topic-note
source: Gemini
tags: [gemini, react, jsx, babel, swc, transpile, ast, ecmascript]
sources:
  - https://gemini.google.com/app/91b54d891b833be2
  - https://gemini.google.com/app/599804dd5ba114af
  - https://gemini.google.com/app/0f1814c226521483
updated: 2026-09-16
---

# JSX 轉譯機制 — createElement、jsx-runtime 與 Babel／SWC 的三個步驟

> 本篇重點 a–q，共 17 個。

## 重點整理

### 一、JSX 不是 JavaScript

(a) <mark style="background: #ADCCFFA6;">Transpile（轉譯）</mark>是「同一個抽象層級的語言之間互轉」，跟 Compile（編譯成低階碼）不同。JSX 是<mark style="background: #FFF3A3A6;">非標準的語法擴充</mark>，ECMAScript 規範裡完全沒有它，JavaScript 引擎（例如 Chrome 的 V8）直接看到 `<MyComponent/>` 只會丟 `SyntaxError`。

(b) <mark style="background: #BBFABBA6;">轉譯不是引擎做的，是打包建置工具在你的程式碼送進瀏覽器之前做的</mark>。Babel、SWC、esbuild、Vite 這些工具不執行你的程式碼，它們把程式碼當成「文字」來剖析與重組。

(c) 轉譯完之後，引擎看到的只是一段 100% 合乎 ECMAScript 規範的普通程式碼：`React` 是一個匯入的物件，`.createElement` 是它的一個方法，回傳值是一個普通物件。<mark style="background: #FFF3A3A6;">所以「ECMA 沒有定義 JSX」跟「JSX 最終變成合法 JS」這兩件事完全不衝突。</mark>

### 二、兩套轉譯機制：Classic vs Automatic

(d) <mark style="background: #ADCCFFA6;">Classic Runtime（舊版轉譯，React 16 及以前）</mark>：

```jsx
// 輸入
<MyComponent color="blue">Hello</MyComponent>

// 輸出
React.createElement(MyComponent, { color: 'blue' }, 'Hello');
```

因為輸出直接用到 `React` 這個識別碼，所以<mark style="background: #FF5582A6;">檔案頂部必須手動 `import React from 'react'`，否則會 ReferenceError</mark>。

(e) <mark style="background: #ADCCFFA6;">Automatic Runtime（新版轉譯，React 17 起預設）</mark>：

```jsx
// 輸入
<MyComponent color="blue">Hello</MyComponent>

// 輸出（引入檔由建置工具自動注入）
import { jsx as _jsx } from 'react/jsx-runtime';
_jsx(MyComponent, { color: 'blue', children: 'Hello' });
```

單一子節點用 `jsx()`，多個子節點用 `jsxs()`（`s` 是 static children 的意思，事先知道 children 是陣列可省掉執行期判斷）。<mark style="background: #BBFABBA6;">好處是不用再手動 import React，打包體積與效能也略有優化。</mark>

(f) <mark style="background: #FF5582A6;">但注意：不用 import React ≠ 不用 import Hook。</mark>`useState`、`useEffect` 這些具名匯出仍然必須自己寫 `import { useState } from 'react'`，因為它們是你程式碼裡真的用到的識別碼，轉譯器不會幫你補。

### 三、createElement 到底做了什麼

(g) `React.createElement` 就是 React 團隊用標準 JavaScript 寫的一個普通函式，躺在 `node_modules/react` 裡（原始碼位置 `packages/react/src/ReactElement.js`）。它的工作只有三件事：整理 props、整理 children、回傳一個普通物件。

```js
// 簡化示意（非可執行的官方碼）
function createElement(type, config, children) {
  const props = {};
  for (const propName in config) {
    if (hasOwnProperty.call(config, propName)) props[propName] = config[propName];
  }
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) props.children = children;
  else if (childrenLength > 1) props.children = Array.prototype.slice.call(arguments, 2);

  return {
    $$typeof: REACT_ELEMENT_TYPE,   // 一個 Symbol，用來標示這是真的 React Element
    type: type,
    props: props,
  };
}
```

(h) 最終產物長這樣，<mark style="background: #FFF3A3A6;">所謂 React Element 就是一個普通的 JavaScript 物件，不是 DOM 節點</mark>：

```js
{
  $$typeof: Symbol(react.element),
  type: 'button',
  props: { color: 'red', children: 'Click me' }
}
```

(i) <mark style="background: #ADCCFFA6;">`$$typeof` 為什麼要用 Symbol？</mark>因為 Symbol 沒辦法被 `JSON.parse` 產生出來。如果伺服器回傳的 JSON 被直接塞進 JSX 渲染，攻擊者無法偽造一個帶有正確 `$$typeof` 的假 Element，這是 React 防 XSS 的一道防線。這也是 (g) 那段簡化碼<mark style="background: #FF5582A6;">不能直接貼進專案當成 React 用</mark>的原因之一——它省略了 `key`、`ref`、`__self`、`__source` 的處理與開發環境警告。

(j) 如果只是想自己實驗一個微型 Virtual DOM，這段是可獨立執行的：

```js
function myCreateElement(type, props, ...children) {
  return {
    $$typeof: Symbol.for('react.element'),
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  };
}
console.log(myCreateElement('h1', { id: 'title' }, 'Hello World'));
```

### 四、Transpilation 的三個步驟

(k) <mark style="background: #FFF3A3A6;">第一步 Parsing（語法剖析）</mark>：讀進 `.jsx` 文字，拆成 <mark style="background: #ADCCFFA6;">AST（Abstract Syntax Tree，抽象語法樹）</mark>。`<button color="red">Click</button>` 會變成一個 `JSXElement` 節點，底下掛著 OpeningElement `button`、Attributes `color="red"`、Children `"Click"`。

(l) <mark style="background: #FFF3A3A6;">第二步 Transformation（語法樹轉換）</mark>：外掛（例如 `@babel/plugin-transform-react-jsx`）掃描 AST，遇到 `JSXElement` 就把它改寫成 `CallExpression`（函數呼叫節點）——函式名 `React.createElement`，第一參數標籤名字串，第二參數把 Attributes 組成物件，第三參數之後放 children。

(m) <mark style="background: #FFF3A3A6;">第三步 Code Generation（程式碼生成）</mark>：把改寫後的 AST 重新組裝成標準 `.js` 文字輸出。

```js
// 輸入
const button = <button color="red">Click</button>;
// 輸出
const button = React.createElement("button", { color: "red" }, "Click");
```

(n) <mark style="background: #BBFABBA6;">動手驗證的最快方式</mark>：打開 Babel 官方線上工具 REPL（https://babeljs.io/repl），左側 Presets 勾選 `react`，貼上 JSX，右邊即時看到轉譯結果。想看新版轉譯就把 Runtime 設為 `automatic`。

(o) <mark style="background: #FFF3A3A6;">那這三步的效能成本算誰的？</mark>成本是真的存在，但<mark style="background: #BBFABBA6;">整筆落在建置期（build-time），使用者的瀏覽器一毛都不用付</mark>。把兩端分開看：

| 時間點 | 誰在做事 | 做什麼 | 成本落在哪裡 |
| --- | --- | --- | --- |
| 建置期 build-time | Babel、SWC、esbuild 在你的電腦或 CI 機器上 | 把 JSX parse 成 AST、transform、generate 回 JS | 開發時的 HMR 熱重載等待時間、`npm run build` 的打包秒數 |
| 執行期 run-time | 瀏覽器的 JavaScript 引擎 | 執行已經是純 JS 的 `React.createElement(...)` 或 `jsx(...)` | 幾乎為零，瀏覽器完全不知道 JSX 存在過 |

(p) <mark style="background: #BBFABBA6;">建置期這筆成本現在已經被壓得很小。</mark>主詞—動詞—受詞寫清楚是這樣：工具鏈把原本用 JavaScript 寫的 parser（`Babel`）換成用 Rust 寫的（`SWC`）或用 Go 寫的（`esbuild`），同一份 JSX 的 parse 與 transform 速度提升約 10 到 100 倍，產物一樣是標準 JS，再交給 bundler 去做後續的 code splitting 與 minify。

(q) <mark style="background: #BBFABBA6;">轉譯甚至會讓執行期比手寫更快</mark>，因為轉譯器在 (l) 那一步做了靜態分析可以順手做最佳化：

   - <mark style="background: #ADCCFFA6;">靜態提升（Static Hoisting）</mark>：把整棵不會隨 state 改變的 JSX 節點提升到 render 函式外面，避免每次 re-render 都重新建立同一個物件。
   - <mark style="background: #ADCCFFA6;">React Compiler 的自動記憶化（Memoization）</mark>：在轉譯階段自動插入記憶化邏輯，減少不必要的子元件重繪。<mark style="background: #FF5582A6;">⚠️ 這一項要注意版本</mark>，見下方「存疑／更正」。

### 五、名詞補全

- <mark style="background: #ADCCFFA6;">SWC = Speedy Web Compiler</mark>，用 Rust 寫的高效能 JavaScript／TypeScript 轉譯器與打包工具。
- <mark style="background: #ADCCFFA6;">AST = Abstract Syntax Tree</mark>，抽象語法樹。
- <mark style="background: #ADCCFFA6;">REPL = Read–Eval–Print Loop</mark>，讀取－求值－印出的互動式環境。
- <mark style="background: #ADCCFFA6;">JSX</mark> 官方全稱沒有正式展開，一般理解為 JavaScript XML（XML-like syntax extension to JavaScript）。

## ⚠️ 存疑／更正

- **Gemini 說「SWC 目前廣泛應用於 Next.js、Vite 等現代前端工具鏈中」**：<mark style="background: #FF5582A6;">Vite 這一半不精確。</mark>Next.js 從 12 起確實預設用 SWC 取代 Babel；但 <mark style="background: #BBFABBA6;">Vite 預設的 JSX／TS 轉換器是 esbuild（Go 寫的），SWC 在 Vite 是可選方案</mark>，要自己裝 `@vitejs/plugin-react-swc` 才會用到。預設的 `@vitejs/plugin-react` 走的是 Babel。
- **Gemini 說「React 19 / Compiler 優化：自動插入記憶化邏輯」**：<mark style="background: #FF5582A6;">講得像是升上 React 19 就自動有了，不精確。</mark>正確的關係是——<mark style="background: #BBFABBA6;">React Compiler 是一個獨立的建置期工具，以 Babel plugin 的形式存在，必須自己安裝 `babel-plugin-react-compiler` 並把它排在 Babel plugin 管線的第一個</mark>，才會啟用。它在 <mark style="background: #FFB8EBA6;">2025-10-07 發佈 1.0 穩定版</mark>，運作方式是把 Babel 給的 AST 降階成自己的 HIR（High-level Intermediate Representation，高階中間表示），再據此自動插入記憶化。升級 React 19 本身不會啟用它，而且它也支援在 React 19 以下的版本使用。
- **另一段語音對話中 Gemini 說「React 18 之後不用 import React」**：<mark style="background: #FF5582A6;">版本講錯。</mark>新版 JSX Transform 是 <mark style="background: #BBFABBA6;">React 17（2020 年 10 月）</mark>引進的，並且官方有回移（backport）到 16.14、15.7、0.14.10。React 18 沒有再改這件事。

## 相關題目練習

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 2694. Event Emitter | https://leetcode.com/problems/event-emitter/ | 練習用普通物件與函式表達「宣告一份結構、稍後才執行」的設計，跟 Element 是描述而非動作同一組思維 |
| LeetCode 2727. Is Object Empty | https://leetcode.com/problems/is-object-empty/ | 直接操作 plain object，體會 (h) 的 React Element 就只是普通物件 |
| LeetCode 2727 之外無直接對應題 | — | JSX 轉譯屬於工具鏈知識，LeetCode 沒有對應題型，建議改用 Babel REPL 手動驗證 |

## 關聯筆記

- [[useState底層-Fiber-Tree-memoizedState與過期閉包]] — 本篇講「JSX 怎麼變成 Element 物件」，那篇講「Element 物件之後怎麼被 Fiber 管理」，接起來就是一條完整的渲染前段管線。
- [[00-V8引擎完整管線-Parse到Deoptimization]] — 對照 (k)–(m)：Babel 的 Parse→Transform→Generate 與 V8 的 Parse→AST→Bytecode 是同一套編譯器骨架，只是輸出目標不同。
- [[ECMA-262規範-TC39與MDN比較]] — 呼應 (a)(c)：什麼算標準、什麼是廠商擴充，這篇是判準來源。
- [[FCP首次內容繪製-SEO爬蟲與打包五步驟]] — 轉譯只是打包五步驟的其中一步，那篇提供全景。
- [[Vite-HMR機制與Rollup打包原理]] — 補充 ⚠️ 那條更正：Vite 預設用 esbuild 而非 SWC 的來龍去脈。
- [[React-130錯誤-transpilePackages與SWC]] — 實戰踩坑版：轉譯設定沒對好時會噴什麼錯。
- [[SSR-renderToString與Hydration-伺服器端渲染流程]] — Element 物件在伺服器端會被 `renderToString` 轉成 HTML 字串，是本篇的下游。
- [[usePathname與useSearchParams-預渲染Bailout]] — 呼應 (o) 那張 build-time／run-time 對照表的另一面：轉譯是「建置期做得完的事」，`useSearchParams` 讀的 Query String 則是「建置期做不完的事」，同一條分界線的兩側各舉一例。

## 各對話來源（原文）

### React 元件轉譯機制解析（2026-08-28）— https://gemini.google.com/app/91b54d891b833be2

**使用者：** Components 元件被轉譯過後會是 react.createElement() 方法，我這樣說對嗎

**Gemini：** 正確，但僅限於舊版的轉譯機制。JSX 語法並非 JavaScript 引擎能直接執行的語法，使用 Babel、SWC 或 Vite 轉譯時，舊版的 Classic Runtime 確實會轉成 `React.createElement(...)`。但從 React 17 開始導入了新的 JSX 轉譯器，現代建置工具會預設轉譯為從 `react/jsx-runtime` 自動引入的 `jsx()` 或 `jsxs()`，不再需要手動 import React。整體而言你的方向完全正確——Component 在 JSX 層面只是語法糖，最終都會被轉譯為創建 React Element 的函數呼叫。

**使用者：** 你說最終都會被轉譯為創建 React Element（JavaScript 物件）的函數呼叫。可是 ecma 裡面又沒有定義

**Gemini：** 這正是關鍵：轉譯不是 JavaScript 引擎做的，而是打包建置工具在編譯階段完成的。分兩層——轉譯器層（Babel／SWC／Vite）把看起來像 HTML 的 JSX 替換成符合 ECMA 標準語法的函數呼叫；執行階段層（ECMA 引擎）看到的只是一段標準 JS：React 是普通物件，createElement 是普通方法，回傳普通物件 `{ $$typeof, type, props }`。一句話總結：JSX 是非標準的語法擴充，轉譯器把它翻成合乎 ECMA 規範的函數呼叫，而 React.createElement 只是 React 團隊用標準 JS 寫的一個普通函數。

**使用者：** 所以 react 函式庫內部就有寫 react.createElement()?

**Gemini：** 是的，直接寫在原始碼裡（`packages/react/src/ReactElement.js`）。接著給出簡化版原始碼：處理 config 成 props、依 `arguments.length - 2` 判斷 children 數量、最後回傳 `{ $$typeof: REACT_ELEMENT_TYPE, type, props }`。完整軌跡是：你寫 `<button color="red">Click me</button>` → 打包工具轉成 `React.createElement("button", { color: "red" }, "Click me")` → 執行進到 React 函式庫內部 → 回傳一個普通 JS 物件。

**使用者：** 你這可以直接貼進專案輸出嗎

**Gemini：** 不可以。那是大幅簡化過的示意碼，缺少 REACT_ELEMENT_TYPE（防 XSS 的 Symbol 標記）以及 key、ref、__self、__source 等除錯屬性的處理，也沒有 React 完整的依賴與環境判斷。而且只要專案安裝了 react，這些程式碼早就在 node_modules 裡了。如果只是想自製一個微型 Virtual DOM 引擎，可以用 `myCreateElement` 那段獨立可執行的程式碼。

**使用者：** 我只是想要知道它是怎麼被 transpile 出來的嘛

**Gemini：** 轉譯就是文字替換與語法樹重構，分三步——第一步 Parsing：把 `.jsx` 文字拆成 AST，`<button color="red">Click</button>` 變成 JSXElement 節點（OpeningElement: button、Attributes: color="red"、Children: "Click"）。第二步 Transformation：`@babel/plugin-transform-react-jsx` 掃到 JSXElement 就改寫成 CallExpression。第三步 Code Generation：把改寫後的 AST 重新組裝輸出成標準 .js。建議用 Babel REPL 線上工具、左側 Presets 勾選 react 即時觀察。

**使用者：** SWC 全稱是什麼

**Gemini：** SWC 的全稱是 Speedy Web Compiler，以 Rust 語言編寫的高效能 JavaScript／TypeScript 轉譯器與打包工具，速度比傳統的 Babel 快上數十甚至數百倍，目前廣泛應用於 Next.js、Vite 等現代前端工具鏈中。

### JSX 轉譯 AST 完整流程解析（2026-09-16 擷取）— https://gemini.google.com/app/0f1814c226521483

**使用者：** 你說了這個使用 JSX 導致還是需要轉譯的過程會造成效能消耗嗎

**Gemini：** JSX 的轉譯（Transpilation）會造成效能消耗，但這項消耗完全發生在開發與建構階段（Build-time），對使用者的瀏覽器運行效能（Run-time）幾乎沒有負面影響。（1）建構階段有效能消耗：Babel、SWC 或 esbuild 等編譯器需要將 JSX 解析為 AST，再轉換並生成 JavaScript 代碼；影響範疇是開發時的熱重載時間（HMR）以及 CI/CD 打包建構（`npm run build`）的所需時間；現代前端建構工具已大幅優化此階段，例如從 Babel 轉用 Rust／Go 撰寫的工具（SWC、esbuild 或 Vite），轉譯速度提高了 10 到 100 倍。（2）運行階段幾乎零負擔：經過打包工具處理後，送到使用者瀏覽器的已經是純 JavaScript 代碼（`React.createElement(...)` 或 React 17+ 的 `jsx(...)`），瀏覽器完全不知道 JSX 的存在；`React.createElement()` 本質上只是建立簡單的 JavaScript Plain Object（用來描述 Virtual DOM 結構），執行速度極快。（3）編譯優化反而提升運行效能：靜態提升（Static Hoisting）把不會改變的 JSX 節點提升到渲染函數外部，避免每一次 re-render 都重新建立物件；React 19 / Compiler 優化自動插入記憶化（Memoization）邏輯，減少不必要的子元件重繪與計算。

> ⚠️ 最後那一句「React 19 / Compiler 優化」講得不精確，更正見上方「存疑／更正」區塊。

### 程式碼報錯原因解析（2026-08-28，語音模式片段）— https://gemini.google.com/app/599804dd5ba114af

**使用者：** React 18 以後是不是已經不用 import React 跟 import { useState } from 'react' 了？

**Gemini：** React 18 之後，編譯工具已經改變，所以寫 JSX 時確實不需要再 import React 了。不過，像 useState 這類 Hook 仍然必須從 React import 進來喔。

**使用者：** 在剛才那個命令裡面我需要，怎麼寫？

**Gemini：** 在你的 React 元件檔案最上方，還是需要寫 `import { useState } from 'react';` 喔。

**使用者：** 我是說如果我用 Next.js 起了這個專案，我還是想要用 SSR 是可以做到的嗎？

**Gemini：** 沒問題，Next.js 本身就是以支援 SSR 聞名的。只要在檔案中使用 `getServerSideProps`，就能在每次請求時進行伺服器渲染。

> ⚠️ 補充：`getServerSideProps` 是 Pages Router 的寫法。若專案用的是 App Router（Next.js 13 之後的預設），對應做法改為在 Server Component 內直接 `await` 取資料，或用 `fetch` 搭配 `{ cache: 'no-store' }`。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇對話（JSX 轉譯 AST 完整流程解析） | https://gemini.google.com/app/0f1814c226521483 | Gemini Flash，2026-09-16 擷取 |
| React 官方部落格 — React Compiler v1.0（確認是 opt-in 的 Babel plugin，不是 React 19 內建） | https://react.dev/blog/2025/10/07/react-compiler-1 | 2025-10-07 發布，2026-09-16 查證 |
| React 官方 — React Compiler 安裝（必須排在 Babel plugin 管線第一個） | https://react.dev/learn/react-compiler/installation | 現行文件，2026-09-16 查證 |
| React 官方 — React Compiler 漸進式導入（Babel overrides／"use memo"／runtime gating 三種 opt-in） | https://react.dev/learn/react-compiler/incremental-adoption | 現行文件，2026-09-16 查證 |
| 本篇對話（React 元件轉譯機制解析） | https://gemini.google.com/app/91b54d891b833be2 | Gemini Flash，2026-08-28 |
| 本篇對話（程式碼報錯原因解析，語音片段） | https://gemini.google.com/app/599804dd5ba114af | Gemini Flash，2026-08-28 |
| React 官方部落格 — Introducing the New JSX Transform（確認是 17 不是 18） | https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html | 2020-09-22 發布，2026-08-29 查證 |
| React 原始碼 — ReactElement.js | https://github.com/facebook/react/blob/main/packages/react/src/ReactElement.js | main 分支，2026-08-29 查證 |
| Babel — @babel/plugin-transform-react-jsx | https://babeljs.io/docs/babel-plugin-transform-react-jsx | Babel 現行文件，2026-08-29 查證 |
| Babel REPL 線上轉譯工具 | https://babeljs.io/repl | 2026-08-29 查證 |
| SWC 官方（確認全稱 Speedy Web Compiler） | https://swc.rs/ | 2026-08-29 查證 |
| Vite 官方 — 預設用 esbuild 轉換 TS／JSX | https://vite.dev/guide/features#typescript | Vite 現行文件，2026-08-29 查證 |
| @vitejs/plugin-react-swc（SWC 在 Vite 是可選方案） | https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc | 2026-08-29 查證 |
| Next.js — 為什麼用 SWC | https://nextjs.org/docs/architecture/nextjs-compiler | Next.js 現行文件，2026-08-29 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-08-29
