# Issue #308：品牌商品頁功能 (Brand Product)

> GitHub Issue: https://github.com/yutuo-tech/futuresign_backend/issues/308
> 參考資料：[電商資料庫設計參考文獻](ecommerce-db-design-references.md)

---

## Context

品牌商（vendor company）在活動中擺攤販售商品（食物、手工藝品、周邊等）。目前 `product` 表用途是**承包商設備**（桌椅、電力設備）。

計畫在既有 `product` 表新增 `sell_type` 欄位區分 `device`（設備）和 `vendor_goods`（品牌商品），不另建新表。

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
| `sell_type` | varchar(20), NOT NULL, default 'device' | 區分設備/品牌商品 |
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
| `ProductTypeID` | 設備分類（必填） | **不需要** → 改為可選 |
| `Deposit` | 押金 | NULL |
| `Specifications` | 規格 JSON | NULL |
| `PurchaseType` | rent/purchase | NULL |
| `*Quantity` | 庫存管理 | 全部為 0 |

---

## SQL 遷移

```sql
-- 1. 新增 sell_type 欄位
ALTER TABLE product
    ADD COLUMN sell_type VARCHAR(20) NOT NULL DEFAULT 'device' COMMENT '銷售類型: device=設備, vendor_goods=品牌商品';

-- 2. 品牌商品顯示期間
ALTER TABLE product
    ADD COLUMN display_start_at DATETIME NULL COMMENT '品牌商品顯示開始時間',
    ADD COLUMN display_end_at DATETIME NULL COMMENT '品牌商品顯示結束時間';

-- 3. 品牌商品對應的攤位預訂
ALTER TABLE product
    ADD COLUMN booth_booking_id VARCHAR(36) NULL COMMENT '對應攤位預訂 ID';

-- 4. ProductTypeID 改為可選
ALTER TABLE product
    MODIFY COLUMN product_type_id VARCHAR(36) NULL COMMENT '商品類型 ID（設備必填，品牌商品可選）';

-- 5. 索引
CREATE INDEX idx_product_sell_type ON product (sell_type);
CREATE INDEX idx_product_display ON product (event_id, sell_type, status, display_start_at, display_end_at);
```

---

## 議題一：ProductTypeID 改為可選，會不會影響既有設備資料？

### 問題

目前 `product_type_id` 是設備分類的必填欄位（每個設備都要歸類，例如「桌椅」、「電力設備」）。
但品牌商品**不需要**設備分類 — 品牌商品有自己的分類邏輯（食物、手工藝品、周邊等），跟設備分類完全不同。

所以要把 `product_type_id` 從 NOT NULL 改成 NULL：

```sql
ALTER TABLE product
    MODIFY COLUMN product_type_id VARCHAR(36) NULL COMMENT '商品類型 ID（設備必填，品牌商品可選）';
```

### 會影響既有資料嗎？

**不會。** `NOT NULL → NULL` 是放寬約束，不是收緊。

| 影響範圍 | 結果 |
|---|---|
| 既有設備資料（product_type_id 有值） | 完全不受影響，值還在 |
| 新建設備 | 程式碼端要繼續驗證必填（DB 不擋了，改由 service 層檢查） |
| 新建品牌商品 | product_type_id 留 NULL，不需要分類 |

### 需要注意的地方

DB 層放寬成 NULL 之後，**設備的必填驗證要移到程式碼端**：

```go
// service/product_service.go
func (s *ProductService) CreateProduct(dto ProductCreate) error {
    if dto.SellType == "device" && dto.ProductTypeID == "" {
        return errors.New("設備必須選擇商品類型")
    }
    // ...
}
```

這樣設備還是必填，品牌商品可以不填，邏輯在程式碼裡控制而不是 DB 約束。

### 未來考慮

如果品牌商品也需要分類，有兩條路：
1. **共用 product_type 表**：在 product_type 加 `category`（device / vendor_goods）區分
2. **品牌商品用 JSON**：把分類資訊存在 `specifications` JSON 欄位

目前階段不需要決定，先讓 product_type_id 可選就好。

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
- [Princeton — E-Commerce Database Design](https://www.princeton.edu/~rcurtis/ultradev/ecommdatabase2.html): 正規化做法，圖片表跟商品表一對多
- [AppMaster — Product Table in E-Commerce](https://appmaster.io/blog/product-table-in-e-commerce-databases): 推薦獨立 Images 表管理商品圖片
- 我們自己的 `event_image` 表就是這個模式（`event_id` + `image_url`），product_image 可以照搬

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
5. 設定 sell_type = "vendor_goods", provider_company_id = companyID
6. 建立商品

---

## 需要加 sell_type='device' filter 的地方

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
- `products.tsx` 新增 sell_type 篩選 Tab（device / vendor_goods）
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
- [ ] 既有功能：`GET /events/:id/equipment-available` 只回傳 device
- [ ] 品牌商有 confirmed booth → 成功上架商品
- [ ] 品牌商無 booth → 上架失敗
- [ ] 消費者看到品牌商品，超過顯示期間的不顯示
- [ ] 後台 products 頁面可切換 device / vendor_goods
