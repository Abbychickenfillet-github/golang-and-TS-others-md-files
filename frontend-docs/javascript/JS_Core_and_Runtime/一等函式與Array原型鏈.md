---
title: 一等函式（First-class Function）與 Array 原型鏈
type: topic-note
source: Gemini
tags: [gemini, javascript, function, prototype, csharp]
sources:
  - https://gemini.google.com/app/423b414e4f2972eb
  - https://gemini.google.com/app/ae019d155cb4002d
updated: 2026-11-03
---

# 一等函式（First-class Function）與 Array 原型鏈

「函式先行」其實是「一等函式」（First-class Functions）。另補 `Array.prototype` 的原型鏈。

## 重點整理

本篇重點 a–e，共 5 個

(a) <mark style="background: #ADCCFFA6;">一等函式</mark>：函式與數字、字串、物件地位平等，具備三特徵：可指派給變數或屬性、可當參數傳入（callback，如 `numbers.filter(item => item > 60)`）、可被函式回傳（高階函式、閉包）。

(b) C# 也支援，從 C# 3.0 的 Lambda 與委派（Delegate）開始。型別用 `Func<>`、`Action<>`，LINQ 的 `Where(item => item > 60)` 就是把函式當參數。

(c) 差異：JS 的函式本身就是原生物件，寫起來直覺。C# 靠委派型別與表達式樹實現「把函式當資料」。

(d) `Array.prototype` 的原型是 `Object.prototype`，`Object.prototype` 的原型是 `null`（鏈頂端）。驗證：`Object.getPrototypeOf(Array.prototype) === Object.prototype` 為 true。

(e) Gemini 對亂碼 `%p4xu,4` 只猜是 Base64 或密碼，無實質內容，本篇不採用。

> ⚠️ 存疑/更正：`Array.prototype` 嚴格來說本身是 Array exotic object，但其 `[[Prototype]]` 確為 `Object.prototype`，結論無誤。

## 自我測驗（點開看答案）

> [!question]- 一等函式的三特徵？
> 可指派、可當參數、可被回傳。

> [!question]- `Object.getPrototypeOf(Object.prototype)` 是什麼？
> `null`。

## 各對話來源
（Gemini 回答為節錄，使用者提問為原文）

### 範式（Paradigm）解析（2026-11-03）— https://gemini.google.com/app/423b414e4f2972eb

**使用者：** 函式先行是什麼

**Gemini：** （節錄）即一等函式，三大特徵。

**使用者：** C# 是函式先行嗎

**Gemini：** （節錄）是，透過 Lambda 與 Delegate。

### 亂碼解析與程式協助（2026-11-03）— https://gemini.google.com/app/ae019d155cb4002d

**使用者：** %p4xu,4

**Gemini：** （節錄）看似 Base64 或密碼。

**使用者：** Array.prototype 的原型有物件嗎

**Gemini：** （節錄）有，是 Object.prototype，再上去是 null。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| First-class Function | https://developer.mozilla.org/zh-TW/docs/Glossary/First-class_Function | MDN，本次未重新抓取（2026-11-03） |
| 原型鏈 | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Inheritance_and_the_prototype_chain | MDN，本次未重新抓取（2026-11-03） |
