---
title: Gemini API Auth Keys（授權金鑰）— 與舊版標準 API Key 的差異與遷移期限
type: topic-note
source: Gemini
tags: [gemini, api-key, auth-key, google-ai-studio, service-account, iam, 資安, LLM]
sources:
  - https://gemini.google.com/app/b93412b175e72415
updated: 2026-09-22
charset: utf-8
---

# Gemini API Auth Keys（授權金鑰）— 與舊版標準 API Key 的差異與遷移期限

本篇重點 a–j，共 10 個。

---

## 重點整理

### 1. 兩種金鑰的差別

(a) <mark style="background: #ADCCFFA6;">Standard key（標準金鑰，舊制）</mark>：字串以 <mark style="background: #FFB8EBA6;">`AIza`</mark> 開頭，本質上是一個綁在 GCP 專案上的通用金鑰。
	<mark style="background: #FF5582A6;">風險</mark>：如果沒有設限制，同一把金鑰外洩之後可能被拿去打該專案底下其他 Google API，不只是 Gemini。

(b) <mark style="background: #ADCCFFA6;">Auth key（授權金鑰，新制）</mark>：字串以 <mark style="background: #FFB8EBA6;">`AQ.Ab`</mark> 開頭，<mark style="background: #BBFABBA6;">直接綁定一個 Google Cloud 服務帳戶（service account），請求會以該服務帳戶的身分被處理</mark>。
	因此可以套用 IAM 的權限控制，而且<mark style="background: #BBFABBA6;">預設只能存取 Generative Language API（也就是 Gemini API）</mark>，外洩時的爆炸半徑小很多。

| 比較項目 | Standard key（舊） | Auth key（新） |
|---|---|---|
| 字串前綴 | `AIza` | `AQ.Ab` |
| 綁定對象 | GCP 專案 | GCP 服務帳戶 |
| 預設可存取範圍 | 該專案啟用的多個 Google API | 只有 Generative Language API |
| 權限控制 | 靠手動加金鑰限制 | 走 IAM，可精細控管 |
| 外洩處置 | 手動撤銷 | 可快速強制停用，偵測到外洩時自動停止存取 |

### 2. 時間線（<mark style="background: #FF5582A6;">⚠️ 這段是對 Gemini 回答的補正</mark>）

(c) Gemini 只說了「2026-05-28 起新建金鑰預設為授權金鑰」這一條，<mark style="background: #FF5582A6;">漏掉後面兩個更關鍵的死線</mark>，補齊如下：

```text
2026-05-28 ──► AI Studio 新建的金鑰一律預設為 Auth key
      │
2026-06-19 ──► Gemini API 開始拒絕「未設限制的 Standard key」
      │        （有明確設限制的 Standard key 這時還能用）
      │
2026-09    ──► Gemini API 拒絕 Standard key，舊金鑰全面失效
      ▼
      今天 2026-09-22：Abby 的舊金鑰「過期」就是撞上這條線
```

(d) <mark style="background: #FFF3A3A6;">所以 Abby 那句「我的舊的過期了」不是額度用完，是舊制金鑰被官方停用</mark>，解法是重新建一把新的 Auth key 換掉程式碼裡的字串，而不是去找哪裡儲值。

### 3. 免費專案可不可以用

(e) <mark style="background: #BBFABBA6;">可以，Auth key 跟收費方案無關</mark>。金鑰型態只影響「身分驗證與權限」，不影響你在 Free Tier 還是 Paid Tier。
	<mark style="background: #D2B3FFA6;">對個人小專案反而更划算</mark>：綁服務帳戶之後，金鑰不小心推上 GitHub 被掃到時，可以直接停用那個服務帳戶，不必整個專案重來。

### 4. 怎麼換（操作路徑）

(f) 到 [Google AI Studio 的 API keys 頁面](https://aistudio.google.com/apikey) → 建立一把新金鑰 → 系統預設就會給 Auth key。

(g) <mark style="background: #FF5582A6;">介面變動提醒</mark>：2026 年新版 AI Studio 把按鈕換了位置與字樣，Abby 用「Create API key」搜尋不到是正常的。
	直接走 <mark style="background: #BBFABBA6;">左側選單或右上角的 `Get API key` / `API keys` 入口</mark>，不要靠搜尋按鈕文字找。

(h) 換完之後，程式碼端只需要把環境變數的值換掉，<mark style="background: #FFF3A3A6;">呼叫方式完全不變</mark>——仍然是放在 request header 裡送出：

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

(i) <mark style="background: #FF5582A6;">第三方工具可能還沒跟上</mark>：有些套件對金鑰字串做了 `AIza` 開頭的正規表示式驗證，換成 `AQ.Ab` 開頭之後會被誤判為「無效金鑰」。遇到這種錯誤要去看套件的 issue，不是你的金鑰有問題。

(j) 金鑰要放在哪一個 header、為什麼一定要寫在後端路由：見 [[HTTP-Headers-Request與Response-誰送給誰]]。

---

## 各對話來源

### 認識 Gemini 授權金鑰（2026-09）— https://gemini.google.com/app/b93412b175e72415

**使用者：** 這個驗證金鑰是什麼啊
**Gemini：** 授權金鑰（Auth Keys）是 Gemini API 為提高安全性所推出的一種全新驗證機制。與過去的「標準 API 金鑰」相比，主要的差別與優點如下——綁定服務帳戶：授權金鑰會直接連結至 Google Cloud 服務帳戶，系統會以該服務帳戶的身分處理請求，方便進行更精細的權限與存取控制。安全性更高：預設僅能存取 Generative Language API（Gemini API）。若金鑰不幸外洩，系統可快速強制停用或在偵測到外洩時自動停止存取，降低風險。防範濫用：自 2026 年 5 月 28 日起，在 Google AI Studio 中建立的所有新金鑰都會預設為授權金鑰。

**使用者：** 我能用在我的免費專案嗎
**Gemini：** 可以，免費專案完全可以使用驗證金鑰。不論是免費方案還是付費方案，主要差異僅在於金鑰的權限與安全性機制。免費權益不變：使用驗證金鑰不會強制你改為付費方案。安全性提升：驗證金鑰會綁定 Google Cloud 服務帳戶，能防止金鑰不小心公開或遭濫用。只要前往 Google AI Studio 重新建立一組 API 金鑰，系統就會預設產生新型態的「驗證金鑰」，替換掉程式碼中的舊金鑰即可。

**使用者：** 幫我找到我現在要申請金鑰的網址，我的舊的過期了
**Gemini：** 你可以點擊 Google AI Studio 取得 API 金鑰頁面直接進行申請與管理。進去後點選 Create API key 即可產生新的驗證金鑰。

**使用者：** 現在沒有了啊，你看我用搜尋找不到 Create API key
**Gemini：** 在 2026 年推出的新版 Google AI Studio 介面中，畫面選單進行了調整，因此原本舊位置的「Create API key」按鈕可能看起來不太一樣。

---

## 相關筆記

| 主題 | 路徑 | 為什麼相關 |
|---|---|---|
| HTTP Headers 的方向性 | backend/HTTP-Headers-Request與Response-誰送給誰.md | 金鑰是「夾在 Request Header 裡」送出去的，那篇講 header 誰產生、送給誰 |
| MCP 協定定義與三大能力 | LLM-Memory/Model-Context-Protocol-MCP-協定定義與三大能力.md | MCP server 呼叫外部 LLM 時同樣要在伺服器端保管金鑰，是本篇 (h) 的實際應用場景 |
| 資料遮罩與 PII 保護 | backend/data-masking-pii-protection.md | 同屬「不要把敏感字串外流到前端」這條線 |

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇來源對話 | https://gemini.google.com/app/b93412b175e72415 | Gemini 對話，2026-09 |
| 官方：Using Gemini API keys | [ai.google.dev](https://ai.google.dev/gemini-api/docs/api-key) | Google AI for Developers，查證 2026-09-22 |
| 遷移死線整理（2026-06-19 拒絕未設限標準金鑰） | [DoiT：Gemini API Key Deprecation](https://www.doit.com/blog/the-gemini-api-key-abuse-fix-is-here-and-it-has-a-deadline) | 2026-06，查證 2026-09-22 |
| 金鑰前綴 `AIza` → `AQ.Ab` 實測 | [DEV Community](https://dev.to/rapls/i-created-a-gemini-api-key-and-got-aq-instead-of-aiza-3dp3) | 2026-06，查證 2026-09-22 |
| 第三方套件金鑰格式驗證失敗案例 | [GitHub issue](https://github.com/super-android/tunelab/issues/2) | 2026，查證 2026-09-22 |
