# Ollama — 本地 LLM 的 Docker

> Ollama **不是模型、也不是羊駝**——是一個讓你一行指令就跑起本地 LLM 的 **runtime**。
> 類比就是 LLM 界的 Docker：`ollama run llama3` ≈ `docker run nginx`。
>
> 這份筆記回答三件事：
> 1. Ollama 到底是什麼（不是什麼）
> 2. 怎麼用、支援哪些模型
> 3. **沒顯卡到底能不能用**（實話實說版）

---

## 1. Ollama 不是模型，是 runtime

### 最清楚的類比：Docker 對應用 = Ollama 對 LLM

```
Docker 世界                        Ollama 世界
────────────                      ─────────────
Docker Desktop (runtime)           Ollama (runtime)
Docker Hub (映像倉庫)              Ollama Registry (模型倉庫)
docker pull nginx                  ollama pull llama3
docker run nginx                   ollama run llama3
http://localhost:80                http://localhost:11434
```

寫一行 `ollama run llama3` → Ollama 自動幫你：
- 下載模型（從它自己的 registry）
- 處理量化和格式轉換
- 啟動推論 server
- 開一個 OpenAI 相容的 HTTP API（`localhost:11434`）
- 進入互動對話

**不用**自己搞 PyTorch、不用下載幾百 GB 的原始權重、不用調 CUDA 環境變數。這就是它爆紅的原因——把本地 LLM 從「工程師 side project」變成「任何人裝好就能用」。

### 它是什麼寫的、底層是什麼？

```
你寫的 code / 工具
        │
        ▼ HTTP 請求
┌──────────────────────────────┐
│   Ollama runtime (Go 寫)     │  ← 負責模型管理、API、下載、排程
│      │                        │
│      ▼                        │
│   llama.cpp (C++ 寫)          │  ← 真正做推論的引擎
│      │                        │
│      ▼                        │
│   模型權重 (gguf 格式)         │  ← 實際的神經網路參數
└──────────────────────────────┘
```

**所以 Ollama 其實是 llama.cpp 的友善包裝**——把「模型管理 + API + UX」疊在 llama.cpp 這個核心推論引擎上。

---

## 2. 「Ollama」這個名字哪來的？

- **Llama** = Meta 開源的 LLM 系列（Llama 2、Llama 3、Llama 3.3）——中文俗稱「羊駝」（實際是駱馬科）
- **Ollama** = 名字玩 Llama 的梗，意思是「跑 Llama（以及其他動物）的工具」
- **所以 Ollama 本身不是羊駝**——它是**讓你跑羊駝（和其他模型）的平台**

現在 Ollama 早就不只跑 Llama 了——下面會看到它支援幾十種開源模型。

---

## 3. 常用指令（幾乎只需要會這幾個）

```bash
ollama pull qwen2.5:7b        # 下載模型到本機
ollama list                    # 看本機裝了哪些模型
ollama run qwen2.5:7b          # 啟動互動對話（自動啟動 server）
ollama serve                   # 只啟動 HTTP server 不進對話
ollama rm qwen2.5:7b           # 刪除模型（省硬碟）
ollama ps                      # 看目前在 GPU/記憶體裡的模型
```

啟動後 HTTP API 自動在 `http://localhost:11434`：

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5:7b",
  "messages": [{"role": "user", "content": "Go 的 channel 是什麼"}]
}'
```

**OpenAI 相容端點**也有（`/v1/chat/completions`）——任何支援 OpenAI 格式的工具改 base URL 就能接 Ollama。

---

## 4. 支援的模型（Ollama Registry 熱門款）

| 模型 | 來源 | 常見 size | 特色 |
|---|---|---|---|
| **Llama 3.3** | Meta | 70B | 開源旗艦（要強顯卡）|
| **Llama 3.2** | Meta | 1B / 3B | **小、純 CPU 勉強能跑** |
| **Llama 3.1** | Meta | 8B / 70B | 主流工作款 |
| **Qwen 2.5** | 阿里 | 0.5B / 7B / 14B / 72B | **中文特強**、寫 code 猛 |
| **Qwen 2.5-Coder** | 阿里 | 7B / 14B / 32B | 專攻寫程式 |
| **DeepSeek-R1** | DeepSeek | 1.5B / 7B / 70B / 671B | 會思考（推理）的模型 |
| **Gemma 3** | Google | 1B / 4B / 12B / 27B | 多模態、小模型表現好 |
| **Mistral / Mixtral** | Mistral AI | 7B / 8x7B | 經典歐洲開源 |
| **Phi-4** | Microsoft | 14B | 小而精、推理強 |
| **nomic-embed-text** | Nomic | 137M | **embedding 模型**（跟 RAG 用）|

**命名格式**：`模型名:大小-量化版本`，例如 `llama3.1:8b-instruct-q4_0`。沒指定就是預設（通常是 Q4 量化版）。

---

## 5. 硬體需求與效能體感（分平台）

先認識一個觀念：**LLM 推論主要吃兩種資源**——
- **記憶體（VRAM/RAM）**：模型權重要塞得下
- **算力**：矩陣乘法速度，GPU 比 CPU 快 50~100 倍

### 各平台 7B 模型（最主流尺寸）體感

| 平台 | 能跑嗎 | 速度體感 | 實用性 |
|---|---|---|---|
| **Mac M1/M2/M3/M4** | ✅ 很順 | ~20~50 token/s（Metal GPU 加速）| ⭐⭐⭐⭐⭐ 筆電就行 |
| **Windows + RTX 4090** | ✅ 飛快 | ~80~150 token/s | ⭐⭐⭐⭐⭐ |
| **Windows + RTX 3060 12GB** | ✅ 順 | ~30~80 token/s | ⭐⭐⭐⭐ 門檻級 |
| **Windows + RTX 4060 8GB** | ⚠️ 勉強 | 大模型塞不下，只能跑量化小版本 | ⭐⭐⭐ |
| **Windows + 4GB VRAM** | ⚠️ 只能跑 3B 以下 | — | ⭐⭐ |
| **Windows 純 CPU（Intel/AMD）** | ⚠️ 能跑但慢 | **~1~3 token/s** | ⭐ 不實用 |

### 模型大小 vs 最低 VRAM 對照

| 模型大小 | FP16 需要 | Q4 量化需要（Ollama 預設）|
|---|---|---|
| 1B | ~2 GB | ~0.7 GB |
| 3B | ~6 GB | ~2 GB |
| 7B | ~14 GB | ~4.5 GB |
| 13B | ~26 GB | ~8 GB |
| 70B | ~140 GB | ~40 GB |

**實務意義**：
- 有 8GB VRAM → 7B 量化版能跑
- 有 12GB VRAM → 13B 量化版能跑
- 有 24GB VRAM（3090/4090） → 基本 7B 全精度、或 33B 量化能跑
- 沒獨顯 → 看下一節

---

## 6. 沒顯卡到底能不能用？（實話版）

**技術上能、實用上看你怎麼用**。分幾種情況講清楚：

### 6.1 純 CPU 跑 7B 模型有多慢？

```
現代 CPU（Intel i7/AMD Ryzen 7）跑 Llama 3 8B Q4：
  ~1~3 token/s

你問一個問題、LLM 要回 500 字（約 700 tokens）：
  700 / 2 = 350 秒 ≈ 6 分鐘
```

**6 分鐘等一個回答——基本上不能當日常工具**。純粹玩玩、跑 batch 任務還行。

### 6.2 為什麼這麼慢？

LLM 推論的核心是**大量矩陣乘法**。GPU 有幾千個核心可以**平行**做這件事，CPU 只有幾十個核心序列地做。實測差距：

| 硬體 | 7B Q4 token/s |
|---|---|
| RTX 4090（GPU） | ~120 |
| M3 Max（Apple Silicon GPU） | ~40 |
| i9-14900K（24 核 CPU） | ~4 |
| i5 一般筆電（8 核 CPU） | ~1.5 |

GPU 比 CPU 快 **30~80 倍**——這不是 Ollama 的問題，是 LLM 運算本質。

### 6.3 救援方案 A：用更小的模型（1B~3B）

如果你就是沒顯卡、但想玩本地 LLM，**降尺寸是最實際的做法**：

| 模型 | 大小 | 純 CPU 速度 | 智慧程度 |
|---|---|---|---|
| **Llama 3.2 1B** | 1B | ~20~30 token/s | 只能做簡單對話 |
| **Llama 3.2 3B** | 3B | ~8~15 token/s | 勉強能用 |
| **Phi-3 Mini 3.8B** | 3.8B | ~6~12 token/s | 推理還行 |
| **Qwen 2.5 3B** | 3B | ~8~15 token/s | **中文最佳小模型** |

**10 token/s 以上體感就能接受**——類似慢速打字，不會覺得當機。

但要有心理準備：**1B~3B 的智慧和 Claude Sonnet 差一個銀河系**。它能做：
- ✅ 簡單 QA、翻譯、格式轉換
- ✅ Embedding 生成的前置（分類、關鍵字抽取）
- ❌ 複雜推理、長上下文、寫 code 幫你解 bug

### 6.4 救援方案 B：只用 Ollama 的 embedding 功能

Ollama 也能跑**純 embedding 模型**（不是對話用的），這種超小：

```bash
ollama pull nomic-embed-text   # 137M 參數，CPU 快到飛起
```

**純 CPU 可達 500~1000 embedding/s**——因為 embedding 模型一次 forward pass 就結束，不像對話模型要一個個 token 生。

**所以即使沒顯卡，你還是可以**：
- 用本地 embedding 做 RAG 的 indexing（你資料不外流）
- LLM 部分走雲端 API（Claude/OpenAI）
- 這就是 `ollama.md` 引用的 **AnythingLLM 模式 2**

### 6.5 救援方案 C：雲端 API 取代（根本不用 Ollama）

**誠實建議**：如果你沒顯卡、主要目的是**用 LLM 而不是研究本地 LLM**——

直接用 Claude API / OpenAI API / **Groq**（Groq 是雲端但速度是 GPT 的 10 倍、很便宜），根本不用折騰 Ollama。

| 選擇 | 月費體感 | 智慧 | 速度 |
|---|---|---|---|
| Claude API（Sonnet） | 個人用 $5~20 | ⭐⭐⭐⭐⭐ | 中快 |
| OpenAI API（GPT-4o-mini） | $1~5 | ⭐⭐⭐⭐ | 快 |
| **Groq**（Llama 3.3 70B） | 免費額度很大 | ⭐⭐⭐⭐ | **超快** |
| Ollama（純 CPU 跑 3B） | 0 元 | ⭐⭐ | 勉強 |

### 6.6 決策樹

```
你有獨立 GPU（8GB+ VRAM）或 Mac M 系列？
    │
    ├─ 有 ──► ✅ 用 Ollama 跑 7B~13B，體感很好
    │
    └─ 沒有 ──► 你的目的是什麼？
                 │
                 ├─ 學 LLM 概念／玩玩 ──► 用 Ollama + 1B/3B 小模型
                 │                        （或 CPU 跑 embedding）
                 │
                 ├─ 做 RAG／個人知識庫 ──► AnythingLLM 模式 2
                 │                        （Claude API + 本地 embedding）
                 │
                 └─ 認真產品開發 ──► 直接用雲端 API，忘掉 Ollama
```

### 6.7 你（Abby）的情境

> ⚠️ 下面這段是**還沒實測硬體前的猜測**，已被 6.8 的實測更正，保留當對照。

- Windows 11、沒提過獨顯配置 → 假設沒有
- 已經在付 Claude API 錢、Claude Code 跑得很順
- 目標：學 LLM 概念 + 可能做 Abby-notes 的 RAG

**（舊評估）最務實的建議**：**先不要裝 Ollama**。理由：
1. 沒獨顯 → 純 CPU 體感太差
2. 你要學的概念（RAG、chunking、embedding、retrieval）用 Claude API + 本地 embedding 就能全部跑
3. **AnythingLLM 模式 2**（上次推的那個）就是為你這種情境設計的

等哪天你真的想玩**本地 LLM 推論本身**、或買了獨顯、或換 Mac M 系列——再回來裝 Ollama 5 分鐘就搞定。

### 6.8 實機規格實測（2026-06-07）

實際查過硬體後，6.7 的「沒獨顯就別裝」假設要更正：

| 項目 | 結果 |
|---|---|
| 獨立顯卡 | **沒有**（DeskIn 是遠端桌面虛擬顯示器，不算顯卡） |
| 內顯 | **Intel Arc Graphics**（內建，共享系統記憶體） |
| 系統記憶體 | **約 32GB** |

> `Win32_VideoController` 回報的「VRAM 2GB」**不準**——對內顯/大記憶體常溢位失真。Intel Arc 內顯是**共享系統 RAM**，不是獨立 2GB。

**為什麼能跑 `qwen2.5:7b`**：關鍵不是顯卡，是**32GB 大記憶體**。

- `qwen2.5:7b` Q4 量化只要 **~4.7GB**（見 §5 對照表），32GB RAM 塞下綽綽有餘
- 就算純 CPU / Intel Arc 跑也**裝得下**，瓶頸只在速度（token/s），不在記憶體
- 這就是「電腦系統可以支援 7b」的真正原因——**記憶體裝得下**，而非有強顯卡

**選型對照**（見 [[ollama-安裝與使用]]）：

| 模型 | 大小 | 定位 |
|---|---|---|
| `qwen2.5:7b` | ~4.7GB | abby-notes-rag **專案預設**（`DEFAULT_MODELS["ollama"]`，品質優先） |
| `qwen2.5:3b` | ~1.9GB | 輕量備選，記憶體吃緊時用 `--model qwen2.5:3b` |

> 更正（2026-06-07）：實際查 `abby-notes-rag/scripts/ask.py` 後確認 `DEFAULT_MODELS["ollama"]` **本來就是 `qwen2.5:7b`**，不是 3b——舊筆記（含本檔與 ollama-安裝與使用.md）寫「預設 3b」是過時資訊，已一併更正。32GB RAM 撐得住 7b 就是這個選擇的底氣。

---

## 7. Ollama 的替代品（知道就好）

| 工具 | 定位 | 誰適合 |
|---|---|---|
| **llama.cpp** | Ollama 的底層引擎，本身也能單用（C++ CLI + server）| 工程師、要極致客製化 |
| **LM Studio** | GUI 版的 Ollama，點來點去操作 | 非工程師、喜歡介面 |
| **text-generation-webui** | Gradio GUI，支援更多模型格式 | 研究員、想玩奇怪模型 |
| **vLLM** | Production 級、高吞吐量 | 公司部署、多人使用 |
| **TGI (Text Generation Inference)** | Hugging Face 的 production server | 企業 |
| **Jan** | 開源桌面 app，類似 LM Studio | 要免費 GUI |

**重點**：個人學習、side project → **Ollama 是起點**。其他都是特定場景才需要。

---

## 8. 和其他筆記的連結

Ollama 在整個 LLM stack 裡是**推論層**的選擇之一——搭配前面的筆記看：

| 筆記 | Ollama 在裡面扮演什麼 |
|---|---|
| [`rag-vs-memory-comparison.md`](rag-vs-memory-comparison.md) | RAG 需要 LLM + Embedder，兩邊都能接 Ollama |
| [`llm-caching-layers.md`](llm-caching-layers.md) | Ollama **沒有 Prompt Caching**（只有 KV Cache 自動吃）。雲端 API 才有那層優化 |
| [`mem0-benchmark-and-architecture.md`](mem0-benchmark-and-architecture.md) | Mem0 的 LlmFactory / EmbedderFactory 都支援 Ollama |
| [`text2mem-12-atomic-operations.md`](text2mem-12-atomic-operations.md) | 12 個原子操作裡 Encode / Retrieve 需要的 LLM 和 Embedder 可以掛 Ollama |

---

## 9. TL;DR

1. **Ollama 不是模型**，是「讓本地跑 LLM 的 runtime」——LLM 界的 Docker
2. **底層是 llama.cpp**，Ollama 幫你包了模型管理 + HTTP API + CLI
3. **`ollama run llama3` 一行就能用**——下載、啟動、對話一條龍
4. **Registry 有幾十種模型**：Llama、Qwen、DeepSeek、Gemma、Phi、Mistral
5. **沒顯卡用 7B 模型：技術上能跑、實用上太慢**（1~3 token/s）
6. **沒顯卡的救援**：用 1B~3B 小模型、或本地只跑 embedding、或直接用雲端 API
7. **Abby 的情境**（沒獨顯 + 已經付 Claude API）：**先不要裝 Ollama**，AnythingLLM 模式 2 更適合
8. **等有獨顯 / 換 Mac 再回來**——5 分鐘就搞定
