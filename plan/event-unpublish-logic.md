# 活動下架邏輯設計 (Event Unpublish / Toggle Valid)

> 建立日期：2026-03-04

---

## 一、需求說明

主辦方可以自由切換活動的上架/下架狀態（`Valid` = 1/0），但需要考慮：
- 已售出的票券和訂單不能被忽略
- 活動進行中不應該被下架
- 下架後需要處理相關的副作用（待付款訂單、優惠券等）

---

## 二、現有相關檔案參考

### 2.1 Event Model (`internal/models/event.go`)

目前已有三個狀態欄位：

```go
// 狀態管理
ApprovalStatus EventApprovalStatus `gorm:"type:varchar(20);comment:審核狀態" json:"approval_status"`
Status         EventStatus         `gorm:"type:varchar(20);default:'active';comment:活動狀態" json:"status"`
Valid          bool                `gorm:"type:tinyint(1);not null;comment:資料是否有效 (1=有效、0=下架)" json:"valid"`
```

其中 `Valid` 就是控制上架/下架的欄位。

時間欄位（決定活動是否進行中）：
```go
StartAt time.Time `gorm:"type:datetime;not null;comment:活動開始時間" json:"start_at"`
EndAt   time.Time `gorm:"type:datetime;not null;comment:活動結束時間" json:"end_at"`
```

審核狀態：
```go
const (
    EventApprovalStatusPending  EventApprovalStatus = "pending"  // 待審核
    EventApprovalStatusApproved EventApprovalStatus = "approved" // 審核通過
    EventApprovalStatusRejected EventApprovalStatus = "rejected" // 審核拒絕
)
```

### 2.2 Order Model (`internal/models/order.go`)

訂單狀態是下架檢查的核心：

```go
// 付款狀態
const (
    PaymentStatusPending  PaymentStatus = "PENDING"  // 待付款
    PaymentStatusPaid     PaymentStatus = "PAID"     // 已付款
    PaymentStatusFailed   PaymentStatus = "FAILED"   // 付款失敗
    PaymentStatusRefunded PaymentStatus = "REFUNDED" // 已退款
)

// 訂單狀態
const (
    OrderStatusDraft                 OrderStatus = "DRAFT"                  // 草稿
    OrderStatusConfirmed             OrderStatus = "CONFIRMED"              // 已確認
    OrderStatusCancellationRequested OrderStatus = "CANCELLATION_REQUESTED" // 申請取消
    OrderStatusCancelled             OrderStatus = "CANCELLED"              // 已取消
)

// 報到狀態
const (
    OrderCheckInStatusNotCheckedIn OrderCheckInStatus = "not_checked_in" // 未報到
    OrderCheckInStatusCheckedIn    OrderCheckInStatus = "checked_in"     // 已報到
    OrderCheckInStatusLeft         OrderCheckInStatus = "left"           // 已離開
)
```

訂單關鍵欄位：
```go
type Order struct {
    Base
    EventID         string          `gorm:"type:varchar(36);not null;index" json:"event_id"`
    BuyerID         *string         `gorm:"type:varchar(36);index" json:"buyer_id"`
    TotalAmount     decimal.Decimal `gorm:"type:decimal(12,2);default:0.00" json:"total_amount"`
    PaymentStatus   string          `gorm:"type:varchar(20);default:'PENDING'" json:"payment_status"`
    Status          string          `gorm:"type:varchar(20);default:'DRAFT'" json:"status"`
    CheckInStatus   string          `gorm:"type:varchar(20);default:'not_checked_in'" json:"check_in_status"`
}
```

### 2.3 Ticket Model (`internal/models/ticket.go`)

```go
const (
    TicketStatusDraft     TicketStatus = "draft"     // 草稿
    TicketStatusActive    TicketStatus = "active"    // 銷售中
    TicketStatusSoldOut   TicketStatus = "sold_out"  // 售完
    TicketStatusCancelled TicketStatus = "cancelled" // 已取消
)

type Ticket struct {
    Base
    EventID     string    `gorm:"type:varchar(36);not null;index" json:"event_id"`
    Quantity    int       `gorm:"column:quantity;default:0" json:"quantity"`
    SoldCount   int       `gorm:"column:sold_count;default:0" json:"sold_count"`
    SalesStartAt time.Time `gorm:"column:sales_start_at;not null" json:"sales_start_at"`
    SalesEndAt   time.Time `gorm:"column:sales_end_at;not null" json:"sales_end_at"`
    Status       string    `gorm:"type:varchar(50);column:status;default:'draft'" json:"status"`
}
```

### 2.4 現有刪除資格檢查邏輯 (`internal/service/event_service.go` L841-916)

目前已有 `CheckDeletionEligibility` 可作為參考模式：

```go
func (s *eventService) CheckDeletionEligibility(eventID string) (*dto.EventDeletionEligibility, error) {
    // 1. 查詢活動是否存在
    event, err := s.eventRepo.GetByID(eventID, false, true)

    // 2. 查詢已售票數
    tickets, _ := s.ticketRepo.GetByEventID(eventID, false)
    for _, t := range tickets {
        totalSold += int64(t.SoldCount)
    }

    // 3. 查詢訂單狀態（是否有已付款、未退款）
    orders, _ := s.orderRepo.GetByEventID(eventID, 0, 10000, false)
    // 遍歷判斷 hasPaid、hasUnrefunded

    // 4. 決定刪除類型
    // totalSold == 0 && !hasUnrefunded → "hard" (直接刪除)
    // hasUnrefunded → "requires_refund" (需退款)
    // 其他 → "soft" (軟刪除)
}
```

### 2.5 現有 DTO（`internal/dto/event.go`）

EventUpdate 已支援 Valid 欄位的更新：
```go
type EventUpdate struct {
    // ...
    Valid *bool `json:"valid,omitempty"`
    // ...
}
```

EventFilter 已支援 IncludeInvalid：
```go
type EventFilter struct {
    // ...
    IncludeInvalid bool `json:"include_invalid"` // 是否包含未上架的活動
    // ...
}
```

---

## 三、下架前應檢查的條件

### 3.1 絕對禁止下架（Hard Block）

| 條件 | 判斷邏輯 | 原因 |
|---|---|---|
| 活動正在進行中 | `now >= StartAt && now < EndAt` | 進行中下架會影響現場報到、驗票流程 |
| 有已報到的參加者 | Order 的 `CheckInStatus = "checked_in"` | 人已到場，下架造成系統矛盾 |
| 有已付款未退款的訂單 | `PaymentStatus = "PAID"` 且 `Status != "CANCELLED"` | 違約風險，消費者已付錢但看不到活動 |

### 3.2 警告但允許下架（Soft Block / Warning）

| 條件 | 判斷邏輯 | 處理方式 |
|---|---|---|
| 有待付款訂單 | `PaymentStatus = "PENDING"` 且 `Status != "CANCELLED"` | 警告「有 N 筆待付款訂單將自動取消」 |
| 在報名期間內 | `now >= RegistrationStartTime && now <= RegistrationEndTime` | 警告「下架後消費者無法報名」 |
| 有售票紀錄（已退款） | `SoldCount > 0` 但所有付款訂單已退款 | 警告「曾售出 N 張票，均已退款」 |
| 有進行中的優惠券 | EventCoupon 有 active 的記錄 | 警告「有 N 個優惠券將失效」 |

### 3.3 可自由下架（No Block）

| 條件 | 說明 |
|---|---|
| 零售票、零訂單 | 沒有任何人買票，最安全 |
| 活動已結束 | `now > EndAt`，下架只是隱藏已結束活動 |
| 所有訂單已取消/退款 | 無未結清交易 |

---

## 四、下架流程圖

```
主辦方 / 後台 點擊「下架」（Valid: 1 → 0）
       │
       ▼
  ┌─ 活動正在進行中？ ───── Yes ──→ ❌ 拒絕（"活動進行中無法下架"）
  │      No
  │      ▼
  ├─ 有已報到的人？ ────── Yes ──→ ❌ 拒絕（"有已報到參加者無法下架"）
  │      No
  │      ▼
  ├─ 有已付款未退款訂單？── Yes ──→ ❌ 拒絕（"請先處理 N 筆已付款訂單的退款"）
  │      No
  │      ▼
  ├─ 有待付款訂單？ ────── Yes ──→ ⚠️ 回傳 warning：
  │      No                         「有 N 筆待付款訂單，下架後將自動取消」
  │      ▼                          前端顯示確認對話框，用戶確認後帶 force=true 再次呼叫
  │
  └─ ✅ 執行下架
       ├─ Valid = 0
       ├─ 記錄 UnpublishedAt, UnpublishedBy
       ├─ 自動取消所有待付款訂單（PENDING → CANCELLED）
       └─ Log 記錄
```

---

## 五、重新上架流程

```
主辦方 / 後台 點擊「上架」（Valid: 0 → 1）
       │
       ▼
  ┌─ 活動已結束？ ────── Yes ──→ ❌ 拒絕（"已結束的活動無法重新上架"）
  │      No
  │      ▼
  ├─ 審核狀態？ ─────── rejected ──→ ❌ 拒絕（"審核被拒絕，需重新送審"）
  │      approved / pending
  │      ▼
  └─ ✅ 執行上架
       ├─ Valid = 1
       ├─ 清除 UnpublishedAt, UnpublishedBy
       └─ Log 記錄
```

---

## 六、下架後的副作用處理

| 動作 | 說明 | 影響範圍 |
|---|---|---|
| 待付款訂單自動取消 | `Status → CANCELLED`, `PaymentStatus` 維持 `PENDING` | `order` 表 |
| 消費者端隱藏活動 | API query 預設 `valid = 1`（已有 `IncludeInvalid` filter） | 前台 API |
| 票券停止銷售 | 前端/API 需檢查 `event.Valid` 才能購票 | 購票流程 |
| 優惠券失效 | 前端/API 檢查 event 有效性 | 優惠券系統 |
| 攤位停止申請 | 品牌方無法看到/申請該活動攤位 | 攤位系統 |

---

## 七、建議新增/修改的程式碼

### 7.1 新增 DTO：`EventUnpublishEligibility`

```go
// EventUnpublishEligibility 下架資格評估結果
type EventUnpublishEligibility struct {
    CanUnpublish        bool     `json:"can_unpublish"`         // 是否可以下架
    Reason              string   `json:"reason"`                // 說明原因
    Warnings            []string `json:"warnings"`              // 警告訊息列表
    HasPaidOrders       bool     `json:"has_paid_orders"`       // 是否有已付款訂單
    HasPendingOrders    bool     `json:"has_pending_orders"`    // 是否有待付款訂單
    PendingOrderCount   int64    `json:"pending_order_count"`   // 待付款訂單數
    HasCheckedInOrders  bool     `json:"has_checked_in_orders"` // 是否有已報到訂單
    IsEventOngoing      bool     `json:"is_event_ongoing"`      // 活動是否進行中
    TotalSoldTickets    int64    `json:"total_sold_tickets"`    // 已售票券數
}
```

### 7.2 新增 Service 方法

```go
// CheckUnpublishEligibility 檢查活動下架資格
CheckUnpublishEligibility(eventID string) (*dto.EventUnpublishEligibility, error)

// UnpublishEvent 下架活動（含商業邏輯檢查）
UnpublishEvent(eventID string, unpublishedBy string, force bool) (*models.Event, error)

// RepublishEvent 重新上架活動
RepublishEvent(eventID string) (*models.Event, error)
```

### 7.3 考慮新增 Model 欄位（Optional，增加 audit trail）

```go
// 加在 Event struct 中
UnpublishedAt  *time.Time `gorm:"type:datetime;comment:下架時間" json:"unpublished_at"`
UnpublishedBy  *string    `gorm:"type:varchar(36);comment:執行下架的使用者 ID" json:"unpublished_by"`
UnpublishReason *string   `gorm:"type:varchar(500);comment:下架原因" json:"unpublish_reason"`
```

### 7.4 API Endpoint 設計

```
# 檢查下架資格
GET /api/v1/events/{id}/unpublish-eligibility

# 執行下架（force=true 跳過 warning 級別的檢查）
POST /api/v1/events/{id}/unpublish?force=false
Body: { "reason": "主辦方要求暫時下架" }

# 重新上架
POST /api/v1/events/{id}/republish
```

或者也可以直接沿用現有的 `PATCH /api/v1/events/{id}` + `{ "valid": false }` 的方式，
但在 Service 層加入上述的商業邏輯檢查。

---

## 八、核心原則總結

> **保護已付款消費者的權益**

1. **進行中** → 絕對不能下架
2. **有已報到的人** → 絕對不能下架
3. **有付款紀錄且未退款** → 必須先退款才能下架
4. **有待付款訂單** → 警告後可下架（自動取消待付款訂單）
5. **無交易紀錄** → 自由下架
6. **已結束** → 自由下架（只是隱藏）

---

## 九、與現有刪除流程的比較

| | 下架 (Unpublish) | 刪除 (Delete) |
|---|---|---|
| 對應欄位 | `Valid = 0` | `deleted_at IS NOT NULL` |
| 可逆性 | ✅ 可重新上架 | ⚠️ 軟刪除可恢復，硬刪除不可逆 |
| 對消費者影響 | 看不到活動，但訂單資料保留 | 活動完全消失 |
| 需要審核 | ❌ 主辦方可自行操作（通過檢查即可） | ✅ 有售票時需後台審核 |
| 自動處理 | 自動取消待付款訂單 | 依刪除類型決定 |
| 適用場景 | 暫時隱藏、活動延期、調整中 | 活動取消、錯誤建立 |
