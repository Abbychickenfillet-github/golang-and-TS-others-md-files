# Git Subtree Push 衝突解決指南

當 subtree push 遇到 `non-fast-forward` 錯誤時的處理流程。

---

## 問題場景

執行 `git subtree push` 時出現：

```
! [rejected] xxx -> main (non-fast-forward)
error: failed to push some refs to 'https://github.com/xxx.git'
hint: Updates were rejected because a pushed branch tip is behind its remote
```

**原因**：遠端 repo 有比本地 subtree 更新的 commits。

---

## 診斷步驟

### Step 1：Fetch 遠端資料

```bash
git fetch dashboard
```

### Step 2：查看遠端有哪些新 commits

```bash
# 查看遠端最近的 commits
git log dashboard/main --oneline -10

# 查看遠端有但本地沒有的 commits
git log --oneline dashboard/main ^HEAD -- | head -20
```

### Step 3：檢查特定 commit 的內容

```bash
git show <commit-hash> --stat
```

### Step 4：比較實際內容差異（重要！）

**只看 commits 不夠**，因為 commits 不同不代表內容不同。用 `git diff` 比較實際檔案：

```bash
# 比較本地 frontend 和遠端的實際內容差異
git diff HEAD:frontend/ dashboard/main: --stat

# 查看特定檔案的差異
git diff HEAD:frontend/ dashboard/main: -- Dockerfile

# 比較特定檔案的最後修改時間
git log -1 --format="%ci %s" HEAD -- frontend/src/xxx.tsx
git log -1 --format="%ci %s" dashboard/main -- src/xxx.tsx
```

**關鍵區別**：
- `git log` 比較 → 只看 commit 節點（可能內容相同但 commit 不同）
- `git diff` 比較 → 看實際檔案內容差異

---

## 解決方案

### 方案 A：Subtree Pull 合併（推薦）

如果遠端有重要變更需要保留：

```bash
git subtree pull --prefix=frontend dashboard main -m "Merge dashboard changes"
```

**常見錯誤**：
- `refusing to merge unrelated histories` - subtree 歷史不相關
- `'frontend' was never added` - subtree 沒有被正確 add

### 方案 B：Force Push（謹慎使用）

**只有在確認遠端變更不重要時才使用！**

```bash
# 先確認遠端沒有重要變更
git log dashboard/main --oneline -10

# Force push
git push dashboard $(git subtree split --prefix=frontend):main --force
```

### 方案 C：手動同步（最安全）

當 subtree pull 失敗時：

1. **Clone dashboard repo 到另一個目錄**
   ```bash
   git clone https://github.com/xxx/dashboard.git /tmp/dashboard
   ```

2. **複製需要的檔案**（如 `.github/workflows/`）
   ```bash
   cp -r /tmp/dashboard/.github ./frontend/
   ```

3. **Commit 後再 push**
   ```bash
   git add frontend/.github
   git commit -m "feat: sync GitHub Actions from dashboard"
   git subtree push --prefix=frontend dashboard main
   ```

---

## 實際案例記錄

### 2026-01-28 Dashboard Push 衝突

**情況**：
- 本地 monorepo 的 frontend 修改了 Dockerfile
- Dashboard repo 有 20+ 個新 commits，包含重要功能

**遠端獨有的重要 commits**：
```
a9a30d15 feat: add S3 + CloudFront deployment with GitHub Actions
402159ed feat: 新增電力需求管理與插座規格管理選單項目
79690beb feat: 新增 Role 權限管理功能 + bug 修復
```

**診斷過程**：
```bash
# 1. Fetch
git fetch dashboard

# 2. 查看差異
git log --oneline dashboard/main ^HEAD -- | head -20

# 3. 檢查關鍵 commit
git show a9a30d15 --stat
# 發現是 GitHub Actions 部署配置
```

**處理決策**：
- `a9a30d15` 是 dashboard 特有的部署配置 → 需要保留
- 不能直接 force push

**進一步診斷：比較實際內容（不只是 commits）**：
```bash
# 比較實際檔案差異
git diff HEAD:frontend/ dashboard/main: --stat
# 結果：30 files changed, 1007 insertions(+), 688 deletions(-)

# 比較特定檔案的修改時間
git log -1 --format="%ci" HEAD -- frontend/src/routes/recover-password.tsx
# 本地：2026-01-28（較新）

git log -1 --format="%ci" dashboard/main -- src/components/Common/SidebarItems.tsx
# Dashboard：2026-01-23（較新）
```

**實際內容差異分析**：

| 檔案 | 本地時間 | Dashboard 時間 | 較新的 |
|------|----------|----------------|--------|
| `recover-password.tsx` | 2026-01-28 | 2025-12-29 | 本地 |
| `SidebarItems.tsx` | 2026-01-21 | 2026-01-23 | Dashboard |
| `Dockerfile` | 2026-01-28 | 舊版 | 本地 |
| `.github/workflows/` | 不存在 | 2026-01-24 | Dashboard 獨有 |

**結論**：兩邊都有比較新的內容，需要合併！

**解決方式**：
1. 手動將 `.github/workflows/deploy-production.yml` 複製到 monorepo
2. Commit 後再執行 subtree push
3. 或接受兩邊獨立維護部署配置

**最終執行的步驟**：
```bash
# 1. 建立目錄並複製 GitHub Actions
mkdir -p frontend/.github/workflows
# 從 diff 中取得檔案內容，寫入本地

# 2. 執行 lint 和 build 測試
cd frontend && npm run lint && npm run build

# 3. Commit 變更
git add frontend/.github/workflows/deploy-production.yml
git commit -m "feat(frontend): sync S3 + CloudFront deployment workflow from dashboard"

# 4. Push 到 origin
git push origin feature/role-permission-improvements

# 5. Force push 到 dashboard（保留本地的所有變更 + 同步過來的 GitHub Actions）
git push dashboard $(git subtree split --prefix=frontend):main --force
```

**結果**：
- ✅ 保留本地的 Dockerfile 優化（nginx:1-alpine-slim）
- ✅ 保留本地的 PasswordInput 元件
- ✅ 保留本地的 recover-password 修復
- ✅ 同步 dashboard 的 GitHub Actions 部署腳本

---

## Subtree 最佳實踐

### 初始設定

```bash
# 正確的 subtree add（建立雙向關係）
git subtree add --prefix=frontend dashboard main --squash
```

### 日常同步

```bash
# 從遠端拉取變更
git subtree pull --prefix=frontend dashboard main --squash

# 推送變更到遠端
git subtree push --prefix=frontend dashboard main
```

### 注意事項

1. **定期同步** - 避免差異太大導致衝突
2. **單向修改** - 盡量只在 monorepo 修改，然後 push 到 subtree
3. **獨立配置** - 部署配置（CI/CD）可能需要各自維護
4. **記錄變更** - 每次 push 前檢查遠端是否有變更

---

## 常見錯誤處理

| 錯誤 | 原因 | 解決方案 |
|------|------|---------|
| `non-fast-forward` | 遠端有新 commits | Pull 後再 push，或確認後 force push |
| `refusing to merge unrelated histories` | 歷史不相關 | 用 `--squash` 或手動同步 |
| `was never added` | Subtree 沒有正確 add | 重新 `git subtree add --squash` |

---

## 相關指令速查

```bash
# 查看遠端設定
git remote -v

# Subtree push
git subtree push --prefix=<目錄> <remote> <branch>

# Subtree pull
git subtree pull --prefix=<目錄> <remote> <branch> --squash

# Subtree split（取得 subtree 的獨立 commit hash）
git subtree split --prefix=<目錄>

# Force push subtree
git push <remote> $(git subtree split --prefix=<目錄>):<branch> --force
```

---

## `--prefix` 參數說明

```bash
git subtree split --prefix=frontend
                         ↑
                    這是 monorepo 中的「目錄名稱」
                    不是 remote 名稱！
```

| 參數 | 意思 | 範例 |
|------|------|------|
| `--prefix=xxx` | monorepo 裡的目錄路徑 | `--prefix=frontend` |
| `<remote>` | Git remote 名稱（推送目標） | `dashboard` |

```
monorepo (clone2)
├── frontend/          ← --prefix=frontend 指的是這個目錄
├── backend-go/
├── official_website/
└── ...

Remote 設定：
dashboard → https://github.com/yutuo-tech/futuresign.dashboard.git
origin    → https://github.com/yutuo-tech/futuresign_backend.git
```

---

## `git archive` 指令

### 什麼是 git archive？

**Archive = 打包/歸檔**

從 Git 倉庫中提取特定版本的檔案，打包成 tar 或 zip。

### 用法

```bash
# 從遠端 repo 提取特定檔案
git archive --remote=<remote> <branch> <path> | tar -xf -

# 範例：從 dashboard 提取 GitHub Actions
git archive --remote=dashboard main .github/workflows/ | tar -xf - -C frontend/
```

### 參數說明

| 參數 | 說明 |
|------|------|
| `--remote=dashboard` | 從哪個 remote 提取 |
| `main` | 哪個 branch |
| `.github/workflows/` | 要提取的路徑 |
| `tar -xf -` | 解壓縮到當前目錄 |
| `-C frontend/` | 解壓縮到指定目錄 |

### 為什麼可能失敗？

```
error: git archive --remote is not supported
```

**原因**：GitHub 預設不支援 `git archive --remote`（安全考量）。

**替代方案**：
1. 用 `git show` 取得檔案內容
2. Clone 到臨時目錄後複製
3. 直接從 GitHub 網頁下載

---

## `--squash` 選項詳解

### 什麼是 Squash？

**Squash = 壓縮/擠壓**

把多個 commits 壓縮成一個單一的 commit。

### 為什麼 Subtree 要用 `--squash`？

```
不用 --squash：
monorepo                    subtree repo
    │                           │
    ├── commit A               ├── commit A
    ├── commit B               ├── commit B
    ├── commit C               ├── commit C
    └── ...100 個 commits       └── ...全部混在一起

用 --squash：
monorepo                    subtree repo
    │                           │
    ├── commit A               │
    ├── commit B               │
    ├── commit C               │
    └── ...100 個 commits       └── 1 個 "Squashed commit"
```

### 好處

| 優點 | 說明 |
|------|------|
| **歷史乾淨** | subtree repo 不會被 monorepo 的大量 commits 污染 |
| **避免衝突** | 減少 "unrelated histories" 問題 |
| **速度快** | 不需要重建整個 commit 歷史 |

### 使用方式

```bash
# Add 時使用 --squash
git subtree add --prefix=frontend dashboard main --squash

# Pull 時使用 --squash
git subtree pull --prefix=frontend dashboard main --squash
```

### 注意事項

- 使用 `--squash` 後，兩邊的 commit 歷史會**完全分離**
- 無法追溯單一 commit 來自哪裡
- 適合「monorepo 為主，subtree repo 為輔」的工作流程
