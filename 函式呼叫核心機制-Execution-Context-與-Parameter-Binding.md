---
title: "函式呼叫核心機制-Execution-Context-與-Parameter-Binding"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, 傳值, 傳址, 形參, 實參, 函式作用域]
sources:
  - https://gemini.google.com/app/3aac1efabf64e593
updated: 2026-09-28
---

# 函式呼叫核心機制：Execution Context 與 Parameter Binding

本篇重點 a–j，共 10 個

## 重點整理

### a. 原始型別傳值（Pass by Value）：函式內部改參數，外部變數不受影響

當基本型別（Primitive Types，數字、字串、布林值）傳進函式時，JavaScript 會複製一份<mark style="background: #ADCCFFA6;">「副本」</mark>送進函式：

```javascript
function square(number) {
  number = number * number; // 改的是內部的副本
  return number;
}

var num = 5;
square(num);
console.log(num); // 5！外部的 num 完全沒受影響
```

### b. 物件型別傳參考（Pass by Reference / Sharing）：內外指向同一個位址

物件（Object、Array 等）行為相反，傳遞的是<mark style="background: #FF5582A6;">記憶體位址（指標）</mark>，函式內部改屬性，外部看到的是同一個物件：

```javascript
function myFunc(theObject) {
  theObject.make = "Toyota"; // 改了物件內部的屬性
}

var mycar = { make: "Honda", model: "Accord", year: 1998 };
myFunc(mycar);
console.log(mycar.make); // "Toyota"！外部的 mycar 被改變了
```

| 型別 | 傳遞方式 | 函式內部修改是否影響外部 |
|---|---|---|
| 原始型別（數字、字串、布林值⋯） | 值的副本（Pass by Value） | 不影響 |
| 物件型別（Object、Array⋯） | 記憶體位址（Pass by Reference / Sharing） | 會影響 |

### c. 形參（Formal Parameter）就是只活在函式內部的區域變數

呼叫 `square(num)` 時，JavaScript 背後等同於：進入函式建立內部作用域 → 在函式內部自動宣告一個區域變數 `number`（形參） → 把外部傳進來的 `num` 的值複製給它（等同隱式執行 `var number = num;`） → 執行內部運算只動到 `number` 這個副本 → 離開函式後 `number` 隨即銷毀，外部的 `num` 全程沒被碰過。

<mark style="background: #FFF3A3A6;">外部變數是在外部作用域定義的（`num`），函式參數（`number`）是 JavaScript 呼叫函式當下才在內部自動建立並賦值的區域變數</mark>——兩者因為作用域隔絕＋傳遞值的副本而互不影響。

### d. 副本在記憶體裡有獨立的位址

傳遞原始型別時，記憶體會為外部變數與內部形參各自配置一塊<mark style="background: #ADCCFFA6;">獨立的位址</mark>：宣告 `var num = 5` 時配置一個位置存 5；呼叫 `square(num)` 時另外配置一塊全新的獨立位置給形參 `number`，把 5 複製進去。因為兩者記憶體位址完全不同，改動 `number` 不會動到 `num`。這正是 a、c 兩點「傳值＋區域變數隔離」在記憶體層面的具體樣子。

### e. 形參（Formal Parameter）vs 實參（Actual Argument）

|  | 形參 Formal Parameter | 實參 Actual Argument |
|---|---|---|
| 定義 | 定義函式時寫在括號裡的變數名稱（如 `function square(number)` 的 `number`） | 呼叫函式時真正帶進去的值（如 `square(80)` 的 `80`） |
| 本質 | 一個「宣告」，函式內部準備接資料的變數位置 | 呼叫當下傳進去的具體數值 |
| 作用域與生命週期 | 只活在函式的區域作用域，呼叫瞬間建立、函式執行結束（`return`）即銷毀 | 活在外部作用域，不因函式執行完畢而消失 |
| 命名獨立性 | 改名（如 `function square(x)`）完全不影響外部呼叫方式與結果 | — |

### f. `console.log` 放在 `return` 後面會被無視

`return` 代表函式立刻結束並跳出，寫在 `return` 下方的程式碼（例如 `console.log`）是<mark style="background: #FF5582A6;">永遠不會被執行到的 Unreachable code</mark>。想在函式內部觀察變數變化，`console.log` 要放在 `return` 之前：

```javascript
function square(number) {
  console.log('Inside function number: ' + number); // 放在 return 前面才會執行
  return number * number;
}
```

### g. 呼叫函式沒有接住回傳值，畫面上就看不到結果

`square(80)` 確實計算出 6400 並 `return`，但若沒有用 `console.log` 印出或存進變數，畫面上不會顯示這個結果：

```javascript
let result = square(80); // 呼叫函式並接住回傳值（6400）
console.log('square result: ' + result);
```

### h. MDN 範例的簡潔寫法 vs 除錯友善寫法，各有目的

MDN 常直接寫 `return number * number;`（<mark style="background: #BBFABBA6;">最簡潔的標準寫法</mark>，實務開發中避免建立不必要的臨時變數）；但若要在函式內部 `console.log` 觀察計算過程，這種一步到位的寫法會被 f 點的「return 後面不執行」卡住。除錯／教學階段可以拆兩步：`number = number * number;` 先計算並更新區域變數 → `console.log` 印出過程 → 最後才 `return number;`，把「計算過程」與「離開函式」分開，方便中途插入排查程式碼。

### i. 匿名函式（Anonymous Function）跟 `for` 迴圈無關

「匿名」指這個函式沒有名字，純粹當作值現場建立、直接傳進另一個函式當參數：

```javascript
function map(f, a) {
  var result = [], i;
  for (i = 0; i != a.length; i++)
    result[i] = f(a[i]); // 呼叫傳進來的第一個參數 f
  return result;
}

map(
  function (x) { return x * x * x; }, // 匿名函式：第一個參數，沒有名字
  [0, 1, 2, 5, 10]
);
```

`for` 迴圈只負責重複執行；真正「沒有名字、被當作參數傳進去」的 `function (x) { ... }` 才叫匿名函式，跟迴圈本身是兩件事。`map` 的形參 `f` 接住這個匿名函式，`a` 接住陣列，迴圈裡每輪呼叫 `f(a[i])` 執行它。

### j. 與嚴格模式的關聯：重複參數名稱

補充一則同系列的短追問：<mark style="background: #FF5582A6;">非嚴格模式下允許函式參數重名</mark>（後面的參數會覆蓋前面同名的），但<mark style="background: #FF5582A6;">嚴格模式（`'use strict'`）下重複參數名稱會直接拋出 `SyntaxError: Duplicate parameter name not allowed in this context`</mark>：

```javascript
// 非嚴格模式：合法，輸出 2（後面的蓋過前面）
function sloppyTest(a, a) {
  console.log(a);
}
sloppyTest(1, 2);

// 嚴格模式：直接 SyntaxError，函式定義階段就報錯
'use strict';
function strictTest(a, a) {
  console.log(a);
}
```

---

## 各對話來源

### JavaScript 變數宣告語法解析（實際內容為函式作用域／傳值傳址／形參實參，2026-09-28）— https://gemini.google.com/app/3aac1efabf64e593

使用者：什麼意思呢 原始參數例如一個數字被作為值傳遞給函式，如果呼叫的函式改變了這個參數的值，不會影響到函式外部的原始變數。舉例，還是說就是下面那一個例子？

Gemini：這段講的就是 JavaScript「傳值（Pass by Value）」，基本型別傳進函式時是複製副本；物件型別行為相反，是「傳參考（Pass by Reference / Sharing）」，函式內部改屬性外部也會跟著變。

使用者：所以這邊講的是函式作用域會隔絕內部和外部的變數，同時函式內部會複製一次number但這次的前提下，number是否有在外部定義？還是在內部定義的？還是這沒有區別？

Gemini：外部有外部的變數（`num`），內部有內部的變數（形參 `number`），兩者分開。形參是只存在函式內部的區域變數，呼叫時 JavaScript 自動建立並把外部值複製給它，函式結束就銷毀，外部變數全程不受影響——有沒有區別，區別非常大，因為傳值＋區域變數隔離讓兩者互不影響。

使用者：你說 把5複製一份給內部的參數那這個副本是否在記憶體裡面也有一個地址

Gemini：是的，副本在記憶體裡有自己獨立的位址；外部變數與內部形參佔用不同的記憶體位置，所以修改形參只動到形參自己的空間。

使用者：number square這個例子使用形參或者實際參數有差嗎？

Gemini：有差，形參（Formal Parameter）是定義時的變數名稱，實參（Actual Argument）是呼叫時真正傳進去的值，兩者作用域、生命週期、記憶體位址都不同，形參改名也不影響外部呼叫結果。

使用者：這邊是如何呼叫一個匿名函式作為其第一個參數？他的匿名是指for迴圈嗎？

Gemini：不是，匿名跟 for 迴圈無關。匿名指函式沒有名字，是現場建立直接當參數傳進去的值；for 迴圈只負責重複呼叫這個被傳進來的函式。

### JavaScript 參數預設值解析（重複參數名稱與嚴格模式，2026-09-28）— https://gemini.google.com/app/3a1b8c513813cf2d

使用者：給幫我寫一個是嚴格模式，一個是非嚴格模式的嗎？（針對重複參數名稱）

Gemini：非嚴格模式下 `function sloppyTest(a, a)` 合法，後面的參數覆蓋前面；嚴格模式下 `'use strict'; function strictTest(a, a)` 會拋出 `SyntaxError: Duplicate parameter name not allowed in this context`。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：JavaScript 變數宣告語法解析（實際為傳值傳址／形參實參） | https://gemini.google.com/app/3aac1efabf64e593 | 對話擷取於 2026-09-28 |
| Gemini 對話：JavaScript 參數預設值解析（實際為重複參數名稱／嚴格模式） | https://gemini.google.com/app/3a1b8c513813cf2d | 對話擷取於 2026-09-28 |
| MDN：Functions — Pass by value 範例（`square`／`mycar`） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions | 查證於 2026-09-28 |
| MDN：Strict mode — 重複參數名稱限制 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode | 查證於 2026-09-28 |
| MDN：Anonymous function expression | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/function | 查證於 2026-09-28 |

⚠️ 存疑／更正：無——本篇對話內容經與 MDN 官方文件核對，方向正確；兩則對話標題與實際內容有落差（標題各自寫「變數宣告語法解析」「參數預設值解析」，實際內容是傳值傳址與嚴格模式重複參數），筆記標題已改用實際內容命名以利日後查找。
