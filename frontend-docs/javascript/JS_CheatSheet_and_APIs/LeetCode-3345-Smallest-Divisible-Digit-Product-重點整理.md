---
title: LeetCode 3345「Smallest Divisible Digit Product I」練習重點總整理
type: index-note
tags: [javascript, leetcode, reduce, scope, toprimitive, tonumber, valueof, 型別轉換, 考題整理]
aliases: [LeetCode-3345-重點整理, smallest-divisible-digit-product-重點]
related:
  - "[[JavaScript-字串方法]]"
  - "[[15-ToPrimitive-ToNumber-型別轉換抽象操作]]"
  - "[[03-陳述式-Statement-vs-表達式-Expression]]"
  - "[[05-作用域-scope-global-function-block]]"
updated: 2026-08-09
---

# LeetCode 3345「Smallest Divisible Digit Product I」練習重點總整理

> 這不是新內容，是**索引頁**：`JavaScript-practicing/smallest-divisible-digit-product.js` 這一題前後問出來的所有子主題散落在好幾篇筆記裡，這裡集中列出來，方便考前或忘記時快速定位，細節都連到各自的完整筆記，不重複寫一次。

## 題目

> 給兩個整數 `n`（`1 <= n <= 100`）跟 `t`（`1 <= t <= 10`），回傳大於等於 `n` 的最小整數，使其「所有位數相乘」的結果能被 `t` 整除。

```js
var smallestNumber = function (n, t) {
    for (let i = n; ; i++) {
        const digits = String(i).split('');
        const product = digits.reduce((acc, digit) => acc * Number(digit), 1);
        if (product % t === 0) {
            return i;
        }
    }
};
```

## 重點清單（按程式碼出現順序）

| 主題 | 一句話結論 | 完整筆記 |
|---|---|---|
| `String(i)` 沒有固定長度 | `i` 是每圈都在變的計數器，長度＝這個整數的位數，不是規則 | [[JavaScript-字串方法]] |
| `for (let i=n; ;i++)` 沒有上限 | `n<=100` 是限制輸入 `n`，不是限制答案 `i`；官方解法同樣不設上限，最多找 9 步內必停 | [[JavaScript-字串方法]] |
| `i` 不是陣列指標 | 這裡沒有輸入陣列，`i` 本身就是被檢查的候選數字（generate-and-test），不是走訪索引 | [[JavaScript-字串方法]] |
| `.reduce(callback, initialValue)` | `initialValue` 可省略；省略時直接拿陣列第 0 個元素（原始型別，不轉型）當 acc 起始值，從索引 1 開始跑 | [[JavaScript-字串方法]] |
| callback 參數的作用域 | `acc`/`digit` 只在該箭頭函式內部看得到，外層 `console.log(acc)` 會 `ReferenceError` | [[05-作用域-scope-global-function-block]] 考點三 |
| 箭頭函式 `ConciseBody` | 沒花括弧＝`ExpressionBody`（隱式 return）；有花括弧＝`{ FunctionBody }`（要手動 `return`） | [[03-陳述式-Statement-vs-表達式-Expression]] (i) |
| `Number(digits).reduce(...)` 是錯的 | `Number(陣列)` 會先 `ToPrimitive`→`toString()`（陣列變 `"8,6"` 這種逗號字串）→ 轉數字變 `NaN`；`NaN` 身上沒有 `.reduce` | [[JavaScript-字串方法]]、[[15-ToPrimitive-ToNumber-型別轉換抽象操作]] |
| `acc * Number(digit)` 的隱式轉換 | `*` 運算子內部本來就會對兩邊呼叫跟 `Number()` 同一套 ToNumber，不是 reduce 幫你轉的 | [[15-ToPrimitive-ToNumber-型別轉換抽象操作]] |
| `valueOf()` 是什麼 | 物件降級成原始值的第一個嘗試；陣列沒覆寫，繼承的版本回傳自己（沒用），才會落到 `toString()` | [[15-ToPrimitive-ToNumber-型別轉換抽象操作]] |
| `.toString()` vs `String()` | `String(null)` 安全、`null.toString()` 噴錯，因為兩者走的轉換路徑完全不同 | [[JavaScript-字串方法]]、[[15-ToPrimitive-ToNumber-型別轉換抽象操作]] |
| 陣列層 vs 元素層 | 這題所有 `Number()` 誤用的根本心法，都是「在陣列層做了該在元素層做的事」，跟 `array-of-objects-存取練習.html` 是同一套心法 | 見 `JavaScript-practicing/array-of-objects-存取練習.html` |

## 自我檢查（蓋住答案自己講一次）

1. `String(i)` 的長度是固定的嗎？為什麼？
2. 為什麼這個 `for` 迴圈不用設 `i <= 100`？
3. `.reduce()` 不給 `initialValue` 會怎樣？舉例說明第一輪 `acc` 會是什麼。
4. `Number(['8','6'])` 執行完會變成什麼？中間經過哪幾步？
5. `acc * Number(digit)` 裡，`*` 做了什麼你沒寫出來的事？
6. 如果把 `console.log(acc)` 寫在 `.reduce()` 呼叫外面，會發生什麼事？為什麼？
