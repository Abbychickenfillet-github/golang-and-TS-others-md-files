# Go 指標（Pointer）與星號 `*` 解釋

## 什麼是指標？

指標是一個變數，儲存的是另一個變數的**記憶體位址**，而不是值本身。

## 星號 `*` 的用法

### 1. 在型別前面：表示「指向這個型別的指標」

```go
func GetOrder(id string) (*models.Order, error)
```

這個函式回傳：
- `*models.Order` → 指向 `Order` 結構的記憶體位址
-   Order 結構位置：backend-go/internal/models/order.go:77
- `error` → 錯誤

### 2. 在變數前面：取得指標指向的值（解引用）

```go
order := &Order{ID: "123"}  // & 取得位址
fmt.Println(*order)          // * 取得值
```

## 為什麼要用指標？

### 1. 效能考量

`Order` 結構可能有很多欄位（如下），傳指標只傳一個位址（8 bytes），不用複製整個結構：

```go
type Order struct {
    Base
    OrderNumber     *string
    OrderType       string
    EventID         string
    BuyerID         *string
    TotalAmount     decimal.Decimal
    PaymentStatus   string
    Status          string
    CheckInStatus   string
    // ... 還有更多欄位
}
```

### 2. 可以回傳 `nil`

找不到資料時可以回傳 `nil`：

```go
order, err := GetOrder("123")
if order == nil {
    // 找不到訂單
}
```

如果不用指標（直接回傳 `Order`），就無法回傳「空」的狀態。

### 3. 可以修改原始資料

```go
func UpdateOrder(order *Order) {
    order.Status = "CONFIRMED"  // 直接修改原始資料
}
```

## 簡單記法

| 符號 | 意思 | 範例 |
|------|------|------|
| `Order` | 值本身（複製一份） | `func GetOrder() Order` |
| `*Order` | 指向值的指標（只傳位址） | `func GetOrder() *Order` |
| `&order` | 取得變數的位址 | `ptr := &order` |
| `*ptr` | 取得指標指向的值 | `value := *ptr` |

## Order 結構位置

`backend-go/internal/models/order.go`

## 常見使用情境

```go
// Repository 層通常回傳指標
func (r *orderRepository) GetByID(id string) (*models.Order, error) {
    var order models.Order
    if err := r.db.Where("id = ?", id).First(&order).Error; err != nil {
        return nil, err  // 回傳 nil 表示找不到
    }
    return &order, nil   // 回傳指標
}

// Service 層接收指標
func (s *orderService) ProcessOrder(order *models.Order) error {
    order.Status = "CONFIRMED"  // 直接修改
    return s.repo.Update(order)
}
```

---

## Q&A 補充

### Q: 指標是指快取的記憶體嗎？

不是。指標存的是**記憶體位址**，跟快取（cache）無關。

```
一般變數：
isFree = true              ← 直接存值

指標變數：
isFree = 0xC0000B4010      ← 存的是「true 這個值放在記憶體的哪個位置」
```

生活比喻：

| 概念 | 比喻 |
|------|------|
| 一般變數 `bool` | 手上直接拿著一本書 |
| 指標 `*bool` | 手上拿著一張紙條，寫著「書在書架第 3 層」 |
| `*req.IsFree`（解開指標） | 照著紙條去書架拿書 |
| `nil`（空指標） | 紙條是空白的，硬去找就會 panic 崩潰 |

### Q: `*req.IsFree` 會得到 true、false、nil 三種嗎？

不會。`*req.IsFree` 只會得到 `true` 或 `false`。

因為解開指標之前一定要先檢查 nil：

```go
if req.IsFree != nil {           // 先擋掉 nil
    program.IsFree = *req.IsFree // 走到這裡一定不是 nil
}
```

| 表達式 | 可能的值 | 說明 |
|--------|----------|------|
| `req.IsFree` | `nil` / `&true` / `&false` | 指標本身，三種可能 |
| `*req.IsFree` | `true` / `false` | 解開後只有兩種，**前提是不能是 nil** |

### Q: `&true` 是什麼？`&` 和 `*` 的差異？

`&` 和 `*` 是**相反操作**：

```
&  → 把值包成指標（打包）
*  → 把指標解開拿值（拆開）
```

```go
value := true
ptr   := &value   // 打包：bool → *bool（把 true 包成指標）
back  := *ptr     // 拆開：*bool → bool（從指標拿回 true）
```

| 操作 | 方向 | 例子 | 結果 |
|------|------|------|------|
| `&` | 值 → 指標 | `&true` | 得到 `*bool`，指向 true 的記憶體位址 |
| `*` | 指標 → 值 | `*req.IsFree` | 得到 `bool`，true 或 false |

#### API 請求的完整流程

```
1. API 請求 {"is_free": true} 進來
                ↓
2. Go JSON 解析器把它變成 req.IsFree = &true（*bool 指向 true）
                ↓
3. if req.IsFree != nil → 不是 nil，代表使用者有傳這個欄位
                ↓
4. program.IsFree = *req.IsFree → 用 * 解開拿到 true，存進資料庫
```

#### 三種情況對照

| API 請求 | `req.IsFree` 的值 | `!= nil`? | 結果 |
|----------|-------------------|-----------|------|
| `{"name": "新方案"}` | `nil` | 否，跳過 | 資料庫的值不動 |
| `{"is_free": true}` | `&true` | 是，進入 | `*req.IsFree` → `true`，存進資料庫 |
| `{"is_free": false}` | `&false` | 是，進入 | `*req.IsFree` → `false`，存進資料庫 |

---

### Q: 其他語言也用記憶體嗎？

對，所有語言都用記憶體。差別是**你需不需要自己管**：

| 語言 | 有指標語法？ | 記憶體回收 | 你要做什麼 |
|------|-------------|-----------|------------|
| **C / C++** | 有 `*` | 手動 `free()` | 自己分配、自己釋放，忘了就記憶體洩漏 |
| **Go** | 有 `*` | 自動（GC） | 偶爾用指標，記憶體自動回收 |
| **JavaScript** | 沒有 | 自動（GC） | 完全不用管 |
| **Python** | 沒有 | 自動（GC） | 完全不用管 |

JS 和 Python 底層也有記憶體位址，只是語言**藏起來不讓你碰**。

### Q: Go 是大幅用到指標的語言嗎？

不算。Go 是**可以用但不會到處用**，比 C/C++ 少很多。

在 FutureSign 專案裡，主要用指標的場景：
1. **DTO 可選欄位** — `*bool`、`*string`、`*int`（為了區分「沒傳」和「傳了零值」）
2. **Repository 回傳** — `*models.Order`（為了用 `nil` 表示「找不到」）
3. **傳大型 struct** — 傳指標（8 bytes）比複製整個 struct 省記憶體

---

## Go vs C：`*p++` 與 `(p++)` 這種寫法

### 重點：Go 根本不支援 `*p++`

在 Go 裡 `++` **不是運算子（operator），而是「語句（statement）」**。所以：

- `p++` 只能單獨成一行，不能放進運算式裡
- ❌ 不能寫 `x = p++`、❌ 不能寫 `*p++`、❌ 不能寫 `(p++)`
- Go 也**沒有指標算術（pointer arithmetic）**，指標不能 `+1` 往後移動

這是 Go 故意的設計，避免 C 那種把人搞瘋的歧義。

```go
p++              // ✅ 合法，單獨一行
x := p++         // ❌ 編譯錯誤：++ 不是運算式
*p++             // ❌ 編譯錯誤
```

### 如果在 C 語言裡，這兩個是什麼意思？

C 裡 `++`（後綴）優先級**高於** `*`，所以：

#### `*p++` 等價於 `*(p++)`

意思：**先取 `*p` 的值，然後把指標 `p` 往後移一格**（指向下一個元素）。

```c
int arr[] = {10, 20, 30};
int *p = arr;

int x = *p++;
// 1. 先用 p 現在的位置解引用 → x = 10
// 2. 然後 p 自己 +1，指向 arr[1]（20）
// 結果：x = 10，p 現在指向 20
```

經典用法（邊讀邊往前走，複製字串）：

```c
while (*src) *dst++ = *src++;   // 經典 strcpy 寫法
```

#### `(p++)` 跟 `p++` 一樣

括號是多餘的——`p++` 本來就是完整運算式：回傳 `p` 目前的舊位址，副作用是 `p` 往後移一格。

### 面試最愛的陷阱對比

| 寫法 | 拆解 | 意思 |
|------|------|------|
| `*p++` | `*(p++)` | 取舊位置的**值**，指標再前移 |
| `(*p)++` | `(*p)++` | 取舊位置的**值**，然後把那個**值** +1（指標不動） |
| `*(p++)` | 同 `*p++` | 跟第一個一樣 |

真正會改變語意的對比是 **`*p++` vs `(*p)++`**：一個移動指標、一個遞增值。

> 對照：[[golang-syntax-guide]]、[[golang-concurrency]]
