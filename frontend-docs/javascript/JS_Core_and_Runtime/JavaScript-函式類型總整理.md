---
title: JavaScript 函式類型總整理（宣告/表達式/具名匿名/Generator/Constructor）
type: topic-note
source: ChatGPT
tags: [gemini, chatgpt, javascript, function, hoisting, generator, obsidian]
sources:
  - https://chatgpt.com/share/6a36285c-66b4-83e8-bb53-a6a83e0d7162
  - https://gemini.google.com/share/36c04292fea7
updated: 2026-06-30
---

# JavaScript 函式類型總整理

> 來源為 ChatGPT 分享對話，Abby 指定的複習重點之一。

## 重點整理

### 一、最關鍵的兩條軸：宣告 vs 表達式

| 類型               | 語法                           | 可否提升(hoisting) | 可否匿名         |
| ---------------- | ---------------------------- | -------------- | ------------ |
| 函式宣告 Declaration | `function foo() {}`          | ✅ 會提升（連名帶身體）   | ==❌ 一定要有名字== |
| 函式表達式 Expression | `const foo = function () {}` | ❌ 不會提升         | ✅ 可匿名或具名     |

- <mark style="background: #FFF3A3A6;">函式宣告會 hoisting</mark>：宣告前就能呼叫（引擎在編譯階段把整個函式提到範疇頂端）。
- <mark style="background: #FF5582A6;">函式表達式不會 hoisting</mark>：賦值前呼叫會落在 TDZ／undefined 而報錯。

### 二、具名 vs 匿名（不具名）
「具名／匿名」是形容<mark style="background: #ADCCFFA6;">「有沒有函式名稱」</mark>：

- 具名函式：`function foo(){}`、`const a = function bar(){}`
- 匿名函式：`function(){}`（沒名字）
- <mark style="background: #BBFABBA6;">「不具名」=「匿名」</mark>，只是中文翻譯不同，是同義詞。

> [!warning] 為什麼沒有「匿名函式宣告」？
> 因為<mark style="background: #FF5582A6;">函式宣告語法的 `function` 一定要有名字</mark>，`function(){}` 直接 SyntaxError。匿名只能出現在「函式表達式」。所以：具名函式宣告 ✅、匿名函式宣告 ❌、匿名函式表達式 ✅、具名函式表達式 ✅。

### 三、其他常見函式型態
- <mark style="background: #ADCCFFA6;">具名函式表達式</mark>（Named Function Expression）：`const a = function foo(){}`——名字 `foo` 只在函式內部可見，利於遞迴與除錯堆疊。
- <mark style="background: #ADCCFFA6;">Generator 函式</mark>：`function* gen(){}`，`*` 代表這是產生器函式，可用 <mark style="background: #FFF3A3A6;">`yield`</mark> 暫停/分次回傳。
  - `yield`：產出一個值並「暫停」，下次 `.next()` 從這裡繼續。
  - `return`：直接結束產生器（`done:true`）。
- <mark style="background: #ADCCFFA6;">Constructor 函式（建構式）</mark>：用 `new` 呼叫、慣例首字大寫，用來產生物件實例。
- （延伸）箭頭函式 `()=>{}`：一定匿名、不綁自己的 `this`，常作回呼。

### 四、箭頭函式的 `this`（事件監聽器情境）

箭頭函式<mark style="background: #FF5582A6;">不綁自己的 `this`</mark>，而是<mark style="background: #FFF3A3A6;">從外層作用域繼承</mark>過來。所以在 `addEventListener` 裡寫箭頭函式時，`this` 是「綁定事件時所在的上下文」，<mark style="background: #FF5582A6;">不是被點的按鈕本身</mark>。

> [!important] 「普通函式」是指函式宣告還是函式表達式？→ <mark style="background: #BBFABBA6;">both（兩者都是）</mark>
> 決定 `this` 的軸線是「**箭頭 vs 非箭頭**」，<mark style="background: #FF5582A6;">不是「宣告 vs 表達式」</mark>。
> - <mark style="background: #FFF3A3A6;">函式宣告 `function foo(){}` 和函式表達式 `const foo = function(){}` 對 `this` 的行為完全相同</mark>——`this` 都是「**呼叫當下才決定**」（看 call-site：誰、怎麼呼叫）。
> - 宣告 vs 表達式的差別只影響 **hoisting**（見第一節），<mark style="background: #FF5582A6;">不影響 `this`</mark>。
> - 方法簡寫 `{ handle(){} }` 也算「普通（非箭頭）函式」，行為一樣。

### 四之一、函式表達式的 `this`（與宣告相同）

「非箭頭函式」的 `this` 由<mark style="background: #FFF3A3A6;">呼叫方式</mark>決定，宣告與表達式皆然：

| 怎麼呼叫 | `this` 指向 |
|---|---|
| `obj.fn()`（當方法呼叫） | `obj` |
| `fn()`（單獨呼叫） | `undefined`（strict）/ `window`（非嚴格） |
| `el.addEventListener('click', fn)` | <mark style="background: #BBFABBA6;">綁監聽器的元素（= `e.currentTarget`）</mark> |
| `fn.call(x)` / `.apply(x)` / `.bind(x)` | `x` |
| `new Fn()` | 新建立的實例 |

```javascript
// ① 函式表達式（匿名）→ this = button
button.addEventListener('click', function () { console.log(this); });

// ② 函式宣告，先宣告再傳 → this 一樣 = button
function handle() { console.log(this); }
button.addEventListener('click', handle);

// ③ 方法簡寫（也是普通函式）→ this = button
const obj = { handle() { console.log(this); } };
button.addEventListener('click', obj.handle);
```

> 三種寫法的 `this` 都是 button，因為它們都是<mark style="background: #FF5582A6;">非箭頭函式</mark>；換成 `() => {}` 才會繼承外層。

- 例：按鈕掛在 `document` 或某個 `div` 內，箭頭函式裡的 `this` 會指向那個外層物件（`document` / `div`），而不是 button。
- <mark style="background: #BBFABBA6;">想讓 `this` 真的指向按鈕（觸發事件的元素），就用「普通函式」</mark>：

```javascript
// 普通函式：this 就是按鈕本身
button.addEventListener('click', function () {
  console.log(this); // 這裡 this = 被點的 button
});

// 箭頭函式：this 繼承外層，不是 button
button.addEventListener('click', () => {
  console.log(this); // 指向外層上下文（如 document / 模組），不是 button
});
```

> [!tip] 小結
> 要拿「觸發事件的元素」：用普通函式的 `this`，或不論哪種寫法都可改用 <mark style="background: #BBFABBA6;">`e.currentTarget`</mark>（綁監聽器的元素）／`e.target`（實際被點的元素），就不受 `this` 綁定影響。

## 五、前端面試考題（this 綁定綜合，來源：Gemini）

> 來源：[Gemini 分享對話](https://gemini.google.com/share/36c04292fea7)（JavaScript 事件循環 / 閉包 / this 綁定核心觀念複習）
> 關聯筆記：[[Hoisting-函式宣告vs函式表達式-TDZ]] · [[作用域-scope-global-function-block]] · [[傳值vs傳址-賦值與記憶體空間]] · [[執行緒-非同步-延遲的差異]] · [[記憶體模型-stack-heap-動態配置-GC]]

### 🔑 判斷 this 的兩條黃金口訣
- <mark style="background: #FFF3A3A6;">傳統（非箭頭）函式</mark>：**不看宣告看呼叫** —— 誰「點（`.`）」它，`this` 就是誰；沒人點就是預設綁定（非嚴格→全域物件、嚴格→`undefined`）。
- <mark style="background: #ADCCFFA6;">箭頭函式</mark>：**不看呼叫看宣告** —— `this` 在定義當下就繼承外層範疇，之後 `call/apply/bind` 都改不動。
- 另外兩種綁定：`new`（→新實例）、`call/apply/bind`（→強制指定）。

> [!question]- 是非題 T5：函式宣告會 hoisting（提升），所以它的 `this` 也會在提升時就被決定。（○／✗）
> **✗ 錯。** Hoisting <mark style="background: #FF5582A6;">只影響「函式/變數能不能在宣告前被存取」</mark>，跟 `this` 完全無關。傳統函式的 `this` 是在**被呼叫的那一刻**依呼叫方式動態決定；箭頭函式的 `this` 是在**定義位置**依語彙範疇決定。兩者都不是「提升時」決定。→ 詳見 [[Hoisting-函式宣告vs函式表達式-TDZ]]

> [!question]- 是非題 T6：把物件方法賦值給新變數再單獨呼叫（`const f = obj.method; f()`），`this` 仍然指向原本的物件。（○／✗）
> **✗ 錯。** 賦值只是複製了函式的參照；單獨呼叫時前面沒有物件點它 → 觸發**預設綁定**，`this` 變成全域物件（非嚴格）或 `undefined`（嚴格）。這就是 React class 要 `this.handleClick = this.handleClick.bind(this)` 的原因。

---

> [!question]- 含金量題 Q1：this 的四種綁定路徑（東尼史塔克）
> ```js
> var name = '全域大大';
> const ironMan = {
>   name: '東尼史塔克',
>   sayName: function () { console.log('一：', this.name); },
>   delaySayName1: function () { setTimeout(function () { console.log('二：', this.name); }, 100); },
>   delaySayName2: function () { setTimeout(() => { console.log('三：', this.name); }, 100); }
> };
> const genericSayName = ironMan.sayName;
> ironMan.sayName();       // 狀況一
> ironMan.delaySayName1(); // 狀況二
> ironMan.delaySayName2(); // 狀況三
> genericSayName();        // 狀況四
> ```
> **答案（非嚴格模式）：一 東尼史塔克、二 全域大大、三 東尼史塔克、四 全域大大。**
> - 一：隱式綁定，`ironMan.` 點它 → `ironMan`。
> - 二：傳統函式被 `setTimeout` 當 callback，100ms 後由 Event Loop 獨立呼叫（前面沒人點）→ 預設綁定 → 全域。
> - 三：箭頭函式繼承外層 `delaySayName2` 的 `this`（= `ironMan`）→ 東尼史塔克。
> - 四：只複製了函式參照，`genericSayName()` 獨立呼叫 → 預設綁定 → 全域。
> - 嚴格模式下：二、四會變 `undefined`，讀 `undefined.name` 直接 `TypeError`。
> 關聯：[[執行緒-非同步-延遲的差異]]（為何 callback 最後才跑）

> [!question]- 含金量題 Q2：巢狀物件 + 箭頭函式的範疇陷阱（蜘蛛人）— 大魔王
> ```js
> var name = '全域老爸';
> const hero = {
>   name: '蜘蛛人',
>   actions: {
>     name: '彼得帕克',
>     sayName1: function () { console.log(this.name); },
>     sayName2: () => { console.log(this.name); }
>   },
>   sayName3: function () {
>     const inner = () => { console.log(this.name); };
>     inner();
>   }
> };
> hero.actions.sayName1();                         // 狀況一
> hero.actions.sayName2();                         // 狀況二
> const mid = hero.actions.sayName1; mid();        // 狀況三
> hero.sayName3();                                 // 狀況四
> ```
> **答案：一 彼得帕克、二 全域老爸、三 全域老爸、四 蜘蛛人。**
> - 一：`hero.actions.` 最後一個點它的是 `actions` → 彼得帕克。（隱式綁定只認**最後一層**呼叫者）
> - 二：<mark style="background: #FF5582A6;">大魔王</mark> —— 箭頭函式的外層 `this` **不是** `actions` 物件！因為<mark style="background: #FFF3A3A6;">物件字面量 `{}` 不會產生新的作用域</mark>；箭頭定義時外層是全域，故 `this` = 全域 → 全域老爸。
> - 三：賦值後單獨呼叫 → 預設綁定 → 全域老爸。
> - 四：`sayName3` 被 `hero.` 呼叫 → `this` = `hero`；內層箭頭 `inner` 繼承它 → 蜘蛛人。
> 關聯：[[作用域-scope-global-function-block]]、[[傳值vs傳址-賦值與記憶體空間]]

> [!question]- 含金量題 Q3：為什麼物件方法要用一個 function 把 setTimeout「包起來」？
> ```js
> // ✅ 正確：延遲執行（lazy），delaySayName1 裝的是「函式藍圖」
> delaySayName1: function () { setTimeout(() => {/*...*/}, 100); }
> // ❌ 錯誤：建立物件當下就立刻執行 setTimeout
> delaySayName1: setTimeout(() => {/*...*/}, 100)
> ```
> **重點：** 沒包 function 的話，瀏覽器讀到物件字面量的<mark style="background: #FFF3A3A6;">那一刻就立刻執行 `setTimeout`</mark>，倒數馬上開始；而且 `setTimeout` 會回傳一個 **Timer ID（正整數）**，於是 `delaySayName1` 裡裝的是數字 `1` 而不是函式，之後 `ironMan.delaySayName1()` 等於 `1()` → `TypeError: is not a function`。
> 外層那個 `function(){}` 是「延遲執行的保護殼」——被呼叫時才打開執行裡面的 `setTimeout`。
> 補充：`setTimeout`／`setInterval` 共用同一個編號池，回傳的 Timer ID 用來 `clearTimeout(id)`／`clearInterval(id)` 取消（Node.js 回傳的是 Timeout 物件而非純整數）。

> [!question]- 含金量題 Q4：Event Loop 輸出順序（同步 → 微任務 → 巨任務）
> ```js
> console.log('1');
> setTimeout(() => console.log('2'), 0);
> Promise.resolve().then(() => console.log('3'));
> console.log('4');
> ```
> **答案：1 → 4 → 3 → 2。** 同步碼先跑（1、4）；`Promise.then` 是**微任務**，優先於 `setTimeout` 的**巨任務**；每次 Call Stack 清空，Event Loop 會**先把微任務佇列清空**才執行下一個巨任務。
> 關聯：[[執行緒-非同步-延遲的差異]]、[[記憶體模型-stack-heap-動態配置-GC]]

## Obsidian callout / CSS Snippet 筆記（同對話的次要重點）

- <mark style="background: #FF5582A6;">toggle 一遇程式碼就中斷</mark>：在 Obsidian 的折疊（callout/toggle）裡嵌程式碼區塊容易把區塊切斷，需注意縮排與是否在 callout 內正確續行。
- <mark style="background: #FFB8EBA6;">callout 內 h3 比外面 h3 還大</mark>：是 snippet 把 `.callout h6`（或標題層級）樣式覆寫到了 callout 內標題；把 `.callout h6` 註解掉反而出問題，代表你的標題實際吃到的是 h6 規則。調整 callout 內標題字級要對「.callout 內對應層級」設定，而非全域 h3/h6。
- <mark style="background: #ADCCFFA6;">對比色</mark>：`background-color: var(--code-background); color: var(--code-color);` 就是讓底色與文字做對比的意思。
- <mark style="background: #FF5582A6;">`- [ ]` 沒出現 checkbox</mark>：①確認是 `.md` 檔（Canvas 的原生 text card 不解析）；②輸入要用<mark style="background: #BBFABBA6;">半形英文</mark>（中文全形符號不行）：`- [ ] 這是待辦`；③設定→編輯器→「調整 Checklist」要開；④檢查是否有 CSS snippet 蓋掉 checkbox 樣式。
- Canvas vs 一般編輯器：Canvas 是 Obsidian 1.1.0+ 的「畫布式筆記」（拖拉卡片、連結），與標準 Markdown 編輯器不同。

## 各對話來源

### JavaScript 函式類型總整理 & Obsidian-callout（ChatGPT 分享）— https://chatgpt.com/share/6a36285c-66b4-83e8-bb53-a6a83e0d7162

對話涵蓋兩大主題：
1. **Obsidian callout / CSS Snippet**：toggle 遇程式碼中斷、callout 內 h3 因 `.callout h6` 規則而變大、`var(--code-background)/--code-color)` 對比色、`- [ ]` checkbox 不顯示的排查（檔案需為 .md、半形輸入、開啟「調整 Checklist」、檢查 snippet）、Canvas 與標準編輯器差異。
2. **JavaScript 函式類型**：函式宣告 vs 函式表達式（hoisting 差異）、具名 vs 匿名（=不具名，同義詞）、為何沒有「匿名函式宣告」（宣告必須有名字否則 SyntaxError）、具名函式表達式、Generator `function*` 的 `*` 與 `yield` vs `return`、Constructor 建構式函式。

### JavaScript 事件循環 / 閉包 / this 綁定核心觀念（Gemini 分享）— https://gemini.google.com/share/36c04292fea7
涵蓋：Event Loop（Call Stack／Web APIs／微任務 vs 巨任務、輸出順序 1→4→3→2）、閉包（私有變數、`var` 迴圈陷阱、傳址導致私有性「漏水」與 `[...arr]` 切斷參照）、this 四種綁定（隱式／預設／箭頭繼承／賦值後獨立呼叫）、巢狀物件 + 箭頭範疇陷阱、`setTimeout` 需用 function 包裹（lazy execution）與 Timer ID、Call Stack push/pop 順序、`const` 鎖外殼不鎖內容。已整理成第五節「前端面試考題」。

### 補充（Abby 提供的重點）— 箭頭函式的 this
箭頭函式的 `this` 從外層作用域繼承，事件監聽器裡用箭頭函式時 `this` 指向綁定當下的上下文（如 document/div）而非按鈕；想指向按鈕本身要用普通函式 `function(){ console.log(this) }`。
