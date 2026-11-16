---
title: "git merge --ff 快進合併：不會刪節點，--ff 不是 --force"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, git, merge, fast-forward]
sources:
  - https://gemini.google.com/app/6ef102f7448dcb8d
updated: 2026-11-15
---

# git merge --ff 快進合併：不會刪節點，--ff 不是 --force

> 本篇重點 a–e ，共 5 個。相關筆記：[[git-merge-shared-ancestry]]（merge 後的共同祖先與 DAG 結構）、[[--force-with-lease&--force]]（真正會改寫遠端歷史的 force）。

## 重點整理

**a.** 合併（merge）時原本的提交節點（commit）不會消失。Git 把兩條分支的歷史整合在一起，通常產生一個新的合併提交（merge commit），完整保留過去的開發記錄。

**b.** <mark style="background: #ADCCFFA6;">`--ff` 是 Fast-Forward（快進合併），不是 Force（強制）</mark>。當目前分支（例如 main）在分出子分支後沒有新提交，Git 只把 main 的指標（pointer）往前推到目標分支的最新提交，不會額外產生 merge commit，歷史看起來是一條直線。

**c.** <mark style="background: #BBFABBA6;">用 `--ff` 是安全的</mark>：不刪任何 commit、不覆蓋程式碼，而且 `--ff` 本來就是 `git merge` 的預設行為。

**d.** 如果兩邊已經分岔（main 在這期間也有新提交），即使下了 `--ff`，Git 無法快進，會自動退回一般合併，產生 merge commit。要「一定產生 merge commit」用 `--no-ff`，要「只允許快進、做不到就失敗」用 `--ff-only`（補充：Gemini 沒講，依 git-merge 官方文件）。

**e.** ⚠️ 存疑／更正：Gemini 說 `--force` 的常用指令包含 `git branch -D`，這個說法不精確。`git branch -D` 是「強制刪除本地分支」（等同 `--delete --force`），不是「覆蓋歷史差異」。會抹掉遠端節點的是 `git push --force`，建議改用 `--force-with-lease` 降低誤蓋別人提交的風險。另外，使用者第一句提到的「get lunch 指令有兩個 dash」出自截圖，Gemini 只回「您指的是畫面中記錄」，原指令內容無法從對話還原。

## 各對話來源（原文摘錄）

### Claude 設定問題（2026-11-15 擷取）— https://gemini.google.com/app/6ef102f7448dcb8d

使用者：get lunch 的指令有兩個 dash → 合併的時候會消失原本的節點嗎？→ Force force —ff？→ 所以用 ff 安全嗎

Gemini：節點不會消失；`--ff` 是 Fast-Forward 不是 Force；安全且為預設行為；分岔時自動轉一般合併。（整合進 a～d，並於 e 標注存疑。）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 原始對話（1 則） | 見 frontmatter sources | 對話擷取於 2026-11-15 |
| git-merge 官方文件（--ff、--no-ff、--ff-only） | https://git-scm.com/docs/git-merge | 官方持續更新，本次未重新抓取，請以最新版為準 |
| git-branch 官方文件（-D 為強制刪除） | https://git-scm.com/docs/git-branch | 官方持續更新，本次未重新抓取 |
