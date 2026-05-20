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

## 10. 維度 (dimension) = 有幾個數字

「維度」就是「向量裡有幾個數字」。1024 維 = 1024 個浮點數：

```
embedding = [0.12, -0.03, 0.88, ......, 0.45]
             └────────── 共 1024 個 float ──────────┘
```

| 維度 | 長相 | 幾個數字 |
|-----|------|--------|
| 2 維 | `[x, y]` | 2 |
| 3 維 | `[x, y, z]` | 3 |
| 1024 維 | `[a, b, ..., 第1024個]` | 1024 |

SQL 裡 `'[0.12, -0.03, ...]'::vector` 那串括號裡真的就是 1024 個數字。

**接上 byte（位元組）**：每個 float32 佔 4 個 byte，所以一支向量約 `1024 × 4 = 4096 bytes ≈ 4 KB`。
4172 個 chunk 約 `4172 × 4KB ≈ 16 MB`。維度決定有幾個數字，位元組決定每個數字佔多少空間。

---

## 11. HuggingFace Hub vs PyPI（model 倉庫 vs 函式庫倉庫）

bge-m3 和 sentence-transformers **不是同一種倉庫**：

| | 是什麼 | 放在哪 | 怎麼取得 |
|---|------|-------|---------|
| **bge-m3** | model（權重檔） | **HuggingFace Hub**（`huggingface.co/BAAI/bge-m3`） | 被 sentence-transformers 自動下載 |
| **sentence-transformers** | Python 函式庫 | **PyPI**（原始碼在 GitHub） | `pip install sentence-transformers` |

```
HuggingFace Hub（放 model 的網站，像 GitHub 但裝 AI 模型）
   └── BAAI/bge-m3   ← model 住這（CD 倉庫）

PyPI（Python 套件倉庫）
   └── sentence-transformers  ← 函式庫住這（CD 播放器，另外裝）
```

第一次 `SentenceTransformer("BAAI/bge-m3")` 時，函式庫去 Hub 把 model 下載到 `~/.cache/huggingface/`，之後讀快取。
所以「bge-m3 在 Hub」「sentence-transformers 在 PyPI」是兩種東西，只是常一起用。

---

## 12. file_path 與相對路徑拆解

`file_path` 存的是**相對於 NOTES_ROOT 的路徑、且反斜線換成正斜線**。來源（`scripts/ingest.py`）：

```python
def relative_path(absolute: Path) -> str:
    """Path relative to NOTES_ROOT, with forward slashes."""
    return str(absolute.relative_to(Config.NOTES_ROOT)).replace("\\", "/")
```

### 巢狀呼叫從「最內層往外」讀（像剝洋蔥）

假設 `absolute = C:\coding\futuresign\Abby-notes\RAG\redis-guide.md`：

```
第1層  absolute
       = C:\coding\futuresign\Abby-notes\RAG\redis-guide.md

第2層  absolute.relative_to(Config.NOTES_ROOT)   ← 砍掉 NOTES_ROOT 前綴
       = Path("RAG\redis-guide.md")              ← 還是 Path 物件

第3層  str( ... )                                 ← 轉成字串
       = "RAG\redis-guide.md"

第4層  ....replace("\\", "/")                     ← 反斜線換正斜線
       = "RAG/redis-guide.md"                     ← 最後回傳
```

**`"\\"` 為何兩條**：Python 字串裡 `\` 是跳脫字元，要表示「一條真的反斜線」得寫兩條 `"\\"`。

### 為什麼這樣存

| 處理 | 為什麼 |
|-----|-------|
| 存相對路徑 | 可攜：專案搬家、換電腦，路徑照樣對得上 |
| 反斜線換正斜線 | Windows 用 `\`、Mac/Linux 用 `/`，統一存 `/` 才跨平台一致 |

### file_path 的用途
- 標記 chunk 來自哪個檔案
- 當 unique key 的一半 `(file_path, chunk_index)`
- incremental 比對哪些檔案變了
- search 結果告訴你答案出自哪篇筆記
- `filter_path_prefix="RAG/"` 只搜某資料夾

---

## 13. 型別提示 (type hint) ≠ 保證

```python
def relative_path(absolute: Path) -> str:
#                 └──┬───┘ └─┬─┘
#                 參數名字   型別提示
```

| 部分 | 是什麼 | Python 在乎嗎 |
|-----|-------|-------------|
| `absolute` | 只是參數名字（工程師取的） | 不在乎，叫 `x` 也行 |
| `Path` | 型別提示（pathlib.Path 物件） | 只是提示，執行時不強制檢查 |

- 名字 `absolute` 是工程師的「承諾」要傳絕對路徑，**不是 Python 的保證**。傳相對路徑 Python 也不報錯。
- 型別提示給人類和 mypy/IDE 看，執行時不強制。`Path` 只說「是路徑物件」，沒說「是絕對路徑」。
- 真要檢查：`absolute.is_absolute()` 回傳 True/False。

---

## 14. docstring vs `#` 註解

真正的註解是 `#`。`"""..."""` 是**三引號字串**，放在函式/類別/模組第一行時被當成 **docstring（文件字串）**。

| | `# 註解` | `"""docstring"""` |
|---|---------|------------------|
| 本質 | 註解 | **字串**（真的字串物件） |
| 執行時 | 完全忽略，不留痕跡 | 存進 `__doc__`，`help()`/IDE 看得到 |
| 用途 | 給讀程式碼的人看 | 給「用這個函式的人」看的官方說明 |
| 位置 | 任何地方 | 函式/類別/模組第一行才有特殊意義 |

```python
def relative_path(absolute: Path) -> str:
    """Path relative to NOTES_ROOT, with forward slashes."""  # docstring → 進 __doc__
    # 這行才是真註解，執行時丟掉                                # comment
    return ...
```

驗證：`print(relative_path.__doc__)` 印得出 docstring；`#` 註解永遠取不回來。

---

## 15. 啟動順序：init_db.py 先，ingest.py 後

| 步驟 | 指令 | 做什麼 | 比喻 |
|-----|------|-------|-----|
| 1 | `docker compose up -d` | 啟動 PostgreSQL 容器 | 打地基 |
| 2 | `python scripts/init_db.py` | 讀 init_db.sql → 建 chunks 表 + HNSW 索引 | 蓋房子 |
| 3 | `python scripts/ingest.py` | 把 4172 個 chunk 寫進表 | 搬家具 |

**順序不能反**：表還沒建就 ingest，會噴 `relation "chunks" does not exist`（房子還沒蓋就要搬家具）。
`init_db.py` 本身只是「讀 SQL 檔 → 連 DB → `cur.execute(sql)` 執行建表」。

---

## 相關筆記
- [[餘弦相似度與pgvector]]
- [[concepts-chunking-vs-embedding-vs-llm-vs-pgvector]]
- [[ingest-vs-chunk-vs-embed-naming]]
