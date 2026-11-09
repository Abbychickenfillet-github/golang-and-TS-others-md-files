---
title: Vue 編譯器如何藏在打包工具的外掛裡 — 與 Virtual DOM、批次更新（Batching）
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - vue
  - vite
  - virtual-dom
  - batching
  - transpile
sources:
  - https://gemini.google.com/app/ad2ceb1ba2d8e5b3
related:
  - "[[Vite-HMR機制與Rollup打包原理]]"
  - "[[setup-與-script-setup-深入解析]]"
updated: 2026-10-23
---

# Vue 編譯器如何藏在打包工具的外掛裡 — 與 Virtual DOM、批次更新（Batching）

本篇重點 a–h，共 8 個

> 關聯原因：[[Vite-HMR機制與Rollup打包原理]] 講打包工具的流程，本篇回答「打包工具明明沒有編譯器，Vue 的 .vue 檔是誰 transpile 的」。

## 重點整理

(a) 打包工具本身不含 Vue 編譯器，<mark style="background: #FFF3A3A6;">bundler 是靠外掛（plugin）呼叫 Vue 的編譯器，把 `.vue` 檔 transpile 成 JavaScript</mark>。
　　Vite 用 <mark style="background: #ADCCFFA6;">@vitejs/plugin-vue</mark>，webpack 用 <mark style="background: #ADCCFFA6;">vue-loader</mark>。

(b) 執行時機：<mark style="background: #FFF3A3A6;">在打包工具建構模組圖（Module Graph）、讀取檔案並轉換內容的 transform 階段</mark>，外掛攔截 `.vue` 檔，交給 Vue 編譯器產出 JS 模組。

(c) 流程（誰做什麼、產物、交給誰）：
　　bundler 讀到 `import App from './App.vue'` → 把檔案內容交給 plugin-vue 的 transform hook → plugin 呼叫 Vue 編譯器（`@vue/compiler-sfc`）把 template 編成 render function、處理 script 與 style → 產出 JS 模組 → 回到 bundler 繼續解析相依並打包。

(d) <mark style="background: #ADCCFFA6;">模板語法本身不是 JS 物件</mark>，是類似 HTML 的字串結構。
　　經編譯後才變成 render function，執行時 render function 會回傳 Virtual DOM 節點（普通 JS 物件）。

(e) <mark style="background: #ADCCFFA6;">Virtual DOM</mark>：用 JS 物件描述 UI 樹，更新時先比對新舊兩棵樹（Diffing），再只把差異套用到真實 DOM。

(f) Incremental DOM 對比：不產生完整的中間樹，直接在原 DOM 上就地比對更新，因此記憶體佔用較低。

(g) <mark style="background: #ADCCFFA6;">批次更新（Batching）</mark>不是 throttle 或 debounce 的「等待時間」，而是把同一個執行週期內的多次狀態變更合併成一次渲染。
　　React 18 起稱 Automatic Batching，連在 Promise、setTimeout 裡的多次 setState 也會自動合併。

(h) 渲染「頻率」與「單次耗時」是兩件事：批次更新是減少渲染次數與真實 DOM 操作，所以縮短的是總耗時。

⚠️ 存疑/更正：Gemini 說「Virtual DOM 在頻繁或大型更新時通常展現更高渲染效率」並不精確。Virtual DOM 的主要價值是「宣告式寫法的便利與可預期」，額外多了 diff 的成本，手寫最佳化的直接 DOM 操作通常更快。Vue 3 還用編譯期標記（Patch Flags、靜態提升）讓 diff 跳過靜態節點，這才是它效能的來源之一。

## 各對話來源（原文）

### 前後端框架資料傳遞比較（2026-10）— https://gemini.google.com/app/ad2ceb1ba2d8e5b3

**使用者：** 可是我沒有聽說打包工具裡面有編譯器耶。

**Gemini：** 這其實是透過建構工具中的外掛來達成的，像是 @vitejs plugin vue 或 vue loader。它們會在打包時整合 Vue 的編譯器，把 .vue 檔案轉換成瀏覽器能讀懂的 JavaScript。

**使用者：** Vue 呼叫外掛的過程是在打包的什麼步驟執行的？

**Gemini：** 在建構工具開始建構模組圖，也就是讀取檔案並轉換格式的轉換階段執行的。

**使用者：** 所以 Virtual DOM 對記憶體效能。的優化是否存在哪裡？相比於 Incremental DOM 的方式。

**Gemini：** Virtual DOM 的優勢在於能集中進行複雜的 Diffing 運算與批次更新，雖然記憶體佔用較高，但在頻繁或大型更新時通常能展現出更高的渲染效率。

**使用者：** 它的渲染的頻率會比較快嗎？還是說渲染花的時間比較短？

**Gemini：** Virtual DOM 主要是透過批次更新和減少直接操作真實 DOM 的次數，來縮短每次渲染時消耗的時間。

**使用者：** 批次是指有很多個 Virtual DOM 的變更，然後它可能有用 throttle 或是 debounce。等待的方式去。

**Gemini：** 其實不僅是 throttle 或 debounce，像是 React—（回答被截斷）

**使用者：** 多個有扣在一起操作嗎？

**Gemini：** 在現代的 React 中，這稱為 Automatic Batching。系統會自動將多次狀態變更合併在一起，在同一個渲染週期中一起處理。

**使用者：** 模板語法大部分是。它是一個 JS 的物件嗎？

**Gemini：** 模板語法本身通常不是 JavaScript 物件，而是類似 HTML 的結構。不過經過編譯後，它們會被轉換成 JavaScript 物件或渲染函式。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Vite 的 Vue 外掛 | [vitejs/vite-plugin-vue](https://github.com/vitejs/vite-plugin-vue) | 2026-10-23 列出 |
| Vue 渲染機制與編譯期最佳化 | [Vue 官方：Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html) | 2026-10-23 列出 |
| React Automatic Batching | [React v18 發布文](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching) | 2022-03-29 |
| 對話原文 | [Gemini 對話](https://gemini.google.com/app/ad2ceb1ba2d8e5b3) | 2026-10 |
