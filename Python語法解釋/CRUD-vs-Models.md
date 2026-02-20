# CRUD vs Models 差異

## 一句話說明

| 層級 | 做什麼 | 比喻 |
|------|--------|------|
| **Models** | 定義資料表**長什麼樣子** | 設計表格的「欄位」 |
| **CRUD** | 定義**怎麼操作資料** | 寫 SQL 查詢 |

---

## 對照範例

### Models - 定義結構（是什麼）

```python
# backend/app/models/order.py

class Order(SQLModel, table=True):
    """定義 order 資料表有哪些欄位"""

    id: str = Field(primary_key=True)
    event_id: str = Field(foreign_key="event.id")
    status: str = Field(default="DRAFT")
    total_amount: Decimal = Field(default=Decimal("0.00"))
    created_at: datetime = Field(default_factory=datetime.now)
```

```sql
-- 等於 SQL 的 CREATE TABLE
CREATE TABLE order (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) REFERENCES event(id),
    status VARCHAR(50) DEFAULT 'DRAFT',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP
);
```

### CRUD - 定義操作（怎麼查/改）

```python
# backend/app/crud.py

def get_orders(
    session: Session,
    event_id: str | None = None,
    status: str | None = None,
):
    """查詢訂單（可選條件篩選）"""

    # 基本查詢
    statement = select(Order)

    # 動態加條件
    if event_id:
        statement = statement.where(Order.event_id == event_id)
    if status:
        statement = statement.where(Order.status == status)

    return session.exec(statement).all()
```

```sql
-- 等於 SQL 的 SELECT
SELECT * FROM order
WHERE event_id = 'xxx' AND status = 'PAID';
```

---

## 檔案職責對照

```
backend/app/
├── models/           ← 定義結構
│   ├── order.py      # Order 資料表長什麼樣
│   ├── event.py      # Event 資料表長什麼樣
│   └── member.py     # Member 資料表長什麼樣
│
├── crud.py           ← 定義操作
│   ├── get_orders()      # 怎麼查訂單
│   ├── create_order()    # 怎麼建訂單
│   ├── update_order()    # 怎麼改訂單
│   └── delete_order()    # 怎麼刪訂單
│
└── api/routes/       ← 定義 API 端點
    └── orders.py     # /api/orders 路由
```

---

## CRUD 是什麼意思？

| 字母 | 英文 | 中文 | SQL | Python 函式 |
|------|------|------|-----|-------------|
| C | Create | 新增 | `INSERT` | `create_order()` |
| R | Read | 讀取 | `SELECT` | `get_orders()` |
| U | Update | 更新 | `UPDATE` | `update_order()` |
| D | Delete | 刪除 | `DELETE` | `delete_order()` |

---

## SQLModel 查詢語法對照

| Python (SQLModel) | SQL |
|-------------------|-----|
| `select(Order)` | `SELECT * FROM order` |
| `.where(Order.id == 'xxx')` | `WHERE id = 'xxx'` |
| `.where(Order.status == 'PAID')` | `AND status = 'PAID'` |
| `.order_by(Order.created_at)` | `ORDER BY created_at` |
| `.order_by(Order.created_at.desc())` | `ORDER BY created_at DESC` |
| `.limit(10)` | `LIMIT 10` |
| `.offset(20)` | `OFFSET 20` |
| `session.exec(statement).all()` | 執行並取得所有結果 |
| `session.exec(statement).first()` | 執行並取得第一筆 |
| `session.exec(statement).one()` | 執行並取得唯一一筆（沒有或多筆會報錯） |

---

## 動態查詢範例

### 為什麼用 if 動態組合？

因為不是每次查詢都需要所有條件。

```python
def get_orders(
    session: Session,
    event_id: str | None = None,    # 可選
    status: str | None = None,      # 可選
    buyer_id: str | None = None,    # 可選
):
    statement = select(Order)

    # 有傳才加條件
    if event_id:
        statement = statement.where(Order.event_id == event_id)
    if status:
        statement = statement.where(Order.status == status)
    if buyer_id:
        statement = statement.where(Order.buyer_id == buyer_id)

    return session.exec(statement).all()
```

```python
# 使用時 - 各種組合都可以

# 查全部
get_orders(session)
# → SELECT * FROM order

# 只篩 event
get_orders(session, event_id="event-123")
# → SELECT * FROM order WHERE event_id = 'event-123'

# 篩 event + status
get_orders(session, event_id="event-123", status="PAID")
# → SELECT * FROM order WHERE event_id = 'event-123' AND status = 'PAID'

# 只篩 status
get_orders(session, status="PAID")
# → SELECT * FROM order WHERE status = 'PAID'
```

---

## 完整 CRUD 範例

```python
from sqlmodel import Session, select
from app.models.order import Order, OrderCreate, OrderUpdate

# Create - 新增
def create_order(session: Session, order_in: OrderCreate) -> Order:
    order = Order.model_validate(order_in)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order

# Read - 讀取單筆
def get_order(session: Session, order_id: str) -> Order | None:
    return session.get(Order, order_id)

# Read - 讀取多筆（有篩選）
def get_orders(
    session: Session,
    event_id: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Order]:
    statement = select(Order)

    if event_id:
        statement = statement.where(Order.event_id == event_id)
    if status:
        statement = statement.where(Order.status == status)

    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

# Update - 更新
def update_order(
    session: Session,
    db_order: Order,
    order_in: OrderUpdate,
) -> Order:
    order_data = order_in.model_dump(exclude_unset=True)
    db_order.sqlmodel_update(order_data)
    session.add(db_order)
    session.commit()
    session.refresh(db_order)
    return db_order

# Delete - 刪除
def delete_order(session: Session, db_order: Order) -> None:
    session.delete(db_order)
    session.commit()
```

---

## 快速總結

| 問題 | 答案 |
|------|------|
| Models 做什麼？ | 定義資料表結構（有哪些欄位） |
| CRUD 做什麼？ | 定義查詢/操作邏輯（怎麼撈資料） |
| CRUD 是什麼意思？ | Create, Read, Update, Delete |
| `.where()` 是什麼？ | SQL 的 WHERE 條件 |
| 為什麼用 `if` 動態組合？ | 不是每次都需要所有條件 |

```python
# Models - 定義「是什麼」
class Order(SQLModel, table=True):
    id: str = Field(primary_key=True)
    status: str = Field(default="DRAFT")

# CRUD - 定義「怎麼操作」
def get_orders(session, status=None):
    statement = select(Order)
    if status:
        statement = statement.where(Order.status == status)
    return session.exec(statement).all()
```
