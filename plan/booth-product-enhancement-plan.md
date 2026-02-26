# 攤位商品系統強化計畫

> 建立日期：2026-02-26
> 對應 Issues：#66 ~ #70 (official_website repo)

---

## 總覽

| # | Issue | 優先級 | 前端 | 後端 | 難度 |
|---|-------|--------|------|------|------|
| 1 | [#66 防止主辦方自購](https://github.com/yutuo-tech/future_sign.official-website/issues/66) | 🔴 高 | ✅ | ✅ | ⭐ 低 |
| 2 | [#67 已預訂數量+訂購者](https://github.com/yutuo-tech/future_sign.official-website/issues/67) | 🔴 高 | ✅ | ✅ | ⭐⭐ 中 |
| 3 | [#68 品牌資訊顯示](https://github.com/yutuo-tech/future_sign.official-website/issues/68) | 🟡 中 | ✅ | ✅ | ⭐⭐ 中 |
| 4 | [#69 取消申請流程](https://github.com/yutuo-tech/future_sign.official-website/issues/69) | 🟡 中 | ✅ | ✅ | ⭐⭐⭐ 高 |
| 5 | [#70 手機版 RWD](https://github.com/yutuo-tech/future_sign.official-website/issues/70) | 🟡 中 | ✅ | ❌ | ⭐⭐ 中 |

---

## 1. 防止主辦方自購 (#66)

### 問題
主辦方能在自己的活動頁訂購商品，容易誤按。保留商品只需調降 `total_quantity`。

### 方案

**前端（EventBoothProductsSection.tsx）：**
```tsx
// 判斷：當前用戶的 company 是否為此活動的 organizer
const isOrganizer = userCompanies.some(
  c => c.id === event.organizer_company_id && c.role === 'organizer'
)

// 如果是主辦方，隱藏購買功能，顯示提示
if (isOrganizer) {
  return <Alert>您是此活動的主辦方，如需保留商品請調整商品總數量</Alert>
}
```

**後端（pre_order_handler.go CreatePreOrder）：**
```go
// 伺服器端二次驗證
buyerCompanies := getMemberCompanies(buyerMemberID)
for _, c := range buyerCompanies {
    if c.ID == event.OrganizerCompanyID {
        return 403, "活動主辦方無法訂購自己活動的商品"
    }
}
```

### 影響檔案
- `src/pages/EventBoothProductsSection.tsx`
- `backend-go/internal/handler/pre_order_handler.go`

### 參考
- [YITH: How to prevent vendors from buying their own products](https://support.yithemes.com/hc/en-us/articles/115001506934--How-to-prevent-vendors-to-buy-their-own-products)
- [Why Self Purchase Orders Are Bad](https://www.spendflo.com/blog/self-purchase-orders)

---

## 2. 已預訂數量 + 訂購者資訊 (#67)

### 問題
品牌商在「我的商品」頁面看不到 `reserved_quantity`，也不知道誰訂了。

### 方案

**UI 設計：**
```
┌─────────────────────────────────────────┐
│ 🍰 手工蛋糕                    [編輯]   │
│ NT$350                                   │
│                                          │
│ 庫存: ████████░░ 8/10 可售 | 2 已預訂   │
│                                          │
│ 📋 預訂明細 ▾                            │
│ ┌──────────────────────────────────────┐ │
│ │ PRE-20260226-A1B2C3                  │ │
│ │ 王小明 | 2 件 | pending | 02/26     │ │
│ └──────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**新增後端 API：**
```
GET /booth-products/{id}/reservations
```
回傳：
```json
{
  "data": [
    {
      "pre_order_number": "PRE-20260226-A1B2C3",
      "contact_name": "王小明",
      "quantity": 2,
      "status": "pending",
      "created_at": "2026-02-26T10:00:00Z"
    }
  ],
  "summary": {
    "total_quantity": 10,
    "reserved_quantity": 2,
    "available_quantity": 8
  }
}
```

**Service 層檢查點：**
- `CreatePreOrder`: `reserved_quantity += item.quantity`, `available_quantity -= item.quantity`
- `CancelPreOrder`: `reserved_quantity -= item.quantity`, `available_quantity += item.quantity`
- 邊界: `available_quantity` 不能為負

### 影響檔案
- `src/pages/VendorBoothProductsPage.tsx` — UI 顯示
- `backend-go/internal/handler/booth_product_handler.go` — 新 endpoint
- `backend-go/internal/service/booth_product_service.go` — 查詢邏輯
- `backend-go/internal/service/pre_order_service.go` — 庫存增減邏輯

### 參考
- [Inventory Management Dashboard UI](https://uibakery.io/templates/inventory-management-dashboard)
- [Marketplace UI/UX Best Practices](https://qubstudio.com/blog/marketplace-ui-ux-design-best-practices-and-features/)

---

## 3. 品牌資訊顯示 (#68)

### 問題
消費者看商品卡片不知道是哪家品牌商的，品牌商管理頁也看不到自己的公司資訊。

### 方案

**後端 DTO 擴展：**
```go
type BoothProductPublic struct {
    // ...existing...
    VendorBrandName       *string `json:"vendor_brand_name,omitempty"`
    VendorBrandLogoURL    *string `json:"vendor_brand_logo_url,omitempty"`
    VendorOfficialWebsite *string `json:"vendor_official_website,omitempty"`
    VendorCompanyName     string  `json:"vendor_company_name"`
}
```

**BoothProductToPublic() 擴展：**
```go
// JOIN company 表
var company models.Company
db.Where("id = ?", product.VendorCompanyID).First(&company)

public.VendorBrandName = company.BrandName
public.VendorBrandLogoURL = company.BrandLogoURL
public.VendorOfficialWebsite = company.OfficialWebsite
public.VendorCompanyName = company.CompanyName
```

> 注意避免 N+1：批量查詢時用 `WHERE id IN (?)` 一次取所有 company

**消費者端 UI（商品卡片）：**
```
┌──────────────────────┐
│ [產品圖片]            │
│ 🏷️ BrandName Logo   │
│ 商品名稱              │
│ NT$350               │
│ 🌐 official_website  │ ← 有值才顯示，target="_blank"
└──────────────────────┘
```

**品牌商端 UI：**
- 商品卡片頂部顯示 `brand_name` badge（因為品牌商可能屬於不同公司）

### 影響檔案
- `src/pages/EventBoothProductsSection.tsx` — 消費者商品卡片
- `src/pages/EventBoothMapSection.tsx` — 地圖商品面板
- `src/pages/VendorBoothProductsPage.tsx` — 品牌商管理
- `src/lib/api/booth-products.ts` — TypeScript 型別更新
- `backend-go/internal/dto/booth_product.go` — DTO 擴展
- `backend-go/internal/service/booth_product_service.go` — JOIN company

---

## 4. 取消申請流程 (#69) ⭐ 最複雜

### 問題
消費者取消預購應走審核流程，而非直接取消。

### 資料庫欄位新增

**pre_order 表新增：**
```sql
ALTER TABLE pre_order ADD COLUMN cancellation_requested_at DATETIME NULL;
ALTER TABLE pre_order ADD COLUMN cancellation_responded_at DATETIME NULL;
ALTER TABLE pre_order ADD COLUMN cancellation_response VARCHAR(20) NULL;      -- 'approved' / 'rejected'
ALTER TABLE pre_order ADD COLUMN cancellation_response_note TEXT NULL;
```

### 狀態機

```
pending ──→ confirmed ──→ preparing ──→ ready ──→ completed
   │            │              │           │
   │            └──────────────┴───────────┘
   │                         │
   ↓                         ↓
cancelled          cancellation_requested
(直接取消，             │
 pending 階段)          ├─→ cancellation approved → cancelled
                       │     (退還庫存)
                       └─→ cancellation rejected → (回到原狀態)
                             (消費者只能接受)
```

**規則：**
- `pending` 狀態 → 消費者可直接取消（保留現有邏輯）
- `confirmed` / `preparing` / `ready` → 消費者只能**申請取消**
- 品牌商回應後為 final（消費者不能再次申請）

### API 設計

```
POST /pre-orders/{id}/request-cancellation    (消費者)
  Body: { "reason": "不需要了" }
  → status = "cancellation_requested"
  → cancellation_requested_at = now()
  → cancellation_reason = reason

POST /pre-orders/{id}/respond-cancellation    (品牌商)
  Body: { "response": "approved", "note": "已同意退款" }
  → cancellation_responded_at = now()
  → cancellation_response = response
  → cancellation_response_note = note
  → if approved: status = "cancelled", 退還庫存
  → if rejected: status = 回到原狀態 (confirmed/preparing/ready)
```

### 消費者端 UI

**我的預購列表：**
```
┌─────────────────────────────────────┐
│ PRE-20260226-A1B2C3                 │
│ 狀態: 🟡 取消審核中                 │
│ 申請時間: 2026/02/26 14:30          │
│ 取消原因: 不需要了                   │
│                                      │
│ ⏳ 等待品牌商回覆...                 │
└─────────────────────────────────────┘
```

**被拒絕後：**
```
┌─────────────────────────────────────┐
│ PRE-20260226-A1B2C3                 │
│ 狀態: 🔴 取消被拒絕                 │
│ 品牌商回覆: 商品已開始準備，無法取消  │
│ 回覆時間: 2026/02/26 16:00          │
│                                      │
│ [了解] ← 消費者只能接受              │
└─────────────────────────────────────┘
```

### 品牌商端 UI

**預購管理頁面：**
- 取消申請以紅色 badge 突出顯示
- 點開可看取消原因
- 兩個按鈕：「同意取消」/「拒絕取消」
- 拒絕時需填寫原因

### 影響檔案
- `backend-go/internal/models/pre_order.go` — 新欄位
- `backend-go/internal/dto/pre_order.go` — 新 DTO
- `backend-go/internal/handler/pre_order_handler.go` — 新 endpoint
- `backend-go/internal/service/pre_order_service.go` — 狀態機邏輯 + 庫存退還
- `backend-go/internal/migrate/migrate.go` — AutoMigrate 更新
- `src/lib/api/pre-orders.ts` — 新 API method
- `src/pages/` — 消費者預購頁 + 品牌商預購管理頁

### 參考
- [Baymard: Have a 'Cancellation Requested' Order State](https://baymard.com/blog/cancellation-requested-order-state)
  - **關鍵觀點**：很多電商缺少「取消申請中」的訂單狀態，導致用戶在「已下單」和「已出貨」之間處於不確定狀態。應明確定義此狀態並在系統中統一呈現。
- [10 Cancellation Flow UX Examples](https://medium.com/@benjbrandall/10-cancellation-flow-ux-examples-and-why-they-work-acd4a61b1af0)
- [Chargebee: Cancellation Flow to Reduce Churn](https://www.chargebee.com/blog/cancellation-flow/)
- [UX Magazine: Cancellation Flow Examples](https://uxmag.com/articles/10-cancellation-flow-examples-and-why-they-work)

---

## 5. 手機版 RWD (#70)

### 問題
攤位商品相關頁面在手機上可能排版混亂。

### 需要處理的頁面

| 頁面 | 桌面版 | 手機版調整 |
|------|--------|-----------|
| EventBoothProductsSection | 3-4 欄商品格 | 1-2 欄，圖上文下 |
| EventBoothMapSection | 地圖 + 側邊面板 | 地圖全寬 + 下方列表 |
| 購物車浮動欄 | 底部橫條 | 精簡版，折疊展開 |
| VendorBoothProductsPage | 商品卡片列表 | 堆疊排列 |
| 商品編輯 Sheet | Side Sheet 側邊 | Bottom Sheet 或全螢幕 |
| 預購管理列表 | 表格 | 卡片式 |
| 品牌資訊 | 橫排 | 堆疊 |

### Tailwind 斷點
```css
sm: 640px   /* 手機橫向 */
md: 768px   /* 平板 */
lg: 1024px  /* 桌面 */
```

### 測試裝置
- iPhone SE (375px)
- iPhone 14 Pro (393px)
- Samsung Galaxy S24 (360px)
- iPad Mini (768px)

---

## 建議實作順序

```
#66 防止自購 (簡單，先做)
    ↓
#67 預訂數量 + 訂購者 (需要新 API)
    ↓
#68 品牌資訊顯示 (DTO 擴展 + 前端)
    ↓
#69 取消申請流程 (最複雜，新狀態機 + 新 API + 前後端)
    ↓
#70 手機版 RWD (收尾，確保所有新 UI 都 responsive)
```

---

## 線上參考資源

### 取消流程 UX
- [Baymard: 'Cancellation Requested' Order State](https://baymard.com/blog/cancellation-requested-order-state) — 電商取消狀態設計的權威指南
- [10 Cancellation Flow UX Examples (Medium)](https://medium.com/@benjbrandall/10-cancellation-flow-ux-examples-and-why-they-work-acd4a61b1af0)
- [Chargebee: Cancellation Flow Examples](https://www.chargebee.com/blog/cancellation-flow/)

### Marketplace 設計
- [Marketplace UI/UX Best Practices (Qubstudio)](https://qubstudio.com/blog/marketplace-ui-ux-design-best-practices-and-features/)
- [Marketplace UI/UX Design (Aspirity)](https://aspirity.com/blog/marketplace-ux-design)
- [Multi-vendor Marketplace Design (Yo-Kart)](https://www.yo-kart.com/design-features.html)
- [Dribbble: Multi Vendor Designs](https://dribbble.com/tags/multi_vendor)

### 庫存管理 UI
- [Inventory Management Dashboard (UI Bakery)](https://uibakery.io/templates/inventory-management-dashboard)

### 防止自購
- [YITH: Prevent vendors from buying own products](https://support.yithemes.com/hc/en-us/articles/115001506934--How-to-prevent-vendors-to-buy-their-own-products)
- [Why Self Purchase Orders Are Bad (Spendflo)](https://www.spendflo.com/blog/self-purchase-orders)

### 電商結帳 UX
- [15 Ecommerce Checkout UX Best Practices 2026](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/)
