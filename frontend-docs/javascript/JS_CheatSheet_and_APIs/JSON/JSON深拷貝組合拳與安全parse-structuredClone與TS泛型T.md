---
title: "JSON 深拷貝組合拳與安全 parse——structuredClone 與 TS 泛型 T"
type: topic-note
source: Gemini
category: tech
tags: [gemini, javascript, json, 深拷貝, structuredClone, typescript, 泛型]
sources:
  - https://gemini.google.com/app/c3535047879639cc
updated: 2026-09-15
---

# JSON 深拷貝組合拳與安全 parse——structuredClone 與 TS 泛型 `T`

> 本篇重點 a–n，共 14 個。
> 關聯筆記：[[JSON.parse-參數的ToString強制轉換]]（parse 吃到非字串時先 ToString）、[[JSON設計由來-reviver函式與Whitespace規範]]（parse 第二個參數 reviver）、[[10-傳值vs傳址-賦值與記憶體空間]]（為什麼需要深拷貝的根因）、[[Day1-型別辨別-自動轉換-與immutable的四個層次]]（immutable 的四個層次）。
> 關聯的原因：這一篇講的是「怎麼把一個物件複製到記憶體的另一塊」，而「為什麼複製不掉」的根因在傳值 vs 傳址那篇，「parse 的參數與第二個參數」則在 JSON 那兩篇，三者合起來才是完整的 JSON 使用地圖。

## 一、重點整理

### 1. 組合拳到底在做什麼

<mark style="background: #FFF3A3A6;">**`JSON.parse(JSON.stringify(obj))` 不是把 `JSON.stringify` 當成參數傳進去，而是先讓 `JSON.stringify` 執行完、拿它吐出來的字串，再交給 `JSON.parse` 吃。**</mark>

寫成完整的拋接關係就是：

> `JSON.stringify`（序列化器）把 JS 物件 serialize 成一條 JSON 字串 → 這條字串交給 `JSON.parse`（JSON parser）→ parser 依 JSON 文法重新長出一個全新的 JS 物件 → 這個新物件跟原物件在 heap 上是兩塊不同的記憶體。

```js
const original = { a: 1, b: { c: 2 } };

// 步驟 1：serialize 成字串 '{"a":1,"b":{"c":2}}'
const text = JSON.stringify(original);

// 步驟 2：parse 回一個全新的物件
const clone = JSON.parse(text);

clone.b.c = 999;
console.log(original.b.c); // 2 ← 沒有被牽連，代表第二層也斷開了
```

(a) **組合拳的定義**：`JSON.parse(JSON.stringify(obj))` 是 JS 早年最常見的深拷貝（deep clone）寫法。
(b) **為什麼需要它**：JS 的物件是傳址（by reference），`const b = a` 只是讓 `b` 指向同一塊記憶體，改 `b` 等於改 `a`。
(c) **淺拷貝不夠用**：`Object.assign({}, a)` 與展開運算子 `{...a}` 只複製第一層，第二層以上的子物件仍然共用同一個位址。

### 2. 組合拳的四個限制（面試常考）

| 情況 | 經過組合拳之後會變成 | 為什麼 |
| --- | --- | --- |
| `function` / `Symbol` / `undefined` | 直接消失（物件屬性被丟掉，陣列元素變 `null`） | JSON 格式裡沒有這三種型別 |
| `NaN` / `Infinity` / `-Infinity` | 變成 `null` | JSON 的 number 文法不接受這些字面值 |
| `Date` 物件 | 變成 ISO 字串，不會自動變回 `Date` | `Date.prototype.toJSON` 回傳字串，parse 不知道要還原 |
| 循環引用（circular reference） | 直接丟 `TypeError` | serialize 時會無限遞迴 |

(d) **四個限制**：型別遺失、特殊數值變 `null`、`Date` 降級成字串、循環引用直接爆。

### 3. 現代做法：`structuredClone`

<mark style="background: #BBFABBA6;">**現代環境（Node 17+ 與主流瀏覽器）直接用原生的 `structuredClone(obj)` 取代組合拳。**</mark>

```js
const src = { when: new Date(), tags: new Set(['a']), nested: { n: NaN } };
const deep = structuredClone(src);

deep.when instanceof Date; // true  ← Date 保住了
deep.tags instanceof Set;  // true  ← Set/Map 也保住了
Number.isNaN(deep.nested.n); // true ← NaN 沒有變成 null
```

(e) **`structuredClone` 的優勢**：支援 `Date`、`Map`、`Set`、`RegExp`、`ArrayBuffer`、`TypedArray`，而且能處理循環引用。

> [!warning] ⚠️ 存疑／補充（Gemini 沒講的部分）
> Gemini 只說「建議優先採用 `structuredClone`」，但沒有講它的限制。
> 依 MDN 的 structured clone algorithm 規格：`function`、`Symbol`、DOM 節點、以及物件的 **prototype 與 getter/setter** 都複製不了，碰到 function 會丟 `DataCloneError`。
> 所以 (f) **`structuredClone` 不是萬能**，要複製「含方法的 class 實例」仍需自己寫 clone 或用 lodash `cloneDeep`。

### 4. parse 之前一定要檢查

`JSON.parse()` 吃到無效字串會直接丟 `SyntaxError` 讓程式中斷，而 JS 沒有原生的 `isJSON()`，所以標準做法是用 `try...catch` 包起來。

```js
// 基本安全版：只保證不炸
function safeJsonParse(str) {
  if (typeof str !== 'string' || str.trim() === '') return null; // 先擋非字串與空字串
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('JSON 解析失敗：', error.message);
    return null;
  }
}

// 嚴格版：還要求結果必須是物件或陣列（排除 "123"、"true" 這種也合法的 JSON）
function parseJsonObject(str) {
  if (typeof str !== 'string') return null;
  try {
    const result = JSON.parse(str);
    if (typeof result === 'object' && result !== null) return result;
  } catch (e) { /* 吞掉語法錯誤 */ }
  return null;
}
```

(g) **基本安全版**：先用 `typeof` 擋掉非字串，再用 `try...catch` 擋語法錯誤。
(h) **嚴格版**：多一道 `typeof result === 'object' && result !== null`，因為 `"123"`、`"true"`、`"null"` 都是合法 JSON，但通常不是你要的。

### 5. 為什麼 stringify 之後「屬性是字串、值好像不是」

<mark style="background: #ADCCFF62;">**整條 `jsonString` 在記憶體中 100% 是一串文字（`typeof jsonString === "string"`）。**</mark>看起來「值不是字串」，是因為 JSON 用「有沒有雙引號」這個文法標記來區分型別。

```js
const obj = { age: 18, isStudent: true, name: 'Alice' };
JSON.stringify(obj); // '{"age":18,"isStudent":true,"name":"Alice"}'
//                       ↑ key 一定有引號   ↑ 18 沒引號＝number   ↑ 有引號＝string
```

(i) **全部都是文字**：stringify 的產物是一條純文字，沒有任何 JS 值留在裡面。
(j) **引號是型別標記**：JSON 用引號區分「這段文字代表字串」還是「代表數字／布林／物件／陣列」。

### 6. parse 不是只能吃物件

```js
JSON.parse('123.45');        // 123.45   typeof 'number'，可以直接 +10
JSON.parse('true');          // true     typeof 'boolean'
JSON.parse('[1,"two",false]'); // [1,'two',false]  Array.isArray 為 true
JSON.parse('null');          // null

let count = 99;
let s = JSON.stringify(count); // '99'  typeof 'string'
let p = JSON.parse(s);         // 99    typeof 'number'
p === count;                   // true
```

(k) **任何合法 JSON 文字都能 parse**：number、boolean、array、null、string 都可以，不限物件。
(l) **`JSON` 是 JS 的原生內建物件**（跟 `Math` 同一類），它是「JS 值 ↔ JSON 文字」的轉換工具，不是只有 `.json` 檔案才能用。

### 7. TypeScript 寫法：`<T>` 是泛型

`JSON.parse()` 在 TS 的回傳型別預設是 `any`，會把型別安全整個破掉。`<T>` 是 **泛型（generic）的型別參數佔位符**，代表「呼叫時才決定的型別」。

```ts
// 做法 A：泛型解析函式
function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

interface User { name: string; age: number }
const user = safeJsonParse<User>('{"name":"Alice","age":18}');
if (user) console.log(user.name); // TS 推導出 name 是 string

// 做法 B：深拷貝的泛型版本，型別會完整保留
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
```

(m) **`<T>` 的意思**：函式可以彈性接收任何型別，並回傳「跟呼叫時指定的同一個型別」，維持型別安全。
(n) **`as T` 只是斷言不是驗證**：執行期不會真的檢查資料長相，要真正驗證請用 [[import-type-vs-interface]] 之外的 schema 工具（如 Zod）。

## 二、延伸練習（LeetCode）

| 題號 | 題目 | 連結 |
| --- | --- | --- |
| 2633 | Convert Object to JSON String（自己手刻 stringify） | https://leetcode.com/problems/convert-object-to-json-string/ |
| 2628 | JSON Deep Equal（深層比較，剛好是深拷貝的反面） | https://leetcode.com/problems/json-deep-equal/ |
| 2705 | Compact Object（遞迴走訪巢狀結構） | https://leetcode.com/problems/compact-object/ |

## 三、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| 本篇原始對話（Gemini） | https://gemini.google.com/app/c3535047879639cc | 對話擷取 2026-09-15 |
| `structuredClone()` 與可複製型別限制 | https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone | MDN，查證 2026-09-15 |
| The structured clone algorithm（哪些東西不能複製） | https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm | MDN，查證 2026-09-15 |
| `JSON.stringify()` 會忽略哪些值 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify | MDN，查證 2026-09-15 |
| `JSON.parse()` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse | MDN，查證 2026-09-15 |
| TypeScript Generics | https://www.typescriptlang.org/docs/handbook/2/generics.html | TS Handbook，查證 2026-09-15 |
