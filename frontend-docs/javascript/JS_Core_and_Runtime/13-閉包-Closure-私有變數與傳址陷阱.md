---
title: JavaScript 閉包 Closure（私有變數、傳址陷阱、C++ 對比）
type: topic-note
source: Gemini
tags: [gemini, javascript, closure, 閉包, 作用域, 記憶體, 面試, identifier, 函式參數]
aliases: [閉包-Closure-私有變數與傳址陷阱]
related:
  - "[[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]"
sources:
  - https://gemini.google.com/app/82167bcb1c15c00c
  - https://gemini.google.com/app/86e4b6c70330327f
  - https://gemini.google.com/app/296e1a879bb61062
  - https://gemini.google.com/app/d54c36b18b457e25
  - https://gemini.google.com/app/0211c80a1b2bcc92
  - https://gemini.google.com/app/31394da17f3e5427
  - https://gemini.google.com/app/70a9f602e3c9c891
  - https://gemini.google.com/app/2fc4fed6f6ed7894
  - https://gemini.google.com/app/b2b1ac3e8d339685
  - https://gemini.google.com/app/3e31b6dfa1a781b7
updated: 2026-07-31
---

# JavaScript 閉包 Closure（私有變數、傳址陷阱、C++ 對比）

> [!info]- 📍 承接12，目前是最後一篇
> <mark style="background: #ADCCFFA6;">承接</mark>：[[12-return-清理記憶體-stack-frame與閉包例外]]點出「閉包會讓變數逃逸到Heap」這個現象，這篇是閉包的完整深入篇——私有變數、傳址陷阱、跟C++的對比。
> <mark style="background: #FFF3A3A6;">目前進度</mark>：這是目前編號到13的最後一篇，14號開始接哪個主題還在跟Abby討論排法。

## 重點整理

一句話定義：<mark style="background: #FFF3A3A6;">閉包是一個內層函式，能「記憶」並存取外層函式的範疇（Scope），即使外層函式已經執行完畢、從 [[事件循環-Event-Loop-微任務與巨任務|Call Stack]] 離開了（機制細節見 [[return-清理記憶體-stack-frame與閉包例外]]；函式參數綁定與 Execution Context 完整整理見 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]）。</mark> 在 JS 中閉包<mark style="background: #ADCCFFA6;">不是要特別開啟的功能</mark>，而是伴隨函式建立而自然誕生的底層機制。

兩大基石：

- <mark style="background: #ADCCFFA6;">詞法範疇 Lexical Scope</mark>：變數的存取權限在<mark style="background: #FFF3A3A6;">「程式碼被寫下來的那一刻（宣告位置）」</mark>就決定了，而不是函式被執行的那一刻。
- <mark style="background: #ADCCFFA6;">垃圾回收 GC</mark>：一般函式執行完，局部變數會被釋放；但若該變數<mark style="background: #FFF3A3A6;">還被內層函式引用</mark>，瀏覽器就不敢釋放，會繼續留在記憶體（Heap）中。

### 應用：用閉包做私有變數

```javascript
function createCounter() {
  let count = 0; // 鎖在 createCounter 範疇內，外部摸不到
  return {
    increment: function() { count++; console.log(count); },
    decrement: function() { count--; console.log(count); }
  };
}
const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
// console.log(count); // ReferenceError: count is not defined
```

`createCounter()` 執行完回傳物件後，因為回傳的方法仍引用 `count`，所以 `count` <mark style="background: #BBFABBA6;">活在閉包裡，成為這些方法的專屬私有變數</mark>。

### 經典面試題：var 迴圈 + setTimeout

```javascript
for (var i = 1; i <= 3; i++) {
  setTimeout(() => { console.log(i); }, 1000);
}
```

直覺以為 1,2,3；<mark style="background: #FF5582A6;">實際是 4, 4, 4</mark>。
因為 `var` 是<mark style="background: #FFF3A3A6;">函式作用域</mark>，迴圈裡沒有函式包裹時它幾乎等同全域變數；1 秒後回呼執行時迴圈早跑完，全域 `i` 已累加到 4，三個閉包指向同一個 `i`。
修正：把 `var` 改成 <mark style="background: #BBFABBA6;">`let`（區塊作用域）</mark>，每次迭代建立獨立範疇，三個閉包各自鎖定 1, 2, 3。

### 魔王題：閉包「漏水」（傳值 vs 傳址）

```javascript
function createWallet(initialAmount) {
  let money = initialAmount;
  let history = [];
  return {
    checkBalance: () => money,
    getHistory: () => history,         // 直接回傳陣列參照！
    spend: (amount) => { if (amount <= money) { money -= amount; history.push(`Spent ${amount}`); } }
  };
}
const myWallet = createWallet(100);
const record = myWallet.getHistory();  // record 與閉包內 history 指向同一陣列
myWallet.spend(30);                     // money 70, history=['Spent 30']
record.push('Found 100 on the street');// 直接竄改了閉包內部私有狀態！
myWallet.spend(20);                     // money 50
myWallet.checkBalance(); // 50
myWallet.getHistory();   // ['Spent 30','Found 100 on the street','Spent 20']
```

核心反思：<mark style="background: #FF5582A6;">用閉包做私有變數時，若直接回傳物件或陣列，私有性就破功了</mark>——外部拿到參照就能繞過你的方法任意改內部資料。
正解：回傳時<mark style="background: #BBFABBA6;">切斷參照，回傳複本</mark>，例如 `getHistory: () => [...history]`（展開運算子產生新陣列）。

### 觀念釐清（是非題）

- `return money` 會不會讓 money 變成全域變數？ <mark style="background: #FF5582A6;">不會。</mark> money 既不在全域、也沒「回到」函式內部，而是被封裝在專屬 `myWallet` 的閉包環境裡。`return` 只是把值<mark style="background: #FFF3A3A6;">複印一份</mark>送給外面的變數，口袋裡的本體不會穿透到外面。
- `money` 是 `checkBalance` 的區域變數嗎？ <mark style="background: #FF5582A6;">不是。</mark> `money` 是 <mark style="background: #ADCCFFA6;">`createWallet` 函式的區域變數</mark>，`checkBalance` 是<mark style="background: #FFF3A3A6;">透過閉包</mark>才能存取到外層 `createWallet` 裡的 `money`。（注意：判斷一個變數屬於誰，看的是它<mark style="background: #FFF3A3A6;">宣告在哪個函式</mark>，而不是被哪個函式用到。）
- `myWallet` 是「函式物件變數」嗎？ <mark style="background: #FF5582A6;">不是。</mark> `createWallet` 本身才是<mark style="background: #ADCCFFA6;">函式物件（可被呼叫）</mark>；`myWallet` 是 `createWallet(100)` 回傳的<mark style="background: #ADCCFFA6;">普通物件（Plain Object）</mark>，`myWallet()` 會噴 `TypeError: myWallet is not a function`。物件裡的 `spend`、`checkBalance` 因綁在物件上，正名是<mark style="background: #ADCCFFA6;">方法（Method）</mark>。

### 實戰除錯：按鈕計數器（Counter）綁定陷阱

另一個常見的閉包實戰場景，是「每顆按鈕各自獨立計數」的 UI：

```javascript
function createCounter(buttonId) {
  let count = 0;
  const button = document.getElementById(buttonId);
  button.addEventListener('click', function () {
    count++;
    console.log(count);
  });
}
createCounter('counter1');
createCounter('counter2');
```

除錯時踩到的幾個真實陷阱：

- <mark style="background: #ADCCFFA6;">`buttonId` 抓的是「HTML 元素的 id 屬性」，不是變數名稱</mark>——`document.getElementById(buttonId)` 是拿參數的**值**（字串）去比對 DOM 上 `id="..."` 屬性，跟這個參數叫什麼變數名完全無關。容易誤以為傳入的是「變數名稱」本身。
- <mark style="background: #FF5582A6;">呼叫 `createCounter()` 時傳入的字串，必須跟 HTML 裡按鈕的實際 `id` 完全一致</mark>（例如 HTML 是 `id="counter1"`，就不能傳 `"buttonId1"`），否則 `getElementById` 拿到 `null`。
- <mark style="background: #FF5582A6;">一旦某次 `getElementById` 綁錯（拿到 `null`）就對它呼叫 `addEventListener`，會直接丟出 TypeError 中斷整段程式碼的執行</mark>——後面所有按鈕的事件綁定都會被連帶跳過而失效，畫面上看起來像「全部按鈕都壞掉了」，但根因往往只是最前面一個 ID 打錯字。
- 這裡的閉包核心：`count` 和 `button` 都被鎖在 `createCounter` 的作用域裡，每呼叫一次 `createCounter(...)`，就會產生一個**全新、互不干擾**的 `count`，這就是「各按鈕獨立計數」的原理——與前面 `createWallet` 私有變數是同一套機制的不同應用。
- <mark style="background: #ADCCFFA6;">術語補充：`const button = document.getElementById(buttonId)` 這種「把 DOM 查詢結果存進變數」的寫法叫做 <b>Caching the DOM elements（快取 DOM 元素）</b></mark>——好處是只查詢一次 DOM、存進變數重複使用，不用每次要操作這顆按鈕時都重新呼叫 `getElementById` 整份文件重找一次，效能更好。

> [!tip] 除錯心法：多顆按鈕同時「全部失效」時，別急著懷疑閉包邏輯本身，先檢查是不是某一個 `getElementById` 撲空（id 打錯/多了空白字元），導致後續程式碼被整串中斷。

### 延伸提問：函式參數算不算「宣告」？參數名稱符合 Identifier 定義嗎？名稱真的具備唯一性嗎？

承接上面 `createCounter(buttonId)` 的例子——直覺是：小括號裡的參數名稱「有點像是在那邊宣告，但又不是真的宣告」，而且「唯一性」好像也沒有真的被保障。這個直覺<mark style="background: #BBFABBA6;">完全正確</mark>，拆成三點講：

#### (a) 是不是「宣告」？——是，而且是貨真價實的宣告，不是「看起來像」

函式被**呼叫**的當下（不是定義的當下），JS 引擎會執行規格內部叫 `FunctionDeclarationInstantiation` 的步驟：先建立一個新的 <mark style="background: #ADCCFFA6;">Function Environment Record</mark>，再把每個參數名稱在裡面建立<mark style="background: #FFF3A3A6;">綁定（binding）</mark>，並用呼叫時傳入的值去初始化它——這一步做完，函式本體才開始執行。
所以參數名稱不是「文件上假裝宣告一下」，它就是<mark style="background: #BBFABBA6;">在函式作用域內對變數環境做了一次真的宣告與初始化</mark>，效果上很接近你在函式體最頂端手寫了一排 `let buttonId = 傳入的值`——只是這個動作是引擎自動幫你做的，不用你寫關鍵字。

#### (b) 參數名稱符不符合 Identifier 的文法定義？——符合

照 ECMAScript 文法一路展開：`FormalParameter → BindingElement → SingleNameBinding → BindingIdentifier Initializer(opt) → BindingIdentifier → Identifier`。
也就是說參數名稱在文法上<mark style="background: #ADCCFFA6;">就是一個 Identifier production</mark>，跟你寫 `let x`、`const y` 的 `x`、`y` 是同一種文法節點，必須遵守一樣的規則（不能是保留字、不能用數字開頭等）。這點跟「宣告位置不符合 Identifier 定義」的猜測相反——參數位置的名稱在文法上是正牌 Identifier，只是它被「誰來初始化、什麼時候初始化」這件事跟一般變數宣告不同（由呼叫時傳入的引數決定，而不是你在等號右邊手寫的值）。

#### (c) 名稱是不是「具備唯一性」？——規格其實沒有全面保障，這是歷史包袱

這是三點裡最違反直覺的地方：<mark style="background: #FF5582A6;">同一個參數列表裡出現重複名稱，不一定會報錯</mark>，要看兩個條件——是否為 strict mode、參數列表是不是「simple（簡單）」。

| 情境 | 重複參數名稱（例：`function f(a, a)`） |
|---|---|
| 非 strict mode ＋ 簡單參數列表（沒有 default 值／rest／解構） | ✅ 允許，不報錯（舊時代遺留行為，最後一個同名參數的值生效） |
| strict mode（不論參數列表型態） | ❌ SyntaxError: duplicate formal argument |
| 非 simple 參數列表（用了 default 值／rest／解構，即使沒開 strict mode） | ❌ SyntaxError: duplicate argument names not allowed in this context |

```javascript
function add(a, a) { return a; }
add(1, 2); // 2　（沒開 strict、也是簡單參數列表 → 合法，等同覆寫）

"use strict";
function add2(a, a) {} // SyntaxError（strict mode 一律禁止重複）

function add3(a, a = 1) {} // SyntaxError（有 default 值 → 非 simple 參數列表，即使沒宣告 strict）

function add4(name, { name }) {} // SyntaxError（解構參數 → 非 simple 參數列表）
```

「簡單參數列表」的精確定義（<mark style="background: #FFF3A3A6;">每個參數都是純 Identifier，只要有一個帶 default／rest／解構，整份列表就降級為非簡單</mark>）、以及這個判定同時如何影響 `arguments` 物件是 mapped 還是 unmapped、能不能在函式體內寫 `"use strict"`，完整展開見 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] 的 (e) 節。

> [!tip] 三點合併結論
> 參數名稱「**是**」真宣告（引擎在呼叫當下真的建立綁定並初始化），也「**是**」文法上正牌的 Identifier；但「唯一性」**不是**被規格無條件保障的東西——只有 strict mode 或用了 default／rest／解構這些「非簡單參數列表」語法時，規格才會在解析階段（Early Error）直接擋掉重複名稱；舊時代 sloppy mode 搭配簡單參數列表則是刻意保留的歷史相容行為，才會讓人感覺「好像沒有真的唯一性」。
>
> 更完整的追問（Parse 時機、Creation Phase 是編譯期還是執行期、RAM 怎麼實作、`.call()` 的 `this` 算不算參數、專案真實範例）另開一篇整理：[[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]。

來源：[MDN Duplicate_parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Duplicate_parameter) · [ECMA-262 Early Errors](https://tc39.es/ecma262/#sec-function-definitions-static-semantics-early-errors)

### (d) Early Error 完整定義：跟「靜態檢查」是什麼關係？

承接上面 duplicate formal argument 這個具體例子，往上一層看：<mark style="background: #FFF3A3A6;">Early Error（早期錯誤）是 ECMAScript 規範裡定義的「引擎內建靜態檢查機制」</mark>，而「靜態檢查」是更大的概念，兩者是包含關係，不是同一件事。

- <mark style="background: #ADCCFFA6;">Early Error</mark>：專指程式碼在**解析（Parsing）與編譯階段**就被 JS 引擎（V8／SpiderMonkey…）捕捉到的錯誤。一旦抓到，整段 Script／Module **完全不會被執行**，連第一行都不會跑，`try...catch` 也攔不到。上面的 `function add(a, a)` 在 strict mode 下報錯，就是 Early Error 的具體案例。
- <mark style="background: #ADCCFFA6;">廣義靜態檢查</mark>：泛指「不實際執行程式碼」就分析程式碼結構的過程，除了引擎的 Early Error 之外，還包含 TypeScript 的型別檢查（編譯階段）、ESLint 這類 Linter（潛在邏輯漏洞、風格規範）。

| 比較維度 | Early Error（早期錯誤） | 廣義靜態檢查 |
|---|---|---|
| 定義來源 | ECMAScript 語言規範本身 | 開發工具／編譯器（TS／ESLint）或語言規範 |
| 執行主體 | JS 執行引擎（V8、SpiderMonkey…） | IDE、建置工具鏈或引擎 Parser |
| 檢查範圍 | 語法結構、規範明定的語意約束 | 型別安全、程式碼品質、潛在 Bug、風格 |
| 阻擋機制 | 引擎直接拒絕執行，程式完全無法啟動 | 工具拋出 Warning／Error，阻止 Build 或 CI/CD |

一句話：<mark style="background: #BBFABBA6;">Early Error 是語言引擎實作靜態檢查裡最底層、最基礎的一塊；TypeScript／ESLint 則是把檢查再往前推到開發階段（Dev/Build Time）</mark>，兩者共同的核心價值都是「錯誤越早發現、修復成本越低」。跟本篇主題的關聯：與 [[06-靜態檢查vs動態檢查-TS-vs-JS]] 對照著看——那篇談的是 TypeScript 靜態型別 vs JS TypeError 動態檢查的分界；這裡補上的是「JS 自己内建的 Early Error，本身就是最底層的靜態檢查」這一塊拼圖。

來源：[ECMA-262 Early Errors](https://tc39.es/ecma262/#sec-early-errors)

### 延伸提問：閉包是不是微任務？算不算非同步任務？

<mark style="background: #FF5582A6;">都不是。</mark> 閉包（Closure）是**同步、結構性的語言機制**，跟微任務／巨任務（[[事件循環-Event-Loop-微任務與巨任務]] 講的那套 Event Loop 排程）是**完全不同層次**的東西，只是很容易因為常出現在同一段程式碼裡而被搞混。

| | 閉包 Closure | 微任務／巨任務 Microtask／Macrotask |
|---|---|---|
| 屬於哪個層次 | **作用域／記憶體機制**——這個函式能看到哪些變數、那些變數要活多久 | **任務排程機制**——這段程式碼什麼時候被排進 [[事件循環-Event-Loop-微任務與巨任務\|Call Stack]] 執行 |
| 何時決定 | 詞法範疇（Lexical Scope）在**程式碼寫下的那一刻**就決定了 | Event Loop 在**執行期**依任務種類（Promise.then／setTimeout…）決定執行順序 |
| 需要非同步才成立嗎 | **不需要**——100% 同步的程式碼裡照樣有閉包 | 定義上就是非同步概念，一定跟「等 Call Stack 清空才執行」綁在一起 |

**鐵證**：本篇最開頭的 `createCounter()` 範例（見上面「應用：用閉包做私有變數」），從頭到尾**沒有一行 `setTimeout` 或 `Promise`**，整段都是同步執行，但 `count` 照樣被閉包鎖住成為私有變數——證明閉包完全不需要非同步就能存在。

**為什麼容易搞混**：經典面試題（`for` 迴圈 + `setTimeout`）裡，那個傳給 `setTimeout` 的 callback 函式剛好**同時身兼兩個身分**：① 它是一個閉包（捕獲了外層的 `i`）；② 它被排進了巨任務佇列，等 Call Stack 清空才執行。這兩件事發生在同一個函式身上，容易誤以為是同一套機制在運作。拆開看就很清楚：

- 這個 callback 之所以「記得」外層的 `i` → 這是**閉包**的功勞（不管它是不是非同步都成立，把 `setTimeout` 拿掉、直接同步呼叫這個函式，它一樣記得 `i`）。
- 這個 callback「什麼時候」真的被丟進 Call Stack 執行 → 由 **Event Loop** 依照它是巨任務（`setTimeout`）還是微任務（`Promise.then`）決定，跟它有沒有捕獲外層變數**完全無關**。

反過來也成立：一個被 `setTimeout` 排程的非同步 callback，**不一定是閉包**——如果它完全沒有引用任何外層變數（例如 `setTimeout(() => console.log('hi'), 1000)`），就只是個普通函式，談不上「捕獲外部變數」這件事，一般不會特別稱它為閉包。

一句話總結：**閉包回答的是「這個函式看得到誰、記得誰」；微任務／巨任務回答的是「這個函式什麼時候被排進去跑」——兩支箭完全不同方向，只是常常同時射在同一個函式身上。**

### C++ 也有閉包嗎？（對比）

有，C++11 起用 <mark style="background: #ADCCFFA6;">Lambda 表達式</mark>引入：`[捕捉列表](參數) { 函式本體 }`。最大差別：JS 閉包自動發生且靠 GC 保命；C++ 沒有 GC，<mark style="background: #FFF3A3A6;">必須明確寫出要捕捉哪些變數</mark>。

| 特性 | JavaScript 閉包 | C++ Lambda |
|------|-----------------|------------|
| 觸發方式 | 自動（內層引用外層即觸發） | 必須明寫在捕捉列表 `[...]` |
| 記憶體管理 | 靠 GC 自動保留 | 開發者手動管理，注意 Stack 存活期 |
| 底層實現 | 範疇鏈 + 環境物件 | 編譯器產生的匿名仿函式（Functor） |

- <mark style="background: #BBFABBA6;">傳值捕捉 `[count]`</mark>：建立當下複製數值進閉包，外層銷毀也安全。
- 引用捕捉 `[&money]`：像 JS 一樣能改外部變數，但<mark style="background: #FF5582A6;">回傳引用捕捉的 Stack 變數會造成懸空引用（Dangling Reference），觸發未定義行為甚至 Crash</mark>。

## 各對話來源

### JavaScript 事件循環核心觀念複習（2026-06-30）— https://gemini.google.com/app/82167bcb1c15c00c

（此對話自 Event Loop 後延伸到閉包，以下為閉包段落原文節錄）

使用者：再一個 ／ 再出一題閉包概念題 ／ C++語言也有閉包嗎 ／ Return money會return到createWallet裡面最多吧？他不會變成全域變數對吧！／ CreateWallet 是放在 myWallet 這樣算一個函式物件變數嗎

Gemini：（節錄）閉包＝內層函式能記憶並存取外層範疇，即使外層已執行完畢。兩大基石為詞法範疇與垃圾回收。可用閉包做私有變數（createCounter 範例）。經典題 `for(var i...)+setTimeout` 會輸出 4,4,4，改 `let` 修正。魔王題 createWallet 因 getHistory 直接回傳陣列參照，外部 record.push 會污染內部 history，正解是回傳 `[...history]` 切斷參照。`return money` 不會變全域，只是複印值送出。`myWallet` 是普通物件、不是函式物件；createWallet 才是函式物件，物件內的是方法。C++ 用 Lambda 實現閉包，需明確捕捉（傳值 `[count]` 安全、引用 `[&money]` 注意懸空引用）。

### JavaScript 閉包與傳址解析（2026-06-30）— https://gemini.google.com/app/86e4b6c70330327f

（Abby 以語音輸入逐步追問同一個 createWallet 範例，原文有語音辨識雜訊，以下為重點問答整理）

使用者：money 是屬於 checkBalance 的區域變數嗎？可以這樣講嗎？但是它沒有 let。

Gemini：不是喔。`money` 其實是 `createWallet` 函式的區域變數，而不是 `checkBalance` 的。透過閉包，`checkBalance` 才能存取 `createWallet` 裡面的 `money` 變數。

使用者：（確認執行流程）100 傳入 → spend(30) 餘額 70、history 加入 "Spent 30" → record.push 直接污染內部 history 加入 "Found 100 on the street" → spend(20) 餘額變 50。所以 checkBalance() = 50，history 含全部三筆。

Gemini：是的，最後餘額 50，history 包含全部三個事件。判斷變數歸屬看的是「宣告在哪個函式」，而非被誰使用。

### 重複複習對話（2026-07-02、2026-07-31）— https://gemini.google.com/app/296e1a879bb61062 、 https://gemini.google.com/app/d54c36b18b457e25 、 https://gemini.google.com/app/3e31b6dfa1a781b7

（這三筆與 82167bcb1c15c00c 為同一套「Event Loop → 閉包 → C++ 閉包 → 皮夾傳址 → 函式物件 vs 方法」複習流程的重複對話，閉包段落內容與上方完全一致，此處僅保留來源連結備查。）

### 按鈕計數器除錯（一）：JavaScript 編譯與優化解析（2026-07-27）— https://gemini.google.com/app/0211c80a1b2bcc92

（此對話前段為按鈕計數器閉包除錯，後段延伸到 React 編譯與 Node.js 角色，後段內容已整併進 [[前端開發工具-打包編譯Lint與Parser]]）

使用者：我寫了這個 / 可我這邊要綁死任何東西嗎？button ID 變成這樣，那這邊就是錯啦，因為這邊的 button ID 名字就叫 counter1，而不是 buttonID1 / 這邊怎麼點擊之後沒有增加？是不是這裡寫錯了 / 我只要這邊一個 getElementById 綁錯了，就完全上面的 button 都壞掉了耶

Gemini：確認第 22 行把按鈕 ID 設定成不存在的 `buttonId1`，導致 `createCounter("buttonId1")` 綁不到正確按鈕；修正成與 HTML 一致的 `counter1`/`counter2` 後即可運作；並說明「getElementById 綁定錯誤會導致後續事件綁定程式碼中斷，進而波及畫面上其他按鈕」是 JavaScript 很常見的情況。

### 按鈕計數器除錯（二）：程式碼計數器 Obsidian 筆記格式化（2026-07-27）— https://gemini.google.com/app/31394da17f3e5427

使用者：（同一支 createCounter 除錯，語音輸入夾雜雜訊）closure 加點擊板的思路是對的，但有幾個地方要注意 / closure 是內層還是在自己的肚子裡拿了外面宣告的變數名稱來用？對吧 / 現在只有 console.log count，數字只會出現在開發者工具的 console，不會顯示在按鈕上 / 但他抓的是 ID 嗎？他抓的是變量名稱吧！

Gemini：確認閉包定義——內部函式可以存取外部作用域的變數，所以 `createCounter` 能記住各自的計數器狀態；並澄清 `buttonId` 參數傳入的是**字串值**，`document.getElementById(buttonId)` 抓的是 DOM 元素的 id 屬性，不是變數名稱本身。

### Early Error 與靜態檢查關係（2026-07-29）— https://gemini.google.com/app/70a9f602e3c9c891

使用者：解釋 early error 跟靜態檢查的關係。

Gemini：Early Error 是 ECMAScript 規範裡強制定義的「引擎內建靜態檢查機制」，在 Parsing／編譯階段就被捕捉，整段程式完全不會執行、`try...catch` 攔不到（例：函式外用 `return`、同一區塊重複宣告 `let`、strict mode 下重複參數名稱）。廣義靜態檢查則泛指不執行程式碼就分析結構的過程，涵蓋語言引擎（Early Error）、編譯器與型別系統（TypeScript）、Linter（ESLint）。兩者是包含關係：Early Error 是語言引擎實作靜態檢查最底層的一塊，TypeScript／ESLint 則把檢查推得更前面到開發／建置階段。

### JavaScript 函式參數重複錯誤解析·複習（2026-07-29）— https://gemini.google.com/app/2fc4fed6f6ed7894

（與上方「延伸提問」段落主題相同，Abby 針對 `duplicate formal argument x` 再次逐句確認：參數名稱是不是 Identifier？「非簡單參數的非嚴格函數」怎麼解讀？遺留程式碼為何被允許？重複參數的範圍是函式內還是整個檔案？Gemini 逐一確認並重申：範圍僅限同一函式內部，不同函式可各自重複使用相同參數名；是否允許重複參數由開發者是否宣告 `"use strict"` 決定，不是系統擅自決定；寬鬆模式為相容舊程式碼而保留、現代標準下不建議依賴此行為。內容與本篇「(a)-(c)」小節一致，此處僅記錄複習來源。）

### 檔案檢視與程式碼討論：DOM 快取（2026-07-29）— https://gemini.google.com/app/b2b1ac3e8d339685

（同一支 `createCounter(buttonId)` 範例的另一次除錯對話，語音輸入夾雜辨識雜訊。）

使用者：這三個按鈕都綁定了，各自有獨立的 closure，顯示不同前綴／刪除多餘代碼／這邊是 `document.getElementById`，把每一個 DOM 變成一個變數，這個行為叫什麼？

Gemini：確認三顆按鈕各自形成獨立閉包、各自記住自己的計數狀態；並指出 `document.getElementById(...)` 存進變數這個動作，慣用術語稱為 <b>caching the DOM elements（快取 DOM 元素）</b>——先查一次存起來，之後重複操作同一元素不用再重新查詢整份文件，效能較好。

---

> [!info]- ➡️ 目前是最後一篇
> 14號開始要接哪個主題（執行緒／事件循環／函式類型／Node架構…）還在跟Abby討論排法，之後確定了會補上連結。
