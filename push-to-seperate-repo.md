# 分離 Repo 同步指南

本文件說明如何從 monorepo (clone2) 同步變更到分離出去的獨立 repo。

## Repo 對應關係

| Monorepo 目錄 | 獨立 Repo | 本地路徑 |
|---------------|-----------|----------|
| `frontend/` | [futuresign.dashboard](https://github.com/yutuo-tech/futuresign.dashboard.git) | `C:\coding\futuresign.dashboard` |
| `official_website/` | [future_sign.official-website](https://github.com/yutuo-tech/future_sign.official-website.git) | `C:\coding\futuresign.official_website` |

## 背景說明

- 這些獨立 repo 是透過 git subtree 技術從 monorepo 分離出來的
- `seperate_repo` 分支已經移除了 `frontend/` 和 `official_website/` 目錄
- 如果在 monorepo 有相關變更需要同步，應該直接在獨立 repo 中進行

## 同步流程

### 從 Monorepo 同步到 Dashboard

如果 monorepo 中有 frontend 相關的變更需要同步：

```bash
# 1. 複製變更的檔案到 dashboard repo
cp -r C:/coding/futuresign_monorepo/frontend/src/components/XXX C:/coding/futuresign/futuresign.dashboard/src/components/

# 2. 在 dashboard repo 提交並推送到 main
cd "C:\coding\futuresign\futuresign.dashboard"
git add .
git commit -m "feat: 從 monorepo 同步 XXX 功能"
git push origin main
```

### 從 Monorepo 同步到 Official Website

```bash
# 1. 複製變更的檔案
cp -r C:/coding/futuresign_monorepo/official_website/src/components/XXX C:/coding/futuresign/futuresign.official_website/src/components/

# 2. 在 official_website repo 提交並推送到 main
cd "C:\coding\futuresign\futuresign.official_website"
git add .
git commit -m "feat: 從 monorepo 同步 XXX 功能"
git push origin main

# 如果遠端有新的變更，先 pull 再 push
git pull origin main --rebase
git push origin main
```

**重要：直接推送到 main 分支，不需要開新分支**

## 注意事項

1. **不要在 monorepo 直接修改 frontend/official_website**
   - 這些目錄已從 `seperate_repo` 分支移除(尚未)
   - 所有前端開發應該在獨立 repo 進行

2. **路徑差異**
   - Monorepo: `frontend/src/...`
   - Dashboard: `src/...`（沒有 frontend 前綴）

3. **環境變數**
   - 獨立 repo 有自己的 `.env` 設定
   - 同步時注意不要覆蓋環境變數檔案

## 相關指令

```bash

# 檢查 dashboard 狀態
cd C:\coding\futuresign\futuresign.dashboard
git status

# 檢查 official_website 狀態
cd C:/coding/futuresign.official_website
git status
```
MONOREPO的GO相關的修改請你幫我藉由
Everytime you make sure the code has no build errors, after that, you push the code to the remote.
And then push to counterpart to where it belongs.

backend-go part:
push to Go_production
Since the monorepo folder structure includes not only backend, so we can use backend-go-updates branch to interface the diff of code.
 後端的可能就git cherry
  pick或是merge進去backend-go-updates最終目的地是Go _production(這裡會自己部屬)要小心然後不要推錯了