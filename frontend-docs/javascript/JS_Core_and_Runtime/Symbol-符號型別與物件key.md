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
