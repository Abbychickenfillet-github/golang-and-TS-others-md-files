---
title: Python re 模組——正規表達式與五個常用函式
type: topic-note
source: Gemini
category: 技術
tags: [gemini, python, re, regex, 正規表達式, 字串處理]
aliases: [re模組, Python正規表達式, regular-expression]
related:
  - "[[print-字串拼接方法]]"
  - "[[list-comprehension-rglob-in]]"
sources:
  - https://gemini.google.com/app/3c975b651eeaa27e
updated: 2026-08-14
---

# Python re 模組——正規表達式與五個常用函式

> 本篇重點 a–j，共 10 個。

> [!info] 為什麼跟其他筆記有關聯
> a. 與 [[list-comprehension-rglob-in]] 相關：`rglob` 用的是 <mark style="background: #ADCCFFA6;">glob 萬用字元</mark>（只有 `*` `?` `[]`），能表達的規則遠比正規表達式弱；當檔名比對條件複雜到 glob 寫不出來時，正確做法就是先用 `rglob('*')` 全撈，再用 `re` 過濾。
> b. 與 [[print-字串拼接方法]] 相關：字串拼接是<mark style="background: #D2B3FFA6;">「組出字串」</mark>，`re` 是<mark style="background: #D2B3FFA6;">「拆解字串」</mark>，兩者是同一件事的正反面。

## 重點整理

### 一、re 模組是什麼

c. `re` 是 Python 的<mark style="background: #FFF3A3A6;">內建模組</mark>（不需要 `pip install`），用途是處理<mark style="background: #ADCCFFA6;">正規表達式（Regular Expression，簡稱 regex 或正則）</mark>——一種用來描述「字串長什麼樣子」的<mark style="background: #FFF3A3A6;">搜尋模式（Pattern）</mark>語言。

```python
import re   # 內建，直接 import 就能用
```

d. 四大應用場景（並列，無先後）：

- <mark style="background: #ADCCFFA6;">搜尋與匹配</mark>：檢查一段字串裡有沒有符合特定規則的片段。
- <mark style="background: #ADCCFFA6;">資料萃取（Extraction）</mark>：從一大段文字裡撈出特定格式的資料，例如 email、電話號碼、身分證字號、網址。
- <mark style="background: #ADCCFFA6;">字串替換（Substitution）</mark>：把符合規則的文字換成別的內容。
- <mark style="background: #ADCCFFA6;">字串分割（Splitting）</mark>：依據複雜或多變的條件切割字串，補足 `str.split()` 只能用固定分隔符的限制。

### 二、五個常用函式（依「找 → 換 → 切」記憶）

e. <mark style="background: #BBFABBA6;">找</mark>——三個 search 家族的函式，差別在「從哪裡找」與「找幾個」：

| 函式 | 從哪裡開始找 | 找幾個 | 回傳型別 | 沒找到時 |
|---|---|---|---|---|
| `re.search()` | 整個字串的<mark style="background: #FFF3A3A6;">任何位置</mark> | 只找<mark style="background: #FFF3A3A6;">第一個</mark> | Match 物件 | `None` |
| `re.match()` | 只從<mark style="background: #FF5582A6;">字串最開頭</mark> | 只找第一個 | Match 物件 | `None` |
| `re.findall()` | 整個字串 | <mark style="background: #FFF3A3A6;">全部</mark> | list（串列） | `[]` 空串列 |

```python
import re
text = "訂單 A-102 與 A-233 已出貨"

re.search(r"A-\d+", text).group()   # 'A-102'  ← 只回第一個
re.match(r"A-\d+", text)            # None     ← 開頭是「訂」不是 A，所以失敗
re.findall(r"A-\d+", text)          # ['A-102', 'A-233']  ← 全部，且直接是字串串列
```

f. <mark style="background: #FF5582A6;">最常見的陷阱</mark>：把 `re.match()` 當成 `re.search()` 用。`match()` 只錨定<mark style="background: #FF5582A6;">字串開頭</mark>，中間有再多符合的片段也一律回 `None`。想在整段文字裡找，請一律用 `search()` 或 `findall()`。

g. <mark style="background: #FF5582A6;">第二個陷阱</mark>：`search()` 與 `match()` 回傳的是 <mark style="background: #ADCCFFA6;">Match 物件</mark>而不是字串，要再呼叫 `.group()` 才拿得到文字；而且沒找到時回的是 `None`，直接串 `.group()` 會噴 `AttributeError`。安全寫法：

```python
m = re.search(r"A-\d+", text)
if m:                 # 先判斷有沒有找到
    print(m.group())
```

h. <mark style="background: #BBFABBA6;">換</mark>——`re.sub(pattern, 替換成什麼, 原字串)`，把所有符合規則的片段換掉：

```python
re.sub(r"\d", "#", "電話 0912-345-678")   # '電話 ####-###-###'
```

i. <mark style="background: #BBFABBA6;">切</mark>——`re.split()`，用規則而非固定字元來切割：

```python
"a1b22c".split("1")            # ['a', 'b22c']   ← 內建 split 只認固定字串
re.split(r"\d+", "a1b22c")     # ['a', 'b', 'c'] ← 連續數字都算一個分隔符
```

j. <mark style="background: #D2B3FFA6;">記憶口訣</mark>：<mark style="background: #FFF3A3A6;">search 找第一個、match 只認開頭、findall 全都要、sub 負責換、split 負責切。</mark>

---

## ⚠️ 存疑／更正

同一場對話後半段問到「Open_ct 是什麼」，Gemini 回答混雜了「程式變數 open count」「一款社交 App openCT」「OpenCat 聊天客戶端」三種不相干的解釋，屬於<mark style="background: #FF5582A6;">在資訊不足時硬湊答案</mark>的情況，沒有可信的單一結論，故不收進本篇重點。若日後真的遇到 `open_ct`，請以該專案自己的原始碼／文件為準。

## 各對話來源

### Python re 模組：正規表達式指南（2026-08-14）— https://gemini.google.com/app/3c975b651eeaa27e

**使用者：** Python 的 re 模組是什麼用途？

**Gemini：** Python 的 re 模組是用來處理正規表達式（Regular Expressions）的內建模組。正規表達式是一種用來描述字串搜尋模式（Pattern）的強大工具。re 模組主要用於以下場景：字串搜尋與匹配、資料萃取（Extraction，例如電子郵件地址、電話號碼、身分證字號、網址）、字串替換（Substitution）、字串分割（Splitting）。常見的常用函數：`re.search()` 在整個字串中搜尋第一個符合規則的片段；`re.match()` 從字串的最開頭開始檢查是否符合規則；`re.findall()` 找出字串中所有符合規則的片段，並以列表（List）形式回傳；`re.sub()` 將符合規則的文字替換成指定的字串；`re.split()` 根據正規表達式的規則來分割字串。

**使用者：** Open_ct 是什麼

**Gemini：**（回答混雜「open count 變數命名」「openCT 社交 App」「OpenCat 聊天客戶端」三種不相干解釋，見上方「⚠️ 存疑／更正」。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇原始對話 | https://gemini.google.com/app/3c975b651eeaa27e | Gemini 對話，整理於 2026-08-14 |
| re 模組官方文件（函式行為、Match 物件、回傳值） | https://docs.python.org/3/library/re.html | Python 3 官方文件，查證於 2026-08-14 |
| 正規表達式 HOWTO（search vs match 差異說明） | https://docs.python.org/3/howto/regex.html | Python 3 官方文件，查證於 2026-08-14 |
