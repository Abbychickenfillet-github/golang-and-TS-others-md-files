---
title: "037_EXECUTION_CHECKLIST"
---

# 037 遷移執行檢查清單

## ⚠️ 執行前檢查

### 1. 檢查目前狀態
```sql
-- 檢查 product 表是否已有 general_contractor_id 欄位
SHOW COLUMNS FROM product LIKE 'general_contractor_id';

-- 檢查 junction table 是否存在
SHOW TABLES LIKE 'general_contractor_product';

-- 檢查 junction table 有多少資料
SELECT COUNT(*) AS junction_count
FROM general_contractor_product
WHERE deleted_at IS NULL;
```

### 2. 檢查 product 表目前狀態
```sql
-- 檢查有多少商品
SELECT COUNT(*) AS total_products FROM product;

-- 檢查是否有 general_contractor_id（如果欄位已存在）
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN general_contractor_id IS NOT NULL THEN 1 ELSE 0 END) AS has_gc,
    SUM(CASE WHEN general_contractor_id IS NULL THEN 1 ELSE 0 END) AS no_gc
FROM product;
```

---

## 📝 執行步驟

### 步驟 1：新增欄位（如果不存在）
```sql
-- 如果欄位不存在，執行這行
ALTER TABLE product
ADD COLUMN general_contractor_id VARCHAR(36) NULL COMMENT '總承包商 ID（商品擁有者）';
```

### 步驟 2：建立索引和外鍵
```sql
CREATE INDEX idx_product_gc_id ON product(general_contractor_id);

ALTER TABLE product
ADD CONSTRAINT fk_product_general_contractor
    FOREIGN KEY (general_contractor_id) REFERENCES general_contractor(id) ON DELETE SET NULL;
```

### 步驟 3：遷移資料
```sql
UPDATE product p
INNER JOIN (
    SELECT gcp1.product_id, gcp1.general_contractor_id
    FROM general_contractor_product gcp1
    INNER JOIN (
        SELECT product_id, MIN(created_at) AS min_created_at
        FROM general_contractor_product
        WHERE deleted_at IS NULL
        GROUP BY product_id
    ) gcp2 ON gcp1.product_id = gcp2.product_id AND gcp1.created_at = gcp2.min_created_at
    WHERE gcp1.deleted_at IS NULL
) gcp ON p.id = gcp.product_id
SET p.general_contractor_id = gcp.general_contractor_id
WHERE p.general_contractor_id IS NULL;
```

### 步驟 4：驗證遷移結果
```sql
-- 驗證查詢：has_gc 是計數，不是布林值
SELECT
    COUNT(*) AS total_products,
    SUM(CASE WHEN general_contractor_id IS NOT NULL THEN 1 ELSE 0 END) AS has_gc,
    SUM(CASE WHEN general_contractor_id IS NULL THEN 1 ELSE 0 END) AS no_gc
FROM product;
```

**結果解讀**：
- `has_gc = 0`：沒有商品分配給 GC（所有 `general_contractor_id` 都是 `NULL`）
- `has_gc = 1`：有 1 筆商品已分配給 GC
- `has_gc = 5`：有 5 筆商品已分配給 GC

### 步驟 5：查看詳細結果
```sql
-- 查看已分配的商品
SELECT
    p.id,
    p.name,
    p.general_contractor_id,
    gc.company_name AS gc_name
FROM product p
LEFT JOIN general_contractor gc ON p.general_contractor_id = gc.id
WHERE p.general_contractor_id IS NOT NULL
LIMIT 10;
```

### 步驟 6：刪除 junction table（確認遷移成功後）
```sql
DROP TABLE IF EXISTS general_contractor_product;
DROP TABLE IF EXISTS general_contractor_inventory;
```

---

## 🔍 常見錯誤排除

### 錯誤 1：SQL 語法錯誤
**原因**：在 SQL 編輯器中直接寫了中文文字（不是 SQL 註解）

**解決**：
- 中文註解必須用 `--` 開頭
- 例如：`-- 這是註解` ✅
- 錯誤：`了解！資料還沒遷移` ❌

### 錯誤 2：找不到 general_contractor_id 欄位
**原因**：欄位名稱是 `general_contractor_id`（全稱），不是 `gc_id`

**解決**：
- 使用完整欄位名：`general_contractor_id`
- `gc` 只是查詢中的別名，不是欄位名

### 錯誤 3：has_gc 一直為 0
**可能原因**：
1. Junction table 沒有資料
2. Junction table 的資料都被標記為 `deleted_at IS NOT NULL`
3. 遷移 SQL 執行失敗

**檢查**：
```sql
-- 檢查 junction table 資料
SELECT COUNT(*) FROM general_contractor_product WHERE deleted_at IS NULL;

-- 檢查遷移是否成功
SELECT general_contractor_id, COUNT(*)
FROM product
WHERE general_contractor_id IS NOT NULL
GROUP BY general_contractor_id;
```

---

## ✅ 執行後驗證

### 1. 確認欄位已建立
```sql
DESCRIBE product;
-- 應該看到 general_contractor_id 欄位
```

### 2. 確認資料已遷移
```sql
SELECT
    COUNT(*) AS total_products,
    SUM(CASE WHEN general_contractor_id IS NOT NULL THEN 1 ELSE 0 END) AS has_gc
FROM product;
```

### 3. 確認 junction table 已刪除
```sql
SHOW TABLES LIKE 'general_contractor_product';
-- 應該返回空結果
```

### 4. 確認關聯正常
```sql
SELECT
    p.id,
    p.name,
    p.general_contractor_id,
    gc.company_name
FROM product p
LEFT JOIN general_contractor gc ON p.general_contractor_id = gc.id
LIMIT 10;
```
