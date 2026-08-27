---
title: "批次檔關閉螢幕逐字拆解｜@echo off、Add-Type、user32.dll、SendMessage 與 WM_SYSCOMMAND"
type: topic-note
source: Gemini
tags: [gemini, batch, cmd, powershell, win32api, user32, dllimport, pinvoke, taskkill, 資安]
sources:
  - https://gemini.google.com/app/c95ccb548d2e60b5
updated: 2026-08-27
---

# 批次檔關閉螢幕逐字拆解

> [!info] 本篇重點 a–s 共 19 個
> 一支只有三行的 `.bat` 檔，卻同時用到 <mark style="background: #FFF3A3A6;">Batch 語法</mark>、<mark style="background: #FFF3A3A6;">PowerShell 語法</mark>、<mark style="background: #FFF3A3A6;">C# 內嵌程式碼</mark> 與 <mark style="background: #FFF3A3A6;">Win32 API 呼叫</mark>。把它拆完，等於把 Windows 的四層抽象走了一遍。

> [!info] 與其他筆記的關聯（附理由）
> **a.** 承接 [[powershell-vs-bash]]：本篇是「PowerShell 能直接呼叫 .NET 與 Win32 API」這個設計特色的極端案例——這是 Bash 做不到的事，Bash 得寫 C 再編譯。
> **b.** 呼應 [[查詢與刪除PID-netstat-taskkill-Stop-Process]]：本篇第三行的 `taskkill /f /im cmd.exe` 就是那篇的指令，這裡是它的實戰用法（自我了結）。
> **c.** 呼應 [[PowerShell-多指令分隔與netsh防火牆規則]]：同樣是「PowerShell 一行指令做系統層級的事」，可以對照兩者的引號跳脫技巧。
> **d.** 呼應 [[backend/ClickFix社交工程攻擊-假驗證碼誘騙貼上PowerShell與網站被注入的處置]]：<mark style="background: #FF5582A6;">本篇這種語法正是 ClickFix 那類攻擊最愛用的載體</mark>——看不懂的一行 PowerShell 貼進去就執行，兩篇一起看能建立警覺。
> **e.** 呼應 [[計算機基礎/CPU五大單元-ALU-CU-暫存器-快取與微指令]]：DLL 是「作業系統提供給應用程式的函式庫」，跟硬體層的分工可以對照著看抽象層次。

---

## 原始碼

```bat
@echo off
powershell -windowstyle hidden -command "(Add-Type '[DllImport(\"user32.dll\")]public static extern int SendMessage(int hWnd, int hMsg, int wParam, int lParam);' -Name a -Passthru)::SendMessage(-1, 0x0112, 0xF170, 2)"
taskkill /f /im cmd.exe
```

**f.** <mark style="background: #ADCCFFA6;">目的：關閉顯示器（讓螢幕進入省電狀態），然後把自己開出來的 CMD 視窗殺掉，做到「按一下就黑屏、不留視窗」</mark>。

---

## 重點整理

### 一、Batch 外層（g–i）

**g.** `@echo off`

| 片段 | 意思 |
|---|---|
| `echo on` / `echo off` | Batch 的內建開關。`on`（預設）會把每一行指令本身也印在畫面上；`off` 只印執行結果 |
| 開頭的 `@` | 「連這一行自己都不要印」。因為 `echo off` 這行本身是在 `echo` 還開著的時候執行的，不加 `@` 就會先印出 `echo off` 這五個字才生效 |

**h.** `taskkill /f /im cmd.exe`

| 片段 | 意思 |
|---|---|
| `taskkill` | Windows 內建的行程終止工具（等同 PowerShell 的 `Stop-Process`、Linux 的 `kill`） |
| `/f` | force，強制終止。不給行程收尾的機會，等同 Linux 的 `kill -9`（SIGKILL） |
| `/im cmd.exe` | Image Name，用「執行檔名稱」指定目標，而不是用 PID |

**i.** <mark style="background: #FF5582A6;">陷阱：`/im cmd.exe` 是「殺掉所有叫做 cmd.exe 的行程」，不是「殺掉我自己」</mark>。如果你同時開了三個命令提示字元視窗，這一行會把三個都關掉。要只關自己，比較安全的寫法是 `exit`，或用 PID 精準指定。

---

### 二、PowerShell 的外層參數（j–k）

**j.** `powershell -windowstyle hidden -command "..."`

| 片段 | 意思 |
|---|---|
| `powershell` | 呼叫 Windows PowerShell 5.1（`powershell.exe`）。若是 PowerShell 7 則是 `pwsh` |
| `-windowstyle hidden` | 執行時不要顯示那個藍色視窗。使用者完全看不到有東西閃過 |
| `-command "..."` | 把引號裡的字串當成 PowerShell 指令執行完就退出 |

**k.** <mark style="background: #FF5582A6;">`-windowstyle hidden` 是資安上的紅旗</mark>。合法的自動化腳本會用它避免畫面閃爍，但惡意程式也用它藏住自己的動作。看到來路不明的腳本帶這個參數，先停下來讀完內容再說。

裡面那些 `\"` 是 <mark style="background: #D2B3FFA6;">跳脫字元</mark>：整個 PowerShell 指令已經被一對雙引號包住了，所以字串內部的雙引號必須寫成 `\"`，CMD 才不會提早把引號閉合掉。

---

### 三、Add-Type 與 P/Invoke（l–o）

**l.** `Add-Type` 是 PowerShell 的 cmdlet，作用是<mark style="background: #ADCCFFA6;">在執行期間即時編譯一段 C# 程式碼，並把產生的 .NET 型別載入當前 session</mark>。換句話說，這一行做的事是「現場寫一個 C# class、現場編譯、現場用」。

| 參數 | 意思 |
|---|---|
| 第一個位置參數（那段 C# 字串） | 要編譯的成員定義 |
| `-Name a` | 給這個臨時型別取名叫 `a` |
| `-PassThru` | 把編譯出來的型別物件「回傳出去」，這樣才能接著用 `::` 呼叫它的靜態方法。沒有這個參數的話 `Add-Type` 不回傳東西 |

**m.** `[DllImport("user32.dll")] public static extern int SendMessage(...)`

這是 .NET 的 **P/Invoke（Platform Invocation Services，平台叫用服務）** 寫法，讓受管理的 .NET 程式碼去呼叫非受管理的原生 DLL 函式。

| 片段 | 意思 |
|---|---|
| `[DllImport("user32.dll")]` | 屬性標註（Attribute），宣告「下面這個方法的實作在 user32.dll 裡面，不是我寫的」 |
| `user32.dll` | Windows 的核心元件之一，負責使用者介面：視窗、訊息佇列、選單、滑鼠鍵盤輸入 |
| `public static extern` | `extern` 是關鍵字，意思是「這個方法沒有 body，實作在外部」。`static` 讓它可以不建立實例直接用 `::` 呼叫 |
| `int SendMessage(int hWnd, int hMsg, int wParam, int lParam)` | 對應原生 API 的簽章。四個參數的意義見下一節 |

**n.** `SendMessage` 是 Windows 訊息機制的核心函式，把一則訊息送進指定視窗的視窗程序（Window Procedure），<mark style="background: #ADCCFFA6;">而且會等到對方處理完才回來（同步阻塞）</mark>。相對的 `PostMessage` 是丟進佇列就走人（非同步）。

**o.** `::SendMessage(...)` 裡的 `::` 是 <mark style="background: #ADCCFFA6;">PowerShell 的靜態成員存取運算子</mark>，等同 C# 的 `.`。`(Add-Type ... -PassThru)::SendMessage(...)` 就是「把剛編出來的型別接住，直接呼叫它的靜態方法」。

---

### 四、四個魔術數字（p–r）

**p.** `SendMessage(-1, 0x0112, 0xF170, 2)` 逐個參數解讀：

| 參數位置 | 值 | 常數名稱 | 意義 |
|---|---|---|---|
| `hWnd`（目標視窗控制代碼） | `-1` | `HWND_BROADCAST` | 廣播給系統中所有的最上層視窗，而不是指定某一個 |
| `hMsg`（訊息代碼） | `0x0112` | `WM_SYSCOMMAND` | 這是一則「系統指令」訊息 |
| `wParam`（第一個參數） | `0xF170` | `SC_MONITORPOWER` | 系統指令的子類別：顯示器電源管理 |
| `lParam`（第二個參數） | `2` | — | 電源狀態值 |

**q.** `lParam` 的三種值（<mark style="background: #FFF3A3A6;">這是最常記錯的一組</mark>）：

| 值 | 效果 |
|---|---|
| `-1` | 顯示器**開啟**（powering on） |
| `1` | 顯示器進入**低耗電**狀態（low power） |
| `2` | 顯示器**關閉**（shut off） |

**r.** <mark style="background: #FFB8EBA6;">為什麼 `0xF170` 這麼奇怪</mark>：`WM_SYSCOMMAND` 的所有子指令都落在 `0xF000` 以上，而且低 4 位元被系統保留給內部使用。微軟文件明確要求：處理 `WM_SYSCOMMAND` 時要先把 `wParam` 跟 `0xFFF0` 做 AND 遮罩，才拿去比對常數。

---

### 五、⚠️ 安全與限制（s）

**s.** 三件要知道的事：

| 項目 | 說明 |
|---|---|
| <mark style="background: #FF5582A6;">惡意用途</mark> | 這種「看不懂的一行 PowerShell」正是惡作劇程式與惡意軟體的典型長相。執行來源不明的 `.bat` 前，一定要先用記事本打開讀完 |
| 只能在互動式桌面 session 跑 | 因為 Session 0 Isolation（工作階段 0 隔離），Windows 服務無法用這招關螢幕。它必須從有存取顯示器權限的使用者 session 發出 |
| 螢幕可能立刻自己亮回來 | 只要有任何滑鼠移動或鍵盤輸入，Windows 就會重新喚醒顯示器。所以有些腳本會在發送訊息前先 `Start-Sleep -Seconds 1`，避開你按下 Enter 那一瞬間的殘留輸入 |

---

## 程式碼範例

同資料夾放了兩支可直接執行的範例（Batch 與 PowerShell 各一）：

- `turn-off-monitor.bat` — 原始版本的加註解修正版（改掉會誤殺其他 CMD 視窗的那行）
- `turn-off-monitor.ps1` — 純 PowerShell 版，比較好讀，也不用處理引號跳脫地獄

---

## ⚠️ 存疑／更正

| Gemini 說法 | 查證後 | 說明 |
|---|---|---|
| 「`/im cmd.exe` 即關閉當前的 CMD 視窗」 | ⚠️ 不精確 | `/im` 是依映像名稱比對，會殺掉**所有**叫 cmd.exe 的行程，不只是當前這一個。想只關自己請用 `exit` |
| 沒有提到 `0xFFF0` 遮罩 | 補充 | 微軟文件明確要求處理 `WM_SYSCOMMAND` 時 `wParam` 要先 `& 0xFFF0`，因為低 4 位元系統保留 |
| 沒有提到 Session 0 隔離 | 補充 | 這是實務上最常見的「為什麼包成 Windows 服務就失效」的原因 |
| `SendMessage` 的 `hWnd` 型別寫成 `int` | 在 64 位元下技術上不嚴謹 | 原生 API 的 `HWND` 是指標，64 位元下是 8 bytes。正式程式應該用 `IntPtr`。這裡因為只傳常數 `-1` 廣播，實務上不會出錯，但抄去做別的事要注意 |

---

## 各對話來源（原文重點）

### 〈批次檔 PowerShell 關閉螢幕指令〉（2026 年）— <https://gemini.google.com/app/c95ccb548d2e60b5>

**使用者：**（貼上上方三行原始碼）幫我解釋每個名詞意思
**Gemini：** 這是一段結合了 Batch 與 PowerShell 的進階指令，最終目的是透過 Windows API 直接控制硬體功能⋯⋯它透過 PowerShell 調用 Windows 系統底層的 user32.dll 函式庫，發送一個系統指令給所有視窗，要求螢幕進入省電狀態，最後自動關閉指令視窗。（後接 Batch 外層指令、PowerShell 與 .NET 互動、SendMessage 參數解析三段，以及安全提醒）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原始對話（Gemini） | https://gemini.google.com/app/c95ccb548d2e60b5 | 2026-08-27 讀取 |
| WM_SYSCOMMAND message（Winuser.h）— SC_MONITORPOWER 與 lParam 三種值、0xFFF0 遮罩要求 | https://learn.microsoft.com/en-us/windows/win32/menurc/wm-syscommand | 2026-08-27 查證 |
| Microsoft Q&A — 廣播關螢幕後的喚醒訊息與 Session 0 限制 | https://learn.microsoft.com/en-us/answers/questions/909846/when-sendmessage(hwnd-broadcast-wm-syscommand-wm-m | 2026-08-27 查證 |
| Microsoft Q&A — 命令列關閉顯示器的做法討論 | https://learn.microsoft.com/en-us/answers/questions/2436135/how-can-i-turn-off-the-monitor-(i-e-put-it-to-slee?forum=windows-windows_7-desktop | 2026-08-27 查證 |
