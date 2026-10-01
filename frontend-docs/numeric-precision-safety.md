---
title: "數值精度與安全性統整"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, IEEE754, 浮點數, 精度, FutureSign]
sources:
  - https://gemini.google.com/app/7cbc5bd991e2ed73
  - https://gemini.google.com/app/926d66c18ed36bf2
  - https://gemini.google.com/app/e374c0067f2eb277
updated: 2026-09-28
---

# 數值精度與安全性統整

## 問題根源：JavaScript 浮點數精度

### 為什麼 100 會變成 99？

JavaScript 使用 IEEE 754 雙精度浮點數，部分十進位數字無法精確表示：

```javascript
0.1 + 0.2 === 0.3       // false
0.1 + 0.2                // 0.30000000000000004

100 * 0.1               // 9.999999999999998
(100).toFixed(2)        // "100.00" ✓ (字串)
Number((100).toFixed(2)) // 100 ✓ (數字)
```

常見觸發場景：
- 小數點運算：`price * quantity`、`amount / 100`
- 百分比計算：`total * 0.99`
- 稅金/手續費：`price * 0.05`

---

## 底層機制：IEEE 754 雙精度浮點數怎麼存 0.1（2026-09-28 追加）

### 浮點數不等於小數

「小數」是數學概念，「浮點數（floating-point）」是電腦用**有限位元**模擬小數的一種資料格式（IEEE 754 是最常見標準）。電腦表示小數還有另一種做法「定點數（fixed-point）」，小數點位置固定、不會有誤差，但表示範圍較小，常見於金融計帳（如 C# 的 `decimal`、Python 的 `Decimal`）：

| 類型 | 小數點位置 | 特點 | 常見用途 |
| --- | --- | --- | --- |
| 浮點數 Floating-point | 可動（科學記號 M×2ᴱ） | 範圍極大，但部分小數<mark style="background: #FF5582A6;">無法精確表示</mark> | 科學計算、3D 繪圖 |
| 定點數 Fixed-point / Decimal | 固定 | <mark style="background: #BBFABBA6;">完全精確</mark>，範圍較小 | 金融、會計 |

### 64-bit 雙精度的位元配置

<mark style="background: #ADCCFFA6;">64 位元</mark>指的是整體記憶體空間（正負號＋指數＋尾數），不是尾數本身的長度：

| 正負號 Sign | 指數 Exponent | 尾數 Mantissa / Fraction |
| --- | --- | --- |
| 1 bit | 11 bits | 52 bits |

尾數欄位只存 52 位，但因為二進位科學記號法（如 `1.1001...×2⁻⁴`）小數點左邊一定是隱含的 `1`（不用花記憶體存），所以**實際精度是 1 + 52 = 53 位**。

### 指數為何要加偏移量（Bias）：從十進制 4.75 推導到硬體比大小

**a. 換成二進位科學記號法，小數點左邊永遠只會是 1**：十進位 `4.75` 轉二進位是 `100.11₂`，把小數點左移 2 位、指數補回 `×2²`，寫成 `1.0011₂ × 2²`。<mark style="background: #ADCCFFA6;">二進位只有 0 與 1 兩個數字，任何非零數字寫成科學記號法，小數點左邊一定且只會是 `1`</mark>——這正是上面「隱藏位元（Hidden Bit）」可以直接不存、省下 1 個位元的原因。

**b. 如果指數直接用二補數（Two's complement）存，硬體比大小會出錯**：二補數裡負數的最高位元是 `1`（如 `-1` 存成 `1111 1111`），正數的最高位元是 `0`。若指數直接用二補數存，會出現負指數（如 `2⁻¹`）的位元開頭是 `1`、正指數（如 `2¹`）開頭是 `0`，<mark style="background: #FF5582A6;">硬體逐位元比大小時負指數反而看起來比正指數大</mark>，ALU 無法直接把整個浮點數當一般二進位整數做字典序比較，必須先拆解符號位、判斷正負再做轉換，電路變得複雜笨重。

**c. IEEE 754 的解法：指數全部加一個固定偏移量（Bias）**，把所有可能的指數整體平移成非負整數再存。單精度的 Bias 是 `127`：實際指數 `-1` 存成 `-1+127=126`（`0111 1110`），實際指數 `+1` 存成 `1+127=128`（`1000 0000`）。因為 `128 > 126`，位元的數值順序就跟直覺的指數大小順序一致，<mark style="background: #BBFABBA6;">硬體可以直接把整個 64-bit（或 32-bit）當成一般無符號整數做字典序比較，不用為指數另做特殊轉譯電路</mark>，這也是浮點數比大小可以跟整數共用比較邏輯的原因。

### 逐步拆解：0.1 + 0.2 在浮點運算器（FPU）裡怎麼算

1. **十進制轉二進制**：`0.1` 轉成二進制是無限循環小數 `1.1001100110011...×2⁻⁴`，`0.2` 是 `1.1001100110011...×2⁻³`（推導方式見 [[進制轉換-除2取餘數法原理|乘 2 取整法]]）。
2. **存入暫存器（截斷並捨入）**：尾數只能留 53 位精度，電腦用「捨入到最接近，正中間進到偶數」（Ties to Even，俗稱銀行家捨入法）處理超出的部分。以 `0.1` 為例，裁切到第 53 位後，因為後面還有其他 `1`，會強制進位，導致 `0.1` 存進電腦後**實際數值微幅偏大**，約為 `0.1000000000000000055511151231257827021181583404541015625`。
3. **對階與相加**：兩個浮點數相加前要先把指數調整一致（對階），`0.1` 的指數要提升到跟 `0.2` 一樣的 `2⁻³`，尾數對應右移一位再相加。
4. **規格化與再次捨入**：加總結果轉回科學記號形式，尾數超出 53 位的部分再捨入一次，最終换算回十進制會是 `0.3000000000000000444089209850062616169452667236328125`，印出時精簡顯示成 `0.30000000000000004`。

<mark style="background: #FFF3A3A6;">重點：`0.1 + 0.2 !== 0.3` 不是 JavaScript 的 bug，而是所有採用 IEEE 754 雙精度浮點數的語言（Python、Java、C++⋯）共同的行為</mark>，根源在於十進制的 0.1／0.2 換算成二進制都是無限循環小數，必須截斷捨入才能塞進 53 位精度的尾數欄位。

> 來源對話：[十進制 0.1 轉二進制解析](https://gemini.google.com/app/7cbc5bd991e2ed73)、[浮點數與小數的差異解析](https://gemini.google.com/app/926d66c18ed36bf2)、[浮點數公式設計原理解析](https://gemini.google.com/app/e374c0067f2eb277)（2026-09-28）

---

## `.toFixed()` vs `.toPrecision()`

### toFixed(digits)
**用途**：固定小數位數（四捨五入到指定位數）

```javascript
(99.996).toFixed(2)     // "100.00"  ✓ 正確四捨五入
(99.994).toFixed(2)     // "99.99"
(123.456).toFixed(2)    // "123.46"
```

**特性**：
- 返回 **字串**，不是數字
- 小數位數由參數決定
- 會進行四捨五入
- 安全用於顯示/傳輸

### toPrecision(digits)
**用途**：有效數字精度（包括整數部分）

```javascript
(100).toPrecision(3)    // "1.00e+2" (科學記號！)
(100).toPrecision(4)    // "100.0"
(123.456).toPrecision(5) // "123.46"
```

**特性**：
- 返回 **字串**
- 指定的是**總有效數字**，不是小數位數
- 大數字易產生科學記號
- **不推薦用於金額**

---

## 安全規則（FutureSign 應用）

### ❌ 危險：直接浮點數運算顯示

```javascript
// 禁止！可能顯示 99.99999999
const total = price * quantity;
return <span>{total}</span>;

// 禁止！字串混亂
const display = (100.1).toString(); // "100.1" 不一致
```

### ✅ 安全方案 1：整數分幣（推薦用於金額）

**原則**：所有金額內部用分（整數）存儲，計算完後再轉元顯示

```javascript
// 後端響應：金額以分存儲
{
  price: 9999,  // 99.99 元
  quantity: 2,
  total: 19998  // 199.98 元
}

// 前端顯示函式
const formatCurrency = (cents) => {
  const yuan = Math.floor(cents / 100);
  const fen = cents % 100;
  return `${yuan}.${fen.toString().padStart(2, '0')}`;
};

formatCurrency(19998) // "199.98" ✓ 安全
```

**優點**：
- 完全避免浮點數精度問題
- 計算都在整數域（不損失精度）
- 金融級安全標準

### ✅ 安全方案 2：用 toFixed 進行顯示

```javascript
// 計算後立即轉字串，限制位數
const displayPrice = (price) => {
  // 1. 先舍入到小數位數
  const rounded = Math.round(price * 100) / 100;
  // 2. 轉成字串並固定位數
  return rounded.toFixed(2);
};

displayPrice(99.996) // "100.00" ✓
displayPrice(99.994) // "99.99" ✓
```

**使用場景**：
- 顯示銷售價格
- 顯示計算結果
- 輸出到 UI

### ✅ 安全方案 3：第三方精度庫

**使用 Decimal.js 或 Big.js**

```javascript
import Decimal from 'decimal.js';

const price = new Decimal('99.99');
const qty = new Decimal('2');
const total = price.times(qty);

total.toString()     // "199.98" ✓ 精確
total.toFixed(2)    // "199.98" ✓ 精確
```

**優點**：
- 完全精確計算
- 支持任意精度
- 適合複雜財務計算

**缺點**：
- 增加包大小
- 性能略低
- 簡單場景可能過度設計

---

## FutureSign 場景檢查清單

### 票券價格 / 手續費
```javascript
// ❌ 危險
const fee = price * 0.05;

// ✅ 安全：計算後四捨五入
const fee = Math.round(price * 0.05 * 100) / 100;
const display = fee.toFixed(2);

// ✅ 更安全：後端計算，前端只顯示
// 後端：feeCents = Math.round(priceCents * 5 / 100)
// 前端：formatCents(feeCents)
```

### 轉帳金額
```javascript
// ❌ 危險
const refund = originalPrice - discountPrice;

// ✅ 安全：確保兩邊都經過舍入
const refund = (Math.round(originalPrice * 100) - Math.round(discountPrice * 100)) / 100;
return refund.toFixed(2);
```

### 批量操作（e.g., 多張票批轉讓）
```javascript
// ❌ 危險：逐個加總，誤差累積
let total = 0;
tickets.forEach(t => { total += t.price; });

// ✅ 安全：先轉整數，計算完再除
let totalCents = 0;
tickets.forEach(t => { totalCents += Math.round(t.price * 100); });
const result = totalCents / 100;
return result.toFixed(2);
```

### ECPay / 綠界金額傳遞
```javascript
// 綠界要求金額為整數
const priceInYuan = 99.99;

// ❌ 危險
const ecpayAmount = parseInt(priceInYuan);  // 99（丟失）

// ✅ 安全
const ecpayAmount = Math.round(priceInYuan * 100) / 100; // 99.99
const ecpayInt = Math.round(ecpayAmount * 100); // 9999（傳給綠界）
```

---

## 顯示層最佳實踐

### 統一的金額格式化函式

```typescript
// utils/currency.ts
export const formatCurrency = (
  cents: number,
  locale: 'zh-TW' | 'en-US' = 'zh-TW'
): string => {
  const yuan = (cents / 100).toFixed(2);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TWD',
  }).format(parseFloat(yuan));
};

// 或簡化版
export const formatCurrency = (yuan: number): string => {
  return yuan.toFixed(2);
};

// 用法
<span>{formatCurrency(priceInYuan)}</span>
```

### 禁止 Hardcode 四捨五入
所有金額相關計算統一走上述工具函式，不要各自實現。

---

## Lint 規則建議

```javascript
// ESLint rule: no-direct-float-arithmetic
// 禁止這樣寫
price * quantity  // ❌ 應改用函式

// 要求這樣寫
multiply(price, quantity)  // ✓ 明確的精度函式
```

---

## 總結表

| 場景 | 方案 | 返回型 | 說明 |
|------|------|--------|------|
| 金額計算 | 分（整數） | number | 最安全，金融級 |
| 金額顯示 | toFixed(2) | string | 顯示時使用 |
| 百分比/倍數 | toFixed(1~2) | string | 業務報表 |
| 精密計算 | Decimal.js | Decimal | 複雜財務邏輯 |
| **禁止** | toPrecision | string | 易產生科學記號 |
| **禁止** | 直接浮點運算 | number | 精度損失 |

---

## 參考資源

- [IEEE 754 浮點數](https://en.wikipedia.org/wiki/IEEE_754)
- [JavaScript Number.toFixed()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed)
- [Decimal.js 文件](https://mikemcl.github.io/decimal.js/)
- [金融系統安全規範](https://en.wikipedia.org/wiki/Monetary_value)
