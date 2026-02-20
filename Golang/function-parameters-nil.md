# Go 函數參數與 nil 值

## 範例：NewBoothService

```go
func NewBoothService(
    boothRepo repository.BoothRepository,                           // 必要
    eventRepo repository.EventRepository,                           // 必要
    eventBoothTypePricingRepo repository.EventBoothTypePricingRepository, // 可選（可為 nil）
    eventBoothTypeRepo repository.EventBoothTypeRepository,         // 可選（可為 nil）
) BoothService
```

## 為什麼可以傳 nil？

在 Go 中，**interface 類型的零值是 `nil`**。當你宣告一個 interface 參數時，可以傳入 `nil`。

```go
// 測試中傳入 nil
boothService := NewBoothService(boothRepo, eventRepo, nil, nil)

// 實際使用傳入真實值
boothService := NewBoothService(boothRepo, eventRepo, pricingRepo, boothTypeRepo)
```

## 傳入真實值會出錯嗎？

**不會！** 傳入真實值是正常使用方式。傳 `nil` 是為了：
- 測試時不需要建立所有依賴
- 某些功能不需要時可以省略

## 使用 nil 時的防呆處理

在使用可能為 nil 的參數前，**必須先檢查**：

```go
// booth_service.go 中的防呆處理
func (s *boothService) GetBoothPrice(booth *models.Booth) (float64, *string, *string, error) {
    // 檢查 repo 是否為 nil 才使用
    if s.eventBoothTypePricingRepo != nil {
        pricing, err := s.eventBoothTypePricingRepo.GetCurrentPricing(...)
        // ...
    }

    // 同樣檢查另一個 repo
    if s.eventBoothTypeRepo != nil {
        boothType, err := s.eventBoothTypeRepo.GetByID(...)
        // ...
    }
}
```

## 重點

| 情境 | 傳入值 | 結果 |
|------|--------|------|
| 測試 | `nil, nil` | 正常，跳過相關功能 |
| 生產環境 | 真實 repo | 正常，完整功能 |
| 忘記檢查 nil | `nil` | **panic!** 會崩潰 |

## Go 多返回值語法

```go
// Go 函數可以返回多個值
event, err := h.eventService.GetEvent(eventID, true, false)

// 必須處理所有返回值，或用 _ 忽略
event, _ := h.eventService.GetEvent(eventID, true, false)  // 忽略 err（不建議）
```
