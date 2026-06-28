---
tags: [資料庫, MOC, 目錄]
建立: 2026-06-25
更新: 2026-06-25（併入舊 Database/ 資料夾）
---

# backend/database — 資料庫主題目錄

頂層的舊 `Database/` 已整個併進這裡。四個主題子資料夾 + 一些一般筆記。

## 📁 [sql-syntax](sql-syntax/) — SQL 語法
JOIN、IN、CASE/IF、語法樹、HeidiSQL ALTER TABLE、寫錯訂正。→ `[[README]]`

## 📁 [index](index/) — 索引（最豐富）
- `[[B+樹與索引結構－叢集索引vs非叢集索引]]` — 觀念（B+樹、叢集/非叢集、回表、號碼牌比喻、樹高/Fan-out、RID）⚠ 從 outputs 下載放這
- `[[索引查詢指令與實戰案例]]` — SHOW INDEX/EXPLAIN、PG vs MySQL、Hot row、複合索引、按讚計數器
- `[[EXPLAIN查詢計畫解讀]]` — 🆕 PG 三種 Scan、MySQL type/key/Extra、可點開 plan 範例
- `[[資料庫索引與B+tree-最左字首原則]]` — 最左前綴
- `[[explain-query-analysis]]` — 舊 EXPLAIN 筆記

## 📁 [lock](lock/) — 鎖與交易
- `[[鎖與交易與並發控制]]` — S/X 2×2 矩陣、鎖競爭、FOR UPDATE/原子更新/樂觀鎖、死鎖、隔離等級、鎖效能/version/問號

## 📁 [heap](heap/) — 名詞釐清
- `[[三種Heap的差異釐清]]` — 三種 heap、heap-organized vs 非叢集、PK vs ctid/RID

## 📁 [Postgres](Postgres/) — PostgreSQL 專屬
- `[[postgres-crash-recovery-explained]]`、`[[PostgreSQL-與-Postgres-命名與資料庫發展史]]`

## 📁 [購物車資料表設計](購物車資料表設計/) — 資料建模
- `[[購物車關聯設計－member-product-order]]` + schema.sql + models.go（多對多、價格快照、GORM）

## 📄 一般資料庫筆記（root）
- `[[database-sharding]]` — 分片
- `[[realtime-database-comparison]]` — 即時資料庫比較

---
## 主題關係圖
```
sql-syntax → 怎麼「寫」查詢
index      → 怎麼讓查詢「變快」+ 怎麼用 EXPLAIN 看計畫（含 heap-organized 概念）
heap       → 釐清「資料庫 heap」+ 另外兩種同名 heap
lock       → 多人同時讀寫怎麼「不出錯」（hot row 連到 index 的按讚計數器）
Postgres   → PG 專屬行為
購物車設計  → 資料建模實戰（多對多、快照）
```

> 備註：① `index/` 的 B+樹那篇在輸出區，請下載放進 `index/`。② 舊頂層 `Database/` 已清空（無刪資料夾權限，可手動刪）。
