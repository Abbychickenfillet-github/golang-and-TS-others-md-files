# `docker compose ps` 與 Unix `ps` 的關係

> 日期：2026-04-30
> 主題：解釋 `ps` 是什麼、`aux` 與 `-ef` 為什麼是這個含義

## TL;DR

- `ps` = **P**rocess **S**tatus（行程狀態），1970s Unix 的老指令
- Docker 把這個概念借去看 container：`docker ps` / `docker compose ps`
- `aux` 是 **BSD 風格** flags（不加 dash）
- `-ef` 是 **SysV / POSIX 風格** flags（加 dash）
- 兩種風格在 Linux 上都能用，因為 Linux 的 `ps` 同時支援

## 1. `ps` 的由來

`ps` 源自 1970s 的 AT&T Unix，縮寫直譯：

> **P**rocess **S**tatus = 行程狀態

它的工作就是「列出系統上正在跑的 process 是哪些、狀態如何」。

```bash
ps              # 列出當前 shell 的 process（最簡用法）
```

## 2. 為什麼有兩種 flag 風格？

Unix 在 1980s 分裂成兩派，`ps` 在兩派各自演化出不同 flag：

| 風格 | 來源 | 寫法特徵 | 範例 |
|------|------|---------|------|
| **BSD** | Berkeley 加州大學的 Unix 分支 | flag 不加 dash | `ps aux` |
| **SysV / POSIX** | AT&T 的 System V | flag 加 dash | `ps -ef` |

Linux 的 `ps`（procps-ng 套件）**兩種都支援**，所以你會看到工程師混用。

## 3. `ps aux` 的每個字母

`aux` = `a` + `u` + `x`，三個 BSD 風格 flag 黏在一起。

| Flag | 全名 | 作用 |
|------|------|------|
| **`a`** | **a**ll users with terminal | 顯示**所有使用者**的 process（不只自己的） |
| **`u`** | **u**ser-oriented format | 用「以使用者視角」的欄位格式（多顯示 USER、%CPU、%MEM、VSZ、RSS、START、TIME） |
| **`x`** | include processes without controlling **tty** | 包含**沒有控制終端**的 process（daemon、背景服務、init 出來的） |

### 為什麼 `u` 叫「user-oriented」

預設的 `ps` 只顯示 PID、TTY、TIME、CMD（很精簡）。
加 `u` 後，欄位改成「站在使用者角度想知道的資訊」：

```
USER  PID  %CPU  %MEM  VSZ  RSS  TTY  STAT  START  TIME  COMMAND
```

多了「**誰開的**（USER）、**吃多少 CPU/RAM**（%CPU、%MEM、VSZ、RSS）、**什麼時候開的**（START）」這些**使用者會關心的維度**——不是給核心開發者看的低階欄位。

### 為什麼 `x` 是「no TTY」

Unix process 有兩種：

1. **有 tty 的**：你開 terminal 跑的、有 keyboard/螢幕綁定（前景指令）
2. **沒有 tty 的**：daemon、systemd unit、cron job、init 出來的服務（背景服務）

預設 `ps` 只顯示「有 tty 的」（你眼前看得到的），加 `x` 才把**背景服務也撈進來**。

```bash
# 只看自己 shell 的（有 tty）
ps

# 看所有人、所有背景服務（包含 sshd、systemd 那些）
ps aux
```

### 為什麼這三個常黏在一起

`aux` 是工程師最常用的組合：「**所有使用者** + **詳細欄位** + **包含背景服務**」=「給我系統上的全貌」。

## 4. `ps -ef` 的每個字母

`-ef` = `-e` + `-f`，SysV 風格 flag。

| Flag | 全名 | 作用 |
|------|------|------|
| **`-e`** | **e**very process | 顯示**所有** process（等同 BSD 的 `ax` 合起來） |
| **`-f`** | **f**ull format | 用**完整格式**輸出（多欄位） |

### 為什麼 `-f` 叫「full format」

預設 `ps` 是「short format」：只有 PID、TTY、TIME、CMD 四欄。
加 `-f` 改成「full format」，欄位變成：

```
UID  PID  PPID  C  STIME  TTY  TIME  CMD
```

「**full**」的意思是「**比預設多一些通常會想看的欄位**」：
- **UID**：誰跑的
- **PPID**：parent process ID（誰生出來的）
- **C**：CPU 使用率
- **STIME**：啟動時間

注意：`-f` 不是「最詳細」，只是「比預設詳細」。要更詳細可以用 `-F`（extra full）。

### 為什麼 `-e` 是 every

`-e` 直譯就是 every（every process）。它做的事跟 BSD 的 `a` + `x` 加起來一樣：
- 不限使用者
- 包含沒 tty 的

## 5. `aux` vs `-ef` 對照

| 項目 | `ps aux`（BSD） | `ps -ef`（SysV/POSIX） |
|------|----------------|----------------------|
| 風格 | BSD | SysV / POSIX |
| 是否要 dash | ❌ 不要 | ✅ 要 |
| 顯示範圍 | 所有使用者 + 含背景 | 所有 process |
| 欄位 | USER、%CPU、%MEM、VSZ、RSS… | UID、PPID、C、STIME… |
| 顯示 PPID | ❌ 沒有 | ✅ 有（重要！） |
| 顯示 %CPU/%MEM | ✅ 有 | ❌ 沒有（要用 `-o` 自訂） |

### 怎麼選

| 你想看什麼 | 用哪個 |
|-----------|--------|
| 哪個 process 吃資源 | **`ps aux`**（有 %CPU、%MEM） |
| Process 父子關係 | **`ps -ef`**（有 PPID） |
| 兩個都要 | `ps -ef` 然後再 `ps aux \| grep` 或自訂 `-o` |

## 6. Docker Compose 借用的命名

Docker 把整套 Unix process management 詞彙搬去描述 container：

| Docker 指令 | 對應的 Unix 概念 |
|------------|----------------|
| `docker ps` / `docker compose ps` | `ps`（列 process → 列 container） |
| `docker exec` | `exec`（在現有環境執行指令） |
| `docker top` | `top`（看 container 內的 process） |
| `docker kill` | `kill`（送訊號） |
| `docker logs` | `tail` / `cat` log file |
| `docker stats` | `vmstat` / `iostat`（資源統計） |

### `docker compose ps` 常用 flags

```bash
docker compose ps                    # 列當前 compose project 的 container
docker compose ps -a                 # 包含已停止的
docker compose ps --services         # 只列服務名（不顯示 container 細節）
docker compose ps --format json      # JSON 輸出（給腳本用）
docker compose ps --status running   # 只看 running 狀態的
```

注意：`docker compose ps` 跟 `ps aux` / `ps -ef` 沒有完全對應的 flag——它有自己的設計，但**概念**繼承自 Unix `ps`：「列出正在跑的東西的狀態」。

## 7. 為什麼工程師要懂這個歷史

1. **看老教學不會懵**：論壇答案有人寫 `ps aux | grep nginx`、有人寫 `ps -ef | grep nginx`，知道兩個都對
2. **跨平台不踩雷**：macOS 用 BSD 風格、Linux 兩種都支援、AIX/Solaris 偏 SysV
3. **Docker 詞彙不再神秘**：`ps`、`exec`、`top` 這些都不是 Docker 發明的，是搬 Unix 慣用詞
4. **理解 container vs process 的概念連續性**：container 在 host 看就是一群 process，所以管理詞彙能直接借用

## 8. 一頁速查表

```bash
# === Unix process ===
ps                    # 自己的 process
ps aux                # BSD: 所有使用者 + 詳細 + 含背景
ps -ef                # SysV: 所有 process + full format
ps aux | grep nginx   # 找特定 process

# === Docker container ===
docker ps             # 跑中的 container
docker ps -a          # 全部（含停止的）
docker compose ps     # 當前 compose project 的 container
docker compose ps -a  # 包含已停止的
docker top <name>     # 看 container 內的 process（這時是真的 ps）
```

## 相關筆記
- [2025-11-25_docker-compose-guide.md](2025-11-25_docker-compose-guide.md)
- [DOCKER_COMPOSE_COMMAND_EXPLANATION架構.md](DOCKER_COMPOSE_COMMAND_EXPLANATION架構.md)
