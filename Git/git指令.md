# Git 指令筆記

## 目錄

- [switch vs checkout 的差別](#switch-vs-checkout-的差別)
- [比較兩個分支的差異](#比較兩個分支的差異)
  - [列出分支自分岔以來的所有 commits](#列出分支自分岔以來的所有-commits)
  - [`--not` vs `..` vs `...` 的差別](#--not-vs--vs--的差別)
  - [`git diff` 的兩點 vs 三點](#git-diff-的兩點-vs-三點)

---

## switch vs checkout 的差別

`git switch` 是 Git 2.23 版本（2019年）新增的指令，目的是讓指令更直覺。

### 以前的 checkout 什麼都做

```bash
git checkout 分支名稱          # 切換分支
git checkout -b 新分支名稱     # 建立並切換分支
git checkout -- 檔案名稱       # 還原檔案（捨棄修改）
git checkout commit-hash      # 切換到某個 commit
```

**問題**：一個指令做太多事，容易搞混。

### 現在拆成兩個指令

| 用途 | 舊指令 (checkout) | 新指令 |
|------|------------------|--------|
| 切換分支 | `git checkout 分支` | `git switch 分支` |
| 建立並切換分支 | `git checkout -b 新分支` | `git switch -c 新分支` |
| 還原檔案 | `git checkout -- 檔案` | `git restore 檔案` |

### 簡單記法

- **switch** = 切換分支專用
- **restore** = 還原檔案專用
- **checkout** = 舊的萬用指令（還是可以用）

### 常用指令整理

```bash
# 建立新分支並切換
git switch -c 新分支名稱

# 切換到已存在的分支
git switch 分支名稱

# 切換回上一個分支
git switch -

# 從遠端分支建立本地分支
git switch -c 本地分支 origin/遠端分支
```

## 比較兩個分支的差異

### 列出分支自分岔以來的所有 commits

```bash
# 語法：列出 branchA 從 branchB 分岔出去之後的所有 commits
git log --oneline branchA --not $(git merge-base branchA branchB)
```
  - --not <commit> — 排除那個 commit 之前的所有歷史
  - 組合起來 = 「A 分支從 B 分出去以後新增了什麼」
  - 另外也補充了 .. vs ... 在 git log 和 git diff 中意義不同的對照表
**拆解說明：**

| 部分 | 作用 |
|------|------|
| `git merge-base branchA branchB` | 找到兩個分支的**共同祖先** commit（分岔點） |
| `git log branchA --not <分岔點>` | 列出 branchA 上有、但分岔點之前沒有的 commits |

**範例：**

```bash
# pre_order 從 stage 分出去以後，新增了哪些 commits？
git log --oneline pre_order --not $(git merge-base pre_order origin/stage)

# feat/digital-bookshelf 從 stage 分出去以後的 commits
git log --oneline feat/digital-bookshelf --not $(git merge-base feat/digital-bookshelf origin/stage)
```

### `--not` vs `..` vs `...` 的差別

```bash
# 以下三種寫法效果相同：列出 A 有但 B 沒有的 commits
git log A --not B
git log B..A
git log ^B A
```

```bash
# 三個點（...）= 雙向差異，列出 A 或 B 各自獨有的 commits
git log A...B
```

### `git diff` 的兩點 vs 三點

注意：`git diff` 的 `..` 和 `...` 意義跟 `git log` **相反**！

```bash
# git diff 兩點 = 兩個分支最新 commit 的直接差異
git diff origin/stage..pre_order        # stage 頂端 vs pre_order 頂端

# git diff 三點 = 從共同祖先到 pre_order 的變更（不含 stage 獨有的）
git diff origin/stage...pre_order       # 只看 pre_order 自己新增的改動
```

| 指令 | `git log` 的意思 | `git diff` 的意思 |
|------|-----------------|-----------------|
| `A..B` | B 有但 A 沒有的 commits | A 頂端 vs B 頂端的直接差異 |
| `A...B` | A 和 B 各自獨有的 commits | 從共同祖先到 B 的變更 |
