# Go Struct Tag：Backtick、雙引號、JSON key 與 Logger 的關係

## 你的問題

看到這段 DTO：
```go
type PageListResponse struct {
    Data  []PageResponse `json:"data"`
    Count int            `json:"count"`
}
```

1. **Service 回傳 `*dto.PageListResponse`，所以前端就是拿到 `Data` 和 `Count` 嗎？**
2. **`"data"` 和 `"count"` 為何用雙引號包起來？它們是字串嗎？**
3. **為什麼外層要用 backtick（反引號）包起來？**

---

## 1. Service 回傳的就是 struct 裡的內容

```go
// Service interface 定義
GetPagesByHandbook(ctx context.Context, handbookID string) (*dto.PageListResponse, error)
```

Handler 呼叫：
```go
result, err := h.handbookService.GetPagesByHandbook(c.Request.Context(), handbookID)
// result 就是 *dto.PageListResponse
// result.Data  → []PageResponse（頁面陣列）
// result.Count → int（頁面數量）
```

然後 Handler 用 `c.JSON(200, result)` 回傳，Gin 自動把 struct 轉成 JSON：
```json
{
  "data": [ { "id": "...", "title": "..." }, ... ],
  "count": 3
}
```

**是的，前端拿到的就是 `Data` 和 `Count` 的內容，但 JSON key 是小寫的 `data` 和 `count`（由 json tag 決定）。**

---

## 2. 雙引號裡的是「JSON key 名稱」，是字串

```go
Count int `json:"count"`
//              ↑↑↑↑↑↑↑
//              這是一個字串，代表 JSON 輸出時的 key 名稱
```

**`"count"` 是 JSON key 的名稱，不是 Go 的型別。** 它告訴 Go 的 JSON 序列化器：

> 「這個欄位在轉成 JSON 時，key 要叫做 `count`，不是 Go 的大寫 `Count`」

### 沒有 tag vs 有 tag 的差異

```go
// 沒有 json tag
type PageListResponse struct {
    Data  []PageResponse
    Count int
}
// JSON 輸出 → {"Data":[...],"Count":3}  ← PascalCase，前端不方便

// 有 json tag
type PageListResponse struct {
    Data  []PageResponse `json:"data"`
    Count int            `json:"count"`
}
// JSON 輸出 → {"data":[...],"count":3}  ← snake_case，前端習慣的格式
```

### 用 TypeScript 來理解

```typescript
// Go 的 json tag 做的事，等同於 JS 裡手動 mapping key 名稱：
const response = {
  data: result.Data,     // Go 的 Data → JSON 的 "data"
  count: result.Count,   // Go 的 Count → JSON 的 "count"
}
```

---

## 3. Backtick（反引號）是 Go 的「raw string literal」

### 三種引號在 Go 裡的意思

| 引號 | 名稱 | 用途 | 範例 |
|------|------|------|------|
| `"雙引號"` | 一般字串 | 普通字串，支援跳脫字元 `\n` `\t` | `"hello\nworld"` |
| `` `反引號` `` | Raw string / Struct tag | **不處理跳脫字元**，所見即所得 | `` `json:"name"` `` |
| `'單引號'` | Rune（字元） | 單一 Unicode 字元 | `'A'`、`'中'` |

### Struct tag 為什麼要用 backtick？

```go
type Handbook struct {
    Title string `json:"title" gorm:"type:varchar(255)"`
    //           ^                                     ^
    //           └── backtick 開始          backtick 結束 ──┘
    //
    //           backtick 裡面可以包含雙引號而不需要跳脫
}
```

因為 tag 裡面需要用**雙引號包裹值**（如 `"title"`），如果外層也用雙引號就要跳脫：

```go
// ❌ 如果用雙引號包 tag，雙引號打架了
Title string "json:\"title\""   // 語法不支援！Go struct tag 必須用 backtick

// ✅ 用 backtick 包，裡面的雙引號不需要跳脫
Title string `json:"title"`     // 清楚易讀
```

**所以 backtick 在 struct tag 裡不是代表 code 或 string，而是 Go 語法規定 struct tag 必須用 backtick 包裹。**

### 完整拆解一個 struct tag

```go
AllowedFooterEventName bool `gorm:"not null;default:false" json:"allowed_footer_event_name"`
//                          ^                              ^                                ^
//                          |          兩個 tag 用空格分隔   |                                |
//                          backtick 開始                   |                      backtick 結束
//
// tag 1: gorm:"not null;default:false"
//         ↑     ↑
//         key   value → 告訴 GORM：這個欄位不能 NULL，預設值是 false
//
// tag 2: json:"allowed_footer_event_name"
//         ↑     ↑
//         key   value → 告訴 JSON 序列化器：輸出時 key 叫 "allowed_footer_event_name"
```

---

## 3.5 什麼是 Raw String Literal（原生字串字面值）？

一句話：**所見即所得的字串，裡面的所有字元都「照字面」處理，不會觸發任何跳脫。**

**Raw = 生的、未加工的**，就像生魚片是「沒煮過的魚」，raw string 是「沒處理過的字串」。

### 一般字串 vs Raw 字串

```go
// 一般字串（雙引號）— 會處理跳脫字元
msg := "第一行\n第二行\t縮排"
// 輸出：
// 第一行
// 第二行    縮排
//（\n 變成換行，\t 變成 tab）

// Raw 字串（backtick）— 所見即所得
msg := `第一行\n第二行\t縮排`
// 輸出：
// 第一行\n第二行\t縮排
//（\n 和 \t 就是普通文字，不會變成換行或 tab）
```

### 差異速查

| | 一般字串 `"..."` | Raw 字串 `` `...` `` |
|---|---|---|
| `\n` | 被**處理**成換行 | 就是 `\` 和 `n` 兩個字元 |
| `\t` | 被**處理**成 tab | 就是 `\` 和 `t` 兩個字元 |
| `"` 雙引號 | 需要跳脫 `\"` | 直接寫，不用跳脫 |
| 換行 | 不能直接換行 | 可以直接換行（多行字串） |

### 用 TypeScript 類比

```typescript
// JS/TS 最接近的是 String.raw：
const raw = String.raw`第一行\n第二行`
// → "第一行\\n第二行"（\n 不會變成換行）
```

### 為什麼 Struct Tag 必須用 Raw 字串？

因為 tag 裡面要寫雙引號（如 `"title"`），如果外層也用雙引號就衝突了：
```go
// ❌ 雙引號打架
Title string "json:\"title\""   // Go 不支援

// ✅ Backtick 裡面雙引號不用跳脫
Title string `json:"title"`     // 乾淨清楚
```

---

## 4. 完整流程圖：從 Handler 到前端

```
Handler 呼叫 Service
    h.handbookService.GetPagesByHandbook(ctx, handbookID)
        ↓
Service 回傳 *dto.PageListResponse
    &dto.PageListResponse{
        Data:  []PageResponse{ {ID: "abc", Title: "頁面1"}, ... },
        Count: 3,
    }
        ↓
Handler 用 c.JSON() 回傳
    c.JSON(200, result)
        ↓
Gin 內部呼叫 json.Marshal(result)
    讀取 struct tag → Data 的 tag 是 json:"data" → key 用 "data"
    讀取 struct tag → Count 的 tag 是 json:"count" → key 用 "count"
        ↓
HTTP Response Body（前端收到的 JSON）
    {
      "data": [
        { "id": "abc", "title": "頁面1", "content": "...", ... }
      ],
      "count": 3
    }
        ↓
前端 TypeScript
    const response = await api.getPages(eventId, handbookId)
    response.data   // PageResponse[]
    response.count  // number
```

---

## 5. Logger 與 Struct 的關係

我們在 Phase 8 的 `UpdatePage` 裡加了 logger：

```go
logger.Info("更新手冊頁面",
    "page_id", id,
    "previous_title", prevTitle,
    "current_title", page.Title,
    "previous_content_length", prevContentLen,
    "current_content_length", len(page.Content),
)
```

### Logger 的 key-value 格式

`logger.Info` 用的是 **structured logging（結構化日誌）**，格式是：
```
logger.Info("訊息", "key1", value1, "key2", value2, ...)
```

| 參數位置 | 內容 | 說明 |
|---------|------|------|
| 第 1 個 | `"更新手冊頁面"` | 日誌訊息（描述發生了什麼） |
| 第 2, 3 個 | `"page_id", id` | key="page_id", value=id 變數的值 |
| 第 4, 5 個 | `"previous_title", prevTitle` | key="previous_title", value=prevTitle 變數的值 |

### Logger 的值從哪來？

```go
// page 是從 Repository 查出來的 Model struct
page, err := s.pageRepo.GetByID(ctx, id)
// page.Title → 是 EventHandbookPage struct 的欄位
// page.Content → 是 EventHandbookPage struct 的欄位

// 存下「更新前」的值
prevTitle := page.Title              // ← 從 struct 欄位取值
prevContentLen := len(page.Content)  // ← 從 struct 欄位取長度

// 更新 struct 欄位
page.Title = *req.Title     // ← 用 DTO 的新值覆蓋 struct 欄位
page.Content = *req.Content

// 現在 page.Title 是新值，prevTitle 是舊值
// logger 記錄兩者的差異，供後台稽查
```

**所以 logger 的值本質上也是從 struct 的欄位取出來的，只是不經過 JSON 序列化，而是直接寫到 log 檔。**

---

## 總結速查表

| 符號 | 在 Go Struct 裡的意思 | 類比 |
|------|---------------------|------|
| `` ` `` (backtick) | Struct tag 的外殼，Go 語法強制使用 | 就像 TS 的 template literal `` ` `` |
| `json:"data"` | 告訴 JSON 序列化器：這個欄位的 JSON key 叫 `data` | 就像 TS 的 `@JsonProperty("data")` |
| `gorm:"not null"` | 告訴 GORM（ORM）：這個欄位在 DB 裡不能是 NULL | 就像 SQL 的 `NOT NULL` |
| `"data"` 雙引號 | 是字串值，代表 JSON key 的名稱 | 就像 JS 的 `{ "data": ... }` 裡的 key |
| `binding:"required"` | 告訴 Gin：這個欄位是必填，沒傳就回 400 | 就像 Zod 的 `.required()` |

---

## 相關筆記

- [dto-api-response.md](dto-api-response.md) — DTO 完整概念、json tag 控制技巧（`json:"-"`、`omitempty`）
- [後端DTO角色與三層架構.md](後端DTO角色與三層架構.md) — Handler→Service→Repository 資料流
- [pointer-method-struct-explainer.md](pointer-method-struct-explainer.md) — `*` 指標在 struct 裡的意思
- [json-raw-message.md](json-raw-message.md) — json.RawMessage、Marshal/Unmarshal
- [the-need-of-encoding-json-for-marshal-and-unmarshal.md](the-need-of-encoding-json-for-marshal-and-unmarshal.md) — encoding/json 套件
- [GORM.md](GORM.md) — GORM tag 與資料庫操作
