---
title: "textContent、innerText、innerHTML 三者差異"
type: topic-note
tags: [dom, javascript, property, web-api, textContent, innerText, innerHTML, xss]
related:
  - "[[字面量-關鍵字-識別碼基礎]]"
  - "[[JavaScript-字串方法]]"
updated: 2026-07-26
---

# `textContent`、`innerText`、`innerHTML` 三者差異

## 先回答：這三個算「JavaScript 屬性」還是「API」？—— 兩個都對，但要分清楚是哪一層

**語法上、寫法上，這三個都是屬性（property）**——判斷依據跟 [[JavaScript-字串方法]] 那篇 `.length` 的判斷一樣：**不用加括號 `()`**，直接讀寫：

```js
el.textContent       // 讀，沒有括號
el.textContent = "x" // 寫，直接賦值
```

但**它們不是「JavaScript 語言本身」的屬性，而是「DOM API（Web API）」的屬性**——這是很重要的分層：

| 層次 | 誰定義 | 例子 |
|---|---|---|
| **JavaScript／ECMAScript 語言本身** | TC39 委員會的 ECMA-262 規格 | `Array.prototype.length`、`String.prototype.length`、`Object`、`Promise`、閉包、`let`/`const` |
| **DOM API（Web API 的一種）** | WHATWG DOM 規格 / W3C，是瀏覽器提供給 JS 呼叫的「宿主環境」功能，不屬於 JS 語言核心 | `document.querySelector`、`el.textContent`、`el.innerHTML`、`el.addEventListener` |

`textContent`／`innerText`／`innerHTML` 都屬於**第二種**：它們是掛在 DOM 節點介面（`Node`、`HTMLElement`、`Element`）原型鏈上的**存取器屬性（accessor property，也就是 getter/setter）**，由瀏覽器（宿主環境）實作、透過 JS 語法暴露給你用，**不是**寫在 ECMAScript 規格書裡的東西——就像 [[JavaScript-字串方法]] 提到的字串方法是 `String.prototype`（JS 語言核心）提供的，這三個則是 `Node.prototype`/`HTMLElement.prototype`/`Element.prototype`（DOM API）提供的，兩者是不同規格書、不同標準組織訂的。

## 三者對照表

| | `textContent` | `innerText` | `innerHTML` |
|---|---|---|---|
| **所在介面** | `Node.prototype`（**所有節點**都有，包括文字節點、註解節點） | `HTMLElement.prototype`（只有**元素**節點才有） | `Element.prototype`（元素節點） |
| **內容型態** | 純文字 | 純文字 | **HTML 字串**（含標籤） |
| **是否感知 CSS／渲染結果** | ❌ 不感知——回傳原始文字內容，連 `display:none` 隱藏的內容、`<script>`/`<style>` 裡的文字都算進去 | ✅ 感知——只回傳「畫面上使用者看得到」的文字，會排除 `display:none` 的內容，並依渲染結果加上換行 | 不是文字概念，是**結構**（標籤） |
| **讀取效能** | 快，不需要計算樣式 | **慢**——讀取當下會**觸發 reflow（重排）**，因為要先算出畫面實際渲染結果才知道哪些文字看得到 | 中等，需要把 DOM 結構序列化成字串 |
| **設定時會不會解析 HTML** | ❌ 不會，字串裡就算寫 `<b>` 這種標籤，也是當**純文字**塞進去顯示（安全） | ❌ 不會，同樣當純文字（安全） | ✅ **會**，字串會被瀏覽器的 HTML 解析器解析、重建成真正的 DOM 節點 |
| **XSS 風險** | 安全，永遠不會把使用者輸入當成 HTML 執行 | 安全 | **危險**——把未經過濾的使用者輸入塞進 `innerHTML`，是經典的 XSS 注入手法（例如 `<img src=x onerror="惡意程式">`） |
| **標準化狀態** | 標準 DOM API（`Node` 介面） | 原本是 **IE 專屬的非標準屬性**，因為各瀏覽器都跟進實作，後來才被納入 CSSOM View 規格補上標準 | 標準（HTML Parsing 規格的一部分，定義在 `Element` 介面上） |

## 實例

```html
<div id="box" style="text-transform: uppercase;">
  Hello <span style="display:none;">Secret</span> World
</div>
```

```js
const box = document.getElementById('box');

box.textContent
// "\n  Hello Secret World\n"
// ← 連 display:none 的 "Secret" 都拿得到，保留原始換行/縮排，也不管 CSS 的大寫轉換

box.innerText
// "HELLO WORLD"
// ← 排除 display:none 的 "Secret"，套用 text-transform 變成大寫，空白會被整理成渲染後的樣子

box.innerHTML
// '\n  Hello <span style="display:none;">Secret</span> World\n'
// ← 回傳完整 HTML 標籤字串，不是單純文字
```

## 該用哪一個？實務建議

- **只要處理純文字、不需要感知畫面渲染結果** → 用 **`textContent`**：最快、最安全，也是唯一能用在所有節點類型（不只是元素）上的。
- **需要「使用者眼睛實際看到的文字」**（例如做「複製這段可見文字」功能）→ 用 **`innerText`**，但要接受它會觸發 reflow、效能較差，且历史上跨瀏覽器行為曾有落差（現在已標準化，差異變小）。
- **真的需要塞入/讀取 HTML 標籤結構** → 用 **`innerHTML`**，但**絕對不要把未經過濾/未消毒（sanitize）的使用者輸入直接塞進去**，否則就是 XSS 漏洞；要嘛先用 DOMPurify 之類的函式庫清洗過，要嘛改用 `textContent` + 手動組 DOM 節點。

## 相關筆記
- [[JavaScript-字串方法]] —— 屬性 vs 方法的判斷依據（`.length` 案例）、Autoboxing
- [[字面量-關鍵字-識別碼基礎]] —— identifier vs property 的層次區分
- [[事件流與事件代理]]（DOM 資料夾）—— 同屬 DOM API 的另一組常考主題
