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

## 其他常用選項（含縮寫展開）

| 選項 | 縮寫展開 | 說明 |
|------|---------|------|
| `-n` | line **n**umber | 顯示行號 |
| `-i` | **i**gnore case | 忽略大小寫（"rag" 也匹配 "RAG"） |
| `-r` | **r**ecursive | 遞迴搜尋目錄底下所有檔案 |
| `-l` | files with matches (**l**ist) | 只顯示有匹配的檔名（不顯示內容） |
| `-c` | **c**ount | 只顯示匹配數量 |
| `-v` | in**v**ert match | 反向匹配（不含此模式的行） |
| `-E` | **E**xtended regex | 啟用延伸正規表達式（`\|`、`+`、`?`、`()` 等符號生效）|
| `-w` | **w**hole word | 只匹配完整單字（"cat" 不會匹配 "category"）|
| `-o` | **o**nly matching | 只印出匹配的部分（不印整行）|

## ⚠️ `-E` 的重要意義

沒 `-E` 時，正則的「進階」符號（`|`、`+`、`?`、`()`）會被當成**字面字元**：

```bash
grep "rag|RAG" file.txt          # 找包含 "rag|RAG" 字串（含 | 字元）的行 → 通常找不到
grep -E "rag|RAG" file.txt       # 把 | 當「或」運算子 → 找 "rag" 或 "RAG"
```

## ⚠️ `-i` 的重要意義（容易跟 sed 搞混！）

| 指令 | `-i` 意思 |
|------|----------|
| **grep** | **i**gnore case（忽略大小寫） |
| **sed**  | **i**n-place（直接改原檔案） |

→ **同一個 `-i` 在不同指令意思完全不同**，看到 `-i` 要先想「這是什麼指令的」。

## 一句話速記

- `-i` = ignore case（grep）/ in-place（sed）
- `-E` = Extended regex（讓 `|`、`+` 等生效）
- `-r` = recursive
- `-v` = invert（反向）
- `-l` = list filenames only
- `-n` = line number
- `-c` = count

## 實用範例

```bash
# 不分大小寫找 "rag" 或 "RAG"（其實 -i 後面只寫一個就夠）
grep -iE "rag|RAG" file.txt
grep -i "rag" file.txt              # 等價

# 遞迴搜尋目錄底下所有 .md 檔，找含 "TODO" 的行
grep -rn "TODO" --include="*.md" .

# 反向：印出「不」含 "DEBUG" 的行
grep -v "DEBUG" log.txt

# 只印檔名（不印內容），找哪些檔案含 "secret"
grep -l "secret" *.txt

# 只印匹配數量（不印內容）
grep -c "error" log.txt
```
