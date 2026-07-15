---
title: GitHub Actions CI/CD：ghcr、Runner 與 Docker 映像檔管理
type: topic-note
source: Gemini
tags: [gemini, github-actions, ci-cd, docker, ghcr, deployment, 面試]
sources:
  - https://gemini.google.com/app/6bc6044eac754f97
updated: 2026-07-12
---

# GitHub Actions CI/CD：ghcr、Runner 與 Docker 映像檔管理

> 這篇整理自一連串 debug GitHub Actions workflow 的問答：從 `shell: /usr/bin/bash -e {0}` 是什麼，到映像檔名稱大小寫錯誤、`ghcr.io` 是什麼、為何在 `ubuntu-latest` 上跑、`$GITHUB_ENV` 動態環境變數，最後到映像檔容量爆炸的清理與 Dockerfile 減肥。

## 重點整理

### 1. `shell: /usr/bin/bash -e {0}` 是「執行模板」不是命令

這行常出現在 CI/CD 的 YAML、Makefile、VS Code `tasks.json` 中，用來告訴系統「要用哪個 shell、附加什麼選項、命令放哪」。

- `shell:` — <mark style="background: #ADCCFFA6;">標籤（key）</mark>，標明後面是 shell 的路徑與參數，是設定檔語法、不是命令的一部分。
- `/usr/bin/bash` — Bash 執行檔的<mark style="background: #FFF3A3A6;">絕對路徑</mark>。寫全路徑（而非只寫 `bash`）可避免依賴 `PATH`，讓行為在不同環境一致。
- `-e` — <mark style="background: #FF5582A6;">exit immediately（fail-fast）</mark>：腳本中任一命令失敗（回傳非 0），整個腳本立刻停止，避免「build 失敗還硬跑 deploy」。
- `{0}` — <mark style="background: #FFB8EBA6;">預留位置（placeholder）</mark>，由父程式（CI/CD、make、VS Code）動態替換成實際要執行的命令或腳本路徑。

### 2. `/usr/` 不是 user，是 Unix System Resources

<mark style="background: #FF5582A6;">最常見的誤解：`/usr/` 不是 user 的縮寫</mark>，而是 **Unix System Resources**。

| 目錄 | 意義 | 對應 Windows |
|---|---|---|
| `/usr` | 所有使用者共用的程式、函式庫（如 `/usr/bin/bash`） | `C:\Program Files` + `System32` |
| `/home/<username>` | 你個人的家目錄 | `C:\Users\Abby` |

### 3. `ghcr.io` = GitHub Container Registry；OCI = Open Container Initiative

- <mark style="background: #ADCCFFA6;">`ghcr.io`</mark>：GitHub 官方的 Docker 映像檔託管服務，作用等同 Docker Hub（`docker.io`），但與 Repo / Actions 緊密整合，登入時可用 `registry: ghcr.io` + `${{ secrets.GITHUB_TOKEN }}`。
- <mark style="background: #ADCCFFA6;">OCI（Open Container Initiative）</mark>：由 Docker、Google、Red Hat、AWS 共同制定的**容器標準**（不是產品），定義 Image Spec（映像檔怎麼打包）與 Runtime Spec（容器怎麼執行）。

### 4. 陷阱：映像檔名稱必須全小寫

錯誤訊息：

```
invalid reference format: repository name (Abbychickenfillet-github/...) must be lowercase
```

<mark style="background: #FF5582A6;">這是 OCI Image Spec 的硬性規定</mark>：container registry（ghcr.io / Docker Hub）的映像檔路徑**不允許大寫字母**。問題來源通常是 GitHub 使用者名稱含大寫（`Abbychickenfillet-github` 的 `A`）。

### 5. `github.repository` ≠ `github.repository_owner`

| 變數 | 內容 | 範例 |
|---|---|---|
| `${{ github.repository_owner }}` | 只有擁有者名稱 | `Abbychickenfillet-github` |
| `${{ github.repository }}` | 擁有者/儲存庫全名 | `Abbychickenfillet-github/next-one-time-tracker` |

<mark style="background: #FFF3A3A6;">兩個都可能含大寫</mark>，用在 `ghcr.io` 路徑前都要先轉小寫。

### 6. 正解：用 `$GITHUB_ENV` 動態轉小寫，不要改帳號

<mark style="background: #BBFABBA6;">推薦做法</mark>：在 push 步驟前新增一步，把名稱轉小寫寫入 `$GITHUB_ENV`：

```yaml
# 【新增步驟】把 repository 名稱轉小寫，存進環境變數
- name: Set repository name to lowercase
  run: echo "REPO_LC=$(echo '${{ github.repository }}' | tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV

# push 時改用 ${{ env.REPO_LC }}
- name: Push to GitHub Container Registry
  run: |
    docker tag next-one-app ghcr.io/${{ env.REPO_LC }}/next-one-app:latest
    docker push ghcr.io/${{ env.REPO_LC }}/next-one-app:latest
```

重點釐清：

- <mark style="background: #FF5582A6;">`name:` 和 `run:` 屬於同一個 step</mark>，不要把 `run:` 前面多加一個 `-`（那會拆成兩個 step，語法錯誤）。
- `>> $GITHUB_ENV` 是 Actions 的「魔法」：把 `KEY=value` 附加進特殊檔案，後續所有 step 都能用 `${{ env.KEY }}` 讀到。
- <mark style="background: #BBFABBA6;">不需要</mark>去 GitHub 網頁 Settings → Variables 手動設定；那是「靜態寫死」，而 `run: ... >> $GITHUB_ENV` 是「動態產生」，帳號名變了也不用手動維護。
- <mark style="background: #D2B3FFA6;">不影響 Zeabur</mark>：`REPO_LC` 只活在那台臨時 runner，Job 結束就銷毀，沒改程式碼、沒改 repo 名稱。
- <mark style="background: #FF5582A6;">千萬別為此改 GitHub 使用者名稱</mark>：會導致所有 `git remote`、`ghcr.io` 路徑、外部連結、依賴全部失效。

### 7. `runs-on: ubuntu-latest`：跑在雲端 runner，不是你的電腦

`runs-on:` 指的是 GitHub 在雲端配給你的一台**臨時、乾淨的虛擬機**，Job 結束就自動銷毀——<mark style="background: #FFF3A3A6;">跟你本機用 Windows 還是 Mac 無關</mark>。

為什麼業界偏好 Ubuntu（Linux）：

- <mark style="background: #BBFABBA6;">與生產環境一致</mark>：Docker base image（如 `node:18-alpine`）與部署目標（Zeabur / Vercel / AWS）幾乎都是 Linux，減少「我電腦能跑、伺服器不行」。
- <mark style="background: #FFB8EBA6;">成本</mark>：Ubuntu 開源免費最便宜；免費額度中 **macOS runner 分鐘數消耗是 Linux 的 10 倍**，Windows 也較貴。
- 速度快、工具相容（Bash / Docker / Nginx / curl / ssh 原生為 Linux 設計）。

只有 build iOS/macOS App 才用 `macos-latest`、build Windows 桌面程式才用 `windows-latest`。

### 8. 映像檔容量爆炸怎麼辦（Image Accumulation）

每次 push 都 build 新映像檔，幾週就塞爆數十 GB。三個方向解決：

**策略一：少推冗餘 tag。** 同時推 `latest` 和 `${{ github.sha }}` 時——`latest` 是指針，被覆蓋後舊的會變成 `<none>`（<mark style="background: #ADCCFFA6;">dangling / untagged image，懸空映像檔</mark>），容量還霸佔著；`${{ github.sha }}` 則永久唯一、每次多一版。日常開發可只推 `latest`。

**策略二：遠端設自動清理規則（終極大招）。** GHCR：Packages → 該映像檔 → Package settings → Lifecycle rules，設定「刪除 untagged 映像檔」或「只保留最近 N 版」。Docker Hub 免費版會自動清超過一個月沒被 pull/push 的映像檔。

**策略三：用 Multi-stage Build 把體積縮 10 倍。** Next.js 直接用 `node:18` build 會把 devDependencies 全包進去（>1GB）。改用官方 `output: 'standalone'` + 多階段建置，只複製執行真正需要的檔案，最終約 150MB：

```dockerfile
# 階段1：安裝依賴
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 階段2：建置
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build          # next.config.js 需設 output: 'standalone'

# 階段3：最終運行環境（只複製必要檔案，體積超小）
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

搭配 `next.config.js`：

```javascript
module.exports = { output: 'standalone' }
```

<mark style="background: #FFF3A3A6;">本機清理</mark>：`docker system prune -a --volumes` 洗掉累積的快取與舊 layer。

### 快問快答（自我測驗）

- `-e` 選項的作用？ → <mark style="background: #BBFABBA6;">任一命令失敗就立刻停止整個腳本（fail-fast）。</mark>
- `/usr/` 是什麼縮寫？ → <mark style="background: #BBFABBA6;">Unix System Resources，不是 user。</mark>
- 為什麼映像檔名稱錯誤？ → <mark style="background: #BBFABBA6;">OCI 規定必須全小寫，帳號名含大寫 A。</mark>
- 怎麼修最好？ → <mark style="background: #BBFABBA6;">用 `tr` 轉小寫寫入 `$GITHUB_ENV`，不要改帳號名。</mark>
- `latest` 被覆蓋後舊的去哪？ → <mark style="background: #BBFABBA6;">變成 untagged/dangling 映像檔，容量還在。</mark>

## 相關筆記

- Docker 觀念：[[docker-引擎-context-image-container-觀念]]、[[Nginx-反向代理與動靜分離]]
- 部署主機選型：[[Zeabur-主機遷移-DeepSeek-API與費用比較]]、[[DigitalOcean-vs-GCP-主機選型與PostgreSQL部署]]
- C 槽/映像檔清理：[[Docker問題prune+壓縮vhdx(虛擬磁碟)解決硬碟爆掉]]

## 各對話來源

### Bash 命令模板與選項解析（2026-07）— https://gemini.google.com/app/6bc6044eac754f97

**使用者：** `shell: /usr/bin/bash -e {0}` 這是什麼意思？

**Gemini：** 說明這是執行 shell 命令的「模板」（key + 路徑 + 選項 + placeholder），拆解 `shell:` / `/usr/bin/bash` / `-e`（fail-fast） / `{0}`（由父程式替換），並以 Makefile 舉例。

**使用者：** （貼上 GitHub Actions 錯誤）`repository name ... must be lowercase`，這是什麼？

**Gemini：** 錯誤原因是映像檔名稱含大寫（`Abbychickenfillet-github`），OCI 規定必須小寫；提供「新增 step 用 `tr` 轉小寫寫入 `$GITHUB_ENV`」與「直接寫死小寫」兩解法。

**使用者：** `ghcr` 是啥？（貼上完整 workflow）我沒有 `github.repository_owner`，會等於 `github.repository` 嗎？

**Gemini：** `ghcr.io` = GitHub Container Registry；`github.repository`（owner/repo）≠ `github.repository_owner`（只有 owner），兩者用在 ghcr 路徑前都要轉小寫，示範 `REPO_LC` 寫法。

**使用者：** 我又不是 Ubuntu，為什麼要在 `ubuntu-latest` 上跑？你教育我一下。

**Gemini：** `runs-on` 是雲端臨時 runner，不是本機；業界偏好 Linux 是因與生產環境一致、成本低（macOS runner 貴 10 倍）、速度快、工具相容；只有 build iOS/Windows 桌面程式才換 runner。

**使用者：** `/usr/` 跟 user 有關係嗎？我沒在 Makefile 定義 shell。OCI 是什麼縮寫？轉小寫會影響 Zeabur 嗎？直接改 GitHub 使用者名稱會怎樣？`env.REPO_LC` 是要設環境變數嗎？

**Gemini：** `/usr/` = Unix System Resources（非 user）；OCI = Open Container Initiative；`REPO_LC` 只活在 runner 不影響 Zeabur；強烈不建議改帳號名（remote / ghcr 路徑 / 連結全失效）；`run: ... >> $GITHUB_ENV` 本身就是動態設環境變數、不必去 Settings 手動設。並修正 `name:`/`run:` 應屬同一 step 的語法錯誤。

**使用者：** 每次程式碼一變就有新 image 要託管，容量太爆炸了吧！我最近才用 `docker builder prune -a` 清掉 23.8GB。

**Gemini：** 這叫 Image Accumulation。三策略：①少推冗餘 tag（`latest` 覆蓋後舊的變 dangling）；②遠端設 Lifecycle rules 自動刪 untagged / 只留最近 N 版；③用 Next.js `output: 'standalone'` 多階段建置把體積從 ~1GB 縮到 ~150MB；本機定期 `docker system prune -a --volumes`。
