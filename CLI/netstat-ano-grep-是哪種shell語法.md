---
title: netstat -ano | grep ":5500" 是哪種 shell 的語法？（Git Bash 混用 Windows 原生程式 + Unix 工具）
type: concept-note
tags: [git-bash, msys2, powershell, netstat, grep, pipe, cli]
updated: 2026-07-24
---

# `netstat -ano | grep -i ":5500"` 是哪種 shell 語法

> 起點問題：這行指令混了 Windows 的 `netstat` 和 Unix 的 `grep`，到底算哪一種 shell？

## 一句話結論

**這是 Git Bash（MSYS2/MinGW）語法，不是 PowerShell、也不是 CMD。** 它能跑，是因為 Git Bash 的 `bash.exe` 本身是一個能在 Windows 上直接跑的原生程式，它的 shell 語法（管道 `|`、旗標習慣）是 Unix 風格，但 `PATH` 裡同時看得到 Windows 系統程式和 Git 自帶的 Unix 工具。

## 兩個指令分別是「誰」

```bash
where.exe grep       # C:\Program Files\Git\usr\bin\grep.exe   ← Git 自己編譯、附贈的 Unix 工具
where.exe netstat     # C:\Windows\System32\NETSTAT.EXE          ← Windows 內建原生程式
```

| 指令 | 來源 | 種類 |
|---|---|---|
| `netstat` | `C:\Windows\System32\NETSTAT.EXE` | **Windows 原生**工具，CMD／PowerShell／Git Bash 都能直接叫到 |
| `grep` | `C:\Program Files\Git\usr\bin\grep.exe` | **Git Bash 附帶**的 Unix 工具，是為 Windows 重新編譯過的 `.exe`（不是 Linux ELF） |
| `\|`（管道） | Git Bash 的 `bash.exe` 自己實作 | Unix 風格的**文字**管道（把前一個指令的 stdout 接到下一個的 stdin） |

## 為什麼這行指令「混得起來」

跟 [[WSL-interop-從Linux叫Windows程式]] 講的 WSL interop **不是同一回事**，容易搞混，這裡特別分清楚：

- **WSL**：真正跑一個 Linux kernel，Windows `.exe` 是透過 `binfmt_misc` 這層橋接（interop）才叫得動，是「兩個不同系統互相借道」。
- **Git Bash（MSYS2/MinGW）**：**根本没有第二個系統**。`bash.exe`、`grep.exe` 全部都是**貨真價實的 Windows PE 執行檔**，只是行為模仿 Unix。所以它能呼叫 `netstat.exe` 這種 Windows 原生程式，靠的不是什麼橋接技術，單純就是「Windows 的 PATH 找得到 `C:\Windows\System32`」這麼簡單——所有東西本來就同屬一個 Windows 行程樹，管道 `|` 也是 Windows 原生的匿名管道機制，只是 `bash.exe` 用 Unix 語法包起來操作它。

一句話：**MSYS2 不是「借別的系統的程式來用」，而是「把 Unix 工具重新編譯成能在 Windows 上原生跑的 exe」**，所以它跟 Windows 系統程式混用完全不需要跨系統翻譯。

### MSYS2 名稱由來

**MSYS2 = "minimal system 2"**（[Wikipedia 條目](https://en.wikipedia.org/wiki/MSYS2)原文：`MSYS2 ("minimal system 2") is a software distribution and development platform for Microsoft Windows`）。前身 MSYS 是 MinGW 專案的一部分，同樣取「最小系統」之意；MSYS2 是後來的重寫版本，架構上改基於 Cygwin 分支，但命名邏輯延續 MSYS。Git for Windows（也就是 Git Bash）就是包著 MSYS2 打包出來的。

## 對照：PowerShell 要怎麼寫同樣的事

PowerShell 的管道傳的是**物件**（.NET object），不是文字，而且沒有內建 `grep`（`grep` 在 PowerShell 裡不存在，會直接報錯「不是內部或外部命令」）：

```powershell
netstat -ano | Select-String ":5500"
```

或用 CMD 語法（`findstr` 是 CMD/PowerShell 都認得的文字比對工具）：

```cmd
netstat -ano | findstr ":5500"
```

三種寫法對照：

| 環境 | 指令 |
|---|---|
| Git Bash | `netstat -ano \| grep -i ":5500"` |
| PowerShell | `netstat -ano \| Select-String ":5500"` |
| CMD | `netstat -ano \| findstr ":5500"` |

`netstat -ano` 這半段三邊通用（因為它是 Windows 原生程式，跟你用哪個 shell 呼叫它無關），差異只在「怎麼過濾文字」這半段，因為那才是各 shell 自己的語法。

## 相關筆記
- [[curl-是哪個系統的-與PowerShell的curl別名陷阱]] —— 同類型問題：判斷一個指令是「哪個系統的」，以及 PowerShell 別名陷阱
- [[powershell-vs-bash]]
- [[WSL-interop-從Linux叫Windows程式]] —— 對照組：WSL 才是真的靠 interop 橋接兩個系統，Git Bash 不是
- [[重定向與管道差異]]

## 資料來源（含查證時間）

| 主題 | 來源 | 版本／時間 |
|---|---|---|
| grep / netstat 實際路徑 | 本機 `where.exe grep` / `where.exe netstat` 實測 | 2026-07-24 實測 |
| MSYS2 是原生編譯、非模擬層 | 依知識（MSYS2/MinGW 官方專案定位），未於本次重新抓網頁核對 | — |
