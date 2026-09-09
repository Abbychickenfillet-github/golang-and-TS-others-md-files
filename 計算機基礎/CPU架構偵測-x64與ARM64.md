---
title: "CPU 架構偵測｜x64 與 ARM64、AMD64 這個名字的由來、PowerShell 與 CMD 的變數語法差異"
type: topic-note
source: Gemini
tags: [gemini, isa, x86-64, amd64, arm64, powershell, cmd, uname, wow64, 計算機基礎, 環境變數]
sources:
  - https://gemini.google.com/app/68acc28655502fa4
  - https://gemini.google.com/app/f00083e09ec02fa5
  - https://gemini.google.com/app/6ecdf62c2ff52863
updated: 2026-09-07
---

# CPU 架構偵測｜x64 與 ARM64、AMD64 這個名字的由來

> [!info] 本篇重點 a–v 共 22 個
> 起因是要更新一個軟體，不確定該下載 x64 還是 ARM64 版。順著查下去把 <mark style="background: #FFF3A3A6;">ISA 是什麼</mark>、<mark style="background: #FFF3A3A6;">AMD64 為什麼叫 AMD</mark>、<mark style="background: #FFF3A3A6;">CMD 與 PowerShell 讀環境變數的語法為何不同</mark> 一次搞清楚。

> [!info] 與其他筆記的關聯（附理由）
> **a.** 承接 [[WSL版本歷史與System-Call-RISC底層原理]]：那篇講 RISC 與 CISC 的設計哲學差異，本篇是它的「實務面」——你桌上這台到底是哪一派，怎麼問出來。
> **b.** 呼應 [[x86通用暫存器與Register-in-Opcode編碼]] 與 [[x86組合語言助憶符字典-How-Assembly-Functions-Work範例]]：那兩篇拆的是 x86 這個 ISA 的內部細節，本篇處理的是「x86 與 ARM 這兩個 ISA 怎麼分辨」，是它們的上層分類。
> **c.** 呼應 [[CPU字長-TINYINT型別與OpenAPI資安雜記]]：「64 位元」這個詞在本篇跟那篇是同一個概念（字長 word size），可以互相對照。
> **d.** 呼應 [[CLI/powershell-vs-bash]]：本篇 l–n 節那個 `%VAR%` vs `$env:VAR` 的踩坑，正是那篇「設計哲學不同」的具體案例。（另有一個 `CLI/Bash-vs-PowerShell設計哲學差異md` 檔案<mark style="background: #FF5582A6;">漏打了副檔名的那一點</mark>，導致 Obsidian 認不得也連不到，建議改名成 `Bash-vs-PowerShell設計哲學差異.md`。）
> **e.** 呼應 [[build-and-compilation/編輯器與執行環境-VSCode是Electron與Toolchain]]：知道架構之後才知道該下載哪個版本的 SDK 或 runtime，兩篇是同一條決策鏈。

---

## 名詞先攤開（f–h）

> [!info] 縮寫全名
> **f. ISA（Instruction Set Architecture，指令集架構）**——CPU 對外公開的「合約」：它認得哪些機器指令、有哪些暫存器、記憶體怎麼定址、位元組順序是大端還小端。<mark style="background: #ADCCFFA6;">同一個 ISA 的程式碼可以在任何實作該 ISA 的 CPU 上跑，不同 ISA 之間的二進位檔完全不相容</mark>。x86-64 與 ARM64 就是兩個不同的 ISA。
>
> **g. x86-64 / x64 / AMD64 / Intel 64**——<mark style="background: #FFB8EBA6;">這四個是同一件事的四個名字</mark>。它是 x86 這個 32 位元 ISA 的 64 位元延伸。之所以叫 **AMD64**，是因為這套 64 位元延伸是 **AMD 在 2000 年提出、2003 年隨 Opteron 出貨的**，Intel 後來才跟進實作（Intel 官方叫它 Intel 64）。Windows 沿用了 AMD 的原始名稱，所以你在 Windows 上查出來會看到 `AMD64`，即使你的 CPU 是 Intel 的也一樣。
>
> **h. ARM64 / AArch64**——ARM 架構的 64 位元執行狀態，官方正式名稱是 **AArch64**（ARMv8-A 起引入）。Linux 的 `uname -m` 顯示 `aarch64`，macOS 與 Windows 習慣顯示 `arm64`。代表產品是 Apple M 系列與高通 Snapdragon X。

<mark style="background: #FF5582A6;">關鍵：x86-64 與 ARM64 的機器指令二進位完全不相容。下載錯版本，Windows 會直接彈「此應用程式無法在您的電腦上執行」。</mark>就像插頭型號不對，硬插不會通電。

---

## 重點整理

### 一、怎麼問出來（i–k）

**i.** 各系統的指令對照：

| 環境 | 指令 | 輸出範例與判讀 |
|---|---|---|
| Windows CMD（命令提示字元） | `echo %PROCESSOR_ARCHITECTURE%` | `AMD64` 代表 x64；`ARM64` 代表 ARM；`x86` 代表 32 位元 |
| Windows PowerShell | `$env:PROCESSOR_ARCHITECTURE` | 同上 |
| Windows PowerShell（另一招） | `[System.Environment]::Is64BitOperatingSystem` | 回傳 `True` 代表作業系統是 64 位元 |
| macOS / Linux / WSL / Git Bash | `uname -m` | `x86_64` 代表 x64；`arm64` 或 `aarch64` 代表 ARM |
| Node.js 程式內 | `require('os').arch()` | 回傳 `'x64'` 或 `'arm64'` |

**j.** Node.js 那招一行一行拆：

```js
const os = require('os');
console.log('當前架構為:', os.arch());
// 在 AMD64 的機器上會輸出 'x64'
```

| 片段 | 意思 |
|---|---|
| `require('os')` | CommonJS 的模組載入語法，把 Node 內建的 `os` 模組抓進來。ESM 寫法是 `import os from 'node:os'` |
| `os.arch()` | 回傳「**Node 這個行程**被編譯成哪個架構」的字串。注意它回的是行程的架構，不見得等於作業系統的架構 |

**k.** <mark style="background: #D2B3FFA6;">為什麼要區分架構</mark>：不同 ISA 決定軟體怎麼編譯。x86-64（Intel／AMD）是桌機與筆電的傳統主流；ARM64（Apple M 系列、Snapdragon X）以省電與效能比著稱。安裝 Node.js、Docker、VS Code 這類開發工具時選對版本，才不會被轉譯層（例如 Apple 的 Rosetta 2、Windows 的 x86 模擬層）吃掉效能。

---

### 二、實際踩到的坑：PowerShell 不吃 `%VAR%`（l–n）

**l.** 對話裡發生的實況：

```powershell
PS C:\Users\User> echo %PROCESSOR_ARCHITECTURE%
%PROCESSOR_ARCHITECTURE%
PS C:\Users\User>
```

<mark style="background: #FF5582A6;">輸入什麼就吐回什麼，因為 PowerShell 根本沒把它當變數</mark>。

**m.** 原因：<mark style="background: #ADCCFFA6;">`%變數名%` 是 CMD（cmd.exe，命令提示字元）的變數展開語法，PowerShell 不認得</mark>。在 PowerShell 眼裡，`%PROCESSOR_ARCHITECTURE%` 只是一串普通字元（`%` 在 PowerShell 裡是 `ForEach-Object` 的別名，但沒有跟著 script block 時就只是符號），`echo`（即 `Write-Output` 的別名）就照原樣印出來。

**n.** 正解：<mark style="background: #BBFABBA6;">PowerShell 用 `$env:` 這個 provider 前綴讀環境變數</mark>。

```powershell
$env:PROCESSOR_ARCHITECTURE
```

| 片段 | 意思 |
|---|---|
| `$` | PowerShell 的變數符號 |
| `env:` | PowerShell 的 **Environment Provider**（環境變數提供者）。PowerShell 把環境變數當成一個像檔案系統的「磁碟機」來存取，所以你也可以打 `Get-ChildItem Env:` 列出全部 |
| `PROCESSOR_ARCHITECTURE` | 變數名稱 |

三種 shell 的速查：

| Shell | 讀環境變數的寫法 |
|---|---|
| CMD | `echo %PROCESSOR_ARCHITECTURE%` |
| PowerShell | `$env:PROCESSOR_ARCHITECTURE` |
| Bash / WSL / Git Bash | `echo $PROCESSOR_ARCHITECTURE` 或直接 `uname -m` |

---

### 三、⚠️ 陷阱：32 位元行程會騙你（o–p）

**o.** <mark style="background: #FF5582A6;">`PROCESSOR_ARCHITECTURE` 回報的是「目前這個行程」的架構，不是「這台機器」的架構</mark>。如果你在 64 位元 Windows 上開了一個 32 位元的 PowerShell（`C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe`），它會回 `x86`，而不是 `AMD64`。

這是 **WOW64（Windows 32-bit On Windows 64-bit）** 子系統造成的：當 64 位元系統建立 32 位元行程時，WOW64 會替它重寫環境變數。

**p.** <mark style="background: #BBFABBA6;">正確的做法是同時看 `PROCESSOR_ARCHITEW6432`</mark>：

```powershell
# 只有在「32 位元行程跑在 64 位元系統上」時，這個變數才存在，內容是機器的真實架構
$env:PROCESSOR_ARCHITEW6432
```

判讀邏輯：

| `PROCESSOR_ARCHITEW6432` | `PROCESSOR_ARCHITECTURE` | 結論 |
|---|---|---|
| 不存在（空值） | `AMD64` | 原生 64 位元行程，機器是 x64 |
| 不存在（空值） | `ARM64` | 原生 ARM64 行程，機器是 ARM64 |
| `AMD64` | `x86` | 機器是 x64，但你開的是 32 位元 shell |
| `ARM64` | `x86` 或 `AMD64` | 機器是 ARM64，你的行程跑在模擬層裡 |

最後那一列是 Windows on ARM 最容易踩的坑：<mark style="background: #FF5582A6;">Windows 11 on ARM 可以模擬執行 x64 程式，所以一個 x64 行程在 ARM64 機器上問 `PROCESSOR_ARCHITECTURE` 會得到 `AMD64`，讓你誤以為機器是 Intel</mark>。

在程式裡最可靠的是呼叫 Win32 API `IsWow64Process2`，它會分別回傳「行程的架構」與「機器的原生架構」。

---

### 四、決策：該下載 x64 還是 ARM64（q–r）

**q.** 對話當下的結論：<mark style="background: #BBFABBA6;">既然 `$env:PROCESSOR_ARCHITECTURE` 輸出 `AMD64`，一律選標示為 x64、x86_64 或 64-bit 的安裝檔</mark>，避開 arm64 與 aarch64。

**r.** 一般性的下載決策表：

| 你查到的值 | 該下載的版本 | 備註 |
|---|---|---|
| `AMD64` 或 `x86_64` | x64 | 不需要任何轉譯層，原生執行效能最佳 |
| `ARM64` 或 `aarch64` | ARM64 | 若某軟體沒出 ARM64 版，Windows 11 on ARM 與 macOS 的 Rosetta 2 通常可模擬 x64，但會損失效能 |
| `x86` | 先確認是不是 WOW64 造成的假象 | 真的是 32 位元機器的話，很多現代開發工具已不再提供 32 位元版 |

---

### 五、追加 2026-09-07｜x86-64 到底「擴充」了什麼（s–v）

> 來源：Gemini 對話〈Cursor 备份文件说明〉（標題與內容不符，實際問的是「Windows x64 架構」）— <https://gemini.google.com/app/6ecdf62c2ff52863>

**s.** <mark style="background: #ADCCFFA6;">x86-64（又叫 x64、AMD64、Intel 64）不是一套全新的 ISA（Instruction Set Architecture，指令集架構，也就是「CPU 看得懂哪些指令」的規格書），而是舊有 x86 這套 ISA 的 64 位元「延伸（extension）」</mark>。延伸的意思是：原本 x86 的指令一條都沒被刪掉，只是額外加上 64 位元的暫存器（`RAX`／`RBX`⋯，比原本的 `EAX`／`EBX` 多一倍寬）與定址能力。<mark style="background: #D2B3FFA6;">這正是它能向下相容的技術原因，不是「特別做了一個相容模式」，而是它本來就把舊指令集整個包在裡面。</mark>

**t.** <mark style="background: #FFF3A3A6;">「64 位元最大的實際好處是記憶體定址空間」</mark>。32 位元的指標只有 32 個 bit，能指到的位址數量是 2³² = 4,294,967,296 個，一個位址對應一個 byte，所以上限就是 <mark style="background: #FFB8EBA6;">4 GB</mark>。<mark style="background: #FF5582A6;">注意這 4 GB 還要跟顯示卡、BIOS 等硬體保留位址共用，所以 32 位元 Windows 實際可用的往往只有 3.2～3.5 GB。</mark> 換成 64 位元指標後，理論上限是 2⁶⁴（16 EB，艾位元組），現行 x86-64 硬體只實作其中 48 位元或 57 位元的線性位址，但對桌機來說已等同「沒有上限」。

**u.** <mark style="background: #D2B3FFA6;">補充一個常被誤解的點</mark>：32 位元系統其實可以靠 <mark style="background: #ADCCFFA6;">PAE（Physical Address Extension，實體位址擴充）</mark> 讓「作業系統整體」用超過 4 GB 的實體記憶體，但<mark style="background: #FF5582A6;">單一行程（process）的虛擬位址空間仍被 32 位元指標卡在 4 GB</mark>。所以 PAE 解的是「機器裝得下多少 RAM」，解不了「一個程式能用多少」——這才是影片剪輯、資料庫、跑本地模型這類工作一定要 64 位元的原因。

**v.** <mark style="background: #BBFABBA6;">向下相容的實作在 Windows 上叫 WOW64（Windows 32-bit On Windows 64-bit）</mark>，它讓 32 位元的 `.exe` 在 64 位元 Windows 上原封不動執行。<mark style="background: #FF5582A6;">但相容不是零成本</mark>：32 位元行程看到的環境變數與登錄檔會被 WOW64 重導（就是本篇 o、p 節那個「行程會騙你」的坑），而且 <mark style="background: #FF5582A6;">64 位元行程不能載入 32 位元的 DLL、反之亦然</mark>，混用外掛時最常在這裡炸。

> [!warning] ⚠️ 這則對話的品質提醒
> 這是一則 Gemini Live 語音對話，Gemini 的回答只有短短三句英文（「64-bit extension of x86 / 突破 4 GB / 向下相容」），s–v 的細節是本次整理時另外查證 Microsoft Learn 與 SUSE 文件補上的，<mark style="background: #FF5582A6;">不是 Gemini 原話</mark>。另外 Gemini 說的「fully backward compatible」用詞過寬，實際上 <mark style="background: #FF5582A6;">16 位元程式在 64 位元 Windows 上完全不能跑</mark>（WOW64 只涵蓋 32 位元），這點見下方存疑表。

---

## ⚠️ 存疑／更正

| Gemini 說法 | 查證後 | 說明 |
|---|---|---|
| 「`$env:PROCESSOR_ARCHITECTURE` 就能確定你的架構」 | ⚠️ 不完整 | 它回報的是**行程**架構。在 32 位元 shell 或 ARM64 上的 x64 模擬行程裡會給出誤導的答案。必須搭配 `PROCESSOR_ARCHITEW6432`（見 o、p 節） |
| 「ARM64 是給高通 Snapdragon X 晶片或 Apple M 系列轉 Windows 用的」 | 表述不精確 | ARM64 版 Windows 軟體是給 **Windows on ARM** 用的，涵蓋 Snapdragon X 系列與在 Apple Silicon 上用虛擬機跑 Windows 的情境，並不限於「M 系列轉 Windows」 |
| 「Antigravity 更新步驟：前往 antigravity.google/download」 | 未查證 | 這是產品端資訊、會隨版本改動，本篇不背書。真的要更新請直接開官網確認當下的下載選單 |
| 對話最後岔題到「Threads 網頁版私訊連結」 | 與本主題無關 | 已捨棄不收錄，屬於生活雜項 |
| 「x86-64 fully backward compatible，可以跑大部分舊的 32 位元程式」（2026-09-07 追加對話） | ⚠️ 用詞過寬 | 32 位元程式確實可透過 WOW64 執行，但 <mark style="background: #FF5582A6;">16 位元程式（舊 DOS／Win3.x）在 64 位元 Windows 上完全無法執行</mark>，NTVDM 只存在於 32 位元版 Windows。說「fully」會誤導 |
| 「32 位元系統的記憶體上限就是 4 GB」（2026-09-07 追加對話） | 不完整 | 精確的說法是「單一行程的虛擬位址空間上限 4 GB」；作業系統整體可透過 PAE 定址超過 4 GB 實體記憶體。見 u 節 |

---

## 練習題（延伸）

架構偵測是系統知識、不是演算法題，LeetCode 與 NeetCode 沒有直接對應題。真的要練「位元與字長」的手感，可以做這幾題：

| 題目 | 連結 | 為什麼相關 |
|---|---|---|
| 191. Number of 1 Bits | https://leetcode.com/problems/number-of-1-bits/ | 逼你意識到「一個整數有幾個 bit」這件事，跟 32／64 位元字長直接相關 |
| 190. Reverse Bits | https://leetcode.com/problems/reverse-bits/ | 練位元順序，順便理解大端與小端 |
| 371. Sum of Two Integers | https://leetcode.com/problems/sum-of-two-integers/ | 用位元運算模擬加法器，等於手動走一遍 CPU 的 ALU |

---

## 各對話來源（原文重點）

### 〈查詢電腦架構指令〉（2026 年）— <https://gemini.google.com/app/68acc28655502fa4>

**使用者：** 我要打什麼指令才會知道我的電腦是 x64 還是 arm64 的架構？
**Gemini：**（給出 CMD `echo %PROCESSOR_ARCHITECTURE%`、`uname -m`、`[System.Environment]::Is64BitOperatingSystem` 三種寫法的對照表）

**使用者：** `PS C:\Users\User> echo %PROCESSOR_ARCHITECTURE%` → `%PROCESSOR_ARCHITECTURE%`
**Gemini：** 看來你目前使用的是 PowerShell，而在 PowerShell 中直接輸入 `%PROCESSOR_ARCHITECTURE%`（這是 Command Prompt 的語法）會被當作普通字串處理，所以它直接原樣退回給你了。請改用 `$env:PROCESSOR_ARCHITECTURE`。

**使用者：** 我是 AMD64
**Gemini：** 這是由 AMD 最初研發、後來 Intel 也採用的 64 位元指令集架構，通常在 macOS/Linux 中會顯示為 x86_64。下載開發工具時優先選 x64／x86_64／64-bit，避免 arm64／aarch64。

**使用者：** 我意思是我要更新 ANTIGRAVITY 我應該要用 ARM64 or x64?
**Gemini：** 既然確認電腦架構是 AMD64，那麼絕對要選擇 x64 版本。若錯誤下載 ARM64 版本，啟動時通常會彈出「此應用程式無法在您的電腦上執行」的錯誤視窗。

### 〈Laptop Architecture Detection Guide〉（2026 年）— <https://gemini.google.com/app/f00083e09ec02fa5>

同一批問題的姊妹對話，內容已依主題拆分至 [[TS/TypeScript-any與unknown-型別逃生艙口與斷言時機]] 與 [[build-and-compilation/編輯器與執行環境-VSCode是Electron與Toolchain]]，本篇僅收錄其中提到 `Intel Ultra 7`、`x64` 的架構脈絡。

### 〈Cursor 备份文件说明〉（2026-09-07 讀取）— <https://gemini.google.com/app/6ecdf62c2ff52863>

<mark style="background: #D2B3FFA6;">標題是 Gemini 自動命名的，與內容不符</mark>，實際只有一個回合：

**使用者：** Windows x64 架构你解释一下，我记得我以前有问过。
**Gemini：** Windows x64 architecture is a 64-bit extension of the older x86 architecture. It's designed to handle larger amounts of memory, way beyond the 4 GB limit of 32-bit systems, which makes it much faster and more efficient for modern, resource-intensive applications. It's also fully backward compatible, so you can still run most older 32-bit programs without any issues.

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原始對話（Gemini） | https://gemini.google.com/app/68acc28655502fa4 | 2026-08-27 讀取 |
| 原始對話（Gemini，姊妹篇） | https://gemini.google.com/app/f00083e09ec02fa5 | 2026-08-27 讀取 |
| WOW64 Implementation Details（環境變數被重寫的機制） | https://learn.microsoft.com/en-gb/windows/win32/winprog64/wow64-implementation-details | 2026-08-27 查證 |
| IsWow64Process function | https://learn.microsoft.com/en-us/windows/win32/api/wow64apiset/nf-wow64apiset-iswow64process | 2026-08-27 查證 |
| Detect x86_64 process on ARM64（Microsoft Q&A，說明 ARM64 上的偵測陷阱） | https://learn.microsoft.com/en-us/answers/questions/449019/detect-x86-64-process-on-arm64 | 2026-08-27 查證 |
| Tell if process architecture is "ARM64 (x64 compatible)" or "x64" on Windows 11 | https://learn.microsoft.com/en-us/answers/questions/518344/tell-if-process-archtitecture-is-arm64-(x64-compat | 2026-08-27 查證 |
| SYSTEM_INFO 結構（wProcessorArchitecture 欄位定義） | https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/ns-sysinfoapi-system_info | 2026-08-27 查證 |
| 原始對話（Gemini，x86-64 延伸與 4 GB 上限，s–v 節） | https://gemini.google.com/app/6ecdf62c2ff52863 | 2026-09-07 讀取 |
| Memory Limits for Windows and Windows Server Releases（4 GB 上限與 PAE 的官方定義） | https://learn.microsoft.com/en-us/windows/win32/memory/memory-limits-for-windows-releases | 2026-09-07 查證 |
| SUSE — What is x86-64（x86-64 是 x86 的 64 位元延伸、向下相容說明） | https://www.suse.com/topics/definition/x86-64/ | 2026-09-07 查證 |
