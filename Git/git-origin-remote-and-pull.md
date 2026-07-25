# Git Remote 與 Pull 語法

## git pull 正確語法

```bash
git pull origin stage
#      ^^^^^^ ^^^^^
#      remote branch
```

**不是** `git pull origin/stage`。`origin/stage` 是本地的遠端追蹤引用，`git pull` 要的格式是 `<remote> <branch>`，分開寫。

## 什麼是 remote？

remote 就是遠端 repo 的別名。`origin` 是 `git clone` 時自動取的預設名稱。

```bash
git remote -v   # 查看所有 remote 和對應的 URL
```

99% 的情況只有一個 remote 叫 `origin`，所以不用想太多。

## 常用指令

```bash
git fetch origin          # 從遠端抓最新（不合併）
git pull origin stage     # fetch + merge（拉最新並合併）
git push origin stage     # 推到遠端
git push -u origin 分支名  # 推送並設定追蹤（第一次 push 新分支用）
```

## fetch vs pull

```
git fetch  = 只下載，不改你的檔案（安全）
git pull   = fetch + merge（下載並合併）
```

先 fetch 再看 log 確認，比直接 pull 安全：
```bash
git fetch origin
git log origin/stage --oneline -5   # 先看遠端有什麼
git pull origin stage               # 確認後再合併
```
