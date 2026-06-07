# RSC「慣例(convention)」程式碼範例

> 搭配 [tree.md](tree.md) 第 5 段一起看。
> 同一個需求,用兩種「**誰擁有樹**」的慣例寫,你會看到**洞的方向整個反過來**。
> 底層用的都是同一套協定 → 看 [protocol-example.md](protocol-example.md)。

---

## 慣例 A:Server 擁有樹(Next.js 最常見)

**總承包商 = server。** 根是 Server Component,Client Component 是「洞」。

```tsx
// app/page.tsx —— Server Component(預設,沒有 'use client')
// 這是「根」,server 從這裡開始當總承包商
import { LikeButton } from './LikeButton'   // ← 這是 Client Component

export default async function Page() {
  const post = await db.post.find(42)        // ✅ server 直接讀 DB(安全、便宜)
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <LikeButton postId={post.id} />        {/* ⬚ 洞:交給瀏覽器來填 */}
    </article>
  )
}
```

```tsx
// LikeButton.tsx —— Client Component(那個「洞」)
'use client'                                  // ← 標記:我要送到瀏覽器、我會互動
import { useState } from 'react'

export function LikeButton({ postId }: { postId: number }) {
  const [liked, setLiked] = useState(false)   // ✅ 能用 state(因為在瀏覽器跑)
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'}
    </button>
  )
}
```

**方向:server 蓋整棵樹 → 留洞 → 瀏覽器把 `LikeButton` 填進洞並通電(hydration)。**

---

## 慣例 B:Client 擁有樹(方向反過來)

**總承包商 = 瀏覽器。** 根是 Client Component,Server Component 反而變成「外包零件」,被 server 渲染好、串流回來填洞。

```tsx
// App.tsx —— Client Component,瀏覽器是總承包商
'use client'
import { useState, useMemo, use, Suspense } from 'react'
import { createFromFetch } from 'react-server-dom-webpack/client'

// 跟 server 要一塊「已經渲染好、打包成 RSC stream」的內容
function fetchServerReport(tab: string) {
  return createFromFetch(fetch(`/rsc/report?tab=${tab}`))
}

export function App() {
  const [tab, setTab] = useState('overview')

  // 用 useMemo 鎖住 promise,避免每次 render 都重新 fetch(否則會無限抓)
  const report = useMemo(() => fetchServerReport(tab), [tab])

  return (
    <div>
      <nav>{/* 路由、外框都在瀏覽器這邊 → 瀏覽器決定整體結構 */}
        <button onClick={() => setTab('overview')}>總覽</button>
        <button onClick={() => setTab('sales')}>銷售</button>
      </nav>

      {/* ⬚ 洞:這一塊交給 SERVER 渲染、串流回來填 */}
      <Suspense fallback={<p>載入中...</p>}>
        {use(report)}
      </Suspense>
    </div>
  )
}
```

```tsx
// server 端的 /rsc/report 端點
// Report.tsx —— Server Component,被當成「外包零件」
async function Report({ tab }: { tab: string }) {
  const data = await db.analytics.load(tab)   // ✅ 在 server 讀資料
  return (
    <table>
      {data.rows.map((r) => (
        <tr key={r.id}><td>{r.name}</td><td>{r.value}</td></tr>
      ))}
    </table>
  )
}

// 端點:把 Report 這棵「子樹」打包成 RSC stream 回傳
import { renderToReadableStream } from 'react-server-dom-webpack/server'

export async function GET(req: Request) {
  const tab = new URL(req.url).searchParams.get('tab') ?? 'overview'
  const stream = renderToReadableStream(<Report tab={tab} />)
  return new Response(stream)
}
```

**方向:瀏覽器蓋整棵樹 → 留洞 → 去跟 server 要 `Report` 的 payload → 填進洞。**
這就是 TanStack Start 把 RSC 當「協定」用、所以做得到的彈性。

---

## 對照:同一個洞,方向反過來了

| | 慣例 A(server 擁有) | 慣例 B(client 擁有) |
|---|---|---|
| 樹的根 / 總承包商 | server | 瀏覽器 |
| 「洞」是誰 | **Client Component**(`LikeButton`) | **Server Component**(`Report`) |
| 洞由誰填 | 瀏覽器載入互動元件填 | server 渲染好、串流回來填 |
| 典型框架 | Next.js App Router | TanStack Start(彈性用法) |
| 底層協定 | 同一套 RSC 協定 | 同一套 RSC 協定 |

> 關鍵:**兩種寫法用的是同一個協定**(`renderToReadableStream` / `createFromFetch`)。
> 差別只在「誰當總承包商、洞開在誰身上」—— 這就是「慣例」這一層的選擇。
