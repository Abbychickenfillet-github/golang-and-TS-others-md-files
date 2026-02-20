# AWS Amplify 與 amplify.yml 解釋

## 什麼是 AWS Amplify？

| 項目 | 說明 |
|------|------|
| **AWS Amplify** | AWS 的前端部署服務（類似 Vercel、Netlify） |
| **amplify.yml** | 告訴 Amplify 如何建置和部署你的專案 |
| **用途** | 自動部署前端網站到 AWS CDN |

---

## 本專案的 amplify.yml 位置

| 檔案 | 用途 |
|------|------|
| `frontend/amplify.yml` | 後台管理系統部署設定 |
| `official_website/amplify.yml` | 前台消費者網站部署設定 |

---

## frontend/amplify.yml 解釋

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci              # 安裝依賴（比 npm install 更快、更乾淨）
    build:
      commands:
        - echo "VITE_API_URL=$VITE_API_URL" >> .env.production  # 注入環境變數
        - npm run build       # 建置 Vite 專案
  artifacts:
    baseDirectory: dist       # 建置輸出在 dist 資料夾
    files:
      - '**/*'               # 部署 dist 裡所有檔案
  cache:
    paths:
      - node_modules/**/*    # 快取 node_modules 加速下次建置
```

### 各區塊說明

| 區塊 | 說明 |
|------|------|
| `version` | amplify.yml 格式版本 |
| `phases.preBuild` | 建置前要執行的指令（安裝依賴） |
| `phases.build` | 建置時要執行的指令 |
| `artifacts` | 建置完成後要部署的檔案 |
| `cache` | 要快取的路徑（加速下次建置） |

### npm ci vs npm install

| 指令 | 說明 |
|------|------|
| `npm install` | 根據 package.json 安裝，可能更新 lock 檔 |
| `npm ci` | 嚴格根據 package-lock.json 安裝，**更快、更一致** |

> CI/CD 環境推薦用 `npm ci`，確保每次建置結果一致。

---

## 部署流程圖

```
GitHub Push
     │
     ▼
AWS Amplify 偵測到變更
     │
     ▼
┌─────────────────────────────┐
│ preBuild: npm ci            │  ← 安裝依賴
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ build: npm run build        │  ← 建置專案（產生 dist/）
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ 部署 dist/ 到 Amplify CDN   │  ← 上線！
└─────────────────────────────┘
     │
     ▼
使用者可以存取新版網站
```

---

## 環境變數注入

```yaml
- echo "VITE_API_URL=$VITE_API_URL" >> .env.production
```

這行的意思是：
1. `$VITE_API_URL` 是在 AWS Amplify Console 設定的環境變數
2. 把它寫入 `.env.production` 檔案
3. Vite 建置時會讀取這個檔案

**為什麼要這樣做？**
- 因為 Vite 在建置時需要 `VITE_` 開頭的環境變數
- AWS Amplify 的環境變數不會自動變成 `.env` 檔案
- 所以要手動用 `echo` 寫進去

---

## 類似服務比較

| 服務 | 設定檔 | 特色 |
|------|--------|------|
| **AWS Amplify** | `amplify.yml` | AWS 生態系整合 |
| **Vercel** | `vercel.json` | Next.js 最佳支援 |
| **Netlify** | `netlify.toml` | 簡單易用 |
| **GitHub Pages** | `.github/workflows/*.yml` | 免費、適合靜態網站 |

---

## 與 Docker 的差異

| 項目 | Docker | AWS Amplify |
|------|--------|-------------|
| **用途** | 容器化部署（前後端都可以） | 前端靜態網站部署 |
| **設定檔** | `docker-compose.yml` | `amplify.yml` |
| **運行環境** | 容器（任何地方） | AWS CDN |
| **適合** | 後端 API、完整應用 | 純前端 SPA |

**本專案的部署方式：**
- **frontend / official_website** → AWS Amplify（前端靜態網站）
- **backend-go** → Docker / EC2（後端 API）

---

*建立日期：2026-01-23*
