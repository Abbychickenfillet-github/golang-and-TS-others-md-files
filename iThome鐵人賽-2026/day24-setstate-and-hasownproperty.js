/**
 * day24-setstate-and-hasownproperty.js
 *
 * 讀 React 原始碼：Component.prototype.setState 那 12 行
 * 以及為什麼 React 寫 hasOwnProperty.call(obj, key) 而不是 obj.hasOwnProperty(key)
 * 搭配 iThome 鐵人賽 2026 Day 24
 *
 * 執行方式：node day24-setstate-and-hasownproperty.js
 * 環境：Node.js v18 以上
 *
 * 依賴：Part B、Part C 之二、Part F 之二會去 require('react')。
 *      沒有裝 react 也跑得起來，那幾段會自己跳過並印出提示。
 *      要跑完整版：npm install react@19.3.0
 *
 * 六個 Part
 *   Part A  setState 只做一件事：委派。手寫最小 updater 把那件事做出來
 *   Part B  沒有 renderer 的時候，this.updater 是一個什麼都不做的空殼
 *   Part C  為什麼一定要寫 .call：三個會讓 obj.hasOwnProperty(key) 出事的真實情境
 *   Part D  但 React 自己也有用 obj.hasOwnProperty()，所以規則不是「一律用 .call」
 *   Part E  in、hasOwnProperty、Object.hasOwn 的四格對照
 *   Part F  ComponentDummy 那三行：為什麼 React 要把原型鏈壓平
 */

'use strict'

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------

function 分隔線(title) {
  console.log('\n' + '='.repeat(66))
  console.log(title)
  console.log('='.repeat(66))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

/** 安全地載入 react，沒裝就回傳 null */
function 載入React() {
  try {
    return require('react')
  } catch (error) {
    return null
  }
}

const React = 載入React()

// ============================================================
// Part A：setState 只做一件事，就是把事情丟給別人
// ============================================================

/**
 * 這是 React v19.3.0 packages/react/src/ReactBaseClasses.js 裡
 * Component.prototype.setState 的實際內容，我照抄下來（註解省略）
 *
 * 白話解釋：前面那個 if 只是在擋參數型別，真正做事的只有最後一行。
 * setState 自己不改 state、不重繪、不排程，它把這三件事全部交給 this.updater。
 */
function setState照抄版(partialState, callback) {
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    )
  }

  this.updater.enqueueSetState(this, partialState, callback, 'setState')
}

/**
 * 手寫一個最小的 updater，把 renderer 該做的事補上
 * 它要做三件 setState 自己不做的事：排隊、合併、重繪
 */
function createMiniUpdater() {
  const queue = []            // 排隊中的 partialState
  let renderCount = 0
  let flushScheduled = false

  const updater = {
    enqueueSetState(instance, partialState, callback) {
      queue.push({ instance, partialState, callback })
      console.log(`    [updater] 收到一筆，佇列長度 ${queue.length}`)

      // 批次：同一輪裡收到幾筆都只排一次 flush
      if (!flushScheduled) {
        flushScheduled = true
        Promise.resolve().then(flush)     // 用微任務模擬 React 的批次時機
      }
    },
    enqueueForceUpdate(instance) {
      renderCount += 1
      console.log(`    [updater] forceUpdate，直接重繪（第 ${renderCount} 次）`)
    },
  }

  function flush() {
    flushScheduled = false
    if (queue.length === 0) return

    const instance = queue[0].instance
    let nextState = { ...instance.state }
    const callbacks = []

    for (const item of queue) {
      // partialState 可以是物件，也可以是函式。函式版拿得到「已經套上前面幾筆」的 state
      const patch =
        typeof item.partialState === 'function'
          ? item.partialState(nextState, instance.props)
          : item.partialState
      if (patch != null) nextState = { ...nextState, ...patch }
      if (item.callback) callbacks.push(item.callback)
    }
    queue.length = 0

    instance.state = nextState            // 這一步才是真的改 state
    renderCount += 1
    console.log(`    [updater] 合併完成，重繪第 ${renderCount} 次，state = ${JSON.stringify(nextState)}`)
    for (const cb of callbacks) cb()
  }

  return {
    updater,
    get renderCount() { return renderCount },
  }
}

async function partA() {
  分隔線('Part A：setState 只做一件事 —— 把事情丟給 this.updater')

  const mini = createMiniUpdater()

  // 自己組一個最小的 class component，不靠 react
  class Counter {
    constructor(props) {
      this.props = props
      this.state = { count: 0 }
      this.updater = mini.updater
    }
  }
  Counter.prototype.setState = setState照抄版

  const c = new Counter({})

  小標('情境一：連按三次 setState({ count: this.state.count + 1 })')
  console.log(`  呼叫前 this.state = ${JSON.stringify(c.state)}`)
  c.setState({ count: c.state.count + 1 })
  c.setState({ count: c.state.count + 1 })
  c.setState({ count: c.state.count + 1 })
  console.log(`  三次呼叫結束，此刻 this.state = ${JSON.stringify(c.state)}   ← 還沒變`)
  await Promise.resolve()
  await Promise.resolve()
  console.log(`  微任務跑完後 this.state = ${JSON.stringify(c.state)}   ← 只加了 1`)
  console.log(`  重繪次數 = ${mini.renderCount}`)
  console.log('')
  console.log('  原因：三次都讀到同一個 this.state.count = 0，所以三筆 patch 都是 { count: 1 }')
  console.log('        合併起來還是 { count: 1 }。這不是 bug，是「state 不保證立刻更新」的直接後果')
  console.log('        原始碼註解原話：There is no guarantee that `this.state` will be immediately updated')

  小標('情境二：改成傳函式 setState(prev => ({ count: prev.count + 1 }))')
  const c2 = new Counter({})
  c2.setState((prev) => ({ count: prev.count + 1 }))
  c2.setState((prev) => ({ count: prev.count + 1 }))
  c2.setState((prev) => ({ count: prev.count + 1 }))
  await Promise.resolve()
  await Promise.resolve()
  console.log(`  微任務跑完後 this.state = ${JSON.stringify(c2.state)}   ← 這次真的加了 3`)
  console.log('')
  console.log('  差別：函式版拿到的 prev 是「已經套上前面幾筆」的 state，不是元件上那個舊的 this.state')
  console.log('        看 flush() 裡那一行 item.partialState(nextState, instance.props) 就知道為什麼')

  小標('情境三：setState 只擋這一種參數')
  const c3 = new Counter({})
  for (const 參數 of [123, 'abc', true]) {
    try {
      c3.setState(參數)
      console.log(`  setState(${JSON.stringify(參數)}) → 沒有丟錯`)
    } catch (error) {
      console.log(`  setState(${JSON.stringify(參數)}) → 丟 Error：${error.message.slice(0, 40)}...`)
    }
  }
  for (const 參數 of [null, undefined]) {
    try {
      c3.setState(參數)
      console.log(`  setState(${String(參數)}) → 沒有丟錯（因為 partialState != null 用的是寬鬆比較，null 與 undefined 都被放過）`)
    } catch (error) {
      console.log(`  setState(${String(參數)}) → 丟 Error`)
    }
  }
  console.log('')
  console.log('  注意那個錯誤訊息：它的開頭是「takes an object of...」，句子沒有主詞')
  console.log('  因為 React 把前面的元件名稱拿掉了，這是原始碼裡真的長這樣，不是我漏抄')
}

// ============================================================
// Part B：沒有 renderer 的時候，this.updater 是什麼
// ============================================================

function partB() {
  分隔線('Part B：this.updater 預設是一個什麼都不做的空殼')

  if (!React) {
    console.log('  （沒有安裝 react，這一段跳過。要跑請先 npm install react@19.3.0）')
    return
  }

  console.log(`  react 版本 = ${React.version}`)

  class Counter extends React.Component {
    constructor(props) {
      super(props)
      this.state = { count: 0 }
    }
    render() { return null }
  }

  const c = new Counter({})
  console.log(`  this.updater 身上有哪些方法 = ${JSON.stringify(Object.keys(c.updater))}`)
  console.log(`  setState 之前 this.state = ${JSON.stringify(c.state)}`)
  console.log('  （下面這行 console.error 是 React 自己印的，不是我印的）')
  c.setState({ count: 1 })
  console.log(`  setState 之後 this.state = ${JSON.stringify(c.state)}   ← 完全沒變`)
  console.log('')
  console.log('  原始碼裡那一行是這樣寫的：')
  console.log('    this.updater = updater || ReactNoopUpdateQueue')
  console.log('  Noop 就是 no operation。react 這個套件只定義了「呼叫誰」，')
  console.log('  真正會做事的 updater 是 react-dom 這類 renderer 在建立元件的時候注入的。')
  console.log('  這就是為什麼只裝 react 不裝 react-dom 什麼都畫不出來。')
}

// ============================================================
// Part C：為什麼一定要寫 hasOwnProperty.call
// ============================================================

/**
 * 天真版：直接呼叫物件自己的 hasOwnProperty
 * 這是把「方法在不在原型鏈上」這件事託付給了呼叫方的物件
 */
function 天真版createElement(type, config) {
  const props = {}
  for (const propName in config) {
    if (config.hasOwnProperty(propName)) props[propName] = config[propName]
  }
  return { type, props }
}

/**
 * React 版：從 Object.prototype 上把方法借出來，用 .call 指定要問誰
 * 對應原始碼 packages/shared/hasOwnProperty.js 那三行
 */
const hasOwnProperty = Object.prototype.hasOwnProperty

function React版createElement(type, config) {
  const props = {}
  for (const propName in config) {
    if (hasOwnProperty.call(config, propName)) props[propName] = config[propName]
  }
  return { type, props }
}

function partC() {
  分隔線('Part C：三個會讓 obj.hasOwnProperty(key) 出事的情境')

  小標('情境一：有人把 hasOwnProperty 當成 prop 傳進來')
  console.log('  JSX 寫成 <div hasOwnProperty="oops" title="hi" /> 是完全合法的')
  const config1 = { hasOwnProperty: 'oops', title: 'hi' }
  try {
    console.log(`  天真版 → ${JSON.stringify(天真版createElement('div', config1))}`)
  } catch (error) {
    console.log(`  天真版 → 爆炸：${error.constructor.name}：${error.message}`)
  }
  console.log(`  React 版 → ${JSON.stringify(React版createElement('div', config1))}`)
  if (React) {
    const el = React.createElement('div', config1)
    console.log(`  真實 React ${React.version} → props = ${JSON.stringify(el.props)}`)
  }
  console.log('')
  console.log('  白話解釋：config.hasOwnProperty 這時候不是那個函式了，它是字串 "oops"，')
  console.log('            字串不能被當成函式呼叫，所以直接 TypeError。')

  小標('情境二：config 是 Object.create(null) 做出來的物件')
  const config2 = Object.create(null)
  config2.title = 'hi'
  console.log('  這種物件的原型是 null，身上根本沒有 hasOwnProperty 可以繼承')
  try {
    console.log(`  天真版 → ${JSON.stringify(天真版createElement('div', config2))}`)
  } catch (error) {
    console.log(`  天真版 → 爆炸：${error.constructor.name}：${error.message}`)
  }
  console.log(`  React 版 → ${JSON.stringify(React版createElement('div', config2))}`)
  if (React) {
    console.log(`  真實 React → props = ${JSON.stringify(React.createElement('div', config2).props)}`)
  }
  console.log('')
  console.log('  這種物件不是怪招，它是「乾淨字典」的標準做法。')
  console.log('  用它當 map 就不會有 key 撞到 toString、constructor 這些繼承屬性的問題。')

  小標('情境三：原型被污染，for...in 會多撈到東西')
  const 髒物件 = JSON.parse('{"title":"hi"}')
  Object.prototype.被污染的屬性 = '我不該出現在 props 裡'

  const forIn全部撈 = []
  for (const k in 髒物件) forIn全部撈.push(k)
  console.log(`  for...in 撈到的 key = ${JSON.stringify(forIn全部撈)}   ← 多了一個`)
  console.log(`  React 版過濾後 props = ${JSON.stringify(React版createElement('div', 髒物件).props)}   ← 乾淨`)
  delete Object.prototype.被污染的屬性

  console.log('')
  console.log('  這一段要講清楚的是：`for...in` 會走整條原型鏈，')
  console.log('  所以「用 for...in 撈」跟「用 hasOwnProperty 過濾」是一組必須成對出現的寫法。')
  console.log('  React 原始碼 createElement 與 cloneElement 裡的那兩段迴圈就是這個形狀。')

  小標('對照：真實 React 原始碼裡的那一段（v19.3.0 ReactJSXElement.js）')
  console.log('    for (propName in config) {')
  console.log('      if (')
  console.log('        hasOwnProperty.call(config, propName) &&')
  console.log("        // Skip over reserved prop names")
  console.log("        propName !== 'key' &&")
  console.log('        ...')
  console.log('  config 是誰給的？是寫 JSX 的人給的。所以它是外部資料，不能假設它長得正常。')
}

// ============================================================
// Part D：React 自己也用 obj.hasOwnProperty()，規則是什麼
// ============================================================

function partD() {
  分隔線('Part D：React 自己也有用 obj.hasOwnProperty()，所以規則不是「一律用 .call」')

  console.log('  同一個檔案 ReactBaseClasses.js 裡，React 用的是實例方法的寫法：')
  console.log('')
  console.log('    const deprecatedAPIs = {')
  console.log("      isMounted: [ ... ],")
  console.log("      replaceState: [ ... ],")
  console.log('    }')
  console.log('    for (const fnName in deprecatedAPIs) {')
  console.log('      if (deprecatedAPIs.hasOwnProperty(fnName)) {   // ← 沒有 .call')
  console.log('        defineDeprecationWarning(fnName, deprecatedAPIs[fnName])')
  console.log('      }')
  console.log('    }')
  console.log('')
  console.log('  為什麼這裡可以？因為 deprecatedAPIs 是上面三行剛寫出來的物件字面量，')
  console.log('  它的原型一定是 Object.prototype，內容也一定只有那兩個 key，全部在自己控制之下。')
  console.log('')
  console.log('  所以真正的規則是這一句，不是「看到 hasOwnProperty 就加 .call」：')
  console.log('')
  console.log('    物件是外部給的（props、JSON、使用者輸入、別的套件回傳）  → 用 hasOwnProperty.call')
  console.log('    物件是這幾行自己剛做出來的字面量                        → 直接呼叫也安全')
  console.log('')
  console.log('  順便一個細節：packages/shared/hasOwnProperty.js 那三行裡有一行註解是')
  console.log('    // $FlowFixMe[method-unbinding]')
  console.log('  意思是型別檢查工具 Flow 本來會警告「你把方法從物件上拆下來了」，React 明講「我就是要」。')
}

// ============================================================
// Part E：in、hasOwnProperty、Object.hasOwn 的四格對照
// ============================================================

function partE() {
  分隔線('Part E：in、hasOwnProperty、Object.hasOwn 各自回答什麼問題')

  const 父 = { 繼承來的: 1 }
  const 子 = Object.create(父)
  子.自己的 = 2
  Object.defineProperty(子, '不可列舉的', { value: 3, enumerable: false })

  const keys = ['自己的', '繼承來的', '不可列舉的', '不存在的']
  const forIn = []
  for (const k in 子) forIn.push(k)

  console.log('')
  console.log('| key | k in 子 | hasOwnProperty.call | Object.hasOwn | Object.keys 看得到 | for...in 撈得到 |')
  console.log('|---|---|---|---|---|---|')
  for (const k of keys) {
    const a = k in 子
    const b = hasOwnProperty.call(子, k)
    const c = Object.hasOwn(子, k)
    const d = Object.keys(子).includes(k)
    const e = forIn.includes(k)
    const f = (v) => (v ? '是' : '否')
    console.log(`| ${k} | ${f(a)} | ${f(b)} | ${f(c)} | ${f(d)} | ${f(e)} |`)
  }

  console.log('')
  console.log('  讀這張表要抓的是三個分界：')
  console.log('    a. in 與 hasOwnProperty 的分界是「要不要往原型鏈上找」')
  console.log('    b. hasOwnProperty 與 Object.keys 的分界是「可不可列舉」')
  console.log('    c. for...in 同時被兩件事影響：它走原型鏈，而且只撈可列舉的')
  console.log('')
  console.log('  Object.hasOwn（ES2022）是為了取代 hasOwnProperty.call 而生的，語意一模一樣：')
  console.log(`    Object.hasOwn(Object.create(null), 'x') = ${Object.hasOwn(Object.create(null), 'x')}   ← 不會爆`)
  console.log("    Object.hasOwn({ hasOwnProperty: 'oops' }, 'title') =", Object.hasOwn({ hasOwnProperty: 'oops' }, 'title'), '  ← 不受影響')
  console.log('')
  console.log('  所以新寫的程式碼直接用 Object.hasOwn 就好，不用學 .call 這招。')
  console.log('  但你讀 React、Vue、lodash 這些成熟專案的原始碼一定會遇到 .call，')
  console.log('  因為它們的程式碼比 ES2022 老得多。')
}

// ============================================================
// Part F：ComponentDummy 那三行，為什麼要把原型鏈壓平
// ============================================================

function partF() {
  分隔線('Part F：ComponentDummy 那三行 —— React 刻意把原型鏈壓平')

  console.log('  原始碼（ReactBaseClasses.js 結尾）：')
  console.log('')
  console.log('    function ComponentDummy() {}')
  console.log('    ComponentDummy.prototype = Component.prototype')
  console.log('')
  console.log('    const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy())')
  console.log('    pureComponentPrototype.constructor = PureComponent')
  console.log('    // Avoid an extra prototype jump for these methods.')
  console.log('    assign(pureComponentPrototype, Component.prototype)')
  console.log('    pureComponentPrototype.isPureReactComponent = true')
  console.log('')
  console.log('  拆成兩件事看：')
  console.log('    a. new ComponentDummy() → 做出一個原型指向 Component.prototype 的空物件。')
  console.log('       目的是「繼承原型鏈但不執行 Component 的建構函式」，這是 class 語法之前的標準做法。')
  console.log('    b. assign(pureComponentPrototype, Component.prototype) → 把 setState 與 forceUpdate')
  console.log('       直接複製一份到 PureComponent.prototype 上面，那句註解講得很直白：少跳一階原型。')

  小標('驗證一：這件事真的出貨了嗎')
  if (!React) {
    console.log('  （沒有安裝 react，這一段跳過）')
  } else {
    const C = React.Component.prototype
    const P = React.PureComponent.prototype
    console.log(`  Object.getPrototypeOf(PureComponent.prototype) === Component.prototype → ${Object.getPrototypeOf(P) === C}`)
    console.log(`  hasOwnProperty.call(PureComponent.prototype, 'setState')    → ${hasOwnProperty.call(P, 'setState')}   ← 自有，不用往上找`)
    console.log(`  hasOwnProperty.call(PureComponent.prototype, 'forceUpdate') → ${hasOwnProperty.call(P, 'forceUpdate')}`)
    console.log(`  PureComponent.prototype 的自有屬性 = ${JSON.stringify(Object.getOwnPropertyNames(P))}`)
    console.log(`  Component.prototype 的自有屬性     = ${JSON.stringify(Object.getOwnPropertyNames(C))}`)
    console.log('')
    console.log('  注意 isMounted 與 replaceState 只出現在 Component.prototype 上，沒有被複製過去：')
    console.log(`    hasOwnProperty.call(PureComponent.prototype, 'isMounted') → ${hasOwnProperty.call(P, 'isMounted')}`)
    console.log(`    'isMounted' in PureComponent.prototype                   → ${'isMounted' in P}   ← 但沿著鏈還是找得到`)
    const d = Object.getOwnPropertyDescriptor(C, 'isMounted')
    if (d) {
      console.log(`    它的 descriptor：get 是 ${typeof d.get}，enumerable = ${d.enumerable}`)
      console.log('    因為 enumerable 是 false，而 Object.assign 只複製「可列舉的自有屬性」，所以它沒被帶過去。')
      console.log('    這正好是 Part E 那張表第二個分界的實例。')
    }
    console.log('')
    console.log(`  （上面看到 isMounted 存在，表示現在讀到的是 development 版；`)
    console.log('    那兩個棄用警告在原始碼裡包在 if (__DEV__) 裡面，production 版不會有。）')
  }

  小標('驗證二：多跳一階原型到底貴多少')
  console.log('  自己疊出不同深度的原型鏈，各呼叫一千萬次同一個方法')

  function 建鏈(depth) {
    const base = { ping() { return 1 } }
    let obj = base
    for (let i = 0; i < depth; i += 1) obj = Object.create(obj)
    return obj
  }

  const 次數 = 10_000_000
  const 輪數 = 3
  const depths = [0, 1, 2, 3, 10]
  const 成績 = new Map(depths.map((d) => [d, []]))

  for (let round = 0; round < 輪數; round += 1) {
    for (const depth of depths) {
      const obj = 建鏈(depth)
      // 先暖機，讓 JIT 有機會最佳化，避免量到編譯成本
      for (let i = 0; i < 200_000; i += 1) obj.ping()
      const t0 = process.hrtime.bigint()
      let sum = 0
      for (let i = 0; i < 次數; i += 1) sum += obj.ping()
      const t1 = process.hrtime.bigint()
      if (sum !== 次數) throw new Error('迴圈被最佳化掉了，數字不可信')
      成績.get(depth).push(Number(t1 - t0) / 1e6)
    }
  }

  const 中位數 = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)]
  const rows = depths.map((d) => ({ depth: d, ms: 中位數(成績.get(d)) }))
  const base = rows[0].ms

  console.log('')
  console.log(`| 原型鏈階數 | 一千萬次呼叫（毫秒，${輪數} 輪取中位數） | 對照 0 階的倍數 | 換算每次呼叫多花 |`)
  console.log('|---|---|---|---|')
  for (const r of rows) {
    const 每次奈秒 = ((r.ms - base) * 1e6) / 次數
    console.log(`| ${r.depth} 階 | ${r.ms.toFixed(1)} | ${(r.ms / base).toFixed(2)} 倍 | ${每次奈秒.toFixed(2)} 奈秒 |`)
  }

  console.log('')
  console.log('  這組數字要同時看兩件事，不然會得出相反的結論：')
  console.log('')
  const 一階倍數 = rows[1].ms / base
  const 十階倍數 = rows[rows.length - 1].ms / base
  const 一階奈秒 = ((rows[1].ms - base) * 1e6) / 次數
  const 累積到十毫秒需要 = Math.round(10 / (一階奈秒 / 1e6) / 1e6)

  const 單調 = rows.every((r, i) => i === 0 || r.ms >= rows[i - 1].ms)

  console.log(`    a. 倍數欄看起來很嚇人：0 階到 1 階差 ${一階倍數.toFixed(2)} 倍，到 10 階差 ${十階倍數.toFixed(2)} 倍。`)
  console.log('       0 階與有原型這件事的差距是穩定重現的，所以「多跳原型」確實有成本，那句註解不是迷信。')
  console.log(
     單調
      ? '       這一輪 1 到 10 階剛好也是越深越慢。'
      : '       但這一輪 1 到 10 階之間並沒有乾淨地遞增 —— 雜訊已經大於階數本身的差距，這件事本身就是結論。',
  )
  console.log(`    b. 但最後一欄才是實際尺度：多跳一階每次只多花 ${一階奈秒.toFixed(2)} 奈秒。`)
  console.log(`       要累積到人眼看得出來的 10 毫秒，得呼叫大約 ${累積到十毫秒需要} 百萬次。`)
  console.log('       （這幾個數字每次跑都會浮動，因為它會被當下的 CPU 負載影響，看方向不要記死數字。）')
  console.log('')
  console.log('  所以這個最佳化值不值得，取決於那個方法被呼叫多頻繁。')
  console.log('  setState 剛好是整個框架裡被呼叫最頻繁的方法之一，而那段程式碼是 2015 年前後寫的，')
  console.log('  當年引擎的 Inline Cache 也沒有現在聰明。')
  console.log('')
  console.log('  換句話說：**這種最佳化寫在框架裡合理，抄到你自己的業務程式碼裡就是過早最佳化。**')
  console.log('  真正值得學的不是「快多少」，是那句註解揭露的習慣 ——')
  console.log('  他們知道自己在做一個取捨，所以把理由寫進註解，而不是留一行沒人看得懂的 assign。')
}

// ============================================================
// main
// ============================================================

async function main() {
  console.log('day24-setstate-and-hasownproperty.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log(`react ${React ? React.version + '（已載入）' : '未安裝，Part B/C/F 的實測段落會跳過'}`)

  await partA()
  partB()
  partC()
  partD()
  partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. Component.prototype.setState 全文 12 行，扣掉參數檢查只剩一行：把事情丟給 this.updater')
  console.log('  2. 預設的 updater 是 ReactNoopUpdateQueue，什麼都不做。做事的那個由 renderer 注入')
  console.log('  3. 「this.state 不保證立刻更新」不是實作細節，是原始碼註解裡寫明的契約')
  console.log('  4. hasOwnProperty.call 是因為 config 是外部資料，可能沒有原型，也可能有人拿它當 prop 名')
  console.log('  5. React 自己也用 obj.hasOwnProperty()，差別在那個物件是不是自己剛做出來的')
  console.log('  6. ComponentDummy 那三行是用 class 語法之前的繼承手法，加上一次刻意的原型鏈壓平')
}

main().catch((error) => {
  console.error('執行失敗：', error)
  process.exit(1)
})
