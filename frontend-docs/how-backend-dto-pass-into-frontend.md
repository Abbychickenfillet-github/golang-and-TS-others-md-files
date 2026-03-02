# 後端的 Go DTO 如何交給前端？

> 後端回傳資料是從哪一層？前端是用哪一隻檔案接住的？Go 的 struct 怎麼變成 TypeScript type？

> 相關筆記：
> - [後端 DTO 角色與三層架構](../Golang/後端DTO角色與三層架構.md) — Handler / Service / Repository 各層職責
> - [Golang Handler Imports 解析](../Golang/golang-handler-imports.md) — Handler 為什麼 import dto

---

## 完整流程

後端的 Go struct **不是直接**交給前端的。中間有一個「翻譯」步驟：

```
Go 後端                          翻譯                          前端

DTO struct                  OpenAPI JSON                TypeScript type
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ type BoothProduct│    │ {                │    │ type BoothProduct   │
│ Public struct {  │    │   "price": {     │    │ Public = {          │
│   Price string   │──→ │     "type":      │──→ │   price: string     │
│   Name  string   │    │     "string"     │    │   name: string      │
│ }                │    │   }              │    │ }                   │
└─────────────────┘    │ }                │    └─────────────────────┘
                        └──────────────────┘
   make swagger         產生 openapi.json      npm run generate-client
                                                產生 src/client/
```

---

## 第一步：後端 `make swagger`

Swagger 讀取 Handler 上面的註解，產生 `openapi.json`（API 規格書）：

```go
// Handler 上面的 Swagger 註解
// @Summary 取得攤位商品
// @Success 200 {object} dto.BoothProductPublic   ← 告訴 Swagger 回傳型別
// @Router /api/v1/booth-products/:id [get]
func (h *Handler) GetBoothProduct(c *gin.Context) {
    ...
    c.JSON(200, public)  // ← 實際回傳 JSON
}
```

Swagger 工具（swag）會：
1. 掃描所有 Handler 的 `@Success`、`@Param` 等註解
2. 找到對應的 DTO struct（例如 `dto.BoothProductPublic`）
3. 讀取 struct 的 `json` tag，產生 JSON schema
4. 輸出 `openapi.json` 規格書

---

## 第二步：前端 `npm run generate-client`

讀取 `openapi.json`，自動產生 TypeScript 程式碼到 `src/client/`：

```
src/client/
├── models.ts          ← Go DTO → TypeScript type（自動產生）
├── services/          ← 每個 API endpoint → 一個 function（自動產生）
│   ├── boothProduct.ts
│   ├── order.ts
│   └── ...
└── core/
    └── request.ts     ← Axios HTTP 封裝
```

`package.json` 裡的指令：
```json
"generate-client": "openapi-ts --input ./openapi.json --output ./src/client --client axios --exportSchemas true"
```

### 自動產生的 TypeScript type（`models.ts`）

```typescript
// 自動從 Go DTO 產生，不是手寫的
export type BoothProductPublic = {
  id: string
  name: string
  price: string
  status: string
  deactivated_by?: string | null
}
```

### 自動產生的 Service（`services/boothProduct.ts`）

```typescript
export class BoothProductService {
  // 自動從 Swagger @Router 產生
  public static async getBoothProduct({ id }: { id: string }): Promise<BoothProductPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/booth-products/{id}",
      path: { id },
    })
  }
}
```

---

## 第三步：前端元件使用

```tsx
// 前端元件 import 自動產生的 Service + Type
import { BoothProductService } from "../../client/services"
import type { BoothProductPublic } from "../../client/models"

// 用 React Query 呼叫 API
const { data } = useQuery({
  queryKey: ["booth-products", id],
  queryFn: () => BoothProductService.getBoothProduct({ id }),
  //              ↑ 自動產生的 function，內部用 axios 打 GET /api/v1/booth-products/:id
})

// data 的型別自動就是 BoothProductPublic ← 來自 Go 的 DTO struct
```

---

## 前端「第一個接住」的檔案是？

```
axios 發 HTTP 請求
    ↓
src/client/core/request.ts     ← axios 封裝，發出請求 + 解析 JSON 回應
    ↓
src/client/services/xxx.ts     ← 回傳 typed 結果
    ↓
元件的 useQuery                 ← data 拿到資料，型別 = TypeScript type
```

`request.ts` 是最底層接住 HTTP response 的檔案，但你在寫程式時碰到的第一層是 `services/xxx.ts` 裡的 function。

---

## 後端回傳的完整路徑

```
DB → Repository → Service → Handler → HTTP response → axios → request.ts → services → useQuery → 元件
                              ↑                                                          ↑
                         c.JSON() 送出                                              data 拿到資料
                         （後端最後一步）                                           （前端第一步）
```

---

## Go DTO 欄位 → TypeScript 型別對照

| Go DTO 型別 | JSON tag | TypeScript 型別 | 說明 |
|-------------|----------|----------------|------|
| `string` | `json:"name"` | `string` | 直接對應 |
| `int` | `json:"quantity"` | `number` | Go 的 int → TS 的 number |
| `bool` | `json:"is_active"` | `boolean` | 直接對應 |
| `*string` | `json:"note,omitempty"` | `string \| null` | Go 指標 → TS nullable |
| `[]string` | `json:"img_urls"` | `Array<string>` | Go slice → TS array |
| `decimal.Decimal` | `json:"price"` | `string` | decimal 序列化為字串 |
| `time.Time` | `json:"created_at"` | `string` | 時間序列化為 ISO 字串 |

---

## 一句話總結

| 問題 | 答案 |
|------|------|
| 後端回傳給前端是從哪一層？ | **Handler** 用 `c.JSON()` 送出 |
| 前端第一個接住的檔案？ | `src/client/core/request.ts`（axios） |
| Go struct 怎麼變 TypeScript type？ | `make swagger` → `openapi.json` → `npm run generate-client` → 自動產生 |
| 型別是手動對齊的嗎？ | **不是，是自動產生的**，改了 Go DTO 就要重新 generate |
| 前端 `src/client/` 可以手動改嗎？ | **不建議**，下次 generate 會被覆蓋 |
