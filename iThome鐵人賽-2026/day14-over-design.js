/**
 * Day 14：避免過度設計（over-design）
 * 執行：node day14-over-design.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 版本 A：過度設計 —— 策略模式 + 工廠，但只有一種實作 ──────
class DiscountStrategy {
  calculate(_amount) {
    throw new Error('not implemented');
  }
}

class FixedAmountDiscountStrategy extends DiscountStrategy {
  constructor(discountAmount) {
    super();
    this.discountAmount = discountAmount;
  }
  calculate(amount) {
    if (globalThis.__probe) recordStack();
    return Math.max(0, amount - this.discountAmount);
  }
}

class DiscountStrategyFactory {
  static create(type, config) {
    switch (type) {
      case 'fixed':
        return new FixedAmountDiscountStrategy(config.amount);
      default:
        throw new Error(`Unknown discount type: ${type}`);
    }
  }
}

function calcOverDesigned(amount, discountAmount) {
  const strategy = DiscountStrategyFactory.create('fixed', { amount: discountAmount });
  return strategy.calculate(amount);
}

// ── 版本 B：精簡版 —— 一個函式 ────────────────────────────
function calcSimple(amount, discountAmount) {
  if (globalThis.__probe) recordStack();
  return Math.max(0, amount - discountAmount);
}

line('Part 1｜行為必須完全一致');
const cases = [
  [500, 100],
  [50, 100],
  [1000, 0],
  [999, 999],
];
let allSame = true;
console.log('  金額'.padEnd(10), '折扣'.padEnd(8), '過度設計版'.padEnd(12), '精簡版'.padEnd(10), '一致');
for (const [amount, discount] of cases) {
  const a = calcOverDesigned(amount, discount);
  const b = calcSimple(amount, discount);
  allSame = allSame && a === b;
  console.log('  ' + String(amount).padEnd(10), String(discount).padEnd(8), String(a).padEnd(14), String(b).padEnd(12), a === b ? '✅' : '❌');
}
console.log('\n  全部一致？', allSame);

line('Part 2｜量化一：真正做事的那一行，stack 深度多了幾層');

let deepStack = null;
function recordStack() {
  deepStack = new Error().stack.split('\n').length;
}
function measureDepth(fn) {
  globalThis.__probe = true;
  fn();
  globalThis.__probe = false;
  return deepStack;
}

const depthOverDesigned = measureDepth(() => calcOverDesigned(500, 100));
const depthSimple = measureDepth(() => calcSimple(500, 100));

console.log('  過度設計版：呼叫到「真正做計算」那一行時，stack 深度 =', depthOverDesigned);
console.log('  精簡版　　：呼叫到「真正做計算」那一行時，stack 深度 =', depthSimple);
console.log(`\n  差了 ${depthOverDesigned - depthSimple} 層 —— 這其實不多。`);
console.log('  說明：過度設計的代價通常不在 runtime 效能，是在「人要多打開幾個定義才看得懂」。');

line('Part 3｜量化二：要打開幾個定義才能確定「折扣到底怎麼算的」');

const overDesignedEntities = [
  'DiscountStrategy（抽象基底類別）',
  'FixedAmountDiscountStrategy（唯一的實作）',
  'DiscountStrategyFactory（工廠，目前只有一個 case）',
  'calcOverDesigned（呼叫端）',
];
const simpleEntities = ['calcSimple（唯一的定義）'];

console.log('  過度設計版，要看懂「折扣怎麼算」需要打開：');
overDesignedEntities.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
console.log(`  → 共 ${overDesignedEntities.length} 個定義`);

console.log('\n  精簡版，要看懂「折扣怎麼算」需要打開：');
simpleEntities.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
console.log(`  → 共 ${simpleEntities.length} 個定義`);

line('Part 4｜量化三：新增一種「百分比折扣」，各自要改幾個地方');

// 過度設計版：新增一個類別 + 工廠多一個 case（不動舊程式碼）
class PercentageDiscountStrategy extends DiscountStrategy {
  constructor(percent) {
    super();
    this.percent = percent;
  }
  calculate(amount) {
    return Math.max(0, amount * (1 - this.percent / 100));
  }
}
const originalCreate = DiscountStrategyFactory.create;
DiscountStrategyFactory.create = function (type, config) {
  if (type === 'percentage') return new PercentageDiscountStrategy(config.percent);
  return originalCreate(type, config);
};

// 精簡版：多加一個函式（一樣不動舊程式碼）
function calcPercentage(amount, percent) {
  return Math.max(0, amount * (1 - percent / 100));
}

const overDesignedResult = DiscountStrategyFactory.create('percentage', { percent: 20 }).calculate(500);
const simpleResult = calcPercentage(500, 20);

console.log('  過度設計版：新增 1 個 class（8 行）+ 修改工廠 1 處 → 結果', overDesignedResult);
console.log('  精簡版　　：新增 1 個 function（3 行）→ 結果', simpleResult);
console.log('\n  兩邊都只需要「加」，不需要「改」舊程式碼 —— 代表當初的抽象並沒有讓「新增」變得更輕鬆，');
console.log('  只是多繞了工廠這一層，需要多維護 1 個 switch case。');

line('Part 5｜量化四：呼叫 100 萬次，效能差多少');

const N = 1_000_000;

let t0 = performance.now();
for (let i = 0; i < N; i++) calcOverDesigned(500, 100);
let t1 = performance.now();
const overDesignedMs = t1 - t0;

t0 = performance.now();
for (let i = 0; i < N; i++) calcSimple(500, 100);
t1 = performance.now();
const simpleMs = t1 - t0;

console.log(`  過度設計版：${N.toLocaleString()} 次呼叫，耗時 ${overDesignedMs.toFixed(2)} ms`);
console.log(`  精簡版　　：${N.toLocaleString()} 次呼叫，耗時 ${simpleMs.toFixed(2)} ms`);
console.log(`\n  差距：${(overDesignedMs - simpleMs).toFixed(2)} ms／${N.toLocaleString()} 次，平均每次差 ${(((overDesignedMs - simpleMs) * 1000) / N).toFixed(4)} 微秒`);
console.log('  在 V8 這種等級的效能差異，實務上完全無感 —— 過度設計真正的成本不是效能，是維護時的閱讀成本。');

console.log('\nNode 版本:', process.version, '\n');
