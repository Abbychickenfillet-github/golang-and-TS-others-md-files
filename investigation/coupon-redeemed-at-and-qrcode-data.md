# ConsumerCouponStatusResponse 的 RedeemedAt 與 QRCodeData 筆記

日期：2026-03-11

---

## 問題 1：ConsumerCouponStatusResponse 能不能判斷「已核銷」？

**可以。** 用 `redeemed_at` 欄位判斷：

- `redeemed_at` 有值 → 已核銷
- `redeemed_at` 為 null → 未核銷

### DTO 定義（`internal/dto/event_coupon.go`）

```go
type ConsumerCouponStatusResponse struct {
    ProgramID   string  `json:"program_id"`
    ProgramName string  `json:"program_name"`
    CouponValue int     `json:"coupon_value"`
    IsClaimed   bool    `json:"is_claimed"`
    ClaimID     *string `json:"claim_id,omitempty"`
    IssuedAt    *string `json:"issued_at,omitempty"`
    QRCodeData  *string `json:"qr_code_data,omitempty"`
    RedeemedAt  *string `json:"redeemed_at,omitempty"`   // ← 有值 = 已核銷
}
```

### 組裝邏輯（`internal/service/event_coupon_service.go` 第 1459 行）

```go
if claim.RedeemedAt != nil {
    redeemedAt := claim.RedeemedAt.Format("2006-01-02 15:04:05")
    status.RedeemedAt = &redeemedAt
}
```

---

## 問題 2：ConsumerCouponStatusResponse 跟 docs.go 裡的是什麼關係？

- `ConsumerCouponStatusResponse` = **DTO**（Data Transfer Object），定義 API 回傳的 JSON 結構
- `docs.go` = **Swagger 自動產生的文件**，描述的就是這個 DTO
- `EventCouponClaim` = **GORM Model**，對應資料庫表格

組裝流程：

```
DB Model (EventCouponClaim)
    ↓ Service 層組裝
DTO (ConsumerCouponStatusResponse)
    ↓ Handler 層回傳
JSON → 前端
```

---

## 問題 3：QRCodeData 在哪裡組裝的？

在 **Service 層**，`GetConsumerCouponStatus` 方法內（第 1456 行）：

```go
// 產生 QR Code 資料（格式：coupon_claim:{claim_id}）
qrData := "coupon_claim:" + claim.ID
status.QRCodeData = &qrData
```

### 為什麼放在 Service 而不是 Handler？

- QR Code 格式（`coupon_claim:{claim_id}`）是**商業邏輯**（業務規則）
- Handler 只負責：接收 HTTP 請求 → 呼叫 Service → 回傳 JSON
- Service 負責：資料組裝、業務規則、邏輯判斷

### QR Code 完整流程

```
Service 組裝 qrData = "coupon_claim:{claim_id}"
    ↓
API 回傳 JSON { qr_code_data: "coupon_claim:abc123" }
    ↓
前端用這個字串產生 QR Code 圖片給消費者出示
    ↓
主辦方掃碼 → 解析前綴 "coupon_claim:" → 取得 claim_id
    ↓
呼叫 PATCH /event-coupons/claims/{claim_id} 核銷
```

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `backend-go/internal/dto/event_coupon.go` | DTO 定義（ConsumerCouponStatusResponse） |
| `backend-go/internal/service/event_coupon_service.go` | 組裝邏輯（GetConsumerCouponStatus，第 1414 行起） |
| `backend-go/docs/docs.go` | Swagger 自動產生的 API 文件 |
