# 本次對話用到的所有指令(中英對照)

> 英文 = 官方 `--help` 原文;中文 = 白話翻譯。
> 相關概念見:[[docker-引擎-context-image-container-觀念]]、[[dockerd-選項清單-我的困惑筆記]]

---

## 🅰️ dockerd 指令(引擎本體 / server 端)

> 用 `& '...\dockerd.exe'` 開頭執行(路徑有空格 → 要 `&` + 引號)。
> ⚠️ 只有印完就退出的才安全;不加旗標會啟動引擎跟 Desktop 打架。

| 指令 | 英文原文(--help) | 白話翻譯 | 安全? |
|---|---|---|---|
| `& '...\dockerd.exe' --version` | `Print version information and quit` | 印引擎版本後退出 | ✅ |
| `& '...\dockerd.exe' --help` | `Print usage` | 印引擎開機選項說明 | ✅ |

完整 40+ 開機旗標見 [[dockerd-選項清單-我的困惑筆記]]。

---

## 🅱️ docker 指令(client 端 CLI)

> 格式:`docker [OPTIONS] COMMAND`。英文取自 `docker --help`。

| 指令 | 英文原文 | 白話翻譯 |
|---|---|---|
| `docker version` | `Show the Docker version information` | 看 client + 引擎版本 |
| `docker --help` | `Show help` / `Usage: docker [OPTIONS] COMMAND` | 看 CLI 有哪些指令 |
| `docker context ls` | `List contexts` | 列出所有 context(遙控器對準哪台引擎) |
| `docker context show` | `Print the name of the current context` | 只印目前用的 context |
| `docker ps` | `List containers` | 列出**正在跑**的容器 |
| `docker ps -a` | `List containers` (+ `-a`) | 列出**所有**容器(含已停止) |
| `docker exec` | `Execute a command in a running container` | 在跑著的容器內執行指令 |
| `docker compose ps` | `List containers` (compose 範圍) | 只列當前資料夾專案的容器 |
| `docker compose up` | `Create and start containers` | 建立並啟動專案容器 |
| `docker compose down` | `Stop and remove containers, networks` | 停止並移除容器/網路(volume 預設保留) |
| `docker compose logs` | `View output from containers` | 看容器輸出的 log |

### 本次出現的完整指令原句

```powershell
docker version --format '{{.Server.Version}}'
docker --help
docker context ls
docker context show
docker ps
docker ps -a
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker compose ps
docker compose up -d
docker compose down
docker compose logs -f postgres
docker exec -it abby-rag-postgres pg_isready
```

---

## 🚩 用到的 FLAG(中英對照)

| flag | 英文全名 | 英文原文(--help) | 白話翻譯 |
|---|---|---|---|
| `-d` | detached | `Detached mode: Run containers in the background` | 背景跑,不佔終端機 |
| `-a` | all | `Show all containers (default shows just running)` | 顯示全部(含已停止) |
| `-f` | follow(logs) | `Follow log output` | log 持續跟看(不退出) |
| `-f` | force(rm/rmi) | `Force the removal of a running container / image` | 強制移除(連在跑的也砍) |
| `-i` | interactive | `Keep STDIN open even if not attached` | 保持輸入互動 |
| `-t` | tty | `Allocate a pseudo-TTY` | 配一個假終端機 |
| `-it` | interactive + tty | (上兩者合寫) | 像「進到容器裡開一個終端機」 |
| `--format` | — | `Format output using a custom template` | 用 Go 樣板自訂輸出欄位 |
| `--help` | — | `Print usage` / `Show help` | 印說明 |
| `--version` | — | `Print version information and quit` | 印版本 |

> `--format '{{.Server.Version}}'` 裡的 `{{...}}` 是 **Go template** 語法,挑出物件的某個欄位來印。
> `table {{.Names}}\t{{.Status}}` 的 `table` 開頭 = 排成表格,`\t` = 欄位間用 tab 分隔。

---

## 📌 一句話分辨

| | `dockerd` | `docker` |
|---|---|---|
| 身分 | 引擎(伺服器)本體 | 遙控器(CLI) |
| 格式 | `dockerd [OPTIONS]` | `docker [OPTIONS] COMMAND` |
| 後面接 | 只接 `--旗標`(開機設定) | 接**指令**(`ps`/`run`/`compose`…) |
| 你會常打嗎 | ❌ 幾乎不 | ✅ 天天打 |
