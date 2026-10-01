---
title: Number.isNaN() vs isNaN()——型別轉換陷阱
date: 2026-09-23
tags: [JavaScript, NaN, 型別檢測, Date驗證]
---

# Number.isNaN() vs isNaN()

## NaN 是什麼？

**NaN = Not a Number（不是數字）**

但違反直覺的是：

```js
typeof NaN                // "number" ← NaN 本身是 Number 類型！
typeof undefined          // "undefined"

NaN === NaN              // false ← NaN 是唯一不等於自己的值
undefined === undefined  // true
```

**NaN 是一個特殊的 Number 值**，由 IEEE 754 浮點數標準定義。它代表「數值運算失敗」，變數有值、且是數值型別，但這個數值內容無效。

## NaN 何時產生？

### ① 型別轉換失敗

```js
Number('hello')              // NaN（字串無法轉成數字）
Number(undefined)            // NaN
parseInt('abc', 10)          // NaN
parseFloat('12.3x')          // 12.3（部分成功）
```

### ② 數學運算無定義

```js
Math.sqrt(-1)               // NaN（負數無平方根）
0 / 0                       // NaN（零除零）
Math.log(-5)                // NaN（負數無對數）
```

### ③ 日期/時間無效

```js
new Date('invalid').getTime()    // NaN
Date.parse('not-a-date')         // NaN
```

### ④ 運算中一個操作數是 NaN

```js
5 + NaN                     // NaN（病毒傳播）
NaN * 100                   // NaN
```

## 核心差異表

| 函式               | 檢測方式               | 型別轉換 | 適用場景               |
| ---------------- | ------------------ | ---- | ------------------ |
| `isNaN()`        | 先轉成數字，再檢測結果是否為 NaN | 會轉換  | 用戶輸入檢驗（寬鬆模式）       |
| `Number.isNaN()` | 直接檢測是否為真正的 NaN     | 不轉換  | 底層驗證（嚴格模式）——**推薦** |

## 型別轉換陷阱

### isNaN()——檢查「轉換後是否為 NaN」
邏輯是：解析成數字，不是轉ASCII碼。


```js
isNaN(123)            // Number(123) → 123（不是NaN）→ false
isNaN('456')          // Number('456') → 456（不是NaN）→ false
isNaN('hello')        // Number('hello') → NaN → true
isNan("456hello)      // Number()→ true
isNaN(undefined)      // Number(undefined) → NaN → true
isNaN({})             // Number({}) → NaN → true
isNaN(null)           // Number(null) → 0（不是NaN）→ false ！危險
```

**為什麼會這樣設計？** —— 解決語義混亂

如果直接檢查類型，會造成混淆：

```js
function strictIsNaN(x) {
  return typeof x !== 'number'
}
strictIsNaN(123)      // false（123 是 Number 類型）
strictIsNaN('456')    // true（'456' 是 String 類型）
```

但用戶角度看，123 和 '456' 都能當數字用！為什麼結果不同？

所以 `isNaN()` 改設計：**在背後呼叫 `Number()` 轉成同一類型，再檢測**

```js
isNaN(123)                 // Number(123) → 123 → false
isNaN('456')               // Number('456') → 456 → false
// 現在語義清楚：轉換後都不是 NaN

isNaN('hello')             // Number('hello') → NaN → true
// 轉換後是 NaN
```

### Number.isNaN()——不轉換，直接檢測

```js
Number.isNaN(NaN)         // true（只有真正的 NaN）
Number.isNaN(123)         // false
Number.isNaN('hello')     // false（'hello' 不是 NaN，根本不轉換）
Number.isNaN(undefined)   // false
Number.isNaN({})          // false
Number.isNaN(null)        // false
```

## 實務應用

### ① 檢查日期是否有效

```js
// 你的代碼
const dateObj = new Date(date)
if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
  return '--:--:--'
}

// 為什麼 getTime() 會返回 NaN？
// 當日期物件無效時，內部沒有有效時間戳，getTime() 返回 NaN
const badDate = new Date('invalid')
badDate instanceof Date   // true ← 還是 Date 物件
badDate.getTime()         // NaN ← 但時間值無效
```

### ② 格式化日期範例

```js
const formatDate = (date) => {
  if (!date) return '--'
  
  const dateObj = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(dateObj.getTime())) return '--'  // 用 Number.isNaN() 更嚴格
  
  return dateObj.toLocaleDateString('zh-TW')
}

formatDate(new Date())           // "2026/9/23"
formatDate('2026-09-23')         // "2026/9/23"
formatDate('invalid-date')       // "--"
```

### ③ 檢查用戶輸入是否能當數字

```js
const userValue = document.getElementById('input').value
if (isNaN(userValue)) {
  console.log('輸入不像數字')
} else {
  console.log(`你輸入的數字：${Number(userValue)}`)
}
```

## 字串轉換規則

```js
Number('')                // 0（空字串特例）
Number('   ')             // 0（空白特例）
Number('123')             // 123
Number('123.45')          // 123.45
Number('123abc')          // NaN（不能部分轉換）
Number('0x10')            // 16（16進位）
Number('1e3')             // 1000（科學記號）
Number('hello')           // NaN
Number('NaN')             // NaN（字串 'NaN' 轉成值 NaN）
```

**關鍵：** 一旦轉換失敗，整個結果就是 NaN，不會部分成功。

## 記憶訣竅

| 觀念 | 記住 |
|------|------|
| **NaN 的類型** | `typeof NaN === 'number'`（它是 Number 類型的特殊值） |
| **何時產生** | 轉換、運算失敗時（`Number('hello')`、`Math.sqrt(-1)`、無效日期） |
| **isNaN() 邏輯** | 先轉成數字，再檢查是否為 NaN |
| **Number.isNaN() 邏輯** | 直接檢查是否為真正的 NaN（不轉換） |
| **NaN 的怪癖** | `NaN === NaN` 永遠 false，要用 `isNaN()` 或 `Number.isNaN()` 檢測 |
| **推薦用法** | **`Number.isNaN()` 更明確、避免隱含轉換** |

## 為什麼 NaN === NaN 是 false？

因為 NaN 代表「未定義的結果」。兩個不同的未定義結果邏輯上不相等：

```js
const a = 0 / 0             // 零除零（未定義）
const b = Math.sqrt(-1)     // 虛數（未定義）
a === b                     // false

// 數學上
∞ - ∞ = ?                   // 未定義，不等於某個數字
```

---

**參考資源**
- [MDN: NaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN)
- [MDN: Number.isNaN()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
- [MDN: isNaN()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN)
- [ECMA-262: ToNumber 抽象操作](https://tc39.es/ecma262/#sec-tonumber)
