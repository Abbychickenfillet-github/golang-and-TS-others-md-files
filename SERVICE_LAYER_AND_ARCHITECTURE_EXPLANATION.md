# Service 層與架構說明

## 1. Service 層主要處理什麼？

### Service 層的職責（業務邏輯層）

Service 層是**業務邏輯層（Business Logic Layer）**，主要處理：

1. **業務規則驗證**
   - 驗證業務邏輯的正確性
   - 例如：活動結束時間必須晚於開始時間
   - 例如：同一活動中不能有重複的攤位名稱

2. **協調多個 CRUD 操作**
   - 組合多個數據庫操作完成一個業務流程
   - 例如：創建訂單時需要同時創建訂單、訂單項目、電力需求等

3. **數據轉換和計算**
   - 計算衍生數據（如價格、折扣）
   - 數據格式轉換
   - 例如：計算攤位實際價格（考慮覆蓋價格和定價規則）

4. **事務管理**
   - 確保多個操作要麼全部成功，要麼全部失敗
   - 例如：創建訂單時，如果任何一步失敗，整個訂單創建都應該回滾

5. **調用其他服務**
   - 協調不同領域的服務
   - 例如：創建活動時需要驗證公司信息

### 範例：BoothService

```python
class BoothService(BaseService):
    def create_booth(self, session: Session, *, booth_in: BoothCreate) -> Booth:
        # 1. 業務規則驗證：檢查同一活動中是否有重複名稱
        existing = booth_crud.get_by_name(
            session, event_id=booth_in.event_id, name=booth_in.name
        )
        if existing:
            raise ValueError("同一活動中已存在相同名稱的攤位")  # ⭐ 業務規則

        # 2. 調用 CRUD 創建數據
        return booth_crud.create(session, obj_in=booth_in)

    def get_booth_price(self, session: Session, booth: Booth):
        # 3. 業務邏輯計算：優先順序判斷
        if booth.override_booth_price and booth.override_booth_price > 0:
            return (booth.override_booth_price, None, "自訂價格")

        # 4. 協調多個 CRUD 操作
        if booth.event_booth_type_id:
            pricing = event_booth_type_pricing_crud.get_current_pricing(...)
            if pricing:
                return (pricing.price, pricing.price_type, pricing.price_name)

        return (Decimal("0.00"), None, None)
```

## 2. MVC 架構與分層架構

### 傳統 MVC 架構

```
Model (模型)      → 數據結構定義
View (視圖)       → 用戶界面（前端）
Controller (控制器) → 處理 HTTP 請求
```

### 現代後端分層架構（本專案）

```
Routes (API 路由層)     → 類似 Controller，處理 HTTP 請求
  ↓
Services (業務邏輯層)   → 處理業務邏輯（Business Logic）
  ↓
CRUD (數據訪問層)       → 類似 Repository，處理數據庫操作
  ↓
Models (模型層)         → 定義數據結構
```

### 對應關係

| 傳統 MVC | 本專案架構 | 職責 |
|---------|-----------|------|
| **Controller** | **Routes** | 接收 HTTP 請求，調用 Service |
| **Service** | **Services** | 處理業務邏輯（Business Logic） |
| **Repository** | **CRUD** | 數據庫操作（增刪改查） |
| **Model** | **Models** | 數據結構定義 |

### 完整流程範例

```python
# 1. Routes 層（類似 Controller）
@router.post("/booths")
def create_booth(session: SessionDep, booth_in: BoothCreate):
    # 只負責接收請求，調用 Service
    return booth_service.create_booth(session, booth_in=booth_in)

# 2. Service 層（業務邏輯）
class BoothService:
    def create_booth(self, session, *, booth_in: BoothCreate):
        # 業務規則驗證
        existing = booth_crud.get_by_name(...)
        if existing:
            raise ValueError("重複名稱")  # ⭐ 業務邏輯

        # 調用 CRUD
        return booth_crud.create(session, obj_in=booth_in)

# 3. CRUD 層（類似 Repository）
class BoothCRUD:
    def create(self, session, *, obj_in: BoothCreate):
        # 純數據庫操作
        db_obj = self.model(**obj_in.model_dump())
        session.add(db_obj)
        session.commit()
        return db_obj
```

## 3. Repository 模式與 SOLID 原則

### Repository 模式

**Repository（倉庫模式）** 是數據訪問層的抽象，提供統一的數據操作接口。

在本專案中，**CRUD 層就是 Repository 模式的實現**：

```python
# Repository 模式
class BoothCRUD(BaseCRUD):
    def get(self, session, id):      # 查詢
        return session.get(Booth, id)

    def create(self, session, obj_in): # 創建
        ...

    def update(self, session, db_obj, obj_in): # 更新
        ...

    def delete(self, session, id):   # 刪除
        ...
```

### SOLID 原則在架構中的體現

#### 1. **S - Single Responsibility Principle（單一職責原則）**

每個層只負責一件事：

- **Routes**：只處理 HTTP 請求
- **Services**：只處理業務邏輯
- **CRUD**：只處理數據庫操作
- **Models**：只定義數據結構

#### 2. **O - Open/Closed Principle（開放封閉原則）**

可以擴展功能，但不修改現有代碼：

```python
# 可以擴展 BaseCRUD，添加新方法
class BoothCRUD(BaseCRUD):
    def get_by_name(self, session, *, event_id: str, name: str):
        # 新增方法，不修改 BaseCRUD
        ...
```

#### 3. **L - Liskov Substitution Principle（里氏替換原則）**

**定義**：子類對象可以替換父類對象，而不會破壞程序的正確性。

**核心思想**：
- 子類必須能夠完全替代父類
- 替換後，程序的行為應該保持一致
- 子類不能改變父類的預期行為

**在本專案中的體現**：

```python
# BaseCRUD 定義了基本接口
class BaseCRUD:
    def get(self, session, id):
        return session.get(self.model, id)
    
    def create(self, session, obj_in):
        # 基本實現
        ...

# BoothCRUD 繼承 BaseCRUD，可以完全替換使用
class BoothCRUD(BaseCRUD):
    def __init__(self):
        super().__init__(Booth)  # 設置模型為 Booth
    
    # 可以添加新方法，但不能改變父類方法的行為
    def get_by_name(self, session, *, event_id: str, name: str):
        # 新增方法，不影響父類
        ...

# ✅ 正確：任何使用 BaseCRUD 的地方都可以用 BoothCRUD 替換
def some_function(crud: BaseCRUD):  # 接受 BaseCRUD 類型
    result = crud.get(session, id)  # 可以正常工作
    return result

# 可以傳入 BoothCRUD，因為它繼承自 BaseCRUD
booth_crud = BoothCRUD()
some_function(booth_crud)  # ✅ 完全沒問題
```

**違反里氏替換原則的例子**（錯誤示範）：

```python
# ❌ 錯誤：子類改變了父類的預期行為
class BadBoothCRUD(BaseCRUD):
    def get(self, session, id):
        # 錯誤：改變了父類的行為（應該返回對象，但這裡返回 None）
        return None  # 這會破壞所有依賴 get() 方法的代碼
```

**為什麼重要**：
- 確保繼承關係的正確性
- 讓代碼更可靠，減少意外錯誤
- 支持多態（Polymorphism）

#### 4. **I - Interface Segregation Principle（接口隔離原則）**

**定義**：不應該強迫客戶端依賴它們不使用的方法。

**核心思想**：
- 接口應該小而專注
- 客戶端不應該被迫實現它們不需要的方法
- 多個小接口比一個大接口更好

**什麼是"不需要的方法"？**

"不需要的方法"指的是：
- 客戶端（使用接口的類）實際上不會用到的方法
- 但因為接口定義了這些方法，客戶端被迫實現它們
- 這會造成不必要的代碼和維護負擔

**在本專案中的體現**：

```python
# ✅ 正確：BaseCRUD 提供基本方法，子類可以選擇性覆蓋
class BaseCRUD:
    def get(self, session, id):           # 基本方法
        ...
    
    def get_multi(self, session, ...):     # 基本方法
        ...
    
    def create(self, session, obj_in):    # 基本方法
        ...
    
    def update(self, session, ...):       # 基本方法
        ...
    
    def delete(self, session, id):        # 基本方法
        ...

# BoothCRUD 只需要覆蓋 get_multi，其他方法使用父類的實現
class BoothCRUD(BaseCRUD):
    def __init__(self):
        super().__init__(Booth)
    
    # 只覆蓋需要自定義的方法
    def get_multi(self, session, *, event_id: str, ...):
        # 自定義實現，添加 event_id 過濾
        statement = select(Booth).where(Booth.event_id == event_id)
        return list(session.exec(statement).all())
    
    # 不需要實現 get(), create(), update(), delete()
    # 因為父類已經提供了，而且我們不需要改變它們的行為
```

**違反接口隔離原則的例子**（錯誤示範）：

```python
# ❌ 錯誤：強迫實現不需要的方法
class BadBaseCRUD:
    def get(self, session, id):
        ...
    
    def create(self, session, obj_in):
        ...
    
    def send_email(self, email):  # ⚠️ 這個方法跟 CRUD 無關！
        # 強迫所有子類都要實現這個方法
        ...
    
    def generate_report(self):    # ⚠️ 這個方法也跟 CRUD 無關！
        # 強迫所有子類都要實現這個方法
        ...

# 如果 BoothCRUD 只需要 CRUD 功能，但被迫實現 send_email 和 generate_report
class BoothCRUD(BadBaseCRUD):
    def send_email(self, email):
        # 被迫實現，但實際上不需要
        raise NotImplementedError("BoothCRUD 不需要發送郵件")
    
    def generate_report(self):
        # 被迫實現，但實際上不需要
        raise NotImplementedError("BoothCRUD 不需要生成報告")
```

**為什麼重要**：
- 減少不必要的代碼
- 提高代碼的可維護性
- 讓接口更清晰、更專注

#### 5. **D - Dependency Inversion Principle（依賴倒置原則）**

**定義**：
1. 高層模組不應該依賴低層模組，兩者都應該依賴抽象
2. 抽象不應該依賴細節，細節應該依賴抽象

**什麼是"高層模組"和"低層模組"？**

**高層模組（High-level Module）**：
- 包含業務邏輯和應用程序的核心功能
- 通常更接近用戶需求
- 例如：`BoothService`（業務邏輯層）

**低層模組（Low-level Module）**：
- 包含實現細節和基礎設施
- 通常更接近系統底層
- 例如：`BoothCRUD`（數據訪問層）、數據庫操作

**依賴方向**：
```
❌ 錯誤的依賴方向（違反原則）：
高層模組 → 低層模組
BoothService → BoothCRUD（直接依賴具體實現）

✅ 正確的依賴方向（遵循原則）：
高層模組 → 抽象 ← 低層模組
BoothService → BaseCRUD（抽象） ← BoothCRUD（具體實現）
```

**在本專案中的體現**：

```python
# 1. 定義抽象（BaseCRUD）
class BaseCRUD:  # ⭐ 這是抽象
    def get(self, session, id):
        ...
    def create(self, session, obj_in):
        ...

# 2. 低層模組實現抽象（BoothCRUD）
class BoothCRUD(BaseCRUD):  # ⭐ 具體實現
    def __init__(self):
        super().__init__(Booth)

# 3. 高層模組依賴抽象，不依賴具體實現
class BoothService(BaseService):  # ⭐ 高層模組
    def __init__(self):
        # ✅ 正確：依賴抽象 BaseCRUD，不是具體的 BoothCRUD
        super().__init__(booth_crud)  # booth_crud 是 BoothCRUD 實例
        # 但 BaseService 內部使用 self.crud，類型是 BaseCRUD
    
    def create_booth(self, session, *, booth_in: BoothCreate):
        # 使用 self.crud（類型是 BaseCRUD），不直接依賴 BoothCRUD
        return self.crud.create(session, obj_in=booth_in)
```

**違反依賴倒置原則的例子**（錯誤示範）：

```python
# ❌ 錯誤：高層模組直接依賴低層模組的具體實現
class BadBoothService:
    def __init__(self):
        # 直接創建 BoothCRUD，緊耦合
        self.crud = BoothCRUD()  # ⚠️ 直接依賴具體實現
    
    def create_booth(self, session, *, booth_in: BoothCreate):
        # 如果 BoothCRUD 改變，這裡也會受影響
        return self.crud.create(session, obj_in=booth_in)

# 問題：
# 1. 如果要把 BoothCRUD 換成其他實現，需要修改 BoothService
# 2. 無法進行單元測試（無法 Mock）
# 3. 違反了開閉原則（對擴展開放，對修改封閉）
```

**正確的依賴倒置實現**：

```python
# ✅ 正確：通過依賴注入（Dependency Injection）
class BoothService(BaseService):
    def __init__(self):
        # 注入依賴，而不是直接創建
        super().__init__(booth_crud)  # booth_crud 從外部注入
    
    # 現在可以輕鬆替換實現
    # 例如：在測試時可以注入 MockCRUD
    # 例如：可以注入不同的 CRUD 實現（如 CacheCRUD）

# 使用時：
booth_crud = BoothCRUD()  # 創建具體實現
booth_service = BoothService()  # 注入依賴
# 內部：BaseService.__init__(booth_crud) 將 booth_crud 保存為 self.crud
```

**為什麼重要**：
- **可測試性**：可以輕鬆替換實現（例如：在測試時使用 Mock）
- **靈活性**：可以輕鬆切換不同的實現（例如：從 MySQL 切換到 PostgreSQL）
- **解耦**：高層模組和低層模組解耦，降低依賴關係
- **可維護性**：修改低層模組不會影響高層模組

## 4. JWT Token 的 jti 存儲機制

### 問題：數據表記錄的是 token A 還是 token B？

**答案：數據表記錄的是被撤銷的 token 的 jti，不是當前有效的 token！**

### 完整流程說明

#### 場景：多設備登錄

```
時間線：
1. 手機登錄 → 生成 token A (jti: uuid-1)
2. 電腦登錄 → 生成 token B (jti: uuid-2)
3. 手機登出 → 將 token A 的 jti (uuid-1) 存入黑名單表
4. 電腦繼續使用 → token B (jti: uuid-2) 仍然有效
```

### 數據表存儲內容

#### `blacklisted_token` 表結構

```sql
CREATE TABLE blacklisted_token (
    id VARCHAR(36) PRIMARY KEY,
    token_jti VARCHAR(255) NOT NULL,  -- ⭐ 存儲被撤銷的 jti
    user_type ENUM('user', 'member'),
    user_id VARCHAR(36),
    expires_at TIMESTAMP,  -- token 原本的過期時間
    created_at TIMESTAMP
);
```

#### 數據表記錄示例

| id | token_jti | user_id | reason | expires_at | created_at |
|----|-----------|---------|--------|------------|------------|
| uuid-x | uuid-1 | user-123 | logout | 2025-12-31 | 2025-01-15 |
| uuid-y | uuid-3 | user-123 | logout | 2025-12-31 | 2025-01-16 |

**說明**：
- `token_jti: uuid-1` → 這是**手機登出時**被撤銷的 token A 的 jti
- `token_jti: uuid-3` → 這是**另一個設備登出時**被撤銷的 token 的 jti
- **當前有效的 token B (jti: uuid-2) 不會出現在表中** ✅

### 驗證流程

```python
# 1. 用戶登出時
def logout(token: TokenDep):
    payload = jwt.decode(token, ...)
    token_jti = payload.get("jti")  # 例如：uuid-1（當前 token 的 jti）

    # 將這個 jti 存入黑名單（標記為已撤銷）
    blacklisted_token_crud.add_to_blacklist(
        session,
        token_jti=token_jti,  # ⭐ 存入被撤銷的 jti
        ...
    )

# 2. 後續請求驗證時
def get_current_user(token: TokenDep):
    payload = jwt.decode(token, ...)
    token_jti = payload.get("jti")  # 例如：uuid-2（新 token 的 jti）

    # 檢查這個 jti 是否在黑名單中
    if blacklisted_token_crud.is_blacklisted(session, token_jti=token_jti):
        raise HTTPException(401, "Token has been revoked")
    # uuid-2 不在黑名單中，所以通過驗證 ✅
```

### 關鍵點總結

1. **每次登錄都生成新的 jti**
   - 第一次登錄：`jti = uuid-1`
   - 第二次登錄：`jti = uuid-2`（完全不同！）

2. **黑名單只記錄被撤銷的 jti**
   - 登出時：將當前 token 的 jti 存入黑名單
   - 新 token 的 jti 不會出現在黑名單中

3. **多設備支持**
   - 每個設備有獨立的 token 和 jti
   - 撤銷一個設備的 token 不影響其他設備

4. **數據表存儲的是歷史記錄**
   - 存儲的是**被撤銷的 token 的 jti**
   - **不是當前有效的 token**

## 5. 架構層次總結

```
┌─────────────────────────────────────────┐
│  Routes (API 路由層)                     │
│  - 接收 HTTP 請求                        │
│  - 調用 Service                          │
│  - 返回 HTTP 響應                        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Services (業務邏輯層)                   │
│  - 業務規則驗證                          │
│  - 協調多個 CRUD 操作                    │
│  - 數據計算和轉換                        │
│  - 事務管理                              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  CRUD (數據訪問層 / Repository)          │
│  - 數據庫查詢                            │
│  - 數據庫插入                            │
│  - 數據庫更新                            │
│  - 數據庫刪除                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Models (模型層)                        │
│  - 定義數據結構                          │
│  - 定義數據庫表                          │
└─────────────────────────────────────────┘
```

## 6. 總結

1. **Service 層**：處理業務邏輯（Business Logic）
2. **Routes = Controller**：處理 HTTP 請求
3. **CRUD = Repository**：處理數據庫操作
4. **SOLID 原則**：通過分層架構實現
5. **JWT jti 存儲**：數據表記錄的是**被撤銷的 token 的 jti**，不是當前有效的 token







