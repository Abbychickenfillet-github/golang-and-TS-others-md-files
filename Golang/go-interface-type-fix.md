# Go 介面型別修正筆記

## 問題 1：介面名稱錯誤

```go
// ❌ 錯誤：RefundRecordRepository 不存在
refundRepo repository.RefundRecordRepository

// ✓ 正確：使用實際定義的介面名稱
refundRepo repository.RefundRepository
```

**原因**：Go 編譯器會檢查 interface 是否存在，名稱必須完全匹配。

---

## 問題 2：指標 vs 值的比較

```go
// ❌ 錯誤：*string != string 無法比較
if order.BuyerID != memberID {

// ✓ 正確：先檢查 nil，再解引用比較
if order.BuyerID == nil || *order.BuyerID != memberID {
```

**解釋**：
- `order.BuyerID` 是 `*string`（指標）
- `memberID` 是 `string`（值）
- 不同型別無法直接比較
- 需要先用 `*` 解引用指標取得值

---

## 問題 3：struct 欄位不存在

```go
// ❌ 錯誤：orderService 沒有 refundService 欄位
if s.refundService != nil {
    s.refundService.DeletePendingByOrderID(orderID)

// ✓ 正確：使用實際存在的欄位
if s.refundRepo != nil {
    s.refundRepo.DeletePendingByOrderID(orderID)
```

**原因**：呼叫不存在的欄位會編譯錯誤。需要確認 struct 定義中有哪些欄位。

---

## 問題 4：interface 方法未實作

```go
// 介面定義
type RefundRepository interface {
    // ... 其他方法
    DeletePendingByOrderID(orderID string) error  // 需要加入
}

// 實作
func (r *refundRepository) DeletePendingByOrderID(orderID string) error {
    return r.db.Where("order_id = ? AND status = ?", orderID, "pending").
        Delete(&models.RefundRecord{}).Error
}
```

**原因**：Go 的 interface 是隱式實作，但如果 interface 定義了方法，實作的 struct 就必須提供該方法。

---

## 總結

| 錯誤類型 | 原因 | 修正方式 |
|---------|------|---------|
| 型別不存在 | interface 名稱拼錯 | 確認正確的 interface 名稱 |
| 型別不匹配 | `*T` 和 `T` 不能直接比較 | 先檢查 nil，再用 `*` 解引用 |
| 欄位不存在 | struct 沒有該欄位 | 使用正確的欄位名稱 |
| 方法未實作 | interface 定義但沒實作 | 加入方法到 interface 和實作 |
