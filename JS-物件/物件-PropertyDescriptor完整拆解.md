---
title: 物件 — Property Descriptor 完整拆解
date: 2026-09-20
tags:
  - JavaScript
  - 物件
  - property-descriptor
  - getter-setter
  - MDN
related:
  - "[[物件-configurable這把鎖與defineProperty實務用途]]"
  - "[[嚴格模式-PropertyDescriptor-與JSON的關係]]"
---

# 物件 — Property Descriptor 完整拆解

> 這篇是從 [[嚴格模式-PropertyDescriptor-與JSON的關係]] 拆出來的「物件」面向。
> 那篇談的是 descriptor 跟 JSON 的關係，這篇只談 **物件的每一個 property 到底由哪些欄位組成**。

配套檔案：
- `物件-PropertyDescriptor-互動筆記.html`（Obsidian 用 HTML Reader 外掛開）
- `demo-property-descriptor.js`（`node demo-property-descriptor.js`）

---

## 零、先回答：這段程式碼出現在 MDN 的哪裡

```js
var a = {};
Object.defineProperties(a, {
    'name': { value:'fillano', writable:false, enumerable:false, configurable:false },
    'age' : { value:30,        writable:true,  enumerable:true,  configurable:false }
});
```

**誠實的答案：這段程式碼本身不在 MDN 上。**

`fillano` 是作者自己的名字，這是 **fillano 的 ES5 介紹文**（約 2011 年，iT 邦幫忙／個人部落格）裡自己寫的範例。
但它示範的語法跟概念在 MDN 上有明確對應的章節：

| 原文在講的事 | MDN 對應頁面與章節 |
| --- | --- |
| `Object.defineProperties(obj, {...})` 這個方法本身 | [Object.defineProperties()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties) |
| `value` / `writable` / `enumerable` / `configurable` 四個欄位的意思與預設值 | [Object.defineProperty() → Description](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#description) |
| Data descriptor 與 Accessor descriptor 互斥 | [Object.defineProperty() → Description](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#description) |
| 第二段那種 `get` / `set` 寫法 | [Working with objects → Defining getters and setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects#defining_getters_and_setters) |
| descriptor 這個資料結構的完整定義 | [Object.getOwnPropertyDescriptor()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor) |
| 屬性在語言層的定位 | [Property (JavaScript) — MDN Glossary](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) |

MDN 在 `Object.defineProperty()` 的 Description 裡是這樣寫的（原文引述）：

> "A **data descriptor** is a property with a value that may or may not be writable. An **accessor descriptor** is a property described by a getter-setter pair of functions. A descriptor must be one of these two flavors; **it cannot be both**."
>
> "If a descriptor is both a data descriptor (because it has `value` or `writable`) and an accessor descriptor (because it has `get` or `set`), **an exception is thrown**."

---

## 一、再回答：這算 getter 跟 setter 嗎

**不算。你貼的這一段完全沒有 getter 跟 setter。**

這是一個很值得釐清的分界：

a. 你貼的這段用的是 `value` 跟 `writable` → 這叫 **Data Descriptor（資料描述符）**，屬性背後就是一格死的值。

b. 原文**下一段**才用 `get` 跟 `set` → 那個才叫 **Accessor Descriptor（存取描述符）**，屬性背後是一對函式。

c. 一個 property **只能是其中一種**，不能兩種都是。

所以你的分類直覺方向是對的（這確實是「物件」相關的筆記），但精確地說：
**這篇的主題是「property descriptor」，getter/setter 只是 descriptor 的其中一種形態。**

---

## 二、最重要的澄清：`writable` 不是「能不能寫」的總開關

你問的是：

> 「`writable: true` 代表可以覆寫，拿掉是寫成 `writable: false` 還是完全不寫？拿掉也很奇怪啊，你要可以寫才能 get 或 set 吧？」

**答案是：完全不寫。而且不寫不等於 `writable: false`。**

這裡有一個很容易卡住的觀念，拆成三點：

### a. `writable` 這個欄位只存在於 data descriptor 上，accessor descriptor 根本沒有這一格

不是「預設 false」，是「這個欄位不存在」。實測印出來的 descriptor 只有四個欄位：

```js
const e = {};
let _v = 'fillano';
Object.defineProperty(e, 'name', {
  get() { return _v; },
  set(x) { _v = x; },
  enumerable: true,
  configurable: true
});

Object.getOwnPropertyDescriptor(e, 'name')
// { get: [Function], set: [Function], enumerable: true, configurable: true }
//   ↑ 沒有 value，也沒有 writable，引擎不會幫你補上
```

### b. 有沒有 `set` 函式，才是 accessor 屬性「能不能寫」的答案

```js
e.name = '改成功了';
e.name                  // '改成功了'   ← 沒有 writable 照樣寫得進去
```

寫入能不能成功，看的是**你有沒有提供 `set` 函式**，不是看 `writable`。

### c. 只有 `get` 沒有 `set` 才是真正的唯讀

```js
const f = {};
Object.defineProperty(f, 'ro', { get() { return 1; }, enumerable: true });

f.ro = 999;  f.ro       // 1      ← 非嚴格模式，靜靜失敗
(function(){ 'use strict'; f.ro = 999; })()
// TypeError: Cannot set property ro of #<Object> which has only a getter
```

### d. 用一句話記住兩組欄位的分工

| 你想表達的意思 | data descriptor 用 | accessor descriptor 用 |
| --- | --- | --- |
| 這個屬性存什麼 | `value` | `get` 函式的回傳值 |
| 能不能被寫 | `writable: true / false` | 有沒有給 `set` 函式 |

**所以「你要可以寫才能 get 或 set」這個推論，是把兩套機制混在一起了。**
`writable` 管的是 data 屬性的賦值；`set` 管的是 accessor 屬性的賦值。它們是**兩條平行的路**，不是一個在管另一個。

![[學習JS_截圖_Console_writable不是能不能寫的總開關_2026-09-20.png]]

---

## 三、Descriptor 六個欄位完整表

| 欄位 | 屬於哪一組 | 意思 | 字面值 `{}` 建立時 | `defineProperty` 沒寫時 |
| --- | --- | --- | --- | --- |
| `value` | Data | 值本身 | 你給的值 | `undefined` |
| `writable` | Data | 能不能用賦值改值 | `true` | `false` |
| `get` | Accessor | 讀取時呼叫的函式 | 無 | `undefined` |
| `set` | Accessor | 寫入時呼叫的函式 | 無 | `undefined` |
| `enumerable` | 共用 | 能不能被列舉 | `true` | `false` |
| `configurable` | 共用 | 能不能刪除或重設說明書 | `true` | `false` |

MDN 原文對這個差別的描述（`Object.defineProperty()` 頁面）：

```js
// 一般賦值：三個開關全開
o.a = 1;
// 等同於
Object.defineProperty(o, "a", { value: 1, writable: true, configurable: true, enumerable: true });

// defineProperty 沒寫的一律 false
Object.defineProperty(o, "a", { value: 1 });
// 等同於
Object.defineProperty(o, "a", { value: 1, writable: false, configurable: false, enumerable: false });
```

**這是最容易踩的坑**：`defineProperty` 建出來的屬性預設是唯讀、不可列舉、不可刪。

---

## 四、四種組合矩陣

| `writable` | `configurable` | 結果 |
| --- | --- | --- |
| `true` | `true` | 完全正常的一般屬性 |
| `true` | `false` | 值可以改，但不能刪、不能改說明書 |
| `false` | `true` | **鎖不住** —— 還能用 `defineProperty` 重新給值繞過去 |
| `false` | `false` | **真正的常數屬性**，改不了、刪不了、重設不了 |

實測第三列的「鎖不住」：

```js
const b = {};
Object.defineProperty(b, 'name', { value: 'fillano', writable: false, configurable: true });
Object.defineProperty(b, 'name', { value: '被改掉了' });   // configurable:true 就繞過去了
b.name    // '被改掉了'
```

實測第四列（原文 `a.name` 的設定）：

```js
a.name = '改掉';                                  // 非嚴格：靜默失敗
(function(){ 'use strict'; a.name = '改掉'; })()  // TypeError: Cannot assign to read only property 'name'
delete a.name;                                    // 沒用，a.name 還是 'fillano'
Object.defineProperty(a, 'name', { value: 'X' }); // TypeError: Cannot redefine property: name
a.name                                            // 'fillano'  ← 永遠是它
```

---

## 五、`enumerable` 的可見性對照表

「`enumerable: false` 代表 `for...in`、`Object.keys()`、`JSON.stringify()` 對它沒有作用」——
這句話**方向對，但措辭要修一下**：不是「那些方法對它沒有作用」，而是**那些方法根本看不到它**。
它還在物件上，好端端地，只是不參與列舉。

![[學習JS_截圖_Console_enumerable-false讓誰看不見_2026-09-20.png]]

### a. 看不見它的（全部都是「列舉」類操作）

| 操作 | 結果 | 備註 |
| --- | --- | --- |
| `for...in` | `['age']` | 而且它**會走原型鏈**，這點跟下面幾個不同 |
| `Object.keys(a)` | `['age']` | own + enumerable |
| `Object.values(a)` | `[30]` | 同上 |
| `Object.entries(a)` | `[['age', 30]]` | 同上 |
| `JSON.stringify(a)` | `{"age":30}` | own + enumerable + 字串鍵 |
| `{ ...a }`（展開運算子） | `{age: 30}` | 只複製可列舉的 |
| `Object.assign({}, a)` | `{age: 30}` | 只複製可列舉的 |

### b. 照樣看得見它的（全部都是「直接問」類操作）

| 操作 | 結果 |
| --- | --- |
| `a.name` | `'fillano'` |
| `'name' in a` | `true` |
| `a.hasOwnProperty('name')` | `true` |
| `Object.getOwnPropertyNames(a)` | `['name', 'age']` |
| `Reflect.ownKeys(a)` | `['name', 'age']` |
| `Object.getOwnPropertyDescriptor(a, 'name')` | 完整的 descriptor |

**所以 `enumerable: false` 是「隱藏」不是「保護」。** 真正的機密不該進到這個物件裡。

### c. `for...in` 跟 `Object.keys` 的關鍵差異：原型鏈

```js
function Parent(){}
Parent.prototype.inherited = 1;
const c = new Parent();
c.own = 2;

for (const k in c) ...   // ['own', 'inherited']   ← 走上原型鏈了
Object.keys(c)           // ['own']                ← 只看 own
```

這也解釋了為什麼老教科書會叫你在 `for...in` 裡加 `hasOwnProperty` 檢查。

---

## 六、「own」到底是什麼意思

`own property`（自有屬性）＝**這一格是刻在這個物件身上的**，不是從原型鏈繼承來的。

```js
const proto = { fromProto: 'A' };
const d = Object.create(proto);   // d 的原型是 proto
d.normal = 'B';
```

- `d.fromProto` 讀得到 `'A'`，但那一格在 `proto` 身上，**不是 d 的 own property**。
- `d.normal` 那一格才刻在 `d` 身上，是 own property。

判斷方法：

```js
Object.prototype.hasOwnProperty.call(d, 'normal')     // true
Object.prototype.hasOwnProperty.call(d, 'fromProto')  // false
Object.hasOwn(d, 'fromProto')                         // false（ES2022 的新寫法，比較好讀）
```

三個條件一起擋掉誰的實測：

```js
const proto = { fromProto: 'A' };
const d = Object.create(proto);                                        // ① 不是 own
d.normal = 'B';                                                        // 全部通過
Object.defineProperty(d, 'hidden', { value: 'C', enumerable: false }); // ② 不可列舉
d[Symbol('sym')] = 'D';                                                // ③ 不是字串鍵

JSON.stringify(d)    // {"normal":"B"}    ← 只剩一個活下來
```

---

## 七、兩種語意：定義（define）與賦值（set）

這是理解 descriptor 最關鍵的一組對照：

| | 賦值語意 `obj.k = v` | 定義語意 `Object.defineProperty` |
| --- | --- | --- |
| 內部方法 | `[[Set]]` | `[[DefineOwnProperty]]` |
| 會不會先找原型鏈上的 setter | **會** | **不會** |
| 產生的 descriptor | 三個開關全 `true` | 沒寫的一律 `false` |
| 遇到 `writable: false` | 失敗（嚴格模式丟錯） | 看 `configurable` 決定 |
| `obj.__proto__ = x` | 觸發原型 setter，**換掉原型** | 建立一個叫 `__proto__` 的普通屬性 |

`JSON.parse` 內部走的是**定義語意**（`CreateDataProperty`），這就是為什麼
`JSON.parse('{"__proto__": {...}}')` 不會造成原型污染。

![[學習JS_截圖_Console_prototype-pollution的hacked記號_2026-09-20.png]]

`{"hacked": 1}` 裡的 `hacked` 只是一個**記號**，用來檢查污染有沒有成功 —— 檢查方式是去問一個全新的空物件 `({}).hacked`：

- `JSON.parse` 之後 → `({}).hacked` 是 `undefined`，**沒被污染**。
- `p.__proto__ = { hacked: 1 }` 之後 → 只有 `p` 自己的原型被換掉，`({}).hacked` 還是 `undefined`。
- 把 parse 結果丟進**用賦值寫的遞迴 merge** 之後 → `({}).hacked === 1`、`[].hacked === 1`，**全世界的物件都被污染了**。這才是災難。

---

## 八、跟其他筆記的關聯（以及為什麼相關）

- [[嚴格模式-PropertyDescriptor-與JSON的關係]]
  **原因**：這篇是它的「物件」分支。那篇處理 descriptor → JSON 的方向，這篇處理 descriptor 本身的結構。

- [[JavaScript資料型別總覽-原始型別與物件]]
  **原因**：那篇說「物件是一組 key-value」，這篇補上**每一個 value 其實是一份六欄位的說明書**，不是一個裸值。

- [[JSON]]
  **原因**：`enumerable` 那一格是 `JSON.stringify` 的第二道篩選閘門。

- [[JavaScript-Map-與-Object]]
  **原因**：Map 的項目**不是 property**，所以完全不受 descriptor 系統管轄，也因此 `JSON.stringify(new Map(...))` 得到 `{}`。

- [[Day1-型別辨別-自動轉換-與immutable的四個層次]]
  **原因**：那篇的「immutable 四個層次」第一層就是 `writable: false`，第二層是 `Object.freeze`（等於把所有屬性的 `writable` 與 `configurable` 一起關掉）。這篇是那一層的放大版。

---

## 九、相關練習題

1. [LeetCode 2727. Is Object Empty](https://leetcode.com/problems/is-object-empty/)
   `Object.keys` 直球練習，正好驗證「不可列舉屬性不算數」。

2. [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/)
   走訪 own enumerable 屬性，跟 `JSON.stringify` 的挑選規則同源。

3. [LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/)
   實作 `valueOf` 與 `toString`，是 accessor 思維的延伸。

4. [LeetCode 2755. Deep Merge of Two Objects](https://leetcode.com/problems/deep-merge-of-two-objects/)
   遞迴 merge，正是第七節說的原型污染發生地點。

5. [LeetCode 2691. Immutability Helper](https://leetcode.com/problems/immutability-helper/)（Hard）
   直接練 descriptor 與不可變性。

---

## 十、出處

- [MDN — Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
  descriptor 六欄位、預設值、data 與 accessor 互斥的原文出處。
- [MDN — Object.defineProperties()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties)
  原文用的就是這個複數版方法。
- [MDN — Object.getOwnPropertyDescriptor()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor)
- [MDN — Working with objects → Defining getters and setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects#defining_getters_and_setters)
- [MDN — Object.hasOwn()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)
- [MDN — Enumerability and ownership of properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties)
  哪些操作看得到不可列舉屬性，MDN 有一張完整對照表。
- [ECMA-262 規格](https://tc39.es/ecma262/)：`OrdinaryDefineOwnProperty`、`OrdinarySetWithOwnDescriptor`、`ValidateAndApplyPropertyDescriptor`
- 原文出處：fillano 的 ES5 介紹文（約 2011 年）—— 範例本身不是 MDN 的內容。

實測環境與時間：Node v22.22.2，2026-09-20。以上每一段輸出都由 `demo-property-descriptor.js` 實際跑出來。

---

## 十一、追問補充（2026-09-20）

### a. 「own：原型鏈上的不算」是指 `hasOwnProperty` 嗎

**不完全是。兩者是「概念」與「工具」的關係，不是同一件事。**

1. **own 是一個概念**：這一格屬性刻在這個物件自己身上，不是從原型鏈繼承來的。
2. **`hasOwnProperty` 是拿來檢查這個概念的其中一個工具**，它回傳 `true`／`false`。
3. **`JSON.stringify` 內部並沒有呼叫 `hasOwnProperty`**。規格上它走的是物件的內部方法 `[[OwnPropertyKeys]]`，那個方法**天生只會回傳 own key**，根本不需要再去濾原型鏈。所以 own 是「取得清單的方式本身就只含 own」，不是「先拿全部再用 hasOwnProperty 篩」。

檢查 own 的三種工具，語意各不相同：

| 工具 | 走原型鏈嗎 | 看得到不可列舉的嗎 |
| --- | --- | --- |
| `Object.hasOwn(o, k)` | ❌ 不走 | ✅ 看得到 |
| `o.hasOwnProperty(k)` | ❌ 不走 | ✅ 看得到 |
| `k in o` | ✅ **會走** | ✅ 看得到 |

```js
const proto = { inherited: 'A' };
const o = Object.create(proto);
o.mine = 'B';

o.inherited                        // 'A'    ← 讀得到
Object.hasOwn(o, 'inherited')      // false  ← 但不是 own
'inherited' in o                   // true   ← in 會走原型鏈，答案跟 own 不同
JSON.stringify(o)                  // {"mine":"B"}
```

**建議改用 `Object.hasOwn()`（ES2022）**，因為 `hasOwnProperty` 有兩個陷阱：

```js
// 陷阱一：物件自己有一個叫 hasOwnProperty 的屬性，方法被蓋掉了
const t1 = { hasOwnProperty: () => '我被覆蓋了' };
t1.hasOwnProperty('x')        // '我被覆蓋了'   ← 壞掉
Object.hasOwn(t1, 'x')        // false         ← 正確

// 陷阱二：Object.create(null) 建的物件沒有原型，身上根本沒有這個方法
const t2 = Object.create(null); t2.k = 1;
t2.hasOwnProperty('k')        // TypeError: t2.hasOwnProperty is not a function
Object.hasOwn(t2, 'k')        // true          ← 正確
```

### b. `eval('(' + str + ')')` 那一行到底在做什麼

**要拆成兩層來看 —— 字串相接那一層，跟 `eval` 那一層。**

1. **`'(' + str + ')'` 這部分，確實就是一般的字串相接**，跟 `'Hello, ' + name` 完全一樣的語法，就是把三段字串黏成一段。結果的型別還是 `string`，什麼事都沒發生。

2. **`eval(...)` 那一層完全不同**。`eval` 會把它拿到的字串當成**程式碼**送進 JS 引擎編譯並執行。

```js
const str = '{"name":"Tom","age":30}';

const 拼出來的字串 = '(' + str + ')';
// '({"name":"Tom","age":30})'   ← 型別是 string，純粹的字串相接

const 物件 = eval(拼出來的字串);
// { name: 'Tom', age: 30 }      ← 型別是 object，eval 把它當程式碼跑出來的
```

### c. 為什麼非加那對括號不可

因為 `{` 出現在**語句開頭**時，JS 的剖析器（parser）會把它當成**區塊語句（block statement）**，不是物件字面值。加一對括號是強迫它變成**運算式（expression）**。

```js
eval('{}')             // undefined  ← 被當成空的 block
eval('({})')           // {}         ← 加括號才是空物件
eval('{ a: 1 }')       // 1          ← a:1 被當成標籤語句（labeled statement）
eval('({ a: 1 })')     // { a: 1 }
eval('{"name":"Tom"}') // SyntaxError: Unexpected token ':'
```

這正好跟 [[文章-從一個SyntaxError讀懂物件字面量與自動裝箱]] 講的是同一個剖析器歧義。

### d. 危險的不是字串相接，是 `eval` 那一層

```js
const name = 'Tom';
'Hello, ' + name          // 'Hello, Tom'  ← 只是產生字串，不會執行任何東西

globalThis.__boom = () => { console.log('！使用者塞的程式碼被執行了！'); return 1; };
const 惡意 = '{"n": __boom()}';

eval('(' + 惡意 + ')')     // __boom() 真的被執行了，回傳 {n: 1}
JSON.parse(惡意)           // SyntaxError: Unexpected token '_' ← 直接擋下來
```

`eval` 把字串當**程式碼**跑，`JSON.parse` 只認 **JSON 文法**。如果字串來自使用者或外部 API，用 `eval` 就等於讓對方在你的頁面上執行任意程式碼。
**這就是 ES5 要把 `JSON.parse` 內建進來的真正理由。**

出處：
- [MDN — Object.hasOwn()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)（含上面兩個陷阱的說明）
- [MDN — Object.prototype.hasOwnProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
- [MDN — eval()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)
- [MDN — Grammar and types → Object literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#object_literals)

實測環境：Node v22.22.2，2026-09-20。

---

## 十二、追問補充（2026-09-20 第二輪）

### a. `Object.defineProperty()` 跟物件實字法差在哪裡

先講「**靜態方法**」這個詞：它掛在 `Object` 這個建構函式本身，不是掛在 `Object.prototype` 上。
所以只能寫 `Object.defineProperty(obj, ...)`，不能寫 `obj.defineProperty(...)`，實例拿不到它。
對照組：`hasOwnProperty` 是掛在 `Object.prototype` 上的**原型方法**，所以 `obj.hasOwnProperty()` 寫得出來。

四個差別：

1. **三個開關的預設值完全相反**

```js
o.a = 1;                                     // writable / enumerable / configurable 全 true
Object.defineProperty(o, 'a', { value: 1 }); // 三個全 false
```

2. **物件實字沒有辦法指定那六個欄位**
   `{ name: 'fillano' }` 只能表達「值是什麼」，無法表達「不可寫」「不可列舉」。

3. **時機不同**
   物件實字是建立物件的那一刻一次寫好；`defineProperty` 是事後對已存在的物件動手術。

4. **但有一點是相同的 —— 兩者都是「定義語意」**
   這點容易誤會：物件實字**不會**觸發原型鏈上的 setter，它跟 `defineProperty` 一樣走 `CreateDataProperty`。
   真正走「賦值語意」的只有 `obj.k = v` 這種寫法。

補充：物件實字其實**也能寫 getter/setter**，只是開關固定全 `true` 不能調（這是 MDN Working with objects 的範例）：

```js
const myObj = { a: 7, get b(){ return this.a + 1; }, set c(x){ this.a = x / 2; } };
```

### b. MDN Try it 那句「Throws an error in strict mode」在講什麼

它講的是 `writable: false`，**跟 Console 裡看到的 `__proto__` 完全無關**。

```js
const object1 = {};
Object.defineProperty(object1, 'property1', { value: 42, writable: false });

object1.property1 = 77;   // ← 註解在講的是「這一行」
console.log(object1.property1);   // 42
```

實測兩種模式：

```js
object1.property1 = 77;  object1.property1      // 42  ← 非嚴格：靜靜失敗
(function(){ 'use strict'; object1.property1 = 77; })()
// TypeError: Cannot assign to read only property 'property1'

// 而且 configurable 預設也是 false，連 defineProperty 這條路也走不通
Object.defineProperty(object1, 'property1', { value: 77 });
// TypeError: Cannot redefine property: property1
```

所以「不可在該方法以外去修改物件」要修正成：**是這一個屬性因為 `writable:false` 不能用賦值改**，不是整個物件被鎖住。

**Console 裡的 `__proto__` 是 DevTools 的檢視功能** —— 展開任何物件時它幫你顯示「這個物件的原型是誰」，讓你可以往上點看原型鏈。
Chrome 新版已改顯示成 `[[Prototype]]`。它不是你物件上的資料，跟 `writable` 毫無關係。

### c. `enumerable` 與 `configurable` 是 `defineProperty` 專有的嗎

**都不是 —— 它們是「property descriptor 這個資料結構」的欄位**，不屬於任何一個方法。
凡是跟 descriptor 打交道的 API 全部都有：

| API | 角色 |
| --- | --- |
| `Object.defineProperty(obj, key, desc)` | 吃 descriptor |
| `Object.defineProperties(obj, {key: desc})` | 吃多個 |
| `Object.create(proto, {key: desc})` | **第二個參數**就是 descriptor 表 |
| `Object.getOwnPropertyDescriptor(obj, key)` | 吐 descriptor |
| `Object.getOwnPropertyDescriptors(obj)` | 吐全部 |
| `Reflect.defineProperty(obj, key, desc)` | 吃（失敗回 `false` 而不是丟錯） |
| `Reflect.getOwnPropertyDescriptor(obj, key)` | 吐 |
| `Proxy` 的 `defineProperty` / `getOwnPropertyDescriptor` trap | 攔截 |

```js
const o = Object.create(Object.prototype, {
  hidden: { value: 1, enumerable: false },
  shown:  { value: 2, enumerable: true },
});
Object.keys(o)                   // ['shown']
Object.getOwnPropertyNames(o)    // ['hidden', 'shown']
```

比喻：descriptor 是「屬性的身分證格式」，`defineProperty` 只是其中一個發證單位。

### d. 六個欄位其實是「三組」不是兩組（這是最關鍵的釐清）

**`enumerable` 跟 `configurable` 不是 data descriptor 的欄位。**

| 分組 | 欄位 | 互斥嗎 |
| --- | --- | --- |
| **Data 專屬** | `value`、`writable` | ✅ 跟下面那組互斥 |
| **Accessor 專屬** | `get`、`set` | ✅ 跟上面那組互斥 |
| **共用（兩種都有，而且一定有）** | `enumerable`、`configurable` | ❌ **不參與互斥** |

```js
// data descriptor
{ "value": 1, "writable": true, "enumerable": true, "configurable": true }
//  ↑ data 專屬   ↑ data 專屬      ↑ 共用            ↑ 共用

// accessor descriptor
{ "get": [Function], "set": [Function], "enumerable": true, "configurable": true }
//  ↑ accessor 專屬   ↑ accessor 專屬    ↑ 共用            ↑ 共用
```

所以印出 `{ get, set, enumerable, configurable }` 是 100% 正確、100% 預期的結果，完全沒有矛盾。
互斥的只有前兩組，`enumerable` 與 `configurable` 每個屬性都一定有。

而且互斥是「**每一個 property 各自**」選一種，不是「整個物件」選一種 ——
同一個物件裡 `name` 是 accessor、`age` 是 data，完全沒問題。

### e. `_v` 是什麼，以及為什麼非有它不可

`_` 前綴純粹是**命名慣例**，意思是「內部使用的，外面請不要直接碰」，`v` 是 value 的縮寫，語言沒有任何強制力。

**非有不可的理由**：getter 必須從某個地方拿到值回傳，而這個值**不能存在 `e.name` 上**，因為讀 `e.name` 就會再次觸發這個 getter：

```js
Object.defineProperty(bad, 'name', { get() { return this.name; } });
bad.name
// RangeError: Maximum call stack size exceeded   ← 實測，真的爆掉
```

所以值**必須存在物件外面**。這就是 `_v` 存在的唯一理由。

**「`_v` 沒有被 `e` 包住」正是重點，不是 bug** —— 它靠**閉包（closure）**被 getter/setter 記住。
但我那份簡化寫法偷懶了：`_v` 裸露在外層作用域，別人還是碰得到。原文用 IIFE 包起來才是正確的：

```js
const a = {};
(function(){
  let name = 'fillano';              // 關在 IIFE 裡，外面完全碰不到
  Object.defineProperty(a, 'name', {
    get(){ return name; }, set(v){ name = v; },
    enumerable: true, configurable: true
  });
})();
```

**現代寫法**直接用 class 的 `#` 私有欄位，不需要閉包技巧：

```js
class Person {
  #name = 'fillano';                 // # 開頭是真正的語言級私有
  get name(){ return this.#name; }
  set name(v){ this.#name = v; }
}
```

### f. 在 DevTools 展開 `get: ƒ get()` 看到的七項

![[學習JS_圖解_DevTools展開函式看到的七項是什麼_2026-09-20.svg]]

**最重要的定位**：這七項描述的不是「`e.name` 這個屬性」，而是「**descriptor 裡那個 getter 函式物件本身**」。
descriptor 的六個欄位跟這七項是兩回事 —— 你往下多鑽了一層。

**前四項：真正存在的 JS 屬性（程式碼讀得到）**

| 項目 | 意思 |
| --- | --- |
| `length: 0` | 這個函式**宣告了幾個參數**。`get()` 沒參數所以 0（`(a,b,c)=>a` 的 length 是 3） |
| `name: "get"` | 函式名稱字串 |
| `arguments: (...)` | 上古時代的非標準屬性，已廢棄 |
| `caller: (...)` | 同上 |

`(...)` 是 **DevTools 的「點了才求值」標記**（lazy getter）。這裡點下去會丟 `TypeError` ——
嚴格模式函式禁止存取 `caller` 與 `arguments`，正是 strict mode 那條規則。

`length` 與 `name` 自己也是 `enumerable: false`：

```js
Object.getOwnPropertyDescriptor(get, 'length')
// { value: 0, writable: false, enumerable: false, configurable: true }
```

**後三項：內部插槽 internal slot（程式碼讀不到）**

`[[雙中括號]]` 是 ECMA-262 用來表示「引擎內部狀態」的記法，DevTools 直接沿用。
你**不能**寫 `fn["[[Scopes]]"]` 把它拿出來，那不是屬性。

| 項目 | 意思 |
| --- | --- |
| `[[FunctionLocation]]: VM101:3` | 原始碼位置。**`VM101` 是 DevTools 給「從 Console 或 eval 執行的程式碼」的虛擬檔名**，不是真實檔案，重貼一次數字就會變 |
| `[[Prototype]]: ƒ ()` | 這個函式的原型是 `Function.prototype` |
| `[[Scopes]]: Scopes[2]` | **閉包鏈** ← 最值得看的一項 |

**`[[Scopes]]` 正好是 e 小節那個疑問的視覺化答案**，展開它會看到：

```
▾ 0: Closure  { _v: 'fillano' }     ← _v 在這裡！
▾ 1: Global   { ... }
```

`_v` 確實不在物件 `e` 身上，它在 getter 函式的**閉包作用域**裡，DevTools 把它攤開給你看了。

出處：
- [MDN — Object.create()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
- [MDN — Reflect.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/defineProperty)
- [MDN — Function.prototype.length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length)
- [MDN — Function.prototype.caller（deprecated）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/caller)
- [MDN — Private properties（`#` 私有欄位）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties)
- [ECMA-262](https://tc39.es/ecma262/)：internal slot 的 `[[ ]]` 記法

實測環境：Node v22.22.2，2026-09-20。
