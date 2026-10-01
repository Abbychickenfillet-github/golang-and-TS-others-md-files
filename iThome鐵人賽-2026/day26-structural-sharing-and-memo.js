/**
 * day26-structural-sharing-and-memo.js
 *
 * 快取回來以後，React 到底要不要重繪
 * 從 TanStack Query 的 replaceEqualDeep 讀到 useMemo 該不該加
 * 搭配 iThome 鐵人賽 2026 Day 26
 *
 * 執行方式：node day26-structural-sharing-and-memo.js
 * 環境：Node.js v18 以上
 *
 * 依賴：Part A 到 Part E 會 require('@tanstack/query-core')
 *      沒裝也跑得起來，那幾段會自己跳過並印出提示。Part F 不需要任何依賴。
 *      要跑完整版：npm install @tanstack/query-core@5.104.0
 *
 * 六個 Part
 *   Part A  關掉 Day 25 留下的問號：queryKey 到底是怎麼比較的
 *   Part B  invalidateQueries 的前綴比對是什麼規則
 *   Part C  structural sharing 的本體：replaceEqualDeep 會回傳「原本那個物件」
 *   Part D  哪些資料型別會讓它整包破功
 *   Part E  參考穩了不等於不重繪：用真實 QueryObserver 量通知次數
 *   Part F  useMemo 的命中率由上游決定，不是由你決定
 */

'use strict'

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------

function 分隔線(title) {
  console.log('\n' + '='.repeat(68))
  console.log(title)
  console.log('='.repeat(68))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

const 是否 = (v) => (v ? '是' : '否')

/** 安全地載入 query-core，沒裝就回傳 null */
function 載入QueryCore() {
  try {
    return require('@tanstack/query-core')
  } catch (error) {
    return null
  }
}

const QC = 載入QueryCore()
let QC版本 = '未安裝'
if (QC) {
  try {
    QC版本 = require('@tanstack/query-core/package.json').version
  } catch (error) {
    QC版本 = '已載入但讀不到版本'
  }
}

// ============================================================
// Part A：queryKey 到底是怎麼比較的
// ============================================================

function partA() {
  分隔線('Part A：queryKey 是怎麼比較的 —— 關掉 Day 25 留下的問號')

  console.log('  Day 25 的「沒有驗證的部分」我寫了這句：')
  console.log('    「TanStack Query 內部到底怎麼比較 queryKey 我沒有讀原始碼，')
  console.log('      但從實測行為推斷應該是深度比較或序列化比較」')
  console.log('')
  console.log('  今天讀了。答案是**序列化比較**，而且序列化之前會先把物件的 key 排序。')
  console.log('  函式名字叫 hashKey，原始碼在 packages/query-core/src/utils.ts：')
  console.log('')
  console.log('    export function hashKey(queryKey) {')
  console.log('      return JSON.stringify(queryKey, (_, val) =>')
  console.log('        isPlainObject(val)')
  console.log('          ? Object.keys(val).sort().reduce((result, key) => {')
  console.log('              result[key] = val[key]')
  console.log('              return result')
  console.log('            }, {})')
  console.log('          : val,')
  console.log('      )')
  console.log('    }')
  console.log('')
  console.log('  白話解釋這段：它就是 JSON.stringify，但塞了一個 replacer。')
  console.log('  replacer 遇到「單純物件」時，先把 key 用 sort() 排好再重組一個新物件，')
  console.log('  所以 { a, b } 與 { b, a } 會被序列化成同一個字串。')

  if (!QC) {
    console.log('\n  （沒有安裝 @tanstack/query-core，實測部分跳過）')
    return
  }

  const { hashKey } = QC

  小標('實測一：物件 key 的順序不影響 key（這是好事）')
  const k1 = ['stats', { status: 'done', page: 1 }]
  const k2 = ['stats', { page: 1, status: 'done' }]
  console.log(`  hashKey(['stats', { status, page }]) = ${hashKey(k1)}`)
  console.log(`  hashKey(['stats', { page, status }]) = ${hashKey(k2)}`)
  console.log(`  相同嗎：${是否(hashKey(k1) === hashKey(k2))}`)
  console.log('  → 所以你不用擔心物件屬性寫的順序，這一點它幫你處理好了')

  小標('實測二：陷阱一 —— 數字 1 與字串 "1" 是不同的 key')
  console.log(`  hashKey(['stats', 1])   = ${hashKey(['stats', 1])}`)
  console.log(`  hashKey(['stats', '1']) = ${hashKey(['stats', '1'])}`)
  console.log(`  相同嗎：${是否(hashKey(['stats', 1]) === hashKey(['stats', '1']))}`)
  console.log('')
  console.log('  這一條最容易踩：網址參數（useParams、query string）拿到的永遠是字串，')
  console.log('  但你自己寫死的測試資料常常是數字。同一筆資料會被存成兩份快取，')
  console.log('  invalidate 其中一個，另一個不會動。')

  小標('實測三：陷阱二 —— 值是 undefined 的欄位會整個消失')
  const 有undefined = ['stats', { eventStatus: undefined, page: 1 }]
  const 沒那個欄位 = ['stats', { page: 1 }]
  console.log(`  hashKey(['stats', { eventStatus: undefined, page: 1 }]) = ${hashKey(有undefined)}`)
  console.log(`  hashKey(['stats', { page: 1 }])                        = ${hashKey(沒那個欄位)}`)
  console.log(`  相同嗎：${是否(hashKey(有undefined) === hashKey(沒那個欄位))}`)
  console.log('')
  console.log('  原因是 JSON.stringify 會丟掉值為 undefined 的屬性。')
  console.log('  所以「篩選器清空」與「根本沒有篩選器」會落在同一個快取格子裡。')
  console.log('  這通常剛好是你想要的，但它是巧合不是設計 —— 如果你希望兩者不同，')
  console.log('  要自己把它寫成 null 或字串。')

  小標('實測四：Date 會被序列化成 ISO 字串')
  console.log(`  hashKey(['stats', new Date('2026-09-27T00:00:00Z')]) = ${hashKey(['stats', new Date('2026-09-27T00:00:00Z')])}`)
  console.log('  → 同一個時間點的兩個 Date 物件會得到同一個 key，這也是好事')
  console.log('  → 但如果 key 裡放的是 new Date()（現在），每次 render 都是新 key，快取永遠不命中')
}

// ============================================================
// Part B：invalidateQueries 的前綴比對
// ============================================================

function partB() {
  分隔線('Part B：invalidateQueries 的前綴比對規則（partialMatchKey）')

  if (!QC) {
    console.log('  （沒有安裝 @tanstack/query-core，這一段跳過）')
    return
  }
  const { partialMatchKey } = QC

  console.log('  Day 25 的「模式三：分層 key 設計」靠的就是這個函式。')
  console.log('  它的規則是：把你傳給 invalidateQueries 的 key 當成**樣板**，')
  console.log('  逐項比對快取裡那把 key 的開頭。樣板比較短沒關係，樣板比較長就不算命中。')
  console.log('')

  const 案例 = [
    [['stats', 'list', { page: 1 }], ['stats'], '用 ["stats"] 失效整個 stats 家族'],
    [['stats', 'list', { page: 1 }], ['stats', 'list'], '用 ["stats","list"] 只失效列表'],
    [['stats'], ['stats', 'list'], '樣板比快取的 key 更長'],
    [['stats', { page: 1, q: 2 }], ['stats', { page: 1 }], '物件只比對樣板列出的欄位'],
    [['stats', { page: 1 }], ['stats', { page: 2 }], '欄位值不同'],
  ]

  console.log('| 快取裡的 queryKey | 傳給 invalidateQueries 的 key | 命中 | 說明 |')
  console.log('|---|---|---|---|')
  for (const [快取key, 樣板, 說明] of 案例) {
    const 命中 = partialMatchKey(快取key, 樣板)
    console.log(`| \`${JSON.stringify(快取key)}\` | \`${JSON.stringify(樣板)}\` | ${是否(命中)} | ${說明} |`)
  }

  console.log('')
  console.log('  注意第四列：物件是「部分比對」，樣板沒寫到的欄位不會被檢查。')
  console.log('  所以 ["stats", { page: 1 }] 會一併失效掉 page 是 1 但其他條件各異的所有快取。')
  console.log('  這個行為很方便，但也代表你很容易 invalidate 到比預期更多的東西。')
}

// ============================================================
// Part C：structural sharing 的本體
// ============================================================

function partC() {
  分隔線('Part C：structural sharing 的本體是 replaceEqualDeep')

  console.log('  官方文件對 structural sharing 只有一句話：')
  console.log('    「React Query will keep the original reference if nothing changed in the data.」')
  console.log('    「If a subset changed, React Query will keep the unchanged parts')
  console.log('      and only replace the changed parts.」')
  console.log('')
  console.log('  那句話的實作就是 replaceEqualDeep。它最後一行是整段的靈魂：')
  console.log('')
  console.log('    return aSize === bSize && equalItems === aSize ? a : copy')
  console.log('')
  console.log('  白話解釋這行：如果新舊資料的欄位數一樣，而且每一個欄位都判定相等，')
  console.log('  就**回傳舊的那個 a**，新拿到的 b 直接丟掉。否則回傳一個新物件 copy，')
  console.log('  但 copy 裡面沒變的那些子物件，仍然塞的是 a 的子物件（同一個參考）。')

  if (!QC) {
    console.log('\n  （沒有安裝 @tanstack/query-core，實測部分跳過）')
    return
  }
  const { replaceEqualDeep } = QC

  小標('實測一：內容完全相同 → 回傳的就是舊物件本身')
  const 舊 = { sold: 120, list: [{ id: 1, n: 'a' }, { id: 2, n: 'b' }], meta: { page: 1 } }
  const 新 = JSON.parse(JSON.stringify(舊))     // 模擬 refetch 回來一份內容相同的新資料
  console.log(`  舊 === 新（兩個不同的物件）：${是否(舊 === 新)}`)
  const 結果 = replaceEqualDeep(舊, 新)
  console.log(`  replaceEqualDeep(舊, 新) === 舊：${是否(結果 === 舊)}   ← 這就是「保住參考」`)
  console.log(`  replaceEqualDeep(舊, 新) === 新：${是否(結果 === 新)}   ← 新的那份被丟掉了`)
  console.log('')
  console.log('  這一行為什麼重要：React 判斷要不要重繪用的是 Object.is 比參考（Day 23 講過）。')
  console.log('  參考沒變，React 就有機會跳過。所以「後端回來一樣的資料」在 TanStack Query 裡')
  console.log('  是真的不會造成新參考，不是靠你自己寫 useMemo 去救。')

  小標('實測二：只改一個欄位 → 沒改的子物件仍然共用')
  const 改了sold = { ...新, sold: 45 }
  const 結果2 = replaceEqualDeep(舊, 改了sold)
  console.log(`  整體同參考：${是否(結果2 === 舊)}   ← 因為 sold 真的變了，所以外層必須換新`)
  console.log(`  結果2.list === 舊.list：${是否(結果2.list === 舊.list)}   ← 沒改的部分重用`)
  console.log(`  結果2.meta === 舊.meta：${是否(結果2.meta === 舊.meta)}   ← 沒改的部分重用`)
  console.log(`  結果2.sold = ${結果2.sold}`)
  console.log('')
  console.log('  所以掛在 list 上面的那個 useMemo（例如排序、分組）**不會**因為 sold 變了而重算。')
  console.log('  這是 structural sharing 真正幫你省下來的東西。')
}

// ============================================================
// Part D：哪些型別會讓它破功
// ============================================================

function partD() {
  分隔線('Part D：哪些資料型別會讓 structural sharing 整包破功')

  console.log('  replaceEqualDeep 裡有一行守門員：')
  console.log('')
  console.log('    const array = isPlainArray(a) && isPlainArray(b)')
  console.log('    if (!array && !(isPlainObject(a) && isPlainObject(b))) return b')
  console.log('')
  console.log('  白話解釋這行：只有「單純陣列」與「單純物件」會進去逐欄位比對，')
  console.log('  其他東西一律 return b —— 直接換成新的那份，不做任何重用。')
  console.log('  這就是官方說的「只適用於 JSON 相容的資料」在原始碼裡的樣子。')

  if (!QC) {
    console.log('\n  （沒有安裝 @tanstack/query-core，實測部分跳過）')
    return
  }
  const { replaceEqualDeep } = QC

  小標('實測一：六種型別，內容都一樣，誰能重用舊參考')
  const 案例 = [
    ['單純物件', () => ({ n: 'a' })],
    ['單純陣列', () => [1, 2, 3]],
    ['Map', () => new Map([['a', 1]])],
    ['Set', () => new Set([1, 2])],
    ['Date', () => new Date('2026-01-01')],
    ['class 實例', () => { class P { constructor() { this.n = 'a' } } return new P() }],
  ]
  console.log('')
  console.log('| 型別 | 內容相同時能重用舊參考嗎 |')
  console.log('|---|---|')
  for (const [名稱, 造一個] of 案例) {
    const a = 造一個(); const b = 造一個()
    console.log(`| ${名稱} | ${是否(replaceEqualDeep(a, b) === a)} |`)
  }

  小標('實測二：最現實的那個雷 —— 外層是單純物件，但有一個 Date 欄位')
  const a = { sold: 1, updatedAt: new Date('2026-01-01') }
  const b = { sold: 1, updatedAt: new Date('2026-01-01') }
  const r = replaceEqualDeep(a, b)
  console.log(`  整體重用：${是否(r === a)}`)
  console.log(`  updatedAt 重用：${是否(r.updatedAt === a.updatedAt)}`)
  console.log('')
  console.log('  一個欄位破功，整包就跟著破功。理由回到 Part C 那一行：')
  console.log('  equalItems 少算一個，equalItems === aSize 不成立，所以回傳 copy 而不是 a。')
  console.log('')
  console.log('  什麼時候會發生：後端回傳的 JSON 裡 updatedAt 是**字串**，所以原本沒事。')
  console.log('  但只要你在 select 裡寫 new Date(row.updatedAt) 把它轉成 Date 物件，')
  console.log('  structural sharing 就從那一刻開始對這包資料完全失效。')
  console.log('  同理：在 select 裡 new Map(...)、包成 class 實例、或用 Immutable.js 的結構。')
}

// ============================================================
// Part E：參考穩了不等於不重繪
// ============================================================

async function partE() {
  分隔線('Part E：參考穩了不等於不重繪 —— 用真實 QueryObserver 量通知次數')

  if (!QC) {
    console.log('  （沒有安裝 @tanstack/query-core，這一段跳過）')
    return
  }
  const { QueryClient, QueryObserver, notifyManager } = QC

  // 讓通知同步送達，方便計數。真實 React 環境是批次非同步的
  notifyManager.setScheduler((cb) => cb())

  console.log('  劇本：同一個 query 連續 refetch 四次，後端每次都回**完全相同**的資料。')
  console.log('  理想狀況下畫面一次都不該更新。實際有幾次通知？')

  /** 每次都建立乾淨的 client，避免互相影響 */
  async function 量一次(標籤, options, 讀取方式) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    let 通知次數 = 0
    const observer = new QueryObserver(client, {
      queryKey: ['stats'],
      queryFn: async () => ({ sold: 120, list: [{ id: 1, n: 'a' }, { id: 2, n: 'b' }] }),
      ...options,
    })
    const 取消訂閱 = observer.subscribe((result) => {
      通知次數 += 1
      if (讀取方式) 讀取方式(observer.trackResult(result))
    })
    for (let i = 0; i < 4; i += 1) await observer.refetch()
    取消訂閱()
    client.clear()
    return 通知次數
  }

  小標('組一：模擬 React 的 tracked properties（元件讀了什麼就訂閱什麼）')
  console.log('  trackResult 會把結果包成 Proxy，你讀哪個屬性就訂閱哪個屬性。')
  console.log('  這是 React adapter 預設幫你做的事，官方文件叫 tracked properties。')
  console.log('')
  const 只讀data = await 量一次('只讀 data', {}, (r) => { const _ = r.data })
  const 讀data與isFetching = await 量一次('讀 data 與 isFetching', {}, (r) => { const _ = r.data; const __ = r.isFetching })
  const 用rest解構 = await 量一次('用 {...rest} 解構', {}, (r) => { const { ...rest } = r })

  console.log('| 元件怎麼用 useQuery 的回傳值 | 四次 refetch 的通知次數 |')
  console.log('|---|---|')
  console.log(`| \`const { data } = useQuery(...)\` | ${只讀data} |`)
  console.log(`| \`const { data, isFetching } = useQuery(...)\` | ${讀data與isFetching} |`)
  console.log(`| \`const { ...rest } = useQuery(...)\` | ${用rest解構} |`)
  console.log('')
  console.log(`  只讀 data 是 ${只讀data} 次（初次 pending 與初次拿到資料），之後完全安靜，`)
  console.log('  因為 data 的參考被 replaceEqualDeep 保住了，Proxy 判定「你在意的東西沒變」。')
  console.log(`  一旦你多讀了 isFetching，就變成 ${讀data與isFetching} 次 —— 每次 refetch 的開始與結束各一次。`)
  console.log('  官方文件對第三列有明確警告：')
  console.log('    「If you use object rest destructuring, you will disable this optimization.」')
  console.log('  因為 rest 解構會把每一個屬性都讀一遍，等於訂閱了全部。')

  小標('組二：把幾個開關關掉，看它們各自值多少')
  const 預設無追蹤 = await 量一次('預設、不追蹤', {}, null)
  const 只通知data = await 量一次('notifyOnChangeProps: ["data"]', { notifyOnChangeProps: ['data'] }, null)
  const 全部通知 = await 量一次("notifyOnChangeProps: 'all'", { notifyOnChangeProps: 'all' }, null)
  const 關掉結構共用 = await 量一次('structuralSharing: false', { structuralSharing: false }, null)
  const select產生新陣列 = await 量一次('select 每次產生新陣列', { select: (d) => d.list.map((x) => ({ ...x })) }, null)

  console.log('')
  console.log('| 設定 | 四次 refetch 的通知次數 |')
  console.log('|---|---|')
  console.log(`| 什麼都不設（沒有 Proxy 追蹤） | ${預設無追蹤} |`)
  console.log(`| \`notifyOnChangeProps: ['data']\` | ${只通知data} |`)
  console.log(`| \`notifyOnChangeProps: 'all'\` | ${全部通知} |`)
  console.log(`| \`structuralSharing: false\` | ${關掉結構共用} |`)
  console.log(`| \`select: d => d.list.map(...)\` | ${select產生新陣列} |`)

  console.log('')
  console.log('  要老實講一件事，不然這張表會被誤讀：')
  console.log('')
  console.log('    這裡量的是 **observer 的通知次數**，不是 React 的 render 次數。')
  console.log('    純 query-core 沒有 React adapter，所以沒有自動的 Proxy 追蹤，')
  console.log(`    預設就是「什麼都通知」（${預設無追蹤} 次）。`)
  console.log('    在 React 裡你不用手寫 notifyOnChangeProps，因為 adapter 用 Proxy 幫你推斷；')
  console.log('    組一的 trackResult 就是我用來重現那個推斷的。')
  console.log('')
  console.log('  真正的結論是這兩句：')
  console.log('    a. structural sharing 保住的是 **data 的參考**，它不負責「不通知」')
  console.log('    b. 決定要不要重繪的是 **你在元件裡讀了哪些屬性**')
  console.log('  兩件事都做對才會安靜。只做對一件，畫面照樣每次 refetch 閃兩下。')
}

// ============================================================
// Part F：useMemo 的命中率由上游決定
// ============================================================

function partF() {
  分隔線('Part F：useMemo 的命中率由上游決定，不是由你決定')

  console.log('  React 官方文件對 useMemo 有兩句話值得先擺出來：')
  console.log('    「React will compare each dependency with its previous value')
  console.log('      using the Object.is comparison.」')
  console.log('    「You should only rely on useMemo as a performance optimization.')
  console.log('      If your code doesn\'t work without it, find the underlying problem')
  console.log('      and fix it first.」')
  console.log('')
  console.log('  把這兩句話跟 Part C 接起來就是今天的主結論：')
  console.log('  useMemo 的依賴比較用的是 Object.is 比參考，而那個參考穩不穩，')
  console.log('  是 **上游**（TanStack Query 的 structural sharing、或你的 select）決定的。')

  /** 手寫一個最小的 useMemo：只有依賴陣列與 Object.is 比較 */
  function createMemo() {
    let 上次依賴 = null
    let 上次結果
    let 命中 = 0
    let 未命中 = 0
    return {
      run(計算, 依賴) {
        if (
          上次依賴 !== null &&
          上次依賴.length === 依賴.length &&
          依賴.every((d, i) => Object.is(d, 上次依賴[i]))
        ) {
          命中 += 1
          return 上次結果
        }
        未命中 += 1
        上次依賴 = 依賴
        上次結果 = 計算()
        return 上次結果
      },
      get 命中() { return 命中 },
      get 未命中() { return 未命中 },
    }
  }

  /** 一個真的有點成本的衍生計算：排序 ＋ 分組 ＋ 加總 */
  function 衍生計算(list) {
    const sorted = [...list].sort((a, b) => a.amount - b.amount)
    const groups = new Map()
    for (const row of sorted) {
      const g = groups.get(row.status) || { count: 0, sum: 0 }
      g.count += 1
      g.sum += row.amount
      groups.set(row.status, g)
    }
    return groups
  }

  const 造資料 = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: i,
      status: ['done', 'pending', 'cancelled'][i % 3],
      amount: (i * 7919) % 1000,
    }))

  小標('實測一：上游參考穩不穩，決定 useMemo 是最佳化還是純成本')

  const N = 2000
  const 渲染次數 = 300
  const 資料 = 造資料(N)

  // 情況一：上游參考穩定（structural sharing 生效）
  const memo穩定 = createMemo()
  const t1 = process.hrtime.bigint()
  for (let i = 0; i < 渲染次數; i += 1) memo穩定.run(() => 衍生計算(資料), [資料])
  const t2 = process.hrtime.bigint()

  // 情況二：上游每次都是新參考（structuralSharing: false，或 select 產生新陣列）
  const memo不穩 = createMemo()
  const t3 = process.hrtime.bigint()
  for (let i = 0; i < 渲染次數; i += 1) {
    const 每次都新的 = 資料.map((x) => x)        // 內容一樣，參考是新的
    memo不穩.run(() => 衍生計算(每次都新的), [每次都新的])
  }
  const t4 = process.hrtime.bigint()

  // 情況三：完全不用 useMemo
  const t5 = process.hrtime.bigint()
  for (let i = 0; i < 渲染次數; i += 1) 衍生計算(資料)
  const t6 = process.hrtime.bigint()

  const ms = (a, b) => Number(b - a) / 1e6

  console.log('')
  console.log(`  資料 ${N} 筆，模擬 ${渲染次數} 次 render`)
  console.log('')
  console.log('| 情況 | 總耗時（毫秒） | memo 命中 | memo 未命中 |')
  console.log('|---|---|---|---|')
  console.log(`| a. 上游參考穩定 ＋ useMemo | ${ms(t1, t2).toFixed(1)} | ${memo穩定.命中} | ${memo穩定.未命中} |`)
  console.log(`| b. 上游每次新參考 ＋ useMemo | ${ms(t3, t4).toFixed(1)} | ${memo不穩.命中} | ${memo不穩.未命中} |`)
  console.log(`| c. 完全不用 useMemo | ${ms(t5, t6).toFixed(1)} | — | — |`)
  console.log('')
  console.log(`  b 比 c 還慢（${ms(t3, t4).toFixed(1)} 對 ${ms(t5, t6).toFixed(1)} 毫秒），因為它每次都重算，`)
  console.log('  外加一次依賴比較與一次 map 複製。**這就是「最佳化反而把事情搞更複雜」的量化版本。**')
  console.log('')
  console.log('  請注意 b 的成因不在 useMemo 那一行，而在上游給了新參考。')
  console.log('  在真實專案裡，上游就是 `structuralSharing: false`、或 select 每次 map 出新陣列、')
  console.log('  或你在 select 裡把字串轉成 Date（Part D 那個雷）。')

  小標('實測二：資料量多少才值得 memo')
  console.log('  固定上游參考穩定，只改資料量，看 useMemo 省下多少')
  console.log('')
  console.log('| 資料筆數 | 不用 memo（毫秒） | 用 memo 且命中（毫秒） | 省下 | 每次 render 省 |')
  console.log('|---|---|---|---|---|')
  for (const n of [1, 10, 100, 1000, 10000]) {
    const d = 造資料(n)
    const m = createMemo()
    // 暖機
    for (let i = 0; i < 20; i += 1) { 衍生計算(d); m.run(() => 衍生計算(d), [d]) }

    const a1 = process.hrtime.bigint()
    for (let i = 0; i < 渲染次數; i += 1) 衍生計算(d)
    const a2 = process.hrtime.bigint()

    const m2 = createMemo()
    const b1 = process.hrtime.bigint()
    for (let i = 0; i < 渲染次數; i += 1) m2.run(() => 衍生計算(d), [d])
    const b2 = process.hrtime.bigint()

    const 不用 = ms(a1, a2); const 用 = ms(b1, b2)
    const 省 = 不用 - 用
    console.log(
      `| ${n} | ${不用.toFixed(2)} | ${用.toFixed(2)} | ${省.toFixed(2)} 毫秒 | ${((省 / 渲染次數) * 1000).toFixed(1)} 微秒 |`,
    )
  }
  console.log('')
  console.log('  這張表的讀法：看最後一欄。')
  console.log('  如果「每次 render 省下的時間」遠小於一格畫面的預算（60fps 是 16.7 毫秒），')
  console.log('  那這個 useMemo 對使用者是沒有感覺的，你只是多維護了一個依賴陣列。')
  console.log('  資料量小的時候甚至可能是負的 —— 比較依賴本身也要錢。')
}

// ============================================================
// main
// ============================================================

async function main() {
  console.log('day26-structural-sharing-and-memo.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log(`@tanstack/query-core ${QC版本}`)

  partA()
  partB()
  partC()
  partD()
  await partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. queryKey 是用 JSON.stringify 比較的，而且物件 key 會先排序（hashKey）')
  console.log('  2. 兩個陷阱：數字 1 與字串 "1" 不同；值為 undefined 的欄位會整個消失')
  console.log('  3. structural sharing 的本體是 replaceEqualDeep：內容沒變就回傳**原本那個物件**')
  console.log('  4. 只有單純物件與單純陣列適用。一個 Date 欄位就讓整包破功')
  console.log('  5. 參考穩了不等於不重繪。決定重繪的是你在元件裡讀了哪些屬性')
  console.log('  6. useMemo 的命中率由上游決定。上游穩了很多 useMemo 不必寫，上游不穩 useMemo 也救不了')
}

main().catch((error) => {
  console.error('執行失敗：', error)
  process.exit(1)
})
