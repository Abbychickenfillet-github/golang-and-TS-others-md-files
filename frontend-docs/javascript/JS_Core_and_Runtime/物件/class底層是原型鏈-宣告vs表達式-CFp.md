---
title: class 底層是原型鏈：宣告 vs 表達式與 CFp
type: topic-note
source: Gemini
tags: [gemini, javascript, class, prototype]
sources:
  - https://gemini.google.com/app/bf2506b67407dd70
updated: 2026-10-30
---

# class 底層是原型鏈：宣告 vs 表達式與 CFp

## 重點整理

本篇重點 (a)–(f)，共 6 個。

### (a) class 的底層就是原型鏈 (Prototype Chain)
- class 是語法糖 (syntactic sugar)，沒有建立新的類別系統。
  - class 內定義的方法，JS 引擎會放到 `Person.prototype` 上，不會複製給每個實例 (instance)。
  - 實例 `p1` 只擁有自己的屬性 (如 `name`)，呼叫 `p1.sayHello()` 時透過內部連結 `[[Prototype]]` (常見寫法 `__proto__`) 去 `Person.prototype` 查找，這就是原型鏈查找。

```js
class Person {
  constructor(name) { this.name = name; }   // 建構子，new 時執行，設定實例自己的屬性
  sayHello() { console.log(`Hello, ${this.name}`); } // 放在 Person.prototype，不在 p1 身上
}
const p1 = new Person('Abby'); // new 建立實例，p1.[[Prototype]] 指向 Person.prototype
```

### (b) extends 做了兩條連結
- `class Dog extends Animal` 底層做兩件事：
  - 把 `Dog.prototype` 的 `[[Prototype]]` 指向 `Animal.prototype`，讓實例方法可繼承。
  - 把建構子 `Dog` 本身的 `[[Prototype]]` 指向 `Animal`，讓靜態方法 (static) 也能繼承。
- ⚠️ 存疑/更正：Gemini 原文說「把 Dog.prototype 指向 Animal.prototype」，精確說法是「Dog.prototype 這個物件的 [[Prototype]] 指向 Animal.prototype」，不是直接取代 Dog.prototype 本身。

### (c) class 宣告是陳述式，class 表達式才是表達式
- 表達式 (Expression)：能計算出一個值的程式碼。陳述式 (Statement)：執行動作的指令。
- `class Person {}` 是 ==類別宣告 (Class Declaration)==，屬於陳述式。
- `const User = class {}` 是 ==類別表達式 (Class Expression)==，可指派給變數、當引數傳遞。
- ⚠️ 存疑/更正：Gemini 回答「這算是一個表達式」並說單純 class 宣告可算類別表達式，容易混淆。依 MDN，宣告與表達式是兩種不同語法，宣告是陳述式。

### (d) C++ 的「重新編譯」 vs JS 的動態性
- C++ 是編譯型語言 (Compiled Language)：編譯器先把原始碼翻成機器碼，class 的記憶體大小、屬性位置、虛擬函式表 (vtable) 在編譯期就固定。
  - 想增加屬性或方法，必須改原始碼後重新編譯 (Recompile)。
- JS 在執行期 (Runtime) 可動態加屬性，也可用 `Object.setPrototypeOf` 改原型。
- C++ 的 prototype 指「函式原型 (Function Prototype，先宣告函式簽名)」，與 JS 物件原型無關；設計模式的 Prototype Pattern 是複製物件的手法，也不是語言機制。

### (e) CFp 的意思
- ECMA-262 規格圖 (Object/Prototype Relationships) 中：CF = Constructor Function (建構子函式)，CFp = CF 的 prototype 物件 (即 `CF.prototype`)。
- CF 有 `prototype` 屬性指向 CFp，`new CF()` 產生的 cf1、cf2、cf3 的 `[[Prototype]]` 都指向 CFp，所以共享 CFp 上的屬性與方法。

### (f) 關聯筆記
- 圖解與更多細節：[[Constructor-與-Prototype-關係]]、[[函式的兩條線-prototype屬性與Prototype原型]]、[[原型鏈階數-互動版]]。
  - 關聯原因：本篇是入門問答，上述筆記對「prototype 屬性」與「[[Prototype]]」兩條線有完整圖解。

## 各對話來源

### JavaScript 與原型基礎 (2026-10-30 抓取) — https://gemini.google.com/app/bf2506b67407dd70
- 使用者：CLASS有沒有原型鏈的概念
- Gemini：有，class 底層就是原型鏈的另一種寫法，方法放在 prototype，extends 以原型鏈繼承 (詳見 a、b)。
- 使用者：這算表達式嗎
- Gemini：說明表達式與陳述式，並舉類別表達式範例 (見 c，含存疑)。
- 使用者：但class不就是有一個基本原型的東西嗎不太懂重新編譯是指什麼
- Gemini：解釋 C++ 編譯期固定 vs JS 執行期動態 (見 d)。
- 使用者：CFp是什麼意思
- Gemini：CF.prototype，見 e。

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| class 與 extends | [MDN: Classes](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Classes) | MDN 持續更新，本次未逐字重新查證(2026-10-30) |
| 類別表達式 | [MDN: class expression](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Operators/class) | 同上 |
| 原型鏈 | [MDN: Inheritance and the prototype chain](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) | 同上 |
| CFp 圖 | [ECMA-262 規格](https://tc39.es/ecma262/) | 規格每年更新，對話所見圖為 Object/Prototype Relationships |
