# Postgres 當機與重啟：WAL、Checkpoint、Recovery Mode 全解

> 觸發場景：跑 RAG ingest 時 Docker container 內的 Postgres crash 重啟，client 看到 `FATAL: the database system is in recovery mode`。本篇拆解整個機制。

---

## TL;DR

| 概念 | 一句話 |
|---|---|
| **WAL** | 「先記帳簿，再做事」的紀錄器，掛在 `pg_wal/` 目錄 |
| **Checkpoint** | 把記憶體 buffer 裡欠的帳一次寫回硬碟資料表 |
| **Transaction rollback** | 只 undo DB 內的操作，**不會** undo 已發出的 email、HTTP、檔案 IO |
| **SIGTERM** | Unix 訊號 #15，「請關閉」的禮貌請求，可被攔截 |
| **PID 1** | 容器的「主 process」，它死容器就死 |
| **Recovery mode** | Postgres 不乾淨重啟後的「補完進行中」狀態，期間拒絕寫入 |

**Recovery mode ≠ Docker 特有。**斷電、SIGKILL、VM 重啟都會觸發，純 Postgres engine 邏輯。

---

## 1. ⚠️ 觀念釐清：Recovery Mode 不是 Docker 特有

**這是最容易誤解的一點，先講清楚再進細節。**

Recovery mode 是 Postgres engine 內建的機制。任何狀況下 Postgres 不乾淨關機重啟都會觸發，跟 Docker / 容器化技術完全無關：

| 場景 | 觸發 recovery mode？ |
|---|---|
| Docker 容器被 kill 重啟 | ✅ |
| Bare metal 機房斷電後開機 | ✅ |
| Linux server 被 `kill -9 postgres` process | ✅ |
| AWS RDS 主機硬體故障 failover | ✅ |
| VM 重開機 | ✅ |
| `pg_ctl stop -m smart`（正常關機）再啟動 | ❌（不需要 recovery） |

判斷標準很簡單：

> **Postgres 收到 SIGKILL / 直接斷電 / 沒走完 checkpoint 就關掉**
> → 開機時找到「上次沒乾淨關閉」標記
> → 進 recovery mode

### 為什麼這個釐清重要

如果誤以為「recovery mode 是 Docker 才有」，你會：
- 把問題歸咎於容器化技術，去 Docker 設定裡瞎找
- 換到 bare metal 部署以為就好了（其實一樣會遇到）
- 不去學 Postgres 真正的 crash recovery 機制

正確心態：**Docker 只是事件現場，Postgres 本身才是主角。**

我們這次只是**剛好用 Docker 觀察到它**。下面開始拆解整個機制。

---

## 2. WAL (Write-Ahead Log)

### 是什麼

「先記帳，再做事」的策略。Postgres 收到 INSERT/UPDATE 時，**不會直接寫進資料表檔案**，而是：

```
1. 寫一行到 WAL：「我打算把這 N 個 chunks 寫進 file_path=X」
2. fsync() 強迫 OS 把這行寫進硬碟（不能只留在記憶體 buffer）
3. 回應 client「OK，搞定」
4. 之後找空檔再把資料真正寫進資料表檔案
```

### 為什麼這樣設計

| 沒有 WAL | 有 WAL |
|---|---|
| 寫資料表 = 改硬碟上幾百個地方（B-tree 節點、index、heap 都要動） | 寫資料表 = 只 append 一行到 WAL 檔尾（連續寫超快） |
| 中途斷電 → 資料表半好半壞，無法救 | 斷電 → 開機重讀 WAL，「上次說要做的，沒做完的幫你做完」 |

WAL 就是資料庫的**黑盒子飛航紀錄器**。

### 實體位置

```
/var/lib/postgresql/data/pg_wal/
├── 000000010000000000000001  (16MB)
├── 000000010000000000000002  (16MB)
└── ...
```

每個 WAL segment 預設 16MB，循環使用。

---

## 3. SIGTERM 與 PID 1

### 訊號（Signal）速查

Unix process 之間用整數代號溝通：

| 訊號 | 號碼 | 意思 | 可不可以拒絕 |
|---|---|---|---|
| `SIGTERM` | 15 | 「請關閉」（禮貌請求） | ✅ 可攔截，清理後再退 |
| `SIGINT` | 2 | Ctrl+C | ✅ 可攔截 |
| `SIGKILL` | 9 | 強制砍掉 | ❌ OS 直接殺，process 無法反抗 |
| `SIGHUP` | 1 | 終端關閉 | ✅ 可攔截 |

### docker stop 做什麼

```
docker stop <container>
├─ 1. 送 SIGTERM 給容器內 PID 1 的 process
├─ 2. 等 10 秒（預設 grace period）
└─ 3. 若還沒退出 → 升級到 SIGKILL
```

### Postgres 收到 SIGTERM 的反應

1. 拒絕新連線
2. 等現有連線結束（或關掉它們）
3. **做 checkpoint**（把記憶體 buffer flush 到硬碟）
4. 安全關機 → 下次開機**不需要 recovery**

### 如果是 SIGKILL / 斷電

沒機會做 step 3 → 開機要靠 WAL recovery。

### PID 1 是什麼

容器啟動時 Docker 跑的那個 process，固定 PID = 1。容器的生死跟著它走：

```
abby-rag-postgres 容器
├─ PID 1: postgres (主 process) ← 它死，容器就死
   ├─ PID 27: postgres: checkpointer
   ├─ PID 28: postgres: background writer
   ├─ PID 29: postgres: walwriter
   └─ PID 50+: postgres: <client 1>  ← 每個連線一個
```

Postgres 本身是 multi-process 架構，但對 Docker 來說只看 PID 1。

> 對照：傳統 Linux server 上跑 Postgres 是 systemd 在管，不靠 PID 1 概念。

---

## 4. Transaction Rollback 包括什麼

**只 undo 資料庫內的操作。外部副作用一概不管。**

### Transaction 是什麼

「一組要嘛全成功、要嘛全失敗」的操作組合：

```sql
BEGIN;
  INSERT INTO chunks VALUES (...);
  UPDATE files SET ingested_at = NOW();
  DELETE FROM staging WHERE ...;
COMMIT;  -- ← 沒走到這行，前面三個都會被 rollback
```

### Rollback 會 undo 的

- INSERT / UPDATE / DELETE（資料表內容）
- DDL（CREATE TABLE、ALTER TABLE — Postgres 連 schema 改動都能 rollback）
- 索引修改
- pgvector 的向量寫入

### Rollback 不會 undo 的

- 已發出的 HTTP 請求
- 已寄出的 email
- 寫到檔案系統的檔案
- `print()` 到 console 的文字
- Sequence 序號的消耗（被打掉的編號不會還給你）

### 經典踩雷

```python
with db.transaction():
    db.execute("INSERT INTO orders ...")
    slack.send_message("訂單成立")   # ← 已發送
    raise Exception("驗證失敗")
    # transaction rollback → 訂單沒寫進 DB
    # 但 Slack 訊息已經送出 → 不一致
```

→「分散式 transaction 很難」的根源。解法是 outbox pattern 或補償交易。

---

## 5. Checkpoint：把欠的帳寫回硬碟

### 為什麼需要

複習資料流：
- INSERT → 寫 WAL → 資料先進**記憶體 buffer**
- 真正的資料表檔案還沒更新

問題：記憶體會越欠越多，WAL 也會越長。

### Checkpoint 做什麼

```
每隔 5 分鐘（預設）或 WAL 寫滿到一定量：
  1. 把記憶體 buffer 裡所有「髒頁面」（dirty pages，被改過還沒寫盤的）
     一口氣 flush 到硬碟上的資料表檔案
  2. 在 WAL 裡寫一個 checkpoint record，標記「到這裡都安全落地了」
  3. 舊的 WAL segment 可以被回收 / 刪除
```

### 對 recovery 的影響

**下次 crash 時，recovery 只要從最後一次 checkpoint 開始讀 WAL**，不用回放整部歷史。

```
WAL 時序圖：
... [insert] [insert] [CHECKPOINT] [insert] [update] [CRASH]
                          ↑                              ↑
                  recovery 從這裡開始        到這裡為止全部 replay
```

### 比喻

> 你打麻將打了一整天，每個牌局結算先寫在小白板（WAL + buffer）。
> 等到吃飯休息（checkpoint）才把總帳謄到帳本（資料表檔案）。
> 隔天就算白板被擦掉，帳本還在；只要從上一次謄帳之後的牌局重新算就好。

---

## 6. Recovery Mode：為什麼變只讀？

### 流程

```
時間 0:  容器啟動 / 主機開機
時間 1:  Postgres 打開資料檔案 → 「上次有沒有乾淨關閉？」
時間 2:  讀 WAL 從 last checkpoint 開始
時間 3:  REDO：把已 commit 的 transaction 重做一次
         「ID=12345 的 INSERT 已 commit 但資料檔案沒寫到」→ 補寫
時間 4:  UNDO：把沒 commit 的 transaction 清掉
         「ID=12346 的 INSERT 開始了但 WAL 沒看到 COMMIT」→ 丟棄
時間 5:  到達 consistent state（所有資料一致了）
時間 6:  開放寫入
```

### 為什麼期間拒絕寫入

Step 2-5 期間：
- 資料表還在被修改（系統正在「補完」舊操作）
- 如果這時送一個新 INSERT 進來：
  - ID 可能跟某個正在被 UNDO 的撞號
  - 寫入位置可能被 REDO 覆蓋
  - WAL 順序錯亂 → 下次再 crash 救不回來
- 安全做法：**全部寫入請求一律拒絕**，只允許 `SELECT`

### Client 看到的訊息

```
FATAL: the database system is in recovery mode
```

= 「我還在整理東西，現在問什麼我都不答、給什麼我都不收，等我幾秒。」

### 直觀比喻

> 餐廳開門前 30 分鐘，店長還在補貨、廚師還在備料、地板還沒拖完。
> 客人這時敲門 → 「不好意思我們還沒準備好」。
> 不是不歡迎你，是現在進來會踩到剛拖的地。

幾秒鐘後 recovery 走完，門就開了。

### Hot Standby Mode

這個「只讀」狀態 Postgres 內部叫 **hot standby mode**——也是高可用主從架構中 standby 節點的常駐狀態。單機重啟時是短暫過渡。

---

## 7. 我們的 ingest 為什麼撞到 recovery

事件鏈：

```
ingest 跑 60 chunks 的大 batch →
  embedder CPU 全力推論 75 秒 →
    psycopg2 socket idle 75 秒 →
      Docker Desktop on Windows 的 NAT 層 reset 連線 →
        error 10053 (Software caused connection abort)

多次連線被 reset →
  Postgres 容器可能被 Docker Desktop OOM-kill 或自我重啟 →
    容器內 Postgres 重啟 → 進 recovery mode →
      我們的 retry 立刻撞上去 →
        FATAL: the database system is in recovery mode
```

### 修法回顧

短期：等幾秒 → DB recover 完 → 重跑 ingest（hash 機制讓已完成檔案被跳過）

中期（已實作）：`src/db.py` 的 `insert_chunks_batch()` 加 `try/except OperationalError` + reconnect

長期（沒做，因為只剩 3 個檔）：reconnect 失敗時 sleep 5 秒再試，專門處理 recovery mode window

---

## 8. 延伸閱讀

- 官方文件：[Postgres WAL Internals](https://www.postgresql.org/docs/current/wal-intro.html)
- 官方文件：[Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- 相關筆記：[../../docker/CONTAINER_PATH_AND_SHELL_EXPLANATION.md](../../docker/CONTAINER_PATH_AND_SHELL_EXPLANATION.md)
