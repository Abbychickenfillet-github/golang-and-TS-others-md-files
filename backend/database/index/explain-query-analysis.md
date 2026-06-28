# EXPLAIN — 查詢分析語法

## 一句話定義

`EXPLAIN` 不會真的執行查詢，而是讓 DB **告訴你它打算怎麼跑這個 query**——有沒有用 index、會掃幾筆、用什麼 join 策略。**優化 SQL 的第一個工具**。

## 基本用法

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 123;
```

MySQL 會回傳一張表，每一列代表一個讀取步驟。

## 重點欄位（MySQL）

| 欄位 | 意義 | 看到什麼要警覺 |
|------|------|-------------|
| **type** | 存取方式 | `ALL`（全表掃描）⚠️ |
| **key** | 實際用了哪個 index | `NULL`（沒用 index）⚠️ |
| **rows** | 預估要掃幾筆 | 數字越大越慢 |
| **Extra** | 額外資訊 | `Using filesort`、`Using temporary` ⚠️ |
| **possible_keys** | 可用的 index | 跟 `key` 比對，看為什麼沒選某個 |
| **ref** | 跟 index 比對的值來源 | const / 欄位名 |

## type 欄位排名（從快到慢）

```
system > const > eq_ref > ref > range > index > ALL
   ↑ 最快                                        ↑ 最慢（全表掃）
```

| type | 意思 | 例子 |
|------|------|------|
| `const` | 主鍵或唯一索引等值查 | `WHERE id = 5` |
| `eq_ref` | JOIN 時用主鍵 | `ON a.id = b.a_id` |
| `ref` | 一般 index 等值查 | `WHERE user_id = 5` |
| `range` | index 範圍查 | `WHERE id BETWEEN 1 AND 100` |
| `index` | 整個 index 掃過 | `SELECT id FROM t`（cover index） |
| `ALL` | 全表掃描 ⚠️ | 沒 index 的條件 |

## 實戰範例

### ❌ 慢查詢

```sql
EXPLAIN SELECT * FROM orders WHERE created_at > '2026-01-01';
```

```
type: ALL
key: NULL
rows: 1000000
Extra: Using where
```

**問題：** 全表掃 100 萬筆，沒用 index。

**解法：** 加 index。

```sql
CREATE INDEX idx_created_at ON orders(created_at);
```

### ✅ 快查詢

```sql
EXPLAIN SELECT * FROM orders WHERE created_at > '2026-01-01';
```

```
type: range
key: idx_created_at
rows: 5000
Extra: Using index condition
```

**rows 從 100 萬 → 5 千**，DB 用 index 直接跳到對應位置。

## Extra 欄位重點警訊

| 訊息 | 意義 | 嚴重度 |
|------|------|-------|
| `Using index` | Cover index，不用回表 | ✅ 好 |
| `Using where` | 用 WHERE 過濾 | 中性 |
| `Using filesort` | 排序在記憶體/磁碟做（沒走 index） | ⚠️ 慢 |
| `Using temporary` | 建臨時表（GROUP BY、DISTINCT） | ⚠️ 慢 |
| `Using join buffer` | JOIN 沒用 index | ⚠️ 很慢 |

## 進階：EXPLAIN ANALYZE

MySQL 8.0+ / PostgreSQL：

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;
```

**差別：**

- `EXPLAIN`：只顯示「計畫」（不執行）
- `EXPLAIN ANALYZE`：**真的執行一次**，回傳實際耗時、實際掃了多少筆

可以對照「預估」vs「實際」的差距，找統計資訊不準的問題。

## EXPLAIN 格式變化

```sql
EXPLAIN FORMAT=JSON SELECT ...;   -- JSON 格式，更詳細
EXPLAIN FORMAT=TREE SELECT ...;   -- 樹狀（MySQL 8.0+）
```

## 對照 FutureSign 工作流

寫完一個查詢、覺得慢的時候，**SOP**：

1. **本機 / staging 跑** `EXPLAIN <你的 SQL>`
2. 看 `type` 是不是 `ALL` → 是的話沒用 index
3. 看 `key` 是不是 `NULL` → 是的話沒用 index
4. 看 `rows` 是不是大到不合理（例如查單筆卻掃 10 萬）
5. 看 `Extra` 有沒有 `filesort` / `temporary`

**常見場景：**

- `WHERE event_id = ? AND status = ?` 慢 → 加複合 index `(event_id, status)`
- `ORDER BY created_at DESC` 慢 → 加 index `(created_at)`，或用 cover index
- JOIN 慢 → 確認 JOIN 條件兩邊都有 index

## 跟 Sharding 的關係

**先用 EXPLAIN 找瓶頸，再決定要不要動架構。**

- EXPLAIN 顯示沒 index → **加 index** 就好（成本最低）
- EXPLAIN 顯示就算用 index 還是要掃幾億筆 → 才考慮 partition / sharding

90% 的「DB 慢」問題其實是 index 沒加對，而不是真的需要 sharding。
