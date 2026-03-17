# Chakra UI isRequired 與自訂搜尋選擇器衝突問題

## Q: 發生了什麼事？

AddOrder 表單裡，我明明選了買方公司（JESSIEJC），畫面上也看到藍色底色代表已選中，但按儲存的時候瀏覽器跳出「請填寫這個欄位。」，表單送不出去。

## Q: 「請填寫這個欄位。」是誰顯示的？

這是**瀏覽器內建的 HTML5 表單驗證訊息**，不是我們的 toast。
當一個 `<input>` 有 `required` 屬性，但 `value` 是空字串，瀏覽器會自動擋住表單送出。

## Q: required 屬性是怎麼跑到 input 上的？

Chakra UI 的 `<FormControl isRequired>` 會透過 React Context 自動把 `required` 傳給裡面所有的 Chakra input 元件。

所以寫：
```tsx
<FormControl isRequired>
  <EntitySearchSelector ... />
</FormControl>
```

等於讓 `EntitySearchSelector` 裡面的 `<Input>` 被加上 `required`。

## Q: 可是我選了 JESSIEJC 啊，為什麼 input 是空的？

因為 `EntitySearchSelector` 的 `<Input>` 不是存「選中的值」，而是存「搜尋關鍵字」。

整個流程是這樣的：

1. 你在搜尋框打「JES」 → `searchText = "JES"`，input 顯示「JES」
2. 下拉選單出現 JESSIEJC，你點擊它
3. `handleSelect()` 執行：
   - `onChange("4806558b-...")` → 把 UUID 存到 `buyerCompanyId` state（✅ 有值）
   - `setSearchText("")` → 清空搜尋框（⚠️ input value 變空）
   - 關閉下拉選單
4. input 的 placeholder 顯示「JESSIEJC」（看起來有選中）
5. 但 input 的 `value` 其實是 `""`（空字串）

## Q: 為什麼選完要清空 searchText？

這是刻意的設計：
- 清空後，input 用 `placeholder` 顯示已選的名稱（灰色字）
- 下次點擊時，使用者可以直接打字搜尋，不用先手動全選刪掉舊文字
- 如果不清空，searchText 會是「JES」而不是完整名稱，看起來反而怪

## Q: 所以問題是 isRequired 看的是 input value，但實際值存在 state？

對！這就是衝突點：

| 層級 | 看什麼 | 值 |
|------|--------|-----|
| React state | `buyerCompanyId` | `"4806558b-..."` ✅ |
| DOM input | `value` (searchText) | `""` ❌ |
| HTML5 驗證 | DOM input 的 value | `""` → 擋住送出 |

兩套系統看不同的東西，所以打架了。

## Q: 怎麼修？

不用 `isRequired`，改成：

```tsx
// 手動加 * 標示必填（純視覺）
<FormControl>
  <FormLabel>買方公司 *</FormLabel>
  <EntitySearchSelector ... />
</FormControl>
```

驗證邏輯放在 `onSubmit` 裡用 toast：
```tsx
if (!buyerCompanyId.trim()) {
  showToast("錯誤", "請選擇買方公司", "error")
  return
}
```

## Q: 什麼時候可以用 isRequired？

只有 input 的 `value` 直接對應 state 的時候，例如：
- `<Input {...register("email")}` → value 就是表單的值 ✅
- `<Select {...register("event_id")}` → value 就是選中的值 ✅

不能用的情況：
- `EntitySearchSelector` → input value 是搜尋文字，不是選中值 ❌
- `MemberSearchSelector` → 同上 ❌
- `CompanyMemberSelector` → 同上 ❌

## 總結

> `isRequired` 只適合 input value = 實際值的元件。
> 自訂的搜尋選擇器因為 input value（搜尋文字）和實際選中值（state UUID）分離，
> 不能用 `isRequired`，要改成 onSubmit 手動驗證。
