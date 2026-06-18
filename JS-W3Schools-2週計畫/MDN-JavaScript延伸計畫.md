# MDN JavaScript 完整延伸計畫

> 搭配 [[讀書計畫]]（W3Schools 14 天）一起用。
> 來源：[MDN JavaScript Guide](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Guide) ＋ [MDN JavaScript Reference](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference)

## 🆚 W3Schools vs MDN（為什麼兩個都讀）
- **W3Schools**：簡單、有 Try-it、快速入門。適合「先會用」。
- **MDN**：權威官方文件、解釋深、把「為什麼」講清楚（規格層級）。適合「真懂、面試深度、查 API 標準行為」。
- **建議用法**：先用 W3Schools 那 14 天把概念跑過一遍（會用），再用這份 MDN 計畫做「第二遍深讀」，把每個主題挖深。

---

## 📚 Part 1：MDN Guide 深讀（對照 W3Schools 14 天）

> 每天讀完 W3Schools 對應主題後，再讀這裡的 MDN 頁面把它「讀深」。MDN Guide 是一條完整的學習主線。

| W3S Day | MDN Guide 對應頁面 | 讀深重點 |
|---|---|---|
| Day 1 基礎/變數 | [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) | 宣告、變數作用域、hoisting、資料型別、字面值 |
| Day 2 運算子 | [Expressions and operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators) | 賦值、比較、算術、位元、邏輯、三元、運算子優先序 |
| Day 3 條件 | [Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) | if/else、switch、**try/catch/throw、Error 物件** |
| Day 4 迴圈 | [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) | for、while、do…while、break/continue、for…in vs for…of |
| Day 5 字串 | [Numbers and strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_strings) | 字串、樣板字面值、字串方法 |
| Day 6 數字/Math | [Numbers and strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_strings) | Number、Math、BigInt、進位、浮點 |
| Day 7 函式 | [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) | 定義/呼叫、**作用域與閉包 closure**、參數/arguments、箭頭函式 |
| Day 8-9 陣列 | [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections) | Array 全方法、稀疏陣列、typed arrays 入門 |
| Day 10 物件 | [Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects) | 物件、屬性、方法、**this**、getter/setter |
| Day 11 作用域/Hoisting | [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#function_scopes) ＋ [語言總覽](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Language_overview) | closure、作用域鏈、TDZ |
| Day 12 Set/Map | [Keyed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections) | Map/Set/WeakMap/WeakSet 差異與用途 |
| Day 13 型別/日期/RegExp | [Representing dates & times](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Representing_dates_times) ＋ [Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) | Date、正則完整語法 |
| Day 14 OOP/JSON | [Using classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes) ＋ [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON) | class、繼承、static、JSON 標準行為 |

---

## 🚀 Part 2：MDN 進階主題（W3Schools 沒有或太淺，排 6 天補上）

> 這幾個是「資深 / 面試會被問」的核心，W3Schools 教得很淺，務必用 MDN 補。

- [ ] **Day 15 — 原型與繼承**：[Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
  重點：`__proto__` vs `prototype`、原型鏈、class 只是語法糖。
- [ ] **Day 16 — 非同步：Promise**：[Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
  重點：Promise 狀態、`.then/.catch/.finally`、鏈接、`Promise.all/race/allSettled`。
- [ ] **Day 17 — async/await ＋ 事件迴圈**：[async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) ＋ [Event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
  重點：async/await、microtask vs macrotask、為什麼 setTimeout(0) 不是馬上。
- [ ] **Day 18 — Iterators & Generators**：[Iterators and generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
  重點：iterable 協定、`Symbol.iterator`、`function*`、`yield`。
- [ ] **Day 19 — Modules**：[JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
  重點：`import/export`、預設 vs 具名匯出、動態 import、跟 CommonJS 差異。
- [ ] **Day 20 — Metaprogramming ＋ 記憶體**：[Meta programming (Proxy/Reflect)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) ＋ [Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management)
  重點：Proxy/Reflect、垃圾回收、記憶體洩漏常見原因。

> 進階補充（有餘力再讀）：[Typed arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays)、[Internationalization (Intl)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Internationalization)、[Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)。

---

## 📑 Part 3：MDN Reference 系統化掃描（內建物件查得到、用得熟）

> Reference 不是拿來「從頭讀到尾」的，而是「每個內建物件都認識、會查」。把下面當清單，每個點進去看一次「有哪些方法 / 常用方法」，做過 1-2 個範例就打勾。

**核心內建物件**
- [ ] [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)（map/filter/reduce/find/flat/…）
- [ ] [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)（keys/values/entries/assign/freeze/…）
- [ ] [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
- [ ] [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) ＋ [Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)
- [ ] [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [ ] [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) ＋ [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [ ] [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [ ] [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [ ] [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- [ ] [Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
- [ ] [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) ＋ [Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect)

**語言參考（分類掃過）**
- [ ] [Expressions & operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators)
- [ ] [Statements & declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements)
- [ ] [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions)
- [ ] [Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [ ] [Errors 一覽](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors)

---

## 🗓️ 怎麼排進時間
- **方案 A（推薦）**：先跑完 W3Schools 14 天（會用）→ 再花 ~14 天用 Part 1 重讀深化 + Part 2 的 6 天進階 → Reference 當持續查閱。
- **方案 B（同步）**：每天同主題「先 W3Schools 後 MDN」一次讀深，天數不變但每天加 20-30 分鐘。

## 🔗 相關
- [[讀書計畫]]、[[考題]]（W3Schools 14 天）
- 進度可加到同資料夾 `進度追蹤表.xlsx`（要我加 MDN 欄位再說）

## 來源
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [MDN JavaScript Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference)
