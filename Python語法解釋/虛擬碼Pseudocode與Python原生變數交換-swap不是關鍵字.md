---
title: 虛擬碼 Pseudocode 與 Python 原生變數交換：swap 不是關鍵字
type: topic-note
source: Gemini
tags: [gemini, python, pseudocode, 虛擬碼, tuple-unpacking, 演算法, dutch-national-flag, cpp]
aliases: [swap是內建嗎, 虛擬碼與真程式碼差別, Tuple-Unpacking交換]
related:
  - "[[多重賦值]]"
  - "[[Python資料結構有序性與錯誤處理-vs-Nodejs]]"
sources:
  - https://gemini.google.com/app/84fa6cc5c94813d7
updated: 2026-08-14
---

# 虛擬碼 Pseudocode 與 Python 原生變數交換：swap 不是關鍵字

> 與 [[多重賦值]] 相關的原因：這篇的核心解法「`a, b = b, a`」正是那篇談的多重賦值 / Tuple Unpacking 的最經典應用，那篇講機制，這篇講它在演算法題目裡怎麼用。
> 與 [[Python資料結構有序性與錯誤處理-vs-Nodejs]] 相關的原因：兩篇都在處理「看起來像 Python 但其實不是」的誤判問題，一篇是跨語言，一篇是虛擬碼與真程式碼。

**本篇重點 a–i，共 9 個。**

## 重點整理

> [!danger] 一句話結論
> <mark style="background: #FF5582A6;">`swap` 在 Python 中不是關鍵字，也不是內建函式。</mark>看到影片或講義寫 `swap values at low and mid`，那是<mark style="background: #ADCCFFA6;">虛擬碼（Pseudocode）</mark>，<mark style="background: #FF5582A6;">貼進直譯器會直接 SyntaxError</mark>。

### 一、Python 原生的交換寫法

(a) Python 靠<mark style="background: #ADCCFFA6;">多元組解構（Tuple Unpacking）</mark>交換值，<mark style="background: #BBFABBA6;">不需要臨時變數 `temp`</mark>，這是最地道的原生寫法。

```python
# 1. 交換 nums[low] 與 nums[mid] 的值
nums[low], nums[mid] = nums[mid], nums[low]

# 2. 將 low 與 mid 各加 1
low += 1
mid += 1
```

(b) 一般變數的版本就是 `a, b = b, a`，運作原理是右側先<mark style="background: #D2B3FFA6;">打包成一個 tuple</mark>，再一次性拆開賦值給左側，所以不會有「先蓋掉再讀取」的問題。

### 二、怎麼一眼認出這是虛擬碼

(c) 影片裡那段程式碼屬於 <mark style="background: #ADCCFFA6;">Pythonic Pseudocode（Python 風格虛擬碼）</mark>：

```text
low = 0
mid = 0
high = length of nums - 1

while mid <= high:
    if nums[mid] == middle element:
        increment mid
    else if nums[mid] > middle element:
        swap values at mid and high
        decrement high
    else if nums[mid] < middle element:
        swap values at low and mid
        increment low, increment mid
```

(d) <mark style="background: #FFF3A3A6;">看起來像 Python 的原因</mark>：用縮排代表區塊（沒有 `{}` 或 `end while`）、變數不宣告型態、`nums[mid]` 的存取方式很 Python。

(e) <mark style="background: #FF5582A6;">仍然是虛擬碼的原因</mark>——混入了自然語言，且關鍵字寫錯：

| 虛擬碼寫法 | 正式 Python 寫法 | 錯在哪 |
|---|---|---|
| `length of nums - 1` | `len(nums) - 1` | Python 無法解析 `length of` |
| `increment mid` | `mid += 1` | Python <mark style="background: #FF5582A6;">沒有 `increment` 關鍵字</mark> |
| `decrement high` | `high -= 1` | Python <mark style="background: #FF5582A6;">沒有 `decrement` 關鍵字</mark> |
| `swap values at low and mid` | `nums[low], nums[mid] = nums[mid], nums[low]` | Python <mark style="background: #FF5582A6;">沒有 `swap` 關鍵字</mark> |
| `else if` | <mark style="background: #BBFABBA6;">`elif`</mark> | 寫 `else if` 會直接 SyntaxError |
| `middle element` | `middle_element`（且需先賦值） | 中間有空格，Python 視為語法錯誤 |

(f) 所以答案很明確：這是 <mark style="background: #BBFABBA6;">1. 演算法虛擬碼</mark>，不是單純的英文說明——因為它有 `while mid <= high:` 這種控制流程與縮排結構，是「用程式語言架構描述邏輯」。

### 三、為什麼作者要這樣寫

(g) 虛擬碼的目的只是<mark style="background: #FFF3A3A6;">表達邏輯給「人」看懂</mark>，不是給電腦執行。作者用 `swap` 這個英文單字，是為了讓<mark style="background: #D2B3FFA6;">不同程式語言背景的觀眾</mark>都能直觀理解「這裡要把兩個數字對調」。

(h) 只要你在實作時把虛擬碼<mark style="background: #BBFABBA6;">手動翻譯成合法語法</mark>，效果完全一樣：

```python
# 影片虛擬碼：
#   swap values at low and mid

# 翻譯成實際可執行的 Python：
nums[low], nums[mid] = nums[mid], nums[low]
```

(i) <mark style="background: #FFB8EBA6;">補充查證</mark>：那支影片（The Dutch National Flag Problem，荷蘭國旗問題）簡報畫面用的是 Python 風格虛擬碼，但作者資訊欄提供的 Gist 與 Code 章節，<mark style="background: #FF5582A6;">實際實作是 C++</mark>——`void dutchNationalFlag(vector<int>& nums)`、`std::swap(nums[low], nums[mid]);`、`low++ / mid++`。

> [!tip] 順便補：C++ 的 swap 是真的存在
> C++ 標準庫確實有 <mark style="background: #BBFABBA6;">`std::swap()`</mark>（定義於 `<utility>`），所以在 C++ 世界寫 `swap(a, b)` 是<mark style="background: #BBFABBA6;">合法程式碼</mark>。這正是為什麼 Abby 會困惑——同一個字在 C++ 是內建函式，在 Python 卻只是虛擬碼裡的英文。

### 四、荷蘭國旗演算法本身在做什麼（補充）

三個指標 `low`、`mid`、`high` 把陣列分成四區：小於中間值、等於中間值、未處理、大於中間值。`mid` 一路往右掃：

- 遇到<mark style="background: #BBFABBA6;">等於</mark>中間值 → `mid += 1`
- 遇到<mark style="background: #ADCCFFA6;">小於</mark>中間值 → 與 `low` 交換，`low += 1`、`mid += 1`
- 遇到<mark style="background: #FF5582A6;">大於</mark>中間值 → 與 `high` 交換，`high -= 1`，<mark style="background: #FFF3A3A6;">但 `mid` 不動</mark>（因為從右邊換過來的值還沒檢查過）

影片 2:18 處演示的就是第三種情況：`mid` 指向 3（大於中間值 2），與 `high` 交換並 `decrement high`，交換後 `mid` 再次指向新換過來的數字，準備進入下一輪。

```python
def dutch_national_flag(nums, middle_element):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == middle_element:
            mid += 1
        elif nums[mid] > middle_element:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1                      # 注意：mid 不前進
        else:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
    return nums
```

## 自我測驗

### 填空（點擊顯示答案）

1. Python 交換兩個變數的地道寫法是 ||`a, b = b, a`（多元組解構 Tuple Unpacking）||，不需要 ||臨時變數 temp||。
2. 虛擬碼的 `increment mid` 翻成 Python 是 ||`mid += 1`||。
3. 虛擬碼的 `else if` 在 Python 中正確關鍵字是 ||`elif`||。
4. 虛擬碼的 `length of nums - 1` 翻成 Python 是 ||`len(nums) - 1`||。
5. C++ 標準庫中真的存在的交換函式是 ||`std::swap()`，定義於 `<utility>` 標頭檔||。
6. 荷蘭國旗演算法中，`mid` 遇到「大於中間值」時交換到 high 之後，`mid` ||不前進（因為換過來的值還沒被檢查過）||。

### 是非題

1. `swap` 是 Python 的內建函式。 → ||✗ 錯。Python 沒有 swap 關鍵字或內建函式，交換靠多元組解構。||
2. 影片畫面上那段程式碼原封不動貼進 Python 就能執行。 → ||✗ 錯。會在第一行就 SyntaxError 或 NameError，因為混了 `length of`、`increment`、`else if` 等非法語法。||
3. 那段程式碼是「純英文說明」而不是虛擬碼。 → ||✗ 錯。它有 `while mid <= high:` 控制流程與 Python 式縮排結構，屬於演算法虛擬碼。||
4. `std::swap()` 在 C++ 中是合法可執行的。 → ||✓ 對。C++ 標準庫確實提供，這也是同一個字在兩種語言意義不同的原因。||
5. 虛擬碼寫得不合法，代表這個演算法邏輯是錯的。 → ||✗ 錯。虛擬碼的目的是給人看懂邏輯，翻譯成合法語法後效果完全相同。||

### 申論題

1. 為什麼 Python 的 `a, b = b, a` 不需要臨時變數就能正確交換？請從「右側先求值並打包成 tuple」的角度解釋，並說明如果改成 `a = b` 再 `b = a` 會發生什麼事。
2. 你在看演算法教學影片時，如何快速判斷畫面上的程式碼是「可執行的某語言原始碼」還是「虛擬碼」？請至少列出三個判斷訊號，並說明為什麼作者選擇用虛擬碼呈現對觀眾是有利的。

## 各對話來源（原文摘要）

### Python 原生語法：變數交換與遞增（2026-08）— https://gemini.google.com/app/84fa6cc5c94813d7

使用者：`swap values at low and mid` `increment low, increment mid` 是 python 原生語法嗎？

Gemini：不是，這是演算法虛擬碼或英文說明，並給出 Python 的多元組解構寫法。整合進上方 (a)～(b)。

使用者：看影片 2:18。

Gemini：說明該處演示的是荷蘭國旗演算法處理元素 3 的狀況（與 high 交換、decrement high、mid 不動）。整合進上方第四節。

使用者：這是 Python 的虛擬碼嗎？

Gemini：判定為「Python 風格虛擬碼」，列出像 Python 的理由（縮排、無型態宣告、串列存取）與仍屬虛擬碼的理由（自然語言、`else if` 而非 `elif`）。整合進上方 (c)～(e)。

使用者：那你怎麼假設他是 1. 演算法虛擬碼或 2. 英文說明，選一個並且附上來源，我主要想問 swap 是內建語言嗎？

Gemini：明確選 1，並說明 Python 沒有 swap 關鍵字，附 Python 官方內建函式與關鍵字列表作為佐證。整合進上方 (f)。

使用者：所以其實不用 swap 也可以嗎？可是作者並沒有實際寫出那一行，這樣還是可以達成嗎？作者寫那樣是可以執行的嗎？

Gemini：完全不需要寫 swap；虛擬碼的目的是表達邏輯，翻譯成合法 Python 即可；並逐條說明原封不動貼上會報什麼錯。整合進上方 (g)～(h) 與第二節對照表。

使用者：作者的影片是用什麼語言寫的？突然不確定是否為 python。

Gemini：實際實作是 C++，依據是資訊欄的 Gist 連結與 Code 章節中的 `void dutchNationalFlag(vector<int>& nums)`、`std::swap()`、`low++ / mid++`。整合進上方 (i)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/84fa6cc5c94813d7 | 對話日期 2026-08、整理日 2026-08-14 |
| Python 官方：內建函式列表（其中並無 `swap`） | https://docs.python.org/3/library/functions.html | 查證日 2026-08-14 |
| Python 官方：關鍵字列表（`elif` 而非 `else if`） | https://docs.python.org/3/reference/lexical_analysis.html#keywords | 查證日 2026-08-14 |
| Python 官方教學：多重賦值與 Tuple Unpacking | https://docs.python.org/3/tutorial/introduction.html | 查證日 2026-08-14 |
| C++ `std::swap` 參考 | https://en.cppreference.com/w/cpp/algorithm/swap | 查證日 2026-08-14 |

> [!check] 查核結果
> Gemini 的判斷（`swap` 非 Python 內建、該段為虛擬碼、實作語言為 C++）經對照官方文件<mark style="background: #BBFABBA6;">正確</mark>。

> [!warning] ⚠️ 存疑／提醒
> (1) Gemini 說「資料來源請參考 Python 3 官方說明文件 - 內建函式與關鍵字列表」但<mark style="background: #FFB8EBA6;">沒有給出實際 URL</mark>，本篇已補上正式連結。日後要求 AI 附來源時，記得追問完整網址。
> (2) 關於「作者的影片實作是 C++」這點，Gemini 是依據它讀到的影片資訊欄與章節推論的，<mark style="background: #FF5582A6;">本次整理無法獨立驗證該影片內容</mark>。若要引用請 Abby 自行回去確認 Gist 連結。
> (3) 嚴格來說 Python 的 `a, b = b, a` 在 CPython 中對兩個變數會被最佳化為 `ROT_TWO` 位元組碼，不一定真的建立 tuple 物件；但「概念上右側先求值」的理解方式是正確且安全的。

---

由 Gemini 對話自動整理 · 更新於 2026-08-14
