---
title: PolarDB 熱點行更新優化（組提交 Group Commit 與 Statement Queue）
type: topic-note
source: Gemini
tags: [gemini, database, polardb, mysql, 高並發, 行鎖, group-commit, statement-queue, 熱點行]
sources:
  - https://gemini.google.com/app/e1b34595dac7a211
updated: 2026-06-27
quiz: PolarDB-熱點行更新優化-組提交與StatementQueue.html
---

# PolarDB 熱點行更新優化（組提交 Group Commit 與 Statement Queue）

## 重點整理

### 先搞懂問題：什麼是「熱點行」排隊等鎖

當很多事務在<mark style="background: #ADCCFFA6;">短時間內更新同一行資料（熱點行 hot row）</mark>時，只有一個事務能更新，其他必須等待。

關鍵釐清：這些等待的事務<mark style="background: #FF5582A6;">並不是「各自有一個鎖」</mark>，而是<mark style="background: #BBFABBA6;">排隊等待取得「同一個」行鎖</mark>。持有鎖的事務 commit 或 rollback 釋放鎖後，下一個排隊者才拿得到。

> [!note] 名詞釐清
> <mark style="background: #ADCCFFA6;">PolarDB</mark> 是阿里雲自研的<mark style="background: #FFF3A3A6;">「雲原生資料庫（Cloud-Native Database）」</mark>，名稱跟 Hulu 影集、MySQL 都無關（對話中 Gemini 一度語音辨識錯亂，特此標註）。

### 優化技術一：熱點行 UPDATE 優化（Hot row optimization）

針對「多事務搶同一行鎖」的核心優化，靠<mark style="background: #FFF3A3A6;">流水線分組（Group Update）</mark>＋<mark style="background: #FFF3A3A6;">組提交（Group Commit）</mark>。

**Leader / Follower 機制（消除申請行鎖的等待）：**

- 組內<mark style="background: #FFF3A3A6;">第一個更新操作 = Leader</mark>：負責讀取目標資料行並加鎖。
- 後續更新操作 = <mark style="background: #FFF3A3A6;">Follower</mark>：要對同一行加鎖時，發現 Leader 已持有行鎖，就<mark style="background: #BBFABBA6;">無需等待，直接獲得行鎖</mark>。
- 效果：<mark style="background: #FFB8EBA6;">減少行鎖的加鎖次數與時間開銷</mark>。

**組提交流程：** 多筆更新先收集進記憶體（`Collect and Update Memory Record` / Row Cache 暫存），由 Leader 統一收集更新記憶體紀錄，再以群組方式一起提交（`Group Committing`）→ <mark style="background: #FFB8EBA6;">大幅減少磁碟 I/O 次數與鎖衝突</mark>。

### 優化技術二：Statement Queue（語句佇列）

如果**沒有**開啟上面的熱點行優化，PolarDB 還提供另一種排隊機制。

- 痛點：原生 MySQL 中，多條語句對同一行並發操作時，執行緒會在 InnoDB 行鎖上<mark style="background: #FF5582A6;">「硬碰硬」競爭</mark>，造成嚴重鎖等待與衝突，系統吞吐量暴跌。
- 做法：透過 <mark style="background: #ADCCFFA6;">Hint 語法</mark>，把這些衝突語句在進入資料庫引擎前，先用 <mark style="background: #FFF3A3A6;">Hash 演算法路由到一個共享的「排隊桶（Bucket）」</mark>，讓語句在佇列中依序排隊，而不是直接去頻繁申請/釋放鎖 → <mark style="background: #BBFABBA6;">降低核心的鎖衝突開銷</mark>。

### 它如何把高並發熱點行更新做到「並行處理」

把針對同一熱點行的更新操作<mark style="background: #FFF3A3A6;">分組</mark>，再用類似 Hash 演算法把不同的組<mark style="background: #FFF3A3A6;">並行處理</mark>，最大化並發吞吐。

### 數字累加 vs 字串更新的差別

- 數字（`1 + 1 + 1`）本質是<mark style="background: #FFF3A3A6;">累加</mark>，組內可以一次合併算完。
- 字串一直被改寫時，會按<mark style="background: #ADCCFFA6;">先後順序分批處理與提交</mark>，<mark style="background: #FF5582A6;">最終值取決於「最後一個成功執行的更新」</mark>。

### 想找官方文件

到<mark style="background: #ADCCFFA6;">阿里雲幫助中心（Alibaba Cloud Help Center）</mark>搜尋關鍵字：`PolarDB 热点行性能优化`（英：Hot row optimization）或 `PolarDB Statement Queue`。

## 各對話來源
### 阿里云 PolarDB 数据库介绍（2026-06）— https://gemini.google.com/app/e1b34595dac7a211

> 對話為語音輸入，以下為整理後的問答重點（去除語音辨識雜訊）。

**使用者：** （它）在一段時間內針對同一資料能進行更新，其他事物則需要等待；那等待的這些，是不是每一個等待的都有一個鎖？

**Gemini：** 當其他事務嘗試更新相同的熱點行時，它們會被掛起，直到持有鎖的事務提交或回滾並釋放鎖。這些等待的事務並沒有各自的鎖，而是排隊等待獲得鎖。

**使用者：** 給我鎖的機制、排隊的參考 document。

**Gemini：** 在 PolarDB 架構中主要有兩種技術處理高並發排隊與行鎖等待：
1.《熱點數據行 UPDATE 操作的性能優化》（Hot row optimization）— 核心是組提交與流水線：大量並發更新同一行時，核心自動按到達順序分組（Group Update）。「組內第一個更新操作為 Leader，其讀取目標數據行並且加鎖。後續更新操作為 Follower，其對目標數據行加鎖時，如果發現 Leader 已經持有行鎖，無需等待，直接獲得行鎖。」藉此減少行鎖的加鎖次數和時間開銷。
2.《使用 Statement Queue 優化高並發性能》— 原生 MySQL 多語句針對相同行並發時，執行執行緒會在 InnoDB 行鎖上硬碰硬競爭，吞吐量暴跌。PolarDB 允許透過 Hint 把衝突語句在進入引擎前以 Hash 路由到共享排隊桶（Bucket）中依序排隊，降低鎖衝突開銷。

**使用者：** 這些是怎麼對高並發熱點行更新做到並行處理？

**Gemini：** PolarDB 透過將針對同一熱點行的更新操作分組，並使用類似哈希演算法的技術將不同的組並行處理，從而最大程度實現並發更新、提高整體效能。

**使用者：** 圖解 sequence：update the same hot row、row 快取，快取的內容是什麼？

**Gemini：** 多個針對相同熱點行的更新請求會集中到「Row Cache」暫存。此階段系統不會立即對各請求單獨加鎖，而是由組內 Leader 執行收集與更新記憶體紀錄；接著以群組方式提交，減少鎖定衝突。

**使用者：** 透過 group commit 的機制是什麼？

**Gemini：** 先把同一熱點行的更新請求收集在記憶體（圖中的 Collect and Update Memory Record），再在適當時機一起提交（Group Committing），減少磁碟 I/O、提高效能。

**使用者：** 可是如果是一直更改裡面的 string 字串，最後會以什麼為主？

**Gemini：** 系統根據主鍵或唯一鍵進行哈希分組。對同一桶中的字串更新，按先後順序分批處理與提交，最終值取決於最後一個成功執行的更新操作。

**使用者：** PolarDB 不是阿里的嗎？（對 AI 語音誤判提問）

**Gemini：** PolarDB 代表「雲原生資料庫」，是阿里雲自主研發的資料庫產品，並不是 Hulu 影集或 MySQL。
