---
title: Object.keys 與 Array.prototype.keys — 稀疏陣列孔洞的差異
type: topic-note
source: Gemini
tags: [gemini, javascript, array, object, keys, iterator, sparse-array, 稀疏陣列]
sources:
  - https://gemini.google.com/app/9debb9f807b83330
updated: 2026-08-29
---

# Object.keys 與 Array.prototype.keys — 稀疏陣列孔洞的差異

> 本篇重點 a–k，共 11 個。

## 重點整理

### 一、一段程式碼看懂差別

(a) 起手式：

```js
const arr = ["a", , "c"];              // 索引 1 是「孔洞（hole）」，不是 undefined
const sparseKeys = Object.keys(arr);   // ['0', '2']   ← 字串，跳過孔洞
const denseKeys  = [...arr.keys()];    // [0, 1, 2]    ← 數字，不跳孔洞
```

(b) <mark style="background: #ADCCFFA6;">稀疏陣列（Sparse Array）</mark>指的是「長度大於實際存在的元素個數」的陣列。`["a", , "c"]` 的 `length` 是 3，但索引 `1` 這個屬性<mark style="background: #FFF3A3A6;">根本不存在於物件上</mark>，不是值為 `undefined`。用 `1 in arr` 檢查會得到 `false`。

### 二、Object.keys(obj)

(c) <mark style="background: #ADCCFFA6;">本質</mark>：收集物件上**實際存在**且**可枚舉（Enumerable）**的**自有（own）**屬性鍵名。陣列在 JavaScript 裡本來就是物件，索引就是它的屬性名。

(d) <mark style="background: #FFB8EBA6;">回傳型別</mark>：字串陣列 `string[]`。<mark style="background: #FF5582A6;">注意是 `'0'`、`'2'` 這種字串，不是數字</mark>，拿去做算術會踩坑。

(e) <mark style="background: #BBFABBA6;">適用場合</mark>：只想處理真正有值的元素、走訪一般物件（Plain Object）的 key、避免對孔洞做無謂運算。

### 三、Array.prototype.keys()

(f) <mark style="background: #ADCCFFA6;">本質</mark>：依據陣列的 `length` 屬性，生成 `0` 到 `length - 1` 的<mark style="background: #FFF3A3A6;">連續</mark>索引序列。它完全不管某個索引存不存在。

(g) <mark style="background: #FF5582A6;">回傳的不是陣列，是 Array Iterator（迭代器物件）</mark>。所以直接 `console.log(arr.keys())` 只會看到 `Object [Array Iterator] {}`，要用展開運算子 `[...]` 或 `Array.from()` 或 `for...of` 才拿得到值。

```js
console.log(arr.keys());        // Object [Array Iterator] {}
console.log([...arr.keys()]);   // [0, 1, 2]
```

(h) <mark style="background: #FFB8EBA6;">回傳值型別</mark>：數字 `number`。

(i) <mark style="background: #BBFABBA6;">最常用的小技巧</mark>：快速產生連續數字陣列。

```js
const indices = [...Array(10).keys()];   // [0,1,2,3,4,5,6,7,8,9]
```

（`Array(10)` 造出一個 length 為 10 的**全孔洞**陣列，正因為 `keys()` 不跳孔洞，這招才成立。<mark style="background: #FF5582A6;">同樣的寫法換成 `Array(10).map((_, i) => i)` 就會失敗</mark>，因為 `map` 會跳過孔洞。）

(j) 搭配 `for...of` 走訪完整索引範圍：

```js
for (const i of arr.keys()) {
  console.log(i, arr[i]);
  // 0 'a'
  // 1 undefined   ← 孔洞被讀到會得到 undefined
  // 2 'c'
}
```

### 四、一句話判準

(k) <mark style="background: #FFF3A3A6;">問「這個位置真的有東西嗎」就用 `Object.keys`；問「這個長度範圍內的每一格」就用 `arr.keys()`。</mark>前者是**屬性視角**，後者是**長度視角**。

| | `Object.keys(arr)` | `arr.keys()` |
| --- | --- | --- |
| 回傳 | 陣列 | 迭代器 |
| 元素型別 | string | number |
| 稀疏孔洞 | 跳過 | 不跳過 |
| 依據 | 實際存在的屬性 | `length` 屬性 |
| 是否含非索引的自有屬性 | 會含（例如 `arr.foo = 1` 也會出現） | 不會 |

> ⚠️ 最後一列是 Gemini 沒提到但很重要的差異：`Object.keys` 連你手動掛上去的非索引屬性都會列出來。

## ⚠️ 存疑／更正

- Gemini 說 `Array.prototype.keys()` 「會無視稀疏陣列的孔洞，將不存在值的索引視為 undefined 處理」——<mark style="background: #BBFABBA6;">結論正確，但措辭要小心</mark>：`keys()` 本身只吐索引數字，它沒有把孔洞「視為 undefined」；是你拿那個索引回去讀 `arr[1]` 時，讀不到屬性才回傳 `undefined`。這兩件事在心裡分開比較不會混淆。
- Gemini 沒有提到 `Object.keys` 也會列出非索引的自有屬性，本篇表格已補。

## 相關題目練習

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 2635. Apply Transform Over Each Element in Array | https://leetcode.com/problems/apply-transform-over-each-element-in-array/ | 手寫 map，會直接遇到「要不要跳過孔洞」的抉擇 |
| LeetCode 2634. Filter Elements from Array | https://leetcode.com/problems/filter-elements-from-array/ | 手寫 filter，同上，練 (i) 的陷阱 |
| LeetCode 2626. Array Reduce Transformation | https://leetcode.com/problems/array-reduce-transformation/ | reduce 對空陣列與孔洞的行為是經典考點 |
| LeetCode 2727. Is Object Empty | https://leetcode.com/problems/is-object-empty/ | 直接考 `Object.keys` 的語意 |
| NeetCode — Arrays & Hashing 入門 | https://neetcode.io/roadmap | 索引與雜湊表視角的差異，是 (k) 判準的更一般版本 |

## 關聯筆記

- [[Object靜態方法速查]] — `Object.keys` 屬於靜態方法，那篇有完整清單與同族的 `values` / `entries`。
- [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] — 本篇是「陣列版」的兩個 keys 對照，那篇是「物件版」的四種列舉方法涵蓋範圍矩陣，合起來才完整。
- [[06-every短路求值與初始長度快照-命令式重構為宣告式]] — 同樣是「陣列方法怎麼看待 length 與孔洞」的主題，那篇談 `every` 的初始長度快照。
- [[02-陣列遍歷-forEach與callback]] — `forEach` 也會跳過孔洞，可與 (i) 的 `map` 陷阱一起記。
- [[for-in-迴圈迭代順序與特性]] — `for...in` 走的是屬性視角（跟 `Object.keys` 同陣營），`for...of` 走的是迭代器視角（跟 `arr.keys()` 同陣營），對照 (k) 的判準。
- [[09-物件陣列-陣列層vs物件層存取]] — 補強「陣列本質上就是物件」這個前提。
- [[Symbol-符號型別與物件key]] — `Object.keys` 不會列出 Symbol key，是本篇 (c) 「可枚舉自有屬性」限定範圍的另一半。

## 各對話來源（原文）

### 陣列與物件 Keys 方法差異解析（2026-08-28）— https://gemini.google.com/app/9debb9f807b83330

**使用者：**

```js
var arr = ["a", , "c"];
var sparseKeys = Object.keys(arr);
var denseKeys = [...arr.keys()];
console.log(sparseKeys); // ['0', '2']
console.log(denseKeys);  // [0, 1, 2]
```

所以 array.keys 方法是用來對輸出 index 數字用的嗎？所以靜態建構子方法 Object 的 keys 他不會出現在哪些場合？denseKeys 出現在哪些場合？

**Gemini：** `Array.prototype.keys()` 的主要用途確實是按順序產生陣列的所有索引，包含陣列中的稀疏孔洞。

1. 是的，但它輸出的是迭代器（Iterator），而不是直接回傳陣列。作用是產生從 `0` 到 `arr.length - 1` 的連續數字索引。重點特性是它會無視稀疏陣列的孔洞，將不存在值的索引視為 undefined 處理，因此能產生完整的索引序列（也就是你看到的 `[0, 1, 2]`，即 Dense Keys）。`console.log(arr.keys())` 會印出 `Object [Array Iterator] {}`，要 `[...arr.keys()]` 才轉成真正的陣列。

2. `Object.keys(obj)` 的本質是只收集物件／陣列上實際存在且可枚舉（Enumerable）的自有屬性鍵名，回傳字串陣列 `string[]`，對稀疏陣列會跳過孔洞（因為孔洞沒有實體屬性）。適用場合是只想處理真正有值或有定義的元素索引時、走訪一般物件的 key 時、避免對未賦值的稀疏孔洞做無謂的運算。

   `Array.prototype.keys()` 的本質是依據陣列的 `length` 屬性生成連續的索引序列，回傳 Array Iterator（數值 number），不會跳過孔洞，確保索引連續不間斷。適用場合是建立指定長度的連續數字陣列（`[...Array(10).keys()]` 得到 `[0..9]`）、搭配 `for...of` 走訪完整的索引範圍（包含孔洞）、需要確保演算法覆蓋全部索引位置時避免因為稀疏陣列導致某些索引漏掉未處理。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇對話（陣列與物件 Keys 方法差異解析） | https://gemini.google.com/app/9debb9f807b83330 | Gemini Flash，2026-08-28 |
| MDN — Object.keys() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys | MDN 現行版本，2026-08-29 查證 |
| MDN — Array.prototype.keys() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys | MDN 現行版本，2026-08-29 查證 |
| MDN — 陣列的稀疏性（Sparse arrays，含各方法是否跳過孔洞的整理） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#array_methods_and_empty_slots | MDN 現行版本，2026-08-29 查證 |
| ECMA-262 — Array.prototype.keys | https://tc39.es/ecma262/#sec-array.prototype.keys | ECMAScript 現行草案，2026-08-29 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-08-29
