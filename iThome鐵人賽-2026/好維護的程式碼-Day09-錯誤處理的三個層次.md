---
title: Day 9 出錯的時候，你的程式碼在說謊還是在求救
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 錯誤處理, error-handling]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊
---

# Day 9｜出錯的時候，你的程式碼在說謊還是在求救

> 純 Markdown，可直接貼到 iThome。

昨天講**註解該寫什麼**——好的註解負責解釋「為什麼」，尤其是為什麼要在這裡攔一個錯誤、為什麼要吞掉它。今天往下一層，講**錯誤處理本身**：吞錯誤這個動作，到底該不該做。

先講一個會被抓包一輩子的壞習慣。

---

## 一、重構前

需求：呼叫付款閘道，扣款失敗時不要讓整個流程掛掉。

```js
async function chargeCard(order) {
  try {
    const result = await paymentGateway.charge(order.amount, order.cardToken)
    return result
  } catch (err) {
    console.log(err)
    return undefined
  }
}
```

這段程式碼**能跑**，也確實「不會讓流程掛掉」。但它把三種完全不同的情況，全部壓縮成同一個回傳值：`undefined`。

---

## 二、成本一：呼叫端沒辦法分辨「失敗」和「沒事」

```js
const result = await chargeCard(order)
if (result) {
  // 成功
}
```

`chargeCard` 回傳 `undefined` 可能代表：

- a. 扣款真的失敗了
- b. 網路逾時
- c. `paymentGateway.charge` 本身回傳的合法值就是 `undefined`（假設它是這樣設計的）

**三種完全不同的情況，呼叫端拿到同一個訊號。** 出事時你只能翻 log，猜是哪一種。

## 三、成本二：把「程式寫錯」跟「業務本來就會失敗」混在一起處理

`catch` 區塊會接住**所有**錯誤，不分青紅皂白：

| 錯誤類型 | 例子 | 該怎麼處理 |
|---|---|---|
| 程式呼叫錯誤 | `order.amount` 傳成負數、傳成字串 | 這是 bug，應該讓它炸出來，越早發現越好 |
| 預期內的業務失敗 | 卡片餘額不足、超過單筆上限 | 這是正常流程的一部分，該用回傳值處理 |
| 環境錯誤 | 網路逾時、第三方 API 掛掉 | 通常該重試或往上通知，不該默默吞掉 |

上面那段 `catch (err) { return undefined }` **把三種情況全部一視同仁**。如果今天是「傳錯型別」這種寫死的 bug，它不會在開發階段爆出來讓你發現，而是悄悄回傳 `undefined`，流程「看起來」正常結束，bug 卻活到了正式環境。

實測（`day09-error-handling.js` Part 1）：

```
charge(-50) → undefined ⚠️ 呼叫端無法區分「失敗」跟「結果剛好是 undefined」
```

`amount = -50` 明明是呼叫端傳錯參數，卻跟「卡片餘額不足」得到一模一樣的回傳值。

---

## 四、三個層次，分別解決什麼問題

### 層次一：讓它炸——用在「不該發生」的錯誤

```js
if (amount <= 0) {
  throw new TypeError(`amount 必須大於 0，收到 ${amount}`)
}
```

**這不是偷懶，是正確答案。** 呼叫端傳了不合法的參數，這是程式寫錯，不是使用者的問題。讓它在開發階段就炸出來，比讓它靜靜地回傳 `undefined`、三個月後才在正式環境炸開好得多。

### 層次二：回傳語意化的值——用在「預期內的失敗」

```js
async function chargeResult(amount) {
  try {
    const result = await paymentGateway(amount)
    if (!result.ok) return { success: false, reason: result.code, message: result.message }
    return { success: true, transactionId: result.transactionId }
  } catch (err) {
    throw err   // 程式錯誤不吞，繼續往上炸
  }
}
```

實測（Part 2）：

```
charge(99999) → { success: false, reason: 'LIMIT_EXCEEDED', message: '單筆金額超過上限' }
charge(-50)   → 直接拋出: TypeError - amount 必須大於 0，收到 -50
```

**關鍵是這個 `catch` 只負責「把該炸的重新丟出去」，不負責吞掉所有東西。** 業務失敗（超過上限）走回傳值，程式錯誤（負數金額）繼續往上炸。呼叫端看到 `{ success: false, reason }`，馬上知道是哪一種業務失敗，不用再去猜。

### 層次三：Result 型別——強制呼叫端處理兩種分支

```js
const Ok = (value) => Object.freeze({ kind: 'ok', value })
const Err = (error) => Object.freeze({ kind: 'err', error })
```

實測（Part 3）：

```
charge(1000)  → 交易成功：tx_7731xf
charge(99999) → 交易失敗：單筆金額超過上限
```

比層次二多了一件事：**回傳值有一個固定的 `kind` 欄位**，呼叫端可以（在 TypeScript 底下應該說「被迫」）用 `switch (result.kind)` 窮舉處理，而不是靠命名默契去猜欄位長什麼樣子。

---

## 五、我一開始想錯的地方

### 疑問一：Result 型別真的能「強制」處理兩種分支嗎？

**不能，至少純 JavaScript 做不到。** 這句話我一開始寫得太滿，實測修正。

```js
function handle(result) {
  if (result.kind === 'ok') {
    return `交易成功：${result.value}`
  }
  // 如果漏寫這個 else，result.error 是 undefined，但不會報錯
  return `交易失敗：${result.error?.message ?? '(忘記處理 err 分支，訊息遺失)'}`
}
```

實測（Part 4）：三種寫法在「呼叫端忘記檢查」時，**全部**都會在執行期產生錯誤結果，沒有一種能在 JS 執行期擋下來。

```
層次一（吞掉錯誤）      會，且錯誤發生位置離原因很遠
層次二（Result-like）   會，JS 執行期無法強制檢查 kind
層次三（Result 型別）   會，但在 TypeScript + exhaustive check 下編譯期就能擋下
```

**Result 型別真正的威力要靠 TypeScript 的 discriminated union + `never` 窮舉檢查才會生效**——也就是說，在 switch 每個分支都處理完後，剩下的型別會收斂成 `never`，如果你漏寫一個分支，TypeScript 編譯期就會報錯。純 JavaScript 環境下，Result 型別頂多是「約定成俗的形狀」，不是強制力。這個限制留給 [[好維護的程式碼-Day17-型別即文件]]（尚未寫）再展開。

### 疑問二：那 `try/catch` 跟 `Promise.catch()` 處理錯誤有什麼不一樣？

功能上等價，差別在**閱讀順序**：

| 寫法 | 錯誤處理寫在哪 | 適合的情境 |
|---|---|---|
| `try { await x() } catch (e) {}` | 跟成功路徑寫在同一個區塊，由上往下讀 | 多個 `await` 需要各自不同的錯誤處理，或錯誤處理邏輯較長 |
| `x().then(...).catch(e => {})` | 錯誤處理接在鏈的最後 | 單純的鏈式呼叫，錯誤處理邏輯簡短、共用同一套 |

**一個常被忽略的陷阱**：`try/catch` 裡如果混用 `.then()`，`.then()` 裡面拋出的錯誤**不會**被外層的 `catch` 接住，除非你 `await` 了那個 `.then()` 回傳的 Promise。這是 async/await 語法糖背後仍然是 Promise 微任務排程的證據。

### 疑問三：業務失敗一定要用回傳值，不能用 throw 嗎？

可以，這是團隊風格選擇，不是對錯問題。有些語言（像 Rust、Go）的文化就是「業務失敗也用回傳值」，因為 `throw`/`try-catch` 在這些語言裡開銷較大、控制流也較不明顯。JavaScript 兩種都合法，**判準是團隊有沒有一致的約定**，不一致才是真正的問題（這會在 [[好維護的程式碼-Day25-一致性]]（尚未寫）展開）。

---

## 六、跟前面 Day 串起來

| | Day 2 | Day 8 | Day 9 |
|---|---|---|---|
| 處理什麼 | 判斷的巢狀 | 為什麼要寫這段程式碼 | 出錯之後要往哪裡去 |
| 核心動作 | 提早 return | 解釋「為什麼」 | 分清楚「該炸」跟「該回傳」 |
| 共同點 | 都是在降低讀者要「模擬執行」的負擔 | | |

---

## 七、什麼時候不該這樣分層

**a. 極簡單的內部工具函式**

```js
const clamp = (n, min, max) => Math.min(Math.max(n, min), max)
```

不需要三層錯誤處理，過度設計反而是明天（Day 10）要講的反面案例。

**b. 中介層不該「翻譯」錯誤但什麼都不做**

```js
try {
  await chargeCard(order)
} catch (err) {
  throw new Error('付款失敗') // 把原始錯誤資訊全部丟掉了
}
```

如果要重新包裝錯誤，記得保留原因（`{ cause: err }`），不要讓除錯的人失去線索。

**c. 你不是這個錯誤真正的處理者**

如果目前這一層既不知道怎麼復原、也不負責通知使用者，就不要 `catch`。**能處理才攔，不能處理就讓它往上走**，交給真正知道該怎麼辦的那一層。

---

## 八、今天的判斷標準

看到 `catch` 區塊時，先問：

> **「這個錯誤是『這裡不該發生的程式錯誤』，還是『這裡本來就可能發生的業務失敗』？」**

| 錯誤性質 | 處理方式 |
|---|---|
| 不該發生的程式錯誤（型別錯、參數錯） | 讓它 `throw`，越早炸越好 |
| 預期內的業務失敗 | 回傳語意化的值（`{ success, reason }` 或 Result 型別） |
| 你不知道怎麼處理的錯誤 | 不要 `catch`，讓它往上層走 |

---

## 明天預告

Day 10 講**怎麼降低程式碼「本來就出 bug」的機率**——不是出錯之後怎麼處理，是從一開始就讓某些錯誤變得寫不出來。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| Error Handling 的分類原則（程式錯誤 vs 業務失敗應分開處理） | Robert C. Martin, *Clean Code*, Ch.7 "Error Handling" |
| Yagni 引用的「先讓錯誤儘早浮現」精神（fail fast） | 軟體工程通用實踐，非特定單一作者提出 |
| `try...catch` 語法規範 | MDN, `try...catch`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch |
| `Promise.prototype.catch()` 語法規範 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch |

**二、我實際跑出來的部分**

三種錯誤處理層次在「呼叫端忘記檢查」情境下的行為對照，全部由 `day09-error-handling.js` 實測產生。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「錯誤處理的三個層次」這個分類方式（吞掉／回傳語意值／Result 型別）是個人整理
- 「程式碼在說謊還是在求救」這個標題比喻
- Result 型別在純 JS 環境下無法強制窮舉檢查、需要 TypeScript 才生效，這個限制是我實測後修正的結論

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文三個層次的完整行為對照，可以用 `day09-error-handling.js` 重跑驗證：`node day09-error-handling.js`。
