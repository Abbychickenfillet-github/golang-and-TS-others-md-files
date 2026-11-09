---
title: DataLoader 批次化解 N+1：Prisma findUnique 與 @unique
type: topic-note
source: Gemini
tags: [gemini, dataloader, prisma, graphql, n+1]
sources:
  - https://gemini.google.com/app/be690f4a08b28a77
updated: 2026-10-30
---

# DataLoader 批次化解 N+1：Prisma findUnique 與 @unique

## 重點整理

本篇重點 (a)–(e)，共 5 個。

### (a) DataLoader 解決 N+1 查詢問題
- N+1 問題：先 1 次查出 100 位使用者，再對每位各查 1 次文章，共 101 次 SQL。
- DataLoader (Facebook/Meta 開源套件) 用兩招解決：
  - ==批次化 (Batching)==：同一個事件循環 (Event Loop) 內收集多個單筆讀取 (ID 1、2、3)，合併成一次 `WHERE id IN (1,2,3)`。
  - ==快取 (Caching)==：同一次請求生命週期內，相同 ID 直接回傳記憶體結果，不重複查庫。
- 典型場景：GraphQL resolver，關聯 [[GraphQL-概念與REST對比]]。
  - 關聯原因：GraphQL 每個欄位各自 resolve，最容易產生 N+1，DataLoader 是標準解法。

### (b) Prisma findUnique 不是「第一筆」
- `findUnique()`：用 `@id` 或 `@unique` 欄位查單一筆，找不到回傳 `null`，`findUniqueOrThrow()` 則丟錯。
- `findFirst()`：用一般條件(可搭配排序)取符合清單的第一筆。

### (c) @id 與 @unique 的差別
- 主鍵 (Primary Key, `@id`)：一張表只能一個，不能為 null。
- 唯一約束 (`@unique`)：可多個，例如 email、phone，值不可重複。
- ⚠️ 存疑/補充：Gemini 說「多數資料庫允許多筆 null」，PostgreSQL 與 MySQL 成立，但 SQL Server 的 UNIQUE 約束只允許一筆 null，實際依資料庫而定。

```prisma
model User {
  id    Int     @id @default(autoincrement()) // 主鍵，自動遞增
  email String  @unique                       // 唯一約束，重複寫入會報錯
  name  String?                               // ? 代表可為 null
}
```

### (d) 想練習?
- LeetCode 無直接對應題；概念上與「批次查詢/去重快取」相近，可參考 [LRU Cache](https://leetcode.com/problems/lru-cache/)(快取結構)。

### (e) 關聯筆記
- [[backend/js-delete-operator-vs-prisma-delete]]：同樣在談 Prisma 操作。

## 各對話來源

### DataLoader 與 findUnique 解析 (2026-10-30 抓取) — https://gemini.google.com/app/be690f4a08b28a77
- 使用者：dataloader是什麼然後findUnique是找資料庫裡面符合條件的第一個嗎？
- Gemini：見 a、b。
- 使用者：@unique 資料庫？是什麼啦
- Gemini：見 c。

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| DataLoader | [graphql/dataloader](https://github.com/graphql/dataloader) | README 持續更新，本次未逐字重新查證(2026-10-30) |
| findUnique | [Prisma Client API](https://www.prisma.io/docs/orm/reference/prisma-client-reference) | 同上 |
| NULL 與 UNIQUE | [PostgreSQL 文件: Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | 同上 |
