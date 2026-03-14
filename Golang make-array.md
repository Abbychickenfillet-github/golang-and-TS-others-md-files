# Go 的 make 與 Slice（陣列）

## make 是什麼？

Go 內建函式，用來初始化 slice、map、channel。類似 JS 的 `new Array()`。

```go
// 語法：make([]型別, 初始長度, 預分配容量)
areas := make([]dto.MapAreaPublic, 0, 6)
//       型別                      長度  容量
```

- **長度 `0`**：一開始是空的
- **容量 `6`**：預先分配 6 個位置的記憶體，避免 `append` 時反覆擴容（效能優化）

### 對比 JavaScript

```javascript
// JS
const areas = []                        // 空陣列
const areas = new Array(6)              // 預分配 6 個位置
```

```go
// Go
var areas []dto.MapAreaPublic           // 空 slice（nil）
areas := make([]dto.MapAreaPublic, 0, 6) // 空 slice，預分配容量 6
```

## 不用 make 也可以

```go
// 方法 1：var 宣告（nil slice，append 時自動擴容）
var areas []dto.MapAreaPublic
areas = append(areas, item1)

// 方法 2：短宣告空 slice
areas := []dto.MapAreaPublic{}
areas = append(areas, item1)

// 方法 3：make 預分配（效能最好）
areas := make([]dto.MapAreaPublic, 0, len(mapObj.Areas))
areas = append(areas, item1)
```

三種都能用，差別只在效能。如果你知道大概會有幾個元素，用 `make` 預分配比較好。

### 為什麼預分配比較好？

不用 `make` 時，每次 `append` 容量不夠，Go 會：
1. 分配一塊更大的新記憶體（通常 2 倍）
2. 把舊資料全部複製過去
3. 釋放舊記憶體

```
// 不預分配，append 6 個元素：
append 第 1 個 → 容量 1  [A]                ← 分配記憶體
append 第 2 個 → 容量不夠！擴容到 2，複製     [A, B]
append 第 3 個 → 容量不夠！擴容到 4，複製     [A, B, C, _]
append 第 4 個 → 塞進去                     [A, B, C, D]
append 第 5 個 → 容量不夠！擴容到 8，複製     [A, B, C, D, E, _, _, _]
append 第 6 個 → 塞進去                     [A, B, C, D, E, F, _, _]
→ 分配 4 次記憶體，複製 3 次

// 用 make 預分配 6：
make([], 0, 6) → [_, _, _, _, _, _]        ← 只分配 1 次
append 6 個    → [A, B, C, D, E, F]
→ 分配 1 次，0 次複製
```

小量資料感覺不到差別，大量資料（幾千幾萬筆）才有意義。一般寫 `var areas []Type` 就夠了。

## append 怎麼用？

Go 的 slice 不能直接 `areas[i] = item`（除非長度已經夠），要用 `append`：

```go
// 加一個
areas = append(areas, newArea)

// 加多個
areas = append(areas, area1, area2, area3)
```

注意：`append` 回傳新的 slice，必須接住 `areas = append(areas, ...)`。

## Method Receiver（順便記）

```go
func (s *mapService) MapToPublic(mapObj *models.Map) *dto.MapPublic {
//    ^^^^^^^^^^^^^^ 這是 method receiver
```

等同 JS 的 class method：

```javascript
class MapService {
    mapToPublic(mapObj) { ... }  // this === s
}
```

`s` 就是 Go 版的 `this`，指向 `mapService` 實例。

## make + GORM 實際資料流範例

`make` 組出來的 struct 還只是**記憶體裡的 Go 物件**，要透過 GORM 的 `Create` 才會變成 SQL INSERT 寫進資料庫。

### 實際程式碼（coupon_program_ticket_repository.go）

```go
// 1. 用 make 建立空的 slice（記憶體裡）
rows := make([]models.CouponProgramTicket, len(ticketIDs))

// 2. 用 for 迴圈把資料填進去（還是在記憶體裡）
for i, tid := range ticketIDs {
    rows[i] = models.CouponProgramTicket{
        CouponProgramID: programID,
        TicketID:        tid,
    }
}

// 3. GORM 把 Go 物件轉成 INSERT INTO ... 寫入資料庫
tx.Create(&rows)
```

### 資料流圖解

```
make([]models.CouponProgramTicket, 3)
    ↓ 記憶體裡的空 slice
    [{}, {}, {}]

for 迴圈填值
    ↓ 記憶體裡的 Go struct
    [
      {CouponProgramID: "prog-1", TicketID: "ticket-A"},
      {CouponProgramID: "prog-1", TicketID: "ticket-B"},
      {CouponProgramID: "prog-1", TicketID: "ticket-C"},
    ]

tx.Create(&rows)
    ↓ GORM 轉成 SQL
    INSERT INTO coupon_program_tickets
      (coupon_program_id, ticket_id)
    VALUES
      ('prog-1', 'ticket-a'),
      ('prog-1', 'ticket-b'),
      ('prog-1', 'ticket-c');
    ↓
    寫入資料庫 ✅
```

### `tx` 是什麼？

`tx` = **transaction**（資料庫交易），是 GORM 的慣例命名。

```go
r.db.Transaction(func(tx *gorm.DB) error {
    // tx 就是這次交易的 DB 連線
    // 在這個 func 裡面的所有操作是「一組」的：
    //   - 全部成功 → 一起 commit
    //   - 任一失敗（return err）→ 全部 rollback
})
```

對比 JS 的概念：
```javascript
// 類似 JS 的 try-catch 但是是資料庫層級
const tx = await db.beginTransaction()
try {
    await tx.delete(...)  // 刪除舊的
    await tx.insert(...)  // 新增新的
    await tx.commit()     // 全部成功，一起存
} catch (err) {
    await tx.rollback()   // 任一失敗，全部撤銷
}
```

### `r.db` vs `tx` 差別

| 寫法 | 意思 |
|------|------|
| `r.db.Create(...)` | 直接執行，沒有交易保護 |
| `tx.Create(...)` | 在交易裡執行，失敗會 rollback |

在 `ReplaceByProgramID` 裡用 `tx` 是因為「先刪後建」必須是原子操作——刪了卻沒建成功會出事。
