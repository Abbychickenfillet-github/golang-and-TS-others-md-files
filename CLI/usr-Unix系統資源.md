---
title: /usr — Unix System Resources（系統共用資源目錄）
type: concept-note
tags: [linux, filesystem, cli, usr, 檔案系統]
updated: 2026-07-17
---

# /usr — Unix System Resources

> 🔖 **本篇重點索引：a–v，共 22 個。** 每個重點前面的小寫字母是它在全篇的位置，方便你知道「看到哪、還有幾個」。（用字母不用數字：只表位置與數量，沒有優先順序之意。）

## 一句話

**(a)** <mark style="background: #FFF3A3A6;">`/usr` 不是 user 的縮寫</mark>，而是 **Unix System Resources**：放的是<mark style="background: #ADCCFFA6;">作業系統提供、可共用、唯讀的軟體</mark>——在 Linux 上就是發行版打包的系統程式 + Python / Node / psql 等工具。<mark style="background: #FF5582A6;">不能砍，砍了工具就壞。</mark>

## 命名由來（為什麼叫 Unix System Resources，卻放 Linux 的東西？）

這其實是<mark style="background: #FFB8EBA6;">先有目錄、後有名字</mark>的歷史巧合：

- **(b)** <mark style="background: #ADCCFFA6;">最早 `usr` 真的是 user</mark>：1970 年代的 Unix，`/usr` 底下放的是使用者家目錄（`/usr/ken`、`/usr/dmr`）。
- **(c)** <mark style="background: #FF5582A6;">根磁碟被塞爆</mark>：系統程式越來越多，第一顆磁碟不夠放，工程師就把<mark style="background: #FFB8EBA6;">系統的程式、函式庫</mark>搬到第二顆磁碟、掛在 `/usr` 底下。於是「系統程式」意外地住進了原本放使用者的地方——<mark style="background: #FFF3A3A6;">是為了空間，不是設計</mark>。
- **(d)** <mark style="background: #BBFABBA6;">後來才反過來取名</mark>：為了消除「usr=user」的誤會，改用 backronym（回頭湊字）解釋成 **Unix System Resources**。

> 📚 這段史料出處：1971 年 Thompson、Ritchie 把 UNIX 從 PDP-7 搬到 PDP-11，只有兩顆 1.5MB 硬碟，系統塞爆第一顆才溢到第二顆的 `/usr`。詳見 [OSnews — Understanding the /bin, /sbin, /usr/bin split](https://www.osnews.com/story/25556/understanding-the-bin-sbin-usrbin-usrsbin-split/)（引用 Rob Landley 在 BusyBox 郵件串 2010-12 的原始說明）。「Unix System Resources」屬後世 backronym，非原始命名。

**(e)** 那為什麼是「**Unix**」不是「Linux」？因為 <mark style="background: #ADCCFFA6;">Linux 是 Unix-like 系統</mark>，遵循從 Unix 傳下來的檔案系統標準（FHS，Filesystem Hierarchy Standard）。名字講的是<mark style="background: #FFF3A3A6;">血緣與標準</mark>，不是<mark style="background: #FFF3A3A6;">說裡面的檔案是 Unix 專屬</mark>。所以「放的是 Linux 系統本身 + 預裝的 Python / Node」並不矛盾：`/usr` 的定位就是「作業系統提供的、可共用、唯讀的軟體」，在 Linux 上這個作業系統就是某個發行版，它打包好的 Python、Node、psql 自然裝在 `/usr/bin`、`/usr/lib`。

## 重點整理

- **(f)** <mark style="background: #FF5582A6;">常見誤解</mark>：`/usr` 看起來像 user，其實跟「使用者的家目錄」無關。
- **(g)** 它存放<mark style="background: #FFF3A3A6;">所有使用者共用</mark>的程式、函式庫、文件——類比 Windows 的 `C:\Program Files` + `System32`。
- **(h)** 你個人的檔案是放在<mark style="background: #ADCCFFA6;">家目錄</mark>：`/home/<你的帳號>`、`/root/`（對應 Windows 的 `C:\Users\Abby`）。

**（本篇唯一總表，`/usr`、`/var`、家目錄一次看完）**

| 目錄                     | 放什麼                                                            | 例子                                      | 對應 Windows       |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------- | ---------------- |
| `/usr/bin`             | 系統共用<mark style="background: #FFF3A3A6;">可執行程式</mark>          | `ls`、`bash`、`psql`、`nginx`、`node`       | `System32` 的工具   |
| `/usr/local/bin`       | <mark style="background: #FFB8EBA6;">自己編譯／額外安裝</mark>的程式       | 手動裝的工具                                  | 手動裝的程式           |
| `/usr/lib`             | 共用函式庫                                                          | `.so` 檔                                 | `System32` 的 DLL |
| `/usr/share`           | 架構無關的<mark style="background: #FFB8EBA6;">靜態資料</mark>（套件附帶、唯讀） | 文件、圖示、時區、套件預設網頁 `/usr/share/nginx/html` | 共用資源             |
| `/var`                 | <mark style="background: #ADCCFFA6;">variable</mark>：運作中會變動／寫入 | 日誌 `/var/log`、快取 `/var/cache`           | ProgramData、事件記錄 |
| `/var/spool`           | <mark style="background: #FFB8EBA6;">排隊等處理</mark>的資料（處理完通常刪掉）  | 列印佇列、郵件佇列、cron/at 排程工作                  | 列印多工緩衝（spool）    |
| `/var/www`             | <mark style="background: #FFF3A3A6;">網站站台內容</mark>（會變動）        | 你 build 出的網站檔案                          | 網站根目錄            |
| `/tmp`                 | 暫存檔（重開機清空）                                                     | 各種暫存                                    | `%TEMP%`         |
| `/home/<user>`、`/root` | <mark style="background: #ADCCFFA6;">使用者自己的檔案</mark>           | 你的專案、設定                                 | `C:\Users\Abby`  |

## 系統程式舉例（`/usr/bin` 裡常見的工具）

**(i)** 這些平常打的指令，本體幾乎都住在 <mark style="background: #FFF3A3A6;">`/usr/bin/`</mark>（用 `which <指令>` 可查它在哪）：

| 類別 | 程式 |
|---|---|
| 檔案操作 | `ls`、`cp`、`mv`、`rm`、`mkdir`、`cat`、`less`、`find` |
| 文字處理 | `grep`、`sed`、`awk`、`sort`、`uniq`、`wc`、`cut` |
| Shell／系統 | `bash`、`sh`、`env`、`ps`、`top`、`kill`、`df`、`du`、`chmod`、`chown` |
| 開發工具 | `git`、`node`、`npm`、`python3`、`pip`、`gcc`、`make` |
| 網路／資料庫 | `curl`、`wget`、`ssh`、`scp`、`psql`、`tar`、`gzip` |

> 小知識：有些最核心的程式（`ls`、`cat`、`bash`）歷史上放在 `/bin`，但<mark style="background: #ADCCFFA6;">現代發行版多半把 `/bin` 做成指向 `/usr/bin` 的符號連結</mark>（稱為 **usr merge**），所以實際上都在 `/usr/bin` 底下。

## /usr/share 與「靜態檔案」：為什麼 nginx 的網頁在這裡

**(j)** 會覺得矛盾，是因為把 `/usr` 想成「只有程式」。其實 `/usr` 底下是<mark style="background: #FFF3A3A6;">分工</mark>的：`/usr/bin` 放程式、`/usr/lib` 放函式庫、`/usr/share` 放<mark style="background: #FFB8EBA6;">靜態資料</mark>（含套件預設網頁）——完整對照見上方「重點整理」的<mark style="background: #ADCCFFA6;">唯一總表</mark>。

**(k)** `root /usr/share/nginx/html;` 這行的 <mark style="background: #FFF3A3A6;">`/usr/share`</mark> 就是重點：<mark style="background: #BBFABBA6;">當你安裝 nginx 這個套件時，它把自己的「預設網站根目錄」放在 `/usr/share/nginx/html`</mark>（就是那頁「Welcome to nginx」）。因為這屬於<mark style="background: #ADCCFFA6;">套件自帶、可共用、唯讀的資料</mark>，正好符合 `/usr/share` 的定位。

> ⚠️ <mark style="background: #FF5582A6;">釐清「全域」的誤會</mark>：`/usr/share/nginx/html` **不是整台電腦共用的一個資料夾**。「可共用（shareable）」是 FHS 講的「唯讀、可跨同架構主機共用」的**性質**，不代表「所有容器看得到同一份」。<mark style="background: #FFF3A3A6;">每個 Docker 容器都有自己獨立的檔案系統（各自一份 `/usr`）</mark>：
> - <mark style="background: #BBFABBA6;">有裝 nginx 的容器</mark>（nginx image）→ 它的 `/usr/share/nginx/html` 才存在。
> - <mark style="background: #FF5582A6;">沒裝 nginx 的容器</mark>（例如 postgres 容器）→ **根本沒有**這個資料夾。你進錯容器當然看不到，這是正常的。
> - 你的 Windows 主機 → 也沒有（那是 Linux 路徑）。
>
> 所以「套件自帶」的意思是：<mark style="background: #ADCCFFA6;">哪裡裝了 nginx，那個檔案系統裡才會有這個資料夾</mark>；要看它就得 `docker exec` 進一個**基於 nginx 的容器**：`docker exec -it <nginx容器名> ls /usr/share/nginx/html`。

**(l)** 這裡有兩個「靜態」剛好對上：

- `/usr/share` = OS／套件提供的<mark style="background: #FFF3A3A6;">靜態（不常變、唯讀）</mark>資料
- 前端 build 出來的 `index.html`、CSS、JS = <mark style="background: #FFF3A3A6;">網頁靜態資源</mark>（相對於後端動態產生的內容）

兩者都是「唯讀、直接送出」的東西，所以 <mark style="background: #BBFABBA6;">Dockerfile 常把 React build 結果 `COPY` 進 `/usr/share/nginx/html`</mark>——不是因為 `/usr` 拿來放你的資料，而是<mark style="background: #FFB8EBA6;">沿用 nginx 的預設網站目錄</mark>（nginx 官方 image 尤其這樣）。

**(m)** <mark style="background: #FF5582A6;">補充（FHS 的「正統」）</mark>：如果是「會變動」的網站內容，標準其實建議放 <mark style="background: #ADCCFFA6;">`/var/www/html`</mark>（`/var` = variable，變動資料）。所以你會看到兩種 web root：`/usr/share/nginx/html`（套件預設、偏唯讀）vs `/var/www/html`（站台內容、會變）。容器裡圖方便常直接用前者。

## 為什麼「砍不得」

**(n)** `/usr` 裡是作業系統跟工具的本體。清理磁碟時如果誤刪 `/usr`，等於把系統程式、Python、Node 一起刪掉——<mark style="background: #FF5582A6;">工具會直接壞掉、系統可能開不了</mark>。要清空間應該清「快取／暫存／下載包」（`/tmp`、pip/npm 快取、apt 下載包），而不是動 `/usr`、`/bin`、`/lib`。

> 小提醒：這個概念只影響 Linux 沙箱／伺服器那類環境，跟你 Windows 的 C 槽是兩回事——清沙箱不會讓 C 槽多出空間。

## 在我的電腦上：/usr 到底在哪？我自己寫的程式又在哪？

### 我寫的程式「不在」/usr

**(o)** <mark style="background: #FF5582A6;">重點：`/usr` 放的是「系統／發行版給你的」東西，不是你自己寫的。</mark>你自己的專案（例如 `C:\coding\futuresign\…`）是<mark style="background: #FFF3A3A6;">你的資料</mark>，放在：

- Windows 這邊：`C:\coding\…`、`C:\Users\User\…`（NTFS）
- 若在 WSL/Linux：家目錄 `/home/<你>/`、`/root/`

`/usr/bin/node`、`/usr/bin/python` 是<mark style="background: #ADCCFFA6;">「跑你程式的工具」</mark>（直譯器／編譯器）；你的原始碼是<mark style="background: #FFB8EBA6;">「被工具拿去跑的東西」</mark>。兩者分開放：工具在 `/usr`（系統級），你的檔案在家目錄／Windows（使用者級）。

### Windows 不是「放無關緊要的東西」

**(p)** 正好相反——<mark style="background: #BBFABBA6;">你真正的檔案幾乎都在 Windows</mark>：專案原始碼、Obsidian 筆記庫、Cursor／VS Code、截圖。WSL 裡的 `/usr` 是「另一個 Linux 系統的系統目錄」，主要在你跑 Docker／Linux 工具時才用到。可以想成：<mark style="background: #ADCCFFA6;">Windows 是你的主機與資料；WSL 是裝在裡面、共用檔案的一台 Linux</mark>。

### /usr 在本機哪裡？（WSL 的檔案路徑）

**(q)** WSL2 的 Linux 檔案<mark style="background: #FF5582A6;">不是</mark>放在一般看得到的 C 槽資料夾，而是包在一個虛擬磁碟 `ext4.vhdx` 裡。要用檔案總管看它的 `/usr`，在<mark style="background: #FFF3A3A6;">網址列</mark>貼這個（distro 要開著）：

- Windows 11：`\\wsl.localhost\<你的distro>\usr`
- Windows 10：`\\wsl$\<你的distro>\usr`

不知道 distro 名稱，先在 PowerShell 打 `wsl -l -v` 看（例如 `Ubuntu`、`Ubuntu-22.04`、`docker-desktop`）。（`distro`＝發行版，白話比喻見 [[Linux-清理與套件指令-rm-apt-pip-var]] 的重點 (g)）也可以<mark style="background: #BBFABBA6;">在 WSL 終端機裡打 `explorer.exe /usr`</mark>，直接用檔案總管打開當前 distro 的 `/usr`。

> 想直接點開的話，把下面這種連結貼進筆記（distro 換成你的）：
> [開啟 WSL 的 /usr](file://wsl.localhost/Ubuntu/usr) ← 或複製 `\\wsl.localhost\Ubuntu\usr` 貼到檔案總管網址列

實體 `ext4.vhdx` 舊版在 `%LocalAppData%\Packages\<distro套件名>\LocalState\ext4.vhdx`；但<mark style="background: #FF5582A6;">2022-11 之後用商店版 WSL（1.0+）安裝的新 distro（如 Ubuntu 24.04）改由 WSL 服務自管、不在這個路徑</mark>，而且官方警告<mark style="background: #FF5582A6;">別用 Windows 工具直接動這個 vhdx，會弄壞 distro</mark>。要看檔案就走上面的 `\\wsl.localhost\` 網路路徑。

### 磁碟命名：第一顆／第二顆 ≠ C 槽／D 槽

**(r)**
- 命名由來故事裡的「第一顆／第二顆磁碟」只是<mark style="background: #ADCCFFA6;">實體順序</mark>，是 Unix 情境，沒有磁碟機代號。
- <mark style="background: #FFB8EBA6;">C:／D: 是 Windows 專屬</mark>的代號：A:／B: 早年給軟碟（為何現在沒 A/B 槽、軟碟是什麼：見 [[磁碟機代號與軟碟-為何沒有A槽B槽]]），C: 給第一個硬碟分割區，之後 D:、E:…；D: 不保證是「第二顆硬碟」，可能是同顆的另一個分割區、光碟機或 USB。
- <mark style="background: #FF5582A6;">Linux 根本沒有磁碟機代號</mark>：磁碟是 `/dev/sda`、`/dev/sdb`…，再<mark style="background: #FFF3A3A6;">掛載到路徑</mark>（`/`、`/usr`、`/home`），用資料夾樹接起來。

### WSL 特有：能從 Linux 叫 Windows 程式（interop）

**(s)** WSL2 跑的是<mark style="background: #ADCCFFA6;">真正的 Linux kernel</mark>（輕量 VM），所以你 distro 的 `/usr/bin` 底下是<mark style="background: #FFF3A3A6;">貨真價實、為 Linux 編譯的 ELF 執行檔(Executable Linkable File)</mark>——就這個 distro 而言，`/usr` 裡都是 Linux 軟體。但 WSL 有 <mark style="background: #FFB8EBA6;">interop</mark>：你可以在 bash 裡<mark style="background: #BBFABBA6;">直接叫 Windows 的 `.exe`</mark>（如 `notepad.exe`、`explorer.exe`），靠 `binfmt_misc` 註冊一個指到 `/init` 的處理器。<mark style="background: #FF5582A6;">但這些 Windows 程式不住在 `/usr`</mark>，它們在 Windows 那邊（WSL 底下掛在 `/mnt/c/…`）。你只是「叫得動」它們，不是它們裝在 `/usr`。（interop 的完整機制、binfmt_misc、反向叫法：見 [[WSL-interop-從Linux叫Windows程式]]）

## 延伸釐清（常見疑問）

**(t)** 前端重新 build 會不會產生「很多個 `/usr/share/nginx/html`」？<mark style="background: #BBFABBA6;">不會。</mark>每個 image／container 有自己<mark style="background: #FFF3A3A6;">獨立</mark>的檔案系統，裡面就<mark style="background: #FFF3A3A6;">只有一個</mark> `/usr/share/nginx/html`。重新 build 時 `COPY` 是<mark style="background: #FF5582A6;">覆蓋</mark>同一個資料夾（新的蓋掉舊的），不是一直新增。會「越積越多」的是<mark style="background: #FFB8EBA6;">舊的 image 版本（tag／layer）堆在硬碟上</mark>——那是另一回事，清理見 [[GitHub-Actions-CICD-ghcr與Docker映像檔]]。

**(u)** 為什麼在 Windows CMD 打 `dir "/usr/share/nginx/html"` 找不到？因為 <mark style="background: #FF5582A6;">`/usr/...` 是 Linux 路徑，你的 Windows C 槽根本沒有它</mark>。而且 CMD 會把開頭的 `/` 當成「目前磁碟根目錄」，於是 `/usr/share/nginx/html` 被解讀成 <mark style="background: #FFB8EBA6;">`C:\usr\share\nginx\html`</mark>（不存在）→「找不到檔案」。它只存在於 <mark style="background: #ADCCFFA6;">nginx 容器內</mark> 或 Linux／WSL 裡。要看它：

- 容器內：`docker exec -it <容器名> ls /usr/share/nginx/html`
- WSL 的 `/usr`（非容器）：檔案總管網址列 `\\wsl.localhost\<distro>\usr`（distro 要開著）

> ⚠️ 所以我在筆記裡放的 `file://wsl.localhost/...` 連結是給 **WSL 的 `/usr`** 用的；nginx 的 `/usr/share/nginx/html` 在**容器**裡，Windows 端沒有對應檔案可直接點開，要用 `docker exec` 進去看。

## 三個不同的 Linux，別搞混（很重要）

**(v)** 我先前用「Linux 沙箱」這個詞讓你混淆了，抱歉。實際上牽涉<mark style="background: #FF5582A6;">三個不同的 Linux</mark>：

| 是哪個 Linux | 在哪 | 你碰得到嗎 | 例子 |
|---|---|---|---|
| Claude 沙箱 | <mark style="background: #FF5582A6;">不在你電腦上</mark>（我跑指令用的隔離環境） | ❌ 碰不到，會自動重置 | 我說「清沙箱」清的是這個 |
| 你的 WSL distro | 裝在你 Windows 裡的 Linux | ✅ 你的 | 有自己的 `/usr`、`/home` |
| 你的 Docker 容器 | 在你本機的 Docker 裡跑 | ✅ 你的 | `abby-rag-postgres`，`psql` 在容器內 `/usr/bin` |

所以我們討論的 <mark style="background: #FFF3A3A6;">`/usr/bin/psql` 是「你自己機器上」（WSL 或容器）的東西</mark>，你確實裝了；而「會自動重置、你碰不到」的是**另一個** Claude 專用沙箱。兩者都是 Linux、都有 `/usr`，但**是不同的機器**。

## 資料來源（含查證時間）

> 查證日期：2026-07-17（下列為我實際參考的網址，供你判斷新舊、避免過時或杜撰）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| /usr 歷史（PDP-11 兩顆磁碟） | [OSnews — the /bin, /sbin, /usr/bin split](https://www.osnews.com/story/25556/understanding-the-bin-sbin-usrbin-usrsbin-split/) | 文章 2012；引用 Rob Landley 郵件 2010-12 |
| Rob Landley 原始郵件 | [BusyBox mailing list](https://lists.busybox.net/pipermail/busybox/2010-December/074114.html) | 2010-12 |
| FHS：/usr 唯讀可共用 | [FHS 3.0 — The /usr Hierarchy](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch04.html) | FHS 3.0，2015-06 |
| FHS：/usr/share 架構無關資料 | [FHS 3.0 — /usr/share](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch04s11.html) | FHS 3.0，2015-06 |
| 從 Windows 存取 WSL 檔案 | [Microsoft Learn — Working across Windows and Linux file systems](https://learn.microsoft.com/en-us/windows/wsl/filesystems) | 微軟官方文件（持續更新） |
| WSL2 真 kernel／ELF／interop | [Wikipedia — Windows Subsystem for Linux](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) | 條目持續更新 |
| WSL interop（叫 Windows exe） | [wsl.dev — Interop](https://wsl.dev/technical-documentation/interop/) | 社群技術文件 |
| WSL vhdx 位置與自管變動 | [Microsoft Learn — Manage WSL disk space](https://learn.microsoft.com/en-us/windows/wsl/disk-space) | 微軟官方；商店版 WSL 1.0＝2022-11 |

## 相關筆記

- 環境變數與 PATH：[[environment-variables-basics]]
- venv 的 Scripts/bin 慣例：[[PowerShell-啟動venv與點斜線安全機制]]
- C 槽清理：[[系統維護-C槽清理]]
