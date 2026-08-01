---
title: JIT 編譯與 useMemo——CPU 與記憶體的取捨、為什麼會有依賴陣列
type: topic-note
source: Gemini
tags: [gemini, react, usememo, jit, v8, 記憶體, gc, 面試]
related:
  - "[[useMemo-and-render-optimization]]"
sources:
  - https://gemini.google.com/app/456410a7dbd0a9b6
updated: 2026-07-31
---

# JIT 編譯與 useMemo：CPU 與記憶體的取捨

> [!info]- 🔗 跟哪篇筆記有關聯（點開）
> 跟同資料夾的 [[useMemo-and-render-optimization]] 是同一個 Hook、不同切入角度：那篇是「實際專案除錯」（`EventCouponSettingsPage.tsx` 白屏／效能問題的具體修法與 dependency array 選法），這篇是「底層原理」（為什麼要有依賴陣列、useMemo 到底吃不吃 CPU/記憶體、什麼時候會變成記憶體洩漏）。建議兩篇對照看：先看這篇懂原理，再看那篇懂實戰。

## 本篇重點 a–j，共 10 個

## 重點整理

a. <mark style="background: #FFF3A3A6;">JIT（Just-In-Time）不是特定公司或個人開發的技術</mark>，而是隨電腦科學發展成熟的通用概念：在程式**執行時**動態把代碼編譯成機器碼以提升效能。V8、SpiderMonkey（Mozilla）、JavaScriptCore（Apple）都各自實作了自己的 JIT。

b. <mark style="background: #ADCCFFA6;">V8 引擎的 JIT 具體分兩階段</mark>：先由 <mark style="background: #ADCCFFA6;">Ignition</mark>（直譯器）快速掃過並執行程式碼，同時記錄哪些代碼被頻繁執行（熱點）；當某段代碼夠「熱門」，V8 會派出 <mark style="background: #ADCCFFA6;">TurboFan</mark>（優化編譯器）把它一次編譯成高速機器碼。這樣兼顧了啟動速度（Ignition 先跑）與後續執行效能（TurboFan 優化熱點）。

c. <mark style="background: #FFF3A3A6;">為什麼 useMemo 需要依賴陣列</mark>：JS 中變數本質是記憶體位址（Reference）。`useMemo` 的邏輯是「如果依賴的這些變數位址都沒變，就直接用上次存在記憶體裡的 `memoizedValue`」。React 每次渲染時，會拿「現在的依賴值」跟「上一次的依賴值」做<mark style="background: #ADCCFFA6;">淺比較（`Object.is`）</mark>：位址一樣 → 回傳舊值；位址不同 → 重新計算。沒有依賴陣列，React 根本不知道何時該更新，`useMemo` 就完全失去意義。

d. <mark style="background: #FF5582A6;">useMemo 這個 Runtime 機制本身確實吃 CPU、也吃記憶體</mark>，是一種「代價交換（trade-off）」：
   - **CPU 代價**：即使是 `a + b` 這種低成本計算，加上 `useMemo` 之後，Runtime 每次都要多做「比較依賴項位址」+「讀取記憶體中舊結果」這兩個動作。<mark style="background: #FF5582A6;">如果計算成本 < 檢查成本，這就是反效果</mark>——濫用 `useMemo` 反而更慢。
   - **記憶體代價**：`memoizedValue` 必須佔用實際記憶體空間。到處濫用等於把記憶體塞滿無用的「舊結果」，增加瀏覽器 GC（垃圾回收）掃描壓力。

e. <mark style="background: #FFF3A3A6;">為什麼保留下來的東西叫「舊結果」</mark>：當依賴項改變、React 重新計算並把新結果覆蓋進「記憶體置物櫃」時，原本那個舊結果若已無人引用，會被 GC 清除；但如果還有殘留引用（例如被 `useRef` 存起來、或被閉包偷偷抓著），這個舊結果就會永遠卡在記憶體裡，變成典型的<mark style="background: #FF5582A6;">記憶體洩漏（Memory Leak）</mark>。

f. <mark style="background: #ADCCFFA6;">GC 壓力從哪來</mark>：如果在每個簡單變數都套用 `useMemo`，每次渲染都在產生新的計算結果與新的記憶體位址；GC 必須不停掃描「這幾千個舊結果，哪些真的沒用了、哪些還有人在用」，這種持續掃描記憶體的過程非常耗時——這正是「濫用 useMemo 反而讓網頁卡頓」的根因。

g. <mark style="background: #FFF3A3A6;">React 為什麼要把計算結果「關在記憶體裡」</mark>：React 的核心是「畫面同步」，狀態改變就重新執行整個元件函式（Re-render）。沒有 `useMemo` 時，函式內所有變數都在這次 Render 結束、隨作用域結束被 GC 自動清除；用了 `useMemo`，等於告訴 React「幫我記住這塊結果，不要隨這次 Render 結束丟掉」——React 透過 <mark style="background: #ADCCFFA6;">Fiber Node</mark>（元件的內部狀態儲存結構）把這個結果綁定在該元件的生命週期裡。

h. <mark style="background: #BBFABBA6;">什麼時候才會真正回收</mark>：取決於「元件的生死」——元件被 Unmount（從畫面移除、或條件渲染不再成立）時，React 丟棄對該計算結果的引用；此後只要程式碼裡沒有其他變數（全域變數、閉包）還抓著它，V8 的垃圾回收器才會在下一次掃描時真正清除。

i. <mark style="background: #FFF3A3A6;">一般函式的變數，每次重新 Render 後都會重新建立</mark，這是 React 的預設行為，也是安全性來源：函式內宣告的變數（如 `const list = [1,2,3]`）分配在 Stack Frame，這次渲染結束該空間就被回收，下次渲染重新宣告會拿到全新記憶體位址（`[] === []` 為 `false`）。這保證每次渲染拿到的都是最新狀態，不會有舊資料殘留；但也導致子元件會因為「傳進來的東西位址變了」而被迫重新渲染——這正是需要 `useMemo`／`useCallback` 的原因：打破重新建立循環、強行保留上一次的位址。現代 JS 引擎把這種「用完即丟」的短命變數放在 <mark style="background: #ADCCFFA6;">Young Generation（新生代記憶體）</mark>，回收速度極快，幾乎不影響效能，所以真正該擔心的是「執行了太複雜的計算」，而不是「變數重新建立」本身。

j. <mark style="background: #D2B3FFA6;">核心判斷準則</mark>：只有當運算重到會卡住主執行緒、導致掉幀（FPS 下降）時，才考慮用 `useMemo` 讓 CPU 休息——不是每個變數都要背「useMemo 規則」，而是工程上的取捨判斷。與 [[useMemo-and-render-optimization]] 裡「大量 orders 的 flatMap+sort+建 Map」正是符合這個判斷準則的實戰案例。

## 各對話來源

### JIT 與 useMemo 記憶體/CPU 取捨（2026-07-31）— https://gemini.google.com/app/456410a7dbd0a9b6

（此對話開頭有數句語音輸入辨識雜訊/閒聊，以下摘錄技術問答部分）

使用者：JIT 是誰開發的？如何在 V8 引擎中運作？／為什麼 useMemo 會有相依變數依賴陣列呢？大部分 useMemo 的結果都會複製給 memoizedValue，只有依賴項改變才重新計算，這個 runtime 也吃 CPU 跟記憶體嗎？／如果到處濫用 useMemo，等於把記憶體塞滿無用的舊結果，為什麼是「舊結果」？／React 為什麼會把計算結果關在記憶體？什麼時候才會回收？為什麼關在記憶體裡會翻譯成洩漏？／沒有 useMemo，函式裡的變數是不是每次重新 render 後都會再重新建立？

Gemini：JIT 是通用電腦科學技術，V8 用 Ignition（直譯器）+ TurboFan（優化編譯器）兩階段實作；useMemo 依賴陣列的本質是比較變數位址（淺比較），位址不變才回傳舊值；useMemo 本身是 CPU 與記憶體的代價交換，濫用會增加 GC 掃描壓力；「舊結果」指仍被殘留引用卡在記憶體裡、無法被 GC 清除的計算結果（即記憶體洩漏）；React 透過 Fiber Node 把 memoized 值綁定元件生命週期，元件 Unmount 且無其他引用時才會真正回收；一般函式變數每次 Render 都重新建立，分配在 Stack Frame，現代引擎用 Young Generation 讓這類短命變數回收極快，只有計算真的很重時才需要 useMemo 介入。