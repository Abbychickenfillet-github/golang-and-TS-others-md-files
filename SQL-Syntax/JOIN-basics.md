# SQL JOIN 基礎觀念

## 用了別名之後，還能用原始表名嗎？

**MySQL 可以，但大部分情況建議統一用別名。**

```sql
-- 這樣可以（MySQL 允許混用）
SELECT booth.name
FROM booth b
WHERE booth.id = '...';

-- 但這樣更清楚、更統一
SELECT b.name
FROM booth b
WHERE b.id = '...';
```

**但有一個情況必須用別名：自己 JOIN 自己（Self Join）**

```sql
-- 錯：SQL 不知道 booth 指的是哪一個
SELECT booth.name
FROM booth
JOIN booth ON booth.id = booth.parent_id;  -- 搞不清楚誰是誰

-- 對：用別名區分
SELECT child.name, parent.name
FROM booth child
JOIN booth parent ON parent.id = child.parent_id;
```

**建議**：一旦給了別名，全部統一用別名，不要混用，避免自己搞混。

---

## 最重要的一件事：FROM 是起點，SELECT 只是挑欄位

SQL 的執行順序不是你寫的順序，實際上是：

```
1. FROM    → 先決定「從哪張表開始」
2. JOIN    → 把其他表接上來
3. WHERE   → 過濾條件
4. SELECT  → 最後才挑你要顯示的欄位
```

所以 `SELECT` 寫什麼不影響 `FROM`，`FROM` 才是真正的起點。

---

## 你的錯誤寫法 vs 正確寫法

### 你的寫法（錯誤）
```sql
SELECT booth.name
FROM `booth`
WHERE booth_order_subscription bos   -- WHERE 不能接 JOIN
JOIN booth b ON b.id = bos.order_id  -- JOIN 的位置錯了
WHERE order_id = "..."               -- 兩個 WHERE
```

問題：
1. `FROM booth` → 你從 booth 開始，但 booth 表沒有 order_id 欄位
2. JOIN 寫在 WHERE 後面 → 語法錯誤，JOIN 要寫在 FROM 後面
3. 兩個 WHERE → 只能有一個 WHERE

### 正確寫法
```sql
SELECT b.name
FROM booth_order_subscription bos    -- 從橋接表開始（因為它有 order_id）
JOIN booth b ON b.id = bos.booth_id  -- 把 booth 表接上來
WHERE bos.order_id = '9fa52a18-9e30-4c72-a812-77877754ec90';
```

---

## FROM 該選哪張表？看你的 WHERE 條件

**原則：FROM 選「你有篩選條件的那張表」或「橋接表」**

| 你想做的事 | FROM 該選 | 為什麼 |
|-----------|----------|--------|
| 用 order_id 找 booth.name | `booth_order_subscription` | 因為它有 order_id，又能 JOIN 到 booth |
| 用 booth.name 找 order | `booth` | 因為 booth 有 name 欄位 |
| 同時要 order + booth 資料 | 任一張都行，用 JOIN 串 | 三張表都會 JOIN 起來 |

---

## JOIN 的語法結構

```sql
SELECT 你要的欄位
FROM 起點表 別名
JOIN 要接的表 別名 ON 接合條件
JOIN 要接的表 別名 ON 接合條件   -- 可以接很多張
WHERE 篩選條件;
```

### 實際範例：從 order_id 找到攤位名稱 + 訂單金額

```sql
SELECT o.order_number, o.total_amount, b.name AS booth_name
FROM `order` o                                    -- 起點：order 表
JOIN booth_order_subscription bos ON bos.order_id = o.id   -- 接橋接表
JOIN booth b ON b.id = bos.booth_id               -- 再接 booth 表
WHERE o.id = '9fa52a18-9e30-4c72-a812-77877754ec90';
```

關係鏈：`order` ←(order_id)→ `booth_order_subscription` ←(booth_id)→ `booth`

---

## ON 的意思

`ON` 就是告訴 SQL「兩張表用哪個欄位對接」：

```sql
JOIN booth b ON b.id = bos.booth_id
--   ^^^^表    ^^^^表的主鍵 = ^^^^另一張表的外鍵
```

翻譯：「把 booth 表接上來，對接條件是 booth.id = booth_order_subscription.booth_id」

---

## 別名（Alias）

`booth_order_subscription bos` 中的 `bos` 是別名，純粹是為了少打字：

```sql
-- 不用別名（累死）
SELECT booth.name FROM booth_order_subscription
JOIN booth ON booth.id = booth_order_subscription.booth_id

-- 用別名（清爽）
SELECT b.name FROM booth_order_subscription bos
JOIN booth b ON b.id = bos.booth_id
```

---

## 常見錯誤

### 1. FROM 選錯表
```sql
-- 錯：booth 沒有 order_id
SELECT b.name FROM booth b WHERE b.order_id = '...'

-- 對：從有 order_id 的表開始
SELECT b.name FROM booth_order_subscription bos
JOIN booth b ON b.id = bos.booth_id
WHERE bos.order_id = '...'
```

### 2. JOIN 寫在 WHERE 後面
```sql
-- 錯
FROM booth WHERE ... JOIN ...

-- 對
FROM booth JOIN ... WHERE ...
```

### 3. ON 條件接錯欄位
```sql
-- 錯：order_id 不是 booth 的主鍵
JOIN booth b ON b.id = bos.order_id

-- 對：booth_id 才是
JOIN booth b ON b.id = bos.booth_id
```
