---
title: JavaScript 資料型別總覽 — 原始型別（Primitive）與物件（Object）
tags: [JavaScript, 資料型別, primitive, object, Symbol, Map, WeakMap, sparse-array, 閉包]
created: 2026-09-05
updated: 2026-09-05
charset: utf-8
status: 已驗證（本文所有 console 輸出皆以 Node.js v22.22.2 實跑確認）
---

# JavaScript 資料型別總覽 — 原始型別與物件


> 這份筆記從 Abby 手寫的大綱整理而成，並補上三件原稿缺漏或寫錯的地方：
> a. 原始型別漏掉 **BigInt**，實際上是 **7 種**而不是 6 種
> b. React 星星評分的三種寫法裡，**寫法 1 與寫法 3 都是壞的**，本文附上實跑證據與修正
> c. WeakMap 範例裡變數名打錯（`vm` 宣告卻用 `wm` 呼叫），實際會噴 `ReferenceError` 而不是 `TypeError`

---

## 1. 型別全景圖

> 📖 MDN｜[JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures) ｜ [Glossary: Primitive](https://developer.mozilla.org/en-US/docs/Glossary/Primitive) ｜ [typeof 運算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)

```text
JavaScript 的值
│
├── 原始型別 Primitive ── 7 種 ── 不可變 immutable(*) ── 值本身直接表示
│   │
│   ├── String       "abc"
│   ├── Number       7          IEEE 754 雙精度浮點數
│   ├── BigInt       7n         ES2020 新增
│   ├── Boolean      true
│   ├── Symbol       Symbol()   永遠唯一
│   ├── undefined               引擎說「這裡沒東西」
│   └── null                    開發者說「我刻意清空」
│                               ⚠️ typeof 卻回傳 "object"（1995 年的 bug）
│
└── 物件 Object ── 1 種 ── 可變 mutable ── 變數存的是參考 reference
    │
    ├── Object              物件字面量 { }
    ├── Array               陣列 [ ]      ⚠️ typeof 也是 "object"
    ├── Function            函式          ⚠️ typeof 特別回傳 "function"
    ├── Map / Set           鍵值集合
    ├── WeakMap / WeakSet   弱引用集合
    └── Date / RegExp / Promise / Error ...
```

**一句話定義**

- a. **原始型別**：值本身不能被改動。你以為在「改字串」，其實是造了一個新字串。
- b. **物件**：一個可以掛任意鍵值的容器，變數裡存的是「指向它的參考」而不是本體。

> **(*) 「不可變 immutable」這個詞在 JavaScript 裡有四個層次，樹狀圖上這一行只是第一層。**
>
> | 層次 | 鎖什麼 | 由誰決定 | 違反時會怎樣 |
> | --- | --- | --- | --- |
> | 1. primitive 值（就是這一行） | 值本身 | **語言，無法選** | 嚴格 TypeError／非嚴格靜默失敗 |
> | 2. `const` 綁定 | 名字指向誰 | 你，宣告時 | `TypeError: Assignment to constant variable.` |
> | 3. `Object.freeze` | 物件的屬性（**淺層**） | 你，執行時 | `TypeError: Cannot assign to read only property` |
> | 4. React 更新慣例 | **什麼都沒鎖** | 你，寫 code 時 | 不報錯，畫面不動（最難 debug） |
>
> 四個層次「鎖什麼、由誰決定、違反時噴什麼錯」完全不同，混在一起就會誤判 bug。
> 完整拆解與可執行實測見 [[Day1-型別辨別-自動轉換-與immutable的四個層次]] 第四節。

`typeof` 的實測結果（Node v22.22.2）：

```js
["str", 1, true, Symbol(), null, undefined, 10n, {}, [], function(){}, new Map()]
  .map(v => typeof v)
// string | number | boolean | symbol | object | undefined | bigint | object | object | function | object
```

原始的 typeof 對照表截圖：

![typeof 對照表](https://ithelp.ithome.com.tw/upload/images/20260905/20183570YU5Tr8RLud.png)

⚠️ 兩個著名的坑

- a. `typeof null === "object"` — 這是 1995 年 JS 第一版留下的 bug，值的低三位標籤是 `000` 代表物件，而 `null` 的機器表示剛好是全 0，所以被誤判。ECMA 已經明講不會修，因為修了會炸掉整個網路。判斷 null 要用 `value === null`。
- b. `typeof function(){} === "function"` — 函式其實是物件的子型別，但因為它有 `[[Call]]` 內部方法，`typeof` 特別給它一個名字。

---

## 2. String（字串）

> 📖 MDN｜[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) ｜ [String.prototype.substring()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring) ｜ [String.prototype.slice()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice) ｜ [String.prototype.concat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/concat) ｜ [樣板字面值 Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)

```js
const s = "JavaScript";
s.substring(0, 4);      // "Java"  取子字串（含頭不含尾）
s.slice(-6);            // "Script" slice 接受負數索引，substring 不接受
"con".concat(78);       // "con78" 把多個值接成一個新字串
```

- a. `substring(start, end)`：取區間，**不接受負數**，負數會被當成 0。
- b. `slice(start, end)`：功能類似但**接受負數**，`-1` 代表倒數第一個。實務上 `slice` 用得比 `substring` 多。
- c. `concat()`：回傳**新字串**，原字串不動（因為原始型別不可變）。實務上大家幾乎都用 `+` 或樣板字串 `` `${a}${b}` ``，`concat` 只在需要串很多段時偶爾出現。

**自動裝箱（autoboxing）**：`"abc".length` 之所以能動，是因為引擎在讀屬性的瞬間，臨時包一個 `String` 包裝物件出來，取完就丟。所以下面這行不會報錯但也沒用：

```js
const s = "abc";
s.foo = 1;      // 非嚴格模式下靜靜失敗
console.log(s.foo);  // undefined（那個臨時包裝物件已經被丟掉了）
```

> 關聯：這件事在 `iThome鐵人賽-2026/文章-從一個SyntaxError讀懂物件字面量與自動裝箱.md` 有更完整的推導，兩篇講的是同一個機制的不同切面 — 這裡講「為什麼原始型別有方法可以呼叫」，那裡講「為什麼包裝物件的生命週期短到你抓不住它」。

---

## 3. Number（數字）

> 📖 MDN｜[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) ｜ [Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) ｜ [NaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN) ｜ [Number.isNaN()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN) ｜ [Infinity](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Infinity)

JavaScript 的 Number 只有一種：IEEE 754 雙精度浮點數（64 bit）。沒有 int 和 float 之分。

三個特殊值：

- a. `+Infinity`：`1 / 0`、`Number.MAX_VALUE * 2`
- b. `-Infinity`：`-1 / 0`
- c. `NaN`（Not a Number）：`0 / 0`、`"con" - 78`、`parseInt("abc")`

```js
console.log("con" - 78);        // NaN   減法會強制轉數字，轉不動就 NaN
console.log("78" - 8);          // 70    這個轉得動
console.log("78" + 8);          // "788" ⚠️ 同樣兩個值換成加號就完全不一樣 → 見 3-a
console.log("con" + 78);        // "con78" 加號不需要轉數字，所以永遠不會 NaN
console.log(NaN === NaN);       // false 唯一一個不等於自己的值
console.log(Number.isNaN(NaN)); // true  正確的檢查方式
console.log(isNaN("abc"));      // true  ⚠️ 舊版全域 isNaN 會先做型別轉換，容易誤判
console.log(0.1 + 0.2);         // 0.30000000000000004  浮點數精度問題
```

**檢查 NaN 的三種寫法**

- a. `Number.isNaN(x)` — ES6 之後的正解，不做型別轉換
- b. `x !== x` — 利用「NaN 不等於自己」的特性，最原始但最可靠
- c. `isNaN(x)` — ⚠️ 全域版本會先 `Number(x)`，所以 `isNaN("abc")` 也是 true，通常不是你要的

---

### 3-a. 為什麼 `-` 會轉數字，`+` 卻不會？

> 📖 MDN｜[Addition (+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition) ｜ [Subtraction (-)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Subtraction) ｜ [Unary plus (+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus) ｜ [ToPrimitive](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive)
> 📖 規範｜[ECMA-262: ApplyStringOrNumericBinaryOperator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-applystringornumericbinaryoperator) ｜ [The Addition Operator ( + )](https://tc39.es/ecma262/#sec-addition-operator-plus)

上面那段程式碼裡藏了一個最容易被問的面試題：**同樣是 `"78"` 和 `8`，換一個運算子結果就從數字變成字串**。

#### 先正名：`+` 到底叫什麼

很多人會把 `+` 叫成「字串連接符號」，這個講法不精確。它有三個層次的名字，要分清楚：

- a. **加法運算子（Addition operator）** — 這是它的**正式名稱**，MDN 的頁面標題與 ECMA-262 的章節標題都叫這個。它沒有第二個名字。
- b. **字串串接（string concatenation）** — 這是它在**特定條件下的行為**，不是它的名字。就像「開車」是人的行為，不是人的名字。
- c. **運算子多載（operator overloading，運算子重載）** — 這是「同一個符號依運算元型別而有不同行為」這個**現象**的正式術語。JavaScript 只有 `+` 這一個內建的多載運算子。

所以一句精確的話是：

> `+` 是**加法運算子**，它是 JavaScript 唯一被**多載**的運算子，在「任一運算元是字串」時的行為是**字串串接**，其餘情況就是一般的加法。

⚠️ 因此「`+` 就只有字串的合併」這句話是錯的 — `1 + 2` 依然是 `3`，`true + true` 依然是 `2`。

另外要跟**一元加號（unary plus）** 分開：`+"78"` 只有一個運算元，它是完全不同的運算子，永遠做 `ToNumber`，不會有字串行為。

#### 規範層級的真正差異：分岔只寫給了 `+`

ECMA-262 把所有二元算術運算子（`+` `-` `*` `/` `%` `**`）收在同一個抽象操作 `ApplyStringOrNumericBinaryOperator(lval, opText, rval)` 裡。`opText` 就是那個運算子符號。它第一步就分岔：

```
ApplyStringOrNumericBinaryOperator( lval, opText, rval )
        │
        ├── opText 是 "+" 嗎？
        │
        │   ┌── 是 ──> 1. lprim = ToPrimitive(lval)     ← 不給 hint，走 default
        │   │          2. rprim = ToPrimitive(rval)
        │   │          3. lprim 或 rprim 任一是 String？
        │   │                 │
        │   │                 ├── 是 ──> 字串串接，結束     ★ 只有 + 走得到這一格
        │   │                 └── 否 ──> 往下走
        │   │
        │   └── 否 ──────────────────────> 往下走
        │
        └──> 兩邊各做 ToNumeric，然後做數值運算（BigInt 與 Number 不可混用）
```

**一句話記住：「任一邊是字串就串接」這條分支，規範裡只寫給 `+`。`-` `*` `/` `%` `**` 連這條路都沒有，只能直直走到 `ToNumeric`。**

- a. `ToPrimitive` — 把物件轉成原始值。順序是先找 `Symbol.toPrimitive`，沒有就試 `valueOf()`，再不行才 `toString()`。
- b. `ToNumeric` — 把原始值轉成 Number 或 BigInt。字串轉不動時的結果就是 `NaN`。
- c. **hint（提示）** — `ToPrimitive` 的第二個參數，可以是 `"default"` `"number"` `"string"`。`+` 傳的是 `"default"`，`-` 傳的是 `"number"`。這個差別下面 Date 的例子會用到。

#### 對照表：同一組值，不同運算子

| 運算式 | 結果 | 型別 | 為什麼 |
| --- | --- | --- | --- |
| `"78" - 8` | `70` | number | `-` 沒有字串分支，`ToNumeric("78")` = 78 |
| `"78" + 8` | `"788"` | string | `+` 有字串分支，左邊是 String 就串接 |
| `"con" - 78` | `NaN` | number | `ToNumeric("con")` 轉不動 |
| `"con" + 78` | `"con78"` | string | 走串接分支，**根本不需要轉數字，所以永遠不會 NaN** |
| `"78" * 1` | `78` | number | `*` 也沒有字串分支，常被拿來當轉數字的小技巧 |
| `+"78"` | `78` | number | **一元**加號，永遠 `ToNumber` |
| `1 + 2` | `3` | number | 兩邊都不是字串，走數值分支 |
| `true + true` | `2` | number | `ToNumeric(true)` = 1，證明 `+` 不是只會串接 |
| `1 + null` | `1` | number | `ToNumeric(null)` = 0 |
| `1 + undefined` | `NaN` | number | `ToNumeric(undefined)` = NaN |
| `null + "x"` | `"nullx"` | string | 有字串就串接，`null` 被轉成 `"null"` |
| `[] + []` | `""` | string | `ToPrimitive([])` 是 `""`，兩個空字串串接 |
| `[] + {}` | `"[object Object]"` | string | `ToPrimitive({})` 走到 `toString()` |
| `[1, 2] + [3]` | `"1,23"` | string | 陣列的 `toString()` 等同 `join(",")` |
| `[] - []` | `0` | number | `-` 走 `ToNumeric("")` = 0，`0 - 0` = 0 |

#### 進階：Date 是唯一一個 hint 會影響結果的內建型別

```js
const d = new Date();

console.log(typeof (d + 1));   // "string"  ← Date 的 @@toPrimitive 在 default hint 下當成 string
console.log(typeof (d - 1));   // "number"  ← - 傳的是 number hint，走 valueOf() 拿時間戳

console.log(d - 0);            // 該時刻的 Unix 毫秒時間戳 ← 很常見的取毫秒寫法
```

`Date.prototype[Symbol.toPrimitive]` 的規範明講：hint 是 `"default"` 時，**比照 `"string"` 處理**。全語言只有 Date 這樣做，理由是「日期加東西」在直覺上比較像在組字串。這也是 `+` 與 `-` 不對稱最戲劇化的一個實例。

#### 那為什麼 `-` 不給字串行為？

因為**字串沒有「相減」的自然語意**。`"abc" - "a"` 應該等於什麼？沒有共識。而 `+` 之所以被多載，是 1995 年設計時直接沿用 Java 與 C++ 的慣例（`"a" + "b"`）。所以這個不對稱是**刻意的設計決定**，不是 bug — 但它也確實是 JavaScript 最常被拿出來嘲笑的地方。

#### 把字串轉成數字的三個正規做法

`- 0` 和 `* 1` 是投機寫法，可讀性差。正規做法是：

- a. `Number("78")` → `78`，但 `Number("78abc")` → `NaN`，`Number("")` → `0`
- b. `parseInt("78", 10)` → `78`，`parseInt("78abc", 10)` → `78`（它會**盡量讀到讀不下去為止**），`parseInt("")` → `NaN`
- c. `+"78"` → `78`，行為等同 `Number()`

三者最大的差別在**容錯**：`parseInt` 寬鬆、`Number` 嚴格。要驗證使用者輸入時通常該用 `Number` 加上 `Number.isNaN` 檢查，不要用 `parseInt`，否則 `"12abc"` 會被你當成合法的 12。

⚠️ 另外 `parseInt` 的第二個參數 **radix（進位基數）請一定要寫 `10`**，否則舊環境遇到 `"0x10"` 這種開頭會用 16 進位解讀。

#### 一句話面試答法

> 「`+` 在規範裡會先對兩邊做 `ToPrimitive`，只要任一邊是字串就走字串串接分支；其他算術運算子沒有這個分支，一律 `ToNumeric`。所以 `"78" - 8` 是數字 `70`，而 `"78" + 8` 是字串 `"788"`。」

> 對應題目：[LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/) — 這題要你實作 `valueOf` 與 `toString`，親手決定「`+` 遇到我這個物件時要變成什麼」，寫完會徹底理解 `ToPrimitive` 與 hint。

> 關聯：本文第 9 節「順便：`+` 運算子的完整規則」是從**實測踩坑**的角度切入同一個機制（那裡在追「為什麼 `7 + '7'` 印出來像數字其實是字串」），本節則是從**規範分岔**的角度切入。兩節可以對照著看 — 一個是現象，一個是原理。

---

### 3-b. BigInt（大整數）— 第 7 種原始型別

> 📖 MDN｜[BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) ｜ [BigInt 字面值語法](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#numeric_literals) ｜ [Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) ｜ [Number.isSafeInteger()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger) ｜ [TypeError: can't convert BigInt to number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_convert_BigInt_to_number)

BigInt 是 **ES2020** 加進來的第 7 種原始型別，語法是數字結尾加一個 `n`：

```js
const big = 9007199254740993n;
typeof big;      // "bigint"
big + 1n;        // 9007199254740994n
BigInt(42);      // 42n    ← 也可以用函式轉換
BigInt("42");    // 42n
// new BigInt(42);  ❌ TypeError: BigInt is not a constructor
```

#### 為什麼需要它：Number 的天花板

`Number` 是 IEEE 754 雙精度浮點數，尾數（mantissa）只有 52 bit，所以**能精確表示的整數上限**是 `Number.MAX_SAFE_INTEGER` = `9007199254740991`（2^53 − 1，約 9 千兆）。超過就開始靜靜掉精度：

```js
console.log(9007199254740993);                        // 9007199254740992  ← 被改掉了
console.log(9007199254740992 === 9007199254740993);   // true  ← 兩個不同的數字變成同一個
console.log(Number.isSafeInteger(9007199254740993));  // false
console.log(9007199254740993n);                       // 9007199254740993n ← BigInt 才對
```

⚠️ 注意這裡**完全不會報錯**，這才是可怕的地方。

#### 為什麼「不報錯」才是真正可怕的地方 —— 後端 int64 ID 的真實災難

`9007199254740992 === 9007199254740993` 回 `true`，意思是**兩個不同的 ID 在你的程式裡變成同一個人**。而且沒有任何警告。

實測 JSON 傳輸：

```js
JSON.parse('{"userId": 9007199254740993}').userId
// → 9007199254740992   ❌ 尾數被靜靜改掉了

JSON.parse('{"userId": "9007199254740993"}').userId
// → "9007199254740993"  ✅ 用字串傳就完好
```

**中文白話**：後端用 Go 的 `int64`／Java 的 `Long`／PostgreSQL 的 `bigint` 當主鍵或 Snowflake ID，轉成 JSON 是一個純數字。前端 `JSON.parse` 把它變成 `Number`，超過 2^53−1 的部分就被四捨五入掉了。**你以為在更新 A 的資料，其實更新到 B。**

#### 那是不是超過 MAX_SAFE_INTEGER 就該用 BigInt？—— 要看你打算對它做什麼

| 你要做什麼 | 該用什麼 | 理由 |
|---|---|---|
| 只是**傳遞、顯示、當 key** | **字串** | 最安全，且 JSON 原生支援 |
| 要做**算術／位元運算** | **BigInt** | 只有它能精確計算大整數 |

⚠️ **BigInt 的兩個坑（實測）**：

```js
JSON.stringify({ id: 1n })
// TypeError: Do not know how to serialize a BigInt   ← 不能直接序列化

1n + 1
// TypeError: Cannot mix BigInt and other types        ← 不能跟 Number 混算
1n + 1n   // 2n  ✅ 同型別才行
```

★ **實務最佳解：請後端把 int64 ID 以「字串」形式放進 JSON。** 這是業界慣例（Twitter/X 的 API 就同時給 `id` 和 `id_str`），比在前端補救省事得多。

#### ✅ 該用 BigInt 的時機

- a. **你要對 64-bit 整數做算術** — Go 的 `int64`、Java 的 `Long`、PostgreSQL / MySQL 的 `bigint`，只要你需要對它加減乘除而不只是傳遞
- b. **Snowflake ID 的位元運算** — Twitter/X、Discord 的 ID 是 64-bit，要拆出時間戳、機器 ID、序號就得做位移
- c. **加密貨幣金額** — 1 ETH = 10^18 wei，`Number` 完全裝不下
- d. **密碼學運算** — RSA、橢圓曲線這類大數模運算
- e. **奈秒等級的高精度計時** — `process.hrtime.bigint()` 直接回傳 BigInt
- f. **大數學計算** — 階乘、費氏數列、大質數

#### ❌ 不該用 BigInt 的時機（比上面更常見）

- a. **一般的價格、數量、分頁、座標** — 這些連上限的萬分之一都不到
- b. **毫秒時間戳** — `Date.now()` ≈ 1.788 × 10^12，離上限還有兩萬倍的空間
- c. **需要小數的任何場合** — BigInt 是**整數**型別，`5n / 2n` 是 `2n` 不是 `2.5`
- d. **只是要「傳遞」一個大 ID** — 用**字串**就好，ID 本來就不需要做算術

#### ⚠️ 用 BigInt 要付的代價

```js
1n + 1                    // ❌ TypeError: Cannot mix BigInt and other types
Math.max(1n, 2n)          // ❌ TypeError: Cannot convert a BigInt value to a number
JSON.stringify({ v: 1n }) // ❌ TypeError: Do not know how to serialize a BigInt
5n / 2n                   // 2n   ← 直接截斷，沒有小數
1n == 1                   // true  ← 寬鬆相等會轉換
1n === 1                  // false ← 嚴格相等看型別，不相等
```

| 代價 | 說明 |
|---|---|
| 不能和 Number 混用 | 每一次運算都要顯式 `BigInt()` 或 `Number()` 轉換，程式碼變醜 |
| 整套 `Math` 都拒收 | `Math.max`、`Math.round`、`Math.sqrt`、`Math.abs` 全部不能用 |
| `JSON.stringify` 直接丟錯 | 要自己寫 replacer 把它轉成字串 |
| 沒有小數 | 除法一律截斷 |
| 比較慢 | 任意精度運算不是 CPU 原生指令，是軟體模擬的 |
| `===` 跨型別必為 false | `1n === 1` 是 `false`，容易在條件判斷踩到 |

#### ⚠️ 最容易踩到的真實場景：後端 int64 ID 經過 JSON.parse

這是**前後端分離專案幾乎一定會遇到一次**的 bug：

```js
const raw = '{"id": 1234567890123456789, "name": "abby"}';
JSON.parse(raw).id
// 1234567890123456800   ← 最後三位被改掉，而且完全不報錯
```

**症狀**：前端拿這個 ID 去查詢，後端回「查無此資料」。你把 ID 印出來看，跟資料庫裡的**長得幾乎一模一樣**，只有最後幾位不同 —— 這種 bug 極難抓，因為你的眼睛會自動忽略那幾位數字。

**為什麼 BigInt 救不了你**：`JSON.parse` 在你拿到值**之前**就已經把它轉成 `Number` 破壞掉了。等你想用 BigInt 包，資訊已經沒了。

**正解是請後端把 int64 序列化成字串**：

```js
JSON.parse('{"id":"1234567890123456789"}').id   // "1234567890123456789" ✅ 完整
```

前端就把它當字串處理。這也是為什麼很多 API 設計規範會明訂「**ID 一律用 string 傳輸**」。

如果你真的沒辦法改後端，退路是用支援 BigInt 的 JSON 解析器（例如 `json-bigint`），或用正規表示式在 `JSON.parse` 之前先把長數字包成字串 —— 但兩者都是繞路，能改後端就改後端。

#### 決策流程

```
需要處理的整數是不是超過 9007199254740991（約 9 千兆）？
├─ 否 → 用 Number，不要想太多
└─ 是 → 你需要對它「做算術」還是只是「傳遞它」？
        ├─ 只是傳遞（ID、序號） → 用 string，請後端配合
        └─ 需要算術（位移、加總、模運算）→ 用 BigInt，並接受上面那六個代價
```

> 對應題目：[LeetCode 2666. Allow One Function Call](https://leetcode.com/problems/allow-one-function-call/) 雖然不直接考 BigInt，但 JavaScript 30 Days 系列裡多題的邊界測資會踩到 `Number` 的精度上限，寫的時候留意一下就會有感。

---

## 4. Boolean 與 truthy / falsy

> 📖 MDN｜[Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) ｜ [Glossary: Truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy) ｜ [Glossary: Falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) ｜ [空值合併運算子 ??](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing) ｜ [邏輯或 ||](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR)

**falsy 只有 8 個**，其餘全部 truthy：

- a. `false`
- b. `0`
- c. `-0`
- d. `0n`（BigInt 的零）
- e. `""`（空字串）
- f. `null`
- g. `undefined`
- h. `NaN`

```js
if ([])   console.log("空陣列是 truthy");   // ✅ 會印出來
if ({})   console.log("空物件是 truthy");   // ✅ 會印出來
if ("0")  console.log("字串零是 truthy");   // ✅ 會印出來
```

⚠️ 實務最常踩的坑：用 `||` 給預設值時，`0` 和 `""` 會被誤判成「沒填」。

```js
// ❌ 使用者真的填 0 的時候會被吃掉
const count = props.count || 10;

// ✅ 空值合併運算子 ?? 只有 null / undefined 才走右邊
const count = props.count ?? 10;
```

> 對應題目：[LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/) — 就是在考「遞迴移除物件裡所有 falsy 值」，寫完會對 falsy 清單非常有感。

---

### 4-b. `==` 是用 truthy / falsy 判斷的嗎？**不是**

> 📖 MDN｜[等於 ==](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality) ｜ [嚴格等於 ===](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality) ｜ [Equality comparisons and sameness（四種相等演算法比較）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness) ｜ [Object.is()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) ｜ [Type coercion 型別轉換](https://developer.mozilla.org/en-US/docs/Glossary/Type_coercion)
> 📖 規範｜[ECMA-262: IsLooselyEqual (`==`)](https://tc39.es/ecma262/#sec-islooselyequal) ｜ [IsStrictlyEqual (`===`)](https://tc39.es/ecma262/#sec-isstrictlyequal)

**`==` 確實會做型別轉換（coercion），但它轉的方向是「數字／原始值」，不是「布林」。** 它從頭到尾**沒有**呼叫 `Boolean()`，所以跟 truthy / falsy 是兩套完全獨立的規則。

#### 兩個決定性反例

如果 `==` 真的是用 truthy / falsy 判斷，下面這兩組不可能同時成立：

```js
Boolean([]);        // true   ← 空陣列是 truthy
[] == false;        // true   ← 卻等於 false ？！

Boolean(null);      // false  ← null 是 falsy
null == false;      // false  ← 卻不等於 false ？！
undefined == false; // false  ← 同樣不等於 false
```

- a. `[]` 是 **truthy**，但 `[] == false` 是 **true**
- b. `null` 是 **falsy**，但 `null == false` 是 **false**

**兩組結論完全相反，所以 `==` 一定不是走 truthy / falsy。**

#### 那 `==` 到底怎麼判斷：IsLooselyEqual 演算法

規範裡的步驟（ECMA-262 §7.2.15），照順序往下比：

- a. **兩邊型別相同** → 直接用 `===` 的規則比，不做任何轉換
- b. **一邊 `null`、一邊 `undefined`** → 回傳 `true`
  （⚠️ 而且 `null` 與 `undefined` **只跟彼此相等**，跟 `0`、`""`、`false` 全都不相等）
- c. **Number vs String** → 把 **String 轉成 Number** 再比
- d. **任一邊是 Boolean** → 把 **Boolean 轉成 Number**（`false` → `0`，`true` → `1`），然後**回到第一步重新比一次**
- e. **Object vs 原始型別** → 對 Object 做 **ToPrimitive**（先試 `Symbol.toPrimitive` → `valueOf` → `toString`），然後回到第一步
- f. **BigInt vs String** → 把 String 轉成 BigInt
- g. **以上都不符合** → 回傳 `false`

**關鍵在第 d 步**：布林值是被轉成**數字**，而不是把另一邊轉成布林。這就是所有誤會的根源。

#### 把 `[] == false` 拆開看

```
[] == false
  → 第 d 步：false 是 Boolean，轉成 Number 0
[] == 0
  → 第 e 步：[] 是 Object，做 ToPrimitive
    [].valueOf()  回傳 [] 本身，不是原始值 → 繼續
    [].toString() 回傳 ""                  → 拿到原始值
"" == 0
  → 第 c 步：String 轉 Number，Number("") 是 0
0 == 0
  → 第 a 步：型別相同，相等
true
```

⚠️ 全程**沒有任何一步呼叫 `Boolean()`**。`[]` 是不是 truthy 從來沒有被問過。

#### `null == false` 為什麼是 false

```
null == false
  → 第 b 步：一邊是 null，但另一邊是 false 不是 undefined → 不適用
  → 第 c 步：null 不是 Number 也不是 String → 不適用
  → 第 d 步：false 轉成 0
null == 0
  → null 只跟 undefined 相等，跟 0 不相等
  → 第 g 步：回傳 false
false
```

**`null` 在 `==` 的世界裡是個獨行俠**：它只跟 `undefined` 相等，跟任何其他值都不相等 —— 就算那個值也是 falsy。

#### 完整對照表：truthy/falsy 與 `== false` 是兩回事

| 值 | `Boolean(v)`（truthy 判斷） | `v == false`（loose equality） | 一致嗎 |
|---|---|---|---|
| `false` | `false` | `true` | ✅ |
| `0` | `false` | `true` | ✅ |
| `-0` | `false` | `true` | ✅ |
| `0n` | `false` | `true` | ✅ |
| `""` | `false` | `true` | ✅ |
| **`null`** | **`false`** | **`false`** | ❌ **不一致** |
| **`undefined`** | **`false`** | **`false`** | ❌ **不一致** |
| **`NaN`** | **`false`** | **`false`** | ❌ **不一致** |
| **`[]`** | **`true`** | **`true`** | ❌ **不一致** |
| **`"0"`** | **`true`** | **`true`** | ❌ **不一致** |
| **`" "`（空白字元）** | **`true`** | **`true`** | ❌ **不一致** |
| **`[0]`** | **`true`** | **`true`** | ❌ **不一致** |
| `{}` | `true` | `false` | ✅ |
| `"false"` | `true` | `false` | ✅ |

**15 個值裡有 7 個不一致**，比例接近一半 —— 這就是為什麼不能把兩者混為一談。

#### 其他常被拿來考的組合

```js
"1"  == true    // true   "1" → 1，true → 1
"abc" == true   // false  true → 1，"abc" → NaN，NaN 不等於任何東西
2    == true    // false  true → 1，2 !== 1（⚠️ 不是「2 是 truthy 所以等於 true」）
"\n" == 0      // true   Number("\n") 是 0，因為前後空白會被去掉
[0]  == false   // true   [0] → "0" → 0
[1]  == true    // true   [1] → "1" → 1
null == 0       // false  null 只跟 undefined 相等
NaN  == NaN     // false  NaN 不等於自己
[]   == ![]     // true   ![] 是 false（因為 [] 是 truthy），然後 [] == false 走上面那條路
```

⚠️ 特別看 `2 == true` 是 `false` 這一題：`2` 明明是 truthy，`true` 也是 true，如果按照 truthy 判斷應該相等 —— 但實際上是 `false`，因為 `true` 被轉成 `1`，而 `2 !== 1`。

#### 那 `if (x)` 呢？**那個才是 truthy / falsy**

這是最需要分清楚的一組：

```js
if (x) { }        // ← 這裡才是 ToBoolean，走 truthy / falsy 規則
x == false        // ← 這裡是 IsLooselyEqual，走轉數字的規則
x === false       // ← 這裡完全不轉換，型別不同就直接 false
```

```js
const arr = [];
if (arr) console.log("進得去");   // ✅ 會印出來（[] 是 truthy）
console.log(arr == false);        // true（但它又「等於」false）
```

同一個 `[]`，在 `if` 裡是真的，在 `==` 裡等於假的 —— 兩套規則各走各的。

#### 實務結論

- a. **一律用 `===`**，除非你有明確理由
- b. **唯一值得用 `==` 的場合是 `x == null`** —— 它等價於 `x === null || x === undefined`，是檢查「空值」最短的寫法。ESLint 的 `eqeqeq` 規則預設也有 `"smart"` 選項專門放行這一種
- c. **要判斷「有沒有值」用 `if (x)` 或 `x ?? 預設值`**，不要用 `x == false` 這種寫法
- d. **`x != null` 是很常見的 guard**，例如 `if (data != null) { ... }` 一次擋掉 null 與 undefined

```js
// ✅ 這個 == 是可以接受的
if (value == null) return "沒有資料";      // 同時擋掉 null 與 undefined

// ❌ 這種就別寫了
if (count == false) { }                    // 意圖不明，而且 null 會漏掉
// ✅ 改成
if (!count) { }                            // 明確在問 truthy / falsy
if (count === 0) { }                       // 明確在問「是不是 0」
```

#### 順帶一提：JavaScript 有四種「相等」

| 演算法 | 寫法 | 做型別轉換 | `NaN` 等於 `NaN` | `+0` 等於 `-0` |
|---|---|---|---|---|
| Loose equality | `==` | ✅ 轉數字／原始值 | ❌ | ✅ |
| Strict equality | `===` | ❌ | ❌ | ✅ |
| SameValueZero | `[].includes()`、`Map` / `Set` 的 key 比對 | ❌ | ✅ | ✅ |
| SameValue | `Object.is()` | ❌ | ✅ | ❌ |

```js
[NaN].includes(NaN);        // true   SameValueZero 認得 NaN
[NaN].indexOf(NaN);         // -1     indexOf 用的是 ===，認不得
Object.is(NaN, NaN);        // true
Object.is(+0, -0);          // false  只有它區分正負零
new Set([NaN, NaN]).size;   // 1      SameValueZero，所以只留一個
```

⚠️ **`Object.is` 就是 React 判斷 state 有沒有變的那個函式**，所以理解這張表對你寫 React 有直接幫助。

> 對應題目：[LeetCode 2704. To Be Or Not To Be](https://leetcode.com/problems/to-be-or-not-to-be/) — 實作 `toBe`（用 `===`）與 `notToBe`，很短但會逼你把「相等」想清楚。

實跑驗證的完整程式碼在 `demo-01-primitives-typeof.js` 的最後一段。

---

## 5. Symbol（唯一識別符）

> 📖 MDN｜[Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol) ｜ [Symbol.for()（全域註冊表）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/for) ｜ [Well-known symbols 知名符號](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#well-known_symbols) ｜ [Symbol.iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator) ｜ [Symbol.species](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species)

Symbol 的核心是**唯一性**：`Symbol("id") !== Symbol("id")`，括號裡的字串只是給人看的描述（description），不參與比對。

### 5-a. 當 Map 的 key

> 📖 MDN｜[Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) ｜ [Map.prototype.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set) ｜ [Map.prototype.forEach()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) ｜ [Map.prototype.keys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys)

```js
const symKey1 = Symbol("id");
const symKey2 = Symbol("id");   // 描述一樣，但是完全不同的兩個 Symbol

const myMap = new Map();
myMap.set(symKey1, "User_001");
myMap.set(symKey2, "User_002");

console.log(myMap.get(symKey1)); // "User_001"
console.log(myMap.get(symKey2)); // "User_002"
console.log(myMap.size);         // 2  — 證明兩個 key 沒有互相覆蓋
console.log(myMap);              // Map(2) {Symbol(id) => 'User_001', Symbol(id) => 'User_002'}
```

`Map` 的 key 可以是**任何值**（物件、Symbol、NaN 都行），這是它和普通物件最大的差異 — 普通物件的 key 只能是 string 或 Symbol，其他型別會被 `String()` 轉掉。

`myMap.keys()` 和 `myMap.forEach()` 都能正常迭代到 Symbol key，實測：

```js
const s = Symbol("id");
const m = new Map([[s, "v"]]);
m.forEach((v, k) => console.log(String(k), v));  // Symbol(id) v
```

### 5-b. 當「物件」的 key 就完全不一樣了

> 📖 MDN｜[Object.getOwnPropertySymbols()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols) ｜ [Reflect.ownKeys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/ownKeys) ｜ [Object.keys()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys) ｜ [列舉性與所有權 Enumerability and ownership](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties)

Symbol 屬性是**隱藏**的，一般的列舉手段全部看不到它：

```js
const s = Symbol("id");
const o = { [s]: 1, name: "abby" };

Object.keys(o);                   // [ 'name' ]        ❌ 看不到
JSON.stringify(o);                // {"name":"abby"}   ❌ 看不到
for (const k in o) {}             //                   ❌ 看不到

Object.getOwnPropertySymbols(o);  // [ Symbol(id) ]    ✅ 只拿 Symbol
Reflect.ownKeys(o);               // [ 'name', Symbol(id) ]  ✅ 全部一起拿
```

**為什麼要設計成隱藏**：讓函式庫可以在使用者的物件上掛「內部用」的欄位，而不會污染使用者的 `Object.keys()` 或 `JSON.stringify()` 結果。這也是 `Symbol.iterator`、`Symbol.species` 這類「知名 Symbol（well-known symbols）」的用法。

> 關聯：`iThome鐵人賽-2026/Map-Symbol-species-規範裡沒人用的屬性.md` 講的就是 well-known symbol 的其中一個 — 那篇是「知名 Symbol 怎麼被規範呼叫」，這裡是「Symbol 這個型別本身的性質」，先讀這裡再讀那裡比較順。

---

## 6. null 與 undefined

> 📖 MDN｜[null](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null)（注意：它是**關鍵字**所以歸在 Operators 底下）｜ [undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined)（它是**全域屬性**所以歸在 Global_Objects 底下）｜ [可選鏈 ?.](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) ｜ [setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) ｜ [clearTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/clearTimeout)

| | `null` | `undefined` |
|---|---|---|
| 語意 | **我刻意把它清空** | 引擎說「這裡沒東西」 |
| 誰放的 | 開發者手動指定 | 引擎預設（未賦值變數、沒有 return、找不到的屬性、少傳的參數） |
| `typeof` | `"object"`（歷史 bug） | `"undefined"` |
| `JSON.stringify` | 保留成 `null` | **整個鍵會消失** |
| `==` 互相比較 | `null == undefined` 是 `true` | 同左 |
| `===` 互相比較 | `null === undefined` 是 `false` | 同左 |
| `Number(x)` | `0` | `NaN` |
| `x + 1` | `1`（null→0） | `NaN`（undefined→NaN） |
| 觸發預設參數 | **不會**（傳 null 就是 null） | **會**（傳 undefined 才用預設值） |
| `??` / `?.` | 兩者一視同仁：`a ?? b` 只有 a 是 null 或 undefined 才取 b | 同左 |

三個最常被考的行為差（記這個就贏一半）：`typeof null==="object"`／`typeof undefined==="undefined"`；`Number(null)===0` 但 `Number(undefined)===NaN`；`JSON.stringify` 丟掉 undefined、保留 null；且**預設參數只認 undefined**。

**引擎從不自動給你 `null`**——`null` 一定是**你手動 `= null`** 才出現；系統的「空」一律是 `undefined`（所以 `var` 提升、宣告沒賦值拿到的都是 `undefined`，不是 `null`）。

**「宣告一個變數會不會在記憶體劃一格？」——會。** 宣告（`let a;`）會在**環境紀錄（Environment Record，見第 7 節）**裡劃出一格 binding/slot，那格裝的值就是 `undefined`。`undefined` 是原始型別的**單一共用值**（像 singleton），不會為每次使用另外配堆積（heap）記憶體。對比：**完全沒宣告的名字根本沒有那一格 → 一存取就 `ReferenceError`**（「有沒有那一格」正是 undefined 與 ReferenceError 的分界，完整排列組合見 [[15-ReferenceError-vs-undefined-值與錯誤的分界]]）。

### 使用時機：debounce 的 timer

`null` 最典型的用途是「任何時刻最多只有一個有意義的值，而且不需要保留歷史」：

```js
function debounce(fn, delay) {
  let timer = null;                 // 一開始沒有排程中的任務
  return function (...args) {
    if (timer !== null) {
      clearTimeout(timer);          // 使用者又打字了，把上一個排程取消
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;                 // 執行完把狀態清回「沒有排程」
    }, delay);
  };
}

const search = debounce((keyword) => console.log("查詢", keyword), 300);
input.addEventListener("input", (e) => search(e.target.value));
```

這段程式的意思是：使用者停止打字滿 300 毫秒之後，才真的送出一次查詢。搜尋框、表單即時驗證是最常見的場景。

`timer` 之所以用 `null` 而不是 `undefined`，是因為 `null` 傳達的是「**我知道這裡該有東西，我現在主動把它設成空**」，`undefined` 傳達的是「我沒管過這裡」。

> 關聯：`iThome鐵人賽-2026/文章-閉包活多久-從debounce的timer看Environment-Record存活時間.md` 用的就是同一段 debounce，那篇問的是「這個 `timer` 變數活到什麼時候才被回收」，剛好接上下一節。

> 對應題目：[LeetCode 2627. Debounce](https://leetcode.com/problems/debounce/) — 直接就是實作這個函式。

---

## 7. 原始型別存在哪裡：stack、heap、與閉包

> 📖 MDN｜[Closures 閉包](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures) ｜ [Memory management 記憶體管理與 GC](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management) ｜ [作用域 Scope](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#variable_scope)
> 📖 規範｜[ECMA-262: Environment Records](https://tc39.es/ecma262/#sec-environment-records) ｜ [Function Environment Records](https://tc39.es/ecma262/#sec-function-environment-records)

Abby 原稿的說法：

> 基礎型別用 let / var / const 會在記憶體裡劃出一個專屬區域，通常在 stack；但如果是閉包中內層函式引用的外層變數，該值會被提升到 heap，直到閉包被垃圾回收為止。這是透過 V8 在編譯階段建立 `[[Environment]]` 完成的。

**這個心智模型方向正確，但有兩處需要修正：**

- a. 「原始型別一律放 stack」是**教學用的簡化模型，不是 V8 的實作**。V8 裡：
    - 小整數走 **Smi（Small Integer）**，直接編碼在指標的位元裡，確實不佔 heap
    - 小數、大整數走 **HeapNumber**，是配置在 heap 上的物件
    - 字串**一律**是 heap 上的物件，變數槽裡放的只是指標
    面試時可以說「概念上區分 stack 與 heap」，但別把它當成 V8 的事實。

- b. 「值被**提升**到 heap」的說法不精準。實際上是 V8 在**解析階段**（parse，不是編譯階段）就分析出「哪些變數被內層函式引用」，這些變數從一開始就被配置在 heap 上的 **Context 物件**裡（叫 context allocation）；沒被引用的變數才留在 stack frame。所以不是先在 stack、之後搬家，而是**一開始就決定放哪**。

**正確的機制描述**

```text
【建立時發生什麼】

  函式被建立
      │
      ▼
  函式物件取得內部欄位 [[Environment]]        ← 掛在「函式物件」上，不是掛在變數上
      │
      ▼
  它指向「建立當下」所在的 Environment Record（環境紀錄）
      │                                       ← ES5 時代叫 Scope 物件，ES6 之後改用這個名字
      ▼
  Environment Record 內有 [[OuterEnv]] 指向外層
      │
      ▼
  一層一層串成「單向鏈結串列 singly linked list」＝ Scope Chain 作用域鏈
      │
      ▼
  只要還有函式持有引用，整條鏈就不會被 GC 回收   ← 這就是閉包造成記憶體洩漏的原理


【查一個變數時怎麼走】

  [內層函式]
      │ [[Environment]]
      ▼
  [Env Record：debounce 的內部]  ──── timer 住這裡
      │ [[OuterEnv]]
      ▼
  [Env Record：模組 / 外層函式]  ──── fn、delay 住這裡
      │ [[OuterEnv]]
      ▼
  [Global Environment Record]    ──── console、setTimeout 住這裡
      │ [[OuterEnv]]
      ▼
     null                        ──── 到這裡還沒找到就 ReferenceError

  沿著鏈往外走，找到就停 ── 所以巢狀越深，查外層變數的路徑越長
```

- a. `[[Environment]]` 是**函式物件**上的內部欄位（internal slot），不是變數上的
- b. 它指向的是 **Environment Record（環境紀錄）**，ES5 時代叫 Scope 物件，ES6 之後規範改用這個名字
- c. Environment Record 之間用 `[[OuterEnv]]` 串成**單向鏈結串列（singly linked list）**，這就是作用域鏈（scope chain）
- d. 查一個變數時，引擎沿著這條鏈往外走，找到就停 — 這也是為什麼越深的巢狀函式查外層變數越慢（雖然 V8 有做最佳化）
- e. 只要內層函式還活著（例如被 `addEventListener` 或 `setTimeout` 持有），整條鏈就不會被回收 — 這就是閉包造成記憶體洩漏的原理

---

## 8. 物件與它的子型別

> 📖 MDN｜[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) ｜ [Working with objects 物件操作指南](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects) ｜ [Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) ｜ [Object.seal()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal)

### 8-a. Object（物件字面量）

```js
const o = { name: "Christine", age: 20 };
o.name = "Abby";        // 可變（mutable）
const o2 = o;
o2.name = "Look";
console.log(o.name);    // "Look"  — o 和 o2 指向同一個本體
```

### 8-b. Array（陣列）

> 📖 MDN｜[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) ｜ [Array() 建構函式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array) ｜ [Array.isArray()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray) ｜ [Array.from()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from) ｜ [Array.prototype.fill()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill) ｜ [Indexed collections（含 sparse arrays）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections)

MDN 的建議原文：

> Use the array constructor only when you need to create an empty array of a specific length.
> （只有在需要建立指定長度的空陣列時，才考慮使用 `new Array(n)`）

#### `new Array()` 的參數陷阱

**傳入單一數字**跟**傳入其他任何東西**，行為完全不同：

```js
// 傳一個數字 → 建立指定長度的稀疏陣列（sparse array）
console.log(new Array(3));         // [ <3 empty items> ]
console.log(new Array(3).length);  // 3
console.log(new Array(3)[0]);      // undefined
console.log(0 in new Array(3));    // false  ← 關鍵：索引 0 根本不存在

// 傳一個非數字 → 建立長度 1、內含該元素的陣列
console.log(new Array("3"));       // [ '3' ]      length 1
console.log(new Array(true));      // [ true ]     length 1
console.log(new Array({ name: "Christine" }));  // [ { name: 'Christine' } ]

// 傳兩個以上 → 就是普通的元素列表
console.log(new Array(1, 2, 3));   // [ 1, 2, 3 ]
```

⚠️ 這個「單一數字特例」**只適用於 `Array` 建構函式**，方括號字面量 `[3]` 永遠是「長度 1、裡面裝著 3」。

#### 稀疏陣列（sparse）vs 密集陣列（dense）

- a. **稀疏陣列**：`length` 大於實際存在的索引數量，也就是裡面有**至少一個空位（empty slot / hole）**
- b. **密集陣列**：每一個索引都實際存在

```js
const sparse = new Array(2);              // [ <2 empty items> ]  ← 稀疏
const dense  = [undefined, undefined];    // [ undefined, undefined ]  ← 密集

console.log(0 in sparse);  // false  索引不存在
console.log(0 in dense);   // true   索引存在，只是值是 undefined
```

**核心關鍵：重點在「有沒有空位」，而不是「是不是全部都是空的」。** 只要有一個洞就是稀疏陣列。

**為什麼要在意**：因為大部分陣列方法會**跳過空位**：

```js
let n = 0;
new Array(3).map(() => { n++; });
console.log(n);   // 0  ← callback 一次都沒被呼叫
```

會跳過空位的：`map` `forEach` `filter` `reduce` `some` `every`
不會跳過的：`join`（當成空字串）、`fill`、`find` / `findIndex`（當成 undefined）、`for...of`（當成 undefined）、展開運算子 `...`（當成 undefined）

#### React 星星評分：三種寫法（含原稿的兩個 bug）

```jsx
// ❌ 原稿寫法 1：箭頭函式用了大括號卻沒 return，map 出來全是 undefined
{new Array(5).fill(0).map((_, index)=>{
    <Star key={index} />
})}

// ✅ 修正：改用小括號（隱式回傳）或補上 return
{new Array(5).fill(0).map((_, index) => (
  <Star key={index} />
))}
```

```jsx
// ✅ 寫法 2：Array.from — 最語意清楚，而且可以直接傳 mapFn 省掉一次 .map
{Array.from({ length: 5 }, (_, index) => (
  <Star key={index} />
))}
```

```jsx
// ❌ 原稿寫法 3：括號位置錯了，map 在展開之前就對稀疏陣列跑，全部被跳過
{[...Array(5).map((_, index) => <Star key={index} />)]}

// ✅ 修正：先展開讓陣列變密集，再 map
{[...Array(5)].map((_, index) => (
  <Star key={index} />
))}
```

實跑驗證（Node v22.22.2）：

```js
[...Array(5).map((_,i)=>i)]      // [null,null,null,null,null] ← JSON 化後的空位，等同全是 undefined ❌
[...Array(5)].map((_,i)=>i)      // [0,1,2,3,4] ✅
new Array(5).fill(0).map((_,i)=>i) // [0,1,2,3,4] ✅（fill 把洞填實了）
Array.from({length:5},(_,i)=>i)  // [0,1,2,3,4] ✅
```

三種寫法差別的一句話總結：

- a. `fill()` — 把稀疏變密集，然後正常 map
- b. `Array.from({length:n}, fn)` — 從一個「類陣列物件」建立，過程中**根本沒有洞**
- c. `[...Array(n)]` — 展開運算子會把洞讀成 `undefined`，等於一次填實

#### 為什麼 `typeof new Array(...)` 是 `"object"`

```js
const arr = new Array({ name: "Christine" });
console.log(typeof arr);            // "object"  ← 不管裡面裝什麼都一樣
console.log(Array.isArray(arr));    // true      ✅ ECMA-262 提供的正解
console.log(arr instanceof Array);  // true      ⚠️ 跨 iframe / 跨 realm 會失效
console.log(Object.prototype.toString.call(arr));  // "[object Array]"
```

因為**陣列本質上就是一種特殊物件**（exotic object）：索引其實是字串 key，只是多了一個會自動同步的 `length`。`typeof` 沒辦法區分它和普通物件，所以規範另外提供 `Array.isArray()`。

`instanceof` 的問題在於它比對的是 prototype 鏈，而每個 iframe / worker 有自己的 `Array` 建構函式，所以從別的 realm 傳過來的陣列會被判成 `false`。`Array.isArray()` 檢查的是內部標記，不受影響 — 這是它存在的唯一理由。

#### React 的 key 規則

React 要求的是「**在陣列或迭代渲染時的 JSX 元素**」必須有 `key`。單獨渲染一個元件（`<MyComponent />`）不需要 key；只有用 `.map()` 或迴圈產生一組元件時，每一項才必須有唯一的 key。

key 的作用是讓 React 的 diff 演算法在重新渲染時能認出「這一項還是原來那一項」，避免整段拆掉重建（以及連帶把 input 的輸入狀態弄丟）。

### 8-c. Function（函式）

> 📖 MDN｜[Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) ｜ [Functions 指南](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) ｜ [Function.prototype.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) ｜ [箭頭函式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) ｜ [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)

函式是**可以被呼叫的物件**，所以它可以有屬性：

```js
function fn() {}
fn.myProp = 1;
console.log(fn.myProp);   // 1
console.log(typeof fn);   // "function"
console.log(fn instanceof Object);  // true
```

### 8-d. Map

> 📖 MDN｜[Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) ｜ [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) ｜ [Keyed collections（Map 與 Object 的取捨）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections)

```js
const m = new Map();
m.set("key", "value");     // 建立 key-value 用 set()
m.get("key");              // 讀取用 get()
m.has("key");              // true
m.delete("key");
m.size;                    // 用屬性，不是方法（物件用 Object.keys(o).length）
```

`Map` 相對於普通物件的四個優勢：

- a. key 可以是**任何型別**（物件、Symbol、NaN、函式）
- b. 保證**插入順序**（普通物件的整數 key 會被排到前面）
- c. `size` 直接拿得到
- d. 本身就是 iterable，可以直接 `for...of`

> 對應題目：[LeetCode 2622. Cache With Time Limit](https://leetcode.com/problems/cache-with-time-limit/)、[LeetCode 2623. Memoize](https://leetcode.com/problems/memoize/) — 兩題都是拿 Map 當快取，Memoize 那題還會逼你思考「參數怎麼變成一個唯一的 key」。

### 8-e. WeakMap

> 📖 MDN｜[WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) ｜ [WeakMap.prototype.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap/set) ｜ [WeakSet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) ｜ [WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) ｜ [TypeError: key must be an object or an unregistered symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Key_not_weakly_held)
> 📖 支援度｜[Can I use: WeakMap non-registered symbols as keys](https://caniuse.com/mdn-javascript_builtins_weakmap_symbol_as_keys)

原稿的程式碼有一個變數名打錯，先修正：

```js
const wm = new WeakMap();          // 原稿宣告成 vm 卻用 wm 呼叫
const objKey = { name: "test" };
const symKey = Symbol("weakKey");

wm.set(objKey, "value1");
wm.set(symKey, "value2");
console.log(wm.get(symKey));       // "value2"  ✅

try {
  wm.set(123, "value3");
} catch (e) {
  console.error("報錯：", e.constructor.name, e.message);
  // TypeError Invalid value used as weak map key
}
```

⚠️ 原稿寫「因為數字不是 garbage-collector」— 正確的說法是：**數字不是可以被垃圾回收的對象（not garbage-collectable）**。WeakMap 的設計前提是「key 沒人引用時，這一筆自動消失」，而原始值沒有身分（identity）也不會被回收，所以不能當 key。

⚠️ 另一個原稿沒提到的細節：**只有非註冊的 Symbol 才行**。`Symbol.for()` 建立的是全域註冊表裡的 Symbol，永遠不會消失，所以一樣被擋：

```js
wm.set(Symbol("x"), "v");        // ✅ 可以（ES2023 起）
wm.set(Symbol.for("x"), "v");    // ❌ TypeError: Invalid value used as weak map key
```

「Symbol 可以當 WeakMap key」是 **ES2023（ES14）** 才進來的，Chrome 108+ / Node 20+ / Firefox 128+ 才支援，寫給舊環境要注意。

---

## 9. 今日實測：「用 var 才能做 concat」是誤會

### 螢幕證據

![var 看起來成功、let 看起來失敗的那張 Console 截圖](../obsidian-attachment/%E8%9E%A2%E5%B9%95%E6%93%B7%E5%8F%96%E7%95%AB%E9%9D%A2%202026-09-05%20122243.png)

上半段有 `console.log` 所以看得到 `77`，下半段只有宣告沒有列印，所以只剩下 `← undefined`。

![var string2 = "con" 加 number2 = 78 得到 con78](../obsidian-attachment/%E8%9E%A2%E5%B9%95%E6%93%B7%E5%8F%96%E7%95%AB%E9%9D%A2%202026-09-05%20132900.png)

`var string2 = "con"` 加上 `var number2 = 78` 得到 `"con78"`，這裡的 `77` 與 `con78` 都是**字串**不是數字。

> 📌 **貼到 ithelp 前的待辦**：上面這兩張圖現在指向本機的 `obsidian-attachment/`，貼上去之前要先把圖片上傳到 iThome，再把括號裡的相對路徑換成 ithelp 回傳的網址（格式是 `https://ithelp.ithome.com.tw/upload/images/...`）。第 1 節那張 typeof 對照表已經是 ithelp 網址，不用動。

### 真正的原因：差在有沒有 console.log

仔細看第一張截圖的兩段：

```js
// 第一段（看起來成功）
var cost1 = 7;
var cost2 = '7';
var cost3 = 7 + '7'
console.log(cost3)        // ← 有這一行，所以印出 77
// 輸出：77
// 回傳：undefined

// 第二段（看起來失敗）
let string = "concat";
let number1 = 88;
let concatenation_test = string + number1;
// ← 沒有 console.log
// 回傳：undefined
```

DevTools Console 每次執行都會顯示「這段程式的**完成值（completion value）**」。而**變數宣告語句的完成值永遠是 `undefined`**，不管你用 var 還是 let 還是 const。

第一段之所以看得到 `77`，是因為 `console.log()` 主動把值印出來了，那個 `undefined` 其實也還是有出現（第一張截圖裡 `← undefined` 就在下面）。第二段只有宣告沒有列印，所以只剩下 `undefined`。

**所以不是 `let` 不能做字串相加，是你沒有叫它印出來。**

### 實跑證明（Node v22.22.2）

```js
var s1 = "con"; var n1 = 78;   console.log(s1 + n1);  // con78  string
let s2 = "con"; let n2 = 78;   console.log(s2 + n2);  // con78  string
const s3 = "con", n3 = 78;     console.log(s3 + n3);  // con78  string
let s4 = "con";                console.log(s4.concat(78));  // con78
```

三種宣告方式結果**完全一樣**。字串相加是 `+` 運算子的行為，跟你用什麼關鍵字宣告變數**毫無關係**。

### 那 var / let / const 到底差在哪

> 📖 MDN｜[var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var) ｜ [let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let) ｜ [const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const) ｜ [Hoisting 提升](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Glossary/Hoisting) ｜ [TDZ 暫時性死區](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz)

| | `var` | `let` | `const` |
|---|---|---|---|
| 作用域 | 函式作用域（function scope） | 區塊作用域（block scope） | 區塊作用域 |
| 可否重複宣告 | ✅ 可以 | ❌ SyntaxError | ❌ SyntaxError |
| 可否重新賦值 | ✅ | ✅ | ❌ TypeError |
| 提升（hoisting） | 提升且初始化為 `undefined` | 提升但進入 TDZ | 提升但進入 TDZ |
| 掛到 `window` | ✅ 會（全域宣告時） | ❌ 不會 | ❌ 不會 |

```js
var a = 1; var a = 2;   // ✅ 2
let b = 1; let b = 2;   // ❌ SyntaxError: Identifier 'b' has already been declared
const c = 1; c = 2;     // ❌ TypeError: Assignment to constant variable.
```

- **TDZ（Temporal Dead Zone，暫時性死區）**：`let` / `const` 從區塊開始到宣告那一行之間，變數已經存在但不能存取，碰到就丟 `ReferenceError`。這是為了逼你「先宣告再使用」。

⚠️ **另一個你之後很可能會踩到的坑**：在 DevTools Console 裡，同一個頁面連續兩次執行 `let x = 1`，舊版 Chrome 會噴 `SyntaxError: Identifier 'x' has already been declared`，而 `var` 不會。Chrome 80（2020）之後已經特別放寬了 console 的 `let` 重複宣告，但如果你把同樣的程式貼進 **Sources 的 Snippet** 或真的 `.js` 檔案裡，這個限制**仍然存在**。

### 順便：`+` 運算子的完整規則

> 📖 MDN｜[Addition (+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition) ｜ [一元加號 Unary plus (+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus) ｜ [Symbol.toPrimitive](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive) ｜ [Object.prototype.valueOf()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf) ｜ [型別轉換 Type coercion](https://developer.mozilla.org/en-US/docs/Glossary/Coercion)
> 📖 規範｜[ECMA-262: The Addition Operator](https://tc39.es/ecma262/#sec-addition-operator-plus) ｜ [ToPrimitive](https://tc39.es/ecma262/#sec-toprimitive)

`+` 是 JavaScript 唯一一個被**多載（operator overloading）** 的運算子，正式名稱是**加法運算子（Addition operator）**，「字串串接」只是它其中一種行為。

> 關聯：本節是從**實測踩坑**切入（為什麼 `7 + '7'` 印出來像數字其實是字串），第 3-a 節則是從**規範分岔**切入（為什麼 `-` 沒有這個特例），兩節對照著看最完整。

規則是：

- a. 先對兩邊做 **ToPrimitive**（物件會先呼叫 `Symbol.toPrimitive` → `valueOf` → `toString`）
- b. 轉完之後，**只要任一邊是字串**，就做**字串連接**
- c. 否則兩邊都轉成數字，做**加法**

```js
1 + 2           // 3          兩邊都是數字
"1" + 2         // "12"       有一邊是字串 → 連接
1 + "2"         // "12"       順序不影響
7 + '7'         // "77"       ← 你截圖裡的例子，結果是字串不是數字
[] + {}         // "[object Object]"   兩邊 ToPrimitive 後都變字串
null + "x"      // "nullx"
undefined + "x" // "undefinedx"
1 + null        // 1          null 轉數字是 0
1 + undefined   // NaN        undefined 轉數字是 NaN
```

⚠️ 特別注意你截圖裡的 `console.log(cost3)` 印出 `77`：**看起來像數字，其實是字串**。因為 `console.log` 印字串時不會加引號。要驗證請用 `typeof cost3`（結果是 `"string"`）或 `console.log({cost3})`。

而**其他所有算術運算子（`-` `*` `/` `%`）沒有這個特例**，一律轉數字：

```js
"con" - 78      // NaN
"78" - 8        // 70
"3" * "4"       // 12
```

> 對應題目：[LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/) — 這題就是叫你實作 `valueOf` 和 `toString`，親手決定「`+` 遇到我這個物件時要變成什麼」，寫完會徹底理解 ToPrimitive。

---

## 10. 常見誤區檢核表

- a. 原始型別是 **7 種**不是 6 種（別漏掉 BigInt）
- a-2. `Number` 的安全上限是 `9007199254740991`，超過就靜靜掉精度且**不報錯**；後端 int64 ID 請用字串傳
- b. `typeof null === "object"` 是 bug，判 null 用 `=== null`
- c. `new Array(3)` 是稀疏陣列，`map` / `forEach` 會整個跳過
- d. `[3]` 和 `new Array(3)` 完全不同
- e. `Array.isArray()` 比 `instanceof Array` 可靠（跨 realm）
- f. `+` 有字串特例，`-` `*` `/` `%` `**` 都沒有 — 規範裡「任一邊是字串就串接」這條分支只寫給 `+`
- f-2. 但反過來說「`+` 只會做字串合併」也是錯的 — `1 + 2` 是 `3`、`true + true` 是 `2`，只有在 `ToPrimitive` 之後任一邊是字串時才串接
- f-3. `+` 的正式名稱是**加法運算子（Addition operator）**，「字串串接」是它的行為不是它的名字，而「同一符號多種行為」這個現象叫**運算子多載（operator overloading）**
- f-4. `new Date() + 1` 是字串、`new Date() - 1` 是數字 — Date 是唯一一個 `ToPrimitive` 的 default hint 比照 string 處理的內建型別
- g. `console.log` 印字串不加引號，`77` 可能是 `"77"`
- h. Console 裡宣告語句的回傳值永遠是 `undefined`，那不代表失敗
- i. WeakMap 的 key 只能是物件或**非註冊**的 Symbol
- j. Symbol 當物件 key 時，`Object.keys` / `JSON.stringify` / `for...in` 都看不到
- k. `||` 給預設值會吃掉 `0` 和 `""`，要用 `??`
- l. **`==` 不是用 truthy / falsy 判斷的**，它轉的是數字／原始值。`[]` 是 truthy 但 `[] == false` 是 `true`；`null` 是 falsy 但 `null == false` 是 `false`
- m. `null` 與 `undefined` 在 `==` 的世界裡只跟彼此相等，跟 `0`、`""`、`false` 都不相等

---

## 11. 關聯筆記（附上關聯的理由）

- a. `iThome鐵人賽-2026/文章-從一個SyntaxError讀懂物件字面量與自動裝箱.md`
  **理由**：本文第 2 節說「字串為什麼有方法可以呼叫」，那篇追的是「自動裝箱產生的包裝物件活多久」，是同一個機制的下游。
- b. `iThome鐵人賽-2026/文章-閉包活多久-從debounce的timer看Environment-Record存活時間.md`
  **理由**：本文第 6 節的 `let timer = null` 和第 7 節的 Environment Record，在那篇合成一個完整的生命週期故事。
- c. `iThome鐵人賽-2026/Map-Symbol-species-規範裡沒人用的屬性.md`
  **理由**：本文第 5 節講 Symbol 這個**型別**，那篇講 well-known symbol 這個**用法**，先型別後用法。
- d. `00-V8引擎完整管線-Parse到Deoptimization.md`
  **理由**：本文第 7 節提到的 context allocation 發生在 parse 階段，那篇有完整的管線圖可以定位它在哪一步。
- e. `JS-資料型別/追問-BigInt取捨-不可變性-與包裝物件.md`
  **理由**：本文列出「有哪些型別」，那篇回答「為什麼要這樣分」— BigInt 什麼時候真的該用、immutable 到底是什麼意思、物件為什麼是唯一可變的、以及原始型別能呼叫方法背後的臨時包裝物件。讀完本文接著讀那篇。
- e-2. `JS-資料型別/Day1-型別辨別-自動轉換-與immutable的四個層次.md`
  **理由**：本文寫「有哪些型別」與 `==` 的深挖，那篇補三個本文沒展開的空缺 — 型別**辨別**工具箱（含 `instanceof` 跨 realm 失效的實測）、自動轉換的**七個入口**收攏成表、以及本文型別樹那句「不可變 immutable」的**四個層次**完整拆解。
- f. `Golang make-array.md`
  **理由**：Go 的 `make([]int, 5)` 會給你 5 個**零值**，JS 的 `new Array(5)` 給你 5 個**洞** — 兩個語言在「預先配置長度」上的語意差異，是很容易寫錯的地方。

---

## 12. 延伸練習（LeetCode JavaScript 30 Days 系列）

- a. [2703. Return Length of Arguments Passed](https://leetcode.com/problems/return-length-of-arguments-passed/) — 熱身，理解 rest 參數
- b. [2727. Is Object Empty](https://leetcode.com/problems/is-object-empty/) — 物件 vs 陣列的判斷
- c. [2705. Compact Object](https://leetcode.com/problems/compact-object/) — falsy 清單實戰
- d. [2635. Apply Transform Over Each Element in Array](https://leetcode.com/problems/apply-transform-over-each-element-in-array/) — 自己實作 map，會逼你面對空位問題
- e. [2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/) — `+` 運算子與 ToPrimitive
- f. [2623. Memoize](https://leetcode.com/problems/memoize/) — Map 當快取，思考 key 的唯一性
- g. [2622. Cache With Time Limit](https://leetcode.com/problems/cache-with-time-limit/) — Map + setTimeout
- h. [2627. Debounce](https://leetcode.com/problems/debounce/) — 本文第 6 節的 `timer = null`
- i. [2822. Inversion of Object](https://leetcode.com/problems/inversion-of-object/) — 物件 key 一定是字串這件事

---

## 13. 參考來源

所有 URL 於 **2026-09-05** 查閱。

- a. MDN — [JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)（原始型別的完整清單與定義）
- b. MDN — [Array() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array)（「只在需要指定長度空陣列時使用建構函式」這句建議的原文出處）
- c. MDN — [Indexed collections / Sparse arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections)（稀疏陣列的定義與各方法對空位的處理）
- d. MDN — [Keyed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections)（Map / Set / WeakMap 的比較）
- e. MDN — [WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) 與 [WeakMap.prototype.set()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap/set)
- f. MDN — [TypeError: WeakSet key/WeakMap value must be an object or an unregistered symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Key_not_weakly_held)（「非註冊 Symbol」限制的官方說明）
- g. Can I use — [WeakMap: Non-registered symbols as keys](https://caniuse.com/mdn-javascript_builtins_weakmap_symbol_as_keys)（瀏覽器支援度）
- h. Node.js issue #49135 — [Non-registered symbols are treated as invalid weak map key](https://github.com/nodejs/node/issues/49135)（Node 各版本的支援時程）
- i. Mozilla Bugzilla #1710433 — [META: Symbols as WeakMap property keys](https://bugzilla.mozilla.org/show_bug.cgi?id=1710433)（Firefox 的實作追蹤）
- j. MDN — [Object.getOwnPropertySymbols()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols)
- k. MDN — [Addition (+) 運算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition)（ToPrimitive 與字串特例的規則）
- l. ECMA-262 — [The Addition Operator ( + )](https://tc39.es/ecma262/#sec-addition-operator-plus)（規範原文）
- l-2. ECMA-262 — [ApplyStringOrNumericBinaryOperator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-applystringornumericbinaryoperator)（第 3-a 節那張分岔圖的規範依據，所有二元算術運算子共用的抽象操作）｜於 **2026-09-08** 查閱
- l-3. ECMA-262 — [Date.prototype [ %Symbol.toPrimitive% ]](https://tc39.es/ecma262/#sec-date.prototype-%symbol.toprimitive%)（Date 的 default hint 比照 string 的規範明文）｜於 **2026-09-08** 查閱
- l-4. MDN — [Subtraction (-)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Subtraction) 與 [Unary plus (+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus)（`-` 無字串分支、一元加號是不同運算子）｜MDN 該頁最後更新 **2026-05-11**，於 **2026-09-08** 查閱
- m. React 官方文件 — [Rendering Lists / Keeping list items in order with key](https://react.dev/learn/rendering-lists)

**本文所有 console 輸出的驗證環境**：Node.js v22.22.2，執行日期 2026-09-05。
