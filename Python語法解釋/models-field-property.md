# SQLModel Field 與 Python @property

## Field() 是什麼？

`Field()` 是 SQLModel/Pydantic 提供的**欄位定義函式**，用來設定欄位的各種屬性。

```python
from sqlmodel import Field

currency: str | None = Field(default=None, max_length=3, description="幣別")
```

### 拆解這行程式碼

```python
currency: str | None = Field(default=None, max_length=3, description="幣別")
│         │            │     │            │              │
│         │            │     │            │              └─ 欄位說明（給開發者/API 文件看）
│         │            │     │            └─ 資料庫欄位最大長度
│         │            │     └─ 預設值是 None
│         │            └─ Field() 函式，設定欄位屬性
│         └─ 型別：字串或 None
└─ 欄位名稱
```

---

## Field() 常用參數

| 參數 | 用途 | 範例 |
|------|------|------|
| `default` | 預設值 | `default="TWD"` |
| `default_factory` | 動態預設值（用函式產生） | `default_factory=uuid.uuid4` |
| `max_length` | 最大長度（對應資料庫 VARCHAR） | `max_length=255` |
| `min_length` | 最小長度 | `min_length=1` |
| `description` | 欄位說明（顯示在 API 文件） | `description="幣別"` |
| `primary_key` | 是否為主鍵 | `primary_key=True` |
| `foreign_key` | 外鍵關聯 | `foreign_key="event.id"` |
| `nullable` | 是否可為 NULL | `nullable=True` |
| `index` | 是否建立索引 | `index=True` |
| `unique` | 是否唯一 | `unique=True` |
| `sa_column` | 自訂 SQLAlchemy Column | `sa_column=Column(String(50))` |

---

## 常見範例

```python
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime, timezone

class Order(SQLModel, table=True):
    # 主鍵 + 預設用 uuid 產生
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        max_length=36
    )

    # 外鍵關聯
    event_id: str = Field(
        max_length=36,
        foreign_key="event.id",
        description="活動 ID"
    )

    # 一般欄位 + 預設值
    currency: str = Field(
        default="TWD",
        max_length=3,
        description="幣別"
    )

    # 可為 None 的欄位
    note: str | None = Field(
        default=None,
        max_length=500,
        description="備註"
    )

    # 時間戳記
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="創建時間"
    )
```

---

## description 的用途

`description` 是**給人看的說明**，會顯示在：

1. **FastAPI 自動產生的 API 文件**（Swagger UI）
2. **IDE 的提示**
3. **程式碼可讀性**

```python
# API 文件會顯示：
# currency (string, optional): 幣別
currency: str | None = Field(default=None, description="幣別")
```

---

## @property 是什麼？

`@property` 是 Python 的裝飾器，讓你把**方法當成屬性用**。

### 基本用法

```python
class Person:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name

    @property
    def full_name(self):
        """把方法變成屬性"""
        return f"{self.first_name} {self.last_name}"

# 使用
person = Person("Alice", "Wang")
print(person.full_name)  # "Alice Wang"（不用加括號！）
```

### 對比：有 @property vs 沒有

```python
# 沒有 @property - 要加括號呼叫
class Person:
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

person.get_full_name()  # 要加 ()

# 有 @property - 像屬性一樣存取
class Person:
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

person.full_name  # 不用加 ()，像屬性一樣
```

---

## @property 實際範例（本專案）

```python
# backend/app/models/order.py

class CheckInStatusUpdate(SQLModel):
    check_in_status: str = Field(..., description="報到狀態")

    @property
    def check_in_status_enum(self) -> CheckInStatus:
        """將字串轉換為 CheckInStatus 枚舉"""
        status_lower = self.check_in_status.lower()
        for member in CheckInStatus:
            if member.value == status_lower:
                return member
        raise ValueError(f"Invalid check_in_status: {self.check_in_status}")

# 使用
update = CheckInStatusUpdate(check_in_status="checked_in")
print(update.check_in_status_enum)  # CheckInStatus.CHECKED_IN（不用括號）
```

---

## @property 進階：getter / setter / deleter

```python
class Temperature:
    def __init__(self):
        self._celsius = 0

    @property
    def celsius(self):
        """Getter：讀取時呼叫"""
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        """Setter：賦值時呼叫"""
        if value < -273.15:
            raise ValueError("溫度不能低於絕對零度！")
        self._celsius = value

    @celsius.deleter
    def celsius(self):
        """Deleter：刪除時呼叫"""
        del self._celsius

# 使用
temp = Temperature()
temp.celsius = 25        # 呼叫 setter
print(temp.celsius)      # 呼叫 getter → 25
temp.celsius = -300      # ValueError！
```

---

## @property 使用時機

| 情境 | 用 @property |
|------|-------------|
| 計算屬性（從其他屬性算出來） | ✅ `full_name` = first + last |
| 型別轉換 | ✅ `str` → `Enum` |
| 加入驗證邏輯 | ✅ 設定時檢查範圍 |
| 隱藏內部實作 | ✅ 對外是屬性，內部是方法 |
| 單純的資料欄位 | ❌ 直接用變數就好 |

---

## 快速總結

| 東西 | 是什麼 | 用途 |
|------|--------|------|
| `Field()` | SQLModel 欄位定義函式 | 設定預設值、長度、描述等 |
| `description` | Field 的參數 | 欄位說明，顯示在 API 文件 |
| `@property` | Python 裝飾器 | 讓方法可以像屬性一樣存取 |

```python
# Field - 定義資料欄位
currency: str = Field(default="TWD", description="幣別")

# @property - 計算屬性
@property
def full_name(self):
    return f"{self.first} {self.last}"
```
