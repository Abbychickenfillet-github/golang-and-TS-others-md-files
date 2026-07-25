---
title: Live Server 為什麼要「開一個本地伺服器」？—— file:// 協定的限制
type: concept-note
tags: [live-server, http-server, file-protocol, cors, localhost, 開發環境]
updated: 2026-07-24
---

# Live Server 幫你開的「本地伺服器」在解決什麼問題

## 不用 Live Server，直接雙擊 html 會怎樣

直接雙擊 `.html` 檔案，瀏覽器網址列會顯示：

```
file:///C:/coding/JavaScript-practicing/object-static-methods.html
```

這是 **`file://` 協定**，不是 `http://`。用這個協定打開的網頁會遇到幾個實際限制：

1. **`fetch()` / `XMLHttpRequest` 對本機檔案的請求常被瀏覽器擋下**——瀏覽器把 `file://` 視為沒有「來源（origin）」的特殊狀態，跨檔案抓資料會被 CORS 規則擋掉。相關機制見 [[XMLHttpRequest-CORS-explanation]]。
2. **ES Module `import`/`export` 在 `file://` 下大多瀏覽器直接拒絕載入**（Chrome 會報 `CORS request not http`），因為 module loader 規定 module script 必須經由 http(s) 抓取。
3. **相對路徑行為不一致**：某些瀏覽器對 `file://` 底下的相對路徑解析跟 `http://` 不完全一樣，容易出現「本機打得開、部署後打不開」的假象或反過來。
4. **沒有「存檔自動刷新」**：純雙擊開檔案，改完程式碼還要手動切回瀏覽器按重新整理。

## Live Server 做的事：起一個真正的 HTTP 伺服器

Live Server 類擴充套件（`ritwickdey.liveserver`、`ms-vscode.live-server`…）本質上就是在你電腦上跑一個**輕量 HTTP server**，把你的專案資料夾當成網站根目錄提供出去：

```
你的資料夾 (C:\coding\JavaScript-practicing)
        │  Live Server 把它掛成
        ▼
http://127.0.0.1:5500/object-static-methods.html
```

這樣瀏覽器拿到的網址就是**正常的 `http://` 來源**，跟部署到正式主機後的行為一致，`fetch`、`import`、CORS 規則全部照真實情境跑，不會有 `file://` 那些特例陷阱。

## 「Live」（自動刷新）是怎麼做到的

Live Server 在回傳的 html 裡**偷偷注入一小段 JavaScript**，這段程式碼跟伺服器維持一條 **WebSocket** 連線；伺服器監看你的專案資料夾，只要偵測到檔案存檔（改動），就透過這條 WebSocket 通知瀏覽器「該重新整理了」，瀏覽器收到通知就自動 reload（或做更細緻的 CSS/局部熱更新）。這也是為什麼 `netstat` 看得到它佔用一個 port（例如 5500）在 `LISTENING`——因為它真的是一個常駐的伺服器行程，不是單純的檔案總管功能。

## 一句話總結

> Live Server ＝「幫你把 `file://` 變成 `http://`，順便裝一個存檔自動通知瀏覽器重整的小廣播」。

## 相關筆記
- [[XMLHttpRequest-CORS-explanation]] —— CORS 與同源政策細節
- [[2026-06-02-Dev-Server-功能與價值]] —— Vite 等打包工具的 Dev Server 概念（跟 Live Server 目的相近，但多了打包/HMR）
- [[vscode-live-server-打不開-擴充套件衝突]]
