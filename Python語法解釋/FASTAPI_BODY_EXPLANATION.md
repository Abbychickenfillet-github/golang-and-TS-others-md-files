# FastAPI Body 參數詳解

## 1. 對象 vs 單個值的區別

### 情況 A：單個值（使用 `Body(...)`）
```python
def update_check_in_status(
    *,
    check_in_status: CheckInStatus = Body(..., description="報到狀態"),
):
    pass
```

**前端發送的 JSON：**
```json
"checked_in"
```
或者
```json
{
  "check_in_status": "checked_in"  // ❌ 錯誤！FastAPI 期望的是單個值，不是對象
}
```

**FastAPI 期望的請求體：**
- 直接是枚舉值：`"checked_in"`（字串）
- 不是對象！

### 情況 B：對象（使用 Pydantic 模型）
```python
def update_check_in_status(
    *,
    status_update: CheckInStatusUpdate,  # 這是一個 Pydantic 模型
):
    pass
```

**前端發送的 JSON：**
```json
{
  "check_in_status": "checked_in"  // ✅ 正確！這是一個對象
}
```

**FastAPI 期望的請求體：**
- 是一個 JSON 對象
- 對象的字段對應 Pydantic 模型的字段

## 2. 為什麼現在才創建 Pydantic 模型？

### 原本的做法（有問題）
```python
# ❌ 錯誤的方式
check_in_status: CheckInStatus = Body(..., description="報到狀態")
```

**問題：**
- 前端發送的是對象 `{"check_in_status": "checked_in"}`
- FastAPI 期望的是單個值 `"checked_in"`
- 導致 422 驗證錯誤

### 正確的做法
```python
# ✅ 正確的方式
status_update: CheckInStatusUpdate  # 使用 Pydantic 模型
```

**為什麼：**
- 前端習慣發送 JSON 對象
- Pydantic 模型可以正確解析對象
- 更符合 RESTful API 的最佳實踐

## 3. `status_update: CheckInStatusUpdate` 是什麼？

### 這是一個函數參數
```python
def update_check_in_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    order_id: str,
    status_update: CheckInStatusUpdate,  # ← 這是函數參數
) -> Any:
```

### `CheckInStatusUpdate` 是一個 Pydantic 模型類
```python
# 在 backend/app/models/order.py 中定義
class CheckInStatusUpdate(SQLModel):
    """更新報到狀態"""
    check_in_status: CheckInStatus = Field(..., description="報到狀態")
```

### 工作流程
1. **前端發送請求：**
   ```json
   {
     "check_in_status": "checked_in"
   }
   ```

2. **FastAPI 自動解析：**
   - FastAPI 看到參數類型是 `CheckInStatusUpdate`
   - 自動將 JSON 對象解析為 `CheckInStatusUpdate` 實例
   - 驗證字段類型和值

3. **在函數中使用：**
   ```python
   # status_update 是一個 CheckInStatusUpdate 實例
   # status_update.check_in_status 是 CheckInStatus 枚舉值
   order = order_service.update_check_in_status(
       session,
       order_id=order_id,
       check_in_status=status_update.check_in_status
   )
   ```

## 4. 從 models 引入的邏輯

### 後端模型定義
```python
# backend/app/models/order.py
class CheckInStatusUpdate(SQLModel):
    check_in_status: CheckInStatus = Field(...)
```

### 在 __init__.py 中導出
```python
# backend/app/models/__init__.py
from .order import (
    CheckInStatus,
    CheckInStatusUpdate,  # ← 導出模型
    ...
)
```

### 在 API 路由中導入
```python
# backend/app/api/routes/orders.py
from app.models import (
    CheckInStatus,
    CheckInStatusUpdate,  # ← 導入模型
    ...
)
```

### 為什麼這樣設計？
- **模塊化：** 模型定義和 API 路由分離
- **可重用：** 同一個模型可以在多個地方使用
- **類型安全：** Python 類型檢查可以驗證模型使用是否正確

## 5. 前端 schema.ts 和 models 的來源

### 流程：後端 → OpenAPI → 前端

#### 步驟 1：後端定義模型
```python
# backend/app/models/order.py
class CheckInStatusUpdate(SQLModel):
    check_in_status: CheckInStatus = Field(...)
```

#### 步驟 2：FastAPI 自動生成 OpenAPI Schema
- FastAPI 掃描所有路由和模型
- 自動生成 OpenAPI 3.1.0 格式的 JSON
- 保存在 `backend-openapi.json` 或通過 `/docs` 端點訪問

#### 步驟 3：前端生成 TypeScript 類型
```bash
# frontend/package.json
"generate-client": "openapi-ts --input ./openapi.json --output ./src/client --client axios --exportSchemas true"
```

**生成的文件：**
- `frontend/src/client/models/order.ts` - TypeScript 類型定義
- `frontend/src/client/schemas.ts` - JSON Schema 驗證規則
- `frontend/src/client/services/order.ts` - API 客戶端函數

#### 步驟 4：前端使用生成的類型
```typescript
// frontend/src/client/models/order.ts (自動生成)
export type CheckInStatus = "not_checked_in" | "checked_in" | "left"

// frontend/src/routes/_layout/orders.tsx (手動編寫)
import { CheckInStatus } from "../client/models/order"
import { OrdersService } from "../client/services/order"

OrdersService.updateCheckInStatus({
  orderId: "...",
  checkInStatus: "checked_in"  // TypeScript 會檢查類型
})
```

### 數據流向圖
```
後端 Python 模型
    ↓
FastAPI 自動生成 OpenAPI Schema
    ↓
openapi.json 文件
    ↓
openapi-ts 工具生成 TypeScript 類型
    ↓
前端 TypeScript 程式碼使用
```

## 6. 對比其他 API 端點的做法

### 示例 1：update_order（使用模型）
```python
def update_order(
    *,
    order_in: OrderUpdate,  # ← 使用 Pydantic 模型
):
    pass
```
**前端發送：**
```json
{
  "order_number": "...",
  "status": "...",
  ...
}
```

### 示例 2：update_payment_status（直接使用枚舉）
```python
def update_payment_status(
    *,
    payment_status: PaymentStatus,  # ← 直接使用枚舉，沒有 Body()
):
    pass
```
**前端發送：**
```json
"PAID"  // 單個值，不是對象
```
或者 FastAPI 可能期望：
```json
{
  "payment_status": "PAID"
}
```

**注意：** 這個端點可能也有同樣的問題！應該也使用模型。

## 總結

1. **對象 vs 單個值：** FastAPI 的 `Body()` 期望單個值，但前端通常發送對象
2. **Pydantic 模型：** 用於接收 JSON 對象，更符合 RESTful 實踐
3. **`status_update`：** 是函數參數，類型是 `CheckInStatusUpdate` 模型類
4. **模型導入：** 通過 `__init__.py` 統一導出，便於管理和使用
5. **前端類型：** 從後端的 OpenAPI Schema 自動生成，保持前後端類型一致
