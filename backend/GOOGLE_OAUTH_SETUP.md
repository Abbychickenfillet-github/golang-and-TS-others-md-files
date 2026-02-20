# Google OAuth 登入設置指南

## 概述

本系統已實現 Google OAuth2 登入功能，允許會員使用 Google 帳號登入或註冊。

## 後端設置

### 1. 安裝依賴

依賴已添加到 `pyproject.toml`：
```toml
"fastapi-sso>=0.16.0"
```

執行安裝：
```bash
cd backend
uv sync
```

### 2. 資料庫遷移

執行 SQL migration 添加 OAuth 欄位：
```bash
# 在 Docker 容器中執行
docker compose exec backend mysql -u root -p < sql/024_add_member_oauth_fields.sql

# 或直接連接到資料庫執行
mysql -u root -p your_database < backend/sql/024_add_member_oauth_fields.sql
```

### 3. 環境變數配置

在 `.env` 文件中添加以下配置：

```env
# Google OAuth2 憑證
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 前端 URL（用於 OAuth 回調重定向）
OFFICIAL_WEBSITE_URL=http://localhost:3000
```

### 4. 獲取 Google OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google+ API
4. 前往「憑證」頁面
5. 創建 OAuth 2.0 客戶端 ID
6. 設置授權的重定向 URI：
   - 開發環境：`http://localhost:8003/api/v1/auth/google/callback`
   - 生產環境：`https://your-api-domain.com/api/v1/auth/google/callback`
7. 複製 Client ID 和 Client Secret 到 `.env` 文件

## API 端點

### 1. 發起 Google 登入
```
GET /api/v1/auth/google/login
```
重定向用戶到 Google 登入頁面。

### 2. Google OAuth 回調
```
GET /api/v1/auth/google/callback
```
處理 Google OAuth 回調，驗證用戶身份，創建或更新會員，返回 JWT token。

### 3. 獲取當前會員資訊
```
GET /api/v1/members/me
```
需要 Bearer token 認證，返回當前登入會員的資訊。

## 前端設置

### 1. 環境變數

在 `offcial_webiste/.env.local` 中確保配置正確：
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8003/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. OAuth 回調頁面

已創建 `/app/auth/callback/page.tsx` 處理 Google OAuth 回調。

## 工作流程

1. 用戶點擊「使用 Google 登入」按鈕
2. 前端重定向到 `/api/v1/auth/google/login`
3. 後端重定向用戶到 Google 登入頁面
4. 用戶在 Google 完成認證
5. Google 重定向回 `/api/v1/auth/google/callback`
6. 後端驗證用戶身份，創建或更新會員
7. 後端生成 JWT token 並重定向到前端 `/auth/callback?token=xxx`
8. 前端接收 token，設置認證狀態，獲取會員資訊
9. 用戶成功登入

## 資料庫結構

Member 表新增欄位：
- `google_id`: VARCHAR(255) - Google OAuth ID
- `oauth_provider`: VARCHAR(50) - OAuth 提供者（如 "google"）

## 注意事項

1. **開發環境**：系統會自動允許 HTTP 連接（`OAUTHLIB_INSECURE_TRANSPORT=1`）
2. **生產環境**：必須使用 HTTPS
3. **Email 驗證**：通過 Google 登入的會員，email 會自動標記為已驗證
4. **會員創建**：如果 Google 帳號對應的 email 已存在，會更新該會員的 `google_id` 和 `oauth_provider`

## 測試

1. 確保後端服務運行在 `http://localhost:8003`
2. 確保前端服務運行在 `http://localhost:3000`
3. 點擊「使用 Google 登入」按鈕
4. 完成 Google 認證流程
5. 檢查是否成功登入並顯示用戶資訊

