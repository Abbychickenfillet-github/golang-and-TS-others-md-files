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
