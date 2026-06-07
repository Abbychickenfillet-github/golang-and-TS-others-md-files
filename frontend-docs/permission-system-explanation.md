# 權限管理系統說明

## 程式碼解釋

### `const isViewPermission = action === "view"` 是什麼意思？

```typescript
const isViewPermission = action === "view"
```

這行程式碼的意思是：
- `action` 是一個變數，可能的值有：`"view"`, `"create"`, `"edit"`, `"delete"`, `"approve"` 等
- `action === "view"` 會比較 `action` 是否等於 `"view"`
- 如果相等，`isViewPermission` 會是 `true`
- 如果不相等，`isViewPermission` 會是 `false`

**簡單來說**：這是在檢查「目前這個權限是不是『查看』權限」

---

## 權限系統架構

### 權限格式
權限的格式是 `模組.動作`，例如：
- `members.view` = 會員管理的查看權限
- `orders.create` = 訂單管理的新增權限
- `refunds.approve` = 退款管理的審批權限

### 可用的動作 (PermissionAction)
| 動作 | 中文 | 說明 |
|------|------|------|
| `view` | 查看 | 可以看到這個功能 |
| `create` | 新增 | 可以建立新資料 |
| `edit` | 編輯 | 可以修改現有資料 |
| `delete` | 刪除 | 可以刪除資料 |
| `approve` | 審批 | 可以審核/批准（如退款） |
| `assign-role` | 指派身份組 | 可以指派角色給用戶 |
| `notify` | 接收通知 | 可以接收相關通知 |

---

## 模組啟用邏輯

### 啟用模組時的「預設」行為

當你在 UI 上開啟某個模組的開關時：

```typescript
if (enabled) {
  // 啟用模組時，預設開啟 view 權限
  module.permissions.forEach((permission) => {
    if (permission === "view") {
      // 預設開啟 view（但使用者可以之後手動關閉）
      updatedPerms[`${moduleKey}.${permission}`] = true
    } else {
      // 其他權限保持原值或 false
      updatedPerms[`${moduleKey}.${permission}`] =
        currentPerms[`${moduleKey}.${permission}`] || false
    }
  })
}
```

**重點說明**：
- 「查看」權限是**預設**開啟的，不是「必選」
- 使用者可以自由開關所有權限（包括查看）
- 如果想完全隱藏某模組，可以把所有權限都關掉（包括查看）

### 停用模組時

```typescript
if (!enabled) {
  // 停用時，所有權限設為 false
  module.permissions.forEach((permission) => {
    updatedPerms[`${moduleKey}.${permission}`] = false
  })
}
```

---

## 權限統計說明

在左側導航欄看到的 `10/22` 是什麼意思？

```
▶ 會員與公司
  10/22 ← 這個數字
```

- **10**：該分類下已啟用的權限數量
- **22**：該分類下全部可用的權限數量

### 計算方式

```typescript
category.modules.forEach((module) => {
  module.permissions.forEach((action) => {
    total++  // 每個動作算 1 個權限
    if (permissions[`${module.key}.${action}`]) {
      enabled++  // 如果該權限是 true，啟用數 +1
    }
  })
})
```

**例如「會員與公司」分類**：
- 會員管理：view, create, edit, delete = 4 個權限
- 公司管理：view, create, edit, delete = 4 個權限
- 會員公司關聯：view, create, edit, delete = 4 個權限
- 公司身分驗證：view, edit = 2 個權限
- 廠商支付方式：view, create, edit, delete = 4 個權限
- 統包商管理：view, create, edit, delete = 4 個權限
- **總計：22 個權限**

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `frontend/src/constants/permissionModules.ts` | 權限模組定義、角色顯示名稱 |
| `frontend/src/constants/defaultRolePermissions.ts` | 各角色的預設權限範本 |
| `frontend/src/components/Role/RolePermissionTabs.tsx` | 主組件（Tab + 左右分欄） |
| `frontend/src/components/Role/PermissionPanel.tsx` | 右側權限開關面板 |
| `frontend/src/components/Role/PermissionSwitch.tsx` | 單一權限開關元件 |
| `frontend/src/components/Role/PermissionSidebar.tsx` | 左側分類導航 |
| `frontend/src/routes/_layout/role-permissions.tsx` | 頁面路由（superuser only） |

---

## Tab 排序

角色 Tab 的固定排序順序：

```typescript
const ROLE_ORDER = [
  ROLE_IDS.BOSS,              // BOSS
  ROLE_IDS.IT,                // IT
  ROLE_IDS.MANAGER,           // 經理
  ROLE_IDS.ADMIN,             // 行政
  ROLE_IDS.ELECTRICITY_COMPANY, // 電力相關公司身分
  ROLE_IDS.FURNITURE_COMPANY,   // 傢俱公司
  ROLE_IDS.GENERAL_CONTRACTOR,  // 承包商
  ROLE_IDS.PART_TIME,           // 工讀
  ROLE_IDS.DELIVERY,            // 送貨員
]
```

未在排序列表中的新角色會排到最後。

---

## 參考

- GitHub Issue: #192
- 相關 Commit: `c7e985c`, `5b9ebd0`

---

*建立日期：2026-01-21*
