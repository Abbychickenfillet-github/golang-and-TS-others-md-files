---
title: Unix 與類 Unix 系統介紹
type: topic-note
source: Gemini
tags: [gemini, 作業系統, unix, linux, macos, bsd]
sources:
  - https://gemini.google.com/app/99bcb912540d69c8
  - https://gemini.google.com/app/954863faf2a234f5
  - https://gemini.google.com/app/934dbe472fd8e85c
updated: 2026-09-09
---

# Unix 與類 Unix 系統介紹

## 重點整理

Unix 家族可分成兩大類：經官方認證的<mark style="background: #ADCCFFA6;">「正統 Unix」</mark>，以及行為高度相似但法理上不能叫 Unix 的<mark style="background: #ADCCFFA6;">「類 Unix（Unix-like）」</mark>。個人電腦最常見的是 Windows，但伺服器、工程工作站與蘋果生態系都是 Unix 家族的天下。

### 1. 蘋果 Apple（macOS / iOS）該看鳥哥網站
鮮為人知：<mark style="background: #FFF3A3A6;">Mac 是目前世上發行量最大的官方認證 Unix 系統</mark>。

- 核心叫 <mark style="background: #ADCCFFA6;">Darwin</mark>，以 <mark style="background: #ADCCFFA6;">BSD</mark>（著名 Unix 分支）＋ Mach 微核心為基礎。
- 通過 The Open Group 的 UNIX 認證（UNIX 03 合規），所以 MacBook、iMac、Mac mini／Studio 本質上都是 Unix 電腦。

### 2. 傳統企業級 Unix 工作站／伺服器
由科技巨頭為高效能運算或企業伺服器開發，多採非 x86 的專屬處理器：

- **IBM AIX**：跑在 IBM Power 系統上，廣用於銀行、金融、大型企業核心系統。
- **Oracle Solaris**（原 Sun Microsystems）：學術界與大型網路伺服器名系統，跑在 SPARC 或 x86。
- **HP-UX**：HP 為其專有伺服器開發的 Unix。

### 3. 類 Unix：Linux 家族
Linux 因商標與授權原因不能直接叫 Unix，但<mark style="background: #FFF3A3A6;">完全模仿 Unix 的架構與哲學</mark>，現今絕大多數伺服器都跑 Linux。

- 常見發行版：Ubuntu、Debian、CentOS、RHEL（Red Hat）、Alpine Linux 等。
- 載體：雲端與企業伺服器、容器（Docker 映像常用 Alpine／Debian）、嵌入式裝置等。

> [!info] 一句話
> macOS＝有認證的正統 Unix；Linux＝沒掛 Unix 商標但骨子裡是 Unix 的類 Unix；兩者都遵循 Unix 哲學，所以指令與操作手感相通。

---

## 追加 2026-09-09：`/usr` 到底是什麼——它不是「使用者資料夾」

> [!danger]+ 最大的誤會先破除
> <mark style="background: #FF5582A6;">`/usr` 不是 Windows 的「使用者」資料夾</mark>。名字長得像，內容卻剛好相反。Unix 上真正對應 Windows `C:\Users\你的帳號` 的是 <mark style="background: #BBFABBA6;">`/home/你的帳號`</mark>（macOS 上是 `/Users/你的帳號`）。

### `/usr` 的名字由來與定位

- <mark style="background: #ADCCFFA6;">FHS＝Filesystem Hierarchy Standard（檔案系統階層標準）</mark>，由 Linux Foundation 維護，規定 Linux／類 Unix 系統上每個頂層目錄該放什麼。現行版本是 FHS 3.0。
- `/usr` 這個名字在歷史上有兩種解釋：<mark style="background: #FFB8EBA6;">UNIX Source Repository（Unix 原始碼倉庫）</mark>與 <mark style="background: #FFB8EBA6;">UNIX System Resources（Unix 系統資源）</mark>。早期它確實曾是放使用者家目錄的地方，後來家目錄被搬到 `/home`，`/usr` 就轉型成「系統資源」。
- FHS 對 `/usr` 的定義是 <mark style="background: #FFF3A3A6;">shareable, read-only data（可共享、唯讀的資料）</mark>——放的是<mark style="background: #BBFABBA6;">系統上所有使用者共用</mark>的程式、函式庫與文件，例如 `curl`、`git` 這些工具。
- 為什麼是唯讀？因為 FHS 刻意把<mark style="background: #ADCCFFA6;">靜態檔案</mark>與<mark style="background: #ADCCFFA6;">會變動的檔案</mark>分開：會變動的全部搬去 `/var`，剩下的 `/usr` 就可以掛成唯讀、甚至放在唯讀媒體上，也不必跟著變動資料一起備份。開機不需要的東西才放這裡（開機必需的在 `/bin`、`/sbin`、`/lib`）。

### 對照表：`/usr` vs Windows 使用者目錄

| | Unix `/usr` | Windows `C:\Users\<帳號>` |
|---|---|---|
| 屬於誰 | <mark style="background: #FFF3A3A6;">全系統所有使用者共用</mark> | <mark style="background: #FFF3A3A6;">特定單一使用者專屬</mark> |
| 放什麼 | 共用程式、函式庫、標頭檔、說明文件 | 個人文件、下載檔案、應用程式的個人設定 |
| 可寫性 | FHS 規定為唯讀（安裝套件時才由套件管理員寫入） | 該使用者可自由讀寫 |
| 真正的對應者 | 對應 Windows 的 `C:\Program Files` 與 `C:\Windows\System32` | 對應 Unix 的 `/home/<帳號>`（macOS 為 `/Users/<帳號>`） |

### `/usr` 底下的常見子目錄

| 路徑 | 放什麼 |
|---|---|
| `/usr/bin` | 一般使用者可執行的指令（`git`、`curl`、`python3`） |
| `/usr/sbin` | 系統管理用的指令 |
| `/usr/lib` | 程式用到的函式庫 |
| `/usr/share` | 與架構無關的共用資料（說明文件、圖示、語系檔） |
| `/usr/include` | C／C++ 的標頭檔 |
| `/usr/local` | <mark style="background: #BBFABBA6;">你自己手動編譯安裝</mark>的軟體，跟套件管理員裝的分開放，避免升級時被覆蓋 |

> [!tip]+ 在 WSL 與 macOS 上的實際體感
> 在 WSL（Windows Subsystem for Linux）裡 `ls /usr/bin` 看到的是 Linux 那套工具，跟 Windows 的 `C:\Windows\System32` 是<mark style="background: #FF5582A6;">兩套完全獨立</mark>的東西——WSL 有自己的完整 Linux 檔案系統。要從 Linux 側去呼叫 Windows 程式，走的是 interop 機制，見 [[WSL-interop-從Linux叫Windows程式]]。macOS 因為是正統 Unix，`/usr` 的結構與 Linux 幾乎一致，但蘋果自己的東西放在 `/System` 與 `/Library`。

> [!warning]+ ⚠️ 該次對話品質備註
> 這是一段<mark style="background: #FF5582A6;">語音對話，只有一問一答，內容非常精簡</mark>。Gemini 講的方向正確（`/usr` 是全使用者共用、Windows 使用者目錄是個人專屬），但<mark style="background: #D2B3FFA6;">沒有提到 FHS 標準、沒有提到 `/home` 才是真正的對應者、也沒說 `/usr` 是唯讀</mark>。以上補充是查 FHS 官方規格後另外補的，來源見文末表格。

---

## 追加 2026-09-28：System V — 不只是舊版 Unix，更是現代系統的底層規範

> [!info]+ 一句話
> <mark style="background: #ADCCFFA6;">System V（唸作 System Five，簡寫 SysV）</mark>是 1983 年 AT&T 貝爾實驗室推出的官方商業版 UNIX，跟柏克萊 BSD 是當年 UNIX 戰爭的兩大陣營；今天的 Linux／macOS 把兩邊的底層機制都繼承了下來，所以現代系統裡常常同時看到「System V 某某」這種命名。

### a. System V 的歷史定位
AT&T 主導、商業化標準化導向；對手是加州柏克萊大學主導、開源學術派的 <mark style="background: #ADCCFFA6;">BSD</mark>（率先引進 TCP/IP 網路架構）。現代 Linux 與類 Unix 系統（含本篇 macOS）把兩邊的底層機制都吸收繼承下來，這正是 [[Unix-與類Unix系統介紹|上面]] macOS／Linux 家族分類背後的歷史根源。

### b. System V IPC（Inter-Process Communication，跨程序通訊機制）
Linux／Unix 中程序（Process）之間交換資料的經典三件套：

| 機制 | 用途 |
|---|---|
| Message Queuing（訊息佇列） | 讓不同程序傳送結構化訊息 |
| Semaphore（號誌／信號量） | 多程序間的同步與鎖（Lock） |
| Shared Memory（共用記憶體） | 多程序直接共享同一塊記憶體位址，效率最高的 IPC 方式 |

### c. System V Init（傳統開機啟動流程）
在 `systemd` 出現以前，傳統 Linux 用的開機管理系統叫 <mark style="background: #ADCCFFA6;">SysV init</mark>：提出 <mark style="background: #FFF3A3A6;">Runlevel（執行等級 0～6）</mark>概念（如 3 是純文字模式、5 是圖形介面），啟動腳本放在 `/etc/init.d/`，用 `start`／`stop`／`restart` 控制服務。

### d. System V ABI（Application Binary Interface，二進位介面規範）
定義 CPU 暫存器如何傳遞函式參數、記憶體如何對齊、執行檔（ELF）格式規範，是現代 Linux、macOS 等平台的硬體溝通標準；細節（尤其是浮點數走哪個暫存器）見 [[Elision語法標記與System-V-ABI暫存器傳遞慣例]]。

> 來源對話：[解析 JS 規格中的 Elision opt](https://gemini.google.com/app/934dbe472fd8e85c)（2026-09-28，對話後段追問到 System V ABI／System V 本身，與 Elision 語法標記無直接關聯，記在這裡與 Unix 分類互相呼應）

---

## 各對話來源

### /usr 目錄在 Mac 與 WSL（2026-09）— https://gemini.google.com/app/954863faf2a234f5

使用者：在 Unix system resources 裡面會放的東西，跟在 Windows user 裡面放的東西有什麼差異，直接講。

Gemini：Unix 系統資源目錄也就是 `/usr`，主要存放系統內所有使用者共用的程式、函式庫與文件，例如 `curl` 或 `git` 等等工具。而 Windows 使用者目錄則是專屬於特定使用者的個人空間，用來存放個人文件、下載的檔案以及特定應用程式的設定檔。

### Unix 與類 Unix 電腦介紹（2026-06）— https://gemini.google.com/app/99bcb912540d69c8

使用者：Unix 系統的電腦有哪些

Gemini：分兩大類——正統 Unix（Commercial Unix）與類 Unix（Unix-like）。①蘋果 macOS/iOS：核心 Darwin（BSD＋Mach），通過 The Open Group UNIX 認證，是發行量最大的正統 Unix，Mac 全系列皆屬之。②企業級：IBM AIX（Power）、Oracle Solaris（SPARC/x86）、HP-UX。③類 Unix Linux 家族：Ubuntu/Debian/CentOS/RHEL/Alpine，因商標授權不能叫 Unix 但完全模仿其架構與哲學，絕大多數伺服器都跑 Linux。

去看完
https://linux.vbird.org/linux_basic/centos7/

---

### 解析 JS 規格中的 Elision opt（System V 段落，2026-09-28）— https://gemini.google.com/app/934dbe472fd8e85c

使用者：「System V」索引system v是什麼

Gemini：System V（簡寫 SysV）是 UNIX 歷史上極具影響力的作業系統版本，1983 年由 AT&T 推出，成為當時 Unix 世界的官方商業標準，與柏克萊 BSD 分庭抗禮。現代電腦科學中提到 System V，通常指它留下的底層規範：System V IPC（訊息佇列／號誌／共用記憶體）、System V Init（傳統開機 Runlevel 機制）、System V ABI（CPU 暫存器如何傳參數、記憶體對齊、ELF 執行檔格式規範）。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：Unix 與類 Unix 電腦介紹 | https://gemini.google.com/app/99bcb912540d69c8 | 對話整理於 2026-06-19 |
| Gemini 對話：/usr 目錄在 Mac 與 WSL | https://gemini.google.com/app/954863faf2a234f5 | 對話擷取於 2026-09-09 |
| FHS 3.0 規格書（`/usr` 為 shareable、read-only） | https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.pdf | FHS 3.0，2015-06-03 發布；查證於 2026-09-09 |
| FHS：The /usr Hierarchy（子目錄逐項定義） | https://specifications.freedesktop.org/fhs/latest/usrHierarchy.html | 現行版本；查證於 2026-09-09 |
| Red Hat：FHS 概覽（靜態／變動檔案分離的理由） | https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/5/html/deployment_guide/s1-filesystem-fhs | 查證於 2026-09-09 |
| Ubuntu：Filesystem Hierarchy Standard 說明 | https://ubuntu.com/project/docs/how-ubuntu-is-made/concepts/filesystem-hierarchy-standard/ | 查證於 2026-09-09 |
| `/usr` 名稱由來（UNIX Source Repository／System Resources） | https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard | 查證於 2026-09-09 |
| Gemini 對話：解析 JS 規格中的 Elision opt（System V 部分） | https://gemini.google.com/app/934dbe472fd8e85c | 對話擷取於 2026-09-28 |
