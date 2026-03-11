# useMemo 與 Render 優化

#useMemo #IIFE #flatMap #rerender #UIjank #memoization #performance

## 問題：IIFE 在 JSX 裡做昂貴計算

**相關檔案：** `src/pages/EventCouponSettingsPage.tsx`

原本寫法：把 `flatMap`、`sort`、`new Map()` 等計算直接寫在 JSX 的 IIFE 裡面：

```tsx
{(() => {
  const allEventOrders = memberSummary.flatMap(m =>
    m.orders.map(o => ({ ...o, member_id: m.member_id }))
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const ticketSeqByMember = new Map<string, number>()
  allEventOrders.forEach((o, i) => {
    if (!ticketSeqByMember.has(o.member_id)) ticketSeqByMember.set(o.member_id, i + 1)
  })

  return (<div>...</div>)
})()}
```

### 為什麼有問題？

- **IIFE（Immediately Invoked Function Expression）** = 立即執行函式 `(() => { ... })()`
- 寫在 JSX 裡的 IIFE，**每次 component re-render 都會重新執行**
- React 的 re-render 很頻繁：任何 state 變化（hover、打字、開關 panel）都會觸發
- 對大活動（幾百筆 orders/claims），`flatMap + sort + 建 Map` 的計算成本高
- 結果：**UI jank**（畫面卡頓、操作不順暢）

---

## 解法：useMemo

`useMemo` 會**快取計算結果**，只在 dependency array 裡的值改變時才重新計算：

```tsx
const ticketSeqByMember = useMemo(() => {
  const allEventOrders = memberSummary.flatMap(m =>
    m.orders.map(o => ({ ...o, member_id: m.member_id }))
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const map = new Map<string, number>()
  allEventOrders.forEach((o, i) => {
    if (!map.has(o.member_id)) map.set(o.member_id, i + 1)
  })
  return map
}, [memberSummary])  // ← 只有 memberSummary 變了才重算
```

### Dependency Array 怎麼選？

React 用 `Object.is` 比較 dependency array 裡的值：
- `[memberSummary]` → 只有呼叫 `setMemberSummary()` 換了 reference 才重算
- `[claims]` → 只有 `setClaims()` 才重算
- `[sortedOrders, summarySeqMode]` → 兩者任一變化才重算

### 實際改動的 memoized 值

| 變數 | 依賴 | 說明 |
|------|------|------|
| `ticketSeqByMember` | `[memberSummary]` | member_id → 購票序號 Map |
| `sortedClaims` | `[claims]` | claims 依 issued_at 排序 |
| `sortedOrders` | `[memberSummary]` | 所有訂單攤平+排序 |
| `allOrders` | `[sortedOrders, summarySeqMode]` | 加上序號（全活動/每日） |
| `summaryDates` | `[allOrders]` | 可篩選的日期列表 |
| `filteredByDate` | `[allOrders, summaryDateFilter]` | 日期篩選後的訂單 |
| `claimsByMember` | `[memberSummary]` | member_id → claims Map |

---

## 相關知識

### IIFE（Immediately Invoked Function Expression）

```tsx
// 定義後立即執行，常用在 JSX 裡需要多行邏輯的地方
{(() => {
  const x = computeSomething()
  return <div>{x}</div>
})()}
```

適合用在：不需要 memoize 的簡單邏輯（例如追蹤 iteration state 的 `Set`）
不適合用在：昂貴的計算（排序、建 Map、大量資料處理）

### flatMap（原生 Array 方法，ES2019）

```tsx
// 等於 .map().flat(1) — map 後攤平一層
memberSummary.flatMap(m => m.orders.map(o => ({ ...o, member_id: m.member_id })))
// 每個 member 有多筆 orders，flatMap 把所有 member 的 orders 攤成一個陣列
```

### sort((a, b) => ...) 排序比較函式

```tsx
.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
```

- `a` 和 `b` 是陣列中被抓來比較的**任意兩個元素**，不代表誰大誰小
- 回傳**負數** → `a` 排前面；回傳**正數** → `b` 排前面
- `.getTime()` 把日期轉成毫秒數（數字），才能相減比大小
- `a - b` → **升序**（小到大）；`b - a` → **降序**（大到小）

**數字範例：** `[5, 2, 8].sort((a, b) => a - b)`
```
a=5, b=2 → 5-2 = 3 (正數) → b(2) 排前面
a=5, b=8 → 5-8 = -3 (負數) → a(5) 排前面
結果：[2, 5, 8]
```

**日期範例：** 時間越晚 → 毫秒數越大
```
a.created_at = "2024-01-01" → getTime() = 1704067200000（小）
b.created_at = "2024-06-01" → getTime() = 1717200000000（大）
a - b = 負數 → a 排前面 → 早的在前 = 升序
```

---

### Building Maps（建立查詢表）

```tsx
const ticketSeqByMember = new Map<string, number>()
allEventOrders.forEach((o, i) => {
  if (!ticketSeqByMember.has(o.member_id)) {
    ticketSeqByMember.set(o.member_id, i + 1)
  }
})
// 之後用 ticketSeqByMember.get(memberId) → O(1) 查詢
```

用 `Map` 而不是 `Object` 的好處：
- key 可以是任何型別（不只 string）
- `.has()` / `.get()` / `.set()` 語意更清楚
- 不會跟 prototype 上的屬性衝突

---

## 什麼時候該用 useMemo？

**該用：**
- 資料量大的排序、過濾、轉換（flatMap + sort）
- 建立查詢用的 Map / Set
- 依賴不常變的 state，但 component 因其他 state 頻繁 re-render

**不需要：**
- 簡單的計算（字串拼接、條件判斷）
- 只在特定條件下才渲染的區塊（React 本身就會跳過）
- 每次 render 依賴都會變的情況（memoize 了也沒用）
