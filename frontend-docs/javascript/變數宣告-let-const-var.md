# 變數宣告：let / const / var

> 相關：[[loops-and-increment-operators]]、[[靜態檢查vs動態檢查-TS-vs-JS]]、[[記憶體模型-stack-heap-動態配置-GC]]
> 行事曆練習主題（let vs var + 作用域）

> [!important] 實務慣例
> **預設一律用 `const`；確定要「重新賦值」才用 `let`；`var` 幾乎不用（舊語法、有坑）。**

---

## let vs const（最常用，差別只有「能不能重新賦值」）

| | `const` | `let` |
|---|---|---|
| 重新賦值 | ❌ 不能 | ✅ 可以 |
| 宣告要給初值 | 必須 | 可不給（undefined） |
| 作用域 | 區塊 `{}` | 區塊 `{}` |

```js
const a = 1; a = 2;   // ❌ TypeError: Assignment to constant variable
let b = 1;   b = 2;   // ✅
const c;              // ❌ SyntaxError：const 一定要給初值
let d;                // ✅ undefined
```

### ⚠️ const 不是「內容不能改」，是「不能重新賦值」
```js
const arr = [1, 2];
arr.push(3);   // ✅ 改內容可以 → [1,2,3]
arr = [9];     // ❌ 重新賦值不行

const obj = { name: "Abby" };
obj.name = "Joe";  // ✅ 改屬性可以
obj = {};          // ❌ 重新賦值不行
```
→ `const arr` / `const obj` 還能 push、改屬性，就是因為「改內容 ≠ 重新賦值」。

#### 所有「修改原陣列」的方法都能用 const
```js
const arr = [1, 2, 3];
arr.push(4);      // ✅ 加到尾
arr.pop();        // ✅ 移除尾
arr.unshift(0);   // ✅ 加到頭
arr.shift();      // ✅ 移除頭
arr.splice(1, 1); // ✅
arr.sort();       // ✅
arr.reverse();    // ✅
arr[0] = 99;      // ✅ 改某格
arr.length = 0;   // ✅ 清空
arr = [];         // ❌ 只有「重新賦值」不行 → TypeError
```
> 不用背哪些方法可以：只要問「**我在改它的內容，還是讓變數指向全新的東西？**」
> 改內容 → const 永遠 OK；`=` 重新指向 → 才需要 let。
> （`map`/`filter`/`slice`/`concat` 回傳新陣列、不改原本，對 const 也沒問題。）

---

## let/const vs var（var 的三個坑）

| | `let` / `const` | `var` |
|---|---|---|
| 作用域 | **區塊** `{}`（if/for 內外分開） | **函式**（會漏出 if/for） |
| 提升 hoisting | 有 TDZ，宣告前用會報錯 | 提升並初始化為 `undefined`（不報錯，易出 bug） |
| 重複宣告 | ❌ 同層不能重複 | ✅ 可重複（容易誤蓋） |

### 坑 1：var 沒有區塊作用域（會漏出去）
```js
if (true) { var x = 1; let y = 2; }
console.log(x);   // 1   ← var 漏到外面
console.log(y);   // ❌ ReferenceError ← let 鎖在 {} 內
```

### 坑 2：TDZ（暫時性死區）
```js
console.log(v);   // undefined（var 被提升並初始化）
var v = 1;

console.log(l);   // ❌ ReferenceError（let 在 TDZ，宣告前不能用）
let l = 1;
```

> [!note] TDZ 和「區塊作用域」是兩個不同概念，別搞混
> 兩個都跟 `let`/`var` 有關，但問的是不同的事：
>
> | 概念 | 在問什麼 | 軸線 |
> |---|---|---|
> | **作用域**（區塊 vs 函式） | 變數「**能在哪裡**」被存取 | 空間（`{}` 內外） |
> | **TDZ 暫時性死區** | 變數「**從哪一行起**」能被存取 | 時間／順序（宣告那行的上下） |
>
> ```js
> {
>   // console.log(y);  // ❌ TDZ（在區塊內，但在 let 之前 → 時間軸）
>   let y = 2;
>   console.log(y);     // ✅ 2
> }
> // console.log(y);    // ❌ ReferenceError（跑出區塊了 → 空間軸）
> ```
> 兩行都丟 `ReferenceError`，但原因不同：一個是「太早用」，一個是「在外面用」。
>
> `var` 剛好兩個坑都踩（沒區塊作用域＋提升成 `undefined`），所以常被一起講；
> `let`/`const` 把兩件事都修好（鎖在區塊內＋TDZ 擋提早用），但它們是**兩個獨立的保護機制**。
> 一句話：**作用域決定「進不進得去」，TDZ 決定「到了沒」。**

### 坑 3：迴圈 + setTimeout 經典差異
```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 3 3 3
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 0 1 2
```
`var` 整個迴圈共用同一個 `i`；`let` 每圈是獨立的 `i`（區塊作用域）。

---

## 一句話總結
- **能不能重新賦值** → 不能用 `const`、要就 `let`。
- **const 鎖的是「綁定」不是「內容」** → 物件/陣列內容照樣可改。
- **var 有函式作用域 + 提升 + 可重複宣告三個坑** → 現代別用。
