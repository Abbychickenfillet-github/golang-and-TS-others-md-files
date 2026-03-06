# invalidateQueries — 使快取失效，重新 fetch

## invalidate 是什麼意思？

invalidate = **使失效 / 標記為過期**。

`invalidateQueries` 就是告訴 React Query：「這份快取不新鮮了，重新去 server 拿。」

```typescript
queryClient.invalidateQueries({ queryKey: ['handbooks', eventId] })
// → 標記過期 → React Query 自動重新 GET /handbooks?eventId=x
```

## 單筆 vs 列表

頁面通常有兩種 query：

```
單筆：GET /handbooks/123        → queryKey: ['handbook', id]
列表：GET /handbooks?eventId=x  → queryKey: ['handbooks', eventId]
```

它們是**各自獨立的快取**，改了單筆不會自動更新列表。

## invalidate 列表是什麼意思？

```
你把手冊從「草稿」改成「已發布」

單筆快取：['handbook', '123']
  → 用 setQueryData 直接塞 server 回應（最快，不用重新 fetch）

列表快取：['handbooks', eventId]
  → 列表裡也有這筆手冊，狀態還是顯示「草稿」
  → invalidate 列表 → React Query 重新 GET → 列表也更新成「已發布」
```

## setQueryData vs invalidateQueries

| 方法 | 做了什麼 | 會打 API 嗎 |
|------|---------|------------|
| `setQueryData(key, data)` | 直接把資料塞進快取 | 不會 |
| `invalidateQueries(key)` | 標記快取過期，觸發重新 fetch | 會 |

```typescript
// 直接改快取，不打 API
queryClient.setQueryData(['handbook', id], serverResponse)

// 標記過期，React Query 自動重新 GET
queryClient.invalidateQueries({ queryKey: ['handbooks', eventId] })
```

## 實際用法

```typescript
onSuccess: (serverResponse) => {
  // 1. 單筆：直接用 server 回應更新（快，不用等）
  queryClient.setQueryData(['handbook', id], serverResponse)

  // 2. 列表：invalidate，讓 React Query 重新 fetch（確保列表也是最新的）
  queryClient.invalidateQueries({ queryKey: ['handbooks', eventId] })
}
```

## 一句話

`invalidateQueries` = 「這份快取不新鮮了，重新去 server 拿。」
