---
title: 物件 Key 的排序規則 — 整數索引會插隊、Map 才真正保序、forEach 不能吃物件
type: topic-note
source: Gemini
tags: [gemini, javascript, object, key, ordering, map, for-in, foreach]
aliases: [物件Key排序規則, 整數索引插隊]
related:
  - "[[for-in-迴圈迭代順序與特性]]"
  - "[[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]]"
  - "[[Object靜態方法速查]]"
  - "[[陣列遍歷-forEach與callback]]"
  - "[[Symbol-符號型別與物件key]]"
sources:
  - https://gemini.google.com/app/cd826fdfe895682b
updated: 2026-09-05
---

# 物件 Key 的排序規則 — 整數索引會插隊、Map 才真正保序、forEach 不能吃物件

> [!info]- 🔗 與既有筆記的關聯
> (1) [[for-in-迴圈迭代順序與特性]] 已經記過 `for...in` 的迭代特性，本篇補的是「為什麼順序長那樣」的規格層原因——OrdinaryOwnPropertyKeys 的三段式排序，兩篇合看才完整。
> (2) [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] 講「哪個方法看得到哪些 key」，本篇講「看到的 key 會照什麼順序排」，一個是範圍、一個是順序。
> (3) 最後一節「forEach 不能用在物件」直接連到 [[陣列遍歷-forEach與callback]]，因為錯誤訊息 `obj.forEach is not a function` 的根源就是 forEach 掛在 `Array.prototype` 上。

> 本篇重點 a–k，共 11 個。

## 重點整理

### 一、規格層的三段式排序（a–d）

(a) <mark style="background: #FFF3A3A6;">物件 key 的順序「有規範且固定」，但不完全等於你寫入或新增的順序</mark>。自 ES6（ES2015）起這件事被寫進規格，`Object.keys()`、`for...in`、`Reflect.ownKeys()` 都遵守。

(b) <mark style="background: #ADCCFFA6;">排序三段式</mark>：

| 順位 | Key 類型 | 排序方式 |
| --- | --- | --- |
| 1 | 整數索引鍵（可轉為正整數的 key，如 `"0"`、`"42"`） | 依數值大小由小到大 |
| 2 | 其他字串鍵 | 依建立／新增的先後順序 |
| 3 | Symbol 鍵 | 依建立／新增的先後順序 |

(c) <mark style="background: #FF5582A6;">「新增的一定排在最下面」這個直覺是錯的</mark>。整數 key 會被強制插隊到最前面。

```js
const obj = {};
obj["70"] = true;       // 第 1 個新增
obj["0"] = true;        // 第 2 個新增
obj["jessica"] = true;  // 第 3 個新增
obj["8"] = true;        // 第 4 個新增
obj["40"] = true;       // 第 5 個新增
obj["1"] = true;        // 第 6 個新增

console.log(Object.keys(obj));
// 期待（新增順序）：["70", "0", "jessica", "8", "40", "1"]
// 實際：           ["0", "1", "8", "40", "70", "jessica"]
```

(d) 讀法：<mark style="background: #FFF3A3A6;">`"0"` 和 `"1"` 明明後來才加，卻被硬塞到最前面；`"70"` 明明第一個加，卻被排到數字區的最後面；只有非數字的 `"jessica"` 乖乖留在最後保持新增順序。</mark>

### 二、真的要保序怎麼辦（e–g）

(e) <mark style="background: #BBFABBA6;">最推薦：改用 `Map`</mark>。Map 的 key 嚴格按插入順序（Insertion Order）保存，不管 key 是數字、字串還是其他型別。

```js
const myMap = new Map();
myMap.set("b", "字串b");
myMap.set(2, "整數2");
myMap.set("a", "字串a");
myMap.set(1, "整數1");

for (const [key, value] of myMap) {
  console.log(key, value);   // b → 2 → a → 1，完全保留插入順序
}
```

(f) <mark style="background: #D2B3FFA6;">次要解法：另外開一個陣列紀錄 key 的順序</mark>，走訪時依陣列跑，物件只負責存值。

```js
const order = ["b", 2, "a", 1];
const obj = { b: "字串b", 2: "整數2", a: "字串a", 1: "整數1" };

order.forEach(key => {
  console.log(key, obj[key]);
});
```

(g) <mark style="background: #FFB8EBA6;">Map 還有一個關鍵差異：Map 的 key 可以是任何型別（物件、函式、Symbol、數字），Object 的 key 只能是字串或 Symbol</mark>——`obj[2]` 其實存的是 `"2"`，這正是整數 key 會被特別排序的原因。

### 三、`order.forEach(key => ...)` 裡的 key 是哪來的（h–i）

(h) <mark style="background: #ADCCFFA6;">`key` 是你自己命名的參數（Parameter），用來接收 forEach 每一輪傳進來的元素</mark>，不需要另外 `const` 或 `let` 宣告，因為參數本身就是一個綁定。

```js
// forEach 寫法
order.forEach(key => {
  console.log(key, obj[key]);
});

// 等價的 for 迴圈寫法
for (let i = 0; i < order.length; i++) {
  const key = order[i];       // 這裡才需要自己宣告
  console.log(key, obj[key]);
}
```

(i) 名字可以隨便取，`item`、`k` 都一樣：`order.forEach(item => console.log(item, obj[item]))` 效果完全相同。

### 四、forEach 不能直接吃物件（j–k）

(j) <mark style="background: #FF5582A6;">`Array.prototype.forEach` 只掛在陣列的原型上，普通物件沒有這個方法</mark>。

```js
const obj = { b: "字串b", 2: "整數2" };
obj.forEach(key => { });
// ❌ Uncaught TypeError: obj.forEach is not a function
```

(k) <mark style="background: #BBFABBA6;">要走訪物件的兩條正路</mark>：

```js
// 1. 先把 key 轉成陣列（最常用）
Object.keys(obj).forEach(key => {
  console.log(key, obj[key]);
});

// 2. 直接用 for...in（原生專門走訪物件 key，但會往上找到原型鏈上的可列舉屬性）
for (const key in obj) {
  console.log(key, obj[key]);
}
```

> [!warning] for...in 的補充陷阱
> `for...in` 會連原型鏈上的可列舉屬性一起走訪，所以正式程式碼常要搭配 `Object.prototype.hasOwnProperty.call(obj, key)` 過濾，或直接改用 `Object.keys()` / `Object.entries()`。詳見 [[for-in-迴圈迭代順序與特性]]。

## ⚠️ 存疑／更正

- Gemini 說「整數索引鍵（如 `"0"`, `"1"`, `"42"`）」，<mark style="background: #FF5582A6;">規格用的詞是 array index，範圍是 0 到 2^32 − 2 的正整數字串</mark>。超過這個範圍的數字字串（例如 `"4294967296"`）不算 array index，會被當成一般字串 key、依新增順序排。這個邊界 Gemini 沒有提到。
- 「負數與小數不算整數索引」也沒提到：`obj[-1]`、`obj[1.5]` 都會被當普通字串 key。

## 🔗 相關練習題（LeetCode JavaScript 專區）

| 主題 | 題目 | 連結 |
| --- | --- | --- |
| Object.keys 判斷空物件 | 2727. Is Object Empty | https://leetcode.com/problems/is-object-empty/ |
| 用物件／Map 當快取 key | 2623. Memoize | https://leetcode.com/problems/memoize/ |
| 遞迴走訪物件與陣列 | 2705. Compact Object | https://leetcode.com/problems/compact-object/ |

## 各對話來源

### JavaScript 物件 Key 的排序規則與解法（2026-09）— https://gemini.google.com/app/cd826fdfe895682b

**使用者：** 物件的 key 在印出來的時候到底有沒有按照順序？沒有的話要怎麼達成？

**Gemini：** 順序是有規範且固定的，但不完全等於寫入或新增的順序。自 ES6 起規範要求：整數索引鍵按數值由小到大 → 非整數字串鍵按新增順序 → Symbol 鍵按新增順序。要完全按插入順序，最推薦用 `Map`（key 嚴格按 Insertion Order 保存，且 key 可以是任何型別）；或用一個陣列另外紀錄 key 的順序再依序走訪。

**使用者：** 可是新增的是不是一定會在物件的最下排？那你是在說什麼哪裡有不等於？`{70, 0, jessica, 8, 40, 1}` 所以 `Object.keys(obj)` 會變成 `["0","1","8","40","70","jessica"]`？

**Gemini：** 是的，完全正確。「新增的一定在最下排」在 JavaScript 物件中並不成立。若照 `70 → 0 → jessica → 8 → 40 → 1` 的順序新增，按新增順序應該印出 `["70","0","jessica","8","40","1"]`，但整數 key 會被自動強制按數值排序，所以變成 `["0","1","8","40","70","jessica"]`。`"0"`、`"1"` 後加卻被塞到最前面，`"70"` 先加卻排到數字區最後，只有 `"jessica"` 保持新增順序。

**使用者：** 為什麼這邊有 key 可以直接使用變數？（指 `order.forEach(key => { console.log(key, obj[key]) })`）

**Gemini：** 因為在箭頭函式 `key => {...}` 裡，`key` 是你自己定義的參數名稱，用來接收 `order` 每次傳進來的元素。第一輪 `key = "b"`、第二輪 `key = 2`、第三輪 `key = "a"`、第四輪 `key = 1`。改寫成一般 for 迴圈就是 `const key = order[i]`。在 forEach 裡它寫在括號內作為參數，不需要再用 `const` 或 `let` 宣告，名字可以取成 `k` 或 `item`。

**使用者：** forEach 可以處理物件就對了？

**Gemini：** 不行，`Array.prototype.forEach` 不能直接用在物件上。上一段能用是因為 `order` 是陣列。對普通物件用會直接報錯 `Uncaught TypeError: obj.forEach is not a function`。要走訪物件請用 `Object.keys(obj).forEach(...)`（最常用），或用原生的 `for...in` 迴圈。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/cd826fdfe895682b | Gemini Flash，2026-09-05 |
| ECMA-262 — OrdinaryOwnPropertyKeys（三段式排序規格） | https://tc39.es/ecma262/#sec-ordinaryownpropertykeys | ECMAScript 現行草案，2026-09-05 查證 |
| ECMA-262 — Array Index 定義（0 到 2^32 − 2） | https://tc39.es/ecma262/#array-index | ECMAScript 現行草案，2026-09-05 查證 |
| MDN — Object.keys() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys | MDN 現行版本，2026-09-05 查證 |
| MDN — Map（key 保持插入順序、key 可為任何型別） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map | MDN 現行版本，2026-09-05 查證 |
| MDN — for...in（會走訪原型鏈上的可列舉屬性） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in | MDN 現行版本，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
