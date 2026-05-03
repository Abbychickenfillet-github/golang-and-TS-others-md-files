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

## 0.5 Index 長什麼樣子？—— 向量索引的資料結構

> **常見誤解**：很多人以為 vector index 就是「一串 vector 排好放著」（像 `[1, 5, ...]`），其實**完全不是**。
> Index 是建在向量集合**之上**的**另一層資料結構**，目的是讓查詢時**避免逐一比對**所有向量。

### 為什麼非用 Index 不可

假設 vector store 有 1,000 萬條 1536 維向量：

| 方式 | 比對次數 | 時間量級 |
|------|---------|---------|
| **Brute force（沒 index）** | 1,000 萬次 cosine 相似度 | 數秒~數十秒 |
| **HNSW（有 index）** | 幾百次（圖跳轉） | 數毫秒 |

差三~四個數量級——所以**任何能用的 vector store 一定都建了 index**，只是用哪一種而已。

---

### 主流 Vector Index 家族

#### 🌐 HNSW (Hierarchical Navigable Small World) — 目前最主流

**結構**：多層圖（multi-layer graph），每個節點連到一些鄰居。

```
  Layer 2:   ●─────────────●            ← 稀疏層、長距離連線（快速跳）
            /               \
  Layer 1: ●──●─────●──●───●            ← 中等密度
          / /       \ \  \
  Layer 0:●─●─●─●─●─●─●─●─●             ← 所有節點都在這層、短距離連線（精確）
```

**節點實際存的內容**：`(向量本身, [layer0 鄰居 IDs], [layer1 鄰居 IDs], ...)`
所以一個節點不只是個向量，還帶著一份「鄰居名單」。

**搜尋過程**（貪婪走圖）：
1. 從最上層入口節點出發
2. 在當前層的鄰居裡找**離 query 最近**的，跳過去
3. 跳不動（沒有更近的鄰居）→ 下到下一層繼續
4. 走到 layer 0 → 就是答案

**主要使用者**：Qdrant、Weaviate、pgvector (HNSW 模式)、Milvus、Elasticsearch 8.x+

**論文**：Malkov & Yashunin 2016 — *"Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs"*
arXiv：<https://arxiv.org/abs/1603.09320>

---

#### 📦 IVF (Inverted File Index)

**結構**：先用 K-means 把全部向量分成 K 群，存「群中心 → 該群的向量 IDs」倒排表。

```
建索引時（離線跑一次）：
  1000 萬向量 → K-means → 1024 個群中心 (centroids)
  + 倒排表：
    centroid_0 → [vec_id_3, vec_id_17, vec_id_88, ...]
    centroid_1 → [vec_id_5, vec_id_42, ...]
    ...

查詢時：
  query → 算跟 1024 個 centroid 的距離
        → 取最近的 nprobe 個 cluster（例如 8 個）
        → 只在這 8 個 cluster 內找 top-K
```

**速度估算**：原本要算 1000 萬次，現在算 `1024 + 1000萬 × 8/1024 ≈ 8.1 萬次`，快約 100 倍。

**主要使用者**：FAISS、Milvus、pgvector (ivfflat 模式)

**論文**：Johnson, Douze, Jégou 2017 — *"Billion-scale similarity search with GPUs"*（FAISS）
arXiv：<https://arxiv.org/abs/1702.08734>

---

#### 🗜 PQ (Product Quantization) / IVF-PQ

**結構**：把高維向量**壓縮**成短碼，省記憶體 + 加速距離計算。

```
原始向量：1536 dim × float32 = 6,144 bytes
   │
   ├── 切成 M=64 段子向量（每段 24 維）
   │
   ▼
每段獨立做 K-means → 256 個 codebook
   │
   ▼
壓縮後：64 個 1-byte 整數 = 64 bytes      ← 壓縮 96 倍
```

**為什麼快**：用「查表」（lookup table）算近似距離，比直接算 float 點積快很多。

**通常與 IVF 組合 → IVF-PQ**，FAISS 的經典配方，億級向量首選。

**論文**：Jégou, Douze, Schmid 2011 — *"Searching in One Billion Vectors: Re-rank With Source Coding"* / *"Product Quantization for Nearest Neighbor Search"* (TPAMI)
PDF：<https://lear.inrialpes.fr/pubs/2011/JDS11/jegou_searching_with_quantization.pdf>

---

#### #️⃣ LSH (Locality-Sensitive Hashing)

**結構**：設計一族 hash 函數，讓**相近的向量大機率被 hash 到同一個 bucket**。

```
hash_fn_1: vec → bucket_id   ┐
hash_fn_2: vec → bucket_id   ├── 多張 hash table
hash_fn_3: vec → bucket_id   ┘

查詢時：query 算 hash → 只看同 bucket 的向量
```

**現況**：較早期方法（1998 提出），高維場景多被 HNSW / IVF-PQ 取代，但仍是 ANN 的**理論奠基**。

**論文**：Indyk & Motwani 1998 — *"Approximate Nearest Neighbors: Towards Removing the Curse of Dimensionality"* (STOC 1998)
PDF：<https://www.cs.princeton.edu/courses/archive/spring04/cos598B/bib/IndykM-curse.pdf>

---

#### 🚀 ScaNN / DiskANN — 大規模專用

**ScaNN**（Google）：量化 + 學習型分群，在 ann-benchmarks 多項指標領先。
論文：Guo et al. 2020 — *"Accelerating Large-Scale Inference with Anisotropic Vector Quantization"* (ICML 2020)
arXiv：<https://arxiv.org/abs/1908.10396>

**DiskANN**（Microsoft）：圖索引**放 SSD 而不是 RAM**，**單機處理 10 億向量**。
論文：Subramanya et al. 2019 — *"DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node"* (NeurIPS 2019)
PDF：<https://suhasjs.github.io/files/diskann_neurips19.pdf>

---

#### 📋 Flat（不建 index，老實逐一算）

**結構**：就是個向量陣列，brute force 比對。

**何時可用**：資料量 < 10 萬時，brute force 反而**比 ANN 準確**（沒有近似誤差）且夠快。

**注意**：pgvector 預設就是 Flat，要 `CREATE INDEX ... USING hnsw` 才會建索引。

---

### 對照：BM25 全文檢索的 Inverted Index

關鍵字檢索（BM25）用的 index 完全不是向量類，叫**倒排索引 (inverted index)**：

```
"退款" → [doc_3, doc_17, doc_42, ...]    （詞 → 包含這個詞的所有 doc IDs）
"政策" → [doc_3, doc_8, doc_42, ...]
"假期" → [doc_5, doc_99, ...]
```

**主要實作**：Lucene → Elasticsearch / OpenSearch、Tantivy (Rust)、Whoosh (Python)

**經典教科書**：Manning, Raghavan, Schütze — *Introduction to Information Retrieval*（Stanford，**免費全文**）
<https://nlp.stanford.edu/IR-book/>

---

### Index 選型速查表

| 資料量 | 主流選擇 | 原因 |
|--------|----------|------|
| < 10 萬 | **Flat** | brute force 夠快、無近似誤差 |
| 10 萬 ~ 1000 萬 | **HNSW** | 速度/準確度/記憶體平衡最好 |
| 1000 萬 ~ 1 億 | **IVF-PQ** | 記憶體吃不消，需要量化壓縮 |
| 1 億 ~ 10 億+ | **DiskANN / ScaNN** | 必須放 SSD 或極致量化 |

---

### 想實際比較？看 ANN-Benchmarks

業界公認的 benchmark：<https://ann-benchmarks.com/>

把 HNSW、IVF-PQ、ScaNN、Annoy、Faiss 等十幾種 index 在 SIFT、GIST、GloVe 等 dataset 上跑 **recall vs QPS** 曲線，可以直接看到「同樣準確度下誰最快」。

---

### 一句話收斂

> **Embedding model 產出向量，Index 是為這些向量建的「目錄」（圖 / 分群 / hash 等資料結構），讓 query 不用線性掃整個庫。**

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
