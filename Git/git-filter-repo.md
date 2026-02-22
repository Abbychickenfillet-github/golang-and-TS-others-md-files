# git filter-repo — 重寫 Git 歷史的工具

## 它是什麼？

`git filter-repo` 是一個用來**批量重寫 Git 歷史**的工具。

Git 的每個 commit 都是不可變的快照，你沒辦法直接「編輯」某個舊 commit 的內容。`filter-repo` 的做法是：**從頭重新建立所有 commit**，在過程中套用你指定的規則（替換文字、刪除檔案等），產生一條全新的歷史鏈。

### 跟 `git rebase -i` 的差別

| 工具 | 適用場景 | 範圍 |
|------|---------|------|
| `git rebase -i` | 修改最近幾個 commit | 少量 commit |
| `git filter-repo` | 從所有歷史中移除敏感資料 | 整個 repo 歷史 |

---

## 安裝

```bash
pip install git-filter-repo
```

安裝後可以直接當 git 子命令使用：`git filter-repo ...`

---

## 常用功能

### 1. 替換歷史中的敏感文字

最常見的用途：不小心把密碼 commit 進去了，需要從所有歷史中清除。

**建立替換規則檔** (`expressions.txt`)：

```
原始文字==>替換文字
```

> 注意：分隔符是 `==>` （兩個等號加一個大於號）

**範例**：

```
my-secret-password==><PASSWORD>
api-key-12345==><API_KEY>
```

**執行替換**：

```bash
git filter-repo --replace-text expressions.txt --force
```

這會重寫所有 commit，把歷史中所有出現 `my-secret-password` 的地方都換成 `<PASSWORD>`。

### 2. 從歷史中刪除特定檔案

```bash
# 從所有歷史中移除 .env 檔案
git filter-repo --path .env --invert-paths --force
```

### 3. 只保留特定資料夾（拆分 repo）

```bash
# 只保留 backend/ 資料夾的歷史
git filter-repo --path backend/ --force
```

---

## 重要注意事項

### 1. 所有 commit hash 都會改變

因為是重新建立 commit，所以每個 commit 的 hash 都會變。這代表：
- 其他人的本地 clone 會跟遠端不同步
- 必須用 `git push --force` 推上去
- 其他協作者需要重新 clone

### 2. 會自動移除 remote

`filter-repo` 執行後會**自動刪除 `origin` remote**，這是一個安全機制，防止你不小心把清洗前的 ref 推上去。需要手動加回：

```bash
git remote add origin https://github.com/your/repo.git
```

### 3. 必須用 `--force` 推送

```bash
# filter-repo 改了所有 ref，--force-with-lease 會被拒絕
# 必須用 --force
git push --force origin main
```

### 4. GitHub 快取

GitHub 可能會暫時快取舊的 commit 物件。如果是高敏感資料，可以聯繫 GitHub Support 請他們清除快取。

---

## 實際案例：清洗 Abby-notes repo

### 情境

筆記中不小心寫了明文的 MySQL 密碼和 Superuser 帳密，需要從所有歷史中移除。

### 步驟

**1. 先在本地把明文替換成佔位符**（用編輯器或 Claude 幫忙）

**2. Commit 替換結果**

```bash
git add -A
git commit -m "security: 將所有明文密碼替換為佔位符"
```

**3. 建立替換規則檔**

```bash
cat > /tmp/expressions.txt << 'EOF'
my-db-password==><MYSQL_PASSWORD>
admin@company.com==><SUPERUSER_EMAIL>
admin-password==>password=<SUPERUSER_PASSWORD>
EOF
```

**4. 執行 filter-repo**

```bash
git filter-repo --replace-text /tmp/expressions.txt --force
```

**5. 驗證歷史已清洗**

```bash
# 搜尋所有歷史中是否還有密碼
git log --all -p | grep "my-db-password"
# 應該回傳 0 筆
```

**6. 加回 remote 並 force push**

```bash
git remote add origin https://github.com/your/repo.git
git push --force origin main
```

---

## 替換規則檔語法

```
# 基本替換（literal 字串）
原始文字==>替換文字

# 使用正則表達式（regex: 前綴）
regex:password=\w+==>password=<REDACTED>

# 整行替換為空（刪除）
要刪除的文字==>
```

---

## 參考資料

- [git-filter-repo GitHub](https://github.com/newren/git-filter-repo)
- [GitHub 官方建議](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)（GitHub 推薦用 `git filter-repo` 取代舊的 `git filter-branch`）
