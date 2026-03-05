# 訂單報名序號功能

## 需求背景
客戶需求：「民眾購票系統依照報名順序給予序號，方便後續發送贈品」。
目前 Order 模型中沒有序號欄位。

## 設計決定
- **序號產生時機**：付款成功時（只有成功付款的訂單才有序號）
- **序號範圍**：每個活動獨立編號（活動 A 有 1,2,3...，活動 B 也從 1 開始）
- **涵蓋訂單類型**：所有訂單類型（B2C 購票、B2C 商品、B2B 攤位等）

## 實作計畫

### 1. Order Model 新增欄位
**檔案**: `backend-go/internal/models/order.go`
- 新增 `SequenceNumber *int` 欄位（nullable，未付款的訂單沒有序號）
- GORM tag: `gorm:"column:sequence_number" json:"sequence_number"`
- ⚠️ 不使用 AutoMigrate，需手動執行 SQL：
```sql
ALTER TABLE `order` ADD COLUMN `sequence_number` INT NULL DEFAULT NULL;
```

### 2. Order Repository 新增序號產生方法
**檔案**: `backend-go/internal/repository/order_repository.go`
- 新增 `AssignSequenceNumber(tx *gorm.DB, order *models.Order) error`
- SQL 邏輯：
```sql
SELECT COALESCE(MAX(sequence_number), 0) + 1
FROM `order`
WHERE event_id = ? AND sequence_number IS NOT NULL
FOR UPDATE
```
- 在同一個 transaction 內執行，確保併發安全

### 3. 付款成功時指派序號（3 個進入點）

#### 3a. ECPay 付款回調（主要路徑）
**檔案**: `backend-go/internal/service/payment_service.go`
- 位置：`processCallbackWithTransaction()` 的 `rtnCode == "1"`（付款成功）區塊（約 L504-515）
- 在 `tx.Save(&lockedOrder)` 之前，呼叫 `AssignSequenceNumber(tx, &lockedOrder)`
- 已有 transaction + SELECT FOR UPDATE，併發安全 ✅

#### 3b. 免費票券確認
**檔案**: `backend-go/internal/service/order_service.go`
- 位置：`ConfirmPayment()` 設定 `PaymentStatusPaid` 之後、`repo.Update()` 之前（約 L2358-2365）
- 需要包裝在 transaction 中以確保序號唯一

#### 3c. 手動更新付款狀態
**檔案**: `backend-go/internal/service/order_service.go`
- 位置：`UpdatePaymentStatus()`（約 L531-545）
- 當 status 變更為 PAID 且原本不是 PAID 時，分配序號
- 需要用 transaction + FOR UPDATE 產生序號

### 4. DTO 新增序號欄位
**檔案**: `backend-go/internal/dto/order.go`
- `OrderPublic` 加 `SequenceNumber *int \`json:"sequence_number"\``
- `OrderConsumerPublic` 加 `SequenceNumber *int \`json:"sequence_number"\``

### 5. 前端顯示（兩個都要）

#### 5a. Dashboard 後台（主辦方）
**檔案**: `futuresign.dashboard/src/client/models/order.ts`
- `OrderPublic` type 加 `sequence_number?: number | null`

**檔案**: `futuresign.dashboard/src/routes/_layout/orders.tsx`
- 訂單列表新增「序號」欄位，顯示在訂單編號旁邊

#### 5b. Official Website 前台（消費者）
- 消費者在「我的訂單」頁面也能看到自己的報名序號

### 6. 既有訂單補序號（一次性 SQL）
對已付款但無序號的訂單，依 `created_at` 排序補上序號：
```sql
-- 按活動分組，依建立時間排序補上序號
SET @seq = 0;
SET @event = '';
UPDATE `order`
SET sequence_number = (
  SELECT seq FROM (
    SELECT id,
           @seq := IF(@event = event_id, @seq + 1, 1) AS seq,
           @event := event_id
    FROM `order`
    WHERE payment_status = 'PAID' AND deleted_at IS NULL
    ORDER BY event_id, created_at
  ) AS t
  WHERE t.id = `order`.id
)
WHERE payment_status = 'PAID' AND deleted_at IS NULL;
```

## 關鍵檔案清單
| 檔案 | 修改內容 |
|------|----------|
| `backend-go/internal/models/order.go` | 新增 SequenceNumber 欄位 |
| `backend-go/internal/repository/order_repository.go` | 新增 AssignSequenceNumber 方法 |
| `backend-go/internal/service/payment_service.go` | ECPay 回調時指派序號 |
| `backend-go/internal/service/order_service.go` | 免費票 + 手動更新時指派序號 |
| `backend-go/internal/dto/order.go` | DTO 加序號欄位 |
| `futuresign.dashboard/src/client/models/order.ts` | 前端 type 加序號 |
| `futuresign.dashboard/src/routes/_layout/orders.tsx` | 列表顯示序號 |

## 驗證方式
1. 手動執行 ALTER TABLE SQL 加欄位
2. 建立免費票券訂單 → 確認付款 → 檢查 sequence_number = 1
3. 再建一個同活動訂單 → 付款 → 檢查 sequence_number = 2
4. 不同活動的訂單序號應獨立（各自從 1 開始）
5. Dashboard 訂單列表確認序號欄位顯示正確
