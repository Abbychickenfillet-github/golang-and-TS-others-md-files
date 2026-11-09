---
title: sort() 預設字串 Unicode 排序陷阱，與 Array.from() 的用途
type: topic-note
source: Gemini
category: tech
tags: [gemini, javascript, array, sort, Array.from, unicode, utf-16, 類陣列]
sources:
  - https://gemini.google.com/app/0136642ea43870c8
updated: 2026-10-28
charset: utf-8
---

# sort() 預設字串 Unicode 排序陷阱，與 Array.from() 的用途

本篇重點 a–i，共 9 個。

## 重點整理

### 1. sort() 沒給比較函式時會發生什麼事

(a) <mark style="background: #ADCCFFA6;">sort()（陣列排序方法）</mark>在<mark style="background: #FF5582A6;">沒有傳入比較函式（comparator）時，會先把每個元素轉成字串（ToString）</mark>，再逐字元比較 UTF-16 碼元（code unit）的數值大小。
  - 為什麼：這是 ECMAScript 規範的預設行為，不管陣列裡原本是 Number 還是字串都一樣。
  - 官方說明見 [MDN Array.prototype.sort](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)。

(b) 數字陣列範例：

```js
const numbers = [9, 80, 10, 2];
numbers.sort();
console.log(numbers); // [10, 2, 80, 9]（"10" 的第一個字元 '1' 最小，"9" 的 '9' 最大）
```

(c) <mark style="background: #BBFABBA6;">正解是永遠傳比較函式</mark>：升冪寫 `(a, b) => a - b`，降冪寫 `(a, b) => b - a`。

```js
numbers.sort((a, b) => a - b); // [2, 9, 10, 80]
```

(d) 符號比較的驗證：`$` 是 U+0024（十進位 36），`%` 是 U+0025（十進位 37），所以 `['%', '$'].sort()` 得到 `['$', '%']`。
  - 與 [[JS字串-UTF-16碼元與代理對Surrogate-Pair-ECMAScript定義]] 相關，因為 sort 比的是碼元而不是「字」，所以遇到代理對（surrogate pair）時順序可能不符直覺。

### 2. Array.from() 的核心用途

(e) <mark style="background: #ADCCFFA6;">Array.from()（陣列工廠方法）</mark>：把<mark style="background: #FFF3A3A6;">類陣列（有 length 與索引）或可迭代物件（iterable）轉成真正的陣列</mark>，轉完才能用 map、filter、sort 等陣列方法。見 [MDN Array.from](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/from)。
  - 與 [[11-陣列的底層記憶體-一般陣列與型別陣列與類陣列-ArrayBuffer視圖與Transferable]] 相關，因為那篇講的就是類陣列為什麼不是真陣列。

(f) 具體需求四種：
  - DOM 集合：`querySelectorAll` 回傳 NodeList 沒有 map，所以寫 `Array.from(divs, div => div.textContent)`。
  - 函式的 `arguments` 物件：`Array.from(arguments)`。
  - 快速產生序列：`Array.from({ length: 5 }, (_, i) => i + 1)` 得到 `[1, 2, 3, 4, 5]`，第二個參數就是 map 函式。
  - 拆字串：`Array.from(str)` 依「Unicode 碼點（code point）」拆，不會把代理對切成兩半。

(g) 字串變陣列最常見的是 `split()`：標籤用 `split(', ')`、URL 路徑用 `split('/')`、CSV 用 `split('\n')` 再 `split(',')`、單字統計用 `split(' ')`、逐字元處理用 `split('')`。
  - 注意：`split('')` 依 UTF-16 碼元切，遇到 🔥 這類代理對會被切碎，這時改用 `Array.from(str)` 或展開運算子 `[...str]`。

### 3. ⚠️ 存疑與更正

(h) <mark style="background: #FF5582A6;">⚠️ Gemini 的 Emoji 範例有誤</mark>：它寫 `"❤️🔥JS".split('')` 會壞掉而 `Array.from` 會得到 `['❤️', '🔥', 'J', 'S']`。實際上 `❤️` 是兩個碼點（U+2764 加變體選擇符 U+FE0F），所以 `Array.from` 得到的是 5 個元素 `['❤', '️', '🔥', 'J', 'S']`，要把 `❤️` 當一個字形需用 `Intl.Segmenter`。而 `split('')` 壞掉的是 🔥（代理對）不是 ❤。
  - 這點為我（Claude）依 ECMAScript 字串規格推論，未即時重新查證網頁，建議在 console 自行跑一次確認。

(i) 原對話「由小到大」「U+0024 排在 U+0025 前面」的說法正確。

## 各對話來源

### JavaScript 排序替代方案（2026-10-28 擷取）— https://gemini.google.com/app/0136642ea43870c8

使用者：但如果是數字呢

Gemini：即使陣列裡裝的是 Number，不加比較函式 `.sort()` 仍會轉字串排序，`[9,80,10,2]` 得到 `[10,2,80,9]`，正解 `(a,b)=>a-b`。

使用者：Sort 是利用把每個數字或字串變成 Unicode 編碼去比較，U+0024 會排在 U+0025 前面？

Gemini：完全正確，`['%','$'].sort()` 得到 `['$','%']`。

使用者：字串變成陣列比較常用在哪裡

Gemini：split() 的五種情境（標籤、URL、CSV、單字統計、單字元處理）。

使用者：我意思是 Array.from 用在哪 → 具體來說什麼需求

Gemini：NodeList 轉陣列、Emoji 安全拆字串（⚠️ 範例有誤，見重點 h）、產生序列、處理 arguments。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原對話 | https://gemini.google.com/app/0136642ea43870c8 | 2026-10-28 擷取 |
| Array.prototype.sort | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/sort | MDN，2026-10-28 引用（未即時重抓內文） |
| Array.from | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/from | MDN，2026-10-28 引用（未即時重抓內文） |
| 題目練習（待補） | https://leetcode.com/problems/sort-array-by-increasing-frequency/ | 自訂比較函式排序練習 |
