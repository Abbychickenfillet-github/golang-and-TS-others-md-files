# 日期物件：getDay() 與 switch 的 case 0

## ❓ 問題：switch 通常都從 `case 0:` 開始嗎？

**不是。** switch 沒有「要從 0 開始」這種規則。`case` 後面寫什麼，完全取決於你 switch 的那個運算式「可能是哪些值」。

截圖那個例子之所以有 `case 0`，是因為它 switch 的是 `date.getDay()`，而 **`getDay()` 的回傳值是 0~6**：

| 回傳值 | 星期 |
|---|---|
| 0 | 星期日（Sunday）|
| 1 | 星期一 |
| 2 | 星期二 |
| ... | ... |
| 6 | 星期六 |

所以是 **`getDay()` 從 0 開始**，不是 switch 從 0 開始。

> ⚠️ 易混淆：`getDate()` 回傳「幾號」(1~31)，`getDay()` 回傳「星期幾」(0~6)。兩個別搞混。
> 月份 `getMonth()` 也是從 0 開始（0=一月、11=十二月），這也是常見陷阱。

## 🔧 switch 的真正運作

把運算式的值，用 **`===`（嚴格相等）** 逐一比對每個 `case` 的值，中了就從那裡開始執行，直到 `break`。

- case 的值可以是任意值、任意順序（數字、字串皆可）。
- 沒有「一定要連續」或「一定要從 0/1 開始」的限制。
- 你只是「忠實地照著資料的值域」去寫 case。

```js
// 對象是 getDay() → 值域 0~6 → 從 case 0 開始
switch (new Date().getDay()) {
  case 0: console.log("星期日"); break;
  case 6: console.log("星期六"); break;
  default: console.log("平日");
}

// 對象是字串 → 根本沒有 0
switch (status) {
  case "pending": break;
  case "done":    break;
}

// 對象是 1~3 的選單 → 從 case 1 開始
switch (choice) {
  case 1: break;
  case 2: break;
  case 3: break;
}
```

## 💡 小結
「要不要有 `case 0`」只看你的資料會不會出現 0。`getDay()`、`getMonth()` 這類「從 0 起算」的 API，自然就會用到 `case 0`。

## 🔗 相關
- [[考題]]（JS-W3Schools-2週計畫）Checkpoint 2 有 switch fall-through 的陷阱題
