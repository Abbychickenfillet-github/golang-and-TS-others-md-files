---
title: JavaScript 事件循環 Event Loop（微任務 vs 巨任務）
type: topic-note
source: Gemini
tags: [gemini, javascript, event-loop, 非同步, 面試]
sources:
  - https://gemini.google.com/app/82167bcb1c15c00c
  - https://gemini.google.com/app/b3a4ebdfa5b4754d
  - https://gemini.google.com/app/296e1a879bb61062
  - https://gemini.google.com/app/d54c36b18b457e25
updated: 2026-07-02
---

# JavaScript 事件循環 Event Loop（微任務 vs 巨任務）

## 重點整理

JavaScript 是<mark style="background: #ADCCFFA6;">單執行緒（Single Thread）</mark>的語言，同一時間只能執行一個任務（只有一個 Call Stack 在運作）。但網頁要處理大量非同步操作（API 請求、計時器、使用者點擊），為了不讓畫面在等待時「凍結」，瀏覽器用 <mark style="background: #FFF3A3A6;">Event Loop</mark> 機制達成「非同步、非阻塞（Non-blocking）」。

四個核心組成：

- <mark style="background: #ADCCFFA6;">呼叫堆疊 Call Stack</mark>：追蹤目前正在執行的函式，遵循<mark style="background: #FFF3A3A6;">後進先出 LIFO</mark>。
- <mark style="background: #ADCCFFA6;">Web APIs</mark>：瀏覽器提供的環境（非 JS 引擎本身），負責 `setTimeout`、`fetch`、DOM 事件等的倒數或等待。
- <mark style="background: #ADCCFFA6;">工作佇列 Callback / Task Queue</mark>：非同步任務完成後，其回呼函式被移入這裡排隊。
- <mark style="background: #ADCCFFA6;">Event Loop</mark>：工作非常單純——持續監控 Call Stack，當 Call Stack <mark style="background: #FFF3A3A6;">完全清空</mark>時，就把佇列中的第一個任務推進 Call Stack 執行。

### 微任務 vs 巨任務（決定執行先後）

| 類型 | 優先權 | 常見來源 |
|------|--------|----------|
| <mark style="background: #BBFABBA6;">微任務 Microtask</mark> | <mark style="background: #FF5582A6;">極高</mark> | `Promise.then()`、`async/await`、`MutationObserver` |
| 巨任務 Macrotask | 較低 | `setTimeout`、`setInterval`、I/O、UI 渲染 |

<mark style="background: #FF5582A6;">面試守則</mark>：每當 Call Stack 清空，Event Loop 會<mark style="background: #FFF3A3A6;">一次清空目前所有微任務</mark>，才會去執行下一個巨任務；而在執行下一個巨任務前，瀏覽器會視情況決定是否進行畫面渲染。

### 隨堂考（是非／輸出順序）

```javascript
console.log('1');
setTimeout(() => { console.log('2'); }, 0);
Promise.resolve().then(() => { console.log('3'); });
console.log('4');
```

正確輸出順序：<mark style="background: #BBFABBA6;">1 → 4 → 3 → 2</mark>。
原因：`1`、`4` 是<mark style="background: #FFF3A3A6;">同步碼</mark>先執行；`3` 是<mark style="background: #FFF3A3A6;">微任務</mark>，優先於巨任務 `2`（`setTimeout` 即使設 0ms 也要排到巨任務佇列）。

### 追加 2026-07-02：Call Stack 到底怎麼運作（洋芋片罐子比喻）

把 Call Stack 想成<mark style="background: #FFF3A3A6;">一個有底的洋芋片罐子／疊盤子架</mark>，規則就是 <mark style="background: #ADCCFFA6;">LIFO（後放進去的先拿出來）</mark>。每呼叫一個函式就 <mark style="background: #ADCCFFA6;">Push</mark> 一片進罐子頂端，函式執行完（遇到 `return` 或結尾）就 <mark style="background: #ADCCFFA6;">Pop</mark> 掉。

```javascript
function eatBreakfast() {
  makeCoffee();
  console.log("吃完早餐了！");
}
function makeCoffee() {
  console.log("咖啡泡好了！");
}
eatBreakfast(); // 程式從這裡開始
```

堆疊變化：`[eatBreakfast]` → 遇到 makeCoffee 變 `[makeCoffee, eatBreakfast]`（eatBreakfast 暫停等待）→ makeCoffee 印完被 Pop 回 `[eatBreakfast]` → eatBreakfast 印完 Pop → `[空]`。<mark style="background: #FFF3A3A6;">JS 只有一個罐子，所以叫單執行緒</mark>——最上面那片沒拿走，下面的只能死守等待。

### 追加：單執行緒 vs 同步 vs 非同步（別再搞混）

<mark style="background: #ADCCFFA6;">單執行緒</mark>講的是「廚房只有一個廚師」（資源限制）；<mark style="background: #ADCCFFA6;">同步/非同步</mark>講的是「廚師做事的模式」（流程設計）。

| 觀念 | 核心定義 | 以 Call Stack 為主的運作 | 生活化比喻 |
|------|----------|--------------------------|-----------|
| 單執行緒 Single Thread | 同一時間只能做一件事 | 整個 JS 引擎只有一個 Call Stack | 廚房只有一個廚師、一雙手 |
| 同步 Synchronous | <mark style="background: #FF5582A6;">前一件沒做完，下一件絕不開始</mark> | 任務進 Stack 若花 5 秒就<mark style="background: #FF5582A6;">阻塞（Blocking）</mark>5 秒，網頁凍結 | 廚師守在鍋邊 10 分鐘什麼都不做 |
| 非同步 Asynchronous | 遇到耗時任務先交代出去，自己繼續做 | 丟給 <mark style="background: #ADCCFFA6;">Web APIs</mark> 倒數／等資料，Stack 立刻清空往下跑 | 廚師把水壺放上爐子就轉頭去切菜 |

<mark style="background: #FF5582A6;">常見迷思澄清</mark>：「非同步是不是一次能執行多個任務？」<mark style="background: #BBFABBA6;">不是。</mark> 任何一微秒裡 JS 的 Call Stack <mark style="background: #FFF3A3A6;">永遠只有一行程式碼在跑</mark>。非同步的真相是：JS 本人（廚師）永遠單執行緒，是<mark style="background: #ADCCFFA6;">瀏覽器環境（Web APIs，多執行緒）</mark>在旁邊幫忙等待與計時；等外包做完，JS 再找空檔處理結果。所以「同時燒水又切菜」是<mark style="background: #FFF3A3A6;">整個網頁系統</mark>看起來的樣子，不是 JS 引擎本人。

### 追加：宏/微任務的排隊是誰在管？

<mark style="background: #FF5582A6;">Web APIs 只負責「計時／等待」，不負責分類與排隊。</mark> 分類排隊是 <mark style="background: #ADCCFFA6;">JS 引擎內部的 Event Loop</mark> 在管：

- `setTimeout`、DOM 事件 → 時間到後，Web API 把回呼丟進<mark style="background: #ADCCFFA6;">宏任務佇列 Macrotask Queue</mark>。
- `Promise.then()` → <mark style="background: #FFF3A3A6;">根本不經過 Web API</mark>（Promise 是 JS 原生自帶），狀態完成時引擎直接塞進<mark style="background: #BBFABBA6;">微任務佇列 Microtask Queue</mark>。
- Event Loop（餐廳經理）：Stack 清空後<mark style="background: #FFF3A3A6;">先把微任務佇列「全部」清光</mark>，才抓一個宏任務進 Stack；每執行完一個宏任務會再回頭檢查有沒有新微任務插隊。

### 追加：為什麼微任務要優先？（銀行櫃檯比喻）

微任務＝<mark style="background: #FFF3A3A6;">「因目前任務衍生、需要立刻接著做的收尾工作」</mark>（客人辦到一半說「順便刷個存摺」，順手辦完比叫他重新抽號碼牌有效率）。技術上兩大理由：

1. <mark style="background: #FFF3A3A6;">優化渲染效能</mark>：把所有微任務清空、資料徹底算好後，瀏覽器才<mark style="background: #BBFABBA6;">一次性批量渲染（Batch Update）</mark>，避免連續改 DOM 造成畫面閃爍。
2. <mark style="background: #FFF3A3A6;">確保資料即時性</mark>：Promise 拿到 API 資料要立刻更新狀態，若排到 `setTimeout`／scroll 後面會造成<mark style="background: #FF5582A6;">資料不同步（Race Condition）</mark>。

### 追加：宏/微任務是看「時間長短」分的嗎？

<mark style="background: #FF5582A6;">完全不是看時間，而是看「血統／來源」，且 W3C 規範定死。</mark> 引擎在執行前根本無法預知程式會跑多久。

| 類型 | 嚴格限定來源 |
|------|--------------|
| <mark style="background: #BBFABBA6;">微任務</mark> | `Promise.then/catch/finally`、`async/await`、`MutationObserver`、`queueMicrotask()` |
| 宏任務 | `setTimeout/setInterval`、I/O（讀檔／網路回傳）、UI 渲染／DOM 事件 |

<mark style="background: #FFF3A3A6;">反直覺例子</mark>：`setTimeout(fn,0)`（宏任務、瞬間結束）遇上一個內含 5 秒死迴圈的 `Promise.then`（微任務）→ 網頁會<mark style="background: #FF5582A6;">先卡死 5 秒印出微任務</mark>，才印出那個 0 秒的 setTimeout。證明微任務再慢也優先。

### 追加：為什麼 I/O 與 UI 渲染是宏任務？

- <mark style="background: #FFF3A3A6;">I/O</mark>：是<mark style="background: #ADCCFFA6;">來自作業系統／硬體的「全新外部事件」</mark>（何時完成 JS 無法預測），不是引擎內部的收尾，沒資格插隊微任務 → 乖乖去宏任務排隊。
- <mark style="background: #FFF3A3A6;">UI 渲染</mark>：是最笨重的工程（Style → Layout → Paint → Composite）。若做成微任務，改 1000 次就渲染 1000 次會當機；所以瀏覽器等微任務清空、資料算完後，才<mark style="background: #BBFABBA6;">依固定頻率（60Hz≈每 16.6ms）批量渲染一次</mark>。

### 追加：完整的事件循環一輪順序（含 rAF）

<mark style="background: #ADCCFFA6;">`requestAnimationFrame`（rAF）</mark>是<mark style="background: #FFF3A3A6;">專為渲染而生</mark>的非同步：不屬宏也不屬微，有自己的隊伍，嚴格綁在<mark style="background: #FFF3A3A6;">渲染流水線最前端</mark>（下次重繪前執行），最適合做動畫位移計算，保證不掉影格。一個影格（16.6ms）內的嚴格順序：

1. <mark style="background: #BBFABBA6;">宏任務</mark>：執行一個（點擊事件／定時器到期）。
2. <mark style="background: #BBFABBA6;">微任務</mark>：執行並<mark style="background: #FFF3A3A6;">徹底清空</mark>（Promise.then）。
3. <mark style="background: #BBFABBA6;">rAF</mark>：若該更新畫面，先執行 requestAnimationFrame。
4. <mark style="background: #BBFABBA6;">UI 渲染</mark>：Style → Layout → Paint → Composite，畫面更新。
5. <mark style="background: #D2B3FFA6;">Idle</mark>：有剩餘時間才跑 `requestIdleCallback`（零碎空閒做不緊急雜事）。

### 工作佇列 vs 呼叫堆疊（Gemini 手繪示意圖重點）

Abby 請 Gemini「畫給我看」，其產生的示意圖標題為 **「工作佇列與呼叫堆疊：他們是不同的系統！」**，核心對照（圖已轉成文字，未另存圖檔）：

- <mark style="background: #ADCCFFA6;">Call Stack（呼叫堆疊）</mark>：主執行緒 Main Thread，立即執行 JS；LIFO；圖中疊著 `main()` → `calcTotal()` → `draw()（執行中）`，靠 PUSH/POP 進出。
- <mark style="background: #ADCCFFA6;">Web APIs / Node.js（外部環境）</mark>：處理耗時任務 `setTimeout API`、`fetch API`；完成後標記 Completed Task。
- <mark style="background: #ADCCFFA6;">Job Queue / Task Queue（工作佇列）</mark>：存放已完成任務的回呼 `callback1()`、`callback2()`…，<mark style="background: #FF5582A6;">不立即執行、等待排隊</mark>。
- <mark style="background: #ADCCFFA6;">Event Loop</mark>：監控 Stack 與 Queue，<mark style="background: #FFF3A3A6;">當 Stack 空了才從 Queue 取出 callback 放入 Stack</mark>。
- <mark style="background: #FFF3A3A6;">核心差異</mark>：Call Stack 是<mark style="background: #BBFABBA6;">「現在」要執行的工作</mark>（Work in Progress）；Job Queue 是<mark style="background: #BBFABBA6;">「未來」要排隊執行的工作</mark>（Waiting List）——兩者是不同的系統。

> 延伸：本主題與「閉包」「執行緒 vs 非同步 vs 延遲」緊密相關，可一起複習。

## 各對話來源

### JavaScript 事件循環核心觀念複習（2026-06-30）— https://gemini.google.com/app/82167bcb1c15c00c

使用者：前端工程師的觀念複習先給我一個

Gemini：（節錄）JavaScript 是單執行緒語言，一次只能執行一個任務。瀏覽器透過 Event Loop 達成非同步非阻塞。核心組成：Call Stack（LIFO）、Web APIs、Callback Queue、Event Loop（監控 Call Stack，清空時把佇列第一個任務推入執行）。非同步回呼分微任務（Promise.then、async/await、MutationObserver，優先權極高）與巨任務（setTimeout、setInterval、I/O、Rendering）。每當 Call Stack 清空，會一次清空所有微任務，才執行下一個巨任務。隨堂考輸出順序為 1 → 4 → 3 → 2。

### 追加回合（2026-07-02）— 同一對話深入問答 https://gemini.google.com/app/82167bcb1c15c00c

使用者：我其實不太懂 call stack，並且請你再次用表格寫出單一執行緒、同步、非同步的差異 ／ 「一次只能執行一個任務」這句話有問題吧？非同步才是一次可以執行多個吧 ／ 宏任務、微任務也是交給外部 API 處理嗎 ／ 為什麼要先執行微任務 ／ 是依照耗費時間來分宏/微任務嗎 ／ IO 跟 UI render 為什麼是宏任務 ／ 非同步事件會有跟渲染有關的任務嗎

Gemini：（節錄）用「洋芋片罐子 LIFO」＋ eatBreakfast/makeCoffee 追蹤 Call Stack。單執行緒＝資源限制（一個廚師），同步/非同步＝做事模式。澄清 JS 引擎本人永遠單執行緒，是瀏覽器 Web APIs（多執行緒）在旁邊等待計時。宏/微任務的排隊由 Event Loop 管、Web API 只負責計時；Promise 不經過 Web API 直接進微任務。微任務優先是為了批量渲染、避免資料不同步（銀行櫃檯比喻）。分類看「血統來源」不看時間（5 秒死迴圈的微任務仍優先於 0 秒 setTimeout）。I/O 是外部事件、UI 渲染太重，故為宏任務。requestAnimationFrame 綁在渲染前端；一輪順序：宏任務→清空微任務→rAF→渲染→requestIdleCallback。

### 工作佇列 vs Call Stack 示意圖（2026-07-02）— https://gemini.google.com/app/b3a4ebdfa5b4754d

使用者：工作佇列跟 Call Stack 是不同的？畫給我看。

Gemini：（以示意圖回答，內容已轉錄於上方「工作佇列 vs 呼叫堆疊」段落）強調兩者是不同系統：Call Stack 是「現在」執行中的工作、Job Queue 是「未來」排隊的回呼，Event Loop 在 Stack 清空時才把 Queue 的 callback 送進 Stack。

### JavaScript 事件循環核心觀念複習（2026-07-02）— https://gemini.google.com/app/296e1a879bb61062 、 https://gemini.google.com/app/d54c36b18b457e25

（與 82167bcb1c15c00c 為同一套「Event Loop → 閉包 → C++ 閉包 → 皮夾傳址 → 函式物件 vs 方法」複習流程的重複對話，內容已整併於本篇與「閉包 Closure」筆記，此處僅保留來源連結。）
