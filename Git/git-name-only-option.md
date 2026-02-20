# Git --name-only 選項

## 什麼是 --name-only

`--name-only` = **只顯示檔案名稱**，省略其他詳細資訊

就像點餐時說「只要菜名，不要價格和熱量」。

---

## 對比範例

### git ls-tree

```bash
# 不加 --name-only（完整資訊）
$ git ls-tree HEAD
100644 blob 3b18e512...    README.md
100644 blob 7c8a2d9f...    package.json
040000 tree 5f2b3c1a...    src

# 加 --name-only（只有名稱）
$ git ls-tree --name-only HEAD
README.md
package.json
src
```

### git diff

```bash
# 不加 --name-only（顯示差異內容）
$ git diff HEAD~1
diff --git a/src/app.js b/src/app.js
index abc123..def456 100644
--- a/src/app.js
+++ b/src/app.js
@@ -1,5 +1,6 @@
+console.log("hello");
 ...

# 加 --name-only（只列出有變更的檔案）
$ git diff --name-only HEAD~1
src/app.js
src/utils.js
```

### git log

```bash
# 不加（只有 commit 訊息）
$ git log --oneline -3
abc123 feat: add login
def456 fix: bug
ghi789 docs: update

# 加 --name-only（每個 commit 改了哪些檔案）
$ git log --oneline --name-only -3
abc123 feat: add login
src/login.js
src/auth.js

def456 fix: bug
src/utils.js
```

---

## 支援 --name-only 的常用指令

| 指令 | 用途 |
|------|------|
| `git ls-tree --name-only` | 列出追蹤的檔案名稱 |
| `git diff --name-only` | 列出有差異的檔案名稱 |
| `git log --name-only` | 列出每個 commit 修改的檔案 |
| `git show --name-only` | 列出某 commit 修改的檔案 |

---

## 相關選項

| 選項 | 顯示內容 |
|------|----------|
| `--name-only` | 只有檔案名稱 |
| `--name-status` | 檔案名稱 + 狀態（A=新增, M=修改, D=刪除） |
| `--stat` | 檔案名稱 + 修改行數統計 |

### 範例比較

```bash
$ git diff --name-only HEAD~1
src/app.js

$ git diff --name-status HEAD~1
M       src/app.js

$ git diff --stat HEAD~1
 src/app.js | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
```

---

## 實用組合

```bash
# 列出這次 PR 改了哪些檔案
git diff --name-only main...HEAD

# 列出最近 5 個 commit 改的所有檔案（去重複）
git diff --name-only HEAD~5

# 搭配 grep 過濾特定類型
git diff --name-only | grep "\.go$"
```
