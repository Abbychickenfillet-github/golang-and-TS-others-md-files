# sentence-transformers Model 命名解析 + Hugging Face 是什麼？

> **這份筆記回答**：
> 1. `paraphrase-multilingual-MiniLM-L12-v2` 每個部分什麼意思？
> 2. Hugging Face 是什麼？跟 sentence-transformers 什麼關係？
> 3. 怎麼找 / 換 / 試其他 model？
> 4. Model 命名其他常見模式（bge、mpnet、ada、bert）？
>
> **建立日期**：2026-05-05

---

## 0. 一句話速答

| 問題 | 答案 |
|------|------|
| 為什麼 model 叫這個怪名字？ | 名字是「**訓練任務 + 規模 + 版本**」的縮寫 |
| Hugging Face 是什麼？ | **AI 界的 GitHub**——最大的 model / dataset 倉庫 |
| sentence-transformers 跟 HF 什麼關係？ | sentence-transformers 套件**從 HF Hub 下載 model** |

---

## 1. `paraphrase-multilingual-MiniLM-L12-v2` 拆字

```
paraphrase  -  multilingual  -  MiniLM  -  L12  -  v2
    ▲             ▲              ▲         ▲       ▲
    │             │              │         │       │
   訓練任務      支援語言       架構名     層數    版本
```

| 部分 | 意思 |
|------|------|
| **`paraphrase`** | 訓練任務：「**找出意思相同但寫法不同的句子**」（paraphrase = 改述）|
| **`multilingual`** | 支援多語言（不只英文）|
| **`MiniLM`** | Microsoft 開發的**輕量化 BERT**（小 BERT 的代名詞）|
| **`L12`** | **L**ayers = 12 層 transformer |
| **`v2`** | 第 2 版（v1 是更早的）|

### 你也可以這樣想：

> 「這是一個用『**找改述句**』任務訓練的、**支援多語言**的、**12 層 MiniLM 架構**的、第 2 版 model。」

---

## 2. 各部分詳解

### 2.1 訓練任務：`paraphrase`

不同 model 用不同**訓練任務**訓練，影響它的「擅長什麼」：

| 訓練任務 | 擅長 | 例子 model |
|---------|------|----------|
| **paraphrase** | 找意思相近的句子 | paraphrase-multilingual-MiniLM-L12-v2 |
| **NLI** (natural language inference) | 判斷句子間邏輯關係 | nli-bert-base |
| **QA** (Question Answering) | 問答配對 | distilbert-base-uncased-finetuned-squad |
| **Sentence-BERT** | 通用句向量 | all-MiniLM-L6-v2 |

→ **找最相似句子**用 paraphrase；**通用 RAG** 用 all-* 或 bge-* 系列。

### 2.2 語言支援：`multilingual` vs `(空白)` vs `zh`

| 標記 | 意思 | 例子 |
|------|------|------|
| `multilingual` | 多語言（50+ 種）| paraphrase-**multilingual**-MiniLM-L12-v2 |
| 沒標 | 預設純英文 | all-MiniLM-L6-v2、all-mpnet-base-v2 |
| `zh` 或 `chinese` | 純中文 | bge-large-**zh** |
| `en` | 純英文 | text2vec-base-**en** |

### 2.3 架構：`MiniLM` / `mpnet` / `bert` / `bge`

| 架構 | 來自誰 | 特色 |
|------|--------|------|
| **BERT** | Google | 經典，第一個 Encoder-only 的大成功 |
| **DistilBERT** | Hugging Face | BERT 蒸餾後的小版本（快 60%）|
| **MiniLM** | Microsoft | 更小、更快的 BERT 變體 |
| **MPNet** | Microsoft | BERT 改進版，品質更好 |
| **BGE** | 北京智源 | 中文之光，多語言版本品質很強 |
| **E5** | Microsoft | 業界主流之一 |
| **GTE** | 阿里巴巴 | 中文好、多語言不錯 |

### 2.4 規模：`L6` / `L12` / `base` / `large`

| 標記 | 意思 |
|------|------|
| **L6** | 6 層 transformer（小、快）|
| **L12** | 12 層（中等）|
| **base** | 基礎版（≈ L12）|
| **large** | 大版本（24 層，慢、品質好）|
| **xl** | 超大（少見）|

層數越多 → 品質越好 → 速度越慢、記憶體越多

### 2.5 版本：`v1` / `v2` / `v3`

```
all-MiniLM-L6-v1     ← 舊版
all-MiniLM-L6-v2     ← 新版（推薦）
```

通常**用最新版**，但 v2 之後改動可能不大，看 model card。

---

## 3. Hugging Face 是什麼？

**AI 界的 GitHub**——一個**模型 / 資料集 / Demo 的倉庫平台**。

### 三大功能

| 功能 | 對應 GitHub 的什麼 |
|------|----------------|
| **Models Hub** | 像 GitHub repos，但放 ML model | <https://huggingface.co/models> |
| **Datasets** | 開源資料集 | <https://huggingface.co/datasets> |
| **Spaces** | 像 Heroku，跑 ML demo | <https://huggingface.co/spaces> |

### 規模

- **數百萬個 model**（從小到大都有）
- **每天新上傳上千個 model**
- 大公司（Meta、Google、Microsoft、Anthropic、OpenAI）都會把 open-source model 上傳到 HF

### 你已經接觸過 HF 了

`paraphrase-multilingual-MiniLM-L12-v2` 這個 model 就**存在 Hugging Face 上**：
<https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2>

打開來看會有：
- ✅ Model 的下載連結
- ✅ Model card（說明文件）
- ✅ 訓練資料說明
- ✅ 跑分結果
- ✅ 範例程式碼
- ✅ License

---

## 4. sentence-transformers 跟 Hugging Face 什麼關係？

**`sentence-transformers` 是 Python 套件**，**從 Hugging Face 下載 model** 來用。

```
你的 Python 程式
       │
       │ from sentence_transformers import SentenceTransformer
       │ model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
       │
       ▼
sentence-transformers 套件
       │
       │ 連到 Hugging Face Hub 下載 model
       │ 第一次跑會下載到 ~/.cache/huggingface/
       ▼
HF Hub: huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
       │
       │ 把 model 檔案傳回來
       ▼
你的本機快取（之後不用重下）
```

### 關鍵組織關係

```
sentence-transformers（套件 / Python lib）
       │
       │ 是這個團隊維護的：
       ▼
UKPLab @ TU Darmstadt（德國達姆施塔特工業大學的研究團隊）
       │
       │ 把他們訓練的 model 傳到：
       ▼
Hugging Face → sentence-transformers 組織頁面
       <https://huggingface.co/sentence-transformers>
```

→ **sentence-transformers**（套件）跟 **HF 上的 sentence-transformers 組織**（model 集合）是同一群人做的。

---

## 5. 怎麼找 / 換 / 試其他 model？

### 5.1 直接去 HF 瀏覽

<https://huggingface.co/models?library=sentence-transformers>

可以篩選：
- 語言（中文 / 英文 / 多語言）
- Library（sentence-transformers）
- 大小
- 任務（feature-extraction、sentence-similarity）

### 5.2 換 model 程式碼一行就好

```python
# 原本用 MiniLM
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# 換成 bge-m3（高品質多語言）
model = SentenceTransformer('BAAI/bge-m3')

# 換成純中文
model = SentenceTransformer('BAAI/bge-large-zh-v1.5')

# 換成純英文最強
model = SentenceTransformer('all-mpnet-base-v2')
```

⚠️ **記得改維度**：

| Model | 維度 |
|-------|------|
| paraphrase-multilingual-MiniLM-L12-v2 | 384 |
| BAAI/bge-m3 | 1024 |
| BAAI/bge-large-zh-v1.5 | 1024 |
| all-mpnet-base-v2 | 768 |

→ pgvector 表結構也要跟著改：

```sql
-- MiniLM 用這個
CREATE TABLE items (embedding vector(384));

-- bge-m3 改成
CREATE TABLE items (embedding vector(1024));
```

### 5.3 看 model 的 model card

每個 HF 上的 model 都有「model card」，重要欄位：

| 欄位 | 看什麼 |
|------|------|
| **Description** | 訓練資料、目標 |
| **Usage** | 怎麼用（範例程式碼）|
| **Performance** | 跑分（MTEB、benchmark）|
| **License** | 商用可以嗎？（Apache、MIT 通常可，CC-BY-NC 不能商用）|
| **Tokenizer** | 處理多長 input（max_seq_length）|

---

## 6. Model 命名其他常見模式

### 6.1 OpenAI

```
text-embedding-3-small    ← 「text-embedding 第 3 代-小型」
text-embedding-3-large    ← 「-大型」
text-embedding-ada-002    ← 舊版（Ada 是 OpenAI 內部代號）
```

### 6.2 BAAI/BGE 系列（北京智源研究院）

```
BAAI/bge-large-zh-v1.5
  ▲     ▲    ▲   ▲    ▲
組織  系列  大小 語言 版本
```

`BAAI/` = 上傳者組織名（HF 慣例：`組織/model 名`）

### 6.3 OpenAI / Anthropic 用 Hugging Face 嗎？

| 公司 | 在 HF 上有？ |
|------|----------|
| OpenAI | ⚠️ 有但**只是說明頁**，model 本身**閉源**不下載 |
| Anthropic | ⚠️ 同上 |
| Google | 部分（Gemma 開源、Gemini 閉源）|
| Meta | ✅ Llama 等大量開源 |
| Microsoft | ✅ MiniLM、Phi 等大量開源 |
| Mistral | ✅ 全部開源 |

→ HF 上以**開源 model 為主**，閉源 model 用 API。

---

## 7. 速記卡：常見 model 翻譯

```
all-MiniLM-L6-v2
  → 全任務、MiniLM 架構、6 層、v2 → 純英文輕量

paraphrase-multilingual-MiniLM-L12-v2
  → paraphrase 任務、多語言、MiniLM、12 層、v2 → 多語言中等

all-mpnet-base-v2
  → 全任務、MPNet、base、v2 → 純英文高品質

BAAI/bge-large-zh-v1.5
  → 北京智源、bge 系列、large、純中文、v1.5 → 中文之光

BAAI/bge-m3
  → bge 第三代、多語言、多功能 → 多語言最強

text-embedding-3-small (OpenAI)
  → 第 3 代、小版本 → 主流商用

voyage-multilingual-2 (Voyage AI)
  → 第 2 代多語言 → Anthropic 推薦
```

---

## 8. 一張圖看 sentence-transformers ↔ HF ↔ 你的關係

```
┌──────────────────────────────────────────────────────────┐
│ Hugging Face Hub (huggingface.co)                        │
│ 數百萬個 model 上傳到這裡                                  │
│                                                          │
│   ├── sentence-transformers/   ← UKPLab 上傳的 model    │
│   │   ├── paraphrase-multilingual-MiniLM-L12-v2          │
│   │   ├── all-MiniLM-L6-v2                              │
│   │   └── ...                                            │
│   │                                                      │
│   ├── BAAI/                  ← 北京智源上傳的             │
│   │   ├── bge-m3                                         │
│   │   └── bge-large-zh-v1.5                             │
│   │                                                      │
│   └── meta-llama/            ← Meta 上傳的               │
│       └── Llama-3.1-8B                                   │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ 第一次下載
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 你的本機 ~/.cache/huggingface/                           │
│ Model 檔案存在這（之後重複用不用再下載）                   │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ 程式呼叫
                   ▼
┌──────────────────────────────────────────────────────────┐
│ sentence-transformers (Python 套件)                      │
│                                                          │
│   from sentence_transformers import SentenceTransformer  │
│   model = SentenceTransformer('...')   ← 從快取讀        │
│   vec = model.encode("文字")                             │
└──────────────────────────────────────────────────────────┘
```

---

## 9. 額外：Hugging Face 帳號要不要註冊？

| 場景 | 要註冊嗎 |
|------|--------|
| 下載公開 model（如 paraphrase-multilingual-MiniLM-L12-v2）| ❌ 不用 |
| 下載 Llama / Gemma 等需同意條款的 model | ✅ 要 |
| 用 HF Inference API | ✅ 要（有免費 tier）|
| 上傳自己訓練的 model | ✅ 要 |
| 用 HF Spaces 跑 demo | ✅ 要 |

→ 學習階段**不用註冊**，公開 model 直接下載。

---

## 相關筆記

- [embedding-models-comparison.md](embedding-models-comparison.md) — 各 model 比較
- [pgvector-with-openai-embedding.md](pgvector-with-openai-embedding.md) — embedding 完整實作
- [chunking-strategies-comparison.md](chunking-strategies-comparison.md) — chunking 對照
- [concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md](concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md) — 概念釐清

## 官方資源

- **Hugging Face Hub**：<https://huggingface.co/>
- **HF sentence-transformers 組織**：<https://huggingface.co/sentence-transformers>
- **sentence-transformers 套件**：<https://www.sbert.net/>
- **MTEB benchmark**（model 排行榜）：<https://huggingface.co/spaces/mteb/leaderboard>
- **MiniLM 原論文**（Microsoft 2020）：<https://arxiv.org/abs/2002.10957>
- **MPNet 原論文**（Microsoft 2020）：<https://arxiv.org/abs/2004.09297>
- **BGE 原論文**（北京智源 2023）：<https://arxiv.org/abs/2309.07597>
