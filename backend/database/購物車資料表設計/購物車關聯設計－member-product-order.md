---
tags: [資料庫, 資料建模, 購物車, GORM, ER]
建立: 2026-06-25
stack: Go + GORM + MySQL/PostgreSQL
---

# 購物車資料表關聯設計 — member · product · order

> [!info] 互動筆記（需 HTML Reader 外掛）
> ER 關聯圖可點選高亮、測驗可點黃框看答案。
![[購物車關聯設計－member-product-order.html]]

## 同資料夾檔案（圖 → struct → SQL 對照）
- `schema.sql` — 可直接跑的建表 DDL（含外鍵與索引，附 PostgreSQL 差異備註）
- `models.go` — GORM struct + 結帳 `Checkout()` 交易範例

## 三句話重點
1. **多對多 → 中間表**：order ↔ product 是多對多，要靠 `order_item`（訂單明細）拆成兩個一對多。
2. **外鍵放「多」的那邊**：member→order 是一對多，`member_id` 放在 order 表。
3. **價格快照**：`cart_item` 不存價格（顯示現價）；`order_item` 一定要存 `unit_price`（凍結成交價），否則商品改價會污染歷史訂單。

## 關聯一覽
| 關係 | 型態 | 實作 |
|---|---|---|
| member → order | 1:N | order.member_id (FK) |
| order ↔ product | M:N | 中間表 order_item |
| order → order_item | 1:N | order_item.order_id (FK) |
| order_item → product | N:1 | order_item.product_id (FK) |
| member → cart | 1:1 | cart.member_id (UNIQUE FK) |
| cart → cart_item | 1:N | cart_item.cart_id (FK) |

## 關聯筆記
- [[B+樹與索引結構－叢集索引vs非叢集索引]] — 這裡每個外鍵都建索引，原理在那
- [[explain-query-analysis]]
- [[database-sharding]]

## 待延伸
- [ ] 加庫存扣減（`product.stock`）與超賣防護（樂觀鎖 / `SELECT ... FOR UPDATE`）
- [ ] 加優惠券 coupon、運費、訂單狀態機（pending→paid→shipped）
- [ ] 用 Excalidraw 自己重畫一次 ER 圖加深記憶
