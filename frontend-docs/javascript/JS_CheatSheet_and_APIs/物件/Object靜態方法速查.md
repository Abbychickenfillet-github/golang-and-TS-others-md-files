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
