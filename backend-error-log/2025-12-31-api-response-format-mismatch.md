# API 回傳格式不一致問題

**日期：2025-12-31**

## 遇到的問題

在 http://localhost:5003/vendor-payment-methods 頁面，**活動名稱一直顯示 ID**（例如 `7eca8659-143d-4d7f-af17-21acff827da9`），而不是中文名稱（例如「夜市活動」）。

後來修正後變成顯示「未知活動」，還是沒有正確顯示名稱。

**第二次修正後成功顯示正確的活動中文名稱！**

---

## 根本原因

**前端預期的格式** 跟 **後端實際回傳的格式** 不一樣！

### 後端實際回傳（正確的）
```python
# backend/app/api/routes/events.py
@router.get("/", response_model=list[EventPublic])  # 直接回傳陣列
def read_events(...):
    return events  # 回傳 [event1, event2, event3, ...]
```

後端回傳的 JSON：
```json
[
  { "id": "abc123", "name": "夜市活動" },
  { "id": "def456", "name": "春節市集" }
]
```

### 前端錯誤的假設
```typescript
// 錯誤：以為回傳的是包裝過的物件
as Promise<{ data: EventPublic[]; count: number }>

// 然後這樣取資料
eventsData?.data?.forEach(...)  // eventsData.data 是 undefined！
```

前端以為會收到：
```json
{
  "data": [
    { "id": "abc123", "name": "夜市活動" },
    { "id": "def456", "name": "春節市集" }
  ],
  "count": 2
}
```

## 為什麼會出錯？

```
後端回傳:  [ {...}, {...} ]     ← 這是陣列
前端預期:  { data: [...] }      ← 這是物件包著陣列

eventsData = [ {...}, {...} ]   ← 實際拿到的
eventsData.data = undefined     ← 陣列沒有 .data 屬性！
eventsData.data.forEach(...)    ← 爆炸，eventNameMap 永遠是空的
```

## 修正方式

```typescript
// 修正前（錯誤）
const { data: eventsData } = useQuery({
  queryFn: () => ... as Promise<{ data: EventPublic[]; count: number }>,
})
eventsData?.data?.forEach(event => ...)

// 修正後（正確）
const { data: eventsData } = useQuery({
  queryFn: () => ... as Promise<EventPublic[]>,  // 直接是陣列
})
if (Array.isArray(eventsData)) {
  eventsData.forEach(event => ...)  // 直接遍歷陣列
}
```

## 如何避免這個問題？

1. **看後端 API 定義**：`response_model=list[X]` 表示直接回傳陣列
2. **看後端 API 定義**：`response_model=XPublic` 且裡面有 `data` 欄位才是包裝格式
3. **用瀏覽器 Network 看實際回傳**：直接看 API 回傳的 JSON 長什麼樣

## 常見的兩種 API 回傳格式

| 格式 | 後端定義 | 回傳 JSON | 前端取資料 |
|------|----------|-----------|-----------|
| 直接陣列 | `list[EventPublic]` | `[{...}, {...}]` | `data.forEach(...)` |
| 包裝物件 | `EventsPublic` (含 data, count) | `{ data: [...], count: n }` | `data.data.forEach(...)` |

## 相關檔案
- 後端：`backend/app/api/routes/events.py`
- 前端：`frontend/src/routes/_layout/vendor-payment-methods.tsx`
