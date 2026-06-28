# SQL `IN` 子句

## 基本語法

```sql
SELECT * FROM table WHERE column IN (值1, 值2, 值3, ...)
```

`IN` 後面接一個**括號包起來的值列表**，用逗號分隔。

## 實際範例

GORM Preload 產生的 SQL：

```sql
SELECT * FROM map_area WHERE map_id IN ('id1', 'id2', ..., 'id10')
```

意思是：找出 `map_id` 等於 `id1` 或 `id2` 或 ... 或 `id10` 的所有 `map_area` 記錄。

## `IN` 後面可以接什麼

| 用法 | 範例 | 說明 |
|------|------|------|
| 字串列表 | `IN ('a', 'b', 'c')` | 最常見 |
| 數字列表 | `IN (1, 2, 3)` | 不用加引號 |
| 子查詢 | `IN (SELECT id FROM other_table)` | 用另一個查詢的結果當值列表 |

## 等價寫法

`IN` 其實就是多個 `OR` 的簡寫：

```sql
-- 這兩個完全等價
WHERE map_id IN ('id1', 'id2', 'id3')
WHERE map_id = 'id1' OR map_id = 'id2' OR map_id = 'id3'
```

## 反向：`NOT IN`

```sql
-- 排除這些值
SELECT * FROM map_area WHERE map_id NOT IN ('id1', 'id2')
```

## GORM 對應寫法

```go
// IN
db.Where("map_id IN ?", []string{"id1", "id2", "id3"}).Find(&areas)

// NOT IN
db.Where("map_id NOT IN ?", []string{"id1", "id2"}).Find(&areas)
```

## 為什麼 GORM Preload 會產生 IN 查詢

當你用 `Preload("Areas")` 時，GORM 的策略是：

1. **第 1 次查詢**：查主表，拿到所有 map 記錄
   ```sql
   SELECT * FROM map WHERE event_id = 'xxx'
   ```
2. **第 2 次查詢**：收集所有 map 的 ID，用 `IN` 一次查出全部關聯資料
   ```sql
   SELECT * FROM map_area WHERE map_id IN ('id1', 'id2', ..., 'id10')
   ```

這樣只需要 **2 次查詢**，而不是每個 map 各查一次（N+1 問題）。

### N+1 問題圖解

```
❌ 沒有 Preload（N+1 次查詢）：
  SELECT * FROM map                          -- 1 次
  SELECT * FROM map_area WHERE map_id = 'id1'  -- +1
  SELECT * FROM map_area WHERE map_id = 'id2'  -- +1
  SELECT * FROM map_area WHERE map_id = 'id3'  -- +1
  ...共 N+1 次

✅ 有 Preload（2 次查詢）：
  SELECT * FROM map                                       -- 1 次
  SELECT * FROM map_area WHERE map_id IN ('id1','id2','id3')  -- 1 次
  ...共 2 次
```
