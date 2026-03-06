# invalidateQueries 與樂觀更新的衝突

## 可以用 invalidateQueries 嗎？

**可以用，但不要 invalidate 正在樂觀更新的那筆資料。**

## 問題：invalidate 同一筆 → UI 回彈

```typescript
// ❌ 錯誤寫法
useMutation({
  mutationFn: (data) => api.patch(`/handbooks/${id}`, data),

  onMutate: async (newData) => {
    const previous = queryClient.getQueryData(['handbook', id])
    queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))
    return { previous }
  },

  onSettled: () => {
    // 這會重新 GET /handbooks/123 → 拿回舊資料覆蓋樂觀更新
    queryClient.invalidateQueries({ queryKey: ['handbook', id] })
  },
})
```

### 為什麼會回彈？

```
onMutate → 快取改成 { status: "published" } → UI 顯示「已發布」
    ↓
API 成功（但 server 回應還沒回來）
    ↓
onSettled → invalidateQueries → 觸發 GET /handbooks/123
    ↓
GET 回應回來 → 寫入快取 → 但如果這個 GET 比 PATCH 的回應先打到 server...
    → 拿到的還是舊的 { status: "draft" }
    → UI 閃回「草稿」
    → 過一會兒才變回「已發布」（下次 refetch）
```

## 正確做法

### 方法 1：onSuccess 用 server 回應 + 只 invalidate 列表

```typescript
useMutation({
  mutationFn: (data) => api.patch(`/handbooks/${id}`, data),

  onMutate: async (newData) => {
    const previous = queryClient.getQueryData(['handbook', id])
    queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))
    return { previous }
  },

  onSuccess: (serverResponse) => {
    // 用 server 回傳的真實資料更新這筆
    queryClient.setQueryData(['handbook', id], serverResponse)

    // 只 invalidate「列表」，不 invalidate 正在操作的這筆
    queryClient.invalidateQueries({ queryKey: ['handbooks', eventId] })
    //                                         ^^^^^^^^^^^ 列表 key（複數）
  },

  onError: (err, newData, context) => {
    queryClient.setQueryData(['handbook', id], context.previous)
  },
})
```

### 方法 2：不做樂觀更新，直接 invalidate

如果不需要即時 UI 回饋，最簡單：

```typescript
useMutation({
  mutationFn: (data) => api.patch(`/handbooks/${id}`, data),

  onSuccess: () => {
    // 不做樂觀更新，等 refetch 完才更新 UI
    queryClient.invalidateQueries({ queryKey: ['handbook', id] })
  },
})
```

這樣沒有回彈問題，只是使用者要多等一下。

## 總結

| 情境 | invalidateQueries | 會不會回彈 |
|------|-------------------|-----------|
| invalidate **正在樂觀更新的那筆** | `['handbook', id]` | ⚠️ 可能回彈 |
| invalidate **列表**（別筆） | `['handbooks', eventId]` | ✅ 安全 |
| **不做**樂觀更新，直接 invalidate | `['handbook', id]` | ✅ 安全（沒樂觀更新就沒衝突） |

**規則：樂觀更新的那筆用 `setQueryData(server 回應)` 更新，其他相關的列表才用 `invalidateQueries`。**
