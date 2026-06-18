---
title: JS → TS → Jest 學習順序建議
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, typescript, jest, 學習計畫]
sources:
  - https://gemini.google.com/app/0f46e54ab4f0d948
updated: 2026-06-11
---

# JS → TS → Jest 學習順序建議

## 重點整理

### 順序:先 JS 再 TS,正確

- TS 本質是「加了型別檢查的 JS」;JS 基礎不穩直接學 TS 會分不清是 JS 語法卡住還是 TS 型別報錯。
- JS 必練核心:迴圈(for/while)、條件(if else)、非同步與錯誤處理(try catch)、fetch/axios 串 API。

### Mosh 的 1 小時 TS 影片不會太久

(TypeScript Tutorial for Beginners — Programming with Mosh,完整課程其實有 5 小時,這是精華版)

- 前 20 分鐘:TS 基本觀念(靜態 vs 動態型別)、環境架設、tsconfig.json、除錯。
- 20–45 分鐘:核心型別(any、陣列、Tuples、Enums)、Function 型別限制。
- 最後 15 分鐘:進階(Type Aliases、Union Types、Optional Chaining)。
- 看法:不用一次看完;先 20 分鐘把環境+Hello World 跑通,之後看一小段就暫停自己敲、故意寫錯體會編譯期抓錯的威力。

### Jest:現階段「大概了解」就好

- 單元測試要在程式碼有規模、邏輯複雜或重構時才顯威力;剛學完迴圈和 API 就硬塞 Mocking 容易挫折。
- 現在只需要知道:`test()`/`it()` 區塊、斷言 `expect(結果).toBe(預期)`、怎麼在終端機跑測試看綠燈/紅燈。
- 建議:找 10–15 分鐘短影片或 Jest 官方 Getting Started,手寫 `sum(a, b)` + 測試 `expect(sum(1,2)).toBe(3)` 即可,進階等專案變大再深入。

## 各對話來源

### JS, TS, 和 Jest 學習建議(2026-06)— https://gemini.google.com/app/0f46e54ab4f0d948

使用者:我先練 JS 的迴圈、if else、try catch、API,之後再練 TypeScript,順序可以嗎?TS 看一小時影片(Mosh)會不會太久?Jest 一定要跟著影片做還是大概了解就好? → Gemini:順序完美(TS=加型別的 JS);1 小時影片是 5 小時課程精華版,含金量高,建議分段看+動手敲;Jest 現階段了解概念即可(test/expect/跑測試),寫個 sum 函式測試就算入門,進階留到專案變大。
