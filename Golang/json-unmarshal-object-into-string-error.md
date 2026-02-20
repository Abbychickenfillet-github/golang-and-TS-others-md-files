# JSON Unmarshal Error: cannot unmarshal object into Go struct field

## 錯誤訊息
```
json cannot unmarshal object into Go struct: field Product
```

## 問題情境
建立商品 (POST /api/v1/products) 時發生錯誤。

### 前端傳送的 JSON
```json
{
  "name": "有花邊的桌子",
  "description": "賞心悅目的展示使用",
  "price": 400,
  "currency": "TWD",
  "event_id": "2c2da872-f71e-4e8e-8066-20d30bb5498d",
  "product_type_id": "00000000-0000-0000-0000-000000003003",
  "purchase_type": "rent",
  "total_quantity": -8,
  "available_quantity": -8,
  "status": "active",
  "specifications": {
    "width": 50,
    "depth": 70,
    "height": 40
  }
}
```

### Go DTO 定義 (dto/product.go)
```go
type ProductCreate struct {
    // ...其他欄位...
    Specifications *string `json:"specifications,omitempty"` // 設備規格 JSON
}
```

## 根本原因

**型別不匹配**：
- Go DTO 期望 `specifications` 是 `*string`（JSON 字串）
- 前端傳送的是 **物件**（`{width: 50, ...}`）

Go 的 JSON decoder 無法把一個 object 直接塞進 string 型別。

## 解決方案

### 方案 A：前端修改（推薦）
在前端傳送前，把 specifications 物件轉成 JSON 字串：

```typescript
// 前端
const productData = {
  name: "有花邊的桌子",
  // ...
  specifications: JSON.stringify({ width: 50, depth: 70, height: 40 })
  // 結果: specifications: "{\"width\":50,\"depth\":70,\"height\":40}"
};
```

### 方案 B：後端修改
把 DTO 的 `specifications` 改成可以接受任意 JSON：

```go
import "encoding/json"

type ProductCreate struct {
    // ...
    Specifications json.RawMessage `json:"specifications,omitempty"` // 接受任意 JSON
}
```

或使用 map：
```go
type ProductCreate struct {
    // ...
    Specifications map[string]interface{} `json:"specifications,omitempty"`
}
```

## 其他注意事項

這個請求還有另一個問題：
```json
"total_quantity": -8,
"available_quantity": -8
```

庫存數量不應該是負數！DTO 有驗證 `binding:"omitempty,gte=0"`，但因為 JSON unmarshal 先失敗了，驗證還沒跑到。

## 相關檔案
- `backend-go/internal/dto/product.go` - DTO 定義
- `backend-go/internal/models/product.go` - Model 定義
- `backend-go/internal/handler/product_handler.go` - Handler

## 日期
2026-02-02
