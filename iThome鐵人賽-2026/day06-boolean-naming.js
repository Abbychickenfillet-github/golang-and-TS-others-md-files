/**
 * Day 6：布林變數命名 — is/has/can 與正向 vs 負向
 * 執行：node day06-boolean-naming.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 重構前：無前綴 + 雙重否定 ────────────────────────────────
function canSubmitBad(form) {
  const disabled = form.errors.length > 0
  const notReady = !form.touched
  if (!disabled && !notReady) {
    return true
  }
  return false
}

// ── 重構後：is 前綴 + 正向命名 ──────────────────────────────
function canSubmitGood(form) {
  const hasErrors = form.errors.length > 0
  const isTouched = form.touched
  return !hasErrors && isTouched
}

// ── 反例：看起來有 is 前綴，其實還是雙重否定 ─────────────────
function canSubmitFakePositive(form) {
  const isNotDisabled = form.errors.length === 0   // 名字裡藏了一個 "Not"
  const isTouched = form.touched
  return isNotDisabled && isTouched
}

line('Part 1｜行為必須一致');

const cases = [
  ['沒有錯誤、已 touched', { errors: [], touched: true }],
  ['有錯誤、已 touched', { errors: ['required'], touched: true }],
  ['沒有錯誤、未 touched', { errors: [], touched: false }],
  ['有錯誤、未 touched', { errors: ['required'], touched: false }],
];

console.log('  情境'.padEnd(20), 'Bad'.padEnd(7), 'Good'.padEnd(7), 'FakePositive'.padEnd(14), '一致');
let allSame = true;
for (const [label, form] of cases) {
  const bad = canSubmitBad(form);
  const good = canSubmitGood(form);
  const fake = canSubmitFakePositive(form);
  const same = bad === good && good === fake;
  allSame = allSame && same;
  console.log('  ' + label.padEnd(18), String(bad).padEnd(8), String(good).padEnd(8), String(fake).padEnd(15), same ? '✅' : '❌');
}
console.log('\n  三個版本全部一致 ?', allSame);

line('Part 2｜量化：讀懂這個判斷式，腦中要做幾次「邏輯反轉」');

// 數一個函式原始碼裡出現幾次 ! 運算子（不含 !== 這種比較運算子）
const countNegations = (fn) => {
  const src = fn.toString();
  // 匹配單獨的 ! 但排除 !=、!==
  const matches = src.match(/!(?!=)/g) || [];
  return matches.length;
};

console.log('  canSubmitBad          的 ! 出現次數:', countNegations(canSubmitBad), '  ← !form.touched、!disabled、!notReady 三處');
console.log('  canSubmitGood         的 ! 出現次數:', countNegations(canSubmitGood), '  ← 只剩 !hasErrors 這一次，且語意本身就是「沒有錯誤」');
console.log('  canSubmitFakePositive 的 ! 出現次數:', countNegations(canSubmitFakePositive), '  ← 語法上沒有 !，但變數名字裡的 "Not" 起了一樣的認知作用');

console.log(`
  canSubmitBad 讀到 "return true" 那一行前，腦中要做的翻譯：
    !disabled  → 「不是『有錯誤』」 → 「沒有錯誤」          (第 1 次反轉)
    !notReady  → 「不是『還沒準備好』」 → 「準備好了」        (第 2 次反轉)
    兩個反轉完才等於「沒有錯誤 且 準備好了」——這正是 canSubmitGood 直接寫出來的東西。

  canSubmitFakePositive 表面上沒有 !，但 isNotDisabled 這個名字本身
  就要求讀者做一次「isNot... → 其實是...」的翻譯，翻轉的認知成本沒有消失，
  只是從「程式碼裡的 !」搬進了「變數名字裡的 Not」。
`);

line('Part 3｜換一個角度：直接讀出 canSubmitGood 的判斷式');

console.log('  return !hasErrors && isTouched');
console.log('  → 「沒有錯誤，而且已經碰過表單」——念出來就是規格書本身');
console.log('  這正是 Google TotT《Improve Readability With Positive Booleans》的核心主張：');
console.log('  讀健康的程式碼，應該像讀母語書籍一樣輕鬆，不需要在腦中做邏輯代數。');

console.log('\nNode 版本:', process.version, '\n');
