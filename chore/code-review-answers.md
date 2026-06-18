# 代碼審查問題回答

## 1. 目前有設定預設的規則嗎？如果有的話在哪？為什麼用"默認規則"這個字眼？

**回答**：
- ❌ **沒有預設的規則**。我錯誤地假設 `company_id IS NULL` 是"默認規則"，但實際上：
  - `company_id` 可以是 `NULL`（不綁定特定公司）
  - `company_id` 也可以綁定特定公司（如 GC 或 electricity_company）
  - 沒有設計說明 `company_id IS NULL` 是"默認規則"
- **修復**：移除"默認規則"的概念，直接查找活動的有效規則（`status='active'` 且 `expired_at IS NULL`）

## 2. status='active' 和 deleted_at 是一樣的用途，檢查哪個用的比較多，刪除哪一個？

**回答**：
- **檢查結果**：
  - `status` 在代碼中大量使用（639行）
  - `deleted_at` 在代碼中大量使用（169行）
  - **但是** `electricity_calculation_rule` 表**只有 `status` 和 `expired_at`，沒有 `deleted_at`**
- **結論**：
  - ✅ **保留 `status='active'`**：用於判斷規則是否啟用
  - ✅ **保留 `expired_at IS NULL`**：用於判斷規則是否已過期（歷史記錄）
  - ❌ **不需要 `deleted_at`**：`electricity_calculation_rule` 表沒有這個字段

## 3. `if rule and rule.event_id and rule.status=active and rule.expired_at is None:` 的話就做 `calculation_rule_id = rule.id`？這個等號後面的 `rule.id` 算什麼？

**回答**：
- `rule.id` 是規則的 **UUID**（主鍵）
- 用來設置到 `order_electricity.calculation_rule_id` 字段
- 建立 `order_electricity` 和 `electricity_calculation_rule` 的關聯關係
- **示例**：
  ```python
  calculation_rule_id = rule.id  # 例如: "123e4567-e89b-12d3-a456-426614174000"
  # 然後設置到 order_electricity 表
  electricity_base = OrderElectricityBase(
      calculation_rule_id=calculation_rule_id,  # 關聯到規則
      ...
  )
  ```

## 4. 為什麼要驗證規則是否存在且有效？

**回答**：
- ❌ **這個驗證是多餘的**，因為：
  - 前端**不會傳遞** `calculation_rule_id`（前端只傳遞 `wattage`, `voltage`, `cable_length`）
  - 後端應該**自動查找**活動的有效規則
  - 不需要驗證客戶選擇的規則（因為客戶不會選擇）
- **修復**：移除驗證邏輯，直接查找活動的有效規則

## 5. 怎麼會有人用我們沒有設定的規則？這是誰寫的邏輯？

**回答**：
- ❌ **這是我剛才添加的邏輯，是過度設計**
- 我錯誤地假設：
  - 前端可能會傳遞 `calculation_rule_id`
  - 需要驗證客戶選擇的規則
  - 需要區分"默認規則"和"公司規則"
- **實際情況**：
  - 前端不會傳遞 `calculation_rule_id`
  - 後端應該自動查找活動的有效規則
  - 不需要區分"默認規則"和"公司規則"
- **修復**：簡化邏輯，直接查找活動的有效規則

## 修復後的代碼邏輯

```python
# 簡化後的邏輯
# 查找活動的有效規則（status='active' 且 expired_at IS NULL）
rule = session.exec(
    select(ElectricityCalculationRule)
    .where(
        ElectricityCalculationRule.event_id == order.event_id,
        ElectricityCalculationRule.status == "active",
        ElectricityCalculationRule.expired_at.is_(None)
    )
    .order_by(ElectricityCalculationRule.created_at.desc())
).first()

calculation_rule_id = rule.id if rule else None
```

## 總結

1. ❌ 移除"默認規則"的概念
2. ✅ 使用 `status='active'` 和 `expired_at IS NULL` 判斷有效規則
3. ✅ `rule.id` 是規則的 UUID，用於關聯
4. ❌ 移除多餘的驗證邏輯
5. ❌ 簡化代碼，直接查找活動的有效規則
