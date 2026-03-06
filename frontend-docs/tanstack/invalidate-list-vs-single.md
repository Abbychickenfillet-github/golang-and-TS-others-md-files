# 為什麼 invalidate 列表不會覆蓋單筆？

## Abby 的問題

> invalidateQueries 拿到的快取難道就不會覆蓋到現在正要更新的值嗎？
> 就算 invalidate 列表，列表裡也有同一筆資料，refetch 回來不會蓋掉嗎？

## 回答：不會，因為列表和單筆是不同的快取

```
快取 A: ['handbook', 'abc-123']      → 單筆資料
快取 B: ['handbooks', 'event-001']   → 列表資料

這兩個是完全獨立的快取，互不影響。
```

invalidate 列表 → 重新 GET 列表 → 只更新**快取 B**，**不會動到快取 A**。

## 那列表 refetch 回來的資料會是舊的嗎？

**不會**，因為 invalidate 列表是放在 `onSuccess` 裡，這時 PATCH 已經在 server 上成功了：

```
時序（安全）：

  PATCH /handbooks/123 { status: "published" }
      ↓
  Server 更新完成 → DB: status = "published"
      ↓
  onSuccess（API 成功回應後才執行）
      ↓
  invalidate 列表 → GET /handbooks?eventId=x
      ↓
  Server 回傳列表 → 裡面 abc-123 的 status 已經是 "published" ✅
```

## 那 invalidate 單筆為什麼會出問題？

因為樂觀更新 + invalidate 同一筆 = 競態條件：

```
時序（危險）：

  onMutate → 快取改成 { status: "published" }（樂觀更新，UI 立刻變）
      ↓
  PATCH /handbooks/123 送出（還沒回應）
      ↓
  onSettled → invalidate 單筆 → 觸發 GET /handbooks/123
      ↓
  如果 GET 比 PATCH 先處理完：
    → Server 上 status 還是 "draft"
    → GET 回傳 { status: "draft" }
    → 覆蓋快取 A → UI 閃回「草稿」 ❌
```

## 重點整理

| 操作 | 會覆蓋樂觀更新嗎 | 原因 |
|------|-----------------|------|
| `setQueryData(['handbook', id], serverResponse)` | ❌ 不會 | 直接塞值，沒有 refetch |
| `invalidateQueries(['handbooks', eventId])` | ❌ 不會 | 不同快取，互不影響 |
| `invalidateQueries(['handbook', id])` 在 onSettled | ⚠️ 可能會 | 同一筆快取，refetch 可能拿到舊值 |

## 正確做法

```typescript
onSuccess: (serverResponse) => {
  // 單筆：直接塞 server 回應（不 refetch）
  queryClient.setQueryData(['handbook', id], serverResponse)

  // 列表：invalidate（安全，因為 API 已成功，server 資料是新的）
  queryClient.invalidateQueries({ queryKey: ['handbooks', eventId] })
}
```
