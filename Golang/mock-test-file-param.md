# Go 函式語法筆記：為什麼有三組括弧？

## 起因

在看 mock test 檔案時看到這行，覺得很困惑：

```go
func (m *MockEventServiceVendors) GetMemberCompanyIDs(memberID string) ([]string, error) {
    return nil, nil
}
```

為什麼有三組 `()` ？？？

---

## 三組括弧分別是什麼

```go
func (m *MockEventServiceVendors) GetMemberCompanyIDs(memberID string) ([]string, error) {
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━
//   ① receiver（方法屬於誰）           ② 輸入參數            ③ 回傳值
```

| # | 括弧 | 代表什麼 | 類比 |
|---|------|----------|------|
| ① | `(m *MockEventServiceVendors)` | 這個方法「屬於」哪個 struct，`m` 就像 Python 的 `self` | `class Foo:` 裡面的 `def bar(self)` |
| ② | `(memberID string)` | 函式的輸入參數 | 就是一般的參數 |
| ③ | `([]string, error)` | 函式的回傳值，可以回傳多個 | Python 的 `return ids, err` |

---

## Method vs Function 差在哪？

差在有沒有第一組括弧（receiver）：

```go
// Method — 綁在 struct 上，要透過實例呼叫
func (s *UserService) GetUser(id string) (*User, error) { ... }
// 呼叫方式：service.GetUser("123")

// Function — 獨立的，直接呼叫
func GetUser(id string) (*User, error) { ... }
// 呼叫方式：GetUser("123")
```

### 什麼時候用 method？什麼時候用 function？

**問自己一個問題：這個函式需不需要存取 struct 的欄位？**

```go
// 需要 → 用 method
// 因為要用 s.repo（struct 的欄位）
type UserService struct {
    repo UserRepository
}

func (s *UserService) GetUser(id string) (*User, error) {
    return s.repo.GetByID(id)  // 需要 s.repo
}

// 不需要 → 用 function
// 純邏輯判斷，不依賴任何外部狀態
func IsValidEmail(email string) bool {
    return strings.Contains(email, "@")
}
```

---

## `([]string, error)` 是什麼？Go 的錯誤處理

Go 沒有 try/catch，錯誤處理就是**把 error 當回傳值**。

```go
// 回傳值最後一個慣例放 error
func GetMemberCompanyIDs(memberID string) ([]string, error) {
    return nil, nil   // nil error = 沒有錯誤
}
```

呼叫端的標準寫法 — **每次都要檢查 err**：

```go
ids, err := service.GetMemberCompanyIDs(memberID)
if err != nil {
    // 有錯誤，處理它
    return err
}
// 沒錯誤，正常使用 ids
```

這是 Go 最核心的慣例，幾乎所有可能失敗的函式都回傳 `(結果, error)`。

---

## 回到原本的 mock 程式碼

```go
func (m *MockEventServiceVendors) GetMemberCompanyIDs(memberID string) ([]string, error) {
    return nil, nil
}
```

翻譯成白話：
- 這是 `MockEventServiceVendors` 這個 struct 的 method
- 輸入一個 `memberID`（字串）
- 回傳一個字串陣列和一個 error
- `return nil, nil` = 回傳空陣列、沒有錯誤（因為是 mock，不需要真的做事）
