---
title: Day 10 三個「數學上沒錯」卻在正式環境炸掉的例子
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 防禦性程式設計, 邊界條件]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊
---

# Day 10｜三個「數學上沒錯」卻在正式環境炸掉的例子

> 純 Markdown，可直接貼到 iThome。

昨天講**出錯之後怎麼處理**——分清楚該炸還是該回傳。今天往前退一步：**有些 bug 根本不該走到「處理」這一步，因為它本來就寫得出來、也躲得掉。**

今天不重構一段完整的函式，而是拆三個很小、很容易被忽略的 bug 類型，每一個都用實測證明它是真的會發生，不是唬人的。

---

## 一、浮點數比較：數學是對的，比較卻是錯的

```js
const items = [
  { name: '杯子', price: 129.9, qty: 2 },
  { name: '盤子', price: 59.9,  qty: 1 },
  { name: '碗',   price: 19.9,  qty: 1 },
]
const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
```

`129.9 * 2 + 59.9 + 19.9` 用計算機算是 **339.6**。實測：

```
原始小計應該是 339.6，實際算出來: 339.59999999999997
rawSubtotal === 339.6 → false  ⚠️ 明明數學上是對的，比較卻是 false
```

**這不是加法寫錯，是 IEEE 754 浮點數格式本來就沒辦法精確表示大部分的十進位小數。** JavaScript 的 `Number` 全部都是浮點數，沒有獨立的整數型別，所以這個問題在 JS 裡特別容易踩到。

如果你的程式碼裡有 `if (total === 339.6)` 這種直接比較金額的判斷式，**它有很高機率永遠不會成立**，而且只有在特定的數字組合下才會發生，平常測試很難測到。

### 兩種修法

```js
// 修法一：容差比較
function isApproximately(value, target, epsilon = 1e-9) {
  return Math.abs(value - target) < epsilon
}

// 修法二：全程用「分」為單位，整數運算
function subtotalInCents(items) {
  return items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.qty, 0)
}
```

實測：改用「分」為單位計算，`33960` 分，整數，沒有任何誤差。**修法二比修法一更根本**——容差比較只是繞過症狀，把金額全部換成整數（分）才是讓這個 bug**從一開始就寫不出來**。這也是為什麼 Stripe、多數金流系統的 API 都用「最小貨幣單位的整數」而不是浮點數在傳金額。

---

## 二、迴圈邊界：off-by-one，以及「修了一半」的陷阱

需求：拿陣列最後 N 筆。

```js
function getLastNItems_buggy(arr, n) {
  const result = []
  for (let i = arr.length - n; i <= arr.length; i++) {   // <= 多跑一次
    result.push(arr[i])
  }
  return result
}
```

實測：

```
buggy  getLastNItems(['A','B','C','D','E'], 3) → [ 'C', 'D', 'E', undefined ]
```

`<=` 讓迴圈多跑了一次，`i` 會等於 `arr.length`，讀到陣列外面，得到 `undefined`。改成 `<` 就修好了，對吧？

```js
function getLastNItems_fixed(arr, n) {
  const result = []
  for (let i = arr.length - n; i < arr.length; i++) {
    result.push(arr[i])
  }
  return result
}
```

**這裡是我自己在寫這篇文章、跑 demo 的時候才發現的事**：上面這個「fixed」版本只修好了一半。

```
n 比陣列長度大的邊界情境 getLastNItems_fixed(['A','B','C','D','E'], 99) →
[ undefined ×94 個, 'A', 'B', 'C', 'D', 'E' ]
```

當 `n`（99）比陣列長度（5）大時，`arr.length - n` 是 `-94`，迴圈**從負數開始跑**，一路 push 了 94 個 `undefined` 才進到真正的資料。**上界修好了，下界從來沒檢查過。**

真正修好的版本要多一行：

```js
function getLastNItems_robust(arr, n) {
  const result = []
  const start = Math.max(0, arr.length - n)   // 起點不能是負數
  for (let i = start; i < arr.length; i++) {
    result.push(arr[i])
  }
  return result
}
```

三個版本，用同樣的邊界情境（`n` 剛好等於長度／`n` 大於長度／空陣列）各測一次，統計「命中異常結果」的次數：

| 版本 | 命中異常結果 | 修了什麼 |
|---|---|---|
| `buggy` | 3 / 3 | 什麼都沒修 |
| `fixed` | 2 / 3 | 修了上界（`<=` → `<`），沒修下界 |
| `robust` | 0 / 3 | 上界跟下界都修了 |

**這件事本身就是今天想講的重點**：邊界條件不是「改一個運算子就結束了」，一個迴圈通常有**兩個**邊界（上界跟下界），只顧一邊是最常見的「修好了一半」陷阱。

---

## 三、共享可變狀態：函式偷偷改了呼叫端的資料

```js
function applyDiscount_buggy(cartItems, rate) {
  cartItems.forEach((item) => {
    item.price = item.price * (1 - rate)   // 直接改傳進來的物件
  })
  return cartItems
}
```

實測：

```
呼叫 applyDiscount_buggy 之後，原始 cart 有沒有被動到？ ⚠️ 被動到了
原始 cart: [ { name: '杯子', price: 90 }, { name: '盤子', price: 180 } ]
```

呼叫端傳進去的 `originalCart`，**價格被永久改掉了**——即使呼叫端完全沒想過要改動它、也沒有把回傳值另外存起來。如果同一個 `cart` 物件在別的地方（例如購物車頁面、訂單摘要）也被讀取，**它們讀到的會是被動過手腳的資料**，而且完全沒有任何錯誤訊息告訴你發生了什麼事。

```js
function applyDiscount_fixed(cartItems, rate) {
  return cartItems.map((item) => ({ ...item, price: item.price * (1 - rate) }))
}
```

實測：原始 `cart` 完全沒被動到，折扣後的結果是一個全新的陣列。**這跟資訊隱藏、低耦合的精神是同一件事**：函式不該偷偷改掉不屬於它的東西，這個判準在 [[好維護的程式碼-Day19-低耦合]]（尚未寫）會展開成更完整的版本。

---

## 四、三個 bug 的共同點

| | 浮點數比較 | 迴圈邊界 | 共享可變狀態 |
|---|---|---|---|
| 表面看起來 | 邏輯完全正確 | 邏輯完全正確 | 邏輯完全正確 |
| 實際問題 | 語言的數值表示法 | 邊界值沒有窮舉 | 函式的副作用範圍 |
| 什麼時候會爆 | 特定數字組合 | 輸入剛好在邊界上 | 呼叫端剛好共用了同一份資料 |
| 共同特徵 | **平常測試很難測到，正式環境才會遇到** | | |

三個都不是「寫錯語法」，是「寫的時候沒想到那個情境」。這正是「減少 bug 的可能性」跟「錯誤處理」（昨天）的差別：**錯誤處理是出事之後的應變，今天講的是讓某些情境從一開始就不會被漏掉。**

---

## 五、什麼時候不用這麼緊張

**a. 內部一次性腳本、資料遷移腳本**

跑一次就丟的程式，不需要為所有邊界寫防禦。過度防禦反而拖慢開發，這是明天（Day 12 KISS）要講的另一個極端。

**b. 金額已經是整數的情境**

如果系統本來就用「分」或其他最小單位存錢，浮點數比較的問題自然不存在，不用刻意再包一層容差比較。

**c. 資料來源已經保證邊界安全**

如果陣列長度是從資料庫查出來、由 `LIMIT n` 保證絕對不會超過，`getLastNItems` 的下界檢查就是多餘的判斷——**但這個假設要寫成註解或型別，讓下一個人知道為什麼這裡沒有防禦**，不然又會回到昨天講的「沒有解釋為什麼」的問題。

---

## 六、今天的判斷標準

看到數值比較、迴圈邊界、或者一個函式接收物件／陣列當參數時，問三個問題：

| 情境 | 該問的問題 |
|---|---|
| 比較兩個 `number` 是否相等 | 這兩個數字有沒有可能是浮點數運算的結果？ |
| 寫迴圈的上下界 | 如果輸入是 0、是負數、是超過陣列長度，會發生什麼事？ |
| 函式接收物件或陣列 | 這個函式會不會動到呼叫端傳進來的原始資料？ |

**共通的心法：修一個邊界之後，反問自己「另一個邊界呢」——這篇文章自己就是最好的例子。**

---

## 明天預告

Day 11 講**該不該留著看起來沒用的程式碼**——被註解掉的區塊、`// TODO` 卻永遠不會 DO 的殘骸，還有它們為什麼比直接刪掉更危險。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| IEEE 754 浮點數格式與精度限制 | IEEE 754-2019 標準；`Number` 型別規範見 ECMAScript 規格書 |
| `Number.EPSILON` 語法 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON |
| 「金額用最小貨幣單位整數表示」是金流業界慣例 | Stripe API 文件對金額欄位的說明（`amount` 一律以最小貨幣單位如分為單位）：https://docs.stripe.com/currencies#zero-decimal |

**二、我實際跑出來的部分**

浮點數精度誤差、off-by-one 的兩種邊界、共享可變狀態的副作用，全部由 `day10-fewer-bugs.js` 實測產生，包含文中特別提到「fixed 版本只修了一半」這個過程本身也是實測跑出來才發現的，不是預先設計好的橋段。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「三個數學上沒錯卻在正式環境炸掉的例子」這個分類方式
- 「修一個邊界之後，反問自己另一個邊界呢」這個判準是實測過程中的真實心得，不是預先寫好的教訓

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文三個 bug 類型與所有修法，可以用 `day10-fewer-bugs.js` 重跑驗證：`node day10-fewer-bugs.js`。
