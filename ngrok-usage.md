# Tunnel 使用指南（ngrok + cloudflared）

本文件說明如何使用 ngrok / cloudflared 將本地服務暴露到公網，用於開發測試（如 ECPay 回調、手機測試 QR code）。

## 目前設定（2026-02-06）

| 服務 | Port | Tunnel | URL |
|------|------|--------|-----|
| backend-go | 8080 | cloudflared | `https://strength-incidence-organised-outdoor.trycloudflare.com` |
| official_website | 3000 | cloudflared | `https://deferred-electronics-donors-joel.trycloudflare.com` |

> ⚠️ 這些 URL 每次重啟 tunnel 都會變，需要更新以下檔案：
> - `futuresign.official_website/.env.development` → `VITE_API_BASE_URL`, `VITE_APP_URL`
> - `backend-go/docker-compose.dev.yml` → `CORS_ORIGINS`, `OFFICIAL_WEBSITE_URL`

**建議：都用 cloudflared**（ngrok 免費版有警告頁會擋 API 請求）

---

## 服務端口對照

| 服務 | Port | 說明 |
|------|------|------|
| backend-go | 8080 | Go 後端 API |
| frontend | 5173 | 後台管理系統 |
| official_website | 3000 | 前台消費者網站 |

---

## 安裝 ngrok

### Windows (Chocolatey)
```bash
choco install ngrok
```

### Windows (Scoop)
```bash
scoop install ngrok
```

### 手動安裝
從官網下載：https://ngrok.com/download

---

## 首次設定

1. 註冊 ngrok 帳號：https://dashboard.ngrok.com/signup
2. 取得 authtoken：https://dashboard.ngrok.com/get-started/your-authtoken
3. 設定 token：
```bash
ngrok config add-authtoken <你的token>
```

---

## 使用方式

### 方法 1：單一服務

開啟後端（最常用，用於 ECPay 回調測試）：
```bash
ngrok http 8080
```

執行後會顯示類似：
```
Forwarding    https://xxxx-xxx-xxx.ngrok-free.app -> http://localhost:8080
```

### 方法 2：多個終端開多個服務

```bash
# 終端 1 - 後端
ngrok http 8080

# 終端 2 - 前台官網
ngrok http 3000

# 終端 3 - 後台管理
ngrok http 5173
```

### 方法 3：使用 config 檔同時開啟多個服務（推薦）

1. 建立 `ngrok.yml` 檔案（放在專案根目錄或任意位置）：

```yaml
version: "2"
tunnels:
  backend:
    addr: 8080
    proto: http
  frontend:
    addr: 5173
    proto: http
  official:
    addr: 3000
    proto: http
```

2. 啟動所有 tunnel：
```bash
ngrok start --all --config ngrok.yml
```

---

## ECPay 回調設定

當使用 ngrok 測試 ECPay 金流時，需要更新環境變數：

```bash
# 取得 ngrok URL 後，更新 docker-compose.dev.yml 或 .env
ECPAY_RETURN_URL=https://<ngrok-url>/api/v1/payments/callback/ecpay
ECPAY_ORDER_RESULT_URL=https://<ngrok-url>/api/v1/payments/return/ecpay
```

---

## 免費版開多個 Tunnel

ngrok 免費版預設只能開 1 個 tunnel，但可以用 `--pooling-enabled` 解決：

### 方法 1：每個指令加 --pooling-enabled

```bash
# 終端 1 - 後端
ngrok http 8080 --pooling-enabled

# 終端 2 - 前台（新開終端）
ngrok http 3000 --pooling-enabled
```

### 方法 2：在 config 檔啟用 agent_pool

```yaml
# ngrok.yml
version: "2"
agent_pool:
  enabled: true
tunnels:
  backend:
    addr: 8080
    proto: http
  official:
    addr: 3000
    proto: http
  frontend:
    addr: 5173
    proto: http
```

```bash
ngrok start --all --config ngrok.yml
```

---

## 注意事項

1. **免費版限制**：
   - 每次啟動 URL 會變（需付費才有固定 subdomain）
   - 有連線數限制
   - 需用 `--pooling-enabled` 才能開多個 tunnel

2. **替代方案 - Cloudflare Tunnel**（免費且無 tunnel 數量限制）：
   ```bash
   # 安裝
   choco install cloudflared

   # 使用（不需註冊，可同時開多個）
   # 終端 1
   cloudflared tunnel --url http://localhost:8080

   # 終端 2
   cloudflared tunnel --url http://localhost:3000
   ```

3. **URL 會變動**：每次重啟 ngrok/cloudflared，URL 都會改變，記得更新相關設定。

---

## Cloudflare Tunnel（推薦）

比 ngrok 更簡單，免費版無 tunnel 數量限制。

### 安裝

```bash
# Windows (Chocolatey)
choco install cloudflared

# Windows (Scoop)
scoop install cloudflared
```

### 使用（不需註冊）

```bash
# 直接開 tunnel
cloudflared tunnel --url http://localhost:3000
```

會給你一個類似 `https://xxx-xxx-xxx.trycloudflare.com` 的 URL。

### 推薦：前後端都用 cloudflared

```bash
# 終端 1 - 後端
cloudflared tunnel --url http://localhost:8080

# 終端 2 - 前台
cloudflared tunnel --url http://localhost:3000
```

**為什麼不建議用 ngrok？**
- ngrok 免費版有「Visit Site」警告頁，會擋住 API 請求
- 需要額外設定 `ngrok-skip-browser-warning` header 和 CORS
- cloudflared 沒有這個問題，直接就能用

---

## 常用指令

```bash
# 查看 ngrok 狀態（開啟後）
# 瀏覽器訪問 http://127.0.0.1:4040

# 指定 region（亞洲較快）
ngrok http 8080 --region ap

# 查看設定檔位置
ngrok config check
```

---

## 相關文件

- [ECPay Tunnel 設定](../backend-go/docs/ECPAY_TUNNEL_SETUP.md)
- [Docker 開發環境](../backend-go/docker-compose.dev.yml)
