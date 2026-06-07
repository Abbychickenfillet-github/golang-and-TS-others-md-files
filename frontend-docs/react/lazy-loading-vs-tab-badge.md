# 懶載入 vs Tab Badge 數字的矛盾

## 問題

分頁 Tab 上有數字 badge 顯示資料筆數，但資料用懶載入（點擊分頁才打 API），導致一進頁面數字為 0。

```
┌──────────┬──────────┬──────────┬──────────┐
│ 全部 (3) │ 攤位 (1) │ 票券 (2) │ 預購單(0)│  <-- 0 是錯的！
└──────────┴──────────┴──────────┴──────────┘
```

## 原因

```tsx
// 資料初始值是空陣列
const [preOrders, setPreOrders] = useState<PreOrder[]>([])

// Tab badge 直接讀 length → 一進頁面就是 0
<TabsTrigger value="pre_order">
  預購單 <span>{preOrders.length}</span>   {/* 0 */}
</TabsTrigger>

// 但資料要等使用者點擊分頁才載入
const handleTabChange = (tab) => {
  if (!loadedTabs.has(tab)) {
    loadPreOrders()  // 點了才打 API
  }
}
```

## 規則

**如果 Tab badge 需要顯示數字，資料就不能懶載入。**

兩個方向：
1. **全部預載** — 進頁面時就打所有 API（適合資料量小的情況）
2. **只預載 count** — 獨立打一支 count API 取得數字，完整資料仍懶載入（適合資料量大的情況）

## 修法（本專案採方案 1）

```tsx
// 進頁面就載入全部分頁資料
useEffect(() => {
  if (isAuthenticated && user?.id) {
    loadOrders()
    loadPreOrders()       // 一開始就載入
    loadVendorPreOrders() // 一開始就載入
  }
}, [isAuthenticated, user?.id])

// 標記這些分頁「已載入」，避免點擊時重複打 API
const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
  new Set(['pre_order', 'vendor_pre_order'])
)
```

### `loadedTabs` 是什麼？

`Set<string>` 記錄「哪些分頁的資料已經載入過了」。

- `handleTabChange` 會檢查 `if (!loadedTabs.has(tab))` 才呼叫 API
- 因為 useEffect 已經載入了 `pre_order` 和 `vendor_pre_order` 的資料
- 所以要把它們預設放進 Set，否則點擊分頁時會**重複打 API**

這些字串（`'pre_order'`、`'vendor_pre_order'`）是前端自訂的 tab 識別符，跟後端 API 無關：

```tsx
type OrderTab = 'all' | 'booth' | 'ticket' | 'pre_order' | 'vendor_pre_order'
```

## 修復 commit

`a58b00a`
