# BUG: 票券管理頁退款繞過綠界 ECPay API

**日期**: 2026-03-20
**嚴重度**: CRITICAL
**狀態**: 待修復

---

## 問題摘要

從票券管理頁發起退款時，refund_record 被寫入 `status=success`，但**綠界退款 API 從未被呼叫**，
導致消費者實際上沒有收到退款，但系統紀錄顯示退款成功。

---

## 重現步驟

1. 進入後台 → 票券管理頁
2. 選擇一筆已付款訂單，點擊退款
3. 填寫退款原因，送出

**預期結果**: 呼叫綠界退款 API → 等待回應 → 根據結果更新 status
**實際結果**: 直接寫入 `status=success`，未呼叫綠界

---

## 證據資料

### refund_record 資料（RF-20260320-XG6J95）

| 欄位 | 值 | 問題 |
|------|-----|------|
| id | 1548cf92-55ef-4d96-afa0-feb526b2e9cc | |
| order_id | 967e67f7-150b-4890-9eff-7aa266ead1cd | |
| refund_number | RF-20260320-XG6J95 | |
| refund_amount | 10.00 | |
| status | **success** | 不應該是 success |
| ecpay_trade_no | **NULL** | 沒打 ECPay |
| ecpay_refund_id | **NULL** | 沒打 ECPay |
| ecpay_return_code | **NULL** | 沒打 ECPay |
| ecpay_return_message | **NULL** | 沒打 ECPay |
| ecpay_request_log | **NULL** | 沒打 ECPay |
| ecpay_response_log | **NULL** | 沒打 ECPay |
| reviewed_by_user_id | ef4ebc87-54ca-4a17-8a40-c0c749599b7c | 後台管理員 |
| processed_at | 2026-03-20 03:25:52 | 有值但沒打 API |

---

## 根本原因分析

### 問題出在哪

有**兩條退款路徑**，一條有打 ECPay、一條沒有：

```
路徑 A（有 BUG）:
POST /api/v1/orders/{order_id}/refund
  → OrderHandler.RefundOrder()           (order_handler.go:1194)
    → OrderService.RefundOrder()         (order_service.go:946)
      → 直接寫 status=success            (order_service.go:1002) ❌ 沒打 ECPay

路徑 B（正確）:
POST /api/v1/refunds/{refund_id}/approve
  → RefundHandler.ApproveRefund()        (refund_handler.go:370)
    → RefundService.ApproveRefund()      (refund_service.go:194)
      → PaymentService.ProcessRefund()   (refund_service.go:249) ✅ 有打 ECPay
        → 根據 ECPay 回傳決定 status
```

### 問題程式碼

> `backend-go/internal/service/order_service.go:998-1006`

```go
refundRecord := &models.RefundRecord{
    OrderID:          orderID,
    RefundAmount:     refundAmount,
    RefundType:       string(refundType),
    Status:           string(models.RefundStatusSuccess),  // ❌ 直接寫 success
    ReviewedByUserID: refundedByUserID,
    RequestReason:    reason,
    ProcessedAt:      &now,
}
```

這段完全沒有呼叫 `s.paymentService.ProcessRefund()`。

### 正確實作對照

> `backend-go/internal/service/refund_service.go:249-269`

```go
// 先打 ECPay
ecpayResult, err := s.paymentService.ProcessRefund(order.ID, &refundAmountInt, reason)

// 根據結果決定 status
switch {
case ecpayResult != nil && ecpayResult.Success:
    refund.Status = string(models.RefundStatusSuccess)  // ✅ 只有 ECPay 成功才寫 success
    // ...更新訂單
}
```

---

## 前端呼叫路徑

> `futuresign.dashboard/src/components/Tickets/TicketRefundModal.tsx:81-114`

前端的 TicketRefundModal 呼叫 `OrdersService.processRefund()`，
對應到 `POST /api/v1/orders/{order_id}/refund`（有 BUG 的路徑 A）。

---

## 修復方案

### 方案 1: 在 OrderService.RefundOrder() 加入 ECPay 呼叫（推薦）

讓 `OrderService.RefundOrder()` 也走 `PaymentService.ProcessRefund()` 流程，
根據 ECPay 回傳結果決定 refund_record 的 status。

### 方案 2: 前端改走正確路徑

讓 TicketRefundModal 改用兩步驟：
1. 先呼叫 `POST /api/v1/refunds/request` 建立 pending 退款
2. 再呼叫 `POST /api/v1/refunds/{id}/approve` 審核+打 ECPay

### 方案 3: 合併路徑

把 `OrderService.RefundOrder()` 內部改為呼叫 `RefundService` 的完整流程，
避免維護兩套退款邏輯。

---

## 受影響的檔案

| 檔案 | 說明 |
|------|------|
| `backend-go/internal/service/order_service.go:946-1032` | RefundOrder() 有 BUG |
| `backend-go/internal/handler/order_handler.go:1194-1260` | 呼叫有 BUG 的 RefundOrder |
| `dashboard/src/components/Tickets/TicketRefundModal.tsx:81-114` | 前端呼叫端 |
| `backend-go/internal/service/refund_service.go:194-320` | 正確實作（參考用） |
| `backend-go/internal/service/payment_service.go:2153-2517` | ECPay ProcessRefund |
