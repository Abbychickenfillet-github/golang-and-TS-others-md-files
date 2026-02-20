# TypeScript: import type vs type vs interface

## `import type` 語法

```tsx
// 這行的意思：
import { EventSelector, type EventOption } from "./EventSelector"

// 等同於：
import { EventSelector } from "./EventSelector"      // 匯入元件（運行時需要）
import type { EventOption } from "./EventSelector"   // 匯入型別（編譯後移除）
```

### import vs import type 差異

| | `import` | `import type` |
|--|----------|---------------|
| 用途 | 匯入值（函數、變數、元件） | 只匯入型別定義 |
| 編譯後 | 保留在 JavaScript 中 | 完全移除 |
| 打包大小 | 會增加 | 不影響 |

---

## `type` vs `interface` 定義型別

兩種定義型別的方式，功能幾乎相同：

```tsx
// 使用 type
type EventOption = {
  id: string
  name: string
}

// 使用 interface
interface EventOption {
  id: string
  name: string
}
```

### 主要差異

#### 1. interface 可以擴展（extends）和合併宣告

```tsx
interface Animal {
  name: string
}

interface Dog extends Animal {
  bark(): void
}

// 合併宣告（同名 interface 會自動合併）
interface User {
  name: string
}
interface User {
  age: number
}
// 結果：User 同時有 name 和 age
```

#### 2. type 可以定義聯合型別、交叉型別

```tsx
// 聯合型別（Union）
type Status = "pending" | "active" | "done"

// 交叉型別（Intersection）
type Employee = Person & { employeeId: string }

// 條件型別
type Result<T> = T extends string ? StringResult : OtherResult
```

### 何時用哪個？

| 情境 | 建議 |
|------|------|
| 物件結構定義 | `interface`（可擴展） |
| 聯合型別 | `type`（唯一選擇） |
| React Props | 都可以，專案統一即可 |
| API Response | `interface`（可能需要擴展） |

---

## 實際範例

```tsx
// EventSelector.tsx
export interface EventOption {  // 用 interface 定義
  id: string
  name: string
}

export function EventSelector({ events }: { events: EventOption[] }) {
  // ...
}

// 其他檔案使用
import { EventSelector, type EventOption } from "./EventSelector"
//       ↑ 元件（運行時需要）  ↑ 型別（編譯後移除）
```
