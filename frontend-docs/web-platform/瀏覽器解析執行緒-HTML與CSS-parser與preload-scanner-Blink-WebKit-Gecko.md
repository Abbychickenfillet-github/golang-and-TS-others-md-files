---
title: 瀏覽器的 HTML／CSS parser 跑在哪條執行緒？preload scanner 是什麼
type: topic-note
tags:
  - html-parsing
  - css-parsing
  - preload-scanner
  - speculative-parsing
  - main-thread
  - blink
  - webkit
  - gecko
related:
  - "[[script載入方式+前因後果]]"
  - "[[HTML-Parsing DOM樹建立過程-瀏覽器拿到HTTP-response-body之後]]"
  - "[[css-兩種卡頓-render-blocking與執行期jank]]"
updated: 2026-10-28
---

查證日 2026-10-28。Chromium、WebKit 是看 main 分支的原始碼目錄與註解；**沒有找到「現行執行緒架構」的官方文件，也沒有跑 profile 實測**，所以下表是從原始碼與官方討論推得，不是官方明文。

## 一、各引擎的 parser 在哪條執行緒

| 引擎 | HTML parser | CSS parser | preload scanner |
|---|---|---|---|
| **Blink**（Chrome、Edge） | **主執行緒**。曾有背景 HTML parser，2017-12 有 CL「Remove background html parser」（理由：`The background thread is no longer used`）；現行 `core/html/parser` 目錄已沒有 `background_html_parser.*`、`html_parser_thread.*` | **主執行緒、同步解析**（blink-dev 說明 CSS 文字解析在 Blink 是同步的）；現行 `core/css/parser` 目錄沒有任何 thread／background／worker 檔 | `HTMLPreloadScanner` 在**主執行緒**，只掃 body 資料的**第一個 chunk**。另有 `BackgroundHTMLScanner` 在 worker 掃**內嵌 script** 提早編譯（不是預載資源）；原始碼 TODO 寫「把 HTMLPreloadScanner 移到背景執行緒並合併」 |
| **WebKit**（Safari） | **主執行緒**。2013 加入背景解析（bug 107083）；2014-01 bug 127224「Remove the remaining threaded parser code」；現行 `html/parser` 目錄沒有 `HTMLParserThread`、`BackgroundHTMLParser` | **一般樣式表的解析：未能查證**（沒有官方說明，`css/parser` 目錄可見檔案沒有執行緒相關名稱）。**旁證（2026-11-04 查）**：WebKit bug 216370（2020-09，r267009）把 CSS 解析用到的 singleton 改成 `MainThreadNeverDestroyed`，原文說這些「not intended to ever be used off of the main thread」，表示設計預設是主執行緒；同一個 bug 提到 CSS 解析有「一小部分」（顏色、字型字串）為了 OffscreenCanvas 需要能在非主執行緒跑 | `HTMLPreloadScanner`、`CSSPreloadScanner` 檔案存在；在哪條執行緒**未查證** |
| **Gecko**（Firefox） | **背景 parser 執行緒**。MDN：「Firefox since Firefox 4, support speculative parsing off of the main thread」 | **樣式表丟 thread pool 解析**（bug 1346988，Firefox 61）。平行的是「不同樣式表之間」，不是單一檔案內；UA 樣式表永遠同步 | 沒有獨立元件。MDN 描述的是 parser 自己往後解析，推測式跑 tree construction 並提早發請求 |

名詞：
- **樣式表（stylesheet）**：一份 CSS，可以是 `<link rel="stylesheet" href="x.css">` 載進來的 `.css` 檔，也可以是 `<style>` 裡的內容。「樣式表丟 thread pool 解析」是指把整份 CSS 文字解析成規則（CSSOM）這件事
- **OffscreenCanvas**：可以不放在畫面上、也能在 Web Worker 裡使用的 Canvas API。Worker 裡沒有 DOM，所以畫圖時用到的「顏色字串、字型字串」（如 `'#ff0000'`、`'12px serif'`）要能在非主執行緒解析，這就是 WebKit bug 216370 裡「一小部分 CSS 解析要能在非主執行緒」的原因

重點：
- **Blink 與 WebKit：HTML、CSS 解析都在主執行緒**（WebKit 的 CSS 除外，未查證）。
- **只有 Firefox 把 HTML 解析放背景**，樣式表也丟 thread pool。
- 平行的永遠是**網路下載**；「兩個 parser 各自建」只代表兩套互不相依的演算法，不代表兩條執行緒。

## 二、preload scanner 是什麼

| 項目 | 說明 |
|---|---|
| 名稱 | 俗稱 **preload scanner**（預載掃描器）；MDN 詞彙表條目叫 **Speculative parsing**（推測式解析）。MDN 該頁**沒有出現 "preload scanner" 一詞** |
| 做什麼 | 主解析器被 script 擋住時，往後讀 HTML 原始碼，找出 `<script src>`、`<link href>`、`<img src>` 的網址，提早發請求 |
| 不是完整 parser | 它的工作是**找網址**，不是產生最後的 DOM。Blink 把 `HTMLPreloadScanner`、`html_tokenizer`、`html_document_parser` 分成不同元件。「不建 DOM」是從職責推論，原始碼註解沒有逐字寫 |
| 兩種做法 | Gecko：parser 自己往後解析，還推測式跑 tree construction（MDN）。Blink／WebKit：獨立的 `HTMLPreloadScanner` 只掃標記 |
| 看得到 | HTML 標記裡的資源 |
| 看不到 | 外部 CSS 檔裡的 `@import`、`url()`、`@font-face`，要等 CSS 被解析才發現 |
| 例外 | Blink 另有 `CSSPreloadScanner`，掃 CSS 文字裡的 `@import`（從 HTML token 讀入，推測是內嵌 `<style>`）。2014 年「掃外部 CSS 檔 @import」的 CL 當時**沒有 landed** |

### 二之一、preload scanner 自己有做 DNS 查詢和 TCP 三方交握嗎（2026-11-07 查證）

**沒有，它只負責「找出網址、交出請求」，連線由網路層處理。**

| 步驟 | 誰做 | 依據 |
|---|---|---|
| 掃 HTML、找資源 | `HTMLPreloadScanner` | Chromium 原始碼 `html_preload_scanner.cc`：`StartTagScanner::CreatePreloadRequest()` 建立 `PreloadRequest`，推進 `PreloadRequestStream` |
| 一般資源（`<img>`、`<script>`、`<link rel=stylesheet>`） | 交給 `HTMLResourcePreloader::Preload()` → `PreloadRequest::Start()`，走正常的資源抓取流程 | `html_resource_preloader.cc`。**抓取之後怎麼連線，我沒讀到網路層原始碼**；DNS、TCP、TLS 是任何請求都要的步驟，見 MDN「How browsers work」：先 DNS，再 TCP 三方交握，HTTPS 再 TLS，才能發請求。已有可重用的連線、DNS 已快取時會省略（MDN 說 IP 位址「likely be cached」、同源連線「already open」）。這是從這些文件推論，不是 preload scanner 專屬的行為說明 |
| `<link rel=preconnect>` | scanner 看到後發出 preconnect 請求，`HTMLResourcePreloader::Preload()` 呼叫 `PreconnectHost()` → `WebPrescientNetworking::Preconnect()`。**只建立連線，不抓資源** | `html_resource_preloader.cc`、`preload_helper.cc`；[MDN preconnect](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect)：「DNS+TCP for HTTP, and DNS+TCP+TLS for HTTPS origins」 |
| `<link rel=dns-prefetch>` | **不是 scanner 處理**。`html_preload_scanner.cc` 只在判斷樣式表時排除它；`dns-prefetch` 由 `PreloadHelper::DnsPrefetchIfNeeded` 處理，只做 DNS | `preload_helper.cc`；MDN preconnect 頁：dns-prefetch 只做第一步 DNS 查詢 |

- 所以你的問法「是直接做 DNS lookup，然後只做 TCP 三方交握嗎」：**一般資源請求不是只有這兩步**，HTTPS 還有 TLS，之後才送 HTTP 請求、收回應；而且有快取或舊連線時前面幾步會省略。
- web.dev 的 [Preload scanner](https://web.dev/articles/preload-scanner) 只說它「examines raw markup in order to find resources to opportunistically fetch」，沒講連線細節。
- 沒查證：HTTP/3（QUIC）的連線流程不是 TCP 三方交握，這次沒查。

## 三、對時間軸圖的影響

- 圖中 JS、CSS 的下載起點畫成「解析到那個標籤」是**簡化**；實際上 preload scanner 會更早發請求。
- 圖裡的「CSS 線」是邏輯流程，**不是獨立執行緒**。
- 橫軸數字是相對刻度，不是毫秒。

## 資料來源（2026-10-28 查證）

| 內容 | 來源 |
|---|---|
| Speculative parsing 定義與 Firefox 4 | https://developer.mozilla.org/en-US/docs/Glossary/Speculative_parsing |
| Blink HTML parser 目錄（無 background_html_parser） | https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/parser/ |
| BackgroundHTMLScanner 註解（preload scanner 在主執行緒、只掃第一個 chunk） | https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/parser/background_html_scanner.h |
| Blink 移除背景 HTML parser 的 CL | https://groups.google.com/a/chromium.org/g/blink-reviews-html/c/ci2CwKqpbjw |
| Blink CSS 解析為同步 | https://groups.google.com/a/chromium.org/g/blink-dev/c/gL2EVBzO5og/m/YfId9-vqBAAJ |
| Blink CSS parser 目錄（無執行緒相關檔） | https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/css/parser/ |
| WebKit 移除 threaded parser | https://bugs.webkit.org/show_bug.cgi?id=127224 |
| WebKit html／parser 目錄 | https://github.com/WebKit/WebKit/tree/main/Source/WebCore/html/parser |
| Firefox 樣式表丟 thread pool 解析 | https://bugzilla.mozilla.org/show_bug.cgi?id=1346988 |
| Blink 掃外部 CSS 檔 @import 的 CL（未 landed） | https://codereview.chromium.org/166633002 |
| WebKit CSS 解析 singleton 限主執行緒（2020-09，2026-11-04 開啟原文確認） | https://bugs.webkit.org/show_bug.cgi?id=216370 |

2026-11-04 補查：搜尋「Blink 現在是否已把樣式表解析移到非主執行緒」，只找到 2015～2019 的舊討論（新 CSS parser「未來可能」離主執行緒；constructable stylesheets 提案說 CSS 文字解析是同步的），**沒有找到現行 Chromium 已改成非主執行緒的證據**，也沒有證據證明沒有。結論維持上表，但屬「截至舊資料與目錄檢查」。
