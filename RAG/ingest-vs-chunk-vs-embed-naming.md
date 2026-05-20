# Ingest vs Chunk vs Embed — 動詞層級的誤解釐清

> **這份筆記回答**：
> 1. 動詞先後順序是先 ingest 再 chunk 嗎？（不是！chunk 是 ingest 的一部分）
> 2. ingest、chunk、embed、store 是平行的四個步驟嗎？（不是！ingest 是傘狀的整體流程）
> 3. 為什麼 `scripts/ingest.py` 裡面會 import `chunker`、`embedder`、`db`？
> 4. retrieve 跟 ingest 是什麼關係？
>
> **建立日期**：2026-05-14

---

## 0. 核心結論：層級錯置的誤解

### 錯誤心智模型

```
ingest → chunk → embed → store        ← ★ 這是錯的 ★
（4 個平行步驟，依序執行）
```

這個模型把 ingest 跟 chunk、embed、store 當作**同一層的 4 個動作**，以為「先 ingest，做完再 chunk」。

### 正確心智模型

```
ingest（傘狀的整體流程）
  ├─ chunk
  ├─ embed
  └─ store
```

**ingest 是 umbrella verb（傘狀動詞）**，包含 chunk、embed、store 這三個子步驟。所以「先 ingest 再 chunk」這句話本身就矛盾——chunk 本來就在 ingest 裡面跑，怎麼可能 ingest 先做完才 chunk？

---

## 1. 真正的執行順序（拆 `scripts/ingest.py`）

打開 `scripts/ingest.py:62` 那個 for loop，整個 ingest 流程拆解如下：

```
ingest 開始
  │
  ├─ 1. 走檔案系統 (collect_md_files)
  │      → 找出所有 .md 檔
  │
  ├─ 2. 算 MD5 (md5_of)
  │      → 算出每個檔案的內容指紋
  │
  ├─ 3. 比對 DB hash (existing_hashes.get)
  │      → 跟 DB 裡記錄的 hash 比，看有沒有變
  │
  ├─ 4. 不一樣才往下：
  │      ├─ a. 讀檔 (path.read_text)
  │      ├─ b. ★ chunk (chunker.chunk_markdown)
  │      ├─ c. 砍舊 chunks (db.delete_file_chunks)
  │      ├─ d. ★ embed (embedder.encode)
  │      └─ e. ★ store (db.insert_chunks_batch)
  │
  └─ 5. 換下一個檔案，回到步驟 2
ingest 結束
```

★ 標出的 **chunk / embed / store** 才是大家口語講 RAG ingestion 時常掛在嘴邊的「三步驟」。但它們**全都活在 ingest 流程的 `for` loop 裡**，是 ingest 這個總指揮在依序呼叫的工具。

### 對應到程式碼

```python
# scripts/ingest.py 主迴圈簡化版
for path in collect_md_files():            # ← ingest 在指揮
    new_hash = md5_of(path)
    if existing_hashes.get(rel) == new_hash:
        continue
    text = path.read_text(encoding="utf-8")
    chunks = chunk_markdown(text)          # ← chunk 子步驟
    db.delete_file_chunks(rel)
    embeddings = embedder.encode(...)      # ← embed 子步驟
    db.insert_chunks_batch(rows)           # ← store 子步驟
```

`scripts/ingest.py` 是入口，`src/chunker.py`、`src/embedder.py`、`src/db.py` 是被它呼叫的工具——**檔案命名本身就在反映這個層級結構**。

---

## 2. 動詞層級樹

```
ingest（總指揮，寫資料進系統）
├─ chunk（切）
├─ embed（轉向量）
└─ store（存）

retrieve（總指揮，從系統取資料）   ← 跟 ingest 對稱
├─ embed（把 query 轉向量）
├─ search（cosine similarity 找 top-k）
└─ rank/format（整理結果）
```

兩個傘狀動詞、兩組子步驟。一個負責**寫進去**，一個負責**取出來**。

---

## 3. 生活化比喻

### 比喻 A：煮一頓飯

| 動詞層級 | 對應煮飯動作 |
|---------|------------|
| ingest（傘狀）| **煮一頓飯** |
| chunk | 切菜 |
| embed | 炒菜 |
| store | 裝盤上桌 |

你不會跟人說「我先煮飯，然後再切菜」——因為**切菜本來就是煮飯的一環**。

「我下廚了 = I cooked」對應「我做了 ingest」——一個動詞描述整套流程，沒有人會把每個子步驟拆開講。

### 比喻 B：出版一本書

| 動詞層級 | 對應出版動作 |
|---------|------------|
| ingest（傘狀）| **出版一本書** |
| chunk | 寫稿（切成章節） |
| embed | 排版（轉成可上架的格式） |
| store | 印刷上架 |

「這本書出版了 = It was published」對應「這個資料 ingested 了」——同樣是一個動詞涵蓋整個製作流程。

---

## 4. 為什麼這個區分很重要

### 4.1 講話精準

別人問你「跑 ingest 了嗎」，**意思是「整個流程做完沒」**，不是問你「chunk 完沒」。如果你心裡把 ingest 當成 chunk 之前的某個獨立動作，回答會牛頭不對馬嘴。

| 別人問 | 真正在問 |
|--------|---------|
| 「跑 ingest 了嗎」 | 整套流程（chunk + embed + store）跑完沒？ |
| 「chunk 怎麼切的」 | 你 chunker 的演算法是什麼？ |
| 「embed 用哪個 model」 | 你的 embedder 用哪家、哪個版本？ |
| 「retrieve 出來幾筆」 | 整套查詢流程回了幾個 top-k？ |

### 4.2 設計檔案命名反映層級

```
scripts/ingest.py     ← 入口（傘狀動詞，總指揮）
src/chunker.py        ← 工具（被 ingest.py 呼叫）
src/embedder.py       ← 工具（被 ingest.py 呼叫）
src/db.py             ← 工具（被 ingest.py 呼叫）
```

入口在 `scripts/`，工具在 `src/`，命名跟層級對得起來。日後加 `scripts/retrieve.py` 也會是同樣的結構（傘狀腳本呼叫 src 裡面的工具）。

### 4.3 Debug 思考分層

問題出在哪一層？把這條問題鏈走過一遍：

```
1. ingest 整個沒跑？        → 看 scripts/ingest.py 是否成功啟動
2. chunk 步驟切錯？         → 看 src/chunker.py 切出來的 chunk 內容
3. embed 向量品質差？       → 看 src/embedder.py 跟 model 版本
4. store 寫不進 DB？        → 看 src/db.py 跟 PostgreSQL 連線
```

**層級不分清楚，debug 找不到方向**。混為一談的話，看到「ingest 失敗」會不知道要從哪裡查起。

---

## 5. 對照 retrieve（即將實作的對稱動詞）

Task 10 要做 retrieve，它跟 ingest 是**對稱的傘狀動詞**：

| | ingest（寫進去）| retrieve（取出來）|
|---|---------------|------------------|
| 入口檔 | `scripts/ingest.py` | `scripts/retrieve.py`（待建）|
| 子步驟 1 | chunk（切原文）| embed（把 query 轉向量）|
| 子步驟 2 | embed（把 chunk 轉向量）| search（cosine similarity）|
| 子步驟 3 | store（寫進 pgvector）| rank/format（整理 top-k）|
| 對外動詞 | 「我 ingested 這批資料」 | 「我 retrieved 這個查詢」 |

整個 RAG 系統可以拆成：

```
RAG = Retrieval + Augmented + Generation
       ↑          ↑           ↑
       retrieve   augment     generate
       傘狀動詞    把 retrieved   LLM 生成回答
                  塞進 prompt
```

> 冷知識：**RAG 的字面意義就是「檢索增強生成」**，三個字母對應到三個動作。而 ingest 在這個縮寫之外，是事前的「資料準備」階段。

---

## 6. 對比表：傘狀動詞 vs 子步驟

| | ingest | chunk | embed | store |
|---|--------|-------|-------|-------|
| **層級** | 傘狀 | 子步驟 | 子步驟 | 子步驟 |
| **誰呼叫誰** | 呼叫 chunk/embed/store | 被 ingest 呼叫 | 被 ingest 呼叫 | 被 ingest 呼叫 |
| **檔案** | `scripts/ingest.py` | `src/chunker.py` | `src/embedder.py` | `src/db.py` |
| **獨立跑得起來嗎** | 是（整套腳本）| 否（只是個函式）| 否（只是個函式）| 否（只是個函式）|
| **常見口語問句** | 「跑 ingest 了嗎」| 「chunk 怎麼切的」| 「embed 用哪個 model」| 「DB 裡有幾筆」|

---

## 7. 快速記憶口訣

> **ingest 是廚房，chunk / embed / store 是廚具。**
> 你說「我下廚了」不會說「我先下廚再切菜」——切菜本來就在下廚裡面。

對稱版：

> **retrieve 是上菜，embed query / search / rank 是裝盤步驟。**

---

## 相關筆記

- [chunk-and-incremental-ingest.md](chunk-and-incremental-ingest.md) — ingest 工程運作細節（incremental vs full、MD5 指紋、自動化）
- [concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md](concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md) — chunking / embedding model / LLM / pgvector 各自是什麼
