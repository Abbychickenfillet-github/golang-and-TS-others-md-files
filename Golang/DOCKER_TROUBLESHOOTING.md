# Docker 開發環境問題排解指南

> 建立日期: 2026-01-20
> 最後更新: 2026-01-20

---

## 目錄

1. [端口配置說明](#1-端口配置說明)
2. [Docker Compose 狀態說明](#2-docker-compose-狀態說明)
3. [常見問題與解決方案](#3-常見問題與解決方案)
4. [已修復的問題記錄](#4-已修復的問題記錄)

---

## 1. 端口配置說明

### 什麼是內部端口 vs 外部端口？

```
┌─────────────────────────────────────────────────────────┐
│                    你的電腦 (Host)                       │
│                                                          │
│   瀏覽器訪問 → localhost:8003                            │
│                    │                                     │
│                    ▼                                     │
│   ┌──────────────────────────────────────┐              │
│   │         Docker Container              │              │
│   │                                       │              │
│   │   外部端口 8003  ──映射──▶  內部端口 8080  │              │
│   │   (Host Port)           (Container Port)│              │
│   │                                       │              │
│   │   Go 服務監聽 0.0.0.0:8080            │              │
│   └──────────────────────────────────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 端口對照表

| 服務 | 外部端口 (你訪問的) | 內部端口 (容器內的) | 說明 |
|------|---------------------|---------------------|------|
| **backend-go** | `8003` | `8080` | Go 後端 API |
| **backend (Python)** | `8004` | `8000` | Python 後端 API |
| **frontend (Docker)** | `5005` | `80` | 前端 (Docker 建置版) |
| **frontend (本地)** | `5003` | - | 前端 (npm run dev) |
| **redis** | `6382` | `6382` | Redis 快取 |
| **official_website** | `3004` | `80` | 官網 |

### 需要 ngrok 嗎？

| 情境 | 需要 ngrok？ | 說明 |
|------|-------------|------|
| 本地開發、前後端互連 | **不需要** | `localhost:8003` 直接可用 |
| ECPay 金流回調 | **需要** | ECPay 需要公開 URL 發送通知 |
| 外部服務 Webhook | **需要** | 任何外部服務需要回調你的本地服務 |
| 手機測試本地服務 | **需要** | 手機無法訪問電腦的 localhost |

### ngrok 使用方式

```bash
# 將本地 8003 暴露給外網
ngrok http 8003

# 會得到類似 https://abc123.ngrok.io 的 URL
# 然後設定 ECPay 回調 URL 為這個地址
```

---

## 2. Docker Compose 狀態說明

### 容器狀態流程

```
Created → Starting → Running (health: starting) → Running (healthy)
                                              ↘ Running (unhealthy)
```

### 狀態對照表

| 狀態 | 含義 | 是否正常 |
|------|------|----------|
| `Created` | 容器已建立但未啟動 | ❌ 需要手動啟動 |
| `Starting` | 容器正在啟動 | ⏳ 等待 |
| `Up X seconds (health: starting)` | 容器已啟動，健康檢查進行中 | ⏳ 等待 |
| `Up X minutes (healthy)` | 容器運行正常 | ✅ 正常 |
| `Up X minutes (unhealthy)` | 容器在運行但健康檢查失敗 | ⚠️ 需檢查 |
| `Exited (0)` | 容器正常結束 | ✅ 正常（一次性任務）|
| `Exited (1)` | 容器異常結束 | ❌ 查看 logs |

### 常用命令

```bash
# 查看所有容器狀態
docker ps -a

# 查看容器日誌（最後 50 行）
docker logs template-backend-go-1 --tail 50

# 即時查看日誌
docker logs template-backend-go-1 -f

# 強制重建並啟動
docker compose up backend-go -d --build

# 停止所有服務
docker compose down

# 啟動特定服務
docker compose up backend-go redis -d
```

---

## 3. 常見問題與解決方案

### 問題 1: ERR_NETWORK / 無法連接後端

**症狀：**
```
Logout API error: AxiosError: Network Error
code: "ERR_NETWORK"
```

**原因：** 後端服務沒有啟動

**解決方案：**
```bash
# 1. 檢查容器狀態
docker ps -a

# 2. 如果是 Created 狀態，手動啟動
docker compose up backend-go -d

# 3. 如果一直失敗，查看日誌
docker logs template-backend-go-1
```

---

### 問題 2: docker compose watch 服務沒有啟動

**症狀：** 執行 `docker compose watch` 後，服務顯示 `Created` 但沒有變成 `Running`

**原因：** `docker compose watch` 可能在等待某些服務或有錯誤

**解決方案：**
```bash
# 方法 1: 先手動啟動服務，再用 watch
docker compose up -d
docker compose watch

# 方法 2: 直接用 up 並 build
docker compose up backend-go -d --build
```

---

### 問題 3: AutoMigrate 失敗 (外鍵約束)

**症狀：**
```
Error 1832 (HY000): Cannot change column 'role_id': used in a foreign key constraint 'fk_user_role'
```

**原因：** GORM 嘗試修改有外鍵約束的欄位

**解決方案：**

在 `docker-compose.yml` 的 `backend-go` 環境變數中加入：
```yaml
environment:
  - AUTO_MIGRATE_ENABLED=false
```

---

### 問題 4: 型別不匹配 (time.Time vs int64)

**症狀：**
```
sql: Scan error on column index 9, name "last_login": converting driver.Value type time.Time to a int64
```

**原因：** Go model 欄位類型與資料庫不一致

**解決方案：**
修改 `internal/models/user.go`：
```go
// 錯誤
LastLogin *int64 `gorm:"column:last_login"`

// 正確
LastLogin *time.Time `gorm:"column:last_login"`
```

---

### 問題 5: Unknown column 'deleted_at'

**症狀：**
```
Error 1054 (42S22): Unknown column 'role.deleted_at' in 'where clause'
```

**原因：** Model 使用了包含 `DeletedAt` 的 `Base`，但資料庫沒有該欄位

**解決方案：**
1. 使用 `BaseWithoutSoftDelete` 替代 `Base`
2. 或在資料庫加入 `deleted_at` 欄位

---

### 問題 6: 容器顯示 unhealthy

**症狀：** `docker ps` 顯示 `(unhealthy)`

**原因：** 健康檢查端點返回非 2xx 狀態碼

**檢查方式：**
```bash
# 查看健康檢查設定
cat docker-compose.yml | grep -A5 healthcheck

# 手動測試健康檢查端點
curl http://localhost:8003/health
```

**注意：** `unhealthy` 不代表服務無法使用，只是健康檢查失敗。如果主要 API 正常，可以暫時忽略。

---

## 4. 已修復的問題記錄

### 2026-01-20 修復記錄

| 問題 | 檔案 | 修復內容 |
|------|------|----------|
| `LastLogin` 類型錯誤 | `internal/models/user.go` | `*int64` → `*time.Time` |
| `LastLogin` 賦值錯誤 | `internal/service/auth_service.go` | `time.Now().UnixMilli()` → `time.Now()` |
| `Role` 軟刪除錯誤 | `internal/models/role.go` | `Base` → `BaseWithoutSoftDelete` |
| AutoMigrate 失敗 | `docker-compose.yml` | 加入 `AUTO_MIGRATE_ENABLED=false` |

### 待處理

- [ ] 修復 `/health` 端點（目前返回 404）
- [ ] 處理 `fk_user_role` 外鍵約束問題（目前暫時禁用 AutoMigrate）

---

## 快速檢查清單

啟動開發環境前的檢查：

```bash
# 1. 確認 Docker 運行中
docker info

# 2. 啟動服務
docker compose up backend-go redis -d

# 3. 等待 10 秒，檢查狀態
docker ps

# 4. 測試後端
curl http://localhost:8003/

# 5. 啟動前端
cd frontend && npm run dev

# 6. 訪問 http://localhost:5003
```


● 為什麼你不用管內部端口 8080

  ┌────────────────────────────────────────────────────────────────┐                                                                    │  你的電腦                                                       │
  │                                                                 │
  │  前端程式碼:                                                     │
  │  VITE_API_URL=http://localhost:8003  ← 你只設定這個              │
  │                     │                                           │
  │                     ▼                                           │
  │            localhost:8003 (外部端口)                             │
  │                     │                                           │
  │  ═══════════════════╪═══════════════════════════════════════    │
  │                     │   Docker 自動處理映射                      │
  │  ═══════════════════╪═══════════════════════════════════════    │
  │                     ▼                                           │
  │  ┌─────────────────────────────────┐                           │
  │  │  Docker Container               │                           │
  │  │                                 │                           │
  │  │  Go 程式監聽 :8080 (內部端口)    │  ← 這是容器內部的事        │
  │  │                                 │                           │
  │  └─────────────────────────────────┘                           │
  └────────────────────────────────────────────────────────────────┘

  簡單來說
  ┌─────────┬─────────────┬─────────────────────────────────────────────┐
  │ 誰負責  │    端口     │                 你要做什麼                  │
  ├─────────┼─────────────┼─────────────────────────────────────────────┤
  │ 你      │ 8003 (外部) │ 前端設定 VITE_API_URL=http://localhost:8003 │
  ├─────────┼─────────────┼─────────────────────────────────────────────┤
  │ Docker  │ 8003 → 8080 │ 自動轉發，不用管                            │
  ├─────────┼─────────────┼─────────────────────────────────────────────┤
  │ Go 程式 │ 8080 (內部) │ 開發者已經設定好，不用改                    │
  └─────────┴─────────────┴─────────────────────────────────────────────┘
  什麼時候才需要管內部端口？

  1. 你要改 Go 程式碼 - 修改監聽端口（99% 不需要）
  2. 你要改 Dockerfile - 修改 EXPOSE 設定（99% 不需要）
  3. 端口衝突 - 容器內有多個服務用同一端口（很少見）

  類比

  就像寄信：
  - 外部端口 8003 = 你家地址（你告訴別人的）
  - 內部端口 8080 = 你家信箱在幾樓（郵差自己知道，你不用管）

  ---
  結論：你只要記住 localhost:8003 是 Go 後端，就夠了。
    │ 軟刪除      │ DeletedAt 欄位，刪除只是標記時間  │