# Docker Compose Watch vs npm run dev 選擇指南

> 建立日期：2026-01-21

## 問題

開發 `official_website` 時，以下兩種方式哪個比較好？

### 方案 A
```bash
docker compose watch backend-go
npm run dev  # 在 official_website 資料夾
```

### 方案 B
```bash
docker compose up official_website --no-deps
docker compose watch backend-go
```

---

## 建議：方案 A 較佳

| 比較項目 | 方案 A (npm run dev) | 方案 B (Docker) |
|---------|---------------------|-----------------|
| **熱更新速度** | 即時（毫秒級） | 需要 rebuild（秒級） |
| **錯誤提示** | 完整的 Vite 錯誤訊息 | 需要看 container logs |
| **Source Maps** | 有，方便 debug | 無（生產構建） |
| **資源佔用** | 較低 | 多一個 container |
| **Port** | localhost:5174 | localhost:3004 |

---

## 原因說明

### 為什麼 `docker compose watch official_website` 會啟動 backend？

在 `docker-compose.yml` 中，`official_website` 設定了依賴：

```yaml
official_website:
  depends_on:
    backend:
      condition: service_started
```

這導致 watch 會自動啟動 Python backend（port 8003），與 backend-go 衝突。

### 解法

1. 使用 `--no-deps` 跳過依賴（`up` 和 `watch` 都支援）
   ```bash
   docker compose watch official_website --no-deps
   docker compose up official_website --no-deps
   ```
2. 或直接用 `npm run dev` 本地開發（推薦）

---

## 實際操作

```bash
# Terminal 1: 啟動 Go 後端
docker compose watch backend-go

# Terminal 2: 啟動前台網站（本地開發）
cd official_website
npm run dev
# 訪問 http://localhost:5174
```

---

## 何時用 Docker？

- 測試生產構建效果
- 模擬正式環境
- CI/CD 流程

## 何時用 npm run dev？

- 日常開發（推薦）
- 需要快速迭代
- 需要完整 debug 資訊
