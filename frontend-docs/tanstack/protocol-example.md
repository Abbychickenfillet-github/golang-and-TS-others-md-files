# RSC「協定(protocol)」程式碼範例

> 搭配 [tree.md](tree.md) 第 4 段一起看。
> 協定要做的事只有一件:**把「一棵有洞、夾帶特殊值的樹」→ 變成一段 stream → 在另一端重建回樹。**
> 它**不管**這棵樹是誰擁有的。

---

## 1. 假設我們有這棵樹

```tsx
// Article 是 Server Component(只在 server 跑)
// LikeButton 是 Client Component(要送到瀏覽器、能互動)
async function Article({ postId }: { postId: number }) {
  const post = await db.post.find(postId) // ✅ server 直接讀 DB
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <LikeButton postId={post.id} />   {/* ← 這裡是「洞」 */}
    </article>
  )
}
```

---

## 2. server 渲染後,協定把它「序列化」成這段 stream

下面就是 server 傳給瀏覽器的 **RSC payload**(簡化、加註解版;真實格式更精簡):

```jsonc
// 第 1 行:一張「洞的便條」(client ref)
//   意思:LikeButton 這個互動元件,程式碼在這個檔案、這個 chunk,瀏覽器自己去載入
1:I["./LikeButton.tsx", ["chunk-LikeButton.js"], "LikeButton"]

// 第 0 行:整棵樹的結構(已經渲染好的「死」內容 + 一個洞)
//   "$" 開頭 = 一個 React 元素;"$1" = 「這裡放第 1 行定義的那個洞」
0:["$","article",null,{"children":[
     ["$","h1",null,{"children":"我的文章"}],
     ["$","p",null,{"children":"內文..."}],
     ["$","$1",null,{"postId":42}]            // ← 洞:LikeButton,props 是 postId=42
   ]}]
```

**看懂這段就懂協定了:**
- 「死」的內容(`h1`、`p` 的文字)→ 直接序列化成結構
- 「會動」的部分 → 不送元件本身,只送一張**便條(client ref)**叫瀏覽器自己去載入
- 兩者用 `$1` 這種代號接起來

---

## 3. 協定的招牌能力:`Promise` + 串流(非 JSON 的東西)

JSON 沒辦法表達「還沒算好的值」。RSC 協定可以 —— **先送骨架,內容好了再用同一條 stream 補上**:

```jsonc
// 一開始:內文還在慢慢撈,先送骨架,內文位置先佔位
0:["$","article",null,{"children":[
     ["$","h1",null,{"children":"我的文章"}],
     ["$","$L2",null,{}]      // ← $L2 = 「第 2 行的內容還沒好,先佔位,晚點補」
   ]}]

// ...過了 200ms,慢來源回來了,server 在「同一條 stream」再 flush 這一行:
2:["$","p",null,{"children":"終於載入好的內文..."}]
```

瀏覽器收到第 2 行時,會自動把它填回 `$L2` 的位置。這就是「邊算邊傳」。

---

## 4. 用 pseudo-code 看「協定」其實就兩個函式

```ts
// =========== server 端:把樹「打包成 stream」 ===========
import { renderToReadableStream } from 'react-server-dom-webpack/server'

const stream = renderToReadableStream(<Article postId={42} />)
// stream 裡就是上面那種一行一行的 payload


// =========== 瀏覽器端:把 stream「重建回 React 樹」 ===========
import { createFromReadableStream } from 'react-server-dom-webpack/client'

const tree = createFromReadableStream(stream)
// tree 現在是可以交給 React 畫出來的元素;
// 遇到「洞的便條」會自動去載入對應的 client 元件
```

> 套件名稱會因打包器不同而異:`react-server-dom-webpack` / `-turbopack` / `-parcel`。
> 重點是這兩個函式:**一個打包(serialize)、一個重建(deserialize)。協定 = 這兩件事。**

---

## 5. 重點(為什麼說協定不管「誰擁有樹」)

```ts
// 注意上面那兩個函式:
renderToReadableStream(<Article/>)   // 誰呼叫它?
createFromReadableStream(stream)     // 誰呼叫它?
```

- `renderToReadableStream` 可以被 **request 時的 server** 呼叫、也可以被 **build 腳本** 呼叫、甚至 **另一台機器** 呼叫。
- `createFromReadableStream` 可以在 **瀏覽器** 呼叫(慣例 A),也可以由 **client 當總承包商時去跟 server 要片段**(慣例 B)。

**協定從頭到尾只關心「打包 / 傳輸 / 重建」,完全沒規定誰當總承包商。**
誰擁有樹,是「慣例」那一層決定的 → 看 [convention-example.md](convention-example.md)。

---

## 6. 「這一端 / 另一端」到底在哪?

| | 在哪裡 | 做什麼 | 對應程式 |
|---|---|---|---|
| **這一端(起點)** | **伺服器** | 把樹**打包**成 stream | `renderToReadableStream` |
| **另一端(終點)** | **瀏覽器** | 把 stream**重建**回樹 | `createFromReadableStream` / `createFromFetch` |

```
   伺服器                              瀏覽器
   (這一端)                           (另一端)
   把樹打包成 stream  ───────────────▶  收到 stream,重建回樹
```

### ⚠️ stream 方向 ≠ 誰擁有樹

不管誰擁有樹,stream **永遠是 伺服器 → 瀏覽器**:

- **慣例 A(server 擁有)**:server 打包整棵樹 → 瀏覽器重建。
- **慣例 B(client 擁有)**:瀏覽器是總承包商,但碰到 Server Component 的洞時,**跟 server 要**那塊 → server 打包 fragment → 瀏覽器重建塞進洞。**這一端還是 server,另一端還是瀏覽器。**

> - **擁有樹** = 誰當總承包商(可能是瀏覽器)
> - **stream 方向** = 永遠「server 打包 → 瀏覽器重建」
> 這是兩件事,別混。
