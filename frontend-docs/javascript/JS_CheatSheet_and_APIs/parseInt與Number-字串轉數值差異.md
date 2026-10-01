---
title: parseInt() 與 Number()——字串轉數值的兩種路線
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, parseInt, Number, 型別轉換, 面試]
aliases: [parseInt與Number, 字串轉數字]
related:
  - "[[number-isnan-vs-isnan]]"
sources:
  - https://gemini.google.com/app/cc9d71781181bb4a
updated: 2026-09-23
---

# parseInt() 與 Number()——字串轉數值的兩種路線

> [!info]- 🔗 與既有筆記的關聯
> [[number-isnan-vs-isnan]] 記的是「轉換失敗後怎麼檢測 NaN」，本篇記的是「轉換本身怎麼做」——兩篇合起來剛好是字串轉數值這件事的前半段（轉換）與後半段（驗證結果）。

> 本篇重點 a–f，共 6 個。

## 重點整理

(a) <mark style="background: #ADCCFFA6;">parseInt() 是解析器（Parser）</mark>：<mark style="background: #FFF3A3A6;">從字串開頭逐字讀取，盡可能解析出整數，遇到第一個非數字字元就停止</mark>，允許字串尾巴接非數字內容。`parseInt("100px")` 結果是 `100`。

(b) <mark style="background: #ADCCFFA6;">Number() 是強制型別轉換（Type Coercion）</mark>：<mark style="background: #FF5582A6;">要求整串字串都符合合法數字格式</mark>，只要含有任何非數字字元（正負號、小數點、科學記號除外），整串直接判定失敗、回傳 `NaN`。`Number("100px")` 結果是 `NaN`。

(c) 對空字串與特殊值的處理，兩者常常不一致，<mark style="background: #FF5582A6;">容易誤判</mark>：

| 輸入值 | `parseInt()` | `Number()` | 說明 |
| --- | --- | --- | --- |
| `""`（空字串） | `NaN` | `0` | `Number()` 把空字串或純空格轉成 `0` |
| `null` | `NaN` | `0` | `Number(null)` 是 `0` |
| `undefined` | `NaN` | `NaN` | 兩者皆為 `NaN` |
| `true` / `false` | `NaN` | `1` / `0` | 只有 `Number()` 能轉換布林值 |

(d) <mark style="background: #FFF3A3A6;">小數點的處理方式完全不同</mark>：`parseInt()` <mark style="background: #FF5582A6;">直接無條件捨去小數點後所有內容</mark>（`parseInt("3.14")` 為 `3`）；`Number()` <mark style="background: #BBFABBA6;">保留完整小數</mark>（`Number("3.14")` 為 `3.14`）。

(e) <mark style="background: #FFB8EBA6;">進位（radix）支援只有 parseInt 有</mark>：`parseInt(string, radix)` 支援第二個參數指定進制（如 2 進位、16 進位），例如 `parseInt("10", 2)` 為 `2`；`Number()` <mark style="background: #FF5582A6;">不支援指定進制參數</mark>，只能自動識別字串中的 `0x`（十六進位）、`0b`（二進位）、`0o`（八進位）前綴。

```js
parseInt("100px")        // 100  —— 容錯，讀到 p 就停
Number("100px")          // NaN  —— 嚴格，整串必須合法

parseInt("3.14")         // 3    —— 捨去小數
Number("3.14")           // 3.14 —— 保留小數

parseInt("10", 2)        // 2    —— 指定二進位
Number("0b10")           // 2    —— 只能靠前綴自動識別
Number("10", 2)          // 10   —— 第二個參數被忽略，不支援 radix
```

(f) <mark style="background: #D2B3FFA6;">使用建議</mark>：要抽取字串開頭的整數（例如從 CSS 單位 `"20px"` 取出 `20`）或需要處理進制轉換，用 `parseInt()`；要嚴格驗證整串字串是否為合法數字、且需要保留小數，用 `Number()`（或更專門解析浮點數的 `parseFloat()`）。

## 各對話來源（原文）

### parseInt 與 Number 的差異（2026-09-23）— https://gemini.google.com/app/cc9d71781181bb4a

> **使用者：** 這邊用parseInt跟Number把字串轉換成數值差在哪
>
> **Gemini：** 在 JavaScript 中，將字串轉換為數值時，`parseInt()` 與 `Number()` 主要有以下幾點核心差異：1. 解析機制與容錯度——`parseInt()` 從開頭讀到非數字字元為止，允許尾巴有多餘內容；`Number()` 要求整串合法，否則回傳 `NaN`。2. 對空字串與特殊值的處理（見上表）。3. 小數點與進位支援——`parseInt()` 捨去小數、支援 radix 參數；`Number()` 保留小數、不支援 radix 參數，僅能自動識別 `0x`/`0b`/`0o` 前綴。使用建議：抽取開頭整數或處理進制用 `parseInt()`；嚴格驗證並保留小數用 `Number()` 或 `parseFloat()`。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/cc9d71781181bb4a | Gemini Flash，2026-09-23 |
| MDN — parseInt() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt | MDN 頁面最後修改於 2025-07-08，查證於 2026-09-23 |
| MDN — Number() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number | MDN 現行文件，查證於 2026-09-23 |

## 練習題（LeetCode／NeetCode 對照）

本題屬於基礎 API 語意題，沒有直接對應的 LeetCode 題號。想練「字串轉數字＋容錯解析」的手感，可以看 <mark style="background: #D2B3FFA6;">LeetCode 8. String to Integer (atoi)</mark>（https://leetcode.com/problems/string-to-integer-to-atoi/）——這題本質上就是要你自己手刻一個簡化版 `parseInt()`。

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| number-isnan-vs-isnan | 轉換失敗後怎麼判斷結果是不是 NaN，是本篇的下一步 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-23
