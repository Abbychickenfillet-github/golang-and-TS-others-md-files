# Git 分支問題筆記

## 問題：為什麼新分支沒有舊分支的 commits？

### 原因
從 develop 開新分支時，新分支只有**當時** develop 的 commits。
如果另一個 feature branch 還沒合併回 develop，新分支就不會有那些 commits。

### 時間線範例
```
develop:     A ─── B ─── C ─── D ─── E
                   │           │
                   │           └─── feat/order-items (從 D 開出)
                   │                (沒有 booth 的 commits)
                   │
                   └─── feat/booth-pass_code (從 B 開出)
                        (沒有 order-items 的 commits)
```

兩個分支是**平行開發**，彼此看不到對方的 commits。

### 解決方法

**方法 1：開新分支前確保 develop 是最新的**
```bash
git checkout develop
git pull origin develop
git checkout -b feat/new-feature
```

**方法 2：把另一個分支 merge 進來**
```bash
git checkout feat/new-feature
git merge feat/another-feature
```

**方法 3：Rebase 到最新的 develop**
```bash
git checkout feat/new-feature
git rebase develop
```

### 建議工作流程
1. 完成一個 feature → 合併到 develop
2. `git pull origin develop` 拉取最新
3. 再從最新的 develop 開出下一個 feature branch

### 本地先 merge 兩個分支

如果兩個 feature branch 同時開發，想要互相有對方的 commits：

```bash
# 在新分支上，把舊分支 merge 進來
git checkout feat/new-feature
git merge feat/old-feature

# 現在 feat/new-feature 就有兩邊的 commits 了
```

這樣就不會有「新分支沒有舊分支 commits」的問題！
