# Chakra UI isRequired 與自訂搜尋選擇器衝突問題

## 問題

`<FormControl isRequired>` 包裹 `EntitySearchSelector`（或 `MemberSearchSelector`、`CompanyMemberSelector`）時，表單無法送出，瀏覽器顯示「請填寫這個欄位。」的 HTML5 原生驗證訊息。

## 原因

Chakra 的 `isRequired` 會透過 React Context 把 `required` 屬性傳給內部的 `<Input>`。

但 `EntitySearchSelector` 的 `<Input>` 是**搜尋框**，`value` 綁的是 `searchText` state：
- 使用者搜尋 → 選了一個選項 → `handleSelect()` 把選中的 id 透過 `onChange(id)` 傳出去
- 同時 `setSearchText("")` 清空搜尋框，讓 placeholder 顯示已選項目的名稱

所以選完之後：
- **React state**：`buyerCompanyId` 有值（正確）
- **DOM input**：`value=""` 空字串（因為 searchText 被清空了）
- **瀏覽器**：看到 `required` 的 input 是空的 → 擋住 form submit

## 解法

`EntitySearchSelector` 系列的元件不要用 `isRequired`，改成：

```tsx
// ❌ 錯誤：HTML5 驗證會跟搜尋框打架
<FormControl isRequired>
  <FormLabel>買方公司</FormLabel>
  <EntitySearchSelector ... />
</FormControl>

// ✅ 正確：手動標示 *，驗證邏輯放在 onSubmit
<FormControl>
  <FormLabel>買方公司 *</FormLabel>
  <EntitySearchSelector ... />
</FormControl>

// onSubmit 裡手動檢查
if (!buyerCompanyId.trim()) {
  showToast("錯誤", "請選擇買方公司", "error")
  return
}
```

## 為什麼 searchText 會清空？

`EntitySearchSelector` 的 `handleSelect` 函數：
```tsx
const handleSelect = (id: string) => {
  onChange(id)          // 把選中的 ID 傳出去（setState）
  setSearchText("")    // 清空搜尋框
  setIsDropdownOpen(false)
}
```

清空是正確行為 — 選完後搜尋框用 placeholder 顯示已選的名稱，而不是把名稱塞進 input value。
這樣使用者再點擊時可以直接打字搜尋，不用先手動清掉文字。

## 影響範圍

所有用 `EntitySearchSelector` 為基底的元件都有這個問題：
- `EntitySearchSelector`
- `MemberSearchSelector`
- `CompanyMemberSelector`
- `CompanySelector`（如果有用 isRequired 包裹）

## 結論

`isRequired` 只適合用在原生 `<Input>`、`<Select>` 等 value 直接反映 state 的元件。
自訂的搜尋選擇器因為 input value 和實際選中值分離，不能用 `isRequired`。
