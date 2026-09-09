---
title: "每一次 render 都是一次函式呼叫：從 Execution Context 看懂 React 的閉包陷阱"
series: 從 JS 核心機制到 React 核心原理：30天打造穩固的前端基本功
type: article-draft
tags: [ithome, 鐵人賽, javascript, execution-context, creation-phase, parameter-binding, closure, react, hooks]
updated: 2026-09-06
---

# 每一次 render 都是一次函式呼叫：從 Execution Context 看懂 React 的閉包陷阱

> 純 Markdown 格式，沒有用 Obsidian 的 callout 與 highlight 語法，可以直接貼到 iThome。

## 這篇接在哪、被哪一篇用到

前面我們把「閉包」跟「`this`」各自拆過一次。今天要處理的是把那兩件事真正串起來的那個東西：**Execution Context（執行環境）**。

它是 JS 引擎每次呼叫函式時，在記憶體裡臨時搭起來的一座舞台。舞台上放著這次呼叫的參數、變數、`this`。函式 `return`，舞台就拆掉。

而 React 函式元件最反直覺的那些行為 —— 為什麼 `setInterval` 裡的 `count` 永遠是 0、為什麼 `useRef` 的值不會被重置、為什麼 hooks 不能寫在 `if` 裡面 —— 全部都可以從「**一次 render 就是一次函式呼叫，所以就是一座全新的舞台**」這一句話推導出來。

後面談 React state 不可變性、`useMemo` 的依賴陣列、Context 與 Zustand 的取捨時，都會回頭指這篇。

---

## 一、先看一段一定會壞的程式碼

這段是很多人第一次寫 React 計時器都會踩的坑：

```jsx
import { useState, useEffect } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count)      // 永遠印出 0
      setCount(count + 1)     // 永遠是 0 + 1
    }, 1000)
    return () => clearInterval(id)
  }, [])                      // 依賴陣列是空的

  return <h1>{count}</h1>
}
```

整段翻成中文：

「我做一個叫 `Counter` 的函式元件。裡面用 `useState` 宣告一個叫 `count` 的狀態，初始值 0。接著用 `useEffect` 掛一個副作用，第二個參數是空陣列 `[]`，代表『只在元件掛載後執行一次』。這個副作用裡開了一個每秒觸發一次的 `setInterval`，每次觸發就印出 `count`、然後把 `count` 加一。回傳的那個函式是清理函式，元件卸載時把計時器關掉。最後畫面上顯示 `count`。」

**實際跑起來的結果**：畫面停在 1，主控台每秒印出一個 0，永遠不會變。

大部分教學會告訴你「用 `setCount(c => c + 1)` 就好了」。這是對的解法，但它沒有回答**為什麼**。要回答為什麼，得先把 JS 那一半講清楚。

---

## 二、JS 那一半：呼叫一個函式，引擎到底做了什麼

### 2-a. 先定義名詞，一個都不要跳過

| 名詞 | 全名與意思 |
| --- | --- |
| **Execution Context** | 執行環境。引擎每次呼叫函式時建立的一個內部結構，裝著這次呼叫用得到的所有東西 |
| **Creation Phase** | 建立階段。Execution Context 的前半段，還沒開始逐行跑程式，先把變數與參數的「位置」準備好 |
| **Execution Phase** | 執行階段。後半段，真的一行一行跑函式本體 |
| **Environment Record** | 環境紀錄。Execution Context 裡真正存放「名字 → 值」對應關係的那張表 |
| **Binding（綁定）** | 一個「名字」跟一塊「記憶體位置」的對應關係。建立綁定＝在記憶體裡挖一個格子並掛上名字 |
| **Parse（解析）** | 引擎把原始碼文字讀懂、轉成 AST（Abstract Syntax Tree，抽象語法樹）的過程 |
| **AST** | 抽象語法樹。程式碼的結構化表示，不含空白與註解 |
| **Bytecode** | 位元組碼。比原始碼低階、比機器碼高階的中介表示法，V8 的 Ignition 直譯器負責跑它 |

### 2-b. Parse 只做一次，Creation Phase 每次呼叫都重來

這是最容易搞混的一條分界線：

1. **Parse 屬於編譯期，對同一個函式只做一次。**
   引擎把 `function greet(greeting) {...}` 這段文字掃過、建成 AST、做完 Scope Analysis（範疇分析：判斷哪些變數會被內層閉包抓走），產出**可以重複使用的 Bytecode**。V8 甚至會 lazy parsing —— 外層先粗略掃過，內層函式本體延到第一次被呼叫前才完整解析。

2. **Creation Phase 與 Execution Phase 屬於執行期，呼叫幾次就重做幾次。**
   每呼叫一次，就建立一個全新的 Execution Context：建立全新的參數綁定、做全新的 hoisting。上一次呼叫留下的舞台早就拆了。

3. **所以「函式被呼叫的當下是不是正在 Parse？」答案是否定的。**
   函式一旦真的開始執行，代表它那段語法必然已經解析完成 —— 引擎不可能一邊解析語法、一邊執行，卻不知道參數列表長什麼樣。

4. **順帶把「編譯」跟「直譯」這兩個詞分清楚：**
   - 編譯（Compile）＝把原始碼轉成另一種可重複執行的表示法，這個動作本身**不執行**程式。Parse 產生 AST、Ignition 把 AST 轉成 Bytecode，都屬於這一類，都只做一次。
   - 直譯（Interpret）＝拿到已經編譯好的 Bytecode，**真的執行它**。這件事每次呼叫都重來。

用一張流程圖看（iThome 的編輯器不支援 Mermaid，所以我畫成純文字框；貼文時可以另外用 Excalidraw 重畫一張圖片版）：

```
原始碼  function Counter() { ... }
   |
   |  [ 編譯期，只做一次 ]
   v
Parse：Scanner → Parser → AST → Scope Analysis
   |
   v
Bytecode（可重複使用）
   |
   |  [ 執行期，每次呼叫都重來一次 ]
   v
+--------------------------------------------------+
|  每次呼叫 Counter()                               |
|                                                  |
|  (1) Creation Phase 建立階段                      |
|      建立 Function Environment Record            |
|      建立參數綁定，用傳入的值初始化                 |
|      var / function 宣告 hoisting                |
|                                                  |
|  (2) Execution Phase 執行階段                     |
|      逐行真的執行函式本體                          |
|                                                  |
|  (3) return → 彈出 Stack Frame，舞台拆掉           |
|      例外：被閉包抓住的東西留在 Heap 上            |
+--------------------------------------------------+
```

### 2-c. 參數綁定是「宣告」，而且是每次呼叫都重做一次的真宣告

`function greet(greeting) {}` 裡的 `greeting`，在 ECMA-262 規格中的身分是 **BindingIdentifier（綁定識別碼）**，跟 `let greeting` 裡的 `greeting` 是同一個文法產生式。

引擎在 Creation Phase 執行的內部操作叫 **FunctionDeclarationInstantiation（函式宣告實例化）**，它做的事情就是：在這次呼叫的 Environment Record 裡，替每個形式參數（formal parameter）建立一個綁定，然後把傳進來的引數值寫進去。

所以「參數是不是宣告？」答案是：**是，而且是每次呼叫都從頭做一次的真宣告。**

這一點就是 `createCounter('counter1')` 與 `createCounter('counter2')` 能各自獨立計數的底層原因 —— 它們是兩次呼叫、兩座舞台、兩組完全不相干的綁定。

### 2-d. 綁定放在哪裡：Stack 還是 Heap，決定了閉包能不能活下來

「建立綁定並初始化」聽起來抽象，但它對應到的是很具體的記憶體動作：

1. **參數沒有被內層函式抓走** → 引擎在 Scope Analysis 階段就判定它可以放在**快速的 Stack 或 CPU 暫存器**槽位。函式一 `return`，Stack Frame 彈掉，記憶體立刻釋放。

2. **參數有被內層函式抓走（形成閉包）** → 引擎改把它配置在 **Heap 上的 Context 物件**裡。外層函式 `return` 之後，這塊記憶體還在，內層函式繼續抓著它，直到沒人引用才會被 GC（Garbage Collection，垃圾回收）回收。

一句話：**閉包不是「函式記得變數」這種擬人說法，而是「引擎把那塊記憶體從 Stack 搬到 Heap，讓它活得比函式呼叫更久」。**

記住這句，第三節就通了。

---

## 三、套回 React：一次 render 就是一次函式呼叫

### 3-a. props 就是參數綁定

```jsx
function Card({ title, onClick }) { ... }
```

這行翻成中文：「我宣告一個叫 `Card` 的函式，它有一個形式參數，這個參數用**解構**的方式，從傳進來的物件裡取出 `title` 與 `onClick` 兩個屬性，各自建立成一個綁定。」

React 呼叫它的方式，本質上就是 `Card({ title: 'Hi', onClick: fn })` —— 一次普通的函式呼叫。

所以：

1. **每次 render＝React 再呼叫一次你的元件函式。**
2. **每次 render 都會走一次 Creation Phase**，建立一組全新的 props 綁定、全新的區域變數、全新的函式（每個 handler 都是新做出來的函式物件）。
3. **上一次 render 的那些綁定沒有被更新，它們只是被留在原地。** 誰還抓著它們，誰就繼續看到舊值。

React 官方文件把這件事叫做 **State as a Snapshot（狀態是快照）** —— 每次 render 拿到的 `count`，是「那一次 render 當下的一個常數」，不是一個會自己變的變數。

### 3-b. 回答第一節：為什麼 `setInterval` 印出來的永遠是 0

現在把第一節那段程式碼放進上面的模型裡跑一遍：

1. **第一次 render**：React 呼叫 `Counter()`。Creation Phase 建立一組綁定，其中 `count` 這個綁定的值是 `0`。

2. **`useEffect` 的第二個參數是 `[]`**，代表「只在掛載後執行一次」。所以那個箭頭函式**只在第一次 render 的舞台上被建立、被執行一次**。

3. `setInterval` 裡那個回呼函式，**抓住了第一次 render 的 `count` 綁定**。因為被抓住了，這個綁定不會隨著 Stack Frame 彈掉而消失，它被搬到 Heap 上的 Context 物件裡活著（就是 2-d 講的那件事）。

4. **第二次、第三次 render** 時，React 確實有再呼叫一次 `Counter()`，也確實建立了一組**全新的** `count` 綁定。但那個計時器的回呼函式抓的是**第一次那組**，跟新的那組沒有任何關係。

5. 所以它每秒都忠實地印出它抓著的那塊記憶體裡的值：`0`。而 `setCount(count + 1)` 也永遠是 `setCount(0 + 1)`。

這個現象有個名字叫 **stale closure（過期閉包）**。它不是 React 的 bug，它是 JS 閉包語意的必然結果 —— React 只是剛好把「函式被反覆呼叫」這件事變成了框架的核心機制，所以踩到的頻率特別高。

### 3-c. 三種修法，與各自的代價

**修法一：用 updater function（函式式更新）**

```jsx
setInterval(() => {
  setCount(c => c + 1)   // 不讀外面的 count，改讓 React 把最新值餵給你
}, 1000)
```

「我不再從我自己的閉包裡讀 `count`，而是傳一個函式給 `setCount`。React 在真的要更新時，會把它手上最新的那份 state 當作引數 `c` 傳進來。」

代價：只適用於「新值只依賴舊值」的情況。如果你要讀的是另一個 state 或某個 prop，這招救不了。

**修法二：把依賴誠實寫進依賴陣列**

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000)
  return () => clearInterval(id)
}, [count])   // count 變了就重跑這個 effect
```

「`count` 一變，React 就先跑清理函式關掉舊計時器，再用**這一次 render 的新舞台**重新建立一個計時器。」

代價：計時器每秒被銷毀重建一次，時間精度會漂移。

**修法三：用 `useRef` 存一個「跨 render 都是同一個」的盒子**

```jsx
const countRef = useRef(0)
countRef.current = count   // 每次 render 都把最新值寫進同一個盒子
```

「`useRef` 回傳的物件，在整個元件生命週期中**永遠是同一個物件參考**。閉包抓住的是這個盒子（物件的位址），不是盒子裡的值，所以每次讀 `.current` 都會拿到最新的內容。」

這裡就接回 2-d 的記憶體模型：**`useRef` 之所以能跨 render 存活，是因為那個物件不住在 Execution Context 裡（那個每次呼叫都會被拆掉），而是掛在 React 的 fiber 節點上，也就是 Heap 裡的一塊長壽記憶體。** `useState` 的值也是同理。

---

## 四、`function Card({ title })` 這一行的隱藏代價

這是我覺得最有趣、也最少人講的一段：**你每天寫的解構 props，其實悄悄改變了這個函式的語法性質。**

ECMA-262 規格裡有一個概念叫 **simple parameter list（簡單參數列表）**。定義是：

> 每一個參數都是**單純的 Identifier**，沒有預設值、沒有 rest 參數、沒有解構。只要有任何一個參數不符合，整份參數列表就變成「非簡單」。

對照一下：

| 寫法 | 是簡單參數列表嗎 | 為什麼 |
| --- | --- | --- |
| `function f(a, b)` | 是 | 兩個都是純 Identifier |
| `function f(a = 1)` | 否 | 有預設值 |
| `function f(...args)` | 否 | 有 rest 參數 |
| `function Card({ title })` | **否** | **有解構** |

而「非簡單」會連帶觸發三件事：

1. **重複參數名稱直接變成 SyntaxError。**
   在非嚴格模式下，`function f(a, a) {}` 是**合法**的（後面的覆蓋前面的，這是很古老的歷史包袱）。但只要參數列表變成非簡單，`function f({a}, a) {}` 這種重複就會在 **Parse 階段**直接噴 SyntaxError —— 連 Bytecode 都不會生成。

2. **`arguments` 物件從 mapped 變成 unmapped。**
   在簡單參數列表下，`arguments[0]` 跟第一個參數是**連動的**（改一個，另一個跟著變），這叫 mapped arguments。非簡單參數列表下這個連動關係消失，`arguments` 只是呼叫當下的一份靜態快照。

3. **函式本體裡不能再寫 `"use strict"`。**
   規格明文禁止「非簡單參數列表 ＋ 函式體內的 use strict 指令」這個組合，會直接 SyntaxError。

**這對 React 開發者的實際意義**：因為你幾乎每個元件都寫解構 props，所以你寫的 React 元件**全部都是非簡單參數列表**。這代表你其實一直活在「重複參數名會直接報錯、`arguments` 不連動」的世界裡，只是沒有意識到。這也是為什麼在 React 專案裡幾乎沒人用 `arguments` —— 它在這個情境下既不連動、又拿不到解構後的名字，完全沒有用處。

---

## 五、`this` 不是參數：class component 為什麼要 `bind`

再看一行：

```js
greet.call(person, 'Hello')
```

翻成中文：「我拿 `greet` 這個函式，用它身上繼承來的 `call` 方法呼叫它。第一個引數 `person` 指定這次呼叫的 `this` 要是誰，第二個引數 `'Hello'` 才是真正要傳給 `greet` 的參數。」

關鍵在於分兩層看：

1. **對 `call` 這個函式來說**，`person` 跟 `'Hello'` 都是引數表達式，都會被求值。
2. **對 `greet` 這個函式來說**，只有 `'Hello'` 進入它的 FormalParameterList（形式參數列表）。`person` 走的是**另一條路** —— `this` 綁定在規格裡是 Function Environment Record 上的一個獨立欄位，不是參數。

所以「`this` 算不算參數？」答案是：**不算。**

這正是 React class component 那個經典寫法的由來：

```jsx
class Toggle extends React.Component {
  constructor(props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)   // 為什麼要這行？
  }
  handleClick() { this.setState(...) }
  render() { return <button onClick={this.handleClick}>切換</button> }
}
```

「因為 `this` 不是參數，它是**呼叫當下**才決定的。當你把 `this.handleClick` 這個函式**當成值傳出去**給 `onClick` 時，它跟 `this` 的關係就斷了 —— 之後 React 呼叫它時，`this` 會是 `undefined`。`bind(this)` 的作用是造一個新函式，把 `this` 永久釘死在目前這個實例上。」

而函式元件之所以沒有這個問題，是因為它根本不用 `this` —— 它用的是閉包。這也是 Dan Abramov 那篇〈How Are Function Components Different from Classes?〉的核心論點：class 讀的是 `this.props`（一個會被改寫的指標，永遠讀到最新），函式元件讀的是被閉包捕獲的 `props`（那一次 render 的快照）。

### 那函式元件裡的 `this` 到底是什麼？

很多人以為「React 還是有 `this`，只是被藏起來了」。這個直覺方向是對的，但名字錯了 —— **函式元件裡的 `this` 就是 `undefined`，沒有被藏。**

看 React 原始碼 `packages/react-reconciler/src/ReactFiberHooks.js` 裡真正呼叫你元件的那一行：

```js
children = __DEV__
  ? callComponentInDEV(Component, props, secondArg)
  : Component(props, secondArg);
```

這是**一般函式呼叫** —— 沒有接收者、沒有 `.call()`。而模組程式碼一律是 strict mode，strict mode 下一般函式呼叫的 `this` 是 `undefined`。JSX 也幫不上忙，`<Foo bar={1} />` 會被轉譯成 `_jsx(Foo, { bar: 1 })`，`Foo` 從頭到尾都是被當成**值**傳進去的。

那個 `secondArg` 值得一提：函式元件確實有第二個參數（`forwardRef` 的 `ref`）。**這大概就是「有東西被偷偷傳進來」這個印象的真正來源 —— 但它是參數，不是 `this`。**

真正在扮演 `this` 角色的，是 React 在模組層級放的一個變數：

```js
let currentlyRenderingFiber: Fiber = null as any;
```

`renderWithHooks` 在呼叫你的函式**之前**先把它設成目前這個 fiber，呼叫完再清掉。所以精確的說法是：**React 用一個「模組層級的隱含環境變數」取代了語言層的 `this` 綁定。** 兩者都在回答同一個問題 —— 「這次呼叫是為誰服務的？」 —— 只是一個由 JS 引擎自動完成，一個由 React 自己手動維護。

---

## 六、括號不是只有一種：`()` 在 JS 文法裡身兼多職

順手澄清一個常見誤解：**不是所有小括號都是「引數表達式」。**

| 寫法 | 這個括號是什麼 |
| --- | --- |
| `fn(a, b)` | `Arguments` 產生式，裡面才是真正的引數表達式 |
| `function f(a, b)` | 參數宣告，裡面是 BindingIdentifier，不是引數 |
| `(a + b) * c` | 分組運算子，只是改變運算優先序 |
| `if (x)` / `while (x)` / `for (;;)` | 控制流程語法的一部分，文法上根本不是表達式的容器 |
| `(props) => ...` | 箭頭函式的參數宣告 |
| `return ( <div /> )` | 分組運算子。JSX 多行時包起來是為了避開 ASI（自動分號插入）把 `return` 後面切斷 |

最後那一列很值得記：**你在 React 裡寫 `return (` 換行 `<div>...` 的那個括號，跟函式呼叫一點關係都沒有，它純粹是為了防止自動分號插入把你的 return 變成 `return;`。**

---

## 七、誠實的邊界：hooks 為什麼不能寫在 `if` 裡，這一半 JS 給不了

前面每一節我都在說「這件事可以從 JS 推導出來」。這一節要說反面：**有一件事推導不出來，必須靠 React 自己。**

「每次呼叫都是全新的 Execution Context」這個事實，只解釋了「為什麼區域變數不會跨 render 保留」。但它**不能**解釋「`useState` 為什麼知道這次要回傳哪一個值」。

因為 JS 引擎完全不知道 hooks 存在。真正的機制是 React 自己維護的：

1. React 呼叫你的元件函式之前，會先把「目前正在 render 哪個 fiber」記在模組層級的變數裡（在 React 原始碼 `ReactFiberHooks.js` 的 `renderWithHooks` 函式裡）。
2. 每呼叫一次 hook，React 就在該 fiber 的 `memoizedState` 上接一個節點，**串成一條單向鏈結串列**。
3. 下一次 render 時，React 從頭走這條鏈，**用「第幾個被呼叫」當索引**去對應上一次的值。

所以 hooks 的順序不能變 —— 一旦你寫在 `if` 裡，某次 render 少呼叫一個，後面所有 hook 的索引就全部錯位。這條規則的根據是 React 的資料結構，不是 JS 的語言規格。

把邊界劃清楚很重要：**JS 的 Execution Context 解釋了「為什麼需要 hooks」（因為函式呼叫留不住東西），React 的 fiber 鏈結串列解釋了「hooks 怎麼做到」。兩者缺一不可。**

---

## 八、一頁總結

| JS 的機制 | React 裡對應的現象 |
| --- | --- |
| Parse 只做一次，Creation Phase 每次呼叫都重來 | 元件函式本體只被編譯一次，但每次 render 都重跑一遍 |
| 參數綁定是每次呼叫都重做的真宣告 | 每次 render 都有一組全新的 props 綁定 |
| 沒被閉包捕獲 → Stack，函式結束就釋放 | 元件裡的區域變數不會跨 render 保留 |
| 被閉包捕獲 → Heap Context，活得比呼叫久 | stale closure：`setInterval` 抓住舊的 `count` |
| 值要跨呼叫存活就得住在 Heap | `useState` 與 `useRef` 的值掛在 fiber 上，不在 Execution Context 裡 |
| 解構參數＝非簡單參數列表 | 你所有的 React 元件都是非簡單參數列表，`arguments` 不連動 |
| `this` 不是參數，是呼叫當下決定的獨立綁定 | class component 要 `bind(this)`，函式元件靠閉包所以不用 |
| 分組運算子 vs 引數表達式 | `return ( <div/> )` 的括號是防 ASI，不是函式呼叫 |
| 引擎不認識 hooks | 呼叫順序索引由 React 的 fiber 鏈結串列維護 |

一句話帶走：**React 沒有發明新的語言規則，它只是把「函式呼叫」這件事重複了無數次，於是所有 JS 呼叫語意的細節都被放大成了框架行為。**

---

## 練習題

LeetCode 的「30 Days of JavaScript」題庫裡，有幾題就是在考本篇的閉包與參數綁定，做完會很有感：

1. [2620. Counter](https://leetcode.com/problems/counter/) —— 最小的閉包題，直接對應 2-d 的「綁定被搬到 Heap」
2. [2665. Counter II](https://leetcode.com/problems/counter-ii/) —— 多個閉包共用同一組綁定
3. [2725. Interval Cancellation](https://leetcode.com/problems/interval-cancellation/) —— `setInterval` ＋ 清理函式，跟第一節那個 bug 是同一個結構
4. [2622. Cache With Time Limit](https://leetcode.com/problems/cache-with-time-limit/) —— 閉包 ＋ 計時器 ＋ 跨呼叫存活的狀態
5. [2632. Curry](https://leetcode.com/problems/curry/) —— 直接考「參數綁定是每次呼叫都重做一次」

NeetCode 目前沒有對應的 JavaScript 語言機制題組，這五題在 LeetCode 站內即可。

---

## 參考資料（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| React 官方文件 — State as a Snapshot | https://react.dev/learn/state-as-a-snapshot | 2026-09-06 查證 |
| React 官方文件 — Rules of Hooks 警告頁 | https://react.dev/warnings/invalid-hook-call-warning | 2026-09-06 查證 |
| React 官方文件 — rules of hooks（ESLint plugin） | https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks | 2026-09-06 查證 |
| React 原始碼 — `ReactFiberHooks.js`（`renderWithHooks`、hook 鏈結串列） | https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js | 2026-09-06 查證 |
| Dan Abramov — How Are Function Components Different from Classes? | https://overreacted.io/how-are-function-components-different-from-classes/ | 原文 2018-12，2026-09-06 重讀 |
| Dan Abramov — A Complete Guide to useEffect | https://overreacted.io/a-complete-guide-to-useeffect/ | 原文 2019-03，2026-09-06 重讀 |
| ECMA-262 — FunctionDeclarationInstantiation | https://tc39.es/ecma262/#sec-functiondeclarationinstantiation | 持續更新版，2026-09-06 查證 |
| ECMA-262 — IsSimpleParameterList | https://tc39.es/ecma262/#sec-static-semantics-issimpleparameterlist | 持續更新版，2026-09-06 查證 |
| MDN — Closures | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures | 2026-09-06 查證 |
| MDN — Strict mode（非簡單參數列表的限制） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode | 2026-09-06 查證 |
