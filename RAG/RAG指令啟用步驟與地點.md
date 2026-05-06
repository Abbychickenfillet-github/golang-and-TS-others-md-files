# RAG 指令啟用步驟與地點 — 三層 prompt 速查

> **這份筆記回答**：
> 1. RAG 學習過程會看到三種 prompt（PowerShell / 容器 bash / psql），分別是什麼？
> 2. 每個 prompt 能打什麼指令？
> 3. Docker Desktop 該怎麼操作才不會繞遠路？
> 4. 從零開始進入 pgvector 資料庫的「最短路徑」是什麼？
>
> **建立日期**：2026-05-05

---

## 0. 一張圖看懂三層 prompt

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Windows PowerShell（host 主機）                     │
│ PS C:\coding\futuresign>                                    │
│                                                             │
│ ✅ docker、git、node、npm、psql（如有裝）                    │
│ ❌ \dt、\dx、\c（這些是 psql 的）                           │
│                                                             │
│ │  指令：docker exec -it pgvector-test bash                  │
│ ▼                                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Layer 2: Container bash（容器內 Linux shell）            │ │
│ │ root@6a01995c60dc / [pgvector-test]                     │ │
│ │ docker >  或  root@xxx:/#                               │ │
│ │                                                         │ │
│ │ ✅ ls、cat、psql、apt（容器有的 Linux 工具）             │ │
│ │ ❌ docker（容器內沒裝 docker）                          │ │
│ │ ❌ \dt、\dx（這些是 psql 的）                           │ │
│ │                                                         │ │
│ │ │  指令：psql -U postgres -d test_rag                   │ │
│ │ ▼                                                       │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Layer 3: psql                                       │ │ │
│ │ │ test_rag=#                                          │ │ │
│ │ │                                                     │ │ │
│ │ │ ✅ \dt、\dx、\c、SELECT、INSERT、CREATE EXTENSION  │ │ │
│ │ │ ❌ ls、cat、docker（這些是 shell 的）              │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. 三層 prompt 對照表

### Prompt 樣貌速查

| Prompt 樣貌 | 你在哪 |
|------------|-------|
| `PS C:\...>` | **Layer 1**：Windows PowerShell |
| `C:\...>` | **Layer 1**：Windows CMD |
| `$` 或 `~ %` | **Layer 1**：Mac/Linux bash 或 zsh（在主機）|
| `root@xxxxx:/#` 或 `docker >` | **Layer 2**：容器內 bash |
| `postgres=#` | **Layer 3**：psql 連到 `postgres` DB |
| `test_rag=#` | **Layer 3**：psql 連到 `test_rag` DB ★ |
| `postgres-#` 或 `test_rag-#` | Layer 3：SQL 沒結束（缺 `;`）|

### 各層能用 / 不能用

| | Layer 1: PowerShell | Layer 2: 容器 bash | Layer 3: psql |
|---|---|---|---|
| `docker xxx` | ✅ | ❌ no docker | ❌ |
| `git xxx` | ✅ | ❌ usually | ❌ |
| `psql xxx` | ⚠️ 看本機有沒有裝 | ✅ | ❌ 已經在裡面 |
| `ls`、`cat` | ⚠️（PowerShell 風格不同）| ✅ | ❌ |
| `\dt`、`\dx`、`\c` | ❌ | ❌ | ✅ |
| `SELECT * FROM ...` | ❌ | ❌ | ✅ |
| `\q`（離開 psql）| - | - | ✅ |
| `exit` 或 Ctrl+D | 關掉 PowerShell | 回 Layer 1 | ❌（用 \q 才對）|

---

## 2. 三層之間怎麼移動？

```
PowerShell（Layer 1）
        │
        │  docker exec -it pgvector-test bash       ↓ 進
        ▼
容器 bash（Layer 2）
        │
        │  psql -U postgres -d test_rag             ↓ 進
        ▼
psql（Layer 3）
        │
        │  \q                                       ↑ 退
        ▼
容器 bash（Layer 2）
        │
        │  exit 或 Ctrl+D                           ↑ 退
        ▼
PowerShell（Layer 1）
```

### ⚠️ 跳兩層的捷徑（推薦）

從 Layer 1 直接到 Layer 3，**跳過 Layer 2**：

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

→ 一行直接看到 `test_rag=#`，**省掉 bash 那層**。

---

## 3. Docker Desktop 該怎麼操作？

### ❌ 不推薦：點 Docker Desktop 的 GUI 按鈕

Docker Desktop 上有：
- 點容器 → **Exec** 按鈕 → 開出鯨魚 ASCII art 的 **debug shell**（= 容器內 bash）
- 等同 `docker exec -it pgvector-test bash`

→ **多繞了 Layer 2 那層**，還要再打 `psql -U postgres -d test_rag` 才到 Layer 3。

### ✅ 推薦：開 PowerShell + 一行指令

```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

→ **直接從 Layer 1 跳到 Layer 3**，最快。

### Docker Desktop 啥時該打開？

| 動作 | 用 Docker Desktop GUI | 用 PowerShell 指令 |
|------|--------------------|-------------------|
| 啟動 Docker 引擎 | ✅ 必須（雙擊圖示）| - |
| 看容器在不在跑 | ⭕ GUI 看 | ✅ `docker ps` |
| 看容器 log | ⭕ GUI 看 | ✅ `docker logs pgvector-test` |
| 啟動 / 停止容器 | ⭕ GUI 點 | ✅ `docker start/stop pgvector-test` |
| 進去容器跑指令 | ❌ 不推薦（GUI 會帶你進 bash）| ✅ `docker exec` |

→ Docker Desktop **主要功能就是「啟動 Docker 引擎」**（讓 docker 指令能用）。日常操作都在 PowerShell 打指令更快。

---

## 4. 從零開始的最短流程（每天開始學 RAG 都這樣做）

```
1. 確認 Docker Desktop 在跑
   ─────────────
   檢查工作列右下有沒有鯨魚圖示
   沒有 → 從開始選單啟動 Docker Desktop（等 30 秒讓它就緒）

2. 開 PowerShell
   ─────────────

3. 確認容器在跑
   ─────────────
   PS> docker ps
   應該看到 pgvector-test  Up XX minutes

   如果沒看到 → docker start pgvector-test

4. 直接進 psql 連 test_rag
   ─────────────
   PS> docker exec -it pgvector-test psql -U postgres -d test_rag

   看到 test_rag=#  → ✅ 開幹

5. 玩 SQL
   ─────────────
   test_rag=# \dt
   test_rag=# SELECT * FROM items;
   test_rag=# CREATE TABLE ...

6. 結束時
   ─────────────
   test_rag=# \q       ← 離開 psql
   PS> docker stop pgvector-test  ← 可選：停掉容器（資料還在 volume）
```

---

## 5. 完整逐字拆解 `docker exec -it pgvector-test psql -U postgres -d test_rag`

```
docker exec  -it  pgvector-test  psql  -U postgres  -d test_rag
   ▲          ▲       ▲           ▲       ▲           ▲
   │          │       │           │       │           │
   1          2       3           4       5           6
```

| 位置 | 內容 | 屬於哪個指令 | 意思 |
|------|------|------------|------|
| 1 | `docker exec` | docker | **在「已執行」的容器內跑指令**（不是建容器！） |
| 2 | `-it` | docker | **i**nteractive + **t**ty（互動式 + 終端機）|
| 3 | `pgvector-test` | docker | 哪個容器 |
| 4 | `psql` | docker（指它執行的程式）| 容器內要跑的指令 = psql 客戶端 |
| 5 | `-U postgres` | **psql** | **U**ser = postgres |
| 6 | `-d test_rag` | **psql** | **d**atabase = test_rag ⚠️ 不是 detached！|

### ⚠️ `-d` 在 docker 跟 psql 意思完全不同！

| 旗標位置 | 意思 |
|---------|------|
| `docker run -d` | **d**etached（背景執行）|
| `psql -d xxx` | **d**atabase（指定資料庫）|

→ `-it` 跟 `-d`（detached）幾乎不會一起用——一個要前景互動、一個要背景。

### `docker run` vs `docker exec` 不要搞混

| | `docker run` | `docker exec` |
|---|------------|--------------|
| 動作 | **建一個新容器**並啟動 | **在已執行的容器內**跑指令 |
| 第一次 | ✅ 用這個 | ❌ 容器還沒建 |
| 之後互動 | ❌ 會建第二個容器 | ✅ 用這個進去 |

### 正確中文翻譯

> 「**在已執行中的 pgvector-test 容器內**，以**互動式終端機**，用 **postgres 使用者**執行 **psql 客戶端**，**連線到 test_rag 這個資料庫**。」

---

## 6. 常見錯誤對照

### 錯誤 1：在 psql 裡打 docker 指令

```sql
test_rag=# docker logs pgvector-test
ERROR: syntax error at or near "docker"
```

**原因**：你在 Layer 3（psql），psql 只認 SQL 跟 `\` 開頭的 meta-command。
**解法**：先 `\q` 退出到 Layer 1 再打 docker 指令。

### 錯誤 2：在容器 bash 打 psql 指令

```bash
docker > \dx
bash: dx: command not found
```

**原因**：你在 Layer 2（bash），`\dx` 是 psql 的 meta-command。
**解法**：先 `psql -U postgres -d test_rag` 進到 Layer 3。

### 錯誤 3：在容器 bash 打 docker

```bash
docker > docker ps
bash: docker: command not found
```

**原因**：容器內沒裝 docker。
**解法**：`exit` 退出到 Layer 1（PowerShell）才能打 docker。

### 錯誤 4：在 psql 裡再打 psql

```sql
postgres=# psql -U postgres -d test_rag
postgres-#                                ← 進入 SQL 多行模式（dash 不是等號）
```

**原因**：psql 是 shell 程式，不能在 psql 裡再呼叫自己。
**解法**：在 psql 裡切 DB 用 `\c test_rag`，不要打 `psql -U ...`。

### 錯誤 5：連 psql 但密碼錯

```
psql -U postgres
Password: mysecret    ← 失敗！
```

**原因**：沒指定 `-h localhost -p 5433`，預設連到本地 Postgres（密碼是 `abc123`，不是 `mysecret`）。
**解法**：
```powershell
psql -h localhost -p 5433 -U postgres -d test_rag
```
**或乾脆用** `docker exec`（不會問密碼）：
```powershell
docker exec -it pgvector-test psql -U postgres -d test_rag
```

---

## 7. psql 裝在哪？每個 docker 都有嗎？

### 不是每個 image 都有 psql

| Image | psql？ |
|-------|-------|
| `pgvector/pgvector:pg17` | ✅ |
| `postgres:17` | ✅ |
| `redis:7` | ❌（用 redis-cli）|
| `nginx` | ❌ |
| `node:20` | ❌ |
| `python:3.11` | ❌ |

→ **看 image 是什麼**。pgvector image 因為基於 postgres image，所以有 psql。

### psql 在容器內的位置

```bash
# 在容器內驗證
which psql
# /usr/bin/psql
```

**不在 user home directory**——是 Linux **系統二進位檔目錄**：
- `/usr/bin/psql` ← 最常見
- `/usr/lib/postgresql/17/bin/psql`
- `/usr/local/bin/psql`

> ⚠️ Linux 慣例：**程式系統級、資料使用者級**。
> - 程式（psql、ls、bash）→ `/usr/bin/`
> - 使用者資料（你的檔案）→ `/root/` 或 `/home/abby/`
>
> 跟 Windows「軟體常裝在 C:\Program Files」的習慣不一樣。

---

## 8. 速記卡

```
看 prompt 一秒判斷自己在哪：

PS C:\...>           → Layer 1 PowerShell  → 用 docker、git
docker > 或 root@xx# → Layer 2 容器 bash    → 用 psql、ls
test_rag=#           → Layer 3 psql        → 用 \dt、SELECT

從 Layer 1 一行直達 Layer 3：
  docker exec -it pgvector-test psql -U postgres -d test_rag

依序退出：
  Layer 3 → \q     → Layer 2
  Layer 2 → exit   → Layer 1
```

---

## 相關筆記

- [pgvector-setup-guide.md](pgvector-setup-guide.md) — 完整 setup 步驟（這份是它的「快速速查版」）
- [../CLI/cli-flag-meaning-conflicts.md](../CLI/cli-flag-meaning-conflicts.md) — 同字母在不同指令意思不同（`-d`、`-i` 都在）
- [../CLI/environment-variables-basics.md](../CLI/environment-variables-basics.md) — 環境變數基礎
- [../CLI/grep-options.md](../CLI/grep-options.md)、[../CLI/ls-options.md](../CLI/ls-options.md) — 旗標縮寫
