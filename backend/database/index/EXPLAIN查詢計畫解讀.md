---
tags: [資料庫, EXPLAIN, 查詢計畫, 效能, MySQL, PostgreSQL]
建立: 2026-06-25
---

# EXPLAIN 查詢計畫解讀

> [!info] 互動筆記（需 HTML Reader 外掛）
> 含 PG 三種 Scan、MySQL type 等級階梯、可點開的 query plan 範例、測驗。
![[EXPLAIN查詢計畫解讀.html]]

## 一頁速記
- `EXPLAIN`＝估計、不執行；`EXPLAIN ANALYZE`＝**真的跑**給你實際耗時；PG 再加 `BUFFERS` 看 I/O。⚠ ANALYZE 對 UPDATE/DELETE 會真的改資料。

### PostgreSQL：三種 Scan
- **Seq Scan**：整表掃描、沒走索引（大表＝警訊）。
- **Index Scan**：走索引 + 回 heap 撈整列（回表）。
- **Index Only Scan**：欄位都在索引裡、**不回表**（`Heap Fetches: 0`）🎉。

### MySQL：看 type / key / Extra
- `type` 好→壞：`const/eq_ref` > `ref` > `range` > `index` > **`ALL`（全表掃描）**。
- `key`＝實際用的索引；`key=NULL`＝沒用索引。
- `Extra`：`Using index`＝涵蓋索引不回表 🎉；`Using filesort`/`Using temporary`＝額外排序/暫存（注意）。

### 三個自我檢查
1. 有沒有走索引？（PG 非 Seq Scan / MySQL 非 ALL）
2. 有沒有回表？（PG Index Only / MySQL Using index）
3. 有沒有額外排序？（filesort / Sort 節點）→ 改複合索引消除。

## 對照
| | PostgreSQL | MySQL |
|---|---|---|
| 全表掃描 | Seq Scan | type=ALL |
| 走索引 | Index Scan | type=ref/range |
| 不回表 | Index Only Scan / Heap Fetches:0 | Extra: Using index |
| 額外排序 | Sort 節點 | Using filesort |

## 關聯
- [[索引查詢指令與實戰案例]]
- [[B+樹與索引結構－叢集索引vs非叢集索引]] — 回表原理
- [[explain-query-analysis]] — 舊筆記
- [[資料庫索引與B+tree-最左字首原則]]
