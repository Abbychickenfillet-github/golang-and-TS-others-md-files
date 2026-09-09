---
title: 網頁版座標點連線視覺化工具：GeoGebra、Plotly、Desmos 與自己用 Three.js／p5.js 做
type: topic-note
source: Gemini
category: 技術
tags: [gemini, 視覺化, 幾何, 座標系統, threejs, p5js, geogebra, plotly, desmos, svg]
sources:
  - https://gemini.google.com/app/0516ad3f4b4837b4
updated: 2026-08-29
---

# 網頁版座標點連線視覺化工具：GeoGebra、Plotly、Desmos 與自己用 Three.js／p5.js 做

> 本篇重點 a–i，共 9 個。需求是「在網頁上輸入一組座標點，讓它自動連線成幾何模型」，分成「現成工具」與「自己寫」兩條路。

---

## 重點整理

### 一、四個現成的網頁工具

(a) <mark style="background: #BBFABBA6;">GeoGebra（幾何數學工具）</mark> — https://www.geogebra.org/3d ：目前功能最完整且免費的網頁數學工具。輸入座標點如 `A=(1,2,3)`，再用指令 `Polygon(A, B, C, D)` 或 `Line(A, B)` 建立連線模型。<mark style="background: #FFF3A3A6;">支援 3D 空間與參數方程並可即時預覽</mark>，適合數學建模與精確幾何構圖。

(b) <mark style="background: #BBFABBA6;">Plotly Chart Studio</mark> — https://chart-studio.plotly.com/ ：手上已有大量資料點（CSV 或 Excel）時最順手。支援 3D Scatter Plot，匯入座標後在設定選 `lines` 或 `lines+markers` 模式，它就會<mark style="background: #FF5582A6;">依照「點的順序」連線</mark>。適合資料科學、路徑追蹤、科研繪圖。

(c) <mark style="background: #BBFABBA6;">Tinkercad Codeblocks</mark> — https://www.tinkercad.com/codeblocks ：Autodesk 旗下線上建模工具，用邏輯積木或座標點生成 3D 模型。偏向實體建模，適合 3D 列印前置設計。

(d) <mark style="background: #BBFABBA6;">Desmos 3D Graphing Calculator</mark> — https://www.desmos.com/3d ：操作最直覺。列一個點清單 `L=[(0,0,0),(1,2,3),...]` 再用連線功能觀察空間形狀，適合快速視覺化與輕量測試。

(e) <mark style="background: #ADCCFFA6;">選擇原則</mark>：要「精確幾何與教學」選 GeoGebra；要「大量資料點與圖表輸出」選 Plotly；要「快速看一眼」選 Desmos；要「做成實體」選 Tinkercad。

### 二、自己寫：Three.js 與 p5.js

- <mark style="background: #ADCCFFA6;">Three.js ＝ 建構在 WebGL 之上的 3D 函式庫</mark>，WebGL ＝ Web Graphics Library，瀏覽器的硬體加速繪圖 API。
- <mark style="background: #ADCCFFA6;">p5.js ＝ Processing 的 JavaScript 版</mark>，主打創意編碼（creative coding），API 比 Three.js 簡單很多。

(f) <mark style="background: #BBFABBA6;">Three.js 做法</mark>：用 `THREE.BufferGeometry` 的 `setFromPoints` 把座標陣列直接轉成線條模型。

```js
// points 是一組 THREE.Vector3
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1, 2, 3),
  new THREE.Vector3(2, 0, 1),
];

// BufferGeometry 是把頂點資料塞進 GPU 緩衝區的幾何體
const geometry = new THREE.BufferGeometry().setFromPoints(points);

// LineBasicMaterial 是「線」專用的材質，不受光照影響
const material = new THREE.LineBasicMaterial({ color: 0x3355ff });

// THREE.Line 會依照 points 的「陣列順序」依序連接
const line = new THREE.Line(geometry, material);
scene.add(line);
```

<mark style="background: #FFF3A3A6;">一行一行的意思</mark>：先準備一組三維向量當頂點；`setFromPoints` 把它們展平成一個 Float32Array 存進 GPU 緩衝區（這就是 Buffer 的由來，比舊的 `Geometry` 省記憶體）；材質決定線的顏色；`THREE.Line` 這個物件負責「依序把相鄰兩點連起來」，所以<mark style="background: #FF5582A6;">陣列順序錯了，圖形就會錯</mark>；最後把它加進場景才會被渲染。

(g) <mark style="background: #BBFABBA6;">p5.js 做法</mark>：在 `draw()` 裡用 `beginShape()`、`vertex(x, y, z)`、`endShape(CLOSE)`。

```js
function draw() {
  background(240);
  beginShape();              // 開始收集頂點
  vertex(0, 0, 0);           // 逐點餵入座標
  vertex(100, 50, 0);
  vertex(50, 120, 0);
  endShape(CLOSE);           // CLOSE 代表把最後一點接回第一點，形成封閉多邊形
}
```

<mark style="background: #FFF3A3A6;">`endShape(CLOSE)` 的 CLOSE 是關鍵字</mark>，不加就只會畫出開放折線；要畫 3D 需先在 `createCanvas(w, h, WEBGL)` 指定 WEBGL 模式。

(h) <mark style="background: #D2B3FFA6;">如果只是 2D 而且點數不多，其實用純 SVG 的 `<polyline points="0,0 100,50 50,120">` 就夠了</mark>，不需要引入任何函式庫，檔案還能直接貼進 Obsidian 顯示。

(i) <mark style="background: #FF5582A6;">共通陷阱</mark>：所有這些工具都是「依照你給的順序連線」，不會自動幫你算出最合理的連法。如果要的是「把一堆散點連成外框」，那是凸包（Convex Hull）演算法的問題，不是繪圖工具的問題。

---

## 關聯筆記（以及為什麼相關）

- [[frontend-docs/css/SVG-viewBox座標系統-起算點與負值平移]]：<mark style="background: #FFF3A3A6;">關聯原因</mark>：本篇 (h) 提到 SVG `<polyline>` 是最輕量的解，但要畫對就必須先理解 viewBox 的座標起算點與 y 軸方向（SVG 的 y 往下為正，數學課本往上為正，這是最常見的翻轉錯誤）。
- [[frontend-docs/svg-tags-guide]]：<mark style="background: #FFF3A3A6;">關聯原因</mark>：`<polyline>`、`<polygon>`、`<path>` 的差別直接決定 (h) 該用哪個標籤。
- [[frontend-docs/booth-map-scaling-explained]]：<mark style="background: #D2B3FFA6;">關聯原因</mark>：展位圖也是「把座標資料畫成圖」，縮放與座標換算的邏輯與本篇同源。
- [[資料結構]] 資料夾：<mark style="background: #D2B3FFA6;">關聯原因</mark>：(i) 的凸包問題屬於計算幾何，是資料結構與演算法的延伸。

---

## 相關練習題（LeetCode／NeetCode）

(i) 提到的凸包與座標幾何在演算法題庫裡有直接對應：

- LeetCode 587. Erect the Fence（Convex Hull，凸包）— https://leetcode.com/problems/erect-the-fence/ ：正是「給一堆座標點，求最外圈連線」。
- LeetCode 149. Max Points on a Line — https://leetcode.com/problems/max-points-on-a-line/ ：判斷共線，練座標與斜率的浮點陷阱。
- LeetCode 1030. Matrix Cells in Distance Order — https://leetcode.com/problems/matrix-cells-in-distance-order/ ：座標排序入門。
- NeetCode 練習總表 — https://neetcode.io/practice ：Math & Geometry 分類可一併掃過。

---

## ⚠️ 存疑／更正

- Gemini 提到 Three.js 用 `THREE.BufferGeometry` 的 `setFromPoints`，這是<mark style="background: #BBFABBA6;">正確且為現行做法</mark>；補充說明：舊教學裡的 `THREE.Geometry` 已於 r125 版之後從核心移除，<mark style="background: #FF5582A6;">網路上舊範例直接複製會報錯</mark>，這點原對話沒有提醒。
- Gemini 說 Desmos「最近推出 3D 版」，Desmos 3D 計算機自 2024 年起即已公開，<mark style="background: #FFF3A3A6;">「最近」的說法以 2026-08 的時間點來看已不準確</mark>。

---

## 各對話來源

### 網頁座標點連線模型工具（2026-08）— https://gemini.google.com/app/0516ad3f4b4837b4

使用者：有沒有網頁版的座標點輸入連線模型

Gemini：推薦四種工具。1. GeoGebra（幾何數學工具）：免費且功能最強，輸入 `A=(1,2,3)` 後用 `Polygon(A, B, C, D)` 或 `Line(A, B)` 建立連線模型，支援 3D 空間與參數方程並可即時預覽，適合數學建模與精確幾何構圖。2. Plotly Chart Studio：適合已有大量資料點（CSV 或 Excel），支援 3D Scatter Plot，匯入座標後選 `lines` 或 `lines+markers` 模式即依點的順序連線，適合資料科學、路徑追蹤、科研繪圖。3. Tinkercad Codeblocks：Autodesk 線上建模工具，Codeblocks 模式可用邏輯積木或座標點生成 3D 模型，適合 3D 列印前置設計。4. Desmos 3D Graphing Calculator：操作直覺，列出點清單 `L=[(0,0,0),(1,2,3),...]` 並用連線功能觀察空間形狀，適合快速視覺化。程式開發建議：Three.js 用 `THREE.BufferGeometry` 的 `setFromPoints` 把座標陣列轉成線條模型；p5.js 在 `draw()` 中用 `beginShape()`、`vertex(x, y, z)`、`endShape(CLOSE)` 即可完成。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 對話：網頁座標點連線模型工具 | https://gemini.google.com/app/0516ad3f4b4837b4 | 對話 2026-08，整理於 2026-08-29 |
| GeoGebra 3D 繪圖計算機 | https://www.geogebra.org/3d | 線上服務，查證於 2026-08-29 |
| Desmos 3D 繪圖計算機 | https://www.desmos.com/3d | 線上服務，查證於 2026-08-29 |
| Plotly Chart Studio | https://chart-studio.plotly.com/ | 線上服務，查證於 2026-08-29 |
| Three.js BufferGeometry 官方文件 | https://threejs.org/docs/#api/en/core/BufferGeometry | 官方文件隨版本更新 |
| Three.js Line 官方文件 | https://threejs.org/docs/#api/en/objects/Line | 官方文件隨版本更新 |
| p5.js beginShape 參考 | https://p5js.org/reference/p5/beginShape/ | 官方文件隨版本更新 |
| MDN：SVG polyline | https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polyline | MDN 持續更新，查證於 2026-08-29 |

> 註：本次執行因本機磁碟空間吃緊，未額外擷取新截圖。
