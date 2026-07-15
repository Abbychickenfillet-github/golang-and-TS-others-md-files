---
title: JavaScript 閉包 Closure（私有變數、傳址陷阱、C++ 對比）
type: topic-note
source: Gemini
tags: [gemini, javascript, closure, 閉包, 作用域, 記憶體, 面試]
sources:
  - https://gemini.google.com/app/82167bcb1c15c00c
  - https://gemini.google.com/app/86e4b6c70330327f
  - https://gemini.google.com/app/296e1a879bb61062
  - https://gemini.google.com/app/d54c36b18b457e25
updated: 2026-07-02
---

# JavaScript 閉包 Closure（私有變數、傳址陷阱、C++ 對比）

## 重點整理

一句話定義：<mark style="background: #FFF3A3A6;">閉包是一個內層函式，能「記憶」並存取外層函式的範疇（Scope），即使外層函式已經執行完畢、從 Call Stack 離開了。</mark> 在 JS 中閉包<mark style="background: #ADCCFFA6;">不是要特別開啟的功能</mark>，而是伴隨函式建立而自然誕生的底層機制。

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

### 重複複習對話（2026-07-02）— https://gemini.google.com/app/296e1a879bb61062 、 https://gemini.google.com/app/d54c36b18b457e25

（這兩筆與 82167bcb1c15c00c 為同一套「Event Loop → 閉包 → C++ 閉包 → 皮夾傳址 → 函式物件 vs 方法」複習流程的重複對話，閉包段落內容與上方完全一致，此處僅保留來源連結備查。）
