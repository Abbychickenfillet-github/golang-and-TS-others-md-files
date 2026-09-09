---
title: "閉包裡的變數活多久？從 debounce 的 timer 看 Environment Record 的存活時間"
series: 從 JS 核心機制到 React 核心原理：30天打造穩固的前端基本功
type: article-draft
tags: [ithome, 鐵人賽, javascript, closure, 閉包, environment-record, debounce, garbage-collection]
updated: 2026-09-04
---

# 閉包裡的變數活多久？從 debounce 的 timer 看 Environment Record 的存活時間

## 這篇要幹嘛

寫防抖動（debounce）練習的時候，我對自己解釋閉包時卡住了：

> 「`count` 活在閉包裡」——可是外層那個函式呼叫，不是幾微秒就執行完、離開 Call Stack 了嗎？怎麼會「活很久」？

這個疑惑背後其實藏著一個很容易搞混的地方：**「函式執行了多久」跟「函式裡的變數活了多久」，是兩個完全不同的概念，只是常常被當成同一件事講。**

順著這個疑惑往下挖，會一路碰到「怎麼判斷一個東西還活不活著」（可達性 reachability）、「閉包到底是不是額外開啟的功能」（不是），以及一個更精確的結論：**每次呼叫函式，不管有沒有形成閉包，都一定會建立一份新的 Environment Record——差別只在於這份記錄能不能被垃圾回收清掉。**

---

## 一、先從最小範例看閉包是什麼

一句話定義：**閉包是一個內層函式，能記憶並存取外層函式的範疇（Scope），即使外層函式已經執行完畢、離開 Call Stack 了。**

```javascript
function createCounter() {
  let count = 0; // 鎖在 createCounter 範疇內，外部摸不到
  return {
    increment: function () { count++; console.log(count); },
    decrement: function () { count--; console.log(count); }
  };
}
const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
// console.log(count); // ReferenceError: count is not defined
```

`createCounter()` 執行完回傳物件後，因為回傳的 `increment`／`decrement` 仍引用 `count`，所以 `count` 活在閉包裡，成為這兩個方法的專屬私有變數。

這裡有個容易忽略的細節：`increment` 跟 `decrement` 是**兩個不同的函式物件**，但因為它們是**同一次** `createCounter()` 呼叫裡一起建立的，兩者背後指向的是**同一份**環境記錄（裝著同一個 `count`）。所以呼叫 `increment()` 讓 `count` 變成 1 之後，`decrement()` 讀到的也是同一個已經變成 1 的 `count`，不是各自獨立的複本——這也是為什麼同一個計數器物件裡兩個方法能互相影響同一個數字。

換一次呼叫，就是完全獨立的一份：

```javascript
const counterA = createCounter(); // 產生環境記錄 A，裝著 count_A
const counterB = createCounter(); // 產生環境記錄 B，跟 A 完全獨立

counterA.increment(); // 1
counterA.increment(); // 2
counterB.increment(); // 1  ← 不是 3，因為 counterB 抓的是自己那份，不是 counterA 那份
```

---

## 二、經典陷阱：var 迴圈 + setTimeout

```javascript
for (var i = 1; i <= 3; i++) {
  setTimeout(() => { console.log(i); }, 1000);
}
```

直覺以為會印 1, 2, 3；實際印出來是 **4, 4, 4**。

因為 `var` 是函式作用域，迴圈裡沒有函式包裹時它幾乎等同全域變數——三個 `setTimeout` 的 callback 全部指向**同一個** `i`。1 秒後回呼真正執行時，迴圈早就跑完了，全域的 `i` 已經累加到 4。

修正：把 `var` 改成 `let`（區塊作用域），`for` 迴圈每一輪都會建立一個獨立的環境記錄，三個閉包就各自鎖定 1, 2, 3。

---

## 三、魔王題：閉包會「漏水」（傳值 vs 傳址）

```javascript
function createWallet(initialAmount) {
  let money = initialAmount;
  let history = [];
  return {
    checkBalance: () => money,
    getHistory: () => history,          // 直接回傳陣列參照！
    spend: (amount) => {
      if (amount <= money) {
        money -= amount;                // 所擁有金額 減去 消費金額
        history.push(`Spent ${amount}`);
      }
    }
  };
}
const myWallet = createWallet(100);
const record = myWallet.getHistory();   // record 與閉包內 history 指向同一個陣列
myWallet.spend(30);                     // money 70, history = ['Spent 30']
record.push('Found 100 on the street'); // 直接竄改了閉包內部的私有狀態！
myWallet.spend(20);                     // money 50
myWallet.checkBalance();                // 50
myWallet.getHistory();                  // ['Spent 30', 'Found 100 on the street', 'Spent 20']
```

用閉包做私有變數時，若直接回傳物件或陣列，私有性就破功了——外部拿到參照後就能繞過你的方法任意竄改內部資料。正解是回傳時**切斷參照**，回傳複本：`getHistory: () => [...history]`。

這裡順便釐清一個常被問到的定位問題：`getHistory` 不是 `createWallet` 這個函式本身的屬性，而是 `createWallet` **回傳的那個物件**（也就是 `myWallet`）身上的屬性——`createWallet` 是函式物件（可以被 `()` 呼叫），`myWallet` 是它回傳出來的一個普通物件（Plain Object），`myWallet()` 會直接噴 `TypeError`。`getHistory`、`spend` 因為綁在 `myWallet` 這個物件上，正名叫方法（Method）。

---

## 四、進階範例：debounce——閉包活多久的實測案例

回到開頭那個疑惑。用另一個更能看出「閉包活多久」的例子：**debounce（防抖動）**，常見情境是輸入框打字。

```javascript
function debounce(fn, delay) {
  let timer = null;              // 被閉包鎖住的私有變數，記錄「目前排隊中的計時器」
  return function (...args) {    // 這個回傳的函式才是真正的閉包
    clearTimeout(timer);         // 每次呼叫都先取消上一次還沒到期的計時器
    timer = setTimeout(() => {
      fn.apply(this, args);      // 真正等到「安靜下來」才執行
    }, delay);
  };
}

const search = debounce((keyword) => console.log('查詢', keyword), 300);
input.addEventListener('input', (e) => search(e.target.value));
```

### 4-1 為什麼需要 debounce：目的跟計時器本身無關

要解決的問題是「操作觸發得太頻繁」——使用者打字時每敲一鍵就觸發一次 `input` 事件，如果每次都直接做昂貴操作（打 API、重渲染整個清單），會浪費資源，還可能出現競態問題（Race Condition）：後發的請求先回來，畫面顯示的結果跟使用者當下打的字對不上。

這個問題本質上跟「有沒有計時器」無關，就算不用 `setTimeout`，問題一樣存在。`setTimeout`／`clearTimeout` 只是拿來實作「怎麼知道使用者已經停下來了」的其中一種手段：每次新動作進來就把「安靜倒數」重新歸零，只有倒數真的跑到底、沒被打斷，才代表「已經安靜 `delay` 毫秒了」，這時才真正執行 `fn`。

**debounce 要解決的問題是目的，計時器是達成這個目的的手段**——這兩者不要混為一談。

### 4-2 `let timer = null`，可以換成空陣列 `[]` 嗎？

不行，這裡選型有兩個理由：

| | `timer`（debounce） | `history`（上面的魔王題） |
| --- | --- | --- |
| 任何時刻代表 | 最多一個排隊中的計時器，舊的直接取代/丟棄 | 持續累積的完整交易紀錄，全部保留 |
| 該用什麼當空狀態 | `null`（單一值的空狀態） | `[]`（集合的空狀態） |
| 語意 | 一個可能存在、也可能不存在的單一值 | 一堆值的集合，數量不固定、會持續增加 |

用 `[]` 當 `timer` 的初始值雖然不會直接報錯（`clearTimeout([])` 會被靜默忽略），但語意上選錯了資料結構，還會踩到一個經典陷阱：

```javascript
Boolean(null) // false
Boolean([])   // true  ← 空陣列是 truthy！
```

如果之後想寫 `if (timer) {...}` 判斷「現在有沒有排隊中的計時器」，用 `[]` 當初始值這個判斷永遠是 `true`，用 `null`（falsy）才會正確。

判斷準則：**只在乎「目前這一個」、舊的直接取代，用單一值（`null` 當空狀態）；資料本質上會持續累積、要保留全部，用陣列。**

### 4-3 閉包活多久：執行時間 ≠ 存活時間

回到最初的疑惑。`debounce(...)` 這次「呼叫」本身，跟 `createCounter()` 一樣，執行完立刻結束、瞬間離開 Call Stack——這件事跟「裡面的變數活多久」是兩回事：

- **執行時間**：這次呼叫佔用 Call Stack 的時間，通常真的很短（微秒等級）。
- **存活時間**：只要還有活著的函式物件（例如被 `addEventListener` 抓著的 `search`）透過它的 `[[Environment]]` 內部欄位「抓著」那份環境記錄，垃圾回收就不敢清掉，能一路活到分頁關掉、元件卸載、或參照被手動切斷為止——跟這段程式碼有沒有被執行、執行了幾次完全無關，是「有沒有人還參照著」的**可達性（reachability）**問題，不是「有沒有正在跑」的執行問題。

容易誤解的地方：不是「使用者一直打字」讓 `timer` 活著，是「`input.addEventListener('input', ...)` 這一行執行完的那一刻，參照關係就已經成立了」。就算使用者打完字之後晾在那十分鐘不動，這個閉包（連同 `timer`）依然活著，因為事件監聽器還抓著它；真正會讓它死掉的是移除監聽器、輸入框被移除且無其他參照、或整個頁面關閉，跟有沒有持續觸發輸入完全無關。

---

## 五、更精確一點：不論是不是閉包，每次呼叫都一定會建立新的 Environment Record

這是把整篇疑惑收斂成一句話的關鍵：

```javascript
function add(a, b) { return a + b; } // 完全沒有內層函式，不會形成任何閉包
add(1, 2); // 呼叫第一次 → 建立一份全新的環境記錄（裝 a=1, b=2）
add(3, 4); // 呼叫第二次 → 又建立另一份全新的環境記錄（裝 a=3, b=4），跟上一份無關
```

**「建立環境記錄」是每次呼叫都一定發生的事，跟有沒有形成閉包完全無關**——這是呼叫函式這個動作本身的固定流程。差別只在於：

- **沒有形成閉包**（像 `add`）：函式執行完、`return` 之後，馬上就沒有任何東西再參照這份環境記錄，引擎判斷它已經不可達，能立刻回收，甚至現代引擎（V8）會用逃逸分析（escape analysis）在編譯時就看穿「這份環境記錄逃不出這次呼叫」，用更便宜的方式處理。
- **有形成閉包**（像 `increment`、`search`）：因為回傳出去的內層函式的 `[[Environment]]` 還指著這份環境記錄，函式執行完、離開 Call Stack 之後，這份環境記錄依然有人參照著，引擎不敢回收，只能留在 Heap 上活下去。

閉包不是「額外開啟」某個建立環境記錄的機制，它只是「原本就會建立的環境記錄，剛好被內層函式多抓住了一手，所以沒有被馬上清掉」而已。

---

## 六、今天的重點

1. **閉包是內層函式＋它捕捉到的外層作用域**——這個組合，不是「函式」這個標籤本身
2. **同一次外層呼叫產生的多個內層函式，共用同一份環境記錄**；不同次呼叫則各自獨立
3. **`var` 迴圈 + `setTimeout` 印出全部相同的值**，因為函式作用域下所有 callback 共用同一個變數；換成 `let` 每輪獨立
4. **用閉包做私有變數時，回傳物件/陣列參照會讓私有性破功**，記得回傳複本切斷參照
5. **`timer` 該用 `null`，`history` 該用 `[]`**——差別在「只在乎最新一個」還是「要保留全部集合」，用錯還會踩到空陣列是 truthy 的陷阱
6. **函式執行多快，跟閉包裡的變數活多久，是兩件事**——執行時間看 Call Stack 待多久；存活時間看還有沒有人參照著，是可達性問題
7. **不論是不是閉包，每次呼叫都會建立新的環境記錄**——閉包只是讓這份記錄多活了一段時間，不是額外開啟的功能

---

## 明天

順著今天資料型別的邊角料，明天要整理**資料型別總覽**：原始型別、包裹物件、自動裝箱，還有 Symbol 跟 Iterator 這兩個比較少人細講的角色。

---

## 參考來源

| 來源 | 說明 |
| --- | --- |
| MDN｜Closures | 閉包的官方定義與範例 |
| ECMA-262｜Environment Records（§9.1） | Environment Record 的規範定義，含 `[[OuterEnv]]` 欄位 |
| ECMA-262｜OrdinaryFunctionCreate（§10.2.3） | 函式建立時 `[[Environment]]` 內部欄位怎麼被設定 |
| MDN｜WeakRef and FinalizationRegistry | 可達性（reachability）與垃圾回收的判斷依據 |

本篇的計數器、迴圈、防抖動範例都在瀏覽器 / Node.js 實際執行驗證過，不是憑記憶寫的。
