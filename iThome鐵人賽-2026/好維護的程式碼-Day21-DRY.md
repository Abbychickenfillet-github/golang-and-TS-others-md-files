---
title: Day 21 兩段程式碼長得一樣，不代表該合併
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, DRY, 巧合重複]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊
---

# Day 21｜兩段程式碼長得一樣，不代表該合併

> 純 Markdown，可直接貼到 iThome。

Day 20 講模組化的邊界該沿著「會不會一起改變」切。今天講的 DRY（Don't Repeat Yourself）是同一個思路的另一面：**該不該把兩段程式碼合併，看的也是「知識」，不是「長相」。**

這條原則最常被誤用——很多人以為 DRY 就是「看到重複的程式碼就抽出來」，結果把兩段本來無關的邏輯強行綁在一起，製造出比重複更難處理的問題。

---

## 一、重構前：真的重複

```js
// services/discount.service.js
function calculateMemberDiscount(price, level) {
  if (level === 'gold') return price * 0.8
  if (level === 'silver') return price * 0.9
  return price
}

// services/invoice.service.js
function getDiscountedPrice(price, level) {
  if (level === 'gold') return price * 0.8
  if (level === 'silver') return price * 0.9
  return price
}
```

兩個檔案裡，會員折扣費率被寫了兩次。

## 二、成本：改一個地方，忘記改另一個

行銷部把 gold 會員折扣從 0.8 調整成 0.75，工程師改了 `discount.service.js`，但沒發現 `invoice.service.js` 也有一份：

```
情境：行銷部把 gold 折扣從 0.8 調整成 0.75，工程師只改了 discount.service.js

discount.service.js 算出來的價格： 750
invoice.service.js  算出來的價格： 800 ❌ 跟上面不一致
```

**同一筆訂單，兩個地方算出不同的金額。** 這種 bug 很難抓，因為兩段程式碼「長得一樣」，code review 時很容易被當成正常的重複邏輯放過。

**這是真重複**：兩段程式碼代表的是**同一個知識**（會員折扣費率），理所當然該合併：

```js
// lib/pricing/discountRate.js
export function calculateDiscountedPrice(price, level) {
  if (level === 'gold') return price * 0.8
  if (level === 'silver') return price * 0.9
  return price
}
```

兩個檔案改成呼叫同一個函式，折扣費率變動時只需要改一個地方。

---

## 三、但重複的「長相」，不等於重複的「知識」

這是今天真正要講的重點，也是 DRY 最容易被誤用的地方。

看這兩段程式碼：

```js
// features/registration/checkEligibility.js
function isAdultForRegistration(age) {
  return age >= 18   // 法定成年年齡
}

// features/content-rating/checkAccess.js
function canWatchRatedContent(age) {
  return age >= 18   // 分級內容的年齡限制
}
```

長得一模一樣，很容易讓人手癢想合併成一個 `checkAge18(age)`。

**但這兩個 `18` 其實代表兩個完全不同的知識**：一個是民法規定的法定成年年齡，一個是內容分級法規規定的觀看年齡限制。它們現在剛好數字相同，是巧合，不是同一件事。

實測：內容分級法規修改，分級年齡上修為 20 歲，但法定成年年齡沒有變，還是 18 歲。如果之前貿然把兩段程式碼合併成一個共用函式，把門檻改成 20：

```
情境：內容分級法規修改，分級年齡上修為 20 歲（但法定成年年齡沒有變，還是 18）
如果貿然把「共用」的 checkAge18_shared 門檻改成 20...

19 歲 觀看分級內容資格： false （正確：這次法規修改後應該是 false）
19 歲 註冊資格： false ❌ 錯誤：法定成年年齡沒有改，19 歲應該可以註冊，卻被誤判為不能
```

**修改分級年齡這一個知識，意外波及了完全不相關的法定成年判斷。** 一個 19 歲的使用者原本應該可以正常註冊，卻因為這次合併被誤判擋下。

這就是**巧合重複（Coincidental Duplication）**：兩段程式碼長得像，只是碰巧用了同一個數字或同一段邏輯，並不代表它們是同一個決策。

---

## 四、判準：問「其中一個改變時，另一個『應該』跟著改嗎」

| | Part 1：折扣費率 | Part 2：年齡判斷 |
|---|---|---|
| 問題 | 如果 gold 折扣率改變，另一份程式碼「應該」跟著改嗎？ | 如果分級年齡改變，法定成年年齡「應該」跟著改嗎？ |
| 答案 | **應該**——兩者是同一個決策（會員折扣費率） | **不應該**——兩者是不同法規、不同的決策單位 |
| 結論 | 真重複，合併是對的 | 巧合重複，合併是錯的 |

這條判準直接呼應 DRY 原則的原文定義，出自 Andy Hunt 與 Dave Thomas 合著的《The Pragmatic Programmer》：

> Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.
>
> （每一項知識，在系統裡都應該只有一個單一、明確、權威的表示方式。）

**重點是 knowledge（知識），不是 syntax（長相）。** 長得一樣不代表是同一件事，長得不一樣也可能是同一件事被寫成了兩種形式（例如兩段邏輯結構不同，但都在算同一個折扣費率）。

---

## 五、什麼時候不該這樣做

**a. 巧合重複——長得一樣但代表不同知識**

如上面的年齡判斷。判準已經給了，這裡不重複。

**b. 只出現兩次就急著抽象化**

第一次出現時先寫直的，第二次出現時可以先觀察，第三次出現時再考慮抽成共用函式——這叫 Rule of Three（三次重複法則），Day 23 會展開講。太早抽象，等於是在兩個樣本點上就猜測未來的規律，猜錯的機率不小。

**c. 為了 DRY 犧牲可讀性，硬拗成一個萬用函式**

```js
// 硬要把「驗證使用者名稱」和「驗證商品名稱」塞進同一個函式
function validate(value, type) {
  if (type === 'username') {
    return value.length >= 3 && value.length <= 20 && !/[^a-zA-Z0-9_]/.test(value)
  }
  if (type === 'productName') {
    return value.length >= 1 && value.length <= 100
  }
}
```

這兩段驗證邏輯除了「都在檢查字串長度」以外沒有其他共通點，勉強合併後多了一個 `type` 參數跟一堆分支，比原本兩個各自簡單的函式更難讀。**兩段程式碼結構相似，不代表它們該共用同一個函式體。**

---

## 六、今天的判斷標準

看到兩段長得很像的程式碼，先別急著抽出來，問自己：

> **「如果其中一段因為業務規則改變而修改，另一段『應該』要跟著改嗎？」**

| 答案 | 定位 |
|---|---|
| 應該——它們代表同一個決策 | 真重複，合併 |
| 不應該——它們只是剛好長得像 | 巧合重複，保持分開 |
| 不確定 | 先保持分開，等第三個案例出現，規律更清楚時再決定 |

---

## 七、跟前面 Day 串起來

Day 20 講模組化，引用 Parnas 的準則：模組邊界要沿著「隱藏的設計決策」切。DRY 談的是同一件事的另一面：**一個決策的表示方式，應該只存在一份。**

| | Day 20 模組化 | Day 21 DRY |
|---|---|---|
| 關心的問題 | 一個決策的**實作**，該放進哪個模組 | 一個決策的**表示**，該不該重複出現 |
| 判準 | 會不會因同一個原因一起改變 | 改變其中一個，另一個「應該」跟著改嗎 |

兩者用的是同一套邏輯——**沿著「知識」而不是「長相」或「行數」來組織程式碼。**

---

## 明天預告

Day 22 講**資訊隱藏**：一個模組該對外公開什麼、該藏起什麼，藏起來的東西為什麼能讓維護者更輕鬆、更不容易犯錯。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| DRY 原則的正式定義 | Andrew Hunt, David Thomas, *The Pragmatic Programmer: From Journeyman to Master*, 1999，原文：「Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.」 |
| DRY 原則的中文解說與常見誤用 | ExplainThis, 〈寫程式必備的原則 DRY (Don't Repeat Yourself)〉：https://www.explainthis.io/zh-hant/swe/dry |
| Rule of Three（三次重複法則） | Martin Fowler 等人在重構文獻中廣泛引用的經驗法則，最早可追溯至 Don Roberts 對 Fowler 的建議 |

**二、我實際跑出來的部分**

折扣費率不一致的實測、年齡判斷合併後的錯誤案例，全部由 `day21-dry.js` 實測產生，可重跑驗證。實測環境 Node.js v24。

**三、我自己的整理與比喻（沒有外部出處）**

- 「巧合重複」這個中文譯名對應英文文獻常見的 Coincidental Duplication（在 DRY 相關討論中常被提及，但沒有單一權威出處提出這個詞）
- 法定成年年齡 vs 內容分級年齡的具體案例
- 「問其中一個改變時，另一個『應該』跟著改嗎」這個判準的表述方式

**四、其他**

- Wikipedia, Don't repeat yourself：https://en.wikipedia.org/wiki/Don%27t_repeat_yourself

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24，可執行腳本見文末）

## 可執行範例

本文兩個案例（真重複的折扣費率不一致、巧合重複的年齡判斷錯誤）都可以用 `day21-dry.js` 重跑驗證。
