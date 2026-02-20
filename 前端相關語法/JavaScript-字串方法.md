# JavaScript 字串方法筆記

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
