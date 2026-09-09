---
title: 瀏覽器相容性 — Polyfill 補 API、Babel 降語法、Browserslist 一次設定全家套用
type: topic-note
source: Gemini
tags: [gemini, 瀏覽器相容性, polyfill, babel, browserslist, core-js, autoprefixer, 閉包]
aliases: [Browserslist, Polyfill與Babel差異]
related:
  - "[[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]]"
  - "[[編輯器與執行環境-VSCode是Electron與Toolchain]]"
  - "[[13-閉包-Closure-私有變數與傳址陷阱]]"
  - "[[事件流與事件代理]]"
sources:
  - https://gemini.google.com/app/a1a14102e2207433
updated: 2026-09-05
---

# 瀏覽器相容性 — Polyfill 補 API、Babel 降語法、Browserslist 一次設定全家套用

> [!info]- 🔗 與既有筆記的關聯
> (1) 本篇歸在 `build-and-compilation/`，因為 Polyfill 與 Babel 都是「建置階段」的事，跟 [[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]] 同屬前端 toolchain 的一環——那篇講開發期的 dev server，本篇講產出期的降級與補丁。
> (2) 開頭那段 `addEventListener` 的匿名函式屬於閉包主題，與 [[13-閉包-Closure-私有變數與傳址陷阱]]、[[事件流與事件代理]] 直接相關，本篇只保留「為什麼要包一層匿名函式」這個切面，細節請看那兩篇。

> 本篇重點 a–n，共 14 個。

## 重點整理

### 一、事件監聽為什麼要包一層匿名函式（a–c）

(a) <mark style="background: #FF5582A6;">不能寫 `el.addEventListener('blur', checkUsername(5))`</mark>。這樣寫會在執行到這一行時「立刻執行」`checkUsername(5)`，再把它的回傳值交給監聽器，達不到「等 blur 發生才執行」的目的。

```js
// ✅ 包一層匿名函式，事件發生時才執行內部呼叫
el.addEventListener('blur', function () {
  checkUsername(5);
}, false);
```

(b) <mark style="background: #ADCCFFA6;">詞法作用域（Lexical Scope）是規則</mark>：這個匿名函式在「定義的位置」就決定了它能存取外層的 `checkUsername` 與數字 `5`。

(c) <mark style="background: #FFF3A3A6;">閉包（Closure）是現象與機制</mark>：匿名函式被註冊給 DOM 元素之後，主程式跑完它仍留在記憶體裡等待觸發；blur 發生時它在全新的執行環境中被呼叫，卻依然能存取當初定義時捕獲的環境。<mark style="background: #FFF3A3A6;">所以這題的核心答案是「閉包」，詞法作用域只是它成立的前提。</mark>

### 二、相容性程式碼不用手寫（d–g）

(d) <mark style="background: #FF5582A6;">全部手寫 `if...else` 檢查瀏覽器能力，程式碼會很髒且難以維護</mark>。現代前端早就交給自動化編譯工具處理。

(e) <mark style="background: #ADCCFFA6;">Polyfill（墊片庫）＝補「缺失的 API」</mark>，代表套件是 `core-js`。你正常寫 `el.addEventListener(...)`，Polyfill 會在載入時偵測環境，發現舊瀏覽器不支援就自動掛上模擬的 API。

(f) <mark style="background: #ADCCFFA6;">Transpiler（語法轉譯器）＝把「新語法」翻成「舊語法」</mark>，代表工具是 `Babel`（現代專案大多已整合在 Vite、Next.js、Webpack 底層）。箭頭函式、`async/await`、`const`/`let` 都會被翻成 ES5 的 `var` 與 `function`。

(g) 兩者的分工一句話記：<mark style="background: #FFF3A3A6;">Babel 管「語法（syntax）」，Polyfill 管「內建物件與方法（API）」</mark>。`Promise`、`Array.prototype.includes` 這些是 API，Babel 翻不出來，只能靠 Polyfill 補。

| 工具 | 補的東西 | 代表套件 | 例子 |
| --- | --- | --- | --- |
| Transpiler | 語法 | Babel / SWC / esbuild | `() => {}` 轉成 `function(){}` |
| Polyfill | 執行期的 API | core-js / regenerator-runtime | 舊瀏覽器沒有的 `Promise`、`Object.assign` |
| 後處理器 | CSS 前綴與新語法 | PostCSS / Autoprefixer | 自動補 `-webkit-` |

### 三、Browserslist 是什麼（h–k）

(h) <mark style="background: #FF5582A6;">Browserslist 不是瀏覽器外掛（Extension）</mark>，而是前端工具生態系的「共用設定規格＋一個 npm 套件」。

(i) <mark style="background: #ADCCFFA6;">它的核心工作是把「人類語言的條件」轉成「確切的瀏覽器與版本號清單」</mark>。

```
你寫的條件：
> 0.5%, last 2 versions, not dead

Browserslist 解析出來的結果：
chrome 124, chrome 123, safari 17.4, safari 17.3, edge 124, firefox 125...
```

(j) <mark style="background: #FFF3A3A6;">它是前端建置流程的「中央指令中心」：一次設定，Babel、Autoprefixer、PostCSS、SWC 全家套用</mark>，不必在每個工具的設定檔各寫一次相容目標。

```
                   ┌──> Babel        （決定語法要降到哪個 ES 版本）
                   │
.browserslistrc ───┼──> Autoprefixer （決定 CSS 要加哪些 -webkit- / -moz- 前綴）
                   │
                   └──> PostCSS / SWC（決定要打包哪些 Polyfill）
```

(k) <mark style="background: #BBFABBA6;">不需要把每個瀏覽器都列出來</mark>，這些條件之間是 OR（聯集）關係：

| 條件 | 意思 |
| --- | --- |
| `> 0.5%` | 全球市佔率超過 0.5% 的所有瀏覽器版本，一行就涵蓋 Chrome、Safari、Edge、Firefox、Samsung Internet、Opera |
| `last 2 versions` | 所有主流瀏覽器的最新 2 個版本 |
| `Firefox ESR` | Firefox 企業長期支援版，更新慢、市佔常不到 0.5%，但企業還在用，所以單獨列出 |
| `not dead` | 排除官方停止維護、或超過 24 個月沒更新的廢棄瀏覽器 |

> [!tip] 要指定特定瀏覽器才需要寫死
> `Chrome >= 80`、`iOS >= 12`、`ie 11`、`last 2 Chrome versions`。大部分現代專案只要 `> 0.5%` / `last 2 versions` / `not dead` 三行。

### 四、寫在 package.json 的兩種格式（l–n）

(l) <mark style="background: #BBFABBA6;">陣列格式（一般專案）</mark>：在根層級加一個 `"browserslist"` 欄位，值是字串陣列，元素之間同樣是 OR 關係。

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": { "build": "vite build" },
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "Firefox ESR",
    "not dead"
  ]
}
```

(m) <mark style="background: #D2B3FFA6;">物件格式（分環境）</mark>：開發環境只支援最新瀏覽器以換取編譯速度，正式環境才追求相容性。

```json
{
  "browserslist": {
    "production": ["> 0.5%", "last 2 versions", "not dead"],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

(n) <mark style="background: #FFB8EBA6;">寫在 `package.json` 的好處是少維護一個 `.browserslistrc` 檔案</mark>，中小型專案更乾淨；大型專案或需要註解時才拆成獨立檔（`.browserslistrc` 支援 `#` 註解，JSON 不支援）。

## ⚠️ 存疑／更正

- Gemini 說 Browserslist 的資料「來自 Can I Use」。<mark style="background: #FF5582A6;">更精確的說法是：版本與支援度資料來自 `caniuse-lite`，但市佔率統計來自 StatCounter GlobalStats</mark>，兩者是不同來源。這也代表 `> 0.5%` 的結果會隨 `caniuse-lite` 版本更新而變動，所以官方建議定期執行 `npx update-browserslist-db@latest`——這點 Gemini 完全沒提，卻是實務上最常出現的建置警告。
- Gemini 舉的解析結果（chrome 124 / safari 17.4）是 2024 年前後的版本號，<mark style="background: #FF5582A6;">當作示意即可，不要當成現在的實際輸出</mark>。
- Gemini 提到「Vue CLI」。<mark style="background: #FF5582A6;">Vue CLI 已於 2024 年進入維護模式</mark>，新專案官方建議改用 `create-vue` + Vite。

## 各對話來源

### 瀏覽器相容性處理的原理與原因（2026-09）— https://gemini.google.com/app/a1a14102e2207433

**使用者：** 在我剛剛給你的這個例子，第二個參數是一個 function 裡面呼叫 checkUsername 傳入參數是 5，你覺得這是跟詞法作用域有關係而已，還是跟閉包有關係？可是開發者會需要寫很多的相容性的程式碼，這樣不會變得很混亂嗎？有沒有什麼套件可以一次轉換？

**Gemini：** 第一是「閉包」，第二是「現代前端開發早就不用手寫這些相容性程式碼了」。不能直接寫 `el.addEventListener('blur', checkUsername(5))`，因為那樣會立即執行並把回傳值傳給監聽器。詞法作用域是規則（決定匿名函式在定義時能存取哪些外層變數），閉包是現象與機制（函式被註冊給 DOM 後仍留在記憶體，觸發時仍能存取當初捕獲的環境），所以核心本質是閉包。相容性方面有三層工具：Polyfill（core-js，自動補缺失 API）、Transpiler（Babel，把 ES6+ 語法降級成 ES5）、以及 Babel + Polyfill + Browserslist 的專案自動化整合。

**使用者：** `> 0.5% / last 2 versions / Firefox ESR / not dead`，那如果不是 Firefox 也要一一寫出來嗎？

**Gemini：** 不用。Browserslist 是查詢語法、是篩選條件組合，條件之間是 OR（聯集）關係。`> 0.5%` 一行就涵蓋所有市佔超過 0.5% 的瀏覽器；`last 2 versions` 涵蓋主流瀏覽器最新兩版；`Firefox ESR` 單獨列出是因為企業長期支援版更新慢、市佔常不到 0.5%；`not dead` 排除已停止維護的廢棄瀏覽器。要針對特定瀏覽器才需要寫 `Chrome >= 80`、`iOS >= 12`、`ie 11` 這種。現代專案大多只要三行 `> 0.5%` / `last 2 versions` / `not dead`。

**使用者：** Browserslist 是一個插件嗎？

**Gemini：** 不是獨立執行的瀏覽器外掛，而是前端工具生態系的共用設定規格與庫。它同時是一個放在專案根目錄的設定檔（`.browserslistrc` 或 `package.json` 的 `browserslist` 欄位），也是一個 Node.js 的 npm 套件；Babel、Autoprefixer、ESBuild、SWC、Vite、Webpack 底層都引入了它。核心功能是把人類語言條件轉成確切的瀏覽器版本清單，扮演建置流程的「中央指令中心」，一次設定全家套用。

**使用者：** 「或直接寫在 package.json 裡的 browserslist 欄位」這邊怎麼寫？

**Gemini：** 在根層級新增 `"browserslist"` 欄位，值用字串陣列（條件之間同樣是 OR）。也可以改寫成物件格式做分環境設定，`production` 注重相容性、`development` 只支援最新瀏覽器以追求編譯速度。寫在 `package.json` 的優點是少維護一個獨立的 `.browserslistrc` 檔案。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/a1a14102e2207433 | Gemini Flash，2026-09-05 |
| Browserslist 官方 README（查詢語法與 package.json 設定） | https://github.com/browserslist/browserslist | 現行版本，2026-09-05 查證 |
| Browserslist — update-browserslist-db（定期更新資料庫） | https://github.com/browserslist/update-db | 現行版本，2026-09-05 查證 |
| Babel 官方 — @babel/preset-env（targets 讀 browserslist） | https://babeljs.io/docs/babel-preset-env | 現行文件，2026-09-05 查證 |
| core-js 官方 README（Polyfill 範圍） | https://github.com/zloirock/core-js | 現行版本，2026-09-05 查證 |
| MDN — Polyfill 名詞解釋 | https://developer.mozilla.org/en-US/docs/Glossary/Polyfill | MDN 現行版本，2026-09-05 查證 |
| Vue CLI 官方 — 已進入維護模式、建議改用 create-vue | https://cli.vuejs.org/ | 官方公告，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
