# Docker Scout 常用指令與介紹

Docker Scout 是 Docker 內建的安全掃描工具，用於分析 image 的漏洞和提供修復建議。

---

## 快速開始

```bash
# 設定組織（只需執行一次）
docker scout config organization abbyfillet
```

---

## 常用指令

### 1. `quickview` - 快速檢視漏洞摘要

```bash
docker scout quickview [IMAGE]
```

**範例**：
```bash
docker scout quickview abbyfillet/futuresign-backend-go:latest
```

**輸出說明**：
```
0C  0H  0M  0L
│   │   │   │
│   │   │   └── Low（低風險）
│   │   └── Medium（中等風險）
│   └── High（高風險）
└── Critical（嚴重）
```

---

### 2. `cves` - 列出所有 CVE 漏洞

```bash
docker scout cves [IMAGE]
```

**範例**：
```bash
docker scout cves abbyfillet/futuresign-backend-go:latest
```

**篩選特定嚴重程度**：
```bash
# 只顯示 critical 和 high
docker scout cves --only-severity critical,high [IMAGE]
```

---

### 3. `recommendations` - 升級建議（最強功能）

```bash
docker scout recommendations [IMAGE]
```

**功能**：
- 顯示更安全的基礎映像檔建議
- 告訴你升級到哪個版本可以減少多少漏洞
- 提供具體的 Dockerfile 修改建議

**範例**：
```bash
docker scout recommendations abbyfillet/futuresign-backend-go:latest
```

**什麼是「升級建議」？**

Scout 會分析你 Dockerfile 裡的 `FROM` 那一行（base image），建議你換成更安全的版本：

```dockerfile
# 原本（有漏洞）
FROM node:16-alpine        ← Scout 發現這個版本有 15 個 Critical 漏洞

# Scout 建議改成
FROM node:20-alpine        ← 升級後只剩 0 個 Critical 漏洞
```

**輸出範例**：
```
Base image is nginx:1
Vulnerabilities: 0C  0H  2M  54L

Recommended: nginx:1.25-alpine
  - 減少 2 個 Medium 漏洞
  - 減少 30 個 Low 漏洞
```

**特殊情況：no base image**

如果 image 使用 `FROM scratch`（空白映像檔），Scout 會顯示：
```
image has no base image
```
這表示你的 image 已經是最安全的配置（沒有多餘套件可被攻擊）。

---

### 4. `compare` - 比較兩個 Image

```bash
docker scout compare [IMAGE1] [IMAGE2]
```

**用途**：比較升級前後的漏洞差異

**範例**：
```bash
docker scout compare myapp:v1.0 myapp:v2.0
```

---

### 5. `sbom` - 產生軟體物料清單

```bash
docker scout sbom [IMAGE]
```

**功能**：列出 image 中所有的套件和依賴項

**輸出為 JSON**：
```bash
docker scout sbom --format json [IMAGE] > sbom.json
```

---

### 6. `attestation` - 檢視 image 的證明資訊

```bash
docker scout attestation [IMAGE]
```

---

### 7. `environment` - 管理環境設定

```bash
# 列出所有環境
docker scout environment

# 查看特定環境
docker scout environment [ENV_NAME]
```

---

## 篩選與格式選項

### 依嚴重程度篩選

```bash
docker scout cves --only-severity critical [IMAGE]
docker scout cves --only-severity critical,high [IMAGE]
docker scout cves --only-severity medium,low [IMAGE]
```

### 輸出格式

```bash
# JSON 格式
docker scout cves --format json [IMAGE]

# SARIF 格式（用於 CI/CD）
docker scout cves --format sarif [IMAGE]

# Markdown 格式
docker scout cves --format markdown [IMAGE]
```

---

## 網頁介面

Docker Scout 也有網頁版 Dashboard：

**網址**：https://scout.docker.com

功能：
- 視覺化漏洞報告
- 追蹤 image 的安全狀態
- 設定安全政策

---

## 實用範例

### 掃描本地 image

```bash
docker scout quickview clone2-backend-go:latest
```

### 掃描遠端 image

```bash
docker scout quickview abbyfillet/futuresign-backend-go:latest
```

### 用 Image ID 掃描

```bash
docker scout quickview sha256:aa25e94b5952
# 或簡短版
docker scout quickview aa25e94b5952
```

### 完整安全檢查流程

```bash
# 1. 快速檢視
docker scout quickview myimage:latest

# 2. 查看詳細漏洞
docker scout cves myimage:latest

# 3. 取得升級建議
docker scout recommendations myimage:latest

# 4. 升級後比較差異
docker scout compare myimage:old myimage:new
```

---

## CI/CD 整合

### GitHub Actions 範例

```yaml
- name: Docker Scout Scan
  uses: docker/scout-action@v1
  with:
    command: cves
    image: ${{ env.IMAGE_NAME }}
    only-severities: critical,high
    exit-code: true  # 有漏洞時 CI 失敗
```

---

## 指令速查表

| 指令 | 用途 |
|------|------|
| `docker scout quickview [IMAGE]` | 快速檢視漏洞摘要 |
| `docker scout cves [IMAGE]` | 列出所有 CVE 漏洞 |
| `docker scout recommendations [IMAGE]` | 升級建議（最強功能） |
| `docker scout compare [A] [B]` | 比較兩個 image |
| `docker scout sbom [IMAGE]` | 軟體物料清單 |
| `docker scout config organization [NAME]` | 設定組織 |

---

## 漏洞嚴重程度說明

| 等級 | 代碼 | 說明 | 建議處理 |
|------|------|------|---------|
| Critical | C | 嚴重漏洞，可能被遠端攻擊 | 立即修復 |
| High | H | 高風險，可能導致資料外洩 | 盡快修復 |
| Medium | M | 中等風險 | 排程修復 |
| Low | L | 低風險 | 可視情況處理 |

---

## 為什麼有些 Image 顯示「no base image」？

### Multi-stage Build + Scratch

使用 multi-stage build 搭配 `scratch` 的 image：

```dockerfile
# 第一階段：編譯
FROM golang:1.24-alpine AS builder
RUN go build -o server

# 第二階段：用空白映像檔
FROM scratch
COPY --from=builder /build/server /server
```

**最終 image 的內容**：
```
├── /server           ← 只有執行檔
├── /etc/ssl/certs/   ← CA 憑證
└── /usr/share/zoneinfo/
```

**沒有 OS、沒有 shell、沒有任何套件** → 漏洞為 0

### 比較

| Base Image | 套件數 | 漏洞數 | 大小 |
|------------|--------|--------|------|
| `ubuntu:22.04` | 200+ | 50+ | 77MB |
| `alpine:3.19` | 50+ | 10+ | 7MB |
| `scratch` | 0 | 0 | 0MB |

**結論**：使用 `scratch` 是最安全的配置，但只適用於可編譯成靜態執行檔的語言（Go、Rust）。
