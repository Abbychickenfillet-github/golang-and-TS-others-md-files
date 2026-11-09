---
title: 「儲存留言」收藏功能的資料表設計 — 多對多關聯表，與 BFS 無關
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - database
  - schema
  - many-to-many
  - bfs
  - index
sources:
  - https://gemini.google.com/app/66c40313d2bfb00d
related:
  - "購物車資料表設計（資料夾）"
updated: 2026-10-23
---

# 「儲存留言」收藏功能的資料表設計 — 多對多關聯表，與 BFS 無關

本篇重點 a–h，共 8 個

> 關聯原因：購物車資料表設計（資料夾） 同樣是「使用者 ID + 某個目標 ID」的關聯表思維，本篇是更單純的收藏（Bookmark）版本。

## 重點整理

(a) <mark style="background: #ADCCFFA6;">BFS（Breadth-First Search，廣度優先搜尋）</mark>用於圖論的最短路徑、社群「你可能認識的人」、爬蟲逐層抓連結。
　　<mark style="background: #FF5582A6;">「儲存留言」只是一筆寫入，跟 BFS 沒有關係</mark>。

(b) Facebook 常出現 Graph 一詞，是因為它把人、貼文、留言的關係視為社交圖譜（Social Graph）。
　　但<mark style="background: #FFF3A3A6;">查單一留言是用索引直接定位，複雜度 O(1) 或 O(log n)，不需要整張圖逐層走訪</mark>。

(c) 收藏的本質是<mark style="background: #ADCCFFA6;">多對多（Many-to-Many）</mark>：一個使用者可收藏多則留言，一則留言也可被多個使用者收藏，所以用一張對應表。

(d) 資料表結構（表名可叫 `user_saved_comments`）：

| 欄位 | 型態 | 說明 |
|---|---|---|
| id | BIGINT 或 UUID | 主鍵，這筆收藏紀錄本身的編號 |
| user_id | BIGINT | 誰按了儲存 |
| comment_id | BIGINT | 儲存的是哪則留言 |
| created_at | TIMESTAMP | 收藏時間，用於「最近儲存」排序 |

(e) <mark style="background: #BBFABBA6;">在 (user_id, comment_id) 建立聯合唯一索引（Composite Unique Index）</mark>，保證同一人對同一則留言只能收藏一次，重複點擊就走「取消收藏」而不是重複 INSERT。

(f) 效能索引：`user_id` 索引加速「我的已儲存清單」，`(user_id, created_at)` 複合索引支援依時間分頁。

(g) 原留言被刪除的兩種策略：
　　軟刪除（Soft Delete）：原留言標 `is_deleted = true`，清單顯示「此留言已被刪除」。
　　快照（Snapshot）：收藏表多存 `comment_content_snapshot`，資料量膨脹快，大型社群通常不採用。

(h) 完整寫入流程：前端送 API 請求 → 後端在資料庫建立一筆收藏關聯 → 之後從「已儲存」清單用 `user_id` 索引撈回。

⚠️ 存疑/更正：Gemini 說 Meta 用「MySQL 或分散式 NoSQL」屬於泛稱，無法證實 Facebook 的收藏功能具體用哪個儲存。Facebook 公開論文中描述的社交圖譜儲存系統是 TAO（The Associations and Objects），底層為 MySQL 加快取層，但與「儲存留言」的實作細節是否一致，本篇不下定論。

## LeetCode / NeetCode 相關題目

- [102. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)：BFS 的基本題型，可與本篇「為什麼收藏不需要 BFS」對照。
- [1. Two Sum](https://leetcode.com/problems/two-sum/)：用 Hash Map 以 O(1) 查找，對應「用索引直接定位」的觀念。

## 各對話來源（原文）

### 儲存留言與BFS（2026-10）— https://gemini.google.com/app/66c40313d2bfb00d

**使用者：** Facebook儲存別人的留言的留言是用什麼BFS廣度追蹤嗎？

**Gemini：** 不是的。BFS 通常用在圖論尋找最短路徑、社交網路中找「你可能認識的人」，或網頁爬蟲按層級抓取連結。儲存留言只是一個簡單的「建立關聯與資料寫入」操作，跟 BFS 沒有關係。（節錄）

**使用者：** 儲存留言的資料表怎麼設計的

**Gemini：** 核心概念是建立多對多關係的對應表，欄位為 id、user_id、comment_id、created_at；在 (user_id, comment_id) 建聯合唯一索引；原留言被刪除可用軟刪除或快照。（節錄，詳見上方 (d)–(g)）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Facebook 社交圖譜儲存 TAO | [TAO: Facebook's Distributed Data Store for the Social Graph（USENIX ATC 2013）](https://www.usenix.org/conference/atc13/technical-sessions/presentation/bronson) | 2013，已過時多年，僅供概念參考 |
| 對話原文 | [Gemini 對話](https://gemini.google.com/app/66c40313d2bfb00d) | 2026-10 |
