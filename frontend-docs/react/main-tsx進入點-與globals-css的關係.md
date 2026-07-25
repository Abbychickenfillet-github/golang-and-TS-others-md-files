---
title: main.tsx進入點-與globals-css的關係
type: concept
updated: 2026-07-20
tags:
  - react
  - vite
  - 進入點
  - css
---

# `main.tsx` 是什麼？跟 `globals.css` 差在哪？

> 本篇重點 a–i，共 9 個
> 相關：[[04-4-ITCSS實戰盤點-official-website全域檔]]（globals.css 的內容盤點）、[[index-explanation]]、[[index.ts-intro]]
> 實例：`C:\coding\futuresign\futuresign.official_website\src\main.tsx`（73 行，實測 2026-07-20）

---

## 一‧先修正提問前提

**(a)** 這兩個**不是同類東西的兩個選項**，是「誰載入誰」的關係。
就像不會問「電源線跟燈泡差在哪」——一個是通道，一個是內容物。

| 比較項 | `src/styles/globals.css` | `src/main.tsx` |
|---|---|---|
| 語言 | CSS | TypeScript + JSX |
| 角色 | 樣式資料（被動，自己不會執行） | 應用程式進入點（主動，瀏覽器從這裡開始跑） |
| 誰載入它 | 被 `main.tsx` 第 7 行 import | 被 `index.html` 第 78 行 `<script type="module" src="/src/main.tsx">` 載入 |
| 拿掉會怎樣 | 網站還能動，但變成裸 HTML（沒顏色沒排版） | 整個網站空白，`<div id="root">` 永遠是空的 |

**(b)** 啟動鏈：

```
index.html  →  main.tsx  →  App.tsx  →  各頁面元件
                  ↓
            globals.css（順手掛上去的樣式）
```

**(c)** 所以 `globals.css` 不是「被 Vite 自動找到」的，是**有人明確寫了一行 import 才生效**。
這也是為什麼 [[04-4-ITCSS實戰盤點-official-website全域檔]] 裡根目錄那份 `styles/globals.css` 是死檔——沒人 import 它。

---

## 二‧main.tsx 不是「搞 API 用的」

**(d)** API 設定只是它順手做的其中一件事。實測這支 73 行的檔案做了 5 件事：

| 行數 | 做的事 | 屬於 API 嗎 |
|---|---|---|
| L7 | `import './styles/globals.css'` — 唯一讓全站 CSS 生效的一行 | 否 |
| L15–29 | 設定 `OpenAPI.BASE`（後端網址）、`OpenAPI.TOKEN`（從 localStorage 取 JWT） | 是，只有這段 |
| L32 | `initializeAnalytics()` 啟動 GA4 | 否 |
| L36–54 | 監聽 `vite:preloadError`，chunk 載入失敗時自動 reload 一次 | 否 |
| L56–72 | `ReactDOM.createRoot(...).render(...)` 把 React 掛上 `#root`，外層包 Router / Providers / Toaster | 否 |

**(e)** 它真正的身分是「**開機腳本 / bootstrap**」：所有「整個 App 只要做一次」的事都塞在這裡。

**(f)** 判斷某段 code 該不該放 main.tsx 的標準：
> **「這件事是不是全站只做一次、而且要在畫面出現前做完？」**
> 是 → 放 main.tsx；不是 → 放元件或 hook 裡。

API base URL 符合（全站共用、設一次），GA 初始化符合，CSS 載入符合，所以它們都住這。

---

## 三‧順帶學到的兩個實務點

**(g)** Vite 環境變數**必須以 `VITE_` 開頭**才會被編譯進前端。
專案裡這行註解就是踩過坑：只寫 `API_BASE_URL` 的話 Vite 編譯時直接忽略，前端完全抓不到值。
```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
```

**(h)** `OpenAPI.TOKEN` 設成 **async function 而不是字串**，是為了每次發 request 時**即時去 localStorage 讀**。
若設成字串，token 會停在 App 啟動那一刻的值，登入後不會更新。

**(i)** L36–54 的 chunk reload 機制解決的是部署常見問題：使用者停在舊分頁，舊 `index.html` 引用的 hash 檔名已被新版刪掉 →
動態 import 失敗 → 用 `sessionStorage` 旗標**只自動 reload 一次**（避免無限迴圈）取得新版本。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 專案原始碼（本機實測） | `futuresign.official_website/src/main.tsx`、`index.html` | 2026-07-20 |
