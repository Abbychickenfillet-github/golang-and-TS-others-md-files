# DTO 與 API 回傳格式

## 1. DTO 是什麼

**DTO = Data Transfer Object**（資料傳輸物件），用來控制 API 回傳給前端的資料格式。

核心概念：**同一份資料庫資料（Model），可以轉換成不同的 DTO，讓不同身份的使用者看到不同的欄位。**

### 用 JS/TS 來理解

```typescript
// 假設你從 DB 拿到完整的攤位資料
const boothFromDB = {
  id: "abc-123",
  name: "好吃滷味",
  width: 3,
  depth: 2,
  height: 3,
  base_wattage: 500,
  pass_code: "SECRET123",    // 敏感資料！
  booking_status: "available",
  created_at: "2024-01-01",
  deleted_at: null,
};

// 管理端 DTO — 回傳 22 個欄位，包含尺寸、電力、時間戳
const adminResponse = {
  id: boothFromDB.id,
  name: boothFromDB.name,
  width: boothFromDB.width,
  depth: boothFromDB.depth,
  height: boothFromDB.height,
  base_wattage: boothFromDB.base_wattage,
  // pass_code 刻意不放（用 json:"-" 隱藏）
  booking_status: boothFromDB.booking_status,
  created_at: boothFromDB.created_at,
  deleted_at: boothFromDB.deleted_at,
  // ...其他管理欄位
};

// 消費者端 DTO — 只回傳 12 個欄位，精簡版
const consumerResponse = {
  id: boothFromDB.id,
  name: boothFromDB.name,
  booking_status: boothFromDB.booking_status,
  // 沒有 width, depth, height
  // 沒有 base_wattage
  // 沒有 pass_code
  // 沒有 created_at, deleted_at
};
```

### 在 Go 裡面

Go 用 **struct** 定義 DTO，每個 struct 就代表一種回傳格式：

```go
// 管理端 DTO（22 個欄位）
type BoothPublic struct {
    ID                 string     `json:"id"`
    Name               string     `json:"name"`
    Width              *int       `json:"width"`
    Depth              *int       `json:"depth"`
    Height             *int       `json:"height"`
    BaseWattage        int        `json:"base_wattage"`
    PassCode           *string    `json:"-"`                    // <-- 隱藏！
    CreatedAt          time.Time  `json:"created_at"`
    DeletedAt          *time.Time `json:"deleted_at,omitempty"` // <-- 空值不出現
    // ...更多欄位
}

// 消費者端 DTO（12 個欄位）
type BoothConsumerPublic struct {
    ID                 string     `json:"id"`
    Name               string     `json:"name"`
    BookingStatus      string     `json:"booking_status"`
    // 就這些，沒有 width/depth/height/base_wattage/pass_code/created_at/deleted_at
}
```

---

## 2. 一支 API 的回傳格式是固定的

### 規則：一個 endpoint = 一個固定的 DTO

REST API 的設計原則：**每個 endpoint 回傳的資料結構（DTO）是固定的**。

你不能讓：
- A 頁面打 `GET /api/v1/booths` 拿到欄位 1, 2, 3
- B 頁面打 `GET /api/v1/booths` 拿到欄位 2, 5

**如果需要不同欄位組合，就開不同的 endpoint：**

```
GET /api/v1/booths              → 消費者端，回傳 BoothConsumerPublic（精簡）
GET /api/v1/booths/map/:id      → 根據身份回傳不同 DTO（見第 3 節）
GET /api/v1/admin/booths        → 管理端，回傳 BoothPublic（完整）
```

### 用 JS/TS 來理解

```typescript
// REST API：endpoint 固定回傳格式
app.get("/api/booths", (req, res) => {
  // 這個 endpoint 永遠回傳精簡格式
  res.json(booths.map(b => ({
    id: b.id,
    name: b.name,
    booking_status: b.booking_status,
  })));
});

// 如果需要完整格式，開另一個 endpoint
app.get("/api/admin/booths", (req, res) => {
  // 這個 endpoint 永遠回傳完整格式
  res.json(booths.map(b => ({
    id: b.id,
    name: b.name,
    width: b.width,
    depth: b.depth,
    base_wattage: b.base_wattage,
    created_at: b.created_at,
    // ...全部欄位
  })));
});
```

### 例外：GraphQL

GraphQL 是唯一可以讓前端自己選欄位的方式：

```graphql
# 前端 A 頁面：只要 name 和 status
query {
  booths {
    name
    booking_status
  }
}

# 前端 B 頁面：要更多欄位
query {
  booths {
    name
    width
    depth
    base_wattage
  }
}
```

但我們專案用的是 REST API + Gin，所以每個 endpoint 的回傳格式就是固定的。

---

## 3. 同一個 endpoint 可以依身份回不同 DTO

雖然一般情況下一個 endpoint 對應一個 DTO，但有個例外：**同一個 endpoint 根據使用者身份回傳不同的 DTO**。

### 運作方式

```
使用者發請求 → middleware 判斷身份 → handler 用 if/else 選 DTO → 回傳
```

### 實際程式碼：GetBoothMapLayout

在 `booth_handler.go` 的 `GetBoothMapLayout` 函數中：

```go
func (h *BoothHandler) GetBoothMapLayout(c *gin.Context) {
    // ...省略前面的資料查詢...

    // 判斷身份：是否有權限看密碼（= 管理端身份）
    canViewPassCode := false

    // 檢查是否為後台管理員（superuser）
    if userInterface, hasUser := c.Get(middleware.UserKey); hasUser {
        if user, ok := userInterface.(*models.User); ok && user.IsSuperuser {
            canViewPassCode = true
        }
    }

    // 檢查是否為主辦方
    if !canViewPassCode {
        if memberInterface, hasMember := c.Get(middleware.MemberKey); hasMember {
            if member, ok := memberInterface.(*models.Member); ok {
                for _, identity := range member.GetIdentities() {
                    if identity == models.MemberIdentityOrganizer {
                        canViewPassCode = true
                        break
                    }
                }
            }
        }
    }

    // 根據身份選不同的 DTO
    if canViewPassCode {
        // ===== 管理端：用完整的 BoothWithPrice =====
        boothList := make([]dto.BoothWithPrice, 0, len(boothRows))
        for _, row := range boothRows {
            boothPublic := h.boothService.BoothToPublic(&booth)
            bwp := dto.BoothWithPrice{
                BoothPublic:  *boothPublic,   // 22 個欄位
                DisplayPrice: displayPrice,
                PassCode:     booth.PassCode,  // 管理端才看得到密碼
                // ...
            }
            boothList = append(boothList, bwp)
        }
        c.JSON(http.StatusOK, dto.BoothMapLayoutResponse{
            Booths: boothList,  // []BoothWithPrice
            // ...
        })
    } else {
        // ===== 消費者端：用精簡的 BoothWithPriceConsumer =====
        boothList := make([]dto.BoothWithPriceConsumer, 0, len(boothRows))
        for _, row := range boothRows {
            consumerPublic := h.boothService.BoothToConsumerPublic(&booth)
            bwp := dto.BoothWithPriceConsumer{
                BoothConsumerPublic: *consumerPublic,  // 12 個欄位
                DisplayPrice:        displayPrice,
                // 沒有 PassCode
                // ...
            }
            boothList = append(boothList, bwp)
        }
        c.JSON(http.StatusOK, dto.BoothMapLayoutConsumerResponse{
            Booths: boothList,  // []BoothWithPriceConsumer
            // ...
        })
    }
}
```

### 用 JS/TS 來理解

```typescript
app.get("/api/booths/map/:eventId", authMiddleware, (req, res) => {
  const booths = getBoothsFromDB(req.params.eventId);

  if (req.user.role === "admin" || req.user.role === "organizer") {
    // 管理端：回傳完整資料
    res.json({
      booths: booths.map(b => ({
        id: b.id,
        name: b.name,
        width: b.width,
        depth: b.depth,
        pass_code: b.pass_code,  // 管理端才有
        created_at: b.created_at,
        // ...22 個欄位
      })),
    });
  } else {
    // 消費者端：回傳精簡資料
    res.json({
      booths: booths.map(b => ({
        id: b.id,
        name: b.name,
        booking_status: b.booking_status,
        // ...12 個欄位，沒有 pass_code, width, depth 等
      })),
    });
  }
});
```

---

## 4. 資料流程（完整）

```
Repository 查 DB
    → Model（全部欄位，例如 models.Booth 有 ~20 個欄位）
    ↓
Service 轉換
    → BoothToPublic()          回傳 BoothPublic（管理端，22 個欄位）
    → BoothToConsumerPublic()  回傳 BoothConsumerPublic（消費者端，12 個欄位）
    ↓
Handler 判斷身份
    → if canViewPassCode → 用 BoothPublic
    → else               → 用 BoothConsumerPublic
    ↓
Gin 的 c.JSON() 自動 JSON 序列化
    → 前端只拿到 DTO struct 裡定義的欄位
    → json:"-" 的欄位完全不會出現在 JSON 中
    → json:"xxx,omitempty" 的欄位如果是空值也不會出現
```

### 對照專案程式碼

| 步驟 | 檔案 | 函數 |
|------|------|------|
| 查 DB | `repository/booth_repository.go` | `GetByID()`, `GetMulti()` |
| 轉 DTO | `service/booth_service.go` | `BoothToPublic()`, `BoothToConsumerPublic()` |
| 判斷身份 | `handler/booth_handler.go` | `GetBoothMapLayout()` 裡的 `canViewPassCode` |
| JSON 回傳 | `handler/booth_handler.go` | `c.JSON(http.StatusOK, ...)` |

---

## 5. DTO 不是「過濾」是「轉換」

很重要的觀念：DTO 不是從 JSON 結果「過濾掉」不要的欄位，而是 **Service 層主動把 Model 的欄位「填進」DTO struct** 。

### 只填需要的欄位

```go
// Service 層的轉換函數
func (s *boothService) BoothToConsumerPublic(booth *models.Booth) *dto.BoothConsumerPublic {
    return &dto.BoothConsumerPublic{
        ID:            booth.ID,           // 填
        EventID:       booth.EventID,      // 填
        MapID:         booth.MapID,        // 填
        Name:          booth.Name,         // 填
        BookingStatus: booth.BookingStatus, // 填
        Coordinate:    booth.Coordinate,   // 填
        // Width?     沒填 → JSON 裡不會出現
        // Depth?     沒填 → JSON 裡不會出現
        // PassCode?  沒填 → JSON 裡不會出現
        // CreatedAt? 沒填 → JSON 裡不會出現
    }
}
```

### json tag 的控制技巧

#### `json:"-"` — 絕對隱藏

即使你填了值，JSON 序列化時也會完全忽略這個欄位：

```go
type BoothPublic struct {
    PassCode *string `json:"-"` // 即使 PassCode 有值，JSON 裡也不會出現
}
```

為什麼 `BoothPublic` 要保留 `PassCode` 欄位但用 `json:"-"`？
因為 Go 程式內部可能需要存取這個值（例如判斷 `HasPassCode`），但不想讓它出現在 API 回傳的 JSON 裡。

#### `json:"xxx,omitempty"` — 空值不出現

```go
type BoothPublic struct {
    DeletedAt *time.Time `json:"deleted_at,omitempty"` // 如果是 nil，JSON 裡不會出現這個 key
}

type BoothConsumerPublic struct {
    MapID    *string `json:"map_id,omitempty"`    // 如果是 nil，不出現
    Area     *string `json:"area,omitempty"`      // 如果是 nil，不出現
}
```

**注意 `omitempty` 的判斷標準：**
- 指標型別 (`*string`, `*int`)：`nil` 時省略
- 字串 (`string`)：`""` 空字串時省略
- 數字 (`int`, `float64`)：`0` 時省略
- 布林 (`bool`)：`false` 時省略
- 切片 (`[]T`)：`nil` 或長度 0 時省略

### 用 JS/TS 來理解

```typescript
// Go 的 DTO 轉換，等同於 JS 裡手動建立新物件只挑需要的欄位
function boothToConsumerPublic(booth: BoothModel): BoothConsumerPublic {
  return {
    id: booth.id,
    name: booth.name,
    booking_status: booth.booking_status,
    // 不放 width, depth, height, pass_code 等
    // 所以回傳的 JSON 裡自然不會有這些 key
  };
}

// json:"-" 類似 JS 的 delete 或 destructuring 排除
const { pass_code, ...safeData } = boothFromDB;
// safeData 裡就沒有 pass_code 了

// json:"xxx,omitempty" 類似 JS 的條件展開
const response = {
  id: booth.id,
  ...(booth.deleted_at ? { deleted_at: booth.deleted_at } : {}),
};
```

---

## 6. 實際範例：BoothPublic vs BoothConsumerPublic

### 欄位差異對照表

| 欄位 | BoothPublic（管理端） | BoothConsumerPublic（消費者端） | 說明 |
|------|:---:|:---:|------|
| `id` | v | v | 攤位 ID |
| `event_id` | v | v | 活動 ID |
| `map_id` | v | v | 地圖 ID |
| `booth_type` | v | v | 攤位類型 |
| `event_booth_type_id` | v | v | 攤位類型 ID |
| `area` | v | v | 攤位區域 |
| `name` | v | v | 商家名稱 |
| `override_booth_price` | v | v | 覆蓋價格 |
| `currency` | v | v | 貨幣 |
| `booking_status` | v | v | 預訂狀態 |
| `coordinate` | v | v | 地圖座標 |
| `width` | v | x | 寬度（消費者不需要） |
| `depth` | v | x | 深度（消費者不需要） |
| `height` | v | x | 高度（消費者不需要） |
| `base_wattage` | v | x | 基本電量（消費者不需要） |
| `excess_wattage` | v | x | 超額電量（消費者不需要） |
| `status` | v | x | 是否啟用（內部管理用） |
| `booking_at` | v | x | 預訂時間（內部管理用） |
| `display_width` | v | x | 顯示寬度（前台地圖渲染用其他方式） |
| `display_height` | v | x | 顯示高度 |
| `pass_code` | `json:"-"` 隱藏 | 不存在 | 通關密碼（絕對不能外洩） |
| `created_at` | v | x | 建立時間（消費者不需要） |
| `updated_at` | v | x | 更新時間（消費者不需要） |
| `deleted_at` | v（`omitempty`） | x | 刪除時間（消費者不需要） |

**統計：管理端 22 個欄位（PassCode 隱藏所以實際 JSON 裡 21 個），消費者端 11 個欄位。**

### DTO 繼承：BoothWithPrice

當需要在 DTO 基礎上增加欄位時，Go 用 **struct 嵌入（embedding）** 實現類似繼承的效果：

```go
// 管理端：完整攤位 + 價格資訊
type BoothWithPrice struct {
    BoothPublic                         // 嵌入 BoothPublic 的所有欄位
    DisplayPrice float64 `json:"display_price"`
    PriceType    *string `json:"price_type"`
    PriceName    *string `json:"price_name"`
    OrderID      *string `json:"order_id"`
    HasPassCode  bool    `json:"has_pass_code"`
    PassCode     *string `json:"pass_code"`     // 管理端才有
}

// 消費者端：精簡攤位 + 價格資訊
type BoothWithPriceConsumer struct {
    BoothConsumerPublic                  // 嵌入 BoothConsumerPublic 的所有欄位
    DisplayPrice float64 `json:"display_price"`
    PriceType    *string `json:"price_type,omitempty"`
    PriceName    *string `json:"price_name,omitempty"`
    OrderID      *string `json:"order_id,omitempty"`
    HasPassCode  bool    `json:"has_pass_code"`
    // 沒有 PassCode
}
```

用 JS/TS 來理解 struct 嵌入：

```typescript
// Go 的 struct 嵌入 ≈ TypeScript 的 intersection type
type BoothWithPrice = BoothPublic & {
  display_price: number;
  price_type?: string;
  price_name?: string;
  order_id?: string;
  has_pass_code: boolean;
  pass_code?: string;
};

// 或是用 extends
interface BoothWithPrice extends BoothPublic {
  display_price: number;
  price_type?: string;
  // ...
}
```

---

## 7. Gin 是什麼？自動 JSON 序列化怎麼運作？

### Gin 一句話解釋

**Gin = Go 的 Express.js**。一個 HTTP 框架，幫你處理路由、middleware、請求/回應。

| 功能 | Express.js (Node) | Gin (Go) |
|------|---|---|
| 定義路由 | `app.get("/users", handler)` | `r.GET("/users", handler)` |
| 取得路徑參數 | `req.params.id` | `c.Param("id")` |
| 取得 query 參數 | `req.query.page` | `c.Query("page")` |
| 解析 request body | `req.body`（需 body-parser） | `c.ShouldBindJSON(&dto)` |
| 回傳 JSON | `res.json(data)` | `c.JSON(200, data)` |
| Middleware | `app.use(authMiddleware)` | `r.Use(middleware.Auth())` |

### c.JSON() — 自動 JSON 序列化

`c.JSON()` 做了三件事：
1. 設定 `Content-Type: application/json`
2. 把 Go struct **自動轉成 JSON**（內部呼叫 `json.Marshal()`）
3. 寫入 HTTP response body

```go
// Handler 裡只要寫一行：
c.JSON(http.StatusOK, dto.BoothConsumerPublic{
    ID:            "abc-123",
    Name:          "好吃滷味",
    BookingStatus: "available",
})

// Gin 自動產出的 HTTP response：
// HTTP/1.1 200 OK
// Content-Type: application/json; charset=utf-8
//
// {"id":"abc-123","name":"好吃滷味","booking_status":"available"}
```

等同於 Express.js 的：
```js
res.json({
  id: "abc-123",
  name: "好吃滷味",
  booking_status: "available",
})
```

### JSON tag 決定 key 名稱

Go struct 的欄位名是 `PascalCase`（如 `BookingStatus`），但 JSON 需要 `snake_case`（如 `booking_status`）。`json` tag 做這個轉換：

```go
type BoothConsumerPublic struct {
    ID            string `json:"id"`              // Go: ID → JSON: "id"
    Name          string `json:"name"`            // Go: Name → JSON: "name"
    BookingStatus string `json:"booking_status"`  // Go: BookingStatus → JSON: "booking_status"
    MapID         *string `json:"map_id,omitempty"` // nil 時 JSON 裡不出現
    PassCode      *string `json:"-"`               // 永遠不出現在 JSON
}
```

沒有 `json` tag 的話，Gin 會直接用 Go 欄位名（PascalCase）作為 JSON key：
```json
{"ID":"abc-123","Name":"好吃滷味","BookingStatus":"available"}
```
前端就要用 `data.BookingStatus` 而不是 `data.booking_status`，很不方便。

### c.ShouldBindJSON() — 自動解析 request body

反過來，前端 POST 過來的 JSON 也能自動解析成 Go struct：

```go
// 前端送來：
// POST /api/v1/booths
// {"name": "好吃滷味", "booth_type": "food"}

// Handler 裡：
var req dto.BoothCreate
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(400, gin.H{"detail": "請求格式錯誤"})
    return
}
// req.Name = "好吃滷味"
// req.BoothType = "food"
```

等同於 Express.js 的：
```js
const { name, booth_type } = req.body
```

差別是 Go 會在**編譯時**就檢查型別，Express.js 要到**執行時**才會發現型別錯誤。

### gin.H{} — 快速建立 JSON

不想定義完整 struct 時，可以用 `gin.H{}`（底層是 `map[string]interface{}`）：

```go
// 錯誤回應常用 gin.H{}，不用特地定義 DTO
c.JSON(http.StatusNotFound, gin.H{
    "detail": "攤位不存在",
})
// → {"detail":"攤位不存在"}

c.JSON(http.StatusOK, gin.H{
    "message": "成功",
    "count":   42,
})
// → {"message":"成功","count":42}
```

等同於 Express.js 的：
```js
res.status(404).json({ detail: "攤位不存在" })
```

### Gin 處理一個 HTTP 請求的完整流程

```
前端發送 HTTP 請求
    ↓
Gin Router 匹配路由（GET /api/v1/booths/map/:event_id）
    ↓
Middleware 鏈執行（CORS → Auth → RateLimit → ...）
    ↓
Handler 函數執行
    ├── c.Param("event_id")          取路徑參數
    ├── c.ShouldBindJSON(&req)       解析 request body（POST/PUT）
    ├── service.DoSomething()        呼叫商業邏輯
    └── c.JSON(200, responseDTO)     回傳 JSON（自動序列化）
    ↓
Gin 自動設定 Content-Type + 序列化 JSON + 寫入 response
    ↓
前端收到 JSON response
```

### Gin vs 其他框架對照

| | Express.js (Node) | Gin (Go) | FastAPI (Python) |
|---|---|---|---|
| 回傳 JSON | `res.json(obj)` | `c.JSON(200, obj)` | `return obj`（自動） |
| 路由定義 | `app.get()` | `r.GET()` | `@app.get()` |
| 取路徑參數 | `req.params.id` | `c.Param("id")` | `def func(id: str)` |
| 解析 body | `req.body` | `c.ShouldBindJSON()` | `def func(body: Schema)` |
| Middleware | `app.use(fn)` | `r.Use(fn)` | `@app.middleware()` |
| 效能 | 中等 | 極快 | 中等 |

---

## 8. 關聯文件

| 檔案 | 用途 |
|------|------|
| `internal/models/booth.go` | Booth Model（GORM 資料模型，對應 DB 的 booth 表） |
| `internal/dto/booth.go` | Booth DTO（所有請求/回應的結構定義） |
| `internal/service/booth_service.go` | `BoothToPublic()` / `BoothToConsumerPublic()` 轉換邏輯 |
| `internal/handler/booth_handler.go` | `GetBoothMapLayout()` 依身份選 DTO 的實際範例 |

---

## 相關筆記

- [struct-tag-backtick-json.md](struct-tag-backtick-json.md) -- Backtick、雙引號、json tag、Logger 與 Struct 的關係
- [json-raw-message.md](json-raw-message.md) -- json.RawMessage、Marshal/Unmarshal
- [GORM.md](GORM.md) -- GORM 模型與資料庫操作
