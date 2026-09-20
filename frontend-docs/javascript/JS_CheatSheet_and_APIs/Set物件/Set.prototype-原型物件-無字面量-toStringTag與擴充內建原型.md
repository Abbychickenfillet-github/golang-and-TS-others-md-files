---
title: "Set.prototype：原型物件、沒有 Set 字面量、Symbol.toStringTag 與擴充內建原型"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, set, prototype, symbol, toStringTag, monkey-patching, 原型鏈]
sources:
  - https://gemini.google.com/app/f9be0d865a7ea277
  - https://gemini.google.com/app/0dded9027c84d1e3
  - https://gemini.google.com/app/250341b76f12e017
updated: 2026-09-18
---

# Set.prototype：原型物件、沒有 Set 字面量、Symbol.toStringTag 與擴充內建原型

> [!info] 本篇重點 a–v，共 22 個
> 這篇把三場 Gemini 對話併成一條主線：MDN 那句 <mark style="background: #ADCCFFA6;">Represents the prototype for the Set constructor. Allows the addition of properties to all Set objects.</mark> 到底在講什麼 → 為什麼 JS 沒有 Set 字面量 → `Set.prototype` 自己也是個物件，它的原型是誰 → 為什麼 `Symbol.toStringTag` 的說明要扯到 `Object.prototype.toString()` → 最後收在「幫內建原型加方法」這件事該不該做。

> [!info] 與其他筆記的關聯（附理由）
> a. 承接 [[函式的兩條線-prototype屬性與Prototype原型]]：那篇講「建構函式身上的 `prototype` 屬性」與「實例身上的 `[[Prototype]]` 原型」是兩條不同的線，本篇就是拿 `Set` 當唯一的例子把那兩條線走一遍。
> b. 承接 [[Symbol-符號型別與物件key]]：那篇講「key 只能是 string 或 symbol」，本篇的 `Symbol.toStringTag` 正是「用 well-known symbol 當 key」的實際案例。
> c. 呼應 [[Object靜態方法vs原型方法-Symbol弱封裝與species]]：那篇最後講 `Symbol.species`，而 `Set` 的 static property 恰好就只有 `[Symbol.species]` 一個，兩篇可以直接對照著看。
> d. 對照 [[Map.prototype完整清單-實例方法與存取器]]：`Map` 與 `Set` 是同一批 keyed collection，原型結構完全同構，那篇列方法清單、本篇講原型機制。
> e. 對照 [[標準內建物件與全域物件-MDN十三大分類與static-vs-instance判準]]：本篇 n 節的「static vs instance 判準」就是那篇判準表在 `Set` 身上的套用。
> f. 呼應 [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]]：本篇 s 節講 monkey patching 會被 `for...in` 撈到，解法是 `enumerable: false`，那篇是完整的列舉涵蓋範圍矩陣。

![[學習JS_圖解_Set原型鏈與toStringTag查找_2026-09-18.svg]]

---

## 1. `Set.prototype` 到底是什麼（a–e）

> [!important]+ 一句話：<mark style="background: #BBFABBA6;">`Set.prototype` 是一個**普通物件**，它是所有 `new Set()` 產出的實例共用的那一份「母版」。</mark>

- (a) <mark style="background: #ADCCFFA6;">`Set` 是建構函式（function），`Set.prototype` 是掛在它身上的一個屬性，值是一個物件。</mark>
	- `typeof Set` 得到 `"function"`，`typeof Set.prototype` 得到 `"object"`。
- (b) 每次執行 `new Set()`，引擎會建一個新的實例，並把這個實例的 `[[Prototype]]` 內部欄位指向 `Set.prototype`。
	- 所以 `Object.getPrototypeOf(new Set()) === Set.prototype` 是 `true`。
- (c) `.add()`、`.has()`、`.delete()`、`.size` 這些**都不在實例身上**，它們住在 `Set.prototype` 上。
	- 你呼叫 `mySet.add(1)` 時，引擎在 `mySet` 自己身上找不到 `add`，就沿著 `[[Prototype]]` 往上一階找到 `Set.prototype.add`，再以 `this = mySet` 呼叫它。
- (d) ★ MDN 那句 <mark style="background: #FFF3A3A6;">Allows the addition of properties to all Set objects</mark> 的意思是：<mark style="background: #BBFABBA6;">只要你往 `Set.prototype` 上塞一個屬性或方法，**所有已經建好的、以及未來才建的** Set 實例都立刻拿得到。</mark>
	- 關鍵是**查找是動態的**，不是建立實例時把方法複製一份給它。所以「先建實例、後補方法」也照樣生效。
- (e) `Set.prototype` 自己也是物件，所以它自己也有原型：<mark style="background: #ADCCFFA6;">`Object.getPrototypeOf(Set.prototype) === Object.prototype`</mark>。
	- 完整鏈是 `mySet` → `Set.prototype` → `Object.prototype` → `null`，共三階。

```js
const mySet = new Set([1, 2, 3]);

// 1. 實例的原型是 Set.prototype
Object.getPrototypeOf(mySet) === Set.prototype;        // true

// 2. Set.prototype 的原型是 Object.prototype
Object.getPrototypeOf(Set.prototype) === Object.prototype; // true

// 3. 再往上就是 null，鏈到頂了
Object.getPrototypeOf(Object.prototype);                // null

// 4. 「後補的方法」舊實例也吃得到 —— 這就是 (d) 那句話的意思
Set.prototype.isEmpty = function () { return this.size === 0; };
mySet.isEmpty();                                        // false（mySet 比這個方法早出生）
```

---

## 2. JavaScript 沒有 Set 字面量（f–i）

- (f) <mark style="background: #BBFABBA6;">Abby 的判斷是對的：JavaScript 確實沒有 set literal。</mark>
- (g) JS 只保留了兩種集合類字面量：`{}` 是**物件字面量**，`[]` 是**陣列字面量**。
	- `{1, 2, 3}` 在 JS 裡不是集合，而是 `SyntaxError`，因為 `{` 開頭會被當成物件字面量或區塊，裡面必須是 `key: value`。
- (h) Python 才有 set literal（`{1, 2, 3}`），所以從 Python 過來的人最容易在這裡卡住。
- (i) <mark style="background: #FF5582A6;">建立 Set 的唯一途徑是建構函式 `new Set(iterable)`，而且 `new` 不能省略</mark>（省略會丟 `TypeError: Constructor Set requires 'new'`）。

| 型別 | 有字面量嗎 | 寫法 | 備註 |
|---|---|---|---|
| Object | 有 | `{ a: 1 }` | `{}` 已經被物件佔走了 |
| Array | 有 | `[1, 2, 3]` | |
| Set | 沒有 | `new Set([1, 2, 3])` | 參數吃的是任何 iterable |
| Map | 沒有 | `new Map([['a', 1]])` | 參數吃的是 entries 陣列 |
| RegExp | 有 | `/ab+c/` | 少數同時有字面量與建構函式的型別 |

---

## 3. `Symbol.toStringTag`：為什麼講它要扯到 `Object.prototype.toString()`（j–n）

> [!question]+ Abby 的原問題：<mark style="background: #FFF3A3A6;">「這邊為何要提及 Set 的原型是物件？」</mark>
> 因為 `Symbol.toStringTag` 這個機制**同時用到原型鏈的兩端**：`toString` 這個方法是從 `Object.prototype` 繼承下來的，而標籤 `"Set"` 是掛在 `Set.prototype` 上的。少講任何一端，這句 MDN 都讀不通。

- (j) `typeof` 對所有物件一律回傳 `"object"`，<mark style="background: #FF5582A6;">它分不出 Set、Map、Array、Date 的差別</mark>。
- (k) 所以要精準辨型時，老派做法是呼叫 `Object.prototype.toString.call(x)`，拿到 `"[object Xxx]"` 這種字串。
- (l) `Object.prototype.toString()` 的內部流程是：<mark style="background: #ADCCFFA6;">先做幾個特例判斷（null、undefined、array、function 等）→ 再沿著原型鏈讀 `x[Symbol.toStringTag]` → 讀到字串就拿它當標籤，讀不到就退回 `"Object"`</mark>。
- (m) ★ `Set.prototype[Symbol.toStringTag]` 的初始值被規格訂為字串 `"Set"`，屬性特性是 `writable: false, enumerable: false, configurable: true`。
	- 所以 `Object.prototype.toString.call(new Set())` 會回 `"[object Set]"`。
	- 這個標籤是**掛在 `Set.prototype` 上**，不是掛在實例上，實例是**繼承**到它的——這就是 (e) 那條鏈在這裡兌現的地方。
- (n) 自己寫的 class 也能設這個標籤，`Object.prototype.toString` 一樣會讀到。

```js
const s = new Set([1, 2]);

typeof s;                                   // "object"  ← 分不出來
Object.prototype.toString.call(s);          // "[object Set]"

// 標籤住在 Set.prototype 上，實例只是繼承
Object.hasOwn(s, Symbol.toStringTag);              // false
Object.hasOwn(Set.prototype, Symbol.toStringTag);  // true
Set.prototype[Symbol.toStringTag];                 // "Set"

// 自訂 class 也可以自報家門
class Wallet {
  get [Symbol.toStringTag]() { return "Wallet"; }
}
Object.prototype.toString.call(new Wallet());      // "[object Wallet]"
```

> [!tip]+ 兩次原型鏈查找，方向相反
> 第一次往上：`s` 身上沒有 `toString` → `Set.prototype` 上也沒有 → 走到 `Object.prototype.toString`，**找到方法**。
> 第二次往上：進到方法內部後，它讀 `this[Symbol.toStringTag]`，`s` 身上沒有 → `Set.prototype` 上有，值是 `"Set"`，**找到標籤**。
> 兩次查找起點都是實例，但一次停在 `Object.prototype`、一次停在 `Set.prototype`，這正是「Set 的原型是物件」這件事必須先講清楚的原因。

---

## 4. 幫物件加自訂方法的四種做法（o–r）

> 這是 Abby 問「任何的物件都可以自訂方法嗎」的完整回答。用途不同，選法也不同。

| 做法 | 語法 | 影響範圍 | 什麼時候用 |
|---|---|---|---|
| 直接掛在單一實例 | `user.sayHi = function () {}` | 只有這一個物件 | 一次性、臨時的 |
| class 方法 | `class Dog { bark() {} }` | 該 class 的所有實例（方法住在 `Dog.prototype`） | 現代預設做法 |
| 擴充內建原型 | `Array.prototype.first = function () {}` | 全域所有 Array 實例 | 幾乎都不該用，見第 5 節 |
| `Object.defineProperty` | `Object.defineProperty(cat, "meow", { value, enumerable: false })` | 指定的那個物件 | 需要控制 writable / enumerable / configurable 時 |

- (o) <mark style="background: #ADCCFFA6;">class 的方法不會被複製到每個實例身上，它們統一住在 `Dog.prototype`</mark>，所以 class 其實就是第三種做法的語法糖，只是它不去污染內建物件。
- (p) `Object.defineProperty` 的價值在於<mark style="background: #FFF3A3A6;">預設三個特性全是 `false`</mark>，你可以造出「存在但不可列舉」的方法，`for...in` 與 `Object.keys()` 都看不到它。
- (q) ⚠️ 例外一：`Object.create(null)` 造出的物件**沒有原型**，它繼承不到 `Object.prototype` 的任何方法（連 `toString` 都沒有），但你仍然可以直接往它身上掛方法。
- (r) ⚠️ 例外二：<mark style="background: #FF5582A6;">原始型別（number、string、boolean）不是物件，賦值新增屬性不會生效</mark>。
	- `(123).myFunc = f` 在非嚴格模式下靜默失敗，在嚴格模式下丟 `TypeError`。
	- 原因是自動裝箱產生的包裝物件用完即丟，詳見 [[自動裝箱與內建建構函式-大寫Symbol與小寫sym]]。
	- 要擴充就得改包裝物件的原型，例如 `String.prototype.xxx`——但這又回到第 5 節的雷區。
- 補一個 Gemini 沒提的例外：`Object.freeze(obj)` 之後就加不了新方法了，`Object.seal(obj)` 也不行（`seal` 只擋新增與刪除，既有屬性還能改值）。

---

## 5. ⚠️ 為什麼「擴充內建原型」是紅色警告（s–v）

> [!danger]+ <mark style="background: #FF5582A6;">語法上做得到，工程上不要做。</mark>這個行為有個專有名詞叫 **monkey patching**。

- (s) <mark style="background: #FF5582A6;">直接賦值加上去的屬性是可列舉的（`enumerable: true`）</mark>，`for...in` 會把它一起撈出來，遍歷陣列或物件時就會冒出你沒預期的 key。
	- 若真的非加不可，一定要用 `Object.defineProperty(Array.prototype, "first", { value: f, enumerable: false })`。
- (t) ★ 撞名會讓別人的網站整個掛掉，而且**歷史上真的發生過**：
	- TC39 原本要把陣列攤平的方法命名為 `Array.prototype.flatten`，但 MooTools 這個老函式庫早就自己 patch 了同名方法，瀏覽器一上線就讓一票網站爆掉。
	- 最後規格把名字改成 `Array.prototype.flat` 來閃開，這件事被叫做 **SmooshGate**（2018）。
- (u) 引擎最佳化會失效：V8 會為「沒被動過的內建原型」走快速路徑，一旦你改了 `Set.prototype`，相關的 Inline Cache 與 ValidityCell 會被作廢。原理見 [[原型與引擎最佳化-Shape-InlineCache-ValidityCell]]。
- (v) <mark style="background: #BBFABBA6;">現代替代方案：寫成普通函式 `first(arr)`、寫成工具模組、或用 `class MySet extends Set` 繼承出自己的子類別</mark>，都不會動到全域。

> [!note]+ 順帶一提：現在 Set 已經有原生的集合運算了，不用自己 patch
> `union()`、`intersection()`、`difference()`、`symmetricDifference()`、`isSubsetOf()`、`isSupersetOf()`、`isDisjointFrom()` 七個方法自 **2024 年 6 月**起成為 Baseline 2024（Chrome / Edge / Firefox / Safari 皆支援）。
> 它們接受任何 **set-like** 物件當參數（只要有 `size` 屬性、`has()` 方法、`keys()` 方法），但 `this` 必須是真正的 `Set` 實例。

```js
const evens = new Set([2, 4, 6, 8]);
const squares = new Set([1, 4, 9]);
evens.union(squares);          // Set(6) { 2, 4, 6, 8, 1, 9 }
evens.intersection(squares);   // Set(1) { 4 }
```

---

## 6. ⚠️ 存疑／更正（Gemini 講錯的地方）

| Gemini 原文 | 問題 | 正確寫法 |
|---|---|---|
| `console.typeof(Set.prototype); // "object"` | <mark style="background: #FF5582A6;">`console.typeof` 這個 API 不存在</mark>，`typeof` 是運算子不是方法，這行會丟 `TypeError: console.typeof is not a function` | `typeof Set.prototype` 或 `console.log(typeof Set.prototype)` |
| 「幾乎所有物件都可以自訂方法」 | 講得太滿，漏了兩個常見情況 | 要補上 `Object.freeze()` 與 `Object.seal()` 之後不能再新增屬性 |
| 四種做法只列語法，沒有標風險 | <mark style="background: #FF5582A6;">把「擴充內建原型」跟其他三種平行並列，會讓人以為它是正常選項</mark> | 它是 monkey patching，正式專案應避免，理由見第 5 節 |

---

## 對應題目練習

- [LeetCode 2634. Filter Elements from Array](https://leetcode.com/problems/filter-elements-from-array/) — 練習「自己實作一個內建方法」而不去 patch `Array.prototype`
- [LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/) — 直球考 `Symbol.toPrimitive` 與 `toString`，跟本篇的 `Symbol.toStringTag` 是同一批 well-known symbol
- [LeetCode 2618. Check if Object Instance of Class](https://leetcode.com/problems/check-if-object-instance-of-class/) — 逼你手走一次原型鏈，正好驗收第 1 節
- [LeetCode 349. Intersection of Two Arrays](https://leetcode.com/problems/intersection-of-two-arrays/) — 用 `Set` 解最漂亮，可順手比較「自己寫迴圈」與「用 `intersection()`」

---

## 各對話來源（原文摘要）

### Set.prototype 意義解析（2026-09）— https://gemini.google.com/app/f9be0d865a7ea277

**使用者：** 說明一下 Represents the prototype for the Set constructor. Allows the addition of properties to all Set objects. 最後一句話是什麼意思

**Gemini：** 意思是允許為所有的 Set 物件實體新增屬性或方法。`Set.prototype` 是所有透過 `new Set()` 建立出來的物件所共用的母版，在它上面新增屬性或方法時，所有現有的以及未來建立的 Set 物件都可以直接存取。範例是 `Set.prototype.isEmpty = function () { return this.size === 0; }`。

**使用者：** 任何的物件都可以自訂方法嗎 可以的話列舉出來

**Gemini：** 列出四種做法——直接為單一實例新增、透過 class 定義、透過原型擴充內建物件、透過 `Object.defineProperty` 或 `Object.assign`。並補充兩個例外：`Object.create(null)` 造出的無原型物件，以及原始型別不能直接被賦值加屬性。

**使用者：** 我有打錯嗎 為什麼不能編譯

**Gemini：** `class Dog { ... }` 漏掉最外層的閉合大括號 `}`，引擎以為 class 還沒結束，讀到下方 `const myDog` 時丟 `Uncaught SyntaxError`。並提醒在 DevTools Console 輸入多行程式碼時可以用 `Shift + Enter` 換行。

### JavaScript Set 原型與字面量說明（2026-09）— https://gemini.google.com/app/0dded9027c84d1e3

**使用者：** 他說他已經代表 Set 的原型了對嗎 是沒有 set literals 的意思嗎

**Gemini：** 是的，`Set.prototype` 本身就是 Set 的原型。關於 Set literals 的理解也完全正確——JavaScript 沒有 Set 字面量語法，`{}` 是物件、`[]` 是陣列，要建立 Set 只能透過 `new Set([1, 2, 3])`。

**使用者：** 他的原型會是物件嗎 object

**Gemini：** 是的，`Set.prototype` 本身就是一個物件，它的原型指向 `Object.prototype`。（⚠️ 此處 Gemini 寫成 `console.typeof(...)`，語法錯誤，見第 6 節。）

### 理解 Symbol.toStringTag 與 Set 原型（2026-09）— https://gemini.google.com/app/250341b76f12e017

**使用者：** 說明一下 The initial value of the Symbol.toStringTag property is the string "Set". This property is used in Object.prototype.toString(). 這邊為何要提及 Set 的原型是物件

**Gemini：** 三個原因——① Set 實體繼承自 `Object.prototype`，呼叫 `Object.prototype.toString.call(new Set())` 時會沿原型鏈找到 `toString`；② `typeof` 只會得到籠統的 `"object"`，無法辨識 Set；③ `Object.prototype.toString()` 內部會去讀該物件或其原型上的 `Symbol.toStringTag`，因為 `Set.prototype[Symbol.toStringTag]` 預設是 `"Set"`，所以回傳 `"[object Set]"`。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Set 總覽與 set-like 物件定義 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set | MDN，2026-09-18 查證 |
| Set.prototype.union 與 Baseline 2024 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/union | MDN，頁面最後修改 2026-09-01，2026-09-18 查證 |
| Symbol.toStringTag 定義與自訂標籤 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag | MDN，2026-09-18 查證 |
| Object.prototype.toString 的內部流程 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString | MDN，2026-09-18 查證 |
| 規範原文 Set.prototype.union | https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set.prototype.union | ECMA-262（草案標示 ES2027），2026-09-18 查證 |
| Object.create(null) 無原型物件 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create | MDN，2026-09-18 查證 |
| SmooshGate（flatten 改名 flat 的始末） | https://developer.chrome.com/blog/smooshgate | Chrome for Developers，原文 2018，2026-09-18 查證 |
