# 綠界付款退款機制規劃

## 現況分析

### 已有的退款功能

| 項目 | 狀態 | 位置 |
|------|------|------|
| Order 退款欄位 | ✅ 有 | `refunded_at`, `refund_amount`, `refund_reason` |
| PaymentStatus.REFUNDED | ✅ 有 | `backend/app/models/order.py` |
| Order Service 退款方法 | ✅ 有 | `order_service.process_refund()` |
| Payment Service ECPay 退款 | ✅ 有 | `payment_service.process_refund()` (DoAction API) |
| API 退款端點 | ✅ 有 | `/orders/{order_id}/refund`, `/refund-ecpay` |

### 缺少的部分

1. **退款記錄資料表** - 追蹤每筆退款的詳細記錄
2. **消費者退款申請流程** - 前台申請 API
3. **退款審核機制** - 管理員審核流程
4. **前台退款申請頁面** - official_website
5. **後台退款管理頁面** - frontend

---

## 建議的退款機制完整規劃

### 1. 新增資料表：refund_record (退款記錄)

**用途**：追蹤每一筆退款的詳細記錄，支援部分退款和多次退款

```sql
-- backend/sql/065_create_refund_record_table.sql
CREATE TABLE refund_record (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,

    -- 退款資訊
    refund_number VARCHAR(50) NOT NULL UNIQUE,     -- 退款單號 RF-YYYYMMDD-XXXX
    refund_amount DECIMAL(10,2) NOT NULL,          -- 本次退款金額
    refund_type ENUM('full', 'partial') NOT NULL,  -- 全額/部分退款

    -- ECPay 退款追蹤
    ecpay_trade_no VARCHAR(50),                    -- ECPay 原交易編號
    ecpay_refund_id VARCHAR(50),                   -- ECPay 退款交易編號

    -- 狀態追蹤
    status ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending',
    ecpay_return_code VARCHAR(10),                 -- ECPay 回傳代碼
    ecpay_return_message VARCHAR(255),             -- ECPay 回傳訊息

    -- 申請資訊
    requested_by_member_id CHAR(36),               -- 申請人 (消費者)
    request_reason TEXT,                           -- 申請原因
    requested_at DATETIME,                         -- 申請時間

    -- 審核資訊
    reviewed_by_user_id CHAR(36),                  -- 審核人 (後台管理員)
    review_comment TEXT,                           -- 審核備註
    reviewed_at DATETIME,                          -- 審核時間

    -- 處理資訊
    processed_at DATETIME,                         -- 實際退款時間

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,

    FOREIGN KEY (order_id) REFERENCES `order`(id),
    FOREIGN KEY (requested_by_member_id) REFERENCES member(id),
    FOREIGN KEY (reviewed_by_user_id) REFERENCES user(id),

    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_refund_number (refund_number)
);
```

---

### 2. 完整的退款流程圖

```
消費者申請退款 (official_website)
         ↓
    建立 refund_record (status=pending)
         ↓
後台管理員審核 (frontend)
    ↙         ↘
  核准          駁回
    ↓            ↓
status=processing  status=failed
    ↓
呼叫 ECPay DoAction API (Action=R)
    ↙         ↘
  成功          失敗
    ↓            ↓
status=success  status=failed
order.payment_status=REFUNDED
    ↓
發送退款完成通知
```

---

### 3. 需要新增的 API 路由

| 路由 | 方法 | 用途 | 使用者 |
|------|------|------|--------|
| `/refunds/request` | POST | 消費者申請退款 | 前台會員 |
| `/refunds/` | GET | 列出退款記錄 | 後台管理員 |
| `/refunds/{refund_id}` | GET | 查看退款詳情 | 後台管理員 |
| `/refunds/{refund_id}/approve` | POST | 審核通過並執行退款 | 後台管理員 |
| `/refunds/{refund_id}/reject` | POST | 駁回退款申請 | 後台管理員 |
| `/refunds/callback/ecpay` | POST | ECPay 退款結果回調 | ECPay |
| `/orders/{order_id}/refund-history` | GET | 訂單退款歷史 | 雙方 |

---

### 4. 需要新增的前端頁面

#### 後台 (frontend)

| 頁面 | 路由 | 功能 |
|------|------|------|
| 退款管理列表 | `/refunds` | 查看所有退款申請，篩選狀態 |
| 退款詳情/審核 | `/refunds/{id}` | 審核退款申請，檢視原訂單 |

#### 前台 (official_website)

| 頁面 | 路由 | 功能 |
|------|------|------|
| 申請退款 | `/orders/{id}/refund` | 消費者填寫退款申請 |
| 退款進度查詢 | `/my-orders/{id}` | 在訂單詳情中顯示退款狀態 |

---

### 5. 退款規則建議

```python
# 退款政策設定 (可存於 event 或 系統設定)
class RefundPolicy:
    # 活動開始前 N 天可全額退款
    full_refund_days_before: int = 7

    # 活動開始前 N 天可部分退款 (例如扣 10% 手續費)
    partial_refund_days_before: int = 3
    partial_refund_fee_percent: float = 10.0

    # 活動開始後不可退款
    no_refund_after_start: bool = True

    # 已報到不可退款
    no_refund_after_checkin: bool = True
```

---

## 完整的檔案結構規劃

```
backend/
├── sql/
│   └── 065_create_refund_record_table.sql    # 新增
├── app/
│   ├── models/
│   │   └── refund_record.py                   # 新增
│   ├── crud/
│   │   └── refund_record.py                   # 新增
│   ├── services/
│   │   └── refund_service.py                  # 新增
│   └── api/routes/
│       └── refunds.py                         # 新增

frontend/
├── src/routes/_layout/
│   └── refunds.tsx                            # 新增：退款管理頁面
├── src/components/Refunds/
│   ├── RefundList.tsx                         # 新增
│   ├── RefundDetail.tsx                       # 新增
│   └── RefundApprovalModal.tsx                # 新增

official_website/
├── src/pages/
│   └── RefundRequest.tsx                      # 新增：退款申請頁面
```

---

## 需要確認的問題

在開始實作前，需要確認以下問題：

1. **退款政策**：是否需要根據活動設定不同的退款規則？還是統一的系統政策？
A. 先不製作退款規則

2. **審核流程**：退款是否需要審核？還是符合條件就自動退款？

3. **退款通知**：需要發送 Email/SMS 通知嗎？

4. **優先順序**：希望先從哪個部分開始？
   - A) 資料表 + 後端 API
   - B) 後台管理頁面
   - C) 前台申請頁面

---

*文件產生日期：2026-01-08*
