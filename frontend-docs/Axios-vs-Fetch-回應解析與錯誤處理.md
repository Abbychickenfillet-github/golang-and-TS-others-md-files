---
title: Axios vs Fetch：回應物件、解構賦值與錯誤處理
type: topic-note
source: Gemini
tags: [gemini, axios, fetch, HTTP, 錯誤處理, API設計, PostgreSQL, AbortController, AbortSignal, 取消請求, race-condition]
related:
  - "[[事件處理器vs事件監聽器-onevent與addEventListener]]"
  - "[[02-useEffect的setup清理函式-return一個函式而不是執行它]]"
  - "[[Day20-API呼叫永遠在賽跑-TanStack-Query怎麼管理遠端資料狀態]]"
sources:
  - https://gemini.google.com/app/a6fe9c00516e0e84
  - https://gemini.google.com/app/90883576a7e3f228
updated: 2026-09-21
---

# Axios vs Fetch：回應物件、解構賦值與錯誤處理

> 關聯原因：[[事件處理器vs事件監聽器-onevent與addEventListener]] 講的是「把函式掛上去接事件」的語法坑（不能加小括號），第 5 節的 `signal.addEventListener('abort', fn)` 就是那個語法在 Fetch API 上的實際應用，兩篇是同一條規則的兩個現場。
> 　　[[02-useEffect的setup清理函式-return一個函式而不是執行它]] 則是同一件事在 React 的版本：useEffect 的清理函式裡呼叫 `controller.abort()`，正是第 5 節「元件卸載要取消請求」的標準寫法。
> 　　[[Day20-API呼叫永遠在賽跑-TanStack-Query怎麼管理遠端資料狀態]] 解釋為什麼你自己很少寫 AbortController——TanStack Query 已經把它包在內部了。

## 重點整理

### 1. pg `pool.query()` 回傳的結果物件
用 `pg`（Node.js PostgreSQL library）執行查詢後，回傳的是一個<mark class="b">結果物件 (Result)</mark>，常用屬性：

- <mark class="y">`rows`：查詢結果的資料列陣列（最常用）</mark>
- `rowCount`：影響／回傳的資料列總數
- `command`：執行的 SQL 指令（`'SELECT'`、`'INSERT'`…）
- `oid`：物件識別碼

```javascript
const result = await pool.query('SELECT id, name FROM users WHERE id < 3');
// result 長這樣：
// { rows:[{id:1,name:'張小華'},{id:2,name:'林小君'}], rowCount:2, command:'SELECT', oid:0 }

// 解構賦值：直接從物件取出需要的屬性
const { rows, rowCount, command } = result;
```

<mark class="p">`oid: 0` 是什麼？</mark> OID 是 PostgreSQL 早期用來識別資料庫物件的 4-byte 內部編號。像 `SELECT` 這種只讀查詢不會產生新物件，所以 `oid` 預設為 0。<mark class="v">現代開發幾乎用不到它，看到 0 不用理會，專注在 `rows` 就好。</mark>

### 2. API 回傳結構：扁平 vs 巢狀
`res.json({ data: users[0] })`（扁平）vs `res.json({ data: { user: users[0] } })`（巢狀）：

| 寫法 | 優點 | 缺點 |
|---|---|---|
| `data: users[0]`（扁平） | 前端 `response.data` 直接拿，最簡潔 | <mark class="r">語義不明確、未來難擴充（無法再塞 permissions／role）</mark> |
| `data: { user: ... }`（巢狀） | <mark class="g">語義清楚、命名一致（單數 user／複數 users）、易擴充</mark> | 前端多一層 `.user` |

<mark class="y">取捨核心：一致性／可擴充 ↔ 簡潔。功能單純就扁平避免過度設計；要留擴充彈性就巢狀。</mark>

### 3. Fetch vs Axios 核心差異
<mark class="b">fetch</mark>：瀏覽器原生、低階。回傳的 `response` 是**串流 (stream)**，資料還沒解析 → <mark class="r">必須手動 `await response.json()`</mark>；而且<mark class="r">只有網路層錯誤（斷網）才會 reject，收到 404／500 仍算成功，要自己檢查 `response.ok`。</mark>

<mark class="b">axios</mark>：高階函式庫，把 fetch 的麻煩都包好了：
- <mark class="g">自動解析 JSON，直接用 `response.data` 拿到物件</mark>
- <mark class="g">4xx／5xx 會自動 throw，可以直接在 `try...catch` 統一處理</mark>
- 攔截器 (interceptors)：全域自動加 Token、遇 401 自動導向登入
- 內建取消請求（fetch 要搭 `AbortController`）

```javascript
// fetch：手動解析
const res = await fetch(url);
if(!res.ok) throw new Error(res.status);   // 要自己判斷
const data = await res.json();

// axios：自動解析、自動丟錯
const res = await axios.get(url);
const data = res.data;
```

<mark class="r">陷阱：`data = response.data ?? response.json()` 不能通用！</mark> 因為 fetch 的 response 沒有 `.data`、axios 的 response 沒有 `.json()`。兩者都回 Promise，但 <mark class="y">resolve 後的物件結構不同：fetch 資料在物件「內部」要呼叫方法取；axios 資料已解析好放在 `.data`。</mark>`Promise.resolve()` 只是包一層外層 Promise 狀態，不會改變內層物件結構。

### 4. 不寫 `catch(error)` 會怎樣？
- <mark class="r">語法層面：`try` 一定要配 `catch` 或 `finally`，否則直接 SyntaxError 無法執行。</mark>
- <mark class="r">後端完全沒 try-catch：DB 斷線 → UnhandledPromiseRejection → 整台 Node 伺服器 crash。</mark>
- 後端有 catch 但忘了 `res.json()` 回應：<mark class="p">前端請求一直卡在 Pending，直到瀏覽器逾時，Loading 圈圈轉不停。</mark>
- 前端不 catch：axios 遇 500 自動 throw，程式中斷 → `setUsers()` 不會執行 → Loading 卡死、Console 一堆 `Uncaught (in promise)`。

<mark class="g">正確後端防禦寫法：</mark>
```javascript
try {
  const { rows } = await pool.query(sql);
  res.json({ data: rows });
} catch (error) {
  console.error(error);                              // 給工程師看的 log
  res.status(500).json({ status:'error', message:'伺服器內部錯誤' }); // 給前端的交代
}
```

<mark class="v">一句話：寫 catch 不是為了阻止錯誤發生，而是讓錯誤發生時能優雅收拾（後端回 500、前端跳提示），不至於整個系統瞬間崩潰。</mark>

### 5. 取消請求：AbortController 與 request.signal

(a) <mark style="background: #ADCCFFA6;">`AbortController` 是 Web API 提供的「中斷控制器」</mark>，用來主動終止一個或多個非同步操作（fetch 請求、事件監聽器都可以）
　　它採「發布—訂閱」結構，一個控制器身上只有兩個東西要記

| 成員 | 型別／身分 | 誰用它做什麼 |
|---|---|---|
| `controller.signal` | `AbortSignal` 物件（唯讀） | 你把它交給要被控制的非同步操作（`fetch(url, { signal })`）；瀏覽器底層的 Fetch 引擎會持續監聽它，並用 `signal.aborted`、`signal.reason` 記錄狀態與原因 |
| `controller.abort()` | 方法 | 你在任何時候呼叫它，相連的 signal 就觸發 `abort` 事件，通知所有訂閱者立刻停止 |

(b) 誰用什麼做什麼、產物拋給誰，一句話寫完：<mark style="background: #BBFABBA6;">你 `new AbortController()` 建立控制器 → 取出 `controller.signal` 交給 `fetch(url, { signal })` → fetch 把這個 signal 註冊給底層網路層監聽 → 你呼叫 `controller.abort()` 時 signal 發出 abort 事件 → fetch 的 Promise 以一個 `name === 'AbortError'` 的錯誤 reject → 你在 `catch` 裡分辨它是「使用者取消」還是「真的壞掉」</mark>

```javascript
// 1. 建立控制器實例
const controller = new AbortController();
const { signal } = controller;

// 2. 把 signal 帶進 fetch
fetch('/api/data', { signal })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('請求已成功被中斷');   // 這不是 bug，是你自己喊停的
    } else {
      console.error('其他錯誤：', err);
    }
  });

// 3. 使用者點取消、或逾時，就喊停
controller.abort();
```

(c) <mark style="background: #ADCCFFA6;">`request.signal` 屬於 Fetch API 這個 Web API 的唯讀屬性</mark>
　　Web API 指的是瀏覽器原生提供、讓 JavaScript 與瀏覽器底層互動的介面（`document`、`fetch`、`localStorage` 都是）
　　　　Fetch API 是其中專門處理 HTTP 請求的那一套規範
　　　　　　`Request` 物件代表一個 HTTP 請求，它身上的 `signal` 屬性型別就是 `AbortSignal`

(d) 監聽中斷事件時，<mark style="background: #FF5582A6;">第二個參數絕對不能加小括號</mark>——這正是 [[事件處理器vs事件監聽器-onevent與addEventListener]] 第二節那條規則的現場：

```javascript
// ✗ 錯：console.log 立刻就被執行，回傳值 undefined 才被拿去當監聽器
req.signal.addEventListener("abort", console.log("abort"));
// 等同於 req.signal.addEventListener("abort", undefined);

// ✓ 對：包成箭頭函式，把「執行」延後到 abort 真的發生時
req.signal.addEventListener("abort", () => { console.log("abort"); });

// ✓ 對：傳已定義好的函式名稱，後面不要加 ()
function handleAbort() { console.log("abort"); }
req.signal.addEventListener("abort", handleAbort);
```
> <mark style="background: #FFF3A3A6;">記法：加上 `()` 是「現在就跑」，不加或用 `() => {}` 包起來才是「把函式本身交出去，等你叫我」。</mark>

(e) 為什麼自己的專案幾乎沒寫過它，三個原因：

| 原因 | 誰幫你做掉了 | 實際發生什麼 |
|---|---|---|
| 用高階函式庫 | `axios` | axios 把取消機制包成自己的介面（早期 `CancelToken`、現在支援 `signal`），你不會直接碰到原生 `Request.signal` |
| 多數流程不需要中斷 | — | 常見流程是「按按鈕 → 送出 → 等回應」，沒有頻繁切頁或連點，讓它跑完就好 |
| 資料請求套件管生命週期 | React Query／TanStack Query、SWR、RTK Query | 元件卸載（Unmount）或重複請求時，套件內部自動呼叫 `controller.abort()`，你完全不用手寫 |

(f) <mark style="background: #FFF3A3A6;">什麼時候「一定會」自己寫它</mark>：

- 即時搜尋（Autocomplete／Typeahead）：使用者打 `a` 發出請求 1、打 `ab` 發出請求 2，若不取消請求 1，它晚回來時會<mark style="background: #FF5582A6;">用舊資料蓋掉新資料</mark>（Race Condition，競態條件）
- 切換頁面或分頁：A 頁載入大量資料時使用者跳去 B 頁，在 A 的元件銷毀時 abort，省流量也省渲染
- 請求逾時：<mark style="background: #ADCCFFA6;">原生 `fetch()` 本身沒有 timeout 選項</mark>，要用 `AbortController` 搭 `setTimeout` 自己做（現代瀏覽器另有現成的 `AbortSignal.timeout(ms)` 可直接用）
- 移除事件監聽器：`addEventListener(type, fn, { signal })` 之後，一次 `controller.abort()` 就能把一整批監聽器全部拔掉，比逐一 `removeEventListener` 乾淨

> [!warning] ⚠️ 存疑／補充
> Gemini 說「AbortController 是 JavaScript／Web API 提供的」需要講精確：<mark style="background: #FF5582A6;">它不是 ECMAScript（語言本身）的東西，而是 WHATWG DOM 規範定義的介面</mark>，由瀏覽器與 Node.js（v15+ 內建）各自實作。另外 Gemini 沒提到 <mark style="background: #BBFABBA6;">`AbortSignal.timeout(ms)`</mark> 與 <mark style="background: #BBFABBA6;">`AbortSignal.any([...])`</mark> 這兩個現成的靜態方法，實務上做逾時已經不必手寫 `setTimeout` 了。

## 各對話來源

### Axios 前後端使用指南（2026-06）— https://gemini.google.com/app/a6fe9c00516e0e84

**使用者：**

把 `pool.query()` 回傳的 rows／rowCount／command／oid 用程式碼寫給我看，並轉成可直接貼進 Obsidian 的 markdown。

**Gemini：**

`pool.query()` 回傳一個包含 `rows`、`rowCount`、`command`、`oid` 的結果物件，可用解構賦值取出需要的屬性：

```javascript
const result = await pool.query('SELECT id, name FROM users WHERE id < 3');
console.log(result);
// { rows:[{id:1,name:'張小華'},{id:2,name:'林小君'}], rowCount:2, command:'SELECT', oid:0 }
const { rows, rowCount, command } = result;
```

**使用者：**

oid: 0 是什麼？

**Gemini：**

OID 是 PostgreSQL 早期用來唯一識別資料庫物件的 4-byte 編號。SELECT 這種只讀查詢不會產生新物件，所以 oid 預設為 0；現代開發幾乎用不到，可忽略。

**使用者：**

為什麼要把 `data: { user: users[0] }` 改成 `data: users[0]`？（紅色是刪除、綠色是保留）

**Gemini：**

這是「扁平 vs 巢狀」的取捨。扁平（`data: users[0]`）讓前端 `response.data` 直接拿、最簡潔，但語義較不明確且未來難擴充；巢狀（`data: { user }`）語義清楚、命名一致、易擴充，但多一層 `.user`。功能單純傾向扁平（避免過度設計），要保留擴充彈性就用巢狀。

**使用者：**

那 axios 也是 response.json 嗎？可以寫 `data = response.data ?? response.json()` 嗎？

**Gemini：**

不行。fetch 是低階 API，response 是串流，要手動 `await response.json()`；axios 是高階函式庫，會自動解析 JSON 放在 `response.data`。兩者都回 Promise，但 resolve 後的物件結構不同：fetch 的 response 沒有 `.data`，axios 的 response 沒有 `.json()`，所以那個 `??` 寫法對任一個都會壞掉，專案要擇一貫徹。

axios 的額外便利：自動解析 JSON、4xx／5xx 自動 throw（fetch 要自己檢查 `response.ok`）、攔截器自動加 Token、內建取消請求。

**使用者：**

catch(error) 不寫會怎樣？

**Gemini：**

1) 語法：try 一定要配 catch 或 finally，否則 SyntaxError。
2) 後端沒 try-catch：DB 斷線觸發 UnhandledPromiseRejection，整台 Node crash。
3) 後端有 catch 但沒 `res.json()`：前端一直 Pending 到逾時，Loading 卡住。
4) 前端不 catch：axios 遇 500 自動 throw，後續 setState 不執行，畫面卡死、Console 滿是 Uncaught。

正確後端寫法是 catch 裡 `console.error(error)` + `res.status(500).json({...})`。寫 catch 是為了錯誤發生時能優雅收拾，而不是阻止錯誤。

### 為什麼監聽事件不能加括號／AbortController（2026-09-21 擷取）— https://gemini.google.com/app/90883576a7e3f228

**使用者：**

`req.signal.addEventListener("abort", () => { console.log("abort"); });` 這邊為何不直接寫 `req.signal.addEventListener("abort", console.log("abort"));`？

**Gemini：**

因為 `addEventListener` 的第二個參數需要傳入一個函式，這樣 JavaScript 才能在 abort 事件真正發生時呼叫它。直接寫 `console.log("abort")` 會有兩個問題：(1) 程式碼會立刻執行，JS 在執行這行時會先計算第二個參數的值，所以綁定當下就印出 "abort"；(2) `console.log()` 的回傳值是 `undefined`，實際等於 `req.signal.addEventListener("abort", undefined)`，事件真的觸發時沒有註冊到有效函式，什麼都不會發生。正確做法是用箭頭函式／匿名函式包起來，或直接傳入已定義好的函式名稱（後面不要加括號）。簡化記法：只要加上括號 `()`，JavaScript 就會立刻執行該函式；不加括號或用 `() => { ... }` 包起來，才是指定函式本身供未來觸發時呼叫。

**使用者：**

為何這個算是 Web API - fetch API signal property？AbortController 是什麼？

**Gemini：**

Web API 是瀏覽器提供的原生介面（`document`、`fetch`、`localStorage` 等），Fetch API 是其中專門處理 HTTP 請求的規範。在 Fetch API 中 `Request` 物件代表一個 HTTP 請求，`signal` 是它上面的唯讀屬性，型態為 `AbortSignal`；建立請求時傳入這個 signal，瀏覽器底層的 Fetch 引擎就會持續監聽該信號以便隨時中斷連線。AbortController 則是用來中斷一或多個非同步操作的控制器，採發布—訂閱概念，內含 `controller.signal`（信號發射／接收器，紀錄 `aborted` 與 `reason`）與 `controller.abort()`（中斷開關，呼叫後 signal 觸發 abort 事件通知所有監聽者停止）。常見場景是使用者快速打字時取消前一次搜尋請求避免 Race Condition、結合 setTimeout 做請求逾時、以及取消大型檔案上傳下載。

**使用者：**

為何我的專案都沒有用過這個？

**Gemini：**

三個原因：(1) 現代套件如 axios 把底層取消機制封裝掉了；(2) 多數專案沒有中斷請求的需求，點擊送出等結果即可；(3) React Query／SWR／RTK Query 這類資料獲取套件預設會在元件卸載或重複請求時自動觸發 `AbortController.abort()`。會需要自己寫的情境是即時搜尋（避免舊請求蓋掉新資料）、切換頁面時中止載入、以及原生 fetch 沒有 timeout 設定時搭配 setTimeout 自行實作逾時。

## 延伸練習

第 5 節在講的「把函式當值交出去、之後才被回呼」與「取消一個正在跑的非同步任務」，在 LeetCode 的 JavaScript 專區有直接對應的題目：

- [LeetCode 2715. Timeout Cancellation](https://leetcode.com/problems/timeout-cancellation/)：手寫一個可以取消的 `setTimeout`，觀念與 `controller.abort()` 一模一樣。
- [LeetCode 2637. Promise Time Limit](https://leetcode.com/problems/promise-time-limit/)：把「逾時就放棄」做出來，正是 (f) 說的 `fetch` 沒有 timeout 時要自己實作的那件事。
- [LeetCode 2721. Execute Asynchronous Functions in Parallel](https://leetcode.com/problems/execute-asynchronous-functions-in-parallel/)：練多個非同步任務的協調，對照 `AbortSignal.any([...])` 的用途。

> 相關：axios 在瀏覽器裡預設用 XMLHttpRequest 發請求，XHR 與 fetch、axios 的關係見 [[XMLHttpRequest-CORS-explanation]]。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文（Axios 前後端使用指南） | https://gemini.google.com/app/a6fe9c00516e0e84 | 對話日期 2026-06、整理日 2026-07-01 |
| Gemini 對話原文（addEventListener 不加括號與 AbortController） | https://gemini.google.com/app/90883576a7e3f228 | 對話日期 2026-09、整理日 2026-09-21 |
| MDN：AbortController | https://developer.mozilla.org/en-US/docs/Web/API/AbortController | 查證日 2026-09-21 |
| MDN：AbortSignal（含 `timeout()` 與 `any()` 靜態方法） | https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal | 查證日 2026-09-21 |
| MDN：Request.signal（Fetch API 唯讀屬性） | https://developer.mozilla.org/en-US/docs/Web/API/Request/signal | 查證日 2026-09-21 |
| WHATWG DOM 規範：AbortController 定義出處（非 ECMAScript） | https://dom.spec.whatwg.org/#interface-abortcontroller | Living Standard，查證日 2026-09-21 |
| Axios 取消請求（v1 以後使用 AbortController） | https://axios-http.com/docs/cancellation | 查證日 2026-09-21 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-21
