# 資料庫筆記

## SQL 命名規則

- 英文存進資料庫都要**小寫**
- SQL 檔案命名：`XXX_描述.sql`（XXX 為流水號）
- 檔案放在 `backend/sql/` 目錄

---

## 常用 SQL 語法

```sql
-- 新增欄位
ALTER TABLE table_name
ADD COLUMN column_name VARCHAR(255) NOT NULL DEFAULT '';

-- 新增索引
ALTER TABLE table_name
ADD INDEX idx_name (column1, column2);

-- 查看表結構
DESCRIBE table_name;
```

---

## Company Role 類型

| role | 說明 |
|------|------|
| `general_contractor` | 總承包商 |
| `furniture_company` | 傢俱公司 |
| `electricity_company` | 電力公司 |

---

## 待補充...
