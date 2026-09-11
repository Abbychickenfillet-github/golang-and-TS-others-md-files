---
title: "00-編譯與打包 學習路徑 索引（MOC）：build-time 到 run-time 的兩條平行線"
type: index-note
tags: [索引, MOC, 編譯, 打包, buildtime, runtime, html-parsing, hydration, 鐵人賽]
updated: 2026-09-09
---

# 00｜編譯與打包 學習路徑（索引 / MOC）

> **一句話總綱**：build-time 的**整套打包**——**建相依圖 → transpile → bundle → minify → hash 產出**（這 5 步**全程產物都是純文字**，不是只有前兩步）——做出 `index.html + .js/.css`（純文字）→ 送到瀏覽器 → run-time **兵分兩條平行線**（JS 由 **V8** 編譯 ∥ HTML 由 **Blink** 解析成 DOM）→ **`<script>` 是協調這兩條線何時交錯的閥門** → 執行 JS 把互動掛上 DOM（**SSR/SSG 叫 hydration**）。
>
> ⚠️ 「打包成純文字」＝**整個 build（5 步全部）**，不是只有「建相依圖＋transpile」——因為 transpile 出純文字 JS、bundle 合併仍是純文字、minify 仍是純文字、hash 只改檔名，**一路都是純文字**；真正變 bytecode/機器碼要等 **runtime 的 V8**。

## 抽象層（骨架圖）

```text
① build-time（開發者/CI，一次）
   03 打包：轉譯 + bundle + minify + hash ──► 純文字（index.html + .js/.css）
        │  伺服器發檔
        ▼
② run-time（每個使用者、各一次）──── 兩條平行線（同一條主執行緒輪流用）────
   ┌─ JS  線：  04 V8 編譯（Parse → AST → bytecode → 機器碼）
   └─ HTML 線：HTML-Parsing（Blink：bytes → decode → token → DOM 樹）
        │
        │  ↕ 誰決定兩條線何時交錯？
        ▼
   script 載入方式（母篇）：<script> 何時「中斷 HTML 解析、去執行 JS」
        │  執行 JS 之後
        ▼
   把 JS／事件掛上 DOM ── CSR：從零 createElement 建；SSR/SSG：hydration（接管既有 DOM）
```

## 建議閱讀順序（含現有編號與所在資料夾）

> 表格內用純路徑；wikilink 寫在表格外。

| 順序 | 篇 | 層 | 一句話 |
|---|---|---|---|
| 前置 | `01-CPU五大單元…` | 硬體 | ALU/CU/暫存器/快取，機器碼在哪跑 |
| 前置 | `02-機器碼與bytecode的差異` | 概念 | 機器碼 vs bytecode |
| **1** | `03-…【打包buildtime】` | **build-time** | 純文字怎麼被生出來（打包 5 步） |
| **2a** | `04-V8引擎完整管線…【編譯runtime】` | **run-time · JS 線** | V8 編譯 JS（與 2b **平行**） |
| **2b** | `HTML-Parsing-瀏覽器拿到HTTP-response-body之後`（在 `frontend-docs/html-basics/`） | **run-time · HTML 線** | Blink 把字串解析成 DOM（與 2a **平行**） |
| **3** | `script載入方式+前因後果`（在 `frontend-docs/web-platform/`） | run-time · 協調 | `<script>` 何時中斷 HTML 解析去跑 JS；CSR/SSR/SSG |
| **4** | `SSR-renderToString與Hydration-伺服器端渲染流程`（在 `frontend-docs/react/`） | run-time · 收尾 | hydration：把互動掛回既有 DOM |
| 周邊 | `05-JSX轉譯` / `06-React錯誤` / `07-選型` / `08-09-npm scripts` / `10-chunks` | 補充 | 各主題細節 |

wikilink 版（給 Obsidian 點）：[[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】]]、[[04-V8引擎完整管線-Parse到Deoptimization-【編譯runtime】]]、[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]、[[script載入方式+前因後果]]、[[SSR-renderToString與Hydration-伺服器端渲染流程]]。

## 你問的三個關係

1. **04（JS 線）與 HTML-Parsing（HTML 線）是平行的**：都在 run-time、都在**同一條主執行緒**上輪流用 CPU；但一個是 **V8 編譯 JS**、一個是 **Blink 解析 HTML**，互不轉換（**HTML 永遠不進 V8、不會變 bytecode**）。所以它們並列在 build-time（03）之後。
2. **`<script>` 與 04 的關係**：`<script>` 是「HTML 線解析到它時，把**主執行緒交給 JS 線（04 的 V8）**去跑」的**交接點**；async/defer/module 就是在喬這個交接的**時間點**（要不要中斷 HTML 解析）。
3. **hydration 的檔在哪**：主檔 [[SSR-renderToString與Hydration-伺服器端渲染流程]]；[[script載入方式+前因後果]] 第七節與 (p) 也講。概念是「script 執行完、把事件掛回**既有** DOM」——**只有 SSR/SSG 才叫 hydration**（CSR 是從零建 DOM，不是 hydration）。

## HTML-Parsing 該放哪（抽象 vs 實體）

- **抽象上**：它是「run-time 的 HTML 線」，剛好跟 04（run-time 的 JS 線）**平行**，接在 03（build-time）之後 → 屬於本路徑的「2b」。
- **實體上**：目前檔在 `frontend-docs/html-basics/`，本索引用**連結**把它納進路徑，**不搬檔**（搬檔會斷掉一堆反向連結、也會動到它的 github.io 網址與配套 `.html`）。
- 若之後真要收進本資料夾、正式編成「04b」之類，跟我說，我先列出**改名清單＋所有要一起改的反向連結**再動手（`mv` 可改名，但這 mount 刪不掉舊檔，所以改名要一次到位）。
