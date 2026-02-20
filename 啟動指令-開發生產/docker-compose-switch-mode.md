# Docker Compose 環境切換指南

## 環境變數載入原理

docker-compose.yml 中的設定：
```yaml
env_file:
  - .env
  - .env.${ENVIRONMENT:-production}
```

這表示會載入：
1. `.env`（基本設定）
2. `.env.${ENVIRONMENT}`（依據 ENVIRONMENT 變數決定）

---

## 切換環境的方法

### 方法 1：修改 `.env` 檔案（永久）

```env
# .env 第 10 行
ENVIRONMENT=development   # 開發環境
ENVIRONMENT=staging       # 測試環境
ENVIRONMENT=production    # 生產環境
```

### 方法 2：指令覆蓋（臨時）

```bash
# Windows PowerShell
$env:ENVIRONMENT="development"; docker compose watch backend

# Windows CMD
set ENVIRONMENT=development && docker compose watch backend

# Linux/Mac
ENVIRONMENT=development docker compose watch backend
```

### 方法 3：使用 --env-file 指定

```bash
docker compose --env-file .env.development up
docker compose --env-file .env.staging up
docker compose --env-file .env.production up
```

---

## 環境對照表

| ENVIRONMENT | 載入檔案 | 資料庫 | 用途 |
|-------------|---------|--------|------|
| `development` | `.env` + `.env.development` | `future_sign_stage` | 本地開發 |
| `staging` | `.env` + `.env.staging` | `future_sign_stage` | 測試環境 |
| `production` | `.env` + `.env.production` | `future_sign_prod` | 生產環境 |

---

## 常用啟動指令

### 開發模式（Hot Reload）

```bash
# Python 後端
docker compose watch backend

# Go 後端
docker compose watch backend-go

# 前端
docker compose watch frontend
```

### 一般啟動

```bash
# 啟動單一服務
docker compose up backend
docker compose up backend-go
docker compose up frontend

# 啟動多個服務
docker compose up backend frontend redis

# 背景執行
docker compose up -d backend
```

### 強制重新建置

```bash
docker compose up --build backend
docker compose up --build backend-go
```

### 停止服務

```bash
# 停止特定服務
docker compose stop backend

# 停止並移除容器
docker compose down

# 停止並移除容器 + volumes
docker compose down -v
```

---

## 指令差異比較

| 指令 | Hot Reload | 說明 |
|------|------------|------|
| `docker compose up` | ❌ | 一般啟動 |
| `docker compose up --build` | ❌ | 強制重新 build |
| `docker compose watch` | ✅ | 開發模式，檔案變更自動重載 |

---

## Port 對照

| 服務 | Port |
|------|------|
| Python backend | `localhost:8004` |
| Go backend | `localhost:8003` |
| Frontend | `localhost:5005` |
| Official Website | `localhost:3004` |
| Redis | `localhost:6382` |

---

## 完整開發環境啟動範例

```bash
# 使用 staging 資料庫，啟動 Go 後端 + 前端
ENVIRONMENT=staging docker compose watch backend-go frontend

# 使用 development 設定
ENVIRONMENT=development docker compose watch backend-go
```
