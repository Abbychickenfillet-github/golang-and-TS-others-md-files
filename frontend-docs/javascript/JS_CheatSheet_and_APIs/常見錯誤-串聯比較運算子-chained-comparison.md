---
title: 常見錯誤——JS 沒有數學式的「串聯比較」(1 <= n <= 100)
type: topic-note
tags: [javascript, 常見錯誤, comparison-operator, leetcode]
aliases: [常見錯誤-串聯比較運算子-chained-comparison, chained-comparison]
related:
  - "[[常見錯誤-括號引號沒收尾]]"
updated: 2026-08-07
---

# 常見錯誤：JS 沒有數學式的「串聯比較」

來源：把 LeetCode 題目 Constraints 寫的 `1 <= n <= 100` 直接複製貼上當成程式碼，例如誤寫成：

```js
let 1 <= n <= 100;   // SyntaxError: Unexpected number
```

## 兩層問題

1. **`let` 後面要接合法識別字**：`1` 不是識別字，直接語法錯誤，跟串聯比較無關，先天就寫錯。
2. **就算拿掉 `let`，`1 <= n <= 100` 語法合法但語意是錯的**：JS 的 `<=` 是**左結合**，會被拆解成 `(1 <= n) <= 100`：
   - 先算 `1 <= n` → 得到一個 boolean（`true`/`false`）
   - 再拿這個 boolean 跟 `100` 比較 → boolean 被強制轉成數字（`true`→`1`、`false`→`0`）
   - `1 <= 100` 或 `0 <= 100` → **結果永遠是 `true`**，不管 `n` 實際是多少

```js
console.log(1 <= 50 <= 100);    // true（正確，但巧合）
console.log(1 <= 999 <= 100);   // true（錯的！999 明明超出範圍）
console.log(1 <= -5 <= 100);    // true（錯的！-5 明明不在範圍內）
```

## 正確寫法

```js
n >= 1 && n <= 100
```

## 記憶法

JS 的比較運算子每次只能吃「兩個值」比出一個 boolean，boolean 不會自動被當成「範圍的一段」繼續往下比——只有 Python 這類語言才支援 `1 <= n <= 100` 這種真正的串聯比較語法。JS 裡看到多個 `<=`/`<` 接在一起，一律拆成 `&&` 兩兩比較。
