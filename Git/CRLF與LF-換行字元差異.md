---
title: CRLF 與 LF 的差異
type: topic-note
source: Gemini
tags: [gemini, git, 換行字元, CRLF, LF]
sources:
  - https://gemini.google.com/app/d04b20f6e150c6a2
updated: 2026-11-06
---

# CRLF 與 LF 的差異

> 本篇重點 a–e，共 5 個。關聯：[[git-line-endings-notes]]（Git 的 autocrlf 設定細節請看該篇）

## 重點整理

(a) <mark style="background: #ADCCFF;">換行（Line Feed，LF，`\n`，ASCII 10）</mark>：文字中「結束當前一行、游標往下一行」的控制字元。

(b) <mark style="background: #ADCCFF;">回車（Carriage Return，CR，`\r`，ASCII 13）</mark>：最初源自打字機與電傳打字機，作用是把游標（打字頭）移回「行首」。

(c) <mark style="background: #FFF3A3;">CRLF = CR + LF 兩個字元（`\r\n`）</mark>：Windows 與許多網路協定（HTTP、SMTP）使用。<mark style="background: #FFF3A3;">LF 只有一個字元（`\n`）</mark>：Linux、macOS 使用。

(d) 並非「不需要回車」：現代系統把「移回行首＋下移一行」整合成單一換行操作（LF），但回車符號在網路協定與舊格式（如 HTTP header 用 CRLF 分隔）中仍有特定作用。

(e) <mark style="background: #FF5582;">實務陷阱</mark>：跨平台協作時 CRLF 與 LF 混用，會造成 Git diff 整檔變動或 shell script 報 `^M` 錯誤，處理方式見 [[git-line-endings-notes]]。

## 各對話來源

### CRLF 與 LF 的差異（2026-11-06 查）— https://gemini.google.com/app/d04b20f6e150c6a2

使用者：什麼是換行？
Gemini：換行是指在文本中結束當前一行，並將游標移到下一行。
使用者：什麼字元？
Gemini：代表換行的控制碼。CRLF 包含「回車」和「換行」兩個字元，而 LF 只有「換行」一個。
使用者：回車是幹嘛用的？
Gemini：「回車」最初是用來把光標移回行首，現在則與換行配合，共同確定位置。
使用者：所以根本不需要回車嗎？
Gemini：並非不需要，而是現代系統將兩者整合成單一換行操作。回車符號在網路協定或舊格式中仍有其特定作用。
使用者：畫出來。
Gemini：（生成一張比較 CRLF 與 LF 的示意圖，圖片未存檔）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|------|------|-----------|
| 對話原文 | https://gemini.google.com/app/d04b20f6e150c6a2 | 2026-11-06 |
| CR/LF 與 HTTP 的 CRLF 規範 | https://developer.mozilla.org/zh-TW/docs/Glossary/CRLF | 2026-11-06 未線上核對，屬通用知識，請自行查證 |
