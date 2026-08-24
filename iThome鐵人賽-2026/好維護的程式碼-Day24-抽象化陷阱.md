---
title: Day 24 抽早了比不抽更糟——淺模組的抽象化陷阱
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 抽象化, 設計模式]
updated: 2026-08-24
source: ExplainThis「寫出好維護的程式碼」上集 CH9；John Ousterhout, A Philosophy of Software Design
---

# Day 24｜抽早了比不抽更糟——淺模組的抽象化陷阱

> 純 Markdown，可直接貼到 iThome。

Day23 講「讓模組更通用，靈活就好維護」，但通用做過頭會撞上今天的主題：**抽象化本身也有成本，抽錯地方比不抽還糟**。

---

## 一、重構前

需求：驗證使用者輸入的 email 格式。有人覺得「以後可能還要驗證密碼、手機、身分證」，先把驗證邏輯包成 Strategy Pattern：

```js
class EmailValidationStrategy {
  validate(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }
}
class PasswordValidationStrategy {
  validate(value) {
    return value.length >= 8
  }
}
class ValidatorFactory {
  static create(type) {
    switch (type) {
      case 'email':    return new EmailValidationStrategy()
      case 'password': return new PasswordValidationStrategy()
      default: throw new Error(`Unknown validator type: ${type}`)
    }
  }
}

function checkEmail(email) {
  const validator = ValidatorFactory.create('email')
  return validator.validate(email)
}
```

這段程式碼**完全正確**，也符合教科書上的 Strategy Pattern 寫法。但它有一個很容易被「這是設計模式所以是好的」這句話擋住的維護成本。

---

## 二、成本：讀者要跳 6 次定義，才看得到一個正規表達式

要理解「這個 email 到底怎麼被判斷合不合法」，讀者的路徑是：

1. `checkEmail` 呼叫 `ValidatorFactory.create('email')`
2. 跳進 `ValidatorFactory.create`，看 `switch/case` 選中了哪個分支
3. 跳進 `EmailValidationStrategy` 的建構子
4. 跳進 `.validate()` 方法本體
5. 才終於看到那行正規表達式

**六層，換來的東西是一個一行的正規表達式判斷。**

這正是 Ousterhout 在《A Philosophy of Software Design》裡講的**淺模組（Shallow Module）**：一個模組的介面複雜度，跟它藏住的實作複雜度不成比例。理想的模組應該是「介面窄、功能深」——像 Unix 的 `read()`／`write()`，五個簡單方法背後藏著數千行檔案系統邏輯。而上面這個 `EmailValidationStrategy`，介面（`.validate()`）跟它藏的東西（一行正規表達式）幾乎一樣淺，等於**只是換了個更麻煩的地方寫同一行程式碼**。

---

## 三、重構後

```js
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function checkEmail(email) {
  return isValidEmail(email)
}
```

跳轉次數：`checkEmail → isValidEmail → 正規表達式本身`，**3 層**。

實測（見文末 `day24-shallow-wrapper.js`）：

| | Strategy＋Factory 版 | 函式版 |
|---|---|---|
| 讀者要跳的定義數 | 6 | **3** |
| 四組輸入的驗證結果 | 全部一致 | 全部一致 |

行為完全相同，理解成本少了一半。

---

## 四、我一開始想錯的地方

### 疑問一：這不就是 Strategy Pattern 嗎？設計模式不是好的軟體設計原則嗎？

先講結論：**設計模式本身沒錯，錯的是「還沒有真的需要它的時候先套上去」。**

Strategy Pattern 要解決的問題是「同一個介面底下，有好幾種**真的不一樣**的演算法或流程」。上面的例子只有一種驗證邏輯（email），根本沒有「策略」可言——**沒有互相替換的對象，就不是策略，只是包裝。**

### 疑問二：那什麼時候 Strategy/Factory 才划算？

用一個真的有五花八門邏輯的例子測：付款方式。

```js
class CreditCardPayment {
  pay(amount) {
    return { method: 'credit_card', amount, fee: amount * 0.028, steps: ['3D驗證', '請款', '對帳'] }
  }
}
class LinePayPayment {
  pay(amount) {
    return { method: 'linepay', amount, fee: amount * 0.02, steps: ['開啟App確認', '扣款', '對帳'] }
  }
}
class ATMTransferPayment {
  pay(amount) {
    return { method: 'atm', amount, fee: 15, steps: ['產生虛擬帳號', '等待轉帳', '比對入帳'] }
  }
}
```

實測輸出：

| 付款方式 | 手續費（1000元） | 步驟數 |
|---|---|---|
| credit_card | 28.0 | 3 |
| linepay | 20.0 | 3 |
| atm | 15.0 | 3 |

三種付款方式的**手續費公式完全不同、內部步驟完全不同**，但對外都只暴露一個 `.pay(amount)`。這裡的介面一樣窄，但實作**真的深**——藏住了三套完全不同的商業邏輯。這才是抽象化該賺回來的複雜度。

**判準：Strategy/Factory 值不值得，看的不是「有沒有用到設計模式」，是「介面窄的背後，實作有沒有真的深」。**

### 疑問三：那要等到什麼時候才能確定「這值得抽」？

跟 Day23 的通用化判準呼應：**等到第二個、第三個真的不同的實作出現時再抽**，不要在只有一種情境時就先猜測未來的變化型態。先寫死成函式，之後要抽的時候，重構工具能幫你把函式包成類別；但反過來——**先抽成一堆類別，之後發現猜錯了要拆掉，成本高得多。**

---

## 五、跟前面 Day 串起來

| | Day21 DRY | Day23 通用化 | Day24 抽象化陷阱 |
|---|---|---|---|
| 錯誤的方向 | 看到重複就急著合併 | 為了「以後可能」把介面設計得太寬 | 為了「以後可能」先套上設計模式 |
| 共同的病根 | 都是在**猜測還沒發生的需求** | | |
| 正確的順序 | 先讓重複存在，等第三次出現同樣的模式，再抽 | | |

三篇的共同結論：**好的抽象是從真實出現過的重複裡長出來的，不是預先設計出來的。**

---

## 六、什麼時候不該現在就下手重構

**a. 已經有明確的產品路線圖，近期真的會加第二種驗證邏輯**

如果 PM 已經排好下週要加密碼強度驗證、手機格式驗證，那先建立 Strategy 骨架是合理的預先準備，不算過度設計——差別在「有沒有已知、近期會實現的需求」，不是「感覺以後可能會用到」。

**b. 團隊已經有慣例，這個模組要跟其他驗證器保持同樣的結構**

如果專案裡已經有 10 個驗證器都是 Strategy Pattern，第 11 個為了一致性也用同樣結構，即使它目前只有一種情境，也是合理選擇——這是 Day25 要講的「一致性」在起作用，一致性有時候會蓋過「這裡技術上不需要抽象」的判斷。

**c. 抽象层本身已經在用，貿然拆掉風險更高**

如果 `ValidatorFactory` 已經被十幾個地方呼叫，即使現在看起來是淺模組，直接拆掉的改動範圍可能比留著更危險。這種情況下先觀察、記錄技術債，比立刻重構更務實。

---

## 七、今天的判斷標準

看到一個類別、介面或設計模式時，問自己：

> **「拿掉這層抽象，直接寫最原始的邏輯，會不會比較好懂？」**

| 情況 | 判斷 |
|---|---|
| 介面很窄，實作也很淺（一行邏輯） | 淺模組，抽象化陷阱，考慮拿掉 |
| 介面很窄，實作藏了真的複雜的邏輯 | 深模組，抽象化值得 |
| 只有一種情境，卻已經設計成可替換多種情境 | 過早抽象，先寫死，等真的出現第二種再抽 |

---

## 明天預告

Day 25 講**一致性**：同一個模組裡，命名風格、參數順序、回傳格式如果不一致，會讓每一次呼叫都變成一次猜謎遊戲。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| 「淺模組 Shallow Module」「介面窄、功能深」的判準 | John Ousterhout, *A Philosophy of Software Design*；中文導讀：ExplainThis,《A Philosophy of Software Design》心得 1，發布於 2022-01-24：https://www.explainthis.io/zh-hant/swe/a-philosophy-of-software-design/part1 |
| Strategy Pattern 的定義與適用情境 | 軟體工程領域通用術語，出自 Gang of Four, *Design Patterns*，非本文查證重點 |
| 課程章節：抽象化要避免的問題 | ExplainThis「寫出好維護的程式碼（上）」CH9：https://www.explainthis.io/zh-hant/courses/maintainable-code-part1 |

**二、我實際跑出來的部分**

跳轉定義數、四組輸入的驗證結果一致性、三種付款方式的手續費與步驟數，全部由 `day24-shallow-wrapper.js` 實測產生。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「介面窄的背後，實作有沒有真的深」這個判準的具體算法（跳轉定義數）
- 付款方式的範例設計
- 「拿掉這層抽象，直接寫最原始的邏輯，會不會比較好懂」這個檢查問句

**四、其他**

- MDN, `RegExp`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

存成 `day24-shallow-wrapper.js`，終端機執行 `node day24-shallow-wrapper.js` 就能重跑本文所有數字。
