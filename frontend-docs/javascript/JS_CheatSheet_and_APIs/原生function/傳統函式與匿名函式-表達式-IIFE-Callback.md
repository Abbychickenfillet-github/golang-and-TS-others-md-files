---
title: 傳統函式可以是匿名函式嗎？（函式表達式 / IIFE / Callback）
type: topic-note
source: Gemini
tags: [gemini, javascript, 函式, 匿名函式, IIFE, 箭頭函式]
sources:
  - https://gemini.google.com/app/1c2e605259537e41
updated: 2026-07-01
---

# 傳統函式可以是匿名函式嗎？（函式表達式 / IIFE / Callback）

## 重點整理

### 結論：可以
<mark class="g">用 `function` 關鍵字定義的「傳統函式」完全可以是匿名函式</mark>（沒有給函式名稱）。

### 傳統匿名函式的三種常見場景
1. <mark class="b">函式表達式 (Function Expression)</mark>：把沒名字的函式賦值給變數，<mark class="y">變數名代表該函式，但函式本體本身是匿名的。</mark>
```javascript
const greet = function() { console.log("Hello World"); };
greet();
```
2. <mark class="b">立即執行函式 (IIFE)</mark>：定義當下立刻執行，<mark class="y">常用來建立獨立作用域、避免污染全域變數。</mark>
```javascript
(function() { console.log("立刻執行，且沒有名字"); })();
```
3. <mark class="b">回呼函式 (Callback)</mark>：直接當參數傳給其他方法（事件監聽、非同步）。
```javascript
setTimeout(function() { console.log("延遲 1 秒後執行"); }, 1000);
```

### 傳統匿名函式 vs 箭頭函式（關鍵差異）
現代多用箭頭函式取代，但兩者行為關鍵不同：

| 面向 | 傳統匿名函式 | 箭頭函式 |
|---|---|---|
| <mark class="b">`this` 綁定</mark> | <mark class="r">動態綁定：取決於「呼叫時」的上下文</mark> | <mark class="g">沒有自己的 this，繼承「定義時」外層環境（靜態）</mark> |
| <mark class="b">`arguments`</mark> | 內部可用 `arguments` 存取所有傳入參數 | <mark class="r">不支援 `arguments`</mark> |

## 各對話來源

### 傳統函式可否為匿名函式（2026-06）— https://gemini.google.com/app/1c2e605259537e41

**使用者：**

傳統函式可以是匿名函式嗎？

**Gemini：**

答案：可以。傳統函式（用 function 關鍵字定義）完全可以是匿名函式，常見三種形式：

1. 函式表達式：`const greet = function(){...}`，變數名代表函式、函式本體匿名。
2. IIFE（立即執行函式）：`(function(){...})()`，建立獨立作用域、避免污染全域。
3. 回呼函式：如 `setTimeout(function(){...}, 1000)`，當參數傳給其他方法。

傳統匿名函式 vs 箭頭函式的關鍵差異：
- this：傳統匿名函式是動態綁定（取決於呼叫時上下文）；箭頭函式沒有自己的 this，繼承定義時外層環境。
- arguments：傳統匿名函式可用 arguments；箭頭函式不支援。
