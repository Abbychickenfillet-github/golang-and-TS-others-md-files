# 總承包商（GC）架構設計建議

## 問題分析

### 當前問題
1. **ID 過多**：GC 有太多 ID
   - `general_contractor.id`（GC 資料表 ID）
   - `role.id`（角色 ID）
   - `user.id`（後台登入用戶 ID）
   - 可能還有 `company.id`（如果關聯公司）
   - 如果前台註冊，還會有 `member.id` → `member_company.company_id`

2. **業務模式不確定**：
   - **模式 A（私下接洽）**：管理員私下接洽，後台設定
   - **模式 B（公開註冊）**：承包商自行註冊，需要審核流程

## 推薦架構方案

### 方案一：純後台管理（推薦用於模式 A）

**適用場景**：管理員私下接洽承包商，直接幫他們設定後台帳號

**架構設計**：
```
User (後台登入)
  ├── role_id → Role (general_contractor)
  └── general_contractor.user_id → GeneralContractor
```

**優點**：
- ✅ 簡單直接，ID 最少
- ✅ 不需要前台註冊流程
- ✅ 管理員完全控制
- ✅ 不需要審核流程

**缺點**：
- ❌ 承包商無法自行註冊
- ❌ 需要管理員手動建立每個帳號

**實作方式**：
1. 管理員在後台建立 `User`（email + password）
2. 設定 `user.role_id` = `general_contractor` 角色的 ID
3. 建立 `GeneralContractor` 記錄，設定 `general_contractor.user_id` = `user.id`
4. 承包商用 email/password 登入後台

### 方案二：前台註冊 + 後台審核（推薦用於模式 B）

**適用場景**：承包商自行註冊，需要審核和文件上傳

**架構設計**：
```
Member (前台註冊)
  ├── member_company → Company
  └── GeneralContractor
      ├── company_id → Company (可選，如果 GC 有公司)
      └── user_id → User (後台登入，審核通過後建立)
```

**流程**：
1. **前台註冊**：
   - 承包商在前台註冊為 `Member`
   - 建立 `Company`（或選擇現有公司）
   - 建立 `MemberCompany` 關聯（status = 'pending'）
   - 建立 `GeneralContractor`（status = 'pending'，user_id = NULL）

2. **上傳文件**：
   - 承包商上傳相關證明文件（可擴展現有的 `UploadIdentityVerification`）

3. **後台審核**：
   - 管理員審核 `GeneralContractor` 申請
   - 審核通過後：
     - 建立 `User`（email = member.email，password 由系統生成或發送重置連結）
     - 設定 `user.role_id` = `general_contractor`
     - 更新 `general_contractor.user_id` = `user.id`
     - 更新 `general_contractor.status` = 'approved'
     - 發送通知（email）告知承包商可以登入後台

**優點**：
- ✅ 承包商可以自行註冊
- ✅ 有完整的審核流程
- ✅ 可以上傳證明文件
- ✅ 自動化通知流程

**缺點**：
- ❌ 架構較複雜
- ❌ 需要實作審核流程和通知系統
- ❌ ID 較多（member_id, company_id, user_id, general_contractor_id）

### 方案三：混合模式（最靈活）

**適用場景**：同時支援私下接洽和公開註冊

**架構設計**：
- 支援兩種建立方式：
  1. **後台直接建立**（模式 A）：管理員手動建立 User + GeneralContractor
  2. **前台註冊審核**（模式 B）：Member → Company → GeneralContractor（pending）→ 審核 → User

**實作方式**：
- `GeneralContractor` 表增加欄位：
  - `registration_source` ENUM('backend', 'frontend')：註冊來源
  - `member_id` VARCHAR(36) NULL：如果是前台註冊，關聯到 Member
  - `user_id` VARCHAR(36) NULL：後台登入用戶（審核通過後建立）

## 我的建議

### 根據您的需求，我建議採用**方案一（純後台管理）**：

**理由**：
1. ✅ **您提到「不打算他進前台的時候有任何屬於GC的特別頁面畫面」**
   - 這表示 GC 不需要前台功能
   - 純後台管理最符合這個需求

2. ✅ **架構最簡單**
   - ID 最少：只需要 `user.id` 和 `general_contractor.id`
   - 不需要 `member_id`、`company_id` 等複雜關聯

3. ✅ **符合「私下接洽」的業務模式**
   - 管理員先接洽 → 後台建立帳號 → 承包商直接登入後台

4. ✅ **易於實作和維護**
   - 不需要實作前台註冊流程
   - 不需要實作審核流程
   - 不需要實作文件上傳（如果需要，可以後續擴展）

### 如果未來需要公開註冊，可以擴展為方案三

**擴展方式**：
- 在 `GeneralContractor` 表增加 `registration_source` 欄位
- 增加 `member_id` 欄位（可選）
- 實作前台註冊流程和審核流程

## 實作建議

### 當前應該做的：

1. **簡化架構**：
   - 移除 `GeneralContractor` 與 `Member`、`Company` 的關聯（如果有的話）
   - 只保留 `general_contractor.user_id` → `user.id` 的關聯

2. **後台建立流程**：
   ```
   管理員操作：
   1. 建立 User（email, password, role_id = general_contractor）
   2. 建立 GeneralContractor（user_id = user.id, 其他公司資訊）
   3. 完成！承包商可以用 email/password 登入後台
   ```

3. **修復當前問題**：
   - 執行 `041_fix_general_contractor_permissions.sql` 修復權限格式
   - 確保 `general_contractor.user_id` 正確綁定

### 如果未來需要前台註冊：

1. 擴展 `GeneralContractor` 表：
   ```sql
   ALTER TABLE general_contractor
   ADD COLUMN registration_source ENUM('backend', 'frontend') DEFAULT 'backend',
   ADD COLUMN member_id VARCHAR(36) NULL,
   ADD FOREIGN KEY (member_id) REFERENCES member(id);
   ```

2. 實作前台註冊 API 和審核流程

3. 實作通知系統（email 通知）

## 總結

**建議採用方案一（純後台管理）**，因為：
- 符合您的業務需求（不需要前台 GC 頁面）
- 架構最簡單（ID 最少）
- 易於實作和維護
- 未來可以擴展為混合模式

如果確定採用方案一，我們可以：
1. 修復當前權限問題
2. 簡化 `GeneralContractor` 模型（移除不必要的關聯）
3. 實作後台建立流程
