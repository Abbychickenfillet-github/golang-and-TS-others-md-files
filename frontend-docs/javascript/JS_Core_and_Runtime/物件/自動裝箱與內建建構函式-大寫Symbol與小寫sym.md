---
title: 自動裝箱與內建建構函式｜大寫 Symbol 與小寫 sym 的關係
tags: [javascript, autoboxing, primitive, wrapper-object, symbol, 面試]
created: 2026-08-21
source:
  - MDN Symbol、Object() constructor
  - 實測環境 Node.js v22（V8）
---

# 自動裝箱與內建建構函式

> [!info] 這篇的由來
> 起於一個疑問：**大寫的 `Symbol` 跟小寫的 `sym` 是什麼關係？為什麼要分兩層？**
> Abby 先用 Gemini 問過一輪，本篇是交叉驗證後的版本 —— 保留正確的部分，補上原答案**漏掉的關鍵機制（自動裝箱）**，並修正一個用詞。
>
> 承接 [[Object建構子-plain-object的建立與存取]] 的分流 2：那裡說 `Object(1)` 會產生「包裹物件」，這篇說明那個包裹物件平常在背後做什麼。

---

## a. 為什麼要分兩層

| 層 | 是什麼 | 例子 | 設計考量 |
| --- | --- | --- | --- |
| **值**（小寫 `sym`） | 真正拿來當 key 的基本型態零件 | `const sym = Symbol('id')` | 在記憶體裡要**極輕量**才跑得快 |
| **內建建構函式**（大寫 `Symbol`） | 製造機兼工具箱 | `Symbol.for()`、`Symbol.iterator` | 工具統一放這裡，不用附著在每個值身上 |

**一句話：大寫是製造機與工具箱，小寫是製造出來的零件。**

如果把 `Symbol.for`、`Number.MAX_VALUE` 這些工具掛在每一個值身上，那每個 `123` 都要背著一整套 API，記憶體會爆掉。

---

## b. 大寫 `Symbol` 的三個角色

**b-1. 建立 Symbol 值的唯一入口**

```js
Symbol('id')        // ✔ 只能這樣
new Symbol('id')    // ✘ TypeError: Symbol is not a constructor
```

**b-2. 全域註冊表的入口**

跨檔案要共享同一個 Symbol，只能透過大寫那層提供的靜態方法：

```js
Symbol.for('key')          // 查全域登錄表，有就拿舊的
Symbol.keyFor(sym)         // 反查它在登錄表裡的 key
```

**b-3. 系統內建的通訊協定（Well-known Symbols）**

```js
Symbol.iterator      // for...of 底層去找的就是它
Symbol.toStringTag   // Object.prototype.toString.call() 讀的標籤
Symbol.asyncIterator // for await...of
```

你寫 `for (const x of arr)` 時，引擎底層就是去找 `arr[Symbol.iterator]`。詳見 [[Map.prototype完整清單-實例方法與存取器]] 的 c-2 節（`Map.prototype[Symbol.iterator] === Map.prototype.entries`）。

---

## c. 用詞修正：「全域物件」不夠精準

很多文章把 `Symbol`、`Number`、`String` 統稱「全域物件」。這**不算錯** —— 它們確實是全域物件的屬性：

```js
globalThis.Symbol === Symbol   // true
```

但「**全域物件**」這個詞通常指的是 `globalThis` 本身（瀏覽器裡的 `window`）。講到 `Symbol` 這一層，精準的說法是**內建建構函式 built-in constructor**：

```js
typeof Symbol       // "function"  ← 它是個函式
typeof globalThis   // "object"    ← 這個才是全域物件
```

> [!tip] 面試用詞
> 說「`Symbol` 是掛在全域物件上的內建建構函式」會比說「`Symbol` 是全域物件」精準。

---

## d. 關鍵補充：那字串為什麼可以呼叫方法

「基本型態身上沒有方法」是對的，但這行明明會動：

```js
const s = 'hello';
s.toUpperCase();   // "HELLO"
```

**因為引擎做了自動裝箱 auto-boxing** —— 讀取原始值的屬性時，臨時做一個包裹物件、呼叫完就丟掉。

> [!important] 這是原本那份答案漏掉的關鍵機制
> 沒有自動裝箱，「基本型態沒有方法」與「字串可以呼叫方法」這兩件事就互相矛盾。
> 自動裝箱就是把這兩件事接起來的那座橋。

### d-1. 怎麼證明「用完就丟」

```js
const s = 'hello';
s.custom = '我塞得進去嗎';
console.log(s.custom);   // undefined ← 留不住！
```

**寫進去的東西留不住**，因為承接那次賦值的臨時物件，在那一行結束時就被丟棄了。

對照顯式包裝就留得住：

```js
const wrapped = Object('hello');
wrapped.custom = '這次留得住';
console.log(wrapped.custom);   // "這次留得住"
console.log(typeof wrapped);   // "object" ← 它是個物件，不是字串了
```

**這個 `Object('hello')` 就是包裹物件的真面目** —— 平常自動裝箱在背後偷偷做、做完就丟的那個東西，被你抓出來留住了。

### d-2. 嚴格模式下會直接報錯

```js
'use strict';
const s = 'hello';
s.custom = 'x';   // TypeError: Cannot create property 'custom' on string 'hello'
```

非嚴格模式靜默失敗、嚴格模式直接丟錯，跟 `writable: false` 的規則一樣。

---

## e. 包裹物件的兩個經典考題

**e-1. 相等比較**

```js
Object(1) == 1     // true   ← 寬鬆相等先做 ToPrimitive，valueOf 轉回 1
Object(1) === 1    // false  ← 嚴格相等第一步就比型別
typeof Object(1)   // "object"
```

**e-2. 真的會咬人的陷阱**

```js
const flag = new Boolean(false);
if (flag) {
  console.log('竟然進來了');   // 真的會印
}
```

因為**任何物件在布林情境都是 truthy**，包括 `new Boolean(false)`。

> [!warning] 結論
> 永遠不要用 `new Number`／`new String`／`new Boolean`。
> 要轉型就用不加 `new` 的 `Number(x)`／`String(x)`／`Boolean(x)`，那是型別轉換不是建立物件。

---

## f. 為什麼 Symbol 與 BigInt 不能 `new`

實測：

| 寫法 | 結果 |
| --- | --- |
| `new Number(1)` | ✔ 可以（但別用），`typeof` 是 `"object"` |
| `new String('a')` | ✔ 可以（但別用） |
| `new Boolean(1)` | ✔ 可以（但別用） |
| `new Symbol('a')` | ✘ `TypeError: Symbol is not a constructor` |
| `new BigInt(1)` | ✘ `TypeError: BigInt is not a constructor` |

`Number`／`String`／`Boolean` 是 **ES1 時代**的設計，為了向後相容留著。
而 `Symbol`（**ES2015**）與 `BigInt`（**ES2020**）是後來才加的 —— **設計時就記取教訓，直接禁止 `new`**，免得又生出一堆「`typeof` 是 object 的假數字」。

版本脈絡見 [[ECMAScript版本沿革-ES1到ES2026]]。

---

## g. 一句話總結

```
大寫 Symbol  =  製造機 ＋ 工具箱（內建建構函式）
小寫 sym     =  製造出來的零件（原始型別的值）
自動裝箱      =  讓零件「暫時」借用工具箱裡的方法，用完就丟
包裹物件      =  把那個臨時借來的東西留住（Object(x) 或 new Number(x)）
```

---

## 參考來源

| 來源 | 說明 |
| --- | --- |
| MDN｜Symbol | `new Symbol()` 為什麼丟 TypeError |
| MDN｜Object() constructor（2025-07-10 更新） | 包裹物件的四條分流 |
| Gemini 的初版回答 | 分層設計與三個角色的架構，本篇保留並補完 |
| 實測環境 Node.js v22（V8） | 2026-08-21 |

> [!note] 交叉驗證的結論
> 原答案**架構是對的**（分層設計、三個角色、一句話總結都正確），
> 補上的是 **d 節的自動裝箱** —— 沒有它，「基本型態沒有方法」與「字串能呼叫方法」會互相矛盾；
> 修正的是 **c 節的用詞**（全域物件 → 內建建構函式）。

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[Object建構子-plain-object的建立與存取]] | 分流 2 的包裹物件，本篇說明它平常在背後做什麼 |
| [[Symbol-符號型別與物件key]] | 小寫 `sym` 那一層的完整用法 |
| [[物件字面量語法-簡寫屬性與解構的方向對照]] | 同一次追問挖出來的另一半 |
| [[15-ToPrimitive-ToNumber-型別轉換抽象操作]] | `Object(1) == 1` 為什麼是 true 的底層規格 |
| [[ECMAScript版本沿革-ES1到ES2026]] | 為什麼 ES1 的三個能 `new`、ES2015 之後的不能 |
