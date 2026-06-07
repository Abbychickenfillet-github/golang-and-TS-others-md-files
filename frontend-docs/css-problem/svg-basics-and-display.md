# SVG 基礎與 display 行為

## SVG 是什麼

SVG（Scalable Vector Graphics）是 **XML 格式的向量圖形**，瀏覽器原生支援，可以直接寫在 HTML 裡，也可以獨立成 `.svg` 檔案。

特性：
- **向量**：放大縮小不失真
- **可用 CSS 控制**：顏色、尺寸、動畫都可以
- **可操作 DOM**：JS 可以選取 SVG 內部元素
- **檔案通常很小**：簡單圖示只需幾百 bytes

---

## 必要結構

### 唯一必要的元素：`<svg>`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>
```

**裡面什麼都不放也是合法的 SVG**。所有圖形元素（path、rect、circle...）都是 optional。

### 必要 / 建議屬性

| 屬性 | 必要性 | 說明 |
|------|--------|------|
| `xmlns` | 獨立 `.svg` 檔必要；HTML5 內嵌可省略 | namespace 宣告 |
| `viewBox` | 建議必給 | 定義內部座標系統，決定縮放行為 |
| `width` / `height` | 建議給其一或都給 | 不給會用瀏覽器預設 300×150 |

---

## XML Namespace（`xmlns`）是什麼

### 定義

**`xmlns` = XML Namespace（XML 命名空間）**，是 XML 世界的「身分證」，用來告訴解析器「接下來這些標籤屬於哪個規範」。

### 為什麼需要

XML 可以自訂標籤，不同規範可能用同一個名字但意思不同：
- `<a>` 在 HTML 裡 = 超連結
- `<a>` 在某個自訂 XML 裡 = 可能是「作者」

namespace 負責區分「我這個 `<a>` 是哪一家的」。

### `http://www.w3.org/2000/svg` 是網址嗎？

**不是。** 它長得像網址，但實際上是一個**唯一識別字串（URI）**，就像身分證字號長得像地址但不是地址。

意思是：「這份文件裡的 `<svg>`、`<path>`、`<circle>` 都是 W3C 在 2000 年訂的 SVG 規範裡定義的那個」。

打開那個網址雖然會看到 W3C 的 SVG 說明頁，但**瀏覽器渲染 SVG 時不會去抓網址**，純粹拿字串做比對。

### 什麼時候要寫

| 情境 | 需要 `xmlns` 嗎？ |
|------|------------------|
| 獨立 `.svg` 檔案 | ✅ **必要**，不寫不會渲染 |
| 寫在 HTML5 文件裡 | ❌ 可省略（HTML5 parser 會自動認出 `<svg>`） |
| 寫在 XHTML / XML 裡 | ✅ **必要** |
| JSX / React 元件 | ❌ 通常可省略（加上也沒差） |

### 範例對照

**獨立 .svg 檔**（必要）：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="..." />
</svg>
```

**嵌在 HTML5 裡**（可省略）：
```html
<!DOCTYPE html>
<html>
  <body>
    <svg viewBox="0 0 24 24">  <!-- 沒寫 xmlns 也能正常顯示 -->
      <path d="..." />
    </svg>
  </body>
</html>
```

### 有時會看到的 `xmlns:xlink`

```html
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">
  <use xlink:href="#icon" />
</svg>
```

- `xmlns="..."` = **預設** namespace，沒前綴的標籤都屬於這個
- `xmlns:xlink="..."` = **取別名為 `xlink`** 的 namespace，後面可用 `xlink:href`

**補充**：SVG 2 之後 `xlink:href` 已被 `href` 取代，新程式碼不用再寫 `xlink` 那行。

### 一句話總結

`xmlns="http://www.w3.org/2000/svg"` = 「這份文件用的是 W3C SVG 規範」的聲明。獨立 `.svg` 檔必寫，嵌在 HTML5 裡可省略。

---

## 常用子元素

全部都是 optional，依需求選用：

```html
<svg viewBox="0 0 100 100">
  <path d="M10 10 L90 90" />          <!-- 路徑（最常用，icon 幾乎都是它） -->
  <rect x="0" y="0" width="50" height="50" />  <!-- 矩形 -->
  <circle cx="50" cy="50" r="20" />   <!-- 圓 -->
  <ellipse cx="50" cy="50" rx="30" ry="20" />  <!-- 橢圓 -->
  <line x1="0" y1="0" x2="100" y2="100" />     <!-- 直線 -->
  <polyline points="0,0 50,50 100,0" />        <!-- 折線 -->
  <polygon points="0,0 50,50 100,0" />         <!-- 多邊形 -->
  <text x="10" y="20">Hello</text>    <!-- 文字 -->
  <g>...</g>                          <!-- 群組（可一次套樣式給多個子元素） -->
  <defs>...</defs>                    <!-- 定義（配合 use、symbol 重複使用） -->
  <use href="#icon" />                <!-- 重用已定義元素 -->
</svg>
```

---

## `<rect>` 屬性詳解

### 所有屬性

| 屬性 | 值 | 必要性 | 說明 |
|------|-----|--------|------|
| `x` | 數字 | 選填（預設 0） | 左上角 x 座標 |
| `y` | 數字 | 選填（預設 0） | 左上角 y 座標 |
| `width` | 數字 / `%` | **必要** | 寬度；0 或省略則不顯示 |
| `height` | 數字 / `%` | **必要** | 高度；0 或省略則不顯示 |
| `rx` | 數字 | 選填 | 圓角水平半徑 |
| `ry` | 數字 | 選填 | 圓角垂直半徑 |
| `fill` | 顏色 / `none` | 選填（預設黑） | 填色 |
| `stroke` | 顏色 | 選填 | 邊框顏色 |
| `stroke-width` | 數字 | 選填 | 邊框粗細 |
| `opacity` | 0~1 | 選填 | 透明度 |

### 範例

**基本矩形**
```html
<svg viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="60" fill="tomato" />
</svg>
```

**圓角矩形**（只給 `rx` 會自動套用到 `ry`）
```html
<rect x="10" y="10" width="80" height="60"
      rx="10" ry="10"
      fill="skyblue" />
```

**只有邊框、無填色**
```html
<rect x="10" y="10" width="80" height="60"
      fill="none"
      stroke="black"
      stroke-width="2" />
```

**橢圓角**（`rx` 與 `ry` 不同）
```html
<rect x="10" y="10" width="80" height="60"
      rx="20" ry="5"
      fill="plum" />
```

### 重點提醒

- `width` / `height` 是**必要**的，沒給或 0 就看不見
- 座標原點 `(0, 0)` 在 SVG **左上角**，y 軸向下為正（跟數學座標系相反）
- `rx`、`ry` 最大為 `width/2`、`height/2`，超過會自動 clamp

---

## `<polygon>` 屬性詳解

### 所有屬性

| 屬性 | 值 | 必要性 | 說明 |
|------|-----|--------|------|
| `points` | 座標對字串 | **必要** | 所有頂點座標，**會自動封閉**（最後一點連回第一點） |
| `fill` | 顏色 / `none` | 選填（預設黑） | 填色 |
| `stroke` | 顏色 | 選填 | 邊框顏色 |
| `stroke-width` | 數字 | 選填 | 邊框粗細 |
| `fill-rule` | `nonzero` / `evenodd` | 選填 | 自相交多邊形的填色規則 |

### `points` 的寫法

```
points="x1,y1 x2,y2 x3,y3 ..."
```

座標對之間用空白或逗號分隔，多種寫法都合法：

```html
<!-- 這三種都一樣 -->
<polygon points="0,0 100,0 50,100" />
<polygon points="0 0, 100 0, 50 100" />
<polygon points="0 0 100 0 50 100" />
```

### 範例

**三角形**
```html
<svg viewBox="0 0 100 100">
  <polygon points="50,10 90,90 10,90" fill="tomato" />
</svg>
```

**五角星**
```html
<svg viewBox="0 0 100 100">
  <polygon points="50,5 61,40 98,40 68,62 79,95 50,75 21,95 32,62 2,40 39,40"
           fill="gold"
           stroke="orange"
           stroke-width="2" />
</svg>
```

**六邊形**
```html
<polygon points="50,5 90,27 90,73 50,95 10,73 10,27"
         fill="lightblue"
         stroke="navy"
         stroke-width="2" />
```

**箭頭**
```html
<polygon points="10,40 60,40 60,20 90,50 60,80 60,60 10,60"
         fill="seagreen" />
```

### polygon vs polyline 的差別

| 元素 | 自動封閉 | 預設 fill |
|------|---------|-----------|
| `<polygon>` | ✅ 會 | 黑色（形成封閉圖形） |
| `<polyline>` | ❌ 不會 | 黑色（但因為沒封閉，填色會很怪，通常設 `fill="none"`） |

```html
<!-- 同樣的點，結果完全不同 -->
<polyline points="10,10 50,90 90,10" fill="none" stroke="red" stroke-width="2" />
<polygon  points="10,10 50,90 90,10" fill="none" stroke="blue" stroke-width="2" />
```
polygon 會自動把 `(90,10)` 連回 `(10,10)`，polyline 不會。

### 重點提醒

- `points` 至少要 **3 個座標對**才能形成有效多邊形
- 座標可以是小數（`50.5, 20.3`）
- 最後一點會**自動連回第一點**，不用重複寫起點
- SVG 座標 y 軸**向下為正**，畫圖前先想好方向

---

## SVG 的 display 預設行為（重點）

### `<svg>` 預設是 `display: inline`

這跟 `<img>` 一樣，是**行內的 replaced element**。會有兩個常見困擾：

### 問題 1：SVG 下方會有空白

```html
<div style="border: 1px solid red;">
  <svg width="100" height="100">...</svg>
</div>
```
→ 紅框下方會多出約 3~5px 的空白。

**原因**：inline 元素會依 baseline 對齊，baseline 到 bottom 之間的「descender 空間」造成空隙。

### 問題 2：多個 SVG 之間有空格

```html
<svg>...</svg>
<svg>...</svg>
```
→ 兩個 SVG 中間會有空白（因為原始碼有換行 / 空格，inline 元素會渲染空白字元）。

---

## 解法

### 方案 A：改成 block（最常用）

```css
svg {
  display: block;
}
```

適用：單獨放置、當作圖片用的 SVG。

### 方案 B：改 vertical-align

```css
svg {
  vertical-align: middle;  /* 或 top、bottom */
}
```

適用：SVG 要跟文字 inline 混排（例如 icon + 文字）。

### 方案 C：包在 flex 容器

```css
.icon-wrap {
  display: inline-flex;
  align-items: center;
}
```

適用：icon 要精準對齊旁邊的文字。

---

## 常見陷阱對照表

| 情境 | 症狀 | 解法 |
|------|------|------|
| SVG 下方有空白 | 容器比 SVG 高 | `svg { display: block }` |
| Icon 跟文字沒對齊 | icon 偏上或偏下 | `vertical-align: middle` 或用 flex |
| SVG 沒縮放 | 給了 width 但內容沒跟著變 | 要給 `viewBox`，不要只給 width/height |
| 顏色改不動 | 在 CSS 改 `color` 沒反應 | SVG 要用 `fill` / `stroke`，不是 `color`（除非用了 `currentColor`） |
| SVG 被裁切 | 部分內容顯示不出來 | 檢查 `viewBox` 範圍是否涵蓋所有元素 |

---

## viewBox 的 4 個參數（重要）

語法：
```
viewBox="min-x min-y width height"
```

| 順序 | 參數 | 中文涵義 | 說明 |
|------|------|---------|------|
| 1 | `min-x` | **起始 x 座標** | 可視區域的左上角 x（通常是 0） |
| 2 | `min-y` | **起始 y 座標** | 可視區域的左上角 y（通常是 0） |
| 3 | `width` | **內部寬度** | 可視區域的寬度（決定 x 軸範圍） |
| 4 | `height` | **內部高度** | 可視區域的高度（決定 y 軸範圍） |

### 範例解讀

```html
viewBox="0 0 24 24"
```
→ 「從 (0, 0) 開始，往右 24 單位、往下 24 單位的方框是可視範圍」
→ 內部有效座標：x ∈ [0, 24]、y ∈ [0, 24]

```html
viewBox="10 10 100 50"
```
→ 「從 (10, 10) 開始，寬 100、高 50 的方框是可視範圍」
→ 內部有效座標：x ∈ [10, 110]、y ∈ [10, 60]
→ 畫在 `(0, 0)` 的元素看不到（在可視範圍左上角之外）

### 重點：參數是「絕對座標」不是「比例」

很多人誤以為 viewBox 是百分比，**錯。** 它是絕對座標。

```html
<svg viewBox="0 0 24 24">
  <rect x="25" y="0" width="10" height="10" fill="red" />
  <!-- 完全看不到！因為 x=25 已超出 viewBox 右邊界 24 -->
</svg>
```

超出 viewBox 的內容預設會被**裁掉**（SVG 根元素的 `overflow` 預設是 `hidden`）。

### 心智模型

把 viewBox 想成「一張方格紙」：

```
viewBox="0 0 24 24"
  ↓
24 × 24 格的方格紙

rect x="5" y="5"  → 畫在第 5 格、第 5 格
rect x="25"       → 超出紙張 → 被裁掉看不到
```

### min-x / min-y 不一定要是 0（進階）

起始點可以是任何數字，包含**負值**。這是平移 / 裁切畫面的關鍵。

**以中心為原點（畫對稱圖形超方便）**
```html
<svg viewBox="-50 -50 100 100">
  <circle cx="0" cy="0" r="40" />  <!-- 0,0 就是中心 -->
</svg>
```

**只看原圖的某個區域（裁切 / sprite 切圖）**
```html
<!-- 原本 100×100 的圖，只顯示右下 50×50 -->
<svg viewBox="50 50 50 50">
  <path d="..." />
</svg>
```

**實際用途**
| 用途 | viewBox 寫法 |
|------|-------------|
| 一般 icon / 圖形 | `0 0 24 24` |
| 以中心為原點 | `-50 -50 100 100` |
| 顯示 sprite 裡的某個區塊 | `100 0 50 50` |
| 放大看細節 | 縮小 width/height，如 `10 10 5 5` |

---

## viewBox vs width/height 的差別

```html
<!-- 只有 width/height：SVG 大小 100×100，但內部座標不明確 -->
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" />
</svg>

<!-- 有 viewBox：內部座標系統 0~24，外部渲染成 100×100 -->
<svg width="100" height="100" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" />
</svg>
```

- `viewBox="0 0 24 24"` = **內部**座標是 0 到 24 的方格
- `width="100"` = **外部**實際渲染尺寸 100px
- 縮放比例發生在「viewBox → width/height」：24 → 100，放大約 4.17 倍
- **有 viewBox → SVG 會自動縮放填滿外部尺寸，這是「向量不失真」的關鍵**

---

## `fill` 寫在 `<svg>` 上會發生什麼事？

### 重點：`fill` 不是「SVG 背景色」

`fill` 是 SVG 的繪圖屬性，會**被子元素繼承**，但**不會填滿 SVG 方塊本身**。

```html
<svg fill="red" viewBox="0 0 24 24">
  <path d="..." />              <!-- 繼承 → 紅色 -->
  <circle cx="12" cy="12" r="5" /> <!-- 繼承 → 紅色 -->
  <rect fill="blue" ... />       <!-- 自己指定 → 藍色（覆蓋繼承） -->
</svg>
```

這其實是 **icon 系統的常用手法**：最外層設一次 `fill`，裡面的 path 不用重複寫。

### 常見誤解

```jsx
<svg viewBox="0 0 24 24" fill="red">
  <path d="..." fill="#000" />  {/* 這個 path 自己寫了 fill，外層 red 無效 */}
</svg>
```
如果子元素自己有 `fill`，外層的 `fill="red"` 會被**覆蓋**（不是繼承關係中的 override，是子元素自己的值優先）。

### 如果真的要「SVG 背景色」

**做法 1：畫一個滿版 rect**
```html
<svg viewBox="0 0 24 24">
  <rect width="24" height="24" fill="red" />   <!-- 當背景 -->
  <path d="..." fill="white" />                 <!-- 前景 icon -->
</svg>
```

**做法 2：用 CSS**
```html
<svg style="background: red;" viewBox="0 0 24 24">
  <path d="..." fill="white" />
</svg>
```

### 摘要對照

| 寫法 | 效果 |
|------|------|
| `<svg fill="red">` | 子元素**繼承**紅色 fill |
| `<svg style="background: red">` | SVG 方塊的**背景**變紅 |
| `<rect width="100%" height="100%" fill="red" />` | 在 SVG 內畫一個紅色滿版矩形當背景 |

---

## 用 CSS 控制 SVG 顏色

### `currentColor` 讓 SVG 跟著 CSS color 走

```html
<svg fill="currentColor">
  <path d="..." />
</svg>
```
```css
.icon { color: red; }  /* SVG 就會變紅 */
```

這是做 icon 系統的標準做法，讓同一個 SVG 可以在不同地方呈現不同顏色。

### 直接用 CSS 改

```css
svg path {
  fill: blue;
  stroke: black;
  stroke-width: 2;
}
```

---

## 日期
2026-04-21
