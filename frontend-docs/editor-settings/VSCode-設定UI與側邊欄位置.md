---
title: VS Code / Cursor 設定介面（UI vs JSON）與側邊欄位置
type: topic-note
source: Gemini
tags: [gemini, vscode, cursor, 編輯器設定, 快捷鍵]
sources:
  - https://gemini.google.com/app/d135e5531d8bdfdf
updated: 2026-06-17
---

# VS Code / Cursor 設定介面（UI vs JSON）與側邊欄位置

## 重點整理

> [!warning] 為什麼按 `Ctrl + ,` 會直接跳到文字編輯？
> 沒出現平常的圖形化設定搜尋介面、卻直接開啟類似 `settings.json` 的文字檔，代表預設設定檢視器被鎖定在<mark style="background: #FF5582A6;">「文字（JSON）模式」</mark>。

### 找回圖形化設定介面（兩步驟）

**方法一：命令面板（最快）**

1. 按 <mark style="background: #FFF3A3A6;">`Ctrl + Shift + P`</mark> 開啟命令面板。
2. 輸入 `Preferences: Open User Settings`（中文：`開啟使用者設定`）。
3. 點選<mark style="background: #BBFABBA6;">沒有寫 (JSON)</mark> 的那個選項，即回到圖形介面。

**方法二：永久改回 `Ctrl + ,` 開圖形介面**

在 `settings.json` 檢查或加入：

```json
"workbench.settings.editor": "ui"
```

若這行目前是 `"json"`，每次按快捷鍵就會直接跳文字編輯；改回 <mark style="background: #BBFABBA6;">`"ui"`</mark> 即恢復正常（在圖形介面搜尋 `Workbench > Settings: Editor` 也能改）。

### 對調／移動側邊欄位置
回到圖形介面後搜尋 <mark style="background: #ADCCFFA6;">`Side Bar Location`</mark> 即可把側邊欄在左右之間切換。

## 各對話來源

### 編輯器側邊欄位置快速對調(2026-06)— https://gemini.google.com/app/d135e5531d8bdfdf
使用者：為何我現在打 Ctrl + , 會馬上跑到一個地方編輯文字？ → Gemini：因設定檢視器被切到 JSON 文字模式；用 Ctrl+Shift+P → Open User Settings（非 JSON）回到圖形介面，或在 settings.json 把 `workbench.settings.editor` 設為 `"ui"`；再搜尋 Side Bar Location 調側邊欄。
使用者：(附圖)是這邊嗎？ → Gemini：對，Workbench > Settings: Editor 已顯示 ui 即正常。
