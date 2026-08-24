---

## title: Day 4 函式該切多細？比「單一職責」更好用的判準
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 單一職責, 函式設計]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊

# Day 4｜函式該切多細？比「單一職責」更好用的判準

> 純 Markdown，可直接貼到 iThome。

[[好維護的程式碼-Day03-命名]] 講到命名很虛，「好維護」這三個字也一樣虛。今天要拆的更虛：**單一職責原則（Single Responsibility Principle）**。

「一個函式只做一件事」這句話幾乎沒人反對，但反問一句「那『一件事』到底怎麼算」，十個人會有十種答案。今天想給一個不用靠感覺、可以實測的判準。

---

## 一、重構前

需求：處理一筆訂單——驗證資料、計算金額、套用折扣、寫入資料庫、寄送確認信。

```js
function processOrder(order) {
  // 1. 驗證
  if (!order.items || order.items.length === 0) {
    throw new Error('訂單沒有商品')
  }
  if (!order.email) {
    throw new Error('缺少 email')
  }

  // 2. 計算金額
  let total = 0
  for (const item of order.items) {
    total += item.price * item.qty
  }

  // 3. 套用折扣
  if (order.couponCode === 'VIP10') {
    total = total * 0.9
  }

  // 4. 寫入資料庫
  const saved = db.save({ ...order, total })

  // 5. 寄送確認信
  email.send(order.email, `訂單確認：NT$${total}`)

  return saved
}
```

這段程式碼**完全正確**，需求描述的五件事它都做到了。但它有三個維護成本。

---



## 二、成本一：函式名字說不出它在做什麼

`processOrder` 這個名字幾乎等於沒取名字——「process」是英文裡最沒有訊息量的動詞之一，因為它可以指任何事。

ExplainThis 在命名系列引用了 Stanford 教授 John Ousterhout（《A Philosophy of Software Design》作者）的觀察：

> 如果你很難幫一個變數或函式找到一個簡單的名字，這通常代表底層的設計不夠乾淨。

`processOrder` 找不到更精確名字的原因不是詞彙量不夠，是**它真的在做五件不同的事**，任何單一動詞都涵蓋不了全部。**命名困難本身就是職責過多的訊號**，這點跟 [[好維護的程式碼-Day03-命名]] 直接呼應。

## 三、成本二：改動會被迫牽動不相關的部分

如果行銷要求「確認信要加上退換貨說明」，你得打開 `processOrder`，在裡面找到寄信那一段修改。

**但你打開的是整個函式**，眼睛會掃過驗證邏輯、金額計算、折扣邏輯——這些跟這次改動完全無關，卻因為擠在同一個函式裡，變成了「順便看過一遍」的雜訊，也增加了手滑改錯旁邊程式碼的機率。

## 四、成本三：測試變難寫

想幫「折扣算得對不對」寫一個單元測試，你沒辦法只測折扣。呼叫 `processOrder` 就會連帶觸發 `db.save` 和 `email.send`，你被迫把資料庫和寄信服務都 mock 起來，才測得到你真正關心的那一行乘法。

**這不是「測試工具不好用」，是函式的職責邊界本身就藏著測試的邊界。**

---



## 五、重構後

```js
function validateOrder(order) {
  if (!order.items || order.items.length === 0) throw new Error('訂單沒有商品')
  if (!order.email) throw new Error('缺少 email')
}

function calculateTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

function applyDiscount(total, couponCode) {
  return couponCode === 'VIP10' ? total * 0.9 : total
}

function saveOrder(order, total) {
  return db.save({ ...order, total })
}

function sendConfirmationEmail(order, total) {
  return email.send(order.email, `訂單確認：NT$${total}`)
}

// 協調者：只負責「呼叫順序」，不做任何實際運算
function processOrder(order) {
  validateOrder(order)
  const rawTotal = calculateTotal(order)
  const total = applyDiscount(rawTotal, order.couponCode)
  const saved = saveOrder(order, total)
  sendConfirmationEmail(order, total)
  return saved
}
```

`processOrder` 現在讀起來**像目錄，不像操作手冊**——五行就是五個步驟的名字，不需要讀進任何一行的實作細節就知道整個流程在幹嘛。

---



## 六、量化：用「碰了幾種外部系統」代替感覺

「職責」這個詞很抽象，但有一個可以**實測的代理指標：這個函式一次呼叫，摸到了幾種外部系統（資料庫、email、檔案、網路…）**。

實測：


| 函式                      | 碰的外部系統數 | 說明              |
| ----------------------- | ------- | --------------- |
| `processOrder`（重構前）     | **2**   | db + email 一次全碰 |
| `validateOrder`         | 0       | 純邏輯             |
| `calculateTotal`        | 0       | 純邏輯             |
| `applyDiscount`         | 0       | 純邏輯             |
| `saveOrder`             | 1       | 只碰 db           |
| `sendConfirmationEmail` | 1       | 只碰 email        |


**這個數字直接對應「要測這段邏輯，你得 mock 幾樣東西」**——重構前測折扣邏輯要 mock 2 樣，重構後測 `applyDiscount` 要 mock 0 樣，因為它根本不认識 db 和 email 的存在。

行數統計（`.toString().split('\n').length`，實測於 Node.js v24）：


| 函式                                                                         | 行數  |
| -------------------------------------------------------------------------- | --- |
| `processOrder`（重構前，全部塞在一起）                                                 | 28  |
| `processOrder`（重構後，協調者）                                                    | 8   |
| `validateOrder`                                                            | 4   |
| `calculateTotal` / `applyDiscount` / `saveOrder` / `sendConfirmationEmail` | 各 3 |


ESLint 有專門管這件事的規則 `[max-lines-per-function](https://eslint.org/docs/latest/rules/max-lines-per-function)`，以及管參數量的 `[max-params](https://eslint.org/docs/latest/rules/max-params)`（預設上限 3 個）——**這不是我的個人偏好，是業界公認到寫進 linter 規則裡的門檻**。

---



## 七、我一開始想錯的地方



### 疑問一：拆完是不是函式越多越好？

不是。實測「追蹤流程要跳幾次」：

- 重構前：讀者從頭讀到尾，**跳 0 次**就看完整個流程，但要在腦中自己分辨「這段是驗證、這段是計算」。
- 重構後：讀 `processOrder` 本體**跳 0 次**就看懂流程是什麼（函式名字就是目錄），但想知道「折扣怎麼算」要**多跳 1 次**進 `applyDiscount`。

**拆函式不是零成本的**。用「函式名字讀起來像目錄」換來「想看細節要多點一次」，這筆交易划不划算，取決於讀者通常只需要知道流程、還是常常要鑽進細節。拆得比這更細（例如把 `total += item.price * item.qty` 也拆成一個函式）只會讓「跳轉次數」的成本超過「函式名字當文件」的收益。

### 疑問二：`processOrder`（協調者）本身不也是把五個步驟串起來，跟原本的 god function 有什麼不一樣？

差異不在「有沒有串起來」，在**協調者只做協調，不做任何實際運算**。


|                   | 重構前 `processOrder` | 重構後 `processOrder`     |
| ----------------- | ------------------ | ---------------------- |
| 有沒有 if/for 這類控制流程 | 有（驗證的 if、計算的 for）  | 沒有                     |
| 有沒有直接算數學          | 有（`total * 0.9`）   | 沒有，委派給 `applyDiscount` |
| 改「折扣怎麼算」要不要動到它    | 要                  | 不要                     |


**判準是：這個函式裡有沒有「動詞」，還是只有「名詞的排列順序」。** 協調者只列出「先做什麼、再做什麼」，任何一個步驟怎麼做，都不是它的責任。

---



## 八、跟前面幾天串起來


|       | Day 1     | Day 2      | Day 4          |
| ----- | --------- | ---------- | -------------- |
| 消除什麼  | 迴圈的中間狀態   | 判斷的巢狀層級    | 函式內混雜的職責       |
| 判準    | 有沒有現成動詞   | 排除法還是分類法   | 有沒有動詞／碰幾種外部系統  |
| 讀者省下的 | 不用追蹤變數怎麼變 | 不用同時記住四個條件 | 不用在一個函式裡切換心智模式 |


同一個母題：**減少讀者同時要在腦中維持的東西**，只是這次的單位從「一行敘述」升級成「一個函式該不該存在」。

---



## 九、什麼時候不該拆

**a. 步驟之間共享大量區域變數**

```js
function parseAndValidate(raw) {
  const tokens = tokenize(raw)      // 拆出來的每一步都要用到 tokens
  const ast = buildAst(tokens)      // 還要用到 ast
  const errors = validate(ast, tokens)
  return { ast, errors }
}
```

硬要拆成三個獨立函式，會被迫把 `tokens`、`ast` 這些中間結果當參數層層傳遞，**拆出來的介面比原本的實作還複雜**。這種情況通常代表該用一個 class 或 closure 把共享狀態包起來，而不是拆成一串各自獨立的函式。

**b. 效能敏感的緊密迴圈**

在每秒呼叫百萬次的內層迴圈裡，函式呼叫本身有開銷。為了「單一職責」把一行算式拆成一個函式呼叫，可能讓效能量測直接打臉這個決定。同樣的提醒：**先量測，這種情況比你以為的少**。

**c. 一次性腳本或原型**

探索性質的 script、只會跑一次的資料遷移，過度拆分反而增加閱讀成本（沒有人會再維護它第二次）。這個判準會在 Day14（過度設計）再展開。

---



## 十、今天的判斷標準

不要再問「這是不是只做一件事」——這句話本身就是模糊的來源。改問：

> **「要幫這段邏輯寫測試，我得 mock 幾樣不相關的東西？」**


| Mock 數量 | 判斷                  |
| ------- | ------------------- |
| 0（純邏輯）  | 職責夠單一，可以獨立測試        |
| 1       | 通常還算合理，一個函式對應一個外部依賴 |
| 2 以上    | 職責混在一起了，該拆          |


搭配一句更快的檢查：**這個函式的名字裡，需不需要用「和」或「然後」才能講完它做的事？** 需要，就代表它其實是好幾個函式。

---



## 明天預告

Day 5 講**參數與變數設計**：一個函式的參數超過幾個就該打包成物件？為什麼一堆布林參數是特別危險的一種寫法？

---



## 參考來源與內容出處說明

**一、有正式出處的部分**


| 內容                                           | 出處                                                                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 「命名困難＝設計不夠乾淨」的觀察                             | John Ousterhout, *A Philosophy of Software Design*，經 ExplainThis 命名系列文章引用：[https://www.explainthis.io/zh-hant/swe/naming-best-practices](https://www.explainthis.io/zh-hant/swe/naming-best-practices)                                 |
| `max-lines-per-function`、`max-params` 規則與預設值 | ESLint 官方文件：[https://eslint.org/docs/latest/rules/max-lines-per-function、https://eslint.org/docs/latest/rules/max-params](https://eslint.org/docs/latest/rules/max-lines-per-function、https://eslint.org/docs/latest/rules/max-params) |
| 「函式該長還是該短」主題架構                               | ExplainThis 線上課程《寫出好維護的程式碼 (上)》CH5：[https://www.explainthis.io/zh-hant/courses/maintainable-code-part1（此章節為付費課程，本文未逐字引用課程內容，僅取主題方向）](https://www.explainthis.io/zh-hant/courses/maintainable-code-part1（此章節為付費課程，本文未逐字引用課程內容，僅取主題方向）)  |


**二、我實際跑出來的部分**

「碰幾種外部系統」的量化表、行數統計、行為一致性驗證，全部由 `day04-function-boundary.js` 實測產生，可重跑驗證。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「函式名字讀起來像目錄，不像操作手冊」這個比喻
- 「碰幾種外部系統」作為職責數量的量化代理指標，這個具體用法是本文原創，不是 ESLint 或 ExplainThis 提出的
- 「有沒有動詞，還是只有名詞的排列順序」這個判準
- 「函式名字需不需要用『和』或『然後』」這個檢查法（概念上呼應業界俗稱的 "AND method" 反模式，但本文未逐字引用特定文獻）

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文的兩個版本與所有量化數字，都可以用這支腳本重跑驗證：`day04-function-boundary.js`（外部系統接觸點統計、行數統計、行為一致性對照）。