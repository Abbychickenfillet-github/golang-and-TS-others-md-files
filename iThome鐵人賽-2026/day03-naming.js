/**
 * Day 3：命名——名字要能讓人不看實作就猜對
 * 執行：node day03-naming.js
 */
const line = (t) => console.log('\n' + '─'.repeat(60) + '\n' + t + '\n' + '─'.repeat(60));

const now = Date.now();
const DAY = 86400000;

const data = [
  { s: 1, t: now + DAY },      // 有效
  { s: 0, t: now + DAY },      // 狀態不對
  { s: 1, t: now - DAY },      // 過期
];

line('Part 1｜同樣的功能，兩種命名');

// ── 重構前 ──────────────────────────────────────────────
function check(d) {
  const x = d.filter(i => i.s === 1 && i.t > Date.now());
  if (x.length > 0) {
    return true;
  }
  return false;
}

// ── 重構後 ──────────────────────────────────────────────
const STATUS = { ACTIVE: 1, CANCELLED: 0 };

function hasActiveSubscription(subscriptions) {
  const isActive = (sub) => sub.status === STATUS.ACTIVE && sub.expiresAt > Date.now();
  return subscriptions.some(isActive);
}

const subscriptions = data.map(d => ({ status: d.s, expiresAt: d.t }));

console.log('  check(data)                          →', check(data));
console.log('  hasActiveSubscription(subscriptions) →', hasActiveSubscription(subscriptions));
console.log('  行為一致 ?', check(data) === hasActiveSubscription(subscriptions));

console.log(`
  重構前的名字沒有回答任何問題：
    check   → 檢查什麼？回傳什麼？
    d x i s t → 完全是謎，只能去讀實作

  重構後的名字自己回答了三個問題：
    has...  → 回傳布林值
    ...Active... → 在問「有沒有生效中的」
    ...Subscription → 對象是訂閱
`);

line('Part 2｜名字測驗：不看實作，你能答對幾題？');

const quiz = [
  { name: 'check',                 type: '?',    side: '?',   guessable: false },
  { name: 'data',                  type: '?',    side: '-',   guessable: false },
  { name: 'handleIt',              type: '?',    side: '?',   guessable: false },
  { name: 'isActive',              type: 'boolean', side: '無', guessable: true },
  { name: 'hasActiveSubscription', type: 'boolean', side: '無', guessable: true },
  { name: 'canEditPost',           type: 'boolean', side: '無', guessable: true },
  { name: 'getUserById',           type: 'User',    side: '無', guessable: true },
  { name: 'fetchUserById',         type: 'Promise', side: '有網路請求', guessable: true },
  { name: 'saveDraft',             type: 'void/Promise', side: '有寫入', guessable: true },
];

console.log('  名字'.padEnd(26), '回傳型別'.padEnd(16), '有副作用嗎'.padEnd(14), '猜得出來嗎');
for (const q of quiz) {
  console.log('  ' + q.name.padEnd(24), q.type.padEnd(18), q.side.padEnd(16), q.guessable ? '✅' : '❌');
}
console.log('\n  → 好名字讓你不用打開檔案就能做決定，這就是它省下的成本');

line('Part 3｜布林值的四個前綴');

console.log(`
  is___    這個東西「是不是」某狀態      isActive, isEmpty, isLoading
  has___   這個東西「有沒有」某東西      hasPermission, hasError, hasChildren
  can___   「能不能」做某件事            canEdit, canDelete, canRetry
  should__ 「該不該」做某件事            shouldUpdate, shouldRetry

  為什麼重要：這四個前綴等於在名字裡宣告「我回傳 boolean」。
  對照沒有前綴的寫法：

      if (user.permission)     ← permission 是布林？物件？陣列？字串？
      if (user.hasPermission)  ← 一定是布林
`);

const user = { hasPermission: true, permission: { level: 'admin' } };
console.log('  user.permission    →', JSON.stringify(user.permission), ' ← 是物件，if 判斷永遠為真！');
console.log('  user.hasPermission →', user.hasPermission, ' ← 名字保證了型別');
console.log('\n  ⚠️ if (user.permission) 這種寫法在物件情況下永遠成立，是很常見的 bug');

line('Part 4｜什麼時候該把運算式抽成具名變數');

const account = { age: 20, country: 'TW', banned: false, verifiedAt: now - DAY };

// 抽之前
const before = account.age >= 18 && account.country === 'TW' && !account.banned && account.verifiedAt !== null;

// 抽之後
const isAdult          = account.age >= 18;
const isLocalUser      = account.country === 'TW';
const isInGoodStanding = !account.banned && account.verifiedAt !== null;
const canOpenAccount   = isAdult && isLocalUser && isInGoodStanding;

console.log('  抽之前的條件式長度:', String(before).length === 0 ? 0 : 'age >= 18 && country === TW && !banned && verifiedAt !== null'.length, '個字元');
console.log('  結果:', before, '／抽之後:', canOpenAccount, '／一致:', before === canOpenAccount);

console.log(`
  三個「該抽」的訊號：
    a. 條件式裡有兩個以上的 && 或 ||
    b. 同一段運算式在檔案裡出現兩次以上
    c. 你想在上面加註解 → 那句註解就該變成變數名

  第三點是最實用的判準：
      // 檢查是不是成年的本國合格用戶     ← 想寫這行註解
      if (a.age >= 18 && ...) {

      const canOpenAccount = ...          ← 直接讓名字取代註解
      if (canOpenAccount) {
`);

line('Part 5｜什麼時候不該抽');

console.log(`
  [a] 名字沒有增加資訊
      const userName = user.name        ← 多一個變數，零資訊
      直接用 user.name 就好

  [b] 迴圈索引 i / j
      for (let i = 0; ...)              ← 這是全世界通用的慣例
      改成 index 沒有比較好懂，只是比較長

  [c] 領域內大家都懂的縮寫
      id, url, api, db, req, res        ← 這些不用展開
      但 usr, cfg, tmp, mgr 就該展開

  [d] 還在探索階段的程式碼
      名字要等你想清楚它是什麼才取得準
      過早命名會把錯的心智模型固定下來

  [e] 名字裡不要寫型別
      userArray → users                 ← 複數本身就是型別資訊
      strName   → name
      這是匈牙利命名法的遺產，現代有 TypeScript 就不需要了
`);

line('Part 6｜跟 Day 1、Day 2 的關聯');

console.log(`
  Day 1  every()      消除「迴圈的中間狀態」
  Day 2  guard clause 消除「判斷的巢狀層級」
  Day 3  命名          消除「必須去讀實作才懂」這個動作

  三天都在做同一件事：把讀者的認知成本往下壓。

  而且今天的例子剛好用到前兩天的東西：
      return subscriptions.some(isActive)
                          ~~~~~ Day 1 的高階函式
                                ~~~~~~~~ Day 3 的具名條件
  好的命名讓 Day 1 的重構真正發揮效果 ——
  some(isActive) 讀起來像英文句子，some(fn) 就不會。
`);

console.log('Node 版本:', process.version, '\n');
