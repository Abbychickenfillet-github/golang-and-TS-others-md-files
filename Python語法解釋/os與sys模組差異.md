# Python `os` 與 `sys` 模組的差異

## 一句話說明

- **`os`** = 跟「**作業系統**」打交道(檔案、資料夾、路徑、環境變數)。
- **`sys`** = 跟「**Python 直譯器本身**」打交道(命令列參數、結束程式、標準輸出入)。

一個對外(作業系統),一個對內(Python 執行環境)。

```python
import os
import sys
```

兩個都是標準函式庫,**不用 pip 安裝**,直接 import 就能用。

---

## 對照表

| 面向 | `os` | `sys` |
|------|------|-------|
| 管的東西 | 作業系統:檔案/資料夾/路徑/環境變數/程序 | Python 直譯器:參數/結束/輸出入串流 |
| 典型問題 | 「這個檔案存在嗎?」「家目錄在哪?」 | 「使用者下指令時帶了什麼參數?」「我要結束程式」 |
| 常用成員 | `os.path.join`、`os.path.exists`、`os.environ` | `sys.argv`、`sys.exit`、`sys.stdout` |
| 跨平台差異 | 會處理 Windows / macOS / Linux 的差異(例如路徑分隔符號) | 大多與作業系統無關,針對直譯器 |

---

## `os` 常用功能

```python
import os

# 1. 路徑運算(最常用,且跨平台:Windows 自動用 \,Mac/Linux 用 /)
os.path.join("folder", "file.txt")        # → "folder/file.txt" 或 "folder\\file.txt"
os.path.dirname("/a/b/c.py")              # → "/a/b"        取資料夾部分
os.path.abspath(__file__)                 # → 該檔案的完整絕對路徑
os.path.expanduser("~/.claude")           # → 把 ~ 展開成你的家目錄

# 2. 檢查檔案/資料夾
os.path.exists("config.json")             # → True / False

# 3. 環境變數(作業系統層級的設定)
os.environ.get("PATH")                    # 讀環境變數
```

---

## `sys` 常用功能

```python
import sys

# 1. 命令列參數:使用者在終端機打的字
#    例如執行  python show-my-prompts.py --date today
#    sys.argv == ["show-my-prompts.py", "--date", "today"]
argv = sys.argv[1:]                       # [1:] 去掉檔名,只留參數

# 2. 結束程式(可帶錯誤訊息;非 0 代表失敗)
sys.exit("error: 找不到檔案")             # 印訊息並結束

# 3. 標準輸出入串流
sys.stdout                                # 標準輸出
sys.stderr                                # 標準錯誤(print(..., file=sys.stderr))
```

---

## 本專案範例(claude-log-cli)

兩個模組在 `claude_log.py` / `sync-to-calendar.py` 裡剛好都用到:

```python
import os
import sys

# --- os:處理路徑 ---
# 「這支腳本所在的資料夾」→ 用來定位同目錄的 config.json
BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE, "config.json")     # 組出跨平台的完整路徑
if not os.path.exists(CONFIG_PATH):                 # 檢查檔案在不在
    sys.exit("找不到 config.json")                  # --- sys:結束程式 ---

# --- os:把 ~ 展開成家目錄 ---
PROJECTS_BASE = os.path.expanduser("~/.claude/projects")

# --- sys:讀命令列參數 ---
argv = sys.argv[1:]                                 # 使用者帶的參數
```

口訣:**看到路徑 / 檔案 / `~` / 環境變數 → 用 `os`;看到參數 / 結束程式 / 印到螢幕 → 用 `sys`。**

---

## 容易混淆的點

| 你想做的事 | 該用哪個 | 寫法 |
|------------|----------|------|
| 組出檔案路徑 | `os` | `os.path.join(a, b)` |
| 判斷檔案存在 | `os` | `os.path.exists(p)` |
| 讀環境變數 | `os` | `os.environ.get("KEY")` |
| 拿命令列參數 | `sys` | `sys.argv` |
| 中途結束程式 | `sys` | `sys.exit(msg)` |
| 印到錯誤輸出 | `sys` | `print(x, file=sys.stderr)` |

> 補充:`os` 也能結束程式(`os._exit()`),但那是「立即強制結束、不做清理」的低階用法,一般情況一律用 `sys.exit()`。

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `os` 是什麼? | 跟作業系統互動:路徑、檔案、資料夾、環境變數 |
| `sys` 是什麼? | 跟 Python 直譯器互動:`argv` 參數、`exit` 結束、`stdout` 輸出 |
| 要組路徑用哪個? | `os`(`os.path.join`,跨平台最安全) |
| 要讀使用者參數用哪個? | `sys`(`sys.argv`) |
| 需要 pip 安裝嗎? | 都不用,標準函式庫內建 |
