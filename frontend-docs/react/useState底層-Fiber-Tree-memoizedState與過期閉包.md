---
title: useState 底層 — Fiber Tree、memoizedState 鏈表與過期閉包
type: topic-note
source: Gemini
tags: [gemini, react, hooks, useState, fiber, closure, lexical-scope, 記憶體, scheduler, key]
sources:
  - https://gemini.google.com/app/92bd0f70e642fe50
  - https://gemini.google.com/app/599804dd5ba114af
  - https://gemini.google.com/app/1f0cc8c21e6f88b5
  - https://gemini.google.com/app/76cde95192586aa7
updated: 2026-09-01
---

# useState 底層 — Fiber Tree、memoizedState 鏈表與過期閉包

> 本篇重點 a–z，共 26 個（u–z 為 2026-08-31 追加）。

## 重點整理

### 一、先釐清：函式怎麼把值交給外面

(a) <mark style="background: #ADCCFFA6;">副作用（Side Effect）</mark> 指的是函式去改動了自己作用域以外的東西。Vue 官方文件那段 `let A2` 先在外層宣告、再由 `update()` 去寫入，並不是因為「只有這樣外面才拿得到」，而是為了示範響應式系統如何追蹤一個已存在的狀態。

```js
let A0 = 1
let A1 = 2
let A2                 // 外層宣告的共享狀態
function update() {
  A2 = A0 + A1         // 有副作用：直接改寫外層變數
}
```

(b) <mark style="background: #BBFABBA6;">要把值交給外部，最乾淨的方式就是 `return`</mark>，完全不需要事先在外層 `let` 一個變數。

```js
function add(a, b) { return a + b }   // 純函式（Pure Function），無副作用
const result = add(1, 2)              // 外部直接接住，資料流一目瞭然
```

(c) 兩種寫法的定位對照：改寫外層變數 ≈ Vue 的 `watchEffect`／DOM 渲染（重點在「依賴變了就自動去做某件事」）；`return` 回傳值 ≈ Vue 的 `computed`（重點在「算完給你一個值」）。

### 二、React 的「私有記憶體」到底在哪

(d) <mark style="background: #ADCCFFA6;">Fiber Tree（Fiber 樹）</mark>是 React 內部維護的資料結構，完整存在於瀏覽器 JavaScript 引擎（例如 Chrome 的 V8）的 <mark style="background: #ADCCFFA6;">Heap Memory（堆積記憶體）</mark>裡。它不是什麼特殊硬體結構，本質就是一堆互相用指標引用的普通 JavaScript 物件。

(e) 每個元件對應一個 <mark style="background: #FFF3A3A6;">FiberNode</mark>，關鍵欄位如下：

```js
const fiberNode = {
  type: Counter,          // 指向你寫的元件函式本身（函式也是物件）
  memoizedState: {...},   // Hook 鏈表的頭，存 useState / useEffect 的資料
  updateQueue: null,      // 待處理的 setState 佇列
  child: childFiber,      // 第一個子節點
  sibling: siblingFiber,  // 下一個兄弟節點
  return: parentFiber,    // 父節點（名字叫 return 但意思是「往上回去」）
  alternate: null,        // 指向另一棵樹上的對應節點（雙重緩衝用）
}
```

(f) `type: Counter` 的 `Counter` 就是你 `export default function Counter()` 的那個元件函式。因為在 JavaScript 裡<mark style="background: #FFF3A3A6;">函式也是一種可被呼叫的物件（Callable Object）</mark>，所以可以直接把它塞進 `type` 欄位；React 要重新渲染時就去執行 `fiberNode.type()`。

(g) 為什麼 Fiber 節點不會被垃圾回收（Garbage Collection）掉？因為 React 初始化時建立了一個長久存活的根物件 `HostRoot`，整棵樹一直被 React 內部核心引用著。反觀元件函式裡的區域變數，函式一跑完沒人引用就會被 GC 清掉。

(h) <mark style="background: #ADCCFFA6;">雙重緩衝（Double Buffering）</mark>：記憶體裡同時存在 `Current Tree`（畫面上正在顯示的）與 `WorkInProgress Tree`（背景正在算的新狀態樹）。算完只要把指標一指就完成切換，舊樹交給 GC。

### 三、memoizedState 是一條單向鏈表

(i) <mark style="background: #FFF3A3A6;">有幾個 Hook 就有幾個節點</mark>，`useState`、`useEffect`、`useRef` 都算。容易搞混的是「同一個名字用在兩層」：

- 外層的 `fiberNode.memoizedState` 是 Fiber 節點上的**屬性名稱**，指向第一個 Hook 結構。
- 每個 Hook 結構**內部**也有一個叫 `memoizedState` 的屬性，那個才是存實際數值的地方。

```js
// 元件裡寫了兩個 Hook：useState(0) 與 useState('Alice')
fiberNode = {
  type: Counter,
  memoizedState: {          // 第一個 Hook（count）
    memoizedState: 1,       // count 當前的值
    next: {                 // 指向下一個 Hook
      memoizedState: 'Alice',
      next: null,
    },
  },
}
```

(j) 若元件完全沒呼叫任何 Hook，`fiberNode.memoizedState` 就是 `null`。

(k) <mark style="background: #FF5582A6;">常見誤解：第二次渲染時程式碼會變成 `useState(1)`。不會。</mark>原始碼永遠寫死 `useState(0)`，每次 re-render 都照樣執行到這一行、照樣把 `0` 傳進去。差別在於 `useState` 內部會問 Fiber：「這個節點已經存在了嗎」，存在就<mark style="background: #BBFABBA6;">忽略你傳的初始值</mark>，直接回傳鏈表裡的最新值。所以 `0` 只在第一次掛載（Mount）時有意義。

(l) 一句話收尾：<mark style="background: #FFF3A3A6;">你的函式元件本身是無狀態的，真正有狀態的是背後的 Fiber Tree；`useState` 只是向 Fiber 借取與更新資料的介面。</mark>

### 四、過期閉包（Stale Closure）

(m) React 完全遵守 JavaScript 的 <mark style="background: #ADCCFFA6;">Lexical Scope（詞法作用域）</mark>與閉包（Closure），這正是經典陷阱的來源。

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  const handleDelayLog = () => {
    setTimeout(() => {
      console.log('3 秒後印出的 count：', count)   // 抓的是「當次渲染」的 count
    }, 3000)
  }

  return (
    <div>
      <h2>當前 Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>加 1</button>
      <button onClick={handleDelayLog}>點擊後等待 3 秒印出</button>
    </div>
  )
}
```

(n) 時間軸拆解：

1. 第 0 秒點「延遲印出」，`setTimeout` 收下的回呼函式此刻對 `count = 0` 拍了一張<mark style="background: #FFB8EBA6;">快照（Snapshot）</mark>。
2. 第 1–2 秒連按三次「加 1」，React 重新執行元件三次，每次都產生**全新**的 `count` 變數（1、2、3）與**全新**的作用域，畫面顯示 3。
3. 第 3 秒計時到，執行的是當初那個回呼，它讀的是第 0 秒鎖住的作用域，所以 <mark style="background: #FF5582A6;">console 印出 0 而不是 3</mark>。

(o) 關鍵理解：<mark style="background: #FF5582A6;">舊作用域裡的函式不會自動拿到新作用域裡的變數。</mark>每次 re-render 都是一組新變數，舊閉包鎖住的是舊的那一組。

(p) `setTimeout(fn, 3000)` 的語意是「3 秒後才執行 fn」，但**參數是在呼叫當下就綁定完成**的，這兩件事分開想就不會混淆。

### 五、順手釐清的兩個小坑

(q) <mark style="background: #FF5582A6;">`() => setCount(count + 1)` 不是 IIFE。</mark>IIFE（Immediately Invoked Function Expression，立即調用函式表達式）的定義是「定義完當下就立刻呼叫」，語法尾巴一定有一對呼叫用的 `()`：

```js
;(() => { console.log('我被定義完就立刻執行了') })()   // 這才是 IIFE
```

(r) `onClick={() => setCount(count + 1)}` 只是建立一個匿名箭頭函式當回呼（Callback），交給按鈕的 `onClick` 保管；使用者真的點下去才會被呼叫。<mark style="background: #FF5582A6;">如果寫成 `onClick={setCount(count + 1)}`（少了 `() =>`），渲染到那一行就會立刻執行 `setCount`，觸發 re-render，再執行，再 re-render，陷入無限迴圈。</mark>

(s) <mark style="background: #ADCCFFA6;">Concurrent Mode（並行模式）</mark>之所以能在 Render 階段中斷、暫停、丟棄重來，靠的就是 Fiber Tree 這個可拆解成一個個小工作單元的鏈表結構。傳統遞迴的 Stack Reconciler 一旦開始就無法中斷，Fiber 把它改寫成可中斷的迴圈，這是 React 16 之後架構重寫的核心動機。

(t) <mark style="background: #D2B3FFA6;">次要備註</mark>：Gemini 用 `{ type: ..., memoizedState: ... }` 這種物件文字量（Object Literal）畫的示意圖是簡化模型，方便看清楚記憶體裡的指向關係。React 官方原始碼（`packages/react-reconciler/src/ReactFiber.js`）實際上是用建構函式 `function FiberNode(tag, pendingProps, key, mode)` 搭配 `new FiberNode(...)` 實例化的。<mark style="background: #BBFABBA6;">但兩者在 Heap 裡產生的實體都是 JavaScript 物件，本質完全一樣</mark>，這就是為什麼你用 Python 的 `class Node: def __init__(self, val, next)` 也能表達同一個鏈表結構。

### 六、追加 2026-08-31：FiberNode 的完整屬性、鏈表為何比陣列快、以及 key 的真正作用

(u) <mark style="background: #FFF3A3A6;">FiberNode 的屬性可以分成六大類</mark>，把這張表背起來，Fiber 的整套設計動機就串起來了：

| 分類 | 屬性 | 作用 |
| --- | --- | --- |
| 1. 樹狀結構指標 | `child` / `sibling` / `return` | 第一個子節點／右邊的兄弟節點／父節點。React 用這三個指標把樹「攤平成鏈表」 |
| 2. 類型與身分 | `tag` / `key` / `elementType` / `type` | `tag` 是數字列舉（FunctionComponent=0、ClassComponent=1、HostComponent=5…）；`type` 指向元件函式或 DOM 標籤字串 |
| 3. 狀態與屬性 | `pendingProps` / `memoizedProps` / `memoizedState` / `updateQueue` | 本次要進來的新 props／上次用過的舊 props／Hook 鏈表頭（Class 則是 `this.state`）／待處理的更新佇列 |
| 4. 真實 DOM 連結 | `stateNode` | 指向對應的「實體」，見 (w) |
| 5. 優先級與排程 | `lanes` / `childLanes` | 位元遮罩（Bitmask），見 (x) |
| 6. 雙重緩衝 | `alternate` | 指向另一棵樹上的對應節點 |

(v) <mark style="background: #FFF3A3A6;">為什麼用單向鏈表取代 `children: []` 陣列？</mark>關鍵不是「陣列很慢」，而是<mark style="background: #BBFABBA6;">遞迴無法中斷、迴圈可以</mark>：

- 傳統 Stack Reconciler 用遞迴走訪樹，一旦開始，Call Stack 就一路疊到底，中途沒辦法讓出主執行緒去處理使用者輸入。
- Fiber 把樹改寫成 `child → sibling → return` 的走訪規則，整棵樹用一個 `while` 迴圈（也就是原始碼裡的 `workLoop`）就能遍歷完：先往下走 `child`，沒有子節點就往右走 `sibling`，沒有兄弟就往上 `return`。
- <mark style="background: #BBFABBA6;">因為「目前走到哪」只是一個指標變數 `workInProgress`</mark>，React 隨時可以把它記下來、釋放主執行緒，等瀏覽器空閒再從那個指標接著跑，完全不必維護遞迴堆疊。
- 附帶好處：陣列需要連續記憶體、頻繁重建會增加 GC 壓力，鏈表沒有這個問題。

(w) <mark style="background: #ADCCFFA6;">`stateNode` 存的是「實體（Instance）」</mark>，三種情況三種值：

| 元件種類 | `stateNode` 內容 |
| --- | --- |
| HostComponent（`div`、`button` 等原生標籤） | 真實的 DOM 元素物件 |
| ClassComponent | `new MyClassComponent(props)` 產生的實例，裡面有 `this.props`、`this.state`、`this.setState` 與你定義的方法 |
| FunctionComponent | <mark style="background: #FF5582A6;">永遠是 `null`</mark>，因為 React 只是執行 `Counter(props)` 拿回 JSX，沒有 `new`、也沒有 `this` |

```js
// Class Component 對應的 FiberNode（簡化）
fiberNode = {
  tag: 1,                    // 1 代表 ClassComponent
  type: MyClassComponent,    // 類別本身
  stateNode: {               // 真正的 Class 實例
    props: { count: 0 },
    state: { name: 'Alice' },
    render() { /* ... */ },
  },
}
```

(x) <mark style="background: #ADCCFFA6;">排程（Scheduling）分成兩層</mark>，很多人只記得其中一層：

1. **FiberNode 上的標記**：`lanes` 記錄「這個節點自己」有哪些優先級的待處理任務，`childLanes` 記錄「整棵子樹」有哪些。兩者都是位元遮罩。<mark style="background: #BBFABBA6;">`childLanes === 0` 就代表整棵子樹沒事做，React 直接跳過（Skip），不必往下走。</mark>這就是 (v) 那個 `while` 迴圈能大幅剪枝的原因。
2. **獨立的 `scheduler` 套件**：React 會向它註冊一個 Task，Task 內含 `expirationTime`（越急的過期時間越短）、`callback`（實際的渲染工作）、`priorityLevel`。<mark style="background: #FFB8EBA6;">`scheduler` 內部用最小堆積（Min-Heap）管理這些 Task</mark>，永遠讓最急的先執行。
3. Lanes 的比喻是「賽道」：使用者點擊（Sync Lane）優先級極高，動畫或 `startTransition`（Transition Lane）優先級較低。

(y) <mark style="background: #FF5582A6;">列表的 `key` 要用資料的 `id`，不要用陣列索引 `index`</mark>，理由有兩個層級：

- **效能層級**：`['A','B']` 前面插入 `'NEW'` 之後，用 index 當 key 會讓 React 認為 `key="0"` 從 `'A'` 變成 `'NEW'`、`key="1"` 從 `'B'` 變成 `'A'`，於是三個 DOM 全部被改寫；用 id 當 key 則只會單純插入一個新節點。
- **正確性層級（更嚴重）**：如果列表項目裡有 `<input>` 或內部 state，刪掉第一筆之後第二筆的 index 會遞補成 `0`，React 看到 `key="0"` 還在就<mark style="background: #FF5582A6;">保留舊 DOM 與舊 state、只換 props</mark>，結果畫面上留下的是「你原本輸入給第一筆的內容」。這種 bug 不會報錯，只會讓資料看起來錯亂。
- 只有在「純顯示、絕不重排、不會增刪、且沒有內部 state」的列表，用 index 才勉強安全。

(z) <mark style="background: #FFF3A3A6;">`key` 一改變，React 就會 Unmount 舊元件再 Mount 新元件</mark>。判定規則是：同層級 ＋ 同元件類型 ＋ 同 `key` → 視為同一個實體，只更新 props；`key` 不同 → 舊的完整卸載（銷毀 DOM、跑 `useEffect` 的 cleanup），新的重新掛載（所有 `useState` 重置）。<mark style="background: #BBFABBA6;">這個特性可以反過來當作「重置元件狀態」的乾淨手法</mark>：

```jsx
// userId 一變，整個表單自動卸載重建，內部所有 useState 全部歸零
// 比在 useEffect 裡一個一個手動 setXxx(初始值) 乾淨太多
<UserProfileForm key={userId} userId={userId} />
```

## ⚠️ 存疑／更正

- **Gemini 說「已為你在今天的 Google Calendar 上新增這個研讀事項」**：這句話請不要當真。Gemini 在該對話中並未附上任何可驗證的事件連結，語氣也是「已嘗試為你安排」。<mark style="background: #FF5582A6;">建議自己去日曆確認是否真的有這筆事件</mark>，不要以為排程已完成。
- **另一段對話（`599804dd5ba114af`）中 Gemini 說「React 18 之後編譯工具已經改變，寫 JSX 不需要再 import React」**：時間點講錯了。<mark style="background: #BBFABBA6;">新版 JSX Transform 是 React 17（2020-10）引進的，不是 18。</mark>但後半句「`useState` 這類 Hook 仍然必須 import」是正確的。詳見同批筆記〈JSX 轉譯機制〉。

## 相關題目練習

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 2665. Counter II | https://leetcode.com/problems/counter-ii/ | 用閉包把狀態留在函式外，正是 useState 概念的最小可執行版本 |
| LeetCode 2622. Cache With Time Limit | https://leetcode.com/problems/cache-with-time-limit/ | `setTimeout` 搭配閉包捕捉變數，跟過期閉包同一組肌肉 |
| LeetCode 2623. Memoize | https://leetcode.com/problems/memoize/ | 手寫記憶化，直接對應 `memoizedState` 的命名由來 |
| LeetCode 206. Reverse Linked List | https://leetcode.com/problems/reverse-linked-list/ | Hook 鏈表就是單向鏈表，練熟指標操作再看 React 原始碼會輕鬆很多 |
| NeetCode Reverse a Linked List | https://neetcode.io/problems/reverse-a-linked-list | 同上，有影片講解 |

## 關聯筆記

- [[13-閉包-Closure-私有變數與傳址陷阱]] — 過期閉包不是 React 特有的 bug，而是閉包捕捉「綁定」而非「值」的必然結果，先看懂這篇再回來看 (m)–(o) 會更順。
- [[14-詞法作用域-Lexical-Scope-面試四段式]] — 每次 re-render 產生一組新作用域，正是詞法作用域的直接應用。
- [[11-記憶體模型-stack-heap-動態配置-GC]] — 對照 (d) 與 (g)：區域變數壽命短、Fiber Tree 常駐 Heap，兩者差在有沒有被引用。
- [[12-return-清理記憶體-stack-frame與閉包例外]] — 解釋為什麼「被閉包引用的變數」是 stack frame 清理的例外，補完 (o)。
- [[01-React-純函數與嚴格模式-StrictMode]] — StrictMode 刻意重複執行元件來抓副作用，跟 (a)(b) 的純函式觀念是一組。
- [[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]] — `useRef` 同樣掛在 memoizedState 鏈表上，差別只在改值不排程 re-render。
- [[JIT與useMemo-CPU記憶體取捨]] — `useMemo` 也是鏈表上的一個節點，理解 (i) 之後就懂它為什麼不能寫在條件式裡。
- [[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]] — 本篇講「狀態存在哪」，那篇講「狀態改變之後 React 怎麼把它送上畫面」，兩篇是同一條流程的前後段；(z) 說 key 改變會 Unmount，Unmount 在記憶體與 DOM 上具體發生什麼事就在那篇的第四節。

## 各對話來源（原文）

### 變數宣告與 Return 的差異（2026-08-28）— https://gemini.google.com/app/92bd0f70e642fe50

**使用者：** 前面的例子在講宣告式跟命令式的不同，但除此之外，又講到原生的 JavaScript 必須要把外部變數定義好，然後再讓函式內部使用。是否是因為這樣子，才能給外部作用域使用？還是說其實我外部不用 let 宣告一個變數，但我內部宣告的變數或是參數寫了 return，一樣可以給外部使用呢？

**Gemini：** 核心答案是你的理解非常準確，不需要在外部先用 let 宣告變數，只要函式內部有 return，外部就可以接收並使用這個結果。Vue 官方文件那個範例先宣告 `let A2` 的原因不是「唯有這樣外部才能用」，而是為了演示副作用與狀態變更——`update()` 沒有返回值，它的目的就是去改變外部狀態 A2，Vue 的響應式系統核心就在於追蹤狀態變化並自動觸發更新。使用 return 則是純函式：資料流明確、無副作用、方便重複呼叫。對照表：外部宣告變數對應 `watchEffect` 或 DOM 渲染，使用 return 對應 `computed`。

**使用者：** 是否對 React 的 useState hook 來說，這個都是在函式元件內部的變數，所以它完全沒有所謂的 lexical scope 的外部變數？

**Gemini：** 不完全是這樣。useState 雖然在函式元件內部呼叫並宣告狀態，但它之所以能運作，背後完全依賴 JavaScript 的 Lexical Scope 與閉包機制。元件本質上只是一個每次渲染都會重新執行的普通函式，如果 state 單純只是區域變數，每次重新執行就會被重置。useState 能在多次渲染之間記住舊值，是因為 React 在元件外部（React 內部的 Fiber 節點／記憶體）維護了一個狀態鏈表。接著 Gemini 舉了 `setTimeout` 印出舊 count 的過期閉包範例。

**使用者：** 1. react 有一個自己私有的記憶體嗎 2. 幫我去我今天的行事曆寫上我需要實作過期閉包 3. 我還沒有真正了解剛剛延遲印出 count 是 0 這件事，我應該直接貼到我的專案中測試嗎？setTimeout() 應該是點擊的 3 秒後才觸發函式的意思嗎？

**Gemini：** 是的，React 內部有 Fiber Tree，狀態存在 Fiber 節點記憶體而非你的函式內部。行事曆部分回覆「已為你在今天的 Google Calendar 上新增這個研讀事項，標題：實作過期閉包原因：尚未真正了解延遲印出 count 為 0」。並強烈建議直接貼到專案中實作測試，附上 `ClosureTest` 元件範例。最後拆解時間軸：第 0 秒拍照、第 1–2 秒連點加 1、第 3 秒印出當初那張照片所以是 0。

**使用者：** 資料結構稱為 Fiber Tree（Fiber 樹）。是在記憶體嗎

**Gemini：** 是的，完全存在於瀏覽器的 JavaScript 堆積記憶體（Heap Memory）中。它本質上是一堆互相引用的普通 JavaScript 物件，透過指標彼此連結，駐留在 V8 分配的 Heap 中。之所以能在元件執行完後繼續存活，是因為 React 初始化時建立了一個長久存活的根物件 HostRoot。另外 React 在記憶體中同時維持 Current Tree 與 WorkInProgress Tree 兩棵樹，這就是雙重緩衝機制。

**使用者：** `() => setCount(count + 1)` 為啥要這樣寫算 IIFE?

**Gemini：** 它絕對不是 IIFE，只是一個普通的箭頭函式／回呼函式。IIFE 的核心定義是函式定義出來的當下就立刻執行，語法尾巴有一對 `()`。而 `onClick={() => setCount(count + 1)}` 在 React 渲染時只是建立了一個匿名函式交給 onClick，使用者真的點擊才會被呼叫。如果少了 `() =>` 直接寫 `onClick={setCount(count + 1)}`，渲染到這一行就會立刻觸發，導致無限迴圈崩潰。

**使用者：** 所以他上次紀錄的值是放在 react fiber tree 裡面嗎？

**Gemini：** 是的。每個元件對應一個 FiberNode，節點物件內部有一個屬性叫 memoizedState，React 會在上面建立一個單向鏈表。第一次渲染時放入第一個節點值為 0；呼叫 setCount(1) 時 React 把更新請求掛到該節點的更新佇列並排定重新渲染；第二次渲染時 useState 檢查節點是否已存在，存在就忽略初始值 0，直接回傳 memoizedState 計算後的最新值 1。

**使用者：** 我不太懂我的元件寫在 type: Counter 是什麼意思，這邊的 Counter 是模仿 export default function 的元件名稱嗎？所以是有幾個 useState 就會有幾個 memoizedState 嗎？所有的 memoizedState 都會由一個 memoizedState 屬性包裹？第二次渲染不是已經到 useState(1) 了嗎？函式元件本身是無狀態的，你說在區域變數是一般的記憶體裡面嗎？

**Gemini：** 逐點回覆——(1) Counter 就是你定義的函式元件，函式也是物件，React 把它的引用存在 Fiber 的 type 屬性。(2) 每一個 Hook 對應鏈表中的一個節點，外層 `fiberNode.memoizedState` 是屬性名稱指向第一個 Hook，Hook 結構內部也有同名屬性存實際數值；沒有任何 Hook 時外層為 null。(3) 第二次渲染仍走到 useState(0) 是因為原始碼沒有改變，1 是 Fiber 查鏈表後回傳的。(4) 不管第幾次渲染都會檢查 Fiber 節點是否存在。(5) 區域變數存在 Stack 或短暫的 Heap，函式執行完若沒被閉包引用就會被 GC 銷毀；Fiber Tree 則長期駐留。

**使用者：** 我要介紹 useState 是要怎麼運作的，他是透過 fiberNode。你畫的是一個物件的結構，我也可以寫成 `class Node: def __init__(self, val, next)`。為什麼要寫成類別，有的又是寫成物件的方式？在 JS 中函式也是一種物件，那在 REACT 中函式也是一種物件嗎？

**Gemini：** 無論用 Class 還是 Plain Object，在記憶體中建立出來的本質都是物件，差別在抽象層級與設計習慣。Class 適合當藍圖、可封裝方法、支援強型別檢查；Plain Object 語法簡潔、適合純資料結構。至於函式，JavaScript 中函式是一等公民且本身就是可呼叫物件，React 是用 JavaScript 寫的所以完全適用，Fiber 的 `type` 存的就是 Counter 這個函式物件本身。

**使用者：** 所以你只是用一個物件去表現 FiberNode，並非 react 官方真的就是這樣寫的嗎？

**Gemini：** 是的，我寫的是極度簡化的示意模型。React 官方原始碼（`packages/react-reconciler/src/ReactFiber.js`）確實定義了一個 `function FiberNode(tag, pendingProps, key, mode)` 建構函式，裡面設定 tag、key、elementType、type、return、child、sibling、memoizedState、updateQueue、alternate 等欄位，運作時透過 `new FiberNode(...)` 實例化。不管寫成 class 還是物件文字量，在 Heap 裡產生的實體都是 JavaScript 物件。

### 程式碼報錯原因解析（2026-08-28，語音模式片段）— https://gemini.google.com/app/599804dd5ba114af

> 這是一段語音輸入的對話，語音辨識品質很差，以下只擷取有技術內容的段落。

**使用者：** React is about concurrent mode. 但是它是可以在 render 階段就是中斷暫停，丟棄重來的。

**Gemini：** 是的，React 的 Concurrent Mode 確實允許在 Render 階段中斷工作、暫停，甚至在必要時放棄重來，以維持 UI 的流暢性。

**使用者：** 他的 fiber tree 有關係喔！（語音辨識為「他的飛機和 fiber tree」）

**Gemini：** 是的，React 的 Fiber tree 是 Concurrent Mode 的核心，它讓引擎能夠在背景運算並追蹤各個組件的狀態與更新順序。

### 追加 2026-08-31｜變數宣告與 Return 的差異（第二串同名對話）— https://gemini.google.com/app/1f0cc8c21e6f88b5

> 側欄有兩串同名對話，這一串是延續前一串往下追問 Fiber 內部細節的部分。前半段（Fiber Tree 在哪、IIFE、memoizedState 鏈表、type: Counter、官方原始碼寫法）與上一串重複，已合併在上方重點整理，此處只保留新增的問答。

**使用者：** Fiber node 還有哪些屬性？

**Gemini：** 分成六大類——(1) 結構指標 `child`／`sibling`／`return`，React 拋棄傳統的 `children` 陣列改用單向鏈表。(2) 元件類型與標記 `tag`（FunctionComponent=0、ClassComponent=1、HostComponent=5）、`key`、`elementType`、`type`。(3) 狀態與屬性 `pendingProps`、`memoizedProps`、`memoizedState`、`updateQueue`。(4) 畫面真實 DOM 連結 `stateNode`。(5) 優先級與排程 `lanes`、`childLanes`，React 18 Concurrent Mode 的核心。(6) 雙重緩衝 `alternate`。

**使用者：** 單向 linked list 比較快？Function component 沒有實例那 class component 就有喔？他長怎樣？那 fibernode 沒有 scheduling 屬性嗎？

**Gemini：** (1) 是的。陣列需要連續記憶體、頻繁建立會增加 GC 壓力；更關鍵的是傳統遞迴走訪樹會把 Call Stack 疊很高，一旦開始就無法中途暫停去處理高優先級任務。改用 `child`／`sibling`／`return` 之後，React 可以用一個 `while` 迴圈（`workLoop`）遍歷整棵樹，目前位置只是一個指標變數 `workInProgress`，隨時可以記住位置、釋放主執行緒、之後接著跑。(2) Class Component 確實有實例，React 底層會 `new MyClassComponent(props)`，這個實例存在 FiberNode 的 `stateNode` 屬性中，包含 `this.props`、`this.state`、`this.setState` 與你定義的方法；Function Component 只是純函式，執行完就結束，所以 `stateNode` 永遠是 `null`。(3) 有，排程屬性就是 `lanes` 與 `childLanes`（位元遮罩）；`childLanes` 為 0 代表整棵子樹沒有待處理任務可以直接跳過。除此之外 React 還有一個獨立的 `Scheduler` 套件，Task 內含 `expirationTime`、`callback`、`priorityLevel`，內部用最小堆積（Min-Heap）管理，確保最急的任務先執行。

**使用者：** 最好用資料的 id 而非索引值來當 key？Key 有變的話會 unmount 嗎？

**Gemini：** (1) 是的。用 index 當 key，在「順序改變、中間插入、刪除項目」時會讓 Diff 演算法誤判。以 `['A','B']` 前面插入 `'NEW'` 為例，用 index 會導致三個 DOM 全部被重新修改，用 id 則只會插入一個新節點。更嚴重的是列表項帶有內部 state 或 `<input>` 時，刪掉第一筆後第二筆 index 遞補為 0，React 會保留舊 DOM 與內部狀態只替換 props，畫面上就會殘留你輸入給前一筆的內容。(2) 會，完全會。同層級＋同元件類型＋同 key 才視為同一個元件實體；key 改變 React 就會把舊元件完全 Unmount（銷毀 DOM、觸發 useEffect cleanup）並重新 Mount 新元件（重置所有 useState）。這個特性可以反過來當作重置狀態的乾淨做法，例如 `<UserProfileForm key={userId} userId={userId} />`。

### 追加 2026-09-01｜變數宣告與 Return 的差異（第三串同名對話）— https://gemini.google.com/app/76cde95192586aa7

> <mark style="background: #D2B3FFA6;">這是側欄第三串同名對話，內容與前兩串<mark style="background: #FF5582A6;">高度重複</mark>，逐字比對後<mark style="background: #BBFABBA6;">沒有任何新增知識點</mark>：Fiber Tree 在 Heap Memory、`() => setCount(count+1)` 不是 IIFE、`memoizedState` 單向鏈表、`type: Counter` 的意義、為什麼第二次渲染仍走到 `useState(0)`、區域變數 vs Fiber Tree 的壽命、Class 與 Plain Object 表示法等價、官方原始碼的 `function FiberNode(tag, pendingProps, key, mode)` 建構函式、FiberNode 六大類屬性、單向鏈表為何優於陣列、Class 實例存在 `stateNode`、Lanes 與 Scheduler 的 Min-Heap、`key` 用 id 而非 index、`key` 改變會 Unmount——以上全部已收錄在本篇 (d)–(z)。</mark>
>
> 為節省磁碟空間<mark style="background: #BBFABBA6;">不重複收錄原文</mark>，僅把對話 ID 登記進 frontmatter 的 `sources`，避免下次增量掃描又把它當成待處理項目。若日後需要原文，直接點上方連結即可。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇對話（變數宣告與 Return 的差異，第二串） | https://gemini.google.com/app/1f0cc8c21e6f88b5 | Gemini Flash，2026-08-31 |
| 本篇對話（變數宣告與 Return 的差異，第三串，內容重複未另收錄） | https://gemini.google.com/app/76cde95192586aa7 | Gemini Flash，2026-09-01 查證 |
| React 原始碼 — ReactFiberWorkLoop.js（`workLoop` 與可中斷渲染） | https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js | main 分支，2026-08-31 查證 |
| React 原始碼 — ReactFiberLane.js（Lanes 位元遮罩定義） | https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberLane.js | main 分支，2026-08-31 查證 |
| React 官方 — Rendering Lists（為什麼要用穩定的 key） | https://react.dev/learn/rendering-lists#why-does-react-need-keys | react.dev 現行文件，2026-08-31 查證 |
| React 官方 — Preserving and Resetting State（用 key 重置狀態） | https://react.dev/learn/preserving-and-resetting-state | react.dev 現行文件，2026-08-31 查證 |
| 本篇對話（變數宣告與 Return 的差異） | https://gemini.google.com/app/92bd0f70e642fe50 | Gemini Flash，2026-08-28 |
| 本篇對話（程式碼報錯原因解析，語音片段） | https://gemini.google.com/app/599804dd5ba114af | Gemini Flash，2026-08-28 |
| React 官方 — State as a Snapshot（過期閉包的官方說法） | https://react.dev/learn/state-as-a-snapshot | react.dev 現行文件，2026-08-29 查證 |
| React 官方 — Queueing a Series of State Updates | https://react.dev/learn/queueing-a-series-of-state-updates | react.dev 現行文件，2026-08-29 查證 |
| React 原始碼 — ReactFiber.js（FiberNode 建構函式） | https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js | main 分支，2026-08-29 查證 |
| Vue 官方 — 深入響應式系統（(a) 的 A0/A1/A2 範例出處） | https://vuejs.org/guide/extras/reactivity-in-depth.html | Vue 3 現行文件，2026-08-29 查證 |
| MDN — Closures | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures | MDN 現行版本，2026-08-29 查證 |
| MDN — IIFE 詞彙表 | https://developer.mozilla.org/en-US/docs/Glossary/IIFE | MDN 現行版本，2026-08-29 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-08-31
