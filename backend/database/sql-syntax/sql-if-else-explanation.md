# SQL 中的 IF...ELSE 邏輯

## 問題：這是 IF...ELSE 嗎？

**答案：是的！** 這是 MySQL 的 `IF()` 函數，相當於編程語言中的 if...else。

## SQL 代碼解析

```sql
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE order_electricity ADD COLUMN ...',  -- 如果條件為真（字段不存在）
    'SELECT ''Column calculation_rule_id already exists'' AS message'  -- 如果條件為假（字段已存在）
);
```

### 等價的編程語言寫法

#### Python
```python
if col_exists == 0:
    sql = 'ALTER TABLE order_electricity ADD COLUMN ...'
else:
    sql = 'SELECT "Column calculation_rule_id already exists" AS message'
```

#### JavaScript
```javascript
const sql = col_exists === 0
    ? 'ALTER TABLE order_electricity ADD COLUMN ...'
    : 'SELECT "Column calculation_rule_id already exists" AS message';
```

#### C/C++/Java
```java
String sql;
if (col_exists == 0) {
    sql = "ALTER TABLE order_electricity ADD COLUMN ...";
} else {
    sql = "SELECT 'Column calculation_rule_id already exists' AS message";
}
```

## MySQL IF() 函數語法

```sql
IF(條件, 值1, 值2)
```

- **條件為真**：返回 `值1`
- **條件為假**：返回 `值2`

### 完整流程

```sql
-- 步驟 1：檢查字段是否存在（相當於 if 的條件判斷）
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_electricity'
      AND COLUMN_NAME = 'calculation_rule_id'
);
-- 結果：@col_exists = 0（不存在）或 1（存在）

-- 步驟 2：根據條件選擇執行哪個 SQL（相當於 if...else）
SET @sql := IF(@col_exists = 0,
    -- IF 條件為真（字段不存在）→ 執行這個
    'ALTER TABLE order_electricity
     ADD COLUMN calculation_rule_id VARCHAR(36) NULL COMMENT ''使用的計費規則 ID'' AFTER order_id',

    -- IF 條件為假（字段已存在）→ 執行這個
    'SELECT ''Column calculation_rule_id already exists in order_electricity'' AS message'
);

-- 步驟 3：執行選擇的 SQL（相當於執行 if 或 else 分支的代碼）
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

## 執行流程圖

```
開始
  ↓
檢查字段是否存在
  ↓
@col_exists = ?
  ↓
    ┌─────────────┐
    │   0 (不存在)  │
    └──────┬──────┘
           │
           ↓
    IF 條件為真
           │
           ↓
    執行 ALTER TABLE
    ADD COLUMN ...
           │
           ↓
    字段被添加 ✅
           │
           └──────────┐
                      │
    ┌─────────────┐   │
    │   1 (已存在)  │   │
    └──────┬──────┘   │
           │          │
           ↓          │
    IF 條件為假       │
           │          │
           ↓          │
    執行 SELECT       │
    'already exists' │
           │          │
           ↓          │
    顯示消息          │
    字段保持不變      │
           │          │
           └──────────┘
           ↓
        結束
```

## 實際執行示例

### 示例 1：字段不存在（首次執行）

```sql
-- 1. 檢查
@col_exists = 0  -- 字段不存在

-- 2. IF 判斷
IF(0 = 0, ...)  -- 條件為真 ✅

-- 3. 執行
ALTER TABLE order_electricity
ADD COLUMN calculation_rule_id VARCHAR(36) NULL ...

-- 結果：字段被添加 ✅
```

### 示例 2：字段已存在（重複執行）

```sql
-- 1. 檢查
@col_exists = 1  -- 字段已存在

-- 2. IF 判斷
IF(1 = 0, ...)  -- 條件為假 ❌

-- 3. 執行
SELECT 'Column calculation_rule_id already exists in order_electricity' AS message

-- 結果：顯示消息，字段保持不變
```

## 為什麼使用動態 SQL？

### 問題：為什麼不直接寫 IF...ELSE？

**直接寫法（MySQL 不支持）**：
```sql
-- ❌ MySQL 不支持這種語法
IF @col_exists = 0 THEN
    ALTER TABLE order_electricity ADD COLUMN ...;
ELSE
    SELECT 'already exists';
END IF;
```

**原因**：
- MySQL 的 `IF...ELSE` 只能在存儲過程（Stored Procedure）中使用
- 普通 SQL 腳本不支持 `IF...ELSE` 語句塊
- 但可以使用 `IF()` 函數

### 解決方案：動態 SQL

```sql
-- ✅ 使用 IF() 函數 + 動態 SQL
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE ...',  -- SQL 語句作為字符串
    'SELECT ...'         -- SQL 語句作為字符串
);

PREPARE stmt FROM @sql;  -- 準備執行
EXECUTE stmt;            -- 執行
```

## 總結

| 概念 | SQL 寫法 | 編程語言等價 |
|------|---------|------------|
| 條件判斷 | `IF(條件, 值1, 值2)` | `if (條件) { 值1 } else { 值2 }` |
| 變量賦值 | `SET @var = ...` | `var = ...` |
| 動態執行 | `PREPARE ... EXECUTE` | `eval()` 或類似 |

**關鍵點**：
- ✅ `IF()` 函數 = if...else
- ✅ `@col_exists = 0` = 條件判斷
- ✅ 動態 SQL = 根據條件執行不同的 SQL 語句
- ✅ 這是**冪等性**設計，可以安全重複執行
