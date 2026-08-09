---
title: Slug—網址語意化識別碼的生成、衝突處理與中文陷阱
type: topic-note
source: Gemini
tags: [gemini, backend, slug, url, seo, routing, regex]
sources:
  - https://gemini.google.com/app/8ff8fd6b3ab708c9
updated: 2026-08-08
---

# Slug—網址語意化識別碼的生成、衝突處理與中文陷阱

> 🔖 本篇重點索引：a–l，共 12 個。

## 重點整理

**(a)** <mark style="background: #ADCCFFA6;">Slug 定義</mark>：網址（URL）中用來辨識特定資源、且<mark style="background: #FFF3A3A6;">易於人類閱讀</mark>的那一段，通常是 URL 的最後一節。它是標題的變體——大寫轉小寫、用連字號 `-` 取代空白與特殊符號，目的是讓搜尋引擎（SEO）與使用者都能一眼看懂這頁在講什麼。

**(b)** <mark style="background: #FFB8EBA6;">ID vs Slug 對照</mark>：假設有一篇標題為「如何學習 JavaScript」的文章——

| 類型 | URL 範例 | 優缺點 |
|---|---|---|
| 用 ID | `example.com/posts/12345` | 對機器友善，但<mark style="background: #FF5582A6;">對人類不直觀，對 SEO 無助益</mark> |
| 用 Slug | `example.com/posts/how-to-learn-javascript` | <mark style="background: #BBFABBA6;">語意明確、有利搜尋排名，使用者也比較敢點</mark> |

**(c)** <mark style="background: #BBFABBA6;">Slug 的四個特徵</mark>：

- <mark style="background: #FFF3A3A6;">全小寫</mark>：避免大小寫造成的連結混淆（部分伺服器路徑是區分大小寫的）。
- <mark style="background: #FFF3A3A6;">連字號分隔</mark>：用 `-` 而不是底線 `_` 或空白——空白在 URL 中會被編碼成醜陋的 `%20`。
- <mark style="background: #FFF3A3A6;">唯一性</mark>：在同一個路徑下必須唯一，資料庫通常會對這個欄位建<mark style="background: #ADCCFFA6;">唯一索引（Unique Index）</mark>。
- <mark style="background: #FF5582A6;">不可變性</mark>：技術上可以改，但隨意改會讓舊連結全部 404，需要搭配 <mark style="background: #ADCCFFA6;">301 永久重導向</mark>。

**(d)** <mark style="background: #D2B3FFA6;">為什麼 `-` 比 `_` 好</mark>：Google 明確表示會把連字號視為<mark style="background: #FFF3A3A6;">分詞符號</mark>，底線則會被當成單字的一部分——`how_to_learn` 會被讀成一個詞，`how-to-learn` 才會被拆成三個詞。這是 SEO 上的實質差異，不只是慣例。

**(e)** <mark style="background: #ADCCFFA6;">後端處理 Slug 的三個階段</mark>：

1. <mark style="background: #FFF3A3A6;">生成</mark>：使用者輸入標題（如 `Hello World!`），程式轉成 `hello-world`。
2. <mark style="background: #FFF3A3A6;">處理衝突</mark>：若資料庫已有 `hello-world`，自動加後綴變成 `hello-world-1`。
3. <mark style="background: #FFF3A3A6;">查詢</mark>：改用 slug 欄位查，而不是主鍵。

```js
// 傳統用 ID 查詢
const post = await db.posts.findOne({ id: 123 });

// 使用 Slug 查詢（記得這欄要有索引，否則會全表掃描）
const post = await db.posts.findOne({ slug: 'how-to-learn-javascript' });
```

**(f)** <mark style="background: #FF5582A6;">⚠️ Gemini 給的產生器有中文陷阱</mark>：原始版本如下，它宣稱輸出會保留中文，<mark style="background: #FF5582A6;">但實際上不會</mark>。

```js
// ❌ Gemini 原版：中文會被整段吃掉
function createSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')      // 空白換成 -
    .replace(/[^\w-]+/g, '')   // 移除所有非字母、數字、連字號的字元
    .replace(/--+/g, '-');     // 避免重複的 --
}

createSlug("Node.js 101: 快速上手指南！");
// Gemini 宣稱輸出："nodejs-101-快速上手指南"
// 實際輸出："nodejs-101-"   ← 中文全被 [^\w-] 刪光了
```

原因是 JavaScript 的 <mark style="background: #ADCCFFA6;">`\w` 等價於 `[A-Za-z0-9_]`</mark>，只涵蓋 ASCII，任何中文、日文、重音字母都落在 `[^\w-]` 裡而被移除。

**(g)** <mark style="background: #BBFABBA6;">✅ 支援中文的正確寫法</mark>：改用 Unicode 屬性跳脫 `\p{L}`（任何語言的字母）與 `\p{N}`（任何數字），並加上 `u` 旗標。

```js
function createSlug(text) {
  return String(text)
    .normalize('NFKC')              // 全形轉半形、統一相容字元
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')        // 空白與底線 → 連字號
    .replace(/[^\p{L}\p{N}-]+/gu, '') // 只保留任意語言的字母、數字、連字號
    .replace(/-+/g, '-')            // 收斂連續連字號
    .replace(/^-|-$/g, '');         // 去掉頭尾的連字號
}

createSlug("Node.js 101: 快速上手指南！");
// → "nodejs-101-快速上手指南"
```

**(h)** <mark style="background: #FFB8EBA6;">中文 Slug 要不要用？兩派做法</mark>：

- <mark style="background: #BBFABBA6;">保留中文</mark>：可讀性最好，現代瀏覽器網址列會正常顯示；但實際傳輸時會被<mark style="background: #ADCCFFA6;">百分比編碼（Percent-encoding）</mark>成一長串 `%E5%BF%AB...`，複製貼到純文字環境（如 Email、Slack）就很醜。
- <mark style="background: #BBFABBA6;">轉拼音或改用英文標題</mark>：URL 乾淨、跨環境安全；代價是需要額外的轉換套件，且同音字會撞在一起。
- 實務折衷：<mark style="background: #FFF3A3A6;">`/posts/12345-how-to-learn-javascript`</mark>——前面放 ID 保證唯一與查詢效率，後面放 slug 給人與搜尋引擎看，改標題也不會壞連結（只認前面的 ID）。

**(i)** <mark style="background: #FF5582A6;">衝突處理不要只加流水號就收工</mark>：`hello-world-1`、`hello-world-2` 這種做法在高並發下會<mark style="background: #FF5582A6;">產生競爭條件（Race Condition）</mark>——兩個請求同時查到「沒有 hello-world-1」就都寫入。正確做法是<mark style="background: #BBFABBA6;">靠資料庫的唯一索引擋下重複，捕捉 unique violation 錯誤後重試</mark>，而不是先查再寫。

**(j)** <mark style="background: #FF5582A6;">Slug 改動時務必留下 301</mark>：把舊 slug 存進一張 `post_slug_history` 表，路由查不到現行 slug 時再去歷史表撈，撈到就 <mark style="background: #ADCCFFA6;">301 Moved Permanently</mark> 導到新網址。這樣既保住 SEO 權重，也不會讓別人分享出去的舊連結變 404。

**(k)** <mark style="background: #D2B3FFA6;">為什麼叫 Slug？</mark>這個詞源自<mark style="background: #FFF3A3A6;">新聞編採（Newsroom）</mark>。報紙排版時代，編輯會給每篇報導取一個簡短的「工作名稱」方便在排版流程中追蹤，那個短名就叫 slug；後來被引申到網頁開發。（更早則來自鉛字排版時代那塊叫 slug 的鉛條。）

**(l)** <mark style="background: #FF5582A6;">安全提醒</mark>：slug 來自使用者輸入，即使清洗過也<mark style="background: #FF5582A6;">不要直接串進 SQL 或檔案路徑</mark>。要特別擋掉 `..`、純數字（會跟 ID 路由撞車）以及保留字（`new`、`edit`、`admin`），否則 `/posts/new` 這種路由會被一篇標題叫「New」的文章劫走。

## 各對話來源

### 後端 Slug 的意思與應用（2026 年）— https://gemini.google.com/app/8ff8fd6b3ab708c9

<mark style="background: #FFF3A3A6;">使用者：後端的 slug 是啥意思</mark>

Gemini：定義 Slug 為 URL 中易於閱讀、用來辨識特定資源的那一段（重點 a）；用「如何學習 JavaScript」對比 ID 型與 Slug 型網址的優缺點（重點 b）；列出全小寫、連字號分隔、唯一性、不可變性四個特徵，並提到需建唯一索引與 301 重導向（重點 c）；說明後端處理的生成／衝突／查詢三階段並附查詢程式碼（重點 e）；給出一支 `createSlug` 產生器範例（重點 f，<mark style="background: #FF5582A6;">此處有錯，見下</mark>）；最後補充 slug 一詞源自新聞編採的工作名稱（重點 k）。

> 註：重點 (d)(g)(h)(i)(j)(l) 為本次整理時補充，原對話未涵蓋。

## ⚠️ 存疑／更正

<mark style="background: #FF5582A6;">Gemini 的 `createSlug` 範例輸出結果標錯了。</mark>它宣稱 `createSlug("Node.js 101: 快速上手指南！")` 會輸出 `"nodejs-101-快速上手指南"`，但 JavaScript 的 `\w` 只等於 `[A-Za-z0-9_]`，因此 `[^\w-]+` 會把所有中文字一併刪除，<mark style="background: #FF5582A6;">實際輸出是 `"nodejs-101-"`</mark>。可自行在瀏覽器 Console 貼上驗證。本篇重點 (f)(g) 已標示錯誤並給出使用 `\p{L}`／`\p{N}` 加 `u` 旗標的正確版本。

另外 Gemini 未提到衝突處理在並發下的競爭條件（重點 i）、slug 與保留字路由撞車的風險（重點 l），這兩點在實作時比「怎麼生 slug」更容易踩雷。

## 資料來源（含查證時間）

> 查證日期：2026-08-08（Gemini 對話為 2026 年，模型 Flash；正規表達式行為與 SEO 建議另依下列文件核實）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話原文 | [後端 Slug 的意思與應用](https://gemini.google.com/app/8ff8fd6b3ab708c9) | 2026 年 |
| `\w` 的定義與 Unicode 屬性跳脫 `\p{L}` | [MDN — Regular expressions: Unicode character class escape](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape) | MDN，持續更新 |
| Google 建議 URL 用連字號而非底線 | [Google Search Central — URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure) | Google 官方文件，持續更新 |
| 301 永久重導向的語意 | [MDN — 301 Moved Permanently](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301) | MDN，持續更新 |
| URL 百分比編碼（中文網址的實際傳輸形式） | [RFC 3986 — Uniform Resource Identifier: Percent-Encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1) | RFC 3986（2005 發布，現行標準） |
| `String.prototype.normalize`（NFKC 全形轉半形） | [MDN — String.prototype.normalize()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize) | MDN，持續更新 |

## 相關筆記

- [[CRUD_ARCHITECTURE_EXPLANATION]]——關聯原因：本篇 (e) 的「改用 slug 查詢而非主鍵」直接影響 Repository 層的查詢方法設計，那篇的 CRUD 分層是落地位置。
- [[資料庫索引與B+tree-最左字首原則]]——關聯原因：(c) 說 slug 欄位要建唯一索引、(e) 說沒索引會全表掃描；那篇解釋為什麼字串欄位的索引成本與整數主鍵不同，是選擇「ID 路由 vs slug 路由」的效能依據。
- [[SQL-Join-Inner-Left-Right-主表判定與資料保留]]——關聯原因：(j) 提到的 `post_slug_history` 歷史表，查詢時就是拿 posts 對它做 LEFT JOIN；本篇給場景、那篇給語法。
- [[MySQL外鍵與字元集問題筆記]]——關聯原因：(h) 保留中文 slug 時，欄位若不是 `utf8mb4` 會直接存不進去或截斷；那篇的字元集與定序問題是中文 slug 的前置條件。
- [[glob-pattern-guide]]——關聯原因：同屬「正規表達式與樣式比對」主題，本篇 (f)(g) 的 `\w` vs `\p{L}` 陷阱，跟那篇 glob 與 regex 的範圍差異是同一類容易混淆的字元集問題。
- [[TANSTACK_ROUTER_ROUTE_GENERATION]]——關聯原因：(l) 提到的「slug 跟保留字路由撞車」在前端路由也一樣會發生；那篇的路由生成規則決定了 `/posts/new` 與 `/posts/$slug` 誰優先匹配。
