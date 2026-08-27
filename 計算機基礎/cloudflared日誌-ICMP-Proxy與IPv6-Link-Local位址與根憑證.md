---
title: cloudflared 日誌讀懂 — ICMP Proxy、IPv6 Link-Local 位址與 Windows 根憑證
type: topic-note
source: Gemini
tags: [gemini, 網路, cloudflare, cloudflared, icmp, ipv6, tls, 憑證, tunnel]
sources:
  - https://gemini.google.com/app/45c17acc390ee1c5
updated: 2026-08-27
---

# cloudflared 日誌讀懂 — ICMP Proxy、IPv6 Link-Local 位址與 Windows 根憑證

本篇重點 a–j，共 10 個

## 重點整理

### 一、ICMP Proxy

a. <mark style="background: #ADCCFF;">ICMP（Internet Control Message Protocol，網際網路控制訊息協定）</mark>是 TCP/IP 家族裡負責傳送「控制與錯誤訊息」的協定，不是拿來傳資料的，`ping` 與 `traceroute` 就是靠它。

b. <mark style="background: #ADCCFF;">ICMP Proxy</mark>指的是「允許把 ICMP 封包透過代理伺服器或通道（Tunnel）轉發」的機制。在 <mark style="background: #ADCCFF;">cloudflared</mark>（Cloudflare Tunnel 的本機代理程式）的日誌中看到它，代表該工具正在啟用 ICMP 代理功能，好讓通道另一端也能對內網主機做連線測試或診斷。

c. <mark style="background: #BBFABB;">實務意義</mark>：有了 ICMP Proxy，你才能從 Cloudflare 這一側 `ping` 到藏在 Tunnel 後面的私有主機，否則 Tunnel 只轉發 TCP / UDP 流量，`ping` 會不通但服務其實是好的。<mark style="background: #FF5582;">看到 ICMP 相關訊息不代表出錯</mark>，它多半只是啟動時的資訊性日誌。

### 二、fe80:: 開頭的那串是什麼

d. 日誌裡出現的 `fe80::...` 這種位址是 <mark style="background: #ADCCFF;">IPv6 的 Link-Local Address（連結本地位址）</mark>，具體用在 Wi-Fi 網路介面上進行 IPv6 通訊。

e. <mark style="background: #FFB8EB;">辨識方法</mark>：IPv6 Link-Local 位址一律落在 `fe80::/10` 這個區段，也就是看到開頭是 `fe80:` 幾乎就可以確定。

f. <mark style="background: #FFF3A3;">它的特性</mark>：只在「同一個網段（同一條實體連結）內」有效，不會被路由器轉送出去，所以不可能從網際網路連到它。每張網卡開機時都會自動產生一個，不需要 DHCP 也不需要手動設定。<mark style="background: #FF5582;">所以在日誌裡看到它不代表你的服務暴露在公網上</mark>。

g. <mark style="background: #D2B3FF;">補充</mark>：因為同一台機器可能有多張網卡都有 `fe80::` 位址，實務上引用它時常需要加上介面代號（Zone ID），例如 `fe80::1%eth0`。

### 三、"original CA for part to specify" 那段警告

h. 那段訊息的意思是：<mark style="background: #FF5582;">在 Windows 系統上，cloudflared 無法自動載入系統內建的根憑證存放區（Root Certificate Store）</mark>。

i. <mark style="background: #ADCCFF;">CA（Certificate Authority，憑證頒發機構）</mark>是簽發 TLS 憑證並被系統信任的第三方；<mark style="background: #ADCCFF;">Certificate Pool（憑證池）</mark>則是程式手上那一份「我信任哪些根憑證」的清單。Linux 上程式通常能直接讀系統的 CA 清單，但 Windows 的憑證存放區是走 Windows API 而不是檔案，Go 語言寫的程式（cloudflared 就是 Go 寫的）因此有機會讀不到。

j. <mark style="background: #BBFABB;">處置方式</mark>：如果需要驗證自訂或企業內部 CA，就手動指定憑證檔案或路徑（cloudflared 常見做法是設定 `--origin-ca-pool` 參數或對應的環境變數，指向一個 PEM 格式的 CA 檔）。若你連的都是公開網站且服務運作正常，這則訊息可以視為警告而非錯誤。

## 關聯筆記（附關聯原因）

- [[Network_and_Gateway_Notes]] — 那篇整理網路與閘道基本概念，本篇的 ICMP 與 Link-Local 位址是同一層（網路層）的具體案例。
- [[DNS查詢-TCP與TLS握手RTT-邊緣節點與網頁效能]] — 本篇 (i) 的 CA 與憑證池，正是那篇 TLS 握手階段用來驗證伺服器身分的東西。
- [[SonarLint憑證警告-CaptivePortal攔截與MITM誤判]] — 同樣是「工具讀不到／不信任某張憑證」的排查情境，兩篇可以互相對照排除方向。
- [[AWS-MFA登入PIN找回與Google-PIN區分]] — 同屬「看到陌生安全性訊息時怎麼判斷是警告還是錯誤」的心法。

## 各對話來源（原文）

### ICMP Proxy 概念解析（2026-08-27）— https://gemini.google.com/app/45c17acc390ee1c5

使用者：ICMP proxy 是什麼？

Gemini：ICMP proxy 是允許將 ICMP 封包，也就是常用來測試網路連線的 ping 指令封包，透過代理伺服器或通道轉發。在 cloudflared 的日誌中，這表示該工具正使用 ICMP proxy 功能進行連線測試或診斷。

使用者：fe80::...:BBD:...:30 是什麼？

Gemini：這是一個 IPv6 的位址，具體來說，是 Link-Local Address，用在 Wi-Fi 網路介面上進行 IPv6 的通訊。

使用者：他叫什麼用 original CA for part to specify，強調這個 part to the certificate pool 是什麼意思？

Gemini：這段訊息的意思是，在 Windows 系統上，cloudflared 無法自動載入系統的根憑證。如果有需要，你必須手動指定憑證存放的路徑或檔案。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/45c17acc390ee1c5 | 2026-08-27 擷取 |
| Cloudflare 官方文件 — Cloudflare Tunnel（cloudflared） | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/ | 2026-08-27 查證 |
| RFC 4291 — IP Version 6 Addressing Architecture（fe80::/10 Link-Local 定義） | https://datatracker.ietf.org/doc/html/rfc4291#section-2.5.6 | 2006-02 發布，2026-08-27 查證 |
| RFC 792 — Internet Control Message Protocol | https://datatracker.ietf.org/doc/html/rfc792 | 1981-09 發布，2026-08-27 查證 |
| Go 官方文件 — crypto/x509 SystemCertPool（Windows 行為說明） | https://pkg.go.dev/crypto/x509#SystemCertPool | 2026-08-27 查證 |
