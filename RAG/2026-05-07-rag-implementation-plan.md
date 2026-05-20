# Abby-notes RAG Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a vector retrieval system that ingests 411 Abby-notes markdown files into pgvector and exposes a CLI search tool with a Jupyter notebook for exploration (Phase 1 = D + C).

**Architecture:** Python ingest pipeline → bge-m3 embeddings (1024-dim) → pgvector in Docker → Python retrieval module → CLI + Notebook frontend.

==**Tech Stack:** Python 3.13, sentence-transformers, langchain-text-splitters, psycopg2-binary, pgvector/pgvector:pg17 Docker image, Jupyter, pytest.==

**Spec:** `Abby-notes/RAG/2026-05-07-rag-system-design.md`

**Working dir:** `C:\coding\futuresign\abby-notes-rag\` (sibling to `Abby-notes`)

---

## 讀懂這份 Plan 的關鍵概念

### Smoke test（煙霧測試）

最低限度的存活確認，**只測「會不會直接炸掉」**，不深入測邏輯。例如 Task 5 的 `python -c "from src.config import Config; print(Config.POSTGRES_HOST)"` 就是 smoke test —  跑一下看會不會 ImportError 或 KeyError。30 秒內就知道環境通不通。

「smoke test 預期輸出」每個 Task 都會列。看到輸出 = 過關；噴錯就照下面對照表：

| 錯誤類型                                             | 通常代表                                                 |
| ------------------------------------------------ | ---------------------------------------------------- |
| `ModuleNotFoundError: No module named 'src.xxx'` | 沒從專案根目錄執行 → `cd C:\coding\futuresign\abby-notes-rag` |
| `KeyError: 'POSTGRES_HOST'`                      | `.env` 沒讀到 → 檢查檔案存在、`load_dotenv()` 有呼叫、cwd 對        |
| `ValueError: invalid literal for int()`          | `.env` 裡有欄位是空的或值寫錯                                   |
| `psycopg2.OperationalError: could not connect`   | Docker 容器沒跑 → `docker compose up -d`                 |

### TDD（Test-Driven Development）三色循環

```
🔴 RED   先寫測試 → 跑 → 看到失敗（證明測試會 catch 問題）
🟢 GREEN 再寫程式 → 跑 → 看到全部通過
🔵 REFACTOR 安心整理（測試當守門員）
```

每個 TDD task（Task 6/8/10）都會明確標出 RED/GREEN 階段的預期輸出。**RED 階段失敗很重要**，沒看到失敗就直接過 = 你的測試可能根本沒在驗證東西。

---

## Task 1: Project Scaffold

**Files:**
- Create: `C:\coding\futuresign\abby-notes-rag\` (root)
- Create: `abby-notes-rag/.gitignore`
- Create: `abby-notes-rag/README.md`

- [ ] **Step 1: Create directory structure**

```powershell
cd C:\coding\futuresign
New-Item -ItemType Directory -Path abby-notes-rag\src,abby-notes-rag\scripts,abby-notes-rag\tests,abby-notes-rag\notebooks,abby-notes-rag\data
```

Expected: 5 nested directories created under `abby-notes-rag/`.

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.venv/
*.egg-info/
.pytest_cache/

# Docker / DB data
data/
*.db

# Jupyter
.ipynb_checkpoints/

# IDE
.vscode/
.idea/

# Env
.env
.env.local

# OS
.DS_Store
Thumbs.db

# HuggingFace cache (if downloaded into project)
.cache/
```

Write to: `abby-notes-rag/.gitignore`

- [ ] **Step 3: Create `README.md`**

```markdown
# Abby-notes RAG

Personal knowledge RAG system over `../Abby-notes/`. See [design doc](../Abby-notes/RAG/2026-05-07-rag-system-design.md).

## Quick start

```powershell
# 1. Start pgvector
docker compose up -d

# 2. Activate venv + install deps
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Initialize DB schema
python scripts\init_db.py

# 4. Ingest notes (~15-30 min first time, downloads bge-m3 ~2.3GB)
python scripts\ingest.py --full

# 5. Search
python scripts\search.py "Docker AutoMigrate 失敗怎麼處理"
```
```

Write to: `abby-notes-rag/README.md`

- [ ] **Step 4: Init git repo**

```powershell
cd C:\coding\futuresign\abby-notes-rag
git init
git add .gitignore README.md
git commit -m "chore: initial project scaffold"
```

Expected: Initial commit on `main` branch.

---

## Task 2: Python Virtual Environment & Dependencies

**Files:**
- Create: `abby-notes-rag/venv/` (auto-generated)
- Create: `abby-notes-rag/requirements.txt`

- [ ] **Step 1: Create venv**

```powershell
cd C:\coding\futuresign\abby-notes-rag
python -m venv venv
```

Expected: `venv/` directory created with `Scripts/python.exe`.

- [ ] **Step 2: Activate venv**

```powershell
.\venv\Scripts\Activate.ps1
```

Expected: Prompt prefix changes to `(venv)`.

> If you get "execution policy" error, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

- [ ] **Step 3: Write `requirements.txt`**

```
sentence-transformers==5.4.1
langchain-text-splitters==0.3.0
psycopg2-binary==2.9.10
pgvector==0.3.6
python-dotenv==1.0.1
tiktoken==0.8.0
pyyaml==6.0.2
jupyter==1.1.1
pytest==8.3.4
```

Write to: `abby-notes-rag/requirements.txt`

- [ ] **Step 4: Install**

```powershell
pip install -r requirements.txt
```

Expected: All packages install successfully (will pull ~2GB of torch as a sentence-transformers dep — may take 5-10 min).

- [ ] **Step 5: Commit**

```powershell
git add requirements.txt
git commit -m "chore: pin python dependencies"
```

---

## Task 3: Docker Compose for pgvector

**Files:**
- Create: `abby-notes-rag/docker-compose.yml`
- Create: `abby-notes-rag/.env`
- Create: `abby-notes-rag/.env.example`

- [ ] **Step 1: Verify Docker Desktop is running**

```powershell
docker ps
```

Expected: Empty table (no error). If error "cannot find pipe", **start Docker Desktop manually** and retry.

- [ ] **Step 2: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    container_name: abby-rag-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - ./data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Write to: `abby-notes-rag/docker-compose.yml`

- [ ] **Step 3: Write `.env.example`**

```env
POSTGRES_USER=abby
POSTGRES_PASSWORD=abby_local
POSTGRES_DB=abby_rag
POSTGRES_HOST=localhost
POSTGRES_PORT=5433

NOTES_ROOT=C:\coding\futuresign\Abby-notes
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024

CHUNK_MAX_TOKENS=800
CHUNK_OVERLAP_TOKENS=100
CHUNK_MIN_TOKENS=100
```

Write to: `abby-notes-rag/.env.example`

- [ ] **Step 4: Write `.env`** (same content as `.env.example`)

```powershell
Copy-Item .env.example .env
```

- [ ] **Step 5: Start container**

```powershell
docker compose up -d
```

Expected output:
```
✔ Network abby-notes-rag_default        Created
✔ Container abby-rag-postgres           Started
```

- [ ] **Step 6: Wait for healthy**

```powershell
docker compose ps
```

Expected: `abby-rag-postgres` shows status `Up X seconds (healthy)`. Retry every 5s if still `(starting)`.

- [ ] **Step 7: Verify pgvector extension available**

```powershell
docker exec abby-rag-postgres psql -U abby -d abby_rag -c "SELECT extname FROM pg_available_extensions WHERE name='vector';"
```

Expected output:
```
 extname
---------
 vector
(1 row)
```

- [ ] **Step 8: Commit**

```powershell
git add docker-compose.yml .env.example
git commit -m "feat: add pgvector docker compose"
```

> Note: `.env` is gitignored. Only `.env.example` is committed.

---

## Task 4: Database Schema

**Files:**
- Create: `abby-notes-rag/scripts/init_db.sql`
- Create: `abby-notes-rag/scripts/init_db.py`

- [ ] **Step 1: Write `init_db.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS chunks CASCADE;

CREATE TABLE chunks (
  id           SERIAL PRIMARY KEY,
  file_path    TEXT         NOT NULL,
  file_hash    TEXT         NOT NULL,
  chunk_index  INTEGER      NOT NULL,
  heading_path TEXT,
  content      TEXT         NOT NULL,
  token_count  INTEGER,
  embedding    vector(1024) NOT NULL,
  created_at   TIMESTAMP    DEFAULT NOW(),
  UNIQUE (file_path, chunk_index)
);

CREATE INDEX chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX chunks_file_path_idx ON chunks (file_path);

CREATE INDEX chunks_content_fts_idx
  ON chunks USING GIN (to_tsvector('simple', content));
```

Write to: `abby-notes-rag/scripts/init_db.sql`

- [ ] **Step 2: Write `init_db.py`**

```python
"""Apply init_db.sql to the pgvector container."""
from pathlib import Path
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

SQL_FILE = Path(__file__).parent / "init_db.sql"


def main():
    sql = SQL_FILE.read_text(encoding="utf-8")

    conn = psycopg2.connect(
        host=os.environ["POSTGRES_HOST"],
        port=os.environ["POSTGRES_PORT"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        dbname=os.environ["POSTGRES_DB"],
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.close()
    print("Schema applied successfully.")


if __name__ == "__main__":
    main()
```

Write to: `abby-notes-rag/scripts/init_db.py`

- [ ] **Step 3: Run it**

```powershell
python scripts\init_db.py
```

Expected output: `Schema applied successfully.`

- [ ] **Step 4: Verify table exists**

```powershell
docker exec abby-rag-postgres psql -U abby -d abby_rag -c "\d chunks"
```

Expected: Table description showing all columns.

- [ ] **Step 5: Commit**

```powershell
git add scripts/init_db.sql scripts/init_db.py
git commit -m "feat: add chunks table schema with hnsw + fts indexes"
```

---

## Task 5: Config Module

**Files:**
- Create: `abby-notes-rag/src/__init__.py`
- Create: `abby-notes-rag/src/config.py`

- [ ] **Step 1: Create `__init__.py`** (empty file)

Write to: `abby-notes-rag/src/__init__.py`

```python
```

- [ ] **Step 2: Write `config.py`**

```python
"""Centralized configuration loaded from .env."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    # DB
    POSTGRES_HOST = os.environ["POSTGRES_HOST"]
    POSTGRES_PORT = int(os.environ["POSTGRES_PORT"])
    POSTGRES_USER = os.environ["POSTGRES_USER"]
    POSTGRES_PASSWORD = os.environ["POSTGRES_PASSWORD"]
    POSTGRES_DB = os.environ["POSTGRES_DB"]

    # Notes source
    NOTES_ROOT = Path(os.environ["NOTES_ROOT"])

    # Embedding
    EMBEDDING_MODEL = os.environ["EMBEDDING_MODEL"]
    EMBEDDING_DIM = int(os.environ["EMBEDDING_DIM"])

    # Chunking
    CHUNK_MAX_TOKENS = int(os.environ["CHUNK_MAX_TOKENS"])
    CHUNK_OVERLAP_TOKENS = int(os.environ["CHUNK_OVERLAP_TOKENS"])
    CHUNK_MIN_TOKENS = int(os.environ["CHUNK_MIN_TOKENS"])

    @classmethod
    def dsn(cls) -> str:
        return (
            f"host={cls.POSTGRES_HOST} port={cls.POSTGRES_PORT} "
            f"user={cls.POSTGRES_USER} password={cls.POSTGRES_PASSWORD} "
            f"dbname={cls.POSTGRES_DB}"
        )
```

Write to: `abby-notes-rag/src/config.py`

- [ ] **Step 3: Commit**

```powershell
git add src/__init__.py src/config.py
git commit -m "feat: add Config class for env-driven settings"
```

---

## Task 6: Chunker Module (TDD)

**Files:**
- Create: `abby-notes-rag/src/chunker.py`
- Create: `abby-notes-rag/tests/__init__.py`
- Create: `abby-notes-rag/tests/test_chunker.py`

- [ ] **Step 1: Write failing test `test_chunker.py`**

```python
"""Tests for markdown header-aware chunker."""
from src.chunker import Chunk, chunk_markdown


def test_simple_markdown_produces_chunks():
    md = """# Title

Para 1 about Docker.

## Section A

Content of A.

## Section B

Content of B with more details.
"""
    chunks = chunk_markdown(md)
    assert len(chunks) >= 1
    assert all(isinstance(c, Chunk) for c in chunks)
    assert all(c.content.strip() for c in chunks)


def test_chunk_carries_heading_path():
    md = """# Top

## Sub

Body of sub.
"""
    chunks = chunk_markdown(md)
    sub_chunks = [c for c in chunks if "Body of sub" in c.content]
    assert len(sub_chunks) >= 1
    assert "Sub" in sub_chunks[0].heading_path


def test_long_section_is_split_with_overlap():
    long_para = "重複的中文句子。" * 500  # ~3000 chars, definitely > 800 tokens
    md = f"# Title\n\n## Long\n\n{long_para}"
    chunks = chunk_markdown(md, max_tokens=800, overlap=100)
    long_chunks = [c for c in chunks if "重複的中文句子" in c.content]
    assert len(long_chunks) >= 2, "Long section should be split"


def test_token_count_populated():
    chunks = chunk_markdown("# T\n\nHello world.")
    assert all(c.token_count > 0 for c in chunks)


def test_empty_markdown_returns_empty():
    assert chunk_markdown("") == []
    assert chunk_markdown("   \n\n  ") == []
```

Write to: `abby-notes-rag/tests/test_chunker.py`

Also create: `abby-notes-rag/tests/__init__.py` (empty)

- [ ] **Step 2: Run to verify failure**

```powershell
pytest tests/test_chunker.py -v
```

Expected: All 5 tests fail with `ImportError: cannot import name 'Chunk'`.

- [ ] **Step 3: Implement `chunker.py`**

```python
"""Markdown header-aware chunker using langchain text splitters."""
from dataclasses import dataclass
from typing import List

import tiktoken
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)

from src.config import Config

_ENCODER = tiktoken.get_encoding("cl100k_base")


def _count_tokens(text: str) -> int:
    return len(_ENCODER.encode(text))


@dataclass
class Chunk:
    content: str
    heading_path: str
    token_count: int


HEADERS_TO_SPLIT = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
    ("####", "h4"),
]


def chunk_markdown(
    markdown: str,
    max_tokens: int | None = None,
    overlap: int | None = None,
    min_tokens: int | None = None,
) -> List[Chunk]:
    """Split markdown into header-aware, size-bounded chunks."""
    if not markdown or not markdown.strip():
        return []

    max_tokens = max_tokens or Config.CHUNK_MAX_TOKENS
    overlap = overlap or Config.CHUNK_OVERLAP_TOKENS
    min_tokens = min_tokens or Config.CHUNK_MIN_TOKENS

    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=HEADERS_TO_SPLIT,
        strip_headers=False,
    )
    header_docs = header_splitter.split_text(markdown)

    char_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base",
        chunk_size=max_tokens,
        chunk_overlap=overlap,
    )

    result: List[Chunk] = []
    for doc in header_docs:
        heading_parts = [doc.metadata.get(k) for k in ("h1", "h2", "h3", "h4")]
        heading_path = " > ".join(p for p in heading_parts if p)

        text = doc.page_content
        if _count_tokens(text) <= max_tokens:
            sub_texts = [text]
        else:
            sub_texts = char_splitter.split_text(text)

        for sub in sub_texts:
            sub = sub.strip()
            if not sub:
                continue
            tokens = _count_tokens(sub)
            if tokens < min_tokens and result:
                # Merge tiny chunk into previous one
                prev = result[-1]
                merged = prev.content + "\n\n" + sub
                result[-1] = Chunk(
                    content=merged,
                    heading_path=prev.heading_path,
                    token_count=_count_tokens(merged),
                )
            else:
                result.append(Chunk(content=sub, heading_path=heading_path, token_count=tokens))

    return result
```

Write to: `abby-notes-rag/src/chunker.py`

- [ ] **Step 4: Run tests to verify pass**

```powershell
pytest tests/test_chunker.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/chunker.py tests/__init__.py tests/test_chunker.py
git commit -m "feat: markdown header-aware chunker with token-bounded splits"
```

---

## Task 7: Embedder Module

**Files:**
- Create: `abby-notes-rag/src/embedder.py`
- Create: `abby-notes-rag/tests/test_embedder.py`

- [ ] **Step 1: Write smoke test `test_embedder.py`**

```python
"""Smoke test for bge-m3 wrapper. Downloads model on first run (~2.3GB)."""
import numpy as np
import pytest

from src.embedder import Embedder


@pytest.fixture(scope="module")
def embedder():
    return Embedder()


def test_encode_single_returns_1024_dim(embedder):
    v = embedder.encode_one("Docker AutoMigrate 失敗怎麼處理")
    assert isinstance(v, np.ndarray)
    assert v.shape == (1024,)
    assert v.dtype == np.float32


def test_encode_batch_returns_matrix(embedder):
    texts = ["Hello world", "你好世界", "Goroutine 的用法"]
    matrix = embedder.encode(texts)
    assert matrix.shape == (3, 1024)


def test_similar_texts_have_high_cosine(embedder):
    v1 = embedder.encode_one("Docker 容器啟動失敗")
    v2 = embedder.encode_one("Docker container 無法啟動")
    v3 = embedder.encode_one("烤蛋糕食譜")
    # Cosine sim (vectors are normalized by bge-m3)
    sim_close = float(np.dot(v1, v2))
    sim_far = float(np.dot(v1, v3))
    assert sim_close > sim_far
    assert sim_close > 0.6  # Sanity threshold for clearly related sentences
```

Write to: `abby-notes-rag/tests/test_embedder.py`

- [ ] **Step 2: Run to verify failure**

```powershell
pytest tests/test_embedder.py -v
```

Expected: Fails with `ImportError`.

- [ ] **Step 3: Implement `embedder.py`**

```python
"""Wrapper around sentence-transformers BAAI/bge-m3 model."""
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

from src.config import Config


class Embedder:
    """Loads bge-m3 once and exposes batch / single encoding."""

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or Config.EMBEDDING_MODEL
        print(f"Loading embedding model: {self.model_name} ...")
        self.model = SentenceTransformer(self.model_name)
        self.dim = Config.EMBEDDING_DIM
        print(f"Model loaded. Dim={self.dim}")

    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """Encode a list of texts into a (N, dim) float32 matrix (L2-normalized)."""
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 50,
        )
        return embeddings.astype(np.float32)

    def encode_one(self, text: str) -> np.ndarray:
        return self.encode([text])[0]
```

Write to: `abby-notes-rag/src/embedder.py`

- [ ] **Step 4: Pre-download the model** (optional but speeds up first test)

```powershell
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
```

Expected: Downloads ~2.3GB to `C:\Users\User\.cache\huggingface\hub\`. Takes 3-15 min depending on network.

- [ ] **Step 5: Run tests to verify pass**

```powershell
pytest tests/test_embedder.py -v
```

Expected: All 3 tests PASS. Slow first run (model load), fast subsequent runs.

- [ ] **Step 6: Commit**

```powershell
git add src/embedder.py tests/test_embedder.py
git commit -m "feat: bge-m3 embedder wrapper with batch encode"
```

---

## Task 8: DB Module

**Files:**
- Create: `abby-notes-rag/src/db.py`
- Create: `abby-notes-rag/tests/test_db.py`

- [ ] **Step 1: Write smoke test `test_db.py`**

```python
"""Smoke test for db module. Requires running pgvector container + applied schema."""
import numpy as np
import pytest

from src.db import Database


@pytest.fixture
def db():
    d = Database()
    yield d
    # Clean up test rows
    d.execute("DELETE FROM chunks WHERE file_path LIKE 'TEST_%'")
    d.close()


def test_insert_and_count(db):
    emb = np.random.rand(1024).astype(np.float32)
    db.insert_chunk(
        file_path="TEST_smoke.md",
        file_hash="abc123",
        chunk_index=0,
        heading_path="# T",
        content="hello",
        token_count=2,
        embedding=emb,
    )
    rows = db.fetchall("SELECT COUNT(*) FROM chunks WHERE file_path='TEST_smoke.md'")
    assert rows[0][0] == 1


def test_get_file_hashes_returns_dict(db):
    emb = np.random.rand(1024).astype(np.float32)
    db.insert_chunk("TEST_hash.md", "deadbeef", 0, "# X", "x", 1, emb)
    hashes = db.get_file_hashes()
    assert hashes.get("TEST_hash.md") == "deadbeef"


def test_delete_file_chunks(db):
    emb = np.random.rand(1024).astype(np.float32)
    db.insert_chunk("TEST_del.md", "h", 0, "# A", "a", 1, emb)
    db.insert_chunk("TEST_del.md", "h", 1, "# A", "b", 1, emb)
    db.delete_file_chunks("TEST_del.md")
    rows = db.fetchall("SELECT COUNT(*) FROM chunks WHERE file_path='TEST_del.md'")
    assert rows[0][0] == 0


def test_search_returns_top_k(db):
    rng = np.random.default_rng(42)
    target = rng.random(1024, dtype=np.float32)
    target /= np.linalg.norm(target)

    for i in range(5):
        e = rng.random(1024, dtype=np.float32)
        e /= np.linalg.norm(e)
        db.insert_chunk(f"TEST_search_{i}.md", "h", 0, "# A", f"text {i}", 1, e)

    # Insert one chunk that IS the target
    db.insert_chunk("TEST_search_target.md", "h", 0, "# A", "target text", 1, target)

    results = db.search(target, top_k=3)
    assert len(results) == 3
    assert results[0]["file_path"] == "TEST_search_target.md"
    assert results[0]["similarity"] > 0.99
```

Write to: `abby-notes-rag/tests/test_db.py`

- [ ] **Step 2: Run to verify failure**

```powershell
pytest tests/test_db.py -v
```

Expected: Fails with `ImportError`.

- [ ] **Step 3: Implement `db.py`**

```python
"""Thin wrapper over psycopg2 + pgvector for the chunks table."""
from typing import Any, Dict, List, Optional

import numpy as np
import psycopg2
from pgvector.psycopg2 import register_vector

from src.config import Config


class Database:
    def __init__(self):
        self.conn = psycopg2.connect(Config.dsn())
        self.conn.autocommit = True
        register_vector(self.conn)

    def close(self):
        self.conn.close()

    # ---- generic helpers ----
    def execute(self, sql: str, params: tuple = ()) -> None:
        with self.conn.cursor() as cur:
            cur.execute(sql, params)

    def fetchall(self, sql: str, params: tuple = ()) -> List[tuple]:
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    # ---- chunks-specific ----
    def insert_chunk(
        self,
        file_path: str,
        file_hash: str,
        chunk_index: int,
        heading_path: str,
        content: str,
        token_count: int,
        embedding: np.ndarray,
    ) -> None:
        self.execute(
            """
            INSERT INTO chunks (file_path, file_hash, chunk_index, heading_path,
                                content, token_count, embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (file_path, chunk_index) DO UPDATE
            SET file_hash = EXCLUDED.file_hash,
                heading_path = EXCLUDED.heading_path,
                content = EXCLUDED.content,
                token_count = EXCLUDED.token_count,
                embedding = EXCLUDED.embedding
            """,
            (file_path, file_hash, chunk_index, heading_path, content, token_count, embedding),
        )

    def insert_chunks_batch(self, rows: List[tuple]) -> None:
        """rows = list of (file_path, file_hash, chunk_index, heading_path, content, token_count, embedding)"""
        with self.conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO chunks (file_path, file_hash, chunk_index, heading_path,
                                    content, token_count, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (file_path, chunk_index) DO UPDATE
                SET file_hash = EXCLUDED.file_hash,
                    heading_path = EXCLUDED.heading_path,
                    content = EXCLUDED.content,
                    token_count = EXCLUDED.token_count,
                    embedding = EXCLUDED.embedding
                """,
                rows,
            )

    def get_file_hashes(self) -> Dict[str, str]:
        """Return {file_path: file_hash} for all currently-stored files."""
        rows = self.fetchall(
            "SELECT file_path, MIN(file_hash) FROM chunks GROUP BY file_path"
        )
        return {fp: h for fp, h in rows}

    def delete_file_chunks(self, file_path: str) -> int:
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM chunks WHERE file_path = %s", (file_path,))
            return cur.rowcount

    def truncate_all(self) -> None:
        self.execute("TRUNCATE TABLE chunks RESTART IDENTITY")

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        filter_path_prefix: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Cosine-similarity search. Returns list of dicts with keys: file_path, heading_path, content, similarity."""
        if filter_path_prefix:
            sql = """
                SELECT file_path, heading_path, content,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM chunks
                WHERE file_path LIKE %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            params = (query_embedding, f"{filter_path_prefix}%", query_embedding, top_k)
        else:
            sql = """
                SELECT file_path, heading_path, content,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM chunks
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            params = (query_embedding, query_embedding, top_k)

        rows = self.fetchall(sql, params)
        return [
            {"file_path": r[0], "heading_path": r[1], "content": r[2], "similarity": float(r[3])}
            for r in rows
        ]
```

Write to: `abby-notes-rag/src/db.py`

- [ ] **Step 4: Run tests to verify pass**

```powershell
pytest tests/test_db.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/db.py tests/test_db.py
git commit -m "feat: pgvector db wrapper with insert/search/hash queries"
```

---

## Task 9: Ingest Pipeline

**Files:**
- Create: `abby-notes-rag/scripts/ingest.py`

- [ ] **Step 1: Write `ingest.py`**

```python
"""Ingest all .md files under NOTES_ROOT into pgvector.

Usage:
    python scripts/ingest.py              # incremental (default)
    python scripts/ingest.py --full       # truncate and re-ingest everything
    python scripts/ingest.py --dry-run    # report what would change, don't touch DB
"""
import argparse
import hashlib
import sys
import time
from pathlib import Path

# Make src importable when run from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.chunker import chunk_markdown
from src.config import Config
from src.db import Database
from src.embedder import Embedder


def md5_of(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def relative_path(absolute: Path) -> str:
    """Path relative to NOTES_ROOT, with forward slashes."""
    return str(absolute.relative_to(Config.NOTES_ROOT)).replace("\\", "/")


def collect_md_files() -> list[Path]:
    return [
        p for p in Config.NOTES_ROOT.rglob("*.md")
        if ".git" not in p.parts
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Truncate and re-ingest all")
    parser.add_argument("--dry-run", action="store_true", help="Report only, no DB writes")
    args = parser.parse_args()

    db = Database()
    embedder = Embedder()

    if args.full and not args.dry_run:
        print("Full mode: truncating chunks table ...")
        db.truncate_all()

    files = collect_md_files()
    print(f"Found {len(files)} .md files under {Config.NOTES_ROOT}")

    existing_hashes = {} if args.full else db.get_file_hashes()

    skipped = 0
    updated_files = 0
    total_chunks = 0
    t0 = time.time()

    for i, path in enumerate(files, 1):
        rel = relative_path(path)
        new_hash = md5_of(path)

        if existing_hashes.get(rel) == new_hash:
            skipped += 1
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            print(f"  [WARN] Skip non-utf8 file: {rel}")
            skipped += 1
            continue

        chunks = chunk_markdown(text)
        if not chunks:
            skipped += 1
            continue

        if args.dry_run:
            print(f"  [{i}/{len(files)}] {rel} -> {len(chunks)} chunks (dry-run)")
            updated_files += 1
            total_chunks += len(chunks)
            continue

        # Re-embed and replace
        db.delete_file_chunks(rel)
        embeddings = embedder.encode([c.content for c in chunks])

        rows = [
            (rel, new_hash, idx, c.heading_path, c.content, c.token_count, emb)
            for idx, (c, emb) in enumerate(zip(chunks, embeddings))
        ]
        db.insert_chunks_batch(rows)

        updated_files += 1
        total_chunks += len(chunks)
        print(f"  [{i}/{len(files)}] {rel} -> {len(chunks)} chunks")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s.")
    print(f"  Files updated: {updated_files}")
    print(f"  Files skipped (unchanged): {skipped}")
    print(f"  Chunks written: {total_chunks}")

    db.close()


if __name__ == "__main__":
    main()
```

Write to: `abby-notes-rag/scripts/ingest.py`

- [ ] **Step 2: Dry-run first to confirm file discovery**

```powershell
python scripts\ingest.py --dry-run
```

Expected output ends with:
```
Files updated: ~411
Files skipped (unchanged): 0
Chunks written: <some number, likely 1500-3000>
```

- [ ] **Step 3: Run full ingest**

```powershell
python scripts\ingest.py --full
```

Expected: 15-30 min runtime. Logs each file processed. Ends with summary.

> If interrupted, just run again without `--full` — incremental mode picks up where it left off.

- [ ] **Step 4: Verify in DB**

```powershell
docker exec abby-rag-postgres psql -U abby -d abby_rag -c "SELECT COUNT(*) AS chunks, COUNT(DISTINCT file_path) AS files FROM chunks;"
```

Expected: Around 1500-3000 chunks across ~411 files.

- [ ] **Step 5: Verify incremental mode skips**

```powershell
python scripts\ingest.py
```

Expected output:
```
Files updated: 0
Files skipped (unchanged): ~411
```

- [ ] **Step 6: Commit**

```powershell
git add scripts/ingest.py
git commit -m "feat: ingest pipeline with full + incremental modes"
```

---

## Task 10: Retriever Module

**Files:**
- Create: `abby-notes-rag/src/retriever.py`
- Create: `abby-notes-rag/tests/test_retriever.py`

- [ ] **Step 1: Write integration test `test_retriever.py`**

```python
"""End-to-end retrieval test against the populated DB."""
from src.retriever import Retriever


def test_retrieve_docker_automigrate():
    r = Retriever()
    results = r.search("Docker AutoMigrate 失敗怎麼處理", top_k=5)
    assert len(results) == 5
    # Expect MEMORY.md or backend-related notes in top 5
    paths = [hit["file_path"] for hit in results]
    assert any("MEMORY" in p or "backend" in p.lower() or "AutoMigrate" in p for p in paths), \
        f"Expected AutoMigrate-related file in top 5, got {paths}"


def test_filter_by_path():
    r = Retriever()
    results = r.search("pgvector setup", top_k=5, filter_path_prefix="RAG/")
    assert len(results) >= 1
    assert all(hit["file_path"].startswith("RAG/") for hit in results)


def test_similarity_descending():
    r = Retriever()
    results = r.search("goroutine", top_k=5)
    sims = [h["similarity"] for h in results]
    assert sims == sorted(sims, reverse=True)
```

Write to: `abby-notes-rag/tests/test_retriever.py`

- [ ] **Step 2: Run to verify failure**

```powershell
pytest tests/test_retriever.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `retriever.py`**

```python
"""High-level search API combining embedder + db."""
from typing import Any, Dict, List, Optional

from src.db import Database
from src.embedder import Embedder


class Retriever:
    def __init__(self):
        self.embedder = Embedder()
        self.db = Database()

    def search(
        self,
        query: str,
        top_k: int = 5,
        filter_path_prefix: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Embed the query and return the top_k closest chunks."""
        q_vec = self.embedder.encode_one(query)
        return self.db.search(q_vec, top_k=top_k, filter_path_prefix=filter_path_prefix)

    def close(self):
        self.db.close()
```

Write to: `abby-notes-rag/src/retriever.py`

- [ ] **Step 4: Run tests to verify pass**

```powershell
pytest tests/test_retriever.py -v
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/retriever.py tests/test_retriever.py
git commit -m "feat: high-level retriever combining embedder + db"
```

---

## Task 11: CLI Search Tool

**Files:**
- Create: `abby-notes-rag/scripts/search.py`

- [ ] **Step 1: Write `search.py`**

```python
"""CLI entry for ad-hoc retrieval.

Usage:
    python scripts/search.py "your question"
    python scripts/search.py "pgvector" --top-k 10 --filter RAG/
"""
import argparse
import sys
from pathlib import Path
from textwrap import shorten

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.retriever import Retriever


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="Natural-language query")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--filter", dest="filter_path", default=None,
                        help="Restrict to files starting with this path prefix, e.g. 'RAG/'")
    parser.add_argument("--full", action="store_true", help="Print full chunk content (not truncated)")
    args = parser.parse_args()

    r = Retriever()
    results = r.search(args.query, top_k=args.top_k, filter_path_prefix=args.filter_path)

    if not results:
        print("No results.")
        return

    for i, hit in enumerate(results, 1):
        sim = hit["similarity"]
        path = hit["file_path"]
        heading = hit["heading_path"] or "(no heading)"
        body = hit["content"]
        if not args.full:
            body = shorten(body.replace("\n", " "), width=200, placeholder=" ...")
        print(f"\n[{i}] sim={sim:.3f}  {path}")
        print(f"    > {heading}")
        print(f"    {body}")

    r.close()


if __name__ == "__main__":
    main()
```

Write to: `abby-notes-rag/scripts/search.py`

- [ ] **Step 2: Smoke run**

```powershell
python scripts\search.py "Docker AutoMigrate 失敗怎麼處理"
```

Expected: 5 results with similarity scores, file paths, heading paths, and truncated content.

- [ ] **Step 3: Try filter**

```powershell
python scripts\search.py "pgvector 怎麼建索引" --filter RAG/
```

Expected: All results have `file_path` starting with `RAG/`.

- [ ] **Step 4: Commit**

```powershell
git add scripts/search.py
git commit -m "feat: CLI search tool with filter and full-content flags"
```

---

## Task 12: Validation Test Queries

**Files:**
- Create: `abby-notes-rag/tests/test_queries.yaml`
- Create: `abby-notes-rag/scripts/validate.py`

- [ ] **Step 1: Write `test_queries.yaml`**

```yaml
# Validation queries: each query should find at least one matching expected file in top-k.
# Pass criterion: >= 80% of queries hit (≥ 8/10).
queries:
  - q: "Docker AutoMigrate 失敗怎麼處理？"
    expect_any_of: ["MEMORY.md", "AutoMigrate"]

  - q: "pointerEvents auto 跟 none 差別"
    expect_any_of: ["chakra-css-notes", "MEMORY.md"]

  - q: "Go 的 goroutine 怎麼寫"
    expect_any_of: ["golang-concurrency"]

  - q: "Redis SCAN 跟 KEYS 的差別"
    expect_any_of: ["redis-guide"]

  - q: "pgvector 怎麼建立 HNSW 索引"
    expect_any_of: ["pgvector-setup", "RAG/"]

  - q: "embedding model 跟 vector database 差別"
    expect_any_of: ["RAG/", "embedding"]

  - q: "Booth 訂單買方公司限制"
    expect_any_of: ["booth-order-rules", "MEMORY.md"]

  - q: "Event Coupon ClaimPeriod 有哪些值"
    expect_any_of: ["MEMORY.md", "event_coupon"]

  - q: "git push 應該追蹤哪個遠端分支"
    expect_any_of: ["feedback-git-push", "MEMORY.md"]

  - q: "為什麼不要在 UI 顯示 UUID"
    expect_any_of: ["feedback-no-uuid", "MEMORY.md"]
```

Write to: `abby-notes-rag/tests/test_queries.yaml`

- [ ] **Step 2: Write `validate.py`**

```python
"""Run validation queries and print hit/miss summary."""
import sys
from pathlib import Path
import yaml

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.retriever import Retriever


def main():
    yaml_path = Path(__file__).parent.parent / "tests" / "test_queries.yaml"
    cases = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))["queries"]

    r = Retriever()
    hits = 0

    for case in cases:
        q = case["q"]
        expected = case["expect_any_of"]
        results = r.search(q, top_k=5)
        paths = [hit["file_path"] for hit in results]

        hit = any(any(exp.lower() in p.lower() for p in paths) for exp in expected)
        marker = "✓" if hit else "✗"
        if hit:
            hits += 1

        print(f"{marker} {q}")
        if not hit:
            print(f"    expected any of {expected}")
            print(f"    got: {paths}")

    rate = hits / len(cases) * 100
    print(f"\nHit rate: {hits}/{len(cases)} ({rate:.0f}%)")
    print("PASS" if rate >= 80 else "FAIL — below 80% target")
    r.close()


if __name__ == "__main__":
    main()
```

Write to: `abby-notes-rag/scripts/validate.py`

- [ ] **Step 3: Run validation**

```powershell
python scripts\validate.py
```

Expected: ≥ 8/10 hits (80%+). If lower, investigate which queries failed and consider tweaking chunking parameters.

- [ ] **Step 4: Commit**

```powershell
git add tests/test_queries.yaml scripts/validate.py
git commit -m "test: add 10 validation queries and hit-rate checker"
```

---

## Task 13: Exploration Notebook

**Files:**
- Create: `abby-notes-rag/notebooks/exploration.ipynb`

- [ ] **Step 1: Create notebook structure**

```powershell
cd C:\coding\futuresign\abby-notes-rag
python -m ipykernel install --user --name abby-rag --display-name "Abby RAG"
jupyter notebook --notebook-dir=notebooks --no-browser --port=8889 &
```

(Or use VS Code's Jupyter integration — open `notebooks/exploration.ipynb` and pick the venv kernel.)

- [ ] **Step 2: Write notebook content**

Create file `notebooks/exploration.ipynb` with the following cells:

**Cell 1 (markdown):**
```markdown
# Abby-notes RAG — Exploration Notebook

互動探索 chunks 與檢索結果。
```

**Cell 2 (code):**
```python
import sys
sys.path.insert(0, "..")

from src.retriever import Retriever
from src.db import Database

r = Retriever()
db = Database()
```

**Cell 3 (markdown):**
```markdown
## DB stats
```

**Cell 4 (code):**
```python
total = db.fetchall("SELECT COUNT(*) FROM chunks")[0][0]
files = db.fetchall("SELECT COUNT(DISTINCT file_path) FROM chunks")[0][0]
print(f"{total} chunks across {files} files")
```

**Cell 5 (markdown):**
```markdown
## Look at biggest chunks
```

**Cell 6 (code):**
```python
rows = db.fetchall("""
    SELECT file_path, chunk_index, token_count, LEFT(content, 80)
    FROM chunks
    ORDER BY token_count DESC
    LIMIT 10
""")
for r0 in rows:
    print(r0)
```

**Cell 7 (markdown):**
```markdown
## Try a query
```

**Cell 8 (code):**
```python
results = r.search("Docker AutoMigrate 失敗", top_k=5)
for hit in results:
    print(f"sim={hit['similarity']:.3f}  {hit['file_path']} > {hit['heading_path']}")
    print(f"  {hit['content'][:200]}")
    print()
```

**Cell 9 (markdown):**
```markdown
## Compare two queries' top results
```

**Cell 10 (code):**
```python
for q in ["pgvector HNSW 索引", "向量資料庫 HNSW", "vector index hnsw"]:
    print(f"\n--- {q} ---")
    for hit in r.search(q, top_k=3):
        print(f"  sim={hit['similarity']:.3f}  {hit['file_path']}")
```

> Save this as a Jupyter `.ipynb` via the notebook UI, or write it as a Python script and convert with `jupytext --to ipynb exploration.py`.

- [ ] **Step 3: Open and run all cells**

In Jupyter / VS Code, run all cells top-to-bottom. Verify output.

- [ ] **Step 4: Commit**

```powershell
git add notebooks/exploration.ipynb
git commit -m "docs: add exploration notebook for chunks and queries"
```

---

## Task 14: Final Verification & README Update

**Files:**
- Modify: `abby-notes-rag/README.md`

- [ ] **Step 1: Run the full test suite**

```powershell
pytest -v
```

Expected: All tests PASS (chunker 5, embedder 3, db 4, retriever 3 = 15 tests).

- [ ] **Step 2: Run validation**

```powershell
python scripts\validate.py
```

Expected: Hit rate ≥ 80%.

- [ ] **Step 3: Append usage examples to `README.md`**

Append to `abby-notes-rag/README.md`:

```markdown

## Common operations

### Re-ingest after editing notes

```powershell
python scripts\ingest.py    # incremental, only changed files re-embedded
```

### Search

```powershell
python scripts\search.py "your question" --top-k 5
python scripts\search.py "pgvector" --filter RAG/
python scripts\search.py "..." --full   # print full chunk content
```

### Validate retrieval quality

```powershell
python scripts\validate.py
```

### Stop / start DB

```powershell
docker compose stop
docker compose up -d
```

## Project layout

```
abby-notes-rag/
├── docker-compose.yml
├── .env / .env.example
├── requirements.txt
├── src/
│   ├── config.py        # Env-driven settings
│   ├── chunker.py       # Markdown header-aware chunking
│   ├── embedder.py      # bge-m3 wrapper
│   ├── db.py            # pgvector queries
│   └── retriever.py     # search API
├── scripts/
│   ├── init_db.py / .sql
│   ├── ingest.py        # full + incremental
│   ├── search.py        # CLI
│   └── validate.py      # 10-query hit-rate check
├── tests/
│   ├── test_chunker.py
│   ├── test_embedder.py
│   ├── test_db.py
│   ├── test_retriever.py
│   └── test_queries.yaml
└── notebooks/
    └── exploration.ipynb
```
```

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: expand README with usage and project layout"
```

- [ ] **Step 5: Final summary**

Print the following to confirm Phase 1 completion:

```
Phase 1 complete.
✓ 15 unit tests passing
✓ {N} chunks ingested across {N} files
✓ Validation hit rate: {N}%
✓ CLI search working

Next: Phase 2 (MCP server) — separate plan.
```

---

## Self-review notes

- **Spec coverage:** All Phase 1 items from spec are addressed (D + C). Phase 2/3 explicitly excluded as per spec.
- **No placeholders:** Every code/SQL block contains real content.
- **Type consistency:** `Chunk` dataclass fields (`content`, `heading_path`, `token_count`) used consistently across chunker → ingest → DB.
- **Method names consistent:** `Database.search()`, `Retriever.search()`, `Embedder.encode()` / `.encode_one()` — used the same way everywhere.
- **All exact paths absolute or clearly relative to project root.**
