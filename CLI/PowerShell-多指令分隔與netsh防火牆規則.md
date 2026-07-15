---
title: PowerShell 多指令分隔（分號）與 netsh 開防火牆埠
type: topic-note
source: Gemini
category: 技術
tags: [gemini, powershell, cli, netsh, firewall, windows]
sources:
  - https://gemini.google.com/app/f8e466ade0f3c24f
updated: 2026-06-25
---

# PowerShell 多指令分隔（分號）與 netsh 開防火牆埠

> [!info] 這篇在講什麼
> 對話標題是「PowerShell 指令錯誤修正」。最有學習價值、可重複使用的核心是 **PowerShell 把兩條指令接在一起執行時要用分號分隔**，以及 **用 `netsh` 開放開發用的防火牆連接埠（5173 / 8080）**。後半段是 OBS／YouTube 直播與生活雜事，僅摘要保留。

## 重點整理

### 1. 為什麼出現「命令中至少有兩個相同名稱的引數」

> [!danger] 根本原因
> 把兩條獨立指令<mark style="background: #FF5582A6;">直接接在一起、中間沒有任何分隔符號</mark>，PowerShell 會誤以為第二個 `netsh` 是前一條指令的參數，於是抱怨引數重複。

### 2. 正解：多指令要用分號 `;` 或換行

> [!check] 在 PowerShell 一行要跑多條指令，必須用換行或分號 `;` 隔開

```powershell
# 方案 A：用分號隔開（推薦，可整行貼上）
netsh advfirewall firewall add rule name="Dev Frontend 5173" dir=in action=allow protocol=TCP localport=5173; netsh advfirewall firewall add rule name="Dev Backend 8080" dir=in action=allow protocol=TCP localport=8080

# 方案 B：分成兩行各自執行
netsh advfirewall firewall add rule name="Dev Frontend 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Dev Backend 8080" dir=in action=allow protocol=TCP localport=8080
```

`netsh advfirewall firewall add rule` 各參數：`name`（規則名）、`dir=in`（入站）、`action=allow`（允許）、`protocol=TCP`、`localport`（要開放的埠）。前端 Vite 預設 5173、後端 8080 是常見的本機開發埠。

> [!tip] 為什麼要開這兩個埠
> <mark style="background: #ADCCFFA6;">想讓同網段的手機／其他裝置連到本機開發伺服器（例如手機掃 QR Code 測試）</mark>，就要在 Windows 防火牆開放 5173 / 8080 的入站連線。

### 3. 順帶記下的小排錯（OBS / YouTube 直播）

> [!note] 這段屬生活雜項，僅留關鍵結論
> - **OBS 看不到自己的臉**：要手動在「來源」面板按 `+ → 影像擷取裝置`，選實體鏡頭（如 ACER QHD User Facing），<mark style="background: #FF5582A6;">不要選 OBS Virtual Camera</mark>。
> - **鏡頭黑畫面**：相機一次只能給一個程式用，先關掉占用的瀏覽器分頁／Zoom；再到 Windows「隱私權與安全性 → 相機」確認「讓傳統型應用程式存取相機」已開、OBS 在允許清單。必要時以系統管理員身分開 OBS。
> - **直播到 YouTube 不需要開虛擬相機**（虛擬相機反而可能占用實體鏡頭造成黑屏）。
> - **YouTube「Scheduled start time must be in the future…」**：預約時間和現在太接近會被 API 判定失效，<mark style="background: #BBFABBA6;">把預約時間往後延 10～15 分鐘</mark>即可建立成功（之後仍可隨時提早開播）。

---

## 自我測驗

1. （是非題）PowerShell 一行內把兩條 `netsh` 指令直接接著寫即可一次執行。
   答案：||✗。中間沒有分隔符會被當成同一條指令的重複引數，要用分號 `;` 或換行分隔。||
2. （填空）要開放本機防火牆入站埠，`netsh advfirewall firewall add rule` 中設定埠號的參數是 ||localport||，方向用 ||dir=in||。
3. （申論題）直播到 YouTube 為什麼不需要開 OBS 虛擬相機？
   答案：||虛擬相機是把 OBS 畫面模擬成一個鏡頭，給 Zoom/Meet 之類軟體抓取用。直播是透過「串流金鑰」直接把 OBS 畫面送到 YouTube，與虛擬相機無關；反而開了虛擬相機可能占用實體鏡頭造成黑屏。||

---

## 各對話來源

### PowerShell 指令錯誤修正（2026-06）— https://gemini.google.com/app/f8e466ade0f3c24f

使用者：（貼上 PowerShell）`netsh advfirewall firewall add rule name="Dev Frontend 5173" ... localport=5173 netsh advfirewall firewall add rule name="Dev Backend 8080" ... localport=8080`，把這個指令改對。（錯誤：命令中至少有兩個相同名稱的引數。）

Gemini：這是把兩條獨立指令接在一起但沒有分隔符，PowerShell 誤以為第二個 netsh 是前一條的參數。修正：用分號 `;` 隔開整行貼上，或分成兩行執行。

使用者：（後續）OBS 看不到自己的臉、鏡頭黑畫面、想直播讀書、YouTube 建立直播失敗 "Scheduled start time must be in the future..."、醬瓜算有纖維嗎。

Gemini（摘要）：OBS 要手動在來源新增「影像擷取裝置」選實體鏡頭、別選 Virtual Camera；黑畫面多半是相機被別的程式占用或系統相機權限沒給；直播不需開虛擬相機；YouTube 排程時間太接近現在會失效，往後延 10～15 分鐘即可；醬瓜是醃漬加工蔬菜，有纖維但鈉與糖偏高，宜當配菜少量食用。（後段非技術，詳細從略。）
