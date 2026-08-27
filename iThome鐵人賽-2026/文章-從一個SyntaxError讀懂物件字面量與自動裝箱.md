---
title: "從一個 SyntaxError 讀懂物件字面量：為什麼錯誤訊息要跟我講「簡寫屬性」？"
series: 從 JS 核心機制到 React 核心原理：30天打造穩固的前端基本功
type: article-draft
tags: [ithome, 鐵人賽, javascript, object-literal, destructuring, autoboxing, symbol]
updated: 2026-08-21
---

# 從一個 SyntaxError 讀懂物件字面量：為什麼錯誤訊息要跟我講「簡寫屬性」？

> 純 Markdown 格式，沒有用 Obsidian 的 callout 與 highlight 語法，可以直接貼到 iThome。

## 這篇要幹嘛

我在寫 Symbol 的練習檔時打錯字，噴出這行：

```
SyntaxError: Invalid shorthand property initializer
```

翻成中文是「無效的簡寫屬性初始化」。當下的反應是：**我根本沒寫簡寫屬性啊？**

追下去才發現，這行訊息其實在提示一件很有意思的事 —— **物件字面量跟解構賦值長得幾乎一樣，但它們是相反方向的兩件事**，而引擎在報錯的當下，正在猜你想寫哪一種。

順著這個誤會往下挖，還能一路挖到「為什麼字串明明是原始型別，卻可以呼叫 `.toUpperCase()`」。

---

## 一、先看那段錯誤程式碼

```js
const id = Symbol("id");

const user2 = {
    name = "Christine",     // ← 這裡
    [id] = 9453;            // ← 還有這裡
};
```

兩個問題：**用了 `=` 而不是 `:`**，以及**用了 `;` 而不是 `,`**。

正確寫法：

```js
const user2 = {
    name: "Christine",
    [id]: 9453,
};
```

物件字面量的規則很單純：**冒號配對、逗號分隔**。`=` 是賦值運算子，只能用在陳述式裡（`obj.name = "x"`）。

但如果規則這麼單純，錯誤訊息為什麼不是「這裡應該用冒號」，而是「無效的簡寫屬性初始化」？

---

## 二、簡寫屬性是什麼

ES2015 之後，當**屬性名跟變數名一樣**時可以只寫一次：

```js
const name = "Abby";
const age = 20;

const user = { name, age };          // 簡寫屬性 shorthand property
// 等價於
const user = { name: name, age: age };
```

這就是「簡寫屬性」。所以引擎的推理是這樣的：

1. 看到 `{ name` → 猜「喔，他要用簡寫屬性」
2. 看到後面接了 `=` → 「等等，簡寫屬性不能有初始值啊」
3. 報錯：**Invalid shorthand property initializer**

引擎沒有猜錯方向，它只是**先猜了簡寫，才發現後面接不上**。

---

## 三、但為什麼引擎會覺得「可能有初始值」？

因為**在另一個地方，`{ name = "預設值" }` 是完全合法的**。

那個地方就是**解構賦值 destructuring**：

```js
const 來源 = { a: 1 };

const { a, b = "我是預設值" } = 來源;
console.log(b);   // "我是預設值"  ← 完全合法
```

解構的時候，`=` 的意思是「**如果來源裡沒有這個屬性，就用這個預設值**」。

所以 `{ name = "Christine" }` 這串字**在解構的位置是對的，在建立物件的位置是錯的**。引擎在還沒讀到後面的 `=` 或 `;` 之前，其實分不出你在寫哪一種。

---

## 四、關鍵：兩者長得一樣，但方向相反

這是我覺得最值得記的一張表：

```js
// 建立 —— 把變數「放進去」
const o = { name, age };

// 取出 —— 把值「拿出來」
const { name, age } = o;
```

**同一組大括號語法，出現在 `=` 左邊是「拆」，出現在 `=` 右邊是「組」。**

語法差異對照：

| 寫法 | 建立物件（`=` 右邊） | 解構賦值（`=` 左邊） |
| --- | --- | --- |
| `{ name }` | 簡寫屬性，等於 `{ name: name }` | 取出 `name` 存成同名變數 |
| `{ name: x }` | key 是 `name`，值是變數 `x` | 取出 `name`，**改名**存成 `x` |
| `{ name = "預設" }` | **語法錯誤** | 合法，代表預設值 |
| `{ [key]: 值 }` | 計算屬性名 | 用變數當 key 來取 |

注意第二列 —— **`{ name: x }` 在兩邊的意思完全不同**。建立的時候冒號右邊是「值」，解構的時候冒號右邊是「新變數名」。這也是初學很容易卡住的地方。

---

## 五、第二個錯誤：宣告時不能帶中括號

原本那段還有一行：

```js
const object_id[id] = id;
// SyntaxError: Missing initializer in const declaration
```

正確寫法要分兩步，或用計算屬性名一次寫完：

```js
// 兩步
const object_id = {};
object_id[id] = id;

// 一步
const object_id = { [id]: id };
```

原因很直接：`const 名字 = 值` 的「名字」只能是一個**乾淨的識別字**。`object_id[id]` 是「存取某個既有物件的屬性」，那是**運算**不是**宣告** —— 而且那個物件在那一行的當下根本還不存在。

---

## 六、順著 Symbol 挖下去：大寫的 Symbol 跟小寫的 sym 是什麼關係

那段練習碼在玩 Symbol，剛好帶出一個更根本的問題：

**JavaScript 為什麼要把「基本型態」跟「內建建構函式」分開設計？**

基本型態（`123`、`"hello"`、`Symbol()`）在記憶體裡要**極輕量**，才跑得快。但開發者又需要工具函式來操作它們。所以設計成兩層：

| 層 | 是什麼 | 例子 |
| --- | --- | --- |
| **值** 小寫的 `sym` | 真正拿來當 key 的基本型態零件 | `const sym = Symbol("id")` |
| **建構函式** 大寫的 `Symbol` | 製造機兼工具箱 | `Symbol.for()`、`Symbol.iterator` |

大寫的 `Symbol` 扮演三個角色：

1. **建立 Symbol 值的唯一入口** —— 因為 `new Symbol()` 會直接丟 `TypeError`，你只能呼叫 `Symbol()`
2. **全域註冊表的入口** —— 跨檔案要共享同一個 Symbol 得用 `Symbol.for("key")` 與 `Symbol.keyFor(sym)`
3. **系統內建的通訊協定** —— `Symbol.iterator`、`Symbol.toStringTag` 這些。你寫 `for...of` 時，引擎底層就是去找物件上的 `Symbol.iterator`

一句話：**大寫是製造機與工具箱，小寫是製造出來的零件。**

### 一個用詞上的小提醒

很多文章把 `Symbol`、`Number`、`String` 統稱「全域物件」。這不算錯 —— 它們確實是全域物件的屬性：

```js
globalThis.Symbol === Symbol   // true
```

但「全域物件」這個詞通常是指 `globalThis` 本身（瀏覽器裡的 `window`）。講到 `Symbol`、`Number` 這一層，比較精準的說法是**內建建構函式 built-in constructor**：

```js
typeof Symbol       // "function"  ← 它是個函式
typeof globalThis   // "object"    ← 這個才是全域物件
```

面試時用詞精準一點會加分。

---

## 七、那字串為什麼可以呼叫方法？

上面說「基本型態身上沒有方法」，但這行明明會動：

```js
const s = "hello";
s.toUpperCase();   // "HELLO"
```

**因為引擎做了自動裝箱 auto-boxing** —— 讀取原始值的屬性時，臨時做一個包裹物件、呼叫完就丟掉。

怎麼證明「用完就丟」？看這個：

```js
const s = "hello";
s.custom = "我塞得進去嗎";
console.log(s.custom);   // undefined
```

**寫進去的東西留不住**，因為承接那次賦值的臨時物件，在那一行結束時就被丟棄了。

對照顯式包裝就留得住：

```js
const wrapped = Object("hello");
wrapped.custom = "這次留得住";
console.log(wrapped.custom);   // "這次留得住"
console.log(typeof wrapped);   // "object"  ← 它是個物件，不是字串了
```

這個 `Object("hello")` 就是**包裹物件 wrapper object** —— 平常自動裝箱在背後偷偷做、做完就丟的那個東西，被你抓出來留住了。

### 順帶一個經典考題

```js
Object(1) == 1     // true   ← 寬鬆相等會先做 ToPrimitive，valueOf 轉回 1
Object(1) === 1    // false  ← 嚴格相等第一步就比型別，object vs number
typeof Object(1)   // "object"
```

以及一個真的會咬人的陷阱：

```js
const flag = new Boolean(false);
if (flag) {
  console.log("竟然進來了");   // 真的會印出來
}
```

因為**任何物件在布林情境都是 truthy**，包括 `new Boolean(false)`。所以永遠不要用 `new Number`／`new String`／`new Boolean`。

### 為什麼 Symbol 不能 new

```js
new Number(1)     // 可以（但別用）
new String("a")   // 可以（但別用）
new Boolean(1)    // 可以（但別用）
new Symbol("a")   // TypeError: Symbol is not a constructor
new BigInt(1)     // TypeError: BigInt is not a constructor
```

`Number`／`String`／`Boolean` 是 ES1 時代的設計，為了向後相容留著。而 `Symbol`（ES2015）與 `BigInt`（ES2020）是後來才加的 —— **設計的時候就記取教訓，直接禁止 `new`**，免得又生出一堆「typeof 是 object 的假數字」。

---

## 八、回頭看那個錯誤訊息

現在再讀一次：

```
SyntaxError: Invalid shorthand property initializer
```

它其實在說：「**你這個位置我判斷成簡寫屬性了，但簡寫屬性後面不能接 `=`。你是不是想寫解構？**」

錯誤訊息不是在罵你，是在告訴你**引擎當下猜到哪一步**。看懂它猜的方向，往往比看懂錯誤本身更有用。

---

## 九、今天的重點

1. **物件字面量：冒號配對、逗號分隔。** `=` 只能用在陳述式
2. **簡寫屬性 `{ name }` 是「建立」，解構 `{ name }` 是「取出」** —— 同一組語法，方向相反
3. **`{ name = "預設" }` 在解構那邊合法、在建立這邊不合法**，這就是那個錯誤訊息的來源
4. **`const 名字 = 值` 的名字只能是識別字**，不能帶 `[]` 存取
5. **大寫的 `Symbol` 是製造機與工具箱，小寫的 `sym` 是零件**
6. **自動裝箱讓原始值可以呼叫方法**，但臨時物件用完就丟 —— `s.custom = x` 之後讀回來是 `undefined` 就是證據
7. **`Symbol` 與 `BigInt` 不能 `new`**，因為它們是記取教訓之後才設計的

---

## 明天

`this` 到底是什麼時候決定的？為什麼箭頭函式沒有自己的 `this`？

這題直接決定你能不能講清楚「class component 為什麼要 bind、hooks 為什麼不用」—— 那是 React 面試最常見的分水嶺題。

---

## 參考來源

| 來源 | 說明 |
| --- | --- |
| MDN｜Object initializer | 物件字面量的完整語法，含簡寫屬性與計算屬性名 |
| MDN｜Destructuring assignment | 解構的預設值語法 |
| MDN｜Symbol | `new Symbol()` 為什麼丟 TypeError |
| MDN｜Object() constructor | 包裹物件的四條分流 |

本篇所有輸出都在 Node.js v22 實際執行驗證過，不是憑記憶寫的。
