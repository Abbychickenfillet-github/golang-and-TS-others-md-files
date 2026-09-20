---
title: FCP 首次內容繪製 — 與 SEO 爬蟲的關係，以及打包五步驟怎麼影響它
type: topic-note
source: Gemini
tags: [gemini, frontend, 效能, fcp, lighthouse, seo, googlebot, csr, ssr, bundler]
sources:
  - https://gemini.google.com/app/9e25a1fa1fe501e3
  - https://gemini.google.com/app/7ee6da02bef71e28
  - https://gemini.google.com/app/d5f7dbd042133ecb
updated: 2026-09-16
---

# FCP 首次內容繪製 — 與 SEO 爬蟲的關係，以及打包五步驟怎麼影響它

本篇重點 a–y，共 25 個

## 重點整理

### 一、FCP 是什麼、跟 FP 差在哪

a. <mark style="background: #ADCCFF;">FCP（First Contentful Paint，首次內容繪製）</mark>是指瀏覽器從回應使用者請求、開始載入網頁，到<mark style="background: #FFF3A3;">首次在畫面上渲染出「任何 DOM 內容」</mark>的那個時間點。

b. <mark style="background: #BBFABB;">算數的內容</mark>：文字、圖片（含背景圖）、非白色的 `<canvas>` 或 SVG。<mark style="background: #FF5582;">不算數的內容</mark>：`<iframe>` 裡面的東西、純白的空白畫面。

c. <mark style="background: #ADCCFF;">FP（First Paint，首次繪製）</mark>是「瀏覽器開始把任何像素畫上螢幕」的時間點，可能只是背景色改變或導覽列外框出現（裡面還沒有字）。

| 比較項目 | FP（First Paint） | FCP（First Contentful Paint） |
| --- | --- | --- |
| 定義 | 渲染出任何像素 | 渲染出第一個具體 DOM 內容 |
| 視覺呈現 | 背景色變了、外框出現 | 出現實質內容（文字段落、Logo、標題） |
| 對使用者的意義 | 「瀏覽器有收到請求並開始做事了」 | 「我看到網站的資訊或骨架了」 |

d. <mark style="background: #FFF3A3;">FCP 一定大於或等於 FP</mark>。要優化體驗，FCP 是更具參考價值的核心指標，因為它是使用者主觀判斷「這網站到底有沒有在載入」的第一個關鍵訊號，FCP 越快跳出率越低。

### 二、Lighthouse 怎麼看 FCP

e. <mark style="background: #FFB8EB;">分數級距（行動裝置）</mark>：
   - 綠色（快）：0 ～ 1.8 秒
   - 橘色（需改善）：1.8 ～ 3.0 秒
   - 紅色（慢）：大於 3.0 秒

f. <mark style="background: #FF5582;">⚠️ 更正 Abby 原本的記憶</mark>：對話中提到「FCP 有 0.8 秒內、0.8–3 秒、3 秒以上 poor」。<mark style="background: #BBFABB;">0.8 秒那條線其實是 TTFB（Time To First Byte，首位元組時間）的 good 門檻，不是 FCP 的</mark>。FCP 的官方門檻是 1.8 秒 / 3.0 秒（web.dev 標準），請以 (e) 為準。

g. <mark style="background: #BBFABB;">除了分數之外要看的東西</mark>：Lighthouse 報表的「商機（Opportunities）」與「診斷（Diagnostics）」區塊才是可執行的行動清單，四個跟 FCP 最相關的項目是：
   - Eliminate render-blocking resources（消除阻斷渲染的資源）：檢查有沒有擋住 DOM 渲染的 CSS 或同步 JS。
   - Minify JS / CSS（縮減程式碼）：移除無用代碼與空白。
   - Ensure text remains visible during webfont load（字型載入時文字仍可見）：避免 <mark style="background: #ADCCFF;">FOIT（Flash Of Invisible Text，不可見文字閃現）</mark>拖慢 FCP，通常用 `font-display: swap` 解決。
   - Reduce server response time（TTFB）：FCP 的起點受制於後端回應速度，TTFB 太高 FCP 不可能快。

### 三、SEO 為什麼跟爬蟲、跟 FCP 有關

h. <mark style="background: #ADCCFF;">SEO（Search Engine Optimization，搜尋引擎最佳化）</mark>的目的是讓網頁在搜尋結果排名更高。搜尋引擎靠<mark style="background: #ADCCFF;">爬蟲（Crawler／Spider）</mark>探索網路、下載並讀取網頁內容，再建立<mark style="background: #ADCCFF;">索引（Index）</mark>。

i. <mark style="background: #FFF3A3;">爬蟲是搜尋引擎「看見」你網站的唯一途徑</mark>。爬蟲爬不到內容或爬到空殼，網頁就不會被收錄，也就無從談排名。

j. Google 的爬蟲叫 <mark style="background: #ADCCFF;">Googlebot</mark>，它不只下載 HTML 原始碼，還會執行 JavaScript、解析連結、理解文字圖片與結構化資料，像真人瀏覽器一樣呈現最終頁面。

k. <mark style="background: #FF5582;">CSR（Client-Side Rendering，客戶端渲染）對 SEO 不友善的核心原因</mark>：伺服器只回傳一個空的 HTML 外殼（Shell，通常就是 `<div id="root"></div>`），內容全靠瀏覽器下載並執行 JS 之後才產生。

l. <mark style="background: #BBFABB;">SSR（Server-Side Rendering，伺服器端渲染）與 SSG（Static Site Generation，靜態網站生成）</mark>則是伺服器直接回傳含完整內容的 HTML，爬蟲在伺服器回應的當下（約 50ms）就讀得到全部內容。

m. <mark style="background: #FFB8EB;">時間線對照（以 CSR 為例）</mark>：

| 時間 | 發生什麼事 | 爬蟲看到什麼 |
| --- | --- | --- |
| 0 ms | Googlebot 發送初始請求 | — |
| 50 ms | 伺服器回傳 HTML 空殼 | 只有 `<div id="root"></div>`，沒有實際內容 |
| 800 ms | 瀏覽器解析 HTML、發現 JS 連結 | — |
| 1500 ms | 下載並執行 `bundle.js`，發 API 請求取資料 | — |
| 2800 ms | 最終頁面內容渲染完成 | 完整 DOM 終於出現 |
| 3000 ms＋ | 已落入 Poor FCP 區間 | 對 SEO 極度不利 |

n. 兩種爬蟲的結局對比：

| 爬蟲類型 | 50 ms 時 | 2999 ms 時 | SEO 結果 |
| --- | --- | --- | --- |
| 舊型／簡單爬蟲 | 爬到 HTML 空殼 | 離開，不等 JS 執行 | 失敗，認定頁面無內容 |
| 現代智慧爬蟲（Googlebot） | 爬到 HTML 空殼 | 等 JS 執行完，取得完整 DOM | 成功，但效率極低、伺服器負擔大 |

o. <mark style="background: #FF5582;">⚠️ 存疑／需補充</mark>：Gemini 把 Googlebot 描述成「在同一次請求裡等 JS 跑完」。<mark style="background: #BBFABB;">Google 官方文件的說法是「兩階段索引（two-wave indexing）」</mark>：第一波先抓原始 HTML 建立索引，需要執行 JS 的頁面會被放進一個 <mark style="background: #ADCCFF;">Render Queue（渲染佇列）</mark>，等資源有空才用 headless Chromium 渲染第二次，這中間可能隔數小時到數天。結論方向一致（CSR 對 SEO 不利），但機制不是「站在原地等」，寫進面試答案時要用兩階段的說法。

p. <mark style="background: #FFF3A3;">一句話總結</mark>：SEO 需要爬蟲，而爬蟲讀取內容的能力直接受限於網頁的首次渲染速度。所以 SEO 至關重要的頁面（登陸頁、部落格文章）應該用 SSR 或 SSG。

### 四、打包五步驟怎麼一路影響 FCP

q. <mark style="background: #ADCCFF;">打包（Bundling）</mark>指的是 Webpack、Vite、Rollup 這類工具把原始碼處理成瀏覽器可用檔案的過程，五個核心步驟每一步都牽動 FCP：

r. 五步驟與 FCP 的關係：
   1. <mark style="background: #ADCCFF;">解析與依賴圖建立（Parsing & Dependency Resolution）</mark>：從 Entry Point 出發遞迴解析所有 `import` / `require`。若引入肥大的第三方套件又沒做好 Tree Shaking，打包體積變大、傳輸時間拉長，FCP 就被延後。
   2. <mark style="background: #ADCCFF;">轉換與編譯（Transformation / Loader）</mark>：用 Babel、TypeScript 或 SWC 把 ES6+、JSX 轉成瀏覽器看得懂的語法，避免因不支援語法而停滯。
   3. <mark style="background: #ADCCFF;">程式碼分割（Code Splitting）</mark>：用 <mark style="background: #BBFABB;">動態匯入 `import()`</mark> 把程式碼拆成多個 chunk 做按需載入。<mark style="background: #FFF3A3;">這一步對 FCP 幫助最大</mark>，因為首頁不必載入其他頁面的巨大程式碼，首屏 JS 體積降到最低。
   4. <mark style="background: #ADCCFF;">最佳化與壓縮（Minification & Tree Shaking）</mark>：Terser 移除空白換行、縮短變數名，Tree Shaking 剃掉沒用到的 export。檔案越小網路傳輸越快，主執行緒（Main Thread）越早開工，FCP 秒數大幅下降。
   5. <mark style="background: #ADCCFF;">輸出與資源雜湊（Emitting & Hashing）</mark>：輸出檔名加雜湊值（例如 `main.82b21c.js`）搭配長期快取（Long-term Caching），使用者回訪時直接讀快取，達到接近秒開的 FCP。

s. <mark style="background: #FFF3A3;">Abby 原本的直覺是對的</mark>：「bundle、minify 做得好，Lighthouse 效果才會好」——因為第 3、4、5 步直接決定首屏要下載與解析多少位元組，而那正是 FCP 起跑到終點之間最長的一段。

t. <mark style="background: #D2B3FF;">延伸備註</mark>：FCP 只是 Lighthouse 效能分數的其中一項權重，另外還有 LCP（Largest Contentful Paint，最大內容繪製）、TBT（Total Blocking Time，總阻塞時間）、CLS（Cumulative Layout Shift，累積版面配置位移）等指標，優化時不要只盯著 FCP 一個數字。

u. <mark style="background: #FF5582;">反例：五步驟全部做好，FCP 還是可能很爛。</mark>Abby 的 `next-one-main` 專案 `/dashboard` 頁，gzip 後的首屏 bundle 只有 177,000 bytes，FCP 卻是 5.24 秒。<mark style="background: #FFF3A3;">這證明 (q)(r)(s) 那條「體積 → 傳輸時間 → FCP」的因果鏈只是其中一條路徑</mark>，另外還有兩條與體積無關的路徑：<mark style="background: #ADCCFF;">伺服器吐出來的 HTML 裡根本沒有內容</mark>，以及<mark style="background: #ADCCFF;">渲染被阻塞（render-blocking）</mark>。

v. <mark style="background: #ADCCFF;">預渲染（Pre-rendering）的產物是一個實體檔案，就躺在硬碟上。</mark>這件事最反直覺，所以把兩種模式的生命週期拆開講：

| 比較項目 | 純前端 SPA（CSR，例如 Vite、CRA） | Next.js 預渲染（SSG／SSR） |
| --- | --- | --- |
| 建置期（`npm run build`）做什麼 | 打包工具只產出一個空殼 `index.html`（裡面只有 `<div id="root"></div>`）加上打包好的 JS | Next.js 用 Node.js 把 `Dashboard.tsx` 這個 React 元件真的執行一遍，把元件樹 render 成 HTML 標籤字串 |
| 建置期的產物 | 空殼 HTML ＋ JS chunk | `.next/server/app/dashboard.html` 這份寫滿真實標籤的實體檔案 |
| 執行期（使用者開網頁）做什麼 | 瀏覽器下載 JS → 執行 React → 在瀏覽器裡動態生成 DOM，這時才第一次發生渲染 | 伺服器直接把建置期寫好的 HTML 丟給瀏覽器，瀏覽器立刻畫得出畫面，JS 隨後下載做 Hydration 接管互動 |
| 硬碟上有沒有預先渲染好的 HTML | 沒有 | 有 |
| FCP 的起跑點 | 要等 JS 下載並執行完 | HTML 一到就開始 |

w. 所以 <mark style="background: #BBFABB;">「去打開 `.next/server/app/dashboard.html` 看裡面有沒有字」是判斷責任歸屬的決定性一步</mark>，主詞—動詞—受詞寫清楚是這樣：你用 `sed` 把 HTML 裡的 `<script>` 標籤全部抹掉 → 產物是一份只剩純結構的 HTML → 再交給眼睛判斷。兩種結果分別指向不同的兇手：

   1. <mark style="background: #BBFABB;">假設 A（預渲染成功）</mark>：檔案裡寫滿 `<h1>Dashboard</h1><p>Welcome...</p>`。代表伺服器有做好預渲染，問題出在瀏覽器收到 HTML 之後——被 CSS 擋住，或 Hydration 塞車。
   2. <mark style="background: #FF5582;">假設 B（預渲染失敗，只有空骨架）</mark>：檔案裡只有 `<div id="app"></div>` 或一個轉圈圈的 `<svg class="spinner">`。代表伺服器根本沒幫你渲染出真正的內容，瀏覽器還是得等 JS 下載完才動態抓資料，FCP 自然爛掉。

   常見的 B 成因是 <mark style="background: #ADCCFF;">CSR bailout</mark>（例如在上層元件呼叫 `useSearchParams`），細節見 [[usePathname與useSearchParams-預渲染Bailout]]。

x. <mark style="background: #ADCCFF;">Render-blocking（阻塞繪製）</mark>是第二條與體積無關的路徑。瀏覽器在解析 HTML 時遇到 `<link rel="stylesheet">`，或遇到沒有標 `async` / `defer` 的 `<script>`，會<mark style="background: #FFF3A3;">完全暫停渲染</mark>，等資源下載並解析完才繼續。它堅持這樣做是為了避免畫面先閃一下沒有樣式的內容（FOUC，Flash of Unstyled Content）。

y. 字型是 render-blocking 裡最容易被忽略的一種。<mark style="background: #FF5582;">如果 `@font-face` 設了 `font-display: block`，在字型檔下載完成前文字會完全隱形</mark>，這叫 <mark style="background: #ADCCFF;">FOIT（Flash of Invisible Text，不可見文字閃爍）</mark>，FCP 會被硬生生拉長。<mark style="background: #BBFABB;">修法是改成 `font-display: swap`</mark>，讓瀏覽器先用系統字型把字畫出來，字型檔到了再換掉。在 Next.js 用 `next/font` 會自動幫你設好這件事。

## 圖解

![FCP 與 Googlebot 時間線對比圖](images/FCP與Googlebot時間線對比.svg)

對照 (x)(y) 的 render-blocking，下面這張是 2026-09-16 在 DevTools 裡實際查這件事的畫面。左邊是本 vault 的 `css-兩種卡頓-render-blocking與執行期jank` 那篇筆記，右邊是 DevTools 的 Performance 面板：<mark style="background: #BBFABB;">第一種卡頓（阻塞首屏）要看 Performance 開頭的 Parse Stylesheet，第二種卡頓（執行期 jank）要看滑動時的紅色三角形 Long Task</mark>，兩種卡的量測指標完全不同，不要拿錯面板查。

![DevTools 查 render-blocking 與執行期 jank 的兩個面板](../obsidian-attachment/螢幕擷取畫面%202026-09-16%20192812.png)

## 練習題（LeetCode／NeetCode 對應）

> 這是偏系統與效能的主題，LeetCode 沒有直接對應題，以下挑「概念骨架相同」的題目練手感。

- LeetCode 207 — Course Schedule：https://leetcode.com/problems/course-schedule/ 　打包第 1 步的「依賴圖」本質就是有向圖＋拓撲排序，循環相依就是這題的環偵測。
- LeetCode 210 — Course Schedule II：https://leetcode.com/problems/course-schedule-ii/ 　輸出依賴的正確載入順序，等同 bundler 決定模組執行順序。
- NeetCode — Graph 專題（含上面兩題影片解說）：https://neetcode.io/practice 　建立依賴圖直覺後再回頭看 Rollup 的 module graph 會很好懂。

## 關聯筆記（附關聯原因）

- [[Vite-HMR機制與Rollup打包原理]] — 那篇是本篇 (r) 五步驟在 Vite / Rollup 上的具體實作，本篇補上「這五步各自怎麼影響 FCP 秒數」。
- [[gatsby-static-site-generator]] — 本篇 (l) 說 SSG 能讓爬蟲在 50ms 拿到完整 HTML，那篇是 SSG 的實際工具說明。
- [[DNS查詢-TCP與TLS握手RTT-邊緣節點與網頁效能]] — 本篇 (g) 說 TTFB 決定 FCP 的起跑點，那篇解釋 TTFB 之前的 DNS 與握手成本從哪來。
- [[CloudFront-CDN概念與快取失效Invalidation]] — 對應 (r) 第 5 步的長期快取策略，CDN 是把這個效果放大到全球節點。
- [[Node-js底層架構-V8-libuv-Bindings與CSR澄清]] — 那篇已澄清過 CSR 的定義，本篇 (k) 直接沿用該定義討論它對 SEO 的代價。
- [[usePathname與useSearchParams-預渲染Bailout]] — 本篇 (w) 假設 B「預渲染失敗只剩空骨架」最常見的成因就在那篇，它解釋一個 client hook 怎麼讓整棵樹放棄預渲染。
- [[FCP-5.24秒-Next.js效能診斷實錄-從指令到根因]] — 本篇 (u)(v)(w) 是觀念，那篇是同一個專案的逐指令實錄：每一步敲了什麼、看到什麼輸出、推論出什麼，最後收斂成三個根因。
- [[css-兩種卡頓-render-blocking與執行期jank]] — 本篇 (x) 只說 CSS 會擋住首屏，那篇把「擋住首屏」和「畫得出來但滑起來頓」這兩種完全不同的卡分開，並各自對應到不同的 DevTools 面板。
- [[CJK漢字復用與Noto字體選擇-i18n多語系與Docker打包]] — 本篇 (y) 的 FOIT 與 `font-display`，在那篇會延伸成「CJK 字型檔為什麼特別肥、怎麼子集化」。

## 各對話來源（原文）

### FCP 優化與前端打包解析（2026-08-27）— https://gemini.google.com/app/7ee6da02bef71e28

使用者：Fcp first contentful paint 是什麼，比較 fp，並且把前端開發者所會需要知道跟 FCP 有關的 lighthouse 知識也加進去，除了分數還有嗎，跟打包的五個步驟也連結一下，因為 bundle minify 做得好 lighthouse 效果才會好嘛，減少無用檔案

Gemini：一、什麼是 FCP：FCP 是指瀏覽器從回應使用者請求、開始載入網頁到首次在畫面上渲染出任何 DOM 內容的時間點。包含的內容：文字、圖片（包含背景圖）、非白色的 `<canvas>` 或 SVG。不包含的內容：`<iframe>` 內的內容、或是白色的空白畫面。為什麼重要：它是使用者主觀感受「網站有沒有在載入」的第一個關鍵指標。二、FCP vs FP：FP 是瀏覽器開始渲染任何像素到螢幕上的時間點（可能是背景顏色改變、或是導覽列的外框出現）；FCP 是瀏覽器渲染出第一個具體內容（DOM）的時間點（畫面上必須出現實質的內容）。FCP 永遠大於或等於 FP。三、Lighthouse 與 FCP：分數級距（行動裝置）綠色 0～1.8 秒、橘色 1.8～3.0 秒、紅色大於 3.0 秒。除了整體效能分數，開發者更應該看商機（Opportunities）與診斷（Diagnostics）區塊：消除阻斷渲染的資源、縮減 JavaScript / CSS、有效載入字型（避免 FOIT）、減少伺服器回應時間（TTFB）。四、前端打包的五大步驟與 FCP 的連結：（1）解析與依賴圖建立，若沒做好 Tree Shaking 會導致打包體積變大、延後 FCP；（2）轉換與編譯，透過 Babel、TypeScript 或 SWC 轉譯，避免瀏覽器解析不支援語法而停滯；（3）程式碼分割，透過 Dynamic Import 拆成多個 chunk 實現按需載入，對 FCP 幫助極大；（4）最佳化與壓縮，Terser 移除空白換行縮短變數名、Tree Shaking 剃除未使用的 exports，檔案越小網路傳輸越快；（5）輸出與資源雜湊，加上檔案雜湊值搭配長期快取，使用者回訪時可直接從快取讀取。

### SEO、爬蟲與首次渲染的關係（2026-08-27）— https://gemini.google.com/app/9e25a1fa1fe501e3

使用者：為什麼 seo 跟爬蟲有關係呀？Google 引擎是用爬蟲嗎？爬蟲不是找資料用的嗎？而且首次渲染還跟爬蟲有關係？可以幫我畫一個時間線圖是首次渲染的秒數（我記得 FCP 有 0.8 秒內、0.8-3 秒、3 秒以上 poor）跟爬蟲的秒數嗎？因為我還是沒辦法視覺化知道他們有什麼關係

Gemini：（產出一份時間線視覺化資料，內容為：0 ms Googlebot 發送初始請求；50 ms 伺服器回傳 HTML CSR Shell，簡單爬蟲只爬到空殼；800 ms 達到 Good FCP 標準，瀏覽器開始解析 HTML 發現 JS 連結；1500 ms 瀏覽器下載並執行 bundle.js，發送 API 請求；2800 ms 最終頁面內容渲染完成；3000 ms 之後渲染的內容對 SEO 極度不利。並附「簡單爬蟲 vs 現代爬蟲」對比：舊型爬蟲在 2999 ms 離開不等待 JS，SEO 失敗；現代 Googlebot 會等 JS 執行完畢取得完整 DOM，SEO 成功但效率極低。）

文字解答：1. 為什麼 SEO 跟爬蟲有關係：SEO 的核心目的是讓網頁在搜尋結果中排名更高，搜尋引擎透過爬蟲來探索網際網路、下載並讀取網頁內容，然後建立索引。如果爬蟲爬不到您的網頁內容，或爬到的內容是空的，網頁就不會被收錄。2. Google 引擎是用爬蟲嗎：是的，其背後運作的基礎就是 Googlebot。3. 爬蟲不是找資料用的嗎：完全正確，但它找資料的方式決定了它的 SEO 價值；網站索引爬蟲必須更深入地閱讀頁面內容，理解文字、圖片、結構化資料，甚至執行 JavaScript。4. 首次渲染跟爬蟲的關係：傳統伺服器渲染（SSR）伺服器直接回傳包含完整內容的 HTML，爬蟲在 50ms 就能讀取所有內容；客戶端渲染（CSR）伺服器只回傳一個空的 HTML 外殼，內容全靠瀏覽器下載並執行 JS 後才產生。Googlebot 現在會嘗試等待並執行 JS，但這對 SEO 是巨大的懲罰，因為 Google 資源被嚴重浪費，如果渲染總是拖到 3 秒甚至更久，Googlebot 可能會降低爬取頻率或認定該頁面體驗不佳而降低排名。總結：SEO 需要爬蟲，而爬蟲讀取內容的能力直接受限於網頁的首次渲染速度；建議 SEO 至關重要的頁面使用 SSR 或 SSG。

### 優化 FCP 效能與渲染阻塞排查（2026-09-16 擷取）— https://gemini.google.com/app/d5f7dbd042133ecb

使用者：我從 dashboard 的時候，FCP 的成績非常差，大概是 5.24 秒。我就讓 Claude 來幫我找找看為什麼會這樣子，他用了 systematic debugging 的流程調查。bundle 的體積 gzip 後只有 177000 bytes，它不是一個體積的問題。他說關鍵證據在預渲染 HTML 來驗證他的假設，用了 `ls .next/server/app/dashboard && wc -c .next/server/app/dashboard.html && sed -e 's/<script>.*<\/script>//g'`，然後他還聊了 render blocking CSS。

Gemini：頁面 Bundle 體積很小（僅約 177 KB gzip）FCP 卻高達 5.24 秒，這不是 JavaScript 下載太慢的問題，而是渲染阻塞（Render-Blocking）與 HTML 結構呈現 timing 的問題。（1）為什麼 Bundle 小 FCP 還是超慢：FCP 記錄的是瀏覽器在螢幕上渲染出第一個文字或圖片／SVG 的時間；即使 JS Bundle 再小，只要「HTML 本身沒有內容」（伺服器回傳的 `<body>` 只有空的 `<div></div>`，純 CSR），瀏覽器必須等 JS 完全下載、解析、執行完畢並發起請求後才能畫出第一個字；或者「關鍵 CSS／外部資源阻塞渲染」，瀏覽器解析 HTML 遇到 `<link rel="stylesheet">` 或沒標 async／defer 的 `<script>` 會完全暫停渲染。（2）那套 Bash 指令在驗證什麼：核心目標是檢查 SSR／SSG 的預渲染成果——`wc -c` 檢查生成的 HTML 實體位元組大小，`sed -e 's/<script>.*<\/script>//g'` 把 script 標籤全部抹掉只看純 HTML 結構；如果拔掉腳本後 HTML 裡幾乎沒有真正的 DOM 內容，就證明伺服器根本沒有預先渲染出首屏畫面。（3）Render-Blocking CSS 怎麼拖累：瀏覽器需要建立 CSSOM，如果 head 裡載入的 CSS 過大或引用未優化的第三方 CSS，瀏覽器會堅持在 CSS 完全下載完成前不畫出任何像素；字型方面如果 `@font-face` 設定 `font-display: block`，字型檔下載完成前文字會完全隱形（FOIT），FCP 被強制拉長。（4）優化方向：確保首屏元件沒有被無謂的 `use client` 降級、善用 `<Suspense>` 讓 shell 先送出；檢查未使用的第三方 CSS；自訂字型建議用 `next/font` 並設 `font-display: swap`。

使用者：我學了這麼久的 HTML 的編譯的過程跟 CSS 編譯的過程，我還是不知道 pre-rendering 會放在哪，為什麼它居然還有一個檔案啊？我以為 render 了之後它就直接在瀏覽器上執行了，但你看起來這又很像在建構時候的檔案欸。

Gemini：你以前學的是純前端 SPA／CSR 的流程，而 Next.js 採用的是伺服器端預渲染。（1）傳統 SPA：建置階段打包工具只產生一個幾乎空無一物的 `index.html`（裡面只有 `<div id="root"></div>`）跟打包好的 JS；執行階段使用者開啟網頁後瀏覽器下載 JS、執行 React、在瀏覽器裡動態生成 HTML 節點，這時才第一次發生渲染；這套模式下確實不會有任何預渲染好的 HTML 檔案。（2）Next.js：核心概念是「能先做好的事，在打包或伺服器端就先做完」。執行 `npm run build` 時，Next.js 在你的電腦或伺服器上用 Node.js 把 `Dashboard.tsx` 執行了一遍，將 React 元件樹直接轉換成純 HTML 標籤與文字，儲存成一份實體 `.html` 檔案放到 `.next` 資料夾裡。使用者存取時伺服器不需要重新算 React，直接把寫好的 `.html` 丟給瀏覽器，瞬間就能把畫面畫出來，隨後 JS 下載下來進行 Hydration 讓頁面接管互動。（3）為什麼這次 FCP 還是會爛：打開那份 HTML 若寫滿真實標籤，代表預渲染有做好，問題出在 CSS 阻塞或水合塞車；若只有 `<div id="app"></div>` 或一個 spinner，代表伺服器根本沒渲染出真正的內容（可能因為寫了 `use client`，或資料請求沒處理好）。總結：CSR 的 HTML 是瀏覽器執行 JS 時憑空產生的 DOM，硬碟裡沒有 HTML 檔；預渲染（SSG／SSR）的 HTML 是 Node.js 在打包或收到請求時先 Render to String 寫好的，硬碟或記憶體裡有實體 HTML 內容。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話（優化 FCP 效能與渲染阻塞排查） | https://gemini.google.com/app/d5f7dbd042133ecb | 2026-09-16 擷取 |
| Next.js 官方 — Rendering 與 Prerendering（產物寫進 .next 的說明） | https://nextjs.org/docs/app/getting-started/partial-prerendering | Next.js 現行文件，2026-09-16 查證 |
| web.dev — Render blocking resources（阻塞繪製的定義與量測） | https://web.dev/articles/render-blocking-resources | 2026-09-16 查證 |
| 本 vault 同專案逐指令實錄 | frontend-docs/nextjs/FCP-5.24秒-Next.js效能診斷實錄-從指令到根因.md | 2026-09-16 |
| 本篇 Gemini 對話（SEO 與爬蟲） | https://gemini.google.com/app/9e25a1fa1fe501e3 | 2026-08-27 擷取 |
| 本篇 Gemini 對話（FCP 與打包） | https://gemini.google.com/app/7ee6da02bef71e28 | 2026-08-27 擷取 |
| web.dev — First Contentful Paint (FCP) 定義與 1.8s / 3.0s 門檻 | https://web.dev/articles/fcp | 2026-08-27 查證 |
| web.dev — Time to First Byte (TTFB) 0.8s 門檻（用來更正本篇 f） | https://web.dev/articles/ttfb | 2026-08-27 查證 |
| Google Search Central — Understand JavaScript SEO basics（兩階段索引與 Render Queue） | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics | 2026-08-27 查證 |
| Chrome for Developers — Lighthouse Performance scoring | https://developer.chrome.com/docs/lighthouse/performance/performance-scoring | 2026-08-27 查證 |
| MDN — font-display（避免 FOIT） | https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display | 2026-08-27 查證 |
| Rollup 官方文件 — Code Splitting | https://rollupjs.org/tutorial/#code-splitting | 2026-08-27 查證 |
