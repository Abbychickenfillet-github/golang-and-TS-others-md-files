# Go Modules: Direct vs Indirect 依賴

## 什麼是 Direct 和 Indirect

在 `go.mod` 檔案中，依賴分成兩種：

| 類型 | 標記 | 說明 |
|------|------|------|
| **Direct** | 無標記 | 你的程式碼**直接 import** 的套件 |
| **Indirect** | `// indirect` | 被其他套件引用，你沒有直接用到 |

---

## 範例

```go
// go.mod
module myproject

require (
    github.com/gin-gonic/gin v1.11.0           // Direct - 你的程式碼有 import
    github.com/go-playground/validator v10.30.1 // indirect - gin 內部使用的
)
```

### 為什麼 validator 是 indirect？

```
你的程式碼
    ↓ import
github.com/gin-gonic/gin
    ↓ import（內部使用）
github.com/go-playground/validator   ← indirect
```

你沒有直接寫 `import "github.com/go-playground/validator"`，所以它是 indirect。

---

## 什麼時候 Indirect 變成 Direct？

當你在程式碼中**直接 import** 該套件時：

```go
// 你的 handler.go
import (
    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"  // 現在你直接用了！
)

func ValidateInput(input MyStruct) error {
    validate := validator.New()
    return validate.Struct(input)
}
```

執行 `go mod tidy` 後，go.mod 會自動更新：

```go
require (
    github.com/gin-gonic/gin v1.11.0
    github.com/go-playground/validator/v10 v10.30.1  // indirect 標記消失了
)
```

---

## 常用指令

```bash
# 整理依賴（自動判斷 direct/indirect）
go mod tidy

# 查看依賴樹（看誰引用了誰）
go mod graph

# 查看為什麼需要某個套件
go mod why github.com/go-playground/validator/v10
```

---

## 簡單記法

- **Direct** = 你有寫 `import "xxx"` 的套件
- **Indirect** = 別人幫你引進來的（依賴的依賴）

就像買東西：
- Direct = 你親自買的
- Indirect = 贈品（跟著主商品一起來的）
