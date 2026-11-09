---
title: SPA 資料從哪來 — CSR 與 SSR 差在「何時、在哪裡」去資料庫撈值並組出畫面
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - spa
  - csr
  - ssr
  - fetch
  - api
sources:
  - https://gemini.google.com/app/90238341c2cf482e
related:
  - "[[SPA架構-入口點-CSR客戶端效能與狀態-部署]]"
  - "[[SPA現況-為何說不流行了-與SSR-SSG混合架構]]"
  - "[[CSR初始DOM只有空div-root-DOM建立的時機與阻塞]]"
  - "[[SSR-renderToString與Hydration-伺服器端渲染流程]]"
updated: 2026-10-27
---

# SPA 資料從哪來 — CSR 與 SSR 差在「何時、在哪裡」去資料庫撈值並組出畫面

本篇重點 a–e，共 5 個

## 重點整理

**(a)** <mark style="background: #ADCCFF;">SPA（Single-page application，單頁應用）</mark>：瀏覽器一開始只下載一份近乎空白的 HTML。
　　接著頁面裡的 JavaScript 用 fetch／AJAX 在背景向後端 API 要資料（資料庫撈出後以 JSON 回傳）。
　　拿到 JSON 後，前端 JavaScript 再把內容動態渲染進畫面，切頁時不必整頁重載。

**(b)** <mark style="background: #FFF3A3;">CSR 與 SSR 的核心差異，就是「什麼時候去資料庫撈值」與「在哪裡把畫面組好」</mark>。

**(c)** CSR（Client-side rendering，客戶端渲染）：
　　伺服器只回傳空殼 HTML 加 JavaScript。
　　瀏覽器執行 JavaScript，才透過 API 打到後端撈資料，再自己組出 HTML 畫面。
　　首次載入較慢（要先下載並執行 JS 再 fetch），之後局部更新很快。
　　比喻：端上桌的是空盤子，菜由客人（瀏覽器）自己裝。

**(d)** SSR（Server-side rendering，伺服器端渲染）：
　　伺服器收到請求後，先去資料庫撈資料，再與 HTML 模板在伺服器端組成完整頁面，整包丟給瀏覽器直接顯示。
　　首次載入快、對 SEO（搜尋引擎最佳化）友善，但每次換大頁面都要伺服器重跑一次組合流程。
　　比喻：廚房把菜擺好盤再上桌。

**(e)** 對照表

| 項目 | CSR | SSR |
|---|---|---|
| 誰撈資料庫 | 瀏覽器 JS 經 API 向後端要 | 伺服器直接撈 |
| 誰組 HTML | 瀏覽器 | 伺服器 |
| 首屏 | 較慢，初始 DOM 只有空 div | 較快，拿到即完整 |
| 切頁 | 局部更新，很快 | 常需重新請求頁面 |
| SEO | 需額外處理 | 友善 |

⚠️ 存疑／更正：未發現明顯錯誤。補充：SPA 與 CSR 其實是兩條獨立的軸（SPA 指路由模型，CSR 指首屏渲染位置），詳見 [[SPA架構-入口點-CSR客戶端效能與狀態-部署]]。

## 各對話來源（原文）

### SPA 運作原理（2026-10-27 抓取）— https://gemini.google.com/app/90238341c2cf482e

使用者：所以她是透過打到後端API去更新一些應該要從資料庫撈到值的東西嗎？

Gemini：完全說中 SPA 核心：先下載空殼 HTML，JS 用 Fetch/AJAX 向後端要 JSON 資料再動態渲染；好處是切頁不重載，代價是前端路由、狀態管理、SEO。

使用者：可是差別在於什麼時候去資料庫撈值這是CSR或SSR的差異嗎 我還是很矇

Gemini：沒錯，這就是 CSR 與 SSR 最主要的差異（餐廳比喻：空盤 vs 擺好盤），詳見上方 (c)(d)(e)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話 SPA 運作原理 | https://gemini.google.com/app/90238341c2cf482e | 2026-10-27 |
| 概念對照（未另查外部文獻，可回補 MDN Client-side rendering / Next.js Rendering） | 見 [[SPA架構-入口點-CSR客戶端效能與狀態-部署]] | 2026-10-27 |
