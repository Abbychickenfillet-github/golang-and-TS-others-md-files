---
title: Linux 清理與套件指令速查（rm / apt / pip cache / var）
type: concept-note
tags: [linux, cli, 清理, apt, pip, rm, var, 檔案系統]
updated: 2026-07-17
---

# Linux 清理與套件指令速查（rm / apt / pip cache / var）

> 🔖 **本篇重點索引：a–h，共 8 個。** 字母只表位置與數量，沒有優先順序。
> 這些是清 Linux 沙箱／WSL 空間時常用到的概念，延伸自 [[usr-Unix系統資源]]。

## (a) `/var` = variable（會變動的資料）

**是的**，`/var` 的 `var` 就是 **variable（變動）**：<mark style="background: #FFF3A3A6;">存放系統運作中會「一直被寫入、成長、清掉」的檔案</mark>，跟 `/usr`（靜態、唯讀）正好相反。

| /var 子目錄 | 放什麼 |
|---|---|
| `/var/log` | <mark style="background: #ADCCFFA6;">日誌檔</mark>（系統／服務的 log） |
| `/var/cache` | <mark style="background: #FFB8EBA6;">快取</mark>（可安全清、會自己重生，如 `apt` 下載包） |
| `/var/spool` | 排隊等處理的資料（列印、郵件佇列） |
| `/var/lib` | 程式運作中的狀態資料（如資料庫檔） |
| `/var/www` | 網站內容（會變動的站台檔） |

> 設計目的：把「會變的」都丟進 `/var`，`/usr` 才能<mark style="background: #BBFABBA6;">唯讀掛載</mark>。所以清空間常從 `/var/cache`、`/var/log` 下手，<mark style="background: #FF5582A6;">不要動 `/usr`</mark>。

## (b) `rm -rf` = remove + recursive + force

<mark style="background: #FFF3A3A6;">`rm` = remove（刪除）。</mark>兩個旗標：

- <mark style="background: #ADCCFFA6;">`-r` = recursive（遞迴）</mark>：連同資料夾**裡面的所有檔案與子資料夾**一起刪（不加 `-r` 不能刪資料夾）。
- <mark style="background: #FF5582A6;">`-f` = force（強制）</mark>：**不詢問**、忽略不存在的檔案、連唯讀檔也直接刪。

所以 `rm -rf <資料夾>` = 「遞迴＋強制」把整個資料夾連內容全刪。<mark style="background: #FF5582A6;">⚠️ 危險：沒有回收桶、不會問你、刪了就沒了。</mark>執行前務必看清楚路徑，尤其別對 `/`、`/usr`、`~` 亂用。

## (c) `apt` = Advanced Package Tool（Debian／Ubuntu 的套件管理員）

<mark style="background: #ADCCFFA6;">apt = Debian／Ubuntu 系統的「應用程式商店」指令</mark>：自動幫你**下載、安裝、更新、移除**軟體套件，並處理相依套件。它是底層 `dpkg` 的前端，套件格式是 `.deb`。

- 常用：`apt update`（更新套件清單）、`apt install <套件>`、`apt remove <套件>`。
- <mark style="background: #FFB8EBA6;">「apt 下載的安裝包」</mark>指的是它下載後<mark style="background: #FFF3A3A6;">快取在 `/var/cache/apt/archives/` 的 `.deb` 檔</mark>。清掉這些 `.deb`（`apt clean`）<mark style="background: #BBFABBA6;">不會把已安裝的軟體移除</mark>——只是刪掉「安裝時下載的原始包」，需要時會再抓。

## (d) `pip cache purge` = 清除 pip 的下載快取

你的疑問很合理：<mark style="background: #FFF3A3A6;">`pip` 是 Python 的套件安裝器</mark>（會去下載並安裝套件）。但它下載的東西會<mark style="background: #ADCCFFA6;">存一份在本地快取</mark>，下次裝同一個就不用重抓。

- `pip cache` 是**管理那個快取**的子指令；<mark style="background: #FF5582A6;">`purge` = 清空</mark>整個 wheel + HTTP 下載快取。
- <mark style="background: #BBFABBA6;">只刪快取，不會移除你已安裝的套件。</mark>所以我當時用它就是「清出空間」的意思，不是下載。
- 相關：`pip cache info`（看快取大小/位置）、`pip cache list`、`pip cache remove <名>`。

> 一句話對照：<mark style="background: #FFF3A3A6;">pip 會下載也會快取；`cache purge` 是把那份快取清掉</mark>。就像 apt 的 `.deb` 快取一樣，刪了不影響已裝好的東西。

## (e) 這些指令要用哪個終端機跑？（CMD／PowerShell／Git Bash／WSL）

| 指令 | 能在哪跑 | 說明 |
|---|---|---|
| `pip cache purge`、`pip install` | <mark style="background: #BBFABBA6;">CMD／PowerShell／Git Bash／WSL 都行</mark> | `pip` 是<mark style="background: #ADCCFFA6;">跨平台</mark>的，只要有裝 Python 就能跑。 |
| `rm -rf` | <mark style="background: #FFB8EBA6;">Git Bash／WSL／Linux</mark>（Linux 指令） | PowerShell 有 `rm` 別名但選項不同；CMD 要用 `del`／`rmdir`。想用 `rm -rf` 就開 Git Bash 或 WSL。 |
| `apt`、`/var`、`/usr` | <mark style="background: #FF5582A6;">只有 WSL／Linux／容器內</mark> | `apt` 是 Debian/Ubuntu 專屬；Windows 的 CMD/PowerShell **沒有** `apt`。 |

<mark style="background: #FFF3A3A6;">一句話</mark>：純 Linux 的東西（`apt`、`/usr`、`/var`）→ 開 **WSL（Ubuntu）** 或進 **容器**；跨平台的 `pip` → 哪個終端機都行。你不熟的話，最安全：需要 Linux 指令時就開 WSL 終端機。

## (f) 目的是什麼？我可以自己清「那個 Linux 沙箱」嗎？

- <mark style="background: #FFF3A3A6;">目的</mark>：清出磁碟空間，但只清「快取／暫存／下載包」這種**會自己重生**的東西，**不動作業系統本體**（`/usr`）。
- <mark style="background: #FF5582A6;">釐清</mark>：我之前清的「Linux 沙箱」是 **Claude 自己在用的隔離環境，不在你電腦上**，你碰不到、也不用管，它每次都會重置。
- <mark style="background: #BBFABBA6;">你自己該清的是</mark>：① Docker 佔用（`docker system prune`、壓縮 `ext4.vhdx`，見 [[系統維護-C槽清理]]）；② WSL 磁碟；③ C 槽暫存。**時機**：C 槽快滿時——你本來就有排程 `weekly-c-drive-check`（每週日）會提醒，真的要清再動手。

## (g) distro 是什麼？（白話）

<mark style="background: #ADCCFFA6;">distro = distribution（發行版）的縮寫</mark>，白話就是「一整套包裝好、可以直接用的 Linux 系統」，例如 **Ubuntu、Debian、Fedora**。

> 比喻：Linux 核心（kernel）是引擎；distro 是把引擎＋輪子＋內裝組好的<mark style="background: #FFF3A3A6;">整台車</mark>。Ubuntu、Fedora 就是不同「品牌」的車。你在 `wsl -l -v` 看到的名字（`Ubuntu`、`docker-desktop`）就是你裝了哪些 distro。

## (h) 「站台內容」到底是誰的？

<mark style="background: #FF5582A6;">是你自己網站的檔案，不是套件的官網。</mark>「站台內容（site content）」＝網頁伺服器要送給訪客看的檔案，也就是<mark style="background: #FFF3A3A6;">你前端 build 出來的 `index.html`、CSS、JS</mark>（你的專案產物）。放在 `/usr/share/nginx/html` 或 `/var/www/html` 的，就是「**你的網站**要被瀏覽的內容」，跟 nginx 官網無關。

> 對照：nginx **程式本體** 在 `/usr/bin/nginx`（工具）；你的**網站檔案**（站台內容）被放到它的網站根目錄由它送出。

## 資料來源（含查證時間）

> 查證日期：2026-07-17

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| /var 變動資料 | [FHS 3.0 — The /var Hierarchy](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch05.html) | FHS 3.0，2015-06 |
| rm -r／-f 選項 | [GNU Coreutils — rm invocation](https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html) | coreutils 9.11 手冊 |
| apt 是什麼 | [Debian Wiki — Apt](https://wiki.debian.org/Apt)、[Wikipedia — APT (software)](https://en.wikipedia.org/wiki/APT_(software)) | 持續更新 |
| pip cache purge | [pip 官方文件 — pip cache](https://pip.pypa.io/en/stable/cli/pip_cache/) | pip v26.1.2 文件 |
| 終端機與 WSL | [Microsoft Learn — Working across Windows and Linux file systems](https://learn.microsoft.com/en-us/windows/wsl/filesystems) | 微軟官方（持續更新） |
| distro（發行版） | [Wikipedia — Linux distribution](https://en.wikipedia.org/wiki/Linux_distribution) | 條目持續更新 |

> 誠實標註：(e)(g)(h) 屬一般 Linux 常識整理，上面兩條為延伸閱讀，非逐字引用。

## 相關筆記

- 系統目錄與 /usr：[[usr-Unix系統資源]]
- C 槽清理：[[系統維護-C槽清理]]
