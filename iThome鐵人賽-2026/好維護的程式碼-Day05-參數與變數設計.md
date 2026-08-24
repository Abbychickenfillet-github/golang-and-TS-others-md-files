---
title: Day 5 一堆布林參數，是函式介面裡最危險的組合
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 參數設計, options-object]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊
---

# Day 5｜一堆布林參數，是函式介面裡最危險的組合

> 純 Markdown，可直接貼到 iThome。

[[好維護的程式碼-Day04-函式該切多細]] 講函式的邊界該切在哪。切好邊界之後，下一個問題是：**這個函式跟外界溝通的窗口——參數列——該長什麼樣子？**

今天從一個幾乎每個後端都寫過的函式開始。

---

## 一、重構前

需求：建立使用者，可能是管理員，可能要寄歡迎信，可能要跳過驗證（例如批次匯入舊資料時）。

```js
function createUser(name, email, password, isAdmin, sendWelcomeEmail, skipValidation) {
  return {
    name,
    email,
    password: skipValidation ? password : `hashed(${password})`,
    isAdmin: !!isAdmin,
    welcomeEmailQueued: !!sendWelcomeEmail,
  }
}
```

呼叫端長這樣：

```js
createUser('Abby', 'abby@example.com', 'pw123', false, true, false)
```

這段程式碼**完全正確**。但它有三個維護成本，而且最危險的那個不是「讀起來麻煩」，是**它會悄悄做錯事，卻不會有任何錯誤訊息**。

---

## 二、成本一：呼叫端變成猜謎遊戲

看到 `createUser('Abby', 'abby@example.com', 'pw123', false, true, false)`，你能不看函式定義就講出第四、五、六個參數各是什麼意思嗎？

大部分人不行。**三個連續的布林值，語意完全靠位置記憶**，讀的人得回頭對照函式簽名，數到第幾個位置才知道 `true` 代表什麼。

## 三、成本二：相鄰的同型別參數，順序寫反不會有任何警告

這是今天最重要的一點，直接實測。

```js
// 本來想表達：isAdmin=false, sendWelcomeEmail=true
createUser('Hacker', 'h@example.com', 'pw', true, false, false)
//                                          ^^^^  ^^^^^
//                                      不小心寫反了順序
```

實測結果：

| 想要的結果 | 實際結果 |
|---|---|
| `isAdmin: false` | `isAdmin: true` ❌ |
| `welcomeEmailQueued: true` | `welcomeEmailQueued: false` ❌ |

**這行程式碼語法完全合法，型別檢查（如果只用一般 JS）完全通過，沒有任何工具會警告你。** 它會安安靜靜地把一個一般使用者升級成管理員。三個相鄰的布林參數，就是三個可以互相調換、且調換後依然「看起來沒錯」的陷阱。

## 四、成本三：省略可選參數要手動佔位

如果只想指定 `sendWelcomeEmail`，跳過 `isAdmin`，位置參數逼你這樣寫：

```js
createUser('Bob', 'bob@example.com', 'pw', undefined, true, undefined)
```

兩個 `undefined` 純粹是為了佔住位置，沒有任何語意，只是「因為它在中間，所以不能不寫」。

---

## 五、重構後：Options Object

```js
function createUser({
  name,
  email,
  password,
  isAdmin = false,
  sendWelcomeEmail = true,
  skipValidation = false,
}) {
  return {
    name,
    email,
    password: skipValidation ? password : `hashed(${password})`,
    isAdmin: !!isAdmin,
    welcomeEmailQueued: !!sendWelcomeEmail,
  }
}
```

呼叫端：

```js
createUser({
  name: 'Abby',
  email: 'abby@example.com',
  password: 'pw123',
  isAdmin: false,
  sendWelcomeEmail: true,
})
```

同樣的「順序寫反」實驗，這次把整個 options 物件的 key 順序打亂：

```js
createUser({ sendWelcomeEmail: true, name: 'Hacker', isAdmin: false, email: 'h@example.com', password: 'pw' })
```

實測結果**依然正確**——`isAdmin: false`、`welcomeEmailQueued: true`，跟預期一致。**因為每個值都綁著名字，不是綁著位置**，順序再怎麼打亂都不影響結果。

省略可選參數也不再需要佔位：

```js
createUser({ name: 'Bob', email: 'bob@example.com', password: 'pw', sendWelcomeEmail: true })
```

只寫你關心的 key，其餘用預設值，不用數 `undefined`。

---

## 六、我一開始想錯的地方

### 疑問一：物件解構是不是比較慢？

寫這篇之前我的直覺是「多一層解構，應該會慢一點」，所以實測了 200 萬次呼叫。

| 版本 | 200 萬次呼叫耗時 |
|---|---|
| 位置參數版（`fn(...args)`） | 95.0 ms |
| Options 版（`fn(opts)`） | 44.7 ms |

**結果跟我的直覺相反：Options 版反而快了約 53%。** 我原本猜錯了，老實講出來——重新檢查後，這個差距**主要不是「物件解構比較快」造成的，而是位置參數版用了 `fn(...args)` 展開陣列呼叫，展開語法本身有它自己的開銷**，這讓比較沒有完全對等。

**但結論依然成立，只是理由要修正**：不管哪個版本比較快，兩者的差距在單次呼叫的尺度上是奈秒等級，**在真實應用裡完全可忽略**。V8 對物件解構有做最佳化，這不是一個該拿來決定寫法的因素。除非你在寫每秒百萬次呼叫的熱路徑（例如 game loop 或即時訊號處理），效能都不該是選 Options Object 與否的理由。

### 疑問二：是不是所有函式都該用 Options Object？

不是。

```js
Math.max(a, b)
array.map(fn, thisArg)
```

這種函式參數少、順序本身就是慣例（`max(a, b)` 誰先誰後根本不影響結果），硬包成 `Math.max({ a, b })` 反而是過度包裝，多一層不必要的物件建立成本，也不符合語言慣例。

## 七、什麼時候不該用 Options Object

**a. 參數少且語意從位置就看得出來**

```js
function add(a, b) { return a + b }
```

兩個對等的數字，包成物件反而畫蛇添足。

**b. 高頻呼叫的效能敏感路徑**

雖然上面實測差距可忽略，但如果 profiler 真的指出這裡是瓶頸，先量測、再決定，不要單憑這篇文章的結論。

**c. 參數彼此有嚴格順序依賴的 DSL / builder**

某些鏈式 API 或 DSL 設計上就是刻意用位置表達順序（例如 `pipe(fn1, fn2, fn3)`），這種情況位置本身就是語意的一部分，不該硬拗成物件。

---

## 八、今天的判斷標準

> **「呼叫這個函式時，你需要不需要回頭看它的定義，才知道每個值是什麼意思？」**

| 情況 | 建議 |
|---|---|
| 參數數量 ≤ 2，且語意從位置就看得出來 | 保持位置參數 |
| 參數數量 > 3（[`max-params`](https://eslint.org/docs/latest/rules/max-params) 的預設門檻） | 改用 Options Object |
| 有 2 個以上**相鄰且同型別**的參數（尤其是布林值） | 不管總數多少，都該改用 Options Object——這是順序寫反最容易發生的地方 |

---

## 九、跟前面幾天串起來

| | Day 4 | Day 5 |
|---|---|---|
| 處理的邊界 | 函式該不該存在（職責） | 函式怎麼跟外界溝通（介面） |
| 判準 | 碰幾種外部系統 | 需不需要回頭看定義才懂參數 |
| 共同點 | 都是把「隱含的規則」變成「看得見的名字」 |

---

## 明天預告

Day 6 講**布林變數命名**：`isValid` 為什麼比 `valid` 好？`isNotDisabled` 這種雙重否定的命名，為什麼會讓判斷式變成猜謎？

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| Introduce Parameter Object（把一串參數包成物件）這個重構手法 | Martin Fowler, *Refactoring: Improving the Design of Existing Code*, 2nd ed. |
| `max-params` 規則與預設門檻（3 個） | ESLint 官方文件：https://eslint.org/docs/latest/rules/max-params |
| 「參數與變數設計」主題架構 | ExplainThis 線上課程《寫出好維護的程式碼 (下)》CH4：https://www.explainthis.io/zh-hant/courses/maintainable-code-part2（付費課程，本文未逐字引用內容，僅取主題方向） |
| 解構賦值、預設參數語法 | MDN, Destructuring assignment：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment；MDN, Default parameters：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters |

**二、我實際跑出來的部分**

順序寫反的行為對照、省略可選參數的對照、200 萬次呼叫的效能量測，全部由 `day05-options-object.js` 實測產生，可重跑驗證。實測環境 Node.js v24.14.0。**效能量測的解讀在文中已修正**：Options 版實測較快，但主因可能是位置參數版的展開語法（`...args`）開銷，並非物件解構本身更快；兩者差距在真實應用中都可忽略。

**三、我自己的整理與比喻（沒有外部出處）**

- 「相鄰同型別參數是最危險的組合」這個判準的具體表述
- 「呼叫這個函式時需不需要回頭看定義」作為判斷標準
- 「位置本身就是語意的一部分」用來說明 DSL/builder 的例外情況

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文所有對照與效能數字，都可以用這支腳本重跑驗證：`day05-options-object.js`（順序寫反行為對照、省略參數對照、200 萬次呼叫效能量測）。
