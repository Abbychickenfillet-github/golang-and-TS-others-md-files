---
title: every() 短路求值與初始長度快照｜把 for + break 重構成宣告式
type: topic-note
source: Gemini
tags: [gemini, javascript, array, 高階函式, every, 短路求值, 宣告式, 面試]
sources:
  - https://gemini.google.com/app/82fbb980432600fc
  - https://gemini.google.com/app/443a99c0d326252e
updated: 2026-08-25
---

# every() 短路求值與初始長度快照｜把 for + break 重構成宣告式

> [!info] 本篇重點 a–n，共 14 個
> 兩場 Gemini 對話合併：一場問「箭頭函式檢查小於 40」與「every 不會存取超出初始長度的元素」，一場問 `!isValid(request)` 這種否定判斷為什麼講者建議改寫成 `every`。
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[filter方法與callback定義]]</mark> 講的是同一族 callback 三參數簽名 `(value, index, array)`，這篇把重心放在「短路」與「長度快照」這兩個 filter 沒有的行為；<mark style="background: #ADCCFFA6;">[[高階函式與函數式範式-取代OOP三大設計模式]]</mark> 講為什麼宣告式寫法能取代樣板程式碼，這篇是它在 `every` 上的一個具體案例。

---

## 重點整理

### 一. 先讀懂那個 callback

```js
const isBelowThreshold = (currentValue) => currentValue < 40;
```

(a) `const` 宣告一個不可重新賦值的綁定，名字叫 `isBelowThreshold`。
（不可重新賦值 ≠ 值不可變，只是不能再 `isBelowThreshold = 別的東西`。）

(b) `=>` 是箭頭函式（Arrow Function）。它跟 `function` 的差別在於：<mark style="background: #FF5582A6;">沒有自己的 `this`、沒有 `arguments`、不能當建構子 `new`</mark>。當 callback 用時這些通通不需要，所以箭頭函式最合適。

(c) `(currentValue)` 是形式參數（parameter）。呼叫 `every` 時，陣列每一個元素會被當成實際參數（argument）餵進來。

(d) 箭頭後面直接接 `currentValue < 40` 是<mark style="background: #ADCCFFA6;">簡潔主體（concise body）</mark>，等同於 `{ return currentValue < 40; }`，運算結果自動被 return。

(e) <mark style="background: #FFF3A3A6;">`<` 是嚴格小於，不含等於。`40` 本身會得到 `false`。</mark>

### 二. 「不會存取超出初始長度的元素」是什麼意思

(f) 規格的意思是：<mark style="background: #FFF3A3A6;">`every()` 一開始執行時就把 `length` 拍了一張快照，之後你在 callback 裡怎麼 `push`，它都不會多跑那幾圈。</mark>

```js
const arr = [1, 2, 3];

arr.every((val, index, array) => {
  array.push(99);                       // 每一圈都往後面塞新元素
  console.log(`檢查索引 ${index}，值為 ${val}`);
  return val < 10;
});
// 檢查索引 0，值為 1
// 檢查索引 1，值為 2
// 檢查索引 2，值為 3
// arr 最後是 [1, 2, 3, 99, 99, 99]，但那三個 99 完全沒被檢查過
```

(g) 逐行拆解：`array` 是 callback 的第三個參數，<mark style="background: #ADCCFFA6;">指向的就是原陣列本體（傳址）</mark>，所以 `array.push` 真的會改到 `arr`。

(h) <mark style="background: #FF5582A6;">陷阱：長度快照只擋「往後長」，不擋「往前縮」。</mark>如果你在 callback 裡 `pop()` 或 `splice()` 把元素刪掉，走到那些索引時會讀到 `undefined`（更精確說是該索引已不存在，會被當成 hole 跳過或讀成 undefined，視刪法而定）。所以規則不是「陣列被凍結」，而是「圈數被凍結」。

(i) 同一套規則適用於 `forEach`、`map`、`filter`、`some`、`every`。這是 ES5 這一批陣列方法共用的規格描述。

### 三. `!isValid(request)` 的邏輯拆解

```js
for (const request of requests) {
  if (!isValid(request)) { everyRequestValid = false; break; }
}
```

(j) `isValid(request)` 回傳布林值：有效回 `true`，無效回 `false`。

(k) `!` 是邏輯非（Logical NOT）運算子，把結果反轉：

| request 狀態 | `isValid(request)` | `!isValid(request)` | 進 if 嗎 |
| --- | --- | --- | --- |
| 無效 | `false` | `true` | <mark style="background: #FF5582A6;">進去，標記失敗並 break</mark> |
| 有效 | `true` | `false` | 不進去，繼續下一筆 |

(l) 整段話翻成人話：<mark style="background: #FFF3A3A6;">「只要發現任何一個 request 無效，就把整體標記為無效並跳出迴圈。」</mark>

### 四. 為什麼講者建議改寫成 `every`

```js
// 重構前（命令式 Imperative）
let everyRequestValid = true;
for (const request of requests) {
  if (!isValid(request)) { everyRequestValid = false; break; }
}
if (everyRequestValid) { /* ... */ }

// 重構後（宣告式 Declarative）
if (requests.every(isValid)) { /* ... */ }
```

(m) 四個理由：

- **意圖更直覺**：命令式要讀者一步步追變數狀態與迴圈流程；`requests.every(isValid)` 直接用英文語意說「是不是每個 request 都有效」。
- **減少樣板程式碼（Boilerplate）**：省掉暫存變數、`for...of`、`if`、手動 `break`、最後那個 `if`。
- **避免狀態污染**：少一個可變動的 `let`，就少一個被其他地方誤改的風險。
- **自動具備短路求值（Short-circuiting）**：<mark style="background: #BBFABBA6;">`every()` 遇到第一個回傳 `false` 的元素就立刻停，效能跟手寫 `break` 完全相同</mark>，但程式碼乾淨很多。

(n) <mark style="background: #D2B3FFA6;">補充一個 Gemini 沒提到但面試常考的邊界：空陣列 `[].every(fn)` 回傳 `true`（vacuous truth，空真），`[].some(fn)` 回傳 `false`。</mark>如果 `requests` 可能是空的，要先確認「零筆算不算通過」符合你的商業邏輯。

---

## 程式碼範例

同層的 `every-length-snapshot-demo.js` 可以直接 `node every-length-snapshot-demo.js` 跑，親眼看到 push 進去的元素沒被檢查。

---

## 練習題（LeetCode / 30 Days of JavaScript）

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 2634 | [Filter Elements from Array](https://leetcode.com/problems/filter-elements-from-array/) | 手刻 `filter`，會逼你面對 callback 三參數與長度快照 |
| 2635 | [Apply Transform Over Each Element in Array](https://leetcode.com/problems/apply-transform-over-each-element-in-array/) | 手刻 `map`，同一族簽名 |
| 2626 | [Array Reduce Transformation](https://leetcode.com/problems/array-reduce-transformation/) | 累加器版本的高階函式 |
| 2629 | [Function Composition](https://leetcode.com/problems/function-composition/) | 函式當參數與回傳值，宣告式思維 |

---

## 各對話來源（原文）

### JavaScript 箭頭函式小於 40 檢查（2026-08）— https://gemini.google.com/app/82fbb980432600fc

**使用者：** `const isBelowThreshold = (currentValue) => currentValue < 40;` 檢查值是否小於40還是轉成...

**Gemini：** 這段程式碼是用來檢查傳入的值是否「嚴格小於 40」。`currentValue < 40`：若 `currentValue` 小於 40，回傳 `true`；否則回傳 `false`。在 `Array.prototype.every()` 中，它被作為測試函數（callback），用來確認陣列裡的每一個元素是否都小於 40。

**使用者：** 当开始调用 every() 时，callbackFn 将不会访问超出数组初始长度的任何元素。什麼意思

**Gemini：** 這句話的意思是：`every()` 在執行前，就已經先「固定」了陣列的長度。如果在執行 `every()` 的過程中，你在 callbackFn 裡面動態新增元素到陣列中，`every()` 不會去檢查那些新加進去的元素。（程式碼範例與執行結果見上方「重點整理」二.）雖然陣列最後變成了 `[1, 2, 3, 99, 99, 99]`，但被推進去的 99 完全不會被 `every()` 存取或檢查。

### 解釋 `!isValid(request)` 邏輯（2026-08）— https://gemini.google.com/app/443a99c0d326252e

**使用者：** `if(!isValid(request)){everyRequestValid =false; break;}` 前面的 call site 是檢查傳入的 request 如果沒有效那就是 true？如果有效就是 false？

**Gemini：** 拆解這段邏輯運作方式：`isValid(request)` 本身是一個會傳回布林值的函式，有效傳回 `true`，無效傳回 `false`。當前面加上邏輯非運算子 `!` 時，會將結果反轉。如果 request 無效（`false`），`!isValid(request)` 變成 `true`，觸發 if 條件，執行 `everyRequestValid = false; break;`。如果 request 有效（`true`），`!isValid(request)` 變成 `false`，不會進入 if 區塊，繼續檢查下一個 request。整體意思是：「只要發現任何一個 request 無效，就將整體標記為無效並跳出迴圈」。

**使用者：** 他是覺得用 every 這個寫法比較好嗎？

**Gemini：** 是的，講者認為改用 `Array.prototype.every()` 這種高階函式的寫法會好很多。1. 意圖更直覺（語意化）：原先的 `for` 迴圈加上 `break` 是命令式程式碼（Imperative Code），讀者必須一步步追蹤變數狀態與迴圈流程；而 `requests.every(isValid)` 是宣告式程式碼（Declarative Code）。2. 大幅減少樣板程式碼（Boilerplate Code）。3. 避免狀態污染（Side Effects）：少宣告一個可變動的變數（`let`）。4. 自動具備 Short-circuiting（短路求值）：`every()` 在遇到第一個回傳 `false` 的元素時就會立刻停止，效能與手動寫 `break` 完全相同。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話：箭頭函式與 every 初始長度 | https://gemini.google.com/app/82fbb980432600fc | 2026-08，本次歸檔 2026-08-25 |
| Gemini 對話：`!isValid` 與 every 重構 | https://gemini.google.com/app/443a99c0d326252e | 2026-08，本次歸檔 2026-08-25 |
| MDN `Array.prototype.every()` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every | 查證 2026-08-25 |
| ECMA-262 `Array.prototype.every` 規格 | https://tc39.es/ecma262/#sec-array.prototype.every | ES2026 草案，查證 2026-08-25 |
| MDN 箭頭函式 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 補充
> Gemini 的說明只講「不會存取超出初始長度」，沒有提到<mark style="background: #FF5582A6;">刪除元素的反向情況</mark>，也沒有提到<mark style="background: #FF5582A6;">空陣列 `[].every()` 回傳 `true`</mark> 這個面試常見坑。這兩點是本篇 (h)(n) 補上的，請以 MDN 與規格為準。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
