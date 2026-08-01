# JavaScript `for...in` 迴圈(完整版)

> 路徑:frontend-docs / javascript / 物件 / 迴圈遍歷 / for...in
> 相關:[[for...of]]、[[JavaScript-字串方法]]、[[index-explanation]]、[[for-in-vs-Object-keys-medium]]、[[字串組合-樣板字面值vs加號串接]]、[[loops-and-increment-operators]]
> MDN:<https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Statements/for...in>
> 來源練習:`JavaScript-practicing/while-loop.html`(`showProps` / `showObject`)

## 一句話
`for...in` 走的是「**物件的可列舉屬性的鍵名(key)**」,會**連原型鏈上繼承來的**可列舉屬性一起走,而且**不保證順序**。

---

## 0. 我練習時的觀察(基礎,逐條記錄)

### ① `${key}${value}` 會報 ReferenceError ✅
`for...in` **只給一個變數**(命名 `i`,內容是 key)。`key`、`value` 沒宣告 → ReferenceError。要寫 `${i}` 和 `${Joe[i]}`。

### ② 取值必須用 `obj[i]`(中括號),不能 `obj.i` ✅
```js
Joe[i]   // ✅ i 是變數,內容是 "name" → 等於 Joe["name"]
Joe.i    // ❌ 會找名叫「i」的屬性(不存在)→ undefined
```
口訣:**key 存在變數裡 → 一定用中括號 `obj[變數]`。**

### ③ 包進函式要用參數 `obj`,不能寫死 `Joe` ✅(重要)
```js
function showProps(obj, objName) {
  for (const i in obj) {            // ✅ 用參數 obj,傳誰就處理誰
    result += objName + "." + i + " = " + obj[i] + "\n"
  }
  return result
}
```
寫死 `Joe` 的話,函式永遠只能處理 Joe。⚠️ `showObject` 裡寫 `for (const f in Joejo)` 同樣要改成 `obj`。

### ④ 「for 不是會自己跑嗎?為何要寫 function?」
關鍵不是 for,是 **function**:最外層的碼載入就跑;函式**裡**的碼要**被呼叫**才跑(`showProps(Joe,"Joe")`)。

### ⑤ `return` 後面的程式碼是死碼
`return` 一執行函式立刻結束,後面的 `console.log(result)` 永遠跑不到。要 log 放 return 之前;值要 `return` 出來外面才拿得到。

### ⑥ 累加用的 `let result` 要放 function「裡面」
```js
function showProps(obj, objName){
  let result = "";          // ✅ 放裡面:每次呼叫都從空字串重新開始
  for(const i in obj){ result += objName + "." + i + " = " + obj[i] + "\n" }
  return result
}
```
- 放**外面**的話 `result` 不會歸零,第二次呼叫會接著上次的內容越接越長(經典 bug)。
- 判斷口訣:**「這個變數該不該每次呼叫就重置?」要重置 → 放裡面**（絕大多數情況）；想跨呼叫持續累積（少見）才放外面。

### ⑦ 裡外同名的 `result` 會衝突嗎？→ 不會（作用域 / 遮蔽）

`let` 有**作用域**：function 裡面的 `result` 和外面的 `result` 是**兩個不同的變數**，只是同名，住不同房間，不會打架。

```js
let result = ""            // A：外層變數
function showProps(obj){
  let result = ""          // B：裡層變數（完全是另一個）
  return result            // 丟出去的是 B 的「值」(字串)，不是變數本身
}
```

- 不同作用域同名 → **不會報「重複宣告」**；裡層的 B 會「**遮蔽 shadow**」外層 A，函式內碰不到 A。
- `return` 拋出的是**值**（字串），與外層 A 無關。
- **只有「同一個作用域」用 `let` 宣告兩次同名才會 SyntaxError**：
  ```js
  let result = ""; let result = ""   // ❌ 同層重複宣告
  ```
- 建議：既然把 `let result` 搬進 function，外面那行就**沒人用了，直接刪掉**，別留著混淆。

### ⑧ 為什麼要 `result + return`？不是 `console.log` 就好嗎？

差別在「**結果最後要拿去做什麼**」：

| | 只用 `console.log` | `result += ...` + `return result` |
|---|---|---|
| 結果在哪 | F12 console（印完就沒了） | 變成一個**字串值**，可自由運用 |
| 能塞進網頁嗎 | ❌ 不行 | ✅ `innerText = showProps(...)` |
| 能存 / 再加工 | ❌ 拿不回來 | ✅ 可以 |

- 只想「看一眼」→ 直接 `console.log`，不用 result（之前的練習就是）。
- 想把結果「**拿出來用**」（顯示在網頁、存起來、再加工）→ 必須 `result` 累積 + `return` 交出去。
- 本練習 line 136 `document.getElementById("output").innerText = showProps(Joe,"Joe")` 正是要顯示在網頁，所以**非用 result + return 不可**，不是多此一舉。
- 口訣：**`console.log` ＝ 印出來看；`return` ＝ 交出去用。**
- 補充：MDN 用 `var` 是舊寫法，現在用 `let`。

### ⑨ 呼叫函式（showObject）常見的 3 個錯

```js
function showObject(obj, objName){ ... }
document.getElementById("output2").innerText = ShowObject(Joejo, Joe2)
```
1. **大小寫**：`ShowObject` ≠ `showObject` → `ReferenceError: ShowObject is not defined`。呼叫要跟定義一字不差。
2. **第二參數要傳「字串」**：`objName` 是物件名稱字串（`objName + "." + f`），應傳 `"Joejo"`，不是變數；且 `Joe2` 根本沒宣告 → ReferenceError。
3. **函式內又寫死物件名**：`for(const f in Joejo)`、`Joejo[f]` 要全改成參數 `obj`，不要前後一個 `Joejo` 一個 `obj` 混用（同觀察 ③）。

其他注意：
- DOM 目標元素要存在：HTML 沒有 `id="output2"` → `getElementById` 回 `null` → `.innerText` 報 `Cannot set properties of null`。
- `result` 一圈別重複累加多種格式，除非真的想要每屬性印多行。

---

## 1. 「properties」= 鍵名,不是值
每一圈拿到鍵名(字串),值要自己用 `obj[key]` 取:

```js
const user = { name: "Abby", age: 30 };
for (const key in user) {
  // key = "name" → "age"
  // user[key] = "Abby" → 30
}
```

對照:`for...in` 走「鍵」,[[for...of]] 走「值」。

## 2. 會連「繼承來的可列舉屬性」一起走 → 看原型鏈

![原型鏈與類陣列](原型鏈-prototype-chain.png)

陣列其實是物件,找方法時會沿著 `[[Prototype]]` 一路往上:
`arr` → `Array.prototype` → `Object.prototype` → `null`。

`for...in` 會走完整條鏈,但**只列出「可列舉(enumerable)」屬性**:
- 內建方法(`forEach`、`indexOf`、`toString`…)都是 **不可列舉** → 不會出現。
- 但你**自己加到 prototype 上的屬性**預設可列舉 → 會被一起走到(常見 bug):

```js
Array.prototype.myCustom = function () {};
const arr = ["a", "b"];
for (const i in arr) {}   // "0" "1" "myCustom" ← 多了繼承屬性
```

防呆:只留「自己的」屬性

```js
for (const key in obj) {
  if (Object.hasOwn(obj, key)) {   // = obj.hasOwnProperty(key)
    // 只處理 obj 自有屬性
  }
}
```

> **enumerable(可列舉)**:每個屬性身上的旗標。`obj.x = 1` 建的預設 `true`;內建方法被設成 `false` 來「隱身」。

### 在 F12(DevTools)怎麼自己看?
在 Console 貼:

```js
const arr = ["a", "b"];
console.dir(arr);                              // 展開 [[Prototype]] 看整條鏈
Object.getPrototypeOf(arr) === Array.prototype; // true(上一層是 Array.prototype)
Object.getPrototypeOf(Array.prototype) === Object.prototype; // true
Object.getOwnPropertyDescriptor(Array.prototype, "forEach").enumerable; // false ← 不可列舉
Object.keys(arr);                 // ["0","1"]   只有可列舉自有屬性
Object.getOwnPropertyNames(arr);  // ["0","1","length"]  連不可列舉也列
```

`console.dir(arr)` 後點開 **`[[Prototype]]`**(舊版叫 `__proto__`)就能一層層看到 `Array.prototype` → `Object.prototype`。

## 3. 類陣列 array-like(和原型鏈有關)
「長得像陣列」= 有數字鍵 `0,1,2…` 和 `length`,**但它的 `[[Prototype]]` 不是 `Array.prototype`**,所以**沒有 `forEach`/`map`**:

```js
const like = { 0: "a", 1: "b", length: 2 };
like.forEach;          // undefined ← 沒有這個方法
// like.forEach(...)   // TypeError
```

常見的類陣列:函式裡的 `arguments`、`document.querySelectorAll()` 回傳的 `NodeList`、字串。

轉成真陣列再用陣列方法:

```js
Array.from(like);                       // ["a","b"]  推薦
[...iterable];                          // 展開,但對象要「可迭代」
Array.prototype.slice.call(like);       // 老寫法
```

> 注意:`NodeList` 其實有自己的 `forEach`,但沒有 `map`/`filter`;`arguments` 兩個都沒有。要用陣列方法,先 `Array.from()` 最保險。

## 4. 「arbitrary order」= 順序不保證
ECMAScript **不保證** `for...in` 的遍歷順序,**別依賴它**。現代引擎實務上:整數鍵照數字升冪、其他字串鍵照插入順序——但這只是實作行為,繼承屬性順序更不保證。

結論:**陣列千萬別用 `for...in`**(順序不保證 + 走繼承屬性)。陣列用 `for` / `for...of` / `forEach`;要可靠順序就 `Object.keys()` 取出陣列再跑。

## 5. 遍歷方法地圖(面試常問)
| 類別 | 方法 | 走什麼 / 備註 |
|---|---|---|
| 通用迴圈 | `for`、`while`、`do...while` | 什麼都能配,自己控制索引 |
| 集合遍歷 | `for...of` | 走「值」,限可迭代(陣列/字串/Map/Set) |
| 集合遍歷 | `for...in` | 走「鍵」,含繼承可列舉屬性,順序不保證 |
| 集合遍歷 | `forEach` | 陣列方法,照索引順序,**不能 break** |
| 邊走邊產出 | `map`/`filter`/`reduce`/`find`/`some`/`every` | 技術上也是遍歷,各有目的 |
| 物件→陣列 | `Object.keys`/`values`/`entries` | **不是遍歷,是產生新陣列**,再配上面 |
| 非同步 | `for await...of` | 走非同步可迭代 |

`Object.keys()` 不是「迴圈」,是把物件鍵抽成**新陣列**,要再配 `forEach`/`for...of` 才真的走過去。

## for...in vs Object.keys 快速對照
| | `for...in` | `Object.keys(obj)` |
|---|---|---|
| 回傳 | 無(直接迴圈) | **新陣列** of 鍵 |
| 含繼承屬性 | ✅ 會(含原型鏈) | ❌ 只自有 |
| 含不可列舉 | ❌ 不含 | ❌ 不含 |
| 順序 | 不保證 | 規則明確且穩定 |
| 能否 break | ✅ 可 | 配 `for...of` 可;`forEach` 不可 |
| 建議用途 | 幾乎別用(尤其陣列) | 安全遍歷物件自有屬性 |

```js
// 推薦:安全又可讀
for (const key of Object.keys(obj)) {
  const value = obj[key];
}
```
