# Day 8｜瀏覽器拿到的只是一串純文字——從 HTML Parsing、script 載入到打包，三大框架共同的底層

> 這篇把「build（打包）→ 瀏覽器 runtime → CSR/SSR/SSG → hydration」整條線一次講完。這條底層是**框架無關**的：不管你用 React、Vue 還是 Angular，瀏覽器都只認 HTML/CSS/JS、都得打包成純文字、都要面對 CSR/SSR 抉擇。

---

## 一、先建立一個心智模型：整條路只有兩個時間點

- **build-time（建置期）**：在你的筆電或 CI 主機上，**跑一次**。把 React/TS 打包成**純文字**（`index.html` + 幾支 `.js`/`.css`）。
- **run-time（執行期）**：在**每一個使用者的瀏覽器**裡，**各跑一次**。把純文字解析成畫面、把 JS 跑起來。

一句話總綱：

> **build-time 打包成純文字 → 送到瀏覽器 → run-time 兵分兩條平行線（HTML 由 Blink 解析成 DOM ∥ JS 由 V8 編譯執行）→ `<script>` 是協調這兩條線何時交錯的閥門 → 執行 JS 把互動掛上 DOM（SSR/SSG 時叫 hydration）。**

---

## 二、build-time：打包到底做了什麼？（純文字五步）

「打包成純文字」指的是**整個 build 的 5 步**，不是只有前兩步——因為每一步的產物**一路都是純文字**；真正變成 bytecode/機器碼要等 runtime 的 V8。

分成兩個階段：**A 內部交織、沒有先後；B 才有順序。**

| 階段 | 動作 | 誰做 | 做什麼 → 產物 |
|---|---|---|---|
| **A. 分析＋轉譯**（同一趟、交織） | 建相依圖 | bundler 核心 | 用 `acorn` **parse** 找 `import` ＋ 用 resolver **resolve** 找實際檔（含去 `node_modules`）→ 模組相依圖 |
| **A**（同一趟） | transpile 轉譯 | Babel／SWC／esbuild | 每讀到一個 `.tsx`/`.jsx` 就轉成標準 JS（否則 parse 不出它的 import）→ 純文字 JS |
| **B. 合成＋輸出**（有先後） | bundle 打包 | bundler 核心 | 合併成 chunk ＋ tree-shaking（砍死碼）＋ code-splitting（切 vendor／lazy chunk）＋ scope-hoisting → 少數幾支 JS |
| **B** | minify 壓縮 | Terser／esbuild／SWC | 去空白/註解、縮短變數名 → 更小的 JS |
| **B** | hash ＋ 產出 | bundler 核心 | 檔名帶 content hash（`main-a1b2c3.js`，內容變檔名就變＝cache busting）＋把 `<script>`/`<link>` 注入 `index.html` → `dist/` 靜態檔 |

幾個重點：

- **transpile ≠ 去掉東西**。它是「把語法翻成標準 JS」（`JSX → createElement`、`TS → JS`，唯一算去掉的是 TS 型別註記）。真正「去掉」的是後面的 tree-shaking（砍死碼）與 minify（去空白）。
- **建相依圖與轉譯是同一趟交織的**：要讀出一個檔的 `import`，就得先把它從 JSX/TS 轉成標準 JS 才 parse 得出來。所以是「邊建圖邊逐檔轉譯」，不是建完整張圖才轉。
- **transpile ≠ compile**。transpile 是「原始碼 → 原始碼」（高階→高階），產物仍是純文字 JS；真正的「編譯成 bytecode/機器碼」是 **V8 在 runtime** 做的。

### 誰來做這 5 步？（工具比較）

| 工具（問世） | 語言 | 類型 | 一句話 |
|---|---|---|---|
| Webpack（2012） | JS | bundler | 生態最成熟、所有框架通用；HMR 較慢；仍最多下載但新專案少選 |
| Rollup（2015） | JS | bundler | 推廣 tree-shaking、ESM-first；曾是 Vite 生產打包底層 |
| esbuild（2020） | Go | transpiler／bundler | 極快，多被當「其他工具內部的轉譯器」 |
| Vite（2020） | JS（底層借 Go/Rust） | build tool（含 dev server＋bundler） | 開發用原生 ESM＋esbuild 不 bundle、生產用 Rollup（Vite v8 起改 Rolldown）；2026 新專案預設 |
| Turbopack（2022） | Rust | bundler | Vercel 做、增量快；Next.js 專用 |
| Rolldown（2024→Vite v8） | Rust | bundler | Rollup 的 Rust 重寫；Vite v8 起取代 esbuild＋Rollup |
| Next.js（2016） | —（JS 框架） | **框架，不是 bundler** | 底層用 Turbopack／Webpack，另加路由／SSR |

> 主詞分清：**Webpack／Rollup／esbuild／Turbopack／Rolldown 是 bundler**；**Vite 是 build tool**（把 bundler＋dev server 包成一套）；**Next.js 是框架**（把某個 bundler 再包一層、加路由/SSR）。所以 Next.js 跟前面那些不是同一層，它是**用**它們的人。

---

## 三、run-time：兩條平行的線（HTML 線 ∥ JS 線）

純文字送到瀏覽器後，兵分兩條線，**同一條主執行緒上輪流用 CPU**：

```text
HTML 線：  HTML 字串 ──(瀏覽器渲染引擎 Blink 解析)──► DOM 樹        ← 只有 Parse，無編譯
JS   線：  JS 字串 ──(V8 Parse)──► AST ──(編譯)──► bytecode ──(JIT)──► 機器碼   ← 編譯在這
```

- **HTML 由 Blink 解析成 DOM，跟 V8 無關**。V8 是 JavaScript 引擎、只管 JS。**HTML 永遠不會進 V8、不會變 bytecode。**
- 具體地說：解析器讀到 `<div>` 這段**文字**，就在記憶體 `new` 出一個 `HTMLDivElement` 物件（繼承鏈 `HTMLDivElement → HTMLElement → Element → Node`）。物件才有 `.style`、`.addEventListener()`；**字串裡的 `<div>` 選不到也操作不動**。
- **主執行緒只有一條**：HTML 解析、DOM 建構、樣式計算、渲染、JS 執行全部共用它，同一瞬間只能做一件事。所以 **JS 一執行，HTML 解析就得停**——這是後面所有 script 載入策略的根源。

### Critical Rendering Path（同一個時間點）

上面兩條線之後，瀏覽器把 **DOM ＋ CSSOM** 合成 **Render Tree** → Layout（排版）→ Paint（繪製）。這整條「HTML→DOM、CSS→CSSOM、Render Tree、Layout、Paint」都在同一個 run-time；HTML Parsing 就是它的第一步。有 CSS 是正常的：沒有 CSSOM 就不知道每個元素長怎樣、畫不出來。

---

## 四、`<script>` 六種載入方式（它是協調兩條線的閥門）

`<script>` 就是「HTML 線解析到它時，把主執行緒交給 JS 線（V8）去跑」的**交接點**。要不要中斷 HTML 解析、什麼時候執行，就是這張表：

| 模式 | 解析時（DOM 會停嗎） | 下載 | 執行 | 順序保證 | 典型場景 |
|---|---|---|---|---|---|
| `<script>`（一般，`<head>`） | **中斷**（DOM 暫停） | 讀到才抓，主緒空等 | 抓完立刻執行 | 按出現順序 | 早期網頁 |
| `<script async>` | 下載不擋；**執行插隊時短暫停** | 背景平行下載 | 抓完立刻插隊 | **不保證** | GA、廣告、獨立第三方 |
| `<script defer>` | **不停** | 背景平行下載 | 等 DOM 蓋完才依序執行 | **保證** | 需操作 DOM 的主程式 |
| `<script>` 放 `</body>` 前 | 讀到時 DOM 幾乎蓋好 | 讀到才抓 | 抓完立刻執行 | 按出現順序 | 傳統 SPA 注入位置 |
| `<script type="module">` | **不停**（預設等同 defer） | 背景平行下載 | 等解析完才執行 | 保證 | Vite／原生 ESM |
| Ajax／`fetch`／`axios` | 與載入解析無關 | JS 跑起來後主動抓資料 | 資料回來進 Event Loop | 由程式邏輯 | `useEffect`、React Query |

補充：`async`/`defer` **只對「有 `src` 的外部 script」有效**（inline 加了沒用）；慣例放 `<head>`（邊解析邊背景下載最划算）；`type="module"` 預設就是 defer，所以現代前端不用再加 `defer`。

---

## 五、CSR / SSR / SSG：差在「內容 HTML 何時、由誰串好」

先破一個常見誤會：**只有 SSG 是「build 時就把內容 HTML 串好」**，CSR/SSR 的 build 產物都是「沒內容的殼」。

| | build-time 產出的 index.html | 內容 HTML 何時、誰串 | DOM 何時建 |
|---|---|---|---|
| **CSR**（Vite/CRA SPA） | **空殼**（只有 `<div id="root">`） | runtime、瀏覽器端 JS 用 `createElement` 現建 | runtime，瀏覽器 |
| **SSR**（Next.js） | 空殼/框架殼 | runtime、**伺服器每次請求**用 `renderToString` 現串 | 伺服器印字串 → 瀏覽器 parse |
| **SSG**（Next `output:export`、Astro、Gatsby） | **已串好內容的 `.html`** | **build-time** 就用 `renderToStaticMarkup` 串好 | build 印好 → 瀏覽器 parse |

- **JSX 明明變 JS，怎麼會有 HTML？** JSX → JS（transpile）一直都在；**CSR 就停在這、只發 JS**；**SSR/SSG 則多做一步「執行那些 JS」**，用 `renderToString` 把 React 元件**印成 HTML 字串**——這才是 HTML 的來源。不是 JSX 直接變 HTML，是「執行 transpile 後的 JS」印出 HTML。
- **三者送到瀏覽器後都一樣要跑 HTML Parsing（字串→DOM）**，這步無例外。
- **純靜態 CDN**：一堆散布全球的節點，只「發已存在的檔」、不執行程式。SSG 產出的是靜態 `.html`，丟純靜態 CDN 又快又便宜，適合內容不常變的部落格/文件/行銷頁；SSR 要「活著的 Node」每請求現算，純靜態 CDN 不夠。

### SPA ≠ CSR（兩個獨立的軸）

- **軸一（路由模型）**：SPA（單一 HTML 外殼、換頁不重載、JS 抽換內容） vs MPA（每頁一份 HTML、整頁重載）。
- **軸二（首屏渲染在哪）**：CSR（瀏覽器） / SSR（伺服器每請求） / SSG（build 時）。

兩軸自由組合：**SPA+CSR**（CRA、Vite SPA）、**SPA+SSR**（Next.js、Nuxt）。所以 **Next.js 是 SSR+SPA**：首屏伺服器渲染，hydration 後換頁走前端路由、不重載。「SPA」講換頁行為，「CSR/SSR」講首屏誰渲染，兩件事別混。

---

## 六、hydration（水合）與 hydration mismatch

- **hydration**＝SSR/SSG 送來「已有內容但沒事件」的靜態 HTML，瀏覽器端 React 用 `hydrateRoot()` **走訪既有 DOM、把事件監聽掛回去**，讓它變可互動。**不是重畫**——因為 SSR 那份 HTML 已經被瀏覽器 parse 成 DOM、也 paint 出畫面了，重畫會浪費、會閃爍、抵銷 SSR 的首屏優勢。（CSR 沒有 hydration，它是從零 `createElement` 建 DOM。）
- **SSR 不是「每次 re-render 都在伺服器」**：只有首屏那一次在伺服器產 HTML 字串；hydration 之後互動造成的 re-render 回到瀏覽器端，跟 CSR 一樣。

### Hydration Mismatch（水合不一致）

前提：伺服器算的 HTML，要跟瀏覽器端 React 重算一次的結果**長得一樣**；一不一樣就報 mismatch。

- **地雷（在元件本體 render 期間用了「兩邊會算出不同值」的東西）**：
  - `Date.now()` / `new Date()`：伺服器算的時間 ≠ 瀏覽器算的時間。
  - `Math.random()`：本來就隨機。
  - `typeof window` / `window.xxx`：伺服器沒有 `window`（`undefined`）、瀏覽器有 → 走不同分支。
  - 讀 `localStorage`、依語系/時區的格式化。
- **怎麼修**：把這類邏輯移出 render、放進 `useEffect`（只在瀏覽器端、hydration 後才跑），或對真的無害的差異用 `suppressHydrationWarning`。

---

## 七、入口檔（index.js / main.tsx）：相依圖的根

打包工具**從入口檔開始**，順著 `import` 遞迴建相依圖。**一個檔案只要沒被入口（直接或間接）import 到，就完全不會進打包產物。**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";        // 相依圖往下展開的起點
import "./index.css";           // side-effect import：只為套用樣式，沒有取值

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- `createRoot(...).render(<App/>)`：把 React 掛到 HTML 的 `<div id="root">`（CSR 的空殼就是這個 root）。
- 各工具預設入口：Webpack 是 `./src/index.js`；Vite 從 `index.html` 出發、再找它 `<script>` 指的 `/src/main.tsx`。
- **Next.js 不用你手寫 index.html**：它用檔案系統路由（`app/page.tsx` 或 `pages/index.js`），底層自動幫每頁產 HTML。

---

## 八、三大框架共同底層（收束）

| | React | Vue | Angular |
|---|---|---|---|
| 模板語法（都要 transpile 成 JS） | JSX | SFC `.vue` | Angular template |
| 常用建置 | Vite（Next 用 Turbopack） | Vite（Nuxt） | Angular CLI（底層 esbuild/webpack） |
| SSR 方案 | Next.js | Nuxt | Angular Universal |
| 共同底層 | 打包 → 純文字 → 瀏覽器 HTML Parsing → DOM | 同左 | 同左 |

**你選哪個框架，只是換「模板語法」跟「打包/SSR 的包裝」；底層那條「純文字 → HTML Parsing → DOM，JS 由 V8 另一條線」永遠一樣。**

---

## 面試速記（決勝點）

- **HTML Parsing 誰做？** Blink（渲染引擎），不是 V8；V8 只管 JS。
- **為什麼 JS 會卡畫面？** 主執行緒只有一條，JS 執行與渲染互斥。
- **async vs defer？** 都不擋下載；async 抓完插隊、不保證順序（GA）；defer 等 DOM 蓋完依序執行（主程式）；`type=module` 預設就 defer。
- **transpile vs compile vs bundle？** transpile 源碼對源碼、bundle 合併、機器碼在 V8 runtime；前端 build 產純文字、不產機器碼。
- **tree-shaking？** 砍沒被 import 的死碼，靠 ESM 靜態分析。
- **code splitting vs lazy loading？** 切在 build-time（bundler）、載在 runtime（瀏覽器走到那頁才下載）。
- **SPA = CSR 嗎？** 不是，兩個獨立的軸；Next.js = SSR+SPA。
- **hydration？** SSR/SSG 後把事件掛回既有 DOM，不是重畫；CSR 沒有 hydration。
- **SSR 每次 re-render 都在伺服器嗎？** 不，只有首屏；之後互動 re-render 在瀏覽器。

---

*（本文為個人學習筆記整理，工具版本以 2026 現況為準；細節請對照 MDN、各工具官方文件與 Next.js Rendering 文件。）*
