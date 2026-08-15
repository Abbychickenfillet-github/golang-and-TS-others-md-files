---
title: 如何寫入口檔（index.js / main.tsx）：它是相依圖的根，決定什麼會被打包
type: topic-note
tags:
  - entry-point
  - index-js
  - main-tsx
  - dependency-graph
  - bundler
  - vite
  - webpack
  - react
  - 鐵人賽
related:
  - "[[script載入方式]]"
  - "[[前端開發工具-打包編譯Lint與Parser]]"
updated: 2026-08-11
線上版（github.io，路由依 Jekyll 設定，實際請以站上為準）: https://abbychickenfillet-github.github.io/golang-and-TS-others-md-files/frontend-docs/web-platform/如何寫入口檔-index-js-main-tsx.html
---

# 如何寫入口檔（index.js / main.tsx）

> 承接 [script載入方式](script載入方式.md) 的打包五步「① 找入口、建相依圖」。這篇專講**入口檔**：它為什麼重要、怎麼寫、常見錯誤。（鐵人賽鋪路用，之後可再擴充。）
>
> **本篇重點 (a)–(f)，共 6 個。**

---

## (a) 入口檔是「相依圖的根」——沒被它（直接或間接）import 的檔，不會被打包

打包工具（bundler）**從入口檔開始**，讀它的 `import`、再讀被 import 檔的 import，一路遞迴，把「誰 import 誰」畫成相依圖。**這張圖決定「哪些檔會被打包」**。

**關鍵 hint**：一個檔案**只要沒被入口（直接或間接）import 到，就完全不會進打包產物**——不管它存不存在專案裡。所以「入口檔 ＋ import 關係」要寫對，東西才會被帶進去。

## (b) 各工具的預設入口

| 工具 | 預設入口 | 備註 |
|---|---|---|
| Webpack | `./src/index.js` | 可用 `entry` 設定改掉，或設多個入口 |
| Vite | `index.html` 裡 `<script>` 指的檔（慣例 `/src/main.tsx`） | Vite 以 `index.html` 為起點，再找它引的 JS 入口 |
| CRA（已棄用） | `src/index.js` | React 官方現改推 Vite |

（Vite 為什麼從 `index.html` 出發：因為它把 HTML 當作應用程式的入口文件，再去解析裡面 `<script type="module" src>` 指到的 JS。）

## (c) 一個典型的 React 入口（main.tsx）長怎樣

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";      // 你的根元件（會再往下 import 一堆子元件）
import "./index.css";          // side-effect import：只為了套用樣式，沒有變數

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

逐行：**`createRoot(...).render(<App/>)`** 把 React 掛到 HTML 裡的 `<div id="root">`（呼應母篇：CSR 的空殼就是這個 root）；**`import App`** 是相依圖往下展開的起點；**`import "./index.css"`** 是「副作用匯入」（不取任何變數，純粹讓打包工具把這支 CSS 收進圖、套用樣式）。

## (d) side-effect import（副作用匯入）要知道

<details>
<summary>展開：為什麼 <code>import "./index.css"</code> 沒有 <code>from</code>？</summary>

一般 `import X from "..."` 是「拿東西回來用」；`import "./index.css"` 沒有 `from`，代表**只為了它的副作用**（執行/收錄這支檔），不取任何值。CSS、polyfill、註冊全域的程式常這樣寫。

⚠️ 跟 tree-shaking 的關係：tree-shaking 會砍「沒被用到的 export」，但**副作用匯入不能亂砍**（砍了樣式就掉了）。所以工具靠 `package.json` 的 `sideEffects` 欄位標記哪些檔有副作用、不可搖掉。
</details>

## (e) 常見錯誤

| 錯誤 | 結果 | 修正 |
|---|---|---|
| 寫了元件檔但沒被任何地方 import | 它不會進打包，等於白寫 | 從入口往下確保有 import 鏈 |
| 入口檔路徑跟設定/`index.html` 對不上 | build 找不到入口、報錯 | 對齊 Vite 的 `index.html` 或 webpack `entry` |
| `getElementById("root")` 但 HTML 沒有 `#root` | `createRoot(null)` 掛不上、畫面空白 | 確認 `index.html` 有 `<div id="root">` |

## (f) 跟母篇的接點

入口檔是打包五步的「第①步」的起點；它之後會經過 ②轉譯 ③bundle ④minify ⑤hash 注入，變成 `dist/` 的產物。完整五步見 [script載入方式](script載入方式.md)。

---

## 相關筆記
- [script載入方式](script載入方式.md) —— 打包五步、HTML Parsing、script 載入模式
- [前端開發工具-打包編譯Lint與Parser](../../build-and-compilation/前端開發工具-打包編譯Lint與Parser.md) —— 打包/轉譯/Lint/Parser 的工具面

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 入口點與相依圖 | https://webpack.js.org/concepts/entry-points/ ｜ https://webpack.js.org/concepts/dependency-graph/ | 2026-08-11 查 |
| Vite 以 index.html 為入口 | https://vite.dev/guide/#index-html-and-project-root | 2026-08-11 查 |
| React 建立 root（createRoot） | https://react.dev/reference/react-dom/client/createRoot | 2026-08-11 查 |
