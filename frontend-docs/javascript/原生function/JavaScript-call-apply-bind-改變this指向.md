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
