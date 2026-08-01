# map：把陣列轉換成新陣列（重點 + 練習）

> 來源練習：`JavaScript-practicing/while-loop.html`
> 相關：[[陣列遍歷-forEach與callback]]、[[for...in]]、[[常見錯誤-括號引號沒收尾]]
> MDN：<https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/map>

> [!important] 🔑 全篇最重點
> `map` 把舊陣列「一個一個加工」變成**等長的新陣列**。callback **`return` 什麼，新陣列那格就是什麼**。
> map **回傳新陣列、不動原陣列** —— 這是它和 forEach 的命根子差別。

---

## map vs forEach（命根子差別）

| | forEach | **map** |
|---|---|---|
| 回傳 | `undefined` | **新陣列** |
| callback 要 `return` | 不用 | **一定要 return**（回傳值＝新陣列的元素） |
| 原陣列 | 不變（除非自己 `array[index]=` 改） | 不變 |
| 用途 | 每個元素**做事**（副作用） | 每個元素**轉換**後收集成新陣列 |

口訣：**forEach ＝ 做事（副作用），不回傳；map ＝ 轉換，回傳新陣列。**

---

## ⚠️ 最常見的坑：忘記 return

```js
let bad  = numbers.map(n => { n * 2 })       // ❌ [undefined, undefined, ...]
let good = numbers.map(n => n * 2)           // ✅ 箭頭函式「沒大括號」會自動 return
let good2= numbers.map(n => { return n * 2 })// ✅ 有大括號 {} 就要自己寫 return
```
規則：**箭頭函式加了 `{}` 就必須自己 `return`；沒加 `{}` 才會自動回傳。** 故意踩一次體會它。

---

## 📈 五階段練習（直接寫進 while-loop.html）

### Lv1：數字轉換 + 確認原陣列沒變
```js
let numbers = [4, 5, 9, 10, 11]
let doubled = numbers.map(n => n * 2)
console.log(doubled)   // [8,10,18,20,22]
console.log(numbers)   // [4,5,9,10,11] ← 原陣列沒變
```

### Lv2：字串轉換
```js
let names = ["John", "Jane"]
let upper = names.map(name => name.toUpperCase())   // ["JOHN","JANE"]
```
> 小提醒：參數別跟陣列同名（`names => names...` 雖能跑但易混淆，用單數 `name`）。

### Lv3：從「物件陣列」抽欄位（前端最常用 ⭐）
```js
let people = [{name:"John",age:20},{name:"Jane",age:21},{name:"Jim",age:22}]
let onlyNames = people.map(p => p.name)                  // ["John","Jane","Jim"]
let labels    = people.map(p => `${p.name} is ${p.age}`) // ["John is 20", ...]
```
之後 React 把資料渲染成畫面，幾乎都是 `data.map(...)`。

### Lv4：用第二參數 index
```js
let withNo = names.map((name, index) => `${index + 1}. ${name}`)  // ["1. John","2. Jane"]
```

### Lv5：串接（map 回傳陣列，可繼續接）
```js
let result = numbers.filter(n => n % 2 === 0).map(n => n * 10)
// filter 留下符合條件的 → 再 map 各 ×10
```

---

## 用 map「消除副作用」（對照 forEach 的 triple）

```js
// 副作用版（forEach 改原陣列）
function triple(element, index, array){ array[index] = element * 3 }
numbers.forEach(triple)      // numbers 被永久改掉 😱

// 乾淨版（map + return，原陣列不動）
let tripled = numbers.map(n => n * 3)
console.log(tripled)  // [12,15,27,30,33]
console.log(numbers)  // [4,5,9,10,11] 不變 ✅
```
詳見 [[陣列遍歷-forEach與callback]] 的「副作用 side effect」段。

---

## 自我檢查
```js
console.log(Array.isArray(numbers.map(n => n)))  // true ← map 給你陣列
```

## 練習順序建議
Lv1 看差別 → **Lv3 練抽欄位（最有用）** → 故意踩 return 坑 → Lv5 串接。
