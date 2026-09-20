/**
 * 06-demo-arrow-vs-function-syntax.js
 *
 * 配合筆記：06-every短路求值與初始長度快照-命令式重構為宣告式.md 第二節
 * 執行方式：node 06-demo-arrow-vs-function-syntax.js
 *
 * 目的：把「箭頭函式改寫成一般函式」會踩到的四個錯逐一重現
 *       前三個是 parse 期錯（用 new Function 包起來才不會整支檔案掛掉）
 *       第四個是執行期錯
 */

const line = (t) => console.log('\n' + '─'.repeat(60) + '\n' + t)

/** 用 new Function 把字串丟給 parser，錯誤就抓回來印出，不會炸掉整支程式 */
function tryParse(label, src) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(src)
    console.log(`  ✅ ${label}：parse 通過`)
  } catch (err) {
    console.log(`  ❌ ${label}：${err.name}: ${err.message}`)
  }
}

// ── 錯誤一：刪掉 => 卻沒補 function ──────────────────────────
line('錯誤一：刪掉 => 卻沒補 function（掩護文法定案成括號表達式）')
tryParse(
  '(element){element<40}',
  'const isBeyondThreshold = (element){element<40};'
)
console.log('  說明：parser 讀到 ( 時先套用 CoverParenthesizedExpressionAndArrowParameterList')
console.log('        下一個 token 不是 =>，所以定案成 ParenthesizedExpression')
console.log('        一個表達式後面接 { 文法上接不下去，於是 Unexpected token')

// ── 錯誤二：補了 function 卻忘記 return（安靜的殺手）──────────
line('錯誤二：補了 function 卻忘記 return（不報錯，但答案永遠錯）')

const 忘記return = function (element) { element < 40 }
const 有寫return = function (element) { return element < 40 }

const arrayA = [1, 30, 39, 29, 10, 13]
console.log('  忘記 return 的單次呼叫結果 →', 忘記return(1))          // undefined
console.log('  有寫 return 的單次呼叫結果 →', 有寫return(1))          // true
console.log('  [1,30,39,29,10,13].every(忘記return) →', arrayA.every(忘記return))  // false
console.log('  [1,30,39,29,10,13].every(有寫return) →', arrayA.every(有寫return))  // true
console.log('  說明：undefined 是 falsy，every 第一圈就判定失敗並短路')

// ── 錯誤三：識別碼中間有空白 ────────────────────────────────
line('錯誤三：const array 1 = [...] 識別碼不能含空白')
tryParse('const array 1 = [55,86,64,1,10]', 'const array 1 = [55,86,64,1,10];')
console.log('  說明：array 與 1 被切成兩個 token，宣告語法對不起來')
console.log('        引擎在 parse 階段遇到第一個錯就整段中止，所以你只看到前面那個錯')

// ── 錯誤四：宣告 array1 卻呼叫 array ─────────────────────────
line('錯誤四：宣告的是 array1，呼叫的是 array（執行期 ReferenceError）')
const array1 = [55, 86, 64, 1, 10]
try {
  // eslint-disable-next-line no-undef
  console.log(array.every(有寫return))
} catch (err) {
  console.log(`  ❌ ${err.name}: ${err.message}`)
}

// ── 三種正確寫法，行為完全相同 ──────────────────────────────
line('三種正確寫法：結果必須完全一致')

const 寫法A = (currentValue) => currentValue < 40            // 箭頭函式 concise body
const 寫法B = function (currentValue) { return currentValue < 40 }  // 函式運算式
function 寫法C(currentValue) { return currentValue < 40 }    // 函式宣告

const mdn = [1, 30, 39, 29, 10, 13]
console.log('  寫法A 箭頭函式   →', mdn.every(寫法A))
console.log('  寫法B 函式運算式 →', mdn.every(寫法B))
console.log('  寫法C 函式宣告   →', mdn.every(寫法C))

// ── 命名與條件對不上：兩種都 false，但理由不同 ────────────────
line('命名與條件對不上：你的資料兩種條件都是 false，理由卻不同')

let 圈數 = 0
const r1 = array1.every((v) => { 圈數 += 1; return v < 40 })
console.log(`  [55,86,64,1,10].every(v => v < 40) → ${r1}，只跑了 ${圈數} 圈（第 1 圈 55<40 就短路）`)

圈數 = 0
const r2 = array1.every((v) => { 圈數 += 1; return v > 40 })
console.log(`  [55,86,64,1,10].every(v => v > 40) → ${r2}，跑了 ${圈數} 圈（第 4 圈 1>40 才短路）`)

// ── 邊界：空陣列 ───────────────────────────────────────────
line('邊界：空陣列的 vacuous truth（空真）')
console.log('  [].every(v => v < 40) →', [].every((v) => v < 40))   // true
console.log('  [].some(v => v < 40)  →', [].some((v) => v < 40))    // false
