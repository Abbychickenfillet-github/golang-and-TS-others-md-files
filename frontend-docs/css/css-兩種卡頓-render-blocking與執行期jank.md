# CSS 的兩種「卡頓」：阻塞首屏 vs 執行期 Jank

> 問題來源：診斷 `next-one-main` 的 `/dashboard` FCP 5.24s 時延伸出的疑問「css 也會卡頓嗎？」
> 日期：2026-09-16
> 相關筆記：[Dashboard FCP 根因診斷](../nextjs/nextjs-dashboard-fcp-csr-bailout-render-blocking-css.md)、[FCP首次內容繪製-SEO爬蟲與打包五步驟](../FCP首次內容繪製-SEO爬蟲與打包五步驟.md)

---

## 先講結論

**會，而且是兩種完全不同、成因不同、修法也不同的「卡」。**

| | 第一種：阻塞首屏 | 第二種：執行期 Jank |
|---|---|---|
| **發生時機** | 頁面還沒畫出來 | 頁面已經畫出來，滑動/hover 時 |
| **症狀** | 白畫面很久（FCP / LCP 差） | 動畫頓挫、滑動不順、掉幀 |
| **成因** | CSS 檔太大、下載太慢、@import 串行 | 動畫屬性選錯、濾鏡太貴 |
| **量測指標** | FCP、LCP | FPS、INP、Long Task |
| **DevTools 看哪** | Performance 開頭的 `Parse Stylesheet` | 滑動時的紅色三角形 Long Task |

---

## 第一種：阻塞首屏（Render-Blocking）

### 機制

CSS 是**規格上定義的 render-blocking 資源**。瀏覽器拿到 `<link rel="stylesheet">` 之後，在 CSSOM 建完之前**一個像素都不畫**。

```
HTML 下載 → 解析建 DOM
                ↓
CSS 下載 → 解析建 CSSOM     ← 這裡卡住，下面全部不動
                ↓
        DOM + CSSOM = Render Tree
                ↓
            Layout → Paint   ← 第一個像素（FCP）
```

### 為什麼要這樣設計

不阻塞的話會出現 **FOUC（Flash of Unstyled Content）**：先畫出沒有樣式的醜畫面，CSS 載完再跳一次版。

瀏覽器的取捨是：**與其閃兩次，不如等一次。**

（對照：JS 的 `<script>` 預設也阻塞解析，但可以用 `async` / `defer` 解除；CSS 沒有等價的簡單開關，只能用 `media` 屬性或 `preload` + `onload` 這類技巧。）

### 解析成本也是主執行緒的同步工作

不只「下載」慢，「解析」本身也卡主執行緒。

`next-one-main` 的實例：一支 397 KB 的字型 CSS 裡有 **421 個 `@font-face` 規則**

```bash
grep -o "@font-face" .next/static/css/a675dd4d9d26ec04.css | wc -l
# 421
```

每一個 `@font-face` 都要 parse、每一個 `unicode-range` 都要建索引。這段期間主執行緒完全卡死。

### 最糟的模式：CSS 內部的外部 `@import`

`node_modules/bs-icon/icons.css` 第一行：

```css
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.min.css");
```

這條鏈是**完全串行**的：

```
下載 icons.css → 解析 → 才發現有 @import → DNS 查詢 jsdelivr
  → TLS 握手 → 下載第三方 CSS → 解析 → 再下載 icon 字型
```

**關鍵**：瀏覽器的 **preload scanner 看不到 CSS 檔案內部的 `@import`**。

preload scanner 是瀏覽器的「預掃描器」，會在主解析器還在忙時先掃過 HTML，把 `<link>`、`<script>`、`<img>` 的 URL 提前抓出來平行下載。但它只掃 HTML，不會去解析 CSS 檔案的內容。所以 `@import` 進來的資源只能等到 CSS 被真正解析時才被發現。

**規則：永遠不要用 `@import` 載入外部網址。** 改成 `<link>`（HTML 裡，preload scanner 看得到）或本機 bundle。

### 修法清單

| 手法 | 說明 |
|---|---|
| 減少 CSS 體積 | 按需 import（Bootstrap 用 `@use` 只挑要的模組），砍字型字重 |
| 消滅外部 `@import` | 改 `<link>` 或本機安裝 |
| Critical CSS | 首屏樣式 inline 進 `<style>`，其餘非同步載入 |
| `media` 屬性 | `<link media="print">` 不阻塞 render；可用 `media="print" onload="this.media='all'"` 做非同步載入 |
| Code splitting | CSS Modules / CSS-in-JS 讓每頁只載自己的樣式 |

---

## 第二種：執行期 Jank（掉幀）

跟首屏無關，是頁面**已經畫出來後**滑動、hover、動畫時的頓挫。

### 預算：每幀 16.6ms

60fps = 每秒 60 幀 = **每幀只有 16.6 毫秒**。扣掉瀏覽器自己的開銷，實際留給你的大約 10ms。超過就掉幀。

### 關鍵概念：像素管線（Pixel Pipeline）

改動不同的 CSS 屬性，會觸發管線上不同深度的工作：

```
JavaScript → Style → Layout → Paint → Composite
                       ↑        ↑         ↑
                      最貴     中等      最便宜
```

| 你改的屬性 | 觸發到哪一層 | 成本 |
|---|---|---|
| `width` `height` `top` `left` `margin` `padding` `font-size` | **Layout**（重排，整頁重算） | 最貴 |
| `color` `background` `box-shadow` `border-radius` | **Paint**（重繪） | 中等 |
| `transform` `opacity` | **Composite**（GPU 合成） | 最便宜 |

**只有 `transform` 和 `opacity` 能完全交給 GPU**，不碰主執行緒。動畫只動這兩個屬性，是效能優化的第一準則。

### 反模式 1：`transition: all`

`next-one-main` 的實測：

```bash
grep -ohE "transition:[^;]*" styles/*.scss | grep -E "all|left|top|width" | sort | uniq -c | sort -rn
```

```
     18 transition: all 0.3s ease
      2 transition: all 0.3s ease !important
      2 transition: all 0.2s ease
      1 transition: left 0.5s          ← 最糟
      1 transition: all 0.5s ease
```

**`all` 的意思是「監看每一個 CSS 屬性的變化」。** 瀏覽器不知道你其實只想動 `opacity`，所以每一幀都要比對全部屬性，而且一旦其中有會觸發 layout 的屬性被動到，就整個 reflow。

```scss
/* 壞 */
.card {
  transition: all 0.3s ease;
}

/* 好：明確列出，而且只動 composited 屬性 */
.card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
```

`transition: left 0.5s` 特別糟 —— `left` 每一幀都觸發 **reflow**（重新計算整頁排版）。改寫：

```scss
/* 壞 */
.panel {
  position: relative;
  left: 0;
  transition: left 0.5s;
}
.panel.open { left: 200px; }

/* 好：transform 不觸發 layout */
.panel {
  transition: transform 0.5s;
}
.panel.open { transform: translateX(200px); }
```

### 反模式 2：`backdrop-filter` 濫用

```bash
grep -nE "backdrop-filter|filter:\s*blur" styles/globals.scss styles/dashboard.module.scss
```

```
styles/globals.scss:400           filter: blur(0.5px);
styles/globals.scss:863           backdrop-filter: blur(10px);
styles/globals.scss:957           backdrop-filter: blur(10px);
styles/dashboard.module.scss:26   backdrop-filter: blur(16px) saturate(1.25);
styles/dashboard.module.scss:27   -webkit-backdrop-filter: blur(16px) saturate(1.25);
```

毛玻璃（glassmorphism）很好看，但 `backdrop-filter` 要求 GPU **每一幀把底下的畫面重新採樣再模糊一次**。

- 桌機獨顯：看不太出來
- 中低階手機：滑動時明顯掉幀
- `blur(16px) saturate(1.25)` 疊兩個濾鏡，成本再翻倍

**修法**：
- 只在靜態、不隨滑動變化的元素上用（例如固定的 navbar）
- 加 `will-change: backdrop-filter` 讓瀏覽器提前建圖層（但**不要濫用**，每個圖層都吃記憶體）
- 低階裝置用 `@media (prefers-reduced-motion)` 或直接降級成半透明純色

### 反模式 3：Layout Thrashing（JS 側，但成因是 CSS）

```js
// 壞：讀 → 寫 → 讀 → 寫，每次「讀」都強迫瀏覽器同步 reflow
elements.forEach(el => {
  const h = el.offsetHeight      // 讀（強制 reflow）
  el.style.height = h * 2 + 'px' // 寫（弄髒 layout）
})

// 好：先全部讀完，再全部寫
const heights = elements.map(el => el.offsetHeight)   // 全部讀
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2 + 'px'             // 全部寫
})
```

會觸發強制同步 reflow 的屬性：`offsetTop/Left/Width/Height`、`scrollTop`、`getComputedStyle()`、`getBoundingClientRect()`。

---

## 怎麼分辨自己遇到哪一種

### DevTools → Performance 錄一段

| 你看到 | 代表 |
|---|---|
| 時間軸開頭一大段紫色 `Parse Stylesheet` / `Recalculate Style`，位置在 **FCP 標記之前** | 第一種：阻塞首屏 |
| 滑動時出現連續紅色三角形（Long Task），展開看到 `Layout` / `Paint` 反覆出現 | 第二種：執行期 jank |

### DevTools → Network

CSS 依大小排序，勾出 **Blocking** 欄位，render-blocking 的資源會被標出來。

### DevTools → Rendering 面板（好用但少人知道）

- **Paint flashing** — 重繪的區域會閃綠色。滑動時整頁狂閃綠 = 重繪範圍太大
- **Layout Shift Regions** — 藍色標出版面位移（CLS 元兇）
- **Frame Rendering Stats** — 即時 FPS 疊圖

### 命令列快速自檢

```bash
# render-blocking CSS 有多大？
grep -o '<link rel="stylesheet" href="[^"]*"' .next/server/app/<route>.html
ls -lS .next/static/css/

# 有沒有藏外部 @import？
grep -o '@import url([^)]*)' .next/static/css/*.css

# 有多少 transition: all？
grep -ohE "transition:[^;]*" styles/*.scss | grep -c "all"

# 有多少昂貴濾鏡？
grep -cE "backdrop-filter|filter:\s*blur" styles/*.scss
```

---

## 優先順序建議

1. **先修阻塞首屏** —— 影響 FCP/LCP，是使用者最有感、也是 Lighthouse 分數的大頭
2. **再修執行期 jank** —— 屬於體感優化，改善 INP 分數

因為「白畫面 5 秒」比「動畫有點頓」嚴重得多。
