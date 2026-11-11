---
title: Next.js 靜態部落格：施工計畫
type: implementation-plan
tags: [nextjs, static-blog, github-pages, plan]
status: draft-for-review
updated: 2026-11-11
---

# Next.js 靜態部落格 施工計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 把 Abby-notes 改成 Next.js 靜態部落格，共用樣式與元件只有一個來源，仍部署在 GitHub Pages。

**Architecture：** 共用 CSS 與 JS 放在 repo 根目錄的 `assets/`，獨立 `.html`（要能在 Obsidian 直接開）與 Next.js 站台都連同一份；Next.js 專案放在 `site/`，建置時讀取 repo 內的 `.md` 與 `.html`，套上 React 公版 layout 後輸出到 `site/out/`；wikilink、callout 等 Obsidian 語法在建置時轉換，不靠瀏覽器端 JS。

**Tech Stack：** Next.js（App Router、TypeScript、`output: 'export'`）、Vitest 加 Testing Library 加 jsdom、unified／remark／rehype、gray-matter、cheerio、postcss、culori、Playwright。

**Spec：** [[nextjs-static-blog-design]]（`frontend-docs/nextjs/nextjs-static-blog-design.md`）

## Global Constraints

| 項目 | 值（逐字取自設計文件） |
|---|---|
| 字距 | pills 與 hashtag `0.25rem`；內文 `0.2rem`；`code`、`pre`、`.align-demo` 用 `0.1rem`；`.legend span` 保留 `1.18em` |
| 技術限制 | 不導入 Tailwind；`next.config` 設 `output: 'export'`；輸出加 `.nojekyll`；部署 GitHub Pages |
| 站點大小 | GitHub Pages 約 1 GB 上限（⚠️ 未查證）；腳本門檻 950 MB 是暫定值 |
| 發布範圍 | 排除清單取自 `_config.yml` 的 `exclude`，不另寫一份；底線開頭的檔案與資料夾也不發布 |
| 內容不動 | repo 內的 `.md` 與圖片不搬、不改、不改名；`.html` 只有「抽換共用樣式與共用腳本」與「同名配對改名」兩種改動 |
| 名詞 hover | 用 `.term`（`assets/notes.css`、`assets/notes.js`），不用瀏覽器原生 `title` |
| 顏色 | 卡片底色用 CSS 變數，不寫 `#fff`；新增顏色用 `oklch()`；背景與卡片要高對比（暫定對比度至少 2:1） |
| 無障礙 | 純 icon 按鈕要有 `aria-label` |
| 術語 | 原始碼轉原始碼一律寫 transpile（轉譯） |
| 程式碼註解 | 每一行都要逐行註解它做什麼，並說明用到的語法；修改檔案前先解釋會用什麼語法 |
| 中文文件 | 全形逗號；句號與分號後換行；換行符號 CRLF |
| git | 沒有 Abby 同意不 commit；commit 訊息不加 `Co-Authored-By` 或 `Generated with` 行（Abby 的 `CLAUDE.md`） |
| 只有 Abby 能做 | GitHub 儲存庫 Settings 的 Pages 來源切換成 GitHub Actions |

## Review Focus

這五項是設計文件沒明講、但最可能害到使用者的情況；每一項的測試放在括號內的任務。

| 情況 | 合理的預期 | 測試所在 |
|---|---|---|
| 檔名含中文、空白、`#`、`+`、括號 | 輸出檔名與連結網址的編碼一致，連結點得開 | Task 6、Task 11、Task 12 |
| 兩篇筆記標題相同 | wikilink 解析時建置失敗並列出衝突，不默默連到其中一篇 | Task 8 |
| 沒有 frontmatter 的 `.html` 或 `.md` | 標題依序退而用 `<title>`、第一個 `h1`、檔名 | Task 6 |
| 其他筆記連結或嵌入「被排除資料夾」內的東西 | 建置顯示警告並輸出純文字，不產生指向不存在頁面的連結，也不洩漏被排除的檔案 | Task 8、Task 12 |
| 含自己 `<script>` 的 `.html`，且同時載入共用腳本 | 共用腳本只初始化一次，頁面自己的腳本仍照順序執行 | Task 5、Task 10 |

## 檔案結構

| 路徑 | 責任 |
|---|---|
| `assets/note-theme.css`（新） | 全站色票、字距、元件樣式的單一來源，html 與 Next.js 都連它 |
| `assets/note-mask.js`（新） | 螢光筆遮罩與顯示的共用腳本（取代各頁 inline 腳本） |
| `site/`（新） | Next.js 專案；`src/components` 元件、`src/lib` 建置時函式、`scripts` 腳本、`tests` 測試 |
| `site/tests/fixture-vault/`（新） | 測試用的迷你筆記庫，含中文檔名、排除資料夾、同名配對 |
| `.github/workflows/pages.yml`（新） | 建置與部署 |

---

### Task 1：建立 `site/` 專案骨架

**Files：**
- Create：`site/`（以 `npx create-next-app@latest site --ts --app --src-dir --no-tailwind --eslint --use-npm` 建立，旗標名稱以當時 CLI 為準）、`site/vitest.config.ts`、`site/scripts/sync-assets.mjs`、`site/tests/sync-assets.test.ts`
- Modify：`site/next.config.ts`、`site/package.json`、`site/.gitignore`

**Interfaces：**
- Produces：npm scripts `dev`、`build`（先跑 `sync-assets`）、`lint`、`test`；`syncAssets(srcDir: string, destDir: string): Promise<number>` 回傳複製的檔案數；環境變數 `NOTES_ROOT`（預設 `..`，指向筆記庫根目錄）

- [ ] **Step 1：寫會失敗的測試** `sync-assets.test.ts`：建立暫存來源資料夾含 `a.css`、`b/c.js`，呼叫 `syncAssets` 後斷言目的地有同樣兩個檔案且回傳值為 `2`。
- [ ] **Step 2：執行** `cd site && npx vitest run tests/sync-assets.test.ts`，預期失敗（`syncAssets` 未定義）。
- [ ] **Step 3：實作** `syncAssets` 與 `next.config.ts`（`output: 'export'`、`trailingSlash: false`、`images.unoptimized: true`）；`site/.gitignore` 加入 `out/`、`public/assets/`；`build` 前置腳本把根目錄 `assets/` 複製到 `site/public/assets/`。
- [ ] **Step 4：執行** `npx vitest run` 通過，再執行 `npm run build`，預期產生 `site/out/index.html`。
- [ ] **Step 5：檢查點** `git status` 只出現 `site/` 內的檔案。

### Task 2：全站主題 CSS `assets/note-theme.css`

**Files：**
- Create：`assets/note-theme.css`、`site/tests/theme.test.ts`
- Read：`assets/note-interactive.css`（色票以它為主）、樣板頁 `backend/Session-Token-Cookie-認證系列/1-Cookie-與-Session.html`（區塊結構）

**Interfaces：**
- Produces：CSS 變數 `--ls-body: 0.2rem`、`--ls-pill: 0.25rem`、`--ls-mono: 0.1rem`、`--ls-legend: 1.18em`；沿用 `note-interactive.css` 的 `--bg`、`--card`、`--ink`、`--line` 等變數名稱；類別 `.card`、`.pills`、`.pill`、`.legend`、`.quiz-head`、`.quiz-actions`、`.snap-deck`

- [ ] **Step 1：寫會失敗的測試** `theme.test.ts`，用 postcss 讀檔，斷言：四個字距值各只宣告一次；`body` 使用 `var(--ls-body)`；`.pills`、`.pill` 使用 `var(--ls-pill)`；`code, pre, .align-demo` 使用 `var(--ls-mono)`；`.legend span` 使用 `var(--ls-legend)`；`.card` 規則內沒有 `#fff` 或 `#ffffff`；用 culori 解析淺色與深色兩組 `--bg`、`--card`，WCAG 對比度都至少 `2`；`.snap-deck` 含 `scroll-snap-type: y mandatory`，而 `body` 與 `.content` 沒有。
- [ ] **Step 2：執行** `npx vitest run tests/theme.test.ts`，預期失敗（檔案不存在）。
- [ ] **Step 3：實作** `note-theme.css`：先 `@import` 或複製 `note-interactive.css` 的變數，淺色背景與卡片要拉開（例如背景偏灰、卡片偏亮），深色同理；新增的顏色用 `oklch()`。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** 用瀏覽器開樣板頁並暫時連上 `note-theme.css`，請 Abby 看過背景與卡片的對比再往下。

### Task 3：版面元件（Card、Pills、Hero、Legend）

**Files：**
- Create：`site/src/components/{Card,Pills,Hero,Legend}.tsx`、`site/tests/components-layout.test.tsx`

**Interfaces：**
- Produces：
  - `Card(props: { children: ReactNode; id?: string }): JSX.Element` 輸出 `<article class="card">`
  - `Pills(props: { items: string[] }): JSX.Element` 輸出 `<div class="pills">` 內每項 `<span class="pill">`，不得在元件內寫字距
  - `Hero(props: { title: string; pills: string[]; meta?: ReactNode }): JSX.Element` 輸出 `<header class="hero">`，內含 `h1` 與 `Pills`
  - `type HighlightKind = 'core' | 'warn' | 'ok' | 'term' | 'data' | 'note'`
  - `Legend(props: { items: { kind: HighlightKind; label: string }[] }): JSX.Element` 輸出 `<div class="legend">` 內每項 `<span class="hl-{kind}">`

- [ ] **Step 1：寫會失敗的測試**：各元件 render 後斷言標籤與 class；`Pills` 傳入 `['#cookie','http協定']` 得到兩個 `.pill`；元件輸出的元素沒有 inline `style`。
- [ ] **Step 2：執行** `npx vitest run tests/components-layout.test.tsx`，預期失敗。
- [ ] **Step 3：實作** 四個元件，只輸出結構與 class，樣式全交給 `note-theme.css`。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** `npm run lint` 無錯誤。

### Task 4：互動區塊元件（Highlight、Quiz 標題列、Blank、SnapDeck）

**Files：**
- Create：`site/src/components/{Highlight,MaskButtons,QuizHeader,Blank,SnapDeck}.tsx`、`site/tests/components-interactive.test.tsx`

**Interfaces：**
- Consumes：Task 3 的 `HighlightKind`
- Produces：
  - `Highlight(props: { kind: HighlightKind; children: ReactNode })` 輸出 `<mark class="hl hl-{kind}">`
  - `MaskButtons(): JSX.Element` 輸出兩個 `<button>`，內容只有 `🙈` 與 `👀`，分別帶 `data-note-action="mask-all"` 與 `data-note-action="show-all"`，以及 `aria-label="全部遮起來"`、`aria-label="全部顯示"`
  - `QuizHeader(props: { id: string; title: string })` 輸出 `<div class="quiz-head">`，標題 `h2` 在左、`MaskButtons` 包在 `.quiz-actions` 在右，兩者在同一個容器內
  - `Blank(props: { answer: string })` 輸出 `<input class="blank" data-a="{answer}">`
  - `SnapDeck(props: { children: ReactNode })` 輸出 `<div class="snap-deck">`

- [ ] **Step 1：寫會失敗的測試**：`MaskButtons` 的按鈕文字內容恰為 `🙈`、`👀`（不含其他字）；兩顆按鈕都有 `aria-label`；`QuizHeader` 的 `h2` 與兩顆按鈕有同一個父層 `.quiz-head`；`SnapDeck` 輸出 class `snap-deck`。
- [ ] **Step 2：執行** `npx vitest run tests/components-interactive.test.tsx`，預期失敗。
- [ ] **Step 3：實作** 五個元件；`.quiz-head` 用 flex 讓標題在左、按鈕在右，寬度不足時才折行（樣式寫進 `note-theme.css`，在本任務補上）。
- [ ] **Step 4：執行** 測試通過，並重跑 Task 2 的 `theme.test.ts`。
- [ ] **Step 5：檢查點** 手機寬度（375 px）下 `.quiz-head` 折行而不橫向捲動。

### Task 5：共用腳本 `assets/note-mask.js`

**Files：**
- Create：`assets/note-mask.js`、`site/tests/note-mask.test.ts`

**Interfaces：**
- Produces：全域旗標 `window.__noteMaskInit`（防止重複初始化）；行為：點 `[data-note-action="mask-all"]` 讓所有 `mark.hl` 加上 `masked`，點 `show-all` 全部移除；點單一 `mark.hl` 切換它的 `masked`；相容舊頁的 `#maskAll`、`#showAll`，並把它們的按鈕內容改成 🙈、👀、把原本文字存進 `aria-label`，若頁面有 `.quiz` 就把兩顆按鈕搬進 `.quiz > h2:first-child` 旁，形成與 `QuizHeader` 相同的結構

- [ ] **Step 1：寫會失敗的測試**（jsdom）：新結構與舊結構各一組；斷言全部遮起來、全部顯示、單點切換；舊結構載入後按鈕文字變成 `🙈`、`👀` 且 `aria-label` 為原本文字；腳本載入兩次只初始化一次。
- [ ] **Step 2：執行** `npx vitest run tests/note-mask.test.ts`，預期失敗。
- [ ] **Step 3：實作** `note-mask.js`（原生 JS，不依賴任何套件，才能在 Obsidian 的 HTML Reader 無建置地執行）。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** 在 Obsidian 以 Unrestricted Mode 開樣板頁，確認遮罩仍可運作（Abby 手動確認）。

### Task 6：筆記清單載入器 `content.ts`

**Files：**
- Create：`site/src/lib/content.ts`、`site/tests/content.test.ts`、`site/tests/fixture-vault/`（含 `private/x.md`、`_hidden/y.md`、`前端/日期 物件.md`、`前端/日期 物件-互動版.html`、無 frontmatter 的 `plain.html`、`_config.yml`）

**Interfaces：**
- Produces：
  - `loadExclude(configPath: string): string[]` 解析 `_config.yml` 的 `exclude`
  - `type NoteEntry = { kind: 'md' | 'html'; relPath: string; slug: string[]; title: string; frontmatter: Record<string, unknown> }`
  - `listNotes(root: string, exclude: string[]): Promise<NoteEntry[]>`：排除清單、底線開頭與 `.` 開頭的路徑不收；`slug` 為去掉副檔名的路徑片段；標題依序取 frontmatter `title`、`<title>`、第一個 `h1`、檔名；兩個筆記 `slug` 相同就丟出錯誤並列出兩個路徑

- [ ] **Step 1：寫會失敗的測試**：`private/`、`_hidden/` 不在結果內；中文與空白檔名保留原樣；`plain.html` 標題取自 `<title>`；兩個同 slug 檔案時 `listNotes` 拒絕並訊息含兩個路徑。
- [ ] **Step 2：執行** `npx vitest run tests/content.test.ts`，預期失敗。
- [ ] **Step 3：實作** `loadExclude` 用簡單的 YAML 解析（建議 `yaml` 套件），`listNotes` 遞迴走訪，`.md` 用 gray-matter，`.html` 用 cheerio 取標題。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** 對真實 repo 執行一次並印出筆記總數，應與 1310 份 `.md`、392 份 `.html` 扣掉被排除者相符（差額要能解釋）。

### Task 7：同名配對改名腳本

**Files：**
- Create：`site/scripts/rename-interactive-pairs.mjs`、`site/tests/rename-pairs.test.ts`

**Interfaces：**
- Consumes：Task 6 的 `listNotes`
- Produces：`planRenames(notes: NoteEntry[]): { from: string; to: string }[]` 只對「同路徑同主檔名同時有 `.md` 與 `.html`」的 `.html` 產生 `<原檔名>-互動版.html`，已以 `-互動版` 結尾者略過；`applyRenames(plan, root, opts: { dryRun: boolean })` 預設 `dryRun: true`，真正執行時用 `git mv` 並同步更新所有 `.md`、`.html` 內指向舊檔名的連結（相對路徑連結與 `[[wikilink]]` 都要）

- [ ] **Step 1：寫會失敗的測試**（在暫存 git repo 內）：配對被規劃為 `日期 物件-互動版.html`；已有 `-互動版` 者不重複；套用後 md 內的 `[[日期 物件]]` 保持指向 md，原本連到舊 html 的連結被改成新檔名；`dryRun` 不動任何檔案。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作** 兩個函式與 CLI（`node scripts/rename-interactive-pairs.mjs [--apply]`）。
- [ ] **Step 4：執行** 測試通過；對真實 repo 以 dry-run 輸出 172 對的清單給 Abby 看。
- [ ] **Step 5：檢查點** Abby 看過清單並同意，才可用 `--apply`，且工作目錄要乾淨（腳本偵測 `git status` 不乾淨就拒絕）。

### Task 8：wikilink 索引與解析

**Files：**
- Create：`site/src/lib/wikilink.ts`、`site/tests/wikilink.test.ts`

**Interfaces：**
- Consumes：`NoteEntry[]`
- Produces：
  - `buildWikilinkIndex(notes: NoteEntry[]): Map<string, string>`：鍵為檔名（去副檔名）與 frontmatter `title`，值為站內網址（例如 `/前端/日期 物件`）；鍵衝突時丟錯並列出衝突
  - `resolveWikilink(raw: string, index: Map<string, string>): { href: string; text: string } | null`：處理 `[[標題|別名]]`、`[[資料夾/標題]]`、`[[標題#段落]]`
  - `remarkWikilink(opts: { index: Map<string, string>; onMissing: (raw: string) => void })`：remark 外掛
  - `rewriteWikilinksInHtml(html: string, index: Map<string, string>, onMissing): string`：只處理文字節點，不碰 `script`、`style`、`a`

- [ ] **Step 1：寫會失敗的測試**：別名與資料夾寫法；找不到時呼叫 `onMissing` 並保留純文字；兩篇標題相同時 `buildWikilinkIndex` 丟錯；指向被排除檔案的 wikilink 視為找不到；`rewriteWikilinksInHtml` 不改 `<script>` 內的 `[[`。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作**。網址要做 `encodeURI` 一致處理，並與 Task 11 輸出的檔名規則一致。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** 對真實 repo 建索引，印出 `00-閱讀順序` 的解析結果（先前它不在舊索引裡）。

### Task 9：Markdown 語法轉換管線

**Files：**
- Create：`site/src/lib/markdown.ts`、`site/tests/markdown.test.ts`

**Interfaces：**
- Consumes：Task 8 的 `remarkWikilink`
- Produces：`renderMarkdown(source: string, ctx: { index: Map<string, string>; onMissing: (raw: string) => void; onImage: (name: string) => string }): Promise<{ html: string; frontmatter: Record<string, unknown> }>`；`onImage` 把 `![[圖片.png]]` 的檔名換成輸出路徑並由呼叫端記錄「被引用的圖」

- [ ] **Step 1：寫會失敗的測試**（逐語法）：`> [!note] 標題` 轉成 callout 結構；`==字==` 轉成 `<mark>`；`![[圖.png]]` 轉成 `<img>` 且呼叫 `onImage`；行內 `<mark style="background: #FFF3A3A6;">` 原樣保留；表格與 GFM 正常；全形與半形混排的標題產生穩定的 `id`。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作** 以 unified 串 `remark-parse`、`remark-gfm`、自寫的 callout 與 `==` 外掛、`remark-rehype`（允許原始 HTML）、`rehype-raw`、`rehype-stringify`。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** 隨機抽 5 份真實 `.md` 渲染，確認沒有殘留 `[[`、`![[`、`==`。

### Task 10：`.html` 筆記解析與樣式抽換 `parse-html.ts`

**Files：**
- Create：`site/src/lib/parse-html.ts`、`site/tests/parse-html.test.ts`

**Interfaces：**
- Consumes：`assets/note-theme.css` 內出現的選擇器集合
- Produces：
  - `sharedSelectors(themeCss: string): Set<string>`
  - `pruneSharedRules(css: string, shared: Set<string>): string`：移除選擇器屬於 `shared` 的規則；選擇器不在 `shared` 的規則保留；`<style data-override>` 區塊整段保留不動
  - `parseHtmlNote(html: string): { title: string; bodyHtml: string; pageCss: string; pageScripts: { src?: string; inline?: string }[] }`：不含 `</body>` 的殘缺 html 也要能處理；共用腳本（`notes.js`、`note-mask.js`、`note-quiz.js`、`toc.js`、`wikilink.js`）不放進 `pageScripts`，由 layout 統一載入

- [ ] **Step 1：寫會失敗的測試**：`.card` 規則被移除、`.my-chart` 規則保留；`data-override` 區塊保留；殘缺 html 不丟錯；頁面自己的 inline script 保留並維持順序；共用腳本被過濾掉。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作** 用 cheerio 取 `body` 與 `style`、`script`，用 postcss 處理 CSS。
- [ ] **Step 4：執行** 測試通過。
- [ ] **Step 5：檢查點** 對樣板頁執行並把 `pageCss` 印出，確認只剩該頁獨有的規則（例如 `.align-demo`、`.seg`）。

### Task 11：路由、layout 與首頁

**Files：**
- Create：`site/src/app/layout.tsx`、`site/src/app/[...slug]/page.tsx`、`site/src/app/page.tsx`、`site/src/lib/site.ts`、`site/tests/build-fixture.test.ts`
- Modify：`site/src/app/globals.css`（只留 `@import` 或 `<link>` 到 `/assets/note-theme.css`，不寫任何樣式）

**Interfaces：**
- Consumes：Task 6、8、9、10
- Produces：`loadSite(root: string): Promise<{ notes: NoteEntry[]; index: Map<string, string>; images: Set<string> }>`；`generateStaticParams()` 回傳所有 `slug`，`dynamicParams = false`；layout 載入 `note-theme.css`、`notes.css`、`notes.js`、`note-mask.js`、`note-quiz.js`；frontmatter `deck: true` 時內容外層加 `SnapDeck`；首頁依資料夾分組列出所有筆記（取代 `build-index.py` 產生的 `index.html`）；建置結束把「被引用到的圖」複製進 `out/`，並輸出 `out/.nojekyll`

- [ ] **Step 1：寫會失敗的測試** `build-fixture.test.ts`：以 `NOTES_ROOT=tests/fixture-vault` 執行 `next build`，斷言 `out/前端/日期 物件.html`、`out/前端/日期 物件-互動版.html` 都存在；`out/private/`、`out/_hidden/` 不存在；`out/.nojekyll` 存在；被引用的圖在 `out/`、未被引用的圖不在。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作**。若 Next.js 對含 `.html` 或中文的路由輸出的檔名與預期不同，在此任務調整（例如後處理腳本補出對應檔名），目標是「現有網址路徑一一對應」。
- [ ] **Step 4：執行** 測試通過，再開 `npx serve out` 手動看首頁與兩種頁面。
- [ ] **Step 5：檢查點** 請 Abby 看首頁與一篇 md 頁、一篇 html 頁。

### Task 12：建置後驗證腳本

**Files：**
- Create：`site/scripts/{check-links,assert-no-private,report-size}.mjs`、`site/tests/verify-scripts.test.ts`

**Interfaces：**
- Produces：`checkLinks(outDir): Promise<{ broken: { page: string; href: string }[] }>` 檢查站內 `href`、`src` 是否存在對應檔案（含中文與空白的編碼）；`assertNoPrivate(outDir, exclude): void` 發現被排除路徑就丟錯；`reportSize(outDir, limitMb: number): { mb: number; ok: boolean }`，預設門檻 `950`

- [ ] **Step 1：寫會失敗的測試**：故意壞掉的 `out` 樣本（斷連結、含 `private/`、超大檔）各自被偵測到；正常樣本全部通過。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作** 三支腳本，並在 `package.json` 加 `verify` 指令依序執行。
- [ ] **Step 4：執行** 測試通過；對 Task 11 的 fixture 輸出跑 `npm run verify`。
- [ ] **Step 5：檢查點** 對真實 repo 建置後跑 `npm run verify`，把壞連結清單與大小回報給 Abby。

### Task 13：`.html` 原檔批次抽換與畫面比對

**Files：**
- Create：`site/scripts/migrate-html-notes.mjs`、`site/scripts/batch-report.mjs`、`site/tests/migrate-html.test.ts`

**Interfaces：**
- Consumes：Task 10 的 `pruneSharedRules`
- Produces：`migrateHtml(html: string, relPathToAssets: string): string`：刪除與公版重複的 `<style>` 規則（`data-override` 區塊保留），在 `<head>` 加入指向 `note-theme.css` 的相對路徑 `<link>`，在 `</body>` 前加入共用腳本的相對路徑 `<script src>`（已有者不重複加）；文字內容與 body 標記不動。CLI：`node scripts/migrate-html-notes.mjs <glob> [--apply] [--limit N]`，預設 dry-run，工作目錄不乾淨就拒絕；`batch-report.mjs <files...>` 用 Playwright 對每份檔案（git HEAD 版與新版）各截圖並排輸出到 `site/report/`（已加入 `.gitignore`）

- [ ] **Step 1：寫會失敗的測試**：相對路徑依檔案深度計算（根目錄、二層、三層）；重複規則被移除；body 的位元組內容不變；已有 `<link>` 與 `<script>` 不重複；殘缺 html 不丟錯。
- [ ] **Step 2：執行** 測試，預期失敗。
- [ ] **Step 3：實作**。
- [ ] **Step 4：執行** 測試通過；先只對樣板頁 `--apply`，並執行 `batch-report.mjs`。
- [ ] **Step 5：檢查點（停下等 Abby）** 請 Abby 看樣板頁新舊畫面，同意後才可分批（例如每次 20 份）處理其餘 html，每批都產出報告給她看；Obsidian 內要實際開幾份確認沒壞。

### Task 14：GitHub Actions 部署與切換

**Files：**
- Create：`.github/workflows/pages.yml`

**Interfaces：**
- Produces：workflow 步驟依序為 checkout、安裝 Node 與依賴、`npm run build`、`npm run verify`、上傳 `site/out` 為 Pages artifact、部署；只在 `main` 分支觸發

- [ ] **Step 1：寫 workflow**，逐行註解每個步驟與語法。
- [ ] **Step 2：本機模擬** 依序跑 `npm ci && npm run build && npm run verify`，預期全部通過。
- [ ] **Step 3：檢查點（Abby 自己做）** 請 Abby 到 GitHub 儲存庫 Settings → Pages，把 Source 切成 GitHub Actions；這一步我不能代做。
- [ ] **Step 4：驗證** 第一次部署後打開 `github.io` 站點，抽查首頁、一篇 md、一篇 `-互動版` html、一個含圖片的頁面、一個 wikilink。
- [ ] **Step 5：退場** Abby 確認站點正常後，才討論移除 Jekyll 相關檔（`_config.yml` 的樣式與主題設定、`_includes`、`build-index.py`、`index.html`）；`exclude` 清單仍是 Task 6 的資料來源，不能先刪。

## Self-Review 紀錄

| 檢查 | 結果 |
|---|---|
| 設計文件的需求都有任務 | 公版（Task 2、3、4、13）、字距（Task 2）、純 icon 按鈕與同一行（Task 4、5）、scroll-snap（Task 2、4、11）、同名改名（Task 7）、wikilink（Task 8）、Obsidian 語法（Task 9）、html 獨立可開（Task 5、13）、排除清單與私人資料夾（Task 6、12）、站點大小（Task 12）、GitHub Actions（Task 14） |
| 簽名一致 | `NoteEntry` 在 Task 6 定義，Task 7、8 使用；`HighlightKind` 在 Task 3 定義，Task 4 使用；`remarkWikilink` 在 Task 8 定義，Task 9 使用 |
| 本計畫新增、設計文件未寫的決定 | `<style data-override>` 區塊整段保留（用來標示「單篇刻意覆寫」）；`NOTES_ROOT` 環境變數；對比度門檻 2:1；大小門檻 950 MB；`site/report/` 截圖報告；請 Abby 檢查 |
