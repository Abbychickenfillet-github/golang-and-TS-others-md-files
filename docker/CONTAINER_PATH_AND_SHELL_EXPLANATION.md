# 容器路径结构和 Shell 命令说明

## 1. 为什么是 `/app/app` 而不是 `/app`？

### 路径结构说明

容器内的路径结构是这样的：

```
容器内路径结构：
/app/                    ← 工作目录（WORKDIR）
├── .venv/              ← Python 虚拟环境
├── pyproject.toml       ← 项目配置文件
├── uv.lock             ← 依赖锁定文件
├── alembic.ini         ← 数据库迁移配置
├── scripts/            ← 脚本目录
└── app/                ← 应用代码目录（这就是为什么是 /app/app）
    ├── main.py         ← FastAPI 应用入口
    ├── api/            ← API 路由
    │   └── main.py     ← 路由主文件
    ├── models/         ← 数据模型
    ├── services/       ← 业务逻辑
    └── ...
```

### 为什么这样设计？

#### 1. Dockerfile 中的配置

```dockerfile
WORKDIR /app/                    # 设置工作目录为 /app

COPY ./pyproject.toml /app/     # 复制配置文件到 /app
COPY ./uv.lock /app/            # 复制依赖文件到 /app
COPY ./scripts /app/scripts     # 复制脚本到 /app/scripts
COPY ./app /app/app             # 复制应用代码到 /app/app ← 关键！
```

**原因**：
- `/app/` 是**项目根目录**，包含所有项目文件（配置文件、脚本、依赖等）
- `/app/app/` 是**应用代码目录**，只包含 Python 应用代码
- 这样设计可以保持项目结构清晰，区分项目文件和应用代码

#### 2. docker-compose.yml 中的 watch 配置

```yaml
develop:
  watch:
    - action: sync
      path: ./backend/app        # 本地路径：项目根目录下的 app 目录
      target: /app/app           # 容器路径：/app 下的 app 目录
```

**映射关系**：
```
本地路径：        ./backend/app/
                ↓ (watch sync)
容器路径：        /app/app/
```

### 实际路径示例

| 本地路径 | 容器路径 | 说明 |
|---------|---------|------|
| `./backend/app/main.py` | `/app/app/main.py` | 应用入口 |
| `./backend/app/api/main.py` | `/app/app/api/main.py` | 路由文件 |
| `./backend/pyproject.toml` | `/app/pyproject.toml` | 项目配置 |
| `./backend/scripts/` | `/app/scripts/` | 脚本目录 |

### 为什么不是 `/app`？

如果直接使用 `/app` 作为应用代码目录，会导致：

```
/app/                    ← 工作目录
├── main.py             ← 应用代码
├── api/                ← 应用代码
├── pyproject.toml      ← 项目配置
├── scripts/            ← 脚本
└── ...                 ← 所有文件混在一起
```

**问题**：
- ❌ 项目文件和应用代码混在一起
- ❌ 无法清晰区分项目配置和应用代码
- ❌ 不符合 Python 项目的最佳实践

**使用 `/app/app` 的好处**：
- ✅ 项目文件和应用代码分离
- ✅ 符合 Python 项目结构（项目根目录 + 应用代码目录）
- ✅ 便于管理和维护

## 2. 命令使用：PowerShell、CMD 还是 bash？

### docker compose exec 命令

```bash
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"
```

这个命令可以在以下环境中使用：

#### Windows PowerShell ✅
```powershell
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"
```

#### Windows CMD ✅
```cmd
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"
```

#### Git Bash / WSL ✅
```bash
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"
```

**说明**：
- `docker compose exec` 是 Docker Compose 的命令，可以在任何支持 Docker 的终端中使用
- `|`（管道）和 `grep` 在 PowerShell、CMD、bash 中都可以使用
- 在 Windows 上，`grep` 可能需要 Git Bash 或 WSL（CMD 和 PowerShell 可能没有 grep）

### Windows 上的替代方案

#### PowerShell（推荐）
```powershell
# 使用 Select-String（PowerShell 的 grep）
docker compose exec backend cat /app/app/api/main.py | Select-String "company-verifications"
```

#### CMD
```cmd
# 使用 findstr（CMD 的 grep）
docker compose exec backend cat /app/app/api/main.py | findstr "company-verifications"
```

#### Git Bash / WSL
```bash
# 直接使用 grep（Linux 命令）
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"
```

## 3. bash 是什么？可以跟 CMD 比擬吗？

### Shell 对比

| Shell | 平台 | 特点 | 用途 |
|-------|------|------|------|
| **CMD** | Windows | Windows 原生命令行 | Windows 系统管理 |
| **PowerShell** | Windows | 强大的脚本语言和命令行 | Windows 高级管理和自动化 |
| **bash** | Linux/Unix/macOS | Unix shell，功能强大 | Linux/Unix 系统管理，开发工具 |

### bash 简介

**bash**（Bourne Again Shell）是：
- Linux/Unix 系统的标准 shell
- 功能强大的命令行解释器
- 支持脚本编程、管道、重定向等

### 在 Windows 上使用 bash

#### 方式 1：Git Bash（推荐开发使用）
- 安装 Git for Windows 时自带
- 提供 Linux 风格的命令行环境
- 支持大部分 Linux 命令（grep, sed, awk 等）

#### 方式 2：WSL（Windows Subsystem for Linux）
- 完整的 Linux 环境
- 可以运行 Linux 应用
- 适合需要完整 Linux 功能的场景

#### 方式 3：Docker 容器内
- 容器通常是 Linux 环境
- 进入容器后自动使用 bash
- 例如：`docker compose exec backend bash`

### 命令对比示例

#### 查找文件内容

**PowerShell**：
```powershell
Get-Content file.txt | Select-String "pattern"
# 或
cat file.txt | Select-String "pattern"
```

**CMD**：
```cmd
type file.txt | findstr "pattern"
```

**bash**：
```bash
cat file.txt | grep "pattern"
```

#### 列出文件

**PowerShell**：
```powershell
Get-ChildItem
# 或
ls
```

**CMD**：
```cmd
dir
```

**bash**：
```bash
ls
```

### 在 Docker 容器中使用

当您执行：
```bash
docker compose exec backend bash
```

您会进入容器的 bash shell（因为容器是 Linux 环境）：
```bash
root@container:/app# ls
app  pyproject.toml  scripts  .venv  ...

root@container:/app# cat app/api/main.py | grep "company-verifications"
```

**说明**：
- 容器内是 Linux 环境，所以使用 bash
- 在容器内，所有命令都是 Linux 命令
- 退出容器后，回到 Windows 环境（PowerShell/CMD）

## 4. 推荐的工作流程

### 开发时检查容器文件

#### 方式 1：在 Windows PowerShell 中
```powershell
# 查看文件内容
docker compose exec backend cat /app/app/api/main.py | Select-String "company-verifications"

# 进入容器（使用 bash）
docker compose exec backend bash
# 然后在容器内使用 Linux 命令
```

#### 方式 2：在 Git Bash 中
```bash
# 直接使用 Linux 命令
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"

# 进入容器
docker compose exec backend bash
```

#### 方式 3：在容器内操作
```bash
# 进入容器
docker compose exec backend bash

# 在容器内使用 Linux 命令
cat /app/app/api/main.py | grep "company-verifications"
ls -la /app/app/
cd /app/app && python -m pytest
```

## 总结

1. **`/app/app` 路径**：
   - `/app/` 是项目根目录（包含配置文件、脚本等）
   - `/app/app/` 是应用代码目录（包含 Python 代码）
   - 这样设计保持项目结构清晰

2. **命令使用**：
   - `docker compose exec` 可以在 PowerShell、CMD、bash 中使用
   - 在 Windows 上，`grep` 需要 Git Bash 或 WSL
   - PowerShell 可以使用 `Select-String`，CMD 可以使用 `findstr`

3. **bash vs CMD**：
   - bash 是 Linux/Unix shell，功能强大
   - CMD 是 Windows 原生命令行
   - 在 Docker 容器内，通常使用 bash（因为容器是 Linux 环境）
   - 在 Windows 上可以通过 Git Bash 或 WSL 使用 bash
