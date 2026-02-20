# 環境變數載入指南

本文件說明專案中 `.env` 檔案的載入順序，依據不同工具和階段（開發/部署）區分。

---

## 專案 .env 檔案結構

```
.env                    # 基礎設定（所有環境共用）
.env.local              # 本地覆蓋（git 忽略，個人設定）
.env.staging            # 開發/測試環境
.env.production         # 生產環境
```

---

## 重要觀念：Shell 環境變數 vs .env 檔案

`docker-compose.yml` 中的 `${ENVIRONMENT:-staging}` 解析順序：

```
1. 優先讀取 shell 環境變數（終端機設定的 ENVIRONMENT）
2. 如果 shell 環境變數不存在，才使用 fallback 值 "staging"
```

**重點**：`.env` 檔案中的 `ENVIRONMENT=xxx` **不會影響** `env_file:` 路徑的解析！

因為 Docker Compose 在解析 `env_file:` 路徑時，`.env` 還沒被載入。所以你**必須在終端機**設定 `ENVIRONMENT`。

---

## 終端機指令

### 開發/測試環境 (staging)

```bash
# Windows (PowerShell)
$env:ENVIRONMENT="staging"; docker compose up

# Windows (CMD)
set ENVIRONMENT=staging && docker compose up

# macOS / Linux
ENVIRONMENT=staging docker compose up
```

### 生產/部署環境 (production)

```bash
# Windows (PowerShell)
$env:ENVIRONMENT="production"; docker compose up -d

# Windows (CMD)
set ENVIRONMENT=production && docker compose up -d

# macOS / Linux
ENVIRONMENT=production docker compose up -d
```

### 開發環境 + Watch 模式 (hot reload)

```bash
# Windows (PowerShell)
$env:ENVIRONMENT="staging"; docker compose watch

# Windows (CMD)
set ENVIRONMENT=staging && docker compose watch

# macOS / Linux
ENVIRONMENT=staging docker compose watch
```

**Watch 模式說明**：
- 監聽檔案變更，自動同步到容器或重建
- 適合開發時使用，不需手動重啟容器
- 需要在 `docker-compose.yml` 中設定 `develop.watch` 區塊

---

## 1. Docker Compose

### 載入順序（後者覆蓋前者）

```
1. .env                           # 基礎設定
2. .env.local                     # 本地覆蓋（如存在）
3. .env.${ENVIRONMENT}            # 環境特定（staging/production）
4. environment: 區塊              # 最高優先級 ✅
```

### docker-compose.yml 的兩個區塊

```yaml
services:
  backend:
    # ===== env_file 區塊（載入檔案）=====
    env_file:
      - .env                              # ① 載入 .env 檔案
      - path: .env.local
        required: false                   # ② 載入 .env.local（可選）
      - .env.${ENVIRONMENT:-staging}      # ③ 載入 .env.staging

    # ===== environment 區塊（直接定義）=====
    environment:                          # ④ 最高優先級
      - ENVIRONMENT=${ENVIRONMENT:-staging}
      - MYSQL_HOST=${MYSQL_HOST}
      - ...
```

### 載入順序對照表

| 順序 | 來源 | 位置 | 說明 |
|------|------|------|------|
| ① | `.env` | 檔案 | `env_file:` 載入 |
| ② | `.env.local` | 檔案 | `env_file:` 載入 |
| ③ | `.env.staging` | 檔案 | `env_file:` 載入 |
| ④ | `environment:` | docker-compose.yml | 直接定義，最高優先 |

### 實際執行流程

```
你執行: $env:ENVIRONMENT="staging"; docker compose up
                    │
                    ▼
         Shell 環境變數 ENVIRONMENT="staging"
                    │
                    ▼
    ┌─── docker-compose.yml 解析 ───┐
    │                               │
    │  env_file:                    │
    │    - .env          ← 載入    │
    │    - .env.local    ← 載入    │
    │    - .env.staging  ← 載入    │
    │                               │
    │  environment:                 │
    │    - ENVIRONMENT=staging ✅   │
    │    - MYSQL_HOST=xxx          │
    └───────────────────────────────┘
                    │
                    ▼
              容器內環境變數
         ENVIRONMENT = "staging" (來自 environment:)
         MYSQL_HOST = "xxx" (來自 .env.staging)
```

### 為什麼需要 environment: 區塊？

`environment:` 的作用是**明確指定**哪些變數要注入到容器中：

```yaml
environment:
  - ENVIRONMENT=${ENVIRONMENT:-staging}  # 從 shell 取值，注入容器
  - MYSQL_HOST=${MYSQL_HOST}             # 從 env_file 取值，注入容器
```

如果沒有 `environment:` 區塊，`env_file:` 載入的**所有變數**都會注入容器。
有了 `environment:` 區塊，可以**篩選和覆蓋**特定變數。

---

## environment: 區塊內變數的覆蓋規則

### 重要觀念：變數之間各自獨立

`environment:` 區塊內的變數是**各自獨立**的，不會互相覆蓋：

```yaml
environment:
  - ENVIRONMENT=staging    # 只影響 ENVIRONMENT 這個變數
  - MYSQL_HOST=xxx         # 只影響 MYSQL_HOST 這個變數
```

**它們是不同的變數名，不會互相覆蓋！**

### 覆蓋只發生在同名變數之間

```
ENVIRONMENT 這個變數的覆蓋鏈：
.env (ENVIRONMENT=local)
  ↓ 覆蓋
.env.staging (ENVIRONMENT=staging)
  ↓ 覆蓋
environment: ENVIRONMENT=${ENVIRONMENT:-staging}  ✅ 最終值

MYSQL_HOST 這個變數的覆蓋鏈：
.env (MYSQL_HOST=aaa)
  ↓ 覆蓋
.env.staging (MYSQL_HOST=bbb)
  ↓ 覆蓋
environment: MYSQL_HOST=${MYSQL_HOST}  ✅ 最終值
```

### 圖解：每個變數有獨立的覆蓋鏈

```
┌─────────────────────────────────────────────────────┐
│              environment: 區塊                      │
├─────────────────────────────────────────────────────┤
│  ENVIRONMENT ──覆蓋鏈──► .env → .env.staging → 這裡 │
│  MYSQL_HOST  ──覆蓋鏈──► .env → .env.staging → 這裡 │
│  SECRET_KEY  ──覆蓋鏈──► .env → .env.staging → 這裡 │
│  ...                                                │
└─────────────────────────────────────────────────────┘
     ↑
     每個變數有自己獨立的覆蓋鏈，不會互相影響
```

---

## ${VAR} vs ${VAR:-default} 的差異

```yaml
environment:
  - ENVIRONMENT=${ENVIRONMENT:-staging}   # 有預設值 :-staging
  - MYSQL_HOST=${MYSQL_HOST}              # 沒有預設值
```

| 寫法 | 意義 | 值從哪來 |
|------|------|----------|
| `${ENVIRONMENT:-staging}` | 有預設值 | Shell 環境變數 → 如果沒有，用 `staging` |
| `${MYSQL_HOST}` | 沒有預設值 | 已載入的 env_file |

### MYSQL_HOST 的值從哪來？

```
Docker Compose 執行順序：

1. 載入 env_file:
   .env           → MYSQL_HOST=aaa
   .env.local     → (沒設定)
   .env.staging   → MYSQL_HOST=bbb  ✅ 覆蓋成 bbb

2. 解析 environment: 區塊
   MYSQL_HOST=${MYSQL_HOST}
              ↓
   從步驟 1 已載入的變數取值 → bbb
```

**所以 `MYSQL_HOST` 來自 `.env.staging` 檔案，不是終端機！**

### 終端機可覆蓋哪些變數？

| 變數 | 來源 | 終端機可覆蓋？ |
|------|------|----------------|
| `ENVIRONMENT` | Shell 環境變數 | ✅ 可以 |
| `MYSQL_HOST` | `.env` / `.env.staging` | ❌ 不行（除非你在終端機設定 `$env:MYSQL_HOST=xxx`） |

### 如果你想用終端機覆蓋 MYSQL_HOST

```bash
# Windows PowerShell
$env:ENVIRONMENT="staging"; $env:MYSQL_HOST="my-custom-host"; docker compose up
```

但通常不需要這樣做，因為 `MYSQL_HOST` 應該由 `.env.staging` 或 `.env.production` 控制。

### 開發/測試環境 (`ENVIRONMENT=staging`)

```yaml
env_file:
  - .env                    # 載入基礎設定
  - .env.local              # 載入本地覆蓋（可選）
  - .env.staging            # 載入測試設定 ✅ 覆蓋前面的值
```

**生效檔案**：`.env` → `.env.local` → `.env.staging`

### 生產/部署環境 (`ENVIRONMENT=production`)

```yaml
env_file:
  - .env                    # 載入基礎設定
  - .env.local              # 載入本地覆蓋（可選）
  - .env.production         # 載入生產設定 ✅ 覆蓋前面的值
```

**生效檔案**：`.env` → `.env.local` → `.env.production`

---

## 2. Vite (前端)

### 開發階段 - 本地 (`npm run dev`)

**直接在本地執行**，Vite 會讀取 `.env` 檔案：

```
.env                    # 所有環境
.env.local              # 所有環境，git 忽略
.env.development        # 開發環境
.env.development.local  # 開發環境，git 忽略 ✅ 最終生效
```

### 建構階段 - 本地 (`npm run build`)

**直接在本地執行**，Vite 會讀取 `.env` 檔案：

```
.env                    # 所有環境
.env.local              # 所有環境，git 忽略
.env.production         # 生產環境
.env.production.local   # 生產環境，git 忽略 ✅ 最終生效
```

### 建構階段 - Dockerfile (`docker build`)

**Dockerfile 不會讀取 `.env` 檔案！** 必須透過 `ARG` 傳入：

```dockerfile
# frontend/Dockerfile
ARG VITE_API_URL=${VITE_API_URL}
RUN npm run build
```

環境變數來源：

```yaml
# docker-compose.yml
frontend:
  build:
    context: ./frontend
    args:
      - VITE_API_URL=http://localhost:8003    # 直接指定
      - NODE_ENV=development
```

或使用 `--build-arg`：

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t frontend .
```

**重要**：
- 只有 `VITE_` 前綴的變數會暴露給前端代碼
- Dockerfile 建構時，環境變數會被「烘焙」進靜態檔案，無法在 runtime 修改

---

## 3. Go Backend (backend-go)

### 開發階段 (Docker + Air)

Go 應用在 Docker 環境中**不直接讀取** `.env` 檔案，而是透過 Docker Compose 注入：

```
Docker Compose env_file → 環境變數 → Go 應用讀取 os.Getenv()
```

### 建構/部署階段

同上，完全由 Docker Compose 的 `env_file` 和 `environment` 注入。

---

## 4. Python FastAPI (backend)

### 開發階段 (Docker)

Python 應用使用 `pydantic-settings`，載入順序：

```
1. .env 檔案（透過 Docker Compose env_file）
2. 環境變數（OS / Docker environment）✅ 最終生效
```

### 建構/部署階段

同上，由 Docker Compose 注入。

### ENVIRONMENT 驗證規則 (pydantic)

Python backend 使用 pydantic 的 `Literal` 類型來**驗證** `ENVIRONMENT` 變數：

```python
# backend/app/core/config.py
ENVIRONMENT: Literal["local", "staging", "production"] = "production"
```

**只允許以下三個值**：
- `local` - 本地開發（使用本地 DB）
- `staging` - 測試環境（使用 staging DB）
- `production` - 生產環境

如果傳入不在列表中的值（如 `development`），會出現驗證錯誤：

```
pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
ENVIRONMENT
  Input should be 'local', 'staging' or 'production' [type=literal_error, input_value='development', input_type=str]
```

**解決方案**（二擇一）：
1. 修改 `config.py`，在 `Literal` 中加入新的允許值
2. 使用已允許的值（如 `staging` 代替 `development`）

---

## 總結表格

| 工具 | 開發/測試階段最終生效 | 建構/部署最終生效 |
|------|----------------------|------------------|
| **Docker Compose** | `.env.staging` > `.env.local` > `.env` | `.env.production` > `.env.local` > `.env` |
| **Vite** | `.env.development.local` | `.env.production.local` |
| **Go Backend** | Docker 注入的環境變數 | Docker 注入的環境變數 |
| **Python Backend** | Docker 注入的環境變數 | Docker 注入的環境變數 |

---

## 各檔案用途說明

| 檔案 | 用途 | Git 追蹤 |
|------|------|----------|
| `.env` | 基礎設定、預設值、共用配置 | ✅ 是 |
| `.env.local` | 個人本地覆蓋（密鑰、本地 DB 等） | ❌ 否 |
| `.env.staging` | 開發/測試環境特定設定 | ✅ 是 |
| `.env.production` | 生產環境特定設定 | ✅ 是 |
| `.env.example` | 範本檔案，供新成員參考 | ✅ 是 |

---

## 注意事項

1. **敏感資訊**：密鑰、密碼等敏感資訊應放在 `.env.local`（不追蹤）或使用 secrets 管理工具
2. **變數覆蓋**：後載入的檔案會覆蓋先載入的同名變數
3. **Docker environment**：`docker-compose.yml` 中的 `environment:` 區塊優先級最高
4. **Vite 前綴**：前端只能存取 `VITE_` 開頭的變數

---

## .env 設置建議

`.env` = 基礎設定（所有環境共用）

建議你的 `.env` 裡面：

```env
# 不要設 ENVIRONMENT，讓 shell 環境變數控制
# ENVIRONMENT=local  ← 可以移除或註解掉

# 放共用的設定
PROJECT_NAME=Future_Sign
DOCKER_IMAGE_BACKEND=futuresign-backend
...
```

環境特定的設定放在：
- `.env.staging` → staging 資料庫、ECPay stage 等
- `.env.production` → production 資料庫、ECPay prod 等

---

## 載入流程圖

```
你執行: $env:ENVIRONMENT="staging"; docker compose watch
                    │
                    ▼
        docker-compose.yml 解析
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
      .env      .env.local   .env.staging
     (基礎)      (個人)       (環境特定)
        │           │           │
        └─────覆蓋順序─────────►│
                                ▼
                    容器內 ENVIRONMENT=staging
```

---

## 環境名稱的業界標準定義

| 環境 | 意義 | 部署位置 | 用途 |
|------|------|----------|------|
| `local` | 本地開發 | 你的電腦 | 開發、debug |
| `development` | 開發環境 | 共享伺服器（可選） | 團隊開發測試 |
| `staging` | 預發布環境 | 伺服器 | 部署前最終驗證，模擬 production |
| `production` | 生產環境 | 伺服器 | 面向最終用戶 |

### 為什麼預設是 production？

```python
ENVIRONMENT: Literal["local", "staging", "production"] = "production"
```

**安全考量**：如果忘記設定環境變數，預設使用最嚴格的 `production` 配置，避免意外暴露敏感資訊或啟用 debug 模式。

---

## 本專案的環境定義

| 環境 | 用途 | 資料庫 |
|------|------|--------|
| `local` | 本地開發，連本地 DB | 本地 MySQL |
| `staging` | 本地開發，連遠端測試 DB | `future_sign_stage` |
| `production` | 正式部署 | `future_sign_prod` |

> **備註**：`staging` 這個名字在業界通常指「部署在伺服器上的測試環境」。本專案將其用於本地開發連接測試資料庫，這是可行的用法。

---

## 參考資料

- [Docker Best Practices: Using ARG and ENV in Your Dockerfiles](https://www.docker.com/blog/docker-best-practices-using-arg-and-env-in-your-dockerfiles/)
