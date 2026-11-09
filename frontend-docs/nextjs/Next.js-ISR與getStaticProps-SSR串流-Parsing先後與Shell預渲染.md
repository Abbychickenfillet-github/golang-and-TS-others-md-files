---
title: Next.js：ISR／getStaticProps／getServerSideProps／Streaming SSR 與瀏覽器 Parsing 的先後
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - nextjs
  - ISR
  - SSR
  - SSG
  - streaming
sources:
  - https://gemini.google.com/app/67407ea9d70634b7
related:
  - "[[FCP首次內容繪製-SEO爬蟲與打包五步驟]]"
updated: 2026-10-26
---

# Next.js：ISR／SSR／Streaming 與 Parsing 先後

本篇重點 a–i，共 9 個

## 重點整理

- <mark style="background: #FFF3A3A6;">(a) getStaticProps 只在 build time 跑一次</mark>，除非回傳物件加上 `revalidate: 秒數`，才變成 ISR（Incremental Static Regeneration，增量式靜態再生）。
- (b) ISR 流程：伺服器先把「舊的靜態 HTML」立刻回傳給請求者（stale-while-revalidate）→ 同時在背景重新執行 getStaticProps 向資料庫要新資料 → 重新 render 出新 HTML 並替換快取 → 下一位使用者拿到新版。
  - 資料庫被使用者 CRUD 改變，靠的是這個背景再生，<mark style="background: #FF5582A6;">不是重新打包 source code</mark>。
```js
export async function getStaticProps() {
  const data = await fetchFromDatabase()
  return { props: { data }, revalidate: 60 } // 60 秒內最多觸發一次背景更新
}
```
- (c) <mark style="background: #ADCCFFA6;">Rendering（伺服器把元件＋資料組成 HTML 字串）</mark>與 <mark style="background: #ADCCFFA6;">Parsing（瀏覽器的 HTML Parser 把收到的 byte stream 解碼成字元、再逐標籤建出 DOM 節點）</mark>是兩個不同階段，先後是接力關係。
  - 順序：伺服器 render 出 HTML 字串 → 打成 byte stream 經網路傳送 → 瀏覽器解碼 → HTML Parser 邊收邊 parse → 長出 DOM → Paint。
- (d) CSR（純客戶端渲染）傳來的是空的 `<div id="root"></div>`，Parser 解析完畫面是空白，要等 JS 下載並執行才補內容。SSG／SSR 傳來的 HTML 已含內容，Parser 不用等 JS 就能畫出畫面，所以 FCP 與 SEO 較好。
- (e) <mark style="background: #BBFABBA6;">傳統 getServerSideProps（Pages Router）是 blocking SSR</mark>：資料全部抓完、整頁 render 完，才一次把完整 HTML 傳給瀏覽器，TTFB（Time To First Byte）較長。
- (f) <mark style="background: #BBFABBA6;">Streaming SSR</mark>（App Router＋React Suspense）才是邊算邊傳：先送不需等資料的骨架（導覽列、版型）→ 資料就緒後再以 chunk 補送，瀏覽器動態補進畫面。
- (g) 「沒有依賴 URL data 的部分」＝不隨網址參數（路徑 id／slug／`?page=2`）改變的共用區塊，例如 Navbar、Sidebar、Footer。
- (h) <mark style="background: #ADCCFFA6;">Shell（外殼）</mark>＝上述共用骨架。用途：client navigation 時當作預設 prefetch payload 先下載，點擊後瞬間顯示，動態內容未到前也可拿來當 loading 畫面。
- (i) <mark style="background: #D2B3FFA6;">⚠️ 存疑／更正</mark>：Gemini 對「快取內容在 stale time ≥ 5 分鐘時才被包進 shell」的白話解釋偏推測，原文出自 Next.js 較新的 Glossary（與 Cache Components／PPR 相關），請以官方原文為準再核對。

## 各對話來源（原文摘要）

### HTML 轉換術語解析（2026-10-26 抓取）— https://gemini.google.com/app/67407ea9d70634b7

**使用者：** getStaticProps 搭配 ISR 處理資料庫 CRUD 後的頁面更新嗎？
**Gemini：** 對，需加 `revalidate`；流程如 (b)。

**使用者：** 兩者都是 Server 先生成 HTML，可是瀏覽器端已經在 parsing，看不懂。
**Gemini：** 分三階段：伺服器 render → 網路傳輸 byte stream → 瀏覽器 HTML Parser 解析（見 c、d）。

**使用者：** getServerSideProps 是一邊用封包一邊傳剩餘內容嗎？
**Gemini：** 不是，是全有或全無；邊傳是 Streaming SSR（見 e、f）。

**使用者：** 貼 Next.js Glossary：預渲染包含沒有依賴 URL data 的部分、shell 是什麼？
**Gemini：** 解釋 URL data、Shell、prefetch payload（見 g、h、i）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 原始對話 | https://gemini.google.com/app/67407ea9d70634b7 | 2026-10-26 抓取 |
| Next.js ISR 官方文件 | https://nextjs.org/docs/pages/guides/incremental-static-regeneration | 本次未重新抓取，待核對 |
| Next.js Glossary（shell） | https://nextjs.org/docs/app/glossary | 本次未重新抓取，待核對 |

由 Gemini 對話自動整理 · 更新於 2026-10-26
