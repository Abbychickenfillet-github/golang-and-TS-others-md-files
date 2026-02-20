# CRUD 架構說明

## `super().__init__(Booth)` 的作用

### 什麼是 `super()`？

`super()` 是 Python 中調用父類方法的關鍵字。在繼承關係中，它讓子類可以調用父類的方法。

### 在 BoothCRUD 中的使用

```python
class BoothCRUD(BaseCRUD[Booth, BoothCreate, BoothUpdate]):
    def __init__(self):
        super().__init__(Booth)  # 調用父類 BaseCRUD 的 __init__ 方法
```

### 執行流程

1. **BoothCRUD 繼承 BaseCRUD**
   ```python
   class BoothCRUD(BaseCRUD[Booth, BoothCreate, BoothUpdate]):
   ```
   - `BoothCRUD` 是子類
   - `BaseCRUD` 是父類
   - 泛型參數：`[Booth, BoothCreate, BoothUpdate]` 指定了模型類型

2. **調用父類的 `__init__`**
   ```python
   super().__init__(Booth)
   ```
   - `super()` 指向父類 `BaseCRUD`
   - `__init__(Booth)` 調用父類的初始化方法
   - 傳入 `Booth` 模型類

3. **父類 BaseCRUD 的 `__init__` 執行**
   ```python
   class BaseCRUD:
       def __init__(self, model: type[ModelType]):
           self.model = model  # 保存模型類到實例變量
   ```
   - 將 `Booth` 模型類保存到 `self.model`
   - 這樣 `BoothCRUD` 實例就知道要操作哪個模型了

### 為什麼需要這樣做？

**目的**：讓 `BoothCRUD` 實例知道要操作哪個數據庫模型

**效果**：
- `self.model = Booth` 被設置
- 後續的 `get()`, `create()`, `update()` 等方法都會使用 `Booth` 模型
- 例如：`session.get(self.model, id)` 等於 `session.get(Booth, id)`

### 完整示例

```python
# 1. 創建 BoothCRUD 實例
booth_crud = BoothCRUD()

# 2. 內部執行流程：
#    - BoothCRUD.__init__() 被調用
#    - super().__init__(Booth) 調用父類方法
#    - BaseCRUD.__init__(Booth) 執行
#    - self.model = Booth 被設置

# 3. 使用時：
session = get_session()
booth = booth_crud.get(session, booth_id)
# 內部執行：session.get(self.model, booth_id)
# 等於：session.get(Booth, booth_id)
```

## 架構層次關係

### 1. Models（模型層）
- **位置**：`backend/app/models/`
- **作用**：定義數據庫表結構
- **範例**：`Booth`, `Event`, `EventBoothType`

```python
class Booth(BoothBase, table=True):
    """攤位資料庫模型"""
    __tablename__ = "booth"
    id: str = Field(...)
    # ... 其他字段
```

### 2. CRUD（數據訪問層）
- **位置**：`backend/app/crud/`
- **作用**：提供數據庫的增刪改查操作
- **範例**：`BoothCRUD`, `EventCRUD`

```python
class BoothCRUD(BaseCRUD[Booth, BoothCreate, BoothUpdate]):
    def __init__(self):
        super().__init__(Booth)  # 告訴父類要操作 Booth 模型

    def get_multi(self, session, *, event_id: str):
        # 自定義查詢邏輯
        statement = select(Booth).where(Booth.event_id == event_id)
        return list(session.exec(statement).all())
```

### 3. Services（業務邏輯層）
- **位置**：`backend/app/services/`
- **作用**：處理業務邏輯，調用 CRUD
- **範例**：`BoothService`, `EventService`

```python
class BoothService(BaseService):
    def __init__(self):
        super().__init__(booth_crud)  # 注入 CRUD 實例

    def get_booth_with_details(self, session, booth_id: str):
        booth = self.crud.get(session, booth_id)
        # 添加業務邏輯處理
        return booth
```

### 4. API Routes（API 路由層）
- **位置**：`backend/app/api/routes/`
- **作用**：處理 HTTP 請求，調用 Services
- **範例**：`booths.py`, `events.py`

```python
@router.get("/{booth_id}")
def get_booth(session: SessionDep, booth_id: str):
    booth = booth_service.get_booth_with_details(session, booth_id)
    return booth
```

## 為什麼要分層？

### 優點

1. **職責分離**
   - Models：只定義數據結構
   - CRUD：只處理數據庫操作
   - Services：只處理業務邏輯
   - Routes：只處理 HTTP 請求

2. **可重用性**
   - 同一個 CRUD 可以被多個 Service 使用
   - 同一個 Service 可以被多個 Route 使用

3. **易於測試**
   - 可以單獨測試每一層
   - 可以 Mock 依賴層

4. **易於維護**
   - 修改數據庫操作只需要改 CRUD
   - 修改業務邏輯只需要改 Service
   - 修改 API 接口只需要改 Routes

## BaseCRUD 提供的方法

所有繼承 `BaseCRUD` 的類都會自動獲得這些方法：

```python
# 查詢
booth_crud.get(session, booth_id)              # 根據 ID 獲取
booth_crud.get_by_field(session, "name", "A1") # 根據字段獲取
booth_crud.get_multi(session, skip=0, limit=10) # 獲取多個

# 創建
booth_crud.create(session, obj_in=BoothCreate(...))

# 更新
booth_crud.update(session, db_obj=booth, obj_in=BoothUpdate(...))

# 刪除
booth_crud.delete(session, id=booth_id)

# 計數
booth_crud.count(session)
```

## 自定義方法

如果 `BaseCRUD` 提供的方法不夠用，可以在子類中添加自定義方法：

```python
class BoothCRUD(BaseCRUD[Booth, BoothCreate, BoothUpdate]):
    def __init__(self):
        super().__init__(Booth)

    # 自定義方法：根據活動 ID 獲取攤位
    def get_multi(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        event_id: str | None = None,  # 自定義參數
        booking_status: str | None = None,  # 自定義參數
    ) -> list[Booth]:
        statement = select(Booth)
        if event_id:
            statement = statement.where(Booth.event_id == event_id)
        if booking_status:
            statement = statement.where(Booth.booking_status == booking_status)
        return list(session.exec(statement).all())
```

## 總結

1. **`super().__init__(Booth)`** 的作用是調用父類的初始化方法，告訴父類要操作哪個模型
2. **架構分層**：Models → CRUD → Services → Routes
3. **繼承 BaseCRUD** 可以獲得基本的增刪改查功能
4. **自定義方法** 可以擴展功能，滿足特定需求








