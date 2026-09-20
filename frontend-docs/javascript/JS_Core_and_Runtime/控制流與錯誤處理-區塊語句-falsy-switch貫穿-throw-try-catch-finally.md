---
title: 控制流與錯誤處理 — 區塊語句、falsy 清單、switch 貫穿、throw 與 try/catch/finally
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, control-flow, error-handling, try-catch, finally, switch, falsy, block-statement]
aliases: [Control flow and error handling, try catch finally, switch fall-through]
related:
  - "[[03-陳述式-Statement-vs-表達式-Expression]]"
  - "[[04-變數宣告-let-const-var]]"
  - "[[05-作用域-scope-global-function-block]]"
  - "[[15-ReferenceError-vs-undefined-值與錯誤的分界]]"
  - "[[比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對]]"
  - "[[05-find方法-短路與falsy陷阱-如何取得所有符合的索引]]"
sources:
  - https://gemini.google.com/app/efb8f910749565b9
updated: 2026-09-17
---

# 控制流與錯誤處理 — 區塊語句、falsy 清單、switch 貫穿、throw 與 try/catch/finally

> 本篇重點 a–n，共 14 個。
> 主軸圖：本頁 HTML 版的「`try` → `catch` → `finally` 三段式流程圖」，之後同主題追問（例如 rethrow、`finally` 裡 return 的優先權）一律指回這張圖的某個方框。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | `{ }` 自己就是一種語句嗎 | 是，叫區塊語句（Block statement），作用是把多條語句包成一組 | §1 |
| Q2 | `var` 在區塊裡宣告會怎樣 | 漏出去，因為 `var` 沒有區塊作用域 | §1 |
| Q3 | falsy 有幾個 | 六個（`false`、`undefined`、`null`、`0`、`NaN`、`""`），其餘全是 truthy | §2 |
| Q4 | 少寫 `break` 會怎樣 | 貫穿（fall-through），繼續執行下一個 case 的語句 | §3 |
| Q5 | `finally` 一定會跑嗎 | 一定會，不管有沒有拋出例外 | §4 |

---

## 1. 區塊語句與作用域（a–c）

(a) <mark style="background: #ADCCFFA6;">區塊語句（Block statement）是最基本的語句</mark>，用一對大括號把多條語句組合在一起，通常跟 `if`、`for`、`while` 這些控制流語句搭配使用。

```js
while (x < 10) {
  x++;      // { x++; } 就是一個區塊語句
}
```

(b) <mark style="background: #FF5582A6;">`var` 宣告的變數不具備區塊作用域</mark>，它的作用域屬於包含它的函式或整份腳本，所以在區塊裡設定的效果會持續到區塊之外。

```js
var x = 1;
{
  var x = 2;
}
console.log(x); // 2 ← 在 C 或 Java 裡同樣的程式碼會印出 1
```

(c) <mark style="background: #BBFABBA6;">改用 `let` 或 `const` 就能把作用域收回區塊內</mark>，完整的三兄弟比較寫在 [[04-變數宣告-let-const-var]]，區塊作用域本身寫在 [[05-作用域-scope-global-function-block]]。

---

## 2. 條件語句與 falsy（d–g）

(d) `if...else` 的規則是：`condition` 求值為 `true` 就執行 `statement1`，否則執行 `statement2`，兩者都可以是任何語句，包括再嵌一層的 `if`。串聯多個條件時用 `else if`，<mark style="background: #FFF3A3A6;">只有第一個求值為 `true` 的條件會被執行</mark>。

(e) <mark style="background: #BBFABBA6;">最佳實踐：永遠寫大括號</mark>，尤其在巢狀 `if` 的情況下，可讀性與後續維護都靠它。

(f) <mark style="background: #FF5582A6;">避免在 `if` 的條件位置寫賦值</mark>，`if (x = y)` 看起來像比較，實際是把 `y` 指派給 `x` 再拿結果去判斷真假。
	同一個坑在陣列方法裡也會踩到（`arr.find(e => e = 2)`），實例寫在 [[05-find方法-短路與falsy陷阱-如何取得所有符合的索引]]。

(g) <mark style="background: #ADCCFFA6;">falsy 值清單</mark>：`false`、`undefined`、`null`、`0`、`NaN`、空字串 `""`。
	<mark style="background: #FFF3A3A6;">其他所有數值（包含所有物件）在條件語句中都求值為 `true`</mark>。

```js
const b = new Boolean(false);
if (b) {
  // 這裡會進來，因為 b 是「物件」，物件永遠 truthy
}
if (b == true) {
  // 這裡不會進來
}
```

	切勿混淆原始布林值 `true`／`false` 與 `Boolean` 物件包起來的 `true`／`false`。

> ⚠️ 存疑／更正：Gemini 原文只列了六個 falsy 值。MDN 的 Falsy 詞條另外還收錄 `0n`（BigInt 零）與 `document.all`（歷史相容用的特例），完整是八個。日常寫 code 記六個就夠，但面試被問「全部」時要補上 `0n`。

---

## 3. switch 與貫穿（h–i）

(h) `switch` 的運作是：求值一個表達式，拿它的值去跟每個 `case` 標籤比對，找到匹配就執行關聯的語句。

(i) <mark style="background: #FF5582A6;">`break` 是可選的，少寫就會「貫穿（fall-through）」</mark>，程式會繼續執行下一個 `case` 內部的語句，直到遇到 `break` 或 `switch` 結束。

```js
switch (fruitType) {
  case "Oranges":
    console.log("Oranges are $0.59 a pound.");
    break;
  case "Apples":
    console.log("Apples are $0.32 a pound.");
    break;
  default:
    console.log(`Sorry, we are out of ${fruitType}.`);
}
```

---

## 4. 例外處理：throw 與 try/catch/finally（j–n）

(j) <mark style="background: #ADCCFFA6;">JavaScript 幾乎可以拋出任何東西</mark>，字串、數字、布林、物件都行。

```js
throw "Error2";                                   // String
throw 42;                                         // Number
throw true;                                       // Boolean
throw { toString() { return "I'm an object!"; } }; // Object
```

	<mark style="background: #BBFABBA6;">但實務上請拋專門為此建立的例外類型</mark>，例如 ECMAScript 的 `Error`（及其子類 `TypeError`、`RangeError`）或 DOM 的 `DOMException`，因為它們帶 `name`、`message` 與 stack trace，錯誤處理函式才有東西可用。

(k) `try...catch` 的三個區塊，動詞—受詞—拋接關係寫清楚是這樣：

| 區塊 | 誰在做什麼 | 什麼時候跑 |
|---|---|---|
| `try` | 引擎執行這一組語句，一旦任何一行 `throw`，就立刻中斷並把拋出的值交給 `catch` | 一定會進入 |
| `catch (e)` | 接住 `try` 拋來的值，綁到識別碼 `e` 上，執行補救語句 | 只有 `try` 真的拋出時才跑 |
| `finally` | 不管前面有沒有拋出，都執行收尾語句 | 一定會跑 |

(l) <mark style="background: #FFF3A3A6;">`catch` 的識別碼只在 `catch` 區塊執行期間存在</mark>，離開區塊就消失，這一點跟 `let` 的區塊作用域一致。

```js
function getMonthName(mo) {
  mo--; // 調整成陣列索引（0 = Jan，11 = Dec）
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  if (!months[mo]) {
    throw new Error("Invalid month code");
  }
  return months[mo];
}

try {
  monthName = getMonthName(myMonth);
} catch (e) {
  monthName = "unknown";
  logMyErrors(e); // 把例外物件傳給錯誤處理函式
}
```

(m) <mark style="background: #BBFABBA6;">`finally` 的典型用途是釋放資源</mark>，例如關閉檔案、關閉連線、清掉 loading 狀態。

```js
openMyFile();
try {
  writeMyFile(theData);
} catch (e) {
  handleError(e);
} finally {
  closeMyFile(); // 確保檔案總是會被關閉
}
```

(n) 一句話總結：<mark style="background: #FFF3A3A6;">`try` 負責「試著做」、`catch` 負責「接住壞掉的東西」、`finally` 負責「不管好壞都要善後」</mark>，三者的責任互不重疊。

---

## 關聯筆記（附關聯原因）

- [[03-陳述式-Statement-vs-表達式-Expression]]
	**理由**：本篇 §1 說「任何表達式也可以是一條語句」，那篇拆的就是 Statement 與 Expression 的分界，先看那篇再看本篇才不會混。
- [[04-變數宣告-let-const-var]]
	**理由**：本篇 (b) 的 `var` 漏出區塊，那篇有完整的三兄弟對照表與 TDZ。
- [[15-ReferenceError-vs-undefined-值與錯誤的分界]]
	**理由**：本篇 §4 講怎麼「接住」錯誤，那篇講各種內建錯誤物件分別代表什麼狀況。
- [[比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對]]
	**理由**：本篇 (g) 的 `b == true` 為什麼是 `false`，答案是 `==` 的型別轉換規則，寫在那篇。
- [[05-find方法-短路與falsy陷阱-如何取得所有符合的索引]]
	**理由**：本篇 (f)(g) 的「條件裡誤用賦值」與 falsy 清單，在那篇有 `find` 的實戰翻車版本。

---

## 🔗 相關練習題

| 題目 | 連結 | 為什麼放這裡 |
|---|---|---|
| LeetCode 2727. Is Object Empty | https://leetcode.com/problems/is-object-empty/ | 練 truthy／falsy 的直覺判斷 |
| LeetCode 2703. Return Length of Arguments Passed | https://leetcode.com/problems/return-length-of-arguments-passed/ | 練基本語句與回傳 |
| LeetCode 2665. Counter II | https://leetcode.com/problems/counter-ii/ | 練閉包＋區塊作用域 |
| LeetCode 2715. Timeout Cancellation | https://leetcode.com/problems/timeout-cancellation/ | 練非同步下的清理（等同 `finally` 的責任） |

---

## 各對話來源（原文）

### JavaScript 控制流與錯誤處理翻譯（2026-09-17 擷取）— https://gemini.google.com/app/efb8f910749565b9

**使用者：** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling 幫我翻譯這一篇

**Gemini：** 以下是 MDN 官方文件《控制流與錯誤處理（Control flow and error handling）》的繁體中文翻譯。JavaScript 支援一組簡潔的語句（特別是控制流語句），可以用它們為應用程式加入大量的互動性。在 JavaScript 程式碼中分號用於分隔不同的語句，任何 JavaScript 表達式也可以是一條語句。區塊語句是最基本的語句，用於將多條語句組合在一起，由一對大括號限定，通常與 `if`、`for`、`while` 搭配使用。注意用 `var` 宣告的變數不具備區塊作用域，其作用域屬於包含它的函式或腳本，`var x = 1; { var x = 2; } console.log(x)` 會輸出 2，在 C 或 Java 中相應的程式碼會輸出 1，這種作用域影響可以透過使用 `let` 或 `const` 來改善。條件語句方面，JavaScript 支援 `if...else` 與 `switch`。`if...else` 在條件為 `true` 時執行 `statement1`，否則執行 `statement2`，可用 `else if` 串聯多個條件，只有第一個求值為 `true` 的條件會被執行。最佳實踐是始終使用區塊語句，並避免在 `if...else` 的條件中使用賦值語句（如 `x = y`）。以下數值在條件語句中會被求值為 `false`（Falsy 值）：`false`、`undefined`、`null`、`0`、`NaN`、空字串。所有其他數值（包含所有物件）在傳遞給條件語句時都會求值為 `true`。切勿混淆原始布林值與 `Boolean` 物件，`const b = new Boolean(false); if (b)` 會求值為 `true`，而 `if (b == true)` 會求值為 `false`。`switch` 語句允許程式評估一個表達式並嘗試將該表達式的值與 `case` 標籤匹配，每個 `case` 子句關聯的可選 `break` 語句可確保程式在執行匹配語句後跳出 `switch`，如果省略 `break`，程式將繼續執行下一個 `case` 內部的語句（即貫穿／fall-through 效應）。異常處理方面，可以使用 `throw` 語句拋出異常，並使用 `try...catch` 語句來處理異常。JavaScript 中幾乎可以拋出任何物件，然而使用專門為此目的建立的異常類型通常更有效，例如 ECMAScript 異常（如 `Error`）與 `DOMException`。`try...catch` 的結構包含 `try` 區塊（包含一條或多條語句）、`catch` 區塊（包含當 `try` 區塊拋出異常時要執行的語句）、`finally` 區塊（在 `try` 和 `catch` 執行後、整段語句結束前執行）。`catch` 區塊指定一個識別碼用來存放 `throw` 拋出的值，此識別碼僅在 `catch` 區塊執行期間存在。`finally` 區塊不論是否拋出異常必定會執行，通常可以用來清理資源（如關閉檔案或釋放連結）。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話 | https://gemini.google.com/app/efb8f910749565b9 | Gemini Flash，2026-09-17 擷取 |
| MDN — Control flow and error handling（翻譯原文） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling | MDN 現行版本，2026-09-17 查證 |
| MDN — Falsy（八個 falsy 值的完整清單） | https://developer.mozilla.org/en-US/docs/Glossary/Falsy | MDN 現行版本，2026-09-17 查證 |
| MDN — try...catch | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch | MDN 現行版本，2026-09-17 查證 |
| MDN — switch（fall-through 說明） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch | MDN 現行版本，2026-09-17 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-17
