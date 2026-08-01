---
title: JavaScript 字串方法筆記
type: topic-note
tags: [javascript, string, method, property, autoboxing, unicode]
updated: 2026-07-26
---

# JavaScript 字串方法筆記

## `.length` 是屬性(property)，不是方法(method)

```js
const str1 = "HelloWorld";
console.log(str1.length); // 10
```

**`length` 是屬性，不是方法**——判斷依據很單純：**要不要加括號 `()`**。
- 屬性：`str1.length`（沒有括號，直接讀值）
- 方法：`str1.toUpperCase()`（有括號，代表這是一個要「呼叫」的函式）

`length` 讀取的當下不是在「執行一段邏輯」，只是單純把「這個字串有幾個字元」這個數字讀出來，所以是屬性，不是方法。

### 為什麼原始值（primitive）字串也能「戴上」`.length`？—— Autoboxing

`"HelloWorld"` 本身是一個**原始值（primitive）**，理論上原始值不像物件一樣能掛屬性/方法。但 JS 引擎在你寫 `str1.length` 或呼叫 `str1.toUpperCase()` 的瞬間，會**暫時**把這個原始字串包成一個 `String` 包裝物件（跟 `new String("HelloWorld")` 產生的東西類似），這個臨時物件的 prototype 鏈上就有 `String.prototype.length` 這個屬性可以讀，讀完/呼叫完立刻把這個臨時包裝物件丟棄，`str1` 本身還是原始值不會被動到。這個「臨時包一層物件讓你能存取屬性/方法，用完就丟」的機制叫 **autoboxing（自動裝箱）**——不是「每個字串真的隨身戴著 `.length`」，而是每次存取時**現包現丟**。

## String.fromCharCode()

### 用途
將 **Unicode 碼點（數字）** 轉換為對應的 **字元**。

### 語法
```javascript
String.fromCharCode(num1, num2, ...)
```

### ASCII 碼對照表（常用）

| 碼點 | 字元 | 說明 |
|------|------|------|
| 65 | A | 大寫字母起始 |
| 66 | B | |
| 67 | C | |
| ... | ... | |
| 90 | Z | 大寫字母結束 |
| 97 | a | 小寫字母起始 |
| 98 | b | |
| ... | ... | |
| 122 | z | 小寫字母結束 |
| 48 | 0 | 數字起始 |
| 57 | 9 | 數字結束 |

### 實際案例

#### 產生區域名稱（A區、B區、C區...）
```typescript
// 來自 EventsCreateBoothSettingsPage.tsx
const handleAddArea = () => {
  // customAreas.length = 0 → 65 + 0 = 65 → 'A'
  // customAreas.length = 1 → 65 + 1 = 66 → 'B'
  // customAreas.length = 2 → 65 + 2 = 67 → 'C'
  const nextChar = String.fromCharCode(65 + customAreas.length)

  const newArea = {
    name: `${nextChar}區`,  // "A區", "B區", "C區"...
    // ...
  }
}
```

#### 執行過程
```
第 1 個區域：65 + 0 = 65 → String.fromCharCode(65) → "A" → "A區"
第 2 個區域：65 + 1 = 66 → String.fromCharCode(66) → "B" → "B區"
第 3 個區域：65 + 2 = 67 → String.fromCharCode(67) → "C" → "C區"
...
第 26 個區域：65 + 25 = 90 → String.fromCharCode(90) → "Z" → "Z區"
```

### 其他範例

```javascript
// 單個字元
String.fromCharCode(65)      // "A"
String.fromCharCode(97)      // "a"
String.fromCharCode(48)      // "0"

// 多個字元
String.fromCharCode(72, 105) // "Hi"

// 產生 A-Z 陣列
const letters = []
for (let i = 0; i < 26; i++) {
  letters.push(String.fromCharCode(65 + i))
}
// ['A', 'B', 'C', ..., 'Z']
```

### 反向操作：charCodeAt()

將字元轉換回碼點：
```javascript
'A'.charCodeAt(0)  // 65
'a'.charCodeAt(0)  // 97
'Z'.charCodeAt(0)  // 90
```

---

## 相關方法

| 方法 | 說明 | 範例 |
|------|------|------|
| `String.fromCharCode(n)` | 碼點 → 字元 | `String.fromCharCode(65)` → `"A"` |
| `str.charCodeAt(index)` | 字元 → 碼點 | `"A".charCodeAt(0)` → `65` |
| `String.fromCodePoint(n)` | 支援更大的 Unicode 範圍 | `String.fromCodePoint(128512)` → `"😀"` |
| `str.codePointAt(index)` | 取得完整 Unicode 碼點 | `"😀".codePointAt(0)` → `128512` |
