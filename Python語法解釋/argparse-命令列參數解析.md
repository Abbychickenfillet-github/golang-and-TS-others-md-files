# argparse —— Python 內建的「命令列參數」解析器

> 一句話：`argparse` 讓你的 `.py` 腳本能讀懂使用者在終端機打的旗標（flag），
> 例如 `python scripts/ingest.py --full --dry-run`，並自動幫你產生 `--help` 說明。

實例取自本專案 `abby-notes-rag/scripts/ingest.py`。

---

## 1. 為什麼需要它？

沒有 argparse 時，你只能用 `sys.argv` 自己硬切字串：

```python
import sys
if "--full" in sys.argv:   # 自己判斷、自己處理錯誤、自己寫說明文件……很累
    ...
```

argparse 幫你把這些雜事全包了：
- 自動解析旗標、轉型別、給預設值
- 使用者打錯 → 自動印出錯誤並結束
- 自動產生 `-h / --help` 的說明畫面

---

## 2. 四步驟骨架（對照 ingest.py 第 63–67 行）

```python
import argparse

def main():
    # ① 建立解析器物件
    parser = argparse.ArgumentParser()

    # ② 宣告你接受哪些參數
    parser.add_argument("--full",    action="store_true", help="Truncate and re-ingest all")
    parser.add_argument("--dry-run", action="store_true", help="Report only, no DB writes")

    # ③ 真正去讀使用者輸入的東西，解析成物件
    args = parser.parse_args()

    # ④ 用 args.xxx 取值（注意命名規則見下方第 4 節）
    if args.full and not args.dry_run:
        db.truncate_all()
```

| 步驟 | 程式碼 | 在做什麼 |
|------|--------|----------|
| ① | `argparse.ArgumentParser()` | 開一個「參數規則表」 |
| ② | `parser.add_argument(...)` | 往規則表登記一條規則 |
| ③ | `parser.parse_args()` | 照規則表去讀 `sys.argv`，回傳一個物件 |
| ④ | `args.full` | 從物件拿出解析結果 |

---

## 3. `action="store_true"` 是什麼？（重點）

這是「開關型旗標（boolean flag）」最常用的寫法：

```python
parser.add_argument("--full", action="store_true")
```

意思是：
- 使用者**有打** `--full` → `args.full` 變成 `True`
- 使用者**沒打** `--full` → `args.full` 是 `False`（預設）

所以這種旗標**不接後面的值**，它本身的「有沒有出現」就是值。

```bash
python scripts/ingest.py            # args.full = False, args.dry_run = False
python scripts/ingest.py --full     # args.full = True
python scripts/ingest.py --dry-run  # args.dry_run = True
python scripts/ingest.py --full --dry-run   # 兩個都 True
```

---

## 4. 命名規則：`--dry-run` 為什麼變成 `args.dry_run`？

argparse 會自動把旗標名稱裡的 **連字號 `-` 換成底線 `_`**，
因為 Python 變數名不能有 `-`（`args.dry-run` 會被讀成「減法」）。

| 你在終端機打 | 程式裡用 |
|--------------|----------|
| `--full`     | `args.full` |
| `--dry-run`  | `args.dry_run` |

並且開頭的 `--` 會被拿掉。

---

## 5. 免費附贈的 `--help`

你**不用寫任何東西**，argparse 就自動產生說明，`help=` 字串會顯示在這裡：

```bash
$ python scripts/ingest.py --help
usage: ingest.py [-h] [--full] [--dry-run]

options:
  -h, --help  show this help message and exit
  --full      Truncate and re-ingest all
  --dry-run   Report only, no DB writes
```

> 小技巧：檔案開頭 docstring 寫 Usage 給「讀原始碼的人」看；
> `help=` 寫給「在終端機跑的人」看。ingest.py 兩種都有寫。

---

## 6. 常見的其他幾種參數（延伸，本專案沒用到）

```python
# 帶值的選項（要接一個值），並指定型別與預設值
parser.add_argument("--limit", type=int, default=10, help="最多處理幾個檔案")
# 用法： python x.py --limit 5   ->  args.limit == 5 (int)

# 位置參數（必填，不用打旗標名，靠順序）
parser.add_argument("path", help="要處理的資料夾")
# 用法： python x.py ./notes   ->  args.path == "./notes"

# 限定只能選清單裡的值
parser.add_argument("--mode", choices=["full", "incremental"], default="incremental")

# 可接收多個值，存成 list
parser.add_argument("--files", nargs="+")
# 用法： python x.py --files a.md b.md  ->  args.files == ["a.md", "b.md"]
```

| 參數 | 作用 |
|------|------|
| `action="store_true"` | 開關旗標，有打=True |
| `type=int` | 自動把輸入字串轉成該型別 |
| `default=...` | 沒提供時的預設值 |
| `choices=[...]` | 限制合法值，打錯自動報錯 |
| `nargs="+"` | 接收一個以上的值，存成 list |
| 位置參數（名稱不帶 `--`） | 必填、靠順序、不用旗標名 |

---

## 7. 一句話總結

`argparse` = 「規則表（add_argument） + 一次解析（parse_args） + 自動 help」。
本專案 `ingest.py` 用最簡單的 `store_true` 兩個開關，
就做到 `--full`（清空重建）與 `--dry-run`（只報告不寫 DB）兩種執行模式切換。
