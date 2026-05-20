# 餘弦相似度與 pgvector

> 主題：什麼是餘弦相似度、`<=>` 距離怎麼翻成相似度、SQL 裡 `%s::vector` 與 `AS similarity` 在做什麼。
> 對應程式碼：`abby-notes-rag/src/db.py` 的 `search()` 方法。

---

## 1. 餘弦相似度的直覺（不用會數學）

把每段文字想成從原點射出的一支**箭頭**（向量）。餘弦相似度**只看方向，不看長度**：

```
        ↑ C (向上)
        |
        |
  ←─────┼─────→ A、B (向右)
  D     |
 (向左) |
```

| 兩支箭頭 | 方向關係 | 餘弦相似度 |
|---------|---------|----------|
| A 和 B（都向右） | 同方向 | **1**（最像） |
| A 和 C（右 vs 上） | 垂直 90° | **0**（無關） |
| A 和 D（右 vs 左） | 相反 | **-1**（最不像） |

餘弦相似度是一個 **-1 到 1** 的分數：**1 = 一模一樣，0 = 沒關係，-1 = 完全相反**。

**為什麼用「方向」不用「長度」**：一篇短筆記和一篇長筆記如果都在講 Redis，意思一樣、方向就一樣。餘弦不管長度差多少，比的是「意思像不像」，不是「字多不多」。這正是 RAG 要的。

> 實務補充：bge-m3 這類模型的向量做過正規化，實際文字之間的相似度幾乎都落在 **0 到 1**（很少出現負的），所以 search 結果看到的 similarity 大多是 0.x。

---

## 2. `<=>` 是「距離」不是「相似度」

pgvector 的 `<=>` 給的是**餘弦距離 (cosine distance)**，定義是：

```
距離 = 1 − 相似度
```

距離是「差多遠」，方向跟相似度相反：**越像 → 距離越小**。

| 兩段文字 | 相似度 | 距離 = 1 − 相似度 |
|---------|-------|-----------------|
| 一模一樣 | 1 | 1 − 1 = **0**（沒距離） |
| 無關 | 0 | 1 − 0 = **1** |
| 相反 | -1 | 1 − (-1) = **2**（最遠） |

距離範圍是 **0 到 2**：0 最近，2 最遠。

### pgvector 的三個距離算子

| 算子 | 意義 | 範圍 |
|-----|-----|-----|
| `<=>` | cosine distance（餘弦距離） | 0 ～ 2 |
| `<->` | L2 distance（歐氏距離） | 0 ～ ∞ |
| `<#>` | negative inner product | -∞ ～ 0 |

---

## 3. 把距離翻回相似度：`1 - (embedding <=> q)`

DB 給的是距離，但我們想要相似度，所以再做一次 `1 - ...` 翻回去。關鍵代數是 **`1 − (1 − x) = x`**，兩個減一互相抵消：

```
1 − 距離
= 1 − (1 − 相似度)      ← 把距離定義代入
= 1 − 1 + 相似度        ← 拆括號，負負得正
= 相似度                ← 兩個 1 抵消
```

用數字驗證，每一列「1 − 距離」都剛好等於原本的相似度：

| 相似度 x | 距離 1−x | 1 − 距離 | 結果 |
|---------|---------|---------|------|
| 1 | 0 | 1 − 0 = **1** | 回到 1 |
| 0 | 1 | 1 − 1 = **0** | 回到 0 |
| -1 | 2 | 1 − 2 = **-1** | 回到 -1 |

---

## 4. SQL 拆解

`db.py` 的 search SQL 關鍵這行：

```sql
1 - (embedding <=> %s::vector) AS similarity
```

### 4.1 `%s::vector` = 「兩個東西黏在一起」

```
%s          ::vector
└┬┘         └──┬──┘
佔位符       型別轉換
```

#### `%s` = psycopg2 的參數佔位符

不是 Python 字串格式化，是 psycopg2 的安全參數替換。執行時把 `params` 裡的值塞進來：

```python
params = (query_embedding, query_embedding, top_k)
#          ↑第一個 %s        ↑第二個 %s        ↑第三個 %s(LIMIT)
db.fetchall(sql, params)
```

query 向量（`q`）就是這樣進到 SQL，它在 SQL 裡的長相就是 `%s`。
用 `%s` 而非手拼字串：psycopg2 幫你跳脫、防 SQL injection，1024 個數字也不會拼錯。

#### `::vector` = PostgreSQL 的型別轉換 (cast)

`值::型別` 是 PostgreSQL 的 cast 語法。**原本是什麼 → 轉成什麼**：

```
原本：從 %s 塞進來的參數，PostgreSQL 視為「unknown / text」型別
                          │
                          │  ::vector
                          ▼
轉換後：pgvector 的「vector」型別
```

| | cast 前 | cast 後 |
|---|--------|--------|
| 型別 | unknown / text（一串文字） | vector（pgvector 專屬型別） |
| 能不能用 `<=>` | 不能，會報錯 | 能 |

**為什麼一定要 cast**：`<=>` 算子**只認得 `vector` 型別**。`embedding` 欄位在 `init_db.sql` 已是 `vector`，但從 `%s` 塞進來的參數 PostgreSQL 不確定型別。加 `::vector` 明講「這是 vector」，兩邊型別才對得上：

```sql
embedding   <=>   %s::vector
└── vector ─┘     └─ 也轉成 vector ─┘
        兩邊都 vector，<=> 才認得
```

不加 cast 可能噴 `operator does not exist: vector <=> unknown`。

#### 替換前後對照

執行前（你寫的）：
```sql
ORDER BY embedding <=> %s::vector
```
psycopg2 替換後（概念上）：
```sql
ORDER BY embedding <=> '[0.12, -0.03, 0.88, ...共1024個]'::vector
```
`%s` 變成真正的向量字串，`::vector` 把那串文字轉成 vector 型別。

### 4.2 `AS similarity` = 欄位別名 (column alias)

```sql
1 - (embedding <=> %s::vector) AS similarity
└──────── 算出來的值 ────────┘ └── 取個名字 ──┘
```

`1 - (...)` 是運算結果，**沒有天生的欄位名**。

| | 不寫 AS | 寫 AS similarity |
|---|--------|-----------------|
| psql 顯示的欄位名 | `?column?`（醜） | `similarity`（乾淨） |

#### 在這份 code 裡它主要是「可讀性」

db.py 回傳是用**位置 `r[3]`** 取值，不是用名字：

```python
{"file_path": r[0], "heading_path": r[1], "content": r[2], "similarity": float(r[3])}
#                                                                          ↑ r[3] 位置取
```

所以即使不寫 `AS similarity`，`r[3]` 一樣拿得到。**功能上不是必須**，但還是寫，因為：
1. 自我說明：讀 SQL 一眼知道第四欄是相似度
2. 直接在 psql / pgAdmin 跑時欄位標題乾淨
3. 改用「按名字取值」（如 `DictCursor` 的 `row["similarity"]`）時就變必須

#### 容易混淆：SQL alias 和 Python dict key 是兩件事

```
SQL:    ... AS similarity            ← 給 SQL 結果欄位取名
Python: {"similarity": float(r[3])}  ← 在 Python 裡自己取的 key
```

Python 的 key 是手寫的，**不是從 SQL alias 自動帶過來**（這裡用位置 `r[3]` 取）。兩個同名只是為了好讀，沒有自動連動。

---

## 5. 為什麼 DB 給距離、不直接給相似度

因為**搜尋要排序**。資料庫排序習慣「由小到大」，而「距離小 = 最像」：

```sql
ORDER BY embedding <=> %s::vector   -- 距離由小到大 = 最像的排最前
LIMIT 5                              -- 取前 5 名
```

用距離排序，由小到大自然就是「最像的在最前面」，邏輯最順。要看分數時，再 `1 - 距離` 翻成相似度給人看。

---

## 6. 一句話總結表

| 語法 | 是什麼 | 沒有它會怎樣 |
|-----|-------|------------|
| `%s` | psycopg2 佔位符，執行時塞入 query 向量 | 沒值可比 |
| `::vector` | 把塞進來的值從 unknown/text 轉成 vector 型別 | `<=>` 認不得，報型別錯 |
| `1 - (...)` | 距離翻回相似度（`1−(1−x)=x`） | 拿到的是距離不是相似度 |
| `AS similarity` | 給算出來的欄位取名 | 欄位變 `?column?`，但本 code 仍能用 `r[3]` 取 |

---

## 相關筆記
- [[concepts-chunking-vs-embedding-vs-llm-vs-pgvector]]
- [[pgvector-setup-guide]]
- [[chunk-and-incremental-ingest]]
