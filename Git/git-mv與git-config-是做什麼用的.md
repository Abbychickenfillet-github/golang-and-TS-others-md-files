---
title: git mv 與 git config 是做什麼用的
tags: [git, git-mv, git-config, hooks]
date: 2026-11-11
---

# git mv 與 git config 是做什麼用的

本篇重點 a–c，共 3 個。

## a. `git mv`：搬移／改名檔案，並告訴 Git

`git mv 舊路徑 新路徑` 等於「作業系統的 `mv`（搬移）＋ `git add`（把這次搬移放進暫存區）」兩步合一。

| 做法 | 實際做的事 | 差別 |
|---|---|---|
| 手動 `mv` 再 `git add -A` | 檔案先在磁碟搬走，Git 再掃描發現「舊的不見、新的出現」 | 結果相同，要記得兩步都做 |
| `git mv` | 磁碟搬移與暫存同時完成，`git status` 立刻顯示 `R`（rename） | 少一步，不會忘記 `git add` |

Git 其實不會「記錄改名動作」，它是在看 commit 時比對內容相似度（預設約 50% 以上相同）才判定為 rename。所以改名同時又大改內容，可能被視為「刪除＋新增」；歷史追蹤用 `git log --follow 檔名`。

## b. `git config`：讀取與設定 Git 的設定值

`git config` 管的是 Git 本身的行為設定，不是專案程式碼。

| 範圍 | 寫入位置 | 影響範圍 | 例子 |
|---|---|---|---|
| `--local`（預設） | 該 repo 的 `.git/config` | 只有這個 repo | `core.hooksPath`、`branch.main.remote` |
| `--global` | `~/.gitconfig` | 這個使用者的所有 repo | `user.name`、`user.email` |
| `--system` | Git 安裝資料夾 | 這台電腦所有使用者 | 很少用 |

| 指令 | 作用 |
|---|---|
| `git config --get core.hooksPath` | 讀取一個設定值（沒設定時沒有輸出） |
| `git config --list --show-origin` | 列出所有設定，並標示來自哪個檔案 |
| `git config core.hooksPath .githooks` | 寫入設定到 `.git/config` |

## c. `core.hooksPath` 與 pre-commit 的關係

hook 是「Git 在特定時間點自動執行的腳本」。`core.hooksPath` 只是指定「腳本放在哪個資料夾」，預設是 `.git/hooks/`（不會被 push）。改成 repo 內的 `.githooks/` 後，腳本可以跟著 repo 版本控管。

| 問題 | 答案 |
|---|---|
| 觸發時機 | `pre-commit`：執行 `git commit` 時，在 commit 建立之前 |
| `git push` 會觸發嗎 | 不會（要 `pre-push` hook 才會） |
| 設定會被 push 嗎 | 不會，`.git/config` 只在本機；換電腦要再設定一次 |
| 實際用途 | 這個 vault 用它在 commit 前執行 `build-index.py`，自動重建 `index.html`；細節見 [[自動產生索引-build-index-為何筆記沒進索引]] |

## 資料來源（含查證時間）

| 主題 | 來源 | 版本／時間 |
|---|---|---|
| git mv、git config、core.hooksPath 行為 | 本 repo 實際操作（`git mv` 後 `git status` 顯示 `R`；`git config --get core.hooksPath` 目前未設定） | 2026-11-11 實測 |
| 設定層級與 hooks 說明 | Git 官方文件 https://git-scm.com/docs/git-config 、https://git-scm.com/docs/githooks | 依知識，未於本次重新抓網頁核對 |
