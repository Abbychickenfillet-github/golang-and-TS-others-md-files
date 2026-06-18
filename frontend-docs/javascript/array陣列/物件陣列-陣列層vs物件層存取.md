# 物件陣列：陣列層 vs 物件層 存取

> 可執行練習：`JavaScript-practicing/array-of-objects-存取練習.html`
> 相關：[[map-轉換陣列重點與練習]]、[[陣列遍歷-forEach與callback]]、[[Object靜態方法速查]]

> [!important] 核心心法
> 物件陣列 `[{...}, {...}]` 是**兩層**：
> - **外層是「陣列」→ 用陣列方式**（`length` / `[i]` / `map` / `filter` / `for...of`）走訪整個清單。
> - **拿出的每個元素是「物件」→ 用物件方式**（`.name` / `["age"]` / `Object.keys`）讀單筆欄位。
> 兩種都用，只是用在**不同層**，不是二選一。

---

## 分層圖

```
people            ← 陣列 array  → people.length / people[0] / people.map() / for...of
  │
  └ people[0]     ← 物件 object → people[0].name / people[0].age
```

## 最常見的一行（兩層一起用）

```js
people.map(p => p.age)
//     └┬┘   └──┬──┘
//   陣列方法   物件存取
//  (走整個清單) (讀單筆欄位)
```
`.map()` 是**陣列**方法（因為 people 是陣列）；裡面的 `p` 是**物件**，`p.age` 是**物件**存取。

## 範例

```js
const people = [
  { name: "Abby", age: 20 },
  { name: "Joe",  age: 30 }
];

// 陣列層
people.length          // 2
people[0]              // { name:"Abby", age:20 }
Array.isArray(people)  // true

// 物件層（先用 index 拿一筆，再讀欄位）
people[0].name         // "Abby"
people[1].age          // 30
Array.isArray(people[0]) // false ← 元素是物件不是陣列

// 合體
people.map(p => p.name)            // ["Abby","Joe"]
people.filter(p => p.age === 20)   // [{Abby}]
```

## 對照：陣列的陣列（兩層都用 index）

```js
const peopleArr = [["Abby", 20], ["Joe", 30]];
peopleArr[0]      // ["Abby", 20]   外層 index
peopleArr[0][1]   // 20             內層也是 index（不是 .age）
peopleArr.map(p => p[1])   // [20,30]  p[1] 靠位置記，難讀
```

| | 內層怎麼讀 | 可讀性 |
|---|---|---|
| 物件陣列 `[{...}]` | `people[0].age`（名字） | ✅ 清楚 |
| 陣列的陣列 `[[...]]` | `peopleArr[0][1]`（位置） | ❌ 要記 index 代表啥 |

## 記憶

- **外層 array → 陣列方法；內層 object → 物件存取。** 各管一層。
- 看到 `people.map(p => p.xxx)`：`map` 是陣列的、`p.xxx` 是物件的。
- 不確定就 `Array.isArray(x)` 驗證「這層是不是陣列」。
