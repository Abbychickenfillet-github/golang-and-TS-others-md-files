# Docker Compose 模式解釋

## 目錄
1. [輸出訊息解讀](#1-輸出訊息解讀)
2. [術語釐清](#術語釐清)（編譯 vs 建置、服務 vs 微服務、容器 vs 服務）
3. [Network 是什麼？](#2-network-是什麼)
4. [Docker Compose 指令比較](#3-docker-compose-指令比較)
5. [Watch 模式詳解](#4-watch-模式詳解)
6. [Health Check 說明](#5-health-check-說明)
7. [常用指令速查](#6-常用指令速查)

---

## 1. 輸出訊息解讀

```
[+] Running 4/4
 ✔ template-backend-go              Built                 0.0s
 ✔ Network template_default         Created               0.2s
 ✔ Container template-redis-1       Healthy              12.0s
 ✔ Container template-backend-go-1  Started              11.9s
Watch enabled
```

### 這 4 個都是「服務」嗎？

**不是！** 只有 2 個是微服務：

| 項目 | 類型 | 說明 |
|------|------|------|
| `template-backend-go Built` | 🔨 建置步驟 | 編譯映像檔，不是服務 |
| `Network template_default` | 🌐 基礎設施 | 虛擬網路，不是服務 |
| `Container template-redis-1` | ✅ **服務** | Redis 快取服務 |
| `Container template-backend-go-1` | ✅ **服務** | Go 後端 API 服務 |

### 狀態意義

| 狀態 | 說明 |
|------|------|
| **Built** | 映像檔已建置完成（或使用快取） |
| **Created** | 網路/資源已建立 |
| **Healthy** | 容器通過健康檢查 |
| **Started** | 容器已啟動 |
| **Watch enabled** | 檔案監控模式已啟用 |

---

## 術語釐清

> **為什麼需要這個章節？**
>
> 因為在 Docker 的世界裡，「服務」「容器」「微服務」這些詞常常混著用，
> 導致學習時容易混淆。這裡統一釐清它們的關係。

---

### 編譯 (Compile) = 建置 (Built)？

**不完全相同：**

| 術語 | 英文 | 說明 |
|------|------|------|
| **編譯 (Compile)** | Compile | 把原始碼轉成機器碼（如 `go build`） |
| **建置 (Build)** | Build | 更廣義：包含編譯 + 打包 + 產生映像檔 |

**Build（建置）的完整流程：**
```
┌─────────────────────────────────────────────┐
│ 1. 複製原始碼                                │
│ 2. 安裝依賴 (go mod download)               │
│ 3. 編譯 (go build) ← 這才是 Compile         │
│ 4. 打包成 Docker 映像檔                      │
└─────────────────────────────────────────────┘
            ↓
      Built 完成 ✔
```

**簡單說：**
- **編譯 (Compile)** = 把 `.go` 變成執行檔
- **建置 (Build)** = 編譯 + 打包成 Docker 映像檔

所以 `Built` 是指「整個建置流程完成」，不只是編譯。

---

### 服務 (Service) = 微服務 (Microservice)？

**不完全相同，但在 Docker Compose 語境下常互換使用：**

| 術語 | 英文 | 說明 |
|------|------|------|
| **服務 (Service)** | Service | 泛指任何運行中的應用程式 |
| **微服務 (Microservice)** | Microservice | 一種架構風格：把大系統拆成多個小服務 |

**關係圖：**
```
微服務架構 (Microservice Architecture)
    │
    ├── 服務 A（用戶服務）     ← 這是一個 Service
    ├── 服務 B（訂單服務）     ← 這也是一個 Service
    ├── 服務 C（Redis 快取）   ← 這也是一個 Service
    └── ...
```

**在 docker-compose.yml 裡：**
```yaml
services:        # ← 這裡定義的每個項目都是「服務」
  backend-go:    # ← 服務 1
  redis:         # ← 服務 2
  frontend:      # ← 服務 3
```

**結論：**
- 如果這些服務是**獨立、可單獨部署**的 → 符合「微服務架構」
- Docker Compose 裡的 `services` 就是在定義多個服務

---

### 容器 (Container) = 服務 (Service)？

**不相同！但有密切關係：**

| 術語 | 英文 | 說明 |
|------|------|------|
| **映像檔 (Image)** | Image | 靜態的打包檔案（像是安裝光碟） |
| **容器 (Container)** | Container | 映像檔的運行實例（像是安裝後的程式） |
| **服務 (Service)** | Service | Docker Compose 的抽象概念，可包含多個容器 |

---

### 重點：一個服務可以有多個容器

**為什麼一個服務需要多個容器？**

當流量變大時，可以「水平擴展」—— 啟動多個相同的容器來分擔負載：

```
┌─────────────────────────────────────────────────────────┐
│                 backend-go 服務 (Service)               │
│                                                         │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│   │ 容器 1      │   │ 容器 2      │   │ 容器 3      │  │
│   │ port:8001   │   │ port:8002   │   │ port:8003   │  │
│   └─────────────┘   └─────────────┘   └─────────────┘  │
│         ↑                 ↑                 ↑          │
│         └─────────────────┴─────────────────┘          │
│              Load Balancer 分配流量到不同容器           │
└─────────────────────────────────────────────────────────┘
```

**實際設定：**
```yaml
services:
  backend-go:          # ← 這是「服務」
    image: my-backend  # ← 這是「映像檔」
    deploy:
      replicas: 3      # ← 啟動 3 個「容器」(實例)
```

---

### Redis 能單獨部署嗎？它是服務還是容器？

**Redis 既是服務，也運行在容器裡！**

| 問題 | 答案 |
|------|------|
| Redis 能單獨部署嗎？ | ✅ **可以！** Redis 是完整的獨立軟體 |
| Redis 是服務嗎？ | ✅ **是！** 在 docker-compose.yml 裡定義為一個 service |
| Redis 是容器嗎？ | ✅ **也是！** 它運行在一個 container 裡 |

**Redis 單獨部署的例子：**
```yaml
# 可以只有 Redis，不需要其他服務
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**為什麼會混淆？**

因為 Redis 看起來像是「輔助工具」，但它其實是：
- 一個**完整的獨立軟體**（可以單獨安裝、單獨運行）
- 一個**服務**（在 docker-compose.yml 裡定義）
- 運行在一個**容器**裡（Docker 啟動的實例）

**同樣的邏輯也適用於：**
| 軟體 | 能單獨部署？ | 是服務？ | 是容器？ |
|------|-------------|---------|---------|
| Redis | ✅ | ✅ | ✅ |
| PostgreSQL | ✅ | ✅ | ✅ |
| Nginx | ✅ | ✅ | ✅ |
| 你的 backend-go | ✅ | ✅ | ✅ |

---

### 簡單比喻

| 概念 | 比喻 |
|------|------|
| **映像檔 (Image)** | 蛋糕食譜 |
| **容器 (Container)** | 照著食譜做出來的蛋糕（可以做很多個） |
| **服務 (Service)** | 「蛋糕部門」（管理所有蛋糕的產出） |

---

### 總結

| 情況 | 服務數量 | 容器數量 |
|------|---------|---------|
| 一般開發（replicas=1） | 1 服務 | 1 容器 |
| 水平擴展（replicas=3） | 1 服務 | 3 容器 |
| 本專案 | 2 服務 (backend-go, redis) | 2 容器 |

**結論：**
- 一個**服務**可以有多個**容器**（水平擴展）
- 每個**容器**都是從同一個**映像檔**啟動的
- Redis **是服務**，也**運行在容器裡**，而且**可以單獨部署**
- 在簡單情況下（replicas=1），一個服務 ≈ 一個容器

### 微服務 vs 基礎設施

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │     │  Backend    │     │   Redis     │
│  (服務 1)   │ ──> │  (服務 2)   │ ──> │  (服務 3)   │
│  port:5173  │     │  port:8003  │     │  port:6382  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      └───────────────────┴───────────────────┘
                          │
                 Network（基礎設施，不是服務）
```

- **服務** = 獨立運行的應用程式（可單獨啟動、停止、擴展）
- **網路** = 基礎設施（讓服務之間可以通訊）
- **Built** = 建置動作（把程式碼打包成映像檔）

---

## 2. Network 是什麼？

### 定義
Docker 自動建立的**虛擬網路**，讓同一個 `docker-compose.yml` 裡的容器可以互相溝通。

### 命名規則
```
{資料夾名稱}_default → template_default
```

### 網路架構圖

```
┌─────────────────── template_default 網路 ───────────────────┐
│                                                              │
│   ┌─────────────────┐         ┌─────────────────┐          │
│   │  backend-go     │ ──────> │  redis          │          │
│   │                 │         │                 │          │
│   │  用 redis:6382  │         │  port: 6382     │          │
│   │  就能連線       │         │                 │          │
│   └─────────────────┘         └─────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 為什麼要用服務名稱而不是 IP？

```go
// ❌ 用 Docker IP（每次啟動可能不同）
redis.Connect("172.18.0.2:6382")

// ✅ 用服務名稱（Docker 內建 DNS 自動解析）
redis.Connect("redis:6382")
```

Docker Network 提供**內建 DNS**，自動把服務名稱解析成正確的容器 IP。

### IP 類型快速對照

| IP 類型 | 範例 | 誰能連？ | 譬喻 |
|---------|------|----------|------|
| **localhost** | `127.0.0.1` | 只有自己 | 「我心裡想的事」 |
| **LAN IP** | `192.168.1.50` | 同一網路內的人 | 「我在辦公室大喊」 |
| **Docker IP** | `172.18.0.2` | Host 電腦 + 容器 | 「透過對講機跟房間裡的人說話」 |

> 詳細說明請參考：[Network_and_Gateway_Notes.md](../Network_and_Gateway_Notes.md)

---

## 3. Docker Compose 指令比較

| 指令 | 執行位置 | 檔案監控 | 自動同步 | 適合用途 |
|------|----------|----------|----------|----------|
| `docker compose up` | 前景 | ❌ | ❌ | 快速測試 |
| `docker compose up -d` | 背景 | ❌ | ❌ | 部署/長時間運行 |
| `docker compose watch` | 前景 | ✅ | ✅ | **開發推薦** |

### 詳細說明

#### `docker compose up`
```bash
docker compose up
```
- 啟動所有服務，佔用終端機
- `Ctrl+C` 停止所有容器

#### `docker compose up -d`
```bash
docker compose up -d
```
- `-d` = detached（背景執行）
- 啟動後立即返回命令列

#### `docker compose watch` ⭐
```bash
docker compose watch
```
- **檔案監控 + 自動同步**
- 修改程式碼時，自動同步到容器內
- 搭配 `air` 實現熱更新

---

## 4. Watch 模式詳解

### Watch 做了什麼？

```
你的電腦                         Docker 容器
┌─────────────┐                 ┌─────────────┐
│ main.go     │  ──同步──>      │ main.go     │
│ (修改)      │                 │ (自動更新)  │
└─────────────┘                 └─────────────┘
                                      │
                                      ▼
                               自動重新編譯/重啟
```

### Watch 的三種動作

在 `docker-compose.yml` 中設定：

```yaml
services:
  backend-go:
    develop:
      watch:
        # 1. sync - 同步檔案（不重啟）
        - action: sync
          path: ./internal
          target: /app/internal

        # 2. rebuild - 重新建置映像檔
        - action: rebuild
          path: ./go.mod

        # 3. sync+restart - 同步後重啟容器
        - action: sync+restart
          path: ./config
          target: /app/config
```

| 動作 | 說明 | 使用時機 |
|------|------|----------|
| `sync` | 只同步檔案 | 搭配熱更新工具（如 air） |
| `rebuild` | 重建整個映像檔 | 依賴變更（go.mod, package.json） |
| `sync+restart` | 同步後重啟容器 | 設定檔變更 |

### `action: sync` 詳細說明

```yaml
- action: sync
  path: ./internal
  target: /app/internal
```

**這個 `sync` 跟 `uv sync` 有關係嗎？**

**完全沒有關係！** 它們是不同的東西：

| 指令 | 屬於 | 功能 |
|------|------|------|
| `action: sync` | Docker Compose Watch | 把本機檔案同步到容器內 |
| `uv sync` | uv（Python 套件管理器） | 安裝 Python 依賴套件 |

**`action: sync` 的意思：**
- `path: ./internal` = 監控本機的 `./internal` 資料夾
- `target: /app/internal` = 同步到容器內的 `/app/internal`
- 當你修改 `./internal/handler/user.go`，Docker 會自動複製到容器內
- 搭配 `air`（Go 熱更新工具），容器內會自動重新編譯

**流程圖：**
```
你修改 ./internal/handler/user.go
           │
           ▼
Docker Watch 偵測到變更
           │
           ▼
action: sync 把檔案複製到容器 /app/internal/handler/user.go
           │
           ▼
容器內的 air 偵測到變更
           │
           ▼
air 自動重新編譯 Go 程式
```

---

## 5. Health Check 說明

輸出中的 `Healthy` 表示容器通過了健康檢查：

```yaml
# docker-compose.yml 中的設定
services:
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s    # 每 10 秒檢查一次
      timeout: 5s      # 超過 5 秒視為失敗
      retries: 3       # 連續失敗 3 次標記為 unhealthy
```

### 依賴健康檢查

```yaml
services:
  backend-go:
    depends_on:
      redis:
        condition: service_healthy  # 等 redis 健康才啟動
```

---

## 6. 常用指令速查

| 用途 | 指令 |
|------|------|
| 開發（推薦） | `docker compose watch` |
| 背景執行 | `docker compose up -d` |
| 重新建置 | `docker compose up -d --build` |
| 查看日誌 | `docker compose logs -f backend-go` |
| 停止服務 | `docker compose down` |
| 停止並清除資料 | `docker compose down -v` |

> ⚠️ `docker compose down -v` 會刪除 volumes，資料庫資料會被清除！

---

*建立日期：2026-01-21*
