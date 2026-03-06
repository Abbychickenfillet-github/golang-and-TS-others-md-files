# context.previous — 樂觀更新的備份機制

## context.previous 是什麼？

`context.previous` 是**樂觀更新才需要的東西**，存的是「API 打之前，前端快取裡的舊資料」。

不做樂觀更新 → 不需要 backup → 不需要 `context.previous`。

## 前端快取 vs DB

**前端快取 = 上一次 GET 回來的資料快照**，不是即時連線到 DB。

大部分時候一樣，但有可能不同步：

```
你和同事同時在看同一個活動

10:00  你載入頁面 → GET /event/1 → 快取 = { name: "春季展" }
10:01  同事改了活動名稱 → DB 變成 { name: "夏季展" }
10:02  你的快取還是 { name: "春季展" } ← 跟 DB 不一樣了！
10:03  你重新整理頁面 → GET /event/1 → 快取更新為 { name: "夏季展" }
```

## 那為什麼還要備份快取？

因為樂觀更新要防的是**「自己的操作失敗」**，不是防別人改資料。

### 範例 — 手冊發布狀態切換

```
你按下「發布」按鈕（樂觀更新）

  快取: { status: "draft" }
    │
    ▼
  onMutate: 備份 previous = { status: "draft" }
            快取改成 { status: "published" }  ← UI 立刻顯示「已發布」
    │
    ▼
  同時打 PATCH /api/handbooks/123  { status: "published" }
    │
    ├── ✅ 成功 → DB 也變成 published，沒事
    │
    └── ❌ 失敗（例如網路斷了）
            → 這次操作根本沒寫進 DB
            → 但 UI 已經顯示「已發布」了
            → 用 context.previous 把快取改回 { status: "draft" }
            → UI 恢復顯示「草稿」
```

### 對應程式碼

```typescript
useMutation({
  mutationFn: (data) => api.patch(`/handbooks/${id}`, data),

  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['handbook', id] })

    // 備份：快取裡目前的值（上次 GET 回來的）
    const previous = queryClient.getQueryData(['handbook', id])
    // previous = { status: "draft", title: "場地規範", ... }

    // 樂觀更新：立刻改快取，UI 馬上反映
    queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))

    return { previous }
  },

  onError: (err, newData, context) => {
    // API 失敗 → 用備份還原
    queryClient.setQueryData(['handbook', id], context.previous)
  },
})
```

## 總結

```
context.previous
  ├── 是什麼？  前端快取的備份（上次 GET 回來的資料）
  ├── 誰產生的？ onMutate 裡 return { previous } 出去的
  ├── 誰用的？   onError 裡拿來 rollback
  ├── 什麼時候需要？ 做樂觀更新的時候
  └── 不做樂觀更新？ 不需要 context.previous
```
