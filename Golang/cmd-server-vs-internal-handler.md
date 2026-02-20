# cmd/server vs internal/handler 差異

## 一句話總結

- **`cmd/server/main.go`** = 餐廳大門 + 櫃台（啟動伺服器、設定路由）
- **`internal/handler/`** = 各個廚師（處理每一個 API 請求的具體邏輯）

---

## cmd/server/main.go 做了什麼？

這是整個後端的**進入點**，程式從這裡開始跑。它負責「啟動」和「接線」：

```
main() 執行順序：
  1. 讀取 .env 設定檔
  2. 初始化日誌系統
  3. 連線 MySQL 資料庫
  4. 連線 Redis
  5. 執行資料庫遷移 (AutoMigrate)
  6. 建立 Gin 路由器
  7. 設定 CORS（跨域）
  8. 設定所有 API 路由 ← 在這裡把 handler 掛上去
  9. 啟動 HTTP 伺服器，監聽 port 8080
  10. 等待關機信號 (graceful shutdown)
```

### 路由設定的部分（簡化版）

```go
// cmd/server/main.go 裡面
v1 := router.Group("/api/v1")

// 把 handler 掛到路由上
authHandler := handler.NewAuthHandler(authService)
v1.POST("/login", authHandler.Login)
v1.POST("/register", authHandler.Register)

boothHandler := handler.NewBoothHandler(boothService)
v1.GET("/booths", boothHandler.ListBooths)
v1.POST("/booths", boothHandler.CreateBooth)
```

**重點**：`cmd/server/main.go` 只負責「哪個網址對應哪個 handler」，不處理具體邏輯。

---

## internal/handler/ 做了什麼？

Handler 負責**處理每一個 API 請求的具體邏輯**：

```go
// internal/handler/booth_handler.go
func (h *BoothHandler) CreateBooth(c *gin.Context) {
    // 1. 解析請求 body
    var req dto.BoothCreate
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"detail": "格式錯誤"})
        return
    }

    // 2. 呼叫 service 處理商業邏輯
    booth, err := h.boothService.CreateBooth(&req)
    if err != nil {
        c.JSON(500, gin.H{"detail": err.Error()})
        return
    }

    // 3. 回傳結果
    c.JSON(201, booth)
}
```

---

## 兩者的關係圖

```
使用者發送 HTTP 請求
       │
       ▼
┌─────────────────────────┐
│  cmd/server/main.go     │  ← 伺服器入口
│  (啟動 + 路由對照表)       │
│                         │
│  POST /api/v1/booths    │
│    → boothHandler       │
│       .CreateBooth      │
└────────┬────────────────┘
         │ 轉發到對應的 handler
         ▼
┌─────────────────────────┐
│  internal/handler/      │  ← 處理請求
│  booth_handler.go       │
│                         │
│  1. 解析請求              │
│  2. 呼叫 service          │
│  3. 回傳 JSON             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  internal/service/      │  ← 商業邏輯
│  booth_service.go       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  internal/repository/   │  ← 存取資料庫
│  booth_repository.go    │
└─────────────────────────┘
```

---

## 對照表

| 項目 | cmd/server/main.go | internal/handler/ |
|------|-------------------|-------------------|
| 角色 | 伺服器啟動器 + 路由表 | API 請求處理器 |
| 數量 | 只有 1 個 | 每個功能模組一個（auth, booth, order...） |
| 執行時機 | 程式啟動時跑一次 | 每次收到 HTTP 請求時跑 |
| 會碰到 DB 嗎？ | 只負責連線，不查詢 | 透過 service → repository 查詢 |
| 類比 | 總機 / 櫃台 | 各部門的員工 |

---

## 為什麼要分開？

1. **職責分離**：main.go 只管「啟動」，handler 只管「處理請求」
2. **好測試**：handler 可以單獨寫 unit test（mock service），不需要真的啟動伺服器
3. **好維護**：新增 API 只要寫新 handler + 在 main.go 加一行路由

---

## cmd/ 下其他小工具 vs cmd/server 的差別

```
cmd/
├── server/main.go           ← 長期執行的伺服器（跑起來就一直在）
├── dev-token/main.go        ← 跑一次就結束的腳本（產生 token）
├── check-pricing/main.go    ← 跑一次就結束的腳本（查定價）
├── check-invoice/main.go    ← 跑一次就結束的腳本（查發票）
├── invoice-stats/main.go    ← 跑一次就結束的腳本（統計發票）
└── fix-member-identity/main.go ← 跑一次就結束的腳本（修資料）
```

- **server** 是唯一的「伺服器」，啟動後持續監聽 HTTP 請求
- 其他都是**一次性工具**，執行完任務就自動結束
- 但它們都能 `import internal/` 裡的 models、database 等共用程式碼
