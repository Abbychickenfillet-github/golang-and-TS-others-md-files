# 檢查後端狀態

## 快速檢查後端是否運行

### 方法 1: 檢查端口占用
```bash
# Windows PowerShell
netstat -ano | findstr :8003

# 或使用
Get-NetTCPConnection -LocalPort 8003
```

### 方法 2: 直接測試 API
```bash
# 在瀏覽器或終端
curl http://localhost:8003/api/v1/companies/?skip=0&limit=1
```

### 方法 3: 檢查 Docker 容器
```bash
# 查看運行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a
```

## 常見問題

### 問題 1: 兩個後端同時運行
**症狀：**
- 端口被占用
- 請求失敗或回應不一致

**解決方法：**
1. 停止所有後端：
   ```bash
   # 停止 watch backend（Ctrl+C）
   # 停止 Docker
   docker compose down
   ```

2. 只運行一個：
   - **開發模式**：使用 `watch backend` 或 `uvicorn app.main:app --reload`
   - **Docker 模式**：使用 `docker compose up`

### 問題 2: Docker 容器沒有正確啟動
**檢查：**
```bash
# 查看容器 logs
docker compose logs backend

# 查看容器狀態
docker compose ps
```

### 問題 3: 環境變數不一致
**檢查：**
- `.env` 文件中的 `PORT` 設定
- `docker-compose.yml` 中的端口映射
- 確保都是 8003

## 建議的工作流程

### 開發時（使用 watch backend）
```bash
# 1. 確保 Docker 已停止
docker compose down

# 2. 啟動開發模式
# 在 backend 目錄
uvicorn app.main:app --reload --port 8003
# 或使用你的 watch 腳本
```

### 測試 Docker 時
```bash
# 1. 停止開發模式（Ctrl+C）

# 2. 啟動 Docker
docker compose up --build

# 3. 測試完成後停止
docker compose down
```

### 同時運行（不推薦）
如果必須同時運行，需要：
- 開發模式使用 8003
- Docker 使用其他端口（如 8004）
- 修改前端 `VITE_API_URL` 指向正確的端口
