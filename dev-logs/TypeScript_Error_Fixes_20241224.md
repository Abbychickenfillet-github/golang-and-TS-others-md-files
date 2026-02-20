# TypeScript 錯誤修復學習筆記

日期：2024-12-24

---

## 錯誤一：null 與 undefined 類型不兼容

### 檔案位置
`src/components/Events/TicketsSidebar.tsx:325`

### 錯誤訊息
```
Type 'string | null' is not assignable to type 'string | undefined'.
Type 'null' is not assignable to type 'string | undefined'.
```

### 原因
`eventId` 的類型是 `string | null`，但 TanStack Router 的 `search` 參數期望 `string | undefined`。

在 TypeScript 嚴格模式下，`null` 和 `undefined` 是**完全不同的類型**。

### 修復方式
使用 `??`（Nullish Coalescing Operator，空值合併運算子）將 `null` 轉為 `undefined`：

```tsx
// 修復前
search: { event_id: eventId, order_type_tab: "b2c" },

// 修復後
search: { event_id: eventId ?? undefined, order_type_tab: "b2c" },
```

### 學習重點：`??` vs `||`

| 運算子 | 觸發條件 | 適用場景 |
|--------|----------|----------|
| `??` | 只有 `null` 或 `undefined` | 需要保留 `0`、`""`、`false` 等 falsy 值 |
| `\|\|` | 所有 falsy 值 | 任何 falsy 都要替換時 |

```ts
// ?? 範例
null ?? "default"      // "default"
undefined ?? "default" // "default"
"" ?? "default"        // "" (空字串保留)
0 ?? "default"         // 0 (數字0保留)
false ?? "default"     // false (布林值保留)

// || 範例
null || "default"      // "default"
undefined || "default" // "default"
"" || "default"        // "default" (空字串被覆蓋)
0 || "default"         // "default" (0被覆蓋)
false || "default"     // "default" (false被覆蓋)
```

---

## 錯誤二：聯合類型 (Union Type) 屬性不存在

### 檔案位置
`src/routes/_layout/booths.tsx:823-826`

### 錯誤訊息
```
Property 'position_left' does not exist on type '...'
Property 'position_top' does not exist on type '...'
Property 'scaled_width' does not exist on type '...'
Property 'scaled_height' does not exist on type '...'
```

### 原因
`boothsWithPositions` 根據條件返回**兩種不同結構**的物件：

```ts
// 有底圖時 (useAbsolute: true)
{
  ...booth,
  position_left: number,
  position_top: number,
  scaled_width: number,
  scaled_height: number,
  useAbsolute: true,
}

// 無底圖時 (useAbsolute: false)
{
  ...booth,
  position_x: number,
  position_y: number,
  useAbsolute: false,
}
```

TypeScript 推斷的類型是這兩種的**聯合類型 (Union Type)**。即使程式碼邏輯上 `useAbsolute: true` 時一定有 `position_left`，TypeScript 無法自動推斷。

### 修復方式
使用 `in` 運算子做**類型縮小 (Type Narrowing)**：

```tsx
// 修復前
left={`${booth.position_left}px`}
top={`${booth.position_top}px`}
width={`${booth.scaled_width}px`}
height={`${booth.scaled_height}px`}

// 修復後
left={`${"position_left" in booth ? booth.position_left : 0}px`}
top={`${"position_top" in booth ? booth.position_top : 0}px`}
width={`${"scaled_width" in booth ? booth.scaled_width : 30}px`}
height={`${"scaled_height" in booth ? booth.scaled_height : 30}px`}
```

### 學習重點：Type Narrowing 技巧

| 方法 | 語法 | 適用場景 |
|------|------|----------|
| `in` 運算子 | `"prop" in obj` | 檢查物件是否有某屬性 |
| `typeof` | `typeof x === "string"` | 檢查原始類型 |
| `instanceof` | `x instanceof Date` | 檢查類別實例 |
| 自訂型別守衛 | `function isX(obj): obj is X` | 複雜類型判斷 |

```ts
// in 運算子範例
type Dog = { bark: () => void }
type Cat = { meow: () => void }
type Animal = Dog | Cat

function speak(animal: Animal) {
  if ("bark" in animal) {
    animal.bark()  // TypeScript 知道這裡是 Dog
  } else {
    animal.meow()  // TypeScript 知道這裡是 Cat
  }
}
```

---

## 錯誤三：宣告但未使用的變數

### 檔案位置
`src/routes/_layout/order-electricity.tsx:10-45`

### 錯誤訊息
```
TS6133: 'Card' is declared but its value is never read.
TS6133: 'CardBody' is declared but its value is never read.
TS6133: 'CardHeader' is declared but its value is never read.
TS6133: 'Divider' is declared but its value is never read.
TS6133: 'FiDollarSign' is declared but its value is never read.
TS6133: 'FiLink' is declared but its value is never read.
```

### 原因
import 了元件/圖示但沒有在程式碼中使用。這通常發生在：
- 重構後忘記移除舊 import
- 複製貼上程式碼時帶入不需要的 import

### 修復方式
移除未使用的 import：

```tsx
// 修復前
import {
  Card,        // 未使用
  CardBody,    // 未使用
  CardHeader,  // 未使用
  Divider,     // 未使用
  ...
} from "@chakra-ui/react"

import { FiDollarSign, FiLink, ... } from "react-icons/fi"  // 未使用

// 修復後
import {
  // 移除 Card, CardBody, CardHeader, Divider
  ...
} from "@chakra-ui/react"

import { FiEdit2, FiZap, FiClock, FiTool, FiSettings, FiPlus } from "react-icons/fi"
```

### 學習重點

1. **保持 import 乾淨**：定期檢查並移除未使用的 import
2. **IDE 輔助**：VS Code 會將未使用的 import 顯示為灰色
3. **自動移除**：可使用 ESLint 或 Biome 的自動修復功能

```bash
# Biome 自動修復
npx biome check --apply .

# ESLint 自動修復
npx eslint --fix .
```

---

## 總結

| 錯誤類型 | 關鍵概念 | 解決技巧 |
|----------|----------|----------|
| null vs undefined | TypeScript 嚴格區分兩者 | `?? undefined` 轉換 |
| Union Type 屬性不存在 | 聯合類型需要類型縮小 | `in` 運算子檢查屬性 |
| 未使用的宣告 | 程式碼整潔度 | 移除或使用自動修復工具 |
