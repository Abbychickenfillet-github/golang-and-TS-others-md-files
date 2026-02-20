# Handler vs Middleware

> 建立日期: 2026-01-20

---

## 一句話區分

- **Middleware** = 門口警衛（檢查你有沒有證件）
- **Handler** = 櫃檯人員（實際幫你辦事）

---

## 請求流程

```
HTTP 請求 → [Middleware 1] → [Middleware 2] → [Handler] → 回應
              認證檢查         日誌記錄        實際處理邏輯
```

---

## 比較表

| 比較 | Middleware | Handler |
|------|------------|---------|
| **用途** | 前置/後置處理（橫切關注點） | 實際業務邏輯 |
| **執行時機** | 請求到達 Handler **之前/之後** | 請求的**最終處理** |
| **範例** | 認證、日誌、限流、CORS | 查詢退款、建立訂單、登入 |
| **可重用性** | 可套用到多個路由 | 專屬於特定路由 |
| **位置** | `internal/middleware/` | `internal/handler/` |

---

## 實際程式碼範例

### 路由設定

```go
// cmd/server/main.go
refunds.GET("/pending-count",
    middleware.AuthRequired(),      // ← Middleware: 檢查是否登入
    refundHandler.GetPendingCount,  // ← Handler: 實際查詢退款數量
)
```

請求會依序經過：
1. `AuthRequired()` - 檢查 token
2. `GetPendingCount()` - 查詢資料並回傳

---

### Middleware 範例（`internal/middleware/auth.go`）

```go
// 只做一件事：檢查 token 有沒有效
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")

        if token == "" {
            c.JSON(401, gin.H{"detail": "Not authenticated"})
            c.Abort()  // ← 中斷！不會執行 Handler
            return
        }

        // 驗證 token...
        user, err := validateToken(token)
        if err != nil {
            c.JSON(401, gin.H{"detail": "Invalid token"})
            c.Abort()
            return
        }

        // 把 user 存到 context，讓 Handler 可以用
        c.Set("user", user)

        c.Next()  // ← 通過！繼續執行下一個 Middleware 或 Handler
    }
}
```

**關鍵方法：**
- `c.Abort()` - 中斷請求，不執行後續的 Middleware/Handler
- `c.Next()` - 繼續執行下一個
- `c.Set()` - 在 context 中存值，讓後續可以讀取

---

### Handler 範例（`internal/handler/refund_handler.go`）

```go
// 實際處理業務邏輯
func (h *RefundHandler) GetPendingCount(c *gin.Context) {
    // 從 context 取得 user（Middleware 放進去的）
    user, _ := c.Get("user")

    // 呼叫 Service 層查詢資料庫
    count, err := h.refundService.GetPendingCount()
    if err != nil {
        c.JSON(500, gin.H{"detail": "Internal server error"})
        return
    }

    // 回傳 JSON 結果
    c.JSON(200, dto.RefundPendingCountResponse{Count: count})
}
```

**Handler 的職責：**
1. 解析請求參數（query, path, body）
2. 呼叫 Service 層處理業務邏輯
3. 回傳 HTTP 回應

---

## 視覺化流程

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP 請求                             │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Middleware Chain                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│  │  │AuthRequired│→│ RateLimit │→│  Logger   │       │   │
│  │  │  (認證)    │  │  (限流)   │  │  (日誌)   │       │   │
│  │  └───────────┘  └───────────┘  └───────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Handler                           │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ RefundHandler.GetPendingCount()               │  │   │
│  │  │ - 呼叫 Service 查詢資料                        │  │   │
│  │  │ - 回傳 JSON 結果                              │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│                      HTTP 回應                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 專案中的 Middleware 清單

| Middleware | 檔案 | 用途 |
|------------|------|------|
| `AuthRequired` | `auth.go` | 驗證 JWT token（後台用戶） |
| `MemberAuthRequired` | `member_auth.go` | 驗證會員 token |
| `AdminRequired` | `auth.go` | 檢查是否為超級管理員 |
| `RequirePermission` | `permission.go` | 檢查是否有特定權限 |
| `RateLimit` | `rate_limit.go` | 請求限流 |
| `LoginRateLimit` | `rate_limit.go` | 登入專用限流（防暴力破解）|
| `CORS` | `cors.go` | 跨域請求處理 |

---

## 專案中的 Handler 清單（部分）

| Handler | 檔案 | 負責的資源 |
|---------|------|-----------|
| `AuthHandler` | `auth_handler.go` | 登入、登出、密碼重設 |
| `UserHandler` | `user_handler.go` | 後台用戶 CRUD |
| `MemberHandler` | `member_handler.go` | 會員 CRUD |
| `OrderHandler` | `order_handler.go` | 訂單管理 |
| `RefundHandler` | `refund_handler.go` | 退款管理 |
| `EventHandler` | `event_handler.go` | 活動管理 |
| `BoothHandler` | `booth_handler.go` | 攤位管理 |
| `TicketHandler` | `ticket_handler.go` | 票券管理 |

---

## 常見問題

### Q: 為什麼不把認證邏輯寫在 Handler 裡？

**A:** 因為很多 Handler 都需要認證，如果每個都寫一次會：
- 重複程式碼
- 難以維護
- 容易漏掉

用 Middleware 可以統一處理，一行搞定：
```go
orders.GET("", middleware.AuthRequired(), orderHandler.GetOrders)
refunds.GET("", middleware.AuthRequired(), refundHandler.ListRefunds)
// AuthRequired 只寫一次，到處用
```

---

### Q: Middleware 可以有多個嗎？

**A:** 可以！會依序執行：
```go
// 依序執行：認證 → 權限檢查 → Handler
roles.POST("",
    middleware.AuthRequired(),                    // 1. 先檢查登入
    middleware.RequirePermission("role.create"),  // 2. 再檢查權限
    roleHandler.CreateRole,                       // 3. 最後執行
)
```

---

### Q: Middleware 執行順序重要嗎？

**A:** 非常重要！例如：
```go
// ✅ 正確：先認證，再檢查權限
middleware.AuthRequired(), middleware.RequirePermission("xxx")

// ❌ 錯誤：還沒認證就檢查權限，會拿不到 user
middleware.RequirePermission("xxx"), middleware.AuthRequired()
```

---

## 總結

```
Middleware = 通用檢查（認證、日誌、限流）
Handler    = 業務邏輯（查詢、新增、修改、刪除）
```
