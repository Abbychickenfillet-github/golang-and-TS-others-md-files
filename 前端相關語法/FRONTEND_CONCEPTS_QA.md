# 前端與程式語言概念 Q&A

> 整理自開發過程中的技術問答

---

## 目錄

1. [為什麼不需要 .d.ts 檔案？](#1-為什麼不需要-dts-檔案)
2. [為什麼靜態語言比動態語言快？](#2-為什麼靜態語言比動態語言快)
3. [編譯是什麼？](#3-編譯是什麼)
4. [高併發服務是什麼？](#4-高併發服務是什麼)
5. [編譯 vs 轉譯差異](#5-編譯-vs-轉譯差異)
6. [React 檔案副檔名](#6-react-檔案副檔名)
7. [純 React (Vite) vs Next.js 比較](#7-純-react-vite-vs-nextjs-比較)
8. [Next.js 不用 createRoot 的原因](#8-nextjs-不用-createroot-的原因)

---

## 1. 為什麼不需要 .d.ts 檔案？

### 專案設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "noEmit": true  // TypeScript 只做型別檢查，不產生輸出檔案
  }
}
```

### `noEmit: true` 的意思

- TypeScript 只做型別檢查，不產生輸出檔案
- 實際編譯由 Vite/esbuild 處理（更快）

### 型別定義方式（正確的）

```typescript
// 直接在 .ts/.tsx 檔案中定義
interface BoothPublic {
  id: string
  name: string
  // ...
}

type EventOption = {
  id: string
  name: string
}
```

### `.d.ts` 檔案的使用場景

| 情境 | 需要 .d.ts | 原因 |
|-----|-----------|------|
| 應用程式開發 | ❌ 不需要 | 型別在 `.ts` 中定義，編譯時直接讀取 |
| 發布 npm 套件 | ✅ 需要 | 使用者只拿到 `.js`，需要 `.d.ts` 提供型別 |
| 用 JS 寫的舊套件 | ✅ 需要 | 原始碼沒有型別資訊 |

### Vite 的雙重角色

```
開發環境 (npm run dev):
  .tsx/.ts → esbuild (超快轉譯) → 瀏覽器直接執行

  ✗ 不做型別檢查（所以快）
  ✓ 只做語法轉換 TypeScript → JavaScript

生產環境 (npm run build):
  .tsx/.ts → tsc --noEmit (型別檢查) + Rollup + esbuild → dist/*.js
```

---

## 2. 為什麼靜態語言比動態語言快？

### 核心原因：編譯時 vs 執行時

```
靜態語言 (Go, Rust, C):
  編譯時（一次性）           執行時（每次執行）
  ┌─────────────┐           ┌─────────────┐
  │ 型別檢查    │           │             │
  │ 記憶體配置  │     →     │ 直接執行    │
  │ 最佳化     │           │ 機器碼      │
  └─────────────┘           └─────────────┘
       慢                        超快

動態語言 (JavaScript, Python):
  執行時（每次都要做）
  ┌─────────────────────────────────────────┐
  │ 這個變數是什麼型別？ → 查詢             │
  │ 可以做這個運算嗎？   → 檢查             │
  │ 記憶體要多大？       → 動態配置         │
  │ 執行程式碼                              │
  └─────────────────────────────────────────┘
                      慢
```

### 具體例子：加法運算

```go
// Go - 靜態語言
var a int = 5
var b int = 3
c := a + b  // 編譯時就知道是整數加法，直接用 CPU ADD 指令
```

```javascript
// JavaScript - 動態語言
let a = 5
let b = 3
let c = a + b  // 執行時要判斷：
               // 1. a 是什麼型別？ → number
               // 2. b 是什麼型別？ → number
               // 3. 都是 number → 數字加法
               // 4. 如果 a = "5" → 變成字串串接！
```

### 記憶體配置差異

```
靜態語言 (Go):
┌──────────┐
│ int: 8B  │  ← 編譯時就固定大小，連續排列
│ int: 8B  │
│ int: 8B  │
└──────────┘

動態語言 (JavaScript):
┌──────────────────┐
│ 型別標記: 8B     │  ← 每個值都要額外儲存型別資訊
│ 實際值: ???      │  ← 大小不固定
│ 指標: 8B        │  ← 可能指向其他記憶體位置
└──────────────────┘
```

### 效能差異總結

| 項目 | 靜態語言 | 動態語言 |
|-----|---------|---------|
| 型別檢查 | 編譯時（免費） | 執行時（每次） |
| 記憶體大小 | 固定已知 | 動態計算 |
| CPU 指令 | 直接對應 | 需要包裝/解包 |
| 函數呼叫 | 直接跳轉 | 查表找方法 |
| 垃圾回收 | 較少壓力 | 大量小物件 |

### 為什麼還用 JavaScript？

```
開發速度:  JavaScript >>>>>>> Go
執行速度:  Go >>>>>>> JavaScript
靈活性:    JavaScript >>>>>>> Go
```

**適用場景**：
- **Go**：後端 API、高併發服務、系統工具
- **JavaScript**：前端 UI、快速原型、腳本任務

---

## 3. 編譯是什麼？

**一句話解釋**：把人看得懂的程式碼，翻譯成電腦看得懂的機器碼。

```
┌─────────────┐      編譯器       ┌─────────────┐
│  原始碼      │  ──────────→    │  機器碼      │
│  (人類語言)  │   (翻譯員)       │  (CPU 語言)  │
└─────────────┘                  └─────────────┘

  int a = 5;        →           10110101 00000101
  int b = a + 3;    →           00101011 00000011
```

### 程式語言的執行方式

```
1. 編譯型語言 (Go, C, Rust)

  .go 原始碼 → 編譯器 → 執行檔 (.exe) → 直接執行
                 │
            (一次性翻譯)

  優點：執行超快（已經翻譯好了）
  缺點：改程式要重新編譯


2. 直譯型語言 (Python, JavaScript)

  .js 原始碼 → 直譯器 → 邊讀邊執行
                 │
            (逐行翻譯)

  優點：改完馬上執行，開發快
  缺點：每次執行都要重新翻譯
```

### 生活比喻

```
編譯型 = 翻譯書籍
  英文小說 → 翻譯家花 3 個月 → 中文書
  之後任何人拿到中文書，直接看就好

直譯型 = 即時口譯
  外國人講一句 → 口譯員翻一句 → 你聽
  每次聽都需要口譯員在場
```

### 編譯器做的事

```
原始碼: int x = 5 + 3;
         │
         ▼
┌─────────────────┐
│ 1. 詞法分析     │  拆解成 token: [int] [x] [=] [5] [+] [3] [;]
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ 2. 語法分析     │  建立語法樹 (AST)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ 3. 型別檢查     │  確認 5 和 3 都是整數，可以相加
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ 4. 最佳化       │  發現 5+3 可以直接算成 8
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ 5. 產生機器碼    │  MOV EAX, 8  (直接把 8 放進暫存器)
└─────────────────┘
```

---

## 4. 高併發服務是什麼？

**一句話**：同時處理大量請求的能力。

```
低併發：小診所
  病人 → 醫生 → 看完 → 下一位
  一次只能看一個人

高併發：大醫院
  病人 ──→ 醫生A ──→ 完成
  病人 ──→ 醫生B ──→ 完成
  病人 ──→ 醫生C ──→ 完成
  病人 ──→ 醫生D ──→ 完成
  同時處理大量病人
```

### 實際例子：搶票場景

```
09:00:00 開賣瞬間
     │
     ▼
  用戶A ──→ 查庫存 → 扣票 → 付款
  用戶B ──→ 查庫存 → 扣票 → 付款
  用戶C ──→ 查庫存 → 扣票 → 付款
  ...
  10,000 人同時搶 100 張票
          高併發！
```

### 為什麼 Go 適合高併發？

```
傳統執行緒：每個 ~1MB 記憶體
┌──────┐ ┌──────┐ ┌──────┐
│ 1MB  │ │ 1MB  │ │ 1MB  │  → 1000 個 = 1GB 記憶體
└──────┘ └──────┘ └──────┘

Go Goroutine：每個 ~2KB 記憶體
┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐
│2K││2K││2K││2K││2K││2K││2K│  → 100 萬個 = 2GB 記憶體
└──┘└──┘└──┘└──┘└──┘└──┘└──┘
```

---

## 5. 編譯 vs 轉譯差異

```
編譯 (Compile):
  高階語言 ──────→ 低階語言/機器碼

  Go       ──────→ 機器碼 (CPU 直接執行)
  C        ──────→ 機器碼
  Rust     ──────→ 機器碼

  層級變化：高 → 低


轉譯 (Transpile):
  高階語言 ──────→ 另一種高階語言

  TypeScript ────→ JavaScript
  SCSS       ────→ CSS
  JSX        ────→ JavaScript

  層級變化：高 → 高（同層轉換）
```

### 圖解差異

```
                抽象程度
                   ▲
                   │
TypeScript    ●────┼────● JavaScript     ← 轉譯（同層）
                   │
                   │
     Go       ●    │
              │    │
              │    │                      ← 編譯（跨層）
              │    │
              ▼    │
    機器碼    ●────┼─────────────────────
                   │
                   └──────────────────→  接近硬體
```

### 簡單比喻

```
編譯 = 中文小說 → 翻譯成樂譜 (完全不同的形式)
       人看文字    機器讀音符

轉譯 = 繁體中文 → 簡體中文 (同樣是文字)
       都是人類看得懂的語言
```

### 專案中的工具

| 工具 | 類型 | 做什麼 |
|-----|------|-------|
| `tsc` | 編譯器 | TypeScript → JavaScript（型別檢查 + 轉換語法） |
| `esbuild` | 轉譯器 | TypeScript → JavaScript（只轉換語法，超快） |
| `go build` | 編譯器 | Go → 機器碼執行檔 |

---

## 6. React 檔案副檔名

| 副檔名 | 用途 |
|-------|------|
| `.js` | 純 JavaScript |
| `.jsx` | JavaScript + JSX 語法（React 元件） |
| `.ts` | 純 TypeScript |
| `.tsx` | TypeScript + JSX 語法（React 元件） |

```tsx
// .tsx 範例 - TypeScript + JSX
interface Props {
  name: string  // TypeScript 型別
}

const Hello = ({ name }: Props) => {
  return <div>Hello {name}</div>  // JSX 語法
}
```

---

## 7. 純 React (Vite) vs Next.js 比較

### 渲染方式

```
純 React + Vite（後台 frontend）:
  渲染方式：CSR（Client-Side Rendering）

  瀏覽器請求 → 空 HTML → 下載 JS → 執行 → 畫面出現
                              在瀏覽器執行


Next.js（前台 official_website）:
  渲染方式：SSR / SSG / CSR 混合

  瀏覽器請求 → 伺服器先渲染 HTML → 畫面立即出現！
                 在 Server 執行       再下載 JS 做互動
```

### 檔案結構對比

```
純 React + Vite:
frontend/
├── src/
│   ├── routes/          # 手動設定路由
│   ├── components/
│   └── main.tsx         # 入口點
└── index.html           # 單一 HTML


Next.js (App Router):
official_website/
├── app/                      # 資料夾 = 路由
│   ├── page.tsx              # → /
│   ├── event/
│   │   └── [id]/
│   │       └── page.tsx      # → /event/123
│   └── layout.tsx            # 共用版面
└── components/
```

### 路由比較

```
純 React (Vite)          │  Next.js
─────────────────────────┼────────────────────────────
                         │
手動設定路由：            │  檔案即路由（自動）：
                         │
// router.tsx            │  app/
<Route                   │  ├── page.tsx        → /
  path="/event/:id"      │  ├── about/
  element={...}          │  │   └── page.tsx    → /about
/>                       │  └── event/
                         │      └── [id]/
                         │          └── page.tsx → /event/:id
```

### 渲染方式比較

| 方式 | 在哪執行 | 適用場景 |
|-----|---------|---------|
| CSR | 瀏覽器 | 後台管理系統、需登入的 App |
| SSR | 伺服器（每次） | 動態內容、需要 SEO |
| SSG | 伺服器（建置時） | 靜態頁面、部落格、文件 |

### 專案選擇理由

```
frontend (後台管理) → 純 React + Vite (CSR)
  ✓ 需要登入才能用
  ✓ 不需要 SEO
  ✓ 互動性高
  ✓ 開發速度快

official_website (前台) → Next.js (SSR/SSG)
  ✓ 需要 SEO（Google 搜尋到活動頁）
  ✓ 首次載入要快（消費者體驗）
  ✓ 社群分享要有預覽圖（OG meta）
  ✓ 部分頁面可預先生成
```

---

## 8. Next.js 不用 createRoot 的原因

### 對比

```tsx
// 純 React + Vite（你要自己寫入口點）
// main.tsx

import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!)
  .render(<App />)

// index.html
<body>
  <div id="root"></div>  ← 手動掛載點
  <script src="main.tsx"></script>
</body>
```

```tsx
// Next.js（不需要寫！自動處理）

// 你只要 export 元件：
// app/page.tsx
export default function Home() {
  return <div>Hello</div>
}

// Next.js 內部自動做：
// 1. 產生 HTML
// 2. 注入 <script>
// 3. Hydration（讓靜態 HTML 變成可互動）
```

### Next.js 的入口點

```tsx
// app/layout.tsx（取代 createRoot + index.html）

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        {children}  {/* ← 這裡就是掛載點 */}
      </body>
    </html>
  )
}
```

### 流程對比

```
純 React:
  瀏覽器載入 index.html
       │
       ▼
  找到 <div id="root">
       │
       ▼
  執行 createRoot().render()
       │
       ▼
  React 元件渲染到 #root 裡面


Next.js:
  瀏覽器請求 /event/123
       │
       ▼
  Server 執行 page.tsx + layout.tsx
       │
       ▼
  產生完整 HTML 回傳
       │
       ▼
  瀏覽器顯示（已經有內容！）
       │
       ▼
  下載 JS，執行 hydrate()（讓頁面可互動）
```

### 簡單對照表

| 功能 | 純 React (Vite) | Next.js |
|-----|----------------|---------|
| 入口點 | `main.tsx` + `createRoot` | `app/layout.tsx` (自動) |
| HTML 模板 | `index.html` | `layout.tsx` |
| 掛載 React | 手動 `render()` | 自動 hydration |
| 路由設定 | 手動 (TanStack Router) | 檔案系統自動 |

### 為什麼 Next.js 不需要 createRoot？

```
因為 Next.js 是「框架」，不是「函式庫」

函式庫 (React)：你呼叫它
  → 你決定怎麼初始化、怎麼掛載

框架 (Next.js)：它呼叫你
  → 它決定怎麼初始化，你只要提供元件
```

---

## 參考資料

- [Vite 官方文件](https://vitejs.dev/)
- [Next.js 官方文件](https://nextjs.org/docs)
- [TypeScript 官方文件](https://www.typescriptlang.org/docs/)
- [React 官方文件](https://react.dev/)
