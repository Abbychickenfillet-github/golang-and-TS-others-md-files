---
title: OOCSS vs BEM（CSS 命名方法論）
type: topic-note
source: Gemini
tags:
  - gemini
  - css
  - oocss
  - bem
  - 方法論
  - 前端
  - 面試
  - "#modular"
  - "#scalable"
sources:
  - https://gemini.google.com/app/ca1ec9bb98e5fd41
updated: 2026-06-30
---
# OOCSS vs BEM（CSS 命名方法論）

## 重點整理

兩者都是讓 CSS <mark style="background: #FFF3A3A6;">模組化、可重複利用、好維護</mark>的方法論，目的都只有兩個：<mark style="background: #FF5582A6;">讓 CSS 檔案變小</mark>（好重複利用）、讓程式碼好維護（不會改 A 壞 B 避免強烈耦合）。
[[https://share.gemini.google/KWRkJLUZ1AoY]]
<mark style="background: #BBFABBA6;">它們不是敵對，而是可以搭配的「內功心法」與「招式套路」。</mark>

### OOCSS（Object-Oriented CSS）用了skin這個字眼

核心思想：<mark style="background: #FFF3A3A6;">結構（Structure）與外觀（Skin）分離</mark>，把元件當成獨立「物件」，像樂高積木一樣自由組合。#modular #scalable

```css
/* 結構 Structure：大小、邊距、字體 */
.btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
/* 外觀 Skin：只負責顏色、背景 */
.primary-skin   { background-color: blue; color: white; }
.secondary-skin { background-color: gray; color: white; }
```

```html
<button class="btn primary-skin">主按鈕</button>
<button class="btn secondary-skin">次要按鈕</button>
```

- <mark style="background: #BBFABBA6;">優點：重複利用性極高</mark>（卡片想用同藍色，直接套 `.primary-skin`）。
- <mark style="background: #FF5582A6;">缺點：HTML class 變很長，難一眼看出 class 寫給誰用</mark>；不同人實作差異大。

### BEM（Block、Element、Modifier）[https://bem.info/en/methodology/quick-start/]

核心思想：<mark style="background: #FFF3A3A6;">嚴格的命名規範</mark>，讓結構一目了然。

- <mark style="background: #ADCCFFA6;">B（Block）</mark>：獨立區塊，例如 `btn`
- <mark style="background: #ADCCFFA6;">E（Element）</mark>：區塊內子元素，用 `__` 連接（例如 `btn__icon`）
- <mark style="background: #ADCCFFA6;">M（Modifier）</mark>：狀態或變體，用 `--` 連接（例如 `btn--primary`）

```css
.btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
.btn--primary { background-color: blue; color: white; }
```

```html
<button class="btn btn--primary">主按鈕</button>
```

- <mark style="background: #BBFABBA6;">優點：命名嚴格有邏輯</mark>，看到 `btn--primary` 就知它依附在 `btn` 底下，不會誤用。
- <mark style="background: #FF5582A6;">缺點：名字常變很長</mark>（例如 `header__navigation-list--dark`）。

### 快速總結表

| 特性       | OOCSS                       | BEM                          |
| -------- | --------------------------- | ---------------------------- |
| 核心精神     | 樣式抽成「樂高積木」自由組合              | 用嚴格命名表達元件隸屬關係                |
| Class 命名 | 通常很短（`btn`, `primary-skin`） | 較長但清晰（`btn`, `btn--primary`） |
| 適用場景     | 減少 CSS 大小、重視重複利用            | 團隊協作、好維護、不易改壞別人              |

### 混血（Hybrid）實務作法

很多前端會結合兩者：用 <mark style="background: #BBFABBA6;">OOCSS 的「心法」（結構/外觀分離）+ BEM 的「規範」（命名）</mark>。把 OOCSS 的外觀（Skin）用 BEM 的 Modifier（`--`）命名：

```css
/* 結構（OOCSS 結構 + BEM Block 命名） */
.box { padding: 20px; border-radius: 8px; display: flex; }
/* 外觀（OOCSS 外觀 + BEM Modifier 命名）：獨立存在、可自由組合 */
.theme--light   { background: #fff; }
.theme--warning { background: #ffd; }
```
```html
<div class="box theme--warning">…</div>
```

# BEM避免多層巢狀元素
命名公式：Block__Element--Modifier
但是當單一個Element的元素嵌套太多之後，就會將Element獨立出來。絕不允許出現Block__Element__SubElement這種結構。或者一直用雙底線串下去，命名會變.product__nav__nav-list__nav-item__link--active
- 名字會長到無法閱讀
- 但是如果元素位子要改變。e.g. 將nav-item 搬到Header裡面用，因為名字綁死了.product，就必須重寫一遍CSS。
## <mark style="background: #FFB8EBA6;"> 解決方案：把子元素獨立升格為新區塊Block</mark>
- 可避免強烈耦合(乾淨)
	- product, product-nav
	- 若別的頁面也需要這個檔覽列，直接把整段HTML複製過去，樣式也完全不會壞掉。<- 真的嗎
- 由Russian網路巨頭Yandex開發出來的。Yandex當年的野心非常大，不只把BEM當作CSS的命名規範，還開發了一整套完整的開發框架
### 重要延伸

- React 開發中，<mark style="background: #D2B3FFA6;">BEM 精神（或 CSS Modules）更常被使用</mark>，因為能確保樣式不互相污染。
- <mark style="background: #FFB8EBA6;">Utility-First（如 Tailwind CSS）</mark>本質上是把 OOCSS「結構與外觀分離、極大化重複利用」發揮到極致的演變。
- 釐清：<mark style="background: #FF5582A6;">React 組件 ≠ OOCSS</mark>。React 組件是「拆 UI 成可重用部件」；OOCSS 是「寫 CSS 的方法論」。可在 React 組件內套用 OOCSS / BEM 來組織樣式。
考量CSS的程式碼量

## 各對話來源

### OOCSS vs. BEM Comparison（2026-06）— https://gemini.google.com/app/ca1ec9bb98e5fd41

（對話以語音輸入提問，Abby 並上傳了一張「比較 OOCSS 與 BEM 的書本照片」。）

**使用者：** （上傳書本照片）OOCSS

**Gemini：** 從照片看到這本書在比較 OOCSS 與 BEM。書中提到 OOCSS 概念好但實作因人而異；BEM 標準明確、團隊較易維持一致。

**使用者：** CSS是什么？

**Gemini：** CSS = Cascading Style Sheets，用來為網頁元素設定樣式的語言。

**使用者：** OOCSS（OOCSS 是什麼）

**Gemini：** Object-Oriented CSS。核心原則：把物件的「結構」與「外觀（skin）」分離，讓同一設計能套用到不同元素而不必重寫。
>是像物件是一組CLASS而外觀

**使用者：** React的组件是OO CSS吗？

**Gemini：** 不是。React 組件是「把 UI 拆成可重用部件」；OOCSS 是「寫 CSS 的方法論」。但可在組件內套用 OOCSS / BEM 來組織樣式。

**使用者：** 給我 example of OOCSS 還有 BEM

**Gemini：** （以按鈕為例給出 OOCSS（結構 `.btn` + 外觀 `.primary-skin`）與 BEM（`.btn` + `.btn--primary`）程式碼、優缺點與總結表。整合於上方。）

**使用者：** BEM 跟 OOCSS 並非敵對的對吧？

**Gemini：** 對。兩者可混血搭配（OOCSS 心法 + BEM 命名）；現代 React 多用 BEM 精神或 CSS Modules；Tailwind 的 Utility-First 也是 OOCSS 思想的演變。整合於上方。
