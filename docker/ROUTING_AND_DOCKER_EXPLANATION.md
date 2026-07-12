# 路由路徑和 Docker Compose 使用說明

## 0. FastAPI APIRouter 詳解

### APIRouter() 是什麼？

`APIRouter()` 是由 **FastAPI 框架**提供的類，用於創建和管理路由組。

**來源**：
```python
from fastapi import APIRouter  # 從 FastAPI 框架導入
```

**官方文檔**：https://fastapi.tiangolo.com/tutorial/bigger-applications/

### api_router = APIRouter() 的作用

```python
api_router = APIRouter()
```

這行程式碼創建了一個**空的路由器實例**，用於：
1. 收集所有子路由（通過 `include_router()` 添加）
2. 組織和管理不同的路由模塊
3. 最終註冊到主 FastAPI 應用

**完整流程**：
```
路由文件（如 upload_identity_verification.py）
  ↓ 創建 router = APIRouter()
  ↓ 定義路由 @router.get("/")
  ↓
backend/app/api/main.py
  ↓ api_router.include_router(子路由器, prefix="...", tags=["..."])
  ↓
backend/app/main.py
  ↓ app.include_router(api_router, prefix="/api/v1")
  ↓
最終路徑：/api/v1/identity-verification/
```

### include_router() 方法詳解

**語法**：
```python
api_router.include_router(
    子路由器,           # 第一個參數：要註冊的路由器實例
    prefix="路徑前綴",  # 第二個參數：API URL 路徑前綴
    tags=["標籤名稱"]   # 第三個參數：Swagger UI 中的分類標籤
)
```

#### 1. 第一個參數：子路由器
- **說明**：從路由模塊導入的路由器實例
- **示例**：`upload_identity_verification.router`
- **來源**：每個路由文件（如 `upload_identity_verification.py`）都會創建自己的 `router = APIRouter()`
- **包含內容**：該模塊中定義的所有路由端點（`@router.get`, `@router.post` 等）

#### 2. prefix：路徑前綴
- **說明**：這是**後端 API 的 URL 路徑前綴**
- **作用**：所有該路由器的端點都會添加此前綴
- **最終路徑構成**：
  ```
  完整路徑 = settings.API_V1_STR + prefix + 路由函數中的路徑
  例如：/api/v1 + /identity-verification + / = /api/v1/identity-verification/
  ```
- **示例**：
  ```python
  prefix="/identity-verification"
  # 如果路由函數是 @router.get("/")
  # 最終路徑是：/api/v1/identity-verification/
  ```

#### 3. tags：標籤
- **說明**：用於在 **Swagger UI 文檔**中分組顯示 API
- **訪問地址**：
  - Swagger UI：`http://localhost:8003/docs`
  - ReDoc：`http://localhost:8003/redoc`
- **作用**：
  - `tags` 中的名稱會顯示在 Swagger UI 的**左側分類**中
  - 用於組織和分類 API 端點
  - 可以設置多個標籤，例如：`tags=["identity-verification", "verification"]`
- **修改後生效**：
  - ✅ 如果使用 `--reload` 模式（開發環境），修改 tags 會**立即生效**
  - ✅ 無需重啟服務，FastAPI 會自動重新加載
  - ⚠️ 生產環境需要重啟服務

### 完整示例

```python
# 在 upload_identity_verification.py 中
router = APIRouter()

@router.get("/")
def read_verifications(...):
    """獲取驗證列表"""
    pass

# 在 backend/app/api/main.py 中
api_router.include_router(
    upload_identity_verification.router,  # 子路由器
    prefix="/identity-verification",       # API 路徑前綴
    tags=["identity-verification"]         # Swagger UI 分類名稱
)

# 在 backend/app/main.py 中
app.include_router(api_router, prefix=settings.API_V1_STR)  # /api/v1

# 最終結果：
# - API 路徑：/api/v1/identity-verification/
# - Swagger UI 中顯示在 "identity-verification" 分類下
```

### 路徑構成總結

```
完整 API 路徑 = API_V1_STR + prefix + 路由函數路徑

示例：
- API_V1_STR = "/api/v1"（在 settings 中定義）
- prefix = "/identity-verification"
- 路由函數路徑 = "/"
- 最終路徑 = /api/v1/identity-verification/

另一個示例：
- API_V1_STR = "/api/v1"
- prefix = "/users"
- 路由函數路徑 = "/{user_id}"
- 最終路徑 = /api/v1/users/{user_id}
```

## 1. Company-Verification 路由路徑檢查

### 當前狀態
- **程式碼中的路徑**：`/api/v1/company-verifications`（複數）
- **註冊位置**：`backend/app/api/main.py:50`
  ```python
  api_router.include_router(
      upload_company_verifications.router,
      prefix="/company-verifications",
      tags=["company-verifications"]
  )
  ```

### 問題
如果您的 OpenAPI 文檔或前端顯示的是 `/company-verification`（單數），這會導致路由不匹配。

### 解決方案
**選項1：保持使用複數（推薦）**
- 保持程式碼中的 `/company-verifications`（複數）
- 這是 RESTful API 的最佳實踐（資源集合使用複數）

**選項2：改為單數**
- 如果必須使用單數，需要修改 `backend/app/api/main.py:50`：
  ```python
  api_router.include_router(
      upload_company_verifications.router,
      prefix="/company-verification",  # 改為單數
      tags=["company-verification"]
  )
  ```

### 檢查所有路由文件
根據 FastAPI 的命名規範，每個路由文件應該對應一個資源：

| 路由文件 | 註冊路徑 | 狀態 |
|---------|---------|------|
| `upload_company_verifications.py` | `/company-verifications` | ✅ 正確（複數） |
| `upload_identity_verification.py` | `/identity-verification` | ✅ 正確（單數，因為是單個資源） |
| `companies.py` | `/companies` | ✅ 正確（複數） |
| `members.py` | `/members` | ✅ 正確（複數） |

## 2. localhost:8003 的大物件（大文件上傳）問題

### 連接埠說明
- **8003** 是後端 API 的連接埠（映射到容器內的 8000）
- 配置位置：`docker-compose.yml:40`
  ```yaml
  ports:
    - "8003:8000"
  ```

### 當前文件大小限制
1. **應用層限制**：
   - 預設：5MB（`backend/app/services/image_service.py:34`）
   - 部分前端組件：10MB（`frontend/src/components/Common/ImageDropzone.tsx:36`）

2. **FastAPI/Uvicorn 限制**：
   - 當前未明確配置
   - Uvicorn 預設限制：**1MB**（這可能是問題所在！）

### 解決方案：增加大文件上傳支持

#### 方法1：在 FastAPI 啟動時配置 Uvicorn
修改 `backend/app/main.py` 或啟動命令：

```python
# 在 main.py 中添加
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        limit_max_requests=1000,
        limit_concurrency=100,
        # 增加請求體大小限制到 50MB
        limit_max_request_body=50 * 1024 * 1024,  # 50MB
    )
```

#### 方法2：在 docker-compose.yml 中配置
修改 `docker-compose.yml:80`：

```yaml
command: [
    "fastapi", "run",
    "--reload",
    "--limit-max-request-body", "52428800",  # 50MB
    "app/main.py"
]
```

#### 方法3：使用環境變數
在 `docker-compose.yml` 的環境變數中添加：

```yaml
environment:
  - UVICORN_LIMIT_MAX_REQUEST_BODY=52428800  # 50MB
```

### 推薦配置
- **圖片上傳**：10-20MB（足夠大多數圖片）
- **文檔上傳**：50MB（用於 PDF、Word 等）
- **影片上傳**：100MB+（如果需要）

## 3. Docker Compose Restart vs Watch 詳解

### 關鍵概念

#### `restart: always`（容器重啟策略）
- **位置**：`docker-compose.yml:38`
- **作用**：當容器異常退出時，Docker 會自動重啟容器
- **使用場景**：生產環境，確保服務高可用
- **不適用於**：開發環境（因為會干擾除錯）

#### `docker compose watch`（開發模式）
- **作用**：監聽文件變化，自動同步到容器並重啟服務
- **配置位置**：`docker-compose.yml:81-93` 的 `develop.watch` 部分
- **使用場景**：開發環境，實現熱重載

#### `docker compose restart`（手動重啟）
- **作用**：重啟正在運行的服務
- **前提**：服務必須已經在運行
- **不會**：重新構建映像檔或啟動已停止的服務

### 命令對比

| 命令 | 作用 | 前提條件 | 使用場景 |
|------|------|---------|---------|
| `docker compose up` | 啟動服務 | 無 | 首次啟動或完全停止後 |
| `docker compose up --watch` | 啟動並監聽文件變化 | 無 | 開發環境，需要熱重載 |
| `docker compose restart backend` | 重啟服務 | 服務必須正在運行 | 配置更改後快速重啟 |
| `docker compose stop backend` | 停止服務 | 服務必須正在運行 | 臨時停止服務 |
| `docker compose down backend` | 停止並刪除容器 | 無 | 完全清理服務 |
| `docker compose start backend` | 啟動已停止的服務 | 服務必須已存在但已停止 | 恢復已停止的服務 |

### 常見場景

#### 場景1：開發時啟動服務
```bash
# 啟動並監聽文件變化（推薦用於開發）
docker compose --watch up backend

# 或者使用簡寫
docker compose watch backend
```

#### 場景2：服務已運行，需要重啟
```bash
# 如果服務正在運行，使用 restart
docker compose restart backend

# 如果服務已停止，使用 start
docker compose start backend
```

#### 場景3：服務完全停止後重新啟動
```bash
# 如果使用 down 停止了服務
docker compose down backend

# 需要重新啟動（會重新創建容器）
docker compose up backend

# 或者使用 watch 模式
docker compose watch backend
```

#### 場景4：配置更改後
```bash
# 如果只是環境變數或配置更改
docker compose restart backend

# 如果需要重新構建映像檔
docker compose up --build backend
```

### 重要提示

1. **`restart` 和 `watch` 的區別**：
   - `restart` 是容器重啟策略（自動重啟）
   - `watch` 是開發工具（文件監聽和熱重載）
   - 兩者可以同時使用

2. **`docker compose down` 後的恢復**：
   - `down` 會刪除容器
   - 之後需要使用 `up` 或 `watch` 重新創建
   - `restart` 無法恢復已刪除的容器

3. **開發環境推薦**：
   ```bash
   # 首次啟動
   docker compose watch backend

   # 如果服務已運行，只需重啟
   docker compose restart backend
   ```

4. **生產環境推薦**：
   ```bash
   # 使用 restart: always，無需手動重啟
   # 如果需要手動重啟
   docker compose restart backend
   ```

## 4. 檢查清單

### 路由路徑檢查
- [ ] 確認所有路由文件名稱與註冊路徑一致
- [ ] 檢查 OpenAPI 文檔中的路徑是否正確
- [ ] 確認前端調用的路徑與後端一致

### 大文件上傳檢查
- [ ] 檢查 Uvicorn 的請求體大小限制
- [ ] 確認應用層的文件大小限制
- [ ] 測試大文件上傳功能

### Docker Compose 使用檢查
- [ ] 確認開發環境使用 `watch` 模式
- [ ] 確認生產環境使用 `restart: always`
- [ ] 瞭解各命令的使用場景
