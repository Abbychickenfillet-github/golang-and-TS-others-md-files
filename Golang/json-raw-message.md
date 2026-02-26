# json.RawMessage — Go 的「延遲解析 JSON」

## 一句話解釋

`json.RawMessage` = 原始 JSON bytes，先存著不解析，要用的時候再 Unmarshal。

## JS 對照

```js
// JS：你可能把 JSON 存成字串，稍後再 JSON.parse
const raw = JSON.stringify(["url1", "url2"])  // raw = '["url1","url2"]'
const parsed = JSON.parse(raw)                // parsed = ["url1", "url2"]
```

```go
// Go：json.RawMessage 做一樣的事
import "encoding/json"

// 底層定義：就是 []byte
type RawMessage []byte

// 存入 DB 時：Go struct → JSON bytes → MySQL JSON 欄位
urls := []string{"url1", "url2"}
raw, _ := json.Marshal(urls)  // raw = []byte(`["url1","url2"]`)

// 從 DB 讀出時：MySQL JSON 欄位 → json.RawMessage ([]byte)
// 需要用的時候再解析
var parsed []string
json.Unmarshal(raw, &parsed)  // parsed = ["url1", "url2"]
```

## 為什麼不直接用 `[]string`？

GORM 不知道怎麼自動把 `[]string` 存進 MySQL 的 JSON 欄位。
`json.RawMessage` 告訴 GORM：「這是原始 JSON，直接塞進去就好。」

| Go 型別 | MySQL 欄位 | GORM 行為 |
|---------|-----------|----------|
| `string` | `VARCHAR/TEXT` | 直接存字串 |
| `int` | `INT` | 直接存數字 |
| `[]string` | ❌ 不知道怎麼存 | 會報錯 |
| `json.RawMessage` | `JSON` | 直接存原始 JSON bytes |

## 實際用法（FutureSign booth_product）

### Model（存 DB）
```go
type BoothProduct struct {
    // ...
    ImgURLs json.RawMessage `gorm:"type:json" json:"img_urls,omitempty"`
    // DB 裡存的是: ["https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg"]
}
```

### Service — 寫入
```go
// DTO 用 []string 方便前端傳入
// 存 DB 前轉成 json.RawMessage
urls := []string{"https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg"}
imgURLs, _ := json.Marshal(urls)  // → []byte
product.ImgURLs = imgURLs
```

### Service — 讀出
```go
// 從 DB 讀出是 json.RawMessage ([]byte)
// 回傳給前端前轉回 []string
var imgURLs []string
json.Unmarshal(product.ImgURLs, &imgURLs)
// 放進 DTO 的 ImgURLs []string 欄位
```

## 常見搭配

| 函式 | 作用 | JS 對照 |
|-----|------|--------|
| `json.Marshal(v)` | Go struct → JSON bytes | `JSON.stringify(v)` |
| `json.Unmarshal(data, &v)` | JSON bytes → Go struct | `JSON.parse(data)` |
| `json.RawMessage` | 延遲解析的 JSON bytes | 就是存成字串先不 parse |

## Marshal / Unmarshal 是什麼意思？

這兩個詞來自軍事用語：

- **Marshal**（列隊集合）— 把散落的士兵排好隊形，準備出發
  → 把 Go 的資料結構「打包」成 JSON bytes，準備傳輸或儲存

- **Unmarshal**（解散隊形）— 隊伍到達目的地後解散，各回各位
  → 把收到的 JSON bytes「拆包」還原成 Go 的資料結構

用更白話的英文說：
- **Marshal** = serialize = encode = "pack it up for transport"
- **Unmarshal** = deserialize = decode = "unpack it after receiving"

```
Go struct  ──Marshal──→  JSON bytes  ──Unmarshal──→  Go struct
(記憶體)      (打包)       (傳輸/儲存)     (拆包)        (記憶體)
```

### 各語言的叫法對照

| 語言 | 打包（struct → bytes） | 拆包（bytes → struct） |
|------|----------------------|----------------------|
| **Go** | `json.Marshal()` | `json.Unmarshal()` |
| **JavaScript** | `JSON.stringify()` | `JSON.parse()` |
| **Python** | `json.dumps()` | `json.loads()` |
| **Java** | `ObjectMapper.writeValueAsString()` | `ObjectMapper.readValue()` |

> Go 選用 marshal/unmarshal 而不是 stringify/parse，是因為 Go 處理的是 `[]byte`（二進位），
> 不只限於 JSON 字串。同樣的概念也用在 protobuf、XML、gob 等格式。

## []byte 到底長什麼樣子？

`[]byte` **不是加密也不是壓縮**，就是每個字元對應一個 UTF-8 數字（跟 JS 的 `Uint8Array` 一樣）。

```go
urls := []string{"https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg"}
jsonBytes, _ := json.Marshal(urls)

// 用 fmt.Println(string(jsonBytes)) 印出來，你看到的是人類可讀的 JSON：
// ["https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg"]

// 用 fmt.Println(jsonBytes) 印出來，你看到的是每個字元的 byte 數值：
// [91 34 104 116 116 112 115 58 47 47 115 51 ...]
//  [   "   h    t    t    p    s   :   /   /   s   3
```

每個字元就是一個數字：

```
字元:  [    "    h    t    t    p    s    :    /    /
byte: 91   34  104  116  116  112  115   58   47   47
```

跟 JS 的 `TextEncoder` 完全一樣的概念：

```js
new TextEncoder().encode('["https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg"]')
// Uint8Array [91, 34, 104, 116, 116, 112, 115, 58, 47, 47, 115, 51, ...]
// 同樣的東西，JS 叫 Uint8Array，Go 叫 []byte
```

**所以 MySQL JSON 欄位裡存的就是你肉眼能讀的 JSON 字串，不是亂碼。**
`[]byte` 只是 Go 表達「這是一串原始文字資料」的方式。

## 重點

- `json.RawMessage` 本質是 `[]byte`
- 適合存任意結構的 JSON 到 DB（陣列、物件、巢狀都行）
- GORM + MySQL JSON 欄位的標準做法
- 前端傳 `[]string`，後端 DTO 用 `[]string`，存 DB 用 `json.RawMessage`，三層轉換
- **Marshal = 打包（Go → JSON）**，**Unmarshal = 拆包（JSON → Go）**
- **`[]byte` 不是亂碼**，就是 UTF-8 字元的數字表示，跟 JS 的 `Uint8Array` 一樣
