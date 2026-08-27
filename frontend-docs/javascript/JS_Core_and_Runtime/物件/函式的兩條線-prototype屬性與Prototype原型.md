---
title: 函式的兩條線｜.prototype 屬性 vs [[Prototype]] 原型
tags: [javascript, prototype, function, constructor, 面試]
created: 2026-08-21
source:
  - MDN Function.prototype、Object.getPrototypeOf
  - 實測環境 Node.js v22（V8）
---

# 函式的兩條線｜`.prototype` 屬性 vs `[[Prototype]]` 原型

> [!question] 這篇要解的疑問
> 看到 `Object.hasOwn(Object.getOwnPropertyNames, 'prototype')` 是 `false` 之後問：
> 「不是建構函式，所以它是 prototype 的函式？但是 prototype 的函式本身沒有 prototype 屬性嗎？」
>
> 這裡混了兩件事，拆開之後會豁然開朗。
> 承接 [[Object靜態方法速查]] 的「兩個盒子」與 [[Object建構子-plain-object的建立與存取]] 的 i 節。

---

## a. 先修正一個前提

**`Object.getOwnPropertyNames` 不是「prototype 的函式」。**

```js
Object.hasOwn(Object,           'getOwnPropertyNames')   // true  ← 在左盒
Object.hasOwn(Object.prototype, 'getOwnPropertyNames')   // false ← 不在右盒
```

它是**掛在 `Object` 建構函式身上的靜態方法**，跟 `Object.prototype` 完全沒關係。

那真正的問題是：**它為什麼沒有 `prototype` 屬性？**

---

## 主軸圖

![[學習JS_圖解_函式的兩條線-prototype屬性與Prototype原型_2026-08-21.svg]]

---

## b. 關鍵：一個函式身上有兩條完全不同的線

名字很像，但是兩件事：

| | `[[Prototype]]` 原型 | `.prototype` 屬性 |
| --- | --- | --- |
| 方向 | **向上** | **向下** |
| 意思 | 「**我自己**的原型是誰」 | 「我 **new 出來的實例**，原型要是誰」 |
| 怎麼讀 | `Object.getPrototypeOf(f)` | `f.prototype` |
| 誰有 | **每一個物件都有**，函式也是物件 | **只有部分函式有** |

```js
const f = Object.getOwnPropertyNames;

f.prototype                  // undefined            ← 沒有這個「屬性」
Object.getPrototypeOf(f)     // Function.prototype   ← 但它「有」原型

typeof f.call, typeof f.bind // "function" ← 就是從 Function.prototype 繼承來的
```

> [!important] 一句話
> **每個函式都有原型（向上那條），但不是每個函式都有 `.prototype` 屬性（向下那條）。**
> `Object.getOwnPropertyNames` 有向上那條、沒有向下那條。

**向下那條沒有，不代表它「不是物件」或「沒有原型」** —— 它只是**不打算被 `new`**，所以規範不給它那個永遠用不到的空物件。

---

## c. 誰有 `.prototype` 屬性（實測表）

| 函式種類 | 有 `.prototype` | 能 `new` | 備註 |
| --- | --- | --- | --- |
| `function` 宣告／表達式 | ✔ | ✔ | 標準情況 |
| `class` | ✔ | ✔ | 標準情況 |
| 內建建構函式 `Object`、`Map`、`Array` | ✔ | ✔ | |
| **`generator` 函式** | ✔ | **✘** | **例外一** |
| `Symbol` | ✔ | ✘ | 有 `Symbol.prototype` 但禁止 `new` |
| 箭頭函式 `() => {}` | ✘ | ✘ | |
| 方法簡寫 `{ m(){} }` | ✘ | ✘ | |
| `class` 的實例方法與 static 方法 | ✘ | ✘ | |
| `async` 函式 | ✘ | ✘ | |
| 內建工具函式 `Object.keys`、`Math.max`、`parseInt` | ✘ | ✘ | **本篇的主角** |
| **`f.bind()` 綁定函式** | ✘ | **✔** | **例外二** |

---

## d. 兩個打破直覺的例外

### d-1. generator 函式：有 `.prototype` 但不能 `new`

```js
function* gen() {}

Object.hasOwn(gen, 'prototype')   // true
new gen()                         // TypeError: gen is not a constructor
```

它那個 `.prototype` 是給**產生器物件**用的（`gen()` 回傳的那個東西的原型），不是給 `new` 用的。

### d-2. 綁定函式：沒有 `.prototype` 卻能 `new`

```js
function Person() {}
const Bound = Person.bind(null);

Object.hasOwn(Bound, 'prototype')                          // false
new Bound()                                                // ✔ 成功
Object.getPrototypeOf(new Bound()) === Person.prototype    // true
```

`new` 一個綁定函式時，引擎會**轉去用原本那個函式的 `.prototype`**。

> [!warning] 所以判準不是「有沒有 .prototype」
> 真正決定「能不能 `new`」的是規範裡的**內部方法 `[[Construct]]`**。
> 規範說：函式物件可以有 `[[Call]]`（能呼叫）與 `[[Construct]]`（能 `new`）。
> - 有 `[[Call]]` 沒 `[[Construct]]` → 箭頭函式、`Object.keys`
> - 兩個都有 → `function` 宣告、`class`
>
> **`.prototype` 屬性只是「通常」跟著 `[[Construct]]` 一起出現，不是同一件事。**

---

## e. 為什麼內建工具函式不給 `.prototype`

`Object.keys` 的用途是「**拿參數算出答案**」，它沒有「實例」這個概念 —— 你不會寫 `new Object.keys()`。

給它一個 `.prototype`，就是白白配一個永遠用不到的空物件，每一個內建工具函式都配一個，那是純粹的浪費。

對照 `Object` 本身：

```js
new Object()                                      // 有意義
Object.getOwnPropertyNames(Object.prototype)      // 12 個成員 ← 這才是有用的 .prototype
```

**這就是「工具函式」與「建構函式」的分野**，也呼應 [[ECMAScript版本沿革-ES1到ES2026]] 講的：ES5 之後新增的 `Object.xxx` 幾乎都是純工具函式，沒有一個是設計來 `new` 的。

---

## f. 怎麼自己檢查

```js
// 有沒有 .prototype 屬性（向下那條）
Object.hasOwn(f, 'prototype')

// 原型是誰（向上那條）—— 每個函式都有
Object.getPrototypeOf(f) === Function.prototype

// 能不能 new —— 直接試最準
const canNew = (f) => { try { new f(); return true; } catch { return false; } };
```

---

## g. 面試可以怎麼答

**Q：`f.prototype` 跟 `Object.getPrototypeOf(f)` 差在哪？**

方向相反。`Object.getPrototypeOf(f)` 問的是「**f 自己的原型是誰**」，答案通常是 `Function.prototype`，每個函式都有。`f.prototype` 問的是「**f 用 `new` 做出來的實例，原型要是誰**」，只有能當建構函式的那些才有。名字很像但完全是兩件事。

**Q：箭頭函式為什麼不能 `new`？**

因為它沒有 `[[Construct]]` 內部方法，也沒有 `.prototype` 屬性。設計上箭頭函式就是「短小的、只拿來算東西的函式」，它連自己的 `this`、`arguments`、`super` 都沒有，自然也不該能當建構函式。

**Q：`Object.keys` 為什麼沒有 `.prototype`？**

它是工具函式不是建構函式，沒有「實例」這個概念。但它**仍然有原型**（`Function.prototype`），所以照樣可以用 `.call()`、`.bind()`。**「沒有 `.prototype` 屬性」不等於「沒有原型」。**

---

## 參考來源

| 來源 | 說明 |
| --- | --- |
| MDN｜Function.prototype | 函式繼承的 `call`／`apply`／`bind` |
| MDN｜Object.getPrototypeOf() | 讀取 `[[Prototype]]` |
| ECMA-262｜`[[Call]]` 與 `[[Construct]]` 內部方法 | 決定能不能 `new` 的真正判準 |
| 實測環境 Node.js v22（V8） | 2026-08-21，16 種函式全部實測 |

> [!note] 可執行腳本
> `C:\coding\JavaScript-practicing\函式的兩條線-demo.js`（16 種函式的對照表 ＋ 兩個例外的實證）

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[Object靜態方法速查]] | 「兩個盒子」的判準，本篇是「左盒裡的東西為什麼沒有 .prototype」 |
| [[Object建構子-plain-object的建立與存取]] | i 節的原型鏈階數，本篇是函式版 |
| [[Constructor-與-Prototype-關係]] | `.prototype` 與 `constructor` 互指的環 |
| [[自動裝箱與內建建構函式-大寫Symbol與小寫sym]] | `Symbol` 有 `.prototype` 卻不能 `new` 的原因 |
| [[JavaScript-函式類型總整理]] | 箭頭函式、方法簡寫、generator 的完整差異 |
