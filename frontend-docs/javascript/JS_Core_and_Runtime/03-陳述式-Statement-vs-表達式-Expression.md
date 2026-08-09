---
title: 陳述式 Statement vs 表達式 Expression
type: topic-note
tags: [javascript, statement, expression, ast, jsx, JS_Core_and_Runtime]
aliases: [陳述式-Statement-vs-表達式-Expression]
related:
  - "[[V8引擎完整管線-Parse到Deoptimization]]"
  - "[[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]"
  - "[[變數宣告-let-const-var]]"
  - "[[Node-global與process物件屬性逐行解釋]]"
updated: 2026-08-06
---

# 陳述式 Statement vs 表達式 Expression

> [!info]- 📍 承接02，銜接04
> <mark style="background: #ADCCFFA6;">承接</mark>：[[02-字面量-關鍵字-識別碼基礎]]講的是Token本身（Lexical Grammar），這篇往上一層，講Token怎麼組合成陳述式／表達式（Syntactic Grammar）。
> <mark style="background: #BBFABBA6;">下一步</mark>：陳述式裡最常寫、也最基礎的一種是變數宣告陳述式，下一篇[[04-變數宣告-let-const-var]]專門拆解let/const/var。

> 本篇重點 (a)–(h)，共 8 個。起點：讀 [[V8引擎完整管線-Parse到Deoptimization]] 裡 AST 節點類型（`ExpressionStatement`、`VariableDeclaration`…）時發現一直沒有正式定義過這組最基礎的分類。

## (a) 定義：先分清楚兩者在回答什麼問題

- **表達式（Expression）**：一段**會產生（求值出）一個值**的程式碼片段。它的本質是「一個值」，可以被賦值、被當引數傳、被拿去做運算。
- **陳述式／敘述句（Statement）**：**執行一個動作**的完整指令單位，是組成程式的「一步」。它不保證會產生值，重點在「做了什麼事」而不是「值是什麼」。

一句話：**表達式回答「這是什麼值？」；陳述式回答「這一步做了什麼？」**

## (b) 判斷小技巧：塞得進 `console.log(___)` 嗎？

最快的判斷方法：把這段程式碼塞進 `console.log(___)` 的括號裡，或塞到 `const x = ___` 的等號右邊——**合法就是表達式，會報 SyntaxError 就是陳述式（或陳述式的一部分）**：

```js
console.log(1 + 2);          // ✅ 合法 → 1 + 2 是表達式
console.log(foo());          // ✅ 合法 → foo() 是表達式
console.log(a > b ? a : b);  // ✅ 合法 → 三元運算式是表達式

console.log(let x = 5);      // ❌ SyntaxError → let x = 5 是陳述式
console.log(if (x) {});      // ❌ SyntaxError → if 是陳述式
```

## (c) 常見的表達式（Expression）清單

| 類型 | 範例 | AST 節點名稱（見 [[V8引擎完整管線-Parse到Deoptimization]] 逐字稿） |
|---|---|---|
| 字面量 | `5`、`"hi"`、`true` | `Literal` |
| 識別碼引用 | `count` | `Identifier` |
| 算術/邏輯運算 | `a + b`、`a && b` | `BinaryExpression`／`LogicalExpression` |
| 函式呼叫 | `foo(a, b)` | `CallExpression` |
| **賦值本身** | `x = 5` | `AssignmentExpression` |
| 函式表達式／箭頭函式 | `function(){}`、`() => {}` | `FunctionExpression`／`ArrowFunctionExpression` |
| 三元運算子 | `a > b ? a : b` | `ConditionalExpression` |
| `new` 建構呼叫 | `new Date()` | `NewExpression` |

<mark style="background: #FFF3A3A6;">容易忽略的一點：`x = 5` 這個賦值動作本身也是表達式，會求值出被賦的那個值</mark>——這就是為什麼 `console.log(x = 5)` 合法（印出 5），也是為什麼 `while ((line = readLine()) !== null)` 這種「賦值同時當條件判斷」的寫法能成立：因為賦值表達式本身有值可以拿來判斷。這也解釋了一個經典 bug 來源：把 `if (a === b)` 誤打成 `if (a = b)`——後者是合法的表達式（把 b 賦值給 a，然後回傳 b 這個值去判斷真假值），不會噴語法錯誤，只會默默做錯事。

## (d) 常見的陳述式（Statement）清單

| 類型 | 範例 | AST 節點名稱 |
|---|---|---|
| 變數宣告 | `let x = 5;`（見 [[變數宣告-let-const-var]]） | `VariableDeclaration` |
| 條件分支 | `if (x) {...} else {...}` | `IfStatement` |
| 迴圈 | `for (...) {...}`、`while (...) {...}` | `ForStatement`／`WhileStatement` |
| 多分支選擇 | `switch (x) {...}` | `SwitchStatement` |
| 函式宣告 | `function foo() {}` | `FunctionDeclaration` |
| 流程控制 | `return x;`、`break;`、`continue;` | `ReturnStatement`／`BreakStatement`／`ContinueStatement` |
| 例外處理 | `try {...} catch (e) {...}` | `TryStatement` |
| 純區塊 | `{ ... }` | `BlockStatement` |

## (e) 特殊角色：`ExpressionStatement`——表達式外面套一層陳述式的殼

```js
foo();       // 這一行本身是 ExpressionStatement，裡面包著一個 CallExpression
a + b;       // 合法但沒意義：ExpressionStatement 包一個沒人接的 BinaryExpression
```

JS 文法允許「一個表達式後面加分號，整行單獨當一個陳述式來執行」——這就是 `ExpressionStatement`，[[V8引擎完整管線-Parse到Deoptimization]] 逐字稿裡 `console.log(a + b);` 的 AST 最外層正是 `ExpressionStatement > CallExpression`。這也是為什麼你能寫 `foo();` 這種「呼叫但不接值」的獨立行——表達式本來會產生一個值，但當它被包成 `ExpressionStatement` 單獨一行時，那個值直接被丟掉不用，只在意呼叫這個動作本身、不在意回傳值。

## (e-1) 追問：分號代表JavaScript陳述式的結尾嗎

<mark style="background: #ADCCFFA6;">大方向對，但要分兩種陳述式來看：一種是靠分號收尾的「簡單陳述式」，一種是靠`}`收尾、分號用不上的「複合陳述式」，這兩種不能混為一談，這正是實際除錯[[Node-global與process物件屬性逐行解釋]]那篇筆記時踩到的一個bug真正的原因。</mark>

a. <mark style="background: #FFF3A3A6;">會用分號收尾的簡單陳述式（Simple Statement）</mark>——(e)提過的`ExpressionStatement`（例如`foo();`）、變數宣告陳述式`VariableStatement`（`let x = 5;`）、`return`、`break`、`continue`、`throw`、還有什麼都不做的空陳述式`EmptyStatement`（單獨一個`;`），這些在ECMA-262文法裡明確定義成「一段內容加一個分號」收尾，分號在這裡確實就是「這個陳述式到這裡結束」的標記
b. <mark style="background: #FFF3A3A6;">不靠分號、靠`}`收尾的複合陳述式（Compound Statement）</mark>——(d)列的`IfStatement`、`ForStatement`、`WhileStatement`、`SwitchStatement`、`FunctionDeclaration`、`TryStatement`，還有純區塊`BlockStatement`，這些陳述式本身帶著`{...}`，文法上就是靠這個`}`宣告「我結束了」，不需要也不應該在`}`後面再加分號——在`}`後面手動加的分號，並不會被吸收進前一個陳述式裡幫忙收尾，它會被解析成**另一個獨立的空陳述式**，插在兩個陳述式中間
c. <mark style="background: #FF5582A6;">為什麼`try{...};catch(e){...}`會直接報SyntaxError，而不是「兩個陳述式各自合法、只是多此一舉」</mark>——關鍵在於`TryStatement`這個陳述式，在ECMA-262文法裡的定義是`try Block Catch`、`try Block Finally`、或`try Block Catch Finally`三選一，`Block`後面**必須**緊接著`Catch`或`Finally`其中之一，才能組成一個完整的`TryStatement`，文法裡根本沒有「單獨一個`try Block`」這種合法組合。所以寫`try{...};`的時候，解析器讀到這個分號會把它解析成(b)講的獨立空陳述式，代表`try`區塊還沒等到`Catch`或`Finally`就已經被這個空陳述式「插隊打斷」，變成一個不完整、不合法的`TryStatement`，這時候就會直接丟出`SyntaxError: Unexpected token 'catch'`，而不是「多執行了一個沒用的空陳述式」這麼溫和的結果

一句話：<mark style="background: #FF5582A6;">分號的角色是簡單陳述式的結尾標記沒錯，但`if`、`for`、`while`、`function`、`try`這些複合陳述式本來就是靠`{...}`的`}`自己收尾，`}`後面多打一個分號不會被吸收，會變成一個插在中間的空陳述式，如果剛好插在像`try`這種「文法上規定後面必須接特定子句」的陳述式中間，就會直接讓整段變成不合法的語法。</mark>

## (e-1)-d 追問：`try-catch`整組只有一個「陳述式結尾分號」，這句話對嗎

<mark style="background: #ADCCFFA6;">三選一的部分完全正確：`TryStatement`確實只有`try Block Catch`、`try Block Finally`、`try Block Catch Finally`這三種合法組合，見(c)。但「陳述式結尾分號」這個講法要修正一個字——不是分號，是`}`。</mark>

d. <mark style="background: #FFF3A3A6;">修正用詞</mark>——`TryStatement`本身就是(e-1)-b講的複合陳述式，跟`if`、`for`、`while`、`function`同一國，整個`try{...}catch{...}`（或加`finally`）從頭到尾**沒有一個分號**收尾，它結束的地方是最後一個子句（`Catch`或`Finally`，看哪個排在最後）自己的那個`}`。所以正確講法是：「`try-catch`這一整組只有一個陳述式結束點，而且這個結束點是`}`，不是分號」——三選一的文法結構判斷完全正確，只是把「結尾分號」換成「結尾的`}`」就精準了。

## (e-2) 追問：那可以完全不寫分號嗎？——自動分號補完（ASI）

<mark style="background: #ADCCFFA6;">可以，因為JS引擎的Parser有一套叫自動分號補完（Automatic Semicolon Insertion，簡稱ASI）的規則，在特定情況下會自動幫簡單陳述式補上分號，不用每一行都手動打。</mark>但ASI有幾個知名的例外情況容易踩雷：`return`後面如果換行才接下一行內容，ASI會直接在`return`後面補一個分號，讓原本想`return`的那個值變成永遠回傳`undefined`；用`(`或`[`開頭的那一行，如果上一行沒手動加分號，ASI不會在那個位置補，反而會把兩行黏成同一個陳述式，跑出非預期的結果。雖然可以靠ASI不寫分號，但完全依賴它、不理解補完規則，一樣容易寫出隱性bug，跟(c)裡`if(a=b)`那種「不會報錯、但默默做錯事」是同一種風險等級。

## (e-3) 追問：`return { P001: 5, P002: 10, }` 這樣沒打分號，不會出事嗎

<mark style="background: #ADCCFFA6;">不會出事，這裡的分號沒有不見，是被ASI（見(e-2)）自動補在你看不到的地方——但這一題剛好踩在ASI最有名的地雷正中央，差一個換行位置，結果會完全不一樣，值得拆開講清楚。</mark>

```js
async function getUserDiscounts() {
  return {
    P001: 5,
    P002: 10,
  }
}
```

a. <mark style="background: #FFF3A3A6;">為什麼這段是安全的</mark>——`return`後面**緊接著同一行**的`{`，中間沒有換行，所以Parser會正常把`return`後面整個`{ P001: 5, P002: 10, }`物件字面值當成`return`的參數繼續往下解析，物件內部本身有沒有換行完全不影響（物件字面值裡的換行、縮排只是排版，不是語法邊界）。解析完整個物件之後，Parser遇到的下一個Token是關掉函式本體的`}`，這時候套用(e-2)提過的其中一條ASI規則：**只要下一個Token是`}`，不管前面有沒有換行，一律自動補上分號**，所以這裡實際上等同於你手動打了`return { P001: 5, P002: 10, };`，只是分號是引擎幫你偷偷補上的，你在編輯器裡看不到而已
b. <mark style="background: #FF5582A6;">但如果`{`換到`return`的下一行，就會是完全不同的故事</mark>——
```js
async function getUserDiscounts() {
  return
  {
    P001: 5,
    P002: 10,
  }
}
```
這裡`return`後面**直接換行**才接`{`，(e-2)提過`return`、`break`、`continue`、`throw`這幾個字是ECMA-262文法裡明訂的「受限產生式（Restricted Production）」——只要它們後面緊接著換行，不管你原本想不想在下一行接東西，Parser**強制**在`return`後面立刻補一個分號，完全不會去看下一行有沒有內容。所以這個版本會被解析成`return;`加一個獨立、寫了也沒人接的`{P001:5, P002:10,}`區塊陳述式（區塊陳述式裡的`P001: 5`會被當成標籤陳述式加表達式，不會報錯，但完全是垃圾程式碼），函式實際上回傳的是`undefined`，不是你想要的那個物件

一句話：<mark style="background: #FF5582A6;">`{`跟`return`同一行絕對安全，ASI只會在整個回傳值解析完、遇到`}`的時候幫你補分號；`{`換到`return`的下一行才是真正危險，`return`這個字本身有「後面一換行就強制斷句」的特殊規則，會讓你整個回傳值憑空消失變成`undefined`。</mark>你這段程式碼的寫法（`{`跟`return`同一行）正是業界公認躲開這個ASI地雷的標準寫法，繼續這樣寫就好，不用加分號也沒問題。

## (e-4) 追問：`return React.createElement(` 這種`return`後面接`(`的情況，Parser怎麼解析

![[螢幕擷取畫面 2026-08-06 200308.png]]

<mark style="background: #ADCCFFA6;">跟(e-3)一樣安全，但問的重點不一樣——這題問的是括號`(`裡面那幾行、那幾個逗號，到底受不受(e-1)(e-2)講的「陳述式結尾」規則管，答案是完全不受管，因為進了括號就已經換了一層文法。</mark>

```js
return React.createElement(
  'div',
  null,
  `Hello ${this.props.toWhat}`
);
```

a. <mark style="background: #FFF3A3A6;">先確認`return`本身安不安全</mark>——(e-2)(e-3)的地雷規則是「`return`後面**緊接著換行**才會被強制補分號」。這裡`return`後面同一行接的是識別碼`React`，中間沒有換行，所以完全沒踩到那個地雷，Parser正常把`React.createElement(...)`整包當成`return`要回傳的表達式繼續解析。
b. <mark style="background: #FFF3A3A6;">`(`開始的地方已經換了文法層——從Statement掉進Expression</mark>——`React.createElement(`裡的這個`(`，不是陳述式的東西，它是`CallExpression`（函式呼叫表達式）文法裡`Arguments`產生式的開頭：`Arguments → ( ArgumentList )`，而`ArgumentList`就是「用逗號分隔的一串`AssignmentExpression`」。所以`'div'`、`null`、`` `Hello ${this.props.toWhat}` ``這三個，是`ArgumentList`裡三個逗號分隔的`AssignmentExpression`，這些逗號是`Arguments`文法自己規定要用來分隔多個引數，跟(e-1)講的陳述式分隔完全是兩回事。
c. <mark style="background: #FF5582A6;">為什麼括號內的換行不會觸發ASI</mark>——ASI（自動分號補完）這個機制，本質上只在Statement文法卡住、需要用分號幫忙收尾的地方才會啟動；而在`ArgumentList`這個語法位置，規則根本不允許塞一個分號進去（`React.createElement('div'; null, ...)`這樣寫會直接SyntaxError），所以Parser壓根不會在這裡考慮要不要補分號——換行在這裡純粹只是排版用的空白字元。這也呼應開頭(a)那句話：表達式回答「這是什麼值」，這整個`React.createElement(...)`從頭到尾都是**同一個表達式**在被逐步組裝完成，內部的換行跟逗號都是在建構這一個值，不是在切分多個「動作」。
d. <mark style="background: #ADCCFFA6;">真正的陳述式結尾在哪裡</mark>——要等Parser找到跟這個`(`配對的`)`，把整個`Arguments`解析完、跳出Expression文法、回到`ReturnStatement`層級，才會重新開始問「後面接的是分號、`}`、還是需要ASI介入」。這段程式碼最後寫的是`);`，那個`;`是**明寫的**分號，直接終結`ReturnStatement`，完全不需要ASI出手——反而是最單純的情況，就是(e-1)a講的「簡單陳述式靠分號收尾」。

一句話：<mark style="background: #FF5582A6;">只要進了`(`或`[`這種括號、開始解析Expression內部的內容，就已經離開了(e-1)(e-2)(e-3)講的Statement文法層，裡面的換行跟逗號都是Expression自己的文法規則（例如`ArgumentList`的逗號分隔），跟「陳述式結尾要不要補分號」完全無關，要等括號配對結束、跳回Statement層級，「結尾」這個概念才會重新出現。</mark>

## (f) 為什麼要分？——因為文法規定「某些位置只能放哪一種」

JS 文法對不同語法位置有嚴格規定：有些位置**只吃 Expression**，有些位置**只吃 Statement**，兩者不能亂塞：

```js
if (let x = 5) {}   // ❌ SyntaxError：if(...) 的括號規定只能放表達式，let x=5 是陳述式，塞不進去
if (x = 5) {}        // ✅ 合法（但通常是打錯字想寫 ===）：因為賦值 x=5 本身是表達式，能塞進 if(...)
```

`if` 的括號、`while` 的括號、函式呼叫的引數位置、模板字串 `${...}` 裡面……**這些位置的文法規則都寫死「這裡只能放 Expression」**，這就是為什麼你沒辦法把 `let`/`const`/`if`/`for` 這些陳述式直接塞進括號或引數位置——不是「風格建議」，是語法本身不允許。

## (g) 什麼時候用哪個？為什麼？——最實用的心智模型：JSX 裡為什麼不能寫 `if`

- 想要「**產生一個值，這個值要被別的東西用**」（當引數傳、賦值給變數、放進模板字串、放進 JSX 大括號）→ 一定要用**表達式**。
- 想要「**執行一個獨立動作、控制程式流程**」（宣告變數、判斷分支、跑迴圈）→ 用**陳述式**，因為它本來就不打算產生一個值給誰用。

這個分類直接解釋了一個常見的 React 疑惑——**JSX 的 `{}` 裡只能放表達式，不能放陳述式**：

```jsx
{cond ? <A/> : <B/>}   // ✅ 合法：三元運算子是 ConditionalExpression，會求值出 <A/> 或 <B/>
{cond && <A/>}         // ✅ 合法：&& 是 LogicalExpression
{if (cond) { <A/> }}   // ❌ SyntaxError：if 是 Statement，本來就不產生值，JSX 的 {} 只吃 Expression
```

因為 `{}` 裡的東西最終要**變成畫面上的一個值**（一個 React element 或字串），而 `if` 這種陳述式**本質上不是拿來產生值的**，所以 JSX 才規定只能用三元運算子／`&&`／立即呼叫的函式表達式，不能直接寫 `if`——根源就是 (a) 那句話：陳述式不保證產生值，而 `{}` 這個位置的文法規則要求必須是表達式。

## (h) 對照總結

| | 表達式 Expression | 陳述式 Statement |
|---|---|---|
| 核心問題 | 這是什麼值？ | 這一步做了什麼？ |
| 塞進 `console.log(___)` 合法嗎 | ✅ 合法 | ❌ SyntaxError |
| 能不能出現在 JSX 的 `{}` 裡 | ✅ 可以 | ❌ 不行 |
| 範例 | `1+2`、`foo()`、`x=5`、`a?b:c` | `let x=5;`、`if(){}`、`for(){}`、`function foo(){}` |
| 特殊角色 | — | `ExpressionStatement`：表達式外面套殼變成獨立一行陳述式，見 (e) |
| 分號的角色 | 不適用 | 簡單陳述式靠分號收尾；複合陳述式靠`}`收尾，`}`後面多打的分號會變成獨立空陳述式，見(e-1)(e-2)(e-3)；括號`()`內部是Expression文法、不受陳述式結尾規則管，見(e-4) |

## (i) 箭頭函式的 `ConciseBody`：加花括弧就從「表達式本體」變回「陳述式區塊」

> 出處：`JavaScript-practicing/smallest-divisible-digit-product.js` 練習中，把 `.reduce()` 的 callback 從單行改寫成多行時踩到的坑

```js
digits.reduce((acc, digit) => acc * Number(digit), 1);       // ConciseBody 是 ExpressionBody（沒有花括弧）
digits.reduce((acc, digit) => { return acc * Number(digit); }, 1); // ConciseBody 是 { FunctionBody }（有花括弧）
```

箭頭函式的本體在文法上叫 **`ConciseBody`**，只有兩種可能（ECMA-262 "Arrow Functions" clause，穩定錨點 `tc39.es/ecma262/#sec-arrow-function-definitions`；本篇只確認了文法生產式名稱與語意，沒有直接讀到規範深層原文，因為單頁 HTML 太大工具讀不到那段）：

- **沒有花括弧開頭** → `ExpressionBody`，本質就是**一個表達式**，對照 (a)：表達式會求值出一個值，所以這個值**自動變成箭頭函式的回傳值**——這就是「隱式 return」的由來，不是特殊魔法，只是「箭頭函式的 body 本身就是表達式」這件事的自然結果。
- **有花括弧包起來** → `{ FunctionBody }`，變成跟一般函式一樣的**陳述式區塊**（跟 (d) 的一般函式主體同文法），區塊裡的東西是一串陳述式，不會自動有值，所以**一定要寫明確的 `return`** 才會回傳東西，沒寫則回傳 `undefined`（跟一般 `function(){}` 沒寫 return 一樣）。

**格式上容易犯的錯（自己實測踩過，記錄下來）**：
- callback 的 `}` 要接在 `.reduce()` 第二個參數 `initialValue` 之前，結構是 `}, 1)`，不是別的位置。
- 按 Enter 換行後，`}` 要當該行的**行首第一個 token**，跟 `if`/`for` 的區塊收尾格式一致。
- 一旦加了花括弧，別忘記手動補 `return`——這是最常漏掉的一步，忘記補的話函式會默默回傳 `undefined`，不會報錯，比語法錯誤更難抓。

---

> [!info]- ➡️ 下一篇
> [[04-變數宣告-let-const-var]]——最常見的陳述式：變數宣告，拆解let/const/var的差異。
