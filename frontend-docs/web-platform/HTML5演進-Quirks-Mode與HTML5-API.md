---
title: HTML5 演進、Quirks Mode 與 HTML5 API（Web Platform vs Runtime）
type: topic-note
source: Gemini
tags: [gemini, html, web-platform, doctype, quirks-mode, runtime, html5-api]
sources:
  - https://gemini.google.com/app/1ac99b379fdf3193
updated: 2026-07-19
---

# HTML5 演進、Quirks Mode 與 HTML5 API（Web Platform vs Runtime）

## 重點整理

### 1. HTML 規範現況：版本號已被「Living Standard」取代
- 官方最新規範由 <mark style="background: #ADCCFFA6;">WHATWG</mark> 維護，稱為 <mark style="background: #FFF3A3A6;">HTML Living Standard</mark>，網址 <https://html.spec.whatwg.org/> 。
- W3C 在 <mark style="background: #FFB8EBA6;">2014</mark> 年發布 HTML5 正式推薦標準，後續更新到 5.1、5.2，<mark style="background: #FFB8EBA6;">最後一版在 2017 年</mark>。
- 現在 <mark style="background: #FF5582A6;">已沒有固定版本號</mark>，標準隨時滾動更新。

### 2. 新舊 `<!DOCTYPE>` 寫法差異
舊版（HTML 4.01 Strict）必須帶一長串 DTD 網址：

```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
```

- 為什麼那麼長？因為舊 HTML 基於 <mark style="background: #ADCCFFA6;">SGML</mark>，瀏覽器要下載 DTD（Document Type Definition）才知道有哪些標籤、語法是否合法。

現代 HTML5 不再基於 SGML，宣告大幅簡化：

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>現代網頁標題</title>
</head>
<body>
</body>
</html>
```

- 核心差異：<mark style="background: #BBFABBA6;">宣告簡化</mark>（只剩 `<!DOCTYPE html>`）＋ <mark style="background: #BBFABBA6;">語意化標籤</mark>（`<header>`/`<footer>`/`<article>` 取代滿滿的 `<div id="header">`）。

### 3. DOCTYPE 是「排版開關」，不是裝飾 ⭐
標準統一後，舊網站是照舊行為寫的；若瀏覽器突然全照新標準跑，舊網站會全部跑版。瀏覽器靠 `DOCTYPE` 判斷該用哪種模式：

| 模式 | 觸發條件 | 行為 |
|---|---|---|
| <mark style="background: #BBFABBA6;">標準模式</mark> | 有寫 `<!DOCTYPE html>` | 照 W3C／WHATWG 標準解析 CSS 與排版 |
| <mark style="background: #FF5582A6;">Quirks Mode（怪異模式）</mark> | 沒寫或寫錯 DOCTYPE | 模擬 1990 年代舊瀏覽器 bug 行為以向後相容 |

- 最經典災情：<mark style="background: #FFF3A3A6;">box model 算法不一樣</mark>。舊 IE 的 `width` 會把 `padding`、`border` 算進去，標準模式不算 → <mark style="background: #FF5582A6;">版面寬度全部對不上、跑版</mark>。
- 結論：<mark style="background: #FFF3A3A6;">DOCTYPE 是啟用正常排版的開關。</mark>

### 4. Runtime vs Web Platform：為什麼是兩回事
- <mark style="background: #ADCCFFA6;">JavaScript Runtime</mark>（如 Deno、Node.js）：只負責「執行 JS 程式碼」，讓 JS 能在電腦／伺服器上跑。
- <mark style="background: #ADCCFFA6;">Web Platform（瀏覽器環境）</mark>：除了有 JS 引擎，還額外提供大量 <mark style="background: #FFF3A3A6;">Web APIs</mark>（DOM、Fetch、Canvas…）。
- 差別在「提供的 API 範圍」：<mark style="background: #FF5582A6;">把含 `window`／`localStorage`／DOM 的程式碼丟去 Node/Deno 執行，會直接報錯 `window is not defined`／`localStorage is not defined`。</mark>

> [!note] Markdown → DOM 的流程印證三者關係
> Markdown 不能直接被渲染成 DOM，要先轉成 HTML：**Runtime 負責轉換邏輯，Web Platform 提供渲染／操作 DOM 的 API**，最後才把純文字變成可互動畫面。

### 5. HTML5 經典 API（瀏覽器的超能力）
| API | 做什麼 | 改變了什麼 |
|---|---|---|
| <mark style="background: #ADCCFFA6;">Canvas</mark> `<canvas>` | JS 直接繪製 2D 圖形／動畫（WebGL 可 3D） | <mark style="background: #BBFABBA6;">淘汰 Flash</mark> 做動畫與遊戲 |
| <mark style="background: #ADCCFFA6;">Web Storage</mark>（local/session） | 瀏覽器記憶體 key-value 資料 | 取代容量小（~4KB）又每次隨請求送伺服器的 Cookie；本機可存 ~5MB |
| <mark style="background: #ADCCFFA6;">Geolocation</mark> | `navigator.geolocation` 取經緯度（需同意） | 地圖／外送／叫車不必手動輸入地址 |
| <mark style="background: #ADCCFFA6;">Audio/Video</mark> `<audio>`/`<video>` | 原生影音播放與 JS 控制 | 不必再裝 RealPlayer／Flash |

### 6. 進階 API：讓網頁變身 App（PWA）
- <mark style="background: #ADCCFFA6;">History API</mark>：`pushState`/`replaceState` 改網址列但不重整 → <mark style="background: #FFF3A3A6;">React/Vue/Angular 的 SPA 路由基礎</mark>。
- <mark style="background: #ADCCFFA6;">Drag and Drop API</mark>：把桌面檔案拖進網頁、用 JS 偵測讀取。
- <mark style="background: #ADCCFFA6;">Web Workers</mark>：開背景執行緒處理耗時計算，避免單執行緒的 JS 卡死畫面。
- <mark style="background: #ADCCFFA6;">Service Worker / Cache API</mark>：當瀏覽器與網路之間的代理，攔截請求並快取 → <mark style="background: #FFF3A3A6;">離線瀏覽＋推播通知</mark>的核心。

### 追加 2026-07-19：Geolocation API、DOM 格子 vs Execution Context、渲染／排版／V8 三引擎

> 同一個 Gemini 對話（1ac99b379fdf3193）的後續回合，主題從 HTML5 API 清單延伸到「瀏覽器怎麼把標籤變成畫面的格子」與「JS 引擎怎麼執行程式碼」。本次追加重點 a–k，共 11 個。

a. <mark style="background: #ADCCFFA6;">Geolocation API</mark> 精準度優於 IP 定位：IP 只能定位到大概城市／區域，`navigator.geolocation` 能結合 GPS／Wi-Fi 基地台取得更精確的經緯度。IPv4 位址是分配給業者的伺服器或路由器，不是每台裝置，所以<mark style="background: #FF5582A6;">IPv4 沒辦法精準定位到門牌號碼</mark>。

b. 單次定位寫法：

```javascript
function getMyLocation() {
  if (!navigator.geolocation) {
    console.log("抱歉，您的瀏覽器不支援地理定位。");
    return;
  }
  navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
}
function successCallback(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy; // 精準度（公尺）
}
function errorCallback(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED: break;   // 使用者拒絕
    case error.POSITION_UNAVAILABLE: break; // GPS 收不到訊號
    case error.TIMEOUT: break;              // 逾時
  }
}
```

c. 持續追蹤位置用 `watchPosition()`（回傳 id，用 `clearWatch(id)` 關閉省電），第三參數可傳 `options`：`enableHighAccuracy`（強制開 GPS）、`timeout`、`maximumAge`（0 代表不接受快取舊位置）。<mark style="background: #FF5582A6;">Geolocation API 只能在 HTTPS 環境下運作</mark>（`http://localhost` 例外），一般 `http://` 網址下 `navigator.geolocation` 會是 `undefined`。

d. <mark style="background: #FFF3A3A6;">觀念釐清：`<video>` 標籤被瀏覽器「挖出的格子」不是 Execution Context</mark>。挖格子屬於渲染引擎的 CSS Box Model 範疇（產生 DOM 節點／Layout Object），此時 JS 都還沒開始執行；Execution Context 是 JS 引擎在**呼叫函式時**才建立的記憶體環境盒子，管的是變數、Scope、`this` 指向，兩者是完全不同層次的機制。

| 特性 | DOM 節點（格子） | Execution Context |
|---|---|---|
| 誰負責 | 渲染引擎（如 Blink） | JS 引擎（如 V8） |
| 裝什麼 | HTML 結構、CSS 樣式、標籤屬性 | 變數、`this`、Scope Chain |
| 何時建立 | 瀏覽器解析 HTML 標籤時 | 呼叫 JS 函式時 |

e. <mark style="background: #ADCCFFA6;">不只 `<video>`，幾乎所有會顯示在畫面上的元素都會被挖出格子</mark>，這套機制正式名稱是 <mark style="background: #FFF3A3A6;">CSS 盒模型（CSS Box Model）</mark>，來自 W3C 於 1996 年 CSS Level 1、1998 年 CSS2 完全確立的規範。格子分三類：

  - <mark style="background: #BBFABBA6;">區塊格子（Block Box）</mark>：`<div>`、`<h1>`、`<video>`，霸佔整行、可自由調寬高。
  - <mark style="background: #BBFABBA6;">行內格子（Inline Box）</mark>：`<span>`、`<a>`、`<strong>`，大小由文字長度決定，不能直接設固定寬高。
  - <mark style="background: #FF5582A6;">沒格子（No Box）</mark>：`<script>`、`<style>`、或 `display:none` 的元素，仍在 DOM 樹中，但排版引擎完全忽略、不留畫面空間。

f. 排版引擎（Layout Engine）與渲染引擎（Rendering Engine）**不是同一個東西，而是上下游關係**：<mark style="background: #ADCCFFA6;">渲染引擎是總框架</mark>（負責 HTML/CSS 到畫面的完整生命週期，如 Blink、WebKit），<mark style="background: #ADCCFFA6;">排版引擎是渲染引擎內部的子模組</mark>，只負責計算 CSS Box Model 的幾何尺寸與座標，不拿畫筆、只算數字。

g. 瀏覽器渲染流水線：解析（HTML→DOM 樹、CSS→CSSOM 樹）→ 結合成渲染樹 → <mark style="background: #ADCCFFA6;">排版 Layout/Reflow</mark>（排版引擎算出格子的 XY 座標與寬高）→ <mark style="background: #ADCCFFA6;">繪製 Paint</mark>（渲染引擎把顏色、文字、畫面畫成點陣圖）→ 合成 Composite（疊圖層交給 GPU）。改 `width` 會觸發 <mark style="background: #FF5582A6;">Reflow（重排，較耗效能）</mark>；只改顏色只會 <mark style="background: #BBFABBA6;">Repaint（重繪，效能較好）</mark>。

h. 渲染引擎、排版引擎、V8 引擎三方對照：

| 維度 | 渲染引擎 | 排版引擎 | V8（JS 引擎） |
|---|---|---|---|
| 核心職責 | 網頁視覺與畫面呈現 | 計算格子的幾何尺寸與位置 | 執行網頁的邏輯與程式碼 |
| 主要處理 | HTML、CSS 樣式表 | CSSOM 樹、佈局規則 | JS 語法、記憶體管理 |
| 最終產出 | 螢幕點陣圖／像素畫面 | 每個 DOM 元素的尺寸座標 | 執行結果、修改 DOM 的指令 |
| 存在關係 | 大框架，包含排版引擎 | 渲染引擎內部子階段 | 獨立大腦，透過 DOM API 溝通 |

i. 四大瀏覽器渲染引擎著名代表：<mark style="background: #ADCCFFA6;">Blink</mark>（Google，Chrome／Edge／Opera／Brave，市佔最高，Blink 當年是從 WebKit fork 出來的）、<mark style="background: #ADCCFFA6;">WebKit</mark>（Apple，Safari）、<mark style="background: #ADCCFFA6;">Gecko</mark>（Mozilla，Firefox，少數堅持不加入 Chromium 陣營的獨立引擎）、<mark style="background: #D2B3FFA6;">Trident／EdgeHTML</mark>（舊 IE／舊版 Edge，已被淘汰走入歷史）。

j. 三大 JS 引擎著名代表：<mark style="background: #ADCCFFA6;">V8</mark>（Google，內建 Chrome／Edge，也是 Node.js、Deno 的底層引擎）、<mark style="background: #ADCCFFA6;">JavaScriptCore／JSC</mark>（Apple，內建 Safari；新興工具 Bun 也選用 JSC 而非 V8）、<mark style="background: #ADCCFFA6;">SpiderMonkey</mark>（Mozilla，內建 Firefox，是 Brendan Eich 在網景寫出的世界第一款 JS 引擎的嫡系後代）。

k. 三者合作流程：渲染引擎讀 HTML 蓋骨架 → 排版引擎算每個格子尺寸 → 使用者觸發 JS，<mark style="background: #ADCCFFA6;">V8 在自己的 Execution Context 裡執行邏輯</mark> → V8 透過 DOM API 改了某元素的 `width` → 驚動排版引擎重新計算（Reflow）→ 渲染引擎重新畫面（Repaint）。一句話：渲染／排版引擎管「網頁長什麼樣」，V8 管「網頁怎麼運作」。

## 自我測驗

<details class="quiz">
<summary>是非題：沒有寫 <code>&lt;!DOCTYPE html&gt;</code> 的網頁，瀏覽器會用「標準模式」渲染。</summary>
<div class="ans">

<strong>✗ 錯。</strong> 沒寫或寫錯 DOCTYPE 會掉進 <mark style="background: #FF5582A6;">Quirks Mode（怪異模式）</mark>，模擬舊瀏覽器 bug 行為，最常見災情是 box model 算法不同造成跑版。

</div>
</details>

<details class="quiz">
<summary>填空：HTML5 之前的 DOCTYPE 之所以那麼長，是因為 HTML 基於 ____，瀏覽器要下載 ____ 才知道合法語法。</summary>
<div class="ans">

基於 <mark style="background: #ADCCFFA6;">SGML</mark>；要下載 <mark style="background: #ADCCFFA6;">DTD（Document Type Definition）</mark>。

</div>
</details>

<details class="quiz">
<summary>申論題：為什麼 <code>localStorage</code> 與 <code>document</code> 在 Node.js 跑會報錯？請用 Runtime 與 Web Platform 的差異說明。</summary>
<div class="ans">

`localStorage`、`document`、`window` 都是 <mark style="background: #FFF3A3A6;">Web Platform（瀏覽器）</mark>提供的 API，不屬於 JS 語言本身。Node.js／Deno 是 <mark style="background: #ADCCFFA6;">Runtime</mark>，只內建 JS 引擎執行語言層的程式碼，不提供瀏覽器 Web APIs，所以存取這些物件會得到 `is not defined`。

</div>
</details>

## 各對話來源

### JavaScript, CSS, React 互動測驗（標題自動命名，實為 HTML5／Web Platform 概念）（2026-06）— https://gemini.google.com/app/1ac99b379fdf3193

<div class="srcline"><span class="u">使用者：</span>給我一個官方網址。</div>
<div class="srcline"><span class="g">Gemini：</span>目前最新 HTML 規範是 WHATWG 維護的 HTML Living Standard，網址 https://html.spec.whatwg.org/ 。</div>
<div class="srcline"><span class="u">使用者：</span>那 HTML5 最後一年是什麼時候更新的？</div>
<div class="srcline"><span class="g">Gemini：</span>HTML5 概念已被取代。W3C 2014 發布 HTML5 正式推薦，之後 5.1、5.2，最後一版 2017。現在用 WHATWG 的 Living Standard，無固定版本號、隨時更新。</div>
<div class="srcline"><span class="u">使用者：</span>那以前的版本 HTML5 要怎麼寫？</div>
<div class="srcline"><span class="g">Gemini：</span>（投影片問答）舊 HTML4.01 的 DOCTYPE 要帶 DTD 網址，因基於 SGML，瀏覽器要下載 DTD 才知合法標籤；現代只要 `<!DOCTYPE html>`，並改用語意化標籤。</div>
<div class="srcline"><span class="u">使用者：</span>標準統一後，舊網站照舊行為寫，瀏覽器靠 doctype 判斷新舊：有寫照標準解析，沒寫／寫錯掉進 quirks mode（box model 算法不同造成跑版），所以 doctype 是排版開關不是裝飾，對吧？</div>
<div class="srcline"><span class="g">Gemini：</span>完全正確，這正是控制瀏覽器以標準模式渲染的關鍵開關。</div>
<div class="srcline"><span class="u">使用者：</span>為什麼 runtime 跟 web platform 是不同的東西？Deno 是 JS 的 runtime。</div>
<div class="srcline"><span class="g">Gemini：</span>Runtime（Deno/Node）只負責執行 JS；Web Platform（瀏覽器）除了 JS 引擎還提供 DOM、Fetch、Canvas 等 Web APIs，差別在 API 範圍。</div>
<div class="srcline"><span class="u">使用者：</span>不對，我有個主題是把 markdown 渲染為 DOM；markdown 不能直接渲染成 DOM，要先轉成 HTML，這三種東西…</div>
<div class="srcline"><span class="g">Gemini：</span>正確，Markdown 要先轉 HTML，瀏覽器再解析建 DOM 樹。Runtime 負責轉換邏輯，Web Platform 提供渲染／操作 DOM 的 API。</div>
<div class="srcline"><span class="u">使用者：</span>HTML5 API 有哪一些？</div>
<div class="srcline"><span class="g">Gemini：</span>（投影片）經典四大：Canvas（淘汰 Flash）、Web Storage（取代 Cookie 做本機儲存）、Geolocation、Audio/Video；進階：History API（SPA 路由基礎）、Drag and Drop、Web Workers（背景執行緒）、Service Worker/Cache API（離線＋推播）。並提醒這些 API 拿到 Deno/Node 會噴 `window is not defined`／`localStorage is not defined`。</div>

#### 追加 2026-07-19 回合（同一對話）

<div class="srcline"><span class="u">使用者：</span>GeoLocation API 会比 IP 位置还要精确吗？IPV4 最新可以到门牌吗？给我 gelocation 的写法。</div>
<div class="srcline"><span class="g">Gemini：</span>Geolocation API 比 IP 精準（結合 GPS/Wi-Fi）；IPv4 定位不到門牌號碼。附上 `getCurrentPosition`／`watchPosition` 完整寫法與 HTTPS 限制。整合進上方「追加」第 a–c 點。</div>
<div class="srcline"><span class="u">使用者：</span>&lt;video&gt; 挖好的格子是 execution context 嗎？這個格子概念是從哪裡來的？</div>
<div class="srcline"><span class="g">Gemini：</span>不是。格子是 DOM 節點／CSS Box Model，屬於渲染引擎；Execution Context 是 JS 引擎呼叫函式時才建立的環境盒子。CSS 盒模型源自 1996 年 CSS1、1998 年 CSS2，W3C 規範。整合進第 d–e 點。</div>
<div class="srcline"><span class="u">使用者：</span>排版引擎跟渲染引擎不同嗎？請比較渲染引擎、排版引擎跟 V8。這三個引擎有著名的工具名稱嗎？</div>
<div class="srcline"><span class="g">Gemini：</span>渲染引擎是總框架，排版引擎是其內部子模組，V8 是獨立的 JS 引擎。附完整流水線（Parsing→Layout→Paint→Composite）與四大瀏覽器引擎（Blink/WebKit/Gecko/Trident）、三大 JS 引擎（V8/JSC/SpiderMonkey）對照。整合進第 f–k 點。</div>

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Geolocation API | https://developer.mozilla.org/zh-TW/docs/Web/API/Geolocation_API | Gemini 對話內回覆，查證日 2026-07-19 |
| CSS 盒模型（MDN 圖文指南） | https://developer.mozilla.org/zh-TW/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model | Gemini 引用，查證日 2026-07-19 |
| CSS 盒模型 W3C 最新規範 | https://www.w3.org/TR/css-box-3/ | Gemini 引用，查證日 2026-07-19 |
| CSS2 盒模型歷史文獻 | https://www.w3.org/TR/CSS2/box.html | 1998 年 CSS2 規範，Gemini 引用 |
| 本篇對話來源 | https://gemini.google.com/app/1ac99b379fdf3193 | 對話截至 2026-07-19 |
