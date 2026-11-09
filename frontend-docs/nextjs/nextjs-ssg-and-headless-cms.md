---
title: SSG 與 Headless CMS — 為什麼常一起出現，但其實是兩件事
type: topic-note
source: Next.js 官方文件與 Claude 整理
tags: [nextjs, ssg, headless-cms, isr, gatsby, revalidate]
updated: 2026-10-26
---

# SSG 與 Headless CMS

> 本篇重點 a–f，共 6 個

> [!info] 互動版（四象限、填空、是非、申論）
> ![[nextjs-ssg-and-headless-cms.html]]

## a. 答案

為什麼無頭就是跟 SSG：不是「就是」。Headless 管內容放在哪裡、怎麼取得。SSG 管 HTML 什麼時候產生。兩者可獨立選擇，常搭配是因為 headless 把內容變成 API，需要有東西把內容變成頁面，而 SSG 在建置時做完，結果是檔案，可放 CDN。

## b. 兩個概念

| 項目 | Headless CMS | SSG |
| --- | --- | --- |
| 回答的問題 | 內容存在哪，誰編輯，怎麼給前端 | HTML 在哪一刻、由誰產生 |
| 分離的是什麼 | 內容後台與前端展示層，內容走 API | 建置期與請求期 |
| 另一邊的選擇 | 前端可用 CSR、SSR、SSG | 內容可來自檔案、資料庫、API |

四象限：Headless 加 SSG 是最常見組合。你的 Abby-notes 用 Jekyll 轉 GitHub Pages 是 SSG 但沒有 CMS。其他象限的產品舉例未查證。

## c. 為什麼常搭配

| 理由 | 依據 |
| --- | --- |
| 需要有人把 API 內容變成頁面，建置時做最簡單 | 整理 |
| 預渲染的結果是 HTML 與 RSC Payload，可快取並由 CDN 送出 | Next.js 詞彙表，2026-10-01 |
| Static export 可部署在任何靜態主機 | Next.js Static Exports，2026-08-09 |
| 大部分請求送靜態頁，伺服器負載小 | Next.js ISR，2026-10-15 |
| 更安全 | 未查證 |

## d. 代價與解法

SSG 頁面建置時定案，CMS 改內容網站不會自己變。解法是 ISR。

| 做法 | 運作 | 寫法 |
| --- | --- | --- |
| 時間型 | 過期後下一個請求仍回舊頁，背景重新產生，成功後換掉 | `export const revalidate = 3600` |
| 按需，整頁 | 讓該路徑快取失效，下一次請求才重新產生 | `revalidatePath('/posts')` |
| 按需，標籤 | 讓帶該標籤的資料失效 | `revalidateTag('posts', 'max')` |

官方範例放在 Server Action，也可放在 Route Handler。讓 CMS 在發佈時呼叫它是常見接法，官方頁未寫 CMS。Static export 不支援 ISR。多實例時按需重新驗證只讓收到呼叫的實例失效。

## e. 四種方式對照

| 方式 | HTML 何時產生 | 誰產生 | 新鮮度 | 更新內容 |
| --- | --- | --- | --- | --- |
| CSR | 瀏覽器執行 JS 之後 | 瀏覽器 | 每次最新，但要等 JS | 不需動作 |
| SSR | 每個請求 | 伺服器 | 每個請求最新 | 不需動作 |
| SSG | 建置時 | 建置機器 | 建置當下快照 | 重新建置 |
| ISR | 建置時先產，之後背景重新產生 | 建置機器加伺服器 | 可設定過期或按需失效 | 自動或按需 |

官方詞彙表把請求時渲染稱為 Dynamic rendering，Prerendering 限建置時或背景重新驗證，所以 SSR 官方歸類不是 Prerendering。

## f. 2021 年影片，哪些後來有變

影片本體找不到，沒有逐字稿，不引用影片其他內容。影片連結待補：（待補）。

| 項目 | 內容 | 狀態 |
| --- | --- | --- |
| 影片引述 | 「If you're going to go headless … JavaScript frameworks are evolving all the time」 | 引自使用者，未對照影片 |
| 我的解釋 | Headless 讓內容與前端框架解耦，框架一直變，內容留在 CMS | 解釋，不是影片原意 |
| ISR | Pages Router 的 ISR 在 v9.5.0 穩定，按需 ISR 在 v12.2.0 穩定 | 版本已查證，年份未查證 |
| App Router | v13.0.0 引入，v13.4.0 起穩定並支援 Static Export 搭配 Server Components | 已查證 |
| next export | v14.0.0 起移除，改設 `output: 'export'` | 已查證 |
| Gatsby | Netlify 說 Gatsby Cloud 將結束服務，不影響 Gatsby JS，Gatsby JS 持續維護。GitHub 最新發行 5.16.1，頁面標 Latest，只顯示 10 Feb 無年份 | Netlify 頁無發布日期。年份為推論 |

## 關聯筆記

- [[nextjs-prerender-and-csr-bailout]]：SSG 就是建置期的預渲染，ISR 是預渲染的背景重新產生。
- [[SSR-renderToString與Hydration-伺服器端渲染流程]]：CSR、SSR、SSG 對照表的來源。
- [[YAML-Frontmatter與SSG-Foreword-Preface概念]]：Markdown 加模板的 SSG，是內容為檔案那一格。
- [[gatsby-static-site-generator]]：Gatsby 是 SSG 工具，本篇補上現況。
- [[TipTap-Headless編輯器架構]]：同樣叫 headless，但指沒有預設 UI 的元件庫，與 headless CMS 意思不同。

## 資料來源（含查證時間）

查閱日 2026-10-26。

| 主題 | 連結 | 頁面標示的日期 |
| --- | --- | --- |
| Next.js ISR | https://nextjs.org/docs/app/guides/incremental-static-regeneration | 2026-10-15 |
| Next.js Static Exports | https://nextjs.org/docs/app/guides/static-exports | 2026-08-09 |
| Next.js 詞彙表 | https://nextjs.org/docs/app/glossary | 2026-10-01 |
| Netlify：Gatsby Cloud 的演進 | https://www.netlify.com/blog/gatsby-cloud-evolution/ | 文章未標發布日期 |
| Gatsby releases | https://github.com/gatsbyjs/gatsby/releases | 最新 5.16.1，無年份 |

**未查證**：影片本體與逐字內容、SSG 更安全的說法、四象限的產品舉例、ISR 發布年份、Gatsby JS 實際維護活躍度。
