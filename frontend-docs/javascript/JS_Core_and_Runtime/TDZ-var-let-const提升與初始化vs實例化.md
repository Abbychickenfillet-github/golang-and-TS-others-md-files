---
title: TDZ、var-let-const 提升與初始化 vs 實例化
type: topic-note
source: Gemini
tags: [gemini, javascript, hoisting, TDZ, scope]
sources:
  - https://gemini.google.com/app/2a5c6e2cffa93a9c
  - https://gemini.google.com/app/d41de9a15e1ed14b
  - https://gemini.google.com/app/113ad364c602317a
updated: 2026-11-03
---

# TDZ、var-let-const 提升與初始化 vs 實例化

JS 引擎執行腳本前，會先做「作用域實例化」（為每個宣告建立 binding），再決定要不要「初始化」（賦予初值）。TDZ、{{y:提升}}與 `foo is not a function` 這類錯誤都能用這兩步驟一次講完。相關：[[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]（同樣談 Execution Context 與 binding）。

## 重點整理

本篇重點 a–i，共 9 個

(a) <mark style="background: #ADCCFFA6;">實例化（Instantiation）</mark>：引擎在記憶體中為每個宣告建立 binding（決定屬於哪個作用域並配置位置）。<mark style="background: #ADCCFFA6;">初始化（Initialization）</mark>：替這個 binding 賦予初始值。實例化先發生，初始化後發生。比喻：實例化是蓋好毛胚屋，初始化是裝潢入住。

(b) ECMAScript 規格中全域腳本的這一步叫 `GlobalDeclarationInstantiation`，函式內則是 `FunctionDeclarationInstantiation`，兩者都在「執行第一行程式碼之前」完成。

(c) 三種宣告的差別（核心表）：
`var`：binding 建立在函式作用域或全域作用域，並<mark style="background: #BBFABBA6;">立刻初始化為 undefined</mark>，所以宣告前讀取得到 `undefined`。
`let`／`const`：binding 同樣被建立（所以也算有提升），但<mark style="background: #FF5582A6;">不初始化</mark>，直到執行到宣告那一行才初始化。
函式宣告：binding 建立並<mark style="background: #BBFABBA6;">直接初始化為函式物件本身</mark>，所以宣告前就能呼叫。

(d) <mark style="background: #FFF3A3A6;">TDZ（Temporal Dead Zone，暫時性死區）</mark>就是「`let`／`const` 已實例化但尚未初始化」的那段時間，期間讀寫該變數會丟 `ReferenceError`。

(e) 函式表達式的錯誤類型：`var foo = function(){}` 在宣告前呼叫，foo 是 `undefined`，所以報 <mark style="background: #FF5582A6;">TypeError: foo is not a function</mark>。`const`／`let foo = ...` 在宣告前呼叫，因為處於 TDZ，報 <mark style="background: #FF5582A6;">ReferenceError</mark>。

(f) `var` 的「提升到頂端」是一種直覺說法，實際上是函式（或全域）作用域在實例化階段（Creation Phase）就把 binding 放進 Environment Record 並設為 `undefined`，程式碼位置並沒有被搬動。

(g) 一般函式宣告會被完整提升，但 `this` 不是變數，它的值由「函式如何被呼叫」決定，不會被提升。

(h) `<script>` 放 `<body>` 最底部的原因與 TDZ、實例化<mark style="background: #FF5582A6;">無關</mark>：是為了避免 JS 下載與執行阻塞 HTML 渲染，並確保執行時 DOM 已經載入。（現代做法也可在 `<head>` 用 `defer`。）

(i) 物件導向語境的同一組詞：`new User()` 是實例化（配置出物件），`constructor` 裡的 `this.name = name` 是初始化（賦予初始狀態）。

> ⚠️ 存疑/更正：Gemini 在第一則回答用「跟 global instantiation 有關係」帶過 script 位置的問題，後續自己更正為「無關」，以後者為準。

## 自我測驗（點開看答案）

> [!question]- `console.log(a); var a = 1;` 會印出什麼？為什麼？
> 印出 `undefined`。`var` 在實例化階段就被初始化為 `undefined`。

> [!question]- `console.log(b); let b = 1;` 會發生什麼？
> `ReferenceError`，因為 b 在 TDZ，已實例化但未初始化。

> [!question]- 是非題：`let` 不會被提升。
> 錯。`let` 有被提升（binding 已建立），只是沒有初始化，才會有 TDZ。

> [!question]- 申論：說明實例化與初始化的差異並各舉一個 JS 例子。
> 實例化＝建立 binding 或物件實體（`new User()`、作用域建立變數 binding）。初始化＝給初值（`var` 設 `undefined`、constructor 賦值）。`let` 就是只實例化、尚未初始化的例子。

## 各對話來源
（Gemini 回答為節錄，使用者提問為原文）

### Understanding Temporal Dead（2026-11-03）— https://gemini.google.com/app/2a5c6e2cffa93a9c

**使用者：** 跟跟 global instantiation 有關係。

**Gemini：** （節錄）跟作用域實例化方式有關，var 直接初始化為 undefined，let／const 已提升但未初始化，這段期間就是 TDZ。

**使用者：** 那一般的函式是會被提升到頂層作用域的，但是 this 沒有，對嗎？

**Gemini：** （節錄）對，函式宣告完整提升，this 依呼叫方式決定。

**使用者：** script 標籤呢，它必須要在 body 的底下最下面。那這個原因跟 TDZ 還有作用域跟初始化還有實例化是不是也有關係呢？

**Gemini：** （節錄）無關，主要是避免阻塞渲染並確保 DOM 已載入。

### 變數環境記錄與記憶體（2026-11-03）— https://gemini.google.com/app/d41de9a15e1ed14b

**使用者：** 函式表達式為什麼只有 var 的函式表達式是呼叫它的時候才會出現 foo is not a function 的 type error。然後 const 跟 let 一律都是 reference error。

**Gemini：** （節錄）var 被提升並初始化為 undefined 所以 TypeError，let／const 進 TDZ 所以 ReferenceError。

**使用者：** Var 會被提升到哪裡

**Gemini：** （節錄）所屬函式作用域或全域作用域最頂端，在 Creation Phase 於 Environment Record 建立 binding 並給 undefined。

### 初始化與實例化差異（2026-11-03）— https://gemini.google.com/app/113ad364c602317a

**使用者：** 初始化跟實例化差在哪

**Gemini：** （節錄）實例化是把藍圖變成具體物件，初始化是填入初始狀態；並以 GlobalDeclarationInstantiation 為例，附對照表。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Hoisting 與 TDZ 概念 | https://developer.mozilla.org/zh-TW/docs/Glossary/Hoisting | MDN，網址為標準文件位置，本次未重新抓取全文（2026-11-03） |
| GlobalDeclarationInstantiation | https://tc39.es/ecma262/#sec-globaldeclarationinstantiation | ECMA-262 規格，本次未重新抓取全文；Gemini 引用 es.discourse.group 討論串（2026-11-03 對話中顯示） |
