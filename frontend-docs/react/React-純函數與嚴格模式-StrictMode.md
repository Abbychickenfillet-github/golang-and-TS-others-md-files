---
title: React 純函數與嚴格模式 (StrictMode)
type: topic-note
source: Gemini
tags: [gemini, react, 純函數, StrictMode, 副作用]
sources:
  - https://gemini.google.com/app/7513ffa1facd9680
updated: 2026-07-01
---

# React 純函數與嚴格模式 (StrictMode)

## 重點整理

### 純函數 (Pure Function) 是什麼
<mark class="b">純函數</mark>指的是：<mark class="y">給定相同的輸入，就一定會產生相同的輸出，而且不能有任何副作用 (side effect)</mark>。

### 為什麼 React 要求 render 是純的
React 在渲染元件時，把元件當成一個「輸入 props/state → 輸出 UI」的純函數。<mark class="r">如果你在渲染（或計算狀態更新）的過程中去修改外部變數、或直接發 API 請求，這些都算「副作用」，很容易導致元件狀態不穩定、畫面對不上資料。</mark>

<mark class="g">正解：副作用要放在對的地方 —— 例如 `useEffect`、事件處理函式 (event handler) 裡，而不是寫在 render 主體中。</mark>

### 嚴格模式 (StrictMode) 的角色
<mark class="b">StrictMode</mark> 是 React 用來幫你抓出這些潛在問題的開發工具。它會<mark class="y">故意「重複執行」一段程式碼（例如把 render／某些函式呼叫兩次）</mark>，藉此放大「不純」的行為 —— 如果你的 render 有副作用，跑兩次結果就會不一致，問題馬上現形。

<mark class="v">補充：StrictMode 的雙重呼叫只發生在開發模式 (development)，正式上線 (production) 不會重複執行，所以不用擔心效能。</mark>

## 各對話來源

### React 純函數與嚴格模式（2026-06）— https://gemini.google.com/app/7513ffa1facd9680

**使用者：**

再多幫我延伸一些觀念嗎？（承接畫面上的「純函數」概念）

**Gemini：**

好的，沒問題！純函數概念在 React 開發裡非常重要。簡單來說，純函數是指給定相同的輸入，就一定會產生相同的輸出，而且不能有任何副作用。

在 React 裡，如果你在渲染元件或是執行狀態更新的時候去修改了外部變數，或是發起了 API 請求等，這些都稱為有副作用，很容易導致元件狀態不穩定。

畫面中提到的嚴格模式，就是 React 用來幫你抓出這些潛在問題的工具，它可以強制重複執行一段程式碼，幫助你確保程式碼是純淨的。
