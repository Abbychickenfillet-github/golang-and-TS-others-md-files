---
title: "陣列的底層記憶體：一般陣列 與 型別陣列 與 類陣列"
type: topic-note
source: Gemini
tags: [gemini, javascript, array, typedarray, arraybuffer, v8, memory, webworker]
sources:
  - https://gemini.google.com/app/fb2e1580ca06e598
updated: 2026-09-15
---

# 陣列的底層記憶體：一般陣列 與 型別陣列 與 類陣列

> 本篇重點 a–y ，共 25 個。
> 主軸圖只有一張，後續追問請直接指回圖上的 ①②③④ 四個區塊，不要另開章節。

![[學習JS_圖解_三種陣列的記憶體佈局-一般陣列vs型別陣列vs類陣列_2026-09-15.svg]]

互動版（可自己考自己）：[11-陣列的底層記憶體-一般陣列與型別陣列與類陣列-ArrayBuffer視圖與Transferable.html](11-陣列的底層記憶體-一般陣列與型別陣列與類陣列-ArrayBuffer視圖與Transferable.html)
可執行範例：[11-demo-typedarray-view與transferable.js](11-demo-typedarray-view與transferable.js)

---

## 一句話總覽

| 名稱 | 它到底是什麼 | 記憶體佈局 | 長度 | 有沒有 map／filter |
| --- | --- | --- | --- | --- |
| 一般陣列 Array | 一個有特殊 length 行為的物件 | 預設連續（fast elements），太稀疏時轉雜湊表（dictionary elements） | 動態 | 有 |
| 型別陣列 TypedArray | 掛在 ArrayBuffer 上的一層「解讀方式」 | 嚴格連續的位元組 | 建立當下固定 | 有大部分，沒有 push／pop |
| 類陣列 Array-like | 只有 length 與數字鍵的普通物件 | 就是一般物件的屬性表 | 看物件自己怎麼定 | 完全沒有 |
| 中介陣列 Intermediary Array | 不是 API ，是「過程中的暫存陣列」這個概念 | 就是一般陣列 | 動態 | 有 |

<mark style="background: #ADCCFFA6;">中介陣列</mark>一詞不在 ECMA-262 規範裡，寫筆記時把它當成描述用語就好，不要當成某個類別去找。

---

## ① 一般陣列 Array：本質是物件，只是 length 很特別

**(a) 索引在規範裡是字串鍵。**
　規範定義的 array index 是「可以轉回同一個字串的非負整數字串」，所以 `arr[0]` 與 `arr['0']` 取到同一格。
　但這是「語意上」的規定，不代表引擎真的去字串化，見 (d)。

**(b) `length` 回傳的是「最大整數索引 + 1」，不是元素個數。**

```js
const arr = ['apple'];
arr[100] = 'banana';
arr.length;        // 101 ，不是 2
arr.length = 1;    // 反過來手動改 length 會把後面的元素砍掉
arr;               // ['apple']
```

**(c) 可以掛非索引屬性，而且不計入 `length`。**

```js
const arr = [1, 2];
arr.customKey = 'I am not an index';
arr.length;        // 2
arr.customKey;     // 'I am not an index'
```

**(d) V8 預設用「快陣列 fast elements」：一塊連續的 backing store，`arr[i]` 直接算位移，所以是 O(1)。**
　<mark style="background: #FF5582A6;">⚠️ 更正</mark>：Gemini 在對話中說一般陣列「記憶體分配是離散的，類似雜湊表或鏈結串列」，這句話會誤導。
　　V8 的預設是連續的 `FixedArray`，只有在下面 (e) 的情況才會退化成雜湊表。

**(e) 太稀疏就掉進「慢陣列 dictionary elements」，改用雜湊表存。**
　V8 官方部落格的說法是：fast elements 是單純的 VM 內部陣列，property index 直接對應 elements store 的 index；但對「只有少數格子有值的超大稀疏陣列」來說這種表示法太浪費，於是改成 dictionary mode。

**(f) elements kind 的轉換是單向的，而且 holey 回不去。**
　一旦被標記成 holey（有洞），之後就算把洞都補滿也永遠是 holey；一旦升級成比較一般的 kind（例如 `PACKED_SMI_ELEMENTS` → `PACKED_ELEMENTS`）也退不回去。
　　實務結論：<mark style="background: #BBFABBA6;">不要 `delete arr[i]`，也不要 `new Array(n)` 先開洞再填</mark>，用 `push` 或 `Array.from({length:n},...)` 讓它保持 packed。
　　這一段跟 [[08-Object-keys與Array-keys-稀疏陣列孔洞的差異]] 是同一件事的兩面：那篇講「洞在 API 層看起來怎樣」，這篇講「洞在引擎層造成什麼代價」。

**(g) 擴容是「另開一塊更大的，整批複製過去，再釋放舊的」。**
　JS 引擎（V8）先給陣列一個預設 capacity → `push` 把元素塞爆 capacity → 引擎在 Heap 重新申請一塊更大的連續記憶體 → 把舊資料整批複製過去 → 釋放舊空間，整個過程對開發者透明。
　<mark style="background: #FF5582A6;">⚠️ 存疑</mark>：Gemini 說擴容倍率是「1.5 到 2 倍」。
　　V8 原始碼的 `JSObject::NewElementsCapacity` 大約是「舊容量 + 位移 + 16」，但網路上的二手整理對位移量有 `>> 1` 與 `>> 2` 兩種說法，彼此矛盾，要用請以 V8 原始碼為準。
　　「2 倍」比較像 C++ `std::vector` 常見的做法，不要跟 V8 混為一談。

---

## ② 型別陣列 TypedArray：資料與解讀分離

**(h) 架構是「底層緩衝區 + 頂層視圖」。**
　`ArrayBuffer` 只是向作業系統要到的一塊連續位元組，它自己不知道裡面是整數還是浮點數；`TypedArray` 本身不存資料，它是一張<mark style="background: #ADCCFFA6;">格式卡（View）</mark>，負責告訴引擎「請把這塊 buffer 當成某種數字格式來讀寫」。
　　所以建立 View 的時候一定要把 buffer 傳進去，因為 View 必須寄生在某個 buffer 之上。

**(i) 同一塊 buffer 可以掛多個 View，改一個另一個立刻看得到。**

```js
const buffer = new ArrayBuffer(8);        // 8 Bytes
const i8  = new Int8Array(buffer);        // 1 Byte 一格 → length 8
const i32 = new Int32Array(buffer);       // 4 Bytes 一格 → length 2

i32[0] = 1000;
i8[0];   // 底下是同一塊記憶體，i8 立刻看到 1000 的最低位元組
```

　這招在解析二進位封包時很好用：封包前 4 Bytes 是檔頭整數，後面是像素資料，就各掛一個 View 去讀同一塊。

**(j) 長度建立當下就固定，沒有 `push`／`pop`。**
　<mark style="background: #FF5582A6;">⚠️ 更正</mark>：Gemini 說容量不夠時會「跳出錯誤或寫入失敗」。
　　實際行為是<mark style="background: #BBFABBA6;">靜默忽略</mark>：對超出範圍的數字索引寫入不會丟 `TypeError`，也不會擴充長度，就是什麼都沒發生，讀回來是 `undefined`。

```js
const ta = new Int32Array(3);
ta[10] = 99;
ta.length;   // 3
ta[10];      // undefined ，不會報錯，這比報錯更難 debug
```

**(k) 真的要變長，有兩條路。**

```js
// 路線一：手動擴容（就是 (g) 裡引擎幫一般陣列做的事，自己做一遍）
let oldArr = new Int32Array([10, 20, 30]);
const newArr = new Int32Array(oldArr.length * 2);
newArr.set(oldArr);        // 把舊資料整批複製進去
newArr[3] = 40;
oldArr = newArr;

// 路線二：resizable ArrayBuffer（建立時就先講好上限）
const buf = new ArrayBuffer(12, { maxByteLength: 40 });
const view = new Int32Array(buf);   // 不給長度 → 會跟著 buffer 伸縮
view.length;        // 3
buf.resizable;      // true
buf.resize(20);
view.length;        // 5
```

---

## ③ 類陣列 Array-like 與中介陣列

**(l) 類陣列只是「有 length 與數字鍵」的普通物件，原型鏈上沒有 `Array.prototype`。**
　常見的有 `document.querySelectorAll()` 回傳的 `NodeList`、函式裡的 `arguments`、`getElementsByTagName()` 回傳的 `HTMLCollection`。

**(m) 中介陣列是「概念」不是 API。**
　它指的是：為了得到最終結果，在中間步驟臨時建立、用完即丟的暫存陣列。

**(n) 鏈式呼叫的每一步都會生一個中介陣列。**

```js
const numbers = [1, 2, 3, 4, 5];
const result = numbers
  .filter(n => n % 2 !== 0)   // 產生中介陣列 [1, 3, 5]
  .map(n => n * 2);           // 產生最終結果 [2, 6, 10]
```

　幾十筆無所謂；但如果原始陣列有一百萬筆，`filter` 產生的中介陣列會瞬間吃掉大量記憶體又立刻被丟棄，觸發 GC 造成畫面卡頓。
　　要避免就改寫成單一 `for` 迴圈或用 Generator，一次走完不落地。
　　GC 何時回收、怎麼判斷可達性，接到 [[全域變數的GC回收時機-Reachability與window生命週期]]。

**(o) `Array.from()` 的產物就是一個中介陣列，目的是把類陣列接上 `Array.prototype`。**

```js
const divs = document.querySelectorAll('div');   // NodeList ，沒有 map
const divArray = Array.from(divs);               // 中介陣列，這時才有 map
```

---

## ④ 為什麼底層要拆成 ArrayBuffer：因為它可以被「轉移」

**(p) 陣列 O(1) 隨機存取，單向鏈結串列 O(n) 循序存取。**
　鏈結串列的節點是 `[Data | Next]`，變數只記得 Head 的位址，要拿第 n 個就得做 n 次 `current = current.next`，完全無法跳關。

**(q) 陣列能 O(1) 是因為位址可以用算的。**

```
目標位址 = 起始位址 + (索引 × 單一元素大小)
arr[3] → 1000 + (3 × 4) = 1012
```

　不論陣列長度是 4 還是 4,000,000，都只要一次乘法加一次加法。

**(r) 但頭部增刪剛好反過來。**

| 操作 | 陣列 Array | 單向鏈結串列 Linked List | 為什麼 |
| --- | --- | --- | --- |
| 讀特定位置 get(i) | O(1) | O(n) | 陣列算位址，鏈結串列要順著指標走 |
| 搜尋特定數值 | O(n) | O(n) | 兩者都不知道值在哪，都要從頭查 |
| 頭部新增／刪除 | O(n) | O(1) | 陣列要把後面全部搬一格，鏈結串列只改 Head 指標 |

**(s) 所以 JS 一般陣列不是鏈結串列。**
　鏈結串列每個節點都顯式存一個 next 指標，JS 陣列底層沒有這種指標鏈；就算退化成 dictionary mode 也是雜湊表而不是鏈結串列。

**(t) Worker 執行緒有自己的 Event Loop 與記憶體空間，碰不到 DOM。**
　主執行緒負責渲染畫面 UI、處理 DOM 事件；Worker 專門在背後做巨量計算、檔案解析、網路快取，不占用 UI 執行緒的資源。

**(u) 主執行緒把資料丟給 Worker，預設走「結構化複製 structured clone」，是整份複製。**

**(v) 要零複製，關鍵在 `postMessage` 的<mark style="background: #FFF3A3A6;">第二個參數</mark>（transfer list）。**

```js
// 【主執行緒】
const buffer = new ArrayBuffer(1024 * 1024 * 100);   // 100 MB
worker.postMessage(buffer, [buffer]);                // 第二個參數才是 transfer list
buffer.byteLength;                                    // 0 ！已經 detached
```

　主執行緒把 `ArrayBuffer` 的記憶體所有權移交給 Worker → 瀏覽器不複製任何資料 → Worker 拿到同一塊記憶體 → 主執行緒那份立刻 detached。

**(w) detach 是為了避免資料競爭。**
　同一塊記憶體如果兩個執行緒都能改，就會有 race condition，所以規範直接讓來源端失效：任何時刻只有一份 `ArrayBuffer` 真正握有底層記憶體。
　　要「兩邊同時看得到」得改用 `SharedArrayBuffer`，那是另一套（而且需要 COOP／COEP 標頭）。

**(x) in-place（就地）的意思是：Worker 直接在原記憶體位置上算完再轉回來，全程零複製。**

**(y) <mark style="background: #FF5582A6;">⚠️ 更正</mark>：Service Worker 不是拿來做巨量計算的。**
　Gemini 把 Service Worker 與 Web Worker 混在一起講。兩者定位不同：

| | Web Worker（Dedicated Worker） | Service Worker |
| --- | --- | --- |
| 用途 | 巨量計算、檔案／影像解析 | 攔截網路請求、快取、離線、推播 |
| 生命週期 | 跟著開啟它的頁面 | 事件驅動，閒置時瀏覽器會主動終止它 |
| 適合長時間運算 | 適合 | 不適合，做到一半可能被殺掉 |
| 能不能碰 DOM | 不能 | 不能 |

　所以「轉移 ArrayBuffer 去背景算完再轉回來」這個 pattern，正確的對象是 <mark style="background: #BBFABBA6;">Web Worker</mark>。

---

## 相關筆記（為什麼相關）

- [[11-記憶體模型-stack-heap-動態配置-GC]]　→　那篇講 Stack 與 Heap 的分工，這篇的「陣列擴容要在 Heap 重新申請一塊」正是那篇的具體案例。
- [[10-傳值vs傳址-賦值與記憶體空間]]　→　`ArrayBuffer` 轉移的是「指標的所有權」，是傳址觀念推到極致的版本（傳完來源端還會失效）。
- [[08-Object-keys與Array-keys-稀疏陣列孔洞的差異]]　→　同一件事的兩面：那篇講洞在 API 層看起來怎樣，本篇 (e)(f) 講洞在 V8 引擎層的代價。
- [[全域變數的GC回收時機-Reachability與window生命週期]]　→　本篇 (n) 的中介陣列之所以要在意，就是因為它們會變成 GC 的工作量。
- [[執行緒-非同步-延遲的差異]]　→　本篇 (t)(u)(v) 的 Worker 是「真的多執行緒」，跟那篇講的「非同步不等於多執行緒」剛好互補。
- [[V8與libuv協同工作原理-非同步IO]]　→　同樣是 V8 層級的實作細節。
- [[01-為什麼需要陣列-new-Array與map轉換-thisArg與at負索引-Array-from通用工廠]]　→　`Array.from` 在那篇是「通用工廠」，在本篇 (o) 是「產生中介陣列的手段」。

## 練習題（LeetCode／NeetCode）

| 主題 | 題目 | 連結 |
| --- | --- | --- |
| 陣列 O(1) 索引 vs 雜湊表查找 | 1. Two Sum | https://leetcode.com/problems/two-sum/ |
| 親手實作單向鏈結串列的 O(n) 走訪 | 707. Design Linked List | https://leetcode.com/problems/design-linked-list/ |
| 親手實作雜湊表（對應 dictionary elements） | 706. Design HashMap | https://leetcode.com/problems/design-hashmap/ |
| in-place 就地操作，不開中介陣列 | 189. Rotate Array | https://leetcode.com/problems/rotate-array/ |
| 稀疏／孔洞與雙指標就地覆寫 | 27. Remove Element | https://leetcode.com/problems/remove-element/ |
| NeetCode 陣列與雜湊表單元 | Arrays & Hashing | https://neetcode.io/roadmap |

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| 本篇的原始對話（Gemini） | https://gemini.google.com/app/fb2e1580ca06e598 | 對話擷取於 2026-09-15 |
| V8 的 fast elements 與 dictionary elements ，packed／holey 單向轉換 | https://v8.dev/blog/elements-kinds | V8 官方 blog ，2017-09-12 發表 ，查證於 2026-09-15 |
| ArrayBuffer 總覽與 resizable | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer | MDN ，查證於 2026-09-15 |
| ArrayBuffer.prototype.resize() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/resize | MDN ，查證於 2026-09-15 |
| ArrayBuffer.prototype.maxByteLength | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/maxByteLength | MDN ，查證於 2026-09-15 |
| Transferable objects（轉移後來源端 detached） | https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects | MDN ，查證於 2026-09-15 |
| SharedArrayBuffer（兩邊同時存取的替代方案） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer | MDN ，查證於 2026-09-15 |
| V8 擴容倍率的二手說法（彼此矛盾，僅供參考） | https://dev.to/doogal/why-dynamic-arrays-arent-actually-dynamic-2inc | 部落格文章 ，查證於 2026-09-15 ，⚠️ 非官方 |
