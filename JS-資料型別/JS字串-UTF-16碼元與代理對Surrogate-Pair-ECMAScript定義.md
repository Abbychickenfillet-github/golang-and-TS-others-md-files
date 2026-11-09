---
title: JS 字串 — ECMAScript 的定義、UTF-16 碼元與代理對（Surrogate Pair）
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - javascript
  - string
  - utf-16
  - unicode
  - ecmascript
sources:
  - https://gemini.google.com/app/420cb46c3d9bb0af
  - https://gemini.google.com/app/ab67eaf810cc056a
related:
  - "[[JavaScript資料型別總覽-原始型別與物件]]"
updated: 2026-10-23
---

# JS 字串 — ECMAScript 的定義、UTF-16 碼元與代理對（Surrogate Pair）

本篇重點 a–i，共 9 個

> 關聯原因：[[JavaScript資料型別總覽-原始型別與物件]] 把 String 列為原始型別，本篇往下挖「規格書到底怎麼定義 String」以及「為什麼 emoji 的 length 是 2」。

## 重點整理

(a) <mark style="background: #ADCCFFA6;">Textual data（文本資料）</mark>是以文字、字元或符號記錄、用來傳達人類語言的資料，通常是非結構化或半結構化。
　　應用包含 NLP（Natural Language Processing，自然語言處理）、搜尋引擎索引、文本探勘。

(b) ECMAScript 規格 6.1.4 The String Type 的定義：<mark style="background: #FFF3A3A6;">String 型別是「所有由零個或多個 16 位元無號整數所組成的有序序列」的集合</mark>。
　　ordered（有序）：`"ab"` 與 `"ba"` 是不同字串，每個位置有固定 index。
　　zero or more（零個或多個）：長度可為 0，長度 0 就是空字串 `""`。

(c) <mark style="background: #FFF3A3A6;">JS 字串的元素是 UTF-16 碼元（Code Unit），不是 Unicode 字元（Code Point）</mark>。
　　一個碼元就是一個 16-bit 數值，範圍 0x0000–0xFFFF。

(d) 規格的另一句：「ECMAScript operations that do not interpret String contents apply no further semantics」，意思是<mark style="background: #BBFABBA6;">不需要理解內容的操作，只把字串當成 16-bit 數值陣列處理，不附加任何額外語意</mark>。

(e) 兩類操作的差別：

| 類型 | 例子 | 引擎做了什麼 |
|---|---|---|
| 不解析內容 | `+` 拼接、`.length`、`[i]`、`substring` | 只複製或計算碼元，不管它是不是代理對 |
| 解析內容 | `normalize()`、`localeCompare()`、正規表達式 `u` flag | 把碼元還原成 Code Point，並套用語言或文字規則 |

(f) <mark style="background: #ADCCFFA6;">代理對（Surrogate Pair）</mark>：超過 U+FFFF 的字元（如 emoji）無法放進單一 16-bit，所以拆成「高位代理 + 低位代理」兩個碼元。
　　高位代理範圍 0xD800–0xDBFF，低位代理範圍 0xDC00–0xDFFF。

(g) 具體例子「😀」（Grinning Face）：Code Point 是 U+1F600，在 JS 裡拆成 0xD83D（高位）與 0xDE00（低位）。

```js
const emoji = "😀";
console.log(emoji.length);                      // 2，因為佔 2 個碼元
console.log(emoji.charCodeAt(0).toString(16));  // "d83d" 高位代理
console.log(emoji.charCodeAt(1).toString(16));  // "de00" 低位代理
console.log("😀");                    // "😀" 兩個碼元拼起來才是完整字元
console.log([...emoji].length);                 // 1，展開運算子依 Code Point 迭代
```

(h) <mark style="background: #FF5582A6;">陷阱：`.length`、`[i]`、`charAt` 看的是碼元，所以含 emoji 的字串用它們切割會切出「孤立代理」（亂碼）</mark>。
　　<mark style="background: #BBFABBA6;">要依字元處理請用 `[...str]`、`for...of` 或 `codePointAt`</mark>。

(i) 設計目的：保持基本字串操作極快，不必每次都做完整 Unicode 檢查。

⚠️ 存疑/更正：Gemini 說「`emoji[0]` 會印出亂碼或問號」，實際輸出依 console 與字型而定（可能是 `�` 或空白），重點是它「不是合法字元」。另外並非所有 emoji 都是 2 個碼元，組合 emoji（如家庭、膚色、旗幟）由多個 Code Point 以 ZWJ（Zero Width Joiner，零寬連接符）串起，長度更長。

## LeetCode / NeetCode 相關題目

- [393. UTF-8 Validation](https://leetcode.com/problems/utf-8-validation/)：練習判斷多位元組編碼的位元規則，和代理對的概念同屬「變長編碼」。
- [344. Reverse String](https://leetcode.com/problems/reverse-string/)：若字串含代理對，天真地反轉碼元會破壞 emoji，可作為延伸思考。

## 各對話來源（原文）

### Textual Data 簡介（2026-10）— https://gemini.google.com/app/420cb46c3d9bb0af

**使用者：** 說明一下： textual data

**Gemini：** Textual data（文本資料）是指以文字、字元或符號形式記錄的非結構化或半結構化資料，主要用於傳達人類語言與意思。（組成單位、編碼方式、應用等，節錄）

**使用者：** 說明一下： interpret String contents apply no further semantics.

**Gemini：** 這句話出自 ECMAScript 規範中關於 String 的定義：「ECMAScript operations that do not interpret String contents apply no further semantics.」意思是對於不需要解析字串內容的操作，不會為該字串施加任何額外的語意。（節錄）

**使用者：** 具象化：「是不是高低代理對（Surrogate Pairs，如 Emoji 符號是由兩個 16-bit 碼元組成的 Unicode 碼位）。」長怎樣

**Gemini：** 以「😀」為例：Unicode 碼位 U+1F600，拆成高位代理 0xD83D 與低位代理 0xDE00，兩塊積木扣在一起才是完整的笑臉。（程式碼見上方 (g)）

### 解說 ECMAScript 字串定義（2026-10）— https://gemini.google.com/app/ab67eaf810cc056a

**使用者：** 說明一下： of all ordered sequences of zero or more

**Gemini：** 翻譯為「所有由零個或多個…所組成的有序序列」。完整句子為 The String type is the set of all ordered sequences of zero or more 16-bit unsigned integer values…（節錄）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| String Type 定義 | [ECMA-262 String Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type) | Living Draft，2026-10-23 列出 |
| 代理對與 length | [MDN：String.length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length) | 2026-10-23 列出，未逐字核對 |
| 對話原文 | 上列兩則 Gemini 連結 | 2026-10 |
