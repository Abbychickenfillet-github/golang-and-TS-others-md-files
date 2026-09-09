---
title: "編譯與打包 - 學習路徑"
---

# 編譯與打包｜學習路徑

> 原本分散在 `build-and-compilation/`、`frontend-docs/javascript/`、`frontend-docs/react/`、`計算機基礎/` 四個地方，2026-08-30 依「先懂硬體與概念，再懂 JS 引擎怎麼編譯，再懂實際工具怎麼用，最後是真實除錯案例」的順序集中到這裡，用數字前綴標順序。

## 學習順序

| # | 筆記 | 這一步在解決什麼問題 | 承接 |
|---|---|---|---|
| 01 | [[01-CPU五大單元-ALU-CU-暫存器-快取與微指令]] | 最底層：CPU 到底怎麼把一條指令跑起來 | 起點 |
| 02 | [[02-機器碼與bytecode的差異]] | machine code vs bytecode、JIT、解釋執行——把「編譯」這個詞的各種形態先分清楚 | 承接 01，從硬體轉到「程式怎麼變成硬體看得懂的東西」 |
| 03 | [[03-前端開發工具-打包轉譯Lint與Parser-【打包buildtime】|03-前端開發工具（打包 buildtime）]] | Parser/AST/Compiler 的通用概念，以及打包工具（Webpack/Vite/Turbopack）、ESLint vs Prettier、Acorn/Babel/SWC 的全貌 | 承接 02，從「編譯的通用原理」進到「前端工具鏈長什麼樣子」 |
| 04 | [[04-V8引擎完整管線-Parse到Deoptimization-【編譯runtime】|04-V8引擎完整管線-Parse到Deoptimization（編譯 runtime）]] | JS 引擎（V8）實際的 Parse → Compile → JIT → Deoptimization 管線，把 03 的 Parser/Compiler 概念套到一個真實引擎上 | 承接 03，從通用概念到具體引擎 |
| 05 | [[05-JSX轉譯機制-createElement與jsx-runtime-Babel與SWC三步驟]] | JSX 怎麼被 Babel/SWC 轉譯成 `createElement`／`jsx()` 呼叫——03 提到的轉譯器，這裡看它實際做了什麼 | 承接 03、04，具體到 React 生態 |
| 06 | [[06-React-130錯誤-transpilePackages與SWC]] | 真實踩過的坑：Next.js `transpilePackages` 搭配 SWC 轉譯第三方套件失敗的除錯過程 | 承接 05，從「懂原理」到「原理沒套對時怎麼修」 |
| 07 | [[07-前端專案建立與打包選型-Vite與createVue與NextJS與npm鎖版本]] | 從「懂編譯」轉向「怎麼選、怎麼建專案」：Vite / Create Vue / Next.js 打包選型比較 | 承接 04-06，從原理轉向實務選型 |
| 08 | [[08-npm-run-script-mechanism]] | `npm run dev`／`npm run build` 這些指令本身是怎麼被 npm 找到並執行的 | 承接 07，選好工具後，「跑起來」這件事本身的機制 |
| 09 | [[09-npm-scripts-pre-post-生命週期鉤子]] | `pre`/`post` 前後鉤子怎麼運作，擴充 08 | 承接 08 |
| 10 | [[10-next-turbopack-server-chunks-hash-comparison]] | 真實除錯案例：`.next/server/chunks/` 雜湊檔名規則、Turbopack dev server 熱更新沒生效的判斷證據 | 承接 04、07-09 全部知識的綜合應用，系列收尾 |

## 為什麼這樣排

- **01-02 是語言無關的計算機基礎**：不管前端後端，機器碼/bytecode/JIT 這套概念都成立。
- **03 是承先啟後的樞紐**：Parser/AST/Compiler 是通用概念，但也是第一次真正碰到「前端工具鏈」的介紹，04-05 都是把 03 的概念套到具體案例（V8、Babel/SWC）。
- **06 是 05 的真實反例**：懂了「JSX 怎麼被轉譯」之後，馬上看一個「轉譯設定沒套對」的真實錯誤，加深記憶。
- **07-09 從「原理」轉向「怎麼用」**：不再是編譯器內部怎麼運作，而是你會實際打的指令（`npm run dev`）背後發生了什麼。
- **10 收尾**：一個需要同時用到「打包管線」「hash 檔名規則」「dev server 機制」才看得懂的真實除錯案例，適合放在最後驗收。

## 跟其他資料夾的關係

- 舊的 `build-and-compilation/README.md` 保留，說明「編譯 ≠ 打包 ≠ 壓縮」的分野，並指向這裡。
- `計算機基礎/`、`frontend-docs/javascript/JS_Core_and_Runtime/`、`frontend-docs/react/` 裡對應的原始檔案已經搬過來，不會有兩份重複內容。
