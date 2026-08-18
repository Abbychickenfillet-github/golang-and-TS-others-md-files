---
title: CJK漢字復用與Noto字體選擇-i18n多語系與Docker打包
type: topic-note
source: Gemini
tags: [gemini, css, 字體, unicode, cjk, i18n, nextjs, docker, woff2]
sources:
  - https://gemini.google.com/app/74c43e47dd339aae
updated: 2026-08-15
---

# CJK 漢字復用與 Noto 字體選擇｜i18n 多語系與 Docker 打包

> 本篇重點 a–r，共 18 個

相關筆記：[[EC2-vs-ECS-vs-Fargate-vs-VPS-容器部署選型]]、[[ASCII-美國資訊交換標準碼]]、[[ChatGPT匯出JSON-Unicode跳脫序列看似亂碼]]、[[00-CSS觀念複習地圖與資料夾索引]]
關聯原因：這篇的上半段（Unicode 碼點與字形）跟 ASCII／Unicode 跳脫序列筆記是同一個編碼家族；下半段（字體要不要跟著 Docker 走）直接接到容器部署選型那篇，兩篇原本是同一場對話拆出來的。

---

## 重點整理

### 一、Unicode 漢字復用（Han Unification）

(a) <mark style="background: #ADCCFFA6;">漢字復用（Han Unification）</mark>是 Unicode 的一條規則：中、日、韓、台、港使用的漢字，只要來源、意義、基本結構相同，<mark style="background: #FFF3A3A6;">不管各地寫法細節差多少，通通只給同一個編碼（Code Point）</mark>。

(b) <mark style="background: #ADCCFFA6;">主要共用區塊</mark>是 <mark style="background: #FFF3A3A6;">CJK Unified Ideographs（中日韓統一表意文字），範圍 U+4E00 – U+9FFF</mark>，收錄兩萬多個常用漢字。

(c) <mark style="background: #FFB8EBA6;">實例</mark>：「草」的碼點是 U+8349。台灣標準的「艹」部首通常是四畫（兩個十字）、中國大陸標準通常是三畫（一橫兩豎相連）、日本標準又有細微筆折差異——<mark style="background: #FFF3A3A6;">但底層存的都是同一個 U+8349</mark>。

(d) <mark style="background: #BBFABBA6;">一句話總結</mark>：<mark style="background: #ADCCFFA6;">編碼決定「是什麼字」（語義），字體檔案與語系設定決定「長什麼樣」（字形 Glyph）</mark>。

---

### 二、書寫習慣優先順序與 lang 屬性

(e) 常看到的 <mark style="background: #ADCCFFA6;">SC > HK > TC > JP > KR</mark> 指的是字形標準的優先順序：SC（簡體中文，如微軟雅黑）、HK（香港繁體）、TC（台灣繁體，如微軟正黑體）、JP（日本漢字，如 MS Gothic）、KR（韓國漢字）。

(f) <mark style="background: #FF5582A6;">如果系統把 SC 排在 TC 前面</mark>，你看到的繁體字會帶有簡體字的筆畫結構，字是對的但視覺上「怪怪的」。

(g) <mark style="background: #BBFABBA6;">HTML 的 `lang` 屬性就是在告訴瀏覽器要用哪一國的順序渲染</mark>：`<html lang="zh-TW">` 代表請照 TC 優先。<mark style="background: #FF5582A6;">沒設或設錯，瀏覽器會依系統預設（英文系統常配 SC 優先）</mark>，這就是很多繁體網頁筆畫看起來怪的原因。

(h) 軟體拿到 U+8349 時的判斷順序是：<mark style="background: #ADCCFFA6;">HTML `lang` 屬性 → 字體優先順序（font-family）→ 使用者系統區域</mark>。

---

### 三、Noto CJK 該下載哪一個

(i) <mark style="background: #D2B3FFA6;">先破除迷思</mark>：OTF（OpenType Font）本身不老舊，它是現代且標準的格式。要避開的是「All」開頭的巨無霸整合檔（幾百 MB），除非你真的要在同一台電腦切換中日韓所有字形。

| 下載選項 | 內容 | 建議 |
|---|---|---|
| Region Specific Subset OTFs | 只保留單一地區標準字形，約 45MB | <mark style="background: #BBFABBA6;">只做繁中網站／IDE 字體時選這個</mark>，不必判斷優先順序，直接就是台灣標準 |
| All Static Language Specific OTFs | 每個語言、每個粗細各自獨立檔案 | <mark style="background: #BBFABBA6;">多語系（i18n）專案選這個</mark>，可以只挑 tc 與 jp 放進專案 |
| All Static Language Specific OTCs | 多語言打包成一個 OTC 容器 | 檔案大，開發不便 |
| All Variable OTF／TTF (OTC) | 單檔含所有粗細 | 靈活但舊瀏覽器與部分 Docker 渲染引擎相容性不一 |
| All Static Region Specific Subset OTFs | 精簡版，移除罕用字 | 最輕，但翻譯檔有罕見字會掉字 |

(j) <mark style="background: #ADCCFFA6;">名詞解密</mark>：Variable（可變字體，單檔含 Thin 到 Black 所有粗細）；Static（靜態字體，每種粗細獨立檔案，開發環境最穩）；OTC／Super OTC（把多個 OTF 打包的容器）；Region Specific（針對特定地區優化，最能保證字形正確）。

(k) <mark style="background: #FF5582A6;">Serif 與 Sans 別選錯</mark>：`Noto Serif CJK TC` 是思源宋體（有勾、書卷氣），`Noto Sans CJK TC` 是思源黑體（乾淨無襯線）。IDE 寫程式通常要 Sans 或 Mono。

(l) <mark style="background: #FFB8EBA6;">中英混排小技巧</mark>：`font-family: 'Noto Sans CJK TC', Inconsolata, monospace;` 讓中文走 Noto、英文走 Inconsolata。<mark style="background: #FF5582A6;">前提是該字體真的裝在系統裡</mark>，沒裝的話瀏覽器會直接跳過去抓後面那個。

---

### 四、i18n 專案的字體策略

(m) <mark style="background: #FF5582A6;">超過 2 種語言時，Region Specific 就不夠用</mark>，因為其他語言的字形會顯示錯誤。此時下載 `All Static Language Specific OTFs`，再各挑需要的語系。

(n) <mark style="background: #BBFABBA6;">轉成 `.woff2`</mark>：壓縮率最高、對瀏覽器最友善，體積通常比 OTF 少一半以上。

(o) <mark style="background: #BBFABBA6;">Next.js 用 `next/font/local` 封裝</mark>，讓框架自動做字體優化：

```javascript
import localFont from 'next/font/local'

const myFont = localFont({
  src: [
    { path: './fonts/NotoSansCJK-Regular.woff2', weight: '400', style: 'normal' }
  ],
  variable: '--font-cjk'
})

export default function RootLayout({ children, params }) {
  return (
    <html lang={params.lang} className={myFont.variable}>
      <body>{children}</body>
    </html>
  )
}
```

(p) <mark style="background: #FFF3A3A6;">字體太重（中日韓全打包可能超過 20MB）的兩條解法</mark>：

- <mark style="background: #BBFABBA6;">方案 A</mark>：用 `next/font/google`，Google 會依使用者語系只送需要的字元切片（靠 CSS 的 `unicode-range`）。缺點是要連外網。
- <mark style="background: #BBFABBA6;">方案 B</mark>：私有化部署不能連外網時，用 `fontmin`／`pyftsubset` 這類工具做<mark style="background: #ADCCFFA6;">字體抽稀（Subsetting）</mark>，把大字體切成繁中、簡中、日文三個小檔。

---

### 五、字體與 Docker 的關係

(q) <mark style="background: #FFF3A3A6;">「字體必須跟著 Docker 走」的意思</mark>：Docker 容器啟動時是一個幾乎什麼都沒有的乾淨 Linux 環境，<mark style="background: #FF5582A6;">它不會抓你電腦裡的字體，也不會抓 AWS 主機原本裝的字體</mark>。所以字體檔要放進專案（`public/fonts/` 或 `app/fonts/`）、跟著 git commit，Dockerfile 的 `COPY . .` 才會把它帶進映像檔。這樣不管跑在哪台機器，渲染結果都一致，不會「本地看很美、上線變醜」。

(r) <mark style="background: #FF5582A6;">不要用 npm 安裝字體</mark>（除非是 `fontsource` 這類封裝好的套件）：npm 上的 `noto-sans-cjk` 等套件通常非常龐大，會讓 `node_modules` 肥大、拖慢 Docker build，且版本更新緩慢。手動放 `.woff2` 進專案，你可以完全控制載入哪些粗細與語系，對<mark style="background: #BBFABBA6;">映像檔體積優化更有利</mark>。

| 部署方式 | 是否用 Docker | 字體存放位置 |
|---|---|---|
| SSR 模式（Next.js） | 是（ECS／Fargate） | 打包進 Docker Image 的 public 或 fonts 資料夾 |
| Static 模式（SPA → S3） | 否，直接上傳檔案 | 存在 S3 桶，由 CloudFront 分發 |

---

## 面試可以怎麼講

> 「我們將字體檔案放入專案資產中，利用 Next.js 的 `next/font/local` 進行封裝。好處是字體會隨著 Docker 映像檔版本化，確保 CI/CD 部署到任何環境（AWS 或 GCP）時渲染結果都保持高度一致，且用 woff2 格式減少了 30% 以上的網路傳輸。」

---

## 各對話來源（原文）

### CJK 排版深度解析與網頁應用（2026-08 前後）— https://gemini.google.com/app/74c43e47dd339aae

> 註：本場對話後半段大量討論 AWS EC2／ECS／Fargate／VPS 的差異，已另外整理為 [[EC2-vs-ECS-vs-Fargate-vs-VPS-容器部署選型]]，此處只保留字體與排版相關段落。

**使用者：** 要怎麼儲存才能生效

**Gemini：** 要在 Antigravity（或 VS Code 系列編輯器）中讓字體設定生效，有三種方式。1. 自動儲存（UI 模式）：在設定分頁輸入完字體名稱後，直接切換到其他分頁或關閉 Settings 標籤，設定就會自動寫入並生效；確保輸入完後按一下 Enter 或點空白處讓輸入框失去焦點。2. 編輯 settings.json（最保險）：按 Ctrl + Shift + P，輸入 "Open User Settings (JSON)"，找到 "editor.fontFamily" 改為 `"Inconsolata, DengXian, monospace"`，存檔（Ctrl + S），JSON 存檔的瞬間編輯器會強制重新渲染字體。3. 字體安裝確認（核心前提）：你的電腦裡必須先安裝該字體，若 Windows 沒有 Inconsolata，引擎會跳過它直接抓後面的 DengXian（等線體）；檢查方式是到 Windows 的「設定」>「個人化」>「字型」搜尋。另外要區分 IDE 的字體（你寫程式時自己看到的）與專案網頁的字體（用戶打開你網站時看到的）；如果想兩者統一，在專案裡放入 woff2 檔後也應該在自己電腦安裝一份對應字體。

**使用者：** 什麼叫書寫順序

**Gemini：** 這裡的「書寫習慣」並非指寫字快慢，而是指同一組 Unicode 編碼在不同地區顯示出的「字形標準」優先順序。很多漢字在中國大陸（SC）、香港（HK）、台灣（TC）、日本（JP）和韓國（KR）雖然共用同一個 Unicode 編碼，但寫法細節不同（例如「骨」的內折方向、「過」的部首點數）。當電腦要顯示一個字時，如果字體檔案同時包含多種地區的寫法，它必須知道要優先採用哪一國的標準。SC > HK > TC > JP > KR 代表：SC 簡體中文標準（如微軟雅黑）、HK 香港繁體標準、TC 台灣繁體標準（如微軟正黑體）、JP 日本漢字標準（如 MS Gothic）、KR 韓國漢字標準。如果你是台灣開發者但瀏覽器或系統設定 SC 優先於 TC，你看到的繁體字可能會帶有簡體字的筆畫結構。在 HTML 中設定 `<html lang="zh-TW">` 就是在告訴瀏覽器請依照 TC 優先的順序渲染漢字；沒設定或設定錯誤，瀏覽器可能會依系統預設（通常是英文系統配 SC 優先）顯示。關於 Noto Sans Mono CJK SC：Noto Sans 是 Google 與 Adobe 合作的思源黑體、Mono 是等寬字體（適合寫程式）、CJK 包含中日韓漢字、SC 代表預設採用中國大陸書寫標準；若希望看到台灣標準的繁體字，應該找 Noto Sans Mono CJK TC 版本。

**使用者：** 他們共用了哪一組編碼

**Gemini：** 所謂的「共用編碼」指的就是 Unicode（統一碼）。在 Unicode 標準中，有一套規則叫做「漢字復用」（Han Unification）：如果中、日、韓、台、港使用的漢字，其來源、意義和基本結構相同，那麼不管它們在各地的寫法細節有什麼微小差異，通通只給它們同一個編碼（Code Point）。在 Unicode 裡每一個字都有唯一的編號，格式通常是 U+ 開頭，例如「草」的編碼是 U+8349。不論你在哪裡輸入這個字，電腦底層存儲的數據都是 U+8349，但渲染時：台灣標準（TC）「艹」部首通常是四畫（兩個十字）；中國大陸標準（SC）「艹」部首通常是三畫（連在一起的一橫兩豎）；日本標準（JP）可能會有細微的筆折差異。主要的共用區塊是 CJK Unified Ideographs（中日韓統一表意文字），範圍 U+4E00 – U+9FFF，收錄了最常用的 20,000 多個漢字。既然編碼一樣，電腦怎麼知道要顯示哪種寫法？軟體（如瀏覽器）會去檢查：HTML lang 屬性是 zh-TW 還是 ja、字體優先順序設定是 DengXian 優先還是 MS Gothic 優先、使用者所在的地區。結論：編碼決定「是什麼字」（語義），而字體檔案（Font File）與語系設定（Locale）決定「長什麼樣」（字形）。

**使用者：** 現在我如果下載 OTF 是比較老舊的版本對嗎 我應該下載 Region Specific 那一個？

**Gemini：** 結論：OTF 本身不老舊，但為了你的開發需求，建議下載「Region Specific Subset OTFs」下面的台灣繁體版本。OTF（OpenType Font）是一種字體格式，本身非常現代且標準；你應該避開的是「All」開頭的巨無霸檔案，除非你需要在同一台電腦切換中日韓所有字形，否則檔案太大（幾百 MB）會拖慢系統載入速度。為什麼建議選 Region Specific Subset OTFs：這個類別下的檔案（如 Traditional Chinese — Taiwan）是經過「子集化（Subset）」處理的，只保留了符合台灣教育部標準的筆畫字形，這意味著當你輸入 U+8349 時不需要去判斷優先順序，直接就會給你正確的台灣繁體樣式；效能上檔案大小通常在 45MB 左右，比全語系版輕量很多。檔案標籤解密：Variable（可變字體）單一檔案包含所有粗細（Thin 到 Black），優點是靈活但在某些舊型編譯器或 Docker 環境可能有相容性問題；Static（靜態字體）每一種粗細都是獨立檔案，建議開發環境選這個最穩定；OTC／Super OTC 是把多個 OTF 打包在一起的容器；Region Specific 針對特定地區優化，最能保證字形正確。下載後：解壓縮，找到 NotoSerifCJKtc-Regular.otf，雙擊安裝到 Windows，設定字體名稱為 `'Noto Serif CJK TC', Inconsolata, monospace`（中文用 Noto Serif、英文用 Inconsolata）。小提醒：你下載的是 Serif（襯線體／明體）版本，如果你喜歡乾淨、沒有勾勾的樣式，應該搜尋 Noto Sans CJK TC（思源黑體）。

**使用者：** 但我們如果有做 i18n 的網頁翻譯需求，如果全文 .json 檔案有超過 2 個語言我們應該下載哪一個？而且如果用 docker 又應該怎樣我是應該要用 npm 下載才對嗎？

**Gemini：** 如果你有超過 2 個語言（例如繁中、簡中、日文、英文），下載「Region Specific」就不夠用了，因為它會導致其他語言的字形顯示錯誤。建議下載「All Static Language Specific OTFs」：這個版本包含所有地區的字形數據，但它是「靜態」的；雖然檔案很大，但你不需要把整個幾百 MB 的檔案丟給使用者，在 Next.js 中我們會利用 next/font/local 的 subsets 或 declarations 讓瀏覽器只下載當前語系需要的字元（透過 CSS 的 unicode-range）。在 Docker 中該如何處理：你不應該指望作業系統（如 Alpine 或 Debian 映像檔）內建這些字體。最佳實踐是將字體視為專案資產（Assets）——不要用 npm 安裝字體（除非是像 fontsource 這種封裝好的套件），最好的做法是將字體檔案（.woff2 格式最優）放在專案的 public/fonts/ 或 app/fonts/ 資料夾中，讓字體跟隨你的代碼一起 git commit，Dockerfile 在 COPY . . 時會自動把字體帶進容器。為什麼不要用作業系統層級安裝字體：不可控性（不同 Docker Base Image 內建的字體不同，可能導致本地開發與生產環境視覺不一致）、效能（網頁字體應該由瀏覽器下載，而不是由 Docker 伺服器渲染）。步驟一：轉換為 Web 優化格式（雖然你下載的是 .otf，但建議轉成 .woff2，壓縮率最高）。步驟二：使用 next/font/local 在 app/layout.js 中定義（程式碼見上方重點整理）。Q1 為什麼不用 npm install 下載：npm 上雖然有 noto-sans-cjk 等套件，但它們通常非常龐大，會導致 node_modules 肥大且版本更新緩慢；手動下載 woff2 放到專案裡，你可以完全控制載入的字體粗細與語系，這對 Docker Image 的體積優化更有利。Q2 超過 2 個語言字體會太重嗎：會，如果把所有中日韓字體都打包，檔案可能超過 20MB。解決方案：使用 Google Fonts API（透過 next/font/google），Google 會自動根據使用者的語系只傳送該語系需要的「字元切片」；如果必須私有化部署（不能連外網），則必須接受字體檔案較大的事實，或者使用像 fontmin 這樣的工具進行「字體抽稀」。

**使用者：** 這個應該都是放在前端對吧？那應該就跟 docker 無關，還是 aws 的話前端也算是 docker

**Gemini：** 「前端」在現代開發中確實常被打包進 Docker，尤其是在使用 Next.js 這種框架時。為什麼前端會跟 Docker 有關：如果你使用 Next.js、Nuxt.js 或 Node.js 後端，這些框架不只是「一堆 HTML/JS 檔案」，還需要一個運行環境（Runtime）來處理伺服器端渲染（SSR）或 API 路由；在 AWS 上我們通常會把整個 Next.js 專案打包成一個 Docker Image，運行在 AWS Fargate（ECS）或 App Runner 上，這時字體檔案就必須包含在 Docker Image 裡。什麼時候前端跟 Docker 無關：如果你將專案編譯成純靜態檔案（SPA），例如執行 npm run build 後只產生 dist 或 out 資料夾並直接丟上 AWS S3 + CloudFront，這種情況確實沒有 Docker，字體只是單純的靜態資源被瀏覽器下載。

**使用者：** 字體就必須跟著 docker 走是什麼意思

**Gemini：** 這句話的意思是：你必須把字體檔案直接放進你的專案資料夾裡，並透過 Dockerfile 打包進映像檔（Image）中。在傳統部署（非容器化）中，如果你在程式裡用到某個字體，你可能需要手動登入伺服器去安裝字體；但在 Docker 的世界裡：環境隔離——Docker 容器啟動時是一個非常乾淨、幾乎什麼都沒有的 Linux 環境（像是一間空屋），它不會抓取你電腦裡的字體，也不會抓取 AWS 伺服器原本裝的字體；自給自足——你的 Docker Image 就是一個「懶人包」，為了確保網頁渲染（或 SSR 生成頁面）時能找到字體，你必須在 Dockerfile 執行 COPY . . 時，確保字體檔案（如 NotoSans.woff2）已經在你的專案路徑下（例如 app/fonts/）。結果是無論這個 Docker 跑在你的電腦、同事的電腦，還是 AWS 上，字體都會永遠存在，不會出現「本地看很美，上線變醜」的問題。

**使用者：** 我在這 5 個 ALL 開頭的應該要選哪一個

**Gemini：** 既然你的專案有 i18n 多國語系需求，這 5 個選項的差別主要在於「打包方式」：All Variable OTF/OTC——可變字體，單一檔案包含所有粗細，不建議，因為某些舊瀏覽器或 Docker 渲染引擎對 Variable Font 支援度不一；All Variable TTF/OTC——同上，只是格式換成 TTF；All Static Language Specific OTCs——將不同語言標準打包成一個 OTC 容器；All Static Language Specific OTFs——最推薦此類，每個語言、每個粗細都是獨立的 OTF 檔案，這對開發者最友善，你可以只挑你要的 tc（繁中）和 jp（日文）放到專案裡；All Static Region Specific Subset OTFs——這是「精簡版」，移除了不常用的字元，雖然最輕，但如果你的翻譯檔裡有罕見字，可能會掉字。最終建議：下載 All Static Language Specific OTFs，解壓後挑選 NotoSansCJKtc-Regular.otf（繁中）和 NotoSansCJKjp-Regular.otf（日文）放入專案，這樣能保證不同語言顯示各自最正確的筆畫標準。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇來源對話（Gemini Flash） | https://gemini.google.com/app/74c43e47dd339aae | 對話擷取於 2026-08-15 |
| Unicode 官方｜Han Unification（Unicode Standard 第 18 章 East Asia） | https://www.unicode.org/versions/latest/ | 查證於 2026-08-15 |
| Google Fonts｜Noto CJK GitHub Releases | https://github.com/notofonts/noto-cjk | 查證於 2026-08-15 |
| Next.js 官方｜Font Optimization（next/font） | https://nextjs.org/docs/app/api-reference/components/font | 查證於 2026-08-15 |
| MDN｜CSS @font-face unicode-range | https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range | 查證於 2026-08-15 |
| MDN｜HTML lang 全域屬性 | https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang | 查證於 2026-08-15 |

> ⚠️ 存疑／更正：
> 1. Gemini 說 Region Specific Subset 「只保留符合台灣教育部標準的筆畫字形」。<mark style="background: #FF5582A6;">Noto CJK 的地區版依循的是各地的一般印刷慣例與 Unicode 的地區變體資料，不是逐字對照教育部標準字體</mark>，講成「教育部標準」過度肯定了。
> 2. Gemini 說 Variable Font「在某些 Docker 環境有相容性問題」。<mark style="background: #FF5582A6;">Docker 本身不渲染字體</mark>，相容性問題出在瀏覽器或 SSR 時用到的圖形函式庫，跟 Docker 沒有直接關係，這個因果講反了。
> 3. 「woff2 減少 30% 以上網路傳輸」是保守估計，實際上 woff2 相對 OTF／TTF 通常可省 40–50%，這句拿去面試講不會錯但偏低。
