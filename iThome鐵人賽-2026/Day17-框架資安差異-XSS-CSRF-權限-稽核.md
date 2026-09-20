# Day 17：換框架能讓你更安全嗎？XSS、CSRF、權限控管、稽核紀錄的框架相關性

## 你的三個提問

1. React、Vue、Angular 在處理 XSS 與 CSRF 上有不同嗎？
2. 權限控管跟稽核紀錄呢，框架幫得上忙嗎？
3. 如果我的網站被注入了惡意腳本，換一個「更安全的框架」有用嗎？

---

## 先給結論：四件事的框架相關性差很多

Day 16 比較了三個框架的效能優化機制，今天換一個角度比較：**資訊安全**。

但這一題有個容易被誤導的前提。很多人以為「資安」是一個整體，換一個更嚴謹的框架就整包升級。實際上這四件事的框架相關性是天差地遠：

| 項目 | 框架有沒有差別 | 為什麼 |
|---|---|---|
| **XSS**（Cross-Site Scripting，跨站腳本攻擊） | **差別很大** | 它發生在「模板渲染」這一層，而模板引擎就是框架的核心 |
| **CSRF**（Cross-Site Request Forgery，跨站請求偽造） | **差在「有沒有內建」** | 需要伺服器發 token，所以差異主要在後端框架 |
| **權限控管** | **幾乎沒差** | 這是應用邏輯，框架只提供一個掛載點 |
| **稽核紀錄**（Audit Log） | **完全沒差** | 框架根本不管這件事 |

**只有第一項真正跟前端框架有關。** 後面三項換哪個框架都一樣，這是本篇最重要的判斷。

---

## 一、XSS：唯一真正有框架差異的一項

### 先分清楚「轉義」和「淨化」

這兩個詞常被混用，但它們是完全不同的處理方式。

- **轉義（escape）**：把 `<` 換成 `&lt;`、`>` 換成 `&gt;`，讓瀏覽器把它當「文字」而不是「標籤」。內容原樣顯示，但不會被執行。

- **淨化（sanitize）**：真的去**解析**那段 HTML，把危險的部分挑掉（移除 `<script>`、拿掉 `onerror=`），保留安全的標籤。

白話講，轉義是「一律封殺，全部變成字」；淨化是「動手術，只切掉危險的部位」。

### 實測：同樣的輸入，兩種處理的結果

我用 Node.js 跑了四組輸入，左邊是轉義（模擬 React／Vue 的預設行為），右邊是淨化（用 DOMPurify）：

| 輸入 | 轉義 escape | 淨化 sanitize |
|---|---|---|
| `<b>重要</b>公告` | `&lt;b&gt;重要&lt;/b&gt;公告` | **`<b>重要</b>公告`** |
| `<script>alert(1)</script>` | `&lt;script&gt;alert(1)&lt;/script&gt;` | **（整段被移除，變成空字串）** |
| `<img src=x onerror=alert(1)>` | `&lt;img src=x onerror=alert(1)&gt;` | **`<img src="x">`** |
| `<a href="javascript:alert(1)">連結</a>` | `&lt;a href=&quot;javascript:...` | **`<a>連結</a>`** |

三個重點：

- **第一列**：轉義把使用者想要的粗體格式也一起殺掉了，淨化保留了格式。

- **第三列最精彩**：淨化的結果是 `<img src="x">`——**它只拿掉了 `onerror` 這個危險屬性，圖片標籤本身留著**。這就是「動手術」的意思。

- **第四列**：`<a>` 標籤留著，但那個 `javascript:` 的 `href` 被整個移除。

**所以轉義和淨化不是「哪個比較安全」，而是「你需不需要保留格式」。** 如果你的功能是富文本編輯器、留言可以加粗，轉義會直接讓功能不能用。

### 四個框架的對照

| 框架 | 預設行為 | 逃生門（繞過保護的寫法） | 名字有警告嗎 |
|---|---|---|---|
| React | `{}` 內的值自動轉義 | `dangerouslySetInnerHTML` | ✅ 名字直接罵你 |
| Vue | `{{ }}` 自動轉義 | `v-html` | ❌ 完全看不出危險 |
| Angular | 自動轉義**＋主動淨化** | `bypassSecurityTrustHtml` | ✅ 有警告 |
| Svelte | 自動轉義 | `{@html ...}` | ❌ 沒警告 |

**Angular 是四個裡面最嚴格的**，因為它內建了 `DomSanitizer`，做的是上表右邊那件事（淨化）。React、Vue、Svelte 做的是左邊（轉義）。

差別在實務上是這樣：

- **React 和 Vue 只給你兩個極端**——要嘛全部轉義（格式壞掉），要嘛用逃生門全部放行（等於沒有保護）。中間那層淨化要自己裝 DOMPurify。

- **Angular 內建就有中間層**，不用額外裝。

（順帶一提，如果你的專案裡看到 `isomorphic-dompurify` 或 `dompurify` 這個套件，那就是在補這一層。）

### 逃生門的命名其實是一種設計態度

```jsx
// React：你很難假裝不知道自己在做危險的事
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Vue：看起來就像一個普通的指令
<div v-html="userInput"></div>
```

白話講，兩行做的是**完全一樣**的危險操作——把使用者的輸入當 HTML 直接塞進 DOM。但 React 在 API 名稱裡塞了 `dangerously` 這個字，還故意設計成要傳一個 `{ __html: ... }` 的物件（多一道手續），就是為了讓你在 code review 時一眼看到。

**這不影響安全性，但影響「出事的機率」。** Vue 的 `v-html` 在程式碼裡混在一堆 `v-if`、`v-for` 之間，肉眼很容易滑過去。

### 三個地方所有框架都幫不了你

**a. URL 屬性的語意**

```jsx
<a href={userInput}>點我</a>
```

白話講：使用者輸入 `javascript:alert(1)`，這行就變成一個可執行的連結。**React 只會在 console 印警告，不會阻止**；Vue 和 Svelte 完全不管。

原因是框架的自動轉義只管「文字內容」，不管「屬性值代表什麼意思」。`javascript:` 這五個字在文字裡完全無害，在 `href` 裡就是攻擊。

**b. CSS 注入**

框架的轉義機制對 CSS 沒有任何概念。把使用者輸入放進 `style` 屬性或 `<style>` 標籤，框架不會幫你檢查。

**c. 沒有經過框架的注入**

這一點最重要，我用自己的案例說明。

---

## 二、我的真實案例：四個框架都擋不住的那一種

上個月我的個人 Next.js 專案被注入了惡意腳本。惡意的那一行長這樣，插在 `<head>` 裡：

```html
<script src="data:text/javascript;base64,CmFzeW5jIGZ1bmN0aW9uIGxvYWRf..."></script>
```

排查之後確認的事實：

- 我的 Git 原始碼是乾淨的，全專案搜尋惡意關鍵字零命中。

- 打包出來的 27 個 JS chunk 也是乾淨的。

- **但線上網站回傳的 HTML 有那一行。**

- 而且它會挑對象：用 `fetch()` 的預設標頭去要，回傳 12,932 bytes 乾淨版本；加上模擬真人瀏覽器的 `Accept: text/html,...` 標頭，回傳 16,076 bytes，多出來的就是那行 script。

- **連 404 頁面也被注入**，而 404 頁面完全不碰資料庫。

結論是：**注入發生在「伺服器回應 HTTP 請求的當下」，不是在打包時，也不是從資料庫來的。**

### 為什麼這件事跟框架無關

React 的自動轉義，只能保護「**從 React 的渲染流程流進去的資料**」。

而那行惡意 script 是在 HTML 已經產生之後、送出回應之前被插進去的——**它從頭到尾沒有經過 React**。所以 React 的保護機制連介入的機會都沒有。

> **框架的 XSS 防護保護的是「資料流進畫面」那一段。一旦攻擊者能改 HTTP 回應本身，換哪個框架都一樣。**

如果當時我用的是 Angular，結果會完全相同。

---

## 三、CSRF：差別在「誰負責發 token」

| 框架 | 有沒有內建 CSRF 防護 |
|---|---|
| Next.js | 一般的 API Route **沒有**；Server Actions 有 Origin／Host 比對 |
| Nuxt | 沒有，要自己裝 `nuxt-security` |
| Angular | **有**（`HttpClientXsrfModule`，但需要後端配合放 cookie） |
| Rails／Django／Laravel | **有，而且預設開啟** |

### 為什麼前端框架大多沒有

**CSRF token 必須由伺服器產生、由伺服器驗證。**

React 和 Vue 是 UI 層，它們沒有「伺服器」這個東西，所以沒辦法內建。前端能做的只有「把 token 帶上」這個動作。

Angular 之所以有，是因為它是**全功能框架**，內建了 HTTP client，所以順便把「自動從 cookie 讀 token、塞進請求 header」這件事包進去。它做的還是「帶上」，token 本身還是要後端發。

### 而且現在的主流解法已經跟框架脫鉤了

```
Set-Cookie: session=xxx; SameSite=Lax; Secure; HttpOnly
```

白話講，這行 HTTP 回應標頭在告訴瀏覽器三件事：

- `SameSite=Lax`：從**別的網站**發過來的請求，不要帶這個 cookie（這一條就擋掉大部分 CSRF）

- `Secure`：只有 HTTPS 才送出

- `HttpOnly`：JavaScript 讀不到它（防的是 XSS 偷 cookie）

**這是瀏覽器層的防護，換什麼框架都一樣有效。** 現代瀏覽器的 `SameSite` 預設值已經是 `Lax`，這也是為什麼新專案對傳統 CSRF token 的依賴下降了。

---

## 四、權限控管：框架只給掛載點

各框架提供的掛載點名字不同，但做的事完全一樣：

- **Next.js** → `middleware.js`

- **Angular** → Route Guards（路由守衛）

- **Vue Router** → navigation guards（導航守衛）

- **React Router** → loader，或自己包一個 `<RequireAuth>` 元件

**框架提供的只有「在進入這個頁面前執行一段檢查」這個時機**，檢查邏輯完全是你自己寫的。所以這一項沒有框架優劣可比。

### 但有一句比框架比較重要一百倍的話

> **前端的權限控管只是 UI，不是安全。**

任何前端守衛都可以被繞過：

- 打開 DevTools 直接改變數

- 用 `curl` 或 Postman 直接打你的 API

- 把打包後的 JS 改掉再執行

**前端的權限判斷只是「不要讓使用者看到他不該看的按鈕」，真正的守門員必須在後端的每一個 API 端點。**

### 這一點我也踩到了

同一次排查裡，我發現自己的專案有一個端點 `/api/website-content`，**對全世界公開回傳 130 KB 的專案內部資訊**，包含完整的 `package.json`、所有 API 路由清單、所有元件名稱。

任何人都能拿到我用了哪些套件、哪個版本，然後精準比對「哪個版本有已知漏洞」。這叫 **Information Disclosure（資訊洩漏）**。

前端有沒有把這個端點藏起來完全不重要——攻擊者是直接打那個網址。

**所以權限控管要問的不是「我的框架怎麼做路由守衛」，而是「我的每一個 API 端點都有自己驗過身分嗎」。**

---

## 五、稽核紀錄：完全沒有框架差異

這一項連比較的空間都沒有，因為它根本不在前端框架的職責範圍。稽核紀錄屬於三個地方：

- **後端應用層**：誰在什麼時間、對什麼資源、做了什麼操作，寫進 audit table

- **資料庫層**：觸發器（trigger），或 CDC（Change Data Capture，變更資料擷取）

- **基礎設施層**：APM（Application Performance Monitoring，應用效能監控）、log 聚合服務

**前端框架連「使用者是誰」都只是暫存在記憶體裡，沒有資格當稽核來源**——因為前端送上來的任何資料都可以被偽造。一份能被偽造的紀錄，在稽核上等於沒有紀錄。

---

## 六、今天的判斷標準

下次看到「某框架比較安全」這種說法時，先問它在講哪一層：

| 這件事發生在哪一層 | 框架幫得上忙嗎 | 誰該負責 |
|---|---|---|
| 資料從框架流進畫面 | ✅ **幫得上**（自動轉義、Angular 的淨化） | 框架 ＋ 你選對 API |
| 要保留格式又要安全 | ⚠️ 部分（Angular 內建，React／Vue 要裝 DOMPurify） | 你 |
| URL 屬性、CSS 注入 | ❌ 幫不上 | 你自己驗證 |
| 跨站請求偽造 | ⚠️ 後端框架的事 | 後端 ＋ SameSite cookie |
| 誰能存取哪個 API | ❌ 幫不上 | **後端，每一個端點** |
| 誰在什麼時候做了什麼 | ❌ 完全幫不上 | 後端與基礎設施 |
| HTTP 回應本身被改寫 | ❌ 完全幫不上 | 部署管線與供應鏈 |

**一句話總結：**

> **框架能幫你的只有「資料流進畫面」那一段。CSRF 是後端的事，權限控管是 API 的事，稽核是資料庫和基礎設施的事。**

所以「換一個更安全的框架」這個念頭，只在 XSS 這一項上有意義，而且效果有限。

---

## 明天預告

Day 18 講**供應鏈安全**：`npm install` 到底做了什麼、`postinstall` 腳本為什麼是投毒的熱門入口，以及 `npm ci --ignore-scripts` 差在哪。這一篇會用我自己那次被駭的 Dockerfile 當教材。

---

## 完整可執行程式碼

存成 `day17-escape-vs-sanitize.js`，執行 `node day17-escape-vs-sanitize.js` 可以重跑本文的對照表。第二部分需要先 `npm install isomorphic-dompurify`，但第一部分純 JavaScript 就能跑。

```js
// ── Part 1：轉義（escape）─── 純 JavaScript，不需要任何套件 ───────
// 白話講：把 HTML 的特殊字元換成實體編碼，讓瀏覽器當文字看而不是當標籤看
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const payloads = [
  ['<b>重要</b>公告',                        '使用者想要粗體'],
  ['<script>alert(1)</script>',              '明顯的攻擊'],
  ['<img src=x onerror=alert(1)>',           '靠事件屬性攻擊'],
  ['<a href="javascript:alert(1)">連結</a>', '靠 URL 協定攻擊'],
];

console.log('=== Part 1：轉義的結果（模擬 React / Vue 的預設行為）===\n');
for (const [input, note] of payloads) {
  console.log(`情境：${note}`);
  console.log(`  原始：${input}`);
  console.log(`  轉義：${escapeHtml(input)}`);
  console.log('  → 不會執行，但如果使用者本來就想要格式，格式也一起被殺掉了\n');
}

// ── Part 2：淨化（sanitize）─── 需要 npm install isomorphic-dompurify ──
// 白話講：真的解析這段 HTML，把危險的標籤與屬性挑掉，保留安全的部分
let DOMPurify;
try {
  DOMPurify = require('isomorphic-dompurify');
} catch (e) {
  console.log('=== Part 2 略過 ===');
  console.log('  要跑這一段請先執行：npm install isomorphic-dompurify\n');
  process.exit(0);
}

console.log('=== Part 2：轉義 vs 淨化 對照 ===\n');
console.log('輸入'.padEnd(42), '| 淨化後的結果');
console.log('-'.repeat(80));
for (const [input] of payloads) {
  console.log(input.padEnd(40), '|', DOMPurify.sanitize(input) || '（整段被移除）');
}

console.log(`
  觀察三件事：
    a. <b> 被保留了       → 淨化不會破壞使用者想要的格式
    b. <script> 整段消失   → 危險標籤直接移除
    c. <img> 留著但 onerror 不見了
       → 這是淨化最關鍵的特徵：它只切掉危險的屬性，不是把整個標籤殺掉
`);
```

---

## 參考來源與內容出處說明

延續這個系列的做法，把內容分類標示，讓讀者能自己判斷可信度。

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| Angular 的 `DomSanitizer` 與內建淨化機制 | Angular 官方文件，Security 章節：https://angular.dev/best-practices/security |
| React 對 `dangerouslySetInnerHTML` 的設計與命名理由 | React 官方文件：https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html |
| Vue 的 `v-html` 與 XSS 警告 | Vue 官方文件，Security 章節：https://vuejs.org/guide/best-practices/security |
| `SameSite` cookie 屬性的行為 | MDN：https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite |
| DOMPurify 的淨化行為 | DOMPurify 專案：https://github.com/cure53/DOMPurify |

**二、我實際跑出來的部分**

本文的轉義與淨化對照表，由文末的腳本實測產生（Node.js 環境，DOMPurify 版本以 `npm install` 當下為準），可以重跑驗證。

**三、我自己的整理與判斷（沒有外部出處）**

- 「四件事的框架相關性差很多」這個分層方式

- 「轉義是一律封殺、淨化是動手術」這個比喻

- 「逃生門的命名是一種設計態度」這個觀察

- 第六節那張「這件事發生在哪一層」的判斷表

- 「前端的權限控管只是 UI 不是安全」這句話是業界常見共識，但這裡的表述是我自己的

**四、我的個人案例**

第二節與第四節的被駭經驗是我自己專案的真實排查紀錄，包含回應大小差異、404 也被注入、以及公開端點洩漏 130 KB 內部資訊。這部分沒有外部出處，是第一手記錄。

（查閱日期：2026-09-18）
