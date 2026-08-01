---
title: React 純函數與嚴格模式 (StrictMode)
type: topic-note
source: Gemini
tags: [gemini, react, 純函數, StrictMode, 副作用, fiber, hooks]
sources:
  - https://gemini.google.com/app/7513ffa1facd9680
updated: 2026-08-01
---

# React 純函數與嚴格模式 (StrictMode)

## 重點整理

### 純函數 (Pure Function) 是什麼
<mark class="b">純函數</mark>指的是：<mark class="y">給定相同的輸入，就一定會產生相同的輸出，而且不能有任何副作用 (side effect)</mark>。

### 為什麼 React 要求 render 是純的
React 在渲染元件時，把元件當成一個「輸入 props/state → 輸出 UI」的純函數。<mark class="r">如果你在渲染（或計算狀態更新）的過程中去修改外部變數、或直接發 API 請求，這些都算「副作用」，很容易導致元件狀態不穩定、畫面對不上資料。</mark><<那為何React18要引入Concurrent Mode難道不是允許他在渲染過程中去修改外部變數、或直接發API請求嗎？反而副作用放在useEffect更重要。
	React 18 Concurrent Mode，Render階段是可以被React中斷、暫停甚至丟棄重來。
**Concurrent rendering** in [React 18](https://legacy.reactjs.org/blog/2022/03/29/react-v18.html) is a foundational change to the core rendering engine that ==allows React to prepare multiple versions of the user interface (UI) at the same time==

<mark class="b">快速澄清（完整推導見文末「追問：Concurrent Mode」）：Concurrent Mode 不是「允許」render 有副作用，恰恰相反——正是因為 render 被要求保持純，React 才敢放心地中斷/丟棄/重跑它。副作用放進 useEffect 在 Concurrent Mode 下不是變得不重要，而是變得更重要：useEffect 只在「真正被 commit 的那次更新」才執行，被丟棄的候選 render 完全不會觸發它。</mark>

<mark class="g">正解：副作用要放在對的地方 —— 例如 `useEffect`、事件處理函式 (event handler) 裡，而不是寫在 render 主體中。</mark>

### 嚴格模式 (StrictMode) 的角色
<mark class="b">StrictMode</mark> 是 React 用來幫你抓出這些潛在問題的開發工具。它會<mark class="y">故意「重複執行」一段程式碼（例如把 render／某些函式呼叫兩次）</mark>，藉此放大「不純」的行為 —— 如果你的 render 有副作用，跑兩次結果就會不一致，問題馬上現形。

<mark class="v">補充：StrictMode 的雙重呼叫只發生在開發模式 (development)，正式上線 (production) 不會重複執行，所以不用擔心效能。</mark>

## 各對話來源

### React 純函數與嚴格模式（2026-06）— https://gemini.google.com/app/7513ffa1facd9680

**使用者：**

再多幫我延伸一些觀念嗎？（承接畫面上的「純函數」概念）

**Gemini：**

好的，沒問題！純函數概念在 React 開發裡非常重要。簡單來說，純函數是指給定相同的輸入，就一定會產生相同的輸出，而且不能有任何副作用。

在 React 裡，如果你在渲染元件或是執行狀態更新的時候去修改了外部變數，或是發起了 API 請求等，這些都稱為有副作用，很容易導致元件狀態不穩定。

畫面中提到的嚴格模式，就是 React 用來幫你抓出這些潛在問題的工具，它可以強制重複執行一段程式碼，幫助你確保程式碼是純淨的。

### useState 到底算不算「存取全域變數」？（2026-08-01）— Claude Code

**使用者的疑問：**

給了一個經典副作用範例（模組層級 `let x`，函式內 `x = x + n` 並 `console.log`），質疑這種例子沒有真正對應到 React；並且認為 `useState` 也「無法真正證明每次輸入輸出不同」，說穿了不就是存取全域變數的概念嗎？

**Claude 的說明：**

<mark class="b">關鍵差異不在「有沒有狀態」，而在「render 主體有沒有直接改變一個外部可變變數」。</mark>

- 使用者原本的例子：`x` 是模組層級的可變變數，函式**直接讀取並重新賦值**它，是典型副作用（mutate external state + I/O）。
- `useState`：`const [count, setCount] = useState(0)` 中的 `count` 是 React 每次呼叫元件函式時**傳進來的一份快照值**（概念上像參數），render 主體只「讀」它，並不會在 render 時去 mutate 任何共用變數。呼叫 `setCount(...)` 也不是「立刻改一個全域變數」，而是**通知 React 排一次未來的 render**，用新的 state 值再呼叫一次元件函式。

<mark class="y">所以「同輸入同輸出」指的是：對於同一次 render（同一份 props/state 快照），呼叫元件函式兩次必須產生一樣的結果 —— 這正是 StrictMode 開發模式下「故意呼叫兩次」要驗證的事。</mark>

**用一個可以實際打開瀏覽器驗證的 demo 對照這兩種情況：** [[react-pure-function-demo]]
- ❌ 不純版本：在 render 主體直接改模組層級變數（複刻使用者原本的 `addAndPrint` 副作用），StrictMode 下兩次呼叫會印出不同的值（1, 2），證明「不純」。
- ✅ 純版本：用 `useState` 的 `count`，render 主體只讀不改，StrictMode 下兩次呼叫印出完全相同的值，證明「同輸入同輸出」成立。

檔案位置：`C:\coding\JavaScript-practicing\react-pure-function-demo.html`（單檔 HTML + CDN 引入 React/Babel，雙擊或用 Live Server 開啟即可，不需要另外 npm install）。

**若要改用真正的 Vite React 專案跑同樣的觀念（有 HMR、更接近實務）：**

```bash
npm create vite@latest pure-fn-demo -- --template react
cd pure-fn-demo
npm install
npm run dev
```

### 追問：不純範例為何沒加按鈕？純版本 console.log 為何每次都印兩組？（2026-08-01）— Claude Code

**使用者的疑問：**
1. `ImpureRenderDemo` 沒有計數器/按鈕，是不是刻意省略？
2. `PureRenderDemo` 每次點擊 `+1`，console 都印出兩組一樣的 log，為什麼？

**Claude 的說明：**

<mark class="y">StrictMode 的雙重呼叫不是只發生在「初次掛載」，而是每一次重新渲染（包含每次 setState 觸發的更新）都會被呼叫兩次。</mark>純版本每點一次 `+1`，兩次呼叫都拿到「同一份 count 快照」，所以印出兩行一模一樣的值——這正是在證明「同輸入同輸出」。

<mark class="r">不純版本原本的確有缺陷：它沒有 props/state，React 掛載完就不會再重新渲染它，只能看到掛載當下那一次雙重呼叫（1, 2），之後就凍結，沒辦法展示「持續互動下錯誤如何累積」。</mark>

<mark class="g">修正：加了一顆只用來「強迫重新 render」的 dummy state（`const [, forceRerender] = useState(0)`），本身不是示範要驗證的值。點擊後 `impureExternalCount` 會用不成對的方式持續往上跳（3,4 → 5,6 → 7,8...），更清楚地展示不純函式的錯誤會隨互動累積。</mark>

### 追問：純版本明明也被呼叫兩次，為什麼點一次 +1 不會變成 +2？「diff」是使用者點擊造成的，不是程式碼被重寫？（2026-08-01）— Claude Code

**使用者的推論（原話大意）：**

純函式那邊也是 render 兩次，為什麼沒有 +1 變 +2？是不是因為實際上只點擊了一次，所以 React 不會把第二次渲染當成真實的 diff？實際上是沒有 diff 的，但這個「diff」是使用者去改變數因為 click，並非程式碼有重寫到——這樣理解對嗎？

**Claude 的驗證與補充：**

<mark class="b">使用者的直覺完全正確，這裡補上精確的機制。</mark>StrictMode 的「呼叫兩次」發生在**兩個不同層次**，而且兩層都是「呼叫兩次 → 留一個 commit、丟一個」，不是「呼叫兩次、兩個結果都套用/疊加」：

1. <mark class="y">**updater 函式層**：`setCount(c => c + 1)` 裡的 `c => c + 1`，React 用「同一個舊的 count」呼叫它兩次（兩次都算出 舊count + 1），取其中一次當新 state，另一次丟掉——不是把第一次的結果再餵給第二次，所以不會累加成 +2。</mark>
2. <mark class="y">**render 函式層**：新 state 確定之後，React 再呼叫元件函式本體兩次，兩次都吃到「同一個已確定的 count」，所以印出兩行一模一樣的 log，一次拿去畫面渲染、一次丟掉。</mark>

<mark class="r">關於「diff」這個詞需要修正的地方：React 並沒有真的去比較這兩次呼叫的輸出、算出一個 diff 來自動判斷「純不純」。它單純是「丟一個、留一個」的機制；是否不純，要靠開發者自己觀察 console.log 有沒有兜不起來才會發現（就像不純範例那樣，兩次印出的值真的不一樣）。</mark>

<mark class="g">「diff 是使用者點擊造成、並非程式碼重寫」——這句話精確的講法是：同一份程式碼被 React 多執行了一次（不是重寫、不是不同版本的程式碼），那多執行的一次的回傳值被直接丟棄，從未被 commit。真正造成畫面變化的唯一一次 commit，觸發源頭就是那一次 click；被丟棄的那次只是驗證用的副本。</mark>

延伸敘述已同步寫入 demo 檔案：`C:\coding\JavaScript-practicing\react-pure-function-demo.html`（✅ 純版本卡片內的第二個 hint 區塊）。

### 使用者統整（自己歸納，2026-08-01）— 全部驗證正確

1. 第一次知道 StrictMode 會有兩次 render。
2. 用 StrictMode 才能讓錯誤問題更明顯，因為是 2 次呼叫。
3. 但 `onClick` handler 本身只會被瀏覽器呼叫 1 次（點 1 次 = 1 次），最後只發送一次真正的 state 更新；兩次呼叫都是拿「同一個舊值」算，並非拿剛剛算出的新值再算一次——<mark class="g">就像同一道數學題目算兩次，但沒有從第一次的結果開始累加。</mark>
4. StrictMode 呼叫兩次的「引數 2」是 updater 函式層：`c => c + 1` 這個函式，React 會用同一個 `prevCount` 呼叫它 2 次，取其中一次當作新的 state（被 React 實際拿去 commit、套用到畫面 / fiber 樹），另一次丟掉。

## Fiber 樹是什麼（簡答）

<mark class="b">Fiber</mark> 是 React 16 之後內部維護的資料結構，用來描述整個 component tree，每個元件/DOM 節點對應一個 fiber 節點。目的是讓 render 這個計算過程<mark class="y">可以被中斷、恢復、丟棄、重複使用</mark>（舊版 Stack Reconciler 一旦開始算就要一次跑完，無法中斷）。

Reconciliation（協調）時同時存在兩棵樹：
- **current 樹**：目前畫面實際對應的那棵。
- **work-in-progress 樹**：這次更新正在計算中的新樹。

算完後，work-in-progress 樹直接「雙緩衝」swap 成新的 current 樹，舊的丟掉（概念類似顯示卡的 double buffering）。<mark class="g">跟這份 demo 的關聯：StrictMode「呼叫兩次丟一次」，被丟掉的那次，就是沒有被拿去變成新 current 樹的那份計算結果。</mark>

## React 生命週期（function component / hooks 版本）— 重點在 unmount

三個階段：

1. **Mount（掛載）**：元件第一次被建立、插入畫面。`useEffect(() => {...}, [])` 的 effect 主體在 mount 後執行一次。
2. **Update（更新）**：props 或 state 改變 → 重新 render。依賴陣列裡的值變了時，`useEffect` 會先執行「上一輪的 cleanup」，再執行新的 effect 主體。
3. **Unmount（卸載）**：元件從畫面被移除（例如 `{show && <Comp/>}` 的 `show` 變 `false`，或父層 `key` 改變導致整個重建）。`useEffect` 回傳的「cleanup 函式」會在這個時機被呼叫。

<mark class="r">Unmount 重點：</mark>

```js
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer); // 這個 return 的函式就是 unmount 時會跑的 cleanup
}, []);
```

常見用途：清除 timer、取消 API 請求（`AbortController`）、移除事件監聽、關閉 WebSocket——避免元件消失後這些「殭屍副作用」還在背景跑，甚至對已卸載的元件呼叫 setState（React 會警告 memory leak）。

<mark class="y">StrictMode 在開發模式下，mount 階段也會刻意跑一次「mount → unmount → 重新 mount」，用意是提早幫你抓「cleanup 沒寫好」的 bug——跟這份 demo 在測的「render 純不純」是不同的檢查對象，但原理相同：多跑一次來逼你發現問題。</mark>

相關：元件被 unmount 時 React 丟棄對其計算結果（如 `useMemo`）的引用，之後才輪到 V8 GC 真正回收記憶體，細節見 [[JIT與useMemo-CPU記憶體取捨]]。

### 追問：為什麼一直提到「快照」？（2026-08-01）— Claude Code

<mark class="b">「快照」是 React 官方對 state 的定義：每一次 render，state 都被「凍結」成一個固定值，在那次 render 執行的整個過程中（不管程式碼跑了多久、被呼叫幾次），這個值絕對不會變——像照相機拍下的一張照片，拍下那瞬間畫面就定格，不會因為之後發生什麼事而跟著變。</mark>

- `PureRenderDemo`：React 決定「這一輪 render，count 用 1」之後，不管 StrictMode 把函式呼叫幾次，函式內的 `count` 永遠是被釘死的 `1`。兩次呼叫印出一樣的值，**不是程式碼保證算出一樣的答案，而是兩次根本讀同一顆凍結的值，連改變的機會都沒有。**
- `impureExternalCount`：這是模組層級的 `let` 變數，不屬於任何一次 render，是**所有呼叫共用、持續存在、隨時可讀寫的箱子**。第一次呼叫 `+= 1` 把它從 0 改成 1；第二次呼叫讀到的不是「這次 render 的原始輸入」，而是「上一次呼叫剛改過的殘留值」，於是又變成 2。兩次呼叫表面上輸入一樣（都沒有 props），但因為讀寫的是同一顆會被中途竄改的共用箱子，實際看到的值卻不同。

<mark class="g">一句話：快照 = 這次 render 專屬、被釘死不會變的值（React 保證）；模組層級變數 = 沒人保管、隨時可能被上一次呼叫改掉的共用值（沒有任何保證）。「純函式」的定義是「輸出只能依賴明確傳進來的輸入」，快照因為被釘死，天生符合這個定義；模組層級可變變數則天生違反它。</mark>

### 追問：「模組」是指這個檔案而已嗎？（2026-08-01）— Claude Code

<mark class="b">嚴格定義（ES Module，例如 Vite/webpack 專案裡的 .jsx 檔）：一個檔案 = 一個 module，每個檔案有自己獨立、私有的頂層作用域。A.jsx 頂層宣告的 `let count = 0`，B.jsx 完全看不到，除非 `export`/`import`。這種「檔案＝模組＝私有作用域」基本上是 1:1。</mark>

<mark class="r">但這份 demo 檔案的 `<script type="text/babel">` 其實是 classic script（傳統 script 標籤），不是 `type="module"` 的真正 ES module。傳統 script 標籤裡用 `let`/`const` 宣告的頂層變數，是活在整個 HTML 頁面共用的「全域詞法作用域」，不是檔案私有的。只是這份 demo 只有一個 script 區塊，效果才會看起來跟「檔案私有模組作用域」一樣。</mark>驗證方式：若在同一個 HTML 檔裡再加第二個 `<script type="text/babel">` 並重複宣告 `let impureExternalCount`，瀏覽器會直接噴 `SyntaxError: redeclaration`——證明它們其實共用同一份全域作用域，不是各自獨立的模組作用域。

<mark class="g">結論：筆記/demo 裡用「模組層級變數」這個詞是借用概念、簡化講法；精確說法是「這個 HTML 頁面的全域作用域變數」，只是剛好只有一個 script 區塊，行為上看起來跟模組作用域一樣。</mark>

## 深挖：useState 背後的資料結構、指標、call stack（2026-08-01）— Claude Code

以下是 react-reconciler（React 源碼）長期以來的通用邏輯，細節可能隨版本微調，核心資料結構與流程穩定。<mark class="b">useState 從不「搜尋/改動整棵 fiber tree」，只透過一條掛在目前 fiber 節點上的 hook 鏈結串列操作。</mark>

### 資料結構（指標角度）

```
FiberNode { memoizedState: ──► Hook(第1個 hook) }

Hook {
  memoizedState,       // 目前值（對 useState 就是 count）
  queue: ──────────────► UpdateQueue
  next: ────────────────► 下一個 Hook（按呼叫順序串成鏈）
}

UpdateQueue { pending: ──► Update（環狀鏈，指向「最後插入」節點）, dispatch }

Update { action, next: ──► 下一個 Update }
```

<mark class="y">`Hook.next` 順序完全對應程式碼裡呼叫 `useState`/`useEffect`... 的順序，沒有名字可查——這就是 hooks 不能寫在 `if`/迴圈裡的底層原因：順序一亂，走訪就對不上。</mark>`queue.pending` 是環狀鏈：`pending` 指向最後插入節點，`pending.next` 指向第一個節點，插入 O(1)。

### `setCount(c => c+1)` 呼叫時

1. `dispatch`（即 `setCount`）是個 closure，`useState()` 建立時就已經 `bind` 死 `fiber`、`queue` 兩個指標——之後不管在哪個 call stack 呼叫它（例如 onClick handler，原本 render 的 call stack 早已退出），都知道要改哪個 fiber 的哪個 queue。
2. heap 上配置新的 `Update` 物件，`action` 欄位**指向** `c => c+1`（此時尚未呼叫，延遲到 render 階段才真正執行）。
3. 指標操作把新 `Update` 接到 `queue.pending` 尾端。
4. `scheduleUpdateOnFiber` 標記 fiber 及祖先「有工作」，Scheduler（優先權 min-heap）透過 `MessageChannel`/`postMessage` 排一個新的 macrotask。

### 真正 re-render 的 call stack（全新一輪，跟上面的 call stack 無關）

```
performSyncWorkOnRoot/performConcurrentWorkOnRoot
 → renderRootSync → workLoopSync → performUnitOfWork(fiber)
  → beginWork → updateFunctionComponent
   → renderWithHooks(current, wip, YourComponent, props)
     // currentlyRenderingFiber 指向這個 fiber；workInProgressHook 指向 hook 鏈頭
     → YourComponent(props)              ← 真正呼叫你寫的元件函式
       → useState(0) → updateReducer(basicStateReducer, 0)
          → 從 currentHook 複製到 workInProgressHook（沿 next 移一格）
          → 攤平 queue.pending 環狀鏈，依序處理每個 Update：
              action 是函式 → 呼叫它，newState = action(newState)  ←【updater 函式層在此被呼叫】
              action 不是函式 → newState = action
          → hook.memoizedState = newState
          → 回傳 [newState, dispatch]
```

<mark class="r">StrictMode 兩次呼叫發生在 `renderWithHooks` 這層：React 用同一份剛算好、已確定的 hook 鏈狀態，再多呼叫一次 `YourComponent(props)`（replay）。這次呼叫裡的 updater 函式仍會被多執行一次，用同一個已確定的舊值再算一次，比對答案是否一致；replay 的結果不會寫回 `hook.memoizedState`，不會被 commit，純粹用來比對。</mark>

### 「模組層級變數是誰都能改的共用箱子」──對，就是全域變數

<mark class="g">用 C/Golang 講法更精確：`let impureExternalCount = 0` 等同 C 的 file-scope 靜態變數 `static int impureExternalCount = 0;`——沒有指標保護、沒有鎖、沒有版本控制，任何時候誰呼叫就直接讀寫同一塊記憶體位置，沒有「每次呼叫拿到自己專屬副本」的語意。對比 `useState` 的 `count`：概念上更像「呼叫函式時傳進來的參數值」；要跨 render 保留，React 是額外存進 heap 上 fiber 樹的 `hook.memoizedState`，每次呼叫時才讀出來當參數傳給你，不是讓函式自己去動態讀寫一塊共用記憶體。</mark>

### 追問四連發：「新的 count」是什麼時候算出來的？跟作用域有關嗎？不用 useState 也能證明純函式嗎？Concurrent Mode 是不是允許 render 有副作用？（2026-08-01）— Claude Code

**1. 「用新的 count 再呼叫我一次」──「新的 count」是指還沒算過的舊值嗎？**

<mark class="b">「新的 count」在時間軸上經歷兩個階段，句子講的是最終結果，不是呼叫當下的狀態：</mark>

- `setCount(c => c+1)` **呼叫的當下**：新值還不存在。React 只是把 `c => c+1` 這個函式本身（尚未執行）存進 heap 上的 `Update` 物件，排進 pending queue。此刻沒有任何地方存在一個叫「新 count」的具體數字——只有一份「待兌現的計畫」。
- **下一次 React 真正重新呼叫元件函式**、程式碼執行到 `useState(...)` 那一行時，`updateReducer` 才把 pending queue 裡的 `c=>c+1` 真正拿出來執行、算出答案——這時候「新 count」才第一次以具體數字存在。

所以：呼叫當下確實「還沒算過」，但等到那句話描述的「再呼叫我一次」真正發生時，拿到的已經是算好的新值，不會是舊值。

**2. 這跟作用域（scope）有關係嗎？**

<mark class="y">有關係，而且是核心關係。</mark>每次 React 呼叫元件函式，JS 引擎都會建立一個全新的函式執行環境（execution context），`const [count] = useState(...)` 的 `count` 是**這次呼叫專屬的區域變數**。因為是 `const`，在這次呼叫的作用域內根本不可能被重新賦值——這是語言層級的保證。所以 React 沒辦法「原地把舊 count 改成新 count」（那樣 `count` 就得是 `let` 且能被外部改，等於繞回 `addAndPrint` 的模式）。它唯一的選擇是：**開一個全新的作用域（重新呼叫函式一次）**，讓新值在全新作用域裡合法地以 `const` 身份存在。「用新的 count 再呼叫我一次」本質上就是「不 mutate，而是重新呼叫、產生新的一份」。

**3. 模組層級變數沒人管，那 useState 是不是就有人管？不用 useState 也能證明純函式的優點吧？**

<mark class="r">完全正確——不用 useState，也能證明純函式的優點。</mark>`function add(a, b) { return a + b }` 就是道地的純函式，不需要 React、不需要 hooks。純函式這個概念本身跟 useState 沒有必然關係。

useState 要解決的不是「怎麼證明純函式」，而是「**元件需要跨越多次呼叫記住東西（例如 count），但又想讓每一次呼叫本身維持純**，這兩件事要怎麼同時做到」：

- 完全不用 useState，想要一個「記得住 count」的元件，唯一辦法是用 `let` 寫在函式外面——這就是 `addAndPrint`，馬上變不純。
- useState 的做法：把「持久保存」的責任整個搬出函式，交給 **React（fiber 樹上的 `hook.memoizedState`）** 保管；函式本身不持有任何跨呼叫記憶，每次呼叫都是全新一局，只是 React 把上次留下的值當參數餵給這一局用。

所以「誰在管」——答案是 **React 這個 runtime，不是 useState 這個 API、也不是元件函式本身**。useState 只是元件函式跟 React 之間的溝通窗口。

不靠 React、純手工示範同一個道理（reducer pattern，跟 useState 底層邏輯本質相同）：

```js
// 完全不用 React，示範「持久狀態 + 純函式 render」的組合
let state = { count: 0 }; // 持久保存本來就得靠某個外部容器

function reducer(prevState, action) {        // ✅ 純函式：同輸入同輸出，不 mutate prevState
  if (action.type === "increment") {
    return { count: prevState.count + 1 };    // 回傳新物件，不是改舊的
  }
  return prevState;
}

function render(state) {                      // ✅ 純函式：只依賴傳進來的 state
  console.log(`count = ${state.count}`);
}

function dispatch(action) {
  state = reducer(state, action);  // 「管理」持久狀態的地方，被隔離在這一行
  render(state);
}

dispatch({ type: "increment" }); // count = 1
dispatch({ type: "increment" }); // count = 2
```

`reducer` 和 `render` 都是道地純函式，呼叫幾百次、同一組輸入答案永遠一樣。真正「有狀態、會變」的只有最外層的 `state`，而且被隔離集中在 `dispatch` 這一行管理——這就是 useState/useReducer 在 React 內部做的事，只是 React 把 `state` 存進 fiber 而不是模組變數，並用「重新呼叫元件函式」取代「呼叫 `render(state)`」。

**4. React 18 Concurrent Mode 不是允許 render 中改外部變數/發 API 請求嗎？**

<mark class="b">推論完全正確：Concurrent Mode 不是「允許」render 有副作用，恰恰相反——它是建立在「render 必須保持純」這個前提上，才能安全地中斷/丟棄/重跑。副作用放進 useEffect，在 Concurrent Mode 下更重要，不是更不重要。</mark>

Concurrent rendering 讓 React 可以：開始渲染一棵樹渲染到一半先暫停、去處理更緊急的事（如使用者輸入）之後再回來；同時準備好幾個候選版本（如 `useTransition`），不需要的直接整份丟棄、連 commit 都不做；因為更高優先權更新進來，把正在算的低優先權 render 直接中斷丟掉、重新開始算。

這些操作要安全，前提是「丟掉一個還沒 commit 的 render，不會有任何後果」——這個前提只有在 render 完全沒有副作用時才成立。如果 render 裡發了真實 API 請求，「丟棄這次 render」並不會把已經發出去的請求收回來——請求已經真實打到伺服器了。這時候 Concurrent Mode 的「隨意丟棄重跑」反而變成災難：同一個使用者操作，可能因為被中斷重跑好幾次，對應到好幾次真實、浪費、甚至互相打架的 API 請求。

❌ 錯誤示範（渲染中直接發 API 請求）：

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  // 這行在「render 階段」執行——只要這個元件函式被呼叫，就重新發一次請求
  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(data => setUser(data)); // 更嚴重：render 階段呼叫 setState，
                                    // React 會直接警告，甚至可能造成無窮重渲染迴圈

  return <div>{user ? user.name : "Loading..."}</div>;
}
```

這段程式碼有兩層問題，Concurrent Mode 會放大第二層：

1. **StrictMode 開發模式**：光是「呼叫兩次」就已經多打一次 API（前面 demo 驗證過的機制）。
2. **Concurrent Mode 正式環境**：若 `userId` 因使用者快速切換而連續改變，React 可能為了處理更新優先權，啟動這個元件的 render、還沒 commit 就因更新的 `userId` 進來而中斷丟棄、用新 `userId` 再 render 一次——每一次「被丟棄的嘗試」都已經真實發出一次 API 請求，且因網路延遲不定，舊請求的回應可能比新請求還晚回來，`setUser` 最後覆蓋順序錯亂，畫面顯示錯誤資料（race condition）。

✅ 正確示範（副作用放進 useEffect）：

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setUser(data); // 若這個 effect 已被取消，忽略過期回應
      });

    return () => {
      cancelled = true; // cleanup：userId 又變了、或元件被卸載，這次請求作廢
    };
  }, [userId]);

  return <div>{user ? user.name : "Loading..."}</div>;
}
```

`useEffect` 只在 React **真正把某個版本 commit 到畫面後**才執行——被中斷丟棄的候選版本，`useEffect` 根本不會被呼叫。所以不管 Concurrent Mode 內部嘗試、丟棄、重跑幾次候選 render，實際發出的 API 請求次數，永遠精準對應「真正呈現在使用者眼前」的那幾次更新，不多不少。這正是「副作用要放在 useEffect」這條規則，在 Concurrent Mode 下不但沒過時、反而是讓 Concurrent Mode 能安全運作的根本前提。

### 追問：fiber 為什麼叫 fiber？Fiber 節點是啥？"hook is for storing data" 這個推論對嗎？（2026-08-01）— Claude Code

**Fiber 為什麼叫 fiber（跟布料纖維沒關係）**

<mark class="b">"Fiber" 在電腦科學裡本來就是獨立於「紡織纖維」的舊詞彙，指的是一種比 thread（執行緒）更輕量、必須手動排程（cooperative scheduling）、可以暫停恢復的執行單元。Windows API（Windows Fibers）、Ruby（Fiber 類別）都用過這個詞。</mark>

- **Thread（執行緒）**：作業系統決定什麼時候中斷、切換（搶佔式排程，preemptive）。
- **Fiber**：排程權交給呼叫端自己決定何時暫停/恢復（合作式排程，cooperative），作業系統不會自動介入。

<mark class="g">React 16 把渲染演算法從舊版「Stack Reconciler」（一旦開始算某個元件樹就得一次跑完，無法中斷）重寫成「Fiber Reconciler」，借用的正是這個「可以被暫停、恢復」的概念——渲染被拆成一小塊一小塊，中途可以喊停、之後接著做。所以叫 Fiber，是概念借用，不是植物纖維也不是布料。</mark>

**Fiber 節點是什麼**

一個 Fiber 節點就是一個 JS 物件，對應樹裡「一個位置」（一個 component 或一個 DOM element），核心欄位：

```
FiberNode {
  type,              // 是哪個 component / element
  memoizedProps,     // 傳入的 props
  memoizedState,     // function component：指向 hook 鏈結串列的頭
  return: ──────────► 父層 fiber
  child: ───────────► 第一個子節點 fiber
  sibling: ─────────► 下一個兄弟節點 fiber
}
```

只靠 `return`/`child`/`sibling` 這三個指標就能把整棵樹串起來（不用陣列存 children），而且可以「走一步、停下來、之後再接著走」——這正是能被暫停/恢復的關鍵設計，也是本篇一直在講的 fiber tree 的具體長相。

**"hook is for storing data" 這個推論對嗎？**

<mark class="y">大方向正確，補一個精確說法：每個 hook 在 fiber 上都對應一個 Hook 節點，`memoizedState` 欄位確實拿來「跨 render 存一份資料」，但不同 hook 存的東西不一樣，而且各自定義了「這份資料什麼時候被更新」的規則，不只是被動儲存：</mark>

- `useState`/`useReducer`：存 state 值 + pending update queue（前面詳細講過）
- `useRef`：存一個 `{ current: 值 }` 物件——最直白的「儲存箱」，改 `.current` 完全不會觸發重新渲染
- `useMemo`/`useCallback`：存「上次算好的值」+「上次的依賴陣列」，用來比對這次要不要重算
- `useEffect`：存「這次的 callback + 依賴陣列」，排進一份等 commit 完才執行的 effect 清單，比較像「待執行的任務描述」而非單純資料值

<mark class="g">更精確的講法：hook = fiber 上的一個儲存格，負責跨 render 保存「這個 hook 呼叫該記住的東西」，並且每種 hook 都搭配了自己的一套更新規則（什麼時候讀、什麼時候被覆蓋、要不要跟依賴陣列比對）。「for storing data」抓到了核心，只是還要加上「配套的更新規則」這一層。</mark>
