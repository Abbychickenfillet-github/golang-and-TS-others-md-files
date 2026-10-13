---
title: "XMLHttpRequest-CORS-explanation"
---

# XMLHttpRequest 和 CORS 解釋

## XMLHttpRequest 是什麼？

**XMLHttpRequest (XHR)** 是瀏覽器內建的 JavaScript API，用於在不重新載入頁面的情況下向伺服器發送 HTTP 請求。

### 簡單比喻
想像你在餐廳點餐：
- **傳統方式**：每次點餐都要離開座位，走到櫃檯，等餐做好再回座位（頁面整個重新載入）
- **XMLHttpRequest**：服務生幫你跑腿，你可以繼續做其他事情（背景請求，頁面不用重新載入）

### 程式碼範例
```javascript
// 原始 XMLHttpRequest 寫法
const xhr = new XMLHttpRequest()
xhr.open('GET', 'http://localhost:8003/api/v1/orders/')
xhr.onload = function() {
  console.log(xhr.response)
}
xhr.send()

// 現代寫法 - fetch（底層仍使用 XHR 概念）
fetch('http://localhost:8003/api/v1/orders/')
  .then(response => response.json())
  .then(data => console.log(data))

// 更現代的寫法 - TanStack Query（本專案使用）
const { data } = useQuery({
  queryFn: () => OrdersService.getOrders({ limit: 10 })
})
```

### 為什麼錯誤訊息會顯示 XMLHttpRequest？
瀏覽器的控制台錯誤訊息來自最底層的 API。即使你使用 `fetch` 或 TanStack Query，瀏覽器錯誤訊息仍會顯示 `XMLHttpRequest`，因為這是瀏覽器網路請求的底層機制。

---

### 現在還有人在用嗎？XHR、fetch、axios 的關係

有，但新寫的程式通常改用 `fetch`。XHR 在 MDN 上沒有被標示為過時，仍然是瀏覽器內建 API，主要出現在舊專案和函式庫底層。

| 項目 | XMLHttpRequest（XHR） | fetch | axios |
|------|----------------------|-------|-------|
| 是什麼 | 瀏覽器內建的 Web API，用來向伺服器要資料而不重新整理整頁 | 較新的瀏覽器內建 Web API | 第三方函式庫，不是瀏覽器內建 |
| 底層 | 它自己 | 它自己 | 在瀏覽器裡預設用 XHR 發請求，在 Node.js 用 http（官方 README：Make XMLHttpRequests from the browser） |
| 寫法 | 事件與回呼（`onload`、`onerror`） | Promise（可搭配 `async/await`） | Promise |
| 上傳進度 | 有 `upload` 物件可監聽 | 本次未查證 | 提供 `onUploadProgress` 設定 |
| 能不能用在 Worker | 可以，Service Worker 除外（MDN） | 本次未查證 | 本次未查證 |

名稱裡的 XML 是歷史包袱：MDN 寫「Despite its name, XMLHttpRequest can be used to retrieve any type of data, not just XML」，取回 JSON、文字、檔案都可以。

它在 Event Loop 裡的位置：XHR 與 `fetch` 一樣是 Web API，請求由瀏覽器在 JS 引擎之外送出與等待，回應到了才把 `onload` 之類的 callback 放進巨任務佇列，見 [[事件循環-Event-Loop-微任務與巨任務]] 的 Web APIs 一節；`fetch` 與 axios 的差異與錯誤處理見 [[Axios-vs-Fetch-回應解析與錯誤處理]]。

「現在有多少網站還在用 XHR」這類使用比例，本次沒有查到可靠的官方統計，不下結論。

## CORS 是什麼？

**CORS (Cross-Origin Resource Sharing)** = 跨來源資源共享

### 什麼是「跨來源」？
當請求的**來源**和**目標**不同時，就是「跨來源」：

| 來源 | 目標 | 是否跨來源？ |
|------|------|-------------|
| `http://localhost:5003` | `http://localhost:5003/api` | ❌ 同源 |
| `http://localhost:5003` | `http://localhost:8003/api` | ✅ 跨來源（port 不同） |
| `http://localhost:5003` | `https://localhost:5003/api` | ✅ 跨來源（協定不同） |
| `http://localhost:5003` | `http://example.com/api` | ✅ 跨來源（域名不同） |

### 為什麼需要 CORS？
這是瀏覽器的**安全機制**，防止惡意網站偷取其他網站的資料。

假設你登入了銀行網站 `bank.com`，你的瀏覽器會記住登入狀態（cookie）。
如果沒有 CORS 保護，惡意網站 `evil.com` 可以用你的瀏覽器發請求到 `bank.com`，偷取你的銀行資料。

### CORS 如何運作？

1. **瀏覽器**發送請求時，會先發送「預檢請求」(preflight) 詢問伺服器
2. **伺服器**回傳 CORS headers，告訴瀏覽器「我允許這個來源存取」
3. **瀏覽器**檢查 headers，如果允許就繼續，否則就擋掉

```
瀏覽器 (localhost:5003)           伺服器 (localhost:8003)
    │                                    │
    │  1. OPTIONS /api/orders            │
    │  (預檢請求)                        │
    │ ─────────────────────────────────> │
    │                                    │
    │  2. Access-Control-Allow-Origin:   │
    │     http://localhost:5003          │
    │ <───────────────────────────────── │
    │                                    │
    │  3. GET /api/orders                │
    │  (實際請求)                        │
    │ ─────────────────────────────────> │
    │                                    │
    │  4. { data: [...] }                │
    │ <───────────────────────────────── │
```

---

## 為什麼會出現 CORS 錯誤？

### 錯誤訊息
```
Access to XMLHttpRequest at 'http://localhost:8003/api/v1/orders/'
from origin 'http://localhost:5003' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 可能原因

1. **後端沒有設定 CORS**
   - 伺服器沒有回傳 `Access-Control-Allow-Origin` header

2. **後端 CORS 設定不包含你的來源**
   - 例如只允許 `localhost:5173`，但你用的是 `localhost:5003`

3. **後端在回傳 CORS headers 之前就崩潰了**
   - 伺服器發生錯誤（500），在 CORS middleware 執行之前就終止了

4. **瀏覽器快取了失敗的 CORS 預檢結果**
   - 之前的預檢請求失敗了，瀏覽器記住了

---

## 本專案的 CORS 設定

### 後端設定位置
`backend-go/cmd/server/main.go`:

```go
func setupCORS(router *gin.Engine) {
    corsOrigins := getEnv("CORS_ORIGINS", "http://localhost:5003,http://localhost:5173,http://localhost:5174")

    config := cors.Config{
        AllowOrigins:     parseCORSOrigins(corsOrigins),
        AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
        AllowCredentials: true,
    }

    router.Use(cors.New(config))
}
```

### 環境變數
`backend-go/.env.development`:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:5003,http://localhost:5173,http://localhost:5174
```

---

## 如何解決 CORS 錯誤？

### 1. 確認後端有設定正確的來源
```bash
# 檢查環境變數
docker exec template-backend-go-1 env | grep CORS
```

### 2. 測試 CORS 預檢請求
```bash
curl -I -X OPTIONS \
  -H "Origin: http://localhost:5003" \
  -H "Access-Control-Request-Method: GET" \
  "http://localhost:8003/api/v1/orders/"
```

應該看到：
```
Access-Control-Allow-Origin: http://localhost:5003
```

### 3. 清除瀏覽器快取
- 開啟開發者工具 (F12)
- 右鍵點擊重新整理按鈕
- 選擇「清除快取並強制重新載入」

### 4. 檢查後端是否崩潰
```bash
docker logs template-backend-go-1 --tail 50
```

---

## 為什麼只有 /members 頁面有 CORS 錯誤？

在 `members.tsx` 第 239-248 行：
```typescript
// 付款統計資料（僅 IT/BOSS 可見）
const { data: paidOrdersData } = useQuery({
  queryFn: () => OrdersService.getOrders({
    payment_status: "PAID",
    limit: 10000,  // ← 獲取 10000 筆訂單
  }),
  enabled: canViewPaymentStats,  // ← 只有 IT/BOSS 會執行
})
```

這個頁面會呼叫 `/api/v1/orders/` API 來顯示付款統計。如果：
- 你是 IT/BOSS 角色
- Orders API 出現問題（例如查詢 10000 筆太慢導致超時）
- 後端在回傳 CORS headers 之前就失敗了

就會看到 CORS 錯誤。

---

*建立日期：2026-01-21*

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|------|------|-----------|
| XHR 的定義；名稱雖有 XML 但可取回任何資料；可用於 Web Workers（Service Workers 除外）；有 `upload` 屬性 | https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest | MDN，2026-10-13 查證；該頁沒有把 XHR 標為過時 |
| axios 在瀏覽器發 XMLHttpRequests、在 Node.js 發 http 請求；`onUploadProgress` | https://github.com/axios/axios | axios README，2026-10-13 查證 |

> 查證方式：用 WebFetch 擷取上列頁面並比對原文；擷取工具有摘要成分，引文請以原頁為準。
