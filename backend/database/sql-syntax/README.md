---
tags: [SQL, 語法, 入口]
建立: 2026-06-25
---

# SQL Syntax 入口

這個資料夾收「**SQL 語法**」相關筆記（DML/DDL、JOIN、子查詢、聚合、CTE、視窗函式等）。
跟隔壁三個資料夾的分工：

| 子資料夾 | 主題 |
|---|---|
| `sql-syntax/` | **SQL 語法本身**（怎麼寫查詢） |
| `index/` | 索引（怎麼讓查詢變快、cluster/non-cluster/heap、查詢指令） |
| `lock/` | 鎖與交易、並發控制 |
| `heap/` | 三種 heap 名詞釐清 |

## 本資料夾現有筆記（已從散落各處整併進來）
- `[[JOIN-basics]]` — JOIN 基礎
- `[[IN-clause]]` — IN 子句
- `[[sql-syntax-tree]]` — SQL 語法樹／結構
- `[[sql-if-else-explanation]]` — IF / CASE 條件式
- `[[HeidiSQL-匯出與ALTER-TABLE語法]]`（.html + .md）— 匯出與 ALTER TABLE
- `錯誤訂正/` — 寫錯紀錄（如「還是寫錯 JOIN 語法」）

> 來源：原 `Abby-notes/SQL/` 整個資料夾 + `backend/sql-if-else-explanation.md`，已整併到這。
> （Obsidian 的 `[[wikilink]]` 用檔名連結，搬動不會斷連結。）

## 沒搬進來的（刻意留在原處）
- `backend/sql-migration-script-explanation.md` — 偏專案 migration 說明（提到 order_electricity 等具體表），不是通用語法，留在 backend/。
- `backend/sql/`（037_EXECUTION_CHECKLIST 等）— 專案 migration 清單，非語法。
- `backend/索引index與外鍵命名.md` — 屬索引主題，若要可改放 `index/`。

## 速查骨架
### 查詢邏輯執行順序（跟書寫順序不同）
`FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`
（所以 `WHERE` 不能用 `SELECT` 的別名、`HAVING` 才能用聚合結果。）

### JOIN
INNER（都有）/ LEFT（左全留）/ RIGHT / FULL OUTER（MySQL 用 UNION 模擬）。詳見 `[[JOIN-basics]]`。

### 聚合 + 分組
`COUNT/SUM/AVG/MIN/MAX` + `GROUP BY`；分組後過濾用 `HAVING`。

### 其他
子查詢 / `EXISTS` / `IN`（見 `[[IN-clause]]`）、CTE `WITH`、視窗函式 `OVER(PARTITION BY ...)`、上插 `ON DUPLICATE KEY UPDATE` / `ON CONFLICT DO UPDATE`。

## 關聯
- [[索引查詢指令與實戰案例]] — EXPLAIN 怎麼讀
- [[鎖與交易與並發控制]] — FOR UPDATE 等語法
