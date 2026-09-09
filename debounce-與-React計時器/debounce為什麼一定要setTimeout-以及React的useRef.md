---
title: debounce 為什麼一定要用 setTimeout？React 裡是靠 useRef 嗎？
tags: [JavaScript, debounce, throttle, setTimeout, 閉包, React, useRef, useEffect, 效能優化]
created: 2026-09-05
updated: 2026-09-05
charset: utf-8
status: 已驗證（所有時間軸輸出皆以 Node.js v22 實跑）
---

# debounce 為什麼一定要用 setTimeout？React 裡是靠 useRef 嗎？

---

## 0. 先修正一個前提

> 「debounce 是避免昂貴計算用的」

這句話**只對了一半**。「避免昂貴計算」是**結果**，不是**定義**。

debounce 的定義是：**把一連串密集發生的事件，壓縮成「安靜下來之後」的一次執行。**

這個區別很重要，因為它決定了你該選 debounce 還是 throttle：

| | debounce（防抖動） | throttle（節流） |
|---|---|---|
| 語意 | 等你**停下來**才做 | 固定**節奏**做 |
| 使用者一直操作時 | **完全不執行** | 每隔 N 毫秒執行一次 |
| 執行次數 | 一串操作 = 1 次 | 一串操作 = 好幾次 |
| 典型場景 | 搜尋框、表單即時驗證、視窗 resize 完成後重算版面 | 捲動視差、拖曳、無限捲動偵測、滑鼠移動軌跡 |
| 判斷口訣 | 「我只要**最後**那個結果」 | 「我要**過程中**的取樣」 |

⚠️ 選錯的後果很具體：捲動監聽如果用 debounce，使用者**捲動過程中畫面完全不更新**，只有停下來才動一下 — 這通常不是你要的。

### 實跑證據

用 100ms 一個字的速度打「javascript」，delay 都設 300ms（`demo-01-debounce-vs-throttle.js`）：

```text
   5ms 打出「j」
  [throttle]    5ms 查詢「j」
 104ms 打出「ja」
 204ms 打出「jav」
 304ms 打出「java」
 404ms 打出「javas」
  [throttle]  404ms 查詢「javas」
 504ms 打出「javasc」
 604ms 打出「javascr」
 704ms 打出「javascri」
  [throttle]  704ms 查詢「javascri」
 805ms 打出「javascrip」
 904ms 打出「javascript」
  [debounce] 1205ms 查詢「javascript」    ← 只有這一次
```

- a. throttle 在打字過程中執行了 **3 次**
- b. debounce 在最後一個字（904ms）之後又安靜了 300ms，在 **1205ms 執行 1 次**
- c. 如果使用者永遠不停手，debounce 就**永遠不執行** — 這是特性不是 bug

---

## 1. 問題一：一定要用 setTimeout 嗎？是要等大概 0.3 秒嗎？

### 1-a. 先回答「是不是等 0.3 秒」— 不是

**不是「等 0.3 秒」，是「等使用者安靜 0.3 秒」。**

差別在 `clearTimeout(timer)` 這一行。每一次事件進來都會先把上一個排程**取消**，再排一個新的。所以那 300 毫秒的計時器**一直在被重置**：

```text
時間軸（delay = 300ms）

    0ms   使用者打「j」
          └─► clearTimeout(null)    ← 傳 null 是安全的，什麼都不做
              setTimeout #1  ─────────────────►  預定 300ms 到期

  100ms   使用者打「ja」
          └─► clearTimeout(#1)      ✂ 取消 #1（它還沒到期就被殺掉）
              setTimeout #2  ─────────────────►  預定 400ms 到期

  200ms   使用者打「jav」
          └─► clearTimeout(#2)      ✂ 取消 #2
              setTimeout #3  ─────────────────►  預定 500ms 到期

          （使用者停手，沒有新事件進來，所以沒人去取消 #3）

  500ms   #3 存活到期 ✅
          └─► 真的執行 fetchResults("jav")


  重點：那 300ms 一直在被重置
        所以語意是「等使用者安靜 300ms」
        不是「從第一次事件算起等 300ms」
```

所以正確的說法是：**最後一次事件之後 300 毫秒**才執行。300 這個數字是可調的參數，常見取值：

- a. `150ms ~ 200ms` — 即時搜尋建議（autocomplete），要讓人覺得「馬上就有反應」
- b. `300ms ~ 500ms` — 一般搜尋、表單驗證（人類打字停頓的自然節奏大約在這區間）
- c. `800ms ~ 1000ms` — 自動存草稿，不急
- d. `> 1000ms` — 使用者會開始懷疑壞掉了

### 1-b. 為什麼非得有一個「延後 + 可取消」的機制

debounce 的語意拆開來只有兩個需求：

- a. **把一個工作排到未來某個時間點**
- b. **在它真的執行之前，我可以反悔取消它**

JavaScript 是**單執行緒**的，而且**沒有 `sleep()`**。你不能寫「先卡在這裡 300 毫秒再繼續」，因為那會凍結整個 UI（滑鼠不能點、動畫停住、輸入框打不了字）。

```js
// ❌ 這種東西在 JS 裡是災難
function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}   // 卡死主執行緒 300ms，整個頁面凍結
}
```

所以你唯一能做的是：**把工作交給事件迴圈（event loop），叫它晚點再回來找你。** 而在標準 Web API 裡，同時滿足「延後」和「可取消」這兩個條件、又到處都能用的，就只有 `setTimeout` / `clearTimeout` 這一對。

### 1-c. 那有沒有別的做法？誠實比較

| 方案 | 能延後？ | 能取消？ | 能表達「安靜 N 毫秒」？ | 判定 |
|---|---|---|---|---|
| `setTimeout` / `clearTimeout` | ✅ 任意毫秒 | ✅ | ✅ | **實務唯一解** |
| `scheduler.postTask` + `TaskController` | ✅ 有 `delay` 選項 | ✅ `controller.abort()` | ✅ | 語意上更好，但**支援度有限** |
| `requestAnimationFrame` | ⚠️ 只能到「下一幀」約 16.7ms | ✅ `cancelAnimationFrame` | ❌ 做不到 300ms 語意 | 適合 scroll / resize 的 **throttle**，不是 debounce |
| `requestIdleCallback` | ⚠️ 「瀏覽器有空的時候」 | ✅ `cancelIdleCallback` | ❌ 語意是「閒」不是「安靜」 | 適合低優先度背景工作 |
| `Promise` + `AbortController` | ✅ | ✅ | ✅ | **底層還是 setTimeout**，只是換個包裝 |
| `Date.now()` 比時間戳 | ❌ 需要外部 tick 來源 | — | ❌ 抓不到「最後一次」 | 這是 **throttle** 的實作法，不是 debounce |
| CSS transition / Web Animations | ✅ | ✅ | ❌ 沒有回呼語意 | 不適用 |

**唯一真正的替代品是 Scheduler API：**

```js
// 語意更漂亮：延後 + 優先度 + 可取消，全部內建
let controller = null;
function search(keyword) {
  controller?.abort();                       // 取消上一個排程
  controller = new TaskController();
  scheduler.postTask(() => fetchResults(keyword), {
    delay: 300,
    priority: "user-visible",
    signal: controller.signal,
  }).catch((e) => { if (e.name !== "AbortError") throw e; });
}
```

⚠️ 但 MDN 明確標示 `scheduler.postTask()` 是 **limited availability、not Baseline**（Chromium 系列支援，Safari 與 Firefox 尚未全面跟上）。所以除非你只需要支援 Chromium，**正式專案還是寫 `setTimeout`**。

**結論**：不是「一定要」用 setTimeout，而是「除了它以外沒有到處都能用的東西」。它是實務上的唯一解。

### 1-d. 你這段程式碼的四個細節

```js
function debounce(fn, delay) {
  let timer = null;                            // ← 1
  return function (...args) {                  // ← 2
    clearTimeout(timer);                       // ← 3
    timer = setTimeout(() => {
      fn.apply(this, args);                    // ← 4
    }, delay);
  };
}
```

1. **`let timer = null` 是被閉包鎖住的私有變數。** 每呼叫一次 `debounce()` 就產生一個獨立的 `timer`，兩個不同的搜尋框互不干擾。這個變數活多久？活到那個回傳的函式不再被任何人引用為止 — 因為函式物件的 `[[Environment]]` 一直指著這個 Environment Record，GC 不敢動它。

2. **回傳的這個 function expression 才是真正的閉包。** 它必須用 `function` 而不是箭頭函式，因為第 4 點要用到 `this`。

3. **`clearTimeout(timer)` 不用先判斷 null。** 規範規定：傳入 `null`、`undefined`、或一個早就到期的 id，`clearTimeout` 都會**靜靜地什麼都不做**，不會報錯。所以 `if (timer !== null)` 可以省略 — 你貼的這版已經省了，是對的。

4. **`fn.apply(this, args)` 的用意是「把呼叫端的 `this` 原封不動傳下去」。** 如果有人這樣用：
   ```js
   obj.handler = debounce(function () { console.log(this.name); }, 300);
   obj.handler();          // 希望 this 是 obj
   ```
   沒有 `apply(this, ...)` 的話，`this` 會變成 `undefined`（嚴格模式）或 `window`。
   ⚠️ 也因為這樣，**回傳的函式不能寫成箭頭函式** — 箭頭函式沒有自己的 `this`，會往外抓到 `debounce` 定義時的 `this`，整個機制就壞了。

**還缺的東西**：你這版沒有 `cancel()`（元件卸載時放棄排隊中的那次）和 `flush()`（使用者按 Enter，不想再等）。正式專案的完整版寫在 `demo-03-debounce加強版.js`，實跑結果：

```text
=== leading: true, trailing: true ===
     5ms 執行「j」          ← 第一下立刻做（leading edge）
   505ms 執行「jav」        ← 最後一下也做（trailing edge）

=== flush()：使用者按 Enter，不想再等 ===
  pending? true
   906ms 執行「react」      ← 立刻執行，不等 300ms
  flush 後 pending? false

=== cancel()：元件 unmount，直接放棄 ===
  400ms 後確認：什麼都沒執行 ✅
```

**一個 TypeScript 的坑**：`setTimeout` 的回傳值在瀏覽器是 `number`，在 Node.js 是 `NodeJS.Timeout` 物件。寫共用程式碼時型別要用：

```ts
let timer: ReturnType<typeof setTimeout> | null = null;
```

---

## 2. 問題二：在 React 是靠 useRef 來處理嗎？

### 2-a. 先把因果講清楚

**`useRef` 不是「React 版的 debounce 實作方式」。** debounce 的核心永遠是 `setTimeout` + `clearTimeout`，這一點在 React 裡完全沒變。

`useRef` 解決的是**另一個問題**：**timer id 要怎麼在 re-render 之間存活下來。**

在原生 JS 版，這個問題由**閉包**免費解決了 — `let timer` 被鎖在 `debounce()` 的作用域裡，回傳的函式一直看得到它。

但在 React 裡，**元件函式每次 render 都會從頭再跑一次**，所以：

```jsx
function SearchBox() {
  let timer = null;          // ❌ 每次 render 都重新變回 null
  // ...
}
```

第二次 render 時，`timer` 又是 `null` 了，你**永遠清不掉上一次排的計時器** — debounce 就失效了，每打一個字都會發一次請求。

### 2-b. 實跑證據

`demo-02-為什麼React需要useRef.js` 用純 JS 模擬了 React 的 render 行為：

```text
=== ❌ 用 local 變數 ===
--- 第 1 次 render ---
render 開始時 timer = null
--- 第 2 次 render ---
render 開始時 timer = null          ← 上一次的 id 消失了，清不掉

=== ✅ 用 useRef ===
--- 第 1 次 render ---
render 開始時 timerRef.current = null
--- 第 2 次 render ---
render 開始時 timerRef.current = 上一次留下來的 id     ← ✅ 存活了
--- 第 3 次 render ---
render 開始時 timerRef.current = 上一次留下來的 id
```

### 2-c. 概念對照表

| 原生 JS 版 | React 版 | 為什麼 |
|---|---|---|
| `let timer = null`（閉包私有變數） | `const timerRef = useRef(null)` | 都是「跨多次呼叫存活、且不對外公開」的可變盒子 |
| 閉包的 Environment Record | React 內部的 fiber 節點 | 兩者都是「掛在別的地方、活得比一次執行久」的儲存空間 |
| `timer` | `timerRef.current` | ref 物件本身永遠是同一個，只有 `.current` 在變 |
| 手動 `clearTimeout` | `useEffect` 的 cleanup 函式 | React 幫你在對的時機呼叫 |

**`useRef` 的兩個關鍵性質**（這才是它被選中的原因）：

- a. **同一個物件跨 render 存活** — React 把它存在 fiber 上，不隨函式執行結束而消失
- b. **改 `.current` 不會觸發 re-render** — timer id 純粹是內部狀態，不該讓畫面重繪

### 2-d. 為什麼不能用 useState 存 timer

```jsx
// ❌ 反例
const [timer, setTimer] = useState(null);
const handleChange = (e) => {
  clearTimeout(timer);                    // ⚠️ 讀到的可能是上一輪 render 的舊值
  setTimer(setTimeout(() => {...}, 300)); // ⚠️ 每打一個字就多一次無謂的 re-render
};
```

三個問題：

- a. **每次 `setTimer` 都會觸發 re-render** — 一個純內部的計時器 id 竟然在驅動畫面重繪，完全沒必要
- b. **state 更新是非同步的** — 這一輪的 `handleChange` 讀到的 `timer` 是「這一次 render 當下的快照」，不保證是最新排的那個
- c. **語意錯誤** — state 的定義是「會影響畫面的資料」，timer id 不影響畫面

### 2-e. 三種 React 寫法（完整程式碼在 `demo-04-React三種寫法.jsx`）

#### 寫法 A：`useRef` 存 timer

最接近你原本的心智模型。適用於「要 debounce 的是**一個動作**」，例如送出表單、上報埋點。

```jsx
function SearchBoxA() {
  const [keyword, setKeyword] = useState("");
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;      // ⚠️ 先取出來
    setKeyword(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(value), 300);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);  // ⚠️ 卸載時一定要清

  return <input value={keyword} onChange={handleChange} />;
}
```

#### ⭐ 寫法 B：自訂 `useDebouncedValue` hook — **最推薦**

**關鍵洞察：`useEffect` 的 cleanup 函式，在語意上「就是」`clearTimeout`。**

React 的 effect 執行順序是：依賴變了 → **先跑上一次的 cleanup** → 再跑新的 effect。這跟 debounce 的「先取消舊計時器 → 再排新計時器」**完全同構**。所以你根本不用自己管 timer：

```jsx
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);      // ← cleanup 就是 clearTimeout
  }, [value, delay]);
  return debounced;
}

function SearchBoxB() {
  const [keyword, setKeyword] = useState("");                 // 每次打字都更新 → input 不卡
  const debouncedKeyword = useDebouncedValue(keyword, 300);   // 安靜 300ms 才變

  useEffect(() => {
    if (!debouncedKeyword) return;
    const controller = new AbortController();
    fetchResults(debouncedKeyword, { signal: controller.signal });
    return () => controller.abort();    // 順手解掉「舊請求比新請求晚回來」的競態問題
  }, [debouncedKeyword]);

  return <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />;
}
```

**為什麼這個寫法最好**：

- a. 完全沒有手動的 `clearTimeout`，unmount 時 React 自動幫你清 — 少一個記憶體洩漏的來源
- b. 思考單位從「debounce 一個**回呼**」變成「debounce 一個**值**」，比較符合 React 的宣告式思維
- c. `keyword`（即時，給 input 用）和 `debouncedKeyword`（延遲，給 API 用）分開，輸入框永遠不卡
- d. 這個 hook 可以在整個專案重複使用

#### 寫法 C：`useMemo` 包 debounce 函式

```jsx
const debouncedFetch = useMemo(
  () => debounce((kw) => fetchResults(kw, userId), 300),
  [userId]                              // ⚠️ 依賴陣列給空的會產生 stale closure
);
useEffect(() => () => debouncedFetch.cancel?.(), [debouncedFetch]);
```

⚠️ **stale closure（過期閉包）陷阱**：如果依賴陣列寫成 `[]`，`useMemo` 只會在第一次 render 建立這個函式，它內部抓到的 `userId` **永遠停在第一次 render 的值**。使用者切換帳號後，還是拿舊的 `userId` 去查 — 而且不會報錯，很難抓。

**React 19.2（2025-10-01 釋出）新增的 `useEffectEvent` 就是為了解決這類問題**：它讓你在 effect 裡呼叫一個「永遠看得到最新 props / state、但不需要放進依賴陣列」的函式。不過它**不是拿來做 debounce 的**，只是剛好能治 stale closure 這個併發症。

### 2-f. React 專屬的四個坑

- a. **忘記在 unmount 時清計時器** — 元件已經消失，300ms 後那個回呼還是會跑，如果裡面有 `setState` 就會做白工（React 18 之後不再警告，但依然是浪費）

- b. **在非同步回呼裡讀 `e.target`** — 一定要先 `const value = e.target.value` 取出來。React 17 之前有**事件池（event pooling）**機制，事件物件會被回收再利用，等 300ms 之後再讀 `e.target.value` 會拿到 `null`。React 17 已經移除事件池，但這個習慣還是要保持（而且舊 codebase 常見）。

- c. **StrictMode 下開發模式 effect 會跑兩次** — 你會看到計時器被排兩次又清一次。這是 React 故意的（用來揪出沒寫 cleanup 的 effect），正式打包版不會發生。如果你的 effect 有正確的 cleanup，這個行為不會造成問題 — 反過來說，**如果 StrictMode 下出問題，就代表你的 cleanup 沒寫對**。

- d. **`useDeferredValue` 不是 debounce** — 這是很常見的誤會：

| | `useDebouncedValue`（自己寫） | `useDeferredValue`（React 18+ 內建） |
|---|---|---|
| 機制 | 時間（setTimeout） | 排程優先度（concurrent rendering） |
| 等多久 | 你指定的固定毫秒 | 沒有固定時間，看主執行緒忙不忙 |
| 能減少 API 呼叫嗎 | ✅ 可以 | ❌ **不行**，值最後還是會全部到達 |
| 解決什麼 | 網路請求太多、計算太貴 | **大量清單重繪造成的卡頓** |
| 打字時 | 輸入框流暢，請求只發一次 | 輸入框流暢，重繪被降級為低優先度 |

⚠️ 如果你的目標是「少發幾次 API 請求」，`useDeferredValue` **完全幫不上忙**，必須用 debounce。

---

## 3. 一句話總結

- a. **問題一**：`setTimeout` 不是「規定」而是「實務上唯一到處都能用的、同時具備延後與可取消的 API」。`scheduler.postTask` 語意更好但支援度不足。而且不是「等 0.3 秒」，是「等**安靜** 0.3 秒」，關鍵在 `clearTimeout` 的重置。

- b. **問題二**：是，但要理解因果 — `useRef` 不是 debounce 的實作，它是用來**取代閉包**、讓 timer id 跨 render 存活的那個盒子。而更 React 的做法是根本不碰 timer，改用 `useEffect` 的 cleanup（寫法 B），因為 cleanup 的執行時機跟 `clearTimeout` 完全同構。

---

## 4. 關聯筆記（附上關聯的理由）

- a. `iThome鐵人賽-2026/文章-閉包活多久-從debounce的timer看Environment-Record存活時間.md`
  **理由**：本文第 1-d 節說「`let timer` 被閉包鎖住」，那篇追的正是「這個變數到底活到什麼時候才被 GC」。本文問「怎麼用」，那篇問「活多久」。

- b. `JS-資料型別/JavaScript資料型別總覽-原始型別與物件.md` 第 6 節與第 7 節
  **理由**：第 6 節就是拿這段 debounce 解釋「為什麼 timer 要初始化成 `null` 而不是 `undefined`」，第 7 節解釋 `[[Environment]]` 與 Environment Record — 兩篇是同一個機制的前後段。

- c. `00-V8引擎完整管線-Parse到Deoptimization.md`
  **理由**：本文提到「V8 在 parse 階段就決定哪些變數要 context allocation（配置到 heap）」，`timer` 就是被內層函式引用而必須放進 Context 的典型例子，那篇有完整的管線位置圖。

- d. `iThome鐵人賽-2026/草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md`
  **理由**：本文第 2-d 節說「state 更新是非同步的，讀到的是這一次 render 的快照」，那篇是這件事的完整推導。想清楚那篇，就能理解為什麼 timer 不能放 state。

- e. `frontend-docs/`（效能相關筆記）
  **理由**：debounce 與 throttle 是「減少工作量」的手段，虛擬清單、`useDeferredValue`、`React.memo` 是「加快工作」的手段 — 遇到卡頓時要先判斷是哪一類問題，才知道該拿哪個工具。

---

## 5. 延伸練習

- a. [LeetCode 2627. Debounce](https://leetcode.com/problems/debounce/) — 直接實作本文的函式，寫完就懂 `clearTimeout` 的重置
- b. [LeetCode 2676. Throttle](https://leetcode.com/problems/throttle/) — Premium 題，但概念上就是本文第 0 節的對照組
- c. [LeetCode 2622. Cache With Time Limit](https://leetcode.com/problems/cache-with-time-limit/) — `setTimeout` + `Map`，練習「排程 + 取消」的另一種組合
- d. [LeetCode 2621. Sleep](https://leetcode.com/problems/sleep/) — 用 Promise 包 `setTimeout`，理解「為什麼 JS 沒有同步的 sleep」
- e. [LeetCode 2637. Promise Time Limit](https://leetcode.com/problems/promise-time-limit/) — `setTimeout` 當逾時哨兵，跟 debounce 是同一個 API 的不同用法

---

## 6. 檔案清單

| 檔案 | 內容 | 能不能直接跑 |
|---|---|---|
| `demo-01-debounce-vs-throttle.js` | 模擬打字，印出兩者的時間軸差異 | ✅ `node demo-01-debounce-vs-throttle.js` |
| `demo-02-為什麼React需要useRef.js` | 用純 JS 模擬 React re-render，證明 local 變數會重生 | ✅ |
| `demo-03-debounce加強版.js` | 含 leading / trailing / cancel / flush / pending | ✅ |
| `demo-04-React三種寫法.jsx` | 三種正確寫法 + 兩個反例 | ❌ 閱讀用，需在 React 專案裡執行 |

---

## 7. 參考來源

所有 URL 於 **2026-09-05** 查閱。

- a. MDN — [setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) 與 [clearTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/clearTimeout)（「傳入無效 id 不會報錯」的規範說明）
- b. MDN — [Scheduler: postTask() method](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask)（`delay` 選項、`TaskController` 取消機制，以及 **limited availability / not Baseline** 的支援度標示）
- c. MDN — [Scheduler: yield() method](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)
- d. WICG — [Prioritized Task Scheduling 規範](https://wicg.github.io/scheduling-apis/) 與 [prioritized-post-task explainer](https://github.com/WICG/scheduling-apis/blob/main/explainers/prioritized-post-task.md)
- e. React 官方文件 — [useRef](https://react.dev/reference/react/useRef)（「改 `.current` 不會觸發 re-render」）
- f. React 官方文件 — [useEffect：清理函式的執行時機](https://react.dev/reference/react/useEffect)
- g. React 官方文件 — [Synchronizing with Effects / You Might Not Need an Effect](https://react.dev/learn/synchronizing-with-effects)
- h. React 官方文件 — [useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- i. LogRocket — [React 19.2 is here: Activity API, useEffectEvent, and more](https://blog.logrocket.com/react-19-2-is-here/)（發表於 **2025-10-13**，確認 `useEffectEvent` 於 **React 19.2（2025-10-01 釋出）**轉為穩定）
- j. LogRocket — [React useEffectEvent: Goodbye to stale closure headaches](https://blog.logrocket.com/react-useeffectevent/)
- k. React 官方文件 — [ReactDOM 事件池移除說明（React 17 release notes）](https://react.dev/blog/2020/08/10/react-v17-rc#no-event-pooling)

**驗證環境**：Node.js v22，執行日期 2026-09-05。所有時間軸輸出皆為實跑結果，非手寫。
