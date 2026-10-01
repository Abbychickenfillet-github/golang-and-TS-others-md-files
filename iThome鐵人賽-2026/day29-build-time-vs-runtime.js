/**
 * day29-build-time-vs-runtime.js
 *
 * 本機正常、正式環境炸掉：幾乎都是「建置時」與「執行時」分不清楚
 * 搭配 iThome 鐵人賽 2026 Day 29
 *
 * 執行方式：node day29-build-time-vs-runtime.js
 * 環境：Node.js v18 以上
 *
 * 依賴：Part A 會試著用 esbuild，Part C 會試著用 dotenv。
 *      兩個都沒裝也跑得起來 —— 我寫了等價的最小替代品，會自動切過去並印出提示。
 *      要跑完整版：npm install esbuild dotenv
 *
 * 六個 Part
 *   Part A  兩個時間點：NEXT_PUBLIC_* 在 build 的時候就被寫死了
 *   Part B  `||` 預設值是「只在正式環境炸」的製造機
 *   Part C  引號到底是誰去掉的：四種解析器，三種答案
 *   Part D  一個 # 字元讓密碼被截斷
 *   Part E  Dockerfile 的 COPY 順序決定 npm ci 要不要重跑
 *   Part F  npm ci 與 npm install 差在哪，--ignore-scripts 擋掉什麼
 */

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')

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

function 安全載入(名稱) {
  try { return require(名稱) } catch (error) { return null }
}

const esbuild = 安全載入('esbuild')
const dotenv = 安全載入('dotenv')

/** 這一輪要用的暫存資料夾 */
const 暫存 = fs.mkdtempSync(path.join(os.tmpdir(), 'day29-'))

// ============================================================
// Part A：兩個時間點
// ============================================================

/**
 * 最小版的「建置時字面值替換」
 * 這就是 Next.js 對 NEXT_PUBLIC_* 做的事，也是 esbuild 的 define、Vite 的 define
 * 白話解釋：在打包的時候，把原始碼裡的 process.env.XXX 這串文字
 *          直接換成當下那個環境變數的「值」，之後檔案裡就再也沒有 process.env 了
 */
function 最小版define(原始碼, 替換表) {
  let out = 原始碼
  for (const [樣板, 值] of Object.entries(替換表)) {
    out = out.split(樣板).join(JSON.stringify(值))
  }
  return out
}

function partA() {
  分隔線('Part A：NEXT_PUBLIC_* 在 build 的時候就被寫死了')

  const 原始碼 = [
    "const 公開的 = process.env.NEXT_PUBLIC_API_URL",
    "const 伺服器的 = process.env.DATABASE_URL",
    "console.log('公開的 =', 公開的)",
    "console.log('伺服器的 =', 伺服器的)",
  ].join('\n')

  console.log('  原始碼（兩行都是 process.env，看起來一模一樣）：')
  console.log('')
  for (const l of 原始碼.split('\n')) console.log('    ' + l)

  // ---- 建置：此刻 NEXT_PUBLIC_API_URL 的值會被寫進產出檔 ----
  const 建置時的值 = 'https://build-time.example.com'
  const 入口 = path.join(暫存, 'app.js')
  const 產出 = path.join(暫存, 'bundle.js')
  fs.writeFileSync(入口, 原始碼)

  if (esbuild) {
    esbuild.buildSync({
      entryPoints: [入口],
      bundle: true,
      outfile: 產出,
      define: { 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(建置時的值) },
      platform: 'node',
      charset: 'utf8',
    })
    console.log(`\n  用真實的 esbuild ${require('esbuild/package.json').version} 打包，define 設成建置時的值`)
  } else {
    fs.writeFileSync(產出, 最小版define(原始碼, { 'process.env.NEXT_PUBLIC_API_URL': 建置時的值 }))
    console.log('\n  （沒有安裝 esbuild，改用我寫的最小版 define，機制一樣）')
  }

  console.log('\n  產出檔的內容：')
  console.log('')
  const 產出內容 = fs.readFileSync(產出, 'utf8').trim()
  // esbuild 會在最前面加一行「來源檔路徑」的註解，那是隨機暫存路徑，印出來只是雜訊
  for (const l of 產出內容.split('\n')) {
    if (l.startsWith('// ') && l.includes('app.js')) continue
    console.log('    ' + l)
  }

  console.log('')
  console.log(`  產出檔裡找得到 "${建置時的值}" 這個字面值嗎：`
    + (fs.readFileSync(產出, 'utf8').includes(建置時的值) ? '找得到' : '找不到'))
  console.log('  產出檔裡還剩下 process.env.NEXT_PUBLIC_API_URL 嗎：'
    + (fs.readFileSync(產出, 'utf8').includes('NEXT_PUBLIC_API_URL') ? '還在' : '不見了'))
  console.log('  產出檔裡還剩下 process.env.DATABASE_URL 嗎：      '
    + (fs.readFileSync(產出, 'utf8').includes('DATABASE_URL') ? '還在' : '不見了'))

  小標('關鍵實測：拿同一個已經建好的檔，改執行時的環境變數再跑兩次')

  const { execFileSync } = require('child_process')
  for (const v of ['https://runtime-A.example.com', 'https://runtime-B.example.com']) {
    const out = execFileSync(process.execPath, [產出], {
      env: { ...process.env, NEXT_PUBLIC_API_URL: v, DATABASE_URL: 'db-' + v },
      encoding: 'utf8',
    })
    console.log(`\n  設定 NEXT_PUBLIC_API_URL=${v}`)
    for (const l of out.trim().split('\n')) console.log('    ' + l)
  }

  console.log('')
  console.log('  **兩次的「公開的」都是 build-time 那個值，一次都沒變。**')
  console.log('  **「伺服器的」每次都跟著環境變數變。**')
  console.log('')
  console.log('  這件事的實務後果，就是那個最常見的部署鬼打牆：')
  console.log('')
  console.log('    你在 Zeabur／Vercel／Railway 的環境變數面板改了 NEXT_PUBLIC_API_URL，')
  console.log('    按下 Restart，打開網站 —— 還是舊的網址。')
  console.log('    你以為是快取，清了瀏覽器快取，還是舊的。')
  console.log('')
  console.log('  因為那個值早在 build 的時候就被寫進 JS 檔了。**Restart 不會重新 build。**')
  console.log('  要改它只有一條路：**重新 build**（在面板上按 Redeploy／Rebuild，不是 Restart）。')
  console.log('')
  console.log('  一句話的判準：')
  console.log('    名字有 NEXT_PUBLIC_ / VITE_ / REACT_APP_ 前綴的 → 建置時，改了要重 build')
  console.log('    沒有前綴、只在伺服器端讀的                    → 執行時，改了重啟就生效')
  console.log('')
  console.log('  順帶一個資安提醒：既然它被寫進 JS 檔，**使用者打開 DevTools 就看得到**。')
  console.log('  所以任何金鑰、密碼、token 都絕對不能放 NEXT_PUBLIC_ 前綴。那個前綴的意思就是「我公開」。')
}

// ============================================================
// Part B：|| 預設值
// ============================================================

/** 她真實專案裡的寫法（簡化） */
function 用or的設定(env) {
  return {
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 5432,
  }
}

/** 改成 ?? */
function 用問號問號的設定(env) {
  return {
    user: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: env.DB_PORT ?? 5432,
  }
}

/** 開機就檢查，缺一個就不准起來 */
function 啟動前檢查(env, 必要的) {
  const 缺的 = 必要的.filter((k) => env[k] === undefined || env[k] === '')
  if (缺的.length > 0) {
    throw new Error(`缺少必要的環境變數：${缺的.join(', ')}`)
  }
  return { user: env.DB_USER, password: env.DB_PASSWORD, host: env.DB_HOST, port: Number(env.DB_PORT) }
}

function partB() {
  分隔線('Part B：`||` 預設值是「只在正式環境炸」的製造機')

  console.log('  背景：我自己踩過這個。正式環境的 log 只有一行')
  console.log('')
  console.log('    FATAL:  password authentication failed for user "postgres"')
  console.log('    DETAIL:  Role "postgres" does not exist.')
  console.log('')
  console.log('  當時查了很久，一直在想「是 Zeabur 的 postgres 設定有問題嗎」。')
  console.log('  不是。問題在我自己這一行：')
  console.log('')
  console.log("    user: process.env.DB_USER || 'postgres'")
  console.log('')
  console.log('  白話解釋這行：如果 DB_USER 是假值（undefined、空字串、0、null），')
  console.log("  就悄悄改用 'postgres'。而正式環境上那個變數剛好沒設到。")

  小標('實測：三種環境變數狀態 × 三種寫法')

  const 情境 = [
    ['本機（.env 有設）', { DB_USER: 'root', DB_PASSWORD: 'devpass', DB_HOST: 'localhost', DB_PORT: '5432' }],
    ['正式（面板忘了加 DB_USER）', { DB_PASSWORD: 'prodpass', DB_HOST: 'db.zeabur.internal', DB_PORT: '5432' }],
    ['正式（DB_USER 打成空字串）', { DB_USER: '', DB_PASSWORD: 'prodpass', DB_HOST: 'db.zeabur.internal', DB_PORT: '5432' }],
  ]

  console.log('')
  console.log('| 情境 | `\\|\\|` 版本連到的 user | `??` 版本連到的 user | 啟動前檢查 |')
  console.log('|---|---|---|---|')
  for (const [名稱, env] of 情境) {
    const a = 用or的設定(env).user
    const b = 用問號問號的設定(env).user
    let c
    try { 啟動前檢查(env, ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']); c = '通過' }
    catch (e) { c = '**開機就擋下來**' }
    console.log(`| ${名稱} | \`${a}\` | \`${b === undefined ? 'undefined' : b}\` | ${c} |`)
  }

  console.log('')
  console.log('  讀這張表的三個重點：')
  console.log('')
  console.log('    a. 第二列就是我那次的狀況。`||` 讓它安靜地連去 postgres，')
  console.log('       所以錯誤訊息長得像「資料庫的問題」，而不是「你忘了設環境變數」')
  console.log('    b. 第三列是更陰的版本：變數**有設**但是空字串。`||` 一樣會掉進預設值，')
  console.log("       而 `??` 只認 undefined 與 null，所以 `??` 會回傳空字串 —— 也是錯的，只是錯得不一樣")
  console.log('    c. 只有「啟動前檢查」會在**部署的那一刻**就失敗，而不是等到有人按下登入才失敗')
  console.log('')
  console.log('  所以結論不是「把 `||` 換成 `??`」，是：')
  console.log('')
  console.log('    **連線設定這種東西不該有預設值。** 缺了就不要讓服務起來。')
  console.log('    預設值的價值是「讓新同事 clone 下來就能跑」，')
  console.log('    但它的代價是「正式環境缺東西的時候不會說」。這個交換在部署階段很不划算。')
}

// ============================================================
// Part C：引號是誰去掉的
// ============================================================

/**
 * 最小版的 dotenv parser
 * 只做三件事：切 KEY=VALUE、去掉成對的引號、沒引號時砍掉 # 之後的東西
 */
function 最小版dotenv(內容) {
  const out = {}
  for (const 原行 of 內容.split('\n')) {
    const 行 = 原行.trim()
    if (行 === '' || 行.startsWith('#')) continue
    const i = 行.indexOf('=')
    if (i < 0) continue
    const key = 行.slice(0, i).trim()
    let value = 行.slice(i + 1).trim()
    const 有雙引號 = value.startsWith('"') && value.endsWith('"') && value.length >= 2
    const 有單引號 = value.startsWith("'") && value.endsWith("'") && value.length >= 2
    if (有雙引號 || 有單引號) {
      value = value.slice(1, -1)            // 成對引號 → 去掉
    } else {
      const j = value.indexOf('#')
      if (j >= 0) value = value.slice(0, j).trim()   // 沒引號 → # 之後算註解
    }
    out[key] = value
  }
  return out
}

/** docker run --env-file 的做法：整行 = 之後的東西原封不動 */
function docker版envfile(內容) {
  const out = {}
  for (const 原行 of 內容.split('\n')) {
    const 行 = 原行.trim()
    if (行 === '' || 行.startsWith('#')) continue
    const i = 行.indexOf('=')
    if (i < 0) continue
    out[行.slice(0, i)] = 行.slice(i + 1)   // ← 不去引號，不砍 #
  }
  return out
}

const 測試用env = [
  'A_PLAIN=abc123',
  'B_DQUOTE="abc123"',
  'C_SQUOTE=\'abc123\'',
  'D_SPACE="hello world"',
  'E_HASH=abc#123',
  'F_HASH_Q="abc#123"',
  'G_EMPTY=',
  'H_PASS="p@ss#w0rd!"',
].join('\n')

function partC() {
  分隔線('Part C：引號到底是誰去掉的 —— 四種解析器，三種答案')

  console.log('  我以前得到的答案是「`process.env` 會自動去除引號」。**這句話是錯的。**')
  console.log('  `process.env` 只是一個物件，它不解析任何東西，只是把字串存起來。')
  console.log('  真正去引號的是**讀那個檔案的人**，而每個人的規矩不一樣。')

  小標('實測一：dotenv 的語意（Next.js、Vite、nodemon 走的都是這一套）')

  const 用真的dotenv = dotenv !== null
  const 解析結果 = 用真的dotenv ? dotenv.parse(測試用env) : 最小版dotenv(測試用env)
  console.log(用真的dotenv
    ? `  （用真實的 dotenv ${require('dotenv/package.json').version}）`
    : '  （沒有安裝 dotenv，改用我寫的最小版，語意一樣）')
  console.log('')
  for (const [k, v] of Object.entries(解析結果)) {
    console.log('    ' + k.padEnd(10) + ' => ' + JSON.stringify(v))
  }

  小標('實測二：同一個檔，換成 docker run --env-file 的規矩')

  const docker結果 = docker版envfile(測試用env)
  console.log('')
  for (const [k, v] of Object.entries(docker結果)) {
    console.log('    ' + k.padEnd(10) + ' => ' + JSON.stringify(v))
  }

  小標('兩邊放在一起看')

  console.log('')
  console.log('| .env 檔裡那一行 | dotenv 解出來 | docker --env-file 解出來 | 一樣嗎 |')
  console.log('|---|---|---|---|')
  for (const 行 of 測試用env.split('\n')) {
    const k = 行.slice(0, 行.indexOf('='))
    const a = JSON.stringify(解析結果[k])
    const b = JSON.stringify(docker結果[k])
    console.log(`| \`${行}\` | \`${a}\` | \`${b}\` | ${a === b ? '一樣' : '**不一樣**'} |`)
  }

  console.log('')
  console.log('  所以「LINE Pay 的環境變數要不要用雙引號包住」這個問題，')
  console.log('  **沒有一個跟環境無關的答案。** 它取決於那一行是誰在讀：')
  console.log('')
  console.log('| 誰在讀 | 成對引號會怎樣 |')
  console.log('|---|---|')
  console.log('| `dotenv` ／ Next.js ／ Vite ／ nodemon | 去掉 |')
  console.log('| `docker compose`（`.env` 與 `env_file`） | 去掉 |')
  console.log('| `docker run --env-file` | **留著，變成值的一部分** |')
  console.log('| shell 的 `export FOO="bar"` | 去掉（是 shell 去的，不是 Node） |')
  console.log('| Zeabur／Vercel 這類面板的輸入框 | **你貼什麼就是什麼**，引號會留著 |')
  console.log('')
  console.log('  這就是那個經典的「本機正常、上線就壞」：')
  console.log('    `.env.development` 寫了引號 → dotenv 幫你去掉 → 本機沒事')
  console.log('    同一串貼到面板或 --env-file → 引號留著 → 送出去的 channelSecret 多了兩個 " → 驗證失敗')
  console.log('')
  console.log('  我自己的實務結論：**面板與 --env-file 一律不要打引號。**')
  console.log('  值裡有空格或 # 的時候，寧願去改程式碼或改值，也不要靠引號。')
}

// ============================================================
// Part D：一個 # 讓密碼被截斷
// ============================================================

function partD() {
  分隔線('Part D：一個 # 字元讓密碼被截斷')

  const 密碼 = 'p@ss#w0rd!'
  const 檔案內容 = [
    `DB_PASSWORD_無引號=${密碼}`.replace('無引號', 'PLAIN'),
    `DB_PASSWORD_有引號="${密碼}"`.replace('有引號', 'QUOTED'),
  ].join('\n')

  const 結果 = dotenv ? dotenv.parse(檔案內容) : 最小版dotenv(檔案內容)

  console.log(`  真正的密碼是：${JSON.stringify(密碼)}`)
  console.log('')
  console.log('  .env 檔裡這樣寫：')
  console.log('')
  for (const l of 檔案內容.split('\n')) console.log('    ' + l)
  console.log('')
  console.log('  dotenv 解出來：')
  console.log('')
  for (const [k, v] of Object.entries(結果)) {
    const 對不對 = v === 密碼 ? '正確' : `**被截斷了**（少了 ${密碼.length - v.length} 個字元）`
    console.log('    ' + k.padEnd(20) + ' => ' + JSON.stringify(v) + '   ' + 對不對)
  }

  console.log('')
  console.log('  原因：沒有引號的時候，`#` 之後的東西被當成註解砍掉了。')
  console.log('  而資料庫給的密碼**很常含有 # 或空格**，因為它是亂數產生的。')
  console.log('')
  console.log('  這個 bug 的惡劣之處在於它的錯誤訊息：')
  console.log('    你會看到 `password authentication failed`，')
  console.log('    然後你去面板把密碼複製貼上再確認一次 —— 密碼明明是對的。')
  console.log('    因為錯的不是密碼，是**你的 .env 檔讀到一半就停了**。')
  console.log('')
  console.log('  一個五秒的檢查方法：在連線之前先印出長度（不要印內容）')
  console.log('')
  console.log("    console.log('DB_PASSWORD 長度 =', (process.env.DB_PASSWORD || '').length)")
  console.log('')
  console.log('  白話解釋這行：只印長度不印值，log 不會外洩密碼，')
  console.log('  但只要長度跟你面板上看到的不一樣，你立刻知道是解析問題不是密碼問題。')
}

// ============================================================
// Part E：Dockerfile 的 COPY 順序
// ============================================================

/** 算一層的快取鍵：上一層的鍵 ＋ 這一層的指令 ＋ 它複製到的檔案內容 */
function 算層鍵(上一層鍵, 指令, 檔案們) {
  const h = crypto.createHash('sha256')
  h.update(上一層鍵).update('\n').update(指令)
  for (const [名稱, 內容] of Object.entries(檔案們)) h.update('\n' + 名稱 + '\n' + 內容)
  return h.digest('hex').slice(0, 12)
}

/** 跑一次建置，回傳每一層的快取鍵 */
function 建置(層們, 專案檔案) {
  let 上一層 = 'FROM node:22-alpine'
  const 結果 = []
  for (const 層 of 層們) {
    const 依賴的檔案 = {}
    for (const f of 層.依賴) 依賴的檔案[f] = 專案檔案[f]
    const 鍵 = 算層鍵(上一層, 層.指令, 依賴的檔案)
    結果.push({ 指令: 層.指令, 鍵 })
    上一層 = 鍵
  }
  return 結果
}

function partE() {
  分隔線('Part E：Dockerfile 的 COPY 順序決定 npm ci 要不要重跑')

  console.log('  Docker 的快取規則只有一句：')
  console.log('    **某一層的輸入變了，那一層以及它後面的每一層，全部重跑。**')
  console.log('  而 `COPY` 那一層的輸入，就是被複製進去的那些檔案的內容。')

  const 專案檔案 = {
    'package.json': '{"dependencies":{"react":"19.3.0"}}',
    'package-lock.json': '{"lockfileVersion":3}',
    'src/App.jsx': 'export default function App(){ return <h1>v1</h1> }',
  }

  const 壞的 = [
    { 指令: 'COPY . .', 依賴: ['package.json', 'package-lock.json', 'src/App.jsx'] },
    { 指令: 'RUN npm ci', 依賴: [] },
    { 指令: 'RUN npm run build', 依賴: [] },
  ]
  const 好的 = [
    { 指令: 'COPY package*.json ./', 依賴: ['package.json', 'package-lock.json'] },
    { 指令: 'RUN npm ci', 依賴: [] },
    { 指令: 'COPY . .', 依賴: ['package.json', 'package-lock.json', 'src/App.jsx'] },
    { 指令: 'RUN npm run build', 依賴: [] },
  ]

  function 比一次(標題, 層們, 改了什麼, 改後檔案) {
    const 前 = 建置(層們, 專案檔案)
    const 後 = 建置(層們, 改後檔案)
    console.log(`\n  【${標題}】改動：${改了什麼}`)
    console.log('')
    console.log('| 第幾層 | 指令 | 快取命中 |')
    console.log('|---|---|---|')
    let 重跑 = 0
    前.forEach((層, i) => {
      const 命中 = 層.鍵 === 後[i].鍵
      if (!命中) 重跑 += 1
      console.log(`| ${i + 1} | \`${層.指令}\` | ${命中 ? '命中' : '**失效，要重跑**'} |`)
    })
    console.log(`\n  重跑的層數：${重跑} ／ ${前.length}`)
    return 重跑
  }

  const 改了程式碼 = { ...專案檔案, 'src/App.jsx': 'export default function App(){ return <h1>v2</h1> }' }

  小標('情境一：只改了一行 React 程式碼（最常見的日常改動）')
  const a = 比一次('壞的順序：先 COPY . . 再 npm ci', 壞的, '把 v1 改成 v2', 改了程式碼)
  const b = 比一次('好的順序：先 COPY package*.json 再 npm ci', 好的, '把 v1 改成 v2', 改了程式碼)

  console.log('')
  console.log(`  壞的順序：**連 npm ci 都要重跑**（${a} 層失效）`)
  console.log(`  好的順序：npm ci 命中快取，只重跑後面兩層（${b} 層失效）`)
  console.log('')
  console.log('  差別就在那一句：`COPY . .` 把「會常常改的原始碼」跟')
  console.log('  「幾乎不會改的 package-lock.json」綁在同一層。')
  console.log('  只要任何一個檔案變了，這一層就失效，後面的 `npm ci` 也跟著失效。')

  小標('情境二：真的改了依賴（動了 package.json）')
  const 改了依賴 = { ...專案檔案, 'package.json': '{"dependencies":{"react":"19.3.1"}}' }
  比一次('好的順序', 好的, '把 react 升到 19.3.1', 改了依賴)
  console.log('')
  console.log('  這時候 npm ci **本來就該重跑**，好的順序並沒有作弊。')
  console.log('  它只是讓「重跑」發生在真的該重跑的時候。')

  console.log('')
  console.log('  要老實說的地方：這裡我算的是**快取鍵**，不是真實的秒數。')
  console.log('  我在這個容器裡沒有可用的 docker daemon，所以量不到實際時間。')
  console.log('  但「哪些層會失效」這件事是 Docker 的規則決定的，跟機器快慢無關。')
}

// ============================================================
// Part F：npm ci 與 npm install
// ============================================================

function partF() {
  分隔線('Part F：npm ci 與 npm install 差在哪，--ignore-scripts 擋掉什麼')

  console.log('  兩個指令最重要的差別不是速度，是**誰說了算**：')
  console.log('')
  console.log('| | `npm install` | `npm ci` |')
  console.log('|---|---|---|')
  console.log('| 以誰為準 | `package.json` 的版本範圍 | **`package-lock.json` 的確切版本** |')
  console.log('| 會不會改 lockfile | **會** | 不會，只讀 |')
  console.log('| `node_modules` 已存在時 | 增量更新 | **整個刪掉重裝** |')
  console.log('| 兩邊對不上時 | 安靜地更新 lockfile | **直接失敗** |')
  console.log('')
  console.log('  最後一列是它在 CI 裡真正的價值。我實際跑過一次：')
  console.log('  lockfile 裡是 dotenv 16.4.5，我只改 package.json 要求 ^17.0.0，然後 npm ci：')
  console.log('')
  console.log('    npm error code EUSAGE')
  console.log('    npm error `npm ci` can only install packages when your package.json and')
  console.log('    npm error package-lock.json or npm-shrinkwrap.json are in sync.')
  console.log('    npm error Invalid: lock file\'s dotenv@16.4.5 does not satisfy dotenv@17.4.2')
  console.log('')
  console.log('  白話解釋這段錯誤：它不是在抱怨版本太舊，是在說「你的兩份清單不一致，')
  console.log('  我不知道該聽誰的，所以我不裝」。')
  console.log('')
  console.log('  **這正是「本機正常、CI 炸掉」的相反面 —— 它讓 CI 早一步炸給你看。**')
  console.log('  如果 CI 用的是 npm install，它會安靜地裝一個跟你本機不一樣的版本，')
  console.log('  然後那個差異會在正式環境以某個莫名其妙的方式出現。')

  小標('--ignore-scripts 擋掉的是什麼')

  console.log('  npm 套件可以在 package.json 裡宣告 preinstall／install／postinstall，')
  console.log('  這些指令會在 `npm install` 的時候**自動執行**，而且是用你的權限。')
  console.log('')
  console.log('  也就是說：`npm ci` 這一個指令，等於同意執行相依樹裡**每一個套件**帶的腳本。')
  console.log('  一個被入侵的套件（或一個被搶註冊的相似名稱）就是在這裡動手的。')
  console.log('')
  console.log('    RUN npm ci --ignore-scripts')
  console.log('')
  console.log('  白話解釋這行：照 lockfile 把檔案裝好，但**不要執行任何套件自己的安裝腳本**。')
  console.log('')
  console.log('  代價要講清楚：有些套件（sharp、bcrypt、esbuild、Playwright 這類含原生二進位檔的）')
  console.log('  真的需要 postinstall 才能下載對應平台的檔案。加了這個旗標它們會壞掉。')
  console.log('  實務上的做法是**預設加上，壞掉的那幾個再個別處理**，')
  console.log('  而不是因為有幾個需要就整包放行。')
}

// ============================================================
// main
// ============================================================

function main() {
  console.log('day29-build-time-vs-runtime.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log(`esbuild ${esbuild ? require('esbuild/package.json').version : '未安裝（用最小替代品）'}`
    + `｜dotenv ${dotenv ? require('dotenv/package.json').version : '未安裝（用最小替代品）'}`)

  partA()
  partB()
  partC()
  partD()
  partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. NEXT_PUBLIC_* 在 build 的時候就被寫成字面值了，改面板再 Restart 沒有用，要 Rebuild')
  console.log('  2. 同一個理由，任何祕密都不能放 NEXT_PUBLIC_ 前綴 —— 那個前綴的意思就是「我公開」')
  console.log('  3. 連線設定不該有 `||` 預設值。缺了就不要讓服務起來，讓它在部署那一刻炸')
  console.log('  4. 去引號的不是 process.env，是讀檔案的那個人。docker run --env-file 不去引號')
  console.log('  5. 沒有引號的時候 # 之後會被當註解砍掉，密碼會被截斷成一半')
  console.log('  6. 先 COPY package*.json 再 npm ci，最後才 COPY . . —— 順序決定快取命不命中')

  // 收尾：清掉暫存資料夾
  try { fs.rmSync(暫存, { recursive: true, force: true }) } catch (error) { /* 清不掉就算了 */ }
}

main()
