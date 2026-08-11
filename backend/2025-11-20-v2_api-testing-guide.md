---
title: "2025-11-20-v2_api-testing-guide"
---

# API 測試指南

**日期**: 2025-11-19
**主題**: 如何測試 Event、Ticket、Country 相關 API

---

## 測試工具

### 1. FastAPI 自動生成的文檔
啟動後端服務後，訪問：
- **Swagger UI**: `http://localhost:8003/api/v1/docs`
- **ReDoc**: `http://localhost:8003/api/v1/redoc`

### 2. 使用 curl 命令

### 3. 使用 Postman 或 Insomnia

### 4. 使用 Python requests

---

## Event API 測試

### 1. 獲取活動列表

```bash
# 使用 curl
curl -X GET "http://localhost:8003/api/v1/events/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. 創建活動（測試 NOT NULL 約束）

**重要：此端點需要超級用戶權限！**

```bash
# 正確的請求（所有必填欄位都有值）
# 注意：必須使用超級用戶的 JWT token
curl -X POST "http://localhost:8003/api/v1/events/" \
  -H "Authorization: Bearer YOUR_SUPERUSER_JWT_TOKEN" \
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

**在 Swagger UI 中使用：**
1. 點擊右上角的 **"Authorize"** 按鈕
2. 輸入超級用戶的 JWT token
3. 點擊 **"Authorize"** 確認
4. 然後再執行 POST 請求

**測試錯誤情況**：

```bash
# 缺少 banner_image_url（應該失敗）
# 注意：必須使用超級用戶的 JWT token
curl -X POST "http://localhost:8003/api/v1/events/" \
  -H "Authorization: Bearer YOUR_SUPERUSER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 年度展覽",
    "description": "這是一個測試活動",
    "start_at": "2024-12-25T10:00:00Z",
    "end_at": "2024-12-25T18:00:00Z",
    "address": "台北市信義區信義路五段7號"
  }'
# 預期回應: 422 Unprocessable Entity (缺少必填欄位)

# 沒有提供 JWT token（應該失敗）
curl -X POST "http://localhost:8003/api/v1/events/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 年度展覽",
    "description": "這是一個測試活動",
    "banner_image_url": "https://example.com/banner.jpg",
    "start_at": "2024-12-25T10:00:00Z",
    "end_at": "2024-12-25T18:00:00Z",
    "address": "台北市信義區信義路五段7號"
  }'
# 預期回應: 401 Unauthorized (需要認證)
```

### 3. 獲取單個活動

```bash
curl -X GET "http://localhost:8003/api/v1/events/{event_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. 更新活動

```bash
curl -X PATCH "http://localhost:8003/api/v1/events/{event_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新後的活動名稱",
    "banner_image_url": "https://example.com/new-banner.jpg"
  }'
```

---

## Ticket API 測試

### 1. 驗證票券購買資格

```bash
curl -X POST "http://localhost:8003/api/v1/tickets/{ticket_id}/validate?quantity=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. 購買票券（包含付款檢查）

```bash
# 付費票券
curl -X POST "http://localhost:8003/api/v1/tickets/{ticket_id}/purchase?quantity=2&payment_amount=1000.00&payment_method=credit_card" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 免費票券
curl -X POST "http://localhost:8003/api/v1/tickets/{ticket_id}/purchase?quantity=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**測試付款檢查**：

```bash
# 付款金額錯誤（應該失敗）
curl -X POST "http://localhost:8003/api/v1/tickets/{ticket_id}/purchase?quantity=2&payment_amount=500.00&payment_method=credit_card" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# 預期回應: 400 Bad Request (付款金額不正確)
```

---

## Country API 測試

### 1. 獲取國家列表

```bash
curl -X GET "http://localhost:8003/api/v1/countries/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. 獲取啟用的國家

```bash
curl -X GET "http://localhost:8003/api/v1/countries/active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 創建國家

```bash
curl -X POST "http://localhost:8003/api/v1/countries/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TH",
    "name_en": "Thailand",
    "name_zh_tw": "泰國",
    "phone_prefix": "+66",
    "currency_code": "THB",
    "is_active": true
  }'
```

---

## Python 測試腳本

創建 `test_api.py`：

```python
import requests
from datetime import datetime

BASE_URL = "http://localhost:8003/api/v1"
TOKEN = "YOUR_JWT_TOKEN"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 測試創建活動
def test_create_event():
    data = {
        "name": "2024 年度展覽",
        "description": "這是一個測試活動",
        "banner_image_url": "https://example.com/banner.jpg",
        "start_at": datetime(2024, 12, 25, 10, 0, 0).isoformat(),
        "end_at": datetime(2024, 12, 25, 18, 0, 0).isoformat(),
        "address": "台北市信義區信義路五段7號"
    }

    response = requests.post(
        f"{BASE_URL}/events/",
        json=data,
        headers=headers
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.json()

# 測試缺少必填欄位
def test_create_event_missing_banner():
    data = {
        "name": "2024 年度展覽",
        "description": "這是一個測試活動",
        # 缺少 banner_image_url
        "start_at": datetime(2024, 12, 25, 10, 0, 0).isoformat(),
        "end_at": datetime(2024, 12, 25, 18, 0, 0).isoformat(),
        "address": "台北市信義區信義路五段7號"
    }

    response = requests.post(
        f"{BASE_URL}/events/",
        json=data,
        headers=headers
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    # 預期: 422 或 400 錯誤

if __name__ == "__main__":
    test_create_event()
    test_create_event_missing_banner()
```

---

## 資料庫約束驗證測試

### 測試 NOT NULL 約束

執行 SQL 測試：

```sql
-- 測試：嘗試插入 NULL 值到 banner_image_url（應該失敗）
INSERT INTO event (
    id, name, description, banner_image_url, start_at, end_at, address
) VALUES (
    UUID(), '測試活動', '描述', NULL, NOW(), NOW(), '地址'
);
-- 預期: ERROR: Column 'banner_image_url' cannot be null

-- 測試：嘗試插入 NULL 值到 description（應該失敗）
INSERT INTO event (
    id, name, description, banner_image_url, start_at, end_at, address
) VALUES (
    UUID(), '測試活動', NULL, 'https://example.com/banner.jpg', NOW(), NOW(), '地址'
);
-- 預期: ERROR: Column 'description' cannot be null

-- 測試：嘗試插入 NULL 值到 address（應該失敗）
INSERT INTO event (
    id, name, description, banner_image_url, start_at, end_at, address
) VALUES (
    UUID(), '測試活動', '描述', 'https://example.com/banner.jpg', NOW(), NOW(), NULL
);
-- 預期: ERROR: Column 'address' cannot be null
```

---

## 快速測試步驟

### 重要：關於認證

**這個系統不需要 `client_id` 和 `client_secret`！**

登入只需要：
- `username`（實際上是 email 地址）
- `password`

### 1. 啟動後端服務

```bash
cd backend
docker compose up backend
# 或
uvicorn app.main:app --reload --port 8003
```

### 2. 獲取超級用戶的 JWT Token

**方法 A：使用 curl**

```bash
# 使用第一個超級用戶（從 .env 文件）
curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"

# 或使用第二個超級用戶
curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SECOND_SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"
```

**回應範例：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**方法 B：在 Swagger UI 中**

1. 訪問 `http://localhost:8003/api/v1/docs`
2. 找到 `POST /api/v1/login/access-token` 端點
3. 點擊 "Try it out"
4. 輸入：
   - `username`: `<SUPERUSER_EMAIL>`（或你的超級用戶 email）
   - `password`: `<SUPERUSER_PASSWORD>`（或你的超級用戶密碼）
5. 點擊 "Execute"
6. 複製返回的 `access_token`

### 3. 在 Swagger UI 中設定認證

1. 點擊右上角的 **"Authorize"** 按鈕（鎖頭圖標）
2. 在彈出的對話框中：
   - 在 `Value` 欄位貼上你的 `access_token`
   - 點擊 **"Authorize"** 確認
   - 點擊 **"Close"** 關閉
3. 現在所有 API 請求都會自動帶上這個 token

### 4. 測試需要超級用戶權限的 API

**在 Swagger UI 中：**
- 確保已經完成步驟 3（設定認證）
- 找到 `POST /api/v1/events/` 端點
- 點擊 "Try it out"
- 輸入請求 body
- 點擊 "Execute"
- 應該會返回 200 而不是 401

**使用 curl：**

```bash
# 1. 先獲取 token（儲存到變數）
TOKEN=$(curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>" | jq -r '.access_token')

# 2. 使用 token 測試創建活動
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

### 5. 驗證當前用戶是否為超級用戶

```bash
# 使用 token 查看當前用戶資訊
curl -X POST "http://localhost:8003/api/v1/login/test-token" \
  -H "Authorization: Bearer $TOKEN"

# 回應中應該包含：
# {
#   "email": "<SUPERUSER_EMAIL>",
#   "is_superuser": true,  # 👈 這個必須是 true
#   ...
# }
```

4. **檢查資料庫**
   ```sql
   -- 查看 event 表結構
   DESCRIBE event;

   -- 查看約束
   SELECT
       COLUMN_NAME,
       IS_NULLABLE,
       COLUMN_DEFAULT
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_NAME = 'event';
   ```

---

## 常見錯誤

### 1. 422 Unprocessable Entity
- **原因**: 缺少必填欄位或欄位格式錯誤
- **解決**: 檢查請求 body，確保所有必填欄位都有值

### 2. 400 Bad Request
- **原因**: 業務邏輯驗證失敗（如付款金額錯誤）
- **解決**: 查看錯誤訊息，修正請求資料

### 3. 404 Not Found
- **原因**: 資源不存在
- **解決**: 檢查 ID 是否正確

### 4. 401 Unauthorized
- **原因**:
  - 未提供 JWT token
  - JWT token 無效或已過期
  - 用戶帳號已被停用
- **解決**:
  - 重新登入獲取 token
  - 檢查 token 是否過期
  - 確認用戶帳號為啟用狀態

### 5. 403 Forbidden
- **原因**:
  - 用戶不是超級用戶（`is_superuser = false`）
  - 權限不足
- **解決**:
  - 使用超級用戶帳號登入
  - 檢查用戶的 `is_superuser` 狀態
  - 確認端點是否需要特殊權限

---

## 相關檔案

- `backend/app/api/routes/events.py` - Event API 路由
- `backend/app/api/routes/tickets.py` - Ticket API 路由
- `backend/app/api/routes/countries.py` - Country API 路由
- `backend/sql/006_add_event_banner_image_url.sql` - SQL 遷移腳本