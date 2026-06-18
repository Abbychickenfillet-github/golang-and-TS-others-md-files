# Golang Handler Imports 解析

為什麼 test 檔案的 import 比正常 handler 多這麼多？為什麼不是每個 handler 都 import dto？

> 相關筆記：
> - [後端 DTO 角色與三層架構](後端DTO角色與三層架構.md) — Handler / Service / Repository 各層職責
> - [cmd/server vs internal/handler](cmd-server-vs-internal-handler.md) — main.go 與 handler 的關係
> - [Gin 框架筆記](Gin框架筆記.md) — Gin 的 `c.JSON()`、`c.ShouldBindJSON()` 等封裝
> - [context.Context 筆記](context-context.md) — context 的完整說明
> - [json.RawMessage 筆記](json-raw-message.md) — `encoding/json` 與 `json.RawMessage` 的用法
> - [mock-test-file-param](mock-test-file-param.md) — 測試檔案的參數與建構方式
> - [interface 與依賴注入](interface-dependency-injection.md) — main.go 組裝依賴的原理

---

## 正常 Handler vs 測試檔案 import 比較

### 正常 Handler（`booth_product_handler.go`）

```go
import (
    "net/http"                    // Go 原生：HTTP 狀態碼（200、400、404）
    "strconv"                     // Go 原生：字串轉數字（"0" → 0）

    "github.com/gin-gonic/gin"                                   // Gin 框架
    "github.com/yutuo-tech/futuresign_backend/internal/dto"       // 請求/回應結構
    "github.com/yutuo-tech/futuresign_backend/internal/middleware" // 認證中介軟體
    "github.com/yutuo-tech/futuresign_backend/internal/models"    // 資料模型
    "github.com/yutuo-tech/futuresign_backend/internal/service"   // 商業邏輯
)
```

**只有 7 個 import** — 因為正常 handler 只需要：
1. 接收 HTTP 請求（gin）
2. 解析參數（dto）
3. 檢查權限（middleware）
4. 呼叫 Service（service）
5. 回傳 JSON（net/http 的狀態碼）

### 測試檔案（`auth_handler_ratelimit_test.go`）

```go
import (
    "context"              // Go 原生：建立空的 context 給函式用
    "encoding/json"        // Go 原生：手動組裝 JSON（Marshal / Unmarshal）
    "net/http"             // Go 原生：HTTP 狀態碼 + 方法常數
    "net/http/httptest"    // Go 原生：模擬假的 HTTP 請求和回應
    "net/url"              // Go 原生：組裝 URL 查詢參數
    "strings"              // Go 原生：字串操作（NewReader 把字串變 io.Reader）
    "testing"              // Go 原生：測試框架（t *testing.T）

    "github.com/gin-gonic/gin"                                      // Gin 框架
    "github.com/yutuo-tech/futuresign_backend/internal/config"      // 設定檔
    "github.com/yutuo-tech/futuresign_backend/internal/database"    // 資料庫連線
    "github.com/yutuo-tech/futuresign_backend/internal/dto"         // DTO
    "github.com/yutuo-tech/futuresign_backend/internal/middleware"   // 中介軟體
    "github.com/yutuo-tech/futuresign_backend/internal/repository"  // 資料存取層
    "github.com/yutuo-tech/futuresign_backend/internal/service"     // 商業邏輯層
    "gorm.io/gorm"                                                   // GORM ORM
)
```

**多了 10 個 import** — 因為測試檔要自己建造整個環境。

---

## 為什麼測試檔案 import 這麼多？

正常 handler 的依賴是 [`main.go` 幫它組裝好的](cmd-server-vs-internal-handler.md)，handler 只負責「接電話」：

```
main.go 組裝：config → database → gorm → repository → service → handler
                                                                   ↑
                                                        handler 只知道這裡
```

但測試檔案**沒有 main.go**，它必須自己建造整個環境：

```go
// 測試檔案自己當 main.go
cfg := config.LoadTestConfig()              // ← 需要 config
db := database.SetupTestDB(cfg)             // ← 需要 database
repo := repository.NewUserRepository(db)    // ← 需要 repository + gorm
svc := service.NewAuthService(repo, cfg)    // ← 需要 service
handler := NewAuthHandler(svc)              // ← 終於建出 handler

// 還要模擬 HTTP 請求
w := httptest.NewRecorder()                 // ← 需要 httptest（假的回應記錄器）
body := `{"email":"test@test.com"}`
req := httptest.NewRequest("POST", "/login",
    strings.NewReader(body))                // ← 需要 strings（字串→Reader）
req.Header.Set("Content-Type", "application/json")

// 解析回應
var result map[string]interface{}
json.Unmarshal(w.Body.Bytes(), &result)     // ← 需要 encoding/json
```

一句話：**正常 handler 有管家（[main.go](cmd-server-vs-internal-handler.md)），測試檔案要自己當管家。**
詳見 [interface 與依賴注入](interface-dependency-injection.md) 瞭解 main.go 組裝依賴的原理。

---

## 每個 Go 原生 import 做什麼

### 正常 handler 常用

| 套件 | 做什麼 | 範例 |
|------|--------|------|
| `net/http` | HTTP 狀態碼常數 | `http.StatusOK`（200）、`http.StatusNotFound`（404） |
| `strconv` | 字串 ↔ 數字轉換 | `strconv.Atoi("10")` → 10 |
| `errors` | 錯誤比對 | `errors.Is(err, gorm.ErrRecordNotFound)` |
| `log/slog` | 結構化日誌 | `slog.Error("失敗", "error", err)`（詳見 [Go 路由註冊 — Logger 放哪](Go路由註冊.md)） |
| `fmt` | 格式化字串 | `fmt.Sprintf("ID: %s", id)`（詳見 [fmt 動詞 %s %w](fmt-verbs-percent-s-w.md)） |

### 測試檔案額外需要

| 套件 | 做什麼 | 為什麼測試需要 |
|------|--------|----------------|
| `testing` | Go 測試框架 | 每個測試函式都要 `t *testing.T` |
| `net/http/httptest` | 模擬 HTTP 請求/回應 | 不用真的啟動伺服器就能測 handler |
| `encoding/json` | JSON 編碼/解碼 | 手動把 struct 變 JSON、把回應 JSON 解析回 struct |
| `strings` | 字串操作 | `strings.NewReader(body)` 把 JSON 字串變成 request body |
| `net/url` | URL 操作 | `url.Values{}` 組裝查詢參數（`?email=xxx&page=1`） |
| `context` | 傳遞超時/取消信號 | `context.Background()` 建立空 context（詳見 [context.Context 筆記](context-context.md)） |

---

## `net/http` vs `net/http/httptest` vs `net/url`

三個都在 `net` 底下，但功能完全不同：

```
net/
├── http/           ← HTTP 的「真的東西」
│   ├── StatusOK    ← 狀態碼常數
│   ├── MethodPost  ← HTTP 方法常數
│   └── httptest/   ← HTTP 的「假的東西」（測試用）
│       ├── NewRequest()   ← 建假請求
│       └── NewRecorder()  ← 建假回應記錄器
└── url/            ← URL 解析和組裝
    └── Values{}    ← 查詢參數 map
```

`net/http` = 真實的 HTTP 常數和功能
`net/http/httptest` = 模擬的 HTTP 環境（不需啟動伺服器）
`net/url` = 操作 URL 字串（query string、path 等）

---

## `encoding/json` — 不是每個 handler 都需要

> 完整說明見 [沒有 encoding/json 就不能用 Marshal / Unmarshal 嗎？](the-need-of-encoding-json-for-marshal-and-unmarshal.md)

[Gin 框架](Gin框架筆記.md)已經封裝了 JSON 操作：
- `c.ShouldBindJSON(&req)` — 自動把 request body 的 JSON 解析成 struct
- `c.JSON(200, data)` — 自動把 struct 轉成 JSON 回傳

所以正常 handler **不需要** import `encoding/json`，Gin 幫你做了。

但以下情況需要手動 import：

```go
// 1. 測試檔案 — 沒有 Gin，要自己處理 JSON
body, _ := json.Marshal(loginReq)           // struct → JSON bytes
json.Unmarshal(w.Body.Bytes(), &result)     // JSON bytes → struct

// 2. Handler 需要讀取 raw JSON（例如轉發、記 log）
bodyBytes, _ := io.ReadAll(c.Request.Body)  // 先讀原始 bytes
var raw json.RawMessage = bodyBytes         // 保留原始 JSON

// 3. Service 層的 Model ↔ DTO 轉換（詳見 json-raw-message.md）
// json.RawMessage（DB JSON 欄位）→ []string（DTO 欄位）
var imgURLs []string
json.Unmarshal(product.ImgURLs, &imgURLs)
```

---

## `strings` — 測試檔案為什麼需要？

`strings.NewReader()` 把字串變成 `io.Reader` 介面：

```go
// HTTP request body 需要 io.Reader 型別，不是 string
// 所以要轉換：
body := `{"email":"test@test.com","password":"123456"}`
req := httptest.NewRequest("POST", "/login",
    strings.NewReader(body))   // string → io.Reader
```

正常 handler 不需要，因為 Gin 已經幫你處理了 request body。

---

## `context` — 不是「清理 Redis」專用

> 完整說明見 [context.Context 筆記](context-context.md)、[Go 路由註冊 — `c` vs `ctx`](Go路由註冊.md)

`context` 是 Go 原生套件，功能是**傳遞取消信號和超時**，像一個計時炸彈：

```go
// 建立一個「5 秒後自動取消」的 context
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// 傳給任何需要的函式
result, err := redis.Get(ctx, "key").Result()  // ← Redis 操作帶 ctx
user, err := repo.GetByID(ctx, id)             // ← DB 操作帶 ctx
resp, err := http.Get(ctx, url)                // ← HTTP 請求帶 ctx
```

context 本身不會「清理」任何東西。它只是一個**信號傳遞器**：
- 「5 秒到了，大家都停下來」
- 「使用者取消了，所有操作都中止」

測試檔案常用 `context.Background()` 建立一個空的、永不超時的 context。

---

## 為什麼不是每個 handler 都 import `dto`？

> DTO 的完整角色見 [後端 DTO 角色與三層架構](後端DTO角色與三層架構.md)、[dto-api-response](dto-api-response.md)

**Go 的鐵律：import 了沒用 = 編譯錯誤。**

```go
import "internal/dto"  // 如果下面沒用到 dto.XXX → 編譯直接失敗
```

所以每個 handler 只 import 它實際用到的套件：

| Handler | 有 import dto? | 原因 |
|---------|----------------|------|
| `booth_product_handler.go` | ✅ 有 | 用了 `dto.BoothProductUpdate`、`dto.BoothProductCreate` |
| `auth_handler.go` | ✅ 有 | 用了 `dto.LoginRequest`、`dto.TokenResponse` |
| 某些簡單 handler | ❌ 沒有 | 只讀 URL 參數，不解析 JSON body，不需要 DTO |

這不是風格選擇，是 Go 編譯器強制的。

---

## Import 分組規則

> 相關：[go.mod 筆記](go.mod.md) — module path 的由來、[go-mod-direct-vs-indirect](go-mod-direct-vs-indirect.md)

Go 的 import 慣例分三組，用空行分隔：

```go
import (
    // 第一組：Go 標準庫（沒有 github 前綴 = 原生）
    "encoding/json"
    "net/http"
    "strings"

    // 第二組：第三方套件（有 github.com 或其他域名前綴）
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    // 第三組：專案內部套件（用專案的 module path 開頭）
    "github.com/yutuo-tech/futuresign_backend/internal/dto"
    "github.com/yutuo-tech/futuresign_backend/internal/service"
)
```

快速判斷：
- **沒有 `.com`** → Go 原生標準庫
- **有 `github.com` 但不是自己的** → 第三方套件
- **有 `github.com/yutuo-tech/...`** → 專案自己的程式碼

---

## `github.com/...` 路徑 ≠ 一定要推上 GitHub

> 相關：[go.mod 筆記](go.mod.md)

常見疑問：自己專案的 import 也寫 `github.com/...`，難道沒推上 GitHub 就不能用嗎？

**不是。`github.com/...` 在自己的程式碼裡只是一個名字，Go 看到是自己的名字就去本地找，不會上網。**

### go.mod 定義了「我叫什麼名字」

```go
// go.mod
module github.com/yutuo-tech/futuresign_backend
```

這行只是幫專案取一個**全域唯一的 ID**，就像身分證號碼。不代表程式碼一定在 GitHub 上。

### Go 怎麼判斷要不要上網

```
Go 看到 import 路徑
    ↓
開頭 = go.mod 裡的 module name？
    ├── 是 → 去本地資料夾找（不上網）✅
    └── 否 → 去網路下載（第三方套件）🌐
```

### 三種 import 的實際行為

```
import "github.com/yutuo-tech/futuresign_backend/internal/dto"
        ├── github.com/yutuo-tech/futuresign_backend  ← = go.mod 的 module name
        └── /internal/dto                              ← = 本地資料夾路徑
        → 結論：本地找，不上網 ✅

import "github.com/gin-gonic/gin"
        └── github.com/gin-gonic/gin  ← ≠ 自己的 module name
        → 結論：上網下載（第一次），之後用本地快取 🌐

import "net/http"
        └── 沒有 .com → Go 標準庫
        → 結論：Go 安裝時就自帶 📦
```

### 為什麼不直接叫 `futuresign_backend` 就好？

技術上可以，`go.mod` 寫 `module futuresign_backend` 也能跑。但用 `github.com/yutuo-tech/futuresign_backend` 的好處：

1. **全球唯一** — 不會跟別人的專案撞名
2. **未來可分享** — 如果以後要開源或讓別的專案 import，路徑已經準備好
3. **Go 社群慣例** — 大家都這樣命名，工具鏈預設支援

類似 npm 的 `@yutuo-tech/futuresign` — 加組織前綴確保不撞名，但本地開發時 npm 一樣是去 `node_modules/` 找。

### 官方文件佐證

出處：[Go Modules Reference](https://go.dev/ref/mod)

**Main Module（主模組）的定義：**

> *"The **main module** is the module containing the directory where the `go` command is invoked."*
>
> — [go.dev/ref/mod#glos-main-module](https://go.dev/ref/mod#glos-main-module)

也就是說，你執行 `go build` 的那個資料夾裡的 `go.mod`，就是 main module。

**Build List（建構清單）裡第一個就是自己：**

> *"MVS produces the **build list** as output, the list of module versions used for a build."*
>
> — [go.dev/ref/mod#minimal-version-selection](https://go.dev/ref/mod#minimal-version-selection)

Build list = 所有會參與編譯的模組清單。**第一個永遠是 main module（你自己）。**

**Go 怎麼解析 import 路徑：**

> *"When the `go` command loads a package using a package path, it needs to determine which module provides the package.*
> *The `go` command starts by searching the **build list** for modules with paths that are **prefixes** of the package path."*
>
> — [go.dev/ref/mod#resolve-pkg-mod](https://go.dev/ref/mod#resolve-pkg-mod)

所以當 Go 看到 `import "github.com/yutuo-tech/futuresign_backend/internal/dto"` 時：
1. 搜尋 build list → 發現 `github.com/yutuo-tech/futuresign_backend` 是 main module（自己）
2. 去本地資料夾的 `internal/dto` 找 → 找到，完成
3. **不會上網下載**

---

## 一句話總結

| 概念 | 一句話 |
|------|--------|
| **正常 handler import 少** | 因為 main.go 已經組裝好所有依賴，handler 只需「接電話」 |
| **測試檔案 import 多** | 因為沒有 main.go，測試要自己建造整個環境（config→DB→repo→service） |
| **不是每個 handler 都有 dto** | Go 規定：import 了沒用 = 編譯錯誤，所以只 import 需要的 |
| **encoding/json** | JSON 編碼/解碼；正常 handler 不需要，因為 Gin 已封裝 |
| **net/http/httptest** | 模擬假的 HTTP 環境，只有測試需要 |
| **context** | 傳遞超時/取消信號，不是專門清理 Redis 的 |
| **strings** | 字串操作；測試用 `strings.NewReader()` 把字串變 request body |
| **import 分三組** | 標準庫 → 第三方 → 專案內部，用空行分隔 |
| **`github.com/...` = 名字** | 自己專案的 `github.com/...` 只是 ID，Go 在本地找，不上網 |
