# Go 格式化動詞：%s vs %w

## %s — 格式化為字串

把任何值轉成字串（對 error 來說就是呼叫 `.Error()` 方法）。

```go
err := errors.New("連線逾時")
result := fmt.Errorf("查詢失敗: %s", err)
// 結果: "查詢失敗: 連線逾時"
```

原始 `err` 的物件參考丟失，只保留文字。

## %w — 包裝錯誤（Wrap Error）

**只能用在 `fmt.Errorf` 中**。除了拼接文字，還額外保留原始 error 的「隱形鏈結」。

```go
err := errors.New("連線逾時")
result := fmt.Errorf("查詢失敗: %w", err)
// 結果: "查詢失敗: 連線逾時"  ← 文字跟 %s 一模一樣！
```

## 差別在哪？

**輸出的文字完全相同**，差別在於 `%w` 可以用 `errors.Is()` / `errors.As()` 追溯原始錯誤：

```go
originalErr := errors.New("連線逾時")

// %w 包裝 → 可追溯
wrappedErr := fmt.Errorf("查詢失敗: %w", originalErr)
errors.Is(wrappedErr, originalErr) // true ✅

// %s 純字串 → 追溯不到
stringErr := fmt.Errorf("查詢失敗: %s", originalErr)
errors.Is(stringErr, originalErr)  // false ❌
```

## 什麼時候用哪個？

| 情境 | 用法 |
|------|------|
| 需要讓上層判斷錯誤類型（例如 404 vs 500） | `%w` |
| 只是記 log，不需要追溯 | `%s` |
| 想隱藏內部實作細節（不讓外部 unwrap） | `%s` |

## 一句話總結

- `%w` = 可追溯的錯誤鏈（保留物件參考）
- `%s` = 只保留文字（丟失物件參考）


Golang 的 fmt.Errorf 函數用於根據格式化字串建立新的 error 物件，常用於動態產生錯誤訊息。它類似 fmt.Sprintf 但返回一個 error 類型。自 Go 1.13 起，它支援使用 %w 謂詞來包裝（Wrap）原始錯誤，從而實現錯誤鏈（Error Wrapping）和上下文添加。

## 格式化佔位符的位置對應

`%s` 是佔位符，按**位置順序**對應後面的參數，跟變數名稱無關：

```go
// 第1個 %s 對應第1個參數（err）
fmt.Errorf("查詢失敗: %s", err)

// 第1個 %s 對應第1個參數（filename）
fmt.Errorf("無法開啟檔案 %s", filename)
```

多個參數時，依序對應：

```go
fmt.Errorf("使用者 %s 在 %s 操作失敗: %w", username, action, err)
//           第1個%s     第2個%s       第1個%w
//           ↓           ↓             ↓
//         username     action         err
``` 