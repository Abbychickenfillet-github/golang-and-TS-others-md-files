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
updated: 2026-08-02
---

# 字串不可變性（JS vs C）與 let 區塊變數遮蔽下的 TDZ

> [!info]- 🔗 與既有筆記的關聯
> 本篇是 Gemini 來源的補充筆記。字串不可變性是全新主題（vault 尚無專篇），歸進 JS_Core_and_Runtime；TDZ 部分與 [[04-變數宣告-let-const-var]]（手寫，同層變數作用域坑）、[[09-Hoisting-函式宣告vs函式表達式-TDZ]]（Gemini 來源，函式宣告 vs 函式表達式的 TDZ）主題重疊但角度不同，本篇補的是「函式內部宣告同名 let 變數時，TDZ 如何跟作用域鏈的名稱遮蔽（shadowing）互動」這個更細的情境，兩篇既有筆記都是手寫或另一子主題，依筆記工作守則不直接編輯，改開新篇並互相 wikilink。與 [[10-傳值vs傳址-賦值與記憶體空間]] 的「變數是指標、值是記憶體實體資料」概念也直接相關。

本篇重點 a–o，共 15 個

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

本篇 Gemini 內容與 MDN《String》《let》《Hoisting》等標準文件描述一致，未發現需要標記存疑/更正之處；g 點的「字串駐留」屬引擎（如 V8）實作優化，非 ECMAScript 規格強制保證行為，已在該點註明。
