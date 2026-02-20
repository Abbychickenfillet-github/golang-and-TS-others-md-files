# 模型架構說明

## 為什麼不是一張表一個模型？

### 1. 數據庫模型（Database Models）
- **定義**：對應數據庫表的模型，使用 `table=True`
- **命名**：直接使用表名，如 `Event`, `Booth`, `EventBoothType`
- **用途**：用於 ORM 操作（查詢、插入、更新、刪除）
- **位置**：`backend/app/models/` 目錄下

**範例**：
```python
class Event(EventBase, table=True):
    """活動資料庫模型"""
    __tablename__ = "event"
    id: str = Field(...)
    # ... 其他字段
```

### 2. 請求模型（Request Models）
- **定義**：用於接收前端傳來的數據
- **命名規範**：`{ModelName}Create`, `{ModelName}Update`
- **用途**：
  - `Create`：創建時使用，必填字段多
  - `Update`：更新時使用，所有字段都是可選的
- **特點**：不直接對應數據庫表，而是定義 API 輸入格式

**範例**：
```python
class EventCreate(EventBase):
    """創建活動模型"""
    member_id: str  # 必填
    company_id: str  # 必填

class EventUpdate(SQLModel):
    """更新活動模型"""
    name: str | None = None  # 所有字段都是可選的
    description: str | None = None
```

### 3. 響應模型（Response Models）
- **定義**：用於 API 返回給前端的數據格式
- **命名規範**：`{ModelName}Public`, `{ModelName}Response`, `{SpecificPurpose}Response`
- **用途**：
  - 控制返回給前端的字段（隱藏敏感信息）
  - 聚合多個表的數據
  - 計算衍生字段

**範例**：
```python
# 單表響應模型
class EventPublic(EventBase):
    """公開的活動資料模型"""
    id: str
    created_at: datetime
    # 不包含 deleted_by, updated_by 等敏感字段

# 聚合響應模型（多表數據）
class BoothElectricityOptionsResponse(SQLModel):
    """攤位電力選項回應"""
    booth_id: str  # 來自 booth 表
    free_wattage: int  # 來自 event_booth_type 表
    wattage_unit: int  # 來自 electricity_calculation_rule 表
    voltage_options: list[int]  # 聚合多個規則的電壓選項
```

## Event 模型架構說明

### 模型繼承關係

```
EventBase (基礎模型)
├─ 包含共享字段：name, description, start_at, end_at 等
│
├─ EventCreate (繼承 EventBase)
│   └─ 用途：POST /events 創建活動
│   └─ 特點：所有字段必填（沒有 default=None）
│
├─ Event (繼承 EventBase, table=True) ⭐ 數據庫模型
│   └─ 用途：對應 event 表
│   └─ 特點：有 id, created_at, Relationships
│   └─ 這是唯一真正對應數據庫表的模型
│
└─ EventPublic (繼承 EventBase)
    └─ 用途：GET /events/{id} 返回活動詳情
    └─ 特點：包含 id, created_at，但不包含敏感字段

EventUpdate (獨立，不繼承 EventBase)
└─ 用途：PATCH /events/{id} 更新活動
└─ 特點：所有字段都是可選的（都有 default=None）
```

### 為什麼需要這麼多模型？

1. **EventBase**：避免重複定義共享字段
2. **EventCreate**：創建時需要必填字段驗證
3. **EventUpdate**：更新時所有字段都是可選的（部分更新）
4. **Event**：真正的數據庫模型，包含 Relationships
5. **EventPublic**：API 返回時隱藏敏感字段（如 deleted_by）

### Description 字段的一致性

**原則**：相同字段名在不同模型中的 `description` 應該保持一致，因為它們都對應同一個數據庫字段。

**範例**：
```python
# EventBase
member_id: str = Field(description="主辦會員 ID")

# EventCreate
member_id: str = Field(description="主辦會員 ID")  # ✅ 應該一致

# EventUpdate
member_id: str | None = Field(default=None, description="主辦會員 ID")  # ✅ 應該一致

# Event (數據庫模型)
member_id: str = Field(description="主辦會員 ID")  # ✅ 應該一致
```

如果發現不一致，可能是：
- 歷史遺留問題
- 複製貼上時忘記更新
- 應該統一修正

## 模型命名規範建議

### 數據庫模型
- 命名：直接使用表名（單數形式）
- 範例：`Event`, `Booth`, `EventBoothType`
- 特點：有 `table=True`

### 請求模型
- 命名：`{ModelName}Create`, `{ModelName}Update`, `{ModelName}Request`
- 範例：`EventCreate`, `EventUpdate`, `ElectricityRequirementRequest`

### 響應模型
- 單表響應：`{ModelName}Public`, `{ModelName}Detail`
- 聚合響應：`{Purpose}Response`, `{Entity}{Action}Response`
- 範例：
  - `EventPublic` - 單個活動的公開信息
  - `BoothElectricityOptionsResponse` - 攤位電力選項（聚合多表）
  - `EventRegistrationStatusResponse` - 活動註冊狀態（計算結果）

### 改進建議

對於聚合響應模型，建議在 docstring 中明確說明數據來源：

```python
class BoothElectricityOptionsResponse(SQLModel):
    """
    攤位電力選項回應模型

    此模型聚合了多個表的數據：
    - booth 表：booth_id
    - event_booth_type 表：free_wattage (來自 base_wattage)
    - electricity_calculation_rule 表：wattage_unit, voltage_options
    - 硬編碼值：max_wattage, outlet_count

    注意：這不是數據庫模型，而是 API 響應模型
    """
```

## API 實現位置查找

### 前端 API 調用
- 位置：`official_website/lib/api/events.ts`
- 範例：`eventsApi.getRegistrationStatus(eventId)`

### 後端 API 實現
- 位置：`backend/app/api/routes/events.py`
- 查找方法：
  1. 前端調用：`/events/{eventId}/registration-status`
  2. 在 `events.py` 中搜索路由定義：`@router.get("/{event_id}/registration-status")`
  3. 找到對應的函數：`get_registration_status()`

### 服務層實現
- 位置：`backend/app/services/event_service.py`
- 函數：`event_service.get_registration_status()`
- 用途：業務邏輯處理，查詢數據庫

### 數據庫模型
- 位置：`backend/app/models/event.py`
- 模型：`Event` (table=True)
- 用途：對應 `event` 表

## 總結

1. **一張表一個數據庫模型**：`Event`, `Booth` 等（有 `table=True`）
2. **多個用途多個模型**：`EventCreate`, `EventUpdate`, `EventPublic` 等
3. **聚合數據用響應模型**：`BoothElectricityOptionsResponse` 等
4. **命名要清晰**：在 docstring 中說明數據來源
5. **Description 要一致**：相同字段在不同模型中的描述應該一致


