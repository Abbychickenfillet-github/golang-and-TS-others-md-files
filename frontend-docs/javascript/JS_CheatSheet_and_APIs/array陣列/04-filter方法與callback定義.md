---
title: filter() 方法與 Callback 函式定義
type: topic-note
source: Gemini
tags: [gemini, javascript, array, callback, closure, memory, 高階函式, callback-hell]
related:
  - "[[02-陣列遍歷-forEach與callback]]"
  - "[[事件處理器vs事件監聽器-onevent與addEventListener]]"
  - "[[高階函式與函數式範式-取代OOP三大設計模式]]"
sources:
  - https://gemini.google.com/app/62a033a5c6e48ae3
  - https://gemini.google.com/app/cc4ff1d6cc8ff31a
updated: 2026-09-21
---

# filter() 方法與 Callback 函式定義

本篇重點 a–j，共 10 個（2026-09-21 由 Gemini 對話補入 (g)～(j)：callback 的三種形態與小括號陷阱）

## 重點整理

(a) <mark style="background: #ADCCFFA6;">`filter()` 一定會用到一個 callback function</mark>：`filter()` 遍歷陣列每個元素時都會呼叫這個 callback，callback 回傳 `true` 該元素就保留進新陣列、回傳 `false` 就被濾掉——callback 就像篩網，決定誰能通過。

(b) <mark style="background: #ADCCFFA6;">MDN 對 Callback 的定義</mark>：「回呼函式（Callback function）是指被作為引數（Argument）傳入另一個函式的函式，並在該外部函式內部被呼叫，以完成某些任務或流程。」

(c) <mark style="background: #FFF3A3A6;">Callback 既是寫法風格，也涉及記憶體機制</mark>，可從兩個角度理解：
　　① **語法/設計角度**：JS 函式是「一等公民（First-Class Functions）」，可賦值給變數、當引數傳遞、當回傳值——`fnA(fnB)` 時 `fnB` 就是 callback，意思是「這是我的邏輯，交給你（fnA），你在適當時機再呼叫回（call back）我」。
　　② **記憶體角度**：不只是文字寫法，底層涉及三個核心機制（見 d、e、f）。

(d) <mark style="background: #ADCCFFA6;">記憶體位址傳遞（Reference Pass）</mark>：寫 `data.filter(checkId)` 時，傳的不是函式「執行後的結果」，而是該函式在記憶體堆積（Heap）中的記憶體位址（指標 Reference）；外部函式（如 filter）拿到這個位址後，在自己的執行過程中透過位址找到並執行該函式。

(e) <mark style="background: #ADCCFFA6;">閉包（Closure）與變數生存週期</mark>：若 callback 存取了外層變數（例如 `data.filter(item => item.id !== targetId)` 用到外層的 `targetId`），callback 會保留對其詞法範疇（Lexical Scope）中變數的引用；即使 filter 正在自己的作用域運作，callback 依然能存取外部的 `targetId`，這就是閉包保留記憶體上下文的特性。

(f) <mark style="background: #D2B3FFA6;">Call Stack 與 Event Loop 的分野</mark>：callback 可分同步／非同步。**同步 callback**（如 `Array.filter`）直接在當前執行上下文（Call Stack）中被呼叫、推入釋放記憶體；**非同步 callback**（如 `setTimeout`／API 請求）會先擺在記憶體空間中，等非同步任務完成後，經 Web APIs → Task Queue → Event Loop 才重新被推回 Call Stack 執行。

(g) <mark style="background: #FFF3A3A6;">一句話定義：callback 是「被當成引數傳進另一個函式、並在適當時機被那個函式回頭呼叫」的函式</mark>
　　拆成三個動作就不會忘：<mark style="background: #BBFABBA6;">你定義它（寫好 `greeting`）→ 你傳遞它（`processUserInput(greeting)`，注意不加小括號）→ 別人呼叫它（`processUserInput` 內部回頭執行 `greeting()`）</mark>
　　　　「回呼（call back）」的 back 就是指這個「控制權先交出去、時候到了再回頭叫你」的方向

(h) 三種最常見的 callback 形態，對照著看就知道它在解什麼問題：

| 形態 | 外層函式負責什麼 | callback 負責什麼 | 典型 API |
|---|---|---|---|
| 逐元素處理 | 走訪陣列、決定呼叫幾次 | 決定「每個元素要變成什麼」 | `map`、`filter`、`forEach` |
| 非同步完成通知 | 等待 I/O、計時器、網路回應 | 決定「拿到結果之後做什麼」 | `setTimeout`、`fs.readFile`、舊式 AJAX |
| 分支解耦（成功／失敗） | 判斷條件，選一條路呼叫 | 決定「成功要幹嘛、失敗要幹嘛」 | `onSuccess` / `onError`、Promise 的 `then` / `catch` |

```javascript
// 形態一：逐元素處理——把「怎麼變」抽出來交給呼叫端決定
function processArray(arr, callback) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(callback(arr[i]));   // 外層只負責走訪，變形邏輯是 callback 的事
  }
  return result;
}
const double = num => num * 2;
console.log(processArray([1, 2, 3], double));   // [2, 4, 6]

// 形態二：非同步完成通知——資料到手才回呼
function fetchData(callback) {
  setTimeout(() => {
    const data = { id: 101, name: "Alice" };
    callback(data);                  // 等 2 秒拿到資料，才回頭呼叫
  }, 2000);
}
fetchData(userData => console.log("收到使用者資料：", userData.name));

// 形態三：分支解耦——成功與失敗各給一個 callback
function checkNumber(num, onSuccess, onError) {
  if (num > 0) onSuccess(num + " 是正數");
  else onError(num + " 不是正數");
}
checkNumber(5, msg => console.log("成功：", msg), msg => console.log("錯誤：", msg));
```

(i) <mark style="background: #FF5582A6;">傳 callback 時加小括號就全毀了</mark>：`processArray([1,2,3], double())` 會先執行 `double()`（參數是 undefined，得到 NaN），再把那個結果當 callback 傳進去，外層一呼叫就爆 `callback is not a function`
　　這條規則跟事件監聽器是同一條，詳見 [[事件處理器vs事件監聽器-onevent與addEventListener]] 第二節

(j) <mark style="background: #D2B3FFA6;">形態二是「回呼地獄（Callback Hell）」的起點</mark>：巢狀的非同步 callback 一層包一層會讓錯誤處理與流程閱讀變得很痛苦，這正是 Promise 與 `async/await` 被發明出來要解決的問題——它們沒有取消 callback，只是把「等結果之後做什麼」從參數位置搬到 `.then()` 或 `await` 的下一行。

## 相關筆記
- [[閉包vs參數鑽透-argument-drilling]]（同樣講閉包如何「記住」外層變數；該篇用工廠函式示範封裝折扣資料，本篇則從 filter callback 的記憶體位址/閉包角度補充「為什麼能記住」）
- [[02-陣列遍歷-forEach與callback]]（同為陣列方法 + callback 的組合；forEach 的 callback 用於「副作用」，filter 的 callback 用於「回傳布林值決定去留」，兩者可對照理解 callback 在不同陣列方法中角色如何不同）

## 各對話來源

### Filter 方法的 Callback 函式（2026-07-23）— https://gemini.google.com/app/62a033a5c6e48ae3
使用者：所以filter一定會用到一個callback function嗎
Gemini：確認 filter() 一定會用到 callback，說明其作為「篩網」的運作方式，回傳 true 保留、false 濾掉。

使用者：Callback的定義到底是什麼 mdn，他只是一種寫法的格式還是他有參雜到一些記憶體的概念？
Gemini：引用 MDN 定義，說明 callback 同時是設計模式（一等公民函式）也涉及記憶體機制，並拆解三層：記憶體位址傳遞（Reference Pass）、閉包與變數生存週期、Call Stack 與 Event Loop 的同步/非同步差異。

### 識別 JavaScript 中的回呼函式（2026-09-21 擷取）— https://gemini.google.com/app/cc4ff1d6cc8ff31a

使用者：在幫我寫一個 callback

Gemini：提供三個常見且實用的 callback 範例。範例 1 是陣列處理（模擬 `map`／`filter`）：`processArray(arr, callback)` 用迴圈走訪陣列，把每個元素傳給 callback 處理後 push 進結果陣列，搭配 `double`（乘以 2）與 `addTen`（加 10）兩個 callback 示範同一個外層函式可以換不同邏輯。範例 2 是非同步操作：`fetchData(callback)` 用 `setTimeout` 模擬等待 2 秒的伺服器請求，資料拿到後才呼叫 callback 並帶入資料。範例 3 是事件處理與邏輯解耦：`checkNumber(num, onSuccess, onError)` 依條件呼叫不同的 callback。

使用者：callback fn 是一個被回呼的函式

Gemini：完全正確。Callback Function（回呼函式）的核心概念就是「被作為參數傳進另一個函式，並在適當時機被回呼（呼叫執行）的函式」。簡單來說分三步：你定義它（寫好一個函式）、你傳遞它（把它當參數傳給另一個函式）、別人呼叫它（接收它的函式在內部回頭來呼叫它）。這個機制讓程式能做到非同步處理（資料下載完才執行）、事件監聽（按鈕點擊後執行），或是自訂邏輯控制。

## 對應題目練習

(g)～(j) 講的「把函式當值傳出去、由外層決定何時呼叫」在 LeetCode JavaScript 專區有對應題：

- [LeetCode 2634. Filter Elements from Array](https://leetcode.com/problems/filter-elements-from-array/)：直接手寫 `filter`，把 (a) 的篩網機制自己實作一次。
- [LeetCode 2635. Apply Transform Over Each Element in Array](https://leetcode.com/problems/apply-transform-over-each-element-in-array/)：就是 (h) 形態一的 `processArray`。
- [LeetCode 2665. Counter II](https://leetcode.com/problems/counter-ii/)：練「回傳一包函式」，理解函式當值來回傳遞。
- [LeetCode 2636. Promise Pool](https://leetcode.com/problems/promise-pool/)：體會 (j) 說的 callback 巢狀為什麼痛，以及 Promise 怎麼救。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/62a033a5c6e48ae3 | 2026-07-23 查證 |
| 對話原始出處（識別 JavaScript 中的回呼函式） | https://gemini.google.com/app/cc4ff1d6cc8ff31a | 對話日期 2026-09、2026-09-21 查證 |
| MDN Callback function 定義 | https://developer.mozilla.org/en-US/docs/Glossary/Callback_function | 與 MDN Glossary 說明一致，2026-07-23 查證 |
| MDN：Array.prototype.filter()（callbackFn 的三個參數與 thisArg） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter | 查證日 2026-09-21 |
| MDN：First-class Function（一等公民函式） | https://developer.mozilla.org/en-US/docs/Glossary/First-class_Function | 查證日 2026-09-21 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-21
