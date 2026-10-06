---
title: 【編譯 runtime】V8 引擎完整管線 — Parse → Ignition → TurboFan → Deoptimization
type: topic-note
tags: [v8, javascript, compiler, jit, ignition, turbofan, escape-analysis, inline-caching, deoptimization, JS_Core_and_Runtime]
aliases: [V8引擎完整管線-Parse到Deoptimization, 04-V8引擎完整管線-Parse到Deoptimization]
related:
  - "[[機器碼與bytecode的差異]]"
  - "[[作用域-scope-global-function-block]]"
  - "[[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]"
updated: 2026-08-15
note: 檔名前綴 00 代表本篇是 JS_Core_and_Runtime 資料夾裡「依編譯／執行順序」編號的第一篇（管線總覽）；aliases 保留舊檔名，讓其他筆記既有的 [[V8引擎完整管線-Parse到Deoptimization]] wikilink 不會失效。
---

# 【編譯 runtime】V8 引擎完整管線：Parse → Ignition → TurboFan → Deoptimization

<div class="tip-glossary" data-term="頂層程式碼的變數一律放 Heap，因為變數會跨 script 可見" data-text="「頂層」指 script 檔最外層、不在任何函式裡的程式碼。&#10;適用範圍：這句話出自 V8 部落格，講的是 classic &lt;script&gt;。純 JS 用 &lt;script src&gt; 載入時適用。React 專案用的是 ES module（Vite、webpack 打包後也是），不直接適用。&#10;&#10;classic &lt;script&gt; 的最外層共用同一個全域範圍：var 與 function 宣告會變成 window 的屬性，let、const、class 放在全域的 ScriptContext。其他 script 隨時可能存取它們，所以 V8 一律放在 Heap 的 Context，不放進會被 pop 掉的 Stack Frame。&#10;&#10;ES module 的最外層是 module 範圍，不是全域，別的檔案要用就 export 與 import，「變數會跨 script 可見」的理由不成立。不過 module 層級的變數同樣活得比任何函式久（要給其他檔案 import、給元件函式用），所以多半也放在 Heap 上的結構裡。這一點是推論，沒有查證 V8 對 module 變數的實作。&#10;&#10;React 元件函式裡的變數是函式內部變數，不在這句話的範圍內，照一般規則：沒被閉包捕獲放 Stack，被事件處理函式或 effect 捕獲才放 Heap 的 Context。元件之間用 props 傳值是資料流的設計，與記憶體放在哪裡是兩件事。所以在 React 專案裡這句話幾乎碰不到。&#10;&#10;純 JS 要不要全域變數：現代寫法盡量不用，因為會依賴載入順序，名稱也容易衝突。舊式 classic script 的用法如下。&#10;a.js：const appName = &#x27;Abby&#x27;; function greet() { return &#x27;Hi &#x27; + appName }&#10;b.js：console.log(greet())&#10;index.html：先 &lt;script src=&quot;a.js&quot;&gt;，再 &lt;script src=&quot;b.js&quot;&gt;，順序不能反。&#10;改用 module：a.js 寫 export function greet() {…}，b.js 寫 import { greet } from &#x27;./a.js&#x27;，HTML 用 &lt;script type=&quot;module&quot; src=&quot;b.js&quot;&gt;。"></div>

> [!info]- 📍 00號：整個編號序列的起點
> <mark style="background: #BBFABBA6;">起點</mark>：這是`JS_Core_and_Runtime`資料夾照編譯到執行順序編號的第一篇，畫出Parse→Ignition→TurboFan→Deoptimization整條管線地圖。
> <mark style="background: #ADCCFFA6;">下一步</mark>：管線圖裡第一個要拆解的詞就是「引擎」本身，下一篇[[01-引擎-Engine-到底是什麼]]先把這個詞定義清楚。

> 比 [[機器碼與bytecode的差異]] 那篇「6. V8 的實際管線」更詳細的版本，把 Scanner/Scope Analysis、Profiling、Escape Analysis、Inline Caching、Type Specialization、Deoptimization 全部串起來。

## V8 是 Chrome 的 JS 引擎嗎？跟 SSR 有關係嗎？

<mark style="background: #BBFABBA6;">「V8 是 Chrome 的 JS 引擎」這句話對，但不完整</mark>——V8 最早是為 Chrome 開發的沒錯，但它是一個**獨立、可嵌入任何 C++ 專案的引擎**，不是只綁死在 Chrome 瀏覽器裡：

- **Chrome / Edge / Brave** 等 Chromium 系瀏覽器：直接內嵌 V8。
- **Node.js**：把 V8 抽出來，外面包 `libuv`（處理檔案 I/O、網路等的事件迴圈）與 Node 專屬 API（`fs`、`http`…），讓 JS 可以離開瀏覽器、在伺服器上跑。<mark style="background: #FFF3A3A6;">「只包一層 libuv」是簡化說法</mark>，完整架構（libuv 具體是什麼、Node 還有哪些層、CSR 渲染邏輯在哪執行、純前端會不會用到 Node API）另開一篇：[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]。
- **Deno、Electron**：也是內嵌 V8（Electron 甚至同時內嵌 V8 + Chromium）。

<mark style="background: #FFF3A3A6;">跟 SSR（Server-Side Rendering）的關係</mark>：Next.js、Nuxt 這類 SSR 框架，是讓 React／Vue 的渲染邏輯改在**伺服器上的 Node.js**執行，而 Node.js 底層就是 V8。也就是說，SSR 時伺服器產生 HTML 字串的那段 JS，走的**正是本篇這一整套 Parse → Ignition → TurboFan → Deoptimization 管線**，只是少了瀏覽器提供的 `window`/`document`（改用 Node 的 host 環境），並不是換了一顆完全不同的引擎。差異只在**執行環境（host environment：瀏覽器 Web APIs vs Node.js APIs）**，不是引擎本身或編譯管線。

Node.js 在一般前端「打包」流程裡的角色（跟 SSR 不是同一件事，容易搞混）另有詳細說明，見 [[前端開發工具-打包編譯Lint與Parser]] 第 7 節。

## 完整流程圖【編譯 runtime，不是打包 buildtime】

> [!warning]+ 這張圖到底在講哪個時間點？——全程都是「編譯 runtime（執行期）」
> a. 下圖從「JavaScript 原始碼」一路到 Deoptimization 的每一站，都發生在**瀏覽器／Node.js 載入並執行這支腳本的當下**，由 V8 引擎自己完成。這裡的「編譯」指的是 JIT（Just-In-Time Compilation，即時編譯）——名字裡的 Just-In-Time 就是「執行到的那一刻才編譯」的意思。
> b. **打包 buildtime（建置期）發生在這張圖的左邊界之外**：Babel／tsc／SWC 把 TSX/JSX 轉成標準 JS、bundler（webpack／Vite／Rollup／Turbopack）把多個模組合併壓縮，這些都是在你的電腦或 CI 上跑完、部署之前就結束的事。V8 拿到的永遠是「已經轉譯打包完的標準 JS」，它看不到你原本寫的 TSX。
> c. <mark style="background: #FF5582A6;">用詞請跟著本資料夾的約定走：buildtime 那一段一律叫「轉譯（transpile）」與「打包（bundle）」，不要叫「編譯」</mark>；「編譯（compile）」這個詞只留給 V8 在執行期做的 AST → Bytecode → 機器碼。理由是方向不同——轉譯是高階語言 → 另一個同樣高階的語言（TSX → 標準 JS），編譯是高階 → 更低階的表示法。這組用詞的完整分辨與工具對照，主場在 [[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】|03-前端開發工具（打包 buildtime）]]，本篇只放結論。
> d. 想看 buildtime 那一段的完整流程，請改讀同資料夾的 [[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】|03-前端開發工具（打包 buildtime）]]（那篇開頭有〈buildtime 全流程地圖〉表格，逐步對應到各篇）；至於這些步驟是**誰觸發、依什麼順序跑**，主場在 [[08-npm-run-script-mechanism]] 與 [[09-npm-scripts-pre-post-生命週期鉤子]]——`npm run build` 才是把所有 buildtime 工具串起來的那根線。打包工具選型另見 [[07-前端專案建立與打包選型-Vite與createVue與NextJS與npm鎖版本]]。

```mermaid
flowchart TD
    A["JavaScript 原始碼"] --> B
    subgraph Parse["Parse（解析）"]
        B["Scanner 詞法分析<br/>→ Tokens"] --> C["Parser 語法分析<br/>→ 建立 AST"]
        C --> D2{"Early Error 靜態語法檢查<br/>例：重複的參數名稱、重複的 let/const 宣告"}
        D2 -- 檢查沒過 --> D2X["直接 SyntaxError<br/>連 Bytecode 都不會生成"]
        D2 -- 檢查通過 --> D["Scope Analysis 範疇分析<br/>初步判定：這個變數有沒有被閉包捕獲？<br/>→ 決定放 Stack/暫存器（快）還是 Context 物件（Heap，慢）"]
    end
    D --> E
    subgraph IgnitionBox["Ignition（直譯器）"]
        E["把 AST 編成 Bytecode<br/>並立即直譯執行"] --> F["收集 Profiling Data<br/>(Feedback Vector：傳入型別、呼叫次數…)"]
    end
    F --> G{"判定為 Hot Code？"}
    G -- 否，繼續用 Ignition 直譯 --> E
    G -- 是 --> H
    subgraph TurboFanBox["TurboFan（JIT 最佳化編譯器）"]
        H["利用 Profiling Data 做高階優化"] --> H1["Escape Analysis<br/>物件標量替換／棧分配優化"]
        H --> H2["Inline Caching<br/>內聯快取"]
        H --> H3["Type Specialization<br/>型別特化"]
        H1 --> I["生成高度優化的 Machine Code"]
        H2 --> I
        H3 --> I
    end
    I --> J["執行 Machine Code（極快）"]
    J -- "型別突然改變<br/>(例如本來都傳 number 突然傳 string)" --> K["Deoptimization 去優化<br/>放棄 Machine Code，退回 Ignition 繼續跑 Bytecode"]
    K --> E
```

> 上圖 Parse 裡新增的 **Early Error** 節點，例子（重複參數名稱何時合法、何時直接 SyntaxError）見 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] 的 (e) 節——這類錯誤在 Parse 階段就會被抓出來，根本不會走到 Ignition 生成 Bytecode。

## 各階段名詞解釋

### Parse 階段

- **Scanner（詞法分析／Lexer／Tokenizer）**：三個詞<mark style="background: #BBFABBA6;">可以直接畫等號——Scanner＝Lexer＝Tokenizer</mark>，業界混用，指同一件事：把原始碼文字**逐字掃過**，切成一顆顆有意義的最小單位——**Token**（也叫 Lexeme／語素；關鍵字、identifier、運算子、字面量…）。這一步只管「切詞」，不管文法對不對。
- **Parser（語法分析）**：把 Token 序列按 JS 文法規則組成樹狀結構 **AST**，同時檢查語法對不對（少個括號這種錯誤在這裡就會被抓到）。遇到解構參數（`{a,b}`／`[a,b]`）這種寫法時，Parser 具體依據的正是 [ECMA-262 Destructuring Binding Patterns](https://tc39.es/ecma262/#sec-destructuring-binding-patterns) 這份規格條文——**關係**：規格文字定義「合法的解構模式長怎樣」，Parser 就是把這份規格條文轉成程式邏輯的那個實作；**重要性**：Scanner 產生的 Token 是 Lexical Grammar 的產物（見 [[字面量-關鍵字-識別碼基礎]]），Parser 再依這份 Syntactic Grammar 規則把 Token 組合成樹——兩份文件合起來，正好對應 Parse 階段「先切詞、再組句」的兩個步驟。
- **Scope Analysis（範疇分析）**：在建好 AST 後，V8 對每個 scope 做的事**不只「判斷閉包捕獲」一項**，而是把整個靜態範疇結構都定下來：
  - **解析變數的歸屬（scope chain 解析）**：把 AST 裡每一個識別碼的「使用」都對應回它到底是**哪個 scope 宣告的**（或者哪個都不是、屬於全域/未宣告），建立完整的範疇鏈——這是所有後續判斷的地基。
  - **判斷閉包捕獲，決定放 Stack 還是 Heap**：這個變數有沒有被內層函式（閉包）捕獲？**沒被捕獲** → 留在**快速的 Stack／暫存器**（函式執行完直接釋放，效能好，見 [[return-清理記憶體-stack-frame與閉包例外]]）；**有被捕獲** → 放進**堆積（Heap）上的 Context 物件**，讓閉包長期抓著它。這是**初步／必要的**判定（決定正確性，不是可有可無的優化），只看**語法結構**——「AST 上有沒有內層函式引用這個變數」，不看實際執行狀況。
    - <mark style="background: #ADCCFFA6;">這個「初步判定」跟下面 TurboFan（圖裡 `H1` 節點）做的 **Escape Analysis（逃逸分析）＋物件標量替換（Scalar Replacement）** 是兩個不同層次的機制，容易被搞混，對照如下</mark>：

      | | Scope Analysis 的初步判定（這裡） | TurboFan 的 Escape Analysis（下方 TurboFan 階段） |
      |---|---|---|
      | 發生時機 | Parse 階段，**每個函式都會做一次**（含被 preparser 略過的函式，見下方 Preparser 那一點） | 只有被判定為 Hot Code、送進 TurboFan 之後才會做 |
      | 判斷依據 | **靜態語法結構**：AST 上有沒有內層函式引用這個變數 | **實際執行 Profile**：這個物件在真正跑過的案例裡，有沒有被回傳、存到外部變數、被閉包捕獲 |
      | 保守程度 | 保守——只要「可能」被捕獲就先放 Heap，確保正確性優先 | 激進——只要「證明」完全不會逃逸，可以直接連 Heap 都不配置 |
      | 對物件的處理 | 二選一：整包放 Stack 或整包放 Heap Context | 可以更細：把物件拆成好幾個獨立的純量值（scalar），例如物件的每個欄位各自變成一個暫存器變數，完全跳過「配置一整個物件」這件事 |
      | 目的 | 決定**正確性**（閉包捕獲的變數絕對不能被提早釋放） | 追求**極致效能**（能不進 Heap 就不進，省下配置與 GC 成本） |

      一句話：**Scope Analysis 是「看語法就能做的保守判斷」，Escape Analysis 是「看實際執行狀況才敢做的激進優化」——前者是每次都跑的必要步驟，後者是熱點程式碼才有的加碼優化。**
  - **var／function Hoisting 與 let／const 的 TDZ 邊界**：確定 `var` 要被提升到哪個最近的函式 scope、`function` 宣告要不要整個提升，以及 `let`/`const` 的暫時性死區（TDZ）範圍從哪裡到哪裡。
  - **偵測 `eval` / `with`**：如果這個 scope 裡出現直接 `eval()` 呼叫或 `with` 語句，因為它們可以在執行期**動態新增/改變綁定**，會破壞靜態分析的前提，V8 必須把整個 scope 標記成「不可靜態優化」，退回保守、較慢的處理方式。
  - **判斷要不要建立 `arguments` 物件**：如果函式本體根本沒引用 `arguments`，V8 可以直接省略建立它，省一筆開銷（哪種參數列表會影響 `arguments` 是「mapped」還是「unmapped」，見 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] 的簡單參數列表說明）。
  - **strict mode 判定**：從 `"use strict"` 指令或 ES Module 環境推定這段程式碼是不是 strict mode，會影響後面一系列語法限制。
  - **Early Error 靜態語法檢查**：例如同一個參數列表裡重複的參數名稱、同一 scope 裡重複的 `let`/`const` 宣告，這類「編譯期就能確定是錯的」語法錯誤，也是在這個階段被抓出來（完整的重複參數名稱規則見 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] 的 (e)）。

- **Preparser 與 Lazy Parsing（惰性 parse）**：V8 的 parser 遇到函式時，不一定立刻把它完整 parse 成 AST。它會切換成 preparser（parser 的精簡版，只做「剛好足以略過這個函式」的最少工作），先確認函式本體語法合法，並記下外層函式編譯所需的資訊。等這個函式第一次被呼叫，V8 才完整 parse 它並交給 Ignition 編成 Bytecode。

  官方部落格 [Blazingly fast parsing, part 2: lazy parsing](https://v8.dev/blog/preparser)（2019-04-15）第一段的逐句對照：

  | 官方原文 | 白話解釋 |
  |---|---|
  | Parsing is the step where source code is turned into an intermediate representation to be consumed by a compiler (in V8, the bytecode compiler Ignition). | 這是 runtime 在 V8 裡做的事。這裡的 compiler 指 Ignition（把 AST 編成 Bytecode 的 bytecode compiler），與 buildtime 的 transpiler（原始碼轉原始碼）、之後把熱點函式編成機器碼的 TurboFan（optimizing compiler）屬於不同層。這句出現在 part 2，part 1 講 scanner 的優化 |
  | Parsing and compiling happens on the critical path of web page startup | critical path 指頁面啟動時「必須依序完成、後面才能繼續」的那條工作路徑。parse 與 compile 都在 main thread 的啟動流程上，花多久，頁面就晚多久能互動 |
  | and not all functions shipped to the browser are immediately needed during startup. | 一支 bundle 裡有很多函式，但啟動當下只會用到其中一小部分 |
  | Even though developers can delay such code with async and deferred scripts, that's not always feasible. | 原文沒有說明理由，以下是我的推論。a. 啟動就要用的程式碼本來就不能延後。b. `async`、`defer` 只改變 script 何時下載與執行，檔案一旦執行，裡面沒被呼叫的函式至少還是會被 preparse 一次。c. 把不需要的功能拆出去要靠 code splitting 與 dynamic import 重構，成本高，第三方 script 更不是你能拆的。d. 有執行順序依賴的 script 不能隨便用 `async` |
  | Additionally, many web pages ship code that's only used by certain features which may not be accessed by a user at all during any individual run of the page. | 例如結帳頁、後台管理功能的程式碼，使用者這一次載入頁面可能根本不會點到 |
  | Eagerly compiling code unnecessarily has real resource costs: | eagerly 是「迫切」，意思是不管用不用得到都先編譯。下面三條是它的代價 |
  | CPU cycles are used to create the code, delaying the availability of code that's actually needed for startup. | main thread 一次只能做一件事，每花一段 CPU 時間去編譯啟動時用不到的函式，真正要用的函式就晚一點才輪到。availability 是「可用性」，指程式碼何時能被執行（與 GC 的可達性 reachability 是不同概念）。that's actually needed for startup 修飾 code，指「啟動時真的需要的那些程式碼」 |
  | Code objects take up memory, at least until bytecode flushing decides that the code isn't currently needed and allows it to be garbage-collected. | 編好的 Bytecode 會佔 V8 heap 的記憶體。bytecode flushing 的做法（[V8 v7.4 發佈說明](https://v8.dev/blog/v8-release-74)，2019-03-22）：被 GC 回收的只有函式編好的 Bytecode，函式物件與它的 SharedFunctionInfo 仍然可達，不會被回收。回收前先判斷這份 Bytecode 是否「最近沒被執行」：v7.4 的做法是為 Bytecode 記錄「年齡」，每次 GC 時沒被執行就加一，被執行就歸零，累積超過門檻（連續好幾次 GC 都沒被執行）才在 GC 時回收。回收後函式變回尚未編譯，下次被呼叫才重新 lazy compile。這個判斷與 scope chain 的可達性是兩個機制（可達性決定物件能不能被 GC）。現行 V8 main 的旗標 `bytecode_old_time` 預設 180（秒），描述為「flush of bytecode when it has not been executed recently」，判定看起來已改為以時間為準，本篇未逐行驗證實作。官方量測 bytecode 約占 V8 heap 的 15%，flushing 省下 5 到 15% |
  | Code compiled by the time the top-level script finishes executing ends up being cached on disk, taking up disk space. | 這是 Chrome 的 code cache（[Code caching for JavaScript developers](https://v8.dev/blog/code-caching-for-devs)，2019-04-08）。同一支 script 第二次載入時，Chrome 把編好的結果序列化，附在 HTTP cache 的檔案旁。「頂層腳本執行完時已編譯的函式」都會進 cache，所以不必要的 eager compile 也會一起佔磁碟。這整段都是 runtime 的 V8 與 Chrome 在做的事 |

  跟 Critical Rendering Path（CRP，瀏覽器把 HTML 變成畫面的 DOM、CSSOM、render tree、layout、paint 這條路）的關係：官方這篇沒有談 render。兩者都是「啟動時的必經路」，而且會重疊，因為沒加 `async`、`defer` 的 script 會擋住 HTML 的 parse，它的下載、parse、compile、執行都得做完，後面的畫面才能繼續，所以會推遲首次繪製。這個連結是我的推論，不是官方原文。相關：[[FCP首次內容繪製-SEO爬蟲與打包五步驟]]。

  preparser 還要追蹤變數，原因直接連到 [[return-清理記憶體-stack-frame與閉包例外]]：官方在同一篇的 Variable allocation 一節說，V8 要知道「每個變數有沒有被內層函式引用」，才能決定它放 Stack 或 Heap 的 context，所以 preparser 也必須追蹤變數的宣告與引用，而且在 preparse 期間就做完整的 scope resolution。V8 把「每個變數放哪裡」序列化成一個小陣列存起來，之後完整 parse 該函式時直接套用，內層函式就不必被重複 preparse。結果是每個函式最多被 preparse 一次、完整 parse 一次（bytecode 被 flushing 回收後又被呼叫時會重新 parse，是例外）。
  官方還提到兩種特例。頂層程式碼的變數一律放 Heap，因為變數會跨 script 可見。`(function(){…})` 這種括號包起來的函式，V8 假設它會立刻被呼叫，直接完整 parse 並編譯，稱為 PIFE（possibly-invoked function expression）。

### Ignition（直譯器）階段

- 把 AST **編譯**成精簡的 **Bytecode**，然後**直譯執行**（見 [[機器碼與bytecode的差異]] 對 bytecode 概念的完整解釋）。
- 執行的同時**順手收集 Profiling Data**（V8 內部叫 **Feedback Vector**）：記錄「這個函式被呼叫幾次」「傳進來的參數通常是什麼型別」「這個屬性存取通常是對哪種物件形狀（Shape/Hidden Class）」等統計資料，供之後 TurboFan 判斷要不要優化、怎麼優化。

### Hot Code 判定

V8 監控函式的**呼叫次數**（以及迴圈的**執行次數**，這種情況叫 OSR／On-Stack Replacement），超過門檻就標記成「熱點程式碼」，送去給 TurboFan 優化。**沒達標的程式碼就繼續留在 Ignition 直譯執行**——多數程式碼其實只跑一兩次，直接省下 TurboFan 的編譯成本。

> [!question]- 「超過一次呼叫」就算 Hot Code 嗎？——不是
> <mark style="background: #FF5582A6;">門檻不是「呼叫次數 > 1」這種離散計數器</mark>，而是一個**額度（interrupt budget）**：Ignition 執行時依「跑了多少 bytecode／迴圈 back-edge 次數」持續扣掉這個額度，扣到 0 才觸發「該不該送去優化」的判斷——扣額度看的是**累積執行量**，不是單純數「第幾次呼叫」。也因此：一個函式**只呼叫一次**、但內部跑超大迴圈，一樣可能透過 OSR 變熱（見下面「實例：拿掉 return 的無窮迴圈」，就是只呼叫一次卻觸發 OSR 的案例）；反過來，呼叫兩三次但函式體很小，額度通常扣不完，還是留在 Ignition。
>
> 另外現代 V8 其實是**多層 tiering**，不是只有本篇簡化畫的 Ignition／TurboFan 兩層：Ignition（直譯）→ **Sparkplug**（baseline JIT，門檻很低，幾乎跑沒幾次就會編，但不做激進優化）→ **Maglev**（中階優化）→ **TurboFan**（最高階，門檻最高，要累積夠多 Profiling Data 才划算送進去）。門檻高低跟編譯成本成正比：越激進的優化器，門檻設越高。

### TurboFan（JIT 優化編譯器）階段

利用 Ignition 收集到的 Profiling Data，針對**這個熱點函式實際觀察到的情況**做高度客製化的優化：

- **Escape Analysis（逃逸分析）＋ 物件標量替換（Scalar Replacement）**：分析一個物件會不會「逃出」目前函式（被回傳、被存到外部變數、被閉包捕獲…）。**如果證明完全不會逃逸**，TurboFan 甚至可以**直接不配置這個物件在 Heap 上**，改把它拆成幾個獨立的純量值（scalar，例如物件的每個欄位各自變成一個暫存器變數），完全跳過 Heap 配置與之後的垃圾回收成本——這比 Scope Analysis 那個「初步判定」更激進、更精確，因為它是**根據實際執行 profile** 做的優化，不是單純看語法結構。
- **Inline Caching（內聯快取，IC）**：物件的屬性存取（`obj.x`）如果**每次遇到的物件形狀（Hidden Class）都一樣**，V8 就把「這個屬性在記憶體的哪個偏移量」直接快取起來，之後同樣形狀的物件存取可以跳過查找過程直接取值——這是 V8（以及 Smalltalk 以降各種動態語言引擎）加速屬性存取的經典技巧。
	  引擎會將原型鍊的結構也納入Shape的檢查中。只要原型鏈沒變，連原型的屬性與方法也會被IC快取為直接的記憶體編譯存取。
- **Type Specialization（型別特化）**：既然 Profiling Data 顯示這個函式「目前為止」呼叫時傳進來的都是同一種型別（例如都是 number），TurboFan 就**假設這個前提永遠成立**，生成一份**專門針對這個型別、跳過泛用型別檢查**的極致優化機器碼——這是換取速度的關鍵一步，但也正因為是「假設」，才需要下面的 Deoptimization 機制當安全網。

### Deoptimization（去優化）—— TurboFan 賭錯的安全網

TurboFan 生成的優化機器碼，內部埋了「假設檢查點（deopt guard）」。**一旦執行時真的違反了當初假設的前提**（例如 Type Specialization 假設永遠是 number，結果這次傳進來的是 string），V8 會：

1. **立刻放棄**這份已經在跑的優化機器碼。
2. **退回 Ignition**，改用穩健、不做激進假設的 Bytecode 直譯執行，確保結果正確。
3. 這個函式之後可能會**重新被觀察、重新累積 Profiling Data**，如果情況穩定下來，還是有機會再次被送去 TurboFan 優化（但太頻繁 deopt 的函式，V8 也可能乾脆放棄再嘗試優化它）。

**這解釋了一個常見的效能建議「同一個函式盡量固定傳同一種型別」**：不是因為 JS 語言本身要求型別固定，而是因為型別一直變會不斷觸發 deoptimization，讓 V8 反覆優化又放棄，效能反而比一直用 Ignition 直譯還差。

### 實例：拿掉 return 的無窮迴圈，OSR 實際發生的過程

> 出處：`JavaScript-practicing/smallest-divisible-digit-product.js`，把 `return i;` 拿掉後實測（見 [[JavaScript-字串方法]] 的 `String(i)` 段落）

```js
var smallestNumber = function (n, t) {
    for (let i = n; ; i++) {           // 沒有終止條件
        const digits = String(i).split('');
        const product = digits.reduce((acc, digit) => acc * Number(digit), 1);
        if (product % t === 0) {
            // 拿掉 return i; 之後，這裡什麼都不做
        }
    }
};
```

實測跑起來 5 秒內沒結束，被系統丟到背景程序，之後手動強制終止才停下來。對照上面的管線：

1. **Parse + Ignition 生成 Bytecode**：只做一次，不會每圈重做
2. **Ignition 直譯執行**：逐行跑 `String(i)`→`.split()`→`.reduce()`→`i++`，同時收集 Feedback Vector（`i`、`product` 一直是 number）
3. **迴圈 back-edge 計數超過門檻 → 觸發 OSR**：迴圈還沒結束（沒有 return 可以走出函式），V8 直接在「執行中的這一幀」把 Ignition Bytecode 換成 TurboFan 優化機器碼，不用等函式 return
4. **TurboFan 型別特化**：假設 `i`/`product` 永遠是 number，生出跳過泛用檢查的機器碼——迴圈跑更快，但邏輯上還是同一個沒有終止條件的迴圈，不會自己停
5. **GC 持續回收，但主執行緒被永久佔用**：`digits`/`product` 是短命值，Heap 不會爆掉，但單執行緒的 JS 沒有機會讓出控制權，process／分頁會整個卡死，只能靠外部強制終止（例如手動 kill 該 process）

一句話：**OSR 讓迴圈「跑得更快」，但不會讓迴圈「知道該停」——終止條件永遠得靠程式邏輯自己（`return`／`break`）交代清楚，引擎不會幫你補上。**

## 編譯期 vs 執行期：Creation Phase／Hoisting 算哪一邊？

快速結論（完整版見 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] 的 (f)(g)(h) 三節）：

- **Parse（本篇最上面 Scanner→Parser→AST→Scope Analysis 那段）是編譯期**，對同一個函式只做一次，產出可重複使用的 Bytecode。V8 還會做 lazy parsing：內層函式先由 preparser 略過，第一次被呼叫才完整 parse（細節見上方「Preparser 與 Lazy Parsing」）。
- **Hoisting／參數綁定屬於 Execution Context 的 Creation Phase，是執行期**，函式被呼叫幾次就重做幾次——這跟 Parse 是兩個完全不同時間點的動作，只是 lazy compilation 讓兩者在時間上很靠近，容易被誤以為是同一件事。
- 「編譯」跟「翻譯／直譯」的用詞差異：編譯＝把原始碼轉成另一種可重複執行的表示法（Parse＋Bytecode 產生，一次性）；翻譯／直譯＝真的執行已編譯好的表示法（Ignition 跑 Bytecode，每次呼叫都重來）。

## 逐字保留：Tokenizer → Parser → AST → Bytecode 完整教學（對話逐字稿）

> Abby 要求「一字不漏」保留這段教學問答，故原樣轉錄，不改寫、不精簡。下文的 **Tokenizer** 就是上面 Parse 階段講的 **Scanner／Lexer**，同一件事的三種說法。

以剛剛一直舉的例子：

```js
const str = "Hello World";
```

### 第一步：Tokenizer（詞法分析）

先切成一個個 Token：

```text
const
str
=
"Hello World"
;
```

更精確一點是：

```text
Keyword      const
Identifier   str
Operator     =
String       "Hello World"
Semicolon    ;
```

---

## 第二步：Parser（語法分析）

Parser 看這些 Token 是否符合 JavaScript 文法。

如果符合，就建立 AST（Abstract Syntax Tree）。

概念上會長這樣：

```text
Program
│
└── VariableDeclaration (const)
    │
    └── VariableDeclarator
        ├── id
        │    └── Identifier
        │          name: "str"
        │
        └── init
             └── Literal
                   value: "Hello World"
```

這就是 AST。

---

如果用 JSON 表示（像 Babel Esprima 輸出的格式），大概會像：

```js
{
  type: "Program",
  body: [
    {
      type: "VariableDeclaration",
      kind: "const",
      declarations: [
        {
          type: "VariableDeclarator",
          id: {
            type: "Identifier",
            name: "str"
          },
          init: {
            type: "Literal",
            value: "Hello World"
          }
        }
      ]
    }
  ]
}
```

---

## 再看一個比較有趣的例子

```js
const c = a + b;
```

AST：

```text
Program
│
└── VariableDeclaration
    │
    └── VariableDeclarator
        ├── Identifier(c)
        │
        └── BinaryExpression (+)
             ├── Identifier(a)
             └── Identifier(b)
```

注意：

這裡沒有「字串」。

沒有「加法」。

只有節點(Node)。

每個 Node 都有自己的 type。

例如：

* Program
* VariableDeclaration
* Identifier
* Literal
* BinaryExpression
* CallExpression
* FunctionDeclaration

---

## 再複雜一點

```js
console.log(a + b);
```

AST 概念：

```text
Program
│
└── ExpressionStatement
    │
    └── CallExpression
         │
         ├── callee
         │     └── MemberExpression
         │           ├── Identifier(console)
         │           └── Identifier(log)
         │
         └── arguments
               │
               └── BinaryExpression(+)
                    ├── Identifier(a)
                    └── Identifier(b)
```

---

## 為什麼要 AST？

因為 **Bytecode 並不是直接從原始碼產生的，而是根據 AST 產生的。**

也就是：

```text
JavaScript 原始碼
        │
        ▼
Tokenizer（詞法分析）
        │
        ▼
Token
        │
        ▼
Parser（語法分析）
        │
        ▼
AST（抽象語法樹）
        │
        ▼
Bytecode Generator
        │
        ▼
Bytecode
        │
        ▼
Ignition 執行
```

---

### 面試很容易考的一個問題

> **為什麼叫「抽象」語法樹（Abstract Syntax Tree）？**

因為 **AST 不保留原始碼的所有細節，只保留程式的語意結構。**

例如這兩段：

```js
const a = 1 + 2;
```

```js
const    a=1+2;
```

空格完全不同，但 AST 幾乎是一樣的。

甚至：

```js
(1 + 2)
```

和

```js
1 + 2
```

在很多情況下產生的 AST 也相同。

也就是說，**AST 關心的是「這是一個變數宣告、右邊是一個加法運算」，而不是你用了幾個空白、幾次換行或括號的排版方式。**

這也是 Babel、ESLint、Prettier 等工具都能運作的基礎：它們不是直接修改原始字串，而是先分析成 AST，再根據 AST 進行轉換或檢查。

## Parser 之後如果是 TypeScript／JSX 呢？——Babel 是「轉譯器」（Transpiler）

你的理解是對的：**Parser 拿到 Token 建出 AST 之後，如果原始碼是 TS 或 JSX，就會先被轉譯器處理，把「一種高階語言轉成另一種高階語言」**（TS→JS、JSX→純 JS 函式呼叫），這件事跟 Ignition／TurboFan 那種「高階語言→低階 Bytecode/機器碼」的**編譯（Compile）**是不同層次：

| | 轉譯 Transpile（buildtime 打包期） | 編譯 Compile（runtime 執行期，本篇 Ignition/TurboFan 那段） |
|---|---|---|
| 轉換方向 | 高階語言 → 另一個**同樣高階**的語言（TS→JS、JSX→JS） | 高階語言 → **更低階**的表示法（AST→Bytecode→機器碼） |
| 誰來做 | Babel／`tsc`／SWC，在**建置時（build time）**、瀏覽器與 V8 都還沒看到程式碼之前 | V8 引擎自己，在**執行時（runtime）**，瀏覽器/Node 載入腳本當下 |
| V8 看不看得到轉譯前的原始碼？ | **看不到**——V8 收到的永遠是轉譯完的標準 JS，完全不知道原本寫的是 TSX 還是純 JS | — |

<mark style="background: #FFF3A3A6;">關鍵一點：轉譯發生在 V8 的 Parse 階段之前，而且是在完全不同的地方（建置工具的 Node.js 環境）、完全不同的時間（部署前）做完的</mark>，所以「React 專案」跟「原生 JS 專案」對 V8 來說，最終看到的都是同一種東西——標準 JS，沒有特殊待遇。完整的 Babel／`tsc`／SWC／JSX 轉譯細節見 [[前端開發工具-打包編譯Lint與Parser]] 第 1、5、6 節。

## AST 不管格式，那為什麼還需要 ESLint？

<mark style="background: #FF5582A6;">不是因為 Git diff 看空格</mark>（那是 Prettier 的職責範圍），而是因為 **ESLint 檢查的根本不是格式，是「語意」與「潛在錯誤」**——這兩者剛好都是 AST 才能看到、原始文字看不到的東西：

- ESLint 讀的也是 AST（不是原始字串），它在 AST 節點上做規則比對，抓的是**邏輯層級的問題**：宣告了卻沒用的變數（`no-unused-vars`）、用了未定義的識別碼（`no-undef`）、React Hooks 呼叫順序錯誤（`react-hooks/rules-of-hooks`）、`==` 應該用 `===`……這些都跟「你打了幾個空格」完全無關，AST 本來就不記錄空格，ESLint 也不需要空格資訊就能抓到這些問題。
- **格式（縮排、換行、引號、分號）才是 Prettier 的工作**，而格式化真正的價值確實跟 Git 有關：團隊多人協作時，如果每個人縮排/引號習慣不同，光是重新排版就會讓 `git diff` 充滿雜訊（一行邏輯沒改，卻整段變紅變綠），拖慢 code review。Prettier 統一格式後，diff 才只顯示「真正改了什麼邏輯」。

所以「團隊規定到最後 AST 就沒用了」這個推論反了：**正因為 AST 不管格式，ESLint 才能只抓邏輯錯誤、完全不受個人排版習慣干擾**——格式與邏輯本來就是兩個獨立關注點，AST 讓這個切分變得乾淨（ESLint 管邏輯／Prettier 管格式），不是讓 AST 變得多餘。

## 原生 JS vs React：兩條進場路徑 × Ignition／TurboFan 兩種執行狀態，共 4 張圖

前面「完整流程圖」只畫了 V8 內部（Parse→Ignition→TurboFan→Deopt）一條線，但實務上程式碼進到 V8 之前有兩種不同起點——**原生 JS**（直接是標準 JS，不需要轉譯）vs **React／TSX**（要先經過上面講的 Babel/`tsc` 轉譯）；而進到 V8 之後，同一段程式碼在它的生命週期裡又會經歷**冷路徑（Ignition 直譯，剛開始執行、次數還少）**跟**熱路徑（TurboFan 優化，被判定為 Hot Code 之後）**兩種狀態。兩個維度交叉，共 4 張圖：

### 圖① 原生 JS ×（冷）Ignition 直譯

```mermaid
flowchart LR
    A["原生 JS 原始碼<br/>(例如 &lt;script&gt;const x=1&lt;/script&gt;)"] --> B["直接進 V8<br/>（沒有轉譯這一步）"]
    B --> C["Parse<br/>Scanner→Parser→AST→Scope Analysis"]
    C --> D["Ignition：AST 編成 Bytecode<br/>直譯執行 + 收集 Profiling"]
    D --> E["呼叫次數還沒到門檻<br/>→ 就這樣一路用 Bytecode 直譯跑完"]
```

### 圖② 原生 JS ×（熱）TurboFan 優化

```mermaid
flowchart LR
    A["原生 JS 原始碼"] --> B["直接進 V8"]
    B --> C["Parse"]
    C --> D["Ignition 直譯 + 收集 Profiling"]
    D --> E{"呼叫次數／迴圈次數<br/>超過門檻？"}
    E -- 是 --> F["TurboFan：Escape Analysis／<br/>Inline Caching／Type Specialization"]
    F --> G["生成 Machine Code 執行（極快）"]
    G -- "型別突然改變" --> H["Deoptimization<br/>退回 Ignition"]
```

### 圖③ React／TSX ×（冷）Ignition 直譯

```mermaid
flowchart LR
    A["JSX/TSX 原始碼<br/>(例如 <h1>{count}</h1>)"] --> BT["建置時（build time）<br/>Babel／tsc／SWC 轉譯<br/>(JSX→_jsx(...)、TS→JS)"]
    BT --> B["打包成標準 JS，部署上線<br/>（V8 完全看不到原本是 JSX/TSX）"]
    B --> C["Parse<br/>（跟原生 JS 走一模一樣的路）"]
    C --> D["Ignition 直譯 + 收集 Profiling"]
    D --> E["呼叫次數還沒到門檻<br/>→ 一路用 Bytecode 直譯跑完"]
```

### 圖④ React／TSX ×（熱）TurboFan 優化

```mermaid
flowchart LR
    A["JSX/TSX 原始碼"] --> BT["建置時 Babel／tsc／SWC 轉譯"]
    BT --> B["打包成標準 JS"]
    B --> C["Parse"]
    C --> D["Ignition 直譯 + 收集 Profiling"]
    D --> E{"呼叫次數／迴圈次數<br/>超過門檻？<br/>(例如頻繁 re-render 的元件函式)"}
    E -- 是 --> F["TurboFan 優化"]
    F --> G["Machine Code 執行"]
    G -- "型別突然改變<br/>(例如 props 型別不穩定)" --> H["Deoptimization<br/>退回 Ignition"]
```

**四張圖的關鍵差異，一句話總結**：①②（原生 JS）跟③④（React）唯一的差別，是③④在 Parse 之前多了一段**建置時、V8 管線之外**的轉譯步驟；一旦進了 V8，①③（冷）跟②④（熱）就完全是同一套 Ignition/TurboFan 邏輯，跟程式碼原本是不是 React 完全無關——V8 分不出來、也不在乎。互動版（4 個按鈕切換 + 差異高亮）見同資料夾 `04-V8引擎完整管線-Parse到Deoptimization-【編譯runtime】-互動版.html`。

## 相關筆記
- [[00-前端建構到執行全景地圖]] —— HTML/CSS/JS/React/Vue 各自 build-time→runtime 的總地圖，本篇是 JS run-time 那一列的來源篇
- [[機器碼與bytecode的差異]] —— bytecode／機器碼／JIT 的通用概念（Java/Python 對照）
- [[作用域-scope-global-function-block]] —— Lexical Scope、Parse 階段的基礎討論
- [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] —— Parse（編譯期，一次性）vs Creation/Execution Phase（執行期，每次呼叫都重來）的完整釐清，以及參數綁定如何用這裡的 Scope Analysis 決定放 Stack 還是 Heap Context
- [[前端開發工具-打包編譯Lint與Parser]] —— Babel/tsc/SWC 轉譯細節、ESLint vs Prettier 分工、Node.js 在打包流程中的角色（跟 SSR 是兩件事）
- [[Node-js底層架構-V8-libuv-Bindings與CSR澄清]] —— libuv 到底是什麼、Node.js 完整分層架構、CSR 渲染邏輯在哪執行、純前端會不會用到 Node 專屬 API
- [[陳述式-Statement-vs-表達式-Expression]] —— 上面 AST 逐字稿裡 `ExpressionStatement`、`VariableDeclaration` 這些節點名稱背後的分類邏輯
- [[引擎-Engine-到底是什麼]] —— 「引擎」這個詞的正式定義，以及 Engine／Interpreter／Compiler／Runtime／Host Environment 的名詞辨析

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Bytecode flushing 現行旗標（`flush_bytecode`、`bytecode_old_time = 180` 秒）與 `FlushSFI` 把 BytecodeArray 原地轉成 UncompiledData | https://github.com/v8/v8/blob/main/src/flags/flag-definitions.h 、https://github.com/v8/v8/blob/main/src/heap/mark-compact.cc | 2026-10-06 讀取 main 分支 |
| Preparser、lazy parsing、Variable allocation、PIFE | https://v8.dev/blog/preparser | 發表 2019-04-15，2026-10-06 查證（讀取 v8/v8.dev 倉庫原始檔） |
| Scanner、AST 與 Ignition 的關係 | https://v8.dev/blog/scanner | 發表 2019-03-25，2026-10-06 查證 |
| Bytecode flushing | https://v8.dev/blog/v8-release-74 | 發表 2019-03-22，2026-10-06 查證 |
| Code cache 與磁碟快取 | https://v8.dev/blog/code-caching-for-devs | 發表 2019-04-08，2026-10-06 查證 |
| 「async／defer 為何不一定可行」「CRP 與 critical path 的關係」 | 本篇推論，非官方原文 | 無 |

---

> [!info]- ➡️ 下一篇
> [[01-引擎-Engine-到底是什麼]]——引擎到底是什麼、這篇管線圖裡每一站的主角是誰。
