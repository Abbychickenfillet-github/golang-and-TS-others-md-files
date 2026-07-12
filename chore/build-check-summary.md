# 構建檢查和實現總結

## 1. 構建檢查結果

### ✅ 模型文件檢查
- `backend/app/models/order_electricity.py` - ✅ 無錯誤
- `backend/app/models/order_item.py` - ✅ 無錯誤
- `backend/app/models/general_contractor.py` - ✅ 無錯誤
- `backend/app/models/order.py` - ✅ 無錯誤

### ✅ Linter 檢查
- 所有文件通過 linter 檢查，無語法錯誤

## 2. 實現檢查結果

### ❌ 發現的問題

#### 問題 1：後端 API 未設置 `calculation_rule_id`
**位置**：`backend/app/api/routes/orders.py` 的 `add_electricity_to_order` 函數

**問題**：
- 創建 `OrderElectricityBase` 時沒有查找並設置 `calculation_rule_id`
- 根據設計，應該自動查找活動的有效規則並設置

**修復**：
- ✅ 已修復：添加了自動查找規則的邏輯
- 優先使用客戶選擇的規則（如果提供）
- 否則查找活動的預設規則（`company_id IS NULL`）
- 如果都沒有，查找任何有效的規則

#### 問題 2：前端未傳遞 `calculation_rule_id`
**位置**：`official_website/app/event/[id]/register/electricity/page.tsx`

**當前實現**：
- 前端只傳遞 `wattage`, `voltage`, `cable_length`
- 沒有傳遞 `calculation_rule_id`

**設計說明**：
- 根據設計文檔："客戶以規則選擇，而非公司選擇"
- 但目前的實現是後端自動選擇規則（符合簡化流程）
- 如果未來需要讓用戶選擇規則，前端需要添加規則選擇 UI

### ✅ 已正確實現的部分

1. **模型定義**：
   - ✅ `OrderElectricityBase` 包含 `calculation_rule_id` 字段
   - ✅ `OrderElectricityCreate` 包含 `calculation_rule_id` 字段（可選）
   - ✅ `ElectricityCalculationRuleBase` 包含 `expired_at` 字段
   - ✅ `OrderItemBase` 包含 `furniture_company_id` 字段

2. **前端電力選擇頁面**：
   - ✅ 正確獲取活動電力規則
   - ✅ 正確驗證瓦數（必須是 500W 的倍數）
   - ✅ 正確調用後端 API

3. **後端 API**：
   - ✅ 正確驗證訂單狀態
   - ✅ 正確驗證瓦數
   - ✅ 正確計算費用（`calculate_electricity_cost`）

## 3. 修復內容

### 修復 1：後端自動查找並設置規則

```python
# 查找活動的有效電力規則
calculation_rule_id = None
if electricity_create.calculation_rule_id:
    # 如果客戶明確選擇了規則，驗證規則是否存在且有效
    rule = electricity_rule_service.get_rule(session, rule_id=electricity_create.calculation_rule_id)
    if rule and rule.event_id == order.event_id and rule.status == "active" and rule.expired_at is None:
        calculation_rule_id = rule.id

if not calculation_rule_id:
    # 查找活動的預設規則（company_id IS NULL）
    # 如果沒有，查找任何有效的規則
    ...
```

### 修復 2：模型更新

```python
class OrderElectricityCreate(SQLModel):
    calculation_rule_id: str | None = Field(
        default=None,
        max_length=36,
        description="使用的計費規則 ID（可選，未提供時自動查找）"
    )
```

## 4. 建議的後續改進

### 選項 A：保持當前實現（推薦）
- 後端自動選擇規則
- 簡化用戶流程
- 適合大多數場景（一個活動通常只有一個有效規則）

### 選項 B：添加規則選擇功能
如果未來需要支持多個規則選擇：
1. 前端修改：
   - 在電力選擇頁面添加規則選擇下拉框
   - 顯示規則的公司名稱和價格信息
   - 傳遞 `calculation_rule_id` 到後端

2. 後端修改：
   - 驗證客戶選擇的規則是否有效
   - 確保規則屬於當前活動

## 5. 總結

### ✅ 已完成
- 模型定義正確
- 後端 API 已修復，會自動查找並設置規則
- 前端實現符合當前設計（簡化流程）

### ⚠️ 注意事項
- 當前實現是後端自動選擇規則
- 如果未來需要用戶選擇規則，需要修改前端 UI
- SQL 遷移文件已準備好，可以執行

### 📝 下一步
1. 執行 SQL 遷移：`backend/sql/127_electricity_rule_refactor.sql`
2. 測試後端 API 是否正確設置 `calculation_rule_id`
3. 測試前端電力選擇流程
