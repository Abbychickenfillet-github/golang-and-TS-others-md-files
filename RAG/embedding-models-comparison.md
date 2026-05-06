# Embedding 模型供應商完整對照 — OpenAI / Anthropic / Voyage / sentence-transformers / Cohere

> **這份筆記回答**：
> 1. Anthropic 有 embedding API 嗎？（沒有！）
> 2. 沒 Anthropic embedding 那 Claude RAG 怎麼做？
> 3. sentence-transformers 該選哪個 model？怎麼用最好？
> 4. 維度（384 / 768 / 1024 / 1536 / 3072）差在哪？
> 5. 跨 provider 切換要注意什麼？
>
> **建立日期**：2026-05-05

---

## 0. 速答：哪些公司提供 embedding？

| 公司 | 有 embedding model？ | 推薦度 |
|------|------------------|------|
| **OpenAI** | ✅ text-embedding-3-small/large | ★★★★★（最主流）|
| **Anthropic** | ❌ **沒有！只做 Claude** | -（用 Voyage 替代）|
| **Voyage AI** | ✅ voyage-3、voyage-3-large | ★★★★★（Anthropic 推薦）|
| **Google** | ✅ text-embedding-005 | ★★★★ |
| **Cohere** | ✅ embed-v3.0、embed-multilingual | ★★★★ |
| **sentence-transformers** | ✅ 開源本地，多種 model | ★★★★★（學習 / 隱私）|
| **Hugging Face** | ✅ 各種 open-source 模型 | ★★★★ |

→ **學習階段**：sentence-transformers（免費、本地）
→ **生產 + 用 GPT**：OpenAI Embedding
→ **生產 + 用 Claude**：Voyage AI

---

## 1. ⚠️ Anthropic 沒有 embedding API

```
OpenAI                    Anthropic                  Google
──────                    ─────────                  ──────
✅ chat (gpt-4)            ✅ chat (Claude)           ✅ chat (Gemini)
✅ embedding              ❌ 沒有 embedding         ✅ embedding
✅ image (DALL-E)         ❌                        ❌
✅ speech (whisper)       ❌                        ❌
```

### 為什麼？

Anthropic 專注於「**對話 / 推理 / 程式碼**」這類**生成型** AI，沒投入做 embedding。

### Claude RAG 怎麼做？官方推薦用 Voyage AI

```
                       Voyage Embedding API
   文字 ───────────────────────────────────► 1024 維向量
                                                  │
                                                  ▼
                                              pgvector
                                                  │
   使用者問題 ──► Voyage embed ──► 找最近 N 段 ──┐
                                                  │
                                                  ▼
                                          ┌─────────────┐
                                          │ Anthropic   │
                                          │ Claude API  │ ← 生成答案
                                          └─────────────┘
```

**Anthropic 跟 Voyage AI 是合作關係**（Anthropic 投資了 Voyage）。

### Voyage AI Model 選擇

| Model | 維度 | 價錢 / 100 萬 tokens | 適用 |
|-------|------|--------------------|------|
| **voyage-3** ★ | 1024 | $0.06 | 主流，CP 值高 |
| voyage-3-large | 1024 | $0.18 | 更高品質 |
| voyage-3-lite | 512 | $0.02 | 便宜選擇 |
| voyage-code-3 | 1024 | $0.18 | 程式碼 RAG 專用 |
| voyage-multilingual-2 | 1024 | $0.12 | 多語言（含中文）|

→ 中文 RAG 用 `voyage-multilingual-2`，英文用 `voyage-3`。

### 接 Voyage 範例

```python
import voyageai

vo = voyageai.Client(api_key="...")  # 從 https://dash.voyageai.com 取得

result = vo.embed(
    texts=["蘋果是水果", "狗是寵物"],
    model="voyage-multilingual-2",
    input_type="document"   # 存資料用 "document"，搜尋用 "query"
)

vectors = result.embeddings    # list of 1024-float lists
```

```powershell
pip install voyageai
```

---

## 2. 三家組合對照

| 用途 | 純 OpenAI 派 | 純 Google 派 | 混搭 Claude 派 | 完全本地派 |
|------|------------|------------|--------------|----------|
| Embedding | OpenAI text-embedding-3-small | Google text-embedding-005 | **Voyage AI voyage-3** | sentence-transformers bge-m3 |
| LLM 生成 | OpenAI GPT-4 | Google Gemini | **Anthropic Claude** | 本地 Llama / Qwen |
| 套件 | `openai` | `google-generativeai` | `voyageai` + `anthropic` | `sentence-transformers` + `ollama` |
| 費用 | 中 | 中 | 中（Claude 偏貴）| **免費**（本地運算）|
| 隱私 | ⚠️ 上 OpenAI | ⚠️ 上 Google | ⚠️ 上 Voyage + Anthropic | ✅ 完全本地 |

---

## 3. sentence-transformers 詳解

開源、免費、本地——**沒 API key 也能玩**。

### 3.1 中文場景該選哪個 model？

| Model | 維度 | 適合 | 推薦度 |
|-------|------|------|------|
| `paraphrase-multilingual-MiniLM-L12-v2` | 384 | 多語言、輕量、快 | ★★★★（學習用）|
| `BAAI/bge-m3` | **1024** | **多語言、品質最佳** | ★★★★★（生產用）|
| `BAAI/bge-large-zh-v1.5` | 1024 | **純中文最佳品質** | ★★★★★（純中文用）|
| `shibing624/text2vec-base-chinese` | 768 | 中文，較舊 | ★★★ |
| `all-mpnet-base-v2` | 768 | **純英文最佳** | ★★★★★（純英文用）|

**建議路徑**：

```
學習階段
   ↓
paraphrase-multilingual-MiniLM-L12-v2 (384 dim)
   ↓ 想升級品質
BAAI/bge-m3 (1024 dim)
   ↓ 純中文場景
BAAI/bge-large-zh-v1.5 (1024 dim)
```

### 3.2 安裝

```powershell
pip install sentence-transformers
```

⚠️ 第一次跑會**下載 model**到本機快取（`~/.cache/huggingface/`），可能要等：
- MiniLM：~100 MB
- bge-m3：~2 GB
- bge-large-zh：~1.3 GB

### 3.3 完整可跑範例

```python
# st_embed_test.py
from sentence_transformers import SentenceTransformer

# 1. 載入 model（第一次很慢，後續從快取讀就秒開）
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# 2. 批次 encode（比單個快很多）
texts = [
    "蘋果是水果",
    "狗是寵物",
    "桌子是家具"
]
vectors = model.encode(texts, batch_size=32, normalize_embeddings=True)

print(f"類型：{type(vectors)}")          # numpy.ndarray
print(f"形狀：{vectors.shape}")           # (3, 384)
print(f"第 1 個向量前 5 維：{vectors[0][:5]}")
```

執行：

```powershell
python st_embed_test.py
```

預期輸出：

```
類型：<class 'numpy.ndarray'>
形狀：(3, 384)
第 1 個向量前 5 維：[ 0.0142 -0.0231  0.0567  ...]
```

### 3.4 最佳實踐

#### ✅ 1. Model 只載入一次

```python
# ❌ 錯：每次呼叫都載入（很慢）
def embed(text):
    model = SentenceTransformer('...')   # 每次都載入！
    return model.encode(text)

# ✅ 對：全域只載一次
model = SentenceTransformer('...')   # 程式啟動時載入

def embed(text):
    return model.encode(text)         # 重用 model
```

#### ✅ 2. 批次 encode

```python
# ❌ 慢：for 迴圈
vectors = [model.encode(t) for t in texts]

# ✅ 快：一次傳整個 list
vectors = model.encode(texts, batch_size=32)
```

#### ✅ 3. normalize_embeddings = True

```python
vectors = model.encode(texts, normalize_embeddings=True)
# ↑ 把向量正規化（長度=1），之後用內積就等於 cosine 相似度，更快
```

#### ✅ 4. 用 GPU 加速（如果有）

```python
model = SentenceTransformer('...', device='cuda')   # NVIDIA GPU
# model = SentenceTransformer('...', device='mps')  # Apple Silicon
# model = SentenceTransformer('...', device='cpu')  # 預設
```

#### ✅ 5. bge 系列：query / document 要分開

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('BAAI/bge-m3')

# 文件 embed（存進 DB 的）
doc_vecs = model.encode(texts, normalize_embeddings=True)

# query embed（搜尋用）
query_vec = model.encode(
    "我想吃水果",
    normalize_embeddings=True,
    prompt_name="query"   # ★ 加 query 前綴，bge 專用
)
```

### 3.5 整合 pgvector 範例

```python
# st_with_pgvector.py
from sentence_transformers import SentenceTransformer
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# 確保表是 384 維（不是 1536）
cur.execute("DROP TABLE IF EXISTS items;")
cur.execute("""
    CREATE TABLE items (
      id bigserial PRIMARY KEY,
      description text,
      embedding vector(384)
    );
""")

# 存資料
texts = ["蘋果是水果", "狗是寵物", "桌子是家具"]
vectors = model.encode(texts, normalize_embeddings=True)

for text, vec in zip(texts, vectors):
    cur.execute(
        "INSERT INTO items (description, embedding) VALUES (%s, %s)",
        (text, str(vec.tolist()))   # numpy array → list → str
    )
conn.commit()

# 查詢
query = "我想吃水果"
query_vec = model.encode(query, normalize_embeddings=True).tolist()

cur.execute("""
    SELECT description, embedding <=> %s::vector AS dist
    FROM items
    ORDER BY dist
    LIMIT 3
""", (str(query_vec),))

for desc, dist in cur.fetchall():
    print(f"  {dist:.4f}  {desc}")

cur.close()
conn.close()
```

⚠️ 關鍵：`vector(384)` 不是 `vector(1536)`——**dim 要跟 model 配對**。

---

## 4. 維度的概念釐清：384 vs 1536 vs 3072

✅ **維度 = 屬性數量**（跟 OpenAI 1536 維是同一個概念）

### Excel 類比

```
384-dim（sentence-transformers MiniLM）：
| 文字     | 屬性1 | 屬性2 | ... | 屬性384 |
|---------|-------|-------|-----|--------|
| 蘋果是水果 | 0.012 | -0.034| ... | 0.089  |

1536-dim（OpenAI text-embedding-3-small）：
| 文字     | 屬性1 | 屬性2 | ... | 屬性1536 |
|---------|-------|-------|-----|---------|
| 蘋果是水果 | -0.058| 0.031 | ... | 0.017   |
```

→ 兩者都在描述「蘋果是水果」這個概念，**只是用不同數量的數字表達**。

### 維度多 vs 少的取捨

| 維度 | 描述能力 | 記憶體 | 計算 | 何時用 |
|------|--------|------|-----|------|
| 384 (MiniLM) | 中等 | 小 | 快 | 學習、輕量場景、資料量大需省 |
| 768 (mpnet) | 好 | 中 | 中 | 中等場景 |
| 1024 (bge-m3) | 很好 | 中 | 中 | 專業場景 |
| 1536 (OpenAI small) | 很好 | 大 | 慢 | 主流選擇 |
| 3072 (OpenAI large) | 最好 | 最大 | 最慢 | 高品質要求 |

### 直觀理解

- **384 維** ≈「用 384 個關鍵特徵描述一個人」（身高 / 體重 / 髮色 / 國籍...）→ 認識基本輪廓
- **1536 維** ≈「用 1536 個更細的特徵描述」（每根手指長度、瞳孔顏色細節...）→ 更精細

### ⚠️ 不是「維度越多越好」

維度多了：
- ✅ 能表達更細微的差異
- ❌ 記憶體成本變大（100 萬筆向量：384 × 4 = 1.5 GB vs 1536 × 4 = 6 GB）
- ❌ 計算變慢
- ❌ 訓練資料不夠時可能 overfit

→ **看場景選**：學習用 384 夠，生產主流是 1024-1536。

### ⚠️ 跨維度的向量**不能直接比較**

```sql
-- ❌ 錯：不同維度不能算距離
SELECT vec_384 <-> vec_1536    -- ERROR: dimension mismatch

-- ✅ 對：同一個 model 出來的向量才能互比
```

**跨 model 的向量也不能比較**（即使維度相同）：

```python
# OpenAI 1536-dim 跟 sentence-transformers MiniLM-L12（如果剛好 1536）
# 即使維度一樣，「語義空間」不同，不能比較
```

→ **同一個 RAG 系統內，所有向量必須來自同一個 model**。要換 model 就要**全部重新 embed**。

---

## 5. 五家詳細對照速查

| 提供者 | Model | 維度 | $/1M tokens | 部署 | 中文支援 |
|--------|-------|------|------------|------|--------|
| **OpenAI** | text-embedding-3-small | 1536 | $0.02 | 雲端 API | ✅ 好 |
| **OpenAI** | text-embedding-3-large | 3072 | $0.13 | 雲端 API | ✅ 好 |
| **Voyage** | voyage-3 | 1024 | $0.06 | 雲端 API | ⚠️ 純英文較強 |
| **Voyage** | voyage-multilingual-2 | 1024 | $0.12 | 雲端 API | ✅ 好 |
| **Google** | text-embedding-005 | 768 | $0.025 | 雲端 API | ✅ 好 |
| **Cohere** | embed-multilingual-v3.0 | 1024 | $0.10 | 雲端 API | ✅ 好 |
| **sentence-transformers** | paraphrase-multilingual-MiniLM | 384 | **免費** | 本地 | ⚠️ 中等 |
| **sentence-transformers** | BAAI/bge-m3 | 1024 | **免費** | 本地 | ✅ 好 |
| **sentence-transformers** | BAAI/bge-large-zh-v1.5 | 1024 | **免費** | 本地 | ✅✅ 最佳（純中文）|

---

## 6. 怎麼選？決策樹

```
我要做 RAG
  │
  ├── 我用什麼 LLM 生成？
  │     │
  │     ├── ChatGPT / GPT-4 → OpenAI Embedding（同生態）
  │     │
  │     ├── Claude → Voyage AI（Anthropic 推薦）
  │     │
  │     ├── Gemini → Google Embedding
  │     │
  │     └── 本地 Llama / Qwen → sentence-transformers（也本地）
  │
  ├── 我有預算嗎？
  │     │
  │     ├── 沒預算 → sentence-transformers（免費）
  │     │
  │     └── 有預算 → 看上面 LLM 對應
  │
  ├── 隱私要求高嗎？（醫療 / 法律 / 機密）
  │     │
  │     ├── 是 → 必須本地：sentence-transformers + 本地 LLM
  │     │
  │     └── 否 → 雲端 API 都可以
  │
  └── 主要語言？
        │
        ├── 中文 → bge-m3 / bge-large-zh / Voyage multilingual / OpenAI
        │
        ├── 英文 → 都行，OpenAI / Voyage 表現最好
        │
        └── 其他語言（日韓越...）→ bge-m3 / OpenAI / Cohere multilingual
```

---

## 7. 跨 provider 切換要注意

### ⚠️ 換 model = 全部重新 embed

```
原本：1000 筆資料用 OpenAI embed（1536 維）存在 pgvector
要換成：sentence-transformers MiniLM（384 維）
        │
        ▼
1. DROP TABLE items
2. CREATE TABLE items (embedding vector(384))
3. 重跑全部 1000 筆 embed → 新向量
4. 重新 INSERT
```

→ **embed 是耗錢 / 耗時的步驟**，換 model 前考慮清楚。

### ⚠️ 一致性原則

存資料用什麼 model embed → 查詢時也要**用同一個 model**：

```python
# ✅ 對
model = SentenceTransformer('bge-m3')
doc_vec = model.encode("文件")        # 用 bge-m3
query_vec = model.encode("查詢")      # 用同一個 bge-m3

# ❌ 錯
doc_vec = openai_embed("文件")        # OpenAI 1536 維
query_vec = bge_embed("查詢")         # bge 1024 維
# → 維度不對 + 語義空間不同，距離計算無意義
```

### ⚠️ 維度差太多 → 索引要重建

切換 model 後，HNSW 索引也要重建：

```sql
DROP INDEX items_embedding_idx;
CREATE INDEX items_embedding_idx ON items USING hnsw (embedding vector_cosine_ops);
```

---

## 8. 速記卡

```
Anthropic 沒 embedding → 用 Voyage AI

OpenAI text-embedding-3-small  ⭐ 主流，1536 dim, $0.02/M tokens
Voyage voyage-3                ⭐ Claude RAG，1024 dim, $0.06/M
sentence-transformers MiniLM   ⭐ 免費本地，384 dim
sentence-transformers bge-m3   ⭐ 免費本地高品質，1024 dim

維度 = 屬性數量，越多描述越細但越慢越貴
跨 model 向量不能互比（即使維度一樣）
換 model = 全部資料重新 embed
```

---

## 相關筆記

- [pgvector-with-openai-embedding.md](pgvector-with-openai-embedding.md) — OpenAI Embedding 完整實作
- [pgvector-setup-guide.md](pgvector-setup-guide.md) — pgvector setup
- [../LLM-Memory/rag-vs-memory-comparison.md](../LLM-Memory/rag-vs-memory-comparison.md) — RAG 概念
- [../LLM-Memory/ml-skill-tree-hierarchy.md](../LLM-Memory/ml-skill-tree-hierarchy.md) — ML 技能樹（embedding 在 Layer 3）

---

## 官方資源

- **OpenAI Embeddings**：<https://platform.openai.com/docs/guides/embeddings>
- **Anthropic 推薦 Voyage**：<https://docs.anthropic.com/en/docs/build-with-claude/embeddings>
- **Voyage AI**：<https://docs.voyageai.com/docs/embeddings>
- **sentence-transformers**：<https://www.sbert.net/>
- **BAAI/bge-m3 model card**：<https://huggingface.co/BAAI/bge-m3>
- **MTEB leaderboard**（embedding model 排行）：<https://huggingface.co/spaces/mteb/leaderboard>
