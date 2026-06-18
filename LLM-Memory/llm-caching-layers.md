# LLM 的三層快取 — Semantic Cache / Prompt Cache / KV Cache

> 「cached query」不是正式術語。實務上 LLM 系統的快取**分成三層**，每層位置不同、解決的問題也不同。這份筆記逐層拆解，最後**特別展開 KV Cache**——它是三層裡最底層、最少人講、但**讓整個 LLM 推論能跑得動的關鍵**。

---

## 0. 三層快取鳥瞰

```
使用者 query「退款怎麼辦」
    │
    ├─【層 1】Semantic Cache（語意快取 / 應用層）
    │   用 embedding 比對過去的 query，相似就直接回舊答案
    │   ↑ 命中：根本不用打 LLM
    │
    ├─【層 2】Prompt Caching（Anthropic/OpenAI 廠商原生 / API 層）
    │   快取 prompt 的「前綴」（system + 文件）
    │   ↑ 命中：tokens 收 10% 價格、回應快 85%
    │
    └─【層 3】KV Cache（模型內部 / 推論引擎層）
        每次 forward pass 把 attention 的 Key/Value 算完存起來
        ↑ 不是你能控制的，是 LLM 能跑起來的必要機制
```

**三層是疊加的**：命中層 1 就不用跑 2、3；沒命中就落到層 2；再沒命中就進層 3；全部 miss 才真的算到底。

| 層 | 位置 | 能省什麼 | 誰控制 | 粒度 |
|---|---|---|---|---|
| Semantic Cache | 應用程式 | 整次 LLM 呼叫 | 開發者 | 一整個 query → 一整個答案 |
| Prompt Caching | API 層（Anthropic/OpenAI 之類） | token 費用 + 首 token 延遲 | 開發者（下 cache_control） | prompt 前綴的 token 區段 |
| KV Cache | 推論引擎（vLLM/TGI/廠商內部） | 推論時的**計算量** | 自動（對開發者透明） | 每個 token 的 Key/Value 向量 |

---

## 1. 層 1：Semantic Cache（語意快取）

### 做什麼

使用者問「退款怎麼辦」→ 之前有人問過「我要怎麼退款」→ **語意相似度 > 0.95 → 直接回傳舊答案，跳過整個 LLM**。

### 流程

```
新 query 進來
    │
    ▼
把 query embed 成向量
    │
    ▼
去 cache 裡找語意最近的舊 query
    │
    ├─ 相似度 > 閾值 ──► 直接回傳舊答案（~10ms）
    │
    └─ 相似度 < 閾值 ──► 打 LLM、算完後把新 query + 答案存進 cache
```

### 代表實作

- **GPTCache**（開源，最經典）
- **Redis Semantic Cache**（RediSearch + 向量）
- **LangChain** 的 `RedisSemanticCache` / `GPTCache` wrapper
- **Portkey / Helicone** 等 LLM gateway 大多內建

### 適合 / 不適合

| 適合 | 不適合 |
|---|---|
| 客服 FAQ（同一批問題被問到爛） | 個人化 query（「我的訂單狀態」不能共用答案）|
| 文件問答（答案不常變） | 需要即時資料（股價、庫存）|
| 高頻重複查詢 | 創意生成（每次都要新的）|

### 最大的坑：語意相似 ≠ 答案相同

```
Q1:「退款政策是什麼？」  → 答案 A
Q2:「退貨政策是什麼？」  → 答案應該是 B，但語意相似度 > 0.9 會誤命中 A
```

**閾值調太低會亂答、調太高幾乎不命中**。實務上會：
- 加**關鍵字過濾**（「退款」「退貨」不同關鍵字就不命中）
- 加 **user_id 隔離**（abby 的 query 不能命中 bob 的答案）
- 加**時效**（即時類 query 強制跳過 cache）

---

## 2. 層 2：Prompt Caching（API 層）

### 做什麼

**快取 prompt 的前綴**（system prompt + 長文件 + tool definitions）。下次同一份前綴再用時，**那段 token 直接從快取讀、收 10% 價格**。

```
[system + 10頁文件] [使用者 query]
 └──── 這段快取 ────┘   └── 這段每次都算 ──┘
       ↑ 只要 system + 文件不變，這段下次直接命中
```

### 為什麼 query 本身不能用這層快取？

因為 **prompt caching 只快取「完全相同的前綴」**——連續的 token 序列一模一樣才算命中。query 每次都不一樣，放在 prompt 結尾剛好不影響前綴快取。

> 注意：Anthropic docs 裡示範 RAG 場景的 Multiple cache breakpoints，**主題是 Prompt Caching，不是 RAG**——只是因為 RAG 的長文件前綴正好是 Prompt Caching 最大受益者。

### 廠商支援現況

| 廠商 | 產品名 | TTL | 價格 |
|---|---|---|---|
| Anthropic | Prompt Caching | 5 分鐘（可延長到 1 小時） | 寫入 1.25x、讀取 0.1x |
| OpenAI | Prompt Caching | 自動、5~10 分鐘 | 命中後 tokens 5 折 |
| Google Gemini | Context Caching | 可自訂（幾分鐘到幾小時） | 有儲存費 + 便宜 token |

### 為什麼 cache write 比 base input 還貴？（反直覺但有道理）

第一眼看 Anthropic 定價會覺得奇怪：**寫入快取居然收 1.25x，比一般 input 還貴**。照直覺快取應該要省錢啊？

關鍵是——**寫入 cache 並沒有省任何算力**。拆開兩者在付什麼錢：

| 項目 | Base Input (1x) | 5m Cache Write (1.25x) | 差在哪 |
|---|---|---|---|
| **Prefill 算力**（跑 attention 算 K/V） | ✅ 要算 | ✅ 要算 | **一樣** |
| **算完之後的 K/V** | 丟掉 | **留在 VRAM 5 分鐘** | 多出這段 |
| **佔用的 GPU 記憶體** | 瞬間釋放 | **持續佔 5 分鐘** | 多出 5 分鐘租金 |

**關鍵洞察**：寫入 cache 的 prefill 一樣要跑一次。多付的那 25%，**買的不是 token 錢，是「VRAM 佔用 5 分鐘」的租金**。

#### 為什麼 VRAM 要收錢？

回到 §3 KV Cache 會講的那件事——**GPU VRAM 是 LLM infra 最貴的資源**：

- Claude 的 context 很長（200K tokens 可以佔幾十 GB VRAM）
- 你把 KV 留在那邊 5 分鐘 → 這塊 VRAM 這 5 分鐘不能服務別人
- Anthropic 的 GPU 容量 = 能同時服務多少使用者 × batch size
- 你獨佔了 VRAM → 整體吞吐量下降 → 這是**實打實的機會成本**

所以 1.25x 裡面的那多出的 0.25x，本質是**補償 Anthropic 這 5 分鐘的 VRAM 機會成本**。

#### 為什麼讀取反而便宜到 0.1x？

讀取只是「從 cache 把已經算好的 K/V 搬進 attention 層」——**prefill 完全跳過**。Prefill 是 LLM 最吃算力的那段（尤其長 prompt），省掉它就幾乎沒算力成本，只剩記憶體存取，所以收 10% 就夠 cover。

#### 損益平衡點：用幾次才划算？

假設同一份前綴要重用 N 次：

```
不用快取的總成本：N × 1x = N
用快取的總成本：  1.25x（第一次寫入）+ (N-1) × 0.1x（之後讀取）
                = 1.15 + 0.1N
```

令兩者相等：N = 1.15 + 0.1N → **N ≈ 1.28**

**結論**：**只要同份前綴 5 分鐘內被用超過 2 次，就划算**。用越多次賺越多：

| 使用次數 | 無快取成本 | 有快取成本 | 省多少 |
|---|---|---|---|
| 1 次 | 1x | 1.25x | **虧 25%**（唯一會虧的情況）|
| 2 次 | 2x | 1.35x | 省 32% |
| 10 次 | 10x | 2.15x | 省 78% |
| 100 次 | 100x | 11.15x | 省 89% |

#### 1 小時 TTL 版本為何收 2x？

Anthropic 另外有 1 小時 TTL，收 **2x**（100% 加價）——因為 VRAM 要佔用 12 倍久（5 分鐘 → 60 分鐘），機會成本更高。但只要重用幾次一樣划算。

#### 設計動機

這個價格結構其實是**在逼你做對的事**：

1. **鼓勵「真的會重用才快取」**——只用一次會虧，強迫你想清楚這段 prompt 會不會被重用
2. **防止濫用**——不然大傢什麼都標 `cache_control`，Anthropic 的 VRAM 會被垃圾 cache 塞爆
3. **補償 infra 成本**——VRAM 真的是錢

**一句話總結**：**Cache write 的 25% 加價是 VRAM 的 5 分鐘租金，不是 token 費。設計上就是「用 1 次會虧、用 2 次打平、用 3 次以上開始賺」**——強迫開發者只在真的重用場景才啟用 caching。

---

## 3. 層 3：KV Cache（模型內部）—— 特別展開

### 為什麼要特別展開？

- **它不是一個「選配功能」**——現代 LLM 推論**本來就在用**，沒它每個 token 生成會慢到不能用
- **Prompt Caching 底層就是把 KV Cache 做「跨 request 持久化」**——理解 KV Cache 才懂 Prompt Caching 在幹嘛
- **大型部署的 GPU 記憶體大頭就是 KV Cache**——做 LLM infra 的人逃不掉

### 3.1 一句話版本

> 每生成一個新 token，原本要把**所有前面的 token 重算一遍** attention；KV Cache 把算過的 Key/Value 向量**存起來**，下次直接取用，省掉重算。

### 3.2 先補背景：Transformer 的 attention 在幹嘛

要懂 KV Cache，得先知道 Transformer 的 self-attention。每個 token 進 attention 層時會被切成三個向量：

| 向量 | 全名 | 角色 | 比喻 |
|---|---|---|---|
| **Q** | Query | 「我現在在找什麼？」 | 搜尋引擎的**搜尋詞** |
| **K** | Key | 「我能被什麼詞找到？」 | 搜尋引擎的**索引 / 標題** |
| **V** | Value | 「我代表的實際意義」 | 搜尋引擎的**網頁內容** |

**Attention 的運算**：

```
attention_score = softmax(Q · K^T / √d) · V
```

白話：拿當前 token 的 Q，去和**所有前面 token 的 K** 算相似度 → 這個相似度當權重 → 對**所有前面 token 的 V** 加權求和 → 得到當前 token 的新表示。

### 3.3 不用 KV Cache 會怎樣？

LLM 是**自回歸**（autoregressive）生成：一次生一個 token。生成第 N 個 token 時，attention 要把**前面 N-1 個 token 全掃一遍**。

假設要生成 100 個 tokens，**沒有快取**的話：

```
生第 1 個 token：算 1 個 token 的 K/V
生第 2 個 token：重新算前 2 個 token 的 K/V
生第 3 個 token：重新算前 3 個 token 的 K/V
...
生第 100 個 token：重新算前 100 個 token 的 K/V

總計算量 = 1 + 2 + 3 + ... + 100 = 5,050 次 K/V 計算
複雜度 = O(n²)
```

**問題**：前面 token 的 K/V **根本沒變**（它們的 K/V 只看自己之前的 token，和後面的新 token 無關），卻要重算 100 次。純粹浪費。

### 3.4 KV Cache 的解法

**把前面算過的 K/V 全部存起來**，生新 token 時只算新 token 自己的 K/V：

```
生第 1 個 token：算 1 個 K/V → 存進 cache
生第 2 個 token：只算第 2 個 K/V → 和 cache 裡的第 1 個一起做 attention → 存進 cache
生第 3 個 token：只算第 3 個 K/V → 和 cache 裡的前 2 個一起做 attention → 存進 cache
...
生第 100 個 token：只算第 100 個 K/V → 和 cache 裡的前 99 個做 attention

總計算量 = 100 次 K/V 計算
複雜度 = O(n)
```

**100 個 token 從 5,050 次算變成 100 次——省 50 倍**。序列越長差距越大（生 1000 token 時差 500 倍）。

### 3.5 為什麼只快取 K 和 V、不快取 Q？

**因為 Q 是「當前 token 的」**——每次生成新 token 都是新的 Q，本來就要重算。

K 和 V 是**每個位置固定的屬性**——第 5 個 token 的 K/V 不管你後面生成到第 10 還第 100 個 token，它永遠是那個值。所以可以快取。

| 向量 | 是否隨新 token 改變？ | 能快取？ |
|---|---|---|
| **Q**（當前 token 在找什麼） | 每步都要新的 | ❌ 每次重算 |
| **K**（每個位置能被什麼找到） | 不變 | ✅ 快取 |
| **V**（每個位置的意義） | 不變 | ✅ 快取 |

這就是為什麼叫 **KV Cache**——只快取 K 和 V。

### 3.6 視覺流程

```
Prefill 階段（處理使用者 prompt，假設 prompt 有 50 token）
───────────────────────────────────────────────
一次把 50 個 token 平行送進 Transformer
  → 算出 50 組 K/V
  → 全部存進 KV Cache
  → 輸出第 51 個 token

Decode 階段（一個一個生成）
───────────────────────────────────────────────
生第 51 個 token：
  [新 Q_51]   ×  [KV Cache: K_1~K_50]  →  attention  →  token 51
  算出 K_51/V_51 → 存進 cache（cache 長度變 51）

生第 52 個 token：
  [新 Q_52]   ×  [KV Cache: K_1~K_51]  →  attention  →  token 52
  算出 K_52/V_52 → 存進 cache（cache 長度變 52）

...一直到生出 EOS（結束 token）為止
```

**兩階段**：
- **Prefill**：一次算完整個 prompt 的 K/V，算力密集但平行
- **Decode**：一次生一個 token，算力輕但**受記憶體頻寬限制**（每次都要把整個 KV Cache 讀進來）

### 3.7 KV Cache 的代價：GPU 記憶體

KV Cache 省了計算，但**很吃記憶體**。粗估一筆請求的 KV Cache 大小：

```
KV Cache 大小 = 2 × layers × heads × head_dim × seq_len × batch × dtype_bytes
                ↑ 2 是 K 和 V 兩份
```

**舉例**：Llama 3 70B 模型（80 層、64 heads、head_dim 128），fp16（2 bytes）：

| 序列長度 | 單筆 KV Cache 大小 |
|---|---|
| 1K tokens | ~2.6 GB |
| 4K tokens | ~10 GB |
| 32K tokens | ~80 GB ← **比模型權重還大** |
| 128K tokens | ~320 GB |

這就是為什麼：
- **長上下文 LLM 很貴**（不只算力，更是 VRAM 壓力）
- **批次大小 batch size 被 KV Cache 壓死**（一張 H100 80G 可能只能同時服務幾十個使用者）
- 業界狂推各種**壓縮 KV Cache 的技術**：
  - **MQA / GQA**（Multi-Query / Grouped-Query Attention，Llama 3 用這個）— 多個 head 共用一組 K/V
  - **PagedAttention**（vLLM 的招牌）— 像作業系統的分頁管理，避免碎片
  - **KV Cache 量化**（fp16 → int8 → int4）
  - **滑動窗口 / sink tokens**（Mistral）— 只保留最近 N 個 token 的 KV

### 3.8 KV Cache vs Prompt Caching —— 什麼關係？

**Prompt Caching 就是把 KV Cache 從「單次 request 內」延伸到「跨 request 重用」**：

```
原本的 KV Cache：
  request 1 結束 → KV Cache 丟棄 → request 2 重新 prefill 整個 prompt

Prompt Caching：
  request 1 結束 → 有 cache_control 的 prefix 部分 KV 被留下來
  request 2 進來 → 前綴相同的部分直接從 cache 讀 KV、不用 prefill
                  → 只要 prefill「新增的部分」（通常就是那個 query）
```

這就是 Anthropic/OpenAI/Gemini 的 Prompt Caching 底層——**把已經算好的前綴 KV 存在 GPU 記憶體裡**（或 CPU/SSD 做分層），下次命中前綴就跳過 prefill。

所以：
- 讀取便宜（0.1x）是因為**跳過了 prefill 的算力**
- 首 token 延遲降 85% 是因為**prefill 是 LLM 最慢那段、現在直接省掉**
- 5 分鐘 TTL 是因為**GPU 記憶體有限、久沒用就得清掉**

---

## 4. 三層疊加的典型產品架構

```
使用者 query
    │
    ▼
【層 1】Semantic Cache 命中？ ──► 直接回答（~10ms，0 元）
    │ miss
    ▼
組 prompt（system + 檢索到的文件 + query）
    │
    ▼
【層 2】Prompt Caching：前綴命中？ ──► prefill 跳過、省 90% token 費用、首 token 快 85%
    │ miss
    ▼
【層 3】KV Cache：推論時自動處理（這層你不用管）
    │
    ▼
LLM 生成答案
    │
    ▼
答案寫回 Semantic Cache（供未來命中）
```

### 實際命中率 / 省錢估算

一個做客服 bot 的產品，流量跑起來後典型命中分佈：

| 層 | 命中率 | 該層能省 |
|---|---|---|
| Semantic Cache | 20~40%（看問題多重複）| 100% LLM 費用 |
| Prompt Caching | 剩下的 80~95%（system + 文件幾乎不變）| 90% input token 費用 |
| KV Cache | 100%（自動發生，不是可選的）| — |

**三層疊完，整體 LLM 成本可以降到沒優化版的 10~20%**。這就是為什麼成熟的 LLM 產品都把這三層當標配。

---

## 5. 常見混淆整理

| 搞混的事 | 正解 |
|---|---|
| 「cached query」= Prompt Caching？ | **不是**。Prompt Caching 快取前綴（system + 文件），query 本身通常不快取。最接近「cached query」概念的是 **Semantic Cache**。|
| Prompt Caching 跟 KV Cache 是兩回事？ | **同源**。Prompt Caching 底層就是 KV Cache 的跨 request 版本。|
| KV Cache 是可選功能嗎？ | **不是**。現代 LLM 推論引擎（vLLM、TGI、llama.cpp）全部內建，沒它生成速度會慢幾十到幾百倍。|
| 長 context 為什麼貴？ | 算力吃得多是一部分，**更大瓶頸是 KV Cache 吃 VRAM**——序列越長記憶體佔用線性成長，batch 就壓不大、GPU 服務人數就掉。|
| 為什麼 Semantic Cache 要加 user_id？ | 避免 abby 的 query 誤命中 bob 的答案（個人化場景必備）。|

---

## 6. 給自己的 TL;DR

1. **三層快取疊加**：Semantic Cache（跳過 LLM）→ Prompt Caching（跳過 prefill）→ KV Cache（跳過重複 attention 計算）。
2. **最常被講成「cached query」的是 Semantic Cache**——用 embedding 找相似 query、直接回舊答案。
3. **Prompt Caching 就是 KV Cache 的跨 request 版本**——理解 KV Cache 才懂 Prompt Caching 在幹嘛。
4. **KV Cache 是 LLM 推論能跑的關鍵**：沒它每生成 N 個 token 就要做 O(N²) 次 attention，序列長一點就慢到不能用。
5. **KV Cache 的代價是 VRAM**——長 context 很貴的真正原因，各家都在做壓縮（GQA、PagedAttention、量化）。
6. **生產級 LLM 產品三層全用**——典型可降到原成本的 10~20%。

---

## 相關筆記

- [rag-vs-memory-comparison.md](rag-vs-memory-comparison.md) — RAG vs Memory 差別，Prompt Caching 在 RAG 場景為何是必學優化
- [mem0-benchmark-and-architecture.md](mem0-benchmark-and-architecture.md) — Mem0 的多信號檢索與 p95 延遲優化
- [text2mem-12-atomic-operations.md](text2mem-12-atomic-operations.md) — Retrieve / Search 這類 RET 階段原子操作
