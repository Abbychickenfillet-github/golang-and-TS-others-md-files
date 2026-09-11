---
title: "CSS 自訂屬性（Custom Properties）：--bg 是什麼、var() 怎麼讀"
type: topic-note
tags: [css, custom-properties, css-variables, var, theming, dark-mode]
related:
  - "[[前端開發工具-打包編譯Lint與Parser]]"
updated: 2026-09-09
---

# CSS 自訂屬性（`--bg` 與 `var()`）

> 你在 widget 看到的 `background: var(--bg)` 就是這個機制。**先單獨這一篇**；之後要跟其他 CSS 語法整合再另寫整合篇。
>
> **本篇重點 (a)–(f)，共 6 個**（並排、無先後，用字母）。

---

## (a) `--bg` 是「CSS 自訂屬性（Custom Property）」，俗稱「CSS 變數」

**任何以兩個連字號 `--` 開頭的名字**（`--bg`、`--text`、`--accent`）都是一個 CSS 自訂屬性。**你宣告它、存一個值進去，之後用 `var()` 讀出來。** 名字大小寫敏感（`--bg` ≠ `--BG`）。

```css
:root {              /* 通常宣告在 :root（＝ <html>），讓全站都讀得到 */
  --bg: #0f1420;
  --text: #e8edf6;
}
body {
  background: var(--bg);   /* 讀 --bg → #0f1420 */
  color: var(--text);      /* 讀 --text → #e8edf6 */
}
```

## (b) 兩個動作分清楚：**宣告**（`--bg: 值`）vs **讀取**（`var(--bg)`）

| 動作 | 語法 | 意思 |
|---|---|---|
| 宣告/賦值 | `--bg: #0f1420;` | 把值存進這個自訂屬性（左邊 `--bg` 是名字、右邊是值） |
| 讀取/使用 | `var(--bg)` | 把 `--bg` 的值取出來，放在某個屬性的值的位置 |

**主詞動詞受詞**：`:root` **宣告** `--bg`；`body` **用 `var()` 讀** `--bg` 當背景色。

## (c) `var()` 可以給「後備值（fallback）」

`var(--bg, white)`：**如果 `--bg` 沒被宣告（或無效），就用逗號後面的 `white`**。避免變數漏設時整個屬性失效。

```css
color: var(--text, #333);   /* --text 沒設就用 #333 */
```

## (d) 它會「繼承」而且「跟著層疊（cascade）」——所以能做主題/暗色模式

自訂屬性**會沿 DOM 往下繼承**：在哪個元素宣告，它自己和**子孫**都讀得到；在 `:root` 宣告就是全站可讀。**在子層重新宣告可覆蓋上層**，這就是暗色模式的原理：

```css
:root        { --bg: white; --text: black; }   /* 預設亮色 */
.dark        { --bg: #0f1420; --text: #e8edf6; }/* 加 class 就整片變暗 */
```

只要在最外層 `<body class="dark">` 切一個 class，底下所有用 `var(--bg)` 的元素**自動**換色，不用逐個改。

## (e) 跟 Sass/Less 的 `$變數` 差在哪：**runtime vs build-time**

| | CSS 自訂屬性 `--bg` | Sass/Less 變數 `$bg` |
|---|---|---|
| 何時存在 | **runtime**（活在瀏覽器、可被 JS 改、可即時切換） | **build-time**（編譯成 CSS 後就消失，是死值） |
| 誰處理 | 瀏覽器 CSS 引擎 | Sass/Less 編譯器（build 時） |
| 能否動態改 | 能（`document.documentElement.style.setProperty('--bg', 'red')`） | 不能（編譯完就固定） |
| 會不會繼承/層疊 | 會 | 不會（純文字替換） |

一句話：**`--bg` 是「活的、瀏覽器端的變數」；Sass `$bg` 是「build 時就被替換掉的死值」。** 這也是為什麼主題切換、暗色模式一定用 `--bg` 這種 CSS 自訂屬性，不用 Sass 變數。

## (f) 用 JS 讀寫（做主題切換就靠這個）

```js
// 讀
getComputedStyle(document.documentElement).getPropertyValue('--bg');
// 寫（即時整片換色）
document.documentElement.style.setProperty('--bg', '#123');
```

---

## 相關筆記
- [[前端開發工具-打包編譯Lint與Parser]] —— Sass/Less 這類「build-time 才處理」的工具屬於打包/轉譯階段

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| CSS 自訂屬性（Custom Properties／CSS variables） | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties | MDN，2026-09-09 查 |
| `var()` 函式與 fallback | https://developer.mozilla.org/en-US/docs/Web/CSS/var | MDN，2026-09-09 查 |
| `--*`（自訂屬性語法） | https://developer.mozilla.org/en-US/docs/Web/CSS/--* | MDN，2026-09-09 查 |
