# `ctx context.Context` 是什麼？

**Context 是用來傳遞「請求範圍」資訊的機制：**

```go
func (s *eventCouponService) GetClaimsByProgram(ctx context.Context, ...) {
//                                              ^^^
//                                              Context 參數
```

## Context 的用途

| 用途 | 說明 |
|------|------|
| **取消信號** | 當使用者取消請求時，通知所有下游停止工作 |
| **超時控制** | 設定最長執行時間，超時自動取消 |
| **傳遞資料** | 傳遞 request ID、user ID 等請求範圍的資料 |

## 實際流程

```
HTTP 請求進來
    ↓
Handler 取得 ctx := c.Request.Context()
    ↓
傳給 Service：service.GetClaimsByProgram(ctx, ...)
    ↓
如果使用者關閉瀏覽器，ctx 會收到取消信號
    ↓
可以提前結束，不浪費資源
```

**簡單理解：Context 就像一條線，把整個請求串起來，可以一次取消所有操作。**

## Q: ctx 參數不寫會沒辦法取消信號嗎？

**對的！** 如果不傳 ctx：

1. **無法取消** - 使用者關閉瀏覽器，後端還在跑
2. **無法超時** - 查詢太久也不會停
3. **無法追蹤** - 無法傳遞 request ID 等資訊

```go
// 不好的寫法（沒有 ctx）
func GetData() (*Data, error) {
    // 無法被取消
}

// 好的寫法（有 ctx）
func GetData(ctx context.Context) (*Data, error) {
    // 可以檢查是否被取消
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
        // 繼續執行
    }
}
```

## 在 Gin Handler 中取得 ctx

```go
func (h *Handler) GetClaims(c *gin.Context) {
    ctx := c.Request.Context()  // 從 HTTP 請求取得 ctx
    result, err := h.service.DoSomething(ctx, ...)
}
```

## `c *gin.Context` vs `ctx context.Context` 差異

這兩個名字都有 Context 但是不同的東西：

| | `c *gin.Context` | `ctx context.Context` |
|---|---|---|
| 來自 | Gin 框架 | Go 標準庫 |
| 用在 | Handler 層 | Service / Repository 層 |
| 功能 | 處理 HTTP 請求（取參數、回 JSON） | 傳遞取消信號、超時控制 |
| 慣例變數名 | `c` | `ctx` |

Handler 從 `c` 取出 `ctx`，再往下傳：

```
Handler(c *gin.Context)
    ↓
    ctx := c.Request.Context()
    ↓
Service(ctx context.Context, ...)
    ↓
Repository(ctx context.Context, ...)
```

## 官方文件

- [Go 標準庫 context package](https://pkg.go.dev/context)
- [Go Blog 官方教學：Go Concurrency Patterns: Context](https://go.dev/blog/context)
