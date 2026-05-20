# RAG 術語對照表（容易混淆的詞）

> 把學 RAG 過程中最容易搞混的名詞集中釐清。對應程式碼：`abby-notes-rag/src/`。

---

## 1. encode vs embedding

| 詞 | 詞性 | 意思 |
|---|-----|-----|
| encode | **動詞** | 編碼這個「動作」（文字 → 向量） |
| embedding | **名詞** | 編碼出來的「產物」（那支向量），也指這整個技術 |

`encode`（動作）產出 `embedding`（結果）。同一件事，差在詞性。
sentence-transformers 的方法就叫 `.encode()`，跑完得到 embeddings。當同義詞理解即可。

---

## 2. retrieval vs search

| 詞 | 中文 | 在本專案 |
|---|-----|--------|
| retrieval | 檢索 | RAG 的第一個字母 R |
| search | 搜尋／查詢 | 方法名 `db.search()` |

兩個指同一件事：**用 query 向量去找最相似的 chunks**。
`retrieval` 是正式術語，`search` 是程式裡的方法名，內容一樣。

---

## 3. 元組 tuple vs 位元組 byte（完全無關，只是中文像）

| 中文 | 英文 | 是什麼 | 層級 |
|-----|------|------|-----|
| **元組** | tuple | Python 資料結構（一串不可變的值） | 高階（程式語言） |
| **位元組** | byte | 8 個 bit 組成的資料單位 | 低階（二進位） |

```
元組 tuple  →  (query_embedding, top_k)     ← Python 容器，裝任何東西
位元組 byte →  01001000  (8 個 0/1)         ← 最底層的資料計量單位 (1 KB = 1024 bytes)
```

- 「元組」的「元」= 元素 → 一組元素
- 「位元組」= 一組位元（bit），跟 binary（二進位）有關

**它們沒有任何關係。** 記法：看到 `(a, b, c)` 想元組；看到檔案大小 KB/MB 想位元組。

---

## 4. tuple vs list vs dict（三種 Python 容器）

| | 符號 | 中文 | 能不能改 | 什麼時候用 |
|---|-----|-----|--------|----------|
| tuple | `()` | 元組 | **不能改**（建好就固定） | 一組固定的值，如 SQL params |
| list | `[]` | 串列／列表 | 能改（可增刪） | 要順序、要排序的多筆結果 |
| dict | `{}` | 字典 | 能改 | 要用 key 快速查找 |

比喻：tuple 像「刻在石頭上的字」，list 像「鉛筆寫的清單」。

口訣：**要順序用 list，要查找用 dict，要固定一組值用 tuple。**

---

## 5. 小括號 `()` 的三種身分（混淆根源）

看到 `()` 不一定是參數，要看上下文：

| 寫法 | 身分 | 例子 |
|-----|-----|-----|
| `(a, b, c)` 單獨 | **建立 tuple** | `params = (1, 2, 3)` |
| `func(a, b)` | **呼叫函式**（裡面是引數） | `db.search(q_vec, 5)` |
| `(a + b) * c` | **數學運算分組** | 純粹括起來算 |

關鍵差別：**有沒有跟在函式名字後面**。

---

## 6. 參數 parameter vs 引數 argument

| 中文 | 英文 | 指什麼 |
|-----|------|------|
| 參數 | parameter | 函式**定義**時寫的名字（`def search(query, top_k)` 裡的 query） |
| 引數 | argument | 函式**呼叫**時實際傳的值（`search("退款", 5)` 裡的 "退款"、5） |

`params`（一個 tuple）被當 argument 傳進去。tuple 是「被傳的東西的型別」，「傳入參數」是「這個動作」。

---

## 7. embedding model vs Embedder vs sentence-transformers

三個東西，別搞混：

| | 是什麼 | 角色 | 誰做的 |
|---|------|-----|-------|
| **bge-m3** | 真正的 model（神經網路權重，~2.3GB） | 內容物（CD） | BAAI（北京智源） |
| **sentence-transformers** | 載入並執行 model 的**函式庫** | 播放器 | 開源社群 |
| **Embedder** | 專案自己寫的類別，持有 model + 包好用方法 | 裝上方向盤的車 | 你（本專案） |

證據（`src/embedder.py` line 37）：

```python
self.model = SentenceTransformer(self.model_name)
#            └─ 函式庫(播放器) ─┘ └─ "BAAI/bge-m3" (CD) ─┘
```

- 我的 **embedding model 是 bge-m3**
- sentence-transformers 只是「載入它的工具」
- Embedder 是「讓 model 更好用的工具類」，`self.model` 才是 model 本體
- 關係是 Embedder **持有** model，不是 Embedder **等於** model

---

## 8. 哪些階段用 model，哪些不用（最重要）

**retrieval（檢索）不是 model！** 它只是數學：

| RAG 階段 | 用什麼 | 是不是 model |
|---------|-------|------------|
| 編碼（檢索的前置） | bge-m3 | ✅ model #1 |
| **R**etrieval（檢索） | pgvector 算餘弦距離 | ❌ 沒 model（純數學） |
| **A**ugmentation（組裝 prompt） | 純 Python 字串拼接 | ❌ 沒 model |
| **G**eneration（生成答案） | Claude API（未來才加） | ✅ model #2 |

```
embedding   →  bge-m3（一個 model）
retrieval   →  pgvector 算距離（沒有 model，純數學）
generation  →  Claude（未來的第二個 model）
```

整個系統最後有**兩個 model**：bge-m3（編碼）+ Claude（生成）。
**檢索本身永遠不是 model。**

---

## 9. SQL 字串裡：PostgreSQL 語法 vs psycopg2 語法

一條 SQL 字串是**混合**的：

```sql
SELECT file_path, 1 - (embedding <=> %s::vector) AS similarity FROM chunks ...
       └────────────── PostgreSQL ──────────────┘  ↑
                                                  %s 是 psycopg2 的
```

| 部分 | 屬於誰 |
|-----|-------|
| `SELECT` `FROM` `ORDER BY` `<=>` `::vector` `AS` `1 - (...)` | **PostgreSQL** |
| `%s` | **psycopg2**（不是 SQL） |

**PostgreSQL 從頭到尾沒看過 `%s`**——psycopg2 是中間的翻譯員，先把 `%s` 換成跳脫過的真實值，再把純 SQL 送進 PostgreSQL：

```
你寫的字串（含 %s）
   │  psycopg2 把 %s 換成安全的值
   ▼
純 PostgreSQL SQL（沒有 %s 了）
   │
   ▼
PostgreSQL（只收到它看得懂的 SQL）
```

- `%s` = psycopg2 佔位符，防 SQL injection（值跟 SQL 分開傳）
- `::vector` = PostgreSQL 的型別轉換，把參數從 unknown/text 轉成 vector 型別

詳見 [[餘弦相似度與pgvector]]。

---

## 相關筆記
- [[餘弦相似度與pgvector]]
- [[concepts-chunking-vs-embedding-vs-llm-vs-pgvector]]
- [[ingest-vs-chunk-vs-embed-naming]]
