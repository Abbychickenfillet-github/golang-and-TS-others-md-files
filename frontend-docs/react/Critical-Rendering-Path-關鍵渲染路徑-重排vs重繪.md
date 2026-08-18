---
title: "Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪"
type: concept
tags: [css, rendering, blink, fiber, react, JS_Core_and_Runtime]
aliases: [Critical-Rendering-Path, CRP, 關鍵渲染路徑]
related:
  - "[[React-純函數與嚴格模式-StrictMode]]"
  - "[[01-引擎-Engine-到底是什麼]]"
  - "[[樂觀更新-Optimistic-Update]]"
updated: 2026-08-14
---

# Critical Rendering Path（關鍵渲染路徑）＋ 重排 vs 重繪

> 同資料夾配對檔：
> - `Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪.html` — 互動筆記（流程動畫／填空／是非／申論）
> - `Critical-Rendering-Path-reflow-repaint-demo.html` — 開 F12 → Performance 親手驗證重排/重繪的 demo

## 一句話
把字串（HTML/CSS/JS）變成像素（畫面）的最短關鍵流程。優化它＝畫面更快出現（FCP / LCP）。

## 六大步驟
1. **DOM** — 解析 HTML
2. **CSSOM** — 解析 CSS（渲染阻塞資源）
3. **Render Tree** — DOM ＋ CSSOM，只留可見節點（`display:none` 不進，`visibility:hidden` 會進）
4. **Layout / Reflow（重排）** — 算幾何：位置、寬高
5. **Paint / Repaint（重繪）** — 填像素：顏色、邊框、陰影
6. **Composite（合成）** — 圖層疊合，常由 GPU 處理

## ⭐ 重排 vs 重繪，誰先？
**重排（Reflow）先，重繪（Repaint）後**（Layout → Paint）。
- 先決定「東西在哪、多大」（重排），才能「在那塗顏色」（重繪）。
- **重排一定引發重繪；重繪不一定引發重排** → 重排成本更高，優先避免。

| | 重排 Reflow | 重繪 Repaint |
|---|---|---|
| 改什麼 | 幾何（位置/大小） | 外觀（顏色/陰影） |
| 順序 | 先 | 後 |
| 連帶 | 必引發重繪 | 不引發重排 |
| 成本 | 高 | 較低 |

## 優化重點
- 批次改樣式（切 class / 一次 cssText）
- **讀寫分離**，避免 layout thrashing（強制同步重排）
- 離線操作：`DocumentFragment` / 先 `display:none`
- 動畫用 `transform` + `opacity` → 只走 Composite，跳過重排重繪
- 動畫排程用 `requestAnimationFrame`

## 追問：CSS→CSSOM→CSS Parse→style calculation→reflow/layout→repaint→compositing，這個順序對嗎

<mark style="background: #FF5582A6;">「reflow等於layout」這點是對的，兩個是同一個步驟的兩種叫法（Reflow是比較舊、Firefox系偏好的用詞，Layout是Chromium/現代規格偏好的用詞）。但「CSS→CSSOM→CSS Parse」這段順序反了——CSSOM是CSS Parse跑完之後的**產出**，不可能出現在CSS Parse前面。</mark>

正確順序應該是：

```
CSS原始文字 → CSS Parse（解析） → CSSOM（解析完的樹狀結構）
                                        ↓
DOM ─────────────────────────────────→ Style Calculation（計算每個節點最終套用的樣式）
                                        ↓
                                    Layout / Reflow（算幾何：位置、寬高）
                                        ↓
                                    Paint / Repaint（填像素：顏色、邊框）
                                        ↓
                                    Composite（圖層合成，常GPU處理）
```

a. <mark style="background: #FFF3A3A6;">CSS Parse跟CSSOM的關係，跟(六大步驟)裡「DOM」這一步是同一種模式</mark>——「解析HTML」這個動作的產出就是DOM樹，「解析CSS」（CSS Parse）這個動作的產出就是CSSOM樹，動作在前、產出在後，不會反過來。上面(六大步驟)清單裡寫的「2. CSSOM — 解析CSS」其實是把「解析」這個動作跟「CSSOM」這個產出寫在同一條，是精簡過的寫法，沒有把兩者拆成獨立的兩步，妳這次問的順序等於是把這條展開成更細的兩步，展開後順序要對。
b. <mark style="background: #FFF3A3A6;">Style Calculation對應到(六大步驟)裡的哪一步</mark>——妳提到的「style calculation」，其實就是(六大步驟)第3步「Render Tree」在做的事：把DOM節點跟CSSOM規則對起來，算出每個節點最終該套用哪些樣式（也常被叫做「Recalculate Style」）。這篇筆記原本用「Render Tree」這個詞概括這一步，妳這次問法用「style calculation」這個更技術性的名字拆出來講，指的是同一件事，只是切分粒度不同——細的六步版本可以看成：DOM解析、CSS Parse產出CSSOM、Style Calculation（＝原本的Render Tree構建）、Layout、Paint、Composite。

一句話：<mark style="background: #FF5582A6;">CSS Parse在前、CSSOM是它的產出物在後；Style Calculation就是拿DOM跟CSSOM對照算出最終樣式，等於這篇筆記(六大步驟)裡的Render Tree那一步，只是拆得更細；reflow跟layout是同一步的新舊叫法，這點妳原本的理解是對的。</mark>

## 追問：CSSOM這棵樹長怎樣——幫我畫出來、這段該收在這篇還是css資料夾底下

![[CSSOM樹狀結構圖_CSSStyleSheet-CSSRuleList-CSSMediaRule_2026-08-14.svg]]

<mark style="background: #FF5582A6;">CSSOM的樹狀結構跟妳想像中「每個HTML節點對應一份樣式」的樹不一樣——它的形狀完全跟著CSS原始碼怎麼寫走，頂層絕大部分是「平的」，只有`@media`／`@supports`這類條件式規則才會真的往下再包一層。</mark>

a. <mark style="background: #FFF3A3A6;">樹的最頂端是`CSSStyleSheet`</mark>——瀏覽器每解析完一份CSS（一個`<link>`或`<style>`），就會產生一個`CSSStyleSheet`物件，在瀏覽器console打`document.styleSheets[0]`就能拿到它，這是整棵CSSOM的根。
b. <mark style="background: #FFF3A3A6;">往下一層是`.cssRules`，型別是`CSSRuleList`，這是一份「依CSS原始碼書寫順序排列的清單」，不是像DOM那樣每個節點都有任意多個子節點的parent-child樹</mark>——清單裡每一項是一個`CSSRule`的子類型，最常見的是`CSSStyleRule`（一般的選擇器規則，例如`body { color: black }`），它身上有`.selectorText`（存選擇器字串，例如`"body"`）跟`.style`（`CSSStyleDeclaration`，存實際的屬性值）兩個屬性。
c. <mark style="background: #FFF3A3A6;">整棵CSSOM裡唯一真正產生「樹狀深度」的地方，是`@media`／`@supports`這類條件式規則對應的`CSSMediaRule`</mark>——它除了跟`CSSStyleRule`一樣是`.cssRules`清單裡的一項，自己身上「也另外掛了一份`.cssRules`」，裡面巢狀放著被這個條件包住的規則（圖裡`[2][0]`那個紅框）。這是整份CSSOM裡唯一真的往下多長一層的地方，其餘規則不管清單裡有幾條，彼此都是平行關係，不會互相巢狀。
d. <mark style="background: #FFF3A3A6;">這跟上面「追問：CSS→CSSOM...」那節提到的Style Calculation是兩回事，容易被搞混成同一棵樹</mark>——Style Calculation的輸出是「每一個DOM節點，最終套用了哪些樣式」，形狀跟著**DOM樹**走，每個DOM節點對應一份computed style；這裡畫的CSSOM，形狀跟著**CSS原始碼規則**走，是`CSSStyleSheet → CSSRuleList → CSSRule`這條物件模型，兩棵樹的節點意義完全不同——CSSOM是「規則書」，Style Calculation的輸出才是「查表查完的結果」，查表這個動作本身才是Style Calculation在做的事。

一句話：<mark style="background: #FF5582A6;">CSSOM＝`CSSStyleSheet`底下掛一份依原始碼順序排列的規則清單，只有`@media`／`@supports`會讓某一條規則自己再多包一層清單，除此之外整棵樹幾乎是平的；它跟「每個DOM節點最終套用什麼樣式」的Style Calculation輸出是完全不同的兩棵樹，前者形狀跟CSS規則走、後者形狀跟DOM走。</mark>

### 這段內容該收在這篇還是`css/`資料夾——我的意見

我會把完整內容留在這篇（CRP筆記），`css/`資料夾只放一條指標連過來，不重複貼一份，理由：

- `css/`資料夾的定位（見[[00-CSS觀念複習地圖與資料夾索引]]開頭寫的目的）是「CSS觀念複習順序的地圖」，收的是選擇器、盒模型、BEM/OOCSS/ITCSS這類**CSS語言本身的語法與寫法規範**，是妳在寫CSS時會直接用到的知識。
- CSSOM不是CSS語言的語法，是瀏覽器引擎解析完CSS之後、在記憶體裡建出來的一份**內部物件模型**，跟DOM是同一個等級的東西——兩者都是引擎內部的資料結構，不是妳寫程式碼時會直接操作的CSS語法本身，比較接近[[01-引擎-Engine-到底是什麼]]、[[React-純函數與嚴格模式-StrictMode]]這類講「引擎內部怎麼運作」的筆記脈絡。
- 這篇CRP筆記本身就是在講「瀏覽器引擎怎麼把CSS/HTML/JS變成畫面」這整條內部流程，CSSOM原本就是六大步驟裡的一步，放在這裡不需要額外鋪陳背景；`css/`資料夾如果收了這段，還得另外解釋「這其實是引擎概念、不是CSS語法」才看得懂，會打斷那個資料夾原本「複習CSS語言」的閱讀節奏。

所以`css/`資料夾那邊我只加一條指標，指回這節，並註明「CSSOM是引擎內部概念、不是CSS語法本身，完整內容收在CRP筆記」這個理由。

## 追問：React的Fiber有完全取代Blink的功能嗎

<mark style="background: #FF5582A6;">沒有，這是兩個完全不同層次的東西，Fiber一步都插不進(六大步驟)這條流程裡——這正好是[[01-引擎-Engine-到底是什麼]]那篇講過的「DOM是Blink的、不是V8的」同一個原則，換成React的場景再驗證一次。</mark>

a. <mark style="background: #FFF3A3A6;">Fiber是誰、活在哪一層</mark>——Fiber（詳見[[React-純函數與嚴格模式-StrictMode#Fiber 樹是什麼（簡答）]]）是React自己在JS這一層維護的一份資料結構，用來描述「整個元件樹現在長怎樣、需要改成怎樣」，目的是讓React算「畫面該怎麼變」這個計算過程可以被中斷、恢復、排優先權。Fiber從頭到尾都只是**JS物件**，在V8引擎裡被建立、比對、遍歷，運算過程完全不會去碰CSS Parse、Layout、Paint這些步驟——因為那些步驟根本不是JS能直接執行的東西，是Blink這個C++寫的渲染引擎內部的機制，JS沒有能力直接插手。
b. <mark style="background: #FFF3A3A6;">Fiber實際上做完事之後，交棒給誰</mark>——React用Fiber算出「這次更新，DOM實際上該增加/刪除/修改哪些節點」之後，進入所謂的「Commit階段」，這時候React才會呼叫真正的瀏覽器DOM API（`appendChild`、`setAttribute`、`removeChild`這類，本質上都是Blink提供的Web API），把這些變更實際套用到真正的DOM樹上。**從這一刻起，接下來要不要重新跑Style Calculation、要不要Layout、要不要Repaint，完全是Blink自己的判斷跟工作**，不受React控制，React連知道都不見得能精準知道。這也是為什麼(六大步驟)這整條CRP流程圖裡完全不會出現「Fiber」這個詞——它是流程開始之前、瀏覽器都還沒收到DOM變更請求時，React自己內部先算好「要改哪裡」的準備工作，不是CRP流程的一部分。
c. <mark style="background: #ADCCFFA6;">所以「取代」這個詞不成立</mark>——Fiber取代的是React自己舊版的Stack Reconciler（另一套JS層的演算法，一樣是「算出DOM該怎麼變」，只是不能中斷），Fiber跟Stack Reconciler是同一層的競爭者／後繼者關係。但Blink的CSS Parse／CSSOM／Style Calculation／Layout／Paint／Composite這整條CRP流程，是瀏覽器C++層的真正渲染機制，Fiber連要不要參與這條流程的決定權都沒有，更談不上取代——就像[[01-引擎-Engine-到底是什麼]]講的，V8（含它裡面跑的React/Fiber）跟Blink是透過C++ Bindings協作的兩個獨立引擎，各自負責的事完全不重疊。
d. <mark style="background: #FFF3A3A6;">追問：`commitLayoutEffectOnFiber`是什麼——這就是妳在偵錯log裡一直看到的那個</mark>——這是React原始碼（`react-dom.development.js`）裡一個真實存在的內部函式名稱，屬於(b)講的「Commit階段」的其中一步：`Commit`階段本身又切成幾個子階段，其中一個叫「Layout」子階段（跟(六大步驟)的Layout是不同東西，只是恰好同名——React內部把「DOM變更套用完、瀏覽器還沒畫面前，同步執行`useLayoutEffect`」這件事，取名叫Layout子階段），`commitLayoutEffectOnFiber`就是這個子階段裡，針對某一個特定Fiber節點、執行它身上掛的`useLayoutEffect`回呼函式的那個函式。妳在錯誤log裡反覆看到它，代表當時的呼叫堆疊（Call Stack）正好停在「React正在幫某個元件跑`useLayoutEffect`」這一步，是React內部機制正常運作的一部分，本身不是bug，只是剛好被印進了錯誤堆疊裡當作定位線索。

## 關聯筆記
- [[React-Context-Provider消費者-AuthProvider與路由保護]]
- [[樂觀更新-Optimistic-Update]]
- [[lazy-loading-vs-tab-badge]]
- [[useMemo-return]]
- [[React-純函數與嚴格模式-StrictMode]]（Fiber樹的完整定義）
- [[01-引擎-Engine-到底是什麼]]（DOM歸Blink管、不歸V8管的原則）
- [[../web-platform/|web-platform 筆記區]]
- [[../前端開發工具-打包編譯Lint與Parser|前端開發工具：打包/編譯/Lint/Parser]]

## Obsidian 小撇步
- 用 **HTML Reader** 外掛直接在筆記裡看 `.html` 互動版
- 用 **Highlightr** 標重點（重排先、重繪後）
- 流程圖可用 **Excalidraw**：CSS Parse→CSSOM→（＋DOM）→Style Calculation→Layout→Paint→Composite

---
來源對照：對照了 ChatGPT 匯出資料（其中於 `requestAnimationFrame` 脈絡曾提到 repaint），補齊完整 CRP 與重排/重繪順序；Fiber vs Blink 分工、`commitLayoutEffectOnFiber`說明為本次（2026-08-14）對話整理，來源為React官方原始碼公開行為與既有[[React-純函數與嚴格模式-StrictMode]]筆記內容比對。
