---
title: "BigInt n字尾與次方運算子-速記"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, bigint, 運算子]
sources:
  - https://gemini.google.com/app/cc7e3a94dd422fd3
updated: 2026-09-28
---

# BigInt `n` 字尾與 `**` 次方運算子速記

本篇重點 a–c，共 3 個。完整 BigInt 討論見 [[追問-BigInt取捨-不可變性-與包裝物件]]，本篇只補兩個小語法點。

## 重點整理

### a. `1n` 是 `BigInt` 型別，不是 `Number` 的 1

`1` 是傳統 `Number` 型別（雙精度浮點數），`1n` 是 <mark style="background: #ADCCFFA6;">BigInt 型別</mark>（任意精度整數）。JavaScript 引擎看到數字後面加 `n`，就當作 BigInt 的字面量語法糖，直接建立 BigInt 值。

```javascript
1n == 1;   // true（數值相等）
1n === 1;  // false（型別不同：bigint vs number）
1n + 2;    // TypeError: Cannot mix BigInt and other types
1n + 2n;   // 3n（必須都是 BigInt 才能計算）
typeof 1n; // "bigint"
```

<mark style="background: #FF5582A6;">不能跟一般 Number 直接混合運算</mark>，型別必須一致。

### b. `**` 是次方（冪次）運算符（ES2016／ES7 導入）

相當於數學的乘冪 `aᵇ`。ES6 之前用 `Math.pow(2, 3)`，ES2016 之後可以直接寫 `2 ** 3`：

```javascript
2 ** 3;      // 8
10 ** 2;     // 100
2n ** 54n;   // 18014398509481984n（BigInt 也適用）
```

### c. `**` 的優先順序與結合方向

<mark style="background: #FFF3A3A6;">`**` 優先順序比乘除法高，且是「由右至左」結合</mark>，跟大多數運算子的「由左至右」相反：

```javascript
2 ** 3 ** 2;  // 等於 2 ** (3 ** 2) = 2 ** 9 = 512
-2 ** 2;      // SyntaxError！一元負號不能直接放在底數前
(-2) ** 2;    // 4（要加括號）
```

---

## 各對話來源

### JavaScript 中 BigInt 的 `n` 字尾意義（2026-09-28）— https://gemini.google.com/app/cc7e3a94dd422fd3

使用者：這啥 1n是指1嗎

Gemini：1n 代表的數值是 1，但型別是 BigInt 不是 Number。`1n == 1` 為 true（數值相等），`1n === 1` 為 false（型別不同）；不能跟一般 Number 直接混算，`typeof 1n === "bigint"`。

使用者：** 這什麼運算符

Gemini：`**` 是次方運算符，相當於數學的 aᵇ。ES6 前用 `Math.pow`，ES2016 導入 `**` 語法糖。優先順序比乘除法高，由右至左結合（`2 ** 3 ** 2` 等於 `2 ** (3 ** 2)` = 512）；一元負號不能直接放底數前，`-2 ** 2` 會報 SyntaxError，需寫成 `(-2) ** 2`。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：JavaScript 中 BigInt 的 n 字尾意義 | https://gemini.google.com/app/cc7e3a94dd422fd3 | 對話擷取於 2026-09-28 |
| MDN：BigInt | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt | 查證於 2026-09-28 |
| MDN：Exponentiation (`**`) | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation | 查證於 2026-09-28 |

⚠️ 存疑／更正：無，內容經 MDN 核對正確。
