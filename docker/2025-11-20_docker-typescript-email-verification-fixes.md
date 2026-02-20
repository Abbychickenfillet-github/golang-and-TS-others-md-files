# 2025-11-20 開發問題修復記錄

## 概述
本次對話主要解決了 Docker 容器啟動、TypeScript 編譯錯誤、資料庫欄位類型變更（email_verified）以及行尾符號（CRLF vs LF）等問題。

---

## 1. Docker 連接錯誤

### 問題描述
```
unable to get image 'template-official_website': error during connect:
Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/images/template-official_website/json":
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

### 原因
Docker Desktop 服務未啟動或未安裝。

### 解決方案
1. 確認 Docker Desktop 已安裝並啟動
2. 檢查 Docker 服務狀態
3. 重新啟動 Docker Desktop

### 相關指令
```bash
docker compose up --build
```

---

## 2. TypeScript 編譯錯誤修復

### 問題列表

#### 2.1 缺少屬性錯誤
**錯誤訊息：**
```
error TS2339: Property 'email_verified' does not exist on type 'MemberQueryParams'
error TS2339: Property 'license_search' does not exist on type 'MemberQueryParams'
error TS2739: Type '{ ... }' is missing the following properties from type 'MemberCreate': email_verified, phone_verified
```

**解決方案：**
- 在 `frontend/src/client/models/member.ts` 中添加 `email_verified` 和 `phone_verified` 屬性
- 更新 `MemberQueryParams`、`MemberCreate`、`MemberUpdate` 等介面
- 移除 `license_plate` 相關功能

#### 2.2 類型不匹配錯誤
**錯誤訊息：**
```
error TS2322: Type '"verify_email"' is not assignable to type '"activate" | "deactivate" | "delete" | "restore" | "verify_identity"'
```

**解決方案：**
- 在 `frontend/src/client/services/member.ts` 中添加 `verify_email` 動作類型

#### 2.3 屬性不存在錯誤
**錯誤訊息：**
```
error TS2339: Property 'name' does not exist on type 'CompanyPublic'
```

**解決方案：**
- 使用 `getCompanyDisplayName(company)` 替代 `company.name`
- 更新所有相關組件：
  - `AddCompanyVerification.tsx`
  - `EditCompanyVerification.tsx`
  - `DeleteCompanyVerification.tsx`
  - `company-verifications.tsx`

#### 2.4 路由導航錯誤
**錯誤訊息：**
```
error TS2345: Argument of type '{ search: () => { ... }; }' is not assignable to parameter of type 'NavigateOptions<...>'. Property 'to' is missing.
```

**解決方案：**
- 在 TanStack Router 的 `navigate` 調用中添加 `to: Route.fullPath`
- 修正 `company-verifications.tsx` 中的導航邏輯

#### 2.5 類型索引錯誤
**錯誤訊息：**
```
error TS2538: Type 'null' cannot be used as an index type.
```

**解決方案：**
- 在 `members.tsx` 中添加 `getEmailVerificationColor` 輔助函數處理 `null` 值
- 使用條件判斷避免使用 `null` 作為索引

#### 2.6 未定義函數錯誤
**錯誤訊息：**
```
error TS2304: Cannot find name 'openImage'
```

**解決方案：**
- 在 `company-verifications.tsx` 和 `EditCompanyVerification.tsx` 中添加 `openImage` 輔助函數
- 確保函數在正確的作用域內定義

#### 2.7 隱式 any 類型錯誤
**錯誤訊息：**
```
error TS7006: Parameter 'option' implicitly has an 'any' type.
```

**解決方案：**
- 明確指定參數類型：`(option: (typeof companyDocumentTypeOptions)[number])`
- 修正 `companyDocumentTypeOptions` 的導入路徑

### 相關檔案
- `frontend/src/client/models/member.ts`
- `frontend/src/client/services/member.ts`
- `frontend/src/routes/_layout/members.tsx`
- `frontend/src/components/CompanyVerifications/*.tsx`
- `frontend/src/routes/_layout/company-verifications.tsx`

---

## 3. 移除 license_plate 功能

### 需求
用戶要求移除 `license_plate`（車牌號碼）相關功能。

### 修改內容
1. **前端模型** (`frontend/src/client/models/member.ts`)
   - 從 `MemberBase`、`MemberCreate`、`MemberUpdate` 等介面移除 `license_plate`
   - 移除 `license_search` 相關查詢參數

2. **前端服務** (`frontend/src/client/services/member.ts`)
   - 移除 `license_search` 參數

3. **前端 UI** (`frontend/src/routes/_layout/members.tsx`)
   - 移除 `license_search` 搜尋欄位
   - 移除相關篩選邏輯

### 相關指令
```bash
# 搜尋所有 license_plate 相關代碼
grep -r "license_plate" frontend/src/
grep -r "license_search" frontend/src/
```

---

## 4. email_verified 欄位類型變更

### 需求
將 `email_verified` 從 `BOOLEAN` 改為 `VARCHAR(20)`，支援以下狀態：
- `pending`: 待確認
- `verified`: 已驗證
- `failed`: 驗證失敗
- `NULL`: 尚未發送驗證請求

### 資料庫遷移

#### 4.1 初始遷移腳本
**檔案：** `backend/sql/004_add_member_verification_fields.sql`
```sql
ALTER TABLE member
ADD COLUMN email_verified VARCHAR(20) NULL
COMMENT 'Email 驗證狀態 (pending/verified/failed，NULL 代表尚未發送驗證)';
```

#### 4.2 資料遷移腳本
**檔案：** `backend/sql/005_migrate_email_verified_status.sql`
```sql
-- 轉換既有資料
UPDATE member
SET email_verified = CASE
  WHEN email_verified IN ('1', 1, TRUE, 'true') THEN 'verified'
  WHEN email_verified IN ('verified', 'pending', 'failed') THEN email_verified
  ELSE NULL
END;

-- 修改欄位類型
ALTER TABLE member
MODIFY COLUMN email_verified VARCHAR(20) NULL
COMMENT 'Email 驗證狀態 (pending/verified/failed，NULL 代表尚未發送驗證)';
```

### 後端修改

#### 4.3 Python 模型更新
**檔案：** `backend/app/models/member.py`
```python
# 添加常數定義
EMAIL_VERIFICATION_STATUS_PENDING = "pending"
EMAIL_VERIFICATION_STATUS_VERIFIED = "verified"
EMAIL_VERIFICATION_STATUS_FAILED = "failed"

EMAIL_VERIFICATION_STATUSES = {
    EMAIL_VERIFICATION_STATUS_PENDING,
    EMAIL_VERIFICATION_STATUS_VERIFIED,
    EMAIL_VERIFICATION_STATUS_FAILED,
}

# 更新 MemberBase
class MemberBase(SQLModel):
    email_verified: str | None = Field(
        default=None,
        max_length=20,
        description="Email 驗證狀態 (pending/verified/failed/NULL 代表尚未發送驗證)",
    )
```

#### 4.4 Firebase 整合更新
**檔案：** `backend/app/core/firebase.py`
```python
def map_email_verification_status(raw_value: Any) -> str | None:
    """
    將原始的 email_verified 值映射到定義的狀態字串或 None。
    Firebase 通常返回布林值。
    """
    if isinstance(raw_value, str) and raw_value in EMAIL_VERIFICATION_STATUSES:
        return raw_value
    if raw_value is True or raw_value == '1':
        return EMAIL_VERIFICATION_STATUS_VERIFIED
    # 任何其他值都映射為 None
    return None
```

#### 4.5 CRUD 操作更新
**檔案：** `backend/app/crud/member.py`
- 更新 `get_multi_with_filter` 和 `count_with_filter` 方法
- 正確處理 `email_verified` 的字符串類型篩選

### 前端修改

#### 4.6 TypeScript 模型更新
**檔案：** `frontend/src/client/models/member.ts`
```typescript
export type EmailVerificationStatus = "pending" | "verified" | "failed"

export interface MemberBase {
  email_verified: EmailVerificationStatus | null
  phone_verified: boolean
}

// 狀態配置
export const emailVerificationStatusConfig = {
  pending: { label: "待確認", color: "orange" },
  verified: { label: "已驗證", color: "green" },
  failed: { label: "驗證失敗", color: "red" },
} as const

// 格式化函數
export const formatEmailVerificationStatus = (
  status: EmailVerificationStatus | null,
): string => {
  if (status === null) {
    return "未發送驗證"
  }
  return emailVerificationStatusConfig[status]?.label || status
}
```

#### 4.7 UI 組件更新
**檔案：** `frontend/src/routes/_layout/members.tsx`
- 更新搜尋 schema 以支援新的狀態值
- 添加 `getEmailVerificationColor` 輔助函數處理 `null` 值
- 更新 UI 顯示邏輯

### 測試更新
**檔案：** `backend/app/tests/api/routes/test_refresh_token.py`
- 將 mock 的 `email_verified` 值從 `True` 改為 `"verified"`

### 文檔更新
**檔案：** `backend/members-api-integration-guide.md`
- 更新 API 範例中的 `email_verified` 類型說明
- 更新 TypeScript 介面定義

### 相關指令
```bash
# 執行資料庫遷移
mysql -u root -p < backend/sql/004_add_member_verification_fields.sql
mysql -u root -p < backend/sql/005_migrate_email_verified_status.sql

# 檢查遷移結果
mysql -u root -p -e "DESCRIBE member;" database_name
```

---

## 5. 行尾符號問題 (CRLF vs LF)

### 問題描述
在 Windows 環境下開發，Docker 容器內執行 shell 腳本時出現錯誤：
```
prestart-1 | /app/.venv/bin/python3: can't open file '/app/app/backend_pre_start.py\r': [Errno 2] No such file or directory
prestart-1 | scripts/prestart.sh: line 8: $'\r': command not found
```

### 原因
Windows 使用 CRLF (`\r\n`) 作為行尾符號，而 Linux 容器使用 LF (`\n`)。當 Windows 檔案被複製到容器時，`\r` 字符被當作檔案名稱的一部分，導致找不到檔案。

### 解決方案

#### 5.1 手動轉換（一次性）
```powershell
# 使用 WSL dos2unix 工具
wsl dos2unix backend/scripts/prestart.sh
wsl dos2unix backend/app/backend_pre_start.py
```

#### 5.2 自動化腳本
**檔案：** `backend/scripts/convert-line-endings.ps1`
```powershell
Set-Location (Resolve-Path "$PSScriptRoot\..\..")
$files = @(
  "backend/scripts/prestart.sh",
  "backend/app/backend_pre_start.py"
)
foreach ($pattern in $files) {
  wsl dos2unix $pattern
}
```

**執行方式：**
```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location 'C:\coding\template'; .\backend\scripts\convert-line-endings.ps1"
```

### 受影響的檔案
- `backend/scripts/prestart.sh`
- `backend/app/backend_pre_start.py`
- 任何在容器內直接執行的 shell 或 Python 腳本

### 最佳實踐
1. **在 Git 中設定行尾符號：**
   ```bash
   git config core.autocrlf input  # Linux/Mac
   git config core.autocrlf true   # Windows（自動轉換）
   ```

2. **在編輯器中設定：**
   - VS Code: 右下角點擊行尾符號，選擇 LF
   - 或使用 `.editorconfig` 檔案統一設定

3. **在 `.gitattributes` 中指定：**
   ```
   *.sh text eol=lf
   *.py text eol=lf
   ```

### 相關指令
```bash
# 檢查檔案行尾符號（在 Linux/WSL 中）
file backend/scripts/prestart.sh
# 應該顯示：ASCII text（而不是 "with CRLF line terminators"）

# 或在 PowerShell 中檢查
Get-Content backend/scripts/prestart.sh -Raw | Select-String "`r`n"
```

---

## 6. 資料庫連接問題

### 問題描述
`prestart` 容器不斷重試連接資料庫，每秒執行一次：
```
ERROR:__main__:(pymysql.err.OperationalError) (1049, "Unknown database 'future_sign_prod'")
WARNING:__main__:Finished call to '__main__.init_db' after 4.120(s), this was the 4th time calling it.
```

### 原因
`backend_pre_start.py` 使用 `tenacity` 庫重試連接資料庫，但資料庫 `future_sign_prod` 不存在，導致持續重試。

**檔案：** `backend/app/backend_pre_start.py`
```python
max_tries = 60 * 5  # 5 minutes
wait_seconds = 1

@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
def init_db(db_engine: Engine) -> None:
    # 嘗試連接資料庫
    ...
```

### 解決方案

#### 方案 1: 創建資料庫
```sql
CREATE DATABASE future_sign_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 方案 2: 修改環境變數
**檔案：** `.env.local` 或 `.env`
```env
# 修改為實際存在的資料庫名稱
DATABASE_URL=mysql+pymysql://root:password@host:port/database_name
MYSQL_DATABASE=actual_database_name
```

#### 方案 3: 使用 Docker Compose 的 MySQL 服務
如果使用 `docker-compose.yml` 中的 MySQL 服務，確保：
1. MySQL 容器已啟動
2. 資料庫已創建
3. 環境變數指向正確的資料庫名稱

### 相關檔案
- `backend/app/backend_pre_start.py`
- `.env.local`
- `.env`
- `docker-compose.yml`

### 相關指令
```bash
# 檢查資料庫是否存在
mysql -u root -p -e "SHOW DATABASES;"

# 創建資料庫
mysql -u root -p -e "CREATE DATABASE future_sign_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 檢查環境變數
docker compose exec backend env | grep DATABASE
```

---

## 7. 常用指令參考

### Docker 相關
```bash
# 建置並啟動容器
docker compose up --build

# 查看容器日誌
docker compose logs -f prestart

# 進入容器
docker compose exec backend bash

# 停止容器
docker compose down
```

### 資料庫相關
```bash
# 執行 SQL 遷移腳本
mysql -u root -p database_name < backend/sql/004_add_member_verification_fields.sql

# 檢查表結構
mysql -u root -p -e "DESCRIBE member;" database_name

# 查看資料
mysql -u root -p -e "SELECT email_verified, COUNT(*) FROM member GROUP BY email_verified;" database_name
```

### 前端相關
```bash
# 建置前端
cd frontend
npm run build

# 檢查 TypeScript 錯誤
npm run type-check

# 執行 linter
npm run lint
```

### 後端相關
```bash
# 安裝依賴
cd backend
uv sync

# 執行測試
uv run pytest

# 執行 linter
uv run ruff check .
```

---

## 8. 檔案變更清單

### 新增檔案
- `backend/sql/004_add_member_verification_fields.sql`
- `backend/sql/005_migrate_email_verified_status.sql`
- `backend/scripts/convert-line-endings.ps1`
- `backend/docs/2025-11-20_docker-typescript-email-verification-fixes.md` (本檔案)

### 修改檔案
- `backend/app/models/member.py`
- `backend/app/core/firebase.py`
- `backend/app/crud/member.py`
- `backend/app/tests/api/routes/test_refresh_token.py`
- `backend/members-api-integration-guide.md`
- `backend/scripts/prestart.sh` (行尾符號)
- `backend/app/backend_pre_start.py` (行尾符號)
- `frontend/src/client/models/member.ts`
- `frontend/src/client/services/member.ts`
- `frontend/src/routes/_layout/members.tsx`
- `frontend/src/components/CompanyVerifications/AddCompanyVerification.tsx`
- `frontend/src/components/CompanyVerifications/EditCompanyVerification.tsx`
- `frontend/src/components/CompanyVerifications/DeleteCompanyVerification.tsx`
- `frontend/src/routes/_layout/company-verifications.tsx`
- `frontend/src/components/Members/AddMember.tsx`

---

## 9. 技術要點總結

### 9.1 TypeScript 類型安全
- 使用明確的類型定義避免 `any` 類型
- 處理 `null` 值時使用條件判斷而非直接索引
- 確保所有介面屬性完整定義

### 9.2 資料庫遷移最佳實踐
- 先創建遷移腳本測試
- 使用 `TRANSACTION` 確保原子性
- 保留資料轉換邏輯的註解

### 9.3 跨平台開發
- 統一使用 LF 行尾符號
- 使用 Git 配置自動處理行尾符號
- 在 CI/CD 中驗證行尾符號

### 9.4 錯誤處理
- 使用 `tenacity` 進行重試邏輯
- 記錄詳細的錯誤訊息
- 設定合理的重試次數和間隔

---

## 10. 參考資料

### 相關文檔
- [Docker Desktop 文檔](https://docs.docker.com/desktop/)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)
- [TanStack Router 文檔](https://tanstack.com/router)
- [SQLModel 文檔](https://sqlmodel.tiangolo.com/)
- [dos2unix 手冊](https://linux.die.net/man/1/dos2unix)

### 相關工具
- `dos2unix`: 轉換行尾符號
- `tenacity`: Python 重試庫
- `pymysql`: MySQL Python 驅動
- `sqlmodel`: Python ORM

---

## 附錄：問題排查流程

1. **Docker 錯誤**
   - 檢查 Docker Desktop 是否運行
   - 檢查 `docker-compose.yml` 配置
   - 查看容器日誌

2. **TypeScript 錯誤**
   - 檢查類型定義是否完整
   - 確認導入路徑正確
   - 檢查 `tsconfig.json` 配置

3. **資料庫連接錯誤**
   - 檢查環境變數
   - 確認資料庫是否存在
   - 檢查網路連接

4. **行尾符號錯誤**
   - 檢查檔案格式
   - 使用 `dos2unix` 轉換
   - 設定 Git 配置

---

**最後更新：** 2025-11-20
**記錄者：** AI Assistant
**狀態：** 已完成
