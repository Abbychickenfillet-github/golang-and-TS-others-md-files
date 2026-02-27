# Go 路由註冊 + Router Group + Logger 放哪裡

## Router Group（路由群組）

### 為什麼需要 Group？

如果沒有 Group，每條路由都要寫完整路徑：

```go
// ❌ 沒有 Group — 又臭又長，重複寫 /api/v1/booth-products
router.PATCH("/api/v1/booth-products/:id", handler.Update)
router.DELETE("/api/v1/booth-products/:id", handler.Delete)
router.GET("/api/v1/booth-products", handler.List)
router.GET("/api/v1/orders/:id", orderHandler.Get)
router.POST("/api/v1/orders", orderHandler.Create)
```

用 Group 把共同前綴提取出來：

```go
// ✅ 有 Group — 乾淨、有層次
v1 := router.Group("/api/v1")               // 第一層：版本號
{
    boothProducts := v1.Group("/booth-products")  // 第二層：資源名稱
    {
        boothProducts.PATCH("/:id", handler.Update)   // 完整路徑 = /api/v1/booth-products/:id
        boothProducts.DELETE("/:id", handler.Delete)   // 完整路徑 = /api/v1/booth-products/:id
        boothProducts.GET("", handler.List)             // 完整路徑 = /api/v1/booth-products
    }

    orders := v1.Group("/orders")                 // 第二層：另一個資源
    {
        orders.GET("/:id", orderHandler.Get)           // 完整路徑 = /api/v1/orders/:id
        orders.POST("", orderHandler.Create)           // 完整路徑 = /api/v1/orders
    }
}
```

### 路徑組合方式

Group 是**層層疊加**的：

```
router.Group("/api/v1")          →  /api/v1
       .Group("/booth-products") →  /api/v1/booth-products
       .PATCH("/:id")           →  /api/v1/booth-products/:id
```

### Group 還可以綁 Middleware

```go
// 這個 Group 底下的所有路由都要先過 AuthRequired() 驗證
authorized := v1.Group("/booth-products", middleware.AuthRequired())
{
    authorized.POST("", handler.Create)     // 需要登入
    authorized.PATCH("/:id", handler.Update) // 需要登入
}

// 這些路由不需要登入
public := v1.Group("/booth-products")
{
    public.GET("/:id", handler.Get)         // 不需要登入
    public.GET("/event/:event_id", handler.GetByEvent) // 不需要登入
}
```

### 專案中的實際結構

```go
// main.go
func setupBoothProductRoutes(v1 *gin.RouterGroup, handler *handler.BoothProductHandler, cfg *config.Config) {
    boothProducts := v1.Group("/booth-products")
    {
        // 公開（不需登入）
        boothProducts.GET("/event/:event_id", handler.GetBoothProductsByEvent)
        boothProducts.GET("/:id", handler.GetBoothProduct)

        // 品牌商（Member 登入）
        boothProducts.GET("/my", middleware.MemberAuthRequired(cfg), handler.GetMyBoothProducts)

        // 品牌商或系統方都可以（TryBothAuth = 試 User 或 Member）
        boothProducts.POST("", middleware.TryBothAuth(), handler.CreateBoothProduct)
        boothProducts.PATCH("/:id", middleware.TryBothAuth(), handler.UpdateBoothProduct)

        // 系統管理員專用
        boothProducts.GET("", middleware.AuthRequired(), handler.GetAllBoothProducts)
    }
}
```

---

## Logger 放哪裡？

### 答案：哪裡都可以放，但放的「內容」不同

Logger **沒有規定只能放在某一層**。每一層都可以寫 log，但記錄的東西不同：

```
┌─────────────┬────────────────────────────────────────┐
│    層級      │         Logger 記錄什麼                 │
├─────────────┼────────────────────────────────────────┤
│  Middleware  │ 每個 HTTP 請求的進出                     │
│             │ 「誰在什麼時間打了什麼 API，花了多久」      │
│             │ → 像大門的監視器，記錄所有進出             │
├─────────────┼────────────────────────────────────────┤
│  Handler    │ 請求解析失敗、權限不足                    │
│             │ 「JSON 格式錯誤」「沒有權限」              │
│             │ → 像門衛的記錄簿，記錄被擋下的人           │
├─────────────┼────────────────────────────────────────┤
│  Service    │ 業務邏輯的關鍵節點                       │
│             │ 「建立預購單」「庫存不足」「狀態變更」       │
│             │ → 像業務部門的工作日誌                    │
├─────────────┼────────────────────────────────────────┤
│  Repository │ SQL 錯誤、查詢效能                       │
│             │ 「資料庫連線失敗」「查詢超時」              │
│             │ → 像倉庫的異常報告                       │
└─────────────┴────────────────────────────────────────┘
```

### 專案中各層的 logger 實例

**Middleware — 記錄 HTTP 請求**（Gin 自帶）：
```go
// Gin 預設就有 Logger middleware，自動記錄每個請求
// [GIN] 2026/02/27 - 10:30:00 | 200 | 12.3ms | 192.168.1.1 | PATCH "/api/v1/booth-products/xxx"
router.Use(gin.Logger())
```

**Handler — 很少寫 log**（通常不需要，因為 middleware 已經記了）：
```go
// Handler 層通常只在異常時記錄
func (h *BoothProductHandler) UpdateBoothProduct(c *gin.Context) {
    // 正常流程不寫 log，交給 middleware 和 service
    // 但如果要 debug 可以加
}
```

**Service — 最常寫 log 的地方**：
```go
func (s *preOrderService) CreatePreOrder(...) {
    logger.Info("建立預購單", "buyer_member_id", buyerMemberID)  // ← 關鍵業務事件

    if !hasTicket {
        logger.Error("驗證入場票券失敗", "error", err)           // ← 業務邏輯錯誤
        return nil, errors.New("需要先購買票券")
    }

    logger.Info("預購單建立成功", "id", preOrder.ID)            // ← 成功結果
}
```

**Repository — 只在錯誤時記錄**：
```go
func (r *boothProductRepository) GetByID(...) {
    err := db.Where("id = ?", id).First(&product).Error
    if err != nil {
        // 通常 Repository 不寫 log，讓 Service 層去記
        // 但如果是 DB 連線問題，可以在這裡記
        return nil, err  // ← 直接回傳 error 給 Service
    }
}
```

### 最佳實務

```
Middleware：自動記錄所有請求（Gin 內建，不用自己寫）
Handler：  幾乎不寫 log（除非 debug）
Service：  主要寫 log 的地方（業務事件 + 錯誤）
Repository：通常不寫 log（error 往上拋給 Service 記就好）
```

原因：如果每一層都寫 log，同一件事會被記錄 3-4 次，log 檔會很吵。
所以慣例是 **Service 層統一記錄業務日誌**，其他層只在特殊情況才記。

---

## Gin 的 `c` vs Go 的 `ctx`

常見混淆：Handler 參數裡的 `c` 是什麼？

```go
func (h *Handler) Update(c *gin.Context) {
//                       ↑ 這是 Gin 的 Context，不是 Go 原生的
```

| | `c *gin.Context` | `ctx context.Context` |
|---|---|---|
| **來源** | Gin 框架（第三方套件） | Go 標準庫 |
| **包含** | HTTP 的一切：URL、body、header、cookie | 只有取消信號、超時 |
| **用在** | Handler 層 | Service、Repository 層 |
| **能做** | `c.Param("id")`、`c.JSON(200, ...)`、`c.ShouldBindJSON()` | 傳遞超時，沒有 HTTP 功能 |

Handler 裡會同時看到兩者：

```go
func (h *Handler) Update(c *gin.Context) {
    id := c.Param("id")               // ← 用 Gin Context 讀 HTTP
    c.ShouldBindJSON(&req)             // ← 用 Gin Context 解析 JSON

    product, err := h.service.Update(
        c.Request.Context(),           // ← 取出 Go 原生 context 傳給 Service
        id, &req,                      //    因為 Service 不碰 Gin
    )

    c.JSON(200, product)               // ← 用 Gin Context 回傳 HTTP
}
```

一句話：`c` 是 Gin 的 HTTP 百寶箱，`ctx` 是 Go 原生的精簡背包。
Handler 用 `c` 處理 HTTP，用 `c.Request.Context()` 提取精簡版傳給下層。

---

## 一句話總結

| 概念 | 一句話 |
|------|--------|
| **Router Group** | 把共同的 URL 前綴提取出來，避免重複寫，還可以綁 Middleware |
| **`v1.Group("/xxx")`** | 建立子路由群組，路徑會自動疊加 |
| **Logger 放哪** | 哪裡都能放，但 Service 層是主要位置，Middleware 自動記 HTTP |
| **`c` (gin.Context)** | Gin 的 HTTP 百寶箱，只活在 Handler 層 |
| **`ctx` (context.Context)** | Go 原生的精簡背包，傳給 Service/Repository 層 |
