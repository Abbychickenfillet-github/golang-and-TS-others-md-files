# Docker 埠號衝突解決方案

## 問題說明

當 AI 啟動 Docker 容器後，這些容器會佔用特定的埠號。如果您之後想要啟動自己的 Docker 容器，可能會遇到埠號被佔用的錯誤。

### 專案使用的埠號

根據 `docker-compose.yml` 配置：

| 服務 | 主機埠號 | 容器埠號 | 用途 |
|------|---------|---------|------|
| `backend` | `8003` | `8000` | 後端 API |
| `frontend` | `5003` | `80` | 前端管理系統 |
| `official_website` | `3000` | `3000` | 官方網站 |

## 解決方案

### 方案 1：停止 AI 啟動的容器（推薦）

在啟動自己的容器之前，先停止 AI 啟動的容器：

```bash
# 查看當前運行的容器
docker compose ps

# 停止所有容器
docker compose stop

# 或者停止特定服務
docker compose stop backend frontend official_website

# 完全移除容器（包括停止的）
docker compose down
```

然後再啟動您自己的容器：

```bash
# 使用您自己的配置啟動
docker compose -f docker-compose.local.yml up -d
```

### 方案 2：使用不同的埠號配置

創建一個專門用於個人開發的 `docker-compose` 文件，使用不同的埠號：

#### 步驟 1：創建 `docker-compose.personal.yml`

```yaml
services:
  backend:
    ports:
      - "8004:8000"  # 使用 8004 而不是 8003
    # ... 其他配置繼承自 docker-compose.yml

  frontend:
    ports:
      - "5004:80"  # 使用 5004 而不是 5003
    # ... 其他配置

  official_website:
    ports:
      - "3001:3000"  # 使用 3001 而不是 3000
    # ... 其他配置
```

#### 步驟 2：使用個人配置啟動

```bash
# 使用個人配置啟動（不會與 AI 的容器衝突）
docker compose -f docker-compose.yml -f docker-compose.personal.yml up -d
```

### 方案 3：檢查並手動釋放埠號

#### Windows PowerShell 檢查埠號占用

```powershell
# 檢查特定埠號是否被占用
netstat -ano | findstr :8003
netstat -ano | findstr :5003
netstat -ano | findstr :3000

# 或使用 PowerShell 命令
Get-NetTCPConnection -LocalPort 8003
Get-NetTCPConnection -LocalPort 5003
Get-NetTCPConnection -LocalPort 3000
```

#### 查看所有 Docker 容器

```bash
# 查看所有運行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看特定專案的容器
docker compose ps
```

#### 停止佔用埠號的容器

```bash
# 停止特定容器（需要知道容器名稱或 ID）
docker stop <container_id_or_name>

# 或使用 docker compose
docker compose stop <service_name>
```

### 方案 4：使用不同的 Docker Compose 專案名稱

使用不同的專案名稱可以讓 AI 的容器和您的容器同時運行而不衝突：

```bash
# AI 啟動時使用預設專案名稱
docker compose up -d

# 您啟動時使用不同的專案名稱
docker compose -p myproject up -d
```

**注意**：雖然容器名稱不會衝突，但**埠號仍然會衝突**！您仍然需要修改埠號映射。

## 推薦工作流程

### 開發時的最佳實踐

1. **開發前檢查**：
   ```bash
   # 檢查是否有容器在運行
   docker compose ps

   # 如果有，先停止
   docker compose down
   ```

2. **啟動自己的開發環境**：
   ```bash
   # 使用本地開發配置
   docker compose -f docker-compose.local.yml up -d
   ```

3. **開發完成後清理**：
   ```bash
   # 停止並移除容器
   docker compose down
   ```

### 快速檢查腳本

創建一個 PowerShell 腳本 `check-ports.ps1`：

```powershell
# 檢查專案使用的埠號
Write-Host "檢查 Docker 埠號占用情況..." -ForegroundColor Cyan

$ports = @(8003, 5003, 3000)

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "埠號 $port 已被占用" -ForegroundColor Red
        Write-Host "  PID: $($connection.OwningProcess)" -ForegroundColor Yellow
    } else {
        Write-Host "埠號 $port 可用" -ForegroundColor Green
    }
}

# 檢查 Docker 容器
Write-Host "`n檢查 Docker 容器..." -ForegroundColor Cyan
docker compose ps
```

## 常見錯誤訊息

### 錯誤：`port is already allocated`

```
Error response from daemon: driver failed programming external connectivity
on endpoint ...: Bind for 0.0.0.0:8003 failed: port is already allocated
```

**解決方法**：
1. 停止佔用埠號的容器：`docker compose stop`
2. 或使用不同的埠號配置

### 錯誤：`address already in use`

**解決方法**：
1. 檢查是否有其他進程佔用埠號
2. 停止相關的 Docker 容器
3. 或修改埠號配置

## 總結

**最簡單的解決方案**：
1. 在啟動自己的容器前，先執行 `docker compose down` 停止 AI 的容器
2. 然後啟動您自己的容器

**如果需要同時運行**：
1. 創建個人專用的 `docker-compose.personal.yml` 文件
2. 使用不同的埠號映射
3. 使用 `-f` 參數指定配置文件
