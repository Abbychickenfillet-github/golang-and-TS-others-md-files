# Pydantic 介紹

## Pydantic 是什麼？

**Pydantic** 是 Python 的**資料驗證（Data Validation）** 和**型別檢查**套件。它幫你確保資料的格式是對的。

```
┌─────────────────┐     Pydantic 驗證     ┌─────────────────┐
│ 外部輸入的資料   │  ─────────────────►  │ 驗證過的 Python │
│ (JSON/dict)     │                       │ 物件            │
│ {"name": "Bob"} │    檢查型別、格式     │ User(name="Bob")│
└─────────────────┘                       └─────────────────┘
```

---

## 為什麼需要 Pydantic？

### 問題：外部資料不可信

```python
# 假設前端傳來這樣的資料
data = {"name": "Alice", "age": "二十五"}  # age 應該是數字！

# 如果不驗證直接使用...
user_age = data["age"] + 1  # ❌ TypeError: can only concatenate str
```

### 解決：用 Pydantic 自動驗證

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int  # 指定 age 必須是 int

# Pydantic 會自動驗證和轉換
user = User(name="Alice", age="25")  # ✅ 字串 "25" 自動轉成 int 25
print(user.age + 1)  # 26

user = User(name="Alice", age="二十五")  # ❌ ValidationError!
```

---

## Pydantic 的核心功能

### 1. 型別驗證

```python
from pydantic import BaseModel
from datetime import datetime

class Order(BaseModel):
    id: str
    total: float
    created_at: datetime

# 正確的資料
order = Order(
    id="123",
    total=99.99,
    created_at="2024-01-15T10:30:00"  # 字串自動轉成 datetime
)

# 錯誤的資料
order = Order(
    id=123,      # ✅ int 會自動轉成 str
    total="abc", # ❌ ValidationError: 無法轉成 float
    created_at="不是日期"  # ❌ ValidationError
)
```

### 2. 預設值

```python
class Order(BaseModel):
    status: str = "PENDING"  # 預設值
    currency: str = "TWD"

order = Order()  # 不傳也可以，會用預設值
print(order.status)  # "PENDING"
```

### 3. 可選欄位

```python
from typing import Optional

class Order(BaseModel):
    id: str
    note: Optional[str] = None  # 可選，可以是 None

order = Order(id="123")  # note 不傳也 OK
```

### 4. 巢狀模型

```python
class Address(BaseModel):
    city: str
    street: str

class User(BaseModel):
    name: str
    address: Address  # 巢狀模型

user = User(
    name="Alice",
    address={"city": "Taipei", "street": "信義路"}  # 自動轉成 Address
)
```

---

## Pydantic 與 SQLModel 的關係

**SQLModel = Pydantic + SQLAlchemy**

```
┌─────────────┐
│  Pydantic   │ ← 資料驗證、型別檢查、序列化
├─────────────┤
│ SQLAlchemy  │ ← 資料庫 ORM（物件關聯映射）
├─────────────┤
│  SQLModel   │ ← 兩者結合！既能驗證又能存資料庫
└─────────────┘
```

```python
from sqlmodel import SQLModel, Field

# SQLModel 繼承了 Pydantic 的所有功能
class Order(SQLModel, table=True):  # table=True 表示會映射到資料庫
    id: str = Field(primary_key=True)
    status: str = Field(default="PENDING")
    total: float

# 既有 Pydantic 的驗證功能
order = Order(id="123", total="99.99")  # 自動轉型

# 又能存到資料庫
session.add(order)
session.commit()
```

---

## class Config 是什麼？

`class Config` 是 Pydantic Model 內部的**設定類別**，用來自訂 Model 的行為。

```python
class Order(SQLModel, table=True):
    id: str
    created_at: datetime
    total: Decimal

    # ↓ 這是設定區塊，不會變成資料庫欄位
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: str,
        }
```

### 常用的 Config 設定

| 設定 | 說明 | 範例 |
|------|------|------|
| `json_encoders` | 定義特殊型別如何序列化成 JSON | `{datetime: lambda v: v.isoformat()}` |
| `orm_mode` | 允許從 ORM 物件建立 Model | `orm_mode = True` |
| `extra` | 處理未知欄位 | `extra = "forbid"` (禁止額外欄位) |

---

## 實際流程：API 請求

```
前端發送 JSON
      │
      ▼
┌─────────────────┐
│ FastAPI 接收    │
│ {"id": "123",   │
│  "total": 99.99}│
└────────┬────────┘
         │
         ▼ Pydantic 驗證
┌─────────────────┐
│ 檢查型別        │
│ 轉換格式        │
│ 填入預設值      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Order 物件      │
│ (驗證過的資料)  │
└────────┬────────┘
         │
         ▼ 存入資料庫
┌─────────────────┐
│ SQLAlchemy      │
│ session.add()   │
└─────────────────┘
```

---

## 專案中的 Pydantic 模式

我們的專案中常見這種模式：

```python
# 基礎欄位（用於繼承）
class OrderBase(SQLModel):
    order_type: str
    total_amount: Decimal
    currency: str = "TWD"

# 建立用（接收前端資料）
class OrderCreate(OrderBase):
    recaptcha_token: str | None = None

# 更新用（所有欄位都可選）
class OrderUpdate(SQLModel):
    order_type: str | None = None
    total_amount: Decimal | None = None

# 資料庫模型（實際存進 DB）
class Order(OrderBase, table=True):
    id: str = Field(primary_key=True)
    created_at: datetime

    class Config:
        json_encoders = {...}

# 回傳用（API 回應格式）
class OrderPublic(OrderBase):
    id: str
    created_at: datetime
```

這種模式的好處：
- **OrderCreate**: 驗證輸入資料
- **OrderUpdate**: 只更新有傳的欄位
- **Order**: 完整的資料庫結構
- **OrderPublic**: 控制要回傳哪些欄位

---

## 總結

| 概念 | 說明 |
|------|------|
| Pydantic | Python 資料驗證套件 |
| 主要功能 | 型別檢查、自動轉型、預設值、巢狀驗證 |
| SQLModel | Pydantic + SQLAlchemy 的結合 |
| class Config | Model 內部的設定區塊 |
| json_encoders | 定義特殊型別如何轉成 JSON |

**重點：Pydantic 確保外部資料的正確性，讓你安心使用！**
