---
title: "HTML Parsing：瀏覽器拿到 HTTP response body 之後（bytes → DOM 四步）"
type: topic-note
source: Claude
category: 技術
tags: [html, html-parsing, tokenization, tree-construction, insertion-mode, dom, prototype-chain, eventtarget, encoding, charset, bytes, webidl, runtime]
related:
  - "[[HTML文件結構-DOCTYPE與骨架]]"
  - "[[script載入方式+前因後果]]"
  - "[[Markdown-渲染為DOM的過程]]"
  - "[[SPA架構-入口點-CSR客戶端效能與狀態-部署]]"
  - "[[00-V8引擎完整管線-Parse到Deoptimization]]"
  - "[[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]"
quiz: HTML-Parsing-瀏覽器拿到HTTP-response-body之後.html
updated: 2026-09-08
---
# HTML Parsing：瀏覽器拿到 HTTP response body 之後

> 本篇重點 a–v，共 22 個。
> 這篇是 [[script載入方式+前因後果]] 的**前傳**：那篇開頭那句「收到的是純文字字串」，這篇把它整條展開。
> 互動版（含兩張 SVG 主軸圖、填空、是非題、申論題）：`HTML-Parsing-瀏覽器拿到HTTP-response-body之後.html`

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | 網路上流的 bytes 是什麼？HTML 不是純文字嗎？ | 兩者不衝突。「純文字」講的是**內容語意**，傳輸時一律是 bytes | §1 |
| Q2 | HTML 也有 tokenization？那不是 JS 的東西嗎？ | HTML、CSS、JS **各有一套獨立的 tokenizer**，執行者分別是 Blink、Blink、V8 | §3 |
| Q3 | HTML Parsing 是指哪幾步？ | **步驟 2＋3＋4**（decode、tokenize、tree construction）。DOM 是產物不是步驟 | §0 |
| Q4 | `"initial"` `"in head"` 那些字串是什麼？ | **insertion mode（插入模式）**，樹建構狀態機的狀態名稱，規範共 21 個 | §4 |
| Q5 | 字元流跟字串流一樣嗎？ | 不一樣。規範叫 input stream，裝的是 **code points**，可中途變長、不能回頭索引 | §2 |
| Q6 | `<meta charset>` 在 bytes 裡面，怎麼先讀到？ | **encoding sniffing algorithm**：BOM ＞ 使用者 ＞ HTTP header ＞ prescan 前 1024 bytes | §2 |
| Q7 | DOM 節點就是 JS 物件嗎？ | **半對**。在 JS 側像 JS 物件，實體是引擎的 C++ 物件，中間隔一層 WebIDL 包裝 | §5 |
| Q8 | `extends` 是誰繼承誰？ | `子 extends 父`。`HTMLDivElement extends HTMLElement` ＝ Div 是子 | §5 |
| Q9 | CSR / SSR / PHP / Rails 的解析流程有差嗎？ | **四步完全一樣**。差別在「四步跑完畫面上有沒有東西」 | §6 |
| Q10 | Markdown 變 DOM 一定要先轉 HTML 字串嗎？ | **有例外**。react-markdown 全程不產生 HTML 字串 | §7 |
| Q11 | 轉譯之後才能做 HTML Parsing 嗎？ | **不是**。兩者對象／機器／時間都不同，沒有依賴 | §3-b |

---

## 0. 四步流水線（依順序編號）

![[學習前端_圖解_從原始碼到DOM完整流程-buildtime與runtime-ISO5807_2026-09-11.svg]]

> **這張是主軸圖（第三版）。** 相較前一版多了三件事：
>
> a. 上方補了 **build time 的尾巴** —— `.tsx` → 轉譯打包 → 產出 `index.html`，並標出「**存檔這一刻才決定編碼**」
> b. 明確標出 **「純文字檔」這個說法屬於哪一層**（檔案格式的類別，不是傳輸形態）
> c. 右下角獨立一塊說明 **JS 字串是另一條線** —— HTML Parsing 全程由 Blink 跑，V8 完全沒參與；
>    `response.text()` 那條是「你主動用 JS 去抓一份 HTML 當文字處理」，不是瀏覽器載入主文件的路徑
>
> 第二版（只有 run time、無 build 段）：![[學習前端_圖解_HTML-Parsing標準流程圖-ISO5807符號_2026-09-11.svg|697]]

> **為什麼換成標準符號**：第一版把每個步驟都畫成同一種圓角矩形，那不是流程圖，只是「有箭頭的清單」。
> ISO 5807 的符號**本身帶語意**——平行四邊形＝資料、直角矩形＝處理、菱形＝判斷、六邊形＝初始化、
> 雙邊線矩形＝副流程、圓形＝連接點。換上去之後有兩件事才浮出來：
>
> a. **bytes 到 decoding 中間有四道連續判斷** —— 那就是 encoding sniffing algorithm（圖右側副流程）
> b. **tokenize 與 tree construction 是一個「逐 token」的迴圈**，不是兩個一次做完的步驟
>
> 簡化版（只看四步骨架，貼簡報時用）：![[學習前端_圖解_HTML-Parsing四步流水線-bytes到DOM_2026-09-11.svg|697]]

> 上圖是本篇主軸圖。後續追問請直接指回圖上的第幾步，不要另開新章節。
> 圖裡多標了三件純文字版看不出來的事：① 每一步的**執行者**是誰（網路層／Blink／Blink）
> ② 左側括號框出**規範定義的 HTML Parsing 範圍**（步驟 2＋3＋4）
> ③ 底部三個常見誤解與它們對應到第幾步

<details>
<summary>純文字版（貼到 iThome 等不支援 Obsidian 嵌入的地方時用）</summary>

```
網路層　HTTP response body
   ↓
1. input byte stream（位元組流）      ← 網路層，還不是文字
   ↓
2. decoding（解碼）→ input stream     ┐
   ↓                                  │
3. tokenization（標記化）→ tokens     ├─ 這三步合起來 = HTML Parsing
   ↓                                  │
4. tree construction（樹建構）        ┘
   ↓
DOM 樹（產物，不是第 5 步）
```

</details>

- (a) **HTML Parsing 的範圍是步驟 2、3、4**。WHATWG 規範第 13.2 章「Parsing HTML documents」涵蓋的正是這三段。
- (b) **步驟 1 屬於網路層**，DOM 是**名詞（產物）**不是動詞（步驟）。
- (c) 完整可互動的 SVG 主軸圖在同名 `.html`；後續追問請**指回圖上的第幾步**，不要另開新章節。

---

## 1. 步驟 1 — bytes

- (d) **byte（位元組）＝ 8 個 bit**。網路上、磁碟上一切都是 bytes，沒有例外；「文字」是**解碼之後才存在的概念**。
- (e) 「HTML 是純文字格式」講的是它的**內容語意**（相對於 JPG／MP4 那種二進位格式），**不是**說它傳輸時不是 bytes。

| 說法 | 對錯 | 精確講法 |
|---|---|---|
| HTML 是純文字格式 | ✅ | 指內容語意，不是儲存或傳輸形式 |
| HTML 傳輸時不是 bytes | ❌ | 一定是 bytes |
| 拿到 response body 就是字串了 | ❌ | 拿到的是 byte stream，還要走步驟 2 |

`<!DOCTYPE html>` 在網路上的真面目：

```
字元：  <   !   D   O   C   T   Y   P   E  (空白) h   t   m   l   >
bytes： 3C  21  44  4F  43  54  59  50  45  20  68  74  6D  6C  3E
```

- (f) **F12 驗證**：Network → 點 HTML → Headers 的 `Content-Length: 1834`，這個數字的**單位是 bytes 不是字數**。中文一字在 UTF-8 佔 3 bytes，所以中文網頁的 bytes 數遠大於字數。

---

### 1-1. 用詞對照：什麼時候叫 bytes、什麼時候叫字串

⚠️ 這三個詞常被混用（包括本庫先前的敘述），對照表如下：

| 階段 | 規範的正確叫法 | 可以叫「字串」嗎 |
|---|---|---|
| 在網路上、在 HTTP response body 裡 | **bytes（位元組）** | ❌ **不行**，這時候還沒有「字」 |
| decoding 之後 | **input stream**，內容是 **code points（碼點）** | ⚠️ 勉強，但規範不叫它字串 —— 因為它**可以中途變長** |
| 在 JS 變數裡拿到的（`response.text()` 之後） | **String（JS 字串）** | ✅ 這才是真的字串 |

- (f-2) 那為什麼常聽到「HTML 是純文字」？因為那句話在講**檔案格式的類別**（相對於 JPG／MP4 那種二進位格式），**不是在講傳輸時的形態**。兩者不衝突，但講的是不同層次。
- (f-3) 一個判斷口訣：
  1. 句子在講**網路／磁碟／Content-Length** → 說 **bytes**
  2. 句子在強調**「它沒有結構、不是物件」** → 說「扁平的字元序列」比說「字串」精確
  3. 句子在講**JS 變數裡的值** → 說 **String**

---

## 2. 步驟 2 — decoding，以及那個雞生蛋問題

### 2-1. 產物叫 input stream，不叫字串

| 比較項 | 字串 String | 流 Stream |
|---|---|---|
| 長度 | 有 `.length`，一開始就知道 | 不知道，可能還在下載 |
| 存取 | 可隨機索引、可回頭 | 只能依序消耗，讀過就過去 |
| 中途變長 | 不行 | 可以（網路 chunk、`document.write()`） |
| 存在哪 | 完整存在記憶體 | 邊來邊處理 |

- (g) 規範用詞是 **input stream**，內容是 **code point（碼點）**，不是「字串」也不是「字元陣列」。
- (h) **這個差別就是「HTML 可以邊下載邊顯示」的原理**；串流式 SSR（React 18 `renderToPipeableStream`）能分段送 HTML，也是吃這個性質。

### 2-2. encoding sniffing algorithm

`<meta charset>` 寫在 bytes 裡面，要讀它得先解碼，要解碼得先知道 charset —— 規範的解法是這個優先序：

| 順序 | 依據 | 說明 |
|---|---|---|
| 1 | BOM（Byte Order Mark） | UTF-8 是 `EF BB BF`。有就直接採信 |
| 2 | 使用者手動指定 | 瀏覽器選單強制指定 |
| 3 | HTTP header | `Content-Type: text/html; charset=utf-8`。**優先於 meta** |
| 4 | prescan 前 1024 bytes | 找 `<meta charset>`。**這就是它必須放 head 最前面的原因** |
| 5 | 父文件 | iframe 同源時繼承 |
| 6 | 歷史紀錄 | 之前造訪偵測到的 |
| 7 | 自動偵測 | 統計特徵猜（規範不鼓勵） |
| 8 | 語系預設 | 猜錯就是**亂碼 mojibake**，「中文」變 `ä¸­æ–‡` |

- (i) 「中」在 UTF-8 是 `E4 B8 AD`；誤用 Latin-1 解讀會把 3 個 bytes 各當一個字 → `ä¸­`。**bytes 沒錯，錯的是那張解碼表。**
- (j) 這一段與 [[HTML文件結構-DOCTYPE與骨架]] 的 Q9、Q10 是同一件事的兩個切面：那篇答「**要放哪裡**」，本篇答「**在流水線的第幾步、為什麼非有不可**」。

---

## 3. 步驟 3 — tokenization（HTML 也有）

| 語言 | 誰執行 tokenize | token 種類 | 下一步產出 |
|---|---|---|---|
| HTML | **Blink**（渲染引擎） | DOCTYPE / start tag / end tag / comment / character / EOF，共 6 種 | DOM 樹 |
| CSS | **Blink** 的 CSS parser | ident / hash / string / dimension / delim … | CSSOM 樹 |
| JavaScript | **V8**（JS 引擎） | keyword / identifier / operator / literal / punctuator … | AST → bytecode |

- (k) **tokenization 是編譯原理的通用術語**，任何要被機器讀懂的語言都有這一步，不是 JS 專利。
- (l) ⚠️ **HTML 永遠不會進 V8、不會變成 AST 或 bytecode**。三條線都在同一條主執行緒上用 CPU，但是三個不同元件。（與 [[script載入方式+前因後果]] (q) 節一致）
- (m) tokenizer 自己也是一台狀態機，狀態約 80 個（`data state`、`tag open state`、`attribute name state`…），**只管切字元、不管樹長什麼樣**。

`<div id="root">Hi</div>` 的 token 序列：

```
① StartTagToken  { name: "div", attributes: { id: "root" } }
② CharacterToken { data: "H" }
③ CharacterToken { data: "i" }
④ EndTagToken    { name: "div" }
```

- (n) **token 還是「資料」不是「物件」**，沒有 `.style`、沒有 `.addEventListener`。


### 3-b. 反過來問：轉譯之後才能做 HTML Parsing 嗎？

**不是。兩者沒有任何依賴關係。**

會有這個錯覺，是因為建置流程圖通常由上往下畫，看起來像一條線。但那張圖**跨了兩台機器、兩個時間點**，中間是斷開的：

```text
【機器 A：你的筆電 / CI】          build-time，做一次
  .tsx → 轉譯 → bundle → 產出靜態檔
                    │
                    ▼
              ✂️ 部署，斷開 ✂️（中間可能隔了三天）
                    │
                    ▼
【機器 B：使用者的瀏覽器】          run-time，每人各做一次
  收到 bytes → decode → tokenize → tree construction → DOM
```

- (t) **兩個直接反證**：① 純手寫的 `.html` 完全沒有轉譯，瀏覽器照樣 parse；② PHP、WordPress、Rails 前端根本沒有轉譯步驟，HTML 是後端 template 吐的字串，直接進瀏覽器。→ **轉譯不是 HTML Parsing 的前置條件。**

| 比較項 | 轉譯 transpile | HTML Parsing |
|---|---|---|
| 處理對象 | **JS / TS / JSX** | **HTML 字串** |
| 何時 | build-time | run-time |
| 誰的 CPU | 開發者／CI，做一次 | 每一個使用者，各做一次 |
| 執行者 | Babel / SWC / esbuild | Blink 的 HTML parser |
| 產物 | **還是純文字 JS** | **DOM 物件** |

build tool 對 `index.html` 只做**文字層級處理**（注入 `<script src>`／`<link>` 標籤 ＋ minify），**那不叫轉譯，那只是字串替換**。與 [[script載入方式+前因後果]] (q) 節一致：「build 期間沒有瀏覽器、沒有 DOM，所以沒有『HTML Parsing → DOM 樹』那個過程。」

#### 混淆的真正來源：JSX 的 `<div>` 長得像 HTML

- (u) ★ **JSX 的 `<div>` 與 HTML 的 `<div>` 是完全不同的兩個東西，走兩條互不相交的管線。**

| | JSX 裡的 `<div>` | `index.html` 裡的 `<div>` |
|---|---|---|
| 本質 | **JavaScript 語法擴充** | **HTML 標籤** |
| 誰處理 | Babel / SWC（build-time） | Blink 的 HTML parser（run-time） |
| 處理後變成 | `_jsx("div", {...})` 純 JS 函式呼叫 | `HTMLDivElement` 物件 |
| 會進 HTML parser 嗎 | ❌ **永遠不會** | ✅ 會 |
| 會進 V8 嗎 | ✅ 會（轉譯後就是 JS） | ❌ **永遠不會** |

```jsx
// 你寫的
<div className="a">Hi</div>

// 轉譯後（這已經是純 JS，沒有任何 HTML）
_jsx("div", { className: "a", children: "Hi" })

// 瀏覽器執行它時，React 呼叫的是
document.createElement("div")   // ← 直接建物件，繞過 HTML parser
```

**React 建 DOM 靠的是 `document.createElement`，不是 HTML parser。** 兩條線平行，不交會。

#### run-time 的真實順序：反而是 HTML Parsing 先

```text
1. HTML Parsing 開始（步驟 3、4 進行中）
        ↓
2. 讀到 <script src="main.abc.js">    ← 這個 tag 是 build 時被注入的
        ↓
3. HTML Parsing 停住（無屬性）或繼續（defer）
        ↓
4. V8 執行那支 JS —— 它「早就」轉譯完了，在三天前的 CI 上
        ↓
5. React 跑起來，用 createElement 往 #root 塞東西
```

⚠️ 在使用者的機器上，**轉譯這件事早就結束了，不參與任何順序**。

- (v) **唯一的關聯是間接的**：轉譯 → bundle → 產出 `main.abc123.js` → build tool 把 `<script src="main.abc123.js">` 注入 index.html 的文字裡。所以轉譯影響的是「**HTML 裡那個 `src` 字串寫什麼**」，不是「**HTML 能不能被 parse**」。就算 `src` 指向不存在的檔案，HTML Parsing 照樣跑完，只是那支 script 404。

#### 唯一一條「JSX 的 div 最後真的被 HTML parse」的路徑：SSR

```text
轉譯（build-time）→ 部署 → 使用者請求
   → Node 上執行 renderToString()    ← ★ 執行，不是轉譯
   → 產出 HTML 字串 "<div class='a'>Hi</div>"
   → HTTP 傳輸 → 瀏覽器 HTML Parsing（本篇步驟 2、3、4）
```

中間那一步是「**執行**」不是「**轉譯**」。轉譯早在 build 就做完了，SSR 是在 run-time（伺服器端的 run-time）**跑**那份已經轉譯好的 JS。

> **一句話總結**：轉譯是 build-time 的**翻譯**工作，HTML Parsing 是 run-time 的**建構**工作，對象不同、機器不同、時間不同，沒有先後依賴。

---

## 4. 步驟 4 — tree construction 與 insertion mode

- (o) `"initial"` `"before html"` `"in head"` `"in body"` 叫 **insertion mode（插入模式）**。它**不是** HTML 標籤、**不是**任何程式語言的語法，而是 **WHATWG 規範文件裡的英文術語**，代表樹建構狀態機的狀態。瀏覽器實作時變成 enum，例如 Blink 的 `kInHeadMode`。

規範共 21 個：

```
initial            before html        before head        in head
in head noscript   after head         in body            text
in table           in table text      in caption         in column group
in table body      in row             in cell            in template
after body         in frameset        after frameset     after after body
after after frameset
```

- (p) **為什麼要分這麼多狀態**：同一個 token 在不同位置意義不同。`<td>` 在 `in row` 是合法儲存格，在 `in body` 就是錯放、規範明文要求忽略它。HTML「寫錯也不會白屏」正是因為每個 insertion mode 都寫好了補救規則 —— 這是與 XML 最大的差別。

---

## 5. DOM 節點是「真正的 JS 物件」嗎 ★★★★★

### 5-1. 它是宿主物件，不是用 JS 寫的

| 層次 | 真相 |
|---|---|
| 你拿到的 `document.body` | ✅ 是 JS 物件，有原型鏈、可 `.` 取屬性 |
| 資料實際住在哪 | ❌ 不在 JS 堆積。真正的節點是引擎的 **C++ 物件**（Chrome 是 Blink） |
| JS 拿到的是什麼 | 透過 **WebIDL binding** 產生的**包裝物件（platform object／宿主物件）** |

驗證：`Object.keys(document.body)` 回傳 `[]`，`document.body.hasOwnProperty('tagName')` 是 `false` —— 屬性全是 prototype 上的 getter，背後轉呼叫 C++。

- (q) **實務價值**：每次讀寫 DOM 屬性都是一次 **JS ↔ C++ 跨界呼叫**，比操作純 JS 物件貴得多。這就是**虛擬 DOM 存在的理由**（先在便宜的純 JS 物件上算差異，最後才一次跨界），也是 layout thrashing 的成因。

### 5-2. `extends` 是誰繼承誰

**`class 子 extends 父`。左邊是子類，右邊是父類。**

| 寫法 | 子（繼承者） | 父（被繼承者） | 白話 |
|---|---|---|---|
| `HTMLDivElement extends HTMLElement` | HTMLDivElement | HTMLElement | div 是一種 HTML 元素 |
| `HTMLElement extends Element` | HTMLElement | Element | HTML 元素是一種元素（SVG 元素也是） |
| `Element extends Node` | Element | Node | 元素是一種節點（文字、註解節點也是） |
| `Node extends EventTarget` | Node | EventTarget | 節點是一種可接收事件的東西（window、XHR 也是） |

三個記法：

- (r-1) **is-a 造句法**：`A extends B` 讀成「A is a B」。「div is a HTMLElement」通順 ✅，反過來不通 ❌。
- (r-2) **範圍大小法**：**父的範圍一定比子大**。EventTarget ＞ Node ＞ Element ＞ HTMLElement ＞ HTMLDivElement。
- (r-3) **查找方向法**：JS 找屬性是**從子往父往上找**。在 div 上呼叫 `addEventListener`，一路找到 **EventTarget.prototype** 才找到。

- (s) ★★★★★ **`addEventListener` / `removeEventListener` / `dispatchEvent` 三個方法只定義在 `EventTarget` 這一層**；`style` 在 `HTMLElement`；`classList` 在 `Element`；`appendChild` 在 `Node`。所以「可設寬高、可掛事件」是**繼承來的能力**，字串形態的 `<div>` 沒有這條鏈，什麼都做不了。

⚠️ 瀏覽器不是真的用 `class ... extends ...` 這段 JS 寫出來的；規範用的是 WebIDL 的 `interface HTMLDivElement : HTMLElement`，冒號左邊是子、右邊是父，與 `extends` 同義。

---

## 6. CSR / SSR / SSG / PHP / WordPress / Rails 有差嗎

**四步完全一樣，零差別。** 差別只在三個變數：誰產生 HTML 字串、什麼時候產生、第一個 response 裡有沒有內容。

| 模式                                       | HTML 字串誰產生                       | 何時              | 首個 response 有內容 | 四步  | 四步後還要做什麼           |
| ---------------------------------------- | -------------------------------- | --------------- | --------------- | --- | ------------------ |
| 純靜態 HTML                                 | 人手寫                              | 寫程式時            | ✅               | 相同  | 直接 paint           |
| SSG（Astro / Hugo / Jekyll / next export） | 建置工具                             | build time 一次   | ✅               | 相同  | 有互動則需 hydration    |
| SSR（Next.js / Nuxt / Remix）              | Node 跑 `renderToString`          | 每次 request      | ✅               | 相同  | hydration 掛事件      |
| PHP / WordPress                          | PHP 直譯器                          | 每次 request      | ✅               | 相同  | 沒事了                |
| Rails / Django / Laravel                 | template 引擎（ERB / Jinja / Blade） | 每次 request      | ✅               | 相同  | 沒事了                |
| **CSR**（Vite ＋ React SPA）                | **瀏覽器裡的 JS**                     | HTML 解析完、JS 執行時 | ❌ `#root` 是空的   | 相同  | **還要跑一整套 JS 才有內容** |
| Streaming SSR（React 18）                  | Node 分段吐                         | 每次 request，邊算邊送 | ✅（陸續到）          | 相同  | 分段 hydration       |

- 原本 [[script載入方式+前因後果]] (a) 節寫的「不是 CSR、SSR、SSG⋯⋯的專屬，他們全一樣，無例外」**是對的**，可再精確成：
  > 「**HTML Parsing 這四步無例外，但四步結束後畫面上有沒有東西，就完全不一樣了。**」

- CSR 的 HTML 解析**反而更快**（HTML 極短、節點極少）。它慢在**四步跑完是白畫面**，還要等 JS 下載 → V8 parse → 執行 → `createElement` 再建一次 DOM。**瓶頸在 JS 不在 HTML Parsing。**

一分鐘驗證法：`Ctrl+U`（伺服器原始字串）對比 `F12 → Elements`（現在的 DOM）。差很多且 `#root` 空 → CSR；幾乎一樣 → SSR/SSG/PHP/Rails。

---

## 7. Markdown → DOM 的兩條路

### 路徑 A：marked／markdown-it ＋ `innerHTML`（要跑 HTML Parsing）

```
.md bytes → decode → Markdown 字串
  → Markdown 自己的 tokenizer → mdast
  → renderer 印成 ★HTML 字串★
  → el.innerHTML = htmlString
  → ★觸發 fragment parsing algorithm★（＝本篇步驟 3、4 的片段版）
  → DOM
```

**tokenize 兩次**（Markdown 一次、HTML 一次）。

### 路徑 B：react-markdown（remark ＋ rehype-react）—— 不經過 HTML 字串

```
.md bytes → decode → Markdown 字串
  → remark → mdast → remark-rehype → hast（仍是 JS 物件）
  → rehype-react → React element
  → React 呼叫 document.createElement / appendChild
  → DOM

❌ 全程沒有 HTML 字串　❌ 沒有 HTML Parsing
```

| 比較 | 路徑 A | 路徑 B |
|---|---|---|
| 中間有 HTML 字串 | 有 | 沒有 |
| 跑 HTML Parsing | 有（fragment parsing） | 沒有 |
| tokenize 次數 | 2 | 1 |
| XSS 風險 | 高，要接 DOMPurify | 低，天生擋掉大部分注入 |
| 建 DOM 的人 | Blink 的 HTML parser | React 呼叫 `createElement` |

⚠️ **要回頭修正 [[Markdown-渲染為DOM的過程]]**：那篇的「Markdown 不能直接被渲染成 DOM，一定要先轉成 HTML 字串」對路徑 A 成立、**對路徑 B 不成立**。路徑 B 繞過 HTML 字串直接建 DOM，這正是 react-markdown 比 `dangerouslySetInnerHTML` 安全的原因 —— **沒有字串可以被注入**。

---

## 相關筆記（含關聯理由）

- [[HTML文件結構-DOCTYPE與骨架]]（同資料夾）
  **理由**：那篇講「骨架每一行**要怎麼寫**」，本篇講「這些字元**怎麼被讀成物件**」。它的 Q9、Q10（charset 放最前面、不寫會亂碼）就是本篇 §2-2 的結論。
- [[script載入方式+前因後果]]
  **理由**：那篇 (a) 節開頭那句「收到的是純文字字串」正是本篇整篇要展開的內容；那篇接著講 `<script>` 如何**打斷**本篇的步驟 3、4。**本篇是它的前傳。**
- [[Markdown-渲染為DOM的過程]]
  **理由**：本篇 §7 補上那篇缺的路徑 B，並指出「一定要先轉成 HTML 字串」的例外。
- [[SPA架構-入口點-CSR客戶端效能與狀態-部署]]
  **理由**：本篇 §6 的表格是那篇的上游 —— 先懂解析流程一致，才懂 CSR 的慢不在解析。
- [[00-V8引擎完整管線-Parse到Deoptimization]]
  **理由**：本篇 §3 說「HTML 永遠不會進 V8」，那篇是 V8 那條平行線的完整管線。
- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]
  **理由**：本篇止於 DOM 產出，那篇從 DOM ＋ CSSOM 接手講到 Layout / Paint / Composite。

線上版（GitHub Pages，Obsidian 之外的人可以直接看）：
`https://abbychickenfillet-github.github.io/golang-and-TS-others-md-files/frontend-docs/html-basics/HTML-Parsing-瀏覽器拿到HTTP-response-body之後.html`

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 解析總章、tokenization 與 tree construction 的切分 | https://html.spec.whatwg.org/multipage/parsing.html | Living Standard，2026-09-08 查證 |
| encoding sniffing algorithm 的八個優先序 | https://html.spec.whatwg.org/multipage/parsing.html#determining-the-character-encoding | Living Standard，2026-09-08 查證 |
| 21 個 insertion mode 完整清單 | https://html.spec.whatwg.org/multipage/parsing.html#the-insertion-mode | Living Standard，2026-09-08 查證 |
| input stream 由 code points 構成 | https://html.spec.whatwg.org/multipage/parsing.html#preprocessing-the-input-stream | Living Standard，2026-09-08 查證 |
| EventTarget 的三個方法 | https://developer.mozilla.org/en-US/docs/Web/API/EventTarget | 2026-09-08 查證 |
| Node / Element / HTMLElement 的能力分層 | https://developer.mozilla.org/en-US/docs/Web/API/Node | 2026-09-08 查證 |
| DOM 是 platform object、透過 WebIDL 暴露給 JS | https://webidl.spec.whatwg.org/#idl-interfaces | Living Standard，2026-09-08 查證 |
| speculative parsing | https://developer.mozilla.org/en-US/docs/Glossary/Speculative_parsing | 2026-09-08 查證 |
| DOMParser | https://developer.mozilla.org/en-US/docs/Web/API/DOMParser | 2026-09-08 查證 |
