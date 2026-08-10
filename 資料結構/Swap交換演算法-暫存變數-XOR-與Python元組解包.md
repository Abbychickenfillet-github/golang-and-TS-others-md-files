---
title: Swap（交換）是演算法還是 Python 方法？——暫存變數、XOR 與元組解包
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - 資料結構
  - 演算法
  - swap
  - python
  - bytecode
  - 面試
aliases: [Swap交換, 元組解包swap, XOR swap]
related:
  - "[[快慢指標-讀取指標i與寫入指標k-原地刪除]]"
  - "[[冒泡排序法-range參數與時間複雜度]]"
sources:
  - https://gemini.google.com/app/85351f25c8f2b0df
updated: 2026-08-09
---

# Swap（交換）是演算法還是 Python 方法？

> **本篇重點 a–k，共 11 個。**

---

## 先回答問題

(a) <mark style="background: #BBFABBA6;">Swap 是一個「基本操作」的概念，不是 Python 的內建方法</mark>。Python 沒有 `swap()` 這個函式，也沒有這個方法。

(b) <mark style="background: #ADCCFFA6;">Swap 的定義</mark>：把兩個變數所持有的值（或參考）互相對調。它本身談不上是「演算法」等級的東西，比較精確的說法是<mark style="background: #FFF3A3A6;">它是排序、反轉、分割這類演算法內部反覆用到的原子操作</mark>。

---

## 三種實作路線

### (c) 路線一：暫存變數（Temporary Variable）

最基礎、任何語言都通用的寫法。

```python
temp = a
a = b
b = temp
```

<mark style="background: #FFB8EBA6;">空間複雜度 O(1)、時間複雜度 O(1)</mark>，多用一格記憶體換取「絕對不會出錯」。

### (d) 路線二：XOR 位元交換（XOR Swap）

不需要額外變數。

```python
a = a ^ b
b = b ^ a
a = a ^ b
```

原理是 XOR 的自反性：`x ^ y ^ y == x`。

(e) <mark style="background: #FF5582A6;">XOR swap 有一個致命陷阱：當 a 與 b 指向同一個記憶體位置（例如 `swap(arr[i], arr[i])`）時，結果會直接變成 0</mark>。而且它只適用於整數型別，浮點數與物件不能這樣做。

(f) <mark style="background: #FF5582A6;">實務上不要用 XOR swap</mark>。現代編譯器對「暫存變數版」的最佳化已經比 XOR 版好，XOR 版還會破壞指令層級的平行性。它的價值只剩「面試時展示你懂位元運算」。

### (g) 路線三：Python 的元組解包（Tuple Unpacking）

```python
a, b = b, a
```

這是 Python 的語法糖，也是<mark style="background: #BBFABBA6;">在 Python 裡唯一該用的寫法</mark>：不用暫存變數、不用擔心型別、一行講完意圖。

---

## ⚠️ 存疑／更正：`a, b = b, a` 到底有沒有建立元組？

(h) 原始對話中 Gemini 說：「右側的 `b, a` 會先在記憶體中建立一個隱式的元組 `(b, a)`，接著解包並分別賦予給左側」。

(i) <mark style="background: #FF5582A6;">這個說法在「兩個變數」的情況下是不正確的</mark>。CPython 的窺孔最佳化器（peephole optimizer）會檢查右側序列長度：

| 右側元素數 | 實際產生的位元組碼 | 有沒有建立元組 |
|---|---|---|
| 2 個 | `ROT_TWO`（3.10 以前）／`SWAP 2`（3.11 起） | <mark style="background: #BBFABBA6;">沒有</mark> |
| 3 個 | `ROT_THREE` + `ROT_TWO` | <mark style="background: #BBFABBA6;">沒有</mark> |
| 4 個以上 | `BUILD_TUPLE` + `UNPACK_SEQUENCE` | <mark style="background: #FF5582A6;">有</mark> |

(j) 也就是說，`a, b = b, a` <mark style="background: #FFF3A3A6;">只是把直譯器堆疊（stack）上最頂端的兩個參考換位置，沒有任何記憶體配置</mark>。Gemini 講的「比傳統變數對調更快」<mark style="background: #BBFABBA6;">結論是對的</mark>，但它給的理由（建立元組再解包）<mark style="background: #FF5582A6;">跟真正的原因剛好相反</mark>——正是因為「沒有建立元組」才快。

(k) 想自己驗證，用內建的 `dis` 模組看位元組碼即可：

```python
import dis
dis.dis(compile("a, b = b, a", "<s>", "exec"))
# 會看到 LOAD_NAME b / LOAD_NAME a / SWAP 2（或 ROT_TWO）/ STORE_NAME ...
# 全程不會出現 BUILD_TUPLE

dis.dis(compile("a, b, c, d = d, c, b, a", "<s>", "exec"))
# 這時候才會看到 BUILD_TUPLE 4 與 UNPACK_SEQUENCE 4
```

---

## 關聯筆記與關聯原因

- [[冒泡排序法-range參數與時間複雜度]]：<mark style="background: #D2B3FFA6;">冒泡排序的內層迴圈每一次比較後做的就是這個 swap</mark>。這篇是那篇裡「交換」那一行的放大版。
- [[快慢指標-讀取指標i與寫入指標k-原地刪除]]：<mark style="background: #D2B3FFA6;">原地（in-place）演算法之所以能做到 O(1) 額外空間，靠的就是 swap 這種不配置新記憶體的操作</mark>。兩篇共用「原地」這個核心概念。

---

## 各對話來源（原文）

### Swap 演算法與 Python 實現（2026-08）— https://gemini.google.com/app/85351f25c8f2b0df

> **使用者：** Swap 是一個演算法還是 Python 方法
>
> **Gemini：** Swap（交換）是一個演算法的概念與基本操作，並不是 Python 的內建方法（Method）或函數（Function）。
>
> **1. 演算法層面（Algorithmic Concept）**
> 在演算法與資料結構中，Swap 指的是將兩個變數的值或記憶體位置進行對調的操作。傳統程式語言主要有兩種實現概念：
> - 使用暫存變數（Temporary Variable）：最基礎且通用的演算法邏輯。`temp = a` / `a = b` / `b = temp`
> - 位元運算（XOR Swap）：不需額外記憶體空間即可完成交換。`a = a ^ b` / `b = b ^ a` / `a = a ^ b`
>
> **2. Python 的語法實現**
> Python 沒有提供名為 `swap()` 的內建方法，而是採用元組解包（Tuple Unpacking）的語法糖來實現交換：`a, b = b, a`
> 底層運作原理：右側的 `b, a` 會先在記憶體中建立一個隱式的元組 `(b, a)`；接著將該元組的值解包並分別賦予給左側的 a 與 b。這種寫法不需宣告暫存變數，語法直覺，且在 CPython 直譯器優化下執行速度比傳統變數對調更快。

（⚠️ 上述「先建立隱式元組」的說明對兩個變數的情況並不成立，更正見本篇 (h)–(k)。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| 原始 Gemini 對話 | https://gemini.google.com/app/85351f25c8f2b0df | 2026-08（對話當下） |
| CPython 以 SWAP 取代 ROT_xxx 位元組碼的討論 | https://github.com/faster-cpython/ideas/discussions/228 | faster-cpython ideas，查證於 2026-08-09 |
| 平行賦值的最佳化拆解（含 dis 實測） | https://ntietz.com/blog/parallel-assignment-optimized-idiom/ | 查證於 2026-08-09 |
| Python 位元組碼概觀 | https://www.blackduck.com/blog/understanding-python-bytecode.html | 查證於 2026-08-09 |
