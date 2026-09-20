---
title: 建置失敗排查 — Module not found、ESLint 在哪一階段、npm ci 與 Dockerfile WORKDIR
type: topic-note
source: Gemini
tags: [gemini, build, eslint, npm, npm-ci, docker, dockerfile, workdir, 打包]
aliases: [npmci, WORKDIR, 建置失敗, Modulenotfound]
related:
  - "[[瀏覽器相容性-Polyfill補API-Babel降語法-Browserslist一次設定全家套用]]"
  - "[[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]]"
  - "[[GitHub-Actions-CICD-ghcr與Docker映像檔]]"
  - "[[00-前端建構到執行全景地圖]]"
sources:
  - https://gemini.google.com/app/8303704f3c9ff9fa
updated: 2026-09-15
---

# 建置失敗排查 — Module not found、ESLint 在哪一階段、npm ci 與 Dockerfile WORKDIR

> [!info]- 🔗 與既有筆記的關聯
> (1) [[00-前端建構到執行全景地圖]] 是整條建置管線的地圖，本篇是<mark style="background: #FFF3A3A6;">「管線某一格出錯時，怎麼定位是哪一格」</mark>的實戰版，可以直接對著那張圖指位置。
> (2) [[瀏覽器相容性-Polyfill補API-Babel降語法-Browserslist一次設定全家套用]] 講轉譯（transpiling）那一格在做什麼，本篇補的是它前後的 linting 與 bundling。
> (3) [[GitHub-Actions-CICD-ghcr與Docker映像檔]] 用到的正是本篇的 `npm ci` 與 `WORKDIR`，那篇是實作、本篇是為什麼。

> 本篇重點 a–i，共 9 個。

## 重點整理

### 一、Module not found：路徑解析失敗（a–b）

(a) 錯誤訊息類似 <mark style="background: #FF5582A6;">「can't resolve `./intro.module.scss` in `intro-page_backup.js`」</mark>，意思是<mark style="background: #ADCCFFA6;">打包工具在做「模組解析（module resolution）」時找不到那個檔</mark>。
也就是說建dependency graph的時候失敗！見03

(b) <mark style="background: #BBFABBA6;">兩個處置方向</mark>：修正 `import` 路徑，<mark style="background: #BBFABBA6;">或者——如果那是像 `_backup` 這種備份檔——直接刪掉它</mark>。<mark style="background: #FF5582A6;">備份檔留在 `src/` 底下會被打包工具一起掃到，是很常見的建置失敗來源</mark>；要留就搬到 `src/` 外面或加進忽略設定。

### 二、ESLint 落在建置流程的哪一格（c–d）

(c) 現代前端建置流程大致是這幾步，<mark style="background: #ADCCFFA6;">ESLint 屬於 linting 這一格</mark>：

| 階段          | 做的事             | 代表工具                |     |
| ----------- | --------------- | ------------------- | --- |
| Linting     | 檢查程式碼品質與潛在錯誤    | ESLint              |     |
| Formatting  | 統一排版            | Prettier            |     |
| Transpiling | 把新語法降級成目標環境看得懂的 | Babel、SWC、tsc       |     |
| Bundling    | 解析模組相依、打成少數幾包   | Vite／Rollup、webpack |     |

```mermaid
A([開始：執行 ESLint]) --> B[/輸入：Source Code 原始碼/]
    
    subgraph ESLint_Parser [Parser 解析器 (Espree / Babel-ESLint)]
        C[詞法分析 Lexer: 將程式碼拆解為 Tokens 詞法單元]
        D[語法分析 Parser: 將 Tokens 組裝為 AST 抽象語法樹]
    end

    B --> C
    C --> D
    D --> E[/輸出：AST 抽象語法樹/]
    E --> F[AST Traversal & Rules 檢查：遍歷 AST 節點並比對規則]
    
    F --> G{是否有語法/格式錯誤？}
    G -- Yes --> H[回報 Error / 執行 --fix 修復]
    G -- No --> I[通過檢查]
    
    H --> J([結束])
    I --> J
```

    
(d) <mark style="background: #FFF3A3A6;">ESLint 報的是 warning 還是 error 決定會不會擋建置</mark>。<mark style="background: #BBFABBA6;">warning 通常不擋，error 才擋</mark>；<mark style="background: #FF5582A6;">但 CI 常設 `--max-warnings 0`，那時候 warning 也會讓建置失敗</mark>，看到一堆 warning 就掛掉先去確認這個設定。

### 三、npm ci 為什麼能取代 npm install（e–g）

(e) <mark style="background: #BBFABBA6;">`npm ci` 嚴格照著 `package-lock.json` 安裝，而且不會去更新它</mark>；<mark style="background: #FF5582A6;">`npm install` 會在必要時改寫 lock 檔</mark>。

(f) 差別整理：

| 面向             | `npm install`             | `npm ci`               |
| -------------- | ------------------------- | ---------------------- |
| 依據             | `package.json`（必要時改 lock） | 只認 `package-lock.json` |
| 會不會改 lock 檔    | 會                         | 不會                     |
| `node_modules` | 增量更新                      | 先整個刪掉再重裝               |
| 速度（CI 環境）      | 較慢                        | 較快                     |
| 沒有 lock 檔時     | 照樣裝                       | 直接報錯                   |
| 適用             | 本機開發、加新套件                 | CI／CD、Docker build     |

(g) <mark style="background: #FFF3A3A6;">「可重現的建置（reproducible build）」是 `npm ci` 存在的理由</mark>：<mark style="background: #BBFABBA6;">同一份 lock 檔在任何機器上裝出完全一樣的版本</mark>，才不會出現「我本機好好的，CI 就掛」這種事。

### 四、Dockerfile 的 WORKDIR（h–i）

(h) <mark style="background: #ADCCFFA6;">`WORKDIR /app` 是把容器內的工作目錄設成 `/app`</mark>，之後的 `COPY`、`RUN`、`CMD` 都以這個目錄為基準。<mark style="background: #BBFABBA6;">它還有一個常被忽略的好處：目錄不存在時會自動建立</mark>，不用先 `RUN mkdir`。

(i) <mark style="background: #FF5582A6;">`/app` 不是 Docker 規定的名稱</mark>，只是<mark style="background: #ADCCFFA6;">社群慣例</mark>。叫 `/project`、`/code`、`/usr/src/app` 都可以，<mark style="background: #D2B3FFA6;">重點是整份 Dockerfile 前後一致</mark>。

### 五、追加 2026-09-15：明明 build 裡沒寫 eslint，為什麼還是跑了 lint（j–k）

(j) **答案是 npm 的 lifecycle scripts（生命週期鉤子）**。只要 `package.json` 裡定義了 `pre<NAME>`，執行 `npm run <NAME>` 時 npm 會**先自動跑** `pre<NAME>`；同理 `post<NAME>` 在成功之後跑。Abby 的 Next.js 專案就是這樣：

```json
{
  "prebuild": "npm run lint",   // ← 元凶在這裡，不是 next 這個字
  "build": "next build",
  "lint": "npx eslint ."
}
```

(k) **`prebuild` 裡為什麼一定要寫完整的 `npm run lint`**：`scripts` 的值只是一串**丟給作業系統 shell 的字串**，shell 不認識你自訂的 key `lint`，只會去找一個叫 `lint.exe` 的程式。必須明確告訴 npm「請執行名為 lint 的子腳本」。

這一段與第二節「ESLint 落在建置流程的哪一格」是同一件事的兩個切面：第二節講**為什麼 lint 有權力擋 build**（exit code），本節講**lint 是怎麼被叫起來的**（生命週期鉤子）。完整的工具鏈（Oxlint 與 ESLint 怎麼分工、`--fix` 怎麼改檔案、`import/no-unresolved` 在講什麼）另見 [[Vue腳手架套件全表與Linter工具鏈-npm生命週期鉤子-Oxlint與ESLint分工-Vite-Dev-Inspector]]。

## ⚠️ 存疑／需要留意

| 項目 | 對話中的說法 | 需要留意的地方 |
| --- | --- | --- |
| 對話品質 | 這串是語音輸入，中間夾雜大量辨識錯誤與離題內容（「59 減 38」「被子的味道」） | 本篇只萃取了技術上正確的部分，其餘已捨棄 |
| `npm ci` 描述 | 「Faster and more reliable for automated environments」 | 正確，但補充：<mark style="background: #FF5582A6;">`npm ci` 會先刪掉整個 `node_modules`</mark>，本機開發時用它反而慢 |

## 各對話來源（原文摘要）

### Build Failure Issue（2026-09-05）— https://gemini.google.com/app/8303704f3c9ff9fa

語音輸入對話，可用的技術問答有四段：(1) 建置失敗訊息的解讀與 ESLint 屬於哪個階段；(2) `WORKDIR /app` 是什麼意思；(3) 容器裡是不是一定要用 `/app`；(4) `npm ci` 為什麼可以取代 `npm install`。其餘輪次為辨識錯誤與離題內容，未收錄。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/8303704f3c9ff9fa | Gemini Flash，2026-09-05 |
| npm Docs — `npm ci` | https://docs.npmjs.com/cli/v10/commands/npm-ci | npm CLI v10 文件，2026-09-05 查證 |
| npm Docs — `npm install` | https://docs.npmjs.com/cli/v10/commands/npm-install | npm CLI v10 文件，2026-09-05 查證 |
| Docker Docs — WORKDIR | https://docs.docker.com/reference/dockerfile/#workdir | Docker 現行文件，2026-09-05 查證 |
| ESLint — Command Line Interface（`--max-warnings`） | https://eslint.org/docs/latest/use/command-line-interface | ESLint 現行文件，2026-09-05 查證 |

## 練習題（LeetCode／NeetCode 對照）

本篇是工具鏈與維運題，LeetCode／NeetCode 沒有直接對應。想練「相依關係解析」的底層直覺——也就是打包工具在做的事——可以做：

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| 207. Course Schedule | https://leetcode.com/problems/course-schedule/ | 模組相依圖有沒有循環相依，就是這題的偵測環 |
| 210. Course Schedule II | https://leetcode.com/problems/course-schedule-ii/ | 拓撲排序＝決定模組的打包順序 |

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| 00-前端建構到執行全景地圖 | 本篇的四個階段可以直接對到那張全景圖 |
| 瀏覽器相容性-Polyfill補API-Babel降語法-Browserslist一次設定全家套用 | Transpiling 那一格的細節 |
| GitHub-Actions-CICD-ghcr與Docker映像檔 | CI 裡實際用到 npm ci 與 WORKDIR 的地方 |
| Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具 | 開發期與建置期的工具差異 |
| npm scripts 生命週期（pre／post） | https://docs.npmjs.com/cli/v10/using-npm/scripts | npm CLI v10 docs，查證 2026-09-15 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
