---
title: 為什麼需要陣列 — new Array 建立、map 轉換、thisArg 與 at 負索引、Array.from 通用工廠
type: topic-note
source: Gemini
tags: [gemini, javascript, array, map, array-from, at, thisArg, symbol, weakmap]
aliases: [為什麼需要陣列, new-Array與map轉換]
related:
  - "[[map-轉換陣列重點與練習]]"
  - "[[陣列遍歷-forEach與callback]]"
  - "[[filter方法與callback定義]]"
  - "[[Object-keys與Array-keys-稀疏陣列孔洞的差異]]"
  - "[[Symbol-符號型別與物件key]]"
sources:
  - https://gemini.google.com/app/8bb318387dd5c73d
  - https://gemini.google.com/app/bd15f46160f3c7ac
updated: 2026-09-05
---

# 為什麼需要陣列 — new Array 建立、map 轉換、thisArg 與 at 負索引、Array.from 通用工廠

> [!info]- 🔗 與既有筆記的關聯
> 本篇把兩串 Gemini 對話合併：一串是「陣列存在的理由」（很基礎但是面試會被問到「為什麼不用一堆變數」），一串是「new Array 到 map 到 Array.from 的一整條轉換鏈」。
> 關聯理由如下：
> (1) [[map-轉換陣列重點與練習]] 已有 map 的練習題，本篇補的是 map 規格層的兩個細節——第二參數 `thisArg` 與稀疏陣列跳過，兩篇互為表裡。
> (2) [[陣列遍歷-forEach與callback]] 講 forEach，本篇第三節正好是「map 與 forEach 的目的差異」，讀完兩篇才不會混用。
> (3) [[Object-keys與Array-keys-稀疏陣列孔洞的差異]] 講孔洞，本篇 (l) 點的「map 跳過 empty slot」是同一個底層現象的另一個切面。
> (4) 最後一節的 Symbol 與 WeakMap 屬於 [[Symbol-符號型別與物件key]] 的延伸，因為對話是從「陣列與 Map 的 key 可以放什麼」延伸出去的，故收在本篇並雙向連結。

> 本篇重點 a–v，共 22 個。

## 重點整理

### 一、陣列存在的理由（a–d）

(a) <mark style="background: #FFF3A3A6;">陣列的核心價值是「一個變數名稱，裝一整串相關的值」</mark>。不用陣列的笨方法是替每個項目各宣告一個變數。

```js
// 笨方法：不使用陣列
let item1 = "蘋果";
let item2 = "牛奶";
let item3 = "麵包";
// 如果有 50 個東西，你就得寫 50 行宣告...

// 好方法：使用陣列
let shoppingList = ["蘋果", "牛奶", "麵包"];
```

(b) <mark style="background: #BBFABBA6;">只要一個變數</mark>：不需要為每一個項目分別取名字，也不必事先「盲猜」到底會有幾筆資料。

(c) <mark style="background: #BBFABBA6;">長度彈性</mark>：要加第四個項目直接 `shoppingList.push("雞蛋")`，不必回頭去多宣告一個 `item4`。

(d) <mark style="background: #BBFABBA6;">方便處理</mark>：要對全部資料做同一件事時，只要一個迴圈跑這一個變數即可，不必寫幾十個 `if` 或重複的程式碼。

> [!tip] 面試一句話
> 陣列解決的不是「存得下」，而是<mark style="background: #FFF3A3A6;">「數量未知」與「批次處理」</mark>這兩件事。

### 二、new Array(5).fill(0).map() 的星星陷阱（e–h）

(e) <mark style="background: #FF5582A6;">下面這段程式碼會讓畫面一片空白</mark>，因為箭頭函式一旦用了大括號 `{}`，就必須自己寫 `return`；沒寫 `return` 的函式預設回傳 `undefined`，`.map()` 就產出一個全是 `undefined` 的陣列。

```jsx
// ❌ 有 Bug：大括號卻沒有 return
{new Array(5).fill(0).map((_, index) => {
  <Star key={index} />
})}
```

(f) <mark style="background: #BBFABBA6;">兩種正確寫法</mark>：

```jsx
// 寫法 A：補上 return
{new Array(5).fill(0).map((_, index) => {
  return <Star key={index} />;
})}

// 寫法 B：改用小括號直接回傳（最推薦）
{new Array(5).fill(0).map((_, index) => (
  <Star key={index} />
))}
```

(g) <mark style="background: #ADCCFFA6;">`new Array(5)` 只是「長度 5 的空洞陣列」，必須 `.fill(0)` 才會變成真正有 5 個元素的 `[0,0,0,0,0]`</mark>。沒有 fill 的話裡面全是 empty slot，`.map()` 會直接跳過、什麼都不產生。

(h) 它不是「把 Star 填進原陣列」，而是<mark style="background: #FFF3A3A6;">根據原陣列產生一個全新的 JSX 陣列</mark>：`[<Star key="0"/>, <Star key="1"/>, ...]`，React 收到這個陣列後就渲染出 5 顆星星。

### 三、怎麼精準解釋 map（i–l）

(i) <mark style="background: #ADCCFFA6;">一句話定義：`map()` 是一個「1 對 1 的陣列轉換器」</mark>。它巡訪原陣列每個元素、對每個元素做處理，回傳一個長度相同的新陣列，且完全不破壞原陣列。

(j) <mark style="background: #FF5582A6;">只說「對每個元素做事情」不夠精準</mark>，會跟 `forEach()` 搞混。差別在「目的與回傳值」：

| 方法 | 目的 | 回傳值 | 典型用途 |
| --- | --- | --- | --- |
| `forEach()` | 純粹做事情 | `undefined` | 印 log、送 API、改外部變數 |
| `map()` | 做事情並加工成新資料 | 長度相同的新陣列 | 資料轉換、渲染列表 |

(k) 口語比喻：<mark style="background: #FFB8EBA6;">傳一籃蘋果進削皮機（callback），出來一定是數量一模一樣的一籃削皮蘋果</mark>。

(l) 三大特性：<mark style="background: #FFF3A3A6;">等長轉換</mark>、<mark style="background: #FFF3A3A6;">不改變原陣列（Immutable）</mark>、<mark style="background: #FFF3A3A6;">跳過空位（sparse array 的 empty slot 不執行 callback）</mark>。

```js
const numbers = [1, 2, 3];

const doubled = numbers.map((num) => num * 2);
console.log(doubled);  // [2, 4, 6]  新陣列
console.log(numbers);  // [1, 2, 3]  原陣列不受影響
```

### 四、map 的第二個參數 thisArg（m–n）

(m) <mark style="background: #ADCCFFA6;">`array.map(callback, thisArg)` 的 `thisArg` 用來指定 callback 內部的 `this` 指向誰</mark>。

```js
const multiplier = {
  factor: 3,
  multiply(num) {
    return num * this.factor;   // 這裡的 this 會指向 multiplier
  }
};

const numbers = [1, 2, 3];
const tripled = numbers.map(function (num) {
  return this.multiply(num);    // this 就是 multiplier
}, multiplier);

console.log(tripled);  // [3, 6, 9]
```

(n) <mark style="background: #FF5582A6;">只有傳統 `function()` 會受 thisArg 影響，箭頭函式完全不吃這一套</mark>，因為箭頭函式的 `this` 在定義時就由詞法作用域綁死了。現代寫法幾乎不再用 thisArg，屬於「看得懂就好」的規格知識。

### 五、最後一個元素與負索引 at(-1)（o–q）

(o) <mark style="background: #FF5582A6;">`arr[-1]` 不會拿到最後一個元素</mark>。方括號會把 `-1` 當成字串 key，去找名為 `"-1"` 的屬性，結果是 `undefined`。

(p) <mark style="background: #BBFABBA6;">`arr.at(-1)` 才可以</mark>，`at()` 支援負數索引，`-1` 就是最後一個。舊寫法只能 `arr[arr.length - 1]`。

```js
const colors = ['red', 'green', 'blue'];
console.log(colors[colors.length - 1]);  // 'blue'
console.log(colors.at(-1));              // 'blue'
console.log(colors[-1]);                 // undefined ← 陷阱
```

(q) 為什麼需要負索引？<mark style="background: #FFB8EBA6;">不必計算長度、不必重複寫變數名稱</mark>。舊寫法 `getListOfItems()[getListOfItems().length - 1]` 會把函式執行兩次，`getListOfItems().at(-1)` 只執行一次。`slice(-2)` 早就支援負數，`at()` 只是把這個慣例補齊。

### 六、Array.from 是「通用工廠」（r–s）

(r) 這一串組合拳的白話翻譯：

```js
console.log(Array.from.call(NotArray, new Set(["foo", "bar", "baz"])));
```

<mark style="background: #FFF3A3A6;">「呼叫 `Array.from` 這個靜態方法，但強制把它的 `this` 指向 `NotArray`，並把 Set 的內容交給 `NotArray` 去實體化出一個新物件。」</mark>

(s) <mark style="background: #ADCCFFA6;">`Array.from` 是通用工廠方法（Generic Factory Method）</mark>：它建立結果時會去呼叫「當下的 `this` 建構函式」，預設 `this` 就是 `Array`；用 `.call(NotArray)` 換掉 `this` 之後，產出的就不是原生陣列而是 `NotArray` 的實體。

```js
function NotArray(len) {}

console.log(Array.from.call(NotArray, new Set(["foo", "bar", "baz"])));
// NotArray { '0': 'foo', '1': 'bar', '2': 'baz', length: 3 }
```

> [!note] 這是 MDN 的極端示範
> 它想證明的是「`Array.from` 不綁死在 Array 上」，實務上幾乎不會這樣寫，但它是理解 `.call()` 改變 `this` 的最好教材。

### 七、延伸：Symbol 當 Map / WeakMap 的 key（t–v）

(t) <mark style="background: #BBFABBA6;">Symbol 可以當 Object 的 key，也可以當 Map 的 key 與 value</mark>。差別是：Object 用 Symbol 當 key 時，`Object.keys()` 與 `JSON.stringify()` 抓不到，必須用 `Object.getOwnPropertySymbols()`；<mark style="background: #FFF3A3A6;">Map 則一視同仁，`myMap.keys()` 或 forEach 都能正常遍歷到 Symbol key</mark>。

```js
// 貼到 F12 Console 練習
const symKey1 = Symbol("id");
const symKey2 = Symbol("id");   // 描述一樣但完全是不同的 Symbol

const myMap = new Map();
myMap.set(symKey1, "User_001");
myMap.set(symKey2, "User_002");

console.log(myMap.get(symKey1));  // "User_001"
console.log(myMap.size);          // 2
```

(u) <mark style="background: #ADCCFFA6;">garbage-collectable values（可被垃圾回收的值）</mark>指的是「能被引擎追蹤引用狀態、沒人使用時會自動從記憶體清掉」的值。`WeakMap` / `WeakSet` 規定 key 必須是這種值。

| 型別 | 是不是 garbage-collectable | 能不能當 WeakMap 的 key |
| --- | --- | --- |
| 物件 Object | 是 | 可以 |
| 非全域 Symbol（`Symbol("foo")`） | 是（ES2023 起） | 可以 |
| 全域 Symbol（`Symbol.for("foo")`） | 否，被全域註冊表永久引用 | 不可以 |
| 基礎型別 Number / String / Boolean | 否 | 不可以，丟 TypeError |

```js
const wm = new WeakMap();
const objKey = { name: "test" };
const symKey = Symbol("weakKey");

wm.set(objKey, "value1");     // ✅
wm.set(symKey, "value2");     // ✅ 非全域 Symbol 可以
console.log(wm.get(symKey));  // "value2"

try {
  wm.set(123, "value3");      // ❌
} catch (e) {
  console.error("報錯：", e.message);
  // TypeError: Invalid value used as weak map key
}
```

(v) <mark style="background: #FFF3A3A6;">怎麼分辨 Symbol 是不是全域？看你怎麼建立它</mark>。`Symbol("foo")` 是非全域、獨一無二（`Symbol("foo") === Symbol("foo")` 為 `false`）；`Symbol.for("foo")` 會註冊進全域 Symbol Registry，同名就是同一個實體。判斷語法用 `Symbol.keyFor(sym)`：非全域回傳 `undefined`，全域回傳描述字串。

## ⚠️ 存疑／更正

- Gemini 說「基礎型別通常直接存放在記憶體棧（Stack）」。<mark style="background: #FF5582A6;">這是常見的教學簡化，不是 ECMAScript 規格保證</mark>。規格只定義語意，值放 stack 還是 heap 是 V8 等引擎的實作選擇（V8 的 Smi 小整數確實內嵌，但字串是放在 heap 的）。真正的規格理由是：primitive 沒有「身分（identity）」，無法被追蹤引用，所以不能當 WeakMap 的 key。
- Gemini 說 `Map` 是「Object 的一種子類型（Subtype）」，這在概念上可以接受（`new Map() instanceof Object` 為 `true`），但嚴格講 <mark style="background: #FF5582A6;">Map 不是 Object 的 subclass</mark>，它是獨立的內建型別，只是同屬「引用資料型別」且原型鏈最終指向 `Object.prototype`。

## 🔗 相關練習題（LeetCode JavaScript 專區）

| 主題 | 題目 | 連結 |
| --- | --- | --- |
| map 轉換 | 2635. Apply Transform Over Each Element in Array | https://leetcode.com/problems/apply-transform-over-each-element-in-array/ |
| filter 與 callback | 2634. Filter Elements from Array | https://leetcode.com/problems/filter-elements-from-array/ |
| reduce 累加 | 2626. Array Reduce Transformation | https://leetcode.com/problems/array-reduce-transformation/ |
| 陣列切塊與長度計算 | 2677. Chunk Array | https://leetcode.com/problems/chunk-array/ |

## 各對話來源

### 為什麼我們需要陣列（2026-09）— https://gemini.google.com/app/8bb318387dd5c73d

**使用者：**（附上書本照片）誰會為整個資料串列來建立足夠的變數

**Gemini：** 沒有人會這麼做。這段話的意思是「如果你不使用陣列」，手動為每個項目逐一宣告變數（例如 `item1`、`item2`、`item3`）是一個非常笨重且不切實際的做法。書中的邏輯是透過反例比較來強調陣列的好處：笨方法要手動建立 100 個變數，且不知道數量時只能盲猜；好方法只要建一個陣列變數就能動態儲存任意數量的資料。

**使用者：** 使用陣列就是一個陣列變數然後一串值直接存入不是嗎

**Gemini：** 沒錯，概念完全就是這樣。使用陣列就是只宣告一個變數名稱，然後把一整串相關的值直接打包塞進去。核心優勢有三：只要一個變數、長度彈性（`push` 即可）、方便處理（一個迴圈跑完）。

### JavaScript new Array 用法與解析（2026-09）— https://gemini.google.com/app/bd15f46160f3c7ac

**使用者：** 「這個 scope 物件會在 heap 中繼續存活因為內層函式一直持有指向它的引用」，這個引用翻成 ref 嗎？scope chain 節點＝scope 物件？

**Gemini：** 是的。Reference 中文即「引用／參考」，口語常直接講 ref。Scope 物件（Environment Record）是單一作用域實體，Scope Chain 是由多個 Scope 物件透過指標鏈結起來的單向鏈結串列（Linked List），鏈上的每個節點就是一個 Scope 物件。

**使用者：** `{new Array(5).fill(0).map((_, index)=>{ <Star key={index} /> })}` 是把 Star 填入 array 嗎

**Gemini：** 不是把 `<Star/>` 填入原陣列，而是根據原陣列產生一個全新的 JSX 陣列。而且這段程式碼有 Bug、畫面會一片空白——箭頭函式用了大括號就必須加 `return`，否則回傳 `undefined`。正確寫法是補 `return`，或改用小括號直接回傳。運作三步：`new Array(5).fill(0)` 建立 `[0,0,0,0,0]`、`.map()` 轉換出新陣列（不改原陣列）、React 收到 5 個 `<Star/>` 就渲染 5 顆星星。

**使用者：** 我要如何解釋 map function？是可以對每個元素做事情嗎？

**Gemini：** 可以，但不夠精準，容易跟 `forEach()` 搞混。精準說法是「map() 是一個 1 對 1 的陣列轉換器，巡訪每個元素、對每個元素做處理，回傳一個長度相同的新陣列，且完全不破壞原陣列」。forEach 是純粹做事情、沒有回傳值；map 是做事情並加工成新資料。三大特性：等長轉換、不改變原陣列、跳過空位。

**使用者：** map function 有第二個參數 thisArg 是什麼時候？最末個 element 是 -1 的 index 嗎？為什麼會需要負數索引？

**Gemini：** `thisArg` 指定 callback 內部的 `this` 指向誰，只有傳統函式會受影響，箭頭函式不適用；現代 JS 已經非常少用。`arr[-1]` 不行（方括號會把 -1 當字串 key，拿到 `undefined`），標準寫法是 `arr[arr.length - 1]`，現代方法是 `arr.at(-1)`。需要負索引的理由是語意簡潔：不必計算長度、不必重複執行取陣列的表達式，也跟 `slice(-2)` 的慣例一致。

**使用者：** `console.log(Array.from.call(NotArray, new Set(["foo","bar","baz"])));` 這個組合拳一下 .from 一下 call 是什麼意思，翻譯一下

**Gemini：** 白話是「呼叫 `Array.from`，但強制把它的 `this` 指向 `NotArray`，並把 Set 轉化後傳給 `NotArray` 去實體化出一個新物件」。`Array.from` 是通用工廠方法，建立結果時會呼叫傳進去的 `this` 建構函式，預設是 `Array`；`.call(NotArray)` 把它換掉後，輸出就變成 `NotArray { '0':'foo', '1':'bar', '2':'baz', length: 3 }`。這是 MDN 用來展示 `Array.from()` 是 Generic 方法的極端示範。

**使用者：** Symbol 可以插在物件裡，那 Symbol 插在 Map 裡面呢？給我例子我要在 F12 console 練習。何謂 garbage-collectable values？是跟垃圾回收有關係嗎？

**Gemini：** Symbol 完全可以作為 Map 的 key 與 value，Map 的 key 可以是任何型別。Object 用 Symbol 當 key 時 `Object.keys()` 與 `JSON.stringify()` 抓不到，要用 `Object.getOwnPropertySymbols()`；Map 則可以直接遍歷到。garbage-collectable values 就是跟垃圾回收（GC）有關——指能被引擎追蹤引用狀態、沒人使用時自動清除的值。`WeakMap`/`WeakSet` 要求 key 必須是這種值：物件可以、非全域 Symbol（ES2023 新增）可以、基礎型別不行（會丟 `TypeError: Invalid value used as weak map key`）。

**使用者：** 所以 object 的 key 不能是 symbol 嗎？簡答就好。那 Map 會被歸類在 object 但是是 subtype 對嗎？非全域的 Symbol 這樣我哪知道他是 global？

**Gemini：** 可以，Object 的 key 完全可以是 Symbol，只是傳統列舉方法抓不到。Map 屬於引用資料型別（Object），概念上可視為 Object 的一種子類型。分辨全域與否看建立方式：`Symbol("foo")` 是非全域、獨一無二、可被 GC、能當 WeakMap key；`Symbol.for("foo")` 會註冊在全域 Symbol Registry、同名即同一實體、不可被 GC、不能當 WeakMap key。也可以用 `Symbol.keyFor(sym)` 檢查，非全域回傳 `undefined`。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 為什麼我們需要陣列（Gemini 對話） | https://gemini.google.com/app/8bb318387dd5c73d | Gemini Flash，2026-09-05 |
| JavaScript new Array 用法與解析（Gemini 對話） | https://gemini.google.com/app/bd15f46160f3c7ac | Gemini Flash，2026-09-05 |
| MDN — Array.prototype.map（含 thisArg 與 sparse array 行為） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | MDN 現行版本，2026-09-05 查證 |
| MDN — Array.prototype.at（負索引） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at | MDN 現行版本，2026-09-05 查證 |
| MDN — Array.from（Generic factory 與 Array.from.call 範例） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from | MDN 現行版本，2026-09-05 查證 |
| MDN — WeakMap（key 必須為 garbage-collectable value） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap | MDN 現行版本，2026-09-05 查證 |
| TC39 提案 — Symbols as WeakMap keys（ES2023） | https://github.com/tc39/proposal-symbols-as-weakmap-keys | Stage 4，2023 納入 ES2023，2026-09-05 查證 |
| MDN — Symbol.for 與 Symbol.keyFor（全域註冊表） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/for | MDN 現行版本，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
