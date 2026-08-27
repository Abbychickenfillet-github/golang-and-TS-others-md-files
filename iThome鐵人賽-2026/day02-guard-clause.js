/**
 * Day 2：巢狀 if 攤平成 Guard Clause 衛述句
 * 執行：node day02-guard-clause.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));
const user1 ={
  isActive: true,
  membership:{
    level: silver
  }
}
// ── 重構前：四層巢狀 ────────────────────────────────────────
function discountNested(user) {
  if (user) {
    if (user.isActive) {
      if (user.membership) {
        if (user.membership.level === 'gold') {
          return 0.2;
        } else {
          return 0.1;
        }
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}
console.log('discountNested(user1)',discountNested(user1));

// ── 重構後：Guard Clause ───────────────────────────────────
function discountGuard(user) {
  if (!user) return 0;
  if (!user.isActive) return 0;
  if (!user.membership) return 0;

  return user.membership.level === 'gold' ? 0.2 : 0.1;
}

line('Part 1｜行為必須完全一致，這才叫重構');

const cases = [
  ['null',                    null],
  ['undefined',               undefined],
  ['停用的帳號',              { isActive: false }],
  ['啟用但沒有會員資格',      { isActive: true }],
  ['silver 會員',             { isActive: true, membership: { level: 'silver' } }],
  ['gold 會員',               { isActive: true, membership: { level: 'gold' } }],
];

let allSame = true;
console.log('  情境'.padEnd(24), '巢狀版'.padEnd(9), 'Guard版'.padEnd(9), '一致');
for (const [label, input] of cases) {
  const a = discountNested(input);
  const b = discountGuard(input);
  allSame = allSame && a === b;
  console.log('  ' + label.padEnd(22), String(a).padEnd(10), String(b).padEnd(10), a === b ? '✅' : '❌');
}
console.log('\n  全部一致 ?', allSame);
console.log('  → 行為不變、結構改善，這才叫重構。行為變了叫改需求。');

line('Part 2｜量化：縮排深度就是心智堆疊');

const stats = (fn) => {
  const lines = fn.toString().split('\n');
  const maxIndent = Math.max(...lines.map(l => l.match(/^\s*/)[0].length));
  return { lines: lines.length, indent: maxIndent, levels: maxIndent / 2 };
};
const a = stats(discountNested);
const b = stats(discountGuard);

console.log('              最深縮排   縮排層數   總行數');
console.log('  巢狀版      ', String(a.indent + ' 空格').padEnd(11), String(a.levels).padEnd(10), a.lines);
console.log('  Guard 版    ', String(b.indent + ' 空格').padEnd(11), String(b.levels).padEnd(10), b.lines);
console.log(`\n  縮排層數從 ${a.levels} 降到 ${b.levels}，行數少了 ${a.lines - b.lines} 行`);

line('Part 3｜快樂路徑在第幾行');

const happyIndent = (fn) => {
  const l = fn.toString().split('\n').find(x => x.includes('0.2'));
  return l.match(/^\s*/)[0].length;
};
console.log('  快樂路徑（回傳 0.2 那一行）的縮排：');
console.log('    巢狀版  ', happyIndent(discountNested), '空格 ← 被四層檢查包在最裡面');
console.log('    Guard 版', happyIndent(discountGuard), '空格 ← 跟函式本體同一層');
console.log('\n  讀到那一行時，腦中要同時記住幾個條件：');
console.log('    巢狀版   4 個（user 存在 + 啟用 + 有會員 + 是 gold）');
console.log('    Guard 版 1 個（前面都排除完了，只剩等級判斷）');
console.log('\n  快樂路徑（Happy Path）＝ 一切正常時程式該做的事');
console.log('  好維護的程式碼會讓它待在最淺、最顯眼的地方');

line('Part 4｜讀法的差別');

console.log(`
  巢狀版要「由外往內鑽」：
      如果有 user，那麼如果啟用，那麼如果有會員，那麼如果是 gold……
      → 讀到最後一層時，前面四個條件都還壓在腦裡

  Guard 版是「由上往下掃」：
      沒有 user？走人。
      沒啟用？走人。
      沒會員？走人。
      好，剩下的都合格了，算折扣。
      → 每排除一個就可以「忘掉」它，腦中永遠只有一件事
`);

line('Part 5｜什麼時候不該攤平');

console.log(`
  [a] 真正對等的分支，不是驗證
      if (user.type === 'personal') return calcPersonal(user)
      else                          return calcBusiness(user)
      → 兩條路地位相同，硬寫成 guard 會暗示「business 是例外」
      → 判準：guard 適合「排除法」，不適合「分類法」

  [b] 需要收尾清理
      const conn = await db.connect()
      if (!valid) return              // ← 連線沒關就跑掉了
      → 要用 try/finally

  [c] Guard 太多 → 該拆函式了
      七個 guard 不是攤得好，是這個函式管太多事
      → 抽成 validateOrder(order)，主函式只留一個判斷

  [d] 團隊 lint 規則要求單一出口
      → 先照規矩來再提討論，不要自己一個人寫另一種風格
`);

line('Part 6｜跟 Day 1 的關聯');

console.log(`
  Day 1 的 every()  消除的是「迴圈的中間狀態」
  Day 2 的 guard    消除的是「判斷的巢狀層級」

  看起來是兩個技巧，但解的是同一個問題：
      減少「讀的人同時要記住的東西」的數量。

  這就是「好維護」可以被量化的方式 ——
  不是主觀感受，是「腦中要維持幾個狀態」。
`);

console.log('Node 版本:', process.version, '\n');
