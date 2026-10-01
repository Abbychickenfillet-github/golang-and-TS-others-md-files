# Day 25：queryKey 與快取失效 —— 統計卡片為什麼不更新

## 今天要回答的四個問題

1. **queryKey 為什麼重要？** 從「把回應結果藏在記憶體」跳到「記住那個回應是誰問出來的」時，什麼改變了？
2. **為什麼改了搜尋參數，卡片數字卻還是舊的？** 這是 `queryKey` 設計的鍋，還是我快取失效的寫法出了問題？
3. **`invalidateQueries` 為什麼有時有效有時沒效？** 「只要 mutation 結束就刷新所有統計」這句話隱藏的坑在哪？
4. **前後端搜尋同步為什麼會競態條件？** 使用者在過濾條件還沒送到後端時就按了刷新，old response 跟 new request 誰先到，結果就跟著變？

---

## 一、承接 Day 15，但不是 Promise 本身的問題

Day 15 講 `async/await` 的錯誤處理時，重點是「**你的程式碼**怎麼讀寫 API 回應」。今天要講的是「**框架替你**讀寫 API 回應」時會遇到的問題。

TanStack Query（前身叫 React Query）解決的不是「怎麼 fetch」，而是「**拿到資料之後怎麼放**」。

而 `queryKey` 就是「怎麼放」這件事的鑰匙。

---

## 二、當時的現象：統計卡片卡住了

### 情境一：過濾條件改了，卡片數字沒變

真實場景是這樣的（事件管理系統裡）：

```
使用者操作：
  1. 打開儀表板，看到「已售票券：120」
  2. 選了篩選器「只看已完成的事件」
  3. 點搜尋
  4. 頁面轉圈，後端回來新數字「已售票券：45」
  5. 轉圈結束，120 沒變
  
時序（Chrome DevTools Network 分頁看）：
  第一次 GET /api/stats → Response: {"sold": 120}
  使用者改篩選
  第二次 GET /api/stats?eventStatus=completed → Response: {"sold": 45}
  
結論：Response 確實是 45，但畫面上還是 120
```

當時最大膽的假設是「後端回來的東西被什麼地方吃掉了」，所以追了半天 middleware、interceptor、response transformer…… 都沒問題。

### 情境二：mutation 之後，卡片該改沒改

再早一週的情況：

```
使用者操作：
  1. 從某個票券項目修改了「通路」（channel）
  2. 按保存
  3. 卡片上的「通路銷售額」應該重算，還是舊數字
  
後來發現：
  - mutation 那個 endpoint 確實改成功了（資料庫有新數據）
  - GET 一下新的統計數字，也確實變了
  - 但頁面上的卡片「不知道」有新數據可以拿
```

### 兩件事的共通點

都是「後端已經有新數據」但「前端的快取記憶體還留著舊數據」，而且前端沒有意識到「已經應該拋棄舊快取了」。

---

## 三、我當時猜錯的三個方向

### 猜測一：是不是迴圈重複訂閱，舊的 subscription 壓住新的

代碼長這樣：

```tsx
// ❌ 猜測一時代的代碼
export function StatsCard() {
  const [filters, setFilters] = useState({ eventStatus: 'all' });
  
  const { data: stats } = useQuery({
    queryKey: ['stats'], // ← 看這行！
    queryFn: () => fetchStats(filters),
  });
  
  return (
    <Card>
      <span>已售：{stats?.sold}</span>
      <Select onChange={(e) => setFilters({ ...filters, eventStatus: e.target.value })} />
    </Card>
  );
}
```

我花了一整個下午試著搞清楚「useQuery 是不是在 effect 清理有問題」，結果 DevTools 的 Query 分頁裡根本沒有重複的 query 實例，就一個。


### 猜測二：是不是 React 的 key 沒改，component 沒有重新掛載

我以為只要把 component 卸載再掛載，快取就會刷新，所以試過：

```tsx
// ❌ 猜測二時代的代碼
<StatsCard key={filters.eventStatus} /> {/* 每次 filter 改都卸載重掛 */}
```

確實能「解決」卡片的問題（卸載重掛讓 query 重新跑），但這根本不是解法，只是「燒毀村莊救火」的招式。用了兩週後開始有其他地方組件狀態丟失。

**這個招式看起來有效，但埋的雷更大。**

### 猜測三：是不是 `queryClient` 被 provider 包兩層，互相看不到

```tsx
// ❌ 猜測三時代的 debug
console.log('StatsCard 的 queryClient:', useQueryClient());
console.log('FilterBar 的 queryClient:', useQueryClient());
console.log('兩個是同一個嗎？', ...);
```

花了一個下午確認它們是同一個。

**白費力氣。**

---

## 四、真正的原因：queryKey 沒變，快取就沒失效

### queryKey 的真實身份

`queryKey` 不是「便利貼」，是 **「這筆資料是怎麼問出來的」的完整記錄**。

```tsx
// 記得 Day 23 講「引用相等性」嗎？
const queryKey1 = ['stats']; 
const queryKey2 = ['stats'];
queryKey1 === queryKey2 // false！陣列每次都是新的

// TanStack Query 的做法是深度比較
useQuery({
  queryKey: ['stats'], // ← 如果你每次都寫 ['stats']，它看的是內容，不是物件身份
  // ...
})
```

白話解釋：
- **queryKey 改變** → 快取看到「哦，這是一筆我沒見過的問題」→ 重新 fetch
- **queryKey 沒變** → 快取看到「我有答案啊，給你上次的結果」→ 直接回傳記憶體裡的舊數據

我那時的 `queryKey: ['stats']` **從頭到尾都是一樣的**，所以快取永遠在說「我有答案」。而我改 filter 時，查詢參數送到後端了，但 queryKey 沒改，快取系統根本沒有被通知「有新問題要問」。

### 情境一的根因

```tsx
// ❌ 當時的代碼
const { data: stats } = useQuery({
  queryKey: ['stats'], // ← 永遠是 ['stats']，filter 改了也不會變
  queryFn: () => fetchStats(filters), // ← 這裡 filters 有變
});
```

時序跡象：
1. `filterStatus = 'all'` 時，queryKey 是 `['stats']`，fetch `/stats?status=all` 回 120
2. 使用者改成 `filterStatus = 'completed'`
3. `fetchStats(filters)` 送出 `/stats?status=completed` 
4. **但 queryKey 還是 `['stats']`** ← 快取系統不知道是新問題
5. 快取說「我記得『stats』的答案啦」，回傳 120
6. 同時後台的 fetch 也在跑，回來 45，但這時候 queryKey 用來對標的快取 key 已經被舊數據佔著了

**queryKey 沒變 = 快取系統根本沒被通知有新問題**

### 情境二的根因

```tsx
// ❌ 當時的代碼
// mutation 那邊：
const mutation = useMutation({
  mutationFn: updateChannel,
  onSuccess: () => {
    // ← 這裡沒有說「我改完了，統計卡片要重新算」
    queryClient.invalidateQueries({ queryKey: ['stats'] }); // ← 寫過，但...
  }
});

// stats 卡片那邊：
const { data: stats } = useQuery({
  queryKey: ['stats'], // ← 你的 key 是簡簡單單一個 'stats'
  queryFn: fetchStats,
});
```

乍一看我有 `invalidateQueries`，但問題在「**我改的是哪一通路的資料**」，statsi 應該也要只重新拿那個通路的資料。這時候 queryKey 應該包含通路訊息：

```tsx
// 應該是這樣
queryKey: ['stats', { channelId: 'channel_123' }]
```

但我的 queryKey 是 `['stats']`，所以：
1. Mutation 成功，`invalidateQueries` 說「把『stats』相關的都丟掉」
2. Stats query 卡住了，等著重新 fetch
3. 但有時候重新 fetch 因為**受 focus 影響（返回視窗觸發 refetch）** 或**時序問題**，過期快取在 fetch 完成前先被使用
4. 結果呈現出來就是「卡片沒變」

---

## 五、queryKey 的安全設計模式

### 模式一：把所有會影響結果的參數都放進 key

```tsx
// ✅ 安全的做法
function useStatsQuery(filters) {
  return useQuery({
    queryKey: ['stats', filters], // ← filters 物件做為 key 的一部分
    queryFn: () => fetchStats(filters),
    // 如果你的 filters 物件結構經常變化（新增/刪除欄位）
    // 可以更嚴格地只挑選會影響結果的欄位：
    // queryKey: ['stats', { eventStatus: filters.eventStatus, channelId: filters.channelId }],
  });
}

// 使用
const [filters, setFilters] = useState({ eventStatus: 'all' });
const { data: stats } = useStatsQuery(filters);
// filters 變了 → queryKey 自動變 → 快取自動失效 → 自動 refetch
```

### 模式二：mutation 時明確指定要失效的 key

```tsx
// ✅ onSuccess 時指定準確的 key pattern
const mutation = useMutation({
  mutationFn: (channelData) => updateChannel(channelData.id, channelData),
  onSuccess: (response, variables) => {
    // 只失效這個通路相關的統計
    queryClient.invalidateQueries({
      queryKey: ['stats', { channelId: variables.id }],
    });
    // 或用 exact: false 配合 prefix 做粗略失效（謹慎用）
    // queryClient.invalidateQueries({ queryKey: ['stats'], exact: false });
  },
});
```

### 模式三：分層 key 設計

```tsx
// ✅ 用陣列層級表達查詢的層次
const queryKeys = {
  all: ['stats'],
  byEvent: (eventId) => [...queryKeys.all, 'event', eventId],
  byChannel: (channelId) => [...queryKeys.all, 'channel', channelId],
  detailed: (filters) => [...queryKeys.all, 'detailed', filters],
};

// 使用
useQuery({
  queryKey: queryKeys.byEvent(eventId),
  queryFn: () => fetchStatsByEvent(eventId),
});

// mutation 時
queryClient.invalidateQueries({ queryKey: queryKeys.all, exact: false });
// 這樣會同時失效 byEvent、byChannel、detailed 下的所有快取
```

---

## 六、前後端搜尋同步的競態條件

### 競態條件的真相

假設使用者在搜尋框打「高級票」，頁面要送兩個 request：

```
時刻 0ms：使用者在搜尋框打完「高級票」
時刻 10ms：前端送 GET /tickets?search=高級票 (Request A)
時刻 50ms：使用者改主意，再打「普通票」
時刻 60ms：前端送 GET /tickets?search=普通票 (Request B)
時刻 150ms：Request B 回來 Response B：[普通票 1, 普通票 2]
時刻 200ms：Request A 才回來 Response A：[高級票 1, 高級票 2]
```

結論：畫面會顯示「高級票」，這是 Response A，而不是最新的 Request B。

### 傳統解法（容易出錯）

```tsx
// ❌ 用 state 追蹤搜尋詞，但時序亂
function SearchTickets() {
  const [search, setSearch] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  
  const { data: tickets } = useQuery({
    queryKey: ['tickets', displaySearch],
    queryFn: () => fetchTickets(displaySearch),
    enabled: displaySearch !== '', // ← 空字串不查
  });
  
  const handleSearch = (value) => {
    setSearch(value); // ← 這個改了
    // 但什麼時候 setDisplaySearch？
    // debounce 多久？
  };
  
  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### 用 TanStack Query 的 `request deduping` + `queryKey` 的解法

```tsx
// ✅ 讓 TanStack Query 幫你處理
function SearchTickets() {
  const [search, setSearch] = useState('');
  
  const { data: tickets, isPending } = useQuery({
    queryKey: ['tickets', search], // ← search 是唯一的真相
    queryFn: () => fetchTickets(search),
    enabled: search.length > 0,
    staleTime: 5 * 60 * 1000, // 5 分鐘內同個搜尋不重新 fetch
  });
  
  return (
    <>
      <input 
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋票券"
      />
      {isPending && <Spinner />}
      <TicketList tickets={tickets} />
    </>
  );
}
```

**怎麼樣避免競態條件：**

TanStack Query 的預設行為是 「**最後一個 queryKey 的 response 用**」。當 Response A 晚到時，queryClient 看到：

```
目前 queryKey 是什麼？['tickets', '普通票']
Response A 的 queryKey 是？['tickets', '高級票']
// 不匹配！Response A 不會被當成目前這筆查詢的答案
// 把它存起來，但不渲染
```

**而使用者能感受到的是：**
- 切換搜尋詞時，畫面清空（或保留舊列表），顯示 loading
- 最新的 response 來了，畫面才更新
- 永遠不會出現「明明搜尋『普通票』卻顯示『高級票』結果」的詭異現象

---

## 七、完整的可執行例子（展示四個 bug 與修法）

檔名 `day25-query-key-and-cache.js`。包含四段實測，可以直接在 Node.js 跑：

```javascript
/**
 * day25-query-key-and-cache.js
 *
 * TanStack Query 的 queryKey 與快取失效
 * 搭配 iThome 鐵人賽 2026 Day 25
 *
 * 執行方式：node day25-query-key-and-cache.js
 * 環境：Node.js v18 以上
 *
 * 依賴：Part C 會 require('@tanstack/react-query')
 *      沒有裝的話會跳過。要跑完整版：npm install @tanstack/react-query
 *
 * 五個 Part
 *   Part A   queryKey 的本質：為什麼陣列的深度比較是必須的
 *   Part B   bug 重現一：filter 改了但卡片沒變
 *   Part C   bug 重現二：mutation 後快取沒失效
 *   Part D   pattern 示範：怎麼用 queryKey 避免 bug
 *   Part E   競態條件：搜尋詞連打三次的時序模擬
 */

'use strict'

// 共用工具
function 分隔線(title) {
  console.log('\n' + '='.repeat(70))
  console.log(title)
  console.log('='.repeat(70))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

// ============================================================
// Part A：queryKey 的本質
// ============================================================

function partA() {
  分隔線('Part A：queryKey 為什麼是「這筆資料怎麼問出來的」的完整記錄')

  // 示範一：陣列淺比較 vs 深比較
  console.log('')
  console.log('陣列的身份 vs 內容：')
  const arr1 = ['stats', { eventId: 1 }]
  const arr2 = ['stats', { eventId: 1 }]
  console.log(`arr1 === arr2？${arr1 === arr2}   ← 身份不同（不同陣列物件）`)
  console.log(`JSON.stringify(arr1) === JSON.stringify(arr2)？${JSON.stringify(arr1) === JSON.stringify(arr2)}   ← 內容相同（深度比較）`)

  // 示範二：TanStack Query 用的就是內容比較
  console.log('')
  console.log('在 TanStack Query 的快取裡：')
  console.log('  queryKey 身份無關，內容決定快取鍵')
  console.log('  queryKey: [\'stats\', { eventId: 1 }]')
  console.log('  queryKey: [\'stats\', { eventId: 1 }]')
  console.log('  ↑ 這兩個會指向同一筆快取')

  // 示範三：結構改變 = 新快取
  console.log('')
  console.log('結構改變會觸發新快取：')
  const statKey1 = ['stats', { eventId: 1 }]
  const statKey2 = ['stats', { eventId: 1, status: 'completed' }]
  console.log(`  ${JSON.stringify(statKey1)} ← 快取 1`)
  console.log(`  ${JSON.stringify(statKey2)} ← 快取 2（完全不同的鍵）`)

  console.log('')
  console.log('白話：queryKey 改變 = 快取系統發現「這是新問題」= 觸發新 fetch')
}

// ============================================================
// Part B：bug 重現一 - filter 改了卡片卻沒變
// ============================================================

class MockQueryClient {
  constructor() {
    this.cache = new Map()
    this.queries = new Map()
  }

  // 簡化的 useQuery
  query(key, fn) {
    const keyStr = JSON.stringify(key)
    
    // 如果快取命中，直接回傳
    if (this.cache.has(keyStr)) {
      console.log(`    [快取] 快取命中 ${keyStr}`)
      return this.cache.get(keyStr)
    }
    
    // 沒有快取，執行 fn 並存入快取
    console.log(`    [fetch] 執行 queryFn...`)
    const result = fn()
    this.cache.set(keyStr, result)
    console.log(`    [完成] 存入快取 ${keyStr} = ${JSON.stringify(result)}`)
    return result
  }

  // 失效快取
  invalidateQueries(pattern) {
    const keyStr = JSON.stringify(pattern.queryKey)
    if (this.cache.has(keyStr)) {
      this.cache.delete(keyStr)
      console.log(`    [失效] 刪除快取 ${keyStr}`)
    }
  }
}

function partB() {
  分隔線('Part B：Bug 重現一 —— filter 改了但卡片沒變')

  小標('❌ 有 bug 的寫法')
  console.log('代碼：')
  console.log('  useQuery({')
  console.log("    queryKey: ['stats'], ← 永遠都是這個！")
  console.log('    queryFn: () => fetchStats(filters),')
  console.log('  })')

  const client = new MockQueryClient()

  console.log('\n時序：')
  console.log('  1️⃣ 初始狀態，filter = { status: "all" }')
  let result1 = client.query(['stats'], () => {
    return { sold: 120, title: 'all events' }
  })
  console.log(`     畫面顯示：${JSON.stringify(result1)}`)

  console.log('\n  2️⃣ 使用者改 filter 為 { status: "completed" }')
  console.log('     fetchStats(新 filter) 被呼叫了')
  let result2 = client.query(['stats'], () => {
    return { sold: 45, title: 'completed events' }
  })
  console.log(`     快取回傳舊數據：${JSON.stringify(result1)}`)
  console.log(`     後台 fetch 其實回來 ${JSON.stringify(result2)} 但被忽略了`)
  console.log(`     畫面還是顯示：${JSON.stringify(result1)} ← BUG！`)

  小標('✅ 修法：把 filter 放進 queryKey')
  console.log('代碼：')
  console.log('  useQuery({')
  console.log("    queryKey: ['stats', filters], ← filters 改了，key 也改")
  console.log('    queryFn: () => fetchStats(filters),')
  console.log('  })')

  const client2 = new MockQueryClient()
  console.log('\n時序（修復後）：')
  console.log('  1️⃣ 初始，filter = { status: "all" }')
  result1 = client2.query(['stats', { status: 'all' }], () => {
    return { sold: 120 }
  })
  console.log(`     畫面：${JSON.stringify(result1)}`)

  console.log('\n  2️⃣ 使用者改 filter 為 { status: "completed" }')
  console.log('     queryKey 從 ["stats", {status:"all"}] 變成 ["stats", {status:"completed"}]')
  result2 = client2.query(['stats', { status: 'completed' }], () => {
    return { sold: 45 }
  })
  console.log(`     快取未命中（key 不同！），執行新 fetch`)
  console.log(`     畫面：${JSON.stringify(result2)} ← 正確！`)
}

// ============================================================
// Part C：bug 重現二 - mutation 後快取沒失效
// ============================================================

function partC() {
  分隔線('Part C：Bug 重現二 —— mutation 之後卡片該改沒改')

  小標('❌ 有 bug 的寫法')
  console.log('mutation 成功時：')
  console.log('  queryClient.invalidateQueries({ queryKey: [\'stats\'] })')
  console.log('stats query 定義：')
  console.log('  queryKey: [\'stats\']')
  console.log('')
  console.log('但實際上：')
  console.log('  - 你改的是「通路 123 的銷售額」')
  console.log('  - stats 原本只看全體銷售額')
  console.log('  - 有時候 stats 需要分通路看')
  console.log('  - 同一個 queryKey [\'stats\'] 被多個 component 共享')
  console.log('  - 其中某個 component 改完資料，全部 component 的快取都被失效了')
  console.log('  - 而不是「只失效相關的那一筆」')

  小標('✅ 修法一：mutation 時明確指定 queryKey')
  console.log('mutation 成功時：')
  console.log('  queryClient.invalidateQueries({')
  console.log('    queryKey: [\'stats\', { channelId: 改掉的通路 ID }]')
  console.log('  })')
  console.log('stats query 定義：')
  console.log('  useQuery({')
  console.log('    queryKey: [\'stats\', { channelId: 當前通路 }]')
  console.log('    ...')
  console.log('  })')
  console.log('')
  console.log('結果：只有這個通路相關的快取被失效，其他通路的快取保留')

  小標('✅ 修法二：分層 key 設計')
  console.log('定義：')
  console.log('  const statKeys = {')
  console.log("    all: ['stats'],")
  console.log("    byChannel: (id) => [...statKeys.all, 'channel', id],")
  console.log('  }')
  console.log('')
  console.log('mutation 時：')
  console.log('  queryClient.invalidateQueries({')
  console.log('    queryKey: statKeys.byChannel(改掉的通路 ID)')
  console.log('  })')
  console.log('')
  console.log('或粗略失效：')
  console.log('  queryClient.invalidateQueries({')
  console.log('    queryKey: statKeys.all,')
  console.log('    exact: false  ← 把 all 下的所有子層都失效')
  console.log('  })')
}

// ============================================================
// Part D：queryKey pattern 示範
// ============================================================

function partD() {
  分隔線('Part D：安全的 queryKey 設計模式')

  小標('模式一：把所有會影響結果的參數都放進 key')
  console.log(`
const queryKeys = {
  all: ['tickets'],
  bySearch: (search) => [...queryKeys.all, 'search', search],
  byFilter: (filter) => [...queryKeys.all, 'filter', filter],
};

// 使用
useQuery({
  queryKey: queryKeys.bySearch(searchTerm),
  queryFn: () => fetchTickets(searchTerm),
});

// searchTerm 變了 → queryKey 自動變 → 快取失效 → 自動 refetch
  `)

  小標('模式二：分層結構，方便失效')
  console.log(`
const eventKeys = {
  all: ['events'],
  lists: () => [...eventKeys.all, 'list'],
  list: (filters) => [...eventKeys.lists(), filters],
  details: () => [...eventKeys.all, 'detail'],
  detail: (id) => [...eventKeys.details(), id],
};

// 在 list 頁面
useQuery({
  queryKey: eventKeys.list({ status: 'active', page: 1 }),
  queryFn: fetchEventList,
});

// mutation 後
queryClient.invalidateQueries({ queryKey: eventKeys.lists(), exact: false });
// 這會失效 list 底下的全部，但保留 detail
  `)

  小標('模式三：分離穩定部分與變動部分')
  console.log(`
// ❌ 容易出錯
queryKey: ['stats', { 
  eventId: 1, 
  status: 'completed',
  page: 1,
  sort: 'name',
  search: '',
  ... // 很多欄位
}]

// ✅ 清楚的意圖
queryKey: ['stats', 'byEvent', eventId, { status, page, sort, search }]

// 或甚至
queryKey: ['stats', 'byEvent', eventId].concat(JSON.stringify(filters))
  `)
}

// ============================================================
// Part E：競態條件模擬
// ============================================================

function partE() {
  分隔線('Part E：搜尋詞連打時的競態條件（模擬）')

  小標('情境：使用者快速連打搜尋詞')
  console.log(`
時刻    操作                          Request 時刻   Response 時刻
────────────────────────────────────────────────────────────
0ms     使用者輸入「高級」
10ms    前端 fetch search=高級 (A)    
50ms    使用者再打「普通」  
60ms    前端 fetch search=普通 (B)
150ms                                 ←  Response B 回來
200ms                                                ← Response A 才回來

沒有正確的 queryKey 時：
  - Response A（晚到）可能會蓋掉 Response B（先到）
  - 使用者搜尋「普通票」卻看到「高級票」結果

有正確的 queryKey 時：
  - Response A 的 queryKey: ['tickets', '高級']
  - Response B 的 queryKey: ['tickets', '普通']
  - 目前 component 的 queryKey: ['tickets', '普通']
  - Response A 不匹配，被存起來但不渲染
  - Response B 匹配，立刻渲染
  `)

  小標('模擬的快取行為')
  const scenarios = [
    {
      name: '❌ 沒有分化 queryKey',
      keyGenerator: () => ['tickets'],
      requests: [
        { at: 10, search: '高級', responseAt: 200 },
        { at: 60, search: '普通', responseAt: 150 },
      ],
    },
    {
      name: '✅ 用 queryKey 分化',
      keyGenerator: (search) => ['tickets', search],
      requests: [
        { at: 10, search: '高級', responseAt: 200 },
        { at: 60, search: '普通', responseAt: 150 },
      ],
    },
  ]

  for (const scenario of scenarios) {
    console.log(`\n${scenario.name}`)
    const cache = {}
    const currentKey = () => JSON.stringify(scenario.keyGenerator(scenario.requests[scenario.requests.length - 1].search))
    
    scenario.requests.sort((a, b) => a.responseAt - b.responseAt)
    
    console.log('  回應到達順序：')
    for (const req of scenario.requests) {
      const key = JSON.stringify(scenario.keyGenerator(req.search))
      console.log(`    ${req.responseAt}ms: Response (search="${req.search}") 的 key=${key}`)
      console.log(`              當前查詢的 key=${currentKey()}`)
      console.log(`              ${key === currentKey() ? '✅ 匹配，渲染' : '❌ 不匹配，忽略（或放在另一個快取）'}`)
    }
  }
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('day25-query-key-and-cache.js')
  console.log(`執行時間 ${new Date().toISOString()}`)

  partA()
  partB()
  partC()
  partD()
  partE()

  分隔線('五句話總結')
  console.log(`
  1. queryKey 是「這筆資料怎麼問出來的」的完整記錄，改變 = 新問題 = 新快取
  2. Filter 改了但沒有改 queryKey 時，快取系統不知道有新問題，回傳舊答案
  3. Mutation 後要失效快取時，要指定正確的 queryKey pattern，不要粗略失效所有相關
  4. 競態條件透過 queryKey 的區隔自動解決：晚到的 response 的 key 不匹配，不會蓋掉新的
  5. 最安全的做法：把所有會影響結果的參數都放進 queryKey，讓改變自動觸發新 fetch
  `)
}

main()
```

---

## 八、面試被問到的話，我會怎麼講

**「TanStack Query 和直接用 fetch 差在哪？」** 這題的陷阱是「我知道有快取、有 deduping」，但答不出**為什麼這些東西需要靠 queryKey**：

1. **fetch 沒辦法區分「誰問了這個問題」。** `fetch('/api/stats?status=all')` 和 `fetch('/api/stats?status=completed')` 回傳的內容不同，但你的快取系統怎麼知道這是兩筆不同的問題？放在同一個記憶體位址嗎？那改 filter 時要手動清快取？
2. **queryKey 解決的是「快取系統怎麼認出不同的問題」。** 改變 key = 快取看到新問題 = 自動 refetch
3. **三種 bug 都根源於 queryKey 沒變：** filter 改了沒變、mutation 後沒變、search 詞改了沒變
4. **競態條件自動解決** 因為晚到的 response 被標記上它來自哪個問題（queryKey），不會亂套到別的問題上
5. **分層 key 設計** 讓失效快取變得精準。不是「全部刪」，而是「只刪相關的」

最容易拉開差距的地方：**你是「背」invalidateQueries 的用法，還是「理解」invalidateQueries 為什麼要跟 queryKey 對應。**

---

## 完整 demo 原始碼

把上面那段 `day25-query-key-and-cache.js` 存下來，跑：

```bash
node day25-query-key-and-cache.js
```

---

## 八之二、四個框架的實現對比

### React 版本

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const statsKeys = {
  all: ['stats'] as const,
  byFilter: (filter: StatsFilter) => [...statsKeys.all, 'byFilter', filter] as const,
};

// ✅ 使用
export function useStats(filter: StatsFilter) {
  return useQuery({
    queryKey: statsKeys.byFilter(filter),
    queryFn: () => fetchStats(filter),
  });
}

// ✅ Mutation + Invalidation
export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateChannel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: statsKeys.byFilter({ channelId: data.channelId }),
      });
    },
  });
}
```

**特點**：hook 最直覺，queryKey 改變自動 refetch，無需手動追蹤 dependency

### Vue 版本

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';

const props = defineProps<{ filter: StatsFilter }>();

const statsKeys = {
  all: ['stats'] as const,
  byFilter: (f: StatsFilter) => [...statsKeys.all, 'byFilter', f] as const,
};

// ✅ 需要用 computed 讓 queryKey 反應式
const { data: stats } = useQuery({
  queryKey: computed(() => statsKeys.byFilter(props.filter)),
  queryFn: () => fetchStats(props.filter),
});

// ✅ Mutation + Invalidation
const queryClient = useQueryClient();
const { mutate: updateChannel } = useMutation({
  mutationFn: (data: UpdateData) => updateChannelAPI(data),
  onSuccess: (response) => {
    queryClient.invalidateQueries({
      queryKey: statsKeys.byFilter({ channelId: response.channelId }),
    });
  },
});
</script>

<template>
  <div>Sold: {{ stats?.sold }}</div>
</template>
```

**特點**：queryKey 要用 `computed()` 包才會反應式，invalidation 語法完全相同

### Angular 版本

```typescript
import { Component, Input } from '@angular/core';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';

@Component({
  selector: 'app-stats',
  template: `
    <div>Sold: {{ (stats$ | async)?.sold }}</div>
  `,
})
export class StatsComponent {
  @Input() filter: StatsFilter;

  private queryClient = injectQueryClient();

  // ✅ injectQuery 返回 Observable
  stats$ = injectQuery(() => ({
    queryKey: ['stats', 'byFilter', this.filter],
    queryFn: () => this.fetchStats(this.filter),
  })).data$;

  // ✅ Mutation
  updateChannel$ = injectMutation(() => ({
    mutationFn: (data: UpdateData) => this.updateChannelAPI(data),
    onSuccess: (response) => {
      this.queryClient.invalidateQueries({
        queryKey: ['stats', 'byFilter', { channelId: response.channelId }],
      });
    },
  }));

  private fetchStats(filter: StatsFilter): Promise<StatsData> {
    // ...
  }

  private updateChannelAPI(data: UpdateData): Promise<Response> {
    // ...
  }
}
```

**特點**：用 Observable + `async` pipe，要記得取 `.data$`，invalidation 語法同 React

### Svelte 版本

```svelte
<script lang="ts">
  import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

  export let filter: StatsFilter;

  const statsKeys = {
    all: ['stats'] as const,
    byFilter: (f: StatsFilter) => [...statsKeys.all, 'byFilter', f] as const,
  };

  const queryClient = useQueryClient();

  // ✅ 用 $derived 讓 queryKey 自動追蹤
  const stats = createQuery({
    queryKey: $derived([statsKeys.byFilter(filter)]),
    queryFn: () => fetchStats(filter),
  });

  // ✅ Mutation
  const updateChannel = createMutation({
    mutationFn: (data: UpdateData) => updateChannelAPI(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: statsKeys.byFilter({ channelId: response.channelId }),
      });
    },
  });
</script>

<div>Sold: {$stats.data?.sold}</div>
```

**特點**：語法最簡潔，`$derived` 自動追蹤，`$` prefix 直接存取 store

---

## 四框架的 queryKey 設計完全相同

| 方面 | React | Vue | Angular | Svelte |
|------|-------|-----|---------|--------|
| **queryKey 定義** | 完全相同 | 完全相同 | 完全相同 | 完全相同 |
| **invalidation 語法** | `queryClient.invalidateQueries(...)` | 相同 | 相同 | 相同 |
| **差異** | - | 需要 `computed()` 包 | Observable + `async` pipe | `$derived` + `$` prefix |

**最重要的結論**：queryKey 的設計和失效策略在四個框架中**完全一致**。唯一的差異只在「怎麼讓 component 對 queryKey 變化做出反應」。

---

## 沒有驗證的部分

- **TanStack Query 內部到底怎麼比較 queryKey** 我沒有讀原始碼，但從實測行為推斷應該是深度比較或序列化比較，具體細節在 `packages/query-core/src/utils.ts` 裡
- **為什麼 staleTime 預設 0（永遠 stale）** 而不是更長的時間，官方文件沒有詳細解釋理由，只說「conservative default」
- **onSuccess 的時序保證** 我假設 mutation 真的寫進資料庫了才呼叫 onSuccess，但有些 API 設計會立刻回傳然後非同步寫入

---

## 明天

今天讀的是「快取鍵值配對怎麼設計」。

明天 Day 26 讀「快取回傳後，React 要不要重繪」。同一筆快取的資料回傳給 component，什麼時候值得加 `useMemo` 避免不必要的渲染，什麼時候這個最佳化反而把事情搞更複雜？

---

## 資料來源

| 內容 | 連結 | 查證時間 |
|---|---|---|
| TanStack Query（React Query）官方文件 | https://tanstack.com/query/latest/docs/react/overview | 2026-09-25 |
| queryKey 設計最佳實踐 | https://tanstack.com/query/latest/docs/react/important-defaults | 2026-09-25 |
| useQuery 與 invalidateQueries | https://tanstack.com/query/latest/docs/react/reference/useQuery | 2026-09-25 |
| 深度物件比較的實作細節 | https://github.com/TanStack/query | 2026-09-25（未讀原始碼，推測） |
