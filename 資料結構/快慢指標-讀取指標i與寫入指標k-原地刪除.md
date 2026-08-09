---
title: 快慢指標 — 讀取指標 i 與寫入指標 k（原地刪除）
type: topic-note
source: Gemini
tags: [gemini, 演算法, two-pointers, python, leetcode, 面試]
sources:
  - https://gemini.google.com/app/78e58415cd5e5c39
updated: 2026-08-07
---

# 快慢指標 — 讀取指標 i 與寫入指標 k（原地刪除）

本篇重點 a–i，共 9 個

## 重點整理

(a) <mark style="background: #FF5582A6;">最初的誤解</mark>：Abby 以為寫在迴圈外的 `k = 0` 會「自己跟著陣列元素數量跑」。<mark style="background: #BBFABBA6;">實際上不會</mark>——`k = 0` 只是把一個變數初始化為 0，它的值<mark style="background: #FFF3A3A6;">只有在程式碼真的執行到 `k += 1` 那一行時才會改變</mark>。

(b) <mark style="background: #ADCCFFA6;">真正控制跑動次數的是 `for i in range(0, len(nums)):`</mark>，跟 `k` 完全無關。

(c) <mark style="background: #ADCCFFA6;">`len(nums)`</mark>：回傳陣列元素總個數。例如 `nums = [3, 2, 2, 3]` → `len(nums)` 是 `4`。

(d) <mark style="background: #ADCCFFA6;">`range(0, len(nums))`</mark>：產生整數序列，<mark style="background: #FFB8EBA6;">包含開頭、不包含結尾</mark>。長度 4 時 `range(0, 4)` 產生 `0, 1, 2, 3`，正好對應陣列每個位置的索引值（Index）。

(e) <mark style="background: #ADCCFFA6;">`for i in ...`</mark>：迴圈變數 `i` 每輪依序取得序列裡的值（0 → 1 → 2 → 3），直到所有索引都巡訪完畢。

(f) <mark style="background: #FFF3A3A6;">i 與 k 的分工（本篇核心）</mark>：

| 指標 | 別名 | 由誰推進 | 職責 |
|---|---|---|---|
| `i` | 讀取指標／<mark style="background: #ADCCFFA6;">快指標（Fast Pointer）</mark> | `for` 迴圈自動推進，每輪 +1 | 從頭到尾檢查陣列中每一個元素 |
| `k` | 寫入指標／<mark style="background: #ADCCFFA6;">慢指標（Slow Pointer）</mark> | 我們手動 `k += 1` | 只有當 `nums[i]` 通過條件時，才把值寫入 `nums[k]` 並前進 |

(g) <mark style="background: #BBFABBA6;">典型寫法（LeetCode 27. Remove Element）</mark>：

```python
def removeElement(nums, val):
    k = 0                              # 寫入指標，同時也是「保留下來的元素個數」
    for i in range(0, len(nums)):      # 讀取指標，逐一掃過每個位置
        if nums[i] != val:             # 通過條件才寫回去
            nums[k] = nums[i]
            k += 1                     # 只有寫入成功時才前進
    return k                           # nums[:k] 就是答案
```

(h) <mark style="background: #FFF3A3A6;">為什麼 `k` 最後就是答案長度</mark>：因為 `k` 每次 `+= 1` 都代表「多保留了一個元素」，掃完整個陣列後 `k` 自然等於保留下來的元素個數。<mark style="background: #FFB8EBA6;">時間複雜度 O(n)、空間複雜度 O(1)</mark>，這就是「原地（In-place）」演算法的價值。

(i) <mark style="background: #D2B3FFA6;">次要備註</mark>：`k` 永遠不會超過 `i`（`k <= i` 恆成立），所以寫入 `nums[k]` 絕對不會覆蓋掉「還沒被 `i` 讀過」的資料——這是快慢指標能安全原地覆寫的關鍵前提，面試時常被追問。

## 相關筆記

- [[冒泡排序法-range參數與時間複雜度]]（同樣在拆解 Python `range()` 的邊界與迴圈次數；該篇的兩層迴圈是 O(n²)，本篇的單層雙指標是 O(n)，正好對照「用兩個指標取代兩層迴圈」的優化思路）
- [[C-C++-的-node-與-void-寫法]]（同屬資料結構基礎；該篇談指標在 C／C++ 是真的記憶體位址，本篇的「指標」其實是索引值 index，名字一樣但概念不同，避免混淆）
- [[費米問題-Fermi-Estimation-面試估算技巧]]（同為面試準備素材；該篇練估算與拆解，本篇練白板演算法，都是技術面試常考題型）

## 各對話來源

### `i` 與 `k` 指標的區別（2026-08-06）— https://gemini.google.com/app/78e58415cd5e5c39

使用者：這邊 `k=0` 會依照陣列元素數量來跑嗎？那 `for i in range(0, len(nums)):` 解釋一下。
Gemini：`k = 0` 不會依照陣列元素數量自動跑動，它只是把變數初始化為 0 的指標（或計數器），數值只有在執行到 `k += 1` 時才會改變。真正依照陣列元素數量控制跑動次數的是 `for i in range(0, len(nums)):`。接著逐層拆解 `len(nums)`（元素總個數）、`range(0, len(nums))`（含頭不含尾的索引序列）、`for i in ...`（每輪依序取值），最後說明 `i` 是由 for 迴圈自動推進的讀取指標／快指標，`k` 是手動控制的寫入指標／慢指標，只有當 `nums[i]` 滿足條件時才寫入 `nums[k]` 並 `k += 1`。

> ⚠️ 補充說明：對話中只給了概念，沒有給完整可執行的程式碼；(g)、(h)、(i) 的完整範例、複雜度與 `k <= i` 不變式是對照 LeetCode 27 官方題解後補上的，非 Gemini 原文。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/78e58415cd5e5c39 | 2026-08-07 查證 |
| LeetCode 27. Remove Element | https://leetcode.com/problems/remove-element/ | 雙指標原地刪除標準題，2026-08-07 查證 |
| Python 官方文件 `range()` | https://docs.python.org/3/library/stdtypes.html#range | 含頭不含尾（half-open）行為，Python 3.13 文件，2026-08-07 查證 |
