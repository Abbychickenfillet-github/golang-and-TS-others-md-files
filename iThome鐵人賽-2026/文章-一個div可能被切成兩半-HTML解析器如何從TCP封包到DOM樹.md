
> 這篇是 `script載入方式+前因後果` 的深入版，尚未編入鐵人賽日程，可當獨立文章或之後補進系列。

<div class="tip-glossary" data-term="解析器" data-text="Parser：把一串沒有結構的字元，依照某套文法規則轉成有結構的資料。本文講的是瀏覽器內建的 HTML 解析器（Blink／WebKit 叫 HTMLDocumentParser，Gecko 叫 nsHtml5Parser），它實作 WHATWG HTML Standard 的 tokenizer 狀態機，產出的是 DOM 樹。它跟打包工具的 parser（Acorn、SWC、esbuild、css-tree）不是同一種東西——最大差別是它永遠不丟錯，一定會修出一棵能渲染的樹。"></div>
<div class="tip-glossary" data-term="狀態機" data-text="State Machine：一個「現在處於哪個狀態」加上「看到什麼輸入就換到哪個狀態」的模型。HTML 規範定義了 80 幾個 tokenizer 狀態（Data state、Tag open state、Attribute name state…），因為狀態存在外面，所以隨時可以暫停、下一包再接著跑。"></div>
<div class="tip-glossary" data-term="UA" data-text="User Agent，使用者代理。代表使用者去取得並呈現網頁的程式，瀏覽器是最典型的 UA。HTML 規範把 UA 再細分成互動式瀏覽器、非互動呈現裝置（印表機、看板）、支援預設渲染的視覺 UA、不支援 scripting 的 UA 四類，而且彼此不互斥。"></div>
<div class="tip-glossary" data-term="token" data-text="詞法單元：tokenizer 從字元流切出來的最小有意義單位，例如一個開始標籤、一個結束標籤、一段文字、一個註解。切完才輪到 tree construction 階段把 token 組成 DOM 樹。"></div>

## 三個提問：邊收邊解析、封包剛好切在標籤中間、parser-blocking

1. 都說 HTML 是「邊收邊解析」，那到底是收到「一個標籤」才解析一次嗎？
2. 如果封包剛好切在標籤中間會怎樣？
3. 這跟 `<script>` 為什麼要阻塞解析有關係嗎？

---

## 先破除一個直覺

大部分人（包括我自己）對 HTML 解析的想像是這樣的：

```
瀏覽器收到 <div>  → 建立一個 div 元素
瀏覽器收到 <h1>   → 建立一個 h1 元素
```

**好像標籤是「一個一個」送過來的。**

實際上完全不是。**<mark style="background: #BBFABBA6;">網路送過來的是「一堆位元組</mark>」，而位元組的切點跟標籤的邊界毫無關係。**

這篇要證明的就是這件事，以及它連帶解釋的三個現象。

---

## 一、封包是按位元組切的，不管標籤在哪 #MTU #MSS

先複習兩個名詞：

| 名詞      | 全名                                | 意思                                                                                                                                             | 典型值              |
| ------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **MTU** | Maximum Transmission Unit（最大傳輸單元） | 網路線路一次能搬多大一包                                                                                                                                   | 1500 bytes       |
| **MSS** | Maximum Segment Size（最大區段大小）      | 扣掉 IP 與 TCP 標頭後，真正裝資料的空間                                                                                                                       | **約 1460 bytes** |
|         | MTU-(IP標頭+TCP標頭)=MSS              | - **IP 標頭（Header）**：通常是 **20 bytes**（IPv4）。包含source IP跟target IP<br>    <br>- **TCP 標頭（Header）**：通常也是 **20 bytes**（在沒有使用額外選項如 Timestamp 的情況下）。 |                  |

白話講：`1500 − 20（IP 標頭）− 20（TCP 標頭）= 1460`。**你的 HTML 每 1460 個位元組就被切成一包。**

### 實測

我拿一段很普通的 HTML，把 MSS 縮到 40 bytes（真實是 1460，縮小才看得出切點），結果：

```
封包  內容（↵ 代表換行）                      切點落在哪
------------------------------------------------------------------
 #1  <!DOCTYPE html>↵<html lang="zh-Hant">↵<h    ⚠️ 標籤正中間被切斷
 #2  ead><meta charset="utf-8"><title>我的�       標籤邊界外
 #3  ��站</title></head>↵<body>↵  <div id="r     ⚠️ 標籤正中間被切斷
 #4  oot" class="container">↵    <h1 class="t    ⚠️ 標籤正中間被切斷
 #5  itle">歡迎</h1>↵    <p>這是一段內              標籤邊界外
 #6  容。</p>↵  </div>↵</body>↵</html>            標籤邊界外
```

**六個封包裡有三個切在標籤正中間。**

被切斷的長相是這樣：

```
封包 #3 結束時：
  已收到    「<div id="r」                      ← 標籤還沒完
  還在路上  「oot" class="container">」         ← 要等下一個封包
  完整標籤  「<div id="root" class="container">」
```

**解析器在封包 #3 結束的那一刻，處於一個很尷尬的狀態：它知道有一個標籤開始了，但不知道那是什麼標籤。** 它甚至不知道標籤名稱是 `div` 還是 `divider`，因為只讀到 `<div id="r` 就沒了。

---

## 二、所以解析器必須是「可暫停、可續傳」的狀態機

既然封包隨時可能在任何位置斷掉，解析器就不能寫成「讀完一個標籤再處理」的樣子。

它的做法是把**狀態存在外面**：

```js
function createTokenizer() {
  let state = 'TEXT';    // 我現在在讀文字，還是在讀標籤？
  let buffer = '';       // 還沒讀完的那半個標籤，先暫存在這
  const tokens = [];

  return {
    feed(chunk) {
      for (const ch of chunk) {
        if (state === 'TEXT') {
          if (ch === '<') {
            if (buffer.trim()) tokens.push({ type: 'text', value: buffer.trim() });
            buffer = '<'; state = 'TAG';
          } else buffer += ch;
        } else {
          buffer += ch;
          if (ch === '>') {
            tokens.push({ type: 'tag', value: buffer });
            buffer = ''; state = 'TEXT';
          }
        }
      }
      return { state, pending: buffer };
    },
    tokens,
  };
}
```

白話講這段程式碼：它只有兩個狀態——**TEXT（我在讀文字）** 和 **TAG（我在讀標籤）**。遇到 `<` 就切到 TAG，遇到 `>` 就吐出一個 token 並切回 TEXT。關鍵是 `state` 和 `buffer` 這兩個變數**活在 `feed()` 外面**，所以每次只餵一小段也沒問題。

### 一包一包餵進去，觀察它卡在哪

```
封包  餵完之後的狀態       還卡在 buffer 裡的東西
--------------------------------------------------
 #1   TAG（標籤讀一半）      「<h」
 #2   TEXT（文字讀一半）     「我的�」
 #3   TAG（標籤讀一半）      「<div id="r」
 #4   TAG（標籤讀一半）      「<h1 class="t」
 #5   TEXT（文字讀一半）     「這是一段內」
 #6   TEXT（文字讀一半）     「」
```

**每一個封包結束時，解析器手上都有一段「還不能下結論」的殘料。** 它不會丟掉，也不會硬猜，就是留著等下一包。

> **這就是「串流解析（incremental parsing）」能成立的原因**——不是因為網路好心地按標籤切，而是因為解析器設計成不在乎切點在哪。


解析器在瀏覽器端(runtime)
都實作同一份規範——!WHATWG HTML Standard 的 Parsing章節[https://html.spec.whatwg.org/multipage/parsing.html]
---

## 二之二、順帶一提：這個解析器不是套件，是規範

寫到這裡會有一個很自然的疑問：**上面那個 tokenizer 是我手刻的玩具，那瀏覽器裡真正在跑的那支叫什麼？跟我 `npm install` 裝的那些 parser 是同一種東西嗎？**

不是。而且差異比想像中大。

### 瀏覽器端：沒有「牌子」可選

| 瀏覽器引擎 | HTML 解析器的實作名稱 |
| --- | --- |
| Chrome／Edge（**Blink**） | `HTMLDocumentParser` ＋ `HTMLTokenizer` |
| Safari（**WebKit**） | 同名（Blink 2013 年從 WebKit fork 出去，這部分同源） |
| Firefox（**Gecko**） | `nsHtml5Parser` —— 基於 [validator.nu HTML parser](https://about.validator.nu/htmlparser/)，原本用 Java 寫，再用 Java→C++ 轉譯器轉成 C++，所以類別名都是 `nsHtml5` 開頭 |

⚠️ 兩個容易記錯的地方：

1. **Blink／WebKit／Gecko 是「瀏覽器引擎（browser engine）」，不是「CSS 渲染工具」。** 它們負責 HTML 解析、CSS 解析、排版、繪製、DOM、事件 —— CSS 只是其中一塊。JavaScript 是另一顆引擎在跑（Chrome 用 V8、Safari 用 JavaScriptCore、Firefox 用 SpiderMonkey）。
2. **三家不是都叫 `HTMLDocumentParser`。** Blink 和 WebKit 是，**Firefox 不是**，它叫 `nsHtml5Parser`。

**這些不是套件，是瀏覽器內建、不可替換的。** 三家都在實作同一份規範 —— [WHATWG HTML Standard 的 Parsing 章節](https://html.spec.whatwg.org/multipage/parsing.html)，那個有 80 幾個狀態的 tokenizer 狀態機。本文第二節那個只有 `TEXT` 和 `TAG` 兩個狀態的 `createTokenizer()`，就是這台機器的極簡模型。

Blink 另外還有一支 `HTMLPreloadScanner`（預載掃描器）：主解析器被 `<script>` 擋住時，它會先往前掃，把 `<img src>`、`<link href>` 挑出來提早發請求。這跟本文第四節講的 parser-blocking 直接相關。

> **它自己不做 DNS 查詢或 TCP 三方交握。** 它只找出網址並建立 `PreloadRequest` 交出去；一般資源走正常的抓取流程，連線（DNS、TCP、HTTPS 的 TLS）由網路層依需要處理，有快取或可重用的連線時會省略。唯一直接要求建立連線的是 `<link rel="preconnect">`，由 `WebPrescientNetworking::Preconnect()` 做 DNS + TCP（HTTPS 再加 TLS），不抓資源。`dns-prefetch` 則不是 scanner 處理的。
> 依據：Chromium 原始碼 [`html_preload_scanner.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/parser/html_preload_scanner.cc)、[`html_resource_preloader.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/parser/html_resource_preloader.cc)、[`preload_helper.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/loader/preload_helper.cc)；[MDN preconnect](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect)；[MDN How browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)。完整整理見 [[瀏覽器解析執行緒-HTML與CSS-parser與preload-scanner-Blink-WebKit-Gecko]] 的「二之一」。這些原始碼內容是我用網頁摘要工具讀到的，沒有在本機逐行核對。

> **原始碼在哪？不在 GitHub。** Chromium 的官方原始碼放在 Google 自己的 Git 服務上：
> - 檔案瀏覽：[chromium.googlesource.com — `third_party/blink/renderer/core/html/parser/`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/parser/)
> - 程式碼搜尋（比較好用）：[source.chromium.org](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/parser/)
>
> GitHub 上的 [`chromium/chromium`](https://github.com/chromium/chromium) 是**唯讀鏡像**，不是開發的主線，PR 不會被接受。
>
> Firefox 的 `nsHtml5Parser` 在 [searchfox.org](https://searchfox.org/mozilla-central/source/parser/html)，WebKit 在 [github.com/WebKit/WebKit](https://github.com/WebKit/WebKit)（WebKit 倒是真的用 GitHub）。

### 打包端：這邊才真的有牌子可以挑

| 解析對象 | 常見的 parser |
| --- | --- |
| **JS／TS** | Acorn（Rollup／Vite 用）、esbuild 內建（Go）、SWC（Rust）、`@babel/parser`、Oxc（Rust）、TypeScript Compiler API |
| **CSS** | PostCSS、**css-tree**、Lightning CSS（Rust） |
| **HTML** | parse5（Node 上最常用，嚴格照 WHATWG 規範）、htmlparser2（快但寬鬆）、`@vue/compiler-sfc` |

> 關聯：`計算機基礎/adopt-buffer-MIN_SIZE與TypedArray-Uint8-Uint32位元寬度.md` 拆的就是 **css-tree** 的 tokenizer 怎麼用 `Uint32Array` 存 token 座標。那是 **build-time 的 CSS parser**，跟瀏覽器內建的 CSS 解析器（Blink 的 `CSSParser`）完全是兩個世界的東西。

### 最大的差異：容錯 vs 嚴格

|            | 瀏覽器 HTML 解析器           | 打包工具的 parser                       |
| ---------- | ---------------------- | ---------------------------------- |
| 何時跑        | **runtime**，使用者打開頁面時   | **build time**，你 `npm run build` 時 |
| 輸入來源       | 網路串流，一包一包來             | 本機檔案，一次讀完                          |
| 必須可中斷續傳嗎   | ✅ **必須**（本文整篇在講的就是這件事） | ❌ 不用，檔案是完整的                        |
| **遇到語法錯誤** | **自動修復，永遠不丟錯**         | **直接丟 syntax error，中斷 build**      |
| 產出         | **DOM 樹**（活的，JS 可以改）   | **AST**（靜態資料結構）                    |
| 可以替換嗎      | ❌ 瀏覽器內建                | ✅ Babel → SWC → Oxc 想換就換           |

**核心就是「容錯」那一列。**

瀏覽器的 HTML 解析器**規範明文規定不准報錯** —— 你寫 `<p><div></p>`，它會照規範自動補成合法結構照常渲染。打包工具的 parser 看到語法錯誤直接停下來罵你。

這也正是第二節那個 tokenizer 能成立的前提：**瀏覽器端沒有「這段不合法所以我放棄」這個選項**，它只能「收到多少就處理多少，剩下的殘料留著等下一包」。

### 「不處理錯誤」是誤解——它處理得非常積極，只是不丟錯

這裡要澄清一個容易搞混的說法。「不報錯」**不等於**「不處理錯誤」，而是：

1. 規範裡確實有 **parse error** 這個概念，會被標記出來（DevTools 的 Issues 面板看得到）
2. 但規範**同時規定了每一種錯誤要怎麼修**，而且**強制瀏覽器照著修、繼續解析**
3. 所以**任何位元組序列都保證能產出一棵 DOM 樹**，畫面一定渲染得出來

白話講：它不是「忽略錯誤」，是「**把錯誤修成一個明確定義的結果**」。而且因為修法寫在規範裡，三家瀏覽器修出來的 DOM **會完全一樣** —— 這才是重點，否則同一份爛 HTML 在不同瀏覽器長不一樣，那才是災難。

實測（用嚴格照規範實作的 parse5 跑，等同瀏覽器行為）：

```
輸入 : <p><div></p>
DOM  : <p></p><div><p></p></div>

輸入 : <ul><li>A<li>B</ul>
DOM  : <ul><li>A</li><li>B</li></ul>

輸入 : <table><div>X</div><tr><td>1</td></tr></table>
DOM  : <div>X</div><table><tbody><tr><td>1</td></tr></tbody></table>

輸入 : <b><i>粗斜</b>只剩斜</i>
DOM  : <b><i>粗斜</i></b><i>只剩斜</i>

輸入 : <p>沒關閉的段落
DOM  : <p>沒關閉的段落</p>
```

白話逐條解釋它做了什麼：

1. **`<p><div></p>`** —— `<p>` 只能裝 phrasing content，裝不下 block 的 `<div>`，所以解析器一看到 `<div>` 就**自動把 `<p>` 關掉**。後面那個 `</p>` 變成沒有對應開標籤的孤兒，規範規定這時要**補插一個空的 `<p>`**。最終 DOM 變成 `<p></p><div><p></p></div>` —— 你寫的一個 `<p>`，瀏覽器給了你兩個。
2. **`<ul><li>A<li>B</ul>`** —— `<li>` 沒關就遇到下一個 `<li>`，解析器**自動補 `</li>`**。所以 HTML 裡 `<li>`、`<td>`、`<tr>`、`<option>` 的結束標籤本來就是可省略的。
3. **`<table><div>X</div>...`** —— `<div>` 不該出現在 `<table>` 裡，規範的 **foster parenting（寄養）** 演算法會把它**搬到 table 外面前面去**。注意 `<tbody>` 也是解析器自動補的，你根本沒寫。
4. **`<b><i>粗斜</b>只剩斜</i>`** —— 標籤交錯重疊，規範的 **adoption agency algorithm（領養機構演算法，名字就是這麼取的）** 會把它拆成兩段合法的巢狀結構。
5. **`<p>沒關閉的段落`** —— 檔案結束時所有還開著的標籤自動關閉。

⚠️ 所以回到「**錯誤不處理的話畫面能正常渲染嗎**」這個問題：**畫面一定渲染得出來，但不一定是你想要的樣子。** 第 1 條那個多出來的空 `<p>` 和第 3 條那個被搬出 table 的 `<div>`，都是「渲染成功但版面跑掉」的經典來源 —— 這也是為什麼 HTML 寫壞了常常不會噴錯，只會默默長得很怪。

### ⚠️ 但有一個例外：scripting 開關會真的改變解析結果

上面說「三家瀏覽器修出來的 DOM 會完全一樣」，那句話在**語法錯誤修復**的範圍內成立，但 HTML 規範裡有**極少數**地方，同一份 HTML 會因為「**JavaScript 有沒有開**」而解析出不同的 DOM。

最具體的就是 `<noscript>`。用 parse5 的 `scriptingEnabled` 選項實跑：

```
<noscript><p>請開啟 JavaScript</p></noscript>

scriptingEnabled: true   →  <noscript> 的子節點型別：#text   （純文字，不是元素！）
scriptingEnabled: false  →  <noscript> 的子節點型別：p      （真的 DOM 元素）
```

更明顯的證據：

```
<noscript><img src=x onerror=alert(1)></noscript>

scriptingEnabled=true   →  子節點 = #text，內容 = "<img src=x onerror=alert(1)>"
scriptingEnabled=false  →  子節點 = img
```

白話：**JS 開著的時候，`<noscript>` 裡面的東西根本不會被當成標籤解析**，整段就是一串純文字（規範叫 raw text）。只有 JS 關掉時，裡面的內容才會被正常解析成 DOM 元素。

所以 **scripting flag 不只決定「要不要執行 script」，它會直接改變 tokenizer 走哪條路。**

> 實務後果：`<noscript>` 裡面的 `<img>` 在 JS 開啟時**不會發出請求**，因為它根本不是元素。這是「no-JS 追蹤像素」能運作的前提，也是為什麼有人以為 `<noscript>` 裡的圖片會重複載入 —— 其實不會。

### 所以規範才要定義「符合性類別（conformance classes）」

HTML 規範不是只寫給瀏覽器看的。[§2.1.8 Conformance classes](https://html.spec.whatwg.org/multipage/infrastructure.html#conformance-classes) 把「會處理 HTML 的東西」分成幾類，其中**使用者代理（User Agent，UA）**有四種：

1. **Web browsers and other interactive user agents** —— 一般瀏覽器
2. **Non-interactive presentation user agents** —— 印表機、看板顯示器等**無法互動**的呈現裝置
3. **Visual user agents that support the suggested default rendering**
4. **User agents with no scripting support** —— 不支援 scripting 的實作

⚠️ **這四類不是互斥的，一個實作可以同時屬於好幾類。** 特別澄清一個很容易誤會的點：**第 2 類（印表機、看板）被分在那裡是因為「不能互動」，不是因為「不能跑 JS」。** 一台數位看板通常是跑完整 Chromium 的，JS 照跑；瀏覽器列印時 JS 也跑過了（`window.print()`、`beforeprint` 事件、print stylesheet 都存在）。**「不能互動」和「不支援 scripting」是兩條獨立的軸。**

規範對第 4 類的原文是：

> Implementations that do not support scripting (or which have their scripting features disabled entirely) **are exempt from supporting the events and DOM interfaces** mentioned in this specification. ... such user agents **must still act as if events and the DOM were supported**.

白話：**你可以不實作事件與 DOM 介面，但規範中任何用「事件」或「DOM」定義的行為，你還是要表現得好像有支援一樣。**

### 那到底什麼東西會「scripting disabled」？

| 類型 | 實例 | 為什麼關掉 |
| --- | --- | --- |
| **使用者主動關閉** | Chrome 設定關 JS、NoScript 擴充 | 隱私／效能／省電 |
| **安全政策擋掉** | `Content-Security-Policy: script-src 'none'` | 防 XSS |
| **Email client** | Gmail、Outlook、Apple Mail | **強制移除 `<script>`**，這是最大宗的一類 |
| **沙箱 iframe** | `<iframe sandbox>` 沒加 `allow-scripts` | 隔離第三方內容 |
| **伺服器端解析工具** | parse5、cheerio、jsdom（`runScripts` 預設關） | 本來就只要 DOM 不要執行 |
| **爬蟲的輕量模式** | 很多 SEO 爬蟲先用無 JS 抓一輪 | 省資源 |
| **純文字瀏覽器** | Lynx、w3m | 根本沒有 JS 引擎 |
| **閱讀模式／稍後閱讀** | Reader View、RSS reader、Pocket | 只要文字內容 |

**其中 Email client 最值得記**：你寫的 HTML 信件裡放 `<script>` 一定不會執行，所有互動都得靠 CSS 或純連結 —— 這是 HTML email 開發比網頁難很多的根本原因之一。

### 還有三類「不是 UA」的

「**UA（User Agent，使用者代理）**」的定義是「**代表使用者去取得並呈現網頁**」的程式。規範另外列了三類會讀 HTML、但**不是代表使用者在瀏覽**的工具：

| 非 UA 類別 | 實例 | 它對規範的義務跟 UA 不同的地方 |
| --- | --- | --- |
| **Conformance checkers**（驗證器） | [W3C Nu HTML Checker](https://validator.w3.org/nu/) | **必須報告 parse error** —— 而瀏覽器只要求「照規則修好繼續跑」，報不報告是選配。這就是為什麼 Chrome 的 Issues 面板不會列 `<p><div></p>` 這種結構錯誤 |
| **Data mining tools**（資料探勘／爬蟲） | 搜尋引擎索引器、各種 scraper | 只取資料不呈現，不必實作渲染 |
| **Authoring tools**（編輯／產生工具） | CMS 編輯器、靜態網站產生器、Dreamweaver | 它們是**產出** HTML 的一方，所以**必須產出合規的 HTML**，責任方向跟 UA 相反 |

把這張表跟上面那段對照，就能理解為什麼規範要把類別切這麼細 —— **同一份 HTML，對瀏覽器的要求是「無論如何都要渲染出來」，對驗證器的要求卻是「把每個錯誤都挑出來」。** 兩者的「正確行為」根本相反，不分類的話規範沒辦法寫。

#### 那 VS Code 算 authoring tool 嗎

規範對 authoring tool 的要求很重：

> Authoring tools and markup generators **must generate conforming documents**. ... an editor has to output documents that conform to the same extent that a conformance checker will verify.
>
> However, authoring tools **must not automatically misuse elements or encourage their users to do so**.

同時也給了豁免：

> Authoring tools are **exempt** from the strict requirements of using elements only for their specified purpose, but **only to the extent that authoring tools are not yet able to determine author intent**.

也就是說：**工具不確定作者想幹嘛的時候，可以先不要硬猜；但不能主動產生爛標記，也不能在有錯的情況下宣稱自己的輸出是合規的。**

⚠️ **規範裡並沒有明說純文字編輯器算不算。** 它只舉了兩大類：「從結構或語意資料產生標記的工具」與「所見即所得（WYSIWYG）工具」，沒有替純文字編輯器下定論。所以實務上這樣判斷比較合理：

| VS Code 在做什麼 | 算不算 |
| --- | --- |
| 你**手打** `<div>` | ❌ 不算 —— 這時它只是文字編輯器，標記是你產生的，對錯責任在你 |
| **Emmet 展開** `ul>li*3` 變成完整清單 | ✅ 比較接近 markup generator —— 標記是工具生出來的 |
| **自動補結束標籤**、**格式化** | ✅ 同上，工具在替你寫標記 |
| 裝了 HTML lint 外掛在報錯 | 那一刻它在扮演 **conformance checker** |

**重點不是「工具叫什麼名字」，而是「這個動作裡，誰在產生標記、誰該為不合規負責」。** 同一個 VS Code 在不同功能下會落在不同類別，這也呼應前面說的 —— **這些類別本來就不互斥。**

典型的、毫無疑義的 authoring tool：WordPress 編輯器、Notion 匯出 HTML、Word「另存為網頁」、Figma 匯出、以及**靜態網站產生器（Jekyll、Hugo、Next.js）** —— 你這個 vault 的 `.md` 經過 Jekyll 變成 HTML，**Jekyll 在那一刻就是 authoring tool**，它有義務產出合規的 HTML。



---

## 三、更底層：連一個中文字都會被切成兩半

上面封包 #2 的結尾出現了 `我的�`，那個 `�` **不是亂碼，是一個字元被切斷了**。

因為 UTF-8 是**變動長度編碼**：

| 字元 | UTF-8 佔幾個位元組 |
|---|---|
| `a`、`<`、`1` | 1 byte |
| 中文字（如「網」） | **3 bytes** |
| 部分 emoji | 4 bytes |

「網」這個字的位元組是 `0xe7 0xb6 0xb2`。**封包邊界是按 byte 切的，所以這 3 個位元組可能被切開。**

### 實測：切在中文字中間會發生什麼

拿 `我的網站` 這四個字（共 12 bytes），在第 5、6、7 個位元組切開：

**方式一：每段各自獨立解碼（錯的做法）**

```
在第 5 個位元組切開 → 「我��網站」
在第 6 個位元組切開 → 「我的網站」   ← 剛好切在字的邊界，僥倖對了
在第 7 個位元組切開 → 「我的���站」
```

**方式二：用 stream 模式（對的做法）**

```js
const dec = new TextDecoder('utf-8');
dec.decode(封包A, { stream: true }) + dec.decode(封包B, { stream: true })
```

```
在第 5 個位元組切開 → 「我的網站」  ✅
在第 6 個位元組切開 → 「我的網站」  ✅
在第 7 個位元組切開 → 「我的網站」  ✅
```

白話講 `{ stream: true }` 的意思是「**這還沒完，下次還有**」。解碼器會把湊不成一個完整字元的殘留位元組留著，等下一批補齊——**跟上面 tokenizer 的 buffer 是一模一樣的設計思路。**

### 所以完整的管線有兩個「可暫停」的階段

```
位元組  →（TextDecoder，stream 模式）→  字元  →（Tokenizer，狀態機）→  token  →  DOM 樹
        ↑ 這裡要能暫停在半個字元               ↑ 這裡要能暫停在半個標籤
```

**兩個階段都必須能停在半路**，因為封包完全不管你的邊界在哪。

---

## 四、這解釋了三件事

### a. 為什麼「串流解析」做得到

因為狀態存在外面。解析器不需要一次拿到整份 HTML，**收到多少就處理多少**，剩下的殘料留著。

這也是為什麼你會看到網頁「由上而下逐漸長出來」，而不是整頁一次跳出來。

### b. 為什麼 `<script>` 一定要阻塞解析（Day 18 講過的那個坑）

因為 JavaScript 可以用 `document.write()` **改寫「還沒讀到的那段位元流」**：

```html
<script>document.write('<h1>我插隊寫進 HTML 了</h1>')</script>
```

白話講：這行 JS 會在解析器目前讀到的位置，硬塞一段新的 HTML 進去，**解析器接下來要讀的內容就被改掉了**。

既然後面的內容可能被動過，解析器就**不敢繼續讀**——它必須停下來等這支 JS 跑完，確認沒有人改過後面，才能安全地繼續。

**這就是 parser-blocking 的根本原因。** 而 `defer` 和 `async` 之所以能安全延後執行，正是因為**規範明文規定它們裡面的 `document.write()` 會被忽略**——不能改寫解析流程，就不需要阻塞解析。

### c. 為什麼前 14 KB 這麼關鍵

TCP 有**慢啟動（slow start）**機制：它不敢一開始就全速衝，第一輪只送 **initcwnd（initial congestion window，初始擁塞窗口）** 個封包，然後停下來等對方回應 ACK。

Linux 從 2.6.39 起 `initcwnd` 預設是 **10**，所以第一輪能送：

```
10 個封包 × 1460 bytes ≈ 14,600 bytes ≈ 14 KB
```

**你的 HTML 前 14 KB 是「一個來回」就能到的，超過的要等下一個 RTT（Round-Trip Time，來回時間）。**

| 連線情境 | 典型 RTT | 超過 14 KB 的代價 |
|---|---|---|
| 同城市的 CDN 節點 | 10～30 ms | 還算小 |
| 跨國（台灣打美國） | 150～250 ms | 明顯有感 |
| 行動網路訊號差 | 100～500 ms | 非常痛 |

所以「首屏 HTML 壓在 14 KB 以內」不是迷信，它在說：**讓解析器在第一個來回就拿到足以畫出首屏的位元組。**

---

## 五、最糟的組合，以及為什麼

把三件事疊起來：

- 封包一包一包到，**前 14 KB 最快到**
- 解析器**收到多少就解析多少**
- 解析到 `<script>` 時**要不要停下來**

<mark style="background: #FFF3A3A6;">**最糟的組合是：一般的 `<script src>` 放在 `<head>`。**</mark>

因為它落在「前 14 KB」裡，也就是**最早被解析到的位置**，而它一被解析到就中斷解析——主執行緒停在那裡等一個全新的網路請求，**又是一個 RTT，而且那支 JS 自己也要經歷一次慢啟動。**

白話講：**你花了力氣讓 HTML 前 14 KB 快快到，結果第 5 行就叫瀏覽器停下來等另一個檔案。**

---

## 六、今天的判斷標準

下次看效能報告或設計 HTML 結構時，問自己三個問題：

| 問題 | 為什麼重要 |
|---|---|
| 首屏需要的內容，在前 14 KB 以內嗎？ | 決定要不要多花一個 RTT |
| `<head>` 裡有沒有**沒掛 async／defer** 的 `<script src>`？ | 它會在最早的位置中斷解析 |
| 第三方腳本（GA、廣告）有沒有掛 `async`？ | 它們跟 DOM 無關，不該阻塞 |

還有一個心態上的調整，是我寫這篇最大的收穫：

> **不要用「標籤」當思考單位，要用「位元組」。**
>
> 一旦習慣了「網路送的是 bytes 不是 tags」，很多原本要硬背的規則——為什麼要 `defer`、為什麼 `<script>` 要放最後、為什麼 14 KB 是個數字——就變成同一件事的推論，不用一條一條記。

---

---

## 完整可執行程式碼

存成 `packet-boundary-demo.js`，執行 `node packet-boundary-demo.js` 可以重跑本文所有實測（封包切點、被切斷的標籤、tokenizer 狀態機、TextDecoder 的 stream 模式對照）。純 Node.js 不需要任何套件。

程式碼有點長，這裡放最核心的兩段。

**第一段：證明封包會切斷標籤**

```js
// 白話講：Buffer.from 把字串變成位元組陣列，才能按 byte 精準切。
//         中文一個字在 UTF-8 佔 3 bytes，所以不能用 string.slice。
const bytes = Buffer.from(html, 'utf8');
const MSS = 40;                    // 真實約 1460，縮小才看得出切點

const packets = [];
for (let i = 0; i < bytes.length; i += MSS) {
  packets.push(bytes.subarray(i, i + MSS));
}

// 白話講：往回找最後一個 < 和最後一個 >，
//         如果 < 比 > 晚出現，就代表現在卡在標籤中間。
const isInsideTag = (text, pos) => {
  const before = text.slice(0, pos);
  return before.lastIndexOf('<') > before.lastIndexOf('>');
};
```

**第二段：TextDecoder 的 stream 模式**

```js
const sentence = Buffer.from('我的網站', 'utf8');
const cut = 5;                     // 刻意切在「網」字的 3 個位元組中間

// ❌ 錯的：每段各自獨立解碼，殘留位元組變成 �
const naive = new TextDecoder('utf-8');
naive.decode(sentence.subarray(0, cut)) + naive.decode(sentence.subarray(cut));
// → 「我��網站」

// ✅ 對的：stream: true 告訴解碼器「這還沒完」，它會留著殘料等下一批
const dec = new TextDecoder('utf-8');
dec.decode(sentence.subarray(0, cut), { stream: true })
  + dec.decode(sentence.subarray(cut), { stream: true });
// → 「我的網站」
```

---

## 參考來源與內容出處說明

延續這個系列的做法，把內容分類標示。

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| HTML tokenizer 是狀態機、`document.write()` 在 defer／async 中被忽略 | [WHATWG HTML Standard — Parsing 章節](https://html.spec.whatwg.org/multipage/parsing.html) |
| `TextDecoder` 的 `stream` 選項語意 | [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/) ／ [MDN — TextDecoder.decode()](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode) |
| TCP 初始擁塞窗口設為 10 的提案 | [IETF draft-ietf-tcpm-initcwnd-04](https://datatracker.ietf.org/doc/html/draft-ietf-tcpm-initcwnd-04) |
| 14 KB 規則的推導 | [Tyler Cipriani — The 14kB in the TCP Initial Window](https://tylercipriani.com/blog/2016/09/25/the-14kb-in-the-tcp-initial-window/) ／ [Tune The Web — Critical Resources and the First 14 KB](https://www.tunetheweb.com/blog/critical-resources-and-the-first-14kb/) |
| 各瀏覽器 HTML 解析器的實作名稱與原始碼位置 | Blink：[chromium.googlesource.com `third_party/blink/renderer/core/html/parser/`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/html/parser/)、[source.chromium.org 程式碼搜尋](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/parser/)；Gecko：[searchfox.org `parser/html`](https://searchfox.org/mozilla-central/source/parser/html)、[validator.nu HTML parser](https://about.validator.nu/htmlparser/)；WebKit：[github.com/WebKit/WebKit](https://github.com/WebKit/WebKit) |
| 解析錯誤必須被修復而不是中斷（parse error 的處理規則、foster parenting、adoption agency algorithm） | WHATWG HTML Standard，[Tree construction 章節](https://html.spec.whatwg.org/multipage/parsing.html#tree-construction) |

**二、我實際跑出來的部分**

封包切點表、被切斷的標籤、tokenizer 每包的狀態、TextDecoder 三種切法的對照，全部由 `packet-boundary-demo.js` 實測產生（Node.js v22），可以重跑驗證。

二之二節那五組「爛 HTML 被修成什麼」的 DOM 對照，是用 **parse5**（嚴格照 WHATWG 規範實作，行為等同瀏覽器）實跑產生的，Node.js v22，可重跑驗證：

```js
const parse5 = require("parse5");
const html = "<p><div></p>";
console.log(parse5.serialize(parse5.parseFragment(html)));
// <p></p><div><p></p></div>
```

白話講這段：`parseFragment` 把字串解析成 DOM 片段，`serialize` 再把那棵樹還原成 HTML 字串印出來，所以印出的就是「解析器實際建了什麼」，而不是你輸入了什麼。

**特別說明一件事**：第三節「連中文字都會被切斷」**是我跑完 Part 1 才發現的**——原本只是想證明標籤會被切斷，結果輸出裡冒出一個 `�`，才追下去發現 UTF-8 也有同樣的問題。這段不在我原本的寫作計畫裡。

**三、我自己的整理與比喻（沒有外部出處）**

- 「不要用標籤當思考單位，要用位元組」這個說法

- 把「解碼」與「解析」畫成兩個都要可暫停的階段

- 第六節那三個判斷問題

- 「最糟的組合是 `<head>` 裡的同步 script」這個推論（規範沒有這樣講，是把 14 KB 規則與 parser-blocking 疊起來的結論）

**四、數字的注意事項**

`initcwnd = 10` 是 Linux 預設值，**CDN 常調大（有些到 30）**，所以 14 KB 是典型值不是硬規則，實際要看伺服器與 CDN 設定。另外 **HTTP/3 走 QUIC（UDP）**，壅塞控制機制不同，但慢啟動與初始窗口的概念仍然存在。

（查閱日期：2026-09-21；二之二節的解析器章節查閱於 2026-10-11。程式碼實測於 Node.js v22）
