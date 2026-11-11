---
title: XSS 竊取 Cookie 的原理，與 Next.js cookies() API、HttpOnly 防線
type: topic-note
source: Gemini
category: tech
tags: [gemini, backend, xss, cookie, httponly, samesite, nextjs, csp, fastapi-422]
sources:
  - https://gemini.google.com/app/07d3b7390bc6aaa3
updated: 2026-10-28
charset: utf-8
---

# XSS 竊取 Cookie 的原理，與 Next.js cookies() API、HttpOnly 防線

本篇重點 a–o，共 15 個。

## 重點整理

### 1. 駭客不用在你的電腦上，XSS 怎麼偷到 Cookie

(a) <mark style="background: #ADCCFFA6;">XSS（Cross-Site Scripting，跨站腳本攻擊）</mark>的本質是<mark style="background: #FFF3A3A6;">讓你信任的網站執行駭客寫的 JavaScript</mark>，所以駭客全程在遠端。
  - 步驟一：駭客找到沒清理輸入的漏洞點（留言板，或把路由參數直接印到頁面的搜尋框）。
  - 步驟二：受害者打開被植入的頁面（Stored XSS），或點駭客做的連結（Reflected XSS）。
  - 步驟三：瀏覽器把腳本當網站自己的程式碼執行。
  - 步驟四：腳本讀 `document.cookie` 或 `localStorage`，再送到駭客伺服器。

(b) <mark style="background: #FF5582A6;">路由動態參數本身拿不到 Cookie</mark>，它只是運送惡意腳本的載體，真正偷東西的是被執行的腳本。

(c) 偷 Session Cookie 的前提是受害者已登入，因為瀏覽器裡要有有效的 Session Cookie，拿到後駭客把它設進自己的瀏覽器就能冒充，叫 Session Hijacking（會話劫持）。
  - 與 [[2-Cookie隔離邊界與跨站請求安全-Origin-SameSite-CSRF-Token與Bearer]] 相關，因為 SameSite 擋的是 CSRF，HttpOnly 擋的才是 XSS 讀取。

(d) 「轉義（escape）」的「渲染」與 Critical Rendering Path 的「渲染」不是同義詞。
  - 轉義那句講的是語意與安全：`<script>` 變 `&lt;script&gt;` 後，HTML parser 把它當 Text Node 而不是 Element。
  - 後面那句講的是引擎流水線：HTML parsing 建 DOM、同時建 CSSOM，合成 render tree，再 layout 與 paint。純文字也要走完整條流水線才顯示。
  - 與 [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]] 相關。

### 2. Next.js／React 的防線

(e) <mark style="background: #BBFABBA6;">自動轉義</mark>：JSX 裡 `{data}` 預設把字串轉義，所以反射型與儲存型 XSS 風險大降。

(f) <mark style="background: #FF5582A6;">最大漏洞點是 `dangerouslySetInnerHTML`</mark>：它塞原始 HTML，絕不能餵使用者輸入，非用不可要先過 [DOMPurify](https://github.com/cure53/DOMPurify) 清理（sanitize）。

(g) Cookie 三屬性：`HttpOnly`（JS 讀不到）、`Secure`（只走 HTTPS）、`SameSite=Strict/Lax`（擋跨站自動帶）。
  - `Lax` 是英文「寬鬆」，不是法文，字源是拉丁文 laxus，法文對應詞是 lâche。
  - `SameSite=Lax` 只允許頂層導航加 GET 帶 Cookie，主流瀏覽器未指定時預設為 Lax。

(h) 額外一層 [CSP（Content-Security-Policy）](https://developer.mozilla.org/zh-TW/docs/Web/HTTP/CSP)：即使腳本被注入，也限制腳本來源與外送目的地。可在 next.config.js 或 Middleware 設定回應標頭。

### 3. Cookie 容量

(i) <mark style="background: #FFB8EBA6;">4KB 是「單一 Cookie」的上限</mark>（名稱加值加屬性），不是整個網域。
  - 網域另有數量上限，依 [RFC 6265](https://datatracker.ietf.org/doc/html/rfc6265) 建議至少支援每網域 50 個、每個 4096 位元組。
  - ⚠️ 存疑：Gemini 說「每域 20 到 180 個」「總容量 50–100KB」，並無統一標準，且超過 4KB 時瀏覽器通常是「忽略該 Cookie」而非「截斷」。

### 4. Next.js cookies() 方法

(j) 引入方式 `import { cookies } from 'next/headers'`，方法有 get、getAll、has、set、delete、toString。

```js
const theme = cookies().get('user-theme');          // 取單一，回傳 { name, value }
const all = cookies().getAll();                      // 取全部，回傳陣列
const has = cookies().has('session-id');             // 布林
cookies().set('auth-token', 'xyz', { httpOnly: true, secure: true, maxAge: 60*60*24*7, path: '/' });
cookies().delete('auth-token');                      // 登出時刪除
```

(k) <mark style="background: #FF5582A6;">⚠️ 存疑／更正</mark>：Gemini 範例寫 `cookies().get(...)` 同步呼叫。Next.js 15 起 `cookies()` 是非同步，要寫 `const c = await cookies()`。
  - `set` 與 `delete` 只能在 Server Action 或 Route Handler 使用，不能在 Server Component 渲染中呼叫。
  - Gemini 列的 `clear()` 我印象中官方文件已不列為方法，請以 [Next.js cookies 文件](https://nextjs.org/docs/app/api-reference/functions/cookies) 為準。
  - 以上為依我所知的版本推論，未即時重新抓取官方文件，請自行核對版本。
  - 與 [[nextjs-app-router-vs-pages-router]] 的 Server Component 概念相關。

### 5. 附帶除錯案例

(l) psql 看全部列：`SELECT * FROM public.member;`，只看特定欄位則列出欄名。結果過長時用空白鍵翻頁，按 `q` 離開。

(m) psql 出現 `syntax error at or near ".."`：多半是提示符號下前一行輸入了多餘字元或沒收尾的命令，與後一行被合併。重新輸入乾淨的完整語句並以 `;` 結尾。

(n) API 回 422 Unprocessable Content，`loc: ["body","username"]` 與 `["body","password"]` 皆 missing：後端（看起來是 FastAPI 的 OAuth2 表單）期望欄位叫 `username` 而你送了 `email`，且該端點可能期待 form-data 而不是 JSON。
  - ⚠️ Gemini 只說改欄位名，沒提 OAuth2PasswordRequestForm 預設吃 `application/x-www-form-urlencoded`，建議同時確認 Content-Type。
  - 對話截圖中出現測試密碼，本筆記刻意不收錄。

(o) 提醒：圖二的標頭是 200 OK 的成功回應，與 422 無關，其中的 Content-Security-Policy 就是重點 (h) 的實例。

## 各對話來源

### Cookie 與 LocalStorage 差異比較（2026-10-28 擷取）— https://gemini.google.com/app/07d3b7390bc6aaa3

使用者：lax 是法文嗎 → Gemini：不是，拉丁文 laxus，並整理 SameSite=Lax。

使用者：4KB 是每個 cookie 還是每個域名？ → Gemini：單一 Cookie，另有每域數量限制。

使用者：XSS 能透過路由得到使用者 ID 嗎？Next.js 有防護嗎？ → Gemini：可，反射型 XSS，並列自動轉義、dangerouslySetInnerHTML、HttpOnly、CSP。

使用者：駭客不在我電腦上，不用登入也能得到 Cookie？ → Gemini：利用網站漏洞遠端借用你的瀏覽器，路由參數只是載體。

使用者：貼 next/headers cookies 方法表，要範例 → Gemini：逐方法範例。

使用者：psql 看所有 row／哪裡打錯／422 錯誤截圖 → Gemini：SELECT 與 username 欄位修正。

使用者：XSS 轉義的「渲染」與 critical render path 的「渲染」是同義詞嗎？ → Gemini：不同層面，但相扣。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原對話 | https://gemini.google.com/app/07d3b7390bc6aaa3 | 2026-10-28 擷取 |
| Cookie 規格 | https://datatracker.ietf.org/doc/html/rfc6265 | RFC 6265，2011 |
| CSP | https://developer.mozilla.org/zh-TW/docs/Web/HTTP/CSP | MDN，2026-10-28 引用（未即時重抓） |
| Next.js cookies | https://nextjs.org/docs/app/api-reference/functions/cookies | 2026-10-28 引用（未即時重抓，版本請核對） |
| DOMPurify | https://github.com/cure53/DOMPurify | 2026-10-28 引用 |
