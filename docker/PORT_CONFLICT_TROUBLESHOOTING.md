# Docker Compose 端口冲突故障排除

## 问题：执行 `docker compose up --build` 后端口乱掉

### 用户案例：5004 端口乱掉

**症状**：
- 执行 `docker compose up --build` 后，5004 端口出现问题
- 配置中 frontend 应该是 5003:80，但 5004 端口被占用

**原因分析**：
1. 可能有其他进程占用了 5004 端口
2. 旧的容器没有完全清理
3. 可能有其他服务在 5004 端口运行

### 常见原因

1. **旧的容器仍在运行**
   - 之前启动的容器没有完全停止
   - 端口被旧容器占用

2. **多个 docker-compose 文件冲突**
   - `docker-compose.override.yml` 可能覆盖了端口配置
   - 多个 compose 文件同时生效

3. **系统进程占用端口**
   - 其他应用程序占用了端口
   - Windows 服务占用了端口

## 解决方案

### 方案 1：完全清理并重启（推荐）

```powershell
# 1. 停止所有容器
docker compose down

# 2. 清理所有停止的容器
docker container prune -f

# 3. 检查端口占用
netstat -ano | findstr ":5003 :5004"

# 4. 如果有进程占用，结束进程（替换 PID）
taskkill /PID <进程ID> /F

# 5. 重新启动
docker compose up --build
```

### 方案 2：检查并清理特定端口

```powershell
# 检查 5003 和 5004 端口占用
netstat -ano | findstr ":5003 :5004"

# 查看占用端口的进程
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path

# 结束进程（如果需要）
Stop-Process -Id <PID> -Force
```

### 方案 3：检查 docker-compose 文件覆盖

Docker Compose 会按以下顺序加载文件：
1. `docker-compose.yml`
2. `docker-compose.override.yml`（如果存在）
3. 命令行指定的文件（`-f` 参数）

**检查是否有覆盖文件**：
```powershell
# 查看所有 compose 文件
Get-ChildItem docker-compose*.yml

# 检查 override 文件
cat docker-compose.override.yml
```

**如果 override 文件有端口配置，需要调整或删除**。

### 方案 4：使用不同的端口

如果端口被占用且无法释放，可以临时修改端口：

```yaml
# docker-compose.yml
frontend:
  ports:
    - "5005:80"  # 改为 5005
```

## 当前配置检查

### 标准端口配置

根据 `docker-compose.yml`：
- **Backend**: `8003:8000`
- **Frontend**: `5003:80`
- **Official Website**: `3000:3000`

### 验证端口配置

```powershell
# 检查配置的端口
docker compose config | Select-String "ports" -Context 2

# 检查实际运行的容器端口
docker compose ps
```

## 常见问题

### Q1: 为什么执行 `docker compose up --build` 后端口变了？

**A**: 可能的原因：
1. 有 `docker-compose.override.yml` 文件覆盖了配置
2. 使用了 `-f` 参数指定了不同的配置文件
3. 环境变量改变了端口配置

### Q2: 如何确认当前使用的配置？

```powershell
# 查看最终生效的配置
docker compose config

# 查看端口映射
docker compose config | Select-String "ports" -Context 3
```

### Q3: 如何完全清理 Docker 环境？

```powershell
# 停止所有容器
docker compose down

# 清理所有停止的容器
docker container prune -f

# 清理未使用的网络
docker network prune -f

# 清理未使用的卷（谨慎使用）
# docker volume prune -f
```

## 快速修复命令

```powershell
# 一键清理并重启
docker compose down
docker container prune -f
docker compose up --build -d

# 检查端口
docker compose ps
netstat -ano | findstr ":5003 :5004 :8003"
```

## 预防措施

1. **使用 `docker compose down` 而不是 `Ctrl+C`**
   - 确保容器完全停止
   - 释放所有端口

2. **检查 override 文件**
   - 确认 `docker-compose.override.yml` 的配置
   - 避免意外的端口覆盖

3. **使用环境变量管理端口**
   ```yaml
   ports:
     - "${FRONTEND_PORT:-5003}:80"
   ```

4. **定期清理**
   ```powershell
   # 定期清理停止的容器
   docker container prune -f
   ```
