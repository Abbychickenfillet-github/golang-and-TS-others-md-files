---
title: JS 作用域 Scope（Global / Function / Block）與 Lexical Scope 必考重點
type: topic-note
source: Gemini
tags: [gemini, javascript, scope, 作用域, 面試考點]
aliases: [作用域-scope-global-function-block]
sources:
  - https://gemini.google.com/app/15c0dae8feeae7c1
updated: 2026-07-29
---

# JS 作用域 Scope（Global / Function / Block）必考重點 額外補充Lexical Scope

> [!info]- 📍 承接04，銜接06
> <mark style="background: #ADCCFFA6;">承接</mark>：[[04-變數宣告-let-const-var]]宣告了變數之後，變數能在哪裡被讀寫，是由作用域決定的——而且是**寫程式當下（編譯期）就決定**，不用等執行。
> <mark style="background: #BBFABBA6;">下一步</mark>：作用域是JS原生就有的編譯期概念；下一篇[[06-靜態檢查vs動態檢查-TS-vs-JS]]看TypeScript怎麼在這之上再疊加一層型別的編譯期檢查。
> <mark style="background: #FFF3A3A6;">深入篇</mark>：[[14-詞法作用域-Lexical-Scope-面試四段式]]。<mark style="background: #ADCCFFA6;">關聯原因：這篇是「有哪幾種作用域」的分類（Global／Function／Block，是名詞）；14 是「這些作用域憑什麼被串成一條鏈、什麼時候定案」的機制（是動詞）</mark>，並附上用 node:inspector 把真實 scope chain 印出來的實測、以及面試四段式作答結構。這篇文末補充的 Lexical Scope 段落就是在 14 展開的。

> 作用域決定變數「在哪裡可以被訪問，在哪裡會被關在門外」，是面試與實戰超高頻考點。

## 重點整理

### 三種作用域對比

**1. Global Scope（全域作用域）** — 宣告在所有函式或區塊 `{}` 之外，任何地方都能存取。
<mark style="background: #FF5582A6;">必考陷阱：</mark>瀏覽器環境下，`var` 宣告的全域變數會變成 `window` 的屬性（`var a=1` 等於 `window.a`）；<mark style="background: #FFF3A3A6;">但 `let`／`const` 的全域變數不會掛到 `window`</mark>。過多全域變數會造成「全域命名空間汙染」。

> **「頂層」精確定義**：這裡的「不在任何括弧內部」要說精確一點，指的是**不在任何會建立作用域的 `{}`（大括號）裡面**——也就是不在函式本體 `{}`、也不在 `if`/`for`/`while` 這類區塊的 `{}` 裡。**不是泛指所有括弧**：小括號 `()`（函式呼叫、參數列）本身不建立作用域，跟「頂層」的判斷無關。另外要注意：物件字面量 `{ name: "x" }` 那對 `{}` 是**值**，不是「區塊」，不會建立新作用域，別跟 block 的 `{}` 搞混。

**2. Local / Function Scope（區域 / 函式作用域）** — 宣告在函式內部，只能在該函式記憶體取。`var`、`let`、`const` 在函式內都被限制在此。

> **Local 跟 Function Scope 是不是同一件事？** 在這篇筆記（以及大多數教材）的用法裡，**兩者是同義詞**——「Local」是相對於「Global」的口語說法（「不是全域的」都可以廣義叫 local），「Function Scope」是精確講「這個 local 是由函式本體 `{}` 產生的」。嚴格一點分的話：「Local」其實是**上位概念**，包含「Function Scope」和「Block Scope」兩種——只要不是 Global，都算 local；而 Function Scope 專指 `var` 那種「以函式邊界為界線」的局部作用域。實務上、包括面試，直接把 Local 當 Function Scope 的同義詞講沒問題，只是要知道嚴格定義上 Block Scope 其實也屬於廣義的 local。

**3. Block Scope（區塊作用域）** — 宣告在任何一對 `{}`（如 `if`、`for`、`while`）內。<mark style="background: #ADCCFFA6;">只有 `let` 與 `const` 支援 Block Scope；`var` 完全不支援</mark>（var 會無視大括號跑到外面）。

| 作用域類型 | 適用關鍵字 | 外部可存取 | 常見場景 |
|---|---|---|---|
| Global | var, let, const | 是 | 整個 JS 檔最外層 |
| Function (Local) | var, let, const | 否 | 函式內部 |
| Block | let, const（var 不支援） | 否 | if、for 迴圈 |

### 🔥 面試必考三大情境題

**考點一：var 在 for 迴圈中的 Block Scope 災難**（常結合 setTimeout）

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 答案：1 秒後連續印出 3, 3, 3
```

<mark style="background: #FF5582A6;">為什麼？</mark>`var` 沒有 Block Scope，`i` 是共用變數；setTimeout 執行時迴圈早跑完，`i` 已是 3。
<mark style="background: #BBFABBA6;">解法：把 `var` 改成 `let`</mark>，每次迭代產生獨立的區塊作用域，鎖住當下的 i：

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 答案：印出 0, 1, 2
```

**考點二：範疇鍊(Scope Chain) 與 靜態作用域(Lexical Scope)**
JS 採用<mark style="background: #ADCCFFA6;">語法作用域(Lexical Scope)</mark>：作用域在程式碼「寫好時」就決定，不是「執行時」。

> 具體來說：`const str1 = "HelloWorld";` 這行**一被 JS 引擎解析（parse）到**，`str1` 這個 identifier 屬於哪個 scope 就**當場拍板定案**了——只看這行程式碼**寫在原始碼的哪個位置**（哪一層 `{}` 裡面），跟這段程式碼之後被**誰呼叫、什麼時候被呼叫**完全無關。這就是「lexical／靜態」兩個字的意思：
> 	對照組是「動態作用域(dynamic scope)」（JS **不是**這種，某些老語言如早期 Bash 函式才是）——動態作用域是看「執行時的呼叫鏈」決定找變數要往哪找，
> lexical scope 只看「寫程式碼當下的巢狀位置」。
> 下面 `foo`/`bar` 的例子就是在證明這件事：`foo()` 印出的是 `Global` 不是 `Local`，因為 `foo` 這個函式**當初被定義（寫下來）的位置**就在最外層，不會因為它「被 `bar()` 呼叫」就跑去用 `bar` 內部的 `name`。

```js
let name = 'Global';
function foo() { console.log(name); }
function bar() { let name = 'Local'; foo(); }
bar();
// 答案：印出 'Global'，不是 'Local'
```

`foo()` 定義時上層作用域就是 Global；內部找不到 `name` 就往外層找，這個鏈結叫 <mark style="background: #FFF3A3A6;">Scope Chain</mark>。

**考點三：Callback 函式的參數，作用域只在 callback 自己裡面**

> 出處：`JavaScript-practicing/smallest-divisible-digit-product.js` 實測踩到的 `ReferenceError`

```js
const product = digits.reduce((acc, digit) => acc * Number(digit), 1);
if (product % t === 0) {
    console.log(acc, digit)   // ❌ ReferenceError: acc is not defined
```

`acc`、`digit` 是傳給 `.reduce()` 的**箭頭函式自己的參數**，屬於 **Function Scope**，作用域只涵蓋這個箭頭函式的函式主體本身。一旦跑到 `if` 區塊（跟這個箭頭函式是**平行、不相交的兩個 scope**，不是巢狀在裡面），`acc`/`digit` 根本沒被宣告過，不是「值不見了」，是這個名字在這個範圍內從未存在，所以直接噴 `ReferenceError`，連 TDZ 都輪不到（TDZ 是「宣告了但還沒初始化」，這裡是**根本沒宣告**）。

要印出 `acc`、`digit`，必須把 `console.log` 搬進箭頭函式**裡面**，此時因為要多寫一行陳述式，箭頭函式要從「隱式 return」的簡潔寫法改成帶 `{}` 的區塊寫法，並手動加回 `return`：

```js
const product = digits.reduce((acc, digit) => {
    console.log('acc=', acc, 'digit=', digit);  // ✅ 這裡才看得到
    return acc * Number(digit);
}, 1);
```

> **「parse」是指什麼階段？跟「解析 DOM」是同一件事嗎？——不是，完全是兩個不相關的東西。**
> - **Parse HTML → DOM**：瀏覽器的 **HTML 解析器**把 `.html` 檔案文字，轉成瀏覽器拿來畫畫面用的 DOM 樹。這步驟**不歸 JS 引擎管**，是瀏覽器另一個模組的工作。
> - **Parse JS → AST**：JS **引擎**（V8/SpiderMonkey…）把 `.js` 原始碼文字，轉成一棵**抽象語法樹（AST, Abstract Syntax Tree）**，這是 JS 引擎執行任何一行程式碼**之前**一定要做的前置步驟（順序大致是：Parse 產生 AST → 編譯成 bytecode → 才開始真正執行/直譯）。
>
> 「`const str1 = ...` 一被解析到，lexical scope 就決定了」指的就是**第二種**（JS 引擎把原始碼轉成 AST 的那個當下），**在任何一行程式碼真正被執行之前**就已經發生了——這正是「lexical／靜態」的核心：作用域是從**原始碼的文字結構**直接讀出來的，不需要等到程式跑起來。
>
> **配對不能互換**：只有「Parse HTML → DOM」和「Parse JS → AST」這兩組是對的，**不能說「Parse JS → 變成 DOM」，也不能說「Parse HTML → 變成 AST」**——這是兩個獨立的解析器，各自輸出各自的樹狀結構，彼此不會互相產生對方的輸出。(順帶一提還有第三組：Parse CSS → **CSSOM**，DOM + CSSOM 合起來才會算出 Render Tree。)
>
> **解析到底發生在什麼時候（跟整個網頁載入流程的關係）**：瀏覽器由上到下解析 HTML、邊解析邊蓋 DOM 樹；解析到 `<script>` 標籤時，行為依載入方式而不同：
> - **一般同步 `<script>`（沒加 `async`/`defer`）**：HTML 解析**整個暫停**，先抓（若是外部檔）、丟給 JS 引擎 Parse 成 AST 並執行完，才**繼續**解析剩下的 HTML——這就是為什麼把 `<script>` 隨便塞在 `<head>` 常常拖慢畫面出現的速度。
> - **`defer`**：抓取跟 HTML 解析同時進行，但 Parse／執行會**延後到整份 HTML 解析完（DOM 蓋好）之後**才做，而且多個 `defer` script 會照原本順序執行。
> - **`async`**：抓取跟 HTML 解析同時進行，一抓到就**立刻**插隊 Parse／執行（可能打斷 HTML 解析到一半），多個 `async` 之間**不保證順序**。
>
> 不管走哪一種載入方式，**JS 引擎自己內部的順序永遠是「先 Parse 成 AST，才會執行」**，這點不會變；會變的只是「瀏覽器什麼時候把控制權交給 JS 引擎去做這件事」。
>
> 三種載入方式的完整對照、`async` 順序不保證的具體例子、以及「瀏覽器把控制權交給 JS 引擎」的執行緒層級細節，另開一篇獨立筆記：[[script載入方式]]。

> <mark style="background: #D2B3FFA6;">**「foo 的上層是 Global」——這樣算「上層」還是「同層」？</mark>（很多人卡在這裡）**
> 你的疑問：`foo` 這個函式本身就是**寫在**全域作用域裡（沒有巢狀在別的函式裡面），那 `foo()` 執行時用的作用域，跟外面的 Global 作用域，不就該算「同一層」嗎？為什麼說 Global 是它的「上層／外層」？
>
> 關鍵在於：**只要是函式，「函式本體 `{}` 一定會建立一個全新的、獨立的作用域」，這件事跟這個函式是寫在哪裡（頂層或巢狀多深）完全無關**。`foo` 的**本體**（`{ console.log(name); }`）是一個獨立的箱子，這個箱子被放在「哪裡」，才是決定它「外層是誰」的依據——`foo` 被寫在 Global 這個大箱子裡面，所以 Global 就是 `foo` 本體這個小箱子的外層，兩者是**巢狀的父子關係（相差一層）**，不是同一個箱子：
>
> ```mermaid
> %%{init: {'flowchart': {'htmlLabels': true, 'nodeSpacing': 50, 'rankSpacing': 60, 'padding': 15}, 'themeVariables': {'fontSize': '15px'}}}%%
> flowchart TB
>     subgraph G["Global Scope（最外層）<br/><br/>name = 'Global'"]
>         subgraph F["foo() 的函式作用域（巢狀一層）<br/><br/>本身沒有 name，往外找"]
>             F1["console.log(name)"]
>         end
>         subgraph B["bar() 的函式作用域（巢狀一層，跟 foo 是兄弟，不是父子）<br/><br/>name = 'Local'"]
>             B1["let name = 'Local'; foo();"]
>         end
>     end
> ```
>
> 從圖就看得出來兩個重點：
> 1. `foo` 的作用域**巢狀在** Global 裡面（父子關係、差一層），所以 Global 對它來說就是「上層／外層」，不是同層——即使 `foo` 是直接寫在最外面、巢狀深度只差 1 層，也已經構成「外層」關係了，「差幾層」不影響「算不算外層」這個判斷，只要有巢狀就算。
> 2. `bar` 的作用域跟 `foo` 的作用域是**平行的兄弟關係**（兩個都直接巢狀在 Global 底下），`bar` 呼叫 `foo` 並不會讓 `foo` 的 scope chain 繞去 `bar` 那個箱子——`foo` 的 scope chain 永遠只沿著它「被寫下來的位置」往外找（`foo` 本體 → Global），不會沿著「誰呼叫它」往外找（`foo` 本體 → bar，這是動態作用域才會有的走法，JS 不是）。這就是為什麼答案是 `'Global'` 不是 `'Local'`。
>
> **追問：那 `bar()` 為什麼「一定要吃」自己大括弧裡的 `let name = 'Local'`？**
>
> 這其實是另一條規則——<mark style="background: #D2B3FFA6;">**遮蔽（shadowing）＋「就近優先、找到就停」的查找演算法**</mark>，跟前面那條規則是分開的兩件事：
> - `let name = 'Local';` 在 `bar` 自己的作用域裡**建立了一個全新、獨立的綁定**，這個綁定跟 Global 的 `name` 是**兩個完全不同的儲存位置**，只是剛好取了同一個名字 `name`。
> - JS 查找變數的演算法是：**從目前所在的最內層作用域開始找，一找到同名 identifier 就立刻停止，不會繼續往外找**——這叫「就近優先（nearest scope wins）」。所以只要 `bar` 自己的作用域裡宣告過 `name`，**在 `bar` 本體內部**任何用到 `name` 的地方，查找一定會在 `bar` 自己這層就命中、直接停下，Global 那個 `name` 完全被「遮蔽」、根本沒機會被摸到——不是「bar 被強迫選自己的」，而是「查找根本走不到 Global 那層，因為在更內層就已經找到、提前結束了」。
> - **這條規則只影響「在 `bar` 本體內部直接寫 `name`」的情況，不影響 `foo`**：`bar` 呼叫 `foo()` 後，執行權轉移到 `foo` 的本體，`foo` 本體查找 `name` 是從**它自己的作用域**開始往外找（foo 本體 → Global，如前一點所述），根本不會經過 `bar` 的作用域，所以 `bar` 裡的 `'Local'` 對 `foo` 來說**從頭到尾都不存在、無關**——這也是為什麼上面例子裡 `bar` 宣告的 `'Local'` 其實從來沒被真正讀取/印出過，它只是用來證明「就算呼叫者剛好也宣告了同名變數，也不會影響 `foo` 的查找結果」。
>
> **補充釐清：`let name = 'Global'` 裡的字串 `'Global'`，跟「Global Scope」這個技術概念是兩件事。** `'Global'` 只是這個變數被**指派的字串值**，是作者為了讓範例好讀、特地選了一個跟「這個變數活在 Global Scope」意思相符的字，方便你看輸出結果時能立刻對應「啊這個值是從全域來的」。JS 引擎完全不在乎這個字串內容是什麼——就算把這行改成 `let name = '台北';`，作用域規則、`foo()` 印出的答案（會印出「台北」）完全不會變，因為決定查找結果的是**這個宣告所在的作用域結構**，不是字串內容本身剛好跟某個技術詞彙撞名。**這裡討論「上層是不是 Global」時，指的永遠是抽象的『Global Scope』這個結構性概念，不是那個剛好取名叫 `'Global'` 的字串值。**

**考點三：未宣告變數的「自動全域化」陷阱**

```js
function test() { a = 10; }  // 前面沒寫 var/let/const
test();
console.log(a); // 答案：10（不會報錯！）
```

非嚴格模式下，對未宣告變數賦值，JS 會自動在 Global Scope 建立它。<mark style="background: #FF5582A6;">這是不良習慣</mark>，開啟 `"use strict";` 可避免。

## 各對話來源

### JavaScript 作用域重點整理（2026-06）— https://gemini.google.com/app/15c0dae8feeae7c1

**使用者：** 幫我整理 JavaScript: local scope, block scope, global scope 必備重點、必考重點。

**Gemini：** （內容已整合進上方「重點整理」：三種作用域定義與對照表、var 掛 window 陷阱、for+setTimeout 經典題、Lexical Scope/Scope Chain、自動全域化陷阱與 use strict。）

---

> [!info]- ➡️ 下一篇
> [[06-靜態檢查vs動態檢查-TS-vs-JS]]——TypeScript怎麼在作用域之上再加一層編譯期的型別檢查。
