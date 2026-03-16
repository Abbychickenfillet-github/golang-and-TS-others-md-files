# Go 大寫（Public）≠ API Response

## 常見誤解

看到 `service.BoothPriceCacheData` 是大寫開頭，以為它會暴露給前端？不會。

## Go 的大寫規則

大寫 = **package 層級的 public**，表示「其他 package 可以 import 使用」。

```go
// service/booth_service.go
type BoothPriceCacheData struct { ... }  // 大寫 → handler package 可以用
type boothService struct { ... }         // 小寫 → 只有 service package 內部用
```

## 什麼才會變成 API Response？

只有 **dto 層** 的 struct，且有 `json` tag 的欄位，經過 `c.JSON()` 序列化後才會到前端：

```go
// dto/booth.go — 這個才會變成 API response
type BoothWithPrice struct {
    DisplayPrice float64  `json:"display_price"`   // ← 有 json tag → 前端看得到
    PriceType    *string  `json:"price_type"`
}

// service/booth_service.go — 這個不會到前端
type BoothPriceCacheData struct {
    PricingsByTypeID map[string][]models.EventBoothTypePricing  // 沒有 json tag
    DefaultPrices    map[string]float64                          // 內部用
}
```

## 三層架構中的資料流

```
DB → models.Booth (GORM tag)
        ↓
Service → service.BoothPriceCacheData (內部傳遞，大寫讓 handler 能用)
        ↓
Handler → dto.BoothWithPrice (json tag)
        ↓
前端 → { display_price: 450, price_name: "固定價格" }
```

## 結論

| 情況 | 大寫？ | 前端看得到？ |
|------|:------:|:-----------:|
| `dto.BoothWithPrice` | ✅ | ✅ 有 json tag |
| `service.BoothPriceCacheData` | ✅ | ❌ 沒有 json tag，不經過 c.JSON() |
| `service.boothService` | ❌ | ❌ |

**大寫決定的是 Go 的 package 可見性，不是 HTTP API 的可見性。**
