/**
 * Day 19：低耦合 —— 依賴方向倒過來，模組數增加時改動量會差多少
 * 執行：node day19-low-coupling.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 重構前：useAuth 直接 import 並呼叫每個 store 的 reset() ──────────
function buildAuthModule_before(stores) {
  // 模擬 use-auth.js 的原始碼：每多一個 store，就要多 import 一行、多呼叫一行
  const importLines = stores.map((s) => `import { use${s} } from '@/stores/use${s}'`);
  const callLines = stores.map((s) => `use${s}.getState().reset()`);
  return { importLines, callLines, totalLines: importLines.length + callLines.length };
}

// ── 重構後：useAuth 只 emit 一個事件，完全不認識任何 store ──────────
function buildAuthModule_after() {
  // 不管加幾個 store，use-auth.js 的內容永遠不變
  return {
    importLines: [`import { emitAuthEvent } from '@/lib/auth-events'`],
    callLines: [`emitAuthEvent('logout')`],
    totalLines: 2,
  };
}

line('Part 1｜加 store 時，useAuth 要改幾行');

const scenarios = [
  ['只有 Cart', ['CartStore']],
  ['Cart + Wishlist', ['CartStore', 'WishlistStore']],
  ['Cart + Wishlist + Notification + Recommendation + Recent', ['CartStore', 'WishlistStore', 'NotificationStore', 'RecommendationStore', 'RecentStore']],
];

console.log('  情境'.padEnd(46), '重構前要改的行數'.padEnd(20), '重構後要改的行數');
for (const [label, stores] of scenarios) {
  const before = buildAuthModule_before(stores);
  const after = buildAuthModule_after();
  console.log('  ' + label.padEnd(44), String(before.totalLines).padEnd(20), String(after.totalLines));
}
console.log('\n  重構前：use-auth.js 的改動量隨 store 數量線性成長');
console.log('  重構後：use-auth.js 完全不用改，新 store 自己訂閱事件就好');

line('Part 2｜依賴方向：把 CartStore 的方法改名，看誰會壞掉');

// 模擬重構前：useAuth 直接呼叫 store 的具體方法名稱
function makeStore_withResetMethod() {
  let items = ['item-1', 'item-2'];
  return {
    reset: () => { items = []; return items; },
    getItems: () => items,
  };
}

function logout_before(cartStore) {
  // 直接呼叫具體方法名，方法名一改就炸
  return cartStore.reset();
}

// 模擬重構後：CartStore 自己訂閱 'auth:logout' 事件，內部要叫什麼方法自己決定
const authEventBus = { listeners: {} };
function emitAuthEvent(event) {
  (authEventBus.listeners[event] || []).forEach((fn) => fn());
}
function subscribeAuthEvent(event, fn) {
  authEventBus.listeners[event] = authEventBus.listeners[event] || [];
  authEventBus.listeners[event].push(fn);
}

function makeStore_afterRename() {
  // CartStore 團隊把 reset 改名成 clear，這是 CartStore 自己的內部決定
  let items = ['item-1', 'item-2'];
  const store = {
    clear: () => { items = []; return items; },
    getItems: () => items,
  };
  subscribeAuthEvent('logout', () => store.clear());
  return store;
}

console.log('  情境：CartStore 把 reset() 改名成 clear()（純內部重構，不是刻意搞破壞）\n');

try {
  const cartBefore = makeStore_withResetMethod();
  // 模擬改名後，舊方法已經不存在
  delete cartBefore.reset;
  cartBefore.clear = () => { throw new Error('尚未實作 reset 的呼叫端要跟著改'); };
  logout_before(cartBefore);
  console.log('  重構前（直接呼叫 reset）：未預期地成功');
} catch (e) {
  console.log('  重構前（直接呼叫 reset）： ❌ 壞掉 —— ' + (e.message.includes('is not a function') ? 'cartStore.reset is not a function' : e.message));
}

const cartAfter = makeStore_afterRename();
emitAuthEvent('logout');
console.log('  重構後（emit 事件，CartStore 自己訂閱）： ✅ 正常 —— getItems() =', JSON.stringify(cartAfter.getItems()));

console.log(`
  重構前：useAuth 認識 CartStore 的「實作」（reset 這個方法名）→ 方法名一改，useAuth 就壞
  重構後：useAuth 只認識一個事件名稱的「契約」→ CartStore 內部怎麼實作、方法叫什麼都可以自由改
  這就是「依賴方向倒過來」：從 Auth → Cart 的具體依賴，變成 Cart → Auth 事件的訂閱
`);

line('Part 3｜耦合沒有消失，只是耦合的對象變了');

console.log(`
  重構前耦合的對象：CartStore 的「實作細節」（reset 這個函式名稱、回傳值型別...）
  重構後耦合的對象：一個事件名稱字串 'auth:logout'（這也是一種契約，只是表面積小很多）

  事件名稱該不該濫用，取決於：
    - 事件語意是否清楚穩定（'auth:logout' 幾乎不會變）
    - 訂閱端數量是否可控（不是每個模組都該訂閱每個事件）
`);

console.log('Node 版本:', process.version, '\n');
