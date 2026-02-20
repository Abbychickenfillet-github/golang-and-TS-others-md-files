# 路由路径和 Docker Compose 使用说明

## 0. FastAPI APIRouter 详解

### APIRouter() 是什么？

`APIRouter()` 是由 **FastAPI 框架**提供的类，用于创建和管理路由组。

**来源**：
```python
from fastapi import APIRouter  # 从 FastAPI 框架导入
```

**官方文档**：https://fastapi.tiangolo.com/tutorial/bigger-applications/

### api_router = APIRouter() 的作用

```python
api_router = APIRouter()
```

这行代码创建了一个**空的路由器实例**，用于：
1. 收集所有子路由（通过 `include_router()` 添加）
2. 组织和管理不同的路由模块
3. 最终注册到主 FastAPI 应用

**完整流程**：
```
路由文件（如 upload_identity_verification.py）
  ↓ 创建 router = APIRouter()
  ↓ 定义路由 @router.get("/")
  ↓
backend/app/api/main.py
  ↓ api_router.include_router(子路由器, prefix="...", tags=["..."])
  ↓
backend/app/main.py
  ↓ app.include_router(api_router, prefix="/api/v1")
  ↓
最终路径：/api/v1/identity-verification/
```

### include_router() 方法详解

**语法**：
```python
api_router.include_router(
    子路由器,           # 第一个参数：要注册的路由器实例
    prefix="路径前缀",  # 第二个参数：API URL 路径前缀
    tags=["标签名称"]   # 第三个参数：Swagger UI 中的分类标签
)
```

#### 1. 第一个参数：子路由器
- **说明**：从路由模块导入的路由器实例
- **示例**：`upload_identity_verification.router`
- **来源**：每个路由文件（如 `upload_identity_verification.py`）都会创建自己的 `router = APIRouter()`
- **包含内容**：该模块中定义的所有路由端点（`@router.get`, `@router.post` 等）

#### 2. prefix：路径前缀
- **说明**：这是**后端 API 的 URL 路径前缀**
- **作用**：所有该路由器的端点都会添加此前缀
- **最终路径构成**：
  ```
  完整路径 = settings.API_V1_STR + prefix + 路由函数中的路径
  例如：/api/v1 + /identity-verification + / = /api/v1/identity-verification/
  ```
- **示例**：
  ```python
  prefix="/identity-verification"
  # 如果路由函数是 @router.get("/")
  # 最终路径是：/api/v1/identity-verification/
  ```

#### 3. tags：标签
- **说明**：用于在 **Swagger UI 文档**中分组显示 API
- **访问地址**：
  - Swagger UI：`http://localhost:8003/docs`
  - ReDoc：`http://localhost:8003/redoc`
- **作用**：
  - `tags` 中的名称会显示在 Swagger UI 的**左侧分类**中
  - 用于组织和分类 API 端点
  - 可以设置多个标签，例如：`tags=["identity-verification", "verification"]`
- **修改后生效**：
  - ✅ 如果使用 `--reload` 模式（开发环境），修改 tags 会**立即生效**
  - ✅ 无需重启服务，FastAPI 会自动重新加载
  - ⚠️ 生产环境需要重启服务

### 完整示例

```python
# 在 upload_identity_verification.py 中
router = APIRouter()

@router.get("/")
def read_verifications(...):
    """获取验证列表"""
    pass

# 在 backend/app/api/main.py 中
api_router.include_router(
    upload_identity_verification.router,  # 子路由器
    prefix="/identity-verification",       # API 路径前缀
    tags=["identity-verification"]         # Swagger UI 分类名称
)

# 在 backend/app/main.py 中
app.include_router(api_router, prefix=settings.API_V1_STR)  # /api/v1

# 最终结果：
# - API 路径：/api/v1/identity-verification/
# - Swagger UI 中显示在 "identity-verification" 分类下
```

### 路径构成总结

```
完整 API 路径 = API_V1_STR + prefix + 路由函数路径

示例：
- API_V1_STR = "/api/v1"（在 settings 中定义）
- prefix = "/identity-verification"
- 路由函数路径 = "/"
- 最终路径 = /api/v1/identity-verification/

另一个示例：
- API_V1_STR = "/api/v1"
- prefix = "/users"
- 路由函数路径 = "/{user_id}"
- 最终路径 = /api/v1/users/{user_id}
```

## 1. Company-Verification 路由路径检查

### 当前状态
- **代码中的路径**：`/api/v1/company-verifications`（复数）
- **注册位置**：`backend/app/api/main.py:50`
  ```python
  api_router.include_router(
      upload_company_verifications.router,
      prefix="/company-verifications",
      tags=["company-verifications"]
  )
  ```

### 问题
如果您的 OpenAPI 文档或前端显示的是 `/company-verification`（单数），这会导致路由不匹配。

### 解决方案
**选项1：保持使用复数（推荐）**
- 保持代码中的 `/company-verifications`（复数）
- 这是 RESTful API 的最佳实践（资源集合使用复数）

**选项2：改为单数**
- 如果必须使用单数，需要修改 `backend/app/api/main.py:50`：
  ```python
  api_router.include_router(
      upload_company_verifications.router,
      prefix="/company-verification",  # 改为单数
      tags=["company-verification"]
  )
  ```

### 检查所有路由文件
根据 FastAPI 的命名规范，每个路由文件应该对应一个资源：

| 路由文件 | 注册路径 | 状态 |
|---------|---------|------|
| `upload_company_verifications.py` | `/company-verifications` | ✅ 正确（复数） |
| `upload_identity_verification.py` | `/identity-verification` | ✅ 正确（单数，因为是单个资源） |
| `companies.py` | `/companies` | ✅ 正确（复数） |
| `members.py` | `/members` | ✅ 正确（复数） |

## 2. localhost:8003 的大物件（大文件上传）问题

### 端口说明
- **8003** 是后端 API 的端口（映射到容器内的 8000）
- 配置位置：`docker-compose.yml:40`
  ```yaml
  ports:
    - "8003:8000"
  ```

### 当前文件大小限制
1. **应用层限制**：
   - 默认：5MB（`backend/app/services/image_service.py:34`）
   - 部分前端组件：10MB（`frontend/src/components/Common/ImageDropzone.tsx:36`）

2. **FastAPI/Uvicorn 限制**：
   - 当前未明确配置
   - Uvicorn 默认限制：**1MB**（这可能是问题所在！）

### 解决方案：增加大文件上传支持

#### 方法1：在 FastAPI 启动时配置 Uvicorn
修改 `backend/app/main.py` 或启动命令：

```python
# 在 main.py 中添加
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        limit_max_requests=1000,
        limit_concurrency=100,
        # 增加请求体大小限制到 50MB
        limit_max_request_body=50 * 1024 * 1024,  # 50MB
    )
```

#### 方法2：在 docker-compose.yml 中配置
修改 `docker-compose.yml:80`：

```yaml
command: [
    "fastapi", "run",
    "--reload",
    "--limit-max-request-body", "52428800",  # 50MB
    "app/main.py"
]
```

#### 方法3：使用环境变量
在 `docker-compose.yml` 的环境变量中添加：

```yaml
environment:
  - UVICORN_LIMIT_MAX_REQUEST_BODY=52428800  # 50MB
```

### 推荐配置
- **图片上传**：10-20MB（足够大多数图片）
- **文档上传**：50MB（用于 PDF、Word 等）
- **视频上传**：100MB+（如果需要）

## 3. Docker Compose Restart vs Watch 详解

### 关键概念

#### `restart: always`（容器重启策略）
- **位置**：`docker-compose.yml:38`
- **作用**：当容器异常退出时，Docker 会自动重启容器
- **使用场景**：生产环境，确保服务高可用
- **不适用于**：开发环境（因为会干扰调试）

#### `docker compose watch`（开发模式）
- **作用**：监听文件变化，自动同步到容器并重启服务
- **配置位置**：`docker-compose.yml:81-93` 的 `develop.watch` 部分
- **使用场景**：开发环境，实现热重载

#### `docker compose restart`（手动重启）
- **作用**：重启正在运行的服务
- **前提**：服务必须已经在运行
- **不会**：重新构建镜像或启动已停止的服务

### 命令对比

| 命令 | 作用 | 前提条件 | 使用场景 |
|------|------|---------|---------|
| `docker compose up` | 启动服务 | 无 | 首次启动或完全停止后 |
| `docker compose up --watch` | 启动并监听文件变化 | 无 | 开发环境，需要热重载 |
| `docker compose restart backend` | 重启服务 | 服务必须正在运行 | 配置更改后快速重启 |
| `docker compose stop backend` | 停止服务 | 服务必须正在运行 | 临时停止服务 |
| `docker compose down backend` | 停止并删除容器 | 无 | 完全清理服务 |
| `docker compose start backend` | 启动已停止的服务 | 服务必须已存在但已停止 | 恢复已停止的服务 |

### 常见场景

#### 场景1：开发时启动服务
```bash
# 启动并监听文件变化（推荐用于开发）
docker compose --watch up backend

# 或者使用简写
docker compose watch backend
```

#### 场景2：服务已运行，需要重启
```bash
# 如果服务正在运行，使用 restart
docker compose restart backend

# 如果服务已停止，使用 start
docker compose start backend
```

#### 场景3：服务完全停止后重新启动
```bash
# 如果使用 down 停止了服务
docker compose down backend

# 需要重新启动（会重新创建容器）
docker compose up backend

# 或者使用 watch 模式
docker compose watch backend
```

#### 场景4：配置更改后
```bash
# 如果只是环境变量或配置更改
docker compose restart backend

# 如果需要重新构建镜像
docker compose up --build backend
```

### 重要提示

1. **`restart` 和 `watch` 的区别**：
   - `restart` 是容器重启策略（自动重启）
   - `watch` 是开发工具（文件监听和热重载）
   - 两者可以同时使用

2. **`docker compose down` 后的恢复**：
   - `down` 会删除容器
   - 之后需要使用 `up` 或 `watch` 重新创建
   - `restart` 无法恢复已删除的容器

3. **开发环境推荐**：
   ```bash
   # 首次启动
   docker compose watch backend

   # 如果服务已运行，只需重启
   docker compose restart backend
   ```

4. **生产环境推荐**：
   ```bash
   # 使用 restart: always，无需手动重启
   # 如果需要手动重启
   docker compose restart backend
   ```

## 4. 检查清单

### 路由路径检查
- [ ] 确认所有路由文件名称与注册路径一致
- [ ] 检查 OpenAPI 文档中的路径是否正确
- [ ] 确认前端调用的路径与后端一致

### 大文件上传检查
- [ ] 检查 Uvicorn 的请求体大小限制
- [ ] 确认应用层的文件大小限制
- [ ] 测试大文件上传功能

### Docker Compose 使用检查
- [ ] 确认开发环境使用 `watch` 模式
- [ ] 确认生产环境使用 `restart: always`
- [ ] 了解各命令的使用场景
