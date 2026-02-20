# Grep 常用選項

## 顯示上下文行數

| 選項 | 說明 | 範例 |
|------|------|------|
| `-B n` | 顯示匹配行**之前** n 行 (Before) | `grep -B5 "error" file.txt` |
| `-A n` | 顯示匹配行**之後** n 行 (After) | `grep -A5 "error" file.txt` |
| `-C n` | 顯示匹配行**前後各** n 行 (Context) | `grep -C5 "error" file.txt` |

## 範例

```bash
# 找 "error" 並顯示前 20 行
grep -B20 "error" log.txt

# 找 "error" 並顯示後 10 行
grep -A10 "error" log.txt

# 找 "error" 並顯示前後各 5 行
grep -C5 "error" log.txt

# 組合使用：前 3 行，後 5 行
grep -B3 -A5 "error" log.txt
```

## 記憶方式

- **B** = Before（之前）
- **A** = After（之後）
- **C** = Context（上下文）

## 其他常用選項

| 選項 | 說明 |
|------|------|
| `-n` | 顯示行號 |
| `-i` | 忽略大小寫 |
| `-r` | 遞迴搜尋目錄 |
| `-l` | 只顯示檔名 |
| `-c` | 只顯示匹配數量 |
| `-v` | 反向匹配（不包含的行） |
| `-E` | 使用延伸正規表達式 |
