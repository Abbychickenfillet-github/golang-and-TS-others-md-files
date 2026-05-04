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

#### 整體結構速覽

```
docker run                    ← 1. 指令本體
-d                            ← 2. 執行模式
--name pgvector-test          ← 3. 容器名字
-e VAR=value                  ← 4. 環境變數（兩個）
-p 5432:5432                  ← 5. port 映射
pgvector/pgvector:pg17        ← 6. image 名字（沒 dash 前綴的就是它）
```

末尾的反引號 `` ` `` 是 **PowerShell 的換行字元**（等同 bash 的 `\`、CMD 的 `^`）。後面**不能有空格**，否則被當字面字元。

#### 參數逐一拆解

##### 1. `docker run` —— 指令本體

| | docker run | docker exec |
|---|------------|-------------|
| 動作 | **建一個新容器並啟動** | 在**已存在且執行中**的容器內**跑指令** |
| 第一次 | ✅ 用這個 | ❌ 容器還沒建 |
| 之後互動 | ❌ 會建第二個容器 | ✅ 用這個進去 |

→ **第一次** 用 `docker run`（建容器）；**之後想進去**用 `docker exec`。

##### 2. `-d` —— **d**etached（背景執行）

| 沒寫 `-d` | 加了 `-d` |
|---------|----------|
| PowerShell 卡在這、一直印 log，Ctrl+C 會把容器停掉 | 立刻回到 prompt，容器在背景跑，要看 log 用 `docker logs` |

→ **學習 / 使用**幾乎都加 `-d`，**只有想看即時 log debug** 才不加。

##### 3. `--name pgvector-test` —— 容器名字

| 沒寫 `--name` | 加了 `--name` |
|---------|----------|
| Docker 給隨機名（如 `quirky_einstein`），操作要用容器 ID（一串亂碼） | 之後操作可以用名字：`docker stop pgvector-test` |

⚠️ 名字必須**獨一無二**，已存在同名容器會報錯。

##### 4. `-e VAR=value` —— **e**nv（環境變數）

`-e` 出現兩次，傳兩個環境變數進容器：

###### `-e POSTGRES_PASSWORD=mysecret`

- **POSTGRES_PASSWORD** 是 Postgres 官方 image 規定的環境變數
- **必填**！沒寫會啟動失敗：
  ```
  Error: Database is uninitialized and superuser password is not specified.
         You must specify POSTGRES_PASSWORD ...
  ```
- `mysecret` = 你定的密碼（之後連線要用這個）

⚠️ 學習用 `mysecret` 沒問題，**正式環境不要**——要用更強的密碼。

###### `-e POSTGRES_DB=test_rag`

- 容器啟動時**自動建立**一個叫 `test_rag` 的資料庫
- **可選**——沒寫的話只有預設的 `postgres` 資料庫

| 沒寫 `POSTGRES_DB` | 寫了 `POSTGRES_DB=test_rag` |
|---|---|
| 進去後只有 `postgres`、`template0`、`template1` | 多一個 `test_rag` 自動建好 |
| 想要 `test_rag` 要自己 `CREATE DATABASE test_rag;` | 省一步 |

###### Postgres image 還支援的其他環境變數

| 變數 | 作用 |
|------|------|
| `POSTGRES_PASSWORD` | 密碼（必填）|
| `POSTGRES_DB` | 啟動時建的 DB 名 |
| `POSTGRES_USER` | superuser 名字（預設 `postgres`） |
| `POSTGRES_INITDB_ARGS` | 傳給 initdb 的額外參數 |

##### 5. `-p 5432:5432` —— **p**ort 映射（最容易搞錯）

| 格式 | `<host_port>:<container_port>` |
|------|-------------------------------|

```
你的 Windows                     Docker 容器
  │                                  │
  │   localhost:5432  ─────────►   :5432
  │      ▲ 本機 port               ▲ 容器內 Postgres 在聽的 port
  │      │                          │
  │      └───── 透過 -p 映射 ───────┘
  │
  DBeaver / Python 連到 localhost:5432
  → Docker 自動轉發到容器的 5432 → Postgres 收到
```

| 沒寫 `-p` | 加了 `-p 5432:5432` |
|---------|----------------------|
| 容器內 Postgres 跑得好好的，**但你從外面連不到** | 從本機 5432 能連到容器內 Postgres |

###### 為什麼是 `5432:5432`？

- 5432 是 **Postgres 的預設 port**（業界慣例）
- 容器內也是 5432（pgvector image 內建這樣）
- 兩邊一樣，所以寫 `5432:5432`

###### 如果本機 5432 被佔用了？

例如你已有別的 Postgres 佔了 5432：

```
Error: bind: address already in use
```

**解法**：左邊改成別的 port：

```powershell
-p 5433:5432
   ▲    ▲
   │    └── 容器內還是 5432（不能改，Postgres 只聽這個）
   │
   └── 本機改成 5433（你連線時用 5433）
```

連線時就用 `localhost:5433`。

##### 6. `pgvector/pgvector:pg17` —— image 名字

```
pgvector / pgvector : pg17
   ▲         ▲        ▲
   │         │        └── 標籤 tag（哪個版本）
   │         └── image 名字
   └── repo / 組織名字
```

**從 Docker Hub 拉**：<https://hub.docker.com/r/pgvector/pgvector>

**tag 選擇**：

```
pgvector/pgvector:pg17     ← Postgres 17（最新主版本）
pgvector/pgvector:pg16     ← Postgres 16
pgvector/pgvector:pg15     ← Postgres 15
pgvector/pgvector:latest   ← 最新（可能不穩定，不建議）
```

→ 一般用具體版本（`pg17`），**不要**用 `latest`（明天可能變另一個版本）。

**第一次跑**會自動從 Docker Hub 下載 image（約 400MB），第二次以後從本機快取啟動。

---

### Step 2：確認容器跑起來

```powershell
docker ps
# 應該看到 pgvector-test 在執行中

docker logs pgvector-test
# 看到 "database system is ready to accept connections" 表示 OK
```

#### 參數解釋

##### `docker ps` —— **p**rocess list（執行中的容器）

| 寫法 | 意思 |
|------|------|
| `docker ps` | 只看執行中的容器 |
| `docker ps -a` | 看**所有**容器（含已停止的） |
| `docker ps -q` | 只列 container ID（可以 pipe 給其他指令） |

##### `docker logs <name>` —— 看容器 log

| 寫法 | 意思 |
|------|------|
| `docker logs pgvector-test` | 印目前所有 log |
| `docker logs -f pgvector-test` | **f**ollow（即時跟蹤新 log，類似 `tail -f`） |
| `docker logs --tail 50 pgvector-test` | 只看最後 50 行 |
| `docker logs --since 10m pgvector-test` | 看最近 10 分鐘 |

---

### Step 3：連進去 Postgres

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

進入 psql 後會看到 prompt：

```
test_rag=#
```

#### 參數逐一拆解

##### 整體結構

```
docker exec   -it   pgvector-test   psql   -U postgres   -d test_rag
   ▲          ▲       ▲             ▲       ▲              ▲
   1          2       3             4       5              6
```

##### 1. `docker exec` —— 在「已執行」的容器內執行指令

跟 `docker run` 的差異前面講過：`run` 是「建新容器」，`exec` 是「在已建好且執行中的容器內跑指令」。

##### 2. `-it` —— interactive + tty

合在一起的兩個 flag：

| 旗標 | 縮寫展開 | 作用 |
|------|---------|------|
| `-i` | **i**nteractive | 保持 stdin 打開（讓你能輸入指令）|
| `-t` | **t**ty | 配一個終端機（讓畫面能正常顯示）|

⚠️ **這個 `-i` 不是 grep 的 ignore case，也不是 sed 的 in-place**——是 docker 的 interactive。同字母在不同指令意義不同（詳見 [`../CLI/cli-flag-meaning-conflicts.md`](../CLI/cli-flag-meaning-conflicts.md)）。

###### 沒 `-it` 會怎樣？

```bash
docker exec pgvector-test psql -U postgres
# 進去後 psql 啟動，但你打字看不到 prompt，按 Enter 沒反應
# 因為沒給 terminal，psql 不知道怎麼跟你互動
```

加 `-it` 後正常進入 psql prompt。

##### 3. `pgvector-test` —— 哪個容器

就是你 `docker run --name` 取的名字。

##### 4. `psql` —— 容器內要執行的指令

`psql` = **P**ost**g**re**S**Q**L** 的官方命令列客戶端。pgvector image 內已內建。

##### 5. `-U postgres` —— psql 的 **U**ser flag（不是 docker 的）

`postgres` 是預設 superuser，由 image 自動建立。

##### 6. `-d test_rag` —— psql 的 **d**atabase flag

直接連進 `test_rag` 這個 DB。沒寫的話會連到跟使用者同名的 DB（`postgres`），之後要 `\c test_rag` 切過去。

##### psql 其他常用 flag

```bash
psql -U postgres                    # 用 postgres 使用者
psql -U postgres -d test_rag        # 連到 test_rag 這個 DB
psql -U postgres -h localhost       # 指定 host
psql -U postgres -p 5432            # 指定 port
psql -U postgres -W                 # 強制要求輸密碼
psql -U postgres -c "SELECT 1"      # 直接執行 SQL 不進 prompt
```

---

### Step 4：啟用 pgvector 擴充

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### `IF NOT EXISTS` 的作用

| 寫法 | 第二次執行 |
|------|----------|
| `CREATE EXTENSION vector;` | ❌ 報錯 `already exists` |
| `CREATE EXTENSION IF NOT EXISTS vector;` | ✅ 沒事，已存在就跳過 |

→ **建議都加 `IF NOT EXISTS`**，重複執行不會壞事。

#### 驗證

```sql
\dx
-- 應該看到 vector 擴充已安裝
```

`\dx` = **d**escribe e**x**tensions（psql 的 meta-command，列出所有擴充）。

##### psql 其他常用 meta-command

| 指令 | 縮寫展開 | 作用 |
|------|---------|------|
| `\l` | **l**ist databases | 列出所有資料庫 |
| `\c <db>` | **c**onnect | 切換到某個 DB |
| `\dt` | **d**escribe **t**ables | 列出當前 DB 的所有 table |
| `\d <table>` | **d**escribe | 看某個 table 的結構 |
| `\dx` | **d**escribe e**x**tensions | 列出所有擴充 |
| `\du` | **d**escribe **u**sers | 列出所有使用者 |
| `\q` | **q**uit | 離開 psql |
| `\?` | help | 看所有 meta-command |
| `\h <SQL>` | **h**elp on SQL | 看某個 SQL 語法說明 |

##### ⚠️ 第一次嘗試 `CREATE EXTENSION vector;` 報錯怎麼辦？

| 錯誤訊息 | 原因 | 解法 |
|----------|------|------|
| `ERROR: extension "vector" is not available` | 連到的 Postgres **沒裝 pgvector** | 換成 pgvector image / 雲端 Postgres |
| `ERROR: permission denied to create extension` | 沒有 superuser 權限 | 用 `postgres` 使用者連 |
| `ERROR: extension "vector" already exists` | 已建過 | 加 `IF NOT EXISTS` 或忽略 |

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
