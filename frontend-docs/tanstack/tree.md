# RSC 與「誰擁有元件樹(tree)」

> 這份筆記可以單獨從頭讀到尾,不需要任何前後文。
> 目標:徹底搞懂三個問題 ——
> 1. 「tree(元件樹)」是什麼?
> 2. 「server 擁有 tree」是什麼意思?
> 3. 為什麼又有人說「不一定是 server 擁有」?那到底誰擁有?

**相關檔案:**
- 🔰 [名詞-洞與hydration.md](名詞-洞與hydration.md) —— **忘了「洞」「hydration」就先看這張**(最基礎)
- 🈯 [名詞-server與client翻譯.md](名詞-server與client翻譯.md) —— server/client 怎麼翻才不會搞混(別翻成「後端」「客戶」)
- ✍️ [server-component-寫什麼.md](server-component-寫什麼.md) —— Server Component 通常拿來寫什麼、不能寫什麼
- [protocol-example.md](protocol-example.md) —— 協定(protocol)程式碼範例:payload 長相、序列化/重建
- [convention-example.md](convention-example.md) —— 慣例(convention)程式碼範例:server 擁有 vs client 擁有

---

## 1. 先搞懂「tree(元件樹)」是什麼

React 的畫面,是用「元件」一層包一層組成的。
拿一個部落格文章頁當例子,它可能長這樣:

```
頁面
 ├─ 頂部導覽列
 ├─ 文章區
 │    ├─ 標題
 │    ├─ 內文
 │    └─ 按讚按鈕
 └─ 側邊欄
      └─ 推薦文章清單
```

這個「一層包一層」的巢狀結構,就是 **元件樹(component tree)**。
它像一棵樹:最上面是樹根(頁面),往下分出樹枝(各區塊),再分出樹葉(最小的元件)。

> **一句話:tree = 你的畫面拆成元件後,那個一層包一層的階層結構。**

後面講的「擁有 tree」「在 tree 上挖洞」,講的都是這棵樹。

---

## 2. 兩種元件:Server Component vs Client Component

在新的架構(Next.js App Router v13+、TanStack Start 等)裡,元件分成兩種:

| | **Server Component** | **Client Component** |
|---|---|---|
| 怎麼標記 | 預設就是(不用寫) | 檔案最上面寫 `'use client'` |
| 在哪裡執行 | **只在 server** | server + 瀏覽器都會 |
| 會不會把 JS 送到瀏覽器 | ❌ 不送(省流量) | ✅ 送 |
| 能不能互動(點擊、輸入、`useState`) | ❌ 不能 | ✅ 能 |
| 能不能直接讀資料庫、用後端密鑰 | ✅ 能(反正只在 server) | ❌ 不能 |
| 能不能用 `document` / `window` | ❌ 用了會報錯 | ⚠️ 要放在 `useEffect` 裡才安全 |

**白話理解:**
- **Server Component** = 一張「已經印好、不能再互動」的紙。便宜、可以放機密(因為觀眾拿不到製作過程),但它是死的。
- **Client Component** = 一個「會動的小裝置」。要花成本(送 JS 到瀏覽器),但它能被點、能反應。

> 補一個常被搞混的點:
> **「Server Component」不等於「SSR」。**
> - SSR = 把元件先在 server 渲染成 HTML 再送瀏覽器(Client Component 也會經過 SSR)。
> - Server Component = 只在 server 跑、**永遠不會到瀏覽器**、不會 hydrate。
> 所以「沒寫 `'use client'`」的元件是 **Server Component**,不是「被當作 SSR」。

---

## 3. 「擁有 tree」是什麼意思?

把整個流程想成蓋房子:

> **「擁有 tree」= 誰是「總承包商」——
> 誰拿著整棟的設計圖、決定整體結構、負責把房子組起來。**

在最常見的(Next.js)做法裡,是 **server 當總承包商**:

```
        頁面            ← server 是總承包商,從這裡開始組
         │
       文章區           ← Server Component(server 自己蓋好)
         │
        ⬚ 按讚按鈕      ← 這裡需要「會動」,所以先「留一個洞」
                          server 不蓋它,只標記「這裡之後要裝一個互動裝置」
```

這就是你會聽到的兩句話:

- **"server owns the tree"** → server 擁有這棵樹(它是總承包商)
- **"'use client' marks the hole"** → 凡是標了 `'use client'` 的地方,server 就**不蓋**,只在樹上**留一個洞(hole)**,記下「這個洞要交給哪個互動元件、給它什麼資料」
- **"stitches together at hydration"** → 瀏覽器收到「半成品的樹 + 那些洞的清單 + 互動裝置的 JS」之後,把洞一個個**填上真正的互動元件、通上電(hydration)**,縫合成完整、能互動的畫面

到這裡為止,都是「server 擁有樹」的世界。**但這只是其中一種做法。**

---

## 4. 關鍵轉折:RSC 其實是「協定」,不是「規定誰擁有」

> 📄 **程式碼範例:[protocol-example.md](protocol-example.md)** —— 看 RSC payload 長什麼樣、序列化/重建怎麼運作。

這是最容易卡住、也最重要的一段。慢慢看。

「RSC」這個詞,其實偷偷把**兩件不同的事**疊在一起講:

| | 它是什麼 | 它規定的是 |
|---|---|---|
| **① 協定(protocol)** | 一種「打包格式 + 傳輸方式」 | **怎麼**把一棵樹打包、傳給對方、再重建 |
| **② 慣例(convention)** | 「server 當總承包商」那套用法 | **誰**來當總承包商、在哪裡挖洞 |

重點來了:

> **「誰擁有 tree」是第 ② 層(慣例)的選擇。
> 而第 ① 層(協定)根本不管誰擁有。**

### 第 ① 層協定到底在做什麼?

協定的工作,是把「一棵已經渲染、但中間有洞、還夾帶特殊資料的樹」**變成一段可以傳輸、又能在另一端重建的資料流(stream)**。它能打包:

- **渲染好的結構** — 樹長什麼樣
- **洞的指標(client refs)** — 不是互動元件本身,而是一張便條:「去載入某個元件,放在這個洞,資料是這些」
- **JSON 裝不下的東西** — 例如 `Promise`(可以邊算邊傳,內容好了再補上)、`Date`、`Map`、server 動作的函式參照等
- **以 stream 形式傳** — 不是一次傳完一坨,而是像水流一樣,算好一段就先送一段

**注意:這層從頭到尾只關心「怎麼打包 + 傳輸 + 重建」。它完全不在乎這棵樹是 server 蓋的還是瀏覽器蓋的、總承包商是誰。**

這就是那句話的意思:

> "RSC is also a protocol... The conventional server-owned tree is just **one way** to use that protocol."
> (RSC 也是一種協定……「server 擁有樹」只是「使用這個協定的其中一種方式」。)

---

## 5. 所以「誰擁有 tree」有三種可能

> 📄 **程式碼範例:[convention-example.md](convention-example.md)** —— 同一個畫面用「server 擁有」vs「client 擁有」兩種寫法,看洞的方向怎麼反過來。

因為協定不規定擁有者,你可以自由選總承包商是誰:

### 慣例 A:Server 擁有樹(Next.js 最常見)

```
   頁面          ← 總承包商 = SERVER
    │
  文章區          server 自己蓋,可直接讀資料庫
    │
   ⬚ 按讚按鈕     ← 洞,交給「瀏覽器端的互動元件」來填
```
**Server 是主人,Client Component 是洞。**

### 慣例 B:Client 擁有樹(方向反過來!協定一樣允許)

```
   頁面          ← 總承包商 = 瀏覽器(CLIENT)
    │
  儀表板          Client Component,瀏覽器自己組(路由、外框都在瀏覽器)
    │
   ⬚ 伺服器報表   ← 這個洞,反而交給「SERVER」來填!
                   瀏覽器跟 server 要一份打包好的樹(RSC payload),
                   server 把這塊蓋好、打包傳回來,瀏覽器塞進這個洞
```
**這次瀏覽器是主人,Server Component 變成「外包給 server 做、再寄回來填洞」的零件。**
**洞的方向整個反過來了。** ← 這正是 TanStack Start 能做、但 Next.js 慣例做不到的彈性。

### 慣例 C:根本沒有 server 在線上跑

在「build(打包)的時候」就先把 Server Component 蓋好、打包成**靜態檔案**。
這時的「總承包商」是 build 流程,網站上線後根本沒有 server 在跑。

> **重點:「沒有 server 在線上跑」≠「完全沒用到 server」。** 差別在「什麼時候」用:
>
> | 時間點 | 何時 | 有沒有用到 server |
> |---|---|---|
> | **build time(上線前)** | 跑 `npm run build` 時(你電腦 / CI) | ✅ Server Component 在這裡跑完(= 打包那一端) |
> | **runtime(線上)** | 使用者來訪時 | ❌ 只下載靜態檔,沒有 server 在執行 |
>
> 所以 **RSC 還是有用到、Server Component 還是有跑**,只是「提早在 build 時跑完」、結果凍成檔案。
> RSC 是「**讓你可以選擇**不需要線上 server」(因為 payload 能存成檔案),不是「強迫沒 server」。
>
> 比喻:慣例 A = 現烤麵包(線上烤箱現烤);慣例 C = 工廠先烤好放貨架(線上只是 CDN 貨架)。
> 這其實就是 **SSG(靜態網站生成)**。

---

## 6. 回到你的問題:這棵 tree 到底誰擁有?

> **沒有標準答案 —— 「誰擁有 tree」是你選的架構決定的,不是 RSC 規定的。**
>
> - RSC **協定**本身不指定擁有者,它只管「打包 / 傳輸 / 重建」。
> - 在 **Next.js 慣例**裡:**server 擁有**整棵樹,Client Component 當洞。
> - 但協定也允許:**瀏覽器擁有**整棵樹,Server Component 反而當洞(慣例 B);或 **build 時擁有**(慣例 C)。
>
> 你之前學到的「server owns the tree」,是「**其中一種用法**」,不是 RSC 的定義。

而那段話為什麼要強調 TanStack Start?
因為 **TanStack Start 把 RSC 當「協定」來支援**,所以它不被綁死在「server 擁有整棵樹」這一種慣例上 —— 你可以做成「瀏覽器當總承包商、需要時才跟 server 要某幾塊」的架構。

---

## 速查表(記這個就好)

| 名詞 | 一句話 |
|---|---|
| **tree** | 畫面拆成元件後,一層包一層的階層結構 |
| **擁有 tree** | 誰當「總承包商」:決定整體結構、負責組裝 |
| **hole(洞)** | 樹上「我不蓋、交給別人填」的預留位置 |
| **Server Component** | 只在 server 跑、不送 JS、不能互動、可讀 DB |
| **Client Component**(`'use client'`) | 會送 JS 到瀏覽器、能互動 |
| **hydration** | 瀏覽器把洞填上互動元件、通上電,讓畫面能動 |
| **RSC 協定** | 把樹打包成 stream 傳輸再重建的格式;**不管誰擁有樹** |
| **server owns the tree** | 只是「使用協定的其中一種慣例」,不是 RSC 的定義 |
```
