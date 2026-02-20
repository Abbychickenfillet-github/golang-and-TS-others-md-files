# Python 中的 `self` 說明

## `self` 是什麼？

**`self`** 是 Python 類（Class）方法中的第一個參數，代表**類的實例（Instance）本身**。

### 基本概念

```python
class MyClass:
    def my_method(self):  # ⭐ self 是第一個參數
        # self 代表這個類的實例
        pass
```

## 為什麼需要 `self`？

### 1. 訪問實例屬性

`self` 讓方法可以訪問和修改實例的屬性：

```python
class BoothService:
    def __init__(self):
        self.crud = booth_crud  # ⭐ 使用 self 設置實例屬性
    
    def create_booth(self, session, *, booth_in):
        # ⭐ 使用 self 訪問實例屬性
        return self.crud.create(session, obj_in=booth_in)
```

### 2. 區分實例變數和局部變數

```python
class BoothService:
    def __init__(self):
        self.crud = booth_crud  # ⭐ 實例變數（屬於這個實例）
    
    def some_method(self):
        crud = "local variable"  # 局部變數（只在方法內有效）
        # self.crud 和 crud 是不同的變數
```

## 在本專案中的實際例子

### 範例 1：BoothService

```python
class BoothService(BaseService):
    def __init__(self):
        # ⭐ self 代表 BoothService 的實例
        super().__init__(booth_crud)
        # 等於：BaseService.__init__(self, booth_crud)
    
    def create_booth(self, session, *, booth_in: BoothCreate):
        # ⭐ self 代表調用這個方法的 BoothService 實例
        # 例如：booth_service.create_booth(...) 中的 booth_service
        existing = booth_crud.get_by_name(...)
        if existing:
            raise ValueError("重複名稱")
        return booth_crud.create(session, obj_in=booth_in)
```

**使用時**：

```python
# 創建實例
booth_service = BoothService()  # ⭐ 創建一個 BoothService 實例

# 調用方法
booth_service.create_booth(session, booth_in=booth_data)
# 內部執行時，self = booth_service（這個實例）
```

### 範例 2：BaseCRUD

```python
class BaseCRUD:
    def __init__(self, model):
        # ⭐ self 代表 BaseCRUD 的實例（如 BoothCRUD 實例）
        self.model = model  # 將 model 保存到這個實例的屬性中
    
    def get(self, session, id):
        # ⭐ self 代表調用這個方法的實例
        # self.model 是這個實例的屬性
        return session.get(self.model, id)
```

**使用時**：

```python
# 創建實例
booth_crud = BoothCRUD()  # 內部調用 BaseCRUD.__init__(self, Booth)
# self = booth_crud（這個實例）
# self.model = Booth（保存到這個實例）

# 調用方法
booth = booth_crud.get(session, booth_id)
# 內部執行時，self = booth_crud
# self.model = Booth（從實例屬性讀取）
```

## `self` 的命名慣例

### 必須叫 `self` 嗎？

**不是必須的**，但這是 Python 的**強烈慣例**：

```python
# ✅ 標準寫法（推薦）
class MyClass:
    def my_method(self):
        pass

# ⚠️ 技術上可行，但不推薦
class MyClass:
    def my_method(this):  # 可以用其他名字
        pass
```

**為什麼都用 `self`？**
- Python 社群約定俗成
- 提高程式碼可讀性
- 讓其他開發者容易理解

## `self` 在 SQLModel/Pydantic 中的使用

### SQLModel 類別定義

```python
class Booth(BoothBase, table=True):
    """攤位資料表"""
    
    id: str = Field(...)
    name: str = Field(...)
    
    # ⭐ 注意：SQLModel 類別定義中通常不需要 self
    # 因為這些是類別屬性，不是實例方法
```

### 類別方法（Class Method）vs 實例方法（Instance Method）

#### 實例方法（需要 `self`）

```python
class BoothService:
    def create_booth(self, session, *, booth_in):
        # ⭐ 實例方法：需要 self
        # 可以訪問 self.crud 等實例屬性
        return self.crud.create(session, obj_in=booth_in)
```

#### 類別方法（不需要 `self`，用 `@classmethod`）

```python
class MemberBase(SQLModel):
    @classmethod  # ⭐ 類別方法裝飾器
    def validate_identities(cls, v):  # ⭐ cls 代表類別本身，不是實例
        # 不需要 self，因為這是類別方法
        # cls 代表 MemberBase 類別
        if not v:
            return ["consumer"]
        if "consumer" not in v:
            v.insert(0, "consumer")
        return v
```

**區別**：

| 類型 | 第一個參數 | 裝飾器 | 用途 |
|------|-----------|--------|------|
| **實例方法** | `self` | 無 | 操作實例的屬性和方法 |
| **類別方法** | `cls` | `@classmethod` | 操作類別本身，不依賴實例 |
| **靜態方法** | 無 | `@staticmethod` | 不需要訪問類別或實例 |

## 完整範例說明

### 範例：BoothService 的完整流程

```python
# 1. 定義類別
class BoothService(BaseService):
    def __init__(self):
        # ⭐ self 代表即將創建的 BoothService 實例
        super().__init__(booth_crud)
        # 等於：BaseService.__init__(self, booth_crud)
        # self 被傳給父類的 __init__
    
    def create_booth(self, session, *, booth_in: BoothCreate):
        # ⭐ self 代表調用這個方法的實例
        existing = booth_crud.get_by_name(...)
        if existing:
            raise ValueError("重複名稱")
        return booth_crud.create(session, obj_in=booth_in)

# 2. 創建實例
booth_service = BoothService()
# 執行流程：
# - Python 創建一個新的 BoothService 實例
# - 調用 BoothService.__init__(self)
# - self = 新創建的實例

# 3. 調用方法
booth = booth_service.create_booth(session, booth_in=booth_data)
# 執行流程：
# - Python 將 booth_service 作為第一個參數傳入
# - create_booth(self, session, *, booth_in=booth_data)
# - self = booth_service（這個實例）
```

## 常見問題

### Q: 為什麼方法定義時要寫 `self`，但調用時不用傳？

**A:** 這是 Python 的語法糖：

```python
# 定義時
def create_booth(self, session, *, booth_in):
    pass

# 調用時
booth_service.create_booth(session, booth_in=data)
# Python 自動將 booth_service 作為 self 傳入
# 等於：BoothService.create_booth(booth_service, session, booth_in=data)
```

### Q: SQLModel 類別定義中需要 `self` 嗎？

**A:** 通常不需要，因為：

```python
class Booth(SQLModel, table=True):
    # ⭐ 這些是類別屬性，不是方法
    id: str = Field(...)
    name: str = Field(...)
    
    # 如果需要自定義方法，才需要 self
    def get_full_name(self) -> str:
        # ⭐ 這是實例方法，需要 self
        return f"{self.name} - {self.id}"
```

### Q: `self` 和 `cls` 的區別？

**A:**

| 參數 | 代表 | 使用場景 |
|------|------|----------|
| `self` | **實例**（Instance） | 實例方法，操作實例的屬性 |
| `cls` | **類別**（Class） | 類別方法（`@classmethod`），操作類別本身 |

```python
class MyClass:
    # 實例方法
    def instance_method(self):
        # self 代表實例
        return self.some_attribute
    
    # 類別方法
    @classmethod
    def class_method(cls):
        # cls 代表類別本身（MyClass）
        return cls.some_class_attribute
```

## 總結

1. **`self`** 代表類的實例（對象）本身
2. **必須是第一個參數**（實例方法中）
3. **調用時不需要傳入**（Python 自動傳入）
4. **用於訪問實例屬性**（如 `self.crud`）
5. **SQLModel/Pydantic 類別定義**通常不需要 `self`（除非有自定義方法）
6. **類別方法用 `cls`**，不是 `self`

## 在本專案中的實際應用

```python
# ✅ 正確：實例方法使用 self
class BoothService(BaseService):
    def __init__(self):
        self.crud = booth_crud  # 設置實例屬性
    
    def create_booth(self, session, *, booth_in):
        return self.crud.create(...)  # 訪問實例屬性

# ✅ 正確：類別方法使用 cls
class MemberBase(SQLModel):
    @classmethod
    def validate_identities(cls, v):
        # cls 代表 MemberBase 類別
        return v

# ✅ 正確：SQLModel 類別定義（不需要 self）
class Booth(SQLModel, table=True):
    id: str = Field(...)  # 類別屬性，不是方法
    name: str = Field(...)
```



