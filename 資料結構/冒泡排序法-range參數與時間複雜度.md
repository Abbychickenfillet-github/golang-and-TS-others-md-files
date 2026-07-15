---
title: 冒泡排序法、range() 參數與時間複雜度
type: topic-note
source: Gemini
tags: [gemini, 資料結構, 演算法, python, bubble-sort, big-o]
sources:
  - https://gemini.google.com/app/bf66117f227bc352
  - https://gemini.google.com/app/4c6ae95018c6e142
updated: 2026-06-19
---

# 冒泡排序法、range() 參數與時間複雜度

## 重點整理

冒泡排序法（Bubble Sort）的核心是<mark style="background: #FFF3A3A6;">「相鄰兩兩比較、較大的往後沉」</mark>。理解它的 `range()` 邊界與真正的執行次數，就能把演算法跟 Python 語法一次打通。

### 為什麼內層 `range()` 的 stop 要寫 `n-1`？

關鍵在於冒泡排序是<mark style="background: #ADCCFFA6;">兩兩比較</mark>，程式碼會同時存取 `arr[j]` 和 `arr[j+1]`。

- 若寫 `range(0, n)`：最後 `j = n-1` 時會去比 `arr[n-1]` 與 `arr[n]` → `arr[n]` <mark style="background: #FF5582A6;">超出索引、IndexError</mark>。
- 若寫 `range(0, n-1)`：因為 Python 的 `range(start, stop)` 是<mark style="background: #ADCCFFA6;">「包含起點、不包含終點」</mark>，索引最大只到 `n-2`，剛好拿 `arr[n-2]` 與 `arr[n-1]`（最後一項）比，完美覆蓋又不越界。

> [!example] 以 `arr = [50, 30, 40, 10, 20]`（n=5）為例
> 第一輪只需比 4 次：(0,1)(1,2)(2,3)(3,4)。`range(0, n-1)` = `range(0,4)` 產生 `0,1,2,3`，正好對應這 4 次比較。

### 對比：單純遍歷時為什麼「不用」 `-1`？

```python
x = 'runoob'
for i in range(len(x)):   # range(6) -> 0,1,2,3,4,5
    print(x[i])           # 只存取 x[i]，沒有 x[i+1]
```

差別在於這裡是<mark style="background: #BBFABBA6;">「單個元素獨立處理」</mark>，只寫了 `x[i]`、沒有 `x[i+1]`，所以索引必須完整走到最後一格。若誤加 `-1` 變成 `range(5)`，最後一個字元 `'b'`（索引 5）就會被漏掉。

> [!note] 口訣
> 兩兩比較、有寫到 `+1` ➡️ `range` 終點要 `-1`（防越界）。
> 單純巡邏、只寫 `[i]` ➡️ `range` 直接用 `len()`（確保每個都點到名）。

### `range()` 的本質：計數器

`range()` 的核心任務是<mark style="background: #FFF3A3A6;">「數數 / 產生索引」</mark>，不是用來「跑函式」。三大用途：

1. 控制重複次數：`for i in range(3): say_hello()`
2. 產生索引存取資料（最常見）：`for i in range(len(names)): print(names[i])`
3. 產生規律數字：`range(2, 11, 2)` → `2,4,6,8,10`

> [!tip] 更 Pythonic 的寫法
> 若只是想把每個元素丟進函式處理，直接 `for num in numbers: square(num)`（迭代 Iterable）比 `for i in range(len(...))` 更乾淨。

### 單一參數的 `range()` 代表什麼？

`range()` 完整簽名是 `range(start, stop, step)`，其中 <mark style="background: #FFB8EBA6;">start 預設 0、step 預設 1</mark>。當只給一個參數時，Python 把它當作 <mark style="background: #ADCCFFA6;">stop</mark>（而非 start），所以 `range(10)` = `0,1,...,9` 共 10 個。這是 `range` 這個函式自己的參數設計，<mark style="background: #FF5582A6;">並非所有 Python 函式都這樣</mark>。

### 外層 `j` 為什麼跑 `range(n)`？真的是 N×N 次嗎？

每跑完一整輪內層，就有一個當前最大值被定位到最右端。理論上外層只要 `n-1` 輪就夠（最後一個自動歸位），但教學常直接寫 `range(n)`：直覺好懂，且最後一輪 `range(0, 0)` 是空迴圈、不會出錯。

**實際比較次數不是 N×N**。以 `arr=[80,50,44,50,70,11]`（n=6）為例：

```text
j=0 -> range(0,5) -> 5 次
j=1 -> range(0,4) -> 4 次
j=2 -> range(0,3) -> 3 次
j=3 -> range(0,2) -> 2 次
j=4 -> range(0,1) -> 1 次
j=5 -> range(0,0) -> 0 次
合計 5+4+3+2+1+0 = 15 次（而非 6×6 = 36 次）
```

> [!warning] 大 O 為什麼還是 O(N²)？
> 精確次數是 N×(N-1)/2 = ½N² − ½N。當 N 很大時，後面的 ½N 與常數係數 ½ 都會被忽略，只看成長「等級」，所以統一記作 <mark style="background: #FFF3A3A6;">O(N²)</mark>。實際大約只做「一半」的次數，但等級不變。

> [!note] 小提醒：`print(arr)` 縮排
> 若把 `print(arr)` 縮排在 `if` 裡，代表<mark style="background: #FF5582A6;">「只有發生交換才印」</mark>，印出的次數是「交換次數」而非「比較次數」，會少於 15 次。

### 優化寫法

```python
arr = [80, 50, 44, 50, 70, 11]
n = len(arr)
for j in range(n - 1):            # 只跑 n-1 輪，省掉沒意義的最後一輪
    for i in range(0, n - j - 1):
        if arr[i] > arr[i + 1]:
            arr[i], arr[i + 1] = arr[i + 1], arr[i]
```

### 延伸：Brute Force（暴力法 / 蠻力法）

<mark style="background: #ADCCFFA6;">Brute Force</mark> 的核心邏輯是：不做任何聰明的過濾或優化，單純<mark style="background: #FFF3A3A6;">窮舉所有可能、全部測一遍直到找到答案</mark>。

- 在演算法中：冒泡排序就是一種暴力排序；找 3 位數密碼就從 000 試到 999。優點是「簡單、保證找到」，缺點是「資料量大時次數爆炸、很慢」（如冒泡的 O(N²)）。
- 在資安中：暴力破解攻擊（Brute Force Attack）靠電腦每秒上百萬次猜密碼；變形是「字典攻擊」拿常見密碼清單狂試。<mark style="background: #BBFABBA6;">這就是為什麼網站要求密碼複雜、且「錯誤幾次就鎖定帳號」</mark>。

口語：「我先用 Brute force 寫個能動的版本，再來優化」＝用時間與效能換取簡單邏輯。

## 各對話來源

### 冒泡排序法 `range()` 參數解釋（2026-06）— https://gemini.google.com/app/bf66117f227bc352

使用者：為何解釋冒泡排序法演算法的 python range() stop 參數他用 n-1？不包含最後一項？這樣確實是 4 次（一輪中最多的移動次數）

Gemini：（說明）因為氣泡排序是「兩兩比較」`arr[j]` 與 `arr[j+1]`。陣列長 n、索引 0~n-1。跑 `range(0,n)` 最後會存取 `arr[n]` 越界丟 IndexError；跑 `range(0,n-1)` 因「包含起點不含終點」，索引最大到 n-2，與 `arr[n-1]` 比剛好覆蓋全部又不越界。以 [50,30,40,10,20]（n=5）第一輪比 4 次，`range(0,4)`=0,1,2,3 對應 4 次。

使用者：為啥這邊（單純遍歷字串）不用 -1

Gemini：因為是「單個元素獨立處理」，只寫 `x[i]` 沒有 `x[i+1]`。`x='runoob'`、`range(len(x))`=`range(6)`=0~5 對應每個字元；若用 `range(len(x)-1)`=`range(5)` 會漏掉最後字元 'b'。口訣：有寫 +1 → 終點 -1；只寫 [i] → 用 len()。

使用者：range 常用的作用是搭配迴圈來跑函式？

Gemini：`range()` 本質是「計數器」，主要用來控制執行次數或產生索引，不是用來跑函式。三大用途：控制重複次數、產生索引存取資料、產生規律數字 `range(start,stop,step)`。若只是把元素丟進函式，直接 `for num in numbers` 更 Pythonic。

使用者：為何 j 是跑 n 次

Gemini：外層 j 控制「要把幾個大數沉到後面」，每輪定位一個最大值。理論上 n-1 輪就夠（最後一個自動歸位），但寫 `range(n)` 直覺好懂、且最後一輪 `range(0,0)` 是空迴圈不出錯。可優化成 `range(n-1)`。

使用者：arr = [80, 50, 44, 50, 70, 11] … 阿這樣真的是做 N*N 次喔?

Gemini：不是。內層隨 j 遞減：5+4+3+2+1+0 = 15 次，而非 6×6=36 次。

使用者：（要求）不要用 Obsidian 的 LaTeX 解釋

Gemini：（白話版）N=6 若真是 N×N 要 36 次，但實際內層越跑越少，加起來 15 次。說 O(N²) 是因為資料量大時，除以 2 的小節被忽略，只看「平方等級」。

使用者：Brute force 是什麼

Gemini：直譯「蠻力」。核心：不做聰明過濾、窮舉所有可能全測一遍。演算法中冒泡排序、試密碼 000→999 都是暴力解（簡單但慢，O(N²)）；資安中是暴力破解攻擊／字典攻擊，防範靠密碼複雜化與「錯幾次鎖帳號」。

使用者：So brute force 的核心邏輯是 不做任何聰明的過濾或優化，單純用窮舉的方式，把所有可能的答案統統測試一遍，直到找到對的答案為止。

Gemini：沒錯，這就是 Brute Force 的靈魂。簡單直覺，但遇到龐大資料常耗費太多時間，所以後來才需要學習優化演算法。

### 賀寶芙營養蛋白飲料介紹（標題誤植，實為 range 單一參數討論，語音輸入）（2026-06）— https://gemini.google.com/app/4c6ae95018c6e142

> 此對話標題由 Gemini 自動產生為「賀寶芙營養蛋白飲料介紹」，但實際內容是語音輸入、辨識品質較差的 `range()` 單一參數討論，故併入本主題。

使用者：（語音，辨識雜訊）想確認 range 到底有沒有包含最後一個項目。

Gemini：以 [50,30,40,10,20]（長度 5、索引 0~4）帶數值說明沒有漏掉任何元素。

使用者：如果說 range 只有一個參數的話，它是代表 start 嗎？可是它這邊是 0 到 9，所以有 10 個項目，你可以解釋一下嗎？

Gemini：當 `range()` 只有一個參數時，它代表的是結束值（stop），起始值會用預設 0。

使用者：但如果只有一個參數，他不是照參數的順序嗎？那他怎麼會預設一個參數是 stop？其他 Python 函數也是這樣嗎？

Gemini：這是 Python 的便利性設計。`range` 完整簽名 `range(start, stop, step)`，start 預設 0、step 預設 1。只給一個參數時就當作 stop，start/step 用預設值。這不是所有 Python 函數都一樣，要看函數本身如何定義參數與預設值。
