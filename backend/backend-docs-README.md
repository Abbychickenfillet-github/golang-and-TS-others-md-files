# Backend 開發文檔索引

本目錄包含開發過程中遇到的問題、解決方案和相關指令記錄。

## 文檔列表

### FastAPI 和路由相關
- **[FastAPI APIRouter 和 Docker Compose 使用說明](./ROUTING_AND_DOCKER_EXPLANATION.md)** ⭐ 推薦閱讀
  - APIRouter() 詳解
  - include_router() 方法說明
  - prefix 和 tags 的區別
  - Docker Compose restart vs watch
  - 大文件上傳配置
  - 路由路徑檢查

### 認證和安全相關
- **[登出和登入機制詳解](./LOGOUT_AND_LOGIN_EXPLANATION.md)** ⭐ 推薦閱讀
  - JWT Token 黑名單機制
  - 登出後能否正常登入的解釋
  - Token 撤銷流程
  - 黑名單檢查時機
  - API 端點說明（/api/v1/users/logout, /api/v1/members/logout 等）
  - 後端安全機制工作原理

### 按文件分類
- **[member_company.py 模型說明](./member_company.md)**
  - 模組級文檔字符串和 Linter 警告
  - TYPE_CHECKING 的作用和循環導入解決方案
  - Python 類型提示中的中括號語法
  - back_populates 雙向關係
  - sa_relationship_kwargs 參數配置
  - API 模型的作用和數據流向
  - 項目結構說明

### 2025-11-20
- **[Docker、TypeScript、Email 驗證修復記錄](./2025-11-20_docker-typescript-email-verification-fixes.md)**
  - Docker 連接錯誤
  - TypeScript 編譯錯誤修復
  - 移除 license_plate 功能
  - email_verified 欄位類型變更（BOOLEAN → VARCHAR）
  - 行尾符號問題（CRLF vs LF）
  - 資料庫連接問題

### 2025-11-25
- **[Docker Compose 使用指南](./2025-11-25_docker-compose-guide.md)** ⭐ 推薦閱讀
  - 服務概覽和端口映射
  - 只啟動後端服務（前端本地開發）
  - 常用 Docker Compose 命令
  - 開發工作流程（全棧/前端/後端）
  - 測試和故障排除
  - 進階使用和資源限制

### 2024-12-19
- **[FastAPI 依賴注入和基礎概念](./2024-12-19_fastapi-dependency-injection-and-basics.md)**
  - deps.py 的作用和依賴注入概念
  - Session(engine) 和 engine 的關係
  - Session 型別說明
  - CurrentUser 和 JWT 的關係
  - Annotated 語法說明
  - 泛型語法說明
  - 程式碼重構：提取常數

- **[Event 和 Tickets 資料表設計](./2024-12-19_event-tickets-design.md)**
  - Event 表新增 banner_image_url 欄位
  - Tickets 表設計（一對多關係）
  - 活動時間與售票時間的設計決策
  - 約束條件和索引設計

- **[票券購買和付款檢查流程](./2024-12-19_ticket-purchase-payment-flow.md)**
  - 購買資格驗證流程
  - 付款檢查機制（免費/付費票券）
  - API 端點使用說明
  - 庫存管理和自動狀態更新
  - 錯誤處理和事務管理

## 快速查找

### 按主題分類

#### Docker 相關
- **Docker Compose 完整指南** → [2025-11-25 文檔](./2025-11-25_docker-compose-guide.md) ⭐
- 只啟動後端服務 → [2025-11-25 文檔](./2025-11-25_docker-compose-guide.md#只啟動後端服務)
- 開發工作流程 → [2025-11-25 文檔](./2025-11-25_docker-compose-guide.md#開發工作流程)
- Docker 連接錯誤 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#1-docker-連接錯誤)
- 行尾符號問題 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#5-行尾符號問題-crlf-vs-lf)
- 資料庫連接問題 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#6-資料庫連接問題)

#### TypeScript 相關
- 編譯錯誤修復 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#2-typescript-編譯錯誤修復)
- 類型安全最佳實踐 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#91-typescript-類型安全)

#### 資料庫相關
- email_verified 欄位變更 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#4-email_verified-欄位類型變更)
- 資料庫遷移腳本 → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#42-資料遷移腳本)

#### Python/SQLModel 相關
- 模組級文檔字符串 → [member_company.md](./member_company.md#1-模組級文檔字符串和-linter-警告)
- TYPE_CHECKING 和循環導入 → [member_company.md](./member_company.md#2-type_checking-的作用)
- Python 類型提示語法 → [member_company.md](./member_company.md#3-python-類型提示中的中括號)
- SQLModel Relationship → [member_company.md](./member_company.md#4-back_populates-雙向關係)
- sa_relationship_kwargs → [member_company.md](./member_company.md#5-sa_relationship_kwargs-參數配置)
- API 模型數據流向 → [member_company.md](./member_company.md#6-api-模型的作用和數據流向)

#### 功能變更
- 移除 license_plate → [2025-11-20 文檔](./2025-11-20_docker-typescript-email-verification-fixes.md#3-移除-license_plate-功能)

## 常用指令

### Docker Compose（完整指南請看 [Docker Compose 使用指南](./2025-11-25_docker-compose-guide.md)）

```bash
# 啟動所有服務
docker compose up -d

# 只啟動後端（前端本地開發）
docker compose up -d --wait backend

# 查看日誌
docker compose logs -f backend

# 進入容器
docker compose exec backend bash

# 停止服務
docker compose down
```

### 資料庫
```bash
mysql -u root -p database_name < backend/sql/004_add_member_verification_fields.sql
mysql -u root -p -e "DESCRIBE member;" database_name
```

### 行尾符號轉換
```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location 'C:\coding\template'; .\backend\scripts\convert-line-endings.ps1"
```

## 文檔格式說明

每個文檔包含：
1. **問題描述** - 遇到的具體問題
2. **原因分析** - 問題的根本原因
3. **解決方案** - 具體的修復步驟
4. **相關檔案** - 受影響的檔案清單
5. **相關指令** - 使用的命令和腳本
6. **參考資料** - 相關文檔和工具

## 更新記錄

- 2025-11-20: 新增 member_company.py 模型說明文檔
- 2025-11-20: 創建初始文檔索引和問題修復記錄

---

**提示：** 每次解決重要問題後，請在此目錄中創建新的文檔記錄，並更新本索引檔案。
