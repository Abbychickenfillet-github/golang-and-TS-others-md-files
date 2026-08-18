---
title: "Symbol-符號型別與物件key"
source: Gemini
tags: [javascript, symbol, 物件, key, JS_Core_and_Runtime]
sources:
  - https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Symbol
  - https://gemini.google.com/app/64ba1028141e5c94
updated: 2026-08-14
---

# Symbol 符號型別 & 物件的 key 只能 string / symbol

> 相關：[[查看plain-object的prototype]]、[[Object靜態方法速查]]、[[for...of]]
> MDN：<https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Symbol>

## 一句話

**物件(object)的屬性 key 只能是「字串 string」或「符號 Symbol」兩種型別。** 其他型別當 key 都會被「自動轉成字串」。（想用任何型別當 key → 用 `Map`。）

---

## 1. key 只能 string / symbol —— 其他會被轉成字串

```js
const obj = {};
obj[1]   = "a";   // 數字 1 → 被轉成字串 "1"
obj["1"];         // "a" ← 證據：用字串 "1" 拿得到，代表 key 本來就是 "1"
obj[true] = "b";  // → "true"
obj[{}]   = "c";  // → "[object Object]"（物件被Prototype.toString()硬轉成這串字！）
console.log(Object.keys(obj));   // ["1", "true", "[object Object]"] 全是字串
```
→ 所以拿物件當 key 會全部撞在 `"[object Object]"`，這是用物件當字典的大坑。要任意型別 key 請用 **Map**。

---

## 2. Symbol 是什麼

ES6 新增的**原始型別(primitive)**，特色是「**獨一無二**」：每個 Symbol 都不相等。

```js
const s1 = Symbol("desc");   // 括號內只是「說明文字」，方便除錯，不影響唯一性
const s2 = Symbol("desc");
console.log(s1 === s2);      // false ← 即使說明一樣，也是兩個不同的 Symbol
console.log(typeof s1);      // "symbol"
```

## 3. 為什麼用 Symbol 當 key？

- **不會撞名**：給物件加 Symbol key，絕不會跟別人（或函式庫）的字串 key 衝突。
- **預設「隱身」**：Symbol key 不會出現在 `for...in`、`Object.keys`、`JSON.stringify`。

```js
const id = Symbol("id");
const user = { name: "Abby", [id]: 123 };   // 用 [變數] 當 key（computed key）
console.log(Object.keys(user));             // ["name"] ← Symbol key 沒出現
console.log(user[id]);                      // 123 ← 要用同一個 Symbol 才取得到
```

要拿 Symbol key 得用專門的方法（見 [[Object靜態方法速查]]）：
```js
Object.getOwnPropertySymbols(user);   // [Symbol(id)]
Reflect.ownKeys(user);                // ["name", Symbol(id)] ← 字串+Symbol 全拿
```

### 完整範例：把 Symbol 放進物件當 key

關鍵差別：**字串 key 直接寫；Symbol key 一定要先存進變數，再用 `[變數]`。**

```js
// === 字串 key：直接寫，不用變數 ===
const a = { name: "Abby" };     // name 自動變字串 key "name"
console.log(a.name);            // "Abby"

// === Symbol key：要先有變數，再用 [變數] ===
const id = Symbol("id");        // ① 先建立 Symbol，存進變數 id（要保留它！）

// 寫法 1：在物件字面值裡用「計算屬性鍵 [id]」
const user = {
  name: "Abby",                 // 字串 key：直接寫
  [id]: 123                     // Symbol key：一定要 [id]，不能寫 id
};

// 寫法 2：建完物件後再加
const user2 = { name: "Joe" };
user2[id] = 456;                // 用中括號 + 變數

// === 讀回來：必須用「同一個」Symbol 變數，必須用中括號一組 ===
console.log(user[id]);          // 123  ← 用 id 取得到
console.log(user2[id]);         // 456

// === 對照：為什麼不能直接寫 id ===
const wrong = { id: 999 };      // 這個 id 是「字串 key "id"」，不是上面那個 Symbol！
console.log(wrong[id]);         // undefined ← 此物件沒有「那個 Symbol」當 key
console.log(wrong.id);          // 999       ← 它只有字串 key "id"
console.log(wrong["id"]);       // 999

// === Symbol key 會「隱身」===
console.log(Object.keys(user));               // ["name"] ← 看不到 Symbol key
console.log(Object.getOwnPropertySymbols(user)); // [Symbol(id)] ← 要這樣才看得到
```

> 重點：**Symbol 是獨一無二的，你沒留住 `id` 這個變數，就再也取不到那個值**（因為無法重建「同一個」Symbol）。這跟字串 key 可以隨時用 `"name"` 字面值取得，很不一樣。

## 4. 內建的「知名 Symbol」(well-known symbols)

JS 內部用 Symbol 當「協定鉤子」，最常見的是 **`Symbol.iterator`**——物件有沒有它，決定能不能 `for...of`（即「可迭代 iterable」，見 [[查看plain-object的prototype]] 的 enumerable vs iterable）。

```js
const arr = [1, 2, 3];
typeof arr[Symbol.iterator];   // "function" ← 陣列有，所以可 for...of
const obj = {};
obj[Symbol.iterator];          // undefined  ← plain object 沒有，不能 for...of
```

---

## 5. Object key vs Map key（對照）

| | Object 的 key | Map 的 key |
|---|---|---|
| 可用型別 | **只有 string / symbol** | **任何型別**（數字、物件、函式…） |
| 其他型別 | 自動轉成字串 | 原樣保留 |
| 適合 | 固定結構的資料 | 任意鍵值字典 |

> 記憶：**物件 key 只認 string/symbol；要用物件或數字當 key 就改用 Map。**

---

## 追加 2026-08-14（Gemini 對話補充）

> 來源：<https://gemini.google.com/app/64ba1028141e5c94>
> 補充重點 a–f，共 6 個。上面第 1–5 節維持原樣，以下是原本沒寫到的四件事：全域符號登錄檔、`new Symbol()` 為何被禁、弱封裝的正確定義、以及 Symbol 與資料庫的關係。

### 6. `Symbol.for()` 與全域符號登錄檔

a. `Symbol("desc")` 每次呼叫都產生一個<mark style="background: #FFF3A3A6;">全新、永不相等</mark>的 Symbol；`Symbol.for("key")` 則走<mark style="background: #ADCCFFA6;">全域符號登錄檔（Global Symbol Registry）</mark>——它是一個<mark style="background: #BBFABBA6;">單純的查表存取，不是迴圈</mark>：先在登錄檔裡找有沒有這個 key，找到就回傳<mark style="background: #FFF3A3A6;">同一個</mark> Symbol，沒找到才建立新的並登記進去。

```js
Symbol("id")     === Symbol("id");      // false ← 每次都是新的
Symbol.for("id") === Symbol.for("id");  // true  ← 登錄檔裡是同一個
Symbol.keyFor(Symbol.for("id"));        // "id"  ← 反查登錄檔的 key
Symbol.keyFor(Symbol("id"));            // undefined ← 沒登記過，查不到
```

b. <mark style="background: #D2B3FFA6;">用途分界</mark>：要「絕對唯一、誰都撞不到」用 `Symbol()`；要「跨模組／跨 iframe 共用同一個 Symbol」用 `Symbol.for()`。

### 7. 為什麼不能寫 `new Symbol()`

c. `new Symbol()` 會直接<mark style="background: #FF5582A6;">拋出 TypeError</mark>。其他原始型別（Number、String、Boolean）都允許 `new` 出一個<mark style="background: #ADCCFFA6;">包裝物件（wrapper object）</mark>，只有 Symbol 被規格明文禁止。原因是<mark style="background: #FFF3A3A6;">避免混淆</mark>：Symbol 的整個存在意義就是「一個獨一無二的原始值」，如果允許 `new Symbol()`，就會冒出「兩個包著同一個 Symbol 的不同物件」這種自相矛盾的結構。

d. 真的需要包裝物件時，改用 `Object(sym)`。<mark style="background: #FF5582A6;">注意這不是「改變了 Symbol 的型別」</mark>，而是<mark style="background: #BBFABBA6;">另外造了一個物件把它包在裡面</mark>；原本那個 Symbol 仍然是 symbol 型別：

```js
const sym = Symbol("id");
typeof sym;              // "symbol"  ← 原本的沒變
const wrapped = Object(sym);
typeof wrapped;          // "object"  ← 這是新造的包裝物件
wrapped.valueOf() === sym;  // true   ← 裡面裝的還是同一個 Symbol
new Symbol("id");        // TypeError: Symbol is not a constructor
```

### 8. 「弱封裝」到底弱在哪裡

e. <mark style="background: #ADCCFFA6;">封裝（Encapsulation）</mark>是把資料與操作資料的方法包成一個獨立單位，外界只能透過它提供的介面存取。MDN 對 Symbol 的用詞是 <mark style="background: #ADCCFFA6;">weak encapsulation／weak form of information hiding</mark>（弱封裝／弱資訊隱藏），三個關鍵句的意思是：

- <mark style="background: #FFF3A3A6;">hidden from any mechanism other code will typically use to access the object</mark>——Symbol key<mark style="background: #FFF3A3A6;">不會出現在</mark> `for...in`、`Object.keys()`、`JSON.stringify()` 這些「一般人會用的存取管道」裡。
- <mark style="background: #FF5582A6;">但這只是「不顯眼」，不是「真的存取不到」</mark>：`Object.getOwnPropertySymbols(obj)` 與 `Reflect.ownKeys(obj)` 一樣撈得出來。<mark style="background: #FF5582A6;">所以絕對不能拿 Symbol 來藏密碼、token 這類真正的機密。</mark>
- 這就是為什麼叫「<mark style="background: #ADCCFFA6;">弱</mark>」封裝——真正的私有欄位請用 <mark style="background: #BBFABBA6;">class 的 `#privateField` 語法</mark>或閉包，那才是引擎層級擋掉的。

### 9. Symbol 與資料庫（實務上的分界）

f. <mark style="background: #FF5582A6;">資料庫沒有 Symbol 這個資料型別。</mark>PostgreSQL、MySQL 都不支援，主鍵（primary key）一律是整數、字串或 UUID。Symbol 是<mark style="background: #ADCCFFA6;">純執行期（runtime）</mark>的概念，一旦資料要序列化落地（`JSON.stringify` 也會直接忽略 Symbol key），它就消失了。

> [!tip] 實務結論
> Symbol 解決的是<mark style="background: #FFF3A3A6;">「同一個 JS 執行環境裡，不同函式庫往同一個物件上掛屬性會不會撞名」</mark>的問題，跟資料庫的鍵值設計是兩個世界。用 UUID 當主鍵時，撞名問題本來就不存在，不需要也不可能改用 Symbol。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 第 6–9 節原始對話 | https://gemini.google.com/app/64ba1028141e5c94 | Gemini 對話（語音輸入），整理於 2026-08-14 |
| Symbol 型別、`Symbol.for`、`new Symbol()` 拋錯、weak encapsulation 原文 | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Symbol | MDN，查證於 2026-08-14 |
| class 私有欄位 `#`（真正的封裝） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties | MDN，查證於 2026-08-14 |
