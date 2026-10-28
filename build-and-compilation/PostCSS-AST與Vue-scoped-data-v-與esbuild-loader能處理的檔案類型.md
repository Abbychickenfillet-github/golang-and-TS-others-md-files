---
title: PostCSS 是什麼（AST、前綴、data-v-xxxx）與 esbuild-loader 能處理哪些檔案
type: topic-note
tags:
  - postcss
  - ast
  - autoprefixer
  - vue-scoped-css
  - webpack-loader
  - esbuild-loader
related:
  - "[[css-建構期-Sass編譯-PostCSS-Autoprefixer-CSS-Modules雜湊]]"
  - "[[03-前端開發工具-【打包buildtime】轉譯Lint與Parser-]]"
updated: 2026-10-28
---

## 一、PostCSS 是什麼

官方自述：**「A tool for transforming CSS with JavaScript.」**

| 步驟 | 發生什麼 |
|---|---|
| ① parse | `postcss.parse()` 把 CSS 文字讀成 **AST**，回傳 `Root` 節點 |
| ② 走訪 | plugin 用 `walkRules`、`walkDecls` 走過每個節點，改節點 |
| ③ stringify | 把改完的 AST 輸出成 CSS 文字 |

### 「CSS 怎麼變成 JS 物件結構」

- AST 是**用 JS 物件表示的 CSS 結構**，**不是 CSS 本身**。類比：DOM 是 HTML 的物件表示。
- 節點類型：`Root`、`AtRule`、`Rule`、`Declaration`、`Comment`。
- 例：`.title{color:red}` 變成一個 `Rule`（`selector` 是 `.title`），底下有一個 `Declaration`（`prop` 是 `color`、`value` 是 `red`）。
- 變成物件後，程式才能「找到 `.title` 這條規則」並改它的 selector。

### PostCSS 是前綴還是後綴？都不是

PostCSS 只是**引擎**，加什麼由 **plugin** 決定。

| 東西 | 角色 | 做什麼 |
|---|---|---|
| PostCSS | 引擎 | parse → 交給 plugin → stringify |
| Autoprefixer（plugin） | 加**前綴** | 依 Can I Use 資料，加 vendor prefix，如 `-webkit-` |
| Vue scoped 的 plugin | 加**後綴** | 在選擇器後面加 `[data-v-xxxx]` |
| `postcss-loader` | webpack 與 PostCSS 的橋 | 自己**不加**前綴；貼文說「postcss-loader 加前綴」是簡化講法，實際加的是 autoprefixer |

### `[data-v-xxxx]` 是什麼

Vue `<style scoped>` 的機制（Vue 官方文件）：

```vue
<style scoped>.example { color: red; }</style>
<template><div class="example">hi</div></template>
```

編譯後：

```vue
<style>.example[data-v-f3f3eg9] { color: red; }</style>
<template><div class="example" data-v-f3f3eg9>hi</div></template>
```

- `data-v-f3f3eg9` 是 HTML 的**自訂 data 屬性**；`[data-v-f3f3eg9]` 是 CSS 的**屬性選擇器**。
- 同一個元件的 template 元素與 CSS 選擇器用**同一個雜湊**，雜湊每個元件不同，所以樣式只套到該元件。
- 這一步是 PostCSS 改 AST 做的：找到 Rule、在 selector 後面接上屬性選擇器。

## 二、loader：串接 vs 替代

| 關係 | 例 | 說明 |
|---|---|---|
| 串接（合作） | `style-loader` ← `css-loader` ← `postcss-loader` | 由右到左，各做一步 |
| 替代（同職位） | `babel-loader`、`ts-loader`、`swc-loader`、`esbuild-loader` | 轉譯 JS／TS 的工具，通常只選一個 |

## 三、esbuild-loader 能處理哪些檔案？

| 問題 | 答案（依 esbuild-loader README） |
|---|---|
| 一個 loader 一次吃全部檔案類型？ | **不是。** 每個檔案類型要寫一條 webpack rule，用 `test` 指定，例如 `/\.[jt]sx?$/` |
| 支援的類型 | `loader` 選項可為 `js`、`jsx`、`ts`、`tsx`、`css`、`json`、`text`、`base64`、`file`、`dataurl`、`binary`、`default`；沒設就**依副檔名自動判斷** |
| TS／JSX | 真正的轉譯 |
| CSS | 只做**最小化**（`EsbuildPlugin` 設 `css: true`，或 rule 的 `minify`）。範例仍保留 `style-loader`、`css-loader` |
| `@import`／`url()` 解析 | README 沒寫；範例保留 `css-loader`，**推論**仍由它負責 |
| 型別檢查 | **不做**。README：esbuild does not type check；要用 `tsc --noEmit` 或 `fork-ts-checker-webpack-plugin` |
| 與 babel／ts-loader 並用 | README 建議換用時**移除**原本的 babel-loader、ts-loader |

## 資料來源（2026-10-28 查證）

| 內容 | 來源 |
|---|---|
| PostCSS 自述、Autoprefixer 說明 | https://postcss.org/ |
| `parse()`、Root、節點類型、`walkRules`／`walkDecls` | https://postcss.org/api/ |
| scoped CSS 與 `data-v-xxxx` | https://vuejs.org/api/sfc-css-features.html |
| esbuild-loader 檔案類型、CSS、型別檢查 | https://github.com/privatenumber/esbuild-loader |
