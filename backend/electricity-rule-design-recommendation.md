# 電力計算規則設計建議（修正版）

## 設計需求分析

### 業務場景
1. **單一服務公司**：一個活動只有一家電力公司/傢俱公司
2. **多家服務公司**：一個活動有多家電力公司/傢俱公司競爭
3. **規則變更**：同一公司可能漲價，需要保留歷史規則（舊規則 valid=0，新規則 valid=1）

### 關鍵設計決策

**最複雜設計（支持多家公司）：**
- `order_electricity` 表綁定 `company_id`（電力服務供應商）和 `calculation_rule_id`
- `order_item` 表綁定 `furniture_company_id`（傢俱服務供應商）
- **不在 `order` 表綁定公司**（避免同一活動所有訂單都是同一家公司）

## 推薦設計方案

### 方案：明細表綁定公司 + 規則表綁定公司

**設計原則：**
1. **規則表**：`electricity_calculation_rule.company_id` 綁定公司（1:多關係）
   - 一個公司可以有多個規則（歷史記錄）
   - 同一活動中，一個公司只有一個有效規則（`status='active'`）

2. **明細表**：`order_electricity.company_id` 和 `order_electricity.calculation_rule_id`
   - 每個電力需求記錄對應的服務供應商
   - 每個電力需求使用的計費規則

3. **明細表**：`order_item.furniture_company_id`
   - 每個傢俱項目對應的服務供應商

### 數據關係

```
┌─────────────┐
│   company   │ (服務供應商：電力公司/傢俱公司)
│             │
│ - id        │
└──────┬──────┘
       │ 1
       │
       │ N (一個公司可以有多個規則：歷史記錄)
       │
┌──────▼──────────────────┐
│ electricity_calculation  │
│        _rule            │
│                         │
│ - event_id (FK)         │
│ - company_id (FK)        │ ← 綁定到公司（1:多）
│ - status (active/disabled) │ ← 有效規則標記
│ - base_wattage          │
│ - price_per_unit        │
└──────┬──────────────────┘
       │
       │ N (一個規則可以被多個電力需求使用)
       │
┌──────▼──────────────────┐
│  order_electricity       │
│                         │
│ - order_id (FK)         │
│ - company_id (FK)        │ ← 電力服務供應商
│ - calculation_rule_id (FK) │ ← 使用的規則
│ - wattage                │
│ - unit_price             │
└─────────────────────────┘

┌─────────────┐
│   company   │ (傢俱服務供應商)
└──────┬──────┘
       │
       │ N
       │
┌──────▼──────────┐
│  order_item      │
│                 │
│ - order_id (FK) │
│ - company_id (FK) │ ← 傢俱服務供應商
│ - product_id     │
│ - price          │
└─────────────────┘
```

### 規則選擇邏輯

**創建電力需求時：**
1. 根據 `event_id` + `company_id` 查找該公司的有效規則
2. 如果找到，設置 `order_electricity.calculation_rule_id` 和 `order_electricity.company_id`
3. 如果沒找到，使用 `event_id` 的默認規則（`company_id IS NULL`）

**查詢規則的優先順序：**
```sql
-- 優先：匹配公司 + 活動 + 有效規則
SELECT * FROM electricity_calculation_rule
WHERE event_id = ?
  AND company_id = ?
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 1

-- 備選：活動默認規則（如果沒有公司特定規則）
SELECT * FROM electricity_calculation_rule
WHERE event_id = ?
  AND company_id IS NULL
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 1
```

## 數據庫約束建議

### 唯一約束（可選）
```sql
-- 選項1：確保一個公司在一個活動中只有一個有效規則
-- 注意：這會阻止歷史記錄，不推薦
-- ALTER TABLE electricity_calculation_rule
-- ADD CONSTRAINT uq_rule_event_company_active
-- UNIQUE (event_id, company_id, status)
-- WHERE status = 'active';

-- 選項2：不設唯一約束，允許歷史記錄
-- 通過應用層邏輯確保只有一個有效規則
-- 推薦：使用 status='active' 標記有效規則
```

### 索引
```sql
-- 優化規則查詢（活動 + 公司 + 狀態）
CREATE INDEX idx_rule_event_company_status
ON electricity_calculation_rule(event_id, company_id, status);

-- 優化電力需求查詢
CREATE INDEX idx_order_electricity_company
ON order_electricity(company_id);

CREATE INDEX idx_order_electricity_rule
ON order_electricity(calculation_rule_id);

-- 優化傢俱項目查詢
CREATE INDEX idx_order_item_furniture_company
ON order_item(furniture_company_id);
```

## 實現建議

### 1. 表結構變更

#### `order_electricity` 表新增欄位
```sql
ALTER TABLE order_electricity
ADD COLUMN company_id VARCHAR(36) NULL COMMENT '電力服務供應商 ID' AFTER order_id,
ADD COLUMN calculation_rule_id VARCHAR(36) NULL COMMENT '使用的計費規則 ID' AFTER company_id;

ALTER TABLE order_electricity
ADD CONSTRAINT fk_order_electricity_company
FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_order_electricity_rule
FOREIGN KEY (calculation_rule_id) REFERENCES electricity_calculation_rule(id) ON DELETE SET NULL;
```

#### `order_item` 表新增欄位
```sql
ALTER TABLE order_item
ADD COLUMN furniture_company_id VARCHAR(36) NULL COMMENT '傢俱服務供應商 ID' AFTER order_id;

ALTER TABLE order_item
ADD CONSTRAINT fk_order_item_furniture_company
FOREIGN KEY (furniture_company_id) REFERENCES company(id) ON DELETE SET NULL;
```

#### `order` 表移除欄位（可選）
```sql
-- 如果採用最複雜設計，可以移除 order 表的這些欄位
-- ALTER TABLE `order`
-- DROP COLUMN seller_company_id,
-- DROP COLUMN calculation_rule_id;
```

### 2. 規則選擇服務層邏輯
```python
def get_electricity_rule(
    session: Session,
    event_id: str,
    company_id: str | None = None
) -> ElectricityCalculationRule | None:
    """獲取電力計算規則

    優先順序：
    1. event_id + company_id + status='active' 匹配的規則（最新）
    2. event_id + company_id IS NULL + status='active' 的默認規則
    """
    # 如果有公司 ID，優先查找該公司的有效規則
    if company_id:
        rule = session.exec(
            select(ElectricityCalculationRule)
            .where(
                ElectricityCalculationRule.event_id == event_id,
                ElectricityCalculationRule.company_id == company_id,
                ElectricityCalculationRule.status == "active"
            )
            .order_by(ElectricityCalculationRule.created_at.desc())
        ).first()
        if rule:
            return rule

    # 否則使用活動默認規則
    return session.exec(
        select(ElectricityCalculationRule)
        .where(
            ElectricityCalculationRule.event_id == event_id,
            ElectricityCalculationRule.company_id.is_(None),
            ElectricityCalculationRule.status == "active"
        )
        .order_by(ElectricityCalculationRule.created_at.desc())
    ).first()
```

### 3. 創建電力需求時自動選擇規則
```python
# 創建電力需求時
order_electricity = OrderElectricity(
    order_id=order_id,
    company_id=electricity_company_id,  # 電力服務供應商
    wattage=2000,
    # ...
)

# 自動查找並設置規則
rule = get_electricity_rule(session, event_id, electricity_company_id)
if rule:
    order_electricity.calculation_rule_id = rule.id
    # 計算價格
    order_electricity.unit_price = rule.price_per_unit
    # ...
```

### 4. 規則歷史記錄處理
```python
# 當公司漲價時，創建新規則，舊規則設為 disabled
def update_electricity_rule_price(
    session: Session,
    rule_id: str,
    new_price: Decimal
):
    """更新規則價格（創建新規則，舊規則設為 disabled）"""
    old_rule = session.get(ElectricityCalculationRule, rule_id)
    if not old_rule:
        raise ValueError("規則不存在")

    # 創建新規則
    new_rule = ElectricityCalculationRule(
        event_id=old_rule.event_id,
        company_id=old_rule.company_id,
        base_wattage=old_rule.base_wattage,
        wattage_unit=old_rule.wattage_unit,
        price_per_unit=new_price,  # 新價格
        currency=old_rule.currency,
        cable_extension_fee=old_rule.cable_extension_fee,
        cable_fee_per_meter=old_rule.cable_fee_per_meter,
        status="active"
    )
    session.add(new_rule)

    # 舊規則設為 disabled
    old_rule.status = "disabled"
    session.add(old_rule)
    session.commit()
```

## 優點

1. **靈活性**：支持單一公司或多公司場景
2. **歷史記錄**：可以保留規則變更歷史（漲價記錄）
3. **數據完整性**：每個明細記錄都明確標記服務供應商
4. **查詢效率**：通過索引優化查詢性能
5. **擴展性**：未來可以輕鬆支持更多公司
6. **避免冗余**：不在 `order` 表綁定公司，避免同一活動所有訂單都是同一家公司

## 注意事項

1. **遷移現有數據**：
   - 如果現有規則沒有 `company_id`，它們會作為默認規則
   - 需要將現有 `order_electricity` 的 `company_id` 從 `order.seller_company_id` 遷移過來

2. **規則創建**：
   - 創建規則時，如果指定了 `company_id`，需要確保該公司確實提供該服務
   - 同一公司同一活動只能有一個 `status='active'` 的規則

3. **規則查詢**：
   - 所有查詢規則的地方都需要更新邏輯，優先匹配公司
   - 需要確保查詢時過濾 `status='active'`

4. **規則變更**：
   - 漲價時創建新規則，舊規則設為 `status='disabled'`
   - 已創建的訂單使用舊規則（歷史記錄）

## 設計對比

### 簡化設計（單一公司）
- `order.seller_company_id` 綁定公司
- `order.calculation_rule_id` 綁定規則
- 適用：只有一家服務公司的場景

### 複雜設計（多家公司）✅ 推薦
- `order_electricity.calculation_rule_id`（規則已綁定公司）
- `order_item.furniture_company_id`
- 適用：多家服務公司競爭的場景
- **優點**：每個明細記錄都明確標記供應商，支持歷史記錄

## 總結

**推薦採用：明細表綁定規則/公司 + 規則表綁定公司**

- ✅ `order_electricity.calculation_rule_id`（規則已綁定公司）
- ✅ `order_item.furniture_company_id`（傢俱服務供應商）
- ✅ `electricity_calculation_rule.company_id`（支持歷史記錄）
- ✅ 支持未來多公司場景
- ✅ 避免 `order` 表冗余（同一活動所有訂單都是同一家公司）
- ✅ 數據關係清晰（規則屬於活動+公司，明細屬於訂單+規則/公司）
