---
title: "常見錯誤-Number包住陣列變NaN-reduce爆錯"
---

# 常見錯誤：`Number(陣列)` 變成 `NaN` → `.reduce is not a function`

> 來源練習：`JavaScript-practicing/smallest-divisible-digit-product-2.js`
> 相關：[[陣列遍歷-forEach與callback]]

## 症狀

```
TypeError: Number(...).reduce is not a function
```

## 真正原因：`Number()` 只接受單一值，丟陣列進去會變 `NaN`

```js
const digits = String(86).split('');   // ['8', '6']  ← 這是陣列
const product = Number(digits).reduce((acc, digit) => {
    return acc * digit;
}, 1);
```

- `String(i).split('')` 把數字拆成**字元陣列**，例如 `['8', '6']`。
- `Number(['8', '6'])` 不會把每個元素轉成數字，而是想把整個陣列轉成**一個**數字 → 轉換失敗變成 `NaN`。
- `NaN` 是 number 型別，number 沒有 `.reduce` 方法 → `TypeError: Number(...).reduce is not a function`。

## 修正：直接對陣列呼叫 `.reduce`，單一字元才需要 `Number()`

```js
const digits = String(86).split('');
const product = digits.reduce((acc, digit) => {
    return acc * Number(digit);   // 轉換發生在「每一個字元」身上，不是整個陣列
}, 1);
```

## 關鍵心法

> **要轉型的是陣列「裡面的每一個元素」，不是陣列本身。**
> 看到 `Number(someArray)` 或 `String(someArray)` 直接包住陣列變數時，先想一下：
> 我是想轉整個陣列，還是想在 `.map()` / `.reduce()` 的 callback 裡轉每個元素？
> 幾乎所有情境都是後者。

## 怎麼快速抓

1. 錯誤訊息裡看到 `Number(...).reduce is not a function` 或類似「XXX 不是函式」，先檢查 `XXX(...)` 括號裡塞的到底是陣列還是單一值。
2. `console.log(typeof product)` 印出來確認是不是 `NaN`／`undefined`，而不是預期的陣列或數字。
3. 同一個檔案裡如果有另一支邏輯相同但正常運作的版本（像這次的 `smallest-divisible-digit-product.js`），直接逐行比對差異，通常一眼就能定位。
