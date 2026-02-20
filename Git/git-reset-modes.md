# Git Reset 三種模式

## 指令格式

```bash
git reset [--soft | --mixed | --hard] <commit>
```

---

## 三種模式比較

| 模式 | 工作目錄 | 暫存區 (staged) | HEAD | 用途 |
|------|---------|----------------|------|------|
| `--soft` | ✓ 保留 | ✓ 保留 | 移動 | 只撤銷 commit，保留所有修改 |
| `--mixed` | ✓ 保留 | ✗ 清除 | 移動 | 撤銷 commit + unstage，保留工作目錄 |
| `--hard` | ✗ **清除** | ✗ **清除** | 移動 | **完全還原**，丟棄所有修改 |

---

## --soft：只撤銷 commit

```bash
git reset --soft HEAD~1
```

**效果**：
- 撤銷最後一個 commit
- 修改內容還在暫存區（綠色）
- 可以直接重新 commit

**用途**：想修改 commit message 或合併多個 commit

---

## --mixed（預設）：撤銷 commit + unstage

```bash
git reset HEAD~1
# 或
git reset --mixed HEAD~1
```

**效果**：
- 撤銷最後一個 commit
- 修改內容在工作目錄（紅色，未暫存）
- 需要重新 `git add`

**用途**：想重新整理要 commit 哪些檔案

---

## --hard：完全還原（危險）

```bash
git reset --hard HEAD~1
```

**效果**：
- 撤銷最後一個 commit
- **刪除所有未提交的修改**
- 工作目錄完全還原到指定 commit

**用途**：放棄所有本地修改，回到乾淨狀態

---

## 常用範例

```bash
# 還原到遠端分支狀態（丟棄所有本地修改）
git reset --hard origin/main

# 撤銷最後 3 個 commit（保留修改）
git reset --soft HEAD~3

# 還原到特定 commit
git reset --hard abc1234

# 撤銷剛剛的 reset（如果還沒 garbage collect）
git reset --hard ORIG_HEAD
```

---

## 視覺化

```
執行前：
A → B → C → D (HEAD)
         ↑
      有未提交的修改

git reset --soft HEAD~2：
A → B (HEAD)
    staged: C 和 D 的修改 + 未提交的修改

git reset --mixed HEAD~2：
A → B (HEAD)
    unstaged: C 和 D 的修改 + 未提交的修改

git reset --hard HEAD~2：
A → B (HEAD)
    全部消失！
```

---

## 危險警告

`--hard` 會**永久刪除**：
- 未 commit 的修改
- 未 push 的 commit（如果沒有其他分支指向它們）

**救回方法**（有時間限制）：
```bash
# 查看被刪除的 commit
git reflog

# 還原到之前的狀態
git reset --hard HEAD@{2}
```

---

## 簡單記法

- `--soft` = 只動 HEAD，其他都留著
- `--mixed` = 動 HEAD + 清暫存區
- `--hard` = 全部清掉，回到過去
