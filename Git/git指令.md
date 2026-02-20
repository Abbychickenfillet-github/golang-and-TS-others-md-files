# Git 指令筆記

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
