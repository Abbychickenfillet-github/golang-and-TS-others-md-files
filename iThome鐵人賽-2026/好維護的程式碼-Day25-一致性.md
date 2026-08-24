---
title: Day 25 不一致不是美觀問題，是真的會炸的 bug
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 一致性, 命名]
updated: 2026-08-24
source: ExplainThis「寫出好維護的程式碼」上集 CH10；John Ousterhout, A Philosophy of Software Design
---

# Day 25｜不一致不是美觀問題，是真的會炸的 bug

> 純 Markdown，可直接貼到 iThome。

Day24 講抽象化抽早了會怎樣，今天講一個更容易被忽略的問題：**同一個模組裡，如果命名風格、參數順序、回傳格式不一致，每一次呼叫都變成一次猜謎遊戲。**

---

## 一、重構前

一個使用者管理模組，裡面有兩個函式：

```js
function createUser(name, email) {
  return { name, email }
}
// 注意：這裡的參數順序跟 createUser 相反
function renameUser(email, name) {
  return { name, email }
}
```

這兩個函式**各自單獨看都完全正確**。問題出在呼叫端很自然地假設「這個模組的函式參數順序都一樣」：

```js
const user = createUser('Abby', 'abby@example.com')
const renamed = renameUser(user.name, user.email)   // ← 直覺照 createUser 的順序呼叫
```

實測結果：

```
建立時：       { name: 'Abby', email: 'abby@example.com' }
呼叫 rename 後：{ name: 'abby@example.com', email: 'Abby' }
```

**`name` 和 `email` 的值被互換了，語言完全不會報錯**——兩個都是字串，型別系統幫不上忙。這種 bug 通常要等到 `email` 欄位被拿去發信、寄出去才會被發現。

---

## 二、成本：不一致把「讀一次就懂」變成「每次都要重新確認」

如果一個模組裡的函式命名、參數順序、回傳格式都一致，讀者只要學會**一次**規則，就能推測其他所有函式怎麼用。

不一致的代價不是「多打幾個字」，是**讀者沒辦法從已知的函式推測未知的函式**，每一個新函式都得重新去看實作或文件才敢用——這正是 Ousterhout 在《A Philosophy of Software Design》裡強調的：一致性讓認知能夠**遷移（transferable）**，這是降低系統認知負擔最便宜的手段之一，因為它不需要改架構，只需要守規矩。

---

## 三、重構後

```js
function createUser({ name, email }) {
  return { name, email }
}
function renameUser({ name, email }) {
  return { name, email }
}
```

改用具名參數（options object）之後，順序這個維度**直接消失**——呼叫端寫反了，语意上一眼就看得出來：

```js
renameUser({ email: user.name, name: user.email })  // 這樣寫，眼睛立刻抓到反了
```

---

## 四、我一開始想錯的地方

### 疑問一：這只是參數順序的問題，命名風格不一致真的會出事嗎？

實測另一個情境：同一個模組，兩個回傳使用者資料的函式，一個用 camelCase，一個用 snake_case：

```js
function getUserFromCache() {
  return { userId: 1, userName: 'Abby' }
}
function getUserFromApi() {
  return { user_id: 1, user_name: 'Abby' }   // 命名風格不一致
}

function displayUser(user) {
  return `#${user.userId} ${user.userName}`
}
```

實測輸出：

| 資料來源 | 顯示結果 |
|---|---|
| cache（camelCase） | `#1 Abby` |
| API（snake_case） | `#undefined undefined` |

**同一個 `displayUser` 函式處理兩個來源，API 那筆完全沒有報錯，只是靜默顯示 `undefined`。** 這比拋錯還危險——沒有錯誤訊息、沒有崩潰，畫面看起來「有東西」，只是內容是錯的。統一命名風格後，兩邊都正確顯示 `#1 Abby`。

### 疑問二：一致性重要，那是不是應該把舊的錯誤命名也全部改掉？

**不一定，要看改動範圍划不划算。**

如果 `user_id` 這個命名已經散落在資料庫欄位、幾十個 API 回應、外部合作夥伴依賴的介面裡，貿然全部改成 `userId` 會牽動比它值得解決的問題更大的範圍。這種情況下，**在新程式碼裡堅持一致，同時明確記錄「這是歷史包袱，不強改」**，比硬要一次性統一更務實。

### 疑問三：那如果新舊寫法一直混用，一致性不就永遠達不到？

用一條界線劃分：**同一個模組、同一層級（例如都在 service 層、都是同一個 API 版本）內要一致；跨越模組邊界（例如新 API 版本 vs 舊 API 版本、內部程式碼 vs 外部資料庫欄位）允許有轉換層**。轉換層（adapter）的工作就是把不一致的外部資料，轉成模組內部一致的格式——這樣「一致」跟「相容舊系統」不會互相打架。

---

## 五、量化：這個模組裡有幾種不一致

| 不一致類型 | 出現次數 |
|---|---|
| 參數順序（create 用 name,email；rename 用 email,name） | 1 處 |
| 欄位命名風格（userId vs user_id） | 1 處 |
| 找不到資料時的行為（有些回傳 null，有些拋錯） | 視專案而定，建議自己拿掃描工具數一次 |

---

## 六、什麼時候不該為了一致性硬改

**a. 一致的是「舊的壞習慣」**

如果整個專案的慣例是「函式名一律用縮寫」（`calcTtl`、`getUsrLst`），新函式為了一致也用縮寫，只是把壞習慣延續下去。**Ousterhout 對這點的建議是：發現一個更好的慣例時，該做的是有計畫地、全面地遷移過去，而不是繼續延續舊慣例，也不是自己一個人偷偷用新寫法造成新的不一致。**

**b. 外部系統的格式，不受你控制**

呼叫第三方 API 回傳的 `snake_case` 欄位，不需要（也不應該）去改它——在你自己的轉換層把它轉成專案慣例就好，不用強迫外部系統跟你一致。

**c. 一致性跟正確性衝突時，正確性優先**

如果既有慣例是「找不到資料回傳 `null`」，但某個情境下回傳 `null` 會導致呼叫端誤判（例如把 `null` 當成合法的「使用者選擇不填」），這時候該拋錯就拋錯，不要為了表面一致犧牲正確性——但要在文件或註解裡說明「這裡刻意跟慣例不同」，避免下一個人以為是疏忽。

---

## 七、今天的判斷標準

修改或新增一個函式時，先問：

> **「這個模組裡已經有類似功能的函式了嗎？它們的參數順序、命名風格、回傳格式是什麼？」**

| 情況 | 該做的事 |
|---|---|
| 模組內已有慣例 | 照著做，即使你覺得自己的想法更好，先在 PR 裡提出討論，不要單方面破壁 |
| 沒有慣例，你是第一個 | 花一分鐘想清楚，因為你現在寫的就是慣例 |
| 發現舊慣例有問題 | 提出來，全面遷移，而不是自己另開一套 |

---

## 明天預告

Day 26 講**介面設計的注意事項**：一個模組該對外暴露幾個方法、方法之間該怎麼分工，才不會變成「表面上物件導向，實際上呼叫端要背下十個方法才能正確使用」。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| 一致性能降低認知負擔、讓知識可遷移的論點 | John Ousterhout, *A Philosophy of Software Design*；中文導讀：ExplainThis,《A Philosophy of Software Design》心得系列：https://www.explainthis.io/zh-hant/swe/a-philosophy-of-software-design/part1 、 https://www.explainthis.io/zh-hant/swe/a-philosophy-of-software-design/part2 |
| 課程章節：模組設計力求一致、不隱諱 | ExplainThis「寫出好維護的程式碼（上）」CH10：https://www.explainthis.io/zh-hant/courses/maintainable-code-part1 |

**二、我實際跑出來的部分**

參數順序不一致造成的欄位互換、命名風格不一致造成的 `undefined`，全部由 `day25-consistency.js` 實測產生。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「不一致把『讀一次就懂』變成『每次都要重新確認』」這個說法
- 「一致的是舊的壞習慣」「外部系統格式不受你控制」「一致性跟正確性衝突時正確性優先」這三種例外的分類方式
- 用轉換層（adapter）處理跨模組邊界不一致的建議

**四、其他**

- 本文範例為原創，不涉及特定專案的真實資料。

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

存成 `day25-consistency.js`，終端機執行 `node day25-consistency.js` 就能重跑本文所有數字。
