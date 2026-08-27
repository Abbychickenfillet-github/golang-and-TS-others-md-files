---
title: "Object靜態方法速查"
---

# Object 靜態方法速查（Object.xxx）

> 可執行範例（同資料夾）：[[object-static-methods.html]]（開 F12 看 Console；原始檔也在 `JavaScript-practicing/`）
> 相關：[[查看plain-object的prototype]]、[[for...in]]、[[map-轉換陣列重點與練習]]
> MDN：<https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Object>

> [!important] 先分清楚兩種「方法」
> - `Object.xxx()`＝**靜態方法**，掛在 `Object` 建構函式上（你打 `Object.` 跳出的那排）。
> - `obj.xxx()`＝**實例方法**，來自 `Object.prototype`（`hasOwnProperty`、`toString`…）。
> - `constructor` 不是靜態方法，是每個物件都有的屬性：`person.constructor === Object`。
> - ⚠️ 呼叫時 `Object` 是**內建建構函式（固定大寫，不是你宣告的變數）**；你的物件是當「**參數**」傳進去：
>   `Object.hasOwn(person, "name")` → `Object`＝內建、`person`＝你自己的變數（可改名）、`"name"`＝要查的屬性。
>   小寫 `object.hasOwn(...)` 會 `object is not defined`（JS 大小寫敏感）。

範例物件：`const person = { name: "Abby", age: 20 }`

---

## 1. 讀屬性：keys / values / entries
```js
Object.keys(person)     // ["name","age"]   只回「可列舉自有屬性」的鍵
Object.values(person)   // ["Abby", 20]
Object.entries(person)  // [["name","Abby"],["age",20]]  鍵值對陣列
for (const [k, v] of Object.entries(person)) { /* 拆解超好用 */ }
```

## 2. assign：複製 / 合併（淺拷貝）
```js
Object.assign({}, person)                       // 複製
Object.assign({}, person, { age: 21 })          // 後面覆蓋前面
// 現代等價：{ ...person }
```

## 3. entries ↔ fromEntries（互為反向）
```js
Object.fromEntries([["name","Abby"],["age",20]])  // { name:"Abby", age:20 }
// 經典：entries → map 改造 → fromEntries 變回物件
Object.fromEntries(Object.entries(person).map(([k,v]) => [k.toUpperCase(), v]))
```

## 4. create：用指定原型建物件
```js
const child = Object.create(proto)   // child 的原型 = proto（繼承 proto 的方法）
Object.create(null)                  // 沒有原型的純淨物件（連 toString 都沒有）
```

## 5. getPrototypeOf / setPrototypeOf
```js
Object.getPrototypeOf(person) === Object.prototype   // true
Object.setPrototypeOf(dog, animal)                   // 設原型（少用，傷效能）
```
詳見 [[查看plain-object的prototype]]。

## 6. 屬性描述子：getOwnPropertyDescriptor(s)
每個屬性背後有 4 旗標：`value / writable / enumerable / configurable`
```js
Object.getOwnPropertyDescriptor(person, "name")
// { value:"Abby", writable:true, enumerable:true, configurable:true }
Object.getOwnPropertyDescriptors(person)   // 一次拿全部
```

## 7. defineProperty / defineProperties：精細定義屬性
```js
Object.defineProperty(obj, "id", {
  value: 1001, writable:false, enumerable:false, configurable:false
})
// enumerable:false → Object.keys 看不到（隱身），但 getOwnPropertyNames 看得到
Object.defineProperties(obj, { a:{value:1,enumerable:true}, b:{value:2,enumerable:true} })
```

## 8. getOwnPropertyNames / getOwnPropertySymbols：列「所有」自有屬性
```js
Object.getOwnPropertyNames(obj)    // 連「不可列舉」的也列（keys 不會）
Object.getOwnPropertySymbols(obj)  // 只列 Symbol 鍵
```
關係：`keys`（可列舉字串鍵）⊂ `getOwnPropertyNames`（全部字串鍵）；Symbol 鍵要另外拿。

## 9. 凍結保護：preventExtensions < seal < freeze
```js
Object.freeze(o)            // 不能改、不能加、不能刪（最強）
Object.seal(o)              // 可改現有值，不能加/刪
Object.preventExtensions(o) // 只是不能新增屬性
Object.isFrozen(o) / isSealed(o) / isExtensible(o)   // 檢查
```
> ⚠️ 對 frozen/sealed/唯讀屬性賦值的後果，看有沒有 `"use strict"`：
> - **非嚴格模式**：賦值「靜默失敗」（不報錯、也沒效果）。
> - **嚴格模式("use strict")**：**丟 `TypeError` 並中斷整支程式** → 後面的程式碼不會執行（除非用 `try/catch` 包住）。寫教學/示範檔要注意這點。

## 10. is：比 === 更嚴謹
```js
Object.is(NaN, NaN)  // true （=== 是 false！）
Object.is(0, -0)     // false（=== 是 true！）
```

## 11. hasOwn：檢查自有屬性（取代舊 hasOwnProperty）
```js
Object.hasOwn(person, "name")      // true
Object.hasOwn(person, "toString")  // false（繼承來的不算自有）
// 比 obj.hasOwnProperty() 安全：Object.create(null) 的物件也能用
```

## 12. groupBy（ES2024，較新）
```js
Object.groupBy(people, p => p.age)   // 依 age 分組成物件 { 20:[...], 30:[...] }
// 很新的 API，舊瀏覽器可能不支援
```

### 為何資料用「物件陣列」而不是「陣列的陣列」？
純粹資料表示的選擇，兩種 groupBy 都能跑，差在 callback 怎麼取 key：

| | 物件陣列 `[{name,age}]` | 陣列的陣列 `[["Abby",20]]` |
|---|---|---|
| callback 取 key | `p => p.age`（有欄位名，好讀） | `p => p[1]`（靠位置，難讀易錯） |
| 適合 | 有欄位名的資料（人 / API 清單） | 純位置對應（座標 / CSV 列 / Map entries） |

→ 有「欄位名」就用物件陣列；純位置對應才用陣列的陣列。

---

## 速查表（分類記憶）
| 分類 | 方法 |
|------|------|
| 讀屬性 | `keys` / `values` / `entries` / `getOwnPropertyNames` / `getOwnPropertySymbols` |
| 複製合併 | `assign`（淺拷貝；現代用 `{...obj}`） |
| 物件↔鍵值對 | `entries` ↔ `fromEntries` |
| 建立 / 原型 | `create` / `getPrototypeOf` / `setPrototypeOf` |
| 屬性描述/定義 | `getOwnPropertyDescriptor(s)` / `defineProperty` / `defineProperties` |
| 凍結保護 | `preventExtensions` < `seal` < `freeze`（+ is 系列） |
| 比較 / 檢查 | `is`（嚴謹相等）/ `hasOwn`（自有屬性） |
| 分組 | `groupBy`（ES2024） |

---

## 關聯筆記（補於 2026-08-19）

| 筆記 | 關聯原因 |
| --- | --- |
| [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] | 本篇是「有哪些方法」的清單，那篇是「該挑哪一個」的決策矩陣。那篇把屬性切成四格加一圈，本篇第 1 節的 keys 與第 8 節的 getOwnPropertyNames 差在哪，去那篇看主軸圖最快 |
| [[Console方法家族-一次講完]] | 本篇範例都是開 F12 看 Console，那篇講怎麼用 console.table 把這些輸出印成表格 |

---

## 兩個盒子｜靜態 vs 實例的判準（2026-08-19 追問）

> [!question] 起因
> 「不是 static method，所以是 `map.set(...)` 而不是 `Map.set(...)`」這句話看不懂。
> 本篇開頭那個 callout 已經講了「靜態掛建構函式、實例掛 prototype」，這一節補上**為什麼**以及**怎麼判斷**。

### 核心：`Object` 與 `Object.prototype` 是兩個不同的物件

```js
Object === Object.prototype     // false
typeof Object                   // "function" ← 建構函式
typeof Object.prototype         // "object"   ← 一個 plain object

Object.getOwnPropertyNames(Object).length            // 26 ← 左盒
Object.getOwnPropertyNames(Object.prototype).length  // 12 ← 右盒
```

![[學習JS_圖解_靜態方法與實例方法的兩個盒子_2026-08-19.svg]]

| | 左盒 `Object` | 右盒 `Object.prototype` |
| --- | --- | --- |
| 住在這裡的是 | **靜態方法** | **實例方法／存取器屬性** |
| 例子 | `Object.keys`、`Object.assign`、`Object.hasOwn`、`Object.getPrototypeOf` | `hasOwnProperty`、`toString`、`valueOf`、`__proto__` |
| 怎麼寫 | 物件當**參數**傳進去 | 物件寫在**點的左邊** |
| 吃 `this` 嗎 | 不吃 | **吃**，那個物件就是 `this` |
| 拆下來單獨呼叫 | 沒事 | 爆 `TypeError` |

### 判準：這個方法需不需要知道「對誰做」

```js
map.set('a', 1)
 ↑                    ← 這個 map 就是 this，告訴 set「要塞進哪一個 Map」

Object.assign(target, source)
       ↑              ← Object 只是命名空間，不是操作對象
```

`Map.set(m, 'a', 1)` 之所以不行，是因為 `Map` 這個盒子裡**根本沒有 `set` 這個東西**：

```js
Object.hasOwn(Map.prototype, 'set')   // true  ← 住右盒
Object.hasOwn(Map, 'set')             // false ← 左盒沒有
typeof Map.set                        // "undefined"
Map.set(m, 'a', 1)                    // TypeError: Map.set is not a function
```

### 反證一：把 `this` 拿掉就爆炸

```js
const detached = m.set;
detached('c', 3);
// TypeError: Method Map.prototype.set called on incompatible receiver undefined
//                                            ↑ 訊息直接說「接收者不對」，接收者就是 this
```

對照靜態方法，拆下來完全沒事：

```js
const assign = Object.assign;
assign({}, { a: 1 });    // { a: 1 } ← 因為它本來就不吃 this
```

### 反證二：既然只是 `this`，就可以「借」

```js
Map.prototype.set.call(m, 'b', 2);   // 有效！m.get('b') === 2
```

**這跟 React 原始碼裡那招是同一件事**：

```js
var hasOwnProperty = Object.prototype.hasOwnProperty;
hasOwnProperty.call(config, propName);   // 借出來，用 .call 硬指定 this 是 config
```

### 同一個建構函式可以兩種都有

```js
Object.getOwnPropertyNames(Map)   // ["length", "name", "prototype", "groupBy"]

Map.groupBy(people, p => p.age)   // 靜態：資料當參數傳進去（ES2024）
grouped.get(20)                   // 實例：grouped 在點的左邊
```

`Array` 也一樣：`Array.isArray()`、`Array.from()` 是靜態，`arr.push()`、`arr.map()` 是實例。

### 回到 `__proto__`

```js
Object.hasOwn(Object.prototype, '__proto__')      // true  ← 住右盒 → 不是靜態
Object.hasOwn(Object, '__proto__')                // false
Object.hasOwn(Object, 'getPrototypeOf')           // true  ← 住左盒 → 是靜態

const d = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');
typeof d.value    // "undefined" ← 沒有 value
typeof d.get      // "function"  ← 有 get 與 set → 存取器屬性，不是方法
```

> [!warning] 一個要澄清的地方
> `Object.hasOwn` 的功能只有一個：**檢查某個 key 是不是某個物件的自有屬性**。
> 它**不是「測靜態方法」的工具**。我只是拿它當尺，**用同一把尺量兩個盒子**，藉此推斷東西住哪。

### 兩個閱讀程式碼的小問題

| 問題 | 答案 |
| --- | --- |
| 為什麼有空的 `console.log()` | 印一行空行，純粹排版用。輸出一多就需要分段，不然全部黏在一起很難讀 |
| 為什麼要 `const d = ...` 再用 | 因為後面用了 6 次。`Object.getOwnPropertyDescriptor` **每次呼叫都回傳一個全新的物件**（`d1 === d2` 是 `false`），存成變數可以少造 5 個物件，也讓程式碼短很多 |
| `var names = Object.getOwnPropertyNames(...)` 是「實例化」嗎 | **不是。** 那只是「函式呼叫 ＋ 賦值」。詳見下方「三個詞不要混」 |

### 三個詞不要混：實例化 vs 函式呼叫 vs 賦值

```js
var names = Object.getOwnPropertyNames(Object.prototype);
//          └──────────── 函式呼叫 ────────────┘
//    └─ 賦值：把回傳值存進變數
```

| 詞 | 意思 | 長相 |
| --- | --- | --- |
| **實例化 instantiation** | 用**建構函式 ＋ `new`** 做出一個實例 | `new Map()`、`new Date()` |
| **函式呼叫 function call** | 丟參數進去、拿回傳值出來 | `Object.getOwnPropertyNames(x)` |
| **賦值 assignment** | 把值存進變數 | `var names = ...` |

**證據：`Object.getOwnPropertyNames` 根本不是建構函式，不能被實例化。**

```js
Object.hasOwn(Object.getOwnPropertyNames, 'prototype')   // false ← 它連 prototype 都沒有
typeof Object.getOwnPropertyNames.prototype              // "undefined"

names instanceof Object.getOwnPropertyNames
// TypeError: Function has non-object prototype 'undefined' in instanceof check

new Object.getOwnPropertyNames(Object.prototype)
// TypeError: Object.getOwnPropertyNames is not a constructor
```

對照真正的建構函式：

```js
typeof Map.prototype          // "object" ← Map 有 prototype
const m = new Map();
m instanceof Map              // true
```

> [!note] 一個誠實的補充
> `names` **本身確實是 `Array` 的實例**（`names instanceof Array` 是 `true`），那個陣列是引擎內部建出來的。
> 但「`names` 是 `Array` 的實例」跟「`names` 是 `getOwnPropertyNames` 的實例化」是兩件不同的事 ——
> **實例是相對於「建構函式」而言的，不是相對於「產出它的那個函式」。**

還有一個常見誤會：`names` 裡面裝的是 **12 個字串**（屬性的名字），不是 12 個 `Object.prototype`。
斷句是「`Object.prototype` 是**一個**物件，它**有** 12 個自有屬性」，`getOwnPropertyNames` 把那 12 個**名字**收集成陣列還給你。

```js
names.length      // 12
typeof names[0]   // "string"
names[0]          // "constructor"
```

> [!note] 可執行腳本
> `static-vs-instance-判準.js`（六段輸出，含 Map、Array、Object 的對照表）

### 關聯

| 筆記 | 關聯原因 |
| --- | --- |
| [[Object建構子-plain-object的建立與存取]] | j 節說 `__proto__` 住右盒，本節說明「住哪個盒子」怎麼判斷 |
| [[Map.prototype完整清單-實例方法與存取器]] | 把 Map 整個攤開來套這個判準 |
| [[存取器屬性三種定義方式-getter-setter與資料驗證]] | 右盒裡除了實例方法還有存取器，那篇講存取器怎麼做出來 |

---

## 補充｜getOwnPropertySymbols 的可執行範例（2026-08-20）

同資料夾的 `object-getOwnPropertySymbols-demo.js`：把四種 key（字串／Symbol × 可列舉／不可列舉）都放進一個物件，再用八個方法各撈一次，用 `console.table` 印出涵蓋範圍對照表。

重點結論：**Symbol 鍵只有 `getOwnPropertySymbols` 與 `Reflect.ownKeys` 撈得到**，`Object.keys`、`getOwnPropertyNames`、`JSON.stringify` 全部看不到。這也是 Symbol 常被拿來當「半私有欄位」的原因 —— 注意是「半」，因為 `getOwnPropertySymbols` 還是撈得出來。

Symbol **型別本身**怎麼運作（`Symbol()` vs `Symbol.for()`、登錄表、跨模組共用）不在這裡，在 [[Symbol-符號型別與物件key]]。
