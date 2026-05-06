# 同一個 Database 可以用多個 Embedding Model 嗎？

> **這份筆記回答**：
> 1. 我之前說「換 model 要全部重新 embed」，是指整個 DB 嗎？
> 2. 一個 database 是不是只能用一個 embedding model？
> 3. 想同時試多個 model 怎麼辦？
> 4. 怎麼設計多 model 共存的 schema？
>
> **建立日期**：2026-05-05

---

## 0. 速答：不是「一個 DB 一個 model」，是「**一個 column 一個 model**」

**「一致性」的範圍是 column 層級，不是 database 層級。**

| 範圍 | 必須一致嗎？ |
|------|----------|
| 同一個 **column** 內的所有 row | ✅ 必須一致（同 model + 同維度）|
| 同一個 **table** 的不同 column | ❌ **可以不同**（每個 column 一個 model）|
| 同一個 **database** 的不同 table | ❌ **可以不同** |
| 不同 database | ❌ **可以不同** |

→ 你之前理解的「換 model 要全部重新 embed」是**對某一個 column** 來說。**整個 DB 完全可以多個 model 並存**。

---

## 1. 為什麼「同 column 必須一致」？

因為**距離計算**只在「同一個語義空間」內有意義。

### 反例（錯誤示範）

```sql
-- ❌ 假設你混用 OpenAI (1536) 跟 sentence-transformers (384)
CREATE TABLE bad_example (
  id bigserial PRIMARY KEY,
  embedding vector(1536)
);

INSERT INTO bad_example VALUES
  (1, '[OpenAI 1536 維向量...]'),    -- 第 1 筆用 OpenAI embed
  (2, '[bge-m3 1024 維向量...]');    -- 第 2 筆用 bge-m3 embed
                                      -- ❌ 維度都不一樣，根本插不進去
```

就算強制塞同維度（例如某 model 剛好也是 1536）：

```sql
-- ❌ 維度同 1536，但語義空間不同
INSERT INTO bad_example VALUES
  (1, '[OpenAI 1536 維...]'),
  (2, '[某不知名 model 1536 維...]');

-- 查詢時
SELECT * FROM bad_example ORDER BY embedding <=> '[查詢向量]';
-- 結果：距離計算「數值上算得出來」，但「語義上沒意義」
```

→ **不同 model 的向量不能放同 column**。

---

## 2. 多 model 共存的 4 種 schema 設計

### 模式 A：同表 + 多 column（推薦試驗用）

```sql
CREATE TABLE items (
  id bigserial PRIMARY KEY,
  description text,
  embedding_st_minilm vector(384),     -- sentence-transformers MiniLM
  embedding_st_bge vector(1024),       -- sentence-transformers bge-m3
  embedding_openai vector(1536)        -- OpenAI text-embedding-3-small
);
```

**插入**：

```python
# 同一段文字，用 3 個 model 各 embed 一次
for text in texts:
    vec_minilm = st_model_minilm.encode(text)
    vec_bge = st_model_bge.encode(text)
    vec_openai = openai_embed(text)

    cur.execute("""
        INSERT INTO items (description, embedding_st_minilm, embedding_st_bge, embedding_openai)
        VALUES (%s, %s, %s, %s)
    """, (text, str(vec_minilm.tolist()), str(vec_bge.tolist()), str(vec_openai)))
```

**查詢**：

```sql
-- 用 MiniLM 找最近
SELECT description, embedding_st_minilm <=> '[query 用 MiniLM embed]' AS dist_minilm
FROM items ORDER BY dist_minilm LIMIT 5;

-- 用 OpenAI 找最近
SELECT description, embedding_openai <=> '[query 用 OpenAI embed]' AS dist_openai
FROM items ORDER BY dist_openai LIMIT 5;
```

**好處**：
- ✅ **直接比較**不同 model 對「同一段文字」的搜尋結果
- ✅ 文字內容只存一次（節省空間）
- ✅ 一張表查所有 model

**壞處**：
- ❌ 每筆要 embed N 次，費時
- ❌ 表結構變寬，不好維護

→ **適合 A/B 測試比較 model 用**。

---

### 模式 B：每個 model 一張表（推薦生產用）

```sql
CREATE TABLE items_minilm (
  id bigserial PRIMARY KEY,
  description text,
  embedding vector(384)
);

CREATE TABLE items_bge (
  id bigserial PRIMARY KEY,
  description text,
  embedding vector(1024)
);

CREATE TABLE items_openai (
  id bigserial PRIMARY KEY,
  description text,
  embedding vector(1536)
);
```

**好處**：
- ✅ 表結構簡單清晰（每張表只有一個 model）
- ✅ 索引獨立，不互相影響
- ✅ 想砍某個 model 直接 `DROP TABLE`，不影響其他

**壞處**：
- ❌ description 重複存（除非用外鍵關聯）

**改進版（用外鍵關聯）**：

```sql
-- 文字內容只存一份
CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  content text NOT NULL
);

-- 每個 model 各自的 embedding 表
CREATE TABLE embeddings_minilm (
  doc_id bigint REFERENCES documents(id),
  embedding vector(384),
  PRIMARY KEY (doc_id)
);

CREATE TABLE embeddings_bge (
  doc_id bigint REFERENCES documents(id),
  embedding vector(1024),
  PRIMARY KEY (doc_id)
);
```

**查詢**：

```sql
-- 用 bge-m3 找最近的 5 段
SELECT d.content, e.embedding <=> '[query]' AS dist
FROM documents d
JOIN embeddings_bge e ON d.id = e.doc_id
ORDER BY dist
LIMIT 5;
```

→ **適合生產環境，schema 乾淨**。

---

### 模式 C：用 metadata 欄位區分（彈性最大）

```sql
CREATE TABLE embeddings (
  id bigserial PRIMARY KEY,
  content text,
  model_name text NOT NULL,
  model_version text,
  embedding_dim int NOT NULL,
  embedding vector,                  -- 注意：沒指定維度（pgvector 0.5+ 支援）
  CHECK (
    (model_name = 'minilm' AND embedding_dim = 384) OR
    (model_name = 'bge-m3' AND embedding_dim = 1024) OR
    (model_name = 'openai-3-small' AND embedding_dim = 1536)
  )
);
```

⚠️ **pgvector 0.5+ 才支援不指定維度**，且**索引建立會比較麻煩**（要按 model 分別建索引或 partial index）。

**好處**：
- ✅ 加新 model 不用改 schema
- ✅ 一張表所有資料

**壞處**：
- ❌ 索引難設定（每個 model 都要 partial index）
- ❌ 查詢要過濾 `WHERE model_name = ...`

→ **新手不推薦**，生產環境特殊需求才用。

---

### 模式 D：不同 schema 或 database

```
PostgreSQL 引擎
├── test_rag_v1 (database)
│   └── items (用 OpenAI)
│
├── test_rag_v2 (database)
│   └── items (用 bge-m3，全新 embed)
│
└── test_rag_dev (database)
    └── items (測試用 MiniLM)
```

**好處**：完全隔離，dev / staging / prod 各跑各的。

**壞處**：管理成本高。

→ **適合大型專案 / 多環境部署**。

---

## 3. 各模式速查

| 模式 | schema | 優點 | 缺點 | 適合 |
|------|--------|------|------|------|
| **A. 同表多 column** | 寬表 | 直接比較 model | 每筆要 embed N 次 | A/B 測試 ⭐ |
| **B. 多 table（外鍵）** | 多張小表 | 乾淨易維護 | 要 JOIN | 生產環境 ⭐ |
| **C. metadata 欄位** | 一張大表 | 彈性 | 索引難 | 特殊需求 |
| **D. 多 database** | 完全隔離 | 安全 | 管理成本高 | 多環境部署 |

---

## 4. 實際場景：A/B 測試誰比較準

### 場景描述

你想知道 **OpenAI text-embedding-3-small** 跟 **bge-m3** 哪個對「中文 RAG」更準。

### 用模式 A 設計

```sql
DROP TABLE IF EXISTS comparison_test;
CREATE TABLE comparison_test (
  id bigserial PRIMARY KEY,
  description text,
  embedding_bge vector(1024),
  embedding_openai vector(1536)
);
```

### 同段文字用兩個 model 各 embed

```python
# compare_models.py
from sentence_transformers import SentenceTransformer
from openai import OpenAI
from dotenv import load_dotenv
import psycopg2, os

load_dotenv()
bge = SentenceTransformer('BAAI/bge-m3')
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

texts = [
    "蘋果公司是 iPhone 的製造商，總部在加州。",
    "蘋果是水果的一種，紅色或綠色，多汁甜脆。",
    "梨子也是水果，跟蘋果類似但更白。",
    "iPhone 是智慧型手機。",
    "Tim Cook 是蘋果公司的執行長。"
]

for text in texts:
    vec_bge = bge.encode(text, normalize_embeddings=True)
    vec_openai = client.embeddings.create(
        model="text-embedding-3-small", input=text
    ).data[0].embedding

    cur.execute("""
        INSERT INTO comparison_test (description, embedding_bge, embedding_openai)
        VALUES (%s, %s, %s)
    """, (text, str(vec_bge.tolist()), str(vec_openai)))
conn.commit()
```

### 比較查詢結果

```python
# compare_query.py
query = "蘋果公司在做什麼？"

# 用 bge 查
query_bge = bge.encode(query, normalize_embeddings=True).tolist()
cur.execute("""
    SELECT description, embedding_bge <=> %s::vector AS dist
    FROM comparison_test ORDER BY dist LIMIT 3
""", (str(query_bge),))
print("=== bge-m3 結果 ===")
for desc, dist in cur.fetchall():
    print(f"  {dist:.4f}  {desc}")

# 用 OpenAI 查
query_openai = client.embeddings.create(
    model="text-embedding-3-small", input=query
).data[0].embedding
cur.execute("""
    SELECT description, embedding_openai <=> %s::vector AS dist
    FROM comparison_test ORDER BY dist LIMIT 3
""", (str(query_openai),))
print("\n=== OpenAI 結果 ===")
for desc, dist in cur.fetchall():
    print(f"  {dist:.4f}  {desc}")
```

預期：兩個 model 都應該把「蘋果公司」相關的排前面，「水果蘋果」排後面。哪個區分度更好就比較強。

---

## 5. 索引也要分開建

每個 column 的 embedding 要**獨立建索引**：

```sql
-- bge 用 cosine
CREATE INDEX ON items USING hnsw (embedding_bge vector_cosine_ops);

-- OpenAI 也用 cosine
CREATE INDEX ON items USING hnsw (embedding_openai vector_cosine_ops);

-- MiniLM 也用 cosine
CREATE INDEX ON items USING hnsw (embedding_st_minilm vector_cosine_ops);
```

→ 三個 column 三個索引，互不影響。查詢時 Postgres 會自動選對應的索引。

---

## 6. 升級 / 換 model 的標準流程

### 場景：原本用 MiniLM，想升級成 bge-m3

#### 模式 A：直接砍重來（資料量小、不在乎舊資料）

```sql
DROP TABLE items;
CREATE TABLE items (embedding vector(1024));
-- 重新 embed 全部
```

#### 模式 B：先加新 column，雙寫一段時間，再砍舊 column

```sql
-- 1. 加新 column
ALTER TABLE items ADD COLUMN embedding_v2 vector(1024);

-- 2. 應用程式雙寫（同時寫入舊 column 跟新 column）

-- 3. 慢慢 backfill 舊資料的 v2 embedding（避免一次跑爆）
-- Python: 每次 100 筆，跑幾天

-- 4. 確認 v2 都填好後，切流量到 v2

-- 5. 砍舊 column
ALTER TABLE items DROP COLUMN embedding;
ALTER TABLE items RENAME COLUMN embedding_v2 TO embedding;
```

→ **生產環境推薦這種「漸進式遷移」**，不要直接砍。

---

## 7. 一個 RAG 系統內，這些必須一致：

| 項目 | 必須一致嗎 |
|------|--------|
| 同一個 column 內的所有 row | ✅ |
| 存資料時跟查詢時用的 model | ✅ |
| chunk 的 model 跟 query 的 model | ✅ |
| 不同 column / table | ❌ 可以不同 |
| 不同 database / 環境 | ❌ 可以不同 |

### ⚠️ 最常見的踩雷

```python
# ❌ 錯：存資料用 OpenAI，查詢用 sentence-transformers
def insert(text):
    vec = openai_embed(text)        # OpenAI 1536
    cur.execute("INSERT ...", vec)

def search(query):
    vec = bge.encode(query)         # bge 1024
    cur.execute("SELECT ... ORDER BY embedding <=> %s", vec)
    # ❌ 維度不對 → 報錯
    # 即使維度相同，語義空間不同 → 結果無意義
```

→ **存什麼 model，查就用什麼 model**，**永遠一致**。

---

## 8. 速記卡

```
一致性的範圍：column 層級，不是 DB 層級

同 column 內：必須同 model  ✅ ✅
不同 column：可以不同 model
不同 table：可以不同 model
不同 DB：可以不同 model

多 model 共存的 4 種模式：
  A. 同表多 column          ← A/B 測試用
  B. 多表 + 外鍵            ← 生產環境用 ⭐
  C. metadata 欄位          ← 特殊需求
  D. 多 DB                  ← 大型專案

升級 model：
  1. 加新 column embedding_v2
  2. 雙寫一段時間
  3. backfill 舊資料
  4. 切流量
  5. 砍舊 column

存什麼 model，查就用什麼 model
```

---

## 相關筆記

- [embedding-models-comparison.md](embedding-models-comparison.md) — 各家 model 對照
- [pgvector-with-openai-embedding.md](pgvector-with-openai-embedding.md) — embedding 實作
- [pgvector-setup-guide.md](pgvector-setup-guide.md) — pgvector setup
- [chunking-strategies-comparison.md](chunking-strategies-comparison.md) — chunking 策略

## 官方資源

- **pgvector indexing docs**：<https://github.com/pgvector/pgvector#indexing>
- **PostgreSQL ALTER TABLE**：<https://www.postgresql.org/docs/current/sql-altertable.html>
- **PostgreSQL Foreign Keys**：<https://www.postgresql.org/docs/current/tutorial-fk.html>
