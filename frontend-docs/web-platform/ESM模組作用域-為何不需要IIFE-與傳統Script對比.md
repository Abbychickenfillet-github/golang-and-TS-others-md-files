---
title: ESM 模組作用域：為何不需要 IIFE（與傳統 Script 對比）
aliases: [ESM, ES Module, ESModule, 模組作用域, 為何不需要IIFE]
type: topic-note
category: 技術
tags:
  - javascript
  - esm
  - module-scope
  - iife
  - strict-mode
related:
  - "[[script載入方式+前因後果]]"
  - "[[11-Vite核心機制-隨選載入-HMR-依賴預構建-生產Rollup-冷啟動]]"
updated: 2026-09-10
---

# ESM 模組作用域：為何不需要 IIFE（與傳統 Script 對比）

> 本篇重點 a–e，共 5 個。你的直覺對了一半：**「一開始學 JS 用 IIFE 隔離變數」那件事，正是 ESM 內建幫你做掉的**。但你把三件事混在一起了——**「作用域隔離」「嚴格模式」「輸出格式」是三個獨立的東西**，下面拆開講。

## a. 一句話：ESM 天生就有「模組作用域」，所以不必自己寫 IIFE

<mark style="background: #BBFABBA6;">**ESM 檔案（`.mjs` 或 `<script type="module">`）裡宣告的 `const`／`let`／`var`／`function`／`class`，預設就是這個檔案私有的，不會污染全域**</mark>；只有 `export` 出去的才看得到。這就是「模組作用域（Module Scope）」。傳統 `<script>` 沒有這層，所以早期要**自己**用 IIFE `()();` 把變數關起來。

```js
// 舊式：classic <script>，要自己寫 IIFE 才能隔離 count
(function () {
  const count = 1;
  console.log(count); // 外部拿不到 count ✅ 靠 IIFE
})();

// ESM：<script type="module"> 或 .mjs，直接寫就好
const count = 1;
console.log(count); // count 天生是模組私有 ✅ 不必 IIFE
```

## b.（回答你最關鍵的誤解）`"use strict"` ≠ IIFE，是兩件不同的事

你問「傳統 JS 是不是**用 `"use strict"` 在頂層就會自動有 IIFE**？還是也要再寫 `()();`？」——<mark style="background: #FF5582A6;">**兩者無關。`"use strict"` 只開「嚴格模式」，它不會幫你隔離變數。想在傳統 script 隔離變數，你還是得自己寫出 `()();` 這個 IIFE 外殼。**</mark>

| 你想要的效果 | 傳統 classic script 怎麼拿到 | ESM 怎麼拿到 |
|---|---|---|
| **變數不外洩到全域**（隔離） | <mark style="background: #FFF3A3A6;">必須自己寫 IIFE `()();`</mark>；只加 `"use strict"` 沒用 | 天生就有，直接寫 |
| **嚴格模式**（禁隱式全域、`this` 不亂指…） | 必須手動在頂層寫 `"use strict";` | <mark style="background: #BBFABBA6;">預設強制開啟</mark>，不用寫 |

證明「`"use strict"` 不等於隔離」：

```js
// classic <script>
"use strict";
var leaked = 123;        // 頂層 var 在傳統 script 仍然掛到 window
console.log(window.leaked); // 123 ❌ 沒被隔離！嚴格模式救不了你
```

所以傳統作法常是「**IIFE ＋ 在 IIFE 內第一行寫 `"use strict"`**」兩個一起用：IIFE 負責隔離、`"use strict"` 負責嚴格。ESM 把這兩件事**一次送給你**。

## c. 頂層 `this`：傳統指向 `window`，ESM 是 `undefined`

| 特性 | 傳統指令碼（Script） | ESModule（ESM） |
|---|---|---|
| 預設作用域 | 全域作用域（容易命名衝突） | <mark style="background: #ADCCFFA6;">模組作用域（檔案間互相隔離）</mark> |
| 隔離方法 | 得自己包 IIFE | 原生支援，直接寫 |
| 嚴格模式 | 手動 `"use strict"` | <mark style="background: #BBFABBA6;">預設開啟</mark> |
| 頂層 `this` | `window`／`global` | <mark style="background: #FFF3A3A6;">`undefined`</mark> |

## d.（你另一個問題）「不需要把輸出格式設成 IIFE 或 UMD？」——對，但那是**打包器的「輸出格式」設定，跟你寫程式的姿勢是兩層事**

你寫程式時用 `import` / `export`（ESM 語法）就好，**不會**、也不該自己手寫 IIFE。IIFE／UMD／ESM／CJS 這些名字，是**打包器輸出檔案時的「格式（output format）」選項**——例如 Rollup 的 `output.format` 可以是 `'es'`、`'iife'`、`'umd'`、`'cjs'`：

- <mark style="background: #ADCCFFA6;">你**寫**的是 ESM 語法（`import`/`export`）</mark>；
- 打包器**輸出**成什麼格式看用途：要丟到**沒有模組系統的老瀏覽器 `<script>`** 就輸出 `iife`／`umd`（自帶那層函式殼、把 export 掛到全域變數）；要給現代 `<script type="module">` 或別的打包器吃，就輸出 `es`。

一句話：<mark style="background: #FF5582A6;">**「要不要 IIFE 殼」在現代開發不是你手寫的問題，而是打包器輸出時替你決定的事**</mark>。

## e. 把你昨天說的「多模組被塞進同一層殼的 IIFE／作用域提升」接起來

你昨天觀察到「多個模組改到同一層殼裡的 IIFE」＝那是**打包器在「全域作用域的世界」裡假裝有模組作用域**的手法：

- **早期 Webpack**：把**每一支模組**各自包一層函式 `(function(module, exports, require){ … })`，用函式作用域**模擬**模組隔離（因為當年瀏覽器沒有原生 ESM）。
- **Scope Hoisting（Rollup 首推、後來大家跟進）**：反過來，<mark style="background: #BBFABBA6;">把多支模組**合併進同一個作用域**、去掉每支各自的函式殼</mark>，跑得更快、輸出更小。**它之所以敢合併，正是因為 ESM 本身就有明確的模組作用域**，打包器分析得出誰是誰、不會撞名——這就接回你「原來一開始學 JS 的 IIFE 底層一直用在這裡」的體悟：<mark style="background: #FFF3A3A6;">IIFE 是「沒有模組系統時的隔離手段」，ESM 出現後，這層由語言原生接手，打包器才能放心 scope-hoisting。</mark>

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間（查證：2026-09-10） |
| --- | --- | --- |
| ESM 嚴格模式與模組作用域（`this` 為 undefined、預設 strict） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules | MDN JavaScript modules |
| `<script type="module">` 語意（defer、模組作用域、strict） | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/module | MDN script type=module |
| Rollup 輸出格式 `output.format`（es/iife/umd/cjs） | https://rollupjs.org/configuration-options/#output-format | Rollup 官方設定文件 |
