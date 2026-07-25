---
title: git filter-repo — 重寫 Git 歷史的工具
type: topic-note
source: Gemini
tags: [gemini, git, git-filter-repo, 資安, api-key]
sources:
  - https://gemini.google.com/app/68ed44a64673999c
  - https://gemini.google.com/app/d41455c1d5207799
updated: 2026-07-23
---

# git filter-repo — 重寫 Git 歷史的工具

## 它是什麼？

`git filter-repo` 是一個用來**批量重寫 Git 歷史**的工具。

Git 的每個 commit 都是不可變的快照，你沒辦法直接「編輯」某個舊 commit 的內容。`filter-repo` 的做法是：**從頭重新建立所有 commit**，在過程中套用你指定的規則（替換文字、刪除檔案等），產生一條全新的歷史鏈。

### 跟 `git rebase -i` 的差別

`-i` = `--interactive`，開啟互動式編輯器讓你逐一選擇每個 commit 要怎麼處理（pick / edit / squash / drop 等）。

| 工具 | 適用場景 | 範圍 |
|------|---------|------|
| `git rebase -i` | 修改最近幾個 commit（改訊息、合併、刪除、重排） | 少量 commit |
| `git filter-repo` | 從所有歷史中移除敏感資料 | 整個 repo 歷史 |

---

## 安裝

```bash
pip install git-filter-repo
```

安裝後可以直接當 git 子命令使用：`git filter-repo ...`

---

## 常用功能

### 1. 替換歷史中的敏感文字

最常見的用途：不小心把密碼 commit 進去了，需要從所有歷史中清除。

**建立替換規則檔** (`expressions.txt`)：

```
原始文字==>替換文字
```

> 注意：分隔符是 `==>` （兩個等號加一個大於號）

**範例**：

```
my-secret-password==><PASSWORD>
api-key-12345==><API_KEY>
```

**執行替換**：

```bash
git filter-repo --replace-text expressions.txt --force
```

這會重寫所有 commit，把歷史中所有出現 `my-secret-password` 的地方都換成 `<PASSWORD>`。

### 2. 從歷史中刪除特定檔案

```bash
# 從所有歷史中移除 .env 檔案
git filter-repo --path .env --invert-paths --force
```

**三個參數解釋**：

| 參數 | 說明 |
|------|------|
| `--path .env` | 選取路徑 `.env`（預設行為是「只保留」這個路徑） |
| `--invert-paths` | 反轉選取邏輯：從「只保留」變成「排除」。搭配 `--path` 就變成「從所有歷史中刪除 `.env`」 |
| `--force` | 強制執行。`filter-repo` 預設會拒絕在非全新 clone 的 repo 上執行，加 `--force` 跳過這個檢查 |

> 如果不加 `--invert-paths`，`--path .env` 的意思會變成「**只保留** `.env`，刪掉其他所有檔案」——完全相反。

### 3. 只保留特定資料夾（拆分 repo）

```bash
# 只保留 backend/ 資料夾的歷史
git filter-repo --path backend/ --force
```

---

## 重要注意事項

### 1. 所有 commit hash 都會改變

因為是重新建立 commit，所以每個 commit 的 hash 都會變。這代表：
- 其他人的本地 clone 會跟遠端不同步
- 必須用 `git push --force` 推上去
- 其他協作者需要重新 clone

### 2. 會自動移除 remote

`filter-repo` 執行後會**自動刪除 `origin` remote**，這是一個安全機制，防止你不小心把清洗前的 ref 推上去。需要手動加回：

```bash
git remote add origin https://github.com/your/repo.git
```

### 3. 必須用 `--force` 推送

```bash
# filter-repo 改了所有 ref，--force-with-lease 會被拒絕
# 必須用 --force
git push --force origin main
```

### 4. GitHub 快取

GitHub 可能會暫時快取舊的 commit 物件。如果是高敏感資料，可以聯繫 GitHub Support 請他們清除快取。

---

## 實際案例：清洗 Abby-notes repo

### 情境

筆記中不小心寫了明文的 MySQL 密碼和 Superuser 帳密，需要從所有歷史中移除。

### 步驟

**1. 先在本地把明文替換成佔位符**（用編輯器或 Claude 幫忙）

**2. Commit 替換結果**

```bash
git add -A
git commit -m "security: 將所有明文密碼替換為佔位符"
```

**3. 建立替換規則檔**

```bash
cat > /tmp/expressions.txt << 'EOF'
my-db-password==><MYSQL_PASSWORD>
admin@company.com==><SUPERUSER_EMAIL>
admin-password==>password=<SUPERUSER_PASSWORD>
EOF
```

**4. 執行 filter-repo**

```bash
git filter-repo --replace-text /tmp/expressions.txt --force
```

**5. 驗證歷史已清洗**

```bash
# 搜尋所有歷史中是否還有密碼
git log --all -p | grep "my-db-password"
# 應該回傳 0 筆
```

**6. 加回 remote 並 force push**

```bash
git remote add origin https://github.com/your/repo.git
git push --force origin main
```

---

## 替換規則檔語法

```
# 基本替換（literal 字串）
原始文字==>替換文字

# 使用正則表達式（regex: 前綴）
regex:password=\w+==>password=<REDACTED>

# 整行替換為空（刪除）
要刪除的文字==>
```

---

## 實際案例二：GCP Service Account API Key 外洩(2026-07-21，來源 Gemini)

### 情境
工作日誌第 446 行不小心把一把 GCP service account API key 明文寫進去、推上了 GitHub。

### 處理流程
(a) <mark style="background: #FF5582A6;">立刻到正確位置撤銷(revoke)舊金鑰</mark>：⚠️ 存疑／更正 — Gemini 一開始沒講清楚「正確位置」，Abby 誤以為要在 **Google AI Studio**（管理 Gemini API key 的地方）找，Gemini 後來才更正：GCP service account key 要到 **Google Cloud Console**（`console.cloud.google.com`）撤銷，Google AI Studio 只管 Gemini API key，兩者是不同系統、別搞混。
(b) 到 Console 撤銷舊金鑰、建立新金鑰。
(c) 用本篇上方的 `git filter-repo --replace-text` 把整個 commit 歷史中的舊 key 值替換成佔位符（如 `<GCP_API_KEY>`），再 `git push --force` 覆蓋遠端歷史，做法與上方「實際案例：清洗 Abby-notes repo」一致。
(d) <mark style="background: #FFF3A3A6;">核心觀念</mark>：光刪掉最新一次 commit 裡的 key 沒有用——只要 key 曾經出現在任何一個歷史 commit，任何人 clone 整個 repo 歷史都挖得到；一定要用 `filter-repo` 重寫「所有」歷史，而不是只改當下這份檔案。

### 各對話來源
- 「API Key Exposed on GitHub」— https://gemini.google.com/app/68ed44a64673999c
  - 使用者：工作日誌 446 行有一把 GCP service account API key（外洩）。
  - Gemini：因為已推上 GitHub，最重要的是立刻在 Google Cloud Console 撤銷、建立新金鑰，並從 commit history 移除。
  - 使用者：確認要用 git filter-repo 把 key 值從所有 commit 中刪掉、換成佔位符，重寫歷史後 force push？
  - Gemini：確認做法正確。
  - 使用者：確認撤銷金鑰的位置是不是在 Google AI Studio？
  - Gemini：更正——AI Studio 只管 Gemini API key；GCP service account key 要到 Google Cloud Console（console.cloud.google.com）。

## 實際案例三：Google AI Studio Key 外洩(TimeLog 專案)＋ Zeabur 主機淪為挖礦跳板(2026-07-23，來源 Gemini)

### 情境
專案(TimeLog)已停用很久，但 Google AI Studio 儀表板仍顯示大量 API 請求且伴隨嚴重錯誤；同時 Zeabur 上掛的一台 Server CPU 長期跑滿 2000m/2000m。

### 判讀重點
(e) <mark style="background: #FF5582A6;">403／429 錯誤代表 Key 已外洩</mark>：`403 Forbidden` 通常代表該 API Key 嘗試訪問未授權資源或已被 Google 停權；`429 TooManyRequests` 代表請求頻率超過 Free Tier 上限。本人明明沒在用卻大量出現這兩種錯誤，幾乎可確定 Key 已外洩、正被他人或機器人盜用。
(f) <mark style="background: #ADCCFF;">常見外洩管道三種</mark>：①GitHub/GitLab 提交過濾不周(把含 Key 的 `.env` 或程式碼推上公開倉庫)；②前端代碼暴露(直接在前端 JS 呼叫 API，Key 寫在客戶端，開 DevTools 就看得到)；③部署環境(如 Vercel、Zeabur)的 log 或公開設定洩漏。
(g) <mark style="background: #BBFABB;">立即處置</mark>：刪除舊 Key(Google AI Studio → API Keys → Delete) → 重新產生新 Key 並改用環境變數(`.env` + `.gitignore`，絕不寫死在代碼裡) → 長期應改用後端代理，不讓前端直接持有 Key。
(h) <mark style="background: #FF5582A6;">Zeabur CPU 跑滿 2000m/2000m 是危險訊號</mark>：結合 API Key 外洩一起看，極可能是駭客利用該主機做大量 API 請求或挖礦，也可能是程式陷入死迴圈；若該專案已無需使用，應立即到 Zeabur「Settings → 頁面最底部 Danger Zone → Delete Server」徹底刪除(會移除該主機上所有資料與服務，且無法復原)，比只 Suspend 單一 Service 更徹底。
(i) <mark style="background: #D2B3FF;">Zeabur 安全部署提醒</mark>：Key 一律放進 Zeabur 的 Variables(環境變數)而非寫死在代碼；定期檢查 Monitoring 分頁的 CPU／流量是否有異常突發；若不續用該主機，記得到 Settings 關閉 Auto-renew(自動續約)。

### 各對話來源
- 「API Key 外洩與安全防護」— https://gemini.google.com/app/d41455c1d5207799
  - 使用者：為什麼我的專案都停用那麼久了還是有 api error，我一直被提醒說我的 api key 好像外洩。
  - Gemini：分析 Google AI Studio 儀表板的 403/429 錯誤，判斷 Key 已外洩，並給出刪除舊 Key、改用環境變數的步驟。
  - 使用者：zeabur 的專案怎麼停掉。
  - Gemini：說明 Suspend 單一 Service vs. Settings → Danger Zone → Delete Server 兩種做法，並提醒 CPU 100% 可能是駭客利用主機挖礦或大量請求。

## 參考資料

- [git-filter-repo GitHub](https://github.com/newren/git-filter-repo)
- [GitHub 官方建議](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)（GitHub 推薦用 `git filter-repo` 取代舊的 `git filter-branch`）
- [Google Cloud — Revoke and rotate service account keys](https://cloud.google.com/iam/docs/keys-list-get) — 與 GCP 官方文件一致，2026-07-21 查證
- Google AI Studio 403/429 錯誤語意與 Zeabur Danger Zone／Variables 介面行為 — 以 Gemini 回答為準，未另外查證官方文件，查證於 2026-07-23，若介面已改版請以實際畫面為準
