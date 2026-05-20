# Chunk 與 Incremental Ingest — 改了 md 還要重 chunk 嗎？

> **這份筆記回答**：
> 1. 我以後改了一個 md 檔，還要先手動重新 chunk 嗎？（不用！）
> 2. `python scripts/ingest.py` 跑一次背後到底發生什麼事？
> 3. 為什麼是用「先刪 chunk 再插」，不是 update？
> 4. `incremental` / `--full` / `--dry-run` 三種模式差在哪？什麼時候必須用 `--full`？
> 5. 為什麼用 MD5 指紋而不是檔案修改時間（mtime）？
> 6. 411 篇筆記重 ingest 要多久？只改 3 篇又要多久？
> 7. 該怎麼把這件事自動化？git hook、cron、file watcher 哪個適合我？
>
> **建立日期**：2026-05-11

---

## 0. 先說結論：你不用手動重 chunk

```bash
# 改完任何一個 md 檔，只要這一行
python scripts/ingest.py
```

`ingest.py` 內建**內容指紋比對**，沒改的檔案會自動跳過、改過的檔案才會重新切 chunk + 重 embed + 寫 DB。

**你只需要記住兩個指令**：

| 場景 | 指令 |
|------|------|
| 平常改了筆記 | `python scripts/ingest.py` |
| 換了 chunker 或 embedding model | `python scripts/ingest.py --full` |

剩下的細節這篇講清楚為什麼。

---

## 1. 跑一次 ingest，背後到底發生什麼？

打開 `scripts/ingest.py` 主迴圈（簡化版）：

```python
existing_hashes = db.get_file_hashes()   # 從 DB 撈出 {file_path: md5}

for path in collect_md_files():
    rel = relative_path(path)            # 例：'RAG/chunking-strategies-comparison.md'
    new_hash = md5_of(path)              # 算這個檔案現在的 MD5

    if existing_hashes.get(rel) == new_hash:
        skipped += 1                     # 沒變 → 跳過
        continue

    # 有變（或新檔）→ 重 chunk + 重 embed + 寫 DB
    text = path.read_text(encoding="utf-8")
    chunks = chunk_markdown(text)
    db.delete_file_chunks(rel)           # 先砍掉這個檔案的所有舊 chunk
    embeddings = embedder.encode([c.content for c in chunks])
    db.insert_chunks_batch(rows)         # 再 batch insert 新 chunk
```

### 1.1 流程圖

```
                  ┌─────────────────┐
                  │ 掃 411 個 .md  │
                  └────────┬────────┘
                           ↓
              ┌────────────────────────┐
              │  對每個檔算 MD5         │
              │  跟 DB 裡的 hash 比對  │
              └────────────┬───────────┘
                           ↓
                ┌──────────┴──────────┐
                ↓                     ↓
         hash 一樣              hash 不一樣（或新檔）
        （沒人動過）                   ↓
                ↓                ┌────────────────────────┐
            skip                 │ 1. read file           │
                                 │ 2. chunk_markdown()    │
                                 │ 3. delete_file_chunks  │ ← 先砍乾淨
                                 │ 4. embedder.encode()   │
                                 │ 5. insert_chunks_batch │ ← 再插
                                 └────────────────────────┘
```

### 1.2 為什麼要「先刪再插」，不直接 update？

**因為 chunk 數量會變**。同一個 .md 檔，今天切出 12 個 chunk，明天你新增三段內容，可能切出 15 個 chunk。

如果用 update 思路會出大事：

```
舊狀態（DB 裡）：
  chunk_index 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11

改完後新切（記憶體裡）：
  chunk_index 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
                                                       ↑ 新增的

如果用 ON CONFLICT (file_path, chunk_index) DO UPDATE：
  → chunk 0~11 被覆蓋更新
  → chunk 12, 13, 14 被插入
  → 看起來沒事？
```

問題是**內容會錯位**：

```
舊 chunk_index=5 的內容是：「第六段 - 講 chunking 的部分」
新 chunk_index=5 的內容是：「第六段 - 但因為前面插了東西，現在這裡變成講 embedding 的部分」

→ 同一個 chunk_index，前後語義完全不同
→ 而且如果新切完只有 8 個 chunk（變短了），舊的 chunk_index=8~11 會殘留 ← 災難
```

**所以一律先 `DELETE WHERE file_path = ?` 把這個檔的所有 chunk 砍光，再 batch insert 全新的**。乾淨、簡單、不會有殘留。

> 註：`db.py` 的 `insert_chunks_batch` 雖然寫了 `ON CONFLICT DO UPDATE`，但因為前面已經 `delete_file_chunks` 砍光了，那個 UPSERT 是雙保險不會觸發。

---

## 2. 為什麼用 MD5 而不是 mtime？

直覺會想：「比 modified time 不就好了？」**不行**，會誤判。

| 操作 | mtime 變化 | 內容變化 | 該重 ingest 嗎 |
|------|----------|---------|--------------|
| 你打開 vim 改一個錯字 | 變了 | 變了 | 要 |
| `git pull` 拉到別人改的版本 | 變了 | 變了 | 要 |
| `git checkout` 切回舊 commit | 變了 | 可能跟之前一樣 | 看情況 |
| `cp -p` 從備份還原（保留 timestamp）| 沒變 | 變了 | **要，但 mtime 騙你** |
| `touch file.md`（沒改內容）| 變了 | 沒變 | **不用，但 mtime 騙你** |
| 整個資料夾複製到另一台機器 | 全部變 | 全部沒變 | **不用，但 mtime 全 fire** |

**MD5 是內容的指紋**，只要一個 byte 不同就會變，內容一樣就一定一樣。對「我到底要不要重 embed」這個問題，MD5 是唯一誠實的答案。

成本？411 個檔讀完算 MD5 大概 1-2 秒，跟 embedding 比起來完全可以忽略。

---

## 3. 三種模式對照

| 模式 | 指令 | 行為 | 預期時間（411 篇） |
|------|------|------|------------------|
| **incremental**（預設）| `python scripts/ingest.py` | 從 DB 讀現有 hashes，只處理變動的檔 | 只動 0-10 篇 → 5-30 秒 |
| **full** | `python scripts/ingest.py --full` | `TRUNCATE chunks` 清空整張表，重跑全部 | 15-30 分鐘 |
| **dry-run** | `python scripts/ingest.py --dry-run` | 算 hash + 模擬切 chunk，**完全不寫 DB** | 5-10 秒 |

### 3.1 dry-run 在幹嘛？

`--dry-run` 會印出「如果真的跑，會更新哪幾個檔、各會切出幾個 chunk」，但不刪、不插、不 embed。

```bash
$ python scripts/ingest.py --dry-run
Found 411 .md files under C:/coding/futuresign/Abby-notes
  [42/411] RAG/chunking-strategies-comparison.md -> 14 chunks (dry-run)
  [187/411] 工作日誌/2026-05-10.md -> 3 chunks (dry-run)
  [302/411] feedback/feedback-git-push-tracking.md -> 2 chunks (dry-run)
Done in 6.2s.
  Files updated: 3
  Files skipped (unchanged): 408
  Chunks written: 0      ← 注意這裡是 0，沒寫進去
```

用途：**改了一堆檔之後，先看看會動到哪些**，再決定要不要真的跑。

---

## 4. 什麼時候必須跑 `--full`？

這是會踩坑的地方。**incremental 只認得「.md 內容變了」**，認不出「.md 沒變但 chunk 規則變了」。

### 4.1 改了 chunker 演算法

你哪天去調整 `src/chunker.py`：

- 把 `CHUNK_MAX_TOKENS` 從 500 改成 800
- 換掉 `RecursiveCharacterTextSplitter` 的策略
- 加入新的 header level（例如 h5）
- 改 `min_tokens` 邏輯（合併小 chunk 的條件變了）

→ **每個 .md 重新切會切出不一樣的 chunk，但檔案的 MD5 沒變**
→ incremental 會全部 skip
→ DB 裡還是舊規則切出來的 chunk
→ **必須 `--full` 重跑**

```bash
# 改完 chunker.py 後
python scripts/ingest.py --full
```

### 4.2 換 embedding model

換掉 `src/embedder.py` 用的 model（例如從 `bge-m3` 換成 `bge-large-zh`），或是換維度（1024 → 768），那就：

- 向量維度可能變了 → 跟 DB schema 的 `vector(N)` 對不上 → 要先改 schema
- 就算維度一樣，**語意空間完全不同** → 舊向量跟新向量根本不能在同一張表裡比相似度
- **必須 `--full`**

### 4.3 DB 裡的資料壞了 / 想徹底清重來

例如：
- 之前 ingest 中途斷線，懷疑有些 chunk 沒寫完
- 想換一個 vector index 策略，順便重灌
- 你就是看資料不爽想砍掉重練

→ `--full` 會 `TRUNCATE TABLE chunks RESTART IDENTITY`，從零開始。

### 4.4 判斷規則速查

| 你動了什麼 | incremental | --full |
|-----------|-------------|--------|
| 改 .md 內容 | 夠 | 不必要 |
| 新增 .md 檔 | 夠 | 不必要 |
| 刪掉 .md 檔（從硬碟）| 不會自動清 DB（見下節）| 會清 |
| 改 `chunker.py` | **不夠** | 必要 |
| 改 `embedder.py` 換 model | **不夠** | 必要 |
| 改 `Config.CHUNK_MAX_TOKENS` 等參數 | **不夠** | 必要 |
| 改 `db.py` 的 schema | 看狀況 | 通常需要 |

### 4.5 注意：incremental 不會清「已刪除的 .md」

目前 `ingest.py` 只「掃硬碟上有的檔，跟 DB 比 hash」。如果你**從硬碟刪掉一個 .md**，DB 裡那個檔的 chunk **不會自動消失**。

要清掉孤兒 chunk，目前最乾淨的方式就是 `--full`。日後可以加一個 `--prune` mode，這邊先記著。

---

## 5. 效能參考數字

實際跑出來的量級（CPU、bge-m3 1024-dim）：

| 動作 | 時間 |
|------|------|
| 算 411 個檔的 MD5 | 1-2 秒 |
| `db.get_file_hashes()` | < 100ms |
| 切一個典型 .md（~10 chunk）| < 50ms |
| **embed 一個 chunk（CPU、bge-m3）** | **~0.3 秒** ← 瓶頸 |
| Insert batch（10 個 chunk）| < 100ms |

### 5.1 三種情境的總時間估算

```
情境 A：incremental，0 個檔變動
  → 只算 411 個 MD5 + 撈 hashes
  → 總時間：~2 秒

情境 B：incremental，3 個檔變動（典型工作日）
  → 2 秒（hash 比對）
  + 3 檔 × 10 chunk × 0.3s（embed）= 9 秒
  + DB 寫入 < 1 秒
  → 總時間：~12 秒

情境 C：--full，411 篇全部重跑
  → 跳過 hash 比對
  + 411 檔 × ~10 chunk × 0.3s = ~1230 秒 ≈ 20 分鐘
  → 總時間：15-30 分鐘（看內容長短）
```

**結論**：incremental 是常態，full 是季節性大掃除。

### 5.2 想加速 full ingest？

- 用 GPU 跑 embedder（5-10 倍）
- 改用 batch embedding（一次塞 32 個 chunk 進 model，不要一個一個 encode）
- 換 API 版 embedding（OpenAI、Cohere），但要付錢
- 平常就用 incremental，根本不用全跑

---

## 6. 自動化選項：怎麼省事最有感？

### 6.1 選項對照

| 選項 | 觸發時機 | 設定難度 | 缺點 | 適合誰 |
|------|---------|---------|------|--------|
| **手動**（想到就跑）| 你打 `python scripts/ingest.py` | 0 | 容易忘記 | 剛開始用 |
| **Git pre-commit hook** | 每次 `git commit` 前自動跑 | 低 | commit 變慢幾秒 | **推薦給你** |
| **Git post-commit hook** | commit 完才跑 | 低 | 失敗你不會立刻知道 | 不在乎延遲 |
| **cron / Windows 排程** | 每天半夜固定跑 | 中 | 白天查詢可能拿到舊資料 | 改動很少的人 |
| **file watcher**（watchdog / chokidar）| 改檔當下就跑 | 高 | 常駐 process、會吃資源 | 重度即時需求 |

### 6.2 推薦給 Abby 的路徑

**先手動，等熟了上 git pre-commit hook**。

理由：
1. **手動跑兩週**，建立「改完一批就 ingest」的肌肉記憶，順便摸清楚什麼時候要 `--full`
2. 等流程穩定後再上 git hook，不會被 hook 噪音弄到搞不清楚出了什麼事
3. 不要先上 file watcher，那個會在你存檔的瞬間 fire，邊改邊存的時候會浪費一堆 embedding 計算

### 6.3 Git pre-commit hook 範本（之後上的時候用）

`Abby-notes/.git/hooks/pre-commit`（無副檔名，要 `chmod +x`）：

```bash
#!/usr/bin/env bash
# 只在 .md 有改動時才 ingest
if git diff --cached --name-only | grep -q '\.md$'; then
    echo "[pre-commit] Detected .md changes, running incremental ingest..."
    cd /c/coding/futuresign/abby-notes-rag
    python scripts/ingest.py
    if [ $? -ne 0 ]; then
        echo "[pre-commit] ingest failed, aborting commit"
        exit 1
    fi
fi
```

PowerShell 版（Windows 原生）：

```powershell
# Abby-notes/.git/hooks/pre-commit.ps1
$changedMd = git diff --cached --name-only | Select-String '\.md$'
if ($changedMd) {
    Write-Host "[pre-commit] Running incremental ingest..."
    Push-Location C:\coding\futuresign\abby-notes-rag
    python scripts/ingest.py
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) { exit 1 }
}
```

> Windows 上 git hook 預設會找 sh，所以 bash 版直接放 `pre-commit` 也能跑（git for windows 帶 bash）。PowerShell 版需要包一層 `pre-commit` 去 call `pwsh -File pre-commit.ps1`。

---

## 7. 一個完整例子：你今天改了 3 篇筆記

假設今天 2026-05-11，你做了：
- 改 `工作日誌/2026-05-11.md` 加了今天的進度
- 改 `RAG/chunking-strategies-comparison.md` 修了一個錯字
- 新增 `RAG/chunk-and-incremental-ingest.md`（這篇）

跑一次：

```bash
$ cd C:\coding\futuresign\abby-notes-rag
$ python scripts/ingest.py

Found 411 .md files under C:/coding/futuresign/Abby-notes
  [42/411] RAG/chunking-strategies-comparison.md -> 14 chunks
  [98/411] RAG/chunk-and-incremental-ingest.md -> 8 chunks
  [187/411] 工作日誌/2026-05-11.md -> 3 chunks

Done in 11.4s.
  Files updated: 3
  Files skipped (unchanged): 408
  Chunks written: 25
```

背後發生的事：

1. 撈出 DB 裡 411 個（其實是 410，新檔還沒在裡面）`{file_path: hash}`
2. 對每個 .md 算現在的 MD5
3. 408 個 hash 一樣 → skip
4. 改錯字那篇：`delete_file_chunks('RAG/chunking-strategies-comparison.md')` 砍掉 14 個舊 chunk → 重 chunk → 重 embed → batch insert 14 個新 chunk
5. 新檔：DB 裡沒有 hash → 視為「需要更新」→ 沒舊 chunk 可砍（delete 0 rows）→ 直接 chunk + embed + insert
6. 工作日誌：同改錯字流程

**11 秒搞定**，你不需要知道哪幾個檔變了、不需要手動 chunk、不需要管哪個 file_path 對應哪堆 chunk。

---

## 8. 快速參考 cheat sheet

```
日常工作流：
  改完任何 md 檔 → python scripts/ingest.py    （5-30 秒）

什麼時候跑 --full？
  改了 chunker.py
  換 embedding model
  改 chunk 參數（max_tokens、overlap、min_tokens）
  改 DB schema
  資料壞了想砍掉重來

不確定會動到什麼？先：
  python scripts/ingest.py --dry-run

判斷有沒有變的依據：
  MD5 內容指紋（不是 mtime！）

更新流程：
  hash 變 → delete_file_chunks(rel) → 重 chunk → 重 embed → batch insert

效能：
  3 檔變動 ≈ 12 秒
  411 檔 full ≈ 15-30 分鐘
  瓶頸是 embedder（CPU 上每 chunk 0.3 秒）

自動化建議路徑：
  手動兩週 → git pre-commit hook → 之後再考慮 watcher

incremental 摸不到的事：
  從硬碟刪掉的 .md，DB 裡 chunk 不會自動消（要 --full）
  改 chunker / embedder（檔案內容沒變，hash 沒變，會被 skip）
```

---

## 相關筆記

- [chunking-strategies-comparison.md](chunking-strategies-comparison.md) — chunking 演算法選型（這篇是「ingest 工程運作」，那篇是「切法理論」）
- [pgvector-with-openai-embedding.md](pgvector-with-openai-embedding.md) — embedding 完整實作
- [embedding-models-comparison.md](embedding-models-comparison.md) — 換 model 前先讀
- [2026-05-07-rag-implementation-plan.md](2026-05-07-rag-implementation-plan.md) — RAG 系統整體規劃
- [2026-05-07-rag-build-commands.md](2026-05-07-rag-build-commands.md) — 建置指令參考
