/**
 * Day 20：模組化 —— 切分邊界該沿著「行數」還是「會不會一起改」
 * 執行：node day20-modular-design.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

line('Part 1｜深模組 vs 淺模組：介面複雜度 / 藏住的實作複雜度');

// 「深模組」：對外只有一個簡單方法，內部藏了大量邏輯（Ousterhout 的比喻：功能多、介面窄）
const deepOrderRepository = {
  // 公開介面只有 1 個方法
  save(order) {
    // 內部藏著：欄位轉換、SQL 組裝、交易、重試邏輯...（這裡用行數模擬複雜度）
    const rows = 42 // 假設內部實作有 42 行
    return { ok: true, rows }
  },
}

// 「淺模組」：過度切分後，每個模組只是把下一層原封不動 re-export，沒有真的藏住任何東西
const shallowValidateEmail = (email) => isValidEmailFormat(email)
const shallowIsValidEmailFormat = (email) => /.+@.+\..+/.test(email)
function isValidEmailFormat(email) {
  return shallowIsValidEmailFormat(email)
}

function moduleDepth(publicMethodCount, internalLogicLines) {
  // 簡化版指標：內部藏的邏輯行數 ÷ 對外介面的方法數
  // 數字越大，代表這個模組「用一個簡單介面藏住越多複雜度」，越「深」
  return (internalLogicLines / publicMethodCount).toFixed(1)
}

console.log('  模組'.padEnd(20), '對外方法數'.padEnd(12), '內部邏輯行數'.padEnd(14), '深度指標(越大越深)')
console.log('  ' + 'deepOrderRepository'.padEnd(18), String(1).padEnd(12), String(42).padEnd(14), moduleDepth(1, 42))
console.log('  ' + 'shallowValidateEmail 這一層'.padEnd(18), String(1).padEnd(12), String(1).padEnd(14), moduleDepth(1, 1))
console.log(`
  deepOrderRepository：一個 save() 方法藏住 42 行的資料庫細節 → 深度 42，呼叫端完全不用管 SQL 怎麼寫
  shallowValidateEmail：多包一層只是換個名字呼叫下一層 → 深度 1，讀者要多開一個檔案，卻沒少看任何邏輯
  這就是「切太細」的具體症狀：介面數量增加了，但認知負擔沒有下降，甚至因為要跳檔案而上升
`)

line('Part 2｜切分邊界：按行數切 vs 按職責切，改一個需求要碰幾個檔案');

// 情境：訂單模組要處理 驗證 / 算價 / 庫存 / 通知 / 存檔，共 100 行邏輯
// 版本 A：機械式地每 20 行切一個檔案（不管職責）
const byLineCount = {
  'part1.js': ['驗證前半段', '算價前半段'],
  'part2.js': ['驗證後半段', '算價後半段'],
  'part3.js': ['庫存檢查', '通知前半段'],
  'part4.js': ['通知後半段', '存檔'],
}

// 版本 B：沿著「職責」切（同一個原因改變的邏輯放一起）
const byResponsibility = {
  'validateOrder.js': ['驗證前半段', '驗證後半段'],
  'calculatePrice.js': ['算價前半段', '算價後半段'],
  'checkInventory.js': ['庫存檢查'],
  'sendOrderEmail.js': ['通知前半段', '通知後半段'],
  'orderRepository.js': ['存檔'],
}

function filesTouchedBy(structure, changedConcern) {
  return Object.entries(structure)
    .filter(([, concerns]) => concerns.some((c) => c.includes(changedConcern)))
    .map(([file]) => file)
}

const change = '算價' // 模擬「稅率計算規則」改變，屬於「算價」這個關注點
const touchedA = filesTouchedBy(byLineCount, change)
const touchedB = filesTouchedBy(byResponsibility, change)

console.log(`  需求變更：稅率計算規則改變（屬於「${change}」這個關注點）\n`)
console.log('  按行數切（version A）需要修改：', touchedA)
console.log('  按職責切（version B）需要修改：', touchedB)
console.log(`
  按行數切：「算價」邏輯被機械式地拆到 2 個不相關的檔案裡，改一個規則要碰 ${touchedA.length} 個檔案
  按職責切：「算價」邏輯全部在同一個檔案，改一個規則只要碰 ${touchedB.length} 個檔案

  結論：切分邊界該沿著「未來最可能一起改變的東西」，不是沿著行數平分
  這正是 Day 18 高內聚判準的延伸：模組化 = 把「會一起改的東西」放進同一個模組
`)

console.log('Node 版本:', process.version, '\n')
