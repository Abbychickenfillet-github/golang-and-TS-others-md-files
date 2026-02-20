# grep -E 擴展正則表達式

`-E` 參數啟用 **Extended Regular Expression（ERE，擴展正則表達式）**。

---

## BRE vs ERE 比較

| 特性 | BRE（無 -E） | ERE（有 -E） |
|------|-------------|-------------|
| 全名 | Basic Regular Expression | Extended Regular Expression |
| 特殊字元 | 需要跳脫 `\` | 直接使用 |
| 可讀性 | 較差（反斜線多） | 較好（乾淨） |
| 功能 | 完全相同 | 完全相同 |

**結論：ERE 不是比較厲害，只是寫起來比較方便。**

---

## 語法對照表

| 功能 | BRE（無 -E） | ERE（有 -E） |
|------|-------------|-------------|
| OR | `grep "a\|b"` | `grep -E "a|b"` |
| 一個或多個 | `grep "a\+"` | `grep -E "a+"` |
| 零個或一個 | `grep "a\?"` | `grep -E "a?"` |
| 群組 | `grep "\(abc\)"` | `grep -E "(abc)"` |
| 重複次數 | `grep "a\{2,3\}"` | `grep -E "a{2,3}"` |

---

## 實際範例對照

### 搜尋 upload 或 delete

```bash
# BRE - 需要跳脫 |
grep "upload\|delete" file.txt

# ERE - 直接寫
grep -E "upload|delete" file.txt
```

### 搜尋一個或多個數字

```bash
# BRE
grep "[0-9]\+" file.txt

# ERE
grep -E "[0-9]+" file.txt
```

### 搜尋重複 2-3 次的 a

```bash
# BRE
grep "a\{2,3\}" file.txt

# ERE
grep -E "a{2,3}" file.txt
```

---

## ERE 常用特殊字元

| 字元 | 意思 | 範例 | 匹配 |
|------|------|------|------|
| `|` | OR（或） | `cat|dog` | cat 或 dog |
| `+` | 一個或多個 | `a+` | a, aa, aaa... |
| `?` | 零個或一個 | `colou?r` | color 或 colour |
| `()` | 群組 | `(ab)+` | ab, abab, ababab... |
| `{n}` | 剛好 n 次 | `a{3}` | aaa |
| `{n,m}` | n 到 m 次 | `a{2,4}` | aa, aaa, aaaa |
| `{n,}` | 至少 n 次 | `a{2,}` | aa, aaa, aaaa... |

---

## 群組 `()` 的用途

### 1. 搭配 OR 使用

```bash
# 搜尋 upload-image 或 upload-file
grep -E "upload-(image|file)" log.txt

# 不用群組的話要寫兩次
grep -E "upload-image|upload-file" log.txt
```

### 2. 搭配重複使用

```bash
# 搜尋 ab 重複多次：ab, abab, ababab...
grep -E "(ab)+" file.txt

# 搜尋 ha 重複 2-3 次：haha, hahaha
grep -E "(ha){2,3}" file.txt
```

### 3. 搭配反向參照（Backreference）

```bash
# 搜尋重複的單字，如 "the the"
grep -E "([a-z]+) \1" file.txt
#         ↑群組    ↑參照第一個群組
```

---

## 所以 -E 比較厲害嗎？

**不是。BRE 和 ERE 功能完全一樣。**

差別只在於語法：
- BRE：特殊字元要加 `\` 才有特殊意義
- ERE：特殊字元直接就有特殊意義

```bash
# 這兩個完全等價
grep "upload\|delete" file.txt
grep -E "upload|delete" file.txt
```

### 為什麼大家都用 -E？

因為**可讀性好**。比較：

```bash
# BRE - 反斜線地獄
grep "\(error\|warn\)\{1,\}" log.txt

# ERE - 清楚易讀
grep -E "(error|warn){1,}" log.txt
```

---

## 其他相關參數

| 參數 | 意思 |
|------|------|
| `-E` | 擴展正則（ERE） |
| `-F` | 固定字串（不解析正則，最快） |
| `-P` | Perl 正則（最強大，支援 lookahead 等） |
| `-i` | 忽略大小寫 |
| `-v` | 反向匹配（不包含的行） |
| `-n` | 顯示行號 |
| `-r` | 遞迴搜尋目錄 |

---

## 快速記憶

```
-E = Extended = 擴展 = 不用跳脫 = 好寫好讀
```

**建議：永遠用 `-E`，除非你喜歡打反斜線。**
