# 拆分 Commit 工作流 + 分支 Diverged 處理

#git #reset #add-p #hunk #diverged #rebase #incoming #outgoing

## 拆分 Commit 完整流程

當一個 commit 混了多個功能的修改，想拆成多個獨立 commit：

```bash
# Step 1: 撤銷 commit，修改保留在 staged（綠色）
git reset --soft HEAD~1

# Step 2: 全部退回 unstaged（紅色）
git reset HEAD .

# Step 3: 用 -p 互動式選擇要暫存的 hunk
git add -p EventCouponSettingsPage.tsx

# Step 4: 每選完一組相關的 hunk 就 commit
git commit -m "feat: 第一個功能"

# Step 5: 重複 Step 3-4 直到所有修改都 commit
git add -p EventCouponSettingsPage.tsx
git commit -m "fix: 第二個修正"

# Step 6: 最後剩餘的修改直接 add + commit
git add .
git commit -m "refactor: 第三個重構"
```

### 為什麼不直接用 `git reset --mixed`？

`git reset --mixed HEAD~1` = `--soft` + `reset HEAD .` 的效果合在一起。
兩步拆開寫只是為了理解流程，實際上可以一步完成：

```bash
# 這一步等於 --soft + reset HEAD .
git reset --mixed HEAD~1
# 或省略 --mixed（它是預設值）
git reset HEAD~1
```

### Hunk 互動選項快速參考

詳見 [GIT_ADD_P_TUTORIAL.md](GIT_ADD_P_TUTORIAL.md)

| 選項 | 說明 |
|------|------|
| `y` | 暫存這個 hunk |
| `n` | 跳過 |
| `s` | 分割成更小的 hunk（修改之間需有 3+ 行未改的 code） |
| `e` | 手動編輯 hunk |
| `q` | 退出 |

---

## 分支 Diverged（分歧）

### 什麼是 Diverged？

```
         C (origin/feat-branch)  ← 遠端多了一個 commit
        /
A --- B
        \
         D --- E (本地 feat-branch)  ← 本地也有新的 commit
```

本地和遠端**從同一個點分叉**，各自有對方沒有的 commit，就是 diverged。

### 怎麼發生的？

常見原因：
1. **別人 push 了新 commit**，而你本地也繼續 commit 了
2. **GitHub 上合併了 PR**（產生 merge commit），本地分支繼續開發
3. **你在另一台電腦 push**，回到這台後又 commit 了
4. **用了 `--force` push 或 rebase** 改寫了遠端歷史

### 解法：Rebase

```bash
# 先抓遠端最新
git fetch origin

# 把本地 commit 接到遠端最新的後面
git rebase origin/feat-branch
```

Rebase 後的結果：
```
A --- B --- C --- D' --- E'
              ↑          ↑
           遠端的     本地的（hash 改了）
```

因為 rebase 改寫了 commit hash（D→D', E→E'），push 時需要：

```bash
# --force-with-lease 比 --force 安全
# 它會確認遠端沒有在你 fetch 之後又被別人 push
git push origin feat-branch --force-with-lease
```

詳見 [--force-with-lease&--force.md](--force-with-lease&--force.md)

### 解法比較

| 方式 | 結果 | 適用場景 |
|------|------|---------|
| `git rebase` | 線性歷史，乾淨 | 自己的 feature branch |
| `git pull`（= fetch + merge） | 產生 merge commit | 多人共用的分支 |

---

## VS Code Source Control：Incoming / Outgoing Changes

在 VS Code 的 Source Control 面板（Git Graph），你會看到：

### Outgoing（向上箭頭 ↑）
- **你本地有，但遠端沒有的 commit**
- = `git log origin/branch..HEAD` 的結果
- 需要 `git push` 推上去

### Incoming（向下箭頭 ↓）
- **遠端有，但你本地沒有的 commit**
- = `git log HEAD..origin/branch` 的結果
- 需要 `git pull` 或 `git rebase` 拉下來

### Diverged 時的顯示

當分支 diverged，你會**同時看到 incoming 和 outgoing**：

```
↑ 5 outgoing  （你本地的 5 個 commit 還沒 push）
↓ 1 incoming  （遠端有 1 個你沒有的 commit）
```

這就是你遇到的情況：official_website 顯示 `have diverged, and have 5 and 1 different commits each`

### 處理流程

```bash
# 1. fetch 更新遠端資訊（VS Code 也會自動 fetch）
git fetch origin

# 2. rebase 讓本地 commit 接到遠端後面
git rebase origin/feat-branch

# 3. rebase 後 incoming 消失，outgoing 變成 6（5 + 遠端那 1 個已整合）
# 4. force push
git push origin feat-branch --force-with-lease

# 5. 完成後 incoming = 0, outgoing = 0
```

---

*最後更新：2025-03-11*
