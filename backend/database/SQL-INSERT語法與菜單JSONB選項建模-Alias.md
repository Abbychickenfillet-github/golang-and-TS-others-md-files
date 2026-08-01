---
title: SQL INSERT 語法、AS Alias 與菜單資料的 JSONB 選項建模
type: topic-note
source: Gemini
tags: [gemini, sql, postgresql, database, jsonb, alias]
sources:
  - https://gemini.google.com/app/7a772dbf62bb2d5f
updated: 2026-07-27
---

# SQL INSERT 語法、AS Alias 與 JSONB 選項建模

本篇重點 a–i，共 9 個

## 重點整理

a. 把實體菜單圖片轉換成 PostgreSQL `INSERT` 語法時，要先確認目標資料表的<mark style="background: #FFF3A3A6;">欄位順序與型別</mark>，欄位順序錯了即使值對也會插進錯欄位：

```sql
INSERT INTO menu_items (
  id, category_id, name, description, price, notes,
  image_url, sort_order, status, created_at, updated_at, deleted_at
) VALUES
(gen_random_uuid(), '2ab0c7f3-...', '雙份義式濃縮', 'Double Espresso (Hot)',
 110, NULL, NULL, 1, 'active', now(), now(), NULL),
...
```

b. `gen_random_uuid()`：PostgreSQL 用來自動產生 UUID 主鍵，確保每筆資料 `id` 唯一，不需要自己手動編號。

c. Schema 常見約束：`id` 用 `char(36)`（UUID 格式）、`price` 用 `decimal(10,2)`（限制小數位數，符合金額精度）、`status` 用 `varchar(20) default 'active'`、`deleted_at` 支援 <mark style="background: #ADCCFFA6;">軟刪除（Soft Delete）</mark>——預設 `NULL`，刪除時填入時間戳而非真的砍掉資料列。

d. <mark style="background: #ADCCFFA6;">`SELECT COUNT(*) AS total`</mark> 中的 `AS`（別名 Alias）：把計算結果的欄位名稱從預設的 `COUNT(*)` 改成好讀、好在程式中對應的 `total`。若不加別名，輸出欄位抬頭會直接顯示 `COUNT(*)`，在後端 Struct 映射或程式中讀取會很麻煩。

```sql
SELECT COUNT(*) AS total,
       SUM(CASE WHEN coordinate IS NULL THEN 1 ELSE 0 END) AS coord_null,
       SUM(CASE WHEN position_x IS NULL THEN 1 ELSE 0 END) AS posx_null,
       SUM(CASE WHEN map_id IS NULL THEN 1 ELSE 0 END) AS mapid_null
FROM booth WHERE deleted_at IS NULL;
```

上例是「資料完整性檢查」：算出未刪除的攤位總數，以及座標／X 座標／地圖 ID 缺漏的筆數，常用於上線前檢查資料是否完整。

e. `AS` 別名的用途不只是好讀：在做 `SUM(CASE ...)` 這種複雜邏輯運算時，**必須**用別名才能清楚分辨各項統計結果，也方便後端把查詢結果映射（Mapping）到 Struct 的 `Total`、`CoordNull` 等欄位。

f. <mark style="background: #FF5582A6;">價格欄位的建模陷阱</mark>：若品項有「冷熱不同價」或多種規格（容量、豆種），單一 `price` 欄位無法表達。解法是把 `price` 升級成 `options`（JSONB）欄位，存放動態屬性：

```json
// 冷熱同價
[{"name": "Hot", "price_adjustment": 0}, {"name": "Ice", "price_adjustment": 0}]
// 冷熱不同價（冰 +10）
[{"label": "熱 (Hot)", "price": 130}, {"label": "冰 (Ice)", "price": 140}]
```

下單時 `order_items`（本身已是 `list[dict[str, Any]]` 存成 JSON column，不是獨立資料表）要記錄使用者實際選中的規格，例如 `"selected_option": "Ice"`。

g. <mark style="background: #FFB8EBA6;">黃金準則：能在程式碼算的就不要在資料庫裡算</mark>——但這條準則的適用範圍是有限的：

| 類型 | 範例 | 建議留在 SQL？ |
|---|---|---|
| 篩選 Filter | `WHERE status = 'paid'` | 一定要，否則會撈出全表再在程式裡篩，浪費資源 |
| 關聯 Join | `JOIN users ON ...` | 通常要，資料庫對關聯有高度優化（Index Join） |
| 排序 Sort | `ORDER BY created_at` | 通常要，有索引的話資料庫排序近乎瞬間 |

h. JOIN、子查詢（Subquery）、聚合函式（`SUM`/`AVG`/`COUNT`）都屬於「資料庫運算」而非要搬到程式碼的運算。真正該搬到程式碼算的是：<mark style="background: #FF5582A6;">會讓索引失效的函式運算</mark>，例如對欄位用 `REPLACE(order_number, '-', '')` 再比對——每筆資料都要先跑一次函式，索引失效變全表掃描。正確做法是在 Go/Python 裡先把字串處理好（例如去掉 `-`），再丟給 SQL 做「精確匹配」，索引才會生效。

i. 架構層級判斷：單體架構（Monolith）大膽用 JOIN，是 SQL 的強項；微服務/分散式架構下可能會避免跨資料庫的 JOIN，改成程式碼分別呼叫兩個 API 再手動拼接資料。

## 自我測驗

1. （填空題）`SELECT COUNT(*) AS total` 中的 `AS` 稱為 ______，作用是把計算結果的欄位名稱從預設的 `COUNT(*)` 改成好讀、好在程式中對應的名字。
   答案：||別名（Alias）||
2. （是非題）JOIN、子查詢、SUM/AVG/COUNT 這類聚合運算都應該搬到程式碼（Go/Python）裡處理，才符合「能搬到程式碼算就不要在資料庫算」的原則。
   答案：||✗。JOIN、子查詢、聚合函式都屬於「資料庫運算」，資料庫對這些有高度優化，應該留在 SQL 做；真正該搬到程式碼的是「會讓索引失效」的函數運算，例如對欄位做 REPLACE 後再比對。||
3. （申論題）為什麼「冷熱不同價」這種需求，用單一 `price` 欄位無法表達，改用 JSONB `options` 欄位可以解決什麼問題？
   答案：||單一 price 欄位只能存一個固定金額，無法表達同一品項因規格（冷/熱、容量、豆種）不同而有不同價格的情況。JSONB options 欄位可以存放一組動態的規格與對應價格（如 [{"label":"熱","price":130},{"label":"冰","price":140}]），下單時再記錄使用者實際選中的規格，兼顧資料庫 Schema 的彈性與查詢效率，不需要為每種規格組合都開一個新欄位或新資料表。||

## 與既有筆記的關聯

- 與 [[backend/database/index/資料庫索引與B+tree-最左字首原則|資料庫索引與B+tree-最左字首原則]]（本次同時更新）強烈相關：本篇「（g）（h）（h）」提到的「對欄位用函數運算會讓索引失效」正是那篇筆記講的 B+ Tree 索引失效機制的具體案例，兩篇建議搭配讀。
- 與 [[backend/database/sql-syntax/HeidiSQL-匯出與ALTER-TABLE語法|HeidiSQL-匯出與ALTER-TABLE語法]]（本次同時更新）相關：都是 SQL DDL/DML 操作的日常筆記，一個講「怎麼寫 INSERT／設計 Schema」，一個講「HeidiSQL 這個 GUI 工具怎麼操作」。
- 與 [[frontend-docs/react/TipTap-Headless編輯器架構|TipTap-Headless編輯器架構]]（同一場對話延伸出的另一主題）相關：這場對話從「資料庫 INSERT」延伸到「後台要改用 Rich Editor 做大重構」，兩篇筆記合起來記錄了同一次規劃討論的完整脈絡，但因主題性質不同（資料庫建模 vs 前端編輯器架構）而拆成兩篇獨立筆記。

## 各對話來源（原文）

### SQL 插入咖啡產品資料（2026-07）— https://gemini.google.com/app/7a772dbf62bb2d5f

使用者：（提供 OrderItem 的 Model 與 Schema 定義，`order_items` 以 JSON column 儲存）目前只有局部咖啡的7 rows請幫我把其他的項目也寫成SQL語法讓我插入Postgresql(pgAdmin)

Gemini：根據菜單圖片與 `menu_categories` 的 id 對照表，整理成對應的 SQL `INSERT` 語法，使用 `gen_random_uuid()` 產生主鍵，並提醒「茶與特調」分頁截圖與義式咖啡分頁重複，暫未包含正確的茶類資料。

使用者：請你重新用這個欄位再用一次因為我觀察剛剛你的順序不太對

Gemini：根據新提供的 Schema 表格重新調整，完全對應欄位順序 `id, category_id, name, description, price, notes, image_url, sort_order, status, created_at, updated_at, deleted_at`，並補充 Schema 約束說明（`id` char(36)、`price` decimal(10,2)、`status` varchar(20) default 'active'、`deleted_at` 支援軟刪除）。

使用者：（後續延伸至前端重構需求，詳見 TipTap-Headless編輯器架構 筆記）...但是我們有冷熱的選項嗎? 冷熱用json格式?

Gemini：目前 `price` 是單一 decimal 欄位，無法處理冷熱不同價或多種選項。建議升級為 `options`（JSONB）欄位儲存動態屬性，並在下單時的 `order_items` JSON 中記錄使用者實際選中的規格（如 `selected_option`）。

使用者：`Docker exec backend-go-mysql-1 mysql -h hnd1.clusters.zeabur.com -P 32195 -u root -p'***' future_sign_stage -e "SELECT COUNT(*) as total, SUM(CASE WHEN coordinate IS NULL THEN 1 ELSE 0 END) as coord_null, ... FROM booth WHERE deleted_at IS NULL;"` SELECT COUNT(*) AS TOTAL 是把什麼存成total

Gemini：`AS total` 是把 `COUNT(*)` 這個計算結果的欄位名稱取別名為 `total`，方便後端程式或終端機讀取。此例是資料完整性檢查：算出未刪除攤位總數，以及座標／position_x／map_id 缺漏的筆數。`AS` 別名在複雜的 `SUM(CASE...)` 邏輯中是必要的，也方便映射到 Struct 欄位。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| SQL INSERT 語法、Alias、JSONB 選項建模討論 | https://gemini.google.com/app/7a772dbf62bb2d5f | Gemini 對話，2026-07，futuresign 專案脈絡 |
| PostgreSQL gen_random_uuid() 官方文件 | https://www.postgresql.org/docs/current/functions-uuid.html | 查證時請以官方文件最新版為準 |
| PostgreSQL JSONB 型別官方文件 | https://www.postgresql.org/docs/current/datatype-json.html | 查證時請以官方文件最新版為準 |

⚠️ 存疑/更正：`gen_random_uuid()` 需要 PostgreSQL 13+ 或啟用 `pgcrypto` 擴充套件才能使用，Gemini 未提及此版本前提，若資料庫版本較舊需改用 `uuid-ossp` 擴充套件的 `uuid_generate_v4()`。
