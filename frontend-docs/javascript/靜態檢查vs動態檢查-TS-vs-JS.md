# 靜態檢查 vs 動態檢查（TS 型別 / JS TypeError）

> 相關：[[陣列遍歷-forEach與callback]]（TypeError vs SyntaxError）、[[原生函式與js引擎-v8]]、[[常見錯誤-括號引號沒收尾]]

## 一句話

**「靜態 / 動態」的分界是「有沒有執行」。** 原生 JS 的**型別檢查是動態的（執行時才檢查）**，TypeError 是 runtime 錯誤；TypeScript 把型別檢查**提前到寫 code/編譯時（靜態，不執行就檢查）**。

---

## 靜態 vs 動態

| | 定義 | 工具 / 例子 |
|---|---|---|
| **靜態檢查** | **不執行**就檢查 | TypeScript、ESLint、語法解析 → 編輯器當場畫紅線 |
| **動態檢查** | **執行時**才檢查 | JS 的型別 → 跑到那一行才爆 |

## JS 其實有「兩種錯誤時機」

JS 不是「純直譯」——V8 會先把程式碼**編譯成 bytecode 再跑（JIT）**，但這個編譯**不做型別檢查**。

| 錯誤 | 何時發現 | 例子 |
|---|---|---|
| **SyntaxError** | **解析階段**（執行前就擋下） | 少一個反引號 / 括號 |
| **TypeError** | **執行階段**（跑到才爆） | `xxx.assign is not a function` |

→ JS 並非完全不檢查：**語法錯**在執行前擋；但**型別錯（TypeError）是動態、執行時才知道**。

## 跟「HTML → DOM」沒直接關係

型別檢查是「**程式跑到那一行才檢查**」，不是「DOM 建好之後才檢查」。瀏覽器解析 HTML 建 DOM、遇到 `<script>` 就執行 JS，TypeError 是 JS 引擎**執行到那一行**時才冒出來。

## 三者對照

| | 何時檢查 | 屬於 |
|---|---|---|
| TypeScript 型別 | 寫code/編譯時（不執行） | **靜態** |
| JS SyntaxError | 解析時（執行前） | 偏靜態 |
| JS TypeError | 執行時（跑到才知） | **動態** |

## 實例：為什麼 `obj.assign(...)` 是 TypeError 不是編譯就擋

```js
const o = { a: 1 };
o.assign({});   // ❌ Uncaught TypeError: o.assign is not a function（執行時才爆）
```
- 原生 JS：要**跑到這行**才發現 `o` 上沒有 `assign`（assign 是 `Object` 的靜態方法）。
- 若是 TypeScript：你一打 `o.assign`，編輯器**立刻**畫紅線（靜態，根本不用執行）。

> 記憶：**靜態＝不跑就抓（TS）；動態＝跑到才抓（JS 的 TypeError）。**
