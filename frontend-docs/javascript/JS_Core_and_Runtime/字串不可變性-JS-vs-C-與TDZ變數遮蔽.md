---
title: 字串不可變性（JS vs C）與 let 區塊變數遮蔽下的 TDZ
type: topic-note
source: Gemini
tags: [gemini, javascript, string, immutable, tdz, hoisting, memory]
aliases: [字串不可變性-JS-vs-C-與TDZ變數遮蔽]
related:
  - "[[04-變數宣告-let-const-var]]"
  - "[[09-Hoisting-函式宣告vs函式表達式-TDZ]]"
  - "[[10-傳值vs傳址-賦值與記憶體空間]]"
  - "[[11-記憶體模型-stack-heap-動態配置-GC]]"
sources:
  - https://gemini.google.com/app/41d3c779dee10274
  - https://gemini.google.com/app/f4da8ca9d6c67841
updated: 2026-09-05
---

# 字串不可變性（JS vs C）與 let 區塊變數遮蔽下的 TDZ

> [!info]- 🔗 與既有筆記的關聯
> 本篇是 Gemini 來源的補充筆記。字串不可變性是全新主題（vault 尚無專篇），歸進 JS_Core_and_Runtime；TDZ 部分與 [[04-變數宣告-let-const-var]]（手寫，同層變數作用域坑）、[[09-Hoisting-函式宣告vs函式表達式-TDZ]]（Gemini 來源，函式宣告 vs 函式表達式的 TDZ）主題重疊但角度不同，本篇補的是「函式內部宣告同名 let 變數時，TDZ 如何跟作用域鏈的名稱遮蔽（shadowing）互動」這個更細的情境，兩篇既有筆記都是手寫或另一子主題，依筆記工作守則不直接編輯，改開新篇並互相 wikilink。與 [[10-傳值vs傳址-賦值與記憶體空間]] 的「變數是指標、值是記憶體實體資料」概念也直接相關。

本篇重點 a–s，共 19 個

---

## 5W1H 速查：讀本篇之前先把座標定好

> [!important]+ 最常被搞錯的一件事：<mark style="background: #FF5582A6;">把「字串不可變」讀成「字串變數不能改」</mark>
> a. 不可變的是<mark style="background: #FFF3A3A6;">**值**（記憶體裡那塊字串實體）</mark>，不是<mark style="background: #BBFABBA6;">**變數**（指向位址的標籤）</mark>。`greeting = "Hello"` 完全合法，它做的是「在新位址建一塊新字串，再把標籤改指過去」，位址 A 上的 `"Hi"` 從頭到尾一個位元都沒被改過。
> b. 由此延伸：`str[0] = "J"` 之所以沒效果，不是「改失敗」，是<mark style="background: #ADCCFFA6;">語言根本不提供這條路</mark>——非嚴格模式靜默忽略、嚴格模式直接報錯。C 可以這樣寫，是因為 C 的字串本質是字元陣列，能原地覆寫同一塊位址。
> c. 本篇第二主題也有一個對稱的誤解：以為 `let x` 報錯是<mark style="background: #FF5582A6;">「因為 `let` 不會 hoisting」</mark>。<mark style="background: #BBFABBA6;">剛好相反</mark>——正是因為它**有** hoisting，名稱被鎖在函式頂端遮蔽了外層的 `x`，才不會往外找到 `"global"`，只是還沒初始化，所以落在 TDZ。

| 5W1H | 問題 | 一句話答案 |
|---|---|---|
| **What** 是什麼 | 到底什麼東西不可變？ | 不可變的是**值**，不是**變數**。變數只是一個指向記憶體位址的標籤，標籤永遠可以改指到別的地方；被指到的那塊字串實體，一旦建立就再也不會被改寫 |
| **When** 什麼時候 | 新字串是什麼時候被建出來的？ | <mark style="background: #ADCCFFA6;">字串**字面值**在 Parse／編譯階段就進常數池（每個函式只做一次，還可能被駐留共用）</mark>；<mark style="background: #FFF3A3A6;">`concat`／`substring`／`+` 產生的新字串則是執行期、每次求值都新建一塊</mark> |
| **Who** 誰做的 | 誰在管這些字串？ | JS 引擎（V8）。字串駐留（String Interning）是**引擎實作優化**、不是 ECMAScript 規格保證；沒人再指向的舊字串由 GC 自動回收 |
| **Where** 在哪裡 | 新舊字串各放哪？ | 字串實體在 **Heap**；變數這個「標籤／指標」本身放在 Stack Frame 或環境紀錄裡。重新賦值改的只有標籤那一格，Heap 上的舊實體原封不動 |
| **Which** 哪一種 | 哪些操作會改到原字串？ | <mark style="background: #BBFABBA6;">一個都沒有</mark>。`substring`／`concat`／`+`／`toUpperCase` 全部是「回傳新字串」；想更新變數就得自己**重新賦值**，方法不會幫你放回去 |
| **How** 怎麼做到 | C 憑什麼可以原地改？ | C 的字串是**字元陣列**，位址 X 開一塊空間放字元，之後直接覆寫同一塊。代價是要人工管理記憶體、多個指標共享時容易產生 Side Effect；JS 用「每次新建」換掉這個風險 |
| **Why** 為什麼 | 為什麼那個 `let x` 例子不是印出 `"global"`？ | 因為 `let` **也會** hoisting：`x` 被鎖定給內層版本、遮蔽了外層，作用域鏈不會再往外找；而程式是逐行執行的，`console.log(x)` 先跑到時 `x` 還在 TDZ，於是丟 `ReferenceError` |

### 時間軸：這件事發生在哪一格

```text
◄────────── buildtime 建置期 ──────────►◄────────── runtime 執行期 ──────────►
      （你的電腦／CI，部署前就跑完）              （瀏覽器或 Node 載入腳本後）

 ①轉譯        ②打包         ③Parse        ④Bytecode      ⑤每次執行都重來
 transpile    bundle        解析／AST      Ignition       執行幾次做幾次
 ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌──────────────────┐
 │Babel   │   │webpack │   │★字面值 │   │AST →   │   │ ★ concat／substr  │
 │tsc     │──►│Vite    │──►│ 進常數池│──►│Bytecode│──►│   ／+ 新建字串    │
 │SWC     │   │Rollup  │   │★TDZ 範圍│   │        │   │ ★ 改指標、GC 舊值 │
 └────────┘   └────────┘   │ 靜態決定│   └────────┘   │ ★ TDZ 丟          │
  只換寫法      只換位置     └────────┘                │   ReferenceError  │
  不建字串      不建字串      每個函式只做一次           └──────────────────┘
                            只做決策不新建             同一行跑 100 次
                                                      就新建 100 塊字串

 ★ 本篇兩個主題落在兩個不同的格子，這正是它們容易被搞混的原因：
   ・字串「字面值」與 TDZ 的「範圍」在第 ③ 格定案（只做一次）。
   ・字串的「新建／改指標／GC」與 TDZ 的「丟錯」在第 ⑤ 格（每次執行都重來）。
```

同一件事，換成這兩個主題自己的階段序列再看一次：

```text
【序列一】str = str.concat(" World") 在記憶體裡的四步（執行期，每次求值都重跑）

 ① 位址 A：字串實體 "Hello"          ← str 這個標籤指向 A
        │
        ▼ ② 執行 concat：在位址 C 建立一塊全新的 "Hello World"
          （A 與參數那塊 " World" 一個位元都沒被改動）
        │
        ▼ ③ 重新賦值：把 str 這個標籤從指向 A 改成指向 C
        │
        ▼ ④ 位址 A 沒有任何變數再指向它 ──► 等待 GC 回收

 ★ 全程沒有任何一塊字串被「修改」過，只有「新建」與「改指向」。


【序列二】function test 裡那個同名 let x 的執行序（每次呼叫都重來）

 ① Creation Phase：把內層 let x 的名稱註冊到 test 頂端
        │            ★ 名稱遮蔽成立，外層的 x 從此在函式內被擋住
        ▼
 ② TDZ 開始：名稱已存在，但還沒初始化
        │
        ▼ ③ Execution Phase 逐行跑到 console.log(x)
        │    ★ 人在 TDZ 裡 → ReferenceError，程式當場中斷
        │
        ▼ ④ let x = "local" 這一行根本沒被執行到（所以也不會印出 local）
```

同一條時間軸用 Mermaid 再畫一次：

```mermaid
flowchart LR
    subgraph BT["buildtime 建置期（不建立任何字串，也不丟錯）"]
        T["① 轉譯 transpile<br/>Babel／tsc／SWC"] --> BU["② 打包 bundle<br/>webpack／Vite／Rollup"]
    end
    subgraph RT1["runtime 執行期 · 每個函式只做一次"]
        P["③ Parse／Scope Analysis<br/>★ 字串字面值進常數池，可能被駐留<br/>★ TDZ 的範圍在這裡靜態劃出"] --> BC["④ Ignition 產生 Bytecode"]
    end
    subgraph RT2A["runtime 執行期 · 字串：每次求值都重來"]
        S1["位址 A：字串實體 Hello<br/>str 這個標籤指向 A"] --> S2["★ concat／substring／加號<br/>在位址 C 新建一塊全新字串<br/>A 一個位元都沒被改"]
        S2 --> S3["★ 重新賦值<br/>把 str 從指向 A 改成指向 C"]
        S3 --> S4["位址 A 沒人再指向<br/>★ 等待 GC 回收"]
    end
    subgraph RT2B["runtime 執行期 · TDZ：每次呼叫都重來"]
        D1["Creation Phase<br/>★ 內層 let x 註冊到函式頂端<br/>名稱遮蔽成立，外層 x 被擋住"] --> D2["★ TDZ 開始<br/>名稱已存在，但未初始化"]
        D2 --> D3["Execution Phase 逐行執行<br/>跑到 console.log 這一行<br/>★ 丟 ReferenceError，當場中斷"]
        D3 --> D4["let x 那一行沒被執行到<br/>所以永遠印不出 local"]
    end
    BU --> P
    BC --> S1
    BC --> D1
```

---

## 重點整理

a. <mark class="b">變數（Variable）與值（Value）是兩件事：</mark>變數只是一個指向記憶體位址的「標籤/指標」，值才是真正存在記憶體裡的實體資料；理解「不可變 vs 可變」的關鍵就是分清楚這兩者。

b. <mark class="y">JS 的 reassignment（重新賦值）改的是「指標指向」，不是「原本內容」：</mark>`let greeting = "Hi"; greeting = "Hello";` 執行後，記憶體位址 A 上的 `"Hi"` 從頭到尾沒被修改過，JS 只是在新的位址 B 建立 `"Hello"`，再把 `greeting` 這個指標改指向 B。

c. <mark class="p">舊值沒人參照就會被 GC 回收：</mark>位址 A 上的 `"Hi"` 若之後沒有任何變數再指向它，就會被 JavaScript 的垃圾回收機制自動清理掉（可與 [[11-記憶體模型-stack-heap-動態配置-GC]] 的 GC 概念對照）。

d. <mark class="r">直接改字串的單一字元會被靜默忽略：</mark>`let str = "Hello"; str[0] = "J";` 之後 `str` 仍是 `"Hello"`，一般模式下這個賦值會被忽略，嚴格模式下則會直接報錯，這就是「原生字串不可變」的具體表現。

e. <mark class="b">C 語言字串本質是字元陣列（Character Array）：</mark>`char greeting[] = "Hi";` 在記憶體位址 X 開闢空間存放 `['H','i','\0']`，之後可以直接 `greeting[0]='H'; greeting[1]='e';` 原地覆蓋位址 X 裡的內容，`greeting` 指向的位址從頭到尾不變，這就是「可變（Mutable）」。

f. <mark class="v">C（可變）與 JS（不可變）的效能/安全權衡：</mark>C 原地修改、不必頻繁申請新記憶體，字串拼接效能高，但需要人工管理記憶體、且多個指標指向同一塊記憶體時一處修改會影響所有地方，容易有 Side Effect／Race Condition；JS 每次修改或拼接都建立新字串，記憶體負擔較大、增加 GC 負擔，但傳遞字串時完全不用擔心被其他函式意外修改，安全性與可預測性更高。

g. <mark class="g">JS 選擇不可變字串的理由之一：字串駐留（String Interning）：</mark>因為字串不可變，V8 等引擎可以讓多個相同的字串字面值（例如程式裡所有的 `"Hello"`）共享同一塊記憶體位址，藉此節省記憶體，這是引擎實作優化，非 ECMAScript 規格保證的行為。

h. <mark class="g">不可變字串也降低了 Bug 發生率：</mark>把字串當參數傳進函式時，呼叫者不用擔心字串內容被函式意外修改，資料流更可預測，是前端開發中降低隱藏 Bug 的重要設計。

i. <mark class="b">轉入第二主題：ReferenceError 不是因為「不會 hoisting」：</mark>`let`／`const`／`var` 三者在 JavaScript 中全部都會發生 Hoisting，差別在於 hoisting 之後「初始化」的處理方式不同，不是有沒有 hoisting 的問題。

j. <mark class="y">var 的 hoisting：宣告＋初始化一起做：</mark>編譯階段就把 `var` 提升到作用域頂端並直接初始化為 `undefined`，所以宣告前讀取只會拿到 `undefined`、不會報錯，例如 `console.log(a); var a = 10;` 印出 `undefined`。

k. <mark class="r">let／const 的 hoisting：只做宣告，初始化要等執行到那一行：</mark>編譯階段只把名稱註冊到作用域頂端，真正的「初始化（賦予預設值）」要等程式執行到宣告那一行才發生；從宣告到初始化之間的這段空窗期就是 <mark class="r">TDZ（暫時性死區，Temporal Dead Zone）</mark>，在 TDZ 內存取變數會丟出 `ReferenceError: Cannot access '...' before initialization`。

l. <mark class="v">變數生命週期三步驟：</mark>①宣告（Declaration，在作用域註冊名稱）→②初始化（Initialization，分配記憶體並給預設值）→③賦值（Assignment，賦予實際值）；`var` 是 hoisting 時①②一起做，`let`/`const` 是 hoisting 時只做①，②要等執行到宣告那行。

m. <mark class="p">驗證「let 真的有 hoisting」的實驗：</mark>

```javascript
let x = "global";
function test() {
  console.log(x);   // 猜猜看：印出 "global" 還是報錯？
  let x = "local";
}
test();
// 結果：Uncaught ReferenceError: Cannot access 'x' before initialization
```

如果 `test()` 內部的 `let x` 完全沒有 hoisting，`console.log(x)` 應該會順著作用域鏈往外找到全域的 `"global"`；但它卻直接報錯，這證明了函式內部的 `let x` 確實被提升到了 `test()` 頂端並「鎖定」了 `x` 這個名稱，只是還沒初始化，所以落在 TDZ 內。

n. <mark class="b">名稱遮蔽（Shadowing）加上逐行執行，才是報錯而非印出 "local" 的真正原因：</mark>一旦 `test()` 內部宣告了同名的 `let x`，`x` 這個名稱在整個函式作用域內就被「鎖定」給內層版本，JS 不會再往外層作用域鏈查找；接著程式是逐行執行的，`console.log(x)` 這一行先被執行到，此時內層 `x` 還在 TDZ（未初始化），於是拋出 `ReferenceError` 並中斷，程式根本還沒執行到下面 `let x = "local"` 那一行賦值。

o. <mark class="g">要印出 `"local"`，讀取動作必須寫在初始化之後：</mark>把 `let x = "local";` 搬到 `console.log(x);` 前面，執行順序才會先完成初始化與賦值，再讀取到 `"local"`；這也呼應 [[04-變數宣告-let-const-var]] 裡「TDZ 決定的是『時間軸』、作用域決定的是『空間軸』」的區分，這裡踩到的是時間軸（TDZ），不是空間軸（跑到作用域外）的問題。

### 追加 2026-09-05：substring／concat 的示範，以及 `+` 串接的型別轉換

(p) <mark style="background: #FFF3A3A6;">所有字串方法都是「回傳新字串」，原本的變數一動也不動</mark>。這就是不可變性在 API 層面的具體長相。

```js
let originalStr = "JavaScript";
let newStr = originalStr.substring(0, 4);   // 取索引 0 到 4（不含 4）

console.log(newStr);       // "Java"        ← 回傳的新字串
console.log(originalStr);  // "JavaScript"  ← 原字串完全沒變
```

```js
let str1 = "Hello";
let str2 = " World";
let combinedStr = str1.concat(str2);

console.log(combinedStr);  // "Hello World"
console.log(str1);         // "Hello"   ← 保持原樣
console.log(str2);         // " World"  ← 保持原樣
```

(q) <mark style="background: #BBFABBA6;">要更新變數就必須「重新賦值」</mark>，因為方法只會把新字串交給你，不會幫你放回去。

```js
let str = "Hello";
str = str.concat(" World");   // 重新賦值
console.log(str);             // "Hello World"
```

(r) <mark style="background: #ADCCFFA6;">`+` 也是回傳新字串，但它多做了一件事：型別轉換</mark>。只要 `+` 兩邊有任何一邊是字串，另一邊就會被轉成字串再串接；兩邊都不是字串時才做數字加法。

![[螢幕擷取畫面 2026-09-05 132900.png]]

上圖 F12 Console 實測：`"con" + 78` 得到 `"con78"`，數字 78 被自動轉成 `"78"` 再串接。

![[螢幕擷取畫面 2026-09-05 122243.png]]

上圖是同一個規則的兩個變形：`7 + '7'` 得到 `"77"`（不是 14），因為右邊是字串；下半段 `let` 宣告只是宣告，Console 顯示 `undefined` 是「這段陳述式沒有回傳值」，不是變數的值是 undefined。

(s) <mark style="background: #FF5582A6;">這是面試常考的陷阱</mark>：`+` 對字串是串接、對數字是加法，而 `-` 只有數字語意，所以 `'7' - 7` 會得到 `0`（字串被轉成數字），但 `'7' + 7` 得到 `"77"`。詳細的轉換規則見 [[15-ToPrimitive-ToNumber-型別轉換抽象操作]]。

### 追加來源：JavaScript 字串的不可變性與操作（2026-09-05）— https://gemini.google.com/app/f4da8ca9d6c67841

**使用者：** 當我們用 `substring()` 來擷取字串，或用 `concat()` 來把兩個字串合為一，這些都是會回傳另一個字串，而非改變原本的字串。示範

**Gemini：** 這段文字在說明 JavaScript 中字串的原生值不可變性（Immutability）。對字串進行擷取或拼接時，原本的字串變數內容不會受到任何影響，方法只會回傳一個全新的字串。`substring(0, 4)` 會回傳 `"Java"` 而 `originalStr` 仍是 `"JavaScript"`；`str1.concat(str2)` 會回傳 `"Hello World"` 而 `str1`、`str2` 保持原樣。觀念小結：如果希望更新變數的值，必須明確地把回傳的新字串重新賦值給該變數（`str = str.concat(" World")`）。

## 各對話來源

### JS 字串不可變性與 C 差異（2026-08-02 擷取）— https://gemini.google.com/app/41d3c779dee10274

**使用者：** 原生值是不可變的（immutable），意思是我們不能改變那個值本身。舉例來說字串（string）是其中一個，這是在 explain this 的網站看到的前端面試考題，題目是如何知道變數的型別？答案之一在講到字串，他說 JavaScript 原生值，我們不能去改變 'Hi' 這一個字串（但在其他程式語言，字串有可能是可變的，例如在 C 就是可變的）。我們僅可以把某個變數，賦予另一個字串，例如：`let greeting = "Hi"; greeting = "Hello";`。那重新覆值呢？難道不是嗎，還是說是記憶體位址挖一個新的空格放字串，舊的等沒有用到就會被丟掉？C 就是可變的，那效能差在哪？

**Gemini：** 你的直覺非常敏銳！重新賦值（Reassignment）改變的是「變數綁定的記憶體指標」，而不是「原本的資料內容本身」。變數（如 `greeting`）只是標籤/指標，指向儲存資料的記憶體位址；值（如 `"Hi"`）才是真正存在記憶體裡的實體資料。`let greeting = "Hi"` 在位址 A 建立 `"Hi"`；`greeting = "Hello"` 在位址 B 建立全新的 `"Hello"`，再把指標改指向 B，位址 A 的 `"Hi"` 從頭到尾沒被修改過，這就是「不可變」；若再沒有變數指向它，之後會被 GC 清掉。若嘗試 `str[0] = "J"` 直接改字元，會被靜默忽略（嚴格模式報錯）。C 語言字串本質是字元陣列，可以原地修改（`greeting[0]='H'`），指向的記憶體位址不變，這就是「可變」。效能上：C 原地修改快、但需人工管理記憶體且多指標共享一塊記憶體容易有 Side Effect；JS 每次修改都建立新字串、GC 負擔較大，但因為字串不可變可以做字串駐留（String Interning）節省記憶體，且傳遞字串永遠不怕被意外修改，安全性更高。

**使用者：** 假如某個變數還沒被宣告，我們就先使用，在 JavaScript 會出現索引錯誤 ReferenceError，是因為 let var 宣告的變數不會 hoisting？

**Gemini：** 不是因為「不提升（Hoisting）」，而是因為 `let`/`const` 與 `var` 的 Hoisting 機制與宣告狀態不同！實際上 `var`、`let`、`const` 全部都會發生 Hoisting，只是提升後的處理方式不一樣。`var` 是宣告＋初始化一起做（初始化為 `undefined`），所以宣告前使用不報錯只回傳 `undefined`；`let`/`const` 是 hoisting 時只做宣告，要等執行到宣告那一行才做初始化，宣告到初始化之間的空窗期就是暫時性死區（TDZ），在 TDZ 內存取會拋出 `ReferenceError`。

**使用者：** 那為什麼 `let x = "global"; function test(){ console.log(x); let x = "local"; } test();` 結果不是印出 local？

**Gemini：** 因為程式碼是「由上到下、依序執行」的！第一階段（編譯階段/hoisting）：引擎掃描 `test()` 內部所有宣告，把 `x` 註冊到 `test()` 作用域頂端並鎖定這個名稱，此時 `x` 還沒初始化、處於 TDZ。第二階段（執行階段）：逐行執行到 `console.log(x)` 時，發現 `x` 還在 TDZ、還沒初始化，於是拋出 `ReferenceError` 並立刻中斷，根本還沒執行到下面 `let x = "local"` 那一行。若要印出 `"local"`，必須把 `let x = "local"` 搬到 `console.log(x)` 前面，讓執行順序先完成初始化。

**使用者：** 但可是會被鎖定在（原輸入為斷句形式：「但 可 是 會 被 鎖 定 在」）

**Gemini：** 沒錯，在這個區塊內，變數名稱就被鎖定給了這個函式的作用域。因為已經宣告了一個區域的 `x`，所以會優先指向這個內部的 `x`，而不是全域的 `x`；只是在這行宣告被執行到之前，這塊區間都處於暫時性死區，才會導致 `ReferenceError`。

**使用者：**（以斷字輸入複述理解）所以宣告的那個部分，因為一開始那個名單被提升了，那提升是這個名單會讓他鎖定，但是又先跑到 console log，那有 console log 就會造成 TDZ 裡面，它就會顯示 x 還在 TDZ 裡面，那還沒有初始化。只要知道還在 TDZ 裡面，就會有 reference error。是嗎？

**Gemini：** 完全正確！你的理解非常精準。宣告被提升鎖定了變數名稱，而執行到 `console.log(x)` 時，因為它還處在暫時性死區、也就是還沒初始化的狀態，所以才會立刻爆出 `ReferenceError`。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
| --- | --- | --- |
| JS 字串不可變性與 C 差異對話 | https://gemini.google.com/app/41d3c779dee10274 | Gemini 對話，擷取存檔於 2026-08-02 |
| var/let 作用域與 TDZ 基礎對照 | [[04-變數宣告-let-const-var]] | Abby-notes 既有筆記，updated 2026-07-29 |
| 函式宣告 vs 函式表達式的 TDZ | [[09-Hoisting-函式宣告vs函式表達式-TDZ]] | Abby-notes 既有筆記，updated 2026-07-29 |
| 傳值 vs 傳址記憶體模型 | [[10-傳值vs傳址-賦值與記憶體空間]] | Abby-notes 既有筆記，updated 2026-07-29 |
| 字串不可變性的 substring／concat 示範（Gemini 對話） | https://gemini.google.com/app/f4da8ca9d6c67841 | Gemini Flash，2026-09-05 |

本篇 Gemini 內容與 MDN《String》《let》《Hoisting》等標準文件描述一致，未發現需要標記存疑/更正之處；g 點的「字串駐留」屬引擎（如 V8）實作優化，非 ECMAScript 規格強制保證行為，已在該點註明。
