---
title: Zeabur PostgreSQL 公網曝露 — unsupported frontend protocol 日誌與關閉 Public Networking
type: topic-note
source: Gemini
tags: [gemini, zeabur, postgresql, 資安, port-scanning, deployment, runtime-logs]
aliases: [unsupportedfrontendprotocol, 資料庫被掃描, Zeabur公網]
related:
  - "[[Zeabur-主機遷移-DeepSeek-API與費用比較]]"
  - "[[ClickFix社交工程攻擊-假驗證碼誘騙貼上PowerShell與網站被注入的處置]]"
  - "[[PostgreSQL-Checkpoint與SIGTERM-Docker停止機制]]"
  - "[[DigitalOcean-vs-GCP-主機選型與PostgreSQL部署]]"
sources:
  - https://gemini.google.com/app/b5e9234f61127c34
updated: 2026-09-05
---

# Zeabur PostgreSQL 公網曝露 — unsupported frontend protocol 日誌與關閉 Public Networking

> [!info]- 🔗 與既有筆記的關聯
> (1) [[ClickFix社交工程攻擊-假驗證碼誘騙貼上PowerShell與網站被注入的處置]] 是「網站被注入之後怎麼處置」，本篇是同一次資安排查的另一條線：<mark style="background: #FFF3A3A6;">先分清楚「這是攻擊成功的痕跡」還是「攻擊被擋下的痕跡」</mark>，判斷錯了會白緊張或白放心。
> (2) [[Zeabur-主機遷移-DeepSeek-API與費用比較]] 記的是 Zeabur 平台本身的使用經驗，本篇補的是它的網路設定面。
> (3) [[PostgreSQL-Checkpoint與SIGTERM-Docker停止機制]] 講的是同一顆資料庫的另一種日誌解讀，兩篇合起來是「PostgreSQL 日誌怎麼看」的上下集。

> 本篇重點 a–i，共 9 個。

## 重點整理

### 一、先看對地方：Runtime Logs 不是 Deployment 歷史（a–c）

(a) <mark style="background: #FF5582A6;">查「有沒有人偷偷部署過」要看的是 Deployments 分頁，不是 Runtime Logs</mark>。Runtime Logs 是<mark style="background: #ADCCFFA6;">服務執行期間的運行日誌</mark>，裡面不會有部署紀錄。

(b) <mark style="background: #BBFABBA6;">在 Zeabur 查部署歷史的步驟</mark>：點左上角 ← Back 回到該服務主頁 → 點 <mark style="background: #ADCCFFA6;">Deployments</mark> 分頁 → 在清單中檢查有沒有<mark style="background: #FF5582A6;">非你發起的 commit、不認識的 Git Hash、或標記為 Redeploy／Triggered manually 的時間點</mark>。

(c) <mark style="background: #FFF3A3A6;">判斷「帳號是否被入侵」的關鍵證據是「有沒有你不認識的部署」</mark>，不是「有沒有奇怪的連線日誌」。<mark style="background: #D2B3FFA6;">連線日誌天天都有奇怪的東西，那是網際網路的常態。</mark>

### 二、那兩行 FATAL 到底是什麼（d–f）

(d) 看到的日誌長這樣：

```
FATAL: unsupported frontend protocol 27265.28208: server supports 3.0 to 3.0
FATAL: invalid length of startup packet
```

(e) <mark style="background: #BBFABBA6;">這是「攻擊被擋下」的紀錄，不是你程式的錯誤</mark>。<mark style="background: #ADCCFFA6;">PostgreSQL 前端通訊協定只支援 3.0</mark>，當外部自動化掃描器（Bot）拿隨機位元組、HTTP 請求或 TLS 握手封包來戳你的資料庫 Port，PostgreSQL 解讀出來的「協定版本」就會是 `27265.28208` 這種亂數，於是<mark style="background: #BBFABBA6;">直接拋 FATAL 拒絕連線並關閉 session</mark>。

(f) <mark style="background: #FFF3A3A6;">關鍵判讀：FATAL ＋ 連線被關閉 ＝ 對方沒進來</mark>。<mark style="background: #FF5582A6;">真正該擔心的是成功登入的紀錄（例如 `connection authorized`）</mark>，而不是這種被拒絕的雜訊。

### 三、根治方法（g–i）

(g) <mark style="background: #BBFABBA6;">最有效的處置是「不要讓資料庫出現在公網上」</mark>：到 Zeabur 的資料庫設定關閉 <mark style="background: #ADCCFFA6;">Public Networking</mark>（對外公開的 Port 綁定），改成只用專案內網連線。<mark style="background: #FFF3A3A6;">沒有公網 Port 就沒有掃描流量，這比事後封鎖 IP 有效太多。</mark>

(h) <mark style="background: #FF5582A6;">只有在你真的需要從本機用 DBeaver／HeidiSQL 連線時才需要公網 Port</mark>。這種需求應該用臨時開啟或 SSH／VPN 通道處理，<mark style="background: #FF5582A6;">不要為了方便就長期讓 5432 對全世界開著</mark>。

(i) <mark style="background: #D2B3FFA6;">附帶好處</mark>：關掉公網後日誌會乾淨很多，之後再出現異常連線就真的值得查，不會淹沒在每天幾千筆的掃描雜訊裡。

## 各對話來源（原文摘要）

### 查詢 Zeabur 異常部署紀錄（2026-09-05）— https://gemini.google.com/app/b5e9234f61127c34

**使用者：** 你看得到我這裡有什麼不認識的 deployment 時間點嗎？就沒有我正常的 commit 訊息那一種。（並附上懷疑帳號被入侵的排查方向）

**Gemini：** 指出當下畫面是 PostgreSQL 服務的 Runtime Logs 不是 Deployment 歷史，並給出到 Deployments 分頁的查看步驟。

**使用者：** 貼上 `FATAL: unsupported frontend protocol 27265.28208` 兩行問是什麼問題。

**Gemini：** 說明是外部掃描器對資料庫 Port 的探測，PostgreSQL 已擋下；建議關閉 Public Networking 從根本消除。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/b5e9234f61127c34 | Gemini Flash，2026-09-05 |
| PostgreSQL — Frontend/Backend Protocol（僅 3.0） | https://www.postgresql.org/docs/current/protocol.html | PostgreSQL 現行文件，2026-09-05 查證 |
| PostgreSQL — Error Reporting and Logging | https://www.postgresql.org/docs/current/runtime-config-logging.html | PostgreSQL 現行文件，2026-09-05 查證 |
| Zeabur — Public Networking 設定 | https://zeabur.com/docs/deploy/domain-binding | Zeabur 現行文件，2026-09-05 查證 |
| OWASP — Network Segmentation / 不要曝露資料庫 | https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html | OWASP Cheat Sheet 現行版，2026-09-05 查證 |

## 練習題（LeetCode／NeetCode 對照）

本篇屬於維運與資安排查，LeetCode／NeetCode 沒有對應題型。想練「從大量日誌裡挑出真正異常」的手感，可以做 <mark style="background: #D2B3FFA6;">LeetCode 1188 / 359 Logger Rate Limiter</mark>（https://leetcode.com/problems/logger-rate-limiter/ ，Premium）——重點都在「重複雜訊要被壓掉，真正的事件才浮得出來」。

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| ClickFix社交工程攻擊-假驗證碼誘騙貼上PowerShell與網站被注入的處置 | 同一次資安排查的另一條線，那篇是「真的被入侵」的處置 |
| Zeabur-主機遷移-DeepSeek-API與費用比較 | 同一個平台的使用經驗 |
| PostgreSQL-Checkpoint與SIGTERM-Docker停止機制 | PostgreSQL 日誌解讀的另一半 |
| DigitalOcean-vs-GCP-主機選型與PostgreSQL部署 | 自架資料庫時同樣要處理公網曝露問題 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
