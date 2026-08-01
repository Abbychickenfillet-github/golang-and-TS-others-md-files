---
title: CloudFront：CDN 概念與快取失效（Invalidation）
type: topic-note
source: Gemini
tags: [gemini, aws, cloudfront, cdn, deployment]
sources:
  - https://gemini.google.com/app/c915b2a2a74e2322
updated: 2026-07-27
---

# CloudFront：CDN 概念與快取失效

本篇重點 a–f，共 6 個

## 重點整理

a. Amazon CloudFront 是一種 <mark style="background: #ADCCFFA6;">內容傳遞網路（Content Delivery Network, CDN）</mark>服務，透過全球分佈的資料中心，把網站的靜態與動態內容（HTML、CSS、JS、圖片、影片）更快傳送到使用者手中。

b. 比喻：把 CloudFront 想成連鎖店的「地區倉庫」——東西都放在美國總部配送會很久，但各城市有小倉庫（節點）就能直接從最近的門市取貨。

c. 核心運作機制三步驟：
   1. <mark style="background: #FFF3A3A6;">快取（Caching）</mark>：第一位使用者請求資源時，CloudFront 從原始伺服器（Origin，如 S3 或 EC2）抓取內容，存放在該地區的邊緣節點（Edge Location）。
   2. <mark style="background: #FFF3A3A6;">低延遲（Low Latency）</mark>：同地區使用者再請求同一內容時，直接由邊緣節點提供，不需回到遠端原始伺服器。
   3. <mark style="background: #FFF3A3A6;">負載分擔</mark>：減輕原始伺服器壓力，大部分流量被 CDN 節點攔截處理。

d. 三個核心概念：

| 名詞 | 定義 |
|---|---|
| Origin（源站） | 存放原始檔案的地方，通常是 S3 貯存桶或 HTTP 伺服器 |
| Edge Location（邊緣節點） | 遍佈全球的快取伺服器節點 |
| Distribution（分配） | CloudFront 的基本配置單位，定義域名與源站的對應關係 |

e. 主要優勢：加速靜態資源（縮短網頁載入時間）、安全防護（與 AWS Shield / AWS WAF 整合防禦 DDoS）、內建 HTTPS/SSL/TLS 憑證管理、適合影音串流的大規模內容分發。

f. <mark style="background: #FF5582A6;">常見陷阱：快取不會自動更新</mark>。更新源站檔案後，CloudFront 上的快取不會立刻反映最新內容；要強制同步需要執行 <mark style="background: #FF5582A6;">Invalidation（快取失效）</mark>，但頻繁執行可能產生額外費用，需權衡更新頻率與成本。

## 自我測驗

1. （填空題）CloudFront 的三個核心概念是：______（存放原始檔案）、______（全球快取節點）、______（域名與源站對應的配置單位）。
   答案：||Origin 源站；Edge Location 邊緣節點；Distribution 分配||
2. （是非題）更新 S3 上的原始檔案後，CloudFront 邊緣節點的快取內容會立刻自動更新。
   答案：||✗。快取不會立刻更新，需要手動執行 Invalidation（快取失效）才能強制同步，且頻繁執行可能產生額外費用。||
3. （申論題）為什麼 CloudFront 能降低原始伺服器（Origin）的負載壓力？
   答案：||因為使用者的請求大多由地理位置最近的邊緣節點（Edge Location）直接用快取內容回應，不需要每次都回源到原始伺服器，等於把大部分重複性流量攔截在 CDN 節點，只有第一次請求或快取過期時才會真正打到 Origin。||

## 與既有筆記的關聯

- 與 [[deployment/Zeabur-主機遷移-DeepSeek-API與費用比較|Zeabur-主機遷移-DeepSeek-API與費用比較]]、[[deployment/DigitalOcean-vs-GCP-主機選型與PostgreSQL部署|DigitalOcean-vs-GCP-主機選型與PostgreSQL部署]] 相關：都屬於「主機/部署層級」的基礎建設決策，CloudFront 是在這些主機之上再加一層「加速與快取」，適合搭配 S3 靜態網站或需要全球低延遲的服務一起評估。
- 與 Golang 的 `fmt.Sprintf`/字串補零筆記中「保留原始格式」的概念不同層次但精神類似：CloudFront 的快取失效（Invalidation）也是一種「明確告知系統：這份資料已經過期，需要重新從源頭取得」的機制，跟資料庫索引失效、變數型別對應一樣，都是「系統需要明確訊號才能正確運作」的例子。

## 各對話來源（原文）

### CloudFront 內容傳遞網路介紹（2026-07）— https://gemini.google.com/app/c915b2a2a74e2322

使用者：cloudfront是啥

Gemini：Amazon CloudFront 是一種內容傳遞網路（CDN）服務，透過全球分佈的資料中心，將網站的靜態與動態內容更快速傳送到使用者手中。可以想像成連鎖店的地區倉庫。核心運作機制：快取（第一個使用者請求時從原始伺服器抓取內容存到邊緣節點）、低延遲（後續同地區使用者直接由邊緣節點提供）、負載分擔（減輕原始伺服器壓力）。主要優勢：加速靜態資源、安全防護（與 AWS Shield 和 AWS WAF 整合防禦 DDoS）、HTTPS 支援（內建 SSL/TLS 憑證管理）、適合影音串流。核心概念：Origin（源站，通常是 S3 貯存桶或 HTTP 伺服器）、Edge Location（邊緣節點）、Distribution（CloudFront 的基本配置單位，定義域名與源站對應關係）。常見陷阱：更新源站檔案後，CloudFront 快取不會立刻更新，需要執行 Invalidation（快取失效）強制同步，但頻繁執行可能產生額外費用。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| CloudFront 概念說明 | https://gemini.google.com/app/c915b2a2a74e2322 | Gemini 對話，2026-07 |
| AWS CloudFront 官方文件 | https://docs.aws.amazon.com/cloudfront/ | 查證時請以官方文件最新版為準，快取失效收費規則可能隨方案調整 |

⚠️ 存疑/更正：Invalidation 的免費額度與計費規則會隨 AWS 方案調整，Gemini 未給出具體數字，若要精確評估成本建議查證當下 AWS 官方定價頁面。
