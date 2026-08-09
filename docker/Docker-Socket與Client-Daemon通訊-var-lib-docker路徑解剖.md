---
title: Docker Socket 與 Client-Daemon 通訊—順便解剖 /var/lib/docker 路徑
type: topic-note
source: Gemini
tags: [gemini, docker, socket, unix-socket, daemon, dockerd, fhs, volume, linux]
sources:
  - https://gemini.google.com/app/557471f26b6cf7d4
updated: 2026-08-08
---

# Docker Socket 與 Client-Daemon 通訊—順便解剖 /var/lib/docker 路徑

> 🔖 本篇重點索引：a–r，共 18 個。

## 重點整理

### 一、Socket 是什麼

**(a)** <mark style="background: #ADCCFFA6;">Socket（插座／通訊端點）定義</mark>：在電腦網路與<mark style="background: #FFF3A3A6;">行程間通訊（IPC，Inter-Process Communication）</mark>中，Socket 是應用程式之間進行雙向資料傳輸的「端點」。它是一個抽象的收發窗口，不是一段資料。

**(b)** <mark style="background: #BBFABBA6;">兩個好記的類比</mark>：

- 硬體類比：牆上的插座與插頭——插上去，電力（資料）就能流動。
- 軟體類比：一個檔案路徑，或一組 IP＋Port。程式 A 往這裡寫，程式 B 就能從這裡讀。

**(c)** <mark style="background: #ADCCFFA6;">Unix Domain Socket（UDS，Unix 網域通訊端）</mark>：Docker 在 Linux 上的<mark style="background: #FFF3A3A6;">預設</mark>通訊方式，路徑是 `/var/run/docker.sock`。三個關鍵特性——

- 它<mark style="background: #FF5582A6;">不是網路協定，而是一個特殊的檔案</mark>（用 `ls -l` 看，檔案類型是 `s`）。
- 僅限<mark style="background: #FFF3A3A6;">同一台機器</mark>上的不同行程（Process）互通。
- 效能極高，因為不需要經過 TCP/IP 協定堆疊的封裝與解封裝。

**(d)** <mark style="background: #FF5582A6;">UDS 的安全模型＝檔案權限</mark>：因為它就是一個檔案，誰能存取 Docker 完全由這個檔案的擁有者與群組決定。<mark style="background: #FFF3A3A6;">這就是為什麼你要嘛加 `sudo`，要嘛把自己加進 `docker` 群組</mark>。

**(e)** <mark style="background: #FF5582A6;">⚠️ 把 docker.sock 掛進容器＝把 root 權限送出去</mark>：常見寫法 `-v /var/run/docker.sock:/var/run/docker.sock`（例如 Portainer、CI runner）等於讓容器內的程式可以任意操控主機的 Docker Daemon，包含起一個掛載主機根目錄的特權容器。<mark style="background: #BBFABBA6;">這在安全上等同交出主機 root，只在完全信任的映像檔上才這樣做</mark>。

**(f)** <mark style="background: #ADCCFFA6;">TCP Socket（Remote API）</mark>：需要<mark style="background: #FFF3A3A6;">遠端操控</mark>另一台伺服器的 Docker 時使用，形式是 `tcp://<IP>:2375`（未加密）或 `tcp://<IP>:2376`（TLS 加密）。資料會封裝進 TCP 封包經網路卡送出。<mark style="background: #FF5582A6;">2375 未加密埠絕對不可以曝露在公網</mark>，等於開放無密碼的 root shell。

### 二、Docker 到底是 Client 還是 Server

**(g)** <mark style="background: #FFF3A3A6;">答案：Docker 是一個完整的 C/S（Client-Server，主從式）系統，兩部分都包含</mark>。

| 元件 | 角色 | 主要職責 |
|---|---|---|
| Docker Client（`docker` CLI） | <mark style="background: #ADCCFFA6;">發令者</mark> | 我們在終端機打的 `docker build`／`pull`／`run`。它<mark style="background: #FF5582A6;">不負責執行容器</mark>，只把指令打包成 API 請求送給後端 |
| Docker Daemon（`dockerd`） | <mark style="background: #ADCCFFA6;">執行者（Server）</mark> | 長駐後台的服務，管理映像檔、容器、網路與磁碟卷軸（Volume）。真正幹活的就是它 |

**(h)** <mark style="background: #BBFABBA6;">「Server 部分只有 Daemon 嗎？」嚴格來說是的</mark>：真正處理運算、存取資源、執行管理邏輯的伺服器端就是 `dockerd`，它對外提供一套 REST API。

**(i)** <mark style="background: #D2B3FFA6;">即使同機也要走 Socket</mark>：Client 與 Daemon 就算在同一台電腦上，Client <mark style="background: #FFF3A3A6;">仍然得透過 Socket 送請求</mark>，邏輯跟瀏覽器連到網頁伺服器一模一樣。這解釋了為什麼 Docker Desktop 沒開時 `docker ps` 會報「Cannot connect to the Docker daemon」——不是指令壞了，是<mark style="background: #FF5582A6;">電話那頭沒人接</mark>。

**(j)** <mark style="background: #ADCCFFA6;">`docker run` 的完整流向（六步）</mark>：

1. 使用者在終端機輸入 `docker run hello-world`。
2. Docker Client 收到指令，轉換成一個 REST API 請求。
3. 請求被寫入 `/var/run/docker.sock`。
4. Docker Daemon 監聽該 Socket，收到請求。
5. Daemon 檢查本機有無映像檔、分配記憶體與 CPU、啟動容器。
6. Daemon 把結果沿原路傳回 Client，顯示在終端機上。

### 三、路徑解剖—為什麼是 /var/run 與 /var/lib

**(k)** <mark style="background: #ADCCFFA6;">Linux 路徑不是隨便取的</mark>：遵循 <mark style="background: #FFF3A3A6;">FHS（Filesystem Hierarchy Standard，檔案系統階層標準）</mark>。懂了 `var` 與 `lib`，就懂 Docker 為什麼把東西放那裡。

**(l)** <mark style="background: #ADCCFFA6;">`/var` ＝ Variable（會變動的）</mark>：專門存放系統運作過程中<mark style="background: #FFF3A3A6;">內容會不斷改變</mark>的檔案——日誌（Logs）、快取（Cache）、暫存檔，以及各種服務的執行資料。Docker 在這裡，是因為容器的狀態、日誌、暫存資料一直在變。

**(m)** <mark style="background: #ADCCFFA6;">`/lib` ＝ Library（函式庫／資料庫）</mark>：存放程式執行時需要的核心資料、共用函式庫或應用程式的內部資料。Docker 把最核心的「資產」（映像檔層、容器層資料）都放這。

**(n)** <mark style="background: #FFB8EBA6;">`/var/lib/docker` ＝ Docker 的倉庫總部</mark>（進去通常需要 root 權限）：

| 子目錄 | 存放內容 |
|---|---|
| `image/` | 映像檔（Images）的元資料與層級資訊 |
| `containers/` | 所有容器的組態與日誌 |
| `volumes/` | 你建立的 Docker Volumes（持久化資料） |
| `overlay2/` | 實際的磁碟層資料，<mark style="background: #FF5582A6;">佔硬碟空間最大的地方</mark> |

**(o)** <mark style="background: #FFF3A3A6;">`/var/run` 與 `/var/lib` 的分工，一句話記住</mark>：

- <mark style="background: #ADCCFFA6;">`/var/run/docker.sock`</mark>＝通訊窗口，像<mark style="background: #FFF3A3A6;">電話線</mark>。存放「系統啟動後到現在」的資訊，特別是行程 ID（PID）與 Socket 檔案；Docker 沒跑就不存在，重開機後重建。
- <mark style="background: #ADCCFFA6;">`/var/lib/docker`</mark>＝資料倉庫，像<mark style="background: #FFF3A3A6;">倉庫</mark>。重開機後還在，刪掉等於刪光所有映像檔與容器。

### 四、匿名卷（Anonymous Volume）能不能持久化

**(p)** <mark style="background: #BBFABBA6;">答案：可以持久化，但管理起來非常麻煩</mark>。只要是 Volume，不論具名或匿名，資料在實體上都存在主機的 `/var/lib/docker/volumes/`，<mark style="background: #FFF3A3A6;">只要不主動刪除那個卷，資料就不會消失</mark>。匿名卷的產生方式是 `docker run -v /data`（只給容器內路徑，沒給名稱或主機路徑），Docker 會自動配一串雜湊碼當名字。

**(q)** <mark style="background: #FFB8EBA6;">匿名卷 vs 具名卷</mark>：

| 特性 | 匿名卷（Anonymous） | 具名卷（Named） |
|---|---|---|
| 建立方式 | `-v /container/path` | `-v my_data:/container/path` |
| 資料持久化 | 會（重啟容器資料仍在） | 會 |
| 容器刪除後 | 卷變成<mark style="background: #FF5582A6;">「孤兒（dangling）」</mark>殘留在硬碟 | 保留，名稱清晰好找 |
| 可重複利用性 | 極低，你記不住那串亂碼 | 極高，隨時掛給新容器 |

**(r)** <mark style="background: #FF5582A6;">匿名卷的兩大痛點與實務建議</mark>：

- <mark style="background: #FF5582A6;">難以識別</mark>：跑十個容器就有十個亂碼資料夾，根本分不出誰是誰。
- <mark style="background: #FF5582A6;">生命週期陷阱</mark>：刪容器時若下 `docker rm -v`，Docker 會<mark style="background: #FF5582A6;">連匿名卷一起刪掉</mark>；具名卷通常會被保留。
- 建議：開發測試圖方便可以用匿名卷；<mark style="background: #BBFABBA6;">正式環境與重要資料一律用具名卷或 Bind Mount</mark>，這樣升級容器版本時才能把舊資料輕鬆掛到新容器。

```bash
# 查看所有「孤兒」卷（沒被任何容器使用）
docker volume ls -f dangling=true

# 看某個卷實際落在主機哪個路徑
docker volume inspect <volume_name>

# ⚠️ 清掉所有孤兒卷（不可復原，執行前先 inspect 確認）
docker volume prune
```

## 補充—`docker pull` 的「完整句子」

對話最後 Abby 問 `docker pull` 的完整寫法。整理如下（本段依 Docker 官方文件補齊，原始回覆內容未完整擷取到）：

```bash
# 一般人打的簡寫
docker pull nginx

# 管理指令的完整形式（docker pull 是它的別名）
docker image pull nginx

# Docker 實際幫你補齊之後的完整座標
docker pull docker.io/library/nginx:latest
#            └─ registry ─┘└ namespace ┘└name┘└ tag ┘

# 完整語法
docker pull [OPTIONS] NAME[:TAG|@DIGEST]
```

<mark style="background: #FFF3A3A6;">三個被省略的東西</mark>：<mark style="background: #ADCCFFA6;">registry（登錄機構）</mark>預設補 `docker.io`、<mark style="background: #ADCCFFA6;">namespace（命名空間）</mark>對官方映像檔預設補 `library`、<mark style="background: #ADCCFFA6;">tag（標籤）</mark>預設補 `latest`。<mark style="background: #FF5582A6;">`latest` 不代表「最新版」，它只是一個普通標籤名</mark>，正式環境請釘死版本號或用 `@sha256:` digest。

## 各對話來源

### Docker Socket: Client-Daemon 通訊（2026 年，共 6 個使用者回合）— https://gemini.google.com/app/557471f26b6cf7d4

<mark style="background: #FFF3A3A6;">使用者：Client-Server 架構：Docker Client（如 docker CLI）透過 REST API 或 Unix Socket（預設 /var/run/docker.sock）與 Daemon 通訊。Socket 是什麼</mark>

Gemini：定義 Socket 為 IPC 中的雙向資料傳輸端點，給出插座與檔案路徑兩種類比（重點 a、b）；拆解 Unix Domain Socket 的路徑、非網路協定本質、同機限制與高效能理由，並說明其安全性由檔案權限控制（重點 c、d）；對照 TCP Socket 的遠端使用情境與埠號 2375／2376（重點 f）；最後給出 `docker run` 的完整 Client→Socket→Daemon 流向（重點 j）。

<mark style="background: #FFF3A3A6;">使用者：他是 client server application，他是算 Client 還是 Server 還是都有？還是 server 部分只有 daemon？</mark>

Gemini：回答 Docker 是一個完整的 C/S 系統、兩部分都包含；用表格拆解 CLI 是發令者、`dockerd` 是執行者（重點 g）；確認「Server 部分嚴格來說就是 Daemon」，因為真正處理運算與資源的是它（重點 h）；強調即使同機 Client 也要透過 Socket 送請求，邏輯等同瀏覽器連網頁伺服器（重點 i）。

<mark style="background: #FFF3A3A6;">使用者：裡面的 var 跟 lib 是什麼</mark>

Gemini：說明 Linux 路徑遵循 FHS 標準（重點 k）；`var` 是 Variable、放會變動的日誌與快取（重點 l）；`lib` 是 Library、放核心資產（重點 m）；列出 `/var/lib/docker` 底下 image／containers／volumes／overlay2 四個子目錄的用途，並指出 overlay2 最吃硬碟（重點 n）；最後對比 `/var/run` 與 `/var/lib` 的差異——電話線 vs 倉庫（重點 o）。

<mark style="background: #FFF3A3A6;">使用者：匿名卷還可以掛載可以持久化嗎</mark>

Gemini：回答「可以持久化，但管理非常麻煩」，說明不論匿名或具名，資料都在 `/var/lib/docker/volumes/`（重點 p）；用表格對比匿名卷與具名卷在建立方式、容器刪除後、可重複利用性上的差異（重點 q）；點出難以識別與 `docker rm -v` 連帶刪除兩大痛點，並給出開發 vs 正式環境的建議與 `docker volume ls -f dangling=true` 救援指令（重點 r）。

<mark style="background: #FFF3A3A6;">使用者：Docker pull 完整的句子是什麼</mark>

Gemini：回覆 `docker pull` 的完整寫法。<mark style="background: #D2B3FFA6;">（此回合內容因含登錄機構網址被擷取工具的隱私過濾擋下，本篇「補充」段落改依 Docker 官方 CLI 文件重新整理，語意等價。）</mark>

## ⚠️ 存疑／更正

- Gemini 未提醒 <mark style="background: #FF5582A6;">把 `/var/run/docker.sock` 掛進容器等同交出主機 root 權限</mark>，這是實務上最常被忽略的重大風險，本篇重點 (e) 已補上（依 Docker 官方安全文件）。
- Gemini 未提醒 <mark style="background: #FF5582A6;">TCP 2375 埠未加密</mark>，曝露到公網等於開放無密碼 root shell，本篇重點 (f) 已補上。
- Gemini 說「`/var/run` 專門存放系統啟動後到現在的資訊」——這個描述正確，但現代 Linux 發行版<mark style="background: #FFB8EBA6;">實際目錄已改為 `/run`，`/var/run` 只是保留給舊程式的符號連結（symlink）</mark>。實務上兩個路徑都能用，但除錯時看到 `/run/docker.sock` 不要以為是不同東西。

## 資料來源（含查證時間）

> 查證日期：2026-08-08（Gemini 對話為 2026 年；安全性補充與 `docker pull` 完整語法另依下列官方文件核實）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話原文 | [Docker Socket: Client-Daemon 通訊](https://gemini.google.com/app/557471f26b6cf7d4) | 2026 年 |
| Docker 架構（Client／Daemon／REST API） | [Docker Docs — Docker overview: Architecture](https://docs.docker.com/get-started/docker-overview/) | 官方文件，持續更新 |
| `dockerd` 與 `-H` Socket 設定（unix／tcp） | [Docker Docs — dockerd CLI reference](https://docs.docker.com/reference/cli/dockerd/) | 官方文件，持續更新 |
| 掛載 docker.sock 的權限風險 | [Docker Docs — Docker daemon attack surface](https://docs.docker.com/engine/security/) | 官方文件，持續更新 |
| Volume 的儲存位置與匿名卷行為 | [Docker Docs — Volumes](https://docs.docker.com/engine/storage/volumes/) | 官方文件，持續更新 |
| `docker pull` 完整語法與預設補齊規則 | [Docker Docs — docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/) | 官方文件，持續更新 |
| FHS 中 `/var`、`/var/lib`、`/run` 的定義 | [Filesystem Hierarchy Standard 3.0](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html) | FHS 3.0（2015 發布，仍為現行標準） |

## 相關筆記

- [[docker-引擎-context-image-container-觀念]]——關聯原因：那篇講「引擎（Engine）」這個詞涵蓋 CLI＋Daemon＋containerd，本篇 (g)(h) 正好把引擎內部的 C/S 角色切開；context 的切換本質就是換一個 Socket 位址（重點 c、f），兩篇是同一件事的內外視角。
- [[dockerd-選項清單-我的困惑筆記]]——關聯原因：`dockerd` 的 `-H unix://` 與 `-H tcp://` 選項，正是本篇 (c)(f) 兩種 Socket 的設定入口；看完本篇再回去看那份選項清單會突然合理。
- [[Docker問題prune+壓縮vhdx(虛擬磁碟)解決硬碟爆掉]]——關聯原因：本篇 (n) 指出 `overlay2/` 是最吃硬碟的目錄、(r) 的孤兒卷會默默殘留，這兩點正是那篇「C 槽爆掉」的根本成因；`docker volume prune` 是兩篇共用的解法。
- [[docker-compose-ps-and-unix-ps]]——關聯原因：`docker ps` 之所以要問 Daemon 才有答案、而 Unix `ps` 是直接讀 `/proc`，差別就在本篇 (i) 的「即使同機也要走 Socket」。
- [[Docker-Desktop-卡在starting或distro-stopped-排查]]——關聯原因：Docker Desktop 卡住時 `docker ps` 報「Cannot connect to the Docker daemon」，用本篇 (i) 的模型就能判斷是 Daemon 沒起來而非 CLI 壞掉，排查方向完全不同。
- [[windows-用-linux-的方式]]——關聯原因：Windows 上沒有真正的 `/var/run/docker.sock`，是透過 WSL2 或具名管道（Named Pipe，`npipe:////./pipe/docker_engine`）模擬；本篇 (c) 的 Linux 模型要對照那篇才知道在 Abby 的機器上實際長什麼樣。
