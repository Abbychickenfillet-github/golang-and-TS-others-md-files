# Event 和 Tickets 資料表設計說明

**日期**: 2024-12-19
**主題**: Event 表新增 banner_image_url 欄位、Tickets 表設計

---

## 設計決策

### 1. Event 表新增欄位

**新增欄位**: `banner_image_url`
- 類型: `VARCHAR(500)`
- 可為空: `YES`
- 用途: 儲存活動橫幅圖片 URL

**SQL 腳本**: `006_add_event_banner_image_url.sql`

---

### 2. Tickets 表設計

#### 關係設計

**決定**: **一對多關係（Event 1:N Tickets）**

**理由**:
- ✅ 一個活動可以有多種票券類型（例如：早鳥票、一般票、VIP票）
- ✅ 每種票券可能有不同的價格、數量、銷售時間
- ✅ 符合實際業務需求

**外鍵設計**:
- `tickets.event_id` → `event.id`
- 使用 `ON DELETE CASCADE`：刪除活動時自動刪除相關票券

#### 表名稱

**決定**: 使用複數 `tickets`

**理由**:
- 符合資料庫命名慣例（表名通常用複數）
- 一個 event 可以有多個 ticket 記錄
- 與其他表命名一致（如 `members`, `companies`）

#### 核心欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | VARCHAR(36) | 票券ID (UUID) |
| `event_id` | VARCHAR(36) | 活動ID (外鍵) |
| `ticket_name` | VARCHAR(255) | 票券名稱 |
| `description` | TEXT | 票券描述 |
| `is_free` | BOOLEAN | 是否免費 |
| `price` | DECIMAL(10,2) | 票券價格（付費票券必填） |
| `currency` | VARCHAR(10) | 幣別（預設 TWD） |
| `quantity` | INT | 票券總數量 |
| `sold_count` | INT | 已售出數量 |
| `sales_start_at` | TIMESTAMP | 售票開始時間 |
| `sales_end_at` | TIMESTAMP | 售票結束時間 |
| `status` | ENUM | 票券狀態（draft/active/sold_out/cancelled） |
| `sort_order` | INT | 排序順序 |

#### 活動時間設計

**決定**: **活動時間綁定在 Event 表，Tickets 表不包含活動時間**

**理由**:
- ✅ 避免資料不一致：所有票券都屬於同一個活動，活動時間應該統一
- ✅ 符合正規化原則：活動時間是活動的屬性，不是票券的屬性
- ✅ 易於維護：修改活動時間時只需更新一個地方

**Event 表包含**:
- `start_at`: 活動開始時間
- `end_at`: 活動結束時間

**Tickets 表包含**:
- `sales_start_at`: 售票開始時間
- `sales_end_at`: 售票結束時間

**邏輯關係**:
```
售票時間範圍 ⊆ 活動時間範圍
即：sales_start_at >= event.start_at 且 sales_end_at <= event.end_at
```

#### 約束條件

**1. 價格約束**:
```sql
CHECK (
    (is_free = TRUE AND price IS NULL) OR
    (is_free = FALSE AND price IS NOT NULL AND price >= 0)
)
```
- 免費票券：`is_free = TRUE` 時，`price` 必須為 `NULL`
- 付費票券：`is_free = FALSE` 時，`price` 必須存在且 >= 0

**2. 售票時間約束**:
```sql
CHECK (sales_end_at > sales_start_at)
```
- 售票結束時間必須晚於開始時間

**3. 數量約束**:
```sql
CHECK (sold_count <= quantity AND sold_count >= 0)
```
- 已售出數量不能超過總數量
- 已售出數量不能為負數

#### 索引設計

| 索引名稱 | 欄位 | 用途 |
|---------|------|------|
| `idx_tickets_event_id` | `event_id` | 外鍵查詢、JOIN 效能 |
| `idx_tickets_status` | `status` | 狀態篩選 |
| `idx_tickets_sales_time` | `sales_start_at, sales_end_at` | 查詢正在銷售的票券 |
| `idx_tickets_is_free` | `is_free` | 免費/付費篩選 |
| `idx_tickets_event_status` | `event_id, status` | 活動+狀態複合查詢 |
| `idx_tickets_sort_order` | `event_id, sort_order` | 排序查詢 |

---

## 檔案清單

### SQL 遷移腳本

1. **`006_add_event_banner_image_url.sql`**
   - 為 event 表新增 `banner_image_url` 欄位

2. **`007_create_tickets_table.sql`**
   - 創建 tickets 表
   - 包含所有欄位、約束、索引

### Python 模型

1. **`backend/app/models/event.py`**
   - `Event`: 資料庫模型
   - `EventBase`: 基礎模型
   - `EventCreate`: 創建模型
   - `EventUpdate`: 更新模型
   - `EventPublic`: 公開模型
   - `EventWithTickets`: 包含票券的活動模型

2. **`backend/app/models/ticket.py`**
   - `Ticket`: 資料庫模型
   - `TicketBase`: 基礎模型
   - `TicketCreate`: 創建模型
   - `TicketUpdate`: 更新模型
   - `TicketPublic`: 公開模型（包含 `available_count` 計算屬性）
   - `TicketWithEvent`: 包含活動資訊的票券模型
   - `TicketsPublic`: 票券列表模型

---

## 使用範例

### 查詢活動的所有票券

```python
from app.models import Event, Ticket
from sqlmodel import select

# 查詢活動及其票券
event = session.get(Event, event_id)
tickets = session.exec(
    select(Ticket).where(Ticket.event_id == event_id)
).all()
```

### 創建票券

```python
from app.models import TicketCreate

ticket_data = TicketCreate(
    event_id="event-uuid",
    ticket_name="早鳥票",
    is_free=False,
    price=Decimal("500.00"),
    currency="TWD",
    quantity=100,
    sales_start_at=datetime(2024, 1, 1),
    sales_end_at=datetime(2024, 1, 31),
    status="active"
)

ticket = Ticket(**ticket_data.model_dump())
session.add(ticket)
session.commit()
```

### 查詢可售票券

```python
from datetime import datetime

now = datetime.now()
available_tickets = session.exec(
    select(Ticket).where(
        Ticket.event_id == event_id,
        Ticket.status == "active",
        Ticket.sales_start_at <= now,
        Ticket.sales_end_at >= now,
        Ticket.sold_count < Ticket.quantity
    )
).all()
```

---

## 後續建議

1. **業務邏輯驗證**
   - 在應用層驗證售票時間是否在活動時間範圍內
   - 驗證票券數量是否足夠

2. **API 設計**
   - 創建 `tickets` 相關的 CRUD API
   - 實現票券購買邏輯
   - 實現庫存管理

3. **效能優化**
   - 考慮為熱門查詢添加緩存
   - 監控索引使用情況

4. **資料完整性**
   - 考慮添加觸發器自動更新 `sold_count`
   - 考慮添加觸發器自動更新 `status`（當售完時）

---

## 相關檔案

- `backend/sql/006_add_event_banner_image_url.sql`
- `backend/sql/007_create_tickets_table.sql`
- `backend/app/models/event.py`
- `backend/app/models/ticket.py`
