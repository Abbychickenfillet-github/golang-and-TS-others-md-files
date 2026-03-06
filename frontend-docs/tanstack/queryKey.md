# QueryKey — React Query 的快取標籤

## QueryKey 是什麼？

queryKey = **API 端點 + 會影響回傳結果的所有條件**，用來辨別「這是哪一筆快取」。

```typescript
useQuery({
  queryKey: ['handbook', 'abc-123'],       // ← 快取標籤
  queryFn: () => api.get('/handbooks/abc-123'), // ← 實際打的 API
})
```

## 條件不同 = queryKey 不同 = 不同的快取

```typescript
['handbooks', 'event-001']               // event-001 的手冊 → 快取 A
['handbooks', 'event-002']               // event-002 的手冊 → 快取 B
['handbooks', 'event-001', { page: 1 }]  // 第 1 頁 → 快取 C
['handbooks', 'event-001', { page: 2 }]  // 第 2 頁 → 快取 D
```

就像 SQL 查詢條件不同，結果就不同：

```
queryKey                                ≈  SQL
['handbooks', 'event-001']             ≈  SELECT * FROM handbooks WHERE event_id = 'event-001'
['handbooks', 'event-001', { page:2 }] ≈  SELECT * FROM handbooks WHERE event_id = 'event-001' OFFSET 20
['handbook', 'abc-123']                ≈  SELECT * FROM handbooks WHERE id = 'abc-123'
```

## 為什麼是陣列？

用**層級**組織，方便批次操作：

```typescript
['handbooks']                    // 所有手冊列表
['handbooks', 'event-001']       // event-001 的手冊列表
['handbook', 'abc-123']          // 單一手冊
```

invalidate 時會**前綴匹配**，像檔案路徑的 `/handbooks/*`：

```typescript
queryClient.invalidateQueries({ queryKey: ['handbooks'] })
// → ['handbooks']              ✅ 過期
// → ['handbooks', 'event-001'] ✅ 也過期（前綴匹配）
// → ['handbook', 'abc-123']    ❌ 不影響（不同前綴）
```

## 常見命名慣例

```typescript
// 列表用複數
['handbooks', eventId]
['events', { status: 'published' }]

// 單筆用單數
['handbook', handbookId]
['event', eventId]
```

## queryKey 用在哪？

```typescript
// 1. 定義 query（貼標籤）
useQuery({
  queryKey: ['handbook', id],
  queryFn: () => api.get(`/handbooks/${id}`),
})

// 2. 直接改快取（用標籤找到它）
queryClient.setQueryData(['handbook', id], newData)

// 3. 標記過期（用標籤讓它失效）
queryClient.invalidateQueries({ queryKey: ['handbook', id] })

// 4. 讀取快取（用標籤取值）
const data = queryClient.getQueryData(['handbook', id])
```
