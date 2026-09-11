---
title: "Array.prototype.find() — 短路、falsy 陷阱，以及如何取得「所有」符合的索引"
type: topic-note
source: Claude
category: 技術
tags: [array, find, findIndex, findLastIndex, flatMap, truthy, falsy, 短路, short-circuit, callback, 迭代方法]
related:
  - "[[04-filter方法與callback定義]]"
  - "[[02-陣列遍歷-forEach與callback]]"
  - "[[06-every短路求值與初始長度快照-命令式重構為宣告式]]"
  - "[[箭頭函式的兩組括號-參數小括弧與主體大括弧-隱式回傳]]"
  - "[[JavaScript資料型別總覽-原始型別與物件]]"
demo: 05-demo-find-短路與取得所有符合的索引.js
updated: 2026-09-11
---

# Array.prototype.find() — 短路、falsy 陷阱與取得所有索引

> 本篇重點 a–k，共 11 個。
> 主軸圖：`![[學習JS_圖解_find的短路迴圈-falsy要繼續而不是回undefined_2026-09-11.svg]]`
> 可執行範例：`demo-find-短路與取得所有符合的索引.js`（已實跑驗證）

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | `find` 回傳什麼 | **元素本身**，不是 callback 的回傳值、也不是索引 | §1 |
| Q2 | 什麼時候回 `undefined` | **走完整個陣列都沒有任何一次 truthy** 才回 | §1 |
| Q3 | 回傳 `0` 時為什麼 `if` 進不去 | `0` 是 falsy，`if (找到的元素)` 會誤判 | §2 |
| Q4 | 怎麼拿索引 | `findIndex`（第一個）、`findLastIndex`（最後一個） | §3 |
| Q5 | 怎麼拿**全部**索引 | `find` 家族做不到，要用 `flatMap` / `reduce` / `keys()` | §4 |

---

## 1. find 的真實流程：它是一個「會回頭」的迴圈

```text
i = 0
  ↓
i < arr.length ? ── 否 ──→ 回傳 undefined（走完都沒找到）
  │ 是
  ↓
執行 callbackFn(element, index, array)
  ↓
回傳值是 truthy 嗎 ?
  ├─ 是   ──→ 回傳 arr[i]（元素本身），立刻停止
  └─ falsy ──→ i = i + 1 ──→ 回到上面的 i < arr.length
```

- (a) **回傳的是「元素」不是 callback 的回傳值。** callback 回傳 truthy 只是「這一格通過測試」的訊號，`find` 拿到訊號後去取 `arr[i]` 給你。**這正是 find 與 filter / some / map 的分界點。**
- (b) **falsy 不等於「回傳 undefined」。** falsy 的意思是「這一格不合格，繼續看下一個」。只有**整個陣列走完**都沒有 truthy，才回 `undefined`。
- (c) **短路（short-circuit）**：找到就立刻停，後面的元素完全不看。實測：

```js
let count = 0;
[1,2,3,4,5].find(e => { count++; return e === 3; });
// count === 3   ← 陣列長度 5，但只呼叫 3 次

count = 0;
[1,2,3,4,5].filter(e => { count++; return e === 3; });
// count === 5   ← filter 一定全部走完
```

- (d) callback 拿到三個參數 `(element, index, array)`，都是 `find` 幫你傳的，你可以只收前面幾個。第二個參數 `thisArg` 會指定 callback 裡的 `this`（箭頭函式無效，因為箭頭函式沒有自己的 `this`）。

---

## 2. ⚠️ 最容易踩的坑：回傳值是 falsy 時

```js
const array1 = [15, 555, 80, 7, 0, 77589];
const find1 = array1.find((e, i) => e < 2);

console.log(find1);                 // 0        ← 不是 undefined！有找到
console.log(typeof find1);          // "number"
console.log(find1 === undefined);   // false

if (find1) {
  console.log("進到 if");
} else {
  console.log("⚠️ 沒進 if，但其實有找到");   // ← 執行到這行
}
```

- (e) ★ **`0` 是 falsy，所以「有找到」卻被 `if` 判成「沒找到」。** 同樣的坑還有找到 `""`、`NaN`、`false`、`null`、`undefined` 這幾個 falsy 元素時。

**正解**：跟 `undefined` 比，不要把結果直接丟進 `if`。

```js
if (find1 !== undefined) { /* 真的有找到 */ }
```

- (f) **7 個 falsy 值，其餘一律 truthy**：

| falsy 值 | 說明 |
|---|---|
| `false` | 布林的假 |
| `0` | 數字零 |
| `-0` | **負零**。IEEE 754 有正零也有負零。`-0 === 0` 是 `true`，只有 `Object.is(-0, 0)`（`false`）和 `1/-0`（`-Infinity`）分得出來 |
| `0n` | **BigInt 的零**。結尾的 `n` 是 BigInt 字面量語法，`typeof 0n === "bigint"` |
| `""` | **空**字串（只有空的才 falsy） |
| `null` | 明確的「沒有值」 |
| `undefined` | 還沒被賦值 |
| `NaN` | Not a Number |
| `document.all` | **全語言唯一「是物件卻 falsy」的東西**，見下方 (f-2) |

- (f-2) ⭐ **`document.all` 是規範裡刻意開的後門**。它是 IE 時代用來抓元素的 API（`document.all.myId`）。當年很多網站用 `if (document.all)` 來**偵測是不是 IE**，如果其他瀏覽器實作它並讓它 truthy，就會被誤判成 IE 而走進爛的相容路徑。所以規範給它一個特殊內部標記 **`[[IsHTMLDDA]]`**，讓它：
  1. `Boolean(document.all)` → `false`
  2. `typeof document.all` → `"undefined"`（而不是 `"object"`）
  3. `document.all == null` → `true`
  你**永遠不需要用它**，記住它只是為了答面試題「falsy 有哪幾個」。

- (f-3) **「其餘一律 truthy」比背清單更重要**。判斷方法是「**它在不在那 7 個裡**」，不是「它看起來像不像 false」：

```js
Boolean([]);         // true  ← 空陣列也是 truthy（所有陣列都是）
Boolean([0]);        // true
Boolean({});         // true  ← 空物件也是
Boolean("false");    // true  ← 非空字串，內容寫什麼都無所謂
Boolean("0");        // true  ← 字串的 "0" 不是數字的 0
Boolean("");         // false ← 只有「空」字串才 falsy
```

- (f-4) ⚠️ **但 `==` 走的不是 ToBoolean**，所以會出現看似矛盾的結果：

```js
if ([]) { /* 會進來 */ }    // [] 是 truthy
[] == false;                 // true  ← ?!
```

原因是 `==` 做的是 `ToPrimitive` → `ToNumber`：`[]` 轉成 `""` 再轉成 `0`，而 `false` 也轉成 `0`，所以相等。**`if` 問的是「truthy 嗎」，`==` 問的是「轉成數字後一樣嗎」，兩個完全不同的問題。** 詳見 [[JavaScript資料型別總覽-原始型別與物件]] 第 4-b 節。
- (g) 判斷是「回傳值 truthy 嗎」不是「回傳 `true` 嗎」—— 規範內部做的是 `ToBoolean()`，所以 callback 回傳 `"yes"`、`1`、`[]` 都算通過。

---

## 3. 要索引：findIndex / findLastIndex

```js
const arr = [15, 0, 80, 7, 0, 77589];
arr.findIndex(e => e === 0);       // 1   第一個符合的索引
arr.findLastIndex(e => e === 0);   // 4   最後一個符合的索引
arr.indexOf(0);                    // 1   不吃 callback，只比值
```

- (h) 找不到時 `findIndex` / `findLastIndex` / `indexOf` 都回 **`-1`**，不是 `undefined`。**這比 `find` 安全**，因為 `-1` 是 truthy，不會有 §2 那個坑；但要注意 `-1` 判斷要寫 `!== -1` 不能寫 `if (idx)`（索引 0 也是 falsy）。

---

## 4. 要「全部」的索引：find 家族做不到

`find` / `findIndex` 只給你一個。要全部，用這幾種：

> ⚠️ 先講清楚回傳的東西是什麼：以 `[15, 0, 80, 7, 0, 77589]` 為例，答案是 **`[1, 4]`**。
> 這 `[1, 4]` 是**索引（位置）**不是值 —— 兩個 `0` 分別坐在第 1 格和第 4 格（從 0 開始數）。

**(a) flatMap（推薦）**

```js
arr.flatMap((e, i) => e === 0 ? [i] : []);
```

**中文白話**：逐格檢查，「這一格的值**嚴格等於數字 0** 嗎？是的話交出一個**只裝著它索引的小陣列** `[i]`，不是的話交出一個**空陣列** `[]`」。最後 `flatMap` 把所有小陣列**攤平一層**，空陣列攤平後什麼都不留，等於被過濾掉。

```js
// 中間過程長這樣（實跑結果）
[15, 0, 80, 7, 0, 77589].map((e,i) => e === 0 ? [i] : [])
// → [ [], [1], [], [], [4], [] ]     ← map 只到這裡
// flatMap 多做一步攤平 → [1, 4]
```

⚠️ `e === 0` 是「**等於數字 0**」，不是「e 有值」。想找「有值的」要寫 `e != null` 或 `Boolean(e)`。

**(b) reduce**

```js
arr.reduce((acc, e, i) => e === 0 ? [...acc, i] : acc, []);
```

**中文白話**：準備一個**累加器 `acc`，從空陣列 `[]` 開始**（最後那個 `[]` 就是初始值）。逐格檢查，「這格等於 0 嗎？是的話就**把舊的 acc 攤開再把索引 i 接在後面**，變成一個新陣列；不是的話就**原封不動把 acc 傳下去**」。全部走完後，acc 就是答案。

**(c) map ＋ filter**

```js
arr.map((e, i) => e === 0 ? i : -1).filter(i => i !== -1);
```

**中文白話**：第一趟先把整個陣列**改寫成索引**：符合的位置放它的索引，不符合的位置放 `-1` 當**哨兵值**（一個「這格不算數」的記號）。第二趟再把所有 `-1` 濾掉。

**(d) keys ＋ filter**

```js
[...arr.keys()].filter(i => arr[i] === 0);
```

**中文白話**：`arr.keys()` 會給出「所有索引」的迭代器，用 `...` 展開成陣列 `[0,1,2,3,4,5]`，然後**直接對索引過濾** —— 「這個索引指到的值等於 0 嗎？」。這招完全不動元素，只挑位置。

**(e) indexOf 迴圈**

```js
const out = [];
let pos = arr.indexOf(0);          // 先找第一個
while (pos !== -1) {
  out.push(pos);                   // 記下這個位置
  pos = arr.indexOf(0, pos + 1);   // 從「下一格」再找
}
```

**中文白話**：`indexOf` 的**第二個參數是「從第幾格開始找」**。所以先找到一個、記下來、再從它的下一格繼續找，找不到時 `indexOf` 回 `-1`，迴圈就停。老派寫法，但不建立任何中間陣列，效能最好。

**五種寫法比較**

| 寫法 | 走幾趟 | 建中間陣列 | 評價 |
|---|---|---|---|
| flatMap | 1 | 每格一個小陣列 | 最簡潔，日常首選 |
| reduce | 1 | 每次都展開一個新 acc | 最通用，但展開有成本 |
| map ＋ filter | 2 | 2 個 | 最好讀，但走兩趟 |
| keys ＋ filter | 1（＋展開） | 1 個索引陣列 | 不碰元素，語意清楚 |
| indexOf 迴圈 | 1 | 無 | 效能最好，最不好讀 |

- (i) ⚠️ **map + filter 那招的哨兵值不能用 `0`**：

```js
const arr3 = [0, 5, 0];
arr3.map((e,i) => e === 0 ? i : -1).filter(i => i !== -1);  // [0, 2] ✅
arr3.map((e,i) => e === 0 ? i : 0 ).filter(i => i !== 0 );  // [2]    ❌ 索引 0 被自己的哨兵吃掉
```

---

## 5. find 家族一次看懂：回傳的東西完全不同

| 方法 | 吃 callback | 回傳 | 找不到時 | 會不會短路 |
|---|---|---|---|---|
| `find` | ✅ | **元素** | `undefined` | ✅ 找到就停 |
| `findIndex` | ✅ | **索引** | `-1` | ✅ |
| `findLast` | ✅ | 元素（從後往前） | `undefined` | ✅ |
| `findLastIndex` | ✅ | 索引（從後往前） | `-1` | ✅ |
| `filter` | ✅ | **新陣列**（全部符合的元素） | `[]` | ❌ 全部走完 |
| `some` | ✅ | **布林**（有沒有任一個） | `false` | ✅ |
| `every` | ✅ | **布林**（是不是全部） | — | ✅ 遇到 falsy 就停 |
| `includes` | ❌ 只比值 | 布林 | `false` | ✅ |
| `indexOf` | ❌ 只比值 | 索引 | `-1` | ✅ |

- (j) `includes` 與 `indexOf` 的差別：`includes` 用 **SameValueZero** 比較，**找得到 `NaN`**；`indexOf` 用 `===`，**找不到 `NaN`**。

```js
[NaN].includes(NaN);   // true
[NaN].indexOf(NaN);    // -1   ← 因為 NaN !== NaN
```

- (k) 這一條直接連到 [[比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對]]：`===`、`Object.is`、SameValueZero 三者對 `NaN` 與 `-0` 的處理各不相同。

---

## 對應題目練習

- [LeetCode 2634. Filter Elements from Array](https://leetcode.com/problems/filter-elements-from-array/) — 自己實作 `filter`，會逼你處理 truthy 判斷與 callback 三參數
- [LeetCode 2635. Apply Transform Over Each Element in Array](https://leetcode.com/problems/apply-transform-over-each-element-in-array/) — 自己實作 `map`
- [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/) — falsy 清單實戰，本篇 (f) 的直接應用

---

## 相關筆記（含關聯理由）

- [[04-filter方法與callback定義]]
  **理由**：本篇 §5 說 `find` 回傳元素、`filter` 回傳新陣列，兩篇對照才看得出「短路 vs 走完」的成本差異。
- [[06-every短路求值與初始長度快照-命令式重構為宣告式]]
  **理由**：`every` 與 `find` 都會短路，那篇還多講了「初始長度快照」這個 `find` 也適用的細節。
- [[箭頭函式的兩組括號-參數小括弧與主體大括弧-隱式回傳]]
  **理由**：本篇範例 `(e, i) => e < 2` 為什麼沒有大括弧也沒有 `return`，答案在那篇。
- [[JavaScript資料型別總覽-原始型別與物件]]
  **理由**：本篇 (e)(f) 的 falsy 陷阱，7 個 falsy 值的完整清單在那篇第 4 節。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| `Array.prototype.find()` 定義與回傳值 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find | MDN，2026-09-11 查證 |
| `findIndex` / `findLastIndex` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex | MDN，2026-09-11 查證 |
| `flatMap`（取得全部索引的推薦寫法） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap | MDN，2026-09-11 查證 |
| Falsy 值的完整定義 | https://developer.mozilla.org/en-US/docs/Glossary/Falsy | MDN，2026-09-11 查證 |
| `includes` 用 SameValueZero | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes | MDN，2026-09-11 查證 |
| 規範原文 `Array.prototype.find` | https://tc39.es/ecma262/#sec-array.prototype.find | ECMA-262，2026-09-11 查證 |

> 本篇所有輸出皆由 `demo-find-短路與取得所有符合的索引.js` 在本機 Node 實跑驗證，非憑記憶書寫。
