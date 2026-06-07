# 資料庫索引說明

## 索引的作用

索引（Index）是資料庫中用來加速查詢的資料結構。就像書本的目錄一樣，可以快速找到需要的內容。

## 索引語法說明

```sql
CREATE INDEX idx_rule_event_company_status
ON electricity_calculation_rule(event_id, company_id, status);
```

### 這個索引的含義

這個索引會在 `electricity_calculation_rule` 表上創建一個**複合索引**（Composite Index），包含三個欄位：
1. `event_id`
2. `company_id`
3. `status`

### 索引的工作原理

當你執行這樣的查詢時：
```sql
SELECT * FROM electricity_calculation_rule
WHERE event_id = 'xxx'
  AND company_id = 'yyy'
  AND status = 'active';
```

**沒有索引時**：
- 資料庫需要掃描整個表（Full Table Scan）
- 逐行檢查是否符合條件
- 速度慢，特別是表很大時

**有索引時**：
- 資料庫使用索引快速定位到符合條件的記錄
- 就像用目錄直接翻到對應頁面
- 速度快很多

### 複合索引的順序很重要

索引欄位的順序很重要，因為索引是按照欄位順序建立的。

**這個索引可以加速的查詢：**
1. ✅ `WHERE event_id = ?` （使用第一個欄位）
2. ✅ `WHERE event_id = ? AND company_id = ?` （使用前兩個欄位）
3. ✅ `WHERE event_id = ? AND company_id = ? AND status = ?` （使用全部三個欄位）

**這個索引無法加速的查詢：**
1. ❌ `WHERE company_id = ?` （跳過了第一個欄位）
2. ❌ `WHERE status = ?` （跳過了前面的欄位）
3. ❌ `WHERE company_id = ? AND status = ?` （跳過了第一個欄位）

### 為什麼選擇這個順序？

1. **event_id** 放在第一位：
   - 通常查詢時會先過濾活動
   - 一個活動的規則數量相對較少

2. **company_id** 放在第二位：
   - 在同一個活動內，再過濾公司
   - 進一步縮小範圍

3. **status** 放在第三位：
   - 最後過濾有效規則
   - 通常只有少數規則會是 active

### 實際應用場景

```sql
-- 查詢某個活動的某家公司的有效規則
SELECT * FROM electricity_calculation_rule
WHERE event_id = 'event-123'
  AND company_id = 'company-456'
  AND status = 'active'
  AND expired_at IS NULL;
```

這個查詢會使用索引快速找到結果，而不是掃描整個表。

### 索引的權衡

**優點：**
- ✅ 加速查詢
- ✅ 提高系統性能

**缺點：**
- ❌ 占用額外的儲存空間
- ❌ 插入/更新/刪除時需要維護索引（稍微慢一點）

但通常優點遠大於缺點，特別是對於經常查詢的欄位組合。
