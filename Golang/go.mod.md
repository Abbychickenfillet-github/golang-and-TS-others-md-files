# go.mod 是什麼？

> 建立日期: 2026-01-20

---

## 一句話解釋

**go.mod = Go 專案的依賴管理檔案，類似於 Node.js 的 `package.json`**

---

## 類比

| Go | Node.js | Python |
|----|---------|--------|
| `go.mod` | `package.json` | `requirements.txt` |
| `go.sum` | `package-lock.json` | `requirements.lock` |

---

## go.mod 結構解析

以我們專案的 `backend-go/go.mod` 為例：

```go
// 1. 模組名稱（專案的唯一識別）
module github.com/yutuo-tech/futuresign_backend

// 2. Go 版本
go 1.24.0

// 3. 工具鏈版本（可選）
toolchain go1.24.11

// 4. 直接依賴（你 import 的套件）
require (
    github.com/gin-gonic/gin v1.11.0        // Web 框架
    gorm.io/gorm v1.31.1                    // ORM
    github.com/golang-jwt/jwt/v5 v5.3.0     // JWT 認證
    github.com/shopspring/decimal v1.4.0    // 精確小數計算
    // ...
)

// 5. 間接依賴（依賴的依賴）
require (
    github.com/gin-contrib/sse v1.1.0 // indirect
    // ...
)
```

---

## 各部分說明

### 1. module（模組名稱）

```go
module github.com/yutuo-tech/futuresign_backend
```

- 專案的唯一識別名稱
- 通常是 GitHub 路徑
- 其他專案 import 你的套件時會用這個名稱

**範例：** 在程式碼中這樣 import
```go
import "github.com/yutuo-tech/futuresign_backend/internal/models"
```

---

### 2. go（Go 版本）

```go
go 1.24.0
```

- 指定專案需要的最低 Go 版本
- 編譯時會檢查

---

### 3. require（依賴）

```go
require (
    github.com/gin-gonic/gin v1.11.0
    gorm.io/gorm v1.31.1
)
```

- 列出專案使用的套件和版本
- 格式：`套件路徑 版本號`

**版本號格式：**
| 格式 | 說明 | 範例 |
|------|------|------|
| `vX.Y.Z` | 正式版本 | `v1.11.0` |
| `vX.Y.Z-xxx` | 預發布版本 | `v1.0.0-beta.1` |
| `vX.Y.Z-date-hash` | 偽版本（無 tag）| `v0.0.0-20200823014737-9f7001d12a5f` |

---

### 4. indirect（間接依賴）

```go
require (
    github.com/gin-contrib/sse v1.1.0 // indirect
)
```

- `// indirect` 表示這是「間接依賴」
- 你沒有直接 import，但你的依賴需要它
- 例如：你用 Gin，Gin 用 SSE

---

## go.sum 是什麼？

`go.sum` 記錄每個依賴的 **校驗碼（checksum）**，確保下載的套件沒有被篡改。

```
github.com/gin-gonic/gin v1.11.0 h1:...
github.com/gin-gonic/gin v1.11.0/go.mod h1:...
```

**重要：** `go.sum` 應該要 commit 進 Git！

---

## 常用指令

| 指令 | 說明 |
|------|------|
| `go mod init <module>` | 初始化新專案 |
| `go mod tidy` | 整理依賴（移除未用的、加入缺少的）|
| `go mod download` | 下載所有依賴 |
| `go get <package>` | 新增/更新依賴 |
| `go get <package>@latest` | 更新到最新版 |
| `go get <package>@v1.2.3` | 更新到指定版本 |
| `go mod verify` | 驗證依賴的校驗碼 |
| `go mod graph` | 顯示依賴關係圖 |

---

## 實際操作範例

### 初始化新專案

```bash
mkdir myproject
cd myproject
go mod init github.com/username/myproject
```

這會建立 `go.mod`：
```go
module github.com/username/myproject

go 1.24
```

---

### 新增依賴

```bash
# 方法 1：直接在程式碼中 import，然後執行 go mod tidy
go mod tidy

# 方法 2：用 go get 安裝
go get github.com/gin-gonic/gin
```

---

### 更新依賴

```bash
# 更新單一套件到最新
go get -u github.com/gin-gonic/gin

# 更新所有依賴
go get -u ./...

# 更新到指定版本
go get github.com/gin-gonic/gin@v1.10.0
```

---

### 移除未使用的依賴

```bash
go mod tidy
```

---

## 我們專案的主要依賴

| 套件 | 用途 |
|------|------|
| `github.com/gin-gonic/gin` | Web 框架 |
| `gorm.io/gorm` | ORM（資料庫操作）|
| `gorm.io/driver/mysql` | MySQL 驅動 |
| `github.com/golang-jwt/jwt/v5` | JWT 認證 |
| `github.com/shopspring/decimal` | 精確金額計算 |
| `github.com/redis/go-redis/v9` | Redis 客戶端 |
| `github.com/aws/aws-sdk-go-v2` | AWS S3 上傳 |
| `github.com/stretchr/testify` | 測試工具 |
| `github.com/swaggo/swag` | Swagger 文件生成 |

---

## 常見問題

### Q: go.mod 要 commit 嗎？
**A:** 是的，`go.mod` 和 `go.sum` 都要 commit。

---

### Q: go.mod 和 go.sum 差別？
| 檔案 | 內容 | 用途 |
|------|------|------|
| `go.mod` | 依賴列表和版本 | 定義需要什麼 |
| `go.sum` | 校驗碼 | 驗證下載的是正確的 |

---

### Q: 為什麼有 `// indirect`？
**A:** 你的依賴（例如 Gin）也有自己的依賴。Go 會自動追蹤這些「間接依賴」並記錄在 `go.mod` 中，確保版本一致性。

---

### Q: 版本號前面的 `v` 是必要的嗎？
**A:** 是的！Go modules 要求版本號必須以 `v` 開頭。

```go
// ✅ 正確
require github.com/gin-gonic/gin v1.11.0

// ❌ 錯誤
require github.com/gin-gonic/gin 1.11.0
```

---

## 總結

```
go.mod = 專案依賴清單
go.sum = 依賴校驗碼（確保安全）

go mod tidy = 最常用指令（整理依賴）
```
