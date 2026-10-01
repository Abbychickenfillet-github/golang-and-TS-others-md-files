![[學習React_圖解_一個參數的四層旅行-規格到CPU再到Fiber_ISO5807_2026-09-29.png]]

<!--
貼到 iThome 之前要做兩件事：
一、把上面這行 Obsidian wikilink 刪掉。
二、到 iThome 編輯器上傳同名的 .png，用它回傳的網址改寫成 ![圖說](那個網址)。
本機相對路徑與 wikilink 在 iThome 上都不會有圖，因為它讀不到你電腦裡的檔案。
-->

# Day 28：props 就是參數 —— 從規格書的 `?Yield` 追到 rdi，再追回 Fiber 的 `return`

## 今天要回答的五個問題

1. 規格書裡的 `FormalParameter[Yield, Await] : BindingElement[?Yield, ?Await]` 到底在講什麼？那個 `?` 是三元運算子嗎？
2. 同一個 `?` 符號，在前端到底有幾種完全不同的意思？
3. 一個函式參數在 CPU 那一層是怎麼傳的？什麼時候走暫存器，什麼時候傳指標？
4. Generator 跟 `async/await` 是同一個東西嗎？React 為什麼不用 Generator 來做可中斷渲染？
5. Fiber 的 `child` ／ `sibling` ／ `return` 為什麼是這三個名字？

---

## 一、承接 Day 27：把「身分」這件事一路往下追

Day 27 講的是 `key` —— 它不是效能設定，是身分證，是 `reconcileChildrenArray` 用來決定「這個 fiber 還能不能重用」的依據。

今天把這條線往下追到底。追的方法是挑一個所有人天天在用、但幾乎沒人往下看過的東西：**函式的參數**。

結論先放在這裡，而且這不是我的比喻，是 [React 官方的 Fiber 架構文件](https://github.com/acdlite/react-fiber-architecture)自己寫的三句話：

- **"Fiber is reimplementation of the stack, specialized for React components. You can think of a single fiber as a virtual stack frame."**
- **"Conceptually, props are the arguments of a function."**
- **"The `return` fiber... It is conceptually the same as the return address of a stack frame."**

換句話說：**你寫 React 時傳的 props，在 React 的實作裡就是「函式的參數」；而 fiber 就是一格 stack frame。** 所以要真的讀懂 Fiber，得先知道參數在下面幾層長什麼樣。

一共四層：

| 層級 | 參數在這裡叫什麼 | 誰負責 |
| --- | --- | --- |
| 1. 規格層 | `FormalParameter` | ECMAScript 規格書 |
| 2. 引擎層 | 環境紀錄裡的 binding | V8 執行抽象操作 |
| 3. 硬體層 | `rdi` ／ `xmm0` ／ Stack | System V ABI |
| 4. 框架層 | `pendingProps` | React Fiber |

---

## 二、第 1 層：規格層 —— 參數連值都還沒有

打開 ECMAScript 規格書找函式參數，你會看到這一行：

```
FormalParameter[Yield, Await] :
    BindingElement[?Yield, ?Await]
```

逐字拆開：

- a. **`FormalParameter`** —— 非終端符號（non-terminal symbol），意思是「它還是一個抽象分類，可以繼續往下展開」，你沒辦法把它直接印在螢幕上。
- b. **`[Yield, Await]`** —— 這個符號接受兩個布林旗標，用來標記「現在這個函式是不是 generator（`Yield`）、是不是 async（`Await`）」。
- c. **`:`** —— 相當於傳統 BNF 的 `::=`，意思是「被定義為 ／ 可以展開成」。
- d. **`BindingElement`** —— 參數的實際語法內容，可以是一個變數名 `a`、一個解構 `{x, y}`、或一個帶預設值的 `a = 1`。
- e. **`[?Yield, ?Await]`** —— **前面那個問號是「繼承父層旗標」的意思**，不是三元運算子。

白話解釋第 e 點：如果外層呼叫 `FormalParameter` 時帶的是 `+Yield`，那麼裡面的 `BindingElement` 就自動變成 `BindingElement[+Yield]`。這是一個**規格書自己用的巨集**，目的是讓規格不用為 generator、async、async generator 各寫一套一模一樣的語法樹。

### 為什麼要分 `FormalParameter` 與 `BindingElement` 兩個名字

這條規則看起來是一對一映射，那為什麼不合併？因為它們的職責不同：

- **`FormalParameter` 表達的是「位置 ／ 上下文」** —— 只有在「這是函式參數」這個場合，規格書才會套用參數專屬的語意規則（檢查參數名是否重複、Early Errors、參數初始化順序）。
- **`BindingElement` 表達的是「可重用的語法結構」** —— `const [a, b] = obj` 用它、`catch (e)` 也用它。

**這就是關注點分離。** 哪天 ECMAScript 想替函式參數加一個專屬語法（例如修飾器），只要改 `FormalParameter`，不會波及 `const` 宣告。

### 順帶一提：BNF 是什麼

**BNF（Backus-Naur Form，巴科斯-諾爾範式）** 是用來精確描述語言語法的記號系統，避免自然語言的歧義。它由三種東西組成：

- a. **非終端符號（non-terminal symbol）** —— 還能繼續展開的抽象分類，例如 `<Expression>`。
- b. **終端符號（terminal symbol）** —— 語法樹的葉節點，程式碼裡真的會寫出來的字元，例如 `+`、`function`、`,`、數字本身。
- c. **產生規則（production rule）** —— `::=` 與 `|` 組成的展開規則。

ECMAScript 用的是 BNF 的擴充版 **EBNF（Extended BNF）** 的變體，`Elision opt` 的那個下標 `opt` 就是 EBNF 的「可選（0 或 1 次）」。

---

## 三、橫向大掃除（一）：那個 `?` 有六種身分

這是今天最實用的一張表。看到 `?` 先問「這在哪一層」，而不是直接當三元運算子讀。

| 寫法 | 在哪一層 | 意思 | 求值行為 |
| --- | --- | --- | --- |
| `a ? b : c` | JavaScript 語法 | 三元（條件）運算子 | 只求值其中一邊 |
| `a?.b` | JavaScript 語法 | 可選鏈 | 左邊是 `null`／`undefined` 就整串短路成 `undefined` |
| `a?.()` ／ `a?.[i]` | JavaScript 語法 | 可選鏈的呼叫式與索引式 | 同上 |
| `a ?? b` | JavaScript 語法 | 空值合併 | **只有** `null`／`undefined` 才走右邊 |
| `x?: number` | TypeScript 型別層 | 可選參數／可選屬性 | 編譯後完全消失，執行期看不到 |
| `[?Yield, ?Await]` ／ `Elision opt` | ECMAScript 規格書 | 旗標繼承巨集／可選語法元素 | **不是程式碼**，是規格書的記號 |

實測（`node day28-parameter-four-layers.js`，Node.js v22.23.2，2026-09-29 執行）：

```
1. 三元運算子 a ? b : c ：走左邊，另一邊沒被求值（sideEffects = 1）
2. 可選鏈 a?.b         ：undefined（沒有丟 TypeError）
   a?.() 與 a?.[i]     ：undefined / 20
4. 空值合併 a ?? b      ：0 ?? 99 = 0，對照 0 || 99 = 99
```

**注意第四行。** `0 ?? 99` 得到 `0`，`0 || 99` 得到 `99` —— 這正是 Day 23 講的那個「購物車是空的時候畫面冒出一個 0」的 falsy 陷阱的解藥。`??` 只擋 `null` 與 `undefined`，`0` 與 `''` 都會被保留。

---

## 四、橫向大掃除（二）：Elision 不是 `undefined`

規格書裡 `[1, , 3]` 中間那個空位叫 **Elision（省略）**，語法規則寫成 `Elision opt`。很多人以為它就是 `undefined`，**但它們是兩種東西**：

```
[1, , 3] 的 length         ：3
[1, undefined, 3] 的 length：3
兩者的 [1] 讀出來           ：undefined vs undefined（都是 undefined）

1 in [1, , 3]              ：false   ← 空位：索引根本不存在
1 in [1, undefined, 3]     ：true    ← 有索引，只是值是 undefined
Object.keys([1, , 3])      ：["0","2"]   ← 空位被跳過
hasOwnProperty(1)          ：false vs true
```

白話解釋：**空位是「這個索引不存在」，`undefined` 是「索引存在但值是 undefined」。** `length` 一樣、讀出來一樣，但 `in`、`Object.keys`、`hasOwnProperty` 全部分得出來。

而陣列方法對它的處理**並不一致**，這是最容易踩的地方：

```
forEach 走訪到的索引 ：[0,2] vs [0,1,2]   ← forEach 跳過空位
map 之後還是不是空位  ：false             ← map 保留空位
Array.from 之後      ：true              ← 補成 undefined
展開運算子之後        ：true              ← 補成 undefined
join 怎麼處理空位     ：'1--3'            ← 空位與 undefined 都變空字串
```

**接到 React**：`{arr.map(x => <li>{x}</li>)}` 遇到空位時，`map` 會保留空位而不呼叫回呼，所以那個位置不會產生任何節點 —— 這會讓你的清單長度跟你以為的不一樣，而且不會報錯。要正規化就用 `Array.from(arr)` 或 `[...arr]`。

---

## 五、第 2 層：引擎層 —— 參數變成一個綁定

規格層只是語法。真正把參數「變出來」的是一個抽象操作，編號 **10.2.11**，名字叫 [`FunctionDeclarationInstantiation ( func, argList )`](https://tc39.es/ecma262/#sec-functiondeclarationinstantiation)。

它做的事（簡化）：

- a. 建立一個新的**宣告式環境紀錄（Declarative Environment Record）**，當作這次呼叫的詞法環境。
- b. 替每一個形式參數在那個環境紀錄裡建立一個綁定（binding），解構與預設值也在這一步處理。
- c. 把實際傳進來的引數對應到那些綁定上；引數比參數少就綁 `undefined`；必要時建立 `arguments` 物件。
- d. 接著處理函式本體裡的 `var` 與函式宣告。

**這一步就是 Day 7 講的閉包的源頭。** 閉包抓住的那個「環境紀錄」，就是在這裡被建出來的。所以「參數」與「閉包變數」在引擎眼裡是同一種東西 —— 都是環境紀錄上的綁定。

---

## 六、第 3 層：硬體層 —— 參數變成暫存器裡的位元

再往下一層，就離開 JavaScript 了。

**System V ABI（Application Binary Interface，應用程式二進位介面）** 是 Linux、macOS、FreeBSD 等類 Unix 系統在 x86-64 架構上共用的底層規範。名字裡的 System V 來自 1983 年 AT&T 推出的 UNIX System V，現代系統沿用了它留下來的多套標準（還包括 System V IPC 跨程序通訊、SysV init 開機流程）。

一句話分辨：**API 是「高階語言怎麼呼叫函式」的規範，ABI 是「編譯成二進位之後，暫存器與記憶體該怎麼擺」的規範。**

它規定的呼叫慣例（calling convention）是這樣：

- a. **前 6 個整數或指標參數** → 依序放進通用暫存器 `rdi`、`rsi`、`rdx`、`rcx`、`r8`、`r9`。
- b. **前 8 個浮點數參數** → 依序放進 SIMD 暫存器 `xmm0` ～ `xmm7`。
- c. **裝不下的**（第 7 個整數之後） → push 到記憶體的 **Stack（堆疊）**，接收端用堆疊指標加偏移量去讀。
- d. **回傳值** → 整數放 `rax`，浮點放 `xmm0`。
- e. **Stack 必須保持 16-byte 對齊**，這是為了讓 SIMD 指令不會因為未對齊而崩潰。

### 傳值還是傳指標

這是 Day 3「傳值 vs 傳址」在硬體層的樣子：

| 情況 | 做法 |
| --- | --- |
| 小的純量（整數、字元、小結構） | **直接把值本體放進暫存器**（by value），最快 |
| 大結構、陣列、字串，或函式要改到原值 | **把記憶體位址放進暫存器**（by reference），避免複製 |
| 參數太多，暫存器不夠 | 推進 Stack |

### 一個要修正的說法

浮點數會走 `xmm` 暫存器，**不是因為它要做 SIMD 運算**，而是因為現代 x86-64 早就淘汰了舊的 x87 浮點協同處理器，把純量浮點運算也交給 SSE／AVX 單元處理。所以「一個單純的 `3.14` 也會進 `xmm0`」這件事是真的，但理由是硬體單元的分工，不是它真的在做向量運算。

### 兩個對 JavaScript 讀者的重要提醒

1. **JavaScript 根本沒有整數型別。** `1` 和 `1.0` 在底層**都是** IEEE 754 雙精度浮點數。所以上面「整數走 `rdi`、浮點走 `xmm0`」是 C／C++ 的世界，不能直接套到 JS 的數字上（V8 內部有 Smi 這種小整數最佳化，那是引擎的實作，不是語言的型別）。
2. **小數位數太多時，JS 不會自動幫你換成高精度型別，它會安靜地丟精度。** 雙精度浮點數的有效位數大約 15 到 17 位十進制數字，超過就丟，`0.1 + 0.2 !== 0.3` 就是這樣來的。JS 只有 `BigInt`（**只處理整數**）或第三方的 `decimal.js`；`BigDecimal` 是 Java／C# 的東西，JavaScript 沒有。

### 這一層的關鍵限制

**CPU 的 call stack，你沒有辦法從外面暫停它。**

React 官方文件的原話是：**"If you rely only on the call stack, it will keep doing work until the stack is empty."**

這句話就是下一層存在的理由。

---

## 七、橫向大掃除（三）：暫停與恢復的三個階梯

在進第 4 層之前，先把「可暫停」這件事的三種做法排開，因為這直接決定了 React 的選擇。

| | 誰能暫停 | 誰決定恢復 | 能不能重跑已經跑過的部分 | 用在哪 |
| --- | --- | --- | --- | --- |
| **CPU call stack** | **不能暫停** | — | — | 所有原生函式呼叫 |
| **Generator（`function*` ＋ `yield`）** | 能 | **呼叫端**（手動 `.next()`） | **不能**，只能往前 | Redux-Saga、`async/await` 的前身 |
| **`async/await`** | 能 | **Promise 決議時自動** | 不能 | 非同步流程 |
| **React Fiber** | 能 | 排程器 | **可以**，能丟棄整棵重算 | 並行渲染、Suspense |

### Generator 跟 `async/await` 是同一個東西嗎

**不是，關係是「`async/await` 是 Generator 的特化版」。**

機制上同源 —— Babel 把 `async/await` 編譯到舊 target 時，產出的就是 generator 加一個叫 `__awaiter` 的自動執行器。所以「`async/await` 是 generator ＋ 自動執行器的語法糖」這句話是對的。

但它們不等價，至少差五點：

| | Generator | `async/await` |
| --- | --- | --- |
| 回傳什麼 | Iterator（可以 `for...of`） | Promise |
| 誰決定恢復 | 呼叫端手動 `.next()` | Promise 決議時自動 |
| 能吐出什麼 | 任何值 | 只認 thenable |
| 能不能往內傳值 | 能，`.next(value)` 注入 | **不能**，沒有這個介面 |
| 無窮惰性數列 | 能 | 不能 |

**第三、四點是關鍵。** `yield` 吐出去的值由呼叫端解讀，所以 Redux-Saga 可以 `yield` 一個描述副作用的普通物件 `{ type: 'CALL', fn, args }`，再由它自己的執行器去跑。而 `await` 只會等 Promise，你沒有這個轉圜空間。

另外 `const a = yield '請輸入第一個數'` 這種「吐一個值出去、等外面塞一個值回來」的雙向溝通，`await` 完全做不到。

（補一個：`async function*` ＋ `for await...of` 是兩者的結合，處理串流資料時會用到。）

### 那 React 為什麼不直接用 Generator

因為 Generator 只給得起「暫停」，給不起「丟棄重來」。實測：

```
第 4 次 next()：{"value":"走完了","done":true}
第 5 次 next()：{"done":true}  ← 走完就永遠是 done

把一個走到一半的 generator 存起來，想回頭重跑第 1 步：
  沒有 g.reset()、沒有 g.rewind()、沒有 g.clone()
  typeof g2.reset = undefined，typeof g2.clone = undefined
```

白話解釋：generator 把「執行到哪裡」藏在自己內部，而且**只能往前推進**。想回頭只能重新建一個，但那樣「已經算過的部分」也一起丟了。

**而 React 要的是四件事**：暫停、指派優先級、**重用已完成的工作**、**丟棄不再需要的工作**。Generator 只符合第一項，所以 React 自己重寫了一個 stack。

---

## 八、第 4 層：Fiber 就是一格虛擬的 stack frame

現在所有東西都接起來了。

一個 fiber 是一個普通的 JavaScript 物件，而它的欄位命名**逐一對應 stack frame 的概念**：

| Fiber 的欄位 | 對應到 stack frame 的什麼 | 官方文件怎麼說 |
| --- | --- | --- |
| `type` | 正在執行的那個函式 | "the type is the function whose execution is being tracked by the stack frame" |
| `pendingProps` | **函式的引數** | "Conceptually, props are the arguments of a function" |
| `memoizedProps` | 上一次執行完的引數 | "set at the end" |
| `return` | **返回位址（return address）** | "conceptually the same as the return address of a stack frame" |
| `child` | 被呼叫的下一個函式 | "you can think of a child fiber as a tail-called function" |
| `sibling` | 同一層的下一個 | 子節點構成單向鏈表 |
| output | 函式的回傳值 | "the output of a fiber is the return value of a function" |

**所以 Day 23 那個沒講完的問題今天有答案了：為什麼 Fiber 是 `child` ／ `sibling` ／ `return` 三個指標的鏈表，而不是一個 `children` 陣列？**

因為它在模仿 stack frame。`return` 模仿的就是返回位址，`child` 模仿的是被呼叫的下一格。而**把位置存在物件的指標上、而不是存在 CPU 的堆疊上，你就能隨時把它放下再撿回來**。

官方文件把這件事講得很直接：

> "Wouldn't it be great if we could interrupt the call stack at will and manipulate stack frames manually? That's the purpose of React Fiber."

### 實測：這件事到底買到了什麼

我寫了兩個版本走同一棵兩萬個節點的樹：

- **遞迴版**：直接用 CPU 的 call stack，一路跑到底。
- **Fiber 版**：用 `while` 迴圈取代遞迴，「現在走到哪」存在一個 `nextUnitOfWork` 變數裡，每走一格檢查一次時間預算（抓 5 毫秒），超過就 `return` 出去。

三輪實測結果：

| | 遞迴版 | Fiber 版 |
| --- | --- | --- |
| 總時間 | 10.4 ～ 17.1 毫秒 | 14.0 ～ 21.9 毫秒 |
| 被切成幾段 | 1 段 | 3 ～ 6 段 |
| **最長不中斷** | **10.4 ～ 17.1 毫秒** | **5.0 ～ 5.8 毫秒** |
| 能不能中途叫停 | 不能 | 能 |

**誠實地講：總時間 Fiber 大多比較慢**，因為多了迴圈判斷與計時成本（雖然它也省下了兩萬次函式呼叫建立 stack frame 的成本，所以偶爾反而較快，變異很大）。

**但會不會掉幀看的不是總時間，是「最長不中斷」。** 一格畫面 16.7 毫秒，遞迴版那 17.1 毫秒的一整段中間沒有任何縫隙可以讓瀏覽器去處理點擊或動畫；Fiber 版把它切成 3 到 6 段，每段穩定壓在 5 毫秒出頭。

**這就是 Fiber 買到的東西 —— 它用總時間換了回應性。**

### 最後一塊：`pendingProps` 就是 Day 23 的 `Object.is`

```
傳同一個物件進去  ：true  → 重用上次的輸出，不重算
原地改內容再傳    ：true  → 內容變了，但參考沒變，還是重用
給一個新物件      ：false → 參考變了，重新算
```

官方文件的說法是 **"When the incoming pendingProps are equal to memoizedProps, it signals that the fiber's previous output can be reused, preventing unnecessary work."**

**第二行就是 Day 23 那個「為什麼原地改 state 沒反應」的 bug，出現在 Fiber 這一層的樣子。** 同一件事，我們在 Day 23 從使用者的角度看過一次，今天從 stack frame 的角度又看了一次。

---

## 九、完整 demo 原始碼

檔名：`day28-parameter-four-layers.js`
執行：`node day28-parameter-four-layers.js`

```js
/**
 * Day 28 demo：一個參數的四層旅行
 *
 * Part A —— Elision（稀疏陣列的空位）到底跟 undefined 差在哪
 * Part B —— 那個「?」的六種身分，以及它們求值行為的差異
 * Part C —— Generator 能暫停，但只能往前：證明它為什麼當不了 Fiber
 * Part D —— 遞迴（真 call stack）vs Fiber（自己重寫的 stack）：誰讓得出主執行緒
 * Part E —— pendingProps === memoizedProps 的 bailout
 *
 * Part C 與 Part D 的 Fiber 是我手寫的最小模型，不是 React 原始碼。
 */

'use strict'

const line = (t = '') => console.log(t)
const title = (t) => { line(); line('━'.repeat(64)); line(t); line('━'.repeat(64)) }

// ══════════════════════════════════════════════════════════
// Part A：Elision —— 空位不是 undefined，它是「這個索引不存在」
// ══════════════════════════════════════════════════════════
title('Part A：Elision（空位）與 undefined 是兩回事')

const elided = [1, , 3]        // 中間是 Elision，規格書的術語
const explicit = [1, undefined, 3]

line(`[1, , 3] 的 length      ：${elided.length}`)
line(`[1, undefined, 3] 的 length：${explicit.length}`)
line(`兩者的 [1] 讀出來       ：${elided[1]} vs ${explicit[1]}（都是 undefined）`)
line('')

// in 運算子問的是「這個索引存在嗎」，不是「值是不是 undefined」。
line(`1 in [1, , 3]           ：${1 in elided}   ← 空位：索引根本不存在`)
line(`1 in [1, undefined, 3]  ：${1 in explicit}    ← 有索引，只是值是 undefined`)
line(`Object.keys([1, , 3])   ：${JSON.stringify(Object.keys(elided))}   ← 空位被跳過`)
line(`hasOwnProperty(1)       ：${elided.hasOwnProperty(1)} vs ${explicit.hasOwnProperty(1)}`)
line('')

// 大部分的陣列方法會跳過空位，但不是全部 —— 這是最容易踩的地方。
const visitedElided = []
const visitedExplicit = []
elided.forEach((v, i) => visitedElided.push(i))
explicit.forEach((v, i) => visitedExplicit.push(i))
line(`forEach 走訪到的索引    ：${JSON.stringify(visitedElided)} vs ${JSON.stringify(visitedExplicit)}`)
line(`map 之後還是不是空位    ：${1 in elided.map(x => x)}   ← map 保留空位`)
line(`Array.from 之後          ：${1 in Array.from(elided)}    ← 會被補成 undefined`)
line(`展開運算子之後           ：${1 in [...elided]}    ← 也會被補成 undefined`)
line(`join 怎麼處理空位        ：'${elided.join('-')}'  ← 空位與 undefined 都變空字串`)

// ══════════════════════════════════════════════════════════
// Part B：那個「?」的六種身分
// ══════════════════════════════════════════════════════════
title('Part B：同一個符號，六種完全不同的意思')

let sideEffects = 0
const bump = (v) => { sideEffects++; return v }

// 1. 三元（條件）運算子：三個運算元，只會求值其中一邊。
const ternary = true ? bump('走左邊') : bump('走右邊')
line(`1. 三元運算子 a ? b : c ：${ternary}，另一邊沒被求值（sideEffects = ${sideEffects}）`)

// 2. 可選鏈：左邊是 null 或 undefined 就整串短路成 undefined，不會丟錯。
const maybe = null
line(`2. 可選鏈 a?.b         ：${maybe?.deep?.value}（沒有丟 TypeError）`)

// 3. 可選鏈的呼叫形式與索引形式
const obj = { fn: null, list: [10, 20] }
line(`   a?.() 與 a?.[i]     ：${obj.fn?.()} / ${obj.list?.[1]}`)

// 4. 空值合併：只有 null 與 undefined 才走右邊，0 與 '' 會被保留。
line(`4. 空值合併 a ?? b      ：0 ?? 99 = ${0 ?? 99}，對照 0 || 99 = ${0 || 99}`)
line(`   這就是 Day 23 那個 0 陷阱的解藥`)

line(`5. TS 的 x?: number     ：型別層的東西，編譯後完全消失，Node 看不到`)
line(`6. 規格書的 [?Yield]    ：不是程式碼，是規格書的旗標繼承巨集`)

// ══════════════════════════════════════════════════════════
// Part C：Generator 能暫停，但只能往前
// ══════════════════════════════════════════════════════════
title('Part C：Generator 為什麼當不了 Fiber')

function * walk (n) {
  for (let i = 0; i < n; i++) {
    yield i                    // 暫停點：把 i 交出去，記住現在走到哪
  }
  return '走完了'
}

const g = walk(3)
line(`第 1 次 next()：${JSON.stringify(g.next())}`)
line(`第 2 次 next()：${JSON.stringify(g.next())}`)
line(`第 3 次 next()：${JSON.stringify(g.next())}`)
line(`第 4 次 next()：${JSON.stringify(g.next())}`)
line(`第 5 次 next()：${JSON.stringify(g.next())}  ← 走完就永遠是 done`)
line('')

// generator 把「執行到哪裡」藏在自己內部，而且那個狀態只能往前推進。
const g2 = walk(3)
g2.next(); g2.next()
line('把一個走到一半的 generator 存起來，想回頭重跑第 1 步：')
line(`  沒有 g.reset()、沒有 g.rewind()、沒有 g.clone()`)
line(`  typeof g2.reset = ${typeof g2.reset}，typeof g2.clone = ${typeof g2.clone}`)
line('  唯一的辦法是 walk(3) 重新建一個，但那樣「已經算過的部分」也一起丟了')

// ══════════════════════════════════════════════════════════
// Part D：遞迴 vs Fiber —— 誰讓得出主執行緒
// ══════════════════════════════════════════════════════════
title('Part D：真 call stack 停不下來，虛擬 stack frame 可以')

const NODE_COUNT = 20000
const FRAME_BUDGET_MS = 5      // 一格畫面 16.7 毫秒，這裡抓 5 毫秒當預算

// 建一棵二元樹，節點用 child / sibling / return 三個指標串起來，
// 這三個欄位的命名與語意，直接對應 React Fiber。
function buildTree (count) {
  const root = { id: 0, child: null, sibling: null, return: null, pendingProps: 0, memoizedProps: null }
  const all = [root]
  for (let i = 1; i < count; i++) {
    const node = { id: i, child: null, sibling: null, return: null, pendingProps: i, memoizedProps: null }
    const parent = all[(i - 1) >> 1]
    if (!parent.child) {
      parent.child = node
    } else {
      let last = parent.child
      while (last.sibling) last = last.sibling
      last.sibling = node
    }
    node.return = parent
    all.push(node)
  }
  return root
}

let workSink = 0
function doWork (node) {
  for (let i = 0; i < 260; i++) workSink += (node.id * i) % 7
  node.memoizedProps = node.pendingProps
}

// ── 做法一：遞迴，也就是直接用 CPU 的 call stack ──
// 一旦進去就只能一路跑到堆疊清空，中間沒有任何縫隙可以讓出去。
function renderRecursive (node) {
  if (!node) return
  doWork(node)
  renderRecursive(node.child)
  renderRecursive(node.sibling)
}

// ── 做法二：Fiber，自己把 stack frame 拿在手上 ──
// 用 while 迴圈取代遞迴，「現在走到哪」存在 nextUnitOfWork 這個變數裡。
// 因為位置存在變數而不是 CPU 的堆疊上，所以隨時可以 return 出去再接回來。
function createFiberLoop (root) {
  let nextUnitOfWork = root
  let yields = 0

  function performUnitOfWork (fiber) {
    doWork(fiber)
    if (fiber.child) return fiber.child          // 往下
    let node = fiber
    while (node) {
      if (node.sibling) return node.sibling      // 往旁邊
      node = node.return                         // 沒有兄弟就往上回，這就是 return address
    }
    return null
  }

  function workLoop (deadlineMs) {
    const start = performance.now()
    while (nextUnitOfWork) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
      const elapsed = performance.now() - start
      if (elapsed >= deadlineMs) {               // 預算用完就讓出去
        yields++
        return { done: false, sliceMs: elapsed }
      }
    }
    return { done: true, sliceMs: performance.now() - start }
  }

  return { workLoop, getYields: () => yields }
}

const treeA = buildTree(NODE_COUNT)
let t = performance.now()
renderRecursive(treeA)
const recursiveMs = performance.now() - t

const treeB = buildTree(NODE_COUNT)
const loop = createFiberLoop(treeB)
const slices = []
let res
t = performance.now()
do {
  res = loop.workLoop(FRAME_BUDGET_MS)
  slices.push(res.sliceMs)
} while (!res.done)
const fiberTotalMs = performance.now() - t
const longestSlice = Math.max(...slices)

line(`節點數：${NODE_COUNT.toLocaleString('en-US')}，讓出預算：${FRAME_BUDGET_MS} 毫秒`)
line('')
line(`遞迴版（真 call stack）`)
line(`  總時間            ：${recursiveMs.toFixed(1)} 毫秒`)
line(`  最長不中斷        ：${recursiveMs.toFixed(1)} 毫秒 ← 整段就是一次，中間沒有縫`)
line(`  能讓出主執行緒嗎  ：不能`)
line('')
line(`Fiber 版（自己重寫的 stack）`)
line(`  總時間            ：${fiberTotalMs.toFixed(1)} 毫秒`)
line(`  被切成            ：${slices.length} 段`)
line(`  最長不中斷        ：${longestSlice.toFixed(1)} 毫秒`)
line(`  讓出次數          ：${loop.getYields()} 次`)
line('')
const diff = fiberTotalMs - recursiveMs
line(`→ 總時間：Fiber ${diff >= 0 ? '多花' : '少花'}了 ${Math.abs(diff).toFixed(1)} 毫秒`)
line(`→ 真正的重點：「最長不中斷」從 ${recursiveMs.toFixed(1)} 毫秒降到 ${longestSlice.toFixed(1)} 毫秒`)
line('→ 會不會掉幀看的是後者，不是前者。這就是 Fiber 買到的東西')
line(`（workSink = ${workSink}，只是避免引擎把迴圈最佳化掉）`)

// ══════════════════════════════════════════════════════════
// Part E：pendingProps === memoizedProps 就重用
// ══════════════════════════════════════════════════════════
title('Part E：props 就是參數，比對的是參考')

function bailoutCheck (fiber, nextProps) {
  // React 官方文件：「When the incoming pendingProps are equal to memoizedProps,
  // it signals that the fiber's previous output can be reused.」
  return Object.is(fiber.memoizedProps, nextProps)
}

const fiber = { memoizedProps: null }
const props1 = { user: { name: 'Abby' } }
fiber.memoizedProps = props1

line(`傳同一個物件進去  ：${bailoutCheck(fiber, props1)}  → 重用上次的輸出，不重算`)
props1.user.name = 'Bob'                        // 原地改內容
line(`原地改內容再傳    ：${bailoutCheck(fiber, props1)}  → 內容變了，但參考沒變，還是重用`)
const props2 = { ...props1 }
line(`給一個新物件      ：${bailoutCheck(fiber, props2)} → 參考變了，重新算`)
```

---

## 十、延伸練習

- a. [LeetCode 2727. Is Object Empty](https://leetcode.com/problems/is-object-empty/) —— 正好用到 `for...in` 與 `Object.keys`，對應第四節的空位行為。
- b. [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/) —— 移除 falsy，順手複習 `??` 與 `||` 的差別。
- c. [LeetCode 2649. Nested Array Generator](https://leetcode.com/problems/nested-array-generator/) —— **直接手寫 generator**，把第七節的暫停與恢復實作一遍。
- d. [LeetCode 2637. Promise Time Limit](https://leetcode.com/problems/promise-time-limit/) —— `async/await` 與 Promise 的組合。
- e. [LeetCode 2665. Counter II](https://leetcode.com/problems/counter-ii/) —— 閉包保存狀態，對應第五節的環境紀錄。

---

## 十一、這篇的每個說法各自從哪來

**一、有外部出處的部分**

| 內容 | 出處 |
| --- | --- |
| "Fiber is reimplementation of the stack... a virtual stack frame"、"props are the arguments of a function"、`return` 等同 return address、`child` 是 tail-called function、pendingProps 等於 memoizedProps 就重用、"If you rely only on the call stack, it will keep doing work until the stack is empty" | React 官方 Fiber 架構文件：https://github.com/acdlite/react-fiber-architecture |
| `FunctionDeclarationInstantiation` 是 10.2.11，以及它建立環境紀錄與參數綁定的步驟 | ECMAScript 規格書：https://tc39.es/ecma262/#sec-functiondeclarationinstantiation |
| `FormalParameter[Yield, Await] : BindingElement[?Yield, ?Await]` 的語法與 `?` 的旗標繼承語意、`Elision opt` | ECMAScript 規格書語法記號章節：https://tc39.es/ecma262/#sec-grammar-notation |
| 稀疏陣列與 `in`、`Object.keys`、`forEach` 的行為 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections#sparse_arrays |
| 空值合併 `??` 只對 `null` 與 `undefined` 生效 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing |
| 可選鏈 `?.` 的短路行為 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining |
| `Object.is` 的比較語意 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is |
| JS 的 Number 是 IEEE 754 雙精度、有效位數限制 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number |
| Generator 的 `.next(value)` 雙向溝通與 Iterator 協定 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator |

**二、我實際跑出來的部分**

第三、四、七、八節所有的次數與毫秒數，由 `day28-parameter-four-layers.js` 實測產生（Node.js v22.23.2，2026-09-29 執行，連跑八輪），可以重跑驗證。包含：

- Elision 與 `undefined` 在 `in`、`Object.keys`、`hasOwnProperty`、`forEach`、`map`、`Array.from`、展開運算子、`join` 八種操作下的差異
- `0 ?? 99 = 0` 對照 `0 || 99 = 99`
- `typeof g.reset` 與 `typeof g.clone` 都是 `undefined`
- 遞迴版總時間 10.4 ～ 17.1 毫秒（最長不中斷等於總時間）
- Fiber 版總時間 14.0 ～ 21.9 毫秒、切成 3 ～ 6 段、最長不中斷 5.0 ～ 5.8 毫秒
- `Object.is` 在「同物件／原地改／新物件」三種情況的 bailout 結果

**Part C 與 Part D 的 `createFiberLoop` 是我手寫的最小模型，不是 React 原始碼。** 真實的 Fiber 有 Lane 優先級、雙緩衝、commit 階段與 Suspense，複雜得多。

**三、我自己的整理與判斷（沒有外部出處）**

- 把「參數」拆成規格／引擎／ABI／框架四層來追，這個切法是我整理的敘事，不是任何官方說法。
- 「`?` 的六種身分」這張表的分類方式。
- 「Fiber 用總時間換了回應性」這個總結，以及「會不會掉幀看的是最長不中斷、不是總時間」這個判準。
- 「`async/await` 是 generator 的特化版」這個說法的五點對照表。

**四、我沒有實作驗證的部分**

- 第六節所有 System V ABI 的暫存器分配規則（`rdi`／`xmm0`／16-byte 對齊），我是讀規範整理的，**沒有實際反組譯驗證過**。要確認的話可以用 `gcc -S` 或 Compiler Explorer 自己看一次。
- Babel 把 `async/await` 編譯成 generator ＋ `__awaiter` 這件事，我沒有在這個系列裡實際跑一次編譯來看產出。
- V8 的 Smi 小整數最佳化，我是引用既有認知，沒有讀原始碼確認。

**五、一個要講清楚的量測限制**

Part D 的兩個版本都是我手寫的模型，量的是「JavaScript 層走訪一棵鏈表的成本」，**不是 React 真實的 render 成本**。真實 React 每個單位的工作量遠大於我這裡的 260 次取餘數，所以段數與毫秒數都不能拿去推論實際應用的表現。這組數字要證明的只有一件事：**同樣的工作，用迴圈加一個位置變數就能切開，用遞迴不行。**

（查閱日期：2026-09-29。程式碼實測於 Node.js v22.23.2）

---

## 明天

四層走完了，剩下最後一段路：**這些東西在真的要上線的時候會怎麼壞。**

Day 29 回到地面，講環境變數、Docker 與 CI/CD —— 那些在本機一切正常、一到正式環境就炸的錯，以及它們為什麼幾乎都跟「建置時」與「執行時」這兩個時間點分不清楚有關。
