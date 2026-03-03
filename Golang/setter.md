# Go Setter 模式 - 避免破壞現有建構

## 什麼是 Setter 模式？

Setter 模式是透過**方法來設置物件的依賴或屬性**，而不是在建構函式中強制要求。這讓我們能在不修改建構函式的情況下，新增或更新物件的功能。

## 為什麼要用 Setter 模式？

假設你已經有 100 個地方呼叫了 `NewNotificationService()`，現在要新增一個 `CompanyRepository` 依賴：

- **直接修改建構函式**：會破壞所有 100 個呼叫位置，編譯失敗
- **使用 Setter 模式**：只需在需要的地方呼叫 setter，其他位置保持不變

## 實例對比

### 原本的建構函式
```go
type notificationService struct {
    emailService EmailService
    eventRepo    EventRepository
    companyRepo  CompanyRepository  // 新增依賴
}

func NewNotificationService(emailService EmailService, eventRepo EventRepository) *notificationService {
    return &notificationService{
        emailService: emailService,
        eventRepo:    eventRepo,
    }
}
```

### 使用 Setter 模式新增依賴
```go
// 新增 setter 方法
func (s *notificationService) SetCompanyRepo(repo CompanyRepository) *notificationService {
    s.companyRepo = repo
    return s  // 支援鏈式呼叫
}

// 使用方式
service := NewNotificationService(emailSvc, eventRepo)
service.SetCompanyRepo(companyRepo)  // 只在需要時設置

// 或鏈式呼叫
service := NewNotificationService(emailSvc, eventRepo).
    SetCompanyRepo(companyRepo)
```

### 現有呼叫保持不變
```go
// 舊的呼叫方式仍然有效，不需修改
service := NewNotificationService(emailSvc, eventRepo)
```

## 何時使用 Setter 模式？

| 情況 | 建議 |
|------|------|
| 新增**可選**的依賴 | 使用 Setter |
| 新增**必須**的依賴（新功能需要） | 修改建構函式 |
| 已有大量既存呼叫 | 優先考慮 Setter |
| 小型內部服務 | 可直接修改建構函式 |

## 注意事項

1. **檢查 nil**：使用 companyRepo 前要確認不是 nil
2. **Setter 順序**：某些依賴可能有順序要求，需在 method 中驗證
3. **Thread-safe**：如果涉及並行存取，考慮使用 mutex
