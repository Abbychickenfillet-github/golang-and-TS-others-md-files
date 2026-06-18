# 在 Windows 上用 Linux 的 4 種方式 — Docker / WSL2 / VM / Dual boot

> **這份筆記回答**：
> 1. 想用 Linux 是不是只能在 Docker 內？
> 2. Docker、WSL2、VM、雙系統各自的好處 / 限制？
> 3. 學什麼用哪個最好？
> 4. Docker Desktop 跟 WSL2 是什麼關係？
>
> **建立日期**：2026-05-05

---

## 0. 速答

❌ **不是隻能 Docker**——Windows 上「用 Linux」有 **4 種主流方式**：

| 方式 | 適合 | 學習曲線 | 重量級 |
|------|------|---------|-------|
| **Docker** | 跑 Linux **服務 / 軟體** | 中 | 輕（~4 GB）|
| **WSL2** | 學 Linux **指令 / 開發環境** | 低 | 中（~5 GB）|
| **VM** (VMware/VirtualBox) | 玩 Linux **桌面 GUI** | 中 | 重（~20 GB）|
| **Dual boot** | 主要用 Linux 做事 | 高 | 整顆硬碟 |

→ 你問的 **Docker 主要適合「跑特定軟體」**。學 Linux **指令本身**用 **WSL2** 更好用。

---

## 1. 四種方式深入對照

### 1.1 Docker

**本質**：跑「**容器**」(container)——隔離的 Linux 環境，**只跑一個服務**。

```
Docker Desktop（Windows 上的引擎）
├── pgvector-test 容器     ← Postgres + pgvector
├── redis-cache 容器       ← Redis
├── nginx-proxy 容器       ← Web server
└── ubuntu-test 容器       ← 純 Ubuntu（你也可以建這種試 Linux 指令）
```

**好處**：
- ✅ **超輕量**：每個容器幾百 MB，啟動 1 秒
- ✅ **隔離乾淨**：玩壞了 `docker rm` 重來，不汙染主機
- ✅ **跨平台一致**：同份 image 在 Mac / Linux / Windows 跑出來一樣
- ✅ **可拋棄**：每次測試都用乾淨環境
- ✅ **生產環境主流**：學會 = 工作能用

**限制**：
- ⚠️ **不是完整 Linux 桌面**——只是命令列 + 一個服務
- ⚠️ **複雜配置麻煩**（網路、volume、image build）
- ⚠️ **不適合「開發環境」**（每次重啟容器內裝的東西消失）

**學 Linux 指令？** 可以——`docker run -it ubuntu bash` 進去玩，玩完 `exit`。但**不適合長期當開發環境**。

---

### 1.2 WSL2 (Windows Subsystem for Linux)

**本質**：在 Windows 內**直接跑完整 Linux kernel**（微軟自家內建支援）。

```
Windows 11
├── Windows 程式（PowerShell、Office、瀏覽器...）
└── WSL2
    └── Ubuntu / Debian / Fedora（自己選 distro）
        ├── 完整檔案系統 ~/、/etc、/usr/bin
        ├── 完整 Linux 指令（apt、grep、vim、git、node...）
        └── 跟 Windows 共享網路、檔案系統
```

**好處**：
- ✅ **完整 Linux 體驗**：所有 Linux 指令都能用
- ✅ **微軟官方內建**：`wsl --install` 一行裝完
- ✅ **Windows 跟 Linux 互通**：在 Windows 開檔案總管能看到 Linux 檔案
- ✅ **VS Code 完美整合**：`code .` 在 WSL 開資料夾，VS Code 自動連 WSL
- ✅ **持久化**：你裝的軟體、寫的 code 都保留
- ✅ **效能比 VM 好很多**

**限制**：
- ⚠️ 沒有 Linux **GUI 桌面**（WSLg 有支援部分 GUI 但不完美）
- ⚠️ 不適合「測試完即丟」場景（這是 Docker 強項）

**學 Linux 指令？** ★★★★★ **最佳選擇**——直接用就是真 Linux 環境。

---

### 1.3 VM (VMware / VirtualBox / Hyper-V)

**本質**：跑「**虛擬機**」——完整模擬一台電腦，裡面裝完整 Linux 含桌面。

```
你的 Windows 電腦
└── VMware / VirtualBox（虛擬機軟體）
    └── Ubuntu Desktop 24.04（完整 OS）
        ├── 桌面環境（GNOME / KDE）
        ├── 滑鼠視窗 GUI
        └── 跟主機完全隔離
```

**好處**：
- ✅ **完整 Linux 桌面 GUI**：用滑鼠操作圖形界面
- ✅ **快照功能**：玩壞了還原
- ✅ **可離線**：不需要 Microsoft 帳號或服務

**限制**：
- ⚠️ **吃資源**：分配 4 GB RAM / 30 GB 硬碟起跳
- ⚠️ **效能差**：比 WSL2 慢很多
- ⚠️ **跟主機互動麻煩**：剪貼簿 / 檔案分享要設定

**學 Linux？** 想學「桌面操作」可以；指令還是 WSL2 好。

---

### 1.4 Dual Boot（雙系統）

**本質**：硬碟切兩塊，**開機選要進 Windows 還是 Linux**。

**好處**：
- ✅ **效能 100%**：直接跑硬體
- ✅ **完整體驗**：跟單系統一樣

**限制**：
- ⚠️ **要重開機切換**——超不方便
- ⚠️ **設定難**：分割磁碟、grub bootloader、UEFI 設定很容易搞壞
- ⚠️ **資料分隔**：兩邊看不到對方的檔案

**何時用**：你決定 80% 時間用 Linux 工作，Windows 只偶爾開（玩遊戲 / Adobe）。

---

## 2. 四個方式重量級比較

```
重量級 (硬碟 / RAM 用量)
最重 ←──────────────────────────────────────────→ 最輕

Dual boot           VM (Ubuntu Desktop)         WSL2          Docker container
─────────           ─────────────────────       ──────         ─────────────────
分割硬碟             ~20 GB + 4 GB RAM           ~5 GB         <500 MB / 容器
完全獨立 OS          完整 OS + 桌面             完整 Linux     單一服務
要重開機             VM 軟體啟動 ~30 秒          幾秒啟動       1 秒啟動
```

---

## 3. Docker Desktop 跟 WSL2 是什麼關係？

⚠️ **Docker Desktop 在 Windows 上其實是「跑在 WSL2 裡面」的**！

```
你的 Windows
└── WSL2（微軟內建的 Linux 子系統）
    └── Docker Engine（Linux 程式，需要 Linux kernel）
        └── 各種容器（pgvector-test / redis / nginx...）
```

**為什麼？** Docker 本質是 Linux 技術（用 Linux kernel 的 cgroups + namespaces）。Windows kernel 沒有這些功能，所以 Docker Desktop 在背後**偷偷裝了 WSL2**，讓 Linux 容器跑在 WSL2 的 Linux kernel 上。

→ 你裝 Docker Desktop 時其實也裝了 WSL2，**可以兩個都用**。

### 從 PowerShell 進 WSL2 試試看

```powershell
# 看有沒有 WSL2
wsl --list --verbose

# 進去 WSL2（如果有裝）
wsl

# 跳出去
exit
```

---

## 4. 學什麼用哪個？

### ✅ 用 Docker

| 場景 | 為什麼 Docker |
|------|------------|
| 跑 Postgres / pgvector | Docker image 已包好，一行指令啟動 |
| 跑 Redis / Elasticsearch | 同上 |
| 測試「裝了某個服務後會發生什麼」 | 玩壞 `docker rm` 重來 |
| 多版本並存（Postgres 16 vs 17）| 兩個容器各跑一個版本 |
| 部署到生產環境 | 業界主流就是 Docker |

### ✅ 用 WSL2

| 場景 | 為什麼 WSL2 |
|------|----------|
| 學 Linux 指令（grep/awk/sed/find/...）| 完整 Linux，沒限制 |
| 寫 shell script（bash/zsh）| 真實 shell 環境 |
| 用 vim / tmux / git CLI | 原生 Linux 工具最好 |
| 跑 Node.js / Python 開發 | 比 Windows 上跑相容性更好 |
| 編譯 C/C++ Linux 程式 | gcc / make 直接用 |

### ⚠️ 用 VM

| 場景 | 為什麼 VM |
|------|--------|
| 學 Linux **桌面操作**（GNOME/KDE）| 只有 VM 有完整 GUI |
| 測「裝某個 Linux distro」 | 玩各種 distro |
| 完全隔離（資安測試）| VM 比 WSL2 隔離更徹底 |

---

## 5. 推薦學習路徑

```
1. 先用 Docker（你已經在做）
   ─────────
   學會：image / container / volume / port mapping
   實踐：跑 pgvector、Redis、Postgres
   產出：能在 Windows 上跑 Linux 服務 ✓

2. 接著裝 WSL2
   ─────────
   一行指令：wsl --install
   學會：Linux 指令、檔案系統、套件管理 (apt)
   實踐：寫 shell script、用 vim/git CLI
   產出：能流暢操作 Linux 環境 ✓

3. 兩者搭配
   ─────────
   主開發環境：WSL2
   特定服務：Docker（在 WSL2 內也能跑 Docker）
   實踐：在 WSL2 寫 code、用 Docker 跑 DB
   產出：跟業界 Linux 開發工作流一致 ✓

4. (可選) VM 玩桌面 Linux
   ─────────
   只有想試 Ubuntu Desktop / KDE 才需要
   平常開發用不到
```

---

## 6. 實際開動

### 6.1 用 Docker 試 Linux 指令（你現在能做的）

```powershell
# 起個臨時 Ubuntu 容器，跑完即丟
docker run -it --rm ubuntu bash

# 進去後就在 Ubuntu Linux 裡了
root@xxx:/# ls
root@xxx:/# apt list --installed
root@xxx:/# exit       ← 跳出，--rm 表示退出後容器自動刪
```

⚠️ 這樣每次新開都是**全新環境**，裝的東西不會留——適合「測一下、玩玩」，不適合長期用。

### 6.2 裝 WSL2（推薦下一步）

```powershell
# 系統管理員身份開 PowerShell
wsl --install

# 重開機後會自動開 Ubuntu，叫你設使用者名稱密碼
# 設完之後永久可用：
wsl                    # 從 PowerShell 進 Ubuntu
```

進去後：

```bash
# 你就在真實 Linux 裡了
abby@DESKTOP:~$ uname -a
Linux DESKTOP 5.15.x-microsoft-standard ... GNU/Linux

abby@DESKTOP:~$ ls /
bin   etc   home   lib   ...

abby@DESKTOP:~$ apt update && apt install vim
```

→ **這就是真正的 Linux**，比 Docker 更適合「學 Linux 環境」。

---

## 7. 一個常見誤解

> 「Docker 容器是 Linux 虛擬機嗎？」

❌ **不是**。

| | Docker container | VM |
|---|----------------|-----|
| 跑什麼 | 共用主機 kernel | 自己完整 kernel |
| 啟動時間 | 1 秒 | 30+ 秒 |
| 重量級 | <500 MB | 數 GB |
| 隔離程度 | 應用層隔離 | 完全硬體隔離 |
| 資源 | 共享主機 | 獨立切分 |

→ Docker container = **「分享 Linux kernel 的隔離程序」**，不是完整虛擬機。

---

## 8. 速記卡

```
你想要什麼              用什麼
──────────             ──────
跑 Postgres / pgvector  → Docker
學 Linux 指令           → WSL2
寫 Linux 開發環境       → WSL2
玩 Linux 桌面 GUI       → VM
完全用 Linux 工作       → Dual boot

Docker Desktop 在 Windows 上實際跑在 WSL2 內
裝 Docker Desktop 順便裝了 WSL2
```

---

## 相關筆記

- [../RAG/pgvector-setup-guide.md](../RAG/pgvector-setup-guide.md) — pgvector setup（Docker 實戰）
- [../RAG/RAG指令啟用步驟與地點.md](../RAG/RAG指令啟用步驟與地點.md) — 三層 prompt 速查
- [../CLI/grep-options.md](../CLI/grep-options.md)、[../CLI/ls-options.md](../CLI/ls-options.md) — Linux CLI 指令（在 WSL2 / Docker bash 都通用）
- [../CLI/environment-variables-basics.md](../CLI/environment-variables-basics.md) — 環境變數（bash 跟 PowerShell 對照）
- [docker-compose-modes.md](docker-compose-modes.md) — Docker Compose 模式
- [CONTAINER_PATH_AND_SHELL_EXPLANATION.md](CONTAINER_PATH_AND_SHELL_EXPLANATION.md) — 容器內路徑與 shell

---

## 官方資源

- **WSL 官方**：<https://learn.microsoft.com/en-us/windows/wsl/install>
- **Docker Desktop**：<https://docs.docker.com/desktop/>
- **VirtualBox**（免費 VM）：<https://www.virtualbox.org/>
- **VMware Workstation**（個人版免費）：<https://www.vmware.com/products/workstation-player.html>
