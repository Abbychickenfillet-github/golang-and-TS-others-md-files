---
title: SSR、renderToString 與 Hydration — 伺服器端渲染流程
type: topic-note
source: Gemini
tags: [gemini, react, ssr, hydration, dom, seo, 效能]
sources:
  - https://gemini.google.com/app/0b96bab2bcf0369f
updated: 2026-08-07
---

# SSR、renderToString 與 Hydration — 伺服器端渲染流程

本篇重點 a–j，共 10 個

## 重點整理

(a) <mark style="background: #ADCCFFA6;">SSR（Server-Side Rendering，伺服器端渲染）</mark>：在伺服器上先把頁面產生成 HTML 字串再傳給瀏覽器，好處是<mark style="background: #BBFABBA6;">首屏更快看到內容、對 SEO 友善</mark>（爬蟲不必等 JS 執行完才看得到文字）。

(b) <mark style="background: #FFF3A3A6;">伺服器怎麼把元件變成 HTML</mark>：靠框架提供的特定函式，React 就是 `renderToString`（或串流版 `renderToPipeableStream`）。它把 React 元件樹轉成<mark style="background: #FFB8EBA6;">純字串</mark>，不是 DOM 節點。

```jsx
// 伺服器端（Node.js）
import { renderToString } from 'react-dom/server';
const html = renderToString(<App />);   // 純字串，例如 "<div id=\"root\">…</div>"
res.send(`<!DOCTYPE html><html><body>${html}</body></html>`);
```

(c) <mark style="background: #FF5582A6;">關鍵釐清（Abby 當時的疑問）</mark>：「伺服器產生的 HTML 還會有 DOM Tree 嗎？」<mark style="background: #BBFABBA6;">伺服器端沒有 DOM Tree</mark>，Node.js 環境根本沒有 `window` 和 `document`；伺服器產出的只是一段字串。<mark style="background: #FFF3A3A6;">DOM Tree 是「瀏覽器收到 HTML 字串後，自己解析（Parse）建立出來的」</mark>。

(d) <mark style="background: #ADCCFFA6;">render 函式做了什麼</mark>：React 的 render（函數型元件就是元件函式本身的回傳值）會根據當下的 state 和 props，回傳一段<mark style="background: #FFB8EBA6;">「UI 的描述」</mark>——也就是 JSX 編譯後的 React Element 物件樹，而不是直接操作畫面。真正的畫面更新由 React 之後比對再套用。

(e) <mark style="background: #FFF3A3A6;">函數型元件裡的 JS 操作跑去哪裡（本篇核心問題）</mark>：

| 階段 | 在哪執行 | 會執行什麼 | 不會執行什麼 |
|---|---|---|---|
| 伺服器端 SSR | Node.js | 元件函式本體跑一次以產生 HTML 字串 | <mark style="background: #FF5582A6;">`useEffect` 不會跑、事件處理器不會綁定</mark> |
| 瀏覽器 Hydration | 瀏覽器 | 同一份元件程式碼再跑一次，把事件處理器「接」到既有 DOM 上 | — |
| 之後的互動 | 瀏覽器 | state 更新、事件、`useEffect` 全部正常運作 | — |

(f) <mark style="background: #ADCCFFA6;">Hydration（水合）</mark>：瀏覽器已經有伺服器送來的靜態 HTML，React 在客戶端用 `hydrateRoot` <mark style="background: #BBFABBA6;">不是重畫一次，而是「認領」既有的 DOM 節點並掛上事件監聽</mark>，讓死的 HTML 活過來變成可互動的頁面。

```jsx
// 客戶端
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

(g) <mark style="background: #FF5582A6;">Hydration 陷阱</mark>：伺服器渲染結果與客戶端首次渲染結果必須一致，否則會出現 hydration mismatch 警告。<mark style="background: #FF5582A6;">最常見的地雷是在元件本體直接用 `Date.now()`、`Math.random()`、`window.xxx`</mark>——這類值兩邊必然不同，要改放進 `useEffect`。

(h) <mark style="background: #ADCCFFA6;">編譯型 vs 直譯型的效能（對話的起頭問題）</mark>：Gemini 的回答是「C++ 通常編譯成機器碼，執行速度通常比直譯型的 JavaScript 快，但實際表現仍取決於演算法與硬體環境」。

(i) <mark style="background: #FF5582A6;">⚠️ 存疑／更正</mark>：把 JavaScript 一律說成「直譯型（Interpreted）」<mark style="background: #FF5582A6;">已經不精確</mark>。現代 V8 引擎採 <mark style="background: #ADCCFFA6;">JIT（Just-In-Time Compilation，即時編譯）</mark>——先由 Ignition 直譯器產生位元組碼，熱點程式碼再交給 TurboFan 編譯成最佳化機器碼。所以差距主因並非「有沒有編譯」，而是<mark style="background: #FFB8EBA6;">記憶體管理方式（手動 vs GC）、型別是否靜態已知、以及去最佳化（Deoptimization）風險</mark>。

(j) <mark style="background: #D2B3FFA6;">次要備註</mark>：這串對話後半段其實跑題到「LeetCode 找位數乘積」的迴圈起始值問題（該從 `n` 開始而非 `1`、要轉字串的是迴圈變數 `i` 而不是固定的 `n`），與 SSR 主題無關，已另行歸入雙指標／迴圈相關筆記脈絡，本篇不重複收錄。

## 相關筆記

- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]（承接 (c) 的「瀏覽器拿到 HTML 字串後才建 DOM Tree」；該篇詳述 HTML → DOM → CSSOM → Render Tree → Layout → Paint 的完整管線，SSR 的價值正是讓這條管線更早開始跑）
- [[V8引擎完整管線-Parse到Deoptimization]]（直接支撐 (i) 的更正；該篇講 Ignition 直譯器、TurboFan 最佳化與 Deoptimization，說明為什麼「JS = 直譯語言」的說法已過時）
- [[JIT與useMemo-CPU記憶體取捨]]（同樣談 JIT 與效能取捨；該篇從 React 層看快取，本篇 (i) 從引擎層看編譯，兩篇是同一議題的上下游）
- [[Node-global與process物件屬性逐行解釋]]（實證 (c) 的「Node 沒有 window 和 document」；該篇實際在 Node REPL 印出 global 與 process，是本篇論點的操作證據）
- [[React-純函數與嚴格模式-StrictMode]]（呼應 (g) 的 hydration mismatch；元件本體必須是純函數、不能有隨機或時間副作用，正是兩邊渲染結果能一致的前提）
- [[前端框架比較-Vue-React-Angular難易度與優缺點]]（同批對話延伸；三大框架都各有 SSR 方案 Next.js／Nuxt／Angular Universal，可對照選型）

## 各對話來源

### 數字位數乘積的解釋（2026-08-06）— https://gemini.google.com/app/0b96bab2bcf0369f

使用者：所以 C++ 一定比 JavaScript 快嗎？
Gemini：C++ 通常編譯成機器碼，執行速度通常比直譯型的 JavaScript 快，但實際表現仍取決於演算法與硬體環境。（⚠️ 見重點 (i) 的更正）

使用者：那 JavaScript 的 SSR 呢？
Gemini：SSR 是伺服器端渲染，把頁面在伺服器上先產生好 HTML 再傳給客戶端，可以讓頁面更快顯示出來，對 SEO 也很有幫助。

使用者：伺服器端要怎麼轉成 HTML？那這樣子 HTML 還會有 DOM Tree 嗎？
Gemini：伺服器端是用特定的函式把 JavaScript 元件轉換成 HTML 字串，例如 React 的 `renderToString`。傳到瀏覽器後，瀏覽器解析這個 HTML 字串才會重新建立出 DOM 樹，讓網頁可以互動。

使用者：然後 render 函數裡面做了些什麼？
Gemini：渲染函式會根據元件目前的狀態和屬性，回傳一段 UI 的描述，通常就是在 JSX 裡面寫好的畫面結構，用來決定 UI 呈現出來的樣子。

使用者：那些 JavaScript 的操作，因為 React 是函數型元件，那些 JS 操作會跑去哪裡？
Gemini：在函數型元件裡，所有 JavaScript 操作（狀態管理、事件處理程式）在伺服器端渲染時會執行一次以產生 HTML，之後在客戶端瀏覽器上還會繼續在瀏覽器環境中運行，以維持網頁的互動性。

（後續回合轉為討論 LeetCode 迴圈起始值 `n` vs `i` 與字串轉換，與本主題無關，見重點 (j)。）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/0b96bab2bcf0369f | 2026-08-07 查證 |
| React `renderToString` 官方文件 | https://react.dev/reference/react-dom/server/renderToString | React 19 文件，2026-08-07 查證 |
| React `hydrateRoot` 官方文件 | https://react.dev/reference/react-dom/client/hydrateRoot | 含 hydration mismatch 說明，2026-08-07 查證 |
| V8 JIT 架構（Ignition／TurboFan） | https://v8.dev/docs | 用於更正重點 (i)，2026-08-07 查證 |
