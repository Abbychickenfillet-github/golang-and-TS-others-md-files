# RAG vs Memory — 兩個都在「餵資料給 LLM」，但根本目標不同

> 這份筆記回答兩個問題：
> 1. **retrieval 到底該翻成什麼？**（檢索 / 索引 / 召回 的正名）
> 2. **RAG 和 Mem0/text2mem 這種 memory layer，是同一件事嗎？**
>
> 短答：**不是**。兩者看起來都「從外部存儲找資料塞進 prompt」，但**要解決的問題完全不同**——RAG 是**拓展知識**，Memory 是**延續情境**。

---

## 0. 術語正名 — Retrieval / Index / Recall 到底怎麼分？

### 常見混淆

很多人看到 RAG 的 R（Retrieval）會直覺翻成「索引」，這是**錯的**。中文有三個詞在這塊經常被混用：

| 中文 | 英文 | 真正的意思 | 類比 |
|------|------|-----------|------|
| **檢索** | **Retrieval** | 「**找出資料**」這個**動作** | 去圖書館找一本書 |
| **索引** | **Index** | 為了加速檢索而建立的**資料結構** | 圖書館的分類卡片櫃 |
| **召回** | **Recall** | 檢索系統**第一階段**的粗排 | 把書架整櫃搬到你面前，之後再細挑 |

### 三者關係

```
使用者 query
    │
    ▼
┌─────────────────────────────┐
│  【召回 Recall】(粗排)        │   ← 從百萬級候選拉出 topN (幾百條)
│  用 Index 快速篩選              │   ← 這裡會用到索引資料結構
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  【精排 / Rerank】            │   ← 對 topN 做精細排序，取 top-k (幾條)
└─────────────┬───────────────┘
              │
              ▼
       送進 LLM 的最終 context

     整條流程 = 【Retrieval 檢索】
```

### 所以 RAG 的 R 該翻「檢索」還是「召回」？

- **中文主流翻譯**：RAG = **檢索增強生成**（Retrieval-Augmented Generation）
- **技術上更精確**：RAG 的 R 其實**涵蓋**「召回 + 精排」整條流程，不只是召回那一段
- **「召回」的正確使用場景**：當你**拆解**一個檢索系統的內部流程時，才會講「這是召回階段、這是 rerank 階段」
- **結論**：**對外講 RAG，用「檢索」**；**對內討論系統架構，可以分別說「召回階段」「精排階段」**

### 和之前筆記的呼應

在 `text2mem-12-atomic-operations.md` 裡，12 個原子操作中：
- **Retrieve** = 精確取出（給定條件直接拿）
- **Search** = 模糊搜尋（向量相似度等）

這兩個動作**合起來**對應到 RAG 的 R。所以「Retrieval」在 text2mem 的用法更貼近**廣義的「提取」**，這也是認知心理學三階段（ENC/STO/**RET**）的用法。

---

## 1. RAG 是什麼？—— 原始問題的由來

### 論文源頭

**Lewis et al. 2020** — *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"*
（Meta AI，arXiv **2005.11401**）

這篇論文要解決的核心痛點：

> LLM 訓練完就定格了——訓練資料截止日之後的事、公司內部機密文件、即時新聞，**它全都不知道**。

### RAG 的核心流程

```
使用者問題：「我們公司 2025 Q4 的退款政策是什麼？」
    │
    ▼
┌──────────────────────────────────────┐
│ 【1. Retrieve】                       │
│ 把問題轉成向量 → 去 vector store      │
│ 找出最相關的內部文件片段（chunk）    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ 【2. Augment】                        │
│ 把檢索到的 chunks 塞進 prompt         │
│ 形式：「根據以下文件回答：{chunks}」  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ 【3. Generate】                       │
│ LLM 基於注入的知識生成答案             │
└──────────────────────────────────────┘
```

R + A + G = **Retrieve（檢索）→ Augment（增強 prompt）→ Generate（生成）**。

### 典型的 RAG 架構元件

| 元件 | 做什麼 | 常見實作 |
|------|-------|---------|
| **Document Loader** | 把 PDF / Notion / 網頁讀進來 | LangChain loaders、LlamaIndex readers |
| **Text Splitter / Chunker** | 切成適合檢索的小段 | RecursiveCharacterSplitter, semantic chunking |
| **Embedder** | 把文字轉向量 | OpenAI embeddings, Voyage, Cohere |
| **Vector Store** | 存 + 搜尋向量 | Qdrant, pgvector, Pinecone, Weaviate |
| **Retriever** | 收到 query 去找相關 chunks | 可以是 vector / BM25 / hybrid |
| **Reranker**（選配）| 精排 | Cohere Rerank, bge-reranker |
| **LLM** | 拿檢索結果生成答案 | Claude, GPT, Gemini |

> ⚠️ 你會發現 —— **這些元件和 Mem0 的五大 Factory 高度重疊**（Embedder、VectorStore、LLM、Reranker）。這不是巧合，**因為 memory layer 其實就是「把 RAG 拿來應用到對話歷史」**，下節會展開講。

---

## 2. RAG 和 Memory 的分水嶺 —— 資料本質不同

表面看兩邊都是「外部存儲 + 語意檢索 + 注入 prompt」，但**資料的本質**差很多：

| 維度 | **RAG** | **Memory**（Mem0 / text2mem） |
|------|---------|--------------------------------|
| **資料來源** | 外部**知識**：文件、網頁、PDF、wiki | **對話歷史**：使用者講過什麼、Agent 做過什麼 |
| **目標** | 「**拓展知識**」答出訓練資料沒涵蓋的事 | 「**延續情境**」記住使用者是誰、偏好、承諾 |
| **資料生命** | 相對**靜態**（文件更新才改） | **動態演化**（使用者改口就要 UPDATE/DELETE）|
| **寫入頻率** | 一次性/批次建庫 | **每次對話都可能要寫** |
| **粒度** | **文件 chunk**（200~1000 字的段落） | **單條事實**（「user 住台北」這種原子粒度） |
| **ID 管理** | `document_id`、`chunk_id` | `memory_id` + `user_id` / `agent_id` |
| **使用者隔離** | 通常**共用庫**（公司知識全員共享） | **強綁 user_id**（abby 的記憶 ≠ bob 的記憶） |
| **生命週期** | 文件過時 → 重新 embed | **ENC / STO / RET 三階段**，有 Summarize/Merge/Expire |
| **典型 query** | 「我們公司的退款政策？」<br>「這個 API 怎麼用？」 | 「我上次說我住哪？」<br>「你剛剛幫我訂的航班幾點？」|
| **衝突處理** | 一般沒這問題（文件就是事實） | **必要**（「我搬家了」要蓋掉舊地址）|

### 一句話區分

> **RAG 解決「LLM 不知道這件事」；Memory 解決「LLM 忘了你是誰」。**

---

## 3. 但架構上為何這麼像？—— 因為 Memory 是「特化版的 RAG」

看 Mem0 的檢索流程（參考 `mem0-benchmark-and-architecture.md`）：

```
使用者問題
    │
    ├── 語意相似度（embedding）
    ├── 關鍵字匹配（BM25）
    └── 實體匹配（NER）
         │
         ▼
    top-k 事實 → 塞進 prompt → LLM 生成
```

這**就是 RAG 的流程**——只是把「文件 chunks」換成「抽取出的事實」。

### 技術繼承關係

```
    RAG（2020 Lewis et al.）
          │
          │ 把 LLM 的「長期記憶」外包給外部存儲
          │
          ├────────────────────────┐
          │                        │
          ▼                        ▼
  傳統 RAG 應用           Memory Layer（Mem0 / text2mem）
  （文件問答）            （對話記憶）
          │                        │
  處理：靜態知識          處理：動態對話事實
  粒度：chunks            粒度：atomic facts
  更新：重建庫            更新：ADD/UPDATE/DELETE/NOOP
```

**Memory layer 借用了 RAG 的檢索+注入機制，但在資料處理上加了一層「事實抽取 + 衝突解決」**，因為對話資料本質上更混亂、更會變。

---

## 4. 對照 text2mem 的三階段視角

text2mem 借用認知心理學的 **ENC / STO / RET**（編碼 / 儲存 / 提取）分法。拿來看 RAG 和 Memory：

### RAG 的三階段對應

| 階段 | RAG 做什麼 | 對應的 RAG 元件 |
|------|-----------|----------------|
| **ENC（編碼 / 寫）** | 文件切 chunk → embed → 存 vector store | DocumentLoader + Splitter + Embedder + VectorStore.add |
| **STO（儲存期間）** | **幾乎啥都不做**——文件就擺著 | （大多沒有這層） |
| **RET（提取 / 讀）** | query → embed → top-k → 注入 prompt | Retriever + Reranker |

### Memory 的三階段對應

| 階段 | Memory 做什麼 | 對應的 Memory 元件 |
|------|--------------|------------------|
| **ENC** | 對話 → LLM 抽取事實 → 存 vector + graph | Extractor + Embedder + dual store |
| **STO** | **Summarize / Merge / Expire / Lock** ← **Memory 的創新點** | text2mem 的 7 個 STO 操作 |
| **RET** | 多信號檢索（語意 + 關鍵字 + 實體）| 三路 retriever + fusion |

### 關鍵洞察

> **RAG 幾乎沒有 STO 階段** —— 這就是為什麼 RAG 搞不定對話記憶，因為**對話事實會演化**（搬家、改偏好、食物過敏好了），**必須有 STO 層去維護**。Memory layer 加了這層，成本是「每次 ADD 都要跑一次 LLM 做衝突判斷」。

這也回應了 mem0 筆記裡講的**「ADD 階段的 token 成本線性成長」**——RAG 沒這煩惱（文件就擺著不管），Memory 有。

---

## 5. 實務上什麼時候用哪個？

### ✅ 用 RAG 的情境

- **內部文件問答**：「公司的請假政策是什麼？」
- **知識庫客服**：「這個錯誤代碼是什麼意思？」
- **法律 / 醫學 / 學術**：需要引用權威資料回答
- **最新資訊**：LLM 訓練截止後的新聞、股價、賽事

### ✅ 用 Memory 的情境

- **個人助理**：「幫我訂跟上次一樣的位置」
- **多輪客服**：使用者跨 session 回來繼續之前的抱怨
- **Agent 產品**：跨天跨裝置記住使用者偏好
- **長期陪伴型 app**：教練 / 健身 / 學習追蹤

### ✅ 兩個都要用的情境（最常見！）

**真實產品幾乎都是 RAG + Memory 混用**。例子：

```
使用者（abby，第 37 次對話）：「幫我訂一杯飲料」

Memory 提供： [abby 不喝含糖飲料]  [abby 偏好冷飲]
RAG 提供：    [今日菜單：美式 $60 / 冷萃 $80 / 氣泡水 $50]

LLM 組合兩邊資訊：「幫你訂冷萃好嗎？無糖冷飲、今天 $80」
```

- **Memory** 負責「知道 abby 是誰」
- **RAG** 負責「知道今天店裡有什麼」
- 兩邊都把結果注入 prompt，LLM 做最終生成

這也是為什麼 Mem0 的 Factory 設計裡有 Embedder/VectorStore/Reranker——**這些元件同時也是標準 RAG stack 的元件**，同一組基礎設施可以兩用。

---

## 6. RAG 的官方資源

### 學術源頭
- **原論文**：Lewis et al. 2020，*"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"*
- arXiv：<https://arxiv.org/abs/2005.11401>
- 出自 Meta AI（當時還叫 Facebook AI Research）

### 主要廠商 / 框架的 RAG 指南

| 來源 | 連結 | 定位（注意看） |
|------|------|--------------|
| **LlamaIndex** | <https://docs.llamaindex.ai> | ✅ **最接近「RAG 官方指南」**——整家公司定位就是做 RAG 框架 |
| **LangChain** | <https://python.langchain.com/docs/tutorials/rag/> | ✅ **RAG pipeline 完整 tutorial** |
| **Hugging Face** | <https://huggingface.co/docs/transformers/model_doc/rag> | ✅ RAG 模型本身的 HF 實作 |
| **OpenAI** | <https://platform.openai.com/docs/guides/retrieval> | OpenAI 的 retrieval 實踐 |
| **Anthropic prompt caching** | <https://docs.claude.com/en/docs/build-with-claude/prompt-caching> | ⚠️ **不是 RAG 指南，是 RAG 省錢技巧**——Prompt Caching 在 RAG 場景剛好最有用，所以示範用 RAG 例子 |

> ⚠️ 沒有「RAG 的唯一官方 DOC」——**RAG 是技術概念不是產品**，誰都能實作、每家文件都只代表自家作法。要**看懂原理**讀 2020 論文最準；要**上手寫 code** 看 LlamaIndex 或 LangChain。
>
> Anthropic 那份其實是講 Prompt Caching，但因為 RAG（把長文件塞進 prompt）是 Prompt Caching 最大的受益者，所以整頁範例幾乎都是 RAG 場景。想搞懂 RAG 怎麼**省錢**看它，想搞懂 RAG 怎麼**做**看 LlamaIndex。

---

## 7. 給自己的 TL;DR

1. **Retrieval 中文統一用「檢索」** —— 索引（Index）是資料結構、召回（Recall）是搜尋系統內部某一階段，都不是正名。
2. **RAG = 檢索 + 注入 prompt + 生成** —— 拓展 LLM 的「知識」。
3. **Memory layer = 特化版 RAG** —— 把對話抽成事實存、再取，拓展 LLM 的「情境」。
4. **差別的關鍵在 STO 階段** —— RAG 幾乎沒有，Memory 有 Summarize/Merge/Expire 等操作去維護動態事實。
5. **實務產品幾乎都是 RAG + Memory 同時用** —— Memory 記「你是誰」，RAG 記「世界是什麼」。
6. **基礎設施可共用** —— Embedder、VectorStore、Reranker 這組 stack 兩邊都要。

---

## 相關筆記

- [llm-caching-layers.md](llm-caching-layers.md) — LLM 三層快取（Semantic Cache / Prompt Caching / KV Cache），含 KV Cache 完整原理
- [mem0-benchmark-and-architecture.md](mem0-benchmark-and-architecture.md) — Mem0 的六個設計與五大 Factory
- [text2mem-12-atomic-operations.md](text2mem-12-atomic-operations.md) — 12 個原子操作 + ENC/STO/RET 三階段
