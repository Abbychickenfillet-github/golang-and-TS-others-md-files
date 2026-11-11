---
title: JS 字串為何是 UTF-16 與 at() 的負數索引
type: topic-note
source: Gemini
tags: [gemini, javascript, string, utf-16, es2022]
sources:
  - https://gemini.google.com/app/432e3b4a8690e328
updated: 2026-11-09
---

# JS 字串為何是 UTF-16 與 at() 的負數索引

本篇重點 a–e，共 5 個。關聯：[[JavaScript-字串方法]]（字串方法總表）。

## 重點整理

(a) <mark style="background: #ADCCFFA6;">String</mark> 是 JavaScript 全域物件與建構子，字串字面值可用單引號 `'`、雙引號 `"` 或樣板字面值 `` ` `` 建立，這種稱為 primitive string，用 `String()` 轉型也得到 primitive，用 `new String()` 才得到物件。

(b) <mark style="background: #FFF3A3A6;">JavaScript 字串內部以 UTF-16 儲存</mark>，每個基本單位叫 code unit，長度 16 位元。
　原因：1995 年設計語言時，UTF-16 足以涵蓋當時 Unicode 的 BMP 範圍，所以沿用至今，並非選 UTF-8。

(c) Emoji 或罕見字超出 BMP，需要兩個 code unit（surrogate pair，代理對）表示。
　`charAt()`、`at()`、索引 `str[i]` 都以 code unit 為單位，遇到 Emoji 可能切到半個字元。<mark style="background: #FF5582A6;">這是用索引處理 Emoji 的陷阱</mark>。

(d) `at()` 是 ES2022 新增的方法，可傳負整數，從字串尾端倒數。

```js
const s = "hello";
s.charAt(-1);      // ""（charAt 不支援負數，回傳空字串）
s[s.length - 1];   // "o"（舊寫法，較繁瑣）
s.at(-1);          // "o"（倒數第 1 個）
s.at(-2);          // "l"（倒數第 2 個）
```

(e) 常用實體方法：`toLowerCase`、`toUpperCase`、`trim`、`replace`、`split`、`indexOf`、`substring`。

## 自我測驗（點開看答案）

<details><summary>1. JS 字串底層是 UTF-8 還是 UTF-16？為什麼？</summary>UTF-16。1995 年設計時 UTF-16 足以涵蓋 BMP，沿用至今。</details>

<details><summary>2. 為何用索引處理 Emoji 會出錯？</summary>Emoji 佔兩個 code unit（surrogate pair），索引以 code unit 計算，可能只取到一半。</details>

<details><summary>3. 是非題：charAt(-1) 會回傳最後一個字元。</summary>非。charAt 不接受負數，回傳空字串；要用 at(-1)。</details>

## 各對話來源

### JS 字串說明（2026-11-09）— https://gemini.google.com/app/432e3b4a8690e328

使用者：（貼上 MDN String 頁面）你說了什麼意思
Gemini：說明 String 全域物件與建構子：字串建立、length、concat、indexOf、substring、charAt 與索引存取、大小寫轉換、trim、replace、split。

使用者：為什麼這邊是 UTF16 不是 UTF-8？at the specified index accept negative integer 允許負整數 which count back from the last string character
Gemini：整理如重點 (b)(c)(d)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| String 與 at() | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/String/at | MDN，本次未重新抓取（2026-11-09），ES2022 導入 at() |
