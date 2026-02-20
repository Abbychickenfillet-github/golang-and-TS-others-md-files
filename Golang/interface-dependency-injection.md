# Go Interface 與依賴注入：Service 如何參照 Repository

## 問題

`s.orderItemRepo` 在 service 裡面，怎麼連結到 `order_item_repository.go`？
是靠命名慣例嗎？

**答案：不是命名慣例，是靠 Go 的 interface 型別 + 依賴注入。**

---

## 連結的 4 個步驟

### 1. Repository 定義 interface 和實作

`internal/repository/order_item_repository.go`：

```go
// interface（公開，大寫開頭）
type OrderItemRepository interface {
    GetByBuyerMemberID(buyerMemberID string, skip, limit int, includeDeleted bool) ([]models.OrderItem, error)
    // ...其他方法
}

// 實作 struct（私有，小寫開頭）
type orderItemRepository struct {
    db *gorm.DB
}

// 建構函式：回傳 interface 型別
func NewOrderItemRepository(db *gorm.DB) OrderItemRepository {
    return &orderItemRepository{db: db}
}
```

### 2. Service struct 宣告欄位型別為 interface

`internal/service/event_coupon_service.go`：

```go
type eventCouponService struct {
    orderItemRepo repository.OrderItemRepository  // ← 型別是 interface，不是具體 struct
}
```

### 3. Service 建構函式接收 interface 參數

```go
func NewEventCouponService(
    ...
    orderItemRepo repository.OrderItemRepository,  // ← 傳進來的必須實作這個 interface
) EventCouponService {
    return &eventCouponService{
        orderItemRepo: orderItemRepo,  // ← 存到 struct 欄位
    }
}
```

### 4. 在 main.go 或初始化時把它們接起來

```go
// 先建立 repository 實例
orderItemRepo := repository.NewOrderItemRepository(db)

// 再把 repository 傳給 service
couponService := service.NewEventCouponService(..., orderItemRepo)
```

---

## 流程圖

```
order_item_repository.go 定義 OrderItemRepository interface
                                    ↓
                         orderItemRepository struct 實作所有方法
                                    ↓
               NewOrderItemRepository(db) 建立實例，回傳 interface
                                    ↓
               傳入 NewEventCouponService() 的參數
                                    ↓
               存在 s.orderItemRepo 欄位上
                                    ↓
               s.orderItemRepo.GetByBuyerMemberID(...) 呼叫方法
```

---

## 重點

| 觀念 | 說明 |
|------|------|
| **不是靠檔名** | `s.orderItemRepo` 跟 `order_item_repository.go` 的檔名無關 |
| **靠 interface 型別** | Go 只看「你有沒有實作 interface 要求的所有方法」 |
| **依賴注入** | 在 main.go 建立實例後，透過建構函式參數傳進去 |
| **為什麼用 interface** | 方便測試（可以傳 mock），也讓 service 不依賴具體實作 |
