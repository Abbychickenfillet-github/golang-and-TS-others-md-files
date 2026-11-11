---
title: "Express 建立 http server 與 Socket.IO 的 CORS 設定"
date: 2026-10-11
tags: [express, socket.io, websocket, cors, react-markdown, 面試]
sources:
  - https://socket.io/docs/v4/handling-cors/
  - https://socket.io/docs/v4/server-initialization/
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
---

> 互動版（流程圖、填空、是非題、申論題）：[[express-http-server-socketio-cors-互動版.html]]
> 可執行範例：同資料夾 `server.js`
> 本篇重點 a–h，共 8 個

## 我當時問的問題（原文）

1. 把 `<pre>...{result?.raw}</pre>` 換成 `<ReactMarkdown remarkPlugins={[remarkGfm]}>{result?.raw}</ReactMarkdown>`，這是什麼
2. create http server 用 express 怎麼寫，我是用 express 還是啥，面試的時候怎麼講
3. `const io = require('socket.io'(http,{cors:{origin: "*"}}))` 這個寫法有比較好嗎
4. 我們要用 cors disabled 這樣安全嗎
5. WebSocket 算事件基系統嗎（just like websocket it's event base system）

## a. react-markdown 那一行在做什麼

[[react-markdown]]（把 Markdown 字串 render 成 React 元素的元件）本身不用 `dangerouslySetInnerHTML`，所以預設不會執行 Markdown 裡夾帶的 HTML。它內部流程是：unified 用 remark 把字串 parse 成 mdast（Markdown 語法樹）→ 外掛修改語法樹 → 轉成 hast（HTML 語法樹）→ 轉成 React 元素。

| 關鍵字 | 意思 | 跟底層觀念的關係 |
|---|---|---|
| `<ReactMarkdown>` | 一個 React 元件，children 吃 Markdown 字串 | 元件把字串變成 virtual DOM，React 只更新變動處 |
| `remarkPlugins` | prop，值是 remark 外掛陣列 | 外掛在「語法樹」階段改寫，不是直接改字串 |
| `remarkGfm` | 外掛，加入 GitHub Flavored Markdown：表格、刪除線、待辦清單、自動連結 | 沒裝它，`\| a \| b \|` 這種表格會被當純文字 |
| `{result?.raw}` | JSX 的運算式區塊，`?.` 是 optional chaining，`result` 為 null 時整段回 undefined 而不報錯 | JSX 的 `{}` 內放任何 JS 運算式 |
| `<pre>` 為什麼不行 | `<pre>` 只保留空白與換行，不理解 Markdown 語法 | 所以 Gemini 回的 `###` 與 `**` 會原樣顯示 |

## b. 用 express 建立 http server（逐行）

```js
const express = require('express')        // 載入 express 套件
const { createServer } = require('http')  // 載入 Node 內建的 http 模組，解構出 createServer
const app = express()                     // 建立 express 應用程式
const httpServer = createServer(app)      // 用 app 當請求處理器，建立真正的 http server
httpServer.listen(3000)                   // 讓 server 開始監聽 3000 埠
```

| 關鍵字 | 意思 | 底層關係 |
|---|---|---|
| `require` | CommonJS 載入模組的函式 | ESM 對應寫法是 `import` |
| `express()` | 回傳一個 `(req, res, next)` 函式 | 原始碼 `createApplication` 的 `app` 就是函式，再把 EventEmitter 與路由方法 mixin 進去 |
| `http.createServer(requestListener)` | 建立 `http.Server`，每個 HTTP 請求觸發一次 `request` 事件並呼叫 requestListener | 所以 `app` 能直接傳進去，因為簽名剛好吻合 |
| `app.listen(3000)` | 語法糖，原始碼是 `http.createServer(this).listen(...)` 並回傳該 server | 你拿不到「另外建的」那個 server 的把手就接不了 Socket.IO，除非用回傳值 |
| `listen(3000)` | 讓作業系統把 3000 埠的 TCP 連線交給此 server | 對應 socket 的 bind 與 listen 系統呼叫 |
| 埠號怎麼選 | 範圍 0 到 65535，這是十進位寫法，65535 是 2 的 16 次方減 1，因為埠號欄位是 16 位元無號整數，十六進位寫成 0xFFFF。「16 位元」是欄位大小，「十進位或十六進位」是寫法，兩回事。小於 1024 通常需要管理員權限，HTTP 預設 80，HTTPS 預設 443，開發慣例用 3000 或 8080，只要沒被佔用即可 | 正式環境用 `process.env.PORT`，由平台指定，不要寫死 |
| `httpServer` 這個名字 | 純慣例，改叫 `server` 或 `x` 都行 | 真正的原因是 `createServer` 回傳的是 `http.Server` 物件，而 `app` 只是請求處理函式，不是 server。`app.listen` 雖然存在，但它會另建一個 server，Socket.IO 就接不到 |

## c. 面試怎麼講

1. Express 是建在 Node 內建 `http` 模組之上的框架，`express()` 回傳的 `app` 是一個 `(req, res, next)` 函式
2. 我用 `http.createServer(app)` 明確拿到 `http.Server` 把手，因為 Socket.IO 要掛在同一個 server 上才能處理 WebSocket 的 upgrade
3. 這個專案（next-one）其實是 Next.js 的 Route Handler，沒有自己建 http server，Next 在內部幫我建好了。所以回答「我是用 express 還是啥」要說：本專案用 Next.js，Express 是我另外學的 Node 後端觀念

## d. `require('socket.io')(http, {...})` 有比較好嗎

| 寫法 | 狀態 |
|---|---|
| `require('socket.io'(http,{cors:{origin:"*"}}))` | 語法錯誤：括號位置錯，變成對字串 `'socket.io'` 當函式呼叫 |
| `require('socket.io')(http, {...})` | 舊寫法，官方 v4 文件不再示範，我沒查證它是否仍相容 |
| `const { Server } = require('socket.io')` 加 `new Server(httpServer, {...})` | 官方文件唯一示範的寫法，推薦用這個 |

官方文件還特別警告：這裡用 `app.listen(3000)` 不行，因為它會另外建一個新的 http server。

## e. `origin: "*"` 不是「CORS disabled」

1. CORS 是瀏覽器的 same-origin policy（同源政策）預設擋跨來源讀取，伺服器用 `Access-Control-Allow-Origin` 標頭「選擇性放寬」
2. <mark style="background: #FFF3A3A6;">`origin: "*"` 是放寬到「所有來源都可以讀」，不是關掉 CORS</mark>，<mark style="background: #FF5582A6;">關不掉，因為擋人的是瀏覽器不是伺服器</mark>
3. `*` 不能跟 `credentials` 一起用。credentials（憑證）不等於 Cookie，它是三樣東西的總稱：Cookie、HTTP 認證標頭（`Authorization`）、TLS 客戶端憑證，Cookie 只是其中一種
   更正我之前寫的「不能帶 Cookie」：簡單請求仍會帶著 Cookie 送出去，但伺服器若回 `Access-Control-Allow-Origin: *`，瀏覽器會把回應當網路錯誤，腳本讀不到。非簡單請求則是 preflight 階段就失敗，真正的請求根本不會送
   為什麼瀏覽器要這樣設計：若 `*` 加 credentials 被允許，任何網站的腳本都能借用訪客的登入狀態並讀到回應，等於把帳號資料交給所有人，所以規定伺服器必須「點名」它信任的那個來源
4. 這條規則只約束 `fetch` 與 XHR 這類受 CORS 管轄的請求，WebSocket 握手不在其中。WebSocket 不受 CORS 約束不代表不帶 Cookie，反而是相反：PortSwigger 的範例握手含 `Cookie: session=...`，所以只靠 Cookie 認證的 WebSocket 才會有跨站劫持問題

| 名詞 | 說明 |
|---|---|
| XHR（XMLHttpRequest） | 瀏覽器較舊的 HTTP 請求 API，用事件與回呼寫法（`onload`、`onerror`）。名字有 XML 是歷史包袱，MDN 寫明它可傳任何型別的資料。fetch 出現後新程式多半改用 fetch，兩者都受 CORS 管轄 |
| XHR 的真身（2026-10-11 瀏覽器實測） | `new XMLHttpRequest()` 之後 `readyState` 為 0（UNSENT），`open()` 後為 1（OPENED，還沒送出），之後依序觸發 2（HEADERS_RECEIVED）、3（LOADING）、4（DONE），每次變化都觸發 `onreadystatechange`，最後才觸發 `onload`。實例本身沒有自有屬性（`Object.keys` 為空），方法都在原型上：`open`、`send`、`abort`、`setRequestHeader`、`getResponseHeader`、`getAllResponseHeaders`、`overrideMimeType`。`withCredentials` 預設 `false`，相當於 fetch 的 `credentials` 開關 |
| 線路上的真身（curl 實測本專案 API） | 不管 XHR 或 fetch，送出的都是同樣的 HTTP 文字：`GET /api/ai/analyze-activities HTTP/1.1`、`Host: localhost:3001`、`Origin: http://localhost:3000`、`Cookie: ACCESS_TOKEN=demo`。F12 的 Network 分頁篩選 Fetch/XHR 就是看這些 |
| fetch | 新的 HTTP 請求 API，回傳 Promise。本專案 `AIAnalysisSection.js` 的 `fetch('/api/timelogs', { credentials: 'include' })` 就是它，`include` 讓瀏覽器把該網域已儲存的 Cookie 一起送出 |
| credentials（fetch 選項） | 「請求要不要附上憑證」的開關，三個值：`omit` 不帶、`same-origin` 只有同源才帶（預設）、`include` 跨來源也帶。它不是「有沒有設定 Cookie」，是「要不要把瀏覽器已存的 Cookie 附上」 |
| `Access-Control-Allow-Credentials: true` | 伺服器端的對應回應，意思是「我接受帶憑證的請求」 |
| `Authorization` 與 `Proxy-Authorization` | 都是請求標頭。前者寫給最終的目標伺服器（被擋時回 401），後者寫給中間的 proxy 代理伺服器（被擋時回 407 Proxy Authentication Required），MDN 標示它是 forbidden request header，網頁腳本不能自己設定 |
| credentials 的三樣是 OR 還是 AND | 是 OR，也就是「這個類別底下可能有哪幾種」，不要求同時出現。一次請求通常只用到其中一兩種：瀏覽器登入多半只有 Cookie，API 呼叫多半只有 `Authorization` 標頭，企業內網才會用 TLS 客戶端憑證。fetch 的 `credentials` 選項是「一個開關管三種」，不用逐一寫。完整定義與三個值見 [[2-Cookie隔離邊界與跨站請求安全-Origin-SameSite-CSRF-Token與Bearer]] 的 (h-2) |
| `Authorization` 的具體名字 | 值的格式是 `<auth-scheme> <credentials>`，scheme（驗證方案）常見 `Basic`（帳號密碼 Base64 編碼，可還原所以必須搭配 HTTPS）、`Bearer`（持有權杖就能通過，JWT 常用）、`Digest`、`Negotiate`。例如 `Authorization: Bearer eyJhbGciOi...`。給 proxy 的 `Proxy-Authorization` 格式相同。出處 MDN Proxy-Authorization，最後修改 2026-09-17 |
| TLS（Transport Layer Security，傳輸層安全性協定） | 加密與身分驗證的協定，前身是 SSL（Secure Sockets Layer）。HTTPS 就是 HTTP 跑在 TLS 上。TLS 客戶端憑證是客戶端在 TLS 握手時出示的憑證，用來證明「我是誰」，常見於企業內部服務 |

「`*` 加 credentials 回應被擋」的效果與原因：

1. 請求其實已經送出，伺服器已經處理完了（簡單請求不先 preflight），被擋的只是「腳本讀取回應」這一步。所以 CORS 擋不了 CSRF 這類「只管送出不管回應」的攻擊
2. `fetch()` 會 reject 一個 TypeError（Failed to fetch 之類），腳本拿不到任何內容
3. 為什麼要擋：假設 evil.com 的腳本執行 `fetch('https://bank.com/me', { credentials: 'include' })`，瀏覽器會附上 bank.com 的登入 Cookie，回應是你的個人化帳戶資料。若 bank.com 回 `Allow-Origin: *`，意思是任何網站都可讀，evil.com 就讀到你的資料。所以瀏覽器規定帶憑證時，伺服器必須點名來源（例如 `https://myapp.com`），不能用 `*`
4. 所以 `*` 是「誰都可以讀」，credentials 是「這份回應是依登入者客製的」，兩者合起來就是「誰都可以讀登入者的私人資料」，瀏覽器直接禁止

## f. 這樣安全嗎

| 情境 | 風險 |
|---|---|
| 公開資料與無需登入的即時廣播（例如公開聊天室） | 風險低，`*` 可接受 |
| 靠 Cookie 認證 | `*` 加 credentials 瀏覽器不讓過，但若為了解決而改成「反射 Origin」就等於任何網站都能借用使用者登入狀態，屬於跨站 WebSocket 劫持 |
| 以為 CORS 能擋壞人 | 錯，CORS 只管瀏覽器，攻擊者用腳本或原生程式直連根本不受影響 |

用了 WebSocket，登入方式要改嗎：不一定。本專案的 JWT 放在 `ACCESS_TOKEN` Cookie，只要 WebSocket server 與網站同網域，握手就會自動帶上它，可以沿用，但必須搭配 Origin 檢查。若改用 token，瀏覽器的 `new WebSocket(url, protocols)` 建構子沒有參數能設定 `Authorization` 標頭（MDN 該頁未明講，這是一般知識，查證時未在頁面看到），常見做法如下：

| 做法 | 說明 | 注意 |
|---|---|---|
| Cookie | 握手自動附上 | 要防跨站劫持，檢查 Origin |
| URL 帶 token | `wss://host/ws?token=...` | 會進伺服器與代理的日誌，用短效 token |
| 連線後第一則訊息送 token | 伺服器驗證通過才處理其他訊息 | 驗證前的連線要限時 |
| Socket.IO 的 `auth` 選項 | 客戶端 `io({ auth: { token } })`，伺服器在 `io.use` 讀 `socket.handshake.auth.token`，不合法就 `next(new Error('invalid'))`，客戶端收到 `connect_error` | 官方文件有示範，記得每條路徑都要呼叫 `next()` |

原生 App 登入有沒有 Cookie：App 不是瀏覽器，沒有「自動附上 Cookie」的機制，常見做法是把 access token 存進系統安全儲存（iOS Keychain 或 Android Keystore）再放進 `Authorization` 標頭。至於 HTTP 函式庫會不會自己存 Cookie，各平台不同，我這次沒有查證，不下結論。內嵌網頁的 WebView 則是瀏覽器，會有 Cookie。

重點：WebSocket 連線本身不受 CORS 約束，CORS 設定只對 HTTP long-polling 生效。要擋來源要用 `allowRequest` 在握手時自己檢查 `Origin` 標頭，並且真正的授權要靠登入驗證。範例見 `server.js`。相關觀念見 [[2-Cookie隔離邊界與跨站請求安全-Origin-SameSite-CSRF-Token與Bearer]]、[[9-CSRF-與-Antiforgery-Cookie]]、[[HTTP-Headers-Request與Response-誰送給誰]]。

## g. WebSocket 算事件基系統嗎

答：分兩層看，協定不是，程式介面是事件驅動。

| 層級 | 是不是事件基 | 說明 |
|---|---|---|
| WebSocket 協定 | 否 | 在一條 TCP 連線上雙向傳「訊息（frame）」，沒有「事件名稱」這個概念 |
| 瀏覽器 WebSocket API | 是（事件驅動寫法） | 收到訊息時瀏覽器派發 `MessageEvent` 給你的 `onmessage`，關閉時派 `CloseEvent` |
| Socket.IO | 是（具名事件） | 在 Engine.IO 之上加 `emit('chat', data)` 與 `on('chat', fn)`，還有 ack、rooms、自動重連 |

Socket.IO 官方介紹原文是 "Socket.IO is NOT a WebSocket implementation"：它每個封包都多加了自己的中繼資料，所以原生 WebSocket 客戶端連不上 Socket.IO 伺服器，Socket.IO 客戶端也連不上純 WebSocket 伺服器。WebSocket 只是它可選的傳輸之一，另外還有 HTTP long-polling。

為什麼 `cors` 設定要管 long-polling：long-polling 就是普通的 HTTP 請求（長時間掛著的 GET 接收資料，短 POST 送資料），由瀏覽器的 fetch 或 XHR 發出，所以受 CORS 管轄，伺服器要回 `Access-Control-*` 標頭。Socket.IO 客戶端預設先用 long-polling 建立連線再升級成 WebSocket，所以第一步就需要 CORS 標頭，沒設就連不上。升級後的 WebSocket 連線才不受 CORS 約束。

| 問題 | 答案 | 出處 |
|---|---|---|
| long-polling 的 GET 多久一次 | 不是固定幾秒一次，而是請求掛著等到伺服器有資料或心跳時間到才回應。Socket.IO 心跳預設 `pingInterval` 25000 毫秒（伺服器每 25 秒送一次 ping）加 `pingTimeout` 20000 毫秒（等 pong 的上限）。「有資料就立刻回應再發下一個 GET」是 long-polling 的一般運作方式，官方頁面沒逐字寫 | Socket.IO server-options，更新 2026-10-09 |
| 一定要寫 `cors: "*"` 嗎 | 不用。三種情況：a. 網頁與 Socket.IO 同網域，不需要 CORS。b. 跨網域就列明確白名單。c. 客戶端設 `transports: ["websocket"]` 直接跳過 long-polling，官方文件說此時 CORS 設定只有在 WebSocket 失敗時才會被驗證，且不需要 sticky sessions | Socket.IO client-options，更新 2026-10-09 |
| 「中繼資料」是什麼 | 不是「bytes 的位置」，而是每個封包前面多加的描述欄位：封包類型、namespace、ack 編號。文字編碼順序是：封包類型、二進位附件數、namespace、ack id、JSON 本文 | Socket.IO protocol，更新 2026-10-06 |

中繼資料的實際長相（來源同上，WebSocket 線路上看到的文字）：

| 線路上的文字 | 拆解 |
|---|---|
| `42["hello","world"]` | `4` 是 Engine.IO 的 message 類型，`2` 是 Socket.IO 的 EVENT 類型，後面是 JSON 陣列，第一項是事件名稱 `hello`，其餘是參數 |
| `2/admin,["bar"]` | 同樣是 EVENT，但 namespace 為 `/admin`，主 namespace `/` 省略不寫 |
| `212["foo"]` | EVENT 加 ack id 12，對方用 `312[...]` 的 ACK 封包回覆 |
| `40` 與 `40{"sid":"..."}` | 客戶端連 namespace 與伺服器回覆 session id |

這就是為什麼原生 WebSocket 客戶端連不上 Socket.IO：它收到的是 `42["chat","hi"]` 而不是 `chat hi`，看不懂前綴。

你的 gurulaptop 有用 Socket.IO 嗎：後端沒有，用的是原生 `ws` 套件，`backend/bin/www.js` 正是本篇的標準寫法，`http.createServer(app)` 拿到 `server`，再呼叫 `initializeWebSocket(server)`，最後 `server.listen(port)`。前端 `package.json` 列了 `socket.io-client ^4.8.1`，但我 grep 不到任何 import，應該是裝了沒用。你記得的「那種寫法」很可能是 `ws.onopen`、`ws.onmessage` 加自訂訊息 `{ type: 'register', userID }`，這是用 `type` 欄位手工模擬具名事件，Socket.IO 則是 `emit('register', userID)` 內建。

LINE 與 Discord 是不是 `origin: "*"`：我查不到它們的伺服器設定，不能亂答。可以確定的是：原生 App 不是瀏覽器，不受 CORS 約束，連線身分靠登入 token 驗證而不是靠 Origin，所以不需要靠 CORS 設定來開放或封閉。

## h. 還沒做的

| 項目 | 原因 |
|---|---|
| F12 Network 的 WS 分頁截圖 | 需要先跑起 `server.js` 與一個前端頁面才有東西可截，下次可補 |
| LeetCode 或 NeetCode 題目連結 | 本篇是後端網路觀念，沒有對應演算法題 |

## 資料來源（含查證時間）

| 主題 | 連結 | 版本或時間 |
|---|---|---|
| Socket.IO 處理 CORS | [handling-cors](https://socket.io/docs/v4/handling-cors/) | 頁面標示更新 2026-10-06，查證 2026-10-11 |
| Socket.IO 初始化（Express 範例與 app.listen 警告） | [server-initialization](https://socket.io/docs/v4/server-initialization/) | 頁面標示更新 2026-10-06，查證 2026-10-11 |
| Socket.IO 運作原理（Engine.IO 與傳輸） | [how-it-works](https://socket.io/docs/v4/how-it-works/) | 頁面標示更新 2026-10-06，查證 2026-10-11 |
| MDN CORS | [HTTP CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) | 頁面標示最後修改 2026-09-04，查證 2026-10-11 |
| MDN WebSocket API | [WebSockets_API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) | 頁面標示最後修改 2026-09-12，查證 2026-10-11 |
| Socket.IO 官方介紹（NOT a WebSocket implementation） | [socket.io/docs/v4](https://socket.io/docs/v4/) | 頁面標示更新 2026-10-06，查證 2026-10-11 |
| MDN Fetch 的 credentials 定義 | [Using_Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) | 頁面標示最後修改 2025-08-20，查證 2026-10-11 |
| 跨站 WebSocket 劫持 | [PortSwigger CSWSH](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking) | 頁面無發佈日期，查證 2026-10-11，該頁未明講瀏覽器自動帶 Cookie 這條規則，是從範例握手推得，也未提 Origin 檢查 |
| Proxy-Authorization 標頭 | [MDN Proxy-Authorization](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Proxy-Authorization) | 頁面標示最後修改 2026-09-17，查證 2026-10-11（與 Authorization 的對照表是該頁轉述的一般知識） |
| XMLHttpRequest | [MDN XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) | 頁面標示最後修改 2026-05-09，查證 2026-10-11（該頁未明講建議改用 fetch，「新程式多用 fetch」是一般知識） |
| WebSocket 建構子參數 | [MDN WebSocket()](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) | 頁面標示最後修改 2026-06-22，查證 2026-10-11（該頁未討論自訂標頭） |
| Socket.IO 認證與中介層 | [middlewares](https://socket.io/docs/v4/middlewares/) | 頁面標示更新 2026-10-06，查證 2026-10-11 |
| Socket.IO server-options（pingInterval 與 pingTimeout 預設值） | [server-options](https://socket.io/docs/v4/server-options/) | 頁面標示更新 2026-10-09，查證 2026-10-11 |
| Socket.IO client-options（transports 與 withCredentials） | [client-options](https://socket.io/docs/v4/client-options/) | 頁面標示更新 2026-10-09，查證 2026-10-11 |
| Socket.IO 封包協定（42 前綴與封包類型） | [socket-io-protocol](https://socket.io/docs/v4/socket-io-protocol/) | 頁面標示更新 2026-10-06，查證 2026-10-11 |
| 本機實測：XHR 物件與原始 HTTP 請求 | 本專案 `localhost:3001` 與瀏覽器窗格 | 實測 2026-10-11 |
| react-markdown 用法 | [remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) | README 未標版本，文中提到 v10 系列，查證 2026-10-11 |
| Express `app.listen` 與 `createApplication` | [application.js](https://raw.githubusercontent.com/expressjs/express/4.x/lib/application.js) 與 [express.js](https://raw.githubusercontent.com/expressjs/express/4.x/lib/express.js) | Express 4.x 分支原始碼，已直接對照，查證 2026-10-11 |

存疑標註：Socket.IO 的 `allowRequest` 是否同時套用在 WebSocket upgrade 請求，我只從 handling-cors 文件讀到「用它限制誰能連」，沒有逐行驗證原始碼，使用前建議實測一次。
