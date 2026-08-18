---
title: SPA 現況：為何說「不流行了」，以及與 SSR／SSG 的混合架構
type: topic-note
source: Gemini
tags:
  - gemini
  - frontend
  - spa
  - mpa
  - csr
  - ssr
  - ssg
  - meta-framework
  - state-management
  - web-platform
aliases:
  - SPA還流行嗎
  - SPA適用場景
  - Meta-Framework
related:
  - "[[SPA架構-入口點-CSR客戶端效能與狀態-部署]]"
  - "[[SSR-renderToString與Hydration-伺服器端渲染流程]]"
  - "[[00-前端框架比較-Vue-React-Angular難易度與優缺點]]"
sources:
  - https://gemini.google.com/app/1139cbc06047ca69
updated: 2026-08-14
---

# SPA 現況：為何說「不流行了」，以及與 SSR／SSG 的混合架構

> 與 [[SPA架構-入口點-CSR客戶端效能與狀態-部署]] 相關的原因：那篇是<mark style="background: #FFF3A3A6;">技術結構面</mark>——SPA≠CSR、入口點 `index.html`、路由模型與首屏渲染是兩個獨立的軸；這篇是<mark style="background: #FFF3A3A6;">選型與趨勢面</mark>——「現在還該不該用 SPA」。兩篇是同一個主題的「怎麼運作」與「什麼時候用」，建議一起看。
> 與 [[SSR-renderToString與Hydration-伺服器端渲染流程]] 相關的原因：這篇提到的「混合體」正是那篇在講的 SSR＋Hydration 流程，是 SPA 缺點的具體解法。
> 與 [[00-前端框架比較-Vue-React-Angular難易度與優缺點]] 相關的原因：這篇提到的 Meta-Framework（Next / Nuxt / SvelteKit）分別對應那篇比較的三個框架生態。

**本篇重點 a–k，共 11 個。**

## 重點整理

> [!info] 一句話結論
> SPA <mark style="background: #FF5582A6;">並沒有「不流行」</mark>，而是從<mark style="background: #FFB8EBA6;">全盤流行</mark>轉變成<mark style="background: #BBFABBA6;">「回歸理性、各司其職」</mark>的狀態。

### 一、為什麼會有「SPA 退燒了」的印象

前幾年前端圈有過一段「什麼都要上 SPA」的盲目時期，後來大家發現純 CSR（Client-Side Rendering）的 SPA 有三個痛點：

(a) <mark style="background: #FF5582A6;">SEO 極差</mark>：搜尋引擎抓不到預先渲染好的 HTML。

(b) <mark style="background: #FF5582A6;">首屏加載慢（白屏時間長）</mark>：使用者第一次進來要下載巨型 JavaScript bundle，網路慢時體驗很糟。

(c) <mark style="background: #FF5582A6;">資源消耗高</mark>：所有邏輯都在前端運算，低階行動裝置容易卡頓。

### 二、現在的主流：混合體

(d) 現在的趨勢是 <mark style="background: #BBFABBA6;">SSR（伺服器端渲染）／SSG（靜態生成）與 SPA 的混合體</mark>，而不是二選一。

(e) <mark style="background: #ADCCFFA6;">全棧 Meta-Framework 成為主流</mark>：Next.js（React）、Nuxt（Vue）、SvelteKit（Svelte）。

(f) <mark style="background: #ADCCFFA6;">Server Components 與 Progressive Enhancement</mark>：需要 SEO 的頁面在伺服器端渲染好（快速看到畫面、利於 SEO），<mark style="background: #FFF3A3A6;">進到頁面後的互動與分頁切換則保留 SPA 無縫換頁、不刷新的流暢體驗</mark>。

| 面向 | 純 SPA（CSR） | 混合（SSR／SSG ＋ SPA 導航） |
|---|---|---|
| 首屏 | 白屏後才 render | <mark style="background: #BBFABBA6;">伺服器已渲染好 HTML</mark> |
| SEO | 差 | 好 |
| 後續換頁 | 無縫、不刷新 | <mark style="background: #BBFABBA6;">同樣無縫、不刷新</mark> |
| 代表技術 | Vite ＋ React Router | Next.js、Nuxt、SvelteKit |

### 三、什麼時候「純 SPA」依然是第一首選

(g) 以下三種情境，純 SPA 完全沒有過時問題：

- <mark style="background: #BBFABBA6;">後台管理系統（Dashboard）</mark>：不需要 SEO，使用者會長時間停留操作。
- <mark style="background: #BBFABBA6;">重度互動的 Web App</mark>：Google Docs、Figma、Canva、Spotify 網頁版。
- <mark style="background: #BBFABBA6;">SaaS 產品的工具內頁</mark>：登入後的控制台或操作介面。

### 四、Abby 的關鍵反問：「極度依賴前端狀態管理」不是缺點嗎

> [!important] 觀念反轉
> 「極度依賴前端狀態管理」<mark style="background: #FF5582A6;">非但不是 SPA 的缺點</mark>，反而正是 SPA 能稱霸這種情境的<mark style="background: #BBFABBA6;">核心優勢</mark>。

(h) 這裡的<mark style="background: #ADCCFFA6;">「狀態」指的是瀏覽器記憶體內的狀態</mark>：你在 Figma 畫布上選中了哪幾個物件、Canva 裡影片拉到第幾秒、Google Docs 游標停在哪個字後面。

(i) <mark style="background: #FFF3A3A6;">避免「頁面刷新」導致狀態全部歸零</mark>：

- 若用 MPA（多頁面應用）：在 Canva 編輯到一半點左側「素材」，整頁白屏重載，剛拉好的圖層位置、Undo／Redo 歷史紀錄、播放器時間點<mark style="background: #FF5582A6;">通通遺失</mark>。
- 若用 SPA：頁面永遠不刷新，所有狀態保存在瀏覽器記憶體（React State／Pinia／Redux），切換側邊欄、開關彈窗只是元件切換，<mark style="background: #BBFABBA6;">狀態完全不中斷</mark>。

(j) <mark style="background: #FFF3A3A6;">即時響應與毫秒級回饋</mark>：Figma 拖曳方塊要以每秒 60～120 幀跟隨滑鼠；Google Docs 打字要零延遲顯示，而「送去伺服器存檔」是背景非同步進行。<mark style="background: #FF5582A6;">如果每次操作都要等伺服器回傳新頁面，光是網路延遲就會讓軟體無法使用。</mark>

(k) 總結：說它「極度依賴前端狀態管理」，意思<mark style="background: #FF5582A6;">不是「這很吃力、很麻煩」</mark>，而是指這類應用的<mark style="background: #BBFABBA6;">核心靈魂就是大量的 UI 狀態變化</mark>。SPA 提供了一個持續運行、不中斷的 JavaScript 執行環境（Runtime），讓複雜狀態一直存活在記憶體裡——這正是這類 Web App 能媲美原生桌面軟體的根本原因。

## 自我測驗

### 填空（點擊顯示答案）

1. SPA 的全名是 ||Single Page Application（單頁應用程式）||。
2. 純 CSR 的 SPA 三大痛點是 ||SEO 差、首屏白屏時間長、低階裝置資源消耗高||。
3. React、Vue、Svelte 對應的全棧 Meta-Framework 分別是 ||Next.js、Nuxt、SvelteKit||。
4. SPA 最適合的三類場景是 ||後台 Dashboard、重度互動 Web App、SaaS 登入後的工具內頁||。
5. SPA 讓狀態不歸零的關鍵在於 ||頁面永遠不刷新，JavaScript Runtime 持續運行，狀態一直存活在瀏覽器記憶體中||。

### 是非題

1. SPA 已經退流行，新專案不該再考慮。 → ||✗ 錯。是從「什麼都上 SPA」轉為「各司其職」，Dashboard 與重度互動 Web App 仍以純 SPA 為第一首選。||
2. 「極度依賴前端狀態管理」是 SPA 在 Figma、Google Docs 這類應用上的缺點。 → ||✗ 錯。剛好相反，那正是 SPA 的核心優勢，因為這類應用的靈魂就是大量 UI 狀態變化。||
3. 現代混合架構的做法是「首屏 SSR，之後的換頁仍走 SPA 無刷新導航」。 → ||✓ 對。這正是 Next.js／Nuxt／SvelteKit 的標準模式。||
4. SPA 的狀態指的是存在資料庫裡的資料。 → ||✗ 錯。指的是瀏覽器記憶體裡的 UI 狀態，例如選中的物件、播放進度、Undo 歷史。||

### 申論題

1. 一個電商網站同時有「商品列表頁（需 SEO）」與「後台訂單管理（不需 SEO、操作密集）」。請說明你會為這兩塊分別選擇什麼渲染策略，理由是什麼。
2. 用「MPA 每次換頁都刷新」這個事實，解釋為什麼 Undo／Redo 歷史紀錄這種功能在 MPA 架構下幾乎不可能實作得好。

## 各對話來源（原文摘要）

### SPA 是什麼？（2026-08）— https://gemini.google.com/app/1139cbc06047ca69

使用者：「SBA 是不是？現在很不流行啊。」→ 補充「Spa single page application 啦」。

Gemini：說明 SPA 並非不流行，而是回歸理性；列出純 CSR 的三大痛點、現在的 SSR／SSG 混合趨勢與 Meta-Framework，以及純 SPA 依然首選的三種情境。整合進上方 (a)～(g)。

使用者：「重度互動的 Web App……極度依賴前端狀態管理與即時響應。」這樣怎麼還會適合？如果他依賴狀態管理。

Gemini：反轉觀念——這是優勢不是缺點；以 Canva 編輯到一半換頁遺失圖層、Figma 每秒 60 幀拖曳、Google Docs 零延遲打字為例，說明 SPA 提供不中斷的 JS Runtime 才是這類應用媲美原生軟體的根本原因。整合進上方 (h)～(k)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/1139cbc06047ca69 | 對話日期 2026-08、整理日 2026-08-14 |
| MDN：SPA 定義 | https://developer.mozilla.org/en-US/docs/Glossary/SPA | 查證日 2026-08-14 |
| Next.js 官方：Rendering（Server Components 與混合渲染） | https://nextjs.org/docs/app/getting-started/partial-prerendering | 查證日 2026-08-14 |
| React 官方：Server Components | https://react.dev/reference/rsc/server-components | 查證日 2026-08-14 |

> [!warning] ⚠️ 存疑／提醒
> (1) 「前幾年前端圈盲目上 SPA」「現在趨勢是混合體」屬於<mark style="background: #FFB8EBA6;">社群觀察與定性敘述</mark>，Gemini 未附任何調查數據。若面試要引用趨勢，建議自行查 <mark style="background: #D2B3FFA6;">State of JS</mark> 或 <mark style="background: #D2B3FFA6;">Web Almanac</mark> 的年度統計。
> (2) 「SEO 極差」這句在 2026 年略嫌絕對。Google 的 Googlebot 已能執行 JavaScript 並索引 CSR 內容多年，但<mark style="background: #FFF3A3A6;">渲染有排隊延遲、其他搜尋引擎與社群平台的爬蟲支援度仍差</mark>，所以「不建議依賴」是對的，「完全抓不到」則過於武斷。
> (3) Gemini 在第一輪回答被使用者打斷（一開始誤解成 SBA 小型企業署），該輪內容不完整，本篇未採用。

---

由 Gemini 對話自動整理 · 更新於 2026-08-14
