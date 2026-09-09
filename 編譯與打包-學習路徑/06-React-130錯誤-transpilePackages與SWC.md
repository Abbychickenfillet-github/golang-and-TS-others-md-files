---
title: React #130 錯誤、transpilePackages 與 SWC
type: topic-note
source: Gemini
tags: [gemini, react, nextjs, swc, transpilepackages, bootstrap-icons, 部署除錯]
sources:
  - https://gemini.google.com/app/9a37ab39c343867d
updated: 2026-06-14
---

# React #130 錯誤、transpilePackages 與 SWC

> 情境：使用 Bootstrap Icons（bs-icon）套件，正式環境打包時出現 React #130 錯誤。

## 重點整理

### React #130 錯誤

<mark style="background: #FFF3A3A6;">「渲染一個 component 卻拿到一個 object」</mark>＝預期要拿到合法的 React 元件，實際拿到物件。<mark style="background: #FFB8EBA6;">常見原因：import 方式不正確</mark>，導入了整個模組或預設匯出以外的東西。

### 解法：next.config.js 的 transpilePackages

在 `next.config.js` 加入：

```js
transpilePackages: ['bs-icon']
```

效果：<mark style="background: #BBFABBA6;">讓 Next.js 用 SWC 編譯器正確「轉譯」該套件</mark>，解決正式環境打包時的相容性問題，避免 React #130 錯誤。（適用於某些未預先編譯、需被宿主專案一起轉譯的 node_modules 套件。）

### SWC（Speedy Web Compiler）

- <mark style="background: #ABF7F7A6;">以 Rust 寫成的高效能 JS/TS 編譯與壓縮工具</mark>，速度遠快於傳統 Babel / Terser。
- <mark style="background: #FFF3A3A6;">Next.js 12 起 SWC 成為預設編譯器，取代 Babel</mark>——用現代版本 Next.js 就一定會用到 SWC。

### 部署後快取/登入異常的排查

- 部署後 React 載入很久、Dashboard 異常、甚至連登出都有問題 → 可能是<mark style="background: #FF5582A6;">驗證狀態機制或儲存的認證資訊不一致</mark>。
- 排查：打開瀏覽器主控台看詳細報錯、看 Zeabur 部署日誌、清除網站 Cookie 與快取。
- **強制重整 Ctrl+Shift+R**：清除該頁快取並重新下載資源，解決多數快取問題；若仍異常，<mark style="background: #FFB8EBA6;">用「無痕視窗」或瀏覽器設定清快取+Cookie 更徹底</mark>。

## 各對話來源
### Bootstrap Icons 疑難排解（2026-06）— https://gemini.google.com/app/9a37ab39c343867d

使用者：渲染一個 component 但拿到的是一個 object，意思是它原本要拿到的是一個 component 嗎？ → Gemini：是，預期要拿到合法 React 元件卻拿到物件，通常因導入方式不正確（拿到整個模組或預設匯出以外的東西）。

使用者：那後來在 next.config.js 加了一句 transpilePackages: bs-icon，有增加什麼效果嗎？ → Gemini：讓 Next.js 用 SWC 正確轉譯 bs-icon 套件，解決正式環境打包相容性問題，避免 React #130 錯誤。

使用者：介紹 SWC。 → Gemini：Speedy Web Compiler，Rust 寫成的高效能 JS/TS 編譯壓縮工具，比 Babel/Terser 快很多，Next.js 用它提升構建與熱重載效率。

使用者：所以我只要用 Next.js 就一定有 SWC 嗎？ → Gemini：是，Next.js 12 起 SWC 成預設編譯器取代 Babel，現代版本一定會用到。

使用者：他只做了這個改動，那我現在要回去 Zeabur 看一下。 → Gemini：回去檢查部署狀態是否成功、有無新錯誤，打開控制台確認之前錯誤是否消失。

使用者：但很弔詭的是登出也很容易在部署後…剛剛還是沒修好。 → Gemini：可能是驗證狀態機制或儲存認證資訊不一致，看控制台報錯、清 Cookie 與快取、查 Zeabur 部署日誌。

使用者：這什麼時候變的 react 會跑這麼久？ → Gemini：出現 React logo 表示正在載入/初始化，變久可能是網路延遲、伺服器處理久或前端套件檔案大，查主控台有無載入失敗資源。

使用者：如果我一般試穿只有用 Ctrl+Shift+R 清的乾淨嗎？ → Gemini：是強制重整清該頁快取重新下載資源；若仍異常用無痕視窗或設定清快取+Cookie 更徹底。

使用者：為什麼會一直出現這個視窗？ → Gemini：黑色視窗像命令提示字元/終端機，可能誤觸快捷鍵或有背景程式/腳本自動執行開啟，檢查最近安裝軟體設定或背景程式。
