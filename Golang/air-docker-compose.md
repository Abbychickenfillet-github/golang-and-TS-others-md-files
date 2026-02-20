# Docker Compose Watch + Air 熱重載說明

## 常見問題 (FAQ)

### Q1: 為什麼 develop 底下放 watch，Docker 怎麼知道 air 是要用在 develop 區塊底下？

**A: Docker Compose 和 Air 是兩個獨立的工具，各司其職**

```yaml
services:
  backend-go:
    build:
      context: ./backend-go
      dockerfile: Dockerfile.dev    # ← Dockerfile 裡面有 air
    develop:                        # ← Docker Compose 的 watch 功能
      watch:
        - action: sync
          path: ./backend-go
          target: /app
```

**運作流程**：

1. **Dockerfile.dev（容器內部）**：
   ```dockerfile
   # 安裝 air
   RUN go install github.com/air-verse/air@latest

   # 啟動時執行 air
   CMD ["air", "-c", ".air.toml"]
   ```
   → Air 在**容器內部**運行，監聽 `/app` 目錄的檔案變化

2. **docker-compose.yml 的 develop section（容器外部）**：
   ```yaml
   develop:
     watch:
       - action: sync
         path: ./backend-go    # 本地路徑
         target: /app          # 容器內路徑
   ```
   → Docker Compose 監聽**本地 `./backend-go`** 的檔案變化，同步到容器的 `/app`

3. **兩者結合**：
   - 你在本地修改 `main.go`
   - → Docker Compose 偵測到變化
   - → 同步檔案到容器的 `/app/cmd/server/main.go`
   - → Air（在容器內運行）偵測到 `/app` 的檔案變化
   - → Air 自動重新編譯 + 重啟 Go 程式

**簡單說**：
- **Docker Compose watch** = 負責把本地檔案同步到容器
- **Air** = 負責在容器內監聽檔案變化並重新編譯

它們不是直接連動，而是通過「檔案系統」這個中介：
```
本地檔案變化 → Docker Compose 同步 → 容器內檔案變化 → Air 偵測 → 重新編譯
```

---

### Q2: action: sync 跟 action: rebuild 差在哪？

**A: 一個是「同步檔案」，一個是「重建 Docker image」**

| 比較項目 | `action: sync` | `action: rebuild` |
|---------|----------------|-------------------|
| **速度** | ⚡ 非常快（毫秒級） | 🐢 慢（可能幾十秒到幾分鐘） |
| **做什麼** | 只同步檔案到容器 | 重新執行整個 `docker build` |
| **容器** | ✅ 不重啟容器 | ⚠️ 停止舊容器 → 建置新 image → 啟動新容器 |
| **適用場景** | 程式碼修改（`.go` 檔案） | 依賴變更（`go.mod`、`Dockerfile`） |

---

### Q3: 一個是同步一個重建？

**A: 是的，完全正確！**

#### action: sync（同步）

```yaml
- action: sync
  path: ./backend-go      # 監聽本地這個目錄
  target: /app            # 同步到容器的這個目錄
  ignore:
    - tmp
    - vendor
    - "*.md"
```

**行為**：
1. 監聽 `./backend-go/**/*.go` 的變化
2. 當你修改 `main.go`
3. **立即同步**到容器的 `/app/cmd/server/main.go`
4. 容器**繼續運行**（不重啟）
5. Air 偵測到檔案變化 → 重新編譯

**類比**：就像「複製貼上」檔案，容器不用重新啟動

---

#### action: rebuild（重建）

```yaml
- action: rebuild
  path: ./backend-go/go.mod
```

**行為**：
1. 監聽 `./backend-go/go.mod` 的變化
2. 當你修改 `go.mod`（例如新增依賴）
3. **停止容器**
4. **重新執行** `docker build -f Dockerfile.dev .`
5. 建置新的 Docker image
6. **啟動新容器**

**類比**：就像「重新安裝應用程式」，整個容器砍掉重練

---

### Q4: 那他是每一次這兩個都會做嗎？

**A: 不是！只會執行「符合條件」的 action**

Docker Compose 會根據**你修改的檔案路徑**，決定要執行哪個 action。

#### 情境 1：修改 `.go` 檔案

```
你修改：backend-go/cmd/server/main.go
```

**觸發的 action**：
- ✅ `action: sync` - 因為 `main.go` 在 `path: ./backend-go` 底下
- ❌ `action: rebuild` - 沒有觸發（因為 `main.go` 不是 `go.mod` 或 `go.sum`）

**結果**：
1. Docker 同步 `main.go` 到容器
2. Air 偵測到變化 → 重新編譯
3. **容器不重啟**

---

#### 情境 2：修改 `go.mod`

```
你修改：backend-go/go.mod
```

**觸發的 action**：
- ❌ `action: sync` - 雖然 `go.mod` 在 `./backend-go` 底下，但...
- ✅ `action: rebuild` - 因為明確指定了 `path: ./backend-go/go.mod`

**結果**：
1. Docker **重新建置** image（執行 `RUN go mod download`）
2. 停止舊容器
3. 啟動新容器
4. **容器完全重啟**

---

#### 情境 3：修改 `README.md`

```
你修改：backend-go/README.md
```

**觸發的 action**：
- ❌ `action: sync` - 因為在 `ignore` 清單中（`"*.md"`）
- ❌ `action: rebuild` - 不符合條件

**結果**：
- 什麼都不做（因為文件檔案不影響程式運行）

---

### 總結對照表

| 修改的檔案 | 觸發的 action | 容器行為 |
|-----------|--------------|---------|
| `main.go` | `sync` | 不重啟，Air 重新編譯 |
| `handler/user.go` | `sync` | 不重啟，Air 重新編譯 |
| `go.mod` | `rebuild` | 完全重啟 |
| `go.sum` | `rebuild` | 完全重啟 |
| `README.md` | （無） | 無動作 |
| `tmp/main` | （無，在 ignore） | 無動作 |

---

### Q5: go.mod 跟 go.sum 是做什麼用的？

**A: Go 的依賴管理檔案（類似 npm 的 package.json）**

---

#### `go.mod` - 依賴清單

**作用**：定義專案的依賴套件及版本

```go
module github.com/yutuo-tech/futuresign_backend

go 1.24.0

require (
    github.com/gin-gonic/gin v1.11.0          // Gin 框架
    gorm.io/gorm v1.31.1                      // GORM ORM
    github.com/golang-jwt/jwt/v5 v5.3.0       // JWT 認證
    github.com/redis/go-redis/v9 v9.17.2      // Redis 客戶端
)

replace (
    github.com/some/package => ./local/package  // 本地替換
)
```

**功能**：
1. **聲明依賴**：需要哪些套件
2. **版本控制**：使用哪個版本
3. **模組名稱**：定義這個專案的 import 路徑

**對應其他語言**：
| Go | Node.js | Python | 說明 |
|----|---------|--------|------|
| `go.mod` | `package.json` | `requirements.txt` | 依賴清單 |

---

#### `go.sum` - 依賴校驗和

**作用**：記錄每個依賴套件的**加密雜湊值**，確保依賴沒被篡改

```
github.com/gin-gonic/gin v1.11.0 h1:abc123...xyz
github.com/gin-gonic/gin v1.11.0/go.mod h1:def456...uvw
gorm.io/gorm v1.31.1 h1:ghi789...rst
gorm.io/gorm v1.31.1/go.mod h1:jkl012...mno
```

**功能**：
1. **安全性**：防止依賴套件被惡意修改
2. **可重現性**：確保所有人下載到的依賴完全一致
3. **完整性檢查**：驗證下載的套件沒有損壞

**對應其他語言**：
| Go | Node.js | Python | 說明 |
|----|---------|--------|------|
| `go.sum` | `package-lock.json` | `poetry.lock` | 鎖定版本 + 校驗和 |

---

### go.mod 和 go.sum 的關係

```
go.mod  = 「我需要哪些套件」
go.sum  = 「這些套件的正確指紋是什麼」
```

**範例**：

1. **你新增依賴**：
   ```bash
   go get github.com/gin-gonic/gin@v1.11.0
   ```

2. **go.mod 更新**：
   ```go
   require github.com/gin-gonic/gin v1.11.0
   ```

3. **go.sum 自動產生**：
   ```
   github.com/gin-gonic/gin v1.11.0 h1:abc123...
   ```

4. **下次別人執行 `go mod download`**：
   - Go 下載 `gin v1.11.0`
   - 計算下載檔案的雜湊值
   - 跟 `go.sum` 比對
   - ✅ 一致 → 安全
   - ❌ 不一致 → 錯誤（可能被篡改）

---

### 為什麼修改 go.mod/go.sum 需要 rebuild？

**因為需要重新下載/安裝依賴**

#### Dockerfile.dev 的建置流程

```dockerfile
# 1. 複製依賴檔案
COPY go.mod go.sum ./

# 2. 下載依賴（這一步很耗時！）
RUN go mod download

# 3. 複製程式碼
COPY . .
```

**情境**：你在 `go.mod` 新增了一個依賴

```diff
require (
    github.com/gin-gonic/gin v1.11.0
+   github.com/google/uuid v1.6.0    // 新增
)
```

**如果只用 sync**：
1. Docker 同步 `go.mod` 到容器
2. 但容器內**沒有執行** `go mod download`
3. Air 嘗試編譯 → **失敗**（找不到 `github.com/google/uuid`）

**使用 rebuild**：
1. Docker **重新執行** `RUN go mod download`
2. 下載 `github.com/google/uuid`
3. 建置新的 image（包含新依賴）
4. 啟動新容器 → 編譯成功 ✅

---

## 實際操作範例

### 範例 1：修改程式碼（sync）

```powershell
# 1. 啟動 watch
docker compose watch backend-go

# 2. 修改檔案
# 編輯 backend-go/internal/handler/user_handler.go
# 加一行 log：
log.Println("Testing hot reload!")

# 3. 儲存檔案
# → Docker Compose 偵測到變化
# → 同步檔案到容器（1 秒內）
# → Air 偵測到變化
# → 重新編譯（5-10 秒）
# → 伺服器自動重啟
# → 你看到新的 log 出現 ✅
```

**Console 輸出**：
```
[docker compose] file changed: backend-go/internal/handler/user_handler.go
[docker compose] syncing...
[air] file changed: /app/internal/handler/user_handler.go
[air] building...
[air] running...
Testing hot reload!
```

---

### 範例 2：新增依賴（rebuild）

```powershell
# 1. 啟動 watch
docker compose watch backend-go

# 2. 新增依賴
cd backend-go
go get github.com/google/uuid@v1.6.0

# 3. go.mod 和 go.sum 自動更新
# → Docker Compose 偵測到 go.mod 變化
# → 停止容器
# → 重新建置 image（可能 1-3 分鐘）
# → 啟動新容器
# → 新依賴可用 ✅
```

**Console 輸出**：
```
[docker compose] file changed: backend-go/go.mod
[docker compose] rebuilding image...
[+] Building 45.2s
[docker compose] restarting container...
[air] running...
```

---

## 最佳實踐

### 1. ignore 設定很重要

```yaml
ignore:
  - tmp           # Air 的暫存目錄（頻繁變動，但不重要）
  - vendor        # Go 依賴目錄（很大，不需要同步）
  - "*.md"        # 文件檔案（不影響程式）
  - "*.log"       # 日誌檔案
  - .git          # Git 目錄
```

**為什麼**：
- 減少不必要的同步
- 提高效能
- 避免無限迴圈（例如 Air 產生的 `tmp/main` 觸發 Air 再次編譯）

---

### 2. 分離關注點

```yaml
# 程式碼變更 → 快速同步
- action: sync
  path: ./backend-go
  target: /app
  ignore:
    - tmp
    - vendor

# 依賴變更 → 完整重建
- action: rebuild
  path: ./backend-go/go.mod

# Dockerfile 變更 → 完整重建
- action: rebuild
  path: ./backend-go/Dockerfile.dev
```

---

### 3. 開發時不要頻繁改 go.mod

**原因**：rebuild 很慢（可能 1-3 分鐘）

**建議**：
- 一次性把需要的依賴都加好
- 或者暫時用本地 `air` 開發（不用 Docker）
- 最後再用 Docker 測試

---

## 總結

| 概念 | 說明 |
|------|------|
| **develop section** | Docker Compose 的開發模式配置 |
| **watch** | 監聽本地檔案變化 |
| **action: sync** | 同步檔案到容器（快，不重啟） |
| **action: rebuild** | 重建 Docker image（慢，完全重啟） |
| **go.mod** | Go 的依賴清單（類似 package.json） |
| **go.sum** | 依賴的校驗和（確保安全性） |
| **Air** | 在容器內監聽檔案變化並重新編譯 |

**完整流程**：
```
修改 main.go
→ Docker Compose (sync)
→ 同步到容器 /app
→ Air 偵測變化
→ 重新編譯
→ 重啟 Go 程式
→ 完成 ⚡
```

---

## Go vs Python 在 Docker 開發環境的差異

### 為什麼 Go 專案需要 Dockerfile.dev？

在你的專案中：
- **Go 專案**：`backend-go/Dockerfile.dev`
- **Python 專案**：`backend/Dockerfile`（沒有 .dev）

這是因為 **Go 和 Python 的執行方式根本不同**。

---

### 語言特性差異

| 特性 | Go (編譯型語言) | Python (直譯型語言) |
|------|----------------|-------------------|
| **執行方式** | 先編譯成執行檔 → 執行 | 直接執行原始碼 |
| **編譯時間** | 每次修改需重新編譯（5-30 秒） | 無需編譯 |
| **熱重載工具** | 需要 Air（偵測→編譯→重啟） | uvicorn/FastAPI 內建 `--reload` |
| **Docker 複雜度** | 開發環境需要編譯工具 | 開發和生產環境類似 |

---

### Go 專案的 Dockerfile.dev

```dockerfile
# backend-go/Dockerfile.dev
FROM golang:1.25-alpine

# ✅ 安裝開發工具（生產環境不需要）
RUN apk add --no-cache git ca-certificates tzdata wget

# ✅ 安裝 Air 熱重載工具
RUN go install github.com/air-verse/air@latest

WORKDIR /app

# 複製依賴檔案
COPY go.mod go.sum ./
RUN go mod download

# 複製程式碼
COPY . .

# ✅ 使用 Air 啟動（開發模式）
CMD ["air", "-c", ".air.toml"]
```

**為什麼需要 .dev 版本？**

1. **安裝 Air**：生產環境不需要 Air，只需要編譯好的執行檔
2. **包含原始碼**：開發時需要原始碼在容器內以便重新編譯
3. **使用 Alpine + 開發工具**：需要 git 等工具來下載依賴

---

### Go 專案的 Dockerfile（生產環境）

```dockerfile
# backend-go/Dockerfile
# Stage 1: Build
FROM golang:1.25-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# ✅ 編譯成單一執行檔
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o server ./cmd/server/main.go

# Stage 2: Runtime
FROM alpine:latest

# ✅ 只複製編譯好的執行檔（沒有原始碼！）
COPY --from=builder /app/server /server

# ✅ 直接執行執行檔（不需要 Air）
CMD ["/server"]
```

**生產環境特點**：
- ❌ 沒有 Air
- ❌ 沒有原始碼
- ❌ 沒有 go 編譯器
- ✅ 只有編譯好的執行檔（10-50 MB）
- ✅ 啟動超快（毫秒級）
- ✅ 安全性高（攻擊者看不到原始碼）

---

### Python 專案的 Dockerfile（通用）

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 安裝依賴
COPY pyproject.toml requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY . .

# ✅ 使用 uvicorn 啟動
# 開發：uvicorn --reload（自動重載）
# 生產：uvicorn（一般模式）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**為什麼 Python 不需要 .dev 版本？**

1. **無需編譯**：Python 直接執行 `.py` 檔案
2. **內建熱重載**：FastAPI/uvicorn 有 `--reload` 參數
3. **環境類似**：開發和生產都需要 Python runtime
4. **差異小**：只需要切換 `--reload` 參數

---

### docker-compose.yml 中的差異

#### Go 專案（backend-go）

```yaml
backend-go:
  build:
    context: ./backend-go
    dockerfile: Dockerfile.dev    # ← 明確指定開發用 Dockerfile
  develop:
    watch:
      - action: sync              # ← 同步原始碼
        path: ./backend-go
        target: /app
      - action: rebuild           # ← go.mod 改變時重建
        path: ./backend-go/go.mod
```

**為什麼這樣設計？**
- Go 需要**編譯**，所以開發環境要能重新編譯
- 使用 `Dockerfile.dev` 確保容器內有編譯工具
- 修改 `.go` 檔案 → sync → Air 重新編譯
- 修改 `go.mod` → rebuild（需要重新下載依賴）

---

#### Python 專案（backend）

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile        # ← 沒有 .dev，通用 Dockerfile
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # ← 加 --reload
  develop:
    watch:
      - action: sync              # ← 只需要同步
        path: ./backend/app
        target: /app/app
      - action: rebuild           # ← requirements.txt 改變時重建
        path: ./backend/requirements.txt
```

**為什麼這樣設計？**
- Python **不需要編譯**，直接執行就好
- 使用同一個 `Dockerfile`，通過 `command` 覆蓋啟動指令
- 開發時加 `--reload`，生產時不加
- 修改 `.py` 檔案 → sync → uvicorn 自動重載（無需重啟容器）

---

### 完整對比表

| 項目 | Go (編譯型) | Python (直譯型) |
|------|------------|----------------|
| **Dockerfile 數量** | 2 個（Dockerfile, Dockerfile.dev） | 1 個（Dockerfile） |
| **開發工具** | Air（需額外安裝） | uvicorn --reload（內建） |
| **編譯需求** | ✅ 需要（每次修改都要重編譯） | ❌ 不需要 |
| **容器內容（開發）** | 原始碼 + 編譯器 + Air | 原始碼 + Python runtime |
| **容器內容（生產）** | 只有執行檔（無原始碼） | 原始碼 + Python runtime |
| **檔案修改後** | sync → Air 偵測 → 編譯 → 重啟 | sync → uvicorn 偵測 → 重載 |
| **重載速度** | 較慢（需編譯，5-30 秒） | 快（直接載入，1-3 秒） |
| **Docker image 大小（生產）** | 小（10-50 MB） | 大（200-500 MB） |
| **啟動速度** | 極快（毫秒級） | 較慢（秒級） |
| **依賴檔案改變** | 需 rebuild（重新 go mod download） | 需 rebuild（重新 pip install） |

---

### 為什麼 Go 需要兩個 Dockerfile？

#### 原因 1：編譯環境 vs 執行環境

**開發環境**（Dockerfile.dev）：
```dockerfile
FROM golang:1.25-alpine          # ← 包含 Go 編譯器（~300 MB）
RUN go install github.com/air-verse/air@latest
CMD ["air", "-c", ".air.toml"]   # ← 執行 Air（會重新編譯）
```

**生產環境**（Dockerfile）：
```dockerfile
FROM alpine:latest               # ← 只有基礎系統（~5 MB）
COPY --from=builder /app/server /server  # ← 只複製執行檔
CMD ["/server"]                  # ← 直接執行
```

#### 原因 2：安全性

| 環境 | 包含內容 | 風險 |
|------|---------|------|
| **開發** | 原始碼 + 編譯器 + 開發工具 | 🟡 中（內網使用） |
| **生產** | 只有執行檔 | 🟢 低（攻擊者看不到原始碼） |

#### 原因 3：效能

| 環境 | Image 大小 | 啟動時間 |
|------|-----------|---------|
| **開發** | ~500 MB | ~1-2 秒（需載入 Air） |
| **生產** | ~20 MB | ~10 毫秒 |

---

### Python 為什麼不需要兩個 Dockerfile？

#### 原因 1：執行方式相同

```python
# 開發環境
uvicorn app.main:app --reload    # 有自動重載

# 生產環境
uvicorn app.main:app             # 沒有自動重載
```

**差異只是一個參數**，不需要不同的 Dockerfile。

#### 原因 2：都需要 Python runtime

| 環境 | 需要的東西 |
|------|-----------|
| **開發** | Python runtime + 原始碼 + 依賴 |
| **生產** | Python runtime + 原始碼 + 依賴 |

**完全一樣！** 只是啟動指令不同。

#### 原因 3：可以用環境變數切換

```yaml
# docker-compose.yml
backend:
  environment:
    - UVICORN_RELOAD=${RELOAD:-false}   # 開發時設為 true
  command: >
    sh -c "
      if [ '$UVICORN_RELOAD' = 'true' ]; then
        uvicorn app.main:app --reload
      else
        uvicorn app.main:app
      fi
    "
```

---

### 本專案的實際配置

#### docker-compose.yml（staging/production）

```yaml
backend-go:
  build:
    context: ./backend-go
    dockerfile: Dockerfile.dev    # ← 開發用
  develop:
    watch:                        # ← 開發時用 watch
      - action: sync

backend:
  build:
    context: ./backend
    dockerfile: Dockerfile        # ← 通用（無 .dev）
  command: uvicorn app.main:app --reload  # ← 開發時加 --reload
  develop:
    watch:
      - action: sync
```

---

### 總結：何時需要 Dockerfile.dev？

| 語言/框架 | 需要 .dev？ | 原因 |
|----------|-----------|------|
| **Go** | ✅ 需要 | 編譯型，開發需編譯器 + Air |
| **Rust** | ✅ 需要 | 編譯型，開發需編譯器 + cargo-watch |
| **Java** | ✅ 需要 | 編譯型，開發需 JDK + spring-devtools |
| **Python** | ❌ 不需要 | 直譯型，uvicorn --reload 即可 |
| **Node.js** | ❌ 不需要 | 直譯型，nodemon 即可 |
| **Ruby** | ❌ 不需要 | 直譯型，rerun 即可 |

**判斷標準**：
- **編譯型語言** → 需要 .dev（開發環境要能編譯）
- **直譯型語言** → 不需要 .dev（執行環境都一樣）

---

### 實際範例：查看專案結構

#### Go 專案（backend-go）
```
backend-go/
├── Dockerfile          ← 生產環境（multi-stage build，只有執行檔）
├── Dockerfile.dev      ← 開發環境（包含 Air + 編譯器）
├── .air.toml           ← Air 配置檔
└── docker-compose.yml  ← 指定 dockerfile: Dockerfile.dev
```

#### Python 專案（backend）
```
backend/
├── Dockerfile          ← 通用（開發和生產都用這個）
└── docker-compose.yml  ← 通過 command 覆蓋啟動指令
```

這就是為什麼你在 Go 專案中看到 `.dev` 相關的 Docker 設定，而 Python 專案沒有！
