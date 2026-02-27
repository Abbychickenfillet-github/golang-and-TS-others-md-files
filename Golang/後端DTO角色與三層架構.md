# 後端 DTO 角色與三層架構（+ Model 的定位）

## 架構全貌

```
HTTP 請求 (JSON)
    ↓
┌──────────────────────────────────────────────────┐
│  Handler（門衛 / 接線生）                          │
│  職責：解析 HTTP、驗證權限、回傳 JSON               │
│  知道：誰在請求、請求格式對不對                      │
│  碰到：gin.Context、DTO                            │
└───────────────────┬──────────────────────────────┘
                    ↓  傳入 DTO + caller 資訊
┌──────────────────────────────────────────────────┐
│  Service（業務邏輯 / 決策者）                       │
│  職責：商業規則、流程控制、寫 action_log             │
│  知道：能不能做、怎麼做、要呼叫哪些 repo             │
│  碰到：DTO（輸入）、Model（輸出）、Repository        │
└───────────────────┬──────────────────────────────┘
                    ↓  操作 Model
┌──────────────────────────────────────────────────┐
│  Repository（資料層 / 倉庫管理員）                   │
│  職責：SQL 查詢、CRUD                              │
│  知道：資料怎麼存取                                 │
│  碰到：Model、GORM                                 │
└──────────────────────────────────────────────────┘
                    ↓
               MySQL 資料庫
```

---

## Handler ≠ Router

常見誤解：Handler 就是 Router？不是，它們是合作關係。

**Router**（路由）= 一張對照表，「哪個 URL 對應哪個 Handler」
**Handler**（處理器）= 實際執行的函式，「收到請求後要做什麼」

```go
// main.go 裡的 Router（路由註冊）— 只是在「接線」
boothProducts.PATCH("/:id", TryBothAuth(), handler.UpdateBoothProduct)
//                   ↑ URL       ↑ Middleware     ↑ Handler 函式
```

```go
// handler 檔案裡（處理邏輯）— 真正「做事」
func (h *BoothProductHandler) UpdateBoothProduct(c *gin.Context) {
    // 解析、驗證、呼叫 Service、回傳
}
```

比喻：
- **Router** = 公司總機：「分機 201 轉接業務部小王」
- **Middleware** = 門禁：「你有門卡嗎？」
- **Handler** = 小王本人：「好的，我來處理你的需求」

---

## Model 算不算一種架構？

**Model 不是「流程中的一層」，而是「各層共用的資料結構定義」。**

三層架構（Handler → Service → Repository）描述的是**請求的處理流程**，
每一層負責一段工作然後往下傳。

Model 是**橫跨所有層的基礎元件**，像是建築的「磚塊規格」：

```
             Handler    Service    Repository
               │          │          │
Model ─────────┼──────────┼──────────┤  ← 所有層都認識 Model
               │          │          │
DTO ───────────┤──────────┤          │  ← Handler 和 Service 用 DTO 溝通
               │          │          │
Repository     │          │          ├  ← 只有 Repository 碰 SQL
```

### Model vs DTO 差異

| | Model | DTO |
|---|-------|-----|
| **定義位置** | `internal/models/` | `internal/dto/` |
| **對應什麼** | 資料庫的表（table） | API 的請求/回應格式 |
| **誰用** | Service + Repository | Handler + Service |
| **有 GORM tag** | 有（`gorm:"type:varchar(36)"`） | 沒有 |
| **有 JSON tag** | 有，但主要給 GORM 用 | 有，給 HTTP JSON 用 |
| **包含敏感欄位** | 可能（如 deleted_at、valid） | 只暴露該暴露的 |

### 專案中的實際例子

**Model**（`models/booth_product.go`）— 對應 DB table，有 GORM tag：
```go
type BoothProduct struct {
    ID            string          `gorm:"type:varchar(36);primaryKey"`
    Name          string          `gorm:"type:varchar(255);not null"`
    Price         decimal.Decimal `gorm:"type:decimal(12,2)"`
    DeactivatedBy *string         `gorm:"type:varchar(36)"`  // DB 欄位
    DeletedAt     gorm.DeletedAt  // 軟刪除（不該暴露給前端）
    Valid         bool            // 內部標記（不該暴露給前端）
}
```

**DTO — 輸入**（`dto/booth_product.go`）— 前端傳進來的 JSON：
```go
type BoothProductUpdate struct {
    Name   *string `json:"name,omitempty"`    // 用指標，沒傳就是 nil（不更新）
    Price  *string `json:"price,omitempty"`   // 字串格式，Service 會轉 decimal
    Status *string `json:"status,omitempty"`  // "active" 或 "inactive"
}
```

**DTO — 輸出**（`dto/booth_product.go`）— 回傳給前端的 JSON：
```go
type BoothProductPublic struct {
    ID            string  `json:"id"`
    Name          string  `json:"name"`
    Price         string  `json:"price"`           // decimal 轉成字串
    DeactivatedBy *string `json:"deactivated_by"`  // 前端用來判斷是否被系統下架
    // 注意：沒有 DeletedAt、沒有 Valid → 不暴露內部欄位
}
```

---

## 各層職責詳解

### Handler — 門衛

```go
func (h *BoothProductHandler) UpdateBoothProduct(c *gin.Context) {
    // 1. 權限檢查（你能不能進來？）
    if !h.checkBoothProductPermission(c, "booth_product.update") {
        return
    }

    // 2. 解析 HTTP 參數（你帶了什麼？）
    id := c.Param("id")                    // URL: /booth-products/:id
    var req dto.BoothProductUpdate          // ← 輸入 DTO
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"detail": err.Error()})  // JSON 格式錯 → 400
        return
    }

    // 3. 取出 caller 資訊（你是誰？）
    //    這只有 Handler 能做，因為認證資訊在 HTTP context 裡
    auth := middleware.GetAuthInfo(c)
    callerType, callerID := "", ""
    if auth.HasUser() {
        callerType, callerID = "user", auth.GetUserID()
    } else if auth.HasMember() {
        callerType, callerID = "member", auth.GetMemberID()
    }

    // 4. 呼叫 Service（交給業務邏輯處理）
    product, err := h.boothProductService.UpdateBoothProduct(
        ctx, id, &req, callerType, callerID,
    )

    // 5. 回傳 HTTP 回應（Model → DTO → JSON）
    c.JSON(200, h.boothProductService.BoothProductToPublic(product))
}
```

**Handler 不知道的事：**
- 不知道「品牌商能不能上架系統下架的商品」（業務規則 → Service 管）
- 不知道「SQL 怎麼 UPDATE」（資料操作 → Repository 管）

### Service — 決策者

```go
func (s *boothProductService) UpdateBoothProduct(
    ctx context.Context,
    id string,
    req *dto.BoothProductUpdate,   // ← 從 Handler 收到的 DTO
    callerType, callerID string,   // ← 從 Handler 收到的 caller 資訊
) (*models.BoothProduct, error) {  // ← 回傳 Model

    // 1. 透過 Repository 查現有資料
    product, _ := s.boothProductRepo.GetByID(ctx, id, false)

    // 2. 業務規則判斷
    if *req.Status == "active" && product.DeactivatedBy != nil && callerType == "member" {
        return nil, errors.New("此商品已被系統方下架，無法自行上架")
    }

    // 3. 更新 Model 欄位
    product.Status = *req.Status
    if callerType == "user" {
        product.DeactivatedBy = &callerID
    }

    // 4. 透過 Repository 寫入 DB
    s.boothProductRepo.Update(ctx, product)

    // 5. 寫 action_log（審計紀錄）
    s.actionLogRepo.Create(ctx, &models.ActionLog{...})

    return product, nil  // ← 回傳 Model 給 Handler
}
```

**Service 不知道的事：**
- 不知道請求是 HTTP 還是 CLI（不碰 `gin.Context`）
- 不知道 SQL 語法（呼叫 Repository 的方法就好）

### Repository — 倉庫管理員

```go
func (r *boothProductRepository) Update(ctx context.Context, product *models.BoothProduct) error {
    return r.db.WithContext(ctx).Save(product).Error  // ← 純粹的 GORM 操作
}

func (r *boothProductRepository) GetByID(ctx context.Context, id string, includeDeleted bool) (*models.BoothProduct, error) {
    var product models.BoothProduct
    db := r.db.WithContext(ctx)
    if includeDeleted {
        db = db.Unscoped()
    }
    err := db.Where("id = ?", id).First(&product).Error
    return &product, err
}
```

---

## 「caller 資訊」完整解釋

`caller` 不是 Go 的關鍵字，是我們自己取的變數名稱。
caller = 呼叫者 = 「誰發出這個請求」。

```go
callerType, callerID := "", ""
//  ↑           ↑
//  這兩個名字都是我們自己取的，不是 Go 語法
//  也可以叫 operatorType, operatorID 或任何名字
```

完整流程：

```
系統管理員（User）在 Dashboard 點「下架」
    ↓
HTTP PATCH /api/v1/booth-products/xxx
Header: Authorization: Bearer <token>
    ↓
middleware.GetAuthInfo(c) 從 token 解出：
    callerType = "user"        ← 系統管理員
    callerID   = "usr_abc123"  ← 這個管理員的 ID
    ↓
Service 拿到這兩個值後決定：
    → callerType 是 "user" → 寫入 deactivated_by = "usr_abc123"
    → 寫 action_log：誰(usr_abc123) 做了什麼(DEACTIVATE)
```

為什麼 Handler 要傳給 Service，Service 不自己拿？
**因為 Service 不碰 HTTP，不知道 `gin.Context` 的存在。**
這樣 Service 可以被其他地方呼叫（排程任務、CLI 工具），不只是 HTTP handler。

---

## Go 語法釐清

### `var req dto.BoothProductUpdate` — 變數名稱是 `req`

```go
var req dto.BoothProductUpdate
//  ↑    ↑
//  │    └── 型別：dto package 裡的 BoothProductUpdate struct
//  └─────── 變數名稱：req（request 的縮寫）
```

Go 的變數宣告語法是 `var 名稱 型別`，跟 TypeScript 相反：

```
Go:         var req dto.BoothProductUpdate
TypeScript: let req: BoothProductUpdate
```

宣告完之後，`req` 是一個空的 struct，接著用 `ShouldBindJSON(&req)` 把 JSON 填進去：

```go
var req dto.BoothProductUpdate              // req = {} (空的)
if err := c.ShouldBindJSON(&req); err != nil { // 把 HTTP body JSON 塞進 req
    ...
}
// 現在 req.Name = "商品A", req.Price = "100" ...
```

### `dto.` 前綴 — 是 package 引用

在檔案最上方的 import：

```go
import (
    "github.com/yutuo-tech/futuresign_backend/internal/dto"
    //                                               ↑
    //                                          這整個資料夾
)
```

**Go 的 package = 資料夾**。`internal/dto/` 裡不管幾個 `.go` 檔，都屬於同一個 `dto` package：

```
internal/dto/booth_product.go   → package dto → dto.BoothProductUpdate
internal/dto/pre_order.go       → package dto → dto.PreOrderCreate
internal/dto/event_coupon.go    → package dto → dto.EventCouponCreate
```

全部用 `dto.XXX` 存取。

### `checkBoothProductPermission` vs `BoothProductUpdate` — 完全不同的東西

```go
// 這是「權限檢查」— 問的是「你有沒有資格做這件事」
// "booth_product.update" 只是一個權限名稱字串，存在 permission 資料表裡
if !h.checkBoothProductPermission(c, "booth_product.update") { ... }

// 這是「資料結構定義」— 定義的是「請求的 JSON 長什麼樣」
type BoothProductUpdate struct { ... }
```

兩者只是剛好名字像而已（都有 update），沒有任何程式上的關聯。

### `[]string` vs `json.RawMessage` — 已解析 vs 未解析

```go
// DTO（面向 API）— 已解析，前端直接用
ImgURLs []string `json:"img_urls,omitempty"`

// Model（面向 DB）— 未解析，直接對應 MySQL JSON 欄位
ImgURLs json.RawMessage `gorm:"type:json" json:"img_urls,omitempty"`
```

| | `[]string` | `json.RawMessage` |
|---|-----------|-------------------|
| **本質** | Go 的字串陣列 | 原始 JSON bytes（`[]byte`） |
| **記憶體中** | `["a.jpg", "b.jpg"]` 已解析 | `[34,97,46,106,...]` 原始 bytes |
| **用在** | DTO（API 層），方便前端操作 | Model（DB 層），直接存取 JSON 欄位 |
| **為什麼** | 前端收到就能用 `img_urls[0]` | MySQL JSON 欄位原封不動搬進搬出，效能好 |

所以 Service 的 `BoothProductToPublic` 裡會做轉換：

```go
// Model(json.RawMessage) → DTO([]string)
var imgURLs []string                          // 準備空的 []string
json.Unmarshal(product.ImgURLs, &imgURLs)     // 把 raw bytes 解析成字串陣列
public.ImgURLs = imgURLs                      // 塞進 DTO 給前端
```

---

## 一句話總結

| 元件 | 一句話 |
|------|--------|
| **Router** | 「哪個 URL 找哪個 Handler」— 總機轉接表 |
| **Middleware** | 「進門前先檢查門卡」— 認證/日誌等前置處理 |
| **Handler** | 「誰在敲門、帶了什麼、回覆什麼格式」— 門衛 |
| **Service** | 「能不能做、怎麼做、要記錄什麼」— 決策者 |
| **Repository** | 「SQL 怎麼寫」— 倉庫管理員 |
| **Model** | 「資料庫長什麼樣」— 各層共用的磚塊規格 |
| **DTO** | 「API 長什麼樣」— Handler↔Service 之間的信封 |
| **caller** | 不是 Go 語法，是我們自己取的變數名，代表「誰發出請求」 |
