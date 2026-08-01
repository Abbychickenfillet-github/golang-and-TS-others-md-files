---
title: V8 與 libuv 協同工作原理——瀏覽器與 Node.js 的非同步 I/O
type: topic-note
source: Gemini
tags: [gemini, javascript, v8, libuv, nodejs, event-loop, JS_Core_and_Runtime]
aliases: [V8與libuv協同工作原理-非同步IO]
related:
  - "[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]"
  - "[[引擎-Engine-到底是什麼]]"
  - "[[事件循環-Event-Loop-微任務與巨任務]]"
sources:
  - https://gemini.google.com/app/93d844f125b325f0
updated: 2026-07-29
---

# V8 與 libuv 協同工作原理——瀏覽器與 Node.js 的非同步 I/O

> 承接：[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]] 已整理過 Node.js 分層架構，這篇是同主題的另一次 Gemini 追問，聚焦在「V8 跟 libuv 到底怎麼分工、怎麼互相交接」的具體流程，可對照著看。

## 重點整理

本篇重點 (a)–(e)，共 5 個。

### (a) 一句話分工
<mark style="background: #FFF3A3A6;">V8 是「大腦」</mark>：負責閱讀、編譯並執行 JavaScript 程式碼。
<mark style="background: #FFF3A3A6;">libuv 是「手腳與管家」</mark>：負責處理所有需要等待或跟作業系統打交道的非同步 I/O 任務（網路請求、檔案讀寫、計時器）。

### (b) V8 引擎：JIT 編譯 + 單線程 + 自帶 GC
Google 開發、C++ 撰寫的高效能 JavaScript／WebAssembly 引擎。核心任務是透過 <mark style="background: #ADCCFFA6;">JIT (Just-In-Time)</mark> 編譯技術，把 JS 原始碼直接轉譯成 CPU 看得懂的機器碼並執行；內建 <mark style="background: #ADCCFFA6;">Garbage Collector</mark> 自動回收記憶體；執行 JS 程式碼時只有一條主線程（Single-threaded）。

### (c) libuv：跨平台非同步 I/O 抽象層 + 線程池
最初為 Node.js 開發的跨平台 C 語言庫，專門實現事件循環（Event Loop）與非同步操作，解決「單線程被阻塞」的問題：

- 當 JS 需要網路請求、讀寫檔案、啟動 `setTimeout` 時，V8 本身不處理，交給 libuv 向作業系統申請資源。
- <mark style="background: #ADCCFFA6;">跨平台抽象化</mark>：不同 OS 的非同步機制不同（Linux 用 epoll、macOS 用 kqueue、Windows 用 IOCP），libuv 把這些差異封裝成統一 API。
- <mark style="background: #ADCCFFA6;">線程池（Thread Pool）</mark>：對某些 OS 沒提供非同步 API 的操作（如部分檔案 I/O），libuv 會在背景開額外線程處理，完成後把結果送回主線程。

### (d) 協同流程範例
```javascript
console.log("開始");
setTimeout(() => { console.log("計時器到期"); }, 1000);
console.log("結束");
```
1. V8 執行 `console.log("開始")`。
2. V8 遇到 `setTimeout`，把計時任務註冊、交給 libuv 管理，自己繼續往下跑、不等待。
3. V8 執行 `console.log("結束")`。
4. libuv 在背景倒數 1000ms，時間到後把對應的 Callback 放進事件佇列（Event Queue）。
5. V8 主線程清空、有空閒時，Event Loop 把佇列裡的 Callback 抓出來交給 V8 執行 `console.log("計時器到期")`。

### (e) Chromium 瀏覽器的特別之處
Chromium 系列瀏覽器（Chrome/Edge/Brave）直接內嵌 V8，但瀏覽器的 DOM API、Fetch API 等 Web API 是由 <mark style="background: #ADCCFFA6;">Blink / Chromium</mark> 宿主環境提供的，不是 V8 自己會的。<mark style="background: #FF5582A6;">⚠️ 補充澄清：Node.js 直接使用 V8 + libuv 的組合；但 Chromium 內部其實有自己的多進程 Event Loop 架構與底層 I/O 處理機制（如 Mojo / net 模組），並非直接套用 libuv 本身</mark>——只是兩者「非同步 Event Loop」的設計思想是一脈相承的，回答時需區分「libuv 本體」與「libuv 式的設計思想」。

## 各對話來源

### V8 與 libuv 協同工作原理（2026-07-29）— https://gemini.google.com/app/93d844f125b325f0

使用者：Chrome、Edge、Brave 等 Chromium 系列瀏覽器直接內嵌 V8，libuv 是什麼？

Gemini：V8 是「大腦」負責讀取、編譯並執行 JS；libuv 是「手腳與管家」負責處理非同步 I/O。V8 是 C++ 開發、JIT 編譯、單線程、自帶 GC 的 JS 引擎。libuv 是跨平台 C 語言庫，實現事件循環，把不同 OS 的非同步機制（epoll/kqueue/IOCP）封裝成統一 API，並用線程池處理沒有原生非同步 API 的操作。以 `setTimeout` 為例說明兩者如何交接任務、事件佇列、Event Loop 執行順序。補充：Chromium 瀏覽器裡 DOM/Fetch 等 Web API 由 Blink/Chromium 提供而非 V8；Node.js 直接用 V8+libuv，Chromium 則有自己的多進程 Event Loop（Mojo/net），與 libuv 思想一脈相承但非同一套實作。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/93d844f125b325f0 | 2026-07-29 查證 |
| libuv 官方文件（背景知識，供交叉核對） | https://docs.libuv.org/ | 查證時間 2026-07-29（Gemini 回答未附官方連結，建議 Abby 之後自行核對線程池與各平台 I/O 機制細節是否有更新） |

> ⚠️ 存疑／更正提醒：Gemini 原句「Chromium 內部則有自己的多進程 Event Loop 架構與底層 I/O 處理機制…不過其運作邏輯與 libuv 的非同步 Event Loop 思想是一脈相承的」屬於概念性類比，並非指 Chromium 直接使用 libuv 原始碼，筆記中已在 (e) 標註澄清，避免誤解為「Chromium 也用 libuv」。
