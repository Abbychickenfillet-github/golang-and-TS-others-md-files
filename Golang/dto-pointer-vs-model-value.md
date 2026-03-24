# 為什麼 DTO 用指標 `*bool`，Model 用一般 `bool`？

> 相關：[解開指標（Dereference）](dereference-pointer.md) | [指標基礎](golang-pointer-asterisk.md) | [指標、Nil、Struct 觀念](pointer-method-struct-explainer.md)

## 先搞懂 `program` 和 `req` 分別是什麼

以 `UpdateProgram` 為例：

> 參考：`backend-go/internal/service/event_coupon_service.go:295`

```go
func (s *eventCouponService) UpdateProgram(ctx context.Context, programID string, req *dto.UpdateEventCouponProgramRequest) {
    program, err := s.programRepo.GetByID(ctx, programID, false)
    // ...
    if req.IsFree != nil {
        program.IsFree = *req.IsFree
    }
}
```

| 變數 | 來源 | 說明 |
|------|------|------|
| `program` | `s.programRepo.GetByID(...)` | 從資料庫撈出來的那筆 event_coupon_program |
| `req` | API 請求的 body | 使用者傳進來要更新的欄位 |

所以 `program.IsFree = *req.IsFree` 的意思是：
**把資料庫的舊值，改成使用者傳來的新值。**

### 這段是在處理請求，不是回應

這段 code 在 **Service 層**，是處理請求的中間邏輯：

```
前端送 PUT/PATCH 請求 → Handler 接收 → Service 處理 → 存回資料庫 → 回傳 response
                                        ↑
                                    這段 code 在這裡
```

從 DB 撈 `program` 的目的是當**更新基底**，不是要回傳。
流程：撈舊資料 → 用 `req` 的值覆蓋要改的欄位 → 存回 DB → 之後才組 response 回傳。

### `req.IsFree` 的拆解

`req.IsFree` 不是一個獨立變數，而是用 `.` 去**存取 struct 欄位**的語法：

| 部分 | 意思 |
|------|------|
| `req` | 傳入的請求 struct（整包資料） |
| `.IsFree` | 存取 `req` 裡面叫 `IsFree` 的欄位 |
| `*req.IsFree` | 把 `IsFree` 這個指標[解開](dereference-pointer.md)，拿出裡面的 `bool` 值 |

就像 JavaScript 的 `req.body.isFree`，主角是 `IsFree`，`req.` 只是告訴 Go「去 `req` 裡面找」。

嚴格來說 `IsFree` 叫做**欄位（field）**，不叫變數（variable）：
- **變數（variable）**：獨立宣告的，像 `var name string`
- **欄位（field）**：住在 struct 裡面的，像 `type Req struct { IsFree *bool }`

---

## `*` 星號在 Go 裡的兩個用途

同一個符號 `*`，出現在不同位置意義完全不同：

| 位置 | 意義 | 例子 |
|------|------|------|
| **定義型別時** | 「這是一個指標型別」 | `IsFree *bool` → 宣告欄位是 bool 的指標 |
| **使用變數|欄位 時** | 「[解開指標](dereference-pointer.md)，拿出裡面的值」 | `*req.IsFree` → 拆開指標，拿出 true 或 false |

```go
// 定義：* 出現在型別前面 → 代表「指標型別」
type UpdateEventCouponProgramRequest struct {
    IsFree *bool   // IsFree 的型別是「指向 bool 的指標」
}

// 使用：* 出現在變數前面 → 代表「解開指標」（見 dereference-pointer.md）
req.IsFree       // 拿到指標本身（可能是 nil，也可能指向某個 bool）
*req.IsFree      // 解開指標，拿到裡面的 bool 值（true 或 false）
```

---

## 為什麼 DTO 和 Model 的型別不一樣？

### Model（資料庫）— 值一定存在，用 `bool`

```go
type EventCouponProgram struct {
    IsFree bool   // 資料庫裡一定是 true 或 false，不會「沒有值」
}
```

### DTO（API 請求）— 值可能沒傳，用 `*bool`

```go
type UpdateEventCouponProgramRequest struct {
    IsFree *bool  // 使用者可能根本沒傳這個欄位 → nil
}
```

---

## 用實際 API 請求理解

### 情境 A：使用者只想改名字，沒傳 is_free

```json
{ "name": "新方案名" }
```

```
req.IsFree = nil（沒傳）
if req.IsFree != nil → false，跳過
→ 資料庫的 IsFree 不會被動到 ✅
```

### 情境 B：使用者想把 is_free 改成 true

```json
{ "name": "新方案名", "is_free": true }
```

```
req.IsFree = &true（有值）
if req.IsFree != nil → true，進入
program.IsFree = *req.IsFree → 解開指標（見 dereference-pointer.md），資料庫改成 true ✅
```

### 情境 C（反例）：如果 DTO 也用一般 bool 會怎樣？

```json
{ "name": "新方案名" }
```

```
req.IsFree = false（Go 的 bool 預設零值就是 false）
→ 分不清「使用者傳了 false」還是「使用者根本沒傳」
→ 可能誤把資料庫的 true 覆蓋成 false ❌
```

---

## 總結

| | DTO（請求） | Model（資料庫） |
|---|---|---|
| 型別 | `*bool`（指標） | `bool`（一般） |
| 可能的值 | `nil` / `&true` / `&false` | `true` / `false` |
| 為什麼 | 要分辨「沒傳」vs「傳了 false」 | 資料庫一定有值 |

**一句話：DTO 用指標是為了支援「部分更新」，讓沒傳的欄位不會被零值覆蓋。**
