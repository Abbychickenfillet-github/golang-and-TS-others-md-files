---
title: Model Context Protocol（MCP，模型上下文協定）——定義、三大能力與 2026 規格演進
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - LLM-Memory
  - MCP
  - Model-Context-Protocol
  - agent
  - protocol
  - 面試
aliases: [MCP, Model-Context-Protocol, 模型上下文協定]
related:
  - "[[網頁轉API供Agent使用-vs傳統爬蟲]]"
  - "[[rag-vs-memory-comparison]]"
  - "[[CLAUDE.md-vs-AGENTS.md]]"
sources:
  - https://gemini.google.com/app/c6e0b0444e11722e
updated: 2026-08-09
---

# Model Context Protocol（MCP，模型上下文協定）——定義、三大能力與 2026 規格演進

> **本篇重點 a–n，共 14 個。**
> 這篇的起點是一段語音對話：Abby 用自己的話講「MCP 就是一個協定，可以讓原本的應用軟體接到外面的其他裝置或服務」，Gemini 回「理解正確，但它不局限於裝置，更側重應用軟體與資料的串接」。原始對話很短，以下內容由官方規格補齊並標註查證時間。

---

## 一句話定義

(a) <mark style="background: #ADCCFFA6;">MCP（Model Context Protocol，模型上下文協定）是一個開放標準</mark>，用來讓 LLM 應用程式（Host）以統一的方式，安全地連接到外部的資料來源與工具。

(b) Abby 原本的講法「讓應用軟體接到外面的服務」<mark style="background: #BBFABBA6;">方向是對的</mark>，需要修正的只有一個詞：<mark style="background: #FF5582A6;">重點不在「裝置」，而在「資料與工具的串接」</mark>。裝置只是其中一種可能的後端。

(c) 常見的比喻：<mark style="background: #FFF3A3A6;">MCP 之於 AI 應用，就像 USB-C 之於周邊裝置</mark>——在它出現之前，每一個 AI 應用要接每一個資料源都要寫一套自己的整合，是 M × N 的工作量；有了共同協定之後變成 M + N。

---

## 三個角色

(d) <mark style="background: #ADCCFFA6;">Host</mark>：使用者實際在用的 AI 應用（例如 Claude Desktop、Cowork、IDE 外掛）。它負責決定要載入哪些伺服器、以及要不要讓模型呼叫某個工具。

(e) <mark style="background: #ADCCFFA6;">Client</mark>：Host 內部針對「每一個」Server 開的連線代理，一對一。

(f) <mark style="background: #ADCCFFA6;">Server</mark>：提供能力的那一端，例如檔案系統、資料庫、Gmail、Figma。<mark style="background: #FFB8EBA6;">Server 不需要知道自己被哪個模型使用</mark>，這是這個協定能通用的關鍵。

```text
使用者  ──►  Host（AI 應用）
                 ├── Client 1 ──► Server A（檔案系統）
                 ├── Client 2 ──► Server B（資料庫）
                 └── Client 3 ──► Server C（Gmail）
```

---

## Server 對外暴露的三大能力

(g) <mark style="background: #FFF3A3A6;">Tools（工具）</mark>：可被模型呼叫的函式，附帶自然語言描述與 JSON Schema 參數定義。<mark style="background: #FF5582A6;">這是唯一會「產生副作用」的類型</mark>，所以規格上是「model-controlled，但需要 Host 取得使用者同意」。

(h) <mark style="background: #FFF3A3A6;">Resources（資源）</mark>：用 URI 識別的唯讀上下文，例如一份檔案、一筆資料列。它是「被讀進脈絡」而不是「被執行」。

(i) <mark style="background: #FFF3A3A6;">Prompts（提示範本）</mark>：可重複使用的提示樣板，通常由使用者主動選用（例如斜線指令）。

| 能力 | 誰決定要用 | 有無副作用 | 類比 |
|---|---|---|---|
| Tools | 模型提議、使用者核准 | 有 | REST 的 POST |
| Resources | 應用程式／使用者 | 無 | REST 的 GET |
| Prompts | 使用者 | 無 | 範本檔 |

---

## 傳輸方式（Transport）

(j) <mark style="background: #ADCCFFA6;">stdio</mark>：Server 以本機子行程執行，透過標準輸入輸出交換訊息。<mark style="background: #BBFABBA6;">本機工具最簡單的選擇</mark>，也是大多數桌面應用的預設。

(k) <mark style="background: #ADCCFFA6;">Streamable HTTP</mark>：2025-03-26 版引入，單一 MCP 端點同時支援 POST 與 GET，並可選用 SSE（Server-Sent Events）串流。取代了更早的 HTTP+SSE 雙端點設計。

---

## 2026-07-28 規格的重大變動

(l) <mark style="background: #FF5582A6;">協定核心改為無狀態（stateless）</mark>：移除傳輸層的 session 管理與 `Mcp-Session-Id` 標頭。<mark style="background: #BBFABBA6;">實務意義</mark>：MCP Server 可以直接放在一般的 HTTP 負載平衡後面水平擴充，不必再做黏性連線（sticky session）。

(m) 其他新增項目：Multi Round-Trip Requests（多輪往返請求）、header-based routing（以標頭做路由）、cacheable list results（清單結果可快取）、授權強化、正式的 Extensions 擴充框架、Tasks，以及 <mark style="background: #FFB8EBA6;">MCP Apps</mark>——讓 Server 可以附帶互動式 HTML 介面，由 Host 放在沙箱 iframe 中呈現。

(n) <mark style="background: #FFF3A3A6;">面試講法</mark>：「MCP 把『AI 應用 ↔ 外部系統』的整合從 M×N 降到 M+N。它定義三種能力：Tools 是可呼叫且有副作用的函式，Resources 是唯讀上下文，Prompts 是提示範本。傳輸支援本機 stdio 與遠端 Streamable HTTP。2026-07-28 版把協定核心改成無狀態，拿掉 session 標頭，讓 Server 能用一般 HTTP 基礎設施水平擴充。」

---

## ⚠️ 存疑／更正

- 原始對話中 Abby 說「接到外面的其他的裝置服務」，Gemini 只做了輕微修正就結束，<mark style="background: #FF5582A6;">沒有講到 Tools／Resources／Prompts 三大能力，也沒有講傳輸方式</mark>。這是一段語音閒聊等級的對話，本篇的技術內容幾乎全部是後續補齊的，請以下方來源表為準。

---

## 關聯筆記與關聯原因

- [[網頁轉API供Agent使用-vs傳統爬蟲]]：<mark style="background: #D2B3FFA6;">兩者解的是同一個問題的兩種路線</mark>——都是「怎麼把外部世界變成 Agent 能吃的結構化輸入」。爬蟲是單向硬解，MCP 是雙方約定好的協定。
- [[rag-vs-memory-comparison]]：<mark style="background: #D2B3FFA6;">MCP 是「取得上下文的管道」，RAG 是「挑選上下文的策略」</mark>。管道與策略是正交的兩件事，實務上常一起用（MCP Server 提供檢索工具，內部跑 RAG）。
- [[CLAUDE.md-vs-AGENTS.md]]：<mark style="background: #D2B3FFA6;">同屬「Agent 設定與能力邊界」這一層</mark>。設定檔管的是「行為規範」，MCP 管的是「能力接口」。

---

## 各對話來源（原文）

### 聽取 Model Context Protocol 解釋（2026-08，語音對話）— https://gemini.google.com/app/c6e0b0444e11722e

> **使用者：** 那要您聽聽看我對 Model Context Protocol 的解釋這麼正確，它叫做上下文銜⋯⋯
>
> **Gemini：** 當然好啊，我很樂意聽聽您對 Model Context Protocol 的解釋。請繼續說吧，我洗耳恭聽。
>
> **使用者：** 他就是一個協議，然後可以讓原本的個人、城市或者是應用軟體可以接到外面的其他的裝置服務，對嗎？
>
> **Gemini：** 您的理解非常正確。Model Context Protocol（MCP）的確就是一個開放標準，旨在讓 AI 模型可以安全地連接到各種資料源和工具，讓模型能在獲得足夠的上下文資訊後，為您提供更準確的回應。不過，它不局限於裝置，更側重於應用軟體和資料的串接。

（語音轉文字有斷字，上方已整理為可讀版本。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| 原始 Gemini 對話 | https://gemini.google.com/app/c6e0b0444e11722e | 2026-08（對話當下） |
| MCP 官方規格 | https://modelcontextprotocol.io/specification/2026-07-28 | 規格版本 2026-07-28，查證於 2026-08-09 |
| 2026-07-28 版釋出說明（無狀態核心、Extensions、MCP Apps） | https://blog.modelcontextprotocol.io/posts/2026-07-28/ | 2026-07-28，查證於 2026-08-09 |
| 2026 MCP 藍圖 | https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/ | 2026，查證於 2026-08-09 |
| 規格版本演進時間軸 | https://hidekazu-konishi.com/entry/mcp_specification_version_timeline.html | 查證於 2026-08-09 |
