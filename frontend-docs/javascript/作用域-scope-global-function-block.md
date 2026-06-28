---
title: JS 作用域 Scope（Global / Function / Block）必考重點
type: topic-note
source: Gemini
tags: [gemini, javascript, scope, 作用域, 面試考點]
sources:
  - https://gemini.google.com/app/15c0dae8feeae7c1
updated: 2026-06-20
---

# JS 作用域 Scope（Global / Function / Block）必考重點

> 作用域決定變數「在哪裡可以被訪問，在哪裡會被關在門外」，是面試與實戰超高頻考點。

## 重點整理

### 三種作用域對比

**1. Global Scope（全域作用域）** — 宣告在所有函式或區塊 `{}` 之外，任何地方都能存取。
<mark style="background: #FF5582A6;">必考陷阱：</mark>瀏覽器環境下，`var` 宣告的全域變數會變成 `window` 的屬性（`var a=1` 等於 `window.a`）；<mark style="background: #FFF3A3A6;">但 `let`／`const` 的全域變數不會掛到 `window`</mark>。過多全域變數會造成「全域命名空間汙染」。

**2. Local / Function Scope（區域 / 函式作用域）** — 宣告在函式內部，只能在該函式內存取。`var`、`let`、`const` 在函式內都被限制在此。

**3. Block Scope（區塊作用域）** — 宣告在任何一對 `{}`（如 `if`、`for`、`while`）內。<mark style="background: #ADCCFFA6;">只有 `let` 與 `const` 支援 Block Scope；`var` 完全不支援</mark>（var 會無視大括號跑到外面）。

| 作用域類型 | 適用關鍵字 | 外部可存取 | 常見場景 |
|---|---|---|---|
| Global | var, let, const | 是 | 整個 JS 檔最外層 |
| Function (Local) | var, let, const | 否 | 函式內部 |
| Block | let, const（var 不支援） | 否 | if、for 迴圈 |

### 🔥 面試必考三大情境題

**考點一：var 在 for 迴圈中的 Block Scope 災難**（常結合 setTimeout）

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 答案：1 秒後連續印出 3, 3, 3
```

<mark style="background: #FF5582A6;">為什麼？</mark>`var` 沒有 Block Scope，`i` 是共用變數；setTimeout 執行時迴圈早跑完，`i` 已是 3。
<mark style="background: #BBFABBA6;">解法：把 `var` 改成 `let`</mark>，每次迭代產生獨立的區塊作用域，鎖住當下的 i：

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 答案：印出 0, 1, 2
```

**考點二：範疇鍊(Scope Chain) 與 靜態作用域(Lexical Scope)**
JS 採用<mark style="background: #ADCCFFA6;">語法作用域(Lexical Scope)</mark>：作用域在程式碼「寫好時」就決定，不是「執行時」。

```js
let name = 'Global';
function foo() { console.log(name); }
function bar() { let name = 'Local'; foo(); }
bar();
// 答案：印出 'Global'，不是 'Local'
```

`foo()` 定義時上層作用域就是 Global；內部找不到 `name` 就往外層找，這個鏈結叫 <mark style="background: #FFF3A3A6;">Scope Chain</mark>。

**考點三：未宣告變數的「自動全域化」陷阱**

```js
function test() { a = 10; }  // 前面沒寫 var/let/const
test();
console.log(a); // 答案：10（不會報錯！）
```

非嚴格模式下，對未宣告變數賦值，JS 會自動在 Global Scope 建立它。<mark style="background: #FF5582A6;">這是不良習慣</mark>，開啟 `"use strict";` 可避免。

## 各對話來源

### JavaScript 作用域重點整理（2026-06）— https://gemini.google.com/app/15c0dae8feeae7c1

**使用者：** 幫我整理 JavaScript: local scope, block scope, global scope 必備重點、必考重點。

**Gemini：** （內容已整合進上方「重點整理」：三種作用域定義與對照表、var 掛 window 陷阱、for+setTimeout 經典題、Lexical Scope/Scope Chain、自動全域化陷阱與 use strict。）
