---
title: git rev-parse 與 git filter-repo｜唯讀查詢 vs 破壞性歷史改寫
type: topic-note
source: Gemini
tags: [gemini, git, rev-parse, filter-repo, plumbing, porcelain, 歷史改寫, 資安]
sources:
  - https://gemini.google.com/app/f06f2551125baa3d
updated: 2026-08-25
---

# git rev-parse 與 git filter-repo｜唯讀查詢 vs 破壞性歷史改寫

> [!info] 本篇重點 a–k，共 11 個
> 這兩個指令唯一的共通點是名字裡都有「處理 commit」的味道，其他地方完全不同。<mark style="background: #FF5582A6;">一個絕對不會改到你的東西，一個會把整個 repo 的歷史重寫一遍。</mark>會放在一起問，通常是因為在清理誤推的金鑰時同時遇到這兩個名詞。
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[git-filter-repo]]</mark> 是實際操作步驟與踩坑紀錄，這篇補上「它跟查詢類指令的分界在哪」；<mark style="background: #ADCCFFA6;">[[Git-Graph-Outgoing-Changes與rev-parse-status-sb]]</mark> 講 `rev-parse` 在讀取分支狀態上的實際應用；<mark style="background: #ADCCFFA6;">[[git-ref-vs-branch-vs-head]]</mark> 講 `rev-parse` 要解析的那些「引用」到底是什麼。

---

## 重點整理

### 一. 先定義兩個 Git 世界的專有名詞

(a) <mark style="background: #ADCCFFA6;">Plumbing（水管）指令</mark>：Git 的低階內部工具，輸出格式穩定、適合寫進腳本，但不好給人看。`rev-parse`、`cat-file`、`hash-object`、`ls-tree` 都屬於這一類。

(b) <mark style="background: #ADCCFFA6;">Porcelain（瓷器）指令</mark>：包給人用的高階指令，輸出漂亮但格式可能隨版本變動。`status`、`log`、`commit`、`checkout` 屬於這一類。

> [!note] 這個命名的由來
> Git 官方把自己比喻成馬桶：Porcelain 是你看得到的白瓷外殼，Plumbing 是牆裡面那堆水管。<mark style="background: #FFB8EBA6;">寫 CI script 時要用 plumbing，因為 porcelain 的輸出格式官方明講「隨時可能改」。</mark>

(c) <mark style="background: #FFF3A3A6;">`rev-parse` 是 plumbing，`filter-repo` 兩者都不是——它根本不是 Git 內建指令，是一支獨立的 Python 套件。</mark>

### 二. 核心差異對照

(d)

| 比較項目 | `git rev-parse` | `git filter-repo` |
| --- | --- | --- |
| 主要功能 | 解析 SHA-1 雜湊值、查詢 Git 內部狀態 | 重寫專案 Git 歷史紀錄（History Rewriting） |
| 資料修改 | <mark style="background: #BBFABBA6;">唯讀，完全不修改資料</mark> | <mark style="background: #FF5582A6;">破壞性修改，所有 commit SHA 都會變</mark> |
| 典型用途 | 取得當前 commit ID、取得 `.git` 目錄路徑 | 刪除誤推的金鑰／密碼、批次清理大檔 |
| 工具類型 | Git 內建核心低階指令 | 官方推薦的 Python 擴充套件，<mark style="background: #FF5582A6;">需額外安裝</mark> |
| 執行速度 | 毫秒級 | 視 repo 大小，數秒到數十分鐘 |
| 可逆嗎 | 沒有東西可逆，它什麼都沒動 | <mark style="background: #FF5582A6;">不可逆，做之前一定要另外備份一份 clone</mark> |

### 三. `git rev-parse` 常用場景

(e)

```bash
# 取得目前 HEAD 的完整 40 字元 commit SHA
git rev-parse HEAD

# 只要前 7 碼（寫 log 或 tag 常用）
git rev-parse --short HEAD

# 檢查當前目錄是否在 Git 專案內（寫 script 的護欄）
git rev-parse --is-inside-work-tree

# 取得 repo 根目錄的絕對路徑（不管你 cd 到多深的子資料夾）
git rev-parse --show-toplevel

# 取得目前分支名稱
git rev-parse --abbrev-ref HEAD
```

(f) 逐行拆解第一個：`HEAD` 是一個<mark style="background: #ADCCFFA6;">引用（reference）</mark>，指向「你現在在哪個 commit」。`rev-parse` 的工作就是把這種人類看得懂的名字（`HEAD`、`main`、`v1.0`、`HEAD~3`、`main@{yesterday}`）翻譯成那個唯一的 40 字元雜湊值。<mark style="background: #FFF3A3A6;">rev = revision（版本），parse = 解析，合起來就是「版本名稱解析器」。</mark>

(g) <mark style="background: #BBFABBA6;">實務用法：`--show-toplevel` 在寫專案腳本時特別好用</mark>，可以讓腳本不管從哪個子資料夾執行都找得到專案根目錄。

### 四. `git filter-repo` 常用場景

(h)

```bash
# 從整個 commit 歷史中徹底刪除 passwords.txt
git filter-repo --path passwords.txt --invert-paths

# 清除歷史中所有超過 50MB 的大型檔案
git filter-repo --strip-blobs-bigger-than 50M
```

(i) 拆解第一個：`--path passwords.txt` 是「我關心這個路徑」，<mark style="background: #FFF3A3A6;">`--invert-paths` 把選取反轉成「留下其他全部，把這個丟掉」</mark>。少了 `--invert-paths` 意思會變成「只留這個檔案，其他全刪」，方向完全相反。

(j) <mark style="background: #FF5582A6;">三個一定要知道的陷阱：</mark>

- **它是官方推薦用來取代 `git filter-branch` 的**。`filter-branch` 官方文件現在開頭就寫著不建議使用，因為慢且容易做錯。
- **`filter-repo` 預設會拒絕在有未推送變更或非新鮮 clone 的 repo 上跑**，要加 `--force` 才會硬做。這個限制是保護你的，不要習慣性加 `--force`。
- **跑完之後 remote 會被移除**，這是刻意設計，逼你重新確認要推去哪。之後要 `git push --force` 覆蓋遠端，並且<mark style="background: #FF5582A6;">通知所有協作者重新 clone</mark>，因為他們本機的歷史已經對不上了。

(k) <mark style="background: #FF5582A6;">最重要的一點：把金鑰從 Git 歷史刪掉，不等於那把金鑰安全了。</mark>只要曾經 push 到遠端，就要當作已外洩，<mark style="background: #BBFABBA6;">正確流程是先去服務商後台把那把金鑰作廢並換新，再回來清歷史</mark>。順序反了就沒有意義。

---

## 程式碼範例

同層的 `rev-parse-cheatsheet.sh` 可以直接在任何 repo 裡跑，把 `rev-parse` 各種旗標的輸出一次印出來對照。

---

## 練習題

Git 指令沒有 LeetCode 對應題，但 `rev-parse` 背後的物件模型（Git 是一棵 Merkle 樹）可以用這幾題練：

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 236 | [Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) | `git merge-base` 找共同祖先就是這件事 |
| 1650 | [LCA of a Binary Tree III](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree-iii/) | 有 parent 指標的版本，更接近 commit 的資料結構 |
| 210 | [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) | 拓撲排序，`git log` 排列 commit 的底層邏輯 |

---

## 各對話來源（原文）

### Git rev-parse 與 filter-repo 差異（2026-08）— https://gemini.google.com/app/f06f2551125baa3d

**使用者：** Git rev-parse 跟 git filter-repo 差在哪

**Gemini：** `git rev-parse` 與 `git filter-repo` 的定位與用途完全不同，兩者不能混為一談。
`git rev-parse` 是一個低階讀取工具（Plumbing Command）。它不會修改任何專案內容，專門用來解析與轉換 Git 的引用名稱、SHA-1 哈希值或查看 Repository 的狀態參數。
`git filter-repo` 是一個高階歷史改寫工具（Python 獨立擴充套件）。它會徹底重寫整個專案的 Commit 歷史紀錄，常用於移除敏感資料或刪除大型檔案（官方推薦用來替代舊版的 `git filter-branch`）。
（核心差異比較表與使用範例見上方「重點整理」二.、三.、四.，原文的表格與指令已完整收錄。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話原文 | https://gemini.google.com/app/f06f2551125baa3d | 2026-08，本次歸檔 2026-08-25 |
| Git 官方文件 `git-rev-parse` | https://git-scm.com/docs/git-rev-parse | 查證 2026-08-25 |
| `git-filter-repo` 官方 repo 與說明 | https://github.com/newren/git-filter-repo | 查證 2026-08-25 |
| Git 官方文件 `git-filter-branch`（含不建議使用的警語） | https://git-scm.com/docs/git-filter-branch | 查證 2026-08-25 |
| Pro Git：Plumbing and Porcelain | https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain | 查證 2026-08-25 |
| GitHub Docs：移除敏感資料 | https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 補充
> Gemini 的分類與範例都正確，但<mark style="background: #FF5582A6;">漏掉了 (j)(k) 這幾個實務上會咬人的部分</mark>：`filter-repo` 跑完會移除 remote、需要通知協作者重新 clone、以及「先作廢金鑰再清歷史」的順序。這些是本篇補上的，請以 GitHub 官方的移除敏感資料文件為準。
> 另外 Gemini 說 `filter-repo` 是「高階」工具，這個用詞容易跟 porcelain / plumbing 的分類混淆——<mark style="background: #FF5582A6;">它其實兩者都不是，它不是 Git 內建指令</mark>，`git filter-repo` 能這樣呼叫只是因為 Git 會把 `git-xxx` 這種名字的執行檔當成子指令。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
