# 沒有 encoding/json 就不能用 Marshal / Unmarshal 嗎？

**對，沒 import `encoding/json` 就不能直接用 `json.Marshal` / `json.Unmarshal`。**
但在正常 Handler 裡你不需要自己 import，因為 [Gin 框架](Gin框架筆記.md)已經幫你包好了。

> 相關筆記：
> - [Golang Handler Imports 解析](golang-handler-imports.md) — 為什麼不是每個 handler 都 import `encoding/json`
> - [json.RawMessage 筆記](json-raw-message.md) — `json.RawMessage` 的用法
> - [後端 DTO 角色與三層架構](後端DTO角色與三層架構.md) — `[]string` vs `json.RawMessage` 轉換

---

## Marshal 和 Unmarshal 是什麼？

```
Marshal   = Go struct → JSON bytes（打包）
Unmarshal = JSON bytes → Go struct（拆包）
```

```go
import "encoding/json"

// Marshal：struct → JSON
user := User{Name: "Abby", Email: "abby@test.com"}
jsonBytes, _ := json.Marshal(user)
// jsonBytes = []byte(`{"name":"Abby","email":"abby@test.com"}`)

// Unmarshal：JSON → struct
var result User
json.Unmarshal(jsonBytes, &result)
// result.Name = "Abby", result.Email = "abby@test.com"
```

---

## 為什麼正常 Handler 不需要 import？

因為 Gin 在底層已經幫你呼叫了：

| 你想做的事 | 沒有 Gin（自己來） | 有 Gin（幫你做了） |
|------------|---------------------|-------------------|
| JSON → struct | `json.Unmarshal(body, &req)` | `c.ShouldBindJSON(&req)` |
| struct → JSON | `json.Marshal(data)` | `c.JSON(200, data)` |

### Gin 內部大概做了什麼

```go
// c.ShouldBindJSON 底層
func (c *Context) ShouldBindJSON(obj interface{}) error {
    body, _ := io.ReadAll(c.Request.Body)
    return json.Unmarshal(body, obj)  // ← Gin 幫你呼叫了 Unmarshal
}

// c.JSON 底層
func (c *Context) JSON(code int, obj interface{}) {
    data, _ := json.Marshal(obj)      // ← Gin 幫你呼叫了 Marshal
    c.Writer.Header().Set("Content-Type", "application/json")
    c.Writer.WriteHeader(code)
    c.Writer.Write(data)
}
```

所以正常 handler 只要寫：

```go
// 不需要 import "encoding/json"

func (h *Handler) CreateUser(c *gin.Context) {
    var req dto.UserCreate
    c.ShouldBindJSON(&req)       // ← JSON → struct（Gin 底層用 Unmarshal）

    user, _ := h.service.Create(&req)

    c.JSON(200, user)            // ← struct → JSON（Gin 底層用 Marshal）
}
```

---

## 什麼時候需要自己 import `encoding/json`？

### 1. 測試檔案 — 沒有 Gin 環境

```go
import "encoding/json"

// 手動把 struct 變成 request body
loginReq := dto.LoginRequest{Email: "test@test.com"}
body, _ := json.Marshal(loginReq)              // ← 自己 Marshal

// 手動解析 response body
var result map[string]interface{}
json.Unmarshal(w.Body.Bytes(), &result)         // ← 自己 Unmarshal
```

### 2. Service 層 — Model ↔ DTO 的 JSON 欄位轉換

資料庫的 JSON 欄位存成 `json.RawMessage`（原始 bytes），
DTO 用 `[]string`（已解析的陣列），需要手動轉換：

```go
import "encoding/json"

// Model(json.RawMessage) → DTO([]string)
var imgURLs []string
json.Unmarshal(product.ImgURLs, &imgURLs)       // raw bytes → 字串陣列

// DTO([]string) → Model(json.RawMessage)
rawJSON, _ := json.Marshal(req.ImgURLs)         // 字串陣列 → raw bytes
product.ImgURLs = rawJSON
```

> 詳見 [json.RawMessage 筆記](json-raw-message.md)

### 3. Handler 需要讀取原始 JSON（少見）

```go
import "encoding/json"

// 例如：記 log 時保留原始請求內容
bodyBytes, _ := io.ReadAll(c.Request.Body)
var raw json.RawMessage = bodyBytes
slog.Info("收到請求", "body", string(raw))
```

---

## 一句話總結

| 情境 | 需要 import `encoding/json`？ | 原因 |
|------|-------------------------------|------|
| 正常 Handler | ❌ 不需要 | Gin 的 `c.JSON()` 和 `c.ShouldBindJSON()` 幫你做了 |
| 測試檔案 | ✅ 需要 | 沒有 Gin，要自己 Marshal / Unmarshal |
| Service 層（JSON 欄位轉換） | ✅ 需要 | `json.RawMessage` ↔ `[]string` 轉換 |
| Handler 讀原始 JSON | ✅ 需要 | 少見，通常是記 log 或轉發用 |
