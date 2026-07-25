---
title: WSL 版本歷史與 System Call／RISC 底層原理
type: topic-note
source: Gemini
tags: [gemini, wsl, linux, kernel, system-call, risc, glibc, posix]
sources:
  - https://gemini.google.com/app/e904a0ca68a5c3e4
updated: 2026-07-18
---

# WSL 版本歷史與 System Call／RISC 底層原理

> 🔖 本篇重點索引：a–p，共 16 個。

## 重點整理

### 一、WSL 版本號與安裝的常見誤解

**(a)** Windows 的版本號（Build Number，如 14316）是<mark style="background: #ADCCFFA6;">流水號（遞增計數）</mark>，不是亂數。每次微軟工程師編譯打包，數字就往上加一次；數字越大代表版本越新，例如 Windows 11 時代的版本號已是 22000、22621 以上。

**(b)** <mark style="background: #FFF3A3A6;">WSL 的「Beta」歷史</mark>：2016 年 Windows 10（1607 版）推出時叫 "Bash on Ubuntu on Windows"，標記為 Beta（測試版）；到 2017 年 Windows 10（1709 版）才正式拿掉 Beta 標籤，成為正式功能。

**(c)** <mark style="background: #FF5582A6;">常見誤解澄清</mark>：Windows 11 所謂「WSL 預設安裝」，指的只是 `wsl.exe` 這個主程式／指令工具內建在系統裡，並不代表 Linux 發行版（如 Ubuntu）已經裝好。使用者仍必須手動執行 `wsl --install` 之類指令才會真正下載發行版；不是店員或原廠預先幫忙裝好的。

### 二、System Call（系統呼叫）是什麼

**(d)** <mark style="background: #ADCCFFA6;">System Call</mark> 是應用程式（User Space）與作業系統核心（Kernel Space）之間的「服務櫃檯」。應用程式權限低，不能直接操作硬體，必須透過 System Call 向核心提出申請。比喻：應用程式是民眾，硬體資源是銀行金庫，System Call 就是需要行員（核心）蓋章才能領錢的申請櫃檯。

**(e)** <mark style="background: #FFB8EBA6;">常見 Linux System Calls</mark>：檔案讀寫 `open()`、`read()`、`write()`、`close()`；建立與執行程式 `fork()`、`execve()`；網路 `socket()`、`connect()`。

**(f)** <mark style="background: #D2B3FFA6;">Windows Kernel 補充</mark>：Windows 採「混合核心（Hybrid Kernel）」架構，源自 NT 核心。為了效能，把 GUI／視窗管理／大量驅動程式塞進核心空間，跟純粹的微核心（Microkernel）設計不同。

### 三、System Call 與 RISC（硬體指令集）的分工

**(g)** <mark style="background: #ADCCFFA6;">兩者的分工</mark>：System Call 是軟體規範（定義應用程式怎麼跟 OS 要資源），RISC（如 ARM、RISC-V）是硬體規範（CPU 電路唯一看得懂的機器碼指令）。呼叫一次 System Call，最終會被編譯器拆成一串 RISC 指令（把參數搬進暫存器、執行 `ecall` 或 `svc` 觸發核心模式切換）。

**(h)** <mark style="background: #FFF3A3A6;">執行流程圖</mark>（應用程式 → glibc → System Call → RISC → 硬體）：

```
使用者空間 User Space
  [1. 應用程式]（如 Python/C++ 想寫入檔案）
        │
        ▼
  [2. glibc 標準函式庫]（封裝細節，呼叫 write()）
        │ 3. 發動 System Call（服務編號如 64 塞進暫存器，觸發 ecall/svc）
────────────────────────────［權限隔離邊界］────────────────────────────
核心空間 Kernel Space
  [4. 核心接手，檢查權限、操作硬體驅動]
        │ 5. 核心程式碼本身也是 RISC 指令
        │ 6. 把編譯後的 RISC 機器指令丟進硬體
        ▼
硬體層 Hardware
  [7. RISC CPU 核心]（只認得暫存器操作、記憶體搬移與運算）
        │
        ▼
  [8. 實體硬體周邊] → 順利寫入 SSD／快閃記憶體
```

餐廳比喻：System Call 是「菜單上的中文字」（點一盤炒飯），RISC 指令集是「廚師切菜、開火、翻鍋的具體小動作」——不論點什麼菜，進廚房都要拆成最基礎的 RISC 動作執行。

**(i)** <mark style="background: #FF5582A6;">釐清誤解</mark>：不是「System Call 做完才輪到 RISC」，而是 System Call 的內部程式碼本身就是由一堆 RISC 指令組成的。System Call 是軟體概念（介面／API），RISC 是物理現實（CPU 唯一聽得懂的語言）；不論是 User Space 的 App 還是 Kernel Space 的作業系統，只要在 CPU 上跑就必須是 RISC 指令。以 RISC-V 為例的微觀時序：App 把 `write()` 拆成 RISC 指令（如 `li a7, 64`）→ 執行 `ecall` 觸發切換 → CPU 切成核心模式並跳轉到核心程式碼 → 核心執行（同樣是 RISC 指令）→ 執行 `sret` 返回，CPU 切回低權限。

**(j)** <mark style="background: #ADCCFFA6;">User Stack 與 Kernel Stack 是兩個獨立的呼叫堆疊</mark>：這是為了防止使用者程式透過 Stack Overflow 篡改核心記憶體，兩者被完全隔離。User Stack 存放應用程式自己 function 呼叫的區域變數與返回位址；Kernel Stack 是每個行程在核心空間專屬、私密且很小的堆疊。

**(k)** <mark style="background: #FFB8EBA6;">Trap Frame（現場封存）機制</mark>：觸發硬體中斷指令進核心時，CPU 立刻把 Stack Pointer 從 User Stack 切到 Kernel Stack；核心第一步是把剛才 App 用到一半的暫存器狀態、程式執行位址（PC）封存成 Trap Frame 推入 Kernel Stack；核心在 Kernel Stack 上建立自己的 Stack Frame 執行 `sys_write()` 等函式，這段期間 User Stack 被凍結；System Call 辦完後，核心從 Kernel Stack 彈出剛才封存的狀態，Stack Pointer 切回 User Stack，程式像沒發生過一樣繼續往下跑。

**(l)** <mark style="background: #D2B3FFA6;">glibc</mark> = GNU C Library：Linux 系統最核心的底層函式庫之一，實作 C 語言標準函式庫（`printf()`、`malloc()`），也封裝負責呼叫 Linux System Calls 的那層 API（`open()`、`write()`）。不論用 Python、Node.js 還是 Go，在 Linux 上底層通常都極度依賴 glibc 跟核心打交道。

### 四、WSL2 虛擬化與 POSIX 演進史

**(m)** <mark style="background: #ADCCFFA6;">WSL2 利用 Hyper-V 輕量化虛擬機（Lightweight Utility VM）</mark>，跟傳統肥大虛擬機（VirtualBox／傳統 Hyper-V）不同：啟動只要 1～2 秒（不必等 BIOS／開機）；動態記憶體，Linux 用多少 Windows 才給多少，不用時自動歸還。

**(n)** <mark style="background: #FF5582A6;">被棄用的是「Windows POSIX 子系統（SUA）」，不是 POSIX 標準本身</mark>：POSIX 自 1980 年代出現後，全世界工程師圍繞它寫了無數程式（所有 Linux/Unix 工具）；舊的 Windows POSIX 子系統因難用、功能殘缺，微軟在 Windows 8.1 徹底砍掉。WSL 的目標是「重新提供一個完美的 POSIX/Linux 環境」：WSL 1 用軟體翻譯迎合 Linux System Calls，但 Linux 發展太快、相容性始終不完美；WSL 2 索性放棄翻譯，直接塞一個真正的 Linux 核心進去。所以 POSIX 生態從未真正被 Windows 原生環境取代或吞下，微軟最後是「打不過就加入」。

**(o)** <mark style="background: #FFF3A3A6;">WSL 1 vs WSL 2 的本質差異</mark>：WSL 1 是「翻譯官」，每次呼叫 Linux System Call 都硬翻成 Windows 核心聽得懂的指令；WSL 2 不翻譯了，直接用虛擬化技術在 Windows 內部塞進一個真正完整的 Linux Kernel，因此相容性與速度大幅提升。

**(p)** <mark style="background: #FFB8EBA6;">Project Astoria 的曲折歷史</mark>：微軟原本想讓 Android App 能在 Windows 10 Mobile 上跑（Project Astoria），做出一套「System Call 翻譯機」。2016 年初被高層全面叫停，原因有三：⑴ 與另一專案 Project Islandwood（移植 iOS App）路線衝突，且若能直接裝 Android 版，開發者更不願寫原生 Windows App；⑵ 即時翻譯法律與技術邊界模糊，Android 模擬層讓系統臃腫、容易有安全漏洞；⑶ Android App 依賴 Google Play 服務（地圖、推播），微軟手機上沒有，App 容易閃退。專案與 Windows 手機部門一起收掉後，寫出翻譯機的工程師把技術改包裝到 PC 上，變成 Windows 10 build 14316 裡第一次出現的 WSL 1。

## 各對話來源

### WSL 版本號、Beta 與預設安裝 → System Call／RISC／glibc／WSL2／POSIX 全紀錄（2026-07）— https://gemini.google.com/app/e904a0ca68a5c3e4

使用者：你說了「最後在 Windows 8.1 發佈時被棄用……」所以 POSIX 被棄用了呀但我的理解是後面出現的 WSL 其實也並未完全取代它……這些版本號 14316 是流水還是亂數生成？WSL Beta 是 wsl 測試版的意思嗎？「The WSL command-line interface tool is installed by default in Windows 11……」我記得我沒有預先下載過，還是說這個是買電腦的時候人員會先幫我安裝好？

Gemini：（見上方重點 a–c）版本號是流水號；WSL 2016 年為 Beta、2017 年轉正式；Windows 11 只是內建主程式，發行版仍需手動安裝，不是店員代裝。

使用者：Linux System calls 是什麼？簡單介紹 Windows kernel。

Gemini：（見上方重點 d–f）System Call 是 User Space 與 Kernel Space 之間的服務櫃檯；列出常見 Linux System Calls；Windows Kernel 為混合核心架構。

使用者：那 RISC 精簡指令集在這又算是什麼？畫流程圖給我。

Gemini：（見上方重點 g–h）RISC 是硬體規範，System Call 最終被拆成 RISC 指令；附上應用程式到 RISC CPU 的完整執行流程圖。

使用者：我再確認一次 system calls 是軟體層級的指令，他做完才會換 RISC？System calls 跟 call stack 在記憶體的關係是？

Gemini：（見上方重點 i–k）澄清 System Call 本身就是由 RISC 指令組成，非「做完才換」；說明 User Stack／Kernel Stack 隔離與 Trap Frame 封存機制。

使用者：Glibc stands for what。

Gemini：（見上方重點 l）glibc = GNU C Library。

使用者：WSL2 是利用了虛擬機的技術……（後續詢問 POSIX 未被完全取代、Project Astoria 歷史）

Gemini：（見上方重點 m–p）WSL2 用 Hyper-V 輕量虛擬機；釐清被棄用的是 Windows POSIX 子系統而非 POSIX 標準；WSL1 vs WSL2 本質差異；Project Astoria 的曲折歷史與如何轉生成 WSL 1。

## 資料來源（含查證時間）

> 查證日期：2026-07-18（下列為 Gemini 回覆中實際引用或可查證的來源，供你判斷新舊、避免過時或杜撰）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| WSL 歷史（Beta 起訖、Project Astoria、版本號） | [Wikipedia — Windows Subsystem for Linux](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) | 條目持續更新 |
| glibc 定義 | Gemini 回覆中提及 Baeldung、Wikipedia 為參考來源（本次未取得可直接點擊的原始連結，建議日後自行以「glibc GNU C Library」查證） | — |

⚠️ 存疑／更正：本篇 System Call／RISC／Trap Frame 的微觀時序（如暫存器編號、`ecall`/`svc` 用法）是 Gemini 依通用作業系統原理生成的教學說明，並非逐行引用官方规格書；細節與特定 CPU 架構的官方手冊可能有出入，作為概念理解足够，若要用於精確技術面試作答，建議另外查 RISC-V 官方 ISA 手冊或 Linux kernel 文件核對。

## 相關筆記

- 與 CLI 資料夾中「WSL 從 Linux 叫 Windows 程式（interop）」屬同一系列但不同主題（一個講底層核心原理，一個講跨系統呼叫）：[[WSL-interop-從Linux叫Windows程式]]（因兩篇主題不同，未合併）
- `/usr` 目錄與 WSL 檔案系統位置：[[usr-Unix系統資源]]
