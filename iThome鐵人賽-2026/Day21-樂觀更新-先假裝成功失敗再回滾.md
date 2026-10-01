# Day 21｜樂觀更新：先假裝成功，失敗再回滾——以及回滾時最容易出錯的那一步

昨天 Day 20 我在文末預告了今天的題目，原話是這樣寫的：

> Day 21 講樂觀更新（Optimistic Update）：為什麼「先假裝成功、失敗再回滾」能讓介面感覺快十倍，以及回滾時最容易出錯的那一步。

今天我把它實際跑出來，結果有一個地方我要先修正自己：**「快十倍」這個說法是錯的**。原因在第二節，量測數字會告訴你為什麼連「倍數」這個單位都不成立。

這篇要回答三個問題：

a. 樂觀更新到底省下多少時間，省下來的那段時間為什麼重要

b. 回滾（rollback）需要備份，那個備份到底備份了什麼

c. 回滾最容易出錯的那一步是哪一步——我原本以為是「忘記備份」，實測之後發現不是

---

## 一、先看沒有樂觀更新的版本，它其實一點都不笨

先講名詞，避免縮寫直接丟出來：

- **Optimistic Update（樂觀更新）**：使用者操作的當下就先把畫面改成「預期成功的樣子」，請求在背景送出，失敗再把畫面還原
- **Rollback（回滾）**：請求失敗時，把畫面或快取還原成操作前的狀態
- **Mutation（變更操作）**：會改變伺服器資料的請求，例如 POST、PATCH、DELETE。相對的，讀取資料的 GET 通常稱為 Query

跟樂觀更新對照的做法叫**悲觀更新（Pessimistic Update）**：等伺服器回應成功之後才改畫面。

```js
async function 悲觀更新() {
  console.log('使用者在第 0ms 按下「發布」')
  const result = await server.patch({ status: 'published' })
  screen.render(result)
}
```

這個寫法有一個很大的優點：**畫面永遠等於伺服器**。它不會騙人。所以請不要把悲觀更新當成「錯的寫法」，它是預設值，樂觀更新才是需要理由才能用的那一個。

實測輸出（伺服器延遲設定 600ms）：

```
【悲觀更新】
  使用者在第 0ms 按下「發布」
  [伺服器    1ms] 收到請求 #1 發布 {"status":"published"}
  [伺服器  602ms] 請求 #1 發布 成功，db 變成 status=published title=場地規範
  [畫面  602ms] status=published title=場地規範
```

按下按鈕之後 **602ms** 畫面才有任何反應。這 602ms 裡面你只能放一個 loading spinner。

---

## 二、樂觀更新的實測，以及我為什麼要修正「快十倍」

樂觀更新的版本只差一行——在 `await` 之前先畫一次：

```js
async function 樂觀更新() {
  console.log('使用者在第 0ms 按下「發布」')

  // 這一行就是「樂觀」：還沒有任何人答應你，你就先畫上去
  screen.render({ ...手冊初始值, status: 'published' }, '樂觀值，伺服器還沒回')

  const result = await server.patch({ status: 'published' })
  screen.render(result, '伺服器回來了，用真實資料校正')
}
```

實測輸出：

```
【樂觀更新】
  使用者在第 0ms 按下「發布」
  [畫面    0ms] status=published title=場地規範   ← 樂觀值，伺服器還沒回
  [伺服器    0ms] 收到請求 #1 發布 {"status":"published"}
  [伺服器  601ms] 請求 #1 發布 成功，db 變成 status=published title=場地規範
  [畫面  602ms] status=published title=場地規範   ← 伺服器回來了，用真實資料校正
```

量測結果：

```
  悲觀更新：按下按鈕後 602ms 畫面才有反應
  樂觀更新：按下按鈕後 0ms 畫面就有反應
  差距：602ms
```

**這就是我要修正的地方。**「快十倍」不只是數字不對，是**單位不對**。我昨天寫「快十倍」的時候，是把它當成一個效能優化在描述，但它不是效能優化——伺服器該花的 602ms 一秒都沒有少，只是使用者不用盯著它。

### 但那個 `0ms` 不是真的 0，我要把這件事講清楚

這兩個數字很容易被誤讀，所以先把它們各自是什麼講明白。

**a. 那個 602ms 不是量到的網路延遲，是我自己寫死的。**

假伺服器裡這一行：

```js
async patch(patch, { latency = 600, fail = false, label = '' } = {}) {
  await sleep(latency)
  // ...
}
```

白話解釋這段：`latency` 的預設值就是 `600`，`sleep(600)` 單純等 600 毫秒。**所以 602 是「我設的 600，加上 `setTimeout` 本身約 1 到 2 毫秒的排程誤差」。** 我選 600 是因為它落在 Nielsen 的第二區間，現象才明顯。

**b. 那個 0ms 是量測精度的假象。**

樂觀版跟悲觀版的差別只有一行的位置：

```js
// 悲觀：等伺服器回來才畫
const result = await server.patch({ status: 'published' })
screen.render(result)

// 樂觀：在 await 之前就先畫
screen.render({ ...手冊初始值, status: 'published' })   // ← 這一行
const result = await server.patch({ status: 'published' })
```

白話解釋：**樂觀那一行 `render` 跟「按下按鈕」在同一個 tick 裡同步執行，中間沒有任何 `await`。** 而我原本的計時器是 `Date.now() - clockStart`，單位是整數毫秒——同一毫秒內完成，相減就是 0。

所以我在 demo 裡另外加了一把奈秒解析度的尺（`process.hrtime.bigint()`），同一件事再量一次：

```
  ----- 量測結果（用 Date.now，整數毫秒）-----
  悲觀更新：按下按鈕後 602ms 畫面才有反應
  樂觀更新：按下按鈕後 0ms 畫面就有反應

  ----- 同一件事，用 hrtime（奈秒解析度）再量一次 -----
  悲觀更新：602.1207ms
  樂觀更新：0.0553ms
  倍數：10895 倍
```

**真實值是零點零幾毫秒，不是 0。** 那個 `0` 的意思是「快到 `Date.now()` 這把尺量不出來」，不是「無限快」。

（這兩個數字每台機器不同。同一支程式我在另一台跑出來是 `0.0963ms` 與 `6255 倍`。**看的是數量級，不要記死數字。**）

而下面那個「10895 倍」大到荒謬——**它剛好證明了「倍數」不是這件事該用的單位。** 分母是「同步執行一行程式碼」，分子是「等一個我自己設的 `setTimeout`」。如果我把伺服器改成 3 秒，倍數就變五倍大，但使用者的感受不會跟著變五倍好。

**c. 瀏覽器裡也不會是 0.05 毫秒。**

這一點 Node 量不到，我要老實說：真實的 React 樂觀更新要跑一次 render、commit，然後等瀏覽器 paint，實際大約是 **1 到 16 毫秒（一格畫面）**。那仍然遠在 100ms 以內，所以下面的結論不變——**但該記住的數字是「一格畫面」，不是「0」。**

### 那 602ms 為什麼有感，一格畫面為什麼無感

這件事有一個很老但很穩的參考點，Jakob Nielsen 在 1993 年整理的三個反應時間界線（他引用的是 Miller 1968 與 Card 等人 1991 的研究）：

| 時間 | 使用者的感受 | 該做什麼 |
|---|---|---|
| **0.1 秒（100ms）以內** | 覺得系統「即時反應」 | 不需要任何 loading 提示 |
| **1 秒以內** | 思緒不中斷，但已經感覺到在等 | 不需要特別回饋，但直接操控感消失了 |
| **10 秒以內** | 注意力還在這個任務上 | 需要顯示進度與預估完成時間 |

所以正確的說法是：

> 樂觀更新做的事情是把反應時間從第二個區間（602ms）搬到第一個區間（在 Node 裡是 0.05ms，在瀏覽器裡是一格畫面），**跨過 100ms 那條線**，不是「把時間除以十」。

這個說法可以檢查，也比較誠實。如果你的 API 本來就只花 40ms，那它已經在第一個區間裡，你加上樂觀更新使用者感受不到差別——但你會多出一整套回滾邏輯要維護。**這是第一個「什麼時候不該用」的判準。**

---

## 三、回滾要備份什麼：那個 previous 到底是誰

樂觀更新的代價是：畫面可能在說謊。所以失敗時必須還原。

先看沒備份的版本錯在哪：

```js
let cache = { ...手冊初始值 }

cache = { ...cache, status: 'published' }   // 樂觀更新
screen.render(cache)

try {
  const result = await server.patch({ status: 'published' }, { fail: true })
  cache = result
} catch (error) {
  // 想回滾，但舊值早就被上面那行蓋掉了
}
```

實測輸出：

```
【沒備份】
  [畫面    0ms] status=published title=場地規範   ← 樂觀值
  [伺服器  601ms] 請求 #1 發布 失敗（500）
  [程式  601ms] 想回滾，但手上沒有舊值，只能什麼都不做

【有備份】
  [畫面    0ms] status=published title=場地規範   ← 樂觀值
  [伺服器  601ms] 請求 #1 發布 失敗（500）
  [畫面  601ms] status=draft title=場地規範   ← 回滾

  沒備份：畫面最後顯示 status=published，資料庫是 status=draft
  有備份：畫面最後顯示 status=draft，資料庫是 status=draft
```

沒備份的那個版本留下的畫面是：**使用者以為自己發布成功了，而資料庫從頭到尾都是草稿**。而且它不會自己修好，要等下一次重新整理或 refetch 才會被糾正。

那個備份在 TanStack Query 裡就是 `context.previous`：

```js
useMutation({
  mutationFn: (data) => api.patch(`/handbooks/${id}`, data),

  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['handbook', id] })

    const previous = queryClient.getQueryData(['handbook', id])   // ← 備份
    queryClient.setQueryData(['handbook', id], (old) => ({ ...old, ...newData }))

    return { previous }        // 丟給 onError 用
  },

  onError: (err, newData, context) => {
    queryClient.setQueryData(['handbook', id], context.previous)  // ← 回滾
  },
})
```

這裡有一個容易誤會的點，值得單獨講：**`previous` 備份的是「前端快取」，不是資料庫**。前端快取 = 上一次 GET 回來的那份快照。它跟資料庫大部分時候一樣，但不保證一樣：

```
10:00  你載入頁面 → GET /handbook/1 → 快取 = { title: "春季展" }
10:01  同事改了名稱  → 資料庫變成      { title: "夏季展" }
10:02  你的快取還是                    { title: "春季展" }   ← 已經不同步了
```

所以樂觀更新的回滾防的是**「我自己這次操作失敗」**，不是防別人改資料。這兩件事常常被混在一起。

`onMutate` 裡那一行 `cancelQueries` 也是同一個道理：如果剛好有一個 refetch 正在路上，它回來的時候會用伺服器的舊值蓋掉你的樂觀值，畫面會閃回去。先把它取消掉。

---

## 四、回滾最容易出錯的那一步

到這裡為止都是教科書內容，網路上很多文章寫到「記得備份」就結束了。我原本也以為「忘記備份」就是最容易出錯的那一步。

實測之後發現不是。**最容易出錯的那一步，是在你已經正確備份、正確回滾的情況下發生的。**

### 劇本

使用者手速很快：

- **A**：按下「發布」。伺服器慢，600ms 後才回，而且會失敗
- **B**：30ms 後又改了標題。伺服器快，150ms 就回，而且成功

兩個 mutation 都照教科書寫：`onMutate` 備份整份快取，`onError` 寫回整份快取，`onSuccess` 用伺服器回應校正快取。單獨跑任何一個都完全正確。

### 實測輸出

```
  [A    0ms] onMutate 備份 status=draft title=場地規範
  [畫面    0ms] status=published title=場地規範       ← A 的樂觀值
  [伺服器    0ms] 收到請求 #1 A 發布 {"status":"published"}
  [B   30ms] onMutate 備份 status=published title=場地規範
  [畫面   30ms] status=published title=場地規範 v2    ← B 的樂觀值
  [伺服器   30ms] 收到請求 #2 B 改標題 {"title":"場地規範 v2"}
  [伺服器  181ms] 請求 #2 B 改標題 成功，db 變成 status=draft title=場地規範 v2
  [畫面  181ms] status=draft title=場地規範 v2        ← B 成功，用伺服器回應校正
  [伺服器  601ms] 請求 #1 A 發布 失敗（500）
  [畫面  601ms] status=draft title=場地規範           ← A 失敗，寫回 A 的快照

  畫面最後顯示：status=draft title=場地規範
  資料庫真相：  status=draft title=場地規範 v2
  兩者一致嗎：不一致
```

### 逐步拆解發生了什麼

a. A 的 `onMutate` 備份了「發布之前」的整份資料 → `{ draft, 場地規範 }`

b. B 的 `onMutate` 備份了「B 開始時」的整份資料 → `{ published, 場地規範 }`，**裡面含有 A 還沒確定的樂觀值**

c. 181ms 時 B 成功，用伺服器回應蓋掉整份快取 → 伺服器那邊 A 還沒寫進去，所以 status 是 draft → **A 的樂觀值被抹掉，畫面閃回「草稿」**

d. 601ms 時 A 失敗，把 A 的快照寫回去 → **連 B 已經成功寫進資料庫的新標題一起被還原掉**

最後畫面顯示「草稿、場地規範」，而資料庫是「草稿、場地規範 v2」。B 明明成功了，但使用者看不到自己的修改。而且**這個狀態不會自己修好**，要等下一次 refetch。

### 那一步是哪一步

> 回滾寫回的是「那個 mutation 開始時的整個世界」，不是「那個 mutation 改的那一個欄位」。

`queryClient.setQueryData(key, context.previous)` 這一行看起來只是「還原」，實際上它是一次**整份覆寫**。在單一 mutation 的世界裡兩者等價，所以永遠測不出來。一旦有第二個 mutation 同時在飛，「還原我的」就變成「連你的一起還原」。

同樣的道理也適用在 c 那一步的 `onSuccess`：用伺服器回應去蓋整份快取，也是整份覆寫，也會抹掉別人還在飛的樂觀值。

這就是為什麼這個 bug 在本機幾乎測不到——你要快到 30ms 內做兩個操作，而且兩個請求的延遲要一快一慢。Day 20 講競態條件時我寫過一句話，這裡完全適用：**它是在你的電腦上永遠不會發生的 bug。**

---

## 五、兩種修法，各有代價

### 修法一：欄位級回滾，只還原自己動過的 key

```js
function 樂觀補丁(patch) {
  const backup = {}
  for (const key of Object.keys(patch)) backup[key] = cache[key]
  cache = { ...cache, ...patch }
  return {
    rollback() {
      cache = { ...cache, ...backup }   // 只還原自己那幾個 key
    },
  }
}
```

實測輸出：

```
  [畫面    1ms] status=published title=場地規範       ← A 的樂觀值
  [畫面   31ms] status=published title=場地規範 v2    ← B 的樂觀值
  [畫面  182ms] status=published title=場地規範 v2    ← B 成功，不覆蓋其他欄位
  [畫面  602ms] status=draft title=場地規範 v2        ← A 失敗，只還原 status

  畫面：status=draft title=場地規範 v2
  資料庫：status=draft title=場地規範 v2
  一致嗎：一致
```

注意 182ms 那一行：畫面**沒有閃回草稿**。因為 B 成功時不再用整份伺服器回應去蓋快取。

代價：**伺服器自己算出來的欄位就拿不到了**。像 `updatedAt`、`version`、伺服器產生的 id，這些你猜不到的值都會留在舊狀態。

### 修法二：回滾只是過渡畫面，最後一律問伺服器

這是 TanStack Query 官方文件的做法：在 `onSettled` 裡 `invalidateQueries`。我在 demo 裡加了一個「等全部 mutation 落地才 refetch」的計數器：

```
  [畫面  181ms] status=draft title=場地規範 v2        ← B 成功
  [收尾  181ms] 還有 1 個 mutation 在飛，先不 refetch
  [畫面  601ms] status=draft title=場地規範           ← A 失敗，回滾（只是過渡畫面）
  [收尾  601ms] 全部落地，向伺服器重新拿一次
  [畫面  701ms] status=draft title=場地規範 v2        ← refetch 的結果，這才是最終答案

  一致嗎：一致
```

代價：**多一次 GET，而且畫面會先閃一下錯誤的回滾值（601ms 那一行），再被 refetch 校正（701ms）**。它保證最終一致，但不保證中間畫面好看。

### 順便解掉我自己筆記裡的一個矛盾

我在 `frontend-docs/tanstack/onMutate-optimistic-update.md` 裡寫過「失敗寫法 3：`onSettled` 裡 invalidate 同一筆」，說它會觸發 refetch 拿到舊值把樂觀更新蓋掉。但官方文件明明就是叫你在 `onSettled` 裡 invalidate。

實測之後我確認兩邊都對，差在**時機的主詞**：

- `onSettled` 執行的時候，**這個** mutation 已經結束了，所以 invalidate 它自己是安全的
- 但如果**另一個** mutation 還在飛（或者伺服器是最終一致、寫完馬上讀還讀不到新值），那個 refetch 就會拿到不含樂觀值的資料，把畫面打回去

所以我筆記裡那條警告要加上條件：**「還有其他操作在進行中，或後端不是立即一致」的時候才成立**。我已經把這個條件補回那篇筆記。這也是為什麼我在 demo 的修法二裡要加那個「還有幾個在飛」的計數器。

---

## 六、React 19 的 useOptimistic：為什麼它沒有回滾 API

看完第四節，回頭看 React 19 的 `useOptimistic` 會有一種「原來如此」的感覺。它的簽名是：

```js
const [optimisticState, setOptimistic] = useOptimistic(value, reducer?)
```

沒有 `rollback`，沒有 `previous`，沒有 `onError`。官方文件對這件事的說明是：樂觀狀態只在 Action 進行中才會被 render，Action 結束之後 render 的就是真實的 `value`，而且**不需要多一次 render 去「清掉」樂觀狀態，樂觀值與真實值會在同一次 render 收斂**。

換句話說，它的模型不是「寫進快取，失敗再寫回來」，而是「**疊一層在真相上面，Action 結束那層就消失**」。我用 20 行把這個模型寫出來：

```js
function createOptimisticStore(initial) {
  let base = { ...initial }       // 伺服器真相
  const overlays = new Map()      // 還在飛的樂觀值
  let nextId = 1

  const view = () => {
    let result = { ...base }
    for (const patch of overlays.values()) result = { ...result, ...patch }
    return result
  }

  return {
    get value() { return view() },
    setBase(next) { base = { ...next } },
    addOverlay(patch) {
      const id = nextId++
      overlays.set(id, patch)
      return () => overlays.delete(id)   // 回傳「拿掉這一層」的函式
    },
  }
}
```

同樣的併發劇本，實測輸出：

```
  [畫面    0ms] status=published title=場地規範       ← 疊上 A 的樂觀層
  [畫面   30ms] status=published title=場地規範 v2    ← 疊上 B 的樂觀層
  [畫面  181ms] status=published title=場地規範 v2    ← 拿掉 B 的樂觀層
  [畫面  600ms] status=draft title=場地規範 v2        ← 拿掉 A 的樂觀層

  畫面最後顯示：status=draft title=場地規範 v2
  資料庫真相：  status=draft title=場地規範 v2
  一致嗎：一致
  剩下幾層樂觀值：0
```

看 181ms 那一行：B 成功了，`base` 被更新成 `{ draft, v2 }`，B 的樂觀層被拿掉——但 **A 的樂觀層還在上面疊著**，所以畫面仍然顯示 `published`。畫面沒有閃回草稿。這是第四節 c 那一步的問題被結構性地消掉了。

整段程式碼裡沒有出現 `previous`，也沒有出現 `rollback`。因為在這個模型裡，**回滾不是一個動作，而是「那一層自然消失」**。

代價也很明確：你必須有一個明確的「真相」來當底層。所以 `useOptimistic` 搭配的是 Server Actions 與 Transition——沒有那個會自己更新的 `value`，這個模型就撐不起來。

---

## 七、什麼時候不該用樂觀更新

a. **API 本來就快**（低於 100ms）。使用者感受不到差別，你只是多養一套回滾邏輯

b. **操作結果你猜不到**。伺服器會算金額、算庫存、給 id、給版本號——這些你沒辦法樂觀地填上去，硬填會出現「畫面上的數字和刷新後不一樣」

c. **失敗率高的操作**。樂觀更新是拿「多數成功」換體驗，如果十次有三次失敗，使用者看到的就是十次有三次畫面跳來跳去，比等 loading 更煩

d. **不可逆的操作**。付款、送出訂單、寄信。這些你不能假裝成功，因為「回滾」在現實世界裡不存在

e. **列表上的刪除**，要特別小心。刪掉之後回滾要把它插回**原本的位置**，不是 append 到最後。這是 b 的一個具體版本

一個實用的判準：**如果你正在為了樂觀更新而猜伺服器會回什麼，就停下來。** 猜得到的（布林值切換、文字欄位、加入收藏）適合；猜不到的不適合。

---

## 八、面試被問到的話，我會怎麼講

我自己整理的順序是這樣：

1. **概念**：樂觀更新是在使用者操作的當下先把畫面改成預期成功的樣子，請求在背景跑，失敗再還原
2. **為什麼**：不是為了讓 API 變快，是為了把畫面反應時間壓到 100ms 以內，跨過「即時感」那條線
3. **怎麼做**：取消進行中的 refetch、備份目前快取、立刻改快取，失敗時用備份還原，最後讓伺服器收尾
4. **難在哪**：回滾是整份覆寫，兩個操作同時在飛的時候會互相抹掉。所以要嘛把回滾縮小到欄位級，要嘛讓 refetch 當最終答案，要嘛用 `useOptimistic` 的疊加層模型
5. **什麼時候不該用**：API 本來就快、結果猜不到、失敗率高、不可逆

第 4 點是拉開差距的地方。會講 `onMutate` 三步驟的人很多，會講「為什麼併發時整份覆寫會出事」的人少。

---

## 完整程式碼

檔名 `day21-optimistic-update.js`，沒有任何依賴，`node day21-optimistic-update.js` 直接跑。我的環境是 Node.js v22.22.2。

```js
/**
 * day21-optimistic-update.js
 *
 * 樂觀更新（Optimistic Update）：先假裝成功，失敗再回滾
 * 搭配 iThome 鐵人賽 2026 Day 21
 *
 * 執行方式：node day21-optimistic-update.js
 * 環境：Node.js v18 以上（只用到 setTimeout 與 Promise，沒有任何依賴）
 *
 * 這支檔案要量測五件事
 *   Part 1  悲觀更新與樂觀更新，畫面變化的時間差到底是多少
 *   Part 2  失敗回滾：有備份與沒備份的差別
 *   Part 3  回滾最容易出錯的那一步（兩個 mutation 同時在飛）
 *   Part 4  兩種修法：欄位級回滾，以及讓伺服器當唯一真相
 *   Part 5  React 19 useOptimistic 的模型：疊加層（overlay），根本不需要備份
 */

'use strict'

// ============================================================
// Part 0：共用的假畫面與假伺服器
// ============================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let clockStart = Date.now()
/**
 * 另外開一個奈秒解析度的計時器
 * 為什麼需要兩個：Date.now() 的單位是整數毫秒，同一毫秒內完成的事情相減會得到 0。
 * 那個 0 不代表「無限快」，只代表「快到這把尺量不出來」。
 * process.hrtime.bigint() 的單位是奈秒，用它才看得到真正的數字。
 */
let clockStartPrecise = process.hrtime.bigint()
const resetClock = () => { clockStart = Date.now(); clockStartPrecise = process.hrtime.bigint() }
const elapsed = () => String(Date.now() - clockStart).padStart(4, ' ') + 'ms'
const elapsedPrecise = () => Number(process.hrtime.bigint() - clockStartPrecise) / 1e6

/**
 * 假的畫面
 * 它只做一件事：記錄「畫面上此刻顯示什麼」，以及是在第幾毫秒變成那樣
 * 真實的 React 會在這裡做 re-render，我們只要時間軸
 */
function createScreen(initial) {
  let shown = initial
  const history = []

  return {
    render(value, note = '') {
      shown = value
      history.push({ at: Date.now() - clockStart, atPrecise: elapsedPrecise(), value })
      console.log(`  [畫面 ${elapsed()}] ${describe(value)}${note ? '   ← ' + note : ''}`)
    },
    get shown() { return shown },
    get history() { return history },
    /** 第一次「畫面內容真的改變」是在第幾毫秒（Date.now，整數毫秒） */
    firstChangeAt() {
      const entry = 第一次改變的那筆(history, initial)
      return entry === null ? null : entry.at
    },
    /** 同一件事，但用奈秒解析度量（小數毫秒） */
    firstChangeAtPrecise() {
      const entry = 第一次改變的那筆(history, initial)
      return entry === null ? null : entry.atPrecise
    },
  }
}

/** 從 history 裡找出「畫面內容第一次真的跟初始值不同」的那一筆 */
function 第一次改變的那筆(history, initial) {
  for (const entry of history) {
    if (describe(entry.value) !== describe(initial)) return entry
  }
  return null
}

function describe(value) {
  if (value === null || value === undefined) return String(value)
  if (typeof value !== 'object') return String(value)
  return `status=${value.status} title=${value.title}`
}

/**
 * 假的伺服器
 * db 是唯一真相，latency 是網路來回加上處理時間
 */
function createServer(initial) {
  let db = { ...initial }
  let callCount = 0

  return {
    async patch(patch, { latency = 600, fail = false, label = '' } = {}) {
      callCount += 1
      const id = callCount
      console.log(`  [伺服器 ${elapsed()}] 收到請求 #${id} ${label} ${JSON.stringify(patch)}`)
      await sleep(latency)
      if (fail) {
        console.log(`  [伺服器 ${elapsed()}] 請求 #${id} ${label} 失敗（500）`)
        throw new Error('500 伺服器炸了')
      }
      db = { ...db, ...patch }
      console.log(`  [伺服器 ${elapsed()}] 請求 #${id} ${label} 成功，db 變成 ${describe(db)}`)
      return { ...db }
    },
    async get({ latency = 600 } = {}) {
      await sleep(latency)
      return { ...db }
    },
    get db() { return { ...db } },
    get callCount() { return callCount },
  }
}

const 手冊初始值 = { status: 'draft', title: '場地規範' }

function 分隔線(title) {
  console.log('\n' + '='.repeat(64))
  console.log(title)
  console.log('='.repeat(64))
}

// ============================================================
// Part 1：悲觀更新與樂觀更新的時間差
// ============================================================

/**
 * 悲觀更新：等伺服器回來才改畫面
 * 這是最直覺也最安全的寫法，畫面永遠等於伺服器
 */
async function 悲觀更新() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)

  console.log('  使用者在第 0ms 按下「發布」')
  const result = await server.patch({ status: 'published' }, { label: '發布' })
  screen.render(result)

  return screen
}

/**
 * 樂觀更新：先改畫面，再送請求，回來以後用伺服器的答案校正
 */
async function 樂觀更新() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)

  console.log('  使用者在第 0ms 按下「發布」')

  // 這一行就是「樂觀」：還沒有任何人答應你，你就先畫上去
  screen.render({ ...手冊初始值, status: 'published' }, '樂觀值，伺服器還沒回')

  const result = await server.patch({ status: 'published' }, { label: '發布' })
  screen.render(result, '伺服器回來了，用真實資料校正')

  return screen
}

async function part1() {
  分隔線('Part 1：悲觀更新與樂觀更新，畫面差幾毫秒')

  console.log('\n【悲觀更新】')
  const 悲觀 = await 悲觀更新()

  console.log('\n【樂觀更新】')
  const 樂觀 = await 樂觀更新()

  const a = 悲觀.firstChangeAt()
  const b = 樂觀.firstChangeAt()
  const a精確 = 悲觀.firstChangeAtPrecise()
  const b精確 = 樂觀.firstChangeAtPrecise()

  console.log('\n  ----- 量測結果（用 Date.now，整數毫秒）-----')
  console.log(`  悲觀更新：按下按鈕後 ${a}ms 畫面才有反應`)
  console.log(`  樂觀更新：按下按鈕後 ${b}ms 畫面就有反應`)
  console.log(`  差距：${a - b}ms`)

  console.log('\n  ----- 同一件事，用 hrtime（奈秒解析度）再量一次 -----')
  console.log(`  悲觀更新：${a精確.toFixed(4)}ms`)
  console.log(`  樂觀更新：${b精確.toFixed(4)}ms`)
  console.log(`  倍數：${(a精確 / b精確).toFixed(0)} 倍`)
  console.log('')
  console.log('  **這兩把尺是同一件事，但上面那個 0 是假象。**')
  console.log('  Date.now() 的單位是整數毫秒，而樂觀更新那一行 render 跟「按下按鈕」')
  console.log('  在同一個 tick 裡同步執行，中間沒有任何 await，所以相減就是 0。')
  console.log('  真實值是零點零幾毫秒 —— 不是「無限快」，是「快到這把尺量不出來」。')
  console.log('')
  console.log('  而下面那個倍數大到荒謬，它剛好證明了「倍數」不是這件事該用的單位：')
  console.log('  分母是「同步執行一行程式碼」，分子是「等一個我自己設的 setTimeout」。')
  console.log('  伺服器改成 3 秒，倍數就變五倍大，但使用者的感受不會跟著變五倍好。')

  console.log('\n  ----- 該用的尺：Nielsen 的三個反應時間界線（1993）-----')
  console.log('    0.1 秒以內  → 使用者覺得「系統即時反應」，不需要任何 loading 提示')
  console.log('    1 秒以內    → 思緒不中斷，但已經感覺到在等')
  console.log('    10 秒以內   → 注意力還在這個任務上，超過就會跑去做別的事')
  console.log('')
  console.log(`  所以重點不是「快幾倍」，而是 ${a}ms 落在第二區間、${b精確.toFixed(4)}ms 落在第一區間`)
  console.log('  樂觀更新做的事情是「跨過 100ms 那條線」，不是「把時間除以十」')
  console.log('')
  console.log('  最後一個誠實的補充：**瀏覽器裡不會是零點零幾毫秒。**')
  console.log('  真實的 React 要跑一次 render、commit，然後等瀏覽器 paint，')
  console.log('  實際大約是 1 到 16 毫秒（一格畫面）。那仍然遠在 100ms 以內，')
  console.log('  所以結論不變 —— 但該記住的數字是「一格畫面」，不是「0」。')
}

// ============================================================
// Part 2：失敗回滾，有備份與沒備份
// ============================================================

async function 沒備份就樂觀更新() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)
  let cache = { ...手冊初始值 }

  console.log('  使用者按下「發布」，但這次伺服器會失敗')
  cache = { ...cache, status: 'published' }
  screen.render(cache, '樂觀值')

  try {
    const result = await server.patch({ status: 'published' }, { label: '發布', fail: true })
    cache = result
    screen.render(cache)
  } catch (error) {
    // 想回滾，但舊值早就被上面那行 cache = { ...cache, status: 'published' } 蓋掉了
    console.log(`  [程式 ${elapsed()}] 想回滾，但手上沒有舊值，只能什麼都不做`)
    console.log(`  [程式 ${elapsed()}] 錯誤訊息：${error.message}`)
  }

  return { screen, cache, db: server.db }
}

async function 有備份的樂觀更新() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)
  let cache = { ...手冊初始值 }

  console.log('  使用者按下「發布」，這次伺服器同樣會失敗，但我們先備份')

  const previous = cache               // ← 這一行就是 TanStack Query 的 context.previous
  cache = { ...cache, status: 'published' }
  screen.render(cache, '樂觀值')

  try {
    const result = await server.patch({ status: 'published' }, { label: '發布', fail: true })
    cache = result
    screen.render(cache)
  } catch (error) {
    cache = previous
    screen.render(cache, '回滾')
  }

  return { screen, cache, db: server.db }
}

async function part2() {
  分隔線('Part 2：伺服器失敗的時候，備份差在哪')

  console.log('\n【沒備份】')
  const 沒備份 = await 沒備份就樂觀更新()

  console.log('\n【有備份】')
  const 有備份 = await 有備份的樂觀更新()

  console.log('\n  ----- 量測結果 -----')
  console.log(`  沒備份：畫面最後顯示 ${describe(沒備份.cache)}，資料庫是 ${describe(沒備份.db)}`)
  console.log(`  有備份：畫面最後顯示 ${describe(有備份.cache)}，資料庫是 ${describe(有備份.db)}`)
  console.log('')
  console.log('  沒備份的那個版本，使用者會以為自己發布成功了，其實資料庫從頭到尾都是草稿')
  console.log('  而且它不會自己修好，要等下一次重新整理或 refetch')
}

// ============================================================
// Part 3：回滾最容易出錯的那一步
// ============================================================

/**
 * 兩個操作幾乎同時發生
 *   A：按「發布」，伺服器慢（600ms）而且會失敗
 *   B：改標題，伺服器快（150ms）而且會成功
 *
 * 兩邊都照教科書寫：onMutate 備份整份快取，onError 寫回整份快取
 * 這是正確的單一 mutation 寫法，但併發的時候會出事
 */
async function 併發的整份快照回滾() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)
  let cache = { ...手冊初始值 }

  // --- mutation A：發布 ---
  const A = (async () => {
    const previousA = cache                       // 快照：此刻的「全世界」
    console.log(`  [A ${elapsed()}] onMutate 備份 ${describe(previousA)}`)
    cache = { ...cache, status: 'published' }
    screen.render(cache, 'A 的樂觀值')
    try {
      const result = await server.patch({ status: 'published' }, { latency: 600, fail: true, label: 'A 發布' })
      cache = result
      screen.render(cache, 'A 成功')
    } catch (error) {
      cache = previousA                           // ← 問題就在這一行
      screen.render(cache, 'A 失敗，寫回 A 的快照')
    }
  })()

  await sleep(30)                                 // 使用者手速：30ms 後改了標題

  // --- mutation B：改標題 ---
  const B = (async () => {
    const previousB = cache                       // 快照：此刻的「全世界」，已經含有 A 的樂觀值
    console.log(`  [B ${elapsed()}] onMutate 備份 ${describe(previousB)}`)
    cache = { ...cache, title: '場地規範 v2' }
    screen.render(cache, 'B 的樂觀值')
    try {
      const result = await server.patch({ title: '場地規範 v2' }, { latency: 150, label: 'B 改標題' })
      cache = result
      screen.render(cache, 'B 成功，用伺服器回應校正')
    } catch (error) {
      cache = previousB
      screen.render(cache, 'B 失敗，寫回 B 的快照')
    }
  })()

  await Promise.all([A, B])
  return { screen, cache, db: server.db }
}

async function part3() {
  分隔線('Part 3：回滾最容易出錯的那一步')

  console.log('  劇本：使用者按「發布」，30ms 後又改了標題')
  console.log('        「發布」會失敗（600ms 後才知道），「改標題」會成功（150ms）\n')

  const 結果 = await 併發的整份快照回滾()

  console.log('\n  ----- 量測結果 -----')
  console.log(`  畫面最後顯示：${describe(結果.cache)}`)
  console.log(`  資料庫真相：  ${describe(結果.db)}`)
  console.log('')
  const 一致 = describe(結果.cache) === describe(結果.db)
  console.log(`  兩者一致嗎：${一致 ? '一致' : '不一致'}`)
  console.log('')
  console.log('  發生了什麼：')
  console.log('    1. A 的 onMutate 備份了「發布之前」的整份資料 → { draft, 場地規範 }')
  console.log('    2. B 的 onMutate 備份了「B 開始時」的整份資料 → 裡面含有 A 的樂觀值')
  console.log('    3. B 成功，用伺服器回應蓋掉快取 → A 的樂觀值 published 被抹掉，畫面閃回草稿')
  console.log('    4. A 失敗，把 A 的快照寫回去 → 連 B 已經寫進資料庫的新標題一起抹掉')
  console.log('')
  console.log('  結論：回滾寫回的是「那個 mutation 開始時的整個世界」')
  console.log('        不是「那個 mutation 改的那一個欄位」')
  console.log('        單一操作看不出差別，併發就會把別人的成功結果一起還原掉')
}

// ============================================================
// Part 4：兩種修法
// ============================================================

/**
 * 修法一：欄位級回滾
 * 回滾的時候只還原自己動過的那幾個 key，其他欄位維持現狀
 */
async function 欄位級回滾() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)
  let cache = { ...手冊初始值 }

  /** 只挑出自己改過的 key 做備份，回滾時也只寫回那幾個 key */
  function 樂觀補丁(patch) {
    const backup = {}
    for (const key of Object.keys(patch)) backup[key] = cache[key]
    cache = { ...cache, ...patch }
    return {
      rollback() {
        cache = { ...cache, ...backup }           // 只還原自己那幾個 key
      },
    }
  }

  const A = (async () => {
    const 補丁 = 樂觀補丁({ status: 'published' })
    screen.render(cache, 'A 的樂觀值')
    try {
      await server.patch({ status: 'published' }, { latency: 600, fail: true, label: 'A 發布' })
    } catch (error) {
      補丁.rollback()
      screen.render(cache, 'A 失敗，只還原 status')
    }
  })()

  await sleep(30)

  const B = (async () => {
    const 補丁 = 樂觀補丁({ title: '場地規範 v2' })
    screen.render(cache, 'B 的樂觀值')
    try {
      await server.patch({ title: '場地規範 v2' }, { latency: 150, label: 'B 改標題' })
      // 注意：成功的時候故意不用整份伺服器回應去蓋快取
      screen.render(cache, 'B 成功，不覆蓋其他欄位')
    } catch (error) {
      補丁.rollback()
      screen.render(cache, 'B 失敗，只還原 title')
    }
  })()

  await Promise.all([A, B])
  return { screen, cache, db: server.db }
}

/**
 * 修法二：讓伺服器當唯一真相
 * 回滾只是過渡畫面，最後一律重新去問伺服器（對應 onSettled 的 invalidateQueries）
 */
async function 讓伺服器收尾() {
  resetClock()
  const server = createServer(手冊初始值)
  const screen = createScreen(手冊初始值)
  let cache = { ...手冊初始值 }
  let 飛在空中的數量 = 0

  async function 收尾() {
    飛在空中的數量 -= 1
    if (飛在空中的數量 > 0) {
      console.log(`  [收尾 ${elapsed()}] 還有 ${飛在空中的數量} 個 mutation 在飛，先不 refetch`)
      return
    }
    console.log(`  [收尾 ${elapsed()}] 全部落地，向伺服器重新拿一次`)
    const fresh = await server.get({ latency: 100 })
    cache = fresh
    screen.render(cache, 'refetch 的結果，這才是最終答案')
  }

  const A = (async () => {
    飛在空中的數量 += 1
    const previousA = cache
    cache = { ...cache, status: 'published' }
    screen.render(cache, 'A 的樂觀值')
    try {
      await server.patch({ status: 'published' }, { latency: 600, fail: true, label: 'A 發布' })
    } catch (error) {
      cache = previousA
      screen.render(cache, 'A 失敗，回滾（只是過渡畫面）')
    } finally {
      await 收尾()
    }
  })()

  await sleep(30)

  const B = (async () => {
    飛在空中的數量 += 1
    const previousB = cache
    cache = { ...cache, title: '場地規範 v2' }
    screen.render(cache, 'B 的樂觀值')
    try {
      const result = await server.patch({ title: '場地規範 v2' }, { latency: 150, label: 'B 改標題' })
      cache = result
      screen.render(cache, 'B 成功')
    } catch (error) {
      cache = previousB
      screen.render(cache, 'B 失敗，回滾')
    } finally {
      await 收尾()
    }
  })()

  await Promise.all([A, B])
  return { screen, cache, db: server.db }
}

async function part4() {
  分隔線('Part 4：兩種修法')

  console.log('\n【修法一：欄位級回滾，只還原自己動過的 key】')
  const 修法一 = await 欄位級回滾()
  console.log(`\n  畫面：${describe(修法一.cache)}`)
  console.log(`  資料庫：${describe(修法一.db)}`)
  console.log(`  一致嗎：${describe(修法一.cache) === describe(修法一.db) ? '一致' : '不一致'}`)
  console.log('  代價：成功的時候不能直接用整份伺服器回應蓋快取，伺服器自己算出來的欄位就拿不到')

  console.log('\n【修法二：回滾只是過渡，最後一律問伺服器】')
  const 修法二 = await 讓伺服器收尾()
  console.log(`\n  畫面：${describe(修法二.cache)}`)
  console.log(`  資料庫：${describe(修法二.db)}`)
  console.log(`  一致嗎：${describe(修法二.cache) === describe(修法二.db) ? '一致' : '不一致'}`)
  console.log('  代價：多一次 GET 請求，而且要等它回來（畫面會先閃一下回滾值，再被 refetch 校正）')
}

// ============================================================
// Part 5：疊加層模型，也就是 React 19 useOptimistic 的做法
// ============================================================

/**
 * 20 行的樂觀更新引擎
 *
 * 核心差別：樂觀值不是「寫進快取」，而是「疊在真相上面的一層」
 * 因為它只是一層，回滾就只是把那一層拿掉 —— 不需要備份，也不可能抹掉別人的值
 */
function createOptimisticStore(initial) {
  let base = { ...initial }                 // 伺服器真相
  const overlays = new Map()                // 還在飛的樂觀值，key 是 mutation id
  let nextId = 1

  const view = () => {
    let result = { ...base }
    for (const patch of overlays.values()) result = { ...result, ...patch }
    return result
  }

  return {
    get value() { return view() },
    setBase(next) { base = { ...next } },
    /** 疊一層樂觀值，回傳一個「拿掉這一層」的函式 */
    addOverlay(patch) {
      const id = nextId++
      overlays.set(id, patch)
      return () => overlays.delete(id)
    },
    get overlayCount() { return overlays.size },
  }
}

async function part5() {
  分隔線('Part 5：疊加層模型（React 19 useOptimistic 的做法）')

  resetClock()
  const server = createServer(手冊初始值)
  const store = createOptimisticStore(手冊初始值)
  const screen = createScreen(手冊初始值)

  const show = (note) => screen.render(store.value, note)

  const A = (async () => {
    const remove = store.addOverlay({ status: 'published' })
    show('疊上 A 的樂觀層')
    try {
      const result = await server.patch({ status: 'published' }, { latency: 600, fail: true, label: 'A 發布' })
      store.setBase(result)
    } catch (error) {
      // 沒有備份，沒有 previous，只是把自己那一層拿掉
    } finally {
      remove()
      show('拿掉 A 的樂觀層')
    }
  })()

  await sleep(30)

  const B = (async () => {
    const remove = store.addOverlay({ title: '場地規範 v2' })
    show('疊上 B 的樂觀層')
    try {
      const result = await server.patch({ title: '場地規範 v2' }, { latency: 150, label: 'B 改標題' })
      store.setBase(result)                     // 更新的是 base，不是整份快取
    } catch (error) {
      // 同樣不需要備份
    } finally {
      remove()
      show('拿掉 B 的樂觀層')
    }
  })()

  await Promise.all([A, B])

  console.log('\n  ----- 量測結果 -----')
  console.log(`  畫面最後顯示：${describe(store.value)}`)
  console.log(`  資料庫真相：  ${describe(server.db)}`)
  console.log(`  一致嗎：${describe(store.value) === describe(server.db) ? '一致' : '不一致'}`)
  console.log(`  剩下幾層樂觀值：${store.overlayCount}`)
  console.log('')
  console.log('  整段程式碼裡沒有出現 previous，沒有出現 rollback')
  console.log('  因為回滾在這個模型裡不是一個動作，而是「那一層自然消失」')
  console.log('  這也是 React 19 的 useOptimistic 為什麼沒有提供回滾 API')
}

// ============================================================
// main
// ============================================================

async function main() {
  console.log('day21-optimistic-update.js｜樂觀更新與回滾')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)

  await part1()
  await part2()
  await part3()
  await part4()
  await part5()

  分隔線('五句話總結')
  console.log('  1. 樂觀更新的價值不是「快十倍」，是把反應時間壓到 Nielsen 的 100ms 以內')
  console.log('  2. 沒備份的樂觀更新，失敗時會留下一個騙人的畫面，而且不會自己修好')
  console.log('  3. 最容易出錯的那一步是「回滾寫回整份快照」，因為快照是整個世界不是你那個欄位')
  console.log('  4. 併發的時候，正確答案是讓伺服器收尾，或者把回滾縮小到欄位級')
  console.log('  5. 疊加層模型從結構上避開這個問題，代價是要有一個明確的「真相」來當底層')
}

main().catch((error) => {
  console.error('執行失敗：', error)
  process.exit(1)
})
```

---

## 出處與可信度分級

**一、官方文件與可查證的一手來源**

| 內容 | 出處 |
|---|---|
| 三個反應時間界線（0.1 秒／1 秒／10 秒）、「0.1 秒以內不需要特別回饋」 | Jakob Nielsen, *Response Times: The 3 Important Limits*, Nielsen Norman Group，1993-01-01（文中引用 Miller 1968 與 Card et al. 1991）：https://www.nngroup.com/articles/response-times-3-important-limits/ |
| `onMutate` 備份、`cancelQueries`、`onError` 用 context 回滾、`onSettled` 做 `invalidateQueries`、以及「同時可能有多個 mutation 在跑」 | TanStack Query 官方文件 Optimistic Updates：https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates |
| `useOptimistic(value, reducer?)` 的簽名、「不需要多一次 render 去清掉樂觀狀態，樂觀值與真實值在同一次 render 收斂」、「樂觀狀態是暫時的」 | React 官方文件 useOptimistic：https://react.dev/reference/react/useOptimistic |
| 展開運算子建立新物件的語意（回滾程式碼全部靠它） | MDN Spread syntax：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax |

**二、我實際跑出來的部分**

Part 1 到 Part 5 的所有輸出、時間戳、以及「畫面與資料庫不一致」那個結論，全部由 `day21-optimistic-update.js` 實測產生（Node.js v22.22.2），可以重跑驗證。時間戳會有 1 到 2ms 的浮動，因為 `setTimeout` 不保證精準。

**Part 5 的 `createOptimisticStore` 是我寫的極簡模型，不是 React 的原始碼。** 它只示範「樂觀值是疊加層」這一個設計概念，真實的 `useOptimistic` 還牽涉 Transition、Fiber 的 render 排程等等，複雜得多。

**三、我自己的整理與判斷（沒有外部出處）**

- 把「快十倍」修正成「跨過 100ms 那條線」這個結論。Nielsen 的界線是可查證的，但「所以倍數這個單位不成立」是我的推論
- 第二節「那個 `0ms` 是量測精度的假象」這個診斷，以及「10895 倍剛好證明倍數是錯的單位」這個論證方式
- 第四節那個併發劇本（600ms 失敗的 A ＋ 150ms 成功的 B ＋ 30ms 手速）是我設計出來讓現象穩定重現的，**不是統計上最常見的情況**
- 「回滾寫回的是整個世界，不是你那個欄位」這句總結
- 第五節「修法一的代價是伺服器算出來的欄位拿不到」這個取捨判斷
- 第七節五種不該用的情況，以及「如果你正在猜伺服器會回什麼就停下來」這個判準
- 第八節的面試回答順序

**四、我修正自己筆記的部分**

我原本在自己的 `tanstack/onMutate-optimistic-update.md` 裡把「`onSettled` invalidate 同一筆」列為失敗寫法，跟官方文件衝突。第五節最後那段是實測之後的修正：那條警告只在「還有其他 mutation 在飛」或「後端不是立即一致」時成立。原本寫得太絕對。

**五、幾個一定要講清楚的量測限制（2026-09-28 補）**

這篇剛發的時候，第二節只有 `602ms` 對 `0ms` 兩個數字。有人問我「為什麼是 0」——問得對，那個 0 需要解釋，所以我補了第二節的 a、b、c 三小段，並且在 demo 裡多加了一把奈秒解析度的尺。要講清楚的有四件事：

- a. **`602ms` 是我自己寫死的，不是量到的網路延遲。** 假伺服器就是 `sleep(600)`，那個 2 是 `setTimeout` 的排程誤差。**所以這篇所有的毫秒數都不能當成「真實 API 有多慢」的參考**，它們只是為了讓現象落在 Nielsen 的不同區間
- b. **`0ms` 是 `Date.now()` 的整數毫秒解析度造成的假象。** 真實值用 `process.hrtime.bigint()` 量是 **0.0553ms**（同一支程式在另一台機器是 `0.0963ms`，所以這是數量級而不是定值）。它不是「無限快」，是「快到那把尺量不出來」
- c. **新加的那個「10895 倍」不是在證明樂觀更新很棒，是在證明倍數這個單位不該用。** 分母是同步執行一行程式碼，分子是我自己設的 `setTimeout`——伺服器設成 3 秒，倍數就變五倍大，使用者感受不會變五倍好
- d. **瀏覽器裡的樂觀更新不會是 0.05 毫秒，這一點我在 Node 裡量不到。** 真實的 React 要跑 render、commit、再等 paint，大約是 1 到 16 毫秒（一格畫面）。結論不變，但**該記住的數字是「一格畫面」，不是「0」**。我沒有在瀏覽器裡實測這個數字，它是從「一格畫面 16.7 毫秒」推出來的區間

（查閱日期：2026-09-22。程式碼實測於 Node.js v22.22.2。第二節的 a、b、c 三小段與本節第五點於 2026-09-28 補上，hrtime 的數字在同一天重新量測）

---

## 相關筆記與關聯原因

- **Day 20｜API 呼叫永遠在賽跑**：今天的併發 bug 是 Day 20 競態條件的變形。Day 20 的競態發生在「兩個 GET 誰後到」，今天的發生在「兩個 mutation 的回滾誰後寫」。同一個成因，不同的受害者
- **`frontend-docs/tanstack/onMutate-optimistic-update.md`**：那篇列了四種失敗寫法，今天第四節講的是**第五種**，而且是四種都避開之後才會遇到的那一種
- **`frontend-docs/tanstack/context.previous.md`**：第三節「備份的是前端快取不是資料庫」直接來自那篇
- **`frontend-docs/react/useRef與Vue的ref-value-可變值不觸發渲染的兩種設計.md`**：`useOptimistic` 的疊加層要能反映在畫面上，前提是它會觸發 render。這跟 `useRef.current` 改了不觸發 render 正好是一組對照
- **明天的 Day 22**：今天每一次樂觀更新與回滾寫的都是 `{ ...cache, ...patch }`，從來沒有直接改過原物件。那不是風格，是 React 的判斷機制決定的

---

## 明天預告

Day 22 講**React 為什麼一定要你給一個新物件**：從 getter 與 Proxy 的角度看 React 和 Vue 在同一個岔路口做了不同的選擇，以及為什麼今天那些 `{ ...cache, ...patch }` 一個都不能省。
