---
title: JavaScript 事件循環與閉包（面試核心）
type: topic-note
source: Gemini
tags: [gemini, javascript, event-loop, closure, 面試, scope]
sources:
  - https://gemini.google.com/app/64769bd082d6dd2
updated: 2026-10-13
---

# JavaScript 事件循環機制與閉包（面試核心）

## 一、事件循環 Event Loop

JavaScript 是<mark style="background: #ADCCFFA6;">單執行緒（Single Thread）</mark>語言，<mark style="background: #FFB8EBA6;">同一時間只有一個 Call Stack 在運作</mark>，<mark style="background: #FFB86CA6;">一次只能做一件事。為了不讓頁面在等待（API、計時器、點擊）時凍結</mark>，<mark style="background: #FFB8EBA6;">瀏覽器用 Event Loop 達成非阻塞（Non-blocking）的非同步行為</mark>。

任務：不斷觀察call stack是不是空的
優先清空：MicroTask
四個核心組成：
Event Loop從Marcro/Microtask Queue取出回呼函式，並將它推進Call Stask
- <mark style="background: #ADCCFFA6;">呼叫堆疊 Call Stack</mark>：追蹤目前執行中的函式，遵循「後進先出（LIFO）」。
- <mark style="background: #ADCCFFA6;">Web APIs</mark>：瀏覽器提供的環境（非 JS 引擎本身），處理 `setTimeout`、`fetch`、DOM 事件等的倒數/等待。
- <mark style="background: #ADCCFFA6;">工作佇列 Callback / Task Queue</mark>：非同步任務完成後，其 callback 移到這裡排隊。
- <mark style="background: #ADCCFFA6;">事件循環 Event Loop</mark>：持續監控 Call Stack，當 Stack 清空時把佇列中第一個任務推入執行。

微任務 vs 巨任務（決定執行先後）：

| 類型                                                        | 優先權 | 常見來源                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <mark style="background: #BBFABBA6;">微任務 Microtask</mark> | 高   | • `Promise.then()`：callback <b>永遠不會在目前的同步程式執行到一半時被呼叫</b>，就算 Promise 早就 resolve 也一樣，只是被排進微任務佇列，等同步程式跑完才執行。非同步操作（網路、計時器）要等多久不可控，<b>不保證</b>比同步程式先完成；它做完的那一刻 Promise 才 resolve，`.then` 的 callback 才被丟進微任務佇列。歸為微任務的原因：① 執行時機固定，callback 一律非同步，不會時而同步、時而非同步；② 目前這段程式一結束就立刻接手，不被渲染或其他巨任務插隊，使用者看不到中間狀態。<br>• `async/await`：`await` 本質是 Promise 的語法糖，`await` 後面的程式碼等同被包進 `.then()`，所以也是微任務。<br>• `MutationObserver`是瀏覽器的API：每次 DOM 變動只是把一筆紀錄存進清單並排一個微任務，等目前腳本跑完，才把整批紀錄一次交給 callback（白話解釋見下方）。因此不會像舊的 Mutation Events 每改一次 DOM 就同步觸發一次，而且 callback 在畫面繪製前執行，能拿到最終結果。<br>　↳ 與 React StrictMode 的關係：<b>沒有因果關係，只有「次數」上的對比</b>。MutationObserver 是「改 DOM 很多次 → 只通知 1 次」；StrictMode 是「元件函式呼叫 2 次 → 只有 1 次結果被採用並寫進 DOM」。StrictMode 的第二次呼叫發生在 Render 階段、是同步連續執行，不經過微任務，也還沒碰 DOM；DOM 只在 Commit 階段改一次，所以 MutationObserver 只會收到那一批變動，不會收到兩批。 |
| <mark style="background: #FFB8EBA6;">巨任務 Macrotask</mark> | 低   | • `setTimeout`：計時器要靠瀏覽器或 Node.js 的計時器 API 在 JS 引擎之外倒數，時間到了之後，它的回呼函式才會被排入 Macrotask Queue 等待執行。<br>• `setInterval`：和 `setTimeout` 使用同一套計時器 API，差別只是時間到了會重複排入；每一次到期都是一個新的 Macrotask，所以每次之間都有機會先清空微任務、甚至渲染畫面。<br>• I/O（Input/Output，輸入輸出）＝程式和「自己以外的東西」交換資料，例如網路請求、讀寫檔案、查資料庫、鍵盤滑鼠事件（click）、輸出到螢幕；這些都由作業系統或硬體負責，速度比 CPU 慢上好幾個數量級，所以 JS 不會停下來傻等（細節見 [[V8與libuv協同工作原理-非同步IO]]）。歸為巨任務的原因：I/O 是在 JS 引擎之外由瀏覽器或作業系統（Node.js 是 libuv）處理，完成或發生時才把回呼丟進 Macrotask Queue，是「外部事件通知 JS」的標準管道。<br>• UI 渲染：嚴格來說渲染不是佇列裡的任務，而是瀏覽器在「兩個巨任務之間、微任務清空之後」才決定要不要進行的步驟（約每 16ms 一次）；因為它排在微任務之後，所以微任務太多或跑太久會讓畫面卡住。                                                                                                                |

> 面試守則：每當 Call Stack 清空，Event Loop 會<mark style="background: #FF5582A6;">一次清空目前「所有」的微任務佇列，才會去執行下一個巨任務</mark>；執行下一個巨任務前，瀏覽器才視情況進行畫面渲染。

> [!warning]+ 常見誤解：「同步程式在跑的時候，非同步操作會先完成」？
> **不會，也完全不保證。** 要分開看兩件事：
> 1. **非同步操作本身**（網路請求、計時器）是由瀏覽器 / 作業系統在 JS 引擎之外進行，要花多久不確定，不一定比目前的同步程式早完成。
> 2. **微任務不是非同步操作本身**，而是「Promise 變成已完成（resolved）之後，接著要跑的那段 callback」。
>
> ```javascript
> // 情況 1：Promise 早就 resolve（結果「已經有了」）
> Promise.resolve(42).then(v => console.log('then', v));
> console.log('sync');
> // 輸出：sync → then 42
> // callback 仍要等同步程式跑完才執行，不會插隊
>
> // 情況 2：Promise 還在 pending（結果還沒回來）
> fetch('/api').then(() => console.log('回應到了'));
> console.log('sync');
> // sync 先印；等網路回應抵達（由巨任務通知 JS）→ Promise 才 resolve
> // → 這時 callback 才被排進微任務佇列 → 緊接著執行
> ```
>
> 所以微任務跟非同步的關係是：它是「非同步結果出來之後，後續處理的執行方式」，**不是**「非同步一定比同步快」。

> [!note]+ MutationObserver 白話解釋：「批次收集、微任務一次回報」是什麼意思？
> 假設同步程式連續改了三次 DOM：
>
> ```javascript
> const observer = new MutationObserver(records => console.log('收到', records.length, '筆變動'));
> observer.observe(box, { childList: true, attributes: true });
> box.textContent = 'a';          // 變動 1
> box.className = 'active';       // 變動 2
> box.setAttribute('id', 'x');    // 變動 3
> console.log('同步程式結束');
> // 輸出：同步程式結束 → 收到 3 筆變動（一次回報，不是三次）
> ```
>
> - **舊的 Mutation Events**（`DOMNodeInserted`、`DOMAttrModified` 等，已棄用）：每改一次 DOM 就**當場同步**呼叫一次 handler，插在你的程式中間。改 100 次就被打斷 100 次，handler 裡若又改 DOM 還會連環觸發，效能很差。
> - **MutationObserver**：改 DOM 時只是把一筆「紀錄」（MutationRecord）放進清單，並確保有排一個微任務。這就是「**批次收集**」。等目前同步程式跑完（Call Stack 清空），微任務才執行，把整批紀錄**一次**交給 callback，這就是「**一次回報**」。
> - **為什麼選微任務**：微任務在「同步程式結束後、畫面繪製前」執行，所以 callback 拿到的是**最終狀態**；就算 callback 裡再調整 DOM，使用者也看不到中間閃爍的畫面。
> - 跟 React StrictMode 的「兩次 render」**沒有關係**，見下方 1-3。

隨堂考（輸出順序）：

```javascript
console.log('1');
setTimeout(() => { console.log('2'); }, 0);
Promise.resolve().then(() => { console.log('3'); });
console.log('4');
```

正確順序：<mark style="background: #BBFABBA6;">1 → 4 → 3 → 2</mark>。1、4 是同步先跑；3 是微任務，優先於巨任務 2。

#### 1-1 名詞對照：Task Queue 到底是哪一個？

「Task Queue」在不同文章指的東西不同，最容易混淆。**原則：Task Queue = 巨任務佇列（Macrotask Queue），不含微任務佇列。**

| 你看到的名詞                                          | 指的是       | 備註                                                                 |
| ----------------------------------------------- | --------- | ------------------------------------------------------------------ |
| Task Queue / Callback Queue / Message Queue     | 巨任務佇列     | HTML 規格裡的正式名稱就是 "task"，「Macrotask」是社群為了和微任務區分而取的俗稱                  |
| Macrotask Queue                                 | 巨任務佇列     | 同上                                                                 |
| Microtask Queue / Job Queue                     | 微任務佇列     | 早期 ES6 規格稱 Job Queue（Promise Jobs），現在統稱 Microtask Queue             |
| Python 的 `asyncio.Task`                         | **不是佇列**  | 是「包裝一個 coroutine 的物件」（類似 JS 的 Promise + 驅動器），別和 Task Queue 搞混      |
| Celery / RQ 的 "task queue"                      | 分散式工作佇列   | 把工作丟給別台機器 / 別的 process 執行（背後常是 Redis、RabbitMQ），和 Event Loop 無關 |

所以上方「四個核心組成」第三項的「工作佇列 Callback / Task Queue」就是指**巨任務佇列**；微任務佇列是另外一條、優先權更高的佇列。

#### 1-2 其他語言也有事件循環嗎？（Python 對照）

結論：**「有事件循環 + 佇列」是共通概念，但「微任務 / 巨任務兩層優先權」是 JavaScript（HTML 規格 / Node.js）特有的設計，Python 的 asyncio 沒有。**

| 比較項目     | JavaScript                              | Python `asyncio`                                         |
| -------- | --------------------------------------- | -------------------------------------------------------- |
| 佇列數量     | 兩條：微任務佇列（高）＋ 巨任務佇列（低）                   | 一條就緒佇列 `_ready`（FIFO）＋ 一個計時器堆 `_scheduled`               |
| 排程方式     | `queueMicrotask` / `.then` ＝ 微任務；`setTimeout` ＝ 巨任務 | `loop.call_soon` ＝ 排進 `_ready`；`loop.call_later` ＝ 放進計時器堆，到期後再移進 `_ready` |
| `await` 的後續 | 微任務                                     | 一個普通 callback（`Task.__step`），用 `call_soon` 排進 `_ready` |
| 清空規則     | 每個巨任務結束後，**把微任務清到完全沒有**（連新產生的也一起清）       | 每一輪只執行「**這一輪開始時**已在 `_ready` 的那些」，新排進來的下一輪才跑            |
| 優先權      | 微任務一定先於巨任務                              | 沒有優先權，先排先跑（FIFO）                                         |

實測（Python 3.13 / Node 24）：同樣是「一個到期的 0 秒計時器」＋「一條 A → B → C 連續往後排的 callback」。

```javascript
// JS：微任務連鎖會一直插隊，計時器要等全部清完
setTimeout(() => console.log('T'), 0);
Promise.resolve().then(() => { console.log('A');
  Promise.resolve().then(() => { console.log('B');
    Promise.resolve().then(() => console.log('C')); }); });
// 輸出：A → B → C → T
```

```python
# Python：沒有微任務，計時器到期就和 call_soon 平起平坐
loop.call_later(0, print, 'T')
def a(): print('A'); loop.call_soon(b)
def b(): print('B'); loop.call_soon(c)
def c(): print('C')
loop.call_soon(a)
# 輸出：A → T → B → C
```

差異原因：JS 的微任務佇列「清到空」才換巨任務，所以 B、C 即使是 A 執行時才產生，也插在 T 前面；Python 每一輪只處理開始時的快照，T 到期後排在 A 之後、B 之前。

> [!tip]+ Python 的 `_ready` 沒有宏 / 微任務的概念，執行順序是什麼？
> 對，**沒有**。執行順序是「**進入 `_ready` 佇列的先後順序**（FIFO）」，不是「被推進 Call Stack 的順序」——Call Stack 是執行當下函式呼叫的堆疊，佇列決定的是「下一個輪到誰上場」。
> 進入 `_ready` 的來源有三種，全部排在隊尾：① `call_soon`（包含 `await` 後續）；② 到期的計時器（`call_later`）；③ 剛偵測到可處理的 I/O 事件。每一輪（`_run_once`）流程：等 I/O → 把到期計時器和 I/O 事件追加到隊尾 → 只執行「這一輪開始時」佇列裡的那批 → 這批跑完才進下一輪。

其他語言也有事件循環嗎？**有，事件循環是通用的設計模式（事件驅動，Reactor 模式），不是 JavaScript 專屬。** 差別在於 JS 是「內建且強制」（宿主環境一定幫你跑），多數其他語言是「要用才開」的函式庫。

| 語言 / 環境              | 有沒有事件循環   | 對應機制                                                            |
| -------------------- | --------- | --------------------------------------------------------------- |
| JavaScript（瀏覽器 / Node.js） | 有，內建且強制   | 瀏覽器由 HTML 規格定義；Node.js 由 libuv 實作                              |
| Python               | 有，但要自己選用  | `asyncio`（另有 Twisted、Tornado）；一般同步寫法的 Python 程式沒有               |
| Java                 | 函式庫層級有    | NIO Selector、Netty、Vert.x；傳統寫法是多執行緒＋阻塞 I/O                      |
| C#                   | 有         | `async/await` 搭配 `SynchronizationContext`；WinForms / WPF 的 UI 訊息迴圈 |
| Rust                 | 函式庫層級有    | tokio、async-std 的 executor                                      |
| Swift / iOS          | 有         | 主執行緒 RunLoop ＋ GCD 佇列                                           |
| Android              | 有         | Looper ＋ Handler ＋ MessageQueue（和 JS 的巨任務佇列概念最像）              |
| 桌面 GUI（Qt、Win32、GTK） | 有         | 訊息迴圈（Win32 的 `GetMessage` 迴圈、Qt 的 `QEventLoop`），GUI 程式基本上都有     |
| 伺服器軟體（Nginx、Redis）   | 有         | 事件迴圈 ＋ epoll，用單一執行緒處理大量連線                                       |
| Go                   | 沒有        | goroutine ＋ runtime 排程器（多工），開發者不會直接面對事件迴圈                      |
| C / C++              | 語言本身沒有    | 靠 libuv、Boost.Asio 等函式庫自己搭                                      |

JS 特別被強調的原因之一：它是**單執行緒**，又要同時處理使用者操作與畫面渲染，所以「怎麼排隊」直接決定畫面卡不卡，成了面試必考；其他語言常能靠多執行緒分擔，較少被要求講清楚。

Node.js 補充：和瀏覽器類似但更細。巨任務依 libuv 分成 timers → poll（I/O）→ check（`setImmediate`）等階段；微任務之外還有更高優先的 `process.nextTick` 佇列。

> 前面那個 `1 → 4 → 3 → 2` 隨堂考，Python 寫成 `call_later(0)` ＋ `call_soon` 結果也是 `1, 4, 3, 2`，但**原因不同**：Python 是因為 `call_soon` 先進 `_ready`，計時器到期才後面追加（FIFO），並不是「微任務優先」。只靠這題看不出差異，要用上面的連鎖例子才看得出來。

#### 1-3 Event Loop 和 DOM、生命週期的關係

Event Loop **不是只管函式**，它管的是「**什麼時候**把哪段程式碼（callback）放上 Call Stack 執行」。DOM 與生命週期都靠它排程，但三者不是同一層：

| 層級       | 是誰                                  | 和 Event Loop 的關係                                       |
| -------- | ----------------------------------- | ------------------------------------------------------ |
| JS 引擎    | V8 等，執行 Call Stack                   | Event Loop 決定何時餵 callback 給它                           |
| DOM      | 瀏覽器提供的 Web API（不是 JS 語言的一部分）        | 事件監聽的 callback 靠 Event Loop 觸發；渲染時機也由 Event Loop 控制     |
| 框架生命週期 | React 的 `useEffect` 等                | 是框架「利用」Event Loop 時機點做出來的規則，Event Loop 本身不知道它的存在       |

**1. DOM 事件 → 巨任務。** `click`、`input` 等事件發生時，瀏覽器把你的 `addEventListener` callback 排進巨任務佇列，等 Call Stack 清空才執行。事件怎麼從外層傳到內層、怎麼用代理省監聽器，見 [[事件流與事件代理]]；`onclick` 與 `addEventListener` 的差別見 [[事件處理器vs事件監聽器-onevent與addEventListener]]。

**2. DOM 操作本身是同步的，但「畫面更新」是延後的。**
（DOM 樹與 Property / Attribute 見 [[DOM與BOM物件化模型-window與document階層-樹狀導覽與Property-vs-Attribute]]；動態建立節點見 [[createElement-動態建立元素]]；改文字內容的三種寫法見 [[textContent-innerText-innerHTML差異]]。）

```javascript
const box = document.querySelector('#box');
box.textContent = '處理中…';          // DOM 樹立刻改好（同步）
for (let i = 0; i < 1e9; i++) {}     // 長時間同步運算，Call Stack 一直被占住
box.textContent = '完成';
// 使用者看不到「處理中…」：畫面渲染要等 Call Stack 清空、微任務清完才會發生
```

DOM 的值馬上變了（JS 讀得到），但**使用者看到的畫面**要等到兩個巨任務之間的渲染步驟。所以長時間同步運算會凍結畫面，也是為什麼要把重運算拆成多個巨任務、或丟給 Web Worker。

`textContent = '完成'` 之後，瀏覽器只是把「樣式／排版需要重算」標記起來；等到渲染機會，才依 Critical Rendering Path 的順序做 Style → Layout → Paint → Composite，使用者才看到新文字。這一段的完整流程，以及 `requestAnimationFrame` 排在哪一格，寫在 [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]，兩篇對照著看。

**3. 渲染步驟的時間點（一輪 Event Loop 大致順序）：**
巨任務（如 click callback）→ 清空所有微任務 → `requestAnimationFrame` callback → 計算樣式 / 排版（Layout）→ 繪製（Paint）→ 下一個巨任務。
（渲染管線的細節見 [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]、實際在 DevTools 裡怎麼看見見 [[DevTools-Performance-面板-渲染管線與Repaint判讀]]；卡頓的兩種來源見 [[css-兩種卡頓-render-blocking與執行期jank]]。）

- `MutationObserver` 是微任務，所以能在畫面繪製前拿到 DOM 的變動結果。
- 讀取 `offsetHeight` 等排版屬性會「強制同步排版」，等於提前打斷這個流程，頻繁讀寫交錯會造成效能問題（Layout Thrashing）。

**4. 和生命週期的關係：間接相關。** 「生命週期」如果指的是 React：

- `useLayoutEffect`（對應 class 的 `componentDidMount` / `componentDidUpdate` 階段）：DOM 更新後、**繪製之前**同步執行，在同一個任務裡完成。
- `useEffect`：通常在**繪製之後**才執行（所以不會阻擋畫面），因此適合放非同步請求、訂閱事件。
- React 什麼時候真的去改 DOM：只在 **Commit 階段**；Render 階段只是計算 UI 藍圖，還沒碰 DOM。細節見 [[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]、[[03-useEffect將元件同步到外部系統-Web-API與DOM]]。因此 MutationObserver 要等 Commit 改了 DOM 之後才會收到通知。
- **StrictMode 的「兩次 render」和 Event Loop、MutationObserver 沒有關係**：它是開發模式下 React 在 Render 階段**連續呼叫**元件函式兩次（一次採用、一次丟棄），用來抓出不純的 render；這個階段還沒碰 DOM，Commit 只會做一次，所以 MutationObserver 不會看到「兩次變動」。開發模式 `useEffect` 多跑一輪掛載→卸載→掛載，也是 React 自己安排的檢查，不是 Event Loop 的機制。詳見 [[01-React-純函數與嚴格模式-StrictMode]]。

如果指的是頁面生命週期：`DOMContentLoaded`、`load` 也是瀏覽器在特定時機排進巨任務的事件。

一句話：**Event Loop 提供「排隊執行」的底層機制，DOM 事件、畫面渲染、框架生命週期都是在這個機制的不同時間點上做事。**

#### 1-4 手繪自測：任務執行完又產生新任務

先不看上面的答案，在紙上 / 平板上畫出下面這段程式的模型：左邊 Call Stack，右邊分成「微任務佇列」「巨任務佇列」，並標出每一步誰進、誰出。

```javascript
setTimeout(() => console.log('T'), 0);
Promise.resolve().then(() => {
  console.log('A');
  Promise.resolve().then(() => console.log('B'));   // A 執行時才產生的新微任務
});
console.log('sync');
```

- 自問 1：`B` 是在 `A` 執行時才被排進佇列，為什麼它會插在 `T` 前面？
- 自問 2：如果把這題改成 Python `asyncio`（`call_later(0, T)` ＋ `call_soon(A)`，A 裡面再 `call_soon(B)`），順序會變成什麼？為什麼？
- 答案：JS 是 `sync → A → B → T`；Python 是 `A → T → B`（`sync` 為同步先印）。差別就在「微任務佇列清到空」與「`_ready` 每輪只跑開始時的快照」。
- 手繪圖放這裡：（把圖片放進 `obsidian-attachment` 後，用 `![[檔名.png]]` 貼上）

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

## 關聯筆記

**事件循環本身**
- [[事件循環-Event-Loop-微任務與巨任務]]——關聯原因：同主題的完整版（5W1H、微任務清空規則），本篇偏面試版並多了 Python 對照與 DOM 關係。
- [[Promise是物件與JS編譯階段三件事]]——關聯原因：`.then` 的 callback 之所以是微任務，前提是先搞懂 Promise 是什麼物件。
- [[V8與libuv協同工作原理-非同步IO]]——關聯原因：「非同步操作在 JS 引擎之外進行」的實作層面（libuv）。
- [[執行緒-非同步-延遲的差異]]——關聯原因：釐清執行緒、非同步、延遲三個常被混為一談的概念，對應本篇「非同步不保證比同步先完成」。
- [[debounce為什麼一定要setTimeout-以及React的useRef]]——關聯原因：`setTimeout` 是巨任務，debounce 就是靠它延後執行。

**DOM 操作與事件**
- [[事件流與事件代理]]——關聯原因：click 等事件的 callback 就是排進巨任務佇列的任務，本篇 1-3 的第 1 點。
- [[事件處理器vs事件監聽器-onevent與addEventListener]]——關聯原因：註冊 callback 的兩種方式，callback 何時被呼叫由 Event Loop 決定。
- [[DOM與BOM物件化模型-window與document階層-樹狀導覽與Property-vs-Attribute]]——關聯原因：DOM 是瀏覽器提供的 Web API，不是 JS 語言本身。
- [[createElement-動態建立元素]]、[[textContent-innerText-innerHTML差異]]——關聯原因：這些 DOM 操作都是同步執行，畫面更新要等渲染步驟。

**渲染與框架生命週期**
- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]、[[DevTools-Performance-面板-渲染管線與Repaint判讀]]——關聯原因：渲染步驟排在微任務清空之後、下一個巨任務之前。
- [[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]、[[03-useEffect將元件同步到外部系統-Web-API與DOM]]——關聯原因：Commit 階段才改 DOM，`useEffect` 在繪製後執行。
- [[01-React-純函數與嚴格模式-StrictMode]]——關聯原因：StrictMode 的「兩次 render」與 Event Loop 無關，本篇 1-3 有說明如何區分。

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
