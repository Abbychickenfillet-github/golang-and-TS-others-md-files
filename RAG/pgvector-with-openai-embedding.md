# 接 OpenAI Embedding API 到 pgvector — 從手寫向量升級到真 1536-dim

> **這份筆記回答**：
> 1. API / Model / SDK 三個概念差在哪？
> 2. 怎麼從手寫 3-dim 測試值升級成真實 1536-dim embedding？
> 3. 完整可跑的 Python 程式碼？
> 4. OpenAI Embedding 怎麼算錢？
> 5. 沒有 OpenAI API 怎麼辦（本地替代方案）？
>
> **建立日期**：2026-05-05
>
> **前置條件**：已完成 [pgvector-setup-guide.md](pgvector-setup-guide.md)（容器跑起來 + `CREATE EXTENSION vector;`）

---

## 0. 概念釐清：Model / API / SDK 差在哪？

```
你的 Python 程式
       │
       │ 用 SDK 呼叫
       ▼
OpenAI SDK (openai package)
       │
       │ 發 HTTPS 請求到
       ▼
OpenAI API endpoint   https://api.openai.com/v1/embeddings
       │
       │ 後端執行
       ▼
Embedding Model       text-embedding-3-small 神經網路
       │
       │ 回傳
       ▼
1536 維向量 [0.012, -0.034, ..., 0.089]
```

| 層級 | 是什麼 | 例子 |
|------|-------|------|
| **Model**（模型）| 神經網路本體（權重）| `text-embedding-3-small` |
| **API** | 對外的 HTTP 接口 | `POST https://api.openai.com/v1/embeddings` |
| **SDK** | 程式套件（包好 API 呼叫）| Python: `openai`、Node.js: `openai` |

→ **OpenAI Embedding API ≈ Embedding model**——API 是「跑 model 的服務管道」，你不用自己 GPU 跑模型。

---

## 1. OpenAI 的 Embedding Model 選擇

| Model | 維度 | 價錢 / 100 萬 tokens | 適用 |
|-------|------|--------------------|------|
| **`text-embedding-3-small`** ★ | **1536** | **$0.02** | 主流，CP 值最高 |
| `text-embedding-3-large` | 3072 | $0.13 | 最佳品質 |
| `text-embedding-ada-002` | 1536 | $0.10 | 舊版，**不要用** |

**幾乎所有 RAG 專案都用 `text-embedding-3-small`**——夠好、便宜、1536 維剛好。

### 成本實感

| 規模 | tokens | 費用 |
|------|--------|------|
| 100 篇短文（每篇 100 字）| ~10K | $0.0002（不到 0.01 台幣）|
| 1000 篇 1000 字文章 | ~1M | **$0.02**（< 1 台幣）|
| 整本《紅樓夢》（80 萬字 ≈ 1M tokens）| 1M | **$0.02** |
| 100 萬篇 1000 字文章 | 1B | $20 |

→ **不會破產**，學習階段花不到 $1 美金。

---

## 2. 取得 OpenAI API Key

### 步驟

1. 去 <https://platform.openai.com/api-keys>
2. 登入 / 註冊（用 Google 帳號最快）
3. 點 **"Create new secret key"**
4. 複製出來的 key（**只能看一次**！）—— 格式：`sk-proj-xxxxxxxx...`
5. 充值至少 **$5 美金**（去 Billing → Add credit balance）—— 不充無法用 API

### ⚠️ Key 安全注意

- ✅ 放進 `.env`（記得加進 `.gitignore`）
- ❌ **絕對不要 commit 到 git**
- ❌ 不要貼到 ChatGPT / 公開 issue 詢問
- 萬一外洩立刻去 OpenAI dashboard **revoke**

---

## 3. 安裝 Python 套件

```powershell
# 在你的 Python 環境
pip install openai psycopg2-binary python-dotenv
```

| 套件 | 用途 |
|------|------|
| `openai` | OpenAI 官方 SDK |
| `psycopg2-binary` | Python 連 Postgres 的驅動（純 binary 版，不用編譯）|
| `python-dotenv` | 讀 `.env` 檔 |

---

## 4. 環境變數設定

建一個 `.env` 檔（放在你的 Python 專案根目錄）：

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# 連 Docker pgvector 容器（注意 port 是 5433）
DATABASE_URL=postgresql://postgres:mysecret@localhost:5433/test_rag
```

⚠️ **加進 `.gitignore`**：

```bash
# .gitignore
.env
.env.local
```

---

## 5. 第一個範例：embed 一段文字看看

```python
# embed_test.py
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.embeddings.create(
    model="text-embedding-3-small",
    input="蘋果是水果"
)

vec = response.data[0].embedding
print(f"維度：{len(vec)}")           # 1536
print(f"前 5 個值：{vec[:5]}")        # [0.012, -0.034, 0.056, ...]
print(f"花了多少 tokens：{response.usage.total_tokens}")  # 5 之類
```

執行：

```powershell
python embed_test.py
```

預期輸出：

```
維度：1536
前 5 個值：[-0.0058, 0.0312, -0.0091, 0.0045, 0.0173]
花了多少 tokens：5
```

✅ **能看到 1536 個小數字 = embedding 出來了**。

---

## 6. 重建 pgvector 表（改成 1536 dim）

進 psql：

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

執行：

```sql
-- 砍掉舊的 3-dim 測試表
DROP TABLE IF EXISTS items;

-- 建新的 1536-dim 表
CREATE TABLE items (
  id bigserial PRIMARY KEY,
  description text,
  embedding vector(1536)        -- ← 從 3 改成 1536
);

-- 確認
\d items
```

---

## 7. 完整流程：文字 → embed → 存 → 查

### 7.1 存資料：把幾段文字 embed 後存進 pgvector

```python
# insert_with_embedding.py
from openai import OpenAI
from dotenv import load_dotenv
import psycopg2
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()


def embed(text: str) -> list[float]:
    """把一段文字轉成 1536 維向量"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


# 5 段測試文字
texts = [
    "蘋果是一種水果，紅色或綠色，甜脆多汁。",
    "香蕉是黃色長條形的熱帶水果，富含鉀。",
    "狗是人類最忠實的朋友，是一種寵物。",
    "貓喜歡睡覺，擅長抓老鼠，也是常見寵物。",
    "桌子是家具，可以放東西、寫字、吃飯。",
]

for text in texts:
    vec = embed(text)
    cur.execute(
        "INSERT INTO items (description, embedding) VALUES (%s, %s)",
        (text, str(vec))     # ← 注意：要 str() 把 list 變成 pgvector 認的格式
    )
    print(f"✅ 存好：{text[:20]}...")

conn.commit()
cur.close()
conn.close()
print("全部完成！")
```

執行：

```powershell
python insert_with_embedding.py
```

### 7.2 查資料：把 query 也 embed，找最相近的

```python
# search_with_embedding.py
from openai import OpenAI
from dotenv import load_dotenv
import psycopg2
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()


def embed(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


# 你的查詢
query = "我想吃水果"
query_vec = embed(query)

# 用 cosine 距離找最相近的 3 個（OpenAI embedding 推薦 cosine）
cur.execute("""
    SELECT description, embedding <=> %s::vector AS distance
    FROM items
    ORDER BY distance
    LIMIT 3
""", (str(query_vec),))

print(f"查詢：「{query}」")
print("最相近的 3 個：")
for desc, dist in cur.fetchall():
    print(f"  距離 {dist:.4f}：{desc}")

cur.close()
conn.close()
```

執行：

```powershell
python search_with_embedding.py
```

預期輸出：

```
查詢：「我想吃水果」
最相近的 3 個：
  距離 0.5421：蘋果是一種水果，紅色或綠色，甜脆多汁。
  距離 0.5733：香蕉是黃色長條形的熱帶水果，富含鉀。
  距離 0.7892：狗是人類最忠實的朋友，是一種寵物。
```

🎉 **看吧！「我想吃水果」自動找到「蘋果」「香蕉」最相近**——這就是 RAG 的「**R（Retrieve）**」。

---

## 8. 三種距離運算子實測對照

```python
# search_three_distances.py
# 同一個 query，分別用三種距離找 top 3
import psycopg2, os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

query_vec = client.embeddings.create(
    model="text-embedding-3-small",
    input="我想吃水果"
).data[0].embedding

operators = [
    ("L2 距離", "<->", "vector_l2_ops"),
    ("Cosine", "<=>", "vector_cosine_ops"),
    ("負內積", "<#>", "vector_ip_ops"),
]

for name, op, _ in operators:
    print(f"\n=== {name} ({op}) ===")
    cur.execute(f"""
        SELECT description, embedding {op} %s::vector AS dist
        FROM items
        ORDER BY dist
        LIMIT 3
    """, (str(query_vec),))
    for desc, dist in cur.fetchall():
        print(f"  {dist:+.4f}  {desc[:30]}")
```

→ 會看到三種距離排序「大致一樣」但數字不同。**OpenAI 推薦 cosine**（`<=>`）。

---

## 9. 加 HNSW 索引（資料變多後做）

當資料超過 ~10 萬筆，brute force 慢，建索引：

```sql
-- 對應 cosine 距離的索引
CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);

-- 確認
\di
```

之後查詢自動走索引，**速度快幾十倍**。

⚠️ **配對規則**：用 `<=>` 查詢就建 `vector_cosine_ops`、用 `<->` 查詢就建 `vector_l2_ops`。**不配對 = 索引廢掉**。

---

## 10. 常見錯誤排雷

### 錯誤 1：`AuthenticationError: Invalid API key`

**原因**：`.env` 裡的 key 錯了 / 沒 load 到。

**解法**：
```python
# 加這行 debug
print(os.getenv("OPENAI_API_KEY"))
# 如果是 None → 沒 load .env，檢查 load_dotenv() 是否在最前面
# 如果是空字串或 'sk-...' 但你的 key 是 sk-proj-... → 大概率複製錯
```

### 錯誤 2：`InsufficientQuotaError`

**原因**：OpenAI 帳號**沒充值**。
**解法**：去 <https://platform.openai.com/account/billing> 充至少 $5。

### 錯誤 3：`ERROR: dimension mismatch, got 1536, expected 3`

**原因**：你還沒重建表，`items` 還是舊的 `vector(3)`。
**解法**：跑 Section 6 的 `DROP TABLE` + `CREATE TABLE` 重建。

### 錯誤 4：`could not connect to server`

**原因**：Docker 容器沒跑 / port 不對。
**解法**：
```powershell
docker ps                                       # 確認 pgvector-test 在跑
docker start pgvector-test                      # 沒跑就啟動
# DATABASE_URL 確認 port 是 5433（不是 5432）
```

### 錯誤 5：插入向量時 `invalid input syntax`

**原因**：直接把 Python list 丟進 SQL，pgvector 不認。
**解法**：用 `str(vec)` 把 list 變成字串：

```python
# ❌
cur.execute("INSERT ... VALUES (%s, %s)", (text, vec))

# ✅
cur.execute("INSERT ... VALUES (%s, %s)", (text, str(vec)))
```

或用 `pgvector` 套件直接支援：

```powershell
pip install pgvector
```

```python
from pgvector.psycopg2 import register_vector
register_vector(conn)
# 之後直接傳 list 就行（不用 str()）
```

---

## 11. 沒 OpenAI API key？兩個替代方案

### 方案 A：本地 sentence-transformers（免費、開源）

```powershell
pip install sentence-transformers
```

```python
from sentence_transformers import SentenceTransformer

# 第一次跑會下載 model 到本機（~100 MB）
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
# ↑ 多語言版本（含中文），384 維

vec = model.encode("蘋果是水果").tolist()
print(len(vec))   # 384
```

⚠️ **維度不同**：384 vs OpenAI 的 1536。表結構要改 `vector(384)`。

**特性對照**：

| | OpenAI Embedding | sentence-transformers |
|---|------------------|----------------------|
| 跑在哪 | OpenAI 雲端 | **你的本機 / 容器** |
| 要錢嗎 | $0.02 / 1M tokens | 免費 |
| 維度 | 1536 / 3072 | 384 / 768（依 model）|
| 速度 | 網路延遲 ~100ms | 本地，更快（有 GPU 更快）|
| 品質 | ★★★★★ | ★★★★（多語言版本不錯）|
| 隱私 | ⚠️ 文字傳給 OpenAI | ✅ 完全本地 |

### 方案 B：Hugging Face Inference API（免費 tier）

```python
import requests
import os

response = requests.post(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    headers={"Authorization": f"Bearer {os.getenv('HF_TOKEN')}"},
    json={"inputs": "蘋果是水果"}
)
vec = response.json()
```

申請 HF token：<https://huggingface.co/settings/tokens>（免費）

---

## 12. 整合到完整 RAG 流程

到此你會了：
- ✅ 把文字 → embedding（OpenAI API）
- ✅ 把 embedding 存進 pgvector
- ✅ 用 query embedding 找最相近的內容

**下一步要做的**（完整 RAG）：

```
1. chunking：長文章切片（每 500 字一段）
2. embedding：每段 → 1536 dim 向量
3. 存 pgvector
4. 使用者問問題：
   ├── 把問題 embed
   ├── 找最相近的 N 段（top-k retrieval）
   └── 把這 N 段 + 使用者問題塞進 prompt
5. 丟給 LLM（GPT-4 / Claude）生成答案
```

→ 這就是「Retrieval-Augmented Generation」的完整流程。可以再開新筆記寫這個。

---

## 13. 速記卡

```
裝套件： pip install openai psycopg2-binary python-dotenv
.env：   OPENAI_API_KEY=sk-...
        DATABASE_URL=postgresql://postgres:mysecret@localhost:5433/test_rag

embed： client.embeddings.create(model="text-embedding-3-small", input="...")
取向量： response.data[0].embedding   # list of 1536 floats

存 pgvector：
  cur.execute("INSERT ... VALUES (%s, %s)", (text, str(vec)))

查最相近：
  SELECT desc, embedding <=> %s::vector AS dist FROM items
  ORDER BY dist LIMIT 3

成本： text-embedding-3-small ≈ $0.02 / 100 萬 tokens
       學習階段花不到 $1
```

---

## 相關筆記

- [pgvector-setup-guide.md](pgvector-setup-guide.md) — pgvector setup（前置步驟）
- [RAG指令啟用步驟與地點.md](RAG指令啟用步驟與地點.md) — 三層 prompt 速查
- [../LLM-Memory/rag-vs-memory-comparison.md](../LLM-Memory/rag-vs-memory-comparison.md) — RAG / Memory 概念對照
- [../CLI/environment-variables-basics.md](../CLI/environment-variables-basics.md) — `.env` 安全

---

## 官方資源

- **OpenAI API docs**：<https://platform.openai.com/docs/guides/embeddings>
- **OpenAI Pricing**：<https://openai.com/api/pricing/>
- **OpenAI Python SDK**：<https://github.com/openai/openai-python>
- **psycopg2 docs**：<https://www.psycopg.org/docs/>
- **pgvector Python**：<https://github.com/pgvector/pgvector-python>
- **sentence-transformers**：<https://www.sbert.net/>
