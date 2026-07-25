---
title: pip CLI 常用指令與 --format 選項（含 pip cache list）
type: concept-note
tags: [cli, python, pip, 套件管理, 面試]
updated: 2026-07-17
---

# pip CLI 常用指令與 `--format` 選項

> 🔖 **本篇重點索引：a–e，共 5 個。** 字母只表位置與數量。

## (a) pip 是什麼 + 在哪執行

<mark style="background: #ADCCFFA6;">pip = Python 的套件安裝器</mark>（Package Installer for Python）。負責從 PyPI 下載、安裝、移除 Python 套件；跨平台。

**在哪打？** <mark style="background: #FFF3A3A6;">CMD／PowerShell／Anaconda Prompt／Git Bash／WSL 都行</mark>（開任一個，直接打 `pip ...`）。

> ⚠️ 你機器上有多個 Python（3.12、3.13、Anaconda），`pip` 可能指到不同的那一個。保險做法：
> - 先確認：`pip --version`（看它屬於哪個 Python）、`where pip`（看有幾個）。
> - 想綁定某個 Python：用 <mark style="background: #BBFABBA6;">`python -m pip ...`</mark>（用「現在這個 python」的 pip，最不會裝錯環境）。
> - 用 conda 環境時先 `conda activate <env>` 再 pip。

## (b) 常用指令速查

| 指令 | 作用 |
|---|---|
| `pip install 套件` | 安裝 |
| `pip install 套件==1.2.3` | 裝指定版本 |
| `pip install -U 套件` | <mark style="background: #FFF3A3A6;">升級</mark>（`-U` = `--upgrade`） |
| `pip uninstall 套件` | 移除 |
| `pip list` | 列出已安裝套件 |
| `pip show 套件` | 看某套件的詳細資訊 |
| `pip freeze > requirements.txt` | 匯出目前環境所有套件版本 |
| `pip install -r requirements.txt` | 依清單一次裝好 |
| `pip cache purge` | <mark style="background: #FF5582A6;">清空</mark>下載快取（不影響已裝套件） |

## (c) `pip list --format`（注意：跟 cache 的 format 不一樣）

`pip list` 的 `--format` 值是：<mark style="background: #ADCCFFA6;">`columns`（預設，表格）、`freeze`（像 requirements 格式）、`json`</mark>。

```bash
pip list                     # 表格：Package  Version
pip list --format freeze     # 套件==版本，一行一個
pip list --format json       # JSON，給程式吃
```

## (d) `pip cache list --format`：你看到的 `human` / `abspath`

<mark style="background: #FFB8EBA6;">你官網看到的那段 `--format <list_format>：human (default) or abspath`，是 `pip cache list` 的選項</mark>（列出「快取裡有哪些套件檔」）。英文原文拆解：

- **Select the output format among: human (default) or abspath** → 從兩種輸出格式擇一：`human`（預設）或 `abspath`。
- **(environment variable: `PIP_FORMAT`)** → 也可以用環境變數 `PIP_FORMAT` 設預設值，不用每次打 `--format`。

兩種格式的差別：

| 值 | 意思 | 適合 |
|---|---|---|
| `human`（預設） | <mark style="background: #BBFABBA6;">人看的</mark>：條列套件名＋檔案，好讀 | 你自己在終端機看 |
| `abspath` | <mark style="background: #ADCCFFA6;">每個快取檔的「絕對路徑」</mark>，一行一個 | 給腳本／程式處理（可管線接下去） |

實際指令範例：

```bash
# 預設 human：看快取裡有哪些套件（好讀）
pip cache list

# 只找某個套件的快取，仍用 human
pip cache list numpy

# abspath：印出每個快取檔的完整路徑（適合餵給其他指令）
pip cache list --format abspath

# 例：把 numpy 的快取檔絕對路徑列出來，數有幾個
pip cache list numpy --format abspath | wc -l
```

`human` 輸出長得像（好讀、有分組）；`abspath` 則是純路徑，例如：

```
C:\Users\User\AppData\Local\pip\cache\wheels\...\numpy-2.0.0-...whl
```

## (e) 用環境變數 `PIP_FORMAT` 設預設

不想每次打 `--format abspath`，可設環境變數（pip 很多選項都能用 `PIP_大寫選項名` 當環境變數覆蓋預設）：

```powershell
# PowerShell（當前工作階段）
$env:PIP_FORMAT = "abspath"
pip cache list          # 之後預設就用 abspath
```

```bash
# bash / WSL
export PIP_FORMAT=abspath
```

> 心法：<mark style="background: #FFF3A3A6;">`--format` 是「這次指令」的輸出格式；`PIP_FORMAT` 環境變數是「預設值」</mark>。命令列上的 `--format` 會蓋過環境變數。

## 資料來源（含查證時間）

> 查證日期：2026-07-17

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| `pip cache`（`--format human/abspath`） | [pip 官方文件 — pip cache](https://pip.pypa.io/en/stable/cli/pip_cache/) | pip v26.1.2 文件 |
| `pip list`（`--format columns/freeze/json`） | [pip 官方文件 — pip list](https://pip.pypa.io/en/stable/cli/pip_list/) | pip v26.1.2 文件 |

## 相關筆記

- 清理與套件管理：[[Linux-清理與套件指令-rm-apt-pip-var]]
- 系統路徑：[[usr-Unix系統資源]]
