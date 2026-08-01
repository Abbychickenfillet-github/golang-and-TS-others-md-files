---
title: JavaScript 事件循環與閉包（面試核心）
type: topic-note
source: Gemini
tags: [gemini, javascript, event-loop, closure, 面試, scope]
sources:
  - https://gemini.google.com/app/64769bd082d6dd2
updated: 2026-06-30
---

# JavaScript 事件循環與閉包（面試核心）

## 重點整理

### 一、事件循環 Event Loop

JavaScript 是<mark style="background: #ADCCFFA6;">單執行緒（Single Thread）</mark>語言，同一時間只有一個 Call Stack 在運作，一次只能做一件事。為了不讓頁面在等待（API、計時器、點擊）時凍結，瀏覽器用 Event Loop 達成<mark style="background: #FFF3A3A6;">非阻塞（Non-blocking）的非同步行為</mark>。

四個核心組成：

- <mark style="background: #ADCCFFA6;">呼叫堆疊 Call Stack</mark>：追蹤目前執行中的函式，遵循「後進先出（LIFO）」。
- <mark style="background: #ADCCFFA6;">Web APIs</mark>：瀏覽器提供的環境（非 JS 引擎本身），處理 `setTimeout`、`fetch`、DOM 事件等的倒數/等待。
- <mark style="background: #ADCCFFA6;">工作佇列 Callback / Task Queue</mark>：非同步任務完成後，其 callback 移到這裡排隊。
- <mark style="background: #ADCCFFA6;">事件循環 Event Loop</mark>：持續監控 Call Stack，當 Stack 清空時把佇列中第一個任務推入執行。

微任務 vs 巨任務（決定執行先後）：

| 類型 | 優先權 | 常見來源 |
|---|---|---|
| <mark style="background: #BBFABBA6;">微任務 Microtask</mark> | 高 | `Promise.then()`、`async/await`、`MutationObserver` |
| <mark style="background: #FFB8EBA6;">巨任務 Macrotask</mark> | 低 | `setTimeout`、`setInterval`、I/O、UI 渲染 |

> 面試守則：每當 Call Stack 清空，Event Loop 會<mark style="background: #FF5582A6;">一次清空目前「所有」的微任務佇列，才會去執行下一個巨任務</mark>；執行下一個巨任務前，瀏覽器才視情況進行畫面渲染。

隨堂考（輸出順序）：

```javascript
console.log('1');
setTimeout(() => { console.log('2'); }, 0);
Promise.resolve().then(() => { console.log('3'); });
console.log('4');
```

正確順序：<mark style="background: #BBFABBA6;">1 → 4 → 3 → 2</mark>。1、4 是同步先跑；3 是微任務，優先於巨任務 2。

### 二、閉包 Closure

一句話定義：<mark style="background: #FFF3A3A6;">閉包是一個內層函式，能「記憶」並存取外層函式的範疇（Scope），即使外層函式已經執行完畢、離開 Call Stack。</mark>閉包不是要特別開啟的功能，而是函式建立時自然誕生的底層機制。

兩大基石：

- <mark style="background: #ADCCFFA6;">詞法範疇 Lexical Scope</mark>：變數存取權限在「程式碼被寫下來那一刻（宣告位置）」就決定，不是執行時決定。
- <mark style="background: #ADCCFFA6;">垃圾回收 Garbage Collection</mark>：函式執行完局部變數本應釋放，但若仍被內層函式引用，瀏覽器就不敢釋放，會保留在記憶體（Heap）中。

應用：用閉包建立<mark style="background: #BBFABBA6;">私有變數（資料封裝）</mark>。

```javascript
function createCounter() {
  let count = 0;               // 鎖在範疇內，外部摸不到
  return {
    increment() { count++; console.log(count); },
    decrement() { count--; console.log(count); }
  };
}
const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
// console.log(count); // ReferenceError: count is not defined
```

經典面試題（var vs let）：

```javascript
for (var i = 1; i <= 3; i++) {
  setTimeout(() => { console.log(i); }, 1000);
}
```

- 直覺：依序 1, 2, 3
- 實際：<mark style="background: #FF5582A6;">同時輸出 4, 4, 4</mark>
- 原因：`var` 是<mark style="background: #ADCCFFA6;">函式作用域</mark>，迴圈裡其實成了同一個（近乎全域的）`i`；callback 執行時迴圈早跑完，`i` 已是 4，三個閉包指向同一個 `i`。
- 修正：把 `var` 改成 <mark style="background: #BBFABBA6;">`let`（區塊作用域，每次迭代各建立獨立範疇）</mark>，輸出 1, 2, 3。

### 三、閉包 + 傳址陷阱（魔王題）

```javascript
function createWallet(initialAmount) {
  let money = initialAmount;
  let history = [];
  return {
    checkBalance() { return money; },
    getHistory()   { return history; },   // 回傳「同一個」陣列參照
    spend(amount)  { if (amount <= money) { money -= amount; history.push(`Spent ${amount}`); } }
  };
}
const myWallet = createWallet(100);
const record = myWallet.getHistory();
myWallet.spend(30);
record.push('Found 100 on the street');
myWallet.spend(20);
console.log(myWallet.checkBalance()); // 50
console.log(myWallet.getHistory());   // ['Spent 30', 'Found 100 on the street', 'Spent 20']
```

關鍵：陣列/物件是<mark style="background: #FF5582A6;">傳址（Pass by Reference）</mark>，`record` 與閉包內 `history` 指向同一塊記憶體，外部 `record.push` 直接污染了內部私有狀態（但 `money` 不受影響，仍是 70 → 50）。

防漏修正：回傳時<mark style="background: #BBFABBA6;">切斷參照，回傳複本</mark>：

```javascript
getHistory() { return [...history]; } // 展開運算子回傳新陣列
```

### 四、觀念釐清

- `return money` 不會變成全域變數。`money` 既不在全域、也沒「回到」函式內部，而是<mark style="background: #FFF3A3A6;">被封裝在專屬該實例的閉包環境裡</mark>；`return` 只是把值「複印」一份丟給外面，本體仍留在閉包口袋中。
- `createWallet` 才是<mark style="background: #D2B3FFA6;">函式物件（Function Object，可被呼叫）</mark>；`myWallet` 是<mark style="background: #D2B3FFA6;">普通物件（Plain Object）</mark>，`myWallet()` 會 `TypeError`。物件裡綁定的 `spend`、`checkBalance` 稱為<mark style="background: #ADCCFFA6;">方法（Method）</mark>。
- C++ 也有閉包（C++11 起的 <mark style="background: #ADCCFFA6;">Lambda</mark>），但無 GC：須明確「捕捉」`[value]`（傳值複製，安全）或 `[&ref]`（引用，類似 JS）。回傳引用捕捉了 Stack 區域變數會造成<mark style="background: #FF5582A6;">懸空引用（Dangling Reference）→ 未定義行為</mark>。JS 靠 GC 自動把變數留在 Heap，不會有這問題。

## 各對話來源

### JavaScript 事件循環核心觀念複習（2026-06）— https://gemini.google.com/app/64769bd082d6dd2

**使用者：** 前端工程師的觀念複習先給我一個

**Gemini：** （Event Loop 完整解說：單執行緒、Call Stack、Web APIs、Callback Queue、Event Loop；微任務 vs 巨任務；隨堂考 `1→4→3→2`。內容已整合進上方「一、事件循環」。）

**使用者：** 再一個

**Gemini：** （閉包定義、詞法範疇、GC、私有變數 `createCounter`、`var`/`let` 迴圈經典題輸出 4,4,4 與修正。整合進「二、閉包」。）

**使用者：** 再出一題閉包概念題

**Gemini：** （`createWallet` 傳址污染魔王題：`checkBalance()` 為 50、`getHistory()` 含外部插入的字串；修正用 `[...history]` 切斷參照。整合進「三、閉包+傳址陷阱」。）

**使用者：** C++語言也有閉包嗎

**Gemini：** （C++11 Lambda、`[value]` 傳值捕捉 vs `[&ref]` 引用捕捉、懸空引用陷阱，與 JS GC 對比。整合進「四、觀念釐清」。）

**使用者：** Return money會return到createWallet裡面最多吧？他不會變成全域變數對吧！

**Gemini：** （確認不會變全域；`money` 活在閉包環境，`return` 只是複印值丟出。整合進「四、觀念釐清」。）

**使用者：** CreateWallet 是放在 myWallet 這樣算一個函式物件變數嗎

**Gemini：** （釐清 `createWallet`=函式物件、`myWallet`=普通物件、內部為方法 Method。整合進「四、觀念釐清」。）
