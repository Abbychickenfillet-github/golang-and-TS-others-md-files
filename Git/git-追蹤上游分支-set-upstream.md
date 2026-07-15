# git 追蹤上游分支（set-upstream / tracking branch）

> 「上游分支（upstream / tracking branch）」= 本地分支要對應的遠端分支。設定好之後，`git push`、`git pull` 就不用每次都打 `origin 分支名`。

## 指令名稱

核心指令是 **`git branch --set-upstream-to`**，簡寫 **`git branch -u`**。

```bash
# 1) 幫「當前分支」設定上游（分支與遠端分支都已存在）
git branch --set-upstream-to=origin/main
git branch -u origin/main                 # 簡寫，等價

# 指定某個分支（不是當前分支）
git branch -u origin/main my-local-branch

# 2) 第一次 push 時「順便」設定上游 —— 最常用
git push -u origin feature-x              # -u = --set-upstream
#   之後在該分支直接 git push / git pull 即可

# 3) 查看每個本地分支追蹤哪個上游
git branch -vv
#   輸出範例： * main  1a2b3c4 [origin/main] commit message
#                                ^^^^^^^^^^^ 中括號內就是上游
```

## 如何「找出／查看」上游分支

```bash
# 印出「當前分支」的上游名稱（最精準，適合寫進 script）
git rev-parse --abbrev-ref @{u}          # @{u} = @{upstream} 的簡寫
#   輸出例：origin/main

# 列出所有本地分支 → 各自上游
git branch -vv

# status 看（含 ahead/behind）
git status -sb
#   ## main...origin/main [ahead 1]

# 全部分支對應上游，一行一個
git for-each-ref --format='%(refname:short) -> %(upstream:short)' refs/heads

# 從 config 底層讀
git config branch.main.remote     # → origin
git config branch.main.merge      # → refs/heads/main
```

> `@{u}` 若當前分支沒設上游會報 `fatal: no upstream configured`——這本身也是一種「有沒有設上游」的確認方式。

## 常見情境

| 情境 | 指令 |
|------|------|
| 本地已有分支，遠端也有同名分支，想建立追蹤 | `git branch -u origin/<branch>` |
| 新分支第一次推上遠端並設追蹤 | `git push -u origin <branch>` |
| 想解除追蹤 | `git branch --unset-upstream` |
| 確認目前追蹤狀態 | `git branch -vv` 或 `git status`（會顯示 ahead/behind） |

## 小提醒

- 設好上游後，`git status` 才會出現 `Your branch is ahead/behind 'origin/xxx' by N commits`。
- 沒設上游時直接 `git push` 會報 `fatal: The current branch has no upstream branch`，照它給的 `git push --set-upstream origin <branch>` 做即可（就是 `-u`）。
- `--set-upstream`（無 `-to`）是舊寫法、已不建議；現在用 `--set-upstream-to=` 或 `-u`。

## 相關筆記
- [[git-split-commit-and-diverged]]（分支與上游 diverged 時怎麼處理）
- [[git-diff-notes]]
