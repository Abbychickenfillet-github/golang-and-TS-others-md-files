/**
 * Day 5：一堆布林參數 vs Options Object
 * 執行：node day05-options-object.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 重構前：六個位置參數，三個是布林值 ──────────────────────
function createUserPositional(name, email, password, isAdmin, sendWelcomeEmail, skipValidation) {
  return {
    name,
    email,
    password: skipValidation ? password : `hashed(${password})`,
    isAdmin: !!isAdmin,
    welcomeEmailQueued: !!sendWelcomeEmail,
  };
}

// ── 重構後：Options Object，具名 + 預設值 ───────────────────
function createUser({
  name,
  email,
  password,
  isAdmin = false,
  sendWelcomeEmail = true,
  skipValidation = false,
}) {
  return {
    name,
    email,
    password: skipValidation ? password : `hashed(${password})`,
    isAdmin: !!isAdmin,
    welcomeEmailQueued: !!sendWelcomeEmail,
  };
}

line('Part 1｜行為必須一致');

const a = createUserPositional('Abby', 'abby@example.com', 'pw123', false, true, false);
const b = createUser({
  name: 'Abby',
  email: 'abby@example.com',
  password: 'pw123',
  isAdmin: false,
  sendWelcomeEmail: true,
  skipValidation: false,
});
console.log('  位置參數版:', JSON.stringify(a));
console.log('  Options 版:', JSON.stringify(b));
console.log('  一致:', JSON.stringify(a) === JSON.stringify(b) ? '✅' : '❌');

line('Part 2｜順序打亂會怎樣（這是位置參數最危險的地方）');

// 有人不小心把 isAdmin 跟 sendWelcomeEmail 的順序搞反了
const wrongOrder = createUserPositional('Hacker', 'h@example.com', 'pw', true, false, false);
//                                                                      ^^^^ 本來想給 sendWelcomeEmail=true, isAdmin=false
//                                                                           結果變成 isAdmin=true！
console.log('  預期 isAdmin=false, sendWelcomeEmail=true');
console.log('  位置參數版意外結果:', JSON.stringify(wrongOrder));
console.log('  → isAdmin 變成', wrongOrder.isAdmin, '——兩個相鄰布林值交換順序，語法完全合法，行為卻整個錯了');
console.log('  → 而且沒有任何工具會警告你，因為 true/true 都能通過型別檢查');

// Options Object 版本：就算打亂 key 的書寫順序，結果依然正確
const stillCorrect = createUser({
  sendWelcomeEmail: true,
  name: 'Hacker',
  isAdmin: false,
  email: 'h@example.com',
  password: 'pw',
});
console.log('\n  Options 版把 key 順序打亂：', JSON.stringify(stillCorrect));
console.log('  → 依然正確，因為每個值都綁著名字，不是綁著位置');

line('Part 3｜省略可選參數時的差異');

console.log('  位置參數版要省略 isAdmin 但填 sendWelcomeEmail，必須手動補 undefined：');
const positionalSkip = createUserPositional('Bob', 'bob@example.com', 'pw', undefined, true, undefined);
console.log('   ', JSON.stringify(positionalSkip));

console.log('\n  Options 版只需要寫你關心的那個 key：');
const optionsSkip = createUser({ name: 'Bob', email: 'bob@example.com', password: 'pw', sendWelcomeEmail: true });
console.log('   ', JSON.stringify(optionsSkip));
console.log('  → 兩者結果一致，但 Options 版不用數 undefined 佔位');

line('Part 4｜效能差異：解構賦值是不是比較慢？');

const N = 2_000_000;
const args = ['Abby', 'a@x.com', 'pw', false, true, false];
const opts = { name: 'Abby', email: 'a@x.com', password: 'pw', isAdmin: false, sendWelcomeEmail: true, skipValidation: false };

let t0 = performance.now();
for (let i = 0; i < N; i++) createUserPositional(...args);
let t1 = performance.now();
for (let i = 0; i < N; i++) createUser(opts);
let t2 = performance.now();

console.log(`  位置參數版 ${N.toLocaleString()} 次呼叫: ${(t1 - t0).toFixed(1)} ms`);
console.log(`  Options   版 ${N.toLocaleString()} 次呼叫: ${(t2 - t1).toFixed(1)} ms`);
console.log('  差距:', (((t2 - t1) - (t1 - t0)) / (t1 - t0) * 100).toFixed(1) + '%');
console.log('  → V8 對物件解構有做最佳化，這個量級的差異在真實應用裡可忽略不計。');
console.log('    除非是每秒百萬次呼叫的熱路徑，否則不該為了這個理由放棄可讀性。');

console.log('\nNode 版本:', process.version, '\n');
