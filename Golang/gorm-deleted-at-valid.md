# GORM DeletedAt.Valid — 軟刪除判斷

## 什麼是 `DeletedAt.Valid`？

GORM 的 `DeletedAt` 型別是 `gorm.DeletedAt`，底層是 `sql.NullTime`：

```go
type NullTime struct {
    Time  time.Time  // 實際的時間值
    Valid bool       // 這個值是否有效（不是 NULL）
}
```

## 怎麼用？

```go
// 判斷一筆資料有沒有被軟刪除
if booth.DeletedAt.Valid {
    // deleted_at 有值 → 這筆資料已被軟刪除
}

if !booth.DeletedAt.Valid {
    // deleted_at IS NULL → 這筆資料還活著
}
```

## 常見模式

```go
// 檢查資料是否存在且未被刪除
if booth == nil || booth.DeletedAt.Valid {
    return nil, fmt.Errorf("攤位不存在")
}
```

## 為什麼不直接用 `deleted_at == nil`？

因為 Go 不像其他語言可以直接比較 `nil`。`time.Time` 的零值不是 `nil`，所以 Go 用 `Valid` 布林值來表示 SQL 的 `NULL`。

## 同樣模式的其他型別

| 型別 | 用途 |
|------|------|
| `sql.NullTime` | 可為 NULL 的時間 |
| `sql.NullString` | 可為 NULL 的字串 |
| `sql.NullInt64` | 可為 NULL 的整數 |
| `sql.NullBool` | 可為 NULL 的布林 |

每個都有 `.Valid` 和對應的值欄位（`.Time`、`.String`、`.Int64`、`.Bool`）。
