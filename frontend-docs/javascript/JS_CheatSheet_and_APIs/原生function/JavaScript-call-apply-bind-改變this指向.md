---
title: JavaScript call / apply / bind（改變 this 指向）
type: topic-note
source: Gemini
tags: [gemini, javascript, this, call, apply, bind, 面試]
sources:
  - https://gemini.google.com/app/f42284f776f921bb
  - https://gemini.google.com/app/915c5a52efbf1ac0
updated: 2026-07-12
---

# JavaScript call / apply / bind（改變 this 指向）

## 共同概念：call / apply / bind 是什麼

`call`、`apply`、`bind` 三個都是 **JavaScript 原生**的方法
![[JS_DevTools_物件原型鏈展開_2026-06-10.png]]（定義在 `Function.prototype` 上，所有函式都繼承得到），由 JS 引擎（**V8**、**SpiderMonkey** 等）底層實作。**不是瀏覽器獨有**——凡是有 JS 引擎的 runtime（**瀏覽器、Node.js、Deno**）「都」有。

- 驗證原生：`Function.prototype.call.toString()` → `[native code]`（見 [[JS-native-function-check]]）
- 它們住在 `Function.prototype` 上、靠原型鏈被每個函式繼承（見 [[Constructor-與-Prototype-關係]]、[[查看plain-object的prototype]]）
- 三者共同點：都用來**改變函式執行時的 `this` 指向**；差別只在「立即執行 vs 回傳新函式」「參數逐一 vs 陣列」

## this 綁定規則：預設綁定 vs 隱性綁定（回呼函式的陷阱）

> 在懂 call/apply/bind（顯性綁定）之前，先懂 `this` 的基本規則：<mark style="background: #FFF3A3A6;">`this` 的值看「函式怎麼被呼叫」，不是看它寫在哪裡</mark>。

以 `setTimeout` 的匿名回呼為例：

```javascript
setTimeout(function () {
  console.log("我是被偷偷拿出來執行的函式");
  // 這裡的 this 是誰？
}, 1000);
```

- 「匿名函式」＝ `function () { ... }` 這一整段沒有名字的函式。
- 句子裡「它是獨立被呼叫的」的<mark style="background: #ADCCFFA6;">「它」＝這個匿名函式</mark>；更精確說，是指它執行時的「呼叫位置（call-site）」與內部的 `this` 綁定。

兩種基本綁定：

| 呼叫方式 | 寫法 | 內部 `this` |
|---|---|---|
| <mark style="background: #ADCCFFA6;">隱性綁定</mark> | `obj.myMethod()`（前面有物件點它） | 指向 `obj` |
| <mark style="background: #FF5582A6;">預設綁定</mark> | `func()`（獨立呼叫，前面沒有物件點它） | 非嚴格模式指向<mark style="background: #FF5582A6;">全域物件（瀏覽器 = `window`）</mark>；嚴格模式為 `undefined` |

<mark style="background: #FFB8EBA6;">回呼函式的陷阱</mark>：時間到時，瀏覽器在後台把匿名函式「拉出來獨立執行」，等同 `anonymousFunc()`——前面沒有物件點它，所以 `this` <mark style="background: #FF5582A6;">脫鉤、預設指向 `window`</mark>，而不是外層物件。這就是新手在非箭頭的匿名函式裡寫 `this` 卻發現變成 `window` 的原因。

解法：用<mark style="background: #BBFABBA6;">箭頭函式</mark>（`this` 繼承外層、不會脫鉤），或用 `bind` 顯性綁定（見下方）。

## 補充：完整優先順序（含 `new` 綁定與箭頭函式）——「怎麼知道 this 現在指向哪」的完整判斷法

> 延伸自 `happy-vue-playground` 手打 Vue `RefImpl` 骨架時的提問（2026-09-03）：`constructor(value){this._value = value}` 裡的 `this` 怎麼知道指向誰？跟箭頭函式（含 `async` 箭頭）的 `this` 是不是同一套規則？

上面「隱性綁定 vs 預設綁定」只列了兩種，完整判斷要照這個<mark style="background: #FFF3A3A6;">優先順序</mark>由高到低看函式**怎麼被呼叫**（call-site），不是看它寫在哪：

| 優先序 | 綁定方式 | 怎麼觸發 | `this` 指向 |
|---|---|---|---|
| 1（最高） | <mark style="background: #FF5582A6;">`new` 綁定</mark> | `new Foo(...)` | 引擎當場生出的**全新空物件**（就是這次 `new` 建出來的實例） |
| 2 | 顯性綁定 | `.call()` / `.apply()` / `.bind()` | 你手動指定的那個物件 |
| 3 | 隱性綁定 | `obj.method()`（點號前有物件） | 呼叫當下點號前面的那個物件（receiver） |
| 4（最低） | 預設綁定 | `func()` 獨立呼叫 | 嚴格模式 `undefined`；非嚴格模式全域物件 |
| （不適用上表） | <mark style="background: #ADCCFFA6;">箭頭函式</mark> | 沒有「呼叫方式」這回事，箭頭函式**沒有自己的 `this`** | 定義當下，往外找**最近一層有自己 `this` 的作用域**直接繼承 |

### 對應到 `RefImpl` 的兩個例子

```javascript
class RefImpl {
  constructor(value) { this._value = value }   // ← 規則 1：new 綁定
  get value() { track(this, 'value'); return this._value }  // ← 規則 3：隱性綁定
  set value(v) { this._value = v; trigger(this, 'value') }
}
const r = new RefImpl(0);   // 觸發 constructor：this = 這次 new 出來的新物件
r.value;                    // 觸發 getter：this = r（點號前面那個）
```

- `constructor` 裡的 `this` 之所以知道是「這個實例」，**不是因為程式碼寫在 class 裡面**，而是因為呼叫方式是 `new RefImpl(...)`——`new` 這個關鍵字本身的規範行為就是：先造一個空物件、把它的原型指到 `RefImpl.prototype`、然後用這個新物件當 `this` 去執行建構式本體。<mark style="background: #BBFABBA6;">只要看到 `new Xxx(...)`，`this` 一律是那個當場生出來的新物件</mark>，不用猜。
- `get value()`／`set value()` 是**方法**，被呼叫的方式是 `r.value`（讀）／`r.value = x`（寫），前面有物件點著它 → 隱性綁定 → `this = r`。跟一般方法 `obj.method()` 是同一條規則，只是觸發方式包裝成「存取屬性」而非「呼叫函式」。

> [!warning] 「定義」跟「觸發」是兩件事（2026-09-03 實測踩坑）
> 在 `happy-vue-playground/src/App.vue` 裡發現：整份檔案**只有 `class RefImpl` 的定義，完全沒有任何一行 `new RefImpl(...)`**——這個 class 從沒被實例化過。這帶出一個容易搞混的地方：
> <mark style="background: #FF5582A6;">單純「寫」一段 `constructor(value){...}` 只是**定義**，不會觸發任何 this 綁定。</mark>new 綁定是「**呼叫** `new RefImpl(x)` 那一刻」才會發生的事件——函式定義出來但從沒被呼叫過，`this` 根本無從談起，因為 `this` 綁定本來就是「函式被呼叫的當下」才決定的東西（呼應上面的核心原則：看**怎麼被呼叫**，不是看**寫在哪裡**）。
> <mark style="background: #BBFABBA6;">同樣的邏輯也適用於這篇最上面的 call/apply/bind：`function greet(){...}` 這段定義本身也沒有任何 this 綁定，要等到 `greet.call(person, ...)` 這行真的執行，綁定才發生。</mark>「定義」只是把程式碼準備好放在那裡；「this 綁定」永遠發生在**呼叫的那一刻**。

### 延伸提問：constructor 的 this 永遠都是這個實例嗎？那輸出永遠都是那個 class 的名字嗎？（2026-09-03）

<mark style="background: #BBFABBA6;">「this 永遠是這次被 new 出來的實例」這句話對；但「輸出永遠是字面上寫的那個 class 名稱」不一定對——差別在有沒有繼承。</mark>

只要沒有子類別，兩者確實會一致：

```javascript
const r = new RefImpl(10);
console.log(r); // RefImpl { _value: 10 }
```

但一旦有子類別繼承它，`this` 綁的還是「這次被 new 出來的實例」，只是這個實例的真正身分變了：

```javascript
class SpecialRef extends RefImpl {
  constructor(value) { super(value); this.tag = 'special' } // super(value) 執行的是 RefImpl 的 constructor 本體
}
const s = new SpecialRef(1);
console.log(s); // SpecialRef { _value: 1, tag: 'special' }——不是 RefImpl！
```

`super(value)` 那一刻，程式碼確實在跑 `RefImpl` 的 constructor 本體（`this._value = value` 那一行），但當下 `this` 綁的是 `new SpecialRef(...)` 生出來的那個實例——引擎靠內部的 `new.target` 機制記得「這次真正被 new 的是誰」，所以就算執行的是父類別的 constructor 程式碼，實例的原型鏈起點、`console.log` 印出來的建構子名稱，仍然是子類別 `SpecialRef`。

<mark style="background: #FFF3A3A6;">精確講法：`this` 永遠是「這次被 new 出來的那個實例」，而這個實例屬於哪個 class，取決於呼叫 `new` 時寫的是哪個 class 名稱——不是取決於「目前正在執行哪一段 constructor 程式碼」。</mark>只要程式碼裡沒有繼承，`new RefImpl(...)` 當然每次都印 `RefImpl`；一旦有子類別呼叫 `super()`，才會出現「執行的是父類別程式碼、印出來卻是子類別名字」這種看似矛盾的結果。

延伸應用：`happy-vue-playground/src/App.vue` 裡目前的 `class RefImpl` 沒有任何子類別，所以 `new RefImpl(10)` 印出來會是 `RefImpl { _value: 10 }`，這題的「例外情況」暫時不會發生。

### 箭頭函式（含 `async` 箭頭）的 `this`：跟「找最近的誰」有關，但不是「最外層」

<mark style="background: #FF5582A6;">箭頭函式不是「往最外層找」，是「往最近的一層有自己 this 的作用域找」——跟閉包找變數的機制一模一樣，只是找的目標從「變數」換成「this 這個特殊綁定」。</mark>

具體做法：從箭頭函式定義的位置開始，沿著詞法作用域鏈往外一層一層爬，**跳過所有箭頭函式**（因為箭頭函式自己沒有 `this`，只是繼續往外傳），一直爬到第一個滿足下面任一條件的地方就停：

1. 遇到第一個**非箭頭函式**（一般 function 或方法）→ 用**那個函式被呼叫的方式**（上面優先序 1-4）決定的 `this`
2. 遇到 class 欄位初始化器（class field）→ `this` = 該 class 的實例
3. 一路爬到最外層（module 頂層／`<script setup>` 頂層）都沒遇到 → module 是嚴格模式，`this` = `undefined`

```javascript
const obj = {
  name: 'Abby',
  normal: function () {
    setTimeout(function () { console.log(this) }, 0);   // 預設綁定 → undefined/window，脫鉤
    setTimeout(() => { console.log(this) }, 0);          // 箭頭 → 往外找到 normal，normal 是 obj.normal() 呼叫 → this = obj
  }
};
obj.normal();
```

<mark style="background: #ADCCFFA6;">`async` 完全不影響這條規則。</mark>`async` 只多做兩件事：函式回傳 Promise、函式體內能用 `await`。它不改變 `this` 的判斷方式——`async () => {...}` 的 `this` 判斷法跟同步箭頭函式 `() => {...}` 完全相同（往外找最近的非箭頭作用域），`async function () {...}` 的 `this` 判斷法也跟同步的一般函式完全相同（看呼叫方式）。很多人以為「非同步」會讓 `this` 變得特別，其實 `this` 綁定是**呼叫當下**就決定的靜態規則，跟這段程式碼**什麼時候**真正執行（同步／microtask／macrotask）是兩件事——跟 [[13-閉包-Closure-私有變數與傳址陷阱]] 那篇「閉包 vs 微任務」的分法是同一種思維：一個管「看得到誰」，一個管「什麼時候跑」。

### Vue 的 `this`：Options API 有、Composition API 刻意不用

- <mark style="background: #ADCCFFA6;">Options API</mark>（`methods: { add() { this.count++ } }`）：`methods` 裡的函式是 Vue **內部呼叫時用類似 `method.call(componentInstance)` 的方式**去執行，所以是**隱性/顯性綁定**，`this` = 元件實例。這也是為什麼 Options API 的 `methods` 裡**不能用箭頭函式**——箭頭函式沒有自己的 `this`，會往外抓到定義時的作用域（通常是 `undefined` 或 module scope），永遠抓不到元件實例。
- <mark style="background: #ADCCFFA6;">Composition API</mark>（`<script setup>`、`setup()`）：Vue team 刻意設計成**完全不靠 `this`**，改用一般的 JS **閉包**機制——`ref()`／`reactive()` 回傳的變數本身就被 `<script setup>` 這個作用域「記住」了，函式要用哪個狀態直接引用區域變數即可（跟本篇最上面 `createWallet` 私有變數是同一套機制）。這就是為什麼 `<script setup>` 裡不管是不是箭頭函式，寫法完全一致，也不用煩惱 `this` 指向誰的問題。

## 面試考題參考資料

- [MDN — Function.prototype.call()](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Function/call)
- [MDN — Function.prototype.apply()](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [HackMD 筆記 — call / apply / bind](https://hackmd.io/@jrf2e-note/Bk3BX4syWg)

## 重點整理

`call`、`apply`、`bind` 都是用來<mark style="background: #FFF3A3A6;">改變函式執行時 `this` 指向</mark>的方法，讓你靈活控制函式的上下文（context）。

### 1. call() — 立即執行，參數逐一傳入

<mark style="background: #BBFABBA6;">立即執行函式</mark>並手動指定 `this`，參數以<mark style="background: #ADCCFFA6;">逗號分隔依序傳入</mark>。適合需要立即調用且參數數量明確時。

```javascript
const person = { name: 'Alice' };
function greet(greeting, punctuation) {
  console.log(`${greeting}, ${this.name}${punctuation}`);
}
greet.call(person, 'Hello', '!'); // Hello, Alice!
```

### 2. apply() — 立即執行，參數用陣列

功能與 `call` 完全相同（立即執行 + 綁定 `this`），<mark style="background: #FF5582A6;">唯一差別：參數以「陣列」傳入</mark>。當參數本來就在陣列中、或參數數量不固定時更方便。

```javascript
const person = { name: 'Bob' };
function introduce(job, hobby) {
  console.log(`${this.name} is a ${job} and likes ${hobby}.`);
}
const args = ['Engineer', 'coding'];
introduce.apply(person, args); // Bob is a Engineer and likes coding.
```

### 3. bind() — 不執行，回傳綁定後的新函式

與前兩者不同：<mark style="background: #FF5582A6;">`bind` 不會立即執行</mark>，而是回傳一個<mark style="background: #BBFABBA6;">把 `this` 永久綁定</mark>到指定物件的新函式。適合事件監聽或需要延遲執行的場景。

```javascript
const user = { name: 'Charlie' };
function showName() { console.log(this.name); }
const boundFunc = showName.bind(user);
boundFunc(); // Charlie
```

### 總結比較表

| 方法 | 是否立即執行 | 參數傳遞方式 | 主要用途 |
|---|---|---|---|
| `call` | <mark style="background: #BBFABBA6;">是</mark> | 逐一傳入（參數清單） | 借用方法、立即改變上下文 |
| `apply` | <mark style="background: #BBFABBA6;">是</mark> | <mark style="background: #ADCCFFA6;">陣列傳入</mark> | 處理陣列參數、數學運算（如 `Math.max`） |
| `bind` | <mark style="background: #FF5582A6;">否</mark> | 逐一傳入 | 建立新的回呼函式、預設參數 |

### 快問快答（自我測驗）

- call 可以延遲執行嗎？ → <mark style="background: #FF5582A6;">不行，它會直接調用函式。</mark>
- 什麼時候最適合用 apply？ → <mark style="background: #BBFABBA6;">當參數已在陣列中，或要用 `Math.max` 等需要多個參數的內建函式時。</mark>
- bind 綁定後的函式 this 還能再變嗎？ → <mark style="background: #FF5582A6;">不能，bind 建立的是強連結（永久綁定）。</mark>

## 疑惑釐清：call 的 this 與傳參

### MDN 語法
```
fun.call(thisArg[, arg1[, arg2[, ...]]])
```
- `thisArg`：要綁給函式當 `this` 的東西（就是**第一個參數**）
- `arg1, arg2, ...`：之後的參數，會**依序**傳給原函式

### 針對 call() 第一段 code snippet 的疑惑
```javascript
const person = { name: 'Alice' };
function greet(greeting, punctuation) {
  console.log(`${greeting}, ${this.name}${punctuation}`);
}
greet.call(person, 'Hello', '!'); // Hello, Alice!
```

**Q1：第一個參數 `person`（物件）為什麼 MDN 語法沒寫出來？**
→ 有寫，它就是語法裡的 `thisArg`。<mark style="background: #FF5582A6;">call 的第一個參數「永遠」是要當 `this` 的東西</mark>，不是給函式的一般參數。所以 `greet.call(person, ...)` 的 `person` ＝ `thisArg`。

**Q2：call 只是「綁定」，所以跟 console 印出的文字沒直接關係？**
→ 有直接關係。call 做**兩件事**：①<mark style="background: #FFB86CA6;"> 把 `this` 設成 `person`</mark>；② 把後面的 `'Hello'`、`'!'` 傳給 greet。所以 `this.name` ＝ 'Alice'、greeting ＝ 'Hello'、punctuation ＝ '!'——印出的每個字都被 call 決定。

**Q3：它怎麼知道傳入的東西要對應到 greet 的 `greeting, punctuation`？**
→ 靠**位置（順序）**。`thisArg` 之後的參數，第 1 個給第 1 個形參、第 2 個給第 2 個……
```
greet.call(person, 'Hello', '!')
           ↑this   ↑greeting ↑punctuation
```

**Q4：它傳了整個 `person`，為什麼只印出 name？**
→ 整個 `person` 確實都變成了 `this`，但 greet **只讀取了 `this.name`** 這一個屬性。傳進去的是整個物件，但程式碼只用到其中的 `name`，其他屬性就算有也不會被印（因為根本沒被存取）。

**一句話總結**：`call(thisArg, a, b)` ＝「把 thisArg 當 this」＋「a、b 依序當函式的參數」。函式印出什麼，取決於它自己讀了 this 的哪些屬性、以及怎麼用那些參數——call 只負責「把 this 和參數餵進去」，不決定函式內部怎麼用。
## 術語：形參 vs 實參

| 中文 | 全名 | 英文 | 定義 |
|---|---|---|---|
| 形參 | 形式參數 | parameter | 函式**定義**時的「佔位名」（如 `greeting`、`punctuation`）|
| 實參 | 實際參數 | argument | **呼叫**時傳的真值（如 `'Hello'`、`'!'`）|

一句話：**形參是空格子，實參是呼叫時填進去的真值**。`'Hello'`（實參）被填進 `greeting`（形參）這個格子裡。

### 用 code 看：params ≠ arguments
```javascript
function greet(greeting, punctuation) {   // greeting、punctuation = 形參 (parameter)
  console.log(`${greeting}${punctuation}`);
}
greet('Hello', '!');                      // 'Hello'、'!' = 實參 (argument)
```
<mark style="background: #ADCCFFA6;">形參 (parameter)</mark>＝函式定義時括號裡的**名字**；<mark style="background: #FFB8EBA6;">實參 (argument)</mark>＝呼叫時實際傳進去的**值**。同一個位置：`greeting` 是形參的名字，`'Hello'` 是填進格子的實參值。**params 是格子，arguments 是填進格子的東西——兩個不是同義詞。**

## 補充：函式作用域與 return（延伸到閉包）

> 剛發現：用 `let` / `var` 宣告在**函式內部**的變數，外面**存取不到**——這就是<mark style="background: #FFF3A3A6;">函式作用域 (function scope)</mark>。

```javascript
function outer() {
  let secret = 42;        // 只活在 outer 內部
  return secret;          // 用 return 把「值」丟出去
}
console.log(outer());     // 42（拿到的是「值」，不是變數本身）
// console.log(secret);   // ReferenceError: secret is not defined（外部碰不到）
```

<mark style="background: #FF5582A6;">`return` 丟出去的是「值」，不是「變數」</mark>：你拿到 42 這個值，但 `secret` 變數本身還是關在 outer 裡。
![[let函式作用域測試- 2026-07-03 164701.png]]
### 那為什麼會有閉包？
`return` 只能丟一次值就結束。若想讓外部**持續操作**函式內的變數，就用<mark style="background: #BBFABBA6;">閉包 (closure)</mark>——回傳一個「記得」外部變數的內部函式：

```javascript
function makeCounter() {
  let count = 0;          // 被「關」在 makeCounter 裡
  return function () {    // 回傳的內部函式「記住」了 count
    count++;
    return count;
  };
}
const counter = makeCounter();
counter(); // 1
counter(); // 2  ← count 沒被清掉，被閉包保留著、還能繼續加
```

| | `return 值` | 閉包 (closure) |
|---|---|---|
| 拿到的 | 一次性的**值**（快照） | 能持續存取的**活變數** |
| 之後還能變嗎 | 不能，已離開函式 | 能，內部函式一直記著 |

深入：[[作用域-scope-global-function-block]]、[[閉包-Closure-私有變數與傳址陷阱]]、[[return-清理記憶體-stack-frame與閉包例外]]

## 同步執行 vs 延遲執行：call stack 與 queue

> 為什麼「call 不能延遲執行」？要先懂 JS 怎麼決定「現在跑」還是「等一下跑」。

### Call Stack（呼叫堆疊）＝「現在就跑」的地方
JS 執行函式時，把它推進 **call stack**（後進先出 LIFO）立刻執行、跑完彈出。
`greet.call(person, 'Hello', '!')` 就是一個**普通的同步函式呼叫**——被推進 call stack **立刻執行**，只是執行前先把 `this` 綁成 person。

### Queue（佇列）＋ Event Loop ＝「等一下才跑」的地方
有些工作不是現在跑，而是**排隊等**：
- **Macrotask（巨任務）queue**：`setTimeout`、`setInterval`、事件回呼
- **Microtask（微任務）queue**：`Promise.then`、`queueMicrotask`

**Event Loop（事件迴圈）** 的規則：**call stack 空了**，才從 queue 拿東西進來跑（微任務優先於巨任務）。這就是「延遲執行」。

### 所以「call 能延遲執行嗎？」→ 不行
`call()` 是**同步**的：一呼叫就進 call stack 立刻跑，**不會進 queue、不經過 event loop**。

想要「延遲」得自己包一層：
```javascript
// 立刻執行（call 本身）
greet.call(person, 'Hello', '!');                       // 現在就印

// 延遲執行（用 setTimeout 丟進 queue，1 秒後才跑）
setTimeout(() => greet.call(person, 'Hi', '?'), 1000);

// bind 是「先綁好、之後再呼叫」，但呼叫那一刻仍是同步
const later = greet.bind(person, 'Hey', '.');
later();                                                 // 呼叫時才跑（同步）
```

> 對照：`call`/`apply` 立即執行（進 call stack）；`bind` 回傳新函式、等你之後呼叫——但**三者被「呼叫」的那一刻都是同步的**，沒有一個會自己排進 queue。真正的延遲要靠 setTimeout / Promise。

相關：[[事件循環-Event-Loop-微任務與巨任務]]、[[執行緒-非同步-延遲的差異]]
## 相關筆記

- 原生函式怎麼判斷：[[JS-native-function-check]]
- 原型鏈（call/apply/bind 住在 Function.prototype）：[[Constructor-與-Prototype-關係]]、[[查看plain-object的prototype]]
- 延遲執行 / 事件迴圈：[[事件循環-Event-Loop-微任務與巨任務]]、[[執行緒-非同步-延遲的差異]]

## 各對話來源

### JavaScript Call Apply Bind 詳解（2026-06）— https://gemini.google.com/app/f42284f776f921bb

**使用者：** 各三段解釋 call bind apply，概念三句並每一個用一段程式碼帶出來

**Gemini：** （分別解說 call（立即執行、逗號參數）、apply（立即執行、陣列參數）、bind（回傳綁定新函式、不執行），各附程式碼範例、總結比較表與投影片式快問快答。內容已整合進上方「重點整理」。結尾詢問是否想深入應用場景或與箭頭函式的差異。）

### JavaScript 匿名函式與 `this` 綁定（2026-07）— https://gemini.google.com/app/915c5a52efbf1ac0

**使用者：** 「瀏覽器偷偷把這個匿名函式拿出來執行時，它是獨立被呼叫的（前面沒有任何物件點它）」——幫我把匿名函式標出來，還有「它」是誰？

**Gemini：** 以 `setTimeout(function(){...}, 1000)` 為例：匿名函式＝ `function(){...}` 整段；「它」＝該匿名函式。`this` 看呼叫方式而非定義位置：`obj.method()` 是隱性綁定（`this`＝obj）；獨立呼叫 `func()` 是預設綁定，非嚴格模式 `this` 脫鉤指向 `window`。回呼被瀏覽器獨立拉出執行時就是這種情況——內容已整合進上方「this 綁定規則」。

[^1]: 
