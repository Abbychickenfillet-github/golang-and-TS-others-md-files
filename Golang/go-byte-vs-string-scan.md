# Go 的 []byte vs string + 型別斷言

## []byte 和 string 差在哪？

兩個都可以存文字，但 Go 把它們當成**不同型別**，不能混用。

| | `string` | `[]byte` |
|---|---|---|
| 白話 | 一段文字（唯讀） | 一堆位元組/數字（可改） |
| 例子 | `"hello"` | `[104, 101, 108, 108, 111]` |
| 內容 | 一模一樣 | 一模一樣 |
| 互轉 | `[]byte("hello")` | `string(bytes)` |

雖然內容相同，但 Go 嚴格區分型別。
你不能把 `string` 當 `[]byte` 用，要先轉換。

## 型別斷言是什麼？

```go
value.([]byte)   // 問：value 是不是 []byte？
```

這叫「型別斷言」（type assertion），用在 `interface{}` 上。
`interface{}` 是 Go 的「什麼都能裝」型別（類似 JS 的 `any`）。

```go
bytes, ok := value.([]byte)
// ok = true  → value 確實是 []byte，bytes 拿到值
// ok = false → value 不是 []byte，bytes 是零值
```

## 實際案例：GORM StringArray Scan bug

GORM 的 `Scan(value interface{})` 收到 DB 回傳的值，
但不同 DB driver 回傳的型別不同：

```
DB 存的內容：  ["10:00","14:00"]（JSON 字串）

SQLite driver 回傳：   []byte{91, 34, 49, 48, ...}   ← 位元組陣列
PostgreSQL driver 回傳： string(`["10:00","14:00"]`)   ← 字串
```

原本的 code（有 bug）：
```go
bytes, ok := value.([]byte)  // 問：你是 []byte 嗎？
if !ok {
    *s = StringArray{}  // PostgreSQL：「我不是 []byte，我是 string」→ 回空陣列！
    return nil
}
```

修正後：
```go
switch v := value.(type) {
case []byte:              // SQLite 走這條
    data = v
case string:              // PostgreSQL 走這條
    data = []byte(v)      // 把 string 轉成 []byte
}
```

## 重點整理

- Go 的 `string` 和 `[]byte` 內容可以一樣，但型別不同
- `value.(SomeType)` 是在問「你是不是這個型別」，不是在轉換
- 寫 `Scan` 方法時，要考慮不同 DB driver 回傳的型別可能不同
- `switch v := value.(type)` 可以一次處理多種型別（type switch）
