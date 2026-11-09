# Postman 入門：用 next-one 的 API 練習

## 用途

- 不經過前端，直接對 API 送請求，看狀態碼與回應內容
- 前端失敗時，用來判斷是前端問題還是後端問題
- Postman 不是瀏覽器，**沒有 CORS 限制**：Postman 成功不代表瀏覽器不會被 CORS 擋

## 介面位置

| 區塊 | 位置 |
|---|---|
| 方法（GET / POST） | 請求列左側下拉 |
| 網址 | 請求列中間 |
| Send | 請求列右側 |
| Params / Headers / Body / Tests | 請求列下方分頁 |
| 回應 Body / Cookies / Headers | 下半部分頁 |
| 狀態碼、時間、大小 | 回應區右上角 |
| Environments | 右上角下拉 |

介面細節依 Postman 版本可能略有不同。

## 練習 1：GET，不需要 Body

1. 方法選 `GET`
2. 網址 `https://next-one-time-tracker.vercel.app/api/health`
3. Send
4. 預期：`200`，Body `{"status":"success"}`
5. `503` 代表資料庫連不上

## 練習 2：POST 登入，送 JSON

1. 方法選 `POST`
2. 網址 `https://next-one-time-tracker.vercel.app/api/auth/local/login`
3. Body 分頁 → 選 `raw` → 右側格式選 `JSON`
4. 內容：

```json
{
  "email": "nobody-test@example.com",
  "password": "not-a-real-password"
}
```

5. Send

| 回應 message | 代表 |
|---|---|
| 參數資料類型不正確 | 欄位沒過 zod 驗證（email 格式、password 8-30 字元） |
| 會員不存在 | 資料庫連得到，這個 email 沒註冊 |
| 密碼錯誤 | 帳號存在，密碼不對 |
| 系統暫時無法連線資料庫，請稍後再試 | 資料庫連不上 |

- 本專案錯誤也回 HTTP `200`，要看 Body 的 `status` 與 `message`
- 登入成功會設定 `ACCESS_TOKEN` cookie，回應區 `Cookies` 分頁可看

## 練習 3：登入後帶 cookie

1. 先完成登入成功的請求
2. Postman 會自動保存 cookie（同一網域）
3. 再 `GET /api/auth/check`，會自動帶上 cookie

## Body 類型：raw 不是 JSON

| 選項 | 意思 |
|---|---|
| none | 不送 Body（GET 用） |
| form-data / x-www-form-urlencoded | 表單格式（可上傳檔案） |
| raw | 把你打的文字原樣送出，右側下拉再選文字格式 |
| binary | 送單一檔案 |

- `raw` 只代表「原樣送出文字」，格式由右側下拉決定：Text、JavaScript、JSON、HTML、XML
- 選 `JSON` 後 Postman 自動加 `Content-Type: application/json`
- 本專案路由用 `request.json()` 讀取，Body 沒選 JSON 會解析失敗

## 環境變數：不用每次改網址

1. 右上角 Environments → 新增 `next-one`
2. 加變數 `baseUrl`

| 環境 | baseUrl |
|---|---|
| local | `http://localhost:3001` |
| production | `https://next-one-time-tracker.vercel.app` |

3. 請求網址寫 `{{baseUrl}}/api/health`
4. 右上角切換環境，同一個請求就能測本機或正式站

## Collection：整理請求

- 左側 Collections → 新增 `next-one-time-tracker`
- 把健康檢查、登入、註冊等請求存進去
- 可匯出成 JSON 備份

## Tests 分頁：自動檢查

```js
pm.test('狀態碼 200', () => pm.response.to.have.status(200))
pm.test('回傳 success', () => pm.expect(pm.response.json().status).to.eql('success'))
```

Send 後看回應區 `Test Results`。

## 註冊 API 欄位

`POST /api/users`

| 欄位 | 必填 | 限制 |
|---|---|---|
| email | 是 | email 格式 |
| password | 是 | 8-30 字元 |
| name | 否 | 最多 20 字元 |
| phone、birthdate、gender | 否 | 字串 |

- 對正式站送註冊會**真的新增會員**到資料庫
- 練習用 `localhost:3001` 或用之後可刪除的假 email

## 常見問題

| 現象 | 原因 |
|---|---|
| `Could not get response` | 網址打錯、伺服器沒開、本機沒跑 `npm run dev` |
| 回 `Unexpected token <` | Body 沒選 JSON，或打到前端頁面而不是 API |
| 狀態碼 200 但內容是 error | 本專案 `errorResponse` 預設回 200 |
| 瀏覽器失敗、Postman 成功 | 可能是 CORS 或 cookie 問題 |

未查證：Postman 介面選單名稱依記憶整理，新版本可能改名。
