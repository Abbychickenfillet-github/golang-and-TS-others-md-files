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

> [!info] 本篇重點 a–f，共 6 個
> 主軸是 react.dev 官方 `useEffect` 頁面 Usage 第一節「Connecting to an external system」。
> Abby 在 Gemini 的追問只是支線，放在 f。
> 互動版（流程圖＋自我測驗）：`03-useEffect將元件同步到外部系統-互動版.html`，範例程式碼：`03-useEffect-外部系統-demo.jsx`。

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
開發模式的 StrictMode 會在第一次真正的 setup 之前，多跑一輪 **setup → cleanup → setup** 來壓力測試鏡像寫得對不對。
判準是：使用者不該分辨得出「setup 只跑一次」跟「setup → cleanup → setup」。

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

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| React 官方文件：`useEffect`（Usage 的 Connecting to an external system、Caveats、deps 三種寫法） | https://react.dev/reference/react/useEffect | 依 Abby 於 2026-10-04 貼入的頁面全文整理 |
| React 官方文件：Synchronizing with Effects（Effect 與事件處理器的差別，依記憶與既有筆記整理） | https://react.dev/learn/synchronizing-with-effects | 2026-10-04 嘗試抓取被網路擋下，⚠️ 該段措辭未逐字核對 |
| React 官方文件：Render and Commit（mount 時 `appendChild`、paint 的說法，依既有筆記整理） | https://react.dev/learn/render-and-commit | 2026-10-04 嘗試抓取被網路擋下，⚠️ 未逐字核對 |
| React 官方文件：You Might Not Need an Effect | https://react.dev/learn/you-might-not-need-an-effect | 該頁面內連結，未重新抓取 |
| MDN：`IntersectionObserver` | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API | 該頁面內連結，未重新抓取 |
| MDN：`HTMLDialogElement.showModal()` | https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal | 該頁面內連結，未重新抓取 |
| Abby 的追問對話（Gemini） | https://gemini.google.com/app/5b6fc934e5d7f253 | 本次無法讀取，僅作索引 |
