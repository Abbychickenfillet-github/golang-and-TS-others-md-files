---
title: Markdown 渲染為 DOM 的過程（Runtime vs Build-time）
type: topic-note
source: Gemini
tags: [gemini, frontend, markdown, dom, marked-js, ssg, web-platform]
sources:
  - https://gemini.google.com/app/e2b23f09e5b753b9
updated: 2026-06-27
quiz: Markdown-渲染為DOM的過程.html
---

# Markdown 渲染為 DOM 的過程（Runtime vs Build-time）

## 重點整理

### 核心觀念：Markdown 不能「直接」被渲染成 DOM

瀏覽器原生只看得懂 <mark style="background: #ADCCFFA6;">HTML、CSS、JavaScript</mark> 三種東西。把一個 `.md` 檔案直接丟進瀏覽器，它<mark style="background: #FF5582A6;">只會當成純文字（Plain Text）顯示</mark>，**不會**自動把 `#` 變成 `<h1>`、把 `**字**` 變成 `<strong>`。

所以一定要經過一個<mark style="background: #FFF3A3A6;">「轉換」步驟</mark>，先把 Markdown 變成 HTML 字串，瀏覽器才能解析成 DOM。

### 兩種轉換做法

| 做法 | 何時轉換 | 代表工具 | 特點 |
| --- | --- | --- | --- |
| <mark style="background: #ADCCFFA6;">前端即時轉換 (Runtime)</mark> | 瀏覽器執行時 | marked.js | 動態、彈性，但要在用戶端跑 JS |
| <mark style="background: #ADCCFFA6;">靜態預編譯 (Build-time)</mark> | 專案打包時 | Next.js / Gatsby / Astro | 使用者下載到的已是現成 DOM，最快 |

### 做法一：前端即時轉換（Runtime）

利用 JavaScript 在瀏覽器執行時動態把 Markdown 轉成 HTML，再塞進 DOM：

```js
// 使用 marked.js 範例
import { marked } from 'marked';

const markdownString = "# 這是標題";
// 1. 轉成 HTML 字串
const htmlString = marked.parse(markdownString);
// 2. 塞進 DOM，瀏覽器才會渲染
document.getElementById('content').innerHTML = htmlString;
```

關鍵兩步：<mark style="background: #FFF3A3A6;">`marked.parse()` 轉成 HTML 字串</mark> →（再）<mark style="background: #FFF3A3A6;">用 `innerHTML` 塞進 DOM</mark>。

> [!warning] 安全提醒
> 用 `innerHTML` 注入由 Markdown 轉出的 HTML，若來源不可信會有 <mark style="background: #FF5582A6;">XSS 風險</mark>，正式專案通常會搭配 DOMPurify 之類的工具先做淨化（sanitize）。

### 做法二：靜態預編譯（Build-time）

現代部落格框架（Next.js、Gatsby、Astro）最常用。在專案<mark style="background: #FFF3A3A6;">打包（Build）的時候</mark>，系統就先把所有 `.md` 檔案轉成 `.html`。使用者瀏覽時下載到的<mark style="background: #BBFABBA6;">已經是現成的 DOM 結構</mark>，不需要在瀏覽器再跑轉換，載入更快、對 SEO 更友善。

> [!note] 分類交界
> 本筆記放在 **web-platform**（因為核心在講「瀏覽器執行期怎麼把內容渲染成 DOM」）。但上面這段「做法二：Build-time 靜態預編譯」其實跨到了建置/編譯領域，延伸閱讀見 [[前端開發工具-打包編譯Lint與Parser]] 與 `build-and-compilation/`。

## 各對話來源
### Markdown 渲染 DOM 的過程（2026-06）— https://gemini.google.com/app/e2b23f09e5b753b9

**使用者：** Markdown 可以直接跟其他 html 檔案一樣被渲染成 DOM 嗎

**Gemini：** 簡短的答案是：不行，Markdown 不能直接像 HTML 一樣被瀏覽器渲染成 DOM。瀏覽器原生只看得懂 HTML、CSS 和 JavaScript。當你把一個 `.md` 檔案丟進瀏覽器時，它通常只會把它當成純文字（Plain Text）顯示，而不會自動幫你把 `#` 變成 `<h1>`，或是把 `**字**` 變成 `<strong>`。不過，可以透過一個「轉換」的過程，讓 Markdown 變成 DOM。

現代前端的做法有兩種：

1. **前端即時轉換 (Runtime)** — 利用 JavaScript 在瀏覽器執行時動態轉換（例如 marked.js）：先 `marked.parse()` 轉成 HTML 字串，再用 `innerHTML` 塞進 DOM，瀏覽器才會渲染。

2. **靜態預編譯 (Build-time)** — 現代部落格（如 Next.js, Gatsby, Astro）最常用。在專案打包（Build）的時候，系統就已經先把 `.md` 檔案全部轉成 `.html` 檔案了，使用者下載到瀏覽器時，已經是現成的 DOM 結構。
