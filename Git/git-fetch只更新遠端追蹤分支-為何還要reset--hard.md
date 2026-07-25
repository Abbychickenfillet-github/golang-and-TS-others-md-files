---
title: git fetch 只更新「遠端追蹤分支」，不動本機分支與 working tree —— 為什麼 force push 完還要 reset --hard
type: debug-note
tags: [git, fetch, reset, force-push, remote-tracking-branch, working-tree]
updated: 2026-07-24
---

# git fetch 到底更新了「誰」

> 起點問題：`git push origin feature/experiment:main --force` 把 GitHub 上的 `origin/main` 換成新內容了，但本機 VS Code 打開 `object-static-methods.html` 還是找不到檔案。`git fetch` 是不是就能讓本機同步？

## 一句話結論

**`git fetch` 只更新「遠端追蹤分支」（remote-tracking branch，如 `origin/main`），不會動你目前所在的本機分支（如 `main`），也完全不碰 working tree（磁碟上的檔案）。**

## 官方文件怎麼說

[git-fetch(1) 官方文件](https://git-scm.com/docs/git-fetch) DESCRIPTION 段落：

> Fetch branches and/or tags (collectively, "refs") from one or more other repositories, along with the objects necessary to complete their histories. **Remote-tracking branches are updated**...

`--update-head-ok` 選項的說明反過來證實了「預設不會動當前分支」：

> By default `git fetch` **refuses to update the head which corresponds to the current branch**. This flag disables the check.

翻成白話：
- `git fetch` 做的事只有「把遠端的 commit 物件抓下來，然後把 `origin/main` 這個書籤指過去」
- 它**拒絕**去動你現在簽出（checked out）的那個分支（HEAD 指的那個），這是刻意設計、不是 bug
- 磁碟上的檔案（working tree）自然也不會變，因為根本沒去動當前分支

## 實測驗證（這次真實案例）

```bash
git fetch origin
git log --oneline main -3          # 本機 main：5c92d3a（舊的）
git log --oneline origin/main -3   # 遠端追蹤分支：a74438e（剛 force push 上去的新的）
```

fetch 完之後，兩者依然不同——這就是證據：fetch 有抓到新資料（`origin/main` 動了），但本機 `main` 分支紋風不動。

## 為什麼要用 `git reset --hard origin/main` 而不是 `git merge` / `git pull`

這次情境的關鍵：**`origin/main` 是被 force push 蓋掉的**（`feature/experiment` 直接整個換上去），不是「遠端多了幾個新 commit」這種單純情境。

1. `git reset --hard origin/main` 是官方文件裡處理「本機分支要完全對齊某個 commit（含 working tree）」的標準做法。[git-reset(1) 官方文件](https://git-scm.com/docs/git-reset) 對 `--hard` 的定義：

   > Overwrite all files and directories with the version from `<commit>`, and may overwrite untracked files. Tracked files not in `<commit>` are removed so that the working tree matches `<commit>`. Update the index to match the new HEAD, so nothing will be staged.

   也就是同時把 **working tree、index、HEAD** 三個區域全部設成目標 commit 的樣子，一步到位。細節見 [[git-reset-modes]]。

2. 為什麼不用 `git pull` / `git merge origin/main`？因為 `git merge` 的預期情境是「兩條沒被竄改過的歷史」，force push 之後遠端歷史被**改寫**過，用 merge/pull 可能會製造出多餘的 merge commit，或在歷史真的分岔時跳出衝突警告——這些都不是你要的。你要的是「本機完全變成我剛剛 push 上去的樣子」，`reset --hard` 才是直接、不模糊的做法。

   > 補充：這次剛好 `a74438e`（origin/main）的 parent 就是本機 `5c92d3a`，屬於單純的 fast-forward，用 `git merge origin/main` 其實也會成功、不會產生額外 merge commit。但只要涉及 force push 的同步情境，**養成用 `reset --hard` 而不是 merge/pull 的習慣**比較保險，因為你無法每次都保證是 fast-forward。

## 完整同步流程

```bash
git fetch origin
git checkout main
git reset --hard origin/main
```

> ⚠️ `reset --hard` 會**丟棄本機未提交的修改**，執行前務必 `git status` 確認沒有想保留的東西。詳見 [[git-reset-modes]] 的危險警告章節。

## 附註：`git-scm.com` 的 SCM 是什麼意思

**SCM = Source Code Management（原始碼管理）**，有時也寫成 Source Control Management，是版本控制系統的同義詞/上位概念（Git、SVN、Mercurial 都是 SCM 工具的一種）。這詞在 Git 誕生前就是 Linux 核心社群的慣用語——Linus Torvalds 當年因為 BitKeeper 的授權爭議，才動手寫了 Git 這個新的「SCM」。`git-scm.com` 這個網域名稱就是沿用這個既有術語，不是 Git 自創的縮寫。

## 相關筆記
- [[git-origin-remote-and-pull]] —— fetch / pull / push 基本語法、`origin/main` 斜線語法解釋、`origin` 只是本機暱稱的觀念
- [[git-reset-modes]] —— soft / mixed / hard 三種模式完整比較
- [[git-revert-vs-reset-已push後如何選擇]]

## 資料來源（含查證時間）

| 主題 | 來源 | 版本／時間 |
|---|---|---|
| git fetch 只更新 remote-tracking branch、不動 HEAD/working tree | [git-scm.com/docs/git-fetch](https://git-scm.com/docs/git-fetch) | 2026-07-24 查證 |
| git reset --hard 同時覆寫 working tree / index / HEAD | [git-scm.com/docs/git-reset](https://git-scm.com/docs/git-reset) | 2026-07-24 查證 |
