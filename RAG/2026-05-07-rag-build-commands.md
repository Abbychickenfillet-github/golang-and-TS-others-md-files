# RAG 系統建置指令記錄

**用途**：對應 `2026-05-07-rag-implementation-plan.md`，記錄每個 Task 實際跑過的指令、為什麼這樣跑、預期看到什麼。

> 從零重蓋一次的話，照這份從上到下打就行。
> 看不懂某個指令的時候，回來查這份。

---

## 為什麼 TDD 的「失敗」階段這麼重要

```
🔴 RED 階段
   ↓ 寫測試
   ↓ 跑測試 → 看到失敗
   ↓ 因為 chunker.py 還沒寫，所以理所當然失敗
   ↓ ★ 這個失敗很重要！它證明「測試真的會 catch 問題」 ★
```

### 沒看到失敗 = 測試可能根本沒在驗證

想像兩種情境：

**情境 A**：先寫程式 → 寫測試 → 一寫就過

```python
def add(a, b):
    return a + b   # 程式

def test_add():
    assert add(2, 3) == 5   # 測試
```

測試過了。**但你怎麼知道這個測試是真的在驗證？**

可能你不小心寫成 `assert add(2, 3) == 5 or True` —— 永遠回傳 True 的測試也會「過」。可能你 import 錯模組，測的根本不是你以為的函式。可能 assert 被 try/except 吞掉，沒拋出來。

**測試從沒失敗過，你就沒有它真的會 catch 錯誤的證據。**

**情境 B**：先寫測試 → 跑 → 看到失敗 → 寫程式 → 跑 → 看到通過

```
第一次跑：ImportError: cannot import name 'add'   ← 失敗，預期之內
寫完 add.py
第二次跑：1 passed                                 ← 通過
```

這個失敗 → 通過的轉變，**親眼證明了測試是有效的警報器**：當被測的東西還沒實作 → 警報響；實作對了 → 警報停。

### 比喻：火災警報器

你裝了煙霧偵測器，從來沒響過。它真的會響嗎？還是電池早就壞了？

唯一驗證方法 → 用打火機在底下燒一下衛生紙（製造煙）→ 警報響 → 證實偵測器正常 → 之後它沒響時你才能放心是「真的沒火」。

**TDD 的 RED 階段就是「燒衛生紙」**：故意製造失敗，確認警報會響。

### 規則

- 寫了測試但「一寫就過」 → 重寫，先確認看得到失敗
- 修 bug 時：先寫一個能重現 bug 的測試 → 看到失敗 → 修 bug → 看到通過
- 別跳過 RED 階段。沒它你不知道 GREEN 是真的綠還是假的綠

---

## 全部指令（按 Task 順序）

### 環境前置

```powershell
# 確認 Docker Desktop 開著
docker ps
# 預期：列出現有 container（如果有），或空表頭。不能有「cannot find pipe」錯誤。

# 確認 Python 3.13 在 PATH
python --version
# 預期：Python 3.13.x
```

---

### Task 1：建專案骨架

```powershell
# 1. 建資料夾
cd C:\coding\futuresign
New-Item -ItemType Directory -Path abby-notes-rag\src,abby-notes-rag\scripts,abby-notes-rag\tests,abby-notes-rag\notebooks,abby-notes-rag\data

# 2-3. 寫 .gitignore 和 README.md（內容見 plan Task 1）

# 4. 初始化 git
cd C:\coding\futuresign\abby-notes-rag
git init
git add .gitignore README.md
git commit -m "chore: initial project scaffold"
```

**預期**：`git log --oneline` 看到一個 commit。

---

### Task 2：建 venv + 裝套件

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1. 建虛擬環境
python -m venv venv
# 預期：產生 venv\ 資料夾

# 2. 確認 venv 的 python 能跑
.\venv\Scripts\python.exe --version
# 預期：Python 3.13.x

# 3. 寫 requirements.txt（9 個套件，內容見 plan Task 2）

# 4. 升級 pip + 裝套件
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
# 預期：Successfully installed ...（會拖 torch ~2GB，5-15 分鐘）

# 5. Smoke test：所有套件能 import
.\venv\Scripts\python.exe -c "import sentence_transformers, langchain_text_splitters, psycopg2, pgvector, dotenv, tiktoken, yaml, pytest; print('OK')"
# 預期：印出 OK
# 噴錯對照：
#   ModuleNotFoundError: No module named 'xxx'  → pip install 沒裝完，重跑
#   ImportError: DLL load failed                → Python 版本與套件版本不匹配（罕見）

# 6. Commit
git add requirements.txt
git commit -m "chore: pin python dependencies"
```

> ⚠️ **注意**：Subagent 跑 pip install 第一次中途超時。如果發生，直接重跑 `pip install -r requirements.txt`，已下載的 wheel 會從 cache 取用，很快補完。

---

### Task 3：起 Docker pgvector

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1-3. 寫 docker-compose.yml + .env.example（內容見 plan Task 3）

# 4. 複製 .env
Copy-Item .env.example .env

# 5. 啟動 container
docker compose up -d
# 預期：✔ Container abby-rag-postgres Started
# 第一次會 pull pgvector/pgvector:pg17 image (~400MB)

# 6. 等 healthy
docker compose ps
# 預期：STATUS = Up X seconds (healthy)
# 如果是 (starting)，等 5 秒再看一次

# 7. 確認 pgvector extension 可用
docker exec abby-rag-postgres psql -U abby -d abby_rag -c "SELECT name FROM pg_available_extensions WHERE name='vector';"
# 預期：
#  name
# --------
#  vector
# (1 row)
# 注意：plan 原本寫 extname，但正確欄位名是 name

# 8. Commit
git add docker-compose.yml .env.example
git commit -m "feat: add pgvector docker compose"
# .env 不要 commit（已 gitignored）
```

**檢查 container**：
```powershell
docker ps                                    # 看 abby-rag-postgres 在跑
docker logs abby-rag-postgres --tail 20      # 看 Postgres 啟動 log
docker exec -it abby-rag-postgres psql -U abby -d abby_rag   # 進入 psql
# 在 psql 內：
#   \dt        ← 列出表（目前還沒有）
#   \q         ← 離開
```

---

### Task 4：建 DB schema

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1-2. 寫 scripts\init_db.sql 和 scripts\init_db.py（內容見 plan Task 4）

# 3. 跑建表腳本
.\venv\Scripts\python.exe scripts\init_db.py
# 預期：Schema applied successfully.
# 噴錯對照：
#   psycopg2.OperationalError: could not connect → Docker 沒跑或 .env 設定錯
#   KeyError: 'POSTGRES_HOST'                    → .env 沒讀到

# 4. 驗證表跟索引
docker exec abby-rag-postgres psql -U abby -d abby_rag -c "\d chunks"
# 預期：9 個欄位，最重要的是 embedding | vector(1024)

docker exec abby-rag-postgres psql -U abby -d abby_rag -c "\di chunks*"
# 預期：5 個索引（pkey、embedding hnsw、file_path btree、content gin fts、unique constraint）

# 5. Commit
git add scripts/init_db.sql scripts/init_db.py
git commit -m "feat: add chunks table schema with hnsw + fts indexes"
```

---

### Task 5：寫 Config 設定中心

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1-2. 寫 src\__init__.py（空檔）和 src\config.py（內容見 plan Task 5）

# 3. Smoke test：能 import + 讀到值
.\venv\Scripts\python.exe -c "from src.config import Config; print(Config.POSTGRES_HOST, Config.POSTGRES_PORT, Config.EMBEDDING_MODEL, Config.NOTES_ROOT, Config.dsn())"
# 預期：
# localhost 5433 BAAI/bge-m3 C:\coding\futuresign\Abby-notes host=localhost port=5433 user=abby password=abby_local dbname=abby_rag
# 噴錯對照：
#   ModuleNotFoundError: No module named 'src'  → 沒 cd 到專案根目錄
#   KeyError: 'POSTGRES_HOST'                   → .env 不存在或 load_dotenv() 沒呼叫
#   ValueError: invalid literal for int()       → .env 裡的 PORT 寫錯

# 4. Commit
git add src/__init__.py src/config.py
git commit -m "feat: add Config class for env-driven settings"
```

---

### Task 6：寫 Chunker（TDD 第一次出現）

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1-2. 寫 tests\__init__.py（空檔）和 tests\test_chunker.py（5 個測試，內容見 plan Task 6）

# 3. 🔴 RED 階段：跑測試，看到失敗
.\venv\Scripts\python.exe -m pytest tests\test_chunker.py -v
# 預期：5 errors, ImportError: cannot import name 'Chunk'
# ★ 這個失敗是好事，證明測試會 catch「程式不存在」這個問題 ★

# 4. 寫 src\chunker.py（內容見 plan Task 6）

# 5. 🟢 GREEN 階段：再跑測試，看到全過
.\venv\Scripts\python.exe -m pytest tests\test_chunker.py -v
# 預期：5 passed in X.XXs

# 6. Commit
git add src/chunker.py tests/__init__.py tests/test_chunker.py
git commit -m "feat: markdown header-aware chunker with token-bounded splits"
```

**親手玩 chunker**（學到 chunk 切出來長什麼樣）：

```powershell
.\venv\Scripts\python.exe
```

在 Python REPL 內：
```python
from src.chunker import chunk_markdown

# 讀一個你的筆記
with open(r"C:\coding\futuresign\Abby-notes\RAG\pgvector-setup-guide.md", encoding="utf-8") as f:
    md = f.read()

chunks = chunk_markdown(md)

print(f"切出 {len(chunks)} 個 chunks")
for i, c in enumerate(chunks):
    print(f"\n--- Chunk {i} (tokens={c.token_count}) ---")
    print(f"位置: {c.heading_path}")
    print(f"內容前 200 字: {c.content[:200]}")

exit()
```

---

## 每個 Task 結束後的健康檢查清單

在進下一個 Task 前，確認這些都過：

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1. Docker 還活著
docker ps | Select-String abby-rag-postgres
# 預期：看到 (healthy)

# 2. venv Python 能跑
.\venv\Scripts\python.exe --version
# 預期：Python 3.13.x

# 3. 所有測試還是綠的
.\venv\Scripts\python.exe -m pytest -v
# 預期：所有測試 passed

# 4. Git 沒有未 commit 的東西（除非你正在改）
git status
# 預期：working tree clean

# 5. Commit 歷史乾淨
git log --oneline
# 預期：每個 Task 一個 commit，訊息符合 conventional commits 格式
```

---

## 常用維運指令

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 停 Docker（會保留 data/ 裡的資料）
docker compose stop

# 起 Docker
docker compose up -d

# 看 Postgres log
docker logs abby-rag-postgres --tail 50

# 進 Postgres 互動 shell
docker exec -it abby-rag-postgres psql -U abby -d abby_rag

# 看 chunks 數量
docker exec abby-rag-postgres psql -U abby -d abby_rag -c "SELECT COUNT(*) FROM chunks;"

# 完全砍掉重建（data/ 也清掉）
docker compose down -v
Remove-Item -Recurse -Force .\data
docker compose up -d
.\venv\Scripts\python.exe scripts\init_db.py
```

---

### Task 7：Embedder（bge-m3 包裝層，TDD 第二次）

```powershell
cd C:\coding\futuresign\abby-notes-rag

# 1. 寫 tests\test_embedder.py（3 個 smoke test，內容見 plan Task 7 Step 1）

# 2. 🔴 RED 階段：跑測試，看到 ImportError
.\venv\Scripts\python.exe -m pytest tests\test_embedder.py -v
# 預期：ImportError: cannot import name 'Embedder' from 'src.embedder'
# ★ 這次失敗證明：測試真的會 catch「embedder 還沒寫」這個問題 ★

# 3. 寫 src\embedder.py（內容見 plan Task 7 Step 3）

# 4. 預下載 bge-m3 模型（建議先做，避免測試 timeout）
.\venv\Scripts\python.exe -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
# 預期：下載 ~3.2GB 到 C:\Users\User\.cache\huggingface\hub\models--BAAI--bge-m3\
#       第一次會跑 5-15 分鐘（取決於網速）
#       中途斷掉再跑會 resume，已下載的檔案不會重抓
# 噴錯對照：
#   OSError: We couldn't connect to 'https://huggingface.co' → 網路問題或 HF 暫掛
#   No space left on device                                  → 磁碟空間不足，需 ~4GB

# 5. 🟢 GREEN 階段：跑測試，看到全過
.\venv\Scripts\python.exe -m pytest tests\test_embedder.py -v
# 預期：3 passed in ~16s（模型已 cache，載 model 約 5-10 秒 + 推論秒級）
# 第一次沒預下載的話：5-15 分鐘（含下載）

# 6. Commit
git add src/embedder.py tests/test_embedder.py
git commit -m "feat: bge-m3 embedder wrapper with batch encode"
```

**親手玩 embedder**（學 cosine similarity）：

```powershell
.\venv\Scripts\python.exe
```

```python
from src.embedder import Embedder
import numpy as np

e = Embedder()  # 等 5-10 秒載 model

v1 = e.encode_one("Docker 容器啟動失敗")
v2 = e.encode_one("Docker container 無法啟動")
v3 = e.encode_one("烤蛋糕食譜")

# 向量已規一化，dot product == cosine similarity
print("中英同義:", float(np.dot(v1, v2)))   # 預期 > 0.6（語意相近）
print("無關主題:", float(np.dot(v1, v3)))   # 預期 < 0.4（語意遙遠）

print("向量長度:", v1.shape)               # (1024,)
print("資料型別:", v1.dtype)               # float32
exit()
```

**重點概念**：
- `BAAI/bge-m3` 是中英混合 + 技術詞彙友善的 embedding model，1024 維、最大 8192 token context
- `normalize_embeddings=True` 把向量長度規一化成 1，使 cosine similarity 可以用 `np.dot(v1, v2)` 直接算
- 模型檔案放在 HuggingFace global cache，**不在 venv 裡**——換虛擬環境也共用同一份模型，省磁碟

---

## 待續

Task 8（DB Module）開始把 chunk + embedding 寫進 pgvector。後續指令補上。
