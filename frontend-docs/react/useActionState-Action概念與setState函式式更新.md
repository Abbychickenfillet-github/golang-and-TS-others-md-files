---
title: useActionState、Action 與 setState 函式式更新
type: topic-note
source: Gemini
tags: [gemini, react, react19, useState]
sources:
  - https://gemini.google.com/app/1a5b6819bee19e81
  - https://gemini.google.com/app/fb916f537e1458b3
updated: 2026-11-05
---

# useActionState、Action 與 setState 函式式更新

本篇重點 a–h，共 8 個

## 重點整理

### 一、React Action 與 useActionState（對話 解釋 React Action）

(a) <mark style="background: #ADCCFFA6;">Action</mark> 指會改變狀態且常帶非同步副作用（`await fetch(...)`、寫資料庫）的函式，React 19 把它納入標準模型，例如 `useActionState`。
(b) Action 的三個特點：允許非同步與副作用 → React 自動追蹤 `isPending` 讓 UI 顯示載入中 → 通常在 Transition 裡呼叫以保持畫面流暢。
(c) 表單用法：<mark style="background: #BBFABBA6;">`<form action={formAction}>`</mark>，使用者提交時 React 攔截並以非同步方式處理 FormData。
(d) 與 `useReducer` 差異：reducer 必須是純函式不可有副作用，用來管理純前端 UI 狀態；Action 可以含 API 呼叫，用來管理伺服器互動與資料突變。
(e) 範例逐行：

```javascript
function MyCart({ initialState }) {
  const [state, dispatchAction, isPending] =
    useActionState(reducerAction, initialState);
}
```

   `function MyCart({ initialState })` 宣告元件並從 props 解構 initialState → `useActionState(reducerAction, initialState)` 第一個參數是處理動作的函式，第二個參數是 <mark style="background: #FFF3A3A6;">狀態在第一次渲染時的初始值</mark> → 回傳的陣列依序是目前 state、觸發動作的 dispatchAction、是否執行中的 isPending。
(f) 兩個 initialState 的差別：第二個參數是整個 Hook 的初始值；`reducerAction(previousState, payload)` 的 previousState 是「上一次 Action 執行完的狀態」，<mark style="background: #D2B3FFA6;">第一次觸發時 previousState 恰好等於 initialState</mark>。另外它必須可序列化，型別要與 reducerAction 回傳型別一致。

### 二、setState 函式式更新（對話 React 狀態更新解析）

(g) `setSeqLength((prev) => Math.max(1, prev - 1))`：`setSeqLength` 是 useState 的更新函式 → `(prev) => ...` 是函式式更新，prev 是最新的舊值，避免連續更新時拿到過期值 → `Math.max(1, prev - 1)` 讓數值減 1 但最低停在 1。例：5 → 4；1 → `Math.max(1, 0)` = 1。
(h) 常見場景：減少數量、密碼長度、分頁、字數限制的「減」按鈕，防止數值變 0 或負數。

## 各對話來源

### 解釋 React Action（2026-11-05 讀取）— https://gemini.google.com/app/1a5b6819bee19e81

使用者：何謂 action
Gemini：Action 是會觸發狀態改變且含非同步副作用的函式（詳見 a–d）。
使用者：為什麼 function MyCart{initialState} 底下又用 useActionState 加入 initialState 當第二個傳入參數，這第二個是幹嘛用的
Gemini：設定第一次渲染的預設初始值（詳見 e–f）。

### React 狀態更新解析（2026-11-05 讀取）— https://gemini.google.com/app/fb916f537e1458b3

使用者：setSeqLength((prev) => Math.max(1, prev - 1)) 是寫什麼
Gemini：減 1 但下限為 1 的函式式更新（詳見 g–h）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| useActionState | [React 官方 useActionState](https://react.dev/reference/react/useActionState) | 官方文件，未於本次重新抓取，請核對 React 版本 |
| 函式式更新 | [React 官方 useState](https://react.dev/reference/react/useState) | 官方文件，未於本次重新抓取 |
| 對話原文 | 見 frontmatter sources | 2026-11-05 讀取 |

相關筆記：[[useState底層-Fiber-Tree-memoizedState與過期閉包]]（為何要用 prev 避開過期閉包）。
