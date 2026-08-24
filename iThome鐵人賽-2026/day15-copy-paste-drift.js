/**
 * Day 15：避免程式碼缺乏設計 —— 複製貼上式開發的代價
 * 執行：node day15-copy-paste-drift.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

line('Part 1｜三個路由，各自複製貼上了一份 email 正規化邏輯');

// registerUser：最早寫的版本
function registerEmailNormalize(email) {
  return email.trim().toLowerCase();
}

// loginUser：複製貼上時，覺得「應該用不到 trim」就順手拿掉了
function loginEmailNormalize(email) {
  return email.toLowerCase();
}

// resetPassword：又複製了一次，這次連大小寫都忘記統一
function resetPasswordEmailNormalize(email) {
  return email.trim();
}

const rawInput = ' User@Example.com ';
console.log('  同一個原始輸入：', JSON.stringify(rawInput));
console.log('  register 正規化結果 →', JSON.stringify(registerEmailNormalize(rawInput)));
console.log('  login    正規化結果 →', JSON.stringify(loginEmailNormalize(rawInput)));
console.log('  reset    正規化結果 →', JSON.stringify(resetPasswordEmailNormalize(rawInput)));

const allEqual =
  registerEmailNormalize(rawInput) === loginEmailNormalize(rawInput) &&
  loginEmailNormalize(rawInput) === resetPasswordEmailNormalize(rawInput);
console.log('\n  三處結果一致？', allEqual, allEqual ? '' : '← 這就是行為漂移（behavior drift）');

line('Part 2｜實際模擬一次「註冊成功、卻登入失敗」的 bug');

const fakeDb = new Map();

function register(rawEmail, password) {
  const key = registerEmailNormalize(rawEmail);
  fakeDb.set(key, { password });
  return { status: 'success', storedKey: key };
}

function login(rawEmail, password) {
  const key = loginEmailNormalize(rawEmail);
  const user = fakeDb.get(key);
  if (!user) return { status: 'error', message: '帳號不存在' };
  if (user.password !== password) return { status: 'error', message: '密碼錯誤' };
  return { status: 'success' };
}

const userTypedWhenRegistering = ' User@Example.com ';
const userTypedWhenLoggingIn = ' User@Example.com '; // 同一個人，從信箱複製貼上，帶了頭尾空白

const regResult = register(userTypedWhenRegistering, 'p@ssw0rd');
console.log('  註冊結果：', regResult);

const loginResult = login(userTypedWhenLoggingIn, 'p@ssw0rd');
console.log('  登入結果：', loginResult);
console.log(
  '\n  同一個帳密，註冊成功，登入卻回報「帳號不存在」——因為兩處存取資料庫用的 key 正規化規則不一樣。'
);

line('Part 3｜重構：抽出共用的 normalizeEmail()，三處都改成呼叫它');

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function registerFixed(rawEmail, password, db) {
  const key = normalizeEmail(rawEmail);
  db.set(key, { password });
  return { status: 'success', storedKey: key };
}

function loginFixed(rawEmail, password, db) {
  const key = normalizeEmail(rawEmail);
  const user = db.get(key);
  if (!user) return { status: 'error', message: '帳號不存在' };
  if (user.password !== password) return { status: 'error', message: '密碼錯誤' };
  return { status: 'success' };
}

const fixedDb = new Map();
registerFixed(userTypedWhenRegistering, 'p@ssw0rd', fixedDb);
const fixedLoginResult = loginFixed(userTypedWhenLoggingIn, 'p@ssw0rd', fixedDb);
console.log('  修好之後的登入結果：', fixedLoginResult);

line('Part 4｜量化：正規化規則要改一次（例如要順便去掉全形空白），各自要改幾個地方');

const copyPasteLocations = [
  'registerEmailNormalize（app/register/route.js）',
  'loginEmailNormalize（app/login/route.js）',
  'resetPasswordEmailNormalize（app/reset-password/route.js）',
];
console.log('  複製貼上版：規則變了，要改的地方：');
copyPasteLocations.forEach((l, i) => console.log(`    ${i + 1}. ${l}`));
console.log(`  → 共 ${copyPasteLocations.length} 處，而且很容易漏改（就像 Part 1 那樣）`);

console.log('\n  共用函式版：規則變了，要改的地方：');
console.log('    1. normalizeEmail（lib/normalize-email.js）');
console.log('  → 共 1 處，三個路由自動一起生效');

console.log('\nNode 版本:', process.version, '\n');
