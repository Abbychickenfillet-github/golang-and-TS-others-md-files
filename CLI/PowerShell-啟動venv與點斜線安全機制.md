---
title: PowerShell 啟動 venv:為什麼一定要加 .\(命令劫持防護)
type: topic-note
source: Gemini
category: 技術
tags: [gemini, powershell, venv, cli, 資安, command-hijacking]
sources:
  - https://gemini.google.com/app/ef263c5a546e4926
updated: 2026-06-25
---

# PowerShell 啟動 venv:為什麼一定要加 `.\`<mark style="background: #FF5582A6;">(命令劫持防護)</mark>

## 重點整理

### 症狀:venv 沒啟動成功

在 PowerShell 直接輸入 `Activate.ps1` 會跳紅字錯誤 <mark style="background: #FF5582A6;">`ObjectNotFound`(找不到物件)</mark>,代表 venv <mark style="background: #FF5582A6;">沒有成功啟動</mark>。

### 正解:加上 `.\`

在 PowerShell 執行「目前目錄下」的檔案時,<mark style="background: #BBFABBA6;">不能只打檔名,必須在前面加 `.\`</mark>:

```powershell
# 錯誤:會 ObjectNotFound
Activate.ps1

# 正確
.\Activate.ps1
# 常見完整路徑
.\venv\Scripts\Activate.ps1
```

> [!tip] PowerShell 出錯時,下方 `Suggestion [3,General]` 通常已經貼心提示正確寫法(就是叫你加 `.\`)。

### 為什麼人就在該目錄,PowerShell 還故意「裝看不到」?

這是<mark style="background: #ADCCFFA6;">「避免命令劫持(Command Hijacking)」</mark>的安全機制:<mark style="background: #FFF3A3A6;">PowerShell 預設不把「目前目錄」放進搜尋路徑(PATH)</mark>。

原因:如果預設可直接執行當前目錄的檔案,當你下載了一個惡意專案,裡面藏著偽裝成常用指令的惡意腳本(例如 `cd.ps1`、`ls.ps1`),你<mark style="background: #FF5582A6;">習慣性打 `ls` 想看檔案時,就會誤觸惡意程式</mark>。強制要求 `.\` 等於要你「明確指定:我就是要跑這個目錄裡的這支檔案」,避免被劫持。

> [!note] 這跟 Unix/Linux 一樣:在 bash 跑當前目錄腳本也要 `./script.sh`,道理相同(當前目錄不在 PATH 是刻意的安全設計)。

## 各對話來源

### PowerShell 虛擬環境啟動指南 (2026-06) — https://gemini.google.com/app/ef263c5a546e4926

> 註:本對話搭配使用者上傳的終端機錯誤截圖,Gemini 以「問答投影片」形式回答。

**使用者:** 我到底有沒有啟動到 venv?(附終端機截圖)

**Gemini:** 沒有成功啟動。終端機出現 `ObjectNotFound` 錯誤,因為在 PowerShell 執行目前目錄下的檔案不能直接輸入檔名,必須加上 `.\`。系統下方的 Suggestion 其實已給提示。(以投影片整理:錯誤原因、正確步驟、`.\` 的意義)

**Gemini(安全機制說明):** 為什麼人在現場(在該目錄下)PowerShell 還故意裝看不到?這叫「避免命令劫持(Command Hijacking)」機制。如果預設可執行當前目錄檔案,當你下載到惡意專案、裡面藏著偽裝成常用指令(如 `cd.ps1`、`ls.ps1`)的惡意腳本,你習慣性打 `ls` 就會誤觸惡意程式。所以要求加 `.\` 來明確指定執行路徑。
