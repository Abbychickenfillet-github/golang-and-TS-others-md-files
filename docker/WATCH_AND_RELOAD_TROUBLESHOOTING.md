# Docker Compose Watch 和 --reload 故障排除

## 問題：修改 tags 後 /8003/docs 沒有更新

### 原因分析

1. **為什麼 command 不能放在 develop 下？**
   - ❌ **Docker Compose 不支持在 `develop` 下配置 `command`**
   - `develop` 只支持特定的配置項（主要是 `watch`）
   - `command` 必須是 service 級別的配置（與 `build`、`ports` 同級）

2. **當前配置的說明**：
   - `command` 放在 `build` 之後是正確的 ✅
   - `command` 和 `build` 是**同級**配置（都是 service 級別的）
   - 即使不在 watch 模式下，`--reload` 也不會造成問題（只是不會檢測到文件變化）

2. **watch 可能沒有生效的原因**：
   - ❌ 使用了 `docker compose up` 而不是 `docker compose watch`
   - ❌ watch 的 sync 沒有正確同步文件到容器
   - ❌ FastAPI 的 `--reload` 沒有檢測到文件變化
   - ❌ 瀏覽器快取了舊的 Swagger UI

### 解決方案

#### 方案 1：確認使用 watch 模式（推薦）

```bash
# 停止當前服務
docker compose down backend

# 使用 watch 模式啟動
docker compose watch backend
```

**關鍵點**：
- ✅ 必須使用 `docker compose watch` 而不是 `docker compose up`
- ✅ watch 模式會監聽文件變化並同步到容器
- ✅ `--reload` 會檢測到文件變化並自動重啟

#### 方案 2：手動重啟服務

如果已經使用了 watch 模式，但修改沒有生效：

```bash
# 重啟服務
docker compose restart backend

# 或者完全重啟
docker compose down backend
docker compose watch backend
```

#### 方案 3：清除瀏覽器快取

Swagger UI 可能快取了舊的 OpenAPI 文檔：

1. 按 `Ctrl + Shift + R`（硬刷新）
2. 或按 `F12` 打開開發者工具，右鍵刷新按鈕選擇"清空快取並硬性重新加載"
3. 或訪問 `http://localhost:8003/docs?nocache=1`

#### 方案 4：檢查文件是否同步到容器

```bash
# 進入容器檢查文件
docker compose exec backend cat /app/app/api/main.py | grep -A 2 "company-verifications"
```

如果文件沒有更新，說明 watch 的 sync 沒有工作。

### 驗證 watch 是否在工作

#### 檢查 1：查看容器命令

```bash
docker compose ps backend
```

應該看到命令包含 `--reload`：
```
COMMAND: "fastapi run --reloa…"
```

#### 檢查 2：查看日誌

```bash
docker compose logs backend -f
```

修改文件後，應該看到類似這樣的日誌：
```
INFO:     Detected file change in 'app/api/main.py'. Reloading...
INFO:     Application startup complete.
```

#### 檢查 3：測試文件同步

1. 修改 `backend/app/api/main.py` 中的 tags
2. 等待幾秒鐘
3. 檢查容器內的文件：
   ```bash
   docker compose exec backend cat /app/app/api/main.py | grep tags
   ```

### 常見問題

#### Q1: command 在 build 之後，watch 會生效嗎？

**A: 會的！**
- `command` 和 `build` 是同級配置
- `command` 定義容器啟動時執行的命令
- `develop.watch` 定義文件監聽和同步規則
- 兩者是獨立的配置，互不影響

#### Q2: 為什麼 command 不放在 develop 下？

**A: Docker Compose 不支持！**
- `develop` 只支持 `watch` 等特定配置
- `command` 必須是 service 級別的配置
- 詳細說明請參考：[DOCKER_COMPOSE_COMMAND_EXPLANATION.md](./DOCKER_COMPOSE_COMMAND_EXPLANATION.md)

#### Q2: 為什麼修改 tags 後沒有變化？

**可能原因**：
1. 沒有使用 `docker compose watch`
2. 瀏覽器快取了舊的文檔
3. FastAPI 的 `--reload` 沒有檢測到變化（需要重啟）

#### Q3: 如何確認 --reload 正在工作？

查看日誌，應該看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [1] using WatchFiles
```

如果看到 `Started reloader process`，說明 `--reload` 正在工作。

### 正確的開發流程

```bash
# 1. 啟動 watch 模式
docker compose watch backend

# 2. 修改程式碼（例如：修改 tags）
# 編輯 backend/app/api/main.py

# 3. 等待自動重載（通常 1-3 秒）
# 查看日誌確認重載：
docker compose logs backend -f

# 4. 刷新瀏覽器（硬刷新：Ctrl + Shift + R）
# 訪問 http://localhost:8003/docs
```

### 配置檢查清單

- [ ] `docker-compose.yml` 中的 `command` 包含 `--reload`
- [ ] `docker-compose.yml` 中有 `develop.watch` 配置
- [ ] 使用 `docker compose watch` 而不是 `docker compose up`
- [ ] 文件路徑在 `watch` 的 `path` 配置中
- [ ] 瀏覽器已清除快取或硬刷新

### 快速修復命令

```bash
# 完全重啟並啟用 watch
docker compose down backend
docker compose watch backend

# 在另一個終端查看日誌
docker compose logs backend -f
```
