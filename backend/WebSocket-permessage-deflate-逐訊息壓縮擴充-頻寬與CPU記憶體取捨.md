---
title: WebSocket permessage-deflate：逐訊息壓縮擴充（頻寬 vs CPU／記憶體取捨）
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - websocket
  - permessage-deflate
  - 壓縮
  - ws
sources:
  - https://gemini.google.com/app/4f5fe7db1c1f0da2
related:
  - "[[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]]"
  - "[[使用者線上狀態怎麼做-WebSocket心跳與Redis-PageVisibility與Idle偵測]]"
updated: 2026-10-25
---

# WebSocket permessage-deflate：逐訊息壓縮擴充

本篇重點 a–f，共 6 個

## 重點整理

**(a) 它是什麼**：permessage-deflate 是 WebSocket 協定的一個<mark style="background: #ADCCFFA6;">壓縮擴充（Extension）</mark>。client 與 server 在握手時協商，雙方都支援才生效。生效後每則訊息的 payload 會先用 DEFLATE 演算法（與 gzip 同源）壓縮再傳，收到後再解壓縮。

**(b) 名稱怎麼讀**：<mark style="background: #FF5582A6;">⚠️ 更正：原提問把它理解成「每個訊息阻止膨脹」是誤譯</mark>。`per-message` ＝ 以「每一則訊息」為單位，`deflate` ＝ 壓縮（相反詞是 inflate ＝ 解壓縮還原）。合起來是「逐訊息壓縮」，目的是省頻寬，不是在防記憶體膨脹。

**(c) 誰用什麼做什麼**：client 在握手的 `Sec-WebSocket-Extensions` 標頭提出 `permessage-deflate` → server 回覆接受 → 之後 sender 用 zlib 把每則訊息壓縮 → 拋給對端 → receiver 用 zlib inflate 還原成原訊息。

**(d) ws 套件的預設值**（Node.js 的 `ws` 函式庫）：<mark style="background: #FFF3A3A6;">server 預設關閉、client 預設開啟</mark>。client 只有在 server 也支援並啟用時才會真的壓縮。要關 client 端用 `perMessageDeflate: false`。

**(e) 取捨**：
- 好處：傳大量 JSON 或文字時大幅省頻寬。
- 代價：壓縮與解壓縮都吃額外 CPU 與記憶體。

**(f) 風險與建議**：<mark style="background: #FF5582A6;">Node.js 在高併發＋啟用壓縮時，特別是 Linux，可能造成記憶體碎裂（memory fragmentation）與效能下降</mark>。ws 官方建議：<mark style="background: #BBFABBA6;">只在頻寬真的受限時啟用，上線前用貼近正式環境的負載測過</mark>。

```js
// ws 套件：server 端明確開啟（預設是關的）
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({
  port: 8080,
  perMessageDeflate: {
    threshold: 1024, // 小於 1KB 的訊息不壓縮，省 CPU
  },
});
```

## 各對話來源

### permessage-deflate 擴充功能解析（2026-10-25）— https://gemini.google.com/app/4f5fe7db1c1f0da2

使用者：這是什麼意思 permessage-deflate extension 每個訊息阻止膨脹的擴充套件？

Gemini：permessage-deflate 是 WebSocket 的訊息壓縮擴充，deflate 是與 gzip 同底層的壓縮演算法，用來減少頻寬。「膨脹」是指資料體積變大，deflate 的相反詞是 inflate。ws 預設 server 關、client 開，需雙方啟用才生效。壓縮耗 CPU 與記憶體，高併發的 Linux 上可能記憶體碎裂，建議頻寬受限才啟用。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/4f5fe7db1c1f0da2 | 2026-10-25 |
| ws 預設值、效能與記憶體碎裂警告 | https://github.com/websockets/ws#websocket-compression | ws README，2026-10-25 查證，與 Gemini 說法一致 |
| 擴充規格（握手協商、DEFLATE 逐訊息壓縮） | https://datatracker.ietf.org/doc/html/rfc7692 | RFC 7692（2015），本次依一般知識引用，未重新爬取 |
