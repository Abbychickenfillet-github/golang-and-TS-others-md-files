# Docker Compose command 配置说明
日期：2025-12-12
## 问题：为什么 command 不放在 develop 下？

### Docker Compose 配置结构限制

**Docker Compose 不支持在 `develop` 下配置 `command`**。

`develop` 部分只支持以下配置：
- `watch`: 文件监听和同步配置
- 其他开发相关的配置（但**不包括** `command`）

### 正确的配置结构

```yaml
backend:
  build:                    # ← service 级别
    context: ./backend
  command:                  # ← service 级别（必须在这里）
    - "fastapi"
    - "run"
    - "--reload"
    - "app/main.py"
  develop:                  # ← service 级别
    watch:                  # ← develop 的子项（只支持 watch 等）
      - action: sync
        path: ./backend/app
        target: /app/app
```

### 为什么这样设计？

1. **`command` 是容器启动命令**：
   - 无论是否使用 watch 模式，容器都需要启动命令
   - `command` 定义了容器启动时执行的命令

2. **`develop` 是开发模式扩展**：
   - 主要用于文件监听和同步（`watch`）
   - 不控制容器的启动命令

3. **`--reload` 的安全性**：
   - 即使不在 watch 模式下，`--reload` 也不会造成问题
   - 只是不会检测到文件变化，但服务仍可正常运行

## 解决方案：让 command 只在开发模式生效

如果您希望 `--reload` 只在开发模式下使用，有以下几种方案：

### 方案 1：使用环境变量（推荐）

```yaml
backend:
  build:
    context: ./backend
  command: >
    sh -c "
    if [ \"$$ENVIRONMENT\" = \"local\" ]; then
      fastapi run --reload app/main.py
    else
      fastapi run --workers 4 app/main.py
    fi
    "
  environment:
    - ENVIRONMENT=${ENVIRONMENT:-production}
  develop:
    watch:
      - action: sync
        path: ./backend/app
        target: /app/app
```

### 方案 2：使用不同的 compose 文件

**docker-compose.yml**（生产模式）：
```yaml
backend:
  build:
    context: ./backend
  command: ["fastapi", "run", "--workers", "4", "app/main.py"]
```

**docker-compose.local.yml**（开发模式）：
```yaml
backend:
  command: ["fastapi", "run", "--reload", "app/main.py"]
  develop:
    watch:
      - action: sync
        path: ./backend/app
        target: /app/app
```

使用方式：
```bash
# 开发模式（使用 local 配置覆盖）
docker compose -f docker-compose.yml -f docker-compose.local.yml watch backend

# 生产模式（只使用主配置）
docker compose up backend
```

### 方案 3：使用 Dockerfile 的 CMD（当前方案）

在 `Dockerfile` 中设置默认命令（生产模式）：
```dockerfile
CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
```

在 `docker-compose.yml` 中覆盖（开发模式）：
```yaml
backend:
  build:
    context: ./backend
  command: ["fastapi", "run", "--reload", "app/main.py"]  # 开发时覆盖
  develop:
    watch:
      - action: sync
        path: ./backend/app
        target: /app/app
```

## 当前配置的合理性

### 为什么当前配置是合理的？

1. **开发优先**：
   - 大多数情况下，我们都在开发模式
   - `--reload` 在开发时非常有用

2. **生产环境通常使用不同的配置**：
   - 生产环境通常使用 `docker-compose.production.yml`
   - 或通过环境变量控制

3. **`--reload` 的安全性**：
   - 即使在生产环境，`--reload` 也不会造成严重问题
   - 只是会消耗更多资源（单进程 + 文件监听）

### 检查当前配置

查看 `docker-compose.yml`：
```yaml
backend:
  command: [
    "fastapi", "run",
    "--reload",  # ← 开发模式
    "--limit-max-request-body", "52428800",
    "app/main.py"
  ]
```

这个配置：
- ✅ 在 watch 模式下会正常工作
- ✅ `--reload` 会检测文件变化
- ⚠️ 在生产环境也会使用 `--reload`（如果使用此配置）

## 推荐做法

### 开发环境（推荐当前配置）

保持当前配置，因为：
- 开发时总是使用 watch 模式
- `--reload` 提供自动重载功能
- 简单直接

### 生产环境

使用 `docker-compose.production.yml` 或环境变量：

```yaml
# docker-compose.production.yml
backend:
  command: ["fastapi", "run", "--workers", "4", "app/main.py"]
```

## 总结

1. **`command` 不能放在 `develop` 下**：Docker Compose 不支持
2. **当前配置是合理的**：开发时使用 `--reload` 是正确的
3. **如果需要区分环境**：使用不同的 compose 文件或环境变量
4. **watch 模式会正常工作**：`command` 的位置不影响 watch 功能
