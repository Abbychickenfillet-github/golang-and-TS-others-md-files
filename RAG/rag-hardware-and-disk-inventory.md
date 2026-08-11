---
title: "rag-hardware-and-disk-inventory"
---

# RAG 硬體與磁碟佔用盤點

本篇重點 a–r，共 18 個。

要跟人報告「跑 RAG 需要多好的硬體」之前，先盤點清楚電腦上實際裝了什麼、佔多少空間、跑在什麼硬體上，再推導資料量變大時哪個硬體元件會先撐不住。

## 怎麼查（方法論，之後可以自己重跑）

| 想知道什麼 | 查什麼 |
|---|---|
| Ollama 有沒有抓模型 | `ollama list`（看清單）＋ 算 `~/.ollama` 資料夾實際大小（看有沒有真的下載） |
{% raw %}| pgvector / Postgres 佔多少 | `docker images` 看 image 大小 + `docker inspect <container> --format "{{json .Mounts}}"` 找資料實際存在哪個路徑，再算那個路徑的大小 |{% endraw %}
| Embedding 模型（bge-m3 等）佔多少 | 這些模型通常不經過 Ollama，而是存在 HuggingFace 快取：`~/.cache/huggingface/hub`，逐子資料夾算大小 |
| Python 套件（torch 等）佔多少 | 專案的 `venv` 資料夾大小 + `requirements.txt` 看有沒有 `sentence-transformers` / `torch` |
| CPU/RAM/GPU 規格 | `Get-CimInstance Win32_Processor` / `Win32_ComputerSystem` / `Win32_VideoController` |

## 這台電腦的實測結果（2026-07-21）

### 硬體規格
| 項目 | 數值 |
|---|---|
| CPU | Intel(R) Core(TM) Ultra 7 155H，16 核 / 22 執行緒 |
| RAM | 31.71 GB |
| GPU | Intel(R) Arc(TM) Graphics（內顯，共享記憶體） |
| OS | Windows 11 家用版 64-bit |

**(a)** 沒有獨立 NVIDIA GPU、無 CUDA，bge-m3 這類 embedding 模型目前是**吃 CPU** 做推論（encode），不是吃 GPU。

> **實測驗證**（非網路引用，是在 `abby-notes-rag/venv` 裡直接跑出來的結果）：
> ```
> $ venv\Scripts\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.version.cuda)"
> 2.11.0+cpu   False   None
> ```
> `+cpu` 代表裝的**本來就是 CPU-only 版本的 PyTorch**，連 CUDA 支援都沒編譯進去——不是「有支援但沒偵測到 GPU」，是根本不存在切換到 GPU 的可能性。另外用 Grep 搜過 `abby-notes-rag/scripts/*.py`，裡面沒有任何 `device=` / `cuda` 相關程式碼，代表也不是程式邏輯主動選了 CPU，而是環境從安裝那一刻就決定了。

### Ollama — 目前幾乎是空的
- `ollama list` 回傳空清單，版本 0.32.1
- `~/.ollama` 資料夾實測只有 5 個檔案、約 3KB（只有設定檔，沒有任何模型權重）

**(b)** Ollama 裝了但**目前**沒有模型，那 3KB 是空殼——但這不是「從沒設定過」，是先前**為了省空間主動刪掉模型權重**（詳見 [[ollama-安裝與使用]]）。正常應該要抓的是**本專案預設 `qwen2.5:7b`**（~4.7GB，品質優先，32GB RAM 撐得住），記憶體吃緊可退而求其次用 `qwen2.5:3b`（~1.9GB）。要恢復生成功能：`ollama pull qwen2.5:7b`。
**(c)** 正式 RAG 專案用的 embedding 模型（bge-m3）其實是透過 `sentence-transformers` 走 HuggingFace 下載快取，跟 Ollama 是兩條不同路徑，不要混為一談。

### pgvector / PostgreSQL
- 用的是 `pgvector/pgvector:pg17` 這個 Docker image（Postgres 17 內建包好 pgvector 擴充），image 大小 627MB
- 容器 `abby-rag-postgres` 的資料是 bind mount 到本機路徑 `abby-notes-rag/data`，不是 Docker named volume；實際資料量目前只有 0.13 GB（對應約 4172 個 chunks / 373 個檔案的規模）

**(d)** pgvector 是包在 Postgres image 裡的擴充，沒辦法單獨切出「pgvector 本身多大」——報告時直接算整個 image 大小，寫成「PostgreSQL 17 + pgvector extension：627MB」即可。

### Embedding 模型快取（HuggingFace，不是 Ollama）
位置：`~/.cache/huggingface/hub`

| 模型 | 大小 | 用途 |
|---|---|---|
| BAAI/bge-m3 | 4.25 GB | 正式專案（abby-notes-rag）用，1024 維 |
| sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 | 0.45 GB | 練習場（rag-experiments）用，384 維 |

兩套環境模型不同，別搞混，詳見 [[project-rag-two-environments]]。

### Python 環境
- `abby-notes-rag/venv`：1.30 GB
- 關鍵套件：`sentence-transformers`、`psycopg2-binary`、`pgvector`、`langchain-text-splitters`、`tiktoken`、`anthropic`、`google-genai`

**(e)** `sentence-transformers` 會連帶裝 `torch` 當底層，這是 venv 體積偏大（1.3GB）的主因。

### 目前磁碟佔用總表（RAG 相關）
| 項目 | 大小 |
|---|---|
| PostgreSQL 17 + pgvector image | 627MB |
| Postgres 實際資料（4172 chunks） | 0.13GB |
| Python venv（sentence-transformers + torch 等依賴） | 1.3GB |
| Embedding 模型快取（bge-m3 正式 + MiniLM 練習） | 4.7GB |
| Ollama（裝了沒用到） | 3KB |
| **合計** | **約 6.6GB** |

**(f)** 這套規模（幾千 chunk）對硬體要求其實很低，多數現代筆電都能跑；CPU 16核/22緒、32GB RAM 目前完全沒有壓力。

## 資料量變大時，哪個硬體元件要先變好

**(g)** 硬體元件的優先順序是 **RAM > 磁碟速度(NVMe) > CPU 核心數 > GPU**，不是資料量一大就全部都要升級。

### 1. RAM ── 通常最先撐不住

**(h)** pgvector 的 ANN 索引（HNSW）要能塞進記憶體（shared_buffers / OS page cache）查詢才會快，這是資料量變大後最先撐不住的元件。

**(i)** 索引大小估算公式：`維度 × 4 bytes（float32） × 圖結構開銷（約1.5~2倍）`

| chunk 數量 | 索引概估大小（bge-m3, 1024維） | 32GB RAM 夠嗎 |
|---|---|---|
| 4,172（目前） | ~30MB | 完全沒感覺 |
| 10 萬 | ~700MB | 沒問題 |
| 100 萬 | ~7GB | 還好 |
| 1000 萬 | ~70GB | 撐不住，要換更大 RAM 或改用磁碟型索引 |

**(j)** 一旦索引大小超過 RAM，查詢會開始吃磁碟隨機 I/O，延遲不是慢一點，是差一個數量級。

### 2. 磁碟速度（NVMe SSD）── RAM 撐不住之後的第二道防線

**(k)** 資料量大到裝不進記憶體時，磁碟的隨機讀取速度就變關鍵，這時候一定要 NVMe SSD，HDD 或雲端慢速儲存等級會直接讓查詢延遲爆炸。

### 3. CPU ── 主要影響「灌資料」的速度，不是查詢速度

**(l)** Ingest（把文件轉成向量）是 CPU/GPU 密集的操作；查詢時只需要 embed 一個短查詢，幾乎不耗資源，兩者耗用程度差很多。

**(m)** bge-m3 在 CPU 上大概每秒處理幾十到上百句，資料從幾千筆漲到幾百萬筆時，重新 ingest 或換模型重新 embed 全部資料，時間會從幾分鐘變成幾小時。

**(n)** 建 HNSW 索引本身也是 CPU + 記憶體密集操作，資料量大時建索引時間會明顯拉長。

**(o)** 目前 16 核/22 緒對現在規模綽綽有餘，但資料量衝到百萬級時，批次重新 embed 用多核心平行處理會有感差異。

### 4. GPU ── 只有特定情境才變成必要，不是資料量大就一定要

GPU 真正變重要的時機：

**(p)** 大量批次 embedding（初次 ingest 幾十萬~上千萬筆文件，或換模型要全部重跑）。
**(q)** 加 cross-encoder 做 rerank（比單純算 cosine 相似度貴很多的模型），或之後接本地 LLM 做生成（不只是檢索，還要跑推論）。
**(r)** 單純「資料筆數變多但查詢照樣一次一句」，查詢端幾乎不需要 GPU；只有 ingest/rerank/生成這幾種情境才會真正吃到 GPU。
