# []rune — Go 的 Unicode 碼點切片

## 什麼是 []rune？

在 Go 語言中，`[]rune` 是一個將字串（`string`）轉換為 **UTF-32/Unicode 碼點（Code Point）切片**的類型，專門用於正確處理多位元組字元（如中文字符、表情符號）。

由於 Go 字串預設以 **UTF-8 位元組**儲存，直接操作會導致亂碼，使用 `[]rune` 可將字串按「**字元**」分割，而非「**位元組**」。

## 為什麼需要 []rune？

```go
s := "哈囉世界"

// 錯誤：用 byte 操作，中文字佔 3 bytes，會切到亂碼
fmt.Println(s[:2]) // 輸出亂碼（只取了 2 個 byte）

// 正確：用 rune 操作，每個中文字是 1 個 rune
runes := []rune(s)
fmt.Println(string(runes[:2])) // 輸出 "哈囉"
```

## 對照表

| 類型 | 單位 | 英文字母 | 中文字 | 表情符號 |
|------|------|----------|--------|----------|
| `byte` (`uint8`) | 位元組 | 1 byte | 3 bytes | 4 bytes |
| `rune` (`int32`) | 碼點 | 1 rune | 1 rune | 1 rune |

## 實際應用：電話號碼遮蔽

```go
// MaskPhone 遮蔽電話號碼中間部分
// 0912345678 → 0912***678
func MaskPhone(phone *string) *string {
    if phone == nil {
        return nil
    }

    runes := []rune(*phone)
    if len(runes) <= 6 {
        return phone
    }

    // 用 rune 切割確保不會切到半個字元
    masked := string(runes[:4]) + "***" + string(runes[len(runes)-3:])
    return &masked
}
```

> 這個例子中電話號碼都是 ASCII 數字，用 `byte` 也可以。但用 `[]rune` 是更安全的習慣，萬一遇到含有非 ASCII 字元的輸入（如國際電話格式）也不會出錯。

## 常用操作

```go
s := "Hello 世界"

// 取得字元數量（不是 byte 數量）
len([]rune(s))  // 8（H-e-l-l-o- -世-界）
len(s)          // 12（ASCII 各 1 byte + 中文各 3 bytes）

// 遍歷每個字元（for range 自動用 rune）
for i, r := range s {
    fmt.Printf("index=%d, rune=%c\n", i, r)
}

// 字串反轉（用 rune 才正確）
runes := []rune(s)
for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
    runes[i], runes[j] = runes[j], runes[i]
}
reversed := string(runes) // "界世 olleH"
```

## 重點整理

- `string` → UTF-8 位元組序列
- `[]byte` → 逐 byte 操作，適合純 ASCII
- `[]rune` → 逐字元操作，適合含多位元組字元的字串
- `for range` 遍歷字串時，Go 自動以 rune 為單位迭代
