# Python logging 模組

## 什麼是 logging？

Python 內建的**日誌記錄模組**，用來記錄程式執行過程中的訊息（取代到處寫 `print()`）。

## 基本用法

```python
import logging

logging.debug("除錯訊息")      # 最詳細，開發用
logging.info("一般訊息")       # 正常運作資訊
logging.warning("警告")        # 有問題但不影響運作
logging.error("錯誤")          # 出錯了
logging.critical("嚴重錯誤")   # 系統掛了
```

## 日誌等級（由低到高）

| 等級 | 數值 | 用途 |
|------|------|------|
| DEBUG | 10 | 詳細除錯資訊，開發時使用 |
| INFO | 20 | 確認程式正常運作的訊息 |
| WARNING | 30 | 有潛在問題，但程式仍可運作 |
| ERROR | 40 | 發生錯誤，某些功能無法執行 |
| CRITICAL | 50 | 嚴重錯誤，程式可能無法繼續 |

## logging vs print

| print | logging |
|-------|---------|
| 只能輸出到 console | 可以輸出到檔案、console、遠端 |
| 沒有等級區分 | 有 DEBUG/INFO/WARNING/ERROR/CRITICAL |
| 正式環境要手動刪除 | 可以透過設定控制開關 |
| 無時間戳記 | 可自動加上時間、檔案名、行號 |

## logging vs console.log (JavaScript)

| | `console.log` (JS) | `logging` (Python) |
|--|-------------------|-------------------|
| 輸出位置 | 只有 console | console、檔案、遠端都可以 |
| 等級區分 | 有限（log/warn/error） | 完整（DEBUG/INFO/WARNING/ERROR/CRITICAL） |
| 格式化 | 手動加時間 | 自動加時間、檔案名、行號 |
| 正式環境 | 要手動刪除或用工具移除 | 設定等級就能控制顯示 |
| 持久化 | 關掉瀏覽器就沒了 | 可以寫入 log 檔永久保存 |

**結論**：概念類似，但 `logging` 功能更完整，適合後端正式環境使用。

## 誰決定用 warning/info/error？

**是開發者自己決定的**，不是程式自動判斷。

```python
# 這兩行都能執行，但「意義」由你決定
logging.info("用戶登入")      # 你覺得這是一般資訊
logging.warning("用戶登入")   # 你覺得這需要注意
```

### 常見判斷標準

| 等級 | 什麼時候用 |
|------|-----------|
| `debug` | 開發時想看的細節（變數值、流程追蹤） |
| `info` | 正常操作紀錄（用戶登入、訂單建立） |
| `warning` | 不正常但不影響運作（重試成功、快到期限） |
| `error` | 出錯了（資料庫連線失敗、API 回傳錯誤） |
| `critical` | 系統掛了（服務完全無法運作） |

## logging vs HTTP Status Code

**完全不同用途！**

| | HTTP Status Code | Logging |
|--|------------------|---------|
| **給誰看** | 給前端/客戶端 | 給開發者/運維 |
| **目的** | 告訴客戶端請求結果 | 記錄系統內部發生什麼事 |
| **可見性** | 用戶會看到 | 用戶看不到（在伺服器 log 檔） |

### 實際差異範例

```python
@router.post("/login")
async def login(email: str, password: str):
    user = get_user(email)

    if not user:
        logger.warning(f"登入失敗 - 用戶不存在: {email}")  # 記錄詳細原因
        raise HTTPException(status_code=401)              # 只回 401（不透露細節）

    if not verify_password(password, user.password):
        logger.warning(f"登入失敗 - 密碼錯誤: {email}")    # 記錄詳細原因
        raise HTTPException(status_code=401)              # 同樣回 401

    logger.info(f"登入成功: {user.id}")
    return {"token": create_token(user)}
```

**重點**：密碼錯、用戶不存在都回 `401`（安全考量，不告訴客戶端細節），但 logging 會分開記錄，方便之後查問題。

## logging 訊息出現在哪裡？

**不會出現在瀏覽器 F12 Console！**

`logger.info` 是後端（Python）的東西，只會出現在：

| 位置 | 說明 |
|------|------|
| Terminal | 跑 `python` 或 `uvicorn` 的那個視窗 |
| Docker logs | `docker logs template-backend-1` |
| Log 檔案 | 如果有設定 `filename="app.log"` |

### 瀏覽器 F12 Console 只會顯示：

1. **JavaScript** 的 `console.log`
2. **網路請求錯誤**（404、500 等）
3. **前端程式錯誤**

### 圖解

```
┌─────────────────┐         ┌─────────────────┐
│   前端 (React)   │  HTTP   │  後端 (Python)  │
│                 │ ──────> │                 │
│  console.log()  │         │  logger.info()  │
│       ↓         │         │       ↓         │
│  F12 Console    │         │  Terminal /     │
│  (瀏覽器)        │         │  Docker logs    │
└─────────────────┘         └─────────────────┘
```

### 想看後端 log 怎麼做？

```bash
# 看 Docker 容器的 log
docker logs template-backend-1

# 即時追蹤（類似 tail -f）
docker logs -f template-backend-1
```

## 設定日誌格式

```python
import logging

logging.basicConfig(
    level=logging.INFO,  # 設定最低顯示等級
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logging.info("這是一條訊息")
# 輸出: 2026-01-03 10:30:00,000 - INFO - 這是一條訊息
```

### 常用格式變數

| 變數 | 說明 |
|------|------|
| `%(asctime)s` | 時間戳記 |
| `%(levelname)s` | 日誌等級名稱 |
| `%(message)s` | 日誌訊息 |
| `%(filename)s` | 檔案名 |
| `%(lineno)d` | 行號 |
| `%(funcName)s` | 函數名 |

## 輸出到檔案

```python
import logging

logging.basicConfig(
    filename="app.log",      # 輸出到檔案
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logging.info("這條訊息會寫入 app.log")
```

## 建立專屬 Logger（推薦）

```python
import logging

# 建立專屬的 logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 建立 handler（輸出到 console）
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)

# 設定格式
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)

# 加入 handler
logger.addHandler(handler)

# 使用
logger.info("使用專屬 logger")
```

## 實際應用範例

### FastAPI 中使用

```python
import logging

logger = logging.getLogger(__name__)

@router.post("/login")
async def login(credentials: LoginRequest):
    logger.info(f"用戶 {credentials.email} 嘗試登入")

    try:
        user = authenticate(credentials)
        logger.info(f"用戶 {user.id} 登入成功")
        return {"token": create_token(user)}
    except AuthError as e:
        logger.warning(f"登入失敗: {e}")
        raise HTTPException(status_code=401)
    except Exception as e:
        logger.error(f"登入時發生錯誤: {e}", exc_info=True)
        raise
```

### 記錄例外堆疊

```python
try:
    result = 1 / 0
except Exception as e:
    logging.error("發生錯誤", exc_info=True)  # exc_info=True 會印出完整堆疊
```

## 小結

- 正式專案用 `logging`，不要用 `print`
- 根據訊息重要性選擇適當等級
- 開發環境可設 DEBUG，正式環境設 INFO 或 WARNING
- 使用 `getLogger(__name__)` 建立模組專屬 logger
