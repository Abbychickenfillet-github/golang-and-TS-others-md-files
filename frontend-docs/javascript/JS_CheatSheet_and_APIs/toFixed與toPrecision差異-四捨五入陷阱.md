---
title: toFixed() 與 toPrecision()——控制對象、四捨五入陷阱與科學記號規則
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, toFixed, toPrecision, 浮點數, IEEE754, 面試]
aliases: [toFixed與toPrecision, 浮點數四捨五入陷阱]
related:
  - "[[parseInt與Number-字串轉數值差異]]"
sources:
  - https://gemini.google.com/app/a413bb16a7394d11
updated: 2026-09-23
---

# toFixed() 與 toPrecision()——控制對象、四捨五入陷阱與科學記號規則

> [!info]- 🔗 與既有筆記的關聯
> [[parseInt與Number-字串轉數值差異]] 講的是「字串怎麼變成數字」，本篇講的是「數字怎麼變回字串顯示」，是同一條資料流的頭尾兩端。

> 本篇重點 a–l，共 12 個。

## 重點整理

### 一、核心差異：控制對象不同（a–c）

(a) <mark style="background: #ADCCFFA6;">兩者的核心差異是「算位數的起點不同」</mark>：`toFixed(n)` 控制<mark style="background: #FFF3A3A6;">小數點後的位數</mark>，起點固定在小數點 `.` 之後，適合貨幣、金額、百分比這種「一定要顯示到小數後幾位」的場景；`toPrecision(n)` 控制<mark style="background: #FFF3A3A6;">整體的有效數字</mark>，起點是<mark style="background: #FF5582A6;">從第一個非 0 的數字開始算</mark>，適合科學計算、測量數據這種要求整體精確度的場景。

```js
const num = 123.4567;

// toFixed：規定「小數點後面要留幾位」
num.toFixed(2);      // "123.46"（小數點後留 2 位，四捨五入）
num.toFixed(0);      // "123"（只留整數）

// toPrecision：規定「整串數字一共要留幾位有效數字」
num.toPrecision(2);  // "1.2e+2"（總共只要 2 位，整數放不下就轉科學記號）
num.toPrecision(4);  // "123.5"（從頭數 4 位：1,2,3,5）
```

(b) <mark style="background: #FF5582A6;">「toPrecision 不處理小數點後面的位數」是常見誤解</mark>：它一樣會處理小數，只是<mark style="background: #BBFABBA6;">算盤從最左邊（第一個非 0 數字）開始數，而不是從小數點開始數</mark>。

```js
(12.3456).toPrecision(4); // "12.35" —— 4 位有效數字：1,2,3,5，小數點後留了 2 位
(12.3456).toPrecision(2); // "12"    —— 只要 2 位：1,2，小數點後全部捨棄
```

(c) <mark style="background: #D2B3FFA6;">單字記憶法</mark>：`toFixed` 對應英文 <mark style="background: #ADCCFFA6;">Fixed point（定點數）</mark>，相對於 Floating point（浮點，小數點位置會「浮動」），Fixed 就是把小數點「釘死」在某個位置，後面只准留 n 位（如 `toFixed(2)` 固定留 2 位，像 `$10.50`）。`toPrecision` 對應英文 <mark style="background: #ADCCFFA6;">Precision（精確度）</mark>：不管數字多大多小，只要求前 n 位最有價值的數字。

### 二、四捨五入為什麼會「跟想像的不一樣」（d–h）

(d) <mark style="background: #FF5582A6;">根本原因：JavaScript 用 IEEE 754 雙精度浮點數（64-bit）儲存所有數字</mark>。許多十進位小數轉成二進位後會變成無限循環小數，電腦只能在邊界截斷，因而產生微小的<mark style="background: #FFF3A3A6;">精度偏差（Precision Error）</mark>。`toFixed()`／`toPrecision()` 處理的其實是<mark style="background: #BBFABBA6;">已經被二進位微幅調整過的近似值</mark>，不是你輸入的十進位原始數字。

(e) <mark style="background: #FF5582A6;">經典陷阱：`(1.005).toFixed(2)` 不是 `"1.01"` 而是 `"1.00"`</mark>：

```js
(1.005).toFixed(2);        // "1.00" —— 不是直覺的 "1.01"！
(1.005).toPrecision(20);   // "1.0049999999999998934" —— 這才是它在記憶體裡的真實值
```

因為二進位無法精確表達 `0.005`，實際存的是 `1.00499999999999989...`。`toFixed(2)` 四捨五入時看的是小數點後第 3 位——是 `4`（小於 5），所以被捨去，結果變成 `"1.00"`。對照組 `(1.015).toFixed(2)` 因為實際存的是 `1.0150000000000001243`（比 1.015 微幅偏大），結果就如預期是 `"1.02"`。

(f) <mark style="background: #ADCCFFA6;">除了二進位表示誤差，規範本身的捨入定義也會影響結果</mark>：`(1.25).toPrecision(2)` 是 `"1.3"`（正常進位），因為 `1.25` 剛好能被二進位精確表示；一旦數字無法被精確表示，結果就取決於誤差是微幅偏大還是偏小。

(g) <mark style="background: #FF5582A6;">解法：不要在金融／帳務場景直接依賴原生 `toFixed()`</mark>。三種修正方式：

1. <mark style="background: #BBFABBA6;">改用最小單位整數儲存</mark>——把金額換算成「分／角」再計算，避開小數點（例如 `$1.05` 存成整數 `105` 分）。
2. <mark style="background: #BBFABBA6;">指數修正技巧（Exponential Correction）</mark>——利用科學記號把小數點暫時往右移，四捨五入完再移回來：

```js
function safeRound(num, decimalPlaces) {
  const factor = Math.pow(10, decimalPlaces);
  return (Math.round(Number(num + "e" + decimalPlaces)) / factor).toFixed(decimalPlaces);
}
safeRound(1.005, 2); // "1.01" —— 正確修正
```

3. <mark style="background: #BBFABBA6;">改用任意精度（Arbitrary-precision）套件</mark>——`big.js`（輕量，適合金融金額）、`decimal.js`（功能更完整）、`bignumber.js`。

(h) <mark style="background: #FFB8EBA6;">`toPrecision(20)` 是很好用的偵錯技巧</mark>：把精度拉到 20 位，直接看某個小數在記憶體裡「真正」被存成什麼樣子，可以用來驗證浮點數誤差是否是結果不如預期的原因。

### 三、科學記號 vs. 一般小數：`toPrecision` 怎麼決定要不要展開（i–l）

(i) <mark style="background: #FFF3A3A6;">`toPrecision()` 的設計目標是「優先給人類閱讀」</mark>，不是每種情況都硬輸出科學記號。引擎算出標準科學記號後，會依規則二選一：直接展開成一般小數，或維持科學記號。

(j) <mark style="background: #ADCCFFA6;">判斷條件 1：展開成一般小數會不會「失真」</mark>。`123.4567.toPrecision(2)` 的科學記號是 `1.2×10²`，展開成一般數字是 `120`——但 `120` 看起來像 3 位有效數字，跟要求的「2 位」語意不符，<mark style="background: #FF5582A6;">不允許展開，強制用 `"1.2e+2"`</mark>。`toPrecision(4)` 的科學記號是 `1.235×10²`，展開是 `123.5`，剛好 4 位有效數字（1,2,3,5）完全不失真，<mark style="background: #BBFABBA6;">允許展開為 `"123.5"`</mark>。

(k) <mark style="background: #ADCCFFA6;">判斷條件 2：指數 e 是否落在 −6 ≤ e < n 的可讀範圍內</mark>。只要指數在這個舒適區內、且展開不失真，就優先展開成一般小數（`123.5` 比 `1.235e+2` 直覺）。

```text
123.4567.toPrecision(2)
└─► 標準科學記號：1.2 × 10²
   ├─► 嘗試展開：120（無法精準表達 2 位有效數字 ❌）
   └─► 最終輸出："1.2e+2"

123.4567.toPrecision(4)
└─► 標準科學記號：1.235 × 10²
   ├─► 嘗試展開：123.5（剛好完美符合 4 位有效數字 ✔️）
   └─► 最終輸出："123.5"
```

(l) <mark style="background: #FF5582A6;">小數點的位置不是固定在「倒數第一位」</mark>，純粹取決於原數字的數量級與要求的有效位數 n。舉例（皆要求 4 位有效數字）：`(0.123456).toPrecision(4)` → `"0.1235"`（4 位全在小數點後）；`(1234.56).toPrecision(4)` → `"1235"`（展開後剛好是整數，連小數點都不用寫）。規則就是：先數出前 n 個有效數字，再把小數點「放回原本的數量級位置」。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/a413bb16a7394d11 | Gemini Flash，2026-09-23 |
| MDN — Number.prototype.toPrecision() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toPrecision | MDN 頁面最後修改於 2025-07-10，查證於 2026-09-23 |
| MDN — Number.prototype.toFixed() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed | MDN 現行文件，查證於 2026-09-23 |
| IEEE 754 雙精度浮點數規範背景 | https://en.wikipedia.org/wiki/Double-precision_floating-point_format | 一般參考，查證於 2026-09-23 |

## 各對話來源（原文）

### JS toFixed 與 toPrecision 差異（2026-09-23）— https://gemini.google.com/app/a413bb16a7394d11

> **使用者：** JS的NUMBER物件 的toFixed方法跟toPrecision() 差在哪裡？示範。所以toPrecision是不處理小數點後面的位數。toFixed 語意上是算固定浮點數嗎 不對他沒有講到浮點 所以要如何聯想這個字跟小數點的關係
>
> **Gemini：**（見上方重點整理 a–c，含 toFixed 控制小數位、toPrecision 控制有效數字的完整說明與 Fixed/Precision 的英文記憶聯想法）
>
> **使用者：** 請說明 JavaScript 的 toFixed 和 toPrecision 在進行四捨五入時，為什麼有時結果跟想像的不一樣？（浮點數精度問題）
>
> **Gemini：**（見上方重點整理 d–h，含 `1.005.toFixed(2)` 陷阱範例與三種金融場景修正法）
>
> **使用者：** 為什麼結果不用 1.235×10² 表示？所以是不是小數點都在倒數第一位
>
> **Gemini：**（見上方重點整理 i–l，含科學記號展開規則與小數點位置判斷）

## 練習題（LeetCode／NeetCode 對照）

本題屬於 API 語意與浮點數精度題，沒有直接對應的 LeetCode 題號。想練「浮點數誤差」的手感，可以看 <mark style="background: #D2B3FFA6;">LeetCode 972. Equal Rational Numbers</mark>（https://leetcode.com/problems/equal-rational-numbers/，需比較不同表示法是否代表同一個有理數，會碰到類似的精度判斷）。

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| parseInt與Number-字串轉數值差異 | 同一條資料流的另一端：字串轉數字 vs. 數字轉字串顯示 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-23
