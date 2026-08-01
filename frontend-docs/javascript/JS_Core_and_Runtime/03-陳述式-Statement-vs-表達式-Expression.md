---
title: 陳述式 Statement vs 表達式 Expression
type: topic-note
tags: [javascript, statement, expression, ast, jsx, JS_Core_and_Runtime]
aliases: [陳述式-Statement-vs-表達式-Expression]
related:
  - "[[V8引擎完整管線-Parse到Deoptimization]]"
  - "[[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]"
  - "[[變數宣告-let-const-var]]"
updated: 2026-07-29
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

---

> [!info]- ➡️ 下一篇
> [[04-變數宣告-let-const-var]]——最常見的陳述式：變數宣告，拆解let/const/var的差異。
