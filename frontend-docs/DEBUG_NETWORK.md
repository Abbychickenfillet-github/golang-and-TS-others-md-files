# Network 請求排查指南

## 🔍 如何查看 Network 請求

### 1. 打開 Chrome DevTools
- 按 `F12` 或 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- 點擊 **Network** 標籤

### 2. 查看請求列表
- **越下面的請求 = 越新的請求**（時間軸從上到下）
- 紅色 ❌ = 請求失敗
- 黃色 ⚠️ = 警告（通常是 CORS 或快取問題）
- 綠色 ✓ = 請求成功

### 3. 查看失敗的請求詳情

點擊失敗的請求（紅色 ❌），然後查看：

#### **Headers 標籤**
- **Request URL**: 檢查 URL 是否正確
- **Request Method**: GET/POST/PATCH/DELETE
- **Status Code**:
  - `200` = 成功
  - `401` = 認證失敗（token 過期或無效）
  - `403` = 權限不足
  - `404` = API 路徑不存在
  - `500` = 後端伺服器錯誤
  - `(failed)` = 網路連線問題

#### **Response 標籤**
- 查看後端返回的錯誤訊息
- 常見錯誤：
  ```json
  {
    "detail": "Token expired"  // Token 過期
  }
  ```

#### **Timing 標籤**
- **Queued**: 請求在瀏覽器佇列中等待的時間
- **Stalled**: 請求被阻塞的時間
- **Waiting (TTFB)**: 等待後端回應的時間
- **Content Download**: 下載回應內容的時間

## 🐛 常見問題排查

### 問題 1: 所有請求都失敗（紅色 ❌）

**可能原因：**
1. **後端沒有運行**
   - 檢查 `http://localhost:8003` 是否可以訪問
   - 在瀏覽器直接訪問 `http://localhost:8003/api/v1/companies/`

2. **CORS 問題**
   - 查看 Console 是否有 CORS 錯誤
   - 檢查後端的 CORS 設定

3. **Token 過期**
   - 查看失敗請求的 Response，看是否有 "Token expired"
   - 重新登入獲取新 token

### 問題 2: 請求卡在 Queue 很久（22 分鐘）

**可能原因：**
1. **瀏覽器連線數限制**
   - Chrome 對同一個 domain 最多 6 個並發連線
   - 如果前面有請求卡住，後面的請求要排隊

2. **前面的請求沒有完成**
   - 檢查是否有請求一直處於 "pending" 狀態
   - 取消或重新整理頁面

**解決方法：**
- 關閉所有瀏覽器分頁
- 重新開啟一個新分頁
- 清除瀏覽器快取（`Ctrl+Shift+Delete`）

### 問題 3: 401 Unauthorized

**可能原因：**
1. Token 過期
2. Token 格式錯誤
3. 後端驗證邏輯有問題

**解決方法：**
1. 登出並重新登入
2. 檢查 localStorage 中的 token
3. 查看後端 logs 確認驗證邏輯

### 問題 4: 404 Not Found

**可能原因：**
1. API 路徑錯誤
2. 後端路由沒有註冊

**解決方法：**
1. 檢查 API 路徑是否正確
2. 查看後端路由註冊

## 🔧 快速診斷步驟

### Step 1: 檢查後端是否運行
```bash
# 在終端執行
curl http://localhost:8003/api/v1/companies/
```

### Step 2: 檢查 Token 是否有效
在 Console 執行：
```javascript
// 查看當前 token
localStorage.getItem('token')

// 測試 API 請求
fetch('http://localhost:8003/api/v1/companies/?skip=0&limit=10', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(console.log)
```

### Step 3: 檢查 Network 請求
1. 打開 Network 標籤
2. 重新整理頁面（`F5`）
3. 查看第一個失敗的請求
4. 點擊查看 Status Code 和 Response

## 📊 你的具體問題

從你提供的請求來看：
```javascript
fetch("http://localhost:8003/api/v1/companies/?skip=0&limit=1000&include_deleted=false", {
  "headers": {
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
})
```

**檢查點：**
1. ✅ URL 看起來正確
2. ✅ 有 Authorization header
3. ❓ Token 是否過期？（檢查 Response）
4. ❓ 後端是否運行？（檢查 Status Code）

**下一步：**
1. 點擊這個請求，查看 **Status Code**
2. 查看 **Response 標籤**，看錯誤訊息
3. 如果 Status 是 401，重新登入
4. 如果 Status 是 500，查看後端 logs
