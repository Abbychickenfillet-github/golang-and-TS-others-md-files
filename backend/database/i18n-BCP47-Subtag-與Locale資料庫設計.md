---
title: i18n 資料庫設計—Locale 建表、BCP 47 Subtag 與業界做法拆解
type: topic-note
source: Gemini
tags: [gemini, i18n, database, bcp47, locale, api, backend]
sources:
  - https://gemini.google.com/app/63511ff0c6b920fd
updated: 2026-07-18
---

# i18n 資料庫設計—Locale 建表、BCP 47 Subtag 與業界做法拆解

> 🔖 本篇重點索引：a–o，共 15 個。

## 重點整理

### 一、資料庫建表 vs JSON：兩者的分工

**(a)** <mark style="background: #ADCCFFA6;">i18n 不是「存 JSON 或存 Table 二選一」</mark>：資料庫建表（如 `languages`／`locales` 表）是<mark style="background: #FFF3A3A6;">持久化儲存</mark>的最穩定源頭；JSON 只是 API 傳輸時的「運輸包裝」，把資料庫內容打包送給前端；前端負責解析 JSON 並渲染選單。三者是合作關係，不是互斥選項。

**(b)** <mark style="background: #FFB8EBA6;">典型 locales 表欄位</mark>：`id`、`code`（Key，如 `zh-TW`）、`name`（給管理員看）、`native_name`（給使用者看，如「繁體中文」）、`sort`、`is_enabled`。

**(c)** <mark style="background: #BBFABBA6;">後端資料流程</mark>：Query 從 `locales` 表撈資料 → Convert 轉成 Go struct（或 DTO）→ Marshal 用 `json.Marshal` 轉成 JSON → 回傳給前端跑 `.map()` 產生下拉選單。前端不在乎背後是建表還是存檔案，只在乎 API 回傳的格式好不好用。

### 二、如何「觀察業界做法」而非看原始碼

**(d)** <mark style="background: #ADCCFFA6;">兩大觀察途徑</mark>：⑴ 黑箱推導——用瀏覽器開發者工具（F12 → Network → Fetch/XHR）觀察大型網站切換語系時打的 API；⑵ 開源參考——在 GitHub 找知名 i18n 框架（如 `nicksnyder/go-i18n`）或大公司釋出的架構設計（如 `google/go-genproto` 的語系標籤命名、CLDR 標準資料）。

**(e)** <mark style="background: #FFF3A3A6;">觀察大牌網站的步驟</mark>：切換網站語系 → F12 開 Network，過濾 Fetch/XHR → 找名稱含 `locale`／`lang`／`i18n`／`translations` 的 API → 看 Payload（送出什麼）與 Preview（拿回什麼）。常見發現：回傳 `en-US` 而非單純 `US`（驗證 BCP 47）；回傳原生語言名稱（如「日本語」）供使用者辨識。

**(f)** <mark style="background: #FF5582A6;">關鍵區分：點網站自己的 UI，不是瀏覽器原生翻譯</mark>。網站 UI 切換（i18n）：開發者提供精準翻譯，切換後通常重新導向 URL（如 `/en/`）或重打 API；瀏覽器原生翻譯（如 Google 翻譯外掛）：強行把 DOM 文字替換掉，程式碼完全不知情，容易把專有名詞翻爛（如「Apple Watch」被誤譯），也可能造成<mark style="background: #FF5582A6;">排版跑版、JS 操作 DOM 崩潰</mark>。

**(g)** <mark style="background: #ADCCFFA6;">大牌的「初次自動引導」流程</mark>：前端用 `navigator.language` 偵測瀏覽器偏好語言 → 後端拿這組 code 去 Locale API 找最匹配標籤 → 彈窗詢問是否切換（如 Airbnb）或直接跳轉對應路徑（如 GitHub 的 `github.com/en/...`）。切換後常見做法：URL 加語系標籤持久化分享連結、把 BCP 47 code 存進 Cookie／LocalStorage 供下次直接讀取。

### 三、實際拆解 Airbnb 的語系切換 API

**(h)** <mark style="background: #FFB8EBA6;">`H4sIA` 開頭的亂碼是什麼</mark>：這是 <mark style="background: #ADCCFFA6;">Gzip 壓縮後再經 Base64 編碼</mark>的結果，用於在傳輸大型 JSON（如多國語系設定或排序清單）時節省流量、加快載入。解壓後其實是一個標準 JSON 物件，並非亂碼或加密。

**(i)** <mark style="background: #FF5582A6;">觀察時要排除雜訊請求</mark>：滾動頁面時會噴出大量 `proxytown`、`messages` 等請求，這些與語系切換<mark style="background: #FF5582A6;">無關</mark>，是 Airbnb 內部的「數據代理／埋點（Proxy/Telemetry）」系統，用極簡化的批量請求（`{F, Q, V, a}` 這種一字元欄位）同步 Cookie／使用者狀態，跟滾動同步偵測登入狀態有關，不要誤判為語系邏輯的一部分。

**(j)** <mark style="background: #ADCCFFA6;">真正的語系切換 API 是 `domain_switch_send`</mark>，觀察其 Headers 可得到幾個業界共識：

- Request URL 隨語系導向不同 ccTLD（如 `airbnb.co.uk`）：語系與網域／子網域連動。
- Referer 網址帶 `&locale=en&country_override=US`：<mark style="background: #FFF3A3A6;">「語言」與「國家」分開傳參</mark>——`locale` 是 BCP 47 語系代碼（決定文字顯示），`country_override` 是 ISO 3166 國家代碼（決定政策／稅務／圖片內容），兩者不是同一件事。
- Response Body 為空、`Content-Length: 0`、Method 為 POST：這是<mark style="background: #BBFABBA6;">「純動作 API（Imperative API）」</mark>，不需要回傳資料，它只負責告訴伺服器「更新這個使用者的語系 Session」；真正的效果落在 `set-cookie`（如 `bev`、`_airbed_session_id`）——後端把語系狀態寫進 Cookie／Session，下次使用者進站直接從 Cookie 讀取，不必重新選擇。

**(k)** <mark style="background: #D2B3FFA6;">給 Go 後端的實作參考</mark>：

```go
type DomainSwitchRequest struct {
    Locale  string `json:"locale"`          // BCP 47：en
    Country string `json:"country_override"` // ISO 3166：US
}

func HandleDomainSwitch(w http.ResponseWriter, r *http.Request) {
    // 1. 讀取 API 傳來的鍵值
    // 2. 設定 Cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "locale",
        Value:    "en-US",
        Domain:   ".yourdomain.com",
        HttpOnly: true,
    })
    // 3. 回傳 200 OK，不帶 Body
    w.WriteHeader(http.StatusOK)
}
```

### 四、BCP 47 語系標籤的 Subtag 結構

**(l)** <mark style="background: #ADCCFFA6;">Subtag（子標籤）</mark>是組成語系標籤的最小單位，本身只是代碼，意義取決於它在整串標籤中的<mark style="background: #FFF3A3A6;">位置與長度</mark>，不需要查表也能大致辨識。以 `zh-Hant-TW` 為例：

| Subtag 類型 | 範例 | 辨識特徵 |
|---|---|---|
| Language（語言） | `zh`、`en`、`ja` | 通常在第一位，2～3 個字母 |
| Script（字體／腳本） | `Hant`（繁體）、`Hans`（簡體） | 固定 4 個字母，首字母大寫 |
| Region（地區） | `TW`、`US`、`GB`；或 `419`（拉丁美洲） | 2 個大寫字母（ISO 3166-1）或 3 個數字（UN M.49） |

**(m)** <mark style="background: #FF5582A6;">Suppress-Script（抑制腳本）＝「廢話過濾機制」</mark>：這是 IANA 語系子標籤註冊表（Language Subtag Registry）裡對每個語言標籤的一條<mark style="background: #FFF3A3A6;">規範</mark>，規定「當某語言通常只用某種文字書寫時，該文字的 Script Subtag 必須省略，不可寫出來」，目的是避免標籤冗長。例如：英文只用拉丁文書寫，所以 `en` 的註冊資料寫著 `Suppress-Script: Latn`，正確寫法是 `en`，`en-Latn` 是錯誤的過度宣告；日文同理，`ja` 而非 `ja-Jpan`。<mark style="background: #BBFABBA6;">唯一例外</mark>：中文（`zh`）因為同時有繁體（Hant）與簡體（Hans）兩種主流書寫系統，屬於「有分歧」的情況，沒有設定 Suppress-Script，所以 `zh-Hant`、`zh-Hans` 才是正確且必須寫出來的。

**(n)** <mark style="background: #D2B3FFA6;">Suppress-Script 不是程式語法，而是「官方字典裡的規定」</mark>，它靠<mark style="background: #FFF3A3A6;">各程式語言的 i18n 套件在底層自動比對執行（Canonicalization）</mark>，而不是逼你的程式碼直接崩潰報錯。流程：你輸入不規範標籤（如 `en-Latn-US`）→ 程式內建的語系套件查 IANA 官方註冊表 → 發現 `en` 有 `Suppress-Script: Latn` → 自動把多餘的 `Latn` 剃除 → 得到規範化的 `en-US`。Go 語言範例：

```go
import "golang.org/x/text/language"

tag, _ := language.Parse("en-Latn-US")
canonicalTag := tag.Canonicalize()
fmt.Println(canonicalTag.String()) // 輸出：en-US（自動省去 Latn）
```

**(o)** <mark style="background: #FF5582A6;">若自建系統硬用不規範標籤的後果</mark>：如果 locales 表的 `code` 欄位存成 `en-Latn-US` 這種過度宣告的值，資料庫不會報錯，但會出現兩種實務問題——⑴ 前端對不上：瀏覽器 `navigator.language` 通常只回傳規範化的 `en-US`，拿去查資料庫裡的 `en-Latn-US` 會因字串不符而找不到翻譯；⑵ 套件直接判無效：許多現代 i18n 框架偵測到不合規範標籤會直接判定無效，自動 fallback 回預設語系（如變成中文），而不是報錯讓你注意到問題。

## 各對話來源

### i18n 資料庫設計：子母表模式（2026 年，多輪）— https://gemini.google.com/app/63511ff0c6b920fd

使用者：我們 i18n 有建表，不用 JSON，還是你說的 JSON 是用在 API？

Gemini：（見上方重點 a–c）釐清資料庫 Table 是持久化儲存，JSON 是 API 傳輸包裝；給出 locales 表結構範例與後端 Query → struct → Marshal → API 的流程。

使用者：我老闆要我去看業界做法，可是我又看不到人家的程式碼，那個有在 GitHub 嗎？

Gemini：（見上方重點 d）說明兩種合法觀察業界做法的途徑——F12 觀察 Network 請求、GitHub 開源專案參考。

使用者：切換網站語系（例如從中文換成英文），是點該網站的 UI 還是瀏覽器原生的語言切換？

Gemini：（見上方重點 e–g）區分網站 UI 切換與瀏覽器原生翻譯的差異與風險，並說明大牌網站的自動引導流程。

使用者：（貼上一段 `H4sIA...` 開頭的長字串）我去打了 airbnb 的 API，messages 的 API 出現這個 Request payload，你覺得他可能是使用者的什麼？

Gemini：（見上方重點 h）判斷這是 Gzip + Base64 編碼，用於壓縮大型 JSON 傳輸。

使用者：從 domain_switch_send 這個 API 一直打下去，之後隨著滾輪上下捲動出現 74 個 Network 請求紀錄，我覺得只有第一個 domain_switch_send 跟語系有關係，其他 messages 跟 proxytown 沒關係，請你不要 hallucinate。其中重複最多的是 proxytown、messages，proxytown 的 request payload 是 `{F: "bif67q0dov", Q: [{V: "1qkyez9p5lp", w: "1qkyez9p5lp.d", a: ["cookie"]}]}`。

Gemini：（見上方重點 i）確認使用者判斷正確，proxytown／messages 與語系無關，屬於數據代理／埋點系統，並拆解該 payload 欄位結構。

使用者：（貼上 domain_switch_send 完整的 Request/Response Headers）這樣我能觀察到什麼？

Gemini：（見上方重點 j–k）逐項拆解 Headers：語系與 ccTLD 連動、`locale` 與 `country_override` 分開傳參、Response 為空的「純動作 API」設計、靠 set-cookie 持久化狀態，並給出對應 Go 後端 DTO 範例。

使用者：Subtag 是語言還是地區？

Gemini：（見上方重點 l）說明 Subtag 依位置與長度可分為 Language／Script／Region 三種，並以 `zh-Hant-TW` 為例拆解。

使用者：Suppress-Script 是什麼？（後續追問「看不懂」「他怎麼做到 suppress 的」）

Gemini：（見上方重點 m–o）解釋 Suppress-Script 是 IANA 對語言標籤的抑制規則（避免贅字），用日常比喻說明「是常識就不用寫出來」，並說明它是靠各程式語言 i18n 套件底層的 Canonicalization 機制強制執行，附 Go 範例；最後說明若自建系統硬用不規範標籤會導致前端比對失敗或被套件判定無效並 fallback。

## 資料來源（含查證時間）

> 查證日期：2026-07-18（下列為主題相關、可自行查證的標準文件；Gemini 回覆本身未附外部連結，故補上對應官方規格供核對）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| BCP 47 語系標籤標準（RFC 5646） | [IETF — RFC 5646: Tags for Identifying Languages](https://www.rfc-editor.org/rfc/rfc5646) | 2009 發布，持續為現行標準 |
| IANA 語言子標籤註冊表（含 Suppress-Script 欄位） | [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry) | 持續更新維護 |
| Go 語系標籤處理套件 | [golang.org/x/text/language](https://pkg.go.dev/golang.org/x/text/language) | 官方套件文件 |
| Go 語言 i18n 知名套件 | [nicksnyder/go-i18n](https://github.com/nicksnyder/go-i18n) | GitHub，持續維護 |
| Unicode CLDR（各國語系/地區標準資料） | [Unicode CLDR Project](https://cldr.unicode.org/) | 持續更新 |

⚠️ 存疑／更正：Gemini 針對 Airbnb `H4sIA...` 字串與 `domain_switch_send` API 的解讀（如「Gzip+Base64」「純動作 API」）屬<mark style="background: #FF5582A6;">合理技術推測</mark>，並非 Airbnb 官方文件證實，僅供架構參考，不宜當作 Airbnb 內部實作的確定事實引用。另外 `x-airbnb-sureride`、`origin-trial` 等欄位屬 Airbnb 內部或瀏覽器實驗性機制，本篇未深入查證其確切用途。

## 相關筆記

- Cookie 與 Session 基礎概念：[[Cookie-與-Session]]（因為 domain_switch_send 的持久化正是靠 set-cookie，兩篇可互相對照）
- GraphQL 與 REST 比較：[[GraphQL-概念與REST對比]]（同屬 API 設計決策的延伸主題）
