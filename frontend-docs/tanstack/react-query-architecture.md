# React Query 架構與層級

## 目錄

1. [import 語法：從套件中取出工具](#1-import-語法從套件中取出工具)
2. [new QueryClient()：建立實例](#2-new-queryclient建立實例)
3. [QueryClientProvider：讓整個 App 共用](#3-queryclientprovider讓整個-app-共用)
4. [main.tsx vs App.tsx 的分工](#4-maintsx-vs-apptsx-的分工)
5. [Providers 拆分模式](#5-providers-拆分模式)
6. [完整層級圖](#6-完整層級圖)

---

## 1. import 語法：從套件中取出工具

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
```

### 這行在做什麼？

`@tanstack/react-query` 這個套件**匯出很多東西**（QueryClient、useQuery、useMutation…），大括號 `{}` 是 **named import**（具名匯入），意思是「從這個套件裡，只取出我需要的」。

```tsx
// 類比：一個工具箱裡有很多工具
import { 螺絲起子, 扳手 } from '工具箱'

// 你不需要搬整個工具箱，只拿你要的
```

### Named Import vs Default Import

```tsx
// Named Import — 套件匯出多個東西，用 {} 指定要哪些
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

// Default Import — 套件匯出一個主要的東西，不用 {}
import App from './App'
import React from 'react'
```

差別在於套件怎麼寫 `export`：

```tsx
// 套件內部用 export（named）
export class QueryClient { ... }
export function useQuery() { ... }

// 套件內部用 export default（default）
export default function App() { ... }
```

---

## 2. new QueryClient()：建立實例

```tsx
const queryClient = new QueryClient()
```

### 這行在做什麼？

`QueryClient` 是一個 **class（類別）**，`new` 是建立它的**實例（instance）**。

```tsx
// 類比：
// QueryClient = 汽車的設計圖（class）
// new QueryClient() = 根據設計圖造出一台真的車（instance）
// queryClient = 你給這台車取的名字（變數）
```

### 為什麼需要建立實例？

`QueryClient` 是 React Query 的**核心管理員**，它負責：

- 管理所有查詢的快取（cache）
- 追蹤哪些資料過期了（stale）
- 控制重新取得（refetch）的策略
- 處理 mutation 的佇列

你需要一個「活的」管理員物件，不是一張設計圖。

### 可以帶設定

```tsx
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,        // 資料 1 分鐘內不算過期
            refetchOnWindowFocus: false,  // 切回視窗不自動重新取得
        },
    },
})
```

---

## 3. QueryClientProvider：讓整個 App 共用

```tsx
<QueryClientProvider client={queryClient}>
    <App />
</QueryClientProvider>
```

### 為什麼需要 Provider？

React 的元件是**樹狀結構**，子元件沒辦法直接存取父元件的變數。Provider 利用 React 的 **Context** 機制，把 `queryClient` 放到一個「全域廣播頻道」上，讓所有被包住的子元件都能用 `useQuery`、`useMutation` 等 hook。

```
沒有 Provider：
  App → 頁面 A → useQuery() ❌ 找不到 queryClient

有 Provider：
  QueryClientProvider(queryClient)
    └── App → 頁面 A → useQuery() ✅ 從 Context 拿到 queryClient
```

### 如果不包 Provider 會怎樣？

```
Error: No QueryClient set, use QueryClientProvider to set one
```

任何用了 `useQuery` 的元件都會報錯。

---

## 4. main.tsx vs App.tsx 的分工

### main.tsx — 啟動與基礎設施

**職責**：把 React 掛載到 DOM 上，設定所有「基礎設施」。

```tsx
// main.tsx 做的事
ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>         {/* 路由基礎設施 */}
        <Providers>         {/* 狀態管理基礎設施（含 QueryClient） */}
            <App />         {/* 實際的應用內容 */}
        </Providers>
    </BrowserRouter>
)
```

main.tsx 負責的東西：
- `ReactDOM.createRoot()` — 掛載到 HTML 的 `<div id="root">`
- 路由（BrowserRouter）
- 全域 Provider（QueryClient、Auth、i18n…）
- 全域設定（OpenAPI client、Google Analytics）
- 全域 UI（Toast、ScrollToTop）

### App.tsx — 路由與頁面

**職責**：定義「什麼網址顯示什麼頁面」。

```tsx
// App.tsx 做的事
export default function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Routes>
        </Suspense>
    )
}
```

App.tsx 負責的東西：
- 路由表（哪個 URL 對應哪個頁面）
- Lazy loading（懶載入頁面元件）
- 頁面層級的 guard（ProtectedRoute）

### 類比

```
main.tsx = 大樓的地基、水電、電梯
App.tsx  = 大樓裡每一層樓的房間配置

地基不會管哪個房間住誰，但沒有地基整棟都站不起來。
```

### 為什麼要分開？

| 如果全寫在 main.tsx | 分開寫 |
|---------------------|--------|
| 檔案上千行，難維護 | 各司其職，容易找 |
| 改路由要翻過一堆設定 | 改路由只看 App.tsx |
| 改 Provider 要翻過所有路由 | 改 Provider 只看 providers.tsx |

---

## 5. Providers 拆分模式

### 初學者寫法：全部塞在 main.tsx

```tsx
// main.tsx — 什麼都在這裡
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <LanguageProvider>
                <App />
            </LanguageProvider>
        </AuthProvider>
    </QueryClientProvider>
)
```

問題：Provider 越加越多，main.tsx 會變得很肥。

### 常見做法：拆到 providers.tsx

```tsx
// providers.tsx — 集中管理所有 Provider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider>
                <AuthProvider>
                    <LocationProvider>
                        {children}
                    </LocationProvider>
                </AuthProvider>
            </LanguageProvider>
        </QueryClientProvider>
    )
}
```

```tsx
// main.tsx — 乾淨
ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <Providers>
            <App />
        </Providers>
    </BrowserRouter>
)
```

### 為什麼用 useState 包 QueryClient？

```tsx
// ❌ 這樣寫：每次 Providers 重新 render，都會建立新的 QueryClient，快取全部消失
const queryClient = new QueryClient()

// ✅ 這樣寫：useState 的初始化函式只在第一次 render 執行，之後都用同一個實例
const [queryClient] = useState(() => new QueryClient())
```

`useState(() => ...)` 確保 QueryClient 只建立一次，不會因為 re-render 而被重建。

---

## 6. 完整層級圖

```
index.html
└── <div id="root">               ← ReactDOM.createRoot() 掛載點

main.tsx（啟動 + 基礎設施）
├── OpenAPI.BASE 設定              ← API client 基礎設定
├── initializeAnalytics()          ← GA4
├── ReactDOM.createRoot().render()
│   └── <BrowserRouter>            ← 路由引擎
│       ├── <ScrollToTop />        ← 全域 UI 元件
│       ├── <AnalyticsTracker />
│       └── <Providers>            ← providers.tsx
│           │
│           ├── QueryClientProvider     ← React Query 快取管理
│           │   └── LanguageProvider    ← i18n
│           │       └── AuthProvider    ← 登入狀態
│           │           └── LocationProvider  ← 地理位置
│           │               │
│           │               └── <App />          ← App.tsx
│           │                   └── <Suspense>
│           │                       └── <Routes>
│           │                           ├── / → HomePage
│           │                           ├── /events → EventsPage
│           │                           └── /profile → ProtectedRoute → ProfilePage
│           │
│           ├── <MobileBottomNav />
│           └── <ScrollToTopButton />
│
└── <Toaster />                    ← Toast 通知（在 Providers 外面，不需要 Context）
```

### Provider 的巢狀順序有影響嗎？

**有**。內層的 Provider 可以存取外層的 Context，但反過來不行：

```tsx
<QueryClientProvider>        ← 最外層：所有人都能用 useQuery
    <LanguageProvider>       ← 可以用 useQuery（在 QueryClient 內層）
        <AuthProvider>       ← 可以用 useQuery + useLanguage
            <App />          ← 可以用全部
        </AuthProvider>
    </LanguageProvider>
</QueryClientProvider>
```

所以 `QueryClientProvider` 通常放**最外層**，因為 Auth、Language 等 Provider 內部可能也需要呼叫 API（用 useQuery）。

---

## 速查表

| 概念 | 是什麼 | 在哪裡 |
|------|--------|--------|
| `QueryClient` | class（設計圖） | `@tanstack/react-query` 套件 |
| `new QueryClient()` | instance（實例） | `providers.tsx` 建立 |
| `QueryClientProvider` | React Context Provider | `providers.tsx` 包住 App |
| `useQuery` / `useMutation` | Hook（使用快取的介面） | 各頁面 / 元件內 |
| `main.tsx` | 啟動 + 基礎設施 | 進入點 |
| `App.tsx` | 路由表 | 頁面配置 |
| `providers.tsx` | 集中管理 Provider | 介於 main 和 App 之間 |
