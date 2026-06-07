# TDD 與 BDD

> 面試會問(尤其 MAYO 把 TDD/BDD 列加分項)。重點:**兩者都是「先寫測試,再寫程式」。**
> 差別:**TDD 看「程式對不對」,BDD 看「使用者行為對不對」。**

---

## TDD(測試驅動開發)

核心循環 **Red → Green → Refactor**,每次走一小步:

| 步驟 | 做什麼 |
|---|---|
| 🔴 **Red** | 先寫一個**會失敗**的測試(功能還沒寫,當然失敗) |
| 🟢 **Green** | 寫**剛好夠**讓測試通過的程式(不多寫) |
| ♻️ **Refactor** | 在測試保護下整理程式碼(測試保持綠) |

→ 回到 Red,加下一個測試。

### 例子:購物車總額(滿 1000 打 9 折)+ Jest

```js
// 🔴 Red:先寫測試(cartTotal 還不存在 → 失敗)
test('空車總額為 0', () => {
  expect(cartTotal([])).toBe(0)
})

// 🟢 Green:寫最少的程式讓它過
function cartTotal(items) {
  return 0                         // 先寫死,夠過就好
}

// 🔴 下一個測試 → 失敗
test('總和 = 各商品 價格×數量', () => {
  expect(cartTotal([{ price: 100, qty: 2 }])).toBe(200)
})
// 🟢 補加總
function cartTotal(items) {
  return items.reduce((s, i) => s + i.price * i.qty, 0)
}

// 🔴 折扣測試 → 失敗
test('總額超過 1000 自動打 9 折', () => {
  expect(cartTotal([{ price: 600, qty: 2 }])).toBe(1080)   // 1200 × 0.9
})
// 🟢 補折扣;之後再 Refactor
function cartTotal(items) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  return total > 1000 ? total * 0.9 : total
}
```

**為什麼**:先寫測試逼你想清楚「要什麼結果」、只寫剛好夠的程式(不過度設計),還得到一張安全網(改壞會馬上紅燈)。

---

## BDD(行為驅動開發)

**= TDD 的「行為導向 + 協作」進化版。** 一樣先寫測試,但:
1. 測試寫成**一句句行為描述**,非工程師(PM/設計/客戶)也讀得懂
2. 用 **Given–When–Then**(給定情境 → 當某動作 → 則某結果)

### describe / it 風格(Jest、Mocha、Jasmine 都支援)

```js
describe('購物車總額', () => {
  it('空車時應為 0', () => { /* ... */ })
  it('應為各商品 價格×數量 的總和', () => { /* ... */ })
  it('總額超過 1000 時應自動打 9 折', () => { /* ... */ })   // 讀起來像規格句
})
```

### Gherkin 語法(Cucumber)—— 完全自然語言

```gherkin
Feature: 購物車折扣
  Scenario: 消費滿額自動折扣
    Given 購物車商品總額為 1200 元      # 給定
    When  計算購物車總額                # 當
    Then  應打 9 折,總額為 1080 元      # 則
```

### 前端實戰:React 測試其實就是 BDD 風格(Jest + RTL)

```jsx
it('點「加入購物車」後,數量應 +1', async () => {
  render(<AddToCart />)
  expect(screen.getByText('購物車 (0)')).toBeInTheDocument()               // Given 初始 0
  await userEvent.click(screen.getByRole('button', { name: '加入購物車' }))  // When 點擊
  expect(screen.getByText('購物車 (1)')).toBeInTheDocument()               // Then 變 1
})
```

---

## TDD vs BDD 對照

| | TDD | BDD |
|---|---|---|
| 重心 | 程式單元**對不對** | 系統**行為**符不符合需求 |
| 視角 | 開發者 | 使用者/商業 + 跨角色協作 |
| 測試讀起來 | `test('cartTotal returns 200')` | `it('總額滿千應打 9 折')` / Given-When-Then |
| 語言 | 技術 | 接近自然語言,非工程師也懂 |
| 工具 | Jest、Mocha | Cucumber(Gherkin)、Jasmine;也可用 Jest/Mocha 的 describe/it |
| 關係 | — | BDD 把 TDD 的測試「用行為 + 人話」寫出來;Red-Green-Refactor 循環兩者共用 |

---

## 面試怎麼誠實回答

> 「正式專案我還沒實作過完整 TDD/BDD 流程,但我理解核心:
> **TDD** 是 Red-Green-Refactor —— 先寫會失敗的測試、寫最少程式讓它過、再重構;
> **BDD** 是把測試寫成使用者行為的描述(Given-When-Then),讓非工程師也讀得懂、促進協作。
> 前端我會用 **Jest + React Testing Library** 從使用者視角測元件行為,其實就是 BDD 風格。」

→ 誠實(沒謊稱有實戰)+ 展現你真的懂概念。
