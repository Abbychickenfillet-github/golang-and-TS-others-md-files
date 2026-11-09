---
title: unsigned 與 Int8Array 型別化陣列
type: topic-note
source: Gemini
tags: [gemini, unsigned, typedarray, 計算機基礎]
sources:
  - https://gemini.google.com/app/dab3dcfbda732742
updated: 2026-11-03
---

# unsigned 與 Int8Array 型別化陣列

unsigned（無符號整數）的位元意義，以及 MDN Int8Array 範例。

## 重點整理

本篇重點 a–d，共 4 個

(a) <mark style="background: #ADCCFFA6;">signed</mark>：最高位元當符號位（0 正 1 負），8 位元範圍 -128 至 127。<mark style="background: #ADCCFFA6;">unsigned</mark>：沒有符號位，全部位元拿來表示大小，8 位元範圍 0 至 255。

(b) 所以 unsigned 的意思是「<mark style="background: #FFF3A3A6;">只能表示 0 與正數</mark>」，不是「不管正負號都能存」。上限約為 signed 的兩倍。

(c) 負數賦給 unsigned 會溢位（wrap around）成巨大正數。

(d) Int8Array 範例：`new Int8Array(8)` 配置 8 bytes 且全為 0。`new Int8Array(typedArray1)` 會配置新的獨立 ArrayBuffer 並複製元素，所以改 typedArray2 不影響 typedArray1。

> ⚠️ 存疑/更正：Gemini 開頭說 unsigned 是「不管正負號」，措辭容易誤解，正確為「無符號位，僅非負數」。

> ⚠️ 存疑/更正：Gemini 稱 Int8Array 複製為「淺層複製」，更精確是「把元素複製到新 buffer」，因元素是原始數值，無淺深層問題。

> ⚠️ 存疑/更正：Int8Array 本身是 signed。

## 自我測驗（點開看答案）

> [!question]- 8 位元 unsigned 範圍？
> 0 到 255。

> [!question]- 是非題：unsigned 可存負數。
> 錯。

## 各對話來源
（Gemini 回答為節錄，使用者提問為原文）

### Unsigned 變數概念解析（2026-11-03）— https://gemini.google.com/app/dab3dcfbda732742

**使用者：** unsigned是不管正負號還是是正數

**Gemini：** （節錄）說明符號位與範圍。

**使用者：** 解釋一下左邊的demo

**Gemini：** （節錄）逐行解釋 Int8Array 範例。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Int8Array | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Int8Array | MDN，本次未重新抓取（2026-11-03） |
