# Go 函數語法解釋

## 基本函數語法

```go
func 函數名(參數名 型別) 回傳型別 {
    // 函數內容
}
```

---

## 範例解析

```go
func (h *UserHandler) GetUser(c *gin.Context) {
```

拆解：

| 部分 | 意思 |
|------|------|
| `func` | 宣告函數 |
| `(h *UserHandler)` | **接收者**：這個函數屬於 `UserHandler` 結構 |
| `GetUser` | 函數名稱 |
| `(c *gin.Context)` | **參數**：`c` 是變數名，`*gin.Context` 是型別 |

---

## `c *gin.Context` 詳解

```go
c *gin.Context
│ │    │
│ │    └── 型別（gin 套件的 Context 結構）
│ └── * 表示指標（pointer）
└── 變數名（慣例用 c 代表 context）
```

**白話文：**
- `c` 是一個變數名（可以叫任何名字，但慣例用 `c`）
- `*gin.Context` 是它的型別
- 就像 TypeScript 的 `c: gin.Context`

---

## Go vs TypeScript 對比

```typescript
// TypeScript
function getUser(c: Context): User {
    return user;
}
```

```go
// Go
func GetUser(c *gin.Context) *User {
    return user
}
```

| TypeScript | Go |
|------------|-----|
| `c: Context` | `c *gin.Context` |
| 型別在後面用 `:` | 型別在後面用空格 |
| `function` | `func` |

---

## 為什麼用 `c` 不用 `context`？

這是 **Go 社群慣例**，讓程式碼更簡潔：

```go
// ✅ 慣例寫法（簡短）
func GetUser(c *gin.Context) {
    userID := c.Param("id")
    c.JSON(200, user)
}

// ❌ 也可以，但太長
func GetUser(context *gin.Context) {
    userID := context.Param("id")
    context.JSON(200, user)
}
```

---

## 常見的變數命名慣例

| 型別 | 慣例變數名 | 範例 |
|------|-----------|------|
| `*gin.Context` | `c` | `c.JSON()` |
| `context.Context` | `ctx` | `ctx.Done()` |
| `*gorm.DB` | `db` | `db.Find()` |
| `*http.Request` | `r` 或 `req` | `r.URL` |
| `http.ResponseWriter` | `w` | `w.Write()` |
| `error` | `err` | `if err != nil` |

---

## 接收者 (Receiver) 解釋

```go
func (h *UserHandler) GetUser(c *gin.Context)
      ^^^^^^^^^^^^^^^^
      這是「接收者」
```

**接收者**讓函數「屬於」某個結構：

```go
// 有接收者 → 方法（屬於 UserHandler）
func (h *UserHandler) GetUser(c *gin.Context)

// 調用方式
handler := &UserHandler{}
handler.GetUser(c)  // ← 用 handler 呼叫
```

```go
// 無接收者 → 普通函數
func GetUser(c *gin.Context)

// 調用方式
GetUser(c)  // ← 直接呼叫
```

---

## 接收者變數名慣例

通常用**型別名稱的小寫首字母**：

```go
func (h *UserHandler) GetUser()    // h = Handler 的 h
func (u *User) Save()              // u = User 的 u
func (s *OrderService) Create()    // s = Service 的 s
func (r *UserRepository) Find()    // r = Repository 的 r
```

---

## 指標 `*` 的意思

```go
func (h *UserHandler) GetUser(c *gin.Context)
         ^                      ^
         指標                   指標
```

| 寫法 | 意思 | 記憶體 |
|------|------|--------|
| `h UserHandler` | 傳值（複製一份） | 佔用多 |
| `h *UserHandler` | 傳指標（傳地址） | 佔用少 |

**白話文：**
- 不加 `*`：給你一份影本
- 加 `*`：給你地址，你自己去找原本

**99% 的情況用指標 `*`**，因為效能好、可以修改原始資料。

---

## 完整範例

```go
// 定義結構
type UserHandler struct {
    service UserService
}

// 定義方法（有接收者）
func (h *UserHandler) GetUser(c *gin.Context) {
    // h = 這個 handler 實例
    // c = HTTP 請求的所有資訊

    userID := c.Param("id")              // 從 URL 取得 id
    user, err := h.service.GetUser(userID) // 呼叫 service

    if err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    c.JSON(200, user)  // 回傳 JSON
}
```

---

## 總結

```go
func (h *UserHandler) GetUser(c *gin.Context) {
      │  │             │       │  │
      │  │             │       │  └── 型別
      │  │             │       └── 變數名（慣例用 c）
      │  │             └── 函數名
      │  └── 型別
      └── 變數名（慣例用首字母小寫）
```

**記住：Go 的參數格式是 `名字 型別`，跟 TypeScript 的 `名字: 型別` 相反！**

---

## 為什麼 `*gin.Context` 是型別？

你可能會想：「型別不是應該像 `string`、`int`、`bool` 這種嗎？」

**答案：Go 的型別不只有原始型別（primitive types），還有結構型別（struct types）！**

### 型別分類

| 類型 | 範例 | 說明 |
|------|------|------|
| 原始型別 | `string`, `int`, `bool`, `float64` | Go 內建的基本型別 |
| 結構型別 | `gin.Context`, `User`, `Order` | 自定義或套件定義的結構 |
| 指標型別 | `*string`, `*gin.Context` | 指向某個型別的指標 |

### `gin.Context` 是什麼？

```go
// gin 套件裡面定義了這個結構
type Context struct {
    Request  *http.Request
    Writer   ResponseWriter
    Params   Params
    // ... 還有很多欄位
}
```

所以 `gin.Context` 是 **gin 套件定義的結構型別**，就像你自己定義的 `User` 結構一樣：

```go
// 你自己定義的結構也是型別！
type User struct {
    ID   int
    Name string
}

// 使用方式一樣
func GetUser(u *User) { }      // u 的型別是 *User
func GetUser(c *gin.Context) { } // c 的型別是 *gin.Context
```

### 對比 TypeScript

```typescript
// TypeScript
interface Context {
    request: Request;
    response: Response;
}

function handler(c: Context) { }  // c 的型別是 Context
```

```go
// Go
type Context struct {
    Request  *http.Request
    Response ResponseWriter
}

func handler(c *Context) { }  // c 的型別是 *Context
```

**結論：在 Go 裡面，`結構名稱` 本身就是型別，不需要額外關鍵字！**

---

## Air 執行流程

當你執行 `air` 指令時，會發生以下流程：

```
air 指令
    │
    ▼
讀取 .air.toml 設定檔
    │
    ▼
執行 go build -o ./tmp/main.exe ./cmd/server
    │
    ▼
執行編譯好的 ./tmp/main.exe
    │
    ▼
main.exe 執行 main.go 的程式碼
    │
    ▼
main.go 載入 .env（godotenv.Load()）
    │
    ▼
連接資料庫、啟動 HTTP 伺服器
```

### .air.toml 關鍵設定

```toml
[build]
cmd = "go build -o ./tmp/main.exe ./cmd/server"  # 編譯指令
bin = "./tmp/main.exe"                            # 執行檔路徑
include_ext = ["go", "tpl", "tmpl", "html"]       # 監聽這些副檔名
exclude_dir = ["tmp", "vendor", "node_modules"]   # 忽略這些資料夾
```

### 熱更新原理

```
你修改了 handler/user.go
        │
        ▼
air 偵測到 .go 檔案變更
        │
        ▼
重新執行 go build
        │
        ▼
停止舊的 main.exe
        │
        ▼
啟動新的 main.exe
        │
        ▼
伺服器重新載入，你的修改生效！
```

**總結：`air` 是一個監聽檔案變更並自動重新編譯、重啟的工具，讓你不用每次改 code 都手動重啟伺服器。**
