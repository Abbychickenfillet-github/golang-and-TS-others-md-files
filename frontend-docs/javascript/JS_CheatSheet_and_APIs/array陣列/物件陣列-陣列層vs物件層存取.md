---
title: "物件陣列-陣列層vs物件層存取"
---

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

---

## 實戰案例｜`c[0]` `c[1]` `c[2]` 是什麼（2026-08-19 追問）

> [!question] 起因
> 在 `object-prototype-F12探測.html` 裡看到這段渲染表格的程式碼，問「`c[0]`、`c[1]`、`c[2]` 代表什麼」。
> 答案就是本篇「對照：陣列的陣列」那一節在講的事，這裡補上實例。

### 資料長什麼樣

```js
var checks = [
  ['Object.getPrototypeOf(Object.prototype)', 'null',   '這是原型鏈的終點，規格明文寫死'],
  ['Object.keys(Object.prototype)',           '[]',     '12 個成員全部 enumerable 為 false'],
  ['typeof Object.prototype',                 'object', '它自己就是一個 plain object'],
];
//  └────────── 位置 0 ──────────┘  └── 1 ──┘  └────────── 位置 2 ──────────┘
```

`checks` 是**陣列的陣列**，外層每個元素自己也是陣列，裡面固定裝三樣東西。
所以 `c[0]`、`c[1]`、`c[2]` 只是**照位置**把那三樣挖出來：

| 索引 | 裝的是 | 渲染到哪 |
| --- | --- | --- |
| `c[0]` | 指令的原始碼字串 | 表格第 1 欄 |
| `c[1]` | 那行指令跑出來的結果 | 表格第 2 欄 |
| `c[2]` | 給人看的中文說明 | 表格第 3 欄 |

陣列沒有欄位名字，只有位置，這就是為什麼一定要用 index 而不能寫 `c.結果`。

### 括號斷句：三件事都在 callback 裡面

正確的斷句是「從 `function (c) {` 到 `}` 之間**三件事一組**」：

```js
checks.forEach(function (c) {              // c 是「其中一筆」，長度 3 的陣列
  var tr = document.createElement('tr');   // 1. 造一個空的 <tr>
  tr.innerHTML =                           // 2. 拼出三個 <td> 塞進去
    '<td class="m">' + c[0] + '</td>' +
    '<td class="k">' + c[1] + '</td>' +
    '<td class="f">' + c[2] + '</td>';
  cb.appendChild(tr);                      // 3. 把這一列掛進 <tbody>
});
```

> [!warning] 把 `}` 提前的後果（實測）
> 如果寫成 `forEach(function(c){ var tr = ...; } tr.innerHTML = ...; })`，會踩到兩個錯：
> a. `SyntaxError: missing ) after argument list` —— `}` 提前關掉 callback，後面就不是合法參數了
> b. 就算語法喬對，`var tr` 宣告在 callback 的函式作用域裡，離開大括號就存取不到，變成 `ReferenceError: tr is not defined`
> 這條接回 [[陣列遍歷-forEach與callback]] 的「逐句拆解」段落。

### 三種寫法由差到好

| 寫法 | 內層怎麼讀 | 什麼時候用 |
| --- | --- | --- |
| 陣列的陣列 `[[...]]` | `c[1]`　靠位置 | 純位置對應的資料：座標、CSV 的一列、`Object.entries` 的結果 |
| **解構賦值** `function ([指令, 結果, 說明])` | `結果`　有名字 | 資料是陣列的陣列但想好讀，**改動最小、CP 值最高** |
| 物件陣列 `[{...}]` | `c.結果`　有欄位名 | 有語意欄位的資料：人、商品、API 清單 |

解構版只改參數那一行，資料完全不用動：

```js
checks.forEach(function ([指令, 結果, 說明]) {
  tr.innerHTML = '<td>' + 指令 + '</td><td>' + 結果 + '</td><td>' + 說明 + '</td>';
});
```

> [!note] 誠實檢討
> 我當初在探測頁用陣列的陣列，純粹是圖資料寫起來短。
> 但「會讓讀的人問 `c[1]` 是什麼」本身就是這個寫法的缺點被證實了 ——
> 有語意欄位的資料，本來就該用物件陣列或至少解構。

### 順帶一提：`forEach` 的 callback 有三個參數

```js
checks.forEach(function (c, i, arr) {
  // c   = 目前這一筆
  // i   = 目前的索引 0, 1, 2
  // arr = 整個 checks 陣列本身
});
```

只寫 `c` 是因為後兩個用不到。**不需要的參數可以直接不寫**，JS 不會因為少收參數就報錯。
詳見 [[陣列遍歷-forEach與callback]] 的「callback 會自動收到 3 個參數」。

> [!tip] 可執行的互動版
> 同資料夾的 `陣列的陣列渲染成表格-c0c1c2是什麼-互動版.html`：
> 點 `c[0]` `c[1]` `c[2]` 標籤可以把對應的欄位淡出，直接看出哪個索引對到哪一欄。

### 關聯

| 筆記 | 關聯原因 |
| --- | --- |
| [[陣列遍歷-forEach與callback]] | 括號斷句與三個參數的完整說明在那篇 |
| [[Object建構子-plain-object的建立與存取]] | `checks` 裡那些指令的內容出自那篇的 g 節與 j 節 |
| [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] | `Object.keys(Object.prototype)` 為什麼是 `[]` 的完整解釋 |
