---
title: "陣列方法學習路徑（00 索引）"
type: index
category: 技術
tags: [array, index, 學習路徑]
updated: 2026-09-11
---

# 陣列方法學習路徑

> 依「**先會建立 → 再會遍歷 → 再會轉換／過濾 → 再會短路 → 最後才碰 reduce 與陷阱**」排序。
> 照編號跑一遍，每一篇的 callback 概念都會被下一篇用到。

| # | 主題 | 這一篇解決什麼 | 為什麼排在這裡 |
|---|---|---|---|
| 01 | 為什麼需要陣列 | `new Array`、`Array.from`、`at()` 負索引、`thisArg` | 先搞懂「陣列怎麼來的」，才有東西可以遍歷 |
| 02 | 陣列遍歷 forEach | **第一個吃 callback 的方法** | callback 的三個參數 `(element, index, array)` 從這裡開始，後面全部沿用 |
| 03 | map 轉換 | 一對一轉換，回傳**同長度**新陣列 | 有了 forEach 的 callback 概念，再加上「回傳值有意義」 |
| 04 | filter 過濾 | 依 truthy 篩選，回傳**較短**的新陣列 | 與 map 對照：map 改內容、filter 改長度 |
| 05 | find 與 falsy 陷阱 | 回傳**元素本身**、找到就**短路**、`0` 是 falsy 的坑 | 第一個會「提早停止」的方法 |
| 06 | every 短路與長度快照 | 遇到 falsy 就停、以及「初始長度快照」 | 與 find 同樣短路，但多一層長度快照的細節 |
| 07 | reduce 累加器 | `acc` 初始值、如何用它實作前面所有方法 | **最難**，但前六篇都可以用 reduce 手寫出來 |
| 08 | 稀疏陣列孔洞 | `new Array(3)` 的「洞」，各方法對洞的行為 | 進階陷阱。要先熟悉所有方法，才看得懂誰會跳過洞 |
| 09 | 物件陣列 | 陣列層 vs 物件層存取 | 實務資料結構，前面都是純值陣列 |
| 10 | 陣列的陣列（二維） | 渲染成表格、`c0 c1 c2` 是什麼 | 巢狀結構收尾 |
| 11 | 陣列的底層記憶體 | 一般陣列／型別陣列／類陣列三者的記憶體佈局、V8 的 fast elements 與 dictionary elements、`ArrayBuffer` 與 View、Transferable 零複製 | 回頭掀開引擎蓋。前十篇講「怎麼用」，這篇講「為什麼 `delete arr[i]` 會讓陣列一輩子變慢」，也解釋 08 的「洞」在引擎層的真正代價 |

## 可執行範例

同資料夾的 `.js` 檔用**相同編號**，直接 `node 檔名` 就能跑：

- `05-demo-find-短路與取得所有符合的索引.js` —— find 的短路證明、取得所有索引的五種寫法
- `06-demo-every-length-snapshot.js` —— every 的長度快照實測
- `11-demo-typedarray-view與transferable.js` —— 同一塊 `ArrayBuffer` 掛兩個 View、TypedArray 寫超界的靜默忽略、resizable ArrayBuffer、Worker 轉移後 detached

## 這條路徑的主線觀念

**a.** 所有迭代方法的 callback 都收 `(element, index, array)` 三個參數，都是方法幫你傳的，你可以只收前面幾個。

**b.** 差別只在**回傳什麼**與**會不會短路**：

| 方法 | 回傳 | 短路 |
|---|---|---|
| `forEach` | `undefined` | ❌ |
| `map` | 同長度新陣列 | ❌ |
| `filter` | 較短的新陣列 | ❌ |
| `find` | **元素本身** | ✅ |
| `findIndex` | **索引** | ✅ |
| `some` / `every` | 布林 | ✅ |
| `reduce` | 你自己決定 | ❌ |

**c.** 判斷用的是 **truthy／falsy**（內部做 `ToBoolean()`），不是「等不等於 `true`」。7 個 falsy 值見 [[JavaScript資料型別總覽-原始型別與物件]] 第 4 節。

## 相關筆記

- [[箭頭函式的兩組括號-參數小括弧與主體大括弧-隱式回傳]]
  **理由**：這整條路徑的 callback 幾乎都寫成箭頭函式，那篇解釋「為什麼 `(e, i) => e < 2` 不用大括弧也不用 return」。
- [[高階函式與函數式範式-取代OOP三大設計模式]]
  **理由**：說明「為什麼要把函式當參數傳」這個範式，是整條路徑的理論背景。
