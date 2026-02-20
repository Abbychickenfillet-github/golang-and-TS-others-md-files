# 除錯筆記

## 常見錯誤

### TypeScript 錯誤

| 錯誤 | 原因 | 解決 |
|------|------|------|
| `Property 'x' does not exist on type '{}'` | API 回傳型別不明確 | 使用 `as { data?: T }` 斷言 |
| `'x' is declared but never used` | 宣告變數沒使用 | 刪除或使用該變數 |
| `Type 'null' is not assignable to type 'X'` | null 與 undefined 混用 | 使用 `?? defaultValue` |

### Import 錯誤

| 錯誤 | 原因 | 解決 |
|------|------|------|
| `Cannot find name 'Box'` | 忘記 import | 加入 `import { Box } from "@chakra-ui/react"` |

---

## UI 對齊問題

### Grid 表格對齊不一致（companies.tsx - 2026/01）

**問題描述**：
公司管理頁面的 Grid 表格，表頭（Th）和資料列（Td）對齊不一致，部分欄位偏左、部分偏右。

**問題原因**：
1. `display="inline-block"` - 讓 Badge/MenuButton 只佔自己寬度，不填滿 GridItem
2. 多餘的 `textAlign="left"` - Grid 預設就是靠左，加了反而可能有副作用
3. Badge 和 MenuButton 有預設 padding，造成視覺偏移

**解決方案**：
```tsx
// ❌ 錯誤：inline-block 讓元素不填滿格子
<GridItem>
  <Badge display="inline-block">內容</Badge>
</GridItem>

// ✅ 正確：移除 inline-block，讓元素填滿
<GridItem>
  <Badge>內容</Badge>
</GridItem>

// ❌ 錯誤：多餘的 textAlign
<GridItem textAlign="left">
  <Text>內容</Text>
</GridItem>

// ✅ 正確：Grid 預設就是靠左
<GridItem>
  <Text>內容</Text>
</GridItem>
```

**修改的欄位**：
- 審核狀態：移除 `display="inline-block"`
- 角色：移除 `display="inline-block"`
- 公司名稱、國家、統編、所屬會員、支付方式：移除 `textAlign="left"`

### Badge Padding 造成的對齊偏移（2026/01）

**問題描述**：
「角色」欄位的 Badge 與表頭對齊有偏差，F12 檢查發現 Badge 有較大的 padding。

**特殊現象**：
1. RWD 視窗縮小後問題減輕
2. Cursor @chrome mode 時問題也減輕

**原因分析**：
```
寬螢幕（column = 100px）：
┌────────────────────┐
│ 角色               │ ← 表頭 Text 靠左
├────────────────────┤
│ [  品牌方  ]       │ ← Badge 有 padding，視覺偏右
└────────────────────┘
     ↑ 空白多 ↑

窄螢幕（column 變窄）：
┌───────────┐
│ 角色      │
├───────────┤
│ [品牌方]  │ ← 空白變少，偏移感減輕
└───────────┘
```

1. **Grid column 固定寬度**（如 `100px`），但 Badge 實際寬度較小
2. **Badge 預設 padding**（左右各約 8px），佔用空間但不填滿 column
3. **剩餘空間**造成視覺上的「偏移感」
4. **RWD 縮小時**，column 寬度相對緊湊，空白比例下降
5. **@chrome mode** 可能有不同的 viewport/zoom/字體渲染

**可能的解決方案**：
```tsx
// 方案 1：減少 Badge padding
<Badge px={1}>品牌方</Badge>

// 方案 2：縮小 Grid column 寬度
templateColumns="... 80px ..."  // 從 100px 改為 80px

// 方案 3：讓 Badge 填滿寬度（但可能不美觀）
<Badge w="full">品牌方</Badge>
```

---

## Lint 問題

```bash
# 執行 lint（會自動修復）
npm run lint

# dist 檔案過大警告可忽略（是 build 產物）
```

---

## React Query 快取機制（TanStack Query）

### queryKey 是什麼？

**queryKey** 是 React Query 用來識別和快取資料的「唯一鍵值」。就像是一個標籤，告訴 React Query 「這個資料是什麼」。

```tsx
// queryKey 是一個陣列
useQuery({
  queryKey: ["companies"],           // 簡單的 key
  queryFn: () => fetchCompanies(),
})

useQuery({
  queryKey: ["companies", { status: "pending" }],  // 帶參數的 key
  queryFn: () => fetchCompanies({ status: "pending" }),
})
```

**重點**：
- 不同的 queryKey = 不同的快取資料
- `["companies"]` 和 `["companies", { status: "pending" }]` 是**兩個不同的快取**

---

### 統計卡片不更新問題（2025/01）

**問題描述**：
在公司管理頁面，當變更公司狀態（例如從「待審核」改為「已核可」）後，統計卡片的數字沒有更新。

**根本原因**：

頁面中有兩個不同的 query：

```tsx
// 1. 統計卡片用的 query（在 Companies 父元件）
const { data: allCompaniesForStats } = useQuery(
  getCompaniesQueryOptions({})  // 空物件
)
// → queryKey: ["companies", { search: undefined, country: undefined, role: undefined, status: undefined }]

// 2. 表格用的 query（在 CompaniesTable 子元件）
const { data: allCompanies } = useQuery({
  ...getCompaniesQueryOptions({
    country,     // 可能是 "tw"
    role,        // 可能是 "vendor"
    status,      // 可能是 "pending"
  }),
})
// → queryKey: ["companies", { search: undefined, country: "tw", role: "vendor", status: "pending" }]
```

這兩個 queryKey 是**不同的**，所以 React Query 把它們當作不同的快取。

**為什麼 invalidateQueries 沒有效？**

```tsx
// 之前的寫法
queryClient.invalidateQueries({ queryKey: ["companies"] })
```

理論上 `["companies"]` 應該用 prefix matching 失效所有以 `["companies"]` 開頭的查詢，但有時會有快取比對問題（物件內含 undefined 值的比較）。

**解決方案**：

```tsx
// 改用 predicate 函數明確匹配
await queryClient.invalidateQueries({
  predicate: (query) =>
    Array.isArray(query.queryKey) && query.queryKey[0] === "companies",
  refetchType: "all",
})
```

- `predicate` 是一個函數，讓你自己決定要失效哪些查詢
- `query.queryKey[0] === "companies"` 確保所有第一個元素是 `"companies"` 的都會被失效
- `refetchType: "all"` 確保即使查詢不在畫面上，也會重新取得

---

### queryKey 詳解

**Q: queryKey 會跟其他檔案的東西綁在一起嗎？譬如是參照公司資料表的意思？key 的內容是哪裡有先定義好的嗎？**

**A: queryKey 不是資料庫的東西，是「前端快取的標籤」**

  ┌─────────────────────────────────────────────────────────────────┐
  │                        瀏覽器記憶體（React Query 快取）            │
  │                                                                 │
  │   ┌─────────────────────────────────────────────────────────┐   │
  │   │ 標籤: ["companies", {}]                                  │   │
  │   │ 資料: [{id: "1", name: "公司A"}, {id: "2", name: "公司B"}] │   │
  │   └─────────────────────────────────────────────────────────┘   │
  │                                                                 │
  │   ┌─────────────────────────────────────────────────────────┐   │
  │   │ 標籤: ["companies", {status: "pending"}]                 │   │
  │   │ 資料: [{id: "3", name: "待審核公司"}]                      │   │
  │   └─────────────────────────────────────────────────────────┘   │
  │                                                                 │
  │   ┌─────────────────────────────────────────────────────────┐   │
  │   │ 標籤: ["events", {}]                                     │   │
  │   │ 資料: [{id: "e1", name: "活動A"}]                         │   │
  │   └─────────────────────────────────────────────────────────┘   │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘

  queryKey 在哪裡定義？

  就在你寫 useQuery 的地方定義，你自己取名字：

  // 在 companies.tsx 裡面定義的
  function getCompaniesQueryOptions({ search, country, role, status }) {
    return {
      queryFn: () => CompaniesService.getCompanies(...),  // 呼叫 API
      queryKey: [          // ← 這裡！你自己定義標籤名稱
        "companies",       // ← 第一個元素：自己取的名字，通常對應資源類型
        { search, country, role, status },  // ← 第二個元素：參數
      ],
    }
  }

  流程圖

  使用者打開公司頁面
          ↓
  useQuery({ queryKey: ["companies", {}] })
          ↓
  React Query 檢查：快取裡有 ["companies", {}] 嗎？
          ↓
      ┌───┴───┐
     沒有     有
      ↓        ↓
  呼叫 API   直接用快取的資料
      ↓        （不呼叫 API）
  存入快取
  標籤: ["companies", {}]

  不同的 queryKey = 不同的快取

  // 這兩個是【不同的快取】，因為 queryKey 不一樣
  useQuery({ queryKey: ["companies", {}] })
  useQuery({ queryKey: ["companies", {status: "pending"}] })

  // 這兩個是【同一個快取】，因為 queryKey 一樣
  // （在不同檔案也是共用同一份資料）
  useQuery({ queryKey: ["companies", {}] })  // 在 A.tsx
  useQuery({ queryKey: ["companies", {}] })  // 在 B.tsx ← 會共用 A 的資料！

  總結

  | 問題               | 答案                                               |
  |--------------------|----------------------------------------------------|
  | queryKey 是什麼？  | 前端快取的「標籤名稱」                             |
  | 誰定義的？         | 你自己在程式碼裡寫的                               |
  | 跟資料庫有關嗎？   | 沒有直接關係，只是習慣用資源名稱（如 "companies"） |
  | 不同檔案會共用嗎？ | 會！ 只要 queryKey 一樣，就共用同一份快取          |

  這就是為什麼當我們在 CompaniesTable 裡 invalidateQueries({ queryKey: ["companies"] })，統計卡片（在 Companies 父元件）的資料也會更新——因為它們的 queryKey 都以 "companies" 開頭！

---

### 快取資料從哪裡來？

**Q: 快取是取哪裡的資料？invalidateQueries 查到什麼？是所有欄位都會出現嗎？**

**A: 快取的資料從哪裡來？**

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │   後端 API   │ ──────> │  React Query │ ──────> │   畫面顯示   │
  │   (Python)   │  JSON   │    (快取)    │  資料   │   (React)    │
  └──────────────┘         └──────────────┘         └──────────────┘

  詳細流程

  // 1️⃣ 你寫這段程式碼
  useQuery({
    queryKey: ["companies", {}],
    queryFn: () => CompaniesService.getCompanies({ limit: 1000 }),
    //              ↑ 這個函數會呼叫後端 API
  })

  2️⃣ React Query 執行 queryFn，呼叫 API

  GET /api/v1/companies?limit=1000
          ↓
  後端回傳 JSON：
  {
    "data": [
      { "id": "abc", "company_name": "測試公司", "status": "active", "tax_id": "12345678", ... },
      { "id": "def", "company_name": "另一公司", "status": "pending", "tax_id": "87654321", ... },
    ],
    "count": 2
  }

  3️⃣ React Query 把整個回傳結果存入快取

  ┌─────────────────────────────────────────────────────────────┐
  │ 快取                                                         │
  │                                                              │
  │ 標籤: ["companies", {}]                                      │
  │ 資料: {                                                      │
  │   "data": [                                                  │
  │     { "id": "abc", "company_name": "測試公司", "status": "active", ... },  │
  │     { "id": "def", "company_name": "另一公司", "status": "pending", ... }, │
  │   ],                                                         │
  │   "count": 2                                                 │
  │ }                                                            │
  └─────────────────────────────────────────────────────────────┘
          ↑
          └── 所有欄位都會存！就是 API 回傳什麼就存什麼

  invalidateQueries 做了什麼？

  await queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "companies",
    refetchType: "all",
  })

  invalidateQueries 不是「查資料」，是「標記快取過期」

  ┌─────────────────────────────────────────────────────────────┐
  │ 快取                                                         │
  │                                                              │
  │ 標籤: ["companies", {}]          ← 檢查：第一個元素是 "companies"？ ✓ │
  │ 狀態: 有效 → ❌ 過期               ← 標記為過期                    │
  │                                                              │
  │ 標籤: ["companies", {status: "pending"}]  ← 第一個元素是 "companies"？ ✓ │
  │ 狀態: 有效 → ❌ 過期                                            │
  │                                                              │
  │ 標籤: ["events", {}]             ← 第一個元素是 "companies"？ ✗    │
  │ 狀態: 有效（不動）                                              │
  └─────────────────────────────────────────────────────────────┘
          ↓
  refetchType: "all" → 立刻重新呼叫 API 取得最新資料
          ↓
  ┌─────────────────────────────────────────────────────────────┐
  │ 快取（更新後）                                                 │
  │                                                              │
  │ 標籤: ["companies", {}]                                      │
  │ 資料: { "data": [...最新的公司列表...], "count": 62 }          │
  │ 狀態: ✓ 有效                                                  │
  └─────────────────────────────────────────────────────────────┘

  總結

  | 問題                       | 答案                                         |
  |----------------------------|----------------------------------------------|
  | 快取資料從哪來？           | 後端 API 回傳的 JSON                         |
  | 存哪些欄位？               | 全部！ API 回傳什麼就存什麼                  |
  | invalidateQueries 做什麼？ | 把匹配的快取標記為「過期」，然後重新呼叫 API |
  | predicate 查什麼？         | 查「快取的標籤」，不是查資料內容             |

```tsx
predicate: (query) => query.queryKey[0] === "companies"
//                    ↑ 只檢查標籤，不檢查資料內容
```

---

### 前後端搜尋衝突問題（2025/01）

**問題描述**：
在公司管理頁面搜尋，有時候找不到東西。

**根本原因**：

搜尋**同時**發生在後端和前端：

```
使用者輸入 "測試"
       ↓
[後端搜尋] CompaniesService.getCompanies({ search: "測試", limit: 1000 })
       ↓
後端回傳：找到 5 筆公司
       ↓
[前端搜尋] filteredCompanies.filter(c => c.company_name.includes("測試"))
       ↓
前端顯示：5 筆公司
```

問題在於：
1. 如果後端搜尋邏輯和前端不一致（例如後端只搜公司名稱，前端搜名稱+統編+品牌）
2. 後端先過濾掉一些資料，前端就無法再找到它們

**解決方案**：

既然已經用 `limit: 1000` 取得所有公司，就不需要後端搜尋了：

```tsx
// ❌ 之前：前後端都搜尋
const { data: allCompanies } = useQuery({
  ...getCompaniesQueryOptions({
    search,        // 傳給後端
    country,
    role,
    status,
  }),
})

// ✅ 現在：只用前端搜尋
const { data: allCompanies } = useQuery({
  ...getCompaniesQueryOptions({
    // search 不傳給後端，只在前端過濾
    country,
    role,
    status,
  }),
})
```

前端過濾可以控制搜尋邏輯：
```tsx
const filteredCompanies = sortedCompanies.filter((company) => {
  // 可以搜尋公司名稱、統編、品牌名稱
  const matchesSearch =
    !search ||
    company.id === search ||  // 支援 CompanySelector 回傳的 company ID
    company.company_name?.toLowerCase().includes(searchLower) ||
    company.tax_id?.toLowerCase().includes(searchLower) ||
    company.brand_name?.toLowerCase().includes(searchLower)
  // ...
})
```

---

### 快取相關名詞解釋

| 名詞 | 說明 |
|------|------|
| `queryKey` | 快取的唯一識別碼，用陣列表示 |
| `invalidateQueries` | 將快取標記為「過期」，下次使用時會重新取得 |
| `refetchQueries` | 立即重新取得資料 |
| `staleTime` | 資料多久後被視為「過期」（毫秒） |
| `predicate` | 用函數判斷要操作哪些查詢 |
| `refetchType` | `"active"` 只重取目前使用的，`"all"` 重取所有匹配的 |

---

## 待補充...
