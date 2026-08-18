---
title: 查看plain-object的prototype
type: topic-note
tags: [javascript, prototype, prototype-chain, object, JS_Core_and_Runtime]
aliases: [查看plain-object的prototype, null原型物件, null-prototype-object]
related:
  - "[[Constructor-與-Prototype-關係]]"
  - "[[Object靜態方法速查]]"
source: Gemini
sources:
  - https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Data_structures
  - https://gemini.google.com/app/d3c5f0e8c6e26eca
updated: 2026-08-14
---

# 查看 plain object 的 prototype——原型什麼時候會是 null

> [!quote]- 📍 起點：MDN原文（中文版，查證於2026-08-14）
> 在 JavaScript 中，幾乎所有的[物件](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Data_structures#object)都是 `Object` 的實例；一個典型的物件從 `Object.prototype` 繼承屬性（包括方法），儘管這些屬性可能被覆蓋（或者說重寫）。唯一不從 `Object.prototype` 繼承的物件是那些 `null` 原型物件，或者是從其他 `null` 原型物件繼承而來的物件。

## (a) 先回答核心問題：一個物件的原型要怎麼變成 null

有三種**主動**讓一個物件原型變成`null`的寫法，外加一種**天生內建**的情況：

```js
// 寫法一：建立當下就指定沒有原型（最常見、最推薦）
const a = Object.create(null);
Object.getPrototypeOf(a); // null

// 寫法二：物件字面量裡直接寫 __proto__: null
const b = { __proto__: null };
Object.getPrototypeOf(b); // null

// 寫法三：對一個已經存在的物件，事後砍掉它的原型
const c = {};
Object.setPrototypeOf(c, null);
Object.getPrototypeOf(c); // null
```

<mark style="background: #FFF3A3A6;">寫法二有個容易誤解的地方</mark>：`{ __proto__: null }`裡的`__proto__`只有**在物件字面量裡、當作字面上寫出來的key**時，才會被JS引擎特殊處理成「設定這個物件的原型」；如果是用變數或字串動態組出這個key（例如`{ [someVar]: null }`、或事後用`b['__proto__'] = null`去改一個已經存在的一般物件），那只是在建立/覆蓋一個名字剛好叫`__proto__`的**普通屬性**，不會真的改變原型。（這個「動態賦值不會觸發改原型」的行為，本身也跟(c)要講的null原型物件用途有關。）

## (b) 引用文字裡「或者是從其他 null 原型物件繼承而來的物件」是什麼意思

這是在講**鏈式繼承**的情況——一個物件自己的直接原型不是`null`，而是**另一個已經是null原型的物件**：

```js
const base = Object.create(null);   // base 自己的原型是 null
const child = Object.create(base);  // child 的原型是 base（不是 null）

Object.getPrototypeOf(child); // base，不是 null
Object.getPrototypeOf(base);  // null
```

`child`本身的原型欄位指向的是`base`，不是`null`，但整條原型鏈往上走：`child → base → null`，走到底一樣是`null`收尾，中間完全不會經過`Object.prototype`。MDN原文用「或者是」把這種情況跟「直接是null原型」的物件並列，就是因為兩者的共同點是**整條鏈都摸不到`Object.prototype`**，差別只在於是「自己直接是null」還是「往上走幾步才碰到null」。

## (c) 為什麼要特地弄一個原型是 null 的物件——真正的用途

一般用`{}`或`new Object()`建立的物件，會自動繼承`Object.prototype`上的一大串東西：`hasOwnProperty`、`toString`、`valueOf`、`constructor`，還有一個特殊的存取器屬性（accessor property）`__proto__`本身（就是(a)裡能寫`obj.__proto__ = ...`去改原型的那個機制，這個setter是定義在`Object.prototype`上的）。

如果把一般物件當成「純粹的字典／雜湊表」使用，key是外部輸入決定的（例如用使用者輸入的字串當key），就有風險：

```js
const dict = {};
dict[userInput] = someValue;

// 如果 userInput 剛好是 "hasOwnProperty" 或 "toString"
dict.hasOwnProperty('x'); // 可能不再是原本 Object.prototype 上那個函式了，行為變得不可預期
dict['__proto__'] = maliciousValue; // 這裡走的是 Object.prototype 上的 __proto__ setter，可能意外改掉 dict 的原型
```

<mark style="background: #ADCCFFA6;">用`Object.create(null)`建的物件完全沒有這個問題</mark>——因為它整條原型鏈上根本沒有`Object.prototype`，也就沒有那個`hasOwnProperty`、`toString`、`__proto__` setter可以被意外撞名或觸發。這時候`dict['__proto__'] = maliciousValue`只會乖乖建立一個名字叫`__proto__`的**普通own property**，不會真的改到原型——這正好呼應(a)提到「動態賦值不會觸發改原型」的行為，因為那個特殊行為的setter本身就活在`Object.prototype`上，null原型物件沒有繼承到它。這也是為什麼Node.js的`Map`、還有一些函式庫在處理「當純字典用」的場景時，會刻意選`Object.create(null)`而不是`{}`。

## (d) 更根本的一層：`Object.prototype`自己的原型也是 null

<mark style="background: #FF5582A6;">這才是整段MDN引文為什麼要特別排除null原型物件的真正原因——原型鏈不能無限往上追，一定要有個終點，而這個終點本身就定義成null。</mark>

```js
Object.getPrototypeOf(Object.prototype); // null
```

一般物件的原型鏈長這樣：`myObj → Object.prototype → null`。`Object.prototype`是這條鏈**唯一保證存在**的中繼點，而它自己的原型欄位，ECMAScript規格書直接定義成`null`——不是「找不到所以是null」，是規格明文寫死「這裡就是終點」。如果沒有這個明文規定的null終點，`Object.prototype`還要有自己的原型，那個原型又要有原型，會變成無限往上找、找不到底。

一句話：<mark style="background: #FF5582A6;">一個物件的原型會是`null`，只有三種主動做法（`Object.create(null)`、物件字面量寫`{ __proto__: null }`、`Object.setPrototypeOf(obj, null)`），加上鏈式繼承時「往上走最後摸到的是另一個null原型物件」；而整個原型系統之所以需要處理「null原型」這個例外情況，根源是`Object.prototype`自己的原型就被規格定義成null，這是所有一般物件原型鏈最終、唯一保證的終點。</mark>

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 物件與原型鏈概念、null原型物件定義 | [MDN - JavaScript Data structures](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Data_structures) | 中文版，查證於2026-08-14 |
