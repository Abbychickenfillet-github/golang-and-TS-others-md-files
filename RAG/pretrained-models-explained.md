# 預訓練模型（Pre-trained Model）是什麼？

> 觸發場景：寫 `Embedder` class 時 `SentenceTransformer("BAAI/bge-m3")` 載入了一個 2.3GB 的「東西」，這個東西到底是什麼？我們又沒訓練它，為何就能把句子變成 1024 維向量？

---

## TL;DR

| 概念 | 一句話 |
|---|---|
| **Pre-training（預訓練）** | 別人花幾百萬美金、用幾千張 GPU、跑幾週訓練出來的「通用模型」 |
| **Fine-tuning（微調）** | 把預訓練模型再用你自己的少量資料訓練一下，讓它擅長特定任務 |
| **Weights（權重）** | 模型的「腦袋」，幾億個浮點數，是訓練的成果，存成一個檔 |
| **bge-m3** | 北京智源（BAAI）2024 年釋出的多語言 embedding 模型，1024 維輸出 |
| **HuggingFace Hub** | 模型界的 GitHub，免費下載別人訓練好的 weights |
| **我們的角色** | **使用者**，不是訓練者。下載 → 載入記憶體 → 呼叫 `.encode()` |

---

## 1. 為什麼需要「預訓練」？

### 從零訓練要付出什麼

假設你想自己訓練一個「能把任何句子變成向量」的模型：

| 項目 | 規模 |
|---|---|
| 訓練資料 | 數十億到上兆 tokens（整個網路抓下來的文本） |
| 算力 | 數千張 A100/H100 GPU，跑數週到數月 |
| 電費 + 雲端費用 | 幾十萬到幾百萬美金 |
| 工程師 | 一整個 ML 團隊調參 |
| 時間 | 幾個月起跳 |

**對 99% 的開發者：完全不可能。**

### 預訓練模型的存在解決什麼

OpenAI、Google、Meta、北京智源（BAAI）等大公司／研究機構，花了上述資源訓練出**通用基礎模型**，然後：

- 把模型「腦袋」（weights）打包成檔案，幾 GB 大小
- 上傳到 HuggingFace Hub（或自家平台）
- **大部分免費讓你下載使用**

你下載完之後在自己電腦上就能 inference（推論），不用付任何訓練成本。

> 類比：你不會自己種小麥磨麵粉，但你會買麵粉做麵包。  
> Pre-trained model = 別人磨好的麵粉，你拿來做應用層的麵包。

---

## 2. 「Weights」到底是什麼？

### 神經網路的本質

簡化版：神經網路 = **一堆數字（weights）+ 一個固定的計算流程**。

```
輸入文字 "Docker 啟動失敗"
  ↓
[tokenizer] 切成 token IDs [4523, 8821, 9911, ...]
  ↓
[embedding layer]   ← 用 weights 把每個 token 變成 768 維向量
  ↓
[transformer layer 1]  ← 用 weights 做注意力計算
  ↓
[transformer layer 2]
  ↓
... 24 層 ...
  ↓
[pooling]  ← 把所有 token 的向量合併成一個句子向量
  ↓
輸出 1024 維向量
```

**每一層的計算公式是固定的**（矩陣乘法 + 非線性函數），**weights 才是真正不一樣的東西**。

### 訓練 = 調整 weights

訓練的過程其實就是：
1. 拿一筆資料（「Docker 失敗」這句話 → 期待輸出是某個方向的向量）
2. 用當前 weights 跑一次得到實際輸出
3. 比較期待 vs 實際的差距（loss function）
4. **微微調整 weights**，讓下次差距變小
5. 重複幾億次

最後得到的「調好的 weights」就是 pre-trained model 的核心。

### 一個 model 多大？

```
bge-m3：
  參數量：~568M（5.68 億個 float32 數字）
  檔案大小：~2.3 GB（pytorch_model.bin / safetensors）
  載入記憶體後：~2.3 GB RAM 占用
```

下載到本地：

```
~/.cache/huggingface/hub/models--BAAI--bge-m3/
├── snapshots/<hash>/
│   ├── config.json              ← 架構描述（幾層、幾維）
│   ├── tokenizer.json           ← 怎麼切詞
│   ├── pytorch_model.bin        ← 2.3 GB 的 weights ← 主角
│   └── ...
```

第一次跑 `SentenceTransformer("BAAI/bge-m3")` 時自動下載這個目錄。之後從快取讀，秒開。

---

## 3. bge-m3 是怎麼被訓練的？

### 訓練方
**BAAI**（北京智源人工智能研究院），2024 年 2 月發表。

論文：[BGE M3-Embedding](https://arxiv.org/abs/2402.03216)

### 訓練資料
- 100+ 種語言的文本（多語言能力的來源）
- 約 1.1 億組「查詢 → 相關段落」配對
- 來源：mC4、Wikipedia、學術論文、code、QA datasets...

### 訓練目標
給模型一對句子，學會：
- **相似句子（同義、翻譯、問答對）→ 輸出的向量要靠近**（cosine ≈ 1）
- **不相干句子 → 輸出的向量要遠離**（cosine ≈ 0）

具體用 **contrastive learning（對比學習）**：每個 batch 裡放 1 個正樣本 + N 個負樣本，模型學會把正樣本拉近、負樣本推遠。

### 結果
- 1024 維向量空間裡，**語意相近的文本聚在一起、無關的散開**
- 中英混搜超強（因為訓練資料就是多語言對齊的）
- 8192 token 的長 context window（一般 model 只有 512）
- 同時支援三種檢索：dense（向量）、sparse（詞袋）、multi-vector（多向量）

我們只用 dense 模式，因為對 RAG 來說最簡單也最通用。

---

## 4. Pre-training vs Fine-tuning

兩個都是「訓練」，但目的完全不同：

| | Pre-training | Fine-tuning |
|---|---|---|
| **誰做** | 大公司 / 研究機構 | 應用層開發者（你） |
| **資料** | 海量通用文本 | 小量特定領域資料（幾千到幾萬筆） |
| **算力** | 千張 GPU 跑幾週 | 一張 GPU 跑幾小時 |
| **目標** | 「通用語意理解」 | 「擅長某個特定任務」 |
| **比喻** | 培養一個讀完整個圖書館的人 | 帶這個人去某公司實習 3 天 |

### 例子：何時要 fine-tune？

- ✅ 你的領域有大量**獨特術語**，通用 model 表現差（例：醫學影像、法律條文）
- ✅ 你的查詢風格很特別（例：超長技術文件、特殊符號）
- ❌ 你只是想搜尋筆記、找相關文章 → **不需要 fine-tune**，預訓練 model 已經很強

**我們的 RAG = 純 pre-trained 使用，沒做 fine-tune。**對個人筆記檢索來說性能已經很夠了。

---

## 5. HuggingFace Hub 是什麼

### 一句話
**模型界的 GitHub。** 全世界 50 萬+ 個預訓練模型免費下載。

### 主要功能

| 類比 | GitHub | HuggingFace |
|---|---|---|
| 版本控制 | git | git-lfs（處理大檔） |
| 主頁 | github.com/user/repo | huggingface.co/org/model |
| 拉下來 | `git clone` | `from_pretrained("org/model")` |
| 試用 | 跑程式 | 內建 inference widget，網頁直接打字試 |
| 主流檔案 | code | weights + tokenizer + config |

### bge-m3 的 HuggingFace 主頁
https://huggingface.co/BAAI/bge-m3

點進去你會看到：
- README（介紹、用法、benchmark）
- Files and versions（所有檔案）
- Use in sentence-transformers（一行 code 範例）
- Inference API（網頁試打）
- Discussions（issue tracker）

### 為什麼免費

- **學術研究 / 開源精神**：BAAI 是研究單位，發 paper 順便釋出 model
- **商業策略**：HuggingFace 公司用免費 Hub 吸引使用者，賣付費的 inference endpoint 跟企業方案
- **大公司獨家 model 例外**：GPT-4 / Claude / Gemini 的 weights 是不公開的，要用得呼叫 API

---

## 6. 我們 code 裡的對應關係

```python
from sentence_transformers import SentenceTransformer
#       ↑                            ↑
#  HuggingFace 旗下的高階 wrapper      load model 的入口

self.model = SentenceTransformer("BAAI/bge-m3")
#                                    ↑
#                            HuggingFace 上的 model ID
#                            「組織名/模型名」格式
```

這一行 `SentenceTransformer("BAAI/bge-m3")` 背後發生的事：

```
1. 檢查 ~/.cache/huggingface/ 有沒有 BAAI/bge-m3
2. 沒有 → 從 huggingface.co/BAAI/bge-m3 下載：
   - config.json
   - tokenizer files
   - pytorch_model.bin (2.3 GB)
3. 把 weights 載入記憶體（GPU 或 CPU）
4. 準備好 model.encode() 等待呼叫
```

呼叫 `.encode("Docker 啟動失敗")` 背後：

```
1. tokenizer 把字串切成 token IDs
2. forward pass（用 weights 計算）：每層都是矩陣乘法 + 注意力
3. pooling：把所有 token 向量平均成一個句子向量
4. L2-normalize（因為我們設 normalize_embeddings=True）
5. 回傳 (1024,) 的 numpy array
```

**我們完全沒碰 training，只用 inference。**

---

## 7. 該選哪個預訓練 model？

詳見 [embedding-models-comparison.md](embedding-models-comparison.md)，這裡只列幾個常見選擇：

| Model | 維度 | 大小 | 多語言 | 商用授權 | 適合 |
|---|---|---|---|---|---|
| **BAAI/bge-m3** | 1024 | 2.3 GB | ✅ 100+ | MIT | 我們現在用的，中英混搜首選 |
| OpenAI text-embedding-3-large | 3072 | API | ✅ | 付費 | 不想自己跑 model，肯付 API 費 |
| all-MiniLM-L6-v2 | 384 | 80 MB | ❌ 英文為主 | Apache 2.0 | 純英文 + 想要超小超快 |
| Cohere embed-v3 | 1024 | API | ✅ | 付費 | 多語言 + 不想自己跑 |
| jina-embeddings-v3 | 1024 | 1.1 GB | ✅ | CC-BY-NC（非商用） | 個人專案 |

bge-m3 的優勢：**免費、能商用、多語言強、長 context**。對你的中文筆記檢索是最佳選擇。

---

## 8. 重點整理

1. **預訓練 model = 別人練好的腦袋**，你下載來用就好
2. **Weights = 幾億個浮點數**，是模型的全部知識
3. **HuggingFace = 模型版的 GitHub**，免費下載
4. **我們的角色是 user，不是 trainer**
5. **bge-m3 適合我們**：免費、多語言、長 context、商用 OK
6. **不需要 fine-tune**：個人筆記檢索用預訓練版就夠強
7. **下載一次、永久快取**：在 `~/.cache/huggingface/`，之後秒載

---

## 延伸閱讀

- [sentence-transformers-model-naming-and-huggingface.md](sentence-transformers-model-naming-and-huggingface.md)：model ID 命名規則、為何叫 `BAAI/bge-m3`
- [embedding-models-comparison.md](embedding-models-comparison.md)：各家 embedding model 詳細比較
- [concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md](concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md)：embedding 在 RAG 流程裡的位置
- BAAI 論文：[BGE M3-Embedding](https://arxiv.org/abs/2402.03216)
- HuggingFace 教學：[Course](https://huggingface.co/learn)
