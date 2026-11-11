---
title: setTimeout 的延遲是「至少」而非準時
type: topic-note
source: Gemini
tags: [gemini, javascript, setTimeout, event-loop]
sources:
  - https://gemini.google.com/app/1e3fd6659bbbbf2a
updated: 2026-11-09
---

# setTimeout 的延遲是「至少」而非準時

本篇重點 a–d，共 4 個。關聯：[[debounce為什麼一定要setTimeout-以及React的useRef]]（debounce 靠 setTimeout 重設計時）。

## 重點整理

(a) <mark style="background: #FFF3A3A6;">`setTimeout(functionRef, 3000)` 不是「3000ms 後立刻執行」</mark>，而是「至少延遲 3000ms 後，把 functionRef 放進事件迴圈（Event Loop）的任務佇列等待」。

(b) 實際執行常晚於 3000ms，因為計時器到期後要等 Call Stack 清空，主執行緒忙碌時回呼只能排隊。

(c) 背景分頁（非活動標籤）瀏覽器會限流，最小延遲約 1 秒甚至更久。

(d) 巢狀計時器（計時器裡再呼叫計時器）達一定層數後，瀏覽器強制至少 4ms 延遲。

```js
setTimeout(() => console.log("timer"), 0);
for (let i = 0; i < 1e9; i++) {}  // 佔住主執行緒，timer 必須等這段跑完
```

## 自我測驗（點開看答案）

<details><summary>1. 是非題：setTimeout 3000 保證 3000ms 準時執行。</summary>非。是最少 3000ms 後才排進佇列，實際可能更晚。</details>

<details><summary>2. 申論：列出延遲超過設定值的三個原因。</summary>主執行緒忙碌需排隊、背景分頁限流、巢狀呼叫的 4ms 最小延遲。</details>

## 各對話來源

### 理解 setTimeout 運作原理（2026-11-09）— https://gemini.google.com/app/1e3fd6659bbbbf2a

使用者：是一呼叫之後大概過個 3000ms 才開始執行那個 setTimeout 的 functionRef？
Gemini：依 MDN 說明，是至少延遲 3000ms 後放入事件迴圈佇列，實際會更久：要等主執行緒空閒、背景分頁限流、巢狀 4ms 下限。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| setTimeout 延遲與限流 | https://developer.mozilla.org/zh-TW/docs/Web/API/Window/setTimeout | MDN，Gemini 引用，本次未重新抓取（2026-11-09） |
