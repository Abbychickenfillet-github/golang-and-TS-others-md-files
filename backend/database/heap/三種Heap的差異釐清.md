---
tags: [名詞釐清, heap, 資料結構, 記憶體, 資料庫]
建立: 2026-06-25
---

# 三種 Heap 的差異釐清

> [!info] 互動筆記（需 HTML Reader 外掛）
![[三種Heap的差異釐清.html]]

> [!warning] 同一個字、三個無關的東西
> 學索引看到的 heap 是 **③ 資料庫堆積表**，跟刷題的 ① 二元堆積、C/Java 的 ② 記憶體堆區完全無關。

| 面向  | ① 二元堆積（資料結構） | ② 記憶體堆區   | ③ 堆積表（資料庫） |
| --- | ------------ | --------- | ---------- |
| 是什麼 | 完全二元樹        | 一塊記憶體區域   | 資料表儲存方式    |
| 核心  | 父≥/≤子，頂端極值   | 動態配置      | 列無序，插哪算哪   |
| 解決  | 優先佇列、Top-K   | 生命週期不定的物件 | 不維護排序、寫入快  |
| 對照  | vs 二元搜尋樹     | vs Stack  | vs 叢集索引    |
| 定位  | 陣列索引 2i/2i+1 | 指標/位址     | RID / ctid |

**分辨法**：看到 heap 先問「演算法、記憶體、還是資料表？」對不上就不是同一個。
資料庫 heap ＝「一堆沒排序的資料頁」，跟叢集索引（照鍵排好）相反。

### ① 二元堆積的 O(log n)，那個 n 和 log 是什麼

補進第 ① 欄的量化細節，來源見文末：

- <mark style="background: #ADCCFF;">n</mark> 代表<mark style="background: #FFF3A3;">堆積中目前的元素數量</mark>，不是別的東西。
- <mark style="background: #ADCCFF;">log n</mark> 在這裡預設是<mark style="background: #FFF3A3;">以 2 為底的 log₂ n</mark>，因為二元堆積是一棵完全二元樹，每往下一層節點數翻倍，所以<mark style="background: #BBFABB;">樹高就是 log₂ n</mark>。
    insert 與 extract-min 都是沿著這條高度做 sift-up／sift-down，走的步數最多就是樹高，因此複雜度是 O(log n)。
- <mark style="background: #FF5582;">常見誤解</mark>：O(log n) <mark style="background: #FF5582;">不是</mark>「取幾次 log」的意思。它的意思是<mark style="background: #BBFABB;">處理 n 個元素所需的時間會隨著 n 以對數級別成長</mark>——n 從 1,000 變成 1,000,000（一千倍），步數只從約 10 變成約 20（兩倍）。

| 元素數量 n | 樹高 ≈ log₂ n | 一次 insert／extract 最多走幾步 |
| --- | --- | --- |
| 15 | 約 4 | 4 |
| 1,023 | 約 10 | 10 |
| 1,048,575 | 約 20 | 20 |

相關題目練習：

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 703. Kth Largest Element in a Stream | https://leetcode.com/problems/kth-largest-element-in-a-stream/ | 最典型的 Min-Heap 應用，每次 push／pop 就是走一趟 log n 的樹高 |
| LeetCode 215. Kth Largest Element in an Array | https://leetcode.com/problems/kth-largest-element-in-an-array/ | 用大小為 k 的堆積解，可以直接感受 log k 與 log n 的差別 |
| LeetCode 1046. Last Stone Weight | https://leetcode.com/problems/last-stone-weight/ | 純粹練 heap 的 insert 與 extract-max，不摻其他邏輯 |
| NeetCode — Heap / Priority Queue 專題 | https://neetcode.io/practice | 成套練完再回頭看這張表會更有感 |

## heap-organized vs 非叢集索引（釐清）
- **heap-organized ≠ 非叢集索引**：兩個不同維度。`heap-organized` 講「**表**怎麼存」（無序資料堆）；「非叢集索引」講「**某個索引**的類型」（葉子放指標、要回表）。但 heap 表上的索引「只能」都是非叢集（因果，不是相等）。
- **是很多顆小樹嗎？對一半**：✅ 每個索引各自是一棵 B+樹（幾個索引就幾棵樹）；❌ 但 **heap 本身不是樹**，是平的資料頁堆。樹是「索引」，heap 是「被指向的資料」。

## heap 無序＝沒 PK 嗎？ctid 是 PK 替代品嗎？
- **heap 無序 ≠ 沒有 PK**：heap 表照樣可以有 PK，PK 只是另一棵 unique 索引樹，負責唯一/識別，**但不排序資料**。
- **ctid/RID 不是 PK 替代品**：PK = 邏輯識別碼（穩定、給你/外鍵）；ctid/RID = 實體位址（檔/頁/列號、**會變**、引擎內部用）。所有索引（含 PK）葉子都存 ctid，查 PK 也是走索引拿 ctid 再跳 heap。
- **實體順序（heap/叢集）與邏輯識別（PK）是獨立的**：heap 表 PK 不排序資料；InnoDB 叢集表 PK 順便排序資料。❌ 別把 ctid 當永久 ID。

## 關聯
- [[B+樹與索引結構－叢集索引vs非叢集索引]] — 4½ 章三家切換
- [[索引查詢指令與實戰案例]] — PG vs MySQL 儲存組織
- [[鎖與交易與並發控制]]
- [[冒泡排序法-range參數與時間複雜度]] — 同樣在談 Big-O，那篇是 O(n²) 的反例，跟本篇 ① 的 O(log n) 對照著看，最能感受「級別」的差距

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| Gemini 對話（Min-Heap 的 n 與 log n 釐清） | https://gemini.google.com/app/25df010da7d28c95 | Gemini Flash，2026-09-16 擷取 |
| Wikipedia — Binary heap（完全二元樹與 O(log n) 操作） | https://en.wikipedia.org/wiki/Binary_heap | 2026-09-16 查證 |
| Python 官方 — heapq（標準函式庫的 Min-Heap 實作） | https://docs.python.org/3/library/heapq.html | 2026-09-16 查證 |
