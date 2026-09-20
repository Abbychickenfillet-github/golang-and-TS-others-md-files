---
title: usePathname 與 useSearchParams — 差在哪，以及為什麼一個會害整站掉成 CSR
type: topic-note
source: Gemini
tags: [gemini, nextjs, app-router, hooks, prerender, bailout, suspense, csr, fcp]
sources:
  - https://gemini.google.com/app/71e6e770a1e5bce3
  - https://gemini.google.com/app/0a254a9c8a7c9b2a
updated: 2026-09-17
---

# usePathname 與 useSearchParams — 差在哪，以及為什麼一個會害整站掉成 CSR

> 本篇重點 a–n，共 14 個（2026-09-17 補入 k-2、k-3：靜態／動態／CSR 三個渲染時機的定義，以及「加不加 Suspense 決定損失範圍」）

> [!info] 互動筆記（需 Obsidian HTML Reader 外掛）
> ![[usePathname與useSearchParams-預渲染Bailout.html]]

## 主軸圖

![[學習NextJS_圖解_useSearchParams預渲染Bailout流程-ISO5807_2026-09-16.svg]]

這張流程圖是本篇的定位座標
後面每一個重點都可以指回圖上的某一個方框
例如「Missing Suspense boundary」那個粉紅色框，就是下面 (h) 在講的那條建置失敗

## 重點整理

### 一、兩個 Hook 各自讀 URL 的哪一段

a. <mark style="background: #ADCCFFA6;">usePathname()</mark> 是 Next.js App Router 提供的 client hook
    它讀取的受詞是 <mark style="background: #FFF3A3A6;">URL 的路徑（Path）</mark>
    回傳型態是字串，回答的問題是「使用者現在站在哪一頁」

b. <mark style="background: #ADCCFFA6;">useSearchParams()</mark> 讀取的受詞是 <mark style="background: #FFF3A3A6;">URL 問號後面的查詢字串（Query String）</mark>
    回傳型態是唯讀物件 `ReadonlyURLSearchParams`，要再用 `.get('key')` 把值取出來
    回答的問題是「使用者這一頁帶了什麼篩選條件」

c. 以網址 `https://example.com/dashboard/products?category=shoes&sort=asc` 為例，兩者切開的位置是這樣

| 比較項目 | usePathname() | useSearchParams() |
| --- | --- | --- |
| 讀到的內容 | `/dashboard/products` | `category=shoes&sort=asc` |
| 回傳型態 | 字串 string | 唯讀物件 ReadonlyURLSearchParams |
| 取值寫法 | 直接當字串用 | 要再呼叫 `.get('category')` |
| 典型用途 | 導覽列高亮目前頁面 | 搜尋關鍵字、商品篩選、分頁切換 |
| 靜態預渲染 | 可以直接用 | 必須包在 Suspense 裡，否則 build 失敗 |
| 口訣 | 想知道「走到哪一頁」 | 想知道「帶了什麼條件」 |

d. `usePathname` 的實作範例，用途是把目前頁面的連結標成紅色

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Navigation() {
  const pathname = usePathname()          // 例如回傳 "/dashboard"

  return (
    <nav>
      <Link
        href="/dashboard"
        style={{ color: pathname === '/dashboard' ? 'red' : 'black' }}
      >
        Dashboard
      </Link>
    </nav>
  )
}
```

e. `useSearchParams` 的實作範例，用途是把 `?category=shoes` 的 `shoes` 取出來顯示

```tsx
'use client'

import { useSearchParams } from 'next/navigation'

export default function SearchResult() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')   // URL 為 ?category=shoes 時回傳 'shoes'

  return <p>當前分類：{category}</p>
}
```

### 二、Bailout 是怎麼發生的（對照主軸圖的右半邊）

f. <mark style="background: #ADCCFFA6;">Bailout（跳船）</mark>指的是
    <mark style="background: #FFF3A3A6;">Next.js 在建置期放棄把某一棵元件樹預渲染成 HTML，把它降級成使用者端渲染（CSR）</mark>
    「跳船」是比喻：靜態預渲染這條船開不下去了，這棵樹自己跳下去用瀏覽器游過去

g. 為什麼只有 `useSearchParams` 會觸發它，關鍵在<mark style="background: #FFF3A3A6;">建置期知不知道這個值</mark>
    路徑 `/dashboard/products` 在 `npm run build` 的當下是寫死在檔案系統裡的，Node.js 算得出來
    查詢字串 `?search=react` 代表未來某一個使用者的請求，<mark style="background: #FF5582A6;">建置期的伺服器根本還沒收到任何請求，不可能知道</mark>

h. 所以只要元件直接呼叫了 `useSearchParams()` 又沒有 `<Suspense>` 接住
    `next build` 會直接拋出這一行錯誤

```
Error: Missing Suspense boundary with useSearchParams
```

i. <mark style="background: #FF5582A6;">災情大小取決於呼叫點的位置有多上層</mark>
    整條 client 元件樹都會被一起拖下水
    <mark style="background: #FFB8EBA6;">實測案例</mark>：Abby 的 `next-one-main` 專案，`LoaderProvider` 寫在 root layout 裡並且呼叫了 `useSearchParams`，結果整站每一頁的 client 樹全部 bailout 成 CSR，FCP 被拖到 5.24 秒
    完整的原始碼層級驗證寫在 [[FCP-5.24秒-Next.js效能診斷實錄-從指令到根因]] 的 Step 7

### 三、三種解法，由輕到重

j. <mark style="background: #BBFABBA6;">解法一：改用 usePathname（最輕量，優先考慮）</mark>
    判斷標準是：這個元件只是想知道「現在在哪一條路由」來切換樣式或決定要不要顯示嗎
    如果是，直接換成 `usePathname` 就好，完全不影響靜態預渲染
    Abby 的 `LoaderProvider` 正是這一種情況，拿掉 `useSearchParams` 換 `usePathname` 就解決了

k. <mark style="background: #BBFABBA6;">解法二：用 &lt;Suspense&gt; 把呼叫點包起來</mark>
    如果真的必須讀 Query String（搜尋欄、篩選器），就把呼叫 `useSearchParams` 的那個 client component 用 `<Suspense>` 包住
    這麼做並不會讓 bailout 消失，而是<mark style="background: #FFF3A3A6;">把損失關在 Suspense 邊界裡</mark>：外層頁面 shell 照常靜態預渲染，只有內部那一小塊在瀏覽器補上

```tsx
import { Suspense } from 'react'
import SearchBar from './search-bar'

export default function Page() {
  return (
    <main>
      {/* 外層保持靜態，只有 SearchBar 這一塊動態載入 */}
      <Suspense fallback={<div>Loading...</div>}>
        <SearchBar />
      </Suspense>
    </main>
  )
}
```

k-2. <mark style="background: #ADCCFFA6;">先把三個渲染時機的名詞定死，才看得懂「加不加 Suspense 差在哪」</mark>（2026-09-17 由 Gemini 對話補入）

| 名詞 | 誰在什麼時候產出 HTML | 拿到的資料是什麼時候的 |
|---|---|---|
| 靜態渲染 Static Rendering | Next.js 在 `next build` 建置時就先生成 HTML，之後每個請求都直接送這份快取 | 建置當下的資料 |
| 動態渲染 Dynamic Rendering | 伺服器在每一個請求進來時才即時生成 HTML | 該次請求當下的最新資料 |
| 使用者端渲染 CSR | 伺服器只送空殼，瀏覽器下載 JS 後才把畫面畫出來 | 瀏覽器執行時的資料 |

    <mark style="background: #FFF3A3A6;">靜態渲染與動態渲染都是「伺服器端」的處理方式</mark>，差別只在算的時間點是建置期還是請求期，不要把「動態渲染」跟「CSR」混為一談。

k-3. <mark style="background: #BBFABBA6;">所以 `<Suspense>` 加不加，決定的是「損失範圍」而不是「有沒有損失」</mark>

| 做法 | 頁面外層 | 讀 Query String 的那一塊 | 代價 |
|---|---|---|---|
| 用 `<Suspense>` 包住呼叫點 | 維持 static／SSR，伺服器先把骨架與靜態 HTML 渲染出來 | 只有這一小塊在瀏覽器補上 | 使用者會先看到 fallback 再看到內容 |
| 不包 `<Suspense>` | 整頁被降級成全動態渲染（Dynamic Rendering） | 跟著整頁一起動態 | 伺服器每收到一次 Request 都要重算整頁，完全享受不到靜態快取 |

    一句話：<mark style="background: #FF5582A6;">兩者不是互相排斥的「二選一」</mark>，而是你在決定「希望哪一部分先在伺服器做完」。
    `useSearchParams` 的本質是在元件中呼叫這個 hook 會通知 Next.js「必須等到參數確認後才能完整呈現」，所以才需要在懸吊邊界（Suspense boundary）處把它隔離起來。

l. <mark style="background: #BBFABBA6;">解法三：改在 Server Component 用 searchParams prop</mark>
    如果讀取點就在 `page.tsx`，根本不需要動用 client hook
    App Router 的 Page 元件原生就會收到一個 `searchParams` prop，直接在伺服器端拿到參數，連 client boundary 都不用開

```tsx
// app/products/page.tsx —— 這是 Server Component，不要加 'use client'
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  return <p>當前分類：{category}</p>
}
```

> ⚠️ 版本差異：Next.js 15 起 `searchParams` 改成 Promise，必須 `await` 才拿得到值
> Next.js 14 及以前是同步物件，可以直接 `searchParams.category`
> 詳見官方 [Page 的 searchParams 說明](https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional)

### 四、判斷順序（遇到 bailout 時照這個順序問自己）

m. 這是一條有先後的檢查流程，所以用數字而不是字母

1. 這個元件真的需要 Query String 嗎？不需要就改 `usePathname`（解法一）
2. 需要，但讀取點在 `page.tsx` 嗎？是的話改用 `searchParams` prop（解法三）
3. 需要，而且一定要在 client component 裡讀嗎？才用 `<Suspense>` 包（解法二）
4. 包完之後，確認 `<Suspense>` 的位置<mark style="background: #FF5582A6;">越低越好</mark>，不要包在 layout 這種每頁都吃到的地方

n. <mark style="background: #D2B3FF;">延伸備註</mark>：bailout 這個詞在 Next.js 文件裡不只一種用法
    本篇講的是<mark style="background: #ADCCFFA6;">預渲染 bailout（prerender bailout）</mark>，發生在建置期
    另外還有 React 自己的 <mark style="background: #ADCCFFA6;">render bailout</mark>（state 沒變就跳過 re-render），那是執行期的事情，兩者不要混在一起

## 關聯筆記（附關聯原因）

- [[FCP-5.24秒-Next.js效能診斷實錄-從指令到根因]] — 本篇 (i) 只給結論「整站 bailout 會讓 FCP 變 5.24 秒」，那篇是同一件事的原始碼層級實證：怎麼用 grep 找到誰在呼叫 `useSearchParams`、`react-dom` 內部怎麼 throw、產物 HTML 裡留下什麼墓碑。本篇是入口，那篇是深潛。
- [[App-Router與Pages-Router-RSC與Streaming-SSR-loading與error約定]] — 本篇 (k)(l) 用到的 `<Suspense>` 與 Server Component 的 `searchParams` prop 都是 App Router 才有的東西，那篇解釋這兩種 Router 的世界觀差在哪。
- [[FCP首次內容繪製-SEO爬蟲與打包五步驟]] — 本篇解釋「為什麼 HTML 裡沒有內容」，那篇解釋「HTML 裡沒有內容會怎樣」（FCP 與爬蟲一起受害）。
- [[nextjs-params-slug動態路由用法]] — 同樣是讀 URL，那篇讀的是動態路由片段 `[slug]`，跟本篇的 path 與 query 合起來才是完整的 URL 三段。
- [[css-兩種卡頓-render-blocking與執行期jank]] — bailout 造成的是「HTML 沒內容」這一種慢，那篇講的是「HTML 有內容但被 CSS 擋住畫不出來」那一種慢，兩種成因要分開查。
- [[05-JSX轉譯機制-createElement與jsx-runtime-Babel與SWC三步驟]] — 呼應 (g)：建置期能做什麼、不能做什麼，是同一條「buildtime 與 runtime 分界線」的兩個切面。

## 相關題目練習

> 這是框架與渲染時機的主題，LeetCode 沒有直接對應題型，以下是概念骨架相同的題目

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 1470. Shuffle the String | https://leetcode.com/problems/shuffle-the-string/ | 練習「值在什麼時間點才拿得到」的依賴順序感，跟 (g) 的建置期／執行期分界同一組直覺 |
| LeetCode 2727. Is Object Empty | https://leetcode.com/problems/is-object-empty/ | `ReadonlyURLSearchParams` 本質是一個唯讀物件，先熟悉 plain object 的取值 |
| NeetCode — Graph 專題 | https://neetcode.io/practice | 元件樹的 bailout 是「一個節點壞掉整條上游受影響」，跟圖的傳播問題同構 |

## 各對話來源（原文）

### Next.js 路由工具差異解析（2026-09 擷取）— https://gemini.google.com/app/71e6e770a1e5bce3

**使用者：** 幫我淺顯易懂的教學 useSearchParams 跟 usePathName 用途跟用法差在哪

**Gemini：** useSearchParams 與 usePathname 都用於獲取當前頁面的 URL 資訊，但專注的位置與用途完全不同。usePathname 讀取 URL 的路徑（Path），主要用於判斷使用者「現在在哪個頁面」；useSearchParams 讀取 URL 的查詢參數（Query String），主要用於取得網址問號後面的資料篩選、分頁或搜尋條件。接著給出對照表（讀取範圍、傳回型態、常見情境、伺服器預渲染需求）與兩段程式碼範例：usePathname 用來設定選單高亮，useSearchParams 需搭配 `.get()` 獲取特定參數。簡單口訣是「想知道走到哪一頁用 usePathname，想知道帶了什麼條件用 useSearchParams」。

**使用者：** 拿掉 LoaderProvider 的 useSearchParams（usePathname 就夠用且不會 bailout）有人遇到 useSearchParams bailout 的問題過嗎

**Gemini：** useSearchParams 造成 Prerender Bailout（靜態渲染失效）是 Next.js App Router 社群中非常經典且常見的陷阱。為什麼會發生：在生產環境構建或靜態預渲染時，伺服器會嘗試將頁面事先打包成 HTML；usePathname 的路徑在構建時是固定且可預測的，因此可以安心預渲染；useSearchParams 的查詢參數代表動態的使用者請求資料，在伺服器靜態打包的當下不可能知道使用者未來會帶什麼 Query String 進來。因此一旦元件直接使用了 useSearchParams()，Next.js 會認定這個元件無法在靜態打包時完成渲染，將包含該元件的整條 Client 元件樹跳出靜態渲染，轉為用戶端渲染。如果沒有用 `<Suspense>` 包覆，在 next build 時會直接拋出 `Missing Suspense boundary with useSearchParams`。常見解決方案有三個：（1）替換為 usePathname，最輕量，完全不影響靜態導出與預渲染效能；（2）加上 `<Suspense>` 包覆，讓外層頁面保持靜態渲染，僅內部動態載入；（3）改用 Server Component 的 searchParams prop，在 Server 端獲取參數，避免 Client Component 的 Hook 導致全頁 Bailout。

### 安裝 Git Graph 擴充功能（2026-09-17 擷取，後半段轉為 Next.js 討論）— https://gemini.google.com/app/0a254a9c8a7c9b2a

**使用者：** 點 next/navigation 跟原生的 navigation 物件的差異是什麼？

**Gemini：** 在 React 中「next/navigation」和傳統的導航物件最大的差異在於，Next.js 透過 hooks 進行客戶端路由轉換，不需要重新載入頁面，並能保留 React 狀態；而原生的導航物件若直接修改，通常會導致整頁刷新，重置應用程式。

**使用者：** 但是 next 的 navigation 在社群上面還是有很多問題啊

**Gemini：** 確實，很多開發者在社群討論中會提到 `useSearchParams` 的一些陷阱，像是需要搭配 Suspense 或與頁面渲染機制的配合問題。

**使用者：** 這是 bail out 啊，就是我的 server 端沒有辦法渲染出 HTML，是不是因為那個跟 Suspense、非同步處理的元件打架啊？他們兩個真的是衝突嗎？

**Gemini：** 使用 `useSearchParams` 的確會讓伺服器端跳過靜態渲染，改為動態渲染或客戶端渲染。它們不是打架，而是因為在元件中呼叫此 hook 會通知 Next.js 必須等到參數確認後才能完整呈現，所以才會需要在懸吊邊界處使用 Suspense。

**使用者：** 靜態渲染是 SSR 嗎？還是動態渲染？

**Gemini：** 靜態渲染是指在建置時就先生成 HTML，而動態渲染則是在每個請求時才在伺服器端生成。兩者都是伺服器端的處理方式，但動態渲染會根據最新的資料進行計算。

**使用者：** 原來他們是二擇一嗎？

**Gemini：** 也不是完全互相排斥，而是要看你希望「哪一部分」在伺服器先做完。使用 Suspense 封裝：你可以保留頁面大部分內容為 static/SSR（伺服器預先渲染出骨架與靜態 HTML），只有包裹在 `<Suspense>` 裡面的元件是在客戶端載入 `useSearchParams`，這能兼顧首頁速度與動態需求。不使用 Suspense：整個頁面會直接被降級為全動態渲染（Dynamic Rendering），伺服器每次收到 Request 都得重新為你計算整個頁面，無法享受到靜態快取的好處。簡言之，你可以透過加不加 `<Suspense>`，來決定要「局部放客戶端處理」還是「整個頁面做動態渲染」。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話（Next.js 路由工具差異解析） | https://gemini.google.com/app/71e6e770a1e5bce3 | Gemini Flash，2026-09-16 擷取 |
| 本篇 k-2、k-3 的 Gemini 對話（安裝 Git Graph 擴充功能，後半段轉 Next.js） | https://gemini.google.com/app/0a254a9c8a7c9b2a | Gemini Flash，2026-09-17 擷取 |
| Next.js 官方 — Partial Prerendering 與 Static／Dynamic Rendering 定義 | https://nextjs.org/docs/app/getting-started/partial-prerendering | Next.js 現行文件，2026-09-17 查證 |
| Next.js 官方 — useSearchParams（含 Static Rendering 與 Suspense 說明） | https://nextjs.org/docs/app/api-reference/functions/use-search-params | Next.js 現行文件，2026-09-16 查證 |
| Next.js 官方 — usePathname | https://nextjs.org/docs/app/api-reference/functions/use-pathname | Next.js 現行文件，2026-09-16 查證 |
| Next.js 官方 — 錯誤訊息 Missing Suspense boundary with useSearchParams | https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout | Next.js 現行文件，2026-09-16 查證 |
| Next.js 官方 — Page 的 searchParams prop（Next 15 起是 Promise） | https://nextjs.org/docs/app/api-reference/file-conventions/page | Next.js 現行文件，2026-09-16 查證 |
| React 官方 — Suspense | https://react.dev/reference/react/Suspense | React 現行文件，2026-09-16 查證 |
| 本 vault 同專案實測 | frontend-docs/nextjs/FCP-5.24秒-Next.js效能診斷實錄-從指令到根因.md | 2026-09-16 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-17
