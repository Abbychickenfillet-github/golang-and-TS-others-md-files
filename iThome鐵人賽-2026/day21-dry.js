/**
 * Day 21：DRY —— 真重複 vs 巧合重複
 * 執行：node day21-dry.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

line('Part 1｜真重複：同一個知識散落兩處，改一個忘記改另一個');

// 重構前：折扣費率（同一個知識）被寫在兩個檔案裡
function calculateMemberDiscount_before(price, level) {
  if (level === 'gold') return price * 0.8
  if (level === 'silver') return price * 0.9
  return price
}
function getDiscountedPrice_before(price, level) {
  // 跟上面是同一個知識，只是另一個檔案的人也寫了一份
  if (level === 'gold') return price * 0.8
  if (level === 'silver') return price * 0.9
  return price
}

console.log('  情境：行銷部把 gold 折扣從 0.8 調整成 0.75，工程師只改了 discount.service.js\n')
function calculateMemberDiscount_afterRateChange(price, level) {
  if (level === 'gold') return price * 0.75 // 只有這裡改了
  if (level === 'silver') return price * 0.9
  return price
}

const a = calculateMemberDiscount_afterRateChange(1000, 'gold')
const b = getDiscountedPrice_before(1000, 'gold') // 忘記改的那份，還停在 0.8
console.log('  discount.service.js 算出來的價格：', a)
console.log('  invoice.service.js  算出來的價格：', b, b !== a ? '❌ 跟上面不一致' : '')
console.log('\n  同一個「折扣費率」知識散落兩處，改一個忘記改另一個 → 兩個地方算出不同的價格')
console.log('  這是「真重複」：兩段程式碼代表同一個決策，該合併成一份')

line('Part 2｜巧合重複：兩段程式碼剛好長得一樣，但代表不同的知識');

// 「使用者註冊」的法定成年判斷，跟「內容分級」的分級年齡，剛好都是 18，長得一模一樣
const checkAge18_shared = (age) => age >= 18
function isAdultForRegistration(age) { return checkAge18_shared(age) }
function canWatchRatedContent(age) { return checkAge18_shared(age) }

console.log('  重構前（各自獨立，即使長得一樣）：')
console.log('    17 歲 註冊資格：', isAdultForRegistration(17))
console.log('    17 歲 觀看分級內容資格：', canWatchRatedContent(17))

console.log('\n  情境：內容分級法規修改，分級年齡上修為 20 歲（但法定成年年齡沒有變，還是 18）')
console.log('  如果貿然把「共用」的 checkAge18_shared 門檻改成 20...\n')

const checkAge20_mergedByMistake = (age) => age >= 20
function isAdultForRegistration_afterMerge(age) { return checkAge20_mergedByMistake(age) }
function canWatchRatedContent_afterMerge(age) { return checkAge20_mergedByMistake(age) }

const testAge = 19
console.log(`  19 歲 觀看分級內容資格：`, canWatchRatedContent_afterMerge(testAge), '（正確：這次法規修改後應該是 false）')
console.log(`  19 歲 註冊資格：`, isAdultForRegistration_afterMerge(testAge), '❌ 錯誤：法定成年年齡沒有改，19 歲應該可以註冊，卻被誤判為不能')

console.log(`
  因為當初把「兩段長得一樣的程式碼」合併成一個共用函式，
  修改其中一個知識（分級年齡）時，意外波及了另一個完全不相關的知識（法定成年年齡）。
  這就是「巧合重複」：程式碼長得像，但代表的是兩個不同的決策，合併是錯的。
`)

line('Part 3｜判準：問「其中一個改變時，另一個「應該」跟著改嗎」');

console.log(`
  真重複（Day21 Part1 的折扣費率）：
    問：如果 gold 折扣率改變，invoice.service.js 那份「應該」跟著改嗎？
    答：應該。→ 合併是對的。

  巧合重複（Day21 Part2 的年齡判斷）：
    問：如果分級年齡改變，法定成年年齡「應該」跟著改嗎？
    答：不應該，兩者是不同的法規、不同的決策單位。→ 合併是錯的。

  DRY 原文定義（Hunt & Thomas, The Pragmatic Programmer）：
  "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."
  重點是「knowledge 知識」不是「syntax 長相」——長得一樣不等於同一個知識。
`)

console.log('Node 版本:', process.version, '\n')
