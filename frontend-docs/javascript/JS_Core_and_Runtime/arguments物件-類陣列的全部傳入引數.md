---
title: arguments 物件：函式呼叫時引擎建立的類陣列物件
type: topic-note
created: 2026-10-06
related:
  - "[[08-函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]"
---

# `arguments` 物件：函式呼叫時引擎建立的類陣列物件

本篇重點 a–h，共 8 個。示範程式與每行輸出：同資料夾 `arguments物件-示範.js`（用 `node arguments物件-示範.js` 執行，輸出都已實測）。

## a. 一句話

`arguments` 是**函式每次被呼叫時，引擎在函式內建立的一個類陣列物件，裝著這次呼叫實際傳入的全部引數**。它是 ECMAScript 規格定義的物件（CreateMappedArgumentsObject／CreateUnmappedArgumentsObject），不是參數變數本身。

## b. 三個名詞

| 名詞 | 英文 | 在哪裡 | 例子（`function f(a, b) {…}`，呼叫 `f(1, 2, 3)`） |
|---|---|---|---|
| 參數 | parameter | 函式定義的括號裡，是函式內的區域變數名稱 | `a`、`b` |
| 引數 | argument | 呼叫時括號裡傳進去的值 | `1`、`2`、`3` |
| `arguments` 物件 | arguments object | 函式內自動可用的物件，裝著全部引數 | `arguments[0]` 是 `1`、`arguments[2]` 是 `3`、`arguments.length` 是 `3` |

引數有 3 個、參數只宣告 2 個時，多出來的第 3 個引數沒有變數名稱，只能從 `arguments[2]` 拿到。

## c. 它長什麼樣

| 特徵 | 內容 | 驗證 |
|---|---|---|
| 索引屬性 | `arguments[0]`、`arguments[1]`…，依傳入順序，沒傳的位置不存在 | `missing(1)` 的 `arguments[1]` 是 `undefined` |
| `length` | **實際傳入的引數個數**，預設值不計入 | `defaults()` 回傳 `0`；`fn.length` 是宣告的參數個數，兩者不同 |
| 原型 | `Object.prototype`，不是 `Array.prototype` | `Array.isArray(arguments)` 是 `false`，`Object.prototype.toString.call(arguments)` 是 `[object Arguments]` |
| `Symbol.iterator` | 規格指定為 `Array.prototype.values`，所以能 `for...of`、能用 `...` 展開 | `arguments[Symbol.iterator] === Array.prototype.values` 是 `true` |
| `callee` | sloppy 的 mapped 物件指向函式本身（已棄用）。strict 或 unmapped 的物件一讀取就丟 `TypeError` | `sloppyCallee()` 是 `true`，`strictCallee()` 丟 `TypeError` |

## d. 什麼時候有、什麼時候沒有

| 情況 | 有沒有 `arguments` |
|---|---|
| 一般函式（函式宣告、函式表達式、方法） | 有 |
| 箭頭函式 | **沒有自己的**，往外層函式找。想在箭頭函式收全部引數就用 rest 參數 `(...args)` |
| 函式的參數或內部宣告已經叫 `arguments` | 不建立（規格的 `argumentsObjNeeded` 為 `false`） |
| 函式體完全沒用到 `arguments` | 規格上仍可能建立，V8 在編譯時偵測沒用到就省略這筆開銷（見 [[04-V8引擎完整管線-Parse到Deoptimization-【編譯runtime】]] 的 Scope Analysis） |

## e. mapped 與 unmapped

建立哪一種，由函式是不是 strict、參數列表是不是「簡單」決定（規格的註解：mapped 只提供給 non-strict 且沒有 rest、預設值、解構的函式）：

| | mapped arguments object | unmapped arguments object |
|---|---|---|
| 條件 | 非 strict **且**簡單參數列表（只有單純的變數名稱） | strict，**或**有預設值、rest、解構 |
| 物件種類 | arguments exotic object（有 `[[ParameterMap]]`） | 普通物件 |
| `arguments[0]` 與第一個參數 | **連動**：改一邊，另一邊跟著變 | 各自獨立 |
| `callee` | 指向函式本身 | 丟 `TypeError` |
| 示範 | `mapped(1)` 回傳 `99`，`mappedReverse(1)` 回傳 `50` | `strictFn(1)`、`withDefault(1)` 都回傳 `1` |

「簡單參數列表」這個判斷同時決定其他兩件事（重複參數名稱是否合法、函式體能不能寫 `"use strict"`），完整說明在 [[08-函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] (e) 節。

## f. 轉成真正的陣列與現代替代

`arguments` 沒有 `map`、`forEach`、`reduce` 這些陣列方法。轉成陣列有三種，結果相同：

| 寫法 | 說明 |
|---|---|
| `Array.from(arguments)` | 依 `length` 與索引建立新陣列 |
| `[...arguments]` | 靠 `Symbol.iterator` 展開 |
| `Array.prototype.slice.call(arguments)` | ES5 的老寫法，借用陣列方法 |

ES6 之後直接用 **rest 參數**取代：`function sum(...nums) { … }`，`nums` 本來就是真正的 Array，也不會有 mapped 連動的問題，箭頭函式也能用。

## g. 實務與練習

| 場景 | 寫法 |
|---|---|
| 轉發全部引數（舊式 `debounce`、`bind` 實作） | `fn.apply(this, arguments)` |
| 可變長度參數（舊式 `sum`、`max`） | 迴圈 `arguments` 累加，現在改用 rest |
| 判斷呼叫時傳了幾個引數 | `arguments.length`，用來區分「沒傳」與「傳了 `undefined`」 |

LeetCode 練習：[2703. Return Length of Arguments Passed](https://leetcode.com/problems/return-length-of-arguments-passed/)（30 Days of JavaScript，回傳呼叫時傳入的引數個數）。

## h. 自我測驗

> [!question]- 1. `function f(a, b) {}`，呼叫 `f(1, 2, 3)`，`arguments.length` 與 `f.length` 各是多少？
> `arguments.length` 是 3（實際傳入），`f.length` 是 2（宣告的參數個數）。

> [!question]- 2. `function f(a) { arguments[0] = 99; return a; }`，`f(1)` 回傳什麼？改成 `function f(a = 0)` 呢？
> 前者 `99`（mapped 連動），後者 `1`（有預設值，unmapped）。

> [!question]- 3. 箭頭函式裡寫 `arguments`，拿到的是誰的？
> 外層一般函式的 `arguments`。箭頭函式沒有自己的，要收全部引數用 `(...args)`。

> [!question]- 4. `arguments` 是不是陣列？怎麼轉成陣列？
> 不是，原型是 `Object.prototype`。轉換用 `Array.from(arguments)`、`[...arguments]` 或 `Array.prototype.slice.call(arguments)`。

> [!question]- 5. strict mode 讀 `arguments.callee` 會怎樣？
> 丟 `TypeError`。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| `arguments` 是類陣列物件、箭頭函式沒有、可用 `Array.from`／展開／`slice` 轉換、`callee` 已棄用 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments | 讀取 mdn/content 倉庫 main 分支，2026-10-06 |
| mapped／unmapped 的建立條件、`Symbol.iterator` 為 `Array.prototype.values`、`callee` 的 thrower | https://tc39.es/ecma262/（FunctionDeclarationInstantiation、CreateUnmappedArgumentsObject、CreateMappedArgumentsObject） | 讀取 tc39/ecma262 main 的 spec.html，2026-10-06 |
| 每行輸出 | 同資料夾 `arguments物件-示範.js` | Node.js v22.22.0 實測，2026-10-06 |
