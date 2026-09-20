---
title: "Cloudflare Tunnel 連線失敗——localhost 被解析成 IPv6 的 ::1，改用 127.0.0.1"
type: topic-note
source: Gemini
category: tech
tags: [gemini, cloudflare, tunnel, 網路, ipv6, localhost, 部署, 除錯]
sources:
  - https://gemini.google.com/app/0f25c0c06deebd4e
updated: 2026-09-15
---

# Cloudflare Tunnel 連線失敗——`localhost` 被解析成 IPv6 的 `::1`，改用 `127.0.0.1`

> 本篇重點 a–k，共 11 個。
> 關聯筆記：[[Zeabur-PostgreSQL公網曝露-unsupported-frontend-protocol日誌與關閉Public-Networking]]（同樣是「把本機服務暴露到公網」的風險面）、[[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]]（dev server 綁在哪個位址）、[[ICMP Proxy 概念解析]]（log 裡出現的 ICMP proxy 是什麼）。
> 關聯的原因：Tunnel 做的事就是「把一台只聽 127.0.0.1 的 dev server 接到公網」，所以「dev server 綁在哪」與「公網曝露的風險」是同一件事的前後兩端。

## 一、錯誤現場

```text
2026-09-12T15:47:18Z ERR error="Unable to reach the origin service. The service may be down
or it may not be responding to traffic from cloudflared:
dial tcp [::1]:3001: connectex: No connection could be made because the target machine actively refused it."
connIndex=0 event=1 ingressRule=0 originService=http://localhost:3001
```

<mark style="background: #FFF3A3A6;">**核心原因：Cloudflare Tunnel 連得上 Cloudflare，只是連不到你本機的服務。**</mark>

(a) **`[::1]:3001`**：`::1` 是 IPv6 的 loopback 位址（等同 IPv4 的 `127.0.0.1`）。`cloudflared` 把你給的 `localhost` 解析成 IPv6 了。
(b) **`connectex: ... actively refused it`**：目標機器「明確拒絕」。這句話的意思不是防火牆擋掉（那會 timeout），而是 <mark style="background: #ADCCFF62;">**那個 port 上根本沒有任何程式在監聽**</mark>，作業系統直接回了一個 TCP RST。
(c) **兩個可能**：服務根本沒啟動，或者服務只綁在 IPv4 的 `127.0.0.1` 而沒有同時監聽 IPv6 的 `::1`。

## 二、為什麼 `localhost` 有時是 IPv4、有時是 IPv6

(d) `localhost` 只是一個**名字**，要經過名稱解析才會變成位址。在 Windows 的 `C:\Windows\System32\drivers\etc\hosts` 裡，`localhost` 同時對應 `127.0.0.1`（IPv4）與 `::1`（IPv6）。
(e) 到底走哪一個，由 client 的解析順序決定；Windows 與新版 Node 都**偏好 IPv6 優先**，所以 `cloudflared` 先試 `::1`。
(f) 很多 Node／Next.js dev server 預設只 bind 在 `127.0.0.1`，於是就出現「瀏覽器打 `http://localhost:3001` 正常（瀏覽器會 fallback 到 IPv4），但 `cloudflared` 打不到」的錯覺。

## 三、解法

```bash
# 解法一：直接指定 IPv4，最快也最穩
cloudflared tunnel --url http://127.0.0.1:3001
```

(g) **解法一：把 `localhost` 換成 `127.0.0.1`**，跳過名稱解析，直接走 IPv4。
(h) **解法二：確認服務真的活著**，先在瀏覽器開 `http://127.0.0.1:3001` 確認頁面出得來，再開 tunnel。
(i) **解法三：讓服務同時監聽兩個 stack**，例如 Next.js 用 `next dev -H 0.0.0.0`（`0.0.0.0` 是「所有 IPv4 介面」；要同時吃 IPv6 需用 `::`）。

## 四、順手讀懂 log 裡的其他行

| Log 行 | 在講什麼 |
| --- | --- |
| `CONNECTIVITY PRE-CHECKS ... SUMMARY: Environment is healthy` | cloudflared 對 `region1/2.v2.argotunnel.com` 做過 DNS、UDP(QUIC)、TCP(HTTP/2) 三種預檢，全 PASS，代表**對外**沒問題 |
| `Initial protocol quic` | 這條 tunnel 走 QUIC（UDP 上的 HTTP/3），不是傳統 TCP |
| `Registered tunnel connection ... location=tpe01` | 已經成功註冊到 Cloudflare 台北（tpe01）邊緣節點 |
| `ICMP proxy will use 192.168.0.31 as source for IPv4` | cloudflared 會代理 ping 這類 ICMP 封包，用這張網卡當來源 |
| `cloudflared does not support loading the system root certificate pool on Windows` | Windows 上要驗證 origin 的 TLS 憑證得自己給 `--origin-ca-pool`，對純 HTTP 的本機服務沒影響 |
| `Thank you for trying Cloudflare Tunnel ... no uptime guarantee` | `trycloudflare.com` 的 quick tunnel 是免登入臨時通道，**沒有可用性保證**，正式環境要用 named tunnel |

(j) **預檢全 PASS 卻仍失敗**，就可以直接斷定問題在「本機 origin 端」而不是網路端——這是這份 log 最有價值的診斷資訊。

> [!warning] ⚠️ 安全提醒（Gemini 沒提）
> `cloudflared tunnel --url` 產生的 `https://xxx.trycloudflare.com` 是**任何人都打得開的公開網址**，沒有驗證。開發中的 `.env`、後台頁面、資料庫管理介面都會跟著曝露。
> (k) 用完請**立刻 Ctrl+C 關掉**，需要長期分享請改用 named tunnel 並掛 Cloudflare Access 做身分驗證。

## 五、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| 本篇原始對話（Gemini） | https://gemini.google.com/app/0f25c0c06deebd4e | 對話擷取 2026-09-15；cloudflared 版本 2026.7.2 |
| Cloudflare Tunnel — quick tunnel 的限制 | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/ | Cloudflare docs，查證 2026-09-15 |
| Cloudflare Tunnel — 建立 named tunnel | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/ | Cloudflare docs，查證 2026-09-15 |
| RFC 4291 §2.5.3 IPv6 loopback `::1` | https://datatracker.ietf.org/doc/html/rfc4291#section-2.5.3 | IETF，1998/2006，查證 2026-09-15 |
| Node.js DNS `verbatim` 與 IPv6 優先 | https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder | Node 官方，查證 2026-09-15 |
