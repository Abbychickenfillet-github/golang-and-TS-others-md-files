# Go Struct 與 Request/Response 資料流

## c.ShouldBindJSON vs c.JSON

這兩個方向完全相反：

### `c.ShouldBindJSON(&req)` — 讀入（Request → Go struct）

解析前端送來的 JSON request body，填入 Go struct。

```go
// 前端 POST body: {"name":"早鳥禮","coupon_value":50}
var req dto.CreateEventCouponProgramRequest
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": err.Error()})
    return
}
// req.Name = "早鳥禮", req.CouponValue = 50
```

- 用 `&req`（指標）是因為要寫入資料到 req
- 搭配 struct tag `binding:"required"` 做驗證
- 失敗時回傳 422（UnprocessableEntity）

### `c.JSON(statusCode, obj)` — 寫出（Go struct → Response）

把 Go struct 序列化成 JSON 回傳給前端。

```go
c.JSON(http.StatusOK, result)
// 前端收到: {"id":"xxx","name":"早鳥禮","coupon_value":50,...}
```

- 不需要 `&`，直接傳值或指標都可以
- 搭配 struct tag `json:"field_name"` 控制 JSON key 名稱
- `json:"-"` 表示不序列化（如密碼欄位）
- `json:"xxx,omitempty"` 表示零值時省略

### 完整流程

```
前端 POST JSON ──→ c.ShouldBindJSON(&req) ──→ Go struct (DTO)
                                                    │
                                              Service 處理
                                                    │
前端收到 JSON ←── c.JSON(200, response) ←── Go struct (Response DTO)
```

---

## Go Struct vs JavaScript Object

Go 沒有 `class` 和 `object`，用 `struct`（結構體）代替。

| JavaScript / TypeScript | Go | 說明 |
|---|---|---|
| `{ name: "test" }` | `User{Name: "test"}` | 建立實例 |
| `new User()` | `User{}` 或 `&User{}` | `&` 回傳指標 |
| `class User extends Base` | 沒有繼承，用嵌入 | Go 用組合取代繼承 |
| `implements Interface` | 隱式實現 | 只要方法簽名符合就自動滿足 interface |
| `object` 是引用型別 | struct 是值型別 | 傳入函數會複製，要用 `*` 指標避免複製 |

### Struct 定義

```go
type User struct {
    Name  string  `json:"name"`           // JSON key: "name"
    Email string  `json:"email"`          // JSON key: "email"
    Phone *string `json:"phone,omitempty"` // 指標 = nullable
}
```

### Struct Tag（反引號）

```go
`json:"name" gorm:"type:varchar(255)" binding:"required"`
```

- `json:"name"` — JSON 序列化/反序列化時的 key
- `gorm:"..."` — GORM ORM 用的資料庫設定
- `binding:"required"` — Gin 的 ShouldBindJSON 驗證用

### 嵌入（組合取代繼承）

```go
type Base struct {
    ID        string    `json:"id"`
    CreatedAt time.Time `json:"created_at"`
}

type User struct {
    Base                          // 嵌入 Base，自動擁有 ID 和 CreatedAt
    Name string `json:"name"`
}
```

---

## DTO 的三種角色

| DTO 類型 | 用途 | 指標使用 |
|---|---|---|
| `CreateXxxRequest` | 前端 → 後端（建立） | `*string` = 可選欄位 |
| `UpdateXxxRequest` | 前端 → 後端（更新） | `*string` = 區分「沒送」vs「送 null」 |
| `XxxResponse` | 後端 → 前端（回應） | `*string` + `omitempty` = nullable |

### Update DTO 用 `*string` 的原因

```go
type UpdateRequest struct {
    Name *string `json:"name"` // *string 不是 string
}
```

- 前端沒送這個欄位 → `Name == nil` → 不更新
- 前端送 `"name": null` → `Name` 指向 nil 值 → 清除
- 前端送 `"name": "新名稱"` → `Name` 指向 "新名稱" → 更新

如果用 `string`（非指標），JSON `null` 和「沒送」都變成空字串 `""`，無法區分。
