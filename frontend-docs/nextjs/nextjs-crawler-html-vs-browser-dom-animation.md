---
title: 爬蟲看到的 HTML 與瀏覽器的 DOM — 差在有沒有被瀏覽器端 JS 改過
type: topic-note
source: Claude 對話與官方文件
tags: [nextjs, crawler, googlebot, seo, prerender, csr, dom]
updated: 2026-10-26
---

# 爬蟲看到的 HTML 與瀏覽器的 DOM

> 本篇重點 a–e，共 5 個

> [!info] 互動動畫（三欄並排、可切換 CSR 空殼與預渲染、可切換爬蟲類型）
> ![[nextjs-crawler-html-vs-browser-dom-animation.html]]

## a. 精確說法

| 原本的說法 | 修正 | 原因 |
| --- | --- | --- |
| 爬蟲看的是 HTML 還沒有被 parse 過的狀態 | 爬蟲拿到伺服器回應的 HTML 文字（view-source 或 curl 看到的），還沒被瀏覽器端 JS 修改過 | 爬蟲自己也會 parse 這串文字抽出文字與連結。不同的是它不一定經過瀏覽器執行 JS 之後的 DOM |
| 爬蟲都這樣 | Googlebot 是例外 | 官方說 200 狀態的頁面都送進渲染佇列，用無頭 Chromium 執行 JS，之後用渲染後的 HTML 索引 |

## b. 三方各自做什麼

| 步驟 | 伺服器回應的 HTML 文字 | 爬蟲 | 瀏覽器 |
| --- | --- | --- | --- |
| 1 | 同一份文字，狀態 200 | 收到 | 收到，還沒有 DOM |
| 2 | 不變 | parse 文字，抽出文字與連結 | parse 成 DOM，套 CSS 後畫出 |
| 3 | 不變 | 不執行 JS 的爬蟲沒動作。Googlebot 排進渲染佇列 | 執行 JS，修改 DOM，Hydration |
| 4 | 不變 | Googlebot 用無頭 Chromium 執行 JS | 使用者看到完整畫面 |
| 5 | 不變 | 不執行 JS 的爬蟲索引步驟 2 的內容。Googlebot 索引渲染後的內容 | DOM 與原始文字已不同 |

CSR 空殼的步驟 2 抽到的文字與連結都是空的。預渲染的步驟 2 就抽得到標題、段落與連結。

## c. Googlebot 與其他爬蟲

| 項目 | 官方怎麼說 | 來源與日期 |
| --- | --- | --- |
| 流程 | 抓取、渲染、索引。200 狀態的頁面都進渲染佇列 | JavaScript SEO basics，Last updated 2026-03-04 UTC |
| 其他 bot | 不是所有 bot 都能執行 JS，仍建議伺服器端或預渲染 | 同上 |
| 連結 | 只能發現有 href 的 a 標籤。放在初始回應不必等渲染 | 同上，後半句為推論 |
| 2MB 上限 | 單一 URL 最多抓 2MB（PDF 為 64MB），含 HTTP 標頭。超過就停在 2MB。HTML 引用的外部資源另計 | Inside Googlebot，文章寫 Tuesday, March 31, 2026 |
| WRS | 像現代瀏覽器執行 JS 與 CSS，但無狀態 | 同上 |
| 其他爬蟲、社群預覽、AI 抓取是否執行 JS | 未查證 | 無可信官方說法 |

## d. 專案證據

| 項目 | 內容 | 驗證 |
| --- | --- | --- |
| `--deck-h` 寫入位置 | `hooks/use-slide-deck.js` 第 43 行，`deck.style.setProperty('--deck-h', ...)`，包在 `useEffect` 內 | 已打開檔案 |
| 原始 HTML 為什麼是 0 次 | `useEffect` 在伺服器渲染與預渲染不會執行，且讀的是瀏覽器才有的 `main.clientHeight` | effect 部分來自 [[SSR-renderToString與Hydration-伺服器端渲染流程]]。clientHeight 為推論 |
| 首頁標題是否在原始 HTML | 原始碼 `app/intro/page.js` 第 172 行 h1 為「智能時間管理 從免費開始」。是否在原始 HTML 取決於首頁有沒有被 Bailout | 未驗證，`localhost:3001` 沒在執行 |

自己驗證用：`curl -s http://localhost:3001/ | grep -c "智能時間管理"` 與 `curl -s http://localhost:3001/ | grep -c "deck-h"`，第二個應為 0。`next dev` 是按需渲染，要比對預渲染請用 `next build` 後 `next start`。指令本次未執行。

## 關聯筆記

- [[nextjs-prerender-and-csr-bailout]]：前一篇，說明 HTML 如何預先產生，爬蟲讀到的就是那份。
- [[FCP首次內容繪製-SEO爬蟲與打包五步驟]]：已有 CSR 空殼對爬蟲不友善的論述，本篇補上 Googlebot 的渲染佇列例外。
- [[SSR-renderToString與Hydration-伺服器端渲染流程]]：useEffect 在伺服器不執行的依據。
- [[FCP-5.24秒-Next.js效能診斷實錄-從指令到根因]]：用 sed 與 grep 看原始 HTML，與本篇 curl 同一套手法。

## 資料來源（含查證時間）

查閱日 2026-10-26。

| 主題 | 連結 | 頁面標示的日期 |
| --- | --- | --- |
| Google JavaScript SEO basics | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics | Last updated 2026-03-04 UTC |
| Inside Googlebot | https://developers.google.com/search/blog/2026/03/crawler-blog-post | 文章寫 2026-03-31，無另標更新日期 |

**未查證**：其他爬蟲、社群預覽、AI 抓取是否執行 JS，渲染佇列的實際等待時間，首頁原始 HTML 是否已含標題文字。
