# 因為組員設定在 3306 啟動 MySQL，無法啟動 air

**日期**: 2026-01-25

---

## 問題描述

執行 `air` 時出現錯誤，因為 MySQL 端口 3306 被占用。

---

## 重要澄清：air 不會讀取 docker-compose 文件！

### air 的運作方式

```
air → 執行 Go 程式 → Go 程式讀取 .env.development → 連接資料庫
```

**air 只做一件事**：監聽 Go 檔案變更，自動重新編譯和執行程式。

它**不會**讀取任何 docker-compose 文件！

### 為什麼看起來像是 air 在讀取 docker-compose？

實際發生的事情：

1. 你（或組員）之前執行了 `docker compose -f docker-compose.dev.yml up`
2. 這啟動了一個 MySQL 容器，占用了 **3306 端口**
3. 之後你執行 `air`
4. Go 程式嘗試連接資料庫時失敗（端口衝突或配置不符）

### 配置文件關係圖

```
docker-compose.dev.yml          backend-go/.env.development
        ↓                                ↓
  啟動 MySQL 容器               Go 程式讀取的配置
  (localhost:3306)              (hnd1.clusters.zeabur.com:32195)
        ↓                                ↓
     本地 MySQL                     遠端 Zeabur MySQL
```

**這兩個完全不相干！**

- `docker-compose.dev.yml` → 啟動**本地** MySQL 容器
- `.env.development` → 連接**遠端** Zeabur 資料庫

---

## 解決方案

### 方案 1：不要使用 docker-compose.dev.yml（推薦）

直接用 `air` 連接遠端 Zeabur 資料庫：

```powershell
cd backend-go
air
```

確認 `.env.development` 指向遠端資料庫：
```
MYSQL_HOST=hnd1.clusters.zeabur.com
MYSQL_PORT=32195
```

### 方案 2：如果要使用本地 MySQL

修改 `docker-compose.dev.yml` 的端口（避免與其他服務衝突）：

```yaml
mysql:
  ports:
    - "3307:3306"  # 改成 3307
```

然後修改 `.env.development`：
```
MYSQL_HOST=localhost
MYSQL_PORT=3307
```

---

## Docker Compose 文件說明

### 專案中的 docker-compose 文件

| 文件 | 用途 | 是否需要保留 |
|------|------|-------------|
| `docker-compose.yml` | 主配置（Python 後端為主） | ✅ 保留 |
| `docker-compose.override.yml` | 自動覆蓋主配置（本地開發） | ⚠️ 可選 |
| `docker-compose.dev.yml` | Go 後端開發專用（含本地 MySQL） | ⚠️ 可選 |
| `docker-compose.local.yml` | Python 後端本地開發 | ⚠️ 可選 |
| `docker-compose.personal.yml` | 個人開發配置 | ⚠️ 可選 |
| `docker-compose.production.yml` | 生產環境部署 | ✅ 保留 |
| `docker-compose.staging.yml` | 測試環境部署 | ✅ 保留 |

### 各文件詳細說明

#### 1. `docker-compose.yml`（主配置）
- **用途**：包含所有服務的定義
- **服務**：redis, backend (Python), backend-go, frontend, official_website, nginx-proxy-manager
- **特點**：使用 `docker compose watch` 支援熱更新
- **保留**：✅ 必須保留

#### 2. `docker-compose.override.yml`
- **用途**：自動覆蓋 `docker-compose.yml` 的設定
- **特點**：執行 `docker compose up` 時自動套用
- **保留**：⚠️ 視需求

#### 3. `docker-compose.dev.yml`（Go 開發專用）
- **用途**：完整的 Go 開發環境
- **服務**：mysql (本地), redis, backend-go, frontend, official_website
- **特點**：包含本地 MySQL，完全獨立
- **使用方式**：`docker compose -f docker-compose.dev.yml up`
- **保留**：⚠️ 如果需要本地 MySQL 才保留

#### 4. `docker-compose.local.yml`
- **用途**：Python 後端本地開發
- **特點**：包含 redis 和 mailcatcher
- **保留**：⚠️ 如果還在用 Python 後端才保留

#### 5. `docker-compose.personal.yml`
- **用途**：個人開發配置（不含資料庫）
- **特點**：連接遠端資料庫，輕量級
- **保留**：⚠️ 視個人需求

#### 6. `docker-compose.production.yml`
- **用途**：生產環境部署
- **保留**：✅ 必須保留

#### 7. `docker-compose.staging.yml`
- **用途**：測試環境部署
- **保留**：✅ 必須保留

---

## 建議的開發方式

### Go 後端開發（推薦）

```powershell
# 1. 進入 backend-go 目錄
cd backend-go

# 2. 確認 .env.development 指向遠端 Zeabur 資料庫
# MYSQL_HOST=hnd1.clusters.zeabur.com
# MYSQL_PORT=32195

# 3. 執行 air（熱更新）
air
```

**優點**：
- 不需要啟動 Docker
- 直接連接遠端資料庫（有真實數據）
- 啟動速度快

### 完整本地環境（需要本地資料庫時）

```powershell
# 使用 docker-compose.dev.yml
docker compose -f docker-compose.dev.yml up -d
```

**優點**：
- 完全離線開發
- 不依賴遠端服務

---

## 常見錯誤排查

### 錯誤 1：端口被占用

```
Error: listen tcp :3306: bind: address already in use
```

**解決**：
```powershell
# 查看什麼在占用 3306
netstat -ano | findstr :3306

# 停止 Docker 容器
docker stop $(docker ps -q)

# 或者修改端口
```

### 錯誤 2：無法連接資料庫

```
Error: dial tcp: lookup hnd1.clusters.zeabur.com: no such host
```

**解決**：檢查網路連線，確認 VPN 或防火牆設定。

### 錯誤 3：air 在 Windows 上無法執行

```
CMD will not recognize non .exe file for execution
```

**解決**：修改 `.air.toml`，把 `./tmp/main` 改成 `./tmp/main.exe`

---

## 總結

| 工具 | 讀取的配置文件 | 用途 |
|------|---------------|------|
| `air` | `.air.toml` | 監聽檔案變更、編譯執行 |
| Go 程式 | `.env.development` | 資料庫連線等設定 |
| `docker compose` | `docker-compose*.yml` | 啟動容器 |

**記住**：`air` 和 `docker-compose` 是**完全獨立**的工具！
