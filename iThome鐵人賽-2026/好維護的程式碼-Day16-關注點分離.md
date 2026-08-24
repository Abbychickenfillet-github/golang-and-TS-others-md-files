---
title: Day 16 一個建立訂單的函式，藏了六種改變的理由
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 關注點分離, SRP, 單一職責]
updated: 2026-08-24
---

# Day 16｜一個建立訂單的函式，藏了六種改變的理由

> 純 Markdown，可直接貼到 iThome。

昨天（Day15）的例子很小——三個路由各自複製了一份 email 正規化。今天要拆一個更常見、更大的東西：**一個「看起來只做一件事」的函式，實際上同時處理了好幾種完全不相關的職責**。

---

## 一、重構前

需求：建立訂單的 API——解析請求、驗證、算金額（含折扣）、寫資料庫、寄通知信、留 log。

```js
async function handleCreateOrder(req, res, deps) {
  // 1. HTTP 解析
  const { items, userId, couponCode } = req.body

  // 2. 業務驗證
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '訂單不能是空的' })
  }
  if (!userId) {
    return res.status(400).json({ error: '缺少使用者 ID' })
  }

  // 3. 金額計算（含折扣）
  let total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  if (couponCode === 'SAVE100') total -= 100

  // 4. 資料庫寫入
  const order = await deps.db.orders.insert({ userId, items, total })

  // 5. Email 通知
  const user = await deps.db.users.findById(userId)
  await deps.emailClient.send(user.email, `訂單 #${order.id} 已建立，金額 ${total}`)

  // 6. Log 格式化
  deps.logger(`[ORDER] user=${userId} order=${order.id} total=${total}`)

  res.status(201).json({ orderId: order.id, total })
}
```

這段程式碼**完全正確**，而且乍看之下「單一職責」——它做的事就是「建立訂單」。但這正是關注點分離最容易被誤解的地方：**「一件事」在業務語言上是一件事，在程式碼的變動理由上卻是六件事。**

---

## 二、成本一：六種毫不相關的理由，都會逼你打開同一個函式

Robert C. Martin 對單一職責原則的定義是：**「一個模組應該只有一個、且只有一個改變的理由。」** 把這個定義套到今天的函式上，實測列出所有會觸發修改的理由：

| 改變的理由 | 單一函式版：要改哪裡 |
|---|---|
| HTTP 框架換掉（Express → Fastify，`req`/`res` 介面不同） | `handleCreateOrder` |
| 驗證規則改變（例如訂單上限改成 50 件） | `handleCreateOrder` |
| 折扣規則改變（例如改成滿千折百） | `handleCreateOrder` |
| ORM／資料庫換掉 | `handleCreateOrder` |
| Email 服務商換掉（SendGrid → Mailgun） | `handleCreateOrder` |
| Log 格式要求改變（要求加上 traceId） | `handleCreateOrder` |

**6 種完全不相關的理由，全部共用同一個函式。** 這代表：PM 改折扣規則的那次修改，跟資安要求改 log 格式的那次修改，`git blame` 上會疊在同一個函式裡，互相看起來有關係，實際上一點關係也沒有。

## 三、成本二：只想測「折扣算得對不對」，得先養出一整套道具

實測：要單獨驗證「折扣邏輯算得對不對」，單一函式版需要準備幾個假物件？

```
1. fake req
2. fake res（含 status/json 鏈式呼叫）
3. fake db.orders.insert
4. fake db.users.findById
5. fake emailClient.send
6. fake logger
→ 需要 6 個假物件，即使你只關心折扣算對了沒
```

**你只是想確認 `SAVE100` 折價 100 元算得對不對，卻要先搭出整套 HTTP、資料庫、Email 的舞台。** 這種測試很容易被跳過——不是因為工程師懶，是因為成本真的很高。

---

## 四、重構後：拆成各自獨立的函式

```js
function parseCreateOrderRequest(req) {
  return req.body
}

function validateOrder({ items, userId }) {
  if (!items || items.length === 0) return '訂單不能是空的'
  if (!userId) return '缺少使用者 ID'
  return null
}

function calculateOrderTotal(items, couponCode) {
  let total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  if (couponCode === 'SAVE100') total -= 100
  return total
}

async function notifyOrderCreated(emailClient, userEmail, order) {
  await emailClient.send(userEmail, `訂單 #${order.id} 已建立，金額 ${order.total}`)
}

function logOrderCreated(logger, userId, order) {
  logger(`[ORDER] user=${userId} order=${order.id} total=${order.total}`)
}

async function handleCreateOrder(req, res, deps) {
  const { items, userId, couponCode } = parseCreateOrderRequest(req)

  const errorMessage = validateOrder({ items, userId })
  if (errorMessage) return res.status(400).json({ error: errorMessage })

  const total = calculateOrderTotal(items, couponCode)
  const order = await deps.db.orders.insert({ userId, items, total })

  const user = await deps.db.users.findById(userId)
  await notifyOrderCreated(deps.emailClient, user.email, order)
  logOrderCreated(deps.logger, userId, order)

  res.status(201).json({ orderId: order.id, total })
}
```

同一組輸入，實測兩版輸出：

```
單一函式版 res.json 結果： {"orderId":"order_001","total":650}
拆分版　　 res.json 結果： {"orderId":"order_001","total":650}
兩版行為一致？ true
```

現在再測「折扣算得對不對」：

```
拆分版，要測 calculateOrderTotal，只需要：
（不需要任何假物件，直接呼叫）
calculateOrderTotal(items, 'SAVE100') = 650
→ 需要 0 個假物件
```

`handleCreateOrder` 本身變成一個**協調者（orchestrator）**——它不再自己做任何一種具體的事，只負責照順序呼叫其他函式，把結果串起來。

---

## 五、我一開始想錯的地方

### 疑問一：這不是跟後面要講的「高內聚」重複嗎？

不重複，是同一件事的兩個角度，而且順序有先後。**關注點分離是「拆」這個動作本身**——先辨認出一段程式碼裡藏了幾種不同的改變理由，把它們拆開。**高內聚問的是「拆完之後，剩下的東西該怎麼分組」**——`parseCreateOrderRequest` 跟 `validateOrder` 該不該放在同一個檔案？跟資料庫相關的函式該不該全部集中在一個模組？這個問題留給高內聚那篇（下一篇）細講。

**先分離，才有東西可以談聚合。順序反過來會很難做。**

### 疑問二：是不是拆得越細越好？

不是，這是另一種過度設計。如果把 `validateOrder` 裡的兩個 `if` 又各自拆成獨立函式，變成 `validateItemsNotEmpty(items)`、`validateUserIdExists(userId)`，讀的人反而要在三個檔案之間跳來跳去，才能拼出「訂單驗證」這個完整概念——**拆分的目的是分離不相關的東西，不是把相關的東西也拆散。**

判準是：**這兩段程式碼，會不會因為不同的理由被修改？** 如果答案是「不會，它們永遠一起變」，那就不需要拆。`validateOrder` 裡的兩個檢查都屬於「訂單驗證規則」，改的理由永遠一樣，所以留在一起是對的。

---

## 六、什麼時候不該分離

**a. 函式本來就短，且只做一件事**
一個 5 行、只做一種轉換的函式，不需要為了「原則」硬拆。

**b. 拆分後產生只是轉發呼叫、沒有實際邏輯的中間層**
如果 `parseCreateOrderRequest(req)` 只是 `return req.body`，這種拆分的價值很低——但它仍然標出了一個未來 HTTP 框架介面改變時該修改的邊界，屬於「用一行程式碼換一個清楚的改變邊界」，通常還是值得的。真正該避免的是拆出**完全沒有語意、只是包一層**的函式。

**c. 團隊規模小、專案是短期驗證性質**
呼應 Day15 的判準——探索期不追求設計上的完美分離，先求可以動。

---

## 七、今天的判斷標準

看到一個函式時，問自己：

> **「這個函式裡，有幾種完全不相關的理由，會逼我回來改它？」**

| 答案 | 建議 |
|---|---|
| 只有 1 種 | 不需要拆，它已經是單一職責 |
| 2 種以上，而且理由之間毫不相關（HTTP、驗證、資料庫、通知、log…） | 該拆了 |
| 2 種以上，但理由永遠一起變 | 不用拆，它們本來就是同一個關注點 |

---

## 八、跟前面 Day 串起來

| | Day14 過度設計 | Day15 缺乏設計 | Day16 關注點分離 |
|---|---|---|---|
| 問題 | 抽象搭得比需求還多 | 完全不設計，複製貼上 | 沒有辨認出一個函式裡藏了幾種改變理由 |
| 本質 | 設計早於現況 | 設計晚於現況（或沒有設計） | 設計的**顆粒度**抓錯了——一個函式裝了太多不相關的東西 |

三篇合起來看：好的設計不是「多」或「少」的問題，是**設計的粒度跟現況、跟改變的理由對不對得上**。

---

## 明天預告

Day17 往上拉一個層次，講**複雜度本身**——一段程式碼的複雜度到底從哪裡來？迴圈複雜度（Cyclomatic Complexity）跟 Day2 深挖過的認知複雜度（Cognitive Complexity）差在哪？

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| 單一職責原則「一個模組應該只有一個改變的理由」的定義 | Robert C. Martin, *Agile Software Development, Principles, Patterns, and Practices*，SRP 章節 |
| 關注點分離（Separation of Concerns）作為軟體設計原則的提出 | Edsger W. Dijkstra, *On the Role of Scientific Thought*（1974），首次以此描述軟體設計方法 |

**二、我實際跑出來的部分**

兩版行為一致性對照、折扣計算實測值、單獨測試折扣邏輯所需假物件數量對照，全部由 `day16-separation-of-concerns.js` 產生，可重跑驗證。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「六種改變的理由」這份對照表是我依 SRP 定義手動列出、對應到範例程式碼的整理，不是工具自動產生
- 「協調者（orchestrator）」這個用法描述重構後 `handleCreateOrder` 的角色
- 「先分離才有東西可以談聚合」這個順序判準
- 「拆分的目的是分離不相關的東西，不是把相關的東西也拆散」這個收束判準

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文所有量化數字都可以用這支腳本重跑驗證：`day16-separation-of-concerns.js`（兩版行為一致性對照、改變理由對照表、單獨測試折扣邏輯所需假物件數量）。
