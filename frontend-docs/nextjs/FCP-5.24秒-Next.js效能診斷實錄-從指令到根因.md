# FCP 5.24 秒該怎麼查？一次 Next.js 效能診斷的完整實錄

> 專案：`C:\coding\next-one-main`（Next.js 15.5.3, App Router）
> 症狀：登入後導向 `/dashboard`，FCP = 5.24 秒
> 日期：2026-09-16
> 相關筆記：[FCP首次內容繪製-SEO爬蟲與打包五步驟](../FCP首次內容繪製-SEO爬蟲與打包五步驟.md)、[CSS 的兩種卡頓](../css/css-兩種卡頓-render-blocking與執行期jank.md)、[App-Router與Pages-Router-RSC與Streaming-SSR](./App-Router與Pages-Router-RSC與Streaming-SSR-loading與error約定.html)

---

## 這份文件要回答什麼

「FCP 5.24 秒」只是一個數字。真正要學的是：**拿到這個數字之後，下一步該敲什麼指令？**

這份文件按照實際診斷順序走一遍，每一步都寫清楚：
1. 敲了什麼指令
2. 每個參數是什麼意思
3. 看到什麼輸出
4. 從這個輸出**推論出什麼**、**為什麼下一步要做那件事**

最後得到三個根因，都不是「JavaScript 寫不好」。

---

# 第一部分：名詞先講清楚

不先把這幾個詞釘死，後面的診斷會看不懂。

## 1-1. 建置期（build time）vs 執行期（runtime）

| | 建置期 | 執行期 |
|---|---|---|
| **什麼時候** | 你敲 `npm run build` 的那幾十秒 | 使用者打開網頁的時候 |
| **在哪裡跑** | 你的電腦 / CI 機器 | 伺服器（Node.js）或使用者的瀏覽器 |
| **產物** | `.next/` 資料夾 | HTTP 回應、畫面 |
| **能不能知道 query string** | **不能**（還沒有人發請求） | 能 |
| **能不能知道 cookie** | **不能** | 能 |

**這張表是整篇文章的關鍵。** 後面所有問題都源自「建置期不知道的東西，卻在建置期被要求算出來」。

## 1-2. 渲染（render）是什麼

在前端語境，「渲染」= **把元件（component）變成實際的 HTML 標籤**。

```jsx
// 這是元件（一個函式）
function Hello() { return <h1>你好</h1> }

// 「渲染」它 = 執行這個函式，得到：
<h1>你好</h1>
```

React 可以在兩個地方做這件事：
- **在瀏覽器**：執行 JS，產生 DOM 節點
- **在 Node.js 伺服器**：執行同一份 JS，產生 **HTML 字串**（這叫 SSR）

## 1-3. 「預」渲染（prerender）的「預」是預在哪裡？

你問的好：SSR 跟 SSG 好像都有預渲染，到底差在哪？

**「預」= 在使用者發出請求之前就先做好。**

對照三種時機：

| 名稱 | 渲染發生的時機 | 一次渲染服務幾個人 | Next.js build 輸出標記 |
|---|---|---|---|
| **SSG**（靜態產生） | **建置期**，`npm run build` 時 | 所有人共用同一份 | `○ (Static)` |
| **SSR**（伺服器渲染） | **執行期**，每次請求時在 server 跑 | 一次只服務這一個請求 | `ƒ (Dynamic)` |
| **CSR**（客戶端渲染） | **執行期**，在使用者瀏覽器裡跑 | — | 沒有 server HTML |

**嚴格講，「預渲染」通常指 SSG**（build 時就產生好 HTML 檔案躺在硬碟上）。
但廣義上 SSR 也算「預」——因為它也是在瀏覽器拿到東西之前，就先在 server 算好 HTML。

兩者的共同點才是重點：**瀏覽器收到的第一份 HTML 裡面已經有內容了。**

### 為什麼要預渲染？為什麼不直接在瀏覽器渲染就好？

因為「直接渲染」（純 CSR）的流程是這樣：

```
瀏覽器收到 HTML  →  <body> 裡只有 <div id="root"></div>，空的
                     ↓
                  下載 JS bundle（可能幾百 KB）
                     ↓
                  解析、執行 JS
                     ↓
                  React 開始 render
                     ↓
                  終於有東西可以畫   ← FCP 發生在這裡，已經過了好幾秒
```

預渲染的流程：

```
瀏覽器收到 HTML  →  <body> 裡已經有完整內容
                     ↓
                  立刻畫出來   ← FCP 發生在這裡
                     ↓
                  （背景）下載 JS → hydrate → 可以互動
```

**FCP 的差距就在這裡。** 預渲染把「第一眼看到東西」的時間點，從「JS 跑完之後」提前到「HTML 到達的當下」。

另一個理由是 SEO：爬蟲不一定會等你的 JS 跑完。

## 1-4. Hydration（注水）

預渲染送來的 HTML 是「**乾的**」——看得到，但按鈕按下去沒反應，因為事件監聽器還沒接上。

瀏覽器下載 JS 後，React 會在同一棵 DOM 上重建元件樹、把 `onClick` 之類的接回去。這個過程叫 hydration（注水），讓乾的骨架「活過來」。

```
FCP（看得到）  ────────→  TTI（可以互動）
      ↑                        ↑
   HTML 到達              hydrate 完成
```

## 1-5. Bailout（跳船）

**bail out** 是英文慣用語，本意是「**跳傘逃生**」——飛機出狀況，跳出去保命。

程式裡引申為：**執行到一半發現這條路走不通，中途放棄，改走備用路徑。**

在 Next.js 的脈絡：

> **bail out to client-side rendering**
> = server 端渲染到一半，發現有個東西在建置期根本算不出來，於是**整塊放棄**，把這段交給瀏覽器去畫。

後果：那一塊的 HTML 是空的 → 回到 1-3 講的純 CSR 流程 → FCP 爆掉。

> 同一個「中途放棄」的概念在別處也會看到：V8 引擎的 **deoptimization bailout**（JIT 最佳化後發現型別假設被打破，退回直譯執行）、演算法的 early bailout（提前 `break`）。金融的 bailout（紓困）是完全不同的意思。
> 參考：[V8引擎完整管線-Parse到Deoptimization](../../V8引擎完整管線-Parse到Deoptimization.md)

## 1-6. Render-blocking（阻塞繪製）

瀏覽器規格規定：**CSSOM 建好之前，一個像素都不畫。**

CSSOM = CSS Object Model，就是把 CSS 檔案解析成的樹狀資料結構（跟 DOM 是 HTML 的樹狀結構同理）。

為什麼要阻塞？因為不阻塞就會 FOUC（Flash of Unstyled Content）——先畫出沒樣式的醜畫面，CSS 載完再跳一次版。瀏覽器的取捨是：**與其閃兩次，不如等一次。**

所以：**CSS 檔案的大小會直接加進 FCP 的時間裡。**

## 1-6b. FCP 一定是 CSS 太大嗎？（責任歸屬的釐清）

不一定。FCP = 「第一次畫出任何文字或圖片」，拖慢它的原因有好幾類：

| 原因 | 說明 |
|---|---|
| TTFB 慢 | 伺服器半天不回應，HTML 都還沒到 |
| **render-blocking 資源** | CSS 或同步 `<script>` 沒載完，瀏覽器不准畫 |
| **HTML 是空的** | body 裡沒內容，要等 JS 跑完才有東西可畫 |
| 重新導向 | 多一次往返 |
| `font-display: block` | 字型沒載完就不顯示文字 |

### 本專案的責任歸屬（重要修正）

關鍵：`<body>` 裡**其實有東西**——那個 `<Footer>`（它在 `<Suspense>` 外面，沒被 bailout 波及，見 Step 6 的對照組）。Footer 有文字，所以：

```
HTML 到達（body 裡有 Footer 文字）
      ↓
682 KB CSS 全部載完 + 解析      ← FCP 卡在這裡
      ↓
Footer 畫出來 → FCP 觸發
      ↓
JS hydrate → 3 個 API 瀑布 → dashboard 內容出現 → LCP 才觸發
```

驗算：Lighthouse 預設模擬 Slow 4G（約 1.6 Mbps），682 KB ÷ 1.6 Mbps ≈ **3.4 秒**，再加 TTFB、CSS 解析、以及 `bs-icon` 那條往 jsdelivr 的串行 `@import`（多一輪 DNS + TLS + 下載）——**5.24 秒完全對得上**。

| 指標 | 主兇 |
|---|---|
| **FCP**（第一次看到東西） | **682 KB render-blocking CSS** |
| **LCP / TTI**（看到真正的 dashboard、能操作） | **CSR bailout + 三段 API 瀑布** |

**所以：如果目標是壓低 FCP 數字，先砍 CSS 最直接；bailout 修的是 LCP 和「頁面可用」的時間。** 兩個都要修，但先後順序要看你想改善哪個指標。

---

## 1-6c. 字型會「編譯成」CSS 嗎？——一半會，而且是反直覺的那一半

字型有兩個東西，分清楚很重要：

| | 是什麼 | 在哪 | 體積 | 阻塞繪製？ |
|---|---|---|---|---|
| **字型檔** | 真正的字形輪廓（二進位資料） | `.next/static/media/*.woff2`，**105 個檔，共 4.3 MB** | 大 | **不會**（有 `font-display: swap`） |
| **`@font-face` 宣告** | 純文字的「說明書 / 索引卡」 | 打包進 CSS，**397 KB** | 每張小，但 × 421 | **會** |

一張「索引卡」的實際內容：

```css
@font-face{
  font-family:Noto Sans TC;
  font-weight:300;
  font-display:swap;
  src:url(/_next/static/media/6049ff46322d9444-s.woff2) format("woff2");   /* 只是指路 */
  unicode-range:u+1f921-1f930,u+1f932-1f935,...                            /* 負責哪些字 */
}
```

**裡面沒有任何字的形狀**，只說：「有個字型叫 Noto Sans TC，300 字重這一塊，檔案在這個網址，負責這些 Unicode 範圍。」

### 諷刺的結論

- 字形資料 4.3 MB → 獨立 woff2 檔，**不進 CSS、不阻塞繪製**，而且瀏覽器只抓用得到的那幾個
- 索引卡 421 張 → **全部塞進 CSS，397 KB，阻塞繪製**

**真正肥的字型檔反而不卡 FCP，是那疊「目錄」把 FCP 卡住了。**

所以砍字重 4 → 2，等於索引卡從 421 張減成 211 張，CSS 少 200 KB。**字型檔一個都不用動。**

驗證指令：

```bash
# 索引卡（CSS）多大
ls -l .next/static/css/<font-hash>.css

# 字形資料（woff2）多大、幾個檔
du -ch .next/static/media/*.woff2 | tail -1
ls .next/static/media/*.woff2 | wc -l

# 看一張索引卡長什麼樣
grep -o "@font-face{[^}]*}" .next/static/css/<font-hash>.css | head -1 | cut -c1-260
```

---

## 1-7. `'use client'` ≠ CSR（這個誤會最大）

你的疑問很合理：「`use client` 是我們在一般元件上面寫的，不是說 App Router 跟 Pages Router 都可以用 CSR 嗎？」

拆成兩件事回答：

**(A) 「能不能做 CSR」跟「`'use client'` 是什麼意思」是兩個問題。**

沒錯，App Router 和 Pages Router 都做得到 CSR。CSR 是一種**渲染策略**。

但 `'use client'` **不是**在宣告渲染策略。它宣告的是**打包邊界**：

> 從這個檔案開始（含它 `import` 的所有東西），把 JS **打包送到瀏覽器**，這樣才能用 `useState`、`useEffect`、`onClick`、`window`。

它**完全沒有說**「不要在 server 上渲染」。Next.js 預設還是會在 server 上把它渲染成 HTML。

**(B) 名字為什麼這麼容易誤會**

因為 `'use client'` 對比的是 Server Component，而 Server Component 的特性是「**只**在 server 跑，一行 JS 都不送」。

所以 `'use client'` 的反義其實是「**也**送到 client」，不是「**只**在 client」。

中文可以這樣記：
- Server Component = **純伺服器元件**（單棲）
- Client Component = **雙棲元件**（server 先渲染一次 → client 再接手 hydrate）

**(C) 所以有三種模式，不是兩種**

| | server 產生 HTML？ | 送 JS 到瀏覽器？ | 怎麼寫 |
|---|---|---|---|
| **Server Component**（RSC） | 是 | **否** | 預設，不寫 `'use client'` |
| **Client Component** | **是**（SSR + hydration） | 是 | `'use client'` |
| **真正的 CSR** | **否** | 是 | `dynamic(..., { ssr: false })`、或被 bailout |

一般人口中的「CSR」是第三種。`'use client'` 是第二種。

**(D) 本專案的實證（後面 Step 6 會看到完整證據）**

`components/footer.tsx` 和 `components/UnifiedNavbar.js` **第一行都是 `'use client'`**，但 build 產物裡：
- Footer → **有** HTML
- Navbar → **沒有** HTML

同樣是 `'use client'`，結果相反。差別不在 `'use client'`，在於一個在 `<Suspense>` 外、一個在裡面。

---

# 第二部分：診斷實錄（每個指令都解釋）

## Shell 指令速查（先建立基礎）

診斷過程會反覆用到這幾個。先一次講清楚，後面就不用再解釋。

### `wc` — word count（計數）

不是「change」。`wc` = **w**ord **c**ount，統計數量。

| 參數 | 全名 | 作用 |
|---|---|---|
| `-c` | `--bytes` | 算**位元組**數（char/byte） |
| `-l` | `--lines` | 算**行**數 |
| `-w` | `--words` | 算**單字**數 |

```bash
wc -c app/dashboard/page.js     # 43110  → 這個檔案 43 KB
wc -l app/dashboard/page.js     # 1245   → 1245 行
```

常見用法是接在管線後面數「有幾個」：

```bash
grep -o "@font-face" style.css | wc -l    # 數出現幾次
```

### `grep` — 搜尋文字

| 參數 | 全名 | 作用 |
|---|---|---|
| `-o` | `--only-matching` | **只印出符合的部分**，不印整行 |
| `-c` | `--count` | 只印出**符合的行數**（不印內容） |
| `-l` | `--files-with-matches` | 只印出**有符合的檔名** |
| `-n` | `--line-number` | 印出行號 |
| `-r` | `--recursive` | 遞迴搜尋子目錄 |
| `-E` | `--extended-regexp` | 用進階正則（可以寫 `a|b`） |

**`-o` 是計數的關鍵**。差別在這裡：

```bash
# 假設某一行是： @font-face{...}@font-face{...}@font-face{...}

grep -c "@font-face" f.css        # 1   ← 這「一行」有符合
grep -o "@font-face" f.css | wc -l # 3   ← 總共出現 3 次
```

要數「**總共出現幾次**」一定要用 `-o` + `wc -l`，用 `-c` 會嚴重低估。

### `sed` — stream editor（串流編輯器）

**stream** 指的是「資料流」——資料像水流一樣一行一行通過，`sed` 在中途對每一行做加工。它不是互動式編輯器（像 vim），是自動化的「流水線加工機」。

| 參數 | 全名 | 作用 |
|---|---|---|
| `-e` | `--expression` | 後面接一段**編輯指令** |
| `-n` | `--quiet` | 安靜模式，不自動印出（搭配 `p` 用） |
| `-i` | `--in-place` | 直接改檔案（危險，會覆蓋原檔） |

`-e` 的 e 就是 **e**xpression（表達式／編輯腳本）。

診斷時用的這條：

```bash
sed -e 's/<script[^>]*>.*<\/script>//g' dashboard.html
#       └─┬─┘└────────┬────────┘ └┬┘ └┬┘
#         │           │           │   └─ g = global，一行內全部取代
#         │           │           └───── 取代成「空字串」（刪掉）
#         │           └───────────────── 要找的：<script...>...</script>
#         └───────────────────────────── s = substitute（取代）
```

**用途**：`dashboard.html` 裡塞滿了巨大的 `<script>` 區塊（React 的 hydration 資料），人眼根本看不到真正的 HTML 內容。這條指令把所有 script 標籤連同內容一起刪掉，只留下**人看得懂的部分**。

另一個常用寫法是印出特定行數：

```bash
sed -n 100,150p app/dashboard/page.js   # 只印第 100~150 行
#   └┬┘ └──┬──┘└┬┘
#    │     │    └─ p = print
#    │     └────── 行號範圍
#    └──────────── -n 不自動印，只印我指定的
```

### `du` / `ls -lS`

```bash
du -sh public/fonts     # -s 只給總計, -h 人類易讀（52M 而非 54525952）
ls -lS .next/static/css # -l 詳細列表, -S 依檔案大小(Size)排序
```

---

## Step 0：先看設定檔，建立地圖

```bash
cat package.json
cat next.config.js
```

**為什麼先做這步**：不知道用什麼框架、什麼版本、開了什麼設定，後面的觀察都無法解讀。

**看到什麼**：Next.js 15.3.2、React 19、App Router。相依套件裡有 bootstrap、react-bootstrap、animate.css、bs-icon、firebase、sweetalert2、i18next……前端套件很多。

**推論**：CSS 來源可能很分散，先記著。

---

## Step 1：找到問題頁面的檔案

```bash
find app -maxdepth 3 -iname "*dashboard*"
```

| 參數 | 意思 |
|---|---|
| `-maxdepth 3` | 最多往下找 3 層（避免掃進 node_modules 之類的深淵） |
| `-iname` | 依檔名比對，**i** = ignore case（不分大小寫） |

**看到**：只有 `app/dashboard/page.js` 一個檔案。

```bash
wc -c app/dashboard/page.js    # 43110
```

**推論**：43 KB 的**單一元件**，非常肥。一個檔案塞了整個 dashboard。記著，但還不能下結論。

---

## Step 2：讀 root layout，找全域結構

```bash
cat app/layout.js
cat app/providers.js
```

**為什麼做這步**：FCP 是「第一次畫出東西」，跟**最外層**的結構關係最大。任何拖慢 root layout 的東西，全站都會受害。

**看到三件事**：

```js
'use client'                          // ① 第一行就是 client
import '@/styles/globals.scss'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bs-icon/icons.css'             // ② 四支 CSS 全部在 root layout
import 'animate.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'], // ③ 四個字重
  ...
})

<Suspense>                             // ④ 沒有 fallback
  <Providers>
    <UnifiedNavbar />
    <main>{children}</main>
  </Providers>
</Suspense>
<Footer />                             // ⑤ Footer 在 Suspense 外面
```

**推論**：
- ② → CSS 可能很大，等一下要量
- ③ → CJK 字型 × 4 個字重，`@font-face` 會爆量，等一下要量
- ④ → `<Suspense>` 沒有 `fallback`，等於 `fallback={null}`。**如果這個邊界被觸發，裡面什麼都不會顯示**
- ⑤ → Footer 在外面，之後會變成關鍵對照組

---

## Step 3：追 Provider，找 bailout 的觸發點

`providers.js` 裡的 `LoaderProvider` 來自 `hooks/use-loader/index.js`。

```bash
grep -rn "useSearchParams" --include=*.js app components hooks lib
```

| 參數 | 意思 |
|---|---|
| `-r` | 遞迴 |
| `-n` | 顯示行號 |
| `--include=*.js` | 只搜 `.js` 檔 |

**為什麼搜這個**：`useSearchParams()` 是 App Router 裡最惡名昭彰的 bailout 觸發器。既然看到 root layout 有個沒 fallback 的 Suspense，直覺要檢查裡面有沒有東西會觸發 bailout。

**看到**：

```
hooks/use-loader/index.js:47:  const searchParams = useSearchParams()
```

**在全域 Provider 裡。** 這是最糟的位置。

**推論**：假設成形 —— 整站可能都被 bailout 了。但這還只是假設，**下一步必須拿實證**。

---

## Step 4：跑 production build（取得實證）

```bash
npx next build
```

**為什麼一定要 build**：
- `npm run dev` 用的是開發模式，不做預渲染最佳化，看不到真相
- 所有證據都在 `.next/` 這個**建置產物**裡
- **這也是為什麼你在原始碼裡搜 `BAILOUT_TO_CLIENT_SIDE_RENDERING` 搜不到** —— 那個字串是 Next.js 在 build 時寫進產物 HTML 的標記，你的專案原始碼裡當然沒有

第一次跑失敗了：

```
./agent/agent.ts:1:29
Type error: Cannot find module 'eve' or its corresponding type declarations.
```

> **岔題但重要**：這是「import 了一個**從未寫進 `package.json`** 的套件」。
> 不是「package.json 有寫但沒下載」——那種情況 `npm i` 跑一次就解決了。
> 這裡是 TypeScript 的 **module resolver**（模組解析器）照著 `import "eve"` 去找，
> 在 `node_modules/` 找不到、在 `package.json` 的相依清單裡也沒有，所以整個 build 掛掉。
> 一個 4 行、97 bytes 的實驗檔，讓部署整個失敗。

繞過它之後拿到輸出：

```
Route (app)                              Size     First Load JS
├ ○ /dashboard                          16.7 kB         177 kB
+ First Load JS shared by all            103 kB
```

| 符號 | 意思 |
|---|---|
| `○ (Static)` | 建置期預渲染成靜態 HTML |
| `ƒ (Dynamic)` | 執行期才在 server 渲染 |

**推論（關鍵轉折）**：
- `/dashboard` 是 `○`，代表它**有**被預渲染。既然有預渲染，就該有 HTML 內容
- First Load JS **只有 177 kB**。這個數字很健康，**JS bundle 不是兇手**
- 既然 JS 沒問題，FCP 卻要 5.24 秒 → **問題一定在別的地方**

**這就是為什麼下一步要去看產物 HTML。** 我要確認「預渲染出來的 HTML 到底有沒有東西」。

---

## Step 5：build 產物裡有哪些檔案？

```bash
ls .next/server/app/dashboard*
```

看到三個你平常不會看到的檔案：

```
.next/server/app/dashboard.html    13569 bytes
.next/server/app/dashboard.meta      187 bytes
.next/server/app/dashboard.rsc      4972 bytes
```

**為什麼平常沒看過**：`.next/` 通常寫在 `.gitignore` 裡，而且是 build 才會產生的暫存產物。開發時它在背景被讀寫，沒人會去翻。

三個檔案各是什麼：

### `.html` — 預渲染好的 HTML

使用者**第一次**用網址直接打開這一頁時，伺服器就是把這個檔案原封不動吐出去。
**FCP 的命運由這個檔案決定。**

### `.meta` — 這份回應要附帶的 HTTP 標頭

```json
{
  "headers": {
    "x-nextjs-stale-time": "300",
    "x-nextjs-prerender": "1",
    "x-next-cache-tags": "_N_T_/layout,_N_T_/dashboard/layout,_N_T_/dashboard/page"
  }
}
```

- `x-nextjs-prerender: 1` → 明確標記「這是預渲染的」
- `x-next-cache-tags` → 快取標籤，之後呼叫 `revalidateTag()` 時靠這個找到要失效的頁面

### `.rsc` — React Server Component payload（也叫 Flight data）

```
1:"$Sreact.fragment"
2:I[17989,[],"ClientSegmentRoot"]
3:I[3055,["8320","static/chunks/41ade5dc-....js", ...
```

這是 React 自己的**序列化格式**，不是 HTML 也不是 JSON。

**什麼時候用到它**：使用者**在站內點連結**跳到這一頁時（client-side navigation），瀏覽器不會重新載入整份 HTML，而是去抓這個 `.rsc`，React 直接用它更新畫面。比重新解析 HTML 快很多。

> 對照記憶：
> `.html` = 第一次直接開網址用的（**冷啟動**）
> `.rsc` = 站內跳轉用的（**熱導航**）
> `.meta` = 回應的標頭設定

---

## Step 6：檢查 HTML 裡到底有沒有內容（決定性證據）

```bash
sed -e 's/<script[^>]*>.*<\/script>//g' .next/server/app/dashboard.html | grep -o '<body[^>]*>.*'
```

**這條指令在做什麼**（兩段管線）：

1. `sed -e 's/.../../g'` → 把所有 `<script>...</script>` 刪光。因為 React 會把大量 hydration 資料塞在 script 裡，不刪掉根本看不到真正的 HTML
2. `grep -o '<body[^>]*>.*'` → `-o` 只印出符合的部分。`<body[^>]*>` 比對 body 開標籤（含屬性），`.*` 是後面所有內容。等於「**只給我 `<body>` 開始的部分**」

**輸出**：

```html
<body class="__variable_799bbf __className_799bbf">
  <div hidden=""><!--$--><!--/$--></div>
  <!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->
  <footer class="footer_footer__YtHeK">...</footer>
</body>
```

**這就是根因。** 整個 `<body>` 只有：
- 一個 bailout 的墓碑
- 一個 Footer

**Navbar 不見了。`<main>` 不見了。Dashboard 的全部內容不見了。**

### 怎麼讀那串註解

React 用 HTML 註解標記 Suspense 邊界的狀態：

| 標記 | 意思 |
|---|---|
| `<!--$-->` | Suspense 邊界，**正常完成** |
| `<!--$?-->` | Suspense 邊界，**pending**（等 streaming 中） |
| `<!--$!-->` | Suspense 邊界，**errored**（出錯了） |
| `data-dgst` | digest，錯誤摘要（digest 的縮寫） |

這裡是 `<!--$!-->` + `BAILOUT_TO_CLIENT_SIDE_RENDERING`，意思是：
**「這個 Suspense 邊界在 server 渲染時被中斷了，原因是 bailout to CSR。」**

### 對照組：驗證 `'use client'` 不是兇手

```bash
head -1 components/footer.tsx          # 'use client'
head -1 components/UnifiedNavbar.js    # 'use client'

grep -o 'footer_signature__[A-Za-z0-9]*' .next/server/app/dashboard.html
# footer_signature__Mb0KV     ← Footer 有 HTML

grep -c "navbar" .next/server/app/dashboard.html
# 0                            ← Navbar 沒有
```

兩個元件**都是 `'use client'`**，結果相反。
差別是 Footer 在 `<Suspense>` **外面**，Navbar 在**裡面**。

**這證明了 1-7 講的：`'use client'` 照樣會 SSR，會消失是因為 bailout。**

### 擴大檢查範圍

```bash
grep -c "BAILOUT_TO_CLIENT_SIDE_RENDERING" .next/server/app/dashboard.html    # 1
grep -c "BAILOUT_TO_CLIENT_SIDE_RENDERING" .next/server/app/user/login.html   # 1
grep -c "BAILOUT_TO_CLIENT_SIDE_RENDERING" .next/server/app/index.html        # 1
```

**不只 dashboard，整站每一頁都中招。**

---

## Step 7：驗證 bailout 的原始碼機制

前面是「看到現象」，這一步是「看懂原理」。

### 先分清楚 `.d.ts` 和 `.js`

你在 `node_modules/next/dist/client/components/navigation.d.ts` 裡搜 `bailout` 搜不到，這是正常的：

| 副檔名 | 內容 | 有沒有實作邏輯 |
|---|---|---|
| `navigation.d.ts` | **只有型別宣告**（TypeScript declaration） | **沒有**。只說「這個函式叫什麼、收什麼參數、回傳什麼」 |
| `navigation.js` | **真正的實作** | 有。所有 if/else、throw 都在這裡 |

`.d.ts` 的存在是為了讓編輯器有自動補全和型別檢查。它是**給編譯器看的說明書**，不是程式本身。

而且，這確實是 **Next.js 自己寫的程式碼**（在 `node_modules/` 裡），不是你寫的。你看到的那些 JSDoc 註解和 docs 連結，是 Next.js 團隊寫給使用者看的文件。

**所以要查機制，要看 `.js` 不是 `.d.ts`：**

```bash
grep -rn "bailoutToClientRendering" node_modules/next/dist/client/components/*.js
```

### 機制第 1 步：`useSearchParams` 偵測自己在哪裡執行

`node_modules/next/dist/client/components/navigation.js:107`

```js
export function useSearchParams() {
  const searchParams = useContext(SearchParamsContext)
  const readonlySearchParams = useMemo(() => { ... }, [searchParams])

  if (typeof window === 'undefined') {          // ★ 這一行
    const { bailoutToClientRendering } = require('./bailout-to-client-rendering')
    bailoutToClientRendering('useSearchParams()')
  }

  return readonlySearchParams
}
```

**「為什麼它要偵測自己在 server 上？」**

因為**同一份程式碼會被執行兩次、在兩個不同環境**：

```
同一個 useSearchParams 函式
   ├─ 在 Node.js 裡執行（SSR / 預渲染時）  ← 沒有 window
   └─ 在瀏覽器裡執行（hydrate 之後）      ← 有 window
```

React 元件的程式碼是「同構」（isomorphic）的——一份程式碼兩邊跑。所以函式內部需要知道「我現在在哪」，才能決定行為。

`typeof window === 'undefined'` 就是那個判斷：**瀏覽器有 `window` 全域物件，Node.js 沒有。** 這是最經典的環境偵測寫法。

> 順帶：為什麼用 `require()` 而不是檔案頂端的 `import`？
> 因為 `bailout-to-client-rendering` 會用到 `AsyncLocalStorage`（Node.js 專用 API）。
> 用動態 `require()` 可以確保這段只在 server 執行，不會被打包進瀏覽器的 bundle。
> 原始碼註解寫得很清楚：`// AsyncLocalStorage should not be included in the client bundle.`

### 機制第 2 步：判斷渲染模式，是預渲染才 throw

`node_modules/next/dist/client/components/bailout-to-client-rendering.js:14`

```js
function bailoutToClientRendering(reason) {
  const workStore = workAsyncStorage.getStore()
  if (workStore?.forceStatic) return              // force-static 模式：直接無視

  const workUnitStore = workUnitAsyncStorage.getStore()
  if (workUnitStore) {
    switch (workUnitStore.type) {
      // ── 預渲染家族：丟錯 ──
      case 'prerender':
      case 'prerender-runtime':
      case 'prerender-client':
      case 'prerender-ppr':
      case 'prerender-legacy':
        throw new BailoutToCSRError(reason)       // ★ 直接 throw

      // ── 真實請求 / 快取：什麼都不做 ──
      case 'request':
      case 'cache':
      case 'private-cache':
      case 'unstable-cache':
        break
    }
  }
}
```

**這裡是用 `throw` 實作的**，不是回傳錯誤碼、不是設 flag。渲染到一半直接把例外丟出去——這正是 bail out（跳船）的字面意思。

### 機制第 3 步：throw 往上冒泡，被 Suspense 接住

React 在 render 階段被 throw 中斷，往上找最近的 Suspense 邊界。
Next.js 認得 `BailoutToCSRError` 這個**特定型別**，所以不當成當機，而是把該邊界標記成「server 放棄，交給 client」。

### 機制第 4 步：在產物 HTML 留下墓碑

就是 Step 6 看到的那一行。

### 三個可操作的推論

**推論 1：`usePathname` 為什麼安全**

同一支 `navigation.js`，第 115 行：

```js
function usePathname() {
  return useContext(PathnameContext)     // 純讀 Context，完全沒有 bailout 那一段
}
```

為什麼？回去看 1-1 那張表：
- **pathname 在建置期是已知的** —— build 時就知道要產生 `/dashboard` 這個檔案
- **query string 在建置期是未知的** —— `?foo=bar` 只存在於某一次實際請求

所以 pathname 可以安全地在 server 算，searchParams 不行。

**推論 2：只有預渲染會中招**

回看那個 switch，`case 'request'` 是 `break`，**不 throw**。

| build 標記 | 渲染時機 | `useSearchParams` 會 bailout？ |
|---|---|---|
| `○ (Static)` | 建置期預渲染 | **會** |
| `ƒ (Dynamic)` | 執行期每次請求 | **不會** |

所以多一條修法：把路由改成動態。

```js
// app/dashboard/page.js
export const dynamic = 'force-dynamic'
```

代價是放棄靜態快取。對 `/dashboard` 這種本來就因人而異的頁面算合理，對首頁就不划算。

**推論 3：傷害範圍 = 往上找到最近的 `<Suspense>`**

```
useSearchParams 放在哪                    →  被放棄的範圍
────────────────────────────────────────────────────────
小元件，外面包了自己的 Suspense            →  只有那個小元件
page.js，最近 Suspense 在 layout           →  整個頁面
全域 Provider，Suspense 在 root layout     →  整個網站  ★ 本專案
```

**回答你的疑問：「Navbar、main、children 全部消失，到底怎麼會這樣？」**

就是因為這條鏈：

```
app/layout.js
  └─ <Suspense>                       ← 最近的邊界，而且沒有 fallback
       └─ <Providers>
            └─ <LoaderProvider>       ← hooks/use-loader/index.js:47
                 └─ useSearchParams() ← throw BailoutToCSRError
                      ↑
            Navbar / main / children 全都在這條鏈的「裡面」
```

`throw` 從最深處往上冒，一路衝到 `<Suspense>` 才被接住。**被接住的那一整塊（Navbar + main + children）全部不渲染。**

而 `<Footer />` 寫在 `<Suspense>` 的**外面**，不在爆炸半徑內，所以毫髮無傷——這就是 Step 6 那個對照組的原理。

至於「為什麼什麼都沒顯示」而不是顯示個 loading：因為那個 `<Suspense>` **沒有給 `fallback`**，等於 `fallback={null}`。React 忠實地渲染了 `null`。

---

## Step 8：量測 render-blocking CSS

### 為什麼會跳到這一步？（你問的那個「從上一步怎麼跳過來」）

**因為 Step 4 的 build 輸出說 JS 只有 177 kB，很健康。**

推理鏈是這樣的：

```
FCP = 5.24 秒，但 JS bundle 只有 177 kB
        ↓
JS 不是瓶頸，那時間花在哪？
        ↓
回想 1-6：CSS 是 render-blocking，「CSSOM 建好之前一個像素都不畫」
        ↓
而 Step 2 看到 root layout 一口氣 import 了四支 CSS
        ↓
關鍵認知：next build 印的「First Load JS」完全不包含 CSS！
        ↓
所以 CSS 是目前唯一沒被量過、又確定會阻塞 FCP 的東西 → 去量它
```

**這一步的價值**：確認「兇手是 CSS 不是 JS」，也就是你說的——**問題不在 JavaScript 沒寫好，在 CSS 架構沒規劃好**。這個判斷完全正確。

### 指令

```bash
grep -o '<link rel="stylesheet" href="[^"]*"' .next/server/app/dashboard.html
```

`-o` 只印出符合的部分。`[^"]*` 是「不是雙引號的任意字元，重複任意次」，用來抓出 href 的值。

```bash
ls -lS .next/static/css/
```

`-S` 依檔案大小排序（Size），大的在前。

### 結果

| 檔案 | 大小 | 來源 |
|---|---|---|
| `a675dd4d9d26ec04.css` | **397 KB** | `next/font/google` 的 Noto Sans TC |
| `b804ca877387b40b.css` | **228 KB** | 完整版 `bootstrap.min.css` |
| `7b3929bae1a0676d.css` | 24 KB | `styles/globals.scss` |
| `152ba6122f74b25a.css` | 24 KB | `animate.css` + `bs-icon/icons.css` |
| `6d1fe8c133cb9616.css` | 7.5 KB | footer module |
| **合計** | **≈ 682 KB** | **是 JS bundle 的 4 倍** |

怎麼知道哪支是哪支？看開頭幾個字：

```bash
head -c 200 .next/static/css/b804ca877387b40b.css
# @charset "UTF-8";/*! Bootstrap v5.3.8 ... */    ← 一看就知道
```

`head -c 200` = 只印前 200 個位元組（`-c` 同樣是 bytes）。

---

# 第三部分：三個根因

## 根因 1：整站 CSR Bailout（Step 3、6、7）

已在上面完整說明。一句話：`useSearchParams()` 放在全域 Provider，最近的 `<Suspense>` 又沒給 `fallback`，導致整站 SSR HTML 是空的。

## 根因 2：682 KB render-blocking CSS

### 2-1. `@font-face` 的數量是重點嗎？是。

先回答你的符號問題：

**`@` 開頭的東西在 CSS 裡叫 at-rule（@規則）。** 不是「小老鼠符號」的特例，是 CSS 語法的一個類別：

| at-rule | 作用 |
|---|---|
| `@font-face` | **宣告一個字型**：告訴瀏覽器「有個字型叫 X，檔案在這裡」 |
| `@media` | 條件式套用樣式（螢幕寬度、列印等） |
| `@import` | 引入另一支 CSS |
| `@keyframes` | 定義動畫 |
| `@supports` | 功能偵測 |

所以 `@font-face` 跟 `@media` 是同一類語法，不是同一個東西。

一個 `@font-face` 長這樣：

```css
@font-face {
  font-family: 'Noto Sans TC';        /* 字型名字 */
  font-weight: 400;                    /* 這一份是哪個字重 */
  font-display: swap;
  src: url(/_next/static/media/xxx.woff2) format('woff2');   /* 檔案在哪 */
  unicode-range: U+4E00-4EFF, U+5000-50FF;   /* 這個檔案負責哪些字 */
}
```

### 2-2. 實測：421 個 `@font-face`

```bash
F=.next/static/css/a675dd4d9d26ec04.css

grep -o "@font-face" $F | wc -l          # 421
grep -o "unicode-range" $F | wc -l       # 420
grep -o "font-weight:[0-9]*" $F | sort | uniq -c
```

輸出：

```
    105 font-weight:300
    105 font-weight:400
    105 font-weight:500
    105 font-weight:700
```

**算式：105 × 4 = 420，再加 1 個沒有 unicode-range 的 fallback face = 421。**

```bash
ls .next/static/media/*.woff2 | wc -l    # 105
```

105 個實際的字型檔。

> `sort | uniq -c` 是數數量的標準組合：
> `uniq` 只能合併**相鄰**的重複行，所以一定要先 `sort` 排序讓相同的排在一起。
> `uniq -c` 的 `-c` = count，在每組前面加上出現次數。

### 2-3. 「105 個子集」是誰切的？線上的還是本機的？（你問的）

**是 Google Fonts 官方切好的，`next/font/google` 在 build 時下載下來，存成你本機 `.next/static/media/` 的 105 個 woff2 檔。**

流程：

```
build time：
  next/font/google 去打 Google Fonts CSS API
        ↓
  Google 回傳一份 CSS，裡面已經是 105 個 @font-face（每個帶 unicode-range）
        ↓
  next/font 把那 105 個 woff2 全部下載下來，放進 .next/static/media/
        ↓
  改寫 CSS 裡的 URL 指向你自己的網域（這叫 self-hosting，避免第三方請求）
        ↓
runtime：
  瀏覽器載入那份 CSS（397 KB，要全部解析完）
        ↓
  看頁面上實際出現哪些字 → 只下載對應的那幾個 woff2
```

**怎麼自己看**：

```bash
# 1. 本機有幾個字型檔
ls .next/static/media/*.woff2 | wc -l

# 2. 看第一個 unicode-range 長什麼樣
grep -o "unicode-range:[^;}]*" .next/static/css/a675dd4d9d26ec04.css | head -1

# 3. 直接去看 Google 回傳什麼（線上原始來源）
curl -s -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&display=swap" \
  | grep -c "@font-face"
```

第 3 條要帶 `-A "Mozilla/5.0"`（偽裝 User-Agent），因為 Google Fonts 會依瀏覽器回傳不同格式；不帶的話會拿到舊格式。

### 2-4. 「我有切 unicode-range 嗎？」有，而且是自動的

```bash
grep -o "unicode-range" .next/static/css/a675dd4d9d26ec04.css | wc -l   # 420
```

**420 個 unicode-range = 你確實有在切子集。**

這不只是概念，是你專案裡實際發生的事——只是 `next/font/google` 幫你做掉了，你沒感覺。

而且**這個做法是對的**。CJK 字型有上萬字，切成小塊、瀏覽器按需下載，是業界標準解法。

**所以問題不是「方法錯」，是「字重要太多」**：

```js
weight: ['300', '400', '500', '700']   // ← 105 × 4
```

砍成 2 個字重，CSS 直接從 397 KB → 約 200 KB。

> 補充一個坑：`subsets: ['latin']` 對 CJK 字型幾乎沒作用。
> 它只控制「要不要產生 `<link rel=preload>`」，**不會**減少 CSS 裡的 `@font-face` 數量。

### 2-5. `bs-icon` 藏了一個往 CDN 的 `@import`

```bash
head -1 node_modules/bs-icon/icons.css
```

```css
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.min.css");
```

**CSS 裡的外部 `@import` 是效能最糟的模式**，因為完全串行：

```
下載 icons.css → 解析 → 才發現有 @import → DNS 查詢 jsdelivr
  → TLS 握手 → 下載第三方 CSS → 解析 → 再下載 icon 字型
```

**關鍵**：瀏覽器有個叫 **preload scanner**（預掃描器）的機制，會在主解析器還在忙時先掃過 HTML，把 `<link>`、`<script>`、`<img>` 的網址提前抓出來平行下載。

但它**只掃 HTML，不會去解析 CSS 檔案的內容**。所以 `@import` 進來的資源只能等 CSS 被真正解析時才被發現，完全無法提前。

**規則：永遠不要用 `@import` 載入外部網址。** 改用 `<link>`（在 HTML 裡，preload scanner 看得到）或本機 bundle。

檢查全站有沒有這種地雷：

```bash
grep -o '@import url([^)]*)' .next/static/css/*.css
```

### 2-6. Bootstrap 完整版 228 KB

root layout 載入整包，但專案同時有 `react-bootstrap` + 自己的 `globals.scss`（30 KB）+ CSS Modules。改成按需 `@use` 可以省下大部分。

## 根因 3：Dashboard `return null` + 三段串行 API 瀑布

```bash
grep -n "return null\|setIsLoading\|useState(true)" app/dashboard/page.js
```

`app/dashboard/page.js:1108`：

```js
if (!auth.hasChecked || isLoading) {
  return null                    // ← 什麼都不畫
}
if (!isAuth) {
  return null                    // ← 也什麼都不畫
}
```

`isLoading` 初始值 `true`（`page.js:47`），要等 `fetchTimeLogs()` 跑完才變 `false`。
而 `fetchTimeLogs` 裡面又 **`await` 了另一個請求**（`page.js:857`）：

```js
if (isAuth && user?.user_id) {
  await fetchSharedLogIds()      // ← 串行的第三個 RTT
}
// ...
finally {
  setIsLoading(false)            // ← 兩個請求都回來才解鎖
}
```

### 完整瀑布

```
① HTML 到達（body 只有 footer，App 內容全空）
        ↓
② 682 KB CSS 下載完（含 jsdelivr 的串行 @import）    ← 阻塞繪製
        ↓
③ 177 kB JS 下載 + parse + hydrate
        ↓
④ AuthProvider useEffect → GET /auth/verify            ← RTT #1
        ↓
⑤ setAuth → Dashboard useEffect → GET /api/timelogs    ← RTT #2
        ↓
⑥ await fetchSharedLogIds() → GET /api/featured-shares ← RTT #3
        ↓
⑦ setIsLoading(false) → 終於第一次畫出內容
```

**七個階段全部串行 = 5.24 秒**

> RTT = Round-Trip Time，一來一回的網路往返時間。

### 額外：全域 Loader 的 2 秒

`app/providers.js:29` 的 `<LoaderProvider close={2}>` 讓 loader 顯示後固定 2 秒才關。不影響 FCP（loader 本身也要等 hydrate 才畫得出來），但會拖慢 LCP 和體感。

---

# 第四部分：修復計畫

| 優先 | 動作 | 檔案 | 預估效果 |
|---|---|---|---|
| **P0** | 拿掉 `LoaderProvider` 的 `useSearchParams`，改用 `usePathname` | `hooks/use-loader/index.js:47` | 解除整站 bailout，SSR 恢復 |
| **P0** | `<Suspense>` 補上 `fallback` | `app/layout.js:34` | 就算再 bailout 也有骨架可畫 |
| **P0** | `return null` 改成 skeleton 骨架屏 | `app/dashboard/page.js:1108` | 不再等 3 個 RTT 才畫東西 |
| **P1** | 字重 `['300','400','500','700']` → `['400','700']` | `app/layout.js:14` | CSS −200 KB |
| **P1** | 移除 `bs-icon`，改本機 `bootstrap-icons` 或 `react-icons` | `app/layout.js:9` | 砍掉 2～3 個第三方 RTT |
| **P2** | Bootstrap 改按需 `@use` | `app/layout.js:8` | CSS −150 KB |
| **P2** | `fetchSharedLogIds` 平行化（拿掉 `await`） | `app/dashboard/page.js:857` | 砍 1 個 RTT |
| **P3** | `close={2}` 調小或移除 | `app/providers.js:29` | LCP −2 秒 |

## 更根本的方向：把 client 邊界往下推

### 先把數字量準（順便解釋指令）

```bash
grep -rl "^'use client'" --include=*.js --include=*.tsx app | wc -l
```

| 片段 | 中文 |
|---|---|
| `grep` | 搜尋文字 |
| `-r` | recursive，**連子資料夾一起找** |
| `-l` | list，**只印出「有找到的檔案名稱」**，不印內容 |
| `"^'use client'"` | 要找的東西。`^` 是正則的「**行首**」→「某一行的開頭就是 `'use client'`」 |
| `--include=*.js --include=*.tsx` | 只搜這兩種副檔名 |
| `app` | 在 `app` 資料夾裡找 |
| `\| wc -l` | 把結果（一行一個檔名）丟給 `wc`，`-l` 數**行數** |

白話：**「app 裡有幾個 .js/.tsx 檔，某一行以 `'use client'` 開頭？」**

```bash
find app -name "page.js" -o -name "layout.js" | wc -l
```

| 片段 | 中文 |
|---|---|
| `find app` | 在 `app` 資料夾裡找檔案 |
| `-name "page.js"` | 檔名叫 `page.js` |
| `-o` | **or**，「或者」 |
| `\| wc -l` | 數有幾個 |

白話：**「app 裡有幾個 `page.js` 或 `layout.js`？」**

### 陷阱：這兩個數字不能直接比

第一條得到 51、第二條得到 49，看起來像「幾乎全部」。**但分母根本不一樣**——51 是「所有檔案」，49 只是「page + layout」。`app/` 裡還有一堆元件、hooks、樣式檔。拿這兩個對比是誤導。

精確的統計要這樣寫：

```bash
echo "app/ 裡 .js/.tsx 總數: $(find app \( -name '*.js' -o -name '*.tsx' \) | wc -l)"
echo "其中有 use client:   $(grep -rl "^'use client'" --include=*.js --include=*.tsx app | wc -l)"
echo "page.js 總數:        $(find app -name 'page.js' | wc -l)"
echo "其中是 client:       $(for f in $(find app -name 'page.js'); do head -1 "$f" | grep -q 'use client' && echo x; done | wc -l)"
```

本專案實測：

```
app/ 裡的 .js/.tsx 總數：107 個
  其中有 'use client'：   51 個   （48%）

page.js 總數：           47 個
  其中是 client：        44 個   （94%）  ← 這才是「幾乎全 client 化」的證據
layout.js 總數：          2 個
```

**教訓：算比例時務必確認分子分母是同一個集合。**

代價是**不能在元件裡直接查資料庫**，只能繞一圈打自己的 API——根因 3 的瀑布就是這樣來的。

正解不是二選一，而是讓靜態外殼留在 server，只有互動的葉子節點是 client：

```jsx
// app/dashboard/page.js — Server Component（不寫 'use client'）
import { getTimeLogs } from '@/lib/db'
import TimeLogTabs from './TimeLogTabs'      // 只有這個是 'use client'

export default async function Dashboard() {
  const logs = await getTimeLogs()           // 直接查 DB，零 API 往返
  return (
    <div>
      <h1>Dashboard</h1>                     {/* 靜態部分：零 JS */}
      <TimeLogTabs logs={logs} />            {/* 互動部分：送 JS */}
    </div>
  )
}
```

> **一個容易搞混的細節**：`app/layout.js` 第 1 行是 `'use client'`，但這**不會**讓 `children` 也變成 client。
> `children` 是當作 prop 從 server 傳進來的，React 先在 server 渲染完再塞進去。
> 驗證：
> ```bash
> for f in $(find app -name "page.js"); do
>   head -1 "$f" | grep -q "use client" || echo "$f"
> done
> # app/page.js
> # app/lap-timer/page.js
> # app/line-pay/cancel/page.js
> ```
> 這三個仍然是真正的 Server Component。
>
> **規則**：被 client 檔案 `import` 的 → 傳染成 client；當 `children`/prop 傳入的 → 不傳染。

---

# 第五部分：字型子集化的規劃

## 現況與「有沒有污染 git 歷史」

`public/fonts/03_NotoSerifCJK-TTF-VF/` 共 **52 MB**：

| 檔案 | 大小 | 語言 |
|---|---|---|
| NotoSerifTC-VF.ttf | 17 MB | 繁中 |
| NotoSerifJP-VF.ttf | 13 MB | 日文 |
| NotoSerifKR-VF.ttf | 23 MB | 韓文 |

**有沒有污染 git 歷史？目前沒有。** 它們還是 untracked（`git status` 顯示 `??`），從來沒被 `git add` 過。

**但一旦 commit 就幾乎清不掉**——git 的設計是保留所有歷史版本，就算之後 `git rm`，那 52 MB 仍留在 `.git/` 裡，每個 clone 的人都要下載。要真的移除必須 rewrite history（`git filter-repo` 或 BFG），會改變所有 commit hash，協作者全部要重新 clone。

**結論：子集化完成前，先寫進 `.gitignore`。只把最後產出的小檔案（1～2 MB 的 woff2）進版控。**

## 名詞

### VF = Variable Font（可變字型）

傳統字型：一個字重一個檔案。
```
NotoSerifTC-Light.ttf
NotoSerifTC-Regular.ttf
NotoSerifTC-Bold.ttf     ← 三個獨立檔案
```

可變字型：**一個檔案內含一條連續的變化軸**。
```
NotoSerifTC-VF.ttf   →  wght 軸 200 ~ 900，中間任何值都能取
```

所以 `font-weight: 437` 這種非標準值也做得出來。

驗證方式（讀 TTF 的 `fvar` 表，fvar = font variations）：

```bash
python -c "
import struct
d=open('NotoSerifTC-VF.ttf','rb').read()
n=struct.unpack('>H',d[4:6])[0]
for i in range(n):
    off=12+i*16
    if d[off:off+4]==b'fvar':
        o=struct.unpack('>I',d[off+8:off+12])[0]
        cnt=struct.unpack('>H',d[o+12:o+14])[0]
        sz=struct.unpack('>H',d[o+10:o+12])[0]
        ao=o+struct.unpack('>H',d[o+4:o+6])[0]
        for j in range(cnt):
            a=ao+j*sz
            tag=d[a:a+4].decode('latin1')
            mn,df,mx=struct.unpack('>iii',d[a+4:a+16])
            print('axis %s: %g..%g default %g'%(tag,mn/65536,mx/65536,df/65536))
"
# axis wght: 200..900 default 200
```

### `.ttf` 和 VF 的關係（你問的）

**VF 不是一種副檔名，是一種「字型內部結構」。**

```
容器格式（副檔名）：  .ttf / .otf / .woff / .woff2
內部是否可變：        靜態字型 / 可變字型(VF)
```

所以 `.ttf` 可以是靜態的也可以是 VF；`.woff2` 也是。
`NotoSerifTC-VF.ttf` = 「一個 TTF 容器，裡面裝的是可變字型」。

### 為什麼 VF 只產生 1 個 `@font-face`

因為 VF 用 `font-weight` 的**範圍語法**，一條規則涵蓋整個區間：

```css
/* 可變字型：1 個 @font-face 搞定 200~900 */
@font-face {
  font-family: 'NotoSerifTC';
  src: url('/fonts/NotoSerifTC.woff2') format('woff2-variations');
  font-weight: 200 900;      /* ← 範圍，不是單一值 */
}
```

對照現在 Google Fonts 的做法：**每個字重 × 每個 unicode 子集 = 一個 `@font-face`**，所以 4 × 105 = 420 個。

### `next/font/local` 會做什麼

```js
import localFont from 'next/font/local'

const notoSerif = localFont({
  src: './fonts/NotoSerifTC-subset.woff2',
  weight: '200 900',
  display: 'swap',
  variable: '--font-noto-serif',
})
```

它**不會**自動掃 `public/fonts/` —— 要明確指定 `src` 路徑。
它會：把檔案複製進 `.next/static/media/`、產生一個 `@font-face`、給你 CSS class 和 CSS 變數。

**注意**：`next/font/local` 不做子集化，你給它多大它就送多大。所以 17 MB 直接丟進去，使用者就要下載 17 MB。

## 為什麼不能直接用（划不划算的比較）

| | CSS 大小 | 字型實際下載量 |
|---|---|---|
| **現在**（Google Fonts，105 子集） | 397 KB | 只抓用到的 2～5 個子集，約 100–300 KB |
| **直接用本機 VF** | ~0.2 KB | **整包 17 MB**（轉 woff2 後約 6–8 MB） |
| **子集化後的本機 VF** | ~0.2 KB | 1–2 MB（一次下載，之後快取） |

所以**必須先子集化**才有討論空間。

## `pyftsubset` 是什麼

`pyftsubset` = **Py**thon **f**ont**T**ools **subset**（子集化工具）

它是 `fonttools` 這個 Python 套件的命令列工具。作用是：**從一個大字型檔裡，只挑出你指定的那些字，產生一個小檔案。**

原理：字型檔內部是一堆表格（`glyf` 字形輪廓、`cmap` 字元對應、`GSUB` 字形替換……）。子集化就是砍掉用不到的字形資料，重建索引。

## 子集化工作規劃

### 前置

```bash
pip install fonttools brotli
# brotli 是 woff2 壓縮用的編碼器，沒有它無法輸出 woff2
```

### 步驟 1：決定要保留哪些字

三種策略：

| 策略 | 字數 | 預估大小 | 適用 |
|---|---|---|---|
| 常用字表（教育部標準字 + 標點 + 拉丁 + 數字） | ~5,400 | 1–2 MB | **建議**，涵蓋 99% 日常內容 |
| 掃描專案實際用到的字 | ~800 | 200–400 KB | 最小，但使用者輸入的內容會缺字 |
| 全字集 | ~20,000 | 6–8 MB | 不建議 |

**重要提醒**：Dashboard 會顯示**使用者自己輸入**的活動名稱。如果只掃專案靜態文字，使用者打了冷僻字就會 fallback 成系統字型，畫面不一致。所以選常用字表比較安全。

### 步驟 2：產生字表

```bash
# 從專案裡撈出所有中文字（作為補充）
grep -rhoP '[\x{4e00}-\x{9fff}]' --include=*.js --include=*.tsx --include=*.json \
  app components locales | sort -u | tr -d '\n' > /tmp/project-chars.txt
```

| 參數 | 意思 |
|---|---|
| `-h` | 不印檔名（**h**ide filename） |
| `-o` | 只印符合的部分 |
| `-P` | 用 Perl 正則（才支援 `\x{...}` unicode 範圍） |
| `sort -u` | 排序並去重（**u**nique） |
| `tr -d '\n'` | 刪掉換行，串成一整串 |

### 步驟 3：執行子集化

```bash
pyftsubset public/fonts/03_NotoSerifCJK-TTF-VF/Variable/TTF/Subset/NotoSerifTC-VF.ttf \
  --text-file=/tmp/charset.txt \
  --output-file=public/fonts/NotoSerifTC-subset.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --no-hinting \
  --desubroutinize
```

| 參數 | 作用 |
|---|---|
| `--text-file` | 指定要保留哪些字（一個檔案，內容就是那些字） |
| `--flavor=woff2` | 輸出格式選 woff2（比 ttf 小 30–50%） |
| `--layout-features='*'` | 保留所有排版特性（標點壓縮、字距調整等），CJK 需要 |
| `--no-hinting` | 移除 hinting（點陣微調）資料，現代螢幕用不到，可省不少空間 |
| `--desubroutinize` | 展開子程式，配合 woff2 壓縮效果更好 |

> **保留可變軸**：`pyftsubset` 預設會保留 `fvar` 軸。若只想要固定字重，加 `--instancer` 或 `--variations` 相關參數把它「定格」。

### 步驟 4：驗收

```bash
ls -lh public/fonts/NotoSerifTC-subset.woff2     # 目標 < 2 MB

# 確認可變軸還在
python -c "from fontTools.ttLib import TTFont; f=TTFont('public/fonts/NotoSerifTC-subset.woff2'); print([a.axisTag for a in f['fvar'].axes])"

# 確認字數
python -c "from fontTools.ttLib import TTFont; f=TTFont('public/fonts/NotoSerifTC-subset.woff2'); print(len(f.getBestCmap()), '個字')"
```

### 步驟 5：接進 Next.js

```js
// app/layout.js
import localFont from 'next/font/local'

const notoSerifTC = localFont({
  src: '../public/fonts/NotoSerifTC-subset.woff2',
  weight: '200 900',
  display: 'swap',
  variable: '--font-noto-serif-tc',
})
```

### 步驟 6：git 處理

```bash
# 原始 52MB 永遠不進版控
echo "public/fonts/03_NotoSerifCJK-TTF-VF/" >> .gitignore

# 子集化後的成品才進
git add public/fonts/NotoSerifTC-subset.woff2
```

### 驗收標準

- [ ] woff2 < 2 MB
- [ ] 可變軸 `wght` 保留
- [ ] 常用字不缺字（拿 dashboard 真實資料測）
- [ ] build 後 CSS 從 397 KB 降到 < 5 KB
- [ ] 原始 52 MB 在 `.gitignore` 裡，`git status` 看不到

---

# 第六部分：指令速查表

## 診斷任何 Next.js FCP 問題的標準流程

```bash
# ── 1. 一定要跑 production build，dev 模式看不到真相 ──
npx next build

# ── 2. 有沒有 CSR bailout？（最容易被忽略、影響最大）──
grep -rc "BAILOUT_TO_CLIENT_SIDE_RENDERING" .next/server/app/*.html

# ── 3. SSR 到底吐了什麼 HTML？（把 script 濾掉才看得懂）──
sed -e 's/<script[^>]*>.*<\/script>//g' .next/server/app/dashboard.html \
  | grep -o '<body[^>]*>.*'

# ── 4. render-blocking CSS 有多大？（build 輸出的 First Load JS 不含 CSS！）──
grep -o '<link rel="stylesheet" href="[^"]*"' .next/server/app/dashboard.html
ls -lS .next/static/css/

# ── 5. 哪支 CSS 是哪個套件？──
head -c 200 .next/static/css/<hash>.css

# ── 6. CSS 裡有沒有藏外部 @import？（串行地雷）──
grep -o '@import url([^)]*)' .next/static/css/*.css

# ── 7. 字型產生了幾個 @font-face？各字重幾個？──
grep -o "@font-face" .next/static/css/<hash>.css | wc -l
grep -o "font-weight:[0-9]*" .next/static/css/<hash>.css | sort | uniq -c
ls .next/static/media/*.woff2 | wc -l

# ── 8. 誰在用 useSearchParams？（越上層越嚴重）──
grep -rn "useSearchParams" --include=*.js app components hooks lib

# ── 9. 有幾個檔案標了 use client？哪些 page 還是 Server Component？──
grep -rl "^'use client'" --include=*.js --include=*.tsx app | wc -l
for f in $(find app -name "page.js"); do
  head -1 "$f" | grep -q "use client" || echo "$f"
done

# ── 10. 頁面有沒有「資料沒到就 return null」？──
grep -n "return null" app/dashboard/page.js
```

## 三個最容易踩的觀念

1. **`next build` 印的 First Load JS 不包含 CSS。**
   本專案 JS 177 kB 看起來很健康，CSS 卻有 682 KB 在阻塞繪製。只看 build 輸出會完全誤判。

2. **`useSearchParams()` 會傳染。**
   放在越上層的 Provider，被 bailout 的範圍越大。放在全域 Provider = 整站變 CSR。

3. **CSS 的外部 `@import` 是串行的，preload scanner 看不到。**
   永遠改成 `<link>` 或本機 bundle。

## 為什麼原始碼裡搜不到 `BAILOUT_TO_CLIENT_SIDE_RENDERING`

因為它**不在你的原始碼裡**，只在三個地方出現：

| 位置 | 是什麼 |
|---|---|
| `node_modules/next/dist/**/*.js` | Next.js 自己的實作（`BailoutToCSRError`、`bailoutToClientRendering`） |
| `.next/server/app/*.html` | **build 產生的 HTML 產物**裡的 `data-dgst` 標記 |
| 瀏覽器 DevTools 的 Elements 面板 | 同上，是 runtime 看到的結果 |

你的專案原始碼裡一個字都不會有。這是**建置產物的診斷標記**，不是你要寫的東西。

**這也是為什麼診斷效能問題一定要先 `npx next build`** —— 證據全部在產物裡，不在原始碼裡。
