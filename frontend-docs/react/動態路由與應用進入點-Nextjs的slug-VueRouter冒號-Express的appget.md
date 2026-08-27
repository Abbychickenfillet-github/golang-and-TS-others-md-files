---
title: 動態路由與應用進入點｜Next.js 的 [slug] vs Vue Router 的冒號 vs Express 的 app.get
type: topic-note
source: Gemini
tags: [gemini, react, nextjs, vue, vue-router, express, 路由, 進入點, main-tsx]
sources:
  - https://gemini.google.com/app/887f1aa2f9661bc7
updated: 2026-08-25
---

# 動態路由與應用進入點｜Next.js 的 [slug] vs Vue Router 的冒號 vs Express 的 app.get

> [!info] 本篇重點 a–m，共 13 個
> 這是一場語音問答，題目從「左邊那段 slug 範例在教什麼」一路岔到「Node.js 的 `app.get` 跟 React 的 App Router 是同一個 app 嗎」，再岔到「Next.js 為什麼看不到 `main.tsx`」，最後收在 Vue Router。四個看似無關的問題其實同一條主軸：<mark style="background: #FFF3A3A6;">誰負責把「網址」變成「畫面或回應」，以及那段邏輯被放在哪個檔案。</mark>
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[react-server-component-slug-動態路由參數]]</mark> 講 RSC 情境下 `params` 的取得方式，這篇補上「跨框架橫向對照」那一層；<mark style="background: #ADCCFFA6;">[[main-tsx進入點-與globals-css的關係]]</mark> 講 `main.tsx` 裡還會塞什麼，這篇補上「為什麼 Next.js 沒有這個檔案」。

---

## 重點整理

### 一. Next.js 的 `[slug]`：檔名決定規則，`params` 決定取值

(a) <mark style="background: #ADCCFFA6;">slug 是「對人類閱讀友善的網址關鍵字」</mark>，例如 `/posts/react-guide` 裡的 `react-guide`。它不是 Next.js 專有名詞，是網頁界的通用術語。

(b) <mark style="background: #FFF3A3A6;">關鍵觀念：`[slug]` 與 `({ params })` 不是二選一，是一組搭配。</mark>

- `[slug]` 是<mark style="background: #ADCCFFA6;">檔案系統層</mark>的宣告。資料夾或檔名寫成中括號，就是在告訴 Next.js：「這一段網址是變數，不是固定字串。」
- `({ params })` 是<mark style="background: #ADCCFFA6;">程式碼層</mark>的接收。Next.js 把網址上的實際字串打包成物件，透過 props 傳給組件。

(c) 對照範例：

| 層級 | 寫法 |
| --- | --- |
| Pages Router 檔案 | `pages/posts/[slug].js` |
| App Router 檔案 | `app/posts/[slug]/page.js` |
| 使用者造訪 | `/posts/react-guide` |
| 組件內取值 | `params.slug === "react-guide"` |

```js
export default function Post({ params }) {
  // 此時 params.slug 的值就是 "react-guide"
  return <h1>目前文章 slug 是：{params.slug}</h1>;
}
```

(d) 逐段拆解這一行：`export default` 讓 Next.js 知道這是這個路由要渲染的組件；`function Post({ params })` 用<mark style="background: #ADCCFFA6;">解構賦值（destructuring）</mark>直接從 props 物件裡把 `params` 挖出來，等同於寫 `function Post(props) { const params = props.params; ... }`；`{params.slug}` 是 JSX 的<mark style="background: #ADCCFFA6;">插值表達式</mark>，大括號裡放的是 JavaScript 運算式，結果會被轉成文字節點。

(e) <mark style="background: #FF5582A6;">版本陷阱：Next.js 15 之後 App Router 的 `params` 變成 Promise，必須 await。</mark>上面那段是 Next.js 14 以前的舊寫法。Gemini 沒有提到這件事，寫的時候務必對照你專案的 Next.js 版本。

```tsx
// Next.js 15 以後的正確寫法
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <h1>slug 是：{slug}</h1>;
}
```

<mark style="background: #D2B3FFA6;">改成 Promise 的理由是效能：Next.js 可以先把頁面能靜態渲染的部分渲染完，再去解析動態值，不必為了等一個 slug 卡住整頁。</mark>沒 await 時的典型錯誤訊息是 `Route "/blog/[slug]" used params.slug. params should be awaited before using its properties.` 或 TypeScript 的 `Type '{ params: { slug: string; }; }' does not satisfy the constraint 'PageProps'`。

### 二. Vue Router 的冒號寫法

(f) Vue 不用檔案系統宣告，而是在路由表裡用<mark style="background: #FFF3A3A6;">冒號</mark>標記動態參數：`/user/:id`。

(g) 組件內用 `$route.params.id`（Options API）或 `useRoute().params.id`（Composition API）取值。

(h) Vue Router 還支援<mark style="background: #BBFABBA6;">執行期動態加入路由</mark>（`router.addRoute()`），所以可以依照使用者權限動態生成導覽清單，這是權限型後台常見做法。

### 三. Express 的 `app.get`：名字裡也有 app，但是完全不同層

(i) <mark style="background: #FF5582A6;">最容易搞混的地方：Node/Express 的 `app.get` 跟 Next.js 的 App Router，兩個名字裡都有 app，但根本不是同一件事。</mark>

| | Express 的 `app` | Next.js 的 App Router |
| --- | --- | --- |
| 所在層 | 後端伺服器 | 前端 / 全端框架 |
| 負責 | 接收 HTTP 請求，回傳資料（JSON 等） | 決定畫面上顯示哪個組件 |
| 寫法 | `app.get('/users/:id', handler)` | 資料夾 `app/users/[id]/page.tsx` |
| 動態參數 | `req.params.id` | `params.id` |

(j) 最底層的 Node `http` 模組其實沒有路由這回事，你得自己判斷 `req.url` 與 `req.method`。<mark style="background: #D2B3FFA6;">Express 的價值就是把那一堆 if-else 包成 `app.get` / `app.post` 這種語意化 API。</mark>

(k) <mark style="background: #FFB8EBA6;">記憶點：Express 用冒號 `:id`，跟 Vue Router 一樣；Next.js 用中括號 `[id]`，因為它靠的是檔案系統，而冒號在多數作業系統的檔名裡是非法字元。</mark>這不是巧合，是被檔名規則逼出來的設計。

### 四. `main.tsx` 進入點：Vite/CRA 有，Next.js 沒有

(l) 傳統 React 專案（Vite、CRA）的 `main.tsx` 做三件事：

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
```

- `createRoot(...)` 指定<mark style="background: #ADCCFFA6;">掛載點（mount point）</mark>，通常是 `index.html` 裡那個 `<div id="root">`。
- `<App />` 是最外層組件。
- 如果用 React Router，`<BrowserRouter>` 這類 Provider 也會包在這一層。

(m) <mark style="background: #BBFABBA6;">Next.js 裡看不到這段是正常的，你沒記錯。</mark>Next.js 採用<mark style="background: #FFF3A3A6;">基於檔案系統的路由</mark>，初始化與掛載由框架自動完成，開發者只寫 `layout.tsx` 與 `page.tsx`。要塞 Provider 的話就寫在 `app/layout.tsx` 裡。

---

## 程式碼範例

同層的 `routing-three-frameworks.js` 把三種寫法並排放在一個檔案裡對照。

---

## 練習題

路由本身不是演算法題，LeetCode 沒有直接對應。若要練「把字串路徑解析成參數」這個底層動作，可以看：

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 71 | [Simplify Path](https://leetcode.com/problems/simplify-path/) | 手動切 `/` 分段、處理 `.` 與 `..`，就是路由解析的雛形 |
| 208 | [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/) | 真實框架的路由表多半用 Trie 做前綴比對，Express 的 router 底層就是這類結構 |

---

## 各對話來源（原文）

### 單向與雙向資料綁定解析（2026-08）— https://gemini.google.com/app/887f1aa2f9661bc7

**使用者：** 左邊這段範例程式碼是想教我什麼？就 slug？

**Gemini：** 左邊的範例主要是在介紹 Next.js 的動態路由（Dynamic Routes）機制，特別是 slug 參數（Route Parameters）的用法。抓取 URL 中的動態變數：在 Next.js（App Router）中，如果你把資料夾命名為 `[slug]`，網址上對應位置的字串就會被當作變數抓進來。處理傳入的 params：組件可以透過 `props.params` 取得這個動態值。實作動態頁面：當使用者存取 `/posts/hello-world`，`params.slug` 就會是 `"hello-world"`。

**使用者：** 所以是依照 `({slug})` 取網址名稱還是 `[slug].js`？

**Gemini：** 答案是兩者配合：`[slug]` 是檔案／資料夾名稱，`({ params })` 是程式碼內部拿取該名稱的方式。檔案系統命名用中括號宣告動態路由；程式碼元件用 `({ params })` 從 props 中把變數取出來使用。

**使用者：** 那個 Node.js 的路由會怎麼規劃？我記得 Node.js 好像也可以規劃路由。

**Gemini：** 如果使用最基本的 `http` 模組，你需要手動檢查 `req.url` 和 `req.method`。不過通常我們會使用像 Express.js 這類的框架，它提供了更直覺的方法，像是 `app.get` 或 `app.post`。

**使用者：** app 點什麼？它就是跟 app router，前端 react 的這個鼎鼎有名的 app router，它這個字是一樣的嘛？

**Gemini：** 雖然它們的名字裡都有「app」，但它們在架構上的角色可是大不相同。Node.js 裡的 `app.get` 或 `app.post` 是用來處理後端伺服器的路由，負責接收特定的 HTTP 請求然後送回資料。而 React 這裡的 App Router 則是前端或全端框架 Next.js 用來管理頁面和組件導航的機制。簡而言之，一個是處理後端 API，另一個是決定畫面上要顯示什麼內容。

**使用者：** 前端的 main.tsx 好像都會放一些什麼樣的東西？

**Gemini：** 在前端的 React 應用中，像 `main.tsx` 這樣的主要進入點，主要負責把整個 React 應用渲染到實際的網頁 DOM 裡面。在這個檔案中，通常會透過 `createRoot` 來指定應用的掛載點，像是 `document.getElementById('root')`。接著你會導入最外層的組件，通常是 `<App />`。如果你的應用使用了路由系統，比如 React Router，相關的設定也會在這個階段被引入並包裝在組件的最外層。

**使用者：** 可是我記得我用 next 的時候，好像沒有看過這個寫法。還是我記錯了？

**Gemini：** 你並沒有記錯。在 Next.js 裡面，你確實不會手動去寫 `main.tsx` 和 `createRoot` 這一類的程式碼。在 Next.js 的架構下，它採用基於檔案系統的路由機制，會自動幫你處理應用的初始化與掛載。

**使用者：** vue 是怎麼做動態路由的？

**Gemini：** 在 Vue 裡面，動態路由是透過 Vue Router 實現的。核心做法是在定義路由規則時，使用冒號來標記動態參數。例如設定一個路徑為 `/user/:id`，這樣當使用者造訪不同的 ID 時，同一個組件就能夠動態載入。在組件內部，你可以透過 `$route.params.id` 來取得網址上的實際數值。Vue Router 還支援在執行期間動態添加路由。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話原文 | https://gemini.google.com/app/887f1aa2f9661bc7 | 2026-08，本次歸檔 2026-08-25 |
| Next.js 官方文件：Dynamic Routes | https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes | 查證 2026-08-25 |
| Next.js 15 的 params 改為 Promise（破壞性變更說明與型別寫法） | https://github.com/vercel/next.js/pull/74522 | Next.js 15 起生效，查證 2026-08-25 |
| Vue Router：Dynamic Route Matching | https://router.vuejs.org/guide/essentials/dynamic-matching.html | Vue Router 4，查證 2026-08-25 |
| Express Routing 指南 | https://expressjs.com/en/guide/routing.html | 查證 2026-08-25 |
| React `createRoot` API | https://react.dev/reference/react-dom/client/createRoot | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 更正
> (e) 那一點很重要：<mark style="background: #FF5582A6;">Gemini 給的 `params.slug` 同步寫法在 Next.js 15 以後已經不適用</mark>，App Router 的 `params` 改成 Promise，必須 `await`。Gemini 回答時沒有標注版本，照抄會踩雷。請務必以你專案的 `package.json` 裡的 Next.js 版本為準。
> 另外這場對話標題叫「單向與雙向資料綁定解析」，但實際內容<mark style="background: #FF5582A6;">完全沒有講到單向／雙向綁定</mark>，標題是 Gemini 自動生成時抓錯重點。真正談綁定的內容請看 useRef 那一篇。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
