# onMutate 樂觀更新 — 正確寫法 vs 失敗寫法

## 樂觀更新三步驟

```
1. cancelQueries + QueryKey取消正在進行的 refetch（避免覆蓋樂觀更新）
2. 備份舊資料（萬一 API 失敗要 rollback）
3. 立即更新快取（UI 馬上反映）
```

## ✅ 正確寫法

```typescript
useMutation({
  mutationFn: (data) => api.patch(`/handbooks/${id}`, data),

  // 1. API 打之前：備份 + 樂觀更新
  onMutate: async (newData) => {
    // 取消正在進行的 refetch，避免它覆蓋我們的樂觀更新
    await queryClient.cancelQueries({ queryKey: ['handbook', id] })

    // 備份目前快取的值
    const previous = queryClient.getQueryData(['handbook', id])

    // 立即更新快取 → UI 馬上反映新值
    queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))

    // 把備份丟出去給 onError 用
    return { previous }
  },

  // 2. API 成功：用 server 回應更新（最可靠）
  onSuccess: (serverResponse) => {
    queryClient.setQueryData(['handbook', id], serverResponse)
    // 只 invalidate 列表，不 invalidate 正在操作的這筆
    queryClient.invalidateQueries({ queryKey: ['handbooks', eventId] })
  },

  // 3. API 失敗：用備份還原
  onError: (err, newData, context) => {
    queryClient.setQueryData(['handbook', id], context.previous)
    toast.error('更新失敗')
  },
})
```

## ❌ 失敗寫法 1：沒有 cancelQueries

```typescript
onMutate: async (newData) => {
  // ❌ 沒有 cancelQueries
  const previous = queryClient.getQueryData(['handbook', id])
  queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))
  return { previous }
},
```

**問題：** 如果剛好有一個 refetch 正在進行，它的回應會覆蓋你的樂觀更新。

```
onMutate → 快取改成 { status: "published" }
    ↓
之前觸發的 refetch 回來了 → 快取被覆蓋成 { status: "draft" }
    ↓
UI 閃回「草稿」 💥
```

## ❌ 失敗寫法 2：沒有備份

```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ['handbook', id] })
  // ❌ 沒有備份 previous
  queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))
  // ❌ 沒有 return
},

onError: (err, newData, context) => {
  // context.previous 是 undefined，無法 rollback 💥
  queryClient.setQueryData(['handbook', id], context.previous)
},
```

**問題：** API 失敗時不知道舊值是什麼，無法還原 UI。

## ❌ 失敗寫法 3：onSettled 裡 invalidate 同一筆

```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ['handbook', id] })
  const previous = queryClient.getQueryData(['handbook', id])
  queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))
  return { previous }
},

// ❌ invalidate 正在樂觀更新的那筆
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['handbook', id] })
},
```

**問題：** invalidate 觸發 refetch，可能拿到舊值覆蓋樂觀更新，UI 回彈。

## ❌ 失敗寫法 4：onSuccess 沒用 server 回應

```typescript
onSuccess: () => {
  // ❌ 沒有用 serverResponse 更新快取
  // 快取裡還是 onMutate 塞的樂觀值，不是 server 的真實資料
},
```

**問題：** 如果 server 回傳的值跟你樂觀猜的不同（例如 server 多加了 `updated_at`），快取就不準了。

## Checklist

```
✅ cancelQueries     — 防止正在進行的 refetch 覆蓋
✅ 備份 previous     — API 失敗時能 rollback
✅ return { previous } — 讓 onError 拿得到備份
✅ onSuccess 用 serverResponse 更新 — 確保快取是真實資料
✅ 只 invalidate 列表 — 不 invalidate 正在操作的那筆
```
