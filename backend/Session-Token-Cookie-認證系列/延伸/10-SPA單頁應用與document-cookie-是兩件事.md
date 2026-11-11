---
title: SPA 單頁應用與 document.cookie：不同層次的兩件事
type: topic-note
source: Gemini
tags: [gemini, spa, cookie, csr]
sources:
  - https://gemini.google.com/app/050acb4c675805ef
updated: 2026-11-01
---

# SPA 單頁應用與 document.cookie：不同層次的兩件事

## 重點整理

本篇重點 a–d，共 4 個

(a) SPA（Single Page Application，單頁應用程式）
  瀏覽器一次下載 HTML、JavaScript、CSS。之後操作只透過 JS 向 API 取資料並動態更新畫面，不重新載入整頁。

(b) document.cookie 由 JS 讀寫
  document.cookie 是瀏覽器提供的屬性，JS 可讀取或設定 cookie。cookie 用來存小量資料，常見用途是身分驗證與偏好。

(c) 兩者負責的功能不同
  SPA 資料更新＝呼叫 API 取新資料再渲染；document.cookie＝在瀏覽器存小量狀態。「都用 JS」是實作手段相同，但不是同一個概念。

(d) ⚠️ 與 Docker 無關
  對話中把 cookie 誤聽成 Docker（語音輸入），Gemini 也只回「Docker 用來打包執行應用程式」。Cookie 不屬於 Docker。

## 自我測驗

- Q：SPA 如何更新畫面？
  - A：JS 向 API 取資料並動態更新，不整頁重載。
- Q：document.cookie 與 SPA 資料更新是同一件事嗎？
  - A：不是，一個存小量狀態，一個取資料渲染。

## 各對話來源（原文摘要）

使用者：（語音）Single Page Application 是什麼？
Gemini：一次下載 HTML、JS、CSS，之後以 JS 動態更新資料。
使用者：跟 Docker 裡的 Cookie 一樣嗎？我說 document.cookie，也是用 JS 嗎？跟 CSR SPA 一樣意思嗎？
Gemini：document.cookie 由 JS 讀寫，但概念不同：cookie 存小量資料，SPA 更新是取 API 資料並渲染。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| MDN: SPA | https://developer.mozilla.org/en-US/docs/Glossary/SPA | 引用自 Gemini 對話（2026-11-01），本次未重新核對 |
| MDN: document.cookie | https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie | 同上 |
| Gemini 對話 | https://gemini.google.com/app/050acb4c675805ef | 擷取於 2026-11-01 |
