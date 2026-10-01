---
title: "onMutate-optimistic-update"
---

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

畫面 2
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

> **2026-09-22 修正：這條警告寫得太絕對。**
>
> TanStack Query 官方文件（https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates ）的標準寫法，就是在 `onSettled` 裡 `invalidateQueries`。兩邊並不矛盾，差在**時機的主詞**：
>
> - `onSettled` 執行的時候，**這一個** mutation 已經結束了，invalidate 它自己是安全的，refetch 拿回來的就是最終答案
> - 會出事的是另外兩種情況：
>   - a. **另一個** mutation 還在飛。那個 refetch 會拿到不含它樂觀值的資料，把畫面打回去
>   - b. 後端不是立即一致（寫完馬上讀還讀不到新值）。refetch 會拿到寫入前的舊資料
>
> 所以正確的判準是：**要 invalidate，但要確認沒有其他操作還在進行中。** 實務上可以維護一個「還有幾個 mutation 在飛」的計數器，歸零才 refetch；TanStack Query 本身提供 `useMutationState` 與 `useIsMutating` 可以查這件事。
>
> 相關實測：`iThome鐵人賽-2026/Day21-樂觀更新-先假裝成功失敗再回滾.md` 第五節，以及可執行的 `day21-optimistic-update.js` Part 4。那支 demo 的「修法二」就是加了計數器的版本，實測輸出顯示畫面會先閃一下回滾值（601ms）再被 refetch 校正（701ms），最終與資料庫一致。


## ❌ 失敗寫法 4：onSuccess 沒用 server 回應

```typescript
onSuccess: () => {
  // ❌ 沒有用 serverResponse 更新快取
  // 快取裡還是 onMutate 塞的樂觀值，不是 server 的真實資料
},
```

**問題：** 如果 server 回傳的值跟你樂觀猜的不同（例如 server 多加了 `updated_at`），快取就不準了。

## ❌ 失敗寫法 5：兩個 mutation 同時在飛，回滾互相抹掉（2026-09-22 補）

**這一種是把上面四種都避開之後才會遇到的。** 上面四種都寫對了，單一 mutation 完全正確，但併發就會出事。

劇本：使用者按「發布」（伺服器 600ms 才回，而且會失敗），30ms 後又改標題（伺服器 150ms 回，成功）。

```
[A    0ms] onMutate 備份 { draft, 場地規範 }
[畫面   0ms] { published, 場地規範 }          ← A 的樂觀值
[B   30ms] onMutate 備份 { published, 場地規範 }   ← 備份裡含有 A 還沒確定的樂觀值
[畫面  30ms] { published, 場地規範 v2 }        ← B 的樂觀值
[畫面 181ms] { draft, 場地規範 v2 }            ← B 成功，用伺服器回應蓋整份快取 → A 的樂觀值被抹掉，畫面閃回草稿
[畫面 601ms] { draft, 場地規範 }               ← A 失敗，寫回 A 的快照 → 連 B 成功寫進 DB 的新標題一起被還原

畫面：{ draft, 場地規範 }
DB  ：{ draft, 場地規範 v2 }   ← 不一致，而且不會自己修好
```

**根本原因（一句話）：**

> `setQueryData(key, context.previous)` 這一行看起來只是「還原」，實際上是一次**整份覆寫**。回滾寫回的是「那個 mutation 開始時的整個世界」，不是「那個 mutation 改的那一個欄位」。

單一 mutation 的世界裡兩者等價，所以永遠測不出來。同樣的道理也適用在 `onSuccess` 用伺服器回應蓋整份快取。

**三種解法：**

| 解法 | 做法 | 代價 |
|---|---|---|
| 欄位級回滾 | 只備份與只還原自己動過的那幾個 key | 成功時不能直接用整份伺服器回應蓋快取，`updatedAt`、`version`、伺服器產生的 id 拿不到 |
| 讓伺服器收尾 | `onSettled` invalidate，但要等所有 mutation 落地（`useIsMutating` 歸零）才 refetch | 多一次 GET，畫面會先閃一下錯誤的回滾值再被校正 |
| 疊加層模型 | 樂觀值不寫進快取，而是疊一層在真相之上，結束就拿掉那一層（React 19 `useOptimistic` 的模型） | 必須有一個會自己更新的「真相」當底層，所以它綁 Server Actions 與 Transition |

實測與完整程式碼：`iThome鐵人賽-2026/day21-optimistic-update.js` Part 3 到 Part 5。

## Checklist

```
✅ cancelQueries     — 防止正在進行的 refetch 覆蓋
✅ 備份 previous     — API 失敗時能 rollback
✅ return { previous } — 讓 onError 拿得到備份
✅ onSuccess 用 serverResponse 更新 — 確保快取是真實資料
✅ 只 invalidate 列表 — 不 invalidate 正在操作的那筆
✅ 併發時確認沒有其他 mutation 還在飛 — 否則回滾會抹掉別人的成功結果
```
