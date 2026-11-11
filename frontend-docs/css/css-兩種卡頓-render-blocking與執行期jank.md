# CSS 的兩種「卡頓」：阻塞首屏 vs 執行期 Jank

> 問題來源：診斷 `next-one-main` 的 `/dashboard` FCP 5.24s 時延伸出的疑問「css 也會卡頓嗎？」
> 日期：2026-09-16（2026-10-25 補充「毛玻璃加無限動畫」的成本比較與專案實例）
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

#### 為什麼「毛玻璃 + 無限動畫」比多寫幾行 background 貴得多

先講成本差在哪裡：

| | 多寫幾行 `background`                          | `backdrop-filter: blur()` | `animation: ... infinite` |
| ------ | ------------------------------------------ | ------------------------- | ------------------------- |
| 成本花在哪 | 多幾十個位元組的 CSS 文字，gzip(是HTTP的壓縮編碼方式。) 後幾乎不增加 | 每次繪製都要取樣「元素背後」的像素再模糊 | 沒有結束條件，只要元素存在就一直在算 |
| 什麼時候付 | 載入時付一次                                     | 每一次背後畫面改變就付一次 | 每一幀都付 |
| 跟什麼成正比 | 字元數                                        | 模糊面積與半徑 | 元素數量與動畫的屬性種類 |

三件事疊在一起就是最壞情況：

1. **`transform` 動畫本身很便宜**。因為 `transform` 與 `opacity` 是目前僅靠合成器（compositor）就能處理的屬性，不必重排（Layout）也不必重繪（Paint），見 web.dev 的說明。
2. **但元素一旦帶 `backdrop-filter`，它就不再只是「搬一張貼圖」**。它的畫面取決於背後有什麼，元素一移動，背後那塊就換了，模糊要重做。實務回報（見來源 3）是濾鏡會每一幀重算。這一點是社群與實測的經驗，不是瀏覽器廠商文件的保證，我沒有找到官方文件直接寫出每一幀的成本。
3. **`infinite` 讓這件事永遠不停**。沒有結束點，只要元素在頁面上就持續動。

##### 我的專案裡的實例（`next-one-main/app/intro/intro.module.scss`）

| 選擇器 | 寫法 | 數量 | 風險 |
|---|---|---|---|
| `.floatingCard` | `backdrop-filter: blur(10px)` 加 `animation: float 6s ease-in-out infinite` | 4 張 | 最高：會動的毛玻璃，而且永遠不停 |
| `.pricingCard` | `backdrop-filter: blur(10px)` 加 `transition: all 0.3s ease` | 3 張 | 中：靜態，但 hover 時 `transform` 與 `background` 一起變 |
| `.adCard` | `backdrop-filter: blur(4px)` | 1 張 | 低：半徑小而且不動 |
| `.solutionBox` | `animation: pulse 2s infinite`（`transform: scale`） | 1 個 | 低：沒有濾鏡，只動 `transform` |

##### 具體修法（由便宜到貴）

1. **先量再改**：把 `.floatingCard` 的 `backdrop-filter` 暫時註解掉，用 DevTools 的 Performance 錄 5 秒，看 Paint 與 Composite 的時間差多少。有差再改，沒差就不用動。
2. **會動的元素不要同時帶 `backdrop-filter`**：把模糊放在「不動的外層」，裡面的內容才動，或乾脆把動的卡片改成半透明純色。
3. **縮小半徑與面積**：成本隨模糊半徑與被模糊的面積成長，`blur(4px)` 比 `blur(10px)` 便宜。
4. **用 `animation-play-state` 在看不到時暫停**：`animation-play-state: paused` 會讓動畫停在目前位置，改回 `running` 時從原位置繼續，不會從頭開始。可以配合 `IntersectionObserver`，元素離開畫面就切成 `paused`。這是我的建議作法，我沒有找到官方文件直接寫「離開畫面時應該暫停」。
5. **尊重使用者偏好**：用 `@media (prefers-reduced-motion: reduce) { .floatingCard { animation: none } }` 關掉無限動畫。注意 `reduce` 的意思是減少非必要動態，不是把所有動畫都砍掉。
6. **不要為了省效能亂加 `will-change`**：每多一個圖層就多吃記憶體，低階裝置上代價可能比好處大，見 web.dev 的說明。

##### 一個容易誤判的地方：backdrop root

`backdrop-filter` 只模糊到「最近的 backdrop root」為止。父元素只要有 `opacity` 小於 1、`filter`、`mask`、`clip-path`、`mix-blend-mode` 或對應的 `will-change`，就會變成 backdrop root，子元素的毛玻璃就只模糊父元素裡面的內容，看起來像「`backdrop-filter` 沒有效果」（見來源 2）。

這跟本專案的關聯：`.pricingCard` 有 `animation: fadeInUp`，動畫過程中 `opacity` 小於 1，如果把毛玻璃移到它的子元素，載入動畫期間就可能看不到模糊。

##### 來源

1. web.dev，[Stick to Compositor-Only Properties and Manage Layer Count](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)，作者 Paul Lewis，最後更新 2015-03-20。內容是「只有 transform 與 opacity 僅靠合成器處理」以及「每個圖層都吃記憶體」。
2. MDN，[backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)，頁面標示最後修改 2026-04-20，Baseline 2024（2024 年 9 月起在最新瀏覽器可用）。內容是 backdrop root 的定義。這一頁沒有討論效能。
3. W3C public-css 郵件列表，[L3P3 的回報](https://lists.w3.org/Archives/Public/public-css-archive/2020May/0312.html)，2020 年 5 月。內容是「模糊濾鏡在轉場期間每一幀重算導致卡頓」。這是使用者回報，不是規格或廠商文件。
4. MDN，[animation-play-state](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-play-state)，頁面標示最後修改 2026-07-26。內容是 `paused` 會從暫停位置繼續。
5. Flutter 的 [#27677 基準測試](https://flutter.googlesource.com/mirrors/flutter/+/f83fd9d4673cece4647bfb4919d956fb5709ec92%5E%21/)：低階 Android 上「不模糊」約 216 fps，「模糊整組」約 22.9 fps。這是 Flutter 的渲染器不是瀏覽器，只能當作「模糊成本會隨面積與數量急遽上升」的旁證。

> **還沒查證的地方**：我沒有找到瀏覽器廠商（Chrome 或 Firefox）的官方文件，直接量化 `backdrop-filter` 每一幀的成本。上面第 2 點的說法來自來源 3 的回報加上合成器原理的推論，要確認請自己在 DevTools Performance 實測。

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

### 反模式 4：全視窗的裝飾偽元素加 `infinite` 動畫（本專案 `legal.module.scss`，issue #10）

```scss
.legalPage::before {
  content: ''; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: radial-gradient(...), radial-gradient(...), radial-gradient(...); /* 藍10% 綠10% 紫5% */
  z-index: 1; pointer-events: none;
  animation: backgroundFloat 25s ease-in-out infinite;  /* transform + opacity，永遠重複 */
}
```

| 問題 | 結果 | 依據 |
|---|---|---|
| 刪除前後的 LCP | 1.12 s 降到 0.73 s（差 0.39 s，約 35%） | issue #10 兩張 DevTools Local metrics 截圖；單次本機量測 |
| 肉眼差異 | 不透明度只有 5% 到 10%，前後截圖幾乎一樣 | 看截圖 |
| `infinite` 是主因嗎 | 不是，是放大器。它只決定「重複幾次」，成本由「動什麼、多大」決定；永遠不停代表閒置時也每幀更新 | MDN `animation-iteration-count` 只寫「永遠重複」，沒談效能；其餘是推論，沒量測 |
| LCP 為什麼降 | 較可能是全視窗圖層與漸層的首次繪製，`infinite` 的影響在載入之後，不能直接歸因給它 | 推論 |
| `pointer-events: none` 能省成本嗎 | 不能。它只管滑鼠點擊會不會被擋，和有沒有被畫出來無關 | MDN 屬性語意 |
| `z-index` 比卡片低能省成本嗎 | 不能。只決定疊放順序；被蓋住仍要畫、要合成。卡片背景透明或半透明時漸層還會透出來 | 推論 |
| 刪掉 `animation` 後 `@keyframes` 會自動消失嗎 | 不會，要手動刪 | 實測：`next dev` 產出與 Next 內建 `cssnano-simple` 都保留未使用的 `@keyframes`，見 [[css-建構期-Sass編譯-PostCSS-Autoprefixer-CSS-Modules雜湊]] 第五節 p |

- **判斷標準**：沒有功能的裝飾圖層，成本是「每次載入加每一幀」，而肉眼看不出效果，就該刪。
- **還沒做**：用 DevTools Performance 錄 10 秒不操作的頁面，比較有無動畫的影格數與 GPU 時間，確認「閒置仍每幀更新」這個推論。

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
