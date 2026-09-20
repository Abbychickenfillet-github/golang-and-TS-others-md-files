---
title: 嚴格模式、Property Descriptor、與 JSON 的關係
date: 2026-09-19
tags:
  - JavaScript
  - ES5
  - JSON
  - property-descriptor
  - strict-mode
---

# 嚴格模式、Property Descriptor、與 JSON 的關係

> 我原本的問題：讀完一段講「嚴格模式」跟「物件 property descriptor」的文章之後，**這邊跟 JSON 有什麼關係？**

互動版筆記：`descriptor-json-互動筆記.html`（Obsidian 用 HTML Reader 外掛開）
可執行範例：`demo-descriptor-json.js`（`node demo-descriptor-json.js`）

---

## 零、一句話結論

那篇文章講 strict mode 跟 descriptor 之後接著講 JSON，**不是換話題，是同一章的下一節**。
因為 strict mode、property descriptor、內建的 `JSON` 物件，這三樣東西是 **ES5（ECMAScript 5，2009 年 12 月發布）同一版一起進來的三兄弟**。
而且它們不只是時間上的鄰居，往下挖還有四層實質關聯。

![[學習JS_圖解_JSON.stringify三層篩選與descriptor_2026-09-19.svg]]

---

## 一、先把原文的程式碼一行一行翻成中文

### a. 第一段（Data Descriptor，資料描述符）

```js
var a = {};
Object.defineProperties(a, {
    'name' : {
        value: 'fillano',
        writable: false,
        enumerable: false,
        configurable: false
    },
    'age' : {
        value: 30,
        writable: true,
        enumerable: true,
        configurable: false
    }
});
```

逐行白話：

1. `var a = {};`
   我先做一個空物件，用最普通的物件字面值（object literal）。

2. `Object.defineProperties(a, {...})`
   `defineProperties`（複數）是「一次定義多個屬性」的方法。
   第一個參數是要被動手腳的物件，第二個參數是一張表：key 是屬性名稱，value 是那個屬性的 **descriptor（描述符）**。
   descriptor 不是值，是「這個屬性的說明書」。

3. `value: 'fillano'`
   `value` 是資料描述符專屬的欄位，就是這個屬性真正存的值。

4. `writable: false`
   能不能被覆寫。設成 `false` 之後，`a.name = '別的'` 在非嚴格模式會**靜靜地失敗**，在嚴格模式會丟 `TypeError`。
   ← 這裡就是 strict mode 跟 descriptor 的第一個交集點。

5. `enumerable: false`
   能不能被「列舉」。設成 `false` 之後，`for...in`、`Object.keys()`、以及 **`JSON.stringify()`** 都看不到它。
   ← 這裡就是 descriptor 跟 JSON 的第一個交集點，下面第三節會展開。

6. `configurable: false`
   能不能被 `delete`、能不能再改一次它的 descriptor。設成 `false` 等於把說明書鎖死。

7. `age` 那一組同理，只是 `writable` 跟 `enumerable` 都開著。

實測結果：

```
a.name                        // 'fillano'（不可列舉 ≠ 讀不到）
Object.keys(a)                // [ 'age' ]
Object.getOwnPropertyNames(a) // [ 'name', 'age' ]
JSON.stringify(a)             // {"age":30}   ← name 不見了
```

### b. 第二段（Accessor Descriptor，存取描述符）— 而且原文這段會爆炸

```js
var a = {};
(function(){
    var name = 'fillano';
    Object.defineProperties(a, {
        'name' : {
            get: function(){return name;},
            set: function(a) {name = a;},
            writable: true,        // ← 這一行會讓整段丟 TypeError
            enumerable: true,
            configurable: false
        }
    });
})();
```

逐行白話：

1. `(function(){ ... })();`
   這叫 IIFE（Immediately Invoked Function Expression，立即執行函式運算式）。
   包一層函式馬上執行，目的是製造一個**外面碰不到的作用域**。

2. `var name = 'fillano';`
   這個 `name` 活在 IIFE 的作用域裡，外界只能透過下面的 getter / setter 碰到它。
   這就是「用閉包（closure）做私有變數」的經典寫法。

3. `get: function(){ return name; }`
   有人讀 `a.name` 的時候，不是去拿一個固定的值，而是**呼叫這個函式**，把它的回傳值當作結果。

4. `set: function(a) { name = a; }`
   有人寫 `a.name = 'x'` 的時候，改成呼叫這個函式。
   （原文這裡參數取名 `a` 跟外層物件 `a` 同名，會遮蔽掉外層，實務上建議改名。）

5. `writable: true` ← **這一行是原文的錯誤**
   規格規定：`get` / `set` 屬於 accessor 描述符，`value` / `writable` 屬於 data 描述符，**兩組互斥**。
   同時給就直接丟：
   `TypeError: Invalid property descriptor. Cannot both specify accessors and a value or writable attribute`
   把 `writable: true` 拿掉才跑得起來。

---

## 二、Property Descriptor 六個欄位速查

| 欄位 | 屬於哪一組 | 意思 | 用字面值 `{}` 建立時預設 | 用 `defineProperty` 沒寫時預設 |
| --- | --- | --- | --- | --- |
| `value` | Data | 值本身 | 你給的值 | `undefined` |
| `writable` | Data | 能不能被覆寫 | `true` | `false` |
| `get` | Accessor | 讀取時攔截 | 無 | `undefined` |
| `set` | Accessor | 寫入時攔截 | 無 | `undefined` |
| `enumerable` | 共用 | 能不能被列舉 ★ | `true` | `false` |
| `configurable` | 共用 | 能不能刪除或重設 | `true` | `false` |

★ 這一格直接決定 `JSON.stringify` 看不看得到。

**最容易踩到的坑**：`Object.defineProperty(obj, 'k', { value: 1 })` 建出來的屬性，預設是**唯讀、不可列舉、不可刪**，跟直覺完全相反。

---

## 三、跟 JSON 的五層關係

### a. 第一層｜歷史關係：ES5 一次生了三胞胎

ES5（2009 年 12 月）這一版同時塞進三樣東西：

1. strict mode（嚴格模式）
2. property descriptor 全家桶（`Object.defineProperty`、`getOwnPropertyDescriptor`、`keys`、`freeze`、`seal` …）
3. **內建的 `JSON` 物件（`JSON.parse` / `JSON.stringify`）**

ES5 之前瀏覽器**沒有**內建 JSON，大家的做法是 `eval('(' + str + ')')`，或是引入 Douglas Crockford 寫的 `json2.js`。
所以任何一篇「ES5 有什麼新東西」的文章，講完前兩項接著講 JSON，是章節結構使然。

而且這不只是巧合 —— **strict mode 收緊 `eval`，跟 JSON 被內建，是同一個安全動機的一體兩面**：
規格一邊讓 `eval` 變得沒那麼好用（嚴格模式下 `eval` 有自己的變數環境，不會污染呼叫端，也不能被當變數名賦值），一邊給你一個安全的 `JSON.parse` 來取代它。

### b. 第二層｜`enumerable` 直接決定 JSON 序列化什麼（最實用的一層）

`JSON.stringify` 的挑選規則只有一條，但有三個條件要同時成立：

1. **own**（自有屬性，原型鏈上的一律不算）
2. **enumerable: true**（可列舉）
3. **字串鍵**（Symbol 鍵一律跳過）

這跟 `Object.keys()` 用的是**同一把尺**。所以原文那個 `a` 物件 `stringify` 出來只有 `{"age":30}`。

實務用法：把內部狀態用 `defineProperty` 設成 `enumerable: false`，它就同時從 `for...in`、`Object.keys`、以及 API 回傳的 JSON 裡消失。**這是一個「隱藏欄位」的技巧，不是「加密」** —— 值還是讀得到，只是不會被列舉。

順序也一致：像整數的 key 先照數字升冪，其餘字串 key 照插入順序。`Object.keys` 跟 `JSON.stringify` 的輸出順序永遠一樣。

```js
const l = { b: 1, 2: 1, a: 1, 1: 1 };
Object.keys(l)     // [ '1', '2', 'b', 'a' ]
JSON.stringify(l)  // {"1":1,"2":1,"b":1,"a":1}
```

### c. 第三層｜getter/setter 是攔截點，JSON 自己也有三個攔截點

原文說 descriptor「可以在 access 的過程中加以攔截」，JSON 這一側有一模一樣的概念，只是攔截時機不同：

| 攔截點 | 屬於哪一側 | 什麼時候被呼叫 |
| --- | --- | --- |
| `get` | descriptor | 每次讀這個屬性時 |
| `set` | descriptor | 每次寫這個屬性時 |
| `toJSON()` | JSON | 序列化到這個值時，用回傳值取代它 |
| `replacer`（`stringify` 第二參數） | JSON | 每個 key/value 出去之前 |
| `reviver`（`parse` 第二參數） | JSON | 每個 key/value 進來之後 |

兩側會真的碰在一起：**`JSON.stringify` 會真的呼叫 getter**，把回傳值寫進 JSON（實測計數器從 0 變 1）。
反過來，只有 `set` 沒有 `get` 的屬性，讀出來是 `undefined`，`JSON.stringify` 直接把整個 key 丟掉。

`Date` 之所以會變成 ISO 字串，就是因為 `Date.prototype.toJSON` 存在 —— 不是 JSON 特別優待 Date。

### d. 第四層｜JSON 表達不了 descriptor（資訊有損）

`JSON.parse` 產生的每一個屬性，都是 `writable` / `enumerable` / `configurable` **全部 `true`** 的 data property。

```js
const f0 = {};
Object.defineProperty(f0, 'age', { value: 30, writable: false, enumerable: true, configurable: false });
const f1 = JSON.parse(JSON.stringify(f0));
Object.getOwnPropertyDescriptor(f1, 'age')
// { value: 30, writable: true, enumerable: true, configurable: true }  ← 設定全被洗掉
```

JSON 還表達不了：函式、`undefined`、`Symbol`（整個 key 消失）、`NaN` 與 `Infinity`（變成 `null`）、循環參考（丟 `TypeError`）、原型鏈、getter 本身（只留下當下那一刻的值）。

**結論：`JSON.parse(JSON.stringify(x))` 不是深拷貝，是「有損壓縮」。** 需要深拷貝請用 `structuredClone()`。

### e. 第五層｜`JSON.parse` 用的是「定義語意」而不是「賦值語意」（進階，安全相關）

![[學習JS_圖解_定義屬性vs賦值-JSONparse的__proto__差異-ISO5807_2026-09-19.svg]]

規格上 `JSON.parse` 內部用的是 `CreateDataProperty`（跟 `Object.defineProperty` 同一條路），**不是** `[[Set]]` 賦值。
差別在 `__proto__` 身上會完全看得出來：

```js
JSON.parse('{"__proto__": {"hacked": 1}}')
// → 得到一個真的有 own property "__proto__" 的物件，原型沒有被換掉

const p = {};
p.__proto__ = { hacked: 1 };
// → 走 Object.prototype 上的 __proto__ setter，原型真的被換掉，own keys 是空的
```

這正好就是 descriptor 那一章在講的兩種語意的差別：

- **定義（define）**：不看原型鏈，直接在這個物件上刻一格。
- **賦值（set）**：先沿原型鏈找有沒有 setter，有就交給它。

所以 prototype pollution（原型污染）漏洞**通常不是出在 `JSON.parse` 本身**，而是出在你拿解析結果去做遞迴 merge 的時候用了賦值。

---

## 四、原文有四處要修正（2026-09-19 用 Node v22.22.2 實測）

1. **「不能使用 eval」不精確**
   `eval` 可以用。嚴格模式做的是：`eval` 裡宣告的變數有自己的作用域不會外漏，且 `eval` 與 `arguments` 不能被賦值或拿來當變數名。

2. **「物件不可有同名的屬性」已經過時**
   ES5 確實禁止，但 ES6（2015）把這條放寬了。現在嚴格模式下 `({x:1, x:2})` 不報錯，結果是 `{x:2}`。
   仍然禁止的是**函式的重複參數名**：`function f(a, a){}` 在嚴格模式是 `SyntaxError`。

3. **「函數.call(null) 會產生錯誤」不對**
   不會丟錯。非嚴格模式下 `this` 會被自動裝箱（auto-boxing）替換成 `globalThis`；嚴格模式下 `this` 就乖乖維持 `null`。差別是「有沒有被換掉」，不是「有沒有報錯」。

4. **Accessor descriptor 不能放 `writable`**
   原文第二段範例直接丟 `TypeError`，詳見上面第一節 b。

---

## 五、跟既有筆記的關聯（以及為什麼相關）

- [[JSON]]
  **原因**：那份筆記說明 JSON 是「把字串外套剝掉還原成 JS 資料型態」，這份筆記補上**還原的時候用的是定義語意不是賦值語意**，以及**哪些屬性會被剝掉**（`enumerable:false` 與 Symbol 鍵）。

- [[JavaScript資料型別總覽-原始型別與物件]]
  **原因**：descriptor 描述的就是「物件這個型別的每一格長什麼樣」，是型別總覽往下挖一層。

- [[文章-從一個SyntaxError讀懂物件字面量與自動裝箱]]
  **原因**：本篇第四節第 3 點的 `.call(null)` 行為，就是那篇講的**自動裝箱**在 `this` 上的版本 —— 嚴格模式把這個裝箱關掉了。

- [[JavaScript-Map-與-Object]]
  **原因**：Map 不能直接 `JSON.stringify`（會得到 `{}`），原因正是本篇第三層說的「只序列化 own enumerable 字串鍵」，Map 的資料不存在屬性上。

- [[V8引擎完整管線-Parse到Deoptimization]]
  **原因**：把屬性從 data descriptor 改成 accessor descriptor 會讓 V8 的 hidden class 轉換，跟那篇講的去最佳化（deoptimization）直接相關。

- [[ChatGPT匯出JSON-Unicode跳脫序列看似亂碼]]
  **原因**：同樣是 `JSON.stringify` 的輸出規則，那篇談字元編碼層，這篇談屬性挑選層。

---

## 六、相關練習題（LeetCode JavaScript 30 天系列）

1. [2705. Compact Object](https://leetcode.com/problems/compact-object/)
   走訪 own enumerable 屬性並過濾掉 falsy 值 —— 跟 `JSON.stringify` 的挑選規則同源，做完會很有感。

2. [2727. Is Object Empty](https://leetcode.com/problems/is-object-empty/)
   `Object.keys` 的直球練習，正好驗證「不可列舉屬性不算數」。

3. [2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/)
   實作 `valueOf` 與 `toString`，跟 `toJSON` 是同一類「物件轉換時的攔截點」。

4. [2693. Call Function with Custom Context](https://leetcode.com/problems/call-function-with-custom-context/)
   手刻 `call`，正好把本篇第四節第 3 點的 `this` 綁定規則練一遍。

5. [2755. Deep Merge of Two Objects](https://leetcode.com/problems/deep-merge-of-two-objects/)
   遞迴 merge —— 也就是第五層講的 prototype pollution 真正的發生地點。

---

## 七、出處

- MDN — `JSON.stringify()`（明列 own enumerable string-keyed、`toJSON`、不可序列化型別的行為）
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
- MDN — `Object.defineProperty()`（descriptor 六欄位與預設值、accessor 與 data 互斥）
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
- MDN — Strict mode（嚴格模式各條限制與 `this` 不再裝箱）
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
- MDN — `structuredClone()`（取代 JSON round-trip 的深拷貝）
  https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone
- ECMA-262 規格 — `SerializeJSONProperty`、`InternalizeJSONProperty`、`OrdinarySetWithOwnDescriptor`
  https://tc39.es/ecma262/
- 原文出處：fillano 的 ES5 介紹文（iT 邦幫忙／個人部落格系列，約 2011 年）—— 文中關於「同名屬性」與「`.call(null)` 會報錯」的說法反映的是 **ES5 當時**的狀態，ES6 之後已變動。

實測環境與時間：Node v22.22.2，2026-09-19。以上每一段輸出都由 `demo-descriptor-json.js` 實際跑出來。
