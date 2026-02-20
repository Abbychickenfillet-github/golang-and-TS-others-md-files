# SQLModel 的 sa_column 參數說明

## 什麼是 sa_column？

`sa_column` 是 **SQLModel** 中的參數，用來直接傳遞 **SQLAlchemy Column** 設定。

```
SQLModel = Pydantic + SQLAlchemy 的結合

sa = SQLAlchemy 的縮寫
sa_column = SQLAlchemy Column（資料庫欄位的原生定義）
```

---

## 為什麼需要它？

```python
# SQLModel 的 Field() 無法處理所有 SQLAlchemy 功能
# 需要用 sa_column 來設定進階的資料庫欄位屬性

from sqlmodel import Field, SQLModel
from sqlalchemy import Column, String, Enum, DECIMAL

class Ticket(SQLModel, table=True):
    # 簡單情況：Field() 就夠了
    ticket_name: str = Field(max_length=255)

    # 複雜情況：需要 sa_column
    status: str = Field(
        default="draft",
        sa_column=Column(
            Enum("draft", "active", "sold_out", "cancelled"),  # ← 資料庫層的 ENUM
            nullable=False
        )
    )

    price: Decimal = Field(
        sa_column=Column(
            DECIMAL(10, 2),  # ← 精確的十進位數字（10位數，2位小數）
            nullable=True
        )
    )
```

---

## Field() vs sa_column 對照

| Field() | sa_column |
|---------|-----------|
| Pydantic 驗證 | SQLAlchemy 資料庫定義 |
| Python 層面 | 資料庫層面 |
| 型別檢查 | 欄位類型、索引、外鍵、約束 |

```
Field(max_length=255)           → Python/Pydantic 驗證用
sa_column=Column(String(255))   → 資料庫 DDL 生成用

兩者可以一起用，各司其職！
```

---

## 常見使用場景

### 1. 外鍵 (Foreign Key)

```python
event_id: str = Field(
    sa_column=Column(
        String(36),
        ForeignKey("event.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
)
```

### 2. 資料庫 ENUM

```python
class TicketStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SOLD_OUT = "sold_out"
    CANCELLED = "cancelled"

status: str = Field(
    default="draft",
    sa_column=Column(
        SQLEnum(TicketStatus, values_callable=lambda x: [e.value for e in x])
    )
)
```

### 3. 精確小數 (金額)

```python
from decimal import Decimal
from sqlalchemy import DECIMAL

price: Decimal = Field(
    sa_column=Column(DECIMAL(10, 2))  # 10位數，2位小數
)
```

### 4. 唯一值 + 索引

```python
email: str = Field(
    sa_column=Column(
        String(255),
        unique=True,
        index=True
    )
)
```

### 5. Check 約束

```python
from sqlalchemy import CheckConstraint

class Product(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint("price >= 0", name="check_positive_price"),
    )

    price: Decimal = Field(sa_column=Column(DECIMAL(10, 2)))
```

---

## sa_column 常用參數

| 參數 | 說明 | 範例 |
|-----|------|------|
| `nullable` | 是否可為 NULL | `nullable=False` |
| `unique` | 是否唯一 | `unique=True` |
| `index` | 是否建立索引 | `index=True` |
| `default` | 資料庫預設值 | `default="active"` |
| `server_default` | SQL 層預設值 | `server_default="NOW()"` |
| `primary_key` | 是否為主鍵 | `primary_key=True` |
| `autoincrement` | 是否自動遞增 | `autoincrement=True` |

---

## 注意事項

1. **不要同時在 Field() 和 sa_column 設定相同屬性**
   ```python
   # 錯誤：重複設定
   name: str = Field(
       max_length=255,  # Pydantic 驗證
       sa_column=Column(String(255))  # 又設定一次
   )

   # 正確：分開職責
   name: str = Field(sa_column=Column(String(255), nullable=False))
   ```

2. **sa_column 會覆蓋 Field() 的資料庫相關設定**

3. **使用 sa_column 時，型別註解仍然需要**
   ```python
   # 型別註解 (str) 給 Python/Pydantic 用
   # sa_column 給資料庫用
   status: str = Field(sa_column=Column(SQLEnum(TicketStatus)))
   ```
