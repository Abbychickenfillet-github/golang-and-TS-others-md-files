# 速查:server side / client side 怎麼翻才不會搞混

> 回主筆記 → [tree.md](tree.md)

---

## 🎯 核心原則(記這句就好)

> **server side / client side 講的是「程式碼在**哪裡執行**」,不是「後端 vs 畫面」。**
> - **server side** = 在**伺服器**上跑
> - **client side** = 在**瀏覽器**上跑

---

## 建議翻譯

| 原文 | ✅ 建議翻譯 | ❌ 避免這樣翻 | 為什麼 |
|---|---|---|---|
| server side | **伺服器端**(在伺服器上執行) | 主機後端 | 會跟「後端 API」搞混 |
| client side | **瀏覽器端 / 用戶端**(在瀏覽器上執行) | 客戶看到的畫面 | client ≠ 客戶;執行位置 ≠ 畫面 |

---

## 兩個陷阱

### 陷阱 1:client ≠ 「客戶」

程式裡的 **client = 用戶端的電腦 / 瀏覽器**,不是「客戶(買東西的人)」。
(本專案裡的 `member` 消費者才是「客戶」,跟 client side 無關。)

### 陷阱 2:server side ≠ 「後端」

把兩個不同的伺服器搞混了:

| 名詞 | 指什麼 | 本專案裡是誰 |
|---|---|---|
| **後端 (backend)** | 處理資料、商業邏輯、API 的伺服器 | **Go Gin**(port 8080) |
| **React 的 server side** | React 元件**在某台伺服器(Node)上執行** | 還是**前端程式**,只是跑在伺服器上 |

> Server Component 是 React(前端)的程式碼,只是「在伺服器上執行」。
> 它**不是**你們的 Go 後端 —— 是兩台不同的伺服器。

---

## 也別跟這些搞混

| 詞 | 重點 |
|---|---|
| 畫面(HTML) | **server 也能產生**(初始 HTML 常是 server 渲染的)→ 所以「畫面」不等於 client side |
| SSR | 在 server 把元件渲染成「初始 HTML」→ 是「執行位置在 server」,但目的是給瀏覽器看 |
