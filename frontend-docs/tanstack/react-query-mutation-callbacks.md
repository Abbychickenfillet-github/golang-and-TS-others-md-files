# TanStack Query (React Query) — useMutation 的 4 個 Callback

## 總覽

```
使用者觸發 mutation（例如按下儲存按鈕）
        │
        ▼
   ① onMutate        ← mutation 發送「前」執行
        │
        ▼
    發送 API 請求...
        │
   ┌────┴────┐
   成功      失敗
   │         │
   ▼         ▼
② onSuccess ③ onError
   │         │
   └────┬────┘
        ▼
   ④ onSettled        ← 不論成敗都執行（像 finally）
```

---

## ① onMutate — mutation 發送前

```typescript
onMutate: async (variables) => {
  // variables = 你傳入 mutate() 的參數

  // 常見用途：Optimistic Update（樂觀更新）
  // 先假設 API 會成功，提前更新 UI

  const queryKey = ['handbook', variables.eventId, variables.handbookId]

  // 1. 取消正在進行的 refetch（避免覆蓋我們的樂觀更新）
  await queryClient.cancelQueries({ queryKey })

  // 2. 備份舊資料（萬一 API 失敗要 rollback）
  const previous = queryClient.getQueryData(queryKey)

  // 3. 立即更新 cache → UI 馬上反映新值
  queryClient.setQueryData(queryKey, (old: any) =>
    old ? { ...old, ...variables.data } : old
  )

  // 4. 回傳 context（給 onError 用來 rollback）
  return { previous, queryKey }
}
```

**參數**: `(variables)`
- `variables` = 呼叫 `mutate(variables)` 時傳入的參數

**回傳值**: 會變成 `onError` 和 `onSettled` 的第三個參數 `context`

---

## ② onSuccess — API 成功回傳後

```typescript
onSuccess: (data, variables, context) => {
  // data     = API 回傳的 response body（server 實際回傳的資料）
  // variables = 你傳入 mutate() 的參數
  // context  = onMutate 的回傳值

  // 常見用途：用 server response 更新 cache
  queryClient.setQueryData(
    ['handbook', variables.eventId, variables.handbookId],
    data,  // ← 直接用 server 回傳的完整資料，最可靠
  )

  // 只 invalidate 列表（不要 invalidate 單一資源，避免多餘 refetch）
  queryClient.invalidateQueries({ queryKey: ['handbooks', variables.eventId] })
}
```

**參數**: `(data, variables, context)`
- `data` = server 回傳的 response（最重要！這是真實資料）
- `variables` = 你傳入 mutate() 的參數
- `context` = onMutate 回傳的東西

---

## ③ onError — API 失敗時

```typescript
onError: (error, variables, context) => {
  // error    = 錯誤物件
  // variables = 你傳入 mutate() 的參數
  // context  = onMutate 的回傳值

  // 常見用途：Rollback 樂觀更新
  if (context?.previous) {
    queryClient.setQueryData(context.queryKey, context.previous)
  }

  toast({ title: '更新失敗', status: 'error' })
}
```

**參數**: `(error, variables, context)`
- `error` = 錯誤資訊
- `context` = onMutate 回傳的備份資料，用來還原

---

## ④ onSettled — 不論成功或失敗都執行

```typescript
onSettled: (data, error, variables, context) => {
  // data     = 成功時有值，失敗時 undefined
  // error    = 失敗時有值，成功時 null
  // variables = 你傳入 mutate() 的參數
  // context  = onMutate 的回傳值

  // 類似 try/catch 的 finally

  // 常見用途：invalidate queries 確保資料最新
  queryClient.invalidateQueries({ queryKey: ['handbooks'] })
}
```

**參數**: `(data, error, variables, context)`

---

## 常見陷阱：onSettled 的 invalidate 會覆蓋 optimistic update

### 錯誤寫法（會造成 UI 回彈）

```typescript
useMutation({
  mutationFn: ...,
  onMutate: async (variables) => {
    // 樂觀更新：UI 立即顯示新值 ✓
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...variables.data }))
    return { previous }
  },
  onSettled: () => {
    // 這會觸發 refetch → refetch response 覆蓋樂觀更新 → UI 回彈 ✗
    queryClient.invalidateQueries({ queryKey: ['handbook', eventId, handbookId] })
  },
})
```

**時序問題**：
```
onMutate → cache 更新 → UI 顯示新值
    ↓
API 成功
    ↓
onSettled → invalidateQueries → 觸發 refetch
    ↓
refetch response 寫入 cache → UI 可能閃回舊值
```

### 正確寫法

```typescript
useMutation({
  mutationFn: ...,
  onMutate: async (variables) => {
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...variables.data }))
    return { previous }
  },
  onSuccess: (data, variables) => {
    // 用 server 的真實 response 更新 cache（不觸發 refetch）
    queryClient.setQueryData(queryKey, data)
    // 只 invalidate「列表」query，不要 invalidate 正在操作的那筆
    queryClient.invalidateQueries({ queryKey: ['handbooks', variables.eventId] })
  },
  onError: (_err, _variables, context) => {
    // 失敗就 rollback
    if (context?.previous) {
      queryClient.setQueryData(context.queryKey, context.previous)
    }
  },
})
```

---

## 速查表

| Callback    | 何時執行       | 第一個參數        | 常見用途                    |
| ----------- | -------------- | ----------------- | --------------------------- |
| `onMutate`  | API 發送前     | `variables`       | Optimistic update + 備份    |
| `onSuccess` | API 成功後     | `data`(server 回傳) | 用 response 更新 cache     |
| `onError`   | API 失敗時     | `error`           | Rollback 樂觀更新           |
| `onSettled` | 成功或失敗都執行 | `data` or `undefined` | invalidate queries（小心使用）|

## 實際案例：FutureSign 手冊 visibility 切換

詳見 GitHub Issue: https://github.com/yutuo-tech/future_sign.official-website/issues/93

修改檔案：`src/lib/hooks/useHandbooks.ts` — `useUpdateHandbook()`

---

## Optimistic Update（樂觀更新）完整解釋

### 什麼是樂觀更新？

**先假設 API 會成功，立刻更新 UI，不等 server 回應。**

```
沒有樂觀更新（悲觀）：
  按下按鈕 → 轉圈等 API → 成功 → 更新 UI（使用者要等 0.5~2 秒）

有樂觀更新（樂觀）：
  按下按鈕 → 立刻更新 UI → 同時打 API
                              ├── 成功 → 沒事，UI 早就對了
                              └── 失敗 → 把 UI 改回去（rollback）
```

### `context.previous` 是什麼？

`context.previous` 是 **API 打之前，前端快取裡的舊資料備份**。

它不是：
- ❌ HTTP 狀態碼
- ❌ 輸入框的值
- ❌ 資料庫的資料

它是：
- ✅ React Query 快取在記憶體裡的資料（之前從 API 拿回來存著的）

### 具體例子 — 按讚

```typescript
// 目前快取：{ likes: 100 }（之前從 GET /api/post/1 拿回來的）

useMutation({
  mutationFn: () => api.post('/like'),

  onMutate: async () => {
    // 1. 備份目前快取的值
    const previous = queryClient.getQueryData(['post', 1])
    // previous = { likes: 100 }

    // 2. 樂觀更新：立刻把快取改成 101，UI 馬上顯示 101
    queryClient.setQueryData(['post', 1], { likes: 101 })

    // 3. 把備份丟出去，萬一要 rollback
    return { previous }
    //       ^^^^^^^^ 這就是 context.previous
  },

  onError: (err, variables, context) => {
    // API 失敗了！用備份還原快取 → UI 改回 100
    queryClient.setQueryData(['post', 1], context.previous)
  },
})
```

### 完整時序圖

```
使用者按讚
    │
    ▼
onMutate 執行
    ├── previous = 快取裡的 { likes: 100 }（備份）
    ├── 把快取改成 { likes: 101 }（UI 立刻顯示 101）
    └── return { previous }
    │
    ▼
同時打 POST /api/like
    │
    ├── ✅ 成功 → onSuccess
    │       └── 用 server 回傳的真實資料更新快取
    │           （可能 server 說其實是 102，因為別人也按了讚）
    │
    └── ❌ 失敗 → onError
            └── queryClient.setQueryData(['post', 1], context.previous)
                把快取改回 { likes: 100 }（UI 回到 100）
```

### 為什麼要備份？

因為樂觀更新會**在 API 回應之前就改掉快取**。如果 API 失敗，快取裡已經是錯的值了，你需要知道「之前是什麼」才能還原。

```
快取變化：
  原本: { likes: 100 }
  onMutate 後: { likes: 101 }  ← 已經被改了
  API 失敗: 要改回 100，但 100 去哪了？
             → 存在 context.previous 裡！
```

### 不用樂觀更新的情況

如果不需要即時 UI 回饋，可以不寫 `onMutate`，直接在 `onSuccess` 裡 invalidate：

```typescript
useMutation({
  mutationFn: () => api.patch('/handbook', data),
  onSuccess: () => {
    // API 成功後才重新 fetch，UI 等 server 回應才更新
    queryClient.invalidateQueries({ queryKey: ['handbook'] })
  },
})
```

這樣不需要 backup，但使用者體驗會慢一點。
