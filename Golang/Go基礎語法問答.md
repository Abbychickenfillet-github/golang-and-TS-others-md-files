# Go 基礎語法問答

> 日期：2026-02-05
> 相關檔案：`backend-go/internal/service/event_coupon_service.go`

---

## 1. `:=` 是什麼？（短變數宣告）

`:=` 是 Go 的**短變數宣告**（Short Variable Declaration），同時宣告並賦值：

```go
// 這兩個是等價的
var name string = "Alice"   // 完整寫法
name := "Alice"             // 短變數宣告（自動推斷類型）

// 更多例子
count := 10                 // 自動推斷為 int
price := 99.9               // 自動推斷為 float64
isActive := true            // 自動推斷為 bool
user, err := GetUser(id)    // 同時宣告多個變數（函式回傳多值）
```

| 符號 | 用途 | 限制 |
|------|------|------|
| `:=` | 宣告 + 賦值 | 只能在函式內使用 |
| `=` | 純賦值（變數已存在）| 任何地方都可以 |

### 多值回傳與短變數宣告

```go
// Go 函式可以回傳多個值
func GetUser(id string) (*User, error) {
    //                   ^^^^^  ^^^^^
    //                   第一個  第二個回傳值
}

// 呼叫時
user, err := GetUser(id)
// user = 第一個回傳值（*User 或 nil）
// err  = 第二個回傳值（error 或 nil）
```

---

## 1.5 Go 錯誤處理慣例

Go **沒有** try-catch，而是用**多值回傳**處理錯誤：

```go
// 幾乎所有可能失敗的函式都回傳 (結果, error)
user, err := GetUser(id)
if err != nil {
    // 處理錯誤
    return nil, err  // 或 log 後繼續
}
// 成功，使用 user

// 常見模式
data, err := doSomething()
if err != nil {
    return err
}

result, err := doAnotherThing(data)
if err != nil {
    return err
}
// 繼續...
```

**為什麼這樣設計？**
- 強制你處理錯誤（不能忽略）
- 錯誤處理就在呼叫點旁邊，容易追蹤
- 沒有隱藏的控制流程（不像 exception 會跳來跳去）

---

## 2. `[]dto` 是什麼？（Slice 切片）

`[]dto.EventCouponClaimResponse` 是一個 **slice**（切片），類似其他語言的陣列/列表：

```go
[]dto.EventCouponClaimResponse
^^
這是 slice 符號，表示「多個」

// 範例
var users []User           // 宣告一個 User 的 slice
users := []User{}          // 空的 slice
users := []User{user1, user2}  // 有兩個元素的 slice
```

**Slice vs Array：**

| 類型 | 語法 | 長度 |
|------|------|------|
| Array | `[5]int` | 固定長度（5 個）|
| Slice | `[]int` | 可變長度 |

Go 幾乎都用 **slice**，很少用 array。

### Q: `[3]int` 為什麼叫做 `int`？是把 array 取名叫 int 嗎？

**不是！** `int` 是**元素的類型**，不是 array 的名稱。

```go
[3]int
 ^  ^^^
 │   └── 元素類型（每個元素都是 int）
 └────── 陣列長度（固定 3 個元素）

// 完整解讀
[3]int    = 「一個有 3 個 int 元素的陣列」
[5]string = 「一個有 5 個 string 元素的陣列」
[10]bool  = 「一個有 10 個 bool 元素的陣列」
```

**對比 Slice：**

```go
[]int     = 「一個 int 元素的切片」（長度可變）
[3]int    = 「一個有 3 個 int 元素的陣列」（長度固定）
```

### Q: 固定長度「5」的意思是可以等於或小於 5 嗎？

**不是！** 固定長度 5 就是**剛好 5 個**，不能多也不能少。

```go
var arr [5]int  // 宣告一個長度為 5 的 int 陣列

// 這個陣列永遠有 5 個元素：
arr[0] = 10   // ✅ 第 1 個元素
arr[1] = 20   // ✅ 第 2 個元素
arr[2] = 30   // ✅ 第 3 個元素
arr[3] = 40   // ✅ 第 4 個元素
arr[4] = 50   // ✅ 第 5 個元素
arr[5] = 60   // ❌ 錯誤！超出範圍（索引 0-4）

// 即使不賦值，也會有 5 個元素（零值）
var arr2 [5]int
// arr2 = [0, 0, 0, 0, 0]  ← 自動填入 5 個零值
```

**重點理解：**

| 概念 | Array `[5]int` | Slice `[]int` |
|------|----------------|---------------|
| 長度 | 永遠是 5 | 可以是 0, 1, 2, 100... |
| 宣告後 | 立刻有 5 個元素（零值） | 可以是空的 |
| 加入元素 | ❌ 不行 | ✅ 用 `append()` |
| 刪除元素 | ❌ 不行 | ✅ 可以重新切片 |

```go
// Slice 的彈性
s := []int{}           // 空的 slice，長度 0
s = append(s, 10)      // 加入一個，長度變 1
s = append(s, 20, 30)  // 再加兩個，長度變 3

// Array 沒有彈性
var a [3]int           // 長度永遠是 3
// 無法 append，無法改變長度
```

**結論：這就是為什麼 Go 幾乎都用 Slice，很少用 Array。**

---

## 3. `s` 是什麼？（Receiver 接收器）

在 method 定義中，`s` 是 **receiver**（接收器），類似其他語言的 `this` 或 `self`：

```go
func (s *eventCouponService) GetClaimsByProgram(ctx context.Context, ...) {
//    ^^^^^^^^^^^^^^^^^^^^^^^
//    s 是 receiver，代表 eventCouponService 的實例
```

**`s` 可以存取 struct 的所有欄位：**

```go
type eventCouponService struct {
    programRepo repository.EventCouponProgramRepository
    claimRepo   repository.EventCouponClaimRepository
    memberRepo  repository.MemberRepository  // ← s.memberRepo
    eventRepo   repository.EventRepository   // ← s.eventRepo
    userRepo    repository.UserRepository
}

// 在 method 裡面
func (s *eventCouponService) SomeMethod() {
    s.memberRepo.GetByID(...)  // 透過 s 存取 memberRepo
    s.eventRepo.GetByID(...)   // 透過 s 存取 eventRepo
}
```

### Function vs Method

```go
// Function（函式）- 獨立的
func Add(a, b int) int { return a + b }

// Method（方法）- 綁定到某個 struct
func (c *Calculator) Add(a, b int) int { return a + b }
```

### Q: receiver 接收器 = service 本身，這樣講對嗎？

**對的！** `s` 就是 service 的實例，就像 Python 的 `self` 或 JavaScript 的 `this`。

```go
func (s *eventCouponService) GetClaimsByProgram(...) {
//    ^
//    s 就是 eventCouponService 的實例（service 本身）

    s.memberRepo.GetByID(...)  // 存取 service 的屬性
}
```

### Q: `Calculator` 一看就知道是 Struct 嗎？

**是的，可以從 receiver 語法判斷：**

```go
func (c *Calculator) Add(a, b int) int
//      ^^^^^^^^^^^
//      *Calculator 表示這是指向 Calculator 的指標
//      Calculator 必須是一個 type（通常是 struct）
```

**完整範例：**

```go
// 1. 先定義 struct
type Calculator struct {
    history []int
}

// 2. 再定義 method（綁定到該 struct）
func (c *Calculator) Add(a, b int) int {
    result := a + b
    c.history = append(c.history, result)  // 存取 struct 的欄位
    return result
}

// 3. 使用
calc := &Calculator{}  // 建立實例
sum := calc.Add(1, 2)  // 呼叫 method
```

### Q: `(s *eventCouponService)` 這部分叫什麼？

這叫做 **receiver（接收器）**，是 Go 定義 method 的語法：

```go
func (s *eventCouponService) buildClaimResponse(...) dto.EventCouponClaimResponse {
//   ^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//   receiver（接收器）        method 名稱            回傳類型
```

**完整結構：**

```go
func (receiver) MethodName(parameters) ReturnType {
    // 方法內容
}
```

---

## 3. `ctx context.Context` 是什麼？

> 已拆為獨立筆記：[context-context.md](context-context.md)

---

## 4. 為什麼用 `*string`（指標）而不是 `string`？

```go
var eventName *string  // 指標，可以是 nil
var eventName string   // 值，不能是 nil（零值是 ""）
```

### 原因：區分「沒有值」和「空字串」

| 情況 | `string` | `*string` |
|------|----------|-----------|
| 沒有值 | `""` (空字串) | `nil` |
| 空字串 | `""` | `&""` (指向空字串) |
| 有值 | `"活動名稱"` | `&"活動名稱"` |

### JSON 輸出差異

```go
// 使用 string
type Response struct {
    EventName string `json:"event_name"`
}
// JSON 輸出：{"event_name": ""}  ← 找不到時會顯示空字串

// 使用 *string
type Response struct {
    EventName *string `json:"event_name,omitempty"`
}
// JSON 輸出：{}  ← 找不到時整個欄位不顯示（因為是 nil + omitempty）
```

### 程式碼範例

```go
var eventName *string  // 初始是 nil（表示「還不知道」）

event, err := s.eventRepo.GetByID(program.EventID, false, true)
if err == nil && event != nil {
    eventName = &event.Name  // 查到了，設定值
    //          ^
    //          & 取得 event.Name 的地址，賦值給 eventName 指標
}

// 最後
// - 如果查到：eventName 指向 "活動名稱"
// - 如果沒查到：eventName 還是 nil
```

### 圖解

```
查到活動時：
eventName ──指向──> "2024 夜市活動"

沒查到時：
eventName ──> nil（什麼都不指向）
```

---

## 5. `issuer` 和 `issued_by` 的關係

```go
// issued_by 是資料庫欄位名稱（存的是 member ID）
// issuer 是 Go 變數名稱（從資料庫查出來的 Member 物件）

issuer, err := s.memberRepo.GetByID(claim.IssuedBy, false)
//                                   ^^^^^^^^^^^^^^
//                                   這是 claim 表裡的 issued_by 欄位值（member ID）
```

**對應關係：**

```
claim.IssuedBy = "abc123"  (issued_by 欄位的值，是一個 member ID)
        ↓
s.memberRepo.GetByID("abc123", false)
        ↓
issuer = Member{ID: "abc123", Name: "王小明", Phone: "0912..."}
```

---

## 6. Repository 層是什麼？這是 GORM 操作嗎？

**不是直接的 GORM，而是經過 Repository 層封裝：**

```
Service 層 (event_coupon_service.go)
    ↓ 呼叫
Repository 層 (event_repository.go)
    ↓ 呼叫
GORM (實際的資料庫操作)
```

### 為什麼要這樣分層？

| 優點 | 說明 |
|------|------|
| 解耦 | Service 不直接依賴 GORM，方便換資料庫 |
| 測試 | 可以 mock Repository 進行單元測試 |
| 複用 | 同一個查詢邏輯可以被多個 Service 使用 |

### Repository 裡面大概長這樣

```go
// repository/event_repository.go
func (r *eventRepository) GetByID(id string, includeDeleted, preloadCompany bool) (*models.Event, error) {
    var event models.Event
    query := r.db.Where("id = ?", id)  // ← 這裡才是 GORM
    if !includeDeleted {
        query = query.Where("deleted_at IS NULL")
    }
    if preloadCompany {
        query = query.Preload("Company")
    }
    err := query.First(&event).Error
    return &event, err
}
```

---

## 總結表格

| 概念 | 說明 |
|------|------|
| `:=` | 短變數宣告（宣告 + 賦值 + 自動推斷類型）|
| `s` | Service 實例（類似 `this`/`self`）|
| `s *Type` | 指標 receiver，指向原本的 struct |
| `s.memberRepo` | Service 裡的 MemberRepository |
| `ctx context.Context` | 請求上下文，用於取消、超時、傳遞資料 |
| `*string` | 指向 string 的指標，可以是 `nil` |
| `&event.Name` | 取得 `event.Name` 的記憶體地址 |
| `[]Type` | Slice（切片），可變長度的陣列 |
| `issuer` | 從 member 表查出來的 Member 物件 |
| `claim.IssuedBy` | claim 表的 issued_by 欄位值（member ID）|
| Repository | 封裝 GORM 的資料存取層 |

---

## 8. 為什麼用指標 receiver `(s *eventCouponService)`？

```go
func (s *eventCouponService) GetClaims(...) {
//      ^
//      * = 指標
```

| 類型 | 語法 | 特性 |
|------|------|------|
| 值 receiver | `(s eventCouponService)` | 複製整個 struct，修改不影響原本 |
| 指標 receiver | `(s *eventCouponService)` | 指向原本的 struct，可以修改原本的 |

**用指標的原因：**
1. **效能** - 不用複製整個 struct
2. **修改** - 可以修改 struct 的內容
3. **一致性** - Go 慣例：如果任何 method 用指標，就全部用指標

---

## 9. MySQL `DATETIME(3)` 的意思

`(3)` 是**精確度**，表示毫秒（3 位小數）：

```sql
DATETIME       -- 精確到秒     2026-02-05 14:30:45
DATETIME(3)    -- 精確到毫秒   2026-02-05 14:30:45.123
DATETIME(6)    -- 精確到微秒   2026-02-05 14:30:45.123456
```

**為什麼用毫秒？**
- Go 的 `time.Time` 預設精確到納秒
- 如果用 `DATETIME`（只到秒），會丟失精度
- `DATETIME(3)` 是合理的平衡
