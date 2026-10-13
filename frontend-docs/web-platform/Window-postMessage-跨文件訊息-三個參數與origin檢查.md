---
title: Window.postMessage（跨文件訊息）：怎麼傳、怎麼收、三個參數各是什麼、為什麼一定要檢查 origin
type: topic-note
tags: [postMessage, cross-document-messaging, iframe, origin, XSS, addEventListener, web-messaging]
updated: 2026-10-13
---

# Window.postMessage（跨文件訊息）

本篇重點 a–f，共 6 個。

## a. 為什麼需要它：瀏覽器預設不讓不同網域的文件互相影響

HTML 規格開頭的第一句：「Web browsers, for security and privacy reasons, prevent documents in different domains from affecting each other」，也就是不同網域的文件預設不能互相存取，跨站腳本是被禁止的。這是重要的安全特性，但有時候兩個不同來源的頁面確實需要合作（例如頁面裡嵌了別人的 iframe），`postMessage` 就是規格設計出來的「受控的溝通管道」：訊息傳得過去，但不會讓對方直接碰到你的 DOM 與變數。

## b. 流程：誰呼叫誰、事件發生在哪

規格的情境：文件 A 裡有一個 `iframe`，iframe 裡是文件 B。

| 步驟 | 誰做 | 做什麼 |
|------|------|--------|
| 1 | 文件 A 的腳本 | 對「文件 B 的 Window 物件」呼叫 `postMessage()` |
| 2 | 瀏覽器 | 在文件 B 的 Window 物件上觸發 `message` 事件，並標記這個訊息來自文件 A 的 Window |
| 3 | 文件 B 的腳本 | 先用 `addEventListener()` 註冊過 `message` 的處理函式，才收得到 |

重點：<mark style="background: #FFF3A3A6;">`postMessage` 是 Window 物件的方法，不是 document 的方法</mark>。每個文件都有一個對應的 Window 物件，所以是「對 B 的 Window 呼叫」，`message` 事件也是在 B 的 Window 上觸發。

## c. 規格範例（逐行對照）

```javascript
// 文件 A（寄件方）
var o = document.getElementsByTagName('iframe')[0];
o.contentWindow.postMessage('Hello world', 'https://b.example.org/');
```

`o.contentWindow` 就是 iframe 裡文件 B 的 Window 物件，所以這行是「對 B 的 Window 呼叫 postMessage」。

```javascript
// 文件 B（收件方）
window.addEventListener('message', receiver, false);
function receiver(e) {
  if (e.origin == 'https://example.com') {
    if (e.data == 'Hello world') {
      e.source.postMessage('Hello', e.origin);
    } else {
      alert(e.data);
    }
  }
}
```

（以上兩段程式碼取自 HTML 規格 Web messaging 的簡介。規格範例裡寄件方寫的目標是 `b.example.org`、收件方檢查的是 `example.com`，兩個網址在規格裡就不同，閱讀時當作示意即可，實務上兩邊要對得起來。）

## d. `addEventListener('message', receiver, false)` 的三個參數

| 位置 | 範例中的值 | 意思 |
|------|-----------|------|
| 第 1 個：`type` | `'message'` | 要監聽的事件類型，字串，區分大小寫 |
| 第 2 個：`listener` | `receiver` | 事件發生時被呼叫的函式（傳函式本身，不加括號；也可以是有 `handleEvent()` 方法的物件） |
| 第 3 個：`useCapture`（或 `options` 物件） | `false` | 要不要在「捕獲階段」就處理；沒寫時預設就是 `false`。也可以改傳物件，如 `{ once: true, signal }`，詳見 [[事件流與事件代理]] 與 [[事件處理器vs事件監聽器-onevent與addEventListener]] |

MDN 沒有用一句話解釋 `false` 代表什麼，只說明了預設值是 `false`，以及「正在向上冒泡的事件不會觸發指定使用捕獲的監聽器」，所以 `false` 的意思是這個監聽器不在捕獲階段處理。

## e. `postMessage` 自己的參數（寄件方）

| 位置 | 名稱 | 意思 |
|------|------|------|
| 第 1 個 | `message` | 要傳的資料，用結構化複製（structured clone）處理，所以多數物件可以直接傳，不用自己轉字串 |
| 第 2 個（可省略） | `targetOrigin` | 收件視窗「必須是這個 origin」才會收到，協定、主機、埠要完全相符；省略時預設為 `"/"`（和呼叫者同源）；`*` 代表任何 origin 都能收 |
| 第 3 個（可省略） | `transfer` | 可轉移（transferable）物件的陣列，所有權交給收件方，寄件方就不能再用 |

也可以改傳 `postMessage(message, options)`，`options` 裡放 `targetOrigin` 與 `transfer`。

收件方的 `message` 事件物件有三個重要欄位：

| 欄位 | 意思 |
|------|------|
| `data` | 對方傳來的資料 |
| `origin` | 寄件視窗在呼叫 `postMessage` 當下的 origin（如 `https://example.org`） |
| `source` | 寄件視窗的 `window` 參考，可以用它回傳訊息，建立雙向溝通 |

## f. 安全：兩端都要把關

| 方向 | 規則 | 為什麼 |
|------|------|--------|
| 寄件方 | `targetOrigin` 一律寫明確的 origin，不要用 `*` | 惡意網站可以在你不知情時改掉視窗的位置，用 `*` 會讓資料被攔截 |
| 收件方 | 先檢查 `event.origin`（必要時也檢查 `source`），再檢查資料格式 | 任何視窗都能對 iframe 階層中的其他視窗送訊息；沒檢查 `origin` 會造成跨站腳本攻擊 |
| 收件方 | 不預期收到其他網站的訊息，就乾脆不要加 `message` 監聽器 | MDN 稱這是「完全可靠」的避免方式 |

## 和 Worker 的 `postMessage` 的關係

兩者是同名但不同的方法：`window.postMessage` 在視窗與 iframe 之間（所以有 `targetOrigin` 要設定）；Worker 與主執行緒之間用的是 Worker 物件上的 `postMessage` 與 `onmessage`，不需要 `targetOrigin`。資料在兩種情況下都是複製，不是共用。Worker 那一側的細節與在 Event Loop 裡如何排隊（訊息會變成接收方的一個巨任務）見 [[事件循環-Event-Loop-微任務與巨任務]]，iframe 的安全沙盒見 [[iframe-模擬網址列與Sandbox-Top-Navigation]]。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|------|------|-----------|
| 簡介、iframe 情境、範例程式碼、`addEventListener` 註冊方式 | https://html.spec.whatwg.org/multipage/web-messaging.html | HTML Living Standard，2026-10-13 查證 |
| `postMessage` 語法與參數、`message` 事件的 `data`／`origin`／`source`、安全注意事項 | https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage | MDN，2026-10-13 查證 |
| `addEventListener` 語法與 `type`／`listener`／`options`／`useCapture` | https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener | MDN，2026-10-13 查證 |

> 查證方式：用 WebFetch 擷取上列頁面並比對原文；擷取工具有摘要成分，引文請以原頁為準。
