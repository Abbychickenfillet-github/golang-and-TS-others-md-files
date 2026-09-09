---
title: Windows 快速設定沒有 Wi-Fi 按鈕、搜尋不到網路、DNS_PROBE_FINISHED_NO_INTERNET 的排查順序
type: topic-note
source: Gemini
tags: [gemini, windows, wifi, dns, 網路排錯, ipconfig, services, 裝置管理員, captive-portal]
aliases: [DNS_PROBE_FINISHED_NO_INTERNET, WiFi按鈕不見了]
related:
  - "[[查詢與刪除PID-netstat-taskkill-Stop-Process]]"
  - "[[PowerShell-多指令分隔與netsh防火牆規則]]"
  - "[[Network_and_Gateway_Notes]]"
  - "[[磁碟機代號與軟碟-為何沒有A槽B槽]]"
sources:
  - https://gemini.google.com/app/5c6a4d8604f06bbb
updated: 2026-09-05
---

# Windows 快速設定沒有 Wi-Fi 按鈕、搜尋不到網路、DNS_PROBE_FINISHED_NO_INTERNET 的排查順序

> [!info]- 🔗 與既有筆記的關聯
> (1) 歸進 `CLI/` 而不是 `command-line/`，因為 `CLI/` 已經是 Windows／PowerShell 系指令與系統排錯的主資料夾（`netsh` 防火牆、`netstat`、磁碟機代號都在那），本篇同屬「用指令救系統」這一族。
> (2) [[查詢與刪除PID-netstat-taskkill-Stop-Process]] 與 [[PowerShell-多指令分隔與netsh防火牆規則]] 是同一組「網路相關的 Windows 指令」，本篇補的是「連不上網」這個更前面的階段。
> (3) [[Network_and_Gateway_Notes]] 講的是 DNS 與 gateway 的原理，本篇是那套原理壞掉時的操作手冊，一個是為什麼、一個是怎麼修。

> 本篇重點 a–l，共 12 個。

## 重點整理

### 一、先分清楚是哪一層壞了（a–c）

(a) <mark style="background: #ADCCFFA6;">`DNS_PROBE_FINISHED_NO_INTERNET` 是 Chrome 的錯誤碼</mark>，意思是「瀏覽器要把網域名稱換成 IP 時，DNS 查詢徹底失敗，而且偵測到根本沒有網際網路連線」。<mark style="background: #FF5582A6;">它通常不是 DNS 伺服器壞掉，而是底層根本沒連上網</mark>。

(b) <mark style="background: #FFF3A3A6;">三層要分開判斷</mark>：

| 層級 | 症狀 | 對應處理 |
| --- | --- | --- |
| 硬體／驅動層 | 快速設定裡連 Wi-Fi 按鈕都不見了、搜尋不到任何網路 | 飛航模式切換、重啟網卡、重啟 WLAN AutoConfig |
| 連線層 | 有連上 Wi-Fi 但顯示無網際網路 | 忘記網路重連、檢查是否需要登入驗證頁 |
| 名稱解析層 | 連上了但網址打不開 | `ipconfig /flushdns` 清 DNS 快取 |

(c) <mark style="background: #FFB8EBA6;">Abby 那次是兩個問題疊在一起</mark>：快速設定選單開啟的是藍芽（按鈕呈現粉紅色、名稱顯示成手機名稱），同時瀏覽器報 DNS 錯誤——也就是「以為連著網路、其實走的是沒通的藍芽個人熱點」。

### 二、Wi-Fi 按鈕不見了怎麼救（d–g）

(d) <mark style="background: #BBFABBA6;">先檢查實體按鍵</mark>：鍵盤 F1~F12 上有沒有無線網路／飛航模式圖示（常見 `Fn + F2` 或 `F12`），確認沒有誤觸關閉無線網卡。

(e) <mark style="background: #BBFABBA6;">重新啟用 Wi-Fi 網卡</mark>：`Win + R` 輸入 `ncpa.cpl` 開啟「網路連線」，找到 Wi-Fi，若顯示「已停用」就右鍵「啟用」；若已啟用，先「停用」等 5 秒再「啟用」。

(f) <mark style="background: #BBFABBA6;">重啟檔案總管介面</mark>：`Ctrl + Shift + Esc` 開工作管理員，找到「Windows 檔案總管（Windows Explorer）」按「重新啟動」，讓工作列與快速設定選單重新載入。<mark style="background: #FFB8EBA6;">很多時候按鈕不是不見，是那個 UI 元件當掉了</mark>。

(g) <mark style="background: #BBFABBA6;">檢查快速設定有沒有被誤刪</mark>：點開右下角選單，按右下角的筆狀圖示（編輯快速設定），看 Wi-Fi 是不是被移除了，是的話按「新增」加回來。

### 三、搜尋不到任何網路（h–j）

(h) <mark style="background: #BBFABBA6;">切換一次飛航模式</mark>：開啟等 5 秒再關閉，強制讓網卡重新搜尋訊號。

(i) <mark style="background: #BBFABBA6;">重啟 WLAN AutoConfig 服務</mark>：`Win + R` 輸入 `services.msc`，找到「WLAN AutoConfig（無線區域網路自動設定）」，右鍵「重新啟動」。<mark style="background: #ADCCFFA6;">這個服務負責掃描、選擇與連線無線網路，它卡住就等於整台電腦看不見任何 Wi-Fi</mark>。

(j) <mark style="background: #BBFABBA6;">在裝置管理員停用再啟用網卡</mark>：`Win + X` 選「裝置管理員」→ 展開「網路介面卡」→ 找到 Wi-Fi 網卡（通常帶 Intel、Realtek 或 Wi-Fi 6 字樣）→ 右鍵「停用裝置」，等 5 秒再「啟用裝置」。<mark style="background: #FF5582A6;">做完還是搜尋不到，就是典型的硬體控制層卡死，直接選「重新啟動」（不要選「關機」）</mark>。

> [!warning] 為什麼要選「重新啟動」不要選「關機」
> Windows 預設開啟「快速啟動（Fast Startup）」，按「關機」其實是把核心狀態寫進 `hiberfil.sys` 的休眠檔，下次開機直接還原——連驅動程式的當機狀態一起還原。只有「重新啟動」會真正走完整的關閉與重新載入流程。這點 Gemini 沒解釋，但它是「為什麼重開機有用、關機沒用」的真正原因。

### 四、連上了但網址打不開（k–l）

(k) <mark style="background: #BBFABBA6;">忘記網路並重新連線</mark>：「設定」→「網路和 Internet」→「Wi-Fi」→「管理已知的網路」，找到該 Wi-Fi 點「忘記」，再重新輸入密碼。

(l) <mark style="background: #BBFABBA6;">清 DNS 快取</mark>：`Win + R` 輸入 `cmd`，然後執行

```bat
ipconfig /flushdns
```

> [!tip] 公共 Wi-Fi 的登入驗證頁（Captive Portal）
> 咖啡廳或公共場所的 Wi-Fi 常需要先在瀏覽器登入。連上之後開新分頁，隨意開一個「非 HTTPS」的網址（例如 `http://neverssl.com`）就能強制觸發登入頁。
> <mark style="background: #ADCCFFA6;">為什麼一定要非 HTTPS？</mark>因為 Captive Portal 的做法是把你的 HTTP 請求「劫持」轉址到登入頁；HTTPS 有憑證驗證，劫持會被瀏覽器擋下並顯示憑證錯誤，反而看不到登入頁。

## 補充：常用指令一覽

| 指令 | 打在哪 | 作用 |
| --- | --- | --- |
| `ncpa.cpl` | Win + R | 開「網路連線」，可停用／啟用網卡 |
| `services.msc` | Win + R | 開「服務」，可重啟 WLAN AutoConfig |
| `ipconfig /flushdns` | cmd 或 PowerShell | 清除本機 DNS 解析快取 |
| `ipconfig /all` | cmd 或 PowerShell | 看目前的 IP、閘道、DNS 伺服器 |
| `Get-NetAdapter` | PowerShell | 列出所有網路介面卡與狀態 |
| `Restart-NetAdapter -Name "Wi-Fi"` | PowerShell（系統管理員） | 一行重啟 Wi-Fi 網卡，取代裝置管理員點兩次 |

## ⚠️ 存疑／更正

- Gemini 說「重新啟動電腦，90% 的情況重啟後網卡圖示就會恢復正常」。<mark style="background: #FF5582A6;">這個 90% 是它自己編的數字，沒有來源</mark>，當作「通常有效」的口語即可，不要引用。
- Gemini 沒有提到 <mark style="background: #FF5582A6;">Windows 快速啟動會讓「關機」無法真正重載驅動</mark>，這是為什麼要選「重新啟動」的關鍵理由，已在上面補上。
- Gemini 建議的步驟都沒有用到 PowerShell 的 `Restart-NetAdapter`，那其實比在裝置管理員點兩次快得多，已補進指令表。

## 各對話來源

### Windows Wi-Fi 連線與 DNS 故障排除（2026-09）— https://gemini.google.com/app/5c6a4d8604f06bbb

**使用者：** 這邊不能連 Wi-Fi 現在是什麼情形？介面看起來怪怪的

**Gemini：** 有兩個問題疊在一起：藍芽熱點／個人熱點被開啟，以及瀏覽器無法解析網址（DNS 錯誤）。介面看起來怪怪的是因為 Windows 快速設定選單中開啟的是藍芽（按鈕呈粉紅色、名稱顯示為手機名稱），同時瀏覽器提示 `DNS_PROBE_FINISHED_NO_INTERNET`，代表電腦沒有成功透過正常的 Wi-Fi 取得網際網路連線。排查三步：關閉藍芽切換回 Wi-Fi、忘記網路並重新連線、清理 DNS 快取（`Win + R` → `cmd` → `ipconfig /flushdns`）。若是公共場所的 Wi-Fi，連線後開新分頁開一個非 HTTPS 網址（例如 `http://neverssl.com`）強制觸發登入驗證頁（Captive Portal）。

**使用者：** 這邊不是正常應該會有一個設定網路連線選取的嗎

**Gemini：** 右下角快速設定選單原本應該有 Wi-Fi 開關與網路清單按鈕，現在完全消失、被藍芽取代，通常是 Wi-Fi 網卡暫時卡住／被停用，或飛航模式觸發介面異常。四步：檢查鍵盤 F1~F12 的無線網路／飛航模式按鍵是否誤觸；`Win + R` 輸入 `ncpa.cpl` 找到 Wi-Fi 右鍵停用再啟用；`Ctrl + Shift + Esc` 開工作管理員重新啟動「Windows 檔案總管」讓工作列與快速設定重載；點快速設定的筆狀圖示檢查 Wi-Fi 是否被移除、有的話加回來。若都無效通常是網卡驅動當機，直接重新啟動電腦。

**使用者：** 他找不到任何可用網路

**Gemini：** 通常是 Wi-Fi 網卡驅動當機，或 WLAN AutoConfig 服務卡住，導致系統無法搜尋訊號。三步：切換一次飛航模式（開啟等 5 秒再關閉）強制重新搜尋；`Win + R` 輸入 `services.msc` 找到 WLAN AutoConfig 右鍵「重新啟動」；`Win + X` 開裝置管理員，展開「網路介面卡」找到 Wi-Fi 網卡（Intel／Realtek／Wi-Fi 6 字樣）右鍵「停用裝置」等 5 秒再「啟用裝置」。若還是搜尋不到，屬於系統硬體控制層卡死，請選「重新啟動」而不是「關機」。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/5c6a4d8604f06bbb | Gemini Flash，2026-09-05 |
| Microsoft Learn — ipconfig 指令參考（/flushdns） | https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig | 現行文件，2026-09-05 查證 |
| Microsoft Learn — Restart-NetAdapter | https://learn.microsoft.com/en-us/powershell/module/netadapter/restart-netadapter | 現行文件，2026-09-05 查證 |
| Microsoft 支援 — 修復 Windows 中的 Wi-Fi 連線問題 | https://support.microsoft.com/en-us/windows/fix-wi-fi-connection-issues-in-windows-9424a1f7-6a3b-65a6-4d78-7f07eee84d2c | 現行文件，2026-09-05 查證 |
| Microsoft — 快速啟動（Fast Startup）與關機的差異 | https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/oem-boot-and-shutdown | 現行文件，2026-09-05 查證 |
| Chrome 說明 — 網頁載入錯誤代碼列表（含 DNS_PROBE_FINISHED_NO_INTERNET） | https://support.google.com/chrome/answer/6098869 | 現行文件，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
