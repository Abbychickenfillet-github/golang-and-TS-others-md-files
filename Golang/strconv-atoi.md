# strconv.Atoi — 字串轉整數

## 用途

`strconv.Atoi` 把 **字串轉成 int**（Atoi = ASCII to Integer）。

## 語法

```go
import "strconv"

num, err := strconv.Atoi("42")
// num = 42, err = nil

num, err := strconv.Atoi("abc")
// num = 0, err = *NumError（轉換失敗）
```

## 實際使用場景

HTTP query parameter 拿到的都是字串，要轉成數字才能做分頁：

```go
// c.DefaultQuery 回傳的是 string
skipStr := c.DefaultQuery("skip", "0")   // "0"
limitStr := c.DefaultQuery("limit", "50") // "50"

// 用 Atoi 轉成 int
skip, _ := strconv.Atoi(skipStr)   // 0
limit, _ := strconv.Atoi(limitStr) // 50
```

## 為什麼用 `_` 忽略 error？

```go
skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
```

因為 `DefaultQuery` 已經有預設值 `"0"`，即使用戶傳了奇怪的值（如 `"abc"`），`Atoi` 會回傳 `0`，對分頁來說 `0` 是安全的預設值，所以可以忽略錯誤。

## 相關函式

| 函式 | 用途 | 範例 |
|------|------|------|
| `strconv.Atoi(s)` | 字串 → int | `"42"` → `42` |
| `strconv.Itoa(n)` | int → 字串 | `42` → `"42"` |
| `strconv.ParseInt(s, base, bitSize)` | 更細的控制（進位、位元數） | `"FF"` base 16 → `255` |
| `strconv.ParseFloat(s, bitSize)` | 字串 → 浮點數 | `"3.14"` → `3.14` |
