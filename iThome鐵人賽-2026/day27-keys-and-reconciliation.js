/**
 * day27-keys-and-reconciliation.js
 *
 * 資料真的變了以後，React 怎麼決定哪幾個 DOM 節點該動
 * 照 React v19.3.0 的 reconcileChildrenArray 手寫最小版，並量測 index key 與 id key 的差別
 * 搭配 iThome 鐵人賽 2026 Day 27
 *
 * 執行方式：node day27-keys-and-reconciliation.js
 * 環境：Node.js v18 以上。沒有任何依賴
 *
 * 六個 Part
 *   Part A  照原始碼實作 React 的兩段式比對，逐步印出它在想什麼
 *   Part B  不給 key 不是「沒有 key」，是 key = index（原始碼裡寫得很明白）
 *   Part C  五種列表操作 × 兩種 key，DOM 操作數對照表
 *   Part D  重現那個經典 bug：刪掉第一筆，input 內容全部錯位
 *   Part E  placeChild 的移動判準：為什麼反轉列表幾乎全是移動
 *   Part F  雙緩衝：render 幾千次，每個位置永遠只有兩個 fiber 物件
 */

'use strict'

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------

function 分隔線(title) {
  console.log('\n' + '='.repeat(70))
  console.log(title)
  console.log('='.repeat(70))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

// ============================================================
// Part 0：最小的 fiber 與 DOM 模型
// ============================================================

let fiber流水號 = 0
let DOM節點流水號 = 0
let 建立DOM次數 = 0

/**
 * 假的 DOM 節點
 * 重點在 value 這個欄位：它模擬「沒有被 React 管的狀態」
 * 例如使用者在 <input> 裡打的字、scroll 位置、video 播到第幾秒
 */
function createDOMNode(標籤) {
  DOM節點流水號 += 1
  建立DOM次數 += 1
  return {
    id: `dom#${DOM節點流水號}`,
    標籤,
    props: null,
    value: '',          // ← 使用者打進去的字。React 不知道它的存在
  }
}

/**
 * 最小的 fiber
 * 只留今天用得到的欄位，名字跟 React 原始碼一致
 */
function createFiber(元素) {
  fiber流水號 += 1
  return {
    序號: fiber流水號,
    key: 元素.key,            // null 代表「沒給 key」
    type: 元素.type,
    pendingProps: 元素.props,
    memoizedProps: null,
    index: 0,
    sibling: null,
    alternate: null,          // ← 雙緩衝：指向另一棵樹上的同一個位置
    stateNode: null,          // ← 真正的 DOM 節點
    flags: '',                // 'Placement' 代表要移動或插入
  }
}

/**
 * 對應 React 的 createWorkInProgress
 * 原始碼註解原文：
 *   We use a double buffering pooling technique because we know that we'll
 *   only ever need at most two versions of a tree.
 */
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate
  if (workInProgress === null) {
    // 第一次：真的造一個新 fiber，然後兩邊互指
    workInProgress = createFiber({ key: current.key, type: current.type, props: pendingProps })
    workInProgress.stateNode = current.stateNode      // ← DOM 節點直接沿用，不重建
    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    // 之後：重用上一次那個，只把欄位覆寫掉
    workInProgress.pendingProps = pendingProps
    workInProgress.type = current.type
    workInProgress.flags = ''
    workInProgress.stateNode = current.stateNode      // ← 同上
  }
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.index = current.index
  workInProgress.sibling = current.sibling
  return workInProgress
}

/** 對應 React 的 useFiber：從舊 fiber 複製出 work-in-progress */
function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

// ============================================================
// Part 0.5：照原始碼實作的最小 reconcileChildrenArray
// ============================================================

/**
 * 對應 React 的 mapRemainingChildren
 *
 * 原始碼註解原文（這句是今天整篇文章的關鍵）：
 *   Add the remaining children to a temporary map so that we can find them by
 *   keys quickly. Implicit (null) keys get added to this set with their index
 *   instead.
 */
function mapRemainingChildren(第一個舊fiber) {
  const existingChildren = new Map()
  let existingChild = 第一個舊fiber
  while (existingChild !== null) {
    if (existingChild.key === null) {
      existingChildren.set(existingChild.index, existingChild)   // ← 沒給 key 就用 index 當 key
    } else {
      existingChildren.set(existingChild.key, existingChild)
    }
    existingChild = existingChild.sibling
  }
  return existingChildren
}

/**
 * 對應 React 的 updateSlot
 * 原始碼註解原文：Update the fiber if the keys match, otherwise return null.
 */
function updateSlot(舊fiber, 新元素, 紀錄) {
  const key = 舊fiber !== null ? 舊fiber.key : null
  if (新元素.key === key) {
    if (舊fiber !== null && 舊fiber.type === 新元素.type) {
      紀錄.原地更新 += 1
      return useFiber(舊fiber, 新元素.props)
    }
    // key 對上但 type 不同 → 不能重用，必須拆掉重建
    紀錄.型別不同要重建 += 1
    return null
  }
  return null                        // ← key 對不上，回 null，第一段迴圈就會 break
}

/**
 * 對應 React 的 placeChild
 * 這是「要不要標記成移動」的唯一判準
 */
function placeChild(newFiber, lastPlacedIndex, newIndex, 紀錄) {
  newFiber.index = newIndex
  const current = newFiber.alternate
  if (current !== null) {
    const oldIndex = current.index
    if (oldIndex < lastPlacedIndex) {
      newFiber.flags = 'Placement'            // 這是一次移動
      紀錄.移動 += 1
      return lastPlacedIndex
    }
    return oldIndex                            // 可以留在原地
  }
  newFiber.flags = 'Placement'                 // 這是一次插入
  紀錄.插入 += 1
  return lastPlacedIndex
}

/**
 * 對應 React 的 reconcileChildrenArray
 * 回傳新的 fiber 串列 ＋ 這一輪的操作統計
 */
function reconcileChildrenArray(第一個舊fiber, 新元素們, { 印步驟 = false } = {}) {
  const 紀錄 = { 原地更新: 0, 移動: 0, 插入: 0, 刪除: 0, 型別不同要重建: 0, 走到慢路徑: false }
  let resultingFirstChild = null
  let previousNewFiber = null
  let oldFiber = 第一個舊fiber
  let nextOldFiber = null
  let newIdx = 0
  let lastPlacedIndex = 0

  // ---------- 第一段：同位置逐格比，一對不上就跳出 ----------
  for (; oldFiber !== null && newIdx < 新元素們.length; newIdx += 1) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber
      oldFiber = null
    } else {
      nextOldFiber = oldFiber.sibling
    }
    const newFiber = updateSlot(oldFiber, 新元素們[newIdx], 紀錄)
    if (newFiber === null) {
      if (印步驟) {
        console.log(`    第 ${newIdx} 格：舊 key=${JSON.stringify(oldFiber && oldFiber.key)}`
          + ` 新 key=${JSON.stringify(新元素們[newIdx].key)} → 對不上，跳出快路徑`)
      }
      if (oldFiber === null) oldFiber = nextOldFiber
      break
    }
    if (印步驟) {
      console.log(`    第 ${newIdx} 格：key=${JSON.stringify(新元素們[newIdx].key)} 對上，重用同一個 DOM 節點`)
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, 紀錄)
    if (previousNewFiber === null) resultingFirstChild = newFiber
    else previousNewFiber.sibling = newFiber
    previousNewFiber = newFiber
    oldFiber = nextOldFiber
  }

  // ---------- 新的用完了：剩下的舊的全部刪除 ----------
  if (newIdx === 新元素們.length) {
    while (oldFiber !== null) {
      紀錄.刪除 += 1
      if (印步驟) console.log(`    多出來的舊項目 key=${JSON.stringify(oldFiber.key)} → 刪除`)
      oldFiber = oldFiber.sibling
    }
    return { 第一個: resultingFirstChild, 紀錄 }
  }

  // ---------- 舊的用完了：剩下的新的全部新建 ----------
  if (oldFiber === null) {
    for (; newIdx < 新元素們.length; newIdx += 1) {
      const newFiber = createFiber(新元素們[newIdx])
      newFiber.stateNode = createDOMNode(新元素們[newIdx].type)
      if (印步驟) console.log(`    第 ${newIdx} 格：沒有舊的可用 → 新建 ${newFiber.stateNode.id}`)
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, 紀錄)
      if (previousNewFiber === null) resultingFirstChild = newFiber
      else previousNewFiber.sibling = newFiber
      previousNewFiber = newFiber
    }
    return { 第一個: resultingFirstChild, 紀錄 }
  }

  // ---------- 第二段（慢路徑）：把剩下的舊項目做成 Map，用 key 撈 ----------
  紀錄.走到慢路徑 = true
  const existingChildren = mapRemainingChildren(oldFiber)
  if (印步驟) {
    console.log(`    進入慢路徑，把剩下 ${existingChildren.size} 個舊項目做成 Map`)
    console.log(`    Map 的 key 是：${JSON.stringify([...existingChildren.keys()])}`)
  }

  for (; newIdx < 新元素們.length; newIdx += 1) {
    const 新元素 = 新元素們[newIdx]
    const 查詢用key = 新元素.key === null ? newIdx : 新元素.key
    const 撈到的 = existingChildren.get(查詢用key)

    let newFiber
    if (撈到的 !== undefined && 撈到的.type === 新元素.type) {
      existingChildren.delete(查詢用key)
      newFiber = useFiber(撈到的, 新元素.props)
      紀錄.原地更新 += 1
      if (印步驟) console.log(`    第 ${newIdx} 格：用 key=${JSON.stringify(查詢用key)} 從 Map 撈到，重用 ${newFiber.stateNode.id}`)
    } else {
      newFiber = createFiber(新元素)
      newFiber.stateNode = createDOMNode(新元素.type)
      if (印步驟) console.log(`    第 ${newIdx} 格：Map 裡沒有 key=${JSON.stringify(查詢用key)} → 新建 ${newFiber.stateNode.id}`)
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, 紀錄)
    if (previousNewFiber === null) resultingFirstChild = newFiber
    else previousNewFiber.sibling = newFiber
    previousNewFiber = newFiber
  }

  // ---------- 第三段：Map 裡沒被撈走的，就是被刪掉的 ----------
  existingChildren.forEach((child) => {
    紀錄.刪除 += 1
    if (印步驟) console.log(`    Map 裡剩下 key=${JSON.stringify(child.key)} 沒人要 → 刪除 ${child.stateNode.id}`)
  })

  return { 第一個: resultingFirstChild, 紀錄 }
}

// ------------------------------------------------------------
// 建立列表的輔助工具
// ------------------------------------------------------------

/** 把資料列轉成「元素」陣列。用 index 當 key 的版本就是把 key 傳成 null */
function 建元素們(資料列, 用id當key) {
  return 資料列.map((row, i) => ({
    key: 用id當key ? row.id : null,
    type: 'row',
    props: { 名稱: row.名稱 },
  }))
}

/** 第一次掛載：直接造一串 fiber */
function 首次掛載(元素們) {
  let 第一個 = null
  let 前一個 = null
  元素們.forEach((元素, i) => {
    const f = createFiber(元素)
    f.index = i
    f.memoizedProps = 元素.props
    f.stateNode = createDOMNode(元素.type)
    if (前一個 === null) 第一個 = f
    else 前一個.sibling = f
    前一個 = f
  })
  return 第一個
}

const 串成陣列 = (第一個) => {
  const out = []
  let f = 第一個
  while (f !== null) { out.push(f); f = f.sibling }
  return out
}

const 原始資料 = [
  { id: 'a', 名稱: '春季展' },
  { id: 'b', 名稱: '夏季展' },
  { id: 'c', 名稱: '秋季展' },
  { id: 'd', 名稱: '冬季展' },
  { id: 'e', 名稱: '年度展' },
]

// ============================================================
// Part A：兩段式比對，逐步印出
// ============================================================

function partA() {
  分隔線('Part A：React 的比對分兩段，第一段對不上才進第二段')

  console.log('  React 的 reconcileChildrenArray 是兩段式的：')
  console.log('')
  console.log('    第一段（快路徑）：新舊同位置逐格比 key。一格對不上就 break')
  console.log('    第二段（慢路徑）：把剩下的舊項目做成一個 Map，用 key 去撈')
  console.log('    第三段：Map 裡沒被撈走的，就是真的被刪掉了')
  console.log('')
  console.log('  為什麼要分兩段：第一段是 O(n) 而且不配置 Map，絕大多數更新（只改內容、')
  console.log('  在尾端 append）都能走完第一段。只有順序真的變了才付 Map 的成本。')

  小標('劇本一：只改內容，順序沒變（用 id 當 key）')
  const 樹1 = 首次掛載(建元素們(原始資料, true))
  const 改內容 = 原始資料.map((r) => (r.id === 'c' ? { ...r, 名稱: '秋季展（改名）' } : r))
  const r1 = reconcileChildrenArray(樹1, 建元素們(改內容, true), { 印步驟: true })
  console.log(`    統計：${JSON.stringify(r1.紀錄)}`)
  console.log('    → 五格全部對上，完全沒進慢路徑，沒有任何 DOM 被新建或刪除')

  小標('劇本二：把最後一筆搬到最前面（用 id 當 key）')
  const 樹2 = 首次掛載(建元素們(原始資料, true))
  const 搬到最前 = [原始資料[4], ...原始資料.slice(0, 4)]
  const r2 = reconcileChildrenArray(樹2, 建元素們(搬到最前, true), { 印步驟: true })
  console.log(`    統計：${JSON.stringify(r2.紀錄)}`)
  console.log('    → 第 0 格就對不上（舊的是 a，新的是 e），立刻跳進慢路徑')
  console.log('    → 但慢路徑靠 key 全部撈到了，所以一個 DOM 都沒重建，只是標記移動')
}

// ============================================================
// Part B：不給 key 等於 key = index
// ============================================================

function partB() {
  分隔線('Part B：不給 key 不是「沒有 key」，是 key = index')

  console.log('  這句話不是我推論的，是 mapRemainingChildren 的註解原文：')
  console.log('')
  console.log('    // Add the remaining children to a temporary map so that we can find them by')
  console.log('    // keys quickly. Implicit (null) keys get added to this set with their index')
  console.log('    // instead.')
  console.log('')
  console.log('  對應的程式碼就是這三行：')
  console.log('')
  console.log('    if (existingChild.key === null) {')
  console.log('      existingChildren.set(existingChild.index, existingChild)   // ← 用 index')
  console.log('    } else {')
  console.log('      existingChildren.set(existingChild.key, existingChild)')
  console.log('    }')
  console.log('')
  console.log('  白話解釋這段：沒給 key 的項目，React 拿它的位置當 key 存進 Map。')
  console.log('  所以 key={index} 與完全不寫 key，在比對階段的行為是**一樣的**。')
  console.log('  差別只有一個：不寫 key 在開發模式會被警告，key={index} 不會 ——')
  console.log('  **所以 key={index} 比不寫 key 更危險，因為它把警告關掉了。**')

  小標('實測：刪掉第一筆，兩種 key 的 Map 長什麼樣')
  const 用index = 首次掛載(建元素們(原始資料, false))
  const 用id = 首次掛載(建元素們(原始資料, true))
  console.log(`    index key 版本的 Map key：${JSON.stringify([...mapRemainingChildren(用index).keys()])}`)
  console.log(`    id key 版本的 Map key：   ${JSON.stringify([...mapRemainingChildren(用id).keys()])}`)
  console.log('')
  console.log('    刪掉第一筆之後，新列表的第 0 格想找「key 是 0 的那個」——')
  console.log('    在 index 版本裡，key 0 是原本的第一筆（春季展），它撈到了「錯的那個」。')
  console.log('    在 id 版本裡，第 0 格想找 "b"，撈到的就是夏季展本人。')
}

// ============================================================
// Part C：五種操作 × 兩種 key
// ============================================================

function partC() {
  分隔線('Part C：五種列表操作 × 兩種 key，DOM 操作數對照')

  const 操作們 = [
    ['只改一筆的內容', (d) => d.map((r) => (r.id === 'c' ? { ...r, 名稱: '改過了' } : r))],
    ['在尾端加一筆', (d) => [...d, { id: 'f', 名稱: '新展' }]],
    ['刪掉第一筆', (d) => d.slice(1)],
    ['在最前面插一筆', (d) => [{ id: 'z', 名稱: '插隊' }, ...d]],
    ['整個反轉', (d) => [...d].reverse()],
  ]

  console.log('')
  console.log('| 操作 | key | 原地更新 | 移動 | 插入 | 刪除 | 新建 DOM | 走慢路徑 |')
  console.log('|---|---|---|---|---|---|---|---|')

  for (const [名稱, 變換] of 操作們) {
    for (const 用id of [true, false]) {
      const 樹 = 首次掛載(建元素們(原始資料, 用id))
      const 之前 = 建立DOM次數
      const { 紀錄 } = reconcileChildrenArray(樹, 建元素們(變換(原始資料), 用id))
      const 新建 = 建立DOM次數 - 之前
      console.log(
        `| ${名稱} | ${用id ? 'id' : 'index'} | ${紀錄.原地更新} | ${紀錄.移動} | ${紀錄.插入} | ${紀錄.刪除} | ${新建} | ${紀錄.走到慢路徑 ? '是' : '否'} |`,
      )
    }
  }

  console.log('')
  console.log('  這張表有兩個地方跟直覺不一樣，值得停下來看：')
  console.log('')
  console.log('  a. **「刪掉第一筆」在兩種 key 下，新建 DOM 都是 0。**')
  console.log('     index key 並沒有「重建五個節點」，它重用了全部節點——')
  console.log('     問題不是效能，是**它重用到錯的節點上**。這就是 Part D 那個 bug。')
  console.log('')
  console.log('  b. **「在尾端加一筆」用 index key 反而看起來更漂亮**（沒進慢路徑）。')
  console.log('     這就是為什麼 index key 在很多專案裡看起來沒事：')
  console.log('     只要你只做 append，它真的沒事。出事的是刪除、插入、排序。')
}

// ============================================================
// Part D：重現 input 內容錯位
// ============================================================

function partD() {
  分隔線('Part D：重現那個經典 bug —— 刪掉第一筆，input 內容全部錯位')

  console.log('  劇本：五筆展覽，每筆旁邊有一個 <input> 讓你填備註（沒有受 React 控制）。')
  console.log('  使用者在「夏季展」那一行打了「要訂便當」，然後按下「刪除春季展」。')

  function 跑一次(用id) {
    fiber流水號 = 0
    const 樹 = 首次掛載(建元素們(原始資料, 用id))
    const 節點們 = 串成陣列(樹)

    // 使用者在第 1 列（夏季展）的 input 裡打字
    節點們[1].stateNode.value = '要訂便當'

    console.log(`\n  【${用id ? '用 id 當 key' : '用 index 當 key'}】`)
    console.log('  刪除之前：')
    for (const f of 節點們) {
      console.log(`    ${f.stateNode.id}  ${f.memoizedProps.名稱.padEnd(6)} input=「${f.stateNode.value}」`)
    }

    const { 第一個 } = reconcileChildrenArray(樹, 建元素們(原始資料.slice(1), 用id))
    console.log('  刪除春季展之後：')
    let 錯位 = false
    for (const f of 串成陣列(第一個)) {
      const 標記 = f.stateNode.value !== '' && f.pendingProps.名稱 !== '夏季展' ? '   ← 錯位了' : ''
      if (標記) 錯位 = true
      console.log(`    ${f.stateNode.id}  ${f.pendingProps.名稱.padEnd(6)} input=「${f.stateNode.value}」${標記}`)
    }
    return 錯位
  }

  const index版錯位 = 跑一次(false)
  const id版錯位 = 跑一次(true)

  console.log('')
  console.log(`  index key 版本有錯位嗎：${index版錯位 ? '有' : '沒有'}`)
  console.log(`  id key 版本有錯位嗎：   ${id版錯位 ? '有' : '沒有'}`)
  console.log('')
  console.log('  為什麼會這樣，機制講清楚：')
  console.log('')
  console.log('    a. index key 的情況下，新列表第 0 格要找「key 0」，撈到的是原本第 0 列的 fiber')
  console.log('    b. 那個 fiber 被 useFiber 重用，而 createWorkInProgress 裡有一行：')
  console.log('         workInProgress.stateNode = current.stateNode')
  console.log('       **DOM 節點被原封不動地沿用了**')
  console.log('    c. props 換成了「夏季展」，但那個 DOM 節點上使用者打的字還在原地')
  console.log('    d. 結果：文字內容往上移了一格，input 裡的字沒有移')
  console.log('')
  console.log('  關鍵在於：React 只負責它知道的東西（props、state）。')
  console.log('  **使用者打在 DOM 上的字、scroll 位置、video 播放進度、CSS 動畫進行到一半，')
  console.log('  這些都黏在 DOM 節點上，而 key 決定了哪個 DOM 節點被配給哪一筆資料。**')
  console.log('')
  console.log('  所以 key 不是效能設定，是**身分證**。給錯身分證，資料就會住到別人家。')
}

// ============================================================
// Part E：placeChild 的移動判準
// ============================================================

function partE() {
  分隔線('Part E：placeChild 的移動判準 —— 為什麼反轉幾乎全是移動')

  console.log('  placeChild 的原始碼只有一個判斷：')
  console.log('')
  console.log('    const oldIndex = current.index')
  console.log('    if (oldIndex < lastPlacedIndex) {')
  console.log('      newFiber.flags |= Placement          // This is a move.')
  console.log('      return lastPlacedIndex')
  console.log('    } else {')
  console.log('      return oldIndex                      // This item can stay in place.')
  console.log('    }')
  console.log('')
  console.log('  白話解釋這段：lastPlacedIndex 記著「目前已經安置好的項目裡，最大的舊索引」。')
  console.log('  如果某一項的舊索引比它小，代表它必須往前跨過那些項目 → 標記成移動。')
  console.log('  否則它可以留在原地，並把 lastPlacedIndex 推高。')
  console.log('')
  console.log('  換句話說：React 找的是一段**舊索引遞增的子序列**留在原地，其他全部移動。')
  console.log('  它不做最佳解（最長遞增子序列），只做一次貪心掃描 —— 便宜，但不是最少移動。')

  小標('實測：五筆資料，不同排列方式各要移動幾次（都用 id 當 key）')

  const 排列們 = [
    ['原樣不動', ['a', 'b', 'c', 'd', 'e']],
    ['最後一筆搬到最前', ['e', 'a', 'b', 'c', 'd']],
    ['第一筆搬到最後', ['b', 'c', 'd', 'e', 'a']],
    ['交換相鄰兩筆', ['b', 'a', 'c', 'd', 'e']],
    ['整個反轉', ['e', 'd', 'c', 'b', 'a']],
  ]

  console.log('')
  console.log('| 新順序 | 移動次數 | 留在原地 | 說明 |')
  console.log('|---|---|---|---|')
  for (const [名稱, 順序] of 排列們) {
    const 樹 = 首次掛載(建元素們(原始資料, true))
    const 新資料 = 順序.map((id) => 原始資料.find((r) => r.id === id))
    const { 紀錄 } = reconcileChildrenArray(樹, 建元素們(新資料, true))
    console.log(`| ${順序.join(' ')} | ${紀錄.移動} | ${5 - 紀錄.移動} | ${名稱} |`)
  }

  console.log('')
  console.log('  讀這張表要看的是「同樣是換順序，代價差很多」：')
  console.log('')
  console.log('    a. 「第一筆搬到最後」只要 1 次移動，因為 b c d e 的舊索引 1 2 3 4 本來就遞增')
  console.log('    b. 「整個反轉」要 4 次移動，因為舊索引 4 3 2 1 0 完全反向，找不到遞增的子序列')
  console.log('')
  console.log('  實務上的意義：**如果你的列表有「排序方向切換」的功能，反轉是最貴的那一種。**')
  console.log('  但貴的是移動，不是重建 —— DOM 節點與元件狀態都還在，只是位置被搬動。')
}

// ============================================================
// Part F：雙緩衝
// ============================================================

function partF() {
  分隔線('Part F：雙緩衝 —— render 幾千次，每個位置永遠只有兩個 fiber')

  console.log('  createWorkInProgress 的原始碼註解原文：')
  console.log('')
  console.log('    // We use a double buffering pooling technique because we know that we\'ll')
  console.log('    // only ever need at most two versions of a tree. We pool the "other" unused')
  console.log('    // node that we\'re free to reuse. This is lazily created to avoid allocating')
  console.log('    // extra objects for things that are never updated.')
  console.log('')
  console.log('  白話解釋這段：任何時刻只需要兩棵樹 —— 畫面上那棵（current），')
  console.log('  以及正在算的那棵（work-in-progress）。算完就交換身分，不用丟掉重造。')
  console.log('  兩棵樹上對應的節點用 alternate 互相指著。')

  小標('實測：對同一個列表 render 2000 次，總共造出幾個 fiber 物件')

  for (const 次數 of [1, 2, 10, 2000]) {
    fiber流水號 = 0
    const 元素們 = 建元素們(原始資料, true)
    let 樹 = 首次掛載(元素們)
    for (let i = 0; i < 次數; i += 1) {
      const 改過的 = 原始資料.map((r) => ({ ...r, 名稱: `${r.名稱}#${i}` }))
      const { 第一個 } = reconcileChildrenArray(樹, 建元素們(改過的, true))
      // 交換身分：算完的那棵變成畫面上那棵
      串成陣列(第一個).forEach((f, idx) => { f.index = idx; f.memoizedProps = f.pendingProps })
      樹 = 第一個
    }
    const 每個位置平均 = (fiber流水號 / 原始資料.length).toFixed(2)
    console.log(`  render ${String(次數).padStart(4)} 次 → 總共造出 ${String(fiber流水號).padStart(4)} 個 fiber，`
      + `每個位置平均 ${每個位置平均} 個`)
  }

  console.log('')
  console.log('  不管 render 一次還是兩千次，每個位置永遠只有 2 個 fiber 物件。')
  console.log('  第一次 render 造 1 個，第二次造出它的 alternate，之後就一直在這兩個之間輪替。')
  console.log('')
  console.log('  這也解釋了 Day 23 那張表為什麼寫「React：單向鏈表 ＋ 雙緩衝」：')
  console.log('  React 沒有響應式的攔截層，所以它必須整棵重算；')
  console.log('  既然要整棵重算，就用兩份物件輪替，避免每次 render 都產生一整棵垃圾。')
  console.log('  **省的不是比對時間，是垃圾回收的壓力。**')
}

// ============================================================
// main
// ============================================================

function main() {
  console.log('day27-keys-and-reconciliation.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log('照 React v19.3.0 的 reconcileChildrenArray 手寫，無外部依賴')

  partA()
  partB()
  partC()
  partD()
  partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. React 比對列表分兩段：同位置逐格比 key，對不上才建 Map 走慢路徑')
  console.log('  2. 不給 key 不是沒有 key，是 key = index。原始碼註解寫得很明白')
  console.log('  3. 所以 key={index} 跟不寫 key 行為一樣，但它把開發模式的警告關掉了，更危險')
  console.log('  4. index key 的問題不是效能。刪掉第一筆時它新建 0 個 DOM —— 它重用到錯的節點上')
  console.log('  5. 錯的那一刻在 workInProgress.stateNode = current.stateNode：DOM 節點被沿用')
  console.log('  6. key 不是效能設定，是身分證。給錯身分證，使用者打的字就會住到別人家')
}

main()
