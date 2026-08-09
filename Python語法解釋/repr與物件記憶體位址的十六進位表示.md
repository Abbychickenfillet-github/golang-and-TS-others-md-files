---
title: Python repr() 是什麼？物件記憶體位址為何用十六進位顯示
type: topic-note
source: Gemini
tags: [gemini, python, repr, hex, debug]
aliases: [repr筆記, Python repr]
related:
  - "[[進位制-二進制-十六進制-Bytes與RGB]]"
sources:
  - https://gemini.google.com/app/41f1bf8c77763be4
updated: 2026-08-05
---

# Python repr() 是什麼？物件記憶體位址為何用十六進位顯示

> 與 [[進位制-二進制-十六進制-Bytes與RGB]] 相關：那篇從硬體／CPU 角度講「為什麼到處是十六進制」，這篇是同一個換算規則（1 個 16 進位字元＝4 bits）在 Python 語言層級的實際案例——`repr()` 印出物件記憶體位址時，就是用這套規則顯示成 `0x1077f2f10` 這種格式，兩篇對照看才知道「為什麼 debug 訊息長這樣」的完整脈絡。

## 重點整理

本篇重點 (a)–(c)，共 3 個。

### (a) repr 是什麼

<mark style="background: #ADCCFFA6;">repr 是「representation（表示法）」的縮寫</mark>，`repr()` 是 Python 內建函式，用來回傳一個物件的「官方」字串表示形式。這個字串的設計目標是<mark style="background: #FFF3A3A6;">盡可能明確且無歧義</mark>，主要用途是讓開發者在除錯（debugging）時能清楚知道物件的內部狀態。

### (b) 為什麼自訂類別的 repr() 會印出十六進位位址

當建立一個自訂類別的物件（例如 `JustAnExample`），且沒有特別定義它的顯示方式（沒有覆寫 `__repr__`）時，<mark style="background: #ADCCFFA6;">Python 預設的 repr() 輸出行為，是印出該物件的模組與類別名稱，以及它在記憶體中的實體位址</mark>，例如 `<__main__.JustAnExample object at 0x1077f2f10>`。Python 會自動以十六進位（Hexadecimal）形式顯示這個記憶體位址，因為十六進位能比十進位更簡潔地對應底層的二進位資料。

### (c) 1 位十六進位＝4 bits，1 byte 要用 2 位十六進位

<mark style="background: #ADCCFFA6;">1 個 16 進位數字＝4 個 bits（位元）</mark>：二進位中 4 個 bits 的組合剛好能產生 16 種不同數值（`0000`~`1111`，即十進位 0~15），完美對應 16 進位的 `0`~`F`。

<mark style="background: #ADCCFFA6;">1 個 byte＝8 bits＝2 位十六進位數字</mark>：byte 的標準大小是 8 個 bits，既然 1 個 16 進位數字只佔 4 bits，就需要 2 個 16 進位數字才能拼湊出一個完整的 byte（4+4=8 bits）。這也是電腦記憶體「最小可定址單位」通常是 1 byte、而該 byte 剛好能用剛好兩位十六進位數字表示的原因。

<mark style="background: #D2B3FFA6;">這一段換算規則跟 [[進位制-二進制-十六進制-Bytes與RGB|進位制筆記]] 第 2 節「為什麼到處是十六進制」完全同一套邏輯，只是這裡是 Python `repr()` 印記憶體位址這個具體應用場景。</mark>

## 各對話來源

### Python repr 與十六進位表示（2026-08-05）— https://gemini.google.com/app/41f1bf8c77763be4

使用者：repr?

Gemini：repr 是「representation」的縮寫，是 Python 內建函式，用來回傳物件的「官方」字串表示形式，目標是明確無歧義，方便除錯。你在 CIS 211 @ University of Oregon 網頁選取的段落中，自訂類別物件（例如 JustAnExample）若沒特別定義顯示方式，repr() 預設會印出模組與類別名稱，以及它在記憶體中的實體位址，並以十六進位形式顯示（例如 `0x1077f2f10`），因為十六進位比十進位更簡潔對應底層二進位資料。

使用者：1位16進制是代表幾個bytes還是bits

Gemini：1 位 16 進制數字代表 4 個 bits。二進位中 4 個 bits 剛好能產生 16 種數值（0000~1111，對應十進位 0~15），完美對應 16 進位的 0~F。與 bytes 的關係：1 byte 標準大小是 8 bits，既然 1 位 16 進制只佔 4 bits，需要 2 位 16 進制才能拼湊出一個完整 byte。正如 CIS 211 文章提到：電腦記憶體最小可定址單位通常是 byte（8 個二進位數字），一個 byte 剛好可以用兩個 16 進制數字表示。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/41f1bf8c77763be4 | 2026-08-05 查證 |
| CIS 211 @ University of Oregon（對話中引用的原始教材網頁，講 repr() 與物件記憶體位址範例） | 對話中未附完整網址，建議 Abby 自行搜尋該課程頁面核對原文 | 建議 Abby 之後自行核對 |
