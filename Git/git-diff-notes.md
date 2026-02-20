# Git Diff 指令筆記

## `git diff` vs `git diff --cached` 的差別

Git 有三個主要區域：
1. **工作目錄 (Working Directory)** - 你正在編輯的檔案
2. **暫存區 (Staging Area / Index)** - `git add` 後的檔案
3. **儲存庫 (Repository)** - `git commit` 後的檔案

```
工作目錄 ──git diff──> 暫存區 ──git diff --cached──> 最後 commit
              ↑                      ↑
           未 add                  已 add
```

### 指令比較

| 指令 | 比較什麼 | 用途 |
|------|----------|------|
| `git diff` | 工作目錄 vs 暫存區 | 看還沒 `git add` 的變更 |
| `git diff --cached` | 暫存區 vs 最後 commit | 看已經 `git add` 準備要 commit 的變更 |
| `git diff HEAD` | 工作目錄 vs 最後 commit | 看所有變更（包含已 add 和未 add） |

### 實際範例

假設你修改了 `app.js`：

```bash
# 1. 修改檔案後，還沒 git add
git diff              # 會顯示變更
git diff --cached     # 什麼都不顯示（因為還沒 add）

# 2. git add app.js 之後
git diff              # 什麼都不顯示（因為已經 add 了）
git diff --cached     # 會顯示變更（因為已經在暫存區）

# 3. git commit 之後
git diff              # 什麼都不顯示
git diff --cached     # 什麼都不顯示
```

### 常用變體

```bash
# 只顯示檔案名稱統計
git diff --stat
git diff --cached --stat
```

## `git diff --stat` 是什麼？

`--stat` 參數顯示**統計摘要**，而不是完整的差異內容。

### 輸出範例
```
 frontend/src/routes/_layout/booths.tsx |  94 +++++++++++++++++++----
 frontend/src/routes/_layout/events.tsx | 136 ++++++++++++++++++++++++++++-----
 2 files changed, 194 insertions(+), 36 deletions(-)
```

### 輸出說明
| 部分 | 說明 |
|------|------|
| `booths.tsx` | 修改的檔案名稱 |
| `94 ++++...` | 變更行數 + 圖形化表示（`+` 新增，`-` 刪除） |
| `2 files changed` | 總共修改了幾個檔案 |
| `194 insertions(+)` | 新增了 194 行 |
| `36 deletions(-)` | 刪除了 36 行 |

### 使用時機
- 快速了解修改範圍，不需要看完整內容
- commit 前確認要提交哪些檔案
- code review 時先看概覽

```bash
# 常用組合
git diff --stat                    # 未暫存的變更統計
git diff --cached --stat           # 已暫存的變更統計
git diff HEAD~3 --stat             # 最近 3 個 commit 的變更統計
git diff main..feature --stat      # 兩個分支的差異統計

# 顯示特定檔案的差異
git diff path/to/file.js
git diff --cached path/to/file.js

# 比較兩個分支
git diff branch1..branch2
```

### 為什麼 `--cached` 很重要？

當你要 commit 前，應該先用 `git diff --cached` 確認：
1. 確認哪些檔案會被 commit
2. 檢查有沒有不小心 add 錯檔案
3. 最後一次確認變更內容是否正確

```bash
git add .
git diff --cached --stat    # 確認要 commit 的檔案
git diff --cached           # 詳細看變更內容
git commit -m "message"
```
