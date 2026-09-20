---
title: "Vue 腳手架套件全表與 Linter 工具鏈——npm 生命週期鉤子、Oxlint 與 ESLint 分工、Vite Dev Inspector"
type: topic-note
source: Gemini
category: tech
tags: [gemini, vue, vite, eslint, oxlint, npm, 打包, ast, dev-server]
sources:
  - https://gemini.google.com/app/b03b80e2bc03fbdb
updated: 2026-09-15
---

# Vue 腳手架套件全表與 Linter 工具鏈——npm 生命週期鉤子、Oxlint 與 ESLint 分工、Vite Dev Inspector

> 本篇重點 a–q，共 17 個。
> 關聯筆記：[[建置失敗排查-Module-not-found與ESLint在哪一階段-npm-ci與Dockerfile-WORKDIR]]（同一條 build pipeline 的「失敗現場」版）、[[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]]（Dev Server 為什麼是一台 Node 伺服器）、[[瀏覽器相容性-Polyfill補API-Babel降語法-Browserslist一次設定全家套用]]（transpile 與降級）、[[編譯期vs執行期三條分界線-AST與CSSOM-編譯與打包-前端與後端記憶體]]（AST 在哪一期產生）。
> 關聯的原因：這四篇講的都是「同一條從原始碼到瀏覽器的流水線」，本篇補的是最前段的「工具各自是誰、誰把東西丟給誰」，另外三篇分別補失敗排查、dev server 執行環境與 AST 時機。

## 一、這個專案是用什麼指令長出來的

從 `node_modules` 裡的套件組合（Vue 3、Vite、Pinia、Vue Router、TypeScript、Vitest、Playwright、Oxlint／Oxfmt）可以反推：這是 Vue 官方腳手架建立的專案。

```bash
npm create vue@latest
# pnpm 用 pnpm create vue，yarn 用 yarn create vue
```

(a) **反推腳手架的方法**：看 `node_modules` 裡有沒有 `@vitejs/plugin-vue`、`vite-plugin-vue-devtools`、`oxlint` 這種「官方模板才會一起裝」的組合。

## 二、套件功能全表（最末欄標「Vite 相關」）

| 套件／工具 | 一句話功能（誰 用什麼 做什麼、產物是什麼） | Vite 相關 |
| --- | --- | --- |
| `vue` | Vue 3 核心 runtime，提供響應式系統與元件化能力 | |
| `@vue/compiler-sfc` | 把 `.vue` 單檔案元件 compile 成標準 JS 模組（template → render function） | |
| `vue-router` | 官方 router，把網址 map 到元件，負責 SPA 的頁面切換 | |
| `pinia` | 官方狀態管理，把跨元件共享的資料收在 store 裡 | |
| `vite` | 建構工具，開發期提供 dev server，產出期把模組打包成靜態檔 | ✅ |
| `@vitejs/plugin-vue` | 讓 Vite 認得 `.vue`，把 SFC 交給 `@vue/compiler-sfc` 編譯並支援 HMR | ✅ |
| `vite-plugin-vue-devtools` | 在開發頁面內嵌 Vue DevTools 面板 | ✅ |
| `vite-plugin-inspect` | 顯示 Vite 每個插件 transform 的中間產物與模組依賴圖 | ✅ |
| `vite-plugin-vue-inspector` | 點擊頁面元件直接跳回編輯器對應的 `.vue` 行號 | ✅ |
| `typescript` | 型別檢查器，把 `.ts` transpile 成 `.js` 並做靜態檢查 | |
| `vue-tsc` | Vue 專用的 TS 型別檢查器，看得懂 `.vue` 裡的 `<script setup lang="ts">` | |
| `@volar/*` | 給編輯器（VS Code）用的 language server，提供語法高亮與 IntelliSense | |
| `eslint` | 靜態分析器，把原始碼 parse 成 AST 後比對規則，產出 error／warning 清單 | |
| `eslint-plugin-vue` | 讓 ESLint 也看得懂 Vue template 的語法規則 | |
| `@typescript-eslint/*` | 讓 ESLint 能 parse TypeScript 並套用 TS 專屬規則 | |
| `oxlint` | Rust 寫的高速 linter，跑基礎規則 | |
| `eslint-plugin-oxlint` | 自動把 ESLint 裡「Oxlint 已經檢查過」的重複規則 disable 掉 | |
| `oxfmt` | Rust 寫的高速格式化工具 | |
| `vitest` | Vite 驅動的單元測試框架，直接沿用 Vite 的設定與 ESM 解析 | ✅ |
| `playwright` | 跨瀏覽器 E2E 測試工具，模擬真實使用者操作 | |
| `jsdom` | 在 Node 裡模擬 DOM／BOM API，讓單元測試不用開真瀏覽器 | |
| `rolldown` / `@rolldown/*` | Rust 寫的 bundler，Vite 下一代預設打包引擎 | ✅ |
| `lightningcss` | Rust 寫的 CSS transpiler 與壓縮器，把新語法降級 | ✅ |
| `postcss` | 用 JS 插件 transform CSS（例如自動補前綴） | ✅ |
| `chokidar` | 跨平台檔案監看庫，dev server 靠它偵測存檔觸發 HMR | ✅ |

## 三、為什麼 ESLint 有錯誤會擋建置

<mark style="background: #FFF3A3A6;">**不是 ESLint 自己有權力擋，而是 `npm run build` 這個腳本把 lint 串在打包前面，而 shell 遇到非零 exit code 就會中斷整條鏈。**</mark>

```json
{
  "scripts": {
    "build": "vue-tsc && eslint . && vite build"
  }
}
```

拋接關係寫清楚：

> `npm run build` 把字串丟給 shell → shell 先跑 `vue-tsc` → 成功（exit 0）才跑 `eslint .` → ESLint 只要發現任何 **error 等級**的違規就回傳 exit code 1 → shell 看到非零就終止，`vite build` 根本沒被執行。

(b) **`&&` 的意義**：前一個指令 exit code 為 0 才會執行下一個。
(c) **error 才會擋，warning 不會**：把規則從 `"error"` 改成 `"warn"` 就不會中斷建置。
(d) **設計初衷**：把未使用變數、未處理的非同步例外、語法錯誤擋在 production 之外，避免上線白屏。

### 三之一、`prebuild` 為什麼會自動跑

Abby 的 Next.js 專案 `build` 裡明明沒寫 eslint，卻自動跑了 lint：

```json
{
  "prebuild": "npm run lint",
  "build": "next build",
  "lint": "npx eslint ."
}
```

(e) **原因不是 `next` 這個字**，而是 <mark style="background: #ADCCFF62;">**npm 的 lifecycle scripts（生命週期鉤子）**</mark>：只要定義了 `pre<NAME>`，執行 `npm run <NAME>` 時 npm 就會先自動跑 `pre<NAME>`；同理 `post<NAME>` 會在成功之後跑。
(f) **為什麼 `prebuild` 裡一定要寫 `npm run lint` 而不能只寫 `lint`**：`scripts` 的值只是一串**丟給作業系統 shell 的字串**，shell 不認識 `lint` 這個你自訂的 key，只會去找一個叫 `lint.exe` 的程式。必須明確告訴 npm「請執行名為 lint 的子腳本」。

> [!warning] ⚠️ 存疑／版本補充
> npm 從 **v7** 開始已經**移除**了 `pre`/`post` 對 `npm install` 等內建指令以外的部分自動行為調整，但 `pre<script>`／`post<script>` 對**自訂腳本**依然有效（這正是 Abby 遇到的情況）。另外 npm 官方在 v9 之後也提醒：`prepublish` 已被 `prepublishOnly` 取代。詳見文末 npm docs 連結。

## 四、`npx eslint . --fix` 是怎麼改檔案的

(g) ESLint 用 `espree`（預設 parser）把原始碼 parse 成 <mark style="background: #ADCCFF62;">**AST（Abstract Syntax Tree，抽象語法樹）**</mark> → 規則走訪 AST 找到違規節點 → `--fix` 依規則重新產生標準化字串 → **直接覆寫原始檔**。
(h) **安全嗎？安全**：`--fix` 只動「格式與無歧義的風格」（引號、分號、縮排、清掉未使用變數），不會改業務邏輯。
(i) **保險做法**：先 `git commit` 或確保工作區乾淨，跑完用 `git diff` 檢查，不滿意就 `git restore .`。

## 五、`import/no-unresolved` 這個否定句在講什麼

| 結構 | 原字 | 意思 |
| --- | --- | --- |
| `import/` | Import | 這是 `eslint-plugin-import` 的命名空間 |
| `no-` | No | 否定詞，ESLint 規則慣例，「出現這情況就報錯」 |
| `unresolved` | Unresolved | 未被 resolve 的（un- ＋ resolved） |

(j) **完整直譯**：Do not allow import statements to reference modules that cannot be resolved to a real file.（不允許 import 去引用無法被 resolve 成實體檔案的模組。）
(k) **什麼叫 resolve**：bundler／Node 拿到 `import eve from 'eve'` 的 specifier `'eve'` → 先判斷是不是相對路徑（`./`、`../`）→ 不是就去 `node_modules/eve` 找 → 讀 `node_modules/eve/package.json` 的 `exports` 或 `main` 欄位找進入點 → 找不到就回報 unresolved。
(l) **同款否定句**：`no-unused-vars`（宣告了卻沒用）、`no-undef`（用了卻沒宣告）、`no-console`（別留 console.log）。

## 六、Oxlint 與 ESLint 為什麼要「關掉重複規則」

> `oxlint`（Rust 寫的高速 linter）先跑完絕大多數基礎規則 → `eslint-plugin-oxlint` 把 ESLint 設定檔中「Oxlint 已檢查過」的同名規則 disable 掉 → `eslint`（JS 寫的通用 linter）只剩下高階／自訂／外掛規則要跑。

(m) **理由一：不要重跑**。若 ESLint 把 Oxlint 剛跑完的幾百條規則再跑一遍，Rust 的速度優勢就被浪費了。
(n) **理由二：避免規則互撞**，兩邊對同一件事的修法可能不一致，會出現互相打架的提示。

## 七、ESLint 底層也會做作用域分析

(o) ESLint 高度依賴 `eslint-scope` 這個套件：parser 產出 AST 之後，`eslint-scope` 走訪 AST 建立 **Scope Tree**（global → module → function → block 的父子鏈），並把每個變數的「宣告（definition）」與「讀寫（references）」綁在一起。
(p) 這就是兩條經典規則的基礎：`no-unused-vars` ＝ 有 definition 但 references 長度為 0；`no-undef` ＝ 有 reference 但整條 scope chain 上找不到 definition。

## 八、Dev Inspector：點元件跳回原始碼，是誰在用？

<mark style="background: #BBFABBA6;">**是開發者在用，而且只活在 `npm run dev` 階段，production build 會被完全剔除。**</mark>

拋接關係：

> `vite-plugin-vue-inspector` 在開發期於每個 DOM 元素注入 `data-*` 標記（檔案路徑＋行號）並注入一小段監聽腳本 → 你在瀏覽器點擊元件，腳本發出 `GET /__open-in-editor?file=src/App.vue:10` 給 **本機的 Vite Dev Server** → Vite 收到後呼叫 Node.js 的 `child_process` 啟動你本機的 VS Code 並開啟對應檔案與行號。

(q) 關鍵在於「瀏覽器連的是你自己電腦上的 dev server」，所以它才有權力叫起本機的編輯器；線上使用者連的是 CDN 上的靜態檔，既沒有這段腳本也沒有那台 server。

## 九、ES 到底代表什麼

`ESLint` 與 `esbuild` 的 **ES ＝ ECMAScript**（JavaScript 的官方標準名稱）。

- `ESLint` ＝ ECMAScript ＋ lint（源自 C 時代的 lint，意指挑出程式碼裡的「棉絮」）。
- `esbuild` ＝ ECMAScript ＋ build。
- 延伸：`ES6 / ES2015` 是第 6 版標準，`ESM（ES Modules）` 是原生 `import` / `export` 模組標準，見 [[ECMA-262標準編號與ES俗稱-其他ECMAScript實作語言]]。
- 對照：`Oxlint` 的 **Ox** 來自 `oxc`（The JavaScript Oxidation Compiler），Rust 社群慣用 "oxidation"（氧化＝改用 Rust 重寫）來命名，不是公牛。

> [!warning] ⚠️ 更正
> 對話中 Abby 提到「Oxlint 的 Ox 代表公牛」，Gemini 順著接話沒有更正。依 oxc 官方說明，`Ox` 取自 **Oxidation（氧化）**，是 Rust 社群對「用 Rust 重寫既有 JS 工具」的慣用說法（oxidize）。

## 十、延伸練習（LeetCode）

這一篇偏工具鏈，沒有直接對應的演算法題。與其中 AST／Scope Tree 觀念最接近的樹狀走訪練習：

| 題號 | 題目 | 為什麼相關 | 連結 |
| --- | --- | --- | --- |
| 144 | Binary Tree Preorder Traversal | AST 走訪就是前序走訪 | https://leetcode.com/problems/binary-tree-preorder-traversal/ |

## 十一、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| 本篇原始對話（Gemini） | https://gemini.google.com/app/b03b80e2bc03fbdb | 對話擷取 2026-09-15 |
| npm scripts 生命週期（pre/post） | https://docs.npmjs.com/cli/v10/using-npm/scripts | npm CLI v10 docs，查證 2026-09-15 |
| ESLint `--fix` 與 AST | https://eslint.org/docs/latest/use/command-line-interface#--fix | ESLint 官方，查證 2026-09-15 |
| `eslint-scope`（作用域分析） | https://github.com/eslint/eslint-scope | GitHub，查證 2026-09-15 |
| `import/no-unresolved` | https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md | eslint-plugin-import，查證 2026-09-15 |
| oxc（Oxidation Compiler，Ox 命名由來） | https://oxc.rs/ | 官方站，查證 2026-09-15 |
| Vue 官方腳手架 `npm create vue@latest` | https://vuejs.org/guide/quick-start.html | Vue 3 官方指南，查證 2026-09-15 |
| Rolldown（Vite 下一代 bundler） | https://rolldown.rs/ | 官方站，查證 2026-09-15 |
