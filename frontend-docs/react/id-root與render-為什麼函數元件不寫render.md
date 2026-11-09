---
title: id="root" 不特殊，以及 render() 為什麼不在函數元件中出現
type: topic-note
source: Gemini
tags: [gemini, react, dom, createRoot]
sources:
  - https://gemini.google.com/app/fef39e73d5280f04
updated: 2026-11-01
---

# id="root" 不特殊，以及 render() 為什麼不在函數元件中出現

## 重點整理

本篇重點 a–d，共 4 個

(a) id="root" 只是慣例
  HTML 與瀏覽器不會替 id="root" 的 div 加任何內建功能。React 教學習慣用它當掛載點（mount point，框架接管畫面渲染的起點 DOM 節點）。<br>改名成 app 或 main-container 也能運作，只要 getElementById 抓同一個名字。

(b) createRoot().render() 是全域掛載
  React 18 寫法：createRoot(document.getElementById('root')) 先對該 DOM 節點建立 root 物件，再呼叫 root.render(&lt;App /&gt;) 把整個應用塞進去。舊版是 ReactDOM.render()。

(c) 類別元件才需要元件內 render()
  Class Component（類別元件）必須實作 render() 並回傳 JSX。Functional Component（函數元件）整個函數本身就是渲染函式，直接 return JSX，所以日常元件看不到 render。

(d) 兩種 render 層級不同
  ① root.render()＝把整個 React 應用掛到 DOM（全域，一次）。② 類別元件的 render()＝決定單一元件長相（元件內，每次更新）。

## 自我測驗

- Q：id="root" 有內建功能嗎？
  - A：沒有，只是慣例的掛載點名稱。
- Q：函數元件為什麼不寫 render()？
  - A：函數本身就是渲染函式，直接 return JSX。
- Q：createRoot(...).render(...) 負責什麼？
  - A：把整個 React 應用掛到 DOM 掛載點。

## 各對話來源（原文摘要）

使用者：是所有有id="root"的div都是很特殊的root DOM node嗎？
Gemini：不是，id="root" 只是普通識別碼，業界慣例當作前端應用掛載點，可改成任何名字。
使用者：render()為什麼不會在個別元件中用到
Gemini：類別元件才需要 render()；函數元件直接 return JSX；全域掛載改由 createRoot().render() 管理。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| React createRoot 官方文件 | https://react.dev/reference/react-dom/client/createRoot | 引用自 Gemini 對話（2026-11-01 擷取），官方頁面本次未重新核對 |
| Gemini 對話 | https://gemini.google.com/app/fef39e73d5280f04 | 擷取於 2026-11-01 |
