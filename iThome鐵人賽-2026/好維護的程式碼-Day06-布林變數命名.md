---
title: Day 6 isNotDisabled 不是正向命名，它只是把 ! 藏進了名字裡
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 布林變數, 命名]
updated: 2026-08-24
source: Google Testing Blog / ExplainThis
---

# Day 6｜`isNotDisabled` 不是正向命名，它只是把 `!` 藏進了名字裡

> 純 Markdown，可直接貼到 iThome。

[[好維護的程式碼-Day05-參數與變數設計]] 講到布林參數放在參數列裡最危險。今天把布林值本身單獨拉出來講：**它的名字怎麼取，會直接決定判斷式好不好讀。**

---

## 一、重構前

需求：表單有錯誤，或者使用者還沒碰過表單，就不能送出。

```js
function canSubmit(form) {
  const disabled = form.errors.length > 0
  const notReady = !form.touched
  if (!disabled && !notReady) {
    return true
  }
  return false
}
```

這段程式碼**完全正確**。但它有三個維護成本。

---

## 二、成本一：沒有前綴，讀者猜不到它是布林值

`disabled` 這個詞本身是形容詞，但單獨看 `const disabled = ...`，你沒辦法從名字本身確定它是「是否停用」的布林值，還是「停用原因」的字串，或甚至是一個停用相關的物件。

**`is`／`has`／`can` 這類前綴不是風格潔癖，它是一種型別提示**——在還沒有 TypeScript 標註的情況下，前綴就是唯一能讓讀者「不用看賦值就知道這是布林」的線索。

## 三、成本二：雙重否定逼讀者在腦中做邏輯代數

`if (!disabled && !notReady)` 這一行，實測讀者要做兩次翻譯才能懂：

1. `!disabled` → 「不是『有錯誤』」 → 翻譯成「沒有錯誤」
2. `!notReady` → 「不是『還沒準備好』」 → 翻譯成「準備好了」

兩次翻譯完，才等於「沒有錯誤，而且準備好了」——這正是重構後版本直接寫出來的東西。**讀者被迫在腦中做一次 De Morgan 定律的邏輯代數，才能拿到程式碼本來就該直接告訴他的答案。**

Google 的 Testing on the Toilet（TotT）系列有一篇專門講這件事的文章，作者 Max Kanat-Alexander（前 Google 資深工程師）的核心主張是：

> 讀健康的程式碼，應該像讀母語書籍一樣輕鬆。

文中舉的例子（改寫自原文的比喻）：

```python
# 負向檢查：要先想「不是不啟用」才能懂
if not nodisable_kryponite_shield:
    devise_clever_escape_plan()
else:
    engage_in_epic_battle()

# 正向檢查：念出來就是答案
if enable_kryponite_shield:
    engage_in_epic_battle()
else:
    devise_clever_escape_plan()
```

## 四、成本三：`notReady` 這個名字，讓「反向」變成了預設立場

`notReady` 用「未完成」當作變數的預設語意，這代表**任何要問「是不是完成了」的地方，都得再包一層 `!`**。命名本身把整個程式碼庫推向負向思考。

---

## 五、重構後

```js
function canSubmit(form) {
  const hasErrors = form.errors.length > 0
  const isTouched = form.touched
  return !hasErrors && isTouched
}
```

`return !hasErrors && isTouched` 念出來就是「沒有錯誤，而且已經碰過表單」——**這句話本身就是需求規格，不需要翻譯**。

三個版本（含重構前、重構後、以及下面會講的一個陷阱版本）我實測過四種輸入，行為完全一致：

| 情境 | Bad | Good | 一致 |
|---|---|---|---|
| 沒有錯誤、已 touched | true | true | ✅ |
| 有錯誤、已 touched | false | false | ✅ |
| 沒有錯誤、未 touched | false | false | ✅ |
| 有錯誤、未 touched | false | false | ✅ |

---

## 六、量化：數一數 `!` 出現幾次

實測三個版本原始碼裡 `!` 運算子（排除 `!==`）出現的次數：

| 版本 | `!` 出現次數 |
|---|---|
| `canSubmitBad`（原版） | **3**（`!form.touched`、`!disabled`、`!notReady`） |
| `canSubmitGood`（重構後） | **1**（`!hasErrors`，而且語意本身就是「沒有錯誤」，不需要二次翻譯） |
| `canSubmitFakePositive`（見下） | **0** |

---

## 七、我一開始想錯的地方

### 疑問一：`isNotDisabled` 這種寫法，看起來有 `is` 前綴，算正向命名嗎？

我一開始以為「只要有 `is` 開頭就算正向」，但寫了一個陷阱版本實測：

```js
function canSubmitFakePositive(form) {
  const isNotDisabled = form.errors.length === 0   // 名字裡藏了一個 "Not"
  const isTouched = form.touched
  return isNotDisabled && isTouched
}
```

這個版本語法上一個 `!` 都沒有（實測 `!` 出現次數 = **0**），但行為跟前兩者完全一致。問題是：**`isNotDisabled` 這個名字裡的 "Not"，起的認知作用跟程式碼裡的 `!`一模一樣**——讀者一樣要做「isNot... → 其實是...」的翻譯，翻轉的成本沒有消失，只是從語法搬進了命名。

**正向命名的重點不是「名字裡有沒有 Not 這個字」，是「讀者要不要在腦中做一次邏輯反轉」。** `isNotDisabled` 兩者都佔了，看起來像正向，實際上還是負向。

### 疑問二：是不是所有布林都要加 `is`／`has`／`can` 前綴？

不是。像 `array.includes(x)`、`str.startsWith(x)`、`array.some(fn)` 這些函式呼叫本身回傳布林值，但函式名字不用 `is` 開頭——因為**呼叫本身讀起來已經像一個問句**，`isIncludes` 反而是累贅。前綴規則管的是**具名的變數／屬性**，不是回傳布林值的函式呼叫本身。

### 疑問三：是不是完全不能用負向命名的布林？

不用做到這麼絕對。`hasErrors` 本身雖然檢查的是「有沒有問題」，但它是**單一個**負向語意的布林，配合單一個 `if`／`!`，認知成本還在可接受範圍。真正的問題是**疊加**——當兩個以上的否定用 `&&`／`||` 混在一起時，讀者才會被迫做多層邏輯代數。ESLint 也有專門管這件事的規則 [`no-negated-condition`](https://eslint.org/docs/latest/rules/no-negated-condition)，管的正是「`if` 搭配 `else` 時用了被否定的條件」這種特定情境，而不是禁止一切帶 `not` 語意的布林。

---

## 八、什麼時候不該一律正向命名

**a. 生態系已經有既定的負向慣例**

```jsx
<button disabled={isDisabled}>送出</button>
```

HTML 的 `disabled` 屬性本身就是負向命名（沒有 `enabled` 屬性），硬要在你的程式碼裡反過來維護一個 `isEnabled` 再取反傳給框架，只是把轉換成本往自己身上加，並沒有讓事情變簡單。**跟框架／平台既定的介面對齊，優先於堅持正向命名。**

**b. 資料結構本身就是用「錯誤」建模的**

表單驗證函式庫回傳的通常是 `errors` 陣列（而不是 `validFields`），這時候用 `hasErrors = errors.length > 0` 是直接對應資料結構，比硬要維護一個反過來的 `isValid` 更貼近原始資料。

**c. 教學或邏輯證明語境**

如果目的是解釋 De Morgan 定律本身，刻意保留雙重否定是教學需要，不在今天討論的「產品程式碼可讀性」範圍內。

---

## 九、今天的判斷標準

> **這個布林值的名字，讀者要不要做一次「翻譯」才能知道它的真實意思？**

| 檢查項目 | 通過 | 不通過 |
|---|---|---|
| 有沒有 `is`／`has`／`can` 之類的前綴（具名變數／屬性） | `isTouched` | `touched`（型別不明） |
| 名字裡有沒有藏著 Not（即使沒有 `!` 符號） | `hasErrors` | `isNotDisabled` |
| 判斷式裡的否定運算子數量 | ≤ 1 | ≥ 2（該重新命名或拆開） |

---

## 十、跟前面幾天串起來

| | Day 5 | Day 6 |
|---|---|---|
| 處理範圍 | 布林值放在**參數列**裡的風險 | 布林值**本身命名**的風險 |
| 危險組合 | 相鄰同型別參數 | 疊加的否定運算 |
| 共同解法 | 讓語意跟著名字走，不要靠位置或反轉猜 |

---

## 明天預告

Day 7 講**敘述順序**：為什麼把「宣告」寫在「使用」前面，讀起來不一定比較順？函式呼叫的閱讀順序跟寫作順序不一致時，該怎麼安排？

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| Positive Boolean（正向布林檢查）核心主張與範例 | Max Kanat-Alexander, *Improve Readability With Positive Booleans*, Google Testing Blog（Code Health / TotT 系列），2023-10：https://testing.googleblog.com/2023/10/improve-readability-with-positive.html |
| 中文摘要與延伸說明 | ExplainThis,〈提高程式碼可維護性 — 布林條件寫法〉：https://www.explainthis.io/zh-hant/swe/boolean-readability |
| `no-negated-condition` 規則 | ESLint 官方文件：https://eslint.org/docs/latest/rules/no-negated-condition |

**二、我實際跑出來的部分**

四種輸入的行為對照、三個版本的 `!` 出現次數統計，全部由 `day06-boolean-naming.js` 實測產生，可重跑驗證。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「`isNotDisabled` 把 `!` 藏進名字裡」這個具體說法與陷阱範例（`canSubmitFakePositive`）是本文為了展示這個判準而設計的反例，不是引用來源
- 「正向命名的重點不是名字裡有沒有 Not 這個字，是讀者要不要做一次邏輯反轉」這個判準的表述方式
- 三種「什麼時候不該一律正向命名」的分類（框架慣例、資料結構對應、教學語境）

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文的三個版本與所有量化數字，都可以用這支腳本重跑驗證：`day06-boolean-naming.js`（四種輸入的行為對照、`!` 出現次數統計）。
