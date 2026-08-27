/**
 * 原型突變的成本實測
 * 用法：node 原型突變成本-bench.js
 * 對應筆記：原型與引擎最佳化-Shape-InlineCache-ValidityCell.md 的 f 節
 * 驗證環境：Node.js v22（V8）｜2026-08-19
 *
 * 提醒：微型測試本來就不穩，數字會跳動。重點看「分類的方向」不是絕對值。
 */

const N = 200000;
const Q = { m() { return 1; } };

function bench(label, fn, warm = 1) {
  for (let i = 0; i < warm; i++) fn();
  const t0 = process.hrtime.bigint();
  fn();
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  console.log('  ' + label.padEnd(42) + ms.toFixed(2) + ' ms');
  return ms;
}

console.log('\n=== 1. 建立時就定原型 vs 建立後才突變（各 ' + N.toLocaleString() + ' 次）===\n');

const c1 = bench('Object.create(Q)　建立時', () => {
  for (let i = 0; i < N; i++) { const x = Object.create(Q); x.a = i; }
});
const c2 = bench('{ __proto__: Q, a: i }　建立時', () => {
  for (let i = 0; i < N; i++) { const x = { __proto__: Q, a: i }; }
});
const m1 = bench('x.__proto__ = Q　突變', () => {
  for (let i = 0; i < N; i++) { const x = { a: i }; x.__proto__ = Q; }
});
const m2 = bench('Object.setPrototypeOf(x, Q)　突變', () => {
  for (let i = 0; i < N; i++) { const x = { a: i }; Object.setPrototypeOf(x, Q); }
});

console.log('\n  結論一：貴的是「突變」這個動作，不是 __proto__ 這個語法');
console.log('  x.__proto__ = Q 與 Object.setPrototypeOf 的比值 =',
  (m1 / m2).toFixed(2), '← 幾乎一樣，換正規 API 並不會變快');
console.log('  突變 vs 建立時就定的比值 ≈',
  (Math.min(m1, m2) / Math.min(c1, c2)).toFixed(1), '倍');

console.log('\n=== 2. { ["__proto__"]: Q } 根本沒動到原型，所以沒有這個成本 ===\n');
bench('{ ["__proto__"]: Q, a: i }　一般屬性', () => {
  for (let i = 0; i < N; i++) { const x = { ['__proto__']: Q, a: i }; }
});
const sample = { ['__proto__']: Q };
console.log('  驗證：Object.getPrototypeOf(sample) === Q ?', Object.getPrototypeOf(sample) === Q);
console.log('  它只是多了一個叫 __proto__ 的普通屬性：', Object.getOwnPropertyNames(sample));

console.log('\n=== 3. 屬性寫入順序會造成不同的 Shape ===\n');
const a = {}; a.x = 1; a.y = 2;
const b = {}; b.y = 2; b.x = 1;
console.log('  a：先 x 後 y → Object.keys(a) =', Object.keys(a));
console.log('  b：先 y 後 x → Object.keys(b) =', Object.keys(b));
console.log('  內容一樣、順序不同 → 引擎眼中是兩個不同的 Shape，沒辦法共用最佳化');
console.log('  （JS 層面看不到 Shape，key 順序是它唯一的外顯證據）');

console.log('\n=== 4. ValidityCell：改 Object.prototype 讓底下全部失效 ===\n');

function Point(x) { this.x = x; }
Point.prototype.getX = function () { return this.x; };

const pts = [];
for (let i = 0; i < 50000; i++) pts.push(new Point(i));
const hot = () => { let s = 0; for (let r = 0; r < 20; r++) for (const p of pts) s += p.getX(); return s; };

const before = bench('污染前（IC 已建立）', hot, 5);
Object.prototype.polluted = 1;                 // ← 動了最上層原型
const justAfter = bench('剛動完 Object.prototype', hot, 0);
const rebuilt = bench('IC 重建之後', hot, 5);
delete Object.prototype.polluted;
bench('清乾淨之後', hot, 5);

console.log('\n  剛動完 vs 污染前的比值 = ' + (justAfter / before).toFixed(2) +
  '　｜　重建後 vs 污染前 = ' + (rebuilt / before).toFixed(2));
console.log('  誠實說：這個數字每次跑都會跳，有時候測得到 1.5～1.8 倍，有時候完全測不出來。');
console.log('  重點是「剛動完那一輪比較慢，重建後回到原速」→ 這是一次性的重建成本。');
console.log('  真正的傷害在「反覆動原型」的程式裡：每動一次就重付一次這個代價。');

console.log('\n=== 5. 一句話 ===\n');
console.log('  V8 團隊的建議：Leave your prototypes alone!');
console.log('  真的非改不可，就在其他程式碼跑起來之前改完。\n');
