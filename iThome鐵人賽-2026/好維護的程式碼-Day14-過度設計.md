---
title: Day 14 三層抽象，只為了一種折扣
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, over-design, YAGNI, 設計模式]
updated: 2026-08-24
---

# Day 14｜三層抽象，只為了一種折扣

> 純 Markdown，可直接貼到 iThome。

昨天（Day13）講 YAGNI——「你不會用到它」，重點是**不要為了猜測中的未來需求，先寫用不到的程式碼**。今天要講的是 YAGNI 沒說完的另一半：**如果那個「猜測中的未來」被寫成了一整套抽象呢？**

這就是**過度設計（Over-design）**。它比 YAGNI 講的「多寫一個沒用到的參數」更隱蔽，因為過度設計常常**看起來很專業**——用了策略模式、工廠模式，程式碼像是「為將來做好準備」。問題是：準備到底有沒有用，要用數字說話。

---

## 一、重構前

需求：訂單結帳時要打折，目前**只有一種**折扣邏輯——固定金額折扣。工程師覺得以後應該還會有百分比折扣、滿額折扣等等，所以先把架構搭好：

```js
class DiscountStrategy {
  calculate(amount) { throw new Error('not implemented') }
}

class FixedAmountDiscountStrategy extends DiscountStrategy {
  constructor(discountAmount) {
    super()
    this.discountAmount = discountAmount
  }
  calculate(amount) {
    return Math.max(0, amount - this.discountAmount)
  }
}

class DiscountStrategyFactory {
  static create(type, config) {
    switch (type) {
      case 'fixed':
        return new FixedAmountDiscountStrategy(config.amount)
      default:
        throw new Error(`Unknown discount type: ${type}`)
    }
  }
}

// 使用端
const strategy = DiscountStrategyFactory.create('fixed', { amount: 100 })
const finalPrice = strategy.calculate(500)
```

三個 class，一個抽象基底、一個實作、一個工廠。**功能完全正確**，跑起來沒有任何問題。上線一年後，這套折扣系統**還是只有這一種類型**。

---

## 二、成本一：要看懂「折扣到底怎麼算的」，得打開幾個檔案

實測：要理解「這行程式碼最後算出來的折扣是多少」，各版本需要打開的定義數。

| | 需要理解的定義 | 數量 |
|---|---|---|
| 過度設計版 | `DiscountStrategy`、`FixedAmountDiscountStrategy`、`DiscountStrategyFactory`、呼叫端 | **4** |
| 精簡版 | `calcSimple` | **1** |

```js
function calcSimple(amount, discountAmount) {
  return Math.max(0, amount - discountAmount)
}
```

同樣的行為，精簡版只要打開一個函式就懂了。過度設計版要**先弄懂工廠回傳了哪個策略、再跳進那個策略類別、再確認它繼承的基底類別長怎樣**——三次跳轉，才看得到那行 `Math.max(0, amount - this.discountAmount)`。

## 三、成本二（我原本以為的）：呼叫深度變深了

我一開始猜，過度設計版**多繞了一層工廠、一層繼承**，runtime 的呼叫堆疊應該會比較深。用 `new Error().stack` 實測兩版在「真正做計算」那一行的呼叫深度：

```
過度設計版：呼叫到「真正做計算」那一行時，stack 深度 = 11
精簡版　　：呼叫到「真正做計算」那一行時，stack 深度 = 11
```

**猜錯了，深度完全一樣。** 原因是 `DiscountStrategyFactory.create()` 在 `strategy.calculate()` 被呼叫**之前就已經執行完並回傳了**——兩個呼叫是**接續**發生的，不是**巢狀**發生的：

```js
const strategy = DiscountStrategyFactory.create('fixed', { amount: discountAmount })  // 這行執行完，工廠就退出了
return strategy.calculate(amount)                                                       // 這是一次全新的呼叫，不是巢狀在工廠裡面
```

**這是這篇文章裡最有意思的一個修正**：過度設計的代價，**不在 runtime 的呼叫深度**。它的代價在別的地方。

## 四、成本三：效能差異微乎其微，但這不是重點

實測 100 萬次呼叫：

| | 耗時 |
|---|---|
| 過度設計版 | 5.78 ms |
| 精簡版 | 3.52 ms |

差距 2.27 ms／100 萬次，平均每次呼叫只差 **0.0023 微秒**。在 V8 這種等級的效能差異，**實務上完全無感**。

**這正好呼應成本二的發現：過度設計的成本不是機器要多繞幾層、多花幾毫秒，是人要多讀幾個檔案、多建幾個心智模型。** 機器不在乎有沒有工廠模式，人會在乎。

## 五、成本四：那套抽象，真的讓「新增功能」變簡單了嗎

這是過度設計最常見的辯護詞：「先做好抽象，以後加新類型比較快。」實測加一種「百分比折扣」：

```js
// 過度設計版：新增一個 class + 修改工廠一處
class PercentageDiscountStrategy extends DiscountStrategy {
  constructor(percent) { super(); this.percent = percent }
  calculate(amount) { return Math.max(0, amount * (1 - this.percent / 100)) }
}
// 工廠要多一個 case：
//   case 'percentage': return new PercentageDiscountStrategy(config.percent)

// 精簡版：多加一個函式
function calcPercentage(amount, percent) {
  return Math.max(0, amount * (1 - percent / 100))
}
```

兩邊**都只是「加」，不需要「改」舊程式碼**。過度設計版並沒有因為預先搭好架構而讓新增變得更輕鬆——它只是把「加一個函式」換成了「加一個 class + 改一處 switch」，多做的事，一件也沒少。

**當初那套為了「方便以後擴充」而搭的架構，並沒有兌現它的承諾。**

---

## 六、我一開始想錯的兩個地方

### 疑問一：策略模式不是最佳實踐嗎？為什麼變成過度設計？

策略模式本身沒有錯，錯的是**用的時機**。策略模式的價值來自「真的有多種可替換的演算法，而且會變動」。如果**目前只有一種實作，未來也還沒發生**，那個「可替換」是空的——你抽象出來的介面，只有一個東西在實作它，等於白付了間接層的代價，卻沒拿到「可替換」帶來的任何好處。

### 疑問二：那以後真的要加新折扣類型怎麼辦？現在不先準備嗎？

到那個時候再重構成策略模式，而且**到那時候你才真正知道變化的維度是什麼**。這正是 **Rule of Three（三次法則）** 的精神——現在硬猜的抽象常常猜錯維度：你可能猜是「依折扣類型」變化，但實際上業務要的是「依會員等級」變化，猜錯維度的抽象比沒有抽象更難拆。明天（Day15）會從相反的方向繼續講這個法則。

> **Rule of Three** 由 Don Roberts 提出、經 Martin Fowler 在《Refactoring》一書中推廣：第一次寫就直接寫；第二次出現類似的，忍著重複也先不要抽；第三次才真正動手重構。

---

## 七、什麼時候「先做抽象」不算過度設計

**a. 需求已經明確列在規格書裡，不是自己猜的**
金流串接規格書上白紙黑字列了 5 種付款方式，一開始就用策略模式分開每種付款流程，這不是過度設計——需求已經存在，只是還沒全部做完。

**b. 已經出現第三次重複**
Rule of Three 觸發了，該抽象了。

**c. 模組會被其他團隊獨立擴充**
大型專案裡，如果這個模組確定會有其他團隊掛外掛、加實作，預留擴充點是合理的架構決策。

**d. 抽象本身的維護成本很低，且降低的風險很高**
例如金流的「重試機制」抽成介面，即使目前只有一種金流，因為金流串接經常出包，抽出來方便集中管理重試/超時邏輯，這是為了可測試性和風險控制，不是為了「以後方便擴充」。

---

## 八、今天的判斷標準

看到策略模式、工廠模式、plugin 架構這類「彈性設計」時，問自己：

> **「這個彈性，現在有超過一種真實存在的實作在用它嗎？」**

| 情境 | 判斷 |
|---|---|
| 目前只有一種實作，理由是「以後可能需要」 | 過度設計，先寫最簡單版本 |
| 規格書已經列出多種，只是還沒做完 | 不是過度設計，需求已存在 |
| 已經出現第三次重複 | 該抽象了（Rule of Three） |
| 純粹想展示技術能力 | 過度設計 |

---

## 九、跟前面 Day 串起來

| | Day13 YAGNI | Day14 過度設計 |
|---|---|---|
| 講的是 | 不要寫用不到的**功能** | 不要為了用不到的功能，先搭**抽象架構** |
| 具體案例 | 多寫一個沒人用的參數 | 為一種折扣類型搭三層 class |
| 共同精神 | 需求出現了再動手，不要猜 | 需求出現了再抽象，不要猜 |

---

## 明天預告

Day15 講**反過來的極端——完全不設計、複製貼上式開發**。同一段驗證邏輯複製到三個地方，會發生什麼事？答案比想像中更難抓。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| Rule of Three（三次法則）的定義與 Don Roberts 的原話 | Wikipedia, *Rule of three (computer programming)*，內容引自 Martin Fowler, *Refactoring: Improving the Design of Existing Code*：https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming) |
| Overengineering（過度設計）的定義 | Wikipedia, *Overengineering*：https://en.wikipedia.org/wiki/Overengineering |

**二、我實際跑出來的部分**

行為一致性對照、呼叫深度（stack trace 實測）、100 萬次呼叫效能對比，全部由 `day14-over-design.js` 實測產生，可重跑驗證。實測環境 Node.js v24.14.0。

**三、我自己的整理與比喻（沒有外部出處）**

- 「要看懂折扣怎麼算，得打開幾個定義」這個量化方式
- 「過度設計的代價不在效能，在人要多讀幾個檔案」這個結論
- 「什麼時候先做抽象不算過度設計」那四種情況的分類

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24.14.0，可執行腳本見文末）

## 可執行範例

本文所有量化數字都可以用這支腳本重跑驗證：`day14-over-design.js`（行為一致性對照、呼叫深度實測、新增功能所需改動、100 萬次呼叫效能對比）。
