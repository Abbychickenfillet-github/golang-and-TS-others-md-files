---
title: PostgreSQL 與 Postgres 命名差異與資料庫發展史
type: topic-note
source: Gemini
category: 技術
tags: [gemini, database, postgresql, history, ingres]
sources:
  - https://gemini.google.com/app/4865dff657acd024
updated: 2026-06-25
---

# PostgreSQL 與 Postgres 命名差異與資料庫發展史

## 重點整理

### 1. PostgreSQL 跟 Postgres 是同一個東西嗎？

> [!check] 是同一個東西
> <mark style="background: #ADCCFFA6;">PostgreSQL 是正式官方名稱，Postgres 是社群／開發者最常用的簡稱（官方認可的別名）</mark>。

| 特性 | PostgreSQL | Postgres |
|---|---|---|
| 性質 | 正式官方名稱 | 常用簡稱／別名 |
| 建議場景 | 正式文件、履歷、論文、合約 | 口頭、社群討論、技術文章 |
| 常見於 | 套件名 `postgresql-server` | 指令 `postgres -V` |

命名由來：<mark style="background: #FFF3A3A6;">Ingres → Post-gres（Post-Ingres，Ingres 的後繼者）→ Postgres95（1995 加入 SQL）→ PostgreSQL（1996 為強調支援 SQL 標準而正式更名）</mark>。`PostgreSQL` 是 PostgreSQL 全球開發小組的註冊商標。

> [!tip] 搜尋小撇步
> 兩個關鍵字通常可互換，但搜 `PostgreSQL` 通常能拿到更精確的官方技術細節。

### 2. Ingres 是什麼

> [!info] Ingres = PostgreSQL 的「祖先」
> Ingres（Interactive Graphics Retrieval System）是 1970 年代早期在 <mark style="background: #ADCCFFA6;">加州大學柏克萊分校（UC Berkeley）</mark> 開發的研究型關聯式資料庫，由 <mark style="background: #FFF3A3A6;">Michael Stonebraker 教授</mark> 帶領。

- 它是最早實現關聯式模型的系統之一。
- 是 PostgreSQL 的直系前身（Postgres = Post-Ingres）。
- 影響了 Microsoft SQL Server、Sybase 等商業資料庫。

| 特性 | Ingres | PostgreSQL |
|---|---|---|
| 誕生 | 1973 | 1986（Postgres 期刊發表） |
| 查詢語言 | QUEL（後來才支援 SQL） | SQL（標準） |
| 現況 | 商業／開源併行（Actian） | 全球最受歡迎開源資料庫之一 |

> [!note] 小知識
> Ingres 確立的許多技術（<mark style="background: #D2B3FFA6;">B-tree 索引、查詢優化</mark>）至今仍深深影響你寫的每一行 SQL。

### 3. 資料庫發展史簡表（從「森林」到「關聯」）

1. **前關聯式（1960s）**：階層式模型（樹狀）、網狀模型（多對多但極複雜）。缺點是<mark style="background: #FF5582A6;">程式碼與資料結構高度耦合</mark>，改欄位就要重寫程式。
2. **轉折點（1970）**：IBM 的 <mark style="background: #FFF3A3A6;">E. F. Codd 發表論文，用集合論把資料放進二維表格，用鍵值建立關聯</mark>，資料庫不再需要處理物理存取路徑，只專注邏輯結構。
3. **三大門派（1970s–80s）**：IBM System R（發明了 SQL）、Oracle（Larry Ellison 讀了 Codd 論文搶先做商用版）、Ingres（UC Berkeley，開源／PostgreSQL 的發源地）。
4. **SQL 統治（1990s）**：MySQL 出現（1995，輕量、Web 2.0 寵兒）；Postgres 加入 SQL → 改名 PostgreSQL。
5. **NoSQL / NewSQL（2000s–2010s）**：MongoDB、Redis 放棄部分強一致性換水平擴展；NewSQL/HTAP 想結合 SQL 嚴謹與 NoSQL 擴充。

> [!quote] 歷史的趣味
> 現在許多最新技術（如<mark style="background: #FFB8EBA6;">向量資料庫、向量檢索</mark>）核心仍是在擴充 PostgreSQL 的功能——證明 40 年前 Ingres 奠定的「可擴充性」架構多麼前瞻。

---

## 自我測驗

1. （是非題）PostgreSQL 與 Postgres 是兩套不同的資料庫。
   答案：||✗。同一個東西，PostgreSQL 是正式名稱，Postgres 是官方認可的簡稱。||
2. （填空）Postgres 名稱的意思是 ||Post-Ingres（Ingres 的後繼者）||。
3. （申論題）簡述 E. F. Codd 1970 年的論文為什麼是資料庫發展的轉折點。
   答案：||他提出用數學集合論處理資料，把資料存進二維表格、以鍵值建立關聯。從此資料庫不必再處理物理存取路徑，開發者只需專注邏輯結構，解決了前關聯式時代「程式碼與資料結構高度耦合、改欄位就要重寫程式」的痛點，催生了 System R、Oracle、Ingres 三大計畫與 SQL。||

---

## 各對話來源

### PostgreSQL 與 Postgres 的區別（2026-06）— https://gemini.google.com/app/4865dff657acd024

使用者：PostgreSQL 跟 Postgres 有不一樣嗎？

Gemini：它們是指同一個東西。PostgreSQL 是正式官方名稱，Postgres 是社群與開發者最常用的簡稱／別名。由來：Ingres → Post-gres（Post-Ingres）→ Postgres95（1995 加入 SQL）→ PostgreSQL（1996 為強調支援 SQL 標準而正式更名）。正式文件用 PostgreSQL，口頭與社群常用 Postgres，兩者搜尋時可互換，但搜 PostgreSQL 通常拿到更精確的官方細節。

使用者：ingres 是什麼？

Gemini：Ingres（Interactive Graphics Retrieval System）是 1970 年代早期在 UC Berkeley 開發的研究型關聯式資料庫，由 Michael Stonebraker 教授帶領，是最早實現關聯式模型的系統之一，也是 PostgreSQL 的直系前身（Postgres = Post-Ingres）。它影響了 Microsoft SQL Server、Sybase。Ingres 1973 年誕生、用 QUEL 語言；PostgreSQL 1986 年（Postgres 期刊發表）、用標準 SQL。Ingres 所確立的 B-tree 索引、查詢優化等概念至今仍影響著 SQL。

使用者：單純對資料庫發展史感興趣。

Gemini：資料庫演進——前關聯式（1960s）有階層式、網狀模型，缺點是程式碼與資料結構高度耦合；轉折點（1970）E. F. Codd 發表論文用集合論把資料放進二維表格、用鍵值建立關聯；三大門派（1970s–80s）IBM System R（發明 SQL）、Oracle（搶先做商用）、Ingres（開源／PostgreSQL 發源地）；1990s SQL 黃金期，MySQL 出現、Postgres 加入 SQL 改名 PostgreSQL；2000s–2010s NoSQL（MongoDB、Redis）與 NewSQL/HTAP 興起。有趣的是現在最新的向量資料庫核心仍是在擴充 PostgreSQL。
