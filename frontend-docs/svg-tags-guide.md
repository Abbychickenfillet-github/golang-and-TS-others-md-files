# SVG 子元素完整指南

## 📚 目錄

1. [SVG 不是 HTML，tag 不是「語意化」](#svg-不是-htmltag-不是語意化)
2. [為什麼 circle 可以放在 svg 裡](#為什麼-circle-可以放在-svg-裡)
3. [SVG 所有子元素分類總覽](#svg-所有子元素分類總覽)
4. [基本形狀（Basic Shapes）](#基本形狀basic-shapes)
5. [路徑（Path）](#路徑path)
6. [文字（Text）](#文字text)
7. [容器與結構（Container & Structural）](#容器與結構container--structural)
8. [漸層與填充（Gradients & Patterns）](#漸層與填充gradients--patterns)
9. [濾鏡（Filters）](#濾鏡filters)
10. [遮罩與裁切（Masks & Clipping）](#遮罩與裁切masks--clipping)
11. [動畫（Animation）](#動畫animation)
12. [其他實用元素](#其他實用元素)
13. [速查表](#速查表)
14. [實例：拆解登入頁的 SVG](#實例拆解登入頁的-svg)

---

## SVG 不是 HTML，tag 不是「語意化」

這是最重要的觀念，先講清楚：

| | HTML | SVG |
|---|---|---|
| **本質** | 文件結構語言 | 向量繪圖語言 |
| **tag 的意義** | **語意化**：描述「這是什麼內容」（`<article>`、`<nav>`、`<button>`） | **圖形基本單元**：描述「這是什麼形狀」（`<circle>`、`<path>`、`<rect>`） |
| **規範** | W3C HTML Living Standard | W3C SVG 1.1 / 2.0 |
| **副檔名** | `.html` | `.svg`（也可內嵌在 HTML 裡） |

所以嚴格來說，**SVG 裡的 tag 不是「語意化標籤」**（HTML 術語）。它們是 SVG 規範定義的 **XML 元素**，每個 tag 對應一種可繪製的圖形單位。

不過「放得下、瀏覽器認得」的原因跟 HTML 類似 —— **規範定義哪些 tag 可以是哪個 tag 的子元素**。`<svg>` 規範上就是一個「圖形容器」，它允許下面列的所有元素作為子節點。

---

## 為什麼 circle 可以放在 svg 裡

因為 SVG 規範就是這樣設計的。

`<svg>` 是「畫布容器」，它不直接畫任何東西，只定義座標系統（`viewBox`、`width`、`height`）。真正畫東西的是子元素：

```xml
<svg viewBox="0 0 24 24" width="20" height="20">
  <!-- 畫布上畫一個圓 -->
  <circle cx="12" cy="12" r="10" />
  <!-- 畫一條直線 -->
  <path d="M12 7V13" />
  <!-- 再畫一個小圓（當點用） -->
  <circle cx="12" cy="16" r="1.25" />
</svg>
```

可以想成：`<svg>` 是一張白紙，`<circle>` / `<path>` / `<rect>` 等是畫筆指令。你可以疊加任意多個，後面的會蓋在前面的上面（繪製順序就是 DOM 順序）。

**一定要有子元素嗎？** 不用。`<svg>` 可以是空的（會顯示一個空白區域）。

**只能放一個嗎？** 不是。可以放任意多個，也可以巢狀（`<svg>` 裡再放 `<svg>`）。

---

## SVG 所有子元素分類總覽

按照 W3C 規範，SVG 元素分為 **9 大類**：

| 類別 | 代表元素 | 用途 |
|---|---|---|
| 基本形狀 | `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon` | 畫幾何圖形 |
| 路徑 | `path` | 畫任意曲線/多邊形（最萬用） |
| 文字 | `text`, `tspan`, `textPath` | 放文字 |
| 容器/結構 | `g`, `defs`, `symbol`, `use`, 巢狀 `svg` | 分組、定義、重用 |
| 漸層/填充 | `linearGradient`, `radialGradient`, `pattern`, `stop` | 複雜填色 |
| 濾鏡 | `filter`, `feGaussianBlur`, `feBlend`... | 模糊、色彩變換等特效 |
| 遮罩/裁切 | `mask`, `clipPath` | 控制顯示範圍 |
| 動畫 | `animate`, `animateTransform`, `animateMotion`, `set` | 原生 SVG 動畫（少用，多被 CSS 取代） |
| 其他 | `foreignObject`, `image`, `marker`, `title`, `desc`, `a`, `switch`, `style` | 嵌入、標記、無障礙等 |

---

## 基本形狀（Basic Shapes）

### `<rect>` — 矩形

```xml
<rect x="10" y="10" width="100" height="50" rx="8" ry="8"
      fill="pink" stroke="black" stroke-width="2" />
```

| 屬性 | 意義 |
|---|---|
| `x`, `y` | 左上角座標 |
| `width`, `height` | 寬高 |
| `rx`, `ry` | 圓角半徑（寫一個就夠，兩個是不等角圓角） |

### `<circle>` — 圓

```xml
<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" />
```

| 屬性 | 意義 |
|---|---|
| `cx`, `cy` | 圓心座標 |
| `r` | 半徑 |

### `<ellipse>` — 橢圓

```xml
<ellipse cx="50" cy="50" rx="40" ry="20" />
```

和 `circle` 一樣但是分別設 x/y 軸半徑。

### `<line>` — 直線

```xml
<line x1="0" y1="0" x2="100" y2="100" stroke="black" />
```

注意：**線必須設 `stroke`，否則看不到**（預設沒有描邊）。

### `<polyline>` — 折線（開放）

```xml
<polyline points="0,0 50,50 100,0 150,50" fill="none" stroke="black" />
```

多個點依序連起來，不會自動首尾相連。

### `<polygon>` — 多邊形（封閉）

```xml
<polygon points="100,10 40,198 190,78 10,78 160,198"
         fill="pink" stroke="black" />
```

跟 `polyline` 類似，但會自動把最後一點連回第一點。

---

## 路徑（Path）

### `<path>` — 最強大也最常用

`path` 可以畫任何形狀 —— 包括上面所有 basic shapes 能畫的。複雜 icon 幾乎都靠它。

```xml
<path d="M10 10 L 100 10 L 100 100 Z" fill="pink" />
```

`d` 屬性是「繪圖指令字串」。常用指令：

| 指令 | 全名 | 意義 | 範例 |
|---|---|---|---|
| `M x y` | Move to | 移動到（不畫線） | `M 10 10` |
| `L x y` | Line to | 畫直線到 | `L 100 100` |
| `H x` | Horizontal | 水平直線 | `H 200` |
| `V y` | Vertical | 垂直直線 | `V 50` |
| `C x1 y1 x2 y2 x y` | Cubic Bezier | 三次貝茲曲線 | `C 20 20 40 20 50 10` |
| `Q x1 y1 x y` | Quadratic Bezier | 二次貝茲曲線 | `Q 25 25 40 50` |
| `A rx ry ...` | Arc | 弧線 | `A 30 30 0 0 1 162 163` |
| `Z` | Close path | 封閉路徑（回起點） | `Z` |

**大寫是絕對座標，小寫是相對座標**（相對上一個點）。

登入頁用的 `d="M12 7V13"` 拆解：
- `M 12 7` → 移動到 (12, 7)
- `V 13` → 垂直畫到 y=13

等於 `<line x1="12" y1="7" x2="12" y2="13" />`。

---

## 文字（Text）

### `<text>` — 在 SVG 裡放文字

```xml
<text x="50" y="50" font-size="16" fill="black">
  Hello SVG
</text>
```

### `<tspan>` — 文字片段（可改樣式）

```xml
<text x="10" y="20">
  普通 <tspan fill="red" font-weight="bold">重點</tspan> 普通
</text>
```

### `<textPath>` — 文字沿路徑排列

```xml
<defs>
  <path id="curve" d="M10 80 Q 95 10 180 80" />
</defs>
<text>
  <textPath href="#curve">文字會沿著曲線走</textPath>
</text>
```

---

## 容器與結構（Container & Structural）

### `<g>` — group，分組

```xml
<g fill="pink" transform="translate(50, 50)">
  <circle cx="0" cy="0" r="10" />
  <rect x="20" y="-5" width="30" height="10" />
</g>
```

所有 `<g>` 內的元素會一起繼承屬性（`fill`）、一起 transform。

### `<defs>` — 定義區（只定義不顯示）

```xml
<defs>
  <circle id="dot" r="5" fill="pink" />
</defs>
<use href="#dot" x="50" y="50" />
<use href="#dot" x="100" y="50" />
```

定義的東西不會直接渲染，要用 `<use>` 引用才會顯示。

### `<symbol>` — 可重用的 icon 模板

```xml
<symbol id="icon-check" viewBox="0 0 24 24">
  <path d="M5 13l4 4L19 7" stroke="currentColor" />
</symbol>
<!-- 使用 -->
<svg><use href="#icon-check" /></svg>
```

比 `<defs>` 更適合做 icon sprite。

### `<use>` — 引用已定義元素

```xml
<use href="#icon-check" x="10" y="10" width="24" height="24" />
```

### 巢狀 `<svg>` — 子畫布

```xml
<svg viewBox="0 0 200 200">
  <svg x="50" y="50" viewBox="0 0 10 10" width="100" height="100">
    <circle cx="5" cy="5" r="5" fill="pink" />
  </svg>
</svg>
```

子 `<svg>` 可以有自己獨立的座標系統。

---

## 漸層與填充（Gradients & Patterns）

### `<linearGradient>` — 線性漸層

```xml
<defs>
  <linearGradient id="pink-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#ff6b9d" />
    <stop offset="100%" stop-color="#ff8fab" />
  </linearGradient>
</defs>
<rect x="0" y="0" width="200" height="50" fill="url(#pink-gradient)" />
```

### `<radialGradient>` — 放射性漸層

```xml
<radialGradient id="glow" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="white" stop-opacity="1" />
  <stop offset="100%" stop-color="white" stop-opacity="0" />
</radialGradient>
```

### `<pattern>` — 重複圖樣

```xml
<pattern id="dots" x="0" y="0" width="20" height="20"
         patternUnits="userSpaceOnUse">
  <circle cx="10" cy="10" r="2" fill="pink" />
</pattern>
<rect width="200" height="200" fill="url(#dots)" />
```

---

## 濾鏡（Filters）

### `<filter>` + `<feGaussianBlur>` — 模糊效果

```xml
<defs>
  <filter id="blur">
    <feGaussianBlur stdDeviation="3" />
  </filter>
</defs>
<circle cx="50" cy="50" r="20" fill="pink" filter="url(#blur)" />
```

常見 filter primitives：

| 元素 | 效果 |
|---|---|
| `feGaussianBlur` | 高斯模糊 |
| `feOffset` | 位移（做陰影） |
| `feColorMatrix` | 色彩矩陣（變色、灰階） |
| `feBlend` | 混合兩層 |
| `feDropShadow` | 投影（SVG 2） |
| `feTurbulence` | 雜訊紋理 |
| `feComposite` | 合成運算 |

---

## 遮罩與裁切（Masks & Clipping）

### `<clipPath>` — 硬邊裁切

```xml
<defs>
  <clipPath id="clip-circle">
    <circle cx="50" cy="50" r="40" />
  </clipPath>
</defs>
<image href="photo.jpg" clip-path="url(#clip-circle)" />
```

只有 `<circle>` 裡面的部分會顯示。

### `<mask>` — 軟邊遮罩（可帶漸層透明度）

```xml
<mask id="soft-mask">
  <rect width="100%" height="100%" fill="white" />
  <circle cx="50" cy="50" r="30" fill="black" />
</mask>
<rect width="100" height="100" fill="pink" mask="url(#soft-mask)" />
```

白色 = 顯示、黑色 = 隱藏、灰色 = 半透明。

---

## 動畫（Animation）

**現代專案幾乎都用 CSS animation 或 JS（GSAP、Framer Motion），不太寫 SVG 原生動畫**。但知道有這東西：

```xml
<circle cx="50" cy="50" r="20">
  <animate attributeName="r" from="20" to="40" dur="1s" repeatCount="indefinite" />
</circle>
```

| 元素 | 用途 |
|---|---|
| `animate` | 動畫屬性值 |
| `animateTransform` | 動畫 transform |
| `animateMotion` | 沿路徑移動 |
| `set` | 單次設值 |

---

## 其他實用元素

### `<title>` + `<desc>` — 無障礙標題與描述

```xml
<svg role="img" aria-labelledby="t d">
  <title id="t">粉紅色愛心</title>
  <desc id="d">一個填滿粉紅色的愛心圖示，代表喜歡</desc>
  <path d="..." />
</svg>
```

螢幕閱讀器會朗讀 `<title>`。**裝飾用 icon** 請用 `aria-hidden="true"` 跳過。

### `<image>` — 嵌入點陣圖

```xml
<image href="/photo.jpg" x="0" y="0" width="200" height="100" />
```

### `<foreignObject>` — 嵌入 HTML

```xml
<foreignObject x="10" y="10" width="100" height="100">
  <div xmlns="http://www.w3.org/1999/xhtml">我是 HTML</div>
</foreignObject>
```

在 SVG 裡塞 HTML 的後門。

### `<marker>` — 箭頭/端點標記

```xml
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="black" />
  </marker>
</defs>
<line x1="0" y1="50" x2="200" y2="50" stroke="black" marker-end="url(#arrow)" />
```

### `<a>` — SVG 裡的連結

```xml
<a href="https://example.com" target="_blank">
  <circle cx="50" cy="50" r="40" fill="pink" />
</a>
```

---

## 速查表

### 要畫什麼？用什麼？

| 需求 | 用哪個 |
|---|---|
| 圓 | `<circle>` |
| 橢圓 | `<ellipse>` |
| 方形/長方形/圓角矩形 | `<rect>` |
| 直線 | `<line>` 或 `<path>` |
| 多邊形 | `<polygon>` 或 `<path>` |
| 任意曲線 | `<path>` |
| Icon（通常從 Figma 匯出） | 一個或多個 `<path>` |
| 文字 | `<text>` |
| 群組 | `<g>` |
| 重複使用同一圖形 | `<defs>` + `<use>` |
| 漸層 | `<linearGradient>` / `<radialGradient>` |
| 模糊/陰影 | `<filter>` + `<feGaussianBlur>` / `<feDropShadow>` |
| 圓形頭像裁切 | `<clipPath>` |
| 箭頭 | `<marker>` |
| 無障礙標題 | `<title>` + `<desc>` |

### 必填屬性速查

| 元素 | 必填 |
|---|---|
| `<svg>` | 建議 `viewBox`，外加 `width`/`height` 或 CSS 控制 |
| `<circle>` | `r`（`cx`/`cy` 預設 0） |
| `<rect>` | `width`, `height`（`x`/`y` 預設 0） |
| `<line>` | `x1 y1 x2 y2` 四個座標，**必設 `stroke`** |
| `<path>` | `d` 路徑字串 |
| `<polygon>` / `<polyline>` | `points` |
| `<text>` | `x`, `y` |

---

## 實例：拆解登入頁的 SVG

目前 `app/user/login/page.js` callout 的 icon：

```jsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="2" />
  <path d="M12 7V13"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  <circle cx="12" cy="16" r="1.25" fill="currentColor" />
</svg>
```

逐行拆：

| 行 | 畫什麼 | 視覺 |
|---|---|---|
| `<circle cx="12" cy="12" r="10">` | 畫布中央一個半徑 10 的圓（描邊，不填色） | ⭕ 外框 |
| `<path d="M12 7V13">` | 從 (12, 7) 往下畫到 (12, 13)，一條垂直短線 | ❗ 上半 |
| `<circle cx="12" cy="16" r="1.25">` | 在 (12, 16) 畫一個填實的小圓（當點用） | ❗ 下半 |

合起來 = **驚嘆號圖示**（上線、下點）。

### Info 圖示 ⓘ 寫法（點在上、線在下）

```jsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="2" />
  <circle cx="12" cy="8" r="1.25" fill="currentColor" />
  <path d="M12 11V17"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
</svg>
```

### 時鐘圖示 🕐 寫法

```jsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="2" />
  <path d="M12 7V12L15 14"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
</svg>
```

拆解：`M12 7` 移動到 12 點位置 → `V12` 往下到圓心 → `L15 14` 從圓心畫到 3 點方向 → 形成時針和分針。

---

## 補充資源

- [MDN SVG element reference](https://developer.mozilla.org/en-US/docs/Web/SVG/Element) — 官方完整元素列表
- [SVG Path Visualizer](https://svg-path-visualizer.netlify.app/) — 把 `d` 字串視覺化
- [Hero Icons](https://heroicons.com/) / [Lucide](https://lucide.dev/) — 免費 icon 集，直接抓 SVG 來用
