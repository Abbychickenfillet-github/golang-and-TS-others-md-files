---
title: 02-1-盒模型（Box Model）與border-box
type: topic-note
category: CSS基礎
tags:
  - css
  - box-model
  - border-box
  - 前端
  - 面試
sources:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing
updated: 2026-07-19
---
# 02-1‧盒模型（Box Model）與border-box

> 複習順序上的位置：這是[[00-CSS觀念複習地圖與資料夾索引]]裡的第b項（檔名02-1），前備知識是[[01-1-選擇器-組合後代手足相鄰偽選擇器]]（至少要能選到元素，才有東西可以套盒模型）。這篇先只講`border-box`，其他屬性（圓角、陰影等）之後再另外整理，避免一次塞太多。

## 一‧盒模型是什麼：由內到外四層

每個HTML元素在瀏覽器裡都被當成一個矩形箱子，由內到外分四層：

1. **content（內容）**：文字、圖片等實際內容所在的區域，大小由`width`／`height`決定。
2. **padding（內距）**：內容跟邊框之間的留白，背景色會蓋到這一層。
3. **border（邊框）**：包住padding的框線，`border-width`決定粗細。
4. **margin（外距）**：邊框外面跟其他元素之間的留白，是全透明的，不會被背景色蓋到。

## 二‧盒模型圖解

<div style="text-align:center; margin:16px 0;">
<svg width="420" height="320" viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
  <rect x="10" y="10" width="400" height="300" fill="#fdf0d5" stroke="#c9a227" stroke-width="1.5"/>
  <text x="20" y="28" font-size="13" fill="#8a6d1a">margin 外距</text>

  <rect x="55" y="45" width="310" height="230" fill="#f6c945" stroke="#c9a227" stroke-width="1.5"/>
  <text x="65" y="63" font-size="13" fill="#5a4400">border 邊框</text>

  <rect x="85" y="80" width="250" height="160" fill="#a7d8a0" stroke="#4c8c46" stroke-width="1.5"/>
  <text x="95" y="98" font-size="13" fill="#245420">padding 內距</text>

  <rect x="130" y="120" width="160" height="80" fill="#7fb6e8" stroke="#2f6fed" stroke-width="1.5"/>
  <text x="150" y="165" font-size="14" fill="#0b2e63" font-weight="bold">content 內容</text>
  <text x="140" y="182" font-size="11" fill="#0b2e63">width × height</text>
</svg>
</div>

## 三‧`box-sizing`：`content-box`跟`border-box`差在哪

`box-sizing`這個屬性決定的是「你寫的`width`／`height`到底算不算padding跟border」，來源：[box-sizing - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing)（最後更新於2026-04-20）。

### a. `content-box`（瀏覽器預設值）

`width`／`height`**只算content內容區**，padding跟border會另外加上去，實際渲染出來的總寬度會比你寫的`width`還大。

```css
.box-content {
  box-sizing: content-box; /* 預設值，通常不用特別寫 */
  width: 160px;
  padding: 20px;
  border: 8px solid red;
}
/* 實際總寬度 = 160(content) + 20×2(padding) + 8×2(border) = 216px */
```

### b. `border-box`

`width`／`height`**已經包含padding跟border**，實際渲染出來的總寬度就等於你寫的`width`，content區會自動被padding跟border往內擠壓縮小。

```css
.box-border {
  box-sizing: border-box;
  width: 160px;
  padding: 20px;
  border: 8px solid red;
}
/* 實際總寬度 = 160px（就是你寫的數字）
   content區實際大小 = 160 - 20×2 - 8×2 = 104px */
```

- 對照表：

| box-sizing | width算的範圍 | 實際渲染總寬度（範例：width:160px、padding:20px、border:8px） |
|---|---|---|
| content-box（預設） | 只算content | 160 + 40 + 16 = 216px |
| border-box | content + padding + border | 160px（維持你寫的數字） |

## 四‧為什麼幾乎每個專案都會全域重置成border-box

因為`content-box`會讓「你想要的最終尺寸」跟「你要寫在CSS裡的數字」不一致，只要改一次padding，就得重新心算一次width，非常容易出錯。業界標準做法是在CSS最前面全域重置：

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

這樣寫完`width:160px`就是最終看到的160px，不用再自己加padding跟border去心算。順帶一提，瀏覽器原生對`<table>`、`<select>`、`<button>`跟部分`<input>`類型，預設值其實就已經是`border-box`，只有一般區塊元素預設才是`content-box`。

## 五‧margin不算進box-sizing的計算範圍

不管`box-sizing`設成`content-box`還是`border-box`，`margin`都不包含在`width`／`height`的計算裡，`margin`只影響這個盒子跟旁邊其他盒子之間的外部間距，不影響盒子自己本身量出來的寬高。margin還有一個進階行為叫做「margin collapse（外距合併）」，這篇先不展開，之後如果要深入可以另外開一篇筆記。

## 六‧常見誤區

- 忘記设定`box-sizing: border-box`，結果`width`寫得剛剛好，卻因為padding疊加而爆版。
- 以為`margin`也會被`border-box`吃進去，其實margin永遠在盒子計算範圍外面。
- 把「盒子變圓」（`border-radius`）跟「背景裁切範圍」（`background-clip`）搞混，這兩個是不同圖層的概念，細節見[[background-clip-text-文字鏤空]]。
