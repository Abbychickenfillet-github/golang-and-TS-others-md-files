# Docker Compose Watch 和 --reload 故障排除

## 问题：修改 tags 后 /8003/docs 没有更新

### 原因分析

1. **为什么 command 不能放在 develop 下？**
   - ❌ **Docker Compose 不支持在 `develop` 下配置 `command`**
   - `develop` 只支持特定的配置项（主要是 `watch`）
   - `command` 必须是 service 级别的配置（与 `build`、`ports` 同级）

2. **当前配置的说明**：
   - `command` 放在 `build` 之后是正确的 ✅
   - `command` 和 `build` 是**同级**配置（都是 service 级别的）
   - 即使不在 watch 模式下，`--reload` 也不会造成问题（只是不会检测到文件变化）

2. **watch 可能没有生效的原因**：
   - ❌ 使用了 `docker compose up` 而不是 `docker compose watch`
   - ❌ watch 的 sync 没有正确同步文件到容器
   - ❌ FastAPI 的 `--reload` 没有检测到文件变化
   - ❌ 浏览器缓存了旧的 Swagger UI

### 解决方案

#### 方案 1：确认使用 watch 模式（推荐）

```bash
# 停止当前服务
docker compose down backend

# 使用 watch 模式启动
docker compose watch backend
```

**关键点**：
- ✅ 必须使用 `docker compose watch` 而不是 `docker compose up`
- ✅ watch 模式会监听文件变化并同步到容器
- ✅ `--reload` 会检测到文件变化并自动重启

#### 方案 2：手动重启服务

如果已经使用了 watch 模式，但修改没有生效：

```bash
# 重启服务
docker compose restart backend

# 或者完全重启
docker compose down backend
docker compose watch backend
```

#### 方案 3：清除浏览器缓存

Swagger UI 可能缓存了旧的 OpenAPI 文档：

1. 按 `Ctrl + Shift + R`（硬刷新）
2. 或按 `F12` 打开开发者工具，右键刷新按钮选择"清空缓存并硬性重新加载"
3. 或访问 `http://localhost:8003/docs?nocache=1`

#### 方案 4：检查文件是否同步到容器

```bash
# 进入容器检查文件
docker compose exec backend cat /app/app/api/main.py | grep -A 2 "company-verifications"
```

如果文件没有更新，说明 watch 的 sync 没有工作。

### 验证 watch 是否在工作

#### 检查 1：查看容器命令

```bash
docker compose ps backend
```

应该看到命令包含 `--reload`：
```
COMMAND: "fastapi run --reloa…"
```

#### 检查 2：查看日志

```bash
docker compose logs backend -f
```

修改文件后，应该看到类似这样的日志：
```
INFO:     Detected file change in 'app/api/main.py'. Reloading...
INFO:     Application startup complete.
```

#### 检查 3：测试文件同步

1. 修改 `backend/app/api/main.py` 中的 tags
2. 等待几秒钟
3. 检查容器内的文件：
   ```bash
   docker compose exec backend cat /app/app/api/main.py | grep tags
   ```

### 常见问题

#### Q1: command 在 build 之后，watch 会生效吗？

**A: 会的！**
- `command` 和 `build` 是同级配置
- `command` 定义容器启动时执行的命令
- `develop.watch` 定义文件监听和同步规则
- 两者是独立的配置，互不影响

#### Q2: 为什么 command 不放在 develop 下？

**A: Docker Compose 不支持！**
- `develop` 只支持 `watch` 等特定配置
- `command` 必须是 service 级别的配置
- 详细说明请参考：[DOCKER_COMPOSE_COMMAND_EXPLANATION.md](./DOCKER_COMPOSE_COMMAND_EXPLANATION.md)

#### Q2: 为什么修改 tags 后没有变化？

**可能原因**：
1. 没有使用 `docker compose watch`
2. 浏览器缓存了旧的文档
3. FastAPI 的 `--reload` 没有检测到变化（需要重启）

#### Q3: 如何确认 --reload 正在工作？

查看日志，应该看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [1] using WatchFiles
```

如果看到 `Started reloader process`，说明 `--reload` 正在工作。

### 正确的开发流程

```bash
# 1. 启动 watch 模式
docker compose watch backend

# 2. 修改代码（例如：修改 tags）
# 编辑 backend/app/api/main.py

# 3. 等待自动重载（通常 1-3 秒）
# 查看日志确认重载：
docker compose logs backend -f

# 4. 刷新浏览器（硬刷新：Ctrl + Shift + R）
# 访问 http://localhost:8003/docs
```

### 配置检查清单

- [ ] `docker-compose.yml` 中的 `command` 包含 `--reload`
- [ ] `docker-compose.yml` 中有 `develop.watch` 配置
- [ ] 使用 `docker compose watch` 而不是 `docker compose up`
- [ ] 文件路径在 `watch` 的 `path` 配置中
- [ ] 浏览器已清除缓存或硬刷新

### 快速修复命令

```bash
# 完全重启并启用 watch
docker compose down backend
docker compose watch backend

# 在另一个终端查看日志
docker compose logs backend -f
```
