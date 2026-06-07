# Server Component 通常寫什麼?

> 回主筆記 → [tree.md](tree.md)

## 一句話

> **Server Component 拿來「抓資料 + 顯示不需要互動的內容」。**
> 它在伺服器上跑,所以**最擅長碰資料、最不擅長互動**。

---

## 常寫這 4 類

### 1. 抓資料(最常見)

在伺服器上可以**直接 `await`** DB / API / 讀檔,不用 `useEffect`、不用 `useQuery`:

```tsx
async function PostPage({ id }: { id: number }) {
  const post = await db.post.find(id)        // ✅ 直接抓 DB
  // 或 await fetch('http://go-backend:8080/api/posts/' + id)
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

### 2. 不需互動的 UI(純顯示)

排版、標題、內文、清單、卡片 —— 給你看、不用點的東西:

```tsx
function PostList({ posts }) {
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```

### 3. 會用到「機密」的東西

API key、DB 密碼、後端 token。Server Component 的程式碼**永不送到瀏覽器**,放這很安全:

```tsx
async function Weather() {
  const data = await fetch(`https://api.xxx.com?key=${process.env.SECRET_KEY}`)
  // ✅ SECRET_KEY 不會外洩(這段只在伺服器跑)
  return <div>{/* ... */}</div>
}
```

### 4. 用「很大的套件」做處理

markdown 轉 HTML、程式碼上色等。伺服器處理完才送結果,**瀏覽器不用下載那包大套件**:

```tsx
import { marked } from 'marked'      // 假設很肥
async function Doc({ md }: { md: string }) {
  const html = marked(md)            // ✅ 在伺服器轉好
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
```

---

## ❌ 不能寫這些(要放 Client Component)

| 不能寫 | 為什麼 |
|---|---|
| `useState` / `useEffect` / `useRef` | 「會動 / 有記憶」的功能,要瀏覽器 |
| `onClick` / `onChange` 等事件 | 互動只能在瀏覽器發生 |
| `window` / `document` / `localStorage` | 伺服器上沒有瀏覽器物件,會報錯 |

這些要寫進 **Client Component**(`'use client'`),也就是樹上的「洞」。

---

## 🧭 判斷口訣

> **這段需要「會動」嗎?**
> - 需要(能點、會變、要記住狀態)→ **Client Component**
> - 不需要(只是抓資料、顯示)→ **Server Component**
