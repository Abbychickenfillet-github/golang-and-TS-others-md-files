# Git ls-tree 指令

## 什麼是 ls-tree

`git ls-tree` = 列出 Git **某個 commit 追蹤**的檔案/資料夾

就像 `ls` 是看「工作目錄有什麼」，`git ls-tree` 是看「Git 紀錄裡有什麼」。

---

## 基本語法

```bash
git ls-tree [選項] <tree-ish> [路徑]
```

- `<tree-ish>` = commit hash、分支名、HEAD、tag 等
- 預設列出根目錄的內容

---

## 常用範例

```bash
# 列出 HEAD（目前 commit）追蹤的根目錄檔案/資料夾
git ls-tree --name-only HEAD

# 列出特定分支追蹤的檔案
git ls-tree --name-only main

# 列出特定資料夾內容
git ls-tree --name-only HEAD src/

# 遞迴列出所有檔案（包含子資料夾）
git ls-tree -r --name-only HEAD

# 顯示完整資訊（權限、類型、hash）
git ls-tree HEAD
```

---

## 輸出格式

不加 `--name-only` 時的完整輸出：

```
<mode> <type> <hash>    <name>
100644 blob   abc123... README.md
040000 tree   def456... src
```

| 欄位 | 說明 |
|------|------|
| mode | 權限（100644=檔案, 040000=資料夾） |
| type | blob=檔案, tree=資料夾 |
| hash | Git 物件的 SHA |
| name | 檔案/資料夾名稱 |

---

## 實用場景

### 1. 確認某個分支有沒有某個檔案
```bash
git ls-tree --name-only main | grep frontend
# 有輸出 = 有追蹤, 沒輸出 = 沒有
```

### 2. 比較工作目錄 vs Git 追蹤的差異
```bash
# 工作目錄有什麼
ls

# Git 追蹤什麼
git ls-tree --name-only HEAD

# 如果 ls 有但 ls-tree 沒有 = untracked 或被忽略的本地檔案
```

### 3. 看某個舊 commit 的檔案結構
```bash
git ls-tree --name-only abc1234
```

---

## 與其他指令的差異

| 指令 | 看什麼 |
|------|--------|
| `ls` | 工作目錄（本地實際檔案） |
| `git ls-tree HEAD` | Git 追蹤的檔案（HEAD commit） |
| `git ls-files` | 暫存區（staged）的檔案 |
| `git status` | 工作目錄與 Git 的差異 |
