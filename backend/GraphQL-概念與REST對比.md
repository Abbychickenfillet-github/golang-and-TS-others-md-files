---
title: GraphQL 概念與 REST 對比
type: topic-note
source: Gemini
tags: [gemini, backend, graphql, rest, api, gatsby, ssg, markdown, mdx]
aliases: [GraphQL是什麼, Gatsby為何需要API]
related:
  - "[[Jekyll與GitHub-Pages把Markdown筆記變成免費網站]]"
  - "[[YAML-Frontmatter與SSG-Foreword-Preface概念]]"
  - "[[DNS查詢-TCP與TLS握手RTT-邊緣節點與網頁效能]]"
sources:
  - https://gemini.google.com/app/5004a4f4252619f3
  - https://gemini.google.com/app/bf46dc3ae84a051b
updated: 2026-08-14
---

# GraphQL 概念與 REST 對比

> 與 [[Jekyll與GitHub-Pages把Markdown筆記變成免費網站]] 相關的原因：這篇追加回合談的 Gatsby 與那篇的 Jekyll 都是<mark style="background: #FFF3A3A6;">靜態網站產生器（SSG）</mark>，兩者都在建構期把 Markdown 轉成 HTML，差別在 Gatsby 多了一層 GraphQL 資料層。
> 與 [[YAML-Frontmatter與SSG-Foreword-Preface概念]] 相關的原因：這篇提到 Markdown 檔開頭要寫 Frontmatter，那篇就是專門講 Frontmatter 的格式與用途。
> 與 [[DNS查詢-TCP與TLS握手RTT-邊緣節點與網頁效能]] 相關的原因：GraphQL「單一端點、一次請求撈完關聯資料」省下的正是那篇算的 TCP＋TLS 握手 RTT 成本。

**本篇重點 a–n，共 14 個。**

## 重點整理

> [!info] 什麼是 GraphQL？
> Facebook（現 Meta）2012 年內部開發、2015 年開源的一種 API <mark style="background: #ADCCFFA6;">查詢語言（Query Language）</mark>，同時也是執行查詢的<mark style="background: #ADCCFFA6;">伺服器端執行階段（Runtime）</mark>。是傳統 REST API 的替代方案，讓前端<mark style="background: #FFF3A3A6;">「要什麼資料，就給什麼資料」</mark>，不多也不少。

### 比喻

(a) REST 像點<mark style="background: #FFB8EBA6;">固定套餐（Endpoint）</mark>，想吃某道小菜得點整套；GraphQL 像<mark style="background: #BBFABBA6;">自助餐</mark>，拿點單（Query）勾你要的菜，引擎精準打包成 JSON 回給你。

### 解決的兩大痛點

(b) <mark style="background: #FF5582A6;">過度撈取（Over-fetching）</mark>：只想顯示「姓名」卻被迫下載含生日、地址、訂單等 50 個欄位，浪費流量。

(c) <mark style="background: #FF5582A6;">撈取不足（Under-fetching）／多次請求</mark>：要顯示文章列表＋作者姓名＋最新留言，REST 可能得先 `/posts`、再 `/users/1`、再 `/posts/1/comments`，發多次 HTTP 請求。

### 四大核心特點

(d) <mark style="background: #BBFABBA6;">精準獲取所需資料</mark>：前端在查詢中寫明只要 `name`，伺服器就只回 `name`，節省頻寬與載入時間。

(e) <mark style="background: #BBFABBA6;">單一端點（Single Endpoint）</mark>：所有查詢與變更都走同一個 `/graphql`。

(f) <mark style="background: #BBFABBA6;">強型別 Schema</mark>：Schema 定義所有支援的型別與欄位，前後端開發前就能明確溝通 API 結構，並自動產生文件與自動補全。

(g) <mark style="background: #BBFABBA6;">一次請求取得多種關聯資料</mark>：同時要「使用者資料」與「該使用者發表過的文章」，REST 可能要兩次網路請求，GraphQL 一次層級化撈完。

### 三大核心操作

| 操作 | 用途 | REST 對應 |
|---|---|---|
| <mark style="background: #ADCCFFA6;">Query（查詢）</mark> | 讀取資料 | `GET` |
| <mark style="background: #ADCCFFA6;">Mutation（變更）</mark> | 新增、修改、刪除 | `POST` / `PUT` / `DELETE` |
| <mark style="background: #ADCCFFA6;">Subscription（訂閱）</mark> | 基於 WebSocket 的即時推送，伺服器資料更新時自動通知客戶端 | 無直接對應（需 SSE／WebSocket 自建） |

### REST vs GraphQL 對比

| 特性 | REST API | GraphQL |
|---|---|---|
| 進入點 Endpoints | 多個（`/users`, `/posts`, `/comments`） | <mark style="background: #BBFABBA6;">單一（通常只有 `/graphql`）</mark> |
| 資料決定權 | 後端定義回傳結構 | <mark style="background: #BBFABBA6;">前端決定要哪些欄位</mark> |
| 回傳資料量 | 固定，易 Over-fetching | 精準，要什麼給什麼 |
| 強型別系統 | 需額外工具（如 Swagger／OpenAPI） | <mark style="background: #ADCCFFA6;">原生內建 Schema（Schema-driven）</mark> |
| 版本控管 | 通常需版本號（`/v1/users`、`/v2/users`） | <mark style="background: #BBFABBA6;">新增欄位或把舊欄位標 `@deprecated`，平滑升級</mark> |
| 快取機制 | <mark style="background: #BBFABBA6;">可直接用 HTTP 層級快取</mark> | <mark style="background: #FF5582A6;">需依賴客戶端狀態庫（如 Apollo Client）處理</mark> |

### 追加 2026-08-14：Gatsby 為什麼沒有資料庫卻要用 GraphQL

> [!question] Abby 的疑問
> 「Gatsby 有用資料庫嗎，不然幹嘛要 API？」

(h) Gatsby <mark style="background: #FF5582A6;">本身沒有內建資料庫</mark>。它需要 API 與 GraphQL 的原因，在於它的定位是<mark style="background: #ADCCFFA6;">「資料源無關（Data Source Agnostic）」的靜態網站產生器（SSG）</mark>。

(i) <mark style="background: #FFF3A3A6;">統一整合各種來源</mark>：部落格文章可能在 Markdown 檔、商品資料在 Shopify／Headless CMS（Contentful、Strapi）、留言在外部 PostgreSQL 或 MongoDB。Gatsby 用 Plugin 呼叫這些來源的 API，統整成一個<mark style="background: #BBFABBA6;">內建的本地 GraphQL 資料層（GraphQL Data Layer）</mark>，讓前端用一套標準語法讀取。

(j) <mark style="background: #FFF3A3A6;">在建構期（Build Time）就把資料變成靜態 HTML</mark>：

```text
傳統網站（SSR / CSR）：使用者訪問時 → 才去資料庫撈資料
Gatsby（SSG）：       你部署編譯時 → 呼叫 API 撈資料 → 塞進 React 元件 → 生成靜態 HTML
                     使用者訪問時 → 只是拿到純 HTML/CSS/JS，完全不連資料庫
```

所以生成後部署上去的只是靜態檔案，<mark style="background: #BBFABBA6;">速度極快且極為安全</mark>（沒有可被攻擊的資料庫連線）。

(k) <mark style="background: #FFF3A3A6;">元件只拿所需欄位</mark>：藉由 GraphQL，每個頁面精準宣告需要哪些欄位，避免載入多餘資料。

> [!tip] 一句話總結
> Gatsby 不是靠自己的資料庫運作，而是把外部各種 API 與資料庫當成<mark style="background: #FFB8EBA6;">「原料來源」</mark>，透過 API 把原料搬進來、在後台組裝成靜態網頁後直接送給使用者。

### 追加 2026-08-14：Gatsby 的內容該寫 Markdown 還是 React

> [!question] Abby 的疑問
> 「他們也是用 MD 檔案就好，還是我原本就應該要用 React 寫好？」

(l) <mark style="background: #BBFABBA6;">內容導向的頁面用 Markdown</mark>（部落格、技術文件、新聞、產品介紹）：建立 `.md` 檔，開頭寫 Frontmatter（標題、日期、標籤等中繼資料），Gatsby／Astro 會自動讀取並套用你事先寫好的 React 範本（Template／Layout）生成 HTML。<mark style="background: #FFF3A3A6;">完全不需要在 Markdown 裡寫 React</mark>。

(m) <mark style="background: #BBFABBA6;">獨特或高度互動的頁面用 React</mark>（首頁 Landing Page、About Us、會員中心、複雜表單）：這些頁面排版獨一無二，不需套統一文章樣式。

(n) <mark style="background: #FFF3A3A6;">實務上絕大多數人兩者結合</mark>：

| 負責什麼 | 由誰寫 |
|---|---|
| Header、Footer、整體排版、文章頁模板（Layout） | <mark style="background: #ADCCFFA6;">React</mark> |
| 實際文章內容（純文字與 Markdown 標記） | <mark style="background: #ADCCFFA6;">Markdown</mark> |
| 想在文章中插入動態圖表、互動按鈕 | <mark style="background: #D2B3FFA6;">MDX（`.mdx`，可在 Markdown 裡引入 React 元件）</mark> |

## 自我測驗

### 填空（點擊顯示答案）

1. GraphQL 由 ||Facebook（Meta）|| 於 ||2012|| 年內部開發，||2015|| 年開源。
2. GraphQL 的三大核心操作是 ||Query（查詢）、Mutation（變更）、Subscription（訂閱）||。
3. Subscription 底層基於的協定是 ||WebSocket||。
4. GraphQL 相對 REST 的一個明顯劣勢是 ||無法直接使用 HTTP 層級快取，需依賴 Apollo Client 這類客戶端狀態庫||。
5. Gatsby 的定位是「資料源無關」的 ||SSG（靜態網站產生器）||，它把外部 API 整合成本地的 ||GraphQL Data Layer（GraphQL 資料層）||。
6. 想在 Markdown 文章裡直接使用 React 元件，該用的格式是 ||MDX（`.mdx`）||。

### 是非題

1. GraphQL 用單一端點，所以在快取上比 REST 更方便。 → ||✗ 錯。剛好相反。REST 可直接吃 HTTP 層級快取，GraphQL 因為都打同一個端點且 body 各異，必須靠客戶端狀態庫處理快取。||
2. Gatsby 內建了自己的資料庫。 → ||✗ 錯。它沒有資料庫，是在建構期透過 Plugin 呼叫外部 API，把資料整合成本地 GraphQL 資料層。||
3. 用 Gatsby 做部落格時，每篇文章都必須寫成 React 元件。 → ||✗ 錯。內容導向的文章寫 `.md` 加 Frontmatter 即可，React 只負責 Layout 模板。||
4. GraphQL 升級 API 通常不需要 `/v2/` 這種版本號。 → ||✓ 對。做法是新增欄位或把舊欄位標 `@deprecated`，達成平滑升級。||
5. Gatsby 生成的網站在使用者瀏覽時仍會連線資料庫。 → ||✗ 錯。資料在建構期就已寫死進 HTML，瀏覽時只是純靜態檔案，這也是它安全又快的原因。||

### 申論題

1. GraphQL 解決了 Over-fetching 與 Under-fetching，卻犧牲了 HTTP 快取。請說明在什麼樣的產品情境下這筆交易划算，什麼情境下不划算。
2. 「Gatsby 沒有資料庫卻高度依賴 API」這句話，和「SSG 在建構期就把資料變成 HTML」是同一件事的兩面。請用這個角度說明，為什麼 SSG 網站不適合放「即時庫存數量」這種資料。

## 各對話來源

### GraphQL 概念、優缺點與比較（2026-06）— https://gemini.google.com/app/5004a4f4252619f3

使用者：GraphQL 是什麼？

Gemini：（摘要）Facebook 開發的 API 查詢語言＋Runtime，REST 替代方案、「要什麼給什麼」。用套餐 vs 自助餐比喻；解決 Over-fetching 與 Under-fetching／多次請求兩痛點；對比表（單一 endpoint、前端決定欄位、精準回傳、原生 Schema 強型別）。整合進上方 (a)～(g)。

### 追加 2026-08-14：GraphQL 查詢語言與 API — https://gemini.google.com/app/bf46dc3ae84a051b

使用者：GraphQL 是什麼？

Gemini：與 2026-06 那次回答高度重疊，但多補了<mark style="background: #FFB8EBA6;">三大核心操作（Query／Mutation／Subscription）</mark>與<mark style="background: #FFB8EBA6;">版本控管、快取機制</mark>兩列對比。已整合進上方對比表與核心操作表。

使用者：Gatsby 有用資料庫嗎，不然幹嘛要 API？

Gemini：Gatsby 沒有內建資料庫，它是「資料源無關」的 SSG，用 Plugin 呼叫外部 API 統整成本地 GraphQL 資料層，並在建構期生成靜態 HTML。整合進上方 (h)～(k)。

使用者：他們也是用 MD 檔案就好，還是我原本就應該要用 React 寫好？

Gemini：內容導向頁面寫 Markdown 加 Frontmatter 並套 React 模板；獨特或高互動頁面直接寫 React；實務上兩者結合，想在文章內嵌 React 元件則用 MDX。整合進上方 (l)～(n)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文（第一次） | https://gemini.google.com/app/5004a4f4252619f3 | 對話日期 2026-06-17 |
| Gemini 對話原文（追加回合） | https://gemini.google.com/app/bf46dc3ae84a051b | 對話日期 2026-08、整理日 2026-08-14 |
| GraphQL 官方規範與歷史 | https://graphql.org/learn/ | 查證日 2026-08-14 |
| GraphQL Foundation（2018 年起由 Linux Foundation 旗下管理） | https://graphql.org/foundation/ | 查證日 2026-08-14 |
| Gatsby 官方：GraphQL Data Layer | https://www.gatsbyjs.com/docs/graphql-concepts/ | 查證日 2026-08-14 |
| MDX 官方 | https://mdxjs.com/ | 查證日 2026-08-14 |

> [!warning] ⚠️ 存疑／提醒
> (1) Gemini 在追加回合裡出現<mark style="background: #FF5582A6;">錯字「常見的採作」</mark>（應為「操作」），本篇整理時已更正。
> (2) Gemini 沒有提到 GraphQL 的<mark style="background: #FFB8EBA6;">已知風險</mark>：巢狀查詢深度不設限會被惡意深度查詢打爆（需 query depth limiting／complexity analysis），以及一對多關聯容易踩到 <mark style="background: #D2B3FFA6;">N+1 問題</mark>（需 DataLoader 批次化）。面試被問「GraphQL 缺點」時這兩點比「快取麻煩」更能加分。
> (3) <mark style="background: #FF5582A6;">Gatsby 的專案現況需注意</mark>：Netlify 於 2023 年收購 Gatsby 後，官方維護節奏明顯放緩，新專案的社群主流已轉向 Next.js 與 Astro。對話中把 Gatsby 當作現行推薦選項，Abby 若要實際選型建議先自行查最新維護狀態。

---

由 Gemini 對話自動整理 · 更新於 2026-08-14
