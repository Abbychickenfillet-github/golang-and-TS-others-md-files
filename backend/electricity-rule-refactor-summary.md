# 電力規則重構總結

## 變更概述

本次重構將電力計算規則從 `order` 表移到 `order_electricity` 明細表，並支持歷史記錄和多家服務公司。

## 主要變更

### 1. `order_electricity` 表
- ✅ **新增** `calculation_rule_id`：使用的計費規則 ID
- 客戶以規則選擇，而非公司選擇
- 規則本身已綁定公司（`electricity_calculation_rule.company_id`）

### 2. `electricity_calculation_rule` 表
- ✅ **新增** `expired_at`：規則棄用時間（NULL 表示仍在使用）
- 支持歷史記錄：漲價時創建新規則，舊規則設 `expired_at`
- 規則表綁定公司（`company_id`），一個公司可以有多個規則（歷史記錄）

### 3. `order` 表
- ❌ **移除** `calculation_rule_id`：改為在 `order_electricity` 綁定
- 避免同一活動所有訂單都是同一家公司（冗余）

### 4. `order_item` 表
- ✅ **新增** `furniture_company_id`：傢俱服務供應商 ID
- 每個傢俱項目明確標記服務供應商
- 使用 `furniture_company_id` 而非 `company_id`，因為此表可能還有其他類型的公司（如賣票的主辦）

### 5. `event` 表
- ❌ **移除** `electricity_company`、`furniture_company`、`GC_company`
- 改為通過 `electricity_calculation_rule` 查詢活動的規則和公司

## 數據關係

```
company (1) ──→ (N) electricity_calculation_rule
                      ├─ event_id
                      ├─ company_id (FK) ← 綁定公司
                      ├─ status (active/disabled)
                      ├─ expired_at (NULL = 仍在使用)
                      └─ price_per_unit

electricity_calculation_rule (1) ──→ (N) order_electricity
                                          ├─ calculation_rule_id (FK) ← 使用的規則
                                          └─ wattage, unit_price

company (1) ──→ (N) order_item
                      └─ furniture_company_id (FK) ← 傢俱服務供應商
```

## 索引優化

### `idx_rule_event_company_status`
```sql
CREATE INDEX idx_rule_event_company_status
ON electricity_calculation_rule(event_id, company_id, status);
```

**作用**：加速規則查詢
- 查詢某個活動的某家公司的有效規則
- 複合索引順序：`event_id` → `company_id` → `status`
- 可以加速包含這些欄位的查詢

**詳細說明**：見 `docs/index-explanation.md`

## 業務邏輯變更

### 規則選擇
- **之前**：根據 `event_id` 查找規則
- **現在**：客戶直接選擇規則（規則已綁定公司和活動）

### 規則歷史記錄
- 漲價時：創建新規則，舊規則設 `expired_at = NOW()`
- 查詢有效規則：`WHERE status='active' AND expired_at IS NULL`
- Excel 匯出：可以查詢同一公司不同時期的價格

### 查詢活動的規則
- **之前**：`SELECT * FROM event WHERE id = ?`（從 event 表查）
- **現在**：`SELECT * FROM electricity_calculation_rule WHERE event_id = ?`（從規則表查）

## 後台顯示需求

後台電力計費規則列表應顯示：
1. **公司名稱**：哪家公司負責（`company.company_name`）
2. **規則內容**：基本瓦數、每單位價格等
3. **活動名稱**：屬於哪個活動（`event.name`）

查詢 SQL：
```sql
SELECT
    ecr.*,
    c.company_name,
    e.name AS event_name
FROM electricity_calculation_rule ecr
LEFT JOIN company c ON c.id = ecr.company_id
LEFT JOIN event e ON e.id = ecr.event_id
WHERE ecr.status = 'active'
  AND ecr.expired_at IS NULL
ORDER BY e.created_at DESC, c.company_name;
```

## 遷移步驟

1. 執行 SQL 遷移：`backend/sql/104_electricity_rule_refactor.sql`
2. 更新模型文件（已完成）：
   - `backend/app/models/order_electricity.py`
   - `backend/app/models/general_contractor.py`
   - `backend/app/models/order.py`
   - `backend/app/models/order_item.py`
3. 更新業務邏輯：
   - 規則選擇邏輯
   - 訂單創建邏輯
   - 後台顯示邏輯
4. 測試驗證

## 注意事項

1. **數據遷移**：如果 `order` 表還有 `calculation_rule_id`，需要遷移到 `order_electricity`
2. **向後兼容**：現有 API 可能需要更新
3. **前端顯示**：後台需要更新規則列表顯示邏輯
