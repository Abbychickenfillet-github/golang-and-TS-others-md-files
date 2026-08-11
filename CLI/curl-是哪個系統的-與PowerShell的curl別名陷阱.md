---
title: "curl-是哪個系統的-與PowerShell的curl別名陷阱"
---

# curl 是哪個系統的？＋ PowerShell 裡 `curl` 的別名陷阱

> 起點問題：`curl.exe -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"` —— curl 算 Windows 的、Unix 的、還是通用的？順便更正「curl 是 cmdlet」這個誤會。
> 本篇重點 (a)–(h)，共 8 個。

---

## 一、curl 歸哪一國？→ 通用（cross-platform），出身 Unix，後來被 Windows 內建

- (a) **curl 是跨平台通用工具**，不是 Windows 專屬、也不是 Unix 專屬。
- (b) 它的**血統是 Unix-like 世界**：由 Daniel Stenberg 開發、1990 年代末誕生，開源專案（官網 curl.se）。
- (c) Windows **不是一直都有** curl；微軟從 **Windows 10（版本 1803，2018 年）**起才把 `curl.exe` 內建進系統。

| 面向 | 事實 |
|---|---|
| 出身 | Unix-like 世界，開源（curl.se） |
| 現在跑在哪 | Linux / macOS / Windows / BSD… 幾乎所有 OS |
| Windows 何時內建 | Windows 10（1803，2018）才內建 `curl.exe` |
| 本機位置／版本 | `C:\Windows\System32\curl.exe`，8.16.0 |
| 「Windows 版」的線索 | 版本字串標 `(Windows)`、用 **Schannel**（Windows 原生 TLS）而非 OpenSSL |

- (d) **判斷「Windows 版通用工具」的線索**：`curl.exe --version` 若出現 `(Windows)` 和 `Schannel`（不是 OpenSSL），就是「通用工具的 Windows 專屬編譯版」，而非某個 Unix port。

---

## 二、關鍵更正：`curl.exe` 不是 cmdlet，是 Application

- (e) `curl.exe` 是 **Application（外部 exe）**，不是 cmdlet。這正是 [[PowerShell-找檔案與遞迴搜尋陷阱]] 裡 `CommandType` 表格的實例。

| 你打的字 | CommandType | 實際是什麼 |
|---|---|---|
| `curl.exe` | Application | 真正的 curl，`C:\Windows\System32\curl.exe`（有實體檔 → 有路徑） |
| `curl`（裸打） | Alias | PowerShell 的 `Invoke-WebRequest`（一個 cmdlet）的綽號！ |

- (f) **判斷是不是 cmdlet 的直覺**：cmdlet 是「動詞-名詞」格式（`Invoke-WebRequest`、`Get-ChildItem`）。`curl` 這種一個單字、又吃 `-X` `-H` 這類**單槓短旗標（Unix/POSIX 風格）**的，通常是外部 exe，不是 cmdlet。

---

## 三、陷阱：在 PowerShell 裡裸打 `curl` 會跑到 `Invoke-WebRequest`

- (g) 把標準 curl 指令貼進 **PowerShell** 時，若打**裸 `curl`**，實際執行的是 `Invoke-WebRequest`——它看不懂 `-X`、`-H`，會報錯或行為不同。**要跑真的 curl，一定要打 `curl.exe`**（加副檔名）。這跟 [[PowerShell-找檔案與遞迴搜尋陷阱]] 裡「`where` 被 `Where-Object` 佔走、要寫 `where.exe`」是同一個道理。
- (h) CMD 沒有這個別名問題，`curl` 直接就是 `curl.exe`；只有 PowerShell 會把 `curl` 綁成 `Invoke-WebRequest` 的別名。

```powershell
# 本機驗證
Get-Command curl                     # CommandType: Alias   → Invoke-WebRequest
Get-Command curl.exe                 # CommandType: Application → C:\Windows\System32\curl.exe

# 正確跑真 curl（Unix 風格旗標照舊可用）
curl.exe -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"

# 等價的 PowerShell 原生寫法（cmdlet 風格：全字參數）
Invoke-WebRequest -Method POST -ContentType "application/json" -Uri "http://127.0.0.1:8000/items?item=apple"
```

> 小結：curl = **Unix 血統的跨平台工具，現已被 Windows 內建**；在 PowerShell 裡它有兩個身分（`curl.exe`=真 curl，`curl`=Invoke-WebRequest 別名），別踩混。

---

## 相關筆記
- [[PowerShell-找檔案與遞迴搜尋陷阱]] —— `CommandType`（Application / Cmdlet / Alias）、`.Source` 給不給路徑、`where.exe` vs `where`
- [[where-vs-get-command]]
- [[powershell-vs-bash]]

## 資料來源（含查證時間）
| 主題 | 來源 | 版本／時間 |
|---|---|---|
| curl 身分（Application/Alias）、版本、路徑 | 本機 `Get-Command` / `curl.exe --version` 實測 | 2026-07-18 實測，curl 8.16.0 (Windows) |
| curl 專案與歷史 | curl 官方站 https://curl.se/ | 依知識，未於本次重新抓網頁核對 |
| Windows 內建 curl（1803 起） | 微軟部落格 "Tar and Curl Come to Windows" https://devblogs.microsoft.com/commandline/tar-and-curl-come-to-windows/ | 依知識，未於本次重新抓網頁核對 |
