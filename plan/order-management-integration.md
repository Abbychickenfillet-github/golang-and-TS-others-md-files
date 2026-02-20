# 訂單管理頁面整合計畫

## 目標

將 `order-items` 頁面整合到主訂單管理 (`/orders`) 作為新頁籤「展場設備訂單」，並排除票券類型項目。

---

## 最終頁籤結構

```
主訂單管理 (/orders)
├─ 全部          - order_type_tab=all        - 權限: orders.view
├─ 票券訂單      - order_type_tab=b2c        - 權限: orders.view
├─ 攤位訂單      - order_type_tab=b2b        - 權限: orders.view
├─ 電力需求      - order_type_tab=electricity - 權限: order-electricity.view
└─ 展場設備訂單  - order_type_tab=equipment   - 權限: order-items.view ← 新增
```

---

## 實作步驟

### 1. 建立展場設備訂單面板組件
**檔案:** `frontend/src/components/Orders/EquipmentOrderPanel.tsx`

- 從 `order-items.tsx` 抽取邏輯
- API 呼叫 `/api/v1/order-items/`，過濾掉 ticket 類型（`ticket_id` 為空的項目）
- 保留原有的篩選功能（活動、商品名稱分組、類型、狀態、核銷狀態）
- 保留 Accordion 展開顯示詳細資訊

### 2. 修改主訂單管理頁面
**檔案:** `frontend/src/routes/_layout/orders.tsx`

修改內容：
- 更新 `ordersSearchSchema`，`order_type_tab` 加入 `"equipment"` 選項
- 新增第 5 個 Tab「展場設備訂單」
- 引入 `EquipmentOrderPanel` 組件
- 根據 `order_type_tab === "equipment"` 顯示對應面板

### 3. 新增各頁籤權限控制
**檔案:** `frontend/src/routes/_layout/orders.tsx`

使用現有權限控制各頁籤：

```tsx
const { hasPermission } = usePermissions()

const canViewOrders = hasPermission("orders.view")
const canViewElectricity = hasPermission("order-electricity.view")
const canViewEquipment = hasPermission("order-items.view")

// 動態建立可見的頁籤列表
const visibleTabs = [
  canViewOrders && { key: "all", label: "全部" },
  canViewOrders && { key: "b2c", label: "票券訂單" },
  canViewOrders && { key: "b2b", label: "攤位訂單" },
  canViewElectricity && { key: "electricity", label: "電力需求" },
  canViewEquipment && { key: "equipment", label: "展場設備訂單" },
].filter(Boolean)
```

### 4. 設定路由重導向
**檔案:** `frontend/src/routes/_layout/order-items.tsx`

改為重導向到展場設備訂單頁籤：

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/order-items")({
  beforeLoad: () => {
    throw redirect({
      to: "/orders",
      search: { order_type_tab: "equipment" },
    })
  },
})
```

### 5. 更新側邊欄導航
**檔案:** `frontend/src/components/Common/SidebarItems.tsx`

- 移除 `/order-items` 導航項目（已整合到 orders，有重導向）

---

## 關鍵檔案

| 檔案 | 動作 |
|------|------|
| `backend/app/api/routes/order_items.py` | 修改：新增 exclude_tickets 參數 |
| `frontend/src/routes/_layout/orders.tsx` | 修改：新增頁籤、權限控制 |
| `frontend/src/components/Orders/EquipmentOrderPanel.tsx` | 新增：展場設備面板 |
| `frontend/src/routes/_layout/order-items.tsx` | 修改：改為重導向 |
| `frontend/src/components/Common/SidebarItems.tsx` | 修改：移除 order-items |

---

## 過濾邏輯

後端 API 新增 `exclude_tickets` 參數：

**後端 (`backend/app/api/routes/order_items.py`)：**
```python
exclude_tickets: bool = Query(False, description="排除票券類型項目")

# 在查詢中
if exclude_tickets:
    statement = statement.where(OrderItem.ticket_id.is_(None))
```

**前端呼叫：**
```typescript
query: {
  exclude_tickets: true, // 後端排除票券
  ...
}
```

---

## 權限架構（使用現有權限）

| 頁籤 | 權限代碼 |
|------|----------|
| 全部 | `orders.view` |
| 票券訂單 | `orders.view` |
| 攤位訂單 | `orders.view` |
| 電力需求 | `order-electricity.view` |
| 展場設備訂單 | `order-items.view` |

---

## 驗證方式

1. 進入 `/orders` 確認有 5 個頁籤
2. 點擊「展場設備訂單」頁籤，確認：
   - 不顯示任何票券類型項目
   - 顯示傢俱、電工設備等租賃/購買項目
   - 篩選功能正常運作
3. 訪問 `/order-items`，確認自動重導向到 `/orders?order_type_tab=equipment`
4. 確認側邊欄已移除「總商品訂單細節」
5. 測試權限控制：
   - 只有 `orders.view` 權限：只能看到全部/票券/攤位頁籤
   - 只有 `order-electricity.view` 權限：只能看到電力需求頁籤
   - 只有 `order-items.view` 權限：只能看到展場設備訂單頁籤
6. 執行 `npm run build` 確認無 TypeScript 錯誤
