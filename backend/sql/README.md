# SQL Scripts Directory

這個資料夾包含所有的資料庫 SQL 腳本，用於建立和維護資料庫結構。

## 📁 檔案結構

```
sql/
├── README.md                    # 此說明文件
├── 001_create_member_table.sql  # 會員表創建腳本
└── (未來的 SQL 腳本...)
```

## 📋 腳本命名規則

使用以下命名格式：`{序號}_{描述}.sql`

- **序號**: 三位數字，確保執行順序（如 001, 002, 003...）
- **描述**: 簡短的英文描述，使用底線分隔
- **範例**: `001_create_member_table.sql`, `002_create_product_table.sql`

## 🚀 使用方式

### 1. 執行單個腳本
```bash
# 連接到資料庫並執行腳本
mysql -u username -p database_name < 001_create_member_table.sql

# 或使用 PostgreSQL
psql -U username -d database_name -f 001_create_member_table.sql
```

### 2. 批次執行所有腳本
```bash
# MySQL
for file in sql/*.sql; do
    echo "執行: $file"
    mysql -u username -p database_name < "$file"
done

# PostgreSQL
for file in sql/*.sql; do
    echo "執行: $file"
    psql -U username -d database_name -f "$file"
done
```

## 📝 腳本編寫規範

### 1. 檔案頭部註解
每個 SQL 腳本應包含：
- 腳本用途說明
- 創建時間
- 相關描述

### 2. 區段分隔
使用註解分隔不同功能區段：
```sql
-- =====================================================
-- 區段標題
-- =====================================================
```

### 3. 欄位註解
每個欄位都應包含 COMMENT 說明：
```sql
name VARCHAR(255) NOT NULL COMMENT '姓名',
```

### 4. 索引命名
- 一般索引：`idx_{table}_{column}`
- 唯一索引：`idx_{table}_{column}_unique`
- 複合索引：`idx_{table}_{column1}_{column2}`

## 🗃️ 現有腳本說明

### 001_create_member_table.sql
- **用途**: 創建會員管理表
- **功能**:
  - 會員基本資訊儲存
  - 支援軟刪除
  - 多種身分類型（主辦單位/品牌方/消費者）
  - 完整的索引結構
  - 唯一性約束

## ⚠️ 注意事項

1. **執行順序**: 請按照檔案名稱的數字順序執行
2. **備份**: 執行前請確保資料庫已備份
3. **環境**: 請確認是在正確的資料庫環境中執行
4. **權限**: 確保有足夠的權限執行 DDL 語句
5. **依賴**: 某些腳本可能依賴於其他表的存在

## 🔄 版本控制

- 所有 SQL 腳本都應納入版本控制
- 修改現有表結構時，創建新的遷移腳本而不是修改原有腳本
- 保持腳本的向前兼容性