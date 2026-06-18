# Bash 指令筆記（Claude 協作版）

## mysqldump - 匯出資料庫結構

### 基本語法

```bash
mysqldump -h 主機 -P 連接埠 -u 使用者名稱 -p'密碼' --no-data 資料庫名 > 輸出檔案.sql
```

### 參數說明

| 參數 | 說明 |
|------|------|
| `-h` | 主機位址 (host) |
| `-P` | 連接埠號 (Port，注意是大寫 P) |
| `-u` | 使用者名稱 (user) |
| `-p'密碼'` | 密碼（緊接 -p，無空格）|
| `--no-data` | 只匯出結構，不匯出資料 |
| `>` | 重定向輸出到檔案 |

### 實際案例

```bash
# 使用 Docker 執行 mysqldump（當本機沒有 mysql 用戶端時）
docker run --rm mysql:8.0 mysqldump \
  -h hnd1.clusters.zeabur.com \
  -P 32195 \
  -u root \
  -p'<MYSQL_PASSWORD>' \
  --no-data \
  future_sign_prod \
  > sql/futuresign_prod_dump_20260124.sql
```

### 常見問題

#### ⚠️ 警告：密碼不安全

**問題**：執行命令後看到以下警告
```
mysqldump: [Warning] Using a password on the command line interface can be insecure.
```

**解答**：
- ✅ 這只是**警告**，不是錯誤
- ✅ 命令**已經成功執行**了
- ✅ 檔案應該已經產生了
- ⚠️ 這個警告是提醒你：密碼暴露在命令列中可能被其他使用者看到
- 💡 對於一次性操作，可以忽略這個警告

**如何驗證成功**：
```bash
# 檢查檔案是否產生
ls -lh sql/futuresign_prod_dump_20260124.sql

# 如果看到檔案大小（例如 613K），就表示成功了！
```

#### 沒有 mysqldump 命令

**問題**：
```
mysqldump: command not found
```

**解決方案**：使用 Docker
```bash
docker run --rm mysql:8.0 mysqldump [其他參數...]
```

---

## ls - 列出檔案

### 常用選項

```bash
ls              # 列出目前目錄檔案
ls -l           # 詳細格式（long format）
ls -h           # 人類可讀的檔案大小（human-readable）
ls -lh          # 組合：詳細 + 可讀大小
ls -a           # 顯示隱藏檔案（all）
ls -lha         # 全部組合
```

### 輸出說明

```bash
$ ls -lh sql/futuresign_prod_dump_20260124.sql
-rw-r--r-- 1 User 197121 613K Jan 24 15:47 sql/futuresign_prod_dump_20260124.sql
│          │ │    │      │    │        │
│          │ │    │      │    │        └─ 檔名
│          │ │    │      │    └─ 修改日期時間
│          │ │    │      └─ 檔案大小（613KB）
│          │ │    └─ 使用者群組 ID
│          │ └─ 使用者名稱
│          └─ 連結數
└─ 權限（r=讀 w=寫 x=執行）
```

---

## diff - 比較檔案差異

### 基本用法

```bash
diff file1.txt file2.txt          # 簡單比較
diff -u file1.txt file2.txt       # 統一格式（unified format）
diff -u file1 file2 > diff.txt    # 儲存差異到檔案
```

### 輸出符號說明

```
---  第一個檔案
+++  第二個檔案
-    第一個檔案有，第二個檔案沒有（刪除）
+    第二個檔案有，第一個檔案沒有（新增）
```

### 實際案例

```bash
# 比較兩個資料庫 schema
diff -u sql/futuresign_prod_dump_20260124.sql sql/futuresign_dev_dump_20260121_151711.sql > sql/schema_diff.txt
```

---

## grep - 搜尋文字

### 基本用法

```bash
grep "搜尋內容" 檔名               # 搜尋並顯示匹配行
grep -c "搜尋內容" 檔名            # 計數（count）
grep "CREATE TABLE" *.sql         # 搜尋多個檔案
```

### 實際案例

```bash
# 統計 SQL 檔案中有多少個資料表
grep -c "CREATE TABLE" dump.sql

# 列出所有資料表名
grep "CREATE TABLE" dump.sql
```

---

## pipe (管道) |

### 概念

```bash
命令1 | 命令2
```
- 把**命令1的輸出**作為**命令2的輸入**
- 可以無限串接

### 實際案例

```bash
# 找出所有資料表名並排序
grep "CREATE TABLE" dump.sql | sort

# 找出所有資料表名，排序，然後儲存到檔案
grep "CREATE TABLE" dump.sql | sort > tables.txt

# 複雜案例：搜尋 → 排序 → 只看前 10 個
grep "CREATE TABLE" dump.sql | sort | head -10
```

---

## 重定向符號

```bash
>     # 輸出重定向（覆蓋）
>>    # 輸出重定向（追加）
<     # 輸入重定向
2>    # 錯誤輸出重定向
2>&1  # 把錯誤輸出合併到標準輸出
```

### 實際案例

```bash
# 覆蓋寫入
echo "hello" > file.txt

# 追加寫入
echo "world" >> file.txt

# 忽略錯誤訊息
command 2>/dev/null

# 錯誤和正常輸出都儲存
command > output.txt 2>&1
```

---

## 作者筆記

### 2026-01-24 - mysqldump 首次使用

**任務**：匯出生產資料庫的 schema

**遇到的困惑**：
1. 執行命令後出現 warning，以為命令失敗了
2. 不知道如何確認是否成功

**解決方法**：
1. ✅ Warning 不是錯誤，只是安全提示
2. ✅ 使用 `ls -lh` 檢查檔案大小，確認匯出成功
3. ✅ 如果檔案大小合理（不是 0KB），就表示成功了

**經驗教訓**：
- Bash 命令成功時通常**不會有輸出**（"no news is good news"）
- Warning ≠ Error
- 遇到 Warning 先檢查**結果**而不是停下來
