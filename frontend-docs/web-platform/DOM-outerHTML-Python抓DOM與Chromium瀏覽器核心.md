---
title: DOM：outerHTML、Python 抓 DOM 與 Chromium 瀏覽器核心
type: topic-note
source: Gemini
tags: [gemini, dom, playwright, selenium, chromium]
sources:
  - https://gemini.google.com/app/113ad364c602317a
  - https://gemini.google.com/app/69594daf4aafc8ec
  - https://gemini.google.com/app/08e0cb7653a5aeee
updated: 2026-11-03
---

# DOM：outerHTML、Python 抓 DOM 與 Chromium 瀏覽器核心

三個瀏覽器相關小問題統整：DOM 本質、Python 抓 DOM 的工具選擇、outerHTML 與 innerHTML，以及 Chromium 與其他瀏覽器核心。

## 重點整理

本篇重點 a–g，共 7 個

(a) <mark style="background: #ADCCFFA6;">DOM（Document Object Model）</mark>是把 HTML／XML 表達成節點樹的程式介面（API），本身<mark style="background: #FF5582A6;">不涉及數學運算</mark>，只提供讀取、修改、新增、刪除節點的方法與屬性。

(b) Python 抓 DOM 三選一：<mark style="background: #BBFABBA6;">Playwright</mark>（現代主流，可處理 JS 動態渲染，`page.locator("h1").inner_text()`、`page.content()`）。<mark style="background: #BBFABBA6;">Selenium</mark>（老牌，`driver.find_element(By.TAG_NAME,"h1")`）。<mark style="background: #BBFABBA6;">Requests + BeautifulSoup</mark>（純靜態、不需開瀏覽器，最快）。

(c) 選擇準則：要點擊、填表、處理 SPA 用 Playwright。只抓原始碼已有的資料用 Requests + BeautifulSoup。

(d) `innerHTML`：只含元素內部的 HTML。`outerHTML`：元素自己加內部，指派新字串會<mark style="background: #FFF3A3A6;">整個元素替換</mark>（舊節點消失）。

(e) Chromium 由 Google 發起並主導，Microsoft、Intel、Samsung、Opera、Brave、Igalia 等也貢獻。排版引擎是 Blink，JS 引擎是 V8。

(f) 基於 Chromium：Chrome、Edge（2020 年起改用）、Brave、Opera、Vivaldi、Samsung Internet。不用 Chromium：Safari（WebKit，iOS 強制）、Firefox（Gecko）。

(g) 大家愛用 Chromium 的原因：標準相容性高、有大廠共同維護安全與效能、省去自己做排版引擎的成本。

> ⚠️ 存疑/更正：Gemini 說 Opera 在 2013 年轉向 Chromium，正確；但 iOS 上其他瀏覽器雖強制用 WebKit，近年歐盟地區已有政策調整，細節請以最新資料為準（我未查證）。

## 自我測驗（點開看答案）

> [!question]- innerHTML 與 outerHTML 差在哪？
> outerHTML 連元素自己的標籤一起，可整個替換。

> [!question]- 動態渲染的 SPA 用什麼抓 DOM？
> Playwright 或 Selenium（需瀏覽器），不是 Requests。

> [!question]- Edge 何時改用 Chromium？
> 2020 年，捨棄 EdgeHTML。

## 各對話來源
（Gemini 回答為節錄，使用者提問為原文）

### 初始化與實例化差異（後半）（2026-11-03）— https://gemini.google.com/app/113ad364c602317a

**使用者：** python去抓瀏覽器的dom 是用什麼語法

**Gemini：** （節錄）Playwright、Selenium、Requests+BeautifulSoup 三種。

**使用者：** outerHTML def?

**Gemini：** （節錄）元素本身加內部 HTML，可替換整個元素。

### DOM 數學運算（2026-11-03）— https://gemini.google.com/app/69594daf4aafc8ec

**使用者：** 這個 DOM 有經過數學運算嗎（附 MDN DOM 頁面）

**Gemini：** （節錄）沒有，DOM 是結構化 API。

### Chromium 維護者（2026-11-03）— https://gemini.google.com/app/08e0cb7653a5aeee

**使用者：** chromium是誰維護的

**Gemini：** （節錄）Google 主導，開源社群與大廠貢獻。

**使用者：** 大家都用chromium去開發自己公司的瀏覽器嗎？例如edge跟chrome

**Gemini：** （節錄）列出基於 Chromium 與不基於的瀏覽器。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Chromium 專案 | https://www.chromium.org/ | 官方網站，本次未重新抓取（2026-11-03）；Gemini 引用 Wikipedia |
| Playwright Python | https://playwright.dev/python/ | 官方文件，本次未重新抓取（2026-11-03） |
| outerHTML | https://developer.mozilla.org/zh-TW/docs/Web/API/Element/outerHTML | MDN，本次未重新抓取（2026-11-03） |
