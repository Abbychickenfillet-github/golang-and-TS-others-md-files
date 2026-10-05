---
title: "useEffect：把元件同步到外部系統（Web API 與 DOM）"
type: topic-note
tags: [react, hooks, useEffect, external-system, web-api, dom, cleanup, strictmode, react-dev]
aliases: [useEffect外部系統, connecting-to-an-external-system, useEffect-官方主軸]
related:
  - "[[02-useEffect的setup清理函式-return一個函式而不是執行它]]"
  - "[[01-React-純函數與嚴格模式-StrictMode]]"
  - "[[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]"
  - "[[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]]"
  - "[[SSR-renderToString與Hydration-伺服器端渲染流程]]"
sources:
  - https://react.dev/reference/react/useEffect
  - https://gemini.google.com/app/5b6fc934e5d7f253
updated: 2026-10-04
---

# useEffect：把元件同步到外部系統

> [!info] 本篇重點 a–g，共 7 個
> 主軸是 react.dev 官方 `useEffect` 頁面 Usage 第一節「Connecting to an external system」。
> Abby 在 Gemini 的追問只是支線，放在 f。
> 範例程式碼：`03-useEffect-外部系統-demo.jsx`（同資料夾，可直接貼進 CodeSandbox 跑）。流程圖在 c，自我測驗在 g，全部集中在這一個檔案。

---

## a. 一句話

`useEffect(setup, dependencies?)` 讓元件在畫面上存在的期間，持續和一個「React 管不到的東西」保持同步。

| 參數 | 白話 | 必填 |
|---|---|---|
| `setup` | 連上外部系統的函式，可以選擇性 `return` 一個 cleanup 函式負責斷開 | 是 |
| `dependencies` | setup 裡讀到的所有 reactive value（props、state、元件內宣告的變數與函式） | 否 |

**Effect（副作用）是概念，`useEffect` 是實作這個概念的 Hook。**
Effect 指的是「由渲染本身引起、需要和外部系統同步」的程式碼，跟「由某個使用者操作引起」的事件處理器是不同的東西。

| 程式碼放哪 | 誰觸發 | 能不能有副作用 | 例子 |
|---|---|---|---|
| 元件函式本體（render） | 每次 render | 不行，必須是純計算 | 用 props 算出要顯示的 JSX |
| 事件處理器 | 使用者的某個操作 | 可以 | 按下按鈕後送出表單 |
| Effect | 元件 commit 到畫面上這件事本身 | 可以，而且負責同步外部系統 | 元件出現時連上聊天室 |

Effect 的心智模型只有兩個動作：「開始同步」（setup）與「停止同步」（cleanup）。
它不等於元件的 mount、update、unmount 生命週期，所以 deps 變了會停止再開始，元件根本沒 unmount 也一樣。

---

## b. 什麼是外部系統

判準只有一個：**不由 React 控制，需要你主動「連上」與「斷開」的東西。**
Web API 與 DOM 都算，因為 React 只管 render 出來的 JSX，不管瀏覽器另外提供的功能。

| 類別 | 例子 | setup 連上 | cleanup 斷開 |
|---|---|---|---|
| Web API（計時器） | `setInterval` | `setInterval(fn, 1000)` | `clearInterval(id)` |
| Web API（全域事件） | `window` 的 `pointermove` | `window.addEventListener(...)` | `window.removeEventListener(...)` |
| DOM（觀察者） | `IntersectionObserver` | `observer.observe(div)` | `observer.disconnect()` |
| DOM（元素方法） | `<dialog>` | `dialog.showModal()` | `dialog.close()` |
| 網路 | 聊天室連線 | `connection.connect()` | `connection.disconnect()` |
| 第三方函式庫 | 動畫庫、地圖 widget | `animation.start()` | `animation.stop()` |

---

## c. 什麼時候跑：三個時機

```mermaid
flowchart TD
  A([元件 mount]) --> B[執行 setup 連上外部系統]
  B --> C{commit 後 deps 有變嗎}
  C -- 有變 --> D[先用舊值執行 cleanup 斷開]
  D --> E[再用新值執行 setup 重連]
  E --> C
  C -- 元件被移除 --> F[最後執行一次 cleanup]
  F --> G([結束])
```

**官方原文的「包含」關係，以及誰先誰後：**
官方原文：*A setup function with setup code that connects to that system. It should return a cleanup function with cleanup code that disconnects from that system.*

| 名稱 | 是什麼 | 寫在哪 | 什麼時候執行 |
|---|---|---|---|
| setup 函式 | 傳給 `useEffect` 的第一個參數，整個箭頭函式 | `useEffect(` 的括號裡 | React 決定要「連上」時 |
| setup code | 函式裡負責 `connect()` 的那幾行 | setup 函式本體 | 跟著 setup 函式一起跑 |
| cleanup 函式 | setup 函式 `return` 出去的那個小函式 | 寫在 setup 函式裡面 | `return` 時只是被建立並交給 React 保管，之後才由 React 呼叫 |
| cleanup code | 小函式裡負責 `disconnect()` 的那幾行 | cleanup 函式本體 | 跟著 cleanup 函式一起跑 |

「包含」只在寫法上成立：cleanup 函式寫在 setup 函式裡面。
「cleanup 先於 setup」只對**下一次的** setup 成立，對它自己那一次不成立：cleanup 必須等 setup 跑過、把它 `return` 出來才存在，所以每個 cleanup 一定在它對應的 setup 之後。

| 步驟 | 事件 | 實際執行的順序 |
|---|---|---|
| 1 | mount | setup①（還沒有上一次的 cleanup，所以沒東西可先跑），產生 cleanup① |
| 2 | deps 變了 | cleanup①（用舊值）→ setup②，產生 cleanup② |
| 3 | unmount | cleanup② |

配對規則：setupN 先於 cleanupN，cleanupN 先於 setupN+1。

**官方三句話逐句對照：「cleanup 用舊值跑」是不是代表 cleanup 比 setup 先？**

| 官方原文 | 白話 | 誰先 |
|---|---|---|
| 1. Your setup code runs when your component is added to the page (mounts). | 掛載時只跑 setup，此時還沒有任何 cleanup 可跑 | setup 先 |
| 2. After every commit where the dependencies have changed: First, your cleanup code runs with the old props and state. Then, your setup code runs with the new props and state. | deps 變了的那次 commit，先用舊值跑上一輪的 cleanup，再用新值跑新的 setup | cleanup 先於「新的」setup |
| 3. Your cleanup code runs one final time after your component is removed from the page (unmounts). | 元件移除後最後再跑一次 cleanup | cleanup 最後 |

「with the old props and state」的意思是：這個 cleanup 是上一次 render 產生的，它抓住的是那一次 render 的 props 與 state（閉包），所以看到的是「舊值」。這不是在說 cleanup 優先，順序要看第 1、2、3 句合起來讀：setup① → cleanup①（舊值）→ setup②（新值）→ … → 最後一次 cleanup。

**「useEffect 裡面、cleanup 以外的都叫 setup code」嗎？大致是，要補三個精確的界線：**

```js
useEffect(() => {                                        // ← setup 函式（整個箭頭函式）
  const connection = createConnection(serverUrl, roomId); // ① setup code
  connection.connect();                                   // ① setup code
  return () => {                                          // ← 這一行在 setup 時執行，作用是建立 cleanup 函式
    connection.disconnect();                              // ② cleanup code
  };
}, [serverUrl, roomId]);                                  // ③ 依賴（第二個參數，不是會執行的 code）
```

| 名稱 | 範圍 | 什麼時候執行 |
|---|---|---|
| setup 函式 | 傳給 `useEffect` 的整個箭頭函式 | React 在 commit 之後呼叫 |
| setup code | setup 函式裡，扣掉 cleanup 函式本體，其餘會在 setup 時跑的敘述 | 跟著 setup 函式一起跑 |
| cleanup 函式 | `return` 出去的那個函式 | `return` 時只是建立，之後由 React 呼叫 |
| cleanup code | cleanup 函式的本體 | 跟著 cleanup 函式一起跑 |
| 依賴陣列 | `useEffect` 的第二個參數 | 不執行，React 拿來比較 |
| 元件本體（`useEffect` 外面） | `useState`、算變數等 | 每一次 render 都跑，不是 setup code |

官方範例標示的 setup code 只有 `createConnection` 與 `connect()` 兩行，也就是「負責連上外部系統」的那幾行。沒有 `return` 的 Effect 就沒有 cleanup code，整個函式本體都算 setup code。

**mount 跟「掛到瀏覽器上」是什麼關係？**
mount 指元件第一次被放進 React 的元件樹，React 實際做的事是在 commit 階段用 `createElement` 建出 DOM node，再用 `appendChild` 插進瀏覽器的 DOM 樹（最上層是 `createRoot(document.getElementById('root'))` 指定的容器）。
所以「掛到瀏覽器上」的精確說法是「插進 DOM 樹」，它跟「畫到螢幕上」是兩件事，中間隔著 browser paint。

| 順序 | 階段 | 發生什麼事 | 跟 Effect 的關係 |
|---|---|---|---|
| 1 | Render | 呼叫元件函式算出 JSX，純計算，還沒碰 DOM | Effect 完全不跑 |
| 2 | Commit：Mutation | 真正動 DOM，mount 就是此時 `appendChild` | DOM 已經存在，`ref.current` 此時才有值 |
| 3 | Commit：Layout | 同步執行 `useLayoutEffect` | 需要在畫面出現前量測或擺位置才用它 |
| 4 | Browser paint | 瀏覽器把 DOM 畫到螢幕 | 使用者此刻才看得到 |
| 5 | Passive | 執行 `useEffect` 的 setup | 一般情況在 paint 之後，所以可能看到閃爍 |

若這次 commit 是由點擊這類互動引起，React 可能在 paint 之前就先跑 Effect，所以不要假設 Effect 一定在 paint 之後。
React Native 沒有瀏覽器，mount 時 `appendChild` 的對象換成原生 UI，概念相同。
完整的階段圖見 [[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]。

React 用 `Object.is` 逐項比較 deps 的新舊值，來決定要不要重跑。

| 依賴寫法 | 何時重跑 |
|---|---|
| `[a, b]` | 初次 commit 後，之後 `a` 或 `b` 變了才重跑 |
| `[]` | 只在初次 commit 後跑（開發模式多一輪，見 d） |
| 不寫 | 每次 commit 後都重跑 |

> [!warning] deps 不是你「選」的
> 程式碼裡讀了哪些 reactive value，就必須全部列進去，這由程式碼決定。
> 想拿掉某個依賴，要先「證明」它不是 reactive，例如把 `serverUrl` 搬到元件外面變成模組常數。
> 用 `eslint-ignore` 蓋掉警告，等於對 React 說謊。

---

## d. 鏡像原則與 StrictMode

cleanup 必須能把 setup 做的事完整復原，這叫「鏡像」。
官方原文：*To help you find bugs, in development React runs setup and cleanup one extra time before the setup.*
這句話裡的 development 指開發模式，也就是 `<StrictMode>` 包住元件時（Vite 與 CRA 的模板預設就包著）。正式上線（production）不會多跑。

**這個「多跑一次」發生在掛載（mount）那一刻，不是每次 re-render。**
React 在元件第一次掛載後，故意模擬一次「卸載再重新掛載」，所以順序是 **setup → cleanup → setup**，之後 deps 變動才照一般規則跑。

| StrictMode 的兩種「多跑一次」 | 跑的是什麼 | 什麼時候跑 | 目的 |
|---|---|---|---|
| 雙重 render | 元件函式本體被呼叫兩次 | 每一次 render，包含每次 `setState` 後的 re-render | 抓出不純的 render，見 [[01-React-純函數與嚴格模式-StrictMode]] |
| Effect 多一輪 | setup → cleanup → setup | 只在掛載那一次 | 抓出沒寫對的 cleanup |

**官方說的 visible issues（使用者看得見的問題）就是：cleanup 沒把 setup 做的事復原，多出來的那一輪就留下殘骸。**
你的推論是對的：出現這種問題，就代表 cleanup 該去停止或取消 setup 剛剛建立的東西。順帶一提，這裡的 setup 是「連線的函式」，不是 class 的「建構函式」（constructor）。

| setup 做的事 | 沒寫 cleanup，StrictMode 下看到的 visible issue | cleanup 該做的事 |
|---|---|---|
| `setInterval(() => setCount(c => c + 1), 1000)` | 計數每秒加 2，因為同時有兩個計時器在跑 | `clearInterval(id)` |
| `window.addEventListener('pointermove', fn)` | 同一個事件處理了兩次 | `removeEventListener` |
| `connection.connect()` | 同一個房間連了兩條線，收到重複訊息 | `connection.disconnect()` |
| `animation.start()` | 動畫從頭疊了兩次 | `animation.stop()` |

**rule of thumb（經驗法則）的白話：**
官方原文：*the user shouldn't be able to distinguish between the setup being called once (as in production) and a setup → cleanup → setup sequence (as in development).*
意思是：使用者不該分辨得出「正式環境只 setup 一次」跟「開發環境 setup → cleanup → setup」是哪一個。
cleanup 把第一次 setup 完全抵銷掉，第二次 setup 之後的世界，就跟只 setup 一次的世界一模一樣，外部系統裡永遠只剩一份連線、一個計時器、一個監聽器。
連結的「See common solutions」就是教你怎麼補 cleanup，常見解法已經寫在本篇 b 段的表裡：每一種 setup 配一個反向的 cleanup。

可以直接跑 `03-useEffect-外部系統-demo.jsx` 裡的 `TimerNoCleanup`，在 StrictMode 下親眼看計數變兩倍快，再對照 `Timer` 修好的版本。

> [!tip] 什麼時候可以不寫 cleanup
> 官方的 `MapWidget` 範例沒寫 cleanup，因為那個 class 只管理傳進去的那個 DOM node，元件移除後 node 與 instance 都會被瀏覽器的 GC 回收。
> 細節見 [[02-useEffect的setup清理函式-return一個函式而不是執行它]]。

---

## e. 不是外部系統，就不要用 Effect

官方 Caveats 的原話是：不是在同步外部系統，你大概不需要 Effect。

| 情況 | 官方建議 |
|---|---|
| 用 state 算另一個 state | 直接在 render 中算，不要用 Effect |
| 在 Effect 裡 `fetch` 資料 | 可以做但要加 `ignore` 旗標避免 race condition，更建議用框架內建或 TanStack Query、SWR |
| 在 Effect 裡改 DOM 造成畫面閃爍 | 改用 `useLayoutEffect`，它會在瀏覽器 paint 之前跑 |
| 需要在伺服器端執行 | Effect 只在 client 跑，SSR 不執行，見 [[SSR-renderToString與Hydration-伺服器端渲染流程]] |

---

## f. 支線：Abby 追問 useRef 怎麼跟 Effect 搭配

官方範例（動畫、`<dialog>`、`IntersectionObserver`）都需要碰到真正的 DOM node，做法是三步：

1. `const ref = useRef(null)` 先準備一個空盒子。
2. JSX 寫 `<dialog ref={ref}>`，React 在 commit 階段把 DOM node 放進 `ref.current`。
3. Effect 在 commit 之後才執行，所以此時 `ref.current` 已經是真的 node，可以呼叫 `showModal()`。

兩個細節：

| 細節 | 原因 |
|---|---|
| 改 `ref.current` 不會觸發重新渲染 | ref 不是 reactive value，不用寫進 deps |
| 官方範例先寫 `const dialog = ref.current` 再給 cleanup 用 | 避免 cleanup 執行時 `ref.current` 已經指到別的東西 |

useRef 與 Vue `ref` 的差異見 [[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]]。
追問的原始對話連結在 frontmatter 的 `sources`，本次寫入時該網站無法重新讀取，內容以上述既有筆記為準。

---

## g. 自我測驗（點開標題看答案）

> [!question]- 填空：5 題
> 1. `useEffect` 的第一個參數叫 ＿＿＿ 函式，第二個叫 ＿＿＿。
> 2. React 比較依賴新舊值使用 ＿＿＿。
> 3. 不寫依賴陣列，每次 ＿＿＿ 之後都會重跑。
> 4. StrictMode 開發模式多跑的順序是 setup → ＿＿＿ → setup。
> 5. mount 在 commit 階段是呼叫 ＿＿＿ 把 DOM node 插進 DOM 樹。
>
> > [!success]- 答案
> > 1. setup、dependencies　2. `Object.is`　3. commit　4. cleanup　5. `appendChild`

> [!question]- 是非：依賴陣列可以自己挑要列哪些值。
> > [!success] 非
> > 程式碼裡讀到的 reactive value 就必須全列，由程式碼決定。

> [!question]- 是非：用 state 算出另一個 state，應該用 Effect。
> > [!success] 非
> > 這不是外部系統，直接在 render 中計算即可。

> [!question]- 是非：Effect 在伺服器端渲染時也會執行。
> > [!success] 非
> > Effect 只在 client 執行。

> [!question]- 是非：`window.addEventListener` 屬於外部系統。
> > [!success] 是
> > 它是瀏覽器提供的 Web API，不由 React 控制，需要 cleanup 移除。

> [!question]- 是非：mount 完成就代表使用者已經看到畫面。
> > [!success] 非
> > mount 是 DOM 插入完成，之後還要經過 browser paint 才會畫到螢幕。

> [!question]- 申論：用 5W1H 說明什麼是外部系統，並舉三個例子寫出各自的 cleanup。
> > [!success] 參考答案
> > What：不由 React 控制的東西。Why：React 只管 JSX，不會幫你斷開連線。When：mount 後連上，deps 變或 unmount 時斷開。How：setup 連上，cleanup 反向復原。
> > 例子：`setInterval` 配 `clearInterval`，`addEventListener` 配 `removeEventListener`，`observer.observe` 配 `observer.disconnect`。

> [!question]- 申論：Effect 與元件 mount／unmount 生命週期有什麼不同？為什麼 deps 變了 cleanup 也會跑？
> > [!success] 參考答案
> > Effect 只有「開始同步」與「停止同步」兩個動作，描述的是和外部系統的同步關係，不是元件存在與否。
> > deps 變了代表要同步的目標改變，必須先停止對舊目標的同步（cleanup 用舊值），再開始對新目標的同步（setup 用新值），元件不需要 unmount。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| React 官方文件：`useEffect`（Usage 的 Connecting to an external system、Caveats、deps 三種寫法） | https://react.dev/reference/react/useEffect | 依 Abby 於 2026-10-04 貼入的頁面全文整理 |
| React 官方文件：Synchronizing with Effects（Effect 與事件處理器的差別，依記憶與既有筆記整理） | https://react.dev/learn/synchronizing-with-effects | 2026-10-04 嘗試抓取被網路擋下，⚠️ 該段措辭未逐字核對 |
| React 官方文件：Render and Commit（mount 時 `appendChild`、paint 的說法，依既有筆記整理） | https://react.dev/learn/render-and-commit | 2026-10-04 嘗試抓取被網路擋下，⚠️ 未逐字核對 |
| React 官方文件：You Might Not Need an Effect | https://react.dev/learn/you-might-not-need-an-effect | 該頁面內連結，未重新抓取 |
| MDN：`IntersectionObserver` | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API | 該頁面內連結，未重新抓取 |
| MDN：`HTMLDialogElement.showModal()` | https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal | 該頁面內連結，未重新抓取 |
| React 官方文件：useEffect 的 Caveats 與 Troubleshooting（StrictMode 額外一輪 setup → cleanup、visible issues、rule of thumb 原文） | https://react.dev/reference/react/useEffect | 依 2026-10-04 貼入的全文，原文逐字引用 |
| Abby 的追問對話（Gemini） | https://gemini.google.com/app/5b6fc934e5d7f253 | 本次無法讀取，僅作索引 |
