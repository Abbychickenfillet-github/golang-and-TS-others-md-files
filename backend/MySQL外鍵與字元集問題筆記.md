# MySQL 外鍵與字元集問題筆記

## 問題一：外鍵建立失敗 (Error 2780)

### 錯誤訊息
```
SQL錯誤 2780: Referencing column 'company_id' and referenced column 'id'
in foreign key constraint 'fk_user_company' are incompatible.
```

### 原因
兩個表的欄位「資料類型」或「字元集/排序規則」不一致。

### 解決方式
在新增欄位時，明確指定與目標表相同的字元集：

```sql
ALTER TABLE `user`
  ADD COLUMN company_id VARCHAR(36)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    NULL COMMENT '所屬公司';
```

---

## 問題二：重複欄位 (Duplicate column name)

### 錯誤訊息
```
Duplicate column name 'company_id'
```

### 原因
欄位已經存在，不需要再次新增。

### 解決方式
跳過 ADD COLUMN，直接執行外鍵和索引：

```sql
-- 只需要建立外鍵和索引
ALTER TABLE `user`
  ADD CONSTRAINT fk_user_company
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL;

CREATE INDEX idx_user_company_id ON `user`(company_id);
```

---

## 字元集 (CHARACTER SET) 與排序規則 (COLLATE) 說明

### 什麼是 CHARACTER SET？
- 定義資料庫可以儲存哪些字元
- `utf8mb4` = 完整的 UTF-8 編碼，支援所有 Unicode 字元（包含表情符號）
- `utf8` = MySQL 早期的 UTF-8，只支援 3 bytes，不支援表情符號

### 什麼是 COLLATE？
- 定義字串的「比較」和「排序」規則
- `utf8mb4_unicode_ci`：
  - `unicode` = 使用 Unicode 標準排序
  - `ci` = Case Insensitive（不區分大小寫）
- `utf8mb4_general_ci`：較快但較不精確的排序
- `utf8mb4_bin`：二進位比較，區分大小寫

### 為什麼外鍵需要相同的 COLLATE？
```
┌─────────────────┐      ┌─────────────────┐
│   user 表        │      │   company 表     │
├─────────────────┤      ├─────────────────┤
│ company_id      │──FK──│ id              │
│ (utf8mb4_bin)   │  ❌  │ (utf8mb4_unicode_ci)
└─────────────────┘      └─────────────────┘

如果 COLLATE 不同，MySQL 無法正確比較兩個欄位的值，
所以拒絕建立外鍵約束。
```

### 如何檢查表的字元集？

```sql
-- 檢查表的字元集和排序規則
SHOW TABLE STATUS LIKE 'user';
SHOW TABLE STATUS LIKE 'company';

-- 檢查特定欄位的詳細資訊
SHOW FULL COLUMNS FROM `user`;
SHOW FULL COLUMNS FROM company;
```

---

## 最佳實踐

### 1. 建立資料庫時統一字元集
```sql
CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. 建立表時統一字元集
```sql
CREATE TABLE my_table (
  ...
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
```

### 3. 外鍵欄位明確指定字元集
```sql
ALTER TABLE child_table
  ADD COLUMN parent_id VARCHAR(36)
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

---

## 常見 COLLATE 比較

| COLLATE | 說明 | 使用場景 |
|---------|------|----------|
| `utf8mb4_unicode_ci` | Unicode 排序，不區分大小寫 | 一般用途（推薦） |
| `utf8mb4_general_ci` | 較快但較不精確 | 效能優先 |
| `utf8mb4_bin` | 二進位比較，區分大小寫 | 密碼、Token |
| `utf8mb4_0900_ai_ci` | MySQL 8.0 預設，更精確 | MySQL 8.0+ |

---

## 本次修正的完整 SQL

```sql
-- 127_add_user_company_id.sql

-- 1. 新增欄位（如果不存在）
ALTER TABLE `user`
  ADD COLUMN company_id VARCHAR(36)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    NULL COMMENT '所屬公司（外部廠商員工用）';

-- 2. 建立外鍵約束
ALTER TABLE `user`
  ADD CONSTRAINT fk_user_company
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL;

-- 3. 建立索引
CREATE INDEX idx_user_company_id ON `user`(company_id);
```

---

*建立日期：2025-12-17*
