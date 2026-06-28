---
title: 資料庫索引與 B+tree、最左字首原則
type: topic-note
source: Gemini
category: 技術
tags: [gemini, database, index, btree, postgresql, mysql, sql]
sources:
  - https://gemini.google.com/app/f9fb4f2a231da48f
  - https://gemini.google.com/app/04b574c548a8bb2b
updated: 2026-06-25
---

# 資料庫索引與 B+tree、最左字首原則

> [!info] 這篇在講什麼
> 把「B-tree／B+tree 結構」「叢集 vs 非叢集索引」「最左字首原則」「哪些欄位適合建索引」「軟刪除 `deleted_at` 的索引設計」「Partial Index」整合成一篇。跨 MySQL 與 PostgreSQL 兩套系統。

## 重點整理

### 1. 索引是什麼（一句話）

<mark style="background: #ADCCFFA6;">索引（Index）就像書後面的目錄</mark>：不用把整本書讀完，靠目錄直接翻到頁碼。資料庫用它<mark style="background: #FFF3A3A6;">以極快速度定位特定資料，不必掃整張表</mark>。任何資料表都能建索引，不是只有 junction table 才有。

### 2. B-tree vs B+tree（為什麼中間層 40、葉子卻到 49）

> [!question] Q：B+tree 的中間層數字和葉子節點數字為什麼不一樣？
> 答案：||中間層（內部節點）只負責「導航、指路」，數字是用來引導搜尋方向的；真正存放實際資料鍵值的是「葉子節點」。兩者記錄的東西不同，數字不一樣很正常。||

- <mark style="background: #FFF3A3A6;">B+tree 的葉子節點之間用鏈結串起來（linked list）</mark>，所以範圍查詢超快。
- 範例 `WHERE id BETWEEN 30 AND 70` 之所以常被拿來示範，是因為它<mark style="background: #D2B3FFA6;">剛好跨越樹的不同分支</mark>：先從根節點定位起點 30，再順著葉子節點的鏈結一路掃到 70，完美展示 B+tree 的範圍查詢效率。

### 3. 叢集索引 vs 非叢集索引

> [!tip] 核心差異在「葉子節點裡放什麼」
> - **叢集索引（Clustered）**：索引結構和資料本身綁在一起，找到葉子就直接拿到完整資料，而且<mark style="background: #BBFABBA6;">資料在磁碟上的排序就照這個鍵值排</mark>。
> - **非叢集索引（Non-clustered）**：葉子節點存的是<mark style="background: #FFB8EBA6;">指向資料的「地址」</mark>，必須再多一次查詢才能拿到完整資料。

- MySQL（InnoDB）的資料表<mark style="background: #FFF3A3A6;">本身就是叢集索引（索引組織表）</mark>，會自動且強制依主鍵（Primary Key）順序實體儲存，所以 <mark style="background: #FF5582A6;">MySQL 不支援也不需要 `CLUSTER` 指令</mark>。
- PostgreSQL 才有 `CLUSTER 表名 USING 索引名;`，用來依某索引把資料表做一次性的實體重排。

### 4. 哪些欄位「適合」建索引

- <mark style="background: #ADCCFFA6;">高選擇性（High Cardinality）</mark>：重複值少、獨特值多，如 `email`、`user_id`、`phone`。
- 經常出現在 `WHERE` 篩選條件的欄位（如 `status`、`created_at`）。
- 多表 `JOIN` 用的外鍵（`order_id`、`customer_id`）。
- 經常 `ORDER BY` / `GROUP BY` 的欄位 —— 因為 B-tree 本身就是排好序的，可省去排序動作。

### 5. 哪些欄位「不適合」建索引

> [!warning] 索引不是越多越好
> - 資料量極小的表（幾十～幾百筆）：直接全表掃描（Sequential Scan）通常更快。
> - <mark style="background: #FF5582A6;">低選擇性欄位</mark>：如 `gender`、`is_deleted`（true/false），建了 B-tree 也常被查詢器忽略。
> - <mark style="background: #FF5582A6;">頻繁被更新的欄位</mark>：每次資料變更都要同步改所有相關索引，太多索引嚴重拖慢寫入。
> - 超長文字（`TEXT`/`BLOB`）：要搜尋請用全文檢索（Full-Text Search）或 Partial Index。

維運健康值：<mark style="background: #FFF3A3A6;">每張表維持 3～5 個核心索引</mark>最理想；18 個明顯偏多。

### 6. 最左字首原則（Leftmost Prefix Rule）

複合索引就像一本依 `(姓氏, 名字)` 印刷的電話簿：先按姓氏排，姓氏相同才按名字排。

對索引 `(member_id, created_at, deleted_at)`：

| 查詢 | 能用索引嗎 | 原因 |
|---|---|---|
| `WHERE member_id=5 AND created_at>'2026-01-01'` | ⭕ 極快 | 命中最左兩欄（1→2） |
| `WHERE member_id=5 AND deleted_at IS NULL` | ⚠️ 部分 | 跳過中間的 `created_at`，`deleted_at` 無法在索引精準定位，只能找到 member 後逐筆過濾 |
| `WHERE created_at>'2026-01-01'` | ❌ 失效 | 跳過最左的 `member_id`，只能全表掃描 |

> [!question] Q：為什麼有了 `(member_id, created_at, deleted_at)`，舊的 `(member_id, deleted_at)` 就可以刪？
> 答案：||因為兩者最左欄都是 member_id，當執行 `WHERE member_id=5` 時兩個索引都能用；大索引已經涵蓋了小索引最左欄的查詢場景，再留小索引只是白白浪費硬碟空間。||

### 7. 軟刪除 `deleted_at` 出現在多個索引裡，是問題嗎？

> [!check] 通常不是問題，是軟刪除架構下的「正常現象」
> 採用 Soft Delete 時，幾乎每句 `SELECT` 都會加 `WHERE deleted_at IS NULL`。不同查詢情境（依 user 查 / 依 activity 查）是獨立的，沒辦法靠單一索引兼顧，所以 `deleted_at` 自然會出現在多組複合索引裡。

代價（B+tree 的隱形成本）：<mark style="background: #FFB8EBA6;">索引變大、寫入變慢</mark>——每多一個含 `deleted_at` 的索引，INSERT/UPDATE 時就多一棵 B+tree 要維護。

> [!tip] PostgreSQL 的終極解法：Partial Index（部分索引）
> 不把 `deleted_at` 當索引「欄位」，而是當建立索引的「條件」，只把還活著的資料建進 B+tree：
> ```sql
> CREATE INDEX idx_user_active_posts
> ON posts (user_id)
> WHERE deleted_at IS NULL;
> ```
> 好處：<mark style="background: #BBFABBA6;">超省空間（樹裡完全沒有已刪除資料）、Key 變乾淨（只需 user_id）、查詢 `WHERE user_id=123 AND deleted_at IS NULL` 完美命中</mark>。

### 8. 怎麼把所有索引一次撈出來

```sql
-- PostgreSQL：用高階視圖 pg_indexes（比 join pg_class/pg_index 更穩、不易出錯）
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

```sql
-- MySQL：查單表
SHOW INDEX FROM YourTableName;
-- MySQL：查整個資料庫
SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM information_schema.statistics
WHERE TABLE_SCHEMA = 'your_db'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

> [!danger] 常見踩雷：跑錯資料庫系統 / 打錯字
> - <mark style="background: #FF5582A6;">`pg_class`、`pg_index`、`pg_attribute` 是 PostgreSQL 專屬系統目錄，MySQL 看不懂</mark>。錯誤訊息出現 `corresponds to your MySQL server version` 就是「走錯棚」。
> - 打錯字：`= =ix.indexrelid`（多一個 `=`）、`ix.indkey_`（尾巴多底線）都會語法錯誤。
> - MySQL 不支援 PostgreSQL 的陣列操作符 `ANY(...)`。

### 9. HeidiSQL 的 `Collation: A` 是什麼

> [!question] Q：HeidiSQL 索引欄位顯示 Collation = A，是英文字母 A 嗎？
> 答案：||不是字母 A，是 **Ascending（升冪／由小到大）** 的縮寫。代表索引在資料庫內依該欄位由小到大排序儲存；降冪會顯示 D。所以下 `ORDER BY ... ASC` 時能直接吃排好序的索引，省 CPU。||

也要注意：HeidiSQL 看到同一個 `Key_name` 配不同 `Column_name`、`Seq_in_index` 1/2/3，那其實是<mark style="background: #FFF3A3A6;">一個三欄位複合索引</mark>，不是三個獨立索引；若整組重複出現兩次，就是 migration 重跑產生的髒資料，刪掉一組。

### 10. 延伸：購物車「一張訂單多個商品」= 多對多

`order` 與 `product` 是多對多（M:N），不能在 `order` 塞多個 product_id，要用中間表 `order_item` / `order_product`：

```sql
CREATE TABLE order_product (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  buy_price INT NOT NULL,           -- 🌟 歷史購買價快照(不可即時 join product，否則漲價會讓舊訂單金額亂掉)
  quantity INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_op_order FOREIGN KEY (order_id) REFERENCES `order`(id) ON DELETE CASCADE,
  CONSTRAINT fk_op_product FOREIGN KEY (product_id) REFERENCES product(id),
  INDEX idx_op_order_id (order_id),
  INDEX idx_op_product_id (product_id)
);
```

> 進一步的資料表關係設計，見同層筆記資料夾 `購物車資料表設計`。

---

## 自我測驗

1. （是非題）MySQL InnoDB 需要手動執行 `CLUSTER` 來讓資料依主鍵排序。
   答案：||✗。InnoDB 本身就是索引組織表，自動依主鍵實體排序，沒有也不能用 CLUSTER（那是 PostgreSQL 的功能）。||
2. （是非題）`WHERE created_at > '2026-01-01'` 可以命中複合索引 `(member_id, created_at)`。
   答案：||✗。跳過了最左欄 member_id，索引失效，只能全表掃描。||
3. （申論題）說明在大量採用軟刪除（soft delete）的系統，為什麼 PostgreSQL 推薦用 Partial Index 取代「把 deleted_at 塞進每個複合索引」。
   答案：||因為傳統做法會讓每個索引都多存一個時間欄位，樹變大、寫入時要維護多棵 B+tree。Partial Index 把 `deleted_at IS NULL` 當成建索引的條件而非欄位，只索引「還活著」的資料，樹更小更淺、Key 只需要業務欄位，且查詢 `WHERE x=? AND deleted_at IS NULL` 仍能完美命中，兼顧空間與速度。||

---

## 各對話來源

### B-tree 與 B+tree 差異（2026-06）— https://gemini.google.com/app/f9fb4f2a231da48f

使用者：我為什麼這邊藍色的中間層，它寫到 40，可是 leaf node 的卻到 49？

Gemini：在 B+ 樹的結構中，中間層的節點只負責導航，所以上面的「40」只是用來引導搜尋方向的，而葉子節點裡存放的才是實際的資料鍵值，兩者記錄的方式不同，所以數值不一樣是很正常的。

使用者：那為什麼要用示範範圍查詢 `WHERE id BETWEEN 30 AND 70` 呢？為什麼要用這個當例子？

Gemini：因為這個查詢跨越了樹中的不同分支，正好可以展示 B+ 樹如何從根節點定位到查詢範圍的起點 30，然後順著葉子節點之間的鏈結串列依序掃描，直到包含 70 為止，展現它在範圍查詢時的高效性。

使用者：我還是不太懂叢集和非叢集的差異。

Gemini：最主要的差異在於索引節點裡放的是什麼。叢集索引的索引結構和資料本身綁在一起，找到葉子節點就能直接拿到完整資料，而且資料在磁碟上的排序就是照這個鍵值排的；非叢集索引的葉子節點存放的是指向資料的地址，必須再多一次查詢才能找到完整資料。

使用者：不同的 key 上出現 deleted_at 是一個問題嗎？

Gemini：通常不是問題，而是配合軟刪除查詢效能的必然結果。因為業務查詢（例如找某使用者的未刪除文章）同時需要過濾特定 key 加上 `deleted_at IS NULL`，資料庫必須依賴這些含 deleted_at 的索引才能跑得快。代價是索引變大、寫入效能被稍微拖慢。PostgreSQL 的終極解法是部分索引（Partial Index）：把 `deleted_at IS NULL` 當成建立索引的條件而非欄位，只把還活著的資料建進 B+ 樹，既省空間、Key 又乾淨、查詢還能完美命中。

### 資料庫 CLUSTER / 找出所有索引（2026-06）— https://gemini.google.com/app/04b574c548a8bb2b

使用者：資料庫我要用 CLUSTER 之前要先找出所有索引，為何失敗哪打錯？

Gemini：主因是走錯棚——你連線的是 MySQL，但寫了 `pg_class`、`pg_index`、`pg_attribute` 這些 PostgreSQL 專屬系統目錄，MySQL 看不懂。另外第 12 行多打了一個 `=`、第 13 行 `ix.indkey` 尾巴多底線且斷掉，MySQL 也不支援 `ANY(...)`。MySQL 不支援 CLUSTER（那是 PostgreSQL 特有，依索引對資料表做實體排序）；MySQL InnoDB 本身就是索引組織表，自動依主鍵實體儲存。查索引請用 `SHOW INDEX FROM 表;` 或查 `information_schema.statistics`。

使用者：pgAdmin 中要怎麼呈現所有 PostgreSQL 的 index？有哪些 column 適合當索引？

Gemini：GUI 可在 Browser 展開 Database → Schema → Tables → 該表 → Indexes 資料夾。SQL 則查 `pg_indexes`（高階視圖，比 join pg_class/pg_index 更好用）。適合建索引的欄位：高選擇性（email、user_id）、常出現在 WHERE 的欄位、JOIN 用外鍵、常 ORDER BY/GROUP BY 的欄位。不適合：資料量極小的表、低選擇性（gender、is_deleted）、頻繁更新的欄位、超長文字欄位。

使用者：你看我這邊有加索引，你覺得加得好嗎？

Gemini：命名統一、有考慮 deleted_at 是優點；但有嚴重重複（出現多組一模一樣的複合索引，如第 12/13、17/18 列重複）、把不適合的長字串欄位 `banner_image_url`（Cardinality 只有 7）拿來建 BTREE、以及與短索引功能重疊的問題。建議刪除 banner_image_url 索引、刪掉重複索引、清理被更長複合索引覆蓋的舊單/雙欄位索引，每張表維持 3～5 個核心索引。

使用者：為何在 idx_event_member_created 我加了 member_id, created_at, deleted_at，Index_type 是 BTREE，可是 COLLATION A 代表什麼？這三個 column 有什麼問題嗎？Key_name 一樣可是 column 不同。

Gemini：COLLATION 的 A 是 Ascending（升冪）的縮寫，代表索引依該欄位由小到大排序儲存。Key_name 相同、Seq_in_index 1/2/3、Column 不同，代表這三列共同組成一個三欄位複合索引，不是三個獨立索引。真正的問題是你重複建了兩組一模一樣的複合索引，且和舊的 `(member_id, deleted_at)` 功能重疊（最左字首原則下被大索引涵蓋），請把重複與被覆蓋的清掉。

使用者：Leftmost Prefix Rule 我還是不太確定複合式索引的意思。

Gemini：複合索引就像一本依 `(姓氏, 名字)` 排序印刷的電話簿，先按姓氏排，姓氏相同才按名字排。最左字首原則：必須從最左欄開始匹配，跳過最左欄索引就失效。找「姓陳」⭕、找「陳小東」⭕、只找「名字=小東」❌（要全表掃描）。套到 `(member_id, created_at, deleted_at)`：`member_id=5 AND created_at>...` 極快；`member_id=5 AND deleted_at IS NULL` 部分有效（跳過 created_at）；只用 `created_at>...` 完全失效。

使用者：我如果要做一個購物車的資料表設計 order, product, member，product 如果要多個商品 order 要怎麼設計？

Gemini：member→order 是一對多；order 與 product 是多對多，要用中間表 `order_item`/`order_product` 解開。四張表：member、product、order（只記總體資訊：誰買的、總金額、狀態），以及中間表 order_product（order_id、product_id、buy_price 歷史購買價快照、quantity）。中間表的 buy_price 一定要存當下價格快照，不能即時 join product，否則商品漲價或打折會讓歷史訂單金額對不起來。並幫外鍵 order_id、product_id 建索引，JOIN 才會快。
