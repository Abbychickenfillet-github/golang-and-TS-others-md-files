# 容器路徑結構和 Shell 命令說明

## 1. 為什麼是 `/app/app` 而不是 `/app`？

### 路徑結構說明

容器內的路徑結構是這樣的：

```
容器內路徑結構：
/app/                    ← 工作目錄（WORKDIR）
├── .venv/              ← Python 虛擬環境
├── pyproject.toml       ← 項目配置文件
├── uv.lock             ← 依賴鎖定文件
├── alembic.ini         ← 資料庫遷移配置
├── scripts/            ← 腳本目錄
└── app/                ← 應用程式碼目錄（這就是為什麼是 /app/app）
    ├── main.py         ← FastAPI 應用入口
    ├── api/            ← API 路由
    │   └── main.py     ← 路由主文件
    ├── models/         ← 數據模型
    ├── services/       ← 業務邏輯
    └── ...
```

### 為什麼這樣設計？

#### 1. Dockerfile 中的配置

```dockerfile
WORKDIR /app/                    # 設置工作目錄為 /app

COPY ./pyproject.toml /app/     # 複製配置文件到 /app
COPY ./uv.lock /app/            # 複製依賴文件到 /app
COPY ./scripts /app/scripts     # 複製腳本到 /app/scripts
COPY ./app /app/app             # 複製應用程式碼到 /app/app ← 關鍵！
```

**原因**：
- `/app/` 是**項目根目錄**，包含所有項目文件（配置文件、腳本、依賴等）
- `/app/app/` 是**應用程式碼目錄**，只包含 Python 應用程式碼
- 這樣設計可以保持項目結構清晰，區分項目文件和應用程式碼

#### 2. docker-compose.yml 中的 watch 配置

```yaml
develop:
  watch:
    - action: sync
      path: ./backend/app        # 本地路徑：項目根目錄下的 app 目錄
      target: /app/app           # 容器路徑：/app 下的 app 目錄
```

**映射關係**：
```
本地路徑：        ./backend/app/
                ↓ (watch sync)
容器路徑：        /app/app/
```

### 實際路徑示例

| 本地路徑 | 容器路徑 | 說明 |
|---------|---------|------|
| `./backend/app/main.py` | `/app/app/main.py` | 應用入口 |
| `./backend/app/api/main.py` | `/app/app/api/main.py` | 路由文件 |
| `./backend/pyproject.toml` | `/app/pyproject.toml` | 項目配置 |
| `./backend/scripts/` | `/app/scripts/` | 腳本目錄 |

### 為什麼不是 `/app`？

如果直接使用 `/app` 作為應用程式碼目錄，會導致：

```
/app/                    ← 工作目錄
├── main.py             ← 應用程式碼
├── api/                ← 應用程式碼
├── pyproject.toml      ← 項目配置
├── scripts/            ← 腳本
└── ...                 ← 所有文件混在一起
```

**問題**：
- ❌ 項目文件和應用程式碼混在一起
- ❌ 無法清晰區分項目配置和應用程式碼
- ❌ 不符合 Python 項目的最佳實踐

**使用 `/app/app` 的好處**：
- ✅ 項目文件和應用程式碼分離
- ✅ 符合 Python 項目結構（項目根目錄 + 應用程式碼目錄）
- ✅ 便於管理和維護

## 2. 命令使用：PowerShell、CMD 還是 bash？

### docker compose exec 命令

```bash
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"
```

這個命令可以在以下環境中使用：

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

**說明**：
- `docker compose exec` 是 Docker Compose 的命令，可以在任何支持 Docker 的終端中使用
- `|`（管道）和 `grep` 在 PowerShell、CMD、bash 中都可以使用
- 在 Windows 上，`grep` 可能需要 Git Bash 或 WSL（CMD 和 PowerShell 可能沒有 grep）

### Windows 上的替代方案

#### PowerShell（推薦）
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

## 3. bash 是什麼？可以跟 CMD 比擬嗎？

### Shell 對比

| Shell | 平台 | 特點 | 用途 |
|-------|------|------|------|
| **CMD** | Windows | Windows 原生命令行 | Windows 系統管理 |
| **PowerShell** | Windows | 強大的腳本語言和命令行 | Windows 高級管理和自動化 |
| **bash** | Linux/Unix/macOS | Unix shell，功能強大 | Linux/Unix 系統管理，開發工具 |

### bash 簡介

**bash**（Bourne Again Shell）是：
- Linux/Unix 系統的標準 shell
- 功能強大的命令行解釋器
- 支持腳本編程、管道、重定向等

### 在 Windows 上使用 bash

#### 方式 1：Git Bash（推薦開發使用）
- 安裝 Git for Windows 時自帶
- 提供 Linux 風格的命令行環境
- 支持大部分 Linux 命令（grep, sed, awk 等）

#### 方式 2：WSL（Windows Subsystem for Linux）
- 完整的 Linux 環境
- 可以運行 Linux 應用
- 適合需要完整 Linux 功能的場景

#### 方式 3：Docker 容器內
- 容器通常是 Linux 環境
- 進入容器後自動使用 bash
- 例如：`docker compose exec backend bash`

### 命令對比示例

#### 查找文件內容

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

當您執行：
```bash
docker compose exec backend bash
```

您會進入容器的 bash shell（因為容器是 Linux 環境）：
```bash
root@container:/app# ls
app  pyproject.toml  scripts  .venv  ...

root@container:/app# cat app/api/main.py | grep "company-verifications"
```

**說明**：
- 容器內是 Linux 環境，所以使用 bash
- 在容器內，所有命令都是 Linux 命令
- 退出容器後，回到 Windows 環境（PowerShell/CMD）

## 4. 推薦的工作流程

### 開發時檢查容器文件

#### 方式 1：在 Windows PowerShell 中
```powershell
# 查看文件內容
docker compose exec backend cat /app/app/api/main.py | Select-String "company-verifications"

# 進入容器（使用 bash）
docker compose exec backend bash
# 然後在容器內使用 Linux 命令
```

#### 方式 2：在 Git Bash 中
```bash
# 直接使用 Linux 命令
docker compose exec backend cat /app/app/api/main.py | grep "company-verifications"

# 進入容器
docker compose exec backend bash
```

#### 方式 3：在容器內操作
```bash
# 進入容器
docker compose exec backend bash

# 在容器內使用 Linux 命令
cat /app/app/api/main.py | grep "company-verifications"
ls -la /app/app/
cd /app/app && python -m pytest
```

## 總結

1. **`/app/app` 路徑**：
   - `/app/` 是項目根目錄（包含配置文件、腳本等）
   - `/app/app/` 是應用程式碼目錄（包含 Python 程式碼）
   - 這樣設計保持項目結構清晰

2. **命令使用**：
   - `docker compose exec` 可以在 PowerShell、CMD、bash 中使用
   - 在 Windows 上，`grep` 需要 Git Bash 或 WSL
   - PowerShell 可以使用 `Select-String`，CMD 可以使用 `findstr`

3. **bash vs CMD**：
   - bash 是 Linux/Unix shell，功能強大
   - CMD 是 Windows 原生命令行
   - 在 Docker 容器內，通常使用 bash（因為容器是 Linux 環境）
   - 在 Windows 上可以通過 Git Bash 或 WSL 使用 bash
