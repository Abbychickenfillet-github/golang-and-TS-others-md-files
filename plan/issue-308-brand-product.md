# Issue #308：品牌商品頁功能 (Brand Product)

> GitHub Issue: https://github.com/yutuo-tech/futuresign_backend/issues/308
> 參考資料：[電商資料庫設計參考文獻](ecommerce-db-design-references.md)

---

## Context

品牌商（vendor company）在活動中擺攤販售商品（食物、手工藝品、周邊等）。目前 `product` 表用途是**承包商設備**（桌椅、電力設備）。

計畫在既有 `product` 表新增 `sell_type` 欄位區分 `equipment`（設備）和 `vendor_merchandise`（品牌商品），不另建新表。

**前提條件**：品牌商必須先有 `booth_booking`（status=confirmed）才能在該活動上架商品。
**顯示期間**：可手動設定 `display_start_at` / `display_end_at`，預設跟隨活動時間。
**目前階段**：只做商品展示，不處理購買/預購/物流/金流。

---

## 涉及的 Repo

| Repo | 用途 |
|------|------|
| futuresign_monorepo/backend-go | Go 後端 API |
| futuresign.official_website | 前台消費者網站 (B2C+B2B) |
| futuresign.dashboard | 後台管理系統 (系統方) |

---

## Model 修改

### Product struct 新增 4 個欄位

| 欄位 | 型別 | 說明 |
|------|------|------|
| `sell_type` | varchar(20), NOT NULL, default 'equipment' | 區分設備/品牌商品（equipment/vendor_merchandise） |
| `display_start_at` | datetime, NULL | 品牌商品顯示開始時間（NULL=跟隨活動） |
| `display_end_at` | datetime, NULL | 品牌商品顯示結束時間（NULL=跟隨活動） |
| `booth_booking_id` | varchar(36), NULL | 品牌商品對應的攤位預訂 ID |

### 既有欄位複用對照

| Product 欄位 | 設備用途 | 品牌商品用途 |
|---|---|---|
| `Name` | 設備名稱 | 商品名稱 |
| `Description` | 設備描述 | 商品描述 |
| `ImgURL` | 設備圖片 | 商品圖片 |
| `Price` | 租金/售價 | 參考價格（可為 0） |
| `Currency` | 幣別 | 幣別 |
| `EventID` | 所屬活動 | 所屬活動（品牌商品必填） |
| `ProviderCompanyID` | 承包商公司 ID | 品牌商公司 ID |
| `ProductTypeID` | 設備分類（必填） | 品牌商品分類（必填）— 見[議題一](#議題一producttypeid-維持-not-null--品牌商品也要選分類)、[議題四](#議題四product_type-表也要加-sell_type-區分) |
| `Deposit` | 押金 | NULL |
| `Specifications` | 規格 JSON | NULL |
| `PurchaseType` | rent/purchase | NULL |
| `*Quantity` | 庫存管理 | 全部為 0 |

---

## SQL 遷移

```sql
-- 1. 新增 sell_type 欄位
ALTER TABLE product
    ADD COLUMN sell_type VARCHAR(20) NOT NULL DEFAULT 'equipment' COMMENT '銷售類型: equipment=設備, vendor_merchandise=品牌商品';

-- 2. 品牌商品顯示期間
ALTER TABLE product
    ADD COLUMN display_start_at DATETIME NULL COMMENT '品牌商品顯示開始時間',
    ADD COLUMN display_end_at DATETIME NULL COMMENT '品牌商品顯示結束時間';

-- 3. 品牌商品對應的攤位預訂
ALTER TABLE product
    ADD COLUMN booth_booking_id VARCHAR(36) NULL COMMENT '對應攤位預訂 ID';

-- 4. 索引（ProductTypeID 維持 NOT NULL，品牌商品也要選分類）
CREATE INDEX idx_product_sell_type ON product (sell_type);
CREATE INDEX idx_product_display ON product (event_id, sell_type, status, display_start_at, display_end_at);
```

---

## 議題一：ProductTypeID 維持 NOT NULL — 品牌商品也要選分類

> GitHub 子議題：[#309](https://github.com/yutuo-tech/futuresign_backend/issues/309)

### 結論

**`product_type_id` 不改成 NULL。** 品牌商品也必須選擇分類，只是選的是 `sell_type = 'vendor_merchandise'` 的分類（食物、手工藝品、周邊等），跟設備分類（桌椅、電力設備）隔離。

搭配[議題四](#議題四product_type-表也要加-sell_type-區分)，在 `product_type` 表加 `sell_type` 欄位區分，品牌商和承包商各自管理自己的分類，互不干擾。

### Service 層驗證

```go
// service/product_service.go — 驗證 product 和 product_type 的 sell_type 一致
func (s *ProductService) CreateProduct(dto ProductCreate) error {
    productType, _ := s.productTypeRepo.GetByID(dto.ProductTypeID)
    if productType.SellType != dto.SellType {
        return errors.New("商品類型與銷售類型不匹配")
    }
}
```

### ~~之前的想法（已棄用）~~

~~原本考慮把 `product_type_id` 改成 NULL，讓品牌商品不用選分類。~~ 但既然 `product_type` 表會加 `sell_type` 區分（議題四），品牌商品就該有自己的分類，不用把欄位改成可選。

---

## 議題二：品牌商品多張圖片的儲存方式

品牌商品可能有多張圖片（商品正面、側面、包裝等）。目前 product 表只有一個 `img_url` 欄位，只能存一張。以下比較三種做法：

### 做法 1：JSON 欄位（在 product 表加一個 JSON column）

```sql
ALTER TABLE product ADD COLUMN image_urls JSON COMMENT '商品圖片 URL 陣列';
-- 存的內容：["https://s3.../img1.jpg", "https://s3.../img2.jpg", "https://s3.../img3.jpg"]
```

| 優點 | 缺點 |
|---|---|
| 不用多開一張表，改動最小 | MySQL 無法直接對 JSON 內容加索引（需要 generated column） |
| 前端拿到就是陣列，不用額外 JOIN | 無法對單張圖片做 metadata 管理（排序、主圖標記、alt text） |
| 寫入簡單，一次 UPDATE 搞定 | JSON 內的資料無法加外鍵約束 |
| 適合「圖片就是一串 URL，不需要個別管理」的場景 | 如果要查「哪些商品用了某張圖片」很難做 |

**適合的場景**：圖片只是展示用，不需要排序、不需要標記主圖、不需要對單張圖片做操作。

**參考**：
- [Percona — JSON and Relational Databases](https://www.percona.com/blog/json-and-relational-databases-part-one/): 建議用 JSON 存動態/非結構化的資料，固定結構的欄位還是用傳統 column
- [MySQL JSON Guide](https://www.digibeatrix.com/db/en/mysql-en/data-types-en/mysql-json-type-array/): JSON 適合「不需要頻繁查詢和索引」的場景

### 做法 2：獨立的圖片表（一對多關聯）

```sql
CREATE TABLE product_image (
    id              VARCHAR(36) PRIMARY KEY,
    product_id      VARCHAR(36) NOT NULL,
    image_url       VARCHAR(500) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,    -- 排序（0=第一張）
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE, -- 是否為主圖
    created_at      DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_image_product ON product_image (product_id, sort_order);
```

| 優點 | 缺點 |
|---|---|
| 可以對每張圖片加 metadata（排序、主圖、alt text） | 多一張表 + repository + service |
| 可以加外鍵約束，刪商品自動刪圖片（CASCADE） | 查商品列表要 JOIN 或子查詢 |
| 可以對 image_url 加索引，查「某張圖片被哪些商品用」很容易 | 寫入要處理多筆 INSERT |
| **跟我們現有的 `event_image` 表是同樣的設計模式，一致性好** | — |
| 業界電商平台（Shopify、WooCommerce）都用獨立圖片表 | — |

**適合的場景**：圖片需要排序、標記主圖、未來可能加 alt text 或圖片分類。

**參考**：
- [DBA StackExchange #147274 — 如何設計商品多圖片 + 主圖標記](https://dba.stackexchange.com/questions/147274/how-would-i-model-a-product-to-have-multiple-image-urls-and-have-only-one-as-the): 討論三種主圖標記方式，見[下方詳細分析](#主圖標記的三種做法dba-stackexchange-147274)
- [Princeton — E-Commerce Database Design](https://www.princeton.edu/~rcurtis/ultradev/ecommdatabase2.html): 正規化做法，圖片表跟商品表一對多
- [AppMaster — Product Table in E-Commerce](https://appmaster.io/blog/product-table-in-e-commerce-databases): 推薦獨立 Images 表管理商品圖片
- 我們自己的 `event_image` 表就是這個模式（`event_id` + `image_url`）→ 但建議通用化為多態圖片表，見[議題三](#議題三通用化-event_image-表--多態圖片表)

### 做法 3：多個固定欄位（img_url_1, img_url_2, img_url_3...）

```sql
ALTER TABLE product
    ADD COLUMN img_url_2 VARCHAR(500),
    ADD COLUMN img_url_3 VARCHAR(500),
    ADD COLUMN img_url_4 VARCHAR(500),
    ADD COLUMN img_url_5 VARCHAR(500);
```

| 優點 | 缺點 |
|---|---|
| 最簡單，不用 JSON 也不用新表 | 上限固定（5 張就 5 張，要加就 ALTER TABLE） |
| 查詢直覺，不用 JOIN 或 JSON 解析 | 大量 NULL 欄位（只有 2 張圖片時 3 個欄位是 NULL） |
| — | 無法排序或標記主圖（除非再加 is_primary 之類的欄位） |
| — | 違反正規化（重複的欄位結構） |
| — | 前端要處理不確定數量的欄位（img_url_1 到 img_url_N） |

**適合的場景**：確定圖片數量上限很小（例如最多 3 張），且不需要任何 metadata。

### 三種做法比較

| | JSON 欄位 | 獨立圖片表 | 多個固定欄位 |
|---|---|---|---|
| 改動大小 | 小（加一個 column） | 中（新表 + CRUD） | 小（加幾個 column） |
| 圖片數量彈性 | 無上限 | 無上限 | 固定上限 |
| 排序/主圖標記 | 困難 | 容易（sort_order, is_primary） | 困難 |
| 查詢效能 | JSON 解析有開銷 | JOIN 但走 index 很快 | 最快（直接欄位） |
| 資料庫正規化 | 不符合（陣列塞一個欄位） | 符合（一對多正規關聯） | 不符合（重複結構） |
| 跟現有系統一致性 | — | **跟 event_image 一致** | — |
| 未來擴展性 | 中 | 高 | 低 |
| MySQL JSON 索引支援 | 差（需 generated column） | 好（直接加 index） | 好（直接加 index） |

### 建議

**做法 2（獨立圖片表）**最適合我們，理由：
1. 跟現有的 `event_image` 表設計一致，團隊已經熟悉這個模式
2. 品牌商品的圖片需要排序（第一張是主圖、商品詳情頁輪播）
3. 未來可能需要加 alt text（SEO / 無障礙）、圖片分類（主圖/細節/包裝）
4. 刪除商品時圖片自動 CASCADE 清除，不用手動處理
5. 業界電商平台（Shopify、WooCommerce）都用獨立圖片表

如果確定**只是簡單展示、不需要排序和主圖標記**，做法 1（JSON）也可以，改動最小。做法 3（多個固定欄位）不建議，太不彈性。

### 主圖標記的三種做法（DBA StackExchange #147274）

> 來源：[How would I model a product to have multiple image URLs and have only one as the default?](https://dba.stackexchange.com/questions/147274/how-would-i-model-a-product-to-have-multiple-image-urls-and-have-only-one-as-the)

當一個商品有多張圖片時，如何標記「哪一張是主圖」？業界有三種做法：

#### 做法 A：在父表加 `primary_image_id` 外鍵

```sql
-- 父表（商品）指向圖片表
ALTER TABLE product
    ADD COLUMN primary_image_id VARCHAR(36),
    ADD FOREIGN KEY (primary_image_id) REFERENCES image(id);
```

| 優點 | 缺點 |
|---|---|
| **資料庫層級保證只有一張主圖**（FK 就是唯一值） | 循環依賴：product → image → product |
| 查詢主圖只需要一次 JOIN | 插入順序問題：要先建圖片才能設主圖 |
| 不需要額外的 is_primary 欄位 | 刪除主圖時要先把 FK 設 NULL 再刪 |

#### 做法 B：在圖片表加 `is_primary` 布林欄位

```sql
-- 圖片表加布林標記
ALTER TABLE image
    ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;
```

| 優點 | 缺點 |
|---|---|
| 直覺、簡單 | **無法在 DB 層保證每個商品只有一張 is_primary=TRUE**（MySQL 不支援 partial unique index） |
| 查詢方便 `WHERE is_primary = TRUE` | 需要 service 層邏輯確保唯一性 |
| 沒有循環依賴 | 批量更新時要先 `SET FALSE` 再 `SET TRUE`（兩步操作） |

> **MySQL 限制**：PostgreSQL 可以用 `CREATE UNIQUE INDEX ... WHERE is_primary = TRUE` 做 partial unique index，MySQL 做不到。所以如果用 MySQL，唯一性只能靠程式碼保證。

#### 做法 C：用 `display_order` 排序，最小值=主圖

```sql
-- 不加 is_primary，直接用 display_order=0 當主圖
-- 查主圖：
SELECT * FROM image WHERE entity_id = ? ORDER BY display_order ASC LIMIT 1;
```

| 優點 | 缺點 |
|---|---|
| 不需要額外欄位 | 語義不明確（「第一張就是主圖」是隱含規則） |
| 重新排序自動改主圖 | 查主圖要 ORDER BY + LIMIT，比直接 WHERE 慢一點 |
| 沒有一致性問題 | 如果 display_order 有重複值，主圖不確定 |

#### 三種做法比較

| | primary_image_id (FK) | is_primary (布林) | display_order (排序) |
|---|---|---|---|
| DB 層保證唯一主圖 | ✅ 外鍵 | ❌ MySQL 做不到 | ❌ 隱含規則 |
| 查詢主圖效能 | 最快（直接 JOIN） | 快（WHERE 條件） | 稍慢（ORDER BY + LIMIT） |
| 實作複雜度 | 高（循環依賴） | 低 | 最低 |
| 額外欄位 | 在父表加一個 | 在圖片表加一個 | 不需要（複用 display_order） |

#### 我們的建議

**用做法 C（display_order）**，理由：
1. 我們現有的 `event_image` 已經有 `display_order` 欄位
2. MySQL 不支援 partial unique index，所以做法 B 的 is_primary 也沒有 DB 層保證
3. 既然都要靠程式碼保證，不如直接用排序來定義主圖，少一個欄位
4. 前端輪播本來就需要排序，主圖就是第一張

如果你覺得 `display_order=0 就是主圖` 的語義太隱晦，可以做法 B + C 合併（同時有 is_primary 和 display_order），讓查詢更明確。

**參考**：
- [DBA StackExchange #147274](https://dba.stackexchange.com/questions/147274/how-would-i-model-a-product-to-have-multiple-image-urls-and-have-only-one-as-the): 原始討論
- [Prisma GitHub Discussion #4197](https://github.com/prisma/prisma/discussions/4197): 開發者討論 `is_primary = true` 的唯一約束問題，結論是 MySQL 層做不到，只能靠 application 層
- [Magento 2 圖片儲存機制](https://www.rakeshjesadiya.com/how-product-images-are-saved-in-database-magento-2/): Magento 用 `position` 欄位做排序，position=0 為主圖
- [Spatie Laravel-MediaLibrary](https://spatie.be/docs/laravel-medialibrary/v11/advanced-usage/ordering-media): 5,800+ GitHub stars 的媒體庫，用 `order_column` 排序，沒有 `is_primary` 欄位 — 第一張就是主圖
- [SQL Anti-Patterns: Boolean Flags](https://github.com/boralp/sql-anti-patterns): boolean flag 是公認的 SQL anti-pattern，`is_primary` 就是這種情況

---

## 議題三：通用化 event_image 表 → 多態圖片表

### 現有的 event_image 表結構

```sql
CREATE TABLE event_image (
    id              VARCHAR(36) PRIMARY KEY,
    event_id        VARCHAR(36) NOT NULL,         -- 只能存活動
    image_url       TEXT NOT NULL,
    image_type      VARCHAR(20) NOT NULL DEFAULT 'banner',  -- banner/thumbnail/gallery
    display_order   INT NOT NULL DEFAULT 0,
    alt_text        VARCHAR(255) NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',   -- active/disabled
    deleted_at      TIMESTAMP NULL,               -- 軟刪除
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL,
    FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE
);
```

### 問題

`event_image` 只能存活動的圖片。現在品牌商品也需要多圖片，如果再建一個 `product_image` 表，schema 幾乎一模一樣 — 只差 FK 是 `event_id` 還是 `product_id`。未來如果 booth、company 也需要多圖片呢？每個實體建一張圖片表不合理。

### 提案：多態圖片表（entity_type + entity_id）

把 `event_image` 改名為 `image`（或 `entity_image`），用 `entity_type` + `entity_id` 取代 `event_id`：

```sql
-- 方案：重新命名 + 改為多態關聯
RENAME TABLE event_image TO image;

ALTER TABLE image
    ADD COLUMN entity_type VARCHAR(50) NOT NULL DEFAULT 'event' COMMENT '關聯實體類型 (event, product, booth, company...)',
    ADD COLUMN entity_id VARCHAR(36) NOT NULL COMMENT '關聯實體 ID';

-- 資料遷移：把現有的 event_id 搬到 entity_id
UPDATE image SET entity_type = 'event', entity_id = event_id;

-- 移除舊的 event_id
ALTER TABLE image DROP FOREIGN KEY fk_event_image_event_id;
ALTER TABLE image DROP COLUMN event_id;

-- 新索引
CREATE INDEX idx_image_entity ON image (entity_type, entity_id, display_order);
CREATE INDEX idx_image_entity_type_status ON image (entity_type, entity_id, image_type, status);
```

改完後的 schema：

```sql
CREATE TABLE image (
    id              VARCHAR(36) PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,          -- 'event', 'product', 'booth', 'company'...
    entity_id       VARCHAR(36) NOT NULL,          -- 對應實體的 UUID
    image_url       TEXT NOT NULL,
    image_type      VARCHAR(20) NOT NULL DEFAULT 'banner',  -- banner/thumbnail/gallery
    display_order   INT NOT NULL DEFAULT 0,
    alt_text        VARCHAR(255) NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    deleted_at      TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- 無 FK（跟 action_log 的 entity_id 一樣，MySQL 無法對多態 FK 做約束，靠 service 層驗證）
    CHECK (entity_type IN ('event', 'product', 'booth', 'company'))
);
```

### entity_type 值與 image_type 值

| entity_type | 適用的 image_type | 說明 |
|---|---|---|
| `event` | `banner`, `thumbnail`, `gallery` | 活動橫幅、縮圖、相簿 |
| `product` | `main`, `detail`, `gallery` | 商品主圖、細節圖、相簿 |
| `booth` | `banner`, `gallery` | 攤位裝飾照、展示照 |
| `company` | `logo`, `banner` | 公司 logo、品牌橫幅 |

> image_type 的值可以跨 entity_type 共用（如 `banner`、`gallery`），也可以有特定的值（如 `logo` 只有 company 用）。CHECK 約束可以不限定 image_type 的值，讓它保持彈性。

### 跟分開建表的比較

| | 多態圖片表（一張表） | 每個實體各自建表 |
|---|---|---|
| 表數量 | 1 張 | N 張（event_image, product_image, booth_image...） |
| Schema 維護 | 改一次就好 | 每張都要改 |
| Repository / Service | 一套，用 entity_type 參數化 | N 套，幾乎一樣的 CRUD |
| FK 約束 | 無（靠 service 層） | 有（每張表各自 FK） |
| 查詢效能 | 靠 `(entity_type, entity_id)` 複合索引 | 每張表天然隔離 |
| 跟 action_log 一致性 | ✅ 同樣的多態模式 | ❌ 不一致 |

### updated_at 要不要保留？

**保留 `updated_at`。** 理由：

圖片表不像 `action_log` 那樣是 append-only。圖片有合理的 UPDATE 場景：

| 操作 | 動作 | 需要 updated_at？ |
|---|---|---|
| 上傳圖片 | INSERT | 只需要 created_at |
| 刪除圖片 | 軟刪除（SET deleted_at） | ✅ updated_at 紀錄刪除時間 |
| 重新排序 | UPDATE display_order | ✅ updated_at 紀錄排序變更 |
| 改 alt_text | UPDATE alt_text | ✅ updated_at 紀錄文字變更 |
| 停用圖片 | UPDATE status='disabled' | ✅ updated_at 紀錄狀態變更 |

**跟 action_log 的差別**：
- `action_log` 是純紀錄（發生了就不變），所以不需要 `updated_at`
- `image` 是**會被修改的實體**（排序、停用、編輯 alt text），所以需要 `updated_at`

判斷標準很簡單：**如果一筆資料寫進去之後會被 UPDATE，就需要 `updated_at`；如果永遠不會被 UPDATE（append-only），就不需要。**

### 參考文獻

**多態圖片表（entity_type + entity_id）**：
- [DoltHub — Choosing a Database Schema for Polymorphic Data](https://www.dolthub.com/blog/2024-06-25-polymorphic-associations/): 評估五種多態資料的做法，推薦 tagged union（entity_type + entity_id）模式
- [Hashrocket — Modeling Polymorphic Associations in a Relational Database](https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database): 比較四種做法，認為 `resource_type` + `resource_id` 是最簡單且最被廣泛採用的方式
- [LogRocket — Polymorphic Relationships in Laravel](https://blog.logrocket.com/polymorphic-relationships-laravel/): Laravel 內建的 `imageable_id` + `imageable_type` 就是同樣的模式，「找出多個 model 之間的相似之處，在此基礎上構建，而不是重複建表」
- [Spatie Laravel-MediaLibrary](https://spatie.be/docs/laravel-medialibrary/v11/advanced-usage/ordering-media): 5,800+ GitHub stars 的媒體管理套件，使用單一多態 `media` 表 + `model_type` + `model_id`
- [Laracasts 討論 — 多態圖片表 vs 每個 model 各自建表](https://laracasts.com/discuss/channels/eloquent/is-having-a-polymorphic-table-for-storing-my-image-information-more-efficient-than-a-separate-table-for-each-model): 社群共識是圖片 metadata 結構完全相同，分開建表是多餘的

**`sell_type` discriminator column（equipment / vendor_merchandise）**：
- [Java Design Patterns — Single Table Inheritance](https://java-design-patterns.com/patterns/single-table-inheritance/): `sell_type` 是教科書級的 STI discriminator column 實作
- [Baeldung — Hibernate Inheritance Mapping](https://www.baeldung.com/hibernate-inheritance): Hibernate 原生支援 `@DiscriminatorColumn`，查詢只需要 `WHERE sell_type = ?`
- [Microsoft EF Core — Inheritance (TPH)](https://learn.microsoft.com/en-us/ef/core/modeling/inheritance): 微軟選擇 Table-Per-Hierarchy（discriminator column）作為預設的繼承對應策略
- [Difference.wiki — Goods vs Merchandise](https://www.difference.wiki/goods-vs-merchandise/): "Goods" 是廣義的生產品，"Merchandise" 特指**零售展示的商品** — 品牌商在攤位展示賣給消費者，用 merchandise 更精確
- [AskDifference — Product vs Merchandise](https://www.askdifference.com/product-vs-merchandise/): Merchandise 強調「選品、展示、銷售策略」— 正是品牌商在活動中的行為

### 遷移計畫

如果採用多態圖片表，遷移步驟：

1. `RENAME TABLE event_image TO image` — 改名
2. 加 `entity_type` + `entity_id` 欄位
3. `UPDATE image SET entity_type = 'event', entity_id = event_id` — 資料搬移
4. 移除 `event_id` 欄位和舊 FK
5. 加新索引
6. Go model 從 `EventImage` 改名為 `Image`
7. 更新所有引用 `event_image` 的 repository/service/handler

---

## 議題四：product_type 表也要加 sell_type 區分

### 問題

目前 `product_type` 只存設備的分類（桌椅、電力設備、音響設備等）。未來品牌商品如果也需要分類（食物、手工藝品、周邊等），兩種分類會混在同一張表裡。

**核心問題不是查詢不方便，而是會互相干擾：**

| 風險情境 | 後果 |
|---|---|
| 承包商刪除「桌椅」分類 | 如果品牌商商品也用了這個分類 → 品牌商的商品分類被連帶刪除 |
| 承包商改名「電力設備」→「電氣設備」 | 品牌商的商品分類名稱也被改了，品牌商不知情 |
| 系統管理員清理不用的設備分類 | 可能誤刪品牌商正在用的分類 |
| 品牌商建了「食物」分類 | 承包商建設備時下拉選單會看到「食物」，很困惑 |

**總結：兩種角色的分類生命週期完全獨立，混在一起管理會互相影響到對方的資料。**

### 解法：加 sell_type 欄位

```sql
ALTER TABLE product_type
    ADD COLUMN sell_type VARCHAR(20) NOT NULL DEFAULT 'equipment'
    COMMENT '適用的銷售類型: equipment=設備分類, vendor_merchandise=品牌商品分類';

CREATE INDEX idx_product_type_sell_type ON product_type (sell_type);
```

加完之後：

| 操作 | SQL |
|---|---|
| 承包商看設備分類 | `SELECT * FROM product_type WHERE sell_type = 'equipment'` |
| 品牌商看商品分類 | `SELECT * FROM product_type WHERE sell_type = 'vendor_merchandise'` |
| 承包商刪除分類 | 只影響 `sell_type = 'equipment'` 的資料，品牌商不受影響 |
| 品牌商新增分類 | 只新增 `sell_type = 'vendor_merchandise'` 的資料，承包商看不到 |

### 跟 product 表的 sell_type 呼應

product 和 product_type 都用同一個 discriminator 值（`equipment` / `vendor_merchandise`），查詢和篩選邏輯一致：

```sql
-- 查品牌商品 + 對應的商品分類（如果有的話）
SELECT p.*, pt.name AS type_name
FROM product p
LEFT JOIN product_type pt ON p.product_type_id = pt.id
WHERE p.sell_type = 'vendor_merchandise';
-- pt.sell_type 應該也是 'vendor_merchandise'，可以加 service 層驗證
```

### 需要的程式碼變更

| 檔案 | 變更 |
|---|---|
| `models/product_type.go` | 新增 `SellType` 欄位 |
| `dto/product_type.go` | Create/Update/Public/Filter 新增 SellType |
| `repository/product_type_repository.go` | 查詢加 sell_type 篩選 |
| `handler/product_type_handler.go` | API 回傳加 sell_type |
| `service/product_service.go` | 驗證 product 和 product_type 的 sell_type 一致 |

---

## 新增 API 端點

| HTTP | 路徑 | Auth | 說明 |
|------|------|------|------|
| GET | `/events/:id/vendor-goods` | TryBothAuth | 消費者查看活動品牌商品 |
| POST | `/vendor-goods` | MemberAuthRequired | 品牌商上架商品 |
| GET | `/vendor-goods/my` | MemberAuthRequired | 品牌商查看自己的商品 |

更新/刪除複用既有 `PATCH /products/:id` 和 `DELETE /products/:id`

---

## 業務邏輯：CreateVendorGoods

1. 透過 memberID 查 member_company → 取得 companyID
2. 確認 company.Role == "vendor"
3. 查 booth_booking WHERE company_id = ? AND status = 'confirmed'，且 booth 的 event_id 匹配
4. 若無 confirmed 的 booth_booking → 403 錯誤
5. 設定 sell_type = "vendor_merchandise", provider_company_id = companyID
6. 建立商品

---

## 需要加 sell_type='equipment' filter 的地方

| 檔案 | 方法/位置 | 說明 |
|------|-----------|------|
| `repository/product_repository.go` | `applyFilter()` | 所有列表查詢基礎 |
| `repository/general_contractor_repository.go` | `GetContractorProducts()` | 承包商商品列表 |
| `service/registration_service.go` | line 411-443 | 訂單內直接查 product |
| `handler/product_handler.go` | `GetAvailableEquipment` | 活動設備列表 |
| `dto/product.go` | `ProductFilter` | 新增 SellType 篩選 |
| `dto/product.go` | `ProductCreate/Update/Public` | 新增 SellType 欄位 |
| `dashboard/products.tsx` | ProductPublic interface | 新增 sell_type |
| `official_website/lib/api/types.ts` | Product interface | 新增 sell_type |

---

## 前端變更

### Official Website (前台)
- `EventDetailPage.tsx` 新增「品牌商品」Section
- `VendorDashboardPage.tsx` 新增「我的商品」管理
- `src/lib/api/vendorGoods.ts` 新建 API 呼叫

### Dashboard (後台)
- `products.tsx` 新增 sell_type 篩選 Tab（equipment / vendor_merchandise）
- ProductPublic interface 新增欄位

---

## 修改檔案清單

| 檔案 | 變更 |
|------|------|
| `backend-go/internal/models/product.go` | 新增 SellType 常數 + 4 個欄位 |
| `backend-go/internal/dto/product.go` | Create/Update/Public/Filter 新增欄位 |
| `backend-go/internal/repository/product_repository.go` | applyFilter + GetVendorGoodsByEvent |
| `backend-go/internal/service/product_service.go` | 3 新方法 + 既有方法加 filter |
| `backend-go/internal/service/general_contractor_service.go` | 加 sell_type filter |
| `backend-go/internal/service/registration_service.go` | 直接 SQL 加 filter |
| `backend-go/internal/handler/product_handler.go` | 3 新 handler |
| `backend-go/cmd/server/main.go` | 註冊 3 新路由 |
| `sql/203_add_sell_type_to_product.sql` | ALTER TABLE |
| `official_website/src/lib/api/types.ts` | Product interface |
| `official_website/src/lib/api/vendorGoods.ts` | 新建 API |
| `official_website/src/pages/EventDetailPage.tsx` | 品牌商品 Section |
| `official_website/src/pages/VendorDashboardPage.tsx` | 我的商品管理 |
| `dashboard/src/routes/_layout/products.tsx` | sell_type Tab |

---

## 驗證方式

- [ ] `go build ./...` 編譯通過
- [ ] `make lint` 通過
- [ ] 既有功能：`GET /events/:id/equipment-available` 只回傳 equipment
- [ ] 品牌商有 confirmed booth → 成功上架商品
- [ ] 品牌商無 booth → 上架失敗
- [ ] 消費者看到品牌商品，超過顯示期間的不顯示
- [ ] 後台 products 頁面可切換 equipment / vendor_merchandise
