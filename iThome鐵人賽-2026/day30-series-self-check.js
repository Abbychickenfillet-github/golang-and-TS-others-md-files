/**
 * day30-series-self-check.js
 *
 * 把這 30 天的頭條結論，一個指令全部重跑一次
 * 搭配 iThome 鐵人賽 2026 Day 30
 *
 * 執行方式：node day30-series-self-check.js
 * 環境：Node.js v18 以上。**沒有任何依賴**
 *
 * 這支檔案跟前面 29 天的 demo 不一樣：
 * 它不解釋機制（那是前面每一篇的事），它只做一件事 ——
 * **把每一篇的頭條結論寫成一個會自己判斷對錯的斷言，然後印出通過或失敗。**
 *
 * 為什麼要有這支檔案：
 *   整個系列最怕的不是寫錯，是「寫得很有道理但沒人驗證得了」。
 *   所以收尾留下的不是心得，是一支可以重跑的檢查。
 *   它真正的用途是「哪一天它開始不通過」—— 那表示某一條結論過期了，
 *   而你會知道是哪一條，不用重讀 30 篇文章。
 */

'use strict'

// ============================================================
// 檢查框架
// ============================================================

const 檢查們 = []

/**
 * 註冊一個檢查
 * @param {string} 哪一天 對應的那一篇
 * @param {string} 結論    那一篇的頭條結論，用一句話寫
 * @param {Function} 跑    回傳 { 斷言: [[標籤, 實際值, 期望值], ...], 附註?: string }
 */
function 檢查(哪一天, 結論, 跑) {
  檢查們.push({ 哪一天, 結論, 跑 })
}

function 分隔線(title) {
  console.log('\n' + '='.repeat(74))
  console.log(title)
  console.log('='.repeat(74))
}

/** 把值印成人看得懂的形式 */
const 印值 = (v) => {
  if (v === '') return "''（空字串）"
  return typeof v === 'string' ? v : JSON.stringify(v)
}

// ============================================================
// 線一：值與記憶體 —— 「React 只能比參考」
// ============================================================

檢查(
  'Day 4｜相等性四種演算法',
  'Object.is 比的是參考，所以「原地改物件」在 React 眼裡等於沒變',
  () => {
    const 原本 = { sold: 120 }

    // 白話解釋：原地改是同一個物件，所以參考不變
    const 原地改 = 原本
    原地改.sold = 45

    // 白話解釋：展開運算子會產生一個新物件，所以參考一定不同
    const 給新物件 = { ...原本, sold: 45 }

    // 白話解釋：淺複製只換外層，但外層換了參考就已經不同了
    const 淺複製 = { ...原本 }

    return {
      斷言: [
        ['原地改之後還是同一個參考', Object.is(原本, 原地改), true],
        ['給新物件是不同參考', Object.is(原本, 給新物件), false],
        ['淺複製是不同參考', Object.is(原本, 淺複製), false],
      ],
      附註: '所以 React 要你給新物件不是風格要求，是它只有這一種判斷方式',
    }
  },
)

檢查(
  'Day 9｜物件的真面目',
  'in 看整條原型鏈、hasOwnProperty 只看自己、Object.keys 還多要求可列舉',
  () => {
    const 父 = { 繼承來的: 1 }
    const 子 = Object.create(父)
    子.自己的 = 2
    // 白話解釋：用 defineProperty 定義而不給 enumerable，預設就是不可列舉
    Object.defineProperty(子, '不可列舉的', { value: 3, enumerable: false })

    const has = Object.prototype.hasOwnProperty

    return {
      斷言: [
        ['繼承來的：in', '繼承來的' in 子, true],
        ['繼承來的：hasOwnProperty', has.call(子, '繼承來的'), false],
        ['繼承來的：Object.keys', Object.keys(子).includes('繼承來的'), false],
        ['不可列舉的：in', '不可列舉的' in 子, true],
        ['不可列舉的：hasOwnProperty', has.call(子, '不可列舉的'), true],
        ['不可列舉的：Object.keys', Object.keys(子).includes('不可列舉的'), false],
      ],
      附註: '三個分界：要不要走原型鏈、可不可列舉、存不存在',
    }
  },
)

// ============================================================
// 線二：讀原始碼 —— 「借方法來問，不要問物件自己」
// ============================================================

檢查(
  'Day 24｜setState 只有 12 行',
  'config 是外部資料，所以 obj.hasOwnProperty(k) 會被地雷炸掉，React 才寫 .call',
  () => {
    const has = Object.prototype.hasOwnProperty

    // 白話解釋：天真版問物件自己有沒有這個 key，前提是那個物件身上真的有這個方法
    const 天真 = (config) => {
      const out = {}
      for (const k in config) if (config.hasOwnProperty(k)) out[k] = config[k]
      return out
    }
    // 白話解釋：React 版從 Object.prototype 把方法借出來，用 .call 指定「要問誰」
    const 借用 = (config) => {
      const out = {}
      for (const k in config) if (has.call(config, k)) out[k] = config[k]
      return out
    }

    const 地雷一 = { hasOwnProperty: 'oops', title: 'hi' }      // 名字被 prop 佔走了
    const 地雷二 = Object.create(null); 地雷二.title = 'hi'       // 根本沒有原型可以繼承

    /** 跑一次，回傳 'ok' 或錯誤的型別名稱 */
    const 試 = (fn, config) => {
      try { fn(config); return 'ok' } catch (e) { return e.constructor.name }
    }

    return {
      斷言: [
        ['天真版遇到 prop 名叫 hasOwnProperty', 試(天真, 地雷一), 'TypeError'],
        ['天真版遇到 Object.create(null)', 試(天真, 地雷二), 'TypeError'],
        ['借用版遇到 prop 名叫 hasOwnProperty', 試(借用, 地雷一), 'ok'],
        ['借用版遇到 Object.create(null)', 試(借用, 地雷二), 'ok'],
      ],
      附註: '規則不是「一律加 .call」，是「物件在不在自己控制範圍內」',
    }
  },
)

檢查(
  'Day 24｜setState 只有 12 行',
  'setState 自己不改 state、不重繪、不排程，它只把事情丟給 this.updater',
  () => {
    // 照抄 React v19.3.0 ReactBaseClasses.js 的那 12 行（註解省略）
    function setState照抄版(partialState, callback) {
      if (
        typeof partialState !== 'object' &&
        typeof partialState !== 'function' &&
        partialState != null
      ) {
        throw new Error('takes an object of state variables to update or a '
          + 'function which returns an object of state variables.')
      }
      this.updater.enqueueSetState(this, partialState, callback, 'setState')
    }

    const 收到的 = []
    const 元件 = {
      state: { count: 0 },
      // 白話解釋：這個假的 updater 只負責把收到的 patch 記下來，什麼事都不做
      updater: { enqueueSetState(inst, patch) { 收到的.push(patch) } },
      setState: setState照抄版,
    }

    元件.setState({ count: 1 })

    const 丟錯 = (參數) => {
      try { 元件.setState(參數); return false } catch (e) { return true }
    }

    return {
      斷言: [
        ['呼叫之後 this.state 完全沒變', 元件.state.count, 0],
        ['updater 收到了那筆 patch', 收到的.length, 1],
        ['setState(123) 會丟錯', 丟錯(123), true],
        ['setState(null) 不會丟錯', 丟錯(null), false],
      ],
      附註: 'null 被放過是因為條件寫的是 partialState != null（寬鬆比較）',
    }
  },
)

// ============================================================
// 線三：列表與身分 —— 「key 是身分證，不是效能設定」
// ============================================================

檢查(
  'Day 27｜key 不是效能設定是身分證',
  '不給 key 等於 key 用 index，刪掉第一筆會讓使用者打的字留在錯的那一行',
  () => {
    /** 假的 DOM 節點。value 模擬使用者打進去的字 —— 這個值 React 不知道它的存在 */
    const 造節點 = () => ({ value: '' })

    /**
     * 跑一次「使用者在第二列打字 → 刪掉第一筆」
     * 回傳「那串字最後出現在哪一列」
     */
    function 跑(用id當key) {
      const 資料 = [
        { id: 'a', 名稱: '春季展' }, { id: 'b', 名稱: '夏季展' },
        { id: 'c', 名稱: '秋季展' }, { id: 'd', 名稱: '冬季展' },
      ]
      // 首次掛載：每一列配一個 DOM 節點
      const 舊列們 = 資料.map((r, i) => ({
        key: 用id當key ? r.id : i,
        dom: 造節點(),
      }))
      舊列們[1].dom.value = '要訂便當'                      // 使用者在夏季展那行打字

      // 刪掉第一筆，重新配對。白話解釋：這張表就是 React 的 mapRemainingChildren
      const 對照表 = new Map(舊列們.map((r) => [r.key, r]))
      const 新資料 = 資料.slice(1)
      const 新列們 = 新資料.map((r, i) => {
        const 查詢用key = 用id當key ? r.id : i              // ← 整篇的關鍵就是這一行
        const 撈到的 = 對照表.get(查詢用key)
        // 白話解釋：撈到舊的就沿用它的 DOM 節點，撈不到才造新的
        return { 名稱: r.名稱, dom: 撈到的 ? 撈到的.dom : 造節點() }
      })

      const 有字的那列 = 新列們.find((r) => r.dom.value === '要訂便當')
      return 有字的那列 ? 有字的那列.名稱 : '字不見了'
    }

    return {
      斷言: [
        ['用 index 當 key，那串字跑到了', 跑(false), '秋季展'],
        ['用 id 當 key，那串字還在', 跑(true), '夏季展'],
      ],
      附註: '兩種 key 新建的 DOM 數量都是 0 —— 問題不是效能，是配給了錯的資料',
    }
  },
)

// ============================================================
// 線四：遠端資料 —— 「參考穩了，畫面才有機會不動」
// ============================================================

檢查(
  'Day 26｜快取回來後要不要重繪',
  'structural sharing 內容沒變就回傳原本那個物件，但一個 Date 欄位就整包破功',
  () => {
    /** 照 @tanstack/query-core 的 replaceEqualDeep 寫的最小版 */
    function replaceEqualDeep(a, b) {
      if (a === b) return a

      const 是單純陣列 = Array.isArray(a) && Array.isArray(b)
      const 是單純物件 = (v) => Object.prototype.toString.call(v) === '[object Object]'
      // 白話解釋：這一行是守門員 —— 不是單純物件或單純陣列的東西，直接換成新的那份
      if (!是單純陣列 && !(是單純物件(a) && 是單純物件(b))) return b

      const aKeys = 是單純陣列 ? a : Object.keys(a)
      const bKeys = 是單純陣列 ? b : Object.keys(b)
      const copy = 是單純陣列 ? new Array(bKeys.length) : {}
      let 相等的欄位數 = 0

      for (let i = 0; i < bKeys.length; i += 1) {
        const key = 是單純陣列 ? i : bKeys[i]
        const v = replaceEqualDeep(a[key], b[key])
        copy[key] = v
        if (v === a[key]) 相等的欄位數 += 1
      }
      // 白話解釋：欄位數一樣，而且每一欄都判定相等 → 回傳舊的那個 a，新的那份丟掉
      return aKeys.length === bKeys.length && 相等的欄位數 === aKeys.length ? a : copy
    }

    const 舊 = { sold: 120, list: [{ id: 1 }], meta: { page: 1 } }
    const 內容相同的新 = JSON.parse(JSON.stringify(舊))
    const 只改了sold = { ...內容相同的新, sold: 45 }
    const 改完的 = replaceEqualDeep(舊, 只改了sold)

    const 含Date舊 = { sold: 1, at: new Date('2026-01-01') }
    const 含Date新 = { sold: 1, at: new Date('2026-01-01') }

    return {
      斷言: [
        ['純 JSON 內容相同 → 回傳原本那個物件', replaceEqualDeep(舊, 內容相同的新) === 舊, true],
        ['只改一欄 → 外層換新', 改完的 === 舊, false],
        ['只改一欄 → 沒改的 list 仍然共用', 改完的.list === 舊.list, true],
        ['只改一欄 → 沒改的 meta 仍然共用', 改完的.meta === 舊.meta, true],
        ['有一個 Date 欄位 → 整包都不重用', replaceEqualDeep(含Date舊, 含Date新) === 含Date舊, false],
      ],
      附註: '所以在 select 裡把字串轉成 Date，會把整包資料的 structural sharing 關掉',
    }
  },
)

檢查(
  'Day 21｜樂觀更新',
  '樂觀更新買到的是「跨過 100 毫秒那條線」，不是一個倍數',
  () => {
    const 伺服器延遲 = 120            // 這裡刻意縮短，讓這支檢查跑得快
    const t0 = process.hrtime.bigint()
    const 現在 = () => Number(process.hrtime.bigint() - t0) / 1e6

    // 樂觀：在等伺服器之前就先畫
    const 樂觀 = 現在()

    // 白話解釋：用忙等模擬「等伺服器」，這樣整個檢查可以是同步的
    const 截止 = Date.now() + 伺服器延遲
    while (Date.now() < 截止) { /* 等 */ }

    // 悲觀：等完才畫
    const 悲觀 = 現在()

    return {
      斷言: [
        ['樂觀落在 Nielsen 的第一區間（100ms 以內）', 樂觀 < 100, true],
        ['悲觀落在第二區間（超過 100ms）', 悲觀 > 100, true],
      ],
      附註: `實測 ${樂觀.toFixed(4)}ms 對 ${悲觀.toFixed(1)}ms。`
        + '倍數算得出來但沒有意義 —— 分母是同步執行一行程式碼',
    }
  },
)

檢查(
  'Day 21｜樂觀更新',
  '兩個 mutation 同時在飛，整份快照回滾會把別人成功的結果一起抹掉',
  () => {
    let 快取 = { status: 'draft', title: '場地規範' }
    let 資料庫 = { status: 'draft', title: '場地規範' }

    // A：按下發布。先備份整份快取 —— 這就是 context.previous
    const 快照A = 快取
    快取 = { ...快取, status: 'published' }

    // B：改標題。白話解釋：B 的快照裡已經含有 A 還沒確定的樂觀值
    const 快照B = 快取
    快取 = { ...快取, title: '場地規範 v2' }

    // B 成功，真的寫進資料庫，然後 onSuccess 用伺服器回應蓋掉整份快取
    資料庫 = { ...資料庫, title: '場地規範 v2' }
    快取 = { ...資料庫 }

    // A 失敗，把 A 的快照寫回去
    快取 = 快照A

    return {
      斷言: [
        ['A 的快照裡沒有 B 的成功結果', 快照A.title, '場地規範'],
        ['B 真的寫進資料庫了', 資料庫.title, '場地規範 v2'],
        ['但畫面被 A 的回滾打回去了', 快取.title, '場地規範'],
        ['畫面與資料庫一致', 快取.title === 資料庫.title, false],
      ],
      附註: '回滾寫回的是「那個 mutation 開始時的整個世界」，不是「它改的那一欄」'
        + `（B 的快照是 ${快照B.title}，裡面含有 A 的樂觀值 ${快照B.status}）`,
    }
  },
)

// ============================================================
// 線五：上線 —— 「建置時與執行時是兩個時間點」
// ============================================================

檢查(
  'Day 29｜本機正常上線就炸',
  '|| 預設值把「忘了設環境變數」翻譯成「安靜地連去別的地方」',
  () => {
    const 正式環境忘了設 = { DB_PASSWORD: 'prodpass', DB_HOST: 'db.internal' }
    const 正式環境設成空字串 = { DB_USER: '', DB_PASSWORD: 'prodpass', DB_HOST: 'db.internal' }

    /** 白話解釋：掃一遍必要清單，undefined 與空字串都算缺，缺了就不讓服務起來 */
    const 啟動前檢查 = (env) => {
      const 缺的 = ['DB_USER', 'DB_PASSWORD', 'DB_HOST']
        .filter((k) => env[k] === undefined || env[k] === '')
      return 缺的.length === 0 ? '通過' : '擋下來'
    }

    return {
      斷言: [
        ['忘了設：|| 會連去', 正式環境忘了設.DB_USER || 'postgres', 'postgres'],
        ['忘了設：?? 也會連去', 正式環境忘了設.DB_USER ?? 'postgres', 'postgres'],
        ['設成空字串：|| 會連去', 正式環境設成空字串.DB_USER || 'postgres', 'postgres'],
        ['設成空字串：?? 回傳空字串', 正式環境設成空字串.DB_USER ?? 'postgres', ''],
        ['忘了設：啟動前檢查', 啟動前檢查(正式環境忘了設), '擋下來'],
        ['設成空字串：啟動前檢查', 啟動前檢查(正式環境設成空字串), '擋下來'],
      ],
      附註: '所以解法不是把 || 換成 ??，是連線設定根本不該有預設值',
    }
  },
)

檢查(
  'Day 29｜本機正常上線就炸',
  '沒有引號的時候，# 之後會被當成註解砍掉，密碼會被截斷成一半',
  () => {
    /** 照 dotenv 的語意寫的最小版 parser */
    function 解析(內容) {
      const out = {}
      for (const 原行 of 內容.split('\n')) {
        const 行 = 原行.trim()
        if (行 === '' || 行.startsWith('#')) continue
        const i = 行.indexOf('=')
        if (i < 0) continue
        let v = 行.slice(i + 1).trim()
        const 成對雙引號 = v.startsWith('"') && v.endsWith('"') && v.length >= 2
        const 成對單引號 = v.startsWith("'") && v.endsWith("'") && v.length >= 2
        if (成對雙引號 || 成對單引號) {
          v = v.slice(1, -1)                         // 有引號 → 去掉引號，# 保留
        } else {
          const j = v.indexOf('#')
          if (j >= 0) v = v.slice(0, j).trim()       // 沒引號 → # 之後當註解砍掉
        }
        out[行.slice(0, i).trim()] = v
      }
      return out
    }

    const 真密碼 = 'p@ss#w0rd!'
    const r = 解析(`PLAIN=${真密碼}\nQUOTED="${真密碼}"`)

    return {
      斷言: [
        ['沒引號解出來的值', r.PLAIN, 'p@ss'],
        ['沒引號少了幾個字元', 真密碼.length - r.PLAIN.length, 6],
        ['有引號解出來的值', r.QUOTED, 真密碼],
      ],
      附註: '錯誤訊息會是 password authentication failed，但密碼其實是對的',
    }
  },
)

檢查(
  'Day 1、2｜命令式與宣告式',
  'every() 找到第一個 false 就停，所以它不是「全部跑完再判斷」',
  () => {
    const 資料 = [1, 2, 3, 4, 5]

    let every次數 = 0
    // 白話解釋：到 3 的時候 3 < 3 是 false，every 立刻回 false 並停止，不再往後跑
    資料.every((n) => { every次數 += 1; return n < 3 })

    let some次數 = 0
    // 白話解釋：some 相反 —— 找到第一個 true 就停
    資料.some((n) => { some次數 += 1; return n >= 3 })

    let forEach次數 = 0
    資料.forEach(() => { forEach次數 += 1 })

    return {
      斷言: [
        ['every 呼叫次數（第 3 個回 false 就停）', every次數, 3],
        ['some 呼叫次數（第 3 個回 true 就停）', some次數, 3],
        ['forEach 呼叫次數（不會停）', forEach次數, 5],
      ],
      附註: '所以那個 for + break + flag 的版本，換成 every() 不是只有變短，行為也一樣會短路',
    }
  },
)

// ============================================================
// 跑完全部並印表
// ============================================================

function main() {
  console.log('day30-series-self-check.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log('把這 30 天的頭條結論各自重跑一次。沒有任何依賴。')

  分隔線(`開始跑 ${檢查們.length} 個檢查`)

  const 結果們 = []
  let 斷言總數 = 0
  let 斷言通過數 = 0

  for (const c of 檢查們) {
    let 斷言 = []
    let 附註 = ''
    let 錯誤 = null
    try {
      const r = c.跑()
      斷言 = r.斷言
      附註 = r.附註 || ''
    } catch (e) {
      錯誤 = e
    }

    const 逐項 = 斷言.map(([標籤, 實際, 期望]) => ({
      標籤, 實際, 期望, 通過: Object.is(實際, 期望),
    }))
    const 通過 = 錯誤 === null && 逐項.length > 0 && 逐項.every((x) => x.通過)

    斷言總數 += 逐項.length
    斷言通過數 += 逐項.filter((x) => x.通過).length
    結果們.push({ ...c, 逐項, 附註, 通過, 錯誤 })

    console.log(`\n[${通過 ? '通過' : 錯誤 ? '執行失敗' : '不符預期'}] ${c.哪一天}`)
    console.log(`  結論：${c.結論}`)
    if (錯誤) {
      console.log(`  執行時丟出：${錯誤.constructor.name}：${錯誤.message}`)
    } else {
      for (const x of 逐項) {
        const 記號 = x.通過 ? ' ' : '✗'
        const 差異 = x.通過 ? '' : `   ← 期望 ${印值(x.期望)}`
        console.log(`   ${記號} ${x.標籤}：${印值(x.實際)}${差異}`)
      }
      if (附註) console.log(`  附註：${附註}`)
    }
  }

  const 通過的檢查數 = 結果們.filter((r) => r.通過).length

  分隔線('總表')
  console.log('')
  console.log('| 對應的那一篇 | 頭條結論 | 斷言 | 結果 |')
  console.log('|---|---|---|---|')
  for (const r of 結果們) {
    const 通過數 = r.逐項.filter((x) => x.通過).length
    console.log(`| ${r.哪一天} | ${r.結論} | ${通過數}／${r.逐項.length} | ${r.通過 ? '通過' : '**不符預期**'} |`)
  }
  console.log('')
  console.log(`  檢查：${通過的檢查數} ／ ${結果們.length} 通過`)
  console.log(`  斷言：${斷言通過數} ／ ${斷言總數} 通過`)

  console.log('')
  if (通過的檢查數 === 結果們.length) {
    console.log('  全部通過。這代表這 30 天寫出來的每一條頭條結論，在你這台機器上也成立。')
    console.log('')
    console.log('  這支檔案真正的用途不是今天跑一次就好，是**哪一天它開始不通過**：')
    console.log('    那表示 Node、React 或 TanStack Query 改了行為，')
    console.log('    而那一刻你會知道是哪一條結論過期了，不用重讀 30 篇文章。')
  } else {
    console.log('  有檢查不通過。不通過本身就是結論 —— 上面標 ✗ 的那一行就是差異所在。')
  }

  process.exitCode = 通過的檢查數 === 結果們.length ? 0 : 1
}

main()
