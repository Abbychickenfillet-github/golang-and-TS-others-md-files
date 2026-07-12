# Docker Compose 連接埠衝突故障排除

## 問題：執行 `docker compose up --build` 後連接埠亂掉

### 用戶案例：5004 連接埠亂掉

**症狀**：
- 執行 `docker compose up --build` 後，5004 連接埠出現問題
- 配置中 frontend 應該是 5003:80，但 5004 連接埠被佔用

**原因分析**：
1. 可能有其他行程佔用了 5004 連接埠
2. 舊的容器沒有完全清理
3. 可能有其他服務在 5004 連接埠運行

### 常見原因

1. **舊的容器仍在運行**
   - 之前啟動的容器沒有完全停止
   - 連接埠被舊容器佔用

2. **多個 docker-compose 文件衝突**
   - `docker-compose.override.yml` 可能覆蓋了連接埠配置
   - 多個 compose 文件同時生效

3. **系統行程佔用連接埠**
   - 其他應用程序佔用了連接埠
   - Windows 服務佔用了連接埠

## 解決方案

### 方案 1：完全清理並重啟（推薦）

```powershell
# 1. 停止所有容器
docker compose down

# 2. 清理所有停止的容器
docker container prune -f

# 3. 檢查連接埠占用
netstat -ano | findstr ":5003 :5004"

# 4. 如果有行程佔用，結束行程（替換 PID）
taskkill /PID <行程ID> /F

# 5. 重新啟動
docker compose up --build
```

### 方案 2：檢查並清理特定連接埠

```powershell
# 檢查 5003 和 5004 連接埠占用
netstat -ano | findstr ":5003 :5004"

# 查看佔用連接埠的行程
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path

# 結束行程（如果需要）
Stop-Process -Id <PID> -Force
```

### 方案 3：檢查 docker-compose 文件覆蓋

Docker Compose 會按以下順序加載文件：
1. `docker-compose.yml`
2. `docker-compose.override.yml`（如果存在）
3. 命令行指定的文件（`-f` 參數）

**檢查是否有覆蓋文件**：
```powershell
# 查看所有 compose 文件
Get-ChildItem docker-compose*.yml

# 檢查 override 文件
cat docker-compose.override.yml
```

**如果 override 文件有連接埠配置，需要調整或刪除**。

### 方案 4：使用不同的連接埠

如果連接埠被佔用且無法釋放，可以臨時修改連接埠：

```yaml
# docker-compose.yml
frontend:
  ports:
    - "5005:80"  # 改為 5005
```

## 當前配置檢查

### 標準連接埠配置

根據 `docker-compose.yml`：
- **Backend**: `8003:8000`
- **Frontend**: `5003:80`
- **Official Website**: `3000:3000`

### 驗證連接埠配置

```powershell
# 檢查配置的連接埠
docker compose config | Select-String "ports" -Context 2

# 檢查實際運行的容器連接埠
docker compose ps
```

## 常見問題

### Q1: 為什麼執行 `docker compose up --build` 後連接埠變了？

**A**: 可能的原因：
1. 有 `docker-compose.override.yml` 文件覆蓋了配置
2. 使用了 `-f` 參數指定了不同的配置文件
3. 環境變數改變了連接埠配置

### Q2: 如何確認當前使用的配置？

```powershell
# 查看最終生效的配置
docker compose config

# 查看連接埠映射
docker compose config | Select-String "ports" -Context 3
```

### Q3: 如何完全清理 Docker 環境？

```powershell
# 停止所有容器
docker compose down

# 清理所有停止的容器
docker container prune -f

# 清理未使用的網路
docker network prune -f

# 清理未使用的卷（謹慎使用）
# docker volume prune -f
```

## 快速修復命令

```powershell
# 一鍵清理並重啟
docker compose down
docker container prune -f
docker compose up --build -d

# 檢查連接埠
docker compose ps
netstat -ano | findstr ":5003 :5004 :8003"
```

## 預防措施

1. **使用 `docker compose down` 而不是 `Ctrl+C`**
   - 確保容器完全停止
   - 釋放所有連接埠

2. **檢查 override 文件**
   - 確認 `docker-compose.override.yml` 的配置
   - 避免意外的連接埠覆蓋

3. **使用環境變數管理連接埠**
   ```yaml
   ports:
     - "${FRONTEND_PORT:-5003}:80"
   ```

4. **定期清理**
   ```powershell
   # 定期清理停止的容器
   docker container prune -f
   ```
