/**
 * day25-query-key-and-cache.js
 *
 * TanStack Query 的 queryKey 與快取失效
 * 搭配 iThome 鐵人賽 2026 Day 25
 *
 * 執行方式：node day25-query-key-and-cache.js
 * 環境：Node.js v18 以上
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
  console.log("  queryKey: ['stats', { eventId: 1 }]")
  console.log("  queryKey: ['stats', { eventId: 1 }]")
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
  console.log("  queryClient.invalidateQueries({ queryKey: ['stats'] })")
  console.log('stats query 定義：')
  console.log("  queryKey: ['stats']")
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
    const currentSearch = scenario.requests[scenario.requests.length - 1].search
    const currentKey = () => JSON.stringify(scenario.keyGenerator(currentSearch))

    scenario.requests.sort((a, b) => a.responseAt - b.responseAt)

    console.log('  回應到達順序：')
    for (const req of scenario.requests) {
      const key = JSON.stringify(scenario.keyGenerator(req.search))
      console.log(`    ${req.responseAt}ms: Response (search="${req.search}") 的 key=${key}`)
      console.log(`              當前查詢的 key=${currentKey()}`)
      console.log(
        `              ${key === currentKey() ? '✅ 匹配，渲染' : '❌ 不匹配，忽略（或放在另一個快取）'}`
      )
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
