---
title: PowerShell Get-Content -Raw 參數與 JSON 解析
type: topic-note
source: Gemini
tags: [gemini, powershell, json, cli]
sources:
  - https://gemini.google.com/app/1747f4356cf54034
updated: 2026-07-20
---

# PowerShell Get-Content -Raw 參數與 JSON 解析

## 重點整理

(a) `Get-Content settings.json`（<mark style="background: #FF5582A6;">不加 `-Raw`</mark>）會把檔案內容<mark style="background: #ADCCFFA6;">逐行讀成字串，並以陣列形式回傳</mark>——用 `$content.GetType()` 檢查會看到是集合型態，每一行是陣列中的一個元素。

(b) `Get-Content settings.json -Raw`（<mark style="background: #BBFABBA6;">加上 `-Raw`</mark>）會把<mark style="background: #ADCCFFA6;">整個檔案當成一個完整的長字串讀取</mark>，這樣才能正確解析出完整的 JSON 結構（無論原始資料是陣列還是物件）。`-Raw` 並不是把 JSON 的方括號移除，而是讓解析器能一次看到完整的 JSON 定義，避免逐行讀取把結構切碎。

(c) <mark style="background: #FF5582A6;">為什麼不加 `-Raw` 會讓 `ConvertFrom-Json` 解析出錯</mark>：因為 JSON 格式通常是一個整體結構，若被逐行拆成字串陣列，`ConvertFrom-Json` 可能無法正確還原原本的資料結構。

(d) 管線（pipe `|`）的意義：把左邊指令的輸出當作右邊指令的輸入。`Get-Content settings.json -Raw | ConvertFrom-Json` 整句意思是：把檔案完整讀成一個字串，交給 JSON 解析器（parser）處理。

(e) <mark style="background: #ADCCFFA6;">JSON 解析器 vs HTML 解析器</mark>的差異：JSON 解析器把輕量資料交換格式轉換成程式語言的資料結構（物件/陣列）；HTML 解析器把網頁原始碼轉換成 DOM 樹用來呈現網頁結構——一個處理資料、一個處理文件結構呈現。

(f) JSON 解析不需要像 Webpack/Vite 那樣的大型打包工具，因為它只是一種資料格式，多數程式語言都有內建解析工具：JS/TS 用內建 `JSON.parse()`，Java、Python 也都有對應內建函式庫或模組，不需額外安裝。

## 各對話來源

### Get-Content 阵列与 JSON 解析（2026-07-20）— https://gemini.google.com/app/1747f4356cf54034
使用者：（詢問畫面中框選的陣列）它是用 Get-Content settings 的 json 沒有 -Raw，那它會是哪個元素？所以原本的 settings content 它是一個陣列的意思嗎？
Gemini：不使用 -Raw 時，Get-Content 把每行讀成字串並以陣列回傳；因為 JSON 通常是整體結構，這樣處理容易讓 ConvertFrom-Json 解析錯誤或無法還原原本結構。

使用者：對，我在想為什麼他都非要寫成 -Raw，然後直接接 ConvertFrom-Json。因為他是把那個 JSON 全部變成一個大括弧，它沒有方括弧，它其實就是把方括弧移除了嗎？對不對？
Gemini：加上 -Raw 會讓 PowerShell 把整個 JSON 檔案當作一個長字串讀取，這樣才能正確解析 JSON 結構；-Raw 並沒有把方括號移除，而是讓解析器能看到完整的 JSON 定義。

使用者：那你可以再多講一點，甚至舉個例子給我看嗎？
Gemini：以 settings.json（含兩個物件的陣列）為例：不加 -Raw 時 `$content.GetType()` 是集合型態；加 -Raw 時 `$contentRaw` 是完整長字串，能順利解析出 JSON 結構物件。

使用者：（追問畫面框選的一段格式，雙引號、大括號、逗號、單引號混雜）所以這個到底是什麼格式呀？他舉這個例子是舉得很爛，還是說真的一般常見是這一種？
Gemini：指出畫面中那段格式看起來不像標準 JSON 語法（混雜單雙引號與括號），可能只是特殊情況說明，一般開發中不常見。

使用者：而管線是把左邊的輸出餵給右邊當輸入。整句是把檔案完整讀成一個字串交給 JSON 解析器。JSON 解析器 parser 有什麼？它跟一般的 HTML 解析器有什麼不同？
Gemini：JSON 解析器把資料格式轉為程式語言的資料結構（物件/陣列）；HTML 解析器把網頁原始碼轉為 DOM 樹用於呈現；一個處理資料，一個處理文件結構呈現。

使用者：那這上解析器它有個特別的名字嗎或是知名的產品，比如說 bundle 啊，webpack，vite，這些都是知名的東西。
Gemini：JSON 是資料格式，多數程式語言都有內建解析工具，不需要像 Webpack/Vite 那樣的打包工具；JS/TS 用內建 `JSON.parse()`，其他語言也有對應內建函式庫。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/1747f4356cf54034 | 2026-07-20 查證 |
| Get-Content -Raw 官方說明（Microsoft Learn） | https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-content | 與官方文件描述一致，2026-07-20 查證 |
