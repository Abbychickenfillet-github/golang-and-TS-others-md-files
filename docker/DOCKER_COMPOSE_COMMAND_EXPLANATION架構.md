# Docker Compose command 配置說明
日期：2025-12-12
## 問題：為什麼 command 不放在 develop 下？

### Docker Compose 配置結構限制

**Docker Compose 不支持在 `develop` 下配置 `command`**。

`develop` 部分只支持以下配置：
- `watch`: 文件監聽和同步配置
- 其他開發相關的配置（但**不包括** `command`）

### 正確的配置結構

```yaml
backend:
  build:                    # ← service 級別
    context: ./backend
  command:                  # ← service 級別（必須在這裡）
    - "fastapi"
    - "run"
    - "--reload"
    - "app/main.py"
  develop:                  # ← service 級別
    watch:                  # ← develop 的子項（只支持 watch 等）
      - action: sync
        path: ./backend/app
        target: /app/app
```

### 為什麼這樣設計？

1. **`command` 是容器啟動命令**：
   - 無論是否使用 watch 模式，容器都需要啟動命令
   - `command` 定義了容器啟動時執行的命令

2. **`develop` 是開發模式擴展**：
   - 主要用於文件監聽和同步（`watch`）
   - 不控制容器的啟動命令

3. **`--reload` 的安全性**：
   - 即使不在 watch 模式下，`--reload` 也不會造成問題
   - 只是不會檢測到文件變化，但服務仍可正常運行

## 解決方案：讓 command 只在開發模式生效

如果您希望 `--reload` 只在開發模式下使用，有以下幾種方案：

### 方案 1：使用環境變量（推薦）

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

**docker-compose.yml**（生產模式）：
```yaml
backend:
  build:
    context: ./backend
  command: ["fastapi", "run", "--workers", "4", "app/main.py"]
```

**docker-compose.local.yml**（開發模式）：
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
# 開發模式（使用 local 配置覆蓋）
docker compose -f docker-compose.yml -f docker-compose.local.yml watch backend

# 生產模式（只使用主配置）
docker compose up backend
```

### 方案 3：使用 Dockerfile 的 CMD（當前方案）

在 `Dockerfile` 中設置默認命令（生產模式）：
```dockerfile
CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
```

在 `docker-compose.yml` 中覆蓋（開發模式）：
```yaml
backend:
  build:
    context: ./backend
  command: ["fastapi", "run", "--reload", "app/main.py"]  # 開發時覆蓋
  develop:
    watch:
      - action: sync
        path: ./backend/app
        target: /app/app
```

## 當前配置的合理性

### 為什麼當前配置是合理的？

1. **開發優先**：
   - 大多數情況下，我們都在開發模式
   - `--reload` 在開發時非常有用

2. **生產環境通常使用不同的配置**：
   - 生產環境通常使用 `docker-compose.production.yml`
   - 或通過環境變量控制

3. **`--reload` 的安全性**：
   - 即使在生產環境，`--reload` 也不會造成嚴重問題
   - 只是會消耗更多資源（單進程 + 文件監聽）

### 檢查當前配置

查看 `docker-compose.yml`：
```yaml
backend:
  command: [
    "fastapi", "run",
    "--reload",  # ← 開發模式
    "--limit-max-request-body", "52428800",
    "app/main.py"
  ]
```

這個配置：
- ✅ 在 watch 模式下會正常工作
- ✅ `--reload` 會檢測文件變化
- ⚠️ 在生產環境也會使用 `--reload`（如果使用此配置）

## 推薦做法

### 開發環境（推薦當前配置）

保持當前配置，因為：
- 開發時總是使用 watch 模式
- `--reload` 提供自動重載功能
- 簡單直接

### 生產環境

使用 `docker-compose.production.yml` 或環境變量：

```yaml
# docker-compose.production.yml
backend:
  command: ["fastapi", "run", "--workers", "4", "app/main.py"]
```

## 總結

1. **`command` 不能放在 `develop` 下**：Docker Compose 不支持
2. **當前配置是合理的**：開發時使用 `--reload` 是正確的
3. **如果需要區分環境**：使用不同的 compose 文件或環境變量
4. **watch 模式會正常工作**：`command` 的位置不影響 watch 功能
