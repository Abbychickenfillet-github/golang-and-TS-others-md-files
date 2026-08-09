---
title: ECMA-262 語言規範是誰寫的？跟 MDN 誰更新快、誰更專業？
type: topic-note
source: Gemini
tags: [gemini, javascript, ecma262, tc39, mdn, spec, JS_Core_and_Runtime]
aliases: [ECMA-262規範-TC39與MDN比較]
related:
  - "[[引擎-Engine-到底是什麼]]"
sources:
  - https://gemini.google.com/app/e603283c3269f3e9
  - https://gemini.google.com/app/524caff1962715e6
updated: 2026-08-05
---

# ECMA-262 語言規範是誰寫的？跟 MDN 誰更新快、誰更專業？

> 承接：[[引擎-Engine-到底是什麼]] 的 (g-1) 節已畫出「規格層／引擎層／硬體層」三層架構，這篇是同一次系列提問裡，針對「規格層」本身（ECMA-262 是誰寫的、跟 MDN 差在哪）的追問記錄，兩篇對照著看。

## 重點整理

本篇重點 (a)–(e)，共 5 個。

### (a) ECMA-262 是誰寫的？
這份文件正式名稱是 <mark style="background: #ADCCFFA6;">ECMAScript Language Specification（ECMA-262）</mark>，是 JavaScript 的官方標準規格書。制定組織是 Ecma International 旗下的 <mark style="background: #ADCCFFA6;">TC39（Technical Committee 39）</mark>技術委員會。JavaScript 最初由 Brendan Eich 創立，規範則由 TC39 委員會成員共同編寫審查，歷代主要專案編輯包括 Allen Wirfs-Brock、Brian Terlson、Jordan Harband、Kevin Gibbons、Shu-yu Guo、Michael Ficarra、Richard Gibson、Ron Buckton、Nicolò Ribaudo、Linus Groh 等人，並結合廣大開源社群的貢獻。

### (b) 這些語法規則屬於哪個 Level？
屬於<mark style="background: #FFF3A3A6;">高階語言規格層級</mark>，並不直接等於 RAM 或 CPU 的操作層級：

| 層級 | 內容 |
|---|---|
| 規範層級 | ECMA-262 定義 JS 語法（Lexical & Syntactic Grammar）與執行語意，只是文字規則 |
| 引擎層級 | V8/SpiderMonkey/JavaScriptCore 讀規格、實作 Parser 轉 AST，再經 JIT 編譯成 Bytecode 或機器碼 |
| 硬體層級 | 引擎編譯出的機器碼，執行時才真正操作 CPU 暫存器與 RAM |

`NonOctalDigit`、`LegacyOctalLikeDecimalIntegerLiteral` 這類文法符號定義在規範 <mark style="background: #ADCCFFA6;">Annex B.1.1</mark>（Web 瀏覽器附加相容性規格）：`NonOctalDigit` 指數字 8 或 9（八進位只有 0-7）；`LegacyOctalLikeDecimalIntegerLiteral` 是為了相容舊網頁「開頭補 0」寫法保留的「類八進位十進位整數」——例如 `012` 是純八進位（=10），但 `018`／`089` 因含 8/9，會退回以十進位解析（=18／89）。<mark style="background: #FF5582A6;">現代 JS 在嚴格模式或 ES Modules/Classes 下已禁止這種模糊寫法，會直接拋 SyntaxError，請改用標準前綴 `0o`（例：`0o12`）。</mark>

### (c) ECMA-262 跟 MDN，誰更新得快？
<mark style="background: #ADCCFFA6;">ECMA-262 較快</mark>：是滾動更新的官方規格草案，TC39 一旦通過新語法進入 Stage 4，該語法立即併入主分支與 Draft 規格，是所有新特性的源頭。
<mark style="background: #ADCCFFA6;">MDN 稍慢</mark>：屬於「二次整理與撰寫」的文件，通常要等提案接近完成、或瀏覽器開始實驗性實作，社群與 Mozilla 編輯團隊才會寫成白話文教學，時間點上略落後 ECMA-262 草案。

### (d) 誰更專業？該看哪一份？
兩者定位不同、互補，不是誰取代誰：

| | ECMA-262（語言的「法律條文」） | MDN（開發者的「實用手冊」） |
|---|---|---|
| 性質 | 權威性 100%，官方標準規範 | Web 開發領域最專業的應用教學與 API 參考 |
| 目標受眾 | JS 引擎開發者、編譯器作者（Babel/TypeScript）、語言設計者 | 應用層開發者（前端／Node.js／Web 工程師） |
| 特點 | 極度嚴謹形式化語言（文法規則、抽象操作、演算法步驟），不含教學或範例 | 白話文＋大量範例、最佳實踐、瀏覽器相容性表格；還涵蓋 HTML/CSS/Web API（ECMA-262 不涵蓋） |
| 適合查閱時機 | 想了解最底層執行邏輯、型別轉換演算法、語法解析邊界條件、研究最新 Stage 4 前沿提案 | 日常寫程式、查 API 用法、看語法範例、確認瀏覽器支援度 |

### (e) 「語法規則本身」跟「解析這些規則的動作」分屬不同層

同一份 FormalParameters 語法樹截圖裡看到的 `FormalParameters` → `FormalParameterList` → `FormalParameter` → `BindingElement` → `SingleNameBinding` 這條階層，要拆成兩半看：

| 部分 | 屬於哪一層 | 說明 |
|---|---|---|
| 規則／名稱本身 | <mark style="background: #ADCCFFA6;">ECMA-262 規格範疇</mark> | 這些是 ECMA-262 官方規格書裡 Syntactic Grammar 的生產規則（Production Rules），定義「JS 函式參數合法寫法」這套語法架構本身，是規格文字 |
| 讀規則、蓋出這棵樹的動作 | <mark style="background: #ADCCFFA6;">引擎／編譯器層級</mark> | V8、SpiderMonkey、JavaScriptCore 這些引擎內部的 Parser（屬編譯器前端）負責讀懂上述規則，在記憶體中依循規則實際建構出對應的 AST 節點，這是「執行規則」的動作 |

<mark style="background: #FFF3A3A6;">一句話記憶：規則的「定義權」在 ECMA-262；把規則「跑起來、蓋成樹」的是引擎裡的 Parser。</mark>跟 (b) 節「規範層／引擎層／硬體層」三層架構是同一組概念的延伸應用。

![[images/ECMA-FormalParameters語法樹-20260805.jpg|400]]

*（FormalParameters 語法樹截圖：由上到下 FormalParameters → FormalParameterList → FormalParameter → BindingElement → SingleNameBinding，逗號接龍可重複多個參數。）*

## 各對話來源

### JavaScript 規範與語法解析（2026-07-29）— https://gemini.google.com/app/e603283c3269f3e9

使用者：這邊是誰寫的文件？這些語法是在哪一個 level？像 RAM 或 CPU？哪裡可以看到 `NonOctalDigit`、`LegacyOctalLikeDecimalIntegerLiteral`？

Gemini：這份文件是 ECMAScript Language Specification（ECMA-262），由 TC39 技術委員會維護更新，歷代專案編輯含 Allen Wirfs-Brock 等人。屬於高階語言規格層級，不等於 RAM/CPU 層級；分規範層／引擎層／硬體層三層。`NonOctalDigit`、`LegacyOctalLikeDecimalIntegerLiteral` 定義在 Annex B.1.1，是為相容舊版「開頭補0」數字寫法保留的文法，現代嚴格模式已禁用、應改用 `0o` 前綴。

使用者：ECMA-262 跟 MDN 誰更新得比較快？誰比較專業？

Gemini：更新速度 ECMA-262 更快（TC39 通過即併入草案，是新特性源頭），MDN 屬二次整理稍慢。專業度與權威性 ECMA-262 是語言的「法律條文」，MDN 是開發者的「實用手冊」，兩者受眾與用途不同：底層邏輯／前沿提案看 ECMA-262，日常查 API／範例／相容性看 MDN。

### 追加對話（2026-08-05）：FormalParameters 語法樹截圖屬於哪一層

使用者：（貼上 FormalParameters → FormalParameterList → FormalParameter → BindingElement → SingleNameBinding 語法樹截圖）這是屬於 ECMA 的範疇還是引擎層級還是編譯器？

Gemini：這張圖跨越了 ECMA 規格範疇與編譯器／引擎層級。圖片中的語法規則名稱（FormalParameters、BindingElement 等）全部直接出自 ECMA-262 官方規格書的 Syntactic Grammar 生產規則，屬於規則本身；而 V8、SpiderMonkey、JavaScriptCore 等引擎的 Parser 讀規格、實作解析邏輯、在記憶體中建構出對應的階層結構（AST 節點），屬於引擎層級的編譯器動作。規則與架構的定義權屬於 ECMA-262，讀取規格並執行解析的是引擎層級的 Parser。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文（ECMA-262 vs MDN） | https://gemini.google.com/app/e603283c3269f3e9 | 2026-07-29 查證 |
| Gemini 對話原文（語法樹截圖歸屬層級） | https://gemini.google.com/app/524caff1962715e6 | 2026-08-05 查證 |
| ECMA-262 官方規範（供交叉核對 TC39 編輯名單與 Annex B.1.1 是否有更新） | https://tc39.es/ecma262/ | 建議 Abby 之後自行核對最新版本日期 |
| MDN Web Docs | https://developer.mozilla.org/ | 持續更新，無固定版本號 |
