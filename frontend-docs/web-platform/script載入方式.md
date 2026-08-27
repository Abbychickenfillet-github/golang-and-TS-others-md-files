---
title: "HTML 解析（Run-time）與 <script> 六種載入模式（同步／defer／async／body 結尾／module／Ajax）"
type: topic-note
source: Gemini
tags: [html, html-parsing, dom-tree, script-loading, defer, async, es-module, ajax, 阻塞解析, parser-blocking, main-thread, runtime]
related:
  - "[[作用域-scope-global-function-block]]"
  - "[[Markdown-渲染為DOM的過程]]"
  - "[[機器碼與bytecode的差異]]"
  - "[[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]"
  - "[[00-V8引擎完整管線-Parse到Deoptimization]]"
  - "[[SPA架構-入口點-CSR客戶端效能與狀態-部署]]"
sources:
  - https://share.gemini.google/BijtuQltf0i9
updated: 2026-08-11
quiz: script載入方式-sync-defer-async.html
---

# HTML 解析（Run-time）與 `<script>` 六種載入模式

> 主軸互動圖：`script載入方式-sync-defer-async.html`（純文字→Parsing→DOM 動畫＋三種載入時間軸＋自我測驗）。後續追問優先指回那張圖的某個步驟。
>
> 素材：(1) Gemini Flash「什麼是 HTML 解析（Run-time）」；(2) 手寫「script 載入模式大表格」（蓋房子／買說明書／看說明書）。

**本篇重點 (a)–(q)，共 17 個。**
字母只給「真正並排、彼此獨立」的重點；同一個重點底下的延伸說明**不另給字母**（例如「多個 async 不保證順序的例子」是 async 的延伸，跟著 (e)，不另立字母）。六種 script 模式是並排關係，所以 (d)–(i) 各佔一個。

---

## 🧩 一、HTML 解析（HTML Parsing，發生在 Run-time）

### (a) 瀏覽器拿到的 `index.html` 是純文字，必須 Run-time 用 CPU 把它 Parse 成 DOM 樹

一條主線，底下都是它的延伸：

- **收到的是純文字字串**：伺服器把 `index.html` 丟過來，瀏覽器當下拿到的不是「網頁」，而是一整條純文字 `<!DOCTYPE html><html>…<div id="root">…</div>…`。對電腦來說，`<div>` 一開始只是 5 個字元，不是「可設寬高、可掛事件的物件」。
- **瀏覽器看不懂字串**：字串沒有父子關係、沒有屬性物件、沒有方法可呼叫，不能拿來排版/渲染/掛事件。所以一定要有一個**轉換步驟**＝ **HTML Parsing**。（同源觀念：[Markdown-渲染為DOM的過程](Markdown-渲染為DOM的過程.md)——`.md` 也要先轉成 HTML 字串才有戲。）
- **發生在 Run-time、用使用者的 CPU**：這個解析不是在伺服器先做好，而是**使用者打開網頁那一刻，在他自己的裝置、用他的 CPU** 現場一個字元一個字元讀過去、蓋出結構。→ HTML 越長、節點越多，弱裝置首屏越卡。
- **產物是記憶體裡的 DOM 樹**：解析器在主執行緒上把字串讀成一棵樹（`<html>` 為根，掛 `<head>`/`<body>`，再掛 `<div>`/`<p>`…）。
<mark style="background: #FFF3A3A6;">- **最具體的一句**：解析器讀到 `<div>` 這段**文字**，就在記憶體 `new` 出一個 **`HTMLDivElement`** 物件（繼承鏈 `HTMLDivElement`→`HTMLElement`→`Element`→`Node`）。物件才有 `.style`、`.className`、`.appendChild()`、`.addEventListener()`。**字串裡的 `<div>` 選不到也操作不動；變成物件、掛上 DOM 樹後，CSS 才選得到、JS 才操作得動。**</mark>
- **⚠️ 做這件事的是誰？是瀏覽器的「HTML 解析器（渲染引擎，Chrome 是 Blink）」，不是 V8**：V8 是 **JavaScript 引擎、只處理 JS**。把 HTML 字串變 DOM 樹跟 V8 無關；V8 是**另一條線**（JS→AST→bytecode→機器碼，見 (q)）。**HTML 永遠不會進 V8、不會變成 AST／bytecode。** 兩者都在主執行緒上用 CPU，但是兩個不同元件。

| 解析前（純文字） | 解析後（記憶體物件） | 差別 |
|---|---|---|
| `<div>` 這 5 個字元 | 一個 `HTMLDivElement` 物件 | 有 `.style`、`.appendChild()`、`.addEventListener()` |
| `<p>Hi</p>` 這段字元 | `HTMLParagraphElement` ＋ 底下 `Text("Hi")` | 有父子關係，CSS 選得到、JS 操作得動 |

### (b) 主執行緒（Main Thread）只有一條——全篇的關鍵限制

**HTML 解析、DOM 建構、CSS 計算、畫面渲染、JS 執行，全部共用同一條主執行緒**，同一瞬間只能跑一件事。所以主執行緒在跑 JS 時，HTML 解析**得先停住**；反之亦然。這就是後面所有載入策略要處理的核心矛盾：**JS 執行會搶那條唯一的主執行緒，一搶，蓋房子（解析）就得暫停。**

延伸（「把控制權交給 JS 引擎」是真的執行緒層級的交接）：遇到會 blocking 的 `<script>` 時——① 解析器（在主執行緒）自己暫停；② 主執行緒轉交 **V8**，把 JS Parse 成 AST→編譯 bytecode→執行（下一步見 [機器碼與bytecode的差異](../../build-and-compilation/機器碼與bytecode的差異.md)、[00-V8引擎完整管線-Parse到Deoptimization](../javascript/JS_Core_and_Runtime/00-V8引擎完整管線-Parse到Deoptimization.md)）；③ V8 跑完把主執行緒還給解析器，從暫停處繼續。**注意：真正只有一條的是主執行緒；下載（fetch，網路 I/O）走獨立網路執行緒、不占主執行緒**——所以「下載 JS」能跟「蓋房子」同時進行，會打架的永遠是「執行 JS」。

---

## 🏠 二、一組比喻串起全篇：蓋房子／買說明書／看說明書

### (c) 三個階段用比喻分開，全篇沿用

| 比喻 | 真實動作 | 占用資源 | 會不會卡畫面 |
|---|---|---|---|
| 🏠 蓋房子 | 解析 HTML、蓋 DOM 樹 | 主執行緒（唯一） | 這就是在畫骨架 |
| 📖 買說明書 | 下載 JS 檔（從網路抓 `.js`） | 網路執行緒（背景，不占主緒） | 不會，可邊蓋邊買 |
| 👓 看說明書 | 執行 JS（V8 跑起來、操作 DOM） | 主執行緒（唯一） | **會**，一看就得停下蓋房子 |

三種策略的差別可翻成一句話：**「買說明書」要不要打斷蓋房子？「看說明書」要在蓋房子的哪個時間點插進來？**
一般 `<script>`＝停在原地買＋馬上看完再繼續；`async`＝邊蓋邊背景買、**書一到就停手看完**；`defer`＝邊蓋邊背景買、**書先放著等整棟蓋完才看**。

---

## 🏷️ 三、六種 `<script>` 載入模式（並排關係，各佔一個字母）

> 表格儲存格一律純文字（house rule：表格內不放 wikilink）。
**「表格『蓋房子時下載不中斷』的主詞是各個 script 標籤?」——對。** 每一列的主詞＝**那種 `<script>` 標籤/載入方式**;「HTML 解析時」那欄＝瀏覽器**由上而下、解析到它那一刻**會不會中斷。

| 模式                       | 🏠 解析時（蓋房子）         | 📖 下載（買說明書）       | 👓 執行（看說明書）      | 順序保證      | 典型場景／框架                           |
| ------------------------ | ------------------- | ----------------- | ---------------- | --------- | --------------------------------- |
| `<script>`（一般，`<head>`）  | **中斷**（Blocking）    | 讀到當下才抓，主緒空等       | 抓完**立刻**執行，才續解析  | 按出現順序     | 早期網頁；現代少用                         |
| `<script async>`         | 下載不中斷；執行插隊中斷        | 背景平行下載            | **抓完立刻插隊執行**     | **不保證**   | GA、廣告、Next.js `lazyOnload`        |
| `<script defer>`         | **不中斷**             | 背景平行下載            | **等 DOM 蓋完才執行**  | **保證**按順序 | 需操作 DOM 的主程式；CRA／Webpack          |
| `<script>` 放 `</body>` 前 | 讀到時前面 DOM 幾乎蓋好      | 讀到才抓（本質仍一般）       | 抓完立刻執行           | 按出現順序     | 傳統 SPA 自動注入位置                     |
| `<script type="module">` | **不中斷**（預設等同 defer） | 背景平行下載，遞迴抓 import | 等解析完才執行          | 保證        | Vite／原生 ES Module 主流              |
| Ajax／`fetch()`／`axios`   | 與載入解析**無關**         | JS 跑起來後主動抓「資料」    | 資料回來進 Event Loop | 由程式邏輯決定   | React `useEffect`、React Query／SWR |

**關於這張表的主詞與「位置」**：每一列的主詞＝**那種 `<script>` 標籤/載入方式**；「HTML 解析時」欄＝瀏覽器**由上而下、解析到它那一刻**會不會中斷。位置規則：**`async`/`defer` 只對「有 `src` 的外部 script」有效**（inline 加了沒用）；慣例放 `<head>`（邊解析邊背景下載最划算），放 `<body>` 裡也行、但 `defer` 放 body 尾就沒意義；**別放在 `</body>` 之後**（body 外是不合規 HTML，瀏覽器會塞回 body）。

### (d) 一般 `<script>`（預設，`<head>`）：中斷解析、立即執行、Blocking

「站在原地買說明書＋馬上看完」：解析器讀到就暫停，把主緒交給 V8 下載＋執行，跑完才續。放 `<head>` 特別糟——`<body>` 都還沒蓋，JS 要找的 DOM 還不存在，使用者盯著白畫面等（parser-blocking）。
**命名坑：別叫這個「同步 JS」**——「同步/非同步 JS」在 JS 圈更常指程式碼本身的執行模型（callback／Promise／Event Loop，見 [JavaScript-事件循環與閉包-面試核心](../javascript/JS_Core_and_Runtime/js-runtime/JavaScript-事件循環與閉包-面試核心.md)），跟「載入時機」不同層次。本篇一律用 `#阻塞解析`(parser-blocking) 稱呼它。

### (e) `<script async>`：背景下載不中斷，但抓完立刻插隊執行、不保證順序

背景網路執行緒平行下載（左側手寫補充：「利用背景執行緒達到非同步下載」），下載不打斷蓋房子；但**一抓完就搶主緒執行**，此刻 HTML 沒解析完就被打斷。適合**跟 DOM、彼此都無依賴**的獨立腳本（GA、廣告、`lazyOnload`）。
延伸（為什麼多個 async 不保證順序）：同一份 HTML 寫 `<script async src=a.js>`、`<script async src=b.js>`，規則是「誰先抓完誰先跑」，不管寫的順序。若 `b.js` 較小先抓完，就 b 先 a 後，順序隨網路浮動、每次可能不同。**若 b 依賴 a，用 async 會炸**，要嘛改 `defer`、要嘛合併成一支。

### (f) `<script defer>`：背景下載不中斷、等 DOM 蓋完才依序執行、保證順序

背景平行下載，但「書先放著」，延到整份 HTML 解析完（DOM 已蓋好）才**依 HTML 順序**執行。執行時 DOM 一定存在、多支又保證先後，**最適合當專案主程式**。CRA／Webpack 的主 bundle 常掛 `defer`。

### (g) `<script>` 放 `</body>` 前：土法煉鋼版 defer

擺最後面，讀到它時前面 DOM 幾乎都蓋好，JS 一跑就操作得到元素。本質仍是會 blocking 的一般 script，只是位置在最後、影響小；沒有「背景平行下載」的好處（讀到才抓）。

### (h) `<script type="module">`：ES Module，預設就等於 defer

Vite／原生 ES Module 預設作法。特性：① **預設就是 defer 行為**；② 依 `import` 遞迴抓相依模組、各模組只跑一次；③ 自帶嚴格模式與模組作用域（頂層變數不污染 `window`）。所以現代前端不用另加 `defer`。

### (i) Ajax／`fetch()`／`axios`：不是載「程式」，是載「資料」

跟上面五種不同層次：前五種是「如何載入並執行一支 `.js`」；Ajax 是「JS **已在跑之後**主動去後端要**資料**（多半 JSON）」。由程式邏輯觸發（React `useEffect` 一掛載就發），回來的資料進 **Event Loop** 由 callback／`await` 處理，跟解析時機脫鉤。React Query／SWR 就是把它包成 hook。

### (j) 釐清：script 載入 vs 使用者互動（doubleClick／hover／發 API）是接續的兩階段

本節 (d)–(i) 都發生在**頁面第一次載入**、瀏覽器跑開機流程時，**使用者還沒互動**。而 doubleClick／hover／發 API 是**載入完、開始互動之後**的事件驅動行為，由 Event Loop 排程（互動進 macrotask、Promise/fetch 回來進 microtask，見 [事件循環-Event-Loop-微任務與巨任務](../javascript/JS_Core_and_Runtime/事件循環-Event-Loop-微任務與巨任務.md)）。兩者唯一關聯：**載入方式決定「事件監聽器何時被註冊好」**——監聽器所在的 script 還沒跑完前，點按鈕不會有反應。

---

## 🔄 四、完整流程：React → 打包 → 純文字 → 瀏覽器解析 → DOM 樹(此為簡略流程)

### (k) build-time 做一次、run-time 每個使用者各做一次


① React 原始碼（.jsx/.tsx）
      │  build-time：Babel/SWC 轉譯 + bundle（在開發者/CI 機器上，做一次）
      ▼
② 打包產物：index.html + 一堆 .js（都是純文字 Text）
      │  伺服器把 index.html 丟給瀏覽器
      ▼
③ 瀏覽器收到「一長串純文字字串」 <!DOCTYPE html><html>…
      │  ⚠️ 瀏覽器看不懂純文字（交給渲染引擎 Blink 的 HTML 解析器，不是 V8）
      ▼
<mark style="background: #FFB8EBA6;">④ HTML Parsing（run-time，用使用者 CPU，在主執行緒上，由 Blink 做）</mark>
      ▼
⑤ <div>（文字） ──► HTMLDivElement（記憶體物件）→ 掛上 DOM 樹 → CSS 選得到、JS 操作得動


瀏覽器不認得 JSX/TS，所以 **build-time** 先轉譯打包成純文字（見 [前端開發工具-打包編譯Lint與Parser](../../build-and-compilation/前端開發工具-打包編譯Lint與Parser.md)）；「變成可操作的東西」統統延到 **run-time**（HTML→DOM、JS→AST→bytecode）。**同一份打包產物，被幾百萬使用者的 CPU 各自解析一次。**

#### build-time「打包」五步詳解（Vite 生產＝Rollup／Webpack 大致相同；每步附官方來源，來源全表在文末）

**由誰跑？** build 這步是「建置機器」跑的——你的筆電（本地 `npm run build`）或 CI 伺服器（GitHub Actions／Vercel）。**不是使用者的瀏覽器**；跑一次產出靜態檔，之後所有訪客拿到同一份。實際執行的人是 **build tool**（Vite／Webpack／Rollup）。

> Vite 的兩種模式別搞混：**`vite build`（生產）** 才做「建相依圖→bundle→最佳化」這整套，且**底層叫 Rollup 做 bundle**；
> **`vite dev`（開發）** 不做完整 bundle，改用 **esbuild** 預轉譯依賴＋**瀏覽器原生 ES Module** 直接載入原始碼（所以啟動快）。vite dev的轉譯跟壓縮工具從esbuild/oxc正在往rolldown/oxc生態系遷移(複習到此時請重新查詢)

 
下面五步講的是**生產 build**。「打包」在此＝**bundle**（步驟③）。

<mark style="background: #FFB8EBA6;">**① 找入口、建相依圖（dependency graph）**</mark>
從入口檔（webpack 預設 `./src/index.js`；Vite 是 `index.html` 指的 `main.tsx`）開始，讀它的 `import`，再打開每個被 import 的檔、讀它們的 import，一路**遞迴**，把「誰 import 誰」畫成一張圖（節點＝檔案/模組，連線＝import；圖片/字型/CSS 被 import 也是節點）。這張圖就是「到底要打包哪些檔」的依據。官方：入口點告訴 bundler「從哪開始建內部相依圖」，再遞迴收齊所有相依。

```text
main.tsx ──import──► App.tsx ──┬─import─► Header.tsx ─import─► logo.png
                               ├─import─► Home.tsx  ─import─► api.ts
                               └─import─► react（第三方庫）
```

> 💡 **hint：寫好入口檔（index.js／main.tsx）很重要。** bundler 從入口檔開始、順著 import 建圖，**沒被入口（直接或間接）import 到的檔，根本不會被打包**。入口與 import 關係要寫對，東西才會被帶進去。怎麼寫見 [如何寫入口檔-index-js-main-tsx](如何寫入口檔-index-js-main-tsx.md)。

<mark style="background: #FFF3A3A6;">**② 逐模組轉譯（transpile，原始碼→原始碼，產物仍是純文字 JS）**</mark>

```text
TS 去型別：      const n: number = 5;        →  const n = 5;
JSX→createElement：<div className="a">Hi {name}</div>
                 →  React.createElement("div", {className:"a"}, "Hi ", name)
                    （React 17+ automatic runtime 則是 _jsx("div", {...})）
新語法→目標語法： const y = a ?? b;          →  const y = a != null ? a : b;
```

<mark style="background: #D2B3FFA6;">各打包工具**用什麼做 transpile**（步驟②的實際執行者）：</mark>

| 打包工具 | transpile 用誰 |
|---|---|
| Webpack | Loader：babel-loader／ts-loader／swc-loader／esbuild-loader（可選） |
| Vite | 預設 esbuild（Vite 8 起改 Oxc）；React 用 @vitejs/plugin-react（Babel）或 plugin-react-swc（SWC） |
| Next.js | SWC（內建預設） |
| Rollup | plugin：@rollup/plugin-babel／-typescript／rollup-plugin-esbuild |

- <mark style="background: #D2B3FFA6;">**為何 Webpack 可多選 loader**</mark>：Webpack 本身不轉譯，把轉譯**外包給 loader**、設計成可插拔，讓你依需求選——
- Babel（相容性/外掛生態最強）、
- <mark style="background: #ABF7F7A6;">ts-loader（完整型別檢查）</mark>、
- <mark style="background: #ABF7F7A6;">swc-loader／esbuild-loader（快）</mark>。取捨＝速度 vs 功能/型別檢查。
  可知loader是作轉譯。
	- **為何 `@rollup/plugin-typescript` 有 dash**：只是 **npm 套件命名慣例（kebab-case 用連字號分詞）**；`@rollup/plugin-typescript` ＝ scope `@rollup` 底下叫 `plugin-typescript` 的套件，無特殊意義。

**③ bundle 合併成 chunk（<mark style="background: #FFB86CA6;">把幾百支原始模組 → 少數幾支輸出檔</mark>）**
不是永遠變成 1 支——**大方向是「大幅變少」，但 code splitting 會故意切成好幾支**。三個子動作：

| 子動作 | 做什麼 | 方向 | 限制／備註 |
|---|---|---|---|
| tree-shaking | 砍掉沒被 import 用到的 export（死碼） | 減少 | 靠 ES module 靜態分析 |
| code splitting | 切成多個 chunk 按需載入（vendor／各 route lazy chunk） | 切開 | 靠動態 import／React.lazy |
| scope hoisting | 多個 ES 模組併進同一個函式作用域，省掉每模組包裹殼 | 合併 | 只對 ES module；靠改名避免衝突 |

- <mark style="background: #FFF3A3A6;">**tree-shaking**：砍掉「沒被 import 用到的 export」（死碼）。這一步其實分兩個階段，不是一次做完：  
先是「標記」階段——打包工具靜態分析每個模組的 `import`／`export`，標記出哪些 export 根本沒人用到。  
真正「物理刪除」那些被標記的死碼，其實是**在後面 minify 階段由 Terser 動手做的**，不是 tree-shaking 這一步自己刪掉。</mark>
- **code splitting**：切多個 chunk 按需載入。
  **vendor chunk**＝第三方庫獨立一支（很少改、可長期快取）；**各路由 lazy chunk**＝每條路由的程式獨立一支、走到那頁才下載（靠動態 `import()`／`React.lazy`）。
- **scope hoisting（＝module concatenation）**：<mark style="background: #FFB8EBA6;">平常每個模組被包在自己的函式（IIFE）</mark>裡；scope hoisting 把多個 ES 模組**併進同一個函式作用域**，少了每個模組的包裹殼 → 更小、也更好 tree-shake。只對 ES module 有效。

**④ minify（壓縮）**
**誰做 minify**：由
打包工具只是呼叫的壓縮器（minifier）」做，——

|  打包工具   |  Webpack   | Vite | Next.js 
| --- | --- | --- | --- 
|   其minifier  | Terser    |oxc(舊版esbuild)  | SWC、Rollup靠@rollup/plugin-terser叫Terser 

-**** 預設叫 ****、
-**Vite 新版** 叫 **oxc**（舊版是 **esbuild**）、
-**Next.js** 叫 **SWC**、**Rollup** 靠 `@rollup/plugin-terser` 叫 Terser。
Terser 概念上的處理順序是：  
parse（解析成語法樹）→ compress（做死碼消除、常數折疊等結構性優化）→ **mangle（重新命名變數／屬性，是第 3 步）** → generate（輸出最終字串，可選附上 source map）。
**mangle 改名**：把**區域變數/函式名**改成超短名（`userName`→`a`，只能改區域的才安全）；再**去空白＋去註解**（Terser 預設保留 `@license`/`!` 法律註解、其餘砍掉，也可設全砍）。Terser：空白移除＋符號改名約佔壓縮量 95%。

@license/! 開頭的法律註解：
所有主流minifer(Terser, UglifyJS, esbuild)共同遵守的一個慣例
只要一個註解是以 `@license` 開頭或是以驚嘆號開頭例如`/*! ... */`就會被視為法律授權聲明而強制保留
預設雖然會把程式碼的註解清光
因為很多開源套件的授權條款(MIT License)明文要求只要散布這份程式碼就必須保留原始的著作權聲明
這是法律合規上的保護機制，不是技術限制。
```text
function calculateTotal(price, qty) { // 加總
  return price * qty;
}            ↓ minify
function a(b,c){return b*c}
```

**⑤ hash＋產出＋注入**
輸出到 `dist/`，檔名帶**內容 hash**：`main-a1b2c3.js`（內容一變、檔名就變 → 舊快取自動失效＝cache busting）。再把這些帶 hash 的檔名**寫進 index.html** 的 `<script src>`/`<link href>`（Vite 自動；webpack 用 html-webpack-plugin）。

<mark style="background: #FFB86CA6;">一般用 webpack／Vite 手動設定的專案，預設輸出資料夾是 `dist/`。</mark>
Next.js 因為是框架，把整個建置產物（包含伺服器端跟客戶端兩份）都收在 `.next/` 底下，這是 Next.js 自己的慣例路徑，概念上跟 `dist/` 是同一種東西。

→ 對照 (q)：「轉譯」是步驟 ②（廣義編譯，逐檔）；「tree-shake/minify」是 ③④（bundle 子步驟）；產物**全都還是純文字 JS/HTML，不是機器碼**。

#### 每一步是「誰／哪個 plugin／子工具」做的（Webpack／Rollup／Vite）

先講重點：**第①步「建相依圖」主要是 bundler 的「核心（core）」做的，不是某個 plugin**；只有「解析 node_modules 路徑」那段靠 resolver（webpack 的 enhanced-resolve、Rollup 的 @rollup/plugin-node-resolve）。

| 步驟 | Webpack 老舊了啦| Rollup | Vite（生產＝Rollup） |
|---|---|---|---|
| ① 找入口、建相依圖 | 核心＋解析器 enhanced-resolve＋用 acorn 解析找 import | 核心＋@rollup/plugin-node-resolve 解析 node_modules | Rollup 核心＋Vite 解析 plugin；開發期依賴預打包用 esbuild |
| ② 逐模組轉譯 | Loaders（babel-loader／ts-loader／swc-loader／esbuild-loader） | transform 類 plugin（@rollup/plugin-babel／-typescript） | 預設 esbuild 轉 TS/JSX＋@vitejs/plugin-react（Babel 或 SWC） |
| ③ bundle（tree-shake／code-split／scope-hoist） | 核心 bundling；code split＝SplitChunksPlugin（內建）；scope hoist＝ModuleConcatenationPlugin（內建） | 全在核心啥中文啦（Rollup 首創 tree-shaking、預設 scope hoist；code split 靠動態 import／manualChunks） | 交給 Rollup 核心 |
| ④ minify | TerserWebpackPlugin（內建、production 預設）→ Terser | 不內建 → @rollup/plugin-terser → Terser | 預設 esbuild／新版 oxc／可選 terser |
| ⑤ hash＋注入 index.html | 雜湊＝核心 output [contenthash]；注入 HTML＝html-webpack-plugin | 雜湊＝核心 [hash]；注入 HTML＝@rollup/plugin-html | Vite 原生處理 index.html＋資源雜湊 |

Webpack 靠一堆內建 plugin＋loaders 做；
Rollup 把 bundle 相關全放核心、轉譯和 minify 靠外掛；
Vite 生產底層用 Rollup，但轉譯/minify 自己選 esbuild/oxc。

補充（Q：Rollup 內建沒有 minify 嗎？）**對，Rollup 核心不含壓縮器**，要裝 `@rollup/plugin-terser`（官方 plugin）叫 Terser 做；這也是 Vite 要自己指定 minifier 的原因。

#### 打包工具生態年表（由舊到新，附 2026 現況）

| 類別 | 由舊到新（出現年） | 2026 現況／地位 |
|---|---|---|
| bundler（打包器） | Browserify(2011)→Webpack(2012)→Rollup(2015)→Parcel(2017)→esbuild(2020)→Vite(2020)→Turbopack(2022)→Rspack(2023)→Rolldown(2026, Vite 8 內) | Vite＝新專案預設（~25M/週）；Webpack 下載仍最多（~30M）但少人選新專案（「era over」）；Turbopack＝Next.js 專用；Rspack＝遷移 webpack 用；CRA 已棄用 |
| transpiler（轉譯器） | tsc(2012)→Babel(2014)→SWC(2019)→esbuild(2020)→Oxc(2023) | Babel 仍在但漸被 SWC/esbuild/Oxc（Rust/Go）取代 |
| minifier（壓縮器） | UglifyJS(2012, ES5 only)→Terser(2018)→esbuild/SWC(2020+)→Oxc(2023+) | Terser 仍是 webpack/rollup 標準；Vite 8 改用 Oxc |

（年份為近似出現/流行時間；Vite 8 於 2026-03 用 Rust 的 Rolldown 取代 esbuild+Rollup、並用 Oxc 做 TS/JSX 轉譯；細節見文末來源，屬彙整文章非官方。）

#### 打包五步的常見追問澄清（附官方來源）

- **Terser 不是「打包(bundle)工具」，是「壓縮器(minifier)」**：Webpack 自己做 bundle；Terser 只在第④步壓縮。分清 bundler（Webpack 本體）vs minifier（Terser）。
- **「合併」與「切」不矛盾**：bundle 預設傾向把幾百個模組**合併**成少數幾支；code splitting 在此基礎上**刻意切幾條界線**（vendor、各 route）。最終＝少數幾支 chunk（比原始模組少很多、但不是 1 支）。
- **code splitting（切）在 build-time；lazy loading（延遲下載）在 runtime**——主詞不同：**bundler** 在 build 時把 `import()`/`React.lazy` **切**成獨立 chunk 檔；**瀏覽器** 在 runtime、使用者走到那頁時才去**下載**那支 chunk。配套但時間點/主詞不同，別混。
- **為什麼模組包成 IIFE**：bundler 用函式殼給每個模組**獨立作用域**（變數不外漏、不撞名）；用**立即執行函式（IIFE）**是因為既要函式殼造作用域、又要**定義完馬上跑一次**把 exports 備好（一般函式要被呼叫才跑）。
- **scope hoisting 合併作用域會不會出錯？不會**：bundler 合併前會**把撞名變數改名（rename）**保證語意等價（webpack 官方：模組串接時「variables renamed to avoid conflicts」）；只對 ES module 有效（import/export 靜態可分析，CommonJS 的動態 `require` 不併）。分模組是「原始碼的組織（可維護）」、合併作用域是「輸出的最佳化」，行為一致。
- **打包工具只在 build-time 嗎？runtime 也有它的事**：**Webpack/Vite 這個 CLI 本體** build 完就退場；但 **bundler 會注入一段「runtime code / manifest」** 在瀏覽器裡跑——負責模組解析（`__webpack_require__`）與**動態 import 的 chunk 載入（在瀏覽器動態插 `<script>` 抓 lazy chunk）**。所以「lazy loading 在 runtime」靠的就是這段被注入的 runtime code。**主詞區分：工具本體只在 build-time；它產生的 runtime helper 在 runtime 繼續做載入。**
- **為什麼 manifest 叫「資料」**：manifest 是一份**對照表**（記錄「哪個模組 id 在哪支 chunk、chunk 的檔名/URL」），它**不是會跑邏輯的程式碼、而是被查的一張表**。主詞區分：**manifest ＝資料（表）；runtime ＝讀這張表去載入的那段程式碼**。
- **`__webpack_require__` 是什麼語言？是 JavaScript**，webpack 產生的內部函式，用來取代你的 `import`/`require`。前後兩條底線 `__` 只是「內部、別碰」的命名慣例，跟 Python 的 dunder（`__init__`）長得像但**無關**。
- **bundler ≠ build tool（前面列的那些是哪種？）**：**純 bundler（主要就打包）**＝Rollup／esbuild／Rolldown／Browserify；**Webpack** 是 bundler，但配 dev-server/loader/plugin 後常被當 build tool；**build tool（含 bundler＋dev server＋更多）**＝Vite（底層 Rollup/Rolldown）／Parcel／Turbopack。關係：**build tool ⊃ bundler**。
- **「打包」算 step 幾？** 廣義「打包」＝整個 build（step①–⑤）；**狹義「打包」＝bundle＝step③**。當它跟「轉譯／minify」並列時就是 step③。

**HTML 在 build-time 的下場**：建置工具只對模板 index.html 做**文字層級處理**——輕量 parse 以**注入** `<script>`/`<link>` 標籤 ＋ **minify**（去換行，所以產物常是連著一長條；但換行對 HTML 無語意，解析結果一樣）→ 產出一個 HTML **文字檔**。**build 期間沒有瀏覽器、沒有 DOM，所以沒有「HTML Parsing→DOM 樹」那個過程**；真正的 HTML 解析只在 run-time、使用者瀏覽器裡發生。（SSG 例外：build-time 就先用 `renderToString` 把 HTML 字串產好，但一樣是產「字串」不是建 DOM。）

面試一句話：伺服器丟的 `index.html` 只是純文字，瀏覽器看不懂、不能直接操作，必須 run-time 用主執行緒（唯一）把 `<div>` 文字 Parse 成 `HTMLDivElement`、蓋成 DOM 樹；而 `<script>` 執行會搶那條主執行緒、打斷解析，才有 `defer`（等 DOM 蓋完再依序跑，適合主程式）、`async`（抓完插隊、不保證順序，適合 GA）、`module`（預設 defer）這些策略在喬「JS 何時搶主執行緒」。

### (q) 「編譯」到底在哪？——出現在三處，且上面那條流程是「Parse 不是編譯」

上面 (k) 的流程圖畫的是 **HTML→DOM 這條線**，那條線上**只有 Parse、沒有編譯**（HTML 不是程式語言，不會被編譯）。「編譯」躲在另外兩個地方，而且三處嚴格講是三種不同的東西：

| # | 在哪 | 何時／誰 | 動作 | 嚴格名稱 | 產物 |
|---|---|---|---|---|---|
| 1 | 「打包」裡（build-time） | 開發者/CI 機器，Babel／SWC／tsc | JSX/TS → 純 JS | 轉譯 transpile（口語叫「編譯」但不精確） | 還是**純文字 JS**，不是機器碼 |
| 2 | V8（run-time） | 使用者開頁，Ignition 直譯器 | AST → bytecode | 編譯成 bytecode | bytecode |
| 3 | V8（run-time） | 熱點程式碼，TurboFan | bytecode → 機器碼 | JIT 編譯 | 機器碼 machine code |

關鍵一：**流程圖裡的「打包」內含「轉譯」**——那就是 build-time 的第一個「編譯」；但**它的產物仍是純文字 JS，不是機器碼**（前端 build 完不會變機器碼，別誤會）。
關鍵二：**真正產生機器碼的編譯在 run-time 的 V8，而且它跟 HTML→DOM 是兩條平行的線**，我 (k) 只畫了上面那條：

```text
HTML 線：  HTML 字串 ──(瀏覽器 HTML 解析器 Blink，不是 V8)──► DOM 樹              ← 只有 Parse，無編譯
JS   線：  JS 字串 ──(V8 Parse)──► AST ──(編譯 Ignition)──► bytecode ──(JIT TurboFan)──► 機器碼   ← 編譯/機器碼在這
```

⚠️ **關鍵區分**：**HTML 那條由瀏覽器渲染引擎（Blink）的解析器做，完全不進 V8；AST／bytecode／機器碼只有 JS 那條有。** 兩件事在主執行緒上是不同元件在跑。
兩條線的深入：DOM 那條見 [Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪](../react/Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪.md)；JS 那條見 [機器碼與bytecode的差異](../../build-and-compilation/機器碼與bytecode的差異.md)、[00-V8引擎完整管線-Parse到Deoptimization](../javascript/JS_Core_and_Runtime/00-V8引擎完整管線-Parse到Deoptimization.md)；打包/轉譯那側見 [前端開發工具-打包編譯Lint與Parser](../../build-and-compilation/前端開發工具-打包編譯Lint與Parser.md)。

---

## 📂 五、追問一：「丟給瀏覽器」只有 index.html 一個檔案嗎？只有 SPA 嗎？

### (l) index.html 是「入口」，不是「全部」；一次載入是一連串請求

第一個請求回的確實只有一份 `index.html`，但它裡面寫滿對 `.css`/`.js`/圖片的參照（`<link href>`、`<script src>`、`<img src>`）；瀏覽器 Parse 到這些就**再各發一個獨立請求**去抓。所以「載入一個網頁」＝先 1 份 HTML＋接著並行抓十幾～幾十個檔（request waterfall）。**第一個文件只有一份，但檔案總數永遠複數**，這跟是不是 SPA 無關。

### (m) SPA 的「single」＝單一 HTML 外殼、不是單一檔案；對比 MPA

SPA 的 single 指「整個 app 只有一份 HTML 外殼，換頁（`/about`→`/products`）都用同一份、由 JS 動態抽換 `#root` 內容、不回伺服器要新 HTML」；它底下照樣掛一堆 `.js`/`.css`。

| 名稱 | 「頁」指的是 | HTML 文件數 | JS/CSS 檔數 | 換頁時 |
|---|---|---|---|---|
| SPA 單頁式 | 單一 HTML 外殼 | 通常 1 份 | 多個 | JS 前端重繪，不要新 HTML |
| MPA 多頁式 | 每條路由一份 HTML | 多份 | 多個 | 瀏覽器整份重載新 HTML |

### (n) 就算是 SPA，也刻意切成很多支（code splitting）

現代打包會故意把 JS 切多個 chunk：`vendor.js`（第三方庫）、`main.js`（主程式）、各路由的 lazy chunk（用到才抓），讓首屏只下載必要部分。相關見 [前端開發工具-打包編譯Lint與Parser](../../build-and-compilation/前端開發工具-打包編譯Lint與Parser.md)。

---

## 🖥️ 六、追問二：「伺服器丟 index.html」是 SSR 嗎？SPA 也會丟嗎？

### (o) 「伺服器丟 index.html」≠ SSR：伺服器有兩種

任何網頁都要某個伺服器發檔，但「發檔」≠「渲染」：**靜態檔案伺服器**（nginx／CDN／S3／Vercel static）只把 build 好的檔原封不動發出、不運算 → 這是 **CSR**；**執行中的應用伺服器**（活著的 Node，Next.js／Remix／Nuxt）每請求現場跑 React 產 HTML → 這才是 **SSR**。**SPA 一樣會丟 index.html**：SPA+CSR 丟的是靜態伺服器發的**空殼**，SPA+SSR 丟的是伺服器渲染好的**有內容 HTML**。

⚠️ **別把 SPA 跟 CSR 畫等號**：「SPA/MPA」是路由模型、「CSR/SSR」是首屏渲染在哪，兩個是**獨立的軸**，可自由組合（Next.js 就是 SSR+SPA）。完整拆解見 [SPA架構-入口點-CSR客戶端效能與狀態-部署](SPA架構-入口點-CSR客戶端效能與狀態-部署.md)。

### (p) CSR vs SSR vs Vanilla JS：差在「HTML 裡有沒有內容」＋「誰渲染」
無框架沒有拿同一份元件邏輯重算一次因為這是React特有的設計，React元件本質上是用JS描述畫面長什麼樣子的函式。

CSR跟SSR並非沒有差異：
CSR只需針對瀏覽器打包出一份產物。整份程式碼從頭到尾都在瀏覽器執行，打包工具只要對著一個目標做tree-shaking, code-splitting, minify就結束了。
SSR則需要針對伺服器跟瀏覽器兩個不同執行環境，各自打包出一份不同的產物（分別對應.next/server與.next/static/chunks）
因為同一套元件邏輯要在兩種環境各跑一次⬅️跑什麼啦？

| 維度 | CSR | SSR |
|---|---|---|
| 伺服器角色 | 靜態檔案伺服器，只發檔 | 執行中的 Node，每請求產 HTML 字串 |
| index.html 內容 | 空殼 `<div id="root"></div>` | 已填好 `<div id="root"><h1>…</h1></div>` |
| 誰渲染首屏 | 瀏覽器端 JS（V8 跑 React 建 DOM） | 伺服器（Node 裡 V8 跑 renderToString 產字串） |
| 首屏 | 等 JS 下載＋執行＋抓資料後 | HTML 一到就有，JS 後補互動（hydration） |
| 代表 | CRA、Vite SPA（＝SPA+CSR） | Next.js、Nuxt（＝SPA+SSR） |


SSR 兩個常見誤解要澄清：
**(1) 不是「每次 re-render 都在伺服器」**——
只有首屏那一次在伺服器產 HTML 字串（Node 的 V8 跑 `renderToString`，注意產**字串不是 DOM**）
hydration 之後，互動造成的 re-render 回到瀏覽器端，跟 CSR 一樣。
**(2) SSR 的動機**：
首屏速度（FCP）＋ SEO（爬蟲不跑 JS，直接給有內容的 HTML）＋ 社群預覽（Open Graph meta 要在 HTML 裡）。

驗證小技巧：CSR 的「檢視原始碼（Ctrl+U）」幾乎空白、但「F12 Elements」滿滿元素——原始碼是伺服器發的空殼，Elements 是 JS 跑完的結果。呼應 (a)：CSR 的 DOM 節點有兩個來源——① 瀏覽器 Parse 那份空殼（節點很少）；② JS 用 `document.createElement`/React 在 run-time 現場建大部分節點塞進 `#root`。hydration 細節見 [SSR-renderToString與Hydration-伺服器端渲染流程](../react/SSR-renderToString與Hydration-伺服器端渲染流程.md)。更深入的 SPA 架構（入口點、客戶端效能、狀態存哪、CSR 用什麼伺服器發）見 [SPA架構-入口點-CSR客戶端效能與狀態-部署](SPA架構-入口點-CSR客戶端效能與狀態-部署.md)。

---

## 🎁 七、框架幫我們做什麼？

**Abby 原話：**
> 「透過這一篇我了解到，框架對我們的幫助是什麼？可以幫我們處理打包工具（such as 找入口建相依圖、transpile、bundle、minify），<mark style="background: #FF5582A6;">並且處理好 script 載入的非同步順序，保證水合化。</mark>可是 Next.js 是 script async，這比較可惜吧？」

**修正討論（三點）：**

- **(1) 框架 vs 打包工具**：精確說，**框架是把打包工具「配置好、指揮好」**，實際做打包的還是 bundler——Next.js 底層用 Turbopack/Webpack、CRA 用 Webpack、Vite 系用 Vite。主詞：bundler 打包；框架＝「包好 bundler ＋加上路由/SSR/資料抓取/script 策略」。
- **(2)「保證水合化」只在 SSR/SSG 框架**：Next.js/Nuxt 這類才有 hydration；**純 CSR（CRA、Vite SPA）沒有水合化**（因為沒 SSR，見 [SPA架構-入口點-CSR客戶端效能與狀態-部署](SPA架構-入口點-CSR客戶端效能與狀態-部署.md)）。所以這句要限定在 SSR 框架。
- 水合化(Hydration)是伺服器先把 React 元件算成純 HTML 字串送到瀏覽器，讓使用者第一時間就看到畫面內容（這階段沒有互動性，按鈕點了沒反應）。接著瀏覽器載入 React 的 JS，React 拿著同一份元件邏輯在瀏覽器裡「重新算一次」，然後不是整個重畫，而是**接管**已經存在的那份 HTML，把事件監聽器（onClick 之類）一個個掛上去——這個「接管」的動作就叫水合。名字取得很貼切：伺服器給的 HTML 是乾的骨架，水合就是把它「泡發」成活的、能互動的頁面。

	水合成立的前提是：伺服器算出的 HTML，要跟瀏覽器重新算一次的結果**長得一樣**，React 才能安心地說「這就是我要的骨架，我直接接管就好，不用重畫」。這就是為什麼一旦兩邊算出來不一樣，React 就會報 hydration mismatch——它發現自己以為能直接接管的骨架，其實跟它自己算出來的不同。
	
- **(3)「Next.js 是 script async 比較可惜」→ 其實不可惜**：Next.js 的 `<Script>` 策略（預設 `afterInteractive`、`lazyOnload`）是給**第三方 script**；Next 自己的框架 chunk 是**精心編排**的（`beforeInteractive` 給關鍵、主 bundle 有 manifest 保證順序）。**就算 script 標籤帶 async，Next 的框架 runtime 也保證執行順序與 hydration 正確**——等於「用 async 加速下載、又用框架 runtime 保證順序」，魚與熊掌兼得。

補充：Next.js 其實**不只有 async**——它用 `<Script>` 的 `strategy` 屬性讓你自由調載入時機，共 **4 種策略**（官方導引：https://nextjs.org/docs/app/guides/scripts ）。對照你前面學的 script 概念：

| Next `strategy` | 誰／何時載入 | 對應前面學的 | 優先級 |
|---|---|---|---|
| beforeInteractive | 注入初始 HTML（head）、先於 Next 核心、hydration 前 | 最像 `<head>` 裡的關鍵 script（要最早跑） | 最高 |
| afterInteractive（預設） | client 端注入、hydration 後盡快載第三方 | 像「互動後才動態 append 的 async script」，**比 body 結尾更晚** | 高 |
| lazyOnload | 瀏覽器閒置、資源抓完才載低優先級 | 最延遲的 async（GA、廣告） | 低 |
| worker | 移到 Web Worker 執行，釋放主執行緒 | 呼應 (b)「主執行緒唯一」——換一條執行緒 | 正交（卸載） |

- **afterInteractive vs「body 結尾的 script」**：body 結尾的 script 在**首次解析 HTML 時**就執行（hydration 之前）；afterInteractive 是**hydration 完成之後**才 client 端注入載入，**時間點更晚**。
- **lazyOnload 只管低優先級**：它不幫高優先級安排；高優先級要改用 beforeInteractive（最高）或 afterInteractive（預設）。四策略是一條優先級光譜。
- **Web Worker 是什麼**：瀏覽器 API，讓一段 JS 在**另一條背景執行緒**跑、不佔主執行緒（呼應 (b)「主執行緒只有一條、JS 執行會搶它」）。**限制**：Web Worker **不能直接碰 DOM**（DOM 只屬主執行緒），靠 `postMessage` 與主執行緒溝通。Next 的 `worker` 策略把第三方 script 移進 Web Worker（底層用 Partytown，實驗性）。

非 Next 管的 script 則自己加 `async`/`defer`。

- **只有 `beforeInteractive` 保證多支順序**（官方：executed in the order they are placed）；**`afterInteractive`／`lazyOnload` 都不保證多支順序**——有相依關係要用 `onLoad` callback 串、或合併。`afterInteractive` **一定不在 hydration 之前完成**（定義就是 hydration 後才載），比「body 尾的傳統 script」更晚。
- **`beforeInteractive`「injected into the initial HTML」的意思**：**伺服器把這個 `<script>` 標籤寫進它送出的那份 HTML 字串裡**（相對 afterInteractive 是 client 端才動態 append）；**不是「DOM 已 parse 好」**。所以瀏覽器一拿到 HTML 就含它、parse 到 `<head>` 時很早處理、先於 Next 核心。

---

## 相關筆記
- [如何寫入口檔-index-js-main-tsx](如何寫入口檔-index-js-main-tsx.md) —— 打包第①步「入口/相依圖」的延伸：入口檔怎麼寫
- [SPA架構-入口點-CSR客戶端效能與狀態-部署](SPA架構-入口點-CSR客戶端效能與狀態-部署.md) —— 承接五、六節的深入追問
- [SSR-renderToString與Hydration-伺服器端渲染流程](../react/SSR-renderToString與Hydration-伺服器端渲染流程.md) —— SSR 與 hydration 的深入版
- [Markdown-渲染為DOM的過程](Markdown-渲染為DOM的過程.md) —— 「純文字要先轉換才能變 DOM」的同源觀念
- [Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪](../react/Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪.md) —— DOM 蓋好後，樣式計算→排版→繪製的下一段
- [機器碼與bytecode的差異](../../build-and-compilation/機器碼與bytecode的差異.md)、[00-V8引擎完整管線-Parse到Deoptimization](../javascript/JS_Core_and_Runtime/00-V8引擎完整管線-Parse到Deoptimization.md) —— JS 側的 Parse→AST→Bytecode→執行
- [前端開發工具-打包編譯Lint與Parser](../../build-and-compilation/前端開發工具-打包編譯Lint與Parser.md) —— React/TS 如何在 build-time 被轉譯打包成純文字
- [JavaScript-事件循環與閉包-面試核心](../javascript/JS_Core_and_Runtime/js-runtime/JavaScript-事件循環與閉包-面試核心.md)、[事件循環-Event-Loop-微任務與巨任務](../javascript/JS_Core_and_Runtime/事件循環-Event-Loop-微任務與巨任務.md) —— 「同步/非同步 JS」真正常指的主題（Event Loop），跟本篇不同層次

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：「什麼是 HTML 解析（Run-time 發生）」 | https://share.gemini.google/BijtuQltf0i9 | 分享頁 2026-08-11 查（見下方註記） |
| 手寫筆記：script 載入模式大表格 | 圖片 IMG_5480.JPG（Abby 手寫） | 2026-08-11 |
| Gemini Flash 截圖：HTML Parsing／DOM Tree／HTMLDivElement | 圖片 IMG_5485.PNG | 2026-08-11 |
| 打包①相依圖／入口點 | https://webpack.js.org/concepts/dependency-graph/ ｜ https://webpack.js.org/concepts/entry-points/ | 官方文件，2026-08-11 查（WebSearch） |
| 打包②JSX 轉譯 | https://babeljs.io/docs/babel-plugin-transform-react-jsx ｜ https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html | 2026-08-11 查 |
| 打包③tree-shaking／scope hoisting | https://webpack.js.org/guides/tree-shaking/ ｜ https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking | 2026-08-11 查 |
| 打包③code splitting／lazy | https://webpack.js.org/guides/code-splitting/ ｜ https://webpack.js.org/guides/lazy-loading/ | 2026-08-11 查 |
| 打包④minify（mangle／comments） | https://terser.org/docs/options/ | 2026-08-11 查 |
| 打包⑤hash／注入 index.html | https://vitejs.dev/guide/build.html | 官方文件（canonical，未逐頁抓取） |
| HTML 解析器是 Blink（非 V8）、建 DOM 樹 | https://developer.chrome.com/docs/web-platform/blink ｜ https://www.chromium.org/blink/ ｜ https://chromium.googlesource.com/chromium/src/third_party/+/master/blink/renderer/core/html/parser | 2026-08-11 查（WebSearch） |
| 打包工具的 runtime／manifest（build vs runtime、`__webpack_require__`、chunk 載入） | https://webpack.js.org/concepts/manifest/ | 2026-08-11 查 |
| scope hoisting 改名保證安全、僅 ES module（ModuleConcatenationPlugin） | https://webpack.js.org/plugins/module-concatenation-plugin/ | 2026-08-11 查 |
| minify 是誰做（Terser／esbuild／SWC／oxc；各工具預設） | https://vite.dev/config/build-options ｜ https://nextjs.org/docs/architecture/nextjs-compiler ｜ https://webpack.js.org/plugins/terser-webpack-plugin/ | 2026-08-11 查 |
| 每一步誰做：webpack loaders／enhanced-resolve／SplitChunksPlugin | https://webpack.js.org/concepts/loaders/ ｜ https://github.com/webpack/enhanced-resolve ｜ https://webpack.js.org/plugins/split-chunks-plugin/ | 2026-08-11 查 |
| Rollup 核心 tree-shaking／node-resolve／plugin-terser（minify 非內建） | https://rollupjs.org/ ｜ https://github.com/rollup/plugins/tree/master/packages/node-resolve ｜ https://www.npmjs.com/package/@rollup/plugin-terser | 2026-08-11 查 |
| 打包工具生態年表／2026 現況（Vite8-Rolldown-Oxc、CRA 棄用）※彙整文章非官方 | https://www.pkgpulse.com/guides/state-of-javascript-build-tools-2026 ｜ https://dev.to/thedailyagent/javascript-bundlers-in-2026-vite-rspack-turbopack-and-the-end-of-an-era-16hk | 2026-08-11 查（WebSearch） |
| Next.js Script 策略（beforeInteractive／afterInteractive／lazyOnload／worker）＋導引 | https://nextjs.org/docs/app/api-reference/components/script ｜ https://nextjs.org/docs/app/guides/scripts | 官方文件，2026-08-11 |
| Web Worker（背景執行緒、不碰 DOM、postMessage） | https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API | 2026-08-11 |

> ⚠️ 註記：Gemini 分享連結需登入／JS 才渲染，這次抓不到完整對話，**本篇以兩張圖為準**，未從連結杜撰。module 預設 defer、fetch 走網路執行緒、DOM 繼承鏈等為既有正確知識補充。
