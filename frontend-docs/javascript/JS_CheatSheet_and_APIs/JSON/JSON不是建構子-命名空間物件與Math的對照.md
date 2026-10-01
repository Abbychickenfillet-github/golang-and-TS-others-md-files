---
title: JSON 不是建構子 — 命名空間物件（namespace object）與 Math 的對照
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, json, namespace-object, constructor, typeerror, math, reflect, intl]
sources:
  - https://gemini.google.com/app/c548e823716ff9f9
related:
  - "[[JSON設計由來-reviver函式與Whitespace規範]]"
  - "[[JSON深拷貝組合拳與安全parse-structuredClone與TS泛型T]]"
  - "[[JSON.parse-參數的ToString強制轉換]]"
  - "[[Object靜態方法速查]]"
  - "[[static-vs-instance-判準]]"
updated: 2026-09-21
---

# JSON 不是建構子 — 命名空間物件與 Math 的對照

本篇重點 a–i，共 9 個

> 關聯原因：[[JSON設計由來-reviver函式與Whitespace規範]] 講的是 JSON 這個「資料格式」怎麼來的；這篇講的是 JSON 這個「全域物件」在引擎裡是什麼身分。
> 	另外 [[static-vs-instance-判準]] 那篇的判準（靜態方法掛在建構子身上、實例方法掛在 prototype 上）在這裡剛好出現一個極端案例：<mark style="background: #FFF3A3A6;">JSON 全身上下只有靜態方法，連 prototype 都沒有。</mark>

---

## 一、主軸圖：new JSON() 走到哪一格卡住

![[學習JS_圖解_JSON是命名空間物件不是建構子-new會走到哪裡卡住_2026-09-21.svg]]

（a）看圖重點：<mark style="background: #ADCCFFA6;">`new` 運算子會去找目標身上的 `[[Construct]]` 內部方法</mark>，找得到才往下建立實例，找不到就當場丟 `TypeError`。JSON 身上根本沒有這一格，所以連「試著建」的機會都沒有。

---

## 二、為什麼不能寫 new JSON()

（b）執行 `new JSON()` 的結果是：

```js
new JSON();   // TypeError: JSON is not a constructor
JSON();       // TypeError: JSON is not a function
```

（c）<mark style="background: #ADCCFFA6;">JSON 是一個「命名空間物件（namespace object）」</mark>，設計目的只是當一個容器，把一整組靜態方法（static methods）裝在同一個名字底下：

| 方法 | 誰對誰做什麼 | 產物 |
| --- | --- | --- |
| `JSON.parse(text, reviver?)` | 把一段符合 JSON 語法的字串交給引擎 parse | 一個 JavaScript 值（物件、陣列、數字…） |
| `JSON.stringify(value, replacer?, space?)` | 把一個 JavaScript 值交給引擎序列化 | 一段 JSON 字串 |

（d）<mark style="background: #BBFABBA6;">它跟 `Math` 是同一種東西</mark>：你不會寫 `new Math()`，只會直接呼叫 `Math.random()` 或 `Math.floor()`。JSON 也是同樣的用法。

（e）為什麼不需要實例化：`new` 的工作是「建立一個新物件、綁定 `this`、掛上 prototype」。
	但 <mark style="background: #FFF3A3A6;">JSON 不需要保存任何狀態或實例資料</mark>，`parse` 與 `stringify` 都是純函式：給輸入、出輸出，做完就結束。
	沒有狀態要存，就沒有實例存在的意義。

（f）同一個家族還有誰：<mark style="background: #D2B3FFA6;">`Math`、`JSON`、`Reflect`、`Intl`、`Atomics`</mark>（以及 `WebAssembly`）。這幾個全域物件都不是建構子，`new` 它們一律丟 `TypeError`。

---

## 三、怎麼自己驗證

（g）在 Console 直接看內部標記：

```js
typeof JSON;                                   // "object"，不是 "function"
typeof Date;                                   // "function"

Object.prototype.toString.call(JSON);          // "[object JSON]"
JSON[Symbol.toStringTag];                      // "JSON"

'prototype' in JSON;                           // false，連 prototype 都沒有
Object.getOwnPropertyNames(JSON);              // ['parse', 'stringify', ...]
```

（h）<mark style="background: #BBFABBA6;">最快的判準：`typeof X === 'function'` 才有機會被 `new`。</mark>`typeof JSON` 回傳 `"object"`，到這裡就可以收工了。

---

## 四、⚠️ 補充更正

（i）<mark style="background: #FF5582A6;">⚠️ Gemini 的回答沒有錯，但少講了一層：真正的判準不是「它是不是物件」，而是「它有沒有 `[[Construct]]` 內部方法」。</mark>
	反例是箭頭函式：`typeof (() => {}) === 'function'`，但 `new (() => {})` 一樣會丟 `TypeError: ... is not a constructor`，因為箭頭函式也沒有 `[[Construct]]`。
	所以 `typeof` 只是快篩，規範層面的答案在 `[[Construct]]`。

---

## 五、各對話來源（原文）

### JSON 與一般物件的差異解析（2026-09-21 擷取）— https://gemini.google.com/app/c548e823716ff9f9

使用者：不能寫 `new JSON` 的意思？

Gemini：在 JavaScript 中，不能寫 `new JSON()` 的原因在於 JSON 不是一個建構子函數（Constructor Function）。如果你嘗試執行 `new JSON()`，瀏覽器會直接拋出錯誤：`TypeError: JSON is not a constructor`。

背後原因與設計邏輯：

1. JSON 是一個「命名空間物件（Namespace Object）」。JavaScript 中的全局 JSON 物件，設計初衷是用來提供一整組靜態工具方法（Static Methods），例如 `JSON.parse()`（將 JSON 字串解析成 JavaScript 值／物件）與 `JSON.stringify()`（將 JavaScript 值轉成 JSON 字串）。它就像 Math 物件一樣——你不會寫 `new Math()`，而是直接呼叫 `Math.random()` 或 `Math.floor()`。JSON 單純只是一個用來存放這些工具函數的容器（命名空間），並不需要實例化（Instantiate）。

2. 沒有狀態或實例屬性。`new` 關鍵字的作用是根據類別或建構子創建出一個新的物件實例（Instance），並綁定 `this` 與內部屬性。然而 JSON 物件本身不需要儲存任何狀態或實例數據，所有的轉換作業都是「給輸入、出輸出」的純函數操作，因此完全沒有實例化的必要。

補充：除了不能用 `new` 之外，你也不能直接調用它：`JSON()` 會拋出 `TypeError: JSON is not a function`。MDN 文件對此有明確定義：與大多數全局物件不同，JSON 不是建構子，你不能將它與 `new` 運算子一起使用，也不能將 JSON 物件作為函數調用。

總結來說：JSON 只是個工具箱，直接使用裡面的靜態方法 `JSON.parse()` 與 `JSON.stringify()` 即可。

---

## 六、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| JSON 是命名空間物件、不是建構子 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON | MDN，2026-09-21 查證 |
| 哪些內建物件不是建構子（Math、JSON、Symbol、Reflect、Intl、Atomics） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_a_constructor | MDN，2026-09-21 查證 |
| 命名空間物件的定義 | https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Page_structures/Page_types/JavaScript_namespace_page_template | MDN，2026-09-21 查證 |
| Gemini 對話原文 | https://gemini.google.com/app/c548e823716ff9f9 | 2026-09-21 擷取 |
