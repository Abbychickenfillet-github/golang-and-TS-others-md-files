---
title: 物件 — configurable 這把鎖，與 Object.defineProperty 的實務用途
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, 物件, property-descriptor, configurable, writable, enumerable, defineProperty]
sources:
  - https://gemini.google.com/app/2e7949bbfd10a5aa
  - https://gemini.google.com/app/8df708d3627625d9
related:
  - "[[物件-PropertyDescriptor完整拆解]]"
  - "[[嚴格模式-PropertyDescriptor-與JSON的關係]]"
  - "[[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]]"
  - "[[Object靜態方法速查]]"
updated: 2026-09-21
---

# 物件 — configurable 這把鎖，與 Object.defineProperty 的實務用途

本篇重點 a–n，共 14 個

> 這篇補的是 [[物件-PropertyDescriptor完整拆解]] 沒展開的兩個實務問題：
> 	一是「configurable 到底鎖住什麼」，二是「既然這麼精細，為什麼專案裡幾乎看不到有人寫 `Object.defineProperty`」。
> 關聯原因：那篇拆的是 descriptor 有哪幾個欄位（結構面），這篇問的是這些欄位鎖起來之後會發生什麼事（行為面），兩篇要對照看才完整。

---

## 一、主軸圖：configurable 擋住哪幾條路

![[學習JS_圖解_configurable這把鎖擋住哪幾條路-ISO5807_2026-09-21.svg]]

（a）看圖的順序是：<mark style="background: #FFF3A3A6;">先問 configurable 是不是 false，是的話再逐欄檢查你想改哪一格</mark>，三個出口分別是「全部擋掉」「writable 例外」「value 例外」。之後同主題追問，請直接指回這張圖的某個方框。

---

## 二、defineProperty 的第三個參數是一份「設定檔」

（b）`Object.defineProperty(obj, key, descriptor)` 一共吃三個引數：<mark style="background: #ADCCFFA6;">第一個是目標物件、第二個是屬性名稱、第三個是描述器物件（descriptor）</mark>。

（c）<mark style="background: #FF5582A6;">`value`、`writable`、`enumerable`、`configurable` 不是 JavaScript 的保留字（reserved word）</mark>。
	它們只是 `Object.defineProperty` 這支函式「約定會去讀」的四個 key 名稱。
	你完全可以寫 `const value = 1`，引擎不會抱怨；只有當這四個名字出現在 descriptor 物件裡的時候，引擎才會把它們當設定值解讀。

（d）誰對誰做什麼：<mark style="background: #BBFABBA6;">你把一個普通物件字面值（descriptor）交給 `Object.defineProperty`，`Object.defineProperty` 讀出裡面這四個 key，再把讀到的設定寫進該屬性在引擎內部的 property slot，最後回傳被修改過的那個物件本身。</mark>

| descriptor 欄位 | 這一欄管什麼 | 沒寫的話預設值 |
| --- | --- | --- |
| `value` | 屬性實際存的值 | `undefined` |
| `writable` | 這個值能不能被重新賦值 | `false` |
| `enumerable` | 能不能被 `for...in` 與 `Object.keys` 列舉出來 | `false` |
| `configurable` | 能不能被 `delete`，以及能不能再被 `defineProperty` 改設定 | `false` |

（e）<mark style="background: #FF5582A6;">用 `defineProperty` 新增屬性時，三個布林欄位的預設值全是 `false`</mark>，跟用 `obj.a = 10` 直接賦值（三個都是 `true`）剛好相反。這是最容易踩到的一個坑。

---

## 三、configurable: false 鎖住什麼、又放行什麼

（f）鎖住的三件事：
	1. <mark style="background: #FF5582A6;">不能 `delete obj.prop`</mark>，屬性拔不掉（嚴格模式下會丟 `TypeError`，非嚴格模式下 `delete` 只是靜靜回傳 `false`）。
	2. 不能再用 `Object.defineProperty` 改它的特徵，例如把 `enumerable: false` 改回 `true`。
	3. 不能把「資料屬性（data property）」換成「存取器屬性（accessor property，也就是 `get` / `set`）」，反方向也不行。

（g）放行的兩個例外：
	1. <mark style="background: #BBFABBA6;">`writable` 可以從 `true` 改成 `false`</mark>，但不能從 `false` 改回 `true`。規則的方向是單行道：只准往更嚴格走。
	2. <mark style="background: #BBFABBA6;">只要 `writable` 還是 `true`，`obj.a = 20` 這種一般賦值照樣成功</mark>。

（h）一句話收斂：<mark style="background: #FFF3A3A6;">`configurable` 鎖的是「屬性的結構與規則」，不是「屬性的值」。要把值鎖死，得另外把 `writable` 設成 `false`。</mark>

（i）搭配截圖對照著看會更快：

![[學習JS_截圖_Console_writable不是能不能寫的總開關_2026-09-20.png]]

![[學習JS_截圖_Console_enumerable-false讓誰看不見_2026-09-20.png]]

---

## 四、那為什麼實務專案裡幾乎看不到 defineProperty

（j）因為<mark style="background: #FFF3A3A6;">日常寫業務邏輯時，根本沒有「要求屬性不可刪、不可列舉」的需求</mark>。物件字面值 `{ a: 10 }` 一行就寫完，而且讀的人一眼就懂；`defineProperty` 要多寫五行，換來的控制力在一般 CRUD 頁面上用不到。

（k）換句話說，`defineProperty` 不是「進階寫法」而是「特殊需求才出場的工具」。真正會用到它的場合有三類：

| 使用場合 | 為什麼非它不可 | 典型例子 |
| --- | --- | --- |
| 保護函式庫或框架的核心欄位 | 不希望使用者不小心 `delete` 掉或改壞設定 | Vue 2 的響應式系統就是用 getter / setter 攔截讀寫 |
| 做出唯讀常數或受控更新的欄位 | 需要「值可以換、屬性不能被刪」這種混搭組合 | `writable: true` 搭 `configurable: false` |
| 加上隱藏欄位不想污染列舉 | 要讓 `Object.keys` 與 `JSON.stringify` 看不到它 | 內部快取、內部 id |

（l）<mark style="background: #D2B3FFA6;">引擎自己內建的屬性，就是靠這四個欄位設定出來的</mark>。例如 `Math.PI` 的 descriptor 是 `{ writable: false, enumerable: false, configurable: false }`，所以你既改不了 π 的值也刪不掉它。

---

## 五、⚠️ 存疑／更正

（m）<mark style="background: #FF5582A6;">⚠️ 更正：Gemini 把「`Math.PI` 與 `Array` 的 `length`」擺在一起，說兩者都是靠 `writable: false` 保護的，這對 `length` 來說是錯的。</mark>
	陣列實例的 `length` 是 `{ writable: true, enumerable: false, configurable: false }`。
	所以 `arr.length = 0` 是合法的（這正是清空陣列的老寫法），只是你刪不掉 `length` 這個屬性。
	自己在 Console 驗一次：`Object.getOwnPropertyDescriptor([1,2,3], 'length')`。

（n）<mark style="background: #D2B3FFA6;">備註：Gemini 說「Vue、React 用這些設定保護核心屬性」，這句話對 Vue 2 成立（`Object.defineProperty` 正是 Vue 2 響應式的實作核心），但 Vue 3 已改用 `Proxy`，React 從來就不是靠 `defineProperty` 做狀態追蹤的。</mark>不要把三者混為一談。

---

## 六、自己動手

配套程式碼：`demo-configurable.js`（同一層資料夾，跑 `node demo-configurable.js`）

```js
'use strict';

const obj = {};

Object.defineProperty(obj, 'a', {
  value: 10,
  writable: true,
  enumerable: true,
  configurable: false,   // 上鎖
});

// 1. 想刪除 → 嚴格模式下直接丟 TypeError
try {
  delete obj.a;
} catch (e) {
  console.log('刪除失敗：', e.constructor.name);  // TypeError
}
console.log('a 還在嗎 →', obj.a);                 // 10

// 2. 想改 enumerable → TypeError
try {
  Object.defineProperty(obj, 'a', { enumerable: false });
} catch (e) {
  console.log('改設定失敗：', e.constructor.name); // TypeError
}

// 3. 想改 value → 成功，因為 writable 還是 true
obj.a = 20;
console.log('值可以換 →', obj.a);                  // 20

// 4. writable 是單行道：true → false 可以
Object.defineProperty(obj, 'a', { writable: false });
try {
  Object.defineProperty(obj, 'a', { writable: true });
} catch (e) {
  console.log('false 改回 true 失敗：', e.constructor.name); // TypeError
}

// 5. 更正示範：陣列的 length 是 writable: true
console.log(Object.getOwnPropertyDescriptor([1, 2, 3], 'length'));
// { value: 3, writable: true, enumerable: false, configurable: false }
```

---

## 七、延伸練習

LeetCode 與 NeetCode 沒有直接對應 property descriptor 的題目（這是語言特性而非演算法），最接近的是 <mark style="background: #D2B3FFA6;">JavaScript 專區的物件操作題</mark>：

- [LeetCode 2648. Generate Fibonacci Sequence](https://leetcode.com/problems/generate-fibonacci-sequence/)（練 generator 與物件協定，同樣是「引擎約定會讀哪些 key」的思路）
- [LeetCode 2634. Filter Elements from Array](https://leetcode.com/problems/filter-elements-from-array/)（練不用內建方法自己走訪，會碰到 `length` 是 `writable: true` 這件事）

---

## 八、各對話來源（原文）

### Object.defineProperty 的用途與解析（2026-09-21 擷取）— https://gemini.google.com/app/2e7949bbfd10a5aa

使用者：（語音輸入，原文有辨識錯字）property descriptor 屬性的細節，我在實際的專案裡面很少看到這個寫法，可是它可以控制這麼多精細的細節，為什麼很少人用呢？是不是因為沒有特別要求？

Gemini：確實是因為大多數情況下並不需要那麼複雜的控制。平常我們定義物件，直接用大括號的字面意義寫法就足夠了，既簡潔又直觀。`Object.defineProperty` 通常是用在需要特別處理的時候，比如設定屬性為唯讀、不能被枚舉，或者需要寫入 getter 和 setter 時才會用到。

### JavaScript 物件屬性查詢與遍歷方法（2026-09-21 擷取）— https://gemini.google.com/app/8df708d3627625d9

使用者：（語音輸入）那個 configurable 是什麼意思？

Gemini：在 JavaScript 的屬性描述器（Property Descriptor）中，`configurable` 控制該屬性是否可以被修改屬性設定以及是否可以被刪除。當 `configurable: false` 時：無法刪除（不能用 `delete obj.prop`）、無法修改屬性特徵（無法再透過 `Object.defineProperty()` 改變設定）、無法切換屬性類型（不能把 data property 改成 accessor property，反之亦然）。唯一的例外狀況：可以將 `writable` 從 `true` 改為 `false`（但無法從 `false` 改回 `true`）；只要該屬性的 `writable` 是 `true`，即使 `configurable` 是 `false`，依然可以隨意修改它的值。簡而言之，`configurable` 就像是這個屬性架構的鎖：一旦鎖上，這個屬性的結構與規則就幾乎被定型，無法被輕易重新定義或刪除。

使用者：所以是說這些方法在 `Object.defineProperty()` 的 data descriptor 是 `writable: false, enumerable: false, configurable: false` 這樣嗎？`value`、`writable`、`enumerable`、`configurable` 這 4 個是類似保留字嗎？因為你在這邊設定這些屬性值給 a，變成深層巢狀結構，用意是什麼？

Gemini：它們不是 JavaScript 的保留字，而是 `Object.defineProperty()` 專用的特定屬性名稱（Key）。當您傳入第 3 個參數（描述器物件）給 `Object.defineProperty` 時，JavaScript 引擎會去讀取這個物件裡面是否有這 4 個特定的名稱。至於設定成這樣的用意：① 保護核心資料不被意外修改或刪除（封裝性與安全性），在開發大型專案或套件時，某些重要物件的屬性是系統運作的核心；② 實現 DOM 或瀏覽器內建 API 的行為，例如 `Math.PI` 的 `writable: false` 且 `configurable: false`，所以你無法修改 π 的值，也無法刪除它；③ 建立唯讀或特定存取規則的屬性，例如 `writable: true, configurable: false` 代表這個屬性的值可以隨意更新，但永遠會留在物件上。

---

## 九、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Object.defineProperty 與 descriptor 四欄位 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty | MDN，2026-09-21 查證 |
| Property descriptor 預設值與 configurable 規則 | https://tc39.es/ecma262/#sec-validateandapplypropertydescriptor | ECMA-262 規範（ValidateAndApplyPropertyDescriptor），2026-09-21 查證 |
| Math.PI 的 descriptor | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/PI | MDN，2026-09-21 查證 |
| 陣列 length 是 writable | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length | MDN，2026-09-21 查證 |
| Gemini 對話原文 | https://gemini.google.com/app/2e7949bbfd10a5aa ／ https://gemini.google.com/app/8df708d3627625d9 | 2026-09-21 擷取 |
