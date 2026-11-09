# compose up 之後怎麼引用 Dockerfile.dev？以及 MySQL host 怎麼確認

> 日期：2026-10-14　本篇重點 a–h，共 8 個
> 相關筆記：[[docker-compose-modes]]、[[DOCKER_COMPOSE_COMMAND_EXPLANATION架構]]、[[mysql-docker-cli]]、[[DOCKER_PORT_CONFLICT_SOLUTION]]

## 1. 引用關係：靠 compose 的 `build:` 區塊，不是自動找

compose 檔的 `backend-go` service 用 `build:` 告訴 Docker 去哪裡找 Dockerfile，Docker 不會自己猜 `Dockerfile.dev`。

```yaml
backend-go:
  build:
    context: ../../backend-go     # build context：打包時 Docker 看得到的資料夾
    dockerfile: Dockerfile.dev    # 相對於 context 的檔名
```

| 標號 | 欄位 | 路徑相對於 | 沒寫的預設 |
|------|------|-----------|-----------|
| a | `context` | compose 檔所在資料夾（不是你下指令的位置） | `.` |
| b | `dockerfile` | context | context 底下叫 `Dockerfile` 的檔案 |

| 標號 | compose 檔 | context 寫法 | 原因 |
|------|-----------|-------------|------|
| c | `backend-go/docker-compose.dev.yml` | `.` | compose 本身就放在 backend-go 裡 |
| d | `deploy/docker/docker-compose.dev.yml` | `../../backend-go` | compose 在 deploy/docker，往上兩層再進 backend-go |

## 2. `up --build` 的完整流程（e）

compose 讀到 `build:` 後，把 context 資料夾送給 Docker daemon，daemon 依 `Dockerfile.dev` 由上而下建 image，建好才用 image 建 container，最後套用 compose 的 volumes、environment、ports，並照 `depends_on` 等 mysql、redis 變 healthy 才啟動 backend-go。

| Dockerfile.dev 指令 | 做什麼 | 為什麼這樣排 |
|--------------------|--------|-------------|
| `FROM golang:1.26-alpine` | 取 Go 編譯環境當基底 | 容器內要能 `go build` |
| `RUN apk add git ca-certificates tzdata wget` | 裝系統工具 | git 給 go mod，tzdata 給時區 |
| `RUN go install air@latest` | 裝熱更新工具 air | 開發時存檔自動重編 |
| `COPY go.mod go.sum` + `go mod download` | 先只複製依賴清單再下載 | 依賴沒變時快取這層，不重下載 |
| `COPY . .` | 複製全部原始碼進 `/app` | 讓 image 單獨也能跑 |
| `CMD ["air","-c",".air.toml"]` | 容器啟動時執行 air | air 讀 `.air.toml` 決定怎麼編譯 |

逐行解釋（apk、tzdata、ca-certificates 等，滑鼠移上去顯示說明）見互動版 [[dockerfile-dev-apk-tzdata-hover.html]]，這裡不重複寫。

## 3. 熱更新靠 volume 蓋掉 image 裡的程式碼（f）

`COPY . .` 進去的程式碼會被 compose 的 volume 掛載蓋掉，所以你在本機存檔，容器內的 air 就看得到變更。

| volume | 用途 |
|--------|------|
| `../../backend-go:/app` | 本機程式碼覆蓋 image 內 `/app`，達成熱更新 |
| `/app/tmp`（匿名 volume） | 保護 air 編譯輸出，不被本機資料夾蓋掉 |
| `/app/vendor`（匿名 volume） | 同上，保護 vendor |

`.air.toml` 設 `poll = true`，因為 Windows 掛載進容器收不到檔案系統事件，只能輪詢。`go.mod` 改動時要加 `--build` 重建 image，因為依賴是在 build 階段下載的。

## 4. MySQL host 要看你用哪份 compose 檔（g）

這個專案有兩份 dev compose，連的資料庫不同。

| compose 檔 | MYSQL_HOST | 連到哪 |
|-----------|-----------|--------|
| `backend-go/docker-compose.dev.yml` | `mysql` | 同 compose 內的本地 mysql 容器，資料庫 `futuresign_dev` |
| `deploy/docker/docker-compose.dev.yml` | `hnd1.clusters.zeabur.com:32195` | Zeabur staging，資料庫 `future_sign_stage`（同檔也起了 mysql 容器，但沒人連它） |

`MYSQL_HOST=mysql` 能運作，是因為 compose 預設建一個 network，service 名稱就是 DNS 主機名；容器內的 `localhost` 指容器自己，不是你的電腦。

確認目前連去哪的指令：

```bash
docker compose -f backend-go/docker-compose.dev.yml exec backend-go printenv | grep MYSQL
docker compose -f backend-go/docker-compose.dev.yml exec mysql mysql -uroot -ppassword -e "SHOW DATABASES;"
docker compose -f backend-go/docker-compose.dev.yml logs backend-go
```

`docker compose config` 會把所有密碼印出來，不要貼到公開處。

## 5. 2026-10-14 實際檢查結果（h）

| 檢查項目 | 結果 |
|---------|------|
| Docker daemon | 正常；第一次檢查時沒有容器，之後（約 03:51 UTC）發現 `backend-go` compose 的 3 個容器已在跑，見第 7 節 |
| 既有 volume | `backend-go_mysql-data`、`backend-go_redis-data` 還在，前綴表示之前用 `backend-go/docker-compose.dev.yml` 起過，本地資料保留 |
| Zeabur staging TCP 連線 | `hnd1.clusters.zeabur.com:32195` 連線成功，僅代表網路通，不代表帳密正確 |
| 本機 8080 | 被 `httpd`（PID 5604，疑似 Apache/XAMPP）佔用，`ports: "8080:8080"` 會衝突 |
| 機密外洩風險 | 兩份 compose 都明文寫 Zeabur 密碼、AWS key、Mailgun key、Google secret，commit 前要注意 |

## 6. 為什麼 8080 被佔用要關掉 httpd 或改 port（i）

`ports: "8080:8080"` 的格式是 `本機port:容器port`。Docker 啟動容器時要在**本機**監聽 8080，但同一個 port 同時只能有一個程式監聽，已被 `httpd` 佔走，所以會報 `port is already allocated` 或 `bind: Only one usage of each socket address`，容器起不來。

| 做法 | 改什麼 | 代價 |
|------|--------|------|
| 關掉 httpd | 不用改任何設定 | 若你還要用 XAMPP/Apache 就不能同時開 |
| 改成 `8081:8080` | 只改**左邊**的本機 port，右邊容器內仍是 8080 | 所有指向 `localhost:8080` 的地方都要跟著改（見下表） |

改 port 後要同步修改的地方：

| 位置 | 原值 |
|------|------|
| 前端 `VITE_API_URL` / `VITE_API_BASE_URL` | `http://localhost:8080` |
| compose 內 CORS 白名單 | 含 `http://localhost:8080` |
| cloudflared tunnel 指令 | `cloudflared tunnel --url http://localhost:8080` |
| ECPay 的 `ECPAY_RETURN_URL` 等 tunnel URL | 指向 tunnel，tunnel 又指向本機 8080 |

相關：[[DOCKER_PORT_CONFLICT_SOLUTION]]、[[PORT_CONFLICT_TROUBLESHOOTING]]

## 7. 8080 被誰佔用：實測與查法（j）

### 7.1 實測：8080 同時有 3 個 PID 在聽

| 標號 | netstat 位址 | PID | 程式 | 身分 |
|------|-------------|-----|------|------|
| k | `0.0.0.0:8080` | 5604 | `httpd.exe` | Windows 服務 `PEMHTTPD-x64`（EDB Postgres Enterprise Manager 的 Apache，開機自動啟動），路徑 `C:\Program Files\edb\pem\httpd\apache\bin\httpd.exe` |
| l | `0.0.0.0:8080`、`[::]:8080` | 26404 | `com.docker.backend.exe` | Docker Desktop 替容器做的 port 轉發（即 backend-go 容器） |
| m | `[::1]:8080` | 13648 | `wslrelay.exe` | WSL 的 localhost 轉發 |

Windows 允許兩個程式綁同一個 `0.0.0.0:8080`，所以 docker 沒有報錯，但請求會被誰接走是不確定的。實測結果：

| 請求目標 | 回應者 |
|---------|--------|
| `http://127.0.0.1:8080/` | **Apache（EDB 的 httpd）**，回 "Server is up and running" |
| `http://[::1]:8080/` | Go 後端，回 `{"message":"FutureSign Backend - Golang"...}` |

`localhost` 可能解析成 IPv4 `127.0.0.1` 或 IPv6 `::1`，所以前端打 `localhost:8080` 時，有時打到 Go、有時打到 Apache，這就是「有時會怪怪的」的原因。

### 7.2 怎麼查是誰佔了 port

| 標號 | 步驟 | 指令／操作 |
|------|------|-----------|
| n | 找出 PID（最後一欄） | `netstat -ano \| findstr :8080` |
| o | PID 對應程式 | `tasklist /FI "PID eq 5604"` |
| p | 看完整路徑、是否為服務 | `Get-CimInstance Win32_Process -Filter "ProcessId=5604"` 與 `Get-CimInstance Win32_Service \| ? ProcessId -eq 5604` |
| q | 工作管理員 | 「詳細資料」頁籤，右鍵欄位標題 → 選擇資料行 → 勾 PID，再依 PID 排序；服務型程式也可在「服務」頁籤用 PID 欄找到 `PEMHTTPD-x64` |
| r | 資源監視器（最直觀） | `resmon` → 網路 → 接聽連接埠，直接列出每個 port 對應的映像與 PID |

PID 5604 不是「去找」的東西，它是 netstat 最後一欄印出來的結果，每次重開機都會變。

### 7.3 build 跟 development / production 的關係

`build:` 只決定「用哪個 Dockerfile 建 image」，環境是由「選哪份 compose + 環境變數」決定。

| 標號 | 環境 | compose | image 來源 | Dockerfile 內容 |
|------|------|---------|-----------|----------------|
| s | development | `docker-compose.dev.yml` | `build:` 用 `Dockerfile.dev` 現場建 | golang:alpine + air，原始碼用 volume 掛進去，容器內執行 |
| t | production | `docker-compose.production.yml` | 沒有 `build:`，用 `image: ${IMAGE_TAG:-futuresign-backend-go:latest}` | `Dockerfile` 多階段：builder 編譯後 `FROM scratch`，只放 `/server` 執行檔 |

## 8. PEMHTTPD-x64 還有在用嗎？與 Zeabur 掛掉的因應（u）

### 8.1 PEMHTTPD-x64 的使用證據

| 標號 | 證據 | 結論 |
|------|------|------|
| v | Apache `access.log`（2025-09 ~ 2026-10，共 17026 行）幾乎全是 `/api/v1/users/me`、`/api/v1/events`、`/api/v1/login/access-token` 等請求 | 這些是自己的前端打 `localhost:8080` 卻被 Apache 擋下（404），不是在使用 PEM 網頁 |
| w | 單日 2026-03-30 有 13850 行，其中 `OPTIONS /api/v1/users/me` 16429 次（全期） | 前端輪詢被 Apache 攔截的當天紀錄 |
| x | 沒有任何 `/pem` 之類 PEM 管理介面的請求 | 沒有人在用 PEM 網頁 |
| y | `C:\Program Files\edb\pem` 建立於 2025-08-06，同機 PostgreSQL 17 建立於 2025-08-04，沒有 PEM agent 服務 | 只是安裝 PostgreSQL 時附帶裝的 |
| z | 2026-10-14 11:57 `error.log` 記錄收到 shutdown，服務現為 Stopped／Manual | 已被停掉並改手動，現在 8080 只剩 Docker 在聽，`127.0.0.1` 與 `::1` 都回 Go 後端 |

PostgreSQL 17（`postgresql-x64-17`）與 `pgagent-pg17` 仍是 Auto 啟動，與 PEM 網頁無關，不要動。

### 8.2 Zeabur 連不上時後端會怎樣

`cmd/server/main.go` 第 78 行 `database.ConnectWithRetry(&cfg.Database, 5, 2*time.Second)` 重試 5 次、每次隔 2 秒，失敗後第 80 行 `logger.Fatal("資料庫連接失敗")` 並 `os.Exit(1)`。後端會直接結束，不會降級執行，前端雖能載入靜態畫面，但所有 API 都失敗。

| 情境 | 後端 | 前端畫面 |
|------|------|---------|
| compose 設 `MYSQL_HOST=mysql`（本地 DB） | 正常 | 有資料 |
| compose 設 Zeabur 且 Zeabur 掛了 | 5 次重試後退出 | 只有空殼，API 全失敗 |

### 8.3 面試用本地 DB 的現況

本地 `futuresign_dev` 有 70 張表、55 張有資料（member 145、order 203、booth 308、event_booth_type_pricing 40 等）。資料存在 Docker volume `backend-go_mysql-data`，注意 `docker compose down -v` 會把 volume 刪掉；建議先用 `mysqldump` 備份。
