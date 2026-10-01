/**
 * Day 23 demo：攔截、收集、觸發 —— 一個響應式系統的三個零件
 *
 * 執行方式：node day23-three-parts-of-reactivity.js
 *
 * 這支檔案要證明五件事：
 *   Part A —— 存取器屬性（accessor property）是「讀一個屬性卻執行了一段程式」
 *   Part B —— 三零件（攔截 / 收集 / 觸發）湊齊才叫響應式，缺一個是什麼下場
 *   Part C —— React 的 pull 模型在同一個情境下，實際多做了幾次工
 *   Part D —— 規模拉到 200 個欄位時，兩種模型的工作量差距（實測毫秒）
 *   Part E —— 為什麼「原地改物件」在 React 眼裡等於什麼都沒發生
 *
 * 全部都是手寫的最小模型，不是 React 或 Vue 的原始碼。
 */

'use strict'

const line = (t = '') => console.log(t)
const title = (t) => { line(); line('━'.repeat(64)); line(t); line('━'.repeat(64)) }

// ══════════════════════════════════════════════════════════════════
// Part A：存取器屬性 —— 「讀」這個動作本身可以被劫持
// ══════════════════════════════════════════════════════════════════
title('Part A：存取器屬性 —— 讀一個屬性，其實執行了一段程式')

let readCount = 0

const person = {
  _name: 'Abby',
  // get 開頭的屬性叫取值器（getter）。它不存值，存的是一段程式。
  // 白話：別人以為自己在「讀 person.name」，實際上 JavaScript 偷偷幫他呼叫了這個函式。
  get name () {
    readCount++
    return this._name
  },
  // set 開頭的屬性叫設值器（setter）。賦值時會被它接走。
  // 白話：person.name = 'Bob' 不會真的寫進 name，而是把 'Bob' 當參數丟進這個函式。
  set name (v) {
    this._name = v
  }
}

person.name              // 讀一次
person.name              // 再讀一次
person.name = 'Bob'      // 寫一次，寫不會經過 getter
line(`讀了兩次 person.name，getter 被執行了 ${readCount} 次，目前的值是 ${person.name}`)
line('→ 到這裡 readCount 變成 3，因為上一行的樣板字串又讀了一次')

// 為什麼內部要用 _name 而不是 name：
// get name() { return this.name } 會讀到自己 → 再觸發 getter → 無限遞迴。
// 下面這段真的會爆，用 try 包起來證明給自己看。
const trap = {
  get boom () { return this.boom }   // 讀 boom 又觸發 boom 的 getter
}
try {
  trap.boom
} catch (err) {
  line(`→ get boom() { return this.boom } 的下場：${err.constructor.name}: ${err.message}`)
}

// ══════════════════════════════════════════════════════════════════
// Part B：三個零件 —— 攔截、依賴收集、觸發更新
// ══════════════════════════════════════════════════════════════════
title('Part B：三個零件湊齊才叫響應式')

// 零件 b 與 c 要共用的兩個全域狀態：
let activeEffect = null            // 現在正在執行的 effect。白話：「誰在讀」的答案就靠它。
const depsMap = new Map()          // 訂閱清單。key 是屬性名，value 是讀過這個屬性的 effect 集合。

let trackCalls = 0                 // 零件 b 被呼叫幾次
let triggerCalls = 0               // 零件 c 被呼叫幾次
let effectRuns = 0                 // effect 實際重跑幾次

// ── 零件 b：依賴收集 ──────────────────────────────────────────────
// 白話：在「讀」的那一刻，把現在正在跑的那個 effect 記進這個屬性專屬的名單裡。
function track (key) {
  trackCalls++
  if (!activeEffect) return                        // 沒有人在讀就不用記
  if (!depsMap.has(key)) depsMap.set(key, new Set())
  depsMap.get(key).add(activeEffect)
}

// ── 零件 c：觸發更新 ──────────────────────────────────────────────
// 白話：在「寫」的那一刻，翻出剛才記的名單，只叫醒名單上的人。
function trigger (key) {
  triggerCalls++
  const subs = depsMap.get(key)
  if (!subs) return
  for (const fn of subs) fn()
}

// ── 零件 a：攔截 ──────────────────────────────────────────────────
// 白話：Proxy 就是在真實物件前面站一個替身，所有讀寫都要先經過它。
// get 與 set 這兩個攔截函式，官方術語叫 trap（陷阱）。
function reactive (target) {
  return new Proxy(target, {
    get (obj, key) {
      track(key)                                   // ← 零件 b 掛在讀的路徑上
      return Reflect.get(obj, key)
    },
    set (obj, key, value) {
      const ok = Reflect.set(obj, key, value)
      trigger(key)                                 // ← 零件 c 掛在寫的路徑上
      return ok
    }
  })
}

// 把一個函式註冊成 effect：先把自己設成 activeEffect，再跑一次讓它去讀資料。
// 白話：這一跑就是「登記」的過程，讀到誰就被誰記住。
function effect (fn) {
  const wrapped = () => {
    effectRuns++
    activeEffect = wrapped
    fn()
    activeEffect = null
  }
  wrapped()
  return wrapped
}

const state = reactive({ count: 0, unrelated: 'x' })

let lastPainted = null
effect(() => { lastPainted = `畫面：count = ${state.count}` })   // 這個 effect 只讀 count

const runsAfterRegister = effectRuns
state.unrelated = 'y'                                            // 改一個沒人讀的欄位
line(`改了沒人讀的 unrelated：effect 重跑 ${effectRuns - runsAfterRegister} 次（訂閱清單裡沒有它）`)

state.count = 1                                                  // 改一個有人讀的欄位
line(`改了有人讀的 count    ：effect 重跑 ${effectRuns - runsAfterRegister} 次，${lastPainted}`)
line(`零件 b track 共 ${trackCalls} 次，零件 c trigger 共 ${triggerCalls} 次`)

// ── 拆掉零件 b，看看會怎樣 ────────────────────────────────────────
// 白話：只保留「攔截」，不做「依賴收集」，那麼寫的時候就查不到名單，
//       唯一還能做的事是「全部重跑」—— 這正好就是 React 的處境。
let noTrackEffectRuns = 0
const noTrackSubs = new Set()                                    // 沒有 key 分類，一整包
function reactiveWithoutTrack (target) {
  return new Proxy(target, {
    get (obj, key) { return Reflect.get(obj, key) },              // 攔得到，但什麼都不記
    set (obj, key, value) {
      const ok = Reflect.set(obj, key, value)
      for (const fn of noTrackSubs) fn()                          // 只能全部叫醒
      return ok
    }
  })
}
const s2 = reactiveWithoutTrack({ a: 0, b: 0, c: 0 })
noTrackSubs.add(() => { noTrackEffectRuns++ })
noTrackSubs.add(() => { noTrackEffectRuns++ })
noTrackSubs.add(() => { noTrackEffectRuns++ })
s2.a = 1
line(`→ 拆掉零件 b 之後，只改 a 一個欄位，三個 effect 全部重跑了 ${noTrackEffectRuns} 次`)

// ── 零件 a 的天花板：Proxy 包不住原始型別 ─────────────────────────
// 白話：數字不是物件，Proxy 沒東西可以包，這就是 Vue 的 ref() 要你寫 .value 的原因。
try {
  new Proxy(0, {})
} catch (err) {
  line(`→ new Proxy(0, {}) 的下場：${err.constructor.name}: ${err.message}`)
}

// Vue 的 ref 怎麼繞過：先造一個物件，把值塞進它的具名屬性，再對那個屬性掛 getter/setter。
class RefImpl {
  constructor (value) { this._value = value }              // 真正存資料的地方
  get value () { track('value'); return this._value }      // 門面，讀它會被攔
  set value (v) { this._value = v; trigger('value') }      // 門面，寫它會被攔
}
const r = new RefImpl(0)
r.value = 5
line(`→ RefImpl 用具名屬性 value 繞過 Proxy 的限制，現在 r.value = ${r.value}`)

// ══════════════════════════════════════════════════════════════════
// Part C：React 的 pull 模型 —— 三個零件一個都不做
// ══════════════════════════════════════════════════════════════════
title('Part C：pull 模型 —— 不攔截、不收集、只重跑再比對')

function createPullRuntime (initialState, componentFn) {
  let current = { ...initialState }
  let prevTree = null
  const stats = { componentRuns: 0, nodesCreated: 0, nodesDiffed: 0, domWrites: 0 }

  // 注意這裡：current 是一個普通物件，沒有 Proxy 也沒有 getter。
  // 白話：元件讀 state.count 就只是讀一個普通變數，沒有任何人知道這件事發生過。
  function render () {
    stats.componentRuns++
    const tree = componentFn(current, stats)        // 整個元件函式從頭跑一次
    if (prevTree) {
      for (let i = 0; i < tree.length; i++) {
        stats.nodesDiffed++                         // 逐一比對新舊兩棵樹
        if (prevTree[i] !== tree[i]) stats.domWrites++
      }
    } else {
      stats.domWrites += tree.length                // 第一次是全部掛上去
    }
    prevTree = tree
  }

  // setState 就是「主動通報」。React 沒有攔截層，所以這個呼叫本身就是訊號。
  function setState (patch) {
    current = { ...current, ...patch }              // 一定要新物件，理由見 Part E
    render()
  }

  render()
  return { setState, stats }
}

const FIELDS = 200
const initial = {}
for (let i = 0; i < FIELDS; i++) initial['f' + i] = 0

// 一個有 200 個節點的畫面，每個節點只讀一個欄位。
function Dashboard (s, stats) {
  const out = []
  for (let i = 0; i < FIELDS; i++) {
    stats.nodesCreated++
    out.push('f' + i + ':' + s['f' + i])
  }
  return out
}

const pull = createPullRuntime(initial, Dashboard)
const afterMount = { ...pull.stats }
pull.setState({ f7: 1 })                            // 只改 200 個欄位裡的 1 個

line(`只改 1 個欄位（f7），pull 模型做了：`)
line(`  元件函式重跑     ${pull.stats.componentRuns - afterMount.componentRuns} 次`)
line(`  產生新節點       ${pull.stats.nodesCreated - afterMount.nodesCreated} 個`)
line(`  逐一比對節點     ${pull.stats.nodesDiffed - afterMount.nodesDiffed} 次`)
line(`  真正寫進 DOM     ${pull.stats.domWrites - afterMount.domWrites} 次`)
line('→ 最後真的要改的只有 1 個節點，但它為了「找出是哪一個」付了 400 次的代價')

// ══════════════════════════════════════════════════════════════════
// Part D：規模量測 —— 兩種模型各自的成本結構
// ══════════════════════════════════════════════════════════════════
title('Part D：實測 —— push 省在更新，pull 省在啟動')

function benchPush (fields, updates) {
  const localDeps = new Map()
  let active = null
  const obj = {}
  for (let i = 0; i < fields; i++) obj['f' + i] = 0

  const p = new Proxy(obj, {
    get (o, k) {
      if (active) {
        if (!localDeps.has(k)) localDeps.set(k, new Set())
        localDeps.get(k).add(active)
      }
      return Reflect.get(o, k)
    },
    set (o, k, v) {
      const ok = Reflect.set(o, k, v)
      const subs = localDeps.get(k)
      if (subs) for (const fn of subs) fn()
      return ok
    }
  })

  const t0 = performance.now()
  // 啟動階段：每個欄位註冊一個 effect，這就是 push 模型要先付的錢。
  for (let i = 0; i < fields; i++) {
    const fn = () => { void p['f' + i] }
    active = fn; fn(); active = null
  }
  const t1 = performance.now()
  // 更新階段：每次只改一個欄位。
  for (let u = 0; u < updates; u++) p['f' + (u % fields)] = u
  const t2 = performance.now()
  return { setup: t1 - t0, update: t2 - t1 }
}

function benchPull (fields, updates) {
  let state = {}
  for (let i = 0; i < fields; i++) state['f' + i] = 0
  let prev = null

  const renderOnce = () => {
    const tree = new Array(fields)
    for (let i = 0; i < fields; i++) tree[i] = 'f' + i + ':' + state['f' + i]
    if (prev) for (let i = 0; i < fields; i++) { if (prev[i] !== tree[i]) { /* dom write */ } }
    prev = tree
  }

  const t0 = performance.now()
  renderOnce()                                       // 啟動階段：就是跑一次，沒有額外登記
  const t1 = performance.now()
  for (let u = 0; u < updates; u++) {
    state = { ...state, ['f' + (u % fields)]: u }    // 不可變更新：複製一份新的
    renderOnce()                                     // 整棵樹重算再比對
  }
  const t2 = performance.now()
  return { setup: t1 - t0, update: t2 - t1 }
}

const FIELDS_BENCH = 200
const UPDATES = 2000
// 先空跑一輪讓 JIT（Just-In-Time 即時編譯器）暖機，否則第一輪的數字會被編譯成本汙染。
benchPush(FIELDS_BENCH, UPDATES); benchPull(FIELDS_BENCH, UPDATES)

const push = benchPush(FIELDS_BENCH, UPDATES)
const pullB = benchPull(FIELDS_BENCH, UPDATES)

line(`情境：${FIELDS_BENCH} 個欄位，連續 ${UPDATES} 次「只改其中 1 個」`)
line('')
line('                  啟動（毫秒）    更新（毫秒）')
line(`push（三零件）      ${push.setup.toFixed(2).padStart(8)}      ${push.update.toFixed(2).padStart(8)}`)
line(`pull（重跑＋比對）  ${pullB.setup.toFixed(2).padStart(8)}      ${pullB.update.toFixed(2).padStart(8)}`)
line('')
line(`更新階段的倍數差：pull 是 push 的 ${(pullB.update / push.update).toFixed(1)} 倍`)
line(`啟動階段的倍數差：push 是 pull 的 ${(push.setup / pullB.setup).toFixed(1)} 倍`)

// Proxy 本身的讀取成本：這是 push 模型隱形的常態稅。
const plain = { v: 1 }
const wrapped = new Proxy({ v: 1 }, { get: (o, k) => Reflect.get(o, k) })
const N = 3_000_000
let sink = 0
let t = performance.now(); for (let i = 0; i < N; i++) sink += plain.v
const plainMs = performance.now() - t
t = performance.now(); for (let i = 0; i < N; i++) sink += wrapped.v
const proxyMs = performance.now() - t
line('')
line(`讀 ${N.toLocaleString('en-US')} 次屬性：普通物件 ${plainMs.toFixed(1)} 毫秒，Proxy ${proxyMs.toFixed(1)} 毫秒（${(proxyMs / plainMs).toFixed(1)} 倍）`)
line(`（sink = ${sink}，只是避免引擎把整個迴圈最佳化掉）`)

// ══════════════════════════════════════════════════════════════════
// Part E：為什麼原地改物件等於什麼都沒發生
// ══════════════════════════════════════════════════════════════════
title('Part E：Object.is 看的是盒子，不是盒子裡的東西')

const user = { name: 'Abby', profile: { age: 20 } }

const mutated = user
mutated.name = 'Bob'
line(`原地改：Object.is(舊, 新) = ${Object.is(user, mutated)}  → React 判定沒變，不重繪`)

const copied = { ...user, name: 'Cathy' }
line(`給新物件：Object.is(舊, 新) = ${Object.is(user, copied)} → React 判定變了，重繪`)

// 淺複製的陷阱：第一層是新的，第二層還是同一個參考。
line(`淺複製後 profile 還是同一個嗎：${Object.is(user.profile, copied.profile)}`)
copied.profile.age = 99
line(`→ 改 copied.profile.age，原始的 user.profile.age 也變成 ${user.profile.age}`)
line('   所以巢狀物件要一層一層複製：{ ...user, profile: { ...user.profile, age: 99 } }')

// 陣列同理：push 是原地改，map / filter / concat 才回傳新陣列。
const todos = [{ id: 1 }]
const pushed = todos
pushed.push({ id: 2 })
line(`陣列 push 之後 Object.is(舊, 新) = ${Object.is(todos, pushed)} → 一樣看不見`)
const spread = [...todos, { id: 3 }]
line(`陣列展開之後 Object.is(舊, 新) = ${Object.is(todos, spread)} → 看得見`)

line()
line('━'.repeat(64))
line('結論：push 用「記帳」換更新時的精準，pull 用「重算」換啟動時的輕與資料流的顯式。')
line('      React 三個零件一個都不做，不是做不到，是它把成本放在另一邊。')
line('━'.repeat(64))
