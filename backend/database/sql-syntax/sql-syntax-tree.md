# SQL 語法結構（Syntax Tree）

#sql #join #delete #insert #select #update

## 四大動作 + JOIN/WHERE 搭配

```
動作          FROM/INTO    JOIN              WHERE
─────────────────────────────────────────────────────
SELECT 欄位   FROM 表      JOIN 表 ON 條件    WHERE 篩選
INSERT INTO 表 SELECT 欄位 FROM 表 JOIN ...   WHERE 篩選
UPDATE 表      JOIN 表 ON 條件                WHERE 篩選
DELETE 表別名  FROM 表      JOIN 表 ON 條件    WHERE 篩選
```

---

## SELECT + JOIN

最基本的，從多張表查資料：

```sql
SELECT o.id, m.name, o.created_at
FROM `order` o
JOIN member m ON m.id = o.buyer_id
WHERE o.event_id = 'xxx';
```

---

## DELETE + JOIN

刪除時需要其他表的欄位來篩選：

```sql
DELETE oi FROM order_item oi
JOIN `order` o ON oi.order_id = o.id
JOIN member m ON m.id = o.buyer_id
WHERE o.event_id = 'xxx'
  AND m.name IN ('A', 'B');
```

`DELETE oi` = 只刪 order_item 的資料，JOIN 只是為了借用其他表的欄位篩選。

---

## INSERT + JOIN（INSERT INTO ... SELECT）

INSERT 不能直接接 JOIN，要透過 **INSERT INTO ... SELECT** 把查詢結果塞進去：

```sql
INSERT INTO order_log (order_id, member_name, event_id, created_at)
SELECT o.id, m.name, o.event_id, NOW()
FROM `order` o
JOIN member m ON m.id = o.buyer_id
WHERE o.event_id = 'xxx'
  AND m.name IN ('A', 'B');
```

### 結構拆解

```
INSERT INTO 目標表 (欄位1, 欄位2, ...)   ← 要塞進哪張表、哪些欄位
SELECT 值1, 值2, ...                     ← 從查詢結果取值（欄位數量要對應）
FROM 來源表                               ← 資料來源
JOIN 其他表 ON 關聯條件                    ← 關聯其他表
WHERE 篩選條件                            ← 篩選哪些資料要塞
```

### 重點
- **沒有 VALUES**，用 SELECT 取代
- SELECT 的欄位數量和型別要跟 INSERT INTO 的欄位**一一對應**
- 可以混用表的欄位和固定值（如 `NOW()`、`'pending'`、`0`）

### 實用範例：備份後刪除

```sql
-- 1. 先把要刪的資料備份到 log 表
INSERT INTO deleted_order_log (order_id, buyer_id, event_id, deleted_at)
SELECT o.id, o.buyer_id, o.event_id, NOW()
FROM `order` o
JOIN member m ON m.id = o.buyer_id
WHERE o.event_id = 'xxx'
  AND m.name = '測試帳號';

-- 2. 確認備份成功後再刪除
DELETE o FROM `order` o
JOIN member m ON m.id = o.buyer_id
WHERE o.event_id = 'xxx'
  AND m.name = '測試帳號';
```

---

## UPDATE + JOIN

更新時需要其他表的欄位來篩選或取值：

```sql
UPDATE `order` o
JOIN member m ON m.id = o.buyer_id
SET o.status = 'cancelled'
WHERE o.event_id = 'xxx'
  AND m.name = '測試帳號';
```

也可以用 JOIN 的表的值來更新：

```sql
-- 把 member 的 name 同步到 order 的 buyer_name 欄位
UPDATE `order` o
JOIN member m ON m.id = o.buyer_id
SET o.buyer_name = m.name
WHERE o.buyer_name IS NULL;
```

---

## 總結

| 動作 | 能搭 JOIN？ | 寫法 |
|------|------------|------|
| SELECT | 直接 JOIN | `SELECT ... FROM 表 JOIN ...` |
| DELETE | 直接 JOIN | `DELETE 別名 FROM 表 JOIN ...` |
| UPDATE | 直接 JOIN | `UPDATE 表 JOIN ... SET ...` |
| INSERT | 透過 SELECT | `INSERT INTO 表 SELECT ... FROM 表 JOIN ...` |
