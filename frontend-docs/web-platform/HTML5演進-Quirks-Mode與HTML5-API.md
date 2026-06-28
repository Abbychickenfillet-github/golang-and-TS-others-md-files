---
title: HTML5 演進、Quirks Mode 與 HTML5 API（Web Platform vs Runtime）
type: topic-note
source: Gemini
tags: [gemini, html, web-platform, doctype, quirks-mode, runtime, html5-api]
sources:
  - https://gemini.google.com/app/1ac99b379fdf3193
updated: 2026-06-28
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
| <mark style="background: #ADCCFFA6;">Web Storage</mark>（local/session） | 瀏覽器內存 key-value 資料 | 取代容量小（~4KB）又每次隨請求送伺服器的 Cookie；本機可存 ~5MB |
| <mark style="background: #ADCCFFA6;">Geolocation</mark> | `navigator.geolocation` 取經緯度（需同意） | 地圖／外送／叫車不必手動輸入地址 |
| <mark style="background: #ADCCFFA6;">Audio/Video</mark> `<audio>`/`<video>` | 原生影音播放與 JS 控制 | 不必再裝 RealPlayer／Flash |

### 6. 進階 API：讓網頁變身 App（PWA）
- <mark style="background: #ADCCFFA6;">History API</mark>：`pushState`/`replaceState` 改網址列但不重整 → <mark style="background: #FFF3A3A6;">React/Vue/Angular 的 SPA 路由基礎</mark>。
- <mark style="background: #ADCCFFA6;">Drag and Drop API</mark>：把桌面檔案拖進網頁、用 JS 偵測讀取。
- <mark style="background: #ADCCFFA6;">Web Workers</mark>：開背景執行緒處理耗時計算，避免單執行緒的 JS 卡死畫面。
- <mark style="background: #ADCCFFA6;">Service Worker / Cache API</mark>：當瀏覽器與網路之間的代理，攔截請求並快取 → <mark style="background: #FFF3A3A6;">離線瀏覽＋推播通知</mark>的核心。

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
