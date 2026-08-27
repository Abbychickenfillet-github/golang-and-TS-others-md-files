---
title: iThome 鐵人賽 30 天大綱｜從 JS 核心機制到 React 核心原理
series: 從 JS 核心機制到 React 核心原理：30天打造穩固的前端基本功
type: outline
tags: [ithome, 鐵人賽, 大綱, 規劃]
updated: 2026-08-21
---

# 30 天大綱｜從 JS 核心機制到 React 核心原理

> 這份大綱**完全建立在你 vault 既有的素材上**，不是憑空排的主題清單。
> 每一天都標了三件事：**承接哪一篇、被後面哪一篇用到、血淚史從哪來**。

---

## 設計原則（為什麼這樣排）

| 原則 | 做法 |
| --- | --- |
| **不膚淺** | 每天都綁**一個你真的踩過的坑**，來源是 `系統維護-C槽清理/Cursor對話備份/`（304 篇，2025-08 到 2025-12）與 `debug-notes.md` |
| **有敘事線** | 每篇開頭寫「承接 Day N」，結尾寫「明天用到這個做什麼」，30 天是一條線不是 30 個孤島 |
| **差異化** | 記憶體結構圖、原型鏈階數圖、Shape/IC 圖、四格矩陣圖 —— 這些圖市面上的通用文章沒有 |
| **不寫開賽宣言** | Day 1 直接切入技術 |
| **Iterator 排前面** | 歸在資料型別那一段（Day 8），不當進階題 |
| **橫向比較** | Vue／Angular／Svelte／Solid 的對照分散在 Day 21、26、29 |

> **血淚史的使用原則**：`系統維護-C槽清理/` 在 `_config.yml` 的 `exclude` 清單裡（含專案與帳號細節）。
> 寫進文章時**只保留問題現象與解法，不貼專案名稱、路徑、資料庫連線字串、API 端點**。

---

## 第一段｜語言底層：值、記憶體、作用域（Day 1–10）

| Day | 標題 | 承接／被用到 | 血淚史來源 | 既有素材 |
| --- | --- | --- | --- | --- |
| **1** | JS 引擎到底在做什麼：從一行 `const a = 1` 看 V8 完整管線 | 全系列起點｜Day 2、13、24 都回頭指這張管線圖 | — | `00-V8引擎完整管線-Parse到Deoptimization.md`（28KB＋互動版）、`01-引擎-Engine-到底是什麼.md`（45KB） |
| **2** | 記憶體模型：Stack、Heap 與 GC 什麼時候真的回收 | 承接 Day 1｜Day 3、10、12 全靠這張圖 | — | `11-記憶體模型-stack-heap-動態配置-GC.md`、`全域變數的GC回收時機.md`、Stack/Heap SVG |
| **3** | 傳值 vs 傳址：為什麼「複製」一個物件會害你改到原本的 | 承接 Day 2｜Day 17 的 React state 不可變性直接靠它 | **`2025-09-17_如果依賴整個userData會怎麼樣`** —— 依賴整個物件導致無限重渲染 | `10-傳值vs傳址-賦值與記憶體空間.md`（17KB＋互動版）、`JS-相等性與傳值傳址/` 整包 |
| **4** | 相等性四種演算法：`==`、`===`、`Object.is`、SameValueZero | 承接 Day 3｜Day 18 的 React 淺比較用得到 | **`2025-09-15_為什麼一個是false一個true`** | `JS-相等性與傳值傳址.md` ＋ `object-is-demo.js` ＋ 四種相等演算法比較表 SVG |
| **5** | 型別轉換：ToPrimitive 與那些「明明看起來一樣卻不等」 | 承接 Day 4｜Day 8 的包裹物件、Day 9 的 JSON | **`常見錯誤-Number包住陣列變NaN-reduce爆錯.md`** —— 真的爆過的 reduce | `15-ToPrimitive-ToNumber-型別轉換抽象操作.md`、`valueOf-預設行為與原始值轉換.md` |
| **6** | 作用域與詞法作用域：面試四段式答法 | 承接 Day 2｜Day 7 閉包、Day 11 `this` | **`2025-09-11_npm_start_為什麼讀到的port值是3005`** —— 環境變數被哪一層蓋掉 | `05-作用域`、`14-詞法作用域-Lexical-Scope-面試四段式.md` ＋ `scope-chain-inspector.js`（用 node:inspector 實測） |
| **7** | 閉包：私有變數、傳址陷阱，與 `return` 之後記憶體怎麼了 | 承接 Day 6｜Day 19 的 hooks 全靠閉包 | — | `13-閉包-Closure`（27KB＋互動版）、`12-return-清理記憶體-stack-frame與閉包例外.md`（**61KB，全 vault 最大的技術筆記**） |
| **8** | 資料型別總覽：原始型別、包裹物件、自動裝箱、Symbol、Iterator | 承接 Day 5｜Day 9 的 Map、Day 23 的 `for...of` | **`symbol_data_type.html` 打錯字噴 SyntaxError** | `自動裝箱與內建建構函式.md`、`Symbol-符號型別與物件key.md`、`Object建構子-plain-object的建立與存取.md` |
| **9** | 物件的真面目：原型鏈階數、屬性列舉四格矩陣 | 承接 Day 8｜Day 12 的原型最佳化、Day 20 的 React 原始碼 | **`2025-08-31_得到的屬性值`** | `Object建構子`（769 行，含 i／j／k／l／m 五個追問延伸）、`屬性列舉決策矩陣.md`、原型鏈階數 SVG |
| **10** | 靜態方法、實例方法、存取器屬性：讀懂 React 原始碼的三行寫法 | 承接 Day 9｜**Day 20 的 `hasOwnProperty.call` 就是這篇** | — | `Day03-靜態方法-實例方法-存取器屬性.md`（已寫好）、兩個盒子 SVG |

---

## 第二段｜執行機制：this、非同步、事件（Day 11–16）

| Day | 標題 | 承接／被用到 | 血淚史來源 | 既有素材 |
| --- | --- | --- | --- | --- |
| **11** | `this` 是什麼時候決定的：四種綁定與箭頭函式 | 承接 Day 6、10｜**Day 18 的 class component bind** | — | `JavaScript-call-apply-bind-改變this指向.md`（15KB＋互動版）、`08-函式呼叫核心機制.md`（38KB） |
| **12** | 引擎怎麼加速物件：Shape、Inline Cache、ValidityCell | 承接 Day 9｜Day 22 的 React 效能 | — | `原型與引擎最佳化-Shape-InlineCache-ValidityCell.md`（**你自己整理的 Shape/IC 那段是這篇的主體**） |
| **13** | 事件循環：微任務與巨任務，以及 Node 跟瀏覽器差在哪 | 承接 Day 1｜Day 14、25 | **`2025-10-11_為何yoki登入後計算時間差有15秒跟-11秒`** —— 時間軸錯亂的真實案例 | `事件循環-Event-Loop-微任務與巨任務.md`（20KB＋互動版）、`Node-js底層架構-V8-libuv.md`（36KB） |
| **14** | 執行緒、非同步、延遲：三個常被混為一談的詞 | 承接 Day 13｜Day 15 | — | `執行緒-非同步-延遲的差異.md`（13KB＋互動版）、`V8與libuv協同工作原理.md` |
| **15** | Promise 與 async/await：錯誤處理的三個層次 | 承接 Day 14｜Day 25 的資料獲取 | **`2025-09-06_Runtime_AxiosError`** | `Axios-vs-Fetch-回應解析與錯誤處理.md`、`js-runtime/JavaScript-事件循環與閉包-面試核心.md` |
| **16** | 事件流與事件代理：捕獲、冒泡、為什麼 React 的事件不太一樣 | 承接 Day 13｜Day 21 的 React 合成事件 | — | `事件流與事件代理.md`（14KB ＋ 兩個互動版：筆記版與考題版） |

---

## 第三段｜瀏覽器與網路：從輸入網址到畫面（Day 17–22）

| Day | 標題 | 承接／被用到 | 血淚史來源 | 既有素材 |
| --- | --- | --- | --- | --- |
| **17** | 關鍵渲染路徑：重排 vs 重繪，用 Performance 面板實際看 | 承接 Day 16｜Day 22 | **`debug-notes.md` 的 Grid 表格對齊不一致 ＋ Badge Padding 對齊偏移** | `Critical-Rendering-Path.md`、`DevTools-Performance-面板-渲染管線與Repaint判讀.md`＋互動版 |
| **18** | Cookie、Session、JWT：一次把「登入到底怎麼記住我」講完 | 承接 Day 15｜Day 27 的權限系統 | **`2025-08-25_沒有cookie畫面也沒有進到dashboard`**（237KB 的除錯血淚）＋ `2025-09-24_我這邊的cookie有存到session嗎` | HTTP Cookies & Sessions 那組筆記（真的架了 Express server ＋ F12 截圖） |
| **19** | 儲存：localStorage、sessionStorage、IndexedDB、Cookie 怎麼選 | 承接 Day 18｜Day 27 | **`2025-09-29_為什麼_localStorage_沒有看到data-theme`** | `web-platform/indexeddb.md`、主題切換那組 |
| **20** | CORS 與同源政策：為什麼我的請求在瀏覽器爆但 Postman 沒事 | 承接 Day 18｜Day 25 | **`2025-09-25_但為什麼照片jpg的前綴會是網域http://localhost:3001`** | `XMLHttpRequest-CORS-explanation.md`、`DEBUG_NETWORK.md` |
| **21** | 打包與模組：Vite HMR、Rollup、為什麼改一行要等三秒 | 承接 Day 1｜Day 28 部署 | **`2025-09-09_shared.ts:18_HMR_Invalid_message`**（380KB，最慘的一次） | `Vite-HMR機制與Rollup打包原理.md`、`2026-06-02-Dev-Server-功能與價值.md` |
| **22** | SPA、SSR、SSG、Hydration：四個字母縮寫一次搞懂 | 承接 Day 17｜Day 26 | — | `SPA架構`、`SPA現況-為何說不流行了`、`SSR-renderToString與Hydration.md`、`前端渲染與打包-面試題庫.md` |

---

## 第四段｜React 核心原理（Day 23–30）

| Day | 標題 | 承接／被用到 | 血淚史來源 | 既有素材 |
| --- | --- | --- | --- | --- |
| **23** | React 為什麼要你給新物件：從 getter 與 Proxy 看設計選擇 | **承接 Day 3、4、8**（傳址、相等、存取器）｜Day 24 | — | `草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md`（**18KB，已寫好，五星**）＋ `vue/00-ref與reactive.md` 當對照組 |
| **24** | 讀 React 原始碼：`Component.prototype.setState` 與 `hasOwnProperty.call` | 承接 Day 10、11｜Day 25 | — | Day 3 那篇的 React 原始碼段落可以擴寫（v19.2.8 實際下載檢視過） |
| **25** | 資料獲取與快取：queryKey 到底是什麼，為什麼卡片不更新 | 承接 Day 15｜Day 27 | **`debug-notes.md` 的統計卡片不更新問題 ＋ 前後端搜尋衝突問題**（兩段都是完整的除錯過程）＋ **`2025-09-25_在重新驗證時使用過期資料聽起來不太對勁`** | `tanstack/` 整包 14 篇（queryKey、invalidateQueries、onMutate、樂觀更新） |
| **26** | 渲染最佳化：useMemo、JIT，與「什麼時候不該優化」 | 承接 Day 12、22｜Day 30 | — | `JIT與useMemo-CPU記憶體取捨.md`、`useMemo-and-render-optimization.md`、`01-React-純函數與嚴格模式-StrictMode.md` |
| **27** | 狀態管理的演進：props drilling → Context → Zustand | 承接 Day 7（閉包）、Day 25｜Day 30 | **`2025-10-01_通常狀態管理超過幾個就會建議用zustand`** | `React-Context-Provider消費者-AuthProvider與路由保護.md`、`閉包vs參數鑽透-argument-drilling.md` |
| **28** | 部署：環境變數、Docker、CI/CD，與那些只在正式環境炸的錯 | 承接 Day 21｜Day 29 | **`2025-09-27_我在zeabur部屬遇到問題`** ＋ **`2025-09-13_FATAL_password`** ＋ **`2025-09-28_LINE_Pay的環境變數到底要不要雙引號包住`** | `Vite環境變數與API-BaseURL連接前後端.md`、`GitHub-Actions-CICD-ghcr與Docker映像檔.md`、`deployment/` 整包 |
| **29** | 橫向比較：Vue、Angular、Svelte、Solid 在同一個岔路口選了什麼 | 承接 Day 23｜Day 30 收束 | — | `00-前端框架比較-Vue-React-Angular難易度與優缺點.md`、`框架-vs-函式庫-控制反轉IoC.md` |
| **30** | 面試怎麼答：把 29 天串成一張可以講 20 分鐘的地圖 | 收束全系列 | — | `原型-面試考題.html`（16 題）、`前端渲染與打包-面試題庫.md`、`面試題庫與自我介紹優化.md` |

---

## 已經可以直接用的三篇

這三篇已經是**純 Markdown、可直接貼 iThome** 的完稿：

| 檔案 | 對應 Day | 狀態 |
| --- | --- | --- |
| `Day03-靜態方法-實例方法-存取器屬性-讀懂React原始碼的三行寫法.md` | Day 10 | ✔ 完稿，含 React v19.2.8 原始碼實證 |
| `文章-從一個SyntaxError讀懂物件字面量與自動裝箱.md` | Day 8 | ✔ 完稿 |
| `草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md` | Day 23 | ✔ 草稿完整，五星標記 |

> **注意**：`Day03` 那篇原本編號是 Day 3，在這份大綱裡對應到 **Day 10**。
> 開頭那句「承接 Day 2 我們把原型鏈走了一遍」要改成「承接 Day 9」。

---

## 怎麼把「血淚史」寫得有含金量

那 304 篇 Cursor 對話備份是原料，不是成品。建議的加工方式是**四段式**：

```
一、當時的現象（貼真實錯誤訊息，這是最有共鳴的部分）
二、我當時猜錯的方向（這段最有價值，也最少人寫）
三、真正的原因（接到那天的語言機制）
四、現在我會怎麼避免（可操作的結論）
```

**第二段是差異化的關鍵。** 市面上的文章都直接跳到正解，但讀者卡住的地方通常跟你當初卡住的地方一樣。
把「我以為是 A，結果是 B」寫出來，比寫十個正確答案有用。

範例（Day 18）：

> 一、畫面卡在登入頁，`document.cookie` 是空的，但 Network 分頁明明看到 `Set-Cookie`
> 二、我以為是後端沒發 cookie，追了兩天後端
> 三、其實是 `httpOnly` 的 cookie 本來就讀不到，而 `SameSite` 讓跨埠請求不帶 cookie
> 四、先看 Application 分頁而不是 `document.cookie`；跨埠開發一律先確認 `SameSite` 與 `credentials`

---

## 兩件要你決定的事

**a. Day 數的分配**
上面第一段給了 10 天（語言底層），如果覺得太重，可以把 Day 12（Shape/IC）與 Day 14（執行緒/非同步）移到後面當補充，前段壓到 8 天。

**b. 血淚史的去識別化程度**
304 篇裡有專案名稱、資料表欄位、API 路徑。建議統一改成 `專案 A`、`使用者資料表`、`/api/xxx`。要不要我先寫一份**去識別化規則**，之後每篇都照那份改？

---

## 關聯

| 筆記 | 關聯原因 |
| --- | --- |
| `待學習的技術｜面試/iThome鐵人賽-參賽門檻-組別選擇與履歷價值.md` | 當初選組別的決策記錄 |
| `debug-notes.md` | Day 17、25 的主要血淚史來源 |
| `系統維護-C槽清理/Cursor對話備份/` | 304 篇原料，**注意這個資料夾在 GitHub Pages 的 exclude 清單裡** |
