---
title: Python 環境不一致(ModuleNotFoundError)與 Anaconda / Pylance
type: topic-note
source: Gemini
category: 技術
tags: [gemini, python, 虛擬環境, venv, anaconda, pylance, VSCode, Cursor]
sources:
  - https://gemini.google.com/app/9dcb39c45ba289eb
updated: 2026-06-26
---

# Python 環境不一致(ModuleNotFoundError)與 Anaconda / Pylance

## 重點整理

### 核心症狀：明明裝了卻 `ModuleNotFoundError`
即使已 `pip install beautifulsoup4`，執行時仍報 `ModuleNotFoundError: No module named 'bs4'`。

> [!warning] 根本原因
> 這是典型的 <mark style="background: #FF5582A6;">Python 環境不匹配</mark>：<mark style="background: #FFF3A3A6;">執行程式碼的解譯器（Interpreter），跟你 pip 安裝套件的環境，不是同一個</mark>。最常發生在用了虛擬環境、或在 VS Code / Cursor 裡選錯解譯器時。

### 解決步驟
1. <mark style="background: #ADCCFFA6;">確認虛擬環境是否啟用</mark>：終端機提示符前應出現 `(venv)`／環境名稱；沒有就先啟用：`.\venv\Scripts\Activate`（Windows PowerShell）。
2. <mark style="background: #BBFABBA6;">確認編輯器的 Python 解譯器</mark>：VS Code / Cursor 按 `Ctrl+Shift+P` → `Python: Select Interpreter`，選到你「裝了 bs4 的那個環境」的路徑。
3. 在<mark style="background: #FFF3A3A6;">已啟用且正確的環境</mark>中重新安裝：`pip install beautifulsoup4`。
4. 確認 import 語法：`from bs4 import BeautifulSoup`（套件名 `beautifulsoup4`，但 import 時叫 `bs4`，別打錯）。

> [!note] 關鍵概念
> <mark style="background: #FFB8EBA6;">套件安裝名 ≠ import 名</mark>：安裝是 `beautifulsoup4`，程式裡卻是 `import bs4`。

### 從 VS Code 換到 Cursor 會造成這問題嗎？
會有相關性——因為 Cursor 是獨立編輯器，<mark style="background: #FFF3A3A6;">它自己會記住一份「選定的解譯器」設定</mark>，可能跟你在 VS Code 選的不一樣，於是又指到沒裝套件的環境。換編輯器後要再做一次 Select Interpreter。

### Anaconda 是什麼
<mark style="background: #ADCCFFA6;">Anaconda 是專為資料科學設計的 Python 發行版（Distribution）</mark>——一個「內建工具箱＋環境管理器」的安裝包：

- 預裝數百個常用套件（NumPy、Pandas、Matplotlib…），不必逐一手動裝。
- <mark style="background: #FFF3A3A6;">Conda</mark>：套件管理＋環境管理系統。類似 pip 但能管 Python 以外的語言；最重要的是能建立<mark style="background: #BBFABBA6;">多個互相隔離的獨立環境</mark>（一個專案用 3.9、另一個用 3.12，套件版本互不干擾）。
- Anaconda Navigator：圖形介面，點按鈕管理環境、啟動 Jupyter Notebook / Spyder。

### Pylance 是什麼，沒它能跑嗎
<mark style="background: #ADCCFFA6;">Pylance 是微軟做的 Python 語言伺服器（Language Server）</mark>，是 VS Code Python 擴充功能的一部分，提供自動補全、語法檢查、型別提示等。

> [!info] Pylance vs 解譯器
> <mark style="background: #BBFABBA6;">沒有 Pylance 程式照樣能跑，完全沒影響。</mark> Pylance 只是讓你「寫」程式更舒服的<mark style="background: #FFF3A3A6;">方向盤與導航儀</mark>；真正把 `.py` 變成可執行指令的引擎是 <mark style="background: #FFF3A3A6;">Python 解譯器（Interpreter）</mark>。車子少了導航儀還是能開——只要電腦裝了 Python、且選定環境裡裝了所需套件，程式就能跑。

### 補充：資料視覺化套件名詞
多數建立在最底層繪圖庫 <mark style="background: #ADCCFFA6;">Matplotlib</mark>（Python 最老牌的 2D 繪圖庫）之上。<mark style="background: #ADCCFFA6;">seaborn</mark> 是基於 Matplotlib 的高階統計視覺化套件（熱力圖、分佈圖、小提琴圖、回歸圖），預設配色更好看、程式碼更少，且能與 Pandas DataFrame 完美整合。

## 各對話來源

### Python 模組未找到的環境問題（2026-06）— https://gemini.google.com/app/9dcb39c45ba289eb

**使用者：**（貼上 traceback）`ModuleNotFoundError: No module named 'bs4'`，已經重新安裝了 bs4，啥問題？

**Gemini：** 典型 Python 環境不一致：安裝模組的環境與執行程式碼的環境不同。①在 VS Code 右下角或 `Ctrl+Shift+P` → `Python: Select Interpreter`，選到裝了 bs4 的環境；②若用虛擬環境，終端機提示符前應有 `(venv)`，沒有就先啟用；③在正確環境重裝 `pip install beautifulsoup4`；④import 語法 `from bs4 import BeautifulSoup`（安裝名 beautifulsoup4、import 名 bs4，別搞混）。

**使用者：** Anaconda 是啥？我從 VSCode 換到 Cursor 會導致這個問題嗎？

**Gemini：** Anaconda 是專為資料科學設計的 Python 發行版，內建大量套件，並透過 Conda 做套件與「多個隔離環境」的管理，附 Anaconda Navigator 圖形介面。換編輯器（VSCode→Cursor）確實可能再次遇到此問題，因為新編輯器會各自記住一份「選定解譯器」設定，要重新 Select Interpreter。

**使用者：** Pylance 是什麼？為什麼原本會有這個 import 套件？

**Gemini：** Pylance 是微軟開發的 Python 語言伺服器，作為 VS Code Python 擴充的一部分，提供自動補全、語法檢查等寫碼輔助。

**使用者：** 沒有 Pylance 還可以跑嗎？

**Gemini：** 完全可以、沒有影響。Pylance 只是改善開發體驗的輔助工具；真正執行 `.py` 的是 Python 解譯器。只要裝了 Python、選定環境有所需套件，程式就能跑。（比喻：Pylance 是方向盤/導航儀，解譯器才是引擎。）

**使用者：** 解釋裡面所有的專有名詞（一張資料視覺化套件圖）。

**Gemini：** 這些大多建立在最核心的 2D 繪圖庫 Matplotlib 之上。seaborn 是基於 Matplotlib 的高階統計視覺化套件，預設配色更好看、程式碼更少，並與 Pandas DataFrame 完美整合。
