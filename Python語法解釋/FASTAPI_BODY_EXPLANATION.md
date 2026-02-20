# FastAPI Body 参数详解

## 1. 对象 vs 单个值的区别

### 情况 A：单个值（使用 `Body(...)`）
```python
def update_check_in_status(
    *,
    check_in_status: CheckInStatus = Body(..., description="報到狀態"),
):
    pass
```

**前端发送的 JSON：**
```json
"checked_in"
```
或者
```json
{
  "check_in_status": "checked_in"  // ❌ 错误！FastAPI 期望的是单个值，不是对象
}
```

**FastAPI 期望的请求体：**
- 直接是枚举值：`"checked_in"`（字符串）
- 不是对象！

### 情况 B：对象（使用 Pydantic 模型）
```python
def update_check_in_status(
    *,
    status_update: CheckInStatusUpdate,  # 这是一个 Pydantic 模型
):
    pass
```

**前端发送的 JSON：**
```json
{
  "check_in_status": "checked_in"  // ✅ 正确！这是一个对象
}
```

**FastAPI 期望的请求体：**
- 是一个 JSON 对象
- 对象的字段对应 Pydantic 模型的字段

## 2. 为什么现在才创建 Pydantic 模型？

### 原本的做法（有问题）
```python
# ❌ 错误的方式
check_in_status: CheckInStatus = Body(..., description="報到狀態")
```

**问题：**
- 前端发送的是对象 `{"check_in_status": "checked_in"}`
- FastAPI 期望的是单个值 `"checked_in"`
- 导致 422 验证错误

### 正确的做法
```python
# ✅ 正确的方式
status_update: CheckInStatusUpdate  # 使用 Pydantic 模型
```

**为什么：**
- 前端习惯发送 JSON 对象
- Pydantic 模型可以正确解析对象
- 更符合 RESTful API 的最佳实践

## 3. `status_update: CheckInStatusUpdate` 是什么？

### 这是一个函数参数
```python
def update_check_in_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    order_id: str,
    status_update: CheckInStatusUpdate,  # ← 这是函数参数
) -> Any:
```

### `CheckInStatusUpdate` 是一个 Pydantic 模型类
```python
# 在 backend/app/models/order.py 中定义
class CheckInStatusUpdate(SQLModel):
    """更新報到狀態"""
    check_in_status: CheckInStatus = Field(..., description="報到狀態")
```

### 工作流程
1. **前端发送请求：**
   ```json
   {
     "check_in_status": "checked_in"
   }
   ```

2. **FastAPI 自动解析：**
   - FastAPI 看到参数类型是 `CheckInStatusUpdate`
   - 自动将 JSON 对象解析为 `CheckInStatusUpdate` 实例
   - 验证字段类型和值

3. **在函数中使用：**
   ```python
   # status_update 是一个 CheckInStatusUpdate 实例
   # status_update.check_in_status 是 CheckInStatus 枚举值
   order = order_service.update_check_in_status(
       session,
       order_id=order_id,
       check_in_status=status_update.check_in_status
   )
   ```

## 4. 从 models 引入的逻辑

### 后端模型定义
```python
# backend/app/models/order.py
class CheckInStatusUpdate(SQLModel):
    check_in_status: CheckInStatus = Field(...)
```

### 在 __init__.py 中导出
```python
# backend/app/models/__init__.py
from .order import (
    CheckInStatus,
    CheckInStatusUpdate,  # ← 导出模型
    ...
)
```

### 在 API 路由中导入
```python
# backend/app/api/routes/orders.py
from app.models import (
    CheckInStatus,
    CheckInStatusUpdate,  # ← 导入模型
    ...
)
```

### 为什么这样设计？
- **模块化：** 模型定义和 API 路由分离
- **可重用：** 同一个模型可以在多个地方使用
- **类型安全：** Python 类型检查可以验证模型使用是否正确

## 5. 前端 schema.ts 和 models 的来源

### 流程：后端 → OpenAPI → 前端

#### 步骤 1：后端定义模型
```python
# backend/app/models/order.py
class CheckInStatusUpdate(SQLModel):
    check_in_status: CheckInStatus = Field(...)
```

#### 步骤 2：FastAPI 自动生成 OpenAPI Schema
- FastAPI 扫描所有路由和模型
- 自动生成 OpenAPI 3.1.0 格式的 JSON
- 保存在 `backend-openapi.json` 或通过 `/docs` 端点访问

#### 步骤 3：前端生成 TypeScript 类型
```bash
# frontend/package.json
"generate-client": "openapi-ts --input ./openapi.json --output ./src/client --client axios --exportSchemas true"
```

**生成的文件：**
- `frontend/src/client/models/order.ts` - TypeScript 类型定义
- `frontend/src/client/schemas.ts` - JSON Schema 验证规则
- `frontend/src/client/services/order.ts` - API 客户端函数

#### 步骤 4：前端使用生成的类型
```typescript
// frontend/src/client/models/order.ts (自动生成)
export type CheckInStatus = "not_checked_in" | "checked_in" | "left"

// frontend/src/routes/_layout/orders.tsx (手动编写)
import { CheckInStatus } from "../client/models/order"
import { OrdersService } from "../client/services/order"

OrdersService.updateCheckInStatus({
  orderId: "...",
  checkInStatus: "checked_in"  // TypeScript 会检查类型
})
```

### 数据流向图
```
后端 Python 模型
    ↓
FastAPI 自动生成 OpenAPI Schema
    ↓
openapi.json 文件
    ↓
openapi-ts 工具生成 TypeScript 类型
    ↓
前端 TypeScript 代码使用
```

## 6. 对比其他 API 端点的做法

### 示例 1：update_order（使用模型）
```python
def update_order(
    *,
    order_in: OrderUpdate,  # ← 使用 Pydantic 模型
):
    pass
```
**前端发送：**
```json
{
  "order_number": "...",
  "status": "...",
  ...
}
```

### 示例 2：update_payment_status（直接使用枚举）
```python
def update_payment_status(
    *,
    payment_status: PaymentStatus,  # ← 直接使用枚举，没有 Body()
):
    pass
```
**前端发送：**
```json
"PAID"  // 单个值，不是对象
```
或者 FastAPI 可能期望：
```json
{
  "payment_status": "PAID"
}
```

**注意：** 这个端点可能也有同样的问题！应该也使用模型。

## 总结

1. **对象 vs 单个值：** FastAPI 的 `Body()` 期望单个值，但前端通常发送对象
2. **Pydantic 模型：** 用于接收 JSON 对象，更符合 RESTful 实践
3. **`status_update`：** 是函数参数，类型是 `CheckInStatusUpdate` 模型类
4. **模型导入：** 通过 `__init__.py` 统一导出，便于管理和使用
5. **前端类型：** 从后端的 OpenAPI Schema 自动生成，保持前后端类型一致
