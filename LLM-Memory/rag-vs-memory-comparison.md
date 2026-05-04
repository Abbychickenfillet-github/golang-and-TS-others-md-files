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

### 📖 前置詞彙速懂（dim / 近似距離）

讀本節前先建立兩個關鍵詞概念，後面會反覆出現：

#### 「dim」是什麼？

**dim = dimension = 維度**——一個向量裡有幾個數字。

```
[0.1, 0.2, 0.3]                              ← 3-dim（3 個數字）
[0.1, 0.2, 0.3, 0.4, 0.5]                    ← 5-dim
[0.1, 0.2, ..., 0.9]   （共 1536 個數字）    ← 1536-dim
```

物理世界的 2D（平面 x, y）/ 3D（空間 x, y, z）就是 2-dim / 3-dim。**向量空間是同個概念延伸到更高維**，只是人類想像不出來 1536 維長什麼樣，但數學上完全一樣。

實務常見維度：

| Embedding model | 維度 |
|-----------------|------|
| OpenAI `text-embedding-3-small` | **1536-dim** |
| OpenAI `text-embedding-3-large` | **3072-dim** |
| BERT base | **768-dim** |
| GloVe-100 | **100-dim** |

**換算記憶體**：一條 1536-dim 向量 = 1536 個 float × 4 bytes = **6,144 bytes**。

#### 「近似距離 (approximate distance)」是什麼？

不是真正算出來的距離，是**用查表方式快速估算**的距離，**快但不 100% 準**。

| 類型 | 怎麼算 | 速度 | 準確度 |
|------|--------|------|--------|
| **精確距離** | 兩個原始向量直接算 cosine / Euclidean | 慢（每次算 1536 次浮點乘法） | 100% 精確 |
| **近似距離** | 查預先建好的 lookup table → 加總 | 快（每次幾十次查表） | ~95% 接近精確值 |

**ANN (Approximate Nearest Neighbor)** 的「**A**」就是 Approximate（近似）的意思——**搜尋本身就允許不完美**，換來巨大速度提升。

實務上：
- 真正最近的 10 個鄰居：A, B, C, D, E, F, G, H, I, J
- 近似距離搜出的 10 個：A, B, C, D, E, **K**, G, H, **L**, J  ← recall 80%

→ 漏 2 個多 2 個，但**速度快 100 倍**——大部分場景這個 trade-off 完全划算。

→ 後面 PQ 章節的 **ADC** 就是「近似距離」的代表算法。

---

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

**實際資料長相**（pseudo-JSON）：

```python
hnsw_index = {
    "entry_point": 891,                                  # 最上層的入口節點 ID
    "max_level": 3,
    "nodes": {
        12345: {
            "vector": [0.23, -0.45, ..., 0.07],         # 1536 個 float
            "level": 2,                                  # 此節點存在到 layer 2
            "neighbors": {
                0: [42, 891, 15, 203, 7, 1024, ...],   # layer 0 鄰居（最多 M=16 個）
                1: [891, 7, 1024],                      # layer 1 鄰居
                2: [891]                                # layer 2 鄰居
            }
        },
        42: {
            "vector": [0.18, 0.33, ...],
            "level": 0,                                  # 只存在 layer 0
            "neighbors": { 0: [12345, 88, 203, ...] }
        },
        # ... 1000 萬個節點
    }
}
```

每個節點不只是個向量，**還帶一份鄰居名單**——這就是讓搜尋「跳鄰居」能跑起來的關鍵。

**主要使用者**：Qdrant、Weaviate、pgvector (HNSW 模式)、Milvus、Elasticsearch 8.x+

**論文**：Malkov & Yashunin 2016 — *"Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs"*
arXiv：<https://arxiv.org/abs/1603.09320>

##### 常見混淆：HNSW 的 graph vs LangGraph？

抽象層都是 graph（節點 + 邊），但**本質目的完全不同**：

| 對照 | HNSW | LangGraph |
|------|------|-----------|
| **節點代表** | 一個向量資料點 | 一個執行單元（LLM call / tool call） |
| **邊代表** | 鄰近關係（空間靠近） | 控制流轉移（這步跑完跳哪） |
| **目的** | 加速最近鄰搜尋（**檢索**） | 編排 agent 工作流程（**執行**） |
| **性質** | 靜態資料結構 | 動態 workflow / state machine |
| **有 state？** | ❌ 圖建好就不動 | ✅ State 在節點間流轉、被修改 |
| **走訪邏輯** | 貪婪搜尋（往最近鄰跳） | conditional edge（看 state 決定下一步） |

**類比**：
- HNSW 的 graph 像**捷運路線圖**——告訴你「淡水站」最近的站是「紅樹林」「竹圍」，幫你找鄰居
- LangGraph 像**料理食譜流程圖**——告訴你「炒完肉若鹹度夠就上桌，否則加水再煮」

**唯一共通點**：都建立在圖論基礎上，「節點 + 邊」抽象 + 走訪概念（BFS/DFS/貪婪）的數學語彙可共用。但**不會**拿 HNSW 編排 agent，也**不會**拿 LangGraph 做向量檢索。

> 一句話：**HNSW 的 graph 是「資料的空間地圖」，LangGraph 是「程式的執行流程圖」。**

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

**實際資料長相**（pseudo-JSON）：

```python
ivf_index = {
    "centroids": [                              # K-means 分群中心
        [0.1, 0.2, ..., 0.5],                  # centroid_0 (1536 dim)
        [0.5, -0.3, ..., 0.2],                 # centroid_1
        # ... 共 1024 個 centroid
    ],
    "inverted_lists": {                         # 群中心 ID → 該群的向量 IDs
        0: [3, 17, 88, 234, 1099, ...],       # cluster 0 含哪些向量
        1: [5, 42, 76, ...],
        # ... 1024 個 lists
    },
    "raw_vectors": {                            # 還是要存原始向量（精算距離用）
        3:  [...],
        17: [...],
        # ... 1000 萬條
    }
}
```

**重點**：**centroid 表 + 倒排清單**就是 IVF 的本體，原始向量還是要留著（用來精算距離）。

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

**為什麼快**：用「查表」（lookup table）算**近似距離**，比直接算 float 點積快很多。

> 💡 **什麼是「近似距離」？** 不是兩個原始向量直接算 cosine/Euclidean，是用**預先建好的 distance table 查表加總**得出的估算值。99% 接近真實距離但速度快 100 倍。
> 詳細概念見上方 [前置詞彙速懂](#-前置詞彙速懂dim--近似距離)，計算過程見本節下方 [ADC — Asymmetric Distance Computation](#3️⃣-查詢階段adc--asymmetric-distance-computation)。

**通常與 IVF 組合 → IVF-PQ**，FAISS 的經典配方，億級向量首選。

---

##### 為什麼叫「Product」Quantization？

「Product」來自**笛卡爾積 (Cartesian product)**。

如果直接對整個 1536 維向量做 K-means，要表達夠細緻得有 `256^1536` 個碼字——記憶體爆炸不可能。

PQ 的核心 trick：**把空間「拆」成 M 個獨立子空間，各自做小規模量化**。最終可表達的不同向量數 = `256 × 256 × ... × 256`（M 次）= `256^M` 種，但實際儲存的碼字只有 `M × 256` 個。

數字感受（M=64）：

| 方式 | 可表達向量數 | 實際儲存的碼字 |
|------|-------------|----------------|
| 整個向量做 K-means (k=256) | 256 個 | 256 個 ✓ |
| **PQ (M=64, k=256)** | **256⁶⁴ ≈ 10¹⁵⁴** | 64 × 256 = 16,384 個 ✓ |

→ 用很少的儲存空間，表達「組合爆炸」級的向量數。這就是 product 的意義。

---

##### 三步驟詳解

**1️⃣ 訓練階段（建 codebook）**

對每個子空間 m = 0, 1, ..., M-1：
- 取所有訓練向量的「第 m 段（24 維）」
- 在這 24 維空間跑 K-means (k=256)
- 得到 256 個中心點 → 這就是 `codebook_m`

```
訓練資料 1000 萬條 1536-dim 向量
        │
        ▼ 切成 64 段
每段都是 1000 萬條 24-dim 向量
        │
        ▼ 各段獨立 K-means
對「第 0 段」跑 K-means → codebook_0  (256 個 24-dim 中心)
對「第 1 段」跑 K-means → codebook_1
...
對「第 63 段」跑 K-means → codebook_63
```

**2️⃣ Encoding（壓縮儲存）**

對每個要存的向量 v（1536-dim）：
- 切成 64 段子向量 v_0, v_1, ..., v_63（每段 24 維）
- 對每段 v_m，找 codebook_m 中**最近的中心點 ID**（0~255）
- 把這 64 個 ID 串起來 → **64 bytes 的 PQ code**

```
v = [0.23, -0.45, ..., 0.07]   (1536 dim)
       ▼ 切成 64 段
v_0  = [0.23, -0.45, ..., 0.11]   → 找 codebook_0  最近 → 中心 #42
v_1  = [0.18,  0.33, ..., -0.21]  → 找 codebook_1  最近 → 中心 #7
...
v_63 = [0.07, ..., 0.02]          → 找 codebook_63 最近 → 中心 #199
       ▼
PQ code = bytes([42, 7, ..., 199])   ← 64 bytes
```

**3️⃣ 查詢階段（ADC — Asymmetric Distance Computation）**

PQ 厲害的地方：**query 是 full precision，DB 是壓縮的，能高速算近似距離**。「Asymmetric」指的就是 query / DB 兩邊精度不對稱。

**步驟 A — 建 distance table（每個 query 只做一次）**

對 query 向量 q：
- 切成 64 段 q_0, q_1, ..., q_63
- 對每個 m，預先算 q_m 跟 codebook_m 中所有 256 個中心的距離
- 結果是 `64 × 256` 的查表（distance table），約 64 KB

```
distance_table[m][c] = || q_m - codebook_m[c] ||²

m =  0: [d(q_0, c_0),  d(q_0, c_1),  ..., d(q_0, c_255)]   ← 256 個 float
m =  1: [d(q_1, c_0),  d(q_1, c_1),  ..., d(q_1, c_255)]
...
m = 63: [d(q_63, c_0), d(q_63, c_1), ..., d(q_63, c_255)]
```

**步驟 B — 對每個 DB 向量算近似距離（純查表 + 加總）**

對每個 DB 向量的 PQ code = `[42, 7, ..., 199]`：

```
approx_dist(q, v) = distance_table[0][42]
                  + distance_table[1][7]
                  + ...
                  + distance_table[63][199]
```

**全程沒做任何浮點數乘法，純 64 次 lookup + 加法**——這就是 PQ 速度的根源。

---

##### 具體數字：100 萬條 1536-dim 向量

| 指標 | 沒 PQ | 有 PQ (M=64) | 倍數 |
|------|-------|-------------|------|
| **記憶體** | 1M × 1536 × 4 byte = **5.7 GB** | 1M × 64 byte = **61 MB** | **96×** 壓縮 |
| **每查詢 ops** | 1M × 1536 次浮點乘法 ≈ 1.5G ops | 1M × 64 次查表 + 加總 = 64M ops | **24×** 加速 |
| **準確度** | 100% 精確 | recall ~85-95%（近似） | 視 M、nbits 調整 |

→ PQ 是**用準確度換記憶體 + 速度**，億級向量場景幾乎是必選。

---

##### 可調參數

| 參數 | 意思 | 典型值 | 影響 |
|------|------|--------|------|
| **M** | 切幾段子向量 | 8, 16, 32, **64** | M ↑ → 準確度 ↑、計算 ↑、code 變長 |
| **nbits** | 每段用幾 bits 編碼 | **8** (= 256 碼字) | nbits ↑ → 準確度 ↑、記憶體 ↑ |
| **PQ code 大小** | 壓縮後一個向量幾 bytes | `M × nbits / 8` | M=64, nbits=8 → 64 bytes |

**經驗法則**：
- D 維向量切成 M = D/4 段（每段 4 ~ 32 維最佳）
- nbits 幾乎都用 8（256 碼字）
- 準確度不夠 → 提高 M 或結合 IVF 做 IVF-PQ

---

##### 實際資料長相（pseudo-JSON）

```python
pq_index = {
    "codebooks": [                              # 64 段，每段 256 個碼字
        [                                       # codebook_0（第 0 段子向量的 256 種樣式）
            [0.1, 0.2, ..., 0.3],              # 24 維（原向量第 0 段）
            [0.5, -0.1, ..., 0.7],
            # ... 256 個 24-dim 向量
        ],
        # ... 共 64 個 codebook
    ],
    "encoded_vectors": {                        # 每個原向量壓縮成 64 個 byte
        1: bytes([42, 7, 199, 0, 88, ..., 33]),  # 64 bytes（本來 6144 bytes）
        2: bytes([11, 200, 4, ...]),
        # ...
    }
}
```

---

##### IVF-PQ — FAISS 的億級配方

PQ 單獨用其實還是要對所有 DB 向量算近似距離（雖然每次只是查表），1 億條向量還是 1 億次查表。

→ 跟 IVF 組合：**IVF 先快速縮小範圍到 nprobe 個 cluster，PQ 在這些 cluster 裡的向量上算近似距離**。

```
查詢流程（IVF-PQ）：
  query
    │
    ▼
  IVF: 比對 1024 個 centroid → 取最近 8 個 cluster
    │
    ▼
  範圍縮小到約 1 億 × 8/1024 ≈ 78 萬條向量
    │
    ▼
  PQ: 對這 78 萬個 PQ code 查表算近似距離
    │
    ▼
  取 top-K
```

**FAISS 經典命名**：`IVF1024,PQ64x8` = 1024 個 IVF cluster + PQ 切 64 段 + 每段 8 bits。

---

##### PQ 家族變體

| 變體 | 改進點 | 何時用 |
|------|-------|--------|
| **OPQ** (Optimized PQ) | 訓練時先學一個旋轉矩陣，讓向量分佈更適合切段 | 子空間相關性強時提升 recall |
| **RVQ** (Residual VQ) | 量化殘差再量化 → 多階段壓縮 | 想更高壓縮率 |
| **AQ** (Additive Quantization) | 更一般化的版本 | 學術研究用 |
| **ScaNN's anisotropic VQ** | 針對「最近鄰排序」優化的量化 | Google 大規模場景 |

---

**怎麼算距離（總結）**：query 切成 M 段 → 對 codebook 預算 distance table → 對每個 DB 向量的 M-byte code 做 M 次查表加總。**全程不碰原始 float vector**，所以才快。

**論文**：Jégou, Douze, Schmid 2011 — *"Product Quantization for Nearest Neighbor Search"* (TPAMI)
PDF：<https://lear.inrialpes.fr/pubs/2011/JDS11/jegou_searching_with_quantization.pdf>

**OPQ 論文**：Ge et al. 2013 — *"Optimized Product Quantization"* (CVPR)
PDF：<https://kaiminghe.github.io/publications/cvpr13opq.pdf>

**FAISS 入門教學**：Pinecone 寫得很好的教學系列 — <https://www.pinecone.io/learn/series/faiss/product-quantization/>

---

#### #️⃣ LSH (Locality-Sensitive Hashing)

**結構**：設計一族 hash 函數，讓**相近的向量大機率被 hash 到同一個 bucket**。

```
hash_fn_1: vec → bucket_id   ┐
hash_fn_2: vec → bucket_id   ├── 多張 hash table
hash_fn_3: vec → bucket_id   ┘

查詢時：query 算 hash → 只看同 bucket 的向量
```

**實際資料長相**（pseudo-JSON）：

```python
lsh_index = {
    "hash_tables": [
        {                                       # 第 1 張 hash table
            (0, 1, 1, 0, 1): [3, 88, 1024],   # bucket key (位元串) → 該桶向量 IDs
            (1, 0, 0, 1, 1): [17, 42, 99],
            # ...
        },
        {                                       # 第 2 張 hash table
            (1, 1, 0, 1, 0): [5, 88, 234],
            # ...
        },
        # ... 通常 5 ~ 20 張 table
    ]
}
```

**怎麼搜**：query 算多組 hash → 看每張 table 裡同 bucket 的向量 → 對這些候選做精算。

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

#### 為什麼叫「倒排」？

「**正排 (forward index)**」 vs 「**倒排 (inverted index)**」是兩種**相反**的組織方式：

| 類型 | 組織方式 | 結構 | 適合查什麼 |
|------|---------|------|-----------|
| **正排 (forward)** | docID → 這篇文件包含哪些詞 | `doc_1 → ["Caesar", "conquered", "Gaul"]` | 「給我 doc_1 的內容」 |
| **倒排 (inverted)** | 詞 → 哪些文件包含這個詞 | `"Caesar" → [doc_1, doc_2, doc_3]` | 「哪些文件含 Caesar？」 |

**為什麼叫「倒」？** 因為它把「文件 → 詞」這個自然方向**翻轉**成「詞 → 文件」。

**為什麼搜尋要用倒排？** 因為查詢時是「拿著詞找文件」（使用者輸入「Caesar」要找含這個詞的所有文件）。如果用正排，得逐篇文件掃描，O(N) 慢死；用倒排直接 O(1) 拿到答案清單。

```
查 "Caesar AND killed"
  ▼
倒排索引：
  Caesar → [1, 2, 3]
  killed → [2]
  ▼
取交集 → [2]   ← 直接得到答案
```

→ **倒排索引是搜尋引擎的根本資料結構**，Google、Elasticsearch、Lucene 全部都靠它。

#### 補充：倒排索引怎麼建？

來自 Stanford IR Book Chapter 1 / 4。**Nonpositional index**（不記錄詞位置的版本）建構三步驟：

##### Step 1 — 蒐集所有 (term, docID) 配對

```
doc_1: "Caesar conquered Gaul"
doc_2: "Brutus killed Caesar"
doc_3: "Caesar was great"
        ▼
[(Caesar, 1), (conquered, 1), (Gaul, 1),
 (Brutus, 2), (killed, 2), (Caesar, 2),
 (Caesar, 3), (was, 3), (great, 3)]
```

##### Step 2 — 排序（term 為主鍵、docID 為次鍵）

```
[(Brutus, 2), (Caesar, 1), (Caesar, 2), (Caesar, 3),
 (Gaul, 1), (conquered, 1), (great, 3), (killed, 2), (was, 3)]
```

##### Step 3 — 合併成 postings list + 計算統計

```
Brutus    → df=1  → [2]
Caesar    → df=3  → [1, 2, 3]      ← 三篇都出現
Gaul      → df=1  → [1]
conquered → df=1  → [1]
great     → df=1  → [3]
killed    → df=1  → [2]
was       → df=1  → [3]
```

`df` = document frequency（多少篇文件包含這個詞），用來算 TF-IDF / BM25 評分。

##### Nonpositional vs Positional Index

| 類型 | 記錄什麼 | 用途 |
|------|----------|------|
| **Nonpositional** | 「哪些 docID 包含這個詞」 | 一般檢索、TF-IDF / BM25 評分 |
| **Positional** | 「在 docID 的第幾個位置」 | Phrase search（"machine learning" 要相鄰）、proximity search |

Positional 範例：

```
Caesar → [doc_1: [pos 0],  doc_2: [pos 2],  doc_3: [pos 0]]
                  ↑              ↑              ↑
               第 0 個字       第 2 個字       第 0 個字
```

##### 大資料怎麼辦？BSBI / SPIMI

> "For small collections, all this can be done in memory" ——這句話是個伏筆。

當 collection 太大（例如整個 web、Wikipedia），(term, docID) 配對放不進記憶體。三大解法：

| 方法 | 核心 idea |
|------|-----------|
| **BSBI** (Blocked Sort-Based Indexing) | 切 block → 每塊在記憶體 sort → 寫磁碟成 sorted runs → 最後 external merge sort |
| **SPIMI** (Single-Pass In-Memory Indexing) | 不需排序，每塊直接在記憶體建小索引，最後合併（更快） |
| **MapReduce / 分散式** | 多機平行，map 階段切 token、reduce 階段合 postings（Google / Hadoop 風格） |

`BSBI` 跟資料庫的 **external sort** 是同個概念。

##### 對照向量索引建構

| 維度 | 倒排索引 BSBI | 向量索引 HNSW/IVF |
|------|---------------|-------------------|
| 建索引瓶頸 | **排序** + I/O | **計算 K-means / 圖鄰居** |
| 大資料解法 | 切 block → external sort | 切 shard → distributed build |
| 全部讀完才能查 | ✅ 是 | ✅ 是 |

兩種 index 的「建」階段都很重——這也是為什麼 ANN-Benchmarks 圖會有「Recall vs **Build time**」這項指標。

---

### Index 選型速查表

| 資料量 | 主流選擇 | 原因 |
|--------|----------|------|
| < 10 萬 | **Flat** | brute force 夠快、無近似誤差 |
| 10 萬 ~ 1000 萬 | **HNSW** | 速度/準確度/記憶體平衡最好 |
| 1000 萬 ~ 1 億 | **IVF-PQ** | 記憶體吃不消，需要量化壓縮 |
| 1 億 ~ 10 億+ | **DiskANN / ScaNN** | 必須放 SSD 或極致量化 |

---

### 一句話收斂

> **Embedding model 產出向量，Index 是為這些向量建的「目錄」（圖 / 分群 / hash 等資料結構），讓 query 不用線性掃整個庫。**

---

## 0.6 怎麼讀 ANN-Benchmarks 的圖

> **ANN-Benchmarks** 是業界公認的 ANN 演算法 benchmark：<https://ann-benchmarks.com/>
> **範例頁面**：<https://ann-benchmarks.com/glove-100-angular_10_angular.html>
> 這節教怎麼解讀這類頁面，幫助你在實務上挑 index。

### Dataset 本身在量什麼

以 `glove-100-angular_10_angular` 為例：

| 項目 | 值 | 解釋 |
|------|----|----|
| Dataset | **GloVe-100** | Stanford 的詞向量，每個單字 100 維 |
| 向量數 | **約 118 萬條** | 用來建 index 的資料 |
| 查詢數 | **約 1 萬條** | 從 dataset 抽出來的測試集 |
| Distance | **angular** | = cosine similarity |
| **k = 10** | 每次查詢回傳最近的 10 條 | 跟「真正最近的 10 條」比對算 recall |

### 主圖：Recall vs Queries per second（最重要的那張）

```
QPS (queries/sec, log scale, 越高越快)
  ▲
1e5│                                   ●─────●─── HNSW (hnswlib)
   │                              ●───●            ScaNN
1e4│                         ●───●
   │                    ●───●
1e3│               ●───●        annoy
   │          ●───●
1e2│     ●───●                           IVF-PQ
   │ ●───                                          flat (brute force)
 10│●                                                              ●
   └──────────────────────────────────────────────►
   0.5    0.7    0.8    0.9    0.95    0.99    1.0    Recall（準確度）
```

### 怎麼解讀

| 軸 / 元素 | 意思 |
|-----------|------|
| **X 軸 (Recall)** | 準確度。0.95 = 「正確答案的 10 條裡，這個演算法找到了 9.5 條」 |
| **Y 軸 (QPS)** | 每秒能處理幾次查詢，**log scale**，所以一格差 10 倍 |
| **每條曲線** | 一個演算法（HNSW、ScaNN、annoy、IVF-PQ...） |
| **曲線上每個點** | 該演算法的一組參數設定（例如 HNSW 的 `ef_search=10, 50, 200`） |
| **越往右上角越好** | 又快又準的 Pareto frontier |

### 三個關鍵觀察

1. **沒有最好的演算法，只有最好的 trade-off**
   - 想要 recall=0.99 的高準確度 → HNSW / ScaNN 通常勝
   - 願意接受 recall=0.85 但要極省記憶體 → IVF-PQ
   - recall 必須 1.0（不能錯）→ 只能 brute force（flat）

2. **同個演算法「一條曲線」是調參數的結果**
   - HNSW 把 `ef_search` 調大 → 找更多鄰居 → recall ↑、QPS ↓
   - 看到的曲線是「同一演算法、不同設定」連起來的軌跡

3. **Pareto frontier**
   - 圖右上角的「外輪廓」是最佳解集合
   - 落在輪廓**內側**的演算法（同 recall 比 frontier 慢）→ 在這個 dataset 上**輸了**

### 同頁面其他三張圖

| 圖 | X 軸 | Y 軸 | 看什麼 |
|----|------|------|--------|
| Recall vs **Build time** | Recall | 建索引耗時 | 建一次 index 要多久（HNSW 出名地慢） |
| Recall vs **Index size** | Recall | 索引佔用記憶體 | 部署成本（IVF-PQ 在這項通常最強） |
| Recall vs **Distance computations** | Recall | 每查詢做幾次距離計算 | 演算法理論效率 |

### 如果只看一張，看哪張？

**主圖 (Recall vs QPS)**——直接回答「我願意接受多少準確度損失，能換到多少速度」。實務選型 80% 看這張就夠了，再用 Index size 圖檢查記憶體是否吃得下。

### 怎麼用這個 benchmark 實際選 index

1. **先確認你的場景對應到哪個 dataset**：
   - 文字 embedding（sentence-transformers / OpenAI）→ 看 `glove-100-angular` 或 `nytimes-256-angular`
   - 圖像 / 影片 embedding → 看 `sift-128-euclidean` 或 `gist-960-euclidean`
   - 高維（1000+）→ 看 `gist-960` 或 `deep-image-96`
2. **在主圖找你能接受的 recall**（通常 0.9 ~ 0.95）
3. **在這個 recall 上挑 QPS 最高的演算法**
4. **對照 Index size 圖**確認記憶體夠不夠

### 相關資源

- **ANN-Benchmarks 主頁**：<https://ann-benchmarks.com/>
- **GitHub repo**（可自己跑）：<https://github.com/erikbern/ann-benchmarks>
- **Big-ANN-Benchmarks**（10 億級規模）：<https://big-ann-benchmarks.com/>

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
