# 機器學習技能樹 — 從數學基礎到 LLM 應用的層級地圖

> **寫這份的目的**：一張地圖，幫自己定位「現在在學的東西」屬於哪一層、上面有什麼、下面有什麼。
> 學東西最容易迷路的不是內容太難，而是**不知道自己在哪、該挖多深**。
>
> **觸發**：學 RAG 時挖到 K-means，搞不清楚這算 RAG 的細節還是更通用的東西、要不要深究。

---

## 0. 為什麼需要層級地圖？

學 ML / LLM 最常見的兩種痛苦：

1. **「我是不是要先把線性代數讀完才能學 RAG？」** → No. 不同層級的精通程度要求完全不同。
2. **「我現在學的這個東西，到底重不重要？」** → 看它在哪一層。底層基礎工具（K-means、Transformer）一次學起受用無窮；上層應用框架（LangChain）幾乎每年都換。

**核心原則**：**地圖讓你知道「該停在哪、該挖到哪」，不是讓你全部都學。**

---

## 1. 全景：從數學基礎到應用層的 7 個層級

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6: 產品 / 應用                                             │
│   ChatGPT、Claude、Cursor、Notion AI、Perplexity、各種 AI app   │
│   ★ 使用者層級 ★                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: 應用模式 / 設計範式                                      │
│   RAG、Agent、Function Calling、Memory layer、Multi-Agent        │
│   Chain-of-Thought、ReAct、Reflection                           │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: 框架 / 工具                                              │
│   LangChain、LlamaIndex、Haystack（編排）                         │
│   FAISS、Qdrant、Weaviate、pgvector（向量 DB）                   │
│   Mem0、text2mem（記憶層）                                        │
│   Hugging Face、PyTorch、TensorFlow（模型訓練/推論）             │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: 模型族 / 領域技術                                        │
│   ├─ NLP: Transformer、BERT、GPT、LLaMA、Embedding models       │
│   ├─ CV: CNN、ViT、ResNet                                       │
│   ├─ IR: BM25、TF-IDF、HNSW、IVF、PQ ★（你在學的）              │
│   └─ Speech: Whisper、Wav2Vec                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: 機器學習 (ML)                                            │
│   ├─ 監督式學習：Regression、Classification、SVM、Random Forest  │
│   ├─ 無監督學習：Clustering（K-means ★）、Dim Reduction（PCA）   │
│   ├─ 強化學習：Q-learning、Policy Gradient、RLHF                 │
│   └─ 深度學習：Neural Networks、Backprop、Optimizers             │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: 演算法基礎                                               │
│   排序、搜尋、圖論、動態規劃、雜湊、樹                            │
│   Lloyd's algorithm、Gradient Descent、EM、Backpropagation      │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 0: 數學基礎                                                 │
│   ├─ 線性代數（向量、矩陣、特徵值、SVD）                          │
│   ├─ 機率統計（分佈、貝氏、最大似然）                             │
│   ├─ 微積分（偏微分、梯度、鏈鎖律）                               │
│   └─ 最佳化（凸最佳化、Lagrange multiplier）                     │
└─────────────────────────────────────────────────────────────────┘
```

→ 越往下越**通用、穩定、長壽**；越往上越**特定、變動快、易過時**。

---

## 2. 各層詳解

### Layer 0 — 數學基礎

**核心領域**：線性代數、機率統計、微積分、最佳化

**特性**：
- **永遠不變**——300 年前的微積分今天還是同樣公式
- 是所有上層的**理論依據**
- 不必精通，但要**有概念**才能讀懂上層的論文

**該學到什麼程度？**
- ✅ 知道「向量」「矩陣」「特徵值」「梯度」「偏微分」是什麼
- ✅ 看到 paper 上有公式不會直接放棄
- ❌ 不必會手算 SVD 或證明定理

### Layer 1 — 演算法基礎

**核心領域**：經典演算法 + ML 用的最佳化方法

**特性**：
- 通用工具，**跨領域重複出現**
- K-means、Gradient Descent、EM、Backprop 都在這層
- 一次學起來受用 20 年

**該學到什麼程度？**
- ✅ 知道演算法**做什麼**、**什麼場景用**
- ✅ 能讀懂 pseudo-code
- ❌ 不必自己手刻（業界都用 library）

### Layer 2 — 機器學習 (ML)

**核心領域**：監督 / 無監督 / 強化 / 深度學習

**特性**：
- 整個 AI 領域的**主幹**
- 各種 paradigm 在這層集合
- 是 AI 工程師的**主戰場**

**該學到什麼程度？**
- ✅ 知道**有哪些 paradigm**、各自解什麼問題
- ✅ 至少深入過**一個領域**（例如 NLP 或 CV）
- ✅ 能用 PyTorch / TF 訓練個小模型

### Layer 3 — 模型族 / 領域技術

**核心領域**：依使用情境分支

| 子領域 | 代表技術 |
|--------|----------|
| **NLP** | Transformer、BERT、GPT、LLaMA |
| **CV** | CNN、ViT、ResNet、Stable Diffusion |
| **IR** | BM25、HNSW、IVF、PQ ★ |
| **Speech** | Whisper、Wav2Vec |
| **RL** | DQN、PPO、AlphaGo |

**特性**：
- 變動較快（新模型每幾個月就有）
- 每個分支**自成體系**
- 通常會選一兩個分支深入

**該學到什麼程度？**
- ✅ **選一個分支深入**（不貪心）
- ✅ 其他分支**知道存在 + 大致原理**
- ❌ 不必每個分支都精通

### Layer 4 — 框架 / 工具

**核心領域**：把上層需求包裝成易用 API

| 用途 | 代表工具 |
|------|----------|
| LLM 編排 | LangChain、LlamaIndex、Haystack |
| 向量 DB | FAISS、Qdrant、Weaviate、pgvector、Milvus |
| 記憶層 | Mem0、text2mem、Letta |
| 模型訓練 | PyTorch、TensorFlow、JAX |
| 模型部署 | vLLM、Ollama、TGI |
| LLM API | OpenAI SDK、Anthropic SDK |

**特性**：
- **替換性高**——LangChain 可被換成 LlamaIndex
- 學起來**快但易過時**
- 工程師的**日常工具**

**該學到什麼程度？**
- ✅ 至少**精通一套**主流工具
- ✅ 能看官方文件解問題
- ⚠️ 不必每個都學——選自己技術棧需要的

### Layer 5 — 應用模式 / 設計範式

**核心領域**：把 LLM + 工具組合成解決方案的**設計模式**

| 範式 | 解決什麼 |
|------|---------|
| **RAG** | 拓展 LLM 的知識邊界 |
| **Agent** | 讓 LLM 用工具自主完成任務 |
| **Memory layer** | 跨 session 延續對話情境 |
| **Function Calling** | LLM 結構化呼叫外部 API |
| **Multi-Agent** | 多個 agent 協作 |
| **Chain-of-Thought** | 引導 LLM 推理 |
| **ReAct** | 推理 + 行動交錯 |
| **Reflection** | LLM 自我檢驗、修正 |

**特性**：
- **概念性的東西**，不是特定工具
- 跨框架通用——用 LangChain 也好、自己手刻也好
- 是**架構師思考的層級**

**該學到什麼程度？**
- ✅ 知道**有哪些範式**、各自解什麼問題
- ✅ 能組合多個範式設計系統
- ✅ 看到 paper 提新範式（例如 GraphRAG）能快速 grok

### Layer 6 — 產品 / 應用

**核心領域**：終端使用者實際用的東西

ChatGPT、Claude、Cursor、Notion AI、Perplexity、各種 AI app

**特性**：
- **使用者體驗的層級**
- 變化最快——每週都有新產品
- 工程師主要**研究別人怎麼做**來抄

**該學到什麼程度？**
- ✅ 用過幾個主流產品，**對 UX 有 sense**
- ✅ 知道競品大概怎麼設計
- ❌ 不必跟風每個都試

---

## 3. 重要概念在哪一層？速查表

| 概念 | 層級 | 一句話定位 |
|------|------|----------|
| **歐幾里得距離** | Layer 0（數學） | 「兩個向量的距離」公式 |
| **梯度下降** | Layer 1（演算法） | 最佳化的基礎方法 |
| **K-means** | Layer 1~2（演算法 / ML） | 分群演算法、無監督學習基礎 |
| **PCA** | Layer 2（ML） | 降維演算法 |
| **Random Forest** | Layer 2（ML） | 監督式分類 / 回歸 |
| **Backpropagation** | Layer 1~2 | 神經網路訓練的核心方法 |
| **Transformer** | Layer 3（NLP 模型族） | 現代 LLM 的基礎架構 |
| **BERT / GPT** | Layer 3（NLP 模型族） | 具體的 Transformer 模型 |
| **Embedding model** | Layer 3（NLP 模型族） | 把文字 → 向量的模型 |
| **HNSW / IVF / PQ** | Layer 3（IR 模型族） | 向量索引演算法 |
| **BM25 / TF-IDF** | Layer 3（IR 模型族） | 關鍵字檢索評分 |
| **FAISS / Qdrant** | Layer 4（工具） | 向量 DB 實作 |
| **LangChain** | Layer 4（工具） | LLM 編排框架 |
| **OpenAI API** | Layer 4（工具） | LLM 服務的 SDK |
| **RAG** | Layer 5（範式） | 檢索 + 生成的設計模式 |
| **Agent** | Layer 5（範式） | 自主使用工具的設計模式 |
| **Mem0 / text2mem** | Layer 4（工具）+ Layer 5（範式） | Memory layer 的具體實作 |
| **ChatGPT** | Layer 6（產品） | OpenAI 的對話產品 |

---

## 4. 學 RAG 應該往下挖到哪一層？

```
你說「我要學 RAG」
    │
    ▼
RAG (Layer 5) ─── 一定要懂
    │
    ▼
向量檢索 / 模型族 (Layer 3) ─── 要懂大概原理
    │  HNSW、IVF、PQ、Embedding models
    │
    ▼
基礎演算法 (Layer 1) ─── 知道介面就好
    │  K-means、距離度量
    │
    ▼
數學基礎 (Layer 0) ─── 看到公式不放棄即可
    │  向量、矩陣
    │
    ▼
（再下去就是純數學系領域，停止挖）
```

**底線判斷**：當你「**能打開黑箱看一眼，知道大致在做什麼**」就夠了，不必看到底。

---

## 5. 各層該學到什麼程度（精通度光譜）

| 層級 | 廣度 | 深度 | 投資回報 |
|------|------|------|---------|
| Layer 0（數學） | 知道有什麼 | 看懂公式即可 | 永久受用，但短期 ROI 低 |
| Layer 1（演算法） | 知道有什麼、用在哪 | 能讀 pseudo-code | **高 ROI** ★ 一次學起來受用 20 年 |
| Layer 2（ML） | 知道有哪些 paradigm | **至少深入一個領域** | **高 ROI** ★ 主戰場 |
| Layer 3（模型族） | 知道大致原理 | **選一個分支精通** | 高 ROI，但要選對分支 |
| Layer 4（框架） | 用過 1~2 個 | 精通一套 + 能讀文件 | 中 ROI（會過時） |
| Layer 5（範式） | 知道所有主流範式 | 能組合範式設計系統 | **高 ROI** ★ 架構思考 |
| Layer 6（產品） | 用過主流產品 | 對 UX 有 sense | 低 ROI（變化太快） |

★ = 投資 ROI 最高的層級

---

## 6. 常見陷阱

| 陷阱 | 真相 |
|------|------|
| 「我要先把線性代數讀完才能學 RAG」 | ❌ 不需要，知道向量是什麼就能開始 |
| 「我要學完 LangChain 才能做 LLM 應用」 | ❌ LangChain 是工具不是必需品，OpenAI SDK 就夠了 |
| 「Transformer 我要從零手刻才算懂」 | ⚠️ 看你目標——應用工程師會用就好，研究員才需要手刻 |
| 「K-means 細節我要全懂」 | ❌ 知道介面（給 K，分 K 群）就夠用 |
| 「我每個新 LLM 都要試」 | ❌ 跟主流就好（GPT、Claude、Gemini），其他知道存在即可 |
| 「我同時要學 NLP、CV、Speech」 | ❌ 選一個深入，其他知道大概就好 |

---

## 7. 「不同職涯角色」對應的學習重心

| 角色 | 主要層級 | 不需要太深的層級 |
|------|---------|-----------------|
| **AI 應用工程師** | Layer 4, 5, 6 | Layer 0, 1（會用 library 就好） |
| **ML 工程師** | Layer 2, 3, 4 | Layer 6（不必跟產品） |
| **AI 研究員** | Layer 0, 1, 2, 3 | Layer 4, 6 |
| **產品經理（AI PM）** | Layer 5, 6 | Layer 0, 1, 2 |
| **資料科學家** | Layer 0, 1, 2 | Layer 5, 6（少碰 LLM 範式） |

→ 你目前的角色比較像 **AI 應用工程師**（在學 RAG 怎麼做），所以重心應在 **Layer 4-5**，Layer 1-3 知道介面就好。

---

## 8. 推薦學習路徑（從零到能寫 RAG）

```
1. 先用 (Layer 6)
   去用 ChatGPT / Claude，培養「LLM 能/不能做什麼」的直覺

2. 寫第一個 RAG demo (Layer 4-5)
   用 OpenAI SDK + FAISS / pgvector + 簡單 chunker
   別管底層怎麼運作

3. 遇到問題回來補洞 (Layer 3)
   - Recall 不夠 → 學 embedding model 怎麼選
   - 慢 → 學 HNSW / IVF / PQ
   - 答非所問 → 學 reranker

4. 想優化或設計更複雜系統 (Layer 5)
   學 Agent、Memory layer、Multi-Agent

5. 真有研究興趣再下挖 (Layer 0-2)
   讀論文、補數學、學 ML 經典演算法
```

→ **由上往下挖**比由下往上學有效率太多。從應用層出發，遇到瓶頸時才往下補基礎。

---

## 9. 推薦資源（對應各層）

| 層級 | 資源 |
|------|------|
| **Layer 0**（數學） | 3Blue1Brown YouTube、Khan Academy |
| **Layer 1**（演算法） | CLRS《Introduction to Algorithms》、Naftali Harris 視覺化 |
| **Layer 2**（ML） | Andrew Ng Coursera ML、Stanford CS229 |
| **Layer 3**（模型族） | Hugging Face course、The Illustrated Transformer |
| **Layer 4**（工具） | LangChain / LlamaIndex 官方文件 |
| **Layer 5**（範式） | Lilian Weng blog、Anthropic / OpenAI cookbook |
| **Layer 6**（產品） | 直接用、看 Twitter / Reddit |

---

## 10. 一句話收斂

> **這張地圖不是「全部都要學」的清單，是「該停在哪」的判斷工具。**
>
> - 學 RAG 卡在 K-means？看地圖 → K-means 在 Layer 1，知道介面就停
> - 想做 Agent 但糾結要不要學線性代數？看地圖 → Agent 在 Layer 5，線代在 Layer 0，跨四層，不用
> - 同事說「你不懂 Transformer 怎麼做 LLM 應用」？看地圖 → 應用工程師重心在 Layer 4-5，Transformer 在 Layer 3 知道大概就好

---

## 相關筆記

- [rag-vs-memory-comparison.md](rag-vs-memory-comparison.md) — RAG 與 Memory layer 的對照（Layer 5）
- [mem0-benchmark-and-architecture.md](mem0-benchmark-and-architecture.md) — Mem0 設計（Layer 4）
- [text2mem-12-atomic-operations.md](text2mem-12-atomic-operations.md) — text2mem 的 12 操作（Layer 4-5）
- [llm-caching-layers.md](llm-caching-layers.md) — LLM 三層快取（Layer 4-5）
- [ollama.md](ollama.md) — Ollama 部署（Layer 4）
