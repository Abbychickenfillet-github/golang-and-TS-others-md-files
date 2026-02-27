# Response 會再經過 Middleware 嗎？

**會。Middleware 是雙向的，request 進來經過，response 出去也會經過。**

## 流程圖

```
請求進來                                    回應出去
   ↓                                          ↑
┌──────────────────────────────────────────────┐
│  Middleware 1（Logger）                        │
│  進來時：記錄「開始計時」                       │
│  出去時：記錄「花了 12ms，狀態 200」            │
├──────────────────────────────────────────────┤
│  Middleware 2（Auth）                          │
│  進來時：檢查 token                            │
│  出去時：（通常不做事，直接放行）                │
├──────────────────────────────────────────────┤
│  Handler → Service → Repository               │
└──────────────────────────────────────────────┘
```

## `c.Next()` 是關鍵

```go
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        // ===== c.Next() 上面 = 請求進來時執行 =====
        start := time.Now()           // 開始計時

        c.Next()                      // 往下走（Handler → Service → Repository）
                                      // 等下面全部做完才會回來

        // ===== c.Next() 下面 = 回應出去時執行 =====
        latency := time.Since(start)  // 計算花了多久
        status := c.Writer.Status()   // 拿到 HTTP status code（200、400、500）
        log.Printf("%d | %v | %s", status, latency, c.Request.URL)
    }
}
```

`c.Next()` 把請求往下傳，等 Handler 做完回來後，程式碼繼續往下執行。
所以 **`c.Next()` 上面 = 進來時做的事，下面 = 出去時做的事**。

## 洋蔥模型

Middleware 像洋蔥，一層一層包覆，請求從外往內穿，回應從內往外穿：

```
→ Middleware 1 進入
  → Middleware 2 進入
    → Middleware 3 進入
      → Handler 執行
    ← Middleware 3 離開
  ← Middleware 2 離開
← Middleware 1 離開
```

每一層 middleware 都有機會在 response 出去時做事（記 log、加 header、處理錯誤等）。
