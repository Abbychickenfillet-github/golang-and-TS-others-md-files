# TypeScript `Partial<T>` 工具型別

## 什麼是 `Partial<T>`？

`Partial<T>` 會把一個型別的**所有欄位變成可選（optional）**。

## 實際例子

```typescript
// 原始型別：所有欄位都是必填
interface OrderDraft {
  version: number       // 必填
  eventId: string       // 必填
  boothId: string       // 必填
  equipment: Item[]     // 必填
}

// Partial<OrderDraft> 等於：
interface OrderDraftPartial {
  version?: number      // 可選
  eventId?: string      // 可選
  boothId?: string      // 可選
  equipment?: Item[]    // 可選
}
```

## 為什麼要用？

用在「只更新部分欄位」的場景。

```typescript
// 不用 Partial 的話，每次都要傳所有欄位
saveDraft({
  version: 1,
  eventId: 'abc',
  boothId: 'booth-1',
  equipment: [],
  vendorPaymentMethods: [],
  createdAt: Date.now(),
})

// 用 Partial 的話，只傳你要更新的欄位就好
saveDraft({ boothId: 'booth-1' })              // 步驟 1：只存攤位
saveDraft({ electricity: { wattage: 500 } })   // 步驟 2：只存電力
saveDraft({ equipment: [...] })                // 步驟 3：只存設備
```

## useOrderDraft 中的用法

```typescript
const saveDraft = (partial: Partial<OrderDraft>) => {
    const existing = getDraft()          // 讀取已存在的 draft
    const merged: OrderDraft = {
      version: DRAFT_VERSION,            // 預設值
      eventId,
      boothId: '',
      equipment: [],
      vendorPaymentMethods: [],
      createdAt: Date.now(),
      ...existing,                       // 用已存在的覆蓋預設值
      ...partial,                        // 用傳入的覆蓋全部（最高優先）
    }
    localStorage.setItem(key, JSON.stringify(merged))
}
```

合併優先順序：`預設值 < existing（舊的） < partial（新傳入的）`

## 其他常見工具型別

| 型別 | 作用 | 例子 |
|------|------|------|
| `Partial<T>` | 所有欄位變可選 | `Partial<User>` → 所有欄位加 `?` |
| `Required<T>` | 所有欄位變必填 | `Required<User>` → 移除所有 `?` |
| `Pick<T, K>` | 只取指定欄位 | `Pick<User, 'id' \| 'name'>` |
| `Omit<T, K>` | 排除指定欄位 | `Omit<User, 'password'>` |
