---
title: 用鏡頭記錄行為的 AI 系統要多少錢——邊緣過濾加雲端 VLM 混合架構
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - LLM-Memory
  - AIoT
  - VLM
  - 多模態
  - 成本估算
  - edge-ai
  - 架構設計
aliases: [影像行為分析成本, VLM成本估算, 邊緣過濾架構]
related:
  - "[[AIoT-概念與實習角色]]"
  - "[[費米問題-Fermi-Estimation-面試估算技巧]]"
  - "[[llm-caching-layers]]"
sources:
  - https://gemini.google.com/app/0cf6cbaca9fd9787
updated: 2026-08-09
---

# 用鏡頭記錄行為的 AI 系統要多少錢

> **本篇重點 a–l，共 12 個。**
> 問題原文：「如果是用鏡頭記錄人什麼時候做了什麼事，搭配 AI 模型，這樣建置的電機跟程式碼 LLM 費用是多少」。
> <mark style="background: #FF5582A6;">重要前提：這篇的價值在「架構思路」與「估算方法」，不在「數字」。所有報價與費率請務必自行重新查證，理由見下方 ⚠️ 區塊。</mark>

---

## 費用要拆成兩塊看

(a) <mark style="background: #ADCCFFA6;">一次性的硬體成本</mark>（電機端）與<mark style="background: #ADCCFFA6;">持續性的 API 成本</mark>（模型端）。<mark style="background: #FFF3A3A6;">會把人燒死的是後者，不是前者</mark>——硬體是幾千塊一次付清，API 是每天都在扣。

---

## 一、硬體端（一次性）

(b) 影像採集端三種選法：

| 方案 | 用途 | 對話中的估價（NTD） |
|---|---|---|
| ESP32-CAM | 極低成本、定時拍照上傳 | $250 – $400 |
| Raspberry Pi 5 + 鏡頭模組 | <mark style="background: #BBFABBA6;">主流選擇</mark>，支援即時串流與初步過濾 | $3,000 – $4,500 |
| USB 網路攝影機 / IP Cam | 串接現成監視器 | $1,000 – $3,000 |

(c) 周邊：3D 列印外殼、壁掛支架、Type-C 供電與變壓器，約 $300 – $800。

(d) <mark style="background: #FFF3A3A6;">選配但關鍵</mark>：邊緣運算推論卡（Hailo-8、Google Coral 之類），約 $3,000 – $6,000。<mark style="background: #BBFABBA6;">它的投資報酬不在效能，在於幫你擋掉 90% 以上不需要送雲端的畫面</mark>。

(e) 硬體小計：樹莓派＋一般鏡頭一台端點約 <mark style="background: #FFB8EBA6;">NT$4,000 – NT$6,000</mark>。

---

## 二、模型端（持續性）——為什麼會爆

(f) <mark style="background: #FF5582A6;">影像消耗的 token 遠比文字多</mark>。一張圖通常折算 1,000 – 3,000 tokens，相當於一整頁文字。<mark style="background: #FF5582A6;">最致命的錯誤是把未過濾的影片串流直接往 LLM API 塞</mark>，那樣一天可以燒掉四位數。

(g) 兩種觸發策略的試算對比（假設一張關鍵影格 2,000 input tokens，輸出行為紀錄約 100 tokens，以輕量多模態模型費率估）：

| 方案 | 觸發方式 | 每日圖片數 | 每日 API 費用 | 每月估算 |
|---|---|---|---|---|
| A 定時觸發 | 每 5 分鐘截一張 | 288 張 | 約 US$0.20 – 0.40 | 約 NT$200 – 400 |
| B <mark style="background: #BBFABBA6;">動態偵測</mark> | 邊緣端偵測到人動才送 | 50 次 | 約 US$0.05 | <mark style="background: #BBFABBA6;">約 NT$50</mark> |

(h) <mark style="background: #FFF3A3A6;">兩者差了 4 到 8 倍，而差別只在「有沒有在邊緣端先過濾」這一個設計決策</mark>。這就是本篇真正該記住的東西。

---

## 三、省錢的三個關鍵做法

(i) <mark style="background: #FF5582A6;">絕對不要把未過濾的 video stream 無腦往 LLM API 塞</mark>。

(j) <mark style="background: #BBFABBA6;">善用 Prompt Caching（提示詞快取）</mark>。「行為定義」那一大段 System Prompt 每次都一樣，快取起來後讀取成本可以降到原價的一小部分（各家折扣不同，Anthropic 的快取讀取約為輸入價的 10%）。<mark style="background: #FFB8EBA6;">這對本案特別有效，因為 system prompt 固定不變、只有圖片在換</mark>。

(k) <mark style="background: #BBFABBA6;">地端／雲端混合架構（推薦）</mark>：

```text
鏡頭 ──► 樹莓派本地跑 YOLO（免費、離線）
              │
              ├─ 沒偵測到人 ──► 丟棄，不花任何錢
              │
              └─ 偵測到人在動 ──► 截當下影格（或前後 3 秒短片）
                                      │
                                      ▼
                            多模態 VLM API 辨識詳細行為
                                      │
                                      ▼
                              寫入資料庫（時間＋行為描述）
```

<mark style="background: #FFF3A3A6;">分工原則：便宜的模型做「有沒有」，貴的模型做「是什麼」</mark>。YOLO 只回答「畫面裡有沒有人、有沒有在動」，這種二元判斷不需要語言模型；只有需要生成「14:30 陳小姐坐在書桌前開始翻閱書籍」這種語意描述時，才值得叫 VLM。

(l) 用這種架構，單個鏡頭的模型運作成本可以壓在<mark style="background: #FFB8EBA6;">每月 NT$100 以內</mark>。

---

## ⚠️ 存疑／更正

- <mark style="background: #FF5582A6;">對話中列出的「2026 主流多模態模型費率表」不可信，請勿直接引用</mark>。裡面出現了 `Gemini 3.5 Flash`、`Claude Sonnet 4.6` 這類<mark style="background: #FF5582A6;">名稱與版號可疑的型號</mark>，價格也沒有附任何出處。生成式模型在報價這種高度時效性的數字上很容易杜撰。
- <mark style="background: #BBFABBA6;">正確做法</mark>：要報價時直接去各家官方定價頁抓當日數字（連結見下方來源表），並把「單張圖折算多少 token」也用各家官方的影像 token 計算規則重算。
- 硬體報價（樹莓派、Hailo-8、Coral）也是浮動的，且台灣通路加價幅度不小，下單前請以實際賣場為準。
- <mark style="background: #FFF3A3A6;">這篇該保留的是方法論</mark>：先拆成「一次性 vs 持續性」，再用「每日事件數 × 每次 token 數 × 單價」做費米估算，最後檢查「有沒有辦法在最前面就把量壓下來」。

---

## 關聯筆記與關聯原因

- [[費米問題-Fermi-Estimation-面試估算技巧]]：<mark style="background: #D2B3FFA6;">本篇 (g) 用的就是費米估算</mark>——把一個看不出答案的問題拆成「頻率 × 單位用量 × 單價」三個好估的因子。這是同一套方法在真實系統設計題上的應用範例。
- [[AIoT-概念與實習角色]]：<mark style="background: #D2B3FFA6;">這篇正好是那篇講的 AIoT 的完整實例</mark>——邊緣裝置採集、地端輕量推論、雲端重推論、資料回寫，四層都齊了。面試被問「你理解的 AIoT 架構長怎樣」可以直接講這個。
- [[llm-caching-layers]]：<mark style="background: #D2B3FFA6;">本篇 (j) 的展開版</mark>。這裡只說「用快取可以省錢」，那篇拆解快取到底發生在哪一層、命中條件是什麼。

---

## 各對話來源（原文摘要）

### AI 影像行為分析系統成本估算（2026-08）— https://gemini.google.com/app/0cf6cbaca9fd9787

> **使用者：** 如果是用鏡頭記錄人什麼時候做了什麼事，搭配 AI 模型，這樣建置的電機跟程式碼 LLM 費用是多少
>
> **Gemini：** 費用通常會拆分成兩大區塊：硬體與硬體控制（電機端）以及軟體與大語言／多模態模型（LLM/VLM 費用）。
>
> **一、電機與硬體建置成本（一次性為主）**：ESP32-CAM $250–400；Raspberry Pi 5 + 鏡頭模組 $3,000–4,500；USB 網路攝影機 / IP Cam $1,000–3,000；電機／外殼／供電 $300–800；邊緣硬體加速（Hailo-8 或 Coral）$3,000–6,000。硬體小計約 NT$4,000–6,000。
>
> **二、AI 模型與 LLM API 費用（持續性變動成本）**：因為鏡頭記錄的是影像，一張圖通常折算為 1,000 到 3,000 個 Token。（⚠️ 此處原對話列出的費率表已判定不可信，故不轉錄。）
>
> **費用試算**：方案 A 定時觸發（每 5 分鐘一張，一天 288 張）→ 每日約 US$0.20–0.40，每月約 NT$200–400。方案 B 動態偵測（一天 50 次）→ 每日約 US$0.05，每月約 NT$50。
>
> **三、省錢關鍵建議**：絕對不要把未過濾的 Video Stream 直接無腦往 LLM API 塞。善用 Prompt Caching。地端／雲端混合架構：在樹莓派上跑輕量的 YOLO（免費）偵測「畫面中是否有人以及人在移動」，一旦觸發，截取當下那張圖（或前後 3 秒的小短片），再打 API 給多模態模型辨識詳細行為並寫入資料庫。單個鏡頭的 LLM 運作成本可以壓在每個月 NT$100 元以內。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| 原始 Gemini 對話 | https://gemini.google.com/app/0cf6cbaca9fd9787 | 2026-08（對話當下） |
| Anthropic 官方定價（含 prompt caching 折扣） | https://www.anthropic.com/pricing | <mark style="background: #FF5582A6;">報價請於使用當日重新查證</mark> |
| Google Gemini API 定價 | https://ai.google.dev/pricing | <mark style="background: #FF5582A6;">報價請於使用當日重新查證</mark> |
| OpenAI API 定價 | https://openai.com/api/pricing/ | <mark style="background: #FF5582A6;">報價請於使用當日重新查證</mark> |
| Ultralytics YOLO 文件（邊緣端偵測） | https://docs.ultralytics.com/ | 查證於 2026-08-09 |
| Hailo-8 邊緣推論加速器 | https://hailo.ai/products/hailo-8/ | 查證於 2026-08-09 |
