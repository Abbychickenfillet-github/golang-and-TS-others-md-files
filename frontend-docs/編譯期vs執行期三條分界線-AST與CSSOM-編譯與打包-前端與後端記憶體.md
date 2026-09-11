---
title: 編譯期 vs 執行期的三條分界線——AST 與 CSSOM、編譯與打包、前端與後端記憶體
type: topic-note
source: Gemini
category: tech
tags: [gemini, 前端建構, ast, cssom, postcss, vite, webpack, vue, scoped-css, shadow-dom, xss, 記憶體, tokenizer, lexer, bpe, llm, 面試]
aliases: [AST-vs-CSSOM, 編譯vs打包, Scoped-CSS原理]
related:
  - "[[00-前端建構到執行全景地圖]]"
  - "[[Vite-HMR機制與Rollup打包原理]]"
  - "[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]"
  - "[[Vue-SFC實務-styles資料夾與scoped編譯原理-lang與src屬性-CSS預處理器-JSX支援]]"
  - "[[textContent-innerText-innerHTML差異]]"
  - "[[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]"
sources:
  - https://gemini.google.com/app/d2896b718a5f3c00
  - https://gemini.google.com/app/f947fdd39eddfb0a
updated: 2026-09-10
---

# 編譯期 vs 執行期的三條分界線

> [!info]- 📍 這篇在整條學習線的哪裡
> <mark style="background: #ADCCFFA6;">承接</mark>：[[00-前端建構到執行全景地圖]] 把整條路畫成一張圖，這篇專門攻其中<mark style="background: #FFF3A3A6;">最容易混淆的三個交界處</mark>——每一個都是「名字很像、實際上分屬兩個世界」。
> <mark style="background: #BBFABBA6;">延伸</mark>：Scoped CSS 的 Vue 實作細節見 [[Vue-SFC實務-styles資料夾與scoped編譯原理-lang與src屬性-CSS預處理器-JSX支援]]；瀏覽器端的 CSSOM → Render Tree 見 [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]。

> 本篇重點 (a)–(x)，共 24 個。三條分界線：一、AST／CSSOM　二、編譯／打包（含 Tokenizer 的 build time 與 runtime）　三、前端記憶體／後端記憶體。

---

## 分界線一：AST 與 CSSOM——同樣是「把 CSS 變成樹」，卻是兩個世界

> [!question]+ 原本的疑問
> 「PostCSS 的工作是把 CSS 解析成語法樹（AST）」——<mark style="background: #FF5582A6;">CSS 不是應該轉成 CSSOM 嗎，怎麼會是 AST？</mark>

a. 兩個都對，只是<mark style="background: #FFF3A3A6;">發生的時間與地點完全不同</mark>，它們從來不會在同一個場景相遇。

| | AST（抽象語法樹） | CSSOM（CSS 物件模型） |
|---|---|---|
| 全名 | Abstract Syntax Tree | CSS Object Model |
| 發生時間 | 建構期／編譯期（Build Time） | 執行期（Runtime） |
| 發生地點 | 你的電腦或 CI 上的 Node.js 環境 | 使用者瀏覽器的渲染引擎（Blink、Gecko） |
| 誰在用 | PostCSS、Babel、ESLint 這些程式碼處理工具 | 瀏覽器渲染引擎 |
| 目的 | 為了<mark style="background: #BBFABBA6;">修改與重寫程式碼</mark> | 為了<mark style="background: #BBFABBA6;">計算樣式並畫出畫面</mark> |
| 產物 | 一份新的 `.css` 文字檔 | 與 DOM 樹合併成 Render Tree，然後 Paint 出像素 |

b. <mark style="background: #ADCCFFA6;">AST</mark>：PostCSS 把 `.title { color: red; }` 這串<mark style="background: #FFF3A3A6;">純文字</mark>解析成 JS 物件結構，這樣程式才有辦法「找到 `.title` 這個選擇器，然後在它後面補上 `[data-v-xxxx]`」。處理完再<mark style="background: #ADCCFFA6;">字串化（Stringify）</mark>還原成新的 CSS 檔。

c. <mark style="background: #ADCCFFA6;">CSSOM</mark>：瀏覽器下載到「最終那份已經被改寫完的 CSS」之後，才把它解析成 CSSOM 樹。<mark style="background: #FF5582A6;">瀏覽器從頭到尾不知道有 PostCSS 這回事</mark>——它拿到的就只是一份普通 CSS。

d. 一句話記法：<mark style="background: #FFF3A3A6;">AST 是「為了改程式碼」而生的樹，CSSOM 是「為了畫畫面」而生的樹</mark>。前者活在你的硬碟上，後者活在使用者的瀏覽器裡。

---

## 分界線二：編譯與打包——`.vue` 檔到底經歷了什麼

> [!question]+ 原本的疑問
> `.vue` 檔經過 Webpack 或 Vite，叫做<mark style="background: #FF5582A6;">編譯還是打包</mark>？如果 `<style scoped>` 要在打包階段把樣式丟給 PostCSS 改寫屬性，那這個編譯器<mark style="background: #FF5582A6;">怎麼知道它是 Vue</mark>？

e. 答案是<mark style="background: #BBFABBA6;">兩件事同時在發生，但是不同工序</mark>：

| 工序 | 定義 | 在 `.vue` 上具體做了什麼 |
|---|---|---|
| 編譯（Compilation／Transpilation） | 把某種程式碼轉換成另一種程式碼 | 把 `<template>` 轉成 JS 渲染函式；把 `<style scoped>` 交給 PostCSS 轉成帶 hash 屬性的 CSS |
| 打包（Bundling） | 把多個獨立模組整理合併成少數幾個產出檔 | 把數百個 `.js`／`.vue`／`.css` 依 import 依賴關係圖拼接、壓縮成 `index.js` 與 `index.css` |

f. <mark style="background: #FF5582A6;">建置工具本身完全不認識 Vue</mark>。Vite 與 Webpack 只是任務排程器，它們靠<mark style="background: #ADCCFFA6;">外掛機制（Plugins／Loaders）</mark>來識別檔案類型。整條鏈是這樣接的：

```text
Vite / Webpack 讀到副檔名 .vue
        │  觸發設定好的外掛
        ▼
@vitejs/plugin-vue  或  vue-loader
        │  外掛的核心是這支編譯器
        ▼
@vue/compiler-sfc（Vue 單檔案元件編譯器）
        │  做 SFC Block Parsing，把 .vue 拆三塊
        ├── <template> ──► JS Render Function
        ├── <script>   ──► JS 模組
        └── <style scoped>
                │  產生唯一 hash，例如 data-v-7ba5bd90
                ▼
            呼叫 PostCSS，把 CSS 與 hash 一起丟過去
                │
                ▼
            選擇器被改寫成 .title[data-v-7ba5bd90]
```

g. 所以「編譯器知道它是 Vue 嗎」的正確答案是：<mark style="background: #BBFABBA6;">通用的建置工具不知道，是外掛裡的專用編譯器 `@vue/compiler-sfc` 知道</mark>。這是前端工具鏈一貫的分層設計——核心保持通用，語言／框架知識全部下放到外掛。

h. 同理可推：<mark style="background: #D2B3FFA6;">PostCSS 也不知道 Vue 是什麼</mark>。它只是收到「一段 CSS ＋ 一個 hash 字串」，然後照插件的規則做字串層級的選擇器改寫。每一層都只認識自己那一小塊。

### `<style scoped>` 的身世：一個被廢棄的 HTML5 提案

i. 在標準 HTML 裡，<mark style="background: #FF5582A6;">CSS 預設是全域生效的</mark>。頁面任何地方寫了 `p { color: red; }`，全頁所有 `<p>` 都會變紅。

j. HTML5 曾有一個<mark style="background: #ADCCFFA6;">原生的 `<style scoped>` 提案</mark>：`<style>` 若帶上 `scoped` 屬性，它的作用範圍就被限制在<mark style="background: #FFF3A3A6;">它的父元素及其內部子元素</mark>，不會外洩到全域 DOM。

```html
<!-- 全域環境 -->
<p>我是黑色的字（不受影響）</p>

<div class="card">
  <!-- 這段樣式原本只該對 <div class="card"> 及其內部生效 -->
  <style scoped>
    p { color: red; }
  </style>
  <p>我是紅色的字</p>
</div>
```

k. <mark style="background: #FF5582A6;">為什麼被廢棄</mark>：要瀏覽器在<mark style="background: #FFF3A3A6;">動態解析 DOM 樹的當下</mark>即時計算並切斷樣式作用域，對渲染引擎的效能開銷極大，且容易觸發重複排版（Reflow）。主流瀏覽器最終放棄原生實作。

l. <mark style="background: #BBFABBA6;">現在的替代方案分兩派</mark>：<mark style="background: #ADCCFFA6;">執行期派</mark>是 Shadow DOM（瀏覽器原生隔離）；<mark style="background: #ADCCFFA6;">編譯期派</mark>是 Vue Scoped CSS（建置階段改寫選擇器）與 CSS Modules（建置階段改寫 class 名）。<mark style="background: #FFF3A3A6;">社群主流走編譯期派，因為把成本挪到建置階段，執行期零開銷</mark>——這又回到了分界線一與分界線二。

### 同一個字兩種意思：Tokenizer 在 build time 與 runtime

> [!question]+ 原本的疑問
> Build time 跟 runtime 的 tokenizer 會是一樣的嗎？<mark style="background: #FF5582A6;">建立巨量文字語料庫之後又存回一個字串檔，編譯期還要再切開來一次</mark>——所以第一次只是建檔，並沒有把每個 lexeme 分開來放齁？

![[學習LLM_圖解_Tokenizer在buildtime寫字典vs-runtime查字典_2026-09-10.svg]]

m. 會覺得矛盾，是因為<mark style="background: #FFF3A3A6;">「tokenizer」這個字在兩個領域指的不是同一件事</mark>，先把它們拆開看：

| 比較項目 | LLM 領域的 Tokenizer | 編譯器／bundler 領域的 Tokenizer（＝Lexer，詞法分析器） |
|---|---|---|
| 規則從哪裡來 | <mark style="background: #ADCCFFA6;">用語料庫訓練出來</mark>（BPE、WordPiece） | <mark style="background: #ADCCFFA6;">人類把語言規格寫死在程式裡</mark>（關鍵字、運算子、字面值） |
| build time 誰做什麼 | `BpeTrainer` 掃語料庫、統計字元對共現頻率、合併最高頻的 pair，train 出一份詞表 | `acorn` 這類 lexer 直接套用寫死的規則，把原始碼字串 tokenize 成 token stream |
| runtime 誰做什麼 | Tokenizer 載入詞表檔，把使用者字串 encode 成 token id 陣列 | V8 用自己的 lexer 把送到瀏覽器的 JS 再切一次 |
| 有沒有「學習」階段 | <mark style="background: #BBFABBA6;">有</mark> | <mark style="background: #FF5582A6;">沒有</mark> |

n. 所以「兩邊會不會一樣」的精確答案是：<mark style="background: #BBFABBA6;">切割的演算法邏輯一樣，執行目的與吞吐要求不一樣</mark>。
	build time 那一端耗時長、要統計與最佳化，一輩子只跑一次；runtime 那一端要求極高速度與低延遲，只做「對照與切割」。

o. 回答「第一次建檔有沒有把每個 lexeme 分開放」：<mark style="background: #FF5582A6;">沒有分開放</mark>。BPE 訓練<mark style="background: #D2B3FFA6;">只在記憶體裡分開算</mark>，算完把結果收斂成一份詞表檔——`vocab.json`（字 → id）加上 `merges.txt`（合併規則），新版的 Hugging Face `tokenizers` 直接把兩者序列化成單一的 `tokenizer.json`。
	原始語料庫本身仍然以純文字或壓縮檔保存，並不會被拆成一個 lexeme 一個檔。

p. <mark style="background: #FFF3A3A6;">為什麼不拆開存</mark>：把幾十億個 lexeme 各存成一個檔，中介檔案數量與檔案系統的 inode／metadata 開銷會爆炸，讀取時的隨機 I/O 也遠慢於循序讀一個大檔。

q. 完整的拋接關係（<mark style="background: #ADCCFFA6;">LLM 這條線</mark>）：<mark style="background: #BBFABBA6;">`BpeTrainer`（訓練器）用語料庫 train 出 vocab 與 merges → 序列化成 `tokenizer.json` → runtime 由 `Tokenizer.from_file()` 把它載入記憶體 → `encode()` 把使用者輸入的字串切成 token id 陣列 → 陣列交給模型做 embedding lookup</mark>。

r. 完整的拋接關係（<mark style="background: #ADCCFFA6;">前端工具鏈這條線</mark>，正好對照上面的分界線二）：<mark style="background: #BBFABBA6;">bundler 用 `acorn`（輕量 parser）把原始碼 tokenize 成 token stream → parse 成 AST → 讀出 import 的 specifier → 交給 `enhanced-resolve` resolve 成實際檔路徑</mark>。
	這裡的 tokenize 只是 parse 的第一道工序，全程沒有任何「訓練」。

s. Abby 說的「編譯期又要切開來一次」<mark style="background: #BBFABBA6;">不是重複做白工</mark>：兩次切割的<mark style="background: #FFF3A3A6;">輸入不同</mark>——訓練期切的是語料庫（為了統計出規則），執行期切的是使用者當下輸入的那一串字（為了套用規則）。

t. 一句話記法：<mark style="background: #FFF3A3A6;">LLM 的 tokenizer 在 build time「寫字典」、在 runtime「查字典」；編譯器的 tokenizer 沒有字典可寫，它從頭到尾都在「照規格切字」</mark>。

> [!warning]+ ⚠️ 存疑／更正（針對這一段的 Gemini 回答）
> 1. Gemini 的對照表把 <mark style="background: #FF5582A6;">「編譯後的 AST」列成 build time tokenizer 的輸出</mark>，不精確。<mark style="background: #BBFABBA6;">tokenizer（lexer）的產物是 token stream，要再交給 parser，才 build 出 AST</mark>。
> 2. 它把「學習與產生規則」寫成 build time tokenizer 的<mark style="background: #FF5582A6;">通則</mark>，那只適用於 LLM。<mark style="background: #BBFABBA6;">編譯器與 bundler 的 build time tokenizer 是在「套用」寫死的規則，沒有學習階段</mark>——這正是上面那張表要拆開的地方。

---

## 分界線三：前端記憶體與後端記憶體——「Model」到底指哪裡

> [!question]+ 原本的疑問
> 「單向綁定時使用者 input 不會直接寫入 Model」——這個 Model 是指<mark style="background: #FF5582A6;">不會直接打 API，還是不會直接寫到資料表</mark>？

u. <mark style="background: #FF5582A6;">都不是</mark>。這裡的 Model 指的是 <mark style="background: #FFF3A3A6;">JavaScript 記憶體裡存的資料狀態（State／變數）</mark>，跟後端 API 與資料庫<mark style="background: #FF5582A6;">完全無關</mark>。前端 MVVM／MVC 的分層是：

| 層 | 是什麼 |
|---|---|
| View | 畫面上的 DOM 元素（`<input>`、`<div>`） |
| Model | 前端 JS 記憶體裡的變數（React 的 `useState`、Vue 的 `ref`、或普通 JS 物件） |
| API／資料庫 | 後端伺服器與資料儲存層，是<mark style="background: #FF5582A6;">完全另外一回事</mark> |

v. 所以<mark style="background: #ADCCFFA6;">單向綁定（Unidirectional Data Binding）</mark>的精確意思是：<mark style="background: #FFF3A3A6;">View 的變動不會自動同步回 JS 的 Model 變數</mark>。使用者在輸入框打字時，畫面上會顯示（那是瀏覽器的原生行為），但變數<mark style="background: #FF5582A6;">完全沒變</mark>。

```jsx
const [name, setName] = useState('Abby');

// ❌ 只綁 value：Model 永遠停在 'Abby'，畫面甚至可能卡住不給你打字
<input value={name} />

// ✅ 必須顯式監聽事件，Model 才會被改
<input value={name} onChange={(e) => setName(e.target.value)} />
```

w. 前端記憶體與後端記憶體<mark style="background: #FF5582A6;">在邏輯上獨立、在實體上也完全隔絕</mark>：

| 特性 | 前端記憶體（Client-side） | 後端記憶體（Server-side） |
|---|---|---|
| 存在位置 | 使用者裝置上的瀏覽器進程內（例如 Chrome 的 V8） | 遠端伺服器（機房、AWS／GCP、Docker 容器內） |
| 儲存內容 | React／Vue 的 state、DOM 樹、當前分頁的 JS 變數 | 伺服器進程變數、快取（Redis／node-cache）、資料庫連線池 |
| 生命週期 | 非常短命：重新整理或關閉分頁就<mark style="background: #FF5582A6;">立刻清空</mark> | 長期運行：伺服器沒重啟就一直保留 |
| 隔離性 | 每個使用者獨享，互不干擾 | <mark style="background: #FFB8EBA6;">所有使用者共享同一個進程</mark> |

x. 兩塊記憶體<mark style="background: #FF5582A6;">無法直接存取對方的變數</mark>，唯一通道是網路：

```text
[1. 前端記憶體 Browser RAM]  使用者打字，name 從 "Abby" 變成 "Alex"
        ▼
[2. 網路傳輸]  按下「儲存」→ JSON.stringify → HTTP POST /api/user
        ▼
[3. 後端記憶體 Server RAM]  Node.js / FastAPI / Go 收到 request，解析成 req.body.name
        ▼
[4. 永久儲存 Database Disk]  UPDATE users SET name = 'Alex'
```

> [!danger]+ 最常見的觀念誤區
> `setName('Alex')` <mark style="background: #FF5582A6;">只影響使用者自己電腦瀏覽器裡的記憶體</mark>。如果沒有透過 `fetch`／`axios` 把資料送給後端，重新整理頁面後前端記憶體被清空，資料就消失了——因為<mark style="background: #FFF3A3A6;">後端記憶體與資料庫根本不知道發生過這件事</mark>。

---

## 附帶收穫：字串渲染 vs DOM 節點渲染的資安差異

同一段對話最後追問了程式碼範例，Gemini 用 Google Maps API 的新舊寫法示範，這其實是 [[textContent-innerText-innerHTML差異]] 的實戰版：

```js
// ❌ 舊版 API：直接吃 HTML 字串 → XSS 漏洞
const userInput = '<img src="x" onerror="alert(1)">';
new google.maps.InfoWindow({
  content: `<div>使用者暱稱：${userInput}</div>`   // 💥 onerror 會被執行
});

// ✅ 現代 API：先建 DOM 節點，用 textContent 賦值
const markerContent = document.createElement('div');
const titleNode = document.createElement('p');
titleNode.textContent = `使用者暱稱：${userInput}`;   // 標籤被強制轉義成純文字
markerContent.appendChild(titleNode);
new google.maps.marker.AdvancedMarkerElement({
  map: mapInstance,
  position: { lat: 25.0330, lng: 121.5654 },
  content: markerContent                              // 傳的是 DOM 物件，不是字串
});
```

| 比較項目 | 舊版字串渲染 | 現代 DOM 架構 |
|---|---|---|
| 資料載入方式 | 拼接 HTML 字串（`innerHTML`） | 建立 DOM 物件並賦值（`textContent`） |
| XSS 防禦 | 要開發者手動 sanitize，<mark style="background: #FF5582A6;">漏掉就出事</mark> | <mark style="background: #BBFABBA6;">原生層級轉義</mark>，標籤一律當純文字 |
| CSS 與腳本隔離 | 與全域樣式互相干擾 | 可搭配 Shadow DOM 建立隔離壁壘 |

> [!warning]+ ⚠️ 存疑／更正
> 1. 對話裡把 <mark style="background: #FF5582A6;">HOC 誤稱為 High Order Class</mark>，正確是 <mark style="background: #BBFABBA6;">Higher-Order Component</mark>。完整的 HOC vs Custom Hook 對照已整理在 [[HOC高階組件與渲染劫持-反向繼承與三框架複用機制對照]] 的「追加 2026-09-09」段。
> 2. 最後那段 Google Maps 的回答其實<mark style="background: #D2B3FFA6;">沒有正面回應「舉例程式碼」這個提問</mark>（前文問的是記憶體，答案卻跳到地圖 API 資安），是 Gemini 接錯上下文。內容本身正確且有價值，所以保留，但要知道它跟前面的問題並不連貫。
> 3. `<style scoped>` 「已廢棄」的說法正確：它曾進入 HTML5 草案並在 Firefox 實作過，後來被移除，<mark style="background: #ADCCFFA6;">從未成為正式標準</mark>。

---

## 相關練習題

| 題目 | 連結 | 為什麼相關 |
|---|---|---|
| 726. Number of Atoms | https://leetcode.com/problems/number-of-atoms/ | 手刻一個小型 parser 把字串解析成樹狀結構，體會 AST 是怎麼長出來的 |
| 736. Parse Lisp Expression | https://leetcode.com/problems/parse-lisp-expression/ | 遞迴下降解析＋作用域（scope）處理，跟編譯器前端做的事同一套 |
| 1106. Parsing A Boolean Expression | https://leetcode.com/problems/parsing-a-boolean-expression/ | 較好入門的表達式解析，練「文字 → 樹 → 求值」 |
| 8. String to Integer (atoi) | https://leetcode.com/problems/string-to-integer-atoi/ | 最小的一支 lexer：逐字元掃描、跳空白、辨號誌與數字，就是 tokenize 的雛形（對應 (m)–(t)） |
| 68. Text Justification | https://leetcode.com/problems/text-justification/ | 把長字串切成一段一段再重組，體會「切割規則寫死」與「切割結果怎麼用」是兩件事 |
| NeetCode 練習總表 | https://neetcode.io/practice | 依主題與難度排好的題單 |

---

## 各對話來源（原文重點）

### HTML 標籤、模板與框架比較（2026-09）— https://gemini.google.com/app/d2896b718a5f3c00

> [!quote]- 展開對話脈絡
> **使用者：** PostCSS 把 CSS 解析成 AST，可是 CSS 不是轉成 CSSOM 嗎？`.vue` 經過 Webpack／Vite 叫編譯還是打包？Scoped 標記要在打包階段丟給 PostCSS 改寫屬性，那編譯器就會知道它是 Vue 了嗎？何謂讓 CSS 只作用於它的父元素？
> **Gemini：**（1）CSSOM 是瀏覽器執行期產生的，AST 是構建工具編譯期產生的，用途分別是「渲染畫面」與「修改程式碼」。（2）編譯與打包同時發生但屬不同工序。（3）建置工具靠外掛識別 `.vue`，核心是 `@vue/compiler-sfc`，它拆解 SFC、產生 hash、呼叫 PostCSS 改寫選擇器。（4）原生 `<style scoped>` 提案因渲染效能與 Reflow 問題被廢棄，改由 Shadow DOM 或編譯期方案（Vue Scoped CSS、CSS Modules）取代。
>
> **使用者：** 單向綁定說使用者 input 不會直接寫入 model，這是指不會直接打 API 還是不會直接寫到資料表？HOC 是 High Order Class？
> **Gemini：** Model 指前端 JS 記憶體裡的狀態，與 API／資料庫無關；單向綁定是「View 變動不會自動同步回 Model 變數」。HOC 是 Higher-Order Component，不是 Class。
>
> **使用者：** 那後端也有記憶體喔？分開的？
> **Gemini：** 完全分開，邏輯與實體都隔絕。（附前端記憶體／後端記憶體對照表與四階段資料流圖）
>
> **使用者：** 舉例程式碼
> **Gemini：**（跳題）以 Google Maps API 新舊寫法示範 `innerHTML` 字串拼接的 XSS 風險與 `textContent` ＋ `AdvancedMarkerElement` 的安全做法，並補充 Shadow DOM 隔離。

### Build Time 與 Runtime Tokenizer 差異解析（2026-09）— https://gemini.google.com/app/f947fdd39eddfb0a

> [!quote]- 展開對話脈絡
> **使用者：** Build time 跟 runtime 的 tokenizer 會是一樣的嗎？就是一個建立巨量文字語料庫，然後又變回一個檔案像是字串 string，然後在編譯期間又要切開來一次。所以第一次只是建檔，但是沒有把他們每個 lexeme 分開來放齁？
> **Gemini：** 不一定完全一樣，取決於應用場景（編譯器／LLM 訓練，還是程式碼建置系統），但通常演算法邏輯是一樣的，只是執行目的與處理方式不同。（1）第一次「建檔」沒有分開放——Tokenizer 掃描龐大文本、計算字詞頻率與共現機率（例如 BPE），算出一份詞表，儲存成單一檔案（`tokenizer.json` 或 `vocab.json`），不會把每個 lexeme 個別獨立存放，否則中介檔案與檔案系統開銷極大。（2）Build Time 負責「訓練」出字典檔，耗時長、需要統計與最佳化；Runtime 負責「高效率載入與即時切割」，要求極高速度與低延遲。
>
> ⚠️ 這一則有兩處要更正，已寫在上面 (m)–(t) 那段的存疑／更正 callout。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：HTML 標籤、模板與框架比較 | https://gemini.google.com/app/d2896b718a5f3c00 | 對話擷取於 2026-09-09 |
| CSSOM 定義與 Render Tree 生成 | https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model | MDN；查證於 2026-09-09 |
| PostCSS 官方（CSS → AST → plugins → CSS） | https://postcss.org/ | 官網；查證於 2026-09-09 |
| Vue SFC Scoped CSS 編譯原理 | https://vuejs.org/api/sfc-css-features.html | Vue 3 官方文件；查證於 2026-09-09 |
| `@vitejs/plugin-vue` 外掛機制 | https://github.com/vitejs/vite-plugin-vue | 查證於 2026-09-09 |
| Shadow DOM 樣式隔離 | https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM | MDN；查證於 2026-09-09 |
| `textContent` 不會執行 HTML（XSS 防禦） | https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent | MDN；查證於 2026-09-09 |
| Google Maps AdvancedMarkerElement（傳 DOM 節點） | https://developers.google.com/maps/documentation/javascript/advanced-markers/overview | 查證於 2026-09-09 |
| React 官方：Reusing Logic with Custom Hooks | https://react.dev/learn/reusing-logic-with-custom-hooks | 查證於 2026-09-09 |
| Gemini 對話：Build Time 與 Runtime Tokenizer 差異解析 | https://gemini.google.com/app/f947fdd39eddfb0a | 對話擷取於 2026-09-10 |
| Hugging Face Tokenizers：BPE 模型載入 `vocab.json` 與 `merges.txt` | https://huggingface.co/docs/tokenizers/main/en/api/models | 官方文件；查證於 2026-09-10 |
| Hugging Face NLP Course：Byte-Pair Encoding 訓練與合併規則 | https://huggingface.co/docs/course/en/chapter6/5 | 官方課程；查證於 2026-09-10 |
| Hugging Face Tokenizers Quicktour：`save()` 成 `tokenizer.json`、`from_file()` 載回 | https://huggingface.co/docs/tokenizers/python/latest/quicktour.html | 官方文件；查證於 2026-09-10 |
| acorn（輕量 JS parser，內含 tokenizer，bundler 依賴它） | https://github.com/acornjs/acorn | GitHub；查證於 2026-09-10 |

---

<sub>由 Gemini 對話自動整理 · 更新於 2026-09-10</sub>
