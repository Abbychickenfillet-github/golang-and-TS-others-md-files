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

1. **啟動後端服務**
   ```bash
   cd backend
   docker compose up backend
   # 或
   uvicorn app.main:app --reload --port 8003
   ```

2. **獲取 JWT Token**
   ```bash
   curl -X POST "http://localhost:8003/api/v1/login/access-token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin@example.com&password=your_password"
   ```

3. **測試 API**
   - 使用 Swagger UI: `http://localhost:8003/api/v1/docs`
   - 或使用上面的 curl 命令

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
- **原因**: 未提供或無效的 JWT token
- **解決**: 重新登入獲取 token

---

## 相關檔案

- `backend/app/api/routes/events.py` - Event API 路由
- `backend/app/api/routes/tickets.py` - Ticket API 路由
- `backend/app/api/routes/countries.py` - Country API 路由
- `backend/sql/006_add_event_banner_image_url.sql` - SQL 遷移腳本