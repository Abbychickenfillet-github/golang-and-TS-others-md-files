---
title: console 查看物件原型鏈與靜態方法
type: topic-note
source: Gemini
tags: [gemini, javascript, prototype, console]
sources:
  - https://gemini.google.com/app/b5f0510c229bd12d
updated: 2026-11-09
---

# console 查看物件原型鏈與靜態方法

本篇重點 a–c，共 3 個。關聯：[[Set.prototype-原型物件-無字面量-toStringTag與擴充內建原型]]（原型物件概念）。

## 重點整理

(a) <mark style="background: #BBFABBA6;">最簡單：`console.dir(x)`</mark>，展開後可看自身屬性與 `__proto__`（原型鏈上的方法）。
　傳入實例（如 `[]`）：展開 `__proto__` 看原型方法。
　傳入建構子（如 `Array`）：自身屬性就是 static 方法（`Array.from`、`Object.keys` 同理）。

(b) 用程式碼走訪整條原型鏈，Gemini 給的遞迴版本：

```js
function getAllProperties(obj) {
  let props = new Set();
  let cur = obj;
  if (typeof obj === 'function') {
    Object.getOwnPropertyNames(obj).forEach(p => props.add(`[Static] ${p}`));
  }
  while (cur) {
    Object.getOwnPropertyNames(cur).forEach(p => props.add(p));
    cur = Object.getPrototypeOf(cur);
  }
  return Array.from(props).sort();
}
console.log(getAllProperties([]));
console.log(getAllProperties(Array));
```

(c) ⚠️ 存疑/更正：Gemini 說 `getAllProperties(Array)` 能「同時看靜態與原型方法」。
　<mark style="background: #FF5582A6;">實際上 Array 這個函式的原型鏈是 Function.prototype → Object.prototype</mark>，不包含 `Array.prototype`，所以 `map`、`push` 不會出現。
　要看實例方法需另外呼叫 `getAllProperties(Array.prototype)`。

## 自我測驗（點開看答案）

<details><summary>1. 想看 Array 的 static 方法與實例方法，各該傳什麼給函式？</summary>static：傳 Array 看自身屬性；實例方法：傳 Array.prototype 或 []。</details>

## 各對話來源

### 顯示物件原型鏈（2026-11-09）— https://gemini.google.com/app/b5f0510c229bd12d

使用者：要打什麼在 console 才可以顯示物件的原型鏈一堆 static function + prototype function
Gemini：推薦 console.dir()，另給遞迴 getAllProperties 程式（如重點 (a)(b)）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| console.dir | https://developer.mozilla.org/zh-TW/docs/Web/API/console/dir | MDN，本次未重新抓取（2026-11-09）；(c) 為依原型鏈規則自行查錯 |
