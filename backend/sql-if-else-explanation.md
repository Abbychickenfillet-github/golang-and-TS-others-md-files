# SQL 中的 IF...ELSE 逻辑

## 问题：这是 IF...ELSE 吗？

**答案：是的！** 这是 MySQL 的 `IF()` 函数，相当于编程语言中的 if...else。

## SQL 代码解析

```sql
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE order_electricity ADD COLUMN ...',  -- 如果条件为真（字段不存在）
    'SELECT ''Column calculation_rule_id already exists'' AS message'  -- 如果条件为假（字段已存在）
);
```

### 等价的编程语言写法

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

## MySQL IF() 函数语法

```sql
IF(条件, 值1, 值2)
```

- **条件为真**：返回 `值1`
- **条件为假**：返回 `值2`

### 完整流程

```sql
-- 步骤 1：检查字段是否存在（相当于 if 的条件判断）
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_electricity'
      AND COLUMN_NAME = 'calculation_rule_id'
);
-- 结果：@col_exists = 0（不存在）或 1（存在）

-- 步骤 2：根据条件选择执行哪个 SQL（相当于 if...else）
SET @sql := IF(@col_exists = 0,
    -- IF 条件为真（字段不存在）→ 执行这个
    'ALTER TABLE order_electricity
     ADD COLUMN calculation_rule_id VARCHAR(36) NULL COMMENT ''使用的計費規則 ID'' AFTER order_id',

    -- IF 条件为假（字段已存在）→ 执行这个
    'SELECT ''Column calculation_rule_id already exists in order_electricity'' AS message'
);

-- 步骤 3：执行选择的 SQL（相当于执行 if 或 else 分支的代码）
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

## 执行流程图

```
开始
  ↓
检查字段是否存在
  ↓
@col_exists = ?
  ↓
    ┌─────────────┐
    │   0 (不存在)  │
    └──────┬──────┘
           │
           ↓
    IF 条件为真
           │
           ↓
    执行 ALTER TABLE
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
    IF 条件为假       │
           │          │
           ↓          │
    执行 SELECT       │
    'already exists' │
           │          │
           ↓          │
    显示消息          │
    字段保持不变      │
           │          │
           └──────────┘
           ↓
        结束
```

## 实际执行示例

### 示例 1：字段不存在（首次执行）

```sql
-- 1. 检查
@col_exists = 0  -- 字段不存在

-- 2. IF 判断
IF(0 = 0, ...)  -- 条件为真 ✅

-- 3. 执行
ALTER TABLE order_electricity
ADD COLUMN calculation_rule_id VARCHAR(36) NULL ...

-- 结果：字段被添加 ✅
```

### 示例 2：字段已存在（重复执行）

```sql
-- 1. 检查
@col_exists = 1  -- 字段已存在

-- 2. IF 判断
IF(1 = 0, ...)  -- 条件为假 ❌

-- 3. 执行
SELECT 'Column calculation_rule_id already exists in order_electricity' AS message

-- 结果：显示消息，字段保持不变
```

## 为什么使用动态 SQL？

### 问题：为什么不直接写 IF...ELSE？

**直接写法（MySQL 不支持）**：
```sql
-- ❌ MySQL 不支持这种语法
IF @col_exists = 0 THEN
    ALTER TABLE order_electricity ADD COLUMN ...;
ELSE
    SELECT 'already exists';
END IF;
```

**原因**：
- MySQL 的 `IF...ELSE` 只能在存储过程（Stored Procedure）中使用
- 普通 SQL 脚本不支持 `IF...ELSE` 语句块
- 但可以使用 `IF()` 函数

### 解决方案：动态 SQL

```sql
-- ✅ 使用 IF() 函数 + 动态 SQL
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE ...',  -- SQL 语句作为字符串
    'SELECT ...'         -- SQL 语句作为字符串
);

PREPARE stmt FROM @sql;  -- 准备执行
EXECUTE stmt;            -- 执行
```

## 总结

| 概念 | SQL 写法 | 编程语言等价 |
|------|---------|------------|
| 条件判断 | `IF(条件, 值1, 值2)` | `if (条件) { 值1 } else { 值2 }` |
| 变量赋值 | `SET @var = ...` | `var = ...` |
| 动态执行 | `PREPARE ... EXECUTE` | `eval()` 或类似 |

**关键点**：
- ✅ `IF()` 函数 = if...else
- ✅ `@col_exists = 0` = 条件判断
- ✅ 动态 SQL = 根据条件执行不同的 SQL 语句
- ✅ 这是**幂等性**设计，可以安全重复执行
