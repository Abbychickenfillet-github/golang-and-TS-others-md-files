---
title: Prerender 預渲染與 CSR Bailout — HTML 到 DOM 了嗎，降級成使用者端渲染還算預渲染嗎
type: topic-note
source: Claude 對話與官方文件
tags: [nextjs, prerender, bailout, csr, hydration, suspense, next-build, dom]
updated: 2026-10-26
---

# Prerender 預渲染與 CSR Bailout

> 本篇重點 a–g，共 7 個

> [!info] 互動筆記（滑鼠移到名詞上看解釋、時間線可點擊、有填空與是非題）
> ![[nextjs-prerender-and-csr-bailout.html]]

## 主軸圖

![[流程圖_Prerender與CSR-Bailout關係_2026-10-26.svg]]

這張圖是本篇的定位座標，下面 d 與 e 都指回圖上的方框。

## a. 三個問題的答案

| 問題 | 答案 | 看哪一節 |
| --- | --- | --- |
| Prerender 是什麼 | 在建置期（或重新驗證的背景中）先執行元件函式，把結果存成 HTML 與 RSC Payload | b |
| 預渲染出的 HTML 到 DOM 了嗎 | 還沒。HTML 是文字，瀏覽器解析後才有 DOM，Hydration 再接上事件 | c |
| 降級成使用者端渲染算預渲染嗎 | 不算。Bailout 是某棵子樹被放棄預渲染。`'use client'` 的元件本身照樣被預渲染 | d |

## b. Prerender 的定義

| 名稱 | 什麼時候渲染，在哪裡執行元件函式 | 官方詞彙表歸類 |
| --- | --- | --- |
| Prerender 預渲染 | 建置時，或重新驗證的背景中，在 Node.js | Prerendering，也稱 Static rendering |
| SSG | 建置時 | 預渲染的一種做法 |
| SSR | 每個請求進來時，在伺服器的 Node.js | Dynamic rendering，不叫 Prerendering |
| CSR | 瀏覽器執行 JS 之後 | 不在伺服器渲染 |

| 名詞 | 意思 |
| --- | --- |
| 渲染 render | 依 props 與 state 呼叫元件函式得到 UI 描述。伺服器端再序列化成 HTML 字串與 RSC Payload。不等於瀏覽器畫出畫面（那是 Paint） |
| 執行元件函式 | 呼叫 Page() 這類函式並取得回傳的 JSX，是渲染的第一步。預渲染時發生在 Node.js |

> [!warning] 存疑與更正
> 舊筆記寫「廣義上 SSR 也算預渲染」，但 Next.js 詞彙表（頁面標示 2026-10-01）把 Prerendering 限定在建置時或重新驗證的背景，請求當下渲染的叫 Dynamic rendering。本篇以官方詞彙表為準。

預渲染的結果是檔案，所以可放 CDN，第一份 HTML 就有內容，FCP 不必等 JS，爬蟲也讀得到文字。

## c. 時間線：HTML 什麼時候變成 DOM

| 步驟 | 有 DOM 嗎 | JS 狀態 | 使用者看到 |
| --- | --- | --- | --- |
| 1 建置期執行元件函式 | 沒有，Node.js 沒有 document | 只在 Node 跑 | 沒有人在看 |
| 2 伺服器或 CDN 送出檔案 | 沒有 | 沒有 | 等待中 |
| 3 網路傳輸 HTML | 沒有，只是位元組 | 沒有 | 等待中 |
| 4 瀏覽器解析成 DOM | 有，DOM 在這一步誕生 | 還沒接手 | 通常仍是白的 |
| 5 CSS 解析成 CSSOM | 有 | 還沒接手 | 仍是白的，CSSOM 沒好不繪製 |
| 6 Layout 與 Paint | 有 | 還沒接手 | 看到內容但按不動，這刻是 FCP |
| 7 下載並執行 JS | 有，仍是同一份 | 下載與執行中 | 內容在，按鈕沒反應 |
| 8 Hydration | 有，被認領而不是重建 | 已接手 | 可互動，TTI 到達 |

第 7 步的下載實務上常與解析 HTML 並行，這裡畫的是執行的先後，依據本 vault 的 SSR 筆記，未另查官方出處。

## d. CSR Bailout 算不算預渲染

| 情境 | 建置期有預渲染嗎 | HTML 裡有什麼 | Hydration 時 |
| --- | --- | --- | --- |
| Server Component | 有 | 完整內容 | 不需要，JS 不送到瀏覽器 |
| Client Component（正常） | 有 | 完整內容 | 認領既有 DOM 並掛事件 |
| 被 Bailout 的 Client 子樹 | 沒有 | 最近 Suspense 的 fallback 或空殼 | React 在瀏覽器重試渲染並取代 fallback |
| Suspense 以外的部分 | 有 | 完整內容 | 認領既有 DOM |

**常見觸發原因**

| 觸發點 | 為什麼建置期做不到 | 處理 | 依據 |
| --- | --- | --- | --- |
| `useSearchParams()` 外面沒有 Suspense | 查詢字串是請求時才有的資料 | 最小範圍的 Suspense 包住呼叫點，或用 page 的 `searchParams` prop，或改 `usePathname` | Next.js 錯誤頁與 useSearchParams 文件，已查證 |
| `next/dynamic` 設 `ssr: false` | 明確要求跳過預渲染 | 只用在真的需要瀏覽器 API 的元件 | Lazy Loading 文件已查證。next 15.5.28 原始碼 `dynamic-bailout-to-csr.js` 處理此選項 |
| 元件在伺服器渲染時 throw | 被最近 Suspense 接住，HTML 放 fallback | 刻意做法才保留 | React Suspense 文件，已查證 |
| 其他觸發原因 | 未查證 | 未查證 | 不在本次查證範圍 |

**你專案的實例（已打開檔案確認）**

| 位置 | 實際內容 | 說明 |
| --- | --- | --- |
| `hooks/use-loader/index.js` | 提交 dd2b895（2026-09-17）移除 `LoaderProvider` 的 `useSearchParams`，現在只用 `usePathname`。頂端兩個 loader 用 `dynamic(..., { ssr: false })` | 「useSearchParams 與 Suspense 打架」真正發生的檔案，由 `app/providers.js` 放在全域 |
| `app/dashboard/page.js` | 第 1 行 `'use client'`，整檔沒有 `useSearchParams`。第 89 到 95 行、374 到 380 行有帶 fallback 的 Suspense，第 1109 行載入中 `return null` | 它不是觸發點，是被全域 Provider 拖下水。FCP 5.24 秒的主因是 682 KB 的 render-blocking CSS，Bailout 主要拖慢 LCP |
| `app/layout.js` | 第 34 行 `<Suspense>` 沒有 fallback，包著 `Providers` | Bailout 時 HTML 只剩空殼，Suspense 外的 Footer 才有內容 |
| `app/ecpay/callback/page.js` 等四頁 | 匯出的頁面元件用帶 fallback 的 Suspense 包住呼叫 `useSearchParams` 的元件 | 正確寫法，Bailout 被關在 Suspense 裡 |
| `app/ship/_hooks/use-ship-711-store/index.js` | 沒有 `useSearchParams`、`Suspense`、`ssr: false`，也沒有 `'use client'` | 不是 Bailout 觸發點。提交 dd2b895 改的是 `hooks/use-loader/index.js`，不是這個檔案 |

dashboard 當時 HTML 的內容（Footer 有、Navbar 沒有、BAILOUT 墓碑）來自 [[FCP-5.24秒-Next.js效能診斷實錄-從指令到根因]] 的 Step 6，本次沒有重跑 build，沒有重新驗證那份 .next 產物。

## e. 流程圖怎麼讀

| 圖上方框 | 意思 |
| --- | --- |
| 判斷「渲染途中碰到建置期無法得知的東西」 | Bailout 的入口，否則走完整預渲染 |
| 判斷「外層有 Suspense 包住」 | 有則只放棄這棵子樹，沒有則 `next build` 報 Missing Suspense boundary（官方說明整頁會變 CSR） |
| 判斷「這棵子樹的 HTML 是預渲染的結果嗎」 | 是則 Hydration 認領，否則瀏覽器端重新渲染 |

## f. npm run build 看到 prerender 錯誤怎麼讀

Prerender 發生在建置期，元件會在 Node.js 裡真的執行一遍。`next dev` 是按需渲染，官方明說 dev 裡 `useSearchParams` 不會 suspend，所以 dev 正常不代表 build 會過。

| build 輸出可能的樣子 | 意思 | 先做什麼 | 查證狀態 |
| --- | --- | --- | --- |
| `Missing Suspense boundary with useSearchParams` | 靜態路由裡 Client 元件呼叫 `useSearchParams()` 沒有 Suspense | 用最小範圍的 Suspense 包住。找不到位置就加 `next build --debug-prerender` | 已查證 |
| `window is not defined` 或 `document is not defined` | 元件本體或模組頂層在 Node 預渲染時碰了瀏覽器 API | 移進 `useEffect`，或該元件改 `ssr: false` | 原理已查證，訊息字樣未查證 |
| `Error occurred prerendering page "/xxx"` | 某路徑預渲染丟例外的總括訊息 | 往上找第一個真正的 error | 字樣未查證 |
| build 時抓資料失敗 | Server Component 的 fetch 在建置期就執行 | 確認 build 環境連得到資料來源 | 推論，未查證 |

> [!question] 還缺你的實際訊息
> 我在你的終端機沒看到 build 輸出，無法判定是哪一種。貼上 `npm run build` 第一個 error 的幾行才能對到檔案。

## g. 名詞 hover 規格

完整規格、與 React 元件化的比較、現有名詞表都在互動版 HTML 的最後一節。這裡只記關鍵。

| 項目 | 做法 |
| --- | --- |
| 單一名詞表 | `nextjs-terms.js` 的 `window.NOTE_TERMS`，欄位 `t` 名稱、`d` 定義、`s` 依據 |
| 內文標記 | `<span class="term" data-term="hydration">Hydration</span>` |
| 顯示 | 沿用 `assets/notes.css` 的 `.term` 與 `data-def`，純 CSS 的 hover 與 focus |
| 窄螢幕 | 寬度 900px 以下氣泡改成貼底的固定面板 |
| Obsidian 的 .md | 不執行 JS，要用 `.obsidian/snippets/term-tooltip.css` 加手動 `data-def` |
| 未來 React | `NOTE_TERMS` 存成 `terms.json`，`<Term id="hydration" />` 讀同一份，可當 Server Component，不增加瀏覽器端 JS |

## h. RSC Payload 長怎樣

動畫在互動版 HTML 的最後一節。來源：Next.js Server and Client Components，2026-10-05。格式為示意，非官方規範。

```text
1:I["app/ui/like-button.js", ["static/chunks/like-button.js"], "default"]
0:["$","main",null,{"children":[
  ["$","h1",null,{"children":"Hello"}],
  ["$","$L1",null,{"likes":12}]
]}]
```

| 內容 | 對應 |
| --- | --- |
| Server 的渲染結果 | `h1` 與 Hello |
| Client 的位置標記與 JS 參照 | `$L1` 與 `I[...]` |
| 傳給 Client 的 props | `{"likes":12}` |

**為什麼塞在 script 標籤裡**（推論，官方該頁只說用途，沒說為什麼放這裡）

| 原因 | 說明 |
| --- | --- |
| script 裡的文字不會顯示 | 瀏覽器不把它當內容畫出來，也不影響 HTML 的版面 |
| 瀏覽器重算不出來 | Server 的 fetch、資料庫、金鑰都在伺服器，瀏覽器只能拿現成結果 |
| 同一次回應帶來 | 不用 Hydration 時再多發一次請求 |

## 關聯筆記

- [[usePathname與useSearchParams-預渲染Bailout]]：你引用的那句「建置期放棄預渲染」出自該篇的 f，本篇補上 Prerender 定義與時間線。
- [[FCP-5.24秒-Next.js效能診斷實錄-從指令到根因]]：提供 dashboard 的原始碼層級實證與 FCP 責任歸屬。
- [[FCP首次內容繪製-SEO爬蟲與打包五步驟]]：說明 HTML 沒內容為何讓 FCP 與爬蟲一起受害。
- [[SSR-renderToString與Hydration-伺服器端渲染流程]]：時間線第 3 到 8 步的來源，伺服器沒有 DOM、Hydration 認領。
- [[編譯期vs執行期三條分界線-AST與CSSOM-編譯與打包-前端與後端記憶體]]：預渲染發生在建置期，該篇說明建置期能做與不能做什麼。
- [[Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪]]：時間線第 4 到 6 步的 DOM、CSSOM、Layout、Paint 細節。
- [[App-Router與Pages-Router-RSC與Streaming-SSR-loading與error約定]]：Suspense 與 Server Component 的背景。
- [[nextjs-crawler-html-vs-browser-dom-animation]]：接續本篇，預渲染的 HTML 文字就是爬蟲拿到的那份，用動畫對照爬蟲與瀏覽器。
- [[nextjs-ssg-and-headless-cms]]：SSG 是建置期預渲染，說明與 headless 的關係和 ISR。
- [[url-parse-vs-url-class-parse-legacy-vs-whatwg]]：build 出現的 Node 棄用警告，與建置期程式碼跑在 Node 是同一個原因。

## 資料來源（含查證時間）

查閱日 2026-10-26。

| 主題 | 連結 | 頁面標示的更新日期 |
| --- | --- | --- |
| Next.js 詞彙表 | https://nextjs.org/docs/app/glossary | 2026-10-01 |
| Next.js Server and Client Components | https://nextjs.org/docs/app/getting-started/server-and-client-components | 2026-10-05 |
| Next.js Missing Suspense boundary with useSearchParams | https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout | 頁面未標示，查閱日 2026-10-26 |
| Next.js Lazy Loading（next/dynamic） | https://nextjs.org/docs/app/guides/lazy-loading | 2026-03-10 |
| Next.js useSearchParams | https://nextjs.org/docs/app/api-reference/functions/use-search-params | 2026-07-14 |
| React hydrateRoot | https://react.dev/reference/react-dom/client/hydrateRoot | 頁面未標示，查閱日 2026-10-26 |
| React renderToString | https://react.dev/reference/react-dom/server/renderToString | 頁面未標示，查閱日 2026-10-26 |
| React Suspense | https://react.dev/reference/react/Suspense | 頁面未標示，查閱日 2026-10-26 |
| 專案實測 | git 提交 dd2b895、hooks/use-loader/index.js、app/dashboard/page.js、app/layout.js、node_modules/next 15.5.28 | 查閱日 2026-10-26 |

**未查證**：build 輸出 `window is not defined` 與 `Error occurred prerendering page` 的確切字樣、Bailout 的其他觸發原因、JS 實際開始下載的時間點、dashboard 的 .next 產物本次未重跑 build、`localhost:3001` 沒有在執行所以沒有 DevTools 截圖。
