---
title: Day 20 模組該切多小？從一支塞了五種職責的檔案開始
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 模組化, 深模組, Parnas]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊
---

# Day 20｜模組該切多小？從一支塞了五種職責的檔案開始

> 純 Markdown，可直接貼到 iThome。

Day 18、19 講的高內聚、低耦合，是**評分標準**——用來判斷「切得好不好」。今天講**怎麼切**：一支越長越難維護的檔案，邊界該畫在哪裡。

---

## 一、重構前

一支處理下單的 API route，把驗證、算價、庫存檢查、寄通知信、寫資料庫全部寫在同一個函式裡：

```js
// app/api/orders/route.js
export async function POST(request) {
  const body = await request.json()

  // 驗證
  if (!body.items || body.items.length === 0) {
    return errorResponse('購物車是空的')
  }
  if (!body.userId) {
    return errorResponse('缺少使用者')
  }

  // 算價
  let total = 0
  for (const item of body.items) {
    total += item.price * item.qty
  }
  if (body.couponCode === 'SAVE10') {
    total *= 0.9
  }
  const tax = total * 0.05
  total += tax

  // 庫存檢查
  for (const item of body.items) {
    const stock = await db.stock.findUnique({ where: { sku: item.sku } })
    if (stock.qty < item.qty) {
      return errorResponse(`${item.sku} 庫存不足`)
    }
  }

  // 寫資料庫
  const order = await db.order.create({ data: { userId: body.userId, items: body.items, total } })

  // 寄通知信
  await mailer.send({ to: body.email, subject: '訂單成立', body: `總金額 ${total}` })

  return successResponse(order)
}
```

**這段程式碼完全正確**，需求全部做到了。但它把五種不相關的職責焊死在同一個函式作用域裡。

---

## 二、切太粗的成本：改一行要讀完整份

想調整稅率（`* 0.05` 那行），得先把驗證、算價、庫存、資料庫、寄信全部讀過一遍，才敢確定改了不會動到別的東西——因為它們共享同一個函式作用域，變數（`total`、`body`）到處都在被讀寫。

**沒辦法單獨測試算價邏輯**：要測「9 折 + 5% 稅」算得對不對，得連同 `db.stock.findUnique`、`db.order.create`、`mailer.send` 一起跑，或是為了測一個乘法去 mock 三個外部服務。

---

## 三、重構後：沿著職責切

```js
// lib/orders/validateOrder.js
export function validateOrder(body) {
  if (!body.items?.length) return { ok: false, message: '購物車是空的' }
  if (!body.userId) return { ok: false, message: '缺少使用者' }
  return { ok: true }
}

// lib/orders/calculatePrice.js
export function calculatePrice(items, couponCode) {
  let total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  if (couponCode === 'SAVE10') total *= 0.9
  return total + total * 0.05
}

// lib/orders/checkInventory.js
export async function checkInventory(items) {
  for (const item of items) {
    const stock = await db.stock.findUnique({ where: { sku: item.sku } })
    if (stock.qty < item.qty) return { ok: false, message: `${item.sku} 庫存不足` }
  }
  return { ok: true }
}

// lib/orders/orderRepository.js
export function saveOrder(userId, items, total) {
  return db.order.create({ data: { userId, items, total } })
}

// lib/orders/sendOrderEmail.js
export function sendOrderEmail(email, total) {
  return mailer.send({ to: email, subject: '訂單成立', body: `總金額 ${total}` })
}
```

```js
// app/api/orders/route.js（重構後，只剩下協調）
export async function POST(request) {
  const body = await request.json()

  const validation = validateOrder(body)
  if (!validation.ok) return errorResponse(validation.message)

  const stockCheck = await checkInventory(body.items)
  if (!stockCheck.ok) return errorResponse(stockCheck.message)

  const total = calculatePrice(body.items, body.couponCode)
  const order = await saveOrder(body.userId, body.items, total)
  await sendOrderEmail(body.email, total)

  return successResponse(order)
}
```

`calculatePrice` 現在可以單獨測試，不用碰任何資料庫或郵件服務。改稅率只要動 `calculatePrice.js` 一個檔案。

---

## 四、我一開始想錯的地方

### 疑問一：是不是切得越細越好？

不是。實測一個**過度切分**的反例：把 `validateEmail` 拆成兩層，每一層只是換個名字呼叫下一層，沒有真的藏住任何邏輯：

```js
const shallowValidateEmail = (email) => isValidEmailFormat(email)
function isValidEmailFormat(email) {
  return /.+@.+\..+/.test(email)
}
```

用一個簡化指標「內部藏的邏輯行數 ÷ 對外方法數」量化「這個模組藏了多少複雜度」：

| 模組 | 對外方法數 | 內部邏輯行數 | 深度指標（越大越深） |
|---|---|---|---|
| `deepOrderRepository`（`save()` 藏住 42 行 SQL 細節） | 1 | 42 | **42.0** |
| `shallowValidateEmail` 這一層 | 1 | 1 | **1.0** |

`deepOrderRepository` 用一個簡單的 `save()` 藏住了 42 行的資料庫細節——呼叫端完全不用管 SQL 怎麼寫，這是「深模組」。`shallowValidateEmail` 那一層只是換個名字轉呼叫，讀者要多開一個檔案，卻沒少看任何邏輯——這叫**淺模組（Shallow Module）**，是 John Ousterhout 在《A Philosophy of Software Design》裡提出的概念：**好的模組應該用簡單的介面，藏住大量的實作複雜度；模組數量增加不等於複雜度下降，介面數量增加了，但認知負擔沒有真的變少。**

### 疑問二：那到底該怎麼決定切分邊界？

不是按行數平分。實測兩種切法：需求「稅率計算規則改變」屬於「算價」這個關注點。

**版本 A：機械式地每 20 行切一個檔案**（不管職責，`part1.js` 塞了「驗證前半」+「算價前半」）
**版本 B：沿著職責切**（`calculatePrice.js` 包含所有算價邏輯）

```
按行數切（version A）需要修改： [ 'part1.js', 'part2.js' ]
按職責切（version B）需要修改： [ 'calculatePrice.js' ]
```

版本 A 因為「算價」邏輯被機械式拆到兩個不相關的檔案，改一個規則要碰 2 個檔案；版本 B 只要碰 1 個。

**切分邊界該沿著「未來最可能一起改變的東西」，不是沿著行數平分。** 這正是 David Parnas 在 1972 年那篇奠定模組化理論基礎的論文裡講的核心準則：**用「這個模組向外隱藏了什麼設計決策」來決定邊界，而不是隨意切成等長區塊。** 也是 Day 18 高內聚判準的延伸——模組化，就是把「會因同一個原因一起改變」的東西放進同一個模組。

---

## 五、什麼時候不該這樣做

**a. 需求還在快速變動，邊界還沒浮現**

一個功能剛開始寫、還在探索需求時，先寫在一起。太早模組化等於是在猜一個還不存在的邊界，之後往往要整個打掉重切。等到「重複出現的模式」浮現再切——這呼應 Day 23（三次重複法則）跟 YAGNI 原則。

**b. 模組粒度太細，變成淺模組**

如同上面疑問一的例子，如果切出來的模組介面複雜度跟實作複雜度差不多，等於沒有真的隱藏什麼，只是把同一段邏輯换個檔案放，並且多付出「要跳檔案才看得懂全貌」的代價。

**c. 兩個「模組」其實一直互相呼叫、共享大量狀態**

如果拆出來的兩個檔案彼此頻繁互相 import、共用同一組可變狀態，勉強拆開只是把耦合換了個位置，跟 Day 19 的低耦合原則衝突。這時該重新檢視邊界是不是切錯了，而不是繼續往下切。

---

## 六、今天的判斷標準

看到一支越長越難維護的檔案，先別急著「隨便找地方切一刀」，問自己：

> **「這個模組的邊界，是沿著『未來最可能一起改變的東西』切的嗎？」**

| 判斷 | 結果 |
|---|---|
| 對外方法很少，但藏住的實作邏輯很多 | 深模組，好的切分 |
| 對外方法跟藏住的邏輯差不多多 | 淺模組，切了等於沒切 |
| 改一個需求只要碰一個模組 | 邊界切對了 |
| 改一個需求要碰好幾個看似不相關的模組 | 邊界切錯了，重新照職責切 |

---

## 七、跟前面 Day 串起來

| | Day 18 高內聚 | Day 19 低耦合 | Day 20 模組化 |
|---|---|---|---|
| 回答的問題 | 模組裡面放的東西彼此相關嗎 | 模組跟外面的關係夠鬆嗎 | 邊界該畫在哪裡 |
| 角色 | 評分標準（內部） | 評分標準（外部） | 具體做法 |

三者合起來，構成模組設計的完整判準：**先用高內聚、低耦合當標準，再用「會不會一起改變」決定實際的切分邊界。**

---

## 明天預告

Day 21 講 **DRY 原則**：為什麼「看起來重複」不等於「真的該合併」，DRY 談的其實是「知識」的重複，不是程式碼長得像不像。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| 模組化設計降低軟體複雜度的核心概念 | ExplainThis, 〈寫出好維護的程式碼 —— 透過模組化設計降低軟體複雜度〉：https://www.explainthis.io/zh-hant/swe/maintainable-code-modular-design |
| 深模組 / 淺模組（Deep Module / Shallow Module） | John Ousterhout, *A Philosophy of Software Design*；ExplainThis 中文導讀：https://www.explainthis.io/zh-hant/swe/a-philosophy-of-software-design/part2 |
| 模組邊界應沿著「隱藏的設計決策」切分 | David L. Parnas, *On the Criteria To Be Used in Decomposing Systems into Modules*, Communications of the ACM, Vol. 15, No. 12 (1972), pp. 1053–1058 |

**二、我實際跑出來的部分**

深度指標對照、兩種切分法在需求變更時要修改的檔案數，全部由 `day20-modular-design.js` 實測產生，可重跑驗證。實測環境 Node.js v24。

**三、我自己的整理與比喻（沒有外部出處）**

- 「內部藏的邏輯行數 ÷ 對外方法數」這個簡化的深度指標，是我為了具體示範 Ousterhout 的深模組概念自行設計的簡化版量測方式，不是原著提出的正式公式
- 訂單 API 重構前後的完整範例程式碼
- 今天的判斷標準表格

**四、其他**

- MDN, ES Modules：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24，可執行腳本見文末）

## 可執行範例

本文的深度指標對照與兩種切分法的檔案影響範圍，都可以用 `day20-modular-design.js` 重跑驗證。
