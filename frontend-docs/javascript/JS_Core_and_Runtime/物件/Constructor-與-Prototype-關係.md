---
title: Constructor 與 Prototype 的關係
type: topic-note
source: Gemini
tags: [gemini, javascript, 物件, constructor, prototype]
sources:
  - https://gemini.google.com/app/258b7d126a454a6c
updated: 2026-06-20
---

# Constructor 與 Prototype 的關係

## 重點整理

- <mark style="background: #ADCCFFA6;">Constructor（建構式）</mark>：用來初始化新物件的函式，配合 `new` 關鍵字使用，就能產生新的<mark style="background: #FFF3A3A6;">物件實例(instance)</mark>。
- <mark style="background: #ADCCFFA6;">Prototype（原型）</mark>：一個<mark style="background: #FFF3A3A6;">共享的空間</mark>，裡面的方法與屬性可讓所有透過該建構式產生的實例一起使用，<mark style="background: #BBFABBA6;">節省記憶體</mark>（不必每個實例各存一份方法）。
- 一句話分工：**建構式負責建立實例，原型負責提供共享的功能。**

```js
function Person(name) {   // Constructor
  this.name = name;       // 每個實例各自擁有
}
Person.prototype.sayHi = function () {  // Prototype：所有實例共享
  console.log('Hi, ' + this.name);
};

const a = new Person('Abby');
const b = new Person('Joe');
a.sayHi(); // Hi, Abby
// a 和 b 共用同一個 sayHi（在 Person.prototype 上）
```

> 相關筆記：同層的 [[查看plain-object的prototype]]、[[Object靜態方法速查]]。

## 各對話來源

### JavaScript Constructor 与 Prototype（2026-06）— https://gemini.google.com/app/258b7d126a454a6c

**使用者：** 請問 constructor 跟 prototype 差在哪裡？（瀏覽函式類型筆記時提問）

**Gemini：** 筆記底部高亮了 Constructor 函式（建構式，用來產生物件實例）；prototype 與建構式密不可分但不在目前筆記範圍。

**使用者：** 我想要你現在跟我解釋。

**Gemini：** constructor 是用來初始化新物件的函式，配合 `new` 產生實例；prototype 是共享空間，方法/屬性可讓所有實例共用、節省記憶體。簡言之：建構式負責建立實例，原型負責提供共享功能。
