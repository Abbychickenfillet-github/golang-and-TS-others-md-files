# 時間工具函數說明 (frontend/src/utils/date.ts)

## 目錄
- [設計原則](#設計原則)
- [formatTaiwanTime 函數逐行解析](#formattaiwantime-函數逐行解析)
- [Intl.DateTimeFormat 是什麼？](#intldatetimeformat-是什麼)
- [常見問題 FAQ](#常見問題-faq)
- [使用範例](#使用範例)

---

## 設計原則

```
[使用者輸入] → [存入 DB: UTC+0] → [顯示: 轉成當地時間]
     ↑                                    ↓
  台北 10:00                          台北 10:00
     ↓                                    ↑
  存成 02:00 UTC                    讀取 02:00 UTC + 8小時
```

- **資料庫**：統一存 UTC（世界協調時間，+0 時區）
- **顯示**：根據活動的 `timezone` 欄位轉換（預設 `Asia/Taipei`）
- **好處**：不管用戶在哪個時區，資料庫的時間都是一致的

---

## formatTaiwanTime 函數逐行解析

### 第 1-9 行：預設格式設定

```typescript
const DEFAULT_TAIWAN_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",      // 年份顯示完整數字，如 "2025"
  month: "2-digit",     // 月份固定 2 位數，如 "01", "12"
  day: "2-digit",       // 日期固定 2 位數，如 "05", "26"
  hour: "2-digit",      // 小時固定 2 位數，如 "09", "23"
  minute: "2-digit",    // 分鐘固定 2 位數，如 "05", "30"
  second: "2-digit",    // 秒數固定 2 位數，如 "00", "59"
  hour12: false,        // 使用 24 小時制（不是 AM/PM）
}
```

**這只是「格式」設定，還沒有轉換時間！**
就像告訴系統：「等一下要顯示時間時，用這個格式」

### 第 24-28 行：函數定義與參數

```typescript
export function formatTaiwanTime(
  value: string | number | Date | null | undefined,  // 參數 1：要轉換的時間
  options?: Intl.DateTimeFormatOptions,              // 參數 2：額外格式選項（可選）
  timezone: string = "Asia/Taipei",                  // 參數 3：目標時區（預設台北）
): string {                                          // 回傳值：格式化後的字串
```

#### 參數 1: `value` - 允許的輸入值

| 型別 | 範例 | 說明 |
|------|------|------|
| `string` | `"2025-12-26T02:00:00Z"` | ISO 8601 格式字串 |
| `string` | `"2025-12-26T02:00:00"` | 無時區標記，會被當 UTC |
| `number` | `1735182000000` | Unix timestamp（毫秒） |
| `Date` | `new Date()` | JavaScript Date 物件 |
| `null` | `null` | 空值，回傳 "—" |
| `undefined` | `undefined` | 未定義，回傳 "—" |

#### 參數 2: `options` - 覆蓋預設格式（可選）

```typescript
// 範例：只顯示月/日
formatTaiwanTime(date, { month: "2-digit", day: "2-digit" })
// 輸出："12/26"

// 範例：顯示星期
formatTaiwanTime(date, { weekday: "long" })
// 輸出："星期四"
```

#### 參數 3: `timezone` - 目標時區

| 值 | 說明 |
|----|------|
| `"Asia/Taipei"` | 台北時間 UTC+8（預設） |
| `"America/New_York"` | 紐約時間 |
| `"Europe/London"` | 倫敦時間 |
| `"UTC"` | UTC+0 |

**不是只有 Asia/Taipei 可以用！** 只是預設值是台北。

### 第 29-31 行：空值檢查

```typescript
if (!value) {
  return "—"  // 如果 value 是 null/undefined/空字串，回傳破折號
}
```

**為什麼用 "—" 不用 "-"？**
`—` 是 em dash（長破折號），視覺上更明顯表示「無資料」。

### 第 33-44 行：轉換成 Date 物件

```typescript
let date: Date  // 宣告變數，型別是 Date，但還沒賦值
```

**Q: 為什麼用 `let` 不用 `const`？**
因為 `date` 的值會根據不同條件被賦予不同的值（第 35, 41, 43 行），`const` 不能重新賦值。

**Q: 為什麼用 `let date: Date` 不用 `let date = ...`？**
這是 TypeScript 的「先宣告型別，後賦值」寫法。等同於：
```typescript
let date;           // JavaScript 寫法
let date: Date;     // TypeScript 寫法，明確告訴編譯器這是 Date 型別
```

```typescript
if (value instanceof Date) {
  // 如果已經是 Date 物件，直接用
  date = value
} else if (typeof value === "string") {
  // 如果是字串，需要判斷是否有時區資訊
  const hasTimezone = value.includes("Z") || /[+-]\d{2}:\d{2}$/.test(value)
  //                  ^^^^^^^^^^^^^^^^       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                  檢查是否有 "Z"          檢查是否有 "+08:00" 或 "-05:00"

  const normalizedValue = hasTimezone ? value : `${value}Z`
  //                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                      如果沒有時區標記，加上 "Z"（表示 UTC）

  date = new Date(normalizedValue)
} else {
  // 如果是數字（timestamp），直接轉換
  date = new Date(value)
}
```

#### 正規表達式解析：`/[+-]\d{2}:\d{2}$/`

| 符號 | 意思 |
|------|------|
| `[+-]` | 匹配 `+` 或 `-` |
| `\d{2}` | 匹配 2 個數字 |
| `:` | 匹配冒號 |
| `$` | 字串結尾 |

匹配範例：`+08:00`, `-05:00`, `+00:00`

### 第 46-48 行：無效日期檢查

```typescript
if (Number.isNaN(date.getTime())) {
  return "—"
}
```

**Q: 為什麼用 `Number.isNaN` 不用 `isNaN`？**
- `isNaN("hello")` → `true`（會先轉型）
- `Number.isNaN("hello")` → `false`（更嚴格，只檢查 NaN）

`date.getTime()` 回傳 timestamp，如果日期無效會回傳 `NaN`。

### 第 50-56 行：格式化並輸出

```typescript
const formatter = new Intl.DateTimeFormat("zh-TW", {
  ...DEFAULT_TAIWAN_FORMAT,  // 展開預設格式
  ...options,                // 展開自訂格式（會覆蓋預設）
  timeZone: timezone,        // 設定時區（這裡才真正轉換時間！）
})

return formatter.format(date)  // 執行格式化，回傳字串
```

**重點：`timeZone: timezone` 這行才是真正的時區轉換！**

---

## Intl.DateTimeFormat 是什麼？

### Intl = International（國際化）

`Intl` 是 JavaScript 內建的「國際化 API」，專門處理：
- 日期時間格式（`Intl.DateTimeFormat`）
- 數字格式（`Intl.NumberFormat`）→ 如千分位、貨幣
- 排序（`Intl.Collator`）→ 如中文筆畫排序

### Intl.DateTimeFormat

用來根據「語言」和「時區」格式化日期時間。

```typescript
// 語法
new Intl.DateTimeFormat(語言代碼, 格式選項)

// 範例
new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei" })
//                      ^^^^^^
//                      zh = 中文, TW = 台灣
//                      影響：月份名稱、星期名稱、數字格式等
```

### 語言代碼範例

| 代碼 | 語言 | 日期顯示範例 |
|------|------|-------------|
| `zh-TW` | 繁體中文（台灣） | 2025/12/26 |
| `zh-CN` | 簡體中文（中國） | 2025/12/26 |
| `en-US` | 英文（美國） | 12/26/2025 |
| `ja-JP` | 日文（日本） | 2025/12/26 |

### DateTimeFormatOptions 完整選項

```typescript
interface Intl.DateTimeFormatOptions {
  // 日期部分
  year?: "numeric" | "2-digit"           // 2025 vs 25
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow"
         // 1 vs 01 vs 十二月 vs 12月 vs 12
  day?: "numeric" | "2-digit"            // 5 vs 05
  weekday?: "long" | "short" | "narrow"  // 星期四 vs 週四 vs 四

  // 時間部分
  hour?: "numeric" | "2-digit"
  minute?: "numeric" | "2-digit"
  second?: "numeric" | "2-digit"
  hour12?: boolean                       // true = AM/PM, false = 24小時制

  // 時區
  timeZone?: string                      // "Asia/Taipei", "UTC", etc.
  timeZoneName?: "long" | "short"        // 台北標準時間 vs GMT+8
}
```

---

## 常見問題 FAQ

### Q1: 為什麼資料庫要存 UTC？

**情境**：一個活動在台北時間 2025/12/26 10:00 開始

| 存法 | 資料庫值 | 問題 |
|------|----------|------|
| 存本地時間 | `2025-12-26T10:00:00` | 不知道是哪個時區的 10:00 |
| 存 UTC | `2025-12-26T02:00:00Z` | 明確是 UTC，顯示時再轉換 |

### Q2: "Z" 是什麼意思？

`Z` 代表 "Zulu time"，是 UTC 的軍事代碼，等同於 `+00:00`。

```
2025-12-26T02:00:00Z     = UTC 時間 02:00
2025-12-26T10:00:00+08:00 = 台北時間 10:00（等同上面）
```

### Q3: 這個函數可以用在前台 official_website 嗎？

可以，但目前沒有引入。如果需要，可以：
1. 複製函數到 official_website
2. 或者抽出成共用套件

### Q4: `instanceof` vs `typeof` 差別？

```typescript
typeof "hello"           // "string"
typeof 123               // "number"
typeof new Date()        // "object" ← 注意！不是 "date"

new Date() instanceof Date  // true ← 用這個判斷 Date
```

### Q5: 為什麼要用 `...` 展開運算子？

```typescript
const defaults = { a: 1, b: 2 }
const custom = { b: 3, c: 4 }

const result = { ...defaults, ...custom }
// result = { a: 1, b: 3, c: 4 }
// 後面的會覆蓋前面的
```

### Q6: `?:` 三元運算子怎麼讀？

```typescript
const result = condition ? valueIfTrue : valueIfFalse
//             ^^^^^^^^^   ^^^^^^^^^^^   ^^^^^^^^^^^^
//             條件         條件成立時     條件不成立時

// 範例
const hasTimezone = true
const normalizedValue = hasTimezone ? value : `${value}Z`
//                      讀作：如果 hasTimezone 是 true，用 value；否則用 value + "Z"
```

---

## 使用範例

```typescript
import { formatTaiwanTime } from "@/utils/date"

// 基本用法
formatTaiwanTime("2025-12-26T02:00:00Z")
// 輸出："2025/12/26 10:00:00"

// 空值
formatTaiwanTime(null)
// 輸出："—"

// 自訂格式：只顯示日期
formatTaiwanTime("2025-12-26T02:00:00Z", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
})
// 輸出："2025/12/26"

// 不同時區
formatTaiwanTime("2025-12-26T02:00:00Z", {}, "America/New_York")
// 輸出："2025/12/25 21:00:00"（紐約比台北慢 13 小時）

// 從 Date 物件
formatTaiwanTime(new Date())
// 輸出：當前台北時間

// 從 timestamp
formatTaiwanTime(1735182000000)
// 輸出：對應的台北時間
```

---

## 相關函數對照表

| 函數 | 位置 | 用途 | 方向 |
|------|------|------|------|
| `formatTaiwanTime` | 後台 `utils/date.ts` | 顯示時間 | UTC → 本地 |
| `toLocalDatetimeValue` | 後台 `events.tsx` | 表單編輯 | UTC → 本地 |
| `getTaipeiInputString` | 前台 `basic/page.tsx` | 表單編輯 | UTC → 本地 |
| `convertToTimezoneISO` | 前台 `basic/page.tsx` | 儲存時間 | 本地 → UTC |
