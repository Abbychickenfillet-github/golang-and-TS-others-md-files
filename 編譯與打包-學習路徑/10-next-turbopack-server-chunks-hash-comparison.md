---
title: "next-turbopack-server-chunks-hash-comparison"
---

> 記錄一次實際除錯過程:比對 `.next/server/chunks/` 重新編譯前後的雜湊檔名,釐清「Turbopack 熱更新沒生效」這件事的證據鏈。專案:`next-one-main`。

## 問題背景

在除錯「改了 `lib/utils.js` 的 CORS 設定,API 回應卻還是舊的」這件事時,丟出兩張 `.next/server/chunks/` 的檔案總管截圖,想確認「每次重新編譯,這個資料夾是不是都會長出新東西、雜湊會不會變」。

## 兩張截圖的比對結果(誠實版)

**先講結論:這兩張截圖其實不是同一層資料夾,沒辦法逐一比對雜湊有沒有變。**

![[next-chunks-before-restart-annotated.png]]

① 第一張截圖確實停在 `.next/server/chunks/`,可以看到雜湊檔名 `[root-of-the-server]__1cb31a33._.js`、`[root-of-the-server]__d7d9516d._.js`,修改時間是 **08:47(重啟前)**。

![[next-server-root-after-restart-annotated.png]]

② 第二張截圖的路徑列只走到 `.next/server/`,**沒有點進 `chunks/` 資料夾**,看到的是 `app-paths-manifest.json`、`middleware-manifest.json` 這些檔案,修改時間是 **09:13(重啟、`rimraf .next` 之後)**。

所以嚴格來說「雜湊有沒有差」這題,**光看這兩張圖回答不了**——要比對的話,兩張都要停在 `chunks/` 這一層才有意義。但兩張圖合起來還是能證實一件事:**09:13 這個時間點,`.next` 資料夾內容整批换新**(因為這專案的 `npm run dev` 指令是 `rimraf .next && next dev --turbopack -p 3001`,每次啟動都會先整個砍掉重建)。

## Day2 補拍:這次終於是同一層資料夾,真的比對出雜湊差異了

隔天(08/24 17:17)又對著 `.next/server/chunks/` 補拍一張,這次跟 Day1 那張是**同一層資料夾**,可以真的逐一比對:

![[next-chunks-day2-more-hashes-annotated.png]]

比對結果:

| 項目 | Day1(08/23) | Day2(08/24) | 說明 |
|---|---|---|---|
| `1cb31a33`(14KB) | 有 | **一模一樣還在** | 這段程式碼從頭到尾沒被改過,雜湊當然不變 |
| `d7d9516d`(380KB) | 有 | **消失了** | 被下面 4 個新雜湊取代 |
| `15b91842`、`65ae35b7`、`71b85217`、`fe5df6c0` | 沒有 | **新出現 4 個** | 同一支被 `d7d9516d` 代表的檔案(裝了 `successResponse`/`errorResponse`/`corsHeaders` 那份)這兩天存檔改了好幾次,**每存一次、內容不同、雜湊就換一次**,舊的沒被清掉,4 個一起躺在同一層 |
| `ssr/` 資料夾 | 沒有 | **新出現** | 期間瀏覽過某個頁面(SSR 頁面渲染),Turbopack 才把這個子資料夾生出來 |
| `node_modules_*` 雜湊 | 2 個 | 5 個 | 代表 dev server 這兩天被重啟了好幾次(不是同一個 process 一路開到底) |

**這才是真正驗證了之前那個推論**:雜湊 = 內容雜湊,不是流水號;沒改過的模組雜湊不變,改過的模組每次存檔都會多長出一個新雜湊檔案,dev 模式下舊的不會自動清掉。

## 真正有比對到雜湊差異的證據(同一層資料夾,用指令而非截圖)

這次除錯過程中,還有一次「同一層資料夾、前後內容比對」的證據不是截圖,是直接用指令對 `.next/server/chunks/` 底下的檔案內容做文字搜尋:

```bash
grep -o "allowedOrigin[^;]*;" .next/server/chunks/*.js
# → allowedOrigin = ("TURBOPACK compile-time truthy", 1) ? 'http://localhost:3001' : "TURBOPACK unreachable";
```

**磁碟上的編譯產物已經是新版程式碼**(`http://localhost:3001`,不是舊的 `'*'`)。但同一時間直接對正在跑的 dev server 打 API,回應卻還是舊版(`Access-Control-Allow-Origin: *`,沒有 `Access-Control-Allow-Credentials`)。

**結論:編譯產物(硬碟上的 `.next/server/chunks/*.js`)是對的,但當下那個 Node process 記憶體裡跑的模組,沒有換成新編譯好的版本。** 這才是「Turbopack 熱更新沒生效」這個判斷真正站得住腳的證據——不是用猜的,是拿編譯產物內容 vs. 實際 HTTP 回應內容,兩邊對不上,才能排除「我程式碼寫錯」這個可能性。

## 一般性結論:`.next/server/chunks/` 的雜湊規則

- 檔名裡那串亂碼(例如 `1cb31a33`)是**內容雜湊(content hash)**,不是流水號
- 模組內容變了 → 雜湊變 → 產生新檔名的 chunk
- **dev 模式下,舊 chunk 不會馬上被刪掉**,Turbopack 會留著做增量編譯用途,所以同一資料夾常常新舊版本並存
- 這個專案的 `npm run dev` 每次啟動都先 `rimraf .next`,等於「重開 = 全部砍掉重新編譯」,不會有殘留的舊 chunk 干擾

## 自問自答:考自己有沒有真的搞懂

### 你還記得 `[root-of-the-server]` 這個字首是什麼意思嗎?

`.next/server/chunks/` 底下那些檔名開頭的 `[root-of-the-server]`,指的是**這段程式碼屬於伺服器的「根」範圍,不屬於任何一個特定頁面的渲染樹**。這個專案裡對得上的例子:`app/(api)/api/users/route.js`、`lib/utils.js` 這種 API route / 共用工具函式,不是拿來畫某個頁面的,所以被歸進 `[root-of-the-server]` 這一組扁平的 chunk。

跟它相對的是 Day2 截圖裡新出現的 **`ssr/` 子資料夾**——那個資料夾裝的是**特定頁面**(例如 `app/user/login/page.js`)在伺服器端渲染(SSR)時需要用到的程式碼,跟頁面路由綁在一起,所以 Turbopack 把它們獨立分類、放進 `ssr/` 子資料夾,不會跟 API route 那些「根層級」的程式碼混在同一個扁平清單裡。

一句話記憶:**API route / 共用 lib → `[root-of-the-server]__hash.js`(扁平、無關頁面);頁面 SSR → `ssr/` 子資料夾(綁頁面路由)。**

### 你還記得 `.next/` 底下,後端編譯過的檔案放在哪嗎?

`.next/server/`。這裡面裝的是**只在 Node.js 伺服器上跑、瀏覽器拿不到原始碼**的東西——這個專案裡對應的就是 `app/(api)/api/**/route.js`(所有 API route)、SSR 頁面渲染邏輯。

### 那前端(瀏覽器要下載的東西)編譯完放哪?

`.next/static/`。這裡面是瀏覽器真的會下載、執行的 JS/CSS——這個專案裡對應 `app/user/login/page.js` 這種畫面元件、`styles/globals.scss`。已經實際確認過這個資料夾存在:

```bash
ls .next/static/chunks/
# [turbopack]_browser_dev_hmr-client_hmr-client_ts_*.js ...
```

檔名裡的 `_browser_` 就是線索——這組是要送進瀏覽器跑的。

一句話記憶表:

| 資料夾 | 誰執行 | 這個專案裡對應 |
|---|---|---|
| `.next/server/` | Node.js 伺服器(後端) | `app/(api)/api/**/route.js`、SSR 渲染邏輯 |
| `.next/static/` | 瀏覽器(前端) | `app/user/login/page.js`、`styles/globals.scss` |

### `npm run build` 編譯出來的東西,可以跟 `npm run dev` 編譯出來的東西同時存在同一個資料夾嗎?

**技術上兩者都是寫進同一個 `.next/` 資料夾(除非改 `next.config.js` 的 `distDir` 指到別的地方),檔名不衝突的話,實體檔案是可以並存在磁碟上的。但不建議依賴這件事,原因:**

1. **dev(Turbopack)跟 build 的編譯格式、最佳化程度不一樣**——dev 是未壓縮、方便偵錯、懶編譯(打過的路由才生);build 是全部路由一次編完、有做壓縮最佳化。混在一起容易分不清楚現在跑的到底是哪一份。
2. **路由實際指到哪個檔案,是看 manifest(`app-paths-manifest.json` 這類清單檔),不是看資料夾裡有什麼**——就算舊的 dev chunk 沒被清掉還躺在硬碟上,只要 manifest 沒指向它,就是無用的孤兒檔案,不會被拿來用,純粹佔空間、造成閱讀截圖時的混淆(這次的 Day1/Day2 比對就是活生生的例子)。
3. **這個專案自己的做法,就是刻意避免這個問題**:`"dev": "rimraf .next && next dev --turbopack -p 3001"`,每次啟動 dev 前**先整個砍掉 `.next`**,就是為了不要讓上一輪 `build` 或上一輪 dev 的殘留檔案跟這次搞混。

**結論:能並存,但這個專案已經用 `rimraf .next` 主動避免這個情況,所以正常操作下你不會真的遇到 dev/build 產物混在一起的狀況——除非跳過 `npm run dev`,直接手動下 `next dev`(沒有 `rimraf`)。**

## 除錯守則(下次遇到同類狀況怎麼辦)

只要是改到 `app/`、`lib/`、`services/` 這類伺服器端程式碼,改完測試發現「行為跟程式碼對不上」,尤其是**共用的 util 檔案**(被多個 route 一起 import 的那種),**第一步就是重啟 `npm run dev`**,不用先懷疑自己程式碼寫錯。真的要驗證的話,可以比照上面的做法:直接 `grep` 編譯產物 `.next/server/chunks/*.js` 裡有沒有新程式碼的關鍵字,跟實際 HTTP 回應的內容互相比對,而不是只看檔案總管的截圖(截圖容易像這次一樣停錯資料夾層級)。

## 延伸閱讀

- [Turbopack + Next.js Setup, Troubleshooting and Practical Fixes](https://dev.to/sumeet_shrofffreelancer_/turbopack-nextjs-setup-troubleshooting-and-practical-fixes-3khl) — Turbopack 常見坑與排解,可以對照這次遇到的「dev server 熱更新沒生效」狀況

## 相關筆記

- [[前端開發工具-打包編譯Lint與Parser]] — Turbopack/Webpack/Vite 打包工具的基本概念
- [[npm-run-script-mechanism]] — 同一個專案,`npm run dev` 的 `run` 從哪來
