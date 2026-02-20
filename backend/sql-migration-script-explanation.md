# SQL 迁移脚本逻辑说明

## 问题解答

### 1. `information_schema.COLUMNS` 是什么？

`information_schema` 是 MySQL 的**系统数据库**，存储了所有数据库的元数据（metadata）。

- **`information_schema.COLUMNS`**：存储所有数据库中所有表的所有字段信息
- 这是 MySQL 内置的，不需要创建
- 可以查询表结构、字段类型、是否允许 NULL 等信息

**示例查询**：
```sql
SELECT * FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'your_database_name'
  AND TABLE_NAME = 'order_electricity'
  AND COLUMN_NAME = 'calculation_rule_id';
```

这会返回该字段的详细信息（类型、是否允许 NULL、默认值等）。

### 2. 为什么没有写数据库的本名？

使用了 `DATABASE()` 函数，它会**自动返回当前连接的数据库名称**。

```sql
WHERE TABLE_SCHEMA = DATABASE()
```

**等价于**：
```sql
WHERE TABLE_SCHEMA = 'your_database_name'  -- 假设当前数据库是 your_database_name
```

**优点**：
- ✅ 不需要硬编码数据库名称
- ✅ 脚本可以在不同数据库上运行
- ✅ 更灵活、可移植

### 3. 脚本逻辑详解

```sql
-- 步骤 1：检查字段是否存在
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_electricity'
      AND COLUMN_NAME = 'calculation_rule_id'
);
```

**这一步做什么**：
- 查询 `information_schema.COLUMNS` 表
- 查找当前数据库中 `order_electricity` 表的 `calculation_rule_id` 字段
- `COUNT(*)` 返回匹配的行数：
  - `0` = 字段不存在
  - `1` = 字段已存在

```sql
-- 步骤 2：根据检查结果决定执行什么
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE order_electricity ADD COLUMN ...',  -- 如果不存在，执行添加
    'SELECT ''Column calculation_rule_id already exists'' AS message'  -- 如果存在，只显示消息
);
```

**`IF` 函数逻辑**：
- `IF(条件, 值1, 值2)`
- 如果 `@col_exists = 0`（字段不存在）→ 执行 `ALTER TABLE` 添加字段
- 如果 `@col_exists = 1`（字段已存在）→ 只执行 `SELECT` 显示消息，**不执行 ALTER TABLE**

```sql
-- 步骤 3：执行动态 SQL
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

**动态 SQL 执行**：
- `PREPARE`：准备 SQL 语句（存储在 `@sql` 变量中）
- `EXECUTE`：执行准备好的语句
- `DEALLOCATE`：释放资源

### 4. 如果看到 "Column calculation_rule_id already exists" 是什么意思？

**答案：字段已经存在，脚本没有执行添加操作**

**执行流程**：

#### 情况 A：字段不存在（首次执行）
```
1. @col_exists = 0（字段不存在）
2. @sql = 'ALTER TABLE order_electricity ADD COLUMN ...'
3. 执行 ALTER TABLE → 字段被添加 ✅
4. 结果：字段成功添加
```

#### 情况 B：字段已存在（重复执行）
```
1. @col_exists = 1（字段已存在）
2. @sql = 'SELECT ''Column calculation_rule_id already exists'' AS message'
3. 执行 SELECT → 只显示消息，不执行 ALTER TABLE
4. 结果：显示消息，字段保持不变
```

**重要**：如果看到这个消息，说明：
- ✅ 字段已经存在
- ✅ 脚本**没有**执行 `ALTER TABLE`
- ✅ 这是**幂等性**设计（可以安全地重复执行）

## 为什么这样设计？

### 幂等性（Idempotent）

**定义**：无论执行多少次，结果都一样。

**好处**：
- ✅ 可以安全地重复执行脚本
- ✅ 不会因为字段已存在而报错
- ✅ 适合自动化部署和迁移

**如果没有这个检查**：
```sql
-- 危险：如果字段已存在会报错
ALTER TABLE order_electricity
ADD COLUMN calculation_rule_id VARCHAR(36) NULL;
-- 错误：Duplicate column name 'calculation_rule_id'
```

**有了检查后**：
```sql
-- 安全：如果字段已存在，跳过添加
-- 可以重复执行，不会报错
```

## 完整执行示例

### 第一次执行
```sql
-- 1. 检查：字段不存在
@col_exists = 0

-- 2. 生成 SQL
@sql = 'ALTER TABLE order_electricity ADD COLUMN calculation_rule_id ...'

-- 3. 执行
ALTER TABLE order_electricity ADD COLUMN calculation_rule_id VARCHAR(36) NULL ...
-- ✅ 字段被添加
```

### 第二次执行（字段已存在）
```sql
-- 1. 检查：字段已存在
@col_exists = 1

-- 2. 生成 SQL
@sql = 'SELECT ''Column calculation_rule_id already exists'' AS message'

-- 3. 执行
SELECT 'Column calculation_rule_id already exists' AS message
-- 结果：显示消息，字段保持不变
```

## 总结

| 情况 | @col_exists | 执行的 SQL | 结果 |
|------|-------------|-----------|------|
| 字段不存在 | 0 | `ALTER TABLE ... ADD COLUMN` | 字段被添加 ✅ |
| 字段已存在 | 1 | `SELECT '...already exists'` | 显示消息，不添加 |

**关键点**：
- `information_schema.COLUMNS` 是系统表，存储字段元数据
- `DATABASE()` 自动获取当前数据库名称
- 这是**幂等性**设计，可以安全重复执行
- 如果看到 "already exists" 消息，说明字段已存在，脚本**没有**执行添加操作
