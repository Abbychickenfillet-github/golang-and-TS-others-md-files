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

## 綠界 ECPay 退款限制說明

### 部分退款支援情況

根據 [ECPay 官方文件](https://developers.ecpay.com.tw/?p=9242)：

| 訂單狀態 | 支援部分退款 | 操作方式 |
|----------|--------------|----------|
| **已授權** (尚未關帳) | ✅ 支援 | 執行 `Action=R` (退刷) |
| **要關帳** | ✅ 支援 | 執行 `Action=R` (退刷) |
| **已關帳** | ❌ 不支援 | 只能全額退款 `Action=R` |

### 退款流程說明

1. **已授權階段** (信用卡尚未請款)
   - 全額退款：先執行[取消] `Action=E`，再執行[放棄] `Action=N`
   - 部分退款：執行[退刷] `Action=R`

2. **已關帳階段** (已向銀行請款完成)
   - **不支援部分金額退款，一律以訂單全額進行退款**
   - 執行[退刷] `Action=R`

### 重要注意事項

- **帳戶餘額**：如帳戶餘額低於退刷金額，將無法退刷，建議留存一定金額於綠界帳戶供退刷之用
- **驗證時間**：驗證時間區間為 10 分鐘內有效
- **2025/4/1 起 API 調整**：綠界有金流技術串接規格調整，詳見 [公告](https://www.ecpay.com.tw/announcement/DetailAnnouncement?nID=5632)

### 實務建議

由於已關帳後不支援部分退款，建議：

1. **延遲關帳**：設定合理的關帳時間（如活動結束後），在此之前保留退款彈性
2. **退款政策明確**：在前台說明退款僅限活動開始前 N 天
3. **部分退款替代方案**：若需部分退款但已關帳，可考慮以「優惠券」或「下次折抵」方式處理

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

#### 業務流程
```
消費者申請退款 (official_website)
         ↓
    建立 refund_record (status=pending)
         ↓
後台管理員審核 (frontend)
    ↙         ↘
  核准          駁回
    ↓            ↓
status=processing  status=rejected
    ↓
檢查 ECPay 訂單狀態
    ↓
 已授權/要關帳 → 支援部分退款
 已關帳 → 僅全額退款
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

#### 資料表關係與資料流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           資料建立順序                                   │
└─────────────────────────────────────────────────────────────────────────┘

  [1] 消費者下單付款
         │
         ▼
┌─────────────────┐
│     order       │  ← 先建立訂單
│─────────────────│
│ id              │
│ payment_status  │ = 'PAID'
│ total_amount    │ = 5000
│ refunded_at     │ = NULL
│ refund_amount   │ = NULL
└────────┬────────┘
         │
         │ [2] 消費者申請退款
         ▼
┌─────────────────┐
│  refund_record  │  ← 建立退款申請記錄
│─────────────────│
│ id              │
│ order_id ───────┼──► FK 關聯到 order
│ status          │ = 'pending'
│ refund_amount   │ = 5000
│ refund_type     │ = 'full'
└────────┬────────┘
         │
         │ [3] IT/Boss 審核通過，ECPay 退款成功
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          同時更新兩張表                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐              ┌─────────────────┐
│  refund_record  │              │     order       │
│─────────────────│              │─────────────────│
│ status          │ = 'success'  │ payment_status  │ = 'REFUNDED'
│ reviewed_at     │ = NOW()      │ refunded_at     │ = NOW()
│ ecpay_return_*  │ = ECPay回傳  │ refund_amount   │ = 5000
└─────────────────┘              │ refund_reason   │ = '客戶申請'
                                 └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        多次退款場景 (部分退款)                           │
└─────────────────────────────────────────────────────────────────────────┘

     order                        refund_record (可多筆)
┌─────────────────┐        ┌─────────────────┐
│ total_amount    │ 10000  │ #1 退款 3000    │ status=success
│ refund_amount   │ 5000   │ #2 退款 2000    │ status=success
│ (累計已退)      │ ◄──────│ #3 退款申請中   │ status=pending
└─────────────────┘        └─────────────────┘
```

#### 程式碼流程 (Service 層)

```python
# backend/app/services/refund_service.py

def approve_refund(session, refund_id, reviewer_user_id, review_comment):
    """
    審核通過退款流程
    """
    # 1. 取得 refund_record
    refund = session.get(RefundRecord, refund_id)

    # 2. 取得關聯的 order
    order = session.get(Order, refund.order_id)

    # 3. 呼叫 ECPay 退款 API
    ecpay_result = payment_service.process_refund(
        trade_no=order.ecpay_trade_no,
        amount=refund.refund_amount
    )

    # 4. 更新 refund_record
    if ecpay_result.success:
        refund.status = 'success'
        refund.ecpay_return_code = ecpay_result.code

        # 5. 同步更新 order (累計退款金額)
        order.refund_amount = (order.refund_amount or 0) + refund.refund_amount
        order.refunded_at = datetime.now()

        # 如果已全額退款，更新付款狀態
        if order.refund_amount >= order.total_amount:
            order.payment_status = 'REFUNDED'
    else:
        refund.status = 'failed'
        refund.ecpay_return_message = ecpay_result.message

    # 6. 儲存變更
    session.commit()

    # 7. 發送通知
    notification_service.send_refund_notification(...)
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

## 業主確認單：退款政策

請業主勾選適合的退款政策方案：

### 退款時間規則

| 選項 | 方案名稱 | 說明 |
|------|----------|------|
| ☐ A | **標準方案 (推薦)** | 活動前 7 天全額退款、3-7 天扣 10%、3 天內不可退 |
| ☐ B | 寬鬆方案 | 活動開始前皆可全額退款 |
| ☐ C | 嚴格方案 | 購票後 24 小時內可退款，超過不可退 |
| ☐ D | 自訂方案 | 請填寫：__________________________ |

### 各方案詳細說明

**A) 標準方案 (推薦)**
- 活動開始前 7 天以上：全額退款 (100%)
- 活動開始前 3~7 天：扣除 10% 手續費後退款 (90%)
- 活動開始前 3 天內：不可退款
- 活動開始後 / 已報到：不可退款

**B) 寬鬆方案**
- 活動開始前：全額退款 (100%)
- 活動開始後：不可退款

**C) 嚴格方案**
- 購票後 24 小時內：全額退款 (100%)
- 超過 24 小時：不可退款

### 其他確認項目

| 項目 | 選項 |
|------|------|
| 已報到的票可否退款？ | ☐ 可以 / ☐ 不可以 (建議) |
| 退款是否需要人工審核？ | ☐ 需要 (建議) / ☐ 自動退款 |
| 退款完成是否發送 Email 通知？ | ☐ 是 (建議) / ☐ 否 |

### 簽核

- 確認人：__________________
- 確認日期：__________________

---

## 開發確認事項

根據討論，以下為已確認項目：

- ✅ **審核流程**：需要人工審核
- ✅ **退款通知**：發送 Email 給消費者留存
- ✅ **退款政策**：攤位承租不方便退款，除非經過主辦與系統同意否則無法退款

---

## 實作完成清單 (2026-01-08)

### 後端 (Backend)
- ✅ SQL 遷移腳本: `backend/sql/143_create_refund_record_table.sql`
- ✅ Python 模型: `backend/app/models/refund_record.py`
- ✅ CRUD 層: `backend/app/crud/refund_record.py`
- ✅ 服務層: `backend/app/services/refund_service.py`
- ✅ API Routes: `backend/app/api/routes/refunds.py`

### 前端 (Frontend)
- ✅ 退款管理頁面: `frontend/src/routes/_layout/refunds.tsx`
- ✅ 側邊欄整合: `frontend/src/components/Common/SidebarItems.tsx`
  - 退款管理頁籤 (IT/Boss/Manager/Admin 可見)
  - 待審核數量 Badge (僅 IT/Boss 可見)

### API 端點
| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/v1/refunds/` | 列出退款申請 |
| GET | `/api/v1/refunds/pending-count` | 待審核數量 |
| GET | `/api/v1/refunds/can-approve` | 檢查審核權限 |
| GET | `/api/v1/refunds/{id}` | 退款詳情 |
| POST | `/api/v1/refunds/request` | 建立退款申請 |
| POST | `/api/v1/refunds/{id}/approve` | 審核通過並執行退款 |
| POST | `/api/v1/refunds/{id}/reject` | 駁回退款 |
| GET | `/api/v1/refunds/order/{order_id}/history` | 訂單退款歷史 |

### 權限矩陣

| 角色 | 檢視退款列表 | 查看金額 | 審核按鈕 | 待審核 Badge |
|------|-------------|---------|---------|--------------|
| IT | ✅ | ✅ | ✅ | ✅ |
| Boss | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ❌ (顯示 ******) | ❌ | ❌ |
| Admin | ✅ | ❌ (顯示 ******) | ❌ | ❌ |
| PT/服務商 | ❌ | ❌ | ❌ | ❌ |

### 部署步驟
1. 執行 SQL: `143_create_refund_record_table.sql` ✅ 已完成
2. 重新建構後端 Docker
3. 前端重新 build

---

## 資料架構說明

### refund_record 與 order 的關係

```
┌─────────────────────────────────────────────────────────────┐
│                        order 資料表                          │
│  (訂單的最終狀態)                                             │
├─────────────────────────────────────────────────────────────┤
│  refunded_at      → 最後一次退款成功的時間                    │
│  refund_amount    → 累計退款總金額                           │
│  refund_reason    → 退款原因摘要                             │
│  payment_status   → 付款狀態 (可變為 REFUNDED)               │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ 退款成功後更新
                              │
┌─────────────────────────────────────────────────────────────┐
│                   refund_record 資料表                       │
│  (每筆退款申請的完整生命週期)                                  │
├─────────────────────────────────────────────────────────────┤
│  一筆 order 可以有多筆 refund_record (支援多次退款)           │
│                                                             │
│  status 狀態流程:                                            │
│  pending → approved → success  (審核通過，退款成功)          │
│         → approved → failed    (審核通過，ECPay 退款失敗)    │
│         → rejected             (審核駁回)                    │
└─────────────────────────────────────────────────────────────┘
```

**為什麼需要兩者？**
1. `order` 表記錄訂單的**最終狀態**，方便快速查詢
2. `refund_record` 表追蹤**完整審核流程**，支援：
   - 多次退款申請（部分退款場景）
   - 審核歷史記錄
   - ECPay API 呼叫結果追蹤

---

## 退款功能測試教學

### 前置條件

1. **啟動後端服務**
   ```bash
   cd C:/coding/template
   docker compose up -d backend
   ```

2. **確認資料表已建立**
   ```sql
   DESCRIBE refund_record;
   ```

### 測試步驟

#### 步驟 1: 建立測試退款申請

使用 IT/Boss 帳號登入後台，透過 API 或 Swagger UI 建立退款申請：

```bash
# 方法 1: 使用 curl
curl -X POST "http://localhost:8003/api/v1/refunds/request" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "<已付款訂單的 ID>",
    "request_reason": "測試退款",
    "refund_amount": 100.00
  }'
```

```python
# 方法 2: 使用 Python 腳本
import pymysql
import uuid
from datetime import datetime

conn = pymysql.connect(
    host='hnd1.clusters.zeabur.com',
    port=32195,
    user='root',
    password='<MYSQL_PASSWORD>',
    database='future_sign_prod'
)

# 找一筆已付款訂單
cursor = conn.cursor()
cursor.execute("""
    SELECT id, order_number, total_amount
    FROM `order`
    WHERE payment_status = 'PAID'
    AND deleted_at IS NULL
    LIMIT 1
""")
order = cursor.fetchone()
print(f"測試訂單: {order}")

# 建立退款申請
refund_id = str(uuid.uuid4())
refund_number = f"RF-{datetime.now().strftime('%Y%m%d')}-{refund_id[:6].upper()}"

cursor.execute("""
    INSERT INTO refund_record
    (id, order_id, refund_number, refund_amount, refund_type, status,
     request_reason, requested_at, created_at, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW())
""", (refund_id, order[0], refund_number, order[2], 'full', 'pending', '測試退款申請'))

conn.commit()
print(f"已建立退款申請: {refund_number}")
conn.close()
```

#### 步驟 2: 登入後台檢視

1. 開啟後台 `http://localhost:5173`
2. 使用 IT 或 Boss 帳號登入
3. 側邊欄應該顯示「退款管理」並有紅色 Badge 數字
4. 點擊進入退款管理頁面

#### 步驟 3: 測試權限差異

| 測試項目 | IT/Boss 帳號 | Manager/Admin 帳號 |
|---------|-------------|-------------------|
| 退款管理選項 | 可見 | 可見 |
| 待審核 Badge | 顯示數字 | 不顯示 |
| 金額欄位 | 顯示 NT$ xxx | 顯示 ****** |
| 審核按鈕 | 可見且可點擊 | 不可見 |

#### 步驟 4: 測試審核流程

**核准退款：**
1. 點擊待審核退款的「查看詳情」
2. 填寫審核備註（選填）
3. 點擊「核准並退款」
4. 系統會呼叫 ECPay 退款 API
5. 狀態變更為 `success` 或 `failed`

**駁回退款：**
1. 點擊待審核退款的「駁回」按鈕
2. 填寫駁回原因（必填）
3. 點擊「確認駁回」
4. 狀態變更為 `rejected`

#### 步驟 5: 驗證資料庫

```python
# 查看退款記錄
cursor.execute("""
    SELECT refund_number, status, refund_amount,
           reviewed_at, review_comment
    FROM refund_record
    ORDER BY created_at DESC
    LIMIT 5
""")
for row in cursor.fetchall():
    print(row)
```

### 注意事項

1. **ECPay 測試環境**
   - 正式退款需要 ECPay 測試帳號
   - 測試環境可能需要設定 `ECPAY_TEST_MODE=true`

2. **已關帳訂單**
   - ECPay 已關帳訂單只支援全額退款
   - 部分退款會被 ECPay 拒絕

3. **帳戶餘額**
   - ECPay 帳戶餘額不足時退款會失敗
   - 錯誤訊息會記錄在 `ecpay_return_message` 欄位

---

## 參考資源

- [ECPay 信用卡請退款功能](https://developers.ecpay.com.tw/?p=9242)
- [ECPay 查詢訂單退款資訊](https://developers.ecpay.com.tw/?p=29971)
- [2025/4/1 綠界 API 調整公告](https://www.ecpay.com.tw/announcement/DetailAnnouncement?nID=5632)

---

*文件產生日期：2026-01-08*
