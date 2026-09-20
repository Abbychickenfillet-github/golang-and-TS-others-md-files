---
title: 標準內建物件與全域物件 — MDN 十三大分類，以及 static vs instance 的唯一判準
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, global-objects, built-in, globalThis, static-method, instance-method, mdn]
aliases: [全域物件, Standard built-in objects, globalThis]
related:
  - "[[Object靜態方法vs原型方法-Symbol弱封裝與species]]"
  - "[[自動裝箱與內建建構函式-大寫Symbol與小寫sym]]"
  - "[[07-identifier-vs-property-var全域變數]]"
  - "[[全域變數的GC回收時機-Reachability與window生命週期]]"
  - "[[Object靜態方法速查]]"
sources:
  - https://gemini.google.com/app/dcd5205199bfbfc9
updated: 2026-09-17
---

# 標準內建物件與全域物件 — MDN 十三大分類，以及 static vs instance 的唯一判準

> 本篇重點 a–l，共 12 個。
> 主軸圖：本頁 HTML 版的「兩個盒子」流程圖（左盒＝類別本身掛的 static，右盒＝實體掛的 instance），後續同主題追問一律指回這張圖的某個盒子或某條箭頭。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | 「全域物件」到底指什麼 | 有兩個層面的意思，廣義指一整包標準內建物件，狹義指 `globalThis` 那一顆實體物件 | §1 |
| Q2 | `Map`、`Array`、`Function` 算全域物件嗎 | 算，它們屬於「建構子」這一類 | §2 |
| Q3 | 呼叫 instance method 一定要先寫 `new` 嗎 | 不用，字面值語法會幫你把實體建出來 | §3 |
| Q4 | 怎麼分辨 static 還是 instance | 只看點號左邊的主語是「類別」還是「已存在的實體」 | §3 |

---

## 1. 「全域物件」的兩個層面（a–c）

(a) <mark style="background: #ADCCFFA6;">廣義：標準內建物件（Standard built-in objects）</mark>。
	指 JavaScript 執行環境一啟動時，引擎就已經替你載入並建立好的那一整組工具。
	你不需要 `import`，也不需要 `require`，更不需要自己定義，就能在任何地方直接呼叫，例如 `Math.random()`、`JSON.stringify()`、`new Date()`、`parseInt("123")`。

(b) <mark style="background: #ADCCFFA6;">狹義：全域物件（The Global Object）</mark>。
	指環境中最頂層、包容一切全域變數與函式的那一顆實體物件。
	在瀏覽器環境它是 `window`，在 Node.js 環境它是 `global`，跨環境的統一寫法是 `globalThis`。
	全域作用域實際上就是由這顆全域物件的屬性所組成，所以 `var x = 1` 之後 `window.x` 讀得到（細節見 [[07-identifier-vs-property-var全域變數]]）。

(c) <mark style="background: #FFF3A3A6;">在全域作用域中，物件只有三個來源</mark>：引擎內建的標準內建物件、使用者自己撰寫的腳本所建立的、宿主環境（Host Application，例如瀏覽器或 Node.js）另外提供的（例如 `document`、`fetch`、`process`）。

---

## 2. MDN 的標準內建物件分類（d–f）

(d) MDN 依「功能」把標準內建物件分成十三大類，整理如下表。

| # | 分類 | 這一類在做什麼 | 代表成員 |
|---|---|---|---|
| 1 | 數值屬性 Value properties | 回傳單純數值，本身沒有屬性也沒有方法 | `globalThis`、`Infinity`、`NaN`、`undefined` |
| 2 | 函式屬性 Function properties | 直接呼叫就回傳結果的全域函式 | `parseInt()`、`parseFloat()`、`isNaN()`、`encodeURI()`、`eval()` |
| 3 | 基本物件 Fundamental objects | 語言最核心的基礎結構 | `Object`、`Function`、`Boolean`、`Symbol` |
| 4 | 錯誤物件 Error objects | 處理例外狀況 | `Error`、`TypeError`、`SyntaxError`、`RangeError` |
| 5 | 數字與日期 Numbers and dates | 數值計算與時間處理 | `Number`、`BigInt`、`Math`、`Date`、`Temporal` |
| 6 | 文字處理 Text processing | 字串與正則表達式 | `String`、`RegExp` |
| 7 | 索引集合 Indexed collections | 依索引排序的資料集合 | `Array`、各類 TypedArray（如 `Int32Array`） |
| 8 | 鍵控集合 Keyed collections | 依 key 存取、且保留插入順序的集合 | `Map`、`Set`、`WeakMap`、`WeakSet` |
| 9 | 結構化資料 Structured data | 二進位緩衝區與序列化 | `ArrayBuffer`、`SharedArrayBuffer`、`DataView`、`Atomics`、`JSON` |
| 10 | 記憶體管理 Memory management | 弱參考與回收通知 | `WeakRef`、`FinalizationRegistry` |
| 11 | 控制抽象物件 Control abstraction objects | 非同步與迭代的抽象層 | `Promise`、`Iterator`、`AsyncIterator`、`GeneratorFunction` |
| 12 | 反射 Reflection | Meta-programming（程式碼操作程式碼） | `Reflect`、`Proxy` |
| 13 | 國際化 Internationalization | 語系、貨幣、日期格式化 | `Intl` 及其相關模組 |

(e) <mark style="background: #FFF3A3A6;">從「能不能 new」再切一刀，上表可以壓成三種形狀</mark>：

| 形狀 | 特徵 | 例子 |
|---|---|---|
| 建構子 Constructor | 可以搭配 `new` 建立新實體，本身也是存在於全域作用域的物件 | `Array`、`Map`、`Set`、`Object`、`Function`、`Promise`、`Date` |
| 工具型物件 Namespace / Utility | 不能 `new`，本身就是一包靜態方法的集合 | `Math`、`JSON`、`Reflect`、`Atomics` |
| 全域函式與數值 | 直接呼叫或直接讀取，沒有 `.` 前面的類別 | `parseInt()`、`isNaN()`、`Infinity`、`NaN` |

(f) <mark style="background: #FF5582A6;">⚠️ 存疑／更正</mark>：Gemini 在對話中把分類講成「十二大類」，並且把 `Reflect` 排在第 11、`Intl` 排在第 12。
	對照 MDN 現行的 Standard built-in objects 目錄，實際是 **十三類**，遺漏的是「鍵控集合 Keyed collections」與「記憶體管理 Memory management」。
	上表已依 MDN 原文補回並重新編號。

---

## 3. static 還是 instance，只看主語（g–j）

(g) <mark style="background: #FF5582A6;">常見誤解：以為「有寫 new 才算實體方法」</mark>。
	不對。判準不是有沒有 `new`，而是**點號左邊的主語是誰**。

(h) <mark style="background: #BBFABBA6;">正確判準</mark>：

| 種類 | 呼叫形狀 | 主語是 | 例子 |
|---|---|---|---|
| 靜態方法 Static Method | `類別名稱.方法()` | 類別／建構子本身 | `Array.isArray([1,2])`、`Object.keys(obj)`、`Array.from("123")` |
| 實體方法 Instance Method | `實體物件.方法()` | 已經被建立出來的具體資料 | `[1,2].includes(1)`、`myMap.get('key')`、`str.toUpperCase()` |

(i) <mark style="background: #FFF3A3A6;">字面值（Literals）會自動幫你實體化，所以你不用寫 `new` 也能呼叫實體方法</mark>。

```js
// 陣列：引擎在底層幫你建出 Array 實體
const list = [1, 2, 3];   // 相當於 new Array(1, 2, 3)
list.push(4);             // push 是實體方法，主語是 list

// 字串：原始型別在取方法時會被暫時包裝成 String 物件（自動裝箱）
const str = "hello";
str.toUpperCase();        // toUpperCase 是實體方法，主語是 str

// 物件
const obj = { a: 1 };
obj.hasOwnProperty('a');  // hasOwnProperty 是實體方法，主語是 obj
```

	自動裝箱的完整機制寫在 [[自動裝箱與內建建構函式-大寫Symbol與小寫sym]]。

(j) <mark style="background: #BBFABBA6;">靜態工廠方法會回傳一個新實體，接著就能串實體方法</mark>，這是兩者最常一起出現的地方。

```js
const arr = Array.from("123");     // Array.from 是靜態方法，主語是 Array，產物是一個新陣列實體
const doubled = arr.map(x => x * 2); // map 是實體方法，主語是 arr（上一行的產物）
```

	讀法是「`Array` 這個類別用 `from` 把字串攤成陣列實體 → 把實體交給 `arr` → `arr` 再用自己的 `map` 逐格轉換」。

---

## 4. 一句話總結（k–l）

(k) 全域物件＝廣義的「引擎已經幫你擺好的一整櫃工具」＋狹義的「裝著這一櫃工具的那個櫃子本身（`globalThis`）」。

(l) 看到 `X.y()` 時，先問「`X` 是類別還是資料」，答案就決定它是 static 還是 instance，`new` 只是實體的其中一種生產方式，不是判準。

---

## 關聯筆記（附關聯原因）

- [[Object靜態方法vs原型方法-Symbol弱封裝與species]]
	**理由**：本篇 §3 給的是「怎麼分辨」的判準，那篇給的是「為什麼 JS 要把方法拆到兩個地方掛」的原型層原因，判準＋原因合看才不會只會背。
- [[自動裝箱與內建建構函式-大寫Symbol與小寫sym]]
	**理由**：本篇 (i) 說字串字面值也能呼叫實體方法，背後就是那篇講的自動裝箱（Primitive Wrapper）。
- [[07-identifier-vs-property-var全域變數]]
	**理由**：本篇 (b) 說「全域作用域由全域物件的屬性組成」，那篇拆解的正是 identifier 與 property 的分界。
- [[全域變數的GC回收時機-Reachability與window生命週期]]
	**理由**：掛在 `window` 上的東西什麼時候會被回收，是本篇 (b) 的直接延伸。
- [[Object靜態方法速查]]
	**理由**：本篇 §3 表格的 static 例子（`Object.keys`、`Object.entries`）在那篇有完整清單。

---

## 🔗 相關練習題

| 題目 | 連結 | 為什麼放這裡 |
|---|---|---|
| LeetCode 2620. Counter | https://leetcode.com/problems/counter/ | 用閉包回傳函式，練「主語是誰」的直覺 |
| LeetCode 2727. Is Object Empty | https://leetcode.com/problems/is-object-empty/ | 直接考 `Object.keys` 這個靜態方法的用法 |
| LeetCode 2634. Filter Elements from Array | https://leetcode.com/problems/filter-elements-from-array/ | 手刻 `filter`，對照實體方法掛在 `Array.prototype` 上 |

---

## 各對話來源（原文）

### JavaScript 全域物件解析與分類（2026-09-17 擷取）— https://gemini.google.com/app/dcd5205199bfbfc9

**使用者：** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects 幫我翻譯這篇文章，何謂他的全域物件？

**Gemini：** 在 JavaScript 中「全域物件」通常有兩種層面的涵義。廣義是全域作用域中隨處可用的內建資源（Standard Built-in Objects），這就是 MDN 這篇文章主要介紹的內容，當 JavaScript 執行環境啟動時引擎就已經自動載入並建立好這些工具，不需要透過 `import` 或 `require` 引入，例如 `Math.random()`、`JSON.stringify()`、`new Date()`、`parseInt("123")`。狹義是環境頂層的實體物件（The Global Object），在瀏覽器環境中這個物件是 `window`，可以使用 `this` 或 `globalThis` 存取，全域作用域實際上是由全域物件的屬性所組成。在全域作用域中，除了內建物件之外，其他物件要麼是由使用者撰寫的腳本建立，要麼是由宿主環境（Host Application，例如瀏覽器或 Node.js）提供。接著列出 MDN 的標準內建物件分類概覽：數值屬性、函式屬性、基本物件、錯誤物件、數字與日期、文字處理、索引集合、結構化資料、控制抽象物件、反射、國際化等。

**使用者：** 「全域物件（Standard built-in objects / Global objects）：指存在於全域作用域中的內建物件與建構子。」這個是指像 Map 還有 Array 還有 function 這樣嗎？

**Gemini：** 是的，完全正確。你舉的 `Map`、`Array` 還有 `Function`，全都是這裡所說的「標準內建物件／建構子」。詳細來說它們屬於幾種常見的類型：（1）建構子（Constructor Functions / Classes），例如 `Array`、`Map`、`Set`、`Object`、`Function`、`Promise`、`Date`，特點是可以搭配 `new` 來建立新的實體，它們本身也是存在於全域作用域中的物件。（2）工具型物件（Namespace / Utility Objects），例如 `Math`、`JSON`、`Reflect`、`Atomics`，特點是不能用 `new` 建立實體，但它們本身是包含了許多靜態方法的全域物件。（3）全域函式（Global Functions），例如 `parseInt()`、`parseFloat()`、`isNaN()`、`encodeURI()`，直接呼叫就能使用。（4）全域數值屬性（Global Value Properties）。

**使用者：** 難道動態方法需要寫 new 嗎？

**Gemini：** 不一定需要顯式寫出 `new`，但關鍵在於「必須先有物件實體（Instance）」。在 JavaScript 中，物件實體的建立方式不只有 `new` 關鍵字，語言提供了許多字面值（Literals）語法糖或工廠函式（Factory Functions），它們背後會自動幫你建立物件實體。（1）透過字面值建立實體（最常見，不用寫 new）：陣列 `const list = [1,2,3]` 底層相當於 `new Array(1,2,3)`，`list.push(4)` 是實體方法可直接呼叫；字串 `const str = "hello"` 底層會自動進行 Primitive Wrapper 的處理，`str.toUpperCase()` 是實體方法；物件 `const obj = { a: 1 }`，`obj.hasOwnProperty('a')` 是實體方法。（2）透過靜態工廠方法建立實體後呼叫：`Array.from()` 是靜態方法回傳一個新的 Array 實體，`map()` 是實體方法作用在產生的陣列實體上。核心差異在於呼叫者是「類別」還是「實體」：看一個方法是靜態還是實體，不是看你有沒有寫 `new`，而是看主語（點號前面）是誰。靜態方法是 `類別 / 建構子名稱.方法()`，例如 `Array.isArray([1, 2])`、`Object.keys(obj)`，主語是 `Array` 或 `Object` 這個全域類別本身。實體方法是 `實體物件.方法()`，例如 `[1, 2].includes(1)`、`myMap.get('key')`，主語是某個已經被建立出來的具體資料。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話 | https://gemini.google.com/app/dcd5205199bfbfc9 | Gemini Flash，2026-09-17 擷取 |
| MDN — Standard built-in objects（十三大分類原文） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects | MDN 現行版本，2026-09-17 查證 |
| MDN — globalThis | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis | MDN 現行版本，2026-09-17 查證 |
| MDN — Object.keys()（static 方法代表） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys | MDN 現行版本，2026-09-17 查證 |
| ECMA-262 — The Global Object | https://tc39.es/ecma262/#sec-global-object | ECMAScript 現行草案，2026-09-17 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-17
