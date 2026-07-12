# 快速修復 5004 連接埠問題

## 問題描述

執行 `docker compose up --build` 後，5004 連接埠被佔用，導致服務無法正常啟動。

## 快速解決方案

### 步驟 1：清理 Docker 環境

```powershell
# 停止所有容器
docker compose down

# 清理停止的容器
docker container prune -f
```

### 步驟 2：檢查連接埠占用

```powershell
# 檢查 5003 和 5004 連接埠
netstat -ano | findstr ":5003 :5004"
```

### 步驟 3：結束佔用 5004 的行程（如果需要）

如果 5004 連接埠被其他行程佔用：

```powershell
# 查看佔用連接埠的行程
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path

# 結束行程（替換 <PID> 為實際行程 ID）
Stop-Process -Id <PID> -Force
```

### 步驟 4：重新啟動服務

```powershell
# 重新啟動（使用 watch 模式，推薦開發時使用）
docker compose watch backend

# 或使用普通模式
docker compose up -d
```

## 驗證

```powershell
# 檢查容器狀態
docker compose ps

# 檢查連接埠映射
docker compose ps | Select-String "5003|8003|3000"
```

應該看到：
- Frontend: `0.0.0.0:5003->80/tcp`
- Backend: `0.0.0.0:8003->8000/tcp`
- Official Website: `0.0.0.0:3000->3000/tcp`

## 注意事項

1. **5004 連接埠不是 Docker Compose 配置的連接埠**
   - Frontend 配置的是 `5003:80`
   - 如果 5004 被佔用，可能是其他服務在使用

2. **如果 5004 是您需要的連接埠**
   - 檢查是否有其他配置文件使用了 5004
   - 或者修改配置使用其他連接埠

3. **推薦使用 watch 模式**
   ```powershell
   docker compose watch backend
   ```
   這樣可以自動重載程式碼變化。
