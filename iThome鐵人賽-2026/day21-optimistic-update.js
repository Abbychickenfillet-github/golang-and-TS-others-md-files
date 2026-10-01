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
