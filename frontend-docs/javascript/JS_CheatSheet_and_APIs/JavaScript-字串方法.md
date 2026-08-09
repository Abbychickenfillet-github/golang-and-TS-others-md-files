---
title: JavaScript 字串方法筆記
type: topic-note
tags: [javascript, string, method, property, autoboxing, unicode]
updated: 2026-07-26
---

# JavaScript 字串方法筆記

## `.length` 是屬性(property)，不是方法(method)

```js
const str1 = "HelloWorld";
console.log(str1.length); // 10
```

**`length` 是屬性，不是方法**——判斷依據很單純：**要不要加括號 `()`**。
- 屬性：`str1.length`（沒有括號，直接讀值）
- 方法：`str1.toUpperCase()`（有括號，代表這是一個要「呼叫」的函式）

`length` 讀取的當下不是在「執行一段邏輯」，只是單純把「這個字串有幾個字元」這個數字讀出來，所以是屬性，不是方法。

### 為什麼原始值（primitive）字串也能「戴上」`.length`？—— Autoboxing

`"HelloWorld"` 本身是一個**原始值（primitive）**，理論上原始值不像物件一樣能掛屬性/方法。但 JS 引擎在你寫 `str1.length` 或呼叫 `str1.toUpperCase()` 的瞬間，會**暫時**把這個原始字串包成一個 `String` 包裝物件（跟 `new String("HelloWorld")` 產生的東西類似），這個臨時物件的 prototype 鏈上就有 `String.prototype.length` 這個屬性可以讀，讀完/呼叫完立刻把這個臨時包裝物件丟棄，`str1` 本身還是原始值不會被動到。這個「臨時包一層物件讓你能存取屬性/方法，用完就丟」的機制叫 **autoboxing（自動裝箱）**——不是「每個字串真的隨身戴著 `.length`」，而是每次存取時**現包現丟**。

## String.fromCharCode()

### 用途
將 **Unicode 碼點（數字）** 轉換為對應的 **字元**。

### 語法
```javascript
String.fromCharCode(num1, num2, ...)
```

### ASCII 碼對照表（常用）

| 碼點 | 字元 | 說明 |
|------|------|------|
| 65 | A | 大寫字母起始 |
| 66 | B | |
| 67 | C | |
| ... | ... | |
| 90 | Z | 大寫字母結束 |
| 97 | a | 小寫字母起始 |
| 98 | b | |
| ... | ... | |
| 122 | z | 小寫字母結束 |
| 48 | 0 | 數字起始 |
| 57 | 9 | 數字結束 |

### 實際案例

#### 產生區域名稱（A區、B區、C區...）
```typescript
// 來自 EventsCreateBoothSettingsPage.tsx
const handleAddArea = () => {
  // customAreas.length = 0 → 65 + 0 = 65 → 'A'
  // customAreas.length = 1 → 65 + 1 = 66 → 'B'
  // customAreas.length = 2 → 65 + 2 = 67 → 'C'
  const nextChar = String.fromCharCode(65 + customAreas.length)

  const newArea = {
    name: `${nextChar}區`,  // "A區", "B區", "C區"...
    // ...
  }
}
```

#### 執行過程
```
第 1 個區域：65 + 0 = 65 → String.fromCharCode(65) → "A" → "A區"
第 2 個區域：65 + 1 = 66 → String.fromCharCode(66) → "B" → "B區"
第 3 個區域：65 + 2 = 67 → String.fromCharCode(67) → "C" → "C區"
...
第 26 個區域：65 + 25 = 90 → String.fromCharCode(90) → "Z" → "Z區"
```

### 其他範例

```javascript
// 單個字元
String.fromCharCode(65)      // "A"
String.fromCharCode(97)      // "a"
String.fromCharCode(48)      // "0"

// 多個字元
String.fromCharCode(72, 105) // "Hi"

// 產生 A-Z 陣列
const letters = []
for (let i = 0; i < 26; i++) {
  letters.push(String.fromCharCode(65 + i))
}
// ['A', 'B', 'C', ..., 'Z']
```

### 反向操作：charCodeAt()

將字元轉換回碼點：
```javascript
'A'.charCodeAt(0)  // 65
'a'.charCodeAt(0)  // 97
'Z'.charCodeAt(0)  // 90
```

---

## 相關方法

| 方法 | 說明 | 範例 |
|------|------|------|
| `String.fromCharCode(n)` | 碼點 → 字元 | `String.fromCharCode(65)` → `"A"` |
| `str.charCodeAt(index)` | 字元 → 碼點 | `"A".charCodeAt(0)` → `65` |
| `String.fromCodePoint(n)` | 支援更大的 Unicode 範圍 | `String.fromCodePoint(128512)` → `"😀"` |
| `str.codePointAt(index)` | 取得完整 Unicode 碼點 | `"😀".codePointAt(0)` → `128512` |

---

## `String(i)`：數字轉字串（型別轉換函式，不是建構子）

> 出處：`JavaScript-practicing/smallest-divisible-digit-product.js`
> 相關：[[loops-and-increment-operators]]

```js
var smallestNumber = function (n, t) {
    for (let i = n; ; i++) {
        const digits = String(i).split('');
        const product = digits.reduce((acc, digit) => acc * Number(digit), 1);
        if (product % t === 0) {
            return i;
        }
    }
};
```

### `String(i)` 沒有固定長度

`i` 是迴圈計數器，每圈都在變，`String(i)` 把「當下這個整數」轉成字串，**長度 = 這個整數的位數**，不是固定 9：

```js
String(15)        // "15"，長度 2
String(100000000) // "100000000"，長度 9（只是剛好碰到 9 位數）
```

### 函式 vs 建構子：兩種完全不同的東西

沒加 `new` 時，`String(x)` 是**型別轉換函式**，回傳基本型別（primitive）字串：

```js
String(123)        // "123"，typeof 是 "string"  ← 練這個，實務常用
new String(123)     // String 物件，typeof 是 "object"，很少用、容易讓 === 比較出錯
```

### `i`（迴圈計數器）跟 `product`（位數乘積）是兩個不同的值，不會相等

實測 `smallestNumber(15, 3)` 的追蹤：

```
i=15  digits=['1','5']  product=5   5 % 3 = 2   （不整除，繼續往上數）
i=16  digits=['1','6']  product=6   6 % 3 = 0   （整除，return i）
RESULT: 16
```

`return i` 回傳的是 **16**（符合條件的整數本身），`product` 只是 **6**（拿來檢查整除用的中間值）——兩者用途不同，本來就不會相等。

常見誤寫：把驗證寫在 `return` 之後，會變成永遠跑不到的死碼（unreachable code）：

```js
if (product % t === 0) {
    return i;
    i === product; // ❌ return 之後這行永遠不會執行，而且單獨寫等號表達式也不會印出任何東西
}
```

要驗證兩者關係，應該在 `return` **之前**用 `console.log`：

```js
if (product % t === 0) {
    console.log(i === product); // false —— i 和 product 本來就不是同一個東西
    return i;
}
```

### 迴圈要不要加 `i <= 100` 當上限？

題目寫「`1 <= n <= 100`」，這是**呼叫函式時傳入的參數 `n` 的限制**，不是「答案 `i` 的搜尋上限」——兩者是不同的東西，不要混著寫進迴圈條件。

實測 `n=1~100`、`t=1~10` 全部 1000 種組合，`i` 從未超過 100（最大只需要往上多找 9 步：`n=1, t=10 → i=10`），所以就算加了 `i <= 100` 也巧合不會出錯，但**觀念上是不安全的**：迴圈的終止應該交給 `if` 裡的 `return`（找到答案才停），而不是硬性設定一個跟「答案」無關的外部上限；一旦哪天上限設錯或題目條件改變，迴圈跑完卻沒 `return`，函式會靜靜回傳 `undefined`，比無窮迴圈更難抓出來。

另外注意：`i <= 100` 內部語意是 **OR**（`i < 100 || i === 100`），不是 AND——`i < 100 且 i === 100` 是恆假的矛盾式，沒有數字能同時滿足兩者。

> **已查證（LeetCode 3345「Smallest Divisible Digit Product I」，Biweekly Contest 143 Q1）**：官方/社群解法（[doocs/leetcode](https://github.com/doocs/leetcode/blob/main/solution/3300-3399/3345.Smallest%20Divisible%20Digit%20Product%20I/README_EN.md)）用的正是同樣的無上限寫法 `for (int i = n;; ++i)`。題解說明：「每連續 10 個整數裡一定有一個位數乘積是 0（含數字 0 的那個），0 能被任何 t 整除」，所以最多找 9 步內必停——這跟本檔實測「最大搜尋距離 9」完全吻合。結論：`n <= 100` 只限制輸入 `n`，`i` 不需要、也不應該設上限。

### `i` 是「快進指標」嗎？——不是，這裡沒有陣列可以走訪

容易搞混的地方：`i` 看起來很像「指標」，但**快/慢指標的前提是有一個固定、有索引的集合**（陣列、字串、鏈結串列），而這支函式的輸入只有兩個數字 `n`、`t`，沒有任何陣列。

`i` 本身**就是被檢查的候選數字**，從 `n` 開始每輪 `+1`，屬於 **generate-and-test（生成並測試）** 樣式，跟「陣列走訪」是不同的模式。函式裡唯一真正的陣列是 `digits`（`String(i).split('')`），但走訪它的動作被包在 `.reduce()` 內部完成，內建了一個看不見、不用自己維護的索引，不需要另外寫 `for (let j = 0; ...)`。

### `.reduce((acc, digit) => acc * Number(digit), 1)` 語法拆解

```js
陣列.reduce(callback函式, initialValue)
```

| 部分 | 意思 |
|---|---|
| `acc` | 累加器（accumulator），上一輪算出來的結果，自動帶到下一輪 |
| `digit` | 目前處理的元素（陣列裡的一個字元字串，例如 `'4'`） |
| `1` | initialValue，第一輪呼叫時 `acc` 的起始值 |

以 `i=44`，`digits=['4','4']` 為例逐步展開：

| 輪次 | acc（進來） | digit | acc * Number(digit) | acc（出去） |
|---|---|---|---|---|
| 第1輪 | `1`（initialValue） | `'4'` | `1 * 4` | `4` |
| 第2輪 | `4` | `'4'` | `4 * 4` | `16` |

跑完陣列，`.reduce()` 回傳最後的 `acc = 16`，就是 `product`。

**initialValue 為什麼是 `1` 不是 `0`？** 這裡做的是連乘，乘法單位元素是 `1`；若誤寫成 `0`，第一輪 `acc` 就會歸零，之後乘什麼都是 `0`。（對比：連加場景 initialValue 才該用 `0`，因為加法單位元素是 `0`。）

> **修正／補充**：
> - 上面說「這支函式裡根本沒有陣列」講得不精確——`digits` 本身就是陣列，只是它是**函式內部自己造出來的**（`String(i).split('')`），不是外部傳進來的「輸入參數」。沒有陣列的是 `smallestNumber(n, t)` 的**參數列**。
> - `initialValue`（例中的 `1`）**不是 MDN 規定必填的**，是可省略的參數；省略時 `reduce` 會拿陣列第一個元素當 acc 起始值、從第二個元素開始跑，空陣列又沒給 initialValue 則會直接丟 `TypeError`。這裡選 `1` 純粹是程式作者利用「乘法單位元素是 1」這個數學性質做的選擇，不是語法要求。
> - `acc`／`digit` 是 callback 箭頭函式**自己的參數**，作用域只在該箭頭函式主體內——在外層（例如 `if` 區塊）`console.log(acc)` 會噴 `ReferenceError: acc is not defined`。完整說明與修正後寫法見 [[05-作用域-scope-global-function-block]] 新增的「考點三：Callback 函式的參數作用域」。

實測 `smallestNumber(44, 3)`：
```
i=44 → product=16 → 16%3=1（不整除）
i=45 → product=20 → 20%3=2（不整除）
i=46 → product=24 → 24%3=0 ✅ → return 46
```

### 常見誤寫：`Number(digits).reduce(...)`——對整個陣列做 `Number()` 會直接壞掉

```js
const digits = String(i).split(''); // 例如 i=86 → ['8','6']
const product = Number(digits).reduce((acc, digit) => acc * digit, 1); // ❌
```

實測 `smallestNumber(86, 7)`：

```
digits = ['8','6']
Number(digits) = NaN   （typeof 是 "number"，已經不是陣列了）
TypeError: Number(...).reduce is not a function
```

原因分兩層：
1. `Number(陣列)` **不是逐一轉換陣列裡每個元素**，而是先把整個陣列用 `.toString()` 接成一個字串（多元素會用逗號隔開，`['8','6']` → `"8,6"`），再對這個字串做 `Number(...)`。`"8,6"` 不是合法數字字串，所以結果是 `NaN`。
2. `Number(digits)` 執行完型別已經是 `number`（`NaN`），`.reduce()` 是 `Array.prototype` 的方法，數字身上沒有這個方法，所以直接 `TypeError`（精確講：是 **`NaN` 這個具體的值**身上沒有 `.reduce`，`typeof NaN` 仍然是 `"number"`）。

> **不用另外開檔案，直接複製貼進瀏覽器 F12 Console 就能自己跑一次看結果**：
> ```js
> const digits = ['8','6'];
> console.log('toString 結果:', digits.toString());   // "8,6"
> console.log('Number 轉換結果:', Number(digits));      // NaN
> console.log('typeof:', typeof Number(digits));        // "number"
> console.log('NaN.reduce 存在嗎:', typeof NaN.reduce);  // "undefined"
> // Number(digits).reduce(...)  ← 執行這行會噴 TypeError，可以自己也貼一次看錯誤訊息
> ```

正確寫法要在**陣列本身**（`digits`）上呼叫 `.reduce()`，把「字串轉數字」留給 callback 對**每一個字元單獨**處理（`Number(digit)`，或讓 `*` 運算子隱式轉型）：

```js
const product = digits.reduce((acc, digit) => acc * Number(digit), 1); // ✅
```

> **心法對照**：這個錯誤的本質是「在陣列層做了本該在元素層做的事」——跟 `JavaScript-practicing/array-of-objects-存取練習.html` 裡「外層是陣列 → 用陣列方式；拿出來的元素 → 用元素自己的方式」是同一套心法，只是那份練習的元素是物件（`.name`/`.age`），這裡的元素是字串（`Number(digit)`）。建議直接開 F12 對照著兩份一起練，同一個心法換不同的元素型別。

### `.toString()` vs `String()`：差在 null/undefined 會不會爆炸

| | `.toString()` | `String()` |
|---|---|---|
| 身份 | 值**自己身上的方法**，要用 `.` 呼叫 | **全域函式**，直接 `String(value)` 呼叫 |
| 對 `null`／`undefined` | ❌ 直接噴 `TypeError` | ✅ 安全，回傳 `"null"`／`"undefined"` |
| 其他情況 | 正常轉字串 | 結果通常跟 `.toString()` 完全一樣 |

```js
null.toString()       // ❌ TypeError: Cannot read properties of null
String(null)           // ✅ "null"
String([1,2]) === [1,2].toString()   // true，其他情況兩者結果相同
```

**為什麼差這麼多？完整原理見 [[15-ToPrimitive-ToNumber-型別轉換抽象操作]]**，這裡先講結論：`.toString()` 要先做「點屬性」這個動作，而 `null`/`undefined` 是唯二**不能被裝箱（autobox）**成物件的原始值，點屬性當場就丟 `TypeError`，連方法存不存在都還沒查到；`String()` 則是直接依照值的**型別**去查一張對照表（ToString 抽象操作），對 `Null`/`Undefined` 型別寫死了直接回傳字串常數，全程沒有做任何屬性存取，自然不會炸。

### `Array.prototype.toString()` 內部其實是呼叫 `.join()`

```js
[1,2,3].toString()            // "1,2,3"    ← 元素不用是字串，數字也一樣逗號接起來
[true,false,null].toString()  // "true,false," ← null/undefined 在 join 裡會變成空字串
```

實測證明：把陣列的 `join` 換成自訂函式，`toString()` 也會跟著變，證實兩者是同一套邏輯：

```js
const arr = [1,2,3];
arr.join = () => 'CUSTOM';
arr.toString(); // "CUSTOM"
```

### 單引號 vs 雙引號：JS 原始碼裡等價，但 JSON 規定死了只能雙引號

```js
'a' === "a"   // true，JS 原始碼裡純粹是風格選擇，不影響任何行為

JSON.parse("{'a':1}")   // ❌ 噴錯：JSON 不允許單引號
JSON.parse('{"a":1}')   // ✅ { a: 1 }
```

`JSON.stringify(['8','6'])` 印出 `["8","6"]`（雙引號），不是因為原始碼裡引號種類的關係——JS 內部不區分 `'a'`／`"a"` 是同一個字串值——而是因為 JSON **這個資料格式**（不是 JS 語法）規定字串只能用雙引號。

### 額外提醒：console 印出來的引號，有時不是字串本身的內容

```js
console.log(['8','6'].toString());  // 8,6   ← 沒有引號
```

如果不包 `console.log`，直接在 REPL 打 `['8','6'].toString()`，REPL 會用類似 `util.inspect()` 的方式自動顯示回傳值，這時才會多出一層引號（`'8,6'`）——那個引號是 REPL 為了讓你分辨「這是字串」而加的**顯示格式**，不是字串內容真的含有引號字元。
