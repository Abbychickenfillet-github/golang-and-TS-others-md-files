# 前端筆記

## React / TypeScript

### 常用語法
```tsx
// useQuery 取得資料
const { data, isLoading } = useQuery({
  queryKey: ["items"],
  queryFn: () => fetchItems(),
})

// useMutation 修改資料
const mutation = useMutation({
  mutationFn: (data) => updateItem(data),
  onSuccess: () => queryClient.invalidateQueries(["items"]),
})
```

### TypeScript 注意事項

#### Interface 是什麼？

**Interface（介面）** 是 TypeScript 用來定義**物件形狀（Shape）**的方式，描述物件應該有哪些屬性和型別。

**用途**：
- 定義物件的結構
- 提供型別檢查
- 讓 IDE 有自動完成功能
- 讓程式碼更容易理解和維護

**基本語法**：

```typescript
// 定義一個 interface
interface User {
  id: string
  name: string
  email: string
  age?: number  // 可選屬性（使用 ?）
}

// 使用 interface
const user: User = {
  id: "123",
  name: "Abby",
  email: "abby@example.com",
  // age 是可選的，可以不提供
}
```

**在本專案中的範例**（來自 `outlet-specification.ts`）：

```typescript
// 基礎 interface
export interface OutletSpecificationBase {
  company_id: string | null
  name: string
  socket_type: SocketType
  outlet_count: number
  is_extension: boolean
  price: string
  currency: string
  status: string
}

// 繼承（extends）其他 interface
export interface OutletSpecificationPublic extends OutletSpecificationBase {
  id: string  // 新增屬性
  created_at: string
  updated_at: string
  company_name: string | null
}

// 使用
const outlet: OutletSpecificationPublic = {
  id: "123",
  company_id: "company-1",
  name: "標準插座",
  socket_type: "3pin",
  outlet_count: 4,
  is_extension: false,
  price: "100",
  currency: "TWD",
  status: "active",
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
  company_name: "測試公司"
}
```

**Interface 的特性**：

1. **可選屬性**：使用 `?`
   ```typescript
   interface User {
     name: string
     age?: number  // 可選
   }
   ```

2. **繼承**：使用 `extends`
   ```typescript
   interface Base {
     id: string
   }

   interface Public extends Base {
     name: string  // 繼承 id，新增 name
   }
   ```

3. **聯合型別**：使用 `|`
   ```typescript
   interface User {
     name: string | null  // 可能是 string 或 null
   }
   ```

**Interface 的主要用途**：

1. **定義物件形狀**（最常見）
   ```typescript
   interface User {
     id: string
     name: string
   }
   ```

2. **定義函數/方法簽名**（也是物件，但屬性是函數）
   ```typescript
   // 定義一個物件，但它的屬性是函數
   interface SignaturePadRef {
     clear: () => void           // 方法簽名
     isEmpty: () => boolean      // 方法簽名
     toDataURL: () => string     // 方法簽名
   }

   // 使用：這個物件必須有這些方法
   const ref: SignaturePadRef = {
     clear: () => { /* ... */ },
     isEmpty: () => true,
     toDataURL: () => "data:image/png;base64,..."
   }
   ```

3. **定義 React 組件 Props**
   ```typescript
   interface ButtonProps {
     label: string
     onClick: () => void
     disabled?: boolean
   }

   function Button({ label, onClick, disabled }: ButtonProps) {
     // ...
   }
   ```

4. **定義可呼叫的物件（Callable Object）**
   ```typescript
   // 定義一個可以當函數呼叫的物件
   interface Callable {
     (x: number): number  // 可以當函數呼叫
     name: string         // 也有屬性
   }

   const fn: Callable = (x) => x * 2
   fn.name = "double"
   ```

**Interface vs Type**：

| 特性 | Interface | Type |
|------|-----------|------|
| **主要用途** | 定義物件形狀、方法簽名 | 定義任何型別（物件、聯合、交叉等） |
| **繼承** | `extends` | `&` (交叉型別) |
| **合併** | 可以重複宣告自動合併 | 不能重複宣告 |
| **範例** | `interface User { ... }` | `type User = { ... }` |

**本專案慣例**：
- 使用 `interface` 定義物件型別（如 `OutletSpecificationPublic`）
- 使用 `interface` 定義方法簽名（如 `SignaturePadRef`）
- 使用 `interface` 定義 React Props（如 `ButtonProps`）
- 使用 `type` 定義聯合型別（如 `type SocketType = "2pin" | "3pin"`）

**總結**：
- Interface **主要**用來定義物件型別，但也可以定義方法簽名
- 方法簽名其實也是物件的一種（物件的屬性是函數）
- 所以嚴格來說，interface 都是定義「物件的形狀」，只是這個物件可能是：
  - 數據物件（如 `User`）
  - 方法物件（如 `SignaturePadRef`）
  - 混合物件（既有數據又有方法）

#### 其他注意事項

- 切勿使用 `undefined` 做型別定義
  - **原因**：可選屬性 `?` 本身就隱含了 `| undefined`，顯式寫 `| undefined` 是冗餘的
  - **正確做法**：使用 `?` 可選屬性，或使用 `| null` 表示有意為空的值
  - **範例**：
    ```typescript
    // ❌ 錯誤：不要顯式寫 undefined
    interface User {
      name: string | undefined  // 冗餘
    }

    // ✅ 正確：使用可選屬性
    interface User {
      name?: string  // 等同於 name: string | undefined
    }

    // ✅ 正確：使用 null 表示有意為空
    interface User {
      name: string | null  // 明確表示"可能是空值"
    }
    ```
- **為什麼不特別說 `null`？**
  - `null` 在本專案中是被允許和常用的（例如：`string | null`）
  - `null` 表示"有意為空的值"，是明確的設計選擇
  - `undefined` 更多是"未定義"狀態，在型別定義中應該用 `?` 可選屬性來表達
- 宣告變數後一定要使用，不然會報錯
- 使用 `as` 斷言時要小心型別安全

---

## Chakra UI

### v2 vs v3 差異
| 功能 | Chakra v2 (frontend) | Chakra v3 (official_website) |
|------|---------------------|------------------------------|
| 間距 | `spacing={4}` | `gap={4}` |
| Stack | `<VStack spacing={4}>` | `<VStack gap={4}>` |

### CSS Display 屬性：`block` vs `inline-block`

#### `display: block`（區塊元素）
```
┌─────────────────────────────────┐
│ 內容                              │  ← 佔滿整行寬度
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 下一個元素                        │  ← 強制換行
└─────────────────────────────────┘
```
- **佔滿父容器寬度**
- **強制換行**（前後元素會在不同行）
- 預設對齊：靠左

#### `display: inline-block`（行內區塊）
```
┌──────┐ ┌──────┐ ┌──────┐
│ 內容 │ │ 內容 │ │ 內容 │  ← 可以並排
└──────┘ └──────┘ └──────┘
```
- **只佔內容寬度**
- **不換行**（可以和其他元素並排）
- 但保留 block 特性（可設 width/height/padding/margin）

#### 在 Chakra UI Grid 中的影響

```tsx
// GridItem 預設是 block，會填滿整個格子
<GridItem>
  <Badge>內容</Badge>  // Badge 靠左對齊，填滿格子
</GridItem>

// 加了 inline-block 後
<GridItem>
  <Badge display="inline-block">內容</Badge>
  // Badge 變成只佔自己寬度，可能造成視覺偏移
</GridItem>
```

#### 實際問題案例（companies.tsx 表格對齊）

**問題**：表頭和資料列的對齊不一致

| 欄位 | 問題設定 | 造成的問題 |
|------|----------|-----------|
| 審核狀態 | `display="inline-block"` | Badge 不填滿格子，造成偏移 |
| 角色 | `display="inline-block"` | 同上 |
| 國家/統編 | `textAlign="left"` | 多餘設定（Grid 預設就是靠左） |

**解決方案**：
- 移除 `display="inline-block"` - 讓元素填滿 GridItem
- 移除多餘的 `textAlign="left"` - Grid 預設對齊方式已經是靠左
- Badge 可用 `px={1}` 減少內距來調整視覺

### `whiteSpace="nowrap"` 是什麼？

CSS 屬性 `white-space: nowrap`，作用是**防止文字換行**。

```
有 nowrap:  [全部] [主辦單位] [品牌方] [總承包商]  ← 保持一行

沒有 nowrap（容器太窄時）:
[全部] [主辦
單位] [品牌方]  ← 文字被斷開
```

常見用途：
- Tab 標籤保持完整（不被換行）
- 配合 `overflowX="auto"` 讓容器可水平滾動

---

## Biome (Linter + Formatter)

### Q: Biome 是一個格式還是套件還是集成？

**A: Biome 是一個 npm 套件 (package)**，安裝後提供 CLI 工具。

| 術語 | 說明 | Biome 是嗎？ |
|------|------|-------------|
| 格式 (Format) | 檔案格式，如 `.json`、`.ts` | ❌ 不是 |
| 套件 (Package) | 可安裝的程式庫/工具 | ✅ **是的！** |
| 集成 (Integration) | 與其他工具的整合方式 | ❌ 不是（但它有 VS Code 擴充套件） |

```bash
# 安裝方式（證明它是一個 npm 套件）
npm install --save-dev @biomejs/biome
```

**Biome** 是一個高效的 JavaScript/TypeScript 工具，整合了 **Linter（程式碼檢查）** 和 **Formatter（格式化）** 功能，用來取代 ESLint + Prettier 的組合。

設定檔：`frontend/biome.json`

### 優點（相比 ESLint + Prettier）
- **速度快** - 用 Rust 寫的，比 ESLint 快 10-100 倍
- **零配置** - 內建合理預設
- **單一工具** - 不用裝多個套件

### 設定檔結構

| 區塊 | 功能 |
|------|------|
| `organizeImports` | 自動排序 import 語句 |
| `files.ignore` | 忽略的檔案/資料夾（如 `node_modules`、`dist`、自動生成的 `client/**`） |
| `linter.rules` | Lint 規則設定 |
| `formatter` | 格式化設定（縮排用空格） |
| `javascript.formatter` | JS 專屬設定（雙引號、需要時才加分號） |

### Q: 為什麼 `files.ignore` 要加入 `dist`？

**A:** `dist` 是 build 產出的資料夾，裡面是**編譯後的程式碼**，不需要檢查：

| 忽略項目 | 原因 |
|----------|------|
| `node_modules` | 第三方套件，不是我們寫的程式碼 |
| `dist` | `npm run build` 產出的編譯結果，是機器產生的 |
| `src/routeTree.gen.ts` | TanStack Router 自動產生的路由檔 |
| `src/client/**` | 從後端 OpenAPI 自動產生的 API client |

**重點**：Linter 只需要檢查**我們手寫的原始碼**，自動產生或編譯後的檔案不需要檢查。

### 目前關閉的規則

| 規則 | 說明 |
|------|------|
| `noExplicitAny` | 允許使用 `any` 型別 |
| `noArrayIndexKey` | 允許用陣列索引當 React key |
| `noNonNullAssertion` | 允許 `!` 非空斷言 |
| `noForEach` | 允許使用 `forEach` |

### 什麼是 `!` 非空斷言 (Non-null Assertion)？

在 TypeScript 中，`!` 放在變數後面，告訴編譯器「我確定這個值不是 `null` 或 `undefined`」：

```typescript
// 假設 user 可能是 null
const user: User | null = getUser()

// ❌ 直接使用會報錯
user.name  // Error: user 可能是 null

// ✅ 用 ! 告訴 TS「我確定不是 null」
user!.name  // OK，但如果真的是 null 會在執行時崩潰

// ✅ 更安全的做法：用 optional chaining
user?.name  // 如果 user 是 null，回傳 undefined 而不是崩潰
```

**風險**：如果你判斷錯誤，執行時會出錯。所以有些團隊會開啟 `noNonNullAssertion` 規則禁止使用。

### 常用指令

```bash
npm run lint          # 執行 Biome 檢查
npx biome check .     # 檢查所有檔案
npx biome format .    # 格式化所有檔案
```

---

## Tailwind CSS（official_website 專用）

`official_website` 使用 **Tailwind CSS v4**，不是 Chakra UI。

### Q: 為什麼 `w-100` 有效，跟 `w-[400px]` 效果一樣？

**A:** 因為 official_website 用的是 **Tailwind v4**（package.json: `"tailwindcss": "^4.1.9"`）

Tailwind 的寬度計算公式：**數字 × 4px**

| Class | 計算 | 實際寬度 |
|-------|------|----------|
| `w-80` | 80 × 4 | 320px |
| `w-96` | 96 × 4 | 384px |
| `w-100` | 100 × 4 | **400px** |
| `w-[400px]` | 任意值 | **400px** |

所以 `w-100` = `w-[400px]` = 400px！

### Tailwind v3 vs v4 差異

| 功能 | Tailwind v3 | Tailwind v4 |
|------|-------------|-------------|
| 預設寬度 | 只到 `w-96` | 擴展到更大的值（如 `w-100`） |
| 設定檔 | `tailwind.config.js` | CSS-first（不需設定檔） |
| 任意值 | `w-[400px]` | `w-[400px]`（相同） |

### 文字大小

| Class | 大小 |
|-------|------|
| `text-xs` | 12px |
| `text-sm` | 14px |
| `text-base` | 16px |
| `text-lg` | 18px |
| `text-xl` | 20px |
| `text-2xl` | 24px |

---

## 待補充...
