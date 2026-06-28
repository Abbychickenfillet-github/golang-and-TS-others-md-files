---
tags: [資料庫, 索引, 資料結構, B+樹, PostgreSQL]
建立: 2026-06-25
stack: Go + GORM + PostgreSQL
---

# B+樹與索引結構（實戰延伸）－叢集索引 vs 非叢集索引

> [!info] 這是上一篇純概念筆記的「實戰延伸版」
> 內含可互動的 SVG 範圍查詢動畫、三欄對照卡、填空／是非／申論測驗。
> 互動內容請看下方嵌入的 HTML（需安裝 **HTML Reader** 外掛）。

## 嵌入互動筆記
![[B+樹與索引結構－叢集索引vs非叢集索引.html]]

---

## 重點速記（給未來複習用）

- **葉子節點**：B+樹最底層，唯一真正放「資料／指標」的一層。
- **叢集索引**：葉子 = 整列實體資料 → 一張表只能有一個。
- **非叢集索引**：葉子 = 索引鍵 + 指標（叢集鍵 or RID）→ 取整列要**回表**。
- **回表 / Bookmark Lookup**：拿指標再跑一趟撈完整資料，避免方法 = **涵蓋索引 / Index-Only Scan**。
- **B+ vs Binary Tree**：B+樹又矮又胖（高扇出、3~4 層）、葉子有鏈結串列 → 適合磁碟、範圍查詢快。
- **B-Tree vs B+-Tree**：B+樹把資料全趕到葉子層、葉子間用雙向鏈結串列。
- ⚠ **PostgreSQL 特例**：沒有持續維護的叢集索引，Heap 預設無序，所有索引都更接近非叢集索引；`CLUSTER table USING index;` 只能**一次性**重排，新資料不維序。

```sql
-- 一次性把表照索引重排（psql / TablePlus / DBeaver / pgAdmin 都可下）
CREATE INDEX idx_orders_created_at ON orders (created_at);
CLUSTER orders USING idx_orders_created_at;

-- 避免回表：涵蓋索引（Index-Only Scan）
CREATE INDEX idx_orders_user ON orders (user_id, created_at) INCLUDE (status);
```

---

## 關聯筆記
- [[資料結構－B-Tree與B+-Tree]]
- [[PostgreSQL遷移筆記]]
- [[索引設計與查詢效能]]
- [[EXPLAIN ANALYZE 實戰]]

## 待辦 / 可延伸
- [ ] 在本機 PG 跑一次 `EXPLAIN (ANALYZE, BUFFERS)`，截圖比較 Index Scan（回表）vs Index Only Scan
- [ ] 用 Excalidraw 自己重畫一次 B+樹葉子鏈，加深記憶
