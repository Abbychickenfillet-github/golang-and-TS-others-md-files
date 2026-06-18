# 串列推導式 / rglob / in 運算子（讀懂 collect_md_files）

> 來源：abby-notes-rag 專案 `scripts/ingest.py` 的 `collect_md_files()`

## 原始程式碼

```python
def collect_md_files() -> list[Path]:
    return [
        p for p in Config.NOTES_ROOT.rglob("*.md")
        if ".git" not in p.parts
    ]
```

這個函式做的事：把 `NOTES_ROOT` 資料夾底下（含所有子資料夾）的 `.md` 檔案都找出來，
但排除 `.git` 裡面的檔案，最後回傳一個 `list[Path]`（Path 物件組成的清單）。

---

## 1. 中括號 `[ ]` 在這裡是什麼？→ 串列推導式 (list comprehension)

中括號在 Python 有兩種常見用途：

| 寫法 | 意思 |
|------|------|
| `nums = [1, 2, 3]` | 直接建立一個 list（字面值） |
| `nums[0]` | 用索引取出 list/tuple/str 裡的某個元素 |
| `[ x for x in ... ]` | **串列推導式**：用一行迴圈產生一個新的 list |

`collect_md_files` 用的是第三種。它等同於把迴圈「攤開來寫」：

```python
# 串列推導式（精簡寫法）
result = [p for p in Config.NOTES_ROOT.rglob("*.md") if ".git" not in p.parts]

# 完全等價的展開寫法
result = []
for p in Config.NOTES_ROOT.rglob("*.md"):   # 跑迴圈
    if ".git" not in p.parts:                # 篩選條件
        result.append(p)                     # 通過才放進去
```

讀法口訣：**「對每個 p，如果符合 if 條件，就把 p 放進 list」**。
語法順序是 `[ 要放什麼   for 變數 in 來源   if 條件 ]`。

---

## 2. `rglob` 是什麼？為什麼用它？

`rglob` 是 `pathlib.Path` 的方法，意思是 **r**ecursive **glob**（遞迴萬用字元搜尋）。

- `*.md` 是 pattern（萬用字元）：`*` 代表「任意字元」，所以 `*.md` = 任何以 `.md` 結尾的檔名。
- `glob("*.md")`：**只找當層資料夾**的 .md 檔。
- `rglob("*.md")`：**遞迴往下找所有子資料夾**的 .md 檔（多了開頭的 r = recursive）。

因為筆記分散在很多子資料夾（`Python語法解釋/`、`backend/`、`docker/`…），
所以要用 `rglob` 才能一次抓全部。

> 補充：`rglob` 回傳的不是 list，而是一個**產生器 (generator)**——它「邊找邊吐」，
> 可以被 `for ... in` 逐一取出，但不會一次把全部結果存進記憶體。所以才需要外面的
> 串列推導式 `[ ... ]` 把它「收集」成一個真正的 list。

---

## 3. 為什麼要 `".git" not in p.parts`？

目的：**排除 `.git` 資料夾裡的東西**（git 的內部檔案不是筆記，不該被收進來）。

`p.parts` 會把一個路徑切成「每一層」組成的 **tuple**：

```python
p = Path("C:/coding/Abby-notes/.git/hooks/readme.md")
p.parts
# ('C:\\', 'coding', 'Abby-notes', '.git', 'hooks', 'readme.md')
```

`".git" not in p.parts` 就是在問：「這個路徑的各層裡面，**有沒有** `.git`？」
- 有 → 條件為 False → 不收（被過濾掉）
- 沒有 → 條件為 True → 收進來

---

## 4. 「`in` 是用 for...in 去找不可疊代的物件嗎？」釐清觀念

這裡要分清楚兩個**長得像、但完全不同**的 `in`：

### (a) `for x in 來源` —— 這是迴圈
`in` 在這裡是 `for` 語法的一部分，作用是「從來源**逐一取出**元素」。
來源必須是 **可疊代物件 (iterable)**：list、tuple、str、generator… 都可以。

```python
for p in Config.NOTES_ROOT.rglob("*.md"):   # 逐一取出每個 Path
```

### (b) `x in 容器` / `x not in 容器` —— 這是「成員判斷運算子」
它**不是迴圈**，而是回傳 `True` / `False`，問「容器裡有沒有這個元素」。

```python
".git" not in p.parts   # 回傳 True 或 False
3 in [1, 2, 3]          # True
"a" in "cat"           # True（字串也能判斷）
```

所以回答你的問題：

- `in` **不是**「去找不可疊代的物件」——剛好相反，它操作的對象一定是**可疊代**的。
- `for...in`（迴圈）和 `not in`（成員判斷）是**兩件不同的事**，只是都用到 `in` 這個關鍵字。
  - 在 `collect_md_files` 裡，第一個 `in` 是迴圈（取出 p），第二個 `in` 是成員判斷（檢查 .git）。

---

## 一句話總結

`collect_md_files` = 用**串列推導式**把 **rglob 遞迴找到**的所有 `.md`，
再用 **`not in` 成員判斷**濾掉 `.git` 裡的檔案，收集成 `list[Path]` 回傳。

## 延伸閱讀
- 同資料夾 `if-not.md`（`not` 與真假值判斷）
- 同資料夾 `Dict&Tuple&Class.md`（tuple 是什麼）
