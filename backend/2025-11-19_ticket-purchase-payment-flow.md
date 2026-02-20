# 票券購買和付款檢查流程說明

**日期**: 2024-12-19
**主題**: 票券購買流程、付款檢查機制

---

## 概述

本文檔說明票券購買的完整流程，包括資格驗證、付款檢查、庫存更新等步驟。

---

## 購買流程

### 1. 驗證購買資格 (`validate_ticket_purchase`)

**位置**: `backend/app/services/ticket_service.py`

**流程**:
1. 檢查購買數量是否 > 0
2. 檢查票券是否存在
3. 檢查票券是否已刪除
4. 檢查票券狀態是否為 `active`
5. 檢查當前時間是否在售票時間範圍內
6. 檢查庫存是否足夠

**返回**:
- `(is_available: bool, error_msg: str, ticket: Ticket | None)`

### 2. 處理購買 (`process_ticket_purchase`)

**位置**: `backend/app/services/ticket_service.py`

**流程**:
1. 調用 `validate_ticket_purchase` 驗證資格
2. **付款檢查**（僅針對付費票券）:
   - 檢查是否提供 `payment_amount`
   - 檢查付款金額是否正確：`payment_amount == ticket.price * quantity`
   - 檢查是否提供 `payment_method`
3. 更新已售出數量：`ticket.sold_count += quantity`
4. 如果售完，自動更新狀態為 `sold_out`
5. 提交事務

**返回**:
- `(updated_ticket: Ticket | None, error_msg: str)`

---

## API 端點

### 1. 驗證購買資格（不實際購買）

**端點**: `POST /api/v1/tickets/{ticket_id}/validate`

**參數**:
- `ticket_id`: 票券 ID（路徑參數）
- `quantity`: 購買數量（查詢參數，必須 >= 1）

**回應**:
```json
{
  "valid": true,
  "ticket_id": "uuid",
  "quantity": 2,
  "total_price": 1000.00,
  "currency": "TWD",
  "message": "可以購買"
}
```

**錯誤回應**:
- `400`: 驗證失敗（庫存不足、售票時間已過等）

### 2. 實際購買（包含付款檢查）

**端點**: `POST /api/v1/tickets/{ticket_id}/purchase`

**參數**:
- `ticket_id`: 票券 ID（路徑參數）
- `quantity`: 購買數量（查詢參數，必須 >= 1）
- `payment_amount`: 付款金額（查詢參數，付費票券必填）
- `payment_method`: 付款方式（查詢參數，付費票券必填）

**付款檢查邏輯**:
```python
if not ticket.is_free:
    # 免費票券不需要付款檢查
    if payment_amount is None:
        return error("付費票券必須提供付款金額")

    expected_amount = ticket.price * quantity
    if payment_amount != expected_amount:
        return error(f"付款金額不正確，應為 {expected_amount} {ticket.currency}")

    if payment_method is None:
        return error("必須提供付款方式")
```

**回應**:
```json
{
  "success": true,
  "ticket_id": "uuid",
  "quantity": 2,
  "sold_count": 50,
  "available_count": 50,
  "status": "active",
  "message": "購買成功"
}
```

**錯誤回應**:
- `400`: 購買失敗（驗證失敗、付款金額錯誤等）
- `404`: 票券不存在

---

## 付款檢查詳細說明

### 免費票券
- 不需要 `payment_amount`
- 不需要 `payment_method`
- 直接通過驗證後更新庫存

### 付費票券
- **必須**提供 `payment_amount`
- **必須**提供 `payment_method`
- 付款金額必須等於：`ticket.price * quantity`
- 幣別由票券的 `currency` 欄位決定（預設 `TWD`）

### 付款金額計算範例

```python
# 票券價格：500 TWD
# 購買數量：2 張
# 應付金額：500 * 2 = 1000 TWD

# 正確的請求
payment_amount = 1000.00  # ✅

# 錯誤的請求
payment_amount = 500.00   # ❌ 金額不足
payment_amount = 1500.00  # ❌ 金額過多
payment_amount = None     # ❌ 未提供金額
```

---

## 庫存管理

### 自動狀態更新

當 `sold_count >= quantity` 時，系統會自動將票券狀態更新為 `sold_out`：

```python
if ticket.sold_count >= ticket.quantity:
    ticket.status = "sold_out"
```

### 退票處理

**端點**: `POST /api/v1/tickets/{ticket_id}/refund`

**流程**:
1. 檢查退票數量是否 <= 已售出數量
2. 減少已售出數量：`ticket.sold_count -= quantity`
3. 如果之前是 `sold_out` 狀態，現在有庫存了，改回 `active`

---

## 錯誤處理

### 常見錯誤訊息

| 錯誤訊息 | 原因 | HTTP 狀態碼 |
|---------|------|------------|
| "購買數量必須大於 0" | quantity <= 0 | 400 |
| "票券不存在" | ticket_id 無效 | 404 |
| "票券已刪除" | 票券已被軟刪除 | 400 |
| "票券狀態為 {status}，無法購買" | 狀態不是 active | 400 |
| "售票尚未開始" | 當前時間 < sales_start_at | 400 |
| "售票已結束" | 當前時間 > sales_end_at | 400 |
| "庫存不足，僅剩 {n} 張" | quantity > available | 400 |
| "付費票券必須提供付款金額" | payment_amount 為 None | 400 |
| "付款金額不正確，應為 {amount} {currency}" | 金額不符 | 400 |
| "必須提供付款方式" | payment_method 為 None | 400 |

---

## 使用範例

### Python 客戶端範例

```python
import requests
from decimal import Decimal

# 1. 先驗證購買資格
response = requests.post(
    f"/api/v1/tickets/{ticket_id}/validate",
    params={"quantity": 2}
)
validation = response.json()

if validation["valid"]:
    # 2. 實際購買（付費票券）
    purchase_response = requests.post(
        f"/api/v1/tickets/{ticket_id}/purchase",
        params={
            "quantity": 2,
            "payment_amount": Decimal("1000.00"),
            "payment_method": "credit_card"
        }
    )
    result = purchase_response.json()
    print(f"購買成功：{result['message']}")
```

### JavaScript/TypeScript 客戶端範例

```typescript
// 1. 驗證購買資格
const validateResponse = await fetch(
  `/api/v1/tickets/${ticketId}/validate?quantity=2`
);
const validation = await validateResponse.json();

if (validation.valid) {
  // 2. 實際購買
  const purchaseResponse = await fetch(
    `/api/v1/tickets/${ticketId}/purchase?quantity=2&payment_amount=1000.00&payment_method=credit_card`,
    { method: 'POST' }
  );
  const result = await purchaseResponse.json();
  console.log(`購買成功：${result.message}`);
}
```

---

## 資料庫事務

所有購買操作都在資料庫事務中執行：

```python
try:
    # 更新庫存
    ticket.sold_count += quantity
    session.add(ticket)
    session.commit()
    return success
except Exception as e:
    session.rollback()  # 發生錯誤時回滾
    return error
```

這確保了：
- 庫存更新的原子性
- 多個請求同時購買時的資料一致性
- 錯誤時的自動回滾

---

## 相關檔案

- `backend/app/services/ticket_service.py` - 票券服務層（包含購買邏輯）
- `backend/app/crud/ticket.py` - 票券 CRUD 層（包含庫存檢查）
- `backend/app/api/routes/tickets.py` - 票券 API 路由
- `backend/app/models/ticket.py` - 票券模型定義

---

## 後續建議

1. **付款整合**
   - 整合第三方付款閘道（如綠界、藍新等）
   - 實現付款確認回調機制

2. **訂單管理**
   - 創建訂單表記錄每筆購買
   - 實現訂單狀態管理（待付款、已付款、已取消等）

3. **庫存鎖定**
   - 實現購物車機制，暫時鎖定庫存
   - 防止超賣問題

4. **並發控制**
   - 使用資料庫鎖或 Redis 鎖
   - 處理高並發購買場景

5. **審計日誌**
   - 記錄所有購買和退票操作
   - 用於對帳和問題追蹤
