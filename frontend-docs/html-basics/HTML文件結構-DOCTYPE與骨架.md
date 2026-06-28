---
title: HTML 文件結構:DOCTYPE、骨架、lang 與 charset
type: topic-note
source: Claude
category: 技術
tags: [html, doctype, quirks-mode, semantic-html, lang, charset, utf-8, 面試]
updated: 2026-06-28
---

# HTML 文件結構:DOCTYPE、骨架、lang 與 charset

> 面試常考的「最基礎卻最少人講得出所以然」的一題。把每一行 boilerplate 的**為什麼**講清楚。

---

## 🎯 面試常考題(速答區,詳解在對應章節)

| # | 常考問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | `<!DOCTYPE html>` 是 HTML 標籤嗎? | 不是,是**文件類型宣告**,作用是叫瀏覽器進**標準模式** | §1 |
| Q2 | 不寫 DOCTYPE 會怎樣? | 掉進**怪異模式 (quirks mode)**,CSS 盒模型行為跑掉 → 跑版 | §1 |
| Q3 | 為何會有怪異模式? | **向後相容** 1990 年代照舊瀏覽器 bug 寫的舊網站 | §1 |
| Q4 | 為何 HTML5 的 DOCTYPE 這麼短? | HTML5 **不再依賴 SGML/DTD**,舊版 `.dtd` 網址沒用了 | §2 |
| Q5 | `<head>` 和 `<body>` 差在哪? | head=給機器的**設定**(不顯示);body=給人看的**內容** | §3 |
| Q6 | **`lang` 和 `charset` 是同一件事嗎?**(陷阱題) | **不是**。lang=哪種語言(語意);charset=bytes 怎麼解碼(編碼) | §4 |
| Q7 | 為何能用 `lang="zh-TW"`?跟 UTF-8 有關嗎? | 無關。zh-TW 是 **BCP 47 合法標籤**;能顯示中文才靠 UTF-8 | §4 |
| Q8 | 什麼是 BCP 47? | IETF「識別人類語言」的標準(核心 RFC 5646),規定語言標籤怎麼寫 | §4 |
| Q9 | 為何 `<meta charset>` 要放 head 最前面? | 瀏覽器**邊讀邊解碼**,要在讀到中文前知道編碼(前 1024 bytes) | §4 |
| Q10 | 不寫 charset 會怎樣? | 中文可能變**亂碼 (mojibake)**,如 `ä¸­æ–‡` | §4 |
| Q11 | 什麼是語意化標籤?為什麼用? | `<header>/<main>/<article>` 取代純 `<div>`,為**無障礙/SEO/可維護性** | §5 |
| Q12 | **HTML5 新增了哪些 API?** | 儲存、繪圖、通訊、裝置、背景執行緒、離線、互動、表單八大類 | §6 |

---

一份最小但正確的 HTML5 文件:

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>頁面標題</title>
  </head>
  <body>
    <!-- 看得到的內容 -->
  </body>
</html>
```

下面逐行拆解。

---

## 1. `<!DOCTYPE html>` 是什麼

### 它不是 HTML 標籤,是「文件類型宣告 (Document Type Declaration)」

- <mark style="background: #ADCCFFA6;">它不是元素、沒有結束標籤、不能放屬性</mark>,純粹是寫在檔案**最頂端第一行**的一個指示。
- 作用對象是**瀏覽器**:告訴它「**請用標準模式 (Standards Mode) 來解析這份文件**」。

### 為什麼一定要寫?關鍵在「標準模式 vs 怪異模式」

這要回到歷史。1990 年代末,各家瀏覽器(IE、Netscape)對 CSS 的實作**各搞各的**,跟後來的 W3C 標準不一樣。等標準統一後,問題來了:**那些舊網站是照舊行為寫的,如果瀏覽器突然改成照標準跑,舊網站全部跑版。**

瀏覽器的解法是「**靠 DOCTYPE 判斷你是新網站還舊網站**」:

| 模式 | 觸發條件 | 行為 |
|---|---|---|
| <mark style="background: #BBFABBA6;">標準模式 (Standards Mode)</mark> | 有寫 `<!DOCTYPE html>` | 照現代 W3C/WHATWG 標準解析 CSS 與排版 |
| <mark style="background: #FF5582A6;">怪異模式 (Quirks Mode)</mark> | **沒寫 DOCTYPE** 或寫錯 | 模擬 1990 年代舊瀏覽器的 bug 行為,向後相容舊網站 |

> [!warning] 不寫 DOCTYPE 會怎樣?
> 瀏覽器掉進**怪異模式**,最經典的災情就是 <mark style="background: #FFF3A3A6;">CSS 盒模型 (box model) 算法不一樣</mark>——舊 IE 的 `width` 把 padding/border 算進去,標準模式不算。結果就是你的版面寬度全部對不上、跑版。**所以 DOCTYPE 是「啟用正常排版」的開關,不是裝飾。**

> 補充:還有第三種「近乎標準模式 (Almost Standards Mode)」,差別只在圖片底部那一點點空隙的處理,面試講到標準/怪異兩種就夠了。

---

## 2. 為什麼 HTML5 簡化成 `<!DOCTYPE html>`?

因為**舊版的 DOCTYPE 落落長到沒人記得住**。對比一下 HTML 4.01 的宣告:

```html
<!-- HTML 4.01 Strict —— 又長又要背 URL -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
  "http://www.w3.org/TR/html4/strict.dtd">

<!-- XHTML 1.0 —— 一樣冗長 -->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
```

### 為什麼舊版要那串東西?

舊版 HTML/XHTML 是建立在 **SGML** 這套更早的標準之上。那串 `PUBLIC "..."` + 一個 `.dtd` 網址,是指向一份 <mark style="background: #ADCCFFA6;">DTD (Document Type Definition)</mark>——理論上用來「定義並驗證這份文件用了哪些合法標籤」。

### HTML5 的突破

HTML5 **不再依賴 SGML / DTD** 了。所以那個指向 .dtd 的網址完全沒用,可以整個砍掉。

那為什麼還要留 `<!DOCTYPE html>` 這短短一句?<mark style="background: #BBFABBA6;">它存在的唯一理由,就是上面講的「讓瀏覽器進標準模式」這個開關功能。</mark>它已經是「為了觸發標準模式所需的最短字串」——短到不能再短,所以面試可以這樣總結:

> **HTML5 的 `<!DOCTYPE html>` 不再是給驗證器看的文件定義,而是純粹保留下來當「標準模式開關」的歷史遺物。**

---

## 3. 骨架:`<html>` / `<head>` / `<body>` 各自的職責

```html
<html lang="zh-TW">   <!-- 根元素,包住整份文件 -->
  <head> ... </head>  <!-- 給機器看的「設定/中繼資料」,不直接顯示 -->
  <body> ... </body>  <!-- 給人看的「內容」,顯示在畫面上 -->
</html>
```

| 元素 | 職責 | 一句話記法 |
|---|---|---|
| `<html>` | <mark style="background: #ADCCFFA6;">根元素 (root)</mark>,所有東西的最外層容器;`lang` 屬性放在這 | 整棟房子 |
| `<head>` | 放 <mark style="background: #FFF3A3A6;">中繼資料 (metadata)</mark>:charset、title、viewport、CSS/JS 連結、SEO meta。**不會顯示在頁面上** | 房子的「設定/說明書」 |
| `<body>` | 放**使用者實際看得到**的內容:文字、圖片、按鈕… | 房子裡「住人、看得到」的空間 |

核心區分:<mark style="background: #BBFABBA6;">`<head>` 是「給瀏覽器/搜尋引擎/爬蟲讀的設定」,`<body>` 是「給人看的內容」。</mark>

---

## 4. `lang` 與 `charset` —— 最容易搞混的兩件事(面試重點)

你的疑問:「`lang` 我可以用 `zh-TW`,是因為我有 `charset UTF-8` 嗎?」

**答案:不是。這是兩個不同層次、互相獨立的東西。** 把它們搞清楚,面試大加分。

| | `lang="zh-TW"` | `<meta charset="UTF-8">` |
|---|---|---|
| 管什麼 | 這份內容是**哪一種「人類語言」** | 這份檔案的**位元組要怎麼「解碼」成文字** |
| 層次 | 語意層(內容的語言) | 編碼層(bytes ↔ 字元) |
| 寫在哪 | `<html>` 上 | `<head>` 第一個 `<meta>` |
| 沒寫會怎樣 | 無障礙/SEO/翻譯判斷變差,但字照樣顯示 | <mark style="background: #FF5582A6;">中文可能變亂碼(亂碼/mojibake)</mark> |

### (a) `lang="zh-TW"` 在做什麼?

它是一個 <mark style="background: #ADCCFFA6;">BCP 47 語言標籤</mark>,格式是 `語言-地區`:`zh` = 中文、`TW` = 台灣 → 台灣正體中文。你能用 `zh-TW`,**單純因為這是標準裡合法的標籤,跟 charset 完全無關。**

> [!info] BCP 47 是什麼?(面試可加分)
> **BCP = Best Current Practice(IETF 的「現行最佳實務」文件編號)。** BCP 47 是 IETF 用來「**識別人類語言**」的標準,規定語言標籤怎麼寫。它由幾份 RFC 組成,核心是 **RFC 5646**。
>
> - 重點:BCP 47 是一個**永久編號**,內容會隨新 RFC 更新(目前指向 RFC 5646);你引用 `BCP 47` 永遠拿到最新版。
> - 標籤結構(由左到右、可省略):`語言-文字系統-地區-變體`,例:
>   - `zh-TW` = 中文 + 台灣
>   - `zh-Hant` = 中文 + **正體字**(Hant=Traditional)
>   - `zh-Hant-TW` = 中文 + 正體 + 台灣(最精確)
>   - `en-US` = 英文 + 美國
> - 合法的子標籤值來自 <mark style="background: #FFF3A3A6;">IANA Language Subtag Registry</mark>(官方清單),不是隨便填。
>
> **官方文件:**
> - BCP 47 入口(永遠指向最新):<https://www.rfc-editor.org/info/bcp47>
> - RFC 5646《Tags for Identifying Languages》:<https://www.rfc-editor.org/rfc/rfc5646>
> - IANA 官方子標籤清單:<https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry>
> - W3C 較好讀的教學:<https://www.w3.org/International/articles/language-tags/>
> - MDN `lang` 屬性:<https://developer.mozilla.org/zh-TW/docs/Web/HTML/Global_attributes/lang>

它的用途(都是「告訴機器這是什麼語言」):
- <mark style="background: #BBFABBA6;">無障礙</mark>:螢幕報讀器 (screen reader) 知道要用「中文發音」念,而不是用英文腔念中文。
- <mark style="background: #BBFABBA6;">SEO / 搜尋引擎</mark>:Google 知道這頁是給中文使用者看的。
- **瀏覽器翻譯**:Chrome 判斷「要不要跳出『翻譯這個網頁』」。
- **字型與斷行**:同一個漢字在中日文字型下字形不同,`lang` 幫瀏覽器選對字型。

### (b) `<meta charset="UTF-8">` 在做什麼?

檔案存在硬碟裡其實只是一串**位元組 (bytes)**。瀏覽器要知道「這串 bytes 要用哪一套**編碼表**翻譯回文字」。`charset="UTF-8"` 就是告訴它:<mark style="background: #FFF3A3A6;">「請用 UTF-8 這套編碼來解讀」</mark>。

- **UTF-8** 是 Unicode 的一種編碼,幾乎能表示世界上所有文字(中文、emoji 都行),是現在的**事實標準**。
- 如果瀏覽器用錯編碼(例如用 Big5 或 Latin-1 去讀 UTF-8 的檔),你的「中文」就會變成 `ä¸­æ–‡` 這種**亂碼 (mojibake)**。
- 這也呼應 [[進位制-二進制-十六進制-Bytes與RGB]]:文字最終都是 bytes,charset 就是 bytes → 字元的對照規則。

> [!important] 為什麼 charset 要放在 `<head>` 「最前面」?
> 因為瀏覽器是**邊讀邊解碼**。它必須在讀到任何中文之前就知道編碼,否則前面那段已經用錯編碼解析了。規範要求 charset 宣告必須出現在**檔案前 1024 bytes 內**,所以慣例擺 `<head>` 第一行。

### (c) 兩者的真正關係(一句話講清楚)

> <mark style="background: #BBFABBA6;">`charset=UTF-8` 負責「讓中文字能正確被解碼、不變亂碼」;`lang=zh-TW` 負責「告訴機器這些字是台灣中文」。</mark>
>
> 你能正確**顯示**中文,靠的是 UTF-8;你宣告它**是**中文,靠的是 lang。兩者都建議寫,但它們解決的是不同問題,不是因果關係。

面試如果追問「那只寫 lang 不寫 charset 行嗎?」→ 答:lang 照樣合法,但中文很可能亂碼,因為沒告訴瀏覽器怎麼解碼 bytes。反過來只寫 charset 不寫 lang → 中文能正常顯示,但無障礙/SEO/翻譯判斷會變差。

---

## 5. 語意化標籤 (Semantic HTML)

`<body>` 裡與其全部用 `<div>`,不如用**有意義的標籤**——這就是「語意化」。

```html
<body>
  <header>網站頁首、Logo、導覽列</header>
  <nav>主導覽連結</nav>
  <main>
    <article>一篇可獨立存在的內容(文章、商品卡)</article>
    <section>主題分區</section>
    <aside>側欄、相關連結</aside>
  </main>
  <footer>頁尾、版權</footer>
</body>
```

| 標籤 | 語意 |
|---|---|
| `<header>` | 頁首 / 區塊開頭 |
| `<nav>` | 導覽連結區 |
| `<main>` | 頁面**主要**內容(一頁只能有一個) |
| `<article>` | 可獨立存在、可被單獨轉發的內容 |
| `<section>` | 主題性分區 |
| `<aside>` | 與主內容相關但非核心(側欄) |
| `<footer>` | 頁尾 |

### 為什麼要語意化?(面試重點)

- <mark style="background: #BBFABBA6;">無障礙</mark>:螢幕報讀器能讓使用者「直接跳到 `<main>`」「列出所有 `<nav>`」,一堆 `<div>` 做不到。
- <mark style="background: #BBFABBA6;">SEO</mark>:搜尋引擎更懂頁面結構,知道哪塊是主內容。
- <mark style="background: #FFF3A3A6;">可讀性/可維護性</mark>:`<header>` 比 `<div class="header">` 一眼就懂。

> 對比:`<div>` / `<span>` 是**無語意**的純容器,只有在沒有合適語意標籤時才用。

---

## 6. HTML5 有哪些 API?(考題)

> [!question] 面試題:「請說說 HTML5 新增了哪些 API?」
> 這題重點不是背完所有 API,而是**能分類、舉幾個會用的、講出用途**。先講「HTML5 不只是新標籤,還帶來一整套瀏覽器 JavaScript API」這句總綱,再分類舉例。

> [!warning] 觀念釐清:這些大多是「Web API」而非「HTML 語法」
> 嚴格說,很多人口中的「HTML5 API」其實是**瀏覽器提供的 Web API**(用 JS 呼叫),只是因為它們隨 HTML5 世代一起普及,面試習慣統稱「HTML5 API」。它們屬於 [[#相關筆記|web-platform]] 範疇(瀏覽器執行期能力),不是 HTML 標籤本身。

### 常見分類與代表 API

| 分類 | 代表 API | 一句話用途 |
|---|---|---|
| <mark style="background: #ADCCFFA6;">儲存 Storage</mark> | `localStorage` / `sessionStorage`、**IndexedDB** | 在瀏覽器端存資料(取代部分 cookie);IndexedDB 存大量結構化資料 |
| <mark style="background: #ADCCFFA6;">繪圖 / 多媒體</mark> | `<canvas>` + Canvas API、**WebGL**、`<video>`/`<audio>` Media API | 2D/3D 繪圖、原生影音播放控制 |
| <mark style="background: #ADCCFFA6;">網路通訊</mark> | **Fetch API**、**WebSocket**、Server-Sent Events (SSE)、`XMLHttpRequest` | 取資料、雙向即時通訊、伺服器單向推播 |
| <mark style="background: #ADCCFFA6;">裝置 / 感測</mark> | **Geolocation**(定位)、Device Orientation、Vibration | 取得位置、裝置方向、震動 |
| <mark style="background: #ADCCFFA6;">效能 / 背景</mark> | **Web Workers**(背景執行緒)、`requestAnimationFrame`、Performance API | 把繁重運算丟背景不卡 UI、流暢動畫、量測效能 |
| <mark style="background: #ADCCFFA6;">離線 / PWA</mark> | **Service Worker** + Cache API、Web App Manifest | 離線可用、背景同步、安裝成 App |
| <mark style="background: #ADCCFFA6;">使用者互動</mark> | **Drag and Drop**、History API(`pushState`)、Fullscreen、Clipboard | 拖放、SPA 改網址不重整、全螢幕、剪貼簿 |
| <mark style="background: #ADCCFFA6;">表單強化</mark> | 新 `<input type>`(`email`/`date`/`range`…)、Constraint Validation API | 原生輸入控制與表單驗證 |

> [!tip] 面試怎麼答最漂亮
> 別硬背整張表。挑**你真的用過的 3~4 個**深入講,例如:
> - 「我用 **History API 的 `pushState`** 做 SPA 路由,改網址但不整頁重載」(對應你 TanStack Router 的經驗)
> - 「用 **localStorage** 存登入 token / 偏好設定」
> - 「用 **Fetch API** 打後端、**IndexedDB** 做前端快取」
> 然後補一句分類總綱(儲存、繪圖、通訊、裝置、背景、離線、互動、表單),展現你有全貌。

**官方文件:**
- MDN Web API 總覽(最實用):<https://developer.mozilla.org/zh-TW/docs/Web/API>
- WHATWG HTML Living Standard(HTML 的真正規範,持續更新):<https://html.spec.whatwg.org/>

---

## 重點回顧(面試速記)

- **`<!DOCTYPE html>`** = 不是標籤,是「啟用**標準模式**」的開關;不寫會掉進**怪異模式 (quirks mode)**,CSS 盒模型等行為跑掉導致跑版。
- **HTML5 為何這麼短** = 它不再依賴 SGML/DTD,舊版那串 `.dtd` 網址沒用了;只保留觸發標準模式的最短字串。
- **骨架** = `<html>`(根、放 lang)→ `<head>`(給機器的設定,不顯示)→ `<body>`(給人看的內容)。
- **`lang` vs `charset` 是兩件事**:`lang=zh-TW` 宣告「內容是台灣中文」(無障礙/SEO),`charset=UTF-8` 宣告「bytes 用 UTF-8 解碼」(防亂碼)。能用 zh-TW 跟 charset 無關;能顯示中文靠 UTF-8。
- **charset 要放 head 最前面**:瀏覽器邊讀邊解碼,必須在讀到中文前就知道編碼。
- **語意化標籤**:為了無障礙、SEO、可維護性,優先用 `<header>/<main>/<article>` 而非一堆 `<div>`。

## 相關筆記

- [[Markdown-渲染為DOM的過程]] — 瀏覽器拿到 HTML 字串後怎麼解析成 DOM
- [[進位制-二進制-十六進制-Bytes與RGB]] — charset 背後:文字終究是 bytes
- 建置/編譯:`build-and-compilation/`
- 瀏覽器平台 API:`frontend-docs/web-platform/`
