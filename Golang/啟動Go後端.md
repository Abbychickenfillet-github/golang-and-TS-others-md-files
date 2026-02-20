# 啟動 Go 後端

## 使用 Docker Compose

### 啟動 Go 後端（開發模式）
```bash
docker compose watch backend-go
```

### 啟動 Go 後端（一般模式）
```bash
docker compose up backend-go
```

### 停止服務
```bash
docker compose down backend-go
```

## Hot Reload 說明

| 指令 | Hot Reload | 說明 |
|------|------------|------|
| `docker compose up backend-go` | ❌ | 改 code 要重啟容器 |
| `docker compose watch backend-go` | ✅ | 監聽檔案變化，自動重載 |

## 本地開發（不用 Docker）

```bash
cd backend-go

# 直接執行（無 hot reload）
go run cmd/server/main.go

# 使用 Air（有 hot reload）
go install github.com/air-verse/air@latest
air
```

---

## Hot Reload 相關檔案

Go 開發環境的 hot reload 需要兩個檔案：

### 1. `Dockerfile.dev` - 開發用 Docker 映像

位置：`backend-go/Dockerfile.dev`

```dockerfile
FROM golang:1.24-alpine

# 安裝開發依賴
RUN apk add --no-cache git ca-certificates tzdata wget

WORKDIR /app

# 安裝 Air（hot reload 工具）
RUN go install github.com/air-verse/air@latest

# 複製依賴檔案
COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 8080

# 使用 Air 啟動
CMD ["air", "-c", ".air.toml"]
```

**與 `Dockerfile` 的差異：**
| 項目 | Dockerfile (生產) | Dockerfile.dev (開發) |
|------|------------------|----------------------|
| 基礎映像 | `scratch` (極小) | `golang:1.24-alpine` |
| 大小 | ~10MB | ~500MB |
| Hot Reload | ❌ | ✅ (Air) |
| 用途 | 部署 | 開發 |

### 2. `.air.toml` - Air 設定檔

位置：`backend-go/.air.toml`

```toml
root = "."
tmp_dir = "tmp"

[build]
  # 編譯指令
  cmd = "go build -o ./tmp/main ./cmd/server/main.go"
  # 編譯後的執行檔
  bin = "./tmp/main"
  # 延遲時間（毫秒），避免頻繁重編譯
  delay = 1000
  # 排除的目錄
  exclude_dir = ["assets", "tmp", "vendor", "testdata", "tests"]
  # 排除測試檔案
  exclude_regex = ["_test.go"]
  # 監聽的副檔名
  include_ext = ["go", "tpl", "tmpl", "html"]

[color]
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false

[misc]
  clean_on_exit = false
```

**重要設定說明：**

| 設定 | 說明 |
|------|------|
| `cmd` | 編譯指令，產生執行檔 |
| `bin` | 編譯後的執行檔路徑 |
| `delay` | 偵測到變化後等待多久才重編譯（避免存檔多次觸發） |
| `exclude_dir` | 不監聽的目錄（如 tmp、vendor） |
| `include_ext` | 只監聽這些副檔名的變化 |

---

## 注意事項

1. **不要同時啟動 Python 和 Go 後端**，它們可能會使用相同的 port

2. **確認 docker-compose.yml 設定**：
   - `backend` = Python 後端
   - `backend-go` = Go 後端

3. **環境變數**：Go 後端會讀取 `.env` 檔案中的設定

## Port 對照

| 服務 | Port |
|------|------|
| Python backend | `localhost:8004` |
| Go backend | `localhost:8003` |
| Frontend | `localhost:5005` |

## 常用指令比較

| 動作 | Python 後端 | Go 後端 |
|------|------------|---------|
| 開發模式 | `docker compose watch backend` | `docker compose watch backend-go` |
| 一般啟動 | `docker compose up backend` | `docker compose up backend-go` |
| 查看 logs | `docker compose logs backend` | `docker compose logs backend-go` |

## 完整啟動（含資料庫和前端）

```bash
# 啟動所有服務（使用 Go 後端）
docker compose up db backend-go frontend

# 開發模式（會自動重載）
docker compose watch backend-go
```
