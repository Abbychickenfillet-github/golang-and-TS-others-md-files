---
title: main.tsx進入點-與globals-css的關係
type: concept
updated: 2026-08-14
tags:
  - react
  - vite
  - 進入點
  - css
---

# `main.tsx` 是什麼？跟 `globals.css` 差在哪？

> 本篇重點 a–k，共 11 個
> 相關：[[04-4-ITCSS實戰盤點-official-website全域檔]]（globals.css 的內容盤點）、[[index-explanation]]、[[index.ts-intro]]、[[11-記憶體模型-stack-heap-動態配置-GC]]
> 實例：`C:\coding\futuresign\futuresign.official_website\src\main.tsx`（73 行，實測 2026-07-20）

---

## 一‧先修正提問前提

**(a)** 這兩個**不是同類東西的兩個選項**，是「誰載入誰」的關係。
就像不會問「電源線跟燈泡差在哪」——一個是通道，一個是內容物。

| 比較項 | `src/styles/globals.css` | `src/main.tsx` |
|---|---|---|
| 語言 | CSS | TypeScript + JSX |
| 角色 | 樣式資料（被動，自己不會執行） | 應用程式進入點（主動，瀏覽器從這裡開始跑） |
| 誰載入它 | 被 `main.tsx` 第 7 行 import | 被 `index.html` 第 78 行 `<script type="module" src="/src/main.tsx">` 載入 |
| 拿掉會怎樣 | 網站還能動，但變成裸 HTML（沒顏色沒排版） | 整個網站空白，`<div id="root">` 永遠是空的 |

**(b)** 啟動鏈：

```
index.html  →  main.tsx  →  App.tsx  →  各頁面元件
                  ↓
            globals.css（順手掛上去的樣式）
```

**(c)** 所以 `globals.css` 不是「被 Vite 自動找到」的，是**有人明確寫了一行 import 才生效**。
這也是為什麼 [[04-4-ITCSS實戰盤點-official-website全域檔]] 裡根目錄那份 `styles/globals.css` 是死檔——沒人 import 它。

---

## 二‧main.tsx 不是「搞 API 用的」

**(d)** API 設定只是它順手做的其中一件事。實測這支 73 行的檔案做了 5 件事：

| 行數 | 做的事 | 屬於 API 嗎 |
|---|---|---|
| L7 | `import './styles/globals.css'` — 唯一讓全站 CSS 生效的一行 | 否 |
| L15–29 | 設定 `OpenAPI.BASE`（後端網址）、`OpenAPI.TOKEN`（從 localStorage 取 JWT） | 是，只有這段 |
| L32 | `initializeAnalytics()` 啟動 GA4 | 否 |
| L36–54 | 監聽 `vite:preloadError`，chunk 載入失敗時自動 reload 一次 | 否 |
| L56–72 | `ReactDOM.createRoot(...).render(...)` 把 React 掛上 `#root`，外層包 Router / Providers / Toaster | 否 |

**(e)** 它真正的身分是「**開機腳本 / bootstrap**」：所有「整個 App 只要做一次」的事都塞在這裡。

**(f)** 判斷某段 code 該不該放 main.tsx 的標準：
> **「這件事是不是全站只做一次、而且要在畫面出現前做完？」**
> 是 → 放 main.tsx；不是 → 放元件或 hook 裡。

API base URL 符合（全站共用、設一次），GA 初始化符合，CSS 載入符合，所以它們都住這。

---

## 三‧順帶學到的兩個實務點

**(g)** Vite 環境變數**必須以 `VITE_` 開頭**才會被編譯進前端。
專案裡這行註解就是踩過坑：只寫 `API_BASE_URL` 的話 Vite 編譯時直接忽略，前端完全抓不到值。
```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
```

**(h)** `OpenAPI.TOKEN` 設成 **async function 而不是字串**，是為了每次發 request 時**即時去 localStorage 讀**。
若設成字串，token 會停在 App 啟動那一刻的值，登入後不會更新。

**(i)** L36–54 的 chunk reload 機制解決的是部署常見問題：使用者停在舊分頁，舊 `index.html` 引用的 hash 檔名已被新版刪掉 →
動態 import 失敗 → 用 `sessionStorage` 旗標**只自動 reload 一次**（避免無限迴圈）取得新版本。

---

## 四‧追問：(i) 提到的「動態 import」是什麼，跟 heap 的「動態配置」是同一件事嗎

**(j)** <mark style="background: #FF5582A6;">不是同一件事，這是跟上次[[index.ts-intro]]那篇「index.html跟index.ts撞名」一樣的陷阱——「動態」這個字同時出現在兩個完全不同的層次，純粹是字面上的巧合，不是同一個機制的兩種說法。</mark>

a. <mark style="background: #FFF3A3A6;">Dynamic Import（動態匯入）——模組載入層</mark>：這是JavaScript語法本身的一個功能，跟`import x from 'y'`這種**靜態匯入**（Static Import）相對。靜態匯入必須寫在檔案最上方、路徑是固定字串，打包工具（Vite）在**編譯階段**就能分析出「這個檔案依賴哪些模組」，直接把它們全部打包進同一包JS檔。動態匯入的寫法是`import('./SomePage')`——它是一個**函式呼叫**，可以寫在程式碼的任何地方（例如點擊按鈕的callback裡），回傳一個`Promise`，只有在**程式實際執行到這行、真的呼叫它的當下**才會去跟伺服器要那個檔案。這讓Vite可以把這個模組獨立打包成一個「chunk」（切出來的小包），首次載入頁面時完全不用下載它，等使用者真的點到那個功能才臨時抓——這就是常聽到的「懶載入」（Lazy Loading）、「code-splitting」（程式碼分割）的底層機制，React的`React.lazy()`內部用的就是這個。(i)講的「動態import失敗」，就是使用者停留在舊分頁太久，程式想`import('./SomePage-xxhash.js')`去跟伺服器要這個chunk檔案，但新版部署已經把這個舊hash檔名的檔案從伺服器上刪掉了，所以這個`Promise`會reject，觸發後面的自動reload邏輯。
b. <mark style="background: #FFF3A3A6;">Dynamic Allocation（動態配置）——記憶體管理層</mark>：這是[[11-記憶體模型-stack-heap-動態配置-GC]]講的概念，指的是JS引擎在**程式執行期間**，依照實際需要，在Heap這塊記憶體區域裡即時開闢空間存放物件／陣列這類大小不固定的資料（相對於Stack那種在編譯期就能算出固定大小、進出都是機械化推疊的配置方式）。這件事發生在JS引擎內部處理**單一個值**要放哪裡的層次，完全不涉及「要不要跟伺服器要一個新的JS檔案」這件事。
c. <mark style="background: #ADCCFFA6;">兩者的關係只有「都用了『動態』這個字」</mark>——一個是「要不要在瀏覽器執行到這行的當下才去網路上抓一包JS檔案」（屬於Vite/瀏覽器的模組載入層），一個是「JS引擎執行時把某個值放進Heap的哪個位址」（屬於引擎內部的記憶體管理層），兩者運作的時間點、解決的問題、涉及的角色完全不同，只是剛好都用「動態」（dynamic）這個形容詞，因為兩者都有「不是提前寫死、而是執行當下才決定」這個共同精神，但那只是命名上的巧合，不代表機制相通。

## 五‧追問：index.html跟main.tsx的關係是「等於」嗎

**(k)** <mark style="background: #FF5582A6;">不是「等於」（=），是「載入」（誰去讀誰）的關係——這點在(a)(b)已經講過，這裡把「為什麼容易誤會成等於」的原因講清楚。</mark>

a. <mark style="background: #FFF3A3A6;">`index.html`才是「傳統原生」的那一半，`main.tsx`不是</mark>——`index.html`是純HTML檔案，這個格式跟慣例從全球資訊網最早期就存在，任何網站（不管有沒有用React／Vite這類現代前端框架）都一定會有某個HTML檔案是瀏覽器實際載入、顯示的起點，`index.html`只是**這個角色的檔名慣例**。而`main.tsx`完全是Vite／React專案模板自己選的檔名，不是網頁技術與生俱來的東西——拿掉React改寫成Vue、Svelte，或甚至寫最原始的純HTML+JS網站，都完全不需要`main.tsx`這個檔案，但`index.html`（或某個扮演它角色的HTML檔）幾乎一定存在。
b. <mark style="background: #ADCCFFA6;">而且這跟上次[[index.ts-intro]]講的`index`慣例其實是同一個源頭</mark>——早期的網頁伺服器（例如Apache）有個慣例：使用者訪問一個資料夾網址（例如`example.com/`，沒指定檔名）時，伺服器預設會去找一個叫`index.html`的檔案回傳給瀏覽器，這是`index`這個字最早、最原始的「預設檔名」用法，比JS/Node.js的模組解析規則早了非常多年。後來Node.js設計`require('./資料夾')`要去找預設檔案時，直接借用了同一套「找一個叫index的檔案」的命名精神，才有了[[index.ts-intro]]講的`index.ts`慣例。所以`index.html`跟`index.ts`share的不只是字面上剛好同名，是真的有歷史傳承關係——`index.ts`的命名慣例是`index.html`那套網頁伺服器慣例的後代。
c. <mark style="background: #FF5582A6;">但`index.html`載入`main.tsx`這件事本身不是慣例、是寫死的</mark>——`index.html`裡那行`<script type="module" src="/src/main.tsx">`是Vite專案模板產生時**明確寫進去的一行程式碼**，不是模組解析器自動去找的，`main.tsx`這個檔名完全可以被改成別的名字（改完連同這行`src`路徑一起改就好），跟`index.ts`那種「只要資料夾路徑被import、自動去找`index`檔案」的隱性規則完全不同——一個是顯性寫死的參照，一個是隱性自動的查找規則，兩者都跟`index.html`有關係，但關係的性質不一樣，不能混為一談。

一句話：<mark style="background: #FF5582A6;">`index.html`是網頁與生俱來、任何前端技術都會有的那個「起點檔案」，這個角色跟`index.ts`資料夾預設查找規則同源，都源自「找一個叫index的檔案」這個網頁伺服器老慣例；而`main.tsx`是React／Vite專案自己選的檔名，被`index.html`用一行明寫的`<script>`標籤指名載入，這個「指名載入」的關係，既不是「等於」，也不是`index.ts`那種自動查找。</mark>

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 專案原始碼（本機實測） | `futuresign.official_website/src/main.tsx`、`index.html` | 2026-07-20 |
