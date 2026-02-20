# 修复总承包商与用户绑定问题

## 问题说明

1. **权限问题**：承包商不应该能编辑 event（活动），只能查看
2. **关联问题**：user 没有和 general_contractor 正确绑定，导致承包商看不到自己的信息

## 解决方案

### 1. 修复权限（移除 event 的编辑权限）

038 SQL 文件中只应该给 `event.view` 权限，不应该给 `event.create`, `event.update`, `event.delete`。

### 2. 确保 user 和 general_contractor 正确绑定

**步骤 1**：确认 `general_contractor` 表有 `user_id` 字段
```sql
-- 检查字段是否存在
DESCRIBE general_contractor;
-- 应该看到 user_id 字段
```

**步骤 2**：将现有用户绑定到对应的 general_contractor
```sql
-- 假设你知道哪个 user_id 对应哪个 general_contractor_id
-- 例如：user_id = '97f3b338-cc10-11f0-aef2-c625bac01c5a'
UPDATE general_contractor
SET user_id = '97f3b338-cc10-11f0-aef2-c625bac01c5a'
WHERE id = '对应的 general_contractor_id';
```

**步骤 3**：在后端添加根据 user_id 查询 general_contractor 的方法

**步骤 4**：在前端添加获取当前用户的 general_contractor 信息的逻辑

## 需要修改的文件

1. `backend/app/crud/general_contractor.py` - 添加 `get_by_user_id` 方法
2. `backend/app/services/general_contractor_service.py` - 添加根据 user_id 查询的方法
3. `backend/app/api/routes/general_contractors.py` - 添加 `/me` 端点，返回当前用户的承包商信息
4. 前端 - 添加获取当前用户承包商信息的逻辑
