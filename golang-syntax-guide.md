# Go 語法筆記

## `s.memberRepo.GetByID(issuedBy, false)` 拆解

```go
s.memberRepo.GetByID(issuedBy, false)
```

### `s` 是什麼？

`s` 是 **struct 自己**，就像 Python 的 `self`、JavaScript 的 `this`。

```go
func (s *eventCouponService) ClaimCoupon(...) {
//    ^--- 這個 s 就是 eventCouponService 自己
    s.memberRepo  // = 自己身上的 memberRepo 屬性
}
```

定義在哪裡：
```go
// internal/service/event_coupon_service.go
type eventCouponService struct {
    programRepo   repository.EventCouponProgramRepository
    claimRepo     repository.EventCouponClaimRepository
    eventRepo     repository.EventRepository
    memberRepo    repository.MemberRepository   // <-- 就是這個
    userRepo      repository.UserRepository
    orderRepo     repository.OrderRepository
    orderItemRepo repository.OrderItemRepository
}
```

### `memberRepo` 是什麼？

**不是 Go 內建的**，是我們自己寫的 repository。

定義在 `internal/repository/member_repository.go`：
```go
type MemberRepository interface {
    GetByID(id string, includeDeleted bool) (*models.Member, error)
    // ... 其他方法
}
```

### `GetByID(issuedBy, false)` 參數意義

| 參數 | 值 | 意義 |
|------|-----|------|
| `id` | `issuedBy` | 要查的 member ID |
| `includeDeleted` | `false` | 不包含已軟刪除的記錄 |

### 完整翻譯

```
s.memberRepo.GetByID(issuedBy, false)
```
= **「用自己的 memberRepo，透過 ID 查詢 member，不包含已刪除的」**

---

## Go 的 `s` / receiver 命名慣例

Go 社群慣例是用**型別名稱的第一個字母**當 receiver 名稱：

```go
// eventCouponService → s（service 的 s）
func (s *eventCouponService) ClaimCoupon(...)

// OrderHandler → h（handler 的 h）
func (h *OrderHandler) CreateOrder(...)

// userRepository → r（repository 的 r）
func (r *userRepository) GetByID(...)
```

這是 Go 的風格，不是強制的，但幾乎所有 Go 專案都這樣寫。

---

## 常見 pattern 對照表

| 寫法 | 等同於（其他語言） |
|------|-------------------|
| `s.memberRepo` | Python: `self.member_repo` |
| `h.orderService` | JS: `this.orderService` |
| `r.db.Where(...)` | Python: `self.db.query(...)` |
| `func (s *Service) Method()` | Python: `def method(self):` |

---

## Struct 屬於誰？每一層都有自己的 struct

`struct` 不屬於特定某一層，每一層都有，差別在**用途**：

| 層級 | struct 範例 | 用途 | 裡面裝什麼 |
|------|------------|------|-----------|
| **Models** | `type Member struct { ... }` | 對應資料庫表格 | 欄位（Name, Email...） |
| **DTO** | `type EventCouponProgramResponse struct { ... }` | API 請求/回應格式 | JSON 欄位 |
| **Repository** | `type memberRepository struct { db *gorm.DB }` | 查資料用 | DB 連線 |
| **Service** | `type eventCouponService struct { memberRepo, claimRepo... }` | 商業邏輯 | 各種 repo |
| **Handler** | `type OrderHandler struct { orderService, cfg... }` | 處理 HTTP 請求 | service + 設定 |

### 實際的呼叫鏈

```
Handler (h) → Service (s) → Repository (r) → Database
   |              |              |
   h.orderService s.memberRepo   r.db.Where(...)
```

以這行為例：
```go
func (s *eventCouponService) ClaimCoupon(...) {
    s.memberRepo.GetByID(issuedBy, false)
}
```

- `s` = **Service 層的 struct**（eventCouponService 自己）
- `s.memberRepo` = Service 裡面裝的 **Repository 層的 struct**
- `GetByID` 回傳 `*models.Member` = **Model 層的 struct**

### 工具箱比喻

每一層的 struct 就像一個**工具箱**，裡面裝著它工作需要的工具：

```
Handler 工具箱 = { orderService, couponService, cfg }
                       ↓
Service 工具箱 = { memberRepo, claimRepo, eventRepo, userRepo }
                       ↓
Repository 工具箱 = { db }  ← 只有一個 GORM 連線
                       ↓
                    Database
```

### 誰建立誰？（在 main.go 裡組裝）

```go
// 1. 先建 Repository（最底層）
memberRepo := repository.NewMemberRepository(db)

// 2. 再建 Service（把 repo 塞進去）
couponService := service.NewEventCouponService(programRepo, claimRepo, eventRepo, memberRepo, ...)

// 3. 最後建 Handler（把 service 塞進去）
couponHandler := handler.NewEventCouponHandler(couponService)
```

就像組裝俄羅斯娃娃：Repository 放進 Service，Service 放進 Handler。
