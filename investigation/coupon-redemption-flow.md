# 禮品券核銷流程筆記

## QR Code 格式

消費者的禮品券 QR Code 內容格式：
```
coupon_claim:{claim_id}
```
- `claim_id` 是 `event_coupon_claim` 表的主鍵
- 前端產生 QR Code 時用這個格式，主辦方掃碼後解析前綴 `coupon_claim:` 取得 claim_id

## 核銷方法比較

### 1. UpdateClaimSignature（核銷時間戳 + 核銷者記錄）

> ⚠️ 方法名稱中的 "Signature" 已式微（deprecated）。
> 目前系統不要求使用者手寫簽名，`signature_image` 欄位保留僅為向下相容。
> **主要用途：記錄「誰」在「什麼時候」核銷了這張禮品券。**

| 項目 | 說明 |
|------|------|
| **API** | `PATCH /api/v1/event-coupons/claims/:id` |
| **主要用途** | 記錄核銷時間戳（redeemed_at）+ 核銷者 ID（redeemed_by = member.id 或 user.id） |
| **已式微功能** | signature_image（簽名圖片），目前未使用 |
| **呼叫端** | CheckInPage（掃 QR Code）、EventCouponProgramDetailPage（手動核銷） |
| **冪等** | ✅ 已核銷時回傳 `already_redeemed: true`，不會重複寫入 |
| **購票檢查** | ✅ 核銷時檢查 `require_ticket` |

**前端呼叫方式：**
```typescript
// CheckInPage.tsx 掃到 coupon_claim:{id} 後
// 關鍵：redeemed_by 記錄的是「正在操作核銷的主辦方 member.id」
await apiClient.patch(`/event-coupons/claims/${claimId}`, {
  redeemed_at: 'now',       // 特殊值，後端轉成 time.Now()
  redeemed_by: user?.id     // 主辦方的 member_id（記錄是誰核銷的）
})
```

### 2. RedeemByQRCodeOrganizer（專用 QR Code 核銷）

> 目前尚未接到 handler，CheckInPage 仍走 UpdateClaimSignature。
> 未來可新增獨立路由，語意更明確。

| 項目 | 說明 |
|------|------|
| **API** | 尚未接到 handler（預備中） |
| **用途** | 專門給主辦方掃消費者 QR Code 核銷用，自動帶入時間戳 + 核銷者 |
| **呼叫端** | 未來可新增 `POST /event-coupons/claims/:id/redeem` |
| **冪等** | ✅ 已核銷回傳 `already_redeemed: true` + 原始 `redeemed_at` |
| **購票檢查** | ✅ 用 `checkMemberHasPaidTicketForEvent` |

**差異重點：**
- `UpdateClaimSignature`：通用 PATCH，保留 signature_image（已式微），主流用法只傳 redeemed_at + redeemed_by
- `RedeemByQRCodeOrganizer`：純核銷，自動帶 `redeemed_at=now` + `redeemed_by=organizerID`，不需要前端額外傳參數
- 兩者都有冪等保護（already_redeemed=true），重複掃碼不會報錯
- 目前 CheckInPage 仍然走 `UpdateClaimSignature`，因為它已經能正確處理核銷

## 核銷流程圖

```
消費者                          主辦方
  │                               │
  │ 1. 領取禮品券                  │
  │    POST /consumer/programs     │
  │    /{programId}/claim          │
  │                               │
  │ 2. 在 my-tickets 或           │
  │    event#coupon 出示 QR Code   │
  │    (coupon_claim:{claim_id})   │
  │                               │
  │ ─── 出示 QR Code ───────────> │
  │                               │ 3. CheckInPage 掃碼
  │                               │    解析 coupon_claim: 前綴
  │                               │    PATCH /claims/{id}
  │                               │    { redeemed_at: "now",
  │                               │      redeemed_by: 主辦ID }
  │                               │
  │                               │ 4. 後端檢查：
  │                               │    - claim 是否存在
  │                               │    - 是否已核銷（冪等）
  │                               │    - require_ticket 購票資格
  │                               │    - 寫入 redeemed_at + redeemed_by
  │                               │
  │ <── 核銷成功/已核銷 ────────── │
```

## 已核銷判斷

### 後端
- `EventCouponClaimResponse.already_redeemed` = `true` → 重複掃碼
- `EventCouponClaimResponse.redeemed_at` 有值 → 已核銷
- `ConsumerCouponStatusResponse.redeemed_at` 有值 → 消費者看到已核銷

### 前端顯示
- **my-tickets#coupons**：已核銷的 QR Code 蓋紅色「已核銷」浮水印
- **event#coupon**：已核銷的 QR Code 蓋紅色「已核銷」浮水印
- **check-in**：重複掃碼時顯示「【方案名稱】此禮品券已核銷過（核銷時間）」

## 已知問題

### ClaimCouponByPhone 只處理第一個方案
`event_coupon_service.go` 的 `ClaimCouponByPhone` 方法：
```go
for _, p := range programs {
    if p.IsActive {
        activeProgram = p
        break  // ← 只取第一個！
    }
}
```
如果活動有多個方案，透過手機號碼只能操作第一個。
**解法**：用 QR Code 掃碼核銷（直接用 claim_id，不受方案順序限制）

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `backend-go/internal/service/event_coupon_service.go` | 核銷邏輯（UpdateClaimSignature、RedeemByQRCodeOrganizer） |
| `backend-go/internal/handler/event_coupon_handler.go` | API handler |
| `backend-go/internal/dto/event_coupon.go` | DTO 定義（ClaimResponse、ConsumerCouponStatusResponse） |
| `official_website/src/pages/CheckInPage.tsx` | 主辦方掃碼核銷頁面 |
| `official_website/src/pages/MyTicketsPage.tsx` | 消費者我的票券（顯示 QR Code） |
| `official_website/src/pages/EventCouponSection.tsx` | 活動頁 #coupon tab（顯示 QR Code） |
