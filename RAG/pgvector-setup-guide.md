# pgvector 安裝與第一個 RAG 實驗 — 完整步驟

> **這份筆記記錄**：從零開始下載並使用 pgvector 向量資料庫的步驟。
>
> **目標**：跑起一個能存 / 查向量的 PostgreSQL，做第一次「向量相似度搜尋」實驗。
>
> **建立日期**：2026-05-04

---

## 0. pgvector 是什麼？

**pgvector = PostgreSQL 的擴充套件 (extension)**，讓 Postgres 支援向量資料型別 + 向量相似度搜尋。

⚠️ **它不是獨立軟體**：
- ❌ 沒有 `pgvector start` 這種指令
- ❌ 不能單獨執行
- ✅ 必須裝在 PostgreSQL 上才能用

### 核心能力

```sql
-- 啟用擴充
CREATE EXTENSION vector;

-- 建表（embedding 是 1536 維向量）
CREATE TABLE items (
  id bigserial PRIMARY KEY,
  embedding vector(1536)
);

-- 插入向量
INSERT INTO items (embedding) VALUES ('[0.1, 0.2, ..., 0.9]');

-- 找最相近的 5 個（用 <-> 運算子算 L2 距離）
SELECT * FROM items ORDER BY embedding <-> '[0.5, 0.5, ..., 0.5]' LIMIT 5;
```

### pgvector 支援的索引（呼應 [rag-vs-memory-comparison.md 0.5 節](../LLM-Memory/rag-vs-memory-comparison.md)）

| 索引 | pgvector 寫法 | 何時用 |
|------|--------------|--------|
| **Flat** | 不建 index（預設） | 資料 < 10 萬條 |
| **HNSW** | `CREATE INDEX ... USING hnsw (embedding vector_l2_ops)` | 主流選擇（10 萬~1000 萬） |
| **IVFFlat** | `CREATE INDEX ... USING ivfflat (embedding vector_l2_ops) WITH (lists = 100)` | 大型資料 + 接受近似 |

#### `_ops` 是什麼？

上面表格的 `vector_l2_ops` 後綴 `_ops` = **op**erator clas**s**（運算子類別），是 PostgreSQL 通用的索引機制術語，告訴索引「比較這個欄位時，**要用哪一種距離 / 順序定義**」。

##### 拆解 `vector_l2_ops`

```
vector  _  l2  _  ops
   ▲       ▲      ▲
 型別     方法   operator class
```

| 部分 | 意思 |
|------|------|
| `vector` | 適用的資料型別（pgvector 的 vector type）|
| `l2` | 用 L2 距離（歐幾裡得，下節詳解）|
| `ops` | operator class 的縮寫（PostgreSQL 慣例後綴）|

##### 為什麼要分三種？

同一個 vector type 有 3 種「相似」定義（L2、Cosine、內積），建索引時要先講好「按哪一種排序」，不然 HNSW 不知道怎麼排這棵圖：

| operator class | 對應運算子 | 距離 | 適用 |
|---|---|---|---|
| `vector_l2_ops` | `<->` | L2 (Euclidean) | 數值、影像 |
| `vector_cosine_ops` | `<=>` | Cosine | 文字 embedding 主流 |
| `vector_ip_ops` | `<#>` | 負內積 | 已正規化向量 |

##### 鐵則：索引 ops 必須跟查詢運算子配對

```sql
-- ✅ 配對正確 → 索引被使用，超快
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
SELECT * FROM items ORDER BY embedding <-> '[1,0,0]' LIMIT 5;

-- ❌ 配對錯誤 → 索引廢掉，退回全表掃描
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
SELECT * FROM items ORDER BY embedding <=> '[1,0,0]' LIMIT 5;
--                                    ▲
--                          Cosine，索引是 L2，Postgres 不認得這個組合
```

→ **要用哪個距離查詢，就建哪個 ops 的索引**；想兩種都用就建兩個索引。

##### `_ops` 不是 pgvector 發明的

是 PostgreSQL **通用索引擴充機制**，內建型別也有：

| operator class | 用途 |
|---|---|
| `int4_ops` | 整數預設排序 |
| `text_pattern_ops` | `LIKE 'abc%'` 前綴搜尋（跟一般 `text_ops` 不同）|
| `gin_trgm_ops` | pg_trgm 模糊搜尋 |
| `jsonb_path_ops` | JSONB 路徑搜尋 |

任何資料型別想被索引，都要為「每種比較方式」註冊一個 operator class —— pgvector 只是延續這套慣例。

### 數學背景：歐幾裡德距離 (L2)

> **歐式距離就是畢氏定理的推廣。**

`<->` 運算子背後的數學就是這個。先理解原理，後面看 SQL 就秒懂。

#### 公式（用 LaTeX 寫的）

$$
d(A, B) = \sqrt{\sum_{i=1}^{n} (a_i - b_i)^2}
$$

> ⚠️ `$$ ... $$` 是 **Markdown / Obsidian 的 LaTeX 數學排版語法**（給人看的展示），**不是程式碼**，不能執行。雙錢字符是 block 模式、單錢字符 `$ ... $` 是 inline 模式。Obsidian、GitHub、Jupyter 都支援。

白話：**對應位置相減 → 平方 → 加總 → 開根號**。

#### 從 2D 到 N 維

| 維度 | 範例 | 計算 |
|------|------|------|
| 2D（畢氏定理）| A=(0,0), B=(3,4) | √((0-3)² + (0-4)²) = √(9+16) = √25 = **5** |
| 3D（4.3 的「蘋果 vs 香蕉」）| A=[1,0,0], B=[0.9,0,0.1] | √(0.01 + 0 + 0.01) = √0.02 ≈ **0.1414** |
| 1536D（OpenAI embedding）| i 從 1 跑到 1536 | 公式不變，CPU SIMD 幾微秒搞定 |

#### Python 一行實現（給電腦跑的）

```python
import numpy as np

vec1 = np.array([1.0, 0.0, 0.0])      # 蘋果
vec2 = np.array([0.9, 0.0, 0.1])      # 香蕉

distance = np.sqrt(sum(pow(vec1 - vec2, 2)))
print(distance)   # 0.1414...
```

#### LaTeX 公式 vs Python 程式碼差在哪？

| | LaTeX `$$ ... $$` | Python `np.sqrt(...)` |
|---|---|---|
| 是什麼 | 數學排版語法 | 可執行程式碼 |
| 給誰看 | 人（給排版引擎渲染）| 電腦（給 Python 直譯器執行）|
| 在哪用 | Markdown / Obsidian / 論文 | `.py` 檔 / Jupyter |
| 能跑嗎 | ❌ 純展示 | ✅ 跑出 `0.1414...` |
| 範例 | $d = \sqrt{(3-0)^2 + (4-0)^2} = 5$（會渲染成數學符號）| `np.sqrt((3-0)**2 + (4-0)**2)` → `5.0` |

→ 兩者**做的是同一件事**（畢氏定理），只是一個「給人看公式」、一個「讓電腦算結果」。

#### 逐字拆解 Python 程式碼

| 部分 | 是什麼 | 範例算式 |
|------|--------|---------|
| `np` | **NumPy** 慣例別名（**不是 neural**！源自 `import numpy as np`）| Python 數值運算標準函式庫 |
| `np.array([...])` | 建 NumPy 陣列 | 把 list 變成能向量化運算的物件 |
| `vec1 - vec2` | NumPy **element-wise 減法**（對應位置相減）| `[1-0.9, 0-0, 0-0.1] = [0.1, 0, -0.1]` |
| `pow(x, 2)` | Python 內建 **冪次函式**：`pow(底數, 指數)` | 第 2 個參數 `2` = 指數 = 平方 → `[0.01, 0, 0.01]` |
| `sum(...)` | 加總所有元素 | `0.01 + 0 + 0.01 = 0.02` |
| `np.sqrt(x)` | **square root**（開平方根） | `√0.02 ≈ 0.1414` |

#### `pow` 的第 2 個參數是「指數」

| 寫法 | 意思 |
|------|------|
| `pow(x, 2)` | x² 平方 |
| `pow(x, 3)` | x³ 立方 |
| `pow(x, 0.5)` | √x 開根號（等同 `sqrt`）|
| `pow(x, -1)` | 1/x 倒數 |

三種等價寫法都常見：

```python
pow(vec1 - vec2, 2)        # Python 內建 pow
(vec1 - vec2) ** 2         # ** 運算子（最 Pythonic）
np.square(vec1 - vec2)     # NumPy 函式（最快）
```

#### 為什麼不用 for 迴圈？

NumPy 的「**向量化運算 (vectorization)**」：對整個陣列一次運算完，底層用 C + SIMD 並行跑。

```python
# 沒 NumPy 的笨寫法（1536 維會 loop 1536 次）
total = 0
for i in range(len(vec1)):
    total += (vec1[i] - vec2[i]) ** 2
distance = total ** 0.5

# NumPy 一行（快、簡潔）
distance = np.sqrt(sum(pow(vec1 - vec2, 2)))
```

#### 跟 pgvector `<->` 的對應關係

```
   pgvector (SQL)                  Python (NumPy)
   ───────────────                 ──────────────
embedding <-> '[1,0,0]'    ≡    np.sqrt(sum(pow(vec - query, 2)))
         ▲                                ▲
    DB 內建運算子                     手算等價版
```

→ `<->` 把這條公式封裝成 DB 運算子，且能走 HNSW 索引加速。實務上 NumPy 還有更精煉的 `np.linalg.norm(vec1 - vec2)` 直接算 L2。

---

## 1. Image (Docker) vs git clone — 該下載哪個？

### 兩者差異

| | **git clone** | **Docker image** |
|---|---|---|
| 拿到的是 | 原始碼（C 語言 source） | 已 build 好的完整環境（含 Postgres + pgvector） |
| 比喻 | IKEA 零件包 + 說明書 | 已組好的傢俱 |
| 大小 | 數 MB | 數百 MB |
| 能直接執行嗎 | ❌ 要 build | ✅ `docker run` 立刻跑 |
| Windows 上難度 | ⚠️ 需 Visual Studio + Postgres dev headers | ✅ 裝好 Docker Desktop 就能用 |

### 兩個指令並排對照（具體層面）

#### 🅰 `git clone` 你執行了什麼？

```powershell
git clone https://github.com/pgvector/pgvector.git
```

**幕後發生的事**：

```
1. Git 連到 GitHub
   ▼
2. 下載 pgvector 的整個 git repo（含歷史紀錄）
   ▼
3. 解壓到 ./pgvector/ 目錄
```

**結束後本機長這樣**：

```
你的硬碟：
  C:\coding\pgvector\
    ├── src/          ← C 語言原始碼
    ├── test/         ← 測試檔
    ├── README.md     ← 文件
    ├── Makefile      ← 編譯規則
    └── ...

你的記憶體：
  （沒新增任何執行中的程序）
```

**結束後能做什麼？**
- ✅ 用編輯器打開 `.c` 檔讀原始碼
- ✅ 看 README 學概念
- ❌ 沒有 Postgres 在跑
- ❌ pgvector 沒裝在任何 Postgres 上
- ❌ **不能 `CREATE EXTENSION vector;`**

→ git clone **只是「拿到檔案」**，**什麼都還沒「跑起來」**。

#### 🅱 `docker run` 你執行了什麼？

```powershell
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5432:5432 `
  pgvector/pgvector:pg17
```

**幕後發生的事**：

```
1. Docker 連到 Docker Hub
   ▼
2. 下載「pgvector + Postgres + Linux」的完整 image（約 400MB）
   ▼
3. 從 image 啟動一個容器
   ▼
4. 容器內 Linux 啟動 → Postgres 17 自動啟動
   ▼
5. pgvector 已經編譯好放在 extension 目錄（image 內建）
   ▼
6. 容器開放 5432 port，等你連線
```

**結束後本機長這樣**：

```
你的硬碟：
  Docker 的 image 快取（系統管理，看不見的地方）

你的記憶體：
  pgvector-test 容器（執行中）
    └── 內含跑著的 Postgres 17
        └── pgvector 擴充已待命

監聽中的 port:
  localhost:5432  ← 你可以從本機連進去
```

**結束後能做什麼？**
- ✅ `docker exec` 進去操作
- ✅ DBeaver / psql 從 localhost:5432 連線
- ✅ **`CREATE EXTENSION vector;` 立刻能跑**
- ✅ 開始建表、存向量、查詢

→ docker run **是「下載 + 安裝 + 啟動 + 設定」一次完成**。

### 執行後狀態對照

| | git clone 後 | docker run 後 |
|---|---|---|
| **本機檔案系統** | 多了 `./pgvector/` 資料夾（純文字 / 原始碼）| Docker 快取多一個 image |
| **執行中程序** | 沒新增任何程序 | 多一個跑著的容器 |
| **Postgres 在跑嗎** | ❌ | ✅ |
| **pgvector 已裝？** | ❌ 只有原始碼 | ✅ 編譯好且裝在 Postgres 中 |
| **能 `CREATE EXTENSION` 嗎** | ❌ | ✅ |
| **能用 DBeaver 連線嗎** | ❌（沒 DB 在跑）| ✅ localhost:5432 |
| **下一步** | 編譯 + 裝（複雜，見下方）| 直接連線開幹 |

### 兩條路線完整步驟對照

#### 🅰 git clone 路線（不推薦，但完整列出）

```powershell
# 1. clone（你已經做了）
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# 2. 安裝 PostgreSQL（如果還沒裝）
# Windows: https://www.postgresql.org/download/windows/

# 3. 安裝 build 工具
# Windows: 裝 Visual Studio（不是 VS Code！）+ C++ workload + Windows SDK
#
# ⚠️ Visual Studio ≠ VS Code：
#   - Visual Studio 是完整 IDE（含 C++ compiler），數 GB ~ 30+ GB
#   - VS Code 是輕量編輯器（沒 compiler），~300 MB
#   - 編譯 pgvector 需要 C++ compiler → 必須裝 Visual Studio
#
# 任何現代版本都行（VS 2019 / 2022 / 2025 / 2026），安裝時必勾：
#   ✅ 「使用 C++ 的桌面開發」(Desktop development with C++) workload
#   ✅ Windows SDK（通常自動包含）

# 4. 設定環境變數，讓 build 系統能找到 Postgres dev headers
$env:PGROOT = "C:\Program Files\PostgreSQL\17"
$env:PATH += ";$env:PGROOT\bin"

# 5. 開啟 Visual Studio 的「x64 Native Tools Command Prompt」
#    然後 cd 回 pgvector 目錄

# 6. 用 nmake build（Windows 專用）
nmake /F Makefile.win

# 7. 安裝到 Postgres extension 目錄
nmake /F Makefile.win install

# 8. 啟動本機 Postgres 服務（如果沒自動啟動）
net start postgresql-x64-17

# 9. 連到 Postgres
psql -U postgres

# 10. 啟用擴充
CREATE EXTENSION vector;
```

→ **10 步驟，每一步都可能出錯**。Linux / Mac 上比較簡單，Windows 上是折磨。

#### 🅱 docker run 路線（推薦）

```powershell
# 1. 確認 Docker Desktop 開了
docker --version

# 2. 起容器（自動下載 image + 跑起來）
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5432:5432 `
  pgvector/pgvector:pg17

# 3. 進去
docker exec -it pgvector-test psql -U postgres -d test_rag

# 4. 啟用擴充
CREATE EXTENSION vector;
```

→ **4 步驟，10 分鐘搞定**。

### 🚨 最關鍵誤解：`git clone` ≠ 「裝好」

很多人 `git clone https://github.com/pgvector/pgvector.git` 之後以為「**我裝好 pgvector 了**」——**這是錯的**。

#### IKEA 比喻

```
你做的：git clone
       ▼
你家裡多了一個 IKEA 零件包
（一堆木板 + 螺絲 + 說明書）

  C:\coding\pgvector\
    ├── src/         ← 木板（C 原始碼）
    ├── Makefile     ← 說明書
    └── README.md    ← 更多說明書


【但你家還沒有桌子！】
零件還是零件、根本還沒組裝、更沒搬進房間。
```

→ 「**檔案還在 `coding/pgvector`**」≠「**裝在 Postgres 上**」。

#### 真正的「裝在 Postgres 上」是什麼？

「裝」這個動作有 4 個步驟，**只有全部做完才算裝好**：

```
Step 1: 編譯原始碼
  C:\coding\pgvector\ 的 .c 檔  ──compile──►  vector.dll（編譯產物）

Step 2: 把 vector.dll 複製到 Postgres 的 lib 目錄
  → C:\Program Files\PostgreSQL\17\lib\vector.dll

Step 3: 把 vector.control 複製到 Postgres 的 extension 目錄
  → C:\Program Files\PostgreSQL\17\share\extension\vector.control

Step 4: 把 vector--*.sql 複製到 Postgres 的 extension 目錄
  → C:\Program Files\PostgreSQL\17\share\extension\vector--0.7.0.sql
```

**只有 Postgres 安裝目錄裡有這幾個檔案**，Postgres 才認得 `CREATE EXTENSION vector;`。

→ 你 `coding/pgvector` **只完成 Step 0（拿到原料）**，Step 1-4 都沒做。

#### 怎麼驗證「沒裝好」？

```sql
-- 連到本地 Postgres 跑這個
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

| 結果 | 代表 |
|------|------|
| 有結果 | ✅ pgvector 確實裝在這個 Postgres 上 |
| 沒結果 | ❌ 沒裝好，光 git clone 不算 |

→ 如果**沒結果**，就是 Step 1-4 沒做完。

#### 各種類似誤解的對照

| 你以為的「裝了」 | 實際狀態 |
|----------------|---------|
| `git clone XXX` | ❌ 只下載原始碼，沒裝 |
| 把 `.zip` 解壓縮 | ❌ 只把檔案攤開，沒裝 |
| 把 `.exe` 放到桌面 | ❌ 沒執行就沒裝 |
| `pip install xxx` | ✅ 真的裝（pip 自動編譯+放到正確位置）|
| `npm install` | ✅ 真的裝（npm 自動處理）|
| `docker run pgvector/pgvector` | ✅ 真的裝（image 內早就裝好了）|
| `CREATE EXTENSION vector;` 成功 | ✅ 真的裝 |

→ **`git clone` 跟 `pip install` / `npm install` 不是同一回事**。git clone **單純只下載**，不會自動編譯也不會自動安裝。

#### 冰箱比喻

```
冰箱（= 你的本地 Postgres 的 extension 目錄）
  ├── postgis            ← 已裝好的擴充
  ├── plpgsql           ← 已裝好的擴充
  └── ?                  ← 沒有 vector

你的桌上（= C:\coding\pgvector）
  └── 一袋從超市買來的食材    ← git clone 來的原始碼
```

「**冰箱裡沒有那道菜**」≠「**桌上沒有食材**」。
食材在桌上沒錯，但**還沒做菜**、**還沒放進冰箱**。

→ 你要嘛**把食材做成菜並放進冰箱**（路線 A：編譯 + 裝進本地 Postgres）
→ 要嘛**直接訂一個別的冰箱已經裝滿菜的**（路線 B：Docker pgvector image）

#### 結論：你 clone 的 `coding/pgvector` 怎麼處理？

| 想法 | 動作 |
|------|------|
| 想刪掉省空間 | 可以刪，但留著也不到 100 MB |
| 想留著 | ✅ 推薦——可以**讀原始碼學原理**，配合本筆記 0.5 節向量索引概念 |
| 想用它讓本地 Postgres 有 pgvector | 需要走完整路線 A（裝 VS + 編譯）|
| 想要能用的 pgvector | 走路線 B：`docker run` |

---

### 🌳 決策樹：本地已有 Postgres 怎麼辦？

```
要用 pgvector 做 RAG
  │
  ├── 你的「本地資料庫」有裝 pgvector 擴充嗎？
  │     （SELECT * FROM pg_available_extensions WHERE name='vector';）
  │     │
  │     ├── ✅ 有 → 直接用，CREATE EXTENSION vector; 完事
  │     │       不需要 Docker
  │     │
  │     └── ❌ 沒有 ← 多數人的情況
  │           │
  │           ├── 路線 A：在本地 Postgres 裝 pgvector
  │           │   （Windows 上：要 VS + dev headers + nmake 編譯）
  │           │   ⚠️ 折磨自己，不推薦
  │           │
  │           └── 路線 B：另起 Docker pgvector 容器  ★推薦
  │                 │
  │                 └── 怕資料消失嗎？
  │                       │
  │                       ├── 沒加 `-v volume`
  │                       │   docker rm 砍掉容器 → ❌ 資料消失
  │                       │
  │                       └── 加 `-v pgvector_data:/var/lib/postgresql/data`
  │                           docker rm 砍掉容器 → ✅ 資料保留在 Docker volume
  │                           下次 docker run 用同 volume 名 → 自動接續
```

### 「我有本地 DB，跑 Docker pgvector 還有差嗎？」

**有差，因為「有 Postgres」≠「有 pgvector」**：

```
你的本地 Postgres                Docker pgvector 容器
        │                              │
   不同的 Postgres 實例           不同的 Postgres 實例
        │                              │
   ❌ 沒裝 pgvector              ✅ 內建 pgvector
        │                              │
        └─── 完全獨立、互不幹擾 ───┘
```

→ 兩個 Postgres **並行存在**，跑 Docker 不會影響本地的，本地的也不會幫 Docker 提供 pgvector。

#### ⚠️ port 衝突注意

兩個都用預設 5432 會衝突。**解法**：Docker 改用 5433：

```powershell
-p 5433:5432
   ▲
   本機改成 5433（避開本地 Postgres 的 5432）
```

連線時用 `localhost:5433`。

### 💾 資料會不會消失？三種狀態

#### 狀態 1：沒加 `-v`（預設）

```
容器啟動 → 寫資料 → 資料存在容器內部 layer
docker stop pgvector-test    ← 停止：資料還在 ✅
docker start pgvector-test   ← 重啟：資料還在 ✅
docker rm pgvector-test      ← 刪除：資料消失 ❌
```

→ 只要**不刪容器**資料還在。容器砍掉就玩完。

#### 狀態 2：用 named volume（推薦）

```powershell
docker run ... -v pgvector_data:/var/lib/postgresql/data ...
```

```
容器啟動 → 寫資料 → 資料存到 Docker 管理的 volume `pgvector_data`
                  （volume 是獨立物件，存在容器外）
docker rm pgvector-test       ← 刪容器：資料還在 volume ✅
docker run ... -v pgvector_data:/var/lib/postgresql/data ...
                              ← 重新起容器、用同名 volume → 資料接續 ✅
```

→ **學 RAG 期間建議用這個**，玩壞了 `docker rm` 重來資料還在。

#### 狀態 3：bind mount（綁本機資料夾）

```powershell
docker run ... -v C:\pgvector-data:/var/lib/postgresql/data ...
```

資料寫到本機的 `C:\pgvector-data` 資料夾，容器砍掉資料還在你的 C 槽。
適合「想完全控制資料在哪」的人。

#### 三者比較

| 狀態 | 容器 stop/start | 容器 rm | 看得到資料檔嗎 |
|------|---------------|--------|--------------|
| 沒 `-v` | ✅ 保留 | ❌ 消失 | ❌ |
| `-v 名稱:容器路徑` (named volume) | ✅ 保留 | ✅ 保留 | ⚠️ Docker 管理區 |
| `-v 本機路徑:容器路徑` (bind mount) | ✅ 保留 | ✅ 保留 | ✅ 在你硬碟上 |

### 推薦的完整指令（含資料持久化 + 避開 port 衝突）

```powershell
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5433:5432 `
  -v pgvector_data:/var/lib/postgresql/data `
  pgvector/pgvector:pg17
```

**比基本版多了兩個東西**：

| 改動 | 解決什麼 |
|------|---------|
| `-p 5433:5432`（不是 5432:5432）| 避開本地 Postgres 的 5432 |
| `-v pgvector_data:/var/lib/postgresql/data` | 資料持久化 |

連線時：

```
Host: localhost
Port: 5433              ← 注意改成 5433
User: postgres
Password: mysecret
Database: test_rag
```

### ⚠️ 你現在的狀態

如果你已經 `git clone https://github.com/pgvector/pgvector.git` 到 `C:\coding\pgvector`：

| 你做了 | 達成了什麼 | 還差什麼 |
|--------|----------|---------|
| ✅ git clone | 拿到原始碼，可以**讀**它 | **不能執行**——什麼都還沒跑 |
| ❌ docker run | -| 還沒做，所以還沒有 Postgres / pgvector 可用 |

**clone 到的 `C:\coding\pgvector\`** 不會消失也不會干擾，**留著當參考用就好**——要實際用 pgvector，**還是要 docker run**。

### 一句話收斂

> **git clone 拿到「原料」（C 原始碼，要自己組裝）**
> **docker run 拿到「成品」（已組好的 Postgres + pgvector，立刻能用）**
>
> 兩個指令做的事**根本不同**——不是二選一的對等選項，而是「不同目的的不同工具」。
> 想用 pgvector 做 RAG → **docker run**；想讀 C 原始碼學內部實作 → **git clone**。

---

### 何時用哪個

- ✅ **想用 pgvector 做 RAG** → Docker image
- ✅ **想研究 pgvector 內部實作（讀 C 語言原始碼）** → git clone
- ❌ ~~想在 Windows 從原始碼裝起來~~ → 折磨自己

### 結論

**這份筆記用 Docker image**。需要看 source 時再 `git clone https://github.com/pgvector/pgvector.git`。

---

## 2. 為什麼學 RAG 階段要用 Docker？

| 好處 | 說明 |
|------|------|
| **環境隔離** | 玩壞了不影響 production / 其他專案的 Postgres |
| **乾淨可拋棄** | `docker rm -f` 一鍵刪光，不留垃圾 |
| **跨平台一致** | Windows / Mac / Linux 跑出來一樣 |
| **不用裝 Postgres** | 本機完全不需要安裝任何資料庫軟體 |
| **不用 build pgvector** | 跳過編譯地獄 |
| **無限重來** | 學壞了就 `docker rm` + `docker run` |
| **多版本並存** | 想同時試 pg16 / pg17 沒衝突 |

→ **學習階段**：Docker 最安全
→ **生產階段**：才考慮跟 production 環境一致

---

## 3. 實際步驟（Windows + Docker Desktop）

### 前置：確認 Docker Desktop 已啟動

```powershell
docker --version
# 應該顯示 Docker version XX.XX.XX
```

如果沒裝：先去 <https://docs.docker.com/desktop/install/windows-install/> 下載安裝。

---

### Step 1：起一個 pgvector + Postgres 容器

```powershell
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5432:5432 `
  pgvector/pgvector:pg17
```

#### 整體結構速覽

```
docker run                    ← 1. 指令本體
-d                            ← 2. 執行模式
--name pgvector-test          ← 3. 容器名字
-e VAR=value                  ← 4. 環境變數（兩個）
-p 5432:5432                  ← 5. port 映射
pgvector/pgvector:pg17        ← 6. image 名字（沒 dash 前綴的就是它）
```

末尾的反引號 `` ` `` 是 **PowerShell 的換行字元**（等同 bash 的 `\`、CMD 的 `^`）。後面**不能有空格**，否則被當字面字元。

#### 參數逐一拆解

##### 1. `docker run` —— 指令本體

| | docker run | docker exec |
|---|------------|-------------|
| 動作 | **建一個新容器並啟動** | 在**已存在且執行中**的容器內**跑指令** |
| 第一次 | ✅ 用這個 | ❌ 容器還沒建 |
| 之後互動 | ❌ 會建第二個容器 | ✅ 用這個進去 |

→ **第一次** 用 `docker run`（建容器）；**之後想進去**用 `docker exec`。

##### 2. `-d` —— **d**etached（背景執行）

| 沒寫 `-d` | 加了 `-d` |
|---------|----------|
| PowerShell 卡在這、一直印 log，Ctrl+C 會把容器停掉 | 立刻回到 prompt，容器在背景跑，要看 log 用 `docker logs` |

→ **學習 / 使用**幾乎都加 `-d`，**只有想看即時 log debug** 才不加。

##### 3. `--name pgvector-test` —— 容器名字

| 沒寫 `--name` | 加了 `--name` |
|---------|----------|
| Docker 給隨機名（如 `quirky_einstein`），操作要用容器 ID（一串亂碼） | 之後操作可以用名字：`docker stop pgvector-test` |

⚠️ 名字必須**獨一無二**，已存在同名容器會報錯。

##### 4. `-e VAR=value` —— **e**nv（環境變數）

`-e` 出現兩次，傳兩個環境變數進容器：

###### `-e POSTGRES_PASSWORD=mysecret`

- **POSTGRES_PASSWORD** 是 Postgres 官方 image 規定的環境變數
- **必填**！沒寫會啟動失敗：
  ```
  Error: Database is uninitialized and superuser password is not specified.
         You must specify POSTGRES_PASSWORD ...
  ```
- `mysecret` = 你定的密碼（之後連線要用這個）

⚠️ 學習用 `mysecret` 沒問題，**正式環境不要**——要用更強的密碼。

###### `-e POSTGRES_DB=test_rag`

- 容器啟動時**自動建立**一個叫 `test_rag` 的資料庫
- **可選**——沒寫的話只有預設的 `postgres` 資料庫

| 沒寫 `POSTGRES_DB` | 寫了 `POSTGRES_DB=test_rag` |
|---|---|
| 進去後只有 `postgres`、`template0`、`template1` | 多一個 `test_rag` 自動建好 |
| 想要 `test_rag` 要自己 `CREATE DATABASE test_rag;` | 省一步 |

###### Postgres image 還支援的其他環境變數

| 變數 | 作用 |
|------|------|
| `POSTGRES_PASSWORD` | 密碼（必填）|
| `POSTGRES_DB` | 啟動時建的 DB 名 |
| `POSTGRES_USER` | superuser 名字（預設 `postgres`） |
| `POSTGRES_INITDB_ARGS` | 傳給 initdb 的額外參數 |

##### 5. `-p 5432:5432` —— **p**ort 映射（最容易搞錯）

| 格式 | `<host_port>:<container_port>` |
|------|-------------------------------|

```
你的 Windows                     Docker 容器
  │                                  │
  │   localhost:5432  ─────────►   :5432
  │      ▲ 本機 port               ▲ 容器內 Postgres 在聽的 port
  │      │                          │
  │      └───── 透過 -p 映射 ───────┘
  │
  DBeaver / Python 連到 localhost:5432
  → Docker 自動轉發到容器的 5432 → Postgres 收到
```

| 沒寫 `-p` | 加了 `-p 5432:5432` |
|---------|----------------------|
| 容器內 Postgres 跑得好好的，**但你從外面連不到** | 從本機 5432 能連到容器內 Postgres |

###### 為什麼是 `5432:5432`？

- 5432 是 **Postgres 的預設 port**（業界慣例）
- 容器內也是 5432（pgvector image 內建這樣）
- 兩邊一樣，所以寫 `5432:5432`

###### 如果本機 5432 被佔用了？

例如你已有別的 Postgres 佔了 5432：

```
Error: bind: address already in use
```

**解法**：左邊改成別的 port：

```powershell
-p 5433:5432
   ▲    ▲
   │    └── 容器內還是 5432（不能改，Postgres 只聽這個）
   │
   └── 本機改成 5433（你連線時用 5433）
```

連線時就用 `localhost:5433`。

##### 6. `pgvector/pgvector:pg17` —— image 名字

```
pgvector / pgvector : pg17
   ▲         ▲        ▲
   │         │        └── 標籤 tag（哪個版本）
   │         └── image 名字
   └── repo / 組織名字
```

**從 Docker Hub 拉**：<https://hub.docker.com/r/pgvector/pgvector>

**tag 選擇**：

```
pgvector/pgvector:pg17     ← Postgres 17（最新主版本）
pgvector/pgvector:pg16     ← Postgres 16
pgvector/pgvector:pg15     ← Postgres 15
pgvector/pgvector:latest   ← 最新（可能不穩定，不建議）
```

→ 一般用具體版本（`pg17`），**不要**用 `latest`（明天可能變另一個版本）。

**第一次跑**會自動從 Docker Hub 下載 image（約 400MB），第二次以後從本機快取啟動。

---

### Step 2：確認容器跑起來

```powershell
docker ps
# 應該看到 pgvector-test 在執行中

docker logs pgvector-test
# 看到 "database system is ready to accept connections" 表示 OK
```

#### 參數解釋

##### `docker ps` —— **p**rocess list（執行中的容器）

| 寫法 | 意思 |
|------|------|
| `docker ps` | 只看執行中的容器 |
| `docker ps -a` | 看**所有**容器（含已停止的） |
| `docker ps -q` | 只列 container ID（可以 pipe 給其他指令） |

##### `docker logs <name>` —— 看容器 log

| 寫法 | 意思 |
|------|------|
| `docker logs pgvector-test` | 印目前所有 log |
| `docker logs -f pgvector-test` | **f**ollow（即時跟蹤新 log，類似 `tail -f`） |
| `docker logs --tail 50 pgvector-test` | 只看最後 50 行 |
| `docker logs --since 10m pgvector-test` | 看最近 10 分鐘 |

---

### Step 3：連進去 Postgres

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

進入 psql 後會看到 prompt：

```
test_rag=#
```

#### 參數逐一拆解

##### 整體結構

```
docker exec   -it   pgvector-test   psql   -U postgres   -d test_rag
   ▲          ▲       ▲             ▲       ▲              ▲
   1          2       3             4       5              6
```

##### 1. `docker exec` —— 在「已執行」的容器內執行指令

跟 `docker run` 的差異前面講過：`run` 是「建新容器」，`exec` 是「在已建好且執行中的容器內跑指令」。

##### 2. `-it` —— interactive + tty

合在一起的兩個 flag：

| 旗標 | 縮寫展開 | 作用 |
|------|---------|------|
| `-i` | **i**nteractive | 保持 stdin 打開（讓你能輸入指令）|
| `-t` | **t**ty | 配一個終端機（讓畫面能正常顯示）|

⚠️ **這個 `-i` 不是 grep 的 ignore case，也不是 sed 的 in-place**——是 docker 的 interactive。同字母在不同指令意義不同（詳見 [`../CLI/cli-flag-meaning-conflicts.md`](../CLI/cli-flag-meaning-conflicts.md)）。

###### 沒 `-it` 會怎樣？

```bash
docker exec pgvector-test psql -U postgres
# 進去後 psql 啟動，但你打字看不到 prompt，按 Enter 沒反應
# 因為沒給 terminal，psql 不知道怎麼跟你互動
```

加 `-it` 後正常進入 psql prompt。

##### 3. `pgvector-test` —— 哪個容器

就是你 `docker run --name` 取的名字。

##### 4. `psql` —— 容器內要執行的指令

`psql` = **P**ost**g**re**S**Q**L** 的官方命令列客戶端。pgvector image 內已內建。

##### 5. `-U postgres` —— psql 的 **U**ser flag（不是 docker 的）

`postgres` 是預設 superuser，由 image 自動建立。

##### 6. `-d test_rag` —— psql 的 **d**atabase flag

直接連進 `test_rag` 這個 DB。沒寫的話會連到跟使用者同名的 DB（`postgres`），之後要 `\c test_rag` 切過去。

##### psql 其他常用 flag

```bash
psql -U postgres                    # 用 postgres 使用者
psql -U postgres -d test_rag        # 連到 test_rag 這個 DB
psql -U postgres -h localhost       # 指定 host
psql -U postgres -p 5432            # 指定 port
psql -U postgres -W                 # 強制要求輸密碼
psql -U postgres -c "SELECT 1"      # 直接執行 SQL 不進 prompt
```

---

### Step 4：啟用 pgvector 擴充

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### `IF NOT EXISTS` 的作用

| 寫法 | 第二次執行 |
|------|----------|
| `CREATE EXTENSION vector;` | ❌ 報錯 `already exists` |
| `CREATE EXTENSION IF NOT EXISTS vector;` | ✅ 沒事，已存在就跳過 |

→ **建議都加 `IF NOT EXISTS`**，重複執行不會壞事。

#### 驗證

```sql
\dx
-- 應該看到 vector 擴充已安裝
```

`\dx` = **d**escribe e**x**tensions（psql 的 meta-command，列出所有擴充）。

##### psql 其他常用 meta-command

| 指令 | 縮寫展開 | 作用 |
|------|---------|------|
| `\l` | **l**ist databases | 列出所有資料庫 |
| `\c <db>` | **c**onnect | 切換到某個 DB |
| `\dt` | **d**escribe **t**ables | 列出當前 DB 的所有 table |
| `\d <table>` | **d**escribe | 看某個 table 的結構 |
| `\dx` | **d**escribe e**x**tensions | 列出所有擴充 |
| `\du` | **d**escribe **u**sers | 列出所有使用者 |
| `\q` | **q**uit | 離開 psql |
| `\?` | help | 看所有 meta-command |
| `\h <SQL>` | **h**elp on SQL | 看某個 SQL 語法說明 |

##### ⚠️ 第一次嘗試 `CREATE EXTENSION vector;` 報錯怎麼辦？

| 錯誤訊息 | 原因 | 解法 |
|----------|------|------|
| `ERROR: extension "vector" is not available` | 連到的 Postgres **沒裝 pgvector** | 換成 pgvector image / 雲端 Postgres |
| `ERROR: permission denied to create extension` | 沒有 superuser 權限 | 用 `postgres` 使用者連 |
| `ERROR: extension "vector" already exists` | 已建過 | 加 `IF NOT EXISTS` 或忽略 |

---

## 4. 第一個 RAG 實驗：向量相似度查詢

### 4.1 建立向量表

```sql
CREATE TABLE items (
  id bigserial PRIMARY KEY,
  description text,
  embedding vector(3)         -- 用 3 維方便理解（實際用 1536 維）
);
```

### 4.2 插入測試向量

```sql
INSERT INTO items (description, embedding) VALUES
  ('蘋果',   '[1, 0, 0]'),    -- 偏向「水果」
  ('香蕉',   '[0.9, 0, 0.1]'),-- 偏向「水果」
  ('狗',     '[0, 1, 0]'),    -- 偏向「動物」
  ('貓',     '[0, 0.9, 0.1]'),-- 偏向「動物」
  ('桌子',   '[0, 0, 1]');    -- 偏向「傢俱」
```

### 4.3 找最相近的：「跟蘋果最像的東西」

```sql
SELECT description, embedding <-> '[1, 0, 0]' AS distance
FROM items
ORDER BY distance
LIMIT 3;
```

預期結果：

```
 description | distance
-------------+----------
 蘋果        | 0
 香蕉        | 0.14...     ← 同樣偏「水果」軸，最相近
 桌子        | 1.41...
```

→ 這就是 **RAG 的「R (Retrieve)」核心動作**：給一個 query 向量，找最近的 N 個。

### 4.4 距離運算子三選一

| 運算子 | 距離類型 | 何時用 |
|--------|---------|--------|
| `<->` | **L2 (Euclidean) 距離** | 最常用、最直覺 |
| `<=>` | **Cosine 距離** | 文字 embedding 主流選擇 |
| `<#>` | **負內積 (Inner Product)** | 已正規化向量 |

```sql
-- Cosine 距離（OpenAI embedding 推薦）
SELECT description, embedding <=> '[1, 0, 0]' AS cos_dist
FROM items
ORDER BY cos_dist
LIMIT 3;
```

### 4.5 建 HNSW 索引加速（資料變多後必做）

```sql
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
-- vector_l2_ops 對應 <-> (L2)
-- vector_cosine_ops 對應 <=> (Cosine)
-- vector_ip_ops 對應 <#> (Inner Product)
```

→ 對應 [rag-vs-memory-comparison.md 0.5 節 HNSW 子節](../LLM-Memory/rag-vs-memory-comparison.md)

---

## 5. 連線方式整理

### 5.1 用 psql（命令列）

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

### 5.2 用 GUI 工具（推薦學習用）

| 工具 | 連線資訊 |
|------|---------|
| **DBeaver**（免費）| Host: `localhost`, Port: `5432`, User: `postgres`, Pwd: `mysecret`, DB: `test_rag` |
| **TablePlus** | 同上 |
| **pgAdmin** | 同上 |

### 5.3 用 Python（之後做 RAG 用）

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    user="postgres",
    password="mysecret",
    dbname="test_rag"
)
cur = conn.cursor()

# 用 OpenAI embedding 1536 維
cur.execute("""
    CREATE TABLE IF NOT EXISTS docs (
      id bigserial PRIMARY KEY,
      content text,
      embedding vector(1536)
    );
""")
conn.commit()
```

---

## 6. 進階：跟 OpenAI Embedding 整合

```python
from openai import OpenAI
import psycopg2

client = OpenAI(api_key="sk-...")

def embed(text: str) -> list[float]:
    """把文字轉成 1536 維向量"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding   # list[float], len=1536

# 存進 pgvector
conn = psycopg2.connect(...)
cur = conn.cursor()

texts = ["蘋果是水果", "狗是寵物", "桌子是傢俱"]
for text in texts:
    vec = embed(text)
    cur.execute(
        "INSERT INTO docs (content, embedding) VALUES (%s, %s)",
        (text, str(vec))
    )
conn.commit()

# 查詢：找跟「香蕉」最相近的
query_vec = embed("香蕉好吃")
cur.execute("""
    SELECT content, embedding <=> %s::vector AS distance
    FROM docs
    ORDER BY distance
    LIMIT 3
""", (str(query_vec),))

for row in cur.fetchall():
    print(row)
# 預期：「蘋果是水果」最近、「狗是寵物」次之、「桌子是傢俱」最遠
```

---

## 7. 容器管理常用指令

```powershell
# 查看執行中的容器
docker ps

# 查看所有容器（含已停止）
docker ps -a

# 看容器 log
docker logs pgvector-test

# 即時監看 log
docker logs -f pgvector-test

# 停止容器
docker stop pgvector-test

# 重新啟動
docker start pgvector-test

# 進入容器內部 shell
docker exec -it pgvector-test bash

# 砍掉容器（⚠️ 資料會消失）
docker rm -f pgvector-test

# 看容器資源使用
docker stats pgvector-test
```

---

## 8. 資料持久化（避免 docker rm 後資料消失）

預設情況下，刪掉容器資料就消失了。要保留資料的做法：

```powershell
docker run -d --name pgvector-test `
  -e POSTGRES_PASSWORD=mysecret `
  -e POSTGRES_DB=test_rag `
  -p 5432:5432 `
  -v pgvector_data:/var/lib/postgresql/data `   # ← 多這一行
  pgvector/pgvector:pg17
```

`-v pgvector_data:/var/lib/postgresql/data` 把資料庫檔案存到 Docker 管理的 named volume `pgvector_data`，**容器刪了資料還在**。

下次再起容器時用同樣的 volume name → 自動接續資料。

---

## 9. 我的 test-RAG 是現有 Postgres 還是 Docker？

兩條路都可以。**判斷流程**：

```
你的 test-RAG 在哪？
  │
  ├── 在 Zeabur / Supabase / Railway 等雲端
  │   └── 進去 SQL 執行：
  │       SELECT * FROM pg_available_extensions WHERE name = 'vector';
  │       │
  │       ├── 有結果 → CREATE EXTENSION vector;  ← 直接用！
  │       └── 沒結果 → 雲端不支援，用 Docker
  │
  ├── 在本機 Postgres
  │   └── 通常沒裝 pgvector → 用 Docker 簡單
  │
  └── 還沒開
      └── 直接用 Docker（這份筆記的方式）
```

---

## 10. 常見錯誤排雷

| 錯誤訊息 | 原因 | 解法 |
|----------|------|------|
| `extension "vector" is not available` | Postgres 沒裝 pgvector | 換到 pgvector image 或裝 extension |
| `port is already allocated` | 5432 已被佔用 | 改用 `-p 5433:5432` 或停掉佔用的服務 |
| `password authentication failed` | 密碼錯 | 確認 `-e POSTGRES_PASSWORD` 跟連線時一致 |
| `connection refused` | 容器沒起來 / 還沒 ready | `docker logs` 看狀態，或等 5 秒重試 |
| `dimension mismatch` | 插入向量維度跟欄位定義不符 | `vector(3)` 就只能插 3 維 |

---

## 11. 常見誤解 FAQ（學習過程累積的所有問題）

### Q1：image 的 docker 跟 git clone 差在哪？

| | git clone | Docker image |
|---|---|---|
| 拿到的是 | 原始碼（C 語言） | 已 build 好的成品 |
| 比喻 | IKEA 零件包 | 已組好的傢俱 |
| 大小 | 數 MB | 數百 MB |
| 能直接執行嗎 | ❌ 要 build | ✅ `docker run` 立刻跑 |

→ 詳見 Section 1 的「兩個指令並排對照」。

### Q2：我已經 git clone 到 `coding/pgvector` 了，可以直接執行 `CREATE EXTENSION vector;` 嗎？

❌ **不行**。git clone 只是下載原始碼到資料夾，**pgvector 還沒裝在任何 Postgres 上**。

要嘛走路線 A（編譯安裝）、要嘛走路線 B（Docker，推薦）。

→ 詳見 Section 1 的「🚨 最關鍵誤解：git clone ≠ 「裝好」」。

### Q3：`docker exec -it pgvector-test psql -U postgres` 是執行啥？

「在已執行中的 `pgvector-test` 容器內，用 postgres 使用者開啟 psql 客戶端」。

| 旗標 | 意思 |
|------|------|
| `docker exec` | 在已執行的容器內跑指令（vs `docker run` 是建新容器）|
| `-i` | **i**nteractive（保持 stdin 打開）|
| `-t` | **t**ty（配終端機）|
| `psql` | Postgres 客戶端 |
| `-U postgres` | psql 的 **U**ser flag |

→ 詳見 Step 3 的「參數逐一拆解」。

### Q4：`POSTGRES_DB` 是 shell 指令嗎？

❌ **不是**。`POSTGRES_DB` 是**環境變數的名字**，不是指令。

| | 環境變數 | Shell 指令 |
|---|---------|-----------|
| 是什麼 | 儲存值的「容器」 | 能執行的「動詞」 |
| 例子 | `PATH`、`POSTGRES_DB` | `ls`、`docker` |

→ 詳見 [`../CLI/environment-variables-basics.md`](../CLI/environment-variables-basics.md)。

### Q5：我有本地 Postgres，跑 Docker pgvector 還有差嗎？資料會消失嗎？

**有差**——「有 Postgres」≠「有 pgvector」。兩個 Postgres 並行存在、互不幹擾。

**資料持久化**：

| 做法 | 容器 stop | 容器 rm |
|------|----------|---------|
| 沒 `-v` | ✅ 保留 | ❌ 消失 |
| 有 `-v pgvector_data:/var/lib/postgresql/data` | ✅ 保留 | ✅ **保留** |

→ 詳見 Section 1 的「🌳 決策樹」 + 「💾 資料會不會消失？」 + Section 8。

### Q5.5：DB 名是 `test_rag`、`test-RAG` 還是 `test_RAG`？

✅ **`test_rag`**（小寫 + 底線）。因為 docker run 時是 `-e POSTGRES_DB=test_rag`。

⚠️ **PostgreSQL 識別字慣例**：
- 用底線 `_` 而非 dash `-`（`test-rag` 在 SQL 裡需要加雙引號才能用）
- 預設轉小寫（`TEST_RAG` 寫進去也會變 `test_rag`）

→ 想確認當前所有 DB：`docker exec pgvector-test psql -U postgres -c "\l"`

### Q5.6：為什麼 Docker 容器密碼是 `mysecret`，不是我本地 Postgres 的密碼？

✅ **因為這是兩個完全獨立的 Postgres 實例**：

```
你的本地 Postgres                Docker pgvector 容器
─────────────────                ──────────────────────
裝在 Windows                     裝在 Docker（虛擬化）
密碼：abc123（你之前裝時設的）   密碼：mysecret（docker run 時 -e 設的）
       ▲                                ▲
       │                                │
       └──── 兩者完全獨立 ────────────────┘
```

**每次 `docker run -e POSTGRES_PASSWORD=XXX` 都能重新指定**——這是給「**這個容器**」的，跟你本地的無關。

### Q5.7：為什麼 `docker exec` 進去**不問密碼**？

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
       ↑ 進去後直接 test_rag=# 沒問密碼
```

**因為「從容器內部連 Postgres」走的是 trust 驗證**——容器內 Postgres 的 `pg_hba.conf` 對「本機 socket / localhost」連線**自動信任**。

而**從容器外連**（例如 DBeaver / psql 用 `localhost:5433`）→ **才會問密碼**，那時候用 `mysecret`。

```
從容器內連                    從容器外連
─────────                    ─────────
docker exec ... psql         psql -h localhost -p 5433
       │                              │
   走 Unix socket               走 TCP/IP
       │                              │
  Postgres 自動信任            要密碼 = mysecret
       │                              │
       ▼                              ▼
   ✅ 直接進去               ✅ 輸入 mysecret 才進去
```

### Q5.8.5：⚠️ 進去後 `\dt` 跟 `\dx` 看不到 vector 跟 items？（最容易踩的坑）

**99% 是你連到「錯的 database」**——通常是預設的 `postgres` DB，而不是裝了 vector 的 `test_rag` DB。

#### 從 prompt 一眼看出來

```
postgres=#         ← 你在「postgres」這個 DB（沒裝 vector）
   ▲
prompt 前綴 = 當前 DB 名

test_rag=#         ← 你應該在這個 DB（裝了 vector + 有 items）
```

#### 為什麼會走錯 DB？

```powershell
# ❌ 沒指定 DB → 預設連到跟 user 同名的「postgres」DB
psql -U postgres

# ✅ 指定 test_rag
psql -U postgres -d test_rag

# ✅ docker exec 版本
docker exec -it pgvector-test psql -U postgres -d test_rag
                                                ▲
                                            指定 -d
```

#### ⚠️ 重要概念：PostgreSQL 的擴充和 table 是「per-database」

裝在 A 資料庫**不會自動出現在** B 資料庫。每個 DB 是獨立的：

```
Docker 容器內的 Postgres
├── postgres（DB，預設）
│   ├── 擴充：只有 plpgsql（預設）
│   └── tables: 無
│
├── test_rag（DB，docker run 時建的）
│   ├── 擴充：plpgsql + vector ✅
│   └── tables: items ✅
│
├── template0（系統 DB）
└── template1（系統 DB）
```

→ 「vector 在 Postgres 上」**不夠精確**——應該說「vector 在 Postgres 的 `test_rag` DB 上」。

#### 解法：在 psql 裡切換 DB

```sql
postgres=# \c test_rag
You are now connected to database "test_rag" as user "postgres".

test_rag=# \dt           -- 看到 items 表 ✅
test_rag=# \dx           -- 看到 vector 擴充 ✅
test_rag=# SELECT * FROM items;
```

`\c` = **c**onnect，psql 的 meta-command。

#### 偵錯流程

```
\dt 沒看到我建的表？\dx 沒看到 vector？
        │
        ▼
1. 看 prompt 前綴是什麼 DB
        │
        ├── postgres=# → 你在錯的 DB，跑 \c test_rag
        │
        └── test_rag=# → 對的 DB
                │
                ├── 還是沒看到？
                │   ├── 確認進去的是 Docker 容器（不是本地 Postgres）
                │   └── docker exec -it pgvector-test psql -U postgres -d test_rag
                │
                └── 看得到 → ✅ 完成！
```

#### 「per-database」的另一個含意：要在每個 DB 都裝一次

如果你想在 `postgres` DB 也用 vector：

```sql
\c postgres
CREATE EXTENSION vector;     -- ← 這個 DB 也要裝一次
```

⚠️ 多數時候**不需要**——學 RAG 期間就用 `test_rag` 就好。

### Q5.8.7：⚠️ 我在 psql 裡打 `psql -U xxx` 好像沒反應 / prompt 變 `-#`？

**因為 `psql` 是 shell 的指令**（外部程式），**不能在 psql 裡面再呼叫**。

#### 兩種「世界」要分清楚

```
PowerShell（shell 世界）              psql（資料庫世界）
─────────────────                    ─────────────────
docker exec ... psql ...     ◄── 從這啟動 psql
psql -U xxx -d xxx           ◄── 從這指定連線

 (進去 psql 之後)             ─────►  postgres=#
                                         │
                                  在這只能打 SQL 或 \meta-command
                                  例如：
                                    \c test_rag        ← 切換 DB
                                    \dt                ← 看 table
                                    SELECT * FROM ... ← 查資料
                                    \q                 ← 離開
```

#### `=#` vs `-#` prompt 差別

| Prompt | 意思 |
|--------|------|
| `postgres=#` | 等你打新 SQL 指令 |
| `postgres-#` | SQL 還沒結束（前面那行沒 `;` 結尾），等你繼續打 |

你在 psql 裡打 `psql -U test_rag` 會被當 SQL 解析，沒看到 `;` 所以變成 `postgres-#` 一直等。**按 Ctrl+C 取消** 即可。

#### 切換 DB 的三種方法

##### 方法 A：在 psql 裡用 `\c`（最快）

```sql
postgres=# \c test_rag
You are now connected to database "test_rag" as user "postgres".
test_rag=#
```

##### 方法 B：離開 psql 後重新連並指定 `-d`

```sql
postgres=# \q
```

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

##### 方法 C：直接從 PowerShell 跑單個 SQL

```powershell
docker exec pgvector-test psql -U postgres -d test_rag -c "SELECT * FROM items;"
```

---

### Q5.8.8：⚠️ `\dx` 報錯 `bash: dx: command not found`？

你跑去**容器的 bash shell** 了，不是 psql！這兩個是不同層級的環境。

#### 三層 prompt 對照（重要！）

```
Layer 1: PowerShell (Windows host)
  PS C:\coding\futuresign>
  │
  │  docker exec -it pgvector-test bash    ← 這樣會進 bash
  ▼
Layer 2: Container bash（容器內 Linux shell）
  root@6a01995c60dc / [pgvector-test]
  docker >                               ← 在這打 \dx 會錯
  │
  │  psql -U postgres -d test_rag        ← 這樣才會進 psql
  ▼
Layer 3: psql
  test_rag=#                             ← 在這才能用 \dx \c \dt
```

#### 為什麼 `\dx` 在 bash 裡會錯？

```bash
docker > \dx
bash: dx: command not found
```

bash 看到 `\dx` 把 `\d` 當跳脫字元 + 字母 `x`，然後去找叫 `dx` 的 bash 指令——找不到。

`\dx`、`\c`、`\dt` 是 **psql 的 meta-command**，**只在 psql 裡有效**。

#### 怎麼從 bash 進 psql？

```bash
docker > psql -U postgres -d test_rag
psql (17.9...)
test_rag=#               ← 進來了！這時 \dx \c \dt 才生效
```

#### 我是怎麼跑到 bash 的？

通常兩種情況：
1. **Docker Desktop 點 "Open in terminal"**：自動開 debug bash（sandbox 模式）
2. **手動下了 `docker exec -it pgvector-test bash`**

→ 學習階段**不需要進 bash**，直接 `docker exec -it pgvector-test psql -U postgres -d test_rag` 一步到位進 psql。

#### 怎麼離開？

```
psql 內 (test_rag=#)        →  打 \q              → 回到 bash
container bash (docker >)   →  打 exit 或 Ctrl+D  → 回到 PowerShell
PowerShell (PS C:\...)      →  關掉視窗即可
```

#### 各層級可用指令對照

| Prompt 樣貌 | 你在哪 | 可用指令 | 不可用 |
|------------|-------|---------|--------|
| `PS C:\...>` | Windows PowerShell | `docker`, `git`, `ls`, ... | psql meta-command |
| `docker >` 或 `root@xxx:/#` | 容器內 bash | `psql`, `ls`, `cat`, ... | psql meta-command |
| `postgres=#` 或 `test_rag=#` | psql 內 | `\dt`, `\dx`, `\c`, SQL | shell 指令 |

---

### Q5.8.9：⚠️ 在容器內打 `docker exec ...` 顯示 `docker: not found`？

**因為你在「容器內」，不是 Windows 主機**——容器裡沒裝 docker 執行檔。

#### Host（主機）vs Container（容器）邊界

```
┌─────────────────────────────────────────────┐
│ Windows 主機                                 │
│ ──────────                                  │
│ ✅ docker 指令在這                           │
│ ✅ git, node, npm, PowerShell                │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ pgvector-test 容器（Mini Linux）         │ │
│ │ ───────────────                         │ │
│ │ ❌ 沒有 docker                          │ │
│ │ ✅ psql (image 內建)                    │ │
│ │ ✅ ls, cat, bash (Linux 基本工具)       │ │
│ │ ✅ Postgres 17 + pgvector                │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**規則**：每個地方只能用「**那個地方有的東西**」。

| 你在哪 | 能用 docker？ | 能用 psql？ |
|--------|------------|-----------|
| Windows PowerShell | ✅ | ❌（除非另外裝）|
| 容器內 bash | ❌ | ✅ |
| psql 內 | ❌ | ❌（已經在裡面了）|

→ 在容器內，要連 Postgres **直接 `psql -U postgres -d test_rag` 就好**，不需要再 `docker exec`。

#### 要回 PowerShell 用 docker 指令？

```
容器內 bash → 打 exit 或 Ctrl+D → 回 Windows PowerShell → 才能用 docker
```

### Q5.8.10：Docker Desktop 的鯨魚 ASCII art / Debug Shell 是什麼？

那是 **Docker Desktop 的 Debug Shell** 開啟時的歡迎畫面。

```
     ▄
   ▄ ▄ ▄  ▀▄▀ 
 ▄ ▄ ▄ ▄ ▄▇▀  █▀▄ █▀█ █▀▀ █▄▀ █▀▀ █▀█
▀████████▀    █▄▀ █▄█ █▄▄ █ █ ██▄ █▀▄
 ▀█████▀                        DEBUG
```

**鯨魚 + 貨櫃** = Docker 官方 mascot，象徵「容器（container = 貨櫃）漂在大海上載貨」。

#### Debug Shell 是什麼？

- 從 Docker Desktop **GUI 上點 "Exec" / "Open in terminal"** 觸發
- 本質是 `docker exec -it <container> bash` 的 GUI 包裝
- 給你**檢查容器檔案系統、log、debug** 用的

⚠️ 學 RAG **不用點這個按鈕**，會帶你進 bash 反而多繞一層。直接從 PowerShell 用 `docker exec` 進 psql 比較快。

### Q5.8.11：為什麼要三層 prompt？以 Docker Desktop 來說正確順序？

**不需要每次都走三層**——這只是「**理論上可以去的三個地方**」。

#### 各場景該去哪一層？

```
我想做的事                       推薦路徑
─────────────                   ───────────
跑 SQL / 查資料                  PowerShell ──► psql        （跳過 bash）
                                 docker exec -it ... psql -U ... -d ...

啟動 / 停止容器                  PowerShell                  （psql 都不用進）
                                 docker start / stop ...

看容器 log                       PowerShell                  （用 docker logs）
                                 docker logs pgvector-test

進去容器看檔案 / debug            PowerShell ──► bash         （才需要 bash）
                                 docker exec -it ... bash

修改容器內設定檔                  PowerShell ──► bash ──► vim
```

→ **學 RAG 99% 時間在 PowerShell 跟 psql 兩層之間切換**，bash 那層幾乎用不到。

#### Docker Desktop 推薦操作順序

```
1. 開 Docker Desktop（看到鯨魚圖示在工作列即可，不用點開 GUI）
   ↓
2. 開 PowerShell
   ↓
3. docker run ... pgvector/pgvector:pg17    （第一次建容器）
   ↓
4. docker exec -it pgvector-test psql -U postgres -d test_rag
                                             （之後每次都這樣進去）
   ↓
5. 在 psql 玩 SQL
   ↓
6. \q 離開 psql 回 PowerShell
```

→ **不用點 Docker Desktop 的 "Exec" 按鈕**。

### Q5.8.12：完整逐字拆解 `docker exec -it pgvector-test psql -U postgres -d test_rag`

```
docker exec  -it  pgvector-test  psql  -U postgres  -d test_rag
   ▲          ▲       ▲           ▲       ▲           ▲
   │          │       │           │       │           │
   1          2       3           4       5           6
```

| 位置 | 是什麼 | 解讀 |
|------|--------|------|
| 1. `docker exec` | docker 指令 | 「在已執行的容器內跑指令」 |
| 2. `-it` | docker 旗標 | **i**nteractive + **t**ty（互動式 + 終端機）|
| 3. `pgvector-test` | 容器名 | 哪個容器 |
| 4. `psql` | 容器內要執行的指令 | 進 psql 客戶端 |
| 5. `-U postgres` | psql 旗標 | **U**ser = postgres |
| 6. `-d test_rag` | psql 旗標 | **d**atabase = test_rag |

#### ⚠️ 易混淆：`-it` 不是 detached mode！

兩個正好相反的概念：

| 旗標 | 全名 | 意思 |
|------|------|------|
| **`-d`** | **d**etached | **背景執行，不顯示畫面**（立刻回 prompt）|
| **`-i`** | **i**nteractive | 保持 stdin 開啟（能輸入指令）|
| **`-t`** | **t**ty | 配終端機（畫面正常顯示）|
| **`-it`** | i + t 合併 | 互動模式 + 終端機 |

→ `-d`（detached）跟 `-it`（interactive）**幾乎不會一起用**——一個要背景、一個要前景互動。

#### 中文翻譯

> 「**在已執行的 pgvector-test 容器內，以互動模式 + 配終端機，用 postgres 使用者執行 psql 客戶端，連到 test_rag 這個資料庫。**」

---

### Q5.9：我在 psql 視窗輸入 `mysecret` 為什麼失敗？

99% 是**你連到的 Postgres 不是 Docker 那個**——是**你本地的 Postgres**（密碼 abc123，不是 mysecret）。

#### 三種連線情境速查

| 怎麼連 | 連到誰 | 用什麼密碼 | 會不會問密碼 |
|---------|-------|-----------|------------|
| `docker exec -it pgvector-test psql ...` | 容器內 Postgres | （不問）| ❌ 不問 |
| `psql -h localhost -p 5433 -U postgres -d test_rag` | 容器內 Postgres（從外面）| `mysecret` | ✅ 問 |
| `psql -U postgres`（沒指定 host/port）| **本地** Postgres | `abc123` | ✅ 問 |
| pgAdmin / DBeaver 連 5432 | **本地** Postgres | `abc123` | ✅ 問 |
| pgAdmin / DBeaver 連 5433 | 容器內 Postgres | `mysecret` | ✅ 問 |

→ **port 號決定你連到哪個 Postgres**：5432 = 本地、5433 = Docker。

#### 偵錯流程

如果輸入密碼失敗：

```
1. 看你下的指令有沒有 -h localhost -p 5433
   ├── 沒有 → 預設連 5432 = 本地 → 用 abc123
   └── 有   → 連 5433 = Docker → 用 mysecret

2. 看 GUI 工具的 port 設定
   ├── 5432 → 本地 → 用 abc123
   └── 5433 → Docker → 用 mysecret

3. 還是不行：直接用 docker exec 從內部進
   docker exec -it pgvector-test psql -U postgres -d test_rag
   → 不會問密碼
```

### Q6：Visual Studio vs VS Code 差在哪？

| | Visual Studio | VS Code |
|---|---|---|
| 本質 | 完整 IDE（含 C++ compiler）| 輕量編輯器（沒 compiler）|
| 大小 | 數 GB ~ 30+ GB | ~300 MB |
| 編譯 pgvector 能用嗎 | ✅ 可以 | ❌ 不行（沒 compiler）|
| 跨平台 | 主要 Windows / 有 Mac | Windows / Mac / Linux |
| 價錢 | Community 免費 / Pro 付費 | 完全免費 |

→ 編譯 pgvector 需要 Visual Studio（不是 VS Code）。但**學 RAG 階段**強烈建議走 Docker，根本不需要 Visual Studio。

### Q7：Visual Studio 2026 / 2025 / 2022 哪個版本可以？

任何**現代版本**都行（2019 / 2022 / 2025 / 2026），安裝時勾選：

✅ 「使用 C++ 的桌面開發」(Desktop development with C++) workload
✅ Windows SDK（通常自動包含）

但實話：**學 RAG 不要為此裝 Visual Studio**——Docker 路線 4 分鐘搞定，不需 Visual Studio。

### Q8：pgvector 預設是 Flat 嗎？

✅ 是。pgvector 預設不建索引（= Flat / brute force）。資料變多需要：

```sql
CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);
```

→ 詳見 Section 0 的「pgvector 支援的索引」。

### Q9：`<->` 是什麼意思？跟 `<=>`、`<#>` 有什麼差？

pgvector 的距離運算子：

| 運算子 | 距離類型 | 對應 ops | 何時用 |
|--------|---------|----------|--------|
| `<->` | L2 (Euclidean) | `vector_l2_ops` | 最直覺，多數場景 |
| `<=>` | Cosine | `vector_cosine_ops` | 文字 embedding 主流 |
| `<#>` | 負內積 | `vector_ip_ops` | 已正規化向量 |

→ 詳見 Section 4.4 + Section 0 的「`_ops` 是什麼？」。

### Q10：`docker run -d --name pgvector-test -e POSTGRES_PASSWORD=mysecret -e POSTGRES_DB=test_rag -p 5432:5432 pgvector/pgvector:pg17` 每個參數是什麼？

| 參數 | 縮寫展開 | 作用 |
|------|---------|------|
| `-d` | **d**etached | 背景執行 |
| `--name` | - | 容器名字 |
| `-e VAR=value` | **e**nv | 環境變數 |
| `-p host:container` | **p**ort | port 映射 |
| `pgvector/pgvector:pg17` | - | image 名字（沒 dash 前綴的就是它）|

→ 詳見 Step 1 的「參數逐一拆解」（每個參數都有獨立小節）。

### Q11：本機 5432 port 被佔用怎麼辦？

```powershell
-p 5433:5432
   ▲    ▲
   │    └── 容器內還是 5432（不能改）
   │
   └── 本機改成 5433（你連線時用 5433）
```

→ 詳見 Step 1 第 5 點 `-p` 的說明。

### Q12：psql 進去後常用指令？

| psql meta-command | 縮寫展開 | 作用 |
|------|---------|------|
| `\l` | **l**ist databases | 列出所有 DB |
| `\c <db>` | **c**onnect | 切換 DB |
| `\dt` | **d**escribe **t**ables | 列出 table |
| `\d <table>` | **d**escribe | 看 table 結構 |
| `\dx` | **d**escribe e**x**tensions | 列出擴充 |
| `\q` | **q**uit | 離開 |

→ 詳見 Step 4 的「psql 其他常用 meta-command」。

### Q13：`CREATE EXTENSION vector;` 跟 `CREATE EXTENSION IF NOT EXISTS vector;` 差在哪？

| 寫法 | 第二次執行 |
|------|----------|
| `CREATE EXTENSION vector;` | ❌ 報錯 `already exists` |
| `CREATE EXTENSION IF NOT EXISTS vector;` | ✅ 已存在就跳過 |

→ **建議都加 `IF NOT EXISTS`**，重複執行不會壞事。詳見 Step 4。

### Q14：CLI 旗標相關的疑問（`-la`、`-iE`、`-i` 等）

`ls -la | grep -iE "rag|RAG"` 拆解：

| 部分 | 屬於哪個指令 | 意思 |
|------|------------|------|
| `-l` | ls | **l**ong format（詳細格式）|
| `-a` | ls | **a**ll（含隱藏檔）|
| `-i` | grep | **i**gnore case |
| `-E` | grep | **E**xtended regex |

⚠️ 同字母 `-i` 在不同指令意思**完全不同**：

| 指令 | `-i` 意思 |
|------|----------|
| **grep** | **i**gnore case |
| **sed** | **i**n-place |
| **docker exec** | **i**nteractive |
| **rm / cp** | **i**nteractive（覆蓋前詢問）|
| **ls** | **i**node |

→ 詳見 [`../CLI/grep-options.md`](../CLI/grep-options.md)、[`../CLI/ls-options.md`](../CLI/ls-options.md)、[`../CLI/cli-flag-meaning-conflicts.md`](../CLI/cli-flag-meaning-conflicts.md)。

### Q15：1536 dim 長什麼樣？我想像不出來

人類腦袋只能視覺化 3D。**過了 3D 不要試圖「看到形狀」**——想成「Excel 表的 1536 個欄位」就好。

→ 詳見 [`../LLM-Memory/rag-vs-memory-comparison.md`](../LLM-Memory/rag-vs-memory-comparison.md) 的 0.5 節「1536 維長什麼樣？」。

### Q16：什麼是「近似距離 (approximate distance)」？

不是真的算原始向量的距離，是**用查表方式估算**的距離。**99% 接近真實值，但速度快 100 倍**。

PQ 的 ADC（Asymmetric Distance Computation）就是這個機制。ANN (Approximate Nearest Neighbor) 的 「**A**」就是 Approximate（近似）的意思。

→ 詳見 [`../LLM-Memory/rag-vs-memory-comparison.md`](../LLM-Memory/rag-vs-memory-comparison.md) 的 0.5 節「近似距離」。

### Q17：K-means 的「mean」是什麼意思？是「方法 (method)」嗎？

❌ **不是「方法」**。

| 英文 | 中文 |
|------|------|
| **mean** | **平均（值）** |
| ~~method~~ | 方法（完全不同的字）|

K-means = K 個平均值 = K 個群中心（因為中心 = 該群所有點的平均）。

中文標準翻譯：**K-平均演算法** ✓ 或 **K-均值演算法** ✓。

→ 詳見 [`../LLM-Memory/ml-supervised-vs-unsupervised.md`](../LLM-Memory/ml-supervised-vs-unsupervised.md) 第 10 節。

### Q18：KNN 跟 K-means 是同一個東西嗎？

❌ **完全不同**。只是名字都有 K。

| | KNN | K-means |
|---|-----|---------|
| 學習類型 | **監督式** | **非監督式** |
| K 是什麼 | 看 K 個鄰居 | 分 K 個群 |
| 用途 | 預測新點屬於哪一類 | 把全部點分群 |

→ 詳見 [`../LLM-Memory/ml-supervised-vs-unsupervised.md`](../LLM-Memory/ml-supervised-vs-unsupervised.md) 第 10 節。

### Q19：強化式學習為什麼叫「沒答案」？跟 prompt 有關嗎？

❌ **跟 prompt 無關**。RL 是 LLM 訓練階段的方法，prompt 是訓練完之後使用者跟模型的對話。

「沒答案」= **沒人告訴 agent「每一步該怎麼做」，只能從「最後得幾分」反推哪些動作是對的**。

例如下棋：80 步下完才知道「贏了 +1」，要從幾百萬局的勝負反推。

→ 詳見 [`../LLM-Memory/ml-supervised-vs-unsupervised.md`](../LLM-Memory/ml-supervised-vs-unsupervised.md) 第 4 節。

### Q20：HNSW / IVF / PQ 這些索引的資料結構長怎樣？

不是「一串向量排好放著」（像 `[1, 5]`），而是建在向量集合**之上**的**另一層資料結構**：

| Index | 結構 |
|-------|------|
| **HNSW** | 多層圖，每個節點 `(向量, [鄰居 IDs])` |
| **IVF** | K-means 分群中心 + 倒排清單 `cluster_id → [vec_ids]` |
| **PQ** | 64 個 codebook + 每個向量壓縮成 64 bytes |
| **LSH** | 多張 hash table，相近向量大機率同 bucket |

→ 詳見 [`../LLM-Memory/rag-vs-memory-comparison.md`](../LLM-Memory/rag-vs-memory-comparison.md) 的 0.5 節「主流 Vector Index 家族」。

### Q21：HNSW 的 graph 跟 LangGraph 是同樣概念嗎？

抽象上都是 graph（節點 + 邊），但**目的完全不同**：

| | HNSW | LangGraph |
|---|------|-----------|
| 節點代表 | 向量資料點 | 執行單元（LLM call）|
| 邊代表 | 鄰近關係 | 控制流轉移 |
| 目的 | 加速最近鄰搜尋 | 編排 agent 工作流 |

→ HNSW 是「資料的空間地圖」，LangGraph 是「程式的執行流程圖」。詳見 0.5 節 HNSW 子節「常見混淆」。

### Q22：監督式 vs 非監督式 vs 強化式怎麼分？

| 類型 | 訓練資料 | 例子 |
|------|---------|------|
| **監督式** | 題目 + **正確答案** | 1000 張照片標好「貓/狗」→ 訓練分類器 |
| **非監督式** | **只有題目，沒答案** | 給 1000 張照片，自動分群 |
| **強化式** | 沒答案，但有**獎勵訊號** | 下棋贏 +1 輸 -1 |

→ 詳見 [`../LLM-Memory/ml-supervised-vs-unsupervised.md`](../LLM-Memory/ml-supervised-vs-unsupervised.md)。

---

## 12. 下一步學什麼？

完成這份 setup 後，建議的學習路徑：

1. **這份**：跑起 pgvector，做第一次相似度查詢 ✅
2. **接 OpenAI embedding**：用真實 1536 維向量做查詢
3. **學 chunking**：怎麼把長文章切片
4. **整合 LLM**：寫第一個 RAG（文件 → embed → store → query → LLM 生成）
5. **加索引**：資料變多後建 HNSW，看速度差異
6. **進階主題**：reranker、hybrid search（BM25 + vector）

---

## 相關筆記

- [../LLM-Memory/rag-vs-memory-comparison.md](../LLM-Memory/rag-vs-memory-comparison.md) — RAG / Memory 概念對照（Layer 5）
- [../LLM-Memory/ml-skill-tree-hierarchy.md](../LLM-Memory/ml-skill-tree-hierarchy.md) — ML 技能樹（pgvector 在 Layer 4 工具）
- [../LLM-Memory/ml-supervised-vs-unsupervised.md](../LLM-Memory/ml-supervised-vs-unsupervised.md) — ML 三大類別
- [../docker/docker-compose-ps-and-unix-ps.md](../docker/docker-compose-ps-and-unix-ps.md) — docker 指令對照

---

## 官方資源

- **pgvector GitHub**：<https://github.com/pgvector/pgvector>
- **官方 Docker Hub**：<https://hub.docker.com/r/pgvector/pgvector>
- **Postgres 官方文件**：<https://www.postgresql.org/docs/>
- **OpenAI Embedding API**：<https://platform.openai.com/docs/guides/embeddings>
