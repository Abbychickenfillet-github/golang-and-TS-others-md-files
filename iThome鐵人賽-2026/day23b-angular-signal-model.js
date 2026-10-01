/**
 * Day 23 附錄 demo：Angular 的兩種形態
 *
 * Part A —— Zone.js 形態：攔截「非同步 API」而不是攔截「值」
 * Part B —— Signal 形態：用「函式呼叫」當攔截手段，三個零件全做
 * Part C —— 同一個情境下，兩種形態各自檢查了幾次
 *
 * 全部都是手寫的最小模型，不是 Angular 原始碼。
 * 執行：node day23b-angular-signal-model.js
 */

'use strict'

const line = (t = '') => console.log(t)
const title = (t) => { line(); line('━'.repeat(60)); line(t); line('━'.repeat(60)) }

// ══════════════════════════════════════════════════════════
// Part A：Zone.js 形態 —— 攔截的是「時機」，不是「值」
// ══════════════════════════════════════════════════════════
title('Part A：Zone.js —— 把 setTimeout 換掉，藉此知道「有事發生了」')

let cdRuns = 0          // change detection 跑了幾次
let bindingChecks = 0   // 總共比對了幾個樣板綁定

// 一棵有 5 個元件、每個元件 10 個樣板綁定的元件樹
const COMPONENTS = 5
const BINDINGS_PER_COMPONENT = 10
const model = { a: 0, b: 0 }
const prevRendered = {}

// 白話解釋：這就是 Angular 的 tick()。它不知道是誰改了什麼，
// 只能從根節點往下把每個元件的每個綁定都重新算一次再比對。
function tick () {
  cdRuns++
  for (let c = 0; c < COMPONENTS; c++) {
    for (let b = 0; b < BINDINGS_PER_COMPONENT; b++) {
      bindingChecks++
      const key = `c${c}b${b}`
      const value = `${model.a}-${model.b}`
      prevRendered[key] = value
    }
  }
}

// 這就是 monkey patch（猴子補丁）：把全域的 setTimeout 換成自己的版本，
// 原本那個先存起來，在自己的版本裡照常呼叫，只是多做一件事 —— 跑完之後通知框架。
const nativeSetTimeout = globalThis.setTimeout
let patchedCalls = 0
function patchSetTimeout () {
  globalThis.setTimeout = function (fn, ms, ...rest) {
    patchedCalls++
    return nativeSetTimeout(() => {
      fn()          // 先跑使用者原本要跑的事
      tick()        // 再通知 Angular：剛才有個非同步的東西結束了，全部檢查一遍
    }, ms, ...rest)
  }
}

function runZoneDemo () {
  return new Promise((resolve) => {
    patchSetTimeout()

    // 情境一：這個 setTimeout 真的改了資料
    setTimeout(() => { model.a = 1 }, 0)

    // 情境二：這兩個 setTimeout 什麼都沒改，只是印個 log
    setTimeout(() => { /* 什麼都沒改 */ }, 0)
    setTimeout(() => { /* 什麼都沒改 */ }, 0)

    nativeSetTimeout(() => {
      globalThis.setTimeout = nativeSetTimeout   // 還原，不要汙染後面的程式
      line(`被攔截的 setTimeout 呼叫：${patchedCalls} 次`)
      line(`change detection 跑了  ：${cdRuns} 次`)
      line(`樣板綁定總共比對      ：${bindingChecks} 次`)
      line(`→ 其中只有 1 次是真的有資料改變，另外 2 次是白跑的`)
      line(`→ 這就是 Zone.js 的核心問題：它知道「有事發生」，不知道「有沒有變」`)
      resolve()
    }, 10)
  })
}

// ══════════════════════════════════════════════════════════
// Part B：Signal 形態 —— 用「函式呼叫」當攔截手段
// ══════════════════════════════════════════════════════════
function runSignalDemo () {
  title('Part B：Signal —— 讀取本來就是執行函式，根本不需要偷聽')

  let activeConsumer = null        // 現在正在讀的那個 effect，等同 Vue 的 activeEffect

  // 白話解釋：signal 回傳的是一個「函式」。
  // 讀值要寫 count()，而呼叫函式本來就會執行一段程式，
  // 所以不需要 Proxy，也不需要 getter，語言層完全不用被繞過。
  function signal (initial) {
    let value = initial
    const subscribers = new Set()          // 這個 signal 專屬的訂閱清單

    const read = () => {
      if (activeConsumer) subscribers.add(activeConsumer)   // 零件 b：依賴收集
      return value                                          // 零件 a：攔截（就是這次呼叫本身）
    }
    read.set = (next) => {
      if (Object.is(value, next)) return                    // 值沒變就不通知，省一輪
      value = next
      for (const fn of subscribers) fn()                    // 零件 c：觸發更新
    }
    read.update = (fn) => read.set(fn(value))
    return read
  }

  function effect (fn) {
    const wrapped = () => { activeConsumer = wrapped; fn(); activeConsumer = null }
    wrapped()
    return wrapped
  }

  // 白話解釋：computed 是一個「只讀的 signal」，它自己也是 effect，
  // 所以它會被它讀到的 signal 記住，同時它自己也能被別人記住。
  function computed (fn) {
    const inner = signal(undefined)
    effect(() => inner.set(fn()))
    return () => inner()
  }

  const count = signal(0)
  const unrelated = signal('x')
  const double = computed(() => count() * 2)

  let viewRuns = 0
  let painted = ''
  effect(() => { viewRuns++; painted = `畫面：${count()} / ${double()}` })

  const base = viewRuns
  unrelated.set('y')
  line(`改了沒人讀的 unrelated：畫面重算 ${viewRuns - base} 次`)

  count.set(1)
  line(`改了有人讀的 count    ：畫面重算 ${viewRuns - base} 次，${painted}`)

  count.set(1)
  line(`把 count 設成同一個值  ：畫面重算 ${viewRuns - base} 次（Object.is 擋掉了）`)

  // signal 可以直接裝原始型別，這是 Proxy 做不到的事。
  const n = signal(42)
  line(`→ signal(42) 直接裝數字，不需要 .value 也不需要 Proxy，讀出來是 ${n()}`)
  try {
    new Proxy(42, {})
  } catch (err) {
    line(`→ 對照組 new Proxy(42, {})：${err.constructor.name}`)
  }
}

// ══════════════════════════════════════════════════════════
// Part C：同一個情境，兩種形態的工作量
// ══════════════════════════════════════════════════════════
function runCompare () {
  title('Part C：5 個元件 × 10 個綁定，只有 1 個值真的變了')
  line(`Zone.js 形態  ：檢查 ${COMPONENTS * BINDINGS_PER_COMPONENT} 個綁定 × ${cdRuns} 輪 = ${bindingChecks} 次比對`)
  line(`Signal 形態   ：只叫醒訂閱那個 signal 的 1 個 effect`)
  line('')
  line('差別不在「快幾倍」，在於一個要問「有沒有人變了」，另一個一開始就知道是誰。')
}

runZoneDemo().then(() => { runSignalDemo(); runCompare() })
