/**
 * Day 4：函式該切多細？從「外部依賴接觸點」量化職責數量
 * 執行：node day04-function-boundary.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 假的外部系統，用來記錄「誰碰了我」───────────────────────
const touchLog = [];
const fakeDb = {
  save: (order) => { touchLog.push('db.save'); return { ...order, id: 1, saved: true }; },
};
const fakeEmail = {
  send: (to, subject) => { touchLog.push('email.send'); return { to, subject, sent: true }; },
};

// ── 重構前：一個函式做完五件事 ──────────────────────────────
function processOrderGod(order) {
  // 1. 驗證
  if (!order.items || order.items.length === 0) {
    throw new Error('訂單沒有商品');
  }
  if (!order.email) {
    throw new Error('缺少 email');
  }

  // 2. 計算金額
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.qty;
  }

  // 3. 套用折扣
  if (order.couponCode === 'VIP10') {
    total = total * 0.9;
  }

  // 4. 寫入資料庫
  const saved = fakeDb.save({ ...order, total });

  // 5. 寄送確認信
  fakeEmail.send(order.email, `訂單確認：NT$${total}`);

  return saved;
}

// ── 重構後：拆成單一職責的小函式 + 協調者 ───────────────────
function validateOrder(order) {
  if (!order.items || order.items.length === 0) throw new Error('訂單沒有商品');
  if (!order.email) throw new Error('缺少 email');
}

function calculateTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function applyDiscount(total, couponCode) {
  return couponCode === 'VIP10' ? total * 0.9 : total;
}

function saveOrder(order, total) {
  return fakeDb.save({ ...order, total });
}

function sendConfirmationEmail(order, total) {
  return fakeEmail.send(order.email, `訂單確認：NT$${total}`);
}

// 協調者：只負責「呼叫順序」，不做任何實際運算
function processOrder(order) {
  validateOrder(order);
  const rawTotal = calculateTotal(order);
  const total = applyDiscount(rawTotal, order.couponCode);
  const saved = saveOrder(order, total);
  sendConfirmationEmail(order, total);
  return saved;
}

line('Part 1｜行為必須完全一致');

const testOrder = {
  email: 'abby@example.com',
  couponCode: 'VIP10',
  items: [
    { price: 100, qty: 2 },
    { price: 50, qty: 1 },
  ],
};

touchLog.length = 0;
const resultGod = processOrderGod({ ...testOrder });
const godTouches = [...touchLog];

touchLog.length = 0;
const resultRefactored = processOrder({ ...testOrder });
const refactoredTouches = [...touchLog];

console.log('  God 版結果:       ', JSON.stringify(resultGod));
console.log('  重構版結果:       ', JSON.stringify(resultRefactored));
console.log('  total 是否一致:   ', resultGod.total === resultRefactored.total ? '✅' : '❌');
console.log('  saved 是否一致:   ', resultGod.saved === resultRefactored.saved ? '✅' : '❌');

line('Part 2｜量化：每個函式碰了幾種外部系統');

const countTouches = (fn, ...args) => {
  touchLog.length = 0;
  try { fn(...args); } catch (e) { /* 驗證失敗屬正常情境 */ }
  return new Set(touchLog).size;
};

console.log('  God 版 processOrderGod 一次碰的外部系統數:', new Set(godTouches).size, '（db + email）');
console.log('');
console.log('  重構版每個小函式各碰幾種外部系統：');
console.log('    validateOrder        →', countTouches(validateOrder, testOrder), '（純邏輯，不碰外部）');
console.log('    calculateTotal       →', countTouches(calculateTotal, testOrder), '（純邏輯，不碰外部）');
console.log('    applyDiscount        →', countTouches(applyDiscount, 100, 'VIP10'), '（純邏輯，不碰外部）');
console.log('    saveOrder            →', countTouches(saveOrder, testOrder, 100), '（只碰 db）');
console.log('    sendConfirmationEmail→', countTouches(sendConfirmationEmail, testOrder, 100), '（只碰 email）');
console.log('\n  God 版一次擁抱 2 個外部系統；拆開後 5 個函式裡有 3 個是 0，其餘 2 個各只碰 1 個。');
console.log('  → 這代表「要幫這段邏輯寫測試，需要 mock 幾樣東西」直接對應職責數量。');

line('Part 3｜行數統計（ESLint max-lines-per-function 的精神）');

const countLines = (fn) => fn.toString().split('\n').length;
console.log('  processOrderGod   :', countLines(processOrderGod), '行');
console.log('  processOrder(協調者):', countLines(processOrder), '行');
console.log('  validateOrder      :', countLines(validateOrder), '行');
console.log('  calculateTotal     :', countLines(calculateTotal), '行');
console.log('  applyDiscount      :', countLines(applyDiscount), '行');
console.log('  saveOrder          :', countLines(saveOrder), '行');
console.log('  sendConfirmationEmail:', countLines(sendConfirmationEmail), '行');

line('Part 4｜過度拆分的代價：追蹤流程要跳幾次');

console.log(`
  God 版：讀者從第一行讀到最後一行，跳 0 次就看完整個流程（但要在腦中同時
  分辨「這一段是驗證、這一段是計算」，沒有函式名字幫忙標記）。

  重構版：讀 processOrder() 本體只需跳 0 次就看懂「流程是什麼」（5 個函式名字
  本身就是目錄），但想知道「折扣怎麼算」要多跳 1 次進 applyDiscount。

  → 拆函式不是零成本。用「函式名字讀起來像目錄」換取「細節要多點一次」。
    這筆交易值不值得，取決於讀者通常只需要知道「流程」還是常常需要鑽進「細節」。
`);

console.log('Node 版本:', process.version, '\n');
