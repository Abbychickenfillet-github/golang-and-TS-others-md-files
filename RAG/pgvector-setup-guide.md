# pgvector 安裝與第一個 RAG 實驗 — 完整步驟

> **這份筆記記錄**：從零開始下載並使用 pgvector 向量資料庫的步驟。
>
> **目標**：跑起一個能存 / 查向量的 PostgreSQL，做第一次「向量相似度搜尋」實驗。
>
> **建立日期**：2026-05-04

---

## 0. pgvector 是什麼？

**pgvector = PostgreSQL 的擴充套件 (extension)**，讓 Postgres 支援向量資料型別 + 向量相似度搜尋。

⚠️ **它不是獨立軟體**：
- ❌ 沒有 `pgvector start` 這種指令
- ❌ 不能單獨執行
- ✅ 必須裝在 PostgreSQL 上才能用

### 核心能力

```sql
-- 啟用擴充
CREATE EXTENSION vector;

-- 建表（embedding 是 1536 維向量）
CREATE TABLE items (
  id bigserial PRIMARY KEY,
  embedding vector(1536)
);

-- 插入向量
INSERT INTO items (embedding) VALUES ('[0.1, 0.2, ..., 0.9]');

-- 找最相近的 5 個（用 <-> 運算子算 L2 距離）
SELECT * FROM items ORDER BY embedding <-> '[0.5, 0.5, ..., 0.5]' LIMIT 5;
```

### pgvector 支援的索引（呼應 [rag-vs-memory-comparison.md 0.5 節](../LLM-Memory/rag-vs-memory-comparison.md)）

| 索引 | pgvector 寫法 | 何時用 |
|------|--------------|--------|
| **Flat** | 不建 index（預設） | 資料 < 10 萬條 |
| **HNSW** | `CREATE INDEX ... USING hnsw (embedding vector_l2_ops)` | 主流選擇（10 萬~1000 萬） |
| **IVFFlat** | `CREATE INDEX ... USING ivfflat (embedding vector_l2_ops) WITH (lists = 100)` | 大型資料 + 接受近似 |

---

## 1. Image (Docker) vs git clone — 該下載哪個？

### 兩者差異

| | **git clone** | **Docker image** |
|---|---|---|
| 拿到的是 | 原始碼（C 語言 source） | 已 build 好的完整環境（含 Postgres + pgvector） |
| 比喻 | IKEA 零件包 + 說明書 | 已組好的家具 |
| 大小 | 數 MB | 數百 MB |
| 能直接執行嗎 | ❌ 要 build | ✅ `docker run` 立刻跑 |
| Windows 上難度 | ⚠️ 需 Visual Studio + Postgres dev headers | ✅ 裝好 Docker Desktop 就能用 |

### 何時用哪個

- ✅ **想用 pgvector 做 RAG** → Docker image
- ✅ **想研究 pgvector 內部實作（讀 C 語言原始碼）** → git clone
- ❌ ~~想在 Windows 從原始碼裝起來~~ → 折磨自己

### 結論

**這份筆記用 Docker image**。需要看 source 時再 `git clone https://github.com/pgvector/pgvector.git`。

---

## 2. 為什麼學 RAG 階段要用 Docker？

| 好處 | 說明 |
|------|------|
| **環境隔離** | 玩壞了不影響 production / 其他專案的 Postgres |
| **乾淨可拋棄** | `docker rm -f` 一鍵刪光，不留垃圾 |
| **跨平台一致** | Windows / Mac / Linux 跑出來一樣 |
| **不用裝 Postgres** | 本機完全不需要安裝任何資料庫軟體 |
| **不用 build pgvector** | 跳過編譯地獄 |
| **無限重來** | 學壞了就 `docker rm` + `docker run` |
| **多版本並存** | 想同時試 pg16 / pg17 沒衝突 |

→ **學習階段**：Docker 最安全
→ **生產階段**：才考慮跟 production 環境一致

---

## 3. 實際步驟（Windows + Docker Desktop）

### 前置：確認 Docker Desktop 已啟動

```powershell
docker --version
# 應該顯示 Docker version XX.XX.XX
```

如果沒裝：先去 <https://docs.docker.com/desktop/install/windows-install/> 下載安裝。

---

### Step 1：起一個 pgvector + Postgres 容器

```powershell
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5432:5432 `
  pgvector/pgvector:pg17
```

**參數解釋**：

| 參數 | 意思 |
|------|------|
| `-d` | 背景執行 (detached) |
| `--name pgvector-test` | 容器名稱（之後操作用得到） |
| `-e POSTGRES_PASSWORD=mysecret` | 設定密碼（必填，否則容器啟動失敗） |
| `-e POSTGRES_DB=test_rag` | 啟動時自動建立的資料庫名稱 |
| `-p 5432:5432` | 把容器的 5432 port 映射到本機 5432 |
| `pgvector/pgvector:pg17` | 官方 image：pgvector + Postgres 17 |

> 💡 **pg17 vs pg16？** Postgres 主版本，新版功能多但相容性較窄。學習用直接 `pg17`，與生產環境一致才考慮其他。

### Step 2：確認容器跑起來

```powershell
docker ps
# 應該看到 pgvector-test 在執行中

docker logs pgvector-test
# 看到 "database system is ready to accept connections" 表示 OK
```

### Step 3：連進去 Postgres

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

進入 psql 後會看到 prompt：

```
test_rag=#
```

### Step 4：啟用 pgvector 擴充

```sql
CREATE EXTENSION vector;
```

驗證：

```sql
\dx
-- 應該看到 vector 擴充已安裝
```

---

## 4. 第一個 RAG 實驗：向量相似度查詢

### 4.1 建立向量表

```sql
CREATE TABLE items (
  id bigserial PRIMARY KEY,
  description text,
  embedding vector(3)         -- 用 3 維方便理解（實際用 1536 維）
);
```

### 4.2 插入測試向量

```sql
INSERT INTO items (description, embedding) VALUES
  ('蘋果',   '[1, 0, 0]'),    -- 偏向「水果」
  ('香蕉',   '[0.9, 0, 0.1]'),-- 偏向「水果」
  ('狗',     '[0, 1, 0]'),    -- 偏向「動物」
  ('貓',     '[0, 0.9, 0.1]'),-- 偏向「動物」
  ('桌子',   '[0, 0, 1]');    -- 偏向「家具」
```

### 4.3 找最相近的：「跟蘋果最像的東西」

```sql
SELECT description, embedding <-> '[1, 0, 0]' AS distance
FROM items
ORDER BY distance
LIMIT 3;
```

預期結果：

```
 description | distance
-------------+----------
 蘋果        | 0
 香蕉        | 0.14...     ← 同樣偏「水果」軸，最相近
 桌子        | 1.41...
```

→ 這就是 **RAG 的「R (Retrieve)」核心動作**：給一個 query 向量，找最近的 N 個。

### 4.4 距離運算子三選一

| 運算子 | 距離類型 | 何時用 |
|--------|---------|--------|
| `<->` | **L2 (Euclidean) 距離** | 最常用、最直覺 |
| `<=>` | **Cosine 距離** | 文字 embedding 主流選擇 |
| `<#>` | **負內積 (Inner Product)** | 已正規化向量 |

```sql
-- Cosine 距離（OpenAI embedding 推薦）
SELECT description, embedding <=> '[1, 0, 0]' AS cos_dist
FROM items
ORDER BY cos_dist
LIMIT 3;
```

### 4.5 建 HNSW 索引加速（資料變多後必做）

```sql
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
-- vector_l2_ops 對應 <-> (L2)
-- vector_cosine_ops 對應 <=> (Cosine)
-- vector_ip_ops 對應 <#> (Inner Product)
```

→ 對應 [rag-vs-memory-comparison.md 0.5 節 HNSW 子節](../LLM-Memory/rag-vs-memory-comparison.md)

---

## 5. 連線方式整理

### 5.1 用 psql（命令列）

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

### 5.2 用 GUI 工具（推薦學習用）

| 工具 | 連線資訊 |
|------|---------|
| **DBeaver**（免費）| Host: `localhost`, Port: `5432`, User: `postgres`, Pwd: `mysecret`, DB: `test_rag` |
| **TablePlus** | 同上 |
| **pgAdmin** | 同上 |

### 5.3 用 Python（之後做 RAG 用）

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    user="postgres",
    password="mysecret",
    dbname="test_rag"
)
cur = conn.cursor()

# 用 OpenAI embedding 1536 維
cur.execute("""
    CREATE TABLE IF NOT EXISTS docs (
      id bigserial PRIMARY KEY,
      content text,
      embedding vector(1536)
    );
""")
conn.commit()
```

---

## 6. 進階：跟 OpenAI Embedding 整合

```python
from openai import OpenAI
import psycopg2

client = OpenAI(api_key="sk-...")

def embed(text: str) -> list[float]:
    """把文字轉成 1536 維向量"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding   # list[float], len=1536

# 存進 pgvector
conn = psycopg2.connect(...)
cur = conn.cursor()

texts = ["蘋果是水果", "狗是寵物", "桌子是家具"]
for text in texts:
    vec = embed(text)
    cur.execute(
        "INSERT INTO docs (content, embedding) VALUES (%s, %s)",
        (text, str(vec))
    )
conn.commit()

# 查詢：找跟「香蕉」最相近的
query_vec = embed("香蕉好吃")
cur.execute("""
    SELECT content, embedding <=> %s::vector AS distance
    FROM docs
    ORDER BY distance
    LIMIT 3
""", (str(query_vec),))

for row in cur.fetchall():
    print(row)
# 預期：「蘋果是水果」最近、「狗是寵物」次之、「桌子是家具」最遠
```

---

## 7. 容器管理常用指令

```powershell
# 查看執行中的容器
docker ps

# 查看所有容器（含已停止）
docker ps -a

# 看容器 log
docker logs pgvector-test

# 即時監看 log
docker logs -f pgvector-test

# 停止容器
docker stop pgvector-test

# 重新啟動
docker start pgvector-test

# 進入容器內部 shell
docker exec -it pgvector-test bash

# 砍掉容器（⚠️ 資料會消失）
docker rm -f pgvector-test

# 看容器資源使用
docker stats pgvector-test
```

---

## 8. 資料持久化（避免 docker rm 後資料消失）

預設情況下，刪掉容器資料就消失了。要保留資料的做法：

```powershell
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5432:5432 `
  -v pgvector_data:/var/lib/postgresql/data `   # ← 多這一行
  pgvector/pgvector:pg17
```

`-v pgvector_data:/var/lib/postgresql/data` 把資料庫檔案存到 Docker 管理的 named volume `pgvector_data`，**容器刪了資料還在**。

下次再起容器時用同樣的 volume name → 自動接續資料。

---

## 9. 我的 test-RAG 是現有 Postgres 還是 Docker？

兩條路都可以。**判斷流程**：

```
你的 test-RAG 在哪？
  │
  ├── 在 Zeabur / Supabase / Railway 等雲端
  │   └── 進去 SQL 執行：
  │       SELECT * FROM pg_available_extensions WHERE name = 'vector';
  │       │
  │       ├── 有結果 → CREATE EXTENSION vector;  ← 直接用！
  │       └── 沒結果 → 雲端不支援，用 Docker
  │
  ├── 在本機 Postgres
  │   └── 通常沒裝 pgvector → 用 Docker 簡單
  │
  └── 還沒開
      └── 直接用 Docker（這份筆記的方式）
```

---

## 10. 常見錯誤排雷

| 錯誤訊息 | 原因 | 解法 |
|----------|------|------|
| `extension "vector" is not available` | Postgres 沒裝 pgvector | 換到 pgvector image 或裝 extension |
| `port is already allocated` | 5432 已被佔用 | 改用 `-p 5433:5432` 或停掉佔用的服務 |
| `password authentication failed` | 密碼錯 | 確認 `-e POSTGRES_PASSWORD` 跟連線時一致 |
| `connection refused` | 容器沒起來 / 還沒 ready | `docker logs` 看狀態，或等 5 秒重試 |
| `dimension mismatch` | 插入向量維度跟欄位定義不符 | `vector(3)` 就只能插 3 維 |

---

## 11. 下一步學什麼？

完成這份 setup 後，建議的學習路徑：

1. **這份**：跑起 pgvector，做第一次相似度查詢 ✅
2. **接 OpenAI embedding**：用真實 1536 維向量做查詢
3. **學 chunking**：怎麼把長文章切片
4. **整合 LLM**：寫第一個 RAG（文件 → embed → store → query → LLM 生成）
5. **加索引**：資料變多後建 HNSW，看速度差異
6. **進階主題**：reranker、hybrid search（BM25 + vector）

---

## 相關筆記

- [../LLM-Memory/rag-vs-memory-comparison.md](../LLM-Memory/rag-vs-memory-comparison.md) — RAG / Memory 概念對照（Layer 5）
- [../LLM-Memory/ml-skill-tree-hierarchy.md](../LLM-Memory/ml-skill-tree-hierarchy.md) — ML 技能樹（pgvector 在 Layer 4 工具）
- [../LLM-Memory/ml-supervised-vs-unsupervised.md](../LLM-Memory/ml-supervised-vs-unsupervised.md) — ML 三大類別
- [../docker/docker-compose-ps-and-unix-ps.md](../docker/docker-compose-ps-and-unix-ps.md) — docker 指令對照

---

## 官方資源

- **pgvector GitHub**：<https://github.com/pgvector/pgvector>
- **官方 Docker Hub**：<https://hub.docker.com/r/pgvector/pgvector>
- **Postgres 官方文件**：<https://www.postgresql.org/docs/>
- **OpenAI Embedding API**：<https://platform.openai.com/docs/guides/embeddings>
