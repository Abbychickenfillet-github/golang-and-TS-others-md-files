# Chunking 策略對照 — 從 split('\n\n') 到 LangChain 到 semantic chunking

> **這份筆記回答**：
> 1. `text.split('\n\n')` 真的很爛嗎？（對！）
> 2. LangChain RecursiveCharacterTextSplitter 比較好在哪？
> 3. 中文場景該怎麼切？
> 4. 各種策略的優缺點？
>
> **建立日期**：2026-05-05

---

## 0. 你的觀察是對的：簡單 split 很爛

```python
# 你說的這種寫法
chunks = text.split('\n\n')
```

**為什麼爛？** 因為它假設「**段落都用兩個換行隔開**」，但現實世界：

| 現實情況 | split('\n\n') 的後果 |
|---------|-------------------|
| 文章只用一個換行 | ❌ **完全沒切**（整篇變一個 chunk）|
| 文章是 PDF 抽出來的 | ❌ 換行隨機，切出一堆破碎片段 |
| 段落超長（5000 字）| ❌ 一個 chunk 5000 字塞不進 LLM |
| 段落超短（10 字）| ❌ 一堆 10 字 chunk，沒上下文 |
| 有列表、code block | ❌ 列表項目可能被當成段落切散 |

→ 你說「至少要中文句號或英文 period 吧」**部分對**，但**單純按句號還不夠**——下面細說。

---

## 1. Chunking 6 個層次（由淺到深）

### Level 1: `text.split('\n\n')` — 段落分割（你說的這個）

```python
chunks = text.split('\n\n')
```

**問題**：

```
原文：
「白日依山盡，黃河入海流。\n欲窮千里目，更上一層樓。\n\n春眠不覺曉，處處聞啼鳥。」

split('\n\n') 結果：
chunk 1: 「白日依山盡，黃河入海流。\n欲窮千里目，更上一層樓。」
chunk 2: 「春眠不覺曉，處處聞啼鳥。」

vs

原文（PDF 抽出，每行有 \n）：
「白日依山盡，\n黃河入海流。\n欲窮千里目，\n更上一層樓。」

split('\n\n') 結果：
chunk 1: 「白日依山盡，\n黃河入海流。\n欲窮千里目，\n更上一層樓。」
                                                              ↑ 整個沒切，因為沒 \n\n
```

→ **取決於原文格式**，遇到不同來源就崩。

### Level 2: 按句號切（你提的這個）

```python
import re
chunks = re.split(r'[。.!?！？]', text)
```

**改進**：不再依賴段落結構，每個句子一個 chunk。

**新問題**：

```
chunk 1: 「白日依山盡」
chunk 2: 「黃河入海流」
chunk 3: 「欲窮千里目」
chunk 4: 「更上一層樓」
```

每個 chunk 太短（<10 字），**embedding 出來缺乏上下文**——「白日依山盡」單獨看很難表達「這是首詩在講什麼」。

### Level 3: 固定字數切片（最常見的版本）

```python
def chunk_fixed(text, chunk_size=500, overlap=50):
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunks.append(text[i:i + chunk_size])
    return chunks
```

**改進**：
- ✅ 每個 chunk 大小固定，不會太小
- ✅ 有 `overlap`（重疊區），相鄰 chunk 有上下文連結

**圖示 overlap 概念**：

```
原文：「abcdefghijklmnop...」（假設）

chunk_size=10, overlap=3：

chunk 1: abcdefghij
              ↑↑↑
chunk 2:        hijklmnopq    ← 跟 chunk 1 重疊 3 字（hij）
                       ↑↑↑
chunk 3:               opqrstuvw

→ 每個 chunk 結尾的那幾個字會出現在下個 chunk 開頭
→ 避免「重要關鍵字剛好被切在邊界」的問題
```

**問題**：

```
原文最後幾字：「...蘋果是」「水果，紅色」「或綠色」
                              ↑
                       中間切斷一句話
```

→ 還是會把句子切到一半。但比 Level 1、2 好用很多。

### Level 4: LangChain `RecursiveCharacterTextSplitter` ⭐ 主流

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", "。", "！", "？", "，", " ", ""]
)
chunks = splitter.split_text(text)
```

**改進**：**遞迴嘗試多種分隔符**，盡量保留語義單位完整。

**運作邏輯**：

```
切之前先看：能不能用 \n\n 切？
   ├── 切完後每段 < 500 字 → ✅ 用 \n\n 切
   │
   └── 還有段落 > 500 字 → 對那段繼續切
        │
        切之前看：能用 \n 切嗎？
        ├── 切完每段 < 500 字 → ✅ 用 \n
        │
        └── 還有 > 500 字 → 對那段繼續切
             │
             用 「。」切？
             └── 用 「！」「？」切？
                  └── 用 「，」切？
                       └── 用空格切？
                            └── 一個字一個字切（最後手段）
```

**結果**：**盡量在自然斷點切**（段落 > 句子 > 子句 > 字），不硬切到一半。

### Level 5: Token-aware 切片（給 LLM 用必看）

字數不等於 LLM 看到的「token 數」：

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
import tiktoken

# 用 OpenAI 的 tokenizer 算 token
encoding = tiktoken.encoding_for_model("gpt-4")

splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    encoding_name="cl100k_base",
    chunk_size=500,        # ← 500 個 token，不是 500 個字
    chunk_overlap=50
)
chunks = splitter.split_text(text)
```

**為什麼重要？**

```
中文：「蘋果好吃」 = 5 個字 ≈ 7 個 token
英文：「Apple is good」 = 13 個字 ≈ 3 個 token

LLM 限制是 token 數（GPT-4 是 128K tokens），不是字數。
chunk_size 用 token 算才能精確控制塞進 prompt 的量。
```

### Level 6: Semantic Chunking（語義切片）⭐ 最先進

用 embedding 找「**語義轉折點**」切：

```python
# 概念示意（實作較複雜）
# 1. 把文章按句子拆
# 2. 每句 embed 成向量
# 3. 計算相鄰句子的相似度
# 4. 相似度突然下降的地方 → 語義轉折 → 在這裡切

from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(OpenAIEmbeddings())
chunks = splitter.create_documents([text])
```

**最強，但也最貴**——每次切都要呼叫 embedding API。

---

## 2. 各策略對照速查

| Level | 方法 | 速度 | 品質 | 何時用 |
|-------|------|------|------|------|
| 1 | `split('\n\n')` | 最快 | 最差 | 原文格式很乾淨時 |
| 2 | 按句號切 | 快 | 差（chunk 太短）| 短文章勉強用 |
| 3 | 固定字數 + overlap | 快 | 中 | 簡單實作 |
| 4 | **LangChain Recursive** ⭐ | 中 | 好 | **主流選擇** |
| 5 | Token-aware | 中 | 好 + 精確控制 | **要丟 LLM 必用** |
| 6 | Semantic | 慢 + 貴 | 最佳 | 高品質需求 |

---

## 3. LangChain RecursiveCharacterTextSplitter 詳解

### 3.1 中文場景的正確設定

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=[
        "\n\n",       # 段落
        "\n",         # 換行
        "。",         # 中文句號
        "！",         # 中文驚嘆
        "？",         # 中文問號
        "；",         # 中文分號
        "，",         # 中文逗號
        " ",          # 空格
        ""            # 字元
    ],
    keep_separator=True   # 保留分隔符
)
```

**關鍵**：要把**中文標點**加進 `separators`。預設只有英文標點 → 中文會切不好。

### 3.2 中英混合呢？

```python
separators=[
    "\n\n",
    "\n",
    "。", "！", "？",        # 中文
    ".", "!", "?",           # 英文
    "，", ",",               # 中英文逗號
    " ",
    ""
]
```

### 3.3 chunk_size 該設多少？

| 場景 | 建議 chunk_size | 為什麼 |
|------|---------------|--------|
| FAQ / 短文 | 200-300 字 | 每筆答案集中 |
| 長文章 | 500-800 字 | 一個 chunk 一個觀念 |
| 法律 / 技術文件 | 1000-1500 字 | 要保留完整段落 |
| 程式碼 | 視情況 | 用 code-aware splitter |

### 3.4 chunk_overlap 該設多少？

**經驗法則**：`chunk_overlap = chunk_size × 10-20%`

```
chunk_size=500  → overlap=50-100
chunk_size=1000 → overlap=100-200
```

太多 → 浪費 embedding 成本（重複 embed）
太少 → 邊界附近的概念被切散

---

## 4. 中文 Chunking 特殊考量

### 4.1 字元級 vs Token 級

中文一個字 ≈ 1.5-2 個 token（GPT 的 tokenizer 對中文不友善）：

```
「我愛你」（3 字）
→ tiktoken 算 cl100k_base：3-5 個 tokens
→ 不是 1:1 對應
```

→ 中文用 token-aware 切片時，`chunk_size=500 tokens` 大約只有 **250-330 個中文字**。

### 4.2 沒空格

中文沒有像英文那樣的單詞邊界：

```
英文：「The quick brown fox」 ← 用空格切就行
中文：「敏捷的棕色狐狸」      ← 用什麼切？
```

→ 中文 chunking 主要靠 **標點 + 固定字數**，不能靠「單詞邊界」。

### 4.3 標點符號要處理全形 vs 半形

```python
# 容易踩雷
text = "你好，世界。Hello, world."
#         ↑ 全形            ↑ 半形

separators = ["，", ","]   # 都加進去
```

---

## 5. 實作範例：完整 chunking → embedding → 存 pgvector

```python
# chunk_and_embed.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Step 1: chunking（純 Python，沒 model）
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", "。", "！", "？", "，", " ", ""]
)

long_text = """
人工智慧（AI）是電腦科學的一個分支，其目標是研究、開發能模擬、延伸和擴展人類智慧的理論、方法、技術及應用系統。

機器學習是 AI 的一個子領域，專注於讓電腦從資料中自動學習，而不是依賴明確的程式規則。

深度學習是機器學習的一個分支，使用多層神經網路來模擬人腦的學習過程。
"""

chunks = splitter.split_text(long_text)
print(f"共切出 {len(chunks)} 段")

# Step 2: embedding（用 sentence-transformers）
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
vectors = model.encode(chunks, normalize_embeddings=True)
print(f"每個向量維度：{vectors.shape[1]}")  # 384

# Step 3: 存進 pgvector
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS chunks_demo;")
cur.execute("""
    CREATE TABLE chunks_demo (
      id bigserial PRIMARY KEY,
      content text,
      embedding vector(384)
    );
""")

for chunk, vec in zip(chunks, vectors):
    cur.execute(
        "INSERT INTO chunks_demo (content, embedding) VALUES (%s, %s)",
        (chunk, str(vec.tolist()))
    )
conn.commit()
print("✅ 全部存好")

# Step 4: 查詢
query = "什麼是深度學習？"
query_vec = model.encode(query, normalize_embeddings=True).tolist()

cur.execute("""
    SELECT content, embedding <=> %s::vector AS dist
    FROM chunks_demo
    ORDER BY dist
    LIMIT 2
""", (str(query_vec),))

print(f"\n查詢：「{query}」")
for content, dist in cur.fetchall():
    print(f"  距離 {dist:.4f}：{content[:50]}...")

cur.close()
conn.close()
```

---

## 6. Code-aware Chunking（額外）

切程式碼有專門 splitter：

```python
from langchain.text_splitter import (
    PythonCodeTextSplitter,
    JavaScriptCodeTextSplitter,
    MarkdownTextSplitter,
)

py_splitter = PythonCodeTextSplitter(chunk_size=1000)
chunks = py_splitter.split_text(python_source)
# 不會把 def 函式切到一半
```

---

## 7. 進階：什麼時候用 Semantic Chunking？

只有以下狀況才考慮：
- ✅ 高品質要求（醫療 / 法律）
- ✅ 文章結構亂（PDF 抽出來的）
- ✅ 預算夠（每篇文章 chunking 一次要花 $0.01-0.10）

普通情況用 Level 4（LangChain Recursive）就好，**已經足夠**。

---

## 8. 速記卡

```
最爛：text.split('\n\n')               ← 別用
中等：固定字數 + overlap                ← 簡單實作
推薦：LangChain RecursiveCharacterTextSplitter ⭐
精確：token-aware（要丟 LLM 必用）
最強：Semantic Chunking（貴 + 慢，特殊場景才用）

中文要把 「。！？，」 加進 separators
chunk_size：500-800 字主流
chunk_overlap：chunk_size 的 10-20%
chunking 是純 Python 字串操作，沒用 model
```

---

## 9. 我們專案實際採用的策略（決策 → 程式碼對照）

> 補充 2026-05-20：abby-notes-rag 真正用的 chunker，以及更正「它底層其實是 LangChain」。

當初決策（出自 [2026-05-07-rag-system-design.md](2026-05-07-rag-system-design.md) 的「Chunking 策略」）：

```
1. 先按 # / ## / ### / #### headers 切分
2. 每塊上限 800 tokens（中文約 1200-1600 字）
3. 每塊下限 100 tokens（過小的合併到上一塊）
4. 超過 800 tokens 的段落用 sliding window 再切
```

實作在 `abby-notes-rag/src/chunker.py`，決策對照程式碼：

| 當初決策 | chunker.py 實作 | 誰做的 |
|---------|---------------|-------|
| 規則1：按 # ## ### #### 切 | `HEADERS_TO_SPLIT` + `MarkdownHeaderTextSplitter` | LangChain |
| 規則2：上限 800 tokens | `max_tokens` + 超過才切 | tiktoken 算 token |
| 規則4：超過用 sliding window | `RecursiveCharacterTextSplitter.from_tiktoken_encoder`（含 overlap） | LangChain |
| 規則3：下限 100、太小合併 | `if tokens < min_tokens: 合併到 prev` | **自己寫的邏輯** |

數字 800 / 100 / 100 來自 `.env` 的 `CHUNK_MAX_TOKENS` / `CHUNK_OVERLAP_TOKENS` / `CHUNK_MIN_TOKENS`，經 config.py 傳入。

**重點更正**：chunker.py **不是**「從零自己寫切割演算法」。真正切割是 LangChain 的兩個 splitter；我們自己寫的是 **編排層**——呼叫順序、`heading_path` 組裝、小 chunk 合併、`Chunk` dataclass。

---

## 10. LangChain 要錢嗎？（常見誤會）

LangChain 是一家公司（LangChain, Inc.），但「是公司」不等於「東西都要錢」。要分清楚開源函式庫 vs 付費 SaaS：

| LangChain 的東西 | 收費嗎 | 說明 |
|----------------|-------|-----|
| langchain / langchain-text-splitters（函式庫） | **免費**（MIT 開源） | `pip install` 的這些，含所有 splitter |
| MarkdownHeaderTextSplitter | **免費** | 純 Python 字串處理，本機跑 |
| RecursiveCharacterTextSplitter | **免費** | 同上 |
| LangSmith（除錯/監控雲端服務） | 付費 | 要註冊的 SaaS |
| LangGraph Platform（部署服務） | 付費 | 雲端部署產品 |

**公司怎麼賺錢**：靠 LangSmith、LangGraph Platform 等雲端 SaaS 訂閱，不是函式庫。

**為什麼 splitter 一定免費**：它不連網、不呼叫 API、不需要金鑰，全程在你電腦上跑。沒有 AI / model / API call = 不可能產生費用。就是聰明一點的字串切割。

**這份筆記唯一會花錢的**：Level 6 的 `SemanticChunker`——但花錢的不是 LangChain，是它呼叫的 `OpenAIEmbeddings`（OpenAI API）。外殼免費，它打的 OpenAI API 要錢。

**我們的 chunker.py 完全免費**：`MarkdownHeaderTextSplitter` + `RecursiveCharacterTextSplitter.from_tiktoken_encoder` + tiktoken（OpenAI 開源 tokenizer，本機跑）全免費，整條 chunking 流程 $0。

---

## 相關筆記

- [concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md](concepts-chunking-vs-embedding-vs-llm-vs-pgvector.md) — 概念釐清（chunking 不是 model）
- [pgvector-with-openai-embedding.md](pgvector-with-openai-embedding.md) — embedding 完整實作
- [embedding-models-comparison.md](embedding-models-comparison.md) — embedding model 對照

## 官方資源

- **LangChain TextSplitter docs**：<https://python.langchain.com/docs/concepts/text_splitters/>
- **LangChain Recursive splitter API**：<https://python.langchain.com/api_reference/text_splitters/character/langchain_text_splitters.character.RecursiveCharacterTextSplitter.html>
- **tiktoken**：<https://github.com/openai/tiktoken>
- **Semantic Chunking 範例**：<https://python.langchain.com/docs/how_to/semantic-chunker/>
