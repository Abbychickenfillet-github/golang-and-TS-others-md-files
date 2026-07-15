---
title: 邏輯運算子真值表:OR / NOR / XOR
type: topic-note
source: Gemini
category: 技術
tags: [gemini, 計算機概論, 邏輯運算, 布林, truth-table, 真值表]
sources:
  - https://gemini.google.com/app/83684e243df35e3f
updated: 2026-06-25
---

# 邏輯運算子真值表:OR / NOR / XOR

## 重點整理

真值表只是把 A、B 兩個條件的所有組合列出來,看清運算結果。把 A、B 想成兩個問題,運算子就是「要不要採取行動」的判斷方式。

| A | B | OR | NOR | XOR |
|:-:|:-:|:-:|:-:|:-:|
| F | F | **F** | <mark style="background: #BBFABBA6;">**T**</mark> | F |
| F | T | T | F | <mark style="background: #BBFABBA6;">**T**</mark> |
| T | F | T | F | <mark style="background: #BBFABBA6;">**T**</mark> |
| T | T | T | F | F |

### OR(或)

<mark style="background: #FFF3A3A6;">只要任一個條件為 True,結果就是 True</mark>;只有 <mark style="background: #FF5582A6;">A、B 兩個「全部都是 False」時,OR 才會是 False</mark>。

### NOR(或非)

<mark style="background: #ADCCFFA6;">NOR 是 OR 的相反(NOT OR)</mark>。把整個 OR 的結果反轉:

- 只要有任一個是 True → OR 為 True → <mark style="background: #FF5582A6;">NOR 為 False</mark>。
- <mark style="background: #BBFABBA6;">只有「兩個都是 False」時,OR 為 False → NOR 才是 True</mark>。

> [!warning] 常見誤解:NOR「沒有 False 才是 False」嗎?不對。正確理解是「OR 反過來」——兩個都 True 時,OR=True,所以 NOR=False;唯有兩個都 False,NOR 才 True。

### XOR(互斥或 Exclusive OR)

規則:<mark style="background: #FFF3A3A6;">A、B 中「只有一個」是 True,結果才是 True</mark>;<mark style="background: #FF5582A6;">兩個都 True、或兩個都 False(即兩者相同)時,結果為 False</mark>。可記成「兩者不同 → True;兩者相同 → False」。

> [!tip] 一句話記憶:OR =「至少一個真」;NOR =「全部都假」才真;XOR =「恰好一個真 / 兩者相異」才真。

## 各對話來源

### Understanding Logic Operators And Filters (2026-06) — https://gemini.google.com/app/83684e243df35e3f

> 註:本對話搭配使用者上傳的真值表截圖,以語音逐步追問 OR / NOR / XOR 的判斷邏輯。

**使用者:** 一個 True、一個 False,NOR 是什麼意思?

**Gemini:** NOR 是 OR 的相反。只要有任一個條件是 True,OR 就是 True,NOR 自然就是 False(條件不符合)。

**使用者:** 那為什麼兩個 True 的 NOR 會是 False?是要兩個都 False 才 False 嗎?

**Gemini:** NOR 是把 OR 的結果反轉。兩個都 True 時 OR=True,所以 NOR=False。只有 A、B 都是 False 時 OR=False,NOR 才會是 True。

**使用者:** 那 XOR 又是什麼?

**Gemini:** 那是 XOR(互斥或)。規則:A、B 中只有一個是 True,結果才 True;兩個都 True 或都 False 時結果為 False。

**Gemini(補充 OR):** OR 只要有一個條件為 True 結果就 True;只有兩個全 False 時 OR 才 False。
