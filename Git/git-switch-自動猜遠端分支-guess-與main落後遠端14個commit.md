---
title: git switch 的 --guess 自動追蹤遠端分支／本地 main 落後遠端 14 commits
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - git
  - git-switch
  - remote-tracking
sources:
  - https://gemini.google.com/app/9194b20dbf205420
  - https://gemini.google.com/app/ff8e7731eb04de3e
related:
  - "[[git-追蹤上游分支-set-upstream]]"
  - "[[git-origin-remote-and-pull]]"
updated: 2026-10-26
---

# git switch --guess 與 main 落後遠端

本篇重點 a–g，共 7 個

## 重點整理

- (a) `git switch new-topic`：本地沒有該分支、而遠端（如 origin）剛好有同名分支時，Git 會自動建立本地分支並設定追蹤，輸出 `Branch 'new-topic' set up to track remote branch 'new-topic' from 'origin'`。這就是 <mark style="background: #ADCCFFA6;">--guess</mark>（預設開啟的 DWIM，Do What I Mean）。
- (b) 並非強制：單次用 `git switch --no-guess <branch>`，本地沒有就直接報錯；永久關閉用 `git config --global checkout.guess false`。
- (c) <mark style="background: #FF5582A6;">⚠️ 存疑／更正</mark>：Gemini 說「git checkout 完全沒有 --guess 功能」不精確。依官方手冊，`git checkout` 也有 `--guess／--no-guess` 與同名遠端分支自動建立追蹤的行為（git checkout 這個 DWIM 早於 2.23 就存在），git switch 只是把它獨立成專職指令。請以 `git help checkout` 核對。
- (d) 兩個以上遠端都有同名分支（origin／upstream）時，自動猜測會因含糊而報錯，需手動指定 `git switch -c <name> --track origin/<name>`。
- (e) SYNOPSIS `git switch [<options>] [--no-guess] <branch>`：`<branch>` 是這個指令的核心必填對象，所以獨立寫出；`[<options>]` 只放微調行為的選填開關。若併入 options 就變成「分支可有可無」，與語意不符。
- (f) 終端機顯示 main「落後遠端 14 commits」：代表遠端 main 比本地多 14 個 commit，常見原因是在 GitHub 以 Pull Request 合併，本地沒有 `git pull`／`git fetch` 同步。<mark style="background: #BBFABBA6;">先 git fetch 看差異，再 git pull（或 --ff-only）更新本地 main</mark>。
- (g) 「Git 分支狀態」該篇的 Gemini 回答被截斷，後半解釋未取得，上述 (f) 為前半句推得，待 Abby 重開對話補充。

## 各對話來源（原文摘要）

### Git 分支建立機制解析（2026-10-26 抓取）— https://gemini.google.com/app/9194b20dbf205420

**使用者：** 為什麼是從 remote branch 來 created？是不是也可以不用？
**Gemini：** 見 (a)(b)。
**使用者：** 這是 git checkout 沒有的功能嗎？SYNOPSIS 為什麼不把 branch name 寫進 options？
**Gemini：** 見 (c)(e)；其中 (c) 有誤。

### Git 分支狀態（2026-10-26 抓取）— https://gemini.google.com/app/ff8e7731eb04de3e

**使用者：** 我少了 14 個 commits，是不是我合併分支時是直接從遠端合併、本地沒合？
**Gemini：** 是，常因在 GitHub 以 PR 合併卻沒在本地同步（回答被截斷）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話 1 | https://gemini.google.com/app/9194b20dbf205420 | 2026-10-26 抓取 |
| Gemini 對話 2 | https://gemini.google.com/app/ff8e7731eb04de3e | 2026-10-26 抓取 |
| git-switch 官方手冊 | https://git-scm.com/docs/git-switch | 本次未重新抓取，待核對 |
| git-checkout 官方手冊 | https://git-scm.com/docs/git-checkout | 本次未重新抓取，待核對 |

由 Gemini 對話自動整理 · 更新於 2026-10-26
