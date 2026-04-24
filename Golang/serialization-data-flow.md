# 序列化與資料流：完整對照

> 這份筆記把三份相關筆記串在一起，並標註資料流每一層「什麼時候序列化、什麼時候反序列化」。
>
> 相關筆記：
> - [json_encoders 與序列化](../Python語法解釋/json_encoders與序列化.md) — 序列化的定義、Python 的 json_encoders
> - [Marshal 與 Unmarshal](the-need-of-encoding-json-for-marshal-and-unmarshal.md) — Go 的序列化/反序列化、Gin 如何封裝
> - [資料流架構](資料流.md) — DB → Model → DTO → JSON → Frontend 五層架構

---

## 一句話定義

```
序列化（Serialize / Marshal）    = 物件 → 字串    （打包寄出）
反序列化（Deserialize / Unmarshal）= 字串 → 物件    （拆包收件）
```

為什麼需要？因為**網路只能傳字串（bytes）**，不能傳 Go struct 也不能傳 JS object。
所以發送方要把物件「打包」成字串，接收方再「拆包」還原成物件。

---

## 跨語言對照表

| 動作 | JavaScript | Python | Go | 通用術語 |
|------|-----------|--------|-----|---------|
| 物件 → 字串 | `JSON.stringify(obj)` | `json.dumps(obj)` | `json.Marshal(obj)` | Serialize / Marshal |
| 字串 → 物件 | `JSON.parse(str)` | `json.loads(str)` | `json.Unmarshal(str, &obj)` | Deserialize / Unmarshal |

**Marshal 和 Serialize 是同義詞**，Go 社群慣用 Marshal，其他語言慣用 Serialize。

---

## 資料流中的序列化時機

### 讀取資料（GET 請求）：DB → 前端

```
層級              動作                    序列化？        誰做的？
─────────────────────────────────────────────────────────────────

1. DB              SQL 查詢結果（rows）
                        │
                        ▼ 反序列化                        GORM
2. Repository      DB rows → Go struct
                   （把資料庫的列轉成 Go 物件）
                        │
                        ▼ 無轉換（同語言內傳遞）
3. Service         Go struct → Go struct
                   （Model 轉 DTO，純欄位賦值）
                        │
                        ▼ 無轉換（同語言內傳遞）
4. Handler         收到 DTO struct
                        │
                        ▼ ✅ 序列化（Marshal）             Gin c.JSON()
5. HTTP Response   Go struct → JSON 字串
                   {"id":"123","name":"活動A"}
                        │
                        ▼ 網路傳輸（字串）
                        │
                        ▼ ✅ 反序列化                      axios / fetch
6. Frontend        JSON 字串 → JS object
                   （瀏覽器自動 JSON.parse）
                        │
                        ▼ 無轉換
7. React 元件      data.name 直接使用
```

### 寫入資料（POST 請求）：前端 → DB

```
層級              動作                    序列化？        誰做的？
─────────────────────────────────────────────────────────────────

1. React 元件      使用者填表單
                        │
                        ▼ ✅ 序列化                        axios / fetch
2. HTTP Request    JS object → JSON 字串
                   （axios 自動 JSON.stringify）
                        │
                        ▼ 網路傳輸（字串）
                        │
                        ▼ ✅ 反序列化（Unmarshal）          Gin c.ShouldBindJSON()
3. Handler         JSON 字串 → Go struct (DTO)
                        │
                        ▼ 無轉換（同語言內傳遞）
4. Service         DTO struct → Model struct
                   （純欄位賦值）
                        │
                        ▼ 無轉換（同語言內傳遞）
5. Repository      Go struct 傳給 GORM
                        │
                        ▼ 序列化                           GORM
6. DB              Go struct → SQL INSERT/UPDATE
                   （GORM 把欄位轉成 SQL 值）
```

---

## 「選內容」和「換包裝」是兩件事

容易搞混的觀念：序列化**不是**「拆開物件只取前端需要的欄位」，那是 DTO 的工作。

```
Model（全部欄位）         DTO（篩選後）           JSON 字串（序列化後）
┌──────────────────┐    ┌────────────────┐     ┌──────────────────────┐
│ ID: "123"        │    │ ID: "123"      │     │ {"id":"123",         │
│ Email: "a@b.com" │──→ │ Email: "a@b.com│ ──→ │  "email":"a@b.com",  │
│ HashedPassword   │    │ FullName: "王"  │     │  "full_name":"王"}   │
│ FullName: "王"   │    │                │     │                      │
│ LastLogin: ...   │    │ （密碼被排除）   │     │ （同樣的資料，        │
└──────────────────┘    └────────────────┘     │  只是變成字串格式）    │
                                               └──────────────────────┘
      ↑ 這是「選內容」                              ↑ 這是「換包裝」
      由 DTO 決定                                   由 c.JSON() 做
      哪些欄位要給前端                                把物件變成字串好傳過網路
```

- **DTO = 選內容**：決定放哪些欄位進去（排除密碼等敏感資料）
- **序列化 = 換包裝**：把物件轉成 JSON 字串，內容不變，只是格式變了

兩件事發生在不同的層，**先選內容（Service → Handler），再換包裝（Handler → HTTP Response）**。

> 同樣的圖解也記在 [資料流架構](資料流.md) 的「選內容和換包裝是兩件事」段落

---

## 關鍵觀念：序列化只發生在「跨界」的時候

```
Go 的世界                          JS 的世界
┌─────────────────────┐           ┌─────────────────────┐
│ Repository          │           │ React 元件           │
│ Service             │           │ useQuery             │
│ Handler             │           │ axios                │
│                     │           │                      │
│ 這裡面全部都是      │           │ 這裡面全部都是        │
│ Go struct 傳來傳去  │           │ JS object 傳來傳去   │
│ 不需要序列化        │           │ 不需要序列化         │
└──────────┬──────────┘           └──────────┬──────────┘
           │                                  │
           │          HTTP（網路）              │
           │    ┌─────────────────────┐       │
           ├──→ │  JSON 字串          │ ──→───┤
           │    │  （序列化的產物）     │       │
           │    └─────────────────────┘       │
           │                                  │
      c.JSON()                          JSON.parse()
      Marshal                           Deserialize
      序列化                              反序列化
```

**同一個語言內部**（Go 的 Handler 傳給 Service、JS 的 component 傳給 hook），不需要序列化，直接傳物件就好。

**跨語言/跨網路**時才需要序列化，因為 Go struct 和 JS object 是完全不同的記憶體格式。

---

## 每一層「誰幫你做的」

你寫程式碼時很少自己呼叫 `JSON.stringify` 或 `json.Marshal`，因為框架幫你做了：

### Go 後端（Gin 框架）

| 你寫的 | 框架底層做的 | 對應筆記 |
|--------|-------------|---------|
| `c.ShouldBindJSON(&req)` | `json.Unmarshal(body, &req)` 反序列化 | [Marshal 與 Unmarshal](the-need-of-encoding-json-for-marshal-and-unmarshal.md) |
| `c.JSON(200, dto)` | `json.Marshal(dto)` 序列化 | [Marshal 與 Unmarshal](the-need-of-encoding-json-for-marshal-and-unmarshal.md) |

### JS 前端（axios）

| 你寫的 | 框架底層做的 |
|--------|-------------|
| `axios.post(url, data)` | `JSON.stringify(data)` 序列化，放進 request body |
| `const { data } = await axios.get(url)` | `JSON.parse(response.text)` 反序列化，回傳 JS object |

### Python 後端（FastAPI / Pydantic）

| 你寫的 | 框架底層做的 | 對應筆記 |
|--------|-------------|---------|
| `def endpoint(req: Schema)` | `json.loads()` + Pydantic 驗證（反序列化） | [json_encoders 與序列化](../Python語法解釋/json_encoders與序列化.md) |
| `return order` | Pydantic `.json()` + json_encoders（序列化） | [json_encoders 與序列化](../Python語法解釋/json_encoders與序列化.md) |

---

## 什麼時候你需要「自己動手」序列化？

大部分時候框架都幫你做好了，但以下情境你要自己來：

### 1. 前端：localStorage 存物件

```tsx
// localStorage 只能存字串，不能存物件
const user = { name: "Abby", role: "admin" }

// ❌ 直接存 → 變成 "[object Object]"
localStorage.setItem("user", user)

// ✅ 自己序列化
localStorage.setItem("user", JSON.stringify(user))

// ✅ 取出時自己反序列化
const saved = JSON.parse(localStorage.getItem("user"))
```

### 2. 前端：URL query params 傳複雜物件

```tsx
// URL 只能放字串
const filters = { status: "active", tags: ["vip", "new"] }

// ✅ 序列化塞進 URL
const params = new URLSearchParams({ filters: JSON.stringify(filters) })
// ?filters={"status":"active","tags":["vip","new"]}
```

### 3. Go 後端：JSON 欄位存取

```go
// 資料庫的 JSON 欄位是 json.RawMessage（原始 bytes）
// 要自己轉成 Go 型別

// 反序列化：raw bytes → []string
var tags []string
json.Unmarshal(product.Tags, &tags)

// 序列化：[]string → raw bytes
rawJSON, _ := json.Marshal(req.Tags)
product.Tags = rawJSON
```

> 詳見 [Marshal 與 Unmarshal](the-need-of-encoding-json-for-marshal-and-unmarshal.md) 第 96 行

### 4. Go 後端：測試檔案沒有 Gin

```go
// 測試時沒有 Gin 幫你做，要自己來
body, _ := json.Marshal(dto.LoginRequest{Email: "test@test.com"})
req := httptest.NewRequest("POST", "/login", bytes.NewReader(body))
```

---

## JSON 能裝什麼？不能裝什麼？

JSON 標準**只支援 6 種型別**：

| JSON 型別 | 範例 |
|-----------|------|
| string | `"hello"` |
| number | `42`, `3.14` |
| boolean | `true`, `false` |
| null | `null` |
| array | `[1, 2, 3]` |
| object | `{"key": "value"}` |

**不支援的型別**需要轉換後才能放進 JSON：

| 原始型別 | 語言 | 序列化成 JSON 的 | 誰負責轉 |
|---------|------|-----------------|---------|
| `time.Time` | Go | `string`（ISO 8601） | Go 的 json.Marshal 自動轉 |
| `datetime` | Python | `string`（ISO 8601） | Pydantic json_encoders |
| `Date` | JS | `string`（ISO 8601） | JSON.stringify 自動轉 |
| `Decimal` | Python | `string` | Pydantic json_encoders |
| `UUID` | Go/Python | `string` | 各框架自動轉 |
| `[]byte` | Go | `string`（base64） | json.Marshal 自動轉 |

> 詳見 [json_encoders 與序列化](../Python語法解釋/json_encoders與序列化.md) — Python 特殊型別的轉換設定

---

## 三份筆記的關係圖

```
                    這份筆記（總覽）
                 serialization-data-flow.md
                 「什麼時候序列化？在哪一層？」
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
     Python 序列化    Go 序列化     完整資料流
     json_encoders   Marshal       五層架構
     與序列化.md      Unmarshal.md  資料流.md
            │             │             │
     「Python 的      「Go 的         「每一層的
      特殊型別         框架怎麼        職責是什麼？
      怎麼轉？」       幫你做？」      Model vs DTO？」
```

| 筆記 | 回答的問題 |
|------|-----------|
| **這份**（serialization-data-flow.md） | 序列化在資料流的哪個位置發生？跨語言怎麼對照？ |
| [json_encoders 與序列化](../Python語法解釋/json_encoders與序列化.md) | Python/Pydantic 怎麼處理 datetime、UUID 等特殊型別？ |
| [Marshal 與 Unmarshal](the-need-of-encoding-json-for-marshal-and-unmarshal.md) | Go 的 `encoding/json` 什麼時候要自己 import？Gin 幫你做了什麼？ |
| [資料流架構](資料流.md) | DB → Model → DTO → JSON → Frontend 每層的職責和檔案位置？ |
