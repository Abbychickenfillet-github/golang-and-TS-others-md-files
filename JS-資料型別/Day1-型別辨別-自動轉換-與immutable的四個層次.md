---
title: Day 1 補充 — 型別辨別、自動轉換的七個入口、immutable 的四個層次
date: 2026-09-07
tags: [javascript, data-types, typeof, coercion, immutable, 面試題]
---

# Day 1 補充 — 型別辨別、自動轉換的七個入口、immutable 的四個層次

> **這篇是補充，不是重寫。**
> [[JavaScript資料型別總覽-原始型別與物件]] 已經寫完「有哪些型別」「truthy/falsy」「`==` 的 IsLooselyEqual」「包裝物件」，
> [[追問-BigInt取捨-不可變性-與包裝物件]] 已經寫完「不可變是什麼」「為什麼不要 `new String()`」。
> 這篇只補三個那兩篇沒展開的空缺：
> a. 型別**辨別**的完整工具箱與各自的破口
> b. 自動轉換的**七個觸發入口**收攏成一張表
> c. 「immutable」這個詞的**四個層次**——這是你今天指出來的那句「不可變 immutable」講得不夠完整的地方

---

## 一、JavaScript 有哪些資料型別

規格層叫 **language types（語言型別）**，一共 **8 種**：

a. **7 種 primitive（原始型別）**：`String`、`Number`、`BigInt`、`Boolean`、`Symbol`、`Undefined`、`Null`
b. **1 種 Object（物件）**

需要修正的三個常見講法：

1. **`Function` 不是獨立型別。** 它是 Object 的子型別，只是因為擁有 `[[Call]]` 這個 internal method（內部方法），`typeof` 才特別回傳 `"function"`
2. **`Array` 也不是獨立型別。** 它是有 `[[ArrayLength]]` 這個 internal slot（內部欄位）的 Object
3. **規格裡還有一整組「你碰不到」的型別**（specification types，規格型別）：`Reference Record`、`Completion Record`、`Property Descriptor`、`Environment Record`⋯⋯
   　　→ 這一組正是 [[為何setCount(count++)無效而setCount(count+1)可以]] 裡解釋 `obj.n++` 為什麼合法時用到的 `Reference Record`

完整的型別樹請看 [[JavaScript資料型別總覽-原始型別與物件]] 第 1 節，這裡不重複。

---

## 二、如何辨別一個變數的資料型別

實測環境：Node v22.23.2，2026-09-07。可執行檔：`demo-06-型別辨別工具箱.js`

### 五種工具與各自的破口

| 工具 | 分得出什麼 | 破口 |
| --- | --- | --- |
| `typeof x` | 7 種 primitive ＋ function | `typeof null === "object"`；陣列／Date／Map／RegExp 全部是 `"object"` |
| `Object.prototype.toString.call(x)` | `[object Null]`、`[object Array]`、`[object Date]`⋯ 連 null／undefined 都分得出 | 可被 `Symbol.toStringTag` **竄改**，只適合除錯 |
| `Array.isArray(x)` | 只判陣列，但**跨 realm 也正確** | 只能判陣列 |
| `x instanceof C` | 自訂類別的實例 | **跨 realm 失效**（iframe、Worker、`postMessage`） |
| `Object.is(a, b)` | 判「值有沒有變」 | 不是判型別，是判等值 |

### 破口一：`Symbol.toStringTag` 可以偽裝

```js
const liar = { [Symbol.toStringTag]: 'Array' }
Object.prototype.toString.call(liar)  // "[object Array]"  ← 被騙了
Array.isArray(liar)                    // false            ← 騙不過
```

`toString` 讀的是**可寫的** `Symbol.toStringTag`，`Array.isArray` 讀的是**內部欄位**。
所以 `toString` 只適合除錯，不適合當安全判斷。

### 破口二：`instanceof` 跨 realm 會失效（可實測）

**realm（領域）** 是一份獨立的 JS 執行環境，有自己的全域物件與自己一整套內建建構函式。
iframe、Web Worker、Node 的 `vm` 模組各自是一個 realm。

```js
const vm = require('node:vm')
const foreignArray = vm.runInNewContext('[1,2,3]')

foreignArray instanceof Array   // false ← 失效
Array.isArray(foreignArray)     // true  ← 正確
```

原因：`instanceof` 走**原型鏈**，另一個 realm 有自己的 `Array.prototype`，兩條原型鏈根本不相交。
`Array.isArray` 讀的是內部欄位，不受影響。

**前端最常撞到 realm 邊界的地方**：iframe 傳進來的資料、Web Worker 的 `postMessage`、金流／第三方 SDK 嵌在 iframe 裡。

### 三種等值語意

| 情境 | `==` | `===` | `Object.is` |
| --- | --- | --- | --- |
| `0` 與 `-0` | true | true | **false** |
| `NaN` 與 `NaN` | false | false | **true** |
| `1` 與 `"1"` | **true** | false | false |
| `null` 與 `undefined` | **true** | false | false |

a. `==` 會做型別轉換（IsLooselyEqual 演算法）
b. `===` 不轉換，但 `NaN` 不等於自己、`+0` 等於 `-0`
c. `Object.is` 是 **SameValue**：`NaN` 相等、`+0` 與 `-0` 不相等
d. **React 判斷 state 有沒有變，用的就是 `Object.is`**

### NaN 專用

```js
isNaN('hello')          // true  ← 先做 ToNumber 才判，所以誤判
Number.isNaN('hello')   // false ← 只在「型別是 number 且值是 NaN」時 true
```

**永遠用 `Number.isNaN`。**

### 收攏成一個可用的工具函式

```js
function typeOf(value) {
  if (value === null) return 'null'          // 先擋掉，因為 typeof null 是 "object"
  const t = typeof value
  if (t !== 'object') return t               // primitive 與 function 直接用 typeof，最快
  if (Array.isArray(value)) return 'array'   // 跨 realm 也正確
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase()
}
```

判斷順序刻意這樣排：先擋 `null` → 再用最快的 `typeof` → 剩下的才用 tag 切細。

### 選用準則

a. 只要分 primitive 與 function　　　　→ `typeof`（記得 `null` 要另外擋）
b. 判 `null` ／ `undefined`　　　　　　→ `=== null` ／ `=== undefined`
c. 判陣列　　　　　　　　　　　　　　　→ `Array.isArray`，**永遠不要用 `instanceof Array`**
d. 判 Date／Map／RegExp　　　　　　　→ `Object.prototype.toString.call`（除錯用）
e. 判自訂類別的實例　　　　　　　　　　→ `instanceof`（確定不跨 realm 的前提下）
f. 判 NaN　　　　　　　　　　　　　　　→ `Number.isNaN`
g. 判「值有沒有變」　　　　　　　　　　→ `Object.is`

---

## 三、什麼時候會自動轉換：七個入口

可執行檔：`demo-07-自動轉換的觸發時機.js`

**coercion（強制轉換）** 是語言在你沒明說的情況下自動轉型別。
規格用五個 **abstract operation（抽象操作）** 當入口，物件要先經過 `ToPrimitive` 才能進其中任何一個。

| 入口 | 什麼時候被觸發 | 最常踩的坑 |
| --- | --- | --- |
| **ToBoolean** | `if()`、`while()`、`!`、`&&`、<code>&#124;&#124;</code>、三元 | 只有 8 個 falsy；`"0"`、`[]`、`{}` 全是 truthy |
| **ToNumeric** | `-`、`*`、`/`、`%`、`**`、`++`、`--` | `null + 1` 是 1，`undefined + 1` 是 NaN |
| **ToString** | `+` 的字串特例、`${}`、`String()`、`join` | `1 + 2 + "3"` 是 `"33"`，`"1" + 2 + 3` 是 `"123"` |
| **ToPrimitive** | 物件參與上面任何運算前的必經之路 | `Symbol.toPrimitive` → `valueOf` → `toString` |
| **ToPropertyKey** | `obj[任何東西]` | `obj[1]` 與 `obj["1"]` **是同一格** |
| **關係運算** | `<`、`>`、`<=`、`>=` | 兩邊都是字串才比字典序，否則 ToNumber |
| **IsLooselyEqual** | `==` 專屬演算法 | 跟 truthy／falsy 是**兩回事** |

### ToPrimitive 的 hint（提示）決定順序

```js
const spy = {
  [Symbol.toPrimitive](hint) { return hint }   // hint 是 "number" / "string" / "default"
}
+spy          // hint = "number"
`${spy}`      // hint = "string"
spy + ''      // hint = "default"
```

沒有 `Symbol.toPrimitive` 時的預設順序（實測驗證）：

a. hint 是 `number` 或 `default` → 先試 `valueOf`，失敗才 `toString`
b. hint 是 `string` → 先試 `toString`，失敗才 `valueOf`

這就是為什麼 `[] + {}` 是 `"[object Object]"`：陣列的 `toString` 給 `""`，物件的給 `"[object Object]"`。

### ToPropertyKey：一般物件的 key 永遠是字串或 Symbol

```js
const obj = {}
obj[1] = 'number one'
obj['1'] = 'string one'      // 覆蓋掉上面那個
obj[{a:1}] = 'object as key'
obj[[1,2]] = 'array as key'

obj  // { '1': 'string one', '[object Object]': 'object as key', '1,2': 'array as key' }
```

要保留 key 的型別必須用 `Map`，`Map` 的 key 用 **SameValueZero** 比對，不轉型：

```js
const m = new Map([[1, 'number one'], ['1', 'string one']])
m.get(1)   // 'number one'
m.get('1') // 'string one'   ← 兩格
```

### sort 的預設行為

```js
[10, 9, 1].sort()              // [1, 10, 9]  ← 把元素 ToString 再比字典序
[10, 9, 1].sort((a,b) => a-b)  // [1, 9, 10]
```

### `==` 不具遞移性

```js
0 == ''      // true
0 == '0'     // true
'' == '0'    // false   ← 所以 == 不是等價關係
```

以及規格特例：`null` 與 `undefined` 在 `==` 的世界**只跟彼此相等**，跟 `0`、`""`、`false` 都不相等。

**實務結論**：一律用 `===`，唯一例外是 `x == null` 可以同時擋掉 `null` 與 `undefined`。

更完整的 `==` 演算法拆解在 [[JavaScript資料型別總覽-原始型別與物件]] 第 4-b 節。

---

## 四、為何 primitive 是 immutable：immutable 的四個層次

![[學習JS_圖解_immutable的四個層次-鎖什麼由誰決定違反時怎樣_2026-09-07.svg]]

可執行檔：`demo-08-immutable的四個層次.js`、`demo-09-變數槽與值-重新賦值到底改了什麼.js`

**你今天指出的問題**：型別樹上寫「原始型別 ── 不可變 immutable」，那句話只講了四個層次裡的第一個。
實際寫 code 會同時遇到四個，而且它們「鎖什麼」「由誰決定」「違反時噴什麼錯」完全不同，混在一起就會誤判 bug。

### 總表

| 層次 | 鎖什麼 | 由誰決定 | 違反時會怎樣 |
| --- | --- | --- | --- |
| 1. primitive 值 | 值本身 | **語言，無法選** | 嚴格 TypeError／非嚴格靜默失敗 |
| 2. `const` 綁定 | 名字指向誰 | 你，宣告時 | `TypeError: Assignment to constant variable.` |
| 3. `Object.freeze` | 物件的屬性（**淺層**） | 你，執行時 | `TypeError: Cannot assign to read only property` |
| 4. React 更新慣例 | **什麼都沒鎖** | 你，寫 code 時 | 不報錯，畫面不動（最難 debug） |

### 層次 1：primitive 的值不可變 —— 為什麼？

這是你這題真正的核心。五個理由：

**a. 規格層：primitive 身上根本沒有「可以寫」的門。**
所有 mutation（修改）的入口都是 Object 的 internal method——`[[Set]]`、`[[DefineOwnProperty]]`、`[[Delete]]`。
primitive 不是 Object，沒有 internal slot 可寫，也沒有這些 internal method。**不是「被禁止」，是「沒有那扇門」。**

**b. primitive 沒有 identity（身分）。**
兩個 `5` 就是同一個 `5`，語言不區分「哪一個 5」。
既然沒有身分，「改變某一個 5」這句話本身就沒有意義。
物件相反，`{} !== {}`，每一個都有身分。

**c. 這是引擎最佳化的前提。**
正因為不可變，V8 才敢做：

1. **string interning（字串駐留）**：內容相同的字串字面量共用同一份
2. **Smi（Small Integer）**：小整數直接編碼進指標的位元，**根本不進堆積**

　　→ 這正是 [[immutable會不會讓舊值塞滿記憶體]] 裡「一千萬次 `count = count + 1` 只動了 0.02 MB」的原因。
　　如果 primitive 可變，這些共享全部不安全，最佳化一個都做不了。

**d. 值語意（value semantics）**：`a = b` 之後兩者互不影響，沒有 aliasing（別名）問題。

```js
let p1 = 5; let p2 = p1; p2 = 6
p1  // 5   ← 互不影響

const o1 = {n:5}; const o2 = o1; o2.n = 6
o1.n  // 6  ← 同一個物件，o1 也被改了
```

**e. 讓 `===`、property key、`Map` key 的語意穩定**：比的是值，不需要問「是不是同一個」。

### 實測：兩種模式下的行為完全不同

```
[嚴格]   s[0] = "H"  → TypeError: Cannot assign to read only property '0' of string 'hello'
[非嚴格] s[0] = "H"  → 不報錯，s 還是 "hello"，靜悄悄地什麼都沒發生

[嚴格]   t.foo = 1   → TypeError: Cannot create property 'foo' on string 'hi'
[非嚴格] t.foo = 1   → 不報錯，但之後讀 t.foo 是 undefined
```

**⚠️ 一個很多人不知道的前提**：Node 的 `.js`（CommonJS 模組）**預設不是嚴格模式**。
只有 `.mjs`、`package.json` 標了 `"type":"module"` 的 ESM、`class` 內部、以及你自己寫 `'use strict'` 的地方才是。
瀏覽器裡 `<script type="module">` 是嚴格，一般 `<script>` 不是。

`t.foo = 1` 之後讀不到的機制是 **auto-boxing（自動裝箱）**：
引擎做 `ToObject(t)` 產生一個**臨時**的 String 包裝物件，屬性寫進那個臨時物件，然後臨時物件立刻被丟棄；
下次再讀又建一個全新的臨時物件，當然讀不到。
（包裝物件的完整生命週期在 [[追問-BigInt取捨-不可變性-與包裝物件]] 問題 5）

### 追問：`let a = 1; a = 2` 到底改了哪一格？

> 你的原句：「應該是說不能 `let a = 1` 之後 `a = 2` 又重新賦值，
> 是不會改動那個儲存 integer 1 的那格記憶體，對吧？」

**方向對，但有一個地方要修正。** 可執行檔：`demo-09-變數槽與值-重新賦值到底改了什麼.js`

![[學習JS_圖解_變數槽與值-重新賦值改的是哪一個_2026-09-07.svg]]

**先把兩個東西分開命名**

a. **變數槽（binding）**：名字對應到的那一格 →　**會被改寫**
b. **值（value）**：槽裡放的東西 →　**不可變的是這個**

`a = 2` 改的是「槽」，不是「值 1」。沒有任何操作把「1 這個值」變成「2 這個值」，這部分你完全說對。

**但「儲存 integer 1 的那格記憶體」對小整數而言不存在**

V8 的 **Smi（Small Integer）** 把整數直接編碼在**槽的位元裡**，堆積上不配置任何東西。
所以 `a = 2` 就是把 `a` 那一格的位元從「1 的編碼」改寫成「2 的編碼」。
**被改寫的確實是一格記憶體，但那一格是「變數槽」，不是「值 1 住的地方」——因為後者根本不存在。**

實測：一千萬次 `a = i`，heap 只動 **0.02 MB**。

**字串、浮點數、BigInt 才真的有「那一格」，這時你的講法完全正確**

```js
const original = 'hello'
let alias = original      // 兩個槽指向同一個字串
alias = 'world'           // 只有 alias 這一槽改指向新字串

original  // "hello" ← 一個位元都沒被動過
```

實測（500 萬字元字串）：造第一個 rss 增加 4.88 MB，改指向第二個再增加 4.88 MB。
舊的那一格原封不動，只是變成沒人指向它，然後被 GC 回收。

**四種情況對照**

| 值的種類 | 槽裡放什麼 | 堆積上有東西嗎 | `a = 新值` 做了什麼 |
| --- | --- | --- | --- |
| 小整數 Smi | 整數本身的編碼位元 | **沒有** | 改寫槽的位元 |
| 浮點數／大整數 | 指標 | 有 HeapNumber | 造新的，槽改指向它 |
| 字串 | 指標 | 有字串物件 | 造新字串，槽改指向它，**舊的原封不動** |
| 物件 | 指標 | 有物件 | 槽改指向新物件 |

最後一列的關鍵對比：

```js
const obj = { n: 0 }
const objBefore = obj
obj.n = 2
obj === objBefore   // true ← 槽沒動，動的是堆積上的內容
```

**這就是物件「可變」與 primitive「不可變」的分界：物件的內容可以被就地改寫，primitive 的值不行。**

**最深的一層：語言根本不讓你問「是不是同一格」**

| | 觀察得到身分嗎 |
| --- | --- |
| `{} === {}` | `false` ← 物件有 identity |
| `1 === 1` | `true`（永遠）← primitive 沒有 |
| `'a' === 'a'` | `true`（永遠）← 同上 |
| `new Number(1) === new Number(1)` | `false` ← 這是**物件**，才有身分 |

**不是引擎把它藏起來，而是語言層根本沒有這個概念。**
ECMAScript 規格只定義「值」與「行為」，完全不定義記憶體佈局。
所以「堆積上有沒有一格存著 1」是 V8 的實作自由，換個引擎可以不一樣。

**比較安全的心智模型**

> 值是不可變的抽象概念，變數槽是可以改寫的容器，賦值只動容器。

不要把「不可變」理解成「某一格記憶體被保護起來」，那個畫面在 Smi 的情況下不成立。

**順帶一個量測陷阱（我做這份實測時踩到的）**

V8 對 `String.prototype.repeat` 的結果是**惰性**的——你沒真的讀它的內容之前，記憶體可能還沒被配置。

```
200 個 50 萬字元字串（理論約 100 MB）
  只是建立，還沒讀內容        rss 增加: 0.25 MB
  讀過每個字串的最後一字後    rss 再增加: 97.41 MB
```

量記憶體時如果數字小得不合理，**先確認資料真的被用到過**。
`Buffer.alloc` 是立刻配置的，可以拿來當對照組。

---

### 層次 3 的陷阱：`Object.freeze` 是淺層的

```js
const frozen = Object.freeze({ n: 0, nested: { m: 0 } })
frozen.nested.m = 99          // 成功！freeze 只凍第一層
Object.isFrozen(frozen)        // true
Object.isFrozen(frozen.nested) // false
```

要深層得自己遞迴 `deepFreeze`。

### 層次 4 為什麼最難 debug

**因為它沒有任何語言機制擋你。**

```js
const todos = [{ id: 1, done: false }]
todos[0].done = true      // 完全合法
setTodos(todos)           // 參考相同 → Object.is 判定沒變 → React 跳過重新渲染
```

資料真的改了、畫面沒動、console 一片乾淨。
正確做法與 structural sharing 的成本分析在 [[immutable會不會讓舊值塞滿記憶體]]。

### 最實用的辨認方式：看錯誤訊息反推層次

a. `Assignment to constant variable.` → 你動到了 `const` 綁定（層次 2）
b. `Cannot assign to read only property 'x'` → 你動到了 primitive 或被 freeze 的屬性（層次 1 或 3）
c. **沒有錯誤訊息但值沒變** → 層次 1 或 3 的非嚴格靜默失敗
d. **沒有錯誤、值變了但畫面沒動** → 層次 4，React 的 `Object.is` 判定沒變

---

## 五、不懂這些會寫出什麼 bug

a. **`typeof null === "object"`**
　　`if (typeof x === 'object') x.foo` → `x` 是 `null` 時直接 `TypeError: Cannot read properties of null`

b. **表單輸入永遠是 string**
　　`age + 1` 變成 `"251"`；而且 `if (input.value)` 對 `"0"` 會判成 truthy

c. **`arr.sort()` 沒帶比較函式**
　　`[10, 9, 1].sort()` → `[1, 10, 9]`，分頁、排名、金額排序全錯

d. **`==` 的不遞移性**
　　權限判斷寫 `if (role == 0)`，傳進來 `""` 也會過

e. **`JSON.parse` 大數字失精度**
　　後端 int64 ID 超過 `9007199254740991` 會靜靜掉精度且不報錯（細節在總覽筆記 3-b）

f. **`obj[1]` 與 `obj["1"]` 撞格**
　　用數字 ID 當一般物件的 key，兩筆資料互相覆蓋。要用 `Map`

g. **`NaN !== NaN`**
　　`arr.indexOf(NaN)` 永遠回 `-1`，要用 `arr.includes(NaN)`（`includes` 用 SameValueZero）

h. **`instanceof Array` 在 iframe 情境失效**
　　金流／第三方 SDK 嵌在 iframe，傳回來的陣列判斷全掛

i. **靜默失敗**
　　非嚴格模式下改 primitive 或 frozen 物件不報錯，你會以為程式跑過了

---

## 六、遇到實際 bug 時的分析手段

（面試時他們想看的是這一段，不是背誦定義）

**先確認型別，再懷疑邏輯。** 順序很重要，因為型別錯的 bug 看起來都像邏輯錯。

1. **`console.log({ x })` 而不是 `console.log(x)`**
　　包成物件印，Console 會保留引號：`{x: "5"}` 一眼看出是字串，`console.log(5)` 與 `console.log("5")` 印出來長得一樣

2. **在 Console 直接敲 `Object.prototype.toString.call(x)`**
　　一行定位到底是 Array 還是 Object 還是 null

3. **Sources 分頁下 conditional breakpoint（條件中斷點）**
　　條件寫 `typeof x !== 'number'`，只在型別跑掉那一刻停下來，不用一步一步 F10

4. **Network 分頁看 API 原始 JSON**
　　確認後端回的是 `"123"` 還是 `123`。很多型別事故的源頭在這裡，不在前端

5. **NaN 汙染要往上游追**
　　`NaN` 會沿著算式一路傳染。用 `Number.isNaN` 在幾個節點插檢查，找**第一個**變成 NaN 的地方

6. **懷疑跨 realm 時，比對 `x.constructor === Array`**
　　如果 `Array.isArray(x)` 是 true 但 `x instanceof Array` 是 false，就確定跨了 realm

7. **邊界做 runtime validation**
　　API 回應、表單輸入、`localStorage` 讀出來的東西，這三個地方的型別完全不受你控制。
　　用 zod／TypeScript 的 type guard 在邊界擋一次，比在業務邏輯裡到處防禦划算

**面試時可以這樣講**：先說觀察到的現象，再說你怎麼縮小範圍（第 3、4 點），最後才說結論。
過程比答案值錢。

---

## 七、你自己的踩坑（待填）

這一段我**不會**幫你編。回想一下：

a. TimeLog & Analysis 有沒有遇過從 API 拿回來的數字變成字串，導致排序或加總出錯？
b. 有沒有寫過 `if (someValue)` 結果 `0` 被當成沒有值？
c. 有沒有改了 state 裡的物件但畫面不動的經驗？

挑一個真的發生過的寫進來，面試講起來才有重量。

---

## 八、延伸練習

a. [LeetCode 2703. Return Length of Arguments Passed](https://leetcode.com/problems/return-length-of-arguments-passed/)
　　關聯原因：熱身題，順便確認 `arguments` 的 `Object.prototype.toString` 是 `[object Arguments]` 而不是 Array

b. [LeetCode 2727. Is Object Empty](https://leetcode.com/problems/is-object-empty/)
　　關聯原因：要同時處理物件與陣列，正好練本文第二節的 `typeOf` 判斷順序

c. [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/)
　　關聯原因：直接考 falsy 清單（ToBoolean 入口），而且要遞迴處理巢狀

d. [LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/)
　　關聯原因：**這題就是在考 ToPrimitive**。要實作 `valueOf` 讓 `+` 走數字路徑、實作 `toString` 讓 `${}` 走字串路徑，本文第三節整節的實戰

e. [LeetCode 2822. Inversion of Object](https://leetcode.com/problems/inversion-of-object/)
　　關聯原因：把 value 拿來當 key，會直接撞上 ToPropertyKey 把非字串壓成字串的行為

---

## 九、關聯筆記

a. [[JavaScript資料型別總覽-原始型別與物件]]
　　關聯原因：那篇是「有哪些型別」的全景與 `==`／truthy 的深挖，本篇是「怎麼辨別」與「何時轉換」的操作面，兩篇互補不重複

b. [[追問-BigInt取捨-不可變性-與包裝物件]]
　　關聯原因：那篇問題 3、5 講「不可變是什麼」與包裝物件的生命週期，本篇第四節接著回答「規格為什麼要這樣設計」

c. [[為何setCount(count++)無效而setCount(count+1)可以]]
　　關聯原因：本篇第一節提到的 `Reference Record` 就是那篇解釋 `obj.n++` 為何合法的核心，而那篇的「關卡 1」正是本篇 immutable 層次 2

d. [[immutable會不會讓舊值塞滿記憶體]]
　　關聯原因：本篇 immutable 層次 4 的成本分析全在那篇；而本篇層次 1 的「Smi 不進堆積」正是那篇「0.02 MB」實測的解釋

e. [[00-V8引擎完整管線-Parse到Deoptimization]]
　　關聯原因：本篇說 `0++` 在 parse 階段就被擋下、`new Function` 產生的程式碼要到執行期才進 parser，這個時間差在那篇的管線圖上可以定位

---

## 十、參考來源

所有 URL 於 **2026-09-07** 查閱。

1. MDN — [JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)
2. MDN — [typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
3. MDN — [Object.prototype.toString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)
4. MDN — [Symbol.toStringTag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag)
5. MDN — [Array.isArray()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray)
6. MDN — [Object.is()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
7. MDN — [Number.isNaN()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
8. MDN — [Type coercion（Glossary）](https://developer.mozilla.org/en-US/docs/Glossary/Type_coercion)
9. MDN — [Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
10. MDN — [Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
11. ECMA-262 — [Type Conversion（ToBoolean／ToNumber／ToString／ToPrimitive／ToPropertyKey）](https://tc39.es/ecma262/#sec-type-conversion)
12. ECMA-262 — [IsLooselyEqual](https://tc39.es/ecma262/#sec-islooselyequal)
13. ECMA-262 — [ECMAScript Language Types](https://tc39.es/ecma262/#sec-ecmascript-language-types)
14. Node.js — [vm module](https://nodejs.org/api/vm.html)（跨 realm 實驗用）

**本文所有 console 輸出的驗證環境**：Node.js v22.23.2，執行日期 2026-09-07。
