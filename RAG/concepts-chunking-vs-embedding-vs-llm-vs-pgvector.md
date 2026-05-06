# 概念釐清：chunking vs embedding vs LLM vs pgvector

> **這份筆記回答**：
> 1. chunking、embedding model、LLM 是同一個東西嗎？（不是！）
> 2. pgvector 算 database 嗎？（不算！是 extension）
> 3. RAG 流程裡每個步驟分別是誰在做事？
> 4. 「向量資料庫」這個詞的口語 vs 正式定義？
>
> **建立日期**：2026-05-05

---

## 0. 你以為的 vs 實際的

### ❌ 容易產生的誤解

| 你以為 | 實際 |
|--------|------|
| chunking 是 model 做的 | chunking 是**純文字操作**，沒用任何 model |
| embedding model 就是 LLM 的小弟 | embedding model 跟 LLM 是**不同任務的不同神經網路** |
| pgvector 是個資料庫 | pgvector 是 PostgreSQL 的 **extension**（擴充套件）|
| 一個 model 應該支援所有語言 | model 表現受**訓練資料分布**影響，沒辦法兩全 |

---

## 1. RAG 流程的 4 個獨立步驟（每個用不同工具）

```
原始長文章 (10000 字)
   │
   │ Step 1: chunking         ← 純 Python 字串處理
   ▼                            （沒用任何 model）
[chunk 1] [chunk 2] ... [chunk 20]
   │
   │ Step 2: embedding        ← 用 embedding model
   ▼                            （bge-m3、text-embedding-3、Voyage...）
[1024 維向量] x 20
   │
   │ Step 3: 存進 vector store ← 用 pgvector / Pinecone / Qdrant
   ▼
PostgreSQL with pgvector
   │
   │ Step 4-1: 使用者問問題 → 把問題也 embed
   │ Step 4-2: 在 vector store 找最近 N 段
   │ Step 4-3: 把 N 段 + 問題塞進 prompt → 丟給 LLM 生成答案
   ▼                                          ↑
答案文字                                  ← 這裡才是 LLM
                                            （Claude、GPT-4...）
```

→ **4 個步驟用 4 種不同工具**，不要混為一談。

---

## 2. Chunking 是什麼？

**純 Python 字串處理**——把長文章切成小段。

### 實際的 chunking 程式碼長這樣

```python
# 最簡單的版本
def chunk_simple(text, max_chars=500):
    return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

# 用 LangChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_text(long_text)
```

→ 看到了嗎？**沒有任何 `import some_model`**——chunking **不需要 model**。

### Chunking 用什麼？

- ✅ Python 字串方法（`split`、`replace`、正則）
- ✅ 演算法（找句號、換行、單字邊界）
- ❌ 不需要 LLM
- ❌ 不需要 embedding model
- ❌ 不需要 GPU
- ❌ 不需要 API key

→ chunking 是 RAG 流程**最簡單的一步**。

詳細策略對照見 → [chunking-strategies-comparison.md](chunking-strategies-comparison.md)

---

## 3. Embedding Model 是什麼？

**一種神經網路**，把「**一段文字**」轉成「**一個向量**」。

### 但它不是 LLM

| | Embedding Model | LLM (大型語言模型) |
|---|----------------|------------------|
| **任務** | 文字 → 向量（壓縮成數字）| 文字 → 文字（生成、對話）|
| **參數量** | 100M ~ 1B（小）| 7B ~ 1.8T（巨大）|
| **大小** | 100 MB ~ 2 GB | 14 GB ~ 數 TB |
| **典型代表** | BERT、bge-m3、text-embedding-3 | GPT-4、Claude、Llama |
| **能寫文章嗎？** | ❌ 不能 | ✅ 能 |
| **能算相似度嗎？** | ✅ 能（直接給向量） | ⚠️ 能但浪費（要過整個 LLM）|
| **訓練目標** | 「相似的文字 → 向量靠近」 | 「給上文，預測下一個字」 |

### 直觀類比

| | 比喻 |
|---|------|
| **Embedding model** | 「把文章變成 1024 個數字的指紋機」 |
| **LLM** | 「會聊天 + 寫作的智能助理」 |

→ 兩個都是神經網路，但**任務完全不同**。

### Embedding model 也是用 Transformer 架構嗎？

對！Embedding model 跟 LLM **底層架構都是 Transformer**，但：

- **LLM** 是 Decoder-only Transformer（為了生成文字）
- **Embedding model** 通常是 Encoder-only Transformer（BERT 系列，為了壓成向量）

→ 同源不同任務，像「同一家拳擊館訓練出來的選手，一個練拳擊一個練摔角」。

---

## 4. LLM 是什麼？

**生成型大型語言模型**——會寫文章、回答問題、寫程式碼的那個。

| 代表 | 公司 | 用途 |
|------|------|------|
| GPT-4 | OpenAI | 對話、生成、推理 |
| Claude 3.5/3.7/4 | Anthropic | 同上 |
| Gemini | Google | 同上 |
| Llama 3 | Meta（開源）| 同上但本地跑 |
| Qwen / DeepSeek | 中國（開源）| 同上 |

### LLM 在 RAG 流程的角色

```
chunks (前 N 個最相近的) + 使用者問題
                │
                ▼
        ┌──────────────────┐
        │ Prompt 模板      │
        │                  │
        │ 根據以下文件回答： │
        │ {chunks}         │
        │                  │
        │ 問題：{question} │
        └────────┬─────────┘
                 │
                 ▼
              LLM API
              (Claude / GPT-4)
                 │
                 ▼
              生成的答案文字
```

→ **LLM 在 RAG 流程的最後一步**，負責「**根據檢索到的內容寫答案**」。

---

## 5. 三者對照表

| | chunking | embedding model | LLM |
|---|----------|----------------|-----|
| **是 model 嗎** | ❌ 純演算法 | ✅ 是 | ✅ 是 |
| **吃什麼** | 一段文字 | 一段文字 | 一段文字 |
| **吐什麼** | **多段小文字** | **一個向量** | **生成新文字** |
| **參數量** | 0（沒有 model）| 100M ~ 1B | 7B ~ 1.8T |
| **GPU 需要嗎** | ❌ | ⚠️ 有更快 | ✅ 強烈需要 |
| **要 API key 嗎** | ❌ | ⚠️ 看你用哪家 | ⚠️ 看你用哪家 |
| **舉例** | `text.split()`、LangChain splitter | bge-m3、text-embedding-3-small | Claude、GPT-4 |
| **RAG 步驟** | Step 1 | Step 2 | Step 4 |

---

## 6. ⚠️ pgvector 不是 database，是 extension

**你說得完全正確**——「向量資料庫」這個詞是**口語 / 行銷用法**，正式技術上：

```
真正的關係：

PostgreSQL 引擎（DBMS = Database Management System）
   │
   │ 安裝 → 啟動 → 跑成 server
   ▼
你的本機（或 Docker 容器）有一個跑著的 Postgres 服務
   │
   │ 內部可以建多個 database（邏輯隔離單位）
   ▼
   ┌── postgres (database)         ← 預設 DB
   ├── test_rag (database)         ← 你建的 DB
   │     │
   │     │ 在這個 database 內 CREATE EXTENSION vector;
   │     ▼
   │   啟用 pgvector extension     ← ★ 這是 extension，不是 database
   │     │
   │     ▼
   │   獲得 vector 型別 + <-> <=> <#> 運算子
   │
   └── template0 / template1
```

### 三個詞的精確定義

| 詞 | 是什麼 | 例子 |
|----|--------|------|
| **DBMS / 資料庫管理系統** | 軟體（負責管資料）| PostgreSQL、MySQL、Oracle |
| **Database**（資料庫，狹義）| DBMS 內的邏輯隔離單位 | postgres、test_rag、myapp_db |
| **Extension**（擴充套件）| 給 database 加新功能 | pgvector、postgis、pg_trgm |

→ pgvector 跟 PostGIS（地理資訊）一樣，都是 PostgreSQL 的 **extension**，**不是獨立的資料庫**。

### 「向量資料庫」這個詞怎麼用才對？

| 用法 | 說對沒？ |
|------|--------|
| 「pgvector 是向量資料庫」 | ⚠️ 不精確（pgvector 是 extension）|
| 「PostgreSQL with pgvector 可以當向量資料庫用」 | ✅ 精確 |
| 「向量資料庫包括 pgvector、Qdrant、Pinecone...」 | ⚠️ 把 extension 跟獨立 vector DB 混在一起 |

### 真正的「獨立向量資料庫」 vs pgvector 的 extension

| 類別 | 例子 | 特性 |
|------|------|------|
| **PostgreSQL extension**（你用的）| pgvector | 跑在 Postgres 上，享有 SQL / ACID / 完整 DB 功能 |
| **獨立向量資料庫** | Qdrant、Pinecone、Milvus、Weaviate | 專門設計給向量，無 SQL 但向量功能更強 |

兩者都能做 RAG，pgvector 對「**已經會 PostgreSQL 的人**」最適合。

---

## 7. 完整 RAG 流程一張圖（誰負責什麼）

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG 完整流程                              │
└─────────────────────────────────────────────────────────────────┘

  原始 PDF / 網頁 / 資料庫
            │
            ▼
   ┌─────────────────┐    ← Step 1: chunking
   │ 純 Python 切片  │      (LangChain / 自己寫)
   │ 沒用 model      │      不需要 GPU、不需要 API
   └────────┬────────┘
            │ 多個 chunks
            ▼
   ┌─────────────────┐    ← Step 2: embedding
   │ Embedding model │      (bge-m3 / OpenAI / Voyage)
   │ Transformer 架構 │      小型神經網路
   └────────┬────────┘      ★ 不是 LLM ★
            │ 多個向量
            ▼
   ┌─────────────────────┐    ← Step 3: 存進 vector store
   │  PostgreSQL DBMS   │       PostgreSQL 是 DBMS
   │  ┌──────────────┐  │       test_rag 是 database
   │  │ test_rag DB  │  │       pgvector 是 extension
   │  │              │  │
   │  │ pgvector ext │  │      ★ pgvector 不是 DB ★
   │  │              │  │
   │  │ items table  │  │
   │  └──────────────┘  │
   └─────────┬───────────┘
             │
   ┌─────────┴───────────┐
   │ 使用者問問題         │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────┐    ← Step 4-1: query embed
   │ Embedding model │      用同一個 model（重要！）
   └────────┬────────┘
            │ query 向量
            ▼
   ┌─────────────────┐    ← Step 4-2: 找最近的 N 段
   │ pgvector 查詢   │      ORDER BY embedding <=> %s LIMIT 5
   └────────┬────────┘
            │ top-N chunks
            ▼
   ┌─────────────────┐    ← Step 4-3: 塞進 prompt
   │ Prompt 模板     │      「根據以下文件：{chunks}\n問題：{q}」
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐    ← Step 4-4: 生成答案
   │ LLM             │      Claude / GPT-4 / Llama
   │ 大型語言模型    │      ★ 這裡才是 LLM ★
   └────────┬────────┘
            │
            ▼
       回答給使用者
```

---

## 8. 速記卡

```
┌────────────┬──────────────────────────────────────┐
│ 名稱       │ 是什麼                                │
├────────────┼──────────────────────────────────────┤
│ chunking   │ 純文字切割（沒 model）                 │
│ embedding  │ 神經網路（小，不是 LLM）              │
│ LLM        │ 神經網路（巨大，會生成）               │
│ pgvector   │ PostgreSQL 的 extension（不是 DB）    │
│ database   │ DBMS 內的邏輯單位（test_rag）         │
│ DBMS       │ 資料庫軟體本身（PostgreSQL）          │
└────────────┴──────────────────────────────────────┘

RAG 流程：
  chunking → embed → 存 → query embed → 找近 → LLM 生成
   (純字串)  (小 NN)        (小 NN)         (巨 NN)
```

---

## 相關筆記

- [chunking-strategies-comparison.md](chunking-strategies-comparison.md) — chunking 策略對照
- [pgvector-with-openai-embedding.md](pgvector-with-openai-embedding.md) — embedding 實作
- [embedding-models-comparison.md](embedding-models-comparison.md) — 各家 embedding model 對照
- [pgvector-setup-guide.md](pgvector-setup-guide.md) — pgvector setup
- [../LLM-Memory/ml-skill-tree-hierarchy.md](../LLM-Memory/ml-skill-tree-hierarchy.md) — ML 技能樹
