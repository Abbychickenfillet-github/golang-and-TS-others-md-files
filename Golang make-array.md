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
