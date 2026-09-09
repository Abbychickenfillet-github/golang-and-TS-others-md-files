---
title: 為何 setCount(count++) 無效而 setCount(count + 1) 可以
date: 2026-09-07
tags: [react, javascript, useState, operator, snapshot]
---

# 為何 setCount(count++) 無效而 setCount(count + 1) 可以

![[學習React_圖解_setCount(count++)為何失效-三道關卡_2026-09-07.svg]]

## 名詞先講清楚

a. postfix increment（後置遞增）：`count++`，`++` 放在變數後面
b. prefix increment（前置遞增）：`++count`，`++` 放在變數前面
c. binding（綁定）：變數名字與它指向的值之間的連結。`let` 建立可重新綁定的連結，`const` 建立不可重新綁定的連結
d. ToNumeric：ECMAScript 規格中的抽象操作（abstract operation），意思是「把這個值強制轉成數字型別 Number 或 BigInt」
e. snapshot（快照）：React 每一次 render，元件函式內拿到的 state 值是那一刻的靜態拷貝，不是一個會自己變動的活變數
f. updater function（更新函式）：傳給 `setState` 的函式版本 `prev => prev + 1`，React 結算佇列時才呼叫它

## 一、先回答你的核心問題：count++ 是不是就等於 count = count + 1

**是，但只對了一半。**

a. 相同的部分：`count++` 一定包含一次賦值（assignment），也就是 `count = 舊值 + 1`。這一點你的直覺完全正確
b. 多出來的部分：`count++` 同時還是一個**運算式（expression）**，它有回傳值，而且回傳的是**舊值**
c. 不等價的部分：`++` 會先做 `ToNumeric`，`+` 遇到字串卻是做串接

```js
let s1 = '5'; s1++;              // ToNumeric('5') → 5，再加一 → 數字 6
let s2 = '5'; s2 = s2 + 1;       // 字串串接 → '51'
console.log(s1, s2)              // 6  '51'   兩者並不等價
```

d. 真正精準等價的寫法是 `count = Number(count) + 1`

參考來源｜MDN Increment (++)，查閱日期 2026-09-07
<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Increment>

## 二、規格層拆解：count++ 到底做了幾步

ECMAScript 規格對後置遞增的定義，翻成白話是三步：

1. `oldValue = ToNumeric(count)`　把目前的值轉成數字
2. `count = oldValue + 1`　　　　 **這一步就是「重新賦值」**
3. 整個運算式回傳 `oldValue`　　　回傳的是舊值

用可執行的程式碼翻譯：

```js
function desugarPostfix(readFn, writeFn) {
  const oldValue = Number(readFn())   // step 1
  writeFn(oldValue + 1)               // step 2
  return oldValue                     // step 3
}
```

參考來源｜ECMA-262 Postfix Increment Operator，查閱日期 2026-09-07
<https://tc39.es/ecma262/#sec-postfix-increment-operator>

## 三、在 React 裡，count++ 要闖三道關卡，而且三道都過不了

### 關卡 1：綁定是 const，第 2 步賦值直接 TypeError

```jsx
const [count, setCount] = useState(0)   // 注意這裡是 const
count++                                  // TypeError: Assignment to constant variable.
```

![[學習JS_圖解_++的對象是位置不是值-Reference與const_2026-09-07.svg]]

#### 先搞懂 ++ 的操作對象是什麼

規格裡 `x++` 的第一步**不是**「拿到 x 的值」，而是求值出一個 **Reference Record（參考記錄）**。
Reference Record 有兩個關鍵欄位：

a. **Base**：往哪裡找
b. **ReferencedName**：找哪個名字

| 寫法 | Reference 種類 | Base | ReferencedName | const 管得到嗎 |
| --- | --- | --- | --- | --- |
| `count++` | identifier reference | 作用域的 Environment Record（環境紀錄） | `"count"` | 管得到 → TypeError |
| `obj.n++` | property reference | `obj` 這個物件 | 字串 `"n"` | 管不到 → 合法 |
| `0++` | 不是 Reference，是一個值 | 沒有 | 沒有 | 連解析都過不了 → SyntaxError |

#### 三個常見誤解一次講清楚

**誤解一：++ 是針對那個數值本身**

不是。`++` 要的是「**格子**」，不是「格子裡的東西」。所以對值做 `++` 連跑都跑不到：

```js
0++        // SyntaxError: Invalid left-hand side expression in postfix operation
(1+1)++    // 同樣 SyntaxError
```

**誤解二：`obj.n` 裡的 n 是一個變數**

不是。你在任何作用域都找不到一個叫 `n` 的變數。
`obj.n` **整體**是一個 property reference，`n` 只是「要在 `obj` 裡查的鍵名字串」。

所以「n 會先回傳才 ++」這個講法要修正成：

> 引擎先用這個 reference 去**讀出屬性目前的值**，把那個舊值當成整個運算式的結果，
> 再把加一後的新值**寫回同一個 reference**。

**誤解三：++ 是一個原子動作**

不是，它是「讀 → 加一 → 寫回去」三步。用 accessor property（存取器屬性）可以偷看：

```js
let reads = 0, writes = 0, store = 5
const spy = {
  get n(){ reads++;  return store },
  set n(v){ writes++; store = v }
}
const returned = spy.n++
// reads = 1     ← 對應規格的 GetValue（讀）
// writes = 1    ← 對應規格的 PutValue（寫）
// returned = 5  ← 舊值
// store = 6     ← 新值
```

**const 擋的正是 PutValue 那一步。**

#### const 鎖名字，Object.freeze 鎖內容

這兩件事最常被混在一起：

| | 管什麼 | 例子 |
| --- | --- | --- |
| `const` | 鎖**名字**（binding，綁定） | `const obj = {n:0}; obj.n++` 合法；`obj = {}` TypeError |
| `Object.freeze` | 鎖**內容**（物件的屬性） | `const f = Object.freeze({n:0}); f.n++` → TypeError: Cannot assign to read only property 'n' |

實測（node v22，嚴格模式，2026-09-07）：

```
const c = 0; c++      → TypeError | Assignment to constant variable.
const o = {n:0}; o.n++ → 合法，回傳 0，o.n 變成 1，o 還是同一個物件
Object.freeze(o).n++  → TypeError | Cannot assign to read only property 'n' of object
```

#### 有人真的會對屬性做 ++ 嗎？很常見

a. `counts[ch]++`　字頻統計
b. `stats.hits++`　計數器
c. `arr[i]++`　　　陣列元素累加
d. `retry.times++`　重試次數
e. LeetCode 的計數類題目幾乎都會寫到

#### 為什麼這一節要放在這裡

因為「const 就是不能改」這個誤解，會直接生出 React 裡**最難除錯**的 bug：

```jsx
const [todos, setTodos] = useState([])
todos.push(newItem)      // 完全合法，不會報任何錯（改內容不是改綁定）
setTodos(todos)          // 但參考沒變 → Object.is 相同 → React 跳過重新渲染
```

**資料改了，畫面沒動，而且 console 一片乾淨。**
分清楚「鎖名字」與「鎖內容」，才看得懂那個 bug 為什麼會發生。
延伸見 [[immutable會不會讓舊值塞滿記憶體]]。

參考來源｜MDN const，查閱日期 2026-09-07
<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const>

參考來源｜ECMA-262 Reference Record Specification Type，查閱日期 2026-09-07
<https://tc39.es/ecma262/#sec-reference-record-specification-type>

參考來源｜MDN Object.freeze，查閱日期 2026-09-07
<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze>

### 關卡 2：就算硬改成 let，postfix 回傳的是舊值

```jsx
let local = count          // 把快照抄進 let，語法就過了
setCount(local++)          // local++ 回傳「舊值」，所以 setCount 收到的是舊值
```

a. 排進 React 更新佇列的值等於原本的值
b. React 用 `Object.is` 比較新舊 state，發現一樣，甚至可能連 re-render 都省掉
c. 換成 `setCount(++local)` 表面上會動，但仍然踩到關卡 3，而且 ESLint 會警告你在 render 期間改動不該改的東西

### 關卡 3：count 是這一次 render 的快照，改它不會通知 React

a. 元件函式每 render 一次，就重新執行一次，`count` 是**那一次執行的區域常數**
b. 事件處理器（event handler）會把當時的 `count` 用閉包（closure）鎖住
c. 所以在 handler 裡不管怎麼改本地變數，React 都不知道，也不會重新渲染
d. 唯一能觸發重新渲染的動作是**呼叫 setCount**

參考來源｜React 官方 State as a Snapshot，查閱日期 2026-09-07
<https://react.dev/learn/state-as-a-snapshot>

## 四、延伸陷阱：同一輪連呼叫兩次

```jsx
// 只會加 1
setCount(count + 1)      // count 是快照 3 → 排入 4
setCount(count + 1)      // count 還是快照 3 → 又排入 4
```

```jsx
// 會加 2
setCount(prev => prev + 1)   // 結算時 prev = 3 → 4
setCount(prev => prev + 1)   // 結算時 prev = 4 → 5
```

a. 前者兩次都用同一份快照去算，佇列是 `[4, 4]`
b. 後者放進佇列的是函式，React 結算時會把上一個算完的結果餵給下一個
c. 判斷準則：**新值需要依賴舊值時，一律用 updater function**

參考來源｜React 官方 Queueing a Series of State Updates，查閱日期 2026-09-07
<https://react.dev/learn/queueing-a-series-of-state-updates>

## 五、可執行的範例在哪裡

a. 純 JS（node 執行）：`C:\coding\JavaScript-practicing\postfix-increment.js`
　　執行方式 `node postfix-increment.js`

b. React 互動範例，四個關卡各自一個檔案、各自一個網址
　　先 `cd C:\coding\JavaScript-practicing\react\next-playground` 再 `npm run dev`

| 網址 | 檔案 | 主題 |
| --- | --- | --- |
| /postfix-increment | `app/postfix-increment/page.tsx` | 目錄與閱讀順序 |
| /postfix-increment/01-const-typeerror | `app/postfix-increment/01-const-typeerror/page.tsx` | const 綁定做 count++ 丟 TypeError |
| /postfix-increment/02-postfix-old-value | `app/postfix-increment/02-postfix-old-value/page.tsx` | postfix 回傳舊值，附 prefix 對照組 |
| /postfix-increment/03-correct-plus-one | `app/postfix-increment/03-correct-plus-one/page.tsx` | setCount(count + 1) 與 render 次數觀察 |
| /postfix-increment/04-snapshot-vs-updater | `app/postfix-increment/04-snapshot-vs-updater/page.tsx` | 快照 vs updater function |

　　每一頁畫面下方都直接印出「這一頁的關鍵原始碼」，不用切到編輯器就能對照

c. 本資料夾內的同步副本：`demo-01-postfix-increment.js`、`demo-02-index-page.tsx`、
　　`demo-03-const-typeerror.tsx`、`demo-04-postfix-old-value.tsx`、
　　`demo-05-correct-plus-one.tsx`、`demo-06-snapshot-vs-updater.tsx`

d. 互動測驗：`為何setCount(count++)無效-互動版.html`

## 六、相關題目練習

a. LeetCode 2620. Counter　<https://leetcode.com/problems/counter/>
　　關聯原因：標準解就是 `return n++`，直接考「postfix 回傳舊值」這件事，寫錯成 `return ++n` 答案就整組偏移一格
b. LeetCode 2665. Counter II　<https://leetcode.com/problems/counter-ii/>
　　關聯原因：increment / decrement / reset 三個方法共用同一個閉包變數，正好練習「改的是綁定本身，不是快照」
c. LeetCode 2704. To Be Or Not To Be　<https://leetcode.com/problems/to-be-or-not-to-be/>
　　關聯原因：練習閉包捕捉當下的值，跟 React handler 用閉包鎖住 count 是同一個機制

## 七、關聯筆記

a. [[debounce為什麼一定要setTimeout-以及React的useRef]]
　　關聯原因：那一篇講的 `useRef` 是「改了不會觸發 re-render」的容器，正好是本篇 `useState`「改了會觸發 re-render」的反面對照，兩者一起看才知道該用哪一個
b. [[immutable會不會讓舊值塞滿記憶體]]
　　關聯原因：本篇回答「為什麼不能改」，那一篇回答「不改而是一直生新的，記憶體與 CPU 的代價是什麼」，兩篇合起來才是完整的 React state 心智模型

b. [[V8引擎完整管線-Parse到Deoptimization]]
　　關聯原因：本篇提到 `const count = 0; count++` 在打包器階段就會被擋下，那是 parse 期的錯誤；而 `new Function` 產生的程式碼要到執行期才進 parser，才看得到 TypeError，這個時間差正是 V8 管線的分界
c. [[JS-資料型別]]
　　關聯原因：`++` 走 ToNumeric 而 `+` 對字串走串接，這個差異的根源就是型別強制轉換規則

---

參考來源總表（查閱日期皆為 2026-09-07）

1. MDN Web Docs, Increment (++)　<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Increment>
2. MDN Web Docs, const　<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const>
3. MDN Web Docs, TypeError: invalid assignment to const　<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Invalid_const_assignment>
4. React 官方文件, State as a Snapshot　<https://react.dev/learn/state-as-a-snapshot>
5. React 官方文件, Queueing a Series of State Updates　<https://react.dev/learn/queueing-a-series-of-state-updates>
6. ECMA-262, Postfix Increment Operator　<https://tc39.es/ecma262/#sec-postfix-increment-operator>

---

## 附錄：那 ++count 反而比 count++ 好嗎

**答案：不是「比較好」，只是「壞得比較不明顯」，這反而更危險。**

先把三道關卡拿來逐關比對：

| 關卡 | count++ | ++count | count + 1 |
| --- | --- | --- | --- |
| 1. const 綁定不能賦值 | 過不了，TypeError | **一樣過不了**，TypeError | 過關，完全沒有賦值 |
| 2. 傳給 setCount 的值 | 舊值，等於沒改 | 新值，看起來對了 | 新值，正確 |
| 3. render 期間改動快照（side effect） | 有，違反規則 | **一樣有**，違反規則 | 沒有 |
| 4. 同一輪連呼叫兩次 | 錯 | **一樣錯** | 一樣錯，要改用 updater |

逐點說明：

a. **關卡 1 兩者完全平手。** `++count` 的規格步驟只是把「回傳舊值」換成「回傳新值」，第 2 步的重新賦值一模一樣。所以只要 count 是 `useState` 解構出來的 const，`++count` 照樣丟 `TypeError: Assignment to constant variable.`，根本跑不到 `setCount`

b. **`++count` 唯一贏的地方在關卡 2。** 它回傳新值，所以「假設你已經把 count 換成 let」，畫面確實會動一次。但這正是問題所在：它讓一段觀念錯誤的程式碼「看起來會動」

c. **關卡 3 兩者又平手。** React 規定元件函式在 render 期間必須是純函式（pure function），事件處理器裡改動 render 作用域的變數屬於 side effect（副作用），ESLint 的 `react-hooks` 規則會警告。`++count` 沒有改善這件事，它只是把副作用做得比較成功

d. **關卡 4 兩者還是平手。** 同一輪連寫兩次 `setCount(++local)`，第二次的 `local` 還是同一份快照拷貝，加完仍然只前進一格。唯一解法是 `setCount(prev => prev + 1)`

e. **實務上的判斷順序**（由好到壞）：
　　1. `setCount(prev => prev + 1)`　新值依賴舊值時的標準寫法
　　2. `setCount(count + 1)`　單次、且不依賴連續更新時可以用
　　3. `setCount(++count)`　語法可能直接爆炸，就算沒爆也是靠副作用矇對，不要用
　　4. `setCount(count++)`　一定壞，而且壞得無聲無息

f. **反過來說，`count++` 在哪裡是好的？** 在「你就是想要舊值」的場合，例如產生遞增 ID、走訪陣列索引、或 LeetCode 2620 Counter 的 `return n++`。那些場合的變數是 `let` 或閉包變數，不是 React state，所以三道關卡一道都不存在

**一句話**：這個例子裡不是 `++count` 比 `count++` 好，而是 `count + 1` 比它們兩個都好，因為只有它完全不碰「賦值」這件事。
