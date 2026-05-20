# Abby-notes RAG 系統設計

**日期**：2026-05-07
**作者**：Abby + Claude
**狀態**：Phase 1 設計確認中

---

## 目標

把 `C:\coding\futuresign\Abby-notes\` 下 411 個 markdown 筆記檔案，轉成可向量檢索的個人知識庫。最終提供 4 個介面（分階段實作）：

| 階段 | 介面 | 說明 |
|---|---|---|
| **Phase 1**（本次） | D. Jupyter notebook + C. CLI 檢索工具 | 確認資料能進、能搜得準 |
| Phase 2 | B. MCP server | 包成 MCP，給 Claude Code 在對話中自動查詢 |
| Phase 3 | A. Web 問答 UI | 加上 LLM generation，做完整 RAG 問答 |

---

## 技術棧

| 元件 | 選擇 | 版本/維度 | 理由 |
|---|---|---|---|
| Embedding 模型 | `BAAI/bge-m3` | 1024 維，支援 8192 tokens context | 中英混合 + 技術詞檢索 SOTA |
| 向量資料庫 | pgvector | Postgres 17 + pgvector 0.8 | 支援 hybrid search（向量 + 全文）、可重用既有 Postgres 經驗 |
| 部署 | Docker Compose | - | 隔離乾淨、不污染 FutureSign 環境 |
| 語言/框架 | Python 3.13 + sentence-transformers + psycopg2 + langchain | - | sentence-transformers 已全域裝好 |

---

## 架構

```
資料源：C:\coding\futuresign\Abby-notes\           （411 個 .md 檔，純筆記）
                    │
                    ▼
        ┌──────────────────────────────┐
        │ Ingest Pipeline (ingest.py)  │
        │  1. 讀檔                      │
        │  2. md hash 比對 (skip 未變動) │
        │  3. Markdown header chunking  │
        │  4. bge-m3 encode             │
        │  5. INSERT INTO chunks        │
        └──────────────┬───────────────┘
                       ▼
        ┌──────────────────────────────┐
        │ pgvector (Docker container)  │
        │   chunks table + HNSW index  │
        └──────────────┬───────────────┘
                       ▼
        ┌──────────────────────────────┐
        │ Retrieval API (Python module)│
        │   search(query, top_k=5)     │
        └──────┬───────┬───────┬───────┘
               │       │       │
               ▼       ▼       ▼
        ┌──────────┐ ┌────┐ ┌────────┐
        │CLI 工具   │ │MCP │ │Web UI  │
        │(Phase 1) │ │P2  │ │P3      │
        └──────────┘ └────┘ └────────┘
```

---

## 專案結構

新建目錄 `C:\coding\futuresign\abby-notes-rag\`，與 Abby-notes 平行：

```
abby-notes-rag/
├── docker-compose.yml         # pgvector container
├── .env                       # DB 連線 / 路徑設定
├── .gitignore
├── requirements.txt
├── venv/                      # Python 虛擬環境
├── src/
│   ├── __init__.py
│   ├── config.py              # 設定 (DB / model / paths)
│   ├── chunker.py             # Markdown 切塊邏輯
│   ├── embedder.py            # bge-m3 wrapper
│   ├── db.py                  # pgvector connection + queries
│   └── retriever.py           # search API
├── scripts/
│   ├── init_db.sql            # 建表 + 建索引
│   ├── ingest.py              # 全量 / 增量 ingest
│   └── search.py              # CLI 檢索工具
├── notebooks/
│   └── exploration.ipynb      # 互動探索（看 chunks、看搜尋結果）
└── tests/
    └── test_queries.yaml      # 10 個驗收查詢
```

---

## Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id           SERIAL PRIMARY KEY,
  file_path    TEXT        NOT NULL,    -- 'RAG/pgvector-setup-guide.md'（相對於 Abby-notes/）
  file_hash    TEXT        NOT NULL,    -- MD5，偵測檔案內容變更
  chunk_index  INTEGER     NOT NULL,    -- 0, 1, 2... 同一檔內順序
  heading_path TEXT,                    -- '# Title > ## Section > ### Subsection'
  content      TEXT        NOT NULL,    -- chunk 原文
  token_count  INTEGER,                 -- chunk 的 token 數（觀察用）
  embedding    vector(1024) NOT NULL,   -- bge-m3 輸出維度
  created_at   TIMESTAMP   DEFAULT NOW()
);

-- 向量索引（HNSW，速度 vs 精準度的平衡）
CREATE INDEX chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);

-- 查 file_path 加速（增量 ingest 用）
CREATE INDEX chunks_file_path_idx ON chunks (file_path);

-- 全文檢索索引（hybrid search 用，Phase 1 先建好不用）
CREATE INDEX chunks_content_fts_idx
  ON chunks USING GIN (to_tsvector('simple', content));
```

### 為什麼要 file_hash？

每次 ingest 比對 hash，沒變動的檔案直接跳過，避免重做 embedding（每個檔約 2-3 秒）。
不用 mtime 因為 git clone / 同步會亂改 mtime，hash 只看內容最可靠。

---

## Chunking 策略

**Markdown header-aware + 動態 sliding window**：

```
規則：
1. 先按 # / ## / ### / #### headers 切分
2. 每塊上限 800 tokens（中文約 1200-1600 字）
3. 每塊下限 100 tokens（過小的合併到上一塊）
4. 超過 800 tokens 的段落用 sliding window，overlap 100 tokens
5. 保留 heading_path metadata（'# Doc > ## Section > ### Subsec'）
```

**理由**：
- 你筆記都是 markdown，按 header 切最符合作者意圖
- 800 tokens 對 bge-m3 (8192 tokens 上限) 是寬鬆的，但夠精準（避免一個 chunk 涵蓋太多主題）
- overlap 避免句子被截斷導致語意斷裂
- heading_path 在搜尋結果顯示時可以告訴你「這段在哪個檔案的哪一節」

**實作工具**：`langchain.text_splitter.MarkdownHeaderTextSplitter` + `RecursiveCharacterTextSplitter`

---

## Ingest 流程

```python
# scripts/ingest.py 邏輯

def ingest(incremental=True):
    files = glob('Abby-notes/**/*.md')

    for file in files:
        new_hash = md5(file.read())

        if incremental:
            old_hash = db.query("SELECT DISTINCT file_hash FROM chunks WHERE file_path=?", file)
            if old_hash == new_hash:
                continue  # 跳過

        # 檔案有變動 → 刪舊 chunks，重新處理
        db.execute("DELETE FROM chunks WHERE file_path=?", file)

        chunks = markdown_chunk(file, max_tokens=800, overlap=100)
        embeddings = bge_m3.encode([c.content for c in chunks], batch_size=32)

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            db.execute("""
                INSERT INTO chunks (file_path, file_hash, chunk_index,
                                    heading_path, content, token_count, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, file, new_hash, i, chunk.heading_path,
                 chunk.content, chunk.token_count, emb)
```

**執行方式**：
```powershell
python scripts/ingest.py            # 增量更新（預設）
python scripts/ingest.py --full     # 全量重建（清空 + 重做）
```

---

## 檢索 API

```python
# src/retriever.py

def search(query: str, top_k: int = 5, filter_path: str = None) -> list[Chunk]:
    """
    輸入問題 → 回傳 top-k 最相關的 chunks

    Args:
        query: 自然語言問題
        top_k: 回傳幾筆
        filter_path: 限制檔案路徑（例如 'RAG/' 只搜 RAG 資料夾）
    """
    query_emb = bge_m3.encode(query)

    sql = """
        SELECT id, file_path, heading_path, content,
               1 - (embedding <=> %s::vector) AS similarity
        FROM chunks
        WHERE (%s IS NULL OR file_path LIKE %s)
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """
    return db.query(sql, query_emb, filter_path, f'{filter_path}%', query_emb, top_k)
```

**CLI 用法**：
```powershell
python scripts/search.py "Docker AutoMigrate 失敗怎麼處理"
python scripts/search.py "pgvector 怎麼建索引" --filter RAG/
python scripts/search.py "測試帳號" --top-k 10
```

**輸出格式**：
```
[1] (sim=0.87) backend-notes.md > AutoMigrate 注意事項
    位於 internal/migrate/migrate.go，如果任一模型遷移失敗...

[2] (sim=0.81) AutoMigrate-debug.md > 解決步驟
    ...
```

---

## Docker Compose

```yaml
# abby-notes-rag/docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg17
    container_name: abby-rag-postgres
    environment:
      POSTGRES_USER: abby
      POSTGRES_PASSWORD: abby_local
      POSTGRES_DB: abby_rag
    ports:
      - "5433:5432"      # 5433 避免跟其他 Postgres 衝突
    volumes:
      - ./data:/var/lib/postgresql/data
    restart: unless-stopped
```

**啟動**：
```powershell
docker compose up -d
```

---

## 驗收測試（10 個查詢）

寫在 `tests/test_queries.yaml`，跑 `python scripts/search.py` 對每題看 top-5 是否包含正確答案：

```yaml
queries:
  - q: "Docker AutoMigrate 失敗怎麼處理？"
    expect_contains: "AUTO_MIGRATE_ENABLED=false"
    expect_file: "MEMORY.md"

  - q: "pointerEvents 用法"
    expect_file: "chakra-css-notes.md"

  - q: "Go 的 goroutine 怎麼寫"
    expect_file: "golang-concurrency.md"

  - q: "Redis SCAN 跟 KEYS 差別"
    expect_file: "redis-guide.md"

  - q: "pgvector 怎麼建索引"
    expect_file: "RAG/pgvector-setup-guide.md"

  # 另外 5 個由 Abby 補充
```

**通過標準**：top-5 命中率 ≥ 80%（10 題至少 8 題在前 5 名找到正確檔案）。

---

## Phase 1 實作步驟

1. ✅ 建立 `abby-notes-rag/` 專案結構 + venv
2. ✅ 寫 `docker-compose.yml`，啟動 pgvector container
3. ✅ 寫 `init_db.sql`，建表 + 建索引
4. ✅ 寫 `chunker.py`（markdown header-aware chunking）
5. ✅ 寫 `embedder.py`（bge-m3 wrapper，首次下載 ~2.3GB）
6. ✅ 寫 `db.py`（pgvector connection + insert/query）
7. ✅ 寫 `ingest.py`（full + incremental）
8. ✅ 跑全量 ingest（411 個檔案，預估 15-30 分鐘）
9. ✅ 寫 `search.py` CLI
10. ✅ 寫 Jupyter notebook 探索
11. ✅ 跑 10 個驗收查詢，確認品質

---

## 不在 Phase 1 範圍內

明確排除，避免 scope creep：
- ❌ MCP server 包裝（Phase 2）
- ❌ LLM generation / 問答（Phase 3）
- ❌ Web UI
- ❌ Git hook 自動 ingest
- ❌ Hybrid search（向量 + 全文混搜的 ranking 演算法）— FTS 索引先建好，調 hybrid 留 Phase 2
- ❌ 多 embedding model 比較

---

## 已知風險與緩解

| 風險 | 緩解 |
|---|---|
| bge-m3 首次下載 ~2.3GB，網速慢可能等很久 | 先 `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"` 預先下載 |
| 411 檔案 ingest 耗時 15-30 分鐘 | 用 `batch_size=32` 加速，且只跑一次（後續都增量） |
| 中英混合查詢可能某語言檢索差 | 驗收查詢覆蓋中、英、混合各幾題 |
| chunk 切太小導致語意破碎 | 設下限 100 tokens + overlap 100 tokens |
| Docker Desktop 可能沒開 | 開工前手動啟動 |

---

## 環境前置需求（開工前確認）

1. ✅ Python 3.13（已裝）
2. ✅ sentence-transformers（已全域裝）
3. ✅ Docker Engine 28.5.1（已裝）
4. ⚠️ **Docker Desktop 需手動啟動**（目前未跑）
5. ✅ RAM 32GB（充足）
