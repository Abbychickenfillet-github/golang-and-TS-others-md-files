---
title: "DOM 與 BOM 的物件化模型：window／document 階層、樹狀導覽屬性與 Property vs Attribute"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, dom, bom, window, document, tree-navigation, property, attribute, jquery]
aliases: [DOM與BOM物件化概念, DOM樹狀導覽, Property與Attribute差異]
related:
  - "[[window物件三種成員與滑鼠座標-client-screen-page-與innerHTML覆蓋陷阱]]"
  - "[[事件流與事件代理]]"
  - "[[textContent-innerText-innerHTML差異]]"
  - "[[createElement-動態建立元素]]"
  - "[[控制流與錯誤處理-區塊語句-falsy-switch貫穿-throw-try-catch-finally]]"
sources:
  - https://gemini.google.com/app/44ddcc15ba4120ea
  - https://gemini.google.com/app/a32d56dd37435b7c
updated: 2026-09-25
---

# DOM 與 BOM 的物件化模型

> 本篇重點 a–h，共 8 個。

> [!info] 與其他筆記的關聯（附理由）
> 1. 承接 [[window物件三種成員與滑鼠座標-client-screen-page-與innerHTML覆蓋陷阱]]：那篇專講 `window` 底下三種成員與滑鼠座標系統，本篇補上更上層的觀念——「為什麼瀏覽器要把頁面跟視窗都變成物件」，是那篇的前置概念。
> 2. 呼應 [[控制流與錯誤處理-區塊語句-falsy-switch貫穿-throw-try-catch-finally]] 的 (o)(p)(q)：`document.all` 之所以會被特許轉成 falsy，前提就是本篇 (a) 講的「`document` 是被物件化出來的 JS 物件」。

## 1. 為什麼瀏覽器要把頁面跟視窗「物件化」（a–b）

(a) <mark style="background: #ADCCFFA6;">JavaScript 引擎不能直接理解 HTML 原始碼或瀏覽器視窗本身</mark>，所以瀏覽器會把這些東西轉化成 JS 看得懂的物件結構，才能被程式碼讀取與修改。HTML 原始碼只是純文字（例如 `<button id="btn">按我</button>`），瀏覽器解析後會建立對應的 JS 物件，掛上屬性與方法，例如 `document.getElementById('btn')` 拿到的 `button` 物件可以直接讀 `button.textContent`、寫 `button.style.color = 'red'`。

(b) <mark style="background: #FFF3A3A6;">DOM（Document Object Model）管頁面內容，BOM（Browser Object Model）管瀏覽器視窗本身</mark>，兩者是不同層級的物件化結果：

```text
window   (BOM 頂層物件，代表瀏覽器本身)
└── document   (DOM 頂層物件，代表當前載入的 HTML 頁面)
    └── <html>
        └── <body>
            └── <button>   (頁面中的個別 HTML 元素物件)
```

DOM 部分：瀏覽器解析 HTML 時把每個標籤、文字、屬性都轉成一個個 JS 物件並組成樹狀結構（DOM Tree），根物件是 `document`。

BOM 部分：整個瀏覽器視窗（網址列、瀏覽歷史、螢幕解析度、視窗大小）被封裝成以 `window` 為頂層的物件，例如 `window.location`（網址，`window.location.href = '...'` 可轉址）、`window.history`（瀏覽歷史，`window.history.back()` 模擬上一頁）、`window.navigator`（使用者裝置與瀏覽器資訊）。

## 2. 樹狀導覽：原生 DOM 屬性 vs jQuery 方法（c–e）

(c) <mark style="background: #BBFABBA6;">「樹狀導覽（Tree Navigation）」屬性是 JavaScript 原生（Vanilla JS）的 DOM 屬性，不是 jQuery 專屬</mark>——`parentNode`、`childNodes`、`firstChild`、`lastChild`、`previousSibling`、`nextSibling` 全部是 DOM Level 1 標準就有的原生屬性。會覺得眼熟是因為 jQuery 本來就是為了封裝、簡化這些原生操作而設計的：

| 需求 | 原生 DOM 屬性 | jQuery 方法 |
|---|---|---|
| 找父節點 | `node.parentNode` | `$(node).parent()` |
| 找所有子節點 | `node.childNodes` | `$(node).children()` |
| 找第一個子節點 | `node.firstChild` | `$(node).children().first()` |
| 找最後一個子節點 | `node.lastChild` | `$(node).children().last()` |
| 找前一個兄弟節點 | `node.previousSibling` | `$(node).prev()` |
| 找後一個兄弟節點 | `node.nextSibling` | `$(node).next()` |

(d) <mark style="background: #FF5582A6;">原生 DOM 陷阱：`Node`（節點）包含文字節點、註解節點，不只有 `Element`（HTML 標籤）</mark>。用 `childNodes`／`firstChild` 存取時，換行與空格會被算成獨立的文字節點：

```html
<div id="parent">
  <p>Hello</p>
</div>
```

```js
const parent = document.getElementById('parent');
console.log(parent.firstChild);
// 拿到的不是 <p>！而是 <div> 與 <p> 之間的「換行＋空格」文字節點
```

(e) <mark style="background: #BBFABBA6;">解法是改用帶有 Element 字眼的現代屬性</mark>，只回傳真正的 HTML 元素、自動濾掉空白文字節點：`parentElement`、`children`（取代 `childNodes`）、`firstElementChild`（取代 `firstChild`）、`lastElementChild`（取代 `lastChild`）、`previousElementSibling`（取代 `previousSibling`）、`nextElementSibling`（取代 `nextSibling`）。這正是 jQuery 當年大受歡迎的原因之一——`$(node).children()` 自動濾空白，原生 DOM 後來才補上對應版本。

## 3. Property（屬性存取）vs Attribute（HTML 標籤屬性）（f–h）

(f) <mark style="background: #ADCCFFA6;">原生 DOM 提供大量「Property（屬性）」，意思就是可以用點記號 `.` 直接讀寫，不用加括號呼叫</mark>。Property 代表物件的狀態／資料（直接存取），Method（方法）代表物件的行為／動作（要加 `()` 呼叫執行）：

```js
// Property：直接讀寫，不加括號
const el = node.parentElement;
node.textContent = "Hello World";

// Method：要呼叫執行
node.appendChild(newChild);
document.getElementById("myId");
```

(g) 三類常見的可直接存取 Property：① 樹狀導覽（唯讀）如 `box.parentElement`、`box.children`、`box.nextElementSibling`；② 內容操作（可讀寫）如 `title.textContent = '新標題'`、`title.style.color = 'red'`；③ HTML 標籤屬性的直接映射（可讀寫）如 `img.src = '...'`、`input.value = '...'`、`input.disabled = true`。

(h) <mark style="background: #FFF3A3A6;">DOM Property 與 HTML Attribute 是兩個經常被混淆的概念</mark>：

| 概念 | 英文 | 存取方式 | 說明 |
|---|---|---|---|
| DOM 屬性 | Property | 直接存取（如 `element.className`） | 存在於 JS 物件記憶體中的變數，存取速度最快 |
| HTML 屬性 | Attribute | 透過方法（如 `element.getAttribute('class')`） | 寫在 HTML 原始碼裡的字串標籤 |

現代前端開發絕大多數情況都直接存取 DOM Property，既直覺又方便，只有在需要讀取「HTML 原始碼字面寫了什麼」時才會用 `getAttribute()`。

## 各對話來源（原文）

### DOM 與 BOM 的物件化概念（2026-09-25）— https://gemini.google.com/app/44ddcc15ba4120ea

**使用者：** 瀏覽器和頁面都可以用物件的方式建立模型是什麼意思？

**Gemini：** JavaScript 或瀏覽器本身不能直接理解 HTML 原始碼或瀏覽器視窗，因此瀏覽器會把這些東西「物件化」，讓程式碼可以讀取、修改它們。DOM 把頁面物件化成以 `document` 為頂層的樹狀結構；BOM 把整個瀏覽器視窗物件化成以 `window` 為頂層的物件，兩者階層關係是 `window → document → <html> → <body> → 個別元素`。

### JS 變數指派與記憶體運作（節錄：DOM 樹狀導覽與屬性存取部分）（2026-09-25）— https://gemini.google.com/app/a32d56dd37435b7c

**使用者：** 「樹狀導航（Tree Navigation）：提供遍歷節點樹的方法，例如 parentNode、childNodes、firstChild、lastChild、previousSibling、nextSibling」這不都是 jQuery 的方法嗎？

**Gemini：** 不是，這些是原生 DOM 屬性，jQuery 只是把它們封裝簡化。原生 DOM 的陷阱在於 `childNodes`／`firstChild` 會把換行空白算成文字節點，現代原生 DOM 另外提供了帶 Element 字眼的屬性（`children`、`firstElementChild`…）解決這個問題。

**使用者：** 原生 DOM 有提供屬性嗎？屬性的意思是直接存取嗎？

**Gemini：** 是的，DOM Property 就是可以用 `.` 直接讀寫的物件成員，不用加 `()`；並與 HTML Attribute（寫在原始碼裡的字串標籤，須用 `getAttribute()` 讀取）是兩個不同概念。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話 ① | https://gemini.google.com/app/44ddcc15ba4120ea | Gemini Flash，2026-09-25 擷取 |
| 本篇 Gemini 對話 ② | https://gemini.google.com/app/a32d56dd37435b7c | Gemini Flash，2026-09-25 擷取 |
| MDN — Document Object Model (DOM) | https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model | MDN 現行版本，2026-09-25 查證 |
| MDN — Node.firstChild / Element.firstElementChild | https://developer.mozilla.org/en-US/docs/Web/API/Node/firstChild | MDN 現行版本，2026-09-25 查證 |
| MDN — Properties vs Attributes | https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/DOM_scripting#properties_and_methods | MDN 現行版本，2026-09-25 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-25

> 相關：DOM 操作是同步的、但畫面更新延後到渲染步驟，以及 MutationObserver 的運作，見 [[JavaScript-Event Loop事件循環機制與閉包-面試核心]] 的 1-3。
