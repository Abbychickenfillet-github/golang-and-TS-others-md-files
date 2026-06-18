# 修復總承包商與用戶綁定問題

## 問題說明

1. **權限問題**：承包商不應該能編輯 event（活動），只能查看
2. **關聯問題**：user 沒有和 general_contractor 正確綁定，導致承包商看不到自己的信息

## 解決方案

### 1. 修復權限（移除 event 的編輯權限）

038 SQL 文件中只應該給 `event.view` 權限，不應該給 `event.create`, `event.update`, `event.delete`。

### 2. 確保 user 和 general_contractor 正確綁定

**步驟 1**：確認 `general_contractor` 表有 `user_id` 字段
```sql
-- 檢查字段是否存在
DESCRIBE general_contractor;
-- 應該看到 user_id 字段
```

**步驟 2**：將現有用戶綁定到對應的 general_contractor
```sql
-- 假設你知道哪個 user_id 對應哪個 general_contractor_id
-- 例如：user_id = '97f3b338-cc10-11f0-aef2-c625bac01c5a'
UPDATE general_contractor
SET user_id = '97f3b338-cc10-11f0-aef2-c625bac01c5a'
WHERE id = '對應的 general_contractor_id';
```

**步驟 3**：在後端添加根據 user_id 查詢 general_contractor 的方法

**步驟 4**：在前端添加獲取當前用戶的 general_contractor 信息的邏輯

## 需要修改的文件

1. `backend/app/crud/general_contractor.py` - 添加 `get_by_user_id` 方法
2. `backend/app/services/general_contractor_service.py` - 添加根據 user_id 查詢的方法
3. `backend/app/api/routes/general_contractors.py` - 添加 `/me` 端點，返回當前用戶的承包商信息
4. 前端 - 添加獲取當前用戶承包商信息的邏輯
