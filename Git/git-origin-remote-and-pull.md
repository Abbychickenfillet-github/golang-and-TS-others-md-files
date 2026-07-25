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

### 關鍵觀念：`origin` 只存在於「本機」，GitHub 上根本沒有 `origin` 這個東西

**「origin」這個名字只存在於你「本機」的 git 設定裡，GitHub 上根本沒有 `origin` 這個概念。** `git clone` 的時候，git 自動把「你 clone 的那個網址」取了個本機暱稱叫 `origin`（純慣例，不是規定）。你完全可以自己改名：

```bash
git remote rename origin github   # 改名後，之後要用 github/main 才抓得到，功能完全一樣
```

換句話說：**`origin` 是你本機幫某個遠端 repo 取的別名，`main`／`stage` 這些才是實際存在於遠端伺服器（GitHub）上的分支名**——`origin` 是本機的、分支名才是遠端真正有的。GitHub 網頁上、GitHub API 裡都不會出現「origin」這個字，那純粹是你這台電腦 `.git/config` 裡自己取的名字。

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

## `origin/main` 斜線前面是什麼？（跟 shell 無關，是 Git 自己的語法）

`origin/main` 這種「`<remote>/<branch>`」寫法是 **Git 本身的 ref 命名慣例**，跟你在 PowerShell、CMD、Git Bash 哪個 shell 打指令**無關**——同一套 git.exe，語法完全一樣。

- 斜線**前面**（`origin`）＝ remote 的名字（`git remote -v` 看到的那個別名）
- 斜線**後面**（`main`）＝ 該 remote 上的分支名
- 完整實際存放位置是 `.git/refs/remotes/origin/main`（或被打包進 `.git/packed-refs`），這個叫「**remote-tracking branch**」（遠端追蹤分支）——它是**本機的一份紀錄**，記著「上次跟遠端同步時，對方的 `main` 指到哪個 commit」，不會自動更新，要靠 `git fetch` 才會刷新。細節見 [[git-fetch只更新遠端追蹤分支-為何還要reset--hard]]。
