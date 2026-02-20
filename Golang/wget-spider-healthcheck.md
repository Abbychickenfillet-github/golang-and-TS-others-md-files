# wget --spider 說明

## 什麼是 wget?

`wget` 是一個命令列工具，用於從網路下載檔案。

## --spider 參數的作用

`--spider` 模式：**不下載內容，只檢查 URL 是否存在**

```bash
wget --spider http://localhost:8080/health
```

### --spider 的行為

1. **發送 HEAD 請求**（不是 GET 請求）
2. 檢查伺服器回應狀態碼
3. 不下載任何內容
4. 常用於檢查網頁是否存在

---

## Docker Healthcheck 的問題

### ❌ 錯誤用法

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
```

**問題**：
- `--spider` 發送 **HEAD 請求**
- 如果 Go 的 `/health` endpoint 只註冊了 `GET` 方法
- 會收到 `404 Not Found`，導致 healthcheck 失敗

### ✅ 正確用法

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
```

**說明**：
- `-q`：quiet 模式，不輸出進度
- `-O-`：輸出到標準輸出（stdout），不存檔
- 發送 **GET 請求**（正常下載）
- 內容會輸出到 stdout，Docker 會檢查 exit code

---

## wget 常用參數對照

| 參數 | 說明 | 用途 |
|------|------|------|
| `--spider` | 只檢查 URL，不下載（HEAD 請求） | 檢查網頁是否存在 |
| `-qO-` | 靜默模式，輸出到 stdout（GET 請求） | Healthcheck、管道處理 |
| `-q` | quiet 靜默模式 | 不顯示進度條 |
| `-O <file>` | 輸出到指定檔案 | 下載並重新命名 |
| `-O-` | 輸出到標準輸出 | 管道處理 |

---

## 實際測試

### 測試 HEAD vs GET 請求

```bash
# HEAD 請求 (--spider)
wget --spider http://localhost:8080/health
# 如果 endpoint 不支援 HEAD，會返回 404

# GET 請求 (-qO-)
wget -qO- http://localhost:8080/health
# 正常返回 JSON 回應
```

### 用 curl 對照

```bash
# HEAD 請求
curl -I http://localhost:8080/health

# GET 請求
curl http://localhost:8080/health
```

---

## Go 端點如何支援 HEAD 請求

如果你想讓 `/health` 支援 HEAD 請求：

```go
// 自動支援 HEAD（Gin 框架）
router.GET("/health", healthCheckHandler)
// Gin 會自動處理 HEAD 請求（返回相同的 headers，但沒有 body）
```

但實際上 Gin 對 HEAD 請求的支援可能不完整，最好的做法是：
1. Healthcheck 使用 GET 請求（`-qO-`）
2. 或明確註冊 HEAD handler

---

## 相關問題排查

### Docker 容器顯示 unhealthy

```bash
# 檢查容器健康狀態
docker ps

# 查看 healthcheck 日誌
docker inspect --format='{{json .State.Health}}' <container_id> | jq

# 進入容器測試
docker exec -it <container_id> sh
wget -qO- http://localhost:8080/health
```

---

## 總結

| 情境 | 指令 | 請求方法 |
|------|------|---------|
| 檢查 URL 是否存在 | `wget --spider URL` | HEAD |
| Healthcheck（推薦） | `wget -qO- URL` | GET |
| 下載內容到 stdout | `wget -O- URL` | GET |
| 靜默下載到檔案 | `wget -q -O file.txt URL` | GET |

**本專案修正**：將 Docker Compose 的 healthcheck 從 `--spider` 改為 `-qO-`，確保發送 GET 請求。
