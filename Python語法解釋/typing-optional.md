# Python typing 模組 - Optional

## 一句話說明

`Optional[X]` 表示這個值**可以是 X 型別，也可以是 None**。

```python
from typing import Optional

name: Optional[str] = "Alice"  # 可以是 str
name: Optional[str] = None     # 也可以是 None
```

---

## Optional 等於什麼？

```python
from typing import Optional, Union

# 這兩個完全一樣
Optional[str]       # 寫法 1：簡潔
Union[str, None]    # 寫法 2：完整

# Python 3.10+ 可以更簡潔
str | None          # 寫法 3：最新語法 ✅
```

| 寫法 | 意思 | Python 版本 |
|------|------|-------------|
| `Optional[str]` | str 或 None | 3.5+ |
| `Union[str, None]` | str 或 None | 3.5+ |
| `str \| None` | str 或 None | 3.10+ ✅ |

---

## 為什麼需要 Optional？

### 沒有 Optional - 不知道能不能傳 None

```python
def greet(name: str):
    print(f"Hello, {name}")

greet("Alice")  # ✅ OK
greet(None)     # ❓ 可以嗎？不知道...
```

### 有 Optional - 明確表示可以是 None

```python
from typing import Optional

def greet(name: Optional[str]):
    if name:
        print(f"Hello, {name}")
    else:
        print("Hello, stranger")

greet("Alice")  # ✅ OK
greet(None)     # ✅ OK，明確知道可以傳 None
```

---

## 實際範例（本專案）

```python
# backend/app/models/order.py

from typing import Optional

class Order(SQLModel, table=True):
    # 必填欄位 - 不用 Optional
    id: str = Field(primary_key=True)
    event_id: str = Field(foreign_key="event.id")

    # 可選欄位 - 用 Optional（可以是 None）
    buyer_id: Optional[str] = Field(default=None)
    note: Optional[str] = Field(default=None)

    # 關聯 - 可能沒有關聯物件
    event: Optional["Event"] = Relationship(back_populates="orders")
```

---

## Optional vs 預設值

```python
from typing import Optional

# Optional 只是「型別提示」，不會自動給預設值
name: Optional[str]           # 型別是 str | None，但沒有預設值

# 要有預設值要自己寫
name: Optional[str] = None    # 型別是 str | None，預設是 None
```

---

## 常見用法

### 1. 函式參數

```python
from typing import Optional

def search_orders(
    event_id: Optional[str] = None,    # 可選參數
    status: Optional[str] = None,      # 可選參數
) -> list[Order]:
    ...
```

### 2. 函式回傳值

```python
from typing import Optional

def get_order(order_id: str) -> Optional[Order]:
    """找不到時回傳 None"""
    order = session.get(Order, order_id)
    return order  # 可能是 Order，也可能是 None
```

### 3. 類別屬性

```python
from typing import Optional

class Order(SQLModel, table=True):
    buyer_id: Optional[str] = None      # 可以沒有買家
    note: Optional[str] = None          # 可以沒有備註
    event: Optional["Event"] = None     # 可以沒有關聯
```

---

## Python 3.10+ 新語法

Python 3.10 之後可以用 `|` 取代 `Optional`：

```python
# 舊寫法（3.5+）
from typing import Optional
name: Optional[str] = None

# 新寫法（3.10+）✅ 推薦
name: str | None = None
```

### 本專案的寫法

```python
# 本專案用新語法
class Order(SQLModel, table=True):
    buyer_id: str | None = Field(default=None)
    note: str | None = Field(default=None)
```

---

## typing 模組其他常用型別

```python
from typing import Optional, List, Dict, Union, Any

# Optional - 可以是 None
name: Optional[str]

# List - 列表（Python 3.9+ 可直接用 list）
items: List[str]        # 舊寫法
items: list[str]        # 新寫法 ✅

# Dict - 字典（Python 3.9+ 可直接用 dict）
data: Dict[str, int]    # 舊寫法
data: dict[str, int]    # 新寫法 ✅

# Union - 多種型別
value: Union[str, int]  # 舊寫法
value: str | int        # 新寫法 ✅

# Any - 任意型別（盡量少用）
data: Any
```

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `Optional[str]` 是什麼？ | 可以是 `str`，也可以是 `None` |
| 等於什麼？ | `Union[str, None]` 或 `str \| None` |
| 為什麼用？ | 明確表示這個值可以是 None |
| 新寫法？ | Python 3.10+ 用 `str \| None` |

```python
# 三種寫法，意思一樣
from typing import Optional, Union

Optional[str]      # 寫法 1
Union[str, None]   # 寫法 2
str | None         # 寫法 3 ✅ 推薦（Python 3.10+）
```
