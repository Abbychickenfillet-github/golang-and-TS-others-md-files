# JavaScript 日期比較語法說明

## `new Date("2026-02-10T17:00:00Z") <= new Date()`

### 拆解

| 部分 | 意思 |
|---|---|
| `new Date("2026-02-10T17:00:00Z")` | 建立一個日期物件，代表 2026-02-10 17:00 UTC |
| `new Date()` | 建立一個日期物件，代表「現在」 |
| `<=` | 小於或等於（less than or equal to） |

### `<=` 箭頭是什麼意思？

`<=` 是**比較運算子（comparison operator）**，不是箭頭：

| 運算子 | 意思 | 範例 |
|---|---|---|
| `<` | 小於 | `3 < 5` → `true` |
| `<=` | 小於或等於 | `5 <= 5` → `true` |
| `>` | 大於 | `5 > 3` → `true` |
| `>=` | 大於或等於 | `5 >= 5` → `true` |
| `===` | 嚴格等於 | `5 === 5` → `true` |
| `!==` | 嚴格不等於 | `5 !== 3` → `true` |

### 用在日期上

當兩個 `Date` 物件用 `<=` 比較時，JavaScript 會自動把它們轉成**毫秒數（timestamp）**再比大小：

```js
new Date("2026-02-10T17:00:00Z") <= new Date()
// 等同於
1770861600000 <= 1772870400000  // (舉例的毫秒數)
// → true（報名時間已經過了）
```

### 實際用途

```js
// 判斷報名是否已開始
const registrationStarted = new Date(formData.registration_start_time) <= new Date()
```

- `true` → 報名開始時間已經過了（或就是現在）→ 鎖住 switch
- `false` → 報名還沒開始 → switch 可以自由切換

### 完整判斷條件

```tsx
disabled={
  isEditMode &&                                          // 1. 是編輯模式
  !!formData.registration_start_time &&                  // 2. 有設定報名開始時間
  new Date(formData.registration_start_time) <= new Date() // 3. 報名時間已過
}
```

三個條件都要 `true` 才會 disable：
1. `isEditMode` — 新建模式不鎖（還沒有活動）
2. `!!formData.registration_start_time` — 沒設報名時間就不鎖（沒有依據）
3. `new Date(...) <= new Date()` — 報名還沒開始就不鎖（還可以改）
