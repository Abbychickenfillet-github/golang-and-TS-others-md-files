# React Server Component 中的 `slug` 與 `db.Confs.find` 是什麼？

> 來源情境：這段程式碼是 React 官方文件 (react.dev) 講解 `<Suspense>` + Server Component streaming 時常用的範例，長得像 Next.js App Router 的 `page.js`。⚠️ 本篇未於對話中即時 `WebFetch` 核對 react.dev 原文網址，之後有空可以去 `react.dev/reference/react/Suspense` 對一下原文再補來源表格。

本篇重點 (a)–(m)，共 13 個。

## 問題重現

```jsx
import { db } from './database.js';
import { Suspense } from 'react';

async function ConferencePage({ slug }) {
  const conf = await db.Confs.find({ slug });
  return (
    <ConferenceLayout conf={conf}>
      <Suspense fallback={<TalksLoading />}>
        <Talks confId={conf.id} />
      </Suspense>
    </ConferenceLayout>
  );
}

async function Talks({ confId }) {
  const talks = await db.Talks.findAll({ confId });
  const videos = talks.map(talk => talk.video);
  return <SearchableVideoList videos={videos} />;
}
```

## 一、`slug` 是什麼

(a) `slug` 不是 React/JS 內建關鍵字，只是變數名稱慣例，泛指**適合放進網址列、
人類看得懂的唯一識別字串**，通常由標題轉換而來：全小寫、空白換成 `-`、去掉
特殊符號。

| 原始標題 | slug |
|---|---|
| `React Conf 2026` | `react-conf-2026` |
| `福利社 週年慶` | `fu-li-she-zhou-nian-qing`（或直接用 UUID/流水號） |

(b) 跟 slug 相對的是 **id**（資料庫主鍵，數字或 UUID，例如 `8492`）。id 對機
器友善，但放進網址不好記、不利 SEO；slug 就是給「網址」用的 id。

```
https://example.com/conferences/react-conf-2026
                                  └────┬────┘
                                     slug
```

## 二、逐行拆解

```jsx
async function ConferencePage({ slug }) {
```
(c) `ConferencePage` 是 **async 函式元件**（React Server Component 才能是
`async`，Client Component 不行）。`{ slug }` 是物件解構，從 props 取出
`slug` 欄位；這個值來自路由框架（例如 Next.js App Router `[slug]/page.js`），
不是憑空冒出來的。

```jsx
  const conf = await db.Confs.find({ slug });
```
(d) 用 `slug`（字串）去資料庫查一筆符合的研討會資料，而不是用 `id`——因為網
址上拿到的本來就是 slug。查出來的 `conf` 物件裡才有真正的 `conf.id`（主鍵），
後面查關聯資料（talks）要用它。

```jsx
  return (
    <ConferenceLayout conf={conf}>
      <Suspense fallback={<TalksLoading />}>
        <Talks confId={conf.id} />
      </Suspense>
    </ConferenceLayout>
  );
```
(e) 外層資料（研討會本身）先查完才 render，是同步等待。
(f) `<Talks />`（議程列表）用 `<Suspense>` 包起來，代表「這塊可以晚一點顯
示」：先顯示 `fallback={<TalksLoading />}`，等 `Talks` 自己查完資料再串流
（stream）進來換掉 loading 畫面——這是 React 18 的 **streaming SSR**。
(g) 傳進 `<Talks>` 的是 `confId={conf.id}`（資料庫 id），不是 slug，因為此
時已經有真正的研討會物件，用 id 查子資料比較直接、效能也好。

```jsx
async function Talks({ confId }) {
  const talks = await db.Talks.findAll({ confId });
  const videos = talks.map(talk => talk.video);
  return <SearchableVideoList videos={videos} />;
}
```
(h) 另一個 async Server Component，用 `confId` 查「這場研討會底下所有演
講」，再把每個 talk 的影片欄位取出來，丟給 `<SearchableVideoList>` 顯示。

## 三、`db.Confs.find` 到底是什麼？`Confs` 這個屬性哪來的？

(i) **這是示意／偽程式碼，不是真的可以執行的 API。** 檔案最上面
`import { db } from './database.js';` 只是「假設你已經寫好一個
`database.js`，裡面 export 出一個叫 `db` 的物件」——但這個 `database.js`
**根本沒有被展示出來**。所以 `db.Confs`、`.find()`、`db.Talks.findAll()`
這些寫法完全是**這篇範例自己虛構的介面**，用來表達「這裡要去資料庫查資
料」這個概念，並不是 React、Node.js 或任何框架內建會自動生出來的屬性。

(j) 換句話說：`Confs` 這個「屬性」不是「什麼時候突然有的」，而是**這個範例
選擇這樣命名**（Confs = Conferences 的縮寫，模仿 ORM 的 Model 命名習慣）。
如果你真的要照抄這段程式碼跑起來，`db.Confs.find` 這行要換成你實際專案用
的資料庫 client，例如：

| 你用的技術 | 對應的等價寫法 |
|---|---|
| Prisma | `await prisma.conference.findUnique({ where: { slug } })` |
| Mongoose (MongoDB) | `await Conference.findOne({ slug })` |
| Sequelize (SQL) | `await Conference.findOne({ where: { slug } })` |
| 原生 SQL | `` await db.query('SELECT * FROM conferences WHERE slug = ?', [slug]) `` |
| 這個 repo 的 Go backend | 類似 `internal/repository/*_repository.go` 裡的 `FindBySlug(slug)` 手寫方法 |

## 四、「是不是把從資料庫拿到的名字變成 slug？」——不是

(k) 不是。這行 `db.Confs.find({ slug })` 是**查詢（read）**，語意等於 SQL
的 `WHERE slug = '你網址上那個字串'`，目的是「用 slug 反查出整筆資料」，
**不是**把查出來的名字（title）即時轉換成 slug。

(l) 真正「把名字轉成 slug」的動作（叫做 **slugify**），通常只發生在**建立
資料的時候**（例如主辦方新增一場研討會、輸入標題「React Conf 2026」時，
後端會自動產生 `slug: "react-conf-2026"` 存進資料庫），是一次性的、獨立
的步驟，跟這段查詢程式碼完全無關。JS 常見會用 `slugify` 套件，或手寫
`title.toLowerCase().replace(/\s+/g, '-')` 之類的邏輯。

(m) 所以資料流其實是：

```
建立資料時（一次性）：標題 "React Conf 2026" --slugify--> slug 欄位存進 DB
瀏覽網頁時（每次請求）：URL 上的 slug 字串 --查詢(find)--> 整筆 conf 資料
```

## slug vs id 用途對照

| | slug | id |
|---|---|---|
| 型態 | 字串，通常是 kebab-case | 數字或 UUID |
| 用途 | 給「網址」看的、給人看的 | 給「資料庫關聯」用的 |
| 唯一性 | 通常也要 unique（DB 加 unique index） | 一定 unique（主鍵） |
| 這段程式碼裡怎麼用 | 從 URL 進來 → 查出整筆 `conf` | 查出 `conf` 之後 → 拿 `conf.id` 去查子資料 `talks` |

## 為什麼會覺得眼熟但想不起來

slug 這個詞最常出現在：Next.js App Router 動態路由（`[slug]/page.js`，見
[[nextjs-params-slug動態路由用法]]）、CMS/Blog 系統（WordPress、Contentful、
Notion API 幾乎都有 slug 欄位）、後端 ORM schema 設計（`id` 主鍵 +
`slug` 唯一索引並存）。

## 關聯筆記
- [[SSR-renderToString與Hydration-伺服器端渲染流程]] —— streaming SSR / Suspense 概念
- [[TANSTACK_ROUTER_ROUTE_GENERATION]] —— 專案內實際用的 TanStack Router 動態參數處理，可互相對照
- [[nextjs-params-slug動態路由用法]] —— Next.js 專屬的 `params.slug` 用法整理
