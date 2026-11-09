---
title: 選擇排序動畫顏色、n² 成因與偽代碼
type: topic-note
source: Gemini
tags: [gemini, algorithm, sort, big-o, pseudocode]
sources:
  - https://gemini.google.com/app/9990e3225c3c0a61
  - https://gemini.google.com/app/bc0f8996f7a6eaa1
updated: 2026-11-05
---

# 選擇排序動畫顏色、n² 成因與偽代碼

本篇重點 a–h，共 8 個

## 重點整理

### 一、選擇排序（Selection Sort）動畫與 O(n²)（對話 排序影片顏色含義）

(a) 影片《[軟體工程師雜談]輕鬆搞懂演算法：排序》的選擇排序動畫配色（Gemini 依畫面判讀）：<mark style="background: #FF5582A6;">紅色 = 目前找到的最小值</mark>、<mark style="background: #FFF3A3A6;">黃色 = 已排序區</mark>、<mark style="background: #ADCCFFA6;">藍色 = 正在掃描或尚未處理</mark>。
   ⚠️ 存疑：顏色語意是 Gemini 從截圖推測，請以影片實際圖例為準。
(b) 為什麼 O(n²)：外層迴圈走 n 次決定「要放哪個位置」→ 內層每次掃描剩餘未排序元素找最小值，次數 (n−1)+(n−2)+…+1 = n(n−1)/2 → 展開最高次項為 n²/2，Big-O 省略常數與低次項，成長級數為 O(n²)。
(c) 直覺：<mark style="background: #FFB8EBA6;">資料量 n 變 2 倍，比較次數約變 4 倍；n 變 10 倍約變 100 倍</mark>。

### 二、偽代碼與「Roughly proportional to n²」（對話 什麼是偽代碼）

(d) <mark style="background: #ADCCFFA6;">Pseudocode（偽代碼）</mark>是介於自然語言與程式語言之間的非正式描述，目的是專注邏輯步驟，不被語法（分號、括號、大小寫）綁架；不需編譯器，白板即可寫。
(e) 常用關鍵字：INPUT / READ / PRINT / RETURN；IF / THEN / ELSE；FOR / WHILE / DO...WHILE / REPEAT。
(f) 範例（及格判斷）：

```text
設定及格分數為 60
輸入學生成績 (score)
如果 score 大於或等於 60 則：顯示 "及格"
否則：顯示 "不及格"
```

   對應 JS：`const passingScore = 60;` 宣告常數 → `if (score >= passingScore)` 比較 → 成立 `console.log("及格")`，否則 `console.log("不及格")`。
(g) 「Roughly proportional to n²」意思是執行時間大約與 n 的平方成正比。投影片中 Insertion sort 為此級別，Merge sort 為 n log n，大量資料時後者快很多。
(h) 練習題：[LeetCode 912 Sort an Array](https://leetcode.com/problems/sort-an-array/)（可用選擇排序體驗 O(n²) 逾時，再換 merge sort）、[NeetCode 對應題](https://neetcode.io/problems/sort-an-array)。

## 各對話來源

### 排序影片顏色含義（2026-11-05 讀取）— https://gemini.google.com/app/9990e3225c3c0a61

使用者：影片的紅色跟黃色還有藍色是什麼意思　→　Gemini：見 a。
使用者：那為何是 n 平方　→　Gemini：見 b–c。

### 什麼是偽代碼（2026-11-05 讀取）— https://gemini.google.com/app/bc0f8996f7a6eaa1

使用者：Pseudocode 是什麼　→　Gemini：見 d–f。
使用者：Roughly proportional to n平方是什麼意思　→　Gemini：見 g。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 選擇排序 | [Wikipedia Selection sort](https://en.wikipedia.org/wiki/Selection_sort) | 未於本次重新抓取，請自行核對 |
| 偽代碼 | [Wikipedia Pseudocode](https://en.wikipedia.org/wiki/Pseudocode) | 未於本次重新抓取 |
| 題目 | [LeetCode 912](https://leetcode.com/problems/sort-an-array/) | 題目連結，未驗證題面更新 |
| 對話原文 | 見 frontmatter sources | 2026-11-05 讀取 |

相關筆記：[[冒泡排序法-range參數與時間複雜度]]（同為 O(n²) 的排序，可對照比較次數）。
