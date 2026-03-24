# 解開指標（Dereference）

> 相關：[指標基礎](golang-pointer-asterisk.md) | [指標、Nil、Struct 觀念](pointer-method-struct-explainer.md)

## 一句話解釋

**解開指標 = 用 `*` 把指標裡存的記憶體位址「打開」，拿出裡面真正的值。**

## 生活比喻

| 動作 | 比喻 |
|------|------|
| 指標本身 `req.IsFree` | 手上拿著一張紙條，寫著「答案放在書架第 3 層」 |
| 解開指標 `*req.IsFree` | 照著紙條去書架第 3 層，把答案拿出來 |
| 空指標 `nil` | 紙條是空白的，硬去找就會 panic 崩潰 |

## 語法

```go
// & 是打包：值 → 指標
value := true
ptr := &value      // ptr 的型別是 *bool，存的是 value 的記憶體位址

// * 是解開：指標 → 值
back := *ptr       // back 的型別是 bool，值是 true
```

```
打包（&）：  true  ──→  0xC0000B4010（記憶體位址）
解開（*）：  0xC0000B4010  ──→  true
```

## 為什麼不能直接用，要先解開？

因為指標和值的**型別不同**，不能直接賦值：

```go
var isFree *bool   // 指標型別
var result bool    // 值型別

result = isFree    // 編譯錯誤！*bool 不能直接給 bool
result = *isFree   // 正確！先解開，拿出 bool 值
```

## 解開之前一定要檢查 nil

如果指標是 `nil`（沒指向任何東西），解開會直接 **panic 崩潰**：

```go
var ptr *bool = nil
fmt.Println(*ptr)   // panic: runtime error: invalid memory address
```

所以實務上一定先檢查：

```go
if req.IsFree != nil {           // 先確認不是 nil
    program.IsFree = *req.IsFree // 才安全解開
}
```

> 參考實際用法：[DTO 指標 vs Model 值](dto-pointer-vs-model-value.md)

## 常見場景

### 1. DTO 部分更新（最常見）

> 參考：`backend-go/internal/service/event_coupon_service.go:295`

```go
if req.Name != nil {
    program.Name = *req.Name        // 解開 *string → string
}
if req.IsFree != nil {
    program.IsFree = *req.IsFree    // 解開 *bool → bool
}
if req.CouponValue != nil {
    program.CouponValue = *req.CouponValue  // 解開 *int → int
}
```

### 2. Repository 回傳值檢查

```go
order, err := repo.GetByID(ctx, id)  // order 是 *models.Order
if order == nil {
    return nil, ErrNotFound           // 指標是 nil，不能解開
}
fmt.Println(order.Status)             // Go 自動解開，等同 (*order).Status
```

> 注意：Go 在用 `.` 存取 struct 欄位時會**自動解開指標**，不需要手動寫 `*`。
> 但基本型別（`*bool`、`*string`、`*int`）不會自動解開，必須手動用 `*`。

## 自動解開 vs 手動解開

| 情況 | 需要手動 `*`？ | 例子 |
|------|---------------|------|
| struct 指標存取欄位 | 不用，Go 自動幫你 | `order.Status`（等同 `(*order).Status`） |
| 基本型別指標取值 | **要**，必須手動 | `*req.IsFree` |
| 賦值給非指標變數 | **要**，必須手動 | `name := *req.Name` |
