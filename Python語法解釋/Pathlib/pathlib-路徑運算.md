# pathlib 路徑運算（以 relative_to 為主角）

> 主題：Python `pathlib.Path` 怎麼做路徑運算，重點是 `relative_to`（砍前綴）。
> 對應程式碼：`abby-notes-rag/scripts/ingest.py`、`search.py`、`init_db.py`。

---

## 0. Path 物件 vs 字串（先建立觀念）

pathlib 把「路徑」做成一個**物件**，不是普通字串。

```python
from pathlib import Path

p = Path("C:/coding/futuresign/Abby-notes/RAG/redis-guide.md")
```

| | 普通字串 `str` | Path 物件 |
|---|--------------|----------|
| 切前綴 | 要自己 `replace` / 切片，容易錯 | `.relative_to()` 一行搞定 |
| 接路徑 | 手動拼 `a + "/" + b`（斜線會亂） | 用 `/` 運算子 `a / b` |
| 跨平台 | Win 的 `\` 跟 Mac 的 `/` 要自己處理 | Path 幫你處理 |
| 取檔名/副檔名/上層 | 自己 split | `.name` / `.suffix` / `.parent` |

所以 pathlib 的存在意義 = **把路徑當「結構化物件」操作，不用拿字串硬幹**。

---

## 1. relative_to —— 砍掉前綴（本篇主角）

```python
absolute.relative_to(base)
```

意思：「算出 `absolute` 相對於 `base` 的部分」，效果就是把開頭的 `base` 前綴拿掉。

```
absolute = C:\coding\futuresign\Abby-notes\RAG\redis-guide.md
base     = C:\coding\futuresign\Abby-notes          (= NOTES_ROOT)
                                              ↓ relative_to 砍掉 base
結果     = RAG\redis-guide.md   (還是一個 Path 物件)
```

### 1.1 它是「路徑運算」，不是「字串刪除」

`relative_to` 懂路徑結構（一層資料夾一層比對），不是單純字串砍頭。所以比 `str.replace(base, "")` 安全可靠。

### 1.2 不在 base 底下會直接報錯（重要差異）

```python
Path("D:/別的地方/x.md").relative_to("C:/coding/futuresign/Abby-notes")
# ValueError: 'D:\別的地方\x.md' is not in the subpath of '...'
```

對比：
- `str.replace` 找不到 → 默默回傳原字串（錯了你不知道）
- `relative_to` 找不到 → **明確 ValueError**（早早炸出來）

對 ingest 來說這是好事：保證每個檔案真的在 NOTES_ROOT 底下，否則立刻報錯，不會默默存錯路徑。

---

## 2. relative_to 的配套：str() + replace

`relative_to` 回傳的還是 **Path 物件**，要再兩步變成乾淨字串。完整流程（ingest.py 的 `relative_path`）：

```python
def relative_path(absolute: Path) -> str:
    return str(absolute.relative_to(Config.NOTES_ROOT)).replace("\\", "/")
```

「最內層往外」剝洋蔥讀：

| 步驟 | 程式碼 | 結果 | 型別 |
|-----|-------|-----|-----|
| 1. 砍前綴 | `absolute.relative_to(NOTES_ROOT)` | `RAG\redis-guide.md` | Path |
| 2. 轉字串 | `str(...)` | `"RAG\redis-guide.md"` | str |
| 3. 換斜線 | `.replace("\\", "/")` | `"RAG/redis-guide.md"` | str |

**`"\\"` 為何兩條**：字串裡 `\` 是跳脫字元，要表示「一條真的反斜線」得寫兩條 `"\\"`。所以這是「把每條反斜線換成正斜線」。

**為何要換正斜線**：Windows 用 `\`、Mac/Linux 用 `/`。統一存 `/` 才跨平台一致，路徑也才可攜（專案搬家、換電腦不會壞）。

---

## 3. 專案裡其他常用的 pathlib 操作

這些都在 abby-notes-rag 出現過，一起記：

### 3.1 `/` 運算子 —— 接路徑（init_db.py）

```python
SQL_FILE = Path(__file__).parent / "init_db.sql"
#          └─ 這個檔案 ─┘ └上層┘  └─ 用 / 接檔名 ─┘
```

`Path` 物件用 `/` 接子路徑，自動處理分隔符，比 `str` 拼接乾淨。

### 3.2 `.parent` —— 往上一層（search.py / ingest.py）

```python
Path(__file__).parent.parent
#              └ 上一層 ┘└ 再上一層 ┘
```

`__file__` 是「目前這個 .py 檔的路徑」，`.parent` 往上跳一層資料夾。`.parent.parent` 跳兩層（從 `scripts/xxx.py` 跳到專案根目錄）。

### 3.3 `.rglob("*.md")` —— 遞迴找檔案（ingest.py collect_md_files）

```python
Config.NOTES_ROOT.rglob("*.md")
```

`rglob` = recursive glob，遞迴掃所有子資料夾，找出符合 pattern 的檔案。`*.md` = 所有 .md 檔。
（`glob` 只掃當層；`rglob` 連子資料夾一起掃。）

### 3.4 `.parts` —— 拆成各層 tuple（ingest.py 排除 .git）

```python
if ".git" not in p.parts:
```

`.parts` 把路徑拆成「每一層」的 tuple：

```python
Path("RAG/.git/config").parts
# → ('RAG', '.git', 'config')
```

所以 `".git" not in p.parts` = 「路徑裡任何一層都不是 .git」→ 排除 git 資料夾裡的檔案。

### 3.5 `.read_bytes()` / `.read_text()` —— 讀檔（ingest.py）

```python
hashlib.md5(path.read_bytes()).hexdigest()       # 讀「位元組」算 MD5
path.read_text(encoding="utf-8")                 # 讀「文字」
```

`read_bytes` 回傳原始 bytes（算 hash 用）；`read_text` 回傳字串（要指定 encoding）。
不用自己 `open()` + `close()`，pathlib 一行讀完。

### 3.6 `.is_absolute()` —— 檢查是不是絕對路徑

```python
absolute.is_absolute()   # True / False
```

提醒：函式參數寫 `absolute: Path` 裡的 `absolute` 只是**名字**，Python 不會自動檢查它是不是絕對路徑。真要確認得用 `.is_absolute()`。詳見 [[RAG術語對照表]] 的「型別提示 ≠ 保證」。

---

## 4. 常用操作速查表

| 操作 | 做什麼 | 例子 |
|-----|-------|-----|
| `.relative_to(base)` | 砍前綴，算相對路徑 | `RAG/x.md` |
| `/` | 接子路徑 | `parent / "init_db.sql"` |
| `.parent` | 往上一層 | `scripts/` |
| `.name` | 取檔名（含副檔名） | `redis-guide.md` |
| `.stem` | 取檔名（不含副檔名） | `redis-guide` |
| `.suffix` | 取副檔名 | `.md` |
| `.parts` | 拆成各層 tuple | `('RAG', 'x.md')` |
| `.rglob(pat)` | 遞迴找檔 | 所有 `*.md` |
| `.read_text()` | 讀成字串 | 檔案內容 |
| `.read_bytes()` | 讀成 bytes | 算 hash 用 |
| `.is_absolute()` | 是不是絕對路徑 | True/False |
| `str(path)` | Path → 字串 | `"RAG\\x.md"` |

---

## 5. 一句話總結

- **`relative_to` 負責「砍掉前綴」**，是路徑運算不是字串刪除，找不到會報錯（這是優點）。
- pathlib 的核心價值：**把路徑當物件操作**，切前綴、接路徑、取檔名都有專門方法，不用拿字串硬拼。

---

## 相關筆記
- [[RAG術語對照表]] — 型別提示 ≠ 保證、相對路徑拆解
- [[Dict&Tuple&Class]] — tuple（`.parts` 回傳的就是 tuple）
