---
title: git worktree 是什麼：一個 repo、多個工作目錄
type: topic-note
tags: [git, worktree, claude-code]
updated: 2026-11-15
---

# git worktree 是什麼：一個 repo、多個工作目錄

本篇重點 a–e，共 5 個。相關：[[git-merge-shared-ancestry]]、[[git-branch-notes]]、[[git-ref-vs-branch-vs-head]]

## a. 一句話

worktree 讓同一個 repo（同一份 `.git` 歷史）同時在多個資料夾各自 checkout 不同分支，每個資料夾有自己的檔案、`HEAD` 與暫存區（index），但共用同一份提交、分支與標籤。

## b. 和「再 clone 一份」「切分支」的差別

| 做法 | 歷史與物件 | 同時看到幾個分支 | 切換成本 |
| --- | --- | --- | --- |
| `git switch` 切分支 | 一份 | 一次一個 | 要先 commit 或 stash 手上的變更 |
| 再 `git clone` 一份 | 兩份，各自獨立 | 多個 | 要 fetch/push 才能互通，佔雙倍空間 |
| `git worktree add` | 一份共用 | 多個 | 免切換，兩個資料夾同時存在 |

## c. 這個專案裡兩個 worktree 各自的角色

| 資料夾 | 分支 | 角色 |
| --- | --- | --- |
| `C:\coding\futuresign\Abby-notes` | `main` | 主工作目錄，Obsidian 實際開著、Abby 日常寫筆記的地方 |
| `C:\coding\futuresign\Abby-notes\.claude\worktrees\nextjs-blog` | `feat/nextjs-blog` | Claude 的隔離區，Next.js 改造與顏色統一都在這裡做，不會碰到 main 上正在編輯的檔案 |

這次合併被擋下，就是因為 main 這個工作目錄有 33 個還沒 commit 的變更，其中 5 個檔案和分支改到同一份，Git 為了不蓋掉未存檔的內容而中止。所以流程是：先把 main 的變更 commit，再 `git merge feat/nextjs-blog`，衝突的檔案逐一處理。

## d. 常用指令與限制

| 指令 | 作用 |
| --- | --- |
| `git worktree add ../路徑 -b 新分支` | 開新工作目錄並建立新分支 |
| `git worktree list` | 列出所有工作目錄與各自的分支 |
| `git worktree remove 路徑` | 移除工作目錄（分支還在） |
| `git worktree prune` | 清掉資料夾已被手動刪除的登記 |

同一個分支不能同時在兩個 worktree 被 checkout；`git stash` 的暫存堆疊是所有 worktree 共用的，所以多個 session 並行時不要用裸的 `stash` / `stash pop`。

## e. 在 Claude Code 裡的意思

Claude 開一個 worktree session 時，會在 `.claude/worktrees/` 底下建立獨立資料夾與分支，改動先留在分支上，要併回 main 時才由人決定合併。好處是 Claude 跑建置、批次改檔時，不會干擾 main 上正在用的檔案。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| git worktree 官方文件 | [git-scm.com/docs/git-worktree](https://git-scm.com/docs/git-worktree) | 2026-11-15 未重新抓取，內容依既有知識撰寫，細節請以官方為準 |
