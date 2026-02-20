# Member Company Review 頁面問題紀錄 2025-12-28

## 問題描述

在 `/member-company-reviews` 頁面新增會員公司關聯時，某些公司無法在下拉選單中找到。

## 問題原因

### 1. 公司狀態過濾問題

**檔案位置**: `frontend/src/routes/_layout/member-company-reviews.tsx`
**問題程式碼** (第 324 行):

```typescript
const filteredModalCompanies = useMemo(() => {
  let companies = companiesData?.data?.filter((c) => c.status === "active") || []
  // ...
```

**問題**: 新增關聯的公司下拉選單只顯示 `status === "active"` 的公司。

**影響**:
- `status: pending` (待審核) 的公司無法被選擇
- `status: denied` (已拒絕) 的公司無法被選擇
- 海外公司如果尚未審核通過，無法建立會員關聯

### 2. 實際案例

**公司資料**:
- 公司名稱: 新公司輝搭
- company_id: `f366b95c-e581-4318-a70d-01e49f39fda4`
- tax_id: `(無)` ← 海外公司
- country: `(無)` ← 尚未設定
- **status: `pending`** ← 這是問題所在！

**資料庫實際狀態**:
```
member_company 表中已有關聯:
- test10@gmail.com | status=approved | position=staff
- aintluminate@gmail.com | status=approved | position=boss
```

資料庫有關聯，但前端因為公司 status 不是 active，所以在新增時找不到這家公司。

## 建議修復方案

### 方案一：允許選擇待審核的公司（推薦）

修改 `filteredModalCompanies` 的過濾邏輯：

```typescript
const filteredModalCompanies = useMemo(() => {
  // 允許 active 和 pending 狀態的公司
  let companies = companiesData?.data?.filter((c) =>
    c.status === "active" || c.status === "pending"
  ) || []
  // ...
```

### 方案二：根據國家區分顯示邏輯

未來需要：
- 海外公司 (country != 'TW') 可能不需要統編審核
- 台灣公司需要統編驗證才能變成 active
- 前端應該根據國家顯示不同的審核流程

### 方案三：新增「包含待審核公司」的勾選框

在新增關聯 Modal 中新增選項，讓管理員可以選擇是否顯示待審核的公司。

## 相關資料查詢指令

```python
# 透過 Docker 查詢公司狀態
docker exec template-backend-1 python -c "
import sys
sys.path.insert(0, '/app')
from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT id, company_name, tax_id, country, status
        FROM company
        WHERE company_name LIKE '%新公司輝搭%'
    '''))
    for row in result:
        print(row)
"
```

## 待辦事項

- [ ] 修改 `filteredModalCompanies` 過濾邏輯
- [ ] 考慮海外公司與台灣公司的審核流程差異
- [ ] 在公司管理頁面顯示國家欄位
- [ ] 為沒有統編的公司設定預設 country 值

## 日期

2025-12-28
