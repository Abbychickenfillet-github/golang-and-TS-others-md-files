# React Hook Form 數字驗證 - 負數問題

## 問題描述
在 `products.tsx` 中，即使有設定 `min={0}` 和 React Hook Form 的 `min` 驗證，使用者仍然可以：
1. 用 stepper（上下箭頭）輸入負數
2. 複製貼上負數
3. 表單提交時沒有顯示錯誤訊息

## 根本原因

### 1. `min={0}` 放在 `{...register()}` 之前
```jsx
// 錯誤寫法 - min 可能被 register 覆蓋
<Input
  min={0}
  {...register("total_quantity")}
/>

// 正確寫法 - min 放在 register 之後
<Input
  {...register("total_quantity")}
  min={0}
/>
```

### 2. 沒有使用 `valueAsNumber`
React Hook Form 預設把 input 值當作字串處理。驗證 `value >= 0` 時，如果 value 是字串 `"-8"`，比較結果可能不正確。

```jsx
// 加上 valueAsNumber 確保值是數字
register("total_quantity", {
  valueAsNumber: true,
  min: { value: 0, message: "不能為負數" },
})
```

### 3. 沒有顯示錯誤訊息
需要：
- 從 `formState` 取得 `errors`
- 在 `FormControl` 加上 `isInvalid={!!errors.field_name}`
- 加入 `<FormErrorMessage>` 元件

### 4. 複製貼上可以繞過 onKeyDown
需要加上 `onPaste` 事件處理

## 完整修復範例

```tsx
const {
  register,
  handleSubmit,
  formState: { isSubmitting, errors },  // 取得 errors
} = useForm<{ total_quantity: number }>()

// ...

<FormControl isInvalid={!!errors.total_quantity}>
  <FormLabel>總庫存</FormLabel>
  <Input
    type="number"
    {...register("total_quantity", {
      required: "總庫存為必填",
      valueAsNumber: true,  // 重要！確保值是數字
      min: { value: 0, message: "庫存數量不能為負數" },
      validate: (value) =>
        (typeof value === "number" && value >= 0) ||
        "庫存數量不能為負數",
    })}
    min={0}  // 放在 register 之後
    onKeyDown={(e) => {
      // 阻止輸入負號和科學記號
      if (e.key === "-" || e.key === "e") {
        e.preventDefault()
      }
    }}
    onPaste={(e) => {
      // 阻止貼上負數
      const pastedData = e.clipboardData.getData("text")
      if (pastedData.includes("-") || Number(pastedData) < 0) {
        e.preventDefault()
      }
    }}
  />
  <FormErrorMessage>
    {errors.total_quantity?.message}
  </FormErrorMessage>
</FormControl>
```

## Chakra UI 注意事項

記得 import `FormErrorMessage`：
```tsx
import {
  FormControl,
  FormErrorMessage,  // 需要這個！
  FormLabel,
} from "@chakra-ui/react"
```

## 相關檔案
- `futuresign.dashboard/src/routes/_layout/products.tsx`
  - EditProductModal: ~line 1010
  - AddProductModal: ~line 1490

## 日期
2026-02-02
