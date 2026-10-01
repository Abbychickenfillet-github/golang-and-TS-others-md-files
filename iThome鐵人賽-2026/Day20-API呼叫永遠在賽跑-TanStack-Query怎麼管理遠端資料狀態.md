# Day 20：API 呼叫永遠在賽跑 — React Query／TanStack Query 怎麼管理遠端資料狀態

## 你的三個提問

1. 什麼叫「API 呼叫永遠在賽跑」？我怎麼從來沒遇到過？
2. 為什麼說「遠端資料狀態 ≠ 應用狀態」？不都是 state 嗎？
3. React Query 到底幫我省掉了什麼，值得多裝一個套件嗎？

---

## 一、先看「賽跑」長什麼樣

Day 19 講了 `useEffect` 的依賴陣列怎麼把人搞進無限循環。今天講另一個更陰險的坑——**它不會讓你的程式壞掉，只會讓畫面顯示錯的資料。**

### 情境：一個搜尋框

使用者在搜尋框打字，每打一個字就發一次 API 請求。使用者輸入 `react`，所以依序發出五個請求：

```
r → re → rea → reac → react
```

**問題來了：回應抵達的順序，不保證跟發出的順序一樣。**

而且有一個很常見的現實因素會讓它更糟：**搜尋字串越短，符合的結果越多，伺服器處理越慢**。

| 發出的請求 | 回應時間 |
|---|---|
| `r` | 500 ms |
| `re` | 400 ms |
| `rea` | 300 ms |
| `reac` | 200 ms |
| `react` | 100 ms |

**先發出的反而最慢回來。**

### 實測：誰回來就用誰

```js
// 這是最常見的寫法：useEffect 裡 fetch 完直接 setState
const res = await fakeApi(q);
screen = res.result;          // 誰後回來誰覆蓋
```

實際跑出來：

```
100 ms 後「react」回來了 → 畫面變成：「react」的搜尋結果
200 ms 後「reac」回來了  → 畫面變成：「reac」的搜尋結果
300 ms 後「rea」回來了   → 畫面變成：「rea」的搜尋結果
400 ms 後「re」回來了    → 畫面變成：「re」的搜尋結果
500 ms 後「r」回來了     → 畫面變成：「r」的搜尋結果

最終畫面：「r」的搜尋結果
```

**使用者明明打完了 `react`，畫面卻停在 `r` 的結果。**

而且使用者看到的不是錯誤訊息、不是空白，是**一個看起來完全正常但內容是錯的畫面**——這種 bug 使用者通常不會回報，他只會覺得「這個搜尋很爛」。

### 為什麼你從來沒遇到過

```
本機開發時：
  API 在 localhost，每個請求 5～20 ms 回來，
  延遲差異極小 → 幾乎總是「先發先回」，看起來完全正常。

上線之後：
  行動網路、跨國連線、伺服器負載不均，
  延遲從 50 ms 跳到 800 ms，順序開始錯亂。
```

**競態條件（race condition）被稱為「在你的電腦上永遠不會發生的 bug」**，就是這個意思。要在本機重現，得自己在 API 裡加隨機延遲。

---

## 二、手寫解法要付多少代價

### 只解決競態這一件事

```js
let latestRequestId = 0;

async function search(q) {
  const myId = ++latestRequestId;      // 每次發請求就拿一個號碼牌
  const res = await fakeApi(q);

  // 回來之後先確認「我還是最新的那個嗎」，不是就直接丟掉
  if (myId !== latestRequestId) return;

  setData(res);
}
```

白話講這段：用一個一直遞增的號碼 `latestRequestId` 當「目前最新是第幾號」。每個請求出發前先記下自己的號碼，回來時比對——**如果號碼已經不是最新的，代表使用者已經打了新的字，這個結果就過期了，丟掉。**

實測結果正確：

```
100 ms 後「react」回來了 → 採用，畫面更新
200 ms 後「reac」回來了  → 已過期，丟棄
300 ms 後「rea」回來了   → 已過期，丟棄
400 ms 後「re」回來了    → 已過期，丟棄
500 ms 後「r」回來了     → 已過期，丟棄

最終畫面：「react」的搜尋結果  ✅
```

### 但這只是開始

一個「完整」的手寫版本，還要處理這些：

```jsx
function useSearch(query) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestId = useRef(0);

  useEffect(() => {
    if (!query) return;

    const myId = ++latestId.current;
    const controller = new AbortController();   // 為了能真的取消請求

    setIsLoading(true);
    setError(null);

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        if (myId !== latestId.current) return;   // 競態防護
        setData(json);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;     // 取消不算錯誤
        if (myId !== latestId.current) return;
        setError(e);
      })
      .finally(() => {
        if (myId !== latestId.current) return;
        setIsLoading(false);
      });

    return () => controller.abort();             // 清理
  }, [query]);

  return { data, isLoading, error };
}
```

**這已經 30 行了，而它還沒有：**

- 快取（使用者按 Backspace 退回上一個字，會重新發一次請求）
- 重複請求去重（兩個元件同時要同一份資料，發兩次）
- 背景自動更新（資料過期了要不要重抓）
- 分頁與無限滾動
- 樂觀更新與回滾

**而且這 30 行要在每一個需要抓資料的地方重複一次**，或者你自己抽成 hook——那你就是在寫一個小型的 React Query。

---

## 三、核心觀念：遠端資料狀態 ≠ 應用狀態

這是整篇最重要的一節。很多人第一次聽到「不要把 API 資料放進 Redux」會覺得莫名其妙，**它們不都是 state 嗎？**

差別在「**誰是唯一真相來源（single source of truth）**」。

| | **應用狀態**（Client State） | **遠端資料狀態**（Server State） |
|---|---|---|
| 唯一真相來源 | **你的前端記憶體** | **伺服器** |
| 擁有者 | 你 | 伺服器 |
| 會被別人改嗎 | 不會 | **會**（其他使用者、你的其他分頁、後台批次） |
| 會過期嗎 | 不會 | **會，而且你不會收到通知** |
| 需要同步嗎 | 不用 | **要** |
| 是同步還是非同步 | 同步，改了立刻生效 | **非同步，而且可能失敗** |
| 典型例子 | 側邊欄開關、深色模式、表單草稿、目前選中的分頁 | 使用者清單、商品資料、訂單狀態 |

### 關鍵推論

<mark>Redux、Zustand、Context 這類工具，是為「應用狀態」設計的。</mark>

它們的設計前提是：**你的前端就是唯一真相，改了就是改了。** 所以它們提供的能力是「怎麼把狀態放好、怎麼通知元件更新」。

**但伺服器資料的難題完全不在這裡。** 難題是：

- 我手上這份資料，**現在還是對的嗎**？
- 別人改過了嗎？我要怎麼知道？
- 使用者切到別的分頁再切回來，要不要重抓？
- 兩個元件同時要同一份資料，要發兩次請求嗎？

**把伺服器資料塞進 Zustand，這些問題一個都沒被解決，你只是把它放進一個盒子而已。** 而那才是真正花時間的部分。

### 一句話總結

> **應用狀態的問題是「怎麼存」，遠端資料狀態的問題是「什麼時候該重新拿」。**
>
> **Redux 和 Zustand 解決前者，TanStack Query 解決後者。**

所以它們不是競爭關係，是互補的。一個專案兩個都用是很正常的。

---

## 四、TanStack Query 怎麼處理競態：靠 queryKey

它的做法跟手寫的「號碼牌」不同，而且更根本。

```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['search', query],                       // ← 關鍵在這一行
  queryFn: () => fetch(`/api/search?q=${query}`).then(r => r.json()),
});
```

白話講 `queryKey`：**它是這份資料的「身分證」。** `query` 變了，key 就變了，對 React Query 來說那就是**完全不同的一筆查詢**，各自有自己的快取格子。

所以競態根本不會發生：

```
100 ms 後「react」回來了 → 存進快取[react]，且是目前的 key，顯示它
200 ms 後「reac」回來了  → 存進快取[reac]，非目前 key，只存不顯示
300 ms 後「rea」回來了   → 存進快取[rea]，非目前 key，只存不顯示
400 ms 後「re」回來了    → 存進快取[re]，非目前 key，只存不顯示
500 ms 後「r」回來了     → 存進快取[r]，非目前 key，只存不顯示

最終畫面：「react」的搜尋結果  ✅
```

**注意「只存不顯示」這四個字，這是跟手寫版最大的差別。**

手寫的號碼牌做法是**把過期的結果丟掉**；TanStack Query 是**把它存進自己的格子**。差別在使用者按 Backspace 的時候：

```
使用者按 Backspace 退回「reac」時：
  「reac」命中快取，0 ms 直接顯示
→ 不用重發請求，因為那個 key 的結果還在快取裡。
```

**手寫版會重新發一次請求，TanStack Query 直接從快取拿。** 這不是它特別聰明，是「以 key 為單位存資料」這個設計自然帶來的結果。

---

## 五、三種做法的代價對照

| 做法 | 額外程式碼 | 競態 | loading | error | 快取 | Backspace 重用 |
|---|---|---|---|---|---|---|
| 誰回來就用誰 | 0 行 | ❌ 顯示錯的結果 | ❌ | ❌ | ❌ | ❌ |
| 手寫旗標防護 | 約 30 行 | ✅ 正確 | 自己寫 | 自己寫 | ❌ | ❌ |
| **TanStack Query** | **約 4 行** | ✅ 正確 | **內建** | **內建** | **內建** | ✅ |

再加上手寫版完全沒碰的：重複請求去重、視窗重新聚焦時自動更新、背景輪詢、分頁、樂觀更新與回滾。

---

## 六、什麼時候不該用

這個系列的慣例，一定要有這一節。四種情況我不會裝它：

**a. 純前端狀態**

側邊欄開合、深色模式、表單草稿——**這些沒有伺服器，硬包成 query 只是繞路**。用 `useState` 或 Zustand。

**b. 只讀一次、永遠不變的資料**

國家清單、縣市對照表這種。直接在建置時抓下來變成靜態檔（SSG），或啟動時抓一次存起來就好。**它不需要「重新取得」的機制，而那正是 TanStack Query 的價值所在。**

**c. 專案只有一兩個 API 呼叫**

多裝一個套件、多學一套心智模型，為了兩個 `fetch`，不划算。**判準是「你有沒有開始在複製貼上那 30 行」**——有的話就該裝了。

**d. 已經用 Next.js 的 Server Component 抓資料**

在伺服器端抓資料的話，競態、loading、快取有一部分由框架處理掉了。**混用要想清楚邊界在哪**，不要兩套快取打架。

---

## 七、今天的判斷標準

看到一段抓資料的程式碼時，問三個問題：

| 問題 | 如果答案是「是」 |
|---|---|
| 這份資料的真相在伺服器嗎？ | 它是**遠端資料狀態**，不要塞進 Redux／Zustand |
| 會不會有兩個請求同時在飛？ | 你需要**競態防護**，不然畫面會顯示錯的資料 |
| 我有在複製貼上 loading／error 的樣板嗎？ | 該抽出來了，抽到最後你會做出一個 TanStack Query |

還有一個更根本的心態：

> **抓資料的困難從來不是「怎麼發請求」，而是「怎麼知道手上這份已經過期了」。**
>
> `fetch` 解決前者，只花你一行。後者是所有真實專案的時間都花掉的地方。

---

## 明天預告

Day 21 講**樂觀更新（Optimistic Update）**：為什麼「先假裝成功、失敗再回滾」能讓介面感覺快十倍，以及回滾時最容易出錯的那一步。

---

## 完整可執行程式碼

存成 `day20-race-condition.js`，執行 `node day20-race-condition.js` 可以重跑本文所有實測。純 Node.js 不需要任何套件，也不需要 React——**競態條件是非同步本身的問題，跟框架無關。**

```js
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 模擬 API：關鍵是「不同的查詢字串，回應時間不一樣」
// 白話講：越短的字串通常搜尋結果越多、伺服器越慢，這在真實世界很常見
const fakeApi = async (q) => {
  const delay = { 'r': 500, 're': 400, 'rea': 300, 'reac': 200, 'react': 100 }[q] ?? 150;
  await sleep(delay);
  return { query: q, result: `「${q}」的搜尋結果`, tookMs: delay };
};

const typing = ['r', 're', 'rea', 'reac', 'react'];

async function main() {
  // ── 做法一：誰回來就用誰（錯的）──────────────────────
  let screenA = '（還沒有結果）';
  await Promise.all(typing.map(async (q) => {
    const res = await fakeApi(q);
    screenA = res.result;                     // 誰後回來誰覆蓋
    console.log(`${res.tookMs} ms 後「${q}」回來 → 畫面：${res.result}`);
  }));
  console.log('最終畫面：', screenA);          // → 「r」的結果，錯了

  // ── 做法二：號碼牌防護（手寫解法）────────────────────
  let screenB = '（還沒有結果）';
  let latestRequestId = 0;

  async function searchWithGuard(q) {
    const myId = ++latestRequestId;           // 出發前拿號碼牌
    const res = await fakeApi(q);
    // 白話講：回來後先確認「我還是最新的嗎」，不是就丟掉
    if (myId !== latestRequestId) {
      console.log(`${res.tookMs} ms 後「${q}」回來 → 已過期，丟棄`);
      return;
    }
    screenB = res.result;
    console.log(`${res.tookMs} ms 後「${q}」回來 → 採用`);
  }
  await Promise.all(typing.map(searchWithGuard));
  console.log('最終畫面：', screenB);          // → 「react」的結果，對了

  // ── 做法三：以 key 為單位存（TanStack Query 的思路）──
  const cache = new Map();
  let activeKey = null;

  async function useQuerySim(key) {
    activeKey = key;                          // 目前畫面關心哪個 key
    if (cache.has(key)) {
      console.log(`「${key}」命中快取，0 ms 直接顯示`);
      return cache.get(key);
    }
    const res = await fakeApi(key);
    cache.set(key, res);
    // 白話講：結果填進它自己的格子。畫面只讀 activeKey 那一格，
    //         舊 key 的結果回來也蓋不到畫面
    console.log(`${res.tookMs} ms 後「${key}」回來 → 存進快取[${key}]`
      + (key === activeKey ? '，且是目前 key，顯示它' : '，非目前 key，只存不顯示'));
    return res;
  }
  await Promise.all(typing.map(useQuerySim));
  console.log('最終畫面：', cache.get(activeKey).result);

  // 使用者按 Backspace → 不用重發請求
  await useQuerySim('reac');                  // 命中快取，0 ms
}

main();
```

---

## 參考來源與內容出處說明

延續這個系列的做法，把內容分類標示。

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| `queryKey` 的語意、快取以 key 為單位、內建的 loading／error／重新取得 | TanStack Query 官方文件：https://tanstack.com/query/latest/docs/framework/react/overview |
| 「Server State 與 Client State 是不同問題」這個論點 | TanStack Query 官方文件的 Motivation 章節：https://tanstack.com/query/latest/docs/framework/react/overview#motivation |
| React 官方對 `useEffect` 抓資料競態的處理建議（ignore flag 與 AbortController） | React 官方文件，You Might Not Need an Effect ／ Fetching data：https://react.dev/reference/react/useEffect#fetching-data-with-effects |
| `AbortController` 的行為 | MDN：https://developer.mozilla.org/en-US/docs/Web/API/AbortController |

**二、我實際跑出來的部分**

三種做法的輸出、五個請求的抵達順序、Backspace 命中快取，全部由 `day20-race-condition.js` 實測產生（Node.js v22），可以重跑驗證。

**Part 5 的 `useQuerySim` 是我寫的極簡模擬，不是 TanStack Query 的原始碼。** 它只示範「以 key 為單位存放」這一個設計概念，真實實作還包含 stale time、garbage collection、重試策略等，複雜得多。

**三、我自己的整理與判斷（沒有外部出處）**

- 「越短的字串伺服器越慢」這個延遲設定，是我為了讓現象明顯而設計的，**不是所有 API 都這樣**（但它是真實存在的模式）

- 「競態條件是在你的電腦上永遠不會發生的 bug」這個說法

- 那張「應用狀態 vs 遠端資料狀態」對照表的分類方式

- 「應用狀態的問題是怎麼存，遠端資料狀態的問題是什麼時候該重新拿」這句總結

- 第六節「什麼時候不該用」的四種情況，以及「你有沒有開始複製貼上那 30 行」這個判準

**四、行數的注意事項**

第二節那個 30 行的手寫版本，是我為了對照而寫的**完整版**（含 AbortController、競態、loading、error、清理）。實際專案裡很多人只寫其中一部分，所以看到的行數會比這個少——**但少掉的部分就是漏掉的防護。**

（查閱日期：2026-09-21。程式碼實測於 Node.js v22）
