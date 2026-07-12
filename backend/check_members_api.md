# 會員管理頁面問題診斷

## 問題
會員管理頁面沒有顯示數據

## 可能的原因

### 1. **權限問題** ⚠️ 最可能
- 後端 API `/api/v1/members/` 需要**超級管理員權限**
- 當前登錄用戶可能不是超級管理員
- 檢查方法：打開瀏覽器開發者工具 → Network 標籤 → 查看 `/api/v1/members/` 請求
  - 如果返回 `403 Forbidden`，說明權限不足

### 2. **API 調用失敗**
- 檢查瀏覽器控制台是否有錯誤信息
- 檢查 Network 標籤中的 API 請求狀態

### 3. **數據過濾問題**
- 前端有多個過濾條件可能導致數據被過濾掉
- 檢查 URL 參數中的過濾條件

## 診斷步驟

### 步驟 1: 檢查瀏覽器控制台
1. 打開會員管理頁面
2. 按 F12 打開開發者工具
3. 查看 Console 標籤是否有錯誤
4. 查看 Network 標籤，找到 `/api/v1/members/` 請求
5. 檢查：
   - 請求狀態碼（200/403/500等）
   - 響應內容

### 步驟 2: 檢查用戶權限
在瀏覽器控制台執行：
```javascript
// 檢查當前用戶信息
fetch('/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(r => r.json())
.then(data => console.log('當前用戶:', data))
```

### 步驟 3: 直接測試 API
在瀏覽器控制台執行：
```javascript
// 測試會員列表 API
fetch('/api/v1/members/?skip=0&limit=10', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(r => {
  console.log('狀態碼:', r.status)
  return r.json()
})
.then(data => console.log('會員數據:', data))
.catch(err => console.error('錯誤:', err))
```

## 解決方案

### 如果權限不足（403）：
1. 使用超級管理員賬號登錄
2. 或者修改後端 API 權限要求（不推薦）

### 如果 API 返回空數據：
1. 檢查資料庫是否有會員數據（已確認有16個會員）
2. 檢查過濾條件是否太嚴格

### 如果 API 調用失敗：
1. 檢查後端服務是否正常運行
2. 檢查網路連接
3. 檢查 CORS 設置
