---
title: CSR 的初始 DOM 只有一個空 div#root — DOM 在哪一刻建立、又被誰按暫停
type: topic-note
source: Gemini
category: 技術
tags: [gemini, csr, dom, html-parsing, domcontentloaded, onload, render-blocking, cssom, spa, 白屏]
sources:
  - https://gemini.google.com/app/f6b5fdfb1d51c86f
related:
  - "[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]"
  - "[[SPA架構-入口點-CSR客戶端效能與狀態-部署]]"
  - "[[SPA現況-為何說不流行了-與SSR-SSG混合架構]]"
  - "[[script載入方式+前因後果]]"
  - "[[如何寫入口檔-index-js-main-tsx]]"
updated: 2026-09-21
---

# CSR 的初始 DOM 只有一個空 div#root — DOM 在哪一刻建立、又被誰按暫停

本篇重點 a–m，共 13 個

> 關聯原因：[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]] 拆的是「bytes 怎麼變成 DOM」這條流水線的內部機制；這篇問的是<mark style="background: #FFF3A3A6;">「那 CSR 的畫面到底是在哪一格才長出來」</mark>，答案剛好落在那條流水線跑完之後的第 4、5 格。
> 	[[SPA架構-入口點-CSR客戶端效能與狀態-部署]] 講的則是為什麼入口 HTML 會長成「一個空 div 加一支 script」的樣子，三篇是同一件事的三個切面。

---

## 一、主軸圖：六格時間軸

![[學習前端_圖解_CSR初始DOM只有空div-root到畫面長出來的六格時間軸_2026-09-21.svg]]

（a）上半是時間軸的五格，下半是第 2 格「HTML Parsing」的放大圖與兩個阻塞點。之後追問 CSR、白屏、hydration 的時機問題，請直接指回這張圖的第幾格。

---

## 二、先回答那句問題：DOM 連建都還沒開始建嗎

（b）分三段看，答案不一樣：

| 時間點 | DOM 的狀態 |
| --- | --- |
| 送出 HTTP 請求到收完 response body 之前 | <mark style="background: #FF5582A6;">一個節點都沒有</mark>，瀏覽器手上只有還沒解碼的 bytes |
| HTML Parsing 進行中 | <mark style="background: #ADCCFFA6;">邊解析邊建</mark>，讀到多少 HTML 就先蓋出多少 DOM 分枝 |
| HTML Parsing 結束 | DOM 樹完整建好，瀏覽器觸發 `DOMContentLoaded` |

（c）<mark style="background: #FFF3A3A6;">關鍵觀念：DOM 不是「等整份 HTML 全部下載完才一次建好」，而是增量式（incremental）建構。</mark>

（d）所以「HTML parsing 之後才有 DOM 對嗎」的精確版本是：<mark style="background: #BBFABBA6;">HTML Parsing 進行中 DOM 就開始逐步建立，Parsing 結束時 DOM 樹才算完整建立。</mark>

---

## 三、Parser 的四步流水線

（e）誰對誰做什麼，一句話串完：<mark style="background: #BBFABBA6;">瀏覽器的 HTML Parser 先依 charset 把 bytes 轉成字元（Conversion），再把字元串流拆成一個個 tag token（Tokenization），接著把 token 實體化成 Node 物件（Lexing），最後把 Node 依巢狀關係掛上 DOM 樹（Tree Construction），產物就是一棵可以被 JS 操作的 DOM。</mark>

| 步驟 | 輸入 | 產物 |
| --- | --- | --- |
| Conversion | 原始 bytes | 依指定編碼（通常是 UTF-8）解出的字元 |
| Tokenization | 字元串流 | tag token，例如 `<html>`、`<body>`、`<div>` |
| Lexing | token | Node 物件 |
| Tree Construction | Node 物件 | DOM 樹 |

---

## 四、誰會把 DOM 的建立按下暫停

（f）<mark style="background: #FF5582A6;">同步 script（`<script src="app.js">`，沒寫 `async` 也沒寫 `defer`）</mark>：Parser 讀到這一行就立刻停下來，必須先下載並執行完這支 JS，才會繼續往下解析 HTML。
	原因是 JS 有可能呼叫 `document.write()` 去改變 DOM 結構，Parser 不敢先往下走。

（g）<mark style="background: #FF5582A6;">CSS 間接卡住 JS</mark>：如果 script 前面有 `<link rel="stylesheet">`，那支 script 必須等 CSSOM 建立完成後才能執行。
	因為 JS 可能會去讀元素的樣式（例如 `getComputedStyle`），樣式沒算完就讀會拿到錯的值。
	結果是 DOM 的建立被間接拖延。

（h）怎麼知道 DOM 建好了沒：

| 事件 | 代表什麼 | 還沒完成什麼 |
| --- | --- | --- |
| `DOMContentLoaded` | HTML 已完全解析完成，DOM 樹完整建立 | 圖片、樣式表等外部資源可能還在載 |
| `window.onload` | DOM 樹建好，且所有圖片、樣式表等資源都載完 | — |

---

## 五、回到 CSR：畫面是在第 5 格才長出來

（i）CSR 的入口 HTML 通常長這樣，全部內容只有一個空容器加一支 script：

```html
<body>
  <div id="root"></div>
  <script src="/assets/bundle.js"></script>
</body>
```

（j）順序是：
	1. <mark style="background: #ADCCFFA6;">HTML Parsing 完畢</mark>，瀏覽器建好了初始 DOM，但裡面只有空的 `<div id="root"></div>` 與那個 `<script>` 標籤。
	2. 瀏覽器下載並執行 `bundle.js`（React 或 Vue 的程式碼）。
	3. JS 執行後用 `document.createElement()`，或透過框架的 Virtual DOM 渲染機制，把按鈕與文字等真正的內容動態塞進那個空的 `div#root` 裡面。

（k）<mark style="background: #FFF3A3A6;">所以 CSR 的初始 DOM 雖然「已經解析完畢」，但裡面還沒有畫面上的任何元件節點。</mark>這兩件事常被混為一談：DOM 存在 ≠ 畫面有東西。

（l）<mark style="background: #D2B3FFA6;">白屏（blank screen）就發生在圖上的第 4 格</mark>：DOM 已經建好、`DOMContentLoaded` 也早就觸發了，但 bundle 還在下載或執行，使用者看到的是一片空白。這正是 SSR 與 SSG 想解決的痛點——把「有內容的 HTML」提前到第 3 格就交給瀏覽器。

（m）延伸對照舊圖：[[SPA現況-為何說不流行了-與SSR-SSG混合架構]] 那篇裡的 `圖解_CSR-SSR-SSG的HTML在哪一刻長出來_2026-09-06.svg` 是同一條時間軸的三種渲染策略版本，可以直接疊著看。

![[圖解_CSR-SSR-SSG的HTML在哪一刻長出來_2026-09-06.svg]]

---

## 六、⚠️ 存疑／更正

<mark style="background: #FF5582A6;">⚠️ Gemini 在四步流水線裡把第三步叫做 “Lexing”，這個用詞不精確。</mark>
	在編譯器術語裡 lexing（詞法分析）指的就是 tokenization 本身，兩者是同義詞，不該拆成前後兩步。
	HTML 規範的官方分法是兩個階段：**tokenization**（產生 token）與 **tree construction**（依 insertion mode 把 token 組成樹），中間沒有一個叫 lexing 的獨立步驟。
	這篇沿用 Gemini 的四格是為了對照原文，但<mark style="background: #BBFABBA6;">面試時請講規範的兩階段版本</mark>，細節見 [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]。

---

## 七、各對話來源（原文）

### CSR 渲染與 DOM 差異解析（2026-09-21 擷取）— https://gemini.google.com/app/f6b5fdfb1d51c86f

使用者：DOM 連建都還沒開始建嗎？

Gemini：對，伺服器剛傳過來的那一刻，DOM 樹裡面只有那個空的 `<div id="root"></div>`。這時候 JavaScript 檔案（bundle.js）可能才剛下載完或剛要執行，React／Vue 等框架都還沒開始運作去建立 DOM 節點。在網頁渲染的生命週期中，HTML 解析（Parsing）開始之前，DOM 完全還不存在；而在 HTML 解析過程中，DOM 則是「一邊解析、一邊逐步建立」。

DOM 建立的完整時機點：（1）完全還沒開始建（發送請求到收到回應）——當瀏覽器剛發送 HTTP 請求，或者正在接收伺服器回傳的原始 Byte 數據時，DOM 連一個節點都還沒有。（2）開始邊讀邊建（HTML Parsing 階段）——一旦瀏覽器的 HTML Parser 收到第一批 Byte 資料，它就會立即啟動，並且增量式（Incremental）地建立 DOM：Conversion（轉碼，將 Byte 根據指定編碼轉為 UTF-8 字符）、Tokenization（標記化，將字符拆解成 Tag Token）、Lexing（樹狀結構化，將 Token 轉為 Node 物件）、DOM Construction（將 Node 掛載到 DOM 樹上）。重點：DOM 不是等整份 HTML 全部下載完了才一次建好，而是收到多少 HTML，就先蓋出多少 DOM 樹分枝。

什麼情況會阻礙或暫停 DOM 建立：同步 JavaScript（`<script>` 無 async／defer）——當 Parser 讀到 `<script src="app.js">` 時，DOM 的建立會立刻暫停，瀏覽器必須先下載並執行完該 JS，才會繼續往下解析 HTML 並建立剩餘的 DOM（因為 JS 可能會有 `document.write()` 改變 DOM 結構）；CSS 阻塞 JS（CSSOM 未完成）——如果 JS 前面有 `<link rel="stylesheet">`，JS 必須等待 CSSOM 建立完成後才能執行，這間接導致 DOM 建立被拖延。

如何確認 DOM 建好了沒：`DOMContentLoaded` 事件觸發代表 HTML 已完全解析完成、DOM 樹已完整建立（但圖片、CSS 等外部資源可能還沒載入完）；`window.onload` 事件觸發代表 DOM 樹建立完成，且所有圖片、樣式表等資源也都載入完畢。

使用者：HTML parsing 之後才有 DOM 對嗎？

Gemini：是的，精確來說是「HTML Parsing 進行中，DOM 就開始逐步建立；Parsing 結束時，DOM 樹才算完整建立」。（1）Parsing 進行中（邊解析邊建 DOM）：瀏覽器收到 HTML 檔案後，HTML Parser 一邊讀取語法，一邊把標籤轉換成 DOM 節點——讀到 `<html>` 標籤就在 DOM 樹建立 html 節點，讀到 `<body>` 建立 body 節點，讀到 `<div id="root">` 建立 div#root 節點。（2）HTML Parsing 結束（DOM 樹建構完畢）：當 Parser 把最後一個 HTML 標籤讀完時，完整的 DOM 樹就建好了，這時候瀏覽器會觸發 `DOMContentLoaded` 事件。

回到 CSR 的情況：HTML Parsing 完畢時，瀏覽器建立好了初始 DOM，但裡面只有空的 `<div id="root"></div>` 與一個 `<script src="bundle.js">` 標籤；接著下載並執行 JS（例如 React／Vue 程式碼）；JS 執行後使用 `document.createElement()` 或框架的 Virtual DOM 渲染機制，把按鈕、文字等真正的內容動態塞進那個空的 `<div id="root">` 裡面。所以，CSR 的初始 DOM 雖然已經解析完畢，但裡面還沒有畫面上的各種元件節點。

---

## 八、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| HTML 規範的 parsing 兩階段（tokenization／tree construction） | https://html.spec.whatwg.org/multipage/parsing.html | WHATWG HTML Living Standard，2026-09-21 查證 |
| 渲染阻塞與 script 的 async／defer | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script | MDN，2026-09-21 查證 |
| DOMContentLoaded 與 load 的差別 | https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event | MDN，2026-09-21 查證 |
| 關鍵渲染路徑（Critical Rendering Path） | https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path | MDN，2026-09-21 查證 |
| Gemini 對話原文 | https://gemini.google.com/app/f6b5fdfb1d51c86f | 2026-09-21 擷取 |
