---
title: CPU 五大單元、暫存器、快取與微指令
type: topic-note
source: Gemini
tags: [gemini, 計算機組織, CPU, cache, 微指令, 硬體預取]
sources:
  - https://gemini.google.com/app/53fafdc04065f2d9
updated: 2026-07-20
---

# CPU 五大單元、暫存器、快取與微指令

相關筆記：[[CPU與主記憶體-為何加RAM會變快]]、[[../記憶體最小定址單位 (Byte Addressability)]]

## 重點整理

(a) 電腦硬體傳統五大單元：輸入單元、輸出單元、<mark style="background: #ADCCFFA6;">記憶單元</mark>（儲存資料）、<mark style="background: #ADCCFFA6;">算術邏輯單元 ALU</mark>（負責運算）、<mark style="background: #ADCCFFA6;">控制單元 CU</mark>（指揮整個電腦運作）。

(b) 對應到程式執行：<mark style="background: #BBFABBA6;">ALU 負責加減乘除、比較（如 `score > 60`）等實際數學/邏輯運算</mark>；<mark style="background: #BBFABBA6;">CU 負責解讀機器碼指令並決定流程跳轉</mark>（如 `if` 判斷成立與否，決定要不要進入大括號 `{}`）。CU 並不親自算數學，而是像總指揮：告訴記憶體何時把資料交出來、告訴 ALU 何時開始算。

(c) CU 決定要不要執行某段程式碼前，必須先取得判斷所需的變數值，順序為：CU 發出讀取指令 → 值被搬進暫存器 → CU 叫 ALU 拿暫存器裡的值做比較 → ALU 把結果（True/False）寫入狀態暫存器 → CU 依結果決定跳轉或往下執行。

(d) CPU 內部也有自己的記憶體，且速度遠快於主記憶體（RAM）：<mark style="background: #ADCCFFA6;">暫存器 Register</mark>（最快，容量僅幾十個位元組，直接跟 ALU/CU 相連，如同廚師手邊的調味料架）與<mark style="background: #ADCCFFA6;">快取記憶體 Cache（L1/L2/L3）</mark>（比暫存器稍慢但容量大一些，如同備料冰箱）。速度階層由快到慢：暫存器 → L1/L2/L3 Cache → 主記憶體 RAM（Heap 所在位置）→ 硬碟/SSD。

(e) <mark style="background: #FFB8EBA6;">CPU 記憶體命名澄清</mark>：不是叫 MU（Memory Unit，那是廣義學術分類，泛指含主記憶體與輔助儲存），CPU 內部實際稱為 Cache（快取）與 Register（暫存器，簡稱 Regs）。

(f) <mark style="background: #ADCCFFA6;">Cache Memory 屬於 CPU 的一部分</mark>——L1/L2/L3 快取物理上就刻在 CPU 晶片（同一片矽晶圓）裡。

(g) 北橋/南橋去哪了？現代 CPU 已經把<mark style="background: #FFB8EBA6;">北橋（記憶體控制器、PCIe 控制器）整合進 CPU 內部</mark>，南橋仍存在主機板上但改名為 Intel 的 PCH（Platform Controller Hub）或 AMD 的 Chipset。這是因為 CPU 速度太快，資料繞去外部北橋再到記憶體會造成延遲，直接整合可省去這段路徑。

(h) 發熱分佈：五大單元都會發熱（電晶體開關切換 Switching Loss 產生電阻熱能），但 <mark style="background: #FF5582A6;">ALU 是發熱大戶</mark>（做密集數學運算，電晶體以 GHz 級速度瘋狂切換）；記憶單元（Cache/Registers）中度發熱；CU 相對輕度到中度發熱（電路邏輯較固定，不像 ALU 做大量乘法/浮點運算）。

(i) <mark style="background: #ADCCFFA6;">CPU 快取與 Redis 的血緣關係</mark>：兩者設計哲學完全相同——都是為了解決「快的組件在等慢的組件」的問題（CPU 快 vs RAM 慢；應用程式快 vs MySQL 慢），差別是 CPU 快取由硬體自動管理、Redis 由工程師手動寫程式控制。CPU 快取甚至會幫 Redis 這類軟體加速：當 CPU 執行 Redis 程式碼查資料時，Redis 存在 RAM 裡的熱門資料也會被載入 CPU 的 L1/L2/L3 快取。

(j) <mark style="background: #D2B3FFA6;">微指令（Microcode）</mark>是連接「機器碼（軟體）」與「暫存器/ALU（硬體）」之間最底層的橋樑，本質是刻在 CPU 內部一塊唯讀「控制記憶體（Control Store）」裡的超底層微型程式碼。一條看似簡單的機器碼（如 `ADD`、`MUL`）會被 CU 內部的微程式控制器拆解成好幾條微指令，每條只做「搬移資料」「啟動 ALU 運算」「發出開關訊號」這類極度單純的動作——微指令的「方法」種類非常少，複雜運算（如乘除法）都要拆成一連串加法與位移拼湊完成。設計成如此簡單是為了對應硬體電路開關，換取極速反應。

(k) <mark style="background: #BBFABBA6;">硬體預取器（Hardware Prefetcher）</mark>是快取記憶體能「預測」接下來要用什麼資料的關鍵，屬於 CPU 內部的模式識別電路，跟微指令無關（微指令是最後才執行的「執行者」，不做預測）。運作原理：偵測到連續出現規律的記憶體位址跳躍模式（stride，如陣列迴圈依序存取），會主動把後續資料先搬進快取。啟動門檻是**至少兩次快取錯失（cache miss）**才會觸發，避免隨機記憶體存取（如讀全域變數）浪費頻寬。

(l) 快取命中率高的另兩條物理鐵律（Locality of Reference）：<mark style="background: #BBFABBA6;">空間局部性</mark>（存取某位址時，通常會整批搬入該位址所在的一整個 Cache Line／約 64 bytes 的鄰居資料）與<mark style="background: #BBFABBA6;">時間局部性</mark>（剛用過的資料很快會再被用到，因此留在最快的 L1）。

(m) ⚠️ 存疑/更正：Gemini 提及「若跨分頁邊界會導致預取失效」等細節引自 Ulrich Drepper 經典文章《What Every Programmer Should Know About Memory》，內容本身可信，但該文章是 2007 年基於當時 x86/FSB 架構寫成，部分硬體細節（如 FSB 頻寬瓶頸的描述）在現代 CPU（已無獨立北橋、改用 Ring Bus/Mesh 互聯）上已有變化，僅供概念理解，不宜當作現代硬體的精確規格引用。

## 各對話來源

### 電腦硬體五大單元簡化說明（2026-07-20）— https://gemini.google.com/app/53fafdc04065f2d9
使用者：除了輸入輸出以外，記憶跟什麼？
Gemini：記憶單元、算術邏輯單元、控制單元。

使用者：幫我把算術邏輯單元跟控制單元連接到 JavaScript 的 heap 概念還有機器碼的概念
Gemini：ALU/CU 直接執行機器碼；機器碼是 JS 編譯/直譯後的結果；CPU 執行機器碼時操作記憶體資料，JS Heap 是動態配置物件的地方。

使用者：那算數邏輯單元負責做什麼，加減法嗎？控制單元是做大括號內的內容嗎？
Gemini：ALU 負責運算與比較；CU 負責決定要不要跳轉進大括號，並用 if/else 範例逐步說明 CU→ALU→Heap 的協作流程。

使用者：CPU的記憶單元也是有記憶體嗎
Gemini：有，分為暫存器（Register，最快最小）與快取記憶體（Cache L1/L2/L3，稍慢但容量較大），並用記憶體家族速度/容量表對照 JS Heap 位置。

使用者：CPU內的記憶體縮寫叫什麼？MU? 暫存器英文叫什麼？橋接器北橋南橋還有嗎？CU是負責決定要不要進去執行那個大括號，那就會先得到變數的值對嗎？CU是執行的地方所以發熱也是它在發熱嗎？還是五大單元都會發熱？Cache Memory是算CPU的嗎
Gemini：逐一回答：不是 MU（是 Cache/Register）；北橋已被 CPU 吞併，南橋改名 PCH/Chipset；CU 需先取值才能判斷；五大單元都發熱但 ALU 是大戶；Cache Memory 算 CPU 的一部分。

使用者：CPU的快取記憶體跟Redis有關係對嗎
Gemini：兩者都是「快取」設計哲學的體現，CPU 快取硬體自動管理、Redis 軟體工程師手動控制，且 CPU 快取本身也在幫 Redis 加速執行。

使用者：微指令跟Registers還有alu有關係嗎，微指令集是程式碼還是硬體阿
Gemini：微指令是刻在晶片唯讀控制記憶體裡的超底層微型程式碼，用來操控暫存器與 ALU 的開關訊號，並以 `ADD A, B` 為例拆解成四條微指令的執行順序。

使用者：為什麼快取記憶體可以預先猜測得到接下來可能會用哪些資料？有誰給他打暗號嗎譬如微指令集
Gemini：真正的「暗號」來自硬體預取器（Hardware Prefetcher）的規律偵測（stride prefetching），以及空間局部性/時間局部性兩條鐵律；微指令只是最後執行的環節，不負責預測。

使用者：你說微指令是未讀，但他是只有很簡單的加法減法或移除而已嗎？他不能有複雜的程式碼欸，他是不是方法很少啊？
Gemini：確認微指令方法確實很少（搬移資料/啟動運算/發出控制訊號），複雜運算靠這些簡單動作大量組合（Micro-program）拼湊完成，追求電路對應的極速反應。

使用者：貼上 Ulrich Drepper 文章關於硬體預取的段落，並詢問是否要兩次快取失誤才召喚預取器、以及「誰會識別」
Gemini：確認需至少兩次 cache miss 才觸發硬體預取，識別模式的是與各快取相關聯的「模式識別電路」，並補充 MUL 指令定義、完整 CPU 執行流程圖、暫存器與快取如何互動。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/53fafdc04065f2d9 | 2026-07-20 查證 |
| 硬體預取/局部性原理背景文章（Ulrich Drepper, What Every Programmer Should Know About Memory） | https://people.freebsd.org/~lstewart/articles/cpumemory.pdf | 2007 年文章，架構細節已隨硬體演進部分過時，2026-07-20 查證 |
