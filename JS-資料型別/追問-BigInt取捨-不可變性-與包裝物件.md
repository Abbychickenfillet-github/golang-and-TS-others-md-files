---
title: 追問五題 — BigInt 的取捨、7+8 為什麼是 15、immutable 是什麼意思、物件都可變嗎、原始型別背後有物件嗎
tags: [JavaScript, BigInt, immutable, Object-freeze, autoboxing, 包裝物件, 型別轉換]
created: 2026-09-05
updated: 2026-09-05
charset: utf-8
status: 已驗證（所有輸出以 Node.js v22 實跑）
parent: "[[JavaScript資料型別總覽-原始型別與物件]]"
---

# 追問五題

> 這是 `JavaScript資料型別總覽-原始型別與物件.md` 的延伸。五個問題其實是同一條線：
> **原始型別為什麼「不可變」→ 物件為什麼「可變」→ 那原始型別能呼叫方法是怎麼回事。**

---

## 問題 1：「應該是一般來說不會用到那麼大的數字所以沒有用 BigInt 嗎？」

### 對，但不是唯一原因

`Number` 能**精確**表示的整數上限是 `Number.MAX_SAFE_INTEGER` = `9007199254740991`（也就是 2^53 − 1，大約 **9 千兆**）。

日常會遇到的數字離這個天花板都非常遠：

- a. 毫秒時間戳 `Date.now()` ≈ `1.788 × 10^12` — 大約是上限的 **兩萬分之一**
- b. 商品價格、數量、分頁 offset、像素座標 — 通常不到 7 位數
- c. 檔案大小（bytes）— 就算 1TB 也只有 `1.1 × 10^12`

所以「日常用不到」是對的。但**更重要的是 BigInt 有實實在在的代價**，所以它不該是預設選擇：

```js
JSON.stringify({ v: 1n })   // ❌ TypeError: Do not know how to serialize a BigInt
Math.max(1n, 2n)            // ❌ TypeError: Cannot convert a BigInt value to a number
1n + 1                      // ❌ TypeError: Cannot mix BigInt and other types
```

- a. **不能和 Number 混用**，所有運算都要顯式轉換，程式碼變醜
- b. **`JSON.stringify` 直接丟錯**，要自己寫 replacer
- c. **整套 `Math` 都不能用**（`Math.max`、`Math.round`、`Math.sqrt` 全部拒收）
- d. **沒有小數**，`5n / 2n` 是 `2n` 不是 `2.5`
- e. **比較慢**，因為是任意精度運算不是硬體原生的浮點數

### ⚠️ 但是有一個場景你**一定**會遇到，而且它不報錯

**後端傳來 64-bit 整數 ID，經過 `JSON.parse` 之後靜靜地變成另一個數字。**

```js
const raw = '{"id": 1234567890123456789, "name": "abby"}';
JSON.parse(raw).id
// 1234567890123456800   ← 最後三位被改掉了，而且完全不會報錯
```

這在實務上超常見：

- a. Go 的 `int64` / Java 的 `Long` / PostgreSQL 的 `bigint` 主鍵
- b. Twitter / X 與 Discord 的 Snowflake ID（都是 64-bit）
- c. 區塊鏈的 wei（1 ETH = 10^18 wei）

**症狀**：前端拿這個 ID 去查詢，後端說「查無此資料」，但你把 ID 印出來看**長得幾乎一樣**，只有最後幾位不同 — 這種 bug 極難抓。

**正解不是在前端用 BigInt**（因為 `JSON.parse` 在你拿到值之前就已經破壞它了），**而是請後端把 int64 序列化成字串**：

```js
JSON.parse('{"id":"1234567890123456789"}').id   // "1234567890123456789" ✅ 完整
```

前端就把它當字串處理（ID 本來就不需要做算術）。這也是為什麼很多 API 規範會明訂「ID 一律用 string」。

### 什麼時候才真的該用 BigInt

- a. 密碼學運算（RSA、橢圓曲線）
- b. 高精度計時（奈秒等級）
- c. 大數階乘 / 費氏數列這類數學計算
- d. 你自己要對 64-bit 值做**算術**（不只是傳遞）

---

## 問題 2：「是不是有一個是 `var number1 = 7; var number2 = 8; console.log(number1 + number2);` = 15 的？有嗎？」

**有，而且這才是 `+` 的「正常」行為。**

```js
var number1 = 7, number2 = 8;
console.log(number1 + number2);   // 15   (number)
```

回顧 `+` 的規則：兩邊先做 ToPrimitive，**只要任一邊是字串就做連接，否則兩邊轉數字做加法**。這裡兩邊都是 `number`，所以走加法分支，得到 `15`。

跟你先前那個例子的完整對照：

| 運算式 | 結果 | 型別 | 為什麼 |
|---|---|---|---|
| `7 + 8` | `15` | number | 兩邊都是數字 → **加法** |
| `7 + "8"` | `"78"` | string | 有一邊是字串 → **連接** |
| `"7" + "8"` | `"78"` | string | 兩邊都是字串 → 連接 |
| `"7" - "8"` | `-1` | number | **減法沒有字串特例**，強制轉數字 |
| `+"7" + +"8"` | `15` | number | 一元 `+` 先把字串轉成數字 |
| `Number("7") + Number("8")` | `15` | number | 同上，但**最好讀**，正式專案用這個 |

**實務建議**：`input.value` 拿到的**永遠是字串**，所以表單算加總最常見的 bug 就是 `"7" + "8"` 變成 `"78"`。轉換的三種寫法裡，`Number()` 語意最清楚，一元 `+` 最短但別人不一定看得懂，`parseInt()` 會在 `"7.5"` 這種情況吃掉小數。

---

## 問題 3：「All types except Object define immutable values represented directly at the lowest level of the language」怎麼翻？

### 逐句拆解

> **All types except Object**
> 除了 Object 以外的所有型別（也就是那 7 種原始型別：String、Number、BigInt、Boolean、Symbol、undefined、null）

> **define immutable values**
> 定義的都是**不可變的值**。你沒辦法「修改」一個字串或一個數字**本身**，只能造出一個新的值。

> **represented directly at the lowest level of the language**
> 這些值在**語言的最底層被直接表示**。意思是：它們是「值本身」，不是「一個指向某個結構的參考」。你拿到 `7` 就是 `7`，不是「指向某個裝著 7 的盒子的地址」。

**整句白話**：
「除了物件之外的所有型別，代表的都是不可變的值，這些值在語言最底層是直接被表示出來的（而不是透過一個可以被拆開改寫的結構）。」

### 「不可變」到底是什麼意思 — 實跑證明

```js
let s = "abc";
s[0] = "Z";
console.log(s);            // "abc"  ← 沒變
```

- a. **非嚴格模式**：靜靜失敗，什麼都不會發生（超難抓）
- b. **嚴格模式**：`TypeError: Cannot assign to read only property '0' of string 'abc'`

```js
s.toUpperCase();   // "ABC"  ← 回傳一個「新字串」
console.log(s);    // "abc"  ← 原本那個完全沒動
```

所有字串方法（`toUpperCase`、`slice`、`replace`、`trim`、`concat`…）**都是回傳新字串，沒有一個會改動原字串**。

### ⚠️ 最容易搞混的一點：「重新賦值」不是「修改值」

```js
let s = "abc";
s = "xyz";         // ✅ 這是合法的
```

這裡發生的事情是：**變數 `s` 這個標籤，從指著「abc」改成指著「xyz」**。字串 `"abc"` 本身從頭到尾都沒被改過，只是沒人用它了，等著被 GC 回收。

```text
【s = "abc" 時】

  變數 s  ──────────►  值 "abc"（不可變）


【s = "xyz" 之後】

  變數 s  ──────────►  值 "xyz"（不可變）

                       值 "abc" 還在記憶體裡
                       只是沒人指著它了 ── 等著被 GC 回收

  ⚠️ 從頭到尾「abc」這個值都沒有被改過
     被改的是「變數 s 這個標籤指向誰」
```

**這正是 `const` 的真相**：`const` 鎖住的是**綁定（binding）**不是**值（value）**。

```js
const arr = [1, 2, 3];
arr.push(4);        // ✅ 可以！因為改的是「物件的內容」不是「綁定」
console.log(arr);   // [1, 2, 3, 4]

const c = [1];
c = [2];            // ❌ TypeError: Assignment to constant variable.
                    //    因為這是在改「綁定」
```

所以：**`const` ≠ immutable**。這是面試很愛問的一題。

---

## 問題 4：「所以物件都是可以改變的？」

### 預設是，但可以鎖起來

物件**預設可變（mutable）**，這正是 MDN 那句話的言下之意 — 它把 Object 從「不可變」那一群裡排除，就是因為 Object 是唯一可變的。

但 JavaScript 提供了三層鎖，嚴格程度由弱到強：

| 方法 | 能加新屬性 | 能刪屬性 | 能改現有值 | 說明 |
|---|---|---|---|---|
| `Object.preventExtensions(o)` | ❌ | ✅ | ✅ | 最鬆 |
| `Object.seal(o)` | ❌ | ❌ | ✅ | 結構固定，值還能改 |
| `Object.freeze(o)` | ❌ | ❌ | ❌ | 最嚴 |

```js
const o = { a: 1, nested: { b: 2 } };
Object.freeze(o);
o.a = 99;      // 非嚴格模式靜靜失敗 / 嚴格模式 TypeError
o.c = 3;       // TypeError: Cannot add property c, object is not extensible
delete o.a;    // TypeError: Cannot delete property 'a'
console.log(Object.isFrozen(o));   // true
```

### ⚠️ 最大的坑：`Object.freeze` 是**淺層的**

```js
o.nested.b = 999;
console.log(o.nested);   // { b: 999 }   ← 被改了！freeze 只凍最外層
```

要真的凍住必須**遞迴**：

```js
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((k) => {
    const v = obj[k];
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}
```

### ⚠️ 第二個坑：非嚴格模式下失敗是「靜悄悄的」

同一段程式碼，在嚴格模式會噴 `TypeError`，非嚴格模式什麼都不說。所以檔案頂端寫 `'use strict'`（或用 ES module，它天生就是嚴格模式）能幫你早點發現問題。

### 為什麼你身為前端一定要在意 mutability

**React 判斷「state 有沒有變」用的是 `Object.is`，也就是比較「是不是同一個參考」，不是比較內容。**

```jsx
// ❌ 直接改物件 → 參考沒變 → React 認為沒變 → 不重繪
const handleClick = () => {
  user.name = "Abby";
  setUser(user);          // 同一個物件，Object.is(舊, 新) === true
};

// ✅ 造一個新物件 → 參考變了 → React 才知道要重繪
const handleClick = () => {
  setUser({ ...user, name: "Abby" });
};
```

這就是為什麼 React 一直強調「不要 mutate state」— 不是風格潔癖，是**機制上真的會壞掉**。同樣的道理也適用於 `useEffect` 的依賴陣列、`React.memo`、`useMemo` 的依賴比較。

### 順帶一提：JavaScript 有沒有「天生不可變的物件」？

**沒有。** TC39 曾經有 **Records & Tuples 提案**（`#{ a: 1 }` 和 `#[1, 2]`），想引入真正不可變的複合值。

⚠️ 但這個提案已經在 **2025-04-14 的 TC39 全體會議取得共識撤回，2025-04-15 儲存庫封存**，理由是「無法就『為語言新增原始型別』取得進一步共識」。

繼任的是 **Composites 提案**，但它的定位改成「新的**物件**」而不是「新的原始型別」，還在早期階段。

**所以現階段要不可變資料，實務做法是**：

- a. 展開運算子造新物件 `{ ...obj, key: newValue }`
- b. `structuredClone(obj)` 做深拷貝（原生，取代 `JSON.parse(JSON.stringify())`）
- c. Immer（用 Proxy 讓你「假裝」在 mutate，實際產生新物件）
- d. `Object.freeze` + `deepFreeze` 在開發模式下當守門員

---

## 問題 5：「所以這些都是有一個物件在？」

### 是，但那個物件是**臨時的、用完即丟**

這就是**自動裝箱（autoboxing）**。當你對一個原始型別讀屬性或呼叫方法時，引擎在那一瞬間做了三件事：

```text
  你寫 str.toUpperCase()          str 是原始字串 "abc"
        │
        ▼
  ① 引擎臨時建立一個 String 包裝物件（autoboxing 自動裝箱）
        │
        ▼
  ② 在包裝物件的原型鏈上找到 String.prototype.toUpperCase
        │
        ▼
  ③ 呼叫它，得到結果 "ABC"
        │
        ▼
  ④ 包裝物件立刻被丟棄 ── 沒有任何人拿得到它
        │
        ▼
  所以 str.foo = 123 執行完，str.foo 讀出來還是 undefined
```

**證據就是你沒辦法在上面留下任何東西**：

```js
const str = "abc";
str.foo = 123;        // 嚴格模式：TypeError / 非嚴格模式：靜靜失敗
console.log(str.foo); // undefined  ← 那個臨時物件早就被回收了
```

### 五種原始型別的包裝物件

| 原始型別 | 包裝建構函式 | 能 `new` 嗎 | 方法住在哪 |
|---|---|---|---|
| String | `String` | ✅（但**絕對不要**） | `String.prototype` |
| Number | `Number` | ✅（但不要） | `Number.prototype` |
| Boolean | `Boolean` | ✅（但不要） | `Boolean.prototype` |
| Symbol | `Symbol` | ❌ `TypeError: Symbol is not a constructor` | `Symbol.prototype` |
| BigInt | `BigInt` | ❌ `TypeError: BigInt is not a constructor` | `BigInt.prototype` |
| **null** | **沒有** | — | — |
| **undefined** | **沒有** | — | — |

**方法其實不是「掛在值上面」，而是住在 `String.prototype` 上。** 臨時包裝物件的作用只是「提供一條通往 prototype 的路」。

### ⚠️ 為什麼絕對不要 `new String()`

```js
typeof "abc";                    // "string"
typeof new String("abc");        // "object"   ← 型別變了
"abc" === new String("abc");     // false      ← 相等比較壞掉
if (new Boolean(false)) { }      // ✅ 會進去！因為物件永遠 truthy
```

最後那一行是經典陷阱：`new Boolean(false)` 是一個**物件**，而所有物件都是 truthy，所以 `if` 判斷會通過 — 跟你的直覺完全相反。

要包裝的話只能用 `Object()`：`Object(Symbol("s"))` 的 typeof 是 `"object"`。但實務上你**永遠不需要這麼做**。

### null 和 undefined 沒有包裝物件 — 這就是那個經典錯誤的來源

```js
null.toString();       // TypeError: Cannot read properties of null (reading 'toString')
undefined.toString();  // TypeError: Cannot read properties of undefined (reading 'toString')
```

`Cannot read properties of null (reading 'xxx')` 大概是前端最常看到的錯誤訊息，根因就在這裡：**這兩個值沒有包裝物件，引擎連「臨時包一個」都做不到**。

這也是為什麼有了可選鏈 `?.`：

```js
user?.profile?.name        // user 是 null / undefined 時直接回傳 undefined，不爆
user?.getName?.()          // 方法也可以，函式不存在就不呼叫
```

---

## 總結：五題其實是同一條線

```text
【左線｜原始型別 Primitive】

  在語言最底層「直接表示」＝ 拿到的就是值本身
        │
        ▼
  所以它不可變 immutable
        │
        ▼
  改不了，只能產生新值再重新綁定
  （這就是為什麼 const 鎖的是綁定不是值）
        │
        ▼
  但它又需要方法：toUpperCase、slice、concat ...
        │
        ▼
  靠自動裝箱：臨時包一個物件，用完即丟
        │
        ▼
  null / undefined 連臨時物件都沒有
  → TypeError: Cannot read properties of null


【右線｜物件 Object】

  是一個「參考」，指向可以拆開改寫的結構
        │
        ▼
  所以它可變 mutable
        │
        ├──► React 用 Object.is 比「參考」
        │    直接 mutate 物件就不會重繪
        │
        └──► 要鎖住得靠 freeze / seal / preventExtensions
             ⚠️ 而且 freeze 是淺層的，巢狀物件擋不住
```

---

## 關聯筆記（附上關聯的理由）

- a. `JS-資料型別/JavaScript資料型別總覽-原始型別與物件.md`
  **理由**：本篇是那篇的追問延伸。那篇列出「有哪些型別」，本篇回答「為什麼要這樣分」。

- b. `iThome鐵人賽-2026/文章-從一個SyntaxError讀懂物件字面量與自動裝箱.md`
  **理由**：本篇問題 5 講的自動裝箱，那篇有完整的推導與一個實際踩到的 SyntaxError 案例。

- c. `iThome鐵人賽-2026/草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md`
  **理由**：本篇問題 4 說「React 用 `Object.is` 比參考，直接 mutate 就不重繪」，那篇是這件事的完整機制拆解。

- d. `JSON.md`
  **理由**：本篇問題 1 的 int64 精度災難發生在 `JSON.parse` 的那一瞬間，屬於 JSON 序列化的邊界問題。

- e. `Golang make-array.md` 與 `golang-syntax-guide.md`
  **理由**：Go 有明確的 `int64` / `float64` 分別，JS 只有一種 `Number` — 前後端型別對不上正是問題 1 那個 bug 的根源。跨語言開發時這個落差要記在心上。

---

## 延伸練習

- a. [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/) — 遞迴走訪物件，順便體會「造新物件」vs「原地修改」
- b. [LeetCode 2727. Is Object Empty](https://leetcode.com/problems/is-object-empty/) — 物件與陣列的判斷
- c. [LeetCode 2822. Inversion of Object](https://leetcode.com/problems/inversion-of-object/) — 物件 key 一定會被轉成字串
- d. [LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/) — 自己決定 `+` 遇到你的物件時要做什麼（ToPrimitive）
- e. [LeetCode 2677. Chunk Array](https://leetcode.com/problems/chunk-array/) — 練習不修改原陣列的寫法
- f. [LeetCode 2625. Flatten Deeply Nested Array](https://leetcode.com/problems/flatten-deeply-nested-array/) — 遞迴 + 不可變思維

---

## 參考來源

所有 URL 於 **2026-09-05** 查閱。

- a. MDN — [JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)（問題 3 那句英文的原始出處）
- b. MDN — [Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) 與 [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- c. MDN — [Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)（「freeze 是淺層的」官方說明）與 [Object.seal()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal)
- d. MDN — [Addition (+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition) 與 [ECMA-262 The Addition Operator](https://tc39.es/ecma262/#sec-addition-operator-plus)
- e. TC39 — [proposal-record-tuple Issue #394「Proposal is withdrawn」](https://github.com/tc39/proposal-record-tuple/issues/394)（**2025-04-14 全體會議取得撤回共識，2025-04-15 儲存庫封存**，理由是無法就新增原始型別取得共識；繼任者為 Composites 提案，定位改為新的物件而非原始型別）
- f. TC39 — [proposal-record-tuple 儲存庫（已封存）](https://github.com/tc39/proposal-record-tuple)
- g. ECMAScript Daily — [ECMAScript proposal updates @ 2025-04](https://ecmascript-daily.github.io/ecmascript/2025/04/19/ecmascript-proposal-update)（**2025-04-19**，記錄該次會議的提案異動）
- h. React 官方文件 — [Updating Objects in State](https://react.dev/learn/updating-objects-in-state)（為什麼不能直接 mutate state）
- i. MDN — [structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)

**驗證環境**：Node.js v22，執行日期 2026-09-05。所有 console 輸出皆為實跑結果，程式碼在 `demo-05-BigInt與不可變性與包裝物件.js`。
