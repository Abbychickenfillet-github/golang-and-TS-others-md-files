---
title: createElement 到 appendChild：游離節點與 HTMLLIElement 繼承鏈
type: topic-note
category: 技術
tags:
  - DOM
  - createElement
  - appendChild
  - prototype-chain
  - Web-IDL
updated: 2026-11-04
---

# createElement 到 appendChild：游離節點與 HTMLLIElement 繼承鏈

主檔是互動版 [[DOM-createElement到appendChild-游離節點與HTMLLIElement繼承鏈.html]]（主軸圖可逐行執行、即時量 parentNode／isConnected、測驗）。
程式範例：同資料夾 `demo-add-element.html`

## 大綱
1. [[#一句話]]
2. [[#相關筆記]]
3. [[#截圖]]

## 一句話
<mark style="background: #FFF3A3A6;">createElement 造出節點，appendChild 把節點接進 DOM 樹，兩個是獨立方法</mark>。
	createElement 之後的節點是完整的 HTMLLIElement 物件，只是 parentNode 為 null、isConnected 為 false，所以 document.querySelector 找不到它。
	HTMLLIElement → HTMLElement → Element → Node → EventTarget → Object 是 Web IDL 宣告的介面繼承鏈，appendChild 來自 Node 那一層。

## 相關筆記
- [[style.setProperty-是DOM方法-與Web-IDL及BNF的差別]]：同一套 Web IDL 宣告出 HTMLLIElement
- [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]：parser 建的 li 跟 createElement 建的是同一種物件
- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪-互動版]]：appendChild 進樹才觸發 reflow
- [[class底層是原型鏈-宣告vs表達式-CFp]]：繼承鏈就是 extends 原型鏈
- [[CSR初始DOM只有空div-root-DOM建立的時機與阻塞]]：React 長出畫面底層也是 createElement 加 appendChild

## 截圖
![[學習JS_圖解_游離節點走進DOM樹主軸圖_2026-11-04.png]]
![[學習JS_網頁_demo游離節點狀態與HTMLLIElement原型鏈實測_2026-11-04.png]]
![[學習JS_書本_利用DOM控制處理加入元件三步驟p222_2026-11-04.jpeg]]
![[學習JS_書本_在DOM樹中加入元件add-element範例p223_2026-11-04.jpeg]]
