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

// 存入 DB 時：Go struct → JSON bytes →
// MySQL JSON 欄位
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

## 完整資料流程圖（以 booth_product.img_urls 為例）

### 寫入流程：前端 → DB

```
1. 前端 POST request body:
   { "img_urls": ["https://s3.../product-001.jpg", "https://s3.../product-002.jpg"] }
                    ↓
2. Gin 框架自動解析 request body → DTO
   DTO: ImgURLs []string   ← Gin 把 JSON array 變成 Go 的 []string
                    ↓
3. Service 層：json.Marshal() ← ★ Marshal 在這裡發生！
   json.Marshal([]string{"https://s3.../product-001.jpg", "https://s3.../product-002.jpg"})
   → json.RawMessage ([]byte)
   → 內容是 [91 34 104 116 116 112 ...] （人看到就是 ["https://s3.../product-001.jpg","https://s3.../product-002.jpg"]）
                    ↓
4. GORM 把 json.RawMessage 直接塞進 MySQL JSON 欄位
   → MySQL 裡存的: ["https://s3.../product-001.jpg","https://s3.../product-002.jpg"]
```

### 讀出流程：DB → 前端

```
1. MySQL JSON 欄位 → GORM 讀出 json.RawMessage ([]byte)
   → 內容是 ["https://s3.../product-001.jpg","https://s3.../product-002.jpg"] 的 bytes
                    ↓
2. Service 層：json.Unmarshal() ← ★ Unmarshal 在這裡發生！
   json.Unmarshal(product.ImgURLs, &imgURLs)
   → []string{"https://s3.../product-001.jpg", "https://s3.../product-002.jpg"}
                    ↓
3. 放進 DTO 的 ImgURLs []string 欄位
                    ↓
4. Gin 自動轉成 JSON response 回給前端
   { "img_urls": ["https://s3.../product-001.jpg", "https://s3.../product-002.jpg"] }
```

### 三層各自負責不同型別

```
層級          型別                  為什麼用這個型別
─────────────────────────────────────────────────────────────
DTO           []string             方便前端互動，Gin 自動解析/回傳
Service       json.Marshal/        在 []string 和 json.RawMessage 之間橋接轉換
              Unmarshal
Model (GORM)  json.RawMessage      GORM 看得懂，能直接存 MySQL JSON 欄位
─────────────────────────────────────────────────────────────
```

### 實際程式碼對應

**Model（存 DB）**
```go
type BoothProduct struct {
    // ...
    ImgURLs json.RawMessage `gorm:"type:json" json:"img_urls,omitempty"`
    // DB 裡存的是: ["https://s3.../product-001.jpg"]
}
```

**DTO（跟前端互動）**
```go
type BoothProductCreate struct {
    // ...
    ImgURLs []string `json:"img_urls,omitempty"`  // 前端傳 ["url1","url2"]，Gin 自動解析成 []string
}
```

**Service — 寫入（Marshal 在這裡）**
```go
// DTO 的 []string → Model 的 json.RawMessage
var imgURLs json.RawMessage
if len(req.ImgURLs) > 0 {
    imgURLs, _ = json.Marshal(req.ImgURLs)  // []string → []byte (json.RawMessage)
}
product.ImgURLs = imgURLs
// 接著 GORM 就可以把 json.RawMessage 存進 MySQL JSON 欄位了
```

**Service — 讀出（Unmarshal 在這裡）**
```go
// Model 的 json.RawMessage → DTO 的 []string
var imgURLs []string
if len(product.ImgURLs) > 0 {
    _ = json.Unmarshal(product.ImgURLs, &imgURLs)  // []byte (json.RawMessage) → []string
}
// 放進 DTO 回傳給前端
```

## 「原始 JSON bytes」到底是什麼意思？

「原始」不是亂碼，而是「**還沒被 parse 成 Go struct 的 JSON 文字**」。

就像 JS 裡：
```js
const raw = '["https://s3.../product-001.jpg"]'  // 這是一個「字串」，還沒 JSON.parse
const parsed = JSON.parse(raw)                     // 現在才變成真正的 Array
```

Go 裡 `json.RawMessage` 就是那個「還沒 parse 的字串」，只不過 Go 用 `[]byte` 存：
```go
// json.RawMessage 存的內容：
// 人看到的：["https://s3.../product-001.jpg"]     ← 人類可讀的 JSON 文字
// 記憶體裡：[91 34 104 116 116 112 115 ...]       ← 同一段文字的 UTF-8 byte 數值
//            [   "   h    t    t    p    s

// Unmarshal 之後才變成 Go 的 []string，可以用 [0]、len() 操作
var urls []string
json.Unmarshal(rawMessage, &urls)
fmt.Println(urls[0])  // https://s3.../product-001.jpg
```

**MySQL JSON 欄位裡存的就是你肉眼能讀的 JSON 字串，不是亂碼。**

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

## Marshal vs MarshalIndent

```go
data := []string{
    "https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg",
    "https://s3.ap-northeast-1.amazonaws.com/future-sign/product-002.jpg",
}

// Marshal — 扁平一行，沒有空格換行，省空間（存 DB、API 傳輸用這個）
json.Marshal(data)
// → ["https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg","https://s3.ap-northeast-1.amazonaws.com/future-sign/product-002.jpg"]

// MarshalIndent — 有縮排換行，人類好讀（debug 印 log 用這個）
json.MarshalIndent(data, "", "  ")
// → [
//      "https://s3.ap-northeast-1.amazonaws.com/future-sign/product-001.jpg",
//      "https://s3.ap-northeast-1.amazonaws.com/future-sign/product-002.jpg"
//    ]
```

兩者產出的 `[]byte` 內容不同（一個有換行空格，一個沒有），但 `Unmarshal` 回去結果一模一樣。

JS 完全對應：
```js
JSON.stringify(data)          // 扁平，同 Marshal
JSON.stringify(data, null, 2) // 縮排，同 MarshalIndent
```

**實務上**：存 DB 和 API 回傳都用 `Marshal`（扁平），只有 debug 時才用 `MarshalIndent`。

## Go 的字串型別 — string vs []string

JS 背景的人會覺得奇怪：為什麼 Go 寫 `[]string` 而不是直接 `.string()`？

因為 Go 是**強型別語言**，每個變數在宣告時就必須指定確切型別。

### JS vs Go 型別對照

```js
// JS — 動態型別，一個 let 打天下
let name = "Future Sign"           // 字串
let names = ["Alice", "Bob"]       // 字串陣列
let age = 25                       // 數字
let data = { key: "value" }        // 物件
typeof name   // "string" — 執行時才知道型別
```

```go
// Go — 靜態型別，宣告時就要講清楚是什麼
var name string = "Future Sign"            // 一個字串
var names []string = []string{"Alice", "Bob"} // 字串的陣列（slice）
var age int = 25                           // 整數
var data map[string]string = map[string]string{"key": "value"} // 物件（map）

// 簡寫（Go 會自動推斷型別，但底層型別仍然固定）
name := "Future Sign"              // 自動推斷為 string
names := []string{"Alice", "Bob"}  // 自動推斷為 []string
```

### Go 常見型別速查

| Go 型別 | JS 對照 | 說明 |
|---------|---------|------|
| `string` | `string` | 一個字串 `"hello"` |
| `[]string` | `string[]` (TS) | 字串陣列 `["a", "b"]` |
| `int` | `number` | 整數 |
| `float64` | `number` | 浮點數 |
| `bool` | `boolean` | true/false |
| `[]byte` | `Uint8Array` | 原始 bytes |
| `map[string]string` | `Record<string, string>` (TS) | key-value 物件 |
| `*string` | `string \| null` (TS) | 指標，可以是 nil（null） |
| `[]int` | `number[]` (TS) | 數字陣列 |
| `interface{}` | `any` (TS) | 任意型別 |

### `[]` 是什麼意思？

`[]` 在 Go 裡代表 **slice**（動態陣列），等同 JS 的 `Array`。

```go
[]string    // 字串的 slice  → JS: string[]
[]int       // 整數的 slice  → JS: number[]
[]byte      // byte 的 slice → JS: Uint8Array
[]BoothProduct  // BoothProduct 結構的 slice → JS: BoothProduct[]
```

跟 TypeScript 剛好反過來：
- **TypeScript**: 型別在前 `string[]`
- **Go**: 型別在後 `[]string`

### 為什麼 JS 不用寫型別？

JS 是動態型別，執行時才決定型別，所以 `.toString()` 是把任何東西「轉成字串」。
Go 是靜態型別，編譯時就要知道型別，所以你必須宣告 `string` 或 `[]string`。

```js
// JS: 隨時可以變型別
let x = "hello"    // string
x = 123            // 現在是 number，JS 不管
x.toString()       // "123" — 執行時轉型
```

```go
// Go: 宣告了就不能變
var x string = "hello"
x = 123  // ❌ 編譯錯誤！string 不能放 int
// Go 沒有 .toString()，要用 strconv.Itoa(123) 或 fmt.Sprintf("%d", 123)
```

## []string 有排序嗎？

**有！** Go 的 slice（`[]string`）跟 JS 的 Array 一樣，是**有序的**，索引從 0 開始。

```go
urls := []string{
    "https://s3.../product-001.jpg",  // index 0
    "https://s3.../product-002.jpg",  // index 1
    "https://s3.../product-003.jpg",  // index 2
}

fmt.Println(urls[0])  // https://s3.../product-001.jpg
fmt.Println(urls[1])  // https://s3.../product-002.jpg
fmt.Println(len(urls)) // 3
```

JS 完全等價：
```js
const urls = [
    "https://s3.../product-001.jpg",  // index 0
    "https://s3.../product-002.jpg",  // index 1
    "https://s3.../product-003.jpg",  // index 2
]

console.log(urls[0])  // https://s3.../product-001.jpg
console.log(urls.length) // 3
```

### 整條資料流順序都保留

```
前端傳入：["img-A.jpg", "img-B.jpg", "img-C.jpg"]   ← 有序 (index 0, 1, 2)
    ↓
DTO []string：["img-A.jpg", "img-B.jpg", "img-C.jpg"]  ← 有序 (index 0, 1, 2)
    ↓
json.Marshal → ["img-A.jpg","img-B.jpg","img-C.jpg"]   ← JSON array 本身就有序
    ↓
MySQL JSON 欄位：["img-A.jpg","img-B.jpg","img-C.jpg"] ← JSON array 有序
    ↓
json.Unmarshal → []string{"img-A.jpg", "img-B.jpg", "img-C.jpg"} ← 有序 (index 0, 1, 2)
    ↓
DTO []string → 前端：["img-A.jpg", "img-B.jpg", "img-C.jpg"]  ← 有序 (index 0, 1, 2)
```

**順序從頭到尾都不會改變。** 所以前端拖曳排序圖片後的順序，存進 DB 再讀出來，順序是一樣的。

> 注意：Go 的 `map` 是**無序的**（跟 JS 的 Object 一樣不保證順序），但 `slice`（`[]`）一定有序。

## 靜態陣列 vs 動態陣列（Array vs Slice）

Go 有兩種陣列，JS 只有一種（動態的 Array）。

### 靜態陣列 (Array) — `[N]type`，長度固定

```go
// [3]string — 固定 3 個，宣告時就釘死，不能 append
var fixed [3]string = [3]string{"A", "B", "C"}

fixed[0] = "X"           // ✅ 可以改內容
// fixed = append(fixed, "D")  // ❌ 編譯錯誤！Array 不能 append
fmt.Println(len(fixed))  // 3（永遠是 3）
```

### 動態陣列 (Slice) — `[]type`，長度可變

```go
// []string — 沒有指定長度，可以隨時增減
var dynamic []string = []string{"A", "B"}

dynamic = append(dynamic, "C")  // ✅ 可以一直加
dynamic = append(dynamic, "D", "E")  // ✅ 一次加多個也行
fmt.Println(len(dynamic))  // 5
fmt.Println(dynamic)       // [A B C D E]

// 刪除 index 1 的元素
dynamic = append(dynamic[:1], dynamic[2:]...)  // [A C D E]
```

### 差異對照表

| | 靜態陣列 `[N]type` | 動態陣列 (Slice) `[]type` |
|---|---|---|
| 宣告 | `[3]string{"A","B","C"}` | `[]string{"A","B"}` |
| 長度 | 固定，編譯時決定 | 可變，runtime 隨時改 |
| append | ❌ 不行 | ✅ `append(s, "X")` |
| 刪除元素 | ❌ 不行 | ✅ `append(s[:i], s[i+1:]...)` |
| JS 對照 | TypeScript tuple `[string, string, string]` | JS `Array` / TS `string[]` |
| 使用頻率 | 極少（<1%） | 幾乎都用這個（99%） |

### JS 對照

```js
// JS 沒有靜態陣列的概念，Array 天生就是動態的
const arr = ["A", "B"]
arr.push("C")  // OK，JS array 永遠可以 push

// TypeScript 的 tuple 可以「模擬」固定長度，但只是型別檢查
const fixed: [string, string, string] = ["A", "B", "C"]
// fixed.push("D")  // TypeScript 不會報錯（runtime 還是 JS array）
```

### 為什麼 Go 要分兩種？

Go 是靜態型別 + 注重效能的語言：
- **靜態陣列**在 stack 上分配，效能極高，但長度固定
- **Slice**在 heap 上分配，有 `len`（目前長度）和 `cap`（容量）的概念，可以動態成長

**實務上 99% 都用 Slice（`[]string`），幾乎不用靜態陣列（`[3]string`）。**
我們專案裡的 `[]string`、`[]BoothProduct`、`[]byte` 全部都是 Slice。

## 重點

- `json.RawMessage` 本質是 `[]byte`
- 適合存任意結構的 JSON 到 DB（陣列、物件、巢狀都行）
- GORM + MySQL JSON 欄位的標準做法
- 前端傳 `[]string`，後端 DTO 用 `[]string`，存 DB 用 `json.RawMessage`，三層轉換
- **Marshal = 打包（Go → JSON）**，**Unmarshal = 拆包（JSON → Go）**
- **`[]byte` 不是亂碼**，就是 UTF-8 字元的數字表示，跟 JS 的 `Uint8Array` 一樣
- **Marshal** 扁平無縮排（存 DB 用），**MarshalIndent** 有縮排（debug 用）
- Go 的 `[]string` = JS 的 `string[]`，`[]` 代表 slice（動態陣列）
- Go 是靜態型別，宣告時就要指定型別，不像 JS 可以隨便換
- **`[]string` 是有序的**（index 0, 1, 2...），順序從前端到 DB 再到前端全程保留
- **靜態陣列 `[N]type`** 長度固定不能 append，**Slice `[]type`** 長度可變可以 append — 實務上 99% 用 Slice
