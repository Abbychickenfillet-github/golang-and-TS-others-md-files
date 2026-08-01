---
title: curl 與 Python 處理 API 資料（json.load(sys.stdin) 終端機管線）
type: topic-note
source: Gemini
tags: [gemini, curl, python, cli, json, api-debug]
sources:
  - https://gemini.google.com/app/0e09f9bbea8d6ad9
updated: 2026-07-27
---

# curl 與 Python 處理 API 資料

本篇重點 a–e，共 5 個

## 重點整理

a. 這是把 <mark style="background: #ADCCFFA6;">curl（資料獲取）</mark>與 <mark style="background: #ADCCFFA6;">Python 一行腳本（資料處理）</mark>用管線 `|` 串起來的組合技，用於快速從本地 API 拿 JSON、格式化印出特定欄位，常見於除錯（Debug）情境：

```bash
curl -s http://localhost:8010/api/v1/public/activities 2>&1 | python3 -c "
import sys,json
data=json.load(sys.stdin)
for a in data:
    print(f\"{a['slug']}: week_days={a.get('week_days',[])} \
time_slots={a.get('time_slots',[])} \
schedule={a.get('schedule_start','')}-{a.get('schedule_end','')}\")"
```

b. `curl -s`：`-s`（silent）靜默模式，不顯示進度條或錯誤訊息；`2>&1` 把「標準錯誤 stderr」導向「標準輸出 stdout」，讓後面的程式也能接收到錯誤訊息（管線只會傳遞 stdout，不加這行的話 curl 的錯誤訊息就會被丟掉、看不到）。

c. `python3 -c "..."`：直接在終端機執行一段小型腳本，不用寫成 `.py` 檔。核心是 <mark style="background: #FFF3A3A6;">`data = json.load(sys.stdin)`</mark>：讀取從 curl 傳來的資料流（stdin），解析為 Python 的 list 或 dict。搭配 `a.get('week_days', [])` 這種寫法，欄位不存在時給預設值，避免 KeyError。

d. 整體資料流：<mark style="background: #BBFABBA6;">發起請求（curl）→ 管線導向（`|`）→ 解析與格式化（python）→ 終端機顯示</mark>。這種方式常用於自動化測試或快速除錯，不需要寫完整 `.py` 檔就能用 Python 字典處理能力解析複雜 JSON 結構。

e. <mark style="background: #D2B3FFA6;">替代方案</mark>：如果系統有裝 `jq`，同樣的功能可以縮短成一行：

```bash
curl -s ... | jq -r '.[] | "\(.slug): week_days=\(.week_days) time_slots=\(.time_slots)"'
```

`jq` 是專用 JSON 命令列處理器，比起呼叫整個 Python 直譯器更輕量，適合純粹的 JSON 篩選/格式化場景；但若後續要做更複雜的邏輯運算（迴圈、條件判斷、串接其他 Python 生態工具），Python 的彈性較高。

## 自我測驗

1. （填空題）`curl -s ... 2>&1 | python3 -c "..."` 中，`2>&1` 的作用是把 ______ 導向 ______，讓錯誤訊息也能透過管線傳給後面的程式。
   答案：||標準錯誤（stderr）；標準輸出（stdout）||
2. （是非題）`json.load(sys.stdin)` 是把終端機輸入的文字指令解析成 JSON。
   答案：||✗。它是讀取「從 curl 傳來的資料流（stdin）」並解析成 Python 的 list 或 dict，不是解析終端機指令本身。||
3. （申論題）`jq` 和 `python3 -c` 都能處理 curl 回傳的 JSON，什麼情況下該選哪一個？
   答案：||純粹的 JSON 篩選/格式化場景，`jq` 更輕量、不需啟動整個 Python 直譯器；但若後續需要更複雜的邏輯運算（迴圈、條件判斷、串接其他 Python 生態工具如 pandas），用 python3 -c 彈性較高。||

## 與既有筆記的關聯

- 與 [[CLI/curl-是哪個系統的-與PowerShell的curl別名陷阱|curl-是哪個系統的-與PowerShell的curl別名陷阱]] 相關：那篇講的是 curl 本身在 Windows / PowerShell 環境下的「身分」問題（`curl.exe` vs `Invoke-WebRequest` 別名陷阱）；本篇則是 curl 在 macOS/Linux/WSL 環境下，如何跟 Python 串成資料處理管線，屬於「curl 的下游應用」而非「curl 本身是什麼」。
- 與 futuresign 專案的後端除錯情境相關：範例中的 `localhost:8010/api/v1/public/activities` 與 `slug` 欄位是專案實際 API，顯示這種 curl+python 一行指令是 Abby 日常在確認 API 回傳格式是否正確時使用的手法。

## 各對話來源（原文）

### cURL 與 Python 處理 API 資料（2026-07）— https://gemini.google.com/app/0e09f9bbea8d6ad9

使用者：`curl -s http://localhost:8010/api/v1/public/activities 2>&1 | python3 -c "import sys,json; data=json.load(sys.stdin); for a in data: print(f\"{a['slug']}: week_days={a.get('week_days',[])} time_slots={a.get('time_slots',[])} schedule={a.get('schedule_start','')}-{a.get('schedule_end','')}\")" 2>&1` 解釋這段語法

Gemini：這是結合 curl 與 Python 腳本的單行指令，目的是從本地 API 獲取 JSON 資料，並將特定欄位格式化印出。`curl -s` 向指定 URL 發送請求，`-s` 靜默模式不顯示進度條或錯誤訊息；`2>&1` 把標準錯誤導向標準輸出，讓錯誤訊息也能經由管線傳給後面的程式處理。`python3 -c` 部分：`import sys, json` 載入模組；`data=json.load(sys.stdin)` 讀取從 curl 傳來的資料流並解析為 Python 的 list/dict；`for a in data` 遍歷每個活動物件；`a.get('week_days', [])` 欄位不存在時預設空列表。整體流程：發起請求 → 導向輸出 → 解析與格式化 → 終端機顯示。若系統有裝 `jq`，可以用更短的 `jq -r` 指令達到同樣效果；但 `python -c` 配合 `json.load(sys.stdin)` 的好處是不需要寫完整 `.py` 檔案就能用 Python 字典處理能力解析複雜資料結構。指令最後的 `2>&1` 會捕捉 Python 執行過程中的任何錯誤（例如 API 回傳的不是合法 JSON），這在偵錯時很有幫助。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| curl + python 一行指令解析 | https://gemini.google.com/app/0e09f9bbea8d6ad9 | Gemini 對話，2026-07 |
| Python json 模組官方文件 | https://docs.python.org/3/library/json.html | 查證時請以官方文件最新版為準 |
| jq 官方文件 | https://jqlang.org/ | 查證時請以官方文件最新版為準 |

⚠️ 存疑/更正：無明顯錯誤。
