# Docker Compose 使用指南

本文檔說明如何使用 Docker Compose 管理專案的各個服務。

## 服務概覽

專案包含以下 Docker Compose 服務：

| 服務名稱 | 功能 | 端口映射 | 依賴 |
|---------|------|---------|------|
| `prestart` | 初始化腳本（創建資料庫、superuser 等） | - | - |
| `backend` | FastAPI 後端 API 服務 | `8003:8000` | prestart |
| `frontend` | React 前端（後台管理系統） | `5003:80` | - |

**服務訪問位址**：
- 後端 API：http://localhost:8003
- API 文檔（Swagger）：http://localhost:8003/docs
- 前端管理系統：http://localhost:5003

## 常用命令

### 啟動所有服務

```bash
# 啟動所有服務並在背景運行
docker compose up -d

# 使用 watch 模式（開發模式，支持熱重載）
docker compose watch
```

### 只啟動後端服務

適用於前端本地開發（`cd frontend && npm run dev`）的場景。

```bash
# 方法 1：只啟動後端（推薦）
docker compose up -d --wait backend

# 方法 2：明確指定依賴服務
docker compose up -d prestart backend
```

**說明**：
- `-d`: 在背景執行（detached mode）
- `--wait`: 等待服務完全啟動（health check 通過）
- `backend` 會自動啟動其依賴的 `prestart` 服務

### 查看服務狀態

```bash
# 查看所有服務運行狀態
docker compose ps

# 查看詳細狀態（包含 health check）
docker compose ps -a
```

### 查看日誌

```bash
# 查看所有服務日誌
docker compose logs

# 查看特定服務日誌（即時跟蹤）
docker compose logs -f backend

# 查看最近 100 行日誌
docker compose logs --tail=100 backend

# 查看多個服務日誌
docker compose logs -f backend frontend
```

### 停止服務

```bash
# 停止所有服務（保留容器）
docker compose stop

# 停止特定服務
docker compose stop backend

# 停止並移除所有容器
docker compose down

# 停止並移除容器、網絡、volumes（完全清理）
docker compose down -v
```

### 重啟服務

```bash
# 重啟所有服務
docker compose restart

# 重啟特定服務
docker compose restart backend

# 重新構建並啟動（當 Dockerfile 或依賴改變時）
docker compose up -d --build backend
```

### 進入容器

```bash
# 進入後端容器的 bash shell
docker compose exec backend bash

# 執行單次命令
docker compose exec backend ls -la

# 執行 Python 命令
docker compose exec backend python -c "print('Hello')"
```

### 構建映像

```bash
# 構建所有服務的映像
docker compose build

# 只構建特定服務
docker compose build backend

# 強制重新構建（不使用緩存）
docker compose build --no-cache backend
```

## 開發工作流程

### 場景 1：全棧開發（使用 Docker）

```bash
# 1. 啟動所有服務
docker compose watch

# 2. 服務會自動偵測代碼變更並重載
# - backend/app 目錄變更 → 自動同步並重載
# - frontend/src 目錄變更 → 自動同步並重建
```

### 場景 2：前端本地開發 + 後端 Docker

```bash
# 1. 只啟動後端
docker compose up -d --wait backend

# 2. 在另一個終端啟動前端開發服務器
cd frontend
npm run dev
# 訪問 http://localhost:5173

# 3. 前端會通過 http://localhost:8003 調用後端 API
```

### 場景 3：後端本地開發 + 前端 Docker

```bash
# 1. 只啟動前端
docker compose up -d frontend

# 2. 在另一個終端啟動後端開發服務器
cd backend
uv sync
source .venv/bin/activate  # Windows: .venv\Scripts\activate
fastapi run --reload app/main.py

# 3. 前端會通過 http://localhost:8000 調用後端 API
```

## 測試相關

### 運行後端測試

```bash
# 方法 1：在本地運行測試
cd backend
bash ./scripts/test.sh

# 方法 2：在 Docker 容器中運行測試
docker compose up -d --wait backend
docker compose exec backend bash scripts/tests-start.sh
```

## 故障排除

### 服務無法啟動

```bash
# 查看詳細日誌
docker compose logs backend

# 檢查 health check 狀態
docker compose ps

# 重新構建並啟動
docker compose up -d --build backend
```

### 清理並重新開始

```bash
# 停止所有服務並移除所有資源
docker compose down -v

# 重新構建所有映像
docker compose build --no-cache

# 重新啟動
docker compose up -d
```

### 端口衝突

如果遇到端口被占用的錯誤，修改 `docker-compose.yml` 中的端口映射：

```yaml
backend:
  ports:
    - "8004:8000"  # 將 8003 改為其他端口
```

### 環境變數問題

```bash
# 檢查環境變數是否正確載入
docker compose config

# 確保 .env 和 .env.production 文件存在
ls -la .env*
```

## 進階使用

### 限制資源使用

編輯 `docker-compose.yml`：

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### 使用不同環境配置

```bash
# 使用 staging 環境
ENVIRONMENT=staging docker compose up -d

# 使用 production 環境
ENVIRONMENT=production docker compose up -d
```

## 相關文檔

- [API 測試指南](./2025-11-20_api-testing-guide.md)
- [Superuser 測試指南](./2025-12-19_superuser-testing-guide.md)
- [FastAPI 依賴注入基礎](./2025-11-20_fastapi-dependency-injection-and-basics.md)

## 參考資料

- [Docker Compose 官方文檔](https://docs.docker.com/compose/)
- [Docker Compose CLI 參考](https://docs.docker.com/compose/reference/)
