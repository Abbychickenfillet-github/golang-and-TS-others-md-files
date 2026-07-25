---
title: Vite 環境變數與 API Base URL 連接前後端
type: topic-note
source: Gemini
tags: [gemini, vite, env, frontend, backend]
sources:
  - https://gemini.google.com/app/461fca65f23454f0
updated: 2026-07-20
---

# Vite 環境變數與 API Base URL 連接前後端

## 重點整理

(a) `import.meta.env.VITE_API_BASE_URL` 這種寫在**前端**專案裡的變數，它的<mark style="background: #ADCCFFA6;">職責是指向後端 API 伺服器的網址</mark>，不是前端自己的路由。判斷依據：預設 fallback 值 `http://localhost:8080/api/v1` 中的 8080 是常見後端服務（Spring Boot/Go/Node）預設埠號，且 `/api/v1` 是典型後端版本化路由設計，前端通常不會這樣命名自己的路由。

(b) 容易搞混的點：<mark style="background: #FF5582A6;">「是誰在用這個變數」跟「這個變數指向哪裡」是兩件事</mark>——`VITE_` 前綴只是 Vite 建構工具的存取規則（Vite 出於安全考量，預設只把 `VITE_` 開頭的環境變數暴露給前端程式碼；不加前綴的變數編譯時會被忽略、前端完全讀不到），跟這個變數「裡面存的內容是後端網址」完全是兩回事。

(c) 比喻：前端專案的環境變數就像手機裡的通訊錄，`VITE_API_BASE_URL` 是聯絡人名稱，儲存的內容是店家（後端）的電話號碼；雖然通訊錄存在你手機（前端）裡，但撥出去的訊號連去的是外面的店家（後端）。

## 各對話來源

### API Base URL 連接前後端（2026-07-20）— https://gemini.google.com/app/461fca65f23454f0
使用者：這邊的apibaseurl是連接前端還是後端的
Gemini：apiBaseUrl 是用來連接後端的。環境變數命名、預設埠號 8080、路徑 /api/v1 都是後端特徵，前端讀這個網址是為了設定 API 客戶端該去哪裡抓資料。

使用者：但vite 是前端的意思耶，這樣才會導致我看不懂
Gemini：VITE_ 前綴確實代表這是 Vite 前端專案的變數（Vite 只讀取 VITE_ 開頭的環境變數才會暴露給前端），但這只是「誰在存取」的規則；變數裡面存的「內容」仍然是後端伺服器的位址。用通訊錄比喻：通訊錄放在你手機（前端）裡，但撥出去的電話連到外面的店家（後端）。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/461fca65f23454f0 | 2026-07-20 查證 |
| Vite 環境變數規則（僅暴露 VITE_ 前綴變數） | https://vitejs.dev/guide/env-and-mode.html | 與 Vite 官方文件說明一致，2026-07-20 查證 |
