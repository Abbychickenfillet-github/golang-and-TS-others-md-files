---
title: style.setProperty 屬於 DOM 還是 JS／Web IDL 與 BNF 的差別
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - DOM
  - CSSOM
  - web-idl
  - BNF
sources:
  - https://gemini.google.com/app/67ca8ce2c53e884c
updated: 2026-10-26
---

# style.setProperty：DOM 方法、JS 呼叫

本篇重點 a–d，共 4 個

## 重點整理

- (a) <mark style="background: #FFF3A3A6;">`deck.style.setProperty('--x', v)` 是 DOM（CSSOM）提供的 API，由 JavaScript 呼叫</mark>。它是 `CSSStyleDeclaration` 物件的方法，可設定一般 CSS 屬性與 CSS 變數（custom property）。
- (b) 寫在編輯器的那一行是 JavaScript 語法，不是 IDL。<mark style="background: #ADCCFFA6;">Web IDL（Interface Definition Language）</mark>是 W3C／WHATWG 規格書用來宣告「瀏覽器要提供哪些介面給開發者」的語言，setProperty 的簽名是在規格中以 Web IDL 定義，瀏覽器再實作成 JS 可呼叫的方法。
- (c) <mark style="background: #ADCCFFA6;">BNF（Backus-Naur Form）</mark>是描述語法的標記法，只能「寫規則」，不能執行，也不能設定元素或物件屬性。規格裡 `property ::= value` 只是在定義允許的語法。
- (d) 要幫元素設屬性用 `el.style.setProperty()`；幫一般 JS 物件設屬性用 `obj.x = v`、`Object.defineProperty()`。setProperty 只作用於 CSSStyleDeclaration。

## 各對話來源（原文摘要）

### Missing Property Error（2026-10-26 抓取）— https://gemini.google.com/app/67ca8ce2c53e884c

**使用者：** Set property 是 DOM 在用的還是 JS？算 IDL 語法嗎？Naur form 是什麼？能幫元素也能幫物件設屬性嗎？
**Gemini：** 見 (a)(b)(c)(d)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 原始對話 | https://gemini.google.com/app/67ca8ce2c53e884c | 2026-10-26 抓取 |
| MDN setProperty | https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/setProperty | 本次未重新抓取，待核對 |
| Wikipedia BNF | https://zh.wikipedia.org/wiki/巴科斯范式 | 本次未重新抓取，待核對 |

由 Gemini 對話自動整理 · 更新於 2026-10-26
