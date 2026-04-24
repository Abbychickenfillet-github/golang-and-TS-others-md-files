# 違規處罰 + 子訂單 + 加價項目 設計

## 資料表設計

### 1. `event_penalty_rule` — 活動違規罰則（主辦方定義）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | varchar(36) PK | |
| event_id | varchar(36) FK | 活動 ID |
| category | varchar(50) | 分類：smoking / pets / unauthorized_sales / sublease / ip_violation / retail / public_order / trial_ride / promotion_outside / other |
| title | varchar(255) | 罰則標題，如「展覽館內禁菸」 |
| description | text | 完整條文內容 |
| penalty_amount | decimal(10,2) | 罰款金額（0 = 僅警告） |
| currency | varchar(3) | TWD |
| penalty_type | varchar(20) | warning / fine / ban / fine_and_ban |
| ban_editions | int | 禁止參展屆數（0 = 不禁） |
| ban_years | int | 禁止參展年數（0 = 不禁） |
| reset_seniority | bool | 是否歸零參展年資 |
| max_warnings | int | 最大警告次數（超過轉罰款，0 = 直接罰） |
| cumulative_threshold | int | 累計幾次後升級處罰（如第 4、5、6 條的 3 次） |
| cumulative_action | varchar(20) | 累計後的處罰：ban |
| is_active | bool | 是否啟用 |
| sort_order | int | 排序 |
| created_at | datetime | |
| updated_at | datetime | |
| deleted_at | datetime | 軟刪除 |

### 2. `violation_record` — 違規紀錄

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | varchar(36) PK | |
| event_id | varchar(36) FK | 活動 ID |
| penalty_rule_id | varchar(36) FK | 對應的罰則 ID（可 NULL = 自訂） |
| company_id | varchar(36) FK | 違規廠商 |
| booth_id | varchar(36) FK | 違規攤位（可 NULL） |
| order_id | varchar(36) FK | 原始訂單（攤位訂單） |
| sub_order_id | varchar(36) FK | 罰款子訂單（可 NULL，建立罰單後填入） |
| reporter_type | varchar(20) | user / member / public（後台人員/會員/民眾檢舉） |
| reporter_id | varchar(36) | 舉報者 ID（可 NULL） |
| violation_date | datetime | 違規日期 |
| title | varchar(255) | 違規標題 |
| description | text | 具體違規描述 |
| evidence_urls | json | 證據圖片/影片 URL 陣列 |
| status | varchar(20) | pending / confirmed / appealed / dismissed / paid |
| penalty_amount | decimal(10,2) | 實際罰款金額 |
| penalty_type | varchar(20) | warning / fine / ban |
| ban_until | datetime | 禁止參展截止日（可 NULL） |
| notes | text | 備註 |
| created_by | varchar(36) | 建立者（user ID） |
| created_at | datetime | |
| updated_at | datetime | |
| deleted_at | datetime | 軟刪除 |

### 3. `order` 表新增欄位 — 支援子訂單

| 欄位 | 類型 | 說明 |
|------|------|------|
| parent_order_id | varchar(36) FK | 父訂單 ID（NULL = 主訂單） |

order_type 新增值：
- `penalty` — 罰款訂單
- `additional` — 加購訂單（額外商品/服務）

## 功能流程

### 主辦方定義罰則
1. 活動設定頁 → 新增「違規罰則」tab
2. 可新增/編輯/刪除罰則條文
3. 提供常見範本（禁菸、禁寵物、禁試乘等）

### 開罰流程
1. 後台訂單/攤位頁 → 「開罰」按鈕
2. 選違規條款 → 填寫描述/上傳證據
3. 建立 violation_record（status=pending）
4. 確認後建立子訂單（order_type=penalty, parent_order_id=原訂單）
5. 子訂單走 ECPay 付款或線下收款

### 子訂單（加購）
1. 訂單細節頁 → 「加購」按鈕
2. 選商品/服務 → 建立子訂單（order_type=additional）
3. 走獨立 ECPay 付款
4. 訂單細節頁顯示「關聯訂單」列表

## API 設計

```
# 罰則管理
POST   /api/v1/events/:event_id/penalty-rules       — 新增罰則
GET    /api/v1/events/:event_id/penalty-rules       — 列出罰則
PATCH  /api/v1/penalty-rules/:id                     — 更新罰則
DELETE /api/v1/penalty-rules/:id                     — 刪除罰則

# 違規紀錄
POST   /api/v1/violation-records                     — 建立違規紀錄
GET    /api/v1/violation-records                     — 列出（支援 event_id/company_id 篩選）
PATCH  /api/v1/violation-records/:id                 — 更新狀態/補充資料
POST   /api/v1/violation-records/:id/create-penalty-order — 建立罰款子訂單

# 子訂單
POST   /api/v1/orders/:order_id/sub-orders           — 建立子訂單
GET    /api/v1/orders/:order_id/sub-orders           — 列出子訂單
```
