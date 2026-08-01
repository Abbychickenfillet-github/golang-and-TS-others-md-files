# JS Runtime(JavaScript 執行環境)

> 「讓 JS / TS 程式碼能跑起來的環境」——程式碼寫好之後,是誰去執行它。

## 這個資料夾收什麼

JavaScript 本身只是語言,要有一個 **runtime(執行環境)** 才能跑。常見的:

- **Node.js** — 第一個把 JS 帶出瀏覽器的伺服器端 runtime
- **Deno** — Node 作者 Ryan Dahl 的現代升級版(Rust 打造、預設安全、原生 TS)
- **Bun** — 主打極速的新 runtime
- **瀏覽器引擎**(V8 / SpiderMonkey)— 瀏覽器內建的 JS runtime

## 跟相鄰分類的差別(容易混淆)

| 分類 | 管什麼 | 例子 |
|---|---|---|
| **js-runtime(本資料夾)** | 程式碼「在哪裡、由誰執行」 | Node、Deno、Bun |
| **web-platform** (`frontend-docs/web-platform/`) | 瀏覽器這個平台原生提供的 API | DOM、IndexedDB、fetch |
| **build-and-compilation** | 程式碼跑之前怎麼被轉換/建置 | 編譯、打包、Lint、Parser |

> Deno 為什麼放這裡而不是 web-platform?因為它是**跑在瀏覽器外的執行環境**(類 Node.js),不是瀏覽器內建的平台 API。它雖然相容部分 Web API,但本質是 runtime。

## 本資料夾內容

- [[Deno-現代JS執行環境]] — Deno 是什麼、與 Node.js 的差異、預設安全、去中心化模組、內建工具鏈

## 相關筆記

- 建置工具鏈:`build-and-compilation/`(Deno 內建 lint/bundle、用 SWC 編譯,與此相關)
- 瀏覽器平台 API:`frontend-docs/web-platform/`
