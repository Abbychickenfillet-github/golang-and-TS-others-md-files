# Next.js 的 `params.slug` 動態路由用法整理

> 延伸自 [[react-server-component-slug-動態路由參數]] 裡對 `slug` 這個 prop 從哪來的疑問。⚠️ 未於本次對話即時 `WebFetch` 核對 nextjs.org 官方文件版本，內容依訓練知識整理，Next.js 版本更新快，之後若行為對不上請回去對一次 `nextjs.org/docs/app/building-your-application/routing/dynamic-routes` 再補來源表格。

本篇重點 (a)–(k)，共 11 個。

## 一、資料夾命名 → 網址片段 對照

Next.js **App Router**（`app/` 目錄）用「資料夾名稱加中括號」來宣告動態路由：

| 資料夾寫法 | 範例網址 | 拿到的 params 形狀 |
|---|---|---|
| `app/conferences/[slug]/page.js` | `/conferences/react-conf-2026` | `{ slug: "react-conf-2026" }` |
| `app/blog/[...slug]/page.js`（catch-all） | `/blog/2026/08/my-post` | `{ slug: ["2026", "08", "my-post"] }` |
| `app/docs/[[...slug]]/page.js`（optional catch-all） | `/docs` 或 `/docs/a/b` | `{ slug: undefined }` 或 `{ slug: ["a","b"] }` |

(a) `[slug]` 只吃「一段」路徑；`[...slug]`（catch-all）會把後面所有段落收
成一個**陣列**；`[[...slug]]`（optional catch-all，多一層中括號）連完全
不帶參數的網址（如 `/docs`）都能匹配，此時 `slug` 會是 `undefined`。

## 二、在 page 元件裡怎麼拿到 `slug`

(b) App Router 的 page/layout 元件會收到 `params` 這個 prop，型狀對應資料
夾的中括號名稱：

```jsx
// app/conferences/[slug]/page.js
export default async function Page({ params }) {
  const { slug } = await params; // Next.js 15+：params 是 Promise，要 await
  const conf = await db.Confs.find({ slug });
  return <ConferenceLayout conf={conf} />;
}
```

(c) **Next.js 13/14**：`params` 是一般物件，可以直接解構
`function Page({ params: { slug } })`。
(d) **Next.js 15 之後**：`params`（以及 `searchParams`）改成
**非同步（Promise）**，一定要 `await params` 才能拿到值，否則會拿到
Promise 物件而不是字串，這是很多人升級後最容易踩到的坑。

## 三、跟舊版 Pages Router 的差異

| | Pages Router（舊，`pages/` 目錄） | App Router（新，`app/` 目錄） |
|---|---|---|
| 動態路由檔名 | `pages/conferences/[slug].js` | `app/conferences/[slug]/page.js` |
| Server 端怎麼拿 slug | `getStaticProps(context)` / `getServerSideProps(context)` 的 `context.params.slug` | Server Component 的 `params` prop（要 `await`，見上） |
| Client 端怎麼拿 slug | `useRouter()` 從 `next/router`，讀 `router.query.slug` | `useParams()` 從 `next/navigation`（僅限 Client Component） |
| 靜態產生所有頁面 | `getStaticPaths()` 回傳 `paths` 陣列 | `generateStaticParams()` 回傳陣列 |

(e) 這個 repo 前端實際用的是 **TanStack Router**（見
[[TANSTACK_ROUTER_ROUTE_GENERATION]]），不是 Next.js；這篇純粹是知識補充，
之後如果換專案或面試被問到 Next.js 路由可以回來查。

## 四、Client Component 裡要用 `useParams`

(f) 如果是標了 `'use client'` 的元件，不能用 async/await 直接拿
`params` prop（Client Component 不能是 async function component），要改
用 hook：

```jsx
'use client';
import { useParams } from 'next/navigation';

function ConferenceHeader() {
  const { slug } = useParams(); // 已經是解析好的物件，不用 await
  return <h1>{slug}</h1>;
}
```

(g) 容易搞混的兩個 `useRouter`／`useParams`：**`next/router`**
是 Pages Router 專用（已過時但舊專案還在用）；**`next/navigation`**
是 App Router 專用。import 錯 package 是常見報錯原因之一。

## 五、`generateStaticParams`：預先產生哪些 slug 的靜態頁

(h) 如果想在建置（build）時就把每個 slug 的頁面都預先生成（SSG），要在
`page.js` 同層 export 這個函式：

```jsx
export async function generateStaticParams() {
  const confs = await db.Confs.findAll();
  return confs.map(conf => ({ slug: conf.slug }));
}
```

(i) 沒有出現在這個回傳陣列裡的 slug，預設會在使用者第一次訪問時才動態產
生（依 `dynamicParams` 設定而定），這跟舊版 `getStaticPaths` 的
`fallback` 選項概念一樣。

## 六、常見錯誤

(j) 忘記 `await params`（Next 15+）：直接 `params.slug` 會拿到
`undefined` 或整個 Promise 印出來，畫面顯示 `[object Promise]` 或查詢
失敗——這是最常見的升級後 bug。
(k) 資料夾名稱打錯中括號數量：`[slug]` vs `[...slug]` vs `[[...slug]]`
三者匹配規則完全不同，命名前先想清楚這個路由需不需要吃「多層路徑」或
「完全不帶參數」。

## 關聯筆記
- [[react-server-component-slug-動態路由參數]] —— slug 的定義、`db.Confs.find` 範例程式碼逐行拆解
- [[TANSTACK_ROUTER_ROUTE_GENERATION]] —— 本專案實際使用的路由產生機制，可對照差異
- [[server-component-寫什麼]] —— tanstack 資料夾下 server component 相關筆記
