---
title: valueOf() 的預設行為——為什麼物件回傳自己
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, valueOf, ToPrimitive, 型別轉換, 物件, JS_Core_and_Runtime]
aliases: [valueOf, 預設行為的價值, primitive-value]
related:
  - "[[15-ToPrimitive-ToNumber-型別轉換抽象操作]]"
  - "[[Constructor-與-Prototype-關係]]"
  - "[[查看plain-object的prototype]]"
sources:
  - https://gemini.google.com/app/7bff9994e4f315a7
updated: 2026-08-14
---

# valueOf() 的預設行為——為什麼物件回傳自己

> 本篇重點 a–h，共 8 個。

> [!info] 為什麼跟其他筆記有關聯
> a. 與 [[15-ToPrimitive-ToNumber-型別轉換抽象操作]] 相關：`valueOf()` 是 <mark style="background: #ADCCFFA6;">ToPrimitive</mark> 抽象操作實際會去呼叫的兩個方法之一（另一個是 `toString()`）。那篇講「規格層級發生什麼事」，這篇講「你在 console 打下去會看到什麼」。
> b. 與 [[查看plain-object的prototype]] 相關：`valueOf` 就住在 <mark style="background: #FFF3A3A6;">`Object.prototype`</mark> 上，所以 `Object.create(null)` 造出來的 null 原型物件<mark style="background: #FF5582A6;">連 `valueOf` 都沒有</mark>，任何隱式型別轉換都會直接爆 TypeError。

## 重點整理

### 一、核心結論

c. <mark style="background: #FFF3A3A6;">`Object.prototype.valueOf()` 的預設行為，就是「把 `this` 原封不動回傳」。</mark>它不做任何轉換，所以對一般物件來說呼叫它等於什麼都沒發生：

```js
const obj = {};
obj.valueOf() === obj;   // true ← 回傳的就是自己，連新物件都不是
```

d. 陣列也一樣，因為 `Array.prototype` <mark style="background: #FFF3A3A6;">沒有覆寫 `valueOf`</mark>，繼承下來的還是 `Object.prototype` 那個：

```js
const arr = [1, 2];
arr.valueOf() === arr;              // true
Array.isArray(arr.valueOf());       // true ← 回傳的還是那個陣列，當然還是陣列
arr.valueOf() === undefined;        // false ← 不會回傳 undefined
```

e. <mark style="background: #FF5582A6;">最常見的誤解</mark>：以為 `valueOf()` 一定會「把物件變成原始值」。<mark style="background: #FF5582A6;">預設實作根本不會。</mark>物件之所以能被拿去做數學運算，是因為 `valueOf()` 失敗（回傳的還是物件、不是原始值）之後，引擎<mark style="background: #BBFABBA6;">退而求其次改呼叫 `toString()`</mark>——這才是 `[] + {}` 那類怪現象的真正來源。

### 二、包裝物件才是 valueOf 真正有用的地方

f. `Number`、`String`、`Boolean` 這三個<mark style="background: #ADCCFFA6;">包裝物件（wrapper object）</mark>各自<mark style="background: #BBFABBA6;">覆寫了 `valueOf`</mark>，會回傳裡面裝的那個原始值：

```js
const n = new Number(42);
typeof n;              // "object" ← 用 new 造出來的是物件
n.valueOf();           // 42
typeof n.valueOf();    // "number" ← 這裡才真的拿到原始值
n === 42;              // false ← 物件跟原始值嚴格比較不相等
n == 42;               // true  ← 寬鬆比較會觸發 ToPrimitive，才變成 42
```

g. <mark style="background: #D2B3FFA6;">一句話總結</mark>：<mark style="background: #FFF3A3A6;">`valueOf` 是一個「留給你覆寫的鉤子」。`Object.prototype` 上的預設版本刻意什麼都不做（回傳自己），需要參與型別轉換的型別才自己覆寫它。</mark>

h. <mark style="background: #BBFABBA6;">自訂覆寫的實際用法</mark>——這是它在真實專案裡唯一常見的場景：

```js
const money = {
  amount: 100,
  valueOf() { return this.amount; }   // 覆寫掉預設行為
};
money + 50;      // 150 ← 引擎做加法時走 ToPrimitive，呼叫到你寫的 valueOf
`${money}`;      // "[object Object]" ← 字串樣板走的是 toString，沒被覆寫
```

---

## ⚠️ 存疑／更正

原始對話是語音輸入，Gemini 有一句回答是「comparing the result to undefined results in false」，語意混亂（前面問的是 `Array.isArray()`，不是跟 `undefined` 比較）。<mark style="background: #FF5582A6;">該句已剔除</mark>，改以 MDN 規格行為重寫。上面第 e、f、h 三點的 ToPrimitive 退回機制與自訂覆寫範例，為依 MDN 補充，非對話原文。

## 各對話來源

### 預設行為的價值（2026-08-14）— https://gemini.google.com/app/7bff9994e4f315a7

> [!note] 語音輸入對話，使用者提問有辨識雜訊，以下取語意可還原的部分。

**使用者：** 它是一個物件的原型，然後我看到 `obj.valueOf() === obj`，這樣子出來會是什麼？

**Gemini：** `obj.valueOf()` 的求值結果會回傳物件自己，所以那個比較的結果會是 `true`。

**使用者：** 那 `Array.isArray(arr.valueOf())` 呢？檢查是不是陣列，這樣會回傳 true 嗎？

**Gemini：** 會回傳 `true`。因為陣列的 `valueOf` 方法回傳的就是陣列本身，所以 `Array.isArray` 正確地把它辨識為陣列。

**使用者：** 為什麼要這樣設計？

**Gemini：** `valueOf` 方法是為了取得物件的原始值而被呼叫的，但對陣列來說，它單純回傳陣列本身。

**使用者：** `new Number(42).valueOf()` 跟 `typeof new Number(42).valueOf()` 這邊會顯示什麼？

**Gemini：** `new Number(42).valueOf()` 回傳原始數值 `42`，檢查其型別得到 `number`。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇原始對話 | https://gemini.google.com/app/7bff9994e4f315a7 | Gemini 對話（語音輸入），整理於 2026-08-14 |
| `Object.prototype.valueOf` 預設回傳 this | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf | MDN，查證於 2026-08-14 |
| ToPrimitive 先 valueOf 後 toString 的順序 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures#primitive_coercion | MDN，查證於 2026-08-14 |
| `Number.prototype.valueOf` 覆寫行為 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/valueOf | MDN，查證於 2026-08-14 |
