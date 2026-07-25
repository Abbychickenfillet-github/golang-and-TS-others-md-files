---
title: ChatGPT 匯出 JSON 顯示 Unicode 跳脫序列，其實不是亂碼
type: topic-note
source: Gemini
tags: [gemini, json, unicode, encoding, chatgpt-export, llm]
sources:
  - https://gemini.google.com/app/ece94f44b8465e74
updated: 2026-07-23
---

# ChatGPT 匯出 JSON 顯示 Unicode 跳脫序列，其實不是亂碼

本篇重點 a–d，共 4 個

## 重點整理

(a) <mark style="background: #BBFABBA6;">資料沒有壞掉、也不是亂碼</mark>：把 ChatGPT 對話資料匯出後，用一般文字編輯器打開看到一堆看不懂的符號（例如 `你好` 這種格式），其實是 <mark style="background: #ADCCFFA6;">Unicode 跳脫序列（Unicode escape sequence）</mark>——JSON 格式為了讓檔案能安全跨平台傳輸、避免編碼衝突，會把非 ASCII 字元（如中文）轉成 `\uXXXX` 這種「用 ASCII 字元表示任意 Unicode 字元」的寫法儲存。

(b) <mark style="background: #ADCCFFA6;">解法：用支援 Unicode 的工具開啟</mark>：只要用能正確解析 JSON／支援 Unicode 的軟體（例如 VS Code 開啟並用 JSON 格式檢視、或用程式語言的 JSON 解析器 `json.loads()` / `JSON.parse()` 讀取），`\uXXXX` 就會自動還原顯示成正常的中文字，不需要手動「反轉」或「解碼」。

(c) <mark style="background: #FF5582A6;">常見誤解</mark>：使用者直覺會覺得「檔案裡都是英文字母跟數字，怎麼可能是我打的中文」，因而懷疑檔案壞掉或編碼跑掉；但這其實是 JSON 規格本身的正常行為（`\u` 跳脫是 JSON 標準允許的字元表示法之一），不是資料損毀，也不影響餵給其他 AI 使用——只要對方讀取時用的是標準 JSON 解析器，就能正確還原文字內容。

(d) <mark style="background: #FFB8EBA6;">實務意義</mark>：這類匯出檔（如 ChatGPT/Gemini 對話紀錄的 `.json`）本質上仍是完整、可用的純文字資料，適合用來餵給其他 AI 工具做二次利用（例如整理成筆記、建置 RAG）；重點是用「解析 JSON 的方式」讀，而不是用純文字編輯器「肉眼直接讀」。

## 相關筆記
- [[backend/MySQL外鍵與字元集問題筆記]]（同樣是「資料看起來亂碼」的疑惑，但成因不同：MySQL 是資料庫欄位字元集設定錯誤，這篇則是 JSON 標準的 Unicode 跳脫序列，兩者可對照理解「亂碼」的不同成因）

## 各對話來源

### 为什么我把ChatGPT的资料，对话资料给下载下来之后，它每一个file就是，这是乱码，我说的文字怎么可能是乱码？这样子我喂给其他的AI还有用吗？（2026-07-23）— https://gemini.google.com/app/ece94f44b8465e74
使用者：daily conversations 没有。
Gemini：說明對話資料沒有遺失，看到的是 Unicode 編碼，JSON 用這種方式儲存各語言文字，用支援 Unicode 的軟體打開就能正常顯示中文。

使用者：可是他们都显示英文呐，他们自己也不是乱码，那我应该用什么（軟體開啟）
Gemini：釐清顯示的英文數字組合（`\uXXXX`）就是 Unicode 跳脫序列本身的樣子，建議用 VS Code 等支援 JSON 解析的工具開啟。

使用者：（後續多輪追問「這些粉紅色的是中文字吧」「你把它反轉為中文字源」等，反覆確認 Gemini 是否真的看得懂内容）
Gemini：重申這是 JSON 標準的 Unicode 跳脫序列寫法，不是加密或亂碼，用支援 Unicode 的解析工具讀取即可正確還原，資料本身完整可用。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/ece94f44b8465e74 | 2026-07-23 查證 |
| JSON 規格（RFC 8259，字串跳脫規則） | https://www.rfc-editor.org/rfc/rfc8259 | IETF 標準文件，2026-07-23 查證 |
