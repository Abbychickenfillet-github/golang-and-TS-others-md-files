# ⚠️ CLI 旗標在不同指令的「意義衝突」對照表

> **這份筆記的目的**：CLI 學習最容易卡住的地方——同一個 `-x` 旗標在不同指令意思完全不同。
> 看到一個旗標，**先想「這是什麼指令」再查意思**。

---

## `-i` 在不同指令的意思


| 指令             | `-i` 意思                      | 範例                             |
| -------------- | ---------------------------- | ------------------------------ |
| **grep**       | **i**gnore case（忽略大小寫）       | `grep -i "rag" file.txt`       |
| **sed**        | **i**n-place（直接改原檔案）         | `sed -i 's/old/new/' file.txt` |
| **ls**         | **i**node（顯示 inode 編號）       | `ls -i`                        |
| **rm**         | **i**nteractive（刪除前詢問）       | `rm -i file.txt`               |
| **cp**         | **i**nteractive（覆蓋前詢問）       | `cp -i src dst`                |
| **vim**        | （沒這 flag）                    | -                              |
| **docker run** | **i**nteractive（保持 stdin 開啟） | `docker run -it ...`           |
| **awk**        | input field separator        | `awk -F','` 用 `-F` 不是 `-i`     |


**結論**：看到 `-i` 完全不能猜，**必須看是什麼指令**。

### 補充：為什麼 `cp -i` 是「覆蓋前」詢問，不是「複製前」詢問？

`cp` 確實是 copy（複製），但 `-i`（interactive）詢問的時機點是**覆蓋既有檔案前**，不是複製前。原因是 Unix 的設計哲學：**只在「會造成不可逆破壞」的那一刻才打斷你**。

- **複製本身不危險**：你打 `cp` 就是「我要複製」，這正是你的目的。每次都問「你要複製嗎？」是多餘的廢話。
- **覆蓋才危險**：當目標位置**已經有同名檔案**時，`cp` 會直接蓋掉舊檔，**舊檔內容永久消失、無法復原**。這才是需要攔住你問一句的時刻。

```bash
# 目標 dst.txt 不存在 → 直接複製，不問（沒有破壞風險）
cp -i src.txt dst.txt

# 目標 dst.txt 已存在 → 覆蓋前詢問（避免你誤殺舊檔）
cp -i src.txt dst.txt
# cp: overwrite 'dst.txt'? y/n   ← 只有這種情況才會問
```

**對照 `rm -i`**：刪除「本身」就是破壞性動作，所以 `rm -i` 是刪除前就問。
**而 `cp` 的破壞性不在複製、在覆蓋**，所以攔截點自然落在覆蓋的瞬間。

> 一句話：`-i` 攔的不是「動作」，而是「不可逆的損失」。`cp` 的損失發生在覆蓋舊檔那一刻。

---

## `-r` 在不同指令的意思


| 指令       | `-r` 意思                  | 範例                 |
| -------- | ------------------------ | ------------------ |
| **grep** | **r**ecursive（遞迴搜尋目錄）    | `grep -r "TODO" .` |
| **rm**   | **r**ecursive（遞迴刪除目錄） ⚠️ | `rm -rf folder/`   |
| **cp**   | **r**ecursive（遞迴複製目錄）    | `cp -r src/ dst/`  |
| **ls**   | **r**everse（反向排序）        | `ls -lr`           |
| **sort** | **r**everse              | `sort -r file.txt` |
| **find** | （沒這 flag，預設遞迴）           | -                  |


**結論**：`grep / rm / cp` 的 `-r` 意思相近（遞迴），但 `ls / sort` 完全不同（反向）。

---

## `-l` 在不同指令的意思


| 指令            | `-l` 意思                                      |
| ------------- | -------------------------------------------- |
| **ls**        | **l**ong format（詳細格式）                        |
| **grep**      | files with matches (**l**ist filenames only) |
| **wc**        | **l**ines（只算行數）                              |
| **head/tail** | （沒這 flag，用 `-n` 指定行數）                        |
| **curl**      | **l**ocation（跟隨重導向）                          |


---

## `-v` 在不同指令的意思


| 指令               | `-v` 意思                             |
| ---------------- | ----------------------------------- |
| **grep**         | in**v**ert match（反向匹配）              |
| **rm / cp / mv** | **v**erbose（顯示動作詳情）                 |
| **tar**          | **v**erbose                         |
| **curl**         | **v**erbose（顯示 request/response 細節） |
| **(任何指令)**       | 通常是 `--version` 簡寫，但 grep 例外        |


⚠️ `**grep -v` 是反向，不是 verbose**——這是大坑。

---

## `-a` 在不同指令的意思


| 指令        | `-a` 意思                |
| --------- | ---------------------- |
| **ls**    | **a**ll（含隱藏檔）          |
| **grep**  | （沒這 flag）              |
| **find**  | **a**nd（連接條件）          |
| **du**    | **a**ll（顯示所有檔案大小，不只目錄） |
| **uname** | **a**ll info           |


---

## `-n` 在不同指令的意思


| 指令              | `-n` 意思                       |
| --------------- | ----------------------------- |
| **grep**        | line **n**umber（顯示行號）         |
| **head / tail** | **n**umber of lines（顯示幾行）     |
| **sed**         | **n**o auto-print（搭配 `p` 命令用） |
| **echo**        | **n**o newline（不加換行）          |
| **sort**        | **n**umeric（按數字排序）            |


---

## 怎麼避免搞混？

### 1. 看到旗標，先問「這是哪個指令」

```bash
# ❌ 看到 -i 就猜「直接改檔案」
# ✅ 先看是 grep 還是 sed
```

### 2. 用長旗標（`--long-flag`）避免歧義


| 短旗標（易混淆）  | 長旗標（明確）              |
| --------- | -------------------- |
| `grep -i` | `grep --ignore-case` |
| `sed -i`  | `sed --in-place`     |
| `rm -i`   | `rm --interactive`   |
| `ls -a`   | `ls --all`           |


寫 script 時用長旗標，**未來自己看也清楚**。

### 3. 用 `man` / `--help` 確認

```bash
man grep        # 查 grep 文件
grep --help     # 看簡短 help
```

### 4. 記「指令 + 旗標」當完整單位

❌ 「`-i` 是 ignore case」（會搞混）
✅ 「`grep -i` 是 ignore case」「`sed -i` 是 in-place」

---

## 速查：本筆記列出的衝突總結


| 旗標   | 主要衝突                                                 |
| ---- | ---------------------------------------------------- |
| `-i` | grep(忽略大小寫) vs sed(改原檔) vs rm/cp(互動式)                |
| `-r` | grep/rm/cp(遞迴) vs ls/sort(反向)                        |
| `-l` | ls(詳細) vs grep(只列檔名) vs wc(行數)                       |
| `-v` | grep(反向) vs 多數指令(verbose)                            |
| `-n` | grep(行號) vs head/tail(行數) vs echo(不換行) vs sort(數字排序) |


---

## 相關筆記

- [grep-options.md](grep-options.md)
- [ls-options.md](ls-options.md)
- [sed-文字替換指令.md](../command-line/sed-文字替換指令.md)
- [Bash-vs-PowerShell設計哲學差異](Bash-vs-PowerShell設計哲學差異md)（原「基本小常識」內容已併入此篇）

