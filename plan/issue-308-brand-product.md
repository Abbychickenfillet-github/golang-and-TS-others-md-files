# Issue #308：品牌商品頁功能 (Brand Product)

> GitHub Issue: https://github.com/yutuo-tech/futuresign_backend/issues/308
> 參考資料：[電商資料庫設計參考文獻](ecommerce-db-design-references.md)

---

## Context

品牌商（vendor company）在活動中擺攤販售商品（食物、手工藝品、周邊等）。目前 `product` 表用途是**承包商設備**（桌椅、電力設備）。

### 架構決策：獨立 `booth_product` 表

~~原本計畫在 `product` 表加 `sell_type` 欄位區分 `equipment` 和 `vendor_merchandise`。~~

**最終決策：建立獨立的 `booth_product` 表**，理由：

| 考量 | 共用 `product` + `sell_type` | 獨立 `booth_product` 表 |
|------|:-:|:-:|
| 欄位差異 | 大量 NULL（設備的 deposit/purchase_type/maintenance_quantity 品牌商品不用，品牌商品的 booth_id/sort_order 設備不用） | 各表只有自己需要的欄位，乾淨 |
| 業務邏輯 | 共用 service 需大量 if/else 區分 | 各自獨立的 CRUD，清楚 |
| API 設計 | 路由需加 sell_type 篩選 | `/products` = 設備，`/booth-products` = 品牌商品，RESTful |
| 未來擴展 | 加欄位影響兩種商品 | 各自演進，互不影響 |
| 查詢效能 | 需 WHERE sell_type = ? 篩選 | 天然隔離，不需額外篩選 |

**前提條件**：品牌商必須先有已付款的 `booth_order_subscription` 才能在該攤位上架商品。

---

## 涉及的 Repo

| Repo | 用途 |
|------|------|
| futuresign_monorepo/backend-go | Go 後端 API |
| futuresign.official_website | 前台消費者網站 (B2C+B2B) |
| futuresign.dashboard | 後台管理系統 (系統方) |

---

## `booth_product` vs `product` 欄位對比

| 欄位 | `booth_product` | `product` | 說明 |
|------|:-:|:-:|------|
| `id` | v | v | 相同 |
| `name` | v | v | 相同 |
| `description` | v | v | 相同 |
| `img_urls` | v JSON 多圖 | x (img_url text 單圖) | booth_product 用 JSON 支援多圖+排序 |
| `price` | v | v | 相同 |
| `currency` | v | v | 相同 |
| `total_quantity` | v | v | 相同 |
| `available_quantity` | v | v | 相同 |
| `reserved_quantity` | v | v | 相同 |
| `specifications` | v | v | 相同 |
| `status` | v | v | 相同 |
| `sort_order` | v | x | 商品排序（品牌商品獨有） |
| `valid` | v | v | 相同 |
| `delete_comment` | v | v | 相同 |
| `deleted_at` | v | v | 相同 |
| `created_at` | v | v | 相同 |
| `updated_at` | v | v | 相同 |
| `booth_id` | v | x | booth_product 獨有（綁定攤位） |
| `event_id` | v NOT NULL | v NULL | booth_product 必填 |
| `vendor_company_id` | v | x | booth_product 獨有 |
| `product_type_id` | x | v NOT NULL | 設備分類（品牌商品不需要） |
| `provider_company_id` | x | v | 承包商公司 ID（設備用） |
| `deposit` | x | v | 設備押金 |
| `purchase_type` | x | v | rent/purchase（設備用） |
| `maintenance_quantity` | x | v | 維修中庫存（設備用） |

---

## Model：booth_product

### GORM struct

```go
type BoothProduct struct {
    ID              string  `gorm:"type:varchar(36);primaryKey"`
    BoothID         *string `gorm:"type:varchar(36);index;comment:scope=booth 時必填"`
    EventID         *string `gorm:"type:varchar(36);index;comment:scope=booth 時必填"`
    VendorCompanyID string  `gorm:"type:varchar(36);not null;index"`
    Scope           string  `gorm:"type:varchar(20);not null;default:booth;comment:booth=攤位專屬 global=全域"`
    Name            string  `gorm:"type:varchar(255);not null"`
    Description       *string         `gorm:"type:text"`
    ImgURLs           json.RawMessage `gorm:"type:json;comment:商品圖片 JSON 陣列"`
    Price             decimal.Decimal `gorm:"type:decimal(12,2);not null;default:0.00"`
    Currency          string          `gorm:"type:varchar(3);not null;default:TWD"`
    TotalQuantity     int             `gorm:"type:int;not null;default:0"`
    AvailableQuantity int             `gorm:"type:int;not null;default:0"`
    ReservedQuantity  int             `gorm:"type:int;not null;default:0"`
    Specifications    json.RawMessage `gorm:"type:json"`
    Status            string          `gorm:"type:varchar(20);not null;default:active"`
    SortOrder         int             `gorm:"type:int;not null;default:0;comment:商品排序"`
    Valid             bool            `gorm:"type:tinyint(1);not null;default:1"`
    DeleteComment     *string         `gorm:"type:varchar(255)"`
    DeletedAt         gorm.DeletedAt  `gorm:"type:datetime(6);index"`
    CreatedAt         time.Time       `gorm:"type:datetime(6);not null;autoCreateTime"`
    UpdatedAt         time.Time       `gorm:"type:datetime(6);not null;autoUpdateTime"`
}
```

---

## `img_urls` JSON 格式：多圖片 + 排序

### 決策

採用 **JSON 欄位**存多張圖片，用 `order` 欄位排序（`order: 0` = 主圖）。

~~原本考慮三種做法（JSON / 獨立圖片表 / 多欄位），最終選 JSON。~~ 理由：

1. **品牌商品圖片不需要獨立 metadata**（不需要 alt_text、image_type 等），只是一組 URL + 順序
2. **一次 UPDATE 搞定排序**，不用管多筆 INSERT/DELETE
3. **前端拿到就是陣列**，不用額外 JOIN
4. **改動最小**，不用多開一張表 + repository + service

### JSON Schema

```json
[
  {"url": "https://s3.../product-front.jpg", "order": 0},
  {"url": "https://s3.../product-side.jpg", "order": 1},
  {"url": "https://s3.../product-package.jpg", "order": 2}
]
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `url` | string | 圖片 URL（完整路徑） |
| `order` | int | 排序順序（0 = 主圖，數字越小越前面） |

### 前端排序邏輯

```typescript
// 取得排序後的圖片列表
const sortedImages = (product.img_urls ?? [])
  .sort((a, b) => a.order - b.order)

// 主圖 = order 最小的那張
const primaryImage = sortedImages[0]?.url
```

### Go 型別定義

```go
// BoothProductImage 商品圖片
type BoothProductImage struct {
    URL   string `json:"url"`
    Order int    `json:"order"`
}
```

### 為什麼不用純陣列 `["url1", "url2"]`？

純陣列用 index 當排序，**重新排序時必須重建整個陣列**。用 `order` 欄位：
- 可以只更新單張圖片的 `order` 值
- 刪除中間的圖片不影響其他圖片的順序
- 前端拖拉排序只需要更新 `order` 值，不用重組陣列

### 與議題二（獨立圖片表）的關係

原本議題二建議用獨立的 `product_image` 表（類似 `event_image`）。在 `booth_product` 獨立表的架構下，JSON 欄位更合適：

| | JSON 欄位 (img_urls) | 獨立圖片表 (booth_product_image) |
|---|---|---|
| 品牌商品場景 | 夠用（展示幾張圖） | 過度設計 |
| 排序 | `order` 欄位 | `sort_order` 欄位 |
| 主圖 | `order: 0` | `sort_order = 0` 或 `is_primary` |
| 查詢 | 一次 SELECT 拿到 | 需要 JOIN 或子查詢 |
| 圖片數量 | 適合 < 20 張 | 無上限 |
| 單圖 metadata | 只有 url + order | 可加 alt_text、image_type 等 |

**結論**：品牌商品的圖片需求簡單（展示用、通常 3-10 張），JSON 方案最適合。如果未來 `event` 的圖片管理要通用化，再考慮多態圖片表。

---

## SQL 建表

```sql
CREATE TABLE `booth_product` (
  `id` varchar(36) NOT NULL COMMENT '攤位商品 ID',
  `booth_id` varchar(36) NULL COMMENT '攤位 ID（scope=booth 時必填）',
  `event_id` varchar(36) NULL COMMENT '活動 ID（scope=booth 時必填）',
  `vendor_company_id` varchar(36) NOT NULL COMMENT '廠商公司 ID',
  `scope` varchar(20) NOT NULL DEFAULT 'booth' COMMENT 'booth=攤位專屬, global=全域商品',
  `name` varchar(255) NOT NULL COMMENT '商品名稱',
  `description` text COMMENT '商品描述',
  `img_urls` json COMMENT '商品圖片 JSON 陣列 [{"url":"...","order":0}]',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '價格',
  `currency` varchar(3) NOT NULL DEFAULT 'TWD' COMMENT '幣別',
  `total_quantity` int NOT NULL DEFAULT 0 COMMENT '總庫存',
  `available_quantity` int NOT NULL DEFAULT 0 COMMENT '可用庫存',
  `reserved_quantity` int NOT NULL DEFAULT 0 COMMENT '已預訂庫存',
  `specifications` json COMMENT '商品規格 JSON',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '狀態',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '商品排序順序',
  `valid` tinyint(1) NOT NULL DEFAULT 1 COMMENT '資料是否有效',
  `delete_comment` varchar(255) COMMENT '刪除原因',
  `deleted_at` datetime(6) COMMENT '刪除時間',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '創建時間',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新時間',
  PRIMARY KEY (`id`),
  INDEX `idx_booth_product_booth_id` (`booth_id`),
  INDEX `idx_booth_product_event_id` (`event_id`),
  INDEX `idx_booth_product_vendor` (`vendor_company_id`),
  INDEX `idx_booth_product_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **注意**：`img_urls` 取代了舊的 `img_url`（text -> json），欄位名加了 `s`。
> 如果已有 `booth_product` 表使用 `img_url` text，需要遷移：
> ```sql
> ALTER TABLE booth_product ADD COLUMN img_urls JSON COMMENT '商品圖片 JSON 陣列';
> UPDATE booth_product SET img_urls = JSON_ARRAY(JSON_OBJECT('url', img_url, 'order', 0)) WHERE img_url IS NOT NULL;
> ALTER TABLE booth_product DROP COLUMN img_url;
> ```

---

## API 端點

| HTTP | 路徑 | Auth | 說明 |
|------|------|------|------|
| GET | `/booth-products` | TryBothAuth | 查詢攤位商品列表 |
| GET | `/booth-products/:id` | TryBothAuth | 查詢單一攤位商品 |
| POST | `/booth-products` | MemberAuthRequired | 品牌商新增商品 |
| PATCH | `/booth-products/:id` | MemberAuthRequired | 品牌商更新商品 |
| DELETE | `/booth-products/:id` | MemberAuthRequired | 品牌商刪除商品 |
| GET | `/booth-products/me` | MemberAuthRequired | 品牌商查看自己的商品 |

### 與設備 API 的隔離

| 設備 (product) | 品牌商品 (booth_product) |
|---|---|
| `GET /products` | `GET /booth-products` |
| `POST /products` | `POST /booth-products` |
| `PATCH /products/:id` | `PATCH /booth-products/:id` |
| `DELETE /products/:id` | `DELETE /booth-products/:id` |

兩套獨立的 handler -> service -> repository，互不影響。

---

## 業務邏輯：CreateBoothProduct

1. 從 JWT 取得 memberID
2. 透過 memberID 查 member_company -> 取得 companyID
3. 確認 company.Role == "vendor"
4. 查 `booth_order_subscription` WHERE booth_id = ? AND order.payment_status = 'PAID'
5. 若無已付款的攤位訂閱 -> 403 錯誤
6. 設定 `vendor_company_id = companyID`, `booth_id`, `event_id`
7. 建立商品

---

## 議題：通用化 event_image 表 -> 多態圖片表

> 此議題與 `booth_product` 的 `img_urls` JSON 無關，是獨立的架構優化。

`event_image` 表目前只能存活動圖片。如果未來 `booth`、`company` 也需要多圖片管理（含 alt_text、image_type 等 metadata），可以考慮通用化為多態圖片表：

```sql
RENAME TABLE event_image TO image;
ALTER TABLE image
    ADD COLUMN entity_type VARCHAR(50) NOT NULL DEFAULT 'event',
    ADD COLUMN entity_id VARCHAR(36) NOT NULL;
UPDATE image SET entity_type = 'event', entity_id = event_id;
```

**但 `booth_product` 的圖片不需要走這套** -- JSON 欄位已足夠。多態圖片表適合需要豐富 metadata 的場景（活動 banner、公司 logo 等）。

---

## 前端變更

### Official Website (前台)
- `VendorBoothProductsPage.tsx` -- 品牌商管理攤位商品（已完成）
- `EventDetailPage.tsx` -- 消費者查看活動品牌商品（待做）
- `src/lib/api/booth-products.ts` -- API 呼叫（已完成）
- 圖片上傳/排序 UI -- 配合 `img_urls` JSON 格式（待做）

### Dashboard (後台)
- 管理員可查看/管理所有品牌商品（待做）

---

## 修改檔案清單

| 檔案 | 變更 | 狀態 |
|------|------|------|
| `backend-go/internal/models/booth_product.go` | Model 定義 | 已完成 |
| `backend-go/internal/dto/booth_product.go` | DTO 定義 | 已完成 |
| `backend-go/internal/repository/booth_product_repository.go` | CRUD | 已完成 |
| `backend-go/internal/service/booth_product_service.go` | 業務邏輯 | 已完成 |
| `backend-go/internal/handler/booth_product_handler.go` | HTTP handler | 已完成 |
| `backend-go/cmd/server/main.go` | 路由註冊 | 已完成 |
| `official_website/src/lib/api/booth-products.ts` | 前端 API | 已完成 |
| `official_website/src/pages/VendorBoothProductsPage.tsx` | 商品管理頁 | 已完成 |
| `backend-go/internal/models/booth_product.go` | img_url -> img_urls JSON | 待更新 |
| `official_website/src/pages/VendorBoothProductsPage.tsx` | 多圖上傳/排序 UI | 待更新 |
| `official_website/src/pages/EventDetailPage.tsx` | 消費者查看品牌商品 | 待做 |

---

## 驗證方式

- [ ] `go build ./...` 編譯通過
- [ ] `make lint` 通過
- [ ] `booth_product` 表建立成功
- [ ] 品牌商有已付款攤位 -> 成功上架商品
- [ ] 品牌商無已付款攤位 -> 顯示「尚未訂購攤位」提示
- [ ] `img_urls` JSON 存入/讀出正確，排序正確
- [ ] `sort_order` 排序生效
- [ ] 消費者在活動頁看到品牌商品（待做）
