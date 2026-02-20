# 超級用戶 API 測試指南

**日期**: 2024-12-19
**主題**: 如何測試需要超級用戶權限的 API 端點

---

## 重要說明

### ❌ 不需要 client_id 和 client_secret

這個系統**不使用** OAuth2 的 `client_id` 和 `client_secret`。
從 `backend/app/api/routes/login.py` 可以看到：

```python
# client_id (str, optional): 客戶端 ID（暫未使用）
# client_secret (str, optional): 客戶端密鑰（暫未使用）
```

### ✅ 只需要 email 和 password

登入端點使用標準的 OAuth2 表單認證：
- `username`：實際上是**用戶的 email 地址**
- `password`：用戶密碼

---

## 獲取超級用戶認證資訊

### 從環境變數查看

超級用戶資訊定義在 `.env` 文件中：

```bash
FIRST_SUPERUSER="<SUPERUSER_EMAIL>"
FIRST_SUPERUSER_PASSWORD="<SUPERUSER_PASSWORD>"
SECOND_SUPERUSER="<SECOND_SUPERUSER_EMAIL>"
SECOND_SUPERUSER_PASSWORD="<見 .env>"
```

### 從資料庫查看

```sql
-- 查看所有超級用戶
SELECT id, email, is_superuser, is_active
FROM user
WHERE is_superuser = TRUE;

-- 查看特定用戶是否為超級用戶
SELECT email, is_superuser
FROM user
WHERE email = '<SUPERUSER_EMAIL>';
```

---

## 測試步驟

### 步驟 1：獲取 JWT Token

**使用 curl：**

```bash
# 使用第一個超級用戶
curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"
```

**回應：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "token_type": "bearer"
}
```

**在 Swagger UI 中：**

1. 訪問 `http://localhost:8003/api/v1/docs`
2. 找到 `POST /api/v1/login/access-token`
3. 點擊 "Try it out"
4. 輸入：
   - `username`: `<SUPERUSER_EMAIL>`
   - `password`: `<SUPERUSER_PASSWORD>`
5. 點擊 "Execute"
6. 複製 `access_token` 的值

### 步驟 2：在 Swagger UI 中設定認證

1. 點擊右上角的 **"Authorize"** 按鈕（🔒 鎖頭圖標）
2. 在彈出的對話框中：
   - 找到 `oauth2` 或 `Bearer` 欄位
   - 在 `Value` 欄位貼上你的 `access_token`
   - **不要**輸入 "Bearer " 前綴，只貼 token 本身
   - 點擊 **"Authorize"** 確認
   - 點擊 **"Close"** 關閉
3. 現在所有 API 請求都會自動帶上這個 token

### 步驟 3：驗證用戶是否為超級用戶

**使用 curl：**

```bash
# 先獲取 token
TOKEN=$(curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>" | jq -r '.access_token')

# 驗證 token 並查看用戶資訊
curl -X POST "http://localhost:8003/api/v1/login/test-token" \
  -H "Authorization: Bearer $TOKEN"
```

**回應範例：**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "<SUPERUSER_EMAIL>",
  "is_active": true,
  "is_superuser": true,  // 👈 這個必須是 true
  "full_name": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**在 Swagger UI 中：**

1. 找到 `POST /api/v1/login/test-token` 端點
2. 點擊 "Try it out"
3. 點擊 "Execute"
4. 檢查回應中的 `is_superuser` 是否為 `true`

### 步驟 4：測試需要超級用戶權限的 API

**範例：創建活動**

**使用 curl：**

```bash
# 使用之前獲取的 TOKEN
curl -X POST "http://localhost:8003/api/v1/events/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 年度展覽",
    "description": "這是一個測試活動",
    "banner_image_url": "https://example.com/banner.jpg",
    "start_at": "2024-12-25T10:00:00Z",
    "end_at": "2024-12-25T18:00:00Z",
    "address": "台北市信義區信義路五段7號"
  }'
```

**在 Swagger UI 中：**

1. 確保已經完成步驟 2（設定認證）
2. 找到 `POST /api/v1/events/` 端點
3. 點擊 "Try it out"
4. 輸入請求 body：
   ```json
   {
     "name": "2024 年度展覽",
     "description": "這是一個測試活動",
     "banner_image_url": "https://example.com/banner.jpg",
     "start_at": "2024-12-25T10:00:00Z",
     "end_at": "2024-12-25T18:00:00Z",
     "address": "台北市信義區信義路五段7號"
   }
   ```
5. 點擊 "Execute"
6. 應該返回 `200 OK` 而不是 `401 Unauthorized`

---

## 需要超級用戶權限的端點

以下端點需要 `get_current_active_superuser` 權限：

### Events（活動）
- `POST /api/v1/events/` - 創建活動

### Tickets（票券）
- `POST /api/v1/tickets/` - 創建票券

### Countries（國家）
- `POST /api/v1/countries/` - 創建國家

### Event Images（活動圖片）
- `POST /api/v1/event-images/` - 創建活動圖片

### Members（會員）
- `POST /api/v1/members/` - 創建會員

### Companies（公司）
- `POST /api/v1/companies/` - 創建公司

### Users（用戶）
- `POST /api/v1/users/` - 創建用戶

---

## 常見錯誤

### 錯誤 1：401 Unauthorized

**原因：**
- 未提供 JWT token
- Token 無效或已過期

**解決：**
```bash
# 重新登入獲取新 token
curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"
```

### 錯誤 2：403 Forbidden - "The user doesn't have enough privileges"

**原因：**
- 用戶不是超級用戶（`is_superuser = false`）

**解決：**
```bash
# 1. 檢查用戶是否為超級用戶
curl -X POST "http://localhost:8003/api/v1/login/test-token" \
  -H "Authorization: Bearer $TOKEN"

# 2. 如果 is_superuser 為 false，需要使用超級用戶帳號登入
# 3. 或將該用戶設為超級用戶（需要資料庫權限）
```

### 錯誤 3：400 Bad Request - "Incorrect email or password"

**原因：**
- Email 或密碼錯誤
- 用戶不存在

**解決：**
- 檢查 `.env` 文件中的 `FIRST_SUPERUSER` 和 `FIRST_SUPERUSER_PASSWORD`
- 確認用戶存在且密碼正確

---

## 完整測試腳本

```bash
#!/bin/bash

# 設定變數
API_URL="http://localhost:8003/api/v1"
EMAIL="<SUPERUSER_EMAIL>"
PASSWORD="<SUPERUSER_PASSWORD>"

# 1. 登入獲取 token
echo "正在登入..."
TOKEN_RESPONSE=$(curl -s -X POST "${API_URL}/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${EMAIL}&password=${PASSWORD}")

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登入失敗！"
  echo "回應: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ 登入成功！"
echo "Token: ${TOKEN:0:50}..."

# 2. 驗證用戶是否為超級用戶
echo ""
echo "正在驗證用戶權限..."
USER_INFO=$(curl -s -X POST "${API_URL}/login/test-token" \
  -H "Authorization: Bearer $TOKEN")

IS_SUPERUSER=$(echo $USER_INFO | jq -r '.is_superuser')

if [ "$IS_SUPERUSER" != "true" ]; then
  echo "❌ 用戶不是超級用戶！"
  echo "用戶資訊: $USER_INFO"
  exit 1
fi

echo "✅ 用戶是超級用戶！"

# 3. 測試創建活動
echo ""
echo "正在測試創建活動..."
EVENT_RESPONSE=$(curl -s -X POST "${API_URL}/events/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 年度展覽",
    "description": "這是一個測試活動",
    "banner_image_url": "https://example.com/banner.jpg",
    "start_at": "2024-12-25T10:00:00Z",
    "end_at": "2024-12-25T18:00:00Z",
    "address": "台北市信義區信義路五段7號"
  }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/events/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 年度展覽",
    "description": "這是一個測試活動",
    "banner_image_url": "https://example.com/banner.jpg",
    "start_at": "2024-12-25T10:00:00Z",
    "end_at": "2024-12-25T18:00:00Z",
    "address": "台北市信義區信義路五段7號"
  }')

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ 活動創建成功！"
  echo "回應: $EVENT_RESPONSE"
else
  echo "❌ 活動創建失敗！HTTP 狀態碼: $HTTP_CODE"
  echo "回應: $EVENT_RESPONSE"
  exit 1
fi
```

---

## 相關檔案

- `backend/app/api/routes/login.py` - 登入端點
- `backend/app/api/deps.py` - 認證依賴（`get_current_active_superuser`）
- `backend/app/core/config.py` - 環境變數配置
- `.env` - 環境變數文件（包含超級用戶資訊）
