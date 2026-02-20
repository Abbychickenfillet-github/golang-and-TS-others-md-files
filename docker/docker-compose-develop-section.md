# Docker Compose develop section 說明

## 什麼是 develop section？

`develop` section 是 Docker Compose v2.22+ 的新功能，用於**開發時的檔案監聽和自動重載**。

```bash
docker compose watch        # 監聽檔案變化
docker compose watch <service>  # 只監聽特定服務
```

---

## 為什麼需要？

| 指令 | 用途 | 需要 develop? |
|------|------|--------------|
| `docker compose up` | 啟動服務 | ❌ 不需要 |
| `docker compose watch` | 開發模式（熱重載） | ✅ 需要 |

**沒有 `develop` section**：
```
none of the selected services is configured for watch
```

---

## 三種 action 類型

### 1. sync（同步檔案）⚡ 最快

**用途**：檔案變更時，直接同步到容器內，不重啟。

```yaml
develop:
  watch:
    - action: sync
      path: ./backend-go         # 監聽本地路徑
      target: /app               # 同步到容器內的路徑
      ignore:                    # 忽略的檔案/目錄
        - tmp/
        - vendor/
        - "*.md"
```

**適用場景**：
- 腳本語言（Python、Node.js）
- 靜態檔案（HTML、CSS）
- Go with air（自動重啟工具）

**限制**：
- Go 編譯型語言需要配合 `air` 或 `nodemon` 等工具
- 單純 sync 不會自動編譯

---

### 2. rebuild（重新建置）🔨 較慢

**用途**：檔案變更時，重新建置 Docker image。

```yaml
develop:
  watch:
    - action: rebuild
      path: ./backend-go/go.mod    # 當 go.mod 改變時
    - action: rebuild
      path: ./backend-go/go.sum    # 當 go.sum 改變時
```

**適用場景**：
- 依賴檔案變更（`go.mod`、`package.json`、`requirements.txt`）
- Dockerfile 改變
- 需要完整重新編譯

**行為**：
1. 停止容器
2. 重新執行 `docker build`
3. 啟動新容器

---

### 3. sync+restart（同步後重啟）🔄

**用途**：同步檔案後重啟容器（不重新建置 image）。

```yaml
develop:
  watch:
    - action: sync+restart
      path: ./config
      target: /app/config
```

**適用場景**：
- 設定檔變更
- 環境變數檔案
- 需要重啟才能生效的檔案

---

## 完整範例：Go 後端

### backend-go 服務配置

```yaml
services:
  backend-go:
    build:
      context: ./backend-go
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - ENVIRONMENT=development
    volumes:
      - ./backend-go:/app        # 必須：掛載本地目錄
    develop:
      watch:
        # 1. 同步所有 Go 原始碼（配合 air 自動重啟）
        - action: sync
          path: ./backend-go
          target: /app
          ignore:
            - tmp/                # air 的暫存目錄
            - vendor/             # Go 依賴
            - "*.md"              # 文件檔案
            - "*.log"             # 日誌檔案

        # 2. 依賴檔案改變時重新建置
        - action: rebuild
          path: ./backend-go/go.mod

        - action: rebuild
          path: ./backend-go/go.sum

        # 3. Dockerfile 改變時重新建置
        - action: rebuild
          path: ./backend-go/Dockerfile
```

---

## 完整範例：Frontend

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules        # 防止本地 node_modules 覆蓋容器內的
    develop:
      watch:
        # 1. 同步原始碼（Vite 有內建 HMR）
        - action: sync
          path: ./frontend/src
          target: /app/src

        # 2. package.json 改變時重新建置
        - action: rebuild
          path: ./frontend/package.json

        - action: rebuild
          path: ./frontend/package-lock.json
```

---

## 實際使用

### 啟動 watch 模式

```bash
# 監聽所有有 develop section 的服務
docker compose watch

# 只監聽特定服務
docker compose watch backend-go

# 監聽多個服務
docker compose watch backend-go frontend
```

### 停止 watch

```
Ctrl + C
```

---

## docker-compose.dev.yml 加入 develop section

```yaml
services:
  backend-go:
    build:
      context: ./backend-go
      dockerfile: Dockerfile
    restart: "no"
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - ENVIRONMENT=development
      - SERVER_PORT=8080
      # ... 其他環境變數
    volumes:
      - ./backend-go:/app        # ⚠️ 重要：需要掛載本地目錄
    develop:                     # ✅ 新增這個區塊
      watch:
        - action: sync
          path: ./backend-go
          target: /app
          ignore:
            - tmp
            - vendor
            - "*.md"
        - action: rebuild
          path: ./backend-go/go.mod
        - action: rebuild
          path: ./backend-go/go.sum
```

---

## 注意事項

### 1. 必須有 volumes 掛載

```yaml
volumes:
  - ./backend-go:/app    # ✅ 必須
develop:
  watch:
    - action: sync
      path: ./backend-go   # 對應上面的本地路徑
      target: /app         # 對應上面的容器路徑
```

**沒有 volumes**：sync 無法運作

---

### 2. sync 適合配合熱重載工具

Go 後端需要：
- `air`（自動偵測檔案變更並重新編譯）
- 或使用 `rebuild` action

Frontend：
- Vite（內建 HMR）
- Webpack Dev Server

---

### 3. rebuild vs sync 的選擇

| 檔案類型 | 推薦 action | 原因 |
|---------|------------|------|
| Go 原始碼 (`.go`) | `sync` + air | 快速同步，air 自動重編譯 |
| `go.mod`, `go.sum` | `rebuild` | 需要重新安裝依賴 |
| TypeScript (`.ts`, `.tsx`) | `sync` | Vite HMR 自動處理 |
| `package.json` | `rebuild` | 需要重新安裝依賴 |
| 設定檔 | `sync+restart` | 同步後重啟容器 |

---

## 對照表：開發方式比較

| 方式 | 指令 | 優點 | 缺點 |
|------|------|------|------|
| **本地開發** | `make dev` | ⚡ 最快，直接修改即生效 | 需要本地安裝 Go、MySQL |
| **Docker watch** | `docker compose watch` | 🐳 完整環境，隔離 | 稍慢，需要容器同步 |
| **Docker up** | `docker compose up` | 🚀 簡單，適合測試 | ❌ 無熱重載，需手動重啟 |

---

## 範例：完整的 docker-compose.dev.yml

```yaml
services:
  mysql:
    image: mysql:8
    # ... mysql 配置

  redis:
    image: redis:7-alpine
    # ... redis 配置

  backend-go:
    build:
      context: ./backend-go
      dockerfile: Dockerfile
    restart: "no"
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - ENVIRONMENT=development
      - SERVER_PORT=8080
      - MYSQL_HOST=mysql
      - MYSQL_PORT=3306
      - REDIS_HOST=redis
      - REDIS_PORT=6380
    volumes:
      - ./backend-go:/app
    develop:
      watch:
        - action: sync
          path: ./backend-go
          target: /app
          ignore:
            - tmp
            - vendor
            - "*.md"
        - action: rebuild
          path: ./backend-go/go.mod
        - action: rebuild
          path: ./backend-go/go.sum

volumes:
  mysql-data:
  redis-data:
```

---

## 總結

1. **develop section** 是 `docker compose watch` 的配置
2. **三種 action**：
   - `sync`：同步檔案（最快）
   - `rebuild`：重新建置 image
   - `sync+restart`：同步後重啟容器
3. **需要 volumes 掛載**才能 sync
4. **Go 後端**建議配合 `air` 使用 sync
5. **依賴檔案**（go.mod、package.json）使用 rebuild

---

## 常見問題 (FAQ)

### Q: volumes 掛載會花錢嗎？

**A: 本地開發不會！雲端部署才會。**

#### 本地開發（免費）💰 FREE

```yaml
volumes:
  - ./backend-go:/app        # 使用你電腦的硬碟空間
  - mysql-data:/var/lib/mysql  # 存在本地
```

**成本**：
- ✅ 完全免費
- 只使用你電腦的硬碟空間（幾 MB 到幾 GB）
- 不會產生任何費用

---

#### 雲端部署（會收費）💸 PAID

在 AWS、GCP、Azure、Zeabur 等雲端平台部署時：

| 平台 | Volume 類型 | 收費方式 | 參考價格 |
|------|------------|---------|---------|
| **AWS** | EBS (Elastic Block Storage) | 每 GB/月 | ~$0.10/GB/月 |
| **GCP** | Persistent Disk | 每 GB/月 | ~$0.04-0.17/GB/月 |
| **Azure** | Managed Disks | 每 GB/月 | ~$0.05/GB/月 |
| **Zeabur** | Persistent Volume | 包含在方案中 | 依方案而定 |

**範例成本計算**（AWS）：
- MySQL 資料庫：20 GB → $2/月
- 上傳圖片：10 GB → $1/月
- 日誌檔案：5 GB → $0.5/月
- **總計**：~$3.5/月

---

#### Named Volumes vs Bind Mounts

```yaml
services:
  backend-go:
    volumes:
      # 1. Bind Mount（本地目錄掛載）
      - ./backend-go:/app
      # ↑ 本地：免費使用硬碟空間
      # ↑ 雲端：通常不用（因為程式碼在 image 內）

      # 2. Named Volume（資料持久化）
      - mysql-data:/var/lib/mysql
      # ↑ 本地：免費，存在 Docker Desktop 資料夾
      # ↑ 雲端：會收費，每 GB/月計費

volumes:
  mysql-data:  # Named volume 定義
```

---

#### 如何節省雲端 Volume 成本？

1. **定期清理不需要的資料**
   ```bash
   # 清理舊日誌
   docker exec backend-go find /app/logs -mtime +30 -delete
   ```

2. **使用 S3/Cloud Storage 存圖片**
   - 不要存在 Volume
   - 使用物件儲存（更便宜）
   - 範例：AWS S3 ~$0.023/GB/月（比 EBS 便宜 4 倍）

3. **資料庫定期備份後清理**
   ```bash
   # 備份後刪除舊資料
   docker exec mysql mysqldump ... > backup.sql
   docker exec mysql mysql -e "DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)"
   ```

4. **開發/測試環境不要保留大量資料**
   - 只在正式環境使用 Persistent Volume
   - 開發環境可以隨時 `docker compose down -v` 清空

---

#### 本地開發 vs 雲端部署對照

| 項目 | 本地開發 | 雲端部署 |
|------|---------|---------|
| Bind Mount (`./backend-go:/app`) | ✅ 免費 | ❌ 通常不用 |
| Named Volume (`mysql-data`) | ✅ 免費 | 💸 按 GB/月收費 |
| 資料持久性 | 在電腦上 | 在雲端儲存 |
| 清理方式 | `docker compose down -v` | 需手動刪除或設定保留政策 |

---

### 總結：要不要擔心 Volume 成本？

| 情境 | 會花錢嗎？ | 說明 |
|------|-----------|------|
| 本地開發（你現在） | ❌ 不會 | 只使用本地硬碟 |
| 部署到 Zeabur/Railway | 看方案 | 通常包含少量 Volume |
| 部署到 AWS/GCP/Azure | ✅ 會 | 但成本很低（幾美金/月） |
| 只存程式碼/設定檔 | ❌ 不會 | 通常 < 1 GB，可忽略 |
| 存大量圖片/影片 | ✅ 會 | 建議改用 S3 |

**結論**：本地開發完全不用擔心，雲端部署才需要注意。
