/**
 * Day 16：關注點分離（Separation of Concerns）
 * 執行：node day16-separation-of-concerns.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 版本 A：混雜了 6 種關注點的單一函式 ──────────────────────
async function handleCreateOrderMonolithic(req, res, deps) {
  // 1. HTTP 解析
  const { items, userId, couponCode } = req.body;

  // 2. 業務驗證
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '訂單不能是空的' });
  }
  if (!userId) {
    return res.status(400).json({ error: '缺少使用者 ID' });
  }

  // 3. 金額計算（含折扣）
  let total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (couponCode === 'SAVE100') total -= 100;

  // 4. 資料庫寫入
  const order = await deps.db.orders.insert({ userId, items, total });

  // 5. Email 通知
  const user = await deps.db.users.findById(userId);
  await deps.emailClient.send(user.email, `訂單 #${order.id} 已建立，金額 ${total}`);

  // 6. Log 格式化
  deps.logger(`[ORDER] user=${userId} order=${order.id} total=${total}`);

  res.status(201).json({ orderId: order.id, total });
}

// ── 版本 B：拆成各自獨立的函式 ────────────────────────────
function parseCreateOrderRequest(req) {
  return req.body;
}

function validateOrder({ items, userId }) {
  if (!items || items.length === 0) return '訂單不能是空的';
  if (!userId) return '缺少使用者 ID';
  return null;
}

function calculateOrderTotal(items, couponCode) {
  let total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (couponCode === 'SAVE100') total -= 100;
  return total;
}

async function notifyOrderCreated(emailClient, userEmail, order) {
  await emailClient.send(userEmail, `訂單 #${order.id} 已建立，金額 ${order.total}`);
}

function logOrderCreated(logger, userId, order) {
  logger(`[ORDER] user=${userId} order=${order.id} total=${order.total}`);
}

async function handleCreateOrderSeparated(req, res, deps) {
  const { items, userId, couponCode } = parseCreateOrderRequest(req);

  const errorMessage = validateOrder({ items, userId });
  if (errorMessage) return res.status(400).json({ error: errorMessage });

  const total = calculateOrderTotal(items, couponCode);
  const order = await deps.db.orders.insert({ userId, items, total });

  const user = await deps.db.users.findById(userId);
  await notifyOrderCreated(deps.emailClient, user.email, order);
  logOrderCreated(deps.logger, userId, order);

  res.status(201).json({ orderId: order.id, total });
}

// ── 測試用的假物件 ────────────────────────────────────────
function makeFakeReq(body) {
  return { body };
}
function makeFakeRes() {
  const calls = [];
  return {
    calls,
    status(code) {
      calls.push({ type: 'status', code });
      return this;
    },
    json(payload) {
      calls.push({ type: 'json', payload });
      return this;
    },
  };
}
function makeFakeDeps() {
  const logs = [];
  return {
    db: {
      orders: { insert: async (data) => ({ id: 'order_001', ...data }) },
      users: { findById: async () => ({ email: 'user@example.com' }) },
    },
    emailClient: { send: async () => {} },
    logger: (msg) => logs.push(msg),
    logs,
  };
}

line('Part 1｜行為必須完全一致');

async function run() {
  const sampleReq = makeFakeReq({
    items: [{ price: 300, qty: 2 }, { price: 150, qty: 1 }],
    userId: 'u_001',
    couponCode: 'SAVE100',
  });

  const resA = makeFakeRes();
  const depsA = makeFakeDeps();
  await handleCreateOrderMonolithic(sampleReq, resA, depsA);

  const resB = makeFakeRes();
  const depsB = makeFakeDeps();
  await handleCreateOrderSeparated(sampleReq, resB, depsB);

  console.log('  單一函式版 res.json 結果：', JSON.stringify(resA.calls.find((c) => c.type === 'json').payload));
  console.log('  拆分版　　 res.json 結果：', JSON.stringify(resB.calls.find((c) => c.type === 'json').payload));

  const same =
    JSON.stringify(resA.calls.find((c) => c.type === 'json').payload) ===
    JSON.stringify(resB.calls.find((c) => c.type === 'json').payload);
  console.log('  兩版行為一致？', same);

  line('Part 2｜「改變的理由」有幾種，全部擠在同一個函式裡嗎');

  const changeReasons = [
    ['HTTP 框架換掉（Express → Fastify，req/res 介面不同）', 'handleCreateOrderMonolithic', 'parseCreateOrderRequest'],
    ['驗證規則改變（例如訂單上限改成 50 件）', 'handleCreateOrderMonolithic', 'validateOrder'],
    ['折扣規則改變（例如改成滿千折百）', 'handleCreateOrderMonolithic', 'calculateOrderTotal'],
    ['ORM／資料庫換掉', 'handleCreateOrderMonolithic', '（呼叫端不變，db 由外部注入）'],
    ['Email 服務商換掉（SendGrid → Mailgun）', 'handleCreateOrderMonolithic', 'notifyOrderCreated'],
    ['Log 格式要求改變（要求加上 traceId）', 'handleCreateOrderMonolithic', 'logOrderCreated'],
  ];

  console.log('  單一函式版：以下 6 種改變理由，全部會動到同一個函式：');
  const collided = changeReasons.filter((r) => r[1] === 'handleCreateOrderMonolithic');
  collided.forEach(([reason], i) => console.log(`    ${i + 1}. ${reason}`));
  console.log(`  → ${collided.length} 種不相關的理由，共用 1 個函式`);

  console.log('\n  拆分版：同樣 6 種改變理由，各自對應獨立函式：');
  changeReasons.forEach(([reason, , target]) => console.log(`    - ${reason} → ${target}`));

  line('Part 3｜只想單獨測試「折扣算得對不對」，各版本要準備幾個假物件');

  console.log('  單一函式版，要測 calculateOrderTotal 那段邏輯，必須先準備：');
  const monolithicMocks = ['fake req', 'fake res（含 status/json 鏈式呼叫）', 'fake db.orders.insert', 'fake db.users.findById', 'fake emailClient.send', 'fake logger'];
  monolithicMocks.forEach((m, i) => console.log(`    ${i + 1}. ${m}`));
  console.log(`  → 需要 ${monolithicMocks.length} 個假物件，即使你只關心折扣算對了沒`);

  console.log('\n  拆分版，要測 calculateOrderTotal，只需要：');
  console.log('    （不需要任何假物件，直接呼叫）');
  const testTotal = calculateOrderTotal([{ price: 300, qty: 2 }, { price: 150, qty: 1 }], 'SAVE100');
  console.log(`    calculateOrderTotal(items, 'SAVE100') = ${testTotal}`);
  console.log('  → 需要 0 個假物件');

  console.log('\nNode 版本:', process.version, '\n');
}

run();
