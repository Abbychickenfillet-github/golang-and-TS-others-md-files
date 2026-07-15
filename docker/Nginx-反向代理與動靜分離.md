---
title: Nginx、反向代理與動靜分離
type: topic-note
source: Gemini
category: 技術
tags: [gemini, nginx, proxy, docker, 前後端架構, web伺服器]
sources:
  - https://gemini.google.com/app/7d15064578a8c2f4
updated: 2026-06-26
---

# Nginx、反向代理與動靜分離

## 重點整理

### Nginx 的「多重身份」
Nginx 在同一份設定檔（`nginx.conf`）裡可以同時扮演兩個角色：

- <mark style="background: #ADCCFFA6;">靜態網頁伺服器（Web Server）</mark>：請求索取 `index.html`、圖片等檔案時，直接從硬碟把檔案送出去。
- <mark style="background: #ADCCFFA6;">反向代理（Reverse Proxy）</mark>：請求是「查資料庫 / 登入」等動態邏輯時，Nginx 自己處理不了，於是把請求<mark style="background: #FFF3A3A6;">轉發給後端容器</mark>（Node.js、Python…）。

> 把前端打包好的檔案放進 Nginx，不代表 Nginx 變成後端。Nginx 像是<mark style="background: #FFF3A3A6;">派送貨物的卡車</mark>，只負責把檔案送出去，本身不生產內容（不執行後端邏輯）。

### 反向代理是「每次」都會運行嗎？
<mark style="background: #FF5582A6;">不一定</mark>，取決於路由規則（routing rules）。在 `nginx.conf` 裡依路徑分流：

| 情境 | 路徑 | Nginx 行為 | 反向代理是否觸發 |
|---|---|---|---|
| 請求靜態資源 | `example.com/` | 直接回傳 HTML 檔案 | 否 |
| 請求 API 資料 | `example.com/api/login` | 轉發給後端 API 容器 | 是 |

這種「<mark style="background: #BBFABBA6;">動靜分離</mark>」設計：靜態檔案像不動的裝潢、由 Nginx 直接送；動態請求才轉給後端現場製作。

### `.conf` 是什麼
<mark style="background: #ADCCFFA6;">`.conf` = Configuration（設定檔／配置檔案）</mark>。讓軟體在<mark style="background: #FFF3A3A6;">不改原始碼</mark>的情況下改變運作行為；程式「啟動時」會先讀取它，決定 Port、資料路徑、允許的使用者等。

- 常見：`nginx.conf`（流量轉發/靜態檔位置）、`resolv.conf`（DNS）、`sysctl.conf`（核心參數）。
- 現代等價替代：`.yaml`/`.yml`（如 `docker-compose.yml`，可讀性高）、`.json`、`.ini`、`.env`（放環境變數/密碼）。

### Proxy（代理伺服器）是什麼
Proxy 是一個<mark style="background: #D2B3FFA6;">技術概念／功能角色（中間人）</mark>，<mark style="background: #FF5582A6;">不是某一間公司的產品</mark>。就像「汽車」是概念、Toyota 才是產品；「保全」是職位、Nginx 是某家公司派來的明星保全。

實作 Proxy 的常見軟體：<mark style="background: #BBFABBA6;">Nginx</mark>（最受歡迎的反向代理，由 Nginx 公司開發、後被 F5 收購）、Apache、Squid（專做正向代理＋快取）、HAProxy（高效能負載平衡）。

核心價值：隱私（隱藏真實 IP）、安全（第一線防火牆）、效能（<mark style="background: #FFF3A3A6;">快取 Cache</mark> 減少重複請求）。

### 正向代理 vs 反向代理
| 類型 | 方向 | 誰知道它存在 | 主要用途 |
|---|---|---|---|
| 正向代理 Forward Proxy | 使用者 → Proxy → 網路 | 使用者<mark style="background: #FFB8EBA6;">主動設定</mark> | 翻牆、隱藏身份、企業內部管控 |
| 反向代理 Reverse Proxy | 網路 → Proxy → 後端伺服器 | 使用者<mark style="background: #FFB8EBA6;">不知道</mark>（以為它就是目標網站） | Nginx 主打：負載平衡、保護後端、SSL 加密 |

### 為什麼 Proxy 能省資源？
盲點是<mark style="background: #FF5582A6;">以為每個人各自在自己電腦架 Proxy</mark>——那樣確實無法省資源。能省資源的 Proxy 是<mark style="background: #BBFABBA6;">很多人共用同一台</mark>、且架在伺服器端：100 個同事共用機房裡一台高效能 Proxy，<mark style="background: #FFF3A3A6;">第一個人抓過的熱門頁面會被快取</mark>，後面的人直接從快取拿，不必再跑一次網際網路。

### 靜態 vs 動態：關鍵不在「有沒有 JS」
- 「靜態」指的是<mark style="background: #FFF3A3A6;">伺服器端的行為</mark>：伺服器只是「檔案夾」，你要 `index.html` 它就原封不動丟給你，不跑程式、不查資料庫組裝內容。
- <mark style="background: #BBFABBA6;">靜態網頁絕對可以有 JS</mark>——那個 JS 是傳到瀏覽器（Client）後才執行的（動畫、AJAX/Fetch）。只要伺服器端是「單純傳檔案」，架構上仍算靜態。
- 純靜態：每個使用者拿到的檔案<mark style="background: #FFF3A3A6;">一模一樣</mark>。動態：伺服器跑 PHP/Node.js → 查資料庫 → 把資料塞進 HTML 模板 → 產出「<mark style="background: #FFF3A3A6;">專屬於你</mark>」的 HTML（例如登入後的 Facebook）。
- 因此用「有無 JS」分辨純不純靜態並不準確——判準是<mark style="background: #FFF3A3A6;">「誰在組裝內容」</mark>（伺服器 vs 瀏覽器）。

## 各對話來源

### Docker 與 Nginx 的關係（2026-06）— https://gemini.google.com/app/7d15064578a8c2f4

**使用者：** 為什麼是把前端打包好的答案放到 Nginx 裡面，可是它又是屬於後端的服務？

**Gemini：** 雖然把前端檔案放到 Nginx 裡，但 Nginx 本身是個網頁伺服器，工作是把檔案送出去，並不算執行後端邏輯。前端打包好的檔案就像一堆貨物，Nginx 就是負責派送貨物給使用者的卡車，卡車本身不生產貨物。

**使用者：** 但網頁伺服器的時候它有身兼反向代理嗎？反向代理是每次都會運行的嗎？

**Gemini：** 要釐清 Nginx 的多重身份與請求路徑。①Nginx 既是「檔案保管員」（靜態伺服器，直接從硬碟拿檔）也是「交通警察」（反向代理，把處理不了的請求轉發給後端容器）。②反向代理不一定每次運行，取決於路由規則：請求 `/` 拿靜態 HTML 時不觸發；請求 `/api/login` 時啟動反向代理轉給後端。③這樣設計是為了「動靜分離」。

**使用者：** `.conf` 是什麼縮寫？

**Gemini：** Configuration 的縮寫，中文「設定檔／配置檔案」。讓軟體不改原始碼就能改變行為，程式啟動時讀取，決定 Port、資料儲存位置、允許的使用者。常見 `nginx.conf`、`resolv.conf`、`sysctl.conf`；替代副檔名 `.yaml/.yml`、`.json`、`.ini`、`.env`。

**使用者：** Proxy 是什麼？

**Gemini：** Proxy Server＝代理伺服器，是「中間人／代辦處」。核心功能：①隱藏身份（對方只看到 Proxy 的 IP）②快取加速（熱門頁面暫存，第二人直接拿）③過濾防火牆（擋社群網站）。兩種類型：正向代理（使用者主動設定出去，翻牆/管控）、反向代理（使用者不知存在，Nginx 主打：負載平衡、保護後端、SSL）。

**使用者：** 靜態是不是只讀取資料庫、甚至沒有資料庫直接寫死在頁面上的？用「有無 JS」分辨純靜態怪怪的；靜態網頁跟 Next.js 框架有關係嗎？

**Gemini：** 靜態網頁絕對可以有 JS。「靜態」指伺服器端的行為（單純傳檔案）；JS 是傳到瀏覽器後才執行。純靜態每人看到一樣；動態由伺服器跑程式、查資料庫、現場組裝專屬 HTML。判準是「誰在組裝內容」。

**使用者：** 我還是不知道 Proxy 是什麼。

**Gemini：**（生活化比喻）Proxy 就像公司老闆的「貼身秘書」——你不必事事親力親為，由秘書代你出門辦事、過濾訪客、把跑過的腿記下來下次更快。

**使用者：** Proxy 是哪一間公司的產品嗎？

**Gemini：** 不是。Proxy 是網路技術的概念/功能角色，不是單一品牌。實作產品有 Nginx、Apache、Squid、HAProxy。比喻：Proxy 像「保全」職位，Nginx 是某保全公司派來的明星保全。

**使用者：** 如果每個人都要個別架設 Proxy，那為什麼可以節省資源、剛剛開過的就不用再開？

**Gemini：** 盲點是「以為 Proxy 是每個人在自己電腦上架」。能省資源的 Proxy 是「很多人共用同一台」或架在伺服器端：辦公室 100 人共用機房一台高效能 Proxy，熱門頁面被快取後，後面的人直接拿快取。
