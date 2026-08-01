---
title: 跳脫字元 Escape Character——為什麼路徑要寫雙反斜線 \\
type: topic-note
source: Gemini
tags: [gemini, javascript, json, escape-character, 跳脫字元]
aliases: [跳脫字元-Escape-Character-雙反斜線]
related:
  - "[[常見錯誤-括號引號沒收尾]]"
sources:
  - https://gemini.google.com/app/e9574289ecdd42a4
updated: 2026-07-29
---

# 跳脫字元 Escape Character——為什麼路徑要寫雙反斜線 \\

## 重點整理

本篇重點 (a)–(c)，共 3 個。

### (a) 單一反斜線在多數語言裡是「特殊字元的信號」
在 JavaScript、JSON 等語言裡，單一反斜線 `\` 是用來定義「特殊控制字元」的符號，例如：

- `\n` 代表換行
- `\t` 代表 Tab 鍵
- `\"` 代表字串內的雙引號

<mark style="background: #FF5582A6;">如果 Windows 路徑直接寫成 `C:\coding\notes...`，解析器遇到 `\n` 會把它當成「換行指令」，導致路徑解析出錯。</mark>

### (b) 為什麼要寫兩個反斜線 `\\`——跳脫反斜線本身
為了讓程式知道「這裡只是要表達一個普通的反斜線符號，不是特殊指令」，就必須用另一個反斜線把它<mark style="background: #ADCCFFA6;">跳脫（escape）</mark>，因此寫成 `\\`。

### (c) 畫面上看到雙斜線，實際執行時會還原成單斜線
畫面顯示的是 JSON／字串格式的**原始資料**，所以會看到 `\\`；但當系統背後真正拿去給 Windows 作業系統執行檔案操作（例如搬移檔案）時，它會被正確還原為單一斜線的實際路徑 `C:\coding\...`。

<mark style="background: #FFB8EBA6;">記憶心法：資料表示層（JSON/字串原始碼）要雙斜線防止誤判；作業系統實際拿到手的是還原後的單斜線真實路徑。</mark>

## 各對話來源

### 雙斜線的跳脫字元用法（2026-07-29）— https://gemini.google.com/app/e9574289ecdd42a4

使用者：你說了為什麼這邊要用兩個斜線，是跳脫字元嗎？

Gemini：沒錯，這正是跳脫字元（Escape Character）的用法。單一反斜線 `\` 在 JS／JSON 等語言中用來定義特殊控制字元（`\n` 換行、`\t` Tab、`\"` 雙引號），若路徑直接寫 `C:\coding\notes...`，解析器遇到 `\n` 會誤判成換行指令。為了表達「這是一個普通反斜線，不是特殊指令」，必須用另一個反斜線跳脫它，寫成 `\\`。畫面顯示的是 JSON／字串原始資料所以是雙斜線，但系統背後真正拿去給 Windows 執行檔案移動時，會被正確還原為單一斜線的實際路徑。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/e9574289ecdd42a4 | 2026-07-29 查證 |
