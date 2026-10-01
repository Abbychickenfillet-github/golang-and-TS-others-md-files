---
title: "字串不可變性的 Console 除錯案例、隱式回傳複習與 localeCompare 在地化比較"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, string, immutable, localeCompare, charAt, implicit-return, debug]
aliases: [字串不可變性除錯案例, localeCompare在地化比較]
related:
  - "[[Day1-型別辨別-自動轉換-與immutable的四個層次]]"
  - "[[追問-BigInt取捨-不可變性-與包裝物件]]"
  - "[[箭頭函式的兩組括號-參數小括弧與主體大括弧-隱式回傳]]"
  - "[[JavaScript-字串方法]]"
  - "[[10-傳值vs傳址-賦值與記憶體空間]]"
sources:
  - https://gemini.google.com/app/597ed67d94e27bda
updated: 2026-09-25
---

# 字串不可變性、Console 除錯案例與 localeCompare 在地化比較

> 本篇重點 a–f，共 6 個。

> [!info] 與其他筆記的關聯（附理由）
> 1. 呼應 [[Day1-型別辨別-自動轉換-與immutable的四個層次]]、[[追問-BigInt取捨-不可變性-與包裝物件]]：那兩篇已經完整講過「原始型別不可變是什麼意思」，本篇 (a) 只是同一個結論再被 Abby 用自己的話覆述一次並得到確認，細節請看那兩篇。
> 2. 呼應 [[箭頭函式的兩組括號-參數小括弧與主體大括弧-隱式回傳]]：本篇 (b) 是那篇「隱式回傳／明確回傳」規則的一次實戰應用（字串比較函式）。

## 1. 不可變性再覆述一次（a）

(a) <mark style="background: #ADCCFFA6;">原始型別的值不能被修改，重新賦值改變的是「變數指向哪個記憶體位址」，不是原本位址上的值</mark>：`let name = "Alice"` 時 `name` 指向存 `"Alice"` 的位址；`name = "Bob"` 是在新位址存 `"Bob"`，讓 `name` 改指向新位址，原本 `"Alice"` 那格沒有被動過，之後沒有變數再指向它就會被 GC 回收。物件則相反：`let user = {name:"Alice"}; user.name = "Bob"` 是在同一個記憶體位址上直接改內容。完整的四層 immutable 拆解、與 `Object.freeze` 的關係，見 [[Day1-型別辨別-自動轉換-與immutable的四個層次]]。

## 2. Console 除錯案例：變數名打錯導致誤判（b）

(b) <mark style="background: #FF5582A6;">字串比較 `===`／`==` 一定是大小寫敏感（case-sensitive）的</mark>，`"string" === "String"` 必然是 `false`。Abby 在 Console 印出 `true` 的原因不是語言規則例外，而是打字時比較的變數名跟宣告的變數名不一致——宣告了 `c`、`d`，但 `console.log` 裡誤寫成比較 `a`、`b`，而 Console 之前的操作歷史裡 `a`、`b`剛好被賦過相同的值，所以印出 `true`。

```js
let c = "string";
let d = "String";
console.log(a == b);   // 比的是 a、b，不是 c、d！
console.log(a === b);  // 同上
```

> 🔧 除錯技巧：懷疑變數作用域或殘留值有問題時，直接比對字面值（string literal）排除變數污染：`console.log("string" === "String")` 必然印出 `false`，若結果不同，問題出在變數本身而非語言規則。

## 3. 箭頭函式隱式回傳複習（c）

(c) <mark style="background: #BBFABBA6;">箭頭函式省略大括號 `{}` 時，會自動把後面的運算式（Expression）結果當回傳值</mark>，稱為隱式回傳（Implicit Return）／運算式主體（Expression Body）；一旦加上 `{}`（區塊主體／Block Body），就必須手動寫 `return`，否則預設回傳 `undefined`：

```js
// 隱式回傳：單一運算式，不用 return，不用 {}
const areEqualInUpperCase = (str1, str2) =>
  str1.toUpperCase() === str2.toUpperCase();

// 明確回傳：加了 {} 就要自己寫 return
const areEqualInUpperCase2 = (str1, str2) => {
  return str1.toUpperCase() === str2.toUpperCase();
};
```

語法上更精確的講法：箭頭函式省略 `{}` 時後面只能接「單一運算式（Single Expression）」，不能放「陳述式（Statement，如 `if`、`for`、`const x=1;`）」；「有沒有 `{}`」才是判斷 Implicit／Explicit Return 的關鍵，這個規則的完整推演見 [[箭頭函式的兩組括號-參數小括弧與主體大括弧-隱式回傳]]。

## 4. localeCompare：語系敏感的字串比較（d–e）

(d) <mark style="background: #ADCCFFA6;">`localeCompare()` 是 JS 內建、語系敏感（Locale-aware）的字串比較方法</mark>，設計邏輯類似 C 語言的 `strcmp()`：回傳 `0` 代表相等，負數代表第一個字串排序在前，正數代表排序在後。

```js
"a".localeCompare("b"); // 負數，"a" 排在 "b" 前面
"b".localeCompare("a"); // 正數，"b" 排在 "a" 後面
"a".localeCompare("a"); // 0，相等
```

(e) <mark style="background: #FFB8EBA6;">帶入語言代碼（ISO 639-1）可以讓比較符合該語言的拼字／字母等價規則</mark>，因為不同語言對「大小寫」與「字母等價性」的規則不同：

```js
// 德語（de）：ß 與 ss 視為相同字母
"ß".localeCompare("ss", "de", { sensitivity: "base" }); // 0（相等）

// 土耳其語（tr）：無點小寫 ı 的大寫是 I，帶點小寫 i 的大寫是 İ，兩套系統不同
"ı".localeCompare("I", "tr", { sensitivity: "base" }); // 0（相等）
```

`de` = 德語（German），`tr` = 土耳其語（Turkish），皆為 ISO 639-1 語言代碼。

## 5. charAt 是 zero-based index（f）

(f) <mark style="background: #D2B3FFA6;">`charAt()` 使用 zero-based index（以 0 為起始的索引）</mark>：第一個字元索引是 `0`，最後一個字元索引是 `string.length - 1`。

```js
const str = "cat";
str.charAt(0); // "c"
str.charAt(1); // "a"
```

## 各對話來源（原文）

### JavaScript 基本型別字串與自動裝箱機制（標題與實際內容不符，實際內容為不可變性／Console除錯／localeCompare，2026-09-25）— https://gemini.google.com/app/597ed67d94e27bda

**使用者：** 基本型別的值是不能被改變的，他可以透過重新賦值來改變，但改的不會是同一個記憶體位址，我說的對嗎？

**Gemini：** 完全正確，重新賦值是換一個新位址存新值，讓變數改指向新位址，原本位址的值沒被修改。

**使用者：** `let c="string"; let d="String"; console.log(c===d); console.log(c==d);` 結果都是 true，為何？

**Gemini：** 字串比較一定大小寫敏感，`"string"==="String"` 必然是 false，結果異常通常是變數賦值或作用域問題，建議直接比對字面值排除。（後續 Abby 貼圖確認：實際打錯成比較 `a`、`b` 而非 `c`、`d`。）

**使用者：** 隱式回傳的箭頭函式為何不用大括號？「單一運算式」跟「陳述式」這兩個描述精確嗎？strcmp() 作何用？

**Gemini：** 省略 `{}` 時自動回傳單一運算式結果，即 Implicit Return；「陳述式」建議改稱「區塊主體／Block Body」更精確。`strcmp()` 是 C 語言的字串比較標準函式，JS 的 `localeCompare()` 設計邏輯與其相似。

**使用者：** "ß","ss","de" de 是德文嗎？"ı","I","tr" tr 是土耳其語嗎？

**Gemini：** 是的，`de` 是德語、`tr` 是土耳其語的 ISO 639-1 代碼，`localeCompare()` 帶入語言代碼可依該語言規則判斷字母等價性（如德語 ß=ss、土耳其語 ı/I 與 i/İ 是不同的大小寫配對）。

**使用者：** charAt is a zero-based index method，我這樣說對嗎？

**Gemini：** 完全正確，`charAt(0)` 是第一個字元，最後一個字元索引是 `length - 1`。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話 | https://gemini.google.com/app/597ed67d94e27bda | Gemini Flash，2026-09-25 擷取 |
| MDN — String.prototype.localeCompare() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare | MDN 現行版本，2026-09-25 查證 |
| MDN — String.prototype.charAt() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt | MDN 現行版本，2026-09-25 查證 |
| ISO 639-1 語言代碼表 | https://zh.wikipedia.org/zh-tw/ISO_639-1 | 2026-09-25 查證 |

> ⚠️ 存疑／更正：本篇 Gemini 對話標題為「JavaScript 基本型別字串與自動裝箱機制」，但實際內容完全沒有討論自動裝箱（Autoboxing），標題與內容不符，可能是 Gemini 自動命名時參考了較早的對話脈絡。自動裝箱機制請改看 [[自動裝箱與內建建構函式-大寫Symbol與小寫sym]]。

---

由 Gemini 對話自動整理 · 更新於 2026-09-25
