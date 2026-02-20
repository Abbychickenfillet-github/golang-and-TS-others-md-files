# curl 命令和錯誤訊息解釋

**日期**: 2025-11-20
**主題**: curl 命令使用、錯誤訊息解析、FastAPI 驗證原理

---

## 你的錯誤訊息解析

### 你執行的命令

```powershell
curl -X POST "http://localhost:8003/api/v1/login/access-token"
```

### 錯誤回應

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "username"],
      "msg": "Field required",
      "input": null
    },
    {
      "type": "missing",
      "loc": ["body", "password"],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

### 錯誤訊息解釋

這是 **FastAPI/Pydantic 的驗證錯誤格式**：

| 欄位 | 意思 | 說明 |
|------|------|------|
| `detail` | 錯誤詳情 | 包含所有驗證錯誤的陣列 |
| `type` | 錯誤類型 | `"missing"` = 缺少必填欄位 |
| `loc` | 錯誤位置 | `["body", "username"]` = 在請求 body 中的 `username` 欄位 |
| `msg` | 錯誤訊息 | `"Field required"` = 此欄位為必填 |
| `input` | 輸入值 | `null` = 沒有提供值 |

**簡單來說：**
- `loc: ["body", "username"]` = 在請求 body 中缺少 `username` 欄位
- `loc: ["body", "password"]` = 在請求 body 中缺少 `password` 欄位

---

## 為什麼會這樣？

### FastAPI 的驗證機制

1. **端點定義**：
   ```python
   @router.post("/login/access-token")
   def login_access_token(
       session: SessionDep,
       form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
   ) -> Token:
   ```

2. **OAuth2PasswordRequestForm 要求**：
   - `username`（必填）
   - `password`（必填）
   - `client_id`（可選，未使用）
   - `client_secret`（可選，未使用）

3. **當你沒有提供參數時**：
   - FastAPI 會自動驗證請求
   - 發現缺少必填欄位
   - 返回 422 錯誤（Unprocessable Entity）
   - 使用 Pydantic 的標準錯誤格式

---

## 正確的命令

### Windows PowerShell

```powershell
# 方法 1：使用反引號
curl.exe -X POST "http://localhost:8003/api/v1/login/access-token" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"

# 方法 2：使用單行（不換行）我才推薦這個咧
curl.exe -X POST "http://localhost:8003/api/v1/login/access-token" -H "Content-Type: application/x-www-form-urlencoded" -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"

# 方法 3：使用 Invoke-WebRequest（PowerShell 原生）
$body = @{
    username = "<SUPERUSER_EMAIL>"
    password = "<SUPERUSER_PASSWORD>"
}
$response = Invoke-WebRequest -Uri "http://localhost:8003/api/v1/login/access-token" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
$response.Content
```

### Linux/Mac/Git Bash

```bash
curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"
```

---

## 命令參數解釋

### `-X POST`
- 指定 HTTP 方法為 POST

### `-H "Content-Type: application/x-www-form-urlencoded"`
- 設定 HTTP Header
- `Content-Type` 告訴伺服器：我送的是表單資料（不是 JSON）
- **必須設定**，因為 `OAuth2PasswordRequestForm` 需要這種格式

### `-d "username=...&password=..."`
- `-d` = `--data`，傳送資料
- 格式：`key1=value1&key2=value2`（URL 編碼格式）
- 這是表單資料的標準格式

---

## 預期的成功回應

### 正確的命令執行後

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "token_type": "bearer"
}
```

### 回應格式說明

| 欄位 | 說明 |
|------|------|
| `access_token` | JWT 令牌，用於後續 API 認證 |
| `token_type` | 令牌類型，固定為 `"bearer"` |

---

## 常見錯誤和解決方法

### 錯誤 1：缺少參數

**錯誤訊息：**
```json
{"detail": [{"type": "missing", "loc": ["body", "username"], ...}]}
```

**原因：** 沒有使用 `-d` 參數傳送資料

**解決：** 加上 `-d "username=...&password=..."`

### 錯誤 2：Content-Type 錯誤

**錯誤訊息：**
```json
{"detail": [{"type": "string_type", "loc": ["body", "username"], ...}]}
```

**原因：** 沒有設定正確的 `Content-Type`

**解決：** 加上 `-H "Content-Type: application/x-www-form-urlencoded"`

### 錯誤 3：認證失敗

**錯誤訊息：**
```json
{"detail": "Incorrect email or password"}
```

**原因：** Email 或密碼錯誤

**解決：** 檢查 `.env` 文件中的 `FIRST_SUPERUSER` 和 `FIRST_SUPERUSER_PASSWORD`

---

## 完整測試流程

### 步驟 1：登入獲取 token

```powershell
# PowerShell
$loginResponse = Invoke-WebRequest -Uri "http://localhost:8003/api/v1/login/access-token" `
  -Method POST `
  -Body @{
    username = "<SUPERUSER_EMAIL>"
    password = "<SUPERUSER_PASSWORD>"
  } `
  -ContentType "application/x-www-form-urlencoded"

$tokenData = $loginResponse.Content | ConvertFrom-Json
$token = $tokenData.access_token
Write-Host "Token: $token"
```

### 步驟 2：使用 token 測試 API

```powershell
# 測試創建活動
$eventBody = @{
    name = "2024 年度展覽"
    description = "這是一個測試活動"
    banner_image_url = "https://example.com/banner.jpg"
    start_at = "2024-12-25T10:00:00Z"
    end_at = "2024-12-25T18:00:00Z"
    address = "台北市信義區信義路五段7號"
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $token"
    ContentType = "application/json"
}

$response = Invoke-WebRequest -Uri "http://localhost:8003/api/v1/events/" `
  -Method POST `
  -Headers $headers `
  -Body $eventBody

$response.Content
```

---

## 原理說明

### 1. OAuth2PasswordRequestForm 的工作原理

```python
from fastapi.security import OAuth2PasswordRequestForm

# OAuth2PasswordRequestForm 會：
# 1. 自動從請求 body 中讀取表單資料
# 2. 驗證必填欄位（username, password）
# 3. 如果缺少欄位，返回 Pydantic 驗證錯誤
```

### 2. FastAPI 的驗證流程

```
請求 → FastAPI 接收 → Pydantic 驗證 → 業務邏輯 → 回應
         ↓
    如果驗證失敗
         ↓
    返回 422 錯誤 + 詳細錯誤訊息
```

### 3. 錯誤格式的來源

- **Pydantic**：Python 的資料驗證庫
- **標準格式**：`{"detail": [{"type": "...", "loc": [...], "msg": "..."}]}`
- **用途**：讓前端可以精確知道哪個欄位有問題

---

## 常見問答（Q&A）

### Q1. 為什麼在 PowerShell 中要用 `curl.exe` 開頭？

在 Windows PowerShell 裡，`curl` 其實是 `Invoke-WebRequest` 的別名，它不會像真正的 cURL 那樣接受 `-X`、`-H`、`-d` 等參數。因此我們必須呼叫真正的執行檔 `curl.exe`，才能取得與 Linux/macOS 相同的行為。

### Q2. Docker Console／後端日誌在哪裡看？

如果你是從專案根目錄執行 `docker compose up --build`，所有服務的日誌會混在同一個終端機中。要單獨看後端日誌可以：

```bash
# 僅查看後端服務最新日誌
docker compose logs backend

# 持續追蹤後端日誌
docker compose logs backend -f

# 以背景模式啟動後再查看
docker compose up -d backend
docker compose logs backend -f
```

也可以在 VS Code / Docker Desktop 的「Containers」視窗中，選擇後端容器並點擊「Logs」查看實時輸出。

---

## 快速參考

### 正確的 curl 命令（Windows PowerShell）

```powershell
# 登入
curl.exe -X POST "http://localhost:8003/api/v1/login/access-token" -H "Content-Type: application/x-www-form-urlencoded" -d "username=<SUPERUSER_EMAIL>&password=<SUPERUSER_PASSWORD>"

# 創建活動（需要先獲取 token）
curl.exe -X POST "http://localhost:8003/api/v1/events/" -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d "{\"name\":\"測試活動\",\"description\":\"描述\",\"banner_image_url\":\"https://example.com/banner.jpg\",\"start_at\":\"2024-12-25T10:00:00Z\",\"end_at\":\"2024-12-25T18:00:00Z\",\"address\":\"地址\"}"
```

### 使用 PowerShell 的 Invoke-WebRequest（更簡單）

```powershell
# 登入
$body = @{username="<SUPERUSER_EMAIL>"; password="<SUPERUSER_PASSWORD>"}
$response = Invoke-WebRequest -Uri "http://localhost:8003/api/v1/login/access-token" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
$token = ($response.Content | ConvertFrom-Json).access_token

# 創建活動
$eventBody = @{
    name = "2024 年度展覽"
    description = "這是一個測試活動"
    banner_image_url = "https://example.com/banner.jpg"
    start_at = "2024-12-25T10:00:00Z"
    end_at = "2024-12-25T18:00:00Z"
    address = "台北市信義區信義路五段7號"
} | ConvertTo-Json

$headers = @{Authorization="Bearer $token"}
Invoke-WebRequest -Uri "http://localhost:8003/api/v1/events/" -Method POST -Headers $headers -Body $eventBody -ContentType "application/json"
```
