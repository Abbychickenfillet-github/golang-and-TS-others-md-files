# Bash 指令筆記

## head 和 tail 組合技

```bash
head -n    # 取檔案前 n 行
tail -n    # 取檔案後 n 行

# 取特定行數的技巧：
head -8 file | tail -1    # 取第 8 行
head -20 file | tail -5   # 取第 16-20 行
```

### 範例
```bash
# 假設檔案有 100 行
head -8 file.txt          # 取第 1-8 行
tail -3 file.txt          # 取第 98-100 行
head -8 file.txt | tail -1  # 只取第 8 行
```

## 輸入/輸出重導向

```bash
<     # 輸入重導向：把檔案內容當作程式的輸入
>     # 輸出重導向：把程式輸出寫入檔案（覆蓋）
>>    # 附加重導向：把程式輸出附加到檔案尾端
2>    # 錯誤重導向：把錯誤訊息寫入檔案
2>&1  # 把錯誤訊息導向標準輸出（合併顯示）
```

### 範例
```bash
mysql < script.sql           # 執行 SQL 檔案
echo "hello" > file.txt      # 覆蓋寫入
echo "world" >> file.txt     # 附加寫入
command 2>/dev/null          # 隱藏錯誤訊息
command > log.txt 2>&1       # 輸出和錯誤都寫入 log.txt
```

## sed 指令（串流編輯器）

```bash
sed 's/舊/新/'       # 替換第一個符合的
sed 's/舊/新/g'      # 替換所有符合的（g = global）
sed 's/),(/)\n(/g'   # 把 "),(" 換成 ")\n(" （用換行分隔）
```

## 管線 |

```bash
|    # 把前一個指令的輸出，當作下一個指令的輸入
```

### 範例
```bash
cat file.txt | grep "error"           # 搜尋 error
cat file.txt | head -10 | tail -5     # 取第 6-10 行
ls -la | wc -l                        # 計算檔案數量
```

## wc 指令（計數）

```bash
wc -l    # 計算行數
wc -w    # 計算字數
wc -c    # 計算字元數
```

## tr 指令（字元替換）

```bash
tr ',' '\n'    # 把逗號換成換行
tr 'a-z' 'A-Z' # 小寫轉大寫
```

## 實際案例

```bash
# 從 SQL dump 檔案取出 company 表的第 7 筆資料
sed 's/),(/)\n(/g' company_restore.sql | head -8 | tail -1

# 解釋：
# 1. sed 's/),(/)\n(/g'  → 把每筆 INSERT 資料分成一行
# 2. head -8             → 取前 8 行
# 3. tail -1             → 取最後 1 行（就是第 8 行，即第 7 筆資料，因為第 1 行是 INSERT INTO...）
```
