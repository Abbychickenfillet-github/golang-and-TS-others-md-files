---
title: Zeabur 主機遷移、DeepSeek API 與費用比較
type: topic-note
source: Gemini
tags: [gemini, 部署, zeabur, deepseek, postgresql, 資料庫遷移, 騰訊雲, gcp]
sources:
  - https://gemini.google.com/app/e8dec0bccbe43034
  - https://gemini.google.com/app/1c8c7878f838e80f
updated: 2026-06-14
---

# Zeabur 主機遷移、DeepSeek API 與費用比較

## 重點整理

### DeepSeek API vs Gemini（給便宜主機用）

- 在<mark style="background: #FFF3A3A6;">騰訊雲（中國本土）上跑 AI，DeepSeek 比 Gemini 順很多</mark>：同生態系網路暢通（不被 GFW 擋）、性價比高、<mark style="background: #ABF7F7A6;">API 格式完全相容 OpenAI SDK</mark>（從 Gemini 切換只需裝 openai npm 套件、改 baseURL 為 DeepSeek 官方網址、換 API Key）。
- DeepSeek <mark style="background: #FF5582A6;">不是免費</mark>，按量計費（儲值扣款），但只要同級模型的 1%~10%。以 DeepSeek-V3：輸入約 $0.14/百萬 Token（≈台幣 4.5 元）、輸出約 $0.28（≈9 元）；命中快取輸入降到 $0.014（打一折）。新註冊通常送 5~10 元人民幣免費額度（platform.deepseek.com）。

### 費用比較：DeepSeek + 騰訊雲 vs Gemini-2.5-Flash + GCP

| 項目 | DeepSeek + 騰訊雲 | Gemini-2.5-Flash + GCP |
| :--- | :--- | :--- |
| 主機月費 | <mark style="background: #BBFABBA6;">$2/月（≈台幣 65 元）</mark> 2vCPU/2GB/40GB | $12/月（≈台幣 390 元）同規格 |
| API 輸入（每百萬 Token） | $0.14（≈4.5 元） | $0.075（≈2.4 元，但 >128k 翻倍為 $0.15） |
| API 輸出（每百萬 Token） | $0.28（≈9 元） | $0.30（≈9.7 元，>128k 翻倍為 $0.60） |
| 網路 | 限速 30 Mbps，含 0.5 TB 流量 | 不限速，但 <mark style="background: #FF5582A6;">GCP 出站流量（Egress）很貴</mark>（新手帳單炸彈） |

- 主機固定成本騰訊雲完勝（一年價差約台幣 3,900）；API 單價平手但 Gemini 有「長 Context 翻倍」陷阱、GCP 有「流量稅」。
- <mark style="background: #FFB8EBA6;">12 美金 ≈ 台幣 390 元（匯率約 1 USD≈32.5 TWD）。</mark>
- 取捨：只需強大 LLM 文字處理 → DeepSeek+騰訊雲（月不到台幣 100）；需 Gemini 多模態/超大上下文/Google 工具串接、要歐美機房不被擋 IP → Gemini+GCP（月台幣 400~500 起）。

### 換主機時資料庫資料還在嗎？（關鍵）

取決於資料庫「裝在哪」：

- **情況 A：資料庫與後端裝在同一台主機（Docker / 主機內服務）** → <mark style="background: #FF5582A6;">資料寫在該主機 SSD，刪舊主機就全沒了！</mark>必須先 `pg_dump` 匯出 `.sql`、新主機 `pg_restore`/`psql` 還原。
- **情況 B：用獨立雲端資料庫（Neon / Supabase / Zeabur 內建）** → 資料在獨立雲端空間，<mark style="background: #BBFABBA6;">換主機資料完好</mark>，新主機環境變數填回舊的 `DATABASE_URL` 即可。

備份/還原指令：

```bash
# 舊主機匯出
pg_dump -U 用戶名 -d 資料庫名 > backup.sql
# 新主機還原
psql -U 用戶名 -d 新資料庫名 < backup.sql
```

換主機安全 SOP：① 先別刪舊主機 ② 備份資料（最重要）③ 開新主機架後端 ④ 還原資料 ⑤ 測試前後端+資料庫 ⑥ 確認無誤再刪舊主機停計費。

<mark style="background: #ABF7F7A6;">優化建議：未來把「主機與資料庫分離」——主機純跑後端程式，資料庫用外部託管（Supabase/Neon/Zeabur 獨立 DB），日後換主機只改一行 DATABASE_URL 即無縫接軌。</mark>

### Zeabur 服務搬遷操作（共享叢集 → 騰訊雲獨立主機）

進 Zeabur 儀表板 → 點服務卡片 → Settings 標籤 → 找「運行伺服器/叢集（Server/Cluster）」區塊 → 下拉切換目標主機為 Tencent → 儲存並重新部署（自動把 Docker 容器在新主機重建）。<mark style="background: #FFB8EBA6;">提醒：若服務連的是舊叢集內的 DB，搬走後內網名稱可能連不上，先別刪舊叢集，確認新主機能讀到資料再收尾。</mark>

### DeepSeek 電話驗證失敗（國碼錯誤）

畫面顯示 `+86917167098` 有兩個錯：① 國碼變成中國 +86（台灣應為 <mark style="background: #FFF3A3A6;">+886</mark>）② 手機號開頭的 0 沒去掉黏在一起。修正：點國碼選單選「台灣/Taiwan」切成 +886，輸入號碼去掉開頭 0（0917167098 → 917167098）。

### Zeabur 服務狀態 / vector-aggregator

Zeabur 儀表板會列出 server 上各服務名稱、類型與「running」狀態。其中 <mark style="background: #ABF7F7A6;">`vector-aggregator` 是收集、轉換、路由日誌（logs）與指標（metrics）的工具</mark>，統一處理分散資料方便監控與分析（與「集錦電影 aggregator film」無關，純技術巧合）。

## 各對話來源
### Zeabur 新功能與底層架構解析（2026-06）— https://gemini.google.com/app/e8dec0bccbe43034

使用者：現在12美金是台幣多少錢 那大陸騰訊我是應該用deep seek嗎？ → Gemini：12 美金≈台幣 390 元（1USD≈32.5）。在騰訊雲上改用 DeepSeek 是完美解法：同中國生態網路暢通不被 GFW 擋、性價比高、API 相容 OpenAI SDK 切換簡單。若非 Gemini 不可（多模態/超大上下文/Google 工具）則改買 DO/Hetzner 歐美主機。

使用者：deepseek API是免費的嬤 → Gemini：不免費，按量計費，但只要同級 1%~10%。DeepSeek-V3 輸入 $0.14/百萬 Token、輸出 $0.28；新註冊送 5~10 元人民幣額度；建議用官方 API 最省，雲廠轉手會加價。

使用者：DEEPSEEK +Tencent 的費用 vs Gemini-2.5-flash+GCP 比較 → Gemini：（見上表）主機費騰訊雲完勝（年差 3,900）；API 單價平手但 Gemini 長 Context 翻倍、GCP 有 Egress 流量稅；快取 DeepSeek 命中輸入打一折 $0.014。

使用者：如果我之後換主機 我的資料庫的東西還會在嗎 → Gemini：取決於裝在哪。情況 A（與後端同主機/Docker）刪主機資料會消失，需 pg_dump 匯出、新主機還原；情況 B（獨立雲端 DB 如 Neon/Supabase/Zeabur 內建）資料完好，新主機填回 DATABASE_URL 即可。附換主機安全 SOP。

使用者：就是主機裡面的服務阿 → Gemini：那換主機資料「絕對會消失」（寫在本地 SSD）。搬家三步：舊主機 pg_dump 匯出 backup.sql 下載 → 新主機建立 DB 服務並 psql 還原 → 確認無誤再刪舊主機。建議未來主機與資料庫分離。

使用者：為什麼我deepseek沒法輸入電話號碼做驗證 → Gemini：截圖顯示 +86917167098，國碼錯成中國 +86（台灣應 +886）且手機號開頭 0 沒去掉。修正：國碼選台灣 +886、號碼去 0（0917...→917...）再發驗證碼。

使用者：幫我把 next-guru-laptop（service-68ad1bd67d2b925fee3ce782）從共享叢集搬遷到 Tencent 那顆 → Gemini：AI 無法直接操作 Zeabur 後台。手動：Zeabur 儀表板→服務卡片→Settings→運行伺服器/叢集區塊→下拉切成 Tencent→儲存重新部署。提醒：DB 在主機內服務，搬走可能連不上舊叢集 DB，先別刪舊叢集，確認可讀資料再收尾。

使用者：幫我寫一份代辦事項 → Gemini：產出「Zeabur 服務搬遷與 AI 設定待辦清單」（DeepSeek 帳號驗證 +886、資料庫備份 dump、服務搬遷與還原、更新 DATABASE_URL、後端改 DeepSeek API、最終測試與刪舊主機）。

使用者：工作到google calendar → 要 → Gemini：已將「Zeabur 服務搬遷與 AI 設定工作」加入 Google 日曆（2026/6/1 下午 3:00–5:00）。

### Zeabur 服务状态概览（2026-06）— https://gemini.google.com/app/1c8c7878f838e80f

使用者：这么多的什么?（附 Zeabur 服務截圖）→ Gemini：這些是 server 上正在運行、由 Zeabur 管理的服務，可看到各服務名稱、類型與 running 狀態。

使用者：aggregate → Gemini：vector-aggregator 是負責收集、轉換、路由日誌或指標的工具，統一處理分散資料方便監控與分析。

使用者：是一种很特殊的电影。 → Gemini：aggregator film（集錦電影）是多段短片組成的長片，但畫面上的 vector-aggregator 是處理日誌/指標的技術工具，與電影無關。
