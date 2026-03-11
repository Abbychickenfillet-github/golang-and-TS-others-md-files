# TanStack Router 導航機制筆記

## 三個核心 API 的角色

### 1. `createFileRoute` — 定義路由

每個頁面檔案用 `createFileRoute` 宣告自己的路徑和 search params schema。

```tsx
// src/routes/_layout/booths.tsx
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

const boothSearchSchema = z.object({
  event_id: z.string().optional().catch(""),
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/booths" as any)({
  component: BoothManagement,
  validateSearch: (search) => boothSearchSchema.parse(search),
})
```

**重點：**
- `validateSearch` 用 zod parse URL 上的 query string，確保型別安全
- schema 裡的 `.catch()` 是預設值，URL 上沒帶就用它
- `as any` 是因為 TanStack Router 的 codegen 有時型別對不上

---

### 2. `useNavigate` — 程式導航（跳頁）

```tsx
import { useNavigate } from "@tanstack/react-router"

const navigate = useNavigate({ from: Route.fullPath })

// 跳到另一頁，帶 search params
navigate({
  to: "/companies",
  search: { page: 1, search: "某公司名" },
})

// 同頁更新 search params（例如切換篩選）
navigate({
  search: (prev) => ({
    ...prev,
    page: 2,
  }),
})
```

**重點：**
- `to` 指定目標路徑
- `search` 可以是物件（覆蓋）或函數（基於前一個 search 修改）
- `params` 用於動態路由：`to: "/orders/$orderId"`, `params: { orderId: "abc" }`
- 如果目標路由的 search schema 跟來源不同，可能需要 `as any` 繞型別

---

### 3. `useRouterState` — 讀取當前路由狀態

```tsx
import { useRouterState } from "@tanstack/react-router"

const routerState = useRouterState() as any  // TanStack Router 型別太深，需要 as any
const pathname = routerState.location.pathname   // "/booths"
const search = routerState.location.search       // { event_id: "abc", page: 1 }
```

**重點：**
- 是 reactive 的，路由變化會觸發 re-render
- `location.pathname` 是路徑，`location.search` 是已 parse 過的 query params 物件
- TanStack Router 的 generic 型別非常深，直接用會報 `TS2589: Type instantiation is excessively deep`，用 `as any` 解決

---

## 三者如何搭配做 Breadcrumb

```
createFileRoute     useRouterState      useNavigate
    |                    |                   |
    v                    v                   v
定義每頁的           監聽路由變化          breadcrumb 點擊
search schema        記錄到 sessionStorage  帶著 search params 跳回去
```

### 流程

1. **`createFileRoute`** 定義每頁接受什麼 search params（zod schema）
2. **`useRouterState`** 在 layout 層監聽路由變化，把 `{ path, search, label }` 存進 `sessionStorage`
3. **`NavigationBreadcrumb`** 讀取歷史紀錄，渲染每一層
4. 使用者點擊 breadcrumb 時，**`<Link>` 元件**帶著存好的 search params 跳回去

### 為什麼用 sessionStorage 而不是 useState？

| 方案 | 跳頁後還在嗎 | 重整後還在嗎 | 開新分頁獨立嗎 |
|------|-------------|-------------|--------------|
| `useState` | 不在（元件 unmount 就沒了）| 不在 | 是 |
| `sessionStorage` | 在 | 在 | 是（每個 tab 獨立）|
| `localStorage` | 在 | 在 | 否（共享）|
| zustand（記憶體）| 在 | 不在 | 是 |

**sessionStorage 是最適合的**：跨頁保留、重整不丟、每個分頁獨立。

---

## 讀取頁面 search params 的方式

```tsx
// 方法 1：用 Route.useSearch()（推薦，型別安全）
const { event_id, page } = Route.useSearch()

// 方法 2：用 useRouterState()（通用，但需要 as any）
const routerState = useRouterState() as any
const search = routerState.location.search
```

---

## Link 元件 vs useNavigate

```tsx
// Link 元件（宣告式，用於 JSX）
import { Link } from "@tanstack/react-router"

<Link to="/orders/$orderId" params={{ orderId: "abc" }} search={{ edit: true }}>
  查看訂單
</Link>

// useNavigate（命令式，用於事件處理）
const navigate = useNavigate()

const handleClick = () => {
  navigate({
    to: "/orders/$orderId",
    params: { orderId: "abc" },
    search: { edit: true },
  })
}
```

---

## 常見問題

### Q: search params 的型別報錯怎麼辦？
跨路由導航時，目標路由的 search schema 跟來源不同，TypeScript 會抱怨。用 `as any`：

```tsx
navigate({
  to: "/companies" as string,
  search: { page: 1, search: "test" },
} as any)
```

### Q: `TS2589: Type instantiation is excessively deep`？
TanStack Router 的 generic 推導太深。對 `useRouterState()` 的回傳值加 `as any`。

### Q: AccordionButton 裡的按鈕點擊會觸發 accordion？
用 `e.stopPropagation()` 阻止事件冒泡：

```tsx
<Text
  cursor="pointer"
  onClick={(e) => {
    e.stopPropagation()  // 不觸發 accordion
    navigate({ to: "/companies" as string, search: { ... } } as any)
  }}
>
  品牌商名稱
</Text>
```
