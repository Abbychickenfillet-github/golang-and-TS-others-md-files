---
title: Git Diff 基準點與 +/- 符號判讀
type: topic-note
source: Gemini
tags: [gemini, git, diff, code-review]
sources:
  - https://gemini.google.com/app/8f5d11c933e56751
updated: 2026-06-30
---

# Git Diff 基準點與 +/- 符號判讀

> 互補筆記：指令面（`git diff` vs `--cached` vs `--stat`）見同資料夾 `git-diff-notes.md`；本篇專講「誰是基準、+/- 怎麼讀」。

## 重點整理

執行 `git diff A B` 時：<mark style="background: #FFF3A3A6;">前面的 A 是基準點（Source / Old / `--- a/`），後面的 B 是目標（Target / New / `+++ b/`）</mark>。

符號意義（站在「從 A 變成 B」的角度）：

- <mark style="background: #FF5582A6;">`-`（紅）</mark>：該行在 <mark style="background: #ADCCFFA6;">A 有、B 沒有</mark>（相對基準被刪除）。
- <mark style="background: #BBFABBA6;">`+`（綠）</mark>：該行在 <mark style="background: #ADCCFFA6;">A 沒有、B 出現了</mark>（相對基準被新增）。

口訣：<mark style="background: #FFF3A3A6;">「從前（面）往後（面）看」</mark>。想知道「比起 branch1，branch2 改了什麼」就把 <mark style="background: #BBFABBA6;">branch1 放前面</mark>：`git diff branch1 branch2`。寫反了符號就整個相反。

官方文件佐證（git-scm.com/docs/git-diff）：EXAMPLES 區塊有 `git diff topic master`「Changes between the tips of the topic and the master branches」，配合 patch 格式 `--- a/file`（第一參數＝基準）、`+++ b/file`（第二參數＝目標）。

### 兩點 `..` vs 三點 `...`（陷阱）

| 語法 | 比較對象 | 用途 |
|------|----------|------|
| `git diff A B` 或 `git diff A..B` | A 與 B <mark style="background: #FFF3A3A6;">各自的最新狀態</mark> | 直接比兩個分支現況 |
| <mark style="background: #FF5582A6;">`git diff A...B`（三點）</mark> | <mark style="background: #ADCCFFA6;">A 與 B 的共同祖先</mark> 與 <mark style="background: #ADCCFFA6;">B 的最新位置</mark> | Code Review：看「我從主線分支出來後，這個 branch 到底改了什麼」 |

### 範例（是非／判讀題）

`git diff main feature` 畫面出現 `+ console.log('hello')` → 代表 <mark style="background: #BBFABBA6;">feature 比 main 多了這行</mark>。
出現 `- const oldVar = 1` → 代表 <mark style="background: #FF5582A6;">feature 比 main 少了這行</mark>。

## 各對話來源

### Git Diff 基準點與符號判讀（2026-06-30）— https://gemini.google.com/app/8f5d11c933e56751

使用者：哪邊有 git diff branch1 branch2 的 syntax，我只是要知道放前面的是基準點還是放後面的 branch 是基準點呀，因為我要看 + 號放哪裡代表什麼意思不然很難判讀。（並貼上 git-scm 文件連結請求佐證）

Gemini：（節錄）`git diff A B` 中 A（前）是基準 Source、B（後）是 Target。`-` 紅＝A 有 B 沒有（被刪），`+` 綠＝A 沒有 B 有（被新增）。口訣「從前往後看」。官方文件 EXAMPLES 有 `git diff topic master`，patch 格式 `--- a/`＝第一參數（基準）、`+++ b/`＝第二參數（目標）。三個點 `A...B` 是比較 A 與 B 的共同祖先 與 B 之間的差異，常用於 PR/Merge 前 Review。
