---
title: "Elision語法標記與System-V-ABI暫存器傳遞慣例"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, ECMAScript語法, BNF, ABI, calling-convention, SIMD, System-V]
sources:
  - https://gemini.google.com/app/934dbe472fd8e85c
updated: 2026-09-28
---

# Elision語法標記與System-V-ABI暫存器傳遞慣例

本篇重點 a–h，共 8 個

## 重點整理

### a. 什麼是 ECMAScript 規格書裡的 Elision

<mark style="background: #ADCCFFA6;">Elision</mark> 指「省略、空缺、逗號之間的空位」。在 JavaScript 陣列字面值（Array Literal）裡，如果寫出兩個連續逗號，中間被留白的位置就是 Elision：

```javascript
const arr = [1, , 3];
// 中間那個未定義的空位（稀疏陣列 sparse array）在語法解析時就標記為 Elision
```

### b. 什麼是規格書裡的 `opt` 標記

`opt` 是 optional 的縮寫。ECMAScript 規格書（Spec）的 BNF 文法標記法裡，某個語法符號右下標了 `opt`（或寫成 `[opt]`），代表這個語法元素<mark style="background: #ADCCFFA6;">可以出現、也可以不出現</mark>。

### c. 合起來讀：`Elision opt`

規格書裡常見的陣列元素定義：

```
ElementList :
  Elision opt AssignmentExpression
  ElementList , Elision opt AssignmentExpression
```

意思是：陣列的<mark style="background: #FFF3A3A6;">第一個元素前面可以有空位（Elision opt），也可以直接接運算式</mark>（例如 `[, 1]` 或 `[1]` 都合法）；元素與元素之間也可以包含一個或多個空位（例如 `[1, , , 2]`）。

---

### d. 浮點數在函式呼叫時走哪個暫存器：與整數分開傳

現代 CPU 架構的呼叫慣例（Calling Convention）裡，浮點數（`float`／`double`）即使是簡單的基本型別（Primitive），底層也<mark style="background: #FF5582A6;">不會放進通用暫存器</mark>（如 x86-64 的 `rax`、`rdi`、`rsi`），而是直接放進<mark style="background: #ADCCFFA6;">浮點／SIMD 暫存器</mark>（如 x86-64 的 `xmm0` ~ `xmm7`）。

原因：x86-64（System V ABI 或 Windows x64）已淘汰早期的 x87 浮點協同處理器，改由 SSE/AVX（即 SIMD 暫存器）接管浮點運算；`xmm` 暫存器雖然主要設計給 SIMD（單指令多資料）用，但同時也是<mark style="background: #ADCCFFA6;">執行純量浮點數（Scalar Floating-Point）運算</mark>的地方。

### e. 整數 vs 浮點數在 System V ABI 下的暫存器分配範例

以 C 函式 `void foo(int a, double b, int c, float d);` 在 x86-64 Linux（System V ABI）為例，編譯成組合語言後：

| 參數 | 型別 | 分配到的暫存器 |
|---|---|---|
| `a` | 整數 `int` | 通用暫存器 `edi` |
| `b` | 浮點數 `double` | SIMD 暫存器 `xmm0` |
| `c` | 整數 `int` | 通用暫存器 `esi` |
| `d` | 浮點數 `float` | SIMD 暫存器 `xmm1` |

<mark style="background: #BBFABBA6;">結論：小數依然是直接傳值（By Value），不需要傳記憶體位址</mark>；但因為 CPU 硬體把「整數算術邏輯單元 ALU」與「浮點／向量運算單元 FPU/SIMD」分開設計，浮點數一定走 `xmm`／`ymm` 這種浮點/SIMD 暫存器通道傳遞，跟整數的通用暫存器通道是分開的兩條路。

### f. System V ABI 是什麼

<mark style="background: #ADCCFFA6;">System V ABI（Application Binary Interface）</mark>就是上面 d、e 兩點描述的那套規範：定義 CPU 暫存器如何傳遞函式參數、記憶體如何對齊、執行檔（ELF）格式，是現代 Linux、macOS 等平台的硬體溝通標準。「System V」這個名字的完整歷史脈絡（AT&T 商業版 UNIX、與 BSD 的 UNIX 戰爭、System V IPC、System V Init）記在 [[Unix-與類Unix系統介紹]] 的「追加 2026-09-28」段落，因為那屬於 Unix 系統史而非 JS 語法或暫存器機制本身，兩篇互相對照著看。

### g. 這兩件事（Elision 語法、System V ABI）為什麼會出現在同一篇筆記

因為它們來自同一段 Gemini 對話的前後兩個追問——先問 ECMAScript 規格書的 `Elision opt` 語法標記，接著追問「小數要不要用 SIMD 處理」延伸到暫存器分配與 System V ABI。兩者主題不同層次（一個是 JS 語言規格的文法標記，一個是 CPU／ABI 的底層機制），但因為同一次對話一起釐清，故整理在同一篇，並各自留一個標號（a–c 是 Elision、d–f 是 ABI）方便日後分開複習。

### h. 延伸練習

- [LeetCode 1608. Special Array With X Elements Greater Than or Equal X](https://leetcode.com/problems/special-array-with-x-elements-greater-than-or-equal-x/) — 練習陣列邊界與元素計數，可順便體會稀疏陣列（含 Elision 空位）在 `.length` 與走訪上的坑
- [LeetCode 448. Find All Numbers Disappeared in an Array](https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/) — 陣列走訪與缺值偵測，練習分辨 `undefined`（Elision 造成）與「值真的是 undefined」的差異

---

## 各對話來源

### 解析 JS 規格中的 Elision opt（2026-09-28）— https://gemini.google.com/app/934dbe472fd8e85c

使用者：elision opt是啥

Gemini：Elision 指陣列字面值裡逗號間的省略空位；`opt` 是 optional 的縮寫，規格書裡標了 `opt` 代表該語法元素可有可無。合起來 `Elision opt` 代表「這裡可以出現省略/空位，但不是必須出現」。範例文法：`ElementList : Elision opt AssignmentExpression`。

使用者：如果只是有小數你會當成是浮點數 還需要用SIMD去處理嗎還是會當成Primitive來處理 數值小、簡單的參數

Gemini：浮點數即使是簡單基本型別，底層也不會放進通用暫存器，而是放進浮點/SIMD 暫存器（如 x86-64 的 xmm0~xmm7）。因為 x87 浮點協同處理器已被淘汰，現在浮點運算由 SSE/AVX（SIMD 暫存器）接管。它仍是 Primitive、仍是傳值，但因硬體把 ALU 與 FPU/SIMD 分開設計，浮點數一定走 xmm/ymm 通道傳遞。

使用者：「System V」索引system v是什麼

Gemini：System V（簡寫 SysV）是 1983 年 AT&T 推出的官方商業版 UNIX，與柏克萊 BSD 是 UNIX 戰爭的兩大陣營。現代提到 System V 通常指它留下的底層規範：System V IPC（跨程序通訊）、System V Init（傳統開機機制）、System V ABI（本篇 d~f 點描述的暫存器傳遞與二進位介面規範）。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：解析 JS 規格中的 Elision opt | https://gemini.google.com/app/934dbe472fd8e85c | 對話擷取於 2026-09-28 |
| ECMAScript 規格書：BNF 文法標記（`opt` 下標、Elision 定義） | https://tc39.es/ecma262/#sec-array-initializer | 現行版本；查證於 2026-09-28 |
| System V AMD64 ABI（x86-64 呼叫慣例、xmm 暫存器分配規則正式文件） | https://gitlab.com/x86-psABIs/x86-64-ABI | 現行版本；查證於 2026-09-28 |
| MDN：Array literal 語法（Elision／稀疏陣列說明） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Array_initializer | 查證於 2026-09-28 |

⚠️ 存疑／更正：無——本篇對話內容經與 ECMAScript 規格書、System V ABI 官方文件核對，方向正確。
