# Docker 基礎觀念:引擎 / context / image vs container / dockerd

> 起點:「我要怎麼啟動 abby-notes-rag 的 docker?」
> 一路追問追出來的完整概念鏈。把這篇看完,Docker 在 Windows 上到底怎麼運作就通了。

---

## 0. 先講結論:abby-notes-rag 怎麼啟動

`docker-compose.yml` 裡只有**一個服務**:PostgreSQL(含 pgvector 向量擴充),給 RAG 存 embedding 用。

在專案根目錄 `C:\coding\futuresign\abby-notes-rag`:

```powershell
docker compose up -d        # 背景啟動(-d = detached)
docker compose ps           # 等 STATUS 出現 (healthy)
docker compose logs -f postgres   # 需要時看 log
docker compose down         # 停掉(資料保留在 ./data,不會刪) 為何要停掉既然不會刪  docker會佔記憶體200MB左右是MiB嗎？1024的倍數？為何這邊的指令都沒有--FLAG? 要先移除容器才能停到
```

重點:
- **資料持久化**:`volumes: ./data:/var/lib/postgresql/data`,`down` 不刪資料,下次 `up` 接續用。
- **前提**:Docker Desktop 要先開(工作列鯨魚圖示)。`docker version` 報錯 = Desktop 沒啟動。
- **`.env` 必須存在**:compose 用 `${POSTGRES_USER}` 等變數,從 `.env` 讀。
- **埠是 5433 不是 5432**:對外 `5433`,容器內才 `5432`。連線用 `localhost:5433`。

---

## 1. 「CLI 看得到、Docker Desktop 桌面卻空白」是怎麼回事?

### docker context(上下文)是什麼

`docker` 指令本身只是一支**遙控器**。它不存放容器,只是**連線去某台「Docker 引擎」下指令**。
`context` = 「這支遙控器現在對準哪一台引擎」。

一台 Windows 可能同時有多個引擎,各自開不同的「門」(named pipe):

| context 名稱 | DOCKER ENDPOINT(那扇門) | 對應引擎 |
|---|---|---|
| `default` | `npipe:////./pipe/docker_engine` | 純 CLI / 自己裝的 |
| `desktop-linux` ← 星號=目前用的 | `npipe:////./pipe/dockerDesktopLinuxEngine` | Docker Desktop |

**「context 不一致」**:CLI 對準 A 引擎,但 GUI 顯示 B 引擎 → CLI 看得到的容器 GUI 看不到。

```powershell
docker context ls       # 看有哪些 context、目前用哪個(星號)
docker context show     # 只印目前這個
```

### 但本案不是 context 問題

查出來 `desktop-linux *` 就是 Docker Desktop,CLI 跟 GUI **同一台引擎**。
所以桌面空白其實是 **GUI 顯示問題**,依序排查:

1. **Containers 分頁上方搜尋框有殘留文字** → 清空(最常見元兇)。
2. 看錯分頁 → 要點左側 **Containers**。
3. GUI 沒刷新 → 切分頁再切回 / 重整。
4. 還是空的 → 工作列鯨魚右鍵 **Quit Docker Desktop** 再開(不會動到容器,引擎和 GUI 是分開的)。

### 不靠 GUI 自己驗證

```powershell
docker ps                                    # 整台引擎所有「正在跑」的容器
docker ps -a                                 # 含已停止的
docker exec -it abby-rag-postgres pg_isready # 直接戳 postgres
```

---

## 2. 「為什麼只在 RAG 資料夾看到那個容器?」

關鍵:**容器掛在「引擎」上,不是掛在「資料夾」上。** 差別在你用哪個指令:

| 指令 | 範圍 |
|---|---|
| `docker compose ps` | **只看當前資料夾的 compose 專案** → 在 RAG 資料夾就只看到 `abby-rag-postgres` |
| `docker ps` | **整台引擎全部容器** → 會看到 redis-local 等其他專案的 |

你在哪個資料夾下指令,不影響容器在不在,只影響 `docker compose` 這類指令「願意顯示哪些」。

---

## 3. IMAGE vs CONTAINER vs 專案分組(三層不同東西)

`docker ps` 看到:`abby-rag-postgres` / image `pgvector/pgvector:pg17` / 埠 `5433` —— 跟 `docker-compose.yml` 完全對得上,**它就是、也只需要這一個容器**。

| 名詞 | 是什麼 | 比喻 | 本案的值 |
|---|---|---|---|
| **IMAGE(映像)** | 做好的**範本/藍圖**,從 Docker Hub 下載 | 遊戲光碟 / 安裝檔 | `pgvector/pgvector:pg17` |
| **CONTAINER(容器)** | 用藍圖**跑起來的執行實例** | 光碟裝好正在玩的那一局 | `abby-rag-postgres` |
| **Compose 專案分組** | GUI 按專案摺疊,專案名預設=**資料夾名** | 外層資料夾標籤 | `abby-notes-rag` |

> GUI 看到「abby-notes-rag」其實是**分組標籤(資料夾名)**,不是容器。點開它,裡面的 `abby-rag-postgres` 才是真正的容器。三層指的是同一條 RAG 資料庫。

### 為什麼藍圖是 pgvector 不是普通 postgres?

RAG 要「把文字轉成向量(embedding)→ 用語意相似度找最接近的筆記」。普通 PostgreSQL **不會做向量相似度搜尋**。
`pgvector` 是 PostgreSQL 的**外掛擴充**,加上:
- 新欄位型別 `vector`(存 1024 維,對應 `.env` 的 `EMBEDDING_DIM=1024`)
- 向量相似度查詢

image 名 `pgvector/pgvector:pg17` 的意思 = **「一份預先裝好 pgvector 擴充的 PostgreSQL 17」**:
- `pgvector/pgvector` = 發布者/映像名(Docker Hub 上的官方 pgvector image)
- `:pg17` = 標籤(tag),基底是 PostgreSQL 17

開箱即有向量搜尋,不用自己進普通 postgres 手動裝擴充。

---

## 4. 「引擎只是個背景程式」是什麼意思?名詞釐清

| 詞 | 白話 | 例子 |
|---|---|---|
| **程式 / 軟體 (program)** | 寫好的指令,存成**檔案**躺硬碟,沒跑時只是個檔 | `dockerd.exe` |
| **行程 (process)** | 程式被執行、載入記憶體、正在 CPU 上活著的實例。同程式可開多份 | 記憶體裡正在跑的 dockerd |
| **daemon(常駐程式/服務)** | 一種「開起來就一直待背景、不佔終端機、隨時等下指令」的行程 | Docker 引擎核心 |
| **引擎 (Docker Engine)** | 以 daemon 為核心的整套服務。講「引擎」≈ 講那個背景常駐 daemon | `desktop-linux` 後面那台 |

### ⭐ 最容易混淆:程式(program)vs 行程(process)

中文「程式」用得很鬆,有時指檔案、有時泛指「正在跑的東西」。英文分得很乾淨:

| | **程式 program** | **行程 process** |
|---|---|---|
| 是什麼 | 硬碟上的**檔案**(一堆指令) | 程式被**執行後**在記憶體裡**活著跑**的實例 |
| 死的/活的 | 死的(躺著不動) | 活的(佔 CPU/記憶體、會動) |
| 數量 | 一份檔案 | 同一程式可同時開**多個**行程 |
| 編號 | 沒有 | 有 **PID** |
| 生命週期 | 永遠躺著直到刪除 | 有開始→執行→結束 |
| 例子 | `dockerd.exe` 檔案 | `ps` 抓到的 `PID 202 dockerd` |

**比喻**:食譜=程式(放抽屜不會動);照食譜煮菜=行程(動起來、有始有終);同一張食譜兩個廚師各煮一份=一個 program 多個 process。
→ **程式是「劇本」,行程是「正在上演的那場戲」。**

**daemon 是哪個?** 嚴格講是**行程(process)**,因為它是「活的、正在跑」的。口語叫它「常駐程式」是把「程式」當「跑起來的程式」鬆散使用 —— 這就是容易混淆的點。精準說:

> **daemon = 一種「跑起來就不自己結束、常駐背景」的行程。**
> 它的特別不在「是程式還是行程」,而在**行為**:別的行程做完就結束,daemon 做完不下班、一直待命。

```
dockerd.exe(程式/檔案,死的)
   │ 被執行
   ▼
正在跑的 dockerd(行程/process,活的,PID 202)
   │ 而且它「不結束、常駐背景」
   ▼
這種常駐行程 = daemon   ← daemon 不是第三種東西,就是「一種行程」
```

### engine = daemon = detached?

- **engine ≈ daemon** ✅ 基本成立(嚴格說 Engine = daemon `dockerd` + API + CLI,但核心就是 daemon)。
- **daemon = detached?** 概念相通**但別劃等號**:daemon 是「背景常駐服務」這個**身分**;detached 是「脫離終端機、在背景跑」這個**狀態**。
- ⚠️ `detached` 在 Docker 出現在**兩個層級**,別混:
  - daemon 在背景常駐 = **引擎** detached 在背景跑
  - `docker run -d`(-d=detached)= 讓**容器** detached 在背景跑

### 為什麼一台電腦能有多個引擎?

**「Docker 引擎」就是一種程式;同一種程式,一台電腦可以裝/跑好幾份 → 多個引擎。**

```
一台電腦(硬體)
 └─ 程式 dockerd(檔案)── 執行 ──▶ 行程(daemon,背景常駐)= 一個「引擎」
                                     └─ 同台可再跑第二份 dockerd = 第二個「引擎」
                                          (各開不同的門;context 記住名字→哪扇門)
```

- **「一個程式」≠「一台電腦」**:電腦是硬體,程式是軟體;一台電腦能跑無數程式。
- 類比:**記事本是一個程式,你可以同時開 3 個視窗(3 個行程)**。Docker 引擎也一樣。
- 常見變多引擎的情境:裝 Docker Desktop 又在 WSL 的 Ubuntu 裡 `apt install docker`;用過 Minikube / Rancher Desktop / Podman;連遠端伺服器的 docker。

---

## 5. Windows 上的 dockerd 檔案到底在哪?(實查結果)

這台機器上其實有**兩個 dockerd**:

| dockerd | 路徑 | 角色 |
|---|---|---|
| Windows 版 | `C:\Program Files\Docker\Docker\resources\dockerd.exe`(約 74MB) | Windows 容器用(目前沒在用) |
| **Linux 版** | `/usr/local/bin/dockerd`(在 WSL2 的 `docker-desktop` distro 裡) | ✅ **真正在跑、服務 abby-rag-postgres 的引擎** |

CLI 遙控器:`C:\Program Files\Docker\Docker\resources\bin\docker.exe`(約 43MB)

### 為什麼真正的引擎在 WSL2 裡?

Docker 引擎原生是 **Linux 程式**。Windows 沒 Linux 核心,所以靠 **WSL2**(Windows 裡的輕量 Linux 子系統)在背後跑一個 Linux,引擎裝在那個 Linux 裡。
Docker Desktop 偷偷開了一個叫 `docker-desktop` 的迷你 Linux distro,Linux 版 `dockerd` 在裡面常駐:

```powershell
wsl -l -v          # 看 WSL distro(會看到 docker-desktop Running)
wsl -d docker-desktop sh -c 'ps aux | grep dockerd | grep -v grep'
# → PID xxx /usr/local/bin/dockerd --config-file ... 這行就是引擎本尊
```

WSL2 可以有多個 distro,每個都能各裝一份引擎 —— 這就是「一台電腦多引擎」最常見的來源。

---

## 6. 每個人的 dockerd.exe 內容都一樣嗎?

**同版本 + 同 CPU 架構 → 內容一模一樣(每個位元組都相同)。** 它不是為你客製,是官方**編譯好、公開發布的同一份檔**。

| 因素 | 一樣嗎 |
|---|---|
| 同 Docker 版本、同 Windows x86-64 | ✅ 位元組完全相同 |
| 不同版本(4.30 vs 4.40) | ❌ |
| 不同 CPU 架構(x86-64 vs ARM64) | ❌(要編成不同機器碼) |

驗證 = 算**檔案指紋(SHA256 hash)**,同檔案指紋必相同;官網也會公佈讓你核對沒被竄改。

```powershell
Get-FileHash 'C:\Program Files\Docker\Docker\resources\dockerd.exe' -Algorithm SHA256
docker version --format '{{.Server.Version}}'
```

本機實測(Docker Engine **28.5.1**):
```
SHA256: D5111085DBE2609250D53ED988C2A519295D29050724633C79D16ECC425CB39B
```
→ 任何人只要也是 Windows x64 + Engine 28.5.1,算出來會跟這串一字不差。

### 核心觀念:程式是共用的,你的資料是專屬的

| | 人人相同? | 為什麼 |
|---|---|---|
| **程式**:`dockerd.exe` / `docker.exe` / pgvector image | ✅ 同版本人人相同 | 官方量產、公開發布 |
| **你的資料**:`./data`、`abby-rag-postgres` 容器、`.env` | ❌ 獨一無二 | 程式跑起來後裝進去的你個人內容 |

> 比喻:`dockerd.exe` 像**量產微波爐**(同型號內部都一樣);pgvector image 像**食譜光碟**(拷貝相同);但**微波爐裡正在加熱的那盤菜(容器 + ./data 向量資料)是你專屬的**。

---

## 7. 為什麼打開 `dockerd.exe` 是 terminal(黑色主控台)的樣子?

核心:**它是「主控台程式(console application)」,不是「視窗程式(GUI)」。** 天生只有文字介面。

### 安全示範(不啟動 daemon,只印版本/說明)

> ⚠️ 不要直接雙擊執行 `dockerd.exe`!那會嘗試啟動第二個引擎,可能跟現有 Docker Desktop 衝突。
> 只印資訊用 `--version` / `--help` 才安全:

```text
> & 'C:\Program Files\Docker\Docker\resources\dockerd.exe' --version
Docker version 28.5.1, build f8215cc

> & 'C:\Program Files\Docker\Docker\resources\dockerd.exe' --help
Usage:  dockerd [OPTIONS]

A self-sufficient runtime for containers.    ← 「容器的執行時環境」= 背景伺服器

Options:
      --authorization-plugin list   Authorization plugins to load
  -b, --bridge string               Attach containers to a virtual switch
      --config-file string          Daemon configuration file
      --containerd string           containerd grpc address
      --data-root string            Root directory of persistent Docker state
                                    (default "C:\\ProgramData\\docker")
  -D, --debug                       Enable debug mode
  ...
```

↑ 這段文字就是 `dockerd.exe` 在 terminal 裡的真實長相(用文字代替截圖,因為不該真的啟動它)。

### 為什麼是文字主控台,不是視窗?

1. **它的身分是「伺服器 / daemon」**:工作是背景常駐、聽指令、把運作過程當文字 log 印出來。對外靠「門」(named pipe)和 `docker` CLI 溝通,全程文字,不需要按鈕 → 沒做 GUI。
2. **Windows 程式編譯時要選「子系統」**:
   - GUI 子系統 → 有視窗、按鈕(例 `Docker Desktop.exe` 鯨魚儀表板)
   - Console 子系統 → 黑色文字主控台(`dockerd.exe` 是這種)
3. **雙擊 console 程式時**,Windows 自動配一個主控台宿主(conhost)黑視窗來顯示它的文字 → 那個「黑黑的 terminal」就是這樣來的。不是「terminal 裡的程式」,而是「它自己需要一個 terminal 來顯示」。

### 三個檔案對照

| 檔案 | 子系統 | 打開長相 | 角色 |
|---|---|---|---|
| `dockerd.exe` | Console | 黑色文字主控台 | 引擎本體(背景幹活、印 log) |
| `docker.exe` | Console | 文字(在你的 PowerShell 裡) | 遙控器 CLI |
| `Docker Desktop.exe` | GUI | 鯨魚儀表板視窗 | 蓋在引擎上的友善介面 |

> 分工:**`dockerd.exe` 幹活(文字伺服器),`Docker Desktop.exe` 給你好看的畫面**。
> 你點的鯨魚,背後是在替你對 dockerd 下文字指令。

---

## 8. PowerShell:為什麼執行 exe 要用 `&` 開頭?

### 踩到的錯誤
```powershell
'C:\Program Files\Docker\Docker\resources\dockerd.exe' --help
# ParserError: 運算式或陳述式中有未預期的 'help' 語彙基元
```

原因:**PowerShell 看到一行開頭是引號,會把它當「字串值(資料)」,不是「要執行的指令」。**
就像打 `'你好'` 只會把字串回給你。前面是字串,後面又冒出 `--help` → 看不懂 → 報錯。

### 解法:`&` call operator(呼叫運算子)
`&` 的意思 =「把後面這個字串/變數,當成一支程式去**執行**」。

```powershell
& 'C:\Program Files\Docker\Docker\resources\dockerd.exe' --help
```

為什麼路徑非得加引號?因為有**空格**(`Program Files`)。沒引號 PowerShell 會把空格當分隔,以為要跑 `C:\Program`。
而一加引號就變字串 → 所以要 `&` 才會執行。兩件事綁一起:

| 情況 | 要不要 `&` |
|---|---|
| 路徑沒空格、不用引號 | 不用:`C:\tools\dockerd.exe --help` |
| 路徑有空格、要引號 | **要**:`& '...\dockerd.exe' --help` |
| 路徑存在變數 `$app` | **要**:`& $app --help` |

> 記法:**只要程式路徑是被「引號」或「變數」包起來的,前面就要加 `&` 才會真的執行。**

---

## 9. 為什麼 dockerd 寫「A self-sufficient runtime for containers」?

這是 **dockerd 開發者寫的「一句話自我介紹」**,印在 `--help` 最上面。逐字拆:

- **runtime(執行時環境)**:指「實際讓容器跑起來的那層環境/引擎」。容器要能動,需要有東西負責建立、啟動、管理 —— 那就是 runtime。dockerd 就是這角色。
- **self-sufficient(自給自足)**:它本身就備齊跑容器需要的一切,不必再外掛一堆別的東西。跑起來自己就能完成「拉 image、建容器、管網路、管儲存」整套。
- 合起來:**「一個自給自足、能獨立把容器跑起來的執行環境」** = dockerd 的自我定位。

> 它是文案/描述字串,不是程式邏輯。每支軟體 `--help` 開頭都會有這種一句話簡介。

---

## 10. `dockerd --help`(引擎開機設定)vs `docker --help`(你能用的指令)

跑 `dockerd --help` 看到的全是 `--開頭的 OPTIONS`(像 `--data-root`、`--log-level`),那是**「啟動引擎那一刻,設定引擎怎麼跑」的旋鈕**,不是你日常打的指令。Docker Desktop 已經幫你把引擎連同這些設定啟動好,平常**幾乎用不到**。

想看「我 CLI 能用什麼」→ 改打 **`docker --help`**,它列的是 COMMAND(`ps`/`run`/`compose`/`exec`…),才是你天天用的。

| | `dockerd` | `docker` |
|---|---|---|
| 身分 | 引擎(伺服器)本體 | 遙控器(CLI) |
| 用法格式 | `dockerd [OPTIONS]` | `docker [OPTIONS] **COMMAND**` |
| 後面接什麼 | 只接 `--旗標`(開機設定) | 接**指令**(`ps`/`run`/`compose`…) |
| 你會常打嗎 | ❌ 幾乎不(Desktop 幫你開好) | ✅ 天天打 |

詳細選項逐條白話翻譯 + 可畫螢光筆的版本見:[[dockerd-選項清單-我的困惑筆記]]

### dockerd 的指令也能從 CLI 執行嗎?

**能執行 ≠ 該日常使用。** dockerd 是支 `.exe`,你當然叫得動(`& '...\dockerd.exe' --help` 就成功了),但它後面的旗標是「**用這設定啟動引擎**」,不是「做一件事就結束」:

| 打法 | 結果 | 安全? |
|---|---|---|
| `dockerd --help` / `--version` / `--validate` | 印完就退出 | ✅ |
| `dockerd`(不加旗標) | 真的去啟動一個引擎 → 跟 Desktop 的引擎**打架** | ❌ |
| `dockerd --data-root ...` 等 | 試圖用該設定啟動第二個引擎 | ❌ |

> **dockerd 是「引擎啟動器」,不是「做事工具」。** 在 Docker Desktop 環境下,引擎交給 Desktop 管;你做事一律用 `docker xxx` CLI 指令。

---

## 問題紀錄(這串對話的提問清單)

依提問順序,方便日後回顧「我當初卡在哪」:

1. 我要怎麼啟動本地專案 abby-notes-rag 的 docker？ → §0
2. 我桌面的 Docker 容器是空的、沒有 container？ → §1(GUI 顯示問題,非容器不存在)
3. 什麼叫 docker context 不一致?為何只能在 RAG 看到? → §1、§2
4. 為何一台電腦可以對多個引擎? → §4
5. pgvector 是不是我為 abby-notes-rag 要啟動的?為何有個 image 叫 `pgvector/pgvector:pg17`?為何 GUI 有個叫 abby-notes-rag 的? → §3
6. 「Docker 引擎只是背景跑的程式」是什麼意思?engine=daemon=detached?「一個程式」是什麼?一個程式=一台電腦嗎? → §4
7. 我電腦有 dockerd 檔案嗎?路徑?每個人的 dockerd.exe 內容都一樣嗎? → §5、§6
8. 為何打開 dockerd.exe 是 terminal 的樣子? → §7
9. 為什麼執行指令要用 `&` 開頭?(PowerShell 報錯) → §8
10. 為什麼寫「A self-sufficient runtime for containers」? → §9

---

## 速查表

```powershell
# 引擎 / context
docker context ls / docker context show     # 遙控器對準哪台引擎
docker version                              # 引擎沒開會報錯

# 看容器
docker ps / docker ps -a                    # 整台引擎(全部 / 含停止)
docker compose ps                           # 只看當前資料夾的 compose 專案

# 啟動 abby-notes-rag
docker compose up -d                        # 啟動
docker compose down                         # 停(資料保留在 ./data)
docker exec -it abby-rag-postgres pg_isready

# 找 dockerd / 算指紋
wsl -l -v                                   # WSL distro(引擎住的地方)
Get-FileHash '...\dockerd.exe' -Algorithm SHA256
```

---

## 相關 Gemini 對話來源
- 「Docker 遙控器與多引擎概念」(2026-06,語音問答版,內容與本篇重疊) — https://gemini.google.com/app/84b4d10237c418e7
  - 重點同本篇:伺服器=實際跑 Docker 引擎的主機(遙控器對準的「電視」);下載 Docker 預設建立一個本機引擎,之後可用 context 連到遠端引擎;連遠端需網路(SSH / 加密 TCP);dockerd.exe 位於 `C:\Program Files\Docker\Docker\resources`。
