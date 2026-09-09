---
title: Vue SFC 實務 — styles 資料夾與 scoped 編譯原理、lang 與 src 屬性、CSS 預處理器、JSX 支援
type: topic-note
source: Gemini
tags: [gemini, vue, sfc, scoped, scss, sass, postcss, jsx, vite, css預處理器]
aliases: [Vue樣式架構, Vue scoped原理, Vue JSX]
related:
  - "[[00-ref與reactive-響應式的兩種實作]]"
  - "[[Proxy與Reflect-13個攔截器與框架響應式原理]]"
  - "[[瀏覽器相容性-Polyfill補API-Babel降語法-Browserslist一次設定全家套用]]"
  - "[[element-style動態設定-vs-className-切換]]"
sources:
  - https://gemini.google.com/app/7a7b2d9a3778cf0e
  - https://gemini.google.com/app/cfb51eb32772c1c5
updated: 2026-09-05
---

# Vue SFC 實務 — styles 資料夾與 scoped 編譯原理、lang 與 src 屬性、CSS 預處理器、JSX 支援

> [!info]- 🔗 與既有筆記的關聯
> (1) 兩串 Gemini 對話都在問「Vue 單檔元件（SFC）到底怎麼寫」，一串問樣式、一串問 JSX，合併成一篇 SFC 實務筆記，避免 vue 資料夾散成一堆小檔。
> (2) [[element-style動態設定-vs-className-切換]] 講原生 DOM 的 inline style 與 className 取捨，本篇第二節「scoped 不是 inline style」正好是同一組概念在 Vue 編譯器層的答案，兩篇互為對照。
> (3) 第四節的 `@vitejs/plugin-vue-jsx` 走的是 Babel 轉譯，跟 [[瀏覽器相容性-Polyfill補API-Babel降語法-Browserslist一次設定全家套用]] 是同一套 toolchain。
> (4) [[00-ref與reactive-響應式的兩種實作]] 是 vue 資料夾裡的既有筆記，本篇 JSX 範例用到 `ref`，可以互相對照。

> 本篇重點 a–q，共 17 個。

## 重點整理

### 一、Vue 專案的 styles 資料夾放什麼（a–c）

(a) <mark style="background: #FFF3A3A6;">會有 `src/styles` 或 `src/assets/styles` 資料夾，但它放的是「全域樣式」，不是每個元件的樣式</mark>。

(b) <mark style="background: #ADCCFFA6;">典型內容</mark>：`reset.css` / `normalize.css`（清除瀏覽器預設）、`variables.scss` / `theme.css`（顏色、字體尺寸變數）、`global.css`（全域通用排版）。

(c) <mark style="background: #BBFABBA6;">全域檔在 `main.js` 一次性載入</mark>（例如 `import './assets/styles/global.css'`），整個專案生效，不必在每個 `.vue` 重複 import。元件要用共用變數時才在元件內 `@use`。

```scss
<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.card {
  color: $primary-color;
}
</style>
```

### 二、`<style scoped>` 不是 inline style（d–h）

(d) <mark style="background: #FF5582A6;">`<style scoped>` 完全不是 inline style</mark>。它編譯出來的本質是傳統的 CSS 類別選擇器，只是 Vue 編譯器在背後自動加了防衝突的屬性選擇器。

(e) <mark style="background: #ADCCFFA6;">編譯器做兩件事</mark>：

```html
<!-- 你寫的 -->
<template><button class="btn">按鈕</button></template>
<style scoped>
.btn { color: red; }
</style>

<!-- 編譯後：標籤被加上唯一的 hash 屬性 -->
<button class="btn" data-v-7ba5bd90>按鈕</button>

<!-- CSS 被改寫成帶屬性的限定選擇器 -->
.btn[data-v-7ba5bd90] { color: red; }
```

(f) 這些 CSS 最後會被抽離成獨立的 `.css` 靜態檔，或注入到頁面的 `<head>`——<mark style="background: #FFF3A3A6;">所以瀏覽器能統一繪製與快取，這是它效能比 inline style 好的原因</mark>。

(g) <mark style="background: #FF5582A6;">Inline style 的三個缺點</mark>：權重極高（1000）很難被覆蓋、無法寫 `:hover` `:focus` 與 `@media` 與偽元素、每個標籤都要重複寫一次沒有重用性。

(h) 對照表：

| 特性 | Inline Style (`style="..."`) | `<style scoped>` |
| --- | --- | --- |
| 運作原理 | 直接寫在 DOM 屬性上 | 獨立 CSS 規則 ＋ 屬性選擇器 `[data-v-xxx]` |
| CSS 權重 | 極高（1000） | 一般類別權重（10 + 10 = 20） |
| 支援 `:hover` / 媒體查詢 | 不支援 | 完全支援 |
| 渲染效能 | 差（每個 DOM 都帶重複字串） | 佳（瀏覽器統一繪製與快取） |

### 三、lang、src、scoped 三個屬性各管什麼（i–k）

(i) <mark style="background: #ADCCFFA6;">`lang`（Language）＝告訴編譯器用哪種預處理器解析這個區塊</mark>。不寫預設就是 `css`。`<script lang="ts">` 也是同一個機制，只是換成 TypeScript。

(j) <mark style="background: #ADCCFFA6;">`src`（Source）＝從外部引入獨立檔案</mark>，就像 `<img src>` 或 `<script src>`。實務上極少用，因為它會破壞 SFC 高度內聚的優勢。

(k) 三者對照：

| 語法寫法 | 屬性名稱 | 作用說明 |
| --- | --- | --- |
| `<style lang="scss">` | lang | 指定程式語言／預處理器（CSS、SCSS、Less） |
| `<style src="./btn.css">` | src | 指定外部檔案路徑，把外部 CSS 載進來 |
| `<style scoped>` | scoped | 指定作用域隔離，樣式只作用於當前元件 |

### 四、CSS 預處理器是什麼（l–n）

(l) <mark style="background: #ADCCFFA6;">CSS 預處理器（CSS Preprocessor）是一種擴充工具，讓你用變數、巢狀、函式、邏輯運算來寫樣式，最後編譯成瀏覽器看得懂的標準 CSS</mark>。瀏覽器只認識原生 CSS，預處理器就是翻譯官。

(m) <mark style="background: #FFF3A3A6;">它解決三個痛點</mark>：顏色與尺寸重複複製貼上、選擇器結構冗長（要一直重寫父層 class）、樣式難以拆成小檔再組裝。

```scss
// 1. 巢狀結構（Nesting）
.nav {
  background: #333;
  a {
    color: white;
    &:hover { color: yellow; }
  }
}
// 編譯後：.nav{} .nav a{} .nav a:hover{}

// 2. 變數（Variables）
$primary-color: #42b983;
.button { background-color: $primary-color; }

// 3. Mixin（可重用的樣式組）
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
.card-header { @include flex-center; }
```

(n) <mark style="background: #FFB8EBA6;">現況趨勢</mark>：原生 CSS 已支援 CSS Variables（`--primary-color`）與 Nesting（巢狀），所以許多專案改用 PostCSS 這類「後處理器」（Tailwind CSS 背後的技術）取代傳統預處理器的部分功能。主流仍是 Sass / SCSS，Less 已較少見，Stylus 更少。

### 五、Vue 也可以用 JSX（o–q）

(o) <mark style="background: #BBFABBA6;">Vue 完全支援 JSX</mark>，最常見於 Vue 3 搭配 Vite，靠官方外掛 `@vitejs/plugin-vue-jsx` 實現。

```bash
npm install @vitejs/plugin-vue-jsx -D
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  plugins: [vue(), vueJsx()],
})
```

```jsx
// 副檔名改成 .jsx 或 .tsx，用 setup 函式撰寫
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'Counter',
  setup() {
    const count = ref(0)
    const inc = () => count.value++

    return () => (
      <div class="counter">
        <p>Count: {count.value}</p>
        <button onClick={inc}>+1</button>
      </div>
    )
  },
})
```

(p) <mark style="background: #FF5582A6;">跟 React JSX 最容易踩到的差異</mark>：Vue 的響應式值要寫 `{count.value}`（React 直接 `{count}`）；Vue JSX 支援 `v-model={text.value}`（React 要自己接 `value` 與 `onChange`）；<mark style="background: #FF5582A6;">大部分 `v-` 指令（`v-if`、`v-for`）在 JSX 裡不能用，要改寫成原生 JS 的三元運算與 `map`</mark>。

(q) <mark style="background: #D2B3FFA6;">取捨</mark>：JSX 的優點是靈活度極高、重構與抽象化方便、TypeScript 型別推導有時比 Template 更直覺，很適合寫 Table / Tree / Dialog 這種高度動態的元件庫；缺點是<mark style="background: #FF5582A6;">會失去 Vue Template 編譯器的靜態優化（Block Tree、靜態提升）</mark>，一般業務頁面沒必要換。

## ⚠️ 存疑／更正

- Gemini 的 Vue JSX 對照表把插槽寫成 `<MyComponent default: v-slots="{{"> ...`，<mark style="background: #FF5582A6;">這串語法是壞的、無法執行</mark>。正確寫法是把插槽當成物件傳給 `v-slots`：`<MyComponent v-slots={{ default: () => <p>Content</p> }} />`，或直接把函式當 children 傳。
- Gemini 說 scoped 的權重是「10 + 10 = 20」。<mark style="background: #FF5582A6;">CSS 權重不是相加的十進位數字</mark>，正確的表示是三元組 `(id, class, type)`：`.btn[data-v-xxx]` 是 `(0, 2, 0)`，inline style 則不在這個三元組裡、優先權更高（只有 `!important` 蓋得過）。用「20 對 1000」來比大小是教學簡化，不是規格。
- Gemini 說「Sass/SCSS 目前最主流」是對的，但沒提到 <mark style="background: #FF5582A6;">Sass 官方已宣布 `@import` 逐步淘汰、要改用 `@use` / `@forward`</mark>——所以上面範例刻意寫 `@use` 而不是舊教學常見的 `@import`。

## 各對話來源

### Vue 專案樣式架構與管理（2026-09）— https://gemini.google.com/app/7a7b2d9a3778cf0e

**使用者：** 你們寫 Vue 的話，會有一個資料夾叫做 style 嗎？然後在 single file component 裡面去 import？

**Gemini：** 通常會建立樣式資料夾（常見命名 `src/styles` 或 `src/assets/styles`），但主要用來存放全域樣式、CSS 變數與共用工具類，而非把每個元件的樣式單獨拆檔放進去。全域檔案（reset、variables、global）通常在 `main.js` 一次性載入。元件專屬樣式最常見是直接寫在 `.vue` 底部的 `<style scoped>`；若要用 styles 資料夾裡的變數或 Mixin，會在元件內 `@use '@/styles/variables.scss' as *`。透過 `src` 屬性引入外部檔案在實務上極少使用，因為會破壞 SFC 高度內聚的優勢。

**使用者：** 所以 `<style scoped>` 這個不算 inline style？

**Gemini：** 不是，完全不是 inline style。`<style scoped>` 編譯出來的本質是傳統的 CSS 類別選擇器，只是 Vue 的 SFC Compiler 在背後自動加了防衝突的屬性選擇器。編譯時會做兩件事：給 HTML 標籤加上唯一的 hash 屬性（`data-v-7ba5bd90`），並把 CSS 轉成 `.btn[data-v-7ba5bd90]` 這種限定選擇器，最後統一抽離成 `.css` 靜態檔或注入 `<head>`。Inline style 的缺點是權重極高難覆蓋、無法寫偽類與媒體查詢、沒有重用性。

**使用者：** `<style lang="css">` 這算 src 屬性嗎？

**Gemini：** 不算。`lang` 是「語言」屬性，用來告訴編譯器用哪種預處理器解析（`css` / `scss` / `sass` / `less` / `stylus`），`<script lang="ts">` 同理。`src` 是「來源」屬性，用來從外部引入檔案，像 `<img src>` 一樣；在 Vue SFC 中只有真的要把樣式拆成獨立檔案時才會用到 `<style scoped src="./MyButton.css"></style>`。

**使用者：** 預處理器是什麼？

**Gemini：** CSS 預處理器是一種擴充工具，讓你用變數、巢狀、函式、邏輯運算撰寫樣式，最後編譯成標準 CSS。瀏覽器只認識原生 CSS，預處理器就像翻譯官。它解決三個痛點：程式碼重複性高、選擇器結構冗長、模組化困難。常用功能是巢狀結構、變數與主題管理、Mixin。主流是 Sass / SCSS，Less 較少見，Stylus 更少。現今原生 CSS 已支援 CSS Variables 與 Nesting，因此許多人改搭配 PostCSS（Tailwind 背後的技術）取代部分功能。

### Vue 支援 JSX 語法指南（2026-09）— https://gemini.google.com/app/cfb51eb32772c1c5

**使用者：** Vue 也可以用 JSX 嗎？

**Gemini：** 可以，Vue 完全支援使用 JSX，最常見於 Vue 3 搭配 Vite 或 Vue CLI，透過官方 Babel/Vite 外掛實現。安裝 `@vitejs/plugin-vue-jsx -D`，在 `vite.config.js` 的 plugins 加上 `vueJsx()`，副檔名改成 `.jsx` 或 `.tsx`，用 `defineComponent` 的 `setup()` 回傳一個渲染函式。與 React JSX 的差異：資料綁定要 `{count.value}`、雙向綁定有 `v-model={text.value}`、插槽用 `v-slots`。優點是靈活性高、重構與抽象化方便、TS 型別推導直覺，適合 Table / Tree / Dialog 這種高度動態元件；缺點是失去 Vue Template 編譯器的靜態優化（Block Tree、靜態提升），且大部分 `v-` 指令無法使用。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| Vue 樣式架構對話 | https://gemini.google.com/app/7a7b2d9a3778cf0e | Gemini Flash，2026-09-05 |
| Vue JSX 對話 | https://gemini.google.com/app/cfb51eb32772c1c5 | Gemini Flash，2026-09-05 |
| Vue 3 官方 — SFC CSS Features（scoped 與 data-v hash） | https://vuejs.org/api/sfc-css-features.html | Vue 3 現行文件，2026-09-05 查證 |
| Vue 3 官方 — SFC Syntax Specification（lang / src 屬性） | https://vuejs.org/api/sfc-spec.html | Vue 3 現行文件，2026-09-05 查證 |
| Vue 3 官方 — Render Function & JSX（v-slots 正確寫法） | https://vuejs.org/guide/extras/render-function.html | Vue 3 現行文件，2026-09-05 查證 |
| @vitejs/plugin-vue-jsx | https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx | 現行版本，2026-09-05 查證 |
| Sass 官方 — @use 取代 @import | https://sass-lang.com/documentation/at-rules/use/ | Sass 現行文件，2026-09-05 查證 |
| MDN — CSS Specificity（三元組而非單一數字） | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity | MDN 現行版本，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
