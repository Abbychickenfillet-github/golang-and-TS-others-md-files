---
title: url.parse 與 URL.parse — 小寫是 Node 舊 API，大寫是 WHATWG 標準
type: topic-note
source: Node.js 與 MDN 官方文件加實測
tags: [node, url, whatwg, deprecation, security, dep0169]
updated: 2026-10-26
---

# url.parse 與 URL.parse

> 本篇重點 a–f，共 6 個

> [!info] 互動版（點擊填空與是非題）
> ![[url-parse-vs-url-class-parse-legacy-vs-whatwg.html]]

## a. 三個寫法對照

| 項目 | url.parse() | URL.parse() | new URL() |
| --- | --- | --- | --- |
| 怎麼取得 | `require('url')` 模組，小寫 | 全域 `URL` 類別的靜態方法，大寫 | 同左，建構式 |
| 屬於哪一派 | Legacy URL API，只有 Node | WHATWG URL | WHATWG URL |
| 哪裡能用 | 只有 Node | 瀏覽器 Baseline 2024（2024 年 9 月起），Node v22.1.0 起 | 瀏覽器與 Node |
| 官方狀態 | Stability 0 Deprecated。Node 24.0.0 起 DEP0169 為 Application deprecation | 現行標準 | 現行標準 |
| 輸入無效 | 很寬鬆，非字串才丟 TypeError | 回傳 null | 丟 ERR_INVALID_URL |
| 相對路徑 | 接受，host 為 null | 要 base，否則 null | 要 base，否則丟錯 |
| 回傳形狀 | auth、query、path | URL 物件 | URL 物件 |

## b. 官方說法

| 重點 | 內容 | 來源 |
| --- | --- | --- |
| 安全 | 使用寬鬆、非標準的演算法，有主機名稱欺騙與帳密處理的風險，勿用於不可信輸入，漏洞不核發 CVE | Node.js url 文件，頁面 v26.12.1，未標更新日期 |
| DEP0169 | Type 為 Application，只針對非 node_modules 程式碼。v24.0.0 Application deprecation | Node.js deprecations 文件，同版本，未標更新日期 |
| 遷移工具 | `npx codemod@latest @nodejs/node-url-to-whatwg-url` | Node.js url 文件 |
| URL.parse 瀏覽器 | Baseline 2024，2024 年 9 月起 | MDN，last modified Jun 23, 2025 |

## c. 實測（Node v24.14.0，2026-10-26）

| 輸入 | url.parse | new URL | 有差異嗎 |
| --- | --- | --- | --- |
| `/a/b?x=1` | 接受，host null | 丟 ERR_INVALID_URL | 有，寬鬆對嚴格 |
| `//a.com/x` | host null | 丟 ERR_INVALID_URL | 有 |
| `http:a.com/x`（少 //） | host null，path `a.com/x` | host a.com，path `/x` | 有，主機不同 |
| 反斜線 | host a.com，path /x | 同 | 沒有 |
| 大小寫 | host a.com，path /X | 同 | 沒有 |
| 前後空白 | host a.com，path /x | 同 | 沒有 |

反斜線、大小寫、前後空白三項兩者相同，不要寫成有差。真正讓兩個 parser 認出不同主機的是少一個斜線的 `http:a.com/x`。

## d. Parser differential

檢查用 `new URL`、發請求用 `url.parse`，同一字串兩邊解讀的主機不同。差異本身已實測，實際能否利用取決於請求端如何處理 host 為 null，這部分未實測。原則是檢查與使用同一個 parser，並用標準的那個。

## e. 怎麼找出誰在呼叫

```bash
npx cross-env NODE_OPTIONS=--trace-deprecation npm run build
```

| 要點 | 說明 | 驗證 |
| --- | --- | --- |
| 為何用 NODE_OPTIONS | 環境變數會被子行程繼承，next build 的 worker 也吃得到。直接寫 node 旗標只作用在第一個行程 | 已實測，子行程只有 NODE_OPTIONS 才印堆疊 |
| 為何可能找不到 | DEP0169 只對非 node_modules 程式碼印警告，依賴內的呼叫靜默，加 `--pending-deprecation` 也一樣 | 已實測 |
| 看到警告代表 | 呼叫點在非 node_modules 路徑，可能是專案檔、設定檔，或被打包進 `.next/server` 的依賴 | 後半為推論 |
| build 後再搜 | `grep -rn "url.parse" .next/server` | 未執行 |

## f. 遷移

| 舊 | 新 | 注意 |
| --- | --- | --- |
| `url.parse(str).pathname` | `new URL(str).pathname` | 相對路徑要 base |
| `url.parse(req.url, true).query` | `new URL(req.url, base).searchParams` | Node 的 req.url 是相對路徑 |
| try 與 catch 包 new URL | `URL.parse(str, base)` 判斷 null | 舊瀏覽器改用 `URL.canParse()` |

## 關聯筆記

- [[nextjs-prerender-and-csr-bailout]]：這個警告出現在 npm run build，原因是建置期的程式碼跑在 Node。
- [[Node-global與process物件屬性逐行解釋]]：同屬 Node 專有 API 的對照。

## 資料來源（含查證時間）

查閱日 2026-10-26。

| 主題 | 連結 | 頁面標示的日期 |
| --- | --- | --- |
| Node.js url | https://nodejs.org/api/url.html | 未標示，查閱日（頁面 v26.12.1） |
| Node.js deprecations | https://nodejs.org/api/deprecations.html | 未標示，查閱日（頁面 v26.12.1） |
| MDN URL.parse() | https://developer.mozilla.org/en-US/docs/Web/API/URL/parse_static | last modified Jun 23, 2025 |

**未查證**：differential 在真實請求函式庫是否可利用，被打包進 .next/server 的呼叫點是哪個套件，Node v26 的行為是否與 v24.14.0 相同。
