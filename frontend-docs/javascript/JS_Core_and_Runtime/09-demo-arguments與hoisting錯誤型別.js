/**
 * 09-demo-arguments與hoisting錯誤型別.js
 *
 * 配合筆記：
 *   09-Hoisting-函式宣告vs函式表達式-TDZ.md
 *   JavaScript-函式類型總整理.md
 *
 * 執行方式：node 09-demo-arguments與hoisting錯誤型別.js
 * 環境：Node.js v18 以上，無任何依賴
 *
 * 要驗證四件事
 *   Part 1  提早使用的四種結果：到底丟 ReferenceError 還是 TypeError
 *   Part 2  arguments 不是保留字，是隱式區域變數
 *   Part 3  arguments 是類陣列，不是真陣列（但 ES6 後可迭代）
 *   Part 4  形式參數與 arguments 會重疊：MDN myConcat 逐格拆解
 */

'use strict'

const 分隔線 = (t) => console.log('\n' + '='.repeat(62) + '\n' + t + '\n' + '='.repeat(62))

/** 把一段程式碼丟給 parser／執行，錯誤抓回來印，不炸掉整支檔案 */
function 試跑(標籤, 原始碼) {
  try {
    // eslint-disable-next-line no-new-func
    const 結果 = new Function(原始碼)()
    console.log(`  ${標籤.padEnd(38)} → ${結果}`)
  } catch (err) {
    console.log(`  ${標籤.padEnd(38)} → ${err.name}: ${err.message}`)
  }
}

// ============================================================
// Part 1：提早使用的四種結果
// ============================================================

function part1() {
  分隔線('Part 1：提早使用，到底丟哪一個錯')

  試跑('function foo(){} 然後 foo()',
    'const r = foo(); function foo(){ return "正常執行" } return r')

  試跑('var foo = fn 然後 console.log(foo)',
    'const r = String(foo); var foo = function(){}; return r')

  試跑('var foo = fn 然後 foo()',
    'const r = foo(); var foo = function(){}; return r')

  試跑('const foo = fn 然後 console.log(foo)',
    'const r = String(foo); const foo = function(){}; return r')

  試跑('const foo = fn 然後 foo()',
    'const r = foo(); const foo = function(){}; return r')

  試跑('let foo = fn 然後 foo()',
    'const r = foo(); let foo = function(){}; return r')

  console.log('')
  console.log('  重點一：foo is not a function 是 TypeError，不是 ReferenceError')
  console.log('          而且只有 var 版本、而且是「呼叫」它的時候才會出現')
  console.log('  重點二：const／let 一律 ReferenceError，連 console.log 都會爆')
  console.log('          因為綁定存在但沒初始化，在 TDZ 裡連讀都不准')
  console.log('  重點三：三種寫法的「宣告」全部有提升，差別只在「初始化」被往後挪多遠')
  console.log('          所以「函式表達式不會提升」是錯的說法')
}

// ============================================================
// Part 2：arguments 不是保留字
// ============================================================

function part2() {
  分隔線('Part 2：arguments 是保留字，還是隱式區域變數')

  // 非嚴格模式：可以把它當普通變數蓋掉
  試跑('非嚴格模式 var arguments = 99',
    'return (function(){ var arguments = 99; return arguments })()')

  // 嚴格模式：SyntaxError，但那是嚴格模式的早期錯誤規則
  試跑('嚴格模式 var arguments = 99',
    '"use strict"; return (function(){ var arguments = 99; return arguments })()')

  // 對照組：真正的保留字，連當變數名都不行
  試跑('真保留字 var class = 1（對照組）',
    'var class = 1; return class')

  console.log('')
  console.log('  結論：保留字連當變數名都會 SyntaxError（見對照組）')
  console.log('        arguments 在非嚴格模式下可以被賦值 → 它只是一個普通識別碼')
  console.log('        嚴格模式的 SyntaxError 是 ES5 額外加的早期錯誤規則')
  console.log('        不是因為它升格成保留字')
}

// ============================================================
// Part 3：類陣列，不是真陣列
// ============================================================

function part3() {
  分隔線('Part 3：arguments 是類陣列物件，不是 Array')

  function 探測() {
    return {
      length: arguments.length,
      索引存取: arguments[1],
      有沒有map: typeof arguments.map,
      有沒有push: typeof arguments.push,
      有沒有slice: typeof arguments.slice,
      有沒有forEach: typeof arguments.forEach,
      toString: Object.prototype.toString.call(arguments),
      是Array嗎: Array.isArray(arguments),
      可迭代嗎: typeof arguments[Symbol.iterator],
    }
  }

  console.log(' ', 探測('a', 'b', 'c'))

  console.log('\n  三種轉成真陣列的寫法，結果相同：')
  function 轉陣列() {
    return {
      展開語法: [...arguments],
      ArrayFrom: Array.from(arguments),
      老寫法slice: Array.prototype.slice.call(arguments),
    }
  }
  const r = 轉陣列(1, 2, 3)
  for (const [名稱, 值] of Object.entries(r)) {
    console.log(`    ${名稱.padEnd(12)} → ${JSON.stringify(值)}  isArray=${Array.isArray(值)}`)
  }

  console.log('\n  轉成真陣列之後才能用 Array 的方法：')
  function 加倍() { return [...arguments].map((x) => x * 2) }
  console.log('    加倍(1,2,3) →', 加倍(1, 2, 3))
}

// ============================================================
// Part 4：形式參數與 arguments 會重疊
// ============================================================

function part4() {
  分隔線('Part 4：MDN myConcat —— 形參與 arguments 的重疊')

  function myConcat(separator) {
    console.log(`    形式參數 separator = ${JSON.stringify(separator)}`)
    console.log(`    arguments.length  = ${arguments.length}  ← 實參個數，不是形參個數`)
    for (let i = 0; i < arguments.length; i++) {
      const 註記 = i === 0 ? '  ← 跟 separator 是同一個實參' : ''
      console.log(`    arguments[${i}] = ${JSON.stringify(arguments[i])}${註記}`)
    }
    let result = ''
    for (let i = 1; i < arguments.length; i++) {
      result += arguments[i] + (i < arguments.length - 1 ? separator : '')
    }
    return result
  }

  console.log("  呼叫 myConcat(', ', 'red', 'orange', 'blue')\n")
  const 結果 = myConcat(', ', 'red', 'orange', 'blue')
  console.log(`\n    回傳 → ${JSON.stringify(結果)}`)
  console.log('')
  console.log('    迴圈從 i = 1 開始，是因為索引 0 已經被 separator 拿去當分隔符')
  console.log('    形參只宣告了 1 個，實參卻可以傳 4 個 —— 這就是 MDN 舉這個例子的目的')

  console.log('\n  現代寫法：rest 參數，一行解決而且箭頭函式也能用')
  const 現代版 = (separator, ...items) => items.join(separator)
  console.log("    現代版(', ', 'red', 'orange', 'blue') →", JSON.stringify(現代版(', ', 'red', 'orange', 'blue')))
}

// ============================================================
// Part 5：五種函式類型，誰有 arguments
// ============================================================

function part5() {
  分隔線('Part 5：五種函式類型的比較軸')

  const 列 = (名稱, 有arguments, 能new, prototype型別) =>
    console.log(`  ${名稱.padEnd(30)} arguments:${String(有arguments).padEnd(8)} new:${String(能new).padEnd(6)} prototype:${prototype型別}`)

  const 能不能new = (fn) => { try { new fn(); return true } catch { return false } }

  function 宣告() { return typeof arguments === 'object' }
  const 表達式 = function () { return typeof arguments === 'object' }
  const 物件 = { 簡寫方法() { return typeof arguments === 'object' } }
  function* 產生器() { yield typeof arguments === 'object' }

  列('函式宣告 function foo(){}', 宣告(), 能不能new(宣告), typeof 宣告.prototype)
  列('函式表達式 const=function', 表達式(), 能不能new(表達式), typeof 表達式.prototype)
  列('物件簡寫方法 { foo(){} }', 物件.簡寫方法(), 能不能new(物件.簡寫方法), typeof 物件.簡寫方法.prototype)
  列('Generator function*', 產生器().next().value, 能不能new(產生器), typeof 產生器.prototype)

  const 箭頭 = () => {}
  console.log(`  ${'箭頭函式 () => {}'.padEnd(30)} arguments:沒有自己的  new:${能不能new(箭頭)}   prototype:${typeof 箭頭.prototype}`)

  console.log('')
  console.log('  箭頭函式那一列全是「沒有」，不是四條獨立規定')
  console.log('  是因為它的內部欄位 [[ThisMode]] 是 lexical')
  console.log('  規範裡同一個判斷式同時關掉了 this 綁定與 arguments 物件')
}

// ============================================================
// main
// ============================================================

console.log('09-demo-arguments與hoisting錯誤型別.js')
console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)

part1()
part2()
part3()
part4()
part5()

分隔線('六句話總結')
console.log('  1. 三種宣告的「綁定」全部會提升，差別只在「初始化」往後挪多遠')
console.log('  2. foo is not a function 是 TypeError，只有 var ＋ 呼叫 才會出現')
console.log('  3. const／let 的函式表達式一律 ReferenceError，連 console.log 都不准')
console.log('  4. arguments 不是保留字，是引擎自動建立的隱式區域變數')
console.log('  5. arguments 是類陣列（有 length、可索引、可迭代），但沒有任何 Array 原型方法')
console.log('  6. 箭頭函式沒有 arguments 與 this，是同一個 [[ThisMode]] = lexical 造成的')
