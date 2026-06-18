---
title: PowerShell / .NET 與檔案大小單位
type: topic-note
source: Gemini
tags: [gemini, powershell, dotnet, cli, bytes]
sources:
  - https://gemini.google.com/app/96f45d0a81d7c05b
updated: 2026-06-11
---

# PowerShell / .NET 與檔案大小單位

## 重點整理

### PowerShell 與 .NET
- Windows 作業系統核心主要用 C/C++ 撰寫(高效底層運作);PowerShell 建立在 .NET 框架上,因此可使用 .NET 的類別與方法(如靜態成員存取運算子 `[Environment]`)與底層 Windows 互動。
- 靜態成員存取:`[類型]::成員`,例如 `[Environment]`。

### 查詢 npm 全域安裝路徑、找檔案
- `npm config get prefix` 會輸出 npm 的全域安裝根目錄路徑。
- `Get-ChildItem` 搭配該路徑與關鍵字過濾(如 Claude),可列出該目錄下名稱含關鍵字的檔案,用來確認安裝是否成功。輸出含最後寫入時間與 Length。

### AppData / Roaming
- `AppData` 是 Windows 預設隱藏資料夾(保護程式設定避免誤刪);需在檔案總管「檢視」勾選「隱藏的項目」才看得到。
- `Roaming`(在 AppData 底下)存放應用程式的個別設定;在不同電腦登入同一帳號時這些設定可同步,確保體驗一致。檔案同步機制與「是否隱藏」沒有直接關係。

### 檔案大小單位
- `Get-ChildItem` 輸出的 `Length` 欄位是檔案大小,單位是 **bytes(位元組)**,不是字元數。
- 1 byte = 8 bits;bit 是最小資料單位(0 或 1)。
- **GiB vs GB**:帶 i 的 GiB 是二進位(1024 為基數,精確反映電腦內部);一般 GB 是十進位(1000 為基數,行銷/日常簡化)。1KB(二進位)= 1024 bytes。

## 各對話來源
### PowerShell 静态成员访问运算符(2026-06)— https://gemini.google.com/app/96f45d0a81d7c05b
使用者與 Gemini 討論:Windows(C/C++)與 PowerShell(.NET)的關係、`npm config get prefix` 與 `Get-ChildItem` 找含 Claude 的檔案、AppData/Roaming 隱藏資料夾與設定同步、Length 欄位為 bytes、byte/bit 概念、GiB(1024) vs GB(1000) 的差別。對話末段使用者轉為情緒性訊息(提到連續兩天沒進食),Gemini 回應關心並建議先吃點好消化的食物。
