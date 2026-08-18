---
title: SVG-viewBox座標系統-起算點與負值平移
type: topic-note
source: Gemini
tags: [gemini, svg, css, viewbox, 座標系統, 前端]
sources:
  - https://gemini.google.com/app/c939d5e74833ab74
updated: 2026-08-15
---

# SVG viewBox 座標系統｜起算點與負值平移

> 本篇重點 a–l，共 12 個

相關筆記：[[svg-basics-and-display]]、[[圖形中間挖空-hollow-的CSS做法]]、[[00-CSS觀念複習地圖與資料夾索引]]
關聯原因：`svg-basics-and-display` 講的是 SVG 的結構與 display 行為，這篇補上它沒展開的「座標系統與 viewBox 四個數字」；做圓環／挖空圖形時常需要把原點移到中央，所以也連到挖空那篇。

---

## 重點整理

### 一、原點在左上角，不在左下角

(a) <mark style="background: #FFF3A3A6;">SVG（以及絕大多數網頁與數位圖形系統）的原點 (0,0) 在畫布左上角</mark>。

(b) <mark style="background: #ADCCFFA6;">X 軸往右增加</mark>，<mark style="background: #ADCCFFA6;">Y 軸往下增加</mark>。

(c) <mark style="background: #FF5582A6;">這跟學校數學的笛卡兒座標系（Y 軸向上）是相反的</mark>，這是初學最常搞混的一點。

(d) 所以 `cx="100"` 是從左邊界往右 100 單位、`cy="100"` 是從頂端往下 100 單位。搭配 `viewBox="0 0 200 200"` 時，圓心正好在正中央。

```html
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="50" fill="tomato" />
</svg>
```

---

### 二、viewBox 的四個值是什麼

(e) <mark style="background: #ADCCFFA6;">語法固定為 `viewBox="min-x min-y width height"`</mark>，可以把它想成一台相機的觀景窗。

| 參數 | 意義 |
|---|---|
| `min-x` | 視野左上角的 X 座標（起點 X） |
| `min-y` | 視野左上角的 Y 座標（起點 Y） |
| `width` | 視野的寬度 |
| `height` | 視野的高度 |

(f) <mark style="background: #FFF3A3A6;">前兩個值決定「畫布的哪一個點要對齊 `<svg>` 容器的左上角」，後兩個值決定「從那個起點看多寬多高的範圍」</mark>。

(g) <mark style="background: #BBFABBA6;">後兩個值同時就是縮放的關鍵</mark>，這正是 SVG 之所以是「向量」的原因：

| viewBox | 意義 | 視覺效果 |
|---|---|---|
| `0 0 100 100` | 從 (0,0) 看 100×100 的範圍 | 標準視野 |
| `50 50 100 100` | 起點往右下移 | 畫面內容往左上移動（相機往右下） |
| `0 0 50 50` | 只看一半寬高 | 放大（Zoom in），小圖撐滿容器 |
| `0 0 200 200` | 看兩倍寬高 | 縮小（Zoom out），圖形縮在左上角 |

(h) <mark style="background: #FFB8EBA6;">具體例子</mark>：`<svg width="500" height="500">` 搭配 `viewBox="0 0 100 100"`，那麼你在座標 (50,50) 畫的東西實際會出現在螢幕上的 (250,250)，所有東西都被放大 5 倍。

---

### 三、把起點設成負值的三種用途

(i) <mark style="background: #BBFABBA6;">用途一：把原點移到畫布中央（最常見）</mark>

`<svg viewBox="-100 -100 200 200">` 代表畫布左上角現在是 (−100,−100)、正中央變成 (0,0)。畫置中的圓就變成 `<circle cx="0" cy="0" r="50" />`，邏輯更直覺。<mark style="background: #FFF3A3A6;">做對稱圖形與旋轉動畫時特別好用</mark>，因為 `rotate()` 預設繞 (0,0) 轉。

(j) <mark style="background: #BBFABBA6;">用途二：裁切或平移內容（像看地圖）</mark>

起點 `0 0` 看的是原點開始的內容；改成 `50 50` 相機往右下移，物體看起來往左上跑；改成 `-50 -50` 相機往左上移，原本在畫面外的東西就「進入」視窗。

(k) <mark style="background: #BBFABBA6;">用途三：接住設計軟體匯出的位移路徑</mark>

從 Illustrator 或 Figma 匯出的路徑座標可能從 `x=500` 開始。與其手動改每一條路徑，不如直接調整 viewBox 起點，讓視窗對準那些高數值的座標區域。

(l) <mark style="background: #FF5582A6;">重要提醒：負值只是「平移」，不是「翻轉」</mark>。就算 `min-y` 設成負的，<mark style="background: #FF5582A6;">Y 軸方向依然向下增加</mark>，不會變成數學上向上遞增的座標系。

| viewBox 設定 | 畫面左上角座標 | 畫面正中央座標 | 適用情境 |
|---|---|---|---|
| `0 0 200 200` | (0,0) | (100,100) | 標準網頁排版 |
| `-100 -100 200 200` | (−100,−100) | (0,0) | 對稱圖形、旋轉動畫 |
| `-200 0 200 200` | (−200,0) | (−100,100) | 需要在左側預留空間 |

> 比喻：原本尺是從 0 開始量，現在把尺往左挪，讓 0 剛好對準桌子的中間。

---

## 各對話來源（原文）

### SVG 座標系統起算點說明（2026-08 前後）— https://gemini.google.com/app/c939d5e74833ab74

**使用者：** 他的 100 100 是指從左上開始起算還是左下？

**Gemini：** 這張圖中顯示的座標 (100,100) 是從左上角（Top-Left）開始起算的。在 SVG（以及大多數的網頁開發與數位圖形系統）中，座標系統的定義如下：原點 (0,0) 位於畫布的左上角；X 軸往右增加；Y 軸往下增加。因此 cx="100" 代表從左邊界向右移動 100 單位，而 cy="100" 代表從頂部邊界向下移動 100 單位。這點與我們在學校數學課學到的笛卡兒座標系（Y 軸向上）是相反的。SVG 的 viewBox 和元素定位（如 circle 的中心點 cx, cy）預設都是以左上角為原點 (0,0)：Horizontal (X) 從左向右遞增、Vertical (Y) 從上向下遞增。以你提供的圖片代碼為例，viewBox="0 0 200 200" 定義了視野從 (0,0) 開始、寬高各為 200；cx="100"、cy="100" 使圓心正好位於寬度一半、高度一半的位置，也就是正中央。

**使用者：** 把起點定義為負值的意義是什麼

**Gemini：** 在 SVG 中將 viewBox 的起點（前兩個數值）定義為負值，本質上是在移動「鏡頭」的位置，或者說是重新定義畫布上的 (0,0) 點在哪裡。這並不會改變左上角起算的邏輯，但會改變物體相對於畫布邊界的視覺位置。常見用途：
1. 將原點 (0,0) 移至畫布中央——這是最常見的用法。如果你希望在繪圖時以中心為基準（例如畫對稱圖形、旋轉動畫），將起點設為負值非常方便。設定方式：`<svg viewBox="-100 -100 200 200">`，這代表你的畫布左上角座標現在是 (−100,−100)，而正中央座標變成了 (0,0)。好處是當你要畫一個圓心在中央的圓時，代碼會變成 `<circle cx="0" cy="0" r="50" />`，邏輯上更直覺。
2. 裁切或平移內容（像是在看地圖）——你可以把 viewBox 想像成一個「相機視窗」。如果視窗起點是 0 0，你看到的是從原點開始的內容；如果起點改為 50 50，相機往右下移，畫面中的物體看起來會往左上移動；如果起點改為 -50 -50，相機往左上移，原本在畫面邊緣外的物體就會「進入」視窗內。
3. 處理從設計軟體（如 AI、Figma）匯出的路徑——有時候在繪圖軟體中，路徑的座標可能已經包含了位移（例如某個形狀的座標是從 x=500 開始）。為了不手動去改每一條路徑的座標，開發者可以直接調整 viewBox 的起點，讓視窗直接「對準」那些高數值的座標區域。
關鍵觀念：平移而非翻轉——雖然起點可以設定為負值，但 Y 軸的方向依然是向下增加，它不會因為設為負值就變成數學上向上遞增的座標系。

**使用者：** ViewBox 4 個值 是起點嗎？

**Gemini：** viewBox 的四個值確實定義了「視野」的起點以及大小。你可以把 viewBox 想像成一個相機鏡頭的觀景窗，這四個值的順序固定為 `viewBox="min-x min-y width height"`。參數定義：min-x 是視野左上角的 X 座標（起點 X）、min-y 是視野左上角的 Y 座標（起點 Y）、width 是視野的寬度、height 是視野的高度。它是如何運作的：這四個值定義了 SVG 內部世界的座標系，前兩個值 min-x 和 min-y 決定了畫布的哪一個點要對齊 `<svg>` 容器的左上角，後兩個值決定了你要從那個起點「看多寬、多高」的範圍。縮放（Scaling）的關鍵：這就是 SVG 為什麼叫「向量」圖的原因——如果你的 `<svg width="500" height="500">`（螢幕佔據空間），但你的 viewBox="0 0 100 100"（座標系統範圍），那麼你在座標 50, 50 畫的東西實際上會出現在螢幕上的 250, 250 位置，這代表所有的東西都被放大了 5 倍。舉例對比：`0 0 100 100` 從 (0,0) 開始看 100×100 的範圍，是標準視野；`50 50 100 100` 起點往右下移，畫面會往左上移動；`0 0 50 50` 從 (0,0) 開始只看一半的寬高，是放大效果（Zoom in）；`0 0 200 200` 從 (0,0) 開始看兩倍的寬高，是縮小效果（Zoom out），圖形會縮在左上角。總結：viewBox 的前兩個值是起點，決定了你的視野從哪裡開始「拍」；後兩個值是規格，決定了你的視野涵蓋多大的物理範圍。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇來源對話（Gemini Flash） | https://gemini.google.com/app/c939d5e74833ab74 | 對話擷取於 2026-08-15 |
| MDN｜SVG viewBox 屬性 | https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox | 查證於 2026-08-15 |
| MDN｜SVG 座標系統與變形（Positions 教學） | https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Positions | 查證於 2026-08-15 |
| W3C｜SVG 2 The 'viewBox' attribute | https://www.w3.org/TR/SVG2/coords.html#ViewBoxAttribute | SVG 2 Candidate Recommendation，查證於 2026-08-15 |

> ⚠️ 存疑／更正：Gemini 沒提到 <mark style="background: #FFB8EBA6;">`preserveAspectRatio`</mark>。當 `<svg>` 容器的長寬比與 viewBox 的長寬比不同時，實際縮放與對齊行為由 `preserveAspectRatio`（預設 `xMidYMid meet`）決定，只看 viewBox 會算錯位置。想讓內容拉伸填滿要設 `preserveAspectRatio="none"`。
