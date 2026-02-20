# 快速修复 5004 端口问题

## 问题描述

执行 `docker compose up --build` 后，5004 端口被占用，导致服务无法正常启动。

## 快速解决方案

### 步骤 1：清理 Docker 环境

```powershell
# 停止所有容器
docker compose down

# 清理停止的容器
docker container prune -f
```

### 步骤 2：检查端口占用

```powershell
# 检查 5003 和 5004 端口
netstat -ano | findstr ":5003 :5004"
```

### 步骤 3：结束占用 5004 的进程（如果需要）

如果 5004 端口被其他进程占用：

```powershell
# 查看占用端口的进程
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path

# 结束进程（替换 <PID> 为实际进程 ID）
Stop-Process -Id <PID> -Force
```

### 步骤 4：重新启动服务

```powershell
# 重新启动（使用 watch 模式，推荐开发时使用）
docker compose watch backend

# 或使用普通模式
docker compose up -d
```

## 验证

```powershell
# 检查容器状态
docker compose ps

# 检查端口映射
docker compose ps | Select-String "5003|8003|3000"
```

应该看到：
- Frontend: `0.0.0.0:5003->80/tcp`
- Backend: `0.0.0.0:8003->8000/tcp`
- Official Website: `0.0.0.0:3000->3000/tcp`

## 注意事项

1. **5004 端口不是 Docker Compose 配置的端口**
   - Frontend 配置的是 `5003:80`
   - 如果 5004 被占用，可能是其他服务在使用

2. **如果 5004 是您需要的端口**
   - 检查是否有其他配置文件使用了 5004
   - 或者修改配置使用其他端口

3. **推荐使用 watch 模式**
   ```powershell
   docker compose watch backend
   ```
   这样可以自动重载代码变化。
