---
title: SPA 架構：SPA≠CSR（路由模型 × 首屏渲染是兩個獨立的軸）／入口點／狀態／部署
type: topic-note
tags:
  - spa
  - mpa
  - csr
  - ssr
  - ssg
  - hydration
  - index-html
  - entry-point
  - client-side-rendering
  - state-management
  - 靜態伺服器
  - deploy
  - web-platform
related:
  - "[[script載入方式]]"
  - "[[SSR-renderToString與Hydration-伺服器端渲染流程]]"
  - "[[11-記憶體模型-stack-heap-動態配置-GC]]"
  - "[[Cookie-與-Session]]"
updated: 2026-08-11
---

# SPA 架構：SPA≠CSR（兩個獨立的軸）／入口點／狀態／部署

> 承接 [script載入方式](script載入方式.md) 第六節。
> **本篇最重要的一件事：SPA 不等於 CSR。**「SPA/MPA」跟「CSR/SSR」是**兩個獨立的軸**，可以自由組合，一定要分開講。
>
> **本篇重點 (a)–(e)，共 5 個。**

---

## 🧭 (a) 先分清兩個獨立的軸——SPA≠CSR

兩個詞在回答**不同的問題**：

| 軸 | 問的是 | 選項 |
|---|---|---|
| 軸一：路由/導覽模型 | 換頁時整份 HTML 重載，還是 JS 抽換？ | SPA（單一外殼、不重載） vs MPA（每頁一份 HTML、整頁重載） |
| 軸二：首屏渲染在哪 | 第一次那份 HTML 的內容是誰產的？ | CSR（瀏覽器） / SSR（伺服器每請求） / SSG（build 時先產好） |

兩軸自由組合：

| 組合 | 首屏 index.html | 換頁行為 | 代表 |
|---|---|---|---|
| SPA + CSR | 空殼，瀏覽器端 JS 渲染 | JS 抽換內容，不重載 | CRA、Vite SPA |
| SPA + SSR | 伺服器渲染好，再 hydration | JS 抽換內容，不重載 | Next.js、Nuxt（預設） |
| MPA + SSR | 每頁伺服器各自渲染 | 整頁重載換新 HTML | 傳統 PHP／Rails／Django |
| MPA + CSR | 每頁各掛一個小 JS app | 整頁重載 | 少見 |

**所以 Next.js 是 SSR + SPA**：首屏由伺服器 render（SSR），但 hydration 之後換頁是前端路由、不重載（SPA）。**「SPA」講的是換頁行為，「CSR/SSR」講的是首屏誰渲染，兩件事別混。**（先前對話我把兩個混著講，是我不精確，這篇之後都分軸講。）

---

## 🚪 (b) 軸一：SPA 的「單一入口點」＝單一 HTML 外殼，慣例叫 index.html

「single」指**整個 app 只有一份 HTML 入口外殼**，換頁不重載這份 HTML、由 JS 前端抽換 `#root` 內容。**這是「軸一 SPA」的特徵，跟 CSR/SSR 無關**——SPA+SSR 一樣是「單一外殼、換頁不重載」，只是首屏那份外殼是伺服器填好內容的。**不是「只有一個檔案」**（JS/CSS 照樣多支，見母篇 (l)(m)(n)）。延伸：

- **入口有兩層**：HTML 入口（`index.html`）載入 JS 入口（`main.js`/bundle entry），JS 入口再 `import` 展開整個 app。

| 入口層 | 是什麼 | 慣例名字（打包後帶 hash） |
|---|---|---|
| HTML 入口 | 瀏覽器最先拿到的 HTML 外殼 | `index.html` |
| JS 入口 | HTML 裡 `<script src>` 指向的主程式 | `main.js`／`index-def456.js` |

- **`index.html` 這名字是慣例、不是魔法**：web 伺服器預設「請求 `/` 時回傳該目錄的 `index.html`」（nginx `index`、Apache `DirectoryIndex`）。改叫 `app.html` 也行，只是要自己設定伺服器指向它。

---

## ⚙️ (c) 軸二：首屏渲染在哪——CSR 把效能丟客戶端 / SSR 首屏搬回伺服器

| | SPA + CSR | SPA + SSR |
|---|---|---|
| 首屏內容誰產 | 瀏覽器端 JS：V8 跑 React，用 DOM API 現場建節點 | 伺服器：Node 裡的 V8 跑 `renderToString`，產出**HTML 字串**（Node 沒有 DOM） |
| 瀏覽器收到的 HTML | 空殼 `<div id="root"></div>` | 已填好內容的 HTML |
| 把 HTML 字串變 DOM 樹 | **都是瀏覽器的 HTML 解析器（Blink）做**，不管 CSR/SSR | 同左 |
| 首屏速度 | 慢（等 JS 下載+執行+抓資料） | 快（HTML 一到就有內容） |
| 伺服器負載 | 低（只發檔） | 較高（每請求現場 render） |
| 弱裝置 | 卡（重活在使用者裝置） | 首屏較輕，互動後才吃客戶端 |

延伸——**三台機器別搞混**（「客戶端」＝使用者的瀏覽器，不是開發者、也不是公司）：

| 機器 | 何時參與 | 做什麼 | 跑幾次 |
|---|---|---|---|
| 開發者/CI 主機 | build-time（部署前） | 轉譯＋打包成純文字 index.html+js | 一次，之後退場（關機都沒差） |
| 伺服器 | 使用者來訪時 | CSR：只發靜態檔；SSR：每請求現場 render 產 HTML 字串 | 每次請求 |
| 使用者自己的瀏覽器 | 使用者開頁（run-time） | 解析 HTML→DOM、跑 JS、互動 re-render | 每個訪客各在自己裝置上各跑一次 |

所以「弱裝置會卡」指的是**訪客手上那台**，不是開發者的。比喻：開發者＝出版社印食譜書（印一次）；伺服器/CDN＝書店（發書）；使用者的瀏覽器＝每個讀者在自己家廚房照書煮菜。SSR 則像書店**每次先幫讀者把菜煮好**再送出，讀者只要加熱（hydration）。

⚠️ **SSR 兩個常見誤解**：**(1) 不是「每次 re-render 都在伺服器」**——只有首屏那一次在伺服器產 HTML 字串；hydration 之後，互動造成的 re-render 回到瀏覽器端，跟 CSR 一樣。**(2) SSR 的動機**：首屏速度（FCP）＋ SEO（爬蟲不跑 JS）＋ 社群預覽（Open Graph meta 要在 HTML 裡）。hydration 細節見 [SSR-renderToString與Hydration-伺服器端渲染流程](../react/SSR-renderToString與Hydration-伺服器端渲染流程.md)。

---

## 💾 (d) 狀態存在瀏覽器記憶體，但它「短暫」——F5 就歸零（CSR/SSR 都一樣）

不管 SPA+CSR 還是 SPA+SSR，**hydration 之後**的互動狀態都活在**瀏覽器 JS heap 裡的變數/物件**：`useState`、Redux/Zustand 的 store（記憶體模型見 [11-記憶體模型-stack-heap-動態配置-GC](../javascript/JS_Core_and_Runtime/11-記憶體模型-stack-heap-動態配置-GC.md)）。延伸——最關鍵的坑與分層：

- **陷阱：記憶體狀態短暫**。按 F5 → 整包 JS 重跑 → 變數全清空 → 狀態消失（「為什麼重整登入就沒了」）。
- **要跨重載保存得另外存**；而真正的資料真相永遠在後端：

| 想保存的東西 | 存哪裡 | 特性 |
|---|---|---|
| 短暫 UI 狀態（開關、表單暫存） | JS 變數（記憶體） | 重整就沒 |
| 要跨重整保留（登入 token、偏好） | localStorage／sessionStorage／IndexedDB／cookie | 存瀏覽器端，重整還在 |
| 真正的業務資料（訂單、會員） | 後端資料庫 | 這才是 source of truth |

需要資料時（不管 CSR/SSR）都用 `fetch`/`axios` 去後端拿（母篇 (i)）。cookie/session 見 [Cookie-與-Session](../../backend/Cookie-與-Session.md)。

---

## 📡 (e) 部署：CSR 要「能發靜態檔」的東西；SSR 要「活著的 Node」

兩軸的部署需求不同，這也是分清 CSR/SSR 的實際差別：

| | SPA + CSR | SPA + SSR |
|---|---|---|
| 伺服器需求 | 任何能**發靜態檔**的東西 | 一個**持續執行的 Node 程式**（或 serverless function）每請求跑 render |
| 純靜態 CDN 夠嗎 | 夠 | **不夠**（要能執行程式） |
| 例子 | nginx／Apache／Caddy／S3+CloudFront／Cloudflare Pages／Netlify／Vercel static／`npx serve` | Node/Express 自架、Vercel/Netlify 的 serverless、Next.js 的 Node server |

CSR 這邊，判準是那台伺服器**扮演的角色**：只要做「發靜態檔」而非「跑 React 渲染」，就是在服務 CSR——**用 Node 後端發 SPA 也可以**（那時 Node 只是「發檔工」，沒做 SSR）。SSR 這邊則**一定要有能執行程式的環境**，純靜態 CDN 做不到。

---

## 相關筆記
- [script載入方式](script載入方式.md) —— 母篇：HTML Parsing（由 Blink 做、非 V8）、六種 script 載入模式、CSR vs SSR 的 index.html 長相
- [SSR-renderToString與Hydration-伺服器端渲染流程](../react/SSR-renderToString與Hydration-伺服器端渲染流程.md) —— SSR 與 hydration 的深入版
- [11-記憶體模型-stack-heap-動態配置-GC](../javascript/JS_Core_and_Runtime/11-記憶體模型-stack-heap-動態配置-GC.md) —— state 存在 JS heap 的記憶體基礎
- [Cookie-與-Session](../../backend/Cookie-與-Session.md) —— 跨重載保存登入狀態的其中一條路

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇為 Abby↔Claude 問答延伸（承接母篇 Gemini 素材），未另做外部查資料 | 母篇：[script載入方式](script載入方式.md) | 2026-08-11 |

> 註記：本篇屬既有前端架構知識整理（SPA/MPA、CSR/SSR/SSG、hydration、預設首頁 index.html、瀏覽器儲存 API 等），非引用特定網頁；要對照官方定義可查 MDN 的 SPA／Client-side rendering、Next.js 的 Rendering 文件再回補。
