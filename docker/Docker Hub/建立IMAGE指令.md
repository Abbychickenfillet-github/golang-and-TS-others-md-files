# Docker Hub Image 推送指令

## Image 命名結構

```
registry/username/repository:tag
   │         │         │       │
   │         │         │       └── 版本標籤（可自訂）
   │         │         └── repo 名稱（可自訂）
   │         └── Docker Hub 用戶名
   └── 預設 docker.io（可省略）
```

**範例**：`abbyfillet/futuresign-backend-go:latest`

---

## Image ID vs Name:Tag

Docker 用 **Image ID（sha256）** 識別 image，不是用 name:tag：

```
本地                                    Docker Hub
clone2-backend-go:latest      ←──────→  abbyfillet/futuresign-backend-go:latest
        │                                        │
        └───────── 同一個 Image ID ──────────────┘
                   aa25e94b5952
```

| 項目 | 說明 |
|------|------|
| `name:tag` | 只是標籤/別名，可以有很多個指向同一個 image |
| `Image ID` | 真正的身份證，由 image 內容計算出來的 hash |

**不管你叫它什麼名字，Image ID 一樣 = 同一個 image**

---

## Tag 命名規則

Tag 可以自己取名，常見方式：

| Tag 類型 | 範例 | 用途 |
|---------|------|------|
| 預設 | `latest` | 最新版本 |
| 版本號 | `v1.0.0`、`1.2.3` | 正式發布版本 |
| 環境 | `dev`、`staging`、`prod` | 區分環境 |
| Git commit | `abc1234` | 追蹤對應的程式碼 |
| 日期 | `2026-01-28` | 按日期區分 |

---

## 指令對比

| 指令 | 作用 | 語法 |
|------|------|------|
| `docker build -t` | 從 Dockerfile **建立** image 並命名 | `docker build -t name:tag ./path` |
| `docker tag` | **重新命名**已存在的 image | `docker tag old:tag new:tag` |
| `docker push` | **推送** image 到 Docker Hub | `docker push name:tag` |

---

## 完整推送流程

### 方法一：已有 image，用 tag 改名後推送

```bash
# 1. 登入 Docker Hub
docker login -u abbyfillet

# 2. 查看本地 images
docker images

# 3. Tag（重新命名）
docker tag clone2-backend-go:latest abbyfillet/futuresign-backend-go:latest

# 4. Push
docker push abbyfillet/futuresign-backend-go:latest
```

### 方法二：從 Dockerfile 建立並推送

```bash
# 1. 登入
docker login -u abbyfillet

# 2. Build（從 Dockerfile 建立）
docker build -t abbyfillet/futuresign-backend-go:latest ./backend-go

# 3. Push
docker push abbyfillet/futuresign-backend-go:latest
```

---

## 一次推送多版本 Tag

```bash
# 同一個 image 可以有多個 tag
docker tag clone2-backend-go:latest abbyfillet/futuresign-backend-go:latest
docker tag clone2-backend-go:latest abbyfillet/futuresign-backend-go:v1.0.0
docker tag clone2-backend-go:latest abbyfillet/futuresign-backend-go:prod

# 推送全部
docker push abbyfillet/futuresign-backend-go:latest
docker push abbyfillet/futuresign-backend-go:v1.0.0
docker push abbyfillet/futuresign-backend-go:prod
```

---

## 查看 Image 的分層（Layers）

```bash
docker history abbyfillet/futuresign-backend-go:latest
```

---

## Multi-stage Build（多階段建置）

Multi-stage build 讓你在一個 Dockerfile 中使用多個 `FROM`，分階段處理：

```dockerfile
# 第一階段：編譯（使用完整的開發環境）
FROM golang:1.24-alpine AS builder
WORKDIR /build
COPY . .
RUN go build -o server ./cmd/server/main.go

# 第二階段：運行（只需要執行檔）
FROM scratch                    ← 最終 image 用空白映像檔
COPY --from=builder /build/server /server
CMD ["/server"]
```

### 好處

| 比較 | 單階段 | Multi-stage |
|------|--------|-------------|
| Image 大小 | 1GB+（含編譯工具） | 68MB（只有執行檔） |
| 安全性 | 較低（有多餘套件） | 較高（攻擊面小） |
| 建置速度 | 較慢 | 利用快取，較快 |

---

## Scratch 映像檔

`scratch` 是 Docker 的特殊空白映像檔：

| Base Image | 內容 | 大小 |
|------------|------|------|
| `ubuntu:22.04` | 完整 OS、shell、apt... | ~77MB |
| `alpine:3.19` | 精簡 OS、busybox、apk... | ~7MB |
| `scratch` | **完全空白**，什麼都沒有 | 0MB |

### 適用場景

- Go、Rust 等可編譯成靜態執行檔的語言
- 需要最小化攻擊面的安全敏感應用

### 使用 scratch 的 image 內容

```
abbyfillet/futuresign-backend-go:latest
├── /server                    ← 編譯好的執行檔
├── /etc/ssl/certs/            ← CA 憑證（HTTPS 用）
└── /usr/share/zoneinfo/       ← 時區資料
```

**沒有 OS、沒有 shell、沒有任何套件** → Docker Scout 顯示「no base image」且漏洞為 0

---

## 安全掃描（Docker Scout）

```bash
# 快速檢視漏洞
docker scout quickview abbyfillet/futuresign-backend-go:latest

# 結果說明
# 0C 0H 0M 0L = Critical/High/Medium/Low 漏洞數量
```

網頁查看：https://scout.docker.com

---

## 已推送的 Images

| Image | Docker Hub URL |
|-------|----------------|
| backend-go | `abbyfillet/futuresign-backend-go:latest` |
| frontend | `abbyfillet/futuresign-frontend:latest` |
| official-website | `abbyfillet/futuresign-official-website:latest` |

查看頁面：
- https://hub.docker.com/r/abbyfillet/futuresign-backend-go
- https://hub.docker.com/r/abbyfillet/futuresign-frontend
- https://hub.docker.com/r/abbyfillet/futuresign-official-website
