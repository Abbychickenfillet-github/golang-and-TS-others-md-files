---
title: reduce() 累加器、匿名 Callback 與 split() 拆字
type: topic-note
source: Gemini
tags: [gemini, javascript, array, reduce, callback, split]
sources:
  - https://gemini.google.com/app/c3a6c9bbff0bac21
updated: 2026-08-07
---

# reduce() 累加器、匿名 Callback 與 split() 拆字

本篇重點 a–h，共 8 個

## 重點整理

(a) <mark style="background: #ADCCFFA6;">Callback 不需要有名字</mark>：Abby 原本的疑問是「這邊的 callback 為什麼可以叫 callback，它又不是一個具名函式？」<mark style="background: #BBFABBA6;">判準只有一個</mark>——只要「被當成引數傳進另一個函式、並由那個外層函式在稍後呼叫」，它就是 callback；具名、匿名（Anonymous Function）、箭頭函式（Arrow Function）都算。

(b) <mark style="background: #FF5582A6;">常見誤解</mark>：以為「callback 一定要先 `function foo(){}` 宣告好再傳進去」。其實 `arr.reduce((acc, cur) => acc + cur, 0)` 裡那個箭頭函式，就是一個標準的 callback，只是它沒有名字而已。

(c) <mark style="background: #FFF3A3A6;">reduce() 的 callback 最多接四個參數</mark>：

```js
arr.reduce(function (accumulator, currentValue, currentIndex, array) {
  // ...
  return accumulator;      // 這次的回傳值 = 下一輪的 accumulator
}, initialValue);
```

| 參數 | 意義 |
|---|---|
| `accumulator` | 累加器，儲存並傳遞每一輪的中間結果 |
| `currentValue` | 這一輪正在處理的元素 |
| `currentIndex` | 這一輪元素的索引 |
| `array` | 呼叫 reduce 的原陣列本身 |

(d) <mark style="background: #FFF3A3A6;">累加器的「接力棒」性質</mark>：每次呼叫 callback 時，`accumulator` 都會把「上一輪 return 的值」帶進來，因此一定要 `return`，否則下一輪的 accumulator 會變成 `undefined`。

(e) <mark style="background: #FF5582A6;">累加器不一定是數字，也不一定是陣列</mark>：<mark style="background: #BBFABBA6;">它的型別完全由 `initialValue` 決定</mark>——給 `0` 就是數字、給 `[]` 就是陣列、給 `{}` 就是物件。這是 Abby 當時最容易搞混的一點。

```js
[1, 2, 3].reduce((a, c) => a + c, 0);        // 6         → number
[1, 2, 3].reduce((a, c) => [...a, c * 2], []); // [2,4,6] → array
['a','b'].reduce((a, c) => ({ ...a, [c]: 1 }), {}); // {a:1,b:1} → object
```

(f) <mark style="background: #ADCCFFA6;">`split()` 回傳的一定是陣列</mark>：`split()` 把字串依分隔符切開成陣列，所以 `const digits = String(n).split('')` 的 `digits` 會是「每個字元一格」的字串陣列。<mark style="background: #FFB8EBA6;">注意元素仍然是字串，不是數字</mark>，要算數值得再 `Number()` 或 `parseInt()`。

```js
const digits = String(1234).split('');   // ['1','2','3','4'] ← 字串陣列
const product = digits.reduce((acc, d) => acc * Number(d), 1); // 24
```

(g) <mark style="background: #BBFABBA6;">split → map / filter → reduce 是常見組合技</mark>：先用 `split` 拆、用 `filter` 篩掉不要的、用 `map` 轉型，最後用 `reduce` 彙整成單一結果。這條「管線（Pipeline）」的思路比一路寫 `for` 迴圈更好讀。

(h) <mark style="background: #D2B3FFA6;">次要備註</mark>：`reduce` 若省略 `initialValue`，會拿陣列第一個元素當初始累加器、從第二個元素開始跑；<mark style="background: #FF5582A6;">空陣列又沒給初始值會直接 throw TypeError</mark>，所以建議一律明確寫出 `initialValue`。

## 相關筆記

- [[filter方法與callback定義]]（同樣在回答「callback 到底是什麼」；該篇從 MDN 定義、記憶體位址傳遞與閉包切入，本篇補上「匿名函式也算 callback」以及 reduce 特有的累加器參數，兩篇合看可完整理解 callback 在不同陣列方法中的角色）
- [[陣列遍歷-forEach與callback]]（forEach 的 callback 不回傳值、只做副作用；reduce 的 callback 一定要 return 才能把累加器接力下去，正好是對照組）
- [[map-轉換陣列重點與練習]]（map 是一對一轉換、長度不變；reduce 是多對一收斂、可輸出任意型別，兩者常串在同一條資料處理管線上）
- [[JavaScript-字串方法]]（`split()` 屬於字串方法，本篇只討論它與 reduce 搭配的部分，完整字串 API 看該篇）

## 各對話來源

### JavaScript Callback Function Explained（2026-08-06）— https://gemini.google.com/app/c3a6c9bbff0bac21

使用者：這邊的 callback 為什麼可以叫 callback 啊？它又不是一個具名函式。
Gemini：說明 callback 不必是具名函式，只要被當成引數傳進另一個函式、之後被該外層函式執行即可；以 `reduce` 為例，callback 會在每個元素上執行以累積出最終值。

使用者：很多時候它只是在這個方法裡面使用了另外一個函數而已，對嗎？
Gemini：確認理解正確，callback 就是把一個函式當參數傳給另一個函式，讓它在適當時機被執行。

使用者：我接受四個參數，然後第一個是累加器，因為它已經是用來做累加的東西嗎？
Gemini：確認累加器用來儲存及傳遞每次迭代的結果，每次呼叫 callback 都會把上一次的結果帶進去。

使用者：（累加器）也都會是一個陣列嗎？
Gemini：不是。累加器的型別完全取決於傳入的 `initialValue`——初始值是數字就是數字、是空陣列就是陣列。

使用者：不是，我是說 `split` 這個方法。
Gemini：`split()` 會將字串分割成一個陣列，所以等號左邊的 `digits` 變數最後會是包含字串中每個字元的陣列。

使用者：（追問還有什麼常搭配）
Gemini：除了 `split` 之外，`map` 和 `filter` 也很常搭配 `reduce` 使用——先 filter 過濾、或 map 轉換，最後 reduce 彙整成最終結果。

> ⚠️ 存疑／補充：本次對話是語音輸入，Gemini 回覆偏短且未提到「省略 initialValue 的陷阱」與「split 出來仍是字串」這兩個實務上最容易踩的點，(f)、(h) 兩點是查證 MDN 後補上的，非對話原文。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/c3a6c9bbff0bac21 | 2026-08-07 查證 |
| MDN `Array.prototype.reduce()` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | 四參數簽名與空陣列 TypeError 行為，2026-08-07 查證 |
| MDN `String.prototype.split()` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split | 回傳字串陣列，2026-08-07 查證 |
| MDN Callback function（術語表） | https://developer.mozilla.org/en-US/docs/Glossary/Callback_function | 匿名函式亦屬 callback，2026-08-07 查證 |
