---
title: JWT b64:false、Overhead 與 Parameter vs Argument
type: topic-note
source: Gemini
tags: [gemini, jwt, rfc7797, 術語]
sources:
  - https://gemini.google.com/app/26e8e0541fdfa2f6
  - https://gemini.google.com/app/d5140214d9702616
  - https://gemini.google.com/app/c1cd87f58d9ea467
  - https://gemini.google.com/app/66ffdf732755b2ae
updated: 2026-11-09
---

# JWT b64:false、Overhead 與 Parameter vs Argument

RFC 7797 為 JWS 新增 `b64` header parameter，可讓 payload 不經 Base64url 編碼。順便釐清兩個容易混淆的術語。相關：[[3-Session與JWT-有狀態與無狀態驗證-過期機制與Base64url]]（Base64url 的來龍去脈）。

## 重點整理

本篇重點 a–j，共 10 個

(a) `b64` 是 JWS Header 裡的<mark style="background: #ADCCFFA6;">布林值 parameter</mark>，預設 `true`（payload 必須 Base64url 編碼）。設 `"b64": false` 時，規範允許 payload 保持原樣（Unencoded）直接簽章與傳送。所以「可不編碼」就是因為它是可選的 true／false 旗標。

(b) <mark style="background: #ADCCFFA6;">Overhead（開銷）</mark>：為完成任務而額外消耗、但不是核心資料本身的資源（時間、記憶體、頻寬）。比喻：寄 200 公克的書，紙箱與氣泡紙就是 overhead。

(c) Base64 的 overhead 有兩種：<mark style="background: #FFB8EBA6;">資料體積</mark>（每 3 bytes 變 4 字元，約膨脹 33%，3 MB 變 4 MB）與<mark style="background: #FFB8EBA6;">CPU 運算</mark>（發送端編碼、接收端解碼）。`b64:false` 就是為了省掉這兩者。

(d) Overhead 一詞來自會計：工廠只要「屋頂（overhead）還在」就必須付的固定費用（租金、電費、行政薪水），相對於直接成本（原料、產線人力）。後來借用到電腦科學。

(e) <mark style="background: #ADCCFFA6;">Parameter（參數）</mark>是規格或函式宣告中的欄位名稱（`function add(a,b)` 的 a、b）。<mark style="background: #ADCCFFA6;">Argument（引數）</mark>是呼叫時實際傳入的值（`add(3,5)` 的 3、5）。

(f) RFC 7515（JWS）與 RFC 7519（JWT）把 header 的 key（`alg`、`typ`、`crit`、`b64`）統稱 <mark style="background: #FFF3A3A6;">Header Parameter</mark>，因為規範是在「定義欄位結構」而不是「呼叫函式」。實際填入的 `false`、`"HS256"` 才是值。

> ⚠️ 存疑/更正：`b64:false` 使用時 RFC 7797 要求 header 的 `crit` 也要列出 `b64`，且 unencoded payload 不能含 `.` 等會破壞 compact serialization 的字元，Gemini 本次回答沒提到，Abby 若要實作請讀 RFC 7797 第 5 節。（此為我依 RFC 內容補充，未重新抓取全文，請核對。）

### 追加 2026-11-05

(g) 常見 JWT 用的是 JWS Compact Serialization：<mark style="background: #FFF3A3A6;">Header、Payload、Signature 三段都經過 Base64url 編碼，再用 `.` 串接</mark>。Header 與 Payload 是 JSON 先以 UTF-8 轉成 bytes 再 Base64url；Signature 是對「編碼後的 Header + `.` + 編碼後的 Payload」做簽章後再 Base64url。

(h) <mark style="background: #FF5582A6;">Base64url 是編碼（Encoding）不是加密（Encryption）</mark>：任何人解碼就能讀 Payload，所以不能把密碼、個資放進 Payload。唯一例外是 (a) 的 `b64:false` 讓 Payload 不編碼，但那是更明文，不是更安全。

(i) 編碼與加密的差別：<mark style="background: #ADCCFFA6;">編碼</mark>是公開、可逆的轉換規則，目的是跨系統正確傳輸，不需要金鑰（Base64、URL encoding）。<mark style="background: #ADCCFFA6;">加密</mark>是用演算法加金鑰保護隱私，沒金鑰就無法輕易還原。口訣：編碼是公開的翻譯，加密是加上密碼的鎖。

(j) UTF-8 是支援中文的可變長度字元編碼（Unicode 的實作方式）：ASCII 英數 1 byte，常見中文字 3 bytes，罕見字與 emoji 可到 4 bytes。所以 JWT 內含中文時，必須先 UTF-8 轉 bytes 再 Base64url。

> ⚠️ 存疑/更正：d5140214d9702616（JWS 串接運算解析）較早的幾輪問答在頁面中無法載入（只讀到最後兩輪），標題顯示該對話原本在談「Header || '.' || Payload」串接，本篇僅收錄讀得到的內容。

### 追加 2026-11-09：JWS 與 JWT 的層級、為何 b64:false 還要放進 crit

(追加 a) <mark style="background: #ADCCFFA6;">JWT（RFC 7519）是上層容器規範</mark>，定義 Claims 的格式。簽章的 JWT 本質上就是一個 JWS（RFC 7515），JWS 規定「頭部、載荷（Payload）、簽章」如何組合與保護。

(追加 b) 啟用 RFC 7797 未編碼載荷時，Protected Header 長這樣：`{"alg":"HS256","b64":false,"crit":["b64"]}`。

(追加 c) <mark style="background: #FFF3A3A6;">`b64:false` 是「載荷不做 Base64URL 編碼」，`crit:["b64"]` 是「接收方不認得 b64 就必須拒絕」</mark>。
　沒有 crit 時，舊版驗證端會忽略不認識的 b64，照舊把載荷當 Base64URL 解碼，結果驗簽失敗或解出亂碼。
　所以 RFC 7797 規定用 b64:false 就必須把 b64 列進 crit。

## 自我測驗（點開看答案）

> [!question]- `b64:false` 省下什麼？
> Base64url 造成的約 33% 體積膨脹與編解碼 CPU 開銷。

> [!question]- 是非題：`alg` 是 JWT 的 argument。
> 錯。`alg` 是 Header Parameter 名稱，`"HS256"` 才是填入的值。

> [!question]- 申論：為什麼 overhead 會被翻成開銷？
> 源自會計的間接固定費用，引申為完成核心工作所必須額外付出的資源成本。

> [!question]- 是非題：Base64url 編碼過的 JWT Payload 是安全的，別人看不到。
> 錯。編碼不是加密，任何人解碼即可讀取。

> [!question]- 一個常見中文字在 UTF-8 通常佔幾 bytes？
> 3 bytes。

## 各對話來源
（Gemini 回答為節錄，使用者提問為原文）

### JWT RFC 更新說明（2026-11-03）— https://gemini.google.com/app/26e8e0541fdfa2f6

**使用者：** 為什麼有b64是允許不經過b64編碼 是因為他true false可選的意思嗎？何謂overhead的定義

**Gemini：** （節錄）是，b64 為布林值預設 true；overhead 是額外消耗的資源，舉 33% 膨脹與 CPU 編解碼。

**使用者：** 為什麼？他是parameter不是argument

**Gemini：** （節錄）RFC 是在定義欄位結構，故稱 Header Parameter；實際值才是 argument。

**使用者：** 為什麼overhead是開銷的意思

**Gemini：** （節錄）Over＋Head，會計上的屋頂下固定費用，延伸到電腦科學。

### JWS 串接運算解析（2026-11-05）— https://gemini.google.com/app/d5140214d9702616

**使用者：** 所以JWT都有經過base64編碼嗎

**Gemini：** （節錄）常見 JWT 的 Header 與 Payload 預設都經 Base64url 編碼；Base64url 不是加密；例外是 RFC 7797 `b64:false`。

**使用者：** UTF-8算中文嗎

**Gemini：** （節錄）算。UTF-8 可變長度，常見中文字 3 bytes，少見字或 emoji 4 bytes。

### 編碼與加密差異（2026-11-05）— https://gemini.google.com/app/c1cd87f58d9ea467

**使用者：** 編碼算加密嗎

**Gemini：** （節錄）不算。編碼是公開可逆的格式轉換、不需金鑰；加密靠金鑰保護隱私。

### Protected Header 區別（2026-11-09）— https://gemini.google.com/app/66ffdf732755b2ae

使用者：JSON Web Signature 跟 JWT 的層級是什麼？載荷應該是 payload？可以畫給我看 critical 頭部參數中包含的 b64 嗎？……都說不要用 b64 了那 crit 還要 b64？
Gemini：JWT 為上層、JWS 為底層簽章規範；Payload 為官方術語；示範 Protected Header；說明 crit 讓不支援擴充的舊版接收端拒絕而非誤驗（如追加 a–c）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| b64 header parameter | https://datatracker.ietf.org/doc/html/rfc7797 | RFC 7797（2016-02），本次未重新抓取全文（2026-11-03） |
| Header Parameter 術語 | https://datatracker.ietf.org/doc/html/rfc7515 | RFC 7515（2015-05），本次未重新抓取全文（2026-11-03） |
| JWS Compact Serialization 三段 Base64url | https://datatracker.ietf.org/doc/html/rfc7515#section-7.1 | RFC 7515（2015-05），Gemini 回答未重新抓取原文（2026-11-05） |
| UTF-8 位元組長度 | https://datatracker.ietf.org/doc/html/rfc3629 | RFC 3629（2003-11），Gemini 回答未重新抓取原文（2026-11-05） |
