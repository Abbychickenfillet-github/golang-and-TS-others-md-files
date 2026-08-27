---
title: JSON 的設計由來 — Notation 的意思、reviver 函式與 Whitespace 規範
type: topic-note
source: Gemini
tags: [gemini, javascript, json, json-parse, reviver, 排版引擎]
sources:
  - https://gemini.google.com/app/e3ae7e8de2295cab
  - https://gemini.google.com/app/52460f79bd7ab146
updated: 2026-08-27
---

# JSON 的設計由來 — Notation 的意思、reviver 函式與 Whitespace 規範

本篇重點 a–n，共 14 個

## 重點整理

### 一、名字的由來（因果順序常被弄反）

a. <mark style="background: #FF5582;">常見誤解</mark>：以為叫 JSON（JavaScript Object Notation）是因為「轉換出來的東西是 JS 物件」。<mark style="background: #BBFABB;">正確順序剛好相反</mark>：是因為這套資料格式的「寫法」長得跟 JavaScript 的物件實字（Object Literal）一模一樣，所以才用這個名字。

b. <mark style="background: #ADCCFF;">Notation</mark> 的意思是「記號法／表示法」，它指的是一種純文字的記錄格式，而不是指轉換之後產生的那個程式物件。

c. JSON 的發明人 <mark style="background: #FFB8EB;">Douglas Crockford</mark> 想找一種比 XML 更輕量好讀的純文字格式來傳資料，他發現 JavaScript 寫物件的方式（`{ "key": "value" }`）非常簡潔，就直接拿 JS 的物件語法當成資料格式標準。

d. <mark style="background: #FFF3A3;">JSON 被創造出來的本質，就是一種「專為解析（Parsing）與傳送而生的資料交換標準格式」</mark>。核心痛點是：JavaScript 的記憶體物件、Python 的 dict、Java 的 Object 結構都不一樣，沒辦法直接經由網路互傳，資料必須先變成純文字（String）才能傳輸。

e. Crockford 的巧思在於：既然這套純文字規範剛好等於 JavaScript 的物件實字語法，那在 JS 裡解析它就完全不必寫複雜的剖析器（Parser），直接 parse 就搞定。

f. 因為語法極度簡化（只有 Object、Array、String、Number、Boolean、Null 六種結構），幾乎所有語言（Python、Java、C#、Go）都能用很少的程式碼把它轉成自己語言內部的資料結構。

### 二、Whitespace（空白字元）在 JSON 規範裡的地位

g. <mark style="background: #ADCCFF;">Whitespace</mark> 在語法圖（Syntax Diagram）與 JSON／JavaScript 規範中指的是「空白字元」，用來分隔資料元素、提升可讀性。JSON 中認可的 whitespace 有四種：空格（Space）、製表符（Horizontal Tab，`\t`）、換行符（Line Feed，`\n`）、回車符（Carriage Return，`\r`）。

h. <mark style="background: #BBFABB;">不影響解析</mark>：解析器讀取 JSON 的 value 時會自動忽略這些空白字元。

i. <mark style="background: #BBFABB;">位置彈性</mark>：可以自由在 `{}`、`[]`、`:` 或逗號周圍加上空格或換行（例如美化縮排），資料的結構與內容完全不會改變。這就是為什麼 `JSON.stringify(obj, null, 2)` 加了縮排之後，`JSON.parse` 回來的結果一模一樣。

### 三、JSON.parse 的第二個參數 reviver

j. <mark style="background: #FFF3A3;">`JSON.parse(text, reviver)` 的 reviver 同時具備「過濾」與「修改」雙重功能</mark>。解析器會從最內層的屬性開始，逐一把每個屬性的鍵（key）與值（value）丟進 reviver 處理。

k. 三種回傳行為：
   - <mark style="background: #FF5582;">過濾（刪除）</mark>：回傳 `undefined`（或沒寫回傳值），該屬性就會從最終結果中被刪掉。
   - <mark style="background: #BBFABB;">修改（轉換）</mark>：回傳其他值，該屬性就被新值覆蓋（例如把數字乘以 2，或把 ISO 字串轉成 Date 物件）。
   - <mark style="background: #BBFABB;">保留</mark>：不想動它就必須原封不動 `return v`。

l. <mark style="background: #FF5582;">最容易搞混的一點</mark>：reviver 的參數是 `(k, v)`，`k` 是「鍵名稱」、`v` 是「值」，不是「檢查 key 是不是等於 k」。

```javascript
JSON.parse('{"p": 5}', function (k, v) {
  if (typeof v === "number") {
    return v * 2;   // 值是數字就乘以 2
  }
  return v;         // 其他狀況原封不動回傳
});
```

m. <mark style="background: #FFB8EB;">執行順序（由內而外）</mark>：
   - 第一步（處理內部屬性）：`k` 傳入 `"p"`，`v` 傳入 `5`，`typeof 5 === "number"` 成立，回傳 `5 * 2 = 10`，此時屬性 `p` 的值變成 10。
   - 第二步（處理最外層物件本身）：`k` 傳入 `""`（空字串代表頂層物件），`v` 傳入已被修改過的物件 `{ p: 10 }`，`typeof` 是 `"object"` 不是 `"number"`，走 `return v` 原封不動回傳。
   - 最終結果是 `{ p: 10 }`。

### 四、順帶釐清：Gecko、Blink、WebKit 是什麼

n. <mark style="background: #ADCCFF;">排版引擎（Layout Engine／Rendering Engine）</mark>負責把 HTML、CSS、JavaScript 的程式碼「畫」成螢幕上看到的畫面並處理互動。三大引擎：
   - <mark style="background: #ADCCFF;">Gecko</mark>：Mozilla 基金會開發，用於 Firefox，搭配的 JS 引擎是 SpiderMonkey。
   - <mark style="background: #ADCCFF;">Blink</mark>：Google 主導（源自 WebKit 的分支），用於 Chrome、Edge、Brave、Opera 等 Chromium 系瀏覽器。
   - <mark style="background: #ADCCFF;">WebKit</mark>：Apple 主導，用於 Safari；iOS 上所有瀏覽器底層也被限制使用它。
   在 MDN 文件上看到「Gecko 相關」的註記，代表那是 Firefox 核心團隊針對該功能所做的特殊實作或行為差異（例如更詳細的錯誤提示行數），不是所有瀏覽器都一樣。

## 練習題（LeetCode／NeetCode 對應）

- LeetCode 385 — Mini Parser：https://leetcode.com/problems/mini-parser/ 　手刻一個巢狀結構的剖析器，正好體會 (e) 說的「如果格式不是 JS 語法，就得自己寫 parser」有多麻煩。
- LeetCode 736 — Parse Lisp Expression：https://leetcode.com/problems/parse-lisp-expression/ 　遞迴解析巢狀語法的進階版，對應 (m) 由內而外的處理順序。
- LeetCode 2727 — Is Object Empty：https://leetcode.com/problems/is-object-empty/ 　JS 物件與陣列的判別，練 (f) 提到的六種結構。

## 關聯筆記（附關聯原因）

- [[JSON]]（vault 根目錄 JSON.md）— 那篇是 Abby 手寫的 JSON 總覽與 ECMA Edition 3 淵源，本篇補上 reviver 的實際執行順序與 whitespace 規範細節，屬於同一主題的深入層。
- [[JSON.parse-參數的ToString強制轉換]] — 那篇講 `JSON.parse` 的「第一個參數」會先被 ToString 抽象操作轉字串，本篇講「第二個參數」reviver，兩篇剛好把這個 API 的兩個參數補齊。
- [[ECMA-262 標準編號與 ES 俗稱 — 為何規格書不寫「我是 ES 幾」]] — Object Literal 與 Array Literal 在 ECMA-262 Edition 3 就存在，JSON 正是由這部分功能長出來的，本篇 (c) 的因果需要那篇的規格背景。
- [[00-V8引擎完整管線-Parse到Deoptimization]] — 本篇 (n) 提到的 Blink 搭配的 JS 引擎就是 V8，那篇說明 V8 拿到原始碼之後的完整管線。

## 各對話來源（原文）

### JSON.parse 解析字串迷思解析（2026-08-27）— https://gemini.google.com/app/e3ae7e8de2295cab

使用者：Gecko 是什麼

Gemini：Gecko 是由 Mozilla 基金會開發的開源網頁排版引擎（Layout Engine／Rendering Engine）。它的作用是把網頁的 HTML、CSS、JavaScript 代碼「畫」成你在螢幕上看到的視覺畫面，並處理使用者的點擊與互動。最知名的應用就是 Mozilla Firefox 瀏覽器。主要任務：解析 HTML 與 CSS 來決定網頁元素的佈局與樣式；配合 JavaScript 引擎（SpiderMonkey）執行網頁上的程式邏輯。你在 MDN 文件看到的「Gecko 相關」，代表那是 Firefox 瀏覽器核心團隊針對該功能所做的特殊優化或額外實作細節。

使用者：跟 chrome 的 blink 是一樣的嗎

Gemini：是的，完全是一樣的概念，它們都是網頁排版引擎，只是隸屬於不同的瀏覽器陣營與公司。Blink：Google 主導開發（前身源自 WebKit），主要用於 Chrome、Edge、Brave、Opera 等 Chromium 系瀏覽器。Gecko：Mozilla 基金會主導開發，主要用於 Firefox。WebKit：Apple 主導開發，主要用於 Safari（iOS 上所有瀏覽器底層也都被限制使用它）。

使用者：所以他會被叫做 JS Object Notation 是因為他轉換出來的東西是一個 JS Object Notation 嗎？

Gemini：不完全是，其實順序剛好相反：是因為這套資料格式的寫法長得跟 JavaScript 的物件實字（Object Literal）一模一樣，所以才被命名為 JSON。Notation 的意思是「記號法」或「表示法」，這個名稱代表的是一種純文字的記錄格式，而不是指轉換出來的程式物件。設計初衷：Douglas Crockford 希望找到一種比 XML 更輕量、更好讀的純文字格式來傳遞資料，他發現 JavaScript 寫物件的方式非常簡潔，於是直接拿 JS 的物件語法作為資料格式的標準。實際運作：JSON 本身只是一個符合語法規則的純文字（String）；`JSON.parse()` 讀取這個純文字，把它轉換成真正的 JS 物件、陣列或基本型態。

使用者：所以 JSON 它被創造的本質上就是在 parse？

Gemini：本質上是的。JSON 創造的初衷，就是為了讓「不同程式語言之間交換資料」變得極度簡單且容易被解析（Parse）。核心痛點：JavaScript 的記憶體物件、Python 的 Dict、Java 的 Object 結構都不一樣，沒辦法直接經由網路傳給對方，資料必須先變成純文字（String）才能傳輸。Crockford 的神來一筆：訂一套純文字規範，而且這套規範剛好跟 JavaScript 的物件實字語法一模一樣，那麼在 JS 裡解析它就完全不需要寫複雜的剖析器。跨語言的共通語言：因為語法極度簡化（只有 Object、Array、String、Number、Boolean、Null 六種結構），幾乎所有程式語言都能用幾行程式碼輕鬆把它 Parse 成自己語言內部的資料結構。

使用者：這個 reviver 函數有過濾的意思嗎？

Gemini：是的，reviver 函式確實具備「過濾」與「修改」雙重功能。在使用 `JSON.parse(text, reviver)` 時，解析器會從最內層的屬性開始，逐一將每個屬性的鍵（Key）與值（Value）傳入 reviver 函式處理。過濾（刪除）：如果 reviver 回傳 undefined（或是沒有回傳值），該屬性就會直接被從最終結果中刪除。修改（轉換）：如果回傳其他值，該屬性就會被新回傳的值覆蓋。保留：如果不需要動它，就必須原封不動地回傳原值 v。

使用者：第一段是傳入的值為 k？他就檢查 value 5 如果是物件的話他 double

Gemini：不完全是，他的邏輯是這樣的。reviver 函式每次都會同時收到兩個參數：k（Key，屬性名稱）與 v（Value，屬性對應的值）。第一步（處理內部屬性）：k 傳入 "p"，v 傳入 5，程式檢查 `typeof 5 === "number"` 成立，所以回傳 `5 * 2 = 10`，此時屬性 "p" 的值變成了 10。第二步（處理最外層物件本身）：k 傳入 ""（空字串，代表頂層物件本身），v 傳入修改後的物件 `{ p: 10 }`，程式檢查 `typeof { p: 10 }` 是 "object"（非 "number"），所以走 `return v`，原封不動回傳整個物件。最終得到的結果就是 `{ p: 10 }`。所以不是檢查 key 是否為 k，而是把「鍵名稱」給 k、「值」給 v，然後檢查值（v）是不是數字。

### JSON 規範中的 Whitespace 解析（2026-08-27）— https://gemini.google.com/app/52460f79bd7ab146

使用者：這邊的 whitespace 是指什麼

Gemini：在語法圖（Syntax Diagram）與 JSON／JavaScript 規範中，whitespace 指的是空白字元，用來分隔程式碼或資料中的元素，提升可讀性。在 JSON 中，常見的 whitespace 包含：空格（Space）、製表符／Tab（Horizontal Tab，`\t`）、換行符（Line Feed，`\n`）、回車符（Carriage Return，`\r`）。重點特性：（1）不影響解析：解析器在讀取 JSON 資料的 Value 時，會自動忽略這些空白字元。（2）位置彈性：你可以自由在 `{}`、`[]`、`:` 或逗號周圍加上空格或換行（例如美化縮排），資料的結構與內容完全不會改變。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話（JSON.parse 迷思） | https://gemini.google.com/app/e3ae7e8de2295cab | 2026-08-27 擷取 |
| 本篇 Gemini 對話（Whitespace） | https://gemini.google.com/app/52460f79bd7ab146 | 2026-08-27 擷取 |
| MDN — JSON.parse（含 reviver 完整說明） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse | 2026-08-27 查證 |
| json.org — Douglas Crockford 的 JSON 語法圖（含 whitespace 定義） | https://www.json.org/json-en.html | 2026-08-27 查證 |
| RFC 8259 — The JavaScript Object Notation (JSON) Data Interchange Format | https://datatracker.ietf.org/doc/html/rfc8259 | 2017-12 發布，2026-08-27 查證 |
| MDN — Gecko 名詞解釋 | https://developer.mozilla.org/en-US/docs/Glossary/Gecko | 2026-08-27 查證 |
