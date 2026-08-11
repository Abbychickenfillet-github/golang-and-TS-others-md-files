---
title: "Enum與TypeDecorator"
---

# Python Enum 與 SQLAlchemy TypeDecorator

## Enum 基礎：name 與 value

```python
from enum import Enum

class PaymentStatus(str, Enum):
    PENDING = "pending"      # name=PENDING, value="pending"
    PAID = "paid"            # name=PAID, value="paid"
```

### name 和 value 是什麼型別？

| 屬性 | 值 | 型別 |
|------|-----|------|
| `.name` | `"PENDING"` | 永遠是 `str` |
| `.value` | `"pending"` | 看你定義什麼 |

```python
# 驗證
print(PaymentStatus.PENDING.name)   # "PENDING"
print(PaymentStatus.PENDING.value)  # "pending"

print(type(PaymentStatus.PENDING.name))   # <class 'str'>
print(type(PaymentStatus.PENDING.value))  # <class 'str'>
```

### value 可以是任何型別

```python
# value 是 str
class Status(str, Enum):
    ACTIVE = "active"      # value 是 str

# value 是 int
class Priority(int, Enum):
    LOW = 1                # value 是 int
    HIGH = 10              # value 是 int

# value 是任意型別
class Color(Enum):
    RED = (255, 0, 0)      # value 是 tuple
    GREEN = [0, 255, 0]    # value 是 list
```

**簡單記：**
- `name` → 永遠 `str`，就是你寫的變數名稱（大寫那個）
- `value` → 你賦值什麼就是什麼型別

---

## 問題背景：Enum 存進資料庫會怎樣？

**問題：存進資料庫時，要存 `name` 還是 `value`？**

| 存什麼 | 資料庫值 | 問題 |
|--------|----------|------|
| name | `"PENDING"` | 大寫，不好看 |
| value | `"pending"` | 小寫，比較乾淨 |

---

## SQLAlchemy 預設行為

SQLAlchemy 預設可能會存 **name**（大寫），但我們通常想存 **value**（小寫）。

```python
# 預設行為（可能有問題）
order.payment_status = PaymentStatus.PENDING
# 資料庫可能存：'PENDING'（name）而不是 'pending'（value）
```

---

## 解法一：TypeDecorator（自訂轉換器）

`TypeDecorator` 是 SQLAlchemy 提供的「自訂型別轉換器」，可以控制：
- **存進去時**：Python → 資料庫（`process_bind_param`）
- **讀出來時**：資料庫 → Python（`process_result_value`）

```python
from sqlalchemy import TypeDecorator, String

class EnumType(TypeDecorator):
    """自定義 Enum 類型處理器，使用 enum 值而不是名稱"""
    impl = String          # 底層用 String 存
    cache_ok = True

    def __init__(self, enum_class, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class

    def process_bind_param(self, value, dialect):
        """Python → 資料庫：存 value"""
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value    # ← 關鍵：存 .value 而不是 .name
        return str(value)

    def process_result_value(self, value, dialect):
        """資料庫 → Python：轉回 Enum"""
        if value is None:
            return None
        # 從 value 找回對應的 Enum
        for enum_item in self.enum_class:
            if enum_item.value == value:
                return enum_item
        return value
```

### 使用方式

```python
# 在 Model 中使用
class Order(SQLModel, table=True):
    payment_status: PaymentStatus = Field(
        sa_column=Column(EnumType(PaymentStatus))
    )
```

---

## 解法二：直接用 String（本專案採用的方式）

本專案最後**沒有用 `EnumType`**，而是直接把欄位定義成 String：

```python
class Order(OrderBase, table=True):
    # 直接用 String，手動處理
    payment_status: str = Field(
        default=PaymentStatus.PENDING.value,    # 存 value
        sa_column=Column("payment_status", String(20), nullable=False),
    )
```

### 為什麼改用這種方式？

| 方式 | 優點 | 缺點 |
|------|------|------|
| TypeDecorator | 自動轉換，型別安全 | 複雜，可能有 ORM 相容問題 |
| 直接用 String | 簡單，不會有 ORM 問題 | 要手動處理轉換 |

---

## 流程圖解

```
【使用 TypeDecorator】
Python Enum ──process_bind_param──→ 資料庫 String
             ←──process_result_value──

【直接用 String】
Python Enum.value ──────→ 資料庫 String（手動取 .value）
                  ←────── 讀出來是 String（不會自動變回 Enum）
```

---

## 本專案的實際狀況

```python
# backend/app/models/order.py

# 1. 定義了 EnumType（但沒用）
class EnumType(TypeDecorator):
    ...

# 2. 定義了 Enum
class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    ...

# 3. 實際使用 String 存（不用 EnumType）
class Order(OrderBase, table=True):
    payment_status: str = Field(
        default=PaymentStatus.PENDING.value,
        sa_column=Column("payment_status", String(20), nullable=False),
    )
```

**結論：`EnumType` 是之前的嘗試，後來改用更簡單的 String 方式。**

---

## 什麼時候要用 TypeDecorator？

| 情境 | 建議 |
|------|------|
| 簡單的 Enum | 直接用 String，手動取 `.value` |
| 需要自動轉換 | 用 TypeDecorator |
| 需要加密/解密欄位 | 用 TypeDecorator |
| 需要自訂 JSON 序列化 | 用 TypeDecorator |
| 需要壓縮/解壓縮 | 用 TypeDecorator |

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `TypeDecorator` 是什麼？ | SQLAlchemy 的自訂型別轉換器 |
| `EnumType` 做什麼？ | 確保存 enum 的 value 而不是 name |
| 本專案用了嗎？ | 定義了但沒用，改用直接 String |
| 為什麼要處理 Enum？ | 避免資料庫存大寫 name 而不是小寫 value |

---

## 🤔 Abby 的疑問

> 如果資料庫有 enum 就要用????

**答案：不一定！**

1. 如果你想存 **value**（如 `"pending"`）→ 要處理（用 TypeDecorator 或手動取 .value）
2. 如果你接受存 **name**（如 `"PENDING"`）→ 不用特別處理
3. 本專案選擇：直接用 String + 手動取 `.value`，最簡單
