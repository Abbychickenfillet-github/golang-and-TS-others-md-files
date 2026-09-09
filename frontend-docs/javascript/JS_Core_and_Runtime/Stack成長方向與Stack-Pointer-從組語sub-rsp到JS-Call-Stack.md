---
title: Stack 成長方向與 Stack Pointer——從組語 sub rsp 到 JS Call Stack
type: topic-note
source: Gemini
category: tech
tags: [gemini, javascript, memory, stack, heap, assembly, x86-64, v8, JS_Core_and_Runtime]
aliases: [Stack成長方向與Stack-Pointer, sub-rsp, SP-BP-堆疊指標]
related:
  - "[[11-記憶體模型-stack-heap-動態配置-GC]]"
  - "[[12-return-清理記憶體-stack-frame與閉包例外]]"
  - "[[10-傳值vs傳址-賦值與記憶體空間]]"
  - "[[13-閉包-Closure-私有變數與傳址陷阱]]"
  - "[[V8引擎完整管線-Parse到Deoptimization]]"
sources:
  - https://gemini.google.com/app/f7617167b4e575f0
  - https://gemini.google.com/app/ee32b7031e14ab15
  - https://gemini.google.com/app/48e3fda16e0ce8ed
updated: 2026-09-09
---

# Stack 成長方向與 Stack Pointer——從組語 sub rsp 到 JS Call Stack

> [!info]- 📍 這篇在整條學習線的哪裡
> <mark style="background: #ADCCFFA6;">承接</mark>：[[11-記憶體模型-stack-heap-動態配置-GC]] 講完「Stack 歸引擎自動 pop、Heap 歸 GC」的分工，但沒有解釋 Stack 在實體記憶體裡「往哪個方向長」。
> <mark style="background: #ADCCFFA6;">承接</mark>：[[12-return-清理記憶體-stack-frame與閉包例外]] 裡那張 ![[學習JS_圖解_Stack位址與SP-BP_2026-07-29.svg]] 已經畫出 SP／BP 的相對位置；這篇是「指回那張圖」再往下鑽一層，補上組語層的 `sub rsp`。
> <mark style="background: #BBFABBA6;">下一步</mark>：知道 Stack Frame 怎麼配置之後，[[13-閉包-Closure-私有變數與傳址陷阱]] 講為什麼閉包變數逃得掉 pop。

> 本篇重點 (a)–(r)，共 18 個。

---

## 縮寫先攤開：SP、BP、rsp、rbp 到底是什麼

> [!important]+ 縮寫不先講清楚，後面全部會卡住
> a. <mark style="background: #ADCCFFA6;">SP＝Stack Pointer（堆疊指標）</mark>。一個 CPU 暫存器，永遠指著「堆疊目前的頂端在哪個記憶體位址」。x86-64 上它的名字叫 `rsp`（r＝register、s＝stack、p＝pointer；32 位元時代叫 `esp`）。
> b. <mark style="background: #ADCCFFA6;">BP＝Base Pointer（基底指標，又叫 Frame Pointer 框架指標）</mark>。也是暫存器，指著「目前這個函式的 Stack Frame 從哪裡開始」。x86-64 上叫 `rbp`。有了固定的 BP，函式內部就能用 `[rbp-4]`、`[rbp-8]` 這種固定偏移量去存取自己的區域變數，不必管 SP 這段期間又動了幾次。
> c. <mark style="background: #ADCCFFA6;">ISA＝Instruction Set Architecture（指令集架構）</mark>。CPU 對外公開的「你可以下哪些指令、有哪些暫存器」這份合約。x86-64（又稱 AMD64）、ARM64、RISC-V 都是不同的 ISA。本篇的 `rsp`／`rbp`／`sub` 都是 <mark style="background: #FFF3A3A6;">x86-64 這個 ISA 的東西</mark>，換到 ARM64 名字就不一樣了。
> d. <mark style="background: #D2B3FFA6;">ABI＝Application Binary Interface（應用程式二進位介面）</mark>。比 ISA 更上一層的約定：參數用哪些暫存器傳、堆疊要怎麼對齊、誰負責清理。Linux／macOS 用的是 System V AMD64 ABI，Windows 用的是另一套。

---

## 一、Abby 原本的疑問：「減了 4，位址卻變大？」

這是三段對話裡最核心、也最值得記住的一次卡關。

| 你以為 | 實際上 |
|---|---|
| `sub rsp, 4` 讓位址減 4，所以下一行位址應該變小 | 你在看的那一欄根本不是 rsp，是<mark style="background: #FF5582A6;">指令自己住的位址</mark> |
| 0x0024 → 0x0028 是「堆疊往上長」 | 0x0028 是<mark style="background: #BBFABBA6;">下一道指令的位址</mark>，差 4 是因為 sub 這道指令的機器碼佔 4 bytes |

> [!warning]+ 關鍵：反組譯畫面上其實有「兩條互不相干的位址軸」
> e. <mark style="background: #FFF3A3A6;">軸一是指令位址（Code Segment）</mark>——反組譯最左邊那一欄。程式碼是由上往下擺的，所以往下讀，位址一定<mark style="background: #BBFABBA6;">遞增</mark>。相鄰兩行的差值＝上一道指令的機器碼長度。
> f. <mark style="background: #FFF3A3A6;">軸二是堆疊位址（Stack Segment）</mark>——`rsp` 指的地方。這條軸<mark style="background: #FF5582A6;">往低位址成長</mark>，所以配置空間要用 `sub`。
> g. 兩條軸都用十六進位、都叫「位址」，但一個在問「下一道指令在哪」，另一個在問「我的區域變數放哪」。<mark style="background: #FF5582A6;">用同一把尺去量就必錯</mark>。
> h. 這次的巧合特別壞心：運算元剛好是 4，指令長度也剛好是 4，兩個 4 一撞在一起就完全分不出誰是誰。

![[學習組語_圖解_指令位址軸vs堆疊位址軸-兩條不要搞混的軸_2026-09-09.svg]]

---

## 二、為什麼是 sub 而不是 add

> [!note]+ 因為 Stack 是「倒著長」的
> i. 在 x86／x86-64 上，堆疊<mark style="background: #FF5582A6;">從記憶體高位址往低位址成長（grows downward）</mark>。這是硬體與 ABI 一起定下的規則，不是編譯器可以自己選的。
> j. 所以<mark style="background: #BBFABBA6;">配置</mark>區域變數＝把 SP 往下推＝`sub rsp, N`；<mark style="background: #BBFABBA6;">歸還</mark>＝把 SP 拉回來＝`add rsp, N`（或直接一道 `leave`）。
> k. 同理，`push` 會<mark style="background: #FFF3A3A6;">減少</mark> rsp，`pop` 會<mark style="background: #FFF3A3A6;">增加</mark> rsp。這跟直覺剛好相反，是初學最常翻車的地方。
> l. 為什麼要往下長？歷史原因是讓 Stack 與 Heap 從記憶體的兩端相向成長，中間那塊空白可以被兩邊彈性共用，不必事先切死誰佔多少。

典型的函式開場白（prologue）長這樣：

```asm
push rbp            ; 先把呼叫者的 BP 存起來（rsp 減 8）
mov  rbp, rsp       ; 用目前的 SP 當作本函式的 BP 基準點
sub  rsp, 16        ; 往下挖 16 bytes 給區域變數用
; ... 函式本體，用 [rbp-4]、[rbp-8] 存取區域變數 ...
leave               ; 等同 mov rsp, rbp / pop rbp
ret                 ; 跳回呼叫者
```

> [!warning]+ ⚠️ 存疑／更正：對話裡的 `sub rsp, 4` 在真實 x86-64 幾乎不會出現
> m. System V AMD64 ABI 要求 <mark style="background: #FF5582A6;">`call` 之前堆疊必須 16-byte 對齊</mark>，所以編譯器實際產生的多半是 `sub rsp, 16`／`sub rsp, 32` 這種 16 的倍數，而不是 4。
> n. `sub esp, 4` 這種寫法比較像 <mark style="background: #D2B3FFA6;">32 位元的 x86（esp）或教科書的簡化範例</mark>。Gemini 沒有點出這件事，但概念方向（sub 是為了配置、stack 往下長）是對的。

---

## 三、十六進位比大小的陷阱

第二段對話卡在這裡：「0x7FFF0FC0 明明數字比較大啊？」

> [!danger]+ C 和 D 是數字，不是字母
> o. 十六進位裡 <mark style="background: #FFB8EBA6;">A=10、B=11、C=12、D=13、E=14、F=15</mark>。
> p. 所以 `FC0` 的中間那位是 12、`FD0` 的中間那位是 13 → <mark style="background: #BBFABBA6;">0x7FFF0FC0 < 0x7FFF0FD0</mark>。
> q. 對應到 Stack：`main()` 先被呼叫，住在較高的 0x7FFF0FD0；`main()` 呼叫 `add()` 時往下長，`add()` 的 frame 落在較低的 0x7FFF0FC0。<mark style="background: #FFF3A3A6;">「後呼叫的函式位址比較小」</mark>，完全符合往下長的規則，沒有矛盾。

```plaintext
高位址 (High Address)
  ▲
  │   [ main() Stack Frame ]  → 0x7FFF0FD0   （先建立，位址較大）
  │   [ add()  Stack Frame ]  → 0x7FFF0FC0   （後建立，位址較小）
  │   ▼ Stack 成長方向（往低位址）
  ▼
低位址 (Low Address)
```

---

## 四、拉回 JS：Call Stack 的 Stack 跟放 primitive 的 Stack 是同一塊嗎

第三段對話問的是這題，答案是<mark style="background: #BBFABBA6;">是的，同一塊</mark>。

> [!note]+ 一個 Stack Frame 裡到底裝了什麼
> r. 呼叫函式時，引擎在 Call Stack 上推入一個 Stack Frame，裡面同時裝著三種東西：<mark style="background: #ADCCFFA6;">執行上下文與參數</mark>、<mark style="background: #ADCCFFA6;">該函式內宣告的 primitive 變數（直接存值）</mark>、<mark style="background: #ADCCFFA6;">物件／參考型別的記憶體位址（指標）</mark>——物件本體在 Heap。函式 `return` 時整個 frame 被 pop，這三樣一起消失。

所以「Call Stack」和「存 primitive 的 Stack」不是兩塊記憶體，是<mark style="background: #FFF3A3A6;">同一塊的兩種用途</mark>：既追蹤「程式執行到哪」，也存「當前區塊的區域值與 Heap 指標」。

### JS 的記憶體不是只有 Call Stack ＋ Heap

面試層級講 Call Stack ＋ Heap 大致夠用，但 V8 底層還細分：

| 區域 | 放什麼 | 回收方式 |
|---|---|---|
| Call Stack | 執行幀、primitive 區域變數、Heap 指標 | `return` 時自動 pop，不歸 GC 管 |
| New Space（新生代） | 剛建立、生命週期短的物件 | Scavenger（Minor GC），快速複製式回收 |
| Old Space（老生代） | 在新生代熬過多次回收的物件 | Mark-Sweep-Compact（Major GC） |
| Large Object Space | 超過尺寸上限的大物件 | 各自獨立配置，GC 不搬動它 |
| Code Space | JIT（Ignition／TurboFan）產出的機器碼 | 隨程式碼快取失效而回收 |

> [!tip]+ 閉包變數住在哪？答案會顛覆直覺
> 被閉包捕捉的變數<mark style="background: #FF5582A6;">不能</mark>隨 Stack Frame 一起被 pop 掉，所以引擎會把它們<mark style="background: #BBFABBA6;">搬到 Heap 上的 Context 物件</mark>裡。也就是說——<mark style="background: #FFF3A3A6;">閉包變數其實住在 Heap</mark>，這也正是 [[12-return-清理記憶體-stack-frame與閉包例外]] 講的「例外」。

另外 Event Loop 相關的 <mark style="background: #D2B3FFA6;">Web APIs／Node APIs</mark>、<mark style="background: #D2B3FFA6;">MacroTask ／ MicroTask Queue</mark> 嚴格說不算資料記憶體，但也是執行期會排隊存放東西的地方，細節見 [[事件循環-Event-Loop-微任務與巨任務]]。

---

## 五、相關練習題（Stack 資料結構）

這篇講的是「記憶體上的 Stack」，但 LIFO 的直覺跟「資料結構的 Stack」是同一套，練題可以互相強化：

| 題目 | 連結 | 為什麼相關 |
|---|---|---|
| 20. Valid Parentheses | https://leetcode.com/problems/valid-parentheses/ | 最經典的 push／pop 配對，體會 LIFO |
| 155. Min Stack | https://leetcode.com/problems/min-stack/ | 自己維護一個 stack，理解 top 指標的意義（對應 SP） |
| 232. Implement Queue using Stacks | https://leetcode.com/problems/implement-queue-using-stacks/ | 用兩個 stack 反轉方向，加深成長方向的體感 |
| NeetCode Stack 專章 | https://neetcode.io/practice | 依難度排好的 Stack 題單 |

---

## 六、各對話來源（原文摘要）

### 1. Stack Pointer Adjustment Explanation（語音對話）— https://gemini.google.com/app/f7617167b4e575f0

> [!quote]- 展開原文
> **使用者：** （語音轉錄有破碎）……0x0024 寫 `sub rsp, 4`，減了 4 但接下來卻是 0x0028，為什麼往更高的地方走？
> **Gemini：** That `sub rsp 4` instruction is simply adjusting the stack pointer to make space in memory. The instruction at that point is 4 bytes long, which is why the next address listed is 0x0028.
>
> **使用者：** 為什麼是 sub 呢？
> **Gemini：** Because the stack grows downward in memory, you subtract from the stack pointer to allocate to make room for local variables, which is why the instruction is `sub` instead of `add`.
>
> ⚠️ 註：這段是語音對話，逐字稿被辨識得很破碎（例如「掛狗」「你們真旺家」都是誤辨），本節已改寫為可讀版本。

### 2. Stack 記憶體增長方向與 Pop — https://gemini.google.com/app/ee32b7031e14ab15

> [!quote]- 展開原文
> **使用者：** 當 `main()` 呼叫 `add()` 時，建立 `add()` 的 stack frame → 位於較低的 Stack 位址（例如 0x7FFF0FC0），但很明顯數字比 `main()` 還要大。
> **Gemini：** 這裡主要有一個關於十六進位數值比較的小誤會。在十六進位中 C 代表 12、D 代表 13，因此 0x7FFF0FC0 的數值其實比 0x7FFF0FD0 還要小（FC0 < FD0），並沒有比 `main()` 的位址大。在常見的 x86／x86-64 架構下，Stack 是向下成長的：`main()` 優先建立，位於較高的位址；呼叫 `add()` 時 Stack 向下延伸，`add()` 的 frame 建立在較低的位址。（附記憶體示意圖）

### 3. JS 記憶體：Call Stack 與 Heap — https://gemini.google.com/app/48e3fda16e0ce8ed

> [!quote]- 展開原文
> **使用者：** JS 跟記憶體有關的部分就是 Call stack、Stack、Heap？That's all？Call stack 的 stack 跟放 primitives 的 stack 是一樣的嗎？
> **Gemini：** 這兩個問題的答案分別是「不是只有這樣」以及「是的，它們本質上是同一塊 Stack 空間」。
> 1. 執行函式時引擎會在 Call Stack 推入一個執行幀（Stack Frame），裡面包含執行上下文與參數、該函式內宣告的 primitive 變數（直接以值儲存）、以及物件／參考型別的記憶體位址（真正的資料在 Heap）。函式 return 時整個 frame 被 pop，裡面的 primitive 與 reference 一併釋放。
> 2. 從 V8 底層看遠不只兩塊：（A）閉包捕捉的變數會被搬到 Heap 中的 Context 物件；（B）Heap 內部細分為 New Space（Scavenge 快速回收）、Old Space（Mark-Sweep／Mark-Compact）、Large Object Space（不搬動）、Code Space（存 Ignition／TurboFan 產出的機器碼）；（C）Web APIs／Node APIs 與 MacroTask／MicroTask Queue。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：Stack Pointer Adjustment Explanation | https://gemini.google.com/app/f7617167b4e575f0 | 對話擷取於 2026-09-09 |
| Gemini 對話：Stack 記憶體增長方向與 Pop | https://gemini.google.com/app/ee32b7031e14ab15 | 對話擷取於 2026-09-09 |
| Gemini 對話：JS 記憶體：Call Stack 與 Heap | https://gemini.google.com/app/48e3fda16e0ce8ed | 對話擷取於 2026-09-09 |
| System V AMD64 ABI（16-byte 對齊、參數傳遞暫存器） | https://refspecs.linuxbase.org/elf/x86_64-abi-0.99.pdf | 規格 0.99；查證於 2026-09-09 |
| System V ABI 概覽 | https://wiki.osdev.org/System_V_ABI | OSDev Wiki；查證於 2026-09-09 |
| x86-64 stack frame 版面配置與 prologue | https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64/ | 2011-09-06；查證於 2026-09-09 |
| Stack 往低位址成長、push 減 rsp／pop 加 rsp | https://exercism.org/tracks/x86-64-assembly/concepts/stack | 查證於 2026-09-09 |
| V8 Orinoco GC 與 New／Old Space | https://v8.dev/blog/trash-talk | V8 官方部落格；查證於 2026-09-09 |
| Orinoco 平行 Scavenger（新生代回收） | https://v8.dev/blog/orinoco-parallel-scavenger | V8 官方部落格；查證於 2026-09-09 |
| V8 heap 分區視覺化說明（New／Old／Large Object／Code Space） | https://deepu.tech/memory-management-in-v8/ | 查證於 2026-09-09 |

---

<sub>由 Gemini 對話自動整理 · 更新於 2026-09-09</sub>
