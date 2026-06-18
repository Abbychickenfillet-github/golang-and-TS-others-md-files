# ls 常用選項

`ls` = **l**i**s**t（列出檔案/目錄）

## 常用選項（含縮寫展開）

| 選項 | 縮寫展開 | 說明 |
|------|---------|------|
| `-l` | **l**ong format | 詳細格式（權限、擁有者、大小、日期）|
| `-a` | **a**ll | 顯示所有檔案（含 `.` 開頭的隱藏檔）|
| `-h` | **h**uman readable | 大小用 K/M/G 顯示（要搭配 `-l`）|
| `-t` | sort by **t**ime | 按修改時間排序（最新在前）|
| `-r` | **r**everse | 反向排序 |
| `-S` | sort by **S**ize | 按檔案大小排序 |
| `-R` | **R**ecursive | 遞迴列出子目錄內容 |
| `-d` | **d**irectory | 只顯示目錄本身（不列其內容）|
| `-1` | one column | 一行一個檔案（垂直列出）|
| `-F` | classi**F**y | 在不同類型加符號（`/` 目錄、`*` 可執行檔、`@` 連結）|
| `-i` | **i**node | 顯示 inode 編號 |

## ⚠️ `-i` 又是不同意思

跟 grep 的 `-i`（ignore case）和 sed 的 `-i`（in-place）**完全不同**——
`ls -i` 是顯示 **inode 編號**。

> 學 CLI 一定要記得：**同一個 `-x` 旗標在不同指令意思可能完全不同，要看是哪個指令**。

## 常用組合

```bash
ls              # 簡短列表（隱藏檔不顯示）
ls -a           # 顯示全部（含隱藏檔 .gitignore .env 等）
ls -l           # 詳細格式
ls -la          # 詳細格式 + 含隱藏檔  ← 最常用
ls -lh          # 詳細格式 + 大小用 K/M/G
ls -lah         # 含隱藏 + 詳細 + 易讀大小  ← 開發者最愛
ls -lt          # 按修改時間排序（最新在前）
ls -ltr         # 按時間排序（最舊在前）  ← 看「最新動的檔案在最下面」
ls -lS          # 按大小排序（大到小）
```

## `-l` 輸出長這樣

```
drwxr-xr-x  3 abby staff   96 May  4 14:30 RAG
─┬─ ──┬── ─┬─ ──┬── ──┬── ──┬───────── ─┬─
類型 權限 連結 擁有者 群組  大小  日期    檔名
```

**第一個字元 = 檔案類型**：

| 字元 | 類型 |
|------|------|
| `-` | 一般檔案 |
| `d` | 目錄 (directory) |
| `l` | 符號連結 (symbolic link) |
| `c` | 字元裝置 (character device) |
| `b` | 區塊裝置 (block device) |

**接下來 9 個字元 = 權限**（owner / group / others 各 3 個）：

```
rwxr-xr-x
─┬─ ─┬─ ─┬─
owner group others
```

每個三元組都是 `r`(讀) `w`(寫) `x`(執行)，沒有的話顯示 `-`。

## 為什麼旗標可以合併？`-la` = `-l -a`

POSIX 慣例：**單字母旗標**可以合併，順序無關。

```bash
ls -l -a    # 標準
ls -la      # 合併
ls -al      # 順序顛倒，效果一樣
ls -alh     # 三個合併
```

⚠️ **長旗標不能合併**：

```bash
ls --all --long       # ✓
ls --all-long         # ✗ 變成一個叫 "all-long" 的旗標（不存在）
```

## 結合 grep 過濾

`ls` 列出檔案 → 用 `|` 接給 `grep` 過濾：

```bash
ls -la | grep "^-"             # 只顯示一般檔案（^- 開頭代表類型是 -）
ls -la | grep "^d"             # 只顯示目錄
ls -la | grep -i "rag"         # 找名字含 rag 的（不分大小寫）
ls -la | grep -iE "rag|llm"    # 找含 rag 或 llm 的（用 Extended regex）
```

## Windows PowerShell 的對照

PowerShell 預設沒 `ls`，但有別名：

```powershell
ls               # alias 到 Get-ChildItem
Get-ChildItem    # PowerShell 原生指令
gci              # 短別名
dir              # CMD 老指令的 alias

# PowerShell 風格
Get-ChildItem -Force          # 等同 ls -a（顯示隱藏檔）
Get-ChildItem -Recurse        # 等同 ls -R
```

⚠️ PowerShell 的 `ls -la` **行為跟 bash 不同**：
- `-l` 在 PowerShell 不是 long format
- 真正詳細格式用 `Format-List` 或 `Format-Table -AutoSize`

## 一句話速記

- `-l` = long
- `-a` = all
- `-h` = human readable
- `-t` = time sort
- `-r` = reverse
- `-R` = recursive
- `-la` = `-l -a` 合併（最常用組合）

## 相關筆記

- [grep-options.md](grep-options.md) — grep 選項對照
- [基本小常識.md](基本小常識.md)
- [powershell-vs-bash.md](powershell-vs-bash.md)
