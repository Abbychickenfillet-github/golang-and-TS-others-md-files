---
title: Web Worker、網路執行緒、ESM 原生載入與 Ajax 現況
type: topic-note
source: Gemini
tags: [gemini, web-worker, esm, ajax, browser]
sources:
  - https://gemini.google.com/app/c348a65efec477ce
  - https://gemini.google.com/app/61d2efdc297715a5
  - https://gemini.google.com/app/9fd87c7577a347de
updated: 2026-11-05
---

# Web Worker、網路執行緒、ESM 原生載入與 Ajax 現況

本篇重點 a–l，共 12 個

## 重點整理

### 一、Web Worker（對話 Web Worker 環境限制）

(a) <mark style="background: #FFF3A3A6;">Web Worker 跑在獨立於 window 的背景執行緒</mark>，所以<mark style="background: #FF5582A6;">沒有 window 也沒有 document</mark>，不能直接操作 DOM。
(b) Worker 與主執行緒的溝通流程：主執行緒呼叫 `worker.postMessage(data)` 把資料交給 Worker → Worker 在背景計算（也可以用 `fetch()` 抓資料）→ Worker 呼叫 `postMessage(result)` 把結果傳回 → 主執行緒收到後自己更新 document。
(c) 為什麼需要：瀏覽器的 JS 預設單執行緒，主執行緒同時負責渲染與使用者互動，若一項運算花 3 秒，畫面會凍結。Worker 就是把重運算搬去背景的「工讀生」。
(d) 適用情境：大數據運算、大型圖片壓縮或影片轉檔、Excel 解析、AI 推論與加解密、背景輪詢與 WebSocket。
(e) <mark style="background: #ADCCFFA6;">XMLHttpRequest</mark> 出現在 MDN 的 Worker 文件，是因為 Worker 規格比 fetch 早出現，現在 Worker 內已可使用 `fetch()`。

### 二、網路執行緒與 Web API（對話 JS 標籤阻塞問題）

(f) DevTools 網路瀑布圖：<mark style="background: #BBFABBA6;">綠色 = 等待伺服器回應（TTFB，首位元組時間）</mark>，<mark style="background: #ADCCFFA6;">藍色 = 下載內容的傳輸時間</mark>。timing 分頁可看各階段耗時。
(g) 瀑布圖上的「1.48s」是從開始錄製算起的第 1.48 秒，不是時鐘的 1 點 18 分。
(h) 當瀏覽器 parse HTML 遇到 `<script src="app.js">`，主執行緒把下載任務交給<mark style="background: #FFF3A3A6;">網路執行緒（Network Thread）</mark>，由它負責 HTTP 請求、TCP/IP 與 SSL 握手，主執行緒不必空等。
(i) <mark style="background: #ADCCFFA6;">Web API</mark> 是瀏覽器提供給 JS 呼叫的介面（`fetch`、`setTimeout`、DOM、`localStorage`）。兩者關係：網路執行緒是底層的「運輸部門」，Web API 是 JS 用來聯絡各部門的「窗口」。`fetch()` 觸發後，底層請網路執行緒發送請求，抓完再把結果丟回事件佇列。

### 三、ES Module 與 Ajax（對話 結束對話）

(j) <mark style="background: #FFF3A3A6;">ES Modules 讓腳本在瀏覽器原生運行</mark>：Safari 10.1（2017-03）、Chrome 61（2017-09）先後支援 `<script type="module">`，不再需要 Webpack、Browserify、RequireJS 把檔案打包。
   ⚠️ 存疑／更正：Gemini 說 Firefox 60 在「2018 年初」支援，Firefox 60 實際約 2018 年 5 月釋出，請以 MDN 相容表為準。
(k) ESM 與進程的關係：沒有新增進程類型。`type="module"` 預設 `defer`（不阻塞渲染）→ 網路進程對每個 import 發獨立請求 → 渲染進程的 V8 因 import/export 是靜態的，能在執行前先建好依賴樹。模組預設<mark style="background: #FF5582A6;">嚴格模式</mark>，且跨網域載入受 CORS 限制。
(l) Ajax 還有人用：<mark style="background: #ADCCFFA6;">AJAX（Asynchronous JavaScript and XML）</mark>的概念（不重新整理就向伺服器要資料並局部更新）已是標準，但 XML 已被 JSON 取代，寫法改用 `fetch`、Axios、TanStack Query、SWR。

## 各對話來源

### Web Worker 環境限制（2026-11-05 讀取）— https://gemini.google.com/app/c348a65efec477ce

使用者：所以是什麼環境 document嗎？我記得node.js沒有window也沒有document
Gemini：Web Worker 中的 JavaScript 運行在獨立於 window 的執行緒環境，因此裡面也沒有 document 物件，需透過 postMessage() 傳回主執行緒再更新 document。
使用者：但現在比較少用XMLHttpRequest了？所以到底何謂使用web worker
Gemini：現代已改用 fetch() 或 Axios；使用 Web Worker 就是把吃重的任務搬到背景執行緒，避免主執行緒卡死（詳見上方 a–e）。

### JS 標籤阻塞問題（2026-11-05 讀取）— https://gemini.google.com/app/61d2efdc297715a5

使用者：藍色和綠色分別是什麼？　→　Gemini：綠色是 TTFB，藍色是下載時間。
使用者：我看它等待的時候是從 1 點 18 分。　→　Gemini：是第 1.48 秒進入排隊狀態。
使用者：wikilink-index.json　→　Gemini：約 3 秒多開始載入，排隊後順利下載完成。
使用者：是由網路執行緒去下載JS？何謂網路執行緒 Web API嗎　→　Gemini：是，由網路執行緒負責下載；Web API 是 JS 呼叫瀏覽器功能的介面（詳見 f–i）。

### 結束對話（2026-11-05 讀取）— https://gemini.google.com/app/9fd87c7577a347de

使用者：Es module跟網頁瀏覽器的進程有什麼關係　他是可以讓腳本在瀏覽器原生運行嗎 2017年
Gemini：是，2017 年前後主流瀏覽器陸續支援 `<script type="module">`（詳見 j–k）。
使用者：Ajax還有人在用嗎
Gemini：還有，只是改叫 Fetch / Axios / 框架資料層（詳見 l）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Web Workers API | [MDN Web Workers API](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API) | 官方文件，未於本次重新抓取，請自行核對版本 |
| script type=module | [MDN script 元素](https://developer.mozilla.org/zh-TW/docs/Web/HTML/Element/script) | 官方文件，未於本次重新抓取 |
| Chrome 網路面板 | [Chrome DevTools Network](https://developer.chrome.com/docs/devtools/network/reference) | 官方文件，未於本次重新抓取 |
| 三篇對話原文 | 見 frontmatter sources | Gemini 對話，2026-11-05 讀取 |

相關筆記：[[事件循環-Event-Loop-微任務與巨任務]]（網路與主執行緒如何拋回事件佇列）、[[ESM模組作用域-為何不需要IIFE-與傳統Script對比]]（ESM 的作用域與嚴格模式）、[[V8與libuv協同工作原理-非同步IO]]（執行緒分工的同類概念）。
