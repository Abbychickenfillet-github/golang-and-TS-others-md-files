# Build & Compilation(建置與編譯)

> 涵蓋「把原始碼變成可執行/可部署成品」的整條工具鏈與底層觀念。

## 為什麼不叫 `compile`?因為打包 ≠ 編譯

**編譯 (Compilation) 只是建置流程裡的一個子任務。** 以前端打包工具 (bundler) 為例,它做三件事:

| 子任務 | 做什麼 | 是編譯嗎? |
|---|---|---|
| **編譯 Compilation** | JSX / TypeScript → 瀏覽器懂的標準 JS | ✅ 是 |
| **壓縮 Minification** | 移除註解、空白,縮短變數名 | ❌ 不是 |
| **打包 Bundling** | 多檔合併成一兩個,減少請求數 | ❌ 不是 |

所以資料夾叫 `build-and-compilation`,而不是只叫 `compile`——它要裝得下編譯、打包、Lint、Parser 這一整套。

## 歸類原則

這些主題**前端、後端都會碰到**,是語言/平台無關的計算機基礎,所以跟 `計算機概論`、`計算機基礎`、`資料結構` 同層放根目錄,不歸前端 (`frontend-docs/`) 或後端 (`backend/`)。

判斷準則:**「換掉前端或後端框架,這個知識還成立嗎?」** 成立的(編譯、打包原理、Parser/AST、Big-O)就放這裡;只在某框架才有意義的(Chakra 寫法、GORM tag)才歸前端或後端。

### 前後端都在做的證據

| | 前端 | 後端 |
|---|---|---|
| 編譯 | TS → JS (`tsc`)、JSX → JS (Babel) | Go → 機器碼、Java → bytecode |
| 打包/最佳化 | Vite / Webpack / Turbopack | C/C++ → 原生執行檔 |
| 執行期 | 瀏覽器 V8 用 **JIT** 把 JS 編成機器碼 | JVM JIT、Python `.pyc` |

## 為什麼 `web-platform/` 沒收進來?

`frontend-docs/web-platform/`(IndexedDB、Markdown 渲染為 DOM)講的是**瀏覽器執行期的平台 API 與渲染**,不是「建置/編譯工具鏈」,屬於另一個類別,所以**不搬進來**。

> 容易混淆點:瀏覽器確實會用 V8 的 JIT 把 JS 編成機器碼——但那是「引擎在執行期做的編譯」,跟 web-platform 筆記在講的「怎麼用 IndexedDB 存資料、Markdown 怎麼變成 DOM」是兩回事。前者是編譯(屬本資料夾),後者是用平台 API(屬 web-platform)。

## 本資料夾內容

- [[機器碼與bytecode的差異]] — machine code vs bytecode、JIT、解釋執行、Java/Python/C++ 流程
- [[前端開發工具-打包編譯Lint與Parser]] — Parser/AST、Compiler、打包工具(Webpack/Vite/Turbopack)、ESLint vs Prettier、Acorn/Babel/SWC

## 之後可以補的主題

- 編譯器 vs 直譯器 (compiler / interpreter)
- JIT / AOT 編譯
- 編譯流程四階段:詞法分析 → 語法分析 → 語意分析/中間碼 → 最佳化/目的碼
- 連結器與載入器 (linker / loader)、`.o` `.so` `.exe` 的關係
- AST 與 Parser Generator(ANTLR、Bison/Yacc)的深入

## 相關筆記

- [[進位制-二進制-十六進制-Bytes與RGB]]
- [[進制轉換-除2取餘數法原理]]
- 執行期平台:`frontend-docs/web-platform/`(刻意分開,見上)
