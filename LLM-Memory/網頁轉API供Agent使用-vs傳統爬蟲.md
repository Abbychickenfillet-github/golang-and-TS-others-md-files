---
title: 把網頁轉成 API 給 AI Agent 用(vs 傳統爬蟲)
type: topic-note
source: Gemini
category: 技術
tags: [gemini, AI-Agent, MCP, 爬蟲, headless-browser, 網頁自動化]
sources:
  - https://gemini.google.com/app/59a0724c9e3425f1
updated: 2026-06-26
---

# 把網頁轉成 API 給 AI Agent 用(vs 傳統爬蟲)

## 重點整理

### 這類工具在做什麼
像 `hermai-cli` 這類專案，核心定位是<mark style="background: #FFF3A3A6;">「把任何網頁轉換成供 AI Agent 使用的 API」</mark>。本質是進階的<mark style="background: #ADCCFFA6;">網頁自動化／操作引擎</mark>，透過 <mark style="background: #ADCCFFA6;">headless browser（無頭瀏覽器，如 Puppeteer / Playwright）</mark>模擬真人操作網頁。

適用對象不限於授權商家：
- <mark style="background: #BBFABBA6;">公開網頁</mark>：一般人瀏覽器看得到的都能轉成 API（比價、抓新聞、監控公開資訊），免憑證。
- <mark style="background: #FFF3A3A6;">需登入的私有頁面</mark>（後台、信箱、個人帳戶）：也可以，但<mark style="background: #FF5582A6;">你得自己提供憑證（Cookie / Token / 帳密）</mark>，讓無頭瀏覽器模擬登入後行為。

服務 Agent 的方式：①<mark style="background: #BBFABBA6;">結構化輸出</mark>——把文字/按鈕/表格轉成乾淨 JSON，AI 一目了然；②<mark style="background: #BBFABBA6;">動作執行 Action</mark>——Agent 發指令（點下一頁、在搜尋框輸入），引擎在後台代為操作。

### 一般爬蟲就能撈資料,為什麼還要特別寫?
直覺沒錯——單純「撈資料」用 BeautifulSoup / Scrapy / Playwright 就夠了。要特別寫，<mark style="background: #FF5582A6;">核心痛點不只是突破反爬蟲</mark>，更本質是「<mark style="background: #FFF3A3A6;">給人用的爬蟲」和「給 AI Agent 用的工具」設計邏輯完全不同</mark>：

1. **為 Agent 設計的通用接口標準（常結合 <mark style="background: #ADCCFFA6;">MCP, Model Context Protocol</mark>）**：傳統爬蟲是客製化、寫死 DOM 結構（`div.price`、`ul>li`），<mark style="background: #FF5582A6;">網頁一改版程式碼就斷</mark>。這類工具把網頁動態行為抽象化成 Schema/標準 API Endpoint，Agent 讀 Schema 就知道「要買票得先點 A、填 B、送 C」，像呼叫後端 API 一樣操控網頁，不必為每站手寫程式碼。
2. **處理狀態與雙向操作（Actions），不只唯讀**：一般爬蟲多是<mark style="background: #FFF3A3A6;">唯讀（Read）</mark>；Agent 需要像真人連續互動：登入→選日期→選人數→過驗證→送出。這類專案在後台幫 AI 管理瀏覽器 Context（<mark style="background: #FFB8EBA6;">Session、Cookie、Token 簽章、重試機制</mark>），讓 Agent 能處理複雜的<mark style="background: #BBFABBA6;">寫入操作（Write Actions）</mark>。
3. **動態適應與反爬蟲防禦**：對付 Cloudflare / Datadome 等反機器人牆，底層整合逆向工程、模擬真人滑鼠軌跡、處理 per-request-signed（每次請求動態加密簽章）與 bootstrap state——把「繞過防禦、拆動態加密」最髒最痛的活包起來。

### 一句話總結
| 維度 | 傳統一般爬蟲 | Hermai-cli 這類專案 |
|---|---|---|
| 服務對象 | 工程師（撈資料存庫/寫報表） | AI Agent（當工具直接呼叫） |
| 主要功能 | 唯讀為主 | <mark style="background: #BBFABBA6;">雙向（讀＋寫）</mark>，含點擊/輸入/訂購 |
| 網頁改版 | 結構一變就要重寫 | 自動生成 Schema，AI 靠語意彈性適應 |
| 處理防禦 | 自己手動解驗證碼/維護 Cookie | 底層內建處理動態簽章與 Session 阻擋 |

<mark style="background: #FFF3A3A6;">傳統爬蟲＝工程師寫給特定任務的「固定劇本」；這類專案＝寫給 AI Agent 的「通用網頁瀏覽控制器」。</mark>

## 各對話來源

### 網頁轉 API 供 Agent 使用（2026-06）— https://gemini.google.com/app/59a0724c9e3425f1

**使用者：** 你幫我看一下這個專案，它是把所有網頁變成一個 API 然後給其他 Agent 串聯嗎？是幫已授權過的商家應用，還是一般民眾那種？

**Gemini：** `hermai-cli` 核心定位是「把任何網頁轉成供 AI Agent 使用的 API」，本質是進階網頁自動化/爬蟲引擎，用 headless browser（Puppeteer/Playwright）模擬真人操作。公開網頁完全可以（免憑證）；需登入的商家/個人應用也可以，但要你提供 Cookie/Token/帳密。它幫 Agent 的方式：把網頁文字/按鈕/表格轉成乾淨 JSON（結構化輸出），並允許 Agent 發指令由引擎後台執行動作。不侷限特定授權商家，只要給對應存取權限就能變成 Agent 的眼睛和手。

**使用者：** 最主要是反爬（平鎮）的問題嗎？不然一般爬蟲都做得到，為什麼還要特別寫？

**Gemini：** 直覺敏銳——單純撈資料用 BeautifulSoup/Scrapy/Playwright 就夠。要特別寫的核心不只是突破反爬，而是「給人用的爬蟲」與「給 AI Agent 用的工具」設計邏輯不同：①為 Agent 設計的通用接口標準（常結合 MCP），把網頁抽象成 Schema/API Endpoint，網頁改版也能彈性適應，不必逐站寫死 DOM；②處理狀態與雙向操作（Action），後台幫 AI 管理 Session/Cookie/Token 簽章/重試，支援複雜寫入操作；③動態適應與反爬蟲防禦，底層整合逆向工程、模擬真人軌跡、處理 per-request-signed 動態簽章。總結：傳統爬蟲是工程師的「固定劇本」，這類專案是 Agent 的「通用網頁瀏覽控制器」。
