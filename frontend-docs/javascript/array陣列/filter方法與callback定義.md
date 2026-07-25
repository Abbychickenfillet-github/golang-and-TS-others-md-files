---
title: filter() 方法與 Callback 函式定義
type: topic-note
source: Gemini
tags: [gemini, javascript, array, callback, closure, memory]
sources:
  - https://gemini.google.com/app/62a033a5c6e48ae3
updated: 2026-07-23
---

# filter() 方法與 Callback 函式定義

本篇重點 a–f，共 6 個

## 重點整理

(a) <mark style="background: #ADCCFFA6;">`filter()` 一定會用到一個 callback function</mark>：`filter()` 遍歷陣列每個元素時都會呼叫這個 callback，callback 回傳 `true` 該元素就保留進新陣列、回傳 `false` 就被濾掉——callback 就像篩網，決定誰能通過。

(b) <mark style="background: #ADCCFFA6;">MDN 對 Callback 的定義</mark>：「回呼函式（Callback function）是指被作為引數（Argument）傳入另一個函式的函式，並在該外部函式內部被呼叫，以完成某些任務或流程。」

(c) <mark style="background: #FFF3A3A6;">Callback 既是寫法風格，也涉及記憶體機制</mark>，可從兩個角度理解：
　　① **語法/設計角度**：JS 函式是「一等公民（First-Class Functions）」，可賦值給變數、當引數傳遞、當回傳值——`fnA(fnB)` 時 `fnB` 就是 callback，意思是「這是我的邏輯，交給你（fnA），你在適當時機再呼叫回（call back）我」。
　　② **記憶體角度**：不只是文字寫法，底層涉及三個核心機制（見 d、e、f）。

(d) <mark style="background: #ADCCFFA6;">記憶體位址傳遞（Reference Pass）</mark>：寫 `data.filter(checkId)` 時，傳的不是函式「執行後的結果」，而是該函式在記憶體堆積（Heap）中的記憶體位址（指標 Reference）；外部函式（如 filter）拿到這個位址後，在自己的執行過程中透過位址找到並執行該函式。

(e) <mark style="background: #ADCCFFA6;">閉包（Closure）與變數生存週期</mark>：若 callback 存取了外層變數（例如 `data.filter(item => item.id !== targetId)` 用到外層的 `targetId`），callback 會保留對其詞法範疇（Lexical Scope）中變數的引用；即使 filter 正在自己的作用域運作，callback 依然能存取外部的 `targetId`，這就是閉包保留記憶體上下文的特性。

(f) <mark style="background: #D2B3FFA6;">Call Stack 與 Event Loop 的分野</mark>：callback 可分同步／非同步。**同步 callback**（如 `Array.filter`）直接在當前執行上下文（Call Stack）中被呼叫、推入釋放記憶體；**非同步 callback**（如 `setTimeout`／API 請求）會先擺在記憶體空間中，等非同步任務完成後，經 Web APIs → Task Queue → Event Loop 才重新被推回 Call Stack 執行。

## 相關筆記
- [[閉包vs參數鑽透-argument-drilling]]（同樣講閉包如何「記住」外層變數；該篇用工廠函式示範封裝折扣資料，本篇則從 filter callback 的記憶體位址/閉包角度補充「為什麼能記住」）
- [[陣列遍歷-forEach與callback]]（同為陣列方法 + callback 的組合；forEach 的 callback 用於「副作用」，filter 的 callback 用於「回傳布林值決定去留」，兩者可對照理解 callback 在不同陣列方法中角色如何不同）

## 各對話來源

### Filter 方法的 Callback 函式（2026-07-23）— https://gemini.google.com/app/62a033a5c6e48ae3
使用者：所以filter一定會用到一個callback function嗎
Gemini：確認 filter() 一定會用到 callback，說明其作為「篩網」的運作方式，回傳 true 保留、false 濾掉。

使用者：Callback的定義到底是什麼 mdn，他只是一種寫法的格式還是他有參雜到一些記憶體的概念？
Gemini：引用 MDN 定義，說明 callback 同時是設計模式（一等公民函式）也涉及記憶體機制，並拆解三層：記憶體位址傳遞（Reference Pass）、閉包與變數生存週期、Call Stack 與 Event Loop 的同步/非同步差異。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/62a033a5c6e48ae3 | 2026-07-23 查證 |
| MDN Callback function 定義 | https://developer.mozilla.org/en-US/docs/Glossary/Callback_function | 與 MDN Glossary 說明一致，2026-07-23 查證 |
