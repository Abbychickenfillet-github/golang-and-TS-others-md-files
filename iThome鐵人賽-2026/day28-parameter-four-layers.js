/**
 * Day 28 demo：一個參數的四層旅行
 *
 * Part A —— Elision（稀疏陣列的空位）到底跟 undefined 差在哪
 * Part B —— 那個「?」的六種身分，以及它們求值行為的差異
 * Part C —— Generator 能暫停，但只能往前：證明它為什麼當不了 Fiber
 * Part D —— 遞迴（真 call stack）vs Fiber（自己重寫的 stack）：誰讓得出主執行緒
 * Part E —— pendingProps === memoizedProps 的 bailout
 *
 * Part C 與 Part D 的 Fiber 是我手寫的最小模型，不是 React 原始碼。
 * 執行：node day28-parameter-four-layers.js
 */

'use strict'

const line = (t = '') => console.log(t)
const title = (t) => { line(); line('━'.repeat(64)); line(t); line('━'.repeat(64)) }

// ══════════════════════════════════════════════════════════════════
// Part A：Elision —— 空位不是 undefined，它是「這個索引不存在」
// ══════════════════════════════════════════════════════════════════
title('Part A：Elision（空位）與 undefined 是兩回事')

const elided = [1, , 3]        // 中間是 Elision，規格書的術語
const explicit = [1, undefined, 3]

// 白話解釋：兩個陣列印出來幾乎一樣，length 也一樣，但它們的「索引 1」本質不同。
line(`[1, , 3] 的 length      ：${elided.length}`)
line(`[1, undefined, 3] 的 length：${explicit.length}`)
line(`兩者的 [1] 讀出來       ：${elided[1]} vs ${explicit[1]}（都是 undefined）`)
line('')

// in 運算子問的是「這個索引存在嗎」，不是「值是不是 undefined」。
line(`1 in [1, , 3]           ：${1 in elided}   ← 空位：索引根本不存在`)
line(`1 in [1, undefined, 3]  ：${1 in explicit}    ← 有索引，只是值是 undefined`)
line(`Object.keys([1, , 3])   ：${JSON.stringify(Object.keys(elided))}   ← 空位被跳過`)
line(`hasOwnProperty(1)       ：${elided.hasOwnProperty(1)} vs ${explicit.hasOwnProperty(1)}`)
line('')

// 大部分的陣列方法會跳過空位，但不是全部 —— 這是最容易踩的地方。
const visitedElided = []
const visitedExplicit = []
elided.forEach((v, i) => visitedElided.push(i))
explicit.forEach((v, i) => visitedExplicit.push(i))
line(`forEach 走訪到的索引    ：${JSON.stringify(visitedElided)} vs ${JSON.stringify(visitedExplicit)}`)
line(`map 之後還是不是空位    ：${1 in elided.map(x => x)}   ← map 保留空位`)
line(`Array.from 之後          ：${1 in Array.from(elided)}    ← 會被補成 undefined`)
line(`展開運算子之後           ：${1 in [...elided]}    ← 也會被補成 undefined`)
line(`join 怎麼處理空位        ：'${elided.join('-')}'  ← 空位與 undefined 都變空字串`)
line('')
line('→ 規格書把中間那個空位叫 Elision，語法規則寫成 Elision opt，opt 就是 optional')
line('→ 在 React 裡這件事會變成：{arr.map(...)} 的空位不會產生任何節點')

// ══════════════════════════════════════════════════════════════════
// Part B：那個「?」的六種身分
// ══════════════════════════════════════════════════════════════════
title('Part B：同一個符號，六種完全不同的意思')

let sideEffects = 0
const bump = (v) => { sideEffects++; return v }

// 1. 三元（條件）運算子：三個運算元，只會求值其中一邊。
const ternary = true ? bump('走左邊') : bump('走右邊')
line(`1. 三元運算子 a ? b : c ：${ternary}，另一邊沒被求值（sideEffects = ${sideEffects}）`)

// 2. 可選鏈：左邊是 null 或 undefined 就整串短路成 undefined，不會丟錯。
const maybe = null
line(`2. 可選鏈 a?.b         ：${maybe?.deep?.value}（沒有丟 TypeError）`)

// 3. 可選鏈的呼叫形式與索引形式
const obj = { fn: null, list: [10, 20] }
line(`   a?.() 與 a?.[i]     ：${obj.fn?.()} / ${obj.list?.[1]}`)

// 4. 空值合併：只有 null 與 undefined 才走右邊，0 與 '' 會被保留。
line(`4. 空值合併 a ?? b      ：0 ?? 99 = ${0 ?? 99}，對照 0 || 99 = ${0 || 99}`)
line(`   這就是 Day 23 那個 0 陷阱的解藥`)

// 5. TypeScript 的可選參數（執行期看不到，這裡只能用註解示意）
line(`5. TS 的 x?: number     ：型別層的東西，編譯後完全消失，Node 看不到`)

// 6. 規格書的 [?Yield, ?Await] 與 Elision opt
line(`6. 規格書的 [?Yield]    ：不是程式碼，是規格書的旗標繼承巨集`)
line('')
line('→ 前四種是 JavaScript 語法，第五種是 TypeScript，第六種根本不是程式碼')
line('→ 看到 ? 先問「這在哪一層」，而不是直接當三元運算子讀')

// ══════════════════════════════════════════════════════════════════
// Part C：Generator 能暫停，但只能往前
// ══════════════════════════════════════════════════════════════════
title('Part C：Generator 為什麼當不了 Fiber')

function * walk (n) {
  for (let i = 0; i < n; i++) {
    yield i                    // 暫停點：把 i 交出去，記住現在走到哪
  }
  return '走完了'
}

const g = walk(3)
line(`第 1 次 next()：${JSON.stringify(g.next())}`)
line(`第 2 次 next()：${JSON.stringify(g.next())}`)
line(`第 3 次 next()：${JSON.stringify(g.next())}`)
line(`第 4 次 next()：${JSON.stringify(g.next())}`)
line(`第 5 次 next()：${JSON.stringify(g.next())}  ← 走完就永遠是 done`)
line('')

// 白話解釋：generator 物件把「執行到哪裡」這個狀態藏在自己內部，
// 而且那個狀態只能往前推進。你沒有辦法叫它「回到第 2 步重跑一次」。
const g2 = walk(3)
g2.next(); g2.next()
line('把一個走到一半的 generator 存起來，想回頭重跑第 1 步：')
line(`  沒有 g.reset()、沒有 g.rewind()、沒有 g.clone()`)
line(`  typeof g2.reset = ${typeof g2.reset}，typeof g2.clone = ${typeof g2.clone}`)
line('  唯一的辦法是 walk(3) 重新建一個，但那樣「已經算過的部分」也一起丟了')
line('')
line('→ React 要的是「暫停、丟棄、重跑、換優先級再跑一次」')
line('→ Generator 只給得起「暫停」這一項，所以 React 自己重寫了一個 stack')

// ══════════════════════════════════════════════════════════════════
// Part D：遞迴 vs Fiber —— 誰讓得出主執行緒
// ══════════════════════════════════════════════════════════════════
title('Part D：真 call stack 停不下來，虛擬 stack frame 可以')

const NODE_COUNT = 20000
const FRAME_BUDGET_MS = 5      // 一格畫面 16.7 毫秒，這裡抓 5 毫秒當預算

// 建一棵二元樹，節點用 child / sibling / return 三個指標串起來，
// 這三個欄位的命名與語意，直接對應 React Fiber。
function buildTree (count) {
  const root = { id: 0, child: null, sibling: null, return: null, pendingProps: 0, memoizedProps: null }
  const all = [root]
  for (let i = 1; i < count; i++) {
    const node = { id: i, child: null, sibling: null, return: null, pendingProps: i, memoizedProps: null }
    const parent = all[(i - 1) >> 1]
    if (!parent.child) {
      parent.child = node
    } else {
      let last = parent.child
      while (last.sibling) last = last.sibling
      last.sibling = node
    }
    node.return = parent
    all.push(node)
  }
  return root
}

// 每個節點要做的「工作」，故意做一點運算讓時間量得出來。
let workSink = 0
function doWork (node) {
  for (let i = 0; i < 260; i++) workSink += (node.id * i) % 7
  node.memoizedProps = node.pendingProps
}

// ── 做法一：遞迴，也就是直接用 CPU 的 call stack ──
// 白話解釋：一旦進去就只能一路跑到堆疊清空，中間沒有任何縫隙可以讓出去。
function renderRecursive (node) {
  if (!node) return
  doWork(node)
  renderRecursive(node.child)
  renderRecursive(node.sibling)
}

// ── 做法二：Fiber，自己把 stack frame 拿在手上 ──
// 白話解釋：用一個 while 迴圈取代遞迴，「現在走到哪」存在 nextUnitOfWork 這個變數裡。
// 因為位置存在變數而不是 CPU 的堆疊上，所以隨時可以 return 出去，之後再從同一個變數接回來。
function createFiberLoop (root) {
  let nextUnitOfWork = root
  let yields = 0

  function performUnitOfWork (fiber) {
    doWork(fiber)
    if (fiber.child) return fiber.child          // 往下
    let node = fiber
    while (node) {
      if (node.sibling) return node.sibling      // 往旁邊
      node = node.return                         // 沒有兄弟就往上回，這就是 return address
    }
    return null
  }

  function workLoop (deadlineMs) {
    const start = performance.now()
    let longest = 0
    while (nextUnitOfWork) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
      const elapsed = performance.now() - start
      if (elapsed >= deadlineMs) {               // 預算用完就讓出去
        yields++
        longest = elapsed
        return { done: false, sliceMs: elapsed }
      }
    }
    return { done: true, sliceMs: performance.now() - start }
  }

  return { workLoop, getYields: () => yields }
}

// 量測一：遞迴版最長一次不中斷跑多久
const treeA = buildTree(NODE_COUNT)
let t = performance.now()
renderRecursive(treeA)
const recursiveMs = performance.now() - t

// 量測二：Fiber 版被切成幾段，每段最長多久
const treeB = buildTree(NODE_COUNT)
const loop = createFiberLoop(treeB)
let slices = []
let res
t = performance.now()
do {
  res = loop.workLoop(FRAME_BUDGET_MS)
  slices.push(res.sliceMs)
} while (!res.done)
const fiberTotalMs = performance.now() - t

const longestSlice = Math.max(...slices)

line(`節點數：${NODE_COUNT.toLocaleString('en-US')}，讓出預算：${FRAME_BUDGET_MS} 毫秒`)
line('')
line(`遞迴版（真 call stack）`)
line(`  總時間            ：${recursiveMs.toFixed(1)} 毫秒`)
line(`  最長不中斷        ：${recursiveMs.toFixed(1)} 毫秒 ← 整段就是一次，中間沒有縫`)
line(`  能讓出主執行緒嗎  ：不能`)
line('')
line(`Fiber 版（自己重寫的 stack）`)
line(`  總時間            ：${fiberTotalMs.toFixed(1)} 毫秒`)
line(`  被切成            ：${slices.length} 段`)
line(`  最長不中斷        ：${longestSlice.toFixed(1)} 毫秒`)
line(`  讓出次數          ：${loop.getYields()} 次`)
line('')
const diff = fiberTotalMs - recursiveMs
line(`→ 總時間：Fiber ${diff >= 0 ? '多花' : '少花'}了 ${Math.abs(diff).toFixed(1)} 毫秒`)
line(`   （Fiber 多了計時與迴圈成本，但少了兩萬次函式呼叫的 stack frame 建立成本，兩者互相抵銷，誰快不一定）`)
line(`→ 真正的重點：「最長不中斷」從 ${recursiveMs.toFixed(1)} 毫秒降到 ${longestSlice.toFixed(1)} 毫秒`)
line('→ 會不會掉幀看的是後者，不是前者。這就是 Fiber 買到的東西')
line(`（workSink = ${workSink}，只是避免引擎把迴圈最佳化掉）`)

// ── 證明 Fiber 版可以中途丟棄重來，遞迴版不行 ──
const treeC = buildTree(2000)
const loop2 = createFiberLoop(treeC)
loop2.workLoop(1)                              // 只跑一小段就停手
line('')
line('中途放棄再重來：')
line(`  Fiber 版：位置存在變數裡，直接丟掉那個變數重新指向 root 就好`)
const loop3 = createFiberLoop(treeC)           // 重新從 root 開始，已完成的節點還在
let r
do { r = loop3.workLoop(50) } while (!r.done)
line(`  重跑完成，root.memoizedProps = ${treeC.memoizedProps}`)
line(`  遞迴版：一旦呼叫下去，除非丟例外否則沒有辦法從外面叫停`)

// ══════════════════════════════════════════════════════════════════
// Part E：pendingProps === memoizedProps 就重用
// ══════════════════════════════════════════════════════════════════
title('Part E：props 就是參數，比對的是參考')

function bailoutCheck (fiber, nextProps) {
  // React 官方文件：「When the incoming pendingProps are equal to memoizedProps,
  // it signals that the fiber's previous output can be reused.」
  return Object.is(fiber.memoizedProps, nextProps)
}

const fiber = { memoizedProps: null }
const props1 = { user: { name: 'Abby' } }
fiber.memoizedProps = props1

line(`傳同一個物件進去  ：${bailoutCheck(fiber, props1)}  → 重用上次的輸出，不重算`)

props1.user.name = 'Bob'                        // 原地改內容
line(`原地改內容再傳    ：${bailoutCheck(fiber, props1)}  → 內容變了，但參考沒變，還是重用`)

const props2 = { ...props1 }
line(`給一個新物件      ：${bailoutCheck(fiber, props2)} → 參考變了，重新算`)
line('')
line('→ 這就是 Day 23 的 Object.is 出現在 Fiber 上的樣子')
line('→ 也是為什麼「props 就是函式的參數」這句話不是比喻，是實作')

line()
line('━'.repeat(64))
line('一個參數走完四層：規格書的 FormalParameter → 引擎的環境紀錄綁定')
line('→ ABI 的 rdi 與 stack frame → Fiber 的 pendingProps 與 return。')
line('━'.repeat(64))
