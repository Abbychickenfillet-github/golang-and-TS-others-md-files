---
title: 圖形中間挖空(hollow)的 CSS 做法
type: topic-note
source: Gemini
category: 技術
tags: [gemini, css, mask, clip-path, border-image]
sources:
  - https://gemini.google.com/app/791a94457ee28e3d
updated: 2026-06-11
---

# 圖形中間挖空(hollow)的 CSS 做法

## 重點整理

先釐清:簡報裡的 `border-image-slice` 是把一張圖切成九宮格(四角、四邊、中心)拿來當**邊框**用(像畫框),不是把圖形中間挖空。

真正能做「中空 / 挖空」效果的 CSS3 屬性:

1. **`mask-image`(遮罩)**——最常用。用黑白圖片或漸層當遮罩:黑色 = 顯示、透明 = 隱藏。在中間畫一個透明的圓或方形,就能把底圖中間挖空。
2. **`clip-path`(裁剪路徑)**——用 `polygon()` 搭配奇偶環繞原則(`evenodd`),透過路徑轉折定義出中間中空的形狀。
3. **`box-shadow` + `inset` / 極大擴展半徑**——只想要外框中空的圓形或方形時,可用 `border` 配合巨大的 box-shadow 或 `border-radius` 達成。

## 各對話來源

### 圖形中空切割與CSS技巧(2026-06)— https://gemini.google.com/app/791a94457ee28e3d

使用者:這一個文檔中教如何切割讓圖形中間變成 hollow 的地方嗎

Gemini:根據您目前瀏覽的簡報內容,這份文檔沒有教如何把圖形中間切割成中空(hollow)的方法。簡報中雖然有提到「切割」,但那是 border-image(邊框圖片)的範圍:border-image-slice 是用來設定如何將一張圖片切割成九宮格(四個角、四條邊、中心點),以便套用為網頁元素的邊框,像「畫框」一樣的效果,並沒有提及如何將圖形中間挖空。補充:CSS3 中要做「圖形中間挖空」通常用——(1) mask-image(遮罩):最常用,用黑白圖片或漸層當遮罩,黑色代表顯示、透明代表隱藏,在中間畫透明的圈或方形就能挖空;(2) clip-path(裁剪路徑):用 polygon() 搭配奇偶環繞原則(evenodd)定義中空形狀;(3) box-shadow 搭配 inset 或極大擴展半徑:外框中空的圓形或方形可用 border 配合巨大 box-shadow 或 border-radius 達成。
