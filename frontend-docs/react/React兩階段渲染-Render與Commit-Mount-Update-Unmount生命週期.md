---
title: React 兩階段渲染 — Render 與 Commit、Mount／Update／Unmount 生命週期
type: topic-note
source: Gemini
tags: [gemini, react, fiber, useEffect, useLayoutEffect, 生命週期, commit-phase, 面試考點]
sources:
  - https://gemini.google.com/app/5e2bbe55bbaf5dcd
updated: 2026-08-31
---

# React 兩階段渲染 — Render 與 Commit、Mount／Update／Unmount 生命週期

> 本篇重點 a–r，共 18 個。
>
> 起點是一個很常見的困惑：<mark style="background: #FFF3A3A6;">「commit 到底算 Mount 還是 Update？」</mark>答案是<mark style="background: #BBFABBA6;">兩個都不是</mark>，它是一個橫跨三種生命週期的「機制」，把這件事釐清之後，`useEffect` 什麼時候跑、cleanup 什麼時候跑就都通了。

## 重點整理

### 一、React 的渲染分成兩個大階段

(a) <mark style="background: #ADCCFFA6;">Render Phase（渲染階段）</mark>：純計算，React 執行元件函式、產生新的 Virtual DOM、跟舊的做 Diffing，算出「哪裡要改」。這個階段<mark style="background: #BBFABBA6;">可以被中斷、暫停、丟棄重來</mark>（Concurrent Mode 的基礎），所以這個階段裡不能寫有副作用的程式碼。

(b) <mark style="background: #ADCCFFA6;">Commit Phase（提交階段）</mark>：同步執行、<mark style="background: #FF5582A6;">不可中斷</mark>，把 Render Phase 算好的變更真正寫進真實 DOM，並依序觸發相關的生命週期與 Effects。

(c) <mark style="background: #FFF3A3A6;">所以 Commit 既不等於 Mount 也不等於 Update</mark>。Mount、Update、Unmount 三者都會走完「Render Phase → Commit Phase」，Commit 只是「把結果套用到畫面上」的那一段機制。

(d) Commit Phase 內部還細分成三個子階段，這是搞懂 `useLayoutEffect` 與 `useEffect` 差別的關鍵：

| 子階段 | 做的事 | 對應的 Hook |
| --- | --- | --- |
| Mutation | 真正動 DOM（`appendChild`／改屬性／`removeChild`） | — |
| Layout | 同步執行，此時<mark style="background: #FF5582A6;">瀏覽器還沒 Paint</mark> | `useLayoutEffect` |
| （瀏覽器 Paint） | 畫面真的被畫到螢幕上 | — |
| Passive | 非同步執行，Paint 之後才跑 | `useEffect` |

### 二、Mount／Update／Unmount 的完整流程

(e) <mark style="background: #FFF3A3A6;">① Mount（首次掛載）</mark>

1. Render Phase：React 呼叫元件函式，產生 Virtual DOM 樹。
2. Commit / Mutation：把節點插入真實 DOM 樹。
3. Commit / Layout：執行 `useLayoutEffect` 的 callback（此時尚未 Paint，所以在這裡量 DOM 尺寸、改樣式不會閃爍）。
4. 瀏覽器 Paint：畫面出現在螢幕上。
5. Commit / Passive：非同步執行 `useEffect` 的 callback。

(f) <mark style="background: #FFF3A3A6;">② Update（更新／Re-render）</mark>

1. Render Phase：重新執行元件函式，Diffing 前後 Virtual DOM。
2. Commit / Mutation：把差異寫入真實 DOM。
3. Commit / Layout：<mark style="background: #BBFABBA6;">先跑上一次 `useLayoutEffect` 回傳的 cleanup，再跑本次的 callback</mark>。
4. 瀏覽器 Paint。
5. Commit / Passive：<mark style="background: #BBFABBA6;">先跑上一次 `useEffect` 回傳的 cleanup，再跑本次的 callback</mark>。

(g) <mark style="background: #FFF3A3A6;">③ Unmount（卸載）</mark>

1. Render Phase：把該 Fiber 節點標記為 `Deletion`。
2. Commit / Mutation：呼叫 `removeChild` 把真實 DOM 拿掉。
3. Commit / Layout：同步執行 `useLayoutEffect` 的 cleanup。
4. Commit / Passive：非同步執行 `useEffect` 的 cleanup。

(h) <mark style="background: #FFB8EBA6;">記憶訣竅</mark>：Update 的每一次 Effect 都是「先清理上一次、再建立這一次」，Unmount 則是「只清理、不建立」。

### 三、三個很容易被混在一起的詞

(i) 這三件事分別發生在不同的「維護層級」：

| 名詞 | 概念層級 | 實際發生什麼 |
| --- | --- | --- |
| State／Props 變更 | <mark style="background: #ADCCFFA6;">資料（Data）</mark> | 觸發 Render Phase，重新執行元件函式並 Diffing |
| 重繪 Paint | <mark style="background: #ADCCFFA6;">視覺（Visual）</mark> | Commit 完成後瀏覽器把最新結果畫上螢幕；<mark style="background: #BBFABBA6;">元件本身還在記憶體與 DOM 樹中</mark> |
| Unmount | <mark style="background: #ADCCFFA6;">結構（Structure）</mark> | 元件從 DOM 樹移除，對應的 Fiber 節點與 state 記憶體被銷毀 |

(j) 一句話：<mark style="background: #FFF3A3A6;">Update 是「同一個元件換了新資料」，Unmount 是「這個元件不存在了」。</mark>

### 四、對照 Fiber 記憶體：Update 與 Unmount 的差別

(k) <mark style="background: #FFF3A3A6;">Update（僅更新／重繪）在記憶體裡是「零回收」</mark>：

- **DOM 樹**：真實 DOM 節點被保留，React 只同步修改它的屬性或內文（Mutation）。
- **Fiber Tree**：FiberNode 依然留在記憶體中。React 只是把 `current` 節點 Clone 一份當作 `workInProgress`，更新裡面的 `memoizedProps` 與 `memoizedState`，然後交替雙緩衝指標。
- **記憶體狀態**：所有 state、對 DOM 的引用（`stateNode`）都完好地留在 Heap 中。

(l) <mark style="background: #FF5582A6;">Unmount 則是真的把記憶體還回去</mark>：

1. Diffing 時發現該 Fiber 不在新的 Virtual DOM 樹中 → 標記為 `Deletion`。
2. 斷開父節點對它的 `child` 或 `sibling` 指標。
3. 斷開它內部對 DOM 的 `stateNode` 指標。
4. <mark style="background: #BBFABBA6;">所有引用都被斷開之後，GC（Garbage Collector，垃圾回收器）會在下一次掃描時把這個 FiberNode 連同它的 state 記憶體一併清除。</mark>

(m) 記憶體比對表：

| 項目 | Update（更新／Re-render） | Unmount（卸載／銷毀） |
| --- | --- | --- |
| FiberNode | 保留在記憶體中（重複利用或當備份） | 斷開引用，等待 GC |
| `memoizedState`（State） | 持續保留，更新為新數值 | 完全釋放 |
| `stateNode`（DOM 指標） | 指向原有的真實 DOM 節點 | 清空，DOM 被移除 |
| 生命週期 | 觸發 Effect 的 cleanup ＋ 重新執行 | 只觸發 Effect 的 cleanup |

### 五、Effect、useEffect 與依賴陣列

(n) <mark style="background: #ADCCFFA6;">Effect（副作用）</mark>是概念，指「與 React 渲染狀態同步的外部系統行為」，例如訂閱 WebSocket 聊天室、操作 `<video>` 播放器、送埋點日誌。<mark style="background: #ADCCFFA6;">`useEffect`</mark> 是 React 提供給你實作這個概念的 Hook API。React 官方文件〈Lifecycle of Reactive Effects〉的立場是：<mark style="background: #FFF3A3A6;">元件有 Mount／Update／Unmount 三種生命週期，但 Effect 只有「開始同步」與「停止同步」兩種</mark>，用這個角度想依賴陣列會清楚很多。

(o) <mark style="background: #ADCCFFA6;">響應式數值（Reactive Values）</mark>指的是「在元件本體內部宣告或讀取、且可能隨 re-render 改變的數值」：`props`、`state`、以及在元件本體算出來的衍生變數。<mark style="background: #FF5582A6;">定義在元件函式外部的全域常數不算</mark>（例如 `const SERVER_URL = 'https://...'` 寫在檔案最上層）。

(p) <mark style="background: #ADCCFFA6;">依賴陣列（Dependencies Array）</mark>則是 `useEffect(fn, [deps])` 第二個參數那個容器。兩者的關係是一句原則：<mark style="background: #BBFABBA6;">Effect 內部讀到的每一個響應式數值，都必須放進依賴陣列。</mark>

```jsx
function ChatRoom({ roomId }) {                              // prop 是響應式數值
  const [serverUrl, setServerUrl] = useState('https://localhost:1234')  // state 也是

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId)
    connection.connect()
    return () => connection.disconnect()                     // cleanup：停止同步
  }, [roomId, serverUrl])                                    // 這兩個就是 dependencies
}
```

(q) 依賴陣列三種寫法的語意：

| 寫法 | 何時重新執行 |
| --- | --- |
| `[roomId, serverUrl]` | 任一個改變時，先跑上次的 cleanup（`disconnect`），再用新值執行（`connect`） |
| `[]`（空陣列） | 只在 Mount 執行一次，Unmount 時執行 cleanup |
| 不傳第二個參數 | <mark style="background: #FF5582A6;">每一次 re-render 都重新執行</mark> |

(r) React 官方維護的 ESLint 套件 <mark style="background: #ADCCFFA6;">`eslint-plugin-react-hooks`</mark>，其中的規則 <mark style="background: #FFF3A3A6;">`react-hooks/exhaustive-deps`</mark> 就是自動幫你檢查 (p) 這條原則，涵蓋 `useEffect`、`useCallback`、`useMemo`。<mark style="background: #D2B3FFA6;">次要備註</mark>：這條規則預設是 warning 不是 error，很多專案會把它調成 error 以免有人習慣性地略過。

## ⚠️ 存疑／更正

- <mark style="background: #FF5582A6;">Gemini 在這串對話裡把 Fiber Tree 描述成「雙向鏈結串列（Doubly Linked List）」，這個說法不精確，而且跟它自己在另一串對話（`1f0cc8c21e6f88b5`）說的「單向鏈表」自相矛盾。</mark>正確的說法是：Fiber 用 `child`（第一個子節點）、`sibling`（右邊的兄弟）、`return`（父節點）三個指標把樹攤平；<mark style="background: #BBFABBA6;">兄弟節點之間是單向的（只有 `sibling` 往右，沒有往左的指標）</mark>，`return` 是「往上回父節點」而不是「往左回前一個兄弟」，所以它是一棵帶有父指標的樹，不是教科書定義的雙向鏈結串列。React 原始碼 `ReactFiber.js` 也只有這三個結構指標。
- Gemini 說「元件卸載時 Commit / Layout 階段會同步執行 `useLayoutEffect` 的 cleanup」— 這點是對的，但要補充一個實務差異：<mark style="background: #FFB8EBA6;">`useEffect` 的 cleanup 在 Unmount 時雖然掛在 Passive 階段，React 18 之後在同步卸載的情境下實際上會被 flush 得很快</mark>，不要把「非同步」理解成「一定會延遲很久」。要保證在 DOM 被移除前跑完的清理（例如解除 `ResizeObserver`、還原 `document.body.style`），還是應該寫在 `useLayoutEffect` 裡。
- 原文有一處錯字「完好無初地」，正確是「完好無缺地」，不影響理解。

## 相關題目練習

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 2622. Cache With Time Limit | https://leetcode.com/problems/cache-with-time-limit/ | 手寫 `setTimeout` ＋ 清除計時器，就是 `useEffect` cleanup 的最小模型 |
| LeetCode 2725. Interval Cancellation | https://leetcode.com/problems/interval-cancellation/ | 回傳一個「取消函式」＝ Effect 回傳 cleanup 的同一個設計模式 |
| LeetCode 2721. Execute Asynchronous Functions in Parallel | https://leetcode.com/problems/execute-asynchronous-functions-in-parallel/ | 練 Promise 與非同步排程，對應 Passive 階段的非同步語意 |
| NeetCode — Design Browser History | https://neetcode.io/problems/design-browser-history | 用雙向鏈表實作，正好可以跟 ⚠️ 那條「Fiber 不是雙向鏈表」做對照練習 |

## 關聯筆記

- [[useState底層-Fiber-Tree-memoizedState與過期閉包]] — 那篇講「狀態存在 FiberNode 的 `memoizedState` 裡」，本篇講「狀態改變之後怎麼被送上畫面」，(k)(l) 的記憶體比對正是那篇 FiberNode 六大類屬性的實際運作。
- [[01-React-純函數與嚴格模式-StrictMode]] — StrictMode 在開發模式刻意跑兩次 Mount → Unmount → Mount，就是為了逼你把 (n)(q) 的 cleanup 寫正確。
- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]] — (i) 那個「重繪 Paint」屬於瀏覽器層級的事，跟 React 的 Commit 是兩個不同層級，兩篇對照看才不會混淆。
- [[JIT與useMemo-CPU記憶體取捨]] — `useMemo`／`useCallback` 同樣受 `exhaustive-deps` 規則管轄，(r) 的檢查對它們一樣適用。
- [[11-記憶體模型-stack-heap-動態配置-GC]] — (l) 講的「斷開引用之後交給 GC」就是那篇可達性（Reachability）概念的實例。
- [[SSR-renderToString與Hydration-伺服器端渲染流程]] — Hydration 是「Render Phase 在伺服器已經跑過、Commit Phase 才在瀏覽器補上」的特殊情況，理解本篇的兩階段切分之後那篇會好懂很多。

## 各對話來源（原文）

### React Commit 階段執行順序解析（2026-08-31）— https://gemini.google.com/app/5e2bbe55bbaf5dcd

**使用者：** React provides a linter rule to check that you've specified your Effect's dependencies correctly. 他提供一個 linter rule 是 ESLint 嗎？我的 effect's dependencies 是什麼？幫我把所有的更新跟卸載的狀態講清楚。commit 算在 updates 還是 mount？

**Gemini：** commit 階段既不等於 Mount 也不等於 Update，它是 React 處理生命週期時的一個運作機制，無論首次掛載、元件更新還是卸載，最後都會進入 commit 階段把變更套用到真實 DOM 上。(1) 是的，是 ESLint，React 官方維護 `eslint-plugin-react-hooks`，核心規則是 `react-hooks/exhaustive-deps`，會檢查 `useEffect`、`useCallback`、`useMemo` 的依賴陣列。(2) 依賴陣列是傳給 `useEffect(fn, [deps])` 的第二個參數，所有在元件內部定義、且在 Effect 裡讀取到的響應式數值都要放進去；空陣列代表只在 Mount 執行一次、Unmount 執行 cleanup；不傳第二個參數則每次 re-render 都重新執行。(3) React 分成 Render Phase（純計算、可中斷）與 Commit Phase（同步執行、寫入 DOM、觸發 Effects）。接著逐一列出 Mount、Update、Unmount 三種情境下 Render Phase → Commit Mutation → Commit Layout（`useLayoutEffect`）→ Browser Paint → Commit Passive（`useEffect`）的完整順序。

**使用者：** 我分不清楚 update 的 state, props、重繪，跟 Unmount 的條件式渲染讓元件從 UI 上被移除差在哪？這邊的 EFFECT 跟 useEffect 有關係嗎？響應式數值（Reactive values）這邊都放在依賴陣列嗎，這兩個名詞有什麼不一樣？

**Gemini：** (1) 三者是不同維護層級：State／Props 變更是資料層，觸發 Render 階段重新計算；重繪 Paint 是視覺層，只是 UI 更新，元件本身依然存在於記憶體與 DOM 樹中；Unmount 是結構層，元件被完全從 DOM 樹移除，對應的 Fiber 節點與 State 記憶體也會被銷毀。(2) 有關係，是概念與語法實作的關係：Effect 是「與 React 渲染狀態同步的外部系統行為」這個程式設計概念，`useEffect` 是實作它的 Hook API；官方文件〈Lifecycle of Reactive Effects〉的重點是元件有三種生命週期，但 Effect 只有「開始同步」與「停止同步」。(3) 響應式數值是變數的性質（`props`、`state`、元件本體算出來的衍生變數；全域常數不算），依賴陣列是放置的位置；原則是 Effect 讀到響應式數值就必須填進依賴陣列，`react-hooks/exhaustive-deps` 會自動檢查。

**使用者：** 「元件本身依然存在於記憶體與 DOM 樹中。」Fibernode algorithm memory?

**Gemini：** 在 React 中，元件由 React 在 Heap Memory 中維護一個稱為 Fiber Tree 的雙向鏈結串列結構（⚠️ 此處說法不精確，見上方「存疑／更正」）。重點屬性：`stateNode` 指向真實 DOM 節點，DOM 樹與 Fiber 樹透過指標互相綁定；`memoizedState` 儲存該元件所有的 Hook 鏈表，只要 FiberNode 沒被銷毀 state 記憶體就不會釋放；Double Buffering 機制維護 `current` 與 `workInProgress` 兩棵樹，透過 `alternate` 互相引用。接著比較兩種情況：Update 時真實 DOM 被保留只做 Mutation，FiberNode 依然保留在記憶體中（Clone 一份當 `workInProgress`、更新 `memoizedProps` 與 `memoizedState`、交替雙緩衝指標），記憶體零回收；Unmount 時 Commit Mutation 階段呼叫 `removeChild`，Fiber 被標記為 `Deletion`、斷開父節點的 `child`／`sibling` 指標、斷開 `stateNode`，引用都斷開後由 GC 清除。

**使用者：** 所以在原生 JS，元件是一個物件嗎？

**Gemini：** 不是，原生 JS 中完全沒有「元件」這個概念，它是 React 等框架抽象出來的邏輯封裝單位。從原生 JS 的角度看：(1) 語法上元件就是一個普通的 JavaScript 函式（Function Object），經 Babel 編譯成 `React.createElement(Button, { text: "Click" })` 後回傳的是一個 Plain Object，也就是 React Element／Virtual DOM 節點，長得像 `{ $$typeof: Symbol(react.element), type: f Button(props), props: {...}, key: null, ref: null }`。(2) 運作機制上，元件在 Heap 中對應兩種物件：一是原生的 DOM 物件（例如 `HTMLButtonElement`，繼承鏈是 `EventTarget → Node → Element → HTMLElement`），二是 React 內部建立的 FiberNode 物件，透過 `stateNode` 指向前者。(3) 若要在純原生 JS 中做出元件機制，兩種做法：寫一個 ES6 Class 用 `document.createElement()` 建立 DOM 並把狀態綁在 `this` 上；或使用瀏覽器原生規範 Web Components 的 `customElements.define()` 繼承 `HTMLElement` 自訂標籤，這是原生 JS 中最接近 React 元件的標準做法。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇對話（React Commit 階段執行順序解析） | https://gemini.google.com/app/5e2bbe55bbaf5dcd | Gemini Flash，2026-08-31 |
| React 官方 — Lifecycle of Reactive Effects | https://react.dev/learn/lifecycle-of-reactive-effects | react.dev 現行文件，2026-08-31 查證 |
| React 官方 — useLayoutEffect（與 useEffect 的時序差異） | https://react.dev/reference/react/useLayoutEffect | react.dev 現行文件，2026-08-31 查證 |
| React 官方 — Removing Effect Dependencies | https://react.dev/learn/removing-effect-dependencies | react.dev 現行文件，2026-08-31 查證 |
| eslint-plugin-react-hooks（exhaustive-deps 規則原始碼與說明） | https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks | main 分支，2026-08-31 查證 |
| React 原始碼 — ReactFiberCommitWork.js（Commit 三個子階段） | https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCommitWork.js | main 分支，2026-08-31 查證 |
| MDN — Web Components / customElements.define | https://developer.mozilla.org/en-US/docs/Web/API/Web_components | MDN 現行版本，2026-08-31 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-08-31
