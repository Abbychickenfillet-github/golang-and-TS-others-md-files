---
title: Map.prototype 完整清單｜實例方法、存取器與 Symbol 鍵
tags: [javascript, map, prototype, 實例方法, symbol, 面試]
created: 2026-08-19
source:
  - MDN Map（頁面最後更新 2026-08-13）
  - 實測環境 Node.js v22.22.2（V8 12.4.254.21）
---

# Map.prototype 完整清單

> [!info] 承接
> a. 承接 [[Object靜態方法速查]] 的「兩個盒子」章節：那裡說 `map.set(...)` 是實例方法、`Map.groupBy(...)` 是靜態方法，這篇把 `Map.prototype` 整個攤開來數。
> b. 承接 [[Object建構子-plain-object的建立與存取]] 的 b 節：那篇說 Map 不是 plain object，因為第 1 階原型是 `Map.prototype`。這篇就是那一階裡面有什麼。
> c. 用到 [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]]：要數完整必須用 `Reflect.ownKeys`，不能只用 `getOwnPropertyNames`。

---

## a. 先確認你的理解是對的

> 「實例方法是指可以透過該物件的實例來呼叫的方法，例如 `map.get()` 裡的 `get()`。這些方法雖然定義在 `Map.prototype` 上，但所有的實例都可以共享它們，所以在使用上就稱作實例方法。」

**完全正確。** 三個關鍵字都抓到了：定義在 `prototype` 上、**所有實例共享**、透過實例呼叫。

補一個實測證據：

```js
const m1 = new Map();
const m2 = new Map();

m1.set === m2.set                      // true ← 兩個實例拿到同一份函式
m1.set === Map.prototype.set           // true ← 就是原型上那一份
Object.hasOwn(m1, 'set')               // false ← 實例身上根本沒有，是繼承來的
```

一百萬個 Map 不會各存一份 `set`，全部共用原型上那一份。這就是原型鏈存在的意義。

---

## b. 數不完整的陷阱

先看一個容易踩的地方：

```js
Object.keys(Map.prototype)                    // []  ← 空的！
Object.getOwnPropertyNames(Map.prototype)     // 11 個
Object.getOwnPropertySymbols(Map.prototype)   // 2 個
Reflect.ownKeys(Map.prototype)                // 13 個 ← 這才是完整的
```

- `Object.keys` 是 `[]`，因為內建成員的 `enumerable` **全部是 `false`**（跟 `Object.prototype` 那 12 個一樣的道理）
- `getOwnPropertyNames` 漏掉 Symbol 鍵
- **只有 `Reflect.ownKeys` 數得完整**

---

## c. 完整的 13 個（Node.js v22.22.2 實測）

| 成員 | 種類 | 參數 | 說明 |
| --- | --- | --- | --- |
| `constructor` | method | 0 | 指回 `Map` 本身 |
| `get(key)` | method | 1 | 取值，沒有就回 `undefined` |
| `set(key, value)` | method | 2 | 新增或更新，**回傳 map 本身所以可以串接** |
| `has(key)` | method | 1 | 有沒有這個 key |
| `delete(key)` | method | 1 | 刪除，回傳 `true`／`false` |
| `clear()` | method | 0 | 清空全部 |
| `keys()` | method | 0 | 回傳 key 的 iterator |
| `values()` | method | 0 | 回傳 value 的 iterator |
| `entries()` | method | 0 | 回傳 `[key, value]` 配對的 iterator |
| `forEach(cb)` | method | 1 | 走訪，callback 收 `(value, key, map)` |
| **`size`** | **accessor 存取器** | — | **唯讀，只有 get 沒有 set** |
| `[Symbol.iterator]` | method | 0 | **就是 `entries`**，讓 `for...of` 能用 |
| `[Symbol.toStringTag]` | **value 值** | — | 字串 `"Map"` |

### c-1. `size` 是存取器不是方法

這一格最重要，因為它跟你剛學的 `__proto__` 是**同一種東西**：

```js
const m = new Map([['a', 1], ['b', 2]]);

m.size      // 2       ← 沒有括號
m.size()    // TypeError: m.size is not a function

Object.getOwnPropertyDescriptor(Map.prototype, 'size');
// { get: [Function], set: undefined, enumerable: false, configurable: true }
//   ↑ 有 get      ↑ 沒有 set → 唯讀存取器
```

對照 `Array` 的 `length` 是**資料屬性**（可寫，`arr.length = 0` 可以清空陣列），Map 的 `size` 是**唯讀存取器**，寫它沒有用。

### c-2. `Symbol.iterator` 就是 `entries`

```js
Map.prototype[Symbol.iterator] === Map.prototype.entries   // true
```

所以 `for...of` 走 Map 時拿到的是 `[key, value]` 配對：

```js
for (const pair of m) console.log(pair);
// ["a", 1]
// ["b", 2]

for (const [k, v] of m) console.log(k, v);   // 順手解構就好讀了
```

### c-3. `Symbol.toStringTag` 是「值」不是方法

```js
Map.prototype[Symbol.toStringTag]        // "Map" ← 一個字串
Object.prototype.toString.call(m)        // "[object Map]"
```

那個 `[object Map]` 裡的 `Map` 就是從這裡讀來的。這也是為什麼型別偵測那招對 Map 有效。

---

## d. 那兩個帶問號的：`getOrInsert` 與 `getOrInsertComputed`

> [!important] 更正與補充（2026-08-20）
> 這兩個**已經正式寫進 ES2026 規格**（第 17 版，2026 年 6 月 30 日通過），對應的提案是「Map／WeakMap 取值時給預設值」。
> 但**規格定案不等於實作落地** —— MDN 仍標 Experimental，Node.js v22 也還沒有。完整脈絡見 [[ECMAScript版本沿革-ES1到ES2026]] 的 g 節。

> [!warning] MDN 上有，但你的環境很可能沒有
> MDN 的 Map 頁面（2026-08-13 更新）確實列了這兩個，但標記是 **Experimental／Limited availability 實驗性、有限支援**。
> 我在 **Node.js v22.22.2 實測，這兩個都不存在**：
> ```js
> 'getOrInsert' in Map.prototype           // false
> 'getOrInsertComputed' in Map.prototype   // false
> ```

它們要解決的是這個很煩的樣板：

```js
// 現在要這樣寫
if (!m.has(k)) m.set(k, []);
m.get(k).push(v);

// 有了之後可以寫成
m.getOrInsertComputed(k, () => []).push(v);
```

**但現在還不能用在正式專案。** 判斷「這個 API 能不能用」的方法：

- 看 MDN 頁面頂端有沒有 **Experimental** 或 **Baseline 尚未廣泛可用**的標記
- 直接在你的執行環境測：`'方法名' in Map.prototype`
- 查 caniuse 或 MDN 的 Browser compatibility 表

> [!tip] 為什麼 VS Code 會提示你這些
> 因為 TypeScript 的 `lib.d.ts` 型別定義可能比你的執行環境新。**編輯器提示得出來 ≠ 跑得起來**，這是很常見的踩雷點。

---

## e. Map 建構函式身上有什麼（靜態）

```js
Object.getOwnPropertyNames(Map)      // ["length", "name", "prototype", "groupBy"]
Object.getOwnPropertySymbols(Map)    // [Symbol(Symbol.species)]
```

| 成員 | 說明 |
| --- | --- |
| `Map.groupBy(iterable, cb)` | **靜態方法**（ES2024），依 callback 的回傳值分組成 Map |
| `Map[Symbol.species]` | 靜態存取器，決定衍生物件要用哪個建構函式 |
| `length`／`name`／`prototype` | 所有函式都有的東西，不算方法 |

寫法對照：

```js
Map.groupBy(people, p => p.age)   // 靜態：資料當「參數」傳進去
grouped.get(20)                   // 實例：grouped 在「點的左邊」
```

---

## f. Map 實例的完整原型鏈

```js
Object.getPrototypeOf(m) === Map.prototype              // true
Object.getPrototypeOf(Map.prototype) === Object.prototype  // true
```

所以是：`m` → `Map.prototype` → `Object.prototype` → `null`，共 3 階。

**這就是為什麼 Map 不是 plain object** —— 它的第 1 階不是 `Object.prototype`，中間多插了一層。但它仍然繼承得到 `Object.prototype` 的東西：

```js
typeof m.hasOwnProperty    // "function" ← 從第 2 階繼承來的
typeof m.toString          // "function"
```

詳見 [[Object建構子-plain-object的建立與存取]] 的 i 節。

---

## g. Map vs plain object 的 API 對照

| 想做的事 | plain object | Map |
| --- | --- | --- |
| 取值 | `obj.k` ／ `obj['k']` | `m.get(k)` |
| 設值 | `obj.k = v` | `m.set(k, v)` |
| 有沒有 | `Object.hasOwn(obj, k)` | `m.has(k)` |
| 刪除 | `delete obj.k` | `m.delete(k)` |
| 幾筆 | `Object.keys(obj).length` | `m.size`（**無括號**） |
| 清空 | 重新指派 `{}` | `m.clear()` |
| 走訪 | `Object.entries(obj)` | 直接 `for...of m` |
| key 型別 | **只能字串或 Symbol** | **任意型別**，包括物件與 `NaN` |
| key 順序 | 整數鍵先照數字排 | **永遠是插入順序** |
| 可 JSON 序列化 | 可以 | **不行**，`JSON.stringify(m)` 得到 `{}` |

> [!note] 選擇判準
> 需要**任意型別當 key**、需要**保證插入順序**、需要**頻繁增刪**、需要 `size` → 用 Map。
> 要 JSON 序列化、要用展開運算子、資料是固定欄位的紀錄 → 用 plain object。

---

## 參考來源

| 來源 | 頁面最後更新 |
| --- | --- |
| MDN｜Map | 2026-08-13 |
| MDN｜Map.prototype.size | — |
| 實測環境 Node.js v22.22.2（V8 12.4.254.21） | 2026-08-19 |

> [!note] 驗證方式
> c 節與 d 節的所有結果都在 Node.js v22.22.2 實跑過，腳本是同資料夾的 `map-prototype-完整清單.js`。
> **注意：`getOrInsert` 的可用性會隨環境與時間改變，看到這篇時請重跑腳本確認。**

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[Object靜態方法速查]] | 「兩個盒子」的判準，本篇是把 Map 套進那個判準的實例 |
| [[Object建構子-plain-object的建立與存取]] | i 節說明為什麼 Map 不是 plain object |
| [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] | 為什麼數 `Map.prototype` 一定要用 `Reflect.ownKeys` |
| [[存取器屬性三種定義方式-getter-setter與資料驗證]] | `size` 是唯讀存取器，跟那篇的 `get fahrenheit()` 同一種 |
| [[Symbol-符號型別與物件key]] | `Symbol.iterator` 與 `Symbol.toStringTag` 的細節 |
| [[for...of]] | Map 能直接 `for...of` 就是因為有 `Symbol.iterator` |
