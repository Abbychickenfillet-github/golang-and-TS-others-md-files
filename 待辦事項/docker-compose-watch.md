# Docker Compose Watch 指令

## 什麼是 docker compose watch？

`docker compose watch` 是 Docker Compose 2.22.0+ 引入的功能，用於**開發時自動同步檔案變更**到容器。

```bash
# 檢查版本
docker compose version
# 需要 2.22.0 以上
```

---

## 基本用法

```bash
# Windows (PowerShell)
$env:ENVIRONMENT="staging"; docker compose watch

# macOS / Linux
ENVIRONMENT=staging docker compose watch
```

---

## 與 docker compose up 的差異

| 指令 | 用途 | 檔案變更時 |
|------|------|------------|
| `docker compose up` | 啟動容器 | 不會自動同步 |
| `docker compose watch` | 開發模式 | 自動同步/重建 |

---

## docker-compose.yml 設定

### develop.watch 區塊

```yaml
services:
  backend:
    develop:
      watch:
        # 同步檔案（不重啟容器）
        - action: sync
          path: ./backend/app
          target: /app/app
          ignore:
            - .venv
            - __pycache__

        # 重建容器（當依賴變更時）
        - action: rebuild
          path: ./backend/pyproject.toml
```

### 三種 action 類型

| Action | 行為 | 適用場景 |
|--------|------|----------|
| `sync` | 同步檔案到容器 | 程式碼變更 |
| `sync+restart` | 同步 + 重啟容器 | 設定檔變更 |
| `rebuild` | 重新建構映像 | 依賴套件變更 |

---

## 本專案的 watch 設定

### Backend (Python FastAPI)

```yaml
backend:
  command: [ "fastapi", "run", "--reload", "app/main.py" ]
  develop:
    watch:
      - action: sync
        path: ./backend/app
        target: /app/app
        ignore:
          - .venv
          - __pycache__
          - "*.pyc"
      - action: rebuild
        path: ./backend/pyproject.toml
      - action: rebuild
        path: ./backend/requirements.txt
```

**說明**：
- `--reload` 讓 FastAPI 偵測到檔案變更時自動重載
- `sync` 同步 Python 程式碼
- `rebuild` 當 pyproject.toml 變更時重建（安裝新套件）

### Backend-Go (Air hot reload)

```yaml
backend-go:
  develop:
    watch:
      - action: sync
        path: ./backend-go
        target: /app
        ignore:
          - tmp
          - vendor
          - "*.md"
      - action: rebuild
        path: ./backend-go/go.mod
      - action: rebuild
        path: ./backend-go/go.sum
```

**說明**：
- Go 後端使用 Air 做 hot reload
- `sync` 同步 Go 程式碼，Air 會自動編譯
- `rebuild` 當 go.mod 變更時重建（安裝新套件）

### Frontend (Vite + React)

```yaml
frontend:
  develop:
    watch:
      - action: sync
        path: ./frontend/src
        target: /app/src
        ignore:
          - node_modules
          - dist
          - .next
      - action: sync+restart
        path: ./frontend/package.json
        target: /app/package.json
```

**說明**：
- `sync` 同步前端程式碼
- `sync+restart` 當 package.json 變更時重啟（但不會自動 npm install）

---

## Vite 與 Docker Watch 的問題

### 問題：Vite 需要 HMR (Hot Module Replacement)

Vite 的開發模式依賴 WebSocket 連線做 HMR，但在 Docker 容器中：

1. **Port 映射問題**：Vite dev server 跑在容器內，HMR WebSocket 可能連不上
2. **建構模式**：目前 frontend Dockerfile 是 `npm run build` + nginx，不是 `npm run dev`

### 目前設定的限制

```yaml
frontend:
  ports:
    - "5005:80"  # nginx 靜態檔案
```

這是**生產模式**（build + nginx），不是開發模式（Vite dev server）。

### 解決方案

#### 方案 1：本地開發前端，Docker 只跑後端（推薦）

```bash
# 終端機 1：啟動後端
$env:ENVIRONMENT="staging"; docker compose up backend backend-go redis

# 終端機 2：本地跑前端（有完整 HMR）
cd frontend
npm run dev
```

**優點**：Vite HMR 完整運作，開發體驗最好

#### 方案 2：建立 Dockerfile.dev 給前端

```dockerfile
# frontend/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

```yaml
# docker-compose.yml
frontend-dev:
  build:
    context: ./frontend
    dockerfile: Dockerfile.dev
  ports:
    - "5173:5173"
  volumes:
    - ./frontend/src:/app/src  # 綁定 volume
  develop:
    watch:
      - action: sync
        path: ./frontend/src
        target: /app/src
```

**缺點**：設定複雜，HMR 可能還是有問題

---

## 推薦的開發流程

### 完整 Docker 開發（後端為主）

```bash
$env:ENVIRONMENT="staging"; docker compose watch
```

- ✅ Backend (Python) - 自動同步 + reload
- ✅ Backend-Go - 自動同步 + Air hot reload
- ⚠️ Frontend - 只有 sync，沒有 HMR

### 混合開發（前端體驗最好）

```bash
# 終端機 1：Docker 後端
$env:ENVIRONMENT="staging"; docker compose up backend backend-go redis

# 終端機 2：本地前端
cd frontend && npm run dev

# 終端機 3：本地 official_website（如需要）
cd official_website && npm run dev
```

- ✅ Backend - Docker 容器
- ✅ Frontend - 本地 Vite，完整 HMR
- ✅ 最佳開發體驗

---

## 常用指令

```bash
# 啟動 watch 模式
docker compose watch

# 只啟動特定服務的 watch
docker compose watch backend backend-go

# 查看 watch 狀態
docker compose alpha watch --help

# 停止所有容器
docker compose down
```

---

## 待辦事項

- [ ] 測試 `docker compose watch` 的實際效果
- [ ] 考慮是否需要建立 `frontend/Dockerfile.dev`
- [ ] 確認 Vite HMR 在 Docker 中的可行性
