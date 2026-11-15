---
title: "Windows記憶體-關掉Chrome後剩多少-Standby快取與重開機"
---

# Windows 記憶體 —— 32GB 關掉 Chrome 以後剩多少？會每天自動重整嗎？

本篇重點 a–h，共 8 個。
相關筆記：[[CPU與主記憶體-為何加RAM會變快]]、[[SSD-vs-HDD-儲存原理與資料復原]]、[[C槽空間清理SOP]]。
互動版（可切換 Chrome 開／關、填空、是非題）：[Windows記憶體-關掉Chrome後剩多少-互動版](Windows記憶體-關掉Chrome後剩多少-互動版.html)

---

## a. 先回答：不會每天自動重整，關掉 Chrome 也不會回到 32GB

| 你的想法 | 實際情況 |
|---|---|
| 記憶體每天會自己重整、重新變成 32GB 全空 | **不會。** RAM 沒有「每日重置」機制，只有**重新啟動**（或斷電）才會整個清空。 |
| 關掉 Chrome 後會回到接近 32GB | **不會。** 只會把 Chrome 佔的那一份還回來，Windows 本身、VS Code、Defender 等常駐程式還在用。 |
| 「可用」少代表記憶體不夠 | **不一定。** Windows 會故意把閒置記憶體拿去當檔案快取（Standby），這不是浪費，詳見 d。 |

---

## b. 本機實測（2026-11-12，Abby 這台機器，PowerShell 量的）

我在你這台電腦實際量了一次，**Chrome 還開著**的狀態：

| 項目 | 數值 | 怎麼解讀 |
|---|---|---|
| 實體安裝 RAM | 32.0 GB | 兩條加起來的容量 |
| Windows 看得到的 RAM | 31.7 GB | 差的約 0.3 GB 被硬體保留（內顯、韌體），這部分永遠拿不回來 |
| 可用（Available） | 4.8 GB | 空白頁＋Standby 快取，**需要時隨時可以被程式拿去用** |
| 總量減可用 | 26.9 GB | 被程式佔住，或被系統當「還沒清掉的快取」佔住的部分 |
| 開機時間（Uptime） | 3 天 13 小時 | 三天半沒有真正重開機 |
| 快速啟動（HiberbootEnabled） | 1（開啟） | 你按「關機」其實是半休眠，**不等於重置記憶體**，見 e |
| 分頁檔 pagefile 使用 | 5.8 GB / 32.5 GB | 已經有一部分資料被擠到硬碟上 |

| 程式（依名稱加總） | 行程數 | 工作集（Working Set） |
|---|---|---|
| chrome | 85 | 約 9.6 GB |
| Code（VS Code） | 35 | 約 4.0 GB |
| claude | 15 | 約 2.6 GB |
| svchost（Windows 服務） | 96 | 約 1.4 GB |
| msedge ＋ msedgewebview2 | 53 | 約 2.0 GB |
| Memory Compression | 1 | 約 0.85 GB |

⚠️ **數字不能直接相加**：各行程的工作集加總是 28.5 GB，比「總量減可用」的 26.9 GB 還大，因為 Chrome 各分頁行程**共用**的 DLL 頁面被重複計算了。所以 Chrome 的 9.6 GB 是**上限**，實際釋放量會略少。

**推估：關掉 Chrome，可用記憶體會從 4.8 GB 變成約 14 GB 上下，不是 32 GB。**

---

## c. 為什麼關掉 Chrome 也回不到 32GB

| 還佔著的東西 | 為什麼不會消失 |
|---|---|
| Windows 核心與驅動 | 開機就在，不能關。 |
| 常駐服務 | `svchost`、Defender 的 `MsMpEng`、`explorer`、`dwm` 都是系統自己要用的。 |
| 其他你開著的程式 | VS Code、Claude、Edge WebView2 等，是你自己開的，各自有工作集。 |
| Memory Compression | Windows 把不常用的頁面壓縮後留在 RAM 裡，省下分頁檔的硬碟讀寫。 |
| 硬體保留 | 32.0 GB 裝了，Windows 只看得到 31.7 GB。 |
| Standby 快取 | 見 d，Windows 刻意不把它歸零。 |

---

## d. Free、Standby、In use 三種狀態（Task Manager 的「可用」是怎麼算的）

Windows 把實體記憶體分成幾種狀態，**工作管理員的「可用」＝ Free ＋ Standby**：

| 狀態 | 意思 | 要用時 |
|---|---|---|
| In use（使用中） | 程式正在用的資料 | 不能動 |
| Modified（已修改） | 有改過、還沒寫回硬碟的檔案快取 | 要先寫回硬碟才能釋放 |
| Standby（待命） | 讀過的檔案快取、已經存在硬碟上有備份 | **可以立刻丟掉給別人用**，不必寫硬碟 |
| Free（空閒） | 完全沒東西，也已經填零 | 直接給 |

這份規則和 [[CPU與主記憶體-為何加RAM會變快]] 裡講的 page cache 是同一件事，**Windows 版的名字叫 Standby**。
閒著的記憶體不放著，而是拿來快取你讀過的檔案，下次再開同一個程式就不用碰硬碟。

**關掉 Chrome 之後這 9.6 GB 去哪？**
Chrome 自己 `malloc` 出來的私有記憶體（分頁內容、JS 堆積）沒有對應的檔案可以還原，所以直接變成 **Free**。
Chrome 的 `.exe`、`.dll` 這些有檔案當後盾的頁面，則可能留在 **Standby**，下次再開 Chrome 啟動會比較快。

---

## e. 「每天重整」其實是：關機 vs 重新啟動

| 動作 | 記憶體會清空嗎 | 為什麼 |
|---|---|---|
| 按「關機」＋ 快速啟動開啟 | **核心部分不清**（存成 hiberfil.sys，下次直接載回） | 使用者程式會結束，但核心狀態被保留，開機更快。 |
| 按「重新啟動」 | **完整清空** | Windows 在重新啟動時會略過快速啟動，整個核心重新載入。 |
| 睡眠 | 不清 | RAM 持續供電。 |
| 休眠 | 寫到硬碟再載回 | 關電後還原。 |

你的 Uptime 3 天 13 小時加上快速啟動為開啟，**很可能代表你一直是按「關機」而不是「重新啟動」**。
想要真正「重整」記憶體（例如懷疑有程式洩漏記憶體），要用「重新啟動」。

---

## f. 怎麼自己量

```powershell
# 總量、可用、使用中（GB）
$os = Get-CimInstance Win32_OperatingSystem
"Total={0:N1}  Available={1:N1}  Used={2:N1}" -f ($os.TotalVisibleMemorySize/1MB), ($os.FreePhysicalMemory/1MB), (($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/1MB)

# 依程式名稱加總工作集，找出誰最吃記憶體
Get-Process | Group-Object Name | ForEach-Object { [pscustomobject]@{Name=$_.Name; Procs=$_.Count; WS_MB=[math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum/1MB)} } | Sort-Object WS_MB -Descending | Select-Object -First 10

# 快速啟動是否開啟（1 = 開）
(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power').HiberbootEnabled
```

建議做一次「**基線**」：重新啟動後等 5 分鐘、什麼都不開，記下「使用中」。之後任何時候的使用量減掉這個基線，就是你自己開的東西佔的。

---

## g. 要不要擔心？

| 情況 | 判斷 |
|---|---|
| 可用 4.8 GB，系統不卡 | **沒事。** 很多是 Standby 快取，要用時會讓出來。 |
| 可用長期接近 0，而且分頁檔使用量一直上升、滑鼠卡頓 | 才是真的不夠，開始 swap（見 [[CPU與主記憶體-為何加RAM會變快]] 的 thrashing）。 |
| 一個程式（例如 Chrome）佔很大 | 先關分頁或用 Chrome 內建的工作管理員（`Shift+Esc`）找哪個分頁最肥。 |

---

## h. 自我檢測

互動版裡有填空與是非題：[Windows記憶體-關掉Chrome後剩多少-互動版](Windows記憶體-關掉Chrome後剩多少-互動版.html)。

---

## 資料來源（含查證時間）

| 主題 | 連結／來源 | 版本／時間 |
|---|---|---|
| 本機記憶體、行程、快速啟動、分頁檔數據 | 本機 PowerShell 實測（`Get-CimInstance Win32_OperatingSystem`、`Get-Process`、`Get-Counter`、登錄檔 `HiberbootEnabled`） | 2026-11-12，Windows 11 Home 10.0.26200 |
| Free／Standby／Modified 的分類與「可用＝Free＋Standby」 | 依 Windows 記憶體管理的一般知識整理，**這次沒有另外上網查證** | 未查證，建議對照 Microsoft Learn 的 Task Manager 與 Windows Internals 說明 |
| 快速啟動「關機不等於重置核心」 | 依 Windows 快速啟動機制的一般知識整理，**這次沒有另外上網查證** | 未查證 |
