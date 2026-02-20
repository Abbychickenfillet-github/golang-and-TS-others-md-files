# fmt.Errorf — 建立格式化的 Error

## 基本用法

`fmt.Errorf` 就是「用 format string 的方式建立 error 物件」：

```go
// fmt.Sprintf → 回傳 string
msg := fmt.Sprintf("查詢 %s 失敗", "用戶")  // "查詢用戶失敗"

// fmt.Errorf → 回傳 error
err := fmt.Errorf("查詢 %s 失敗", "用戶")   // error: 查詢用戶失敗
```

## 搭配 %w（包裝錯誤鏈）

```go
originalErr := errors.New("連線逾時")

// %w 包裝 → 可用 errors.Is() 追溯
err := fmt.Errorf("查詢失敗: %w", originalErr)
errors.Is(err, originalErr) // true ✅

// %s 純字串 → 追溯不到
err := fmt.Errorf("查詢失敗: %s", originalErr)
errors.Is(err, originalErr) // false ❌
```

## 在專案中的常見用法

```go
// Repository 層 → 包裝 GORM 錯誤
func (r *repo) GetByID(id string) (*models.User, error) {
    var user models.User
    if err := r.db.First(&user, "id = ?", id).Error; err != nil {
        return nil, fmt.Errorf("取得用戶失敗: %w", err)
    }
    return &user, nil
}

// Service 層 → 包裝 Repository 錯誤
func (s *service) GetUser(id string) (*models.User, error) {
    user, err := s.repo.GetByID(id)
    if err != nil {
        return nil, fmt.Errorf("用戶服務查詢失敗: %w", err)
    }
    return user, nil
}
```

這樣錯誤鏈就是：`用戶服務查詢失敗: 取得用戶失敗: record not found`

## 對比其他建立 error 的方式

| 方式 | 用途 |
|------|------|
| `errors.New("訊息")` | 建立簡單的 error（固定文字） |
| `fmt.Errorf("格式 %s", val)` | 建立帶變數的 error |
| `fmt.Errorf("包裝: %w", err)` | 包裝既有 error（可追溯） |
