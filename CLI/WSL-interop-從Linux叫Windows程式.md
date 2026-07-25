---
title: WSL interop — 從 Linux 叫 Windows 程式（與反向）
type: concept-note
tags: [wsl, windows, linux, interop, cli]
updated: 2026-07-17
---

# WSL interop — 從 Linux 叫 Windows 程式（與反向）

> 🔖 **本篇重點索引：a–e，共 5 個。** 字母只表位置與數量。
> 延伸自 [[usr-Unix系統資源]]：WSL 的 `/usr` 裡都是 Linux 原生軟體；能叫得動的 Windows 程式**不在 `/usr`**，靠 interop。

## (a) interop 是什麼

<mark style="background: #ADCCFFA6;">interop（互通）= WSL 讓 Linux 與 Windows「互相叫得動對方的程式」的機制。</mark>因為 WSL2 跑真正的 Linux kernel，又跟 Windows 共用檔案系統，微軟做了一層橋，讓你在 <mark style="background: #FFF3A3A6;">Linux shell 直接執行 Windows 的 `.exe`</mark>，反過來也行。

## (b) 從 bash 直接叫 Windows 程式

在 WSL 的 bash 裡打：

```bash
notepad.exe            # 開 Windows 記事本
explorer.exe .         # 用檔案總管打開「目前資料夾」
code .                 # 用 Windows 的 VS Code 開目前資料夾
clip.exe               # 把輸出送進 Windows 剪貼簿：echo hi | clip.exe
```

<mark style="background: #FFB8EBA6;">要加 `.exe` 副檔名</mark>（`notepad` 不行、`notepad.exe` 才行），這樣 WSL 才知道要走 interop 去叫 Windows 程式。

## (c) 機制：`binfmt_misc` → `/init`

<mark style="background: #ADCCFFA6;">`binfmt_misc`</mark> 是 Linux kernel 的功能：可以註冊「遇到某類檔案就交給某個處理器執行」。WSL 在啟動時註冊一條規則：<mark style="background: #FFF3A3A6;">遇到 Windows 的 PE/`.exe` 執行檔，就交給 `/init`（WSL 的橋接程式）去啟動對應的 Windows 行程</mark>。所以你打 `notepad.exe`，其實是 kernel 把它轉給 `/init` → 由 Windows 那邊真正執行。

## (d) 重點：Windows 程式<mark style="background: #FF5582A6;">不住在 `/usr`</mark>

- 你 WSL distro 的 `/usr/bin` 裡是<mark style="background: #ADCCFFA6;">為 Linux 編譯的 ELF 執行檔</mark>（真 Linux 軟體）。
- 你「叫得動」的 Windows `.exe` 其實在 <mark style="background: #FFF3A3A6;">Windows 那邊</mark>，WSL 把 C 槽掛在 <mark style="background: #FFB8EBA6;">`/mnt/c/...`</mark>（例如 `/mnt/c/Windows/System32/notepad.exe`）。
- 結論：<mark style="background: #BBFABBA6;">能呼叫 ≠ 裝在 `/usr`</mark>。它們是透過 interop 從 `/mnt/c` 被啟動的。

## (e) 反向：從 Windows 叫 Linux

從 PowerShell／CMD 也能叫 WSL 裡的 Linux 指令：

```powershell
wsl ls -la             # 在當前 WSL distro 跑 ls
wsl -d Ubuntu grep foo file    # 指定 distro 跑指令
```

> 一句話：<mark style="background: #FFF3A3A6;">interop 是「兩邊互叫」的橋；程式各自住在自己那邊（Linux 在 `/usr`、Windows 在 `/mnt/c` 對應的 C 槽），只是能跨過去執行。</mark>

## 資料來源（含查證時間）

> 查證日期：2026-07-17

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| WSL interop（從 Linux 執行 Windows exe） | [wsl.dev — Interop](https://wsl.dev/technical-documentation/interop/) | 社群技術文件 |
| Windows 與 Linux 互通 | [Microsoft Learn — WSL interop](https://learn.microsoft.com/en-us/windows/dev-environment/wsl-interop) | 微軟官方（持續更新） |
| WSL2 真 kernel／ELF／binfmt | [Wikipedia — Windows Subsystem for Linux](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) | 條目持續更新 |

## 相關筆記

- 系統路徑與 `/usr`：[[usr-Unix系統資源]]
- 清理與套件：[[Linux-清理與套件指令-rm-apt-pip-var]]
