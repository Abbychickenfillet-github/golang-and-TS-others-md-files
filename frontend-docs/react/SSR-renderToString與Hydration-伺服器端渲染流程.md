---
title: SSR、renderToString 與 Hydration — 伺服器端渲染流程
type: topic-note
source: Gemini
tags: [gemini, react, ssr, hydration, dom, seo, 效能, build-time, runtime, ssg]
sources:
  - https://gemini.google.com/app/0b96bab2bcf0369f
  - https://gemini.google.com/app/7a12e30998ccde0c
  - https://gemini.google.com/app/de0c03613eb15709
updated: 2026-09-06
---

# SSR、renderToString 與 Hydration — 伺服器端渲染流程

本篇重點 a–v，共 22 個（l–p 為 2026-09-01 追加；q–v 為 2026-09-06 追加）

(a) <mark style="background: #ADCCFFA6;">SSR（Server-Side Rendering，伺服器端渲染）</mark>：在伺服器上先把頁面產生成 HTML 字串再傳給瀏覽器，好處是<mark style="background: #BBFABBA6;">首屏更快看到內容、對 SEO 友善</mark>（爬蟲不必等 JS 執行完才看得到文字）。

**Hydration 在完整渲染管線裡是第幾步？**——<mark style="background: #FF5582A6;">Reflow（重排/Layout）跟 Repaint（重繪/Paint）排在 Hydration 前面</mark>，順序是：

1. 伺服器 `renderToString()` 產生 HTML 字串（此時沒有 DOM）
2. 瀏覽器收到 HTML 字串
3. Parse HTML → 建 DOM Tree
4. Parse CSS → 建 CSSOM
5. 合併成 Render Tree
6. **Layout（重排/Reflow）**——計算每個元素的位置與大小
7. **Paint（重繪/Repaint）**——把像素畫出來 → <mark style="background: #BBFABBA6;">此時畫面已經看得到，但完全不能互動</mark>
8. JS bundle 下載完、執行，React 呼叫 `hydrateRoot()` → <mark style="background: #ADCCFFA6;">Hydration</mark>——走訪既有 DOM、掛上事件監聽 → <mark style="background: #BBFABBA6;">此時頁面才變成可以互動</mark>

SSR 的核心賣點正是把「看得到（Paint 完成）」跟「能互動（Hydration 完成）」拆成兩個時間點，讓使用者先看到內容，互動性稍後才補上（詳細管線見 [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]）。

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

(k) <mark style="background: #ADCCFFA6;">CSR / SSR / SSG 的 Hydration 狀態對照</mark>（用列表，SSR 與 SSG 幾乎相同）：

- **CSR（純 SPA）**：**沒有 hydration**。伺服器只發**空殼** HTML（`<div id="root"></div>`），瀏覽器端用 `createRoot().render()` **從零 mount、現場建整棵 DOM**（這是「初次渲染」，不是 hydration）。
- **SSR**：**有 hydration**。HTML＝伺服器**每次請求**現產（runtime 在伺服器跑 `renderToString`）→ 瀏覽器 `hydrateRoot()` **認領既有 DOM、掛事件**（不重畫）。
- **SSG**：**有 hydration，跟 SSR 相同**。唯一差別在 HTML 的產生時機——**SSG 是 build-time 先把每頁 render 成現成的靜態 HTML 檔**（不是每請求現產），部署成靜態檔；到瀏覽器端一樣 `hydrateRoot()` 認領。

> 一句話：**CSR 沒有 hydration（從零建）；SSR/SSG 都有 hydration（認領既有 DOM），差別只在「HTML 是每請求現產（SSR）還是 build-time 先產好（SSG）」。**
>
> 接效能指標：**FP（First Paint）**＝第一次畫出任何像素（可能只是背景色）；**FCP（First Contentful Paint）**＝第一次畫出「內容」（文字/圖片）。**SSR/SSG** 首屏 HTML 就有內容 → **FCP 快**；**CSR** 是空殼 → FP 可能快、但 **FCP 要等 JS 建好內容才發生**、較慢。這條管線（Parse→DOM→CSSOM→Render Tree→Layout→Paint）跑到「畫出內容」那刻＝FCP。詳見 [Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪](Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪.md)。

### 追加 2026-09-01：面試被問「渲染是什麼」該怎麼答

(l) <mark style="background: #FF5582A6;">面試被問到「渲染是什麼」時，只回答 Critical Rendering Path 的流程只答對一半。</mark>Critical Rendering Path 指的是<mark style="background: #ADCCFFA6;">瀏覽器把 HTML、CSS 和 JavaScript 轉換成螢幕上像素的過程</mark>，那是「瀏覽器內部」的那一層。<mark style="background: #BBFABBA6;">但在現代網頁開發的語境裡，「渲染」還包含架構層級的 SSR 與 CSR——也就是「這份 HTML 是誰產生的、在哪裡產生的」。</mark>

(m) <mark style="background: #D2B3FFA6;">所以正確的答法是先反問或先分層</mark>：「渲染這個詞有兩層意思，一層是瀏覽器把 DOM 畫成像素的關鍵渲染路徑，另一層是架構上的 CSR／SSR／SSG。您想聽哪一層？」——這比直接背 CRP 流程更能顯示你知道詞彙的邊界。

(n) 兩個縮寫的最短定義：<mark style="background: #ADCCFFA6;">CSR（Client-Side Rendering，客戶端渲染）</mark>是瀏覽器下載一個很小的 HTML 與 JavaScript 檔案，接著在客戶端的瀏覽器上執行 JavaScript 抓資料並動態產生網頁內容；<mark style="background: #ADCCFFA6;">SSR（Server-Side Rendering，伺服器端渲染）</mark>是使用者請求頁面時，伺服器在後端抓資料並把整個 HTML 建立完成，再把完整網頁送給瀏覽器顯示。

(o) <mark style="background: #FFF3A3A6;">CSR 下載的那個「很小的 HTML」就是 `index.html`</mark>，裡面通常只有一個 `<div id="root"></div>` 的空白骨架。<mark style="background: #FF5582A6;">注意不要把它跟 lazy loading 混為一談</mark>：<mark style="background: #ADCCFFA6;">lazy loading（延遲載入）</mark>是效能手段，把網頁拆成多個區塊或元件、要顯示時才載入那段程式碼；<mark style="background: #BBFABBA6;">而「JavaScript 動態抓取資料」是資料層的事，兩者是不同概念，CSR 可以用 lazy loading 但不是非用不可。</mark>

(p) <mark style="background: #FFF3A3A6;">同一個 React 元件，在 CSR 執行一次，在 SSR 會執行兩次。</mark>

| 架構 | 元件執行次數 | 分別發生在哪 |
| --- | --- | --- |
| CSR | <mark style="background: #BBFABBA6;">1 次</mark> | 只在客戶端瀏覽器執行，直接建立 DOM |
| SSR | <mark style="background: #FF5582A6;">2 次</mark> | 第一次在伺服器端執行，把結果轉成 HTML 字串傳回；第二次在客戶端載入 JavaScript 時進行 Hydration，元件再次執行、建立虛擬 DOM 並綁定事件，讓畫面恢復互動性 |

<mark style="background: #FFB8EBA6;">這正是 (g) 那個 hydration mismatch 陷阱的根本成因</mark>——「執行兩次」就意味著「兩次結果必須一致」，所以 `Date.now()`、`Math.random()`、`window.xxx` 才會爆炸。

### 追加 2026-09-06：Build Time 與 Runtime 各做了什麼（CSR／SSR／SSG 分界）

![[圖解_CSR-SSR-SSG的HTML在哪一刻長出來_2026-09-06.svg]]

(q) <mark style="background: #ADCCFFA6;">Build Time（建置期）</mark>是「你在自己的電腦或 CI 上跑 `npm run build` 的那一次」，做的是<mark style="background: #FFF3A3A6;">編譯與打包</mark>——TypeScript／JSX 轉成瀏覽器看得懂的 JavaScript、Tree Shaking、Minify、切 chunk、產出雜湊檔名。<mark style="background: #ADCCFFA6;">Runtime（執行期）</mark>則是「使用者真的送出請求、程式真的在跑」的時候。<mark style="background: #FF5582A6;">兩者的分界不是「快或慢」，而是「發生一次」還是「每個使用者都發生一次」</mark>。

(r) <mark style="background: #FFF3A3A6;">CSR 的兩個階段</mark>：

- **Build Time**：打包器（Vite／webpack）只把 React 與你的元件打包成 `.js` 檔，<mark style="background: #FF5582A6;">此時完全沒有任何頁面內容的 HTML</mark>，只有一個含 `<div id="root"></div>` 的空骨架 `index.html`。
- **Runtime**：瀏覽器下載那個空 HTML → 下載並執行大包 JavaScript → JS 在客戶端動態建立 DOM → 畫面才出現。

(s) <mark style="background: #FFF3A3A6;">SSR 的兩個階段</mark>：

- **Build Time**：一樣只做編譯打包，但會產出<mark style="background: #FFB8EBA6;">兩份 bundle</mark>——伺服器端 bundle（給 Node.js 跑 `renderToString`）與客戶端 bundle（給瀏覽器做 Hydration）。<mark style="background: #FF5582A6;">此時同樣沒有任何頁面 HTML。</mark>
- **Runtime**：每一個請求進來，伺服器才即時抓資料、執行元件、`renderToString` 產生這一次專屬的 HTML 回傳；瀏覽器 Parse → Layout → Paint（看得到）→ 載入客戶端 bundle → `hydrateRoot`（能互動）。

(t) <mark style="background: #FF5582A6;">⚠️ 存疑／更正（本次對話最重要的一點）</mark>：Gemini 在語音回答中說「SSR 在 Build Time 時，編譯器會預先結合程式碼與後端資料庫請求，將頁面渲染成靜態 HTML；Runtime 時伺服器直接回傳預先準備好的靜態 HTML 檔案」——<mark style="background: #FF5582A6;">這段描述的其實是 SSG，不是 SSR</mark>。<mark style="background: #BBFABBA6;">SSR 的 HTML 是「每個請求當下」在伺服器產生的（per-request），不是建置時預先產生好的</mark>；正因為每次都重算，SSR 才能呈現即時資料（例如購物車、未讀通知），而 SSG 的頁面內容在部署後就固定了。

(u) 三種架構的「HTML 在哪一刻長出來」一表看完：

| 架構 | HTML 產生的時機 | 誰產生 | 資料新鮮度 | 典型工具 |
| :--- | :--- | :--- | :--- | :--- |
| <mark style="background: #ADCCFFA6;">CSR</mark> | <mark style="background: #FF5582A6;">Runtime（瀏覽器端）</mark> | 使用者的瀏覽器執行 JS | 每次開頁都最新（但要等 JS） | Vite + React、CRA |
| <mark style="background: #ADCCFFA6;">SSR</mark> | <mark style="background: #BBFABBA6;">Runtime（伺服器端，每個請求一次）</mark> | Node.js 伺服器 | 每個請求都最新 | Next.js（動態路由）、Remix |
| <mark style="background: #ADCCFFA6;">SSG</mark> | <mark style="background: #FFF3A3A6;">Build Time</mark> | CI／建置機器 | 部署當下的快照，之後不變 | Next.js `generateStaticParams`、Astro、Hugo |
| <mark style="background: #D2B3FFA6;">ISR</mark>（折衷） | Build Time 先產一份，Runtime 到期後背景重產 | 建置機器 ＋ 伺服器 | 可設定 `revalidate` 秒數 | Next.js ISR |

(v) <mark style="background: #BBFABBA6;">一句話記法</mark>：<mark style="background: #FFF3A3A6;">問「HTML 是誰、在哪一刻拼出來的」就分得出三者</mark>——建置機器拼好的是 SSG，伺服器每次現拼的是 SSR，瀏覽器自己拼的是 CSR。<mark style="background: #FFB8EBA6;">而 Build Time 這一格對三者其實做的事幾乎一樣（編譯＋打包），差別全在 Runtime。</mark>

## 相關筆記

- [[00-前端建構到執行全景地圖]] —— HTML/CSS/JS/React/Vue 各自 build-time→runtime 的總地圖，本篇是 React run-time（SSR/hydration）那一列的來源篇
- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]（承接 (c) 的「瀏覽器拿到 HTML 字串後才建 DOM Tree」；該篇詳述 HTML → DOM → CSSOM → Render Tree → Layout → Paint 的完整管線，SSR 的價值正是讓這條管線更早開始跑）
- [[V8引擎完整管線-Parse到Deoptimization]]（直接支撐 (i) 的更正；該篇講 Ignition 直譯器、TurboFan 最佳化與 Deoptimization，說明為什麼「JS = 直譯語言」的說法已過時）
- [[JIT與useMemo-CPU記憶體取捨]]（同樣談 JIT 與效能取捨；該篇從 React 層看快取，本篇 (i) 從引擎層看編譯，兩篇是同一議題的上下游）
- [[Node-global與process物件屬性逐行解釋]]（實證 (c) 的「Node 沒有 window 和 document」；該篇實際在 Node REPL 印出 global 與 process，是本篇論點的操作證據）
- [[01-React-純函數與嚴格模式-StrictMode]]（呼應 (g) 的 hydration mismatch；元件本體必須是純函數、不能有隨機或時間副作用，正是兩邊渲染結果能一致的前提）
- [[00-前端框架比較-Vue-React-Angular難易度與優缺點]]（同批對話延伸；三大框架都各有 SSR 方案 Next.js／Nuxt／Angular Universal，可對照選型）

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

### 追加 2026-09-01｜網頁渲染的定義與範疇（語音模式對話）— https://gemini.google.com/app/7a12e30998ccde0c

使用者：以為問到渲染是什麼，我就回答 critical rendering path 的流程是對的嗎？
Gemini：這對，但也只是一部分。Critical rendering path 是指瀏覽器將 HTML、CSS 和 JavaScript 轉換成螢幕上像素的過程。但在現代網頁開發中，「渲染」還包含像是伺服器渲染（SSR）或客戶端渲染（CSR）等不同架構模式。你是想針對特定面向討論嗎？

使用者：好，你先解釋 CSR 再解釋 SSR。
Gemini：CSR 是指客戶端渲染。瀏覽器會下載一個很小的 HTML 和 JavaScript 檔案，接著在客戶端的瀏覽器上運行 JavaScript 來抓取資料並動態產生網頁內容。SSR 則是伺服器渲染。當使用者請求頁面時，伺服器會在後端抓取資料並將整個 HTML 建立完成，再將完整的網頁傳送給瀏覽器顯示。

使用者：我是想知道在 runtime 時期，你說 CSR 會下載一個很小的 HTML 文件，這個是指 index 嗎？還有一個是空白的 HTML 文件。然後你說它會在客戶端的瀏覽器上運行 JavaScript 來抓取並動態產生網頁內容，那它是有用到 lazy loading 嗎？
Gemini：沒錯，那個很小的 HTML 通常就是 `index.html`，裡面會有一個像是 root 的空白骨架。至於 lazy loading，在 CSR 裡是可以用到的，它主要是為了效能考量，把網頁分成多個區塊或組件，等到需要顯示時才載入，這跟 JavaScript 動態抓取資料是不同的概念。

使用者：這個 render 的每次渲染 React 元件都會重新執行一次，在 CSR 跟 SSR 會有不同嗎？
Gemini：在 CSR 中，元件只會在客戶端的瀏覽器中執行一次，直接建立 DOM。而在 SSR 中，會有兩次執行。第一次是在伺服器端執行，將結果轉成 HTML 字串傳回；第二次是客戶端載入 JavaScript 時進行 Hydration，此時元件會再次執行，建立虛擬 DOM 並綁定事件，讓畫面恢復互動性。

> 註：這是一串語音模式對話，逐字稿有若干辨識誤差（例如「SSR」被辨識成「SS2」、「動態產生」被辨識成「動態想象」），上方已依語意還原。

### 追加 2026-09-06｜Build Time 與 Runtime 的流程差異（Gemini Live 語音對話）— https://gemini.google.com/app/de0c03613eb15709

> 註：這是一串 Gemini Live 語音對話，逐字稿辨識誤差極多（標題被自動命名為「陣列索引翻譯與理解」但內容完全無關；「Build time」被辨識成「playtime」；「is are 的變異」是誤辨），以下依語意還原。

**使用者：** 這個都是在 run time 還是 build time？
**Gemini：** 這兩個過程都是在 Runtime 執行，Build time 主要是負責準備和打包程式碼。

**使用者：** 那他們的 build time 有不一樣嗎？
**Gemini：** 是的，Build time 的處理方式不同。SSR 會在建構時預先準備伺服器端要執行的程式，而 CSR 主要是將客戶端套件打包。

**使用者：** 可以詳細一點，畫出流程給我看嗎？SSR 跟 CSR 的 build time 流程是什麼？要畫出差異性，而且他們在 runtime 的流程是什麼？
**Gemini：** 先看 SSR。在 Build Time 時，編譯器會預先結合程式碼與後端資料庫請求，將頁面渲染成靜態 HTML。進入 Runtime 後，當使用者發送請求，伺服器端會直接回傳預先準備好的靜態 HTML 檔案，接著瀏覽器完成解析與繪製，最後掛載前端腳本完成 Hydration。（⚠️ 見重點 (t) 的更正：這段講的是 SSG 不是 SSR）
接著是 CSR。Build Time 時編譯器僅會將 React 或相關前端套件打包，生成 JavaScript 檔案，此時並沒有完整的 HTML。進入 Runtime 後，瀏覽器會先下載空的 HTML 與大量的 JavaScript，接著在客戶端由引擎解析並動態建立 DOM，最後完成頁面呈現。（✅ 這段正確）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/0b96bab2bcf0369f | 2026-08-07 查證 |
| React `renderToString` 官方文件 | https://react.dev/reference/react-dom/server/renderToString | React 19 文件，2026-08-07 查證 |
| React `hydrateRoot` 官方文件 | https://react.dev/reference/react-dom/client/hydrateRoot | 含 hydration mismatch 說明，2026-08-07 查證 |
| V8 JIT 架構（Ignition／TurboFan） | https://v8.dev/docs | 用於更正重點 (i)，2026-08-07 查證 |
| 對話原始出處（追加）〈網頁渲染的定義與範疇〉 | https://gemini.google.com/app/7a12e30998ccde0c | 對話日期 2026-08-31，2026-09-01 查證 |
| MDN — Critical rendering path（用於重點 (l) 的定義界定） | https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path | MDN 文件，2026-09-01 查證 |
| React — `lazy` 官方文件（用於重點 (o) 區分 lazy loading 與資料抓取） | https://react.dev/reference/react/lazy | React 19 文件，2026-09-01 查證 |
| 對話原始出處（追加）〈Build Time 與 Runtime 的流程差異〉 | https://gemini.google.com/app/de0c03613eb15709 | Gemini Live Flash-Lite，2026-09-06 查證 |
| Next.js — Static Rendering 與 Dynamic Rendering（用於更正重點 (t)：SSG 在 build time、SSR 在 request time） | https://nextjs.org/docs/app/getting-started/partial-prerendering | Next.js App Router 現行文件，2026-09-06 查證 |
| Next.js — Incremental Static Regeneration（ISR，用於重點 (u) 的第四列） | https://nextjs.org/docs/app/guides/incremental-static-regeneration | Next.js 現行文件，2026-09-06 查證 |
| MDN — Server-side vs client-side rendering（build/runtime 分界的中立說明） | https://developer.mozilla.org/en-US/docs/Glossary/SSR | MDN 現行版本，2026-09-06 查證 |
