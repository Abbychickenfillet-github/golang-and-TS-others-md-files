# SQL 遷移腳本邏輯說明

## 問題解答

### 1. `information_schema.COLUMNS` 是什麼？

`information_schema` 是 MySQL 的**系統數據庫**，存儲了所有數據庫的元數據（metadata）。

- **`information_schema.COLUMNS`**：存儲所有數據庫中所有表的所有字段信息
- 這是 MySQL 內置的，不需要創建
- 可以查詢表結構、字段類型、是否允許 NULL 等信息

**示例查詢**：
```sql
SELECT * FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'your_database_name'
  AND TABLE_NAME = 'order_electricity'
  AND COLUMN_NAME = 'calculation_rule_id';
```

這會返回該字段的詳細信息（類型、是否允許 NULL、默認值等）。

### 2. 為什麼沒有寫數據庫的本名？

使用了 `DATABASE()` 函數，它會**自動返回當前連接的數據庫名稱**。

```sql
WHERE TABLE_SCHEMA = DATABASE()
```

**等價於**：
```sql
WHERE TABLE_SCHEMA = 'your_database_name'  -- 假設當前數據庫是 your_database_name
```

**優點**：
- ✅ 不需要硬編碼數據庫名稱
- ✅ 腳本可以在不同數據庫上運行
- ✅ 更靈活、可移植

### 3. 腳本邏輯詳解

```sql
-- 步驟 1：檢查字段是否存在
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_electricity'
      AND COLUMN_NAME = 'calculation_rule_id'
);
```

**這一步做什麼**：
- 查詢 `information_schema.COLUMNS` 表
- 查找當前數據庫中 `order_electricity` 表的 `calculation_rule_id` 字段
- `COUNT(*)` 返回匹配的行數：
  - `0` = 字段不存在
  - `1` = 字段已存在

```sql
-- 步驟 2：根據檢查結果決定執行什麼
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE order_electricity ADD COLUMN ...',  -- 如果不存在，執行添加
    'SELECT ''Column calculation_rule_id already exists'' AS message'  -- 如果存在，只顯示消息
);
```

**`IF` 函數邏輯**：
- `IF(條件, 值1, 值2)`
- 如果 `@col_exists = 0`（字段不存在）→ 執行 `ALTER TABLE` 添加字段
- 如果 `@col_exists = 1`（字段已存在）→ 只執行 `SELECT` 顯示消息，**不執行 ALTER TABLE**

```sql
-- 步驟 3：執行動態 SQL
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

**動態 SQL 執行**：
- `PREPARE`：準備 SQL 語句（存儲在 `@sql` 變量中）
- `EXECUTE`：執行準備好的語句
- `DEALLOCATE`：釋放資源

### 4. 如果看到 "Column calculation_rule_id already exists" 是什麼意思？

**答案：字段已經存在，腳本沒有執行添加操作**

**執行流程**：

#### 情況 A：字段不存在（首次執行）
```
1. @col_exists = 0（字段不存在）
2. @sql = 'ALTER TABLE order_electricity ADD COLUMN ...'
3. 執行 ALTER TABLE → 字段被添加 ✅
4. 結果：字段成功添加
```

#### 情況 B：字段已存在（重複執行）
```
1. @col_exists = 1（字段已存在）
2. @sql = 'SELECT ''Column calculation_rule_id already exists'' AS message'
3. 執行 SELECT → 只顯示消息，不執行 ALTER TABLE
4. 結果：顯示消息，字段保持不變
```

**重要**：如果看到這個消息，說明：
- ✅ 字段已經存在
- ✅ 腳本**沒有**執行 `ALTER TABLE`
- ✅ 這是**冪等性**設計（可以安全地重複執行）

## 為什麼這樣設計？

### 冪等性（Idempotent）

**定義**：無論執行多少次，結果都一樣。

**好處**：
- ✅ 可以安全地重複執行腳本
- ✅ 不會因為字段已存在而報錯
- ✅ 適合自動化部署和遷移

**如果沒有這個檢查**：
```sql
-- 危險：如果字段已存在會報錯
ALTER TABLE order_electricity
ADD COLUMN calculation_rule_id VARCHAR(36) NULL;
-- 錯誤：Duplicate column name 'calculation_rule_id'
```

**有了檢查後**：
```sql
-- 安全：如果字段已存在，跳過添加
-- 可以重複執行，不會報錯
```

## 完整執行示例

### 第一次執行
```sql
-- 1. 檢查：字段不存在
@col_exists = 0

-- 2. 生成 SQL
@sql = 'ALTER TABLE order_electricity ADD COLUMN calculation_rule_id ...'

-- 3. 執行
ALTER TABLE order_electricity ADD COLUMN calculation_rule_id VARCHAR(36) NULL ...
-- ✅ 字段被添加
```

### 第二次執行（字段已存在）
```sql
-- 1. 檢查：字段已存在
@col_exists = 1

-- 2. 生成 SQL
@sql = 'SELECT ''Column calculation_rule_id already exists'' AS message'

-- 3. 執行
SELECT 'Column calculation_rule_id already exists' AS message
-- 結果：顯示消息，字段保持不變
```

## 總結

| 情況 | @col_exists | 執行的 SQL | 結果 |
|------|-------------|-----------|------|
| 字段不存在 | 0 | `ALTER TABLE ... ADD COLUMN` | 字段被添加 ✅ |
| 字段已存在 | 1 | `SELECT '...already exists'` | 顯示消息，不添加 |

**關鍵點**：
- `information_schema.COLUMNS` 是系統表，存儲字段元數據
- `DATABASE()` 自動獲取當前數據庫名稱
- 這是**冪等性**設計，可以安全重複執行
- 如果看到 "already exists" 消息，說明字段已存在，腳本**沒有**執行添加操作
