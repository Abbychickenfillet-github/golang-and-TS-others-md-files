# JavaScript `for...of` 迴圈

> 路徑：frontend-docs / javascript / 物件 / 迴圈遍歷 / for...of
> 相關：[[for...in]]、[[陣列遍歷-forEach與callback]]、[[iife-是否算原生function]]
> MDN：<https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Statements/for...of>

## 一句話
`for...of` 走的是「**可迭代物件裡的值（value）**」，照順序一個個拿出來，可以 `break` / `continue`。

> 對照口訣：**`for...in` 走「鍵 key」，`for...of` 走「值 value」。**（詳見 [[for...in]]）

---

## 基本語法

```js
const fruits = ["apple", "banana", "cherry"];
for (const fruit of fruits) {
  console.log(fruit);   // "apple" → "banana" → "cherry"（直接是「值」）
}
```

對照 `for...in` 拿到的是索引字串：

```js
for (const i in fruits) {
  console.log(i);          // "0" "1" "2"（鍵，而且是字串！）
  console.log(fruits[i]);  // 要再用 fruits[i] 才拿到值
}
```

---

## 可以走哪些東西？→「可迭代物件 iterable」

`for...of` 只能用在**可迭代（iterable）**的對象上：

| 可迭代 ✅ | 不可迭代 ❌ |
|---|---|
| 陣列 Array | 一般物件 `{}`（純物件**不可**用 for...of！） |
| 字串 String | |
| Map、Set | |
| `arguments`、`NodeList` 等類陣列 | |

```js
// 字串：一個字一個字走
for (const ch of "abc") console.log(ch);   // "a" "b" "c"

// Set
for (const n of new Set([1, 1, 2])) console.log(n);   // 1 2

// Map：每圈拿到 [key, value] 一組
for (const [k, v] of new Map([["a", 1]])) console.log(k, v);   // "a" 1
```

### ⚠️ 純物件 `{}` 不能直接 for...of

```js
const user = { name: "Abby", age: 30 };
for (const v of user) {}   // ❌ TypeError: user is not iterable
```

要遍歷物件，改用 `Object.keys / values / entries` 先轉成陣列：

```js
for (const key of Object.keys(user))   {}  // 走鍵
for (const val of Object.values(user)) {}  // 走值
for (const [key, val] of Object.entries(user)) {}  // 鍵值一起拿（推薦）
```

---

## 想同時拿到「索引」→ `entries()`

`for...of` 預設只給值，沒有索引。要索引就配 `entries()`：

```js
const fruits = ["apple", "banana"];
for (const [index, fruit] of fruits.entries()) {
  console.log(index, fruit);   // 0 "apple" → 1 "banana"
}
```

---

## 為什麼比 `forEach` / `for...in` 好用

| | `for...of` | `forEach` | `for...in` |
|---|---|---|---|
| 拿到的東西 | 值 | 值（callback 參數） | 鍵（含繼承屬性） |
| 能 `break` / `continue` | ✅ 可以 | ❌ 不行 | ✅ 可以 |
| 能用 `await`（非同步） | ✅ 可以 | ❌ 跳過 await | ✅ 可以 |
| 走陣列安全嗎 | ✅ 安全、照順序 | ✅ 安全 | ❌ 會走到繼承屬性、順序不保證 |

```js
// for...of 可以中途停 —— forEach 做不到
for (const n of [1, 2, 3, 4]) {
  if (n === 3) break;   // forEach 裡寫 break 會直接語法錯誤
  console.log(n);       // 1 2
}
```

> 詳細的「遍歷方法地圖」整理在 [[for...in]] 第 5 節。

---

## 小結
- **走值用 `for...of`**，這是遍歷陣列 / 字串 / Set / Map 最推薦的方式。
- **能 break、能 await**，比 `forEach` 靈活。
- **純物件不能直接用**，要先 `Object.keys/values/entries()`。
- 走鍵、或處理繼承屬性 → 看 [[for...in]]。
